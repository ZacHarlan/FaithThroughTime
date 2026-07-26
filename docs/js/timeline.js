// timeline.js — D3.js SVG timeline renderer
//
// Design decisions:
//   SVG over Canvas: At the scale of biblical data (~200 entities visible at once),
//   SVG provides free DOM events, accessibility, and CSS styling. Canvas would only
//   be needed at 10K+ simultaneous elements. SVG also allows easy hit testing and
//   semantic structure for screen readers.
//
//   Hybrid could add complexity (Canvas background + SVG overlay) but the perf gain
//   is negligible at this dataset size.

const Timeline = (() => {
    // Layout constants
    const MARGIN = { top: 80, right: 30, bottom: 30, left: 30 };
    const ROW_HEIGHT = 26;
    const ROW_GAP = 3;
    const BAR_HEIGHT_MAJOR = 20;
    const BAR_HEIGHT_MODERATE = 17;
    const BAR_HEIGHT_MINOR = 14;
    const POINT_RADIUS_MAJOR = 6;
    const POINT_RADIUS_MODERATE = 5;
    const POINT_RADIUS_MINOR = 4;
    const LABEL_PADDING = 6;
    const PERIOD_BAND_HEIGHT = 28;

    let svg, g, xScale, zoom, width, height, container;
    let currentTransform = d3.zoomIdentity;
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

    function init() {
        container = document.getElementById('timeline-container');
        svg = d3.select('#timeline-svg');

        const rect = container.getBoundingClientRect();
        width = rect.width;
        height = rect.height;

        svg.attr('width', width).attr('height', height);

        // Base x scale: covers full biblical span
        xScale = d3.scaleLinear()
            .domain([-4100, 2030])
            .range([MARGIN.left, width - MARGIN.right]);

        // Create layer groups in correct z-order
        g = svg.append('g').attr('class', 'timeline-root');

        g.append('g').attr('class', 'layer-periods');
        g.append('g').attr('class', 'layer-axis');
        g.append('g').attr('class', 'layer-items');

        // ── Unified D3 zoom: handles wheel, pinch, single-finger pan, dblclick
        zoom = d3.zoom()
            .scaleExtent([0.1, 200])
            .filter(event => {
                // Block right-click and middle-click pan
                if (event.button) return false;
                // Block clicks that started on an interactive element
                if (event.target && event.target.closest && event.target.closest('button, input, select, a')) return false;
                return true;
            })
            .on('start', onZoomStart)
            .on('zoom', onZoom)
            .on('end', onZoomEnd);

        svg.call(zoom);
        // Disable D3's default double-click zoom so we can run our own
        // animated zoom centered on the tap.
        svg.on('dblclick.zoom', null);
        svg.on('dblclick', onDoubleTap);

        // Long-press peek (touch)
        if (isTouch) initLongPressPeek();

        // Resize handler
        window.addEventListener('resize', debounce(refresh, 150));

        // Zoom buttons (header + floating FAB)
        const wireZoomBtn = (id, factor) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => {
                svg.transition().duration(prefersReduced() ? 0 : 250).call(zoom.scaleBy, factor);
                if (window._vibrate) window._vibrate(8);
            });
        };
        wireZoomBtn('btn-zoom-in', 1.5);
        wireZoomBtn('btn-zoom-out', 0.67);
        wireZoomBtn('fab-zoom-in', 1.5);
        wireZoomBtn('fab-zoom-out', 0.67);
        const fitBtn = document.getElementById('btn-fit');
        if (fitBtn) fitBtn.addEventListener('click', fitAll);
        const fabFit = document.getElementById('fab-fit');
        if (fabFit) fabFit.addEventListener('click', () => { fitAll(); if (window._vibrate) window._vibrate(8); });
    }

    function prefersReduced() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Re-measure the container and re-render. Bails while the timeline tab
     * is hidden (display:none measures 0×0, which would invert the scale
     * range and blank the render) — switchTab calls this again on return.
     */
    function refresh() {
        if (!container) return;
        const r = container.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        width = r.width;
        height = r.height;
        svg.attr('width', width).attr('height', height);
        xScale.range([MARGIN.left, width - MARGIN.right]);
        render();
    }

    let _rafPending = false;
    function scheduleRender() {
        if (_rafPending) return;
        _rafPending = true;
        requestAnimationFrame(() => {
            _rafPending = false;
            render();
            updateYearDisplay();
        });
    }

    let _gestureScrollTop = 0;
    function onZoomStart() {
        _gestureScrollTop = container.scrollTop;
    }

    function onZoom(event) {
        const t = event.transform;
        // Vertical routing: because the stored transform's y is pinned to 0
        // below, t.y is the cumulative vertical delta for this gesture. For
        // mouse drags, feed it into native container scroll (touch already
        // scrolls natively via CSS touch-action: pan-y — don't double-apply).
        const se = event.sourceEvent;
        if (se && se.type === 'mousemove' && t.y !== 0) {
            container.scrollTop = _gestureScrollTop - t.y;
        }
        // Constrain Y to 0 — vertical is container scroll, never SVG translate
        const constrained = d3.zoomIdentity.translate(t.x, 0).scale(t.k);
        svg.node().__zoom = constrained;
        currentTransform = constrained;
        scheduleRender();
        // Hide peek on any pan/zoom
        hidePeek();
    }

    function onZoomEnd(event) {
        // No additional bookkeeping currently; reserved for future inertia/edge bounce.
    }

    function onDoubleTap(event) {
        // Smooth 2x zoom-in centered on tap (or zoom-out with shift)
        const dur = prefersReduced() ? 0 : 280;
        const factor = event.shiftKey ? 0.5 : 2;
        const [mx] = d3.pointer(event, svg.node());
        svg.transition().duration(dur).call(zoom.scaleBy, factor, [mx, 0]);
        if (window._vibrate) window._vibrate(10);
    }

    /**
     * Long-press peek: hold 350ms on a timeline item to show a non-blocking
     * preview card with name + dates. Move >8px or release before threshold
     * cancels the peek and either pans or fires a tap.
     */
    function initLongPressPeek() {
        const peekEl = document.getElementById('peek-card');
        if (!peekEl) return;
        let timer = null;
        let startX = 0, startY = 0;
        let activeData = null;

        const cancel = () => {
            if (timer) { clearTimeout(timer); timer = null; }
        };

        const onDown = (e) => {
            if (e.touches && e.touches.length > 1) { cancel(); hidePeek(); return; }
            const t = e.touches ? e.touches[0] : e;
            const targetEl = e.target.closest('.timeline-item');
            if (!targetEl) { cancel(); return; }
            // Resolve bound D3 datum
            const datum = d3.select(targetEl).datum();
            if (!datum) return;
            startX = t.clientX;
            startY = t.clientY;
            activeData = datum;
            cancel();
            timer = setTimeout(() => {
                showPeek(datum, t.clientX, t.clientY);
                if (window._vibrate) window._vibrate(15);
            }, 350);
        };
        const onMove = (e) => {
            if (!timer && peekEl.classList.contains('hidden')) return;
            const t = e.touches ? e.touches[0] : e;
            if (Math.hypot(t.clientX - startX, t.clientY - startY) > 8) {
                cancel();
                hidePeek();
            }
        };
        const onUp = () => {
            cancel();
            hidePeek();
            activeData = null;
        };

        const sn = svg.node();
        sn.addEventListener('touchstart', onDown, { passive: true });
        sn.addEventListener('touchmove', onMove, { passive: true });
        sn.addEventListener('touchend', onUp);
        sn.addEventListener('touchcancel', onUp);
    }

    function showPeek(d, clientX, clientY) {
        const el = document.getElementById('peek-card');
        if (!el) return;
        const dates = formatDateRange(d);
        const meta = `${d.type}${d.role ? ' · ' + d.role : ''}${d.category ? ' · ' + d.category : ''}`;
        el.innerHTML = `
            <div class="peek-meta">${escapeHtml(meta)}</div>
            <div class="peek-name">${escapeHtml(d.name)}</div>
            <div class="peek-dates">${dates}</div>
        `;
        const cRect = container.getBoundingClientRect();
        // Default position: above the touch point
        const pad = 12;
        el.classList.remove('hidden');
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        let x = clientX - cRect.left - w / 2;
        let y = clientY - cRect.top - h - 18;
        if (x < pad) x = pad;
        if (x + w > cRect.width - pad) x = cRect.width - w - pad;
        if (y < pad) y = clientY - cRect.top + 24; // flip below if no room above
        el.style.left = x + 'px';
        el.style.top = y + 'px';
    }

    function hidePeek() {
        const el = document.getElementById('peek-card');
        if (el) el.classList.add('hidden');
    }

    function getVisibleXScale() {
        return currentTransform.rescaleX(xScale);
    }

    function updateYearDisplay() {
        const s = getVisibleXScale();
        const domain = s.domain();
        const fmt = y => y < 0 ? `${Math.abs(Math.round(y))} BC` : `AD ${Math.round(y)}`;
        document.getElementById('year-display').textContent = `${fmt(domain[0])} — ${fmt(domain[1])}`;

        const centerYear = (domain[0] + domain[1]) / 2;

        // Update era ribbon (mobile) and legacy era scrubber (desktop)
        if (typeof EraScrubber !== 'undefined') {
            EraScrubber.updateActiveEra(centerYear);
        }

        // Update period-colored header accent
        const periods = State.periods;
        if (periods && periods.length) {
            const p = periods.find(p => centerYear >= p.startYear && centerYear <= p.endYear);
            if (p && p.color) {
                document.documentElement.style.setProperty('--period-accent', p.color);
            }
        }
    }

    function fitAll() {
        const items = State.items;
        if (!items.length) return;

        let minY = Infinity, maxY = -Infinity;
        for (const item of items) {
            const s = item.startYear ?? item.endYear;
            const e = item.endYear ?? item.startYear;
            if (s !== null && s !== undefined && s < minY) minY = s;
            if (e !== null && e !== undefined && e > maxY) maxY = e;
        }

        if (minY === Infinity) return;

        const padding = Math.max(50, (maxY - minY) * 0.05);
        minY -= padding;
        maxY += padding;

        const x0 = xScale(minY);
        const x1 = xScale(maxY);
        const scale = (width - MARGIN.left - MARGIN.right) / (x1 - x0);
        const tx = MARGIN.left - x0 * scale;

        svg.transition().duration(prefersReduced() ? 0 : 500).call(
            zoom.transform,
            d3.zoomIdentity.translate(tx, 0).scale(scale)
        );
    }

    function render() {
        renderPeriods();
        renderAxis();
        renderItems();
        // Update period bands and grid lines to match actual content height
        const totalHeight = +svg.attr('height');
        g.selectAll('.period-band').attr('height', totalHeight);
        g.selectAll('.grid-line').attr('y2', totalHeight);
        highlightSelected();
    }

    function renderPeriods() {
        const s = getVisibleXScale();
        const layer = g.select('.layer-periods');

        const bands = layer.selectAll('.period-group')
            .data(State.periods, d => d.id);

        const enter = bands.enter().append('g').attr('class', 'period-group');
        enter.append('rect').attr('class', 'period-band');
        enter.append('text').attr('class', 'period-label');

        const merged = enter.merge(bands);

        merged.select('.period-band')
            .attr('x', d => s(d.startYear))
            .attr('y', 0)
            .attr('width', d => Math.max(0, s(d.endYear) - s(d.startYear)))
            .attr('height', height)
            .attr('fill', d => d.color || '#555');

        merged.select('.period-label')
            .attr('x', d => (s(d.startYear) + s(d.endYear)) / 2)
            .attr('y', 20)
            .text(d => {
                // Labels are centered in their band; keeping each label
                // narrower than its own band guarantees neighbors never
                // collide. ~8.5px/char: 12px uppercase serif + letterspacing.
                const w = s(d.endYear) - s(d.startYear);
                const maxChars = Math.floor((w - 16) / 8.5);
                if (d.name.length <= maxChars) return d.name;
                if (maxChars < 5) return '';
                return d.name.slice(0, maxChars - 1) + '…';
            });

        bands.exit().remove();
    }

    function renderAxis() {
        const s = getVisibleXScale();
        const layer = g.select('.layer-axis');
        layer.selectAll('*').remove();

        // Determine tick interval from pixel density, not year span alone —
        // the widest label ("4000 BC" at 14px semibold on mobile) needs ~64px,
        // so ticks are capped at one per MIN_TICK_PX regardless of viewport.
        const domain = s.domain();
        const span = domain[1] - domain[0];
        const MIN_TICK_PX = 80;
        const plotWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
        const maxTicks = Math.max(2, Math.floor(plotWidth / MIN_TICK_PX));
        const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
        let interval = steps[steps.length - 1];
        for (const step of steps) {
            if (span / step <= maxTicks) { interval = step; break; }
        }

        const start = Math.ceil(domain[0] / interval) * interval;
        const ticks = [];
        for (let y = start; y <= domain[1]; y += interval) {
            ticks.push(y);
        }

        const axisY = MARGIN.top;

        // Axis line
        layer.append('line')
            .attr('class', 'axis-line')
            .attr('x1', MARGIN.left)
            .attr('y1', axisY)
            .attr('x2', width - MARGIN.right)
            .attr('y2', axisY);

        // Tick marks and labels
        const tickGroups = layer.selectAll('.tick-group')
            .data(ticks)
            .enter().append('g')
            .attr('class', 'tick-group');

        tickGroups.append('line')
            .attr('class', 'axis-line')
            .attr('x1', d => s(d))
            .attr('y1', axisY - 5)
            .attr('x2', d => s(d))
            .attr('y2', axisY + 5);

        // Vertical grid lines (subtle)
        tickGroups.append('line')
            .attr('class', 'grid-line')
            .attr('x1', d => s(d))
            .attr('y1', axisY)
            .attr('x2', d => s(d))
            .attr('y2', height)
            .attr('stroke', 'rgba(255,255,255,0.04)')
            .attr('stroke-width', 1);

        tickGroups.append('text')
            .attr('class', 'tick-label')
            .attr('x', d => s(d))
            .attr('y', axisY + 18)
            .text(d => formatYear(d));
    }

    function renderItems() {
        const s = getVisibleXScale();
        const layer = g.select('.layer-items');
        const items = State.items;

        // Layout: assign y positions using a simple swim-lane algorithm
        // Sort by start year, then assign lanes to avoid overlap
        const sorted = [...items].sort((a, b) => {
            const aStart = a.startYear ?? a.endYear ?? 0;
            const bStart = b.startYear ?? b.endYear ?? 0;
            return aStart - bStart;
        });

        // Separate people and events for layered rendering
        const people = sorted.filter(d => d.type === 'person');
        const events = sorted.filter(d => d.type === 'event');

        const startY = MARGIN.top + 30;

        // Render events first (above), then people (below)
        const eventEndY = layoutAndRender(layer, events, s, startY, 'event');

        // Draw section divider between events and people
        layer.selectAll('.section-divider').remove();
        if (people.length > 0 && events.length > 0) {
            const dividerY = eventEndY + 10;
            layer.append('line')
                .attr('class', 'section-divider')
                .attr('x1', MARGIN.left)
                .attr('y1', dividerY)
                .attr('x2', width - MARGIN.right)
                .attr('y2', dividerY)
                .attr('stroke', 'rgba(255,255,255,0.15)')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '6,4');

            layer.append('text')
                .attr('class', 'section-divider section-label')
                .attr('x', MARGIN.left + 4)
                .attr('y', dividerY + 14)
                .attr('fill', 'var(--text-muted)')
                .attr('font-size', '10px')
                .attr('font-weight', '600')
                .attr('text-transform', 'uppercase')
                .attr('letter-spacing', '1px')
                .text('PEOPLE');
        }

        const peopleEndY = layoutAndRender(layer, people, s, eventEndY + 28, 'person');

        // Grow SVG to fit all content so the container can scroll vertically
        const totalHeight = Math.max(height, peopleEndY + 60);
        svg.attr('height', totalHeight);
    }

    function layoutAndRender(layer, items, xS, offsetY, type) {
        // Swim-lane assignment: each lane tracks its rightmost x extent
        const lanes = [];

        const positioned = items.map(d => {
            const start = d.startYear ?? d.endYear;
            const end = d.endYear ?? d.startYear;
            if (start === null && end === null) return null;

            const x1 = xS(start);
            const x2 = end !== start ? xS(end) : x1;
            const barWidth = Math.max(x2 - x1, 2);

            // Find first lane where this item fits.
            // Label width estimate must match the *rendered* font: 12–14px,
            // semibold (and bumped by !important CSS on mobile) — the old
            // 6.5px/char guess under-reserved and caused label pile-ups.
            let lane = 0;
            const labelFs = (d.significance === 'major' ? 14 : d.significance === 'moderate' ? 13 : 12)
                + (isMobile() ? 1 : 0);
            const labelWidth = d.name.length * labelFs * 0.64 + LABEL_PADDING * 2 + 8;
            const totalWidth = barWidth + labelWidth;

            for (lane = 0; lane < lanes.length; lane++) {
                if (lanes[lane] <= x1 - 12) break;
            }
            if (lane === lanes.length) lanes.push(0);
            lanes[lane] = x1 + totalWidth;

            return {
                ...d,
                x: x1,
                w: barWidth,
                y: offsetY + lane * (ROW_HEIGHT + ROW_GAP),
                isRange: start !== end && end !== null
            };
        }).filter(Boolean);

        // D3 data join
        const className = `item-group-${type}`;
        const groups = layer.selectAll(`.${className}`)
            .data(positioned, d => `${d.type}-${d.id}`);

        // Remove old
        groups.exit().remove();

        // Enter — items are keyboard-reachable buttons, not just click targets
        const enter = groups.enter().append('g')
            .attr('class', d => `timeline-item ${className} confidence-${d.dateConfidence} significance-${d.significance}`)
            .attr('tabindex', 0)
            .attr('role', 'button')
            .attr('aria-label', d => `${d.name}, ${d.type}, ${formatDateRange(d)}`)
            .on('click', (event, d) => onItemClick(d))
            .on('keydown', (event, d) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onItemClick(d);
                }
            })
            .on('mouseenter', (event, d) => showTooltip(event, d))
            .on('mouseleave', hideTooltip);

        // Merge enter + update
        const merged = enter.merge(groups);

        merged.attr('transform', d => `translate(0,${d.y})`);

        // Clear and redraw contents
        merged.selectAll('*').remove();

        merged.each(function(d) {
            const el = d3.select(this);
            const barH = d.significance === 'major' ? BAR_HEIGHT_MAJOR : d.significance === 'moderate' ? BAR_HEIGHT_MODERATE : BAR_HEIGHT_MINOR;
            const barY = (ROW_HEIGHT - barH) / 2;
            const isApprox = d.startApprox || d.endApprox;

            // Invisible hit-area rect for easier touch targeting (min 44px tall)
            const hitH = Math.max(44, ROW_HEIGHT);
            const hitY = (ROW_HEIGHT - hitH) / 2;
            const itemW = d.isRange ? Math.max(d.w, 3) : 0;
            el.append('rect')
                .attr('class', 'hit-area')
                .attr('x', d.x - 10)
                .attr('y', hitY)
                .attr('width', Math.max(44, itemW + 160))
                .attr('height', hitH)
                .style('fill', 'transparent')
                .style('cursor', 'pointer');

            if (d.isRange) {
                // Range bar
                el.append('rect')
                    .attr('class', `item-bar ${d.type}${isApprox ? ' approximate' : ''}`)
                    .attr('x', d.x)
                    .attr('y', barY)
                    .attr('width', Math.max(d.w, 3))
                    .attr('height', barH);
            } else {
                // Point marker (diamond for events, circle for people)
                const r = d.significance === 'major' ? POINT_RADIUS_MAJOR : d.significance === 'moderate' ? POINT_RADIUS_MODERATE : POINT_RADIUS_MINOR;
                if (d.type === 'event') {
                    el.append('path')
                        .attr('class', `item-point ${d.type}`)
                        .attr('d', `M${d.x},${ROW_HEIGHT/2 - r} L${d.x + r},${ROW_HEIGHT/2} L${d.x},${ROW_HEIGHT/2 + r} L${d.x - r},${ROW_HEIGHT/2} Z`)
                        .attr('opacity', isApprox ? 0.7 : 1);
                } else {
                    el.append('circle')
                        .attr('class', `item-point ${d.type}`)
                        .attr('cx', d.x)
                        .attr('cy', ROW_HEIGHT / 2)
                        .attr('r', r)
                        .attr('opacity', isApprox ? 0.7 : 1);
                }
            }

            // Label (to the right of the bar/point)
            const pointR = d.significance === 'major' ? POINT_RADIUS_MAJOR : d.significance === 'moderate' ? POINT_RADIUS_MODERATE : POINT_RADIUS_MINOR;
            const labelX = d.isRange ? d.x + d.w + LABEL_PADDING : d.x + pointR + LABEL_PADDING;
            el.append('text')
                .attr('class', 'item-label')
                .attr('x', labelX)
                .attr('y', ROW_HEIGHT / 2)
                .text(d.name)
                .style('font-weight', d.significance === 'major' ? '600' : d.significance === 'moderate' ? '500' : '400')
                .style('font-size', d.significance === 'major' ? '14px' : d.significance === 'moderate' ? '13px' : '12px');
        });

        return offsetY + lanes.length * (ROW_HEIGHT + ROW_GAP);
    }

    function onItemClick(d) {
        hideTooltip(); // the detail panel supersedes the hover tooltip
        const load = d.type === 'person'
            ? Api.getPersonDetail(d.id).then(detail => {
                if (detail) State.setSelectedItem({ type: 'person', ...detail });
              })
            : Api.getEventDetail(d.id).then(detail => {
                if (detail) State.setSelectedItem({ type: 'event', ...detail });
              });
        load.catch(() => showLoadError(d.name));
    }

    // Transient non-blocking error toast for failed detail loads
    function showLoadError(name) {
        let el = document.getElementById('timeline-error-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'timeline-error-toast';
            el.className = 'hint-toast error';
            el.setAttribute('role', 'alert');
            document.body.appendChild(el);
        }
        el.textContent = `Couldn’t load “${name}” — check your connection and tap it again.`;
        el.classList.add('visible');
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove('visible'), 4000);
    }

    function showTooltip(event, d) {
        // Don't show tooltips on touch devices — long-press peek + detail panel handle it
        if (isTouch) return;

        const tooltip = document.getElementById('tooltip');
        const dates = formatDateRange(d);

        let ageStr = '';
        if (d.type === 'person' && d.startYear != null && d.endYear != null) {
            ageStr = ` (age ${Utils.yearSpan(d.startYear, d.endYear)})`;
        }

        tooltip.innerHTML = `
            <div class="tip-type">${d.type} · ${d.category || ''}</div>
            <div class="tip-name">${escapeHtml(d.name)}</div>
            <div class="tip-dates">${dates}${ageStr}</div>
            ${d.description ? `<div class="tip-desc">${escapeHtml(d.description)}</div>` : ''}
        `;

        tooltip.classList.remove('hidden');

        // Position near cursor
        const container = document.getElementById('timeline-container');
        const rect = container.getBoundingClientRect();
        let x = event.clientX - rect.left + 12;
        let y = event.clientY - rect.top + 12;

        // Keep within bounds
        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        if (x + tw > rect.width) x = x - tw - 24;
        if (y + th > rect.height) y = y - th - 24;

        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    function hideTooltip() {
        document.getElementById('tooltip').classList.add('hidden');
    }

    function highlightSelected() {
        if (!g) return;
        const sel = State.selectedItem;
        g.selectAll('.timeline-item')
            .classed('selected', d => sel && d.type === sel.type && d.id === sel.id);
    }

    function zoomToYear(year) {
        const targetX = xScale(year);
        const centerX = width / 2;
        const tx = centerX - targetX * currentTransform.k;

        svg.transition().duration(prefersReduced() ? 0 : 500).call(
            zoom.transform,
            d3.zoomIdentity.translate(tx, currentTransform.y).scale(currentTransform.k)
        );
    }

    function scrollToItem(type, id) {
        if (!g || !container) return;
        // Find the SVG group element whose bound data matches
        let targetY = null;
        g.selectAll('.timeline-item').each(function(d) {
            if (d && d.type === type && d.id === id) {
                targetY = d.y;
            }
        });
        if (targetY === null) return;
        // Scroll the container so the item is vertically centered
        const containerHeight = container.getBoundingClientRect().height;
        const scrollTarget = targetY - containerHeight / 2 + ROW_HEIGHT / 2;
        container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
    }

    // ── Helpers ──────────────────────────────────────────────

    function formatYear(y) { return Utils.formatYear(y); }

    function formatDateRange(d) {
        const start = d.startYear;
        const end = d.endYear;
        if (start === null && end === null) return 'Date unknown';

        const tilde = (approx) => approx ? '~' : '';

        if (start !== null && end !== null && start !== end) {
            return `${tilde(d.startApprox)}${formatYear(start)} — ${tilde(d.endApprox)}${formatYear(end)}`;
        }
        const year = start ?? end;
        const approx = start !== null ? d.startApprox : d.endApprox;
        return `${tilde(approx)}${formatYear(year)}`;
    }

    function escapeHtml(str) { return Utils.escapeHtml(str); }

    function truncate(str, len) {
        return str.length > len ? str.slice(0, len) + '…' : str;
    }

    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    return { init, render, refresh, fitAll, zoomToYear, scrollToItem, highlightSelected, formatYear, formatDateRange, escapeHtml };
})();

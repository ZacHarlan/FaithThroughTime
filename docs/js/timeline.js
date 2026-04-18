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

        // D3 zoom handles wheel-zoom and pinch-to-zoom; single-finger drag
        // panning is handled separately via enableDragPan
        zoom = d3.zoom()
            .scaleExtent([0.1, 200])
            .filter(event => {
                // Allow wheel, dblclick, and multi-touch (pinch zoom)
                if (event.type === 'wheel' || event.type === 'dblclick') return true;
                if (event.type === 'touchstart' && event.touches && event.touches.length >= 2) return true;
                if (event.type === 'touchmove' && event.touches && event.touches.length >= 2) return true;
                return false;
            })
            .on('zoom', onZoom);

        svg.call(zoom);

        // Custom drag handler for both-axis panning
        enableDragPan(container);

        // Resize handler
        window.addEventListener('resize', debounce(() => {
            const r = container.getBoundingClientRect();
            width = r.width;
            height = r.height;
            svg.attr('width', width).attr('height', height);
            xScale.range([MARGIN.left, width - MARGIN.right]);
            render();
        }, 150));

        // Zoom buttons
        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            svg.transition().duration(300).call(zoom.scaleBy, 1.5);
        });
        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            svg.transition().duration(300).call(zoom.scaleBy, 0.67);
        });
        document.getElementById('btn-fit').addEventListener('click', fitAll);
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

    function onZoom(event) {
        // Wheel zoom only — constrain Y to 0 (vertical is handled by container scroll)
        const t = event.transform;
        const constrained = d3.zoomIdentity.translate(t.x, 0).scale(t.k);
        svg.node().__zoom = constrained;
        currentTransform = constrained;
        scheduleRender();
    }

    function enableDragPan(ctr) {
        let dragging = false, startX, startY, startScrollTop, startTx;
        let dragOffsetX = 0;

        ctr.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('button, input, select, a')) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startScrollTop = ctr.scrollTop;
            startTx = currentTransform.x;
            ctr.style.cursor = 'grabbing';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Fast path: translate the g element directly, skip full re-render
            dragOffsetX = dx;
            g.attr('transform', `translate(${dx},0)`);

            // Update the transform so year display stays accurate
            const newTransform = d3.zoomIdentity.translate(startTx + dx, 0).scale(currentTransform.k);
            svg.node().__zoom = newTransform;
            currentTransform = newTransform;
            updateYearDisplay();

            // Vertical: scroll the container
            ctr.scrollTop = startScrollTop - dy;
        });

        window.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            ctr.style.cursor = '';
            // Reset offset and do a proper re-render at final position
            if (dragOffsetX !== 0) {
                dragOffsetX = 0;
                g.attr('transform', null);
                render();
            }
        });

        // Touch support for mobile panning
        let touchId = null;
        ctr.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            if (e.target.closest('button, input, select, a')) return;
            const t = e.touches[0];
            touchId = t.identifier;
            dragging = true;
            startX = t.clientX;
            startY = t.clientY;
            startScrollTop = ctr.scrollTop;
            startTx = currentTransform.x;
        }, { passive: true });

        ctr.addEventListener('touchmove', (e) => {
            if (!dragging || e.touches.length !== 1) return;
            const t = e.touches[0];
            if (t.identifier !== touchId) return;
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;

            // Fast path: translate the g element directly
            dragOffsetX = dx;
            g.attr('transform', `translate(${dx},0)`);

            const newTransform = d3.zoomIdentity.translate(startTx + dx, 0).scale(currentTransform.k);
            svg.node().__zoom = newTransform;
            currentTransform = newTransform;
            updateYearDisplay();

            ctr.scrollTop = startScrollTop - dy;
            e.preventDefault();
        }, { passive: false });

        ctr.addEventListener('touchend', (e) => {
            if (!dragging) return;
            for (const t of e.changedTouches) {
                if (t.identifier === touchId) {
                    dragging = false;
                    touchId = null;
                    // Reset offset and do a proper re-render
                    if (dragOffsetX !== 0) {
                        dragOffsetX = 0;
                        g.attr('transform', null);
                        render();
                    }
                    break;
                }
            }
        }, { passive: true });
    }

    function getVisibleXScale() {
        return currentTransform.rescaleX(xScale);
    }

    function updateYearDisplay() {
        const s = getVisibleXScale();
        const domain = s.domain();
        const fmt = y => y < 0 ? `${Math.abs(Math.round(y))} BC` : `AD ${Math.round(y)}`;
        document.getElementById('year-display').textContent = `${fmt(domain[0])} — ${fmt(domain[1])}`;
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

        svg.transition().duration(500).call(
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
                const w = s(d.endYear) - s(d.startYear);
                if (w < 40) return '';
                if (w < 80) return truncate(d.name, 8);
                return d.name;
            });

        bands.exit().remove();
    }

    function renderAxis() {
        const s = getVisibleXScale();
        const layer = g.select('.layer-axis');
        layer.selectAll('*').remove();

        // Determine tick interval based on zoom level
        const domain = s.domain();
        const span = domain[1] - domain[0];
        let interval;
        if (span > 3000) interval = 500;
        else if (span > 1500) interval = 200;
        else if (span > 500) interval = 100;
        else if (span > 200) interval = 50;
        else if (span > 80) interval = 20;
        else if (span > 30) interval = 10;
        else if (span > 10) interval = 5;
        else interval = 1;

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

            // Find first lane where this item fits
            let lane = 0;
            const labelWidth = d.name.length * 6.5 + LABEL_PADDING * 2;
            const totalWidth = barWidth + labelWidth;

            for (lane = 0; lane < lanes.length; lane++) {
                if (lanes[lane] <= x1 - 4) break;
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

        // Enter
        const enter = groups.enter().append('g')
            .attr('class', d => `timeline-item ${className} confidence-${d.dateConfidence} significance-${d.significance}`)
            .on('click', (event, d) => onItemClick(d))
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
                .style('font-size', d.significance === 'major' ? '12px' : d.significance === 'moderate' ? '11.5px' : '11px');
        });

        return offsetY + lanes.length * (ROW_HEIGHT + ROW_GAP);
    }

    function onItemClick(d) {
        if (d.type === 'person') {
            Api.getPersonDetail(d.id).then(detail => {
                if (detail) State.setSelectedItem({ type: 'person', ...detail });
            });
        } else {
            Api.getEventDetail(d.id).then(detail => {
                if (detail) State.setSelectedItem({ type: 'event', ...detail });
            });
        }
    }

    function showTooltip(event, d) {
        // Don't show tooltips on touch devices — the detail panel handles it
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

        const tooltip = document.getElementById('tooltip');
        const dates = formatDateRange(d);

        let ageStr = '';
        if (d.type === 'person' && d.startYear != null && d.endYear != null) {
            ageStr = ` (age ${d.endYear - d.startYear})`;
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
        const s = getVisibleXScale();
        const domain = s.domain();
        const span = domain[1] - domain[0];

        // Center on the year
        const targetX = xScale(year);
        const centerX = width / 2;
        const tx = centerX - targetX * currentTransform.k;

        svg.transition().duration(500).call(
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

    function formatYear(y) {
        if (y < 0) return `${Math.abs(y)} BC`;
        if (y === 0) return '1 BC';
        return `AD ${y}`;
    }

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

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

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

    return { init, render, fitAll, zoomToYear, scrollToItem, highlightSelected, formatYear, formatDateRange, escapeHtml };
})();

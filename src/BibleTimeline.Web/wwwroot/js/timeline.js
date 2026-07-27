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
    // Pannable world bounds with GENEROUS margins: ~5 centuries before the
    // earliest data and ~1.25 centuries ahead. Bounded because unbounded
    // zoom-out produced a 28,000 BC void with an unreadable tick smear;
    // generous because a tight 10-year cap made edge labels a fight.
    const MIN_YEAR = -4500;
    const MAX_YEAR = new Date().getFullYear() + 124;

    let svg, g, xScale, zoom, width, height, container;
    let currentTransform = d3.zoomIdentity;
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
            // d3's default wheelDelta multiplies by 10 when ctrlKey is set,
            // making ctrl+wheel zoom ~5.3x per notch. ~1.25x/notch instead.
            .wheelDelta(event => -event.deltaY *
                (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002))
            .filter(event => {
                // Wheel: only pinch / Ctrl/⌘+wheel zooms — plain wheel and
                // trackpad swipes PAN AND SCROLL via our own handler below.
                // (Mac trackpad pinch arrives as wheel with ctrlKey set.)
                if (event.type === 'wheel') return event.ctrlKey || event.metaKey;
                // Touch: d3 gets NONE of it. The touch FSM below owns
                // single-finger pan AND pinch — d3 preventDefaults every
                // touchmove (killing native scroll on iOS WebKit), and its
                // start-only filter let post-pinch drags leak through.
                if (event.type.startsWith('touch')) return false;
                // Block right-click and middle-click pan
                if (event.button) return false;
                // Block clicks that started on an interactive element
                if (event.target && event.target.closest && event.target.closest('button, input, select, a')) return false;
                return true;
            })
            .on('start', onZoomStart)
            .on('zoom', onZoom)
            .on('end', onZoomEnd);

        updateZoomBounds();
        svg.call(zoom);

        // Trackpad/wheel navigation: horizontal swipe pans time (D3 ignored
        // deltaX, so two-finger swipes did NOTHING); vertical wheel scrolls
        // the lanes natively. translateBy runs through D3's constrain, so
        // the world bounds still hold.
        svg.node().addEventListener('wheel', e => {
            if (e.ctrlKey || e.metaKey) return; // pinch/modifier zoom → d3
            e.preventDefault();
            // A wheel during a held mouse drag reuses the live d3 gesture,
            // whose stale mousemove sourceEvent would re-derive scrollTop
            // from an old anchor — drop the anchor first.
            _gestureClientY = null;
            if (e.deltaX) svg.call(zoom.translateBy, -e.deltaX / currentTransform.k, 0);
            if (e.deltaY) container.scrollTop += e.deltaY;
        }, { passive: false });

        // ── Touch FSM: the SOLE owner of touch input ─────────────
        // States: idle → undecided(<6px) → pan-x | native-y | pinch.
        // Vertical → we do NOTHING (native scroll via touch-action: pan-y —
        // the only approach real iOS honors). Horizontal → constrained pan.
        // Pinch → constrained zoom anchored at the finger midpoint. The pan
        // anchor is captured at axis-LOCK time, not touchstart, so grabbing
        // a running animation doesn't jump.
        let _touch = null;
        const sn = svg.node();

        function applyTouchTransform(x, k) {
            const constrained = zoom.constrain()(
                d3.zoomIdentity.translate(x, 0).scale(k),
                [[MARGIN.left, 0], [width - MARGIN.right, height]],
                zoom.translateExtent()
            );
            svg.call(zoom.transform, constrained);
        }

        function beginPinch(touches) {
            const dx = touches[1].clientX - touches[0].clientX;
            const dy = touches[1].clientY - touches[0].clientY;
            _touch = {
                mode: 'pinch',
                k0: currentTransform.k,
                x0: currentTransform.x,
                dist0: Math.max(1, Math.hypot(dx, dy)),
                mid0: (touches[0].clientX + touches[1].clientX) / 2
            };
        }

        sn.addEventListener('touchstart', e => {
            if (e.touches.length === 1) {
                _touch = { mode: 'undecided', x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                beginPinch(e.touches);
            } else {
                _touch = null;
            }
        }, { passive: true });

        sn.addEventListener('touchmove', e => {
            if (!_touch) return;
            if (_touch.mode === 'pinch') {
                if (e.touches.length !== 2) return;
                if (e.cancelable) e.preventDefault();
                const ddx = e.touches[1].clientX - e.touches[0].clientX;
                const ddy = e.touches[1].clientY - e.touches[0].clientY;
                const dist = Math.max(1, Math.hypot(ddx, ddy));
                const mid = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const se = zoom.scaleExtent();
                const k = Math.max(se[0], Math.min(se[1], _touch.k0 * dist / _touch.dist0));
                // Keep the world point under the initial midpoint anchored
                const worldMid = (_touch.mid0 - _touch.x0) / _touch.k0;
                applyTouchTransform(mid - worldMid * k, k);
                return;
            }
            if (e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - _touch.x;
            const dy = e.touches[0].clientY - _touch.y;
            if (_touch.mode === 'undecided') {
                if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                if (Math.abs(dx) > Math.abs(dy)) {
                    _touch.mode = 'pan-x';
                    // Lazy anchor: transform may have been animating until now
                    _touch.baseTx = currentTransform.x;
                    _touch.baseX = e.touches[0].clientX;
                } else {
                    _touch.mode = 'native-y';
                }
            }
            if (_touch.mode === 'pan-x') {
                if (e.cancelable) e.preventDefault();
                applyTouchTransform(
                    _touch.baseTx + (e.touches[0].clientX - _touch.baseX),
                    currentTransform.k);
            }
            // native-y: the browser scrolls; we stay out of the way
        }, { passive: false });

        sn.addEventListener('touchend', e => {
            if (e.touches.length === 1) {
                // pinch → one finger: re-enter undecided with a fresh origin
                _touch = { mode: 'undecided', x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 0) {
                _touch = null;
            }
        }, { passive: true });
        sn.addEventListener('touchcancel', () => { _touch = null; });
        // Disable D3's default double-click zoom so we can run our own
        // animated zoom centered on the tap.
        svg.on('dblclick.zoom', null);
        svg.on('dblclick', onDoubleTap);

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
        updateZoomBounds();
        render();
    }

    /**
     * Constrain pan/zoom to [MIN_YEAR, MAX_YEAR] (generous margins around
     * the data). extent is the PLOT area — with the default full-element
     * extent, the constrain used to clamp MAX_YEAR into the margin strip.
     */
    function updateZoomBounds() {
        if (!zoom) return;
        const x0 = xScale(MIN_YEAR);
        const x1 = xScale(MAX_YEAR);
        const plotWidth = width - MARGIN.left - MARGIN.right;
        const minK = Math.min(1, plotWidth / (x1 - x0));
        zoom.extent([[MARGIN.left, 0], [width - MARGIN.right, height]])
            .scaleExtent([minK, 200])
            .translateExtent([[x0, -Infinity], [x1, Infinity]]);
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
    let _gestureClientY = null;
    let _kAtGestureStart = null;
    function onZoomStart(event) {
        _gestureScrollTop = container.scrollTop;
        // Anchor on the viewport-stable clientY, NOT the D3 transform: D3
        // measures the pointer relative to the SVG, and the SVG moves when
        // we scroll — deriving scroll from t.y feeds our own scroll back
        // into the next transform and oscillates (visible as violent jitter).
        const se = event.sourceEvent;
        _gestureClientY = (se && se.type === 'mousedown') ? se.clientY : null;
        if (_kAtGestureStart === null) _kAtGestureStart = currentTransform.k;
    }

    function onZoom(event) {
        const t = event.transform;
        // Vertical routing for mouse drags → native container scroll (touch
        // already scrolls natively via CSS touch-action: pan-y).
        const se = event.sourceEvent;
        if (se && se.type === 'mousemove' && _gestureClientY !== null) {
            container.scrollTop = _gestureScrollTop - (se.clientY - _gestureClientY);
        }
        // Constrain Y to 0 — vertical is container scroll, never SVG translate
        const constrained = d3.zoomIdentity.translate(t.x, 0).scale(t.k);
        svg.node().__zoom = constrained;
        currentTransform = constrained;
        scheduleRender();
    }

    function onZoomEnd() {
        // After a real zoom (scale changed), vertically scroll to where the
        // visible time-window's items actually live — zooming used to land
        // on blank lanes thousands of px away from the content.
        const kChanged = _kAtGestureStart !== null &&
            Math.abs(currentTransform.k / _kAtGestureStart - 1) > 0.05;
        _kAtGestureStart = null;
        if (kChanged) scrollToVisibleContent();
    }

    /** Scroll the container to the first lane band with items in view. */
    function scrollToVisibleContent() {
        if (!g || !container) return;
        let minY = Infinity;
        g.selectAll('.timeline-item').each(function(d) {
            if (!d) return;
            const xEnd = d.isRange ? d.x + d.w : d.x;
            if (xEnd < 0 || d.x > width) return;
            if (d.y < minY) minY = d.y;
        });
        if (minY === Infinity) return;
        const cur = container.scrollTop;
        // Leave the user alone if visible content is already on screen
        if (minY > cur + 40 && minY < cur + container.clientHeight - 60) return;
        container.scrollTo({
            top: Math.max(0, minY - 70),
            behavior: prefersReduced() ? 'auto' : 'smooth'
        });
    }

    function onDoubleTap(event) {
        // Items own their own click behavior — double-clicking one must not
        // ALSO zoom (it used to zoom + open the panel + fetch twice)
        if (event.target && event.target.closest && event.target.closest('.timeline-item')) return;
        // Smooth 2x zoom-in centered on tap (or zoom-out with shift)
        const dur = prefersReduced() ? 0 : 280;
        const factor = event.shiftKey ? 0.5 : 2;
        const [mx] = d3.pointer(event, svg.node());
        svg.transition().duration(dur).call(zoom.scaleBy, factor, [mx, 0]);
        if (window._vibrate) window._vibrate(10);
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

    // ── Stable swim-lanes ────────────────────────────────────
    // Lane assignment is computed ONCE per dataset at the BASE scale and
    // reused at every zoom level, so items never change row while zooming
    // (per-frame greedy packing reshuffled rows as pixel widths changed,
    // making items impossible to track). Labels that crowd within a lane
    // when zoomed far out are culled per-frame instead of moving items.

    // Label width estimate must match the *rendered* font: 12–14px,
    // semibold (and bumped by !important CSS on mobile) — a 6.5px/char
    // guess under-reserved and caused label pile-ups.
    function labelWidthFor(d) {
        const labelFs = (d.significance === 'major' ? 14 : d.significance === 'moderate' ? 13 : 12)
            + (isMobile() ? 1 : 0);
        return d.name.length * labelFs * 0.64 + LABEL_PADDING * 2 + 8;
    }

    let _laneCache = null; // { itemsRef, width, mobile, lanes: Map(key→lane), counts: {event, person} }

    function ensureLanes() {
        const items = State.items;
        const mobile = isMobile();
        if (_laneCache && _laneCache.itemsRef === items &&
            _laneCache.width === width && _laneCache.mobile === mobile) {
            return _laneCache;
        }
        const laneOf = new Map();
        const counts = { event: 0, person: 0 };
        for (const type of ['event', 'person']) {
            const sorted = items
                .filter(d => d.type === type && (d.startYear ?? d.endYear) != null)
                .sort((a, b) => (a.startYear ?? a.endYear) - (b.startYear ?? b.endYear));
            const laneEnds = [];
            for (const d of sorted) {
                const start = d.startYear ?? d.endYear;
                const end = d.endYear ?? d.startYear;
                const x1 = xScale(start); // base scale — zoom-independent
                const x2 = end !== start ? xScale(end) : x1;
                // 1.3x label reservation: fitAll sits ~12% below base scale
                // (its padding widens the view past the domain), and with
                // unbounded zoom-out the margin keeps the DEFAULT view fully
                // labeled instead of culling in dense eras
                const totalWidth = Math.max(x2 - x1, 2) + labelWidthFor(d) * 1.3;
                let lane = 0;
                for (lane = 0; lane < laneEnds.length; lane++) {
                    if (laneEnds[lane] <= x1 - 12) break;
                }
                if (lane === laneEnds.length) laneEnds.push(0);
                laneEnds[lane] = x1 + totalWidth;
                laneOf.set(`${type}-${d.id}`, lane);
            }
            counts[type] = laneEnds.length;
        }
        _laneCache = { itemsRef: items, width, mobile, lanes: laneOf, counts };
        return _laneCache;
    }

    function layoutAndRender(layer, items, xS, offsetY, type) {
        const cache = ensureLanes();

        // World right edge in current-zoom pixels — labels that cannot fit
        // rightward before it flip left or ellipsize (last-resort logic in
        // the culling pass below).
        const rightEdgePx = xS(MAX_YEAR);

        const positioned = items.map(d => {
            const start = d.startYear ?? d.endYear;
            const end = d.endYear ?? d.startYear;
            if (start === null && end === null) return null;

            const x1 = xS(start);
            const x2 = end !== start ? xS(end) : x1;
            const barWidth = Math.max(x2 - x1, 2);
            const lane = cache.lanes.get(`${type}-${d.id}`) ?? 0;
            const isRange = start !== end && end !== null;

            return {
                ...d,
                x: x1,
                w: barWidth,
                lane,
                y: offsetY + lane * (ROW_HEIGHT + ROW_GAP),
                isRange
            };
        }).filter(Boolean);

        // Per-frame label culling: lanes are fixed, so when zoomed out far
        // enough that neighbors within a lane would overlap, hide the
        // crowded label (items stay put; only text visibility changes).
        const byLane = new Map();
        for (const d of positioned) {
            if (!byLane.has(d.lane)) byLane.set(d.lane, []);
            byLane.get(d.lane).push(d);
        }
        for (const arr of byLane.values()) {
            arr.sort((a, b) => a.x - b.x);
            let lastShownEnd = -Infinity;
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                const next = arr[i + 1];
                const prev = arr[i - 1];
                const lw = labelWidthFor(d);
                const rightLabelEnd = (d.isRange ? d.x + d.w : d.x) + LABEL_PADDING + lw;

                // Flip is a LAST RESORT: only when the rightward label would
                // cross the world's right edge (unreachable by panning) AND
                // the flipped label actually fits to the left. Flipping
                // eagerly at low zoom collided whole eras into their lane
                // neighbors and mass-hid labels.
                const flipStart = (d.isRange ? d.x : d.x - POINT_RADIUS_MAJOR) - LABEL_PADDING - lw;
                const prevEdge = prev ? prev.x + (prev.isRange ? prev.w : 0) + 4 : -Infinity;
                const flipFits = flipStart >= Math.max(lastShownEnd + 4, prevEdge);

                if (rightLabelEnd > rightEdgePx && flipFits) {
                    d.flipLabel = true;
                    d.showLabel = true;
                    lastShownEnd = d.isRange ? d.x + d.w : d.x;
                } else {
                    // Original rule: rightward label, hidden only when it
                    // would run into the next item in this lane
                    d.flipLabel = false;
                    d.showLabel = !next || rightLabelEnd <= next.x - 4;
                    if (d.showLabel) {
                        // Neither direction fits a very long label near the
                        // world edge: truncate rightward with an ellipsis
                        // rather than clipping mid-glyph at the pan limit
                        if (rightLabelEnd > rightEdgePx) {
                            const anchorX = (d.isRange ? d.x + d.w : d.x) + LABEL_PADDING;
                            d.labelMaxPx = rightEdgePx - anchorX - 2;
                        }
                        lastShownEnd = Math.min(rightLabelEnd, rightEdgePx);
                    }
                }
            }
        }

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

        // Children are created ONCE on enter and only their attributes are
        // updated per frame. The previous remove-and-recreate-per-frame
        // approach (a) broke touch gestures — a touch is bound to its start
        // target, and destroying the touched hit-rect mid-pan made the
        // browser silently drop the rest of the gesture — and (b) churned
        // GC/layout on every zoom frame (original review finding M6).
        enter.each(function(d) {
            const el = d3.select(this);
            const isApprox = d.startApprox || d.endApprox;
            el.append('rect')
                .attr('class', 'hit-area')
                .style('fill', 'transparent')
                .style('cursor', 'pointer');
            if (d.isRange) {
                el.append('rect')
                    .attr('class', `item-bar ${d.type}${isApprox ? ' approximate' : ''}`);
            } else if (d.type === 'event') {
                el.append('path')
                    .attr('class', `item-point ${d.type}`)
                    .attr('opacity', isApprox ? 0.7 : 1);
            } else {
                el.append('circle')
                    .attr('class', `item-point ${d.type}`)
                    .attr('opacity', isApprox ? 0.7 : 1);
            }
            el.append('text')
                .attr('class', 'item-label')
                .attr('y', ROW_HEIGHT / 2)
                .style('font-weight', d.significance === 'major' ? '600' : d.significance === 'moderate' ? '500' : '400')
                .style('font-size', d.significance === 'major' ? '14px' : d.significance === 'moderate' ? '13px' : '12px');
        });

        // Merge enter + update; per-frame attribute updates only
        const merged = enter.merge(groups);

        merged.attr('transform', d => `translate(0,${d.y})`);

        merged.each(function(d) {
            const el = d3.select(this);
            const barH = d.significance === 'major' ? BAR_HEIGHT_MAJOR : d.significance === 'moderate' ? BAR_HEIGHT_MODERATE : BAR_HEIGHT_MINOR;
            const barY = (ROW_HEIGHT - barH) / 2;

            const hitH = Math.max(44, ROW_HEIGHT);
            const itemW = d.isRange ? Math.max(d.w, 3) : 0;
            el.select('.hit-area')
                .attr('x', d.x - 10)
                .attr('y', (ROW_HEIGHT - hitH) / 2)
                .attr('width', Math.max(44, itemW + 160))
                .attr('height', hitH);

            const r = d.significance === 'major' ? POINT_RADIUS_MAJOR : d.significance === 'moderate' ? POINT_RADIUS_MODERATE : POINT_RADIUS_MINOR;
            if (d.isRange) {
                el.select('.item-bar')
                    .attr('x', d.x)
                    .attr('y', barY)
                    .attr('width', Math.max(d.w, 3))
                    .attr('height', barH);
            } else if (d.type === 'event') {
                el.select('.item-point')
                    .attr('d', `M${d.x},${ROW_HEIGHT/2 - r} L${d.x + r},${ROW_HEIGHT/2} L${d.x},${ROW_HEIGHT/2 + r} L${d.x - r},${ROW_HEIGHT/2} Z`);
            } else {
                el.select('.item-point')
                    .attr('cx', d.x)
                    .attr('cy', ROW_HEIGHT / 2)
                    .attr('r', r);
            }

            // Label — right of the marker normally, flipped near the world's
            // right edge, hidden when it crowds a lane neighbor
            const label = el.select('.item-label');
            if (d.showLabel !== false) {
                const labelX = d.flipLabel
                    ? (d.isRange ? d.x : d.x - r) - LABEL_PADDING
                    : (d.isRange ? d.x + d.w + LABEL_PADDING : d.x + r + LABEL_PADDING);
                // A label starting left of the viewport renders amputated
                // mid-word ("ision", "b Wrestles God") — hide it instead
                if (!d.flipLabel && labelX < 2) {
                    label.attr('display', 'none');
                    return;
                }
                let labelText = d.name;
                if (d.labelMaxPx != null) {
                    const charW = labelWidthFor(d) / Math.max(1, d.name.length);
                    const maxChars = Math.floor(d.labelMaxPx / charW) - 1;
                    if (maxChars >= 4 && maxChars < d.name.length) {
                        labelText = d.name.slice(0, maxChars) + '…';
                    }
                }
                label.attr('display', null)
                    .attr('x', labelX)
                    .attr('text-anchor', d.flipLabel ? 'end' : null)
                    .text(labelText);
            } else {
                label.attr('display', 'none');
            }
        });

        return offsetY + cache.counts[type] * (ROW_HEIGHT + ROW_GAP);
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
        // Tooltips only where a hover-capable pointer exists (touch laptops
        // with a mouse get them; pure touch devices use the detail panel)
        if (!window.matchMedia('(hover: hover)').matches) return;

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

        // Anchor to the ITEM (its label if visible, else its marker), not the
        // cursor. The tooltip is absolutely positioned inside the scrolling
        // container, so container.scrollTop must be added — omitting it left
        // the tooltip drifting off by the full scroll distance.
        const rect = container.getBoundingClientRect();
        const group = event.currentTarget || event.target.closest('.timeline-item');
        const anchorEl = group && (group.querySelector('.item-label') ||
                                   group.querySelector('.item-bar, .item-point'));
        const a = (anchorEl || event.target).getBoundingClientRect();

        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        // Right of the item's text, vertically centered on it
        let x = a.right - rect.left + 10;
        let y = a.top - rect.top + container.scrollTop + a.height / 2 - th / 2;
        // Flip to the left of the item when it would overflow the right edge
        if (x + tw > container.clientWidth - 4) {
            x = a.left - rect.left - tw - 10;
        }
        if (x < 4) x = 4;
        // Clamp vertically to the visible portion of the container
        const minY = container.scrollTop + 4;
        const maxY = container.scrollTop + container.clientHeight - th - 4;
        y = Math.max(minY, Math.min(maxY, y));

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

    /**
     * Center on a year. With spanYears, also ZOOM so that span fills the
     * plot — era pills and search jumps used to pan without fitting, moving
     * the view by pixels on a 6,000-year canvas.
     */
    function zoomToYear(year, spanYears) {
        let k = currentTransform.k;
        if (spanYears && spanYears > 0) {
            const plotWidth = width - MARGIN.left - MARGIN.right;
            const spanPx = xScale(year + spanYears / 2) - xScale(year - spanYears / 2);
            const se = zoom.scaleExtent();
            k = Math.max(se[0], Math.min(se[1], plotWidth / spanPx));
        }
        const tx = width / 2 - xScale(year) * k;
        const constrained = zoom.constrain()(
            d3.zoomIdentity.translate(tx, 0).scale(k),
            [[MARGIN.left, 0], [width - MARGIN.right, height]],
            zoom.translateExtent()
        );
        svg.transition().duration(prefersReduced() ? 0 : 500).call(
            zoom.transform, constrained
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

    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    return { init, render, refresh, fitAll, zoomToYear, scrollToItem, highlightSelected, formatYear, formatDateRange, escapeHtml };
})();

// timeline.js — six thousand years of people and events on one zoomable,
// pannable axis. Registered as view 'timeline'; #/story/… routes show it too,
// with tour.js driving it through the public API and filling #tour-slot.
//
// How it works
//   • Marks are drawn on one devicePixelRatio-scaled <canvas> and hit-tested
//     here. DOM is used only where text, focus or links matter: the controls,
//     the hover card, the pinned-year panel, the filter and the era display.
//   • The view is { c, span } in axis years (Time.toAxis), so there is no gap
//     at the BC/AD boundary. Year Y owns the cell [toAxis(Y), toAxis(Y) + 1):
//     lifespans run between year midpoints, and events that share a year are
//     spread across its cell in their recorded order.
//   • Items are packed into lanes once per zoom *level* (a quarter of a
//     doubling in pixels per year), never per frame, so panning can never move
//     an item between lanes. Each level is packed at its smallest scale; gaps
//     between marks only grow as you zoom in, so the packing stays free of
//     collisions at every scale inside the level. Labels are part of each
//     slot, so text never overlaps. Items that find no room are counted on a
//     nearby "+n" badge, which zooms in on them.
const Timeline = (() => {
    const { h } = UI;

    // ── Scale ───────────────────────────────────────────────────────────
    const DOMAIN_A = Time.toAxis(Time.MIN);
    const DOMAIN_B = Time.toAxis(Time.MAX) + 1;
    const DOMAIN = DOMAIN_B - DOMAIN_A;
    const MIN_SPAN = 4;
    const FIT_SPAN = DOMAIN * 1.07;          // "fit all": the whole story with a little air at each end
    const MAX_SPAN = DOMAIN * 1.2;

    // Semantic zoom: the scale (pixels per year) at which each significance joins.
    const K_MODERATE = 0.34;
    const K_MINOR = 2.2;
    const LEVELS_PER_DOUBLING = 4;
    // Share of each band's lanes in use when fully zoomed out. Phones get more
    // event lanes: six thousand years in 360 px leaves little room side by side.
    const LANE_SHARE = { desktop: { event: 0.5, person: 0.75 }, phone: { event: 0.8, person: 0.75 } };
    const STRETCH_MAX = 1.3;                 // lanes may spread up to this much apart to fill the frame
    const FRAME_MARGIN = 28;                 // px kept clear above and below the lanes when they are spread

    const SLOT_GAP = 14;                     // px kept clear after each slot in a lane
    const BADGE_REACH = 56;                  // px: a hidden item is counted on a badge this close
    const DIM = 0.16;                        // opacity of items outside the filter or spotlight
    const TICK_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    const OVERLAY_ROUTES = new Set(['person', 'event']);
    const HINT_KEY = 'ftt-timeline-hint';
    const HINT_MS = 7000;

    // ── State ───────────────────────────────────────────────────────────
    let root, wrap, canvas, ctx, mini, mctx;
    const els = {};
    let W = 0, H = 0, MW = 0, MH = 0, dpr = 1;
    const G = {};                            // geometry for the current size (see measureGeometry)
    let C = { fam: {}, era: new Map() };     // colours resolved from the theme
    let F = {};                              // canvas fonts
    const widthCache = new Map();

    let marks = [];                          // one per Store item: data, layout and motion state
    const byKey = new Map();
    let walkOrder = [];                      // shown marks in time order, for the keyboard
    let density = null;                      // minimap silhouette, 0..1 per bin

    const view = { c: 0, span: 1 };          // centre and years visible, in axis units
    let scrollY = 0, contentH = 0;
    let frameInset = { top: 0, bottom: 0 };  // px of the lanes covered by a tour card (see flyTo)
    let hasView = false, viewTouched = false, active = false;
    let layoutLevel = null, layoutDirty = true;

    let hits = [];                           // hit regions drawn in the last frame
    let hover = null;                        // hit under the mouse
    let pointer = null;                      // { x, y } of the mouse over the canvas
    let pinnedYear = null;
    let selected = null, kbFocus = null;
    let spotlight = null;                    // Set of item keys, or null
    const kinds = { person: true, event: true };
    const famFilter = new Set();

    let gesture = null;                      // press / drag / pinch in progress
    const touches = new Map();
    let flight = null, inertia = null;
    let raf = 0, lastFrame = 0;
    let prevRouteView = null;
    let ownPath = null;                      // the timeline URL this view last showed or wrote
    let shownEra = null, cardFor = null, releaseFilterFocus = null;
    let hintOffered = false, hintTimer = 0;

    // ── Small helpers ───────────────────────────────────────────────────
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const scale = () => W / view.span;
    const toX = a => (a - view.c) * scale() + W / 2;
    const axisAt = x => view.c + (x - W / 2) / scale();
    const yearAt = a => Time.fromAxis(Math.floor(a));
    const yearMid = y => Time.toAxis(y) + 0.5;
    const inDomain = y => y >= Time.MIN && y <= Time.MAX;
    const keyOf = x => `${x.kind === 'person' ? 'p' : 'e'}${x.id}`;
    const plural = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

    function measure(text, f) {
        const key = `${f}|${text}`;
        let w = widthCache.get(key);
        if (w == null) {
            ctx.font = f;
            w = ctx.measureText(text).width;
            widthCache.set(key, w);
        }
        return w;
    }

    // Shorten text with an ellipsis to fit maxW, or '' when even a stub won't fit.
    function fitText(text, f, maxW) {
        if (measure(text, f) <= maxW) return text;
        let lo = 0, hi = text.length;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (measure(`${text.slice(0, mid).trimEnd()}…`, f) <= maxW) lo = mid; else hi = mid - 1;
        }
        return lo >= 3 ? `${text.slice(0, lo).trimEnd()}…` : '';
    }

    function hexToRgb(hex) {
        const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
        return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
    }
    const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

    function rangeText(ya, yb) {
        if (ya < 0 && yb < 0) return `${-ya} to ${-yb} BC`;
        if (ya > 0 && yb > 0) return `AD ${ya} to ${yb}`;
        return `${-ya} BC to AD ${yb}`;
    }

    function firstSentence(text) {
        if (!text) return '';
        const m = /^.+?[.?!](?=\s+[A-Z“"‘'(]|$)/.exec(text);
        return m ? m[0] : text;
    }

    function groupLabel(type, group) {
        if (group === 'other') return type === 'person' ? 'Other people' : 'Other events';
        return type === 'person' ? Store.roleLabel(group) : group.charAt(0).toUpperCase() + group.slice(1);
    }

    // ── Marks: the data, positioned on the axis ─────────────────────────
    function buildMarks() {
        const sameYear = new Map();
        for (const it of Store.items) {
            if (it.type !== 'event') continue;
            if (!sameYear.has(it.start)) sameYear.set(it.start, []);
            sameYear.get(it.start).push(it);
        }
        const offset = new Map();
        for (const group of sameYear.values()) {
            group.sort((a, b) => (a.ref.sortOrder ?? 0) - (b.ref.sortOrder ?? 0) || a.id - b.id);
            group.forEach((it, i) => offset.set(it.key, (i + 1) / (group.length + 1)));
        }

        marks = Store.items.map(it => {
            const ref = it.ref, isEvent = it.type === 'event';
            const a = isEvent ? Time.toAxis(it.start) + offset.get(it.key) : yearMid(it.start);
            const b = isEvent && it.end === it.start ? a : yearMid(it.end);
            return {
                it, key: it.key, type: it.type, name: it.name, a, b, point: a === b,
                rank: Store.SIG_RANK[it.significance] ?? 2,
                fam: UI.family(it.group),
                estimated: !!it.estimated,
                approxA: !!(isEvent ? ref.startApprox && a !== b : ref.birthApprox),
                approxB: !!(isEvent ? ref.endApprox && a !== b : ref.deathApprox),
                era: Store.periodAt(it.start),
                // Prominence: how connected an item is in the data. Orders equally significant items.
                weight: isEvent
                    ? ref.people.length + ref.scripture.length + ref.locationIds.length
                    : ref.events.length + Store.relations(ref).length + ref.scripture.length,
                labelW: 0, shown: false, lane: -1, flip: false, badge: false, more: 0,
                clusterA: a, clusterB: b, alpha: 0, y: null
            };
        });
        byKey.clear();
        for (const m of marks) byKey.set(m.key, m);
        density = buildDensity();
    }

    // How much is happening across the whole story, for the minimap silhouette.
    function buildDensity() {
        const bins = new Float32Array(320);
        const binOf = a => clamp(Math.floor((a - DOMAIN_A) / DOMAIN * bins.length), 0, bins.length - 1);
        for (const m of marks) {
            const i0 = binOf(m.a), i1 = binOf(m.b);
            for (let i = i0; i <= i1; i++) bins[i] += m.type === 'event' ? 1.5 : 1;
        }
        const out = new Float32Array(bins.length);
        for (let i = 0; i < bins.length; i++) {
            const s = (bins[i - 1] || 0) + bins[i] * 2 + (bins[i + 1] || 0);
            out[i] = Math.sqrt(s);
        }
        const max = Math.max(...out) || 1;
        return out.map(v => v / max);
    }

    function measureLabels() {
        widthCache.clear();
        for (const m of marks) m.labelW = measure(m.name, labelFont(m));
        G.badgeW = measure('+99', F.badge) + 12;
        layoutDirty = true;
    }
    // Labels are measured once at their base size and drawn at the level's type scale.
    const labelFont = m => (m.rank === 0 ? F.major : F.label);
    const scaledFont = m => `${m.rank === 0 ? 600 : 500} ${((m.rank === 0 ? 12.5 : 12) * G.ts).toFixed(2)}px ${F.ui}`;
    const lw = m => m.labelW * G.ts;

    // ── Geometry ────────────────────────────────────────────────────────
    function measureGeometry() {
        const phone = UI.isMobile();
        Object.assign(G, phone
            ? { phone, ribbonH: 28, baseLaneH: 28, baseBarH: 14, spineH: 26, topPad: 8, tsMax: 1 }
            : { phone, ribbonH: 30, baseLaneH: 22, baseBarH: 12, spineH: 26, topPad: 10, tsMax: 1.3 });
        // The lanes area, less any part a tour card covers.
        G.areaTop = frameInset.top;
        G.areaH = Math.max(160, H - G.ribbonH - frameInset.top - frameInset.bottom);
        setTypeScale(G.ts ?? 1);
        root.style.setProperty('--tl-ribbon', `${G.ribbonH}px`);
        layoutDirty = true;
    }

    function setTypeScale(ts) {
        G.ts = ts;
        G.laneH = G.baseLaneH * ts;
        G.barH = G.baseBarH * ts;
        G.laneStep = G.laneH;
    }

    // Zoomed out there are few items and room to spare, so marks and labels
    // are drawn larger (up to tsMax); they return to normal over three
    // doublings of zoom. Quantised so the text size changes in few steps.
    // Phones stay at 1: on a narrow screen larger labels cost more items
    // than they gain, so there the lanes are spread apart instead.
    function typeScale(k) {
        const zoomedIn = clamp(Math.log2(k * FIT_SPAN / W) / 3, 0, 1);
        return Math.round((1 + (G.tsMax - 1) * (1 - zoomedIn)) * 20) / 20;
    }

    // People lanes left once events have taken theirs. Phones are short: there
    // people may run past the bottom and scroll, rather than be culled hard.
    function peopleCap(lanes, evUsed) {
        if (!kinds.person) return 0;
        const left = lanes - evUsed;
        return G.phone ? Math.max(left, 16) : Math.max(3, left);
    }

    // A lane's vertical centre relative to the top of the spine. Events stack
    // upward from the spine and people downward, so the most significant of
    // each sit closest to the axis.
    const laneOffset = (type, lane) => (type === 'event'
        ? -(lane + 0.5) * G.laneStep
        : G.spineH + (lane + 0.5) * G.laneStep);

    function resize() {
        const r = wrap.getBoundingClientRect();
        const mr = mini.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 3);
        W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
        MW = Math.max(1, Math.round(mr.width)); MH = Math.max(1, Math.round(mr.height));
        for (const [c, w, hh] of [[canvas, W, H], [mini, MW, MH]]) {
            c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr);
        }
        measureGeometry();
        if (!hasView) return;
        setView(view.c, view.span, { quiet: true });
    }

    // ── Colours and fonts ───────────────────────────────────────────────
    function resolveTheme() {
        const cs = getComputedStyle(root);
        const v = name => cs.getPropertyValue(name).trim();
        const light = App.theme === 'light';
        C = {
            light, bg: v('--bg'), bg1: v('--bg-1'), bg2: v('--bg-2'), line: v('--line'), lineStrong: v('--line-strong'),
            text: v('--text'), dim: v('--text-dim'), faint: v('--text-faint'),
            gold: v('--gold'), goldBright: v('--gold-bright'), bgRgb: hexToRgb(v('--bg')),
            fam: {}, era: new Map()
        };
        for (const m of marks) if (!C.fam[m.fam]) C.fam[m.fam] = hexToRgb(v(`--fam-${m.fam}`));
        // Era colours are tuned for the dark ground; on parchment mix them toward ink.
        for (const p of Store.periods) {
            const rgb = hexToRgb(p.color);
            C.era.set(p, light ? rgb.map(x => Math.round(x * 0.7)) : rgb);
        }
        const ui = getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim() || 'sans-serif';
        F = {
            ui, label: `500 12px ${ui}`, major: `600 12.5px ${ui}`, tick: `500 11px ${ui}`,
            era: `600 10.5px ${ui}`, badge: `600 10.5px ${ui}`
        };
    }

    // ── View ────────────────────────────────────────────────────────────
    const clampSpan = s => clamp(s, MIN_SPAN, MAX_SPAN);
    function clampCentre(c, span) {
        const slack = span * 0.42;
        const lo = DOMAIN_A + span / 2 - slack, hi = DOMAIN_B - span / 2 + slack;
        return lo > hi ? (DOMAIN_A + DOMAIN_B) / 2 : clamp(c, lo, hi);
    }

    function setView(c, span, { quiet = false } = {}) {
        view.span = clampSpan(span);
        view.c = clampCentre(c, view.span);
        hasView = true;
        if (!quiet) viewTouched = true;
        syncUrl();
        announceView();
        requestRender();
    }

    // Animated move. `duration` in ms; omitted, it follows the distance travelled.
    function flyView(c, span, duration) {
        span = clampSpan(span);
        c = clampCentre(c, span);
        inertia = null;
        if (!W || !hasView || duration === 0 || UI.reducedMotion()) {
            flight = null;
            setView(c, span, { quiet: !hasView });   // the opening view is not a user move
            return;
        }
        const interp = d3.interpolateZoom([view.c, 0, view.span], [c, 0, span]);
        flight = {
            interp, t0: performance.now(), to: { c, span },
            dur: duration ?? clamp(interp.duration * 0.9, 380, 1600)
        };
        requestRender();
    }

    // Where the view is heading (the flight target when one is under way).
    const target = () => (flight ? flight.to : view);

    function zoomAround(x, factor) {
        const a = axisAt(x);
        const span = clampSpan(view.span / factor);
        setView(a - (x - W / 2) * span / W, span);
    }
    function zoomBy(factor) {
        const t = target();
        flyView(t.c, t.span / factor, 300);
    }
    function panBy(fraction) {
        const t = target();
        flyView(t.c + t.span * fraction, t.span, 260);
    }
    const fitAll = animate => flyView((DOMAIN_A + DOMAIN_B) / 2, FIT_SPAN, animate ? undefined : 0);
    function flyToYears(startYear, endYear) {
        const a = Time.toAxis(startYear), b = Time.toAxis(endYear) + 1;
        flyView((a + b) / 2, (b - a) * 1.12);
    }

    // Visible horizontal band, leaving out a detail sheet docked on the right.
    function clearBand() {
        const sheet = document.getElementById('detail');
        const covered = sheet && !sheet.hidden && !UI.isMobile() ? Math.min(sheet.offsetWidth, W * 0.6) : 0;
        return [0, W - covered];
    }

    // Centre and span that show `span` years around axis value `a` inside the
    // clear band [L, R] rather than across the whole width.
    function framed(a, span, L, R) {
        const total = span * W / Math.max(80, R - L);
        return { c: a - ((L + R) / 2 - W / 2) * total / W, span: total };
    }

    // Bring a mark into view, keeping the zoom; pan only as far as needed.
    function reveal(m) {
        const k = scale();
        const [L, R] = clearBand();
        const x0 = toX(m.a), x1 = toX(m.b);
        const labelEnd = x1 + 12 + lw(m);
        const comfortable = x0 >= L + 24 && labelEnd <= R - 24;
        const spansView = x0 < L && x1 > R;
        if (!comfortable && !spansView) {
            const fitsBand = (m.b - m.a) * k + lw(m) + 40 < R - L;
            const anchorX = fitsBand ? (L + R) / 2 : L + (R - L) * 0.15;
            const anchorA = fitsBand ? (m.a + m.b) / 2 + (lw(m) / 2) / k : m.a;
            const t = target();
            flyView(anchorA - (anchorX - W / 2) * t.span / W, t.span);
        }
        if (m.lane >= 0) {
            const y = G.spineTarget + laneOffset(m.type, m.lane);
            if (y - G.laneH < scrollY + G.areaTop || y + G.laneH > scrollY + G.areaTop + G.areaH) scrollY = y - G.areaTop - G.areaH / 2;
        }
    }

    // ── Layout: lanes per zoom level ────────────────────────────────────
    const levelOf = k => Math.floor(Math.log2(k) * LEVELS_PER_DOUBLING);
    const gateOpen = (m, k) => m.rank === 0 || (m.rank === 1 ? k >= K_MODERATE : k >= K_MINOR);
    const isForced = m => m === selected || (spotlight && spotlight.has(m.key));
    const isDimmed = m => (spotlight && !spotlight.has(m.key)) || (famFilter.size > 0 && !famFilter.has(m.fam));

    // The order in which items claim lanes: forced items (selected, spotlit),
    // then filter matches, then by significance. Within a significance, eras
    // take turns, so every era shows its most prominent item before any era
    // shows its second; within a turn, the more prominent item goes first.
    function inClaimOrder(cands) {
        const tier = m => (isForced(m) ? 0 : 6) + (famFilter.size && !famFilter.has(m.fam) ? 3 : 0) + m.rank;
        const turn = new Map(), groups = new Map();
        for (const m of cands) {
            const g = `${tier(m)}|${m.era?.id}`;
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(m);
        }
        for (const list of groups.values()) spreadOrder(list).forEach((m, i) => turn.set(m, i));
        return cands.sort((x, y) => tier(x) - tier(y) || turn.get(x) - turn.get(y) || y.weight - x.weight || x.a - y.a);
    }

    // An era's items, most prominent first, except that an item close in time
    // to one already chosen counts for less, so an era's picks spread across
    // it instead of piling onto one year (Creation and the Fall, say, before
    // the Flood).
    function spreadOrder(list) {
        const era = list[0].era;
        const reach = Math.max(50, era ? (era.endYear - era.startYear) / 3 : 50);
        const left = list.slice(), near = left.map(() => reach), out = [];
        while (left.length) {
            let best = 0, bestScore = -1;
            left.forEach((m, i) => {
                const score = (m.weight + 1) * (0.25 + 0.75 * Math.min(1, near[i] / reach));
                if (score > bestScore || (score === bestScore && m.a < left[best].a)) { best = i; bestScore = score; }
            });
            const [pick] = left.splice(best, 1);
            near.splice(best, 1);
            left.forEach((m, i) => { near[i] = Math.min(near[i], Math.abs(m.a - pick.a)); });
            out.push(pick);
        }
        return out;
    }

    // The horizontal extent a mark needs at scale k: mark, label and badge.
    // Labels go to the right; near the end of the story they flip left so
    // nothing runs off the edge of time.
    function slotOf(m, k, badgeW) {
        const xa = m.a * k, xb = m.b * k, start = DOMAIN_A * k, end = DOMAIN_B * k;
        const extra = badgeW ? badgeW + 6 : 0;
        // Flip only when the label then stays inside the story at the other end too.
        const flips = (tail, x0) => tail > end && x0 >= start;
        if (m.type === 'event') {
            const tail = Math.max(xb, xa + 12 + lw(m) + extra), x0 = xa - 12 - lw(m) - extra;
            if (xb - xa < lw(m) && flips(tail, x0)) return { x0, x1: Math.max(xa + 7, xb), flip: true };
            return { x0: xa - 7, x1: tail, flip: false };
        }
        const inside = xb - xa >= lw(m) + 18;
        const tail = inside ? xb + extra : xb + 7 + lw(m) + extra, x0 = xa - 7 - lw(m) - extra;
        if (!inside && flips(tail, x0)) return { x0, x1: xb, flip: true };
        return { x0: xa, x1: tail, flip: false };
    }

    // Lanes hold sorted, non-overlapping [x0, x1] intervals.
    function laneFits(lane, x0, x1) {
        let lo = 0, hi = lane.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (lane[mid][1] <= x0) lo = mid + 1; else hi = mid; }
        return lo === lane.length || lane[lo][0] >= x1;
    }
    function laneInsert(lane, x0, x1) {
        let lo = 0, hi = lane.length;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (lane[mid][0] < x0) lo = mid + 1; else hi = mid; }
        lane.splice(lo, 0, [x0, x1]);
    }

    // First fit, most important first: the same level always packs the same way.
    function pack(cands, cap, k, badged) {
        const lanes = Array.from({ length: cap }, () => []);
        const placed = [], hidden = [];
        for (const m of cands) {
            const badge = !!badged && badged.has(m);
            const s = slotOf(m, k, badge ? G.badgeW : 0);
            const lane = lanes.findIndex(l => laneFits(l, s.x0, s.x1 + SLOT_GAP));
            if (lane < 0) { hidden.push(m); continue; }
            laneInsert(lanes[lane], s.x0, s.x1 + SLOT_GAP);
            placed.push({ m, lane, flip: s.flip, badge });
        }
        return { placed, hidden };
    }

    // Count each hidden item on the nearest placed neighbour within reach.
    function hostsFor({ placed, hidden }, k, onlyBadged) {
        const hosts = new Map();
        const reach = (onlyBadged ? BADGE_REACH * 2 : BADGE_REACH) / k;
        for (const m of hidden) {
            let best = null, bestGap = reach;
            for (const p of placed) {
                if (onlyBadged && !p.badge) continue;
                const gap = Math.max(0, m.a - p.m.b, p.m.a - m.b);
                if (gap <= bestGap) { best = p.m; bestGap = gap; }
            }
            if (!best) continue;
            if (!hosts.has(best)) hosts.set(best, []);
            hosts.get(best).push(m);
        }
        return hosts;
    }

    // How many lanes a band may fill at scale k. Zoomed out, only a share of
    // them, so the opening view reads as a curated poster rather than a wall;
    // the share grows to all of them over three doublings of zoom.
    function laneBudget(type, cap, k) {
        const zoomedIn = clamp(Math.log2(k * FIT_SPAN / W) / 3, 0, 1);
        const share = LANE_SHARE[G.phone ? 'phone' : 'desktop'][type];
        return Math.min(cap, Math.max(2, Math.round(cap * (share + (1 - share) * zoomedIn))));
    }

    function layout(level) {
        const k = 2 ** (level / LEVELS_PER_DOUBLING);
        setTypeScale(typeScale(k));
        for (const m of marks) { m.shown = false; m.badge = false; m.more = 0; }
        const lanes = Math.max(4, Math.floor((G.areaH - G.topPad - G.spineH - 10) / G.laneH));
        // Events may take up to half the lanes; people get whatever events leave.
        const evCap = kinds.event ? (kinds.person ? Math.max(2, Math.round(lanes * 0.5)) : lanes) : 0;
        const used = { event: 0, person: 0 };
        for (const type of ['event', 'person']) {
            const cap = type === 'event' ? evCap : peopleCap(lanes, used.event);
            if (!cap) continue;
            placeBand(type, laneBudget(type, cap, k), k);
            for (const m of marks) if (m.shown && m.type === type) used[type] = Math.max(used[type], m.lane + 1);
        }
        // Fill the frame: when the lanes need less height than there is, spread
        // them apart, then centre the block with the spine wherever the events
        // end. The spine eases there when this changes.
        const rows = used.event + used.person;
        const room = G.areaH - 2 * FRAME_MARGIN - G.spineH;
        G.laneStep = G.laneH * clamp(rows ? room / (rows * G.laneH) : 1, 1, STRETCH_MAX);
        const blockH = rows * G.laneStep + G.spineH;
        G.spineTarget = G.areaTop + Math.max(G.topPad, (G.areaH - blockH) / 2) + used.event * G.laneStep;
        if (G.spineTop == null) G.spineTop = G.spineTarget;
        contentH = G.spineTarget + G.spineH + used.person * G.laneStep + 16;

        walkOrder = marks.filter(m => m.shown).sort((x, y) => x.a - y.a || (x.type === 'event' ? -1 : 1));
        if (kbFocus && !kbFocus.shown) kbFocus = null;
        layoutLevel = level;
        layoutDirty = false;
    }

    function placeBand(type, cap, k) {
        const cands = inClaimOrder(marks.filter(m => m.type === type && (isForced(m) || gateOpen(m, k))));
        let result = pack(cands, cap, k, null);
        // Second pass: reserve room for a badge on each item that will host hidden neighbours.
        const firstHosts = hostsFor(result, k, false);
        if (firstHosts.size) result = pack(cands, cap, k, new Set(firstHosts.keys()));
        const hosts = hostsFor(result, k, true);
        for (const { m, lane, flip, badge } of result.placed) {
            const members = hosts.get(m) || [];
            Object.assign(m, {
                shown: true, lane, flip, badge: badge && members.length > 0, more: members.length,
                clusterA: Math.min(m.a, ...members.map(x => x.a)),
                clusterB: Math.max(m.b, ...members.map(x => x.b))
            });
        }
    }

    function ensureLayout() {
        const level = levelOf(scale());
        if (layoutDirty || level !== layoutLevel) layout(level);
    }

    // Ease the spine, and each mark's opacity and lane, toward the layout.
    function stepTweens(dt) {
        const instant = UI.reducedMotion();
        const fa = instant ? 1 : 1 - Math.exp(-dt / 90);
        const fy = instant ? 1 : 1 - Math.exp(-dt / 70);
        const approach = (from, to, f) => (Math.abs(to - from) > 0.2 ? from + (to - from) * f : to);
        let moving = false;
        const spine = approach(G.spineTop, G.spineTarget, fy);
        if (spine !== G.spineTarget) moving = true;
        G.spineTop = spine;
        for (const m of marks) {
            const ta = m.shown ? 1 : 0;
            if (m.shown) {
                const ty = laneOffset(m.type, m.lane);
                if (m.y == null || m.alpha < 0.05) m.y = ty;
                else { m.y = approach(m.y, ty, fy); if (m.y !== ty) moving = true; }
            }
            if (Math.abs(ta - m.alpha) > 0.01) { m.alpha += (ta - m.alpha) * fa; moving = true; } else m.alpha = ta;
        }
        scrollY = clamp(scrollY, 0, Math.max(0, contentH - G.areaTop - G.areaH));
        return moving;
    }

    // ── Frame loop ──────────────────────────────────────────────────────
    function requestRender() {
        if (!raf && active && W) raf = requestAnimationFrame(frame);
    }

    function frame(t) {
        raf = 0;
        const dt = lastFrame ? Math.min(64, t - lastFrame) : 16;
        lastFrame = t;
        let animating = stepMotion(t, dt);
        ensureLayout();
        animating = stepTweens(dt) || animating;
        draw();
        drawMinimap();
        placeOverlays();
        if (animating) requestRender(); else lastFrame = 0;
    }

    function stepMotion(t, dt) {
        if (flight) {
            const p = Math.min(1, (t - flight.t0) / flight.dur);
            const [c, , span] = flight.interp(d3.easeCubicInOut(Math.max(0, p)));
            setView(c, span);
            if (p >= 1) { setView(flight.to.c, flight.to.span); flight = null; }
            return true;
        }
        if (inertia) {
            setView(view.c - inertia.v * dt / scale(), view.span);
            inertia.v *= Math.exp(-dt / 320);
            if (Math.abs(inertia.v) < 0.02) inertia = null;
            return true;
        }
        return false;
    }

    // ── Drawing ─────────────────────────────────────────────────────────
    const snap = x => Math.round(x * dpr) / dpr;

    function draw() {
        const k = scale();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        const top = G.ribbonH;
        const ticks = tickYears(k);
        drawWashes(top);
        drawGrid(ticks, top);

        ctx.save();
        ctx.beginPath(); ctx.rect(0, top, W, H - top); ctx.clip();
        const oy = top - scrollY;
        drawSpine(ticks, oy);
        hits = [];
        drawMarks(oy);
        drawYearLines(top);
        drawScrollHint(top);
        ctx.restore();

        drawRibbon();
    }

    function tickYears(k) {
        const minGap = G.phone ? 60 : 96;
        const step = TICK_STEPS.find(s => s * k >= minGap) || 1000 * Math.ceil(minGap / k / 1000);
        const y0 = yearAt(axisAt(0)), y1 = yearAt(axisAt(W));
        const out = [];
        for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
            if (y !== 0 && y >= Time.MIN - step && y <= Time.MAX + step) out.push(y);
        }
        return out;
    }

    function drawWashes(top) {
        for (const p of Store.periods) {
            const x0 = toX(Time.toAxis(p.startYear)), x1 = toX(Time.toAxis(p.endYear));
            if (x1 < 0 || x0 > W) continue;
            ctx.fillStyle = rgba(C.era.get(p), C.light ? 0.06 : 0.05);
            ctx.fillRect(x0, top, x1 - x0, H - top);
            ctx.fillStyle = rgba(C.era.get(p), C.light ? 0.22 : 0.16);
            ctx.fillRect(snap(x0), top, 1 / dpr, H - top);
        }
    }

    function drawGrid(ticks, top) {
        ctx.fillStyle = C.line;
        for (const y of ticks) ctx.fillRect(snap(toX(Time.toAxis(y))), top, 1 / dpr, H - top);
    }

    // The axis between events (above) and people (below). It sticks to the
    // edge of the lanes area when the lanes are scrolled on a phone.
    function drawSpine(ticks, oy) {
        const y = clamp(oy + G.spineTop, G.ribbonH, H - G.spineH);
        const mid = y + G.spineH / 2;
        ctx.fillStyle = rgba(C.bgRgb, 0.72);
        ctx.fillRect(0, y, W, G.spineH);
        ctx.fillStyle = C.lineStrong;
        ctx.fillRect(0, snap(y), W, 1 / dpr);
        ctx.fillRect(0, snap(y + G.spineH), W, 1 / dpr);
        ctx.font = F.tick;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        for (const yr of ticks) {
            const x = toX(Time.toAxis(yr));
            ctx.fillStyle = C.lineStrong;
            ctx.fillRect(snap(x), y, 1 / dpr, 4);
            ctx.fillRect(snap(x), y + G.spineH - 4, 1 / dpr, 4);
            const label = Time.year(yr), half = measure(label, F.tick) / 2;
            if (x - half < 4 || x + half > W - 4) continue;     // never a clipped year
            ctx.fillStyle = C.dim;
            ctx.fillText(label, snap(x), mid + 0.5);
        }
        ctx.textAlign = 'left';
    }

    function drawMarks(oy) {
        const late = [];
        for (const m of marks) {
            if (m.alpha <= 0.01 || m.y == null) continue;
            const x0 = toX(m.a), x1 = toX(m.b);
            if (x1 < -lw(m) - 80 || x0 > W + lw(m) + 80) continue;
            const cy = oy + G.spineTop + m.y;
            if (cy < G.ribbonH - G.laneH || cy > H + G.laneH) continue;
            if ((hover && hover.m === m) || m === selected || m === kbFocus) { late.push([m, x0, x1, cy]); continue; }
            drawMark(m, x0, x1, cy, false);
        }
        for (const [m, x0, x1, cy] of late) drawMark(m, x0, x1, cy, true);
    }

    function drawMark(m, x0, x1, cy, lifted) {
        const col = C.fam[m.fam];
        const alpha = m.alpha * (isDimmed(m) && m !== selected ? DIM : 1);
        const hot = lifted && ((hover && hover.m === m && !hover.badge) || m === kbFocus);
        const geo = m.type === 'person' ? personGeometry(m, x0, x1) : eventGeometry(m, x0, x1);
        ctx.globalAlpha = alpha;
        if (hot) { ctx.shadowColor = rgba(col, 0.6); ctx.shadowBlur = 16; }
        if (m.type === 'person') drawBar(m, x0, geo.w, cy, col, hot);
        else drawEvent(m, x0, x1, cy, col, hot);
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

        ctx.font = scaledFont(m);
        ctx.textBaseline = 'middle';
        ctx.fillStyle = m === selected ? C.goldBright
            : hot || geo.inside || m.rank === 0 ? C.text : C.dim;
        if (geo.text) ctx.fillText(geo.text, snap(geo.lx), cy + 0.5);

        const hit = { m, x0: geo.left, x1: geo.right, y0: cy - G.laneStep / 2, y1: cy + G.laneStep / 2 };
        hits.push(hit);
        const bw = m.badge && m.more ? measure(`+${m.more}`, F.badge) + 12 : 0;
        const bx = geo.flip ? geo.lx - 6 - bw : geo.badgeX;
        if (bw && geo.text && !(geo.badgeMax && bx + bw > geo.badgeMax)) {
            drawBadge(m, bx, cy, bw);
            hits.push({ m, badge: true, x0: bx - 3, x1: bx + bw + 3, y0: cy - G.laneStep / 2, y1: cy + G.laneStep / 2 });
        }
        if (m === selected) drawSelection(m, x0, geo, cy);
        if (m === kbFocus) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
            ctx.beginPath(); ctx.roundRect(geo.left - 5, cy - G.laneH / 2 + 1, geo.right - geo.left + 10, G.laneH - 2, 6);
            ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.globalAlpha = 1;
    }

    // Where a lifespan's label goes: inside the bar when it fits (and sticky to
    // the left edge of the screen as the bar scrolls past), else beside it.
    function personGeometry(m, x0, x1) {
        const w = Math.max(x1 - x0, 3), right = x0 + w;
        const inside = w >= lw(m) + 18;
        let lx, text = m.name;
        if (inside) ({ lx, text } = stickyLabel(m, x0 + 9, right - 9));
        else lx = m.flip ? x0 - 7 - lw(m) : right + 7;
        const labelEnd = lx + lw(m);
        return {
            w, inside, lx, text, flip: m.flip && !inside,
            left: Math.min(x0, lx), right: Math.max(right, labelEnd),
            badgeX: inside ? right + 6 : labelEnd + 6
        };
    }

    function eventGeometry(m, x0, x1) {
        const flip = m.flip;
        let lx = flip ? x0 - 12 - lw(m) : x0 + 12, text = m.name;
        if (!m.point && x1 - x0 > lw(m) + 12) ({ lx, text } = stickyLabel(m, x0 + 12, x1));
        const labelEnd = lx + (text === m.name ? lw(m) : measure(text, scaledFont(m)));
        // A long range keeps its badge inside the bar, so it never strays into a neighbour's slot.
        const slotEnd = Math.max(x1, x0 + 12 + lw(m) + G.badgeW + 6);
        return {
            lx, text, flip, inside: false,
            left: Math.min(x0 - 7, lx), right: Math.max(x1, labelEnd, x0 + 7),
            badgeX: labelEnd + 6, badgeMax: slotEnd
        };
    }

    // A label that rides along the screen's left edge inside a long mark, and
    // shortens with an ellipsis when the visible part of the mark gets short.
    function stickyLabel(m, from, to) {
        const lx = Math.max(from, 9);
        if (lx + lw(m) <= to) return { lx, text: m.name };
        return { lx, text: fitText(m.name, scaledFont(m), to - lx) };
    }

    // A colour that fades to nothing at approximate ends instead of stopping hard.
    function fadeFill(m, col, x0, w, a) {
        if ((!m.approxA && !m.approxB) || w < 10) return rgba(col, a);
        const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
        const f = Math.min(18, w * 0.22) / w;
        g.addColorStop(0, rgba(col, m.approxA ? 0 : a));
        g.addColorStop(f, rgba(col, a));
        g.addColorStop(1 - f, rgba(col, a));
        g.addColorStop(1, rgba(col, m.approxB ? 0 : a));
        return g;
    }

    function drawBar(m, x0, w, cy, col, hot) {
        const bh = G.barH + (hot ? 2 : 0);
        ctx.beginPath();
        ctx.roundRect(x0, cy - bh / 2, w, bh, Math.min(bh / 2, w / 2));
        const fillA = m.estimated ? 0.1 : m.rank === 0 ? 0.36 : 0.26;
        ctx.fillStyle = fadeFill(m, col, x0, w, Math.min(0.6, fillA * (hot ? 1.5 : 1)));
        ctx.fill();
        ctx.lineWidth = 1;
        if (m.estimated) ctx.setLineDash([3, 3]);
        ctx.strokeStyle = fadeFill(m, col, x0, w, m.estimated ? 0.7 : hot ? 1 : 0.7);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function diamond(x, cy, r) {
        ctx.beginPath();
        ctx.moveTo(x, cy - r); ctx.lineTo(x + r, cy); ctx.lineTo(x, cy + r); ctx.lineTo(x - r, cy);
        ctx.closePath();
    }

    // Events: a diamond at the moment; a range adds a slim bar beneath its
    // label for the duration.
    function drawEvent(m, x0, x1, cy, col, hot) {
        if (!m.point) {
            const w = Math.max(x1 - x0, 2);
            ctx.fillStyle = fadeFill(m, col, x0, w, 0.85);
            ctx.beginPath(); ctx.roundRect(x0, cy + 6.5, w, 2.5, 1.25); ctx.fill();
        }
        const r = (m.rank === 0 ? 5.6 : 4.6) * G.ts + (hot ? 1.2 : 0);
        diamond(snap(x0), cy, r);
        ctx.fillStyle = rgba(col, 1);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = C.bg;
        ctx.stroke();
    }

    function drawBadge(m, bx, cy, bw) {
        const hot = hover && hover.badge && hover.m === m;
        ctx.globalAlpha = m.alpha * (isDimmed(m) ? DIM : 1);
        ctx.beginPath(); ctx.roundRect(snap(bx), cy - 8, bw, 16, 8);
        ctx.fillStyle = C.bg2; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = hot ? C.gold : C.lineStrong; ctx.stroke();
        ctx.font = F.badge; ctx.fillStyle = hot ? C.goldBright : C.dim;
        ctx.textAlign = 'center';
        ctx.fillText(`+${m.more}`, snap(bx + bw / 2), cy + 0.5);
        ctx.textAlign = 'left';
    }

    function drawSelection(m, x0, geo, cy) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5;
        if (m.type === 'event') { diamond(snap(x0), cy, 9); ctx.stroke(); return; }
        const bh = G.barH + 6;
        ctx.beginPath(); ctx.roundRect(x0 - 3, cy - bh / 2, geo.w + 6, bh, bh / 2); ctx.stroke();
    }

    // The year line: a hairline under the mouse and a gold one where pinned.
    function drawYearLines(top) {
        const hy = hoverYear();
        if (hy != null && hy !== pinnedYear) {
            ctx.fillStyle = C.faint;
            ctx.fillRect(snap(toX(yearMid(hy))), top, 1 / dpr, H - top);
        }
        if (pinnedYear != null) {
            const x = snap(toX(yearMid(pinnedYear)));
            ctx.fillStyle = C.gold;
            ctx.fillRect(x - 0.5, top, 1, H - top);
        }
    }

    function hoverYear() {
        if (!pointer || gesture || pointer.y < G.ribbonH) return null;
        const y = yearAt(axisAt(pointer.x));
        return inDomain(y) ? y : null;
    }

    // A soft fade at the bottom edge when more lanes lie below (phones).
    function drawScrollHint(top) {
        const areaH = H - top;
        if (contentH - scrollY <= areaH + 2) return;
        const g = ctx.createLinearGradient(0, H - 36, 0, H);
        g.addColorStop(0, rgba(C.bgRgb, 0));
        g.addColorStop(1, rgba(C.bgRgb, 0.9));
        ctx.fillStyle = g;
        ctx.fillRect(0, H - 36, W, 36);
    }

    // The era ribbon: named bands across the top. Names stick to the left
    // edge as a band scrolls off, and step aside when the band is too narrow for
    // the whole name (hovering the band then shows it).
    function drawRibbon() {
        const rh = G.ribbonH;
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, rh);
        const current = Store.periodAt(yearAt(view.c));
        const hoverEra = pointer && pointer.y < rh && !gesture ? eraAtX(pointer.x) : null;
        ctx.font = F.era;
        ctx.textBaseline = 'middle';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1.4px';
        for (const p of Store.periods) {
            const x0 = toX(Time.toAxis(p.startYear)), x1 = toX(Time.toAxis(p.endYear));
            if (x1 < 0 || x0 > W) continue;
            const rgb = C.era.get(p);
            ctx.fillStyle = rgba(rgb, (C.light ? 0.2 : 0.26) + (p === hoverEra ? 0.14 : 0));
            ctx.fillRect(x0 + 0.5, 0, x1 - x0 - 1, rh);
            if (p === current) {
                ctx.fillStyle = rgba(rgb, 1);
                ctx.fillRect(x0 + 0.5, rh - 2, x1 - x0 - 1, 2);
            }
            const left = Math.max(x0, 0) + 10, right = Math.min(x1, W) - 10;
            const name = p.name.toUpperCase();
            if (measure(name, F.era) > right - left - 2) continue;      // whole names only; the tooltip has it
            ctx.fillStyle = C.text;
            ctx.globalAlpha = p === current || p === hoverEra ? 1 : 0.82;
            ctx.fillText(name, snap(left), rh / 2 + 0.5);
            ctx.globalAlpha = 1;
        }
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        ctx.fillStyle = C.line;
        ctx.fillRect(0, rh - 1 / dpr, W, 1 / dpr);
    }

    function eraAtX(x) {
        const a = axisAt(x);
        return Store.periods.find(p => a >= Time.toAxis(p.startYear) && a < Time.toAxis(p.endYear)) || null;
    }

    // ── Minimap ─────────────────────────────────────────────────────────
    const miniX = a => (a - DOMAIN_A) / DOMAIN * MW;
    const miniAxis = x => DOMAIN_A + x / MW * DOMAIN;

    function drawMinimap() {
        const c = mctx;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, MW, MH);
        const base = MH - 4;
        for (const p of Store.periods) {
            const x0 = miniX(Time.toAxis(p.startYear)), x1 = miniX(Time.toAxis(p.endYear));
            const rgb = C.era.get(p);
            c.fillStyle = rgba(rgb, C.light ? 0.1 : 0.09);
            c.fillRect(x0, 0, x1 - x0, base);
            c.fillStyle = rgba(rgb, 0.9);
            c.fillRect(x0 + 0.5, base, Math.max(1, x1 - x0 - 1), 3);
        }
        // Density silhouette
        c.beginPath();
        c.moveTo(0, base);
        const n = density.length;
        for (let i = 0; i < n; i++) c.lineTo((i + 0.5) / n * MW, base - density[i] * (base - 5));
        c.lineTo(MW, base);
        c.closePath();
        c.fillStyle = C.light ? 'rgba(40,32,16,.16)' : 'rgba(236,228,211,.16)';
        c.fill();
        c.strokeStyle = C.lineStrong; c.lineWidth = 1; c.stroke();

        // The window onto the main view
        let x0 = miniX(view.c - view.span / 2), x1 = miniX(view.c + view.span / 2);
        if (x1 - x0 < 6) { const m = (x0 + x1) / 2; x0 = m - 3; x1 = m + 3; }
        c.fillStyle = C.light ? 'rgba(143,100,17,.10)' : 'rgba(216,178,90,.10)';
        c.fillRect(x0, 0, x1 - x0, base);
        c.strokeStyle = C.gold; c.lineWidth = 1.25;
        c.strokeRect(Math.round(x0) + 0.5, 0.5, Math.max(1, Math.round(x1 - x0) - 1), base - 1);
        c.fillStyle = C.gold;
        for (const x of [x0, x1]) c.fillRect(Math.round(x) - 1.5, base / 2 - 6, 3, 12);
    }

    function attachMinimap() {
        let drag = null;
        const local = e => e.clientX - mini.getBoundingClientRect().left;
        mini.addEventListener('pointerdown', e => {
            mini.setPointerCapture(e.pointerId);
            stopMotion();
            const x = local(e);
            const x0 = miniX(view.c - view.span / 2), x1 = miniX(view.c + view.span / 2);
            const grab = e.pointerType === 'touch' ? 14 : 7;
            if (Math.abs(x - x0) <= grab && x1 - x0 > grab) drag = { mode: 'left' };
            else if (Math.abs(x - x1) <= grab) drag = { mode: 'right' };
            else {
                if (x < x0 || x > x1) setView(miniAxis(x), view.span);
                drag = { mode: 'move', offset: miniAxis(x) - view.c };
            }
            e.preventDefault();
        });
        mini.addEventListener('pointermove', e => {
            const x = local(e);
            if (!drag) {
                const x0 = miniX(view.c - view.span / 2), x1 = miniX(view.c + view.span / 2);
                mini.style.cursor = Math.abs(x - x0) <= 7 || Math.abs(x - x1) <= 7 ? 'ew-resize' : x > x0 && x < x1 ? 'grab' : 'pointer';
                return;
            }
            const a = miniAxis(x);
            const lo = view.c - view.span / 2, hi = view.c + view.span / 2;
            if (drag.mode === 'move') setView(a - drag.offset, view.span);
            else if (drag.mode === 'left') { const nl = Math.min(a, hi - MIN_SPAN); setView((nl + hi) / 2, hi - nl); }
            else { const nh = Math.max(a, lo + MIN_SPAN); setView((lo + nh) / 2, nh - lo); }
        });
        const end = () => { drag = null; };
        mini.addEventListener('pointerup', end);
        mini.addEventListener('pointercancel', end);
    }

    // ── Overlays that follow the canvas ─────────────────────────────────
    function placeOverlays() {
        // Hover readout: the year under the mouse and how many were alive.
        // Over the ribbon it names the era instead, since narrow bands show no name.
        const hy = hoverYear();
        const hoverEra = pointer && !gesture && pointer.y < G.ribbonH ? eraAtX(pointer.x) : null;
        if (hoverEra) {
            els.readout.textContent = `${hoverEra.name} · ${Time.span(hoverEra.startYear, hoverEra.endYear)}`;
            positionReadout(els.readout, pointer.x);
            els.readout.hidden = false;
        } else if (hy != null && hy !== pinnedYear) {
            els.readout.textContent = readoutText(hy);
            positionReadout(els.readout, toX(yearMid(hy)));
            els.readout.hidden = false;
        } else els.readout.hidden = true;

        if (pinnedYear != null) {
            const x = toX(yearMid(pinnedYear));
            positionReadout(els.pinReadout, x);
            positionYearPanel(x);
        }

        // Wide enough to hold most of the story, no single era is "current".
        const era = view.span >= DOMAIN * 0.6 ? null : Store.periodAt(yearAt(view.c));
        if (era !== shownEra || !els.eraName.textContent) showEra(era);

        if (kbFocus && cardFor === kbFocus) {
            const hit = hits.find(hh => hh.m === kbFocus && !hh.badge);
            if (hit) positionCard(hit.x0, hit.y1 + 4, true); else hideCard();
        }
    }

    const aliveCache = new Map();
    function aliveCount(y) {
        if (!aliveCache.has(y)) aliveCache.set(y, Store.aliveAt(y).length);
        return aliveCache.get(y);
    }
    function readoutText(y) {
        const n = aliveCount(y);
        return `${Time.year(y)} · ${n ? `${plural(n, 'person', 'people')} alive` : 'no recorded lives'}`;
    }

    // Centred on x and kept inside the stage by the CSS (translate percentages are the
    // readout's own width), so the text just written never has to be measured back.
    function positionReadout(node, x) {
        node.style.setProperty('--x', `${Math.round(x)}px`);
        node.style.setProperty('--stage-w', `${W}px`);
    }

    function positionYearPanel(x) {
        const panel = els.yearPanel;
        if (panel.hidden || G.phone) return;
        const pw = panel.offsetWidth;
        const [, R] = clearBand();
        const left = x + 16 + pw < R - 12 ? x + 16 : x - 16 - pw;
        // `left`, not a transform: the panel's entrance animation owns its transform.
        panel.style.left = `${Math.round(clamp(left, 12, W - pw - 12))}px`;
    }

    function showEra(era) {
        shownEra = era;
        if (!era) {
            els.eraName.textContent = 'The whole story';
            els.eraDates.textContent = Time.span(Time.MIN, Time.MAX);
            els.era.style.setProperty('--era-c', 'var(--gold)');
            els.era.setAttribute('aria-label', 'The whole story. Show all of it');
            return;
        }
        els.eraName.textContent = era.name;
        els.eraDates.textContent = Time.span(era.startYear, era.endYear);
        els.era.style.setProperty('--era-c', era.color);
        els.era.setAttribute('aria-label', `${era.name}, ${Time.span(era.startYear, era.endYear)}. Zoom to this era`);
    }

    // ── Hover card ──────────────────────────────────────────────────────
    function cardContent(m) {
        const ref = m.it.ref;
        const isPerson = m.type === 'person';
        const kindLabel = groupLabel(m.type, m.it.group);
        let length = '';
        if (isPerson) {
            const n = Store.lifespan(ref);
            length = m.estimated ? 'Dates estimated' : n != null ? `Lived ${Time.years(n)}` : '';
        } else if (ref.endYear != null && ref.endYear !== ref.startYear) {
            length = Time.years(Time.between(ref.startYear, ref.endYear));
        }
        return [
            h('p', { class: 'tl-card-kind', style: { '--fam': UI.familyColor(m.it.group) } },
                h('span', { class: 'tl-card-dot', 'aria-hidden': 'true' }),
                kindLabel || (isPerson ? 'Person' : 'Event')),
            h('p', { class: 'tl-card-name' }, m.name),
            h('p', { class: 'tl-card-dates year' }, m.estimated ? 'Dates unknown' : Store.dates(ref),
                length ? h('span', { class: 'tl-card-len' }, ` · ${length}`) : null),
            ref.description ? h('p', { class: 'tl-card-desc' }, firstSentence(ref.description)) : null
        ];
    }

    function showCard(m) {
        if (cardFor !== m) {
            UI.clear(els.card).append(...cardContent(m).filter(Boolean));
            cardFor = m;
        }
        els.card.hidden = false;
    }
    function hideCard() { els.card.hidden = true; cardFor = null; }

    // Near (x, y) without leaving the stage; `below` keeps it under the anchor.
    function positionCard(x, y, below) {
        const cw = els.card.offsetWidth, ch = els.card.offsetHeight;
        let left = x + (below ? 0 : 16), topY = y + (below ? 0 : 18);
        if (left + cw > W - 10) left = below ? W - cw - 10 : x - cw - 16;
        if (topY + ch > H - 10) topY = below ? y - ch - G.laneH - 8 : y - ch - 14;
        els.card.style.transform = `translate3d(${Math.round(clamp(left, 10, W - cw - 10))}px,${Math.round(clamp(topY, G.ribbonH + 6, H - ch - 6))}px,0)`;
    }

    // ── The year line, pinned ───────────────────────────────────────────
    function pinYear(y) {
        pinnedYear = y;
        const alive = Store.aliveAt(y);
        const ageText = p => {
            const age = Store.ageIn(p, y);
            return age === 0 ? 'born' : `age ${age}`;
        };
        UI.clear(els.yearPanel).append(
            h('div', { class: 'tl-yp-head' },
                h('div', {},
                    h('p', { class: 'eyebrow' }, Store.periodAt(y)?.name || ''),
                    h('h2', { class: 'tl-yp-title', id: 'tl-yp-title' }, 'Alive in ', h('span', { class: 'year' }, Time.year(y)))),
                h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: unpinYear }, UI.icon('close'))),
            alive.length
                ? h('ul', { class: 'tl-yp-list', 'aria-labelledby': 'tl-yp-title' },
                    alive.map(p => h('li', {}, UI.chip(p, { sub: ageText(p) }))))
                : h('p', { class: 'tl-yp-empty' }, 'No one on the timeline has recorded dates that span this year.'),
            h('p', { class: 'tl-yp-note' }, 'People with recorded dates, most significant first. ',
                h('a', { href: '#/about' }, 'About the dates')));
        els.yearPanel.hidden = false;
        els.pinReadout.textContent = readoutText(y);
        els.pinReadout.hidden = false;
        els.yearPanel.scrollTop = 0;
        say(`Alive in ${Time.year(y)}: ${plural(alive.length, 'person', 'people')}.`);
        requestRender();
    }

    function unpinYear() {
        if (pinnedYear == null) return;
        pinnedYear = null;
        els.yearPanel.hidden = true;
        els.pinReadout.hidden = true;
        requestRender();
    }

    // ── Pointer, wheel and keyboard ─────────────────────────────────────
    function localPoint(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function hitAt(x, y) {
        if (y < G.ribbonH) return null;
        const pad = gesture?.touch ? 6 : 0;
        for (let i = hits.length - 1; i >= 0; i--) {
            const t = hits[i];
            if (x >= t.x0 - pad && x <= t.x1 + pad && y >= t.y0 && y <= t.y1) return t;
        }
        return null;
    }

    function stopMotion() { flight = null; inertia = null; }

    function onPointerDown(e) {
        if (e.button > 0) return;
        canvas.setPointerCapture(e.pointerId);
        stopMotion();
        const p = localPoint(e);
        touches.set(e.pointerId, p);
        if (touches.size === 2) { startPinch(); return; }
        if (touches.size > 2) return;
        const touch = e.pointerType !== 'mouse';
        gesture = { type: 'press', touch, start: p, last: p, samples: [{ ...p, t: e.timeStamp }] };
        gesture.era = p.y < G.ribbonH ? eraAtX(p.x) : null;
        gesture.hit = hitAt(p.x, p.y);
    }

    function startPinch() {
        const [p1, p2] = [...touches.values()];
        const mid = (p1.x + p2.x) / 2;
        gesture = {
            type: 'pinch', touch: true,
            d0: Math.max(20, Math.hypot(p1.x - p2.x, p1.y - p2.y)),
            span0: view.span, anchor: axisAt(mid)
        };
        hideCard();
    }

    function onPointerMove(e) {
        const p = localPoint(e);
        if (e.pointerType === 'mouse') pointer = p;
        if (touches.has(e.pointerId)) touches.set(e.pointerId, p);

        if (!gesture) { updateHover(p); requestRender(); return; }
        if (gesture.type === 'pinch') {
            if (touches.size < 2) return;
            const [p1, p2] = [...touches.values()];
            const d = Math.max(20, Math.hypot(p1.x - p2.x, p1.y - p2.y));
            const mid = (p1.x + p2.x) / 2;
            const span = clampSpan(gesture.span0 * gesture.d0 / d);
            setView(gesture.anchor - (mid - W / 2) * span / W, span);
            return;
        }
        const moved = Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y);
        if (gesture.type === 'press' && moved > (gesture.touch ? 8 : 4)) {
            gesture.type = 'drag';
            wrap.classList.add('is-dragging');
            hover = null;
            hideCard();
        }
        if (gesture.type === 'drag') {
            const dx = p.x - gesture.last.x, dy = p.y - gesture.last.y;
            scrollY -= dy;
            setView(view.c - dx / scale(), view.span);
            gesture.samples.push({ ...p, t: e.timeStamp });
            while (gesture.samples.length > 2 && e.timeStamp - gesture.samples[0].t > 90) gesture.samples.shift();
        }
        gesture.last = p;
    }

    function onPointerUp(e) {
        touches.delete(e.pointerId);
        if (!gesture) return;
        if (gesture.type === 'pinch') {
            // One finger still down: carry on as a drag from where it is.
            if (touches.size === 1) {
                const p = [...touches.values()][0];
                gesture = { type: 'drag', touch: true, start: p, last: p, samples: [{ ...p, t: e.timeStamp }] };
            } else gesture = null;
            return;
        }
        const g = gesture;
        gesture = null;
        wrap.classList.remove('is-dragging');
        if (e.type === 'pointercancel') return;
        if (g.type === 'press') activate(g);
        else if (g.type === 'drag') fling(g.samples);
        if (e.pointerType === 'mouse') updateHover(localPoint(e));
        requestRender();
    }

    function fling(samples) {
        const a = samples[0], b = samples[samples.length - 1];
        const dt = b.t - a.t;
        if (dt <= 0 || dt > 120 || UI.reducedMotion()) return;
        const v = (b.x - a.x) / dt;                       // px per ms
        if (Math.abs(v) > 0.25) { inertia = { v: clamp(v, -6, 6) }; requestRender(); }
    }

    // A press that did not move: an era, a badge, a mark, or empty time.
    function activate(g) {
        if (g.era) { flyToYears(g.era.startYear, g.era.endYear); return; }
        const hit = g.hit;
        if (hit && hit.badge) { zoomToCluster(hit.m); return; }
        if (hit) { hideCard(); Router.go(UI.href(hit.m.it.ref)); return; }
        const y = yearAt(axisAt(g.start.x));
        if (!inDomain(y)) return;
        if (y === pinnedYear) unpinYear(); else pinYear(y);
    }

    function zoomToCluster(m) {
        const width = m.clusterB - m.clusterA;
        flyView((m.clusterA + m.clusterB) / 2, Math.max(MIN_SPAN * 2, width * 1.8, target().span / 4));
    }

    function updateHover(p) {
        const hit = p.y >= G.ribbonH ? hitAt(p.x, p.y) : null;
        const changed = (hit?.m !== hover?.m) || (!!hit?.badge !== !!hover?.badge);
        hover = hit;
        wrap.classList.toggle('is-over-item', !!hit || p.y < G.ribbonH);
        if (hit && !hit.badge) { showCard(hit.m); positionCard(p.x, p.y, false); } else if (cardFor !== kbFocus || !kbFocus) hideCard();
        if (changed) requestRender();
    }

    function onPointerLeave(e) {
        if (e.pointerType !== 'mouse' || gesture) return;
        pointer = null;
        hover = null;
        wrap.classList.remove('is-over-item');
        if (!kbFocus) hideCard();
        requestRender();
    }

    function onWheel(e) {
        e.preventDefault();
        stopMotion();
        const p = localPoint(e);
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
        const dx = e.deltaX * unit, dy = e.deltaY * unit;
        if (e.ctrlKey) zoomAround(p.x, Math.exp(-dy * 0.01));                 // trackpad pinch
        else if (e.shiftKey) setView(view.c + (dy || dx) / scale(), view.span);
        else if (Math.abs(dx) > Math.abs(dy)) setView(view.c + dx / scale(), view.span);
        else zoomAround(p.x, Math.exp(-dy * 0.0018));
        pointer = p;
    }

    function onKey(e) {
        if (e.target !== canvas || e.metaKey || e.ctrlKey || e.altKey) return;
        switch (e.key) {
            case 'ArrowLeft': panBy(e.shiftKey ? -0.5 : -0.15); break;
            case 'ArrowRight': panBy(e.shiftKey ? 0.5 : 0.15); break;
            case '+': case '=': zoomBy(1.6); break;
            case '-': case '_': zoomBy(1 / 1.6); break;
            case '0': fitAll(true); break;
            case 'Home': flyView(DOMAIN_A + target().span * 0.42, target().span); break;
            case 'End': flyView(DOMAIN_B - target().span * 0.42, target().span); break;
            case 'ArrowDown': walk(1); break;
            case 'ArrowUp': walk(-1); break;
            case 'Enter': case ' ':
                if (kbFocus) Router.go(UI.href(kbFocus.it.ref));
                else if (pinnedYear == null && inDomain(yearAt(view.c))) pinYear(yearAt(view.c));
                else unpinYear();
                break;
            case 'Escape':
                if (kbFocus) setKbFocus(null);
                else if (pinnedYear != null) unpinYear();
                else if (selected) { selected = null; layoutDirty = true; requestRender(); }
                else return;
                break;
            default: return;
        }
        e.preventDefault();
    }

    // Step through the people and events on the timeline in time order,
    // panning to keep the focused one in view.
    function walk(dir) {
        ensureLayout();
        if (!walkOrder.length) return;
        let next;
        if (!kbFocus) {
            const onScreen = walkOrder.filter(m => toX(m.a) >= 0 && toX(m.a) <= W);
            next = dir > 0 ? onScreen[0] : onScreen[onScreen.length - 1];
            next = next || walkOrder.find(m => m.a >= view.c) || walkOrder[walkOrder.length - 1];
        } else {
            const i = walkOrder.indexOf(kbFocus);
            next = walkOrder[clamp(i + dir, 0, walkOrder.length - 1)];
        }
        setKbFocus(next);
    }

    function setKbFocus(m) {
        kbFocus = m;
        if (!m) { hideCard(); requestRender(); return; }
        reveal(m);
        showCard(m);
        say(`${m.name}, ${groupLabel(m.type, m.it.group)}, ${m.estimated ? 'dates estimated' : Store.dates(m.it.ref)}. Press Enter to open.`);
        requestRender();
    }

    // ── Controls and filter ─────────────────────────────────────────────
    function buildControls() {
        const toggle = kind => h('button', {
            class: 'tl-toggle', type: 'button', 'aria-pressed': 'true', dataset: { kind },
            onclick: () => setKind(kind, !kinds[kind])
        }, UI.icon(kind === 'person' ? 'people' : 'event', 'icon-sm'), kind === 'person' ? 'People' : 'Events');

        els.filterBtn = h('button', {
            class: 'tl-toggle tl-filter-btn', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
            onclick: () => (els.filter.hidden ? openFilter() : closeFilter())
        }, UI.icon('filter', 'icon-sm'), h('span', { class: 'tl-filter-label' }, 'Filter'));

        const iconBtn = (icon, label, fn) => h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, title: label, onclick: fn }, UI.icon(icon));
        return h('div', { class: 'tl-controls', role: 'toolbar', 'aria-label': 'Timeline controls' },
            h('div', { class: 'tl-kinds' }, toggle('person'), toggle('event')),
            els.filterBtn,
            h('span', { class: 'tl-sep', 'aria-hidden': 'true' }),
            iconBtn('minus', 'Zoom out', () => zoomBy(1 / 1.8)),
            iconBtn('plus', 'Zoom in', () => zoomBy(1.8)),
            iconBtn('fit', 'Show the whole story', () => fitAll(true)));
    }

    function buildFilter() {
        const fams = new Map();
        for (const m of marks) {
            if (!fams.has(m.fam)) fams.set(m.fam, { n: 0, person: new Set(), event: new Set() });
            const f = fams.get(m.fam);
            f.n++;
            f[m.type].add(m.it.group);
        }
        const rows = [...fams.entries()].sort((a, b) => b[1].n - a[1].n).map(([fam, f]) => {
            const names = [...f.person].map(g => groupLabel('person', g)).concat([...f.event].map(g => groupLabel('event', g)));
            return h('li', {}, h('button', {
                class: 'tl-fam', type: 'button', 'aria-pressed': 'false', dataset: { fam },
                style: { '--fam': `var(--fam-${fam})` },
                onclick: () => toggleFam(fam)
            },
            h('span', { class: 'tl-fam-dot', 'aria-hidden': 'true' }),
            h('span', { class: 'tl-fam-names' }, names.join(' · ')),
            h('span', { class: 'tl-fam-n num' }, String(f.n))));
        });

        const kindToggle = kind => h('button', {
            class: 'tl-toggle', type: 'button', 'aria-pressed': 'true', dataset: { kind },
            onclick: () => setKind(kind, !kinds[kind])
        }, UI.icon(kind === 'person' ? 'people' : 'event', 'icon-sm'), kind === 'person' ? 'People' : 'Events');

        els.filterReset = h('button', { class: 'btn btn-sm btn-quiet', type: 'button', onclick: resetFilter }, 'Show everything');
        els.filter = h('div', { class: 'tl-filter', role: 'dialog', 'aria-label': 'Filter the timeline', hidden: true },
            h('div', { class: 'tl-filter-head' },
                h('p', { class: 'eyebrow' }, 'Highlight'),
                h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close filter', onclick: closeFilter }, UI.icon('close'))),
            h('div', { class: 'tl-filter-kinds' }, kindToggle('person'), kindToggle('event')),
            h('ul', { class: 'tl-fam-list' }, rows),
            h('div', { class: 'tl-filter-foot' },
                h('p', { class: 'tl-filter-hint' }, 'Others stay on the timeline, dimmed.'),
                els.filterReset));
        els.filter.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeFilter(); } });
        return els.filter;
    }

    function openFilter() {
        els.filter.hidden = false;
        els.filterBtn.setAttribute('aria-expanded', 'true');
        releaseFilterFocus = UI.trapFocus(els.filter);
        els.filter.querySelector('.tl-fam')?.focus();
        setTimeout(() => document.addEventListener('pointerdown', outsideFilter), 0);
    }
    function closeFilter() {
        if (els.filter.hidden) return;
        els.filter.hidden = true;
        els.filterBtn.setAttribute('aria-expanded', 'false');
        document.removeEventListener('pointerdown', outsideFilter);
        if (releaseFilterFocus) { releaseFilterFocus(); releaseFilterFocus = null; }
    }
    function outsideFilter(e) {
        if (!els.filter.contains(e.target) && !els.filterBtn.contains(e.target)) closeFilter();
    }

    function toggleFam(fam) {
        if (famFilter.has(fam)) famFilter.delete(fam); else famFilter.add(fam);
        filterChanged();
    }
    function resetFilter() {
        famFilter.clear();
        kinds.person = kinds.event = true;
        measureGeometry();
        filterChanged();
    }
    function filterChanged() {
        for (const b of root.querySelectorAll('.tl-fam')) b.setAttribute('aria-pressed', String(famFilter.has(b.dataset.fam)));
        for (const b of root.querySelectorAll('.tl-toggle[data-kind]')) b.setAttribute('aria-pressed', String(kinds[b.dataset.kind]));
        const n = famFilter.size + (kinds.person && kinds.event ? 0 : 1);
        els.filterBtn.querySelector('.tl-filter-label').textContent = n ? `Filter · ${n}` : 'Filter';
        els.filterBtn.classList.toggle('is-on', n > 0);
        els.filterReset.disabled = n === 0;
        layoutDirty = true;
        announceView();
        requestRender();
    }

    function setKind(kind, on) {
        const other = kind === 'person' ? 'event' : 'person';
        if (!on && !kinds[other]) return;              // keep at least one kind on screen
        kinds[kind] = on;
        if (kbFocus && !kinds[kbFocus.type]) setKbFocus(null);
        measureGeometry();
        filterChanged();
    }

    // ── Announcements and URL ───────────────────────────────────────────
    function say(text) { els.live.textContent = text; }

    const announceView = UI.debounce(() => {
        if (!active || !W) return;
        const a = view.c - view.span / 2, b = view.c + view.span / 2;
        const step = 10 ** Math.max(0, Math.floor(Math.log10(view.span / 8)));
        const round = y => (Math.round(y / step) * step) || (y < 0 ? -1 : 1);
        const ya = round(clamp(yearAt(a), Time.MIN, Time.MAX)), yb = round(clamp(yearAt(b), Time.MIN, Time.MAX));
        let people = 0, events = 0;
        for (const m of marks) {
            if (!m.shown || toX(m.b) < 0 || toX(m.a) > W) continue;
            if (m.type === 'person') people++; else events++;
        }
        const era = Store.periodAt(yearAt(view.c));
        say(`Showing ${rangeText(ya, yb)}, ${era ? `${era.name}, ` : ''}${plural(people, 'person', 'people')} and ${plural(events, 'event', 'events')}.`);
    }, 700);

    const syncUrl = UI.debounce(() => {
        if (!active || !viewTouched || Router.current.view !== 'timeline') return;
        ownPath = Router.build('timeline', [], { y: yearAt(view.c), span: Math.round(view.span) });
        Router.replace(ownPath);
    }, 350);

    // ── First-visit hint ────────────────────────────────────────────────
    // One quiet line on the very first visit; it leaves at the first touch of
    // the timeline or after a few seconds, and is not shown again.
    function offerHint() {
        if (hintOffered) return;
        hintOffered = true;
        try { if (localStorage.getItem(HINT_KEY)) return; } catch { /* storage unavailable: show it anyway */ }
        els.hint.textContent = window.matchMedia('(pointer: coarse)').matches
            ? 'Pinch to zoom · tap a year to see who was alive'
            : 'Scroll to zoom · drag to move · click any year to see who was alive';
        els.hint.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => els.hint.classList.add('is-in')));
        hintTimer = setTimeout(dismissHint, HINT_MS);
    }

    function dismissHint() {
        if (els.hint.hidden || !hintTimer) return;
        clearTimeout(hintTimer);
        hintTimer = 0;
        els.hint.classList.remove('is-in');
        setTimeout(() => { els.hint.hidden = true; }, 600);      // after the fade
        try { localStorage.setItem(HINT_KEY, '1'); } catch { /* storage unavailable */ }
    }

    // ── Public API ──────────────────────────────────────────────────────
    // `inset` is the px of the view something covers (the tour's card):
    // year and span are framed in the part left clear. A top or bottom inset
    // also keeps the lanes out from under it, until a flyTo without one.
    function flyTo({ year, span, duration, inset } = {}) {
        setFrameInset(inset);
        const t = target();
        const L = inset?.left || 0, R = W - (inset?.right || 0);
        const f = framed(year != null ? yearMid(year) : t.c, span ?? t.span * (R - L) / W, L, R);
        flyView(f.c, f.span, duration);
    }

    function setFrameInset(inset) {
        const next = { top: Math.max(0, inset?.top || 0), bottom: Math.max(0, inset?.bottom || 0) };
        if (next.top === frameInset.top && next.bottom === frameInset.bottom) return;
        frameInset = next;
        if (W) measureGeometry();
        requestRender();
    }

    function focus(kind, idOrSlug) {
        const ref = kind === 'person' ? Store.person(idOrSlug) : Store.event(idOrSlug);
        if (ref) select(ref, true);
    }

    function select(ref, bringIntoView) {
        const m = byKey.get(keyOf(ref));
        if (!m) return;
        if (m !== selected) { selected = m; layoutDirty = true; }
        if (!kinds[m.type]) setKind(m.type, true);
        if (!bringIntoView || !W) { requestRender(); return; }
        ensureLayout();
        // Wait a frame so a sheet that is opening has its size.
        requestAnimationFrame(() => { reveal(m); requestRender(); });
    }

    function setSpotlight(keys) {
        spotlight = keys && keys.length ? new Set(keys) : null;
        layoutDirty = true;
        requestRender();
    }

    function getView() {
        const t = target();
        return { year: yearAt(t.c), span: t.span };
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        canvas = h('canvas', {
            class: 'tl-canvas', tabindex: '0', role: 'application', 'aria-roledescription': 'timeline',
            'aria-label': 'Timeline of people and events', 'aria-describedby': 'tl-help'
        });
        mini = h('canvas', { class: 'tl-mini-canvas', 'aria-hidden': 'true', title: 'Drag to move through time; drag the edges to zoom' });
        els.readout = h('div', { class: 'tl-readout year', 'aria-hidden': 'true', hidden: true });
        els.pinReadout = h('div', { class: 'tl-readout tl-readout-pin year', 'aria-hidden': 'true', hidden: true });
        els.card = h('div', { class: 'tl-card', 'aria-hidden': 'true', hidden: true });
        els.yearPanel = h('section', { class: 'tl-yearpanel', 'aria-label': 'Who was alive', hidden: true });
        els.yearPanel.addEventListener('keydown', e => { if (e.key === 'Escape') { unpinYear(); canvas.focus(); } });
        els.eraDates = h('span', { class: 'tl-era-dates eyebrow year' });
        els.eraName = h('span', { class: 'tl-era-name' });
        els.era = h('button', {
            class: 'tl-era', type: 'button',
            onclick: () => (shownEra ? flyToYears(shownEra.startYear, shownEra.endYear) : fitAll(true))
        }, els.eraDates, els.eraName);
        els.live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
        els.hint = h('p', { class: 'tl-hint', hidden: true });
        buildMarks();                                   // the filter lists what the marks contain

        wrap = h('div', { class: 'tl-stage' }, canvas, els.readout, els.pinReadout, els.card, els.yearPanel, els.hint,
            h('div', { id: 'tour-slot' }));
        root.append(h('div', { class: 'tl' },
            wrap,
            h('div', { class: 'tl-foot' }, els.era, h('div', { class: 'tl-mini' }, mini), buildControls()),
            buildFilter(),
            h('p', { class: 'sr-only', id: 'tl-help' },
                'Left and right arrows move through time; plus and minus zoom; 0 shows the whole story. ' +
                'Up and down arrows step through the people and events on screen, and Enter opens one. ' +
                'With nothing focused, Enter lists who was alive in the year at the centre.'),
            els.live));

        ctx = canvas.getContext('2d');
        mctx = mini.getContext('2d');
        resolveTheme();
        measureLabels();

        for (const type of ['pointerdown', 'wheel', 'keydown']) canvas.addEventListener(type, dismissHint);
        mini.addEventListener('pointerdown', dismissHint);
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerLeave);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('keydown', onKey);
        canvas.addEventListener('blur', () => { if (kbFocus) setKbFocus(null); });
        attachMinimap();

        new ResizeObserver(() => { resize(); requestRender(); }).observe(wrap);
        App.on('theme', () => { resolveTheme(); requestRender(); });
        // Canvas text is measured, so measure again once the web fonts arrive.
        document.fonts?.ready.then(() => { measureLabels(); requestRender(); });
    }

    function show(route) {
        active = true;
        if (!W) resize();
        // Closing a sheet comes back to the URL this view left under it: stay put. A link
        // followed from inside the sheet (an era, a year) arrives with a different URL
        // and must be applied like any other.
        const returning = OVERLAY_ROUTES.has(prevRouteView) && hasView && route.path === ownPath;
        if (route.view === 'timeline') setFrameInset(null);          // no tour card any more
        if (route.view === 'timeline' && !returning) applyQuery(route.query);
        if (route.view === 'timeline') {
            ownPath = route.path;
            if (returning) syncUrl();          // a sync skipped while the sheet was open
            offerHint();
        } else if (!hasView) fitAll(false);
        requestRender();
    }

    function applyQuery(q) {
        const first = !hasView;
        const era = q.era ? Store.period(q.era) : null;
        if (era) {
            if (first) fitAll(false);
            flyToYears(era.startYear, era.endYear);
        } else if (q.y != null && q.span != null && Number.isFinite(+q.y) && Number.isFinite(+q.span)) {
            const c = yearMid(+q.y || 1), span = +q.span;
            if (first) setView(c, span, { quiet: true }); else flyView(c, span);
        } else if (first) fitAll(false);
    }

    function hide() {
        active = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0; lastFrame = 0;
        stopMotion();
        gesture = null; touches.clear();
        hover = null; pointer = null;
        hideCard();
        closeFilter();
    }

    App.on('route', route => { prevRouteView = route.view; });
    App.on('focus-item', ({ kind, id }) => {
        const ref = kind === 'person' ? Store.person(id) : Store.event(id);
        if (ref && root) select(ref, App.view === 'timeline');
    });

    App.registerView('timeline', {
        init, show, hide,
        title: route => (route.view === 'story' ? null : 'Timeline')
    });

    return { flyTo, focus, setSpotlight, getView };
})();

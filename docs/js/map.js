// map.js — an atlas of the biblical world: places, what happened there, and
// animated journeys.   #/map   #/map/<journeySlug>[?step=n]   #/map?place=<slug>
//
// Leaflet is vendored and loaded on first use. The base map is Esri's shaded
// relief (terrain and coastlines, no roads or modern labels, no API key),
// restyled per theme in map.css. If tiles cannot load the places and routes
// still render on a plain ground.
const MapView = (() => {
    const { h } = UI;

    const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}';
    const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA';
    const LABEL_FONT_PX = 13.5;
    const TILE_ERRORS_BEFORE_NOTICE = 4;
    const STEP_DWELL_MS = 2600;

    let L = null;
    let map = null;
    let root, canvas, panel, controls, eraStrip, notice, journeysBtn;
    let lastRoute = null;
    let loading = null;

    const pins = new Map();        // location id → pin
    let maxCount = 1;
    let selected = null;           // selected location
    let era = null;                // period filtering the places, or null
    let pickerOpen = null;         // null until first decided (open on desktop, closed on phones)
    let journey = null;            // active journey state, see enterJourney
    let layoutQueued = false;
    let needsHomeFrame = false;    // 'initial' | 'return': frame all places once the panel has its size
    let tileErrors = 0;
    let labelFont = '';

    // ── Small helpers ───────────────────────────────────────────────────
    const hasCoords = loc => loc && loc.lat != null && loc.lng != null;
    const isOverlayOpen = () => !document.getElementById('detail').hidden || !document.getElementById('search').hidden;

    function eventYearLabel(e) {
        return Time.year(e.startYear, { approx: !!e.startApprox });
    }

    // "Genesis 12:1–9" → the reader route for Genesis 12, when the book is one we have.
    function readHref(ref) {
        const parsed = BibleText.parseRef(ref || '');
        if (!parsed) return null;
        const name = parsed.book.toLowerCase().replace(/^psalm$/, 'psalms');
        const book = Store.books.find(b => b.name.toLowerCase() === name);
        return book ? Router.build('read', [book.slug, parsed.startCh]) : null;
    }

    function travellers(j) {
        return j.personIds.map(id => Store.person(id)).filter(Boolean)
            .sort((a, b) => Store.SIG_RANK[a.significance] - Store.SIG_RANK[b.significance]);
    }

    function journeyYears(j) {
        const years = j.stops.map(s => s.year).filter(y => y != null);
        return years.length ? Time.span(Math.min(...years), Math.max(...years)) : '';
    }

    const closeBtn = (label, onclick) =>
        h('button', { class: 'icon-btn map-close', type: 'button', 'aria-label': label, onclick }, UI.icon('close'));

    // ── Loading Leaflet ─────────────────────────────────────────────────
    function ensureLeaflet() {
        if (!loading) {
            loading = Promise.all([
                UI.loadStyle('vendor/leaflet/leaflet.css'),
                UI.loadScript('vendor/leaflet/leaflet.js')
            ]).then(() => { L = window.L; });
        }
        return loading;
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        canvas = h('div', { class: 'map-canvas', role: 'application', 'aria-label': 'Map of the biblical world' });
        panel = h('aside', { class: 'map-panel', hidden: true });
        eraStrip = h('div', { class: 'map-eras', role: 'group', 'aria-label': 'Show places by era' });
        notice = h('p', { class: 'map-notice', role: 'status', hidden: true },
            'Map imagery could not load. Places and routes are still shown.');
        journeysBtn = h('button', {
            class: 'btn map-journeys-btn', type: 'button',
            onclick: () => { pickerOpen = true; renderPanel(); }
        }, UI.icon('map', 'icon-sm'), 'Journeys');
        controls = buildControls();
        root = h('div', { class: 'map-root' }, canvas, eraStrip, journeysBtn, controls, panel, notice);
        el.append(root);
        App.on('theme', () => scheduleLayout());
        // A sheet opened over the map leaves the view in place (no hide()), so a playing
        // journey would keep travelling unseen behind it. Stop where it is instead.
        App.on('route', route => { if (route.view !== 'map') pause(); });
    }

    function show(route) {
        lastRoute = route;
        document.addEventListener('keydown', onKey);
        ensureLeaflet().then(() => {
            // A newer route took over while loading, or the map was left (hide() clears
            // lastRoute): building now would size Leaflet to a hidden, 0×0 section.
            if (lastRoute !== route || App.view !== 'map') return;
            if (!map) createMap();
            map.invalidateSize();
            apply(route);
        }).catch(() => {
            panel.hidden = false;
            UI.clear(panel).append(h('div', { class: 'map-card' },
                h('p', { class: 'eyebrow' }, 'Map'),
                h('h2', null, 'The map could not load'),
                h('p', { class: 'dim' }, 'Check your connection and try again.')));
        });
    }

    function hide() {
        lastRoute = null;
        document.removeEventListener('keydown', onKey);
        if (journey) pause();
    }

    function title(route) {
        const j = Store.journey(route.parts[0]);
        if (j) return j.name;
        const loc = Store.location(route.query.place);
        return loc ? loc.name : 'Map of the biblical world';
    }

    // ── The map ─────────────────────────────────────────────────────────
    function createMap() {
        labelFont = `${LABEL_FONT_PX}px ${getComputedStyle(document.body).getPropertyValue('--font-display') || 'serif'}`;
        map = L.map(canvas, {
            zoomControl: false, minZoom: 3, maxZoom: 12, zoomSnap: 0.25, zoomDelta: 1,
            maxBounds: [[-75, -190], [82, 190]], maxBoundsViscosity: 0.9, worldCopyJump: false
        });
        map.attributionControl.setPrefix(false);
        const tiles = L.tileLayer(TILES, {
            maxNativeZoom: 13, attribution: ATTRIBUTION, className: 'map-tiles', crossOrigin: true
        }).addTo(map);
        tiles.on('tileload', () => { tileErrors = 0; notice.hidden = true; root.classList.remove('is-offline'); });
        tiles.on('tileerror', () => {
            if (++tileErrors >= TILE_ERRORS_BEFORE_NOTICE) { notice.hidden = false; root.classList.add('is-offline'); }
        });
        map.on('zoomend moveend', scheduleLayout);
        // Playback moves the camera; a reader who grabs the map takes it back.
        map.on('dragstart', () => { if (journey && journey.playing) pause(); });
        map.on('click', () => { if (selected && !journey) Router.go('#/map'); });

        map.fitBounds(homeBounds(), { animate: false });   // markers need a view before they render
        buildPins();
        buildEras();
        needsHomeFrame = 'initial';
    }

    // Frame the lands where most places are: the nearest 70% of places to the
    // median position, so a few far-flung ones (Wittenberg, Azusa Street)
    // do not push the Levant into a corner.
    function homeBounds() {
        const spots = Store.locations.filter(hasCoords);
        const median = key => spots.map(l => l[key]).sort((a, b) => a - b)[spots.length >> 1];
        const mLat = median('lat'), mLng = median('lng');
        const near = spots.sort((a, b) => dist(a) - dist(b)).slice(0, Math.ceil(spots.length * 0.7));
        function dist(l) { return Math.hypot(l.lat - mLat, (l.lng - mLng) * Math.cos(mLat * Math.PI / 180)); }
        return L.latLngBounds(near.map(l => [l.lat, l.lng])).pad(0.08);
    }

    function insets() {
        const size = map.getSize();
        const showing = !panel.hidden;
        if (UI.isMobile()) {
            const bottom = showing ? panel.offsetHeight + 28 : 24;
            return { tl: [16, 64], br: [16, Math.min(bottom, size.y * 0.55)] };
        }
        return { tl: [showing ? panel.offsetWidth + 40 : 40, 72], br: [72, 40] };
    }

    function frame(latlngs, { animate = true, maxZoom = 9 } = {}) {
        if (latlngs.length === 1) { centerOn(latlngs[0], Math.min(maxZoom, 7), animate); return; }
        const { tl, br } = insets();
        const opts = { paddingTopLeft: tl, paddingBottomRight: br, maxZoom };
        const bounds = L.latLngBounds(latlngs);
        if (animate && !UI.reducedMotion()) map.flyToBounds(bounds, { ...opts, duration: 1.1 });
        else map.fitBounds(bounds, { ...opts, animate: false });
    }

    // The map centre that puts a point in the middle of the part of the map the panel leaves free.
    function centreFor(latlng, zoom) {
        const { tl, br } = insets();
        const p = map.project(latlng, zoom).subtract([(tl[0] - br[0]) / 2, (tl[1] - br[1]) / 2]);
        return map.unproject(p, zoom);
    }

    function centerOn(latlng, zoom, animate = true, duration = 0.9) {
        const target = centreFor(latlng, zoom);
        if (animate && !UI.reducedMotion()) map.flyTo(target, zoom, { duration });
        else map.setView(target, zoom, { animate: false });
    }

    // ── Controls ────────────────────────────────────────────────────────
    function buildControls() {
        const btn = (icon, label, onclick) =>
            h('button', { class: 'map-ctl', type: 'button', 'aria-label': label, onclick }, UI.icon(icon));
        return h('div', { class: 'map-controls' },
            btn('plus', 'Zoom in', () => map && map.zoomIn()),
            btn('minus', 'Zoom out', () => map && map.zoomOut()),
            btn('fit', 'Reset the view', () => map && resetView()));
    }

    function resetView() {
        if (journey) frame(journey.points);
        else if (selected && hasCoords(selected)) frame([[selected.lat, selected.lng]]);
        else { const b = homeBounds(); frame([b.getSouthWest(), b.getNorthEast()]); }
    }

    // ── Place pins ──────────────────────────────────────────────────────
    function buildPins() {
        const placed = Store.locations.filter(hasCoords)
            .map(loc => ({ loc, count: Store.eventsAt(loc).length }))
            .sort((a, b) => b.count - a.count || a.loc.name.localeCompare(b.loc.name));
        maxCount = Math.max(1, ...placed.map(p => p.count));

        // Places that share a coordinate (a region and its capital) would sit
        // exactly on top of each other: the less important one is nudged aside.
        const taken = new Map();
        for (const { loc, count } of placed) {
            const key = `${loc.lat},${loc.lng}`;
            const n = taken.get(key) || 0;
            taken.set(key, n + 1);
            const latlng = [loc.lat + n * 0.28, loc.lng - n * 0.28];
            const size = Math.round(9 + 11 * Math.sqrt(count / maxCount));
            const dot = h('span', { class: 'map-pin-dot', style: { width: `${size}px`, height: `${size}px` } });
            const label = h('span', { class: 'map-pin-label' }, loc.name);
            const el = h('div', { class: 'map-pin' }, dot, label);
            el.style.setProperty('--r', `${size / 2}px`);
            el.style.setProperty('--glow', String(0.25 + 0.75 * Math.sqrt(count / maxCount)));
            const marker = L.marker(latlng, {
                icon: L.divIcon({ className: 'map-pin-wrap', html: el, iconSize: [44, 44], iconAnchor: [22, 22] }),
                zIndexOffset: count * 10, riseOnHover: true, keyboard: false   // focus is managed below
            }).addTo(map);
            const node = marker.getElement();
            node.setAttribute('role', 'button');
            node.setAttribute('aria-label', `${loc.name}, ${count} ${count === 1 ? 'event' : 'events'}`);
            node.tabIndex = -1;
            marker.on('click', () => Router.go(UI.href(loc)));
            const pin = { loc, marker, node, el, count, size, latlng, labelWidth: textWidth(loc.name), side: null, dim: false, hidden: false };
            node.addEventListener('keydown', e => onPinKey(e, pin));
            node.addEventListener('focus', () => setTabStop(pin));
            pins.set(loc.id, pin);
        }
        setTabStop(pins.values().next().value);   // the busiest place
    }

    // ── Keyboard over the pins ──────────────────────────────────────────
    // Ninety places would be ninety Tab stops. The pins are one stop instead (a roving
    // tabindex): Tab lands on one, the arrow keys move to the nearest pin that way.
    let tabStop = null;

    function setTabStop(pin) {
        if (!pin || pin === tabStop) return;
        if (tabStop) tabStop.node.tabIndex = -1;
        tabStop = pin;
        pin.node.tabIndex = 0;
    }

    const ARROWS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };

    function onPinKey(e, pin) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();          // Space must not also play a journey
            Router.go(UI.href(pin.loc));
            return;
        }
        const dir = ARROWS[e.key];
        if (!dir) return;
        e.preventDefault();
        e.stopPropagation();              // nor step one
        const next = nearestPin(pin, dir);
        if (next) next.node.focus();      // Leaflet pans a focused marker into view
    }

    // The closest visible pin in the pressed direction, preferring ones straight ahead
    // over ones off to the side.
    function nearestPin(from, [dx, dy]) {
        const at = map.latLngToLayerPoint(from.latlng);
        let best = null, bestScore = Infinity;
        for (const p of pins.values()) {
            if (p === from || p.hidden) continue;
            const pt = map.latLngToLayerPoint(p.latlng);
            const ahead = (pt.x - at.x) * dx + (pt.y - at.y) * dy;
            if (ahead <= 0) continue;
            const aside = Math.abs((pt.x - at.x) * dy - (pt.y - at.y) * dx);
            const score = ahead + aside * 2;
            if (score < bestScore) { bestScore = score; best = p; }
        }
        return best;
    }

    function textWidth(text) {
        const ctx = textWidth.ctx || (textWidth.ctx = document.createElement('canvas').getContext('2d'));
        ctx.font = labelFont;
        return Math.ceil(ctx.measureText(text).width) + 8;
    }

    // Labels appear by importance as you zoom: busiest places claim space
    // first and a label that would collide with a dot or another label waits.
    function scheduleLayout() {
        if (layoutQueued || !map) return;
        layoutQueued = true;
        requestAnimationFrame(() => { layoutQueued = false; layoutLabels(); });
    }

    function layoutLabels() {
        const size = map.getSize();
        const inView = p => {
            const pt = map.latLngToContainerPoint(p.latlng);
            p.pt = pt;
            return !p.hidden && pt.x > -60 && pt.y > -20 && pt.x < size.x + 60 && pt.y < size.y + 20;
        };
        const visible = [...pins.values()].filter(inView);
        const taken = visible.map(p => ({ x: p.pt.x - p.size / 2 - 3, y: p.pt.y - p.size / 2 - 3, w: p.size + 6, hgt: p.size + 6 }));
        const priority = visible.slice().sort((a, b) =>
            (b.loc === selected) - (a.loc === selected) || (a.dim - b.dim) || b.count - a.count);
        for (const p of priority) {
            let side = null;
            const wanted = p.loc === selected || !p.dim;
            for (const s of wanted ? ['right', 'left'] : []) {
                const rect = labelRect(p, s);
                const inside = rect.x >= 4 && rect.x + rect.w <= size.x - 4;
                if (p.loc === selected || (inside && !taken.some(r => overlaps(r, rect)))) { side = s; taken.push(rect); break; }
            }
            if (side !== p.side) {
                p.side = side;
                p.el.dataset.label = side || '';
            }
        }
        for (const p of pins.values()) if (!visible.includes(p) && p.side) { p.side = null; p.el.dataset.label = ''; }
    }

    function labelRect(p, side) {
        const w = p.labelWidth, gap = p.size / 2 + 3;
        return { x: side === 'right' ? p.pt.x + gap : p.pt.x - gap - w, y: p.pt.y - 10, w, hgt: 20 };
    }
    const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.hgt && b.y < a.y + a.hgt;

    function setPinState() {
        for (const p of pins.values()) {
            const inJourney = !!journey && journey.locationIds.has(p.loc.id);
            p.hidden = inJourney;
            p.dim = !!journey || (era != null && !eventsInEra(p.loc, era));
            p.el.classList.toggle('is-selected', p.loc === selected);
            p.el.classList.toggle('is-dim', p.dim && p.loc !== selected);
            p.el.classList.toggle('is-hidden', p.hidden);
        }
        // A journey hides the pins it passes through; the Tab stop must not be one of them.
        if (tabStop && tabStop.hidden) setTabStop([...pins.values()].find(p => !p.hidden));
        scheduleLayout();
    }

    function eventsInEra(loc, period) {
        return Store.eventsAt(loc).some(e => e.span.end >= period.startYear && e.span.start < period.endYear);
    }

    // ── Era filter ──────────────────────────────────────────────────────
    function buildEras() {
        const chip = (period) => {
            const on = era === period;
            return h('button', {
                class: `chip map-era${on ? ' is-on' : ''}`, type: 'button', 'aria-pressed': String(on),
                style: period ? { '--era': period.color } : null,
                onclick: () => { era = on ? null : period; buildEras(); setPinState(); }
            }, period ? h('span', { class: 'map-era-dot', 'aria-hidden': 'true' }) : null, period ? period.name : 'All eras');
        };
        UI.clear(eraStrip).append(chip(null), ...Store.periods.map(chip));
    }

    // ── Route → state ───────────────────────────────────────────────────
    function apply(route) {
        const j = Store.journey(route.parts[0]);
        if (route.parts[0] && !j) Router.replace('#/map');

        if (j) {
            const step = Math.max(0, Math.min(j.stops.length - 1, (parseInt(route.query.step, 10) || 1) - 1));
            if (journey && journey.j === j) goStep(step, { replaceUrl: false });
            else enterJourney(j, step);
            return;
        }
        if (journey) { leaveJourney(); needsHomeFrame = 'return'; }
        selected = Store.location(route.query.place) || null;
        setPinState();
        renderPanel();
        if (selected && hasCoords(selected)) centerOn([selected.lat, selected.lng], Math.max(map.getZoom(), 7));
        else if (needsHomeFrame) { const b = homeBounds(); frame([b.getSouthWest(), b.getNorthEast()], { animate: needsHomeFrame === 'return' }); }
        needsHomeFrame = false;
    }

    function renderPanel() {
        if (journey) { renderJourney(); return; }
        if (pickerOpen == null) pickerOpen = !UI.isMobile();
        panel.hidden = !(selected || pickerOpen);
        root.dataset.mode = selected ? 'place' : pickerOpen ? 'picker' : 'places';
        journeysBtn.hidden = !!selected || pickerOpen || !!journey;
        eraStrip.hidden = !!journey;
        UI.clear(panel);
        if (selected) panel.append(placeCard(selected));
        else if (pickerOpen) panel.append(picker());
    }

    // ── Picker ──────────────────────────────────────────────────────────
    function picker() {
        // In story order: by each journey's earliest stop.
        const first = j => Math.min(...j.stops.map(s => s.year ?? Infinity));
        const cards = Store.journeys.slice().sort((a, b) => first(a) - first(b) || a.id - b.id).map(j => {
            const people = travellers(j);
            const names = people.slice(0, 3).map(p => p.name).join(', ');
            const more = people.length > 3 ? ` and ${people.length - 3} more` : '';
            return h('a', { class: 'card map-journey', href: UI.href(j) },
                h('h3', { class: 'display' }, j.name),
                h('p', { class: 'dim map-journey-desc' }, j.description),
                h('p', { class: 'map-journey-meta' },
                    h('span', null, `${j.stops.length} stops`),
                    journeyYears(j) ? h('span', { class: 'year' }, journeyYears(j)) : null),
                names ? h('p', { class: 'faint map-journey-who' }, `${names}${more}`) : null);
        });
        return h('div', { class: 'map-card' },
            h('header', { class: 'map-card-head' },
                h('div', null,
                    h('p', { class: 'eyebrow' }, 'Journeys'),
                    h('h2', null, 'Follow the ', h('em', null, 'road'))),
                closeBtn('Close the journey list', () => { pickerOpen = false; renderPanel(); })),
            h('p', { class: 'dim map-lede' }, 'Choose a journey and watch the route unfold, stop by stop, with the passage beside it.'),
            h('div', { class: 'map-journey-list' }, cards));
    }

    // ── Place card ──────────────────────────────────────────────────────
    function placeCard(loc) {
        const events = Store.eventsAt(loc).slice()
            .sort((a, b) => (a.startYear ?? 1e9) - (b.startYear ?? 1e9));
        const through = Store.journeys.filter(j => j.stops.some(s => s.locationId === loc.id));
        const modern = loc.modernName && loc.modernName !== loc.name ? `Today: ${loc.modernName}` : null;

        return h('div', { class: 'map-card' },
            h('header', { class: 'map-card-head' },
                h('div', null,
                    loc.region ? h('p', { class: 'eyebrow' }, loc.region) : null,
                    h('h2', null, loc.name),
                    modern ? h('p', { class: 'dim map-modern' }, modern) : null),
                closeBtn('Close the place', () => Router.go('#/map'))),
            loc.description ? h('p', { class: 'map-desc' }, loc.description) : null,
            hasCoords(loc) ? null : h('p', { class: 'faint map-aside' }, 'Scripture gives no fixed location for this place, so it is not marked on the map.'),
            h('div', { class: 'ornament', 'aria-hidden': 'true' }, h('span')),
            h('section', { 'aria-label': 'Events here' },
                h('h3', { class: 'eyebrow map-sub' }, events.length ? 'Happened here' : 'Events'),
                events.length
                    ? h('ul', { class: 'map-events' }, events.map(e =>
                        h('li', null, h('a', { class: 'map-event', href: UI.href(e), style: { '--chip': UI.familyColor(e.category) } },
                            h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
                            h('span', { class: 'map-event-name' }, e.name),
                            h('span', { class: 'year faint map-event-year' }, eventYearLabel(e))))))
                    : h('p', { class: 'dim' }, 'No recorded events are tied to this place yet.')),
            through.length ? h('section', { 'aria-label': 'Journeys through here' },
                h('h3', { class: 'eyebrow map-sub' }, 'Journeys that pass through'),
                h('div', { class: 'chip-row' }, through.map(j =>
                    h('a', { class: 'chip', href: UI.href(j) }, UI.icon('map', 'icon-sm'), j.name)))) : null,
            h('a', { class: 'btn map-place-link', href: Router.build('place', [loc.slug]) }, `Open the page for ${loc.name}`));
    }

    // ── Journeys ────────────────────────────────────────────────────────
    function enterJourney(j, step) {
        if (journey) leaveJourney();
        selected = null;
        const nodes = j.stops.map(s => {
            const loc = Store.location(s.locationId);
            return { stop: s, loc, latlng: hasCoords(loc) ? [loc.lat, loc.lng] : null };
        });
        journey = {
            j, nodes, step: -1, playing: false, timer: 0, raf: 0,
            locationIds: new Set(nodes.filter(n => n.latlng).map(n => n.loc.id)),
            points: nodes.filter(n => n.latlng).map(n => n.latlng),
            legs: [], waypoints: [], layer: L.layerGroup().addTo(map), refs: {}
        };
        buildRoute();
        setPinState();
        buildStepper();
        renderJourney();
        panel.hidden = false;
        root.dataset.mode = 'journey';
        journeysBtn.hidden = true;
        eraStrip.hidden = true;
        goStep(step, { pan: false });      // fill the stepper first: its height sets the map's free area
        const spots = journey.points.length ? journey.points : [map.getCenter()];
        const { tl, br } = insets();
        journey.fitZoom = Math.min(9, map.getBoundsZoom(L.latLngBounds(spots), false, L.point(tl[0] + br[0], tl[1] + br[1])));
        if (step > 0 && journey.nodes[step].latlng) {
            centerOn(journey.nodes[step].latlng, Math.max(journey.fitZoom, 4), false);   // deep link: start where the stop is
        } else {
            frame(spots);
        }
    }

    function leaveJourney() {
        pause();
        journey.layer.remove();
        journey = null;
        setPinState();
    }

    // Curve a leg gently: a quadratic Bézier bowed to one side, sampled finely.
    function curve(a, b) {
        const k = Math.cos(((a[0] + b[0]) / 2) * Math.PI / 180);
        const dx = (b[1] - a[1]) * k, dy = b[0] - a[0];
        const bow = 0.16;
        const c = [(a[0] + b[0]) / 2 + dx * bow, (a[1] + b[1]) / 2 - (dy * bow) / k];
        const out = [];
        for (let i = 0; i <= 36; i++) {
            const t = i / 36, u = 1 - t;
            out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
        }
        return out;
    }

    function buildRoute() {
        const { nodes } = journey;
        let prev = null;
        nodes.forEach((n, i) => {
            const moved = n.latlng && prev && (prev[0] !== n.latlng[0] || prev[1] !== n.latlng[1]);
            journey.legs[i] = moved ? curve(prev, n.latlng) : [];
            if (n.latlng) prev = n.latlng;
        });
        journey.ahead = L.polyline(journey.legs.flat(), { className: 'map-route-ahead', interactive: false }).addTo(journey.layer);
        journey.done = L.polyline([], { className: 'map-route-done', interactive: false }).addTo(journey.layer);

        // One numbered waypoint per run of stops in the same place; a return
        // to an earlier place is fanned out so its badge does not hide the first.
        const seen = new Map();
        let last = null;
        nodes.forEach((n, i) => {
            if (!n.latlng) return;
            if (last && last.locId === n.loc.id) { last.to = i; return; }
            const visit = seen.get(n.loc.id) || 0;
            seen.set(n.loc.id, visit + 1);
            last = { locId: n.loc.id, from: i, to: i, visit, latlng: n.latlng };
            journey.waypoints.push(last);
        });
        for (const wp of journey.waypoints) addWaypoint(wp);
    }

    function addWaypoint(wp) {
        const text = wp.to > wp.from ? `${wp.from + 1}–${wp.to + 1}` : String(wp.from + 1);
        const place = journey.nodes[wp.from].loc.name;
        const name = h('span', { class: 'map-wp-name' }, place);
        const badge = h('span', { class: 'map-wp-badge' }, text);
        const el = h('div', { class: 'map-wp' }, badge, name);
        const angle = (wp.visit * 2.4) - 0.6, r = wp.visit ? 20 : 0;
        const dx = Math.round(Math.cos(angle) * r), dy = Math.round(Math.sin(angle) * r);
        wp.marker = L.marker(wp.latlng, {
            icon: L.divIcon({ className: 'map-wp-wrap', html: el, iconSize: [44, 44], iconAnchor: [22 - dx, 22 - dy] }),
            keyboard: true, riseOnHover: true
        }).addTo(journey.layer);
        wp.el = el;
        const node = wp.marker.getElement();
        node.setAttribute('role', 'button');
        node.setAttribute('aria-label', `Stop ${text}: ${journey.nodes[wp.from].stop.label}`);
        wp.marker.on('click', () => { pause(); goStep(wp.from, { pan: true }); });
    }

    // The stepper is built once per journey; goStep only updates what changed.
    function buildStepper() {
        const { j, nodes } = journey;
        const r = journey.refs;
        r.count = h('p', { class: 'eyebrow map-step-count' });
        r.year = h('p', { class: 'year map-step-year' });
        r.title = h('h2', { class: 'map-step-title' });
        r.place = h('p', { class: 'dim map-step-place' });
        r.desc = h('p', { class: 'map-step-desc' });
        r.links = h('div', { class: 'chip-row map-step-links' });
        r.range = h('input', {
            class: 'map-range', type: 'range', min: '1', max: String(nodes.length), step: '1', value: '1',
            'aria-label': 'Stop in this journey',
            oninput: e => { pause(); goStep(Number(e.target.value) - 1, { pan: true }); }
        });
        r.prev = h('button', { class: 'icon-btn map-nav', type: 'button', 'aria-label': 'Previous stop', onclick: () => { pause(); goStep(journey.step - 1, { pan: true }); } }, UI.icon('chevron-left'));
        r.next = h('button', { class: 'icon-btn map-nav', type: 'button', 'aria-label': 'Next stop', onclick: () => { pause(); goStep(journey.step + 1, { pan: true }); } }, UI.icon('chevron-right'));
        r.play = h('button', { class: 'btn btn-primary map-play', type: 'button', onclick: togglePlay });
        r.travellers = travellers(j).slice(0, 4).map(p => p.name).join(', ');

        r.card = h('div', { class: 'map-card map-stepper' },
            h('header', { class: 'map-card-head' },
                h('div', null,
                    h('p', { class: 'eyebrow' }, 'Journey'),
                    h('p', { class: 'map-journey-name display' }, j.name)),
                closeBtn('Leave the journey', () => Router.go('#/map'))),
            h('div', { class: 'map-step-body', 'aria-live': 'polite' },
                r.count, r.title, h('p', { class: 'map-step-meta' }, r.year, r.place), r.desc, r.links),
            h('div', { class: 'map-step-controls' },
                r.prev, r.range, r.next, r.play),
            h('p', { class: 'faint map-hint' }, h('kbd', null, '←'), ' ', h('kbd', null, '→'), ' step   ', h('kbd', null, 'Space'), ' play'));
        refreshPlayButton();
    }

    function renderJourney() {
        UI.clear(panel).append(journey.refs.card);
    }

    function refreshPlayButton() {
        const r = journey.refs;
        UI.clear(r.play).append(UI.icon(journey.playing ? 'pause' : 'play', 'icon-sm'), journey.playing ? 'Pause' : 'Play');
        r.play.setAttribute('aria-label', journey.playing ? 'Pause the journey' : 'Play the journey');
    }

    function fillStep(i) {
        const { nodes, refs: r } = journey;
        const { stop, loc } = nodes[i];
        r.count.textContent = `Stop ${i + 1} of ${nodes.length}`;
        r.title.textContent = stop.label;
        r.year.textContent = stop.year != null ? Time.year(stop.year) : '';
        r.place.textContent = loc ? [loc.name, loc.region].filter(Boolean).join(' · ') : '';
        r.desc.textContent = stop.description || '';
        r.range.value = String(i + 1);
        r.range.setAttribute('aria-valuetext', `Stop ${i + 1} of ${nodes.length}: ${stop.label}`);
        r.prev.disabled = i === 0;
        r.next.disabled = i === nodes.length - 1;

        UI.clear(r.links);
        const href = readHref(stop.chapter);
        if (stop.chapter) {
            r.links.append(href
                ? h('a', { class: 'chip', href }, UI.icon('book', 'icon-sm'), stop.chapter)
                : h('span', { class: 'chip' }, UI.icon('book', 'icon-sm'), stop.chapter));
        }
        const event = stop.eventId != null ? Store.event(stop.eventId) : null;
        if (event) r.links.append(UI.chip(event, { sub: eventYearLabel(event) }));
        if (loc && !hasCoords(loc)) {
            r.links.append(h('span', { class: 'faint map-aside' }, 'This place has no fixed location on the map.'));
        }
    }

    function paintRoute(step, partial = 0) {
        const done = [];
        for (let i = 1; i <= step; i++) done.push(...journey.legs[i]);
        const next = journey.legs[step + 1];
        if (partial > 0 && next && next.length) done.push(...next.slice(0, Math.max(2, Math.round(next.length * partial))));
        journey.done.setLatLngs(done);
        const active = journey.waypoints.findIndex(w => step >= w.from && step <= w.to);
        journey.waypoints.forEach((wp, k) => {
            wp.el.classList.toggle('is-active', k === active);
            wp.el.classList.toggle('is-done', k < active);
            wp.marker.setZIndexOffset(k === active ? 1000 : k * 5);
        });
    }

    function goStep(i, { pan = true, replaceUrl = true } = {}) {
        if (!journey) return;
        const last = journey.nodes.length - 1;
        i = Math.max(0, Math.min(last, i));
        const changed = i !== journey.step;
        journey.step = i;
        fillStep(i);
        paintRoute(i);
        // Only while the map owns the URL: under an open sheet this would replace the sheet's entry.
        if (replaceUrl && Router.current.view === 'map') Router.replace(Router.build('map', [journey.j.slug], i ? { step: i + 1 } : {}));
        if (pan && changed) panToStep(i);
    }

    function panToStep(i) {
        const n = journey.nodes[i];
        if (!n.latlng) return;
        centerOn(n.latlng, Math.max(map.getZoom(), journey.fitZoom), true, 0.9);
    }

    // ── Playing ─────────────────────────────────────────────────────────
    function togglePlay() { if (journey.playing) pause(); else play(); }

    function play() {
        if (journey.step >= journey.nodes.length - 1) goStep(0, { pan: true });
        journey.playing = true;
        refreshPlayButton();
        Analytics.event('journey_play', { journey: journey.j.slug });
        journey.timer = setTimeout(advance, journey.step === 0 ? 700 : STEP_DWELL_MS);
    }

    function pause() {
        if (!journey) return;
        clearTimeout(journey.timer);
        cancelAnimationFrame(journey.raf);
        journey.leg = (journey.leg || 0) + 1;       // a leg waiting on its zoom must not start later
        if (!journey.playing) return;
        journey.playing = false;
        paintRoute(journey.step);
        refreshPlayButton();
    }

    // Travel to the next stop: the line draws while the map eases along it,
    // then the stepper catches up on arrival and we dwell on the stop.
    //
    // The camera is moved by raw pans, one per frame, in step with the line — never by a
    // flyTo running alongside it. During a flyTo Leaflet scales the old drawing of the
    // route layer and only re-projects it when the move ends, so a line redrawn mid-flight
    // lands in the wrong place and drifts back. A raw pan keeps line and map in one frame.
    function advance() {
        const next = journey.step + 1;
        if (next >= journey.nodes.length) { pause(); return; }
        const leg = journey.legs[next];
        const target = journey.nodes[next].latlng;
        const finish = () => {
            if (!journey || !journey.playing) return;
            goStep(next, { pan: false });
            journey.timer = setTimeout(advance, STEP_DWELL_MS);
        };
        if (!target || UI.reducedMotion()) {
            goStep(next, { pan: true });
            journey.timer = setTimeout(advance, STEP_DWELL_MS);
            return;
        }

        const token = journey.leg = (journey.leg || 0) + 1;
        const travel = () => {
            if (!journey || !journey.playing || journey.leg !== token) return;
            const duration = leg.length ? Math.min(3200, 1300 + legSpan(leg) * 55) : 600;
            const zoom = map.getZoom();
            const from = map.project(map.getCenter(), zoom);
            const to = map.project(centreFor(target, zoom), zoom);
            const start = performance.now();
            const tick = now => {
                if (!journey || !journey.playing) return;
                const t = Math.min(1, (now - start) / duration);
                const e = t * t * (3 - 2 * t);
                const want = from.add(to.subtract(from).multiplyBy(e));
                const delta = want.subtract(map.project(map.getCenter(), zoom)).round();
                if (delta.x || delta.y) map.panBy(delta, { animate: false });
                paintRoute(journey.step, e);
                if (t < 1) journey.raf = requestAnimationFrame(tick); else finish();
            };
            journey.raf = requestAnimationFrame(tick);
        };

        // Settle the zoom first (an ordinary animated zoom with no line drawing), then travel.
        const zoom = Math.max(map.getZoom(), journey.fitZoom);
        if (zoom !== map.getZoom()) {
            map.once('moveend', travel);
            map.setView(centreFor(journey.nodes[journey.step].latlng || target, zoom), zoom, { animate: true });
        } else {
            travel();
        }
    }

    // Rough size of a leg in degrees, so long voyages take longer than short walks.
    function legSpan(leg) {
        const a = leg[0], b = leg[leg.length - 1];
        return Math.hypot(a[0] - b[0], a[1] - b[1]);
    }

    // ── Keyboard ────────────────────────────────────────────────────────
    function onKey(e) {
        if (e.metaKey || e.ctrlKey || e.altKey || isOverlayOpen()) return;
        const tag = e.target.tagName;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && e.target.type !== 'range') return;
        if (e.key === 'Escape') {
            if (journey || selected) { Router.go('#/map'); }
            return;
        }
        if (!journey) return;
        if (e.key === ' ' && !/^(BUTTON|A)$/.test(tag)) { e.preventDefault(); togglePlay(); }
        else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.type !== 'range') {
            e.preventDefault();
            pause();
            goStep(journey.step + (e.key === 'ArrowRight' ? 1 : -1), { pan: true });
        }
    }

    App.registerView('map', { init, show, hide, title });
    return {};
})();

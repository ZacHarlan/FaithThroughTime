// place.js — one place in full: what happened there, who was involved, the journeys that
// pass through it, and every verse that names it.
//
//   #/place            an A–Z index of places, by region
//   #/place/<slug>     one place (the slug of a Store location)
//
// The verse list is bibles/places/<slug>.json ({ count, refs }); a place with no file
// (a road, a sea crossing, a city from church history) simply has no "In Scripture"
// section. A small locator map loads Leaflet on first use, the same way map.js does.
const Place = (() => {
    const { h, icon } = UI;
    const PAGE = 30;               // verses shown at first, and per "Show more"
    const PEOPLE_LIMIT = 24;
    const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}';

    let root, token = 0, locator = null, leaflet = null;

    const hasCoords = loc => loc && loc.lat != null && loc.lng != null;
    const yearLabel = e => Time.year(e.startYear, { approx: !!e.startApprox });
    const byName = (a, b) => a.name.localeCompare(b.name);
    const hrefOf = loc => Router.build('place', [loc.slug]);
    const mapHref = loc => Router.build('map', [], { place: loc.slug });
    const modernOf = loc => (loc.modernName && loc.modernName !== loc.name ? loc.modernName : null);

    function ensureLeaflet() {
        if (!leaflet) {
            leaflet = Promise.all([
                UI.loadStyle('vendor/leaflet/leaflet.css'),
                UI.loadScript('vendor/leaflet/leaflet.js')
            ]).then(() => window.L);
        }
        return leaflet;
    }

    function dropLocator() {
        if (locator) { locator.remove(); locator = null; }
    }

    function crumbs(...trail) {
        const items = [];
        trail.forEach((t, i) => {
            if (i) items.push(h('span', { 'aria-hidden': 'true' }, '/'));
            items.push(t.href ? h('a', { href: t.href }, t.label) : h('span', { 'aria-current': 'page' }, t.label));
        });
        return h('nav', { class: 'place-crumbs', 'aria-label': 'Breadcrumb' }, items);
    }

    // ── One place ───────────────────────────────────────────────────────
    function locatorBlock(loc, t) {
        if (!hasCoords(loc)) return null;
        const canvas = h('div', { class: 'place-locator', role: 'img', 'aria-label': `Map showing where ${loc.name} is` });
        const wrap = h('div', { class: 'place-locator-wrap' }, canvas);
        ensureLeaflet().then(L => {
            if (t !== token || !canvas.isConnected) return;
            locator = L.map(canvas, {
                zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false,
                doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, tap: false,
                minZoom: 3, maxZoom: 12
            });
            L.tileLayer(TILES, { maxNativeZoom: 13, className: 'map-tiles', crossOrigin: true }).addTo(locator);
            const pin = h('span', { class: 'place-pin' });
            L.marker([loc.lat, loc.lng], {
                interactive: false, keyboard: false,
                icon: L.divIcon({ className: 'place-pin-wrap', html: pin, iconSize: [24, 24], iconAnchor: [12, 12] })
            }).addTo(locator);
            locator.setView([loc.lat, loc.lng], 7, { animate: false });
        }).catch(() => { wrap.classList.add('is-plain'); });
        return wrap;
    }

    function eventsBlock(loc) {
        const events = Store.eventsAt(loc).slice().sort((a, b) => (a.startYear ?? 1e9) - (b.startYear ?? 1e9) || a.sortOrder - b.sortOrder);
        if (!events.length) {
            return h('section', { class: 'place-sec', 'aria-labelledby': 'place-ev-h' },
                h('h2', { id: 'place-ev-h' }, 'What happened here'),
                h('p', { class: 'dim' }, 'No recorded events are tied to this place yet.'));
        }
        const people = new Map();
        for (const e of events) for (const l of Store.peopleOf(e)) if (!people.has(l.person.id)) people.set(l.person.id, l.person);
        const all = [...people.values()];
        const chips = h('div', { class: 'chip-row place-people' });
        const fill = n => {
            chips.replaceChildren(...all.slice(0, n).map(p => UI.chip(p)));
        };
        fill(PEOPLE_LIMIT);
        const more = all.length > PEOPLE_LIMIT
            ? h('button', { type: 'button', class: 'btn btn-sm place-more', onclick: ev => { fill(all.length); ev.currentTarget.remove(); } },
                `Show all ${all.length} people`)
            : null;
        return h('section', { class: 'place-sec', 'aria-labelledby': 'place-ev-h' },
            h('h2', { id: 'place-ev-h' }, 'What happened here'),
            h('ol', { class: 'place-events' }, events.map(e =>
                h('li', null, h('a', { class: 'place-event', href: UI.href(e), style: { '--chip': UI.familyColor(e.category) } },
                    h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
                    h('span', { class: 'place-event-name' }, e.name),
                    h('span', { class: 'faint place-event-year' }, yearLabel(e)))))),
            all.length ? h('div', { class: 'place-people-block' },
                h('h3', { class: 'eyebrow' }, 'People tied to these events'), chips, more) : null);
    }

    function journeysBlock(loc) {
        const rows = [];
        for (const j of Store.journeys) {
            j.stops.forEach((s, i) => { if (s.locationId === loc.id) rows.push({ j, s, i }); });
        }
        if (!rows.length) return null;
        const groups = new Map();
        for (const r of rows) {
            if (!groups.has(r.j)) groups.set(r.j, []);
            groups.get(r.j).push(r);
        }
        const stopLink = (j, loc, { s, i }) => h('li', null,
            h('a', { href: Router.build('map', [j.slug], i ? { step: i + 1 } : {}) },
                h('span', null, s.label || loc.name),
                s.year != null ? h('span', { class: 'faint place-stop-year' }, Time.year(s.year)) : null));
        const card = ([j, stops]) => h('li', { class: 'card place-journey' },
            h('a', { class: 'place-journey-name', href: Router.build('map', [j.slug]) }, icon('map', 'icon-sm'), j.name),
            h('ul', { class: 'place-stops' }, stops.map(r => stopLink(j, loc, r))));
        return h('section', { class: 'place-sec', 'aria-labelledby': 'place-j-h' },
            h('h2', { id: 'place-j-h' }, 'Journeys through here'),
            h('ul', { class: 'place-journeys' }, [...groups].map(card)));
    }

    async function dictionaryBlock(loc) {
        if (typeof Dictionary === 'undefined' || !Dictionary.blockFor) return null;
        try {
            const node = await Dictionary.blockFor(loc);
            return node ? h('section', { class: 'place-sec place-dict', 'aria-label': 'From the Bible dictionary' }, node) : null;
        } catch {
            return null;
        }
    }

    function scriptureBlock(loc, data, t) {
        const refs = data.refs || [];
        const count = data.count || refs.length;
        const groups = h('div', { class: 'place-verses' });
        const more = h('button', { type: 'button', class: 'btn place-more' });
        const status = h('p', { class: 'dim place-status', role: 'status' });
        let shown = 0, list = null, lastBook = null;

        function addVerse(ref) {
            const p = Study.parse(ref);
            if (!p) return;
            if (p.book.slug !== lastBook) {
                lastBook = p.book.slug;
                list = h('ol', { class: 'place-vlist' });
                groups.append(h('div', { class: 'place-bookgroup' },
                    h('h3', { class: 'place-book' }, h('a', { href: Router.build('book', [p.book.slug]) }, p.book.name)), list));
            }
            const text = h('p', { class: 'scripture place-vtext' });
            list.append(h('li', { class: 'place-verse' },
                h('a', { class: 'place-ref', href: Study.readHref(p) }, Study.format(p)), text));
            Study.verseText(p).then(v => { if (t === token && v) text.textContent = v; else if (!v) text.remove(); }).catch(() => text.remove());
        }
        function showMore() {
            for (const ref of refs.slice(shown, shown + PAGE)) addVerse(ref);
            shown = Math.min(refs.length, shown + PAGE);
            const left = refs.length - shown;
            more.hidden = left <= 0;
            more.textContent = `Show more (${left.toLocaleString()} left)`;
            status.textContent = `Showing ${shown.toLocaleString()} of ${count.toLocaleString()} verses`
                + (left <= 0 && count > refs.length ? `. The list stops at the first ${refs.length.toLocaleString()}.` : '');
        }
        more.addEventListener('click', showMore);
        showMore();
        return h('section', { class: 'place-sec', 'aria-labelledby': 'place-s-h' },
            h('h2', { id: 'place-s-h' }, 'In Scripture'),
            h('p', { class: 'place-count' },
                h('strong', null, count.toLocaleString()), ` ${count === 1 ? 'verse names' : 'verses name'} ${loc.name}. `,
                h('span', { class: 'dim' }, 'Found by searching the King James text for the place’s name and its spellings.')),
            groups, status, more);
    }

    async function renderPlace(loc, t) {
        dropLocator();
        const modern = modernOf(loc);
        const mapBtn = h('a', { class: 'btn btn-primary', href: mapHref(loc) }, icon('map', 'icon-sm'), 'See it on the map');
        const head = h('header', { class: 'place-head rise' },
            h('div', { class: 'place-head-text' },
                loc.region ? h('p', { class: 'eyebrow' }, loc.region) : null,
                h('h1', { class: 'place-title' }, loc.name),
                modern ? h('p', { class: 'place-modern dim' }, `Today: ${modern}`) : null,
                loc.description ? h('p', { class: 'lede place-desc' }, loc.description) : null,
                hasCoords(loc) ? mapBtn : h('p', { class: 'faint' }, 'Scripture gives no fixed location for this place, so it is not marked on the map.')),
            locatorBlock(loc, t));
        const body = h('div', { class: 'place-body' }, eventsBlock(loc), journeysBlock(loc));
        const dictSlot = h('div', { class: 'place-slot' });
        const scriptSlot = h('div', { class: 'place-slot' });
        root.replaceChildren(h('div', { class: 'page place-page' },
            crumbs({ label: 'Places', href: '#/place' }, { label: loc.name }), head, body, dictSlot, scriptSlot));
        const [dict, refs] = await Promise.all([dictionaryBlock(loc), Api.getPlaceRefs(loc.slug).catch(() => null)]);
        if (t !== token) return;
        if (dict) dictSlot.append(dict);
        if (refs && refs.refs && refs.refs.length) scriptSlot.append(scriptureBlock(loc, refs, t));
    }

    // ── The index ───────────────────────────────────────────────────────
    function renderIndex() {
        dropLocator();
        const regions = new Map();
        for (const loc of Store.locations) {
            const r = loc.region || 'Elsewhere';
            if (!regions.has(r)) regions.set(r, []);
            regions.get(r).push(loc);
        }
        const names = [...regions.keys()].sort((a, b) => (a === 'Unidentified') - (b === 'Unidentified') || a.localeCompare(b));
        const sections = names.map(r => {
            const items = regions.get(r).slice().sort(byName).map(loc => {
                const m = modernOf(loc);
                return h('li', { 'data-name': `${loc.name} ${loc.modernName || ''}`.toLowerCase() },
                    h('a', { class: 'card place-card', href: hrefOf(loc) },
                        h('span', { class: 'place-card-name' }, loc.name),
                        m ? h('span', { class: 'faint place-card-modern' }, m) : null));
            });
            return h('section', { class: 'place-region', 'aria-labelledby': `place-r-${names.indexOf(r)}` },
                h('h2', { class: 'place-region-title', id: `place-r-${names.indexOf(r)}` }, r,
                    h('span', { class: 'faint place-region-n' }, String(items.length))),
                h('ul', { class: 'place-cards' }, items));
        });
        const msg = h('p', { class: 'dim place-msg', role: 'status' });
        const input = h('input', {
            class: 'field place-filter', type: 'search', id: 'place-q', autocomplete: 'off', spellcheck: 'false',
            placeholder: 'Find a place', 'aria-label': 'Find a place'
        });
        input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase();
            let shown = 0;
            for (const li of root.querySelectorAll('.place-cards > li')) {
                const hit = !q || li.dataset.name.includes(q);
                li.hidden = !hit;
                if (hit) shown++;
            }
            for (const s of root.querySelectorAll('.place-region')) s.hidden = !s.querySelector('li:not([hidden])');
            msg.textContent = q ? (shown ? `${shown} ${shown === 1 ? 'place matches' : 'places match'}.` : 'No place matches that name.') : '';
        });
        root.replaceChildren(h('div', { class: 'page place-page' },
            h('header', { class: 'place-intro rise' },
                h('p', { class: 'eyebrow' }, 'Places'),
                h('h1', { class: 'place-title' }, 'Every place, ', h('em', null, 'in its own right.')),
                h('p', { class: 'lede' }, `${Store.locations.length} places from Eden to the modern church. Open one to see what happened there, who was involved, the journeys that pass through it, and the verses that name it.`),
                h('div', { class: 'place-find' }, input, h('a', { class: 'btn', href: '#/map' }, icon('map', 'icon-sm'), 'Open the map')),
                msg),
            sections));
    }

    function renderNotFound(slug) {
        dropLocator();
        root.replaceChildren(h('div', { class: 'page place-page' },
            h('div', { class: 'place-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, 'Places'),
                h('h1', null, 'We could not find that place'),
                h('p', { class: 'lede' }, `There is no place called “${slug}”. The index lists every place we know.`),
                h('a', { class: 'btn btn-primary', href: '#/place' }, 'Browse all places'))));
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) { root = el; root.classList.add('place'); root.tabIndex = -1; }

    async function show(route) {
        const t = ++token;
        const slug = route.parts[0];
        if (!slug) { renderIndex(); return; }
        const loc = Store.location(slug);
        if (!loc) { renderNotFound(slug); return; }
        try {
            await renderPlace(loc, t);
        } catch {
            if (t === token) renderNotFound(slug);
        }
    }
    function title(route) {
        const slug = route.parts[0];
        if (!slug) return 'Places';
        return Store.location(slug)?.name || 'Place not found';
    }
    function hide() { token++; dropLocator(); }

    App.registerView('place', { init, show, hide, title });
    return {};
})();

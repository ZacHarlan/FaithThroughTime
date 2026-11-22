// guide.js — reference guides: the covenants, the feasts of Israel, the tabernacle.
//
//   #/guide                      the three guides as cards
//   #/guide/<id>                 one guide: introduction, then each item as a section
//   #/guide/<id>?item=<itemId>   the same, scrolled to (and marking) one item
//
// The feasts guide opens with a strip of the Hebrew year; the tabernacle guide with a plan drawn in SVG.
// Both select sections. Data: data/guides.json, every reference checked against the KJV.
const Guide = (() => {
    const { h, icon } = UI;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const PREVIEW = 150;
    const TONES = { covenants: 'gold', feasts: 'green', tabernacle: 'violet' };
    const BLURBS = { covenants: 'Six covenants, from Noah to Jeremiah’s new covenant.', feasts: 'Leviticus 23 by month and day, and two later feasts.', tabernacle: 'Court, tent, furniture and garments, with the measurements Exodus gives.' };

    let root, token = 0;
    let data = null;
    let current = null;              // { guide, nodes: Map(id → section), parts: Map(id → [elements]) }

    const svg = (name, attrs = {}, ...kids) => {
        const el = document.createElementNS(SVG_NS, name);
        for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
        for (const kid of kids.flat()) if (kid != null) el.append(kid);
        return el;
    };

    // ── Text ────────────────────────────────────────────────────────────
    const version = () => { try { return BibleText.getVersion(); } catch { return undefined; } };
    // A one-line text of a reference; the text is fetched when loadPreviews runs on the section.
    const preview = ref => h('span', { class: 'gd-preview', 'data-ref': ref });
    function loadPreviews(section) {
        for (const line of section.querySelectorAll('.gd-preview[data-ref]')) {
            const ref = line.dataset.ref;
            line.removeAttribute('data-ref');
            Study.verseText(ref, version()).then(text => {
                if (!text) { line.remove(); return; }
                const flat = text.replace(/\s+/g, ' ').trim();
                line.textContent = flat.length > PREVIEW ? `${flat.slice(0, PREVIEW).replace(/\s\S*$/, '')}…` : flat;
            }).catch(() => line.remove());
        }
    }
    // Load previews only when a section nears the screen.
    function lazy(el, fn) {
        if (!('IntersectionObserver' in window)) { fn(); return; }
        const io = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
        }, { rootMargin: '600px 0px' });
        io.observe(el);
    }
    const refRows = refs => h('ul', { class: 'gd-refs' }, refs.map(r => h('li', { class: 'gd-ref-row' },
        h('span', { class: 'gd-ref' }, Study.refLink(r)), preview(r))));

    const refLinks = refs => refs.flatMap((r, i) => [i ? h('span', { class: 'gd-sep' }, '; ') : null, Study.refLink(r)]);
    const itemOf = (guide, id) => guide.items.find(i => i.id === id);

    // ── Page frame ──────────────────────────────────────────────────────
    function state(eyebrow, title, lede, action) {
        root.replaceChildren(h('div', { class: 'page gd-page' },
            h('div', { class: 'gd-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, eyebrow), h('h1', null, title), h('p', { class: 'lede' }, lede), action)));
    }

    // ── Index ───────────────────────────────────────────────────────────
    function renderIndex() {
        current = null;
        root.replaceChildren(h('div', { class: 'page gd-page' },
            h('header', { class: 'gd-head rise' },
                h('p', { class: 'eyebrow' }, 'Reference guides'),
                h('h1', { class: 'gd-title' }, ['The covenants, ', h('em', null, 'the feasts and the tabernacle')]),
                h('p', { class: 'lede' }, 'Three things the Bible returns to again and again, set out in one place, with the passages beside each.')),
            h('ul', { class: 'gd-cards' }, data.guides.map(g => h('li', null,
                h('a', { class: 'card gd-card', href: Router.build('guide', [g.id]), style: { '--tone': UI.familyColor(TONES[g.id] || 'gold') } },
                    h('span', { class: 'eyebrow' }, `${g.items.length} ${g.id === 'tabernacle' ? 'parts' : g.id === 'feasts' ? 'feasts' : 'covenants'}`),
                    h('span', { class: 'gd-card-title display' }, g.title),
                    h('span', { class: 'gd-card-note' }, BLURBS[g.id] || ''),
                    h('span', { class: 'gd-card-list' }, g.items.map(i => i.short || i.title).join(' · ')),
                    h('span', { class: 'gd-card-go' }, 'Open the guide', icon('arrow-right', 'icon-sm'))))))));
    }

    // ── One item ────────────────────────────────────────────────────────
    function itemSection(guide, it) {
        const ev = it.event != null ? Store.event(it.event) : null;
        const people = (it.people || []).map(id => Store.person(id)).filter(Boolean);
        const later = it.kind === 'later';
        // Days given as a number read "Month 7, day 10"; days given in words ("Fifty days counted") stand as written.
        const numbered = it.days && /^\d/.test(it.days);
        const when = !it.days ? null
            : !it.month ? it.days
            : numbered ? `Month ${it.month}, day${/[;–]/.test(it.days) ? 's' : ''} ${it.days}${it.approx ? ' (by tradition)' : ''}`
            : `Month ${it.month}: ${it.days.toLowerCase()}`;

        const meta = h('div', { class: 'gd-meta' },
            later ? h('span', { class: 'gd-tag' }, 'Later feast') : null,
            when ? h('span', { class: 'gd-when' }, when) : null,
            it.year != null ? h('a', { class: 'gd-year', href: Router.build('timeline', [], { y: it.year, span: 80 }) },
                icon('timeline', 'icon-sm'), Time.year(it.year), ' on the timeline') : null);

        const points = h('dl', { class: 'gd-points' }, it.points.map(p => h('div', { class: 'gd-point' },
            h('dt', null, p.label),
            h('dd', null, p.text, p.refs.length ? [' ', h('span', { class: 'gd-point-refs' }, refLinks(p.refs))] : null))));

        const related = [ev ? UI.chip(ev, { sub: Time.year(ev.startYear) }) : null, ...people.map(p => UI.chip(p))].filter(Boolean);
        const passages = h('div', { class: 'gd-block' }, h('h3', { class: 'gd-sub' }, 'The passages'), refRows(it.refs));
        const laterBlock = it.later && it.later.length
            ? h('div', { class: 'gd-block' }, h('h3', { class: 'gd-sub' }, 'Later in Scripture'), refRows(it.later)) : null;

        const heading = h('h2', { class: 'gd-item-title display', id: `gd-h-${it.id}`, tabindex: '-1' }, it.title);
        const section = h('section', { class: `gd-item${later ? ' is-later' : ''}`, id: `gd-${it.id}`, 'data-item': it.id, 'aria-labelledby': `gd-h-${it.id}` },
            h('header', { class: 'gd-item-head' }, heading, meta),
            h('p', { class: 'gd-summary' }, it.summary),
            points,
            related.length ? h('div', { class: 'chip-row gd-related', role: 'group', 'aria-label': 'People and events' }, related) : null,
            passages, laterBlock);
        return section;
    }

    // ── Selecting an item ───────────────────────────────────────────────
    function select(id, { scroll = true, replace = true } = {}) {
        if (!current || !current.nodes.has(id)) return;
        for (const [key, sec] of current.nodes) sec.classList.toggle('is-selected', key === id);
        for (const [key, els] of current.parts) for (const el of els) el.setAttribute('aria-pressed', String(key === id));
        if (replace) Router.replace(Router.build('guide', [current.guide.id], { item: id }));
        if (scroll) {
            const sec = current.nodes.get(id);
            sec.scrollIntoView({ block: 'start', behavior: UI.reducedMotion() ? 'auto' : 'smooth' });
            sec.querySelector('.gd-item-title')?.focus({ preventScroll: true });
        }
    }
    const onKey = fn => e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

    // ── The feasts: a strip of the Hebrew year ──────────────────────────
    function calendar(guide) {
        const feasts = guide.items.filter(i => i.month);
        const weekly = guide.items.find(i => i.month == null && i.days);
        const els = new Map();
        const chip = it => {
            const b = h('button', {
                type: 'button', class: `gd-fchip${it.kind === 'later' ? ' is-later' : ''}`, 'data-feast': it.id, 'aria-pressed': 'false',
                onclick: () => select(it.id)
            }, h('span', { class: 'gd-fchip-name' }, it.short || it.title),
                h('span', { class: 'gd-fchip-days' }, /^\d/.test(it.days) ? `Day ${it.days.replace(/;/g, ',')}${it.approx ? ', by tradition' : ''}` : it.days),
                it.kind === 'later' ? h('span', { class: 'gd-fchip-later' }, 'later') : null);
            if (!els.has(it.id)) els.set(it.id, []);
            els.get(it.id).push(b);
            return b;
        };
        const months = data.calendar.months.map(m => {
            const here = feasts.filter(f => f.month === m.n);
            const label = `Month ${m.n}, ${m.name}${here.length ? `: ${here.map(f => f.short || f.title).join(', ')}` : ''}`;
            return h('li', { class: `gd-month${here.length ? ' has-feast' : ''}`, 'data-month': m.n, 'aria-label': label },
                h('span', { class: 'gd-m-head' }, h('span', { class: 'gd-m-n' }, m.n), h('span', { class: 'gd-m-name' }, m.name)),
                here.length ? h('span', { class: 'gd-m-feasts' }, here.map(chip)) : null);
        });
        const node = h('section', { class: 'gd-cal', 'aria-labelledby': 'gd-cal-title' },
            h('h2', { id: 'gd-cal-title', class: 'gd-cal-title' }, 'The Hebrew year'),
            h('p', { class: 'gd-cal-note' }, data.calendar.note),
            weekly ? h('p', { class: 'gd-weekly' }, h('span', { class: 'gd-weekly-label' }, 'Every week'), chip(weekly)) : null,
            h('ol', { class: 'gd-months' }, months));
        return { node, els };
    }

    // ── The tabernacle: a plan in SVG ───────────────────────────────────
    // East is at the foot of the plan, where the gate is; north is on the right. The court is drawn
    // to its measurements (a hundred cubits by fifty, five to the cubit); the furniture is drawn
    // larger than its true size so it can be seen and touched.
    const PARTS = [
        { id: 'court', n: 1, badge: [40, 40] },
        { id: 'altar', n: 2, at: [145, 275], size: [30, 30], kind: 'brass' },
        { id: 'laver', n: 3, at: [145, 345], size: [32, 32], kind: 'brass', round: true },
        { id: 'tent', n: 4, badge: [98, 188] },
        { id: 'table', n: 5, at: [156, 160], size: [18, 18], kind: 'gold' },
        { id: 'lampstand', n: 6, at: [134, 160], size: [18, 18], kind: 'gold' },
        { id: 'incense', n: 7, at: [145, 124], size: [20, 20], kind: 'gold' },
        { id: 'veil', n: 8, badge: [98, 100] },
        { id: 'ark', n: 9, at: [145, 72], size: [30, 24], kind: 'gold' }
    ];

    function plan(guide) {
        const els = new Map();
        const label = id => itemOf(guide, id)?.title || id;
        const mk = (part, shapes) => {
            const g = svg('g', {
                class: 'gd-part', 'data-part': part.id, role: 'button', tabindex: '0', 'aria-pressed': 'false',
                'aria-label': `${part.n}. ${label(part.id)}`
            }, svg('title', {}, label(part.id)), shapes);
            g.addEventListener('click', () => select(part.id));
            g.addEventListener('keydown', onKey(() => select(part.id)));
            if (!els.has(part.id)) els.set(part.id, []);
            els.get(part.id).push(g);
            return g;
        };
        const num = (part, [cx, cy], r = 9) => [
            svg('circle', { class: 'gd-badge', cx, cy, r }),
            svg('text', { class: 'gd-num', x: cx, y: cy + 4, 'text-anchor': 'middle' }, String(part.n))];
        const byId = Object.fromEntries(PARTS.map(p => [p.id, p]));

        const court = mk(byId.court, [
            svg('rect', { class: 'gd-court', x: 20, y: 20, width: 250, height: 500, rx: 3 }),
            num(byId.court, byId.court.badge)]);
        const tent = mk(byId.tent, [
            svg('rect', { class: 'gd-tent', x: 120, y: 50, width: 50, height: 150 }),
            svg('line', { class: 'gd-lead', x1: 107, y1: 188, x2: 120, y2: 188 }),
            num(byId.tent, byId.tent.badge)]);
        const veil = mk(byId.veil, [
            svg('line', { class: 'gd-veil', x1: 120, y1: 100, x2: 170, y2: 100 }),
            svg('line', { class: 'gd-lead', x1: 107, y1: 100, x2: 120, y2: 100 }),
            num(byId.veil, byId.veil.badge)]);
        const furniture = id => {
            const p = byId[id], [x, y] = p.at, [w, hh] = p.size;
            const shape = p.round ? svg('circle', { class: `gd-furn is-${p.kind}`, cx: x, cy: y, r: w / 2 })
                : svg('rect', { class: `gd-furn is-${p.kind}`, x: x - w / 2, y: y - hh / 2, width: w, height: hh, rx: 2 });
            return mk(p, [shape, svg('text', { class: 'gd-num is-on-shape', x, y: y + 4, 'text-anchor': 'middle' }, String(p.n))]);
        };

        const drawing = svg('svg', {
            class: 'gd-plan', viewBox: '0 0 290 540', role: 'group', 'aria-label': 'Plan of the tabernacle and its court. Select a part to read about it.'
        },
            court,
            svg('line', { class: 'gd-gate', x1: 95, y1: 520, x2: 195, y2: 520 }),
            svg('text', { class: 'gd-dir', x: 145, y: 536, 'text-anchor': 'middle' }, 'East: the gate'),
            svg('text', { class: 'gd-dir', x: 145, y: 14, 'text-anchor': 'middle' }, 'West'),
            tent, svg('text', { class: 'gd-room', x: 145, y: 46, 'text-anchor': 'middle' }, 'Most holy place'),
            svg('text', { class: 'gd-room', x: 145, y: 198, 'text-anchor': 'middle', dy: '10' }, 'Holy place'),
            veil, furniture('ark'), furniture('incense'), furniture('lampstand'), furniture('table'),
            furniture('altar'), furniture('laver'));

        const legend = h('ol', { class: 'gd-legend', 'aria-label': 'Parts of the tabernacle' }, guide.items.map(it => {
            const part = PARTS.find(p => p.id === it.id);
            const b = h('button', { type: 'button', class: 'gd-leg-btn', 'aria-pressed': 'false', onclick: () => select(it.id) },
                h('span', { class: 'gd-leg-n', 'aria-hidden': 'true' }, part ? String(part.n) : ''), it.title);
            if (!els.has(it.id)) els.set(it.id, []);
            els.get(it.id).push(b);
            return h('li', null, b);
        }));

        const node = h('section', { class: 'gd-plan-wrap', 'aria-labelledby': 'gd-plan-title' },
            h('div', { class: 'gd-plan-fig' },
                h('h2', { id: 'gd-plan-title', class: 'gd-cal-title' }, 'The plan'),
                drawing,
                h('p', { class: 'gd-cal-note' }, 'The court is drawn to its measurements, a hundred cubits by fifty. The tent and furniture are placed as Exodus describes them, and drawn larger than scale so that they can be read.')),
            h('div', { class: 'gd-plan-side' }, h('h2', { class: 'gd-cal-title' }, 'Parts'), legend));
        return { node, els };
    }

    // ── One guide ───────────────────────────────────────────────────────
    function renderGuide(guide, route) {
        const nodes = new Map(), parts = new Map();
        const sections = guide.items.map(it => { const s = itemSection(guide, it); nodes.set(it.id, s); return s; });
        let extra = null;
        if (guide.id === 'feasts') { extra = calendar(guide); }
        else if (guide.id === 'tabernacle') { extra = plan(guide); }
        if (extra) for (const [k, v] of extra.els) parts.set(k, v);
        current = { guide, nodes, parts };

        const others = data.guides.filter(g => g !== guide);
        root.replaceChildren(h('div', { class: 'page gd-page' },
            h('nav', { class: 'gd-crumbs', 'aria-label': 'Breadcrumb' },
                h('a', { href: Router.build('guide') }, 'Guides'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, guide.title)),
            h('header', { class: 'gd-head rise' },
                h('p', { class: 'eyebrow' }, 'Reference guide'),
                h('h1', { class: 'gd-title' }, guide.title),
                h('p', { class: 'lede' }, guide.intro)),
            extra ? extra.node : null,
            h('nav', { class: 'gd-jump', 'aria-label': `In ${guide.title}` },
                guide.items.map(it => h('a', { class: 'chip', href: Router.build('guide', [guide.id], { item: it.id }) }, it.short || it.title))),
            h('div', { class: 'gd-items' }, sections),
            h('nav', { class: 'gd-pager', 'aria-label': 'Other guides' },
                others.map(g => h('a', { class: 'gd-pager-link', href: Router.build('guide', [g.id]) },
                    h('span', { class: 'eyebrow' }, 'Another guide'), h('span', { class: 'display' }, g.title))))));

        for (const sec of sections) lazy(sec, () => loadPreviews(sec));
        applyItem(route);
    }

    function applyItem(route) {
        const id = route.query.item;
        if (id && current?.nodes.has(id)) select(id, { replace: false });
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('guide');
        root.tabIndex = -1;
    }

    async function show(route) {
        const t = ++token;
        if (!data) {
            try { data = await Api.getGuides(); } catch { data = null; }
            if (t !== token) return;
            if (!data || !data.guides || !data.guides.length) {
                data = null;
                state('Offline', 'The guides could not be loaded', 'Check your connection and try again.',
                    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => show(Router.current) }, 'Try again'));
                return;
            }
        }
        document.title = `${title(route)} — Faith Through Time`;
        const [id] = route.parts;
        if (!id) { renderIndex(); return; }
        const guide = data.guides.find(g => g.id === id);
        if (!guide) {
            current = null;
            state('Not found', 'We could not find that guide', 'Choose one from the list.',
                h('a', { class: 'btn btn-primary', href: Router.build('guide') }, 'All guides'));
            return;
        }
        // Only the item changed (a jump link or a selection): keep the page, move to the item.
        if (current && current.guide === guide && root.contains(current.nodes.values().next().value)) { applyItem(route); return; }
        renderGuide(guide, route);
    }

    function title(route) {
        const [id] = route.parts;
        if (!id) return 'Reference guides';
        return data?.guides.find(g => g.id === id)?.title || 'Reference guides';
    }

    App.registerView('guide', { init, show, title });
    return {};
})();

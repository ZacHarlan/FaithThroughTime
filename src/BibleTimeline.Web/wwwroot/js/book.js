// book.js — one book of the Bible: who wrote it, when, what it is about, how it is laid out,
// and everything else the site holds on it.
//
//   #/book/<slug>      the book page (#/book alone goes to the library at #/read)
//
// Data: data/books.json (authored: author, setting, summary, themes, key verses, outline) beside the
// Store's own book rows (name, testament, genre, span of events). The "on this site" lists are
// worked out at run time from the Store, journeys, parallels, prophecy and the reading plan.
const Book = (() => {
    const { h, icon } = UI;
    const LIST_LIMIT = 10;
    const GENRES = {
        law: 'Law', history: 'History', wisdom: 'Wisdom and poetry', prophecy: 'The prophets',
        gospel: 'The Gospels', epistle: 'Letters', apocalyptic: 'Apocalypse'
    };
    const genreLabel = g => GENRES[g] || (g ? g[0].toUpperCase() + g.slice(1) : 'Scripture');

    let root, token = 0;
    let info = null;            // { books: { slug: {...} } }
    let manifest = null;
    let linkedIndex = null;     // slug → { people: Map, events: Map } of Store entities
    const dataCache = {};       // name → Promise of study data

    // ── Data ────────────────────────────────────────────────────────────
    const once = (key, load) => (dataCache[key] ||= load().catch(() => { delete dataCache[key]; return null; }));

    async function loadBase() {
        manifest = manifest || await BibleText.manifest();
        info = info || await Api.getBooksInfo();
        if (!linkedIndex) buildLinked();
    }

    // The people and events whose scripture references fall in each book.
    function buildLinked() {
        linkedIndex = new Map();
        for (const entity of [...Store.people, ...Store.events]) {
            for (const s of entity.scripture || []) {
                const p = Study.parse(s.ref);
                if (!p) continue;
                if (!linkedIndex.has(p.book.slug)) linkedIndex.set(p.book.slug, { people: new Set(), events: new Set() });
                linkedIndex.get(p.book.slug)[entity.kind === 'person' ? 'people' : 'events'].add(entity);
            }
        }
    }
    const byImportance = (a, b) =>
        Store.SIG_RANK[a.significance] - Store.SIG_RANK[b.significance]
        || (a.span?.start ?? 1e9) - (b.span?.start ?? 1e9);

    const chapterCount = slug => manifest?.books.find(b => b.slug === slug)?.chapters || 0;

    // ── Small pieces ────────────────────────────────────────────────────
    function crumbs(book) {
        return h('nav', { class: 'bk-crumbs', 'aria-label': 'Breadcrumb' },
            h('a', { href: Router.build('read') }, 'Read Scripture'),
            h('span', { 'aria-hidden': 'true' }, '/'),
            h('span', null, book.name));
    }

    function section(id, title, ...body) {
        return h('section', { class: 'bk-section', 'aria-labelledby': `bk-h-${id}` },
            h('h2', { id: `bk-h-${id}`, class: 'bk-h2' }, title), ...body);
    }

    // A short list with the rest behind a button.
    function moreList(items, make, cls) {
        const list = h('ul', { class: cls }, items.slice(0, LIST_LIMIT).map(make));
        const rest = items.slice(LIST_LIMIT);
        if (!rest.length) return list;
        return h('div', { class: 'bk-more-wrap' }, list,
            h('button', {
                type: 'button', class: 'btn btn-quiet btn-sm bk-more',
                onclick: e => { list.append(...rest.map(make)); e.currentTarget.remove(); }
            }, `Show ${rest.length} more`));
    }

    function timelineLink(from, to) {
        const mid = Time.fromAxis((Time.toAxis(from) + Time.toAxis(to)) / 2);
        const span = Math.max(80, Math.round(Math.abs(Time.between(from, to)) * 1.5));
        const era = Store.periodAt(mid);
        return h('a', {
            class: 'bk-when', href: Router.build('timeline', [], { y: mid, span }),
            style: era ? `--era: ${era.color}` : null
        },
            h('span', { class: 'bk-when-era' }, h('span', { class: 'chip-dot', 'aria-hidden': 'true' }), era?.name || 'Timeline'),
            h('span', { class: 'year bk-when-years' }, Time.span(from, to)),
            h('span', { class: 'bk-when-go' }, 'See it on the timeline', icon('arrow-right', 'icon-sm')));
    }

    function neighbours(book) {
        const i = Store.books.indexOf(book);
        const link = (b, text) => b
            ? h('a', { class: `bk-pager-link${text === 'Next' ? ' is-next' : ''}`, href: Router.build('book', [b.slug]) },
                h('span', { class: 'eyebrow' }, text), h('span', { class: 'display' }, b.name))
            : h('span');
        return h('nav', { class: 'bk-pager', 'aria-label': 'Other books' },
            link(Store.books[i - 1], 'Previous'), link(Store.books[i + 1], 'Next'));
    }

    // ── The page ────────────────────────────────────────────────────────
    function facts(book, extra) {
        const row = (label, value) => h('div', { class: 'bk-fact' },
            h('dt', null, label), h('dd', null, value));
        return h('dl', { class: 'bk-facts' },
            row('Author', extra.author),
            row('Written', extra.written),
            row('Setting', extra.setting));
    }

    function chapterGrid(book) {
        const n = chapterCount(book.slug);
        return section('chapters', n === 1 ? 'The chapter' : `The ${n} chapters`,
            h('ol', { class: 'bk-chapters' }, Array.from({ length: n }, (_, i) => h('li', null,
                h('a', {
                    class: 'bk-chapter', href: Router.build('read', [book.slug, i + 1]),
                    'aria-label': `${book.name} chapter ${i + 1}`
                }, String(i + 1))))));
    }

    function outline(extra) {
        return section('outline', 'Outline',
            h('ol', { class: 'bk-outline' }, extra.outline.map(part => {
                const p = Study.parse(part.ref);
                return h('li', null, h('a', { class: 'bk-part', href: p ? Study.readHref(p) : Router.build('read') },
                    h('span', { class: 'bk-part-title' }, part.title),
                    h('span', { class: 'bk-part-ref' }, p ? Study.format(p) : part.ref),
                    icon('arrow-right', 'icon-sm')));
            })));
    }

    function keyVerses(extra, t) {
        return section('verses', 'Key verses',
            h('ul', { class: 'bk-verses' }, extra.keyVerses.map(ref => {
                const p = Study.parse(ref);
                const text = h('blockquote', { class: 'scripture bk-verse-text', lang: 'en', 'aria-busy': 'true' },
                    h('span', { class: 'bk-skel' }));
                Study.verseText(p || ref).then(found => {
                    if (t !== token) return;
                    text.removeAttribute('aria-busy');
                    text.textContent = found || 'The text could not be loaded.';
                });
                return h('li', { class: 'bk-verse' }, text,
                    h('a', { class: 'bk-verse-ref', href: p ? Study.readHref(p) : Router.build('read') }, p ? Study.format(p) : ref));
            })));
    }

    // ── What the site holds on the book ────────────────────────────────
    function peopleAndEvents(book) {
        const linked = linkedIndex.get(book.slug);
        if (!linked) return null;
        const groups = [
            ['People', [...linked.people].sort(byImportance)],
            ['Events', [...linked.events].sort(byImportance)]
        ].filter(([, list]) => list.length);
        if (!groups.length) return null;
        return section('people', 'People and events in this book',
            h('div', { class: 'bk-pe' }, groups.map(([label, list]) => h('div', { class: 'bk-pe-group' },
                h('h3', { class: 'bk-h3' }, label, h('span', { class: 'bk-count' }, list.length)),
                moreList(list, x => h('li', null, UI.chip(x)), 'bk-chips')))));
    }

    function journeysIn(book) {
        const rows = [];
        for (const j of Store.journeys) {
            const refs = (j.stops || []).map(s => s.chapter && Study.parse(s.chapter)).filter(p => p && p.book === book);
            if (j.bookId === book.id || refs.length) {
                const chapters = [...new Set(refs.map(p => p.startCh))].sort((a, b) => a - b);
                rows.push({ j, chapters });
            }
        }
        if (!rows.length) return null;
        return section('journeys', 'Journeys on the map',
            moreList(rows, ({ j, chapters }) => h('li', null,
                h('a', { class: 'bk-row', href: UI.href(j) },
                    icon('map', 'icon-sm'),
                    h('span', { class: 'bk-row-main' },
                        h('span', { class: 'bk-row-title' }, j.name),
                        chapters.length ? h('span', { class: 'bk-row-sub' },
                            `${book.name} ${chapters.length > 4 ? `${chapters[0]}–${chapters[chapters.length - 1]}` : chapters.join(', ')}`) : null),
                    icon('arrow-right', 'icon-sm'))), 'bk-rows'));
    }

    function parallelsIn(book, groups) {
        const rows = [];
        for (const g of groups || []) {
            for (const s of g.sections || []) {
                const here = (s.passages || []).map(x => Study.parse(x)).filter(p => p && p.book === book);
                if (here.length) rows.push({ s, here });
            }
        }
        if (!rows.length) return null;
        return section('parallels', 'Parallel passages',
            h('p', { class: 'bk-note' }, 'Accounts told more than once, set side by side.'),
            moreList(rows, ({ s, here }) => h('li', null,
                h('a', { class: 'bk-row', href: Router.build('parallel', [s.id]) },
                    icon('link', 'icon-sm'),
                    h('span', { class: 'bk-row-main' },
                        h('span', { class: 'bk-row-title' }, s.title),
                        h('span', { class: 'bk-row-sub' }, here.map(p => Study.format(p)).join('; '))),
                    icon('arrow-right', 'icon-sm'))), 'bk-rows'));
    }

    function prophecyIn(book, raw) {
        const inBook = list => (list || []).map(x => Study.parse(x)).filter(p => p && p.book === book);
        const prophecies = [];
        for (const p of raw?.prophecies || []) {
            const spoken = inBook(p.prophecy), met = inBook(p.fulfilment);
            if (spoken.length || met.length) prophecies.push({ p, role: spoken.length ? 'Spoken here' : 'Fulfilled here', refs: spoken.length ? spoken : met });
        }
        const quotes = [];
        for (const q of raw?.quotations || []) {
            const nt = inBook([q.nt]), ot = inBook(q.ot);
            if (nt.length || ot.length) quotes.push({ q, nt, ot });
        }
        if (!prophecies.length && !quotes.length) return null;
        const body = [];
        if (prophecies.length) {
            body.push(h('h3', { class: 'bk-h3' }, 'Prophecy and its fulfilment', h('span', { class: 'bk-count' }, prophecies.length)),
                moreList(prophecies, ({ p, role, refs }) => h('li', null,
                    h('a', { class: 'bk-row', href: Router.build('prophecy', [p.id]) },
                        icon('sparkle', 'icon-sm'),
                        h('span', { class: 'bk-row-main' },
                            h('span', { class: 'bk-row-title' }, p.title),
                            h('span', { class: 'bk-row-sub' }, `${role}: ${refs.map(r => Study.format(r)).join('; ')}`)),
                        icon('arrow-right', 'icon-sm'))), 'bk-rows'));
        }
        if (quotes.length) {
            const quoting = book.testament === 'NT';
            body.push(h('h3', { class: 'bk-h3' }, quoting ? 'Old Testament passages quoted here' : 'Quoted in the New Testament',
                h('span', { class: 'bk-count' }, quotes.length)),
                moreList(quotes, ({ q }) => h('li', null,
                    h('a', { class: 'bk-row', href: Router.build('prophecy', [], { tab: 'quotes', q: quoting ? q.nt : q.ot[0] }) },
                        icon('scroll', 'icon-sm'),
                        h('span', { class: 'bk-row-main' },
                            h('span', { class: 'bk-row-title' }, quoting ? q.nt : q.ot.join('; ')),
                            h('span', { class: 'bk-row-sub' }, quoting ? `quotes ${q.ot.join('; ')}` : `quoted at ${q.nt}`)),
                        icon('arrow-right', 'icon-sm'))), 'bk-rows'));
        }
        return section('prophecy', 'Prophecy and quotation', ...body);
    }

    function planIn(book, plan) {
        const days = (plan?.days || []).filter(d => (d.passages || []).some(x => Study.parse(x)?.book === book));
        if (!days.length) return null;
        return section('plan', 'In the reading plan',
            h('p', { class: 'bk-note' }, `${book.name} is read on ${days.length === 1 ? 'one day' : `${days.length} days`} of the 365-day plan.`),
            moreList(days, d => h('li', null,
                h('a', { class: 'chip', href: Router.build('plan', [d.day]), title: d.title }, `Day ${d.day}`)), 'bk-chips'));
    }

    // Fills in the "on this site" part once the study data has loaded.
    async function fillHoldings(book, holder, t) {
        const [groups, prophecy, plan] = await Promise.all([
            once('par', () => Api.getParallels()), once('pro', () => Api.getProphecy()), once('plan', () => Api.getReadingPlan())]);
        if (t !== token) return;
        const parts = [peopleAndEvents(book), journeysIn(book), parallelsIn(book, groups?.groups),
            prophecyIn(book, prophecy), planIn(book, plan)].filter(Boolean);
        holder.removeAttribute('aria-busy');
        if (!parts.length) { holder.remove(); return; }
        holder.replaceChildren(h('h2', { class: 'bk-holdings-title display' }, `${book.name} on this site`), ...parts);
    }

    function renderBook(book, extra, t) {
        const first = Router.build('read', [book.slug, 1]);
        const holder = h('div', { class: 'bk-holdings', 'aria-busy': 'true' });
        root.replaceChildren(h('div', { class: 'page bk-page' },
            crumbs(book),
            h('header', { class: 'bk-head rise' },
                h('p', { class: 'eyebrow' }, `${book.testament === 'NT' ? 'New' : 'Old'} Testament · ${genreLabel(book.genre)}`),
                h('h1', { class: 'bk-title' }, book.name),
                h('p', { class: 'lede' }, extra.summary),
                h('div', { class: 'bk-actions' },
                    h('a', { class: 'btn btn-primary', href: first }, 'Start reading', icon('arrow-right', 'icon-sm')))),
            h('div', { class: 'bk-intro' },
                facts(book, extra),
                h('div', { class: 'bk-side' },
                    h('h2', { class: 'eyebrow bk-side-title' }, 'Themes'),
                    h('ul', { class: 'bk-themes' }, extra.themes.map(x => h('li', { class: 'chip bk-theme' }, x))),
                    book.coversStart != null ? h('div', { class: 'bk-when-wrap' },
                        h('h2', { class: 'eyebrow bk-side-title' }, 'When this happened'),
                        timelineLink(book.coversStart, book.coversEnd)) : null)),
            chapterGrid(book),
            outline(extra),
            keyVerses(extra, t),
            holder,
            neighbours(book)));
        fillHoldings(book, holder, t);
    }

    function renderState(kind, bookName) {
        const copy = {
            unknown: ['Not found', 'We could not find that book', 'Check the address, or choose a book from the library.'],
            missing: ['Not available', `${bookName} has no introduction yet`, 'You can still read it.'],
            offline: ['Offline', 'The book could not be loaded', 'Check your connection and try again.']
        }[kind];
        root.replaceChildren(h('div', { class: 'page bk-page' },
            h('div', { class: 'bk-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, copy[0]),
                h('h1', null, copy[1]),
                h('p', { class: 'lede' }, copy[2]),
                kind === 'offline'
                    ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => show(Router.current) }, 'Try again')
                    : h('a', { class: 'btn btn-primary', href: Router.build('read') }, 'All books'))));
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('book');
        root.tabIndex = -1;
    }

    async function show(route) {
        const t = ++token;
        const [slug] = route.parts;
        if (!slug) { Router.replace(Router.build('read')); return; }
        try { await loadBase(); } catch { if (t === token) renderState('offline'); return; }
        if (t !== token) return;
        const book = Store.book(slug);
        if (!book) { renderState('unknown'); return; }
        const extra = info?.books?.[book.slug];
        if (!extra) { renderState('missing', book.name); return; }
        renderBook(book, extra, t);
    }

    function hide() { token++; }

    function title(route) {
        const book = route.parts[0] && Store.book(route.parts[0]);
        return book ? book.name : 'Book';
    }

    App.registerView('book', { init, show, hide, title });
    return {};
})();

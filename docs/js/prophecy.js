// prophecy.js — prophecy and its fulfilment, and the Old Testament in the New.
//
//   #/prophecy                 "Prophecy fulfilled": cards by theme (?theme=messiah)
//   #/prophecy?tab=quotes      "The Old Testament in the New" (?book=hebrews, ?q=)
//   #/prophecy/<id>            one prophecy, its fulfilment, both passages beside each other
//
// Also adds a "Quotations and prophecy" section to the verse study panel.
// Data: data/prophecy.json, every reference written in the Store's own book names.
const Prophecy = (() => {
    const { h, icon } = UI;
    const DEFAULT_VERSION = 'esv';
    const LAST_RESORT = 'kjv';
    const PREVIEW = 150;

    const THEMES = [
        { id: 'messiah', label: 'The Messiah', blurb: 'Foretold of Christ, and recorded as met in him.', tone: 'messiah' },
        { id: 'israel', label: 'Israel', blurb: 'Promises and warnings to the people of God.', tone: 'law' },
        { id: 'nations', label: 'The nations', blurb: 'Gentile rulers and peoples in the plan of God.', tone: 'conquest' },
        { id: 'kings', label: 'Kings and prophets', blurb: 'Words spoken against and for the throne.', tone: 'kingdom' },
        { id: 'other', label: 'Other words fulfilled', blurb: 'A prophet’s word, and the text that says it came to pass.', tone: 'prophecy' }
    ];

    let root, token = 0;
    let data = null;          // { quotations, prophecies } with parsed references
    let bookIndex = null;     // name → Store book
    const bookCache = new Map();

    // ── References ──────────────────────────────────────────────────────
    // Every reference in the data is "Book C:V" or "Book C:V-V" in one chapter.
    function parseRef(ref) {
        const m = /^(.+?) (\d+):(\d+)(?:-(\d+))?$/.exec(ref);
        const book = m && bookIndex.get(m[1]);
        if (!book) return null;
        const a = Number(m[3]);
        return { ref, book, ch: Number(m[2]), a, b: m[4] ? Number(m[4]) : a };
    }
    const label = p => `${p.book.name} ${p.ch}:${p.a}${p.b > p.a ? `–${p.b}` : ''}`;
    const readHref = p => Router.build('read', [p.book.slug, p.ch], { v: p.b > p.a ? `${p.a}-${p.b}` : `${p.a}` });
    const covers = (p, book, ch, v) => p.book === book && p.ch === ch && v >= p.a && v <= p.b;
    const refLink = p => h('a', { class: 'pr-ref', href: readHref(p) }, label(p));
    const refLinks = list => list.flatMap((p, i) => [i ? h('span', { class: 'pr-sep' }, '; ') : null, refLink(p)]);

    async function load() {
        if (data) return data;
        bookIndex = new Map(Store.books.map(b => [b.name, b]));
        const raw = await Api.getProphecy();
        const parse = list => list.map(parseRef).filter(Boolean);
        data = {
            quotations: (raw.quotations || []).map((q, i) => ({
                ...q, i, ntRef: parseRef(q.nt), otRefs: parse(q.ot)
            })).filter(q => q.ntRef && q.otRefs.length),
            prophecies: (raw.prophecies || []).map(p => ({
                ...p, prophecyRefs: parse(p.prophecy), fulfilmentRefs: parse(p.fulfilment)
            })).filter(p => p.prophecyRefs.length && p.fulfilmentRefs.length)
        };
        return data;
    }

    // ── Text ────────────────────────────────────────────────────────────
    function activeVersion(manifest) {
        const saved = BibleText.getVersion();
        return manifest?.versions.some(v => v.id === saved) ? saved : DEFAULT_VERSION;
    }
    async function bookText(version, slug) {
        const key = `${version}/${slug}`;
        if (!bookCache.has(key)) bookCache.set(key, Api.getBibleBook(version, slug).catch(() => null));
        return bookCache.get(key);
    }
    // Resolves to { version, verses: [{ v, text }] } for one reference, falling back to the default
    // translation, then the KJV, when the wanted one lacks it.
    async function passage(p, wanted) {
        for (const version of [...new Set([wanted, DEFAULT_VERSION, LAST_RESORT])]) {
            const chap = (await bookText(version, p.book.slug))?.[String(p.ch)];
            if (!chap) continue;
            const verses = [];
            for (let v = p.a; v <= p.b; v++) if (chap[String(v)] != null) verses.push({ v, text: chap[String(v)] });
            if (verses.length) return { version, verses };
        }
        return null;
    }

    // ── Page frame ──────────────────────────────────────────────────────
    function head(eyebrow, titleNodes, lede) {
        return h('header', { class: 'pr-head rise' },
            h('p', { class: 'eyebrow' }, eyebrow),
            h('h1', { class: 'pr-title' }, titleNodes),
            lede ? h('p', { class: 'lede' }, lede) : null);
    }

    function tabs(active) {
        const tab = (id, text, route) => h('a', {
            class: `pr-tab${active === id ? ' is-on' : ''}`, href: route, 'aria-current': active === id ? 'page' : null
        }, text);
        return h('nav', { class: 'pr-tabs', 'aria-label': 'Prophecy and quotation' },
            tab('fulfilled', 'Prophecy fulfilled', Router.build('prophecy')),
            tab('quotes', 'The Old Testament in the New', Router.build('prophecy', [], { tab: 'quotes' })));
    }

    // ── Tab one: prophecy fulfilled ─────────────────────────────────────
    function renderFulfilled(route) {
        const theme = THEMES.some(t => t.id === route.query.theme) ? route.query.theme : '';
        const field = h('input', {
            class: 'field', type: 'search', placeholder: 'Find a prophecy, person or passage',
            'aria-label': 'Find a prophecy', autocomplete: 'off', spellcheck: 'false', value: route.query.q || ''
        });
        const list = h('div', { class: 'pr-groups' });
        const count = h('p', { class: 'pr-count', role: 'status' });

        const chips = h('div', { class: 'chip-row pr-themes', role: 'group', 'aria-label': 'Filter by theme' },
            themeChip('', 'All', data.prophecies.length, !theme),
            THEMES.filter(t => data.prophecies.some(p => p.theme === t.id))
                .map(t => themeChip(t.id, t.label, data.prophecies.filter(p => p.theme === t.id).length, theme === t.id)));

        function refresh() {
            const q = field.value.trim().toLowerCase();
            const shown = data.prophecies.filter(p => (!theme || p.theme === theme)
                && (!q || [p.title, p.note, ...p.prophecy, ...p.fulfilment].join(' ').toLowerCase().includes(q)));
            list.replaceChildren(...THEMES.map(t => {
                const items = shown.filter(p => p.theme === t.id);
                if (!items.length) return null;
                return h('section', { class: 'pr-group', 'aria-labelledby': `pr-g-${t.id}` },
                    h('div', { class: 'pr-group-head' },
                        h('h2', { id: `pr-g-${t.id}`, class: 'pr-group-title' }, t.label),
                        h('p', { class: 'pr-group-blurb' }, t.blurb)),
                    h('ul', { class: 'pr-cards' }, items.map(card)));
            }).filter(Boolean));
            if (!shown.length) list.append(h('p', { class: 'pr-none' }, 'Nothing matches. Try a place, a king or a book of the Bible.'));
            count.textContent = `${shown.length} ${shown.length === 1 ? 'prophecy' : 'prophecies'}`;
        }
        field.addEventListener('input', UI.debounce(refresh, 80));

        root.replaceChildren(h('div', { class: 'page pr-page' },
            head('Scripture fulfilled', ['Prophecy ', h('em', null, 'and its fulfilment')],
                'Where the Bible itself records that a word was spoken and then came to pass. Each pair sets the two passages side by side.'),
            tabs('fulfilled'),
            h('div', { class: 'pr-tools' }, h('div', { class: 'pr-search' }, icon('search'), field), chips),
            count, list));
        refresh();
    }

    function themeChip(id, text, n, on) {
        return h('a', {
            class: `chip${on ? ' is-on' : ''}`, 'aria-current': on ? 'true' : null,
            href: Router.build('prophecy', [], id ? { theme: id } : {})
        }, text, h('span', { class: 'chip-sub' }, n));
    }

    function card(p) {
        const t = THEMES.find(x => x.id === p.theme) || THEMES[4];
        return h('li', null,
            h('a', { class: 'card pr-card', href: Router.build('prophecy', [p.id]), style: { '--tone': UI.familyColor(t.tone) } },
                h('span', { class: 'pr-card-title display' }, p.title),
                h('span', { class: 'pr-card-note' }, p.note),
                h('span', { class: 'pr-card-refs' },
                    h('span', null, p.prophecyRefs.map(label).join('; ')),
                    icon('arrow-right', 'icon-sm'),
                    h('span', null, p.fulfilmentRefs.map(label).join('; ')))));
    }

    // ── Tab two: the Old Testament in the New ───────────────────────────
    function renderQuotes(route) {
        const ntBooks = Store.books.filter(b => b.testament === 'NT' && data.quotations.some(q => q.ntRef.book === b));
        const select = h('select', { class: 'field pr-select', 'aria-label': 'Filter by New Testament book' },
            h('option', { value: '' }, `All ${ntBooks.length} books`),
            ntBooks.map(b => h('option', { value: b.slug },
                `${b.name} (${data.quotations.filter(q => q.ntRef.book === b).length})`)));
        select.value = ntBooks.some(b => b.slug === route.query.book) ? route.query.book : '';
        const field = h('input', {
            class: 'field', type: 'search', placeholder: 'Find a reference, such as Isaiah 53',
            'aria-label': 'Find a quotation by reference or words', autocomplete: 'off', spellcheck: 'false', value: route.query.q || ''
        });
        const list = h('div', { class: 'pr-quotes' });
        const count = h('p', { class: 'pr-count', role: 'status' });

        const norm = s => s.toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
        const haystack = q => norm([q.nt, ...q.ot, q.formula || ''].join(' '));

        function refresh() {
            const wanted = select.value, text = norm(field.value);
            const shown = data.quotations.filter(q => (!wanted || q.ntRef.book.slug === wanted)
                && (!text || haystack(q).includes(text)));
            const groups = [];
            for (const q of shown) {
                const last = groups[groups.length - 1];
                if (last && last.book === q.ntRef.book) last.items.push(q); else groups.push({ book: q.ntRef.book, items: [q] });
            }
            list.replaceChildren(...groups.map(g => h('section', { class: 'pr-qgroup', 'aria-label': g.book.name },
                h('h2', { class: 'pr-qbook display' }, g.book.name, h('span', { class: 'pr-qcount' }, g.items.length)),
                h('ul', { class: 'pr-qlist' }, g.items.map(quoteRow)))));
            if (!shown.length) list.append(h('p', { class: 'pr-none' }, 'No quotation matches. Try a book name or chapter.'));
            count.textContent = `${shown.length} ${shown.length === 1 ? 'quotation' : 'quotations'}`;
            // Keep the address current so a filtered list can be shared; the base path follows.
            const query = { tab: 'quotes', book: wanted, q: field.value.trim() };
            Router.replace(Router.build('prophecy', [], query));
        }
        select.addEventListener('change', refresh);
        field.addEventListener('input', UI.debounce(refresh, 120));

        root.replaceChildren(h('div', { class: 'page pr-page' },
            head('Scripture quoting Scripture', ['The Old Testament ', h('em', null, 'in the New')],
                'Every place the New Testament quotes the Old, in the order of the New Testament. Each line shows where the words come from and how the writer introduces them.'),
            tabs('quotes'),
            h('div', { class: 'pr-tools pr-tools-quotes' },
                h('label', { class: 'pr-label' }, h('span', { class: 'eyebrow' }, 'Book'), select),
                h('div', { class: 'pr-search' }, icon('search'), field)),
            count, list));
        refresh();
    }

    function quoteRow(q) {
        return h('li', { class: 'pr-q' },
            h('span', { class: 'pr-q-nt' }, refLink(q.ntRef)),
            h('span', { class: 'pr-q-from' },
                h('span', { class: 'pr-q-quotes' }, 'quotes '), refLinks(q.otRefs),
                q.formula ? h('span', { class: 'pr-q-formula' }, `“${q.formula}”`) : null));
    }

    // ── One prophecy ────────────────────────────────────────────────────
    async function renderOne(id) {
        const t = ++token;
        const p = data.prophecies.find(x => x.id === id);
        if (!p) {
            root.replaceChildren(h('div', { class: 'page pr-page' },
                h('div', { class: 'pr-state rise', role: 'alert' },
                    h('p', { class: 'eyebrow' }, 'Not found'),
                    h('h1', null, 'We could not find that prophecy'),
                    h('p', { class: 'lede' }, 'Choose one from the list.'),
                    h('a', { class: 'btn btn-primary', href: Router.build('prophecy') }, 'All prophecies'))));
            return;
        }
        const i = data.prophecies.indexOf(p);
        const theme = THEMES.find(x => x.id === p.theme) || THEMES[4];
        const prev = data.prophecies[i - 1], next = data.prophecies[i + 1];
        const manifest = await BibleText.manifest();
        if (t !== token) return;
        const version = activeVersion(manifest);

        const column = (heading, refs) => h('section', { class: 'pr-col', 'aria-label': heading },
            h('h2', { class: 'eyebrow pr-col-title' }, heading),
            refs.map(r => passageBlock(r, version, manifest)));

        root.replaceChildren(h('div', { class: 'page pr-page' },
            h('nav', { class: 'pr-crumbs', 'aria-label': 'Breadcrumb' },
                h('a', { href: Router.build('prophecy') }, 'Prophecy fulfilled'), h('span', { 'aria-hidden': 'true' }, '/'),
                h('span', null, theme.label)),
            h('header', { class: 'pr-head rise' },
                h('p', { class: 'eyebrow' }, 'Spoken, then fulfilled'),
                h('h1', { class: 'pr-title' }, p.title),
                h('p', { class: 'lede' }, p.note),
                h('div', { class: 'pr-tools pr-share' }, shareTools(p))),
            h('div', { class: 'pr-pair' },
                column('The prophecy', p.prophecyRefs),
                h('span', { class: 'pr-arrow', 'aria-hidden': 'true' }, icon('arrow-right')),
                column('The fulfilment', p.fulfilmentRefs)),
            h('nav', { class: 'pr-pager', 'aria-label': 'Other prophecies' },
                pagerLink(prev, 'Previous'), pagerLink(next, 'Next'))));
    }

    // Print and Share for one prophecy.
    function shareTools(p) {
        return [
            h('button', { type: 'button', class: 'btn btn-sm', 'data-act': 'print', onclick: () => window.print() },
                icon('print', 'icon-sm'), 'Print'),
            h('button', {
                type: 'button', class: 'btn btn-sm', 'data-act': 'share',
                onclick: () => UI.share({ title: p.title, text: `${p.title} — prophecy and fulfilment`, url: window.location.href })
            }, icon('share', 'icon-sm'), 'Share')
        ];
    }

    function pagerLink(p, text) {
        if (!p) return h('span');
        return h('a', { class: `pr-pager-link${text === 'Next' ? ' is-next' : ''}`, href: Router.build('prophecy', [p.id]) },
            h('span', { class: 'eyebrow' }, text), h('span', { class: 'display' }, p.title));
    }

    function passageBlock(p, version, manifest) {
        const body = h('div', { class: 'scripture pr-text', lang: 'en', 'aria-busy': 'true' },
            h('div', { class: 'pr-skel' }), h('div', { class: 'pr-skel is-short' }));
        const foot = h('p', { class: 'pr-foot' });
        passage(p, version).then(found => {
            body.removeAttribute('aria-busy');
            if (!found) { body.replaceChildren(h('p', { class: 'pr-none' }, 'The text could not be loaded.')); return; }
            body.replaceChildren(...found.verses.map(({ v, text }) => h('span', { class: 'pr-verse' },
                h('sup', { class: 'pr-vn' }, String(v)), text, ' ')));
            const info = manifest?.versions.find(x => x.id === found.version);
            foot.textContent = info ? info.short : '';
        });
        return h('article', { class: 'pr-passage' },
            h('header', { class: 'pr-passage-head' },
                h('h3', { class: 'pr-passage-ref display' }, label(p)),
                h('a', { class: 'btn btn-sm btn-quiet', href: readHref(p), 'aria-label': `Read ${label(p)} in context` },
                    'Read in context', icon('arrow-right', 'icon-sm'))),
            body, foot);
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('prophecy');
        root.tabIndex = -1;
    }

    async function show(route) {
        const t = ++token;
        try { await load(); } catch { data = null; }
        if (t !== token) return;
        if (!data) {
            root.replaceChildren(h('div', { class: 'page pr-page' },
                h('div', { class: 'pr-state rise', role: 'alert' },
                    h('p', { class: 'eyebrow' }, 'Offline'),
                    h('h1', null, 'The prophecies could not be loaded'),
                    h('p', { class: 'lede' }, 'Check your connection and try again.'),
                    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => show(Router.current) }, 'Try again'))));
            return;
        }
        const [id] = route.parts;
        if (id) { await renderOne(id); return; }
        if (route.query.tab === 'quotes') renderQuotes(route); else renderFulfilled(route);
    }

    function title(route) {
        const [id] = route.parts;
        if (id) {
            const p = data?.prophecies.find(x => x.id === id);
            return p ? `${p.title}: prophecy fulfilled` : 'Prophecy fulfilled';
        }
        return route.query.tab === 'quotes' ? 'The Old Testament in the New' : 'Prophecy fulfilled';
    }

    // ── Study panel section ─────────────────────────────────────────────
    // For the verse on screen: where it is quoted, what it quotes, and the prophecies it
    // belongs to. Each link carries a one-line preview of the other passage.
    function preview(p, version) {
        const line = h('span', { class: 'pr-preview' }, '…');
        Study.verseText(label(p), version).then(text => {
            if (!text) { line.remove(); return; }
            const flat = text.replace(/\s+/g, ' ').trim();
            line.textContent = flat.length > PREVIEW ? `${flat.slice(0, PREVIEW).replace(/\s\S*$/, '')}…` : flat;
        }).catch(() => line.remove());
        return line;
    }
    const sectionRow = (p, version, note) => h('li', { class: 'pr-s-row' },
        h('span', { class: 'pr-s-ref' }, refLink(p), note || null), preview(p, version));

    async function render(ctx) {
        await load();
        const { book, chapter, verse, version } = ctx;
        const hit = p => covers(p, book, chapter, verse);

        const quotedIn = data.quotations.filter(q => q.otRefs.some(hit));
        const quoting = data.quotations.filter(q => hit(q.ntRef));
        const related = data.prophecies.filter(p => p.prophecyRefs.some(hit) || p.fulfilmentRefs.some(hit));
        if (!quotedIn.length && !quoting.length && !related.length) return null;

        const group = (title, items) => h('div', { class: 'pr-s-group' },
            h('h4', { class: 'pr-s-title' }, title), h('ul', { class: 'pr-s-list' }, items));

        return h('div', { class: 'pr-sec' },
            quotedIn.length ? group('Quoted in the New Testament',
                quotedIn.map(q => sectionRow(q.ntRef, version, q.formula ? h('span', { class: 'pr-s-note' }, ` · “${q.formula}”`) : null))) : null,
            quoting.length ? group('Quotes the Old Testament',
                quoting.flatMap(q => q.otRefs.map(o => sectionRow(o, version,
                    q.formula ? h('span', { class: 'pr-s-note' }, ` · “${q.formula}”`) : null)))) : null,
            related.length ? group('Prophecy and fulfilment', related.map(p => {
                const isForetold = p.prophecyRefs.some(hit);
                const others = isForetold ? p.fulfilmentRefs : p.prophecyRefs;
                return h('li', { class: 'pr-s-row' },
                    h('span', { class: 'pr-s-ref' },
                        h('a', { class: 'pr-ref', href: Router.build('prophecy', [p.id]) }, p.title),
                        h('span', { class: 'pr-s-note' }, isForetold ? ' · fulfilled in ' : ' · foretold in '),
                        refLinks(others)),
                    preview(others[0], version));
            })) : null);
    }

    if (typeof Study !== 'undefined' && Study.addSection) {
        Study.addSection({ id: 'prophecy', order: 20, title: 'Quotations and prophecy', render });
    }

    App.registerView('prophecy', { init, show, title });
    return {};
})();

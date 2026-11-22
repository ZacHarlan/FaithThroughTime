// parallel.js — passages that tell the same thing twice, side by side.
//
//   #/parallel            the index: the Gospels, Samuel–Kings and Chronicles, and other parallels
//   #/parallel/<id>       one section, its passages in columns (tabs on a phone)
//
// The data is data/parallels.json: groups of sections, each a few references. This file also
// registers two pieces of the study tools: a section in the verse panel ("Parallel accounts")
// and a group in the reader's chapter rail, both read from the same data.
const Parallel = (() => {
    const { h, icon } = UI;
    const DEFAULT_VERSION = 'esv';
    const LAST_RESORT = 'kjv';
    const BOOK_CACHE_MAX = 8;
    const LINE_GENRES = new Set(['wisdom']);        // poetry: one verse to a line, as in the reader
    const RAIL_LIMIT = 8;

    let root, token = 0;
    let data = null;                 // { groups, sections: [{ id, title, note, group, passages:[parsed] }], byId, byBook }
    let manifest = null;
    let bookIndex = null;
    const bookCache = new Map();     // "version/slug" → book JSON, least recently used first
    const dash = ref => ref.replace(/(\d)-(\d)/g, '$1–$2');

    // ── Data ────────────────────────────────────────────────────────────
    const normName = s => s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    function bookNamed(name) {
        if (!bookIndex) {
            bookIndex = new Map();
            for (const b of Store.books) {
                bookIndex.set(normName(b.name), b);
                bookIndex.set(b.slug.replace(/-/g, ' '), b);
            }
            const psalms = Store.book('psalms');
            if (psalms) bookIndex.set('psalm', psalms);
        }
        return bookIndex.get(normName(name)) || null;
    }

    function parsePassage(ref) {
        const p = BibleText.parseRef(ref);
        const book = p && bookNamed(p.book);
        if (!book) return null;
        return { ref, book, startCh: p.startCh, startV: p.startV, endCh: p.endCh, endV: p.endV };
    }

    let loading = null;
    function load() {
        if (data) return Promise.resolve(data);
        if (!loading) {
            loading = Api.getParallels().then(raw => {
                const sections = [], byId = new Map(), byBook = new Map();
                for (const group of raw.groups || []) {
                    for (const s of group.sections || []) {
                        const passages = (s.passages || []).map(parsePassage).filter(Boolean);
                        if (passages.length < 2) continue;
                        const section = { id: s.id, title: s.title, note: s.note || '', group, passages };
                        sections.push(section);
                        byId.set(s.id, section);
                        for (const p of passages) {
                            if (!byBook.has(p.book.slug)) byBook.set(p.book.slug, []);
                            if (!byBook.get(p.book.slug).includes(section)) byBook.get(p.book.slug).push(section);
                        }
                    }
                }
                data = { groups: raw.groups || [], sections, byId, byBook };
                return data;
            });
        }
        return loading;
    }

    const covers = (p, chapter, verse) =>
        (chapter > p.startCh || (chapter === p.startCh && verse >= (p.startV || 0)))
        && (chapter < p.endCh || (chapter === p.endCh && verse <= (p.endV || Infinity)));
    const touches = (p, chapter) => chapter >= p.startCh && chapter <= p.endCh;

    // The reader link for a passage: its first chapter, marking the verses when it stays in one chapter.
    function readHref(p) {
        const marks = p.startV && p.endCh === p.startCh
            ? (p.endV && p.endV !== p.startV ? `${p.startV}-${p.endV}` : String(p.startV)) : null;
        return Router.build('read', [p.book.slug, p.startCh], marks ? { v: marks } : {});
    }
    const parallelHref = id => Router.build('parallel', [id]);

    // ── Text ────────────────────────────────────────────────────────────
    async function loadBook(version, slug) {
        const key = `${version}/${slug}`;
        let book = bookCache.get(key);
        if (book) bookCache.delete(key);
        else book = await Api.getBibleBook(version, slug);
        bookCache.set(key, book);
        if (bookCache.size > BOOK_CACHE_MAX) bookCache.delete(bookCache.keys().next().value);
        return book;
    }

    // Resolves to { chapters: [{ chapter, verses: [{ v, text }] }], version } or null.
    async function loadPassage(p, wanted) {
        for (const version of [...new Set([wanted, DEFAULT_VERSION, LAST_RESORT])]) {
            try {
                const book = await loadBook(version, p.book.slug);
                const chapters = [];
                for (let c = p.startCh; c <= p.endCh; c++) {
                    const chap = book[String(c)];
                    if (!chap) throw new Error('missing chapter');
                    const nums = Object.keys(chap).map(Number).sort((a, b) => a - b);
                    const from = c === p.startCh && p.startV ? p.startV : nums[0];
                    const to = c === p.endCh && p.endV ? p.endV : nums[nums.length - 1];
                    const verses = nums.filter(n => n >= from && n <= to).map(v => ({ v, text: chap[String(v)] }));
                    if (!verses.length) throw new Error('no verses');
                    chapters.push({ chapter: c, verses });
                }
                return { chapters, version };
            } catch { /* try the next translation */ }
        }
        return null;
    }

    function activeVersion() {
        const saved = chosen || BibleText.getVersion();
        return manifest.versions.some(v => v.id === saved) ? saved : manifest.versions[0].id;
    }
    let chosen = null;
    const versionInfo = id => manifest.versions.find(v => v.id === id);

    // ── Index ───────────────────────────────────────────────────────────
    function renderIndex() {
        const input = h('input', {
            type: 'search', class: 'field par-find', placeholder: 'Search by title or reference, e.g. Mark 6 or Uzziah',
            'aria-label': 'Search parallel passages', autocomplete: 'off', spellcheck: 'false'
        });
        const status = h('p', { class: 'par-none', role: 'status', hidden: true }, 'Nothing matches. Try a book name or part of a title.');
        const groups = data.groups.map(group => {
            const rows = group.sections.filter(s => data.byId.has(s.id)).map(s => {
                const section = data.byId.get(s.id);
                const text = normName(`${s.title} ${s.passages.join(' ')} ${s.passages.map(r => r.replace(/[-–]/g, ' ')).join(' ')}`);
                const el = h('li', null, h('a', { class: 'par-row', href: parallelHref(s.id) },
                    h('span', { class: 'par-row-title' }, s.title),
                    h('span', { class: 'par-row-refs' }, section.passages.map(p => dash(p.ref)).join(' · '))));
                return { el, text };
            });
            const count = h('span', { class: 'read-count' }, `${rows.length}`);
            const list = h('ul', { class: 'par-list' }, rows.map(r => r.el));
            const el = h('section', { class: 'par-group', 'aria-labelledby': `par-g-${group.id}` },
                h('div', { class: 'par-group-head' },
                    h('h2', { id: `par-g-${group.id}` }, group.title), count),
                h('p', { class: 'lede par-intro' }, group.intro), list);
            return { el, rows, count };
        });

        function filter() {
            const q = normName(input.value).replace(/[-–]/g, ' ');
            const words = q.split(' ').filter(Boolean);
            let any = false;
            for (const g of groups) {
                let n = 0;
                for (const r of g.rows) {
                    const ok = words.every(w => r.text.includes(w));
                    r.el.hidden = !ok;
                    if (ok) n++;
                }
                g.el.hidden = n === 0;
                g.count.textContent = String(n);
                if (n) any = true;
            }
            status.hidden = any;
        }
        input.addEventListener('input', UI.debounce(filter, 80));

        root.replaceChildren(h('div', { class: 'page par-page' },
            h('header', { class: 'par-hero rise' },
                h('nav', { class: 'read-crumbs', 'aria-label': 'Breadcrumb' },
                    h('a', { href: '#/study' }, 'Study'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, 'Parallel passages')),
                h('p', { class: 'eyebrow' }, 'Parallel passages'),
                h('h1', { class: 'display' }, 'The same story, ', h('em', null, 'told twice.')),
                h('p', { class: 'lede' },
                    `${data.sections.length} places where Scripture tells the same thing in more than one voice. Open one to read the passages in columns, with the text of your chosen translation.`),
                h('div', { class: 'par-search' }, icon('search'), input)),
            status, groups.map(g => g.el)));
    }

    // ── One section, side by side ───────────────────────────────────────
    function neighbours(section) {
        const list = section.group.sections.filter(s => data.byId.has(s.id));
        const i = list.findIndex(s => s.id === section.id);
        return { prev: list[i - 1] ? data.byId.get(list[i - 1].id) : null, next: list[i + 1] ? data.byId.get(list[i + 1].id) : null };
    }

    let activeTab = 0;
    async function renderSection(section) {
        const t = ++token;
        activeTab = 0;
        const wanted = activeVersion();
        root.replaceChildren(h('div', { class: 'page par-page par-detail' },
            h('div', { class: 'par-loading', role: 'status' }, 'Loading the passages…')));
        const texts = await Promise.all(section.passages.map(p => loadPassage(p, wanted)));
        if (t !== token) return;

        const { prev, next } = neighbours(section);
        const n = section.passages.length;
        const sameBook = new Set(section.passages.map(p => p.book.slug)).size < n;
        const tabLabel = p => sameBook ? dash(p.ref) : p.book.name;
        const columns = section.passages.map((p, i) => column(p, texts[i], i));
        const tabs = h('div', { class: 'par-tabs', role: 'group', 'aria-label': 'Passage shown' },
            section.passages.map((p, i) => h('button', {
                type: 'button', class: 'par-tab', 'aria-pressed': String(i === activeTab), dataset: { i },
                onclick: () => selectTab(i)
            }, tabLabel(p))));
        function selectTab(i) {
            activeTab = i;
            tabs.querySelectorAll('.par-tab').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
            columns.forEach((c, j) => c.classList.toggle('is-active', j === i));
        }
        columns[0].classList.add('is-active');

        const fellBack = texts.some(x => x && x.version !== wanted);
        const used = [...new Set(texts.filter(Boolean).map(x => x.version))].map(versionInfo);
        const foot = used.map(v => v.label).join(' and ');
        root.replaceChildren(h('div', { class: 'page par-page par-detail' },
            h('header', { class: 'par-head rise' },
                h('nav', { class: 'read-crumbs', 'aria-label': 'Breadcrumb' },
                    h('a', { href: '#/study' }, 'Study'), h('span', { 'aria-hidden': 'true' }, '/'),
                    h('a', { href: '#/parallel' }, 'Parallel passages'), h('span', { 'aria-hidden': 'true' }, '/'),
                    h('span', null, section.group.title)),
                h('p', { class: 'eyebrow' }, section.group.title),
                h('h1', { class: 'par-title' }, section.title),
                section.note ? h('p', { class: 'par-note' }, section.note) : null,
                h('div', { class: 'read-tools par-tools' },
                    stepButton(prev, 'Previous section', 'chevron-left'),
                    stepButton(next, 'Next section', 'chevron-right'),
                    versionSwitch(wanted, section),
                    shareTools(section))),
            tabs,
            fellBack ? h('p', { class: 'read-notice', role: 'status' },
                `${versionInfo(wanted).short} is not available for every passage on this device. Showing ${used.map(v => v.short).join(' and ')}.`) : null,
            h('div', { class: 'par-cols', style: { '--cols': Math.min(4, n) }, dataset: { count: n } }, columns),
            h('p', { class: 'read-attrib' }, `${foot} · ${used.every(v => v.publicDomain) ? 'public domain' : 'includes copyrighted text'}`),
            h('nav', { class: 'read-pager', 'aria-label': 'Sections' }, pagerLink(prev, 'Previous'), pagerLink(next, 'Next'))));
        root.scrollTop = 0;
    }

    function column(p, text, i) {
        const lines = LINE_GENRES.has(p.book.genre);
        const head = h('header', { class: 'par-colhead' },
            h('h2', { class: 'par-ref' },
                h('a', { href: readHref(p), title: `Read ${dash(p.ref)} in the reader` }, dash(p.ref))),
            text ? h('span', { class: 'par-ver' }, versionInfo(text.version).short) : null);
        if (!text) {
            return h('article', { class: 'par-col', 'aria-label': dash(p.ref), dataset: { i } }, head,
                h('p', { class: 'par-missing' }, 'This passage could not be loaded. ',
                    h('a', { href: readHref(p) }, 'Open it in the reader.')));
        }
        const body = h('div', { class: `scripture par-text${lines ? ' is-lines' : ''}`, lang: 'en' },
            text.chapters.map((c, k) => [
                p.endCh > p.startCh ? h('p', { class: 'par-chapter' }, `${p.book.name} ${c.chapter}`) : null,
                c.verses.map(({ v, text: t }) => h('span', { class: 'par-v', dataset: { v } },
                    h('sup', { class: 'par-vn', 'aria-label': `Verse ${v}` }, String(v)), t, ' '))
            ]));
        return h('article', { class: 'par-col', 'aria-label': dash(p.ref), dataset: { i } }, head, body);
    }

    // Print and Share, in the tool row.
    function shareTools(section) {
        return [
            h('button', { type: 'button', class: 'btn btn-sm par-act', 'data-act': 'print', onclick: () => window.print() },
                icon('print', 'icon-sm'), 'Print'),
            h('button', {
                type: 'button', class: 'btn btn-sm par-act', 'data-act': 'share',
                onclick: () => UI.share({ title: section.title, text: `${section.title} — parallel passages`, url: window.location.href })
            }, icon('share', 'icon-sm'), 'Share')
        ];
    }

    function stepButton(target, label, name) {
        if (!target) return h('span', { class: 'icon-btn is-off', 'aria-hidden': 'true' }, icon(name));
        return h('a', {
            class: 'icon-btn read-step', href: parallelHref(target.id),
            'aria-label': `${label}: ${target.title}`, title: `${label}: ${target.title}`
        }, icon(name));
    }
    function pagerLink(target, label) {
        if (!target) return h('span');
        return h('a', { class: `read-pager-link${label === 'Next' ? ' is-next' : ''}`, href: parallelHref(target.id) },
            h('span', { class: 'eyebrow' }, label), h('span', { class: 'display' }, target.title));
    }
    function versionSwitch(active, section) {
        return h('div', { class: 'read-versions', role: 'group', 'aria-label': 'Translation' },
            manifest.versions.map(v => h('button', {
                type: 'button', class: 'read-version', 'aria-pressed': String(v.id === active), title: v.label,
                onclick: () => {
                    if (v.id === active) return;
                    BibleText.setVersion(v.id);
                    if (typeof Analytics !== 'undefined') Analytics.event('select_translation', { translation: v.id });
                    chosen = v.id;
                    renderSection(section);
                }
            }, v.short)));
    }

    function renderState(heading, message) {
        root.replaceChildren(h('div', { class: 'page par-page' },
            h('div', { class: 'read-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, 'Parallel passages'), h('h1', null, heading),
                h('p', { class: 'lede' }, message),
                h('div', { class: 'read-state-actions' }, h('a', { class: 'btn btn-primary', href: '#/parallel' }, 'See every parallel')))));
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('par');
        root.tabIndex = -1;
    }

    async function show(route) {
        const t = ++token;
        try {
            manifest = manifest || await BibleText.manifest();
            await load();
        } catch { /* handled below */ }
        if (t !== token) return;
        if (!data || !manifest) { renderState('Parallel passages are not available', 'They could not be loaded. Check your connection and try again.'); return; }
        const id = route.parts[0];
        if (!id) { renderIndex(); return; }
        const section = data.byId.get(id);
        if (!section) { renderState('We could not find that parallel', 'It may have been renamed. The index lists all of them.'); return; }
        return renderSection(section);
    }
    function hide() { token++; }
    function title(route) {
        const id = route.parts[0];
        if (!id) return 'Parallel passages';
        return data?.byId.get(id)?.title || 'Parallel passages';
    }

    App.registerView('parallel', { init, show, hide, title });

    // ── Study tools ─────────────────────────────────────────────────────
    // Verse panel: the other passages of every section that includes this verse.
    function verseSection(ctx) {
        return load().then(() => {
            const verse = Number(ctx.verse), chapter = Number(ctx.chapter);
            const found = (data.byBook.get(ctx.book.slug) || [])
                .filter(s => s.passages.some(p => p.book === ctx.book && covers(p, chapter, verse)));
            if (!found.length) return null;
            return h('div', { class: 'par-study' }, found.map(s => h('div', { class: 'par-study-item' },
                h('a', { class: 'par-study-title', href: parallelHref(s.id) }, s.title, icon('arrow-right', 'icon-sm')),
                h('ul', { class: 'par-study-refs' },
                    s.passages.filter(p => !(p.book === ctx.book && covers(p, chapter, verse))).map(p =>
                        h('li', null, h('a', { href: readHref(p) }, dash(p.ref))))),
                h('a', { class: 'par-study-open', href: parallelHref(s.id) }, 'Read side by side'))));
        }).catch(() => null);
    }

    // Reader rail: sections that touch this chapter.
    function chapterSection(ctx) {
        return load().then(() => {
            const chapter = Number(ctx.chapter);
            const found = (data.byBook.get(ctx.book.slug) || [])
                .filter(s => s.passages.some(p => p.book === ctx.book && touches(p, chapter)));
            if (!found.length) return null;
            return h('ul', { class: 'par-rail-list' }, found.slice(0, RAIL_LIMIT).map(s =>
                h('li', null, h('a', { class: 'par-rail-link', href: parallelHref(s.id) }, s.title))));
        }).catch(() => null);
    }

    if (typeof Study !== 'undefined') {
        if (Study.addSection) Study.addSection({ id: 'parallel', order: 30, title: 'Parallel accounts', render: verseSection });
        if (Study.addChapterSection) Study.addChapterSection({ id: 'parallel', order: 10, title: 'Parallel accounts', render: chapterSection });
    }
    return { load };
})();

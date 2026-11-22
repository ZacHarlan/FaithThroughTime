// study.js — the verse study panel, the study hub (#/study), and the small
// reference toolkit every study feature shares.
//
// Feature modules (loaded after this file) register what they add:
//   Study.addSection({ id, order, title, render(ctx) })     a section of the verse study panel
//       ctx = { book /* Store book */, chapter, verse, version /* on screen */, ref /* "John 3:16" */ }
//       render returns a Node, null (the section stays hidden) or a Promise of either.
//       Orders: 10 cross-references, 20 quotations and prophecy, 30 parallel accounts, 40 original words.
//   Study.addChapterSection({ id, order, render(ctx) })      a group in the reader's "In this chapter" rail
//       ctx = { book, chapter }. Render the whole group (heading included, e.g. a
//       .read-rail-group with an h3.read-rail-title), or pass `title` and Study adds the heading.
//
// References:
//   Study.parse("1 Sam 17:4-7")  → { book, startCh, startV, endCh, endV } | null
//   Study.format(p)              → "1 Samuel 17:4–7"   (book names as in Store.books, en dash in ranges)
//   Study.readHref(p)            → "#/read/1-samuel/17?v=4-7"
//   Study.refLink(text, { label }) → <a> to the reader (a plain <span> if the text is not a reference)
//   Study.verseText(text, version) → Promise<string|null>, falling back to the ESV, then the KJV
//
// The panel: Study.open(ctx) and Study.close(). In the reader the panel follows the route
// (#/read/john/3?study=16), so a study link can be shared; read.js calls Study.follow(route, ctx)
// whenever it shows a chapter. Wide screens dock the panel to the right of the text; phones get a
// bottom sheet that drags between half and full height, like the detail sheet.
const Study = (() => {
    const { h, icon } = UI;

    const BOOK_CACHE_MAX = 6;          // whole books are large; keep a few
    const MAX_VERSES = 60;             // verseText never joins more than this
    const HALF = 0.55;                 // phone half-snap height, as a share of the viewport
    const HIDE_MS = 560;               // a little longer than the slide-out
    const ONE_CHAPTER = new Set(['obadiah', 'philemon', '2-john', '3-john', 'jude']);

    const sections = [];               // { id, order, title, render }
    const chapterGroups = [];          // { id, order, title?, render }
    const byOrder = (a, b) => (a.order ?? 100) - (b.order ?? 100);

    function addSection(section) {
        if (!section || !section.id || typeof section.render !== 'function') return;
        const at = sections.findIndex(s => s.id === section.id);
        if (at >= 0) sections.splice(at, 1);
        sections.push(section);
        sections.sort(byOrder);
    }
    function addChapterSection(section) {
        if (!section || !section.id || typeof section.render !== 'function') return;
        const at = chapterGroups.findIndex(s => s.id === section.id);
        if (at >= 0) chapterGroups.splice(at, 1);
        chapterGroups.push(section);
        chapterGroups.sort(byOrder);
    }

    // ── Book names ──────────────────────────────────────────────────────
    // Built on first use: Store.books arrives with the dataset, after this file has run.
    const ALIASES = {
        'psalm': 'psalms', 'pss': 'psalms', 'psa': 'psalms', 'song of songs': 'song-of-solomon', 'canticles': 'song-of-solomon',
        'sos': 'song-of-solomon', 'qoh': 'ecclesiastes', 'eccles': 'ecclesiastes', 'jdg': 'judges', 'jdgs': 'judges',
        'mt': 'matthew', 'mk': 'mark', 'mrk': 'mark', 'lk': 'luke', 'jn': 'john', 'jhn': 'john', 'phil': 'philippians',
        'php': 'philippians', 'phm': 'philemon', 'jas': 'james', 'rev of john': 'revelation', 'revelations': 'revelation',
        'apoc': 'revelation', 'ezk': 'ezekiel', 'zec': 'zechariah', 'zep': 'zephaniah', 'ob': 'obadiah', 'nam': 'nahum',
        'jud': 'jude'
    };
    let index = null;                  // normalised name → book
    const norm = s => String(s).toLowerCase()
        .replace(/\./g, ' ')
        .replace(/^\s*(first|1st|i)\s+/, '1 ').replace(/^\s*(second|2nd|ii)\s+/, '2 ').replace(/^\s*(third|3rd|iii)\s+/, '3 ')
        .replace(/^([123])\s*(?=[a-z])/, '$1 ')
        .replace(/\s+/g, ' ').trim();

    function buildIndex() {
        index = new Map();
        for (const b of Store.books) {
            const names = [b.name, b.abbreviation, b.slug.replace(/-/g, ' ')];
            if (/s$/i.test(b.name)) names.push(b.name.slice(0, -1));
            for (const n of names) if (n) index.set(norm(n), b);
        }
        for (const [alias, slug] of Object.entries(ALIASES)) {
            const b = Store.book(slug);
            if (b) index.set(norm(alias), b);
        }
    }

    function findBook(name) {
        if (!Store.books || !Store.books.length) return null;
        if (!index) buildIndex();
        const key = norm(name);
        if (!key) return null;
        if (index.has(key)) return index.get(key);
        // A unique prefix of a full name: "matt", "1 sam", "rom", "hab". At least two letters.
        if (!/[a-z]{2}/.test(key)) return null;
        const hits = Store.books.filter(b => norm(b.name).startsWith(key));
        return hits.length === 1 ? hits[0] : null;
    }

    // ── Chapter and verse counts (from the Bible manifest, fetched once) ─
    let manifest = null;
    const manifestReady = () => (manifest ? Promise.resolve(manifest)
        : BibleText.manifest().then(m => { manifest = m; return m; }));
    const chapterCount = slug => manifest?.books.find(b => b.slug === slug)?.chapters || null;

    // ── Parsing and formatting references ───────────────────────────────
    //   "John 3:16"  "1 Sam 17:4-7"  "Psalm 23"  "Psalms 23–24"  "Genesis 1:1–2:3"  "Jude 3"  "John 3.16"
    const REF = /^\s*((?:[123]|i{1,3}|first|second|third|1st|2nd|3rd)?\s*[a-z][a-z .]*?)\.?\s*(\d+)(?:\s*[:.]\s*(\d+))?(?:\s*[-–—]\s*(?:(\d+)\s*[:.]\s*)?(\d+))?\s*$/i;

    function parse(text) {
        if (text == null) return null;
        const m = String(text).match(REF);
        if (!m) return null;
        const book = findBook(m[1]);
        if (!book) return null;
        let startCh = +m[2], startV = m[3] ? +m[3] : null;
        let endCh = startCh, endV = startV;
        if (m[4]) { endCh = +m[4]; endV = +m[5]; }           // "1:1–2:3"
        else if (m[5] && m[3]) endV = +m[5];                 // "3:16-18"
        else if (m[5]) { endCh = +m[5]; endV = null; }       // "23-24": chapters

        // In a one-chapter book a lone number is a verse: "Jude 3" is Jude 1:3.
        if (ONE_CHAPTER.has(book.slug) && !m[3] && !m[4]) {
            startV = startCh; endV = m[5] ? endCh : startCh;
            startCh = endCh = 1;
        }
        const count = chapterCount(book.slug);
        if (startCh < 1 || (count && endCh > count)) return null;
        if (endCh < startCh) return null;
        if (startV != null && startV < 1) return null;
        if (endCh === startCh && startV != null && endV != null && endV < startV) endV = startV;
        return { book, startCh, startV, endCh, endV };
    }

    function format(p) {
        if (!p || !p.book) return '';
        const { book, startCh, startV, endCh, endV } = p;
        let s = `${book.name} ${startCh}`;
        if (startV != null) s += `:${startV}`;
        if (endCh !== startCh) s += `–${endCh}${endV != null && startV != null ? `:${endV}` : ''}`;
        else if (startV != null && endV != null && endV !== startV) s += `–${endV}`;
        return s;
    }

    function readHref(p, extra = {}) {
        if (!p || !p.book) return '#/read';
        let v = null;
        if (p.startV != null) v = p.endCh === p.startCh && p.endV != null && p.endV !== p.startV ? `${p.startV}-${p.endV}` : `${p.startV}`;
        return Router.build('read', [p.book.slug, p.startCh], { v, ...extra });
    }

    function refLink(text, { label } = {}) {
        const p = typeof text === 'string' ? parse(text) : text;
        if (!p) return h('span', { class: 'study-ref is-plain' }, label || String(text ?? ''));
        return h('a', { class: 'study-ref', href: readHref(p) }, label || format(p));
    }

    // ── Bible text, through a small shared cache ────────────────────────
    const bookCache = new Map();       // "version/slug" → Promise<book JSON>, least recently used first
    function loadBook(version, slug) {
        const key = `${version}/${slug}`;
        let promise = bookCache.get(key);
        if (promise) bookCache.delete(key);
        else {
            promise = Api.getBibleBook(version, slug);
            promise.catch(() => bookCache.delete(key));
        }
        bookCache.set(key, promise);
        if (bookCache.size > BOOK_CACHE_MAX) bookCache.delete(bookCache.keys().next().value);
        return promise;
    }

    // The verses of a parsed reference in one translation: [{ c, v, text }], or null.
    async function versesOf(p, version) {
        const tries = [...new Set([version || currentVersion(), 'esv', 'kjv'])];
        for (const ver of tries) {
            try {
                const data = await loadBook(ver, p.book.slug);
                const out = [];
                for (let c = p.startCh; c <= p.endCh && out.length < MAX_VERSES; c++) {
                    const chap = data[String(c)];
                    if (!chap) continue;
                    const nums = Object.keys(chap).map(Number).sort((a, b) => a - b);
                    for (const v of nums) {
                        if (c === p.startCh && p.startV != null && v < p.startV) continue;
                        if (c === p.endCh && p.endV != null && v > p.endV) continue;
                        if (out.length >= MAX_VERSES) break;
                        out.push({ c, v, text: chap[String(v)] });
                    }
                }
                if (out.length) return { version: ver, verses: out };
            } catch { /* try the next translation */ }
        }
        return null;
    }

    async function verseText(text, version) {
        const p = typeof text === 'string' ? parse(text) : text;
        if (!p) return null;
        const got = await versesOf(p, version);
        return got ? got.verses.map(x => x.text).join(' ') : null;
    }

    // The translation the reader would show now.
    function currentVersion() {
        const saved = BibleText.getVersion();
        return !manifest || manifest.versions.some(v => v.id === saved) ? saved : manifest.versions[0].id;
    }
    const versionShort = id => manifest?.versions.find(v => v.id === id)?.short || String(id || '').toUpperCase();

    // ── The panel ───────────────────────────────────────────────────────
    let panel, bar, barRef, scroller, body, prevBtn, nextBtn, live;
    let isOpen = false, ctxNow = null, keyNow = null, token = 0;
    let returnFocus = null, releaseTrap = null, hideTimer = 0, emptyNote = null;

    function ensurePanel() {
        if (panel) return;
        barRef = h('p', { class: 'sp-bar-ref', 'aria-hidden': 'true' });
        prevBtn = h('button', { type: 'button', class: 'icon-btn sp-step', 'aria-label': 'Previous verse', title: 'Previous verse', onclick: () => step(-1) }, icon('chevron-left'));
        nextBtn = h('button', { type: 'button', class: 'icon-btn sp-step', 'aria-label': 'Next verse', title: 'Next verse', onclick: () => step(1) }, icon('chevron-right'));
        bar = h('div', { class: 'sp-bar' },
            h('span', { class: 'sp-handle', 'aria-hidden': 'true' }),
            h('span', { class: 'eyebrow sp-bar-label' }, 'Study'),
            barRef,
            h('div', { class: 'sp-bar-tools' },
                prevBtn, nextBtn,
                h('button', { type: 'button', class: 'icon-btn sp-close', 'aria-label': 'Close study', title: 'Close (Esc)', onclick: () => close() }, icon('close'))));
        body = h('div', { class: 'sp-body' });
        scroller = h('div', { class: 'sp-scroll' }, body);
        live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
        panel = h('aside', { id: 'study-panel', class: 'study-panel', hidden: true, 'aria-labelledby': 'sp-title' }, bar, scroller, live);
        document.body.append(panel);

        document.addEventListener('keydown', onKeydown);
        panel.addEventListener('keydown', onPanelKey);
        bar.addEventListener('pointerdown', onDragStart);
        scroller.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', UI.debounce(onResize, 120));
    }

    function onKeydown(e) {
        if (e.key !== 'Escape' || !isOpen || e.defaultPrevented) return;
        if (Router.current.view !== 'read') return;              // a sheet is over the reader: it closes first
        if (document.querySelector('#search:not([hidden]), #share:not([hidden]), .read-pop:not([hidden])')) return;
        e.preventDefault();
        close();
    }

    // Inside the panel, left and right step through verses rather than turning the chapter.
    function onPanelKey(e) {
        if (!/^Arrow(Left|Right)$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        e.stopPropagation();
        e.preventDefault();
        step(e.key === 'ArrowRight' ? 1 : -1);
    }

    // ctx: { book (Store book or slug), chapter, verse, version? }
    function normalise(ctx) {
        if (!ctx) return null;
        const book = typeof ctx.book === 'string' ? (Store.book(ctx.book) || findBook(ctx.book)) : ctx.book;
        const chapter = Number(ctx.chapter), verse = Number(ctx.verse);
        if (!book || !Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(verse) || verse < 1) return null;
        const version = ctx.version || currentVersion();
        return { book, chapter, verse, version, ref: `${book.name} ${chapter}:${verse}` };
    }

    const readerShows = (book, chapter) => {
        const r = Router.current;
        return r.view === 'read' && r.parts[0] === book.slug && Number(r.parts[1]) === chapter;
    };
    const studyHref = (book, chapter, verse) => {
        const q = readerShows(book, chapter) ? { ...Router.current.query } : {};
        q.study = verse;
        return Router.build('read', [book.slug, chapter], q);
    };

    // Open the panel on one verse. In the reader on that chapter, the panel opens and the URL
    // follows; anywhere else, the reader opens on the chapter with the panel.
    function open(raw, { focus = true } = {}) {
        const ctx = normalise(raw);
        if (!ctx) return;
        if (!readerShows(ctx.book, ctx.chapter)) { Router.go(studyHref(ctx.book, ctx.chapter, ctx.verse)); return; }
        if (!isOpen) Analytics.event('study_verse', { ref: ctx.ref });
        show(ctx, { focus });
        Router.replace(studyHref(ctx.book, ctx.chapter, ctx.verse));
    }

    // Close the panel; in the reader the ?study= mark leaves the URL too.
    function close({ silent = false } = {}) {
        hidePanel();
        if (silent) return;
        const r = Router.current;
        if (r.view === 'read' && r.query.study != null) {
            const q = { ...r.query };
            delete q.study;
            Router.replace(Router.build('read', r.parts, q));
        }
    }

    // read.js calls this whenever it shows a chapter, so the panel matches the URL.
    function follow(route, { book, chapter, version }) {
        const verse = Number(route.query.study);
        if (!Number.isInteger(verse) || verse < 1) { hidePanel(); return; }
        show(normalise({ book, chapter, verse, version }), { focus: !isOpen });
    }

    function show(ctx, { focus }) {
        if (!ctx) return;
        ensurePanel();
        const key = `${ctx.book.slug}/${ctx.chapter}/${ctx.verse}/${ctx.version}`;
        markVerse(ctx);
        if (isOpen && key === keyNow) return;
        keyNow = key;
        ctxNow = ctx;
        const arriving = !isOpen;
        if (arriving) {
            clearTimeout(hideTimer);
            if (!panel.contains(document.activeElement)) returnFocus = document.activeElement;
            isOpen = true;
            panel.hidden = false;
            document.body.classList.add('study-open');
        }
        fill(ctx);
        if (arriving) {
            if (UI.isMobile()) {
                panel.classList.add('is-dragging');
                setSheetY(sheetOffset('closed'));
                panel.getBoundingClientRect();
                panel.classList.remove('is-dragging');
                snapTo('half');
                releaseTrap = UI.trapFocus(panel);
            } else {
                panel.getBoundingClientRect();
            }
            panel.classList.add('is-open');
        }
        if (focus) body.querySelector('#sp-title')?.focus({ preventScroll: true });
        else if (!arriving) live.textContent = `Studying ${ctx.ref}`;     // moved by the step buttons
        requestAnimationFrame(() => revealVerse(ctx));
    }

    function hidePanel() {
        if (!isOpen) return;
        const studied = ctxNow;
        isOpen = false;
        keyNow = null;
        ctxNow = null;
        token++;
        panel.classList.remove('is-open');
        document.body.classList.remove('study-open');
        if (UI.isMobile()) setSheetY(sheetOffset('closed'));
        for (const el of document.querySelectorAll('#view-read .verse.is-studied')) el.classList.remove('is-studied');
        const rail = document.querySelector('#view-read .read-rail[data-study-folded]');
        if (rail) { delete rail.dataset.studyFolded; rail.open = !UI.isMobile(); }
        const hadFocus = panel.contains(document.activeElement);
        releaseTrap?.();                   // puts focus back where it was before the sheet
        releaseTrap = null;
        if (hadFocus && panel.contains(document.activeElement)) {
            // Back to what opened the panel; after a shared link, to the verse it studied.
            const back = returnFocus && returnFocus !== document.body && document.contains(returnFocus) && returnFocus.offsetParent !== null
                ? returnFocus
                : document.querySelector(`#view-read .verse[data-v="${studied?.verse}"] .vn`) || document.getElementById('view-read');
            back?.focus({ preventScroll: true });
        }
        returnFocus = null;
        hideTimer = setTimeout(() => { panel.hidden = true; body.replaceChildren(); }, HIDE_MS);
    }

    // ── Panel content ───────────────────────────────────────────────────
    function fill(ctx) {
        const t = ++token;
        barRef.textContent = ctx.ref;
        bar.classList.remove('is-titled');
        const quote = h('blockquote', { class: 'scripture sp-verse', 'aria-busy': 'true' },
            h('span', { class: 'sp-skel' }), h('span', { class: 'sp-skel is-short' }));
        const versionTag = h('span', { class: 'sp-version' });
        const title = h('h2', { id: 'sp-title', class: 'sp-title', tabindex: '-1' }, ctx.ref);
        emptyNote = h('p', { class: 'sp-empty', hidden: true }, 'Nothing more to show for this verse yet.');
        body.replaceChildren(...[
            h('header', { class: 'sp-head' },
                title,
                quote,
                h('p', { class: 'sp-meta' }, versionTag,
                    h('a', { class: 'sp-meta-link', href: Router.build('read', [ctx.book.slug, ctx.chapter], { v: ctx.verse }) }, 'Open in the reader'))),
            sections.length ? null : h('p', { class: 'sp-empty' }, 'Study tools are loading.'),
            sections.map(s => sectionShell(s, ctx, t)),
            emptyNote].flat().filter(Boolean));
        scroller.scrollTop = 0;
        stepState(ctx);

        manifestReady().then(() => versesOf({ book: ctx.book, startCh: ctx.chapter, startV: ctx.verse, endCh: ctx.chapter, endV: ctx.verse }, ctx.version))
            .then(got => {
                if (t !== token) return;
                quote.removeAttribute('aria-busy');
                if (!got) { quote.replaceChildren(h('span', { class: 'sp-missing' }, 'This verse could not be loaded.')); return; }
                quote.replaceChildren(got.verses[0].text);
                versionTag.textContent = versionShort(got.version);
            })
            .catch(() => { if (t === token) quote.replaceChildren(h('span', { class: 'sp-missing' }, 'This verse could not be loaded.')); });
        titleWatch(title);
    }

    // The bar shows the reference once the heading has scrolled away.
    let titleObserver = null;
    function titleWatch(title) {
        if (!('IntersectionObserver' in window)) return;
        if (!titleObserver) {
            titleObserver = new IntersectionObserver(([entry]) => bar.classList.toggle('is-titled', !entry.isIntersecting),
                { root: scroller, threshold: 0 });
        }
        titleObserver.disconnect();
        titleObserver.observe(title);
    }

    function sectionShell(section, ctx, t) {
        const content = h('div', { class: 'sp-sec-body', 'aria-busy': 'true' },
            h('span', { class: 'sp-skel' }), h('span', { class: 'sp-skel' }), h('span', { class: 'sp-skel is-short' }));
        const el = h('section', { class: 'sp-sec', dataset: { section: section.id }, 'aria-labelledby': `sp-sec-${section.id}` },
            h('h3', { class: 'sp-sec-title', id: `sp-sec-${section.id}` }, section.title || section.id),
            content);
        const done = node => {
            if (t !== token) return;
            if (!node) { el.hidden = true; settleEmpty(); return; }
            content.removeAttribute('aria-busy');
            content.replaceChildren(node);
            settleEmpty();
        };
        const failed = err => {
            if (t !== token) return;
            el.hidden = true;
            settleEmpty();
            el.dataset.error = String(err?.message || err);     // hidden, but findable when debugging
        };
        try {
            const result = section.render({ ...ctx });
            if (result && typeof result.then === 'function') result.then(done, failed);
            else done(result);
        } catch (err) { failed(err); }
        return el;
    }

    // When every section has finished and none had anything, say so.
    function settleEmpty() {
        const all = [...body.querySelectorAll('.sp-sec')];
        const pending = all.some(s => !s.hidden && s.querySelector('.sp-sec-body[aria-busy]'));
        if (emptyNote) emptyNote.hidden = pending || all.some(s => !s.hidden);
    }

    // ── Moving between verses ───────────────────────────────────────────
    const verseCounts = new Map();         // "version/slug/chapter" → number of verses
    async function versesIn(book, chapter, version) {
        const key = `${version}/${book.slug}/${chapter}`;
        if (verseCounts.has(key)) return verseCounts.get(key);
        for (const ver of [...new Set([version, 'esv', 'kjv'])]) {
            try {
                const chap = (await loadBook(ver, book.slug))[String(chapter)];
                if (!chap) continue;
                const n = Math.max(...Object.keys(chap).map(Number));
                verseCounts.set(key, n);
                return n;
            } catch { /* next */ }
        }
        return null;
    }

    function neighbourChapter(book, chapter, dir) {
        const count = chapterCount(book.slug);
        if (count && chapter + dir >= 1 && chapter + dir <= count) return { book, chapter: chapter + dir };
        const other = Store.books[Store.books.indexOf(book) + dir];
        if (!other) return null;
        return { book: other, chapter: dir > 0 ? 1 : chapterCount(other.slug) };
    }

    async function stepState(ctx) {
        await manifestReady();
        const n = await versesIn(ctx.book, ctx.chapter, ctx.version);
        if (ctx !== ctxNow) return;
        const atStart = ctx.verse <= 1 && !neighbourChapter(ctx.book, ctx.chapter, -1);
        const atEnd = n != null && ctx.verse >= n && !neighbourChapter(ctx.book, ctx.chapter, 1);
        prevBtn.disabled = atStart;
        nextBtn.disabled = atEnd;
    }

    // Steps run one after another, so quick presses each move one verse from where the last one landed.
    let stepQueue = Promise.resolve();
    function step(dir) {
        stepQueue = stepQueue.then(() => stepNow(dir)).catch(() => { /* a failed load leaves the verse as it is */ });
        return stepQueue;
    }
    async function stepNow(dir) {
        const ctx = ctxNow;
        if (!ctx) return;
        await manifestReady();
        const n = await versesIn(ctx.book, ctx.chapter, ctx.version);
        if (ctx !== ctxNow) return;
        const v = ctx.verse + dir;
        if (v >= 1 && (n == null || v <= n)) {
            open({ book: ctx.book, chapter: ctx.chapter, verse: v, version: ctx.version }, { focus: false });   // keep focus on the step button
            return;
        }
        const to = neighbourChapter(ctx.book, ctx.chapter, dir);
        if (!to || !to.chapter) return;
        const verse = dir > 0 ? 1 : await versesIn(to.book, to.chapter, ctx.version);
        if (verse) Router.go(studyHref(to.book, to.chapter, verse));
    }

    // Mark the verse in the reader's text and keep it in sight beside (or above) the panel.
    function markVerse(ctx) {
        for (const el of document.querySelectorAll('#view-read .verse.is-studied')) el.classList.remove('is-studied');
        if (!readerShows(ctx.book, ctx.chapter)) return;
        document.querySelector(`#view-read .verse[data-v="${ctx.verse}"]`)?.classList.add('is-studied');
        // Between tablet and very wide the rail folds above the text while studying (study.css):
        // fold it shut once, so the text is not pushed out of sight.
        const rail = document.querySelector('#view-read .read-rail');
        if (rail && !rail.dataset.studyFolded && window.matchMedia('(min-width: 1020px) and (max-width: 1499px)').matches) {
            rail.dataset.studyFolded = '1';
            rail.open = false;
        }
    }
    function revealVerse(ctx) {
        const view = document.getElementById('view-read');
        const verse = view?.querySelector(`.verse[data-v="${ctx.verse}"]`);
        if (!verse || !readerShows(ctx.book, ctx.chapter)) return;
        const box = view.getBoundingClientRect();
        const top = box.top + 12;
        const bottom = UI.isMobile() ? window.innerHeight * (1 - HALF) - 12 : box.bottom - 12;
        const r = verse.getBoundingClientRect();
        if (r.top >= top && r.bottom <= bottom) return;
        const target = UI.isMobile() ? r.top - top - 24 : r.top - (top + bottom) / 2 + r.height / 2;
        view.scrollBy({ top: target, behavior: UI.reducedMotion() ? 'auto' : 'smooth' });
    }

    // ── Phone sheet: snap heights and dragging (as in detail.js) ────────
    let snap = 'half', sheetY = 0, drag = null;
    function sheetOffset(name) {
        const height = panel.offsetHeight;
        if (name === 'full') return 0;
        if (name === 'half') return Math.max(0, height - window.innerHeight * HALF);
        return height;
    }
    function setSheetY(y) { sheetY = y; panel.style.setProperty('--y', `${y}px`); }
    function snapTo(name) {
        snap = name;
        panel.classList.toggle('is-full', name === 'full');
        setSheetY(sheetOffset(name));
    }
    function onDragStart(e) {
        if (!UI.isMobile() || !isOpen || e.button > 0 || e.target.closest('button')) return;
        drag = { startY: e.clientY, from: sheetY, moved: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
        bar.setPointerCapture(e.pointerId);
        bar.addEventListener('pointermove', onDragMove);
        bar.addEventListener('pointerup', onDragEnd);
        bar.addEventListener('pointercancel', onDragEnd);
    }
    function onDragMove(e) {
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.abs(dy) < 4) return;
        if (!drag.moved) { drag.moved = true; panel.classList.add('is-dragging'); }
        const y = drag.from + dy;
        setSheetY(y < 0 ? y / 4 : y);
        drag.samples.push({ y: e.clientY, t: e.timeStamp });
        if (drag.samples.length > 5) drag.samples.shift();
    }
    function onDragEnd() {
        bar.removeEventListener('pointermove', onDragMove);
        bar.removeEventListener('pointerup', onDragEnd);
        bar.removeEventListener('pointercancel', onDragEnd);
        panel.classList.remove('is-dragging');
        const { moved, samples } = drag;
        drag = null;
        if (!moved) { snapTo(snap === 'half' ? 'full' : 'half'); return; }
        const first = samples[0], last = samples[samples.length - 1];
        const velocity = (last.y - first.y) / Math.max(1, last.t - first.t);
        const projected = sheetY + velocity * 180;
        const nearest = ['full', 'half', 'closed'].reduce((best, name) =>
            Math.abs(sheetOffset(name) - projected) < Math.abs(sheetOffset(best) - projected) ? name : best);
        if (nearest === 'closed') close();
        else snapTo(nearest);
    }
    function onScroll() {
        if (isOpen && UI.isMobile() && snap === 'half' && scroller.scrollTop > 8) snapTo('full');
    }
    function onResize() {
        if (!isOpen) return;
        if (UI.isMobile()) {
            snapTo(snap);
            if (!releaseTrap) releaseTrap = UI.trapFocus(panel);
        } else {
            panel.style.removeProperty('--y');
            if (releaseTrap) { const r = releaseTrap; releaseTrap = null; r(); }
        }
    }

    // ── The reader's rail: chapter groups from the study features ───────
    // Returns the nodes to append; each fills itself in when its data arrives
    // and stays hidden if it has nothing for this chapter.
    function chapterSections({ book, chapter }) {
        return chapterGroups.map(group => {
            const slot = h('div', { class: 'study-rail-slot', hidden: true, dataset: { section: group.id } });
            const done = node => {
                if (!node) return;
                slot.replaceChildren(group.title
                    ? h('div', { class: 'read-rail-group' }, h('h3', { class: 'read-rail-title' }, group.title), node)
                    : node);
                slot.hidden = false;
            };
            const failed = err => { slot.hidden = true; slot.dataset.error = String(err?.message || err); };
            try {
                const result = group.render({ book, chapter });
                if (result && typeof result.then === 'function') result.then(done, failed);
                else done(result);
            } catch (err) { failed(err); }
            return slot;
        });
    }

    // ── The hub: #/study ────────────────────────────────────────────────
    const TOOLS = [
        { href: '#/find', icon: 'search', tone: 'blue', title: 'Search Scripture', text: 'Find every verse that uses a word or phrase, across the whole Bible.' },
        { href: '#/plan', icon: 'calendar', fallback: 'book', tone: 'green', title: 'Reading plan', text: 'Read the whole Bible in a year, in the order the events happened.' },
        { href: '#/kings', icon: 'crown', tone: 'crimson', title: 'Kings and prophets', text: 'The kings of Israel and Judah side by side, and the prophets who spoke to them.' },
        { href: '#/parallel', icon: 'swap', tone: 'teal', title: 'Parallel passages', text: 'The same events told in more than one book, read side by side.' },
        { href: '#/prophecy', icon: 'scroll', tone: 'violet', title: 'Quotations and prophecy', text: 'Where the New Testament quotes the Old, and the promises it says were fulfilled.' },
        { href: '#/word', icon: 'sparkle', tone: 'gold', title: 'Word study', text: 'The Hebrew and Greek behind the English: what a word means and everywhere it is used.' },
        { href: '#/topic', icon: 'filter', tone: 'blue', title: 'Topical Bible', text: 'Follow a subject, such as faith, prayer or covenant, through the whole Bible.' },
        { href: '#/dictionary', icon: 'book', tone: 'green', title: 'Bible dictionary', text: 'Easton’s entries on the people, places and things of Scripture.' },
        { href: '#/guide', icon: 'info', tone: 'crimson', title: 'Guides', text: 'The covenants, the feasts of Israel and the tabernacle, with the passages beside each.' },
        { href: '#/place', icon: 'pin', tone: 'teal', title: 'Places', text: 'Every place on the map: what happened there, and the verses that name it.' }
    ];

    let hubRoot = null;
    function hubInit(el) {
        hubRoot = el;
        el.classList.add('study');
        el.tabIndex = -1;
        el.append(hubPage());
    }

    function hubPage() {
        const example = Router.build('read', ['john', 3], { study: 16 });
        return h('div', { class: 'page study-page' },
            h('header', { class: 'study-hero rise' },
                h('p', { class: 'eyebrow' }, 'Study'),
                h('h1', null, 'Go ', h('em', null, 'deeper'), ' into the text'),
                h('p', { class: 'lede' }, 'Tools for reading Scripture closely: follow a verse to the passages that echo it, read the same story told twice, and see the words behind the words.')),
            h('a', { class: 'card study-verse rise', href: example },
                h('span', { class: 'study-verse-copy' },
                    h('span', { class: 'eyebrow' }, 'Study a verse'),
                    h('span', { class: 'study-verse-title display' }, 'Every verse opens a study'),
                    h('span', { class: 'study-verse-text' },
                        'Open any chapter, choose a verse by tapping it, and press ', h('strong', null, 'Study'),
                        '. Cross-references, quotations, parallel accounts and the original words appear beside the text.'),
                    h('span', { class: 'study-verse-go' }, 'Try it with John 3:16', icon('arrow-right', 'icon-sm'))),
                h('span', { class: 'study-verse-mock', 'aria-hidden': 'true' },
                    h('span', { class: 'study-verse-ref' }, 'John 3:16'),
                    h('span', { class: 'study-verse-line' }), h('span', { class: 'study-verse-line' }),
                    h('span', { class: 'study-verse-line is-short' }),
                    h('span', { class: 'study-verse-chips' }, ['Numbers 21:9', 'Romans 5:8', '1 John 4:9'].map(r => h('span', null, r))))),
            h('section', { class: 'study-tools', 'aria-labelledby': 'study-tools-h' },
                h('h2', { id: 'study-tools-h', class: 'study-tools-title' }, 'Study tools'),
                h('ul', { class: 'study-grid' }, TOOLS.map(toolCard))),
            h('p', { class: 'study-foot' },
                'Prefer to start from the text? ', h('a', { href: '#/read' }, 'Open the library'), '.'));
    }

    function toolCard(tool) {
        const hasIcon = name => !!document.getElementById(`i-${name}`);
        return h('li', null,
            h('a', { class: 'card study-card', href: tool.href, style: { '--tone': `var(--fam-${tool.tone})` } },
                h('span', { class: 'study-card-icon' }, icon(hasIcon(tool.icon) ? tool.icon : (tool.fallback || 'book'))),
                h('span', { class: 'study-card-title display' }, tool.title),
                h('span', { class: 'study-card-text' }, tool.text),
                h('span', { class: 'study-card-go', 'aria-hidden': 'true' }, 'Open', icon('arrow-right', 'icon-sm'))));
    }

    App.registerView('study', {
        init: hubInit,
        show() { if (hubRoot) hubRoot.scrollTop = 0; },
        title: () => 'Study tools'
    });
    App.on('data-ready', () => { manifestReady(); });

    return {
        addSection, addChapterSection, open, close, parse, format, readHref, refLink, verseText,
        // For read.js and the feature modules:
        follow, chapterSections, currentVersion,
        get isOpen() { return isOpen; },
        get context() { return ctxNow ? { ...ctxNow } : null; }
    };
})();

// read.js — the scripture reader: a library of the sixty-six books, a calm
// chapter page, and a rail that leads from the text back into history.
//
//   #/read                      the library
//   #/read/<book>[/<chapter>]   a chapter (?v=3-7 softly marks verses; ?study=16 opens the verse study panel)
const Read = (() => {
    const { h, icon } = UI;
    const LAST_KEY = 'ftt-read-last';
    const DEFAULT_VERSION = 'esv';
    const LAST_RESORT = 'kjv';          // complete and public domain: used if a chapter is missing elsewhere
    const RAIL_LIMIT = 10;
    const BOOK_CACHE_MAX = 4;   // whole books are large; keep the few being read

    // Genres arrive as lowercase words; these are how they read on the page,
    // and which of the eight colour families tints them.
    const GENRES = {
        law: { label: 'Law', tone: 'law' },
        history: { label: 'History', tone: 'creation' },
        wisdom: { label: 'Wisdom and poetry', tone: 'worship' },
        prophecy: { label: 'The prophets', tone: 'judgment' },
        gospel: { label: 'The Gospels', tone: 'miracle' },
        epistle: { label: 'Letters', tone: 'mission' },
        apocalyptic: { label: 'Apocalypse', tone: 'prophecy' }
    };
    const genreLabel = g => GENRES[g]?.label || (g ? g[0].toUpperCase() + g.slice(1) : 'Scripture');
    const genreTone = g => UI.familyColor(GENRES[g]?.tone);
    // Wisdom books are poetry: one verse to a line reads better than a block.
    const LINE_GENRES = new Set(['wisdom']);

    let root, token = 0, manifest = null;
    let bookIndex = null;        // normalised name → book
    let linked = null;           // slug → chapter → { people, events }
    const bookCache = new Map(); // "version/slug" → book JSON, least recently used first
    let closePicker = null;
    let chosen = null;           // translation picked this visit, in case storage is blocked
    let selection = new Set();
    let current = null;          // { book, chapter, verses, version, wanted, v } of the chapter on screen

    // ── Small helpers ───────────────────────────────────────────────────
    const store = {
        get(key) { try { return localStorage.getItem(key); } catch { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }
    };
    const readHref = (slug, chapter, verses) => Router.build('read', [slug, chapter], verses ? { v: verses } : {});
    const normName = s => s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    const publicUrl = hash => window.location.origin + window.location.pathname + hash;

    function lastPosition() {
        try {
            const p = JSON.parse(store.get(LAST_KEY));
            return p && Store.book(p.slug) ? p : null;
        } catch { return null; }
    }

    // Every way someone might type a book: its name, abbreviation or slug,
    // plus the singular of a plural name ("psalm") and the one common variant
    // the Bible text module also accepts.
    function buildBookIndex() {
        bookIndex = new Map();
        for (const b of Store.books) {
            const names = [b.name, b.abbreviation, b.slug.replace(/-/g, ' ')];
            if (/s$/i.test(b.name)) names.push(b.name.slice(0, -1));
            for (const n of names) if (n) bookIndex.set(normName(n), b);
        }
        const song = Store.books.find(b => /^song/i.test(b.name));
        if (song) bookIndex.set('song of songs', song);
    }
    const bookNamed = name => bookIndex.get(normName(name)) || null;

    // ── Which people and events stand in which chapter ──────────────────
    // Built once from the dataset's own scripture references. A range such
    // as "Genesis 1:26–5:5" counts for every chapter it touches.
    function buildLinked() {
        linked = new Map();
        const add = (entity, ref) => {
            const p = BibleText.parseRef(ref);
            const book = p && bookNamed(p.book);
            if (!book) return;
            if (!linked.has(book.slug)) linked.set(book.slug, new Map());
            const chapters = linked.get(book.slug);
            for (let c = p.startCh; c <= Math.max(p.startCh, p.endCh); c++) {
                if (!chapters.has(c)) chapters.set(c, { people: new Set(), events: new Set() });
                chapters.get(c)[entity.kind === 'person' ? 'people' : 'events'].add(entity);
            }
        };
        for (const e of [...Store.people, ...Store.events]) {
            for (const s of e.scripture) add(e, s.ref);
        }
    }
    const linkedIn = (slug, chapter) => linked.get(slug)?.get(chapter) || { people: new Set(), events: new Set() };
    const byImportance = (a, b) =>
        Store.SIG_RANK[a.significance] - Store.SIG_RANK[b.significance]
        || (a.span?.start ?? 1e9) - (b.span?.start ?? 1e9);

    // ── Text loading, with a quiet fall back to the default translation ─
    // BibleText keeps its own copy of each book it opens but does not expose it, so the
    // reader caches here too, bounded so a long reading session does not hold every book.
    async function loadBook(version, slug) {
        const key = `${version}/${slug}`;
        let book = bookCache.get(key);
        if (book) bookCache.delete(key);                  // re-inserted below as most recent
        else book = await Api.getBibleBook(version, slug);
        bookCache.set(key, book);
        if (bookCache.size > BOOK_CACHE_MAX) bookCache.delete(bookCache.keys().next().value);
        return book;
    }
    function activeVersion() {
        const saved = chosen || BibleText.getVersion();
        return manifest.versions.some(v => v.id === saved) ? saved : manifest.versions[0].id;
    }
    function versionInfo(id) { return manifest.versions.find(v => v.id === id); }

    // Resolves to { version, verses, fellBack } or null when nothing loads.
    async function loadChapter(slug, chapter, wanted) {
        const tries = [...new Set([wanted, DEFAULT_VERSION, LAST_RESORT])];
        for (const version of tries) {
            try {
                const chap = (await loadBook(version, slug))[String(chapter)];
                if (!chap) continue;
                const verses = Object.keys(chap).map(Number).sort((a, b) => a - b)
                    .map(v => ({ v, text: chap[String(v)] }));
                return { version, verses, fellBack: version !== wanted };
            } catch { /* try the next translation */ }
        }
        return null;
    }

    // ── Chapter order, across book boundaries ───────────────────────────
    function chapterCount(slug) { return manifest.books.find(b => b.slug === slug)?.chapters || 0; }
    function neighbour(book, chapter, step) {
        const next = chapter + step;
        if (next >= 1 && next <= chapterCount(book.slug)) return { book, chapter: next };
        const other = Store.books[Store.books.indexOf(book) + step];
        if (!other) return null;
        return { book: other, chapter: step > 0 ? 1 : chapterCount(other.slug) };
    }

    // ── Verse selection: which ones, and how they read as a reference ───
    function verseRanges(nums) {
        const sorted = [...nums].sort((a, b) => a - b);
        const ranges = [];
        for (const n of sorted) {
            const last = ranges[ranges.length - 1];
            if (last && n === last[1] + 1) last[1] = n; else ranges.push([n, n]);
        }
        return ranges.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ');
    }
    const referenceText = nums =>
        `${current.book.name} ${current.chapter}:${verseRanges(nums)}, ${versionInfo(current.version).short}`;

    // ── Library ─────────────────────────────────────────────────────────
    function renderLibrary() {
        const results = h('div', { class: 'read-results', role: 'list', hidden: true });
        const field = h('input', {
            class: 'field read-find', type: 'search', placeholder: 'Find a book, or type a reference such as John 3:16',
            'aria-label': 'Find a book or reference', autocomplete: 'off', spellcheck: 'false'
        });
        field.addEventListener('input', UI.debounce(() => showResults(field.value, results), 80));
        field.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            const first = results.querySelector('a');
            if (first) { e.preventDefault(); Router.go(first.getAttribute('href')); }
        });

        current = null;
        const last = lastPosition();
        const page = h('div', { class: 'page read-page' },
            h('header', { class: 'read-hero rise' },
                h('p', { class: 'eyebrow' }, 'Scripture'),
                h('h1', null, 'Read the text ', h('em', null, 'behind'), ' the story'),
                h('p', { class: 'lede' }, 'Every passage on the timeline, in the order it was written down. Open a chapter and see who and what it is about.'),
                h('div', { class: 'read-search' }, icon('search'), field, results)),
            last ? continueCard(last) : null,
            studyLink(),
            ['OT', 'NT'].map(testamentSection));
        Study.close({ silent: true });
        root.replaceChildren(page);
        root.scrollTop = 0;
    }

    function continueCard(last) {
        const book = Store.book(last.slug);
        return h('a', { class: 'card read-continue rise', href: readHref(book.slug, last.chapter) },
            h('span', null,
                h('span', { class: 'eyebrow' }, 'Continue reading'),
                h('span', { class: 'read-continue-title display' }, `${book.name} ${last.chapter}`)),
            icon('arrow-right'));
    }

    // A quiet way into the study tools (#/study).
    function studyLink() {
        return h('a', { class: 'study-readlink rise', href: '#/study' },
            icon('scroll', 'icon-sm'),
            h('span', { class: 'study-readlink-title' }, 'Study tools'),
            h('span', { class: 'study-readlink-sub' }, 'Cross-references, word study, a reading plan and more'),
            icon('arrow-right', 'icon-sm'));
    }

    function testamentSection(testament) {
        const books = Store.books.filter(b => b.testament === testament);
        const genres = [...new Set(books.map(b => b.genre))];
        return h('section', { class: 'read-testament', 'aria-label': testament === 'OT' ? 'Old Testament' : 'New Testament' },
            h('h2', { class: 'read-testament-title' },
                testament === 'OT' ? 'Old Testament' : 'New Testament',
                h('span', { class: 'read-count' }, `${books.length} books`)),
            genres.map(g => h('div', { class: 'read-genre' },
                h('p', { class: 'read-genre-label', style: `--tone: ${genreTone(g)}` },
                    h('span', { class: 'chip-dot', 'aria-hidden': 'true' }), genreLabel(g)),
                h('ul', { class: 'read-books' }, books.filter(b => b.genre === g).map(bookRow)))));
    }

    function bookRow(book) {
        const covers = book.coversStart != null ? `covers ${Time.span(book.coversStart, book.coversEnd)}` : null;
        const chapters = chapterCount(book.slug);
        return h('li', null,
            h('a', { class: 'read-book', href: readHref(book.slug, 1) },
                h('span', { class: 'read-book-name display' }, book.name),
                h('span', { class: 'read-book-meta' },
                    [chapters ? `${chapters} ${chapters === 1 ? 'chapter' : 'chapters'}` : null, covers].filter(Boolean).join(' · '))));
    }

    // A typed reference wins; otherwise books whose names begin with, or
    // contain, what was typed.
    function showResults(query, box) {
        box.replaceChildren();
        const q = normName(query);
        box.hidden = !q;
        if (!q) return;
        const items = [];
        const ref = BibleText.parseRef(query);
        const refBook = ref && bookNamed(ref.book);
        if (refBook) {
            if (ref.startCh >= 1 && ref.startCh <= chapterCount(refBook.slug)) {
                const verses = ref.startV ? (ref.endV && ref.endCh === ref.startCh && ref.endV !== ref.startV
                    ? `${ref.startV}-${ref.endV}` : `${ref.startV}`) : null;
                const label = `${refBook.name} ${ref.startCh}${ref.startV ? ':' + verses.replace('-', '–') : ''}`;
                items.push(resultLink(readHref(refBook.slug, ref.startCh, verses), label, 'Go to this passage'));
            } else {
                items.push(h('p', { class: 'read-result-none' },
                    `${refBook.name} has ${chapterCount(refBook.slug)} chapters.`));
            }
        }
        const names = Store.books.filter(b => normName(b.name).startsWith(q) || normName(b.abbreviation || '') === q);
        const loose = Store.books.filter(b => !names.includes(b) && normName(b.name).includes(q));
        for (const b of [...names, ...loose].slice(0, 6)) {
            if (b === refBook && items.length) continue;
            items.push(resultLink(readHref(b.slug, 1), b.name, genreLabel(b.genre)));
        }
        if (!items.length) items.push(h('p', { class: 'read-result-none' }, 'No book by that name. Try “Genesis”, “Ps 23” or “1 Cor 13”.'));
        box.append(...items);
    }
    const resultLink = (href, title, sub) => h('a', { class: 'read-result', href, role: 'listitem' },
        h('span', { class: 'display' }, title), h('span', { class: 'read-book-meta' }, sub));

    // ── Chapter ─────────────────────────────────────────────────────────
    function skeleton(book, chapter) {
        return h('div', { class: 'page read-page' },
            h('div', { class: 'read-chapter' },
                h('header', { class: 'read-head' },
                    h('p', { class: 'eyebrow' }, genreLabel(book.genre)),
                    h('h1', { class: 'read-title' }, book.name, h('span', { class: 'read-chnum' }, chapter))),
                h('div', { class: 'read-flow', 'aria-busy': 'true', 'aria-label': 'Loading the chapter' },
                    Array.from({ length: 9 }, (_, i) => h('div', { class: 'read-skel', style: { width: `${i % 4 === 3 ? 58 : 100 - (i % 3) * 4}%` } })))));
    }

    async function renderChapter(book, chapter) {
        const t = ++token;
        closePicker?.();
        selection = new Set();
        current = null;
        root.replaceChildren(skeleton(book, chapter));
        root.scrollTop = 0;

        const wanted = activeVersion();
        const loaded = await loadChapter(book.slug, chapter, wanted);
        if (t !== token) return;
        if (!loaded) { renderState(book, 'failure'); return; }

        const v = Router.current.query.v;
        current = { book, chapter, ...loaded, wanted, v };
        store.set(LAST_KEY, JSON.stringify({ slug: book.slug, chapter }));
        root.replaceChildren(chapterPage(loaded, wanted));
        highlightVerses(v);
        Study.follow(Router.current, current);
    }

    function chapterPage({ version, verses, fellBack }, wanted) {
        const { book, chapter } = current;
        const prev = neighbour(book, chapter, -1), next = neighbour(book, chapter, 1);
        const lines = LINE_GENRES.has(book.genre);

        const text = h('div', {
            class: `scripture read-text${lines ? ' is-lines' : ''}`,
            lang: 'en', 'aria-label': `${book.name} ${chapter}`
        }, verses.map((verse, i) => verseNode(verse, i, lines)));
        text.addEventListener('click', onTextClick);
        text.addEventListener('keydown', onTextKey);

        const foot = versionInfo(version);
        return h('div', { class: 'page read-page' },
            h('div', { class: 'read-chapter' },
                chapterHead(book, chapter, version, prev, next),
                rail(book, chapter),
                h('article', { class: 'read-flow rise' },
                    fellBack ? h('p', { class: 'read-notice', role: 'status' },
                        `${versionInfo(wanted).short} is not available for ${book.name} ${chapter} on this device. Showing ${foot.short}.`) : null,
                    text,
                    h('p', { class: 'read-attrib' }, `${foot.label} · ${foot.publicDomain ? 'public domain' : 'copyrighted text'}`),
                    h('nav', { class: 'read-pager', 'aria-label': 'Chapters' }, pagerLink(prev, 'Previous'), pagerLink(next, 'Next')),
                    selectionBar())));
    }

    function chapterHead(book, chapter, version, prev, next) {
        const picker = chapterPicker(book, chapter);
        return h('header', { class: 'read-head' },
            h('nav', { class: 'read-crumbs', 'aria-label': 'Breadcrumb' },
                h('a', { href: '#/read' }, 'Scripture'), h('span', { 'aria-hidden': 'true' }, '/'),
                h('span', null, book.testament === 'OT' ? 'Old Testament' : 'New Testament')),
            h('p', { class: 'eyebrow' }, genreLabel(book.genre)),
            h('h1', { class: 'read-title' }, book.name, h('span', { class: 'read-chnum' }, chapter)),
            h('div', { class: 'read-tools' },
                stepButton(prev, 'Previous chapter', 'chevron-left'),
                picker,
                stepButton(next, 'Next chapter', 'chevron-right'),
                versionSwitch(version)));
    }

    function stepButton(target, label, name) {
        if (!target) return h('span', { class: 'icon-btn is-off', 'aria-hidden': 'true' }, icon(name));
        return h('a', {
            class: 'icon-btn read-step', href: readHref(target.book.slug, target.chapter),
            'aria-label': `${label}: ${target.book.name} ${target.chapter}`, title: label
        }, icon(name));
    }

    function pagerLink(target, label) {
        if (!target) return h('span');
        const forward = label === 'Next';
        return h('a', { class: `read-pager-link${forward ? ' is-next' : ''}`, href: readHref(target.book.slug, target.chapter) },
            h('span', { class: 'eyebrow' }, label),
            h('span', { class: 'display' }, `${target.book.name} ${target.chapter}`));
    }

    function versionSwitch(active) {
        return h('div', { class: 'read-versions', role: 'group', 'aria-label': 'Translation' },
            manifest.versions.map(v => h('button', {
                type: 'button', class: 'read-version', 'aria-pressed': String(v.id === active), title: v.label,
                onclick: () => {
                    if (v.id === active) return;
                    BibleText.setVersion(v.id);
                    Analytics.event('select_translation', { translation: v.id });
                    chosen = v.id;             // remembered for this visit even if storage is blocked
                    renderChapter(current.book, current.chapter);
                }
            }, v.short)));
    }

    // ── Chapter picker: a popover of numbers ────────────────────────────
    function chapterPicker(book, chapter) {
        const count = chapterCount(book.slug);
        const grid = h('div', { class: 'read-grid', role: 'group', 'aria-label': `Chapters of ${book.name}` },
            Array.from({ length: count }, (_, i) => h('a', {
                class: `read-grid-item${i + 1 === chapter ? ' is-current' : ''}`,
                href: readHref(book.slug, i + 1), 'aria-current': i + 1 === chapter ? 'page' : null
            }, i + 1)));
        const pop = h('div', { class: 'read-pop', hidden: true }, grid);
        const button = h('button', {
            type: 'button', class: 'btn btn-sm read-pick', 'aria-haspopup': 'true', 'aria-expanded': 'false',
            onclick: () => (pop.hidden ? open() : close())
        }, count > 1 ? `Chapter ${chapter} of ${count}` : 'One chapter', count > 1 ? icon('chevron-down', 'icon-sm') : null);
        if (count <= 1) button.disabled = true;

        function onDocPointer(e) { if (!pop.contains(e.target) && !button.contains(e.target)) close(); }
        function onEscape(e) { if (e.key === 'Escape') { close(); button.focus(); } }
        function open() {
            pop.hidden = false;
            button.setAttribute('aria-expanded', 'true');
            closePicker = close;
            document.addEventListener('pointerdown', onDocPointer);
            document.addEventListener('keydown', onEscape);
            (grid.querySelector('.is-current') || grid.firstChild).focus({ preventScroll: true });
            grid.querySelector('.is-current')?.scrollIntoView({ block: 'center' });
        }
        function close() {
            pop.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            document.removeEventListener('pointerdown', onDocPointer);
            document.removeEventListener('keydown', onEscape);
            if (closePicker === close) closePicker = null;
        }
        grid.addEventListener('click', close);
        return h('div', { class: 'read-picker' }, button, pop);
    }

    // ── The verses ──────────────────────────────────────────────────────
    function verseNode({ v, text }, index, lines) {
        // A first verse opens with a drop cap in place of its number.
        const dropCap = !lines && v === 1 && /^[A-Za-z]/.test(text);
        const number = h('button', {
            type: 'button', class: 'vn', tabindex: index === 0 ? '0' : '-1',
            'aria-label': `Verse ${v}`, dataset: { v }
        }, String(v));
        return h('span', { class: 'verse', dataset: { v } },
            dropCap ? h('span', { class: 'sr-only' }, '1 ') : h('sup', null, number),
            dropCap ? h('span', { class: 'dropcap', 'aria-hidden': 'true' }, text[0]) : null,
            dropCap ? text.slice(1) : text, ' ');
    }

    function onTextClick(e) {
        const verse = e.target.closest('.verse');
        if (!verse) return;
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && !e.target.closest('.vn')) return; // reading, not choosing
        const v = Number(verse.dataset.v);
        if (selection.has(v)) selection.delete(v); else selection.add(v);
        syncSelection();
    }

    // Up and down move between verse numbers; left and right stay free for
    // changing chapter.
    function onTextKey(e) {
        if (!e.target.classList.contains('vn') || !/^Arrow(Up|Down)$/.test(e.key)) return;
        const all = [...root.querySelectorAll('.vn')];
        const to = all[all.indexOf(e.target) + (e.key === 'ArrowDown' ? 1 : -1)];
        if (!to) return;
        e.preventDefault();
        e.target.tabIndex = -1;
        to.tabIndex = 0;
        to.focus();
    }

    function syncSelection() {
        for (const el of root.querySelectorAll('.verse')) {
            const on = selection.has(Number(el.dataset.v));
            el.classList.toggle('is-picked', on);
            el.querySelector('.vn')?.setAttribute('aria-pressed', String(on));
        }
        const bar = root.querySelector('.read-selbar');
        if (!bar) return;
        bar.hidden = !selection.size;
        if (selection.size) bar.querySelector('.read-selref').textContent = referenceText(selection);
    }

    function selectedText() {
        const picked = current.verses.filter(x => selection.has(x.v));
        return picked.map(x => x.text).join(' ');
    }
    function selectedLink() {
        const nums = [...selection].sort((a, b) => a - b);
        const contiguous = nums.every((n, i) => !i || n === nums[i - 1] + 1);
        const v = contiguous ? (nums.length > 1 ? `${nums[0]}-${nums[nums.length - 1]}` : `${nums[0]}`) : nums.join(',');
        return publicUrl(readHref(current.book.slug, current.chapter, v));
    }

    function selectionBar() {
        return h('div', { class: 'read-selbar', hidden: true, role: 'region', 'aria-label': 'Selected verses' },
            h('span', { class: 'read-selref' }),
            h('button', {
                type: 'button', class: 'btn btn-sm', onclick: async () => {
                    const ok = await UI.copy(`“${selectedText()}” — ${referenceText(selection)}\n${selectedLink()}`);
                    UI.toast(ok ? 'Verse copied' : 'Could not copy');
                }
            }, 'Copy'),
            h('button', {
                type: 'button', class: 'btn btn-sm btn-primary', onclick: () => UI.share({
                    title: referenceText(selection), text: `“${selectedText()}”`, url: selectedLink()
                })
            }, icon('share', 'icon-sm'), 'Share'),
            h('button', {
                type: 'button', class: 'btn btn-sm read-study', onclick: () => Study.open({
                    book: current.book, chapter: current.chapter, verse: Math.min(...selection), version: current.version
                })
            }, icon('book', 'icon-sm'), 'Study'),
            h('button', {
                type: 'button', class: 'icon-btn', 'aria-label': 'Clear selection',
                onclick: () => { selection = new Set(); syncSelection(); }
            }, icon('close')));
    }

    // "3-7", "16" or "3,5,9" → marks those verses and brings the first into view.
    function highlightVerses(spec) {
        if (!spec) return;
        const wanted = new Set();
        for (const part of String(spec).split(',')) {
            const [a, b = a] = part.split(/[-–]/).map(Number);
            if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
            for (let n = Math.min(a, b); n <= Math.max(a, b) && n - a < 200; n++) wanted.add(n);
        }
        let first = null;
        for (const el of root.querySelectorAll('.verse')) {
            if (!wanted.has(Number(el.dataset.v))) continue;
            el.classList.add('is-hl');
            first = first || el;
        }
        if (first) {
            requestAnimationFrame(() => first.scrollIntoView({
                block: 'center', behavior: UI.reducedMotion() ? 'auto' : 'smooth'
            }));
        }
    }

    // ── The rail: back into history ─────────────────────────────────────
    function rail(book, chapter) {
        const { people, events } = linkedIn(book.slug, chapter);
        const nothing = !people.size && !events.size;
        const box = h('details', { class: 'read-rail' },
            h('summary', null,
                h('span', null, h('span', { class: 'eyebrow' }, nothing ? 'About this book' : 'In this chapter'),
                    nothing ? null : h('span', { class: 'read-rail-count' }, `${people.size + events.size} linked`)),
                icon('chevron-down', 'icon-sm')),
            h('div', { class: 'read-rail-body' }, nothing ? bookContext(book) : [
                chipGroup('People', [...people].sort(byImportance)),
                chipGroup('Events', [...events].sort(byImportance)),
                whenBlock(book, events)
            ], Study.chapterSections({ book, chapter })));
        // Open on wide screens, where it is a rail; folded on phones.
        box.open = !UI.isMobile();
        return box;
    }

    function chipGroup(title, items) {
        if (!items.length) return null;
        const more = items.slice(RAIL_LIMIT);
        const list = h('div', { class: 'chip-row' }, items.slice(0, RAIL_LIMIT).map(x => UI.chip(x)));
        const group = h('div', { class: 'read-rail-group' }, h('h3', { class: 'read-rail-title' }, title), list);
        if (more.length) {
            group.append(h('button', {
                type: 'button', class: 'btn btn-quiet btn-sm',
                onclick: e => { list.append(...more.map(x => UI.chip(x))); e.currentTarget.remove(); }
            }, `Show ${more.length} more`));
        }
        return group;
    }

    // When the linked events happened, else when the book's own story is set.
    function whenBlock(book, events) {
        const dated = [...events].filter(e => e.startYear != null);
        const from = dated.length ? Math.min(...dated.map(e => e.span.start)) : book.coversStart;
        const to = dated.length ? Math.max(...dated.map(e => e.span.end)) : book.coversEnd;
        return from == null ? null : h('div', { class: 'read-rail-group' },
            h('h3', { class: 'read-rail-title' }, 'When this happened'),
            timelineLink(from, to));
    }

    function timelineLink(from, to) {
        const mid = Time.fromAxis((Time.toAxis(from) + Time.toAxis(to)) / 2);
        const span = Math.max(80, Math.round(Math.abs(Time.between(from, to)) * 1.5));
        const era = Store.periodAt(mid);
        return h('a', {
            class: 'read-when', href: Router.build('timeline', [], { y: mid, span }),
            style: era ? `--era: ${era.color}` : null
        },
            h('span', { class: 'read-when-era' }, h('span', { class: 'chip-dot', 'aria-hidden': 'true' }), era?.name || 'Timeline'),
            h('span', { class: 'year read-when-years' }, Time.span(from, to)),
            h('span', { class: 'read-when-go' }, 'See it on the timeline', icon('arrow-right', 'icon-sm')));
    }

    function bookContext(book) {
        return [
            h('p', { class: 'read-context' },
                `${genreLabel(book.genre)}. No person or event in the timeline is tied to this chapter yet.`),
            book.coversStart != null ? h('div', { class: 'read-rail-group' },
                h('h3', { class: 'read-rail-title' }, `${book.name} covers`),
                timelineLink(book.coversStart, book.coversEnd)) : null
        ];
    }

    // ── States ──────────────────────────────────────────────────────────
    function renderState(book, kind) {
        const copy = {
            unknown: ['Not found', 'We could not find that book', 'Check the address, or choose a book from the library.'],
            chapter: ['Not found', `${book?.name} has no such chapter`,
                book ? `It has ${chapterCount(book.slug)} ${chapterCount(book.slug) === 1 ? 'chapter' : 'chapters'}.` : ''],
            failure: ['Offline', 'The text could not be loaded', 'Check your connection and try again. Chapters you have already opened are kept on this device.'],
            offline: ['Offline', 'Scripture text is not available', 'The Bible files could not be reached. Check your connection and try again.']
        }[kind];
        current = null;
        Study.close({ silent: true });
        const actions = [h('a', { class: 'btn btn-primary', href: '#/read' }, 'Back to the library')];
        if (kind === 'chapter') actions.unshift(h('a', { class: 'btn', href: readHref(book.slug, 1) }, `Start ${book.name}`));
        if (kind === 'failure' || kind === 'offline') {
            actions.unshift(h('button', { type: 'button', class: 'btn', onclick: () => show(Router.current) }, 'Try again'));
        }
        root.replaceChildren(h('div', { class: 'page read-page' },
            h('div', { class: 'read-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, copy[0]),
                h('h1', null, copy[1]),
                h('p', { class: 'lede' }, copy[2]),
                h('div', { class: 'read-state-actions' }, actions))));
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('read');
        root.tabIndex = -1;
        document.addEventListener('keydown', onChapterKey);
    }

    // Left and right turn the page, unless the person is typing or a popover is open.
    // App.view stays 'read' under a sheet; the route says whether the reader has the keys.
    function onChapterKey(e) {
        if (Router.current.view !== 'read' || !current || closePicker) return;
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
        if (!/^Arrow(Left|Right)$/.test(e.key)) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
        const target = neighbour(current.book, current.chapter, e.key === 'ArrowRight' ? 1 : -1);
        if (target) Router.go(readHref(target.book.slug, target.chapter));
    }

    async function show(route) {
        const t = ++token;
        if (!manifest) {
            manifest = await BibleText.manifest();
            if (t !== token) return;
            if (!manifest) { renderState(null, 'offline'); return; }
            buildBookIndex();
            buildLinked();
        }
        const [slug, chapterText] = route.parts;
        if (!slug) { renderLibrary(); return; }
        const book = Store.book(slug);
        if (!book) { renderState(null, 'unknown'); return; }
        if (chapterText == null) {
            Router.replace(Router.build('read', [book.slug, 1], { v: route.query.v, study: route.query.study }));
            return renderChapter(book, 1);
        }
        const chapter = Number(chapterText);
        if (!Number.isInteger(chapter) || chapter < 1 || chapter > chapterCount(book.slug)) {
            renderState(book, 'chapter');
            return;
        }
        // Closing a sheet opened over the reader shows this route again: keep the page,
        // its scroll position and the chosen verses rather than loading it afresh.
        if (current && current.book === book && current.chapter === chapter
            && current.wanted === activeVersion() && current.v === route.query.v) {
            Study.follow(route, current);
            return;
        }
        return renderChapter(book, chapter);
    }

    function hide() { closePicker?.(); Study.close({ silent: true }); }

    function title(route) {
        const book = route.parts[0] && Store.book(route.parts[0]);
        if (!book) return 'Read Scripture';
        return route.parts[1] ? `${book.name} ${route.parts[1]}` : book.name;
    }

    App.registerView('read', { init, show, hide, title });
    return {};
})();

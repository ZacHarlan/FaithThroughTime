// read.js — the scripture reader: a library of the sixty-six books, a calm
// chapter page, and a rail that leads from the text back into history.
//
//   #/read                      the library
//   #/read/<book>[/<chapter>]   a chapter (?v=3-7 softly marks verses; ?study=16 opens the verse study panel)
//
// A chapter opens with a quiet strip that says where it stands in history (era, year, who reigned and
// prophesied, from data/chapter-years.json and data/kings.json). The names of the people and places tied
// to the chapter are links in the text. The "Aa" popover holds the reading settings (text size, line
// spacing, name links, a second translation to compare); Listen reads the chapter aloud.
const Read = (() => {
    const { h, icon } = UI;
    const LAST_KEY = 'ftt-read-last';
    const SETTINGS_KEY = 'ftt-read-settings';
    const DEFAULT_VERSION = 'esv';
    const LAST_RESORT = 'kjv';          // complete and public domain: used if a chapter is missing elsewhere
    const RAIL_LIMIT = 10;
    const BOOK_CACHE_MAX = 6;   // whole books are large; keep the few being read (two at a time when comparing)

    // Reading settings: text size and line spacing as steps, name links, and a translation to compare.
    const SIZES = [0.84, 0.92, 1, 1.12, 1.26];
    const SIZE_NAMES = ['Smallest', 'Smaller', 'Standard', 'Larger', 'Largest'];
    const SPACINGS = [{ label: 'Compact', value: 0.88 }, { label: 'Standard', value: 1 }, { label: 'Airy', value: 1.16 }];
    const DEFAULT_SETTINGS = { size: 2, spacing: 1, names: true, compare: null };

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
    let chapterYears = {};       // slug → chapter → year | null
    let kingsData = { kings: [], prophets: [] };
    const bookCache = new Map(); // "version/slug" → book JSON, least recently used first
    let closePicker = null;      // closes whichever popover is open (chapter picker or settings)
    let chosen = null;           // translation picked this visit, in case storage is blocked
    let selection = new Set();
    let current = null;          // { book, chapter, verses, version, wanted, v, alt, textEl } of the chapter on screen
    let settings = null;

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

    function loadSettings() {
        let saved = {};
        try { saved = JSON.parse(store.get(SETTINGS_KEY)) || {}; } catch { saved = {}; }
        const step = (n, max, d) => (Number.isInteger(n) && n >= 0 && n <= max ? n : d);
        return {
            size: step(saved.size, SIZES.length - 1, DEFAULT_SETTINGS.size),
            spacing: step(saved.spacing, SPACINGS.length - 1, DEFAULT_SETTINGS.spacing),
            names: saved.names !== false,
            compare: typeof saved.compare === 'string' ? saved.compare : null
        };
    }
    function saveSettings() { store.set(SETTINGS_KEY, JSON.stringify(settings)); }
    // Size and spacing are custom properties on the view, so they carry from chapter to chapter.
    function applyComfort() {
        if (!root) return;
        root.style.setProperty('--read-scale', String(SIZES[settings.size]));
        root.style.setProperty('--read-leading', String(SPACINGS[settings.spacing].value));
    }
    function compareVersion(primary) {
        const c = settings.compare;
        return c && c !== primary && manifest?.versions.some(v => v.id === c) ? c : null;
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

    // ── Names in the text ───────────────────────────────────────────────
    // People tied to the chapter are matched by the name before any epithet ("Joshua son of Nun" →
    // Joshua) and by their other names; places by their names and the forms the translations use.
    // Matching is case-sensitive and whole-word, longest name first.
    const EPITHET = /,| (?:son|daughter|wife|mother|father|brother|sister) of | the | of /;
    // Forms the King James Version uses (mostly the Greek spellings of the New Testament).
    const OTHER_FORMS = {
        Elijah: ['Elias'], Elisha: ['Eliseus'], Isaiah: ['Esaias'], Noah: ['Noe'], Jonah: ['Jonas'], Hosea: ['Osee'],
        Korah: ['Core'], Uzziah: ['Ozias'], Hezekiah: ['Ezekias'], Josiah: ['Josias'], Jeremiah: ['Jeremy', 'Jeremias'],
        Rehoboam: ['Roboam'], Abijah: ['Abia'], Jehoshaphat: ['Josaphat'], Ahaz: ['Achaz'], Manasseh: ['Manasses'],
        Tamar: ['Thamar'], Perez: ['Phares', 'Pharez'], Zerah: ['Zara', 'Zarah'], Hezron: ['Esrom'], Nahshon: ['Naasson'],
        Shealtiel: ['Salathiel'], Zerubbabel: ['Zorobabel'], Sarah: ['Sara'], Gideon: ['Gedeon'], Jephthah: ['Jephthae'],
        Rahab: ['Rachab'], Boaz: ['Booz'], Kish: ['Cis'], Enoch: ['Henoch'], Hagar: ['Agar'], Timothy: ['Timotheus'],
        Mark: ['Marcus'], Silas: ['Silvanus'], Priscilla: ['Prisca']
    };
    // Other names that, outside the book that gives them, mean a nation rather than the person.
    const ALT_ONLY_IN = { Israel: 'genesis', Edom: 'genesis', Jeshurun: 'deuteronomy' };
    const PLACE_FORMS = {
        'Ai': ['Hai'], 'Beersheba': ['Beer-sheba'], 'Shechem': ['Sichem', 'Sychem'], 'Haran': ['Charran'],
        'Kadesh Barnea': ['Kadesh-barnea', 'Kadesh'], 'Mount Sinai': ['Sinai'], 'Red Sea Crossing': ['Red Sea'],
        'Jordan River': ['Jordan'], 'Tyre & Sidon': ['Tyre', 'Sidon', 'Tyrus', 'Zidon'],
        'Sea of Galilee': ['Sea of Tiberias', 'lake of Gennesaret', 'Lake of Gennesaret'],
        'Mount of Olives': ['mount of Olives', 'Mount Olivet', 'Olivet'], 'Mount Carmel': ['Carmel'],
        'Sychar and Jacobs Well': ['Sychar'], 'Kiriath-jearim': ['Kirjath-jearim'], 'Peniel': ['Penuel'],
        'Mount Ararat': ['Ararat'], 'Mount Gilboa': ['Gilboa'], 'Mount Tabor': ['Tabor'], 'Mount Nebo': ['Nebo'],
        'Mount Ebal': ['Ebal'], 'Valley of Hinnom (Tophet)': ['Tophet', 'Topheth'],
        'Pisidian Antioch': ['Antioch in Pisidia'], 'Nineveh': ['Niniveh'], 'Spring of Harod': ['Harod'],
        'Bethabara beyond Jordan': ['Bethabara'], 'Ramah of Samuel (Ramathaim-zophim)': ['Ramathaim-zophim', 'Ramah'],
        'Habor, River of Gozan': ['Habor', 'Gozan'], 'Euphrates (Perath)': ['Euphrates']
    };
    const PLACE_SKIP = new Set(['Gaza Road', 'Temple Mount']);            // never named so in the text
    const PLACE_PREFIX = /^(?:Mount|Pool of|Cave of|Brook|Valley of|Wilderness of|Threshing Floor of|Spring of) /;
    const PLACE_QUALIFIER = / (?:of [A-Z][\w-]*|beyond Jordan|River|Spring|Canal|Crossing)$/;
    const GENERIC = new Set(['Sea', 'Mount', 'Valley', 'Road', 'River', 'Plains', 'Pool', 'Cave', 'Temple', 'Way', 'Wilderness', 'Spring']);
    // Shorter forms that also name something else (Gihon is a river of Eden too): linked only where the place is tied.
    const LOOSE_ALWAYS = new Set(['Gihon', 'Nebo', 'Harod', 'Arabah', 'Ramah', 'Carmel', 'Hinnom', 'Jacobs Well']);

    const baseName = name => name.replace(/^the /i, '').split(EPITHET)[0].trim();
    let placeNameIndex = null;   // location → { names: [...], loose: Set of names shared or only derived }
    let personBases = null;      // every person's base name, so a place called "Elah" does not claim the king

    function personNames(p, book) {
        const names = new Set();
        const add = n => { if (n && n.length > 2 && /^[A-Z]/.test(n)) names.add(n); };
        const base = baseName(p.name);
        add(base);
        for (const f of OTHER_FORMS[base] || []) add(f);
        for (const alt of p.altNames || []) {
            const b = baseName(alt);
            if (ALT_ONLY_IN[b] && ALT_ONLY_IN[b] !== book.slug) continue;
            add(b);
            if (alt !== b && /^[A-Z]/.test(alt) && !alt.includes(',')) add(alt);
            for (const f of OTHER_FORMS[b] || []) add(f);
        }
        return names;
    }

    function buildPlaceNames() {
        personBases = new Set(Store.people.map(p => baseName(p.name)));
        placeNameIndex = new Map();
        const claims = new Map();          // name → number of places that answer to it
        for (const l of Store.locations) {
            const name = l.name;
            const exact = new Set(PLACE_SKIP.has(name) ? [] : [name]), derived = new Set();
            const paren = /^(.*?)\s*\((.*)\)$/.exec(name);
            const parts = paren ? [paren[1], paren[2]] : name.split(/ & | and /);
            if (parts.length > 1) for (const p of parts) derived.add(p.trim());
            for (const p of parts) {
                const bare = p.replace(PLACE_PREFIX, '').replace(PLACE_QUALIFIER, '').trim();
                if (bare && bare !== p) derived.add(bare);
            }
            for (const f of PLACE_FORMS[name] || []) derived.add(f);
            // Hyphenated names are also printed joined ("En-gedi", "Engedi").
            for (const n of [...exact, ...derived]) {
                if (/-/.test(n)) derived.add(n.replace(/-(\w)/g, (_, c) => c.toLowerCase()));
            }
            const fine = n => n.length >= 2 && !n.includes(',') && !GENERIC.has(n) && (exact.has(n) || /^[A-Z]/.test(n) || /^(mount|lake) /.test(n));
            const all = PLACE_SKIP.has(name) ? new Set() : new Set([...exact, ...derived].filter(fine));
            for (const n of all) claims.set(n, (claims.get(n) || 0) + 1);
            placeNameIndex.set(l, { all, exact });
        }
        // A name is loose (linked only where the place is tied to the chapter) when another place shares it,
        // when it is also a person's name, or when it is a short derived form.
        for (const [, entry] of placeNameIndex) {
            entry.loose = new Set([...entry.all].filter(n => claims.get(n) > 1 || personBases.has(n) || LOOSE_ALWAYS.has(n)
                || (!entry.exact.has(n) && n.length < 4)));
        }
    }

    // name → entity for one chapter, and the pattern that finds them.
    function nameMatcher(book, chapter) {
        if (!placeNameIndex) buildPlaceNames();
        const { people, events } = linkedIn(book.slug, chapter);
        const map = new Map();
        for (const p of [...people].sort(byImportance)) {
            for (const n of personNames(p, book)) if (!map.has(n)) map.set(n, p);
        }
        const tied = new Set([...events].flatMap(e => Store.locationsOf(e)));
        const places = [...tied, ...Store.locations.filter(l => !tied.has(l))];
        for (const l of places) {
            const entry = placeNameIndex.get(l);
            for (const n of entry.all) {
                if (map.has(n)) continue;
                if (!tied.has(l) && entry.loose.has(n)) continue;
                map.set(n, l);
            }
        }
        if (!map.size) return null;
        const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const names = [...map.keys()].sort((a, b) => b.length - a.length).map(escape);
        return { map, re: new RegExp(`\\b(?:${names.join('|')})\\b`, 'g') };
    }

    const entityHref = e => (e.kind === 'location' ? `#/place/${e.slug}` : UI.href(e));

    // The verse text as text and links. Each person or place is linked once in a verse.
    function linkNames(text, matcher) {
        if (!matcher || !text) return [text];
        const out = [];
        const seen = new Set();
        let last = 0;
        for (const m of text.matchAll(matcher.re)) {
            const entity = matcher.map.get(m[0]);
            if (!entity || seen.has(entity)) continue;
            seen.add(entity);
            if (m.index > last) out.push(text.slice(last, m.index));
            out.push(h('a', {
                class: `read-name is-${entity.kind}`, href: entityHref(entity),
                title: entity.name !== m[0] ? entity.name : null
            }, m[0]));
            last = m.index + m[0].length;
        }
        if (last < text.length) out.push(text.slice(last));
        return out;
    }

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

    // The second translation for comparing: { version, byVerse: Map } or { version, missing: true }.
    async function loadAlt(slug, chapter, version) {
        try {
            const chap = (await loadBook(version, slug))[String(chapter)];
            if (chap) return { version, byVerse: new Map(Object.entries(chap).map(([v, t]) => [Number(v), t])) };
        } catch { /* reported below */ }
        return { version, missing: true };
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

        Listen.stop();
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

    // The row starts reading at chapter 1; the small "About" link beside it opens the book's page.
    function bookRow(book) {
        const covers = book.coversStart != null ? `covers ${Time.span(book.coversStart, book.coversEnd)}` : null;
        const chapters = chapterCount(book.slug);
        return h('li', { class: 'read-book-item' },
            h('a', { class: 'read-book', href: readHref(book.slug, 1) },
                h('span', { class: 'read-book-name display' }, book.name),
                h('span', { class: 'read-book-meta' },
                    [chapters ? `${chapters} ${chapters === 1 ? 'chapter' : 'chapters'}` : null, covers].filter(Boolean).join(' · '))),
            h('a', { class: 'read-book-about', href: `#/book/${book.slug}`, 'aria-label': `About ${book.name}`, title: `About ${book.name}` },
                icon('info', 'icon-sm'), h('span', { class: 'read-book-about-text', 'aria-hidden': 'true' }, 'About')));
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
        Listen.stop();
        selection = new Set();
        current = null;
        root.replaceChildren(skeleton(book, chapter));
        root.scrollTop = 0;

        const wanted = activeVersion();
        const loaded = await loadChapter(book.slug, chapter, wanted);
        if (t !== token) return;
        if (!loaded) { renderState(book, 'failure'); return; }
        const second = compareVersion(loaded.version);
        const alt = second ? await loadAlt(book.slug, chapter, second) : null;
        if (t !== token) return;

        const v = Router.current.query.v;
        current = { book, chapter, ...loaded, wanted, v, alt };
        store.set(LAST_KEY, JSON.stringify({ slug: book.slug, chapter }));
        root.replaceChildren(chapterPage(loaded, wanted));
        highlightVerses(v);
        Study.follow(Router.current, current);
    }

    function chapterPage({ version, fellBack }, wanted) {
        const { book, chapter, alt } = current;
        const prev = neighbour(book, chapter, -1), next = neighbour(book, chapter, 1);

        const text = h('div', { lang: 'en', 'aria-label': `${book.name} ${chapter}` });
        text.addEventListener('click', onTextClick);
        text.addEventListener('keydown', onTextKey);
        current.textEl = text;
        fillText({ initial: true });

        const foot = versionInfo(version);
        const altInfo = alt && versionInfo(alt.version);
        return h('div', { class: 'page read-page' },
            h('div', { class: `read-chapter${alt && !alt.missing ? ' is-compare' : ''}` },
                chapterHead(book, chapter, version, prev, next),
                rail(book, chapter),
                h('article', { class: 'read-flow rise' },
                    fellBack ? h('p', { class: 'read-notice', role: 'status' },
                        `${versionInfo(wanted).short} is not available for ${book.name} ${chapter} on this device. Showing ${foot.short}.`) : null,
                    alt?.missing ? h('p', { class: 'read-notice', role: 'status' },
                        `${altInfo.short} is not available for ${book.name} ${chapter} on this device, so there is nothing to compare.`) : null,
                    text,
                    h('p', { class: 'read-attrib' },
                        `${foot.label} · ${foot.publicDomain ? 'public domain' : 'copyrighted text'}`,
                        altInfo && !alt.missing ? ` — compared with the ${altInfo.label} · ${altInfo.publicDomain ? 'public domain' : 'copyrighted text'}` : null),
                    h('nav', { class: 'read-pager', 'aria-label': 'Chapters' }, pagerLink(prev, 'Previous'), pagerLink(next, 'Next')),
                    h('div', { class: 'read-dock' }, Listen.bar(), selectionBar()))));
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
                versionSwitch(version),
                h('span', { class: 'read-tools-end' }, settingsMenu(), Listen.button())),
            historyStrip(book, chapter));
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

    // ── Popovers: the chapter picker and the reading settings ───────────
    // One open at a time; Escape or a press outside closes it. `first` is focused on opening.
    function popover(button, pop, first) {
        function onDocPointer(e) { if (!pop.contains(e.target) && !button.contains(e.target)) close(); }
        function onEscape(e) { if (e.key === 'Escape') { close(); button.focus(); } }
        function open() {
            closePicker?.();
            pop.hidden = false;
            button.setAttribute('aria-expanded', 'true');
            closePicker = close;
            document.addEventListener('pointerdown', onDocPointer);
            document.addEventListener('keydown', onEscape);
            first()?.focus({ preventScroll: true });
        }
        function close() {
            pop.hidden = true;
            button.setAttribute('aria-expanded', 'false');
            document.removeEventListener('pointerdown', onDocPointer);
            document.removeEventListener('keydown', onEscape);
            if (closePicker === close) closePicker = null;
        }
        button.addEventListener('click', () => (pop.hidden ? open() : close()));
        return { open, close };
    }

    function chapterPicker(book, chapter) {
        const count = chapterCount(book.slug);
        const grid = h('div', { class: 'read-grid', role: 'group', 'aria-label': `Chapters of ${book.name}` },
            Array.from({ length: count }, (_, i) => h('a', {
                class: `read-grid-item${i + 1 === chapter ? ' is-current' : ''}`,
                href: readHref(book.slug, i + 1), 'aria-current': i + 1 === chapter ? 'page' : null
            }, i + 1)));
        const pop = h('div', { class: 'read-pop', hidden: true }, grid);
        const button = h('button', {
            type: 'button', class: 'btn btn-sm read-pick', 'aria-haspopup': 'true', 'aria-expanded': 'false'
        }, count > 1 ? `Chapter ${chapter} of ${count}` : 'One chapter', count > 1 ? icon('chevron-down', 'icon-sm') : null);
        if (count <= 1) button.disabled = true;
        const { close } = popover(button, pop, () => {
            const cur = grid.querySelector('.is-current');
            requestAnimationFrame(() => cur?.scrollIntoView({ block: 'center' }));
            return cur || grid.firstChild;
        });
        grid.addEventListener('click', close);
        return h('div', { class: 'read-picker' }, button, pop);
    }

    // "Aa": text size, line spacing, name links, and a translation to compare.
    function settingsMenu() {
        // A row of pressed/unpressed buttons; `face(i)` is { label?, content }.
        const steps = (id, title, count, isOn, face, onPick) => {
            const buttons = Array.from({ length: count }, (_, i) => {
                const f = face(i);
                return h('button', {
                    type: 'button', class: 'read-seg-btn', 'aria-pressed': String(isOn(i)),
                    'aria-label': f.label, title: f.label,
                    onclick: () => {
                        onPick(i);
                        buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(isOn(j))));
                    }
                }, f.content);
            });
            return h('div', { class: 'read-set-row' },
                h('p', { class: 'read-set-label', id }, title),
                h('div', { class: `read-seg is-${count}`, role: 'group', 'aria-labelledby': id }, buttons));
        };
        const size = steps('read-set-size', 'Text size', SIZES.length, i => i === settings.size,
            i => ({ label: SIZE_NAMES[i], content: h('span', { 'aria-hidden': 'true', style: { fontSize: `${0.72 + i * 0.14}rem` } }, 'A') }),
            i => { settings.size = i; saveSettings(); applyComfort(); });
        const spacing = steps('read-set-spacing', 'Line spacing', SPACINGS.length, i => i === settings.spacing,
            i => ({ content: SPACINGS[i].label }),
            i => { settings.spacing = i; saveSettings(); applyComfort(); });

        const names = h('button', {
            type: 'button', class: 'read-switch', role: 'switch', 'aria-checked': String(settings.names),
            onclick: () => {
                settings.names = !settings.names;
                names.setAttribute('aria-checked', String(settings.names));
                saveSettings();
                fillText();
            }
        }, h('span', { class: 'read-switch-text' },
            h('span', { class: 'read-switch-title' }, 'Names as links'),
            h('span', { class: 'read-switch-sub' }, 'Tap a person or place in the text to learn more')),
        h('span', { class: 'read-switch-track', 'aria-hidden': 'true' }, h('span', { class: 'read-switch-knob' })));

        const primary = current.version;
        const choice = h('select', { class: 'field read-compare-select', id: 'read-compare' },
            h('option', { value: '' }, 'No second translation'),
            manifest.versions.filter(v => v.id !== primary).map(v => h('option', {
                value: v.id, selected: compareVersion(primary) === v.id
            }, `${v.short} — ${v.label}`)));
        choice.addEventListener('change', () => {
            settings.compare = choice.value || null;
            saveSettings();
            if (settings.compare) Analytics.event('compare_translation', { translation: settings.compare });
            renderChapter(current.book, current.chapter);
        });

        const pop = h('div', { class: 'read-pop read-settings', hidden: true, role: 'dialog', 'aria-label': 'Reading settings' },
            size, spacing,
            h('div', { class: 'read-set-row' }, names),
            h('div', { class: 'read-set-row' },
                h('label', { class: 'read-set-label', for: 'read-compare' }, 'Compare with'),
                choice));
        const button = h('button', {
            type: 'button', class: 'btn btn-sm read-aa', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
            'aria-label': 'Reading settings', title: 'Reading settings'
        }, h('span', { class: 'read-aa-glyph', 'aria-hidden': 'true' }, 'A', h('small', null, 'a')));
        popover(button, pop, () => pop.querySelector('[aria-pressed="true"]'));
        return h('div', { class: 'read-picker read-settings-wrap' }, button, pop);
    }

    // ── The verses ──────────────────────────────────────────────────────
    // (Re)builds the chapter text in place: on first render, and when name links or comparing change.
    function fillText({ initial = false } = {}) {
        if (!current?.textEl) return;
        const { book, chapter, verses, alt, textEl } = current;
        const lines = LINE_GENRES.has(book.genre);
        const comparing = alt && !alt.missing;
        const matcher = settings.names ? nameMatcher(book, chapter) : null;
        textEl.className = `scripture read-text${lines ? ' is-lines' : ''}${comparing ? ' is-compare' : ''}`;
        if (comparing) {
            const a = versionInfo(current.version), b = versionInfo(alt.version);
            textEl.replaceChildren(
                h('div', { class: 'read-compare-head', 'aria-hidden': 'true' },
                    h('span', { title: a.label }, a.short), h('span', { title: b.label }, b.short)),
                ...verses.map((verse, i) => h('div', { class: 'read-pair', dataset: { v: verse.v } },
                    verseNode(verse, i, true, matcher),
                    h('p', { class: 'read-alt' },
                        h('span', { class: 'sr-only' }, `${b.short}: `),
                        h('span', { class: 'read-alt-tag', 'aria-hidden': 'true' }, b.short),
                        h('sup', { class: 'read-alt-vn', 'aria-hidden': 'true' }, verse.v),
                        alt.byVerse.get(verse.v) || '—'))));
        } else {
            textEl.replaceChildren(...verses.map((verse, i) => verseNode(verse, i, lines, matcher)));
        }
        if (initial) return;            // renderChapter marks, highlights and follows the study panel
        // Rebuilt in place: keep what the reader had marked.
        if (current.v) for (const n of wantedVerses(current.v)) textEl.querySelector(`.verse[data-v="${n}"]`)?.classList.add('is-hl');
        syncSelection();
        Listen.remark();
        if (Router.current.query.study != null) Study.follow(Router.current, current);
    }

    function verseNode({ v, text }, index, lines, matcher) {
        // A first verse opens with a drop cap in place of its number.
        const dropCap = !lines && v === 1 && /^[A-Za-z]/.test(text);
        const number = h('button', {
            type: 'button', class: 'vn', tabindex: index === 0 ? '0' : '-1',
            'aria-label': `Verse ${v}`, dataset: { v }
        }, String(v));
        return h('span', { class: 'verse', dataset: { v } },
            dropCap ? h('span', { class: 'sr-only' }, '1 ') : h('sup', null, number),
            dropCap ? h('span', { class: 'dropcap', 'aria-hidden': 'true' }, text[0]) : null,
            linkNames(dropCap ? text.slice(1) : text, matcher), ' ');
    }

    function onTextClick(e) {
        if (e.target.closest('a')) return;                                // a name: open it, leave the selection alone
        const verse = e.target.closest('.verse') || e.target.closest('.read-pair')?.querySelector('.verse');
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

    // "3-7", "16" or "3,5,9" → the verse numbers.
    function wantedVerses(spec) {
        const wanted = new Set();
        for (const part of String(spec).split(',')) {
            const [a, b = a] = part.split(/[-–]/).map(Number);
            if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
            for (let n = Math.min(a, b); n <= Math.max(a, b) && n - a < 200; n++) wanted.add(n);
        }
        return wanted;
    }

    // Marks those verses and brings the first into view.
    function highlightVerses(spec) {
        if (!spec) return;
        const wanted = wantedVerses(spec);
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

    // ── Where this chapter stands in history ────────────────────────────
    // The era and year (data/chapter-years.json), who reigned in Judah and Israel and which prophets
    // were active (data/kings.json), a link to the timeline at that year, and the book's page.
    const kingSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const shortKing = name => name.replace(/ of (Judah|Israel)$/, '');
    const chapterYear = (book, chapter) => {
        const y = chapterYears?.[book.slug]?.[String(chapter)];
        return Number.isInteger(y) && y !== 0 ? y : null;
    };

    function historyStrip(book, chapter) {
        const year = chapterYear(book, chapter);
        const about = h('a', { class: 'read-hist-book', href: `#/book/${book.slug}` }, `About ${book.name}`);
        if (year == null) {
            return h('section', { class: 'read-hist is-bare', 'aria-label': 'About this book' },
                h('p', { class: 'read-hist-line' }, about));
        }
        const era = Store.periodAt(year);
        const when = Time.year(year, { approx: true });
        const lines = [h('p', { class: 'read-hist-line' },
            h('a', {
                class: 'read-hist-when', href: Router.build('timeline', [], { y: year, span: 80 }),
                style: era ? { '--era': era.color } : null, title: 'See this year on the timeline'
            },
                h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
                era ? h('span', { class: 'read-hist-era' }, era.name) : null,
                h('span', { class: 'read-hist-year year' }, when),
                h('span', { class: 'sr-only' }, ', on the timeline'),
                icon('timeline', 'icon-sm')),
            about)];
        const reign = reignLine(year);
        if (reign) lines.push(reign);
        return h('section', { class: 'read-hist', 'aria-label': 'Where this chapter stands in history' }, lines);
    }

    function reignLine(year) {
        // Both ends count: in a year a reign ends and the next begins, both kings reigned.
        const kings = kingsData.kings.filter(k => k.start <= year && year <= k.end);
        const prophets = kingsData.prophets.filter(p => p.start <= year && year <= p.end);
        if (!kings.length && !prophets.length) return null;
        const link = r => h('a', { class: 'read-hist-person', href: Router.build('kings', [], { sel: kingSlug(r.name) }), title: r.name },
            shortKing(r.name));
        const list = rs => rs.flatMap((r, i) => (i ? [h('span', { class: 'read-hist-sep', 'aria-hidden': 'true' }, ', '), link(r)] : [link(r)]));
        const group = (label, rs) => (rs.length ? h('span', { class: 'read-hist-group' },
            h('span', { class: 'read-hist-label' }, label), ' ', list(rs)) : null);
        const united = kings.filter(k => k.kingdom === 'united');
        return h('p', { class: 'read-hist-line read-hist-reign' },
            group(united.length ? 'King' : 'Judah', united.length ? united : kings.filter(k => k.kingdom === 'judah')),
            group('Israel', kings.filter(k => k.kingdom === 'israel')),
            group(prophets.length === 1 ? 'Prophet' : 'Prophets', prophets));
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

    // ── Listen: the chapter read aloud ──────────────────────────────────
    // The browser's speech synthesis, one verse at a time so the verse being read can be marked.
    // Hidden where the browser has none; stops when the reader leaves the chapter.
    const Listen = (() => {
        const synth = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function'
            ? window.speechSynthesis : null;
        let on = false, paused = false, index = 0, utter = null;
        let barEl = null, statusEl = null, pauseBtn = null, startBtn = null;

        function voice() {
            const voices = synth.getVoices() || [];
            return voices.find(v => /^en(-|_)?(US|GB)?/i.test(v.lang) && v.localService)
                || voices.find(v => /^en/i.test(v.lang)) || null;
        }

        function start() {
            if (!synth || !current) return;
            synth.cancel();
            const from = selection.size ? Math.min(...selection) : null;
            index = Math.max(0, from != null ? current.verses.findIndex(x => x.v === from) : 0);
            on = true;
            paused = false;
            Analytics.event('listen_chapter', { ref: `${current.book.name} ${current.chapter}` });
            speakNext();
            sync();
        }

        function speakNext() {
            if (!on || !current) { stop(); return; }
            const verse = current.verses[index];
            if (!verse) { stop(); return; }
            const u = new SpeechSynthesisUtterance(verse.text.replace(/[“”"‘’]/g, ''));
            const v = voice();
            if (v) u.voice = v;
            u.lang = v?.lang || 'en-US';
            u.rate = 0.96;
            u.onend = () => { if (utter !== u || !on) return; index++; speakNext(); };
            u.onerror = e => { if (utter !== u || /interrupted|canceled/.test(e.error || '')) return; stop(); };
            utter = u;
            remark(true);
            synth.speak(u);
            sync();
        }

        function togglePause() {
            if (!on) return;
            if (paused) { synth.resume(); paused = false; } else { synth.pause(); paused = true; }
            sync();
        }

        function stop() {
            const was = on;
            on = false;
            paused = false;
            utter = null;
            if (synth && (was || synth.speaking)) synth.cancel();
            for (const el of document.querySelectorAll('#view-read .verse.is-reading')) el.classList.remove('is-reading');
            sync();
        }

        // Marks the verse being read (again, after the text is rebuilt).
        function remark(scroll = false) {
            if (!root) return;
            for (const el of root.querySelectorAll('.verse.is-reading')) el.classList.remove('is-reading');
            if (!on || !current) return;
            const verse = current.verses[index];
            const el = verse && root.querySelector(`.verse[data-v="${verse.v}"]`);
            if (!el) return;
            el.classList.add('is-reading');
            if (scroll) {
                const r = el.getBoundingClientRect();
                if (r.top < 80 || r.bottom > window.innerHeight - 140) {
                    el.scrollIntoView({ block: 'center', behavior: UI.reducedMotion() ? 'auto' : 'smooth' });
                }
            }
        }

        function sync() {
            if (startBtn) {
                startBtn.setAttribute('aria-pressed', String(on));
                startBtn.classList.toggle('is-on', on);
            }
            if (!barEl) return;
            barEl.hidden = !on;
            if (!on || !current) return;
            const verse = current.verses[index];
            statusEl.textContent = paused ? 'Paused' : `Reading verse ${verse?.v ?? ''} of ${current.verses[current.verses.length - 1].v}`;
            pauseBtn.replaceChildren(icon(paused ? 'play' : 'pause', 'icon-sm'), paused ? 'Resume' : 'Pause');
        }

        function button() {
            if (!synth) return null;
            startBtn = h('button', {
                type: 'button', class: 'btn btn-sm read-listen', 'aria-pressed': 'false', title: 'Read the chapter aloud',
                onclick: () => (on ? stop() : start())
            }, icon('play', 'icon-sm'), 'Listen');
            return startBtn;
        }

        function bar() {
            if (!synth) { barEl = null; return null; }
            statusEl = h('span', { class: 'read-listen-status', 'aria-live': 'polite' });
            pauseBtn = h('button', { type: 'button', class: 'btn btn-sm', onclick: togglePause });
            barEl = h('div', { class: 'read-listenbar', hidden: true, role: 'region', 'aria-label': 'Reading aloud' },
                h('span', { class: 'read-listen-dot', 'aria-hidden': 'true' }),
                statusEl, pauseBtn,
                h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Stop reading aloud', title: 'Stop', onclick: stop }, icon('close')));
            sync();
            return barEl;
        }

        if (synth) window.addEventListener('pagehide', () => synth.cancel());
        return { start, stop, remark, button, bar, get on() { return on; } };
    })();

    // ── States ──────────────────────────────────────────────────────────
    function renderState(book, kind) {
        const copy = {
            unknown: ['Not found', 'We could not find that book', 'Check the address, or choose a book from the library.'],
            chapter: ['Not found', `${book?.name} has no such chapter`,
                book ? `It has ${chapterCount(book.slug)} ${chapterCount(book.slug) === 1 ? 'chapter' : 'chapters'}.` : ''],
            failure: ['Offline', 'The text could not be loaded', 'Check your connection and try again. Chapters you have already opened are kept on this device.'],
            offline: ['Offline', 'Scripture text is not available', 'The Bible files could not be reached. Check your connection and try again.']
        }[kind];
        Listen.stop();
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
        settings = loadSettings();
        applyComfort();
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
            const [m, years, kings] = await Promise.all([BibleText.manifest(), Api.getChapterYears(), Api.getKings()]);
            if (t !== token) return;
            if (!m) { renderState(null, 'offline'); return; }
            manifest = m;
            chapterYears = years && typeof years === 'object' ? years : {};
            kingsData = { kings: kings?.kings || [], prophets: kings?.prophets || [] };
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

    function hide() { closePicker?.(); Listen.stop(); Study.close({ silent: true }); }

    function title(route) {
        const book = route.parts[0] && Store.book(route.parts[0]);
        if (!book) return 'Read Scripture';
        return route.parts[1] ? `${book.name} ${route.parts[1]}` : book.name;
    }

    App.registerView('read', { init, show, hide, title });
    return {};
})();

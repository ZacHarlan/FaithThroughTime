// bible.js — local Bible text: version selection, reference parsing, and
// passage retrieval from per-book JSON under wwwroot/bibles/ (extracted
// from user-supplied PDFs). Returns null when no local bibles are present
// so callers can fall back gracefully.
const BibleText = (() => {
    let _manifest;              // undefined = not fetched, null = unavailable
    const _bookCache = new Map(); // "version/slug" → book JSON
    const VERSION_KEY = 'bt-bible-version';
    const MAX_VERSES = 40;

    async function manifest() {
        if (_manifest !== undefined) return _manifest;
        try {
            _manifest = await Api.getBibleManifest();
            if (!_manifest || !Array.isArray(_manifest.versions) || !_manifest.versions.length) {
                _manifest = null;
            }
        } catch {
            _manifest = null;
        }
        return _manifest;
    }

    function getVersion() {
        return localStorage.getItem(VERSION_KEY) || 'kjv';
    }
    function setVersion(id) {
        localStorage.setItem(VERSION_KEY, id);
    }

    // Book-name variants that differ from the canonical slug list
    const ALIASES = {
        'psalm': 'psalms',
        'song of songs': 'song-of-solomon',
        'canticles': 'song-of-solomon',
        'revelation of john': 'revelation'
    };

    function slugFor(bookName) {
        const key = bookName.trim().toLowerCase();
        return (ALIASES[key] || key).replace(/\s+/g, '-');
    }

    /**
     * Parse references as used in scripture_references:
     *   "Genesis 3:1-24"     (verse range, hyphen)
     *   "Genesis 1:1–2:25"   (cross-chapter range, en dash)
     *   "Psalm 23:1"         (single verse)
     *   "Genesis 12"         (whole chapter)
     */
    function parseRef(ref) {
        if (!ref) return null;
        const m = ref.trim().match(
            /^((?:[123]\s+)?[A-Za-z][A-Za-z ]*?)\s+(\d+)(?::(\d+))?(?:\s*[-–—]\s*(?:(\d+):)?(\d+))?$/
        );
        if (!m) return null;
        const startCh = parseInt(m[2]);
        const startV = m[3] ? parseInt(m[3]) : null;
        // "1:1–2:25" → endCh 2:endV 25 · "3:1-24" → endV 24 · "12" → chapter
        // "18-20" (no colons) → CHAPTER range 18..20, not verses 18:18-20
        let endCh = m[4] ? parseInt(m[4]) : startCh;
        let endV = m[5] ? parseInt(m[5]) : startV;
        if (!m[3] && !m[4] && m[5]) {
            endCh = parseInt(m[5]);
            endV = null;
        }
        return { book: m[1].trim(), startCh, startV, endCh, endV };
    }

    async function loadBook(version, slug) {
        const key = version + '/' + slug;
        if (!_bookCache.has(key)) {
            _bookCache.set(key, await Api.getBibleBook(version, slug));
        }
        return _bookCache.get(key);
    }

    /**
     * Returns { version, versions, verses: [{c, v, text}], truncated }
     * or null if local bibles are unavailable / the ref is unparseable.
     */
    async function getPassage(ref) {
        const man = await manifest();
        if (!man) return null;
        const p = parseRef(ref);
        if (!p) return null;
        const slug = slugFor(p.book);
        if (!man.books.some(b => b.slug === slug)) return null;
        const version = man.versions.some(v => v.id === getVersion())
            ? getVersion()
            : man.versions[0].id;
        let data;
        try {
            data = await loadBook(version, slug);
        } catch {
            return null;
        }
        const verses = [];
        let truncated = false;
        outer:
        for (let ch = p.startCh; ch <= p.endCh; ch++) {
            const chap = data[String(ch)];
            if (!chap) continue;
            const nums = Object.keys(chap).map(Number).sort((a, b) => a - b);
            for (const v of nums) {
                if (ch === p.startCh && p.startV != null && v < p.startV) continue;
                if (ch === p.endCh && p.endV != null && v > p.endV) continue;
                if (verses.length >= MAX_VERSES) { truncated = true; break outer; }
                verses.push({ c: ch, v, text: chap[String(v)] });
            }
        }
        if (!verses.length) return null;
        return { version, versions: man.versions, verses, truncated };
    }

    // ── Inline reference linkification ───────────────────────
    // Canonical book names + the abbreviations used in the dataset's
    // chronology notes ("Gen 5:5", "2 Kgs 18:2", "Exod 12:40-41").
    const CANON = {};
    [
        'Genesis|Gen', 'Exodus|Exod|Exo', 'Leviticus|Lev', 'Numbers|Num',
        'Deuteronomy|Deut|Deu', 'Joshua|Josh|Jos', 'Judges|Judg|Jdg', 'Ruth',
        '1 Samuel|1 Sam', '2 Samuel|2 Sam', '1 Kings|1 Kgs|1 Kin|1 Ki',
        '2 Kings|2 Kgs|2 Kin|2 Ki', '1 Chronicles|1 Chr|1 Chron',
        '2 Chronicles|2 Chr|2 Chron', 'Ezra', 'Nehemiah|Neh', 'Esther|Esth|Est',
        'Job', 'Psalms|Psalm|Pss|Psa|Ps', 'Proverbs|Prov|Pro',
        'Ecclesiastes|Eccl|Ecc', 'Song of Solomon|Song of Songs|Song|Sol',
        'Isaiah|Isa', 'Jeremiah|Jer', 'Lamentations|Lam', 'Ezekiel|Ezek|Eze',
        'Daniel|Dan', 'Hosea|Hos', 'Joel', 'Amos', 'Obadiah|Obad',
        'Jonah|Jon', 'Micah|Mic', 'Nahum|Nah', 'Habakkuk|Hab',
        'Zephaniah|Zeph', 'Haggai|Hag', 'Zechariah|Zech|Zec', 'Malachi|Mal',
        'Matthew|Matt|Mat', 'Mark|Mk', 'Luke|Lk', 'John|Jn', 'Acts',
        'Romans|Rom', '1 Corinthians|1 Cor', '2 Corinthians|2 Cor',
        'Galatians|Gal', 'Ephesians|Eph', 'Philippians|Phil|Php',
        'Colossians|Col', '1 Thessalonians|1 Thess|1 Thes',
        '2 Thessalonians|2 Thess|2 Thes', '1 Timothy|1 Tim', '2 Timothy|2 Tim',
        'Titus|Tit', 'Philemon|Phlm|Philem', 'Hebrews|Heb', 'James|Jas',
        '1 Peter|1 Pet', '2 Peter|2 Pet', '1 John|1 Jn', '2 John|2 Jn',
        '3 John|3 Jn', 'Jude', 'Revelation|Rev'
    ].forEach(group => {
        const names = group.split('|');
        for (const n of names) CANON[n.toLowerCase()] = names[0];
    });
    // Longest names first so "1 Chronicles" wins over "1 Chr" etc.
    const NAME_PATTERN = Object.keys(CANON)
        .sort((a, b) => b.length - a.length)
        .map(n => n.replace(/ /g, '\\s+'))
        .join('|');
    const REF_REGEX = new RegExp(
        `\\b(${NAME_PATTERN})\\.?\\s+(\\d+(?::\\d+)?(?:\\s*[-–—]\\s*\\d+(?::\\d+)?)?)`,
        'gi'
    );

    /**
     * Wrap scripture references in ALREADY-ESCAPED prose with clickable
     * <button class="ref-link" data-ref="Canonical C:V"> elements.
     * Input MUST be HTML-escaped text (this only adds trusted markup).
     */
    function linkifyRefs(escapedText) {
        return escapedText.replace(REF_REGEX, (match, name, tail) => {
            const canonical = CANON[name.toLowerCase().replace(/\s+/g, ' ')];
            if (!canonical) return match;
            const ref = `${canonical} ${tail.replace(/\s+/g, '')}`;
            return `<button type="button" class="ref-link" data-ref="${ref}">${match}</button>`;
        });
    }

    return { manifest, getVersion, setVersion, getPassage, parseRef, linkifyRefs };
})();

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
        // "1:1–2:25" → endCh 2, endV 25 · "3:1-24" → endV 24 · "12" → chapter
        const endCh = m[4] ? parseInt(m[4]) : startCh;
        const endV = m[5] ? parseInt(m[5]) : startV;
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

    return { manifest, getVersion, setVersion, getPassage, parseRef };
})();

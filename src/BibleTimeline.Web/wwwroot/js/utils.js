// utils.js — shared helpers: single source of truth for year formatting,
// lifespan math, and HTML escaping. Previously formatYear existed in five
// modules with divergent year-0 behavior and escapeHtml in six.
const Utils = (() => {
    function formatYear(y) {
        if (y == null) return '?';
        if (y < 0) return `${Math.abs(y)} BC`;
        if (y === 0) return '1 BC'; // there is no year 0
        return `AD ${y}`;
    }

    // Span between two years, correcting for the missing year 0:
    // born 4 BC (-4), died AD 30 → 33 years, not 34.
    function yearSpan(a, b) {
        if (a == null || b == null) return null;
        let s = b - a;
        if (a < 0 && b > 0) s -= 1;
        return s;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    // ── Search result grouping ───────────────────────────────
    // One definition for the desktop dropdown and the mobile overlay; the
    // two hand-written copies had already diverged on legacy 'scripture'.
    const SEARCH_GROUPS = [
        { key: 'person', label: 'People', icon: '#i-person' },
        { key: 'event',  label: 'Events', icon: '#i-calendar' },
        { key: 'book',   label: 'Books',  icon: '#i-book' }
    ];

    function groupSearchResults(results) {
        const buckets = { person: [], event: [], book: [] };
        for (const r of results) {
            const key = buckets[r.type] ? r.type
                : (r.type === 'scripture' ? 'book' : 'event');
            buckets[key].push(r);
        }
        return SEARCH_GROUPS
            .filter(g => buckets[g.key].length)
            .map(g => ({ key: g.key, label: g.label, icon: g.icon, items: buckets[g.key] }));
    }

    // ── Keyboard navigation over a rendered result list ──────
    // Shared by the header search dropdown and the lineage autocomplete.
    // handle() returns immediately for non-navigation keys, so ordinary
    // typing never touches the DOM.
    function listKeyNav({ getItems, activeClass, onPick, isOpen }) {
        let index = -1;
        function handle(e) {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
            if (isOpen && !isOpen()) return;
            const items = getItems();
            if (!items.length) return;
            e.preventDefault();
            if (e.key === 'Enter') {
                // No highlight yet: act on the first result
                onPick(items[index >= 0 && index < items.length ? index : 0]);
                return;
            }
            const prev = index;
            index = e.key === 'ArrowDown'
                ? Math.min(index + 1, items.length - 1)
                : Math.max(index - 1, 0);
            if (prev === index) return;
            if (prev >= 0 && items[prev]) items[prev].classList.remove(activeClass);
            items[index].classList.add(activeClass);
            items[index].scrollIntoView({ block: 'nearest' });
        }
        return { handle, reset() { index = -1; } };
    }

    return { formatYear, yearSpan, escapeHtml, groupSearchResults, listKeyNav };
})();

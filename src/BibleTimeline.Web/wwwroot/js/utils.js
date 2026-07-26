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

    return { formatYear, yearSpan, escapeHtml };
})();

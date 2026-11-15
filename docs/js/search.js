// search.js — the command palette. Opens on App 'open-search' (top-bar trigger,
// "/" and Cmd/Ctrl-K). Finds people, events, places, books and eras as you type,
// understands scripture references ("john 3:16") and pairs of names
// ("noah and abraham"), and remembers recent picks.
const Search = (() => {
    const RECENT_KEY = 'ftt-search-recent';
    const MAX_RECENT = 6;
    const GROUPS = [
        { type: 'person', label: 'People', max: 6 },
        { type: 'event', label: 'Events', max: 5 },
        { type: 'location', label: 'Places', max: 4 },
        { type: 'book', label: 'Books', max: 3 },
        { type: 'period', label: 'Eras', max: 3 }
    ];
    const ICON = { person: 'person', event: 'event', location: 'pin', book: 'book', period: 'timeline' };
    const PAIR_SPLIT = /\s+(?:and|vs\.?)\s+|\s*&\s*/i;

    let root, panel, input, list, status;
    let rows = [];            // the options currently on screen, in order
    let active = -1;
    let releaseFocus = null;
    let historyPushed = false;
    let pendingHref = null;   // where to go once our history entry has been popped
    let starterRows = null;   // computed once from the data
    let familyLine;           // undefined until computed; null if the data has no line

    const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // ── Building the DOM (once) ─────────────────────────────────────────
    function build() {
        root = document.getElementById('search');
        const listId = 'search-list';
        input = UI.h('input', {
            class: 'search-input', type: 'text', role: 'combobox', autocomplete: 'off', spellcheck: 'false',
            'aria-autocomplete': 'list', 'aria-expanded': 'true', 'aria-controls': listId,
            'aria-label': 'Search people, events, places, books and eras',
            placeholder: UI.isMobile() ? 'Search, or try John 3:16' : 'Search people, events, places, or John 3:16',
            enterkeyhint: 'go'
        });
        list = UI.h('div', { class: 'search-list', id: listId, role: 'listbox', 'aria-label': 'Results' });
        status = UI.h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
        panel = UI.h('div', { class: 'search-panel' },
            UI.h('div', { class: 'search-bar' },
                UI.icon('search', 'search-glass'),
                input,
                UI.h('kbd', { class: 'search-esc', 'aria-hidden': 'true' }, 'esc'),
                UI.h('button', { class: 'search-cancel', type: 'button', onclick: () => close() }, 'Cancel')),
            list,
            UI.h('div', { class: 'search-foot', 'aria-hidden': 'true' },
                UI.h('span', null, UI.h('kbd', null, '↑'), UI.h('kbd', null, '↓'), ' to move'),
                UI.h('span', null, UI.h('kbd', null, '↵'), ' to open'),
                UI.h('span', null, UI.h('kbd', null, 'esc'), ' to close')),
            status);
        root.append(UI.h('div', { class: 'search-scrim', onclick: () => close() }), panel);

        input.addEventListener('input', render);
        input.addEventListener('keydown', onKey);
        root.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
        // Hovering moves the highlight but never scrolls the list under the pointer.
        list.addEventListener('pointermove', e => {
            const i = rows.findIndex(r => r.el === e.target.closest('[role="option"]'));
            if (i >= 0) setActive(i, { scroll: false });
        });
        window.addEventListener('popstate', onPop);
    }

    // ── Open / close ────────────────────────────────────────────────────
    const isOpen = () => root && !root.hidden;

    function open() {
        if (!root) build();
        if (isOpen()) { input.focus(); input.select(); return; }
        input.value = '';
        render();
        root.hidden = false;
        requestAnimationFrame(() => root.classList.add('is-open'));
        releaseFocus = UI.trapFocus(root);
        input.focus();
        // A history entry of our own, so the Back button closes the palette
        // instead of leaving the page underneath it.
        history.pushState({ search: true }, '', window.location.href);
        historyPushed = true;
    }

    // Close, then optionally navigate. When we own a history entry it is
    // popped first so the destination replaces it rather than stacking on it.
    function close(href = null) {
        if (!isOpen()) return;
        if (historyPushed) {
            pendingHref = href;
            history.back();       // → onPop finishes the job
        } else {
            finishClose();
            if (href) Router.go(href);
        }
    }

    function onPop() {
        if (!historyPushed) return;
        historyPushed = false;
        finishClose();
        if (pendingHref) Router.go(pendingHref);
        pendingHref = null;
    }

    function finishClose() {
        root.classList.remove('is-open');
        root.hidden = true;
        if (releaseFocus) { releaseFocus(); releaseFocus = null; }
    }

    // ── Keyboard ────────────────────────────────────────────────────────
    function onKey(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!rows.length) return;
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((active + step + rows.length) % rows.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (rows[active]) choose(rows[active]);
        }
    }

    function setActive(i, { scroll = true } = {}) {
        if (i === active) return;
        rows[active]?.el.classList.remove('is-active');
        rows[active]?.el.setAttribute('aria-selected', 'false');
        active = i;
        const row = rows[i];
        if (!row) { input.removeAttribute('aria-activedescendant'); return; }
        row.el.classList.add('is-active');
        row.el.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', row.el.id);
        if (scroll) row.el.scrollIntoView({ block: 'nearest' });
    }

    function choose(row) {
        remember(row);
        close(row.href);
    }

    // ── Rendering ───────────────────────────────────────────────────────
    // Each section is { label, rows: [{ href, icon, tint, name, marks, sub, recent }] }.
    function render() {
        const q = input.value.trim();
        const sections = q ? resultSections(q) : emptySections();
        UI.clear(list);
        rows = [];
        active = -1;
        input.removeAttribute('aria-activedescendant');

        if (q && !sections.some(s => s.rows.length)) {
            list.append(noResults(q));
            sections.push(...waysIn());
        }
        sections.forEach((section, si) => {
            if (!section.rows.length) return;
            const headId = `search-h-${si}`;
            list.append(UI.h('div', { class: 'search-group', role: 'group', 'aria-labelledby': headId },
                UI.h('div', { class: 'search-head', id: headId, role: 'presentation' }, section.label),
                section.rows.map(row => optionEl(row))));
        });
        setActive(rows.length ? 0 : -1);
        status.textContent = q ? (rows.length ? `${rows.length} results` : 'No results') : '';
    }

    function optionEl(row) {
        const el = UI.h('div', {
            class: `search-option ${row.action ? 'is-action' : `kind-${row.kind}`}`, role: 'option', id: `search-opt-${rows.length}`, 'aria-selected': 'false',
            style: row.tint ? { '--tint': row.tint } : null,
            onclick: () => choose(row)
        },
            UI.h('span', { class: 'search-icon' }, UI.icon(row.icon)),
            UI.h('span', { class: 'search-text' },
                UI.h('span', { class: 'search-name' }, row.marks || row.name),
                row.sub ? UI.h('span', { class: 'search-sub' }, row.sub) : null),
            UI.icon(row.action ? 'arrow-right' : 'chevron-right', 'search-go'));
        rows.push({ ...row, el });
        return el;
    }

    function noResults(q) {
        return UI.h('div', { class: 'search-empty' },
            UI.h('p', { class: 'search-empty-title' }, `Nothing matches “${q}”.`),
            UI.h('p', { class: 'dim' },
                'Try a name such as a king, prophet or apostle, a place, or a reference like Genesis 12. ',
                'Or begin from one of these.'));
    }

    // ── Results for a query ─────────────────────────────────────────────
    function resultSections(q) {
        const suggested = [refRow(q), pairRow(q)].filter(Boolean);
        // A pair query ("noah and abraham") matches little as a whole, so lead with both people.
        const pair = suggested.find(r => r.pair)?.pair || [];
        const hits = [
            ...pair.map(p => ({ type: 'person', item: p, sub: subFor(p), score: Infinity })),
            ...Store.search(q, { limit: 40 }).filter(h => !pair.includes(h.item))
        ];
        const groups = GROUPS.map(g => {
            const mine = hits.filter(h => h.type === g.type).slice(0, g.max);
            return { label: g.label, best: mine[0]?.score ?? -Infinity, rows: mine.map(h => entityRow(h.item, h.sub, q)) };
        }).sort((a, b) => b.best - a.best);
        return [{ label: 'Suggested', rows: suggested }, ...groups];
    }

    function entityRow(item, sub, q = '') {
        return {
            href: UI.href(item), kind: item.kind, icon: ICON[item.kind], tint: tintFor(item),
            name: item.name, marks: q ? highlight(item.name, q) : null, sub,
            recent: { kind: item.kind, slug: item.slug }
        };
    }

    function tintFor(item) {
        if (item.kind === 'person') return UI.familyColor(item.role);
        if (item.kind === 'event') return UI.familyColor(item.category);
        if (item.kind === 'period') return item.color;
        return null;
    }

    // "john 3:16", "gen 12", "psalm 23:1-4" → a row that opens the reader.
    function refRow(q) {
        const ref = BibleText.parseRef(q);
        if (!ref) return null;
        const book = resolveBook(ref.book);
        if (!book) return null;
        let label = `${book.name} ${ref.startCh}`;
        let verses = null;
        if (ref.startV != null) {
            verses = ref.endCh === ref.startCh && ref.endV !== ref.startV ? `${ref.startV}-${ref.endV}` : String(ref.startV);
            label += `:${verses}`;
        }
        return {
            href: Router.build('read', [book.slug, ref.startCh], { v: verses }),
            icon: 'book', action: true, name: `Read ${label}`, sub: 'Open in the reader',
            recent: { href: null, label: `Read ${label}`, icon: 'book' }
        };
    }

    // Exact name or abbreviation first; otherwise a prefix that names one book only.
    function resolveBook(typed) {
        const t = norm(typed).replace(/\s+/g, ' ').replace(/\.$/, '');
        if (t.length < 2) return null;
        const exact = Store.books.find(b => norm(b.name) === t || norm(b.abbreviation) === t);
        if (exact) return exact;
        const prefixed = Store.books.filter(b => norm(b.name).startsWith(t));
        return prefixed.length === 1 ? prefixed[0] : null;
    }

    // "noah and abraham", "david & goliath", "peter vs paul" → Did they meet?
    function pairRow(q) {
        const parts = q.split(PAIR_SPLIT).map(s => s.trim()).filter(Boolean);
        if (parts.length !== 2) return null;
        const [a, b] = parts.map(bestPerson);
        if (!a || !b || a === b) return null;
        return {
            href: Router.build('meet', [a.slug, b.slug]),
            icon: 'overlap', action: true, name: `Did ${a.name} and ${b.name} meet?`,
            sub: 'See whether their lives overlapped', pair: [a, b],
            recent: { href: null, label: `Did ${a.name} and ${b.name} meet?`, icon: 'overlap' }
        };
    }

    // The top person for a fragment, but only when the name itself matched —
    // a hit on description text alone is too loose to build a pair from.
    function bestPerson(fragment) {
        const hit = Store.search(fragment, { types: ['person'], limit: 1 })[0];
        if (!hit) return null;
        const f = norm(fragment);
        const names = [hit.item.name, ...hit.item.altNames].map(norm);
        return names.some(n => n.split(/[^a-z0-9]+/).some(t => t.startsWith(f)) || n.startsWith(f)) ? hit.item : null;
    }

    // Wrap the part of `name` that matched the query in <mark>. Matching runs on
    // the accent-folded name; `map` takes folded positions back to original ones.
    function highlight(name, q) {
        let folded = '';
        const map = [];
        for (let i = 0; i < name.length; i++) {
            const f = norm(name[i]);
            for (let k = 0; k < f.length; k++) map.push(i);
            folded += f;
        }
        map.push(name.length);
        const fq = norm(q);
        let ranges = [];
        const whole = folded.indexOf(fq);
        if (whole >= 0) ranges = [[whole, whole + fq.length]];
        else {
            for (const w of fq.split(/\s+/).filter(Boolean)) {
                const at = [...folded.matchAll(/(^|[^a-z0-9])/g)]
                    .map(m => m.index + m[1].length)
                    .find(i => folded.startsWith(w, i));
                if (at != null) ranges.push([at, at + w.length]);
            }
            ranges.sort((x, y) => x[0] - y[0]);
        }
        if (!ranges.length) return null;
        const out = [];
        let pos = 0;
        for (const [s, e] of ranges) {
            const from = map[s], to = map[e];
            if (from < pos) continue;
            if (from > pos) out.push(name.slice(pos, from));
            out.push(UI.h('mark', null, name.slice(from, to)));
            pos = to;
        }
        out.push(name.slice(pos));
        return out;
    }

    // ── Empty query: recent picks and starting points ───────────────────
    function emptySections() {
        return [
            { label: 'Recent', rows: recentRows() },
            { label: 'Start here', rows: starters() },
            ...waysIn()
        ];
    }

    function waysIn() {
        const line = lineToChrist();
        return [{
            label: 'Ways in',
            rows: [
                { href: '#/meet', icon: 'overlap', action: true, name: 'Did they meet?', sub: 'Pick two people and see whether their lives overlapped' },
                line && {
                    href: Router.build('family', [line.to.slug]), icon: 'tree', action: true,
                    name: `${line.from.name} to ${line.to.name}`, sub: 'Trace the family line, generation by generation'
                },
                { href: '#/about', icon: 'info', action: true, name: 'About the dates', sub: 'Where the years come from and how sure they are' }
            ].filter(Boolean)
        }];
    }

    // The longest recorded line of descent ending in a major figure (Adam to
    // Jesus). Restricted to major figures so the line does not end on an
    // obscure name from a genealogy.
    function lineToChrist() {
        if (familyLine !== undefined) return familyLine;
        let best = null;
        for (const p of Store.people) {
            if (p.significance !== 'major') continue;
            const up = Store.ancestors(p);
            if (!best || up.length > best.up.length) best = { up, to: p };
        }
        familyLine = best && best.up.length ? { from: best.up[best.up.length - 1], to: best.to } : null;
        return familyLine;
    }

    // A few major people and events, each from a different era: the most
    // connected major figures first, then the most connected events from eras
    // those figures do not already cover. Shown in time order.
    function starters() {
        if (!starterRows) {
            const eraOf = x => Store.periodAt(x.span.start);
            const byWeight = (list, weightOf) => list.slice().sort((a, b) => weightOf(b) - weightOf(a));
            const people = onePerEra(byWeight(
                Store.people.filter(p => p.significance === 'major' && p.span && !p.span.estimated),
                p => p.events.length), eraOf, 3);
            const covered = new Set(people.map(eraOf));
            const events = onePerEra(byWeight(
                Store.events.filter(e => e.significance === 'major' && e.startYear != null && !covered.has(eraOf(e))),
                e => e.people.length + e.scripture.length), eraOf, 2);
            starterRows = [...people, ...events]
                .sort((a, b) => a.span.start - b.span.start)
                .map(x => entityRow(x, subFor(x)));
        }
        return starterRows;
    }

    // The first `n` items of a ranked list whose eras all differ.
    function onePerEra(ranked, eraOf, n) {
        const seen = new Set(), out = [];
        for (const x of ranked) {
            if (out.length === n) break;
            if (seen.has(eraOf(x))) continue;
            seen.add(eraOf(x));
            out.push(x);
        }
        return out;
    }

    // ── Recent picks (per browser) ──────────────────────────────────────
    function readRecent() {
        try {
            const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch {
            return [];
        }
    }

    function remember(row) {
        if (!row.recent) return;
        const entry = row.recent.kind ? row.recent : { ...row.recent, href: row.href };
        const same = r => (entry.kind ? r.kind === entry.kind && r.slug === entry.slug : r.href === entry.href);
        const next = [entry, ...readRecent().filter(r => !same(r))].slice(0, MAX_RECENT);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    }

    // Entities are stored by slug and looked up again, so a renamed or removed
    // entry shows its current name or quietly drops out.
    function recentRows() {
        return readRecent().map(r => {
            if (r.kind) {
                const item = Store[r.kind]?.(r.slug);
                return item ? entityRow(item, subFor(item)) : null;
            }
            return r.href && r.label ? { href: r.href, icon: r.icon || 'arrow-right', action: true, name: r.label, recent: r } : null;
        }).filter(Boolean);
    }

    // The same sub line search results show, from the one place that formats it.
    function subFor(item) {
        return Store.search(item.name, { types: [item.kind], limit: 40 }).find(h => h.item === item)?.sub || '';
    }

    App.on('open-search', open);

    return { open, close };
})();

// find.js — search the words of Scripture, offline, from the local Bible files.
//
//   #/find?q=<query>&v=<version>&in=<scope>      scope: ot | nt | <book-slug> (default: the whole Bible)
//
// Every word must appear (case and punctuation ignored, whole words; a trailing * makes a
// prefix, as in shepherd*), and "quoted words" must appear exactly in that order. Books load
// a few at a time in canonical order and results appear as they arrive; books stay in memory
// for the visit, so the next search is instant.
const Find = (() => {
    const { h, icon } = UI;
    const PAGE = 100;            // hits shown before "Show more"
    const BATCH = 4;             // books fetched at once
    const WORDS = /([\p{L}\p{N}\p{M}]+)(\*?)/gu;
    const EXAMPLES = ['"the Lord is my shepherd"', 'shepherd*', '"love your enemies"', 'fear not', '"in the beginning"'];

    let root, manifest = null, token = 0;
    const bookCache = new Map();            // "version/slug" → book JSON, kept for the visit
    const els = {};
    let state = { q: '', v: '', scope: 'all' };
    let run = null;                         // the search on screen: { hits, counts, shown, limit, lastBook, ... }

    // ── Reading the query ───────────────────────────────────────────────
    const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

    // "the Lord" "is my*" → [[{w, prefix}…]…]: each term is a run of words that must appear in order.
    function parseQuery(q) {
        const terms = [];
        const text = q.replace(/[“”„«»]/g, '"');
        for (const m of text.matchAll(/"([^"]*)"?|(\S+)/g)) {
            const words = [...(m[1] ?? m[2]).matchAll(WORDS)].map(w => ({ w: fold(w[1]), prefix: w[2] === '*' }));
            if (words.length) terms.push(words);
        }
        return terms;
    }

    function tokenize(text) {
        return [...text.matchAll(/[\p{L}\p{N}\p{M}]+/gu)].map(m => ({ w: fold(m[0]), s: m.index, e: m.index + m[0].length }));
    }

    // Every place `term` occurs in `tokens`, as [start, end] character ranges pushed to `out`.
    function matchTerm(tokens, term, out) {
        let found = false;
        for (let i = 0; i + term.length <= tokens.length; i++) {
            let ok = true;
            for (let j = 0; j < term.length; j++) {
                const t = tokens[i + j].w, q = term[j];
                if (q.prefix ? !t.startsWith(q.w) : t !== q.w) { ok = false; break; }
            }
            if (ok) { found = true; out.push([tokens[i].s, tokens[i + term.length - 1].e]); }
        }
        return found;
    }

    function matchVerse(text, terms) {
        const tokens = tokenize(text);
        const ranges = [];
        for (const term of terms) if (!matchTerm(tokens, term, ranges)) return null;
        ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
        const merged = [];
        for (const r of ranges) {
            const last = merged[merged.length - 1];
            if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([...r]);
        }
        return merged;
    }

    function marked(text, ranges) {
        const out = [];
        let pos = 0;
        for (const [s, e] of ranges) {
            if (s > pos) out.push(text.slice(pos, s));
            out.push(h('mark', null, text.slice(s, e)));
            pos = e;
        }
        out.push(text.slice(pos));
        return out;
    }

    // ── Which books, which translation ──────────────────────────────────
    function scopeBooks(scope) {
        const here = new Set(manifest.books.map(b => b.slug));
        const all = Store.books.filter(b => here.has(b.slug));
        if (scope === 'ot' || scope === 'nt') return all.filter(b => b.testament === scope.toUpperCase());
        const one = all.find(b => b.slug === scope);
        return one ? [one] : all;
    }
    const normScope = s => (s === 'ot' || s === 'nt' || Store.book(s)) ? s : 'all';
    const versionInfo = id => manifest.versions.find(v => v.id === id);
    function defaultVersion() {
        const saved = BibleText.getVersion();
        return versionInfo(saved) ? saved : manifest.versions[0].id;
    }
    async function loadBook(version, slug) {
        const key = `${version}/${slug}`;
        if (!bookCache.has(key)) bookCache.set(key, await Api.getBibleBook(version, slug));
        return bookCache.get(key);
    }

    // ── The page, built once ────────────────────────────────────────────
    function build() {
        els.input = h('input', {
            class: 'field find-input', type: 'search', name: 'q', autocomplete: 'off', spellcheck: 'false',
            enterkeyhint: 'search', 'aria-label': 'Words to find in Scripture', placeholder: 'Find words, such as shepherd* or “the Lord is my shepherd”'
        });
        els.scope = h('select', { class: 'field find-scope', 'aria-label': 'Where to search', onchange: () => go({ scope: els.scope.value }) });
        els.versions = h('div', { class: 'chip-row find-versions', role: 'group', 'aria-label': 'Translation' });
        els.summary = h('p', { class: 'find-summary', role: 'status', 'aria-live': 'polite' });
        els.progress = h('p', { class: 'find-progress dim', hidden: true });
        els.books = h('div', { class: 'chip-row find-books', role: 'group', 'aria-label': 'Matches by book', hidden: true });
        els.list = h('div', { class: 'find-list', role: 'list' });
        els.more = h('button', { type: 'button', class: 'btn find-more', hidden: true, onclick: showMore }, 'Show more');
        els.body = h('div', { class: 'find-body' });

        const form = h('form', { class: 'find-form', role: 'search', onsubmit: e => { e.preventDefault(); go({ q: els.input.value }); } },
            h('div', { class: 'find-bar' }, icon('search'), els.input),
            h('button', { type: 'submit', class: 'btn btn-primary find-go' }, 'Search'));
        els.input.addEventListener('input', UI.debounce(() => { if (els.input.value.trim() !== state.q) go({ q: els.input.value }); }, 450));

        root.replaceChildren(h('div', { class: 'page find-page' },
            h('header', { class: 'find-hero rise' },
                h('p', { class: 'eyebrow' }, 'Scripture'),
                h('h1', null, 'Search ', h('em', null, 'Scripture')),
                h('p', { class: 'lede' }, 'Find the words themselves, in any passage of the text. Everything is searched on your device, so it works offline.'),
                form,
                h('div', { class: 'find-options' }, els.scope, els.versions),
                h('p', { class: 'find-tip faint' }, 'Every word must appear. Put “quotes” around words that belong together, and end a word with * to match its other forms, as in shepherd*.')),
            els.body));
        els.body.append(els.summary, els.progress, els.books, els.list, els.more);
    }

    function fillOptions() {
        els.scope.replaceChildren();
        UI.append(els.scope, [
            h('option', { value: 'all' }, 'Whole Bible'),
            h('option', { value: 'ot' }, 'Old Testament'),
            h('option', { value: 'nt' }, 'New Testament'),
            ['OT', 'NT'].map(t => h('optgroup', { label: t === 'OT' ? 'Old Testament books' : 'New Testament books' },
                scopeBooks('all').filter(b => b.testament === t).map(b => h('option', { value: b.slug }, b.name))))
        ]);
    }

    function syncControls() {
        els.input.value = state.q;
        els.scope.value = state.scope;
        els.versions.replaceChildren(...manifest.versions.map(v => h('button', {
            type: 'button', class: `chip${v.id === state.v ? ' is-on' : ''}`, 'aria-pressed': String(v.id === state.v),
            title: v.label, onclick: () => go({ v: v.id })
        }, v.short)));
    }

    // ── Moving: change part of the search, keep the address current ─────
    function go(change) {
        const next = { ...state, ...change };
        next.q = next.q.trim();
        next.scope = normScope(next.scope);
        if (next.q === state.q && next.v === state.v && next.scope === state.scope) return;
        state = next;
        Router.replace(Router.build('find', [], { q: state.q, v: state.v, in: state.scope === 'all' ? '' : state.scope }));
        syncControls();
        search();
    }

    // ── Searching ───────────────────────────────────────────────────────
    async function search() {
        const t = ++token;
        const terms = parseQuery(state.q);
        run = null;
        els.list.replaceChildren();
        els.more.hidden = true;
        els.books.hidden = true;
        els.progress.hidden = true;
        if (!terms.length) { renderIntro(); return; }

        const books = scopeBooks(state.scope);
        const mine = run = { terms, books, hits: [], counts: new Map(), shown: 0, limit: PAGE, lastBook: null, failed: 0, done: false, total: 0 };
        els.summary.textContent = 'Searching…';
        for (let i = 0; i < books.length; i += BATCH) {
            const batch = books.slice(i, i + BATCH);
            els.progress.textContent = `Searching ${batch[0].name}…`;
            els.progress.hidden = false;
            const loaded = await Promise.all(batch.map(b => loadBook(state.v, b.slug).catch(() => null)));
            if (t !== token) return;
            loaded.forEach((data, k) => { if (data) scan(mine, batch[k], data); else mine.failed++; });
            flush(mine);
        }
        mine.done = true;
        els.progress.hidden = true;
        flush(mine);
    }

    function scan(r, book, data) {
        let n = 0;
        for (const ch of Object.keys(data)) {
            for (const v of Object.keys(data[ch])) {
                const text = data[ch][v];
                const ranges = matchVerse(text, r.terms);
                if (ranges) { r.hits.push({ book, ch: Number(ch), v: Number(v), text, ranges }); n++; }
            }
        }
        if (n) { r.counts.set(book, n); r.total += n; }
    }

    const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

    function flush(r) {
        if (r !== run) return;
        // Summary
        if (r.failed === r.books.length) { renderOffline(); return; }
        const where = r.total ? ` in ${plural(r.counts.size, 'book', 'books')}` : '';
        if (r.done && !r.total) els.summary.textContent = '';
        else els.summary.textContent = r.done || r.total ? `${plural(r.total, 'verse', 'verses')}${where}${r.done ? '' : ' so far'}` : 'Searching…';
        // Hits
        const upto = Math.min(r.hits.length, r.limit);
        const frag = [];
        for (; r.shown < upto; r.shown++) {
            const hit = r.hits[r.shown];
            if (hit.book !== r.lastBook) {
                frag.push(h('h2', { class: 'find-book-head display' }, hit.book.name, h('span', { class: 'find-book-n' }, plural(r.counts.get(hit.book), 'verse', 'verses'))));
                r.lastBook = hit.book;
            }
            frag.push(hitEl(hit));
        }
        if (frag.length) els.list.append(...frag);
        els.more.hidden = r.shown >= r.hits.length;
        if (!els.more.hidden) els.more.textContent = `Show more (${(r.hits.length - r.shown).toLocaleString()} left)`;
        renderBooks(r);
        if (r.done) {
            if (!r.total) renderNone(r);
            else if (r.failed) {
                els.progress.textContent = `${plural(r.failed, 'book', 'books')} could not be loaded, so some verses may be missing.`;
                els.progress.hidden = false;
            }
        }
    }

    function hitEl(hit) {
        const href = Router.build('read', [hit.book.slug, hit.ch], { v: hit.v });
        return h('a', { class: 'find-hit', href, role: 'listitem' },
            h('span', { class: 'find-ref' }, `${hit.book.name} ${hit.ch}:${hit.v}`),
            h('span', { class: 'find-text scripture' }, marked(hit.text, hit.ranges)));
    }

    function showMore() {
        if (!run) return;
        run.limit += PAGE;
        const before = run.shown;
        flush(run);
        els.list.querySelectorAll('.find-hit')[before]?.focus({ preventScroll: false });
    }

    // Compact book list: counts per book; choosing one narrows the search to it.
    function renderBooks(r) {
        const single = r.books.length === 1;
        els.books.hidden = !r.total;
        if (!r.total) return;
        const chips = [];
        if (single) chips.push(h('button', { type: 'button', class: 'chip', onclick: () => go({ scope: 'all' }) }, icon('chevron-left', 'icon-sm'), 'All books'));
        for (const [book, n] of r.counts) {
            chips.push(h('button', {
                type: 'button', class: `chip${single ? ' is-on' : ''}`, 'aria-pressed': single ? 'true' : 'false',
                onclick: () => go({ scope: single ? 'all' : book.slug }), title: single ? 'Search every book again' : `Only ${book.name}`
            }, book.name, h('span', { class: 'chip-sub' }, n.toLocaleString())));
        }
        els.books.replaceChildren(...chips);
    }

    // ── States ──────────────────────────────────────────────────────────
    function stateBlock(eyebrow, title, text, actions) {
        els.list.replaceChildren(h('div', { class: 'find-state rise' },
            h('p', { class: 'eyebrow' }, eyebrow),
            h('h2', { class: 'display' }, title),
            h('p', { class: 'lede' }, text),
            actions ? h('div', { class: 'find-state-actions' }, actions) : null));
    }

    function renderIntro() {
        els.summary.textContent = '';
        stateBlock('Try one', 'What are you looking for?',
            'Type a word, a few words, or a phrase. Results show the verse, with your words marked.',
            h('div', { class: 'chip-row' }, EXAMPLES.map(x => h('a', { class: 'chip', href: Router.build('find', [], { q: x }) }, x))));
    }

    function renderNone(r) {
        els.summary.textContent = '';
        const wide = state.scope !== 'all';
        stateBlock('No matches', `Nothing says “${state.q}”`,
            'Check the spelling, drop a word, or end a word with * to catch its other forms. Another translation may word it differently.',
            [wide ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go({ scope: 'all' }) }, 'Search the whole Bible') : null,
                ...manifest.versions.filter(v => v.id !== state.v).map(v => h('button', { type: 'button', class: 'btn', onclick: () => go({ v: v.id }) }, `Try the ${v.short}`))]);
    }

    function renderOffline() {
        token++;
        run = null;
        els.summary.textContent = '';
        els.progress.hidden = true;
        els.books.hidden = true;
        els.more.hidden = true;
        stateBlock('Offline', 'The text could not be loaded',
            'Check your connection and try again. Books you have already opened are kept on this device.',
            h('button', { type: 'button', class: 'btn btn-primary', onclick: () => search() }, 'Try again'));
        els.list.firstChild.setAttribute('role', 'alert');
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('find');
        root.tabIndex = -1;
    }

    async function show(route) {
        const t = ++token;
        if (!manifest) {
            manifest = await BibleText.manifest();
            if (t !== token) return;
            if (!manifest) {
                root.replaceChildren(h('div', { class: 'page find-page' }, h('div', { class: 'find-state rise', role: 'alert' },
                    h('p', { class: 'eyebrow' }, 'Offline'), h('h1', null, 'Scripture text is not available'),
                    h('p', { class: 'lede' }, 'The Bible files could not be reached. Check your connection and try again.'),
                    h('div', { class: 'find-state-actions' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => show(Router.current) }, 'Try again')))));
                return;
            }
        }
        if (!els.input || !root.contains(els.input)) { build(); fillOptions(); }
        const v = versionInfo(route.query.v) ? route.query.v : defaultVersion();
        state = { q: (route.query.q || '').trim(), v, scope: normScope(route.query.in || 'all') };
        syncControls();
        search();
        if (!state.q) els.input.focus({ preventScroll: true });
    }

    const hide = () => { token++; };
    const title = () => 'Search Scripture';

    App.registerView('find', { init, show, hide, title });
    return {};
})();

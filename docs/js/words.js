// words.js — original-word study: Strong's Hebrew and Greek, in the KJV.
//
//   #/word            introduction, lookup box, a few well-known words
//   #/word/<number>   one word: its entry, and every verse that uses it (H7225, G26)
//
// Also registers the "Original words" section of the verse study panel. The data
// are the KJV with Strong's numbers (bibles/kjv-strongs), the lexicon
// (bibles/strongs) and a concordance (bibles/strongs-index), all loaded on demand.
const Words = (() => {
    const { h, icon } = UI;
    const PAGE = 20;            // verses shown per "Show more"
    const BOOK_CACHE_MAX = 6;   // tagged books are large; keep the few in use
    const KINDS = {
        H: { name: 'Hebrew', lang: 'he', dir: 'rtl', label: 'Strong’s Hebrew' },
        G: { name: 'Greek', lang: 'el', dir: 'ltr', label: 'Strong’s Greek' }
    };
    const STARTERS = [
        ['H2617', 'steadfast love, loyalty'], ['H7965', 'peace, wholeness'], ['H7307', 'spirit, breath, wind'],
        ['H8451', 'law, instruction'], ['G26', 'love, self-giving'], ['G3056', 'word, reason'],
        ['G4102', 'faith, trust'], ['G5485', 'grace, favour']
    ];

    let root, token = 0;
    const lexChunks = new Map();     // "H14" → Promise of { H7225: entry }
    const concChunks = new Map();
    const bookCache = new Map();     // slug → Promise of tagged book, least recently used first

    // ── Data access ─────────────────────────────────────────────────────
    const parseNumber = text => {
        const m = /^\s*([hg])?\s*0*(\d{1,4})\s*$/i.exec(text || '');
        return m ? { kind: m[1] ? m[1].toUpperCase() : null, n: Number(m[2]) } : null;
    };
    const chunkOf = id => id[0] + Math.floor(Number(id.slice(1)) / 500);
    const memo = (map, key, load) => {
        if (!map.has(key)) map.set(key, load());
        return map.get(key);
    };
    async function entry(id) {
        const chunk = await memo(lexChunks, chunkOf(id), () => Api.getLexicon(chunkOf(id)));
        return chunk[id] || null;
    }
    async function verseRefs(id) {
        const chunk = await memo(concChunks, chunkOf(id), () => Api.getConcordance(chunkOf(id)));
        return chunk[id] || [];
    }
    function taggedBook(slug) {
        if (bookCache.has(slug)) {                       // refresh its place in the queue
            const p = bookCache.get(slug);
            bookCache.delete(slug);
            bookCache.set(slug, p);
            return p;
        }
        const p = Api.getStrongsBook(slug).catch(() => null);
        bookCache.set(slug, p);
        while (bookCache.size > BOOK_CACHE_MAX) bookCache.delete(bookCache.keys().next().value);
        return p;
    }
    const idOf = (kind, n) => `${kind}${n}`;
    const href = id => `#/word/${id}`;
    const lemmaEl = (e, id, tag = 'span', cls = 'words-lemma') => {
        const k = KINDS[id[0]];
        return h(tag, { class: cls, lang: k.lang, dir: k.dir }, e.lemma);
    };
    const firstGloss = e => (e.def || e.kjv || '').split(/[;,]/)[0].trim();

    // Turn "from H7218 (רֹאשׁ);" into text with each number a link.
    function linkNumbers(text) {
        return text.split(/\b([HG]\d{1,4})\b/).map((part, i) =>
            i % 2 ? h('a', { href: href(part), class: 'words-xlink' }, part) : part);
    }

    // ── Verse rendering ─────────────────────────────────────────────────
    // A tagged verse is a list of plain strings and [text, "H1 H2"] pairs.
    function verseNodes(segs, id) {
        return segs.map(s => {
            if (typeof s === 'string') return s;
            return s[1].split(' ').includes(id) ? h('mark', { class: 'words-hit' }, s[0]) : s[0];
        });
    }
    const parseRef = ref => {
        const m = /^(.+) (\d+):(\d+)$/.exec(ref);
        return m ? { slug: m[1], ch: m[2], v: m[3] } : null;
    };

    // ── The word page ───────────────────────────────────────────────────
    function field(label, body) {
        return h('div', { class: 'words-field' }, h('dt', null, label), h('dd', null, body));
    }

    async function renderWord(id, t) {
        const kind = KINDS[id[0]];
        const [e, refs] = await Promise.all([entry(id), verseRefs(id)]);
        if (t !== token) return;
        if (!e) { renderNotFound(id); return; }

        const n = Number(id.slice(1));
        const list = h('ol', { class: 'words-verses', 'aria-label': `Verses that use ${id}` });
        const more = h('button', { type: 'button', class: 'btn words-more' });
        const status = h('p', { class: 'dim words-status', role: 'status' });
        let shown = 0, busy = false;

        async function showMore() {
            if (busy) return;
            busy = true;
            more.disabled = true;
            const batch = refs.slice(shown, shown + PAGE).map(parseRef).filter(Boolean);
            const slugs = [...new Set(batch.map(r => r.slug))];
            const books = await Promise.all(slugs.map(taggedBook));
            if (t !== token) return;
            const bySlug = new Map(slugs.map((s, i) => [s, books[i]]));
            for (const r of batch) {
                const book = Store.book(r.slug);
                const segs = bySlug.get(r.slug)?.[r.ch]?.[r.v];
                if (!book || !segs) continue;
                list.append(h('li', { class: 'words-verse' },
                    h('a', { class: 'words-ref', href: Router.build('read', [r.slug, r.ch], { v: r.v }) }, `${book.name} ${r.ch}:${r.v}`),
                    h('p', { class: 'scripture' }, verseNodes(segs, id))));
            }
            shown = Math.min(refs.length, shown + PAGE);
            const left = refs.length - shown;
            more.hidden = left <= 0;
            more.textContent = `Show more (${left.toLocaleString()} left)`;
            more.disabled = false;
            status.textContent = `Showing ${shown.toLocaleString()} of ${refs.length.toLocaleString()} verses`;
            busy = false;
        }
        more.addEventListener('click', showMore);

        const fields = [
            e.pron && field('Pronounced', e.pron),
            e.def && field('Definition', e.def),
            e.kjv && field('Rendered in the KJV as', e.kjv),
            e.deriv && field('Derivation', linkNumbers(e.deriv))
        ].filter(Boolean);
        const prev = n > 1 && h('a', { class: 'btn btn-quiet btn-sm', href: href(idOf(id[0], n - 1)), 'aria-label': `Previous: ${idOf(id[0], n - 1)}` }, icon('chevron-left', 'icon-sm'), idOf(id[0], n - 1));
        const next = h('a', { class: 'btn btn-quiet btn-sm', href: href(idOf(id[0], n + 1)), 'aria-label': `Next: ${idOf(id[0], n + 1)}` }, idOf(id[0], n + 1), icon('chevron-right', 'icon-sm'));

        root.replaceChildren(h('div', { class: 'page words-page' },
            h('nav', { class: 'words-crumbs', 'aria-label': 'Breadcrumb' },
                h('a', { href: '#/word' }, 'Word study'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, kind.name)),
            h('header', { class: 'words-head rise' },
                h('p', { class: 'eyebrow' }, `${kind.label} · ${id}`),
                h('h1', { class: 'words-title' }, lemmaEl(e, id, 'span', 'words-lemma-big'),
                    h('span', { class: 'words-translit' }, e.translit)),
                h('p', { class: 'lede' }, firstGloss(e) ? `${capital(firstGloss(e))}.` : ''),
                h('div', { class: 'words-step' }, prev, next)),
            h('dl', { class: 'words-entry card rise' }, fields),
            h('section', { class: 'words-uses', 'aria-labelledby': 'words-uses-h' },
                h('h2', { id: 'words-uses-h' }, refs.length
                    ? `${refs.length.toLocaleString()} ${refs.length === 1 ? 'verse uses' : 'verses use'} ${id}`
                    : `${id} is not used in the KJV text`),
                h('p', { class: 'dim words-note' }, 'The verses follow the King James Version; the word that carries this number is marked.'),
                list, status, more)));
        if (refs.length) showMore(); else more.hidden = true;
    }

    const capital = s => s ? s[0].toUpperCase() + s.slice(1) : s;

    function renderNotFound(id) {
        root.replaceChildren(h('div', { class: 'page words-page' },
            h('div', { class: 'words-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, 'Word study'),
                h('h1', null, 'We could not find that word'),
                h('p', { class: 'lede' }, `There is no entry for “${id}”. Strong’s numbers run from H1 to H8674 in Hebrew and G1 to G5624 in Greek.`),
                h('a', { class: 'btn btn-primary', href: '#/word' }, 'Look up another word'))));
    }

    // ── Introduction and lookup ─────────────────────────────────────────
    function renderIntro() {
        let kind = 'H';
        const input = h('input', {
            class: 'field words-input', type: 'text', id: 'words-q', inputmode: 'text', autocomplete: 'off', autocapitalize: 'off',
            spellcheck: 'false', placeholder: 'H7225, G26, or 7225', 'aria-describedby': 'words-hint words-msg'
        });
        const msg = h('p', { class: 'words-msg', id: 'words-msg', role: 'status' });
        const toggles = Object.entries(KINDS).map(([k, v]) => h('button', {
            type: 'button', class: 'words-kind', 'aria-pressed': String(k === kind),
            onclick: () => { kind = k; for (const b of toggles) b.setAttribute('aria-pressed', String(b === toggles[k === 'H' ? 0 : 1])); input.focus(); }
        }, v.name));
        async function go(ev) {
            ev.preventDefault();
            const p = parseNumber(input.value);
            if (!p || p.n < 1) { msg.textContent = 'Type a Strong’s number such as H7225 or G26.'; return; }
            const id = idOf(p.kind || kind, p.n);
            msg.textContent = '';
            if (!await entry(id)) { msg.textContent = `There is no entry ${id}. Try a smaller number.`; return; }
            Router.go(href(id));
        }
        const starters = h('ul', { class: 'words-starters' }, STARTERS.map(([id, gloss]) =>
            h('li', null, h('a', { class: 'card words-starter', href: href(id) },
                h('span', { class: 'words-starter-lemma', lang: KINDS[id[0]].lang, dir: KINDS[id[0]].dir, 'data-id': id }, ' '),
                h('span', { class: 'words-starter-id' }, id),
                h('span', { class: 'dim' }, gloss)))));
        root.replaceChildren(h('div', { class: 'page words-page' },
            h('header', { class: 'words-intro rise' },
                h('p', { class: 'eyebrow' }, 'Word study'),
                h('h1', { class: 'display' }, 'The words ', h('em', null, 'behind the words.')),
                h('p', { class: 'lede' },
                    'James Strong numbered every Hebrew and Greek word behind the King James Bible. Look one up to see what it means, how the KJV rendered it, and every verse where it appears.'),
                h('form', { class: 'words-lookup', role: 'search', 'aria-label': 'Look up a Strong’s number', onsubmit: go },
                    h('div', { class: 'words-kinds', role: 'group', 'aria-label': 'Language' }, toggles),
                    h('div', { class: 'words-lookup-row' },
                        h('label', { class: 'sr-only', for: 'words-q' }, 'Strong’s number'),
                        input, h('button', { type: 'submit', class: 'btn btn-primary' }, 'Look up')),
                    h('p', { class: 'faint words-hint', id: 'words-hint' }, 'Type a letter to choose the language, or use the buttons above and just a number.'),
                    msg)),
            h('section', { 'aria-labelledby': 'words-start-h' },
                h('h2', { id: 'words-start-h' }, 'Where to start'),
                starters)));
        for (const el of root.querySelectorAll('[data-id]')) {     // lemmas arrive as the lexicon loads
            entry(el.dataset.id).then(e => { if (e && el.isConnected) el.textContent = e.lemma; });
        }
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) { root = el; root.classList.add('words'); root.tabIndex = -1; }

    async function show(route) {
        const t = ++token;
        const raw = route.parts[0];
        if (!raw) { renderIntro(); return; }
        const p = parseNumber(raw);
        if (!p || p.n < 1) { renderNotFound(raw); return; }
        const id = idOf(p.kind || 'H', p.n);
        if (!p.kind || raw !== id) Router.replace(href(id));
        root.replaceChildren(h('div', { class: 'page words-page' }, h('p', { class: 'dim', role: 'status' }, 'Loading…')));
        try {
            await renderWord(id, t);
        } catch {
            if (t === token) renderNotFound(id);
        }
    }
    function title(route) {
        const p = parseNumber(route.parts[0]);
        return p ? `Word ${idOf(p.kind || 'H', p.n)}` : 'Word study';
    }
    function hide() { token++; }

    App.registerView('word', { init, show, hide, title });

    // ── Study panel section: the verse, word by word ────────────────────
    async function studySection(ctx) {
        const book = await taggedBook(ctx.book.slug);
        const segs = book?.[ctx.chapter]?.[ctx.verse];
        if (!segs || !segs.some(s => typeof s !== 'string')) return null;
        const detail = h('div', { class: 'words-detail', 'aria-live': 'polite' });
        let open = null;
        const wordBtn = s => {
            const ids = s[1].split(' ');
            const b = h('button', { type: 'button', class: 'words-tag', 'aria-expanded': 'false', title: ids.join(', ') }, s[0]);
            b.addEventListener('click', async () => {
                if (open === b) { b.setAttribute('aria-expanded', 'false'); open = null; detail.replaceChildren(); return; }
                open?.setAttribute('aria-expanded', 'false');
                open = b;
                b.setAttribute('aria-expanded', 'true');
                detail.replaceChildren(h('p', { class: 'dim' }, 'Loading…'));
                const entries = await Promise.all(ids.map(entry));
                if (open !== b) return;
                detail.replaceChildren(...ids.map((id, i) => {
                    const e = entries[i];
                    if (!e) return h('p', { class: 'dim' }, `${id}: no entry.`);
                    return h('div', { class: 'words-gloss' },
                        h('p', { class: 'words-gloss-head' },
                            lemmaEl(e, id, 'span', 'words-gloss-lemma'),
                            h('span', { class: 'words-gloss-translit' }, e.translit),
                            h('span', { class: 'faint' }, id)),
                        h('p', null, capital(e.def || e.kjv)),
                        h('a', { class: 'words-gloss-link', href: href(id) }, `Study ${id}`, icon('arrow-right', 'icon-sm')));
                }));
            });
            return b;
        };
        return h('div', { class: 'words-study' },
            h('p', { class: 'scripture words-study-verse' }, segs.map(s => typeof s === 'string' ? s : wordBtn(s))),
            detail,
            h('p', { class: 'faint words-study-note' },
                'Tap a word to see the Hebrew or Greek behind it. The words follow the King James Version with Strong’s numbers, so they may differ from the translation on screen.'));
    }
    if (typeof Study !== 'undefined' && Study.addSection) {
        Study.addSection({ id: 'words', order: 40, title: 'Original words', render: studySection });
    }
    return { entry, parseNumber };
})();

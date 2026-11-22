// find.js — search the words of Scripture, offline, from the local Bible files.
//
//   #/find?q=<query>&v=<version>&in=<scope>      scope: ot | nt | <book-slug> (default: the whole Bible)
//
// Every word must appear (case and punctuation ignored, whole words) and "quoted words" must
// appear exactly in that order. A word also matches its ordinary inflections (love: loves,
// loved, loving, loveth, lovest); =love, or the "Exact words" switch, means that word only, and
// a trailing * makes a prefix, as in shepherd*. A Strong's number (G26, H2617, strongs:G26)
// lists every verse that has that Hebrew or Greek word. Books load a few at a time in
// canonical order and results appear as they arrive; books stay in memory for the visit, so
// the next search is instant.
const Find = (() => {
    const { h, icon } = UI;
    const PAGE = 100;            // hits shown before "Show more"
    const BATCH = 4;             // books fetched at once
    const WORDS = /([\p{L}\p{N}\p{M}]+)(\*?)/gu;
    const EXAMPLES = ['"the Lord is my shepherd"', 'love', '=love', 'shepherd*', 'fear not', 'G26', '"in the beginning"'];
    const KINDS = { H: { lang: 'he', dir: 'rtl', name: 'Hebrew' }, G: { lang: 'el', dir: 'ltr', name: 'Greek' } };
    const lexChunks = new Map();            // "H14" → Promise of { H7225: entry }
    const concChunks = new Map();

    let root, manifest = null, token = 0;
    const bookCache = new Map();            // "version/slug" → book JSON, kept for the visit
    const els = {};
    let state = { q: '', v: '', scope: 'all', exact: false };
    let run = null;                         // the search on screen: { hits, counts, shown, limit, lastBook, ... }

    // ── Word forms ──────────────────────────────────────────────────────
    // forms(word) is the set of verse words a query word stands for. It is built from the word
    // outwards (love → loves, loved, loving, loveth, lovest), so unrelated words are never merged:
    // sing never reaches sin, wing never reaches win, being never reaches be.
    const IRREGULAR = [
        'be is am are art was wast were wert been', 'have has had hath hast hadst having',
        'do does did didst done doing doeth doest doth dost', 'go goes went gone going goeth goest wentest',
        'come comes came camest coming cometh comest', 'give gives gave gavest given giving giveth givest',
        'see sees saw sawest seen seeing seeth seest', 'say says said saidst saying saith sayest',
        'know knows knew knewest known knowing knoweth knowest'
    ].map(g => g.split(' '));
    const IRREGULAR_OF = new Map();
    for (const g of IRREGULAR) for (const w of g) IRREGULAR_OF.set(w, g);
    // Words that only look inflected: kept as they are (plus a plural).
    const FIXED = new Set(('being during evening morning nothing something anything everything thing king ring ' +
        'spring offspring wicked naked kindred hundred sacred beloved forest honest harvest priest earnest ' +
        'interest west east least news always perhaps thus lest unless').split(' '));
    const isVowel = c => 'aeiou'.includes(c);
    const hasVowel = w => /[aeiouy]/.test(w);
    // consonant, vowel, consonant at the end (run, sin, stop): the last letter may double (running)
    const doubles = w => w.length >= 3 && !isVowel(w[w.length - 3]) && isVowel(w[w.length - 2]) &&
        !isVowel(w[w.length - 1]) && !'wxy'.includes(w[w.length - 1]);
    const consonantY = w => /[^aeiou]y$/.test(w);

    function inflect(b, out) {
        out.add(b);
        const last = b[b.length - 1];
        if (consonantY(b)) {
            const y = b.slice(0, -1);
            ['ies', 'ied', 'ieth', 'iest'].forEach(x => out.add(y + x));
            out.add(b + 'ing');
            return;
        }
        if (/(s|x|z|ch|sh)$/.test(b)) { out.add(b + 'es'); out.add(b + 's'); } else out.add(b + 's');
        if (last === 'e') {
            const t = b.slice(0, -1);
            if (b.endsWith('ie')) out.add(b.slice(0, -2) + 'ying'); else if (!/[eyo]e$/.test(b)) out.add(t + 'ing'); else out.add(b + 'ing');
            out.add(b + 'd'); out.add(b + 'th'); out.add(b + 'st');
        } else {
            out.add(b + 'ing'); out.add(b + 'ed'); out.add(b + 'eth'); out.add(b + 'est');
            if (doubles(b)) { out.add(b + last + 'ing'); out.add(b + last + 'ed'); out.add(b + last + 'eth'); out.add(b + last + 'est'); }
        }
    }

    // Plausible base words behind an inflected form the reader typed (loved → love, hated → hat, hate).
    function bases(w, out) {
        const add = (b, min = 3) => { if (b.length >= min && hasVowel(b)) out.add(b); };
        const undouble = b => (b.length > 3 && b[b.length - 1] === b[b.length - 2] && !'lszf'.includes(b[b.length - 1]) ? b.slice(0, -1) : b);
        if (/ies$/.test(w) && w.length > 4) { add(w.slice(0, -3) + 'y'); add(w.slice(0, -1)); }
        else if (/(ses|xes|zes|ches|shes)$/.test(w) && w.length > 4) add(w.slice(0, -2));
        else if (/[^su]s$/.test(w) && !/(is|ous)$/.test(w) && w.length > 3) add(w.slice(0, -1));
        if (/ied$/.test(w)) add(w.slice(0, -3) + 'y');
        if (/ed$/.test(w) && !/ied$/.test(w)) { add(w.slice(0, -1)); const t = undouble(w.slice(0, -2)); add(t); if (!isVowel(t[t.length - 1])) add(t + 'e'); }
        if (/ing$/.test(w)) {
            const t = undouble(w.slice(0, -3));
            add(t, 3);
            if (t.length >= 2 && !/[aeiou]e?$/.test(t)) add(t + 'e', 3);
            if (/ying$/.test(w)) add(w.slice(0, -4) + 'ie');
        }
        if (/ieth$|iest$/.test(w) && w.length > 5) add(w.slice(0, -4) + 'y');
        if (/(eth|est)$/.test(w) && w.length > 5) { add(undouble(w.slice(0, -3)), 4); add(w.slice(0, -2), 4); }
    }

    function forms(word) {
        const w = fold(word);
        if (IRREGULAR_OF.has(w)) return new Set(IRREGULAR_OF.get(w));
        const out = new Set([w]);
        if (FIXED.has(w)) { out.add(w + 's'); return out; }
        const candidates = new Set([w]);
        bases(w, candidates);
        for (const b of candidates) if (!FIXED.has(b)) inflect(b, out);
        return out;
    }

    // ── Reading the query ───────────────────────────────────────────────
    const fold = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const STRONGS = /^\s*(?:strongs?\s*:\s*)?([hg])\s*0*(\d{1,4})\s*$/i;
    const strongsId = q => { const m = STRONGS.exec(q || ''); return m && Number(m[2]) > 0 ? m[1].toUpperCase() + Number(m[2]) : null; };

    // "the Lord" "is my*" → [[{w, prefix, set}…]…]: each term is a run of words that must appear in order.
    // set is the word's forms; it is null for an exact word (quoted, =word, or the exact switch).
    function parseQuery(q, exact = false) {
        const terms = [];
        const text = q.replace(/[“”„«»]/g, '"');
        for (const m of text.matchAll(/"([^"]*)"?|(\S+)/g)) {
            const quoted = m[1] !== undefined;
            const raw = quoted ? m[1] : m[2];
            const strict = quoted || exact || raw.startsWith('=');
            const words = [...raw.matchAll(WORDS)].map(w => {
                const f = fold(w[1]);
                return { w: f, prefix: w[2] === '*', set: strict || w[2] === '*' ? null : forms(f) };
            });
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
                if (q.prefix ? !t.startsWith(q.w) : q.set ? !q.set.has(t) : t !== q.w) { ok = false; break; }
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
        els.strongs = h('div', { class: 'find-strongs', hidden: true });
        els.original = h('div', { class: 'find-original', hidden: true });
        els.list = h('div', { class: 'find-list', role: 'list' });
        els.exact = h('input', { type: 'checkbox', id: 'find-exact', onchange: () => go({ exact: els.exact.checked }) });
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
                h('div', { class: 'find-options' }, els.scope, els.versions,
                    h('label', { class: 'find-exact', for: 'find-exact' }, els.exact, h('span', null, 'Exact words'))),
                h('p', { class: 'find-tip faint' }, 'Every word must appear, with its forms (love finds loved and loveth); “quotes” keep words together exactly, =love or Exact words means only that word, shepherd* matches a prefix, and G26 finds an original Greek or Hebrew word.')),
            els.body));
        els.body.append(els.strongs, els.summary, els.progress, els.books, els.original, els.list, els.more);
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
        els.exact.checked = state.exact;
        els.exact.disabled = !!strongsId(state.q);
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
        if (next.q === state.q && next.v === state.v && next.scope === state.scope && next.exact === state.exact) return;
        state = next;
        Router.replace(Router.build('find', [], { q: state.q, v: state.v, in: state.scope === 'all' ? '' : state.scope, x: state.exact ? '1' : '' }));
        document.title = `${title({ query: { q: state.q } })} — Faith Through Time`;
        syncControls();
        search();
    }

    // ── Searching ───────────────────────────────────────────────────────
    async function search() {
        const t = ++token;
        const sid = strongsId(state.q);
        const terms = sid ? [] : parseQuery(state.q, state.exact);
        run = null;
        els.list.replaceChildren();
        els.more.hidden = true;
        els.books.hidden = true;
        els.progress.hidden = true;
        els.strongs.hidden = true;
        els.strongs.replaceChildren();
        els.original.hidden = true;
        els.original.replaceChildren();
        if (!sid && !terms.length) { renderIntro(); return; }
        if (sid) return searchStrongs(sid, t);

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
        if (mine.total) suggestOriginals(mine, t);
    }

    // ── Strong's numbers: every verse that has one Hebrew or Greek word ──
    const chunkOf = id => id[0] + Math.floor(Number(id.slice(1)) / 500);
    const memo = (map, key, load) => { if (!map.has(key)) map.set(key, load()); return map.get(key); };
    const lexEntry = async id => (await memo(lexChunks, chunkOf(id), () => Api.getLexicon(chunkOf(id))))[id] || null;
    const concordance = async id => (await memo(concChunks, chunkOf(id), () => Api.getConcordance(chunkOf(id))))[id] || [];
    const firstGloss = e => (e.def || e.kjv || '').split(/[;,]/)[0].replace(/^--/, '').trim();

    function lemmaLine(id, e) {
        const k = KINDS[id[0]];
        return [h('span', { class: 'find-lemma', lang: k.lang, dir: k.dir }, e.lemma), ' ',
            h('span', { class: 'find-translit' }, e.translit || '')];
    }

    async function searchStrongs(id, t) {
        els.summary.textContent = 'Searching…';
        const [e, refs] = await Promise.all([lexEntry(id), concordance(id)]);
        if (t !== token) return;
        const inScope = new Map(scopeBooks(state.scope).map((b, i) => [b.slug, b]));
        const byBook = new Map();
        for (const ref of refs) {
            const m = /^(.+) (\d+):(\d+)$/.exec(ref);
            if (!m || !inScope.has(m[1])) continue;
            if (!byBook.has(m[1])) byBook.set(m[1], []);
            byBook.get(m[1]).push([Number(m[2]), Number(m[3])]);
        }
        const books = scopeBooks(state.scope).filter(b => byBook.has(b.slug));
        if (e) {
            els.strongs.replaceChildren(h('div', { class: 'find-strongs-card card' },
                h('p', { class: 'eyebrow' }, `${KINDS[id[0]].name} word ${id}`),
                h('p', { class: 'find-strongs-word' }, ...lemmaLine(id, e), e.pron ? h('span', { class: 'find-pron faint' }, ` ${e.pron}`) : null),
                h('p', { class: 'find-gloss' }, firstGloss(e) || e.def || ''),
                h('a', { class: 'btn btn-quiet btn-sm', href: `#/word/${id}` }, `Full entry for ${id}`, icon('chevron-right', 'icon-sm'))));
            els.strongs.hidden = false;
        }
        const mine = run = { terms: [], books, hits: [], counts: new Map(), shown: 0, limit: PAGE, lastBook: null, failed: 0, done: false, total: 0, strongs: id };
        if (!books.length) {
            mine.done = true;
            els.summary.textContent = '';
            const wide = state.scope !== 'all';
            stateBlock(e ? 'No verses here' : 'Not found', e ? `${id} does not stand in this part of the Bible` : `There is no ${id}`,
                e ? 'Try the whole Bible.' : 'Strong’s numbers run from H1 to H8674 in Hebrew and G1 to G5624 in Greek.',
                wide ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => go({ scope: 'all' }) }, 'Search the whole Bible') : null);
            return;
        }
        for (let i = 0; i < books.length; i += BATCH) {
            const batch = books.slice(i, i + BATCH);
            els.progress.textContent = `Searching ${batch[0].name}…`;
            els.progress.hidden = false;
            const loaded = await Promise.all(batch.map(b => loadBook(state.v, b.slug).catch(() => null)));
            if (t !== token) return;
            loaded.forEach((data, k) => {
                const book = batch[k];
                if (!data) { mine.failed++; return; }
                const list = byBook.get(book.slug).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
                let n = 0;
                for (const [ch, v] of list) {
                    const text = data[ch]?.[v];
                    if (text) { mine.hits.push({ book, ch, v, text, ranges: [] }); n++; }
                }
                if (n) { mine.counts.set(book, n); mine.total += n; }
            });
            flush(mine);
        }
        mine.done = true;
        els.progress.hidden = true;
        flush(mine);
    }

    // After an ordinary word search: which original words usually stand behind the English one?
    // Counted in the KJV (tagged with Strong's numbers) over the first verses found, and only
    // when the search is one word, so the answer is clear.
    async function suggestOriginals(r, t) {
        const words = r.terms.length === 1 && r.terms[0].length === 1 ? r.terms[0][0] : null;
        if (!words) return;
        await new Promise(res => setTimeout(res, 250));
        if (t !== token || r !== run) return;
        const sample = r.hits.slice(0, 50);
        const slugs = [...new Set(sample.map(x => x.book.slug))].slice(0, 16);
        const tagged = new Map();
        for (let i = 0; i < slugs.length; i += 3) {
            const got = await Promise.all(slugs.slice(i, i + 3).map(s => Api.getStrongsBook(s).catch(() => null)));
            if (t !== token || r !== run) return;
            got.forEach((b, k) => tagged.set(slugs[i + k], b));
        }
        const tally = new Map();
        for (const hit of sample) {
            const segs = tagged.get(hit.book.slug)?.[hit.ch]?.[hit.v];
            if (!segs) continue;
            const seen = new Set();
            for (const seg of segs) {
                if (typeof seg === 'string') continue;
                const toks = tokenize(seg[0]);
                const match = toks.some(x => words.prefix ? x.w.startsWith(words.w) : words.set ? words.set.has(x.w) : x.w === words.w);
                if (match) for (const n of seg[1].split(' ')) if (/^[HG]\d+$/.test(n)) seen.add(n);
            }
            for (const n of seen) tally.set(n, (tally.get(n) || 0) + 1);
        }
        const top = [...tally].filter(([, n]) => n >= 2 || sample.length <= 3).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (!top.length) return;
        const info = await Promise.all(top.map(async ([id]) => [await lexEntry(id), (await concordance(id)).length]));
        if (t !== token || r !== run) return;
        const chips = top.map(([id], i) => info[i][0] && h('button', {
            type: 'button', class: 'chip find-original-chip', onclick: () => go({ q: id, scope: 'all' }), title: `Search every verse with ${id}`
        }, ...lemmaLine(id, info[i][0]), h('span', { class: 'find-original-id' }, `— ${id} (${plural(info[i][1], 'verse', 'verses')})`))).filter(Boolean);
        if (!chips.length) return;
        els.original.replaceChildren(h('p', { class: 'find-original-head' }, 'Search by the original word'), h('div', { class: 'chip-row' }, chips));
        els.original.hidden = false;
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
        state = { q: (route.query.q || '').trim(), v, scope: normScope(route.query.in || 'all'), exact: route.query.x === '1' };
        syncControls();
        search();
        if (!state.q) els.input.focus({ preventScroll: true });
    }

    const hide = () => { token++; };
    const title = route => {
        const q = ((route && route.query && route.query.q) || state.q || '').trim();
        return q ? `Search Scripture: ${strongsId(q) || q}` : 'Search Scripture';
    };

    App.registerView('find', { init, show, hide, title });
    return { forms, parseQuery, matchVerse, strongsId };
})();

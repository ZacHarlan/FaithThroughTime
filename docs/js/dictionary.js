// dictionary.js — Easton's Bible Dictionary (1897, public domain).
//
//   #/dictionary          search the headwords, or jump to a letter (?letter=b)
//   #/dictionary/<slug>   one entry: Scripture references link to the reader, "See ABRAM"
//                         links to the entry, and a person or place on this site is linked
//
// Data: bibles/dictionary/index.json ({ entries: [{ slug, name }] }) and one chunk per first
// letter of the slug ({ slug: { name, text: [paragraph, …] } }), both loaded on demand.
//
// For other views:
//   Dictionary.blockFor(entity) → Promise<Node|null>   a "From Easton's Bible Dictionary" block
//                                                      for a Store person or location, or null
//   Dictionary.find(name)       → slug|null            headword lookup (needs the index; see ready())
//   Dictionary.ready()          → Promise              resolves once the index is loaded
const Dictionary = (() => {
    const { h, icon } = UI;
    const NOTE = 'Easton\'s Bible Dictionary (1897). Its dates and identifications are its own and may differ from this site\'s.';
    const HEADING = 'From Easton\'s Bible Dictionary';
    const MAX_RESULTS = 120;
    const BLOCK_WORDS = 60;

    let root, token = 0;
    let index = null;                 // { entries, bySlug, byName }
    let indexPromise = null;
    const chunks = new Map();         // first letter → Promise of { slug: entry }

    // ── Data ────────────────────────────────────────────────────────────
    const slugOf = name => String(name).toLowerCase().replace(/[’']/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const keyOf = name => String(name).toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();

    function loadIndex() {
        if (!indexPromise) {
            indexPromise = Api.getDictionaryList().then(data => {
                const entries = (data && data.entries) || [];
                const bySlug = new Map(), byName = new Map();
                for (const e of entries) {
                    bySlug.set(e.slug, e);
                    if (!byName.has(keyOf(e.name))) byName.set(keyOf(e.name), e);
                }
                index = { entries, bySlug, byName };
                return index;
            }).catch(() => { indexPromise = null; throw new Error('dictionary index unavailable'); });
        }
        return indexPromise;
    }
    const ready = () => loadIndex().then(() => undefined);

    function loadChunk(letter) {
        if (!chunks.has(letter)) {
            chunks.set(letter, Api.getDictionary(letter).catch(() => { chunks.delete(letter); return {}; }));
        }
        return chunks.get(letter);
    }
    async function loadEntry(slug) {
        const chunk = await loadChunk(slug[0]);
        return chunk[slug] || null;
    }

    const find = name => (index && name ? (index.byName.get(keyOf(name)) || {}).slug || null : null);

    // ── Scripture references and cross-references in the text ───────────
    // "Gen. 12:1-3", "1 Chr. 12:27", and bare "(2:1, 4; 7:7)" that continue the last book named.
    const REF_RE = /(?:((?:[123] )?[A-Z][a-z]{1,9})\.? )?(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?/g;
    // Easton prints a cross-reference in capitals: "(See HAGAR; ISHMAEL.)", "GALILEE, SEA OF".
    const XREF_RE = /\b[A-Z][A-Z'’-]+(?:,? [A-Z][A-Z'’-]+)*\b/g;
    const SEE_BEFORE = /\b(?:see|See|Comp\.|comp\.)\b[^.]*$/;
    const QV_AFTER = /^\s*\(q\.v\.\)/;

    function resolveXref(run) {
        const tries = [run, ...run.split(/[,;]\s*/)];
        for (const t of tries) {
            const hit = index.bySlug.get(slugOf(t));
            if (hit) return hit;
        }
        return null;
    }

    // One paragraph → text and link nodes. `state.book` carries the last book named.
    function paragraphNodes(text, state) {
        const spans = [];
        REF_RE.lastIndex = 0;
        for (let m; (m = REF_RE.exec(text));) {
            const tail = `${m[2]}:${m[3]}${m[4] ? `-${m[4]}` : ''}`;
            let p = null, from = m.index, label = m[0];
            if (m[1]) {
                p = Study.parse(`${m[1]} ${tail}`);
                if (p) state.book = p.book.name;
                else if (!state.book) continue;
                if (!p) {                       // "Adam. 3:4": a stray capital word; the numbers may still continue
                    p = Study.parse(`${state.book} ${tail}`);
                    from = m.index + m[0].length - tail.length;
                    label = tail;
                }
            } else if (state.book) {
                p = Study.parse(`${state.book} ${tail}`);
            }
            if (p) spans.push({ from, to: from + label.length, node: h('a', { class: 'dict-ref', href: Study.readHref(p), title: Study.format(p) }, label) });
        }
        XREF_RE.lastIndex = 0;
        for (let m; (m = XREF_RE.exec(text));) {
            const before = text.slice(Math.max(0, m.index - 80), m.index);
            const after = text.slice(m.index + m[0].length, m.index + m[0].length + 8);
            if (!SEE_BEFORE.test(before) && !QV_AFTER.test(after)) continue;
            const hit = resolveXref(m[0]);
            if (!hit) continue;
            spans.push({ from: m.index, to: m.index + m[0].length, node: h('a', { class: 'dict-xref', href: `#/dictionary/${hit.slug}` }, m[0]) });
        }
        spans.sort((a, b) => a.from - b.from);
        const out = [];
        let at = 0;
        for (const s of spans) {
            if (s.from < at) continue;          // overlapping match: keep the earlier one
            if (s.from > at) out.push(text.slice(at, s.from));
            out.push(s.node);
            at = s.to;
        }
        if (at < text.length) out.push(text.slice(at));
        return out;
    }

    // ── Matching headwords to people and places ─────────────────────────
    // The part of a name before a comma, " son of ", " the " or "(".
    const baseKey = name => keyOf(String(name).split(/,| son of | the |\(/)[0]);
    const SIG = { major: 0, moderate: 1, minor: 2 };
    const rank = e => (e.significance in SIG ? SIG[e.significance] : 2);
    let byKey = null;                  // { people: Map, places: Map } of base name → entities

    const keysOf = entity => [...new Set([entity.name, ...(entity.altNames || [])].filter(Boolean).map(baseKey).filter(Boolean))];

    function entityMaps() {
        if (byKey) return byKey;
        const make = list => {
            const map = new Map();
            for (const e of list || []) for (const k of keysOf(e)) {
                if (!map.has(k)) map.set(k, []);
                map.get(k).push(e);
            }
            return map;
        };
        byKey = { people: make(Store.people), places: make(Store.locations) };
        return byKey;
    }

    const PLACE_WORD = /\b(city|town|village|mountain|mount|river|valley|region|district|sea|lake|plain|brook|hill|wilderness|province|fountain|well|pool|island|country|territory|port|desert|spring|fortress|ford)\b/i;
    const PERSON_WORD = /\b(son|daughter|wife|father|brother|sister|mother|king|queen|prophet|priest|apostle|disciple|born|man|woman|husband|governor|judge)\b/i;
    const lead = paras => String((paras && paras[0]) || '').slice(0, 170);
    const looksPlace = paras => PLACE_WORD.test(lead(paras)) && !PERSON_WORD.test(lead(paras));
    const looksPerson = paras => PERSON_WORD.test(lead(paras));
    const isMulti = paras => (paras || []).slice(0, 2).some(p => /\(1\.?\)/.test(p));

    // Is `entity` the one this headword (matched at `key`) is about? Confidently, or not at all.
    function accepts(entity, key, paras) {
        const maps = entityMaps();
        if (entity.kind === 'person') {
            const group = maps.people.get(key) || [];
            if (!group.includes(entity)) return false;
            if (maps.places.has(key) && looksPlace(paras)) return false;
            if (group.length === 1) return !isMulti(paras) || rank(entity) <= 1;
            const best = Math.min(...group.map(rank));
            return rank(entity) === best && best <= 1 && group.filter(e => rank(e) === best).length === 1;
        }
        if (entity.kind === 'location') {
            const group = maps.places.get(key) || [];
            if (group.length !== 1 || group[0] !== entity) return false;
            if (maps.people.has(key)) return looksPlace(paras) && !looksPerson(paras);
            return true;
        }
        return false;
    }

    // Entities of this site that the headword is confidently about: { person, place }.
    async function siteEntities(slug, entry) {
        const out = { person: null, place: null };
        if (!Store.people || !Store.locations) return out;
        const key = /[,(]/.test(entry.name) ? keyOf(entry.name) : baseKey(entry.name);
        const maps = entityMaps();
        for (const e of maps.people.get(key) || []) if (!out.person && accepts(e, key, entry.text)) out.person = e;
        for (const e of maps.places.get(key) || []) if (!out.place && accepts(e, key, entry.text)) out.place = e;
        if (out.person && out.place) {                       // one headword, two kinds: let the text decide
            if (looksPlace(entry.text)) out.person = null; else out.place = null;
        }
        return out;
    }

    // ── The block other views embed ─────────────────────────────────────
    function trimWords(text, max) {
        const clean = text.replace(/\s*\((?:[Ss]ee|Comp\.)[^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        const words = clean.split(' ');
        if (words.length <= max + 10) return clean;
        const cut = words.slice(0, max).join(' ');
        const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
        if (stop > cut.length * 0.55) return cut.slice(0, stop + 1);
        return `${cut.replace(/[,;:\s]+$/, '')}…`;
    }

    async function blockFor(entity) {
        try {
            if (!entity || (entity.kind !== 'person' && entity.kind !== 'location')) return null;
            await loadIndex();
            for (const key of keysOf(entity)) {
                const head = index.byName.get(key);
                if (!head) continue;
                const entry = await loadEntry(head.slug);
                if (!entry || !entry.text || !entry.text.length) continue;
                if (!accepts(entity, key, entry.text)) return null;
                return h('section', { class: 'dict-block', 'aria-label': HEADING },
                    h('h3', { class: 'dict-block-h' }, HEADING),
                    h('p', { class: 'dict-block-text' }, trimWords(entry.text[0], BLOCK_WORDS)),
                    h('a', { class: 'dict-block-link', href: `#/dictionary/${head.slug}` }, 'Read the entry', icon('arrow-right', 'icon-sm')));
            }
        } catch { /* no dictionary: no block */ }
        return null;
    }

    // ── Index page ──────────────────────────────────────────────────────
    const letterOf = e => e.slug[0].toUpperCase();

    function search(q) {
        const k = keyOf(q), s = slugOf(q);
        if (!k) return [];
        const starts = [], contains = [];
        for (const e of index.entries) {
            const n = keyOf(e.name);
            if (n.startsWith(k) || e.slug.startsWith(s)) starts.push(e);
            else if (n.includes(k)) contains.push(e);
        }
        return [...starts, ...contains];
    }

    function entryLink(e) {
        return h('li', null, h('a', { class: 'dict-item', href: `#/dictionary/${e.slug}` }, e.name));
    }

    function renderIndex(route) {
        const letters = [...new Set(index.entries.map(letterOf))].sort();
        let letter = (route.query.letter || '').toUpperCase();
        if (!letters.includes(letter)) letter = letters[0] || 'A';

        const status = h('p', { class: 'dim dict-status', role: 'status' });
        const list = h('ul', { class: 'dict-list', 'aria-label': 'Entries' });
        const bar = h('nav', { class: 'dict-az', 'aria-label': 'Jump to a letter' });
        const input = h('input', {
            class: 'field dict-input', type: 'search', id: 'dict-q', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
            placeholder: 'Search headwords: Abraham, Bethel, ephod…', 'aria-label': 'Search the dictionary', enterkeyhint: 'search'
        });

        const buttons = letters.map(l => h('button', {
            type: 'button', class: 'dict-letter', 'aria-pressed': String(l === letter), 'aria-label': `Entries beginning with ${l}`,
            onclick: () => { input.value = ''; letter = l; Router.replace(`#/dictionary?letter=${l.toLowerCase()}`); paint(); }
        }, l));
        bar.append(...buttons);

        function paint() {
            const q = input.value.trim();
            for (const b of buttons) b.setAttribute('aria-pressed', String(!q && b.textContent === letter));
            bar.classList.toggle('is-idle', !!q);
            let rows, msg;
            if (q) {
                const hits = search(q);
                rows = hits.slice(0, MAX_RESULTS);
                msg = hits.length === 0 ? `No entry matches “${q}”.`
                    : hits.length > rows.length ? `Showing the first ${rows.length} of ${hits.length.toLocaleString()} entries`
                    : `${hits.length.toLocaleString()} ${hits.length === 1 ? 'entry' : 'entries'}`;
            } else {
                rows = index.entries.filter(e => letterOf(e) === letter);
                msg = `${rows.length.toLocaleString()} entries under ${letter}`;
            }
            list.replaceChildren(...rows.map(entryLink));
            status.textContent = msg;
        }
        input.addEventListener('input', paint);
        input.addEventListener('keydown', ev => {
            if (ev.key === 'Enter') { const first = list.querySelector('a'); if (first) { ev.preventDefault(); Router.go(first.getAttribute('href')); } }
        });

        root.replaceChildren(h('div', { class: 'page dict-page' },
            h('header', { class: 'dict-head rise' },
                h('p', { class: 'eyebrow' }, 'Bible dictionary'),
                h('h1', { class: 'display' }, 'People, places and ', h('em', null, 'things in Scripture.')),
                h('p', { class: 'lede' }, `${index.entries.length.toLocaleString()} entries from Matthew George Easton’s dictionary: who the people were, where the places lay, and what the customs, trees and teachings of the Bible mean.`),
                h('div', { class: 'dict-search', role: 'search' }, icon('search'), input)),
            bar, status, list,
            h('p', { class: 'faint dict-note' }, NOTE)));
        paint();
    }

    // ── Entry page ──────────────────────────────────────────────────────
    function siteLinks(found) {
        const items = [];
        if (found.person) items.push(h('a', { class: 'btn btn-quiet btn-sm', href: UI.href(found.person) }, icon('person', 'icon-sm'), `${found.person.name} on the timeline`));
        if (found.place) items.push(h('a', { class: 'btn btn-quiet btn-sm', href: `#/place/${found.place.slug}` }, icon('pin', 'icon-sm'), `${found.place.name} on the map`));
        return items.length ? h('div', { class: 'dict-site', 'aria-label': 'On this site' }, items) : null;
    }

    function stepLink(e, dir) {
        if (!e) return null;
        const prev = dir < 0;
        return h('a', { class: 'btn btn-quiet btn-sm', href: `#/dictionary/${e.slug}`, 'aria-label': `${prev ? 'Previous' : 'Next'} entry: ${e.name}`, rel: prev ? 'prev' : 'next' },
            prev ? icon('chevron-left', 'icon-sm') : null, e.name, prev ? null : icon('chevron-right', 'icon-sm'));
    }

    async function renderEntry(slug, t) {
        const entry = index.bySlug.has(slug) ? await loadEntry(slug) : null;
        if (t !== token) return;
        if (!entry) { renderNotFound(slug); return; }
        const found = await siteEntities(slug, entry);
        if (t !== token) return;
        document.title = `${entry.name} — Faith Through Time`;
        const at = index.entries.findIndex(e => e.slug === slug);
        const state = { book: null };
        root.replaceChildren(h('div', { class: 'page dict-page' },
            h('nav', { class: 'dict-crumbs', 'aria-label': 'Breadcrumb' },
                h('a', { href: '#/dictionary' }, 'Dictionary'), h('span', { 'aria-hidden': 'true' }, '/'),
                h('a', { href: `#/dictionary?letter=${slug[0]}` }, slug[0].toUpperCase()), h('span', { 'aria-hidden': 'true' }, '/'),
                h('span', null, entry.name)),
            h('header', { class: 'dict-entry-head rise' },
                h('p', { class: 'eyebrow' }, 'Easton\'s Bible Dictionary'),
                h('h1', { class: 'dict-entry-title' }, entry.name),
                siteLinks(found)),
            h('article', { class: 'dict-body card rise', 'aria-label': entry.name },
                entry.text.map(p => h('p', { class: 'dict-p' }, paragraphNodes(p, state)))),
            h('p', { class: 'faint dict-note' }, NOTE),
            h('div', { class: 'dict-step' }, stepLink(index.entries[at - 1], -1), stepLink(index.entries[at + 1], 1))));
    }

    function renderNotFound(slug) {
        root.replaceChildren(h('div', { class: 'page dict-page' },
            h('div', { class: 'dict-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, 'Bible dictionary'),
                h('h1', null, 'We could not find that entry'),
                h('p', { class: 'lede' }, `The dictionary has no entry called “${slug}”. Try searching for the name.`),
                h('a', { class: 'btn btn-primary', href: '#/dictionary' }, 'Search the dictionary'))));
    }

    function renderUnavailable() {
        root.replaceChildren(h('div', { class: 'page dict-page' },
            h('div', { class: 'dict-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, 'Bible dictionary'),
                h('h1', null, 'The dictionary did not load'),
                h('p', { class: 'lede' }, 'Check your connection and try again.'),
                h('button', { type: 'button', class: 'btn btn-primary', onclick: () => show(Router.parse()) }, 'Try again'))));
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) { root = el; root.classList.add('dict'); root.tabIndex = -1; }

    async function show(route) {
        const t = ++token;
        const slug = route.parts[0];
        root.replaceChildren(h('div', { class: 'page dict-page' }, h('p', { class: 'dim', role: 'status' }, 'Loading…')));
        try {
            await loadIndex();
            if (t !== token) return;
            if (slug) await renderEntry(slug, t); else renderIndex(route);
        } catch {
            if (t === token) renderUnavailable();
        }
    }
    function title(route) {
        const slug = route.parts[0];
        if (!slug) return 'Bible dictionary';
        const e = index && index.bySlug.get(slug);
        return e ? e.name : 'Bible dictionary';
    }
    function hide() { token++; }

    App.registerView('dictionary', { init, show, hide, title });

    return { blockFor, find, ready };
})();

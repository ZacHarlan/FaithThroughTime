// topics.js — the topical Bible (Nave's Topical Bible, public domain).
//
//   #/topic              index: search the topic names, an A–Z bar, well-known starting topics (?l=f for a letter)
//   #/topic/<slug>       one topic: its sections, each a list of references into the reader
//
// Also adds a "Topics" section (order 50) to the verse study panel: the topics that include the verse.
// Data: bibles/topics/index.json, bibles/topics/<first letter>.json, bibles/topics-index/<book>.json.
const Topics = (() => {
    const { h, icon } = UI;
    const SHOWN_FIRST = 3;        // references per section that open with their text
    const TEXT_LIMIT = 260;       // characters of a passage shown on a card
    const MAX_RESULTS = 80;
    const STARTERS = ['faith', 'prayer', 'forgiveness', 'covenant', 'grace-of-god', 'love', 'wisdom', 'holy-spirit',
        'repentance', 'salvation', 'hope', 'joy'];
    const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

    let root, token = 0;
    let list = null;              // [{ slug, name, count, key }]
    let bySlug = null;
    const chunks = new Map();     // letter → Promise<{ slug: topic }>

    const chunkOf = slug => /^[a-z]/.test(slug) ? slug[0] : '0';
    const href = slug => Router.build('topic', [slug]);
    const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
    const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

    async function loadList() {
        if (list) return list;
        const raw = await Api.getTopicList();
        list = (raw.topics || []).map(t => ({ ...t, key: fold(t.name) }));
        bySlug = new Map(list.map(t => [t.slug, t]));
        return list;
    }
    function loadChunk(letter) {
        if (!chunks.has(letter)) chunks.set(letter, Api.getTopics(letter).catch(() => ({})));
        return chunks.get(letter);
    }
    async function topic(slug) {
        if (!/^[a-z0-9-]+$/.test(slug || '')) return null;
        return (await loadChunk(chunkOf(slug)))[slug] || null;
    }

    // ── Page frame ──────────────────────────────────────────────────────
    const head = (eyebrow, title, lede) => h('header', { class: 'tp-head rise' },
        h('p', { class: 'eyebrow' }, eyebrow),
        h('h1', { class: 'tp-title' }, title),
        lede ? h('p', { class: 'lede' }, lede) : null);

    const credit = () => h('p', { class: 'faint tp-credit' },
        'The topics and their references follow Nave’s Topical Bible (Orville J. Nave, 1896, public domain). References that the King James text does not contain are left out.');

    // ── Index ───────────────────────────────────────────────────────────
    function topicLink(t) {
        return h('a', { class: 'tp-item', href: href(t.slug) },
            h('span', { class: 'tp-item-name' }, t.name),
            h('span', { class: 'chip-sub' }, t.count.toLocaleString()));
    }

    function renderIndex(route) {
        let letter = LETTERS.includes(route.query.l) ? route.query.l : '';
        const field = h('input', {
            class: 'field', type: 'search', id: 'tp-q', placeholder: 'Find a topic: faith, covenant, Aaron…',
            'aria-label': 'Find a topic', autocomplete: 'off', spellcheck: 'false', value: route.query.q || ''
        });
        const status = h('p', { class: 'tp-count', role: 'status', 'aria-live': 'polite' });
        const results = h('div', { class: 'tp-results' });
        const bar = h('nav', { class: 'tp-az', 'aria-label': 'Jump to a letter' });
        const present = new Set(list.map(t => chunkOf(t.slug)));

        function drawBar() {
            bar.replaceChildren(...LETTERS.map(l => present.has(l)
                ? h('a', { class: `tp-az-l${l === letter ? ' is-on' : ''}`, href: Router.build('topic', [], { l }), 'aria-current': l === letter ? 'true' : null,
                    onclick: ev => { ev.preventDefault(); letter = l; field.value = ''; Router.replace(Router.build('topic', [], { l })); refresh(); } },
                    l.toUpperCase())
                : h('span', { class: 'tp-az-l is-off', 'aria-hidden': 'true' }, l.toUpperCase())));
        }

        function starters() {
            const items = STARTERS.map(s => bySlug.get(s)).filter(Boolean);
            return h('section', { class: 'tp-starters', 'aria-labelledby': 'tp-start-h' },
                h('h2', { id: 'tp-start-h' }, 'Where to start'),
                h('ul', { class: 'tp-cards' }, items.map(t => h('li', null,
                    h('a', { class: 'card tp-card', href: href(t.slug) },
                        h('span', { class: 'tp-card-name' }, t.name),
                        h('span', { class: 'faint' }, plural(t.count, 'passage', 'passages')))))));
        }

        function rank(q) {
            const words = q.split(' ');
            const scored = [];
            for (const t of list) {
                let s = -1;
                if (t.key === q) s = 0;
                else if (t.key.startsWith(q)) s = 1;
                else if (words.every(w => t.key.split(' ').some(x => x.startsWith(w)))) s = 2;
                else if (t.key.includes(q)) s = 3;
                if (s >= 0) scored.push([s, t]);
            }
            return scored.sort((a, b) => a[0] - b[0] || b[1].count - a[1].count).map(x => x[1]);
        }

        function refresh() {
            const q = fold(field.value);
            drawBar();
            if (q) {
                const found = rank(q);
                const shown = found.slice(0, MAX_RESULTS);
                results.replaceChildren(shown.length
                    ? h('ul', { class: 'tp-grid' }, shown.map(t => h('li', null, topicLink(t))))
                    : h('p', { class: 'tp-none' }, 'No topic matches. Try a shorter word, a name or a place.'));
                status.textContent = found.length > shown.length
                    ? `Showing the first ${shown.length} of ${found.length.toLocaleString()} topics`
                    : plural(found.length, 'topic', 'topics');
            } else if (letter) {
                const all = list.filter(t => chunkOf(t.slug) === letter);
                results.replaceChildren(h('section', { 'aria-labelledby': 'tp-l-h' },
                    h('h2', { id: 'tp-l-h' }, letter.toUpperCase()),
                    h('ul', { class: 'tp-grid' }, all.map(t => h('li', null, topicLink(t))))));
                status.textContent = plural(all.length, 'topic', 'topics');
            } else {
                results.replaceChildren(starters());
                status.textContent = `${list.length.toLocaleString()} topics, A to Z`;
            }
        }
        field.addEventListener('input', () => { if (field.value) letter = ''; refresh(); });

        root.replaceChildren(h('div', { class: 'page tp-page' },
            head('Topical Bible', ['Study a ', h('em', null, 'subject'), ' through the whole Bible'],
                'Nave’s Topical Bible gathers the passages on one subject, from Genesis to Revelation, under headings of its own. Pick a topic, then follow any reference into the text.'),
            h('div', { class: 'tp-tools' },
                h('div', { class: 'tp-search' }, icon('search'), field), bar),
            status, results, credit()));
        refresh();
    }

    // ── One topic ───────────────────────────────────────────────────────
    function refCard(ref, withText) {
        const p = Study.parse(ref);
        const link = p ? h('a', { class: 'tp-ref', href: Study.readHref(p) }, Study.format(p))
            : h('span', { class: 'tp-ref' }, ref);
        const li = h('li', { class: `tp-row${withText ? ' has-text' : ''}` }, link);
        if (withText && p) {
            const text = h('p', { class: 'scripture tp-text' });
            li.append(text);
            Study.verseText(p).then(t => {
                if (!t) { text.remove(); return; }
                text.textContent = t.length > TEXT_LIMIT ? `${t.slice(0, TEXT_LIMIT).replace(/\s+\S*$/, '')}…` : t;
            }).catch(() => text.remove());
        }
        return li;
    }

    function sectionNode(s, i, t, single) {
        const id = `tp-s-${i}`;
        const first = s.refs.slice(0, SHOWN_FIRST);
        const rest = s.refs.slice(SHOWN_FIRST);
        const listEl = h('ul', { class: 'tp-refs', 'aria-label': s.title || t.name }, first.map(r => refCard(r, true)));
        const restEl = h('ul', { class: 'tp-rest', id: `${id}-rest`, hidden: true }, rest.map(r => h('li', null, refCard(r, false).firstChild)));
        const btn = rest.length ? h('button', {
            type: 'button', class: 'btn btn-sm tp-all', 'aria-expanded': 'false', 'aria-controls': `${id}-rest`,
            onclick: () => {
                const open = restEl.hidden;
                restEl.hidden = !open;
                btn.setAttribute('aria-expanded', String(open));
                btn.textContent = open ? 'Show fewer' : `Show all ${s.refs.length.toLocaleString()} references`;
            }
        }, `Show all ${s.refs.length.toLocaleString()} references`) : null;
        return h('section', { class: 'tp-section', 'aria-labelledby': `${id}-h` },
            h('div', { class: 'tp-section-head' },
                h('h2', { id: `${id}-h`, class: 'tp-section-title' }, s.title || (single ? 'Passages' : 'Passages')),
                h('span', { class: 'faint tp-section-n' }, plural(s.refs.length, 'reference', 'references'))),
            listEl, restEl, btn);
    }

    async function renderTopic(slug, t) {
        const found = await topic(slug);
        if (t !== token) return;
        if (!found) { renderNotFound(slug); return; }
        const total = found.sections.reduce((n, s) => n + s.refs.length, 0);
        const see = (found.see || []).map(s => bySlug.get(s)).filter(Boolean);
        const jump = found.sections.length > 6;
        root.replaceChildren(h('div', { class: 'page tp-page' },
            h('nav', { class: 'tp-crumbs', 'aria-label': 'Breadcrumb' },
                h('a', { href: '#/topic' }, 'Topics'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', null, found.name)),
            head('Topical Bible', found.name,
                `${plural(total, 'reference', 'references')}${found.sections.length > 1 ? ` in ${plural(found.sections.length, 'section', 'sections')}` : ''}, as gathered in Nave’s Topical Bible.`),
            see.length ? h('div', { class: 'tp-see' }, h('span', { class: 'eyebrow' }, 'See also'),
                h('div', { class: 'chip-row' }, see.map(s => h('a', { class: 'chip', href: href(s.slug) }, s.name)))) : null,
            jump ? h('details', { class: 'tp-toc' }, h('summary', null, `Jump to a section (${found.sections.length})`),
                h('ul', null, found.sections.map((s, i) => h('li', null,
                    h('a', { href: `#tp-s-${i}-h`, onclick: ev => { ev.preventDefault(); document.getElementById(`tp-s-${i}-h`)?.scrollIntoView({ block: 'start' }); } }, s.title || 'Passages'))))) : null,
            h('div', { class: 'tp-sections' }, found.sections.map((s, i) => sectionNode(s, i, found, found.sections.length === 1))),
            credit()));
    }

    function renderNotFound(slug) {
        root.replaceChildren(h('div', { class: 'page tp-page' },
            h('div', { class: 'tp-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, 'Topical Bible'),
                h('h1', null, 'We could not find that topic'),
                h('p', { class: 'lede' }, `There is no topic “${slug}”. Search the index for the subject you have in mind.`),
                h('a', { class: 'btn btn-primary', href: '#/topic' }, 'Search the topics'))));
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) { root = el; root.classList.add('tp'); root.tabIndex = -1; }

    async function show(route) {
        const t = ++token;
        root.replaceChildren(h('div', { class: 'page tp-page' }, h('p', { class: 'dim', role: 'status' }, 'Loading…')));
        try { await loadList(); } catch { /* an empty list still renders */ }
        if (t !== token) return;
        if (!list) list = [], bySlug = new Map();
        const slug = route.parts[0];
        if (!slug) { renderIndex(route); return; }
        try {
            await renderTopic(slug, t);
        } catch {
            if (t === token) renderNotFound(slug);
        }
    }
    function title(route) {
        const slug = route.parts[0];
        if (!slug) return 'Topical Bible';
        return bySlug?.get(slug)?.name || 'Topic';
    }
    function hide() { token++; }

    App.registerView('topic', { init, show, hide, title });

    // ── Study panel section: the topics that include this verse ─────────
    const indexCache = new Map();
    function bookIndex(slug) {
        if (!indexCache.has(slug)) indexCache.set(slug, Api.getTopicIndex(slug).catch(() => ({})));
        return indexCache.get(slug);
    }
    async function studySection(ctx) {
        const [idx] = await Promise.all([bookIndex(ctx.book.slug), loadList().catch(() => null)]);
        const slugs = idx?.[String(ctx.chapter)]?.[String(ctx.verse)] || [];
        const items = slugs.map(s => bySlug?.get(s)).filter(Boolean);
        if (!items.length) return null;
        return h('div', { class: 'tp-study' },
            h('div', { class: 'chip-row' }, items.map(t => h('a', { class: 'chip tp-chip', href: href(t.slug) }, t.name))),
            h('p', { class: 'faint tp-study-note' }, 'Subjects that cite this verse in Nave’s Topical Bible, the most specific first.'));
    }
    if (typeof Study !== 'undefined' && Study.addSection) {
        Study.addSection({ id: 'topics', order: 50, title: 'Topics', render: studySection });
    }
    return { topic };
})();

// xrefs.js — cross-references, the first section of the verse study panel.
//
// Data: bibles/xrefs/<book>.json = { "<ch>": { "<v>": ["Romans 5:8", "1 John 4:9–10", …] } },
// best first, at most twelve a verse. Built from the OpenBible.info cross-reference dataset
// (CC BY; drawn from the Treasury of Scripture Knowledge and ranked by readers' votes), keeping
// references with at least five votes, each checked against the local KJV.
(() => {
    const { h } = UI;
    const FIRST = 4;               // rows shown, with their text, before "Show all"
    const CACHE_MAX = 4;           // books of cross-references kept in memory
    const PREVIEW_CHARS = 220;     // a line or two is enough to recognise a passage
    const SOURCE_URL = 'https://www.openbible.info/labs/cross-references/';

    const cache = new Map();       // slug → Promise<{ ch: { v: [refs] } }>, least recently used first
    function refsFor(slug) {
        let p = cache.get(slug);
        if (p) cache.delete(slug);
        else {
            p = Api.getCrossRefs(slug);
            p.catch(() => cache.delete(slug));
        }
        cache.set(slug, p);
        if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
        return p;
    }

    const clip = text => (text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS).replace(/\s+\S*$/, '')}…` : text);

    function row(ref) {
        const p = Study.parse(ref);
        if (!p) return null;
        const text = h('span', { class: 'sp-row-text' });
        const item = h('li', null,
            h('a', { class: 'sp-row', href: Study.readHref(p) },
                h('span', { class: 'sp-row-ref' }, Study.format(p)),
                text));
        item.fill = version => Study.verseText(p, version)
            .then(t => { if (t) text.textContent = clip(t); })
            .catch(() => { /* the reference alone still links */ });
        return item;
    }

    async function render(ctx) {
        const data = await refsFor(ctx.book.slug);
        const refs = data?.[String(ctx.chapter)]?.[String(ctx.verse)];
        if (!refs || !refs.length) return null;

        const items = refs.map(row).filter(Boolean);
        if (!items.length) return null;
        // A list only one over the limit is shown whole: a button to reveal one is noise.
        const limit = items.length <= FIRST + 1 ? items.length : FIRST;
        const list = h('ul', { class: 'sp-list xr-list' }, items);
        items.forEach((item, i) => { if (i < limit) item.fill(ctx.version); else item.hidden = true; });

        const more = items.length > limit ? h('button', {
            type: 'button', class: 'btn btn-quiet btn-sm sp-more',
            onclick: async e => {
                const rest = items.slice(limit);
                rest.forEach(item => { item.hidden = false; });
                e.currentTarget.remove();
                rest[0]?.querySelector('a').focus();
                // One at a time, so the shared book cache is not flooded.
                for (const item of rest) {
                    if (!item.isConnected) return;
                    await item.fill(ctx.version);
                }
            }
        }, `Show all ${items.length}`) : null;

        return h('div', { class: 'xr' },
            list,
            more,
            h('p', { class: 'sp-note' }, 'From the ',
                h('a', { href: SOURCE_URL, target: '_blank', rel: 'noopener' }, 'OpenBible.info'),
                ' cross-references, after the Treasury of Scripture Knowledge.'));
    }

    Study.addSection({ id: 'xrefs', order: 10, title: 'Cross-references', render });
})();

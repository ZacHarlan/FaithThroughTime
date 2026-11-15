// api.js — the ONLY file that calls fetch().
// Every URL is relative so the same code runs on the .NET app, the static
// GitHub Pages export, and a sub-path deployment.
const Api = (() => {
    async function getJson(url, label) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${label} failed: ${res.status}`);
        return res.json();
    }

    // Optional static content: a missing file is an empty result, not an error.
    async function getOptionalJson(url, fallback) {
        try {
            const res = await fetch(url);
            return res.ok ? await res.json() : fallback;
        } catch {
            return fallback;
        }
    }

    return {
        // The whole dataset in one request (see Store for the shape).
        getDataset() {
            if (window.__FTT_DATASET__) return Promise.resolve(window.__FTT_DATASET__);
            return getJson('data/dataset.json', 'Dataset');
        },

        // Authored content that sits beside the dataset.
        getTours() { return getOptionalJson('data/tours.json', { tours: [] }); },
        getDiscoveries() { return getOptionalJson('data/discoveries.json', { discoveries: [] }); },
        getParallels() { return getOptionalJson('data/parallels.json', { groups: [] }); },
        getProphecy() { return getOptionalJson('data/prophecy.json', { quotations: [], prophecies: [] }); },
        getReadingPlan() { return getOptionalJson('data/reading-plan.json', { days: [] }); },
        getKings() { return getOptionalJson('data/kings.json', { kings: [], prophets: [] }); },

        // Study data beside the Bible text, per book or per chunk (bibles/ is cached first by sw.js).
        // Cross-references: bibles/xrefs/<book>.json. Word study: the KJV with Strong's numbers
        // (bibles/kjv-strongs/<book>.json), the lexicon (bibles/strongs/<H|G><chunk>.json) and
        // where each number occurs (bibles/strongs-index/<H|G><chunk>.json).
        getCrossRefs(bookSlug) { return getOptionalJson(`bibles/xrefs/${encodeURIComponent(bookSlug)}.json`, {}); },
        getStrongsBook(bookSlug) { return getOptionalJson(`bibles/kjv-strongs/${encodeURIComponent(bookSlug)}.json`, null); },
        getLexicon(chunk) { return getOptionalJson(`bibles/strongs/${encodeURIComponent(chunk)}.json`, {}); },
        getConcordance(chunk) { return getOptionalJson(`bibles/strongs-index/${encodeURIComponent(chunk)}.json`, {}); },

        // Local Bible text (per-book JSON under bibles/).
        getBibleManifest() { return getJson('bibles/manifest.json', 'Bible manifest'); },
        getBibleBook(versionId, bookSlug) {
            return getJson(
                `bibles/${encodeURIComponent(versionId)}/${encodeURIComponent(bookSlug)}.json`,
                'Bible book'
            );
        }
    };
})();

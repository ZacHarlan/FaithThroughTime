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

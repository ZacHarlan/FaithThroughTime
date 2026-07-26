// sw.js — Service Worker for Faith Through Time PWA
//
// Bump CACHE_NAME on every release so the activate handler deletes the
// old cache. Without a bump, returning users get the previously cached
// map.js / index.html forever (cache-first hides server updates).
const CACHE_NAME = 'faith-through-time-v8-2026-07-26';
const STATIC_ASSETS = [
    '/',
    '/css/styles.css',
    '/js/utils.js',
    '/js/api.js',
    '/js/bible.js',
    '/js/state.js',
    '/js/timeline.js',
    '/js/filters.js',
    '/js/detail-panel.js',
    '/js/search.js',
    '/js/lineage.js',
    '/js/map.js',
    '/js/scrollbar.js',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

const CDN_ASSETS = [
    'https://d3js.org/d3.v7.min.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

// Install: cache static assets AND the CDN libraries. Without the CDN
// files precached, an offline reopen loads the shell but d3/leaflet 404
// ("d3 is not defined" → blank app) — the first visit fetches them before
// this worker controls the page, so install is the only reliable moment.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([...STATIC_ASSETS, ...CDN_ASSETS]).catch(err => {
                console.warn('SW: Some assets failed to precache:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // API calls: network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(resp => {
                    // Only cache good responses — a transient 500 must not
                    // evict the last good payload from the offline cache
                    if (resp && resp.ok) {
                        const clone = resp.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return resp;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // CDN assets: cache-first
    if (CDN_ASSETS.some(a => event.request.url.startsWith(a.split('?')[0]))) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(resp => {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return resp;
                });
            })
        );
        return;
    }

    // Static assets: stale-while-revalidate.
    // Return cached copy immediately for speed, but fetch fresh in the
    // background so the next page load picks up any deployed changes.
    // Pure cache-first (the previous behavior) caused old map.js / index.html
    // to be served indefinitely after a deploy.
    event.respondWith(
        caches.match(event.request).then(cached => {
            const networkFetch = fetch(event.request).then(resp => {
                if (resp && resp.ok) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return resp;
            }).catch(() => cached);
            return cached || networkFetch;
        })
    );
});

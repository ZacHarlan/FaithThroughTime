// sw.js — offline support for Faith Through Time.
//
// Strategy:
//   - The app shell, code and data: network first, falling back to the cache.
//     A deploy is picked up on the next load; offline still works.
//   - Bible text, vendored libraries and fonts never change at a given URL:
//     cache first, in a cache of their own that survives deploys, so chapters a
//     reader has opened stay available offline.
// build-static.py replaces both names with content hashes: CACHE_NAME from the app's own
// files, LIBRARY_CACHE from bibles/ and vendor/, so each is invalidated only by a change
// to what it holds.
const CACHE_NAME = 'ftt-7c745f09a75e';
const LIBRARY_CACHE = 'ftt-library-92bf78582589';

const SHELL = [
    './',
    'css/base.css', 'css/home.css', 'css/timeline.css', 'css/tour.css', 'css/detail.css', 'css/meet.css',
    'css/family.css', 'css/map.css', 'css/read.css', 'css/search.css', 'css/share.css', 'css/about.css',
    'vendor/d3.v7.min.js',
    'js/api.js', 'js/store.js', 'js/ui.js', 'js/app.js', 'js/analytics.js', 'js/bible.js', 'js/share.js', 'js/search.js',
    'js/detail.js', 'js/home.js', 'js/timeline.js', 'js/tour.js', 'js/meet.js', 'js/family.js',
    'js/map.js', 'js/read.js', 'js/about.js',
    'data/dataset.json', 'data/tours.json', 'data/discoveries.json',
    'bibles/manifest.json',
    'manifest.json', 'icons/favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];

const IMMUTABLE = /\/(bibles\/[^/]+\/|vendor\/)|fonts\.(googleapis|gstatic)\.com/;

self.addEventListener('install', event => {
    // One missing file must not block installation, so add them individually.
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => null))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && k !== LIBRARY_CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function store(cacheName, request, response) {
    // Only keep good responses: a transient error must not replace a good copy.
    if (response && (response.ok || response.type === 'opaque')) {
        const copy = response.clone();
        caches.open(cacheName).then(cache => cache.put(request, copy));
    }
    return response;
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;
    const immutable = IMMUTABLE.test(request.url);
    if (!sameOrigin && !immutable) return;          // analytics, map tiles: leave to the browser

    if (immutable) {
        event.respondWith(
            caches.match(request).then(cached => cached || fetch(request).then(r => store(LIBRARY_CACHE, request, r)))
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then(r => store(CACHE_NAME, request, r))
            .catch(() => caches.match(request, { ignoreSearch: request.mode === 'navigate' })
                .then(cached => cached || (request.mode === 'navigate' ? caches.match('./') : Response.error())))
    );
});

// analytics.js — Google Analytics 4, on the live site only.
//
// The app routes with the URL fragment (#/person/david), which GA4 does not count as page
// views on its own. So the tag is configured with send_page_view off, and each route change
// sends one page_view with a clean path (/person/david) — the same paths the static person
// and event pages use. Router.replace() updates (the timeline's position while panning)
// emit no 'route' event and so are never counted.
//
// Events: page_view, search, share, journey_play, select_translation, theme_change.
// Nothing loads off the live hostname (localhost, test runs), so development traffic never
// reaches the property; events are still recorded in Analytics.log for tests.
const Analytics = (() => {
    const ID = 'G-7FEHLW6BD9';
    const LIVE = /(^|\.)faiththroughtime\.com$/.test(window.location.hostname);
    const log = [];                 // recent events, newest last (tests read this)
    let lastPath = null;

    if (LIVE) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', ID, { send_page_view: false });
        UI.loadScript(`https://www.googletagmanager.com/gtag/js?id=${ID}`).catch(() => { /* blocked: fine */ });
    }

    function event(name, params = {}) {
        log.push({ name, params });
        if (log.length > 50) log.shift();
        if (LIVE && window.gtag) window.gtag('event', name, params);
    }

    // '#/person/david?x=1' → '/person/david'. Queries are view state (timeline position,
    // verse highlights, journey step), not separate pages.
    function pathOf(route) {
        return `/${[route.view === 'home' ? '' : route.view, ...route.parts].filter(Boolean).map(encodeURIComponent).join('/')}`;
    }

    App.on('route', route => {
        const path = pathOf(route);
        if (path === lastPath) return;
        lastPath = path;
        event('page_view', {
            page_path: path,
            page_location: `${window.location.origin}${path}`,
            page_title: document.title
        });
    });

    App.on('theme', theme => event('theme_change', { theme }));

    return { event, get log() { return log.slice(); }, get live() { return LIVE; } };
})();

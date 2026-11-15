// app.js — the shell: routing, view lifecycle, theme, and a small event bus.
// Loaded before the view modules; they register themselves with App.
//
// Routes (hash-based so they work on any static host and on file://):
//   #/                         home
//   #/timeline?y=&span=&era=   the timeline (y = centre year, span = years visible)
//   #/story/<tour>/<step>      a guided tour, played on the timeline
//   #/meet/<slugA>/<slugB>     did their lives overlap?
//   #/family/<slug>            family tree
//   #/map/<journeySlug>        map and journeys   (?place=<locationSlug>)
//   #/read/<bookSlug>/<chapter>  scripture reader  (?v=3-7 highlights verses)
//   #/about                    about the dates and sources
//   #/person/<slug>, #/event/<slug>   detail sheet, shown over the current view

const Router = (() => {
    // A link cut off mid-escape ("%E0%A4") must not take the app down.
    function safeDecode(part) {
        try {
            return decodeURIComponent(part);
        } catch {
            return part;
        }
    }

    function parse(hash = window.location.hash) {
        const raw = hash.replace(/^#\/?/, '');
        const [path, qs = ''] = raw.split('?');
        const parts = path.split('/').filter(Boolean).map(safeDecode);
        return {
            view: parts[0] || 'home',
            parts: parts.slice(1),
            query: Object.fromEntries(new URLSearchParams(qs)),
            path: `#/${path}${qs ? `?${qs}` : ''}`
        };
    }

    function build(view, parts = [], query = {}) {
        const path = [view === 'home' ? '' : view, ...parts].filter(p => p !== '' && p != null)
            .map(encodeURIComponent).join('/');
        const qs = new URLSearchParams(
            Object.entries(query).filter(([, v]) => v != null && v !== '')
        ).toString();
        return `#/${path}${qs ? `?${qs}` : ''}`;
    }

    // go() adds a history entry; replace() does not (use it for continuous
    // updates such as the timeline position while panning).
    function go(hash) { window.location.hash = hash; }
    function replace(hash) {
        if (hash === window.location.hash) return;
        window.history.replaceState(window.history.state, '', hash);   // keep the entry's marker (see App)
        window.dispatchEvent(new Event('ftt:replace'));
    }

    return { parse, build, go, replace, get current() { return parse(); } };
})();

const App = (() => {
    const views = new Map();       // name → { init(el), show(route), hide(), title(route) }
    const overlays = new Map();    // route view → { open(route), close() }
    const ALIAS = { story: 'timeline' };   // routes rendered by another view
    const listeners = new Map();

    let activeView = null;         // name of the base view on screen
    let activeOverlay = null;      // overlay impl currently open
    let lastBasePath = '#/timeline';
    const initialized = new Set();

    // Each history entry is stamped with a running index the first time it is seen, so a
    // sheet can be closed by going back to the entry underneath it. Closing by pushing the
    // base route instead would leave the sheet one Back press away, forever.
    let currentEntry = 0;          // index of the entry we are on
    let baseEntry = null;          // index of the entry holding the base view under the sheet

    // An unstamped entry is a new one, pushed on top of wherever we were: one past the
    // current position (not one past the highest ever seen — entries ahead of us are
    // discarded by the browser when a new one is pushed).
    function stampEntry() {
        const known = window.history.state && window.history.state.fttEntry;
        if (known) {
            currentEntry = known;
        } else {
            currentEntry += 1;
            window.history.replaceState({ fttEntry: currentEntry }, '', window.location.href);
        }
        return currentEntry;
    }

    // ── Event bus ───────────────────────────────────────────────────────
    // Events in use: 'route' (route), 'theme' (name), 'focus-item' ({ kind, id }),
    // 'open-search' (), 'data-ready' ().
    function on(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
        return () => listeners.get(type).delete(fn);
    }
    function emit(type, payload) {
        for (const fn of listeners.get(type) || []) fn(payload);
    }

    // ── Registration ────────────────────────────────────────────────────
    function registerView(name, impl) { views.set(name, impl); }
    function registerOverlay(routeViews, impl) { for (const v of routeViews) overlays.set(v, impl); }

    // ── Theme ───────────────────────────────────────────────────────────
    const THEME_KEY = 'ftt-theme';
    function getTheme() { return document.documentElement.dataset.theme || 'dark'; }
    function setTheme(name) {
        document.documentElement.dataset.theme = name;
        syncThemeButton(name);
        try { localStorage.setItem(THEME_KEY, name); } catch { /* private mode */ }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = name === 'dark' ? '#0a0c12' : '#f5efe2';
        emit('theme', name);
    }

    // The button shows what pressing it will do: a sun in the dark, a moon in the light.
    function syncThemeButton(name) {
        const next = name === 'dark' ? 'light' : 'dark';
        document.getElementById('theme-icon')?.setAttribute('href', next === 'light' ? '#i-sun' : '#i-moon');
        document.getElementById('btn-theme')?.setAttribute('aria-label', `Switch to ${next} theme`);
    }

    // ── Routing ─────────────────────────────────────────────────────────
    function handleRoute() {
        const route = Router.parse();
        const entry = stampEntry();

        const overlay = overlays.get(route.view);
        if (overlay) {
            if (!activeView) showBase(Router.parse(lastBasePath)); // deep link straight to a sheet
            if (activeOverlay && activeOverlay !== overlay) activeOverlay.close();
            activeOverlay = overlay;
            overlay.open(route);
            document.title = titleFor(overlay, route);
            emit('route', route);
            return;
        }

        if (activeOverlay) { activeOverlay.close(); activeOverlay = null; }
        lastBasePath = route.path;
        baseEntry = entry;
        showBase(route);
        emit('route', route);
    }

    function showBase(route) {
        const name = views.has(ALIAS[route.view] || route.view) ? (ALIAS[route.view] || route.view) : 'home';
        const impl = views.get(name);
        const el = document.getElementById(`view-${name}`);

        if (activeView !== name) {
            const prev = views.get(activeView);
            if (prev && prev.hide) prev.hide();
            for (const section of document.querySelectorAll('.view')) {
                section.hidden = section !== el;
            }
            document.body.dataset.view = name;
            for (const link of document.querySelectorAll('[data-nav]')) {
                const current = link.dataset.nav === name;
                link.classList.toggle('is-active', current);
                if (current) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
            }
            activeView = name;
            if (el && !Router.parse().view.match(/^(person|event)$/)) {
                el.scrollTop = 0;
                window.scrollTo(0, 0);
            }
        }

        if (impl && el) {
            if (!initialized.has(name)) {
                initialized.add(name);
                if (impl.init) impl.init(el);
            }
            if (impl.show) impl.show(route);
        }
        document.title = titleFor(impl, route);
    }

    function titleFor(impl, route) {
        const specific = impl && impl.title ? impl.title(route) : null;
        return specific ? `${specific} — Faith Through Time` : 'Faith Through Time — the whole story of Scripture on one timeline';
    }

    // Leave a sheet and return to whatever was underneath it.
    function closeOverlay() {
        if (!activeOverlay) return;
        const here = window.history.state && window.history.state.fttEntry;
        if (baseEntry && here && here > baseEntry) window.history.go(baseEntry - here);
        else Router.go(lastBasePath);          // opened by a deep link: nothing underneath to go back to
    }

    // Views keep their URL current with Router.replace while the user pans or steps. The
    // base path has to follow, or closing a sheet would return to where the view started.
    function onReplace() {
        const route = Router.parse();
        if (!overlays.has(route.view)) lastBasePath = route.path;
    }

    // ── Start-up ────────────────────────────────────────────────────────
    async function start() {
        syncThemeButton(getTheme());
        document.getElementById('btn-theme')?.addEventListener('click', () => {
            setTheme(getTheme() === 'dark' ? 'light' : 'dark');
        });
        // The skip link moves focus; it must not navigate (every href is a route here).
        document.getElementById('skip-link')?.addEventListener('click', e => {
            e.preventDefault();
            document.getElementById('views').focus();
        });
        window.addEventListener('ftt:replace', onReplace);
        for (const btn of document.querySelectorAll('[data-open-search]')) {
            btn.addEventListener('click', () => emit('open-search'));
        }
        document.addEventListener('keydown', e => {
            const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                emit('open-search');
            }
        });

        try {
            await Store.load();
        } catch (err) {
            console.error('Faith Through Time could not load its data', err);
            document.getElementById('splash')?.classList.add('is-error');
            return;
        }
        emit('data-ready');
        window.addEventListener('hashchange', handleRoute);
        handleRoute();
        document.documentElement.classList.add('is-ready');

        if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
            navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
        }
    }

    // View modules load after this file (all deferred), so wait for the DOM.
    document.addEventListener('DOMContentLoaded', start);

    return {
        registerView, registerOverlay, on, emit, closeOverlay,
        get theme() { return getTheme(); }, setTheme,
        get view() { return activeView; },
        get basePath() { return lastBasePath; }
    };
})();

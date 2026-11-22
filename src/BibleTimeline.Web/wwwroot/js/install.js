// install.js — "Add to home screen", offered gently, and the count of visits that both it and the
// home page's welcome rely on.
//
//   Install.visits()     how many separate visits this browser has made (counted once per session)
//   Install.available()  true when the app can be installed here and is not already: a Chromium
//                        install prompt is waiting, or this is iOS Safari, where the person adds it by hand
//   Install.prompt()     asks the browser to install, or on iOS shows how; resolves to 'accepted',
//                        'dismissed' or 'hint'
//   Install.onChange(fn) calls fn when availability changes (the browser sends its event late)
//
// On a phone a small bar rises above the tab bar, but only from the second visit, only once the
// person has not dismissed it, and never inside the installed app. On a desktop the home page's
// footer carries a quiet button instead (it asks Install.available()).
const Install = (() => {
    const { h } = UI;
    const VISITS_KEY = 'ftt-visits';
    const DISMISSED_KEY = 'ftt-install-dismissed';
    const SESSION_KEY = 'ftt-session';
    const HINT = 'Tap Share, then Add to Home Screen';

    const read = (area, key) => { try { return area.getItem(key); } catch { return null; } };
    const write = (area, key, value) => { try { area.setItem(key, value); } catch { /* private mode */ } };
    const local = () => { try { return window.localStorage; } catch { return null; } };
    const session = () => { try { return window.sessionStorage; } catch { return null; } };

    let deferred = null;
    let installed = false;
    let bar = null;
    let visits = 1;
    const listeners = [];

    // A visit is a browser session: reloads and in-app navigation do not add to it.
    function countVisit() {
        const ls = local(), ss = session();
        if (!ls) return;
        const before = Number(read(ls, VISITS_KEY)) || 0;
        if (ss && read(ss, SESSION_KEY)) { visits = Math.max(1, before); return; }
        visits = before + 1;
        write(ls, VISITS_KEY, String(visits));
        if (ss) write(ss, SESSION_KEY, '1');
    }

    function standalone() {
        return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    }

    // iPhone, iPad (which now reports itself as a Mac with a touch screen) in Safari itself.
    function iosSafari() {
        const ua = navigator.userAgent || '';
        const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
        return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    }

    function available() {
        if (installed || standalone()) return false;
        return !!deferred || iosSafari();
    }

    const dismissed = () => { const ls = local(); return !!ls && read(ls, DISMISSED_KEY) === '1'; };

    function changed() {
        for (const fn of listeners) fn();
        if (!available()) hideBar();
    }

    async function prompt() {
        if (!available()) return 'dismissed';
        if (!deferred) { UI.toast(HINT); return 'hint'; }
        const event = deferred;
        deferred = null;
        let outcome = 'dismissed';
        try {
            await event.prompt();
            outcome = (await event.userChoice).outcome;
        } catch { /* the browser declined to show it */ }
        hideBar();
        changed();
        return outcome;
    }

    // ── The bar (phones) ────────────────────────────────────────────────
    function dismissBar() {
        const ls = local();
        if (ls) write(ls, DISMISSED_KEY, '1');
        hideBar();
    }

    function hideBar() {
        if (!bar) return;
        const el = bar;
        bar = null;
        el.classList.remove('is-visible');
        setTimeout(() => el.remove(), 400);
    }

    function maybeShowBar() {
        if (bar || visits < 2 || dismissed() || !available() || !UI.isMobile()) return;
        const ios = !deferred;
        bar = h('div', { class: 'install-bar', role: 'region', 'aria-label': 'Add to home screen' },
            h('p', { class: 'install-text' }, ios ? HINT : 'Add Faith Through Time to your home screen.'),
            ios ? null : h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: prompt }, 'Add'),
            h('button', { class: 'icon-btn install-close', type: 'button', 'aria-label': 'Not now', onclick: dismissBar }, UI.icon('close')));
        document.body.append(bar);
        requestAnimationFrame(() => requestAnimationFrame(() => bar && bar.classList.add('is-visible')));
    }

    countVisit();
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferred = e;
        changed();
        setTimeout(maybeShowBar, 4000);
    });
    window.addEventListener('appinstalled', () => { installed = true; deferred = null; changed(); });
    // iOS sends no event: look once the app has had a moment to settle.
    if (iosSafari()) setTimeout(maybeShowBar, 6000);

    return {
        visits: () => visits,
        available,
        prompt,
        onChange(fn) { listeners.push(fn); }
    };
})();

// ui.js — small shared building blocks. No view logic lives here.
const UI = (() => {
    // DOM builder. Text is always set as text, never parsed as HTML.
    //   UI.h('a', { class: 'chip', href, onclick }, UI.icon('person'), 'Abraham')
    function h(tag, props, ...children) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(props || {})) {
            if (v == null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'style' && typeof v === 'object') setStyles(el, v);
            else if (k === 'dataset') Object.assign(el.dataset, v);
            else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
            else if (v === true) el.setAttribute(k, '');
            else el.setAttribute(k, v);
        }
        append(el, children);
        return el;
    }
    // Custom properties (--chip) only take effect through setProperty.
    function setStyles(el, styles) {
        for (const [name, value] of Object.entries(styles)) {
            if (value == null) continue;
            if (name.startsWith('--')) el.style.setProperty(name, value);
            else el.style[name] = value;
        }
    }
    function append(el, children) {
        for (const c of children.flat(Infinity)) {
            if (c == null || c === false) continue;
            el.append(c.nodeType ? c : document.createTextNode(String(c)));
        }
        return el;
    }
    const clear = el => { el.replaceChildren(); return el; };

    const SVG_NS = 'http://www.w3.org/2000/svg';
    // Icons come from the sprite in index.html (<symbol id="i-…">).
    function icon(name, cls = '') {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', `icon ${cls}`.trim());
        svg.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS(SVG_NS, 'use');
        use.setAttribute('href', `#i-${name}`);
        svg.append(use);
        return svg;
    }

    // ── Colour families ─────────────────────────────────────────────────
    // Every role and event category belongs to one of eight families, each a
    // CSS custom property (--fam-<name>) defined for both themes in base.css.
    const FAMILY = {
        // people
        patriarch: 'amber', matriarch: 'amber', ancestor: 'slate', messiah: 'gold',
        king: 'crimson', queen: 'crimson', ruler: 'crimson',
        prophet: 'violet', priest: 'teal', judge: 'green',
        apostle: 'gold', disciple: 'gold',
        warrior: 'slate', sage: 'blue', 'church-leader': 'blue', reformer: 'green',
        // events
        creation: 'amber', covenant: 'blue', law: 'blue',
        miracle: 'gold', salvation: 'gold',
        judgment: 'crimson', war: 'crimson', conquest: 'crimson', exile: 'crimson', persecution: 'crimson',
        kingdom: 'violet', prophecy: 'violet', teaching: 'violet',
        worship: 'teal', mission: 'green', reform: 'green',
        council: 'blue', scripture: 'blue', birth: 'amber', death: 'slate'
    };
    const family = group => FAMILY[group] || 'slate';
    const familyColor = group => `var(--fam-${family(group)})`;
    const eraColor = year => Store.periodAt(year)?.color || 'var(--gold)';

    // ── Links to entities ───────────────────────────────────────────────
    function href(x) {
        switch (x.kind) {
            case 'person': return `#/person/${x.slug}`;
            case 'event': return `#/event/${x.slug}`;
            case 'location': return `#/map?place=${x.slug}`;
            case 'book': return `#/read/${x.slug}/1`;
            case 'period': return `#/timeline?era=${x.slug}`;
            case 'journey': return `#/map/${x.slug}`;
            default: return '#/';
        }
    }
    // A pill link to a person or event, tinted by its colour family.
    function chip(x, { sub } = {}) {
        const group = x.kind === 'person' ? x.role : x.category;
        return h('a', { class: 'chip chip-entity', href: href(x), style: { '--chip': familyColor(group) } },
            h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
            h('span', { class: 'chip-label' }, x.name),
            sub ? h('span', { class: 'chip-sub' }, sub) : null);
    }

    // ── Feedback ────────────────────────────────────────────────────────
    let toastTimer;
    function toast(message) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = message;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
    }

    async function copy(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }

    // Native share sheet where there is one; otherwise copy the link.
    // `file` (a File, e.g. a generated card image) is attached when supported.
    async function share({ title, text, url = window.location.href, file } = {}) {
        const payload = { title, text, url };
        try {
            if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ ...payload, files: [file] });
                return 'shared';
            }
            if (navigator.share) {
                await navigator.share(payload);
                return 'shared';
            }
        } catch (err) {
            if (err && err.name === 'AbortError') return 'cancelled';
        }
        const ok = await copy(url);
        toast(ok ? 'Link copied' : 'Could not copy the link');
        return ok ? 'copied' : 'failed';
    }

    // ── Loading extra assets on demand (e.g. Leaflet for the map) ───────
    const loaded = new Map();
    function loadScript(src) {
        if (!loaded.has(src)) {
            loaded.set(src, new Promise((resolve, reject) => {
                const s = h('script', { src });
                s.onload = resolve;
                s.onerror = () => { loaded.delete(src); reject(new Error(`Could not load ${src}`)); };
                document.head.append(s);
            }));
        }
        return loaded.get(src);
    }
    function loadStyle(url) {
        if (!loaded.has(url)) {
            loaded.set(url, new Promise((resolve, reject) => {
                const l = h('link', { rel: 'stylesheet', href: url });
                l.onload = resolve;
                l.onerror = () => { loaded.delete(url); reject(new Error(`Could not load ${url}`)); };
                document.head.append(l);
            }));
        }
        return loaded.get(url);
    }

    // ── Accessibility helpers ───────────────────────────────────────────
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

    // Keep Tab inside a dialog or sheet. Returns a function that releases it
    // and puts focus back where it was.
    function trapFocus(container) {
        const previous = document.activeElement;
        const focusables = () => [...container.querySelectorAll(
            'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter(el => el.offsetParent !== null);
        function onKey(e) {
            if (e.key !== 'Tab') return;
            const list = focusables();
            if (!list.length) return;
            const first = list[0], last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        container.addEventListener('keydown', onKey);
        return () => {
            container.removeEventListener('keydown', onKey);
            if (previous && previous.focus && document.contains(previous)) previous.focus();
        };
    }

    const debounce = (fn, ms = 150) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };

    return {
        h, append, clear, icon, family, familyColor, eraColor, href, chip,
        toast, copy, share, loadScript, loadStyle, reducedMotion, isMobile, trapFocus, debounce
    };
})();

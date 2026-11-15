// family.js — the family view.
//
//   #/family                 the line of descent, from the first ancestor to Jesus
//   #/family?line=luke       the same line, following Luke's names where the data has them
//   #/family?at=<slug>       the line, opened at one generation
//   #/family/<slug>          one person's family tree
//
// The line is a long procession down a gold thread, with era colour shifting
// along it. The tree is laid out by hand (a pedigree above, spouses beside,
// siblings alongside, children and grandchildren below) and drawn as HTML
// nodes over SVG connectors inside one pan/zoom world, so every node is a real,
// focusable link.
const Family = (() => {
    const { h } = UI;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // The spec anchors the line at Jesus; everything else is read from Store.
    const LINE_END = 'jesus';

    let root, lineEl, treeEl, lineLink, treeLink;
    let lastTreeSlug = null;

    // ── Shared helpers ──────────────────────────────────────────────────
    // Recorded dates only. A lone birth or death year is said as such; no dates
    // at all returns null so the caller can say so plainly.
    function lifeText(p) {
        if (Store.datesKnown(p)) return Store.dates(p);
        if (p.birthYear != null) return `born ${Time.year(p.birthYear, { approx: p.birthApprox })}`;
        if (p.deathYear != null) return `died ${Time.year(p.deathYear, { approx: p.deathApprox })}`;
        return null;
    }
    function datesEl(p, cls) {
        const text = lifeText(p);
        return text
            ? h('span', { class: `${cls} year` }, text)
            : h('span', { class: `${cls} is-unrecorded` }, 'dates not recorded');
    }
    const eraOf = p => (p.span ? Store.periodAt(p.span.start) : null);
    const eraStyle = p => { const e = eraOf(p); return e ? { '--era-raw': e.color } : {}; };
    const firstSentence = text => { const m = (text || '').match(/^.*?[.?](?=\s|$)/); return m ? m[0] : (text || ''); };
    const possessive = name => (name.endsWith('s') ? `${name}’` : `${name}’s`);
    const treeHref = p => Router.build('family', [p.slug]);
    const motion = () => !UI.reducedMotion();

    function svg(tag, attrs) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        return el;
    }

    // People whose trees have the most to show: parents, spouses, siblings,
    // children and grandchildren all count. One per household, so the list is
    // not six members of the same family. Computed once.
    let starts = null;
    function startingPoints() {
        if (starts) return starts;
        const ranked = Store.people
            .map(p => ({ p, n: familySize(p) }))
            .filter(x => x.n > 0)
            .sort((a, b) => b.n - a.n || Store.SIG_RANK[a.p.significance] - Store.SIG_RANK[b.p.significance]);
        starts = [];
        const near = new Set();
        for (const { p } of ranked) {
            if (starts.length === 6) break;
            // two "Jacob" chips side by side would read as a mistake
            if (near.has(p) || starts.some(s => s.name === p.name)) continue;
            starts.push(p);
            for (const q of [p, ...Store.parents(p), ...Store.children(p), ...Store.spouses(p), ...Store.siblings(p)]) near.add(q);
        }
        return starts;
    }
    function familySize(p) {
        const kids = Store.children(p);
        return Store.parents(p).length + Store.spouses(p).length + Store.siblings(p).length
            + kids.length + kids.reduce((n, c) => n + Store.children(c).length, 0);
    }
    const hasFamily = p => familySize(p) > 0;

    // ── The two genealogies ─────────────────────────────────────────────
    const Lines = (() => {
        let cache = null;

        function get() {
            if (cache) return cache;
            const end = Store.person(LINE_END);
            const matthew = end ? [...Store.ancestors(end)].reverse().concat(end) : [];
            cache = { matthew, luke: alternate(matthew) };
            return cache;
        }

        // Luke's genealogy enters the data as a second recorded parent: a
        // parent relationship that is not the fatherId/motherId (Joseph's father
        // in Luke is Heli; Shealtiel's is Neri). Climb from the end of the line,
        // preferring that parent wherever one exists, and the ordinary father
        // otherwise. A recorded parent must be born before the child when both
        // have dates, so a stray tie can never turn the line back on itself.
        function recordedParent(p) {
            const usual = Store.parents(p);
            return Store.relations(p, 'child').map(r => r.person).find(q =>
                !usual.includes(q) && (q.birthYear == null || p.birthYear == null || q.birthYear < p.birthYear)) || null;
        }
        function alternate(line) {
            const chain = [], seen = new Set();
            let differs = false;
            for (let cur = line[line.length - 1]; cur && !seen.has(cur); ) {
                seen.add(cur);
                chain.unshift(cur);
                const other = recordedParent(cur);
                differs = differs || !!other;
                cur = other || Store.father(cur) || Store.mother(cur);
            }
            return differs ? describe(chain, line) : null;
        }

        // The stretches of Luke's line that are not Matthew's, each with the
        // shared name it leaves from and the shared name it rejoins at.
        function describe(chain, line) {
            const onLine = new Set(line);
            const runs = [];
            chain.forEach((p, i) => {
                if (onLine.has(p)) return;
                const open = runs[runs.length - 1];
                if (open && open.end === i - 1) { open.end = i; return; }
                runs.push({ start: i, end: i });
            });
            for (const run of runs) {
                run.leaves = chain[run.start - 1] || null;
                run.rejoins = chain[run.end + 1] || null;
            }
            return { chain, onLine, runs };
        }

        // Where a person stands on either line: { version, index } or null.
        function locate(p) {
            const { matthew, luke } = get();
            const i = matthew.indexOf(p);
            if (i >= 0) return { version: 'matthew', index: i };
            const j = luke ? luke.chain.indexOf(p) : -1;
            return j >= 0 ? { version: 'luke', index: j } : null;
        }

        return { get, locate };
    })();

    // ── Person picker (shared by both modes) ────────────────────────────
    const Picker = (() => {
        let input, list, options = [], active = -1;

        function build() {
            const id = 'fam-picker-list';
            input = h('input', {
                class: 'field fam-picker-input', type: 'search', autocomplete: 'off', spellcheck: 'false',
                placeholder: 'Find a person’s family…', role: 'combobox', 'aria-autocomplete': 'list',
                'aria-expanded': 'false', 'aria-controls': id, 'aria-label': 'Find a person’s family tree'
            });
            list = h('ul', { class: 'fam-picker-list', id, role: 'listbox', 'aria-label': 'People', hidden: true });
            input.addEventListener('input', open);
            input.addEventListener('focus', open);
            input.addEventListener('keydown', onKey);
            input.addEventListener('blur', close);
            return h('div', { class: 'fam-picker' }, UI.icon('search', 'fam-picker-icon'), input, list);
        }

        function open() {
            const q = input.value.trim();
            options = q ? Store.search(q, { types: ['person'], limit: 8 }).map(r => r.item) : startingPoints();
            active = -1;
            UI.clear(list);
            if (!q) list.append(h('li', { class: 'fam-picker-head', role: 'presentation' }, 'Fuller families to explore'));
            if (!options.length) list.append(h('li', { class: 'fam-picker-empty', role: 'presentation' }, 'No one by that name'));
            options.forEach((p, i) => list.append(h('li', {
                id: `fam-opt-${i}`, class: 'fam-picker-opt', role: 'option', 'aria-selected': 'false',
                // mousedown, not click: it lands before the input's blur closes the list
                onmousedown: e => { e.preventDefault(); choose(p); }
            },
                h('span', { class: 'chip-dot', style: { '--chip': UI.familyColor(p.role) }, 'aria-hidden': 'true' }),
                h('span', { class: 'fam-picker-name' }, p.name),
                h('span', { class: 'fam-picker-sub' }, q
                    ? [Store.roleLabel(p.role), lifeText(p)].filter(Boolean).join(' · ')
                    : `${familySize(p)} relatives`))));
            list.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            input.removeAttribute('aria-activedescendant');
        }

        function close() {
            list.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
        }

        function setActive(i) {
            active = (i + options.length) % options.length;
            [...list.querySelectorAll('[role=option]')].forEach((li, j) => li.setAttribute('aria-selected', String(j === active)));
            const li = document.getElementById(`fam-opt-${active}`);
            input.setAttribute('aria-activedescendant', li.id);
            li.scrollIntoView({ block: 'nearest' });
        }

        function onKey(e) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (list.hidden) open();
                if (options.length) setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
            } else if (e.key === 'Enter') {
                const p = options[Math.max(active, 0)];
                if (p) { e.preventDefault(); choose(p); }
            } else if (e.key === 'Escape') {
                if (!list.hidden) { e.preventDefault(); close(); } else input.value = '';
            }
        }

        function choose(p) {
            input.value = '';
            close();
            input.blur();
            Router.go(treeHref(p));
        }

        return { build };
    })();

    // ── The line of descent ─────────────────────────────────────────────
    const Line = (() => {
        const READING_LINE = 0.38;    // where "now" sits, as a fraction of the scroller height

        let scroller, introEl, threadEl, endEl;
        let markerNum, markerOf, markerName, markerEra, marker, jump, jumpGen, jumpEra;
        let railList, jumpList;
        let items = [];               // every row of the thread: { el, offset }
        let gens = [];                // generation rows: { person, index, item }
        let landmarks = [];           // { index, els: [rail button, jump button] }
        let chain = [];
        let version = null, lastPath = null, current = -1, raf = 0, reveal = null;

        function init(container) {
            markerNum = h('span', { class: 'fl-marker-num year' });
            markerOf = h('span', { class: 'fl-marker-of year' });
            markerName = h('p', { class: 'fl-marker-name' });
            markerEra = h('p', { class: 'fl-marker-era' });
            marker = h('div', { class: 'fl-marker' },
                h('p', { class: 'eyebrow' }, 'Generation'),
                h('p', { class: 'fl-marker-count' }, markerNum, markerOf),
                markerName, markerEra);
            railList = h('ol', { class: 'fl-lms' });
            const rail = h('aside', { class: 'fl-rail', 'aria-label': 'Where you are on the line' },
                marker,
                h('nav', { class: 'fl-index', 'aria-label': 'Landmarks along the line' },
                    h('p', { class: 'eyebrow' }, 'Landmarks'), railList));

            // Phones: the running marker is a sticky bar that opens the same index.
            jumpGen = h('span', { class: 'fl-jump-gen' });
            jumpEra = h('span', { class: 'fl-jump-era' });
            jumpList = h('ol', { class: 'fl-lms' });
            jump = h('details', { class: 'fl-jump' },
                h('summary', { 'aria-label': 'Jump to a landmark on the line' },
                    h('span', { class: 'fl-jump-dot', 'aria-hidden': 'true' }), jumpGen, jumpEra, UI.icon('chevron-down', 'icon-sm fl-jump-chev')),
                h('nav', { 'aria-label': 'Landmarks along the line' }, jumpList));
            jump.addEventListener('keydown', e => {
                if (e.key === 'Escape' && jump.open) { jump.open = false; jump.querySelector('summary').focus(); }
            });
            document.addEventListener('click', e => { if (jump.open && !jump.contains(e.target)) jump.open = false; });

            introEl = h('header', { class: 'fl-intro' });
            threadEl = h('ol', { class: 'fl-thread' });
            endEl = h('footer', { class: 'fl-end' });
            scroller = h('div', { class: 'fl-scroll' }, jump, introEl, threadEl, endEl);
            scroller.addEventListener('scroll', schedule, { passive: true });

            container.append(rail, scroller);
            const remeasure = () => { if (items.length && measure()) update(); };
            window.addEventListener('resize', UI.debounce(remeasure, 150));
            if (document.fonts) document.fonts.ready.then(remeasure);
        }

        function show(route) {
            const fresh = route.path !== lastPath;     // not, e.g., a return from a detail sheet
            if (fresh) {
                lastPath = route.path;
                const lines = Lines.get();
                const v = route.query.line === 'luke' && lines.luke ? 'luke' : 'matthew';
                if (v !== version) {
                    version = v;
                    render(lines);
                    scroller.scrollTop = 0;
                }
            }
            measure();                                 // always: the window may have changed size while away
            const at = fresh && route.query.at && gens.find(g => g.person.slug === route.query.at);
            if (at) jumpTo(at.index, { smooth: false, focus: false });
            update();
        }

        function hide() {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            jump.open = false;
        }

        // ── Building the procession ──
        function render(lines) {
            chain = version === 'luke' ? lines.luke.chain : lines.matthew;
            renderIntro(lines);
            UI.clear(threadEl);
            items = []; gens = []; current = -1;
            let era = null, side = 0;
            chain.forEach((p, i) => {
                const e = eraOf(p);
                if (e && e !== era) { era = e; push(eraRow(e)); }
                const isEnd = i === chain.length - 1;
                const major = isEnd || p.significance === 'major';
                const item = push(major ? plaqueRow(p, i, isEnd) : genRow(p, i, side));
                if (!major) side ^= 1;
                gens.push({ person: p, index: i, item });
                const next = chain[i + 1];
                if (version === 'luke' && next && lines.luke.onLine.has(p) && !lines.luke.onLine.has(next)) push(junctionRow(next));
            });
            renderEnd();
            renderLandmarks();
            setupReveal();
        }

        function push(el) {
            threadEl.append(el);
            const item = { el, offset: 0 };
            items.push(item);
            return item;
        }

        function renderIntro(lines) {
            const first = chain[0], last = chain[chain.length - 1];
            const years = Time.between(first.span?.start, last.span?.start);
            const rounded = years == null ? null : Math.round(years / 100) * 100;
            UI.append(UI.clear(introEl), [
                h('p', { class: 'eyebrow' }, 'The line of descent'),
                h('h1', { class: 'fl-title' }, `From ${first.name} to `, h('em', {}, last.name)),
                h('p', { class: 'lede' },
                    `${chain.length} generations, one unbroken line${rounded ? ` across some ${Time.years(rounded)}` : ''}, each the child of the one before.`),
                lines.luke ? versionSwitch() : null,
                h('p', { class: 'fl-honest' }, UI.icon('info', 'icon-sm'),
                    h('span', {}, noteText(lines), ' ', h('a', { href: '#/about' }, 'About the dates and sources'), '.'))]);
        }

        function noteText(lines) {
            if (version === 'luke') {
                const { runs } = lines.luke;
                const steps = runs.map(r => `leaves Matthew’s after ${r.leaves.name}${r.rejoins ? ` and rejoins it at ${r.rejoins.name}` : ''}`);
                return `This follows Luke’s names as this data records them.${steps.length ? ` Luke’s line ${steps.join(', then ')}.` : ''}`;
            }
            return 'This follows the genealogy as it is recorded here: Matthew’s line, father to son through Solomon. '
                + 'Luke records a different line from David, through his son Nathan.';
        }

        function versionSwitch() {
            const opt = (v, label, href) => h('a', {
                class: `chip${version === v ? ' is-on' : ''}`, href, 'aria-current': version === v ? 'true' : null
            }, label);
            return h('nav', { class: 'fl-versions', 'aria-label': 'Which genealogy' },
                opt('matthew', 'Matthew’s line', Router.build('family')),
                opt('luke', 'Luke’s line', Router.build('family', [], { line: 'luke' })));
        }

        function eraRow(e) {
            return h('li', { class: 'fl-era', style: { '--era-raw': e.color } },
                h('span', { class: 'fl-era-diamond', 'aria-hidden': 'true' }),
                h('div', { class: 'fl-era-mark' },
                    h('h2', { class: 'fl-era-name' }, e.name),
                    h('p', { class: 'fl-era-years year' }, Time.span(e.startYear, e.endYear))));
        }

        function genRow(p, i, side) {
            return h('li', { class: `fl-gen fl-side-${side ? 'l' : 'r'}`, style: eraStyle(p) },
                h('span', { class: 'fl-num year', 'aria-hidden': 'true' }, i + 1),
                h('span', { class: 'fl-dot', 'aria-hidden': 'true' }),
                h('div', { class: 'fl-card' },
                    h('div', { class: 'fl-text' },
                        h('a', { class: 'fl-name', href: UI.href(p) }, p.name),
                        h('span', { class: 'fl-meta' }, h('span', { class: 'fl-genlabel' }, `Generation ${i + 1} · `), datesEl(p, 'fl-dates'))),
                    h('a', { class: 'icon-btn fl-tree', href: treeHref(p), 'aria-label': `${possessive(p.name)} family tree`, title: 'Family tree' },
                        UI.icon('tree'))));
        }

        function plaqueRow(p, i, isEnd) {
            const life = !isEnd && Store.lifespan(p);
            const role = Store.roleLabel(p.role);
            return h('li', { class: `fl-gen is-major${isEnd ? ' is-end' : ''}`, style: eraStyle(p) },
                h('span', { class: 'fl-dot', 'aria-hidden': 'true' }),
                h('article', { class: 'fl-plaque' },
                    h('p', { class: 'fl-plaque-kicker' },
                        h('span', { class: 'year' }, `Generation ${i + 1}`),
                        role ? h('span', { 'aria-hidden': 'true' }, '·') : null,
                        role ? h('span', {}, role) : null),
                    h('h3', { class: 'fl-plaque-name' }, h('a', { href: UI.href(p) }, p.name)),
                    h('p', { class: 'fl-meta' }, datesEl(p, 'fl-dates'),
                        life ? h('span', { class: 'fl-life' }, `lived ${Time.years(life)}`) : null),
                    p.description ? h('p', { class: 'fl-desc' }, firstSentence(p.description)) : null,
                    h('a', { class: 'fl-plaque-tree', href: treeHref(p) }, UI.icon('tree', 'icon-sm'), `${possessive(p.name)} family tree`)));
        }

        function junctionRow(firstOwn) {
            return h('li', { class: 'fl-note' }, h('p', {}, `Luke’s own names begin here, with ${firstOwn.name}.`));
        }

        function renderEnd() {
            const first = chain[0], last = chain[chain.length - 1];
            const a = first.span?.start, b = last.span?.end;
            const timeline = a != null && b != null ? Router.build('timeline', [], {
                y: Time.fromAxis((Time.toAxis(a) + Time.toAxis(b)) / 2),
                span: Math.round(Time.between(a, b) * 1.08)
            }) : null;
            UI.clear(endEl).append(
                h('div', { class: 'ornament', 'aria-hidden': 'true' }, h('span')),
                h('p', { class: 'fl-end-text' }, `${chain.length} generations, from ${first.name} to ${last.name}.`),
                h('div', { class: 'fl-end-actions' },
                    h('a', { class: 'btn btn-primary', href: treeHref(last) }, UI.icon('tree'), `${possessive(last.name)} family tree`),
                    timeline ? h('a', { class: 'btn', href: timeline }, UI.icon('timeline'), 'See the line on the timeline') : null,
                    h('button', { class: 'btn btn-quiet', type: 'button', onclick: () => jumpTo(0) }, 'Back to the beginning')));
        }

        function renderLandmarks() {
            const marks = gens.filter(g => g.item.el.classList.contains('is-major'));
            landmarks = marks.map(g => ({ index: g.index, els: [] }));
            for (const list of [railList, jumpList]) {
                UI.clear(list);
                marks.forEach((g, k) => {
                    const btn = h('button', {
                        type: 'button', class: 'fl-lm', style: eraStyle(g.person),
                        onclick: () => { jump.open = false; jumpTo(g.index); }
                    },
                        h('span', { class: 'fl-lm-num year' }, g.index + 1),
                        h('span', { class: 'fl-lm-dot', 'aria-hidden': 'true' }),
                        h('span', { class: 'fl-lm-name' }, g.person.name));
                    list.append(h('li', {}, btn));
                    landmarks[k].els.push(btn);
                });
            }
        }

        // Rows fade up as they enter; the thread itself is always whole.
        function setupReveal() {
            if (reveal) reveal.disconnect();
            if (!motion() || !('IntersectionObserver' in window)) {
                for (const it of items) it.el.classList.add('is-in');
                return;
            }
            reveal = new IntersectionObserver(entries => {
                for (const en of entries) {
                    if (!en.isIntersecting) continue;
                    en.target.classList.add('is-in');
                    reveal.unobserve(en.target);
                }
            }, { root: scroller, rootMargin: '0px 0px -4% 0px' });
            for (const it of items) reveal.observe(it.el);
        }

        // ── Scroll position → running marker and the lit thread ──
        // Returns false, keeping the old offsets, while the view is hidden: with no layout
        // box every row would measure 0 and the whole line would read as passed.
        function measure() {
            if (!scroller.getClientRects().length) return false;
            const origin = scroller.getBoundingClientRect().top - scroller.scrollTop;
            for (const it of items) it.offset = it.el.getBoundingClientRect().top - origin;
            return true;
        }

        function schedule() {
            if (!raf) raf = requestAnimationFrame(update);
        }

        function update() {
            raf = 0;
            if (!gens.length) return;
            const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
            const line = scroller.scrollTop + scroller.clientHeight * READING_LINE;
            for (const it of items) it.el.classList.toggle('is-lit', atEnd || it.offset <= line);
            let cur = 0;
            for (const g of gens) { if (g.item.offset <= line) cur = g.index; else break; }
            if (atEnd) cur = gens[gens.length - 1].index;
            if (cur !== current) setCurrent(cur);
        }

        function setCurrent(i) {
            if (current >= 0) gens[current].item.el.classList.remove('is-current');
            current = i;
            const { person, item } = gens[i];
            item.el.classList.add('is-current');
            const era = eraOf(person);
            for (const el of [marker, jump]) {
                if (era) el.style.setProperty('--era-raw', era.color); else el.style.removeProperty('--era-raw');
            }
            markerNum.textContent = i + 1;
            markerOf.textContent = ` of ${chain.length}`;
            markerName.textContent = person.name;
            markerEra.textContent = era ? era.name : '';
            jumpGen.textContent = `Generation ${i + 1} · ${person.name}`;
            jumpEra.textContent = era ? era.name : '';
            const active = landmarks.filter(l => l.index <= i).pop();
            for (const l of landmarks) for (const el of l.els) el.classList.toggle('is-active', l === active);
        }

        function jumpTo(i, { smooth = true, focus = true } = {}) {
            const g = gens[i];
            if (!g) return;
            const top = i === 0 ? 0 : g.item.offset - scroller.clientHeight * READING_LINE + 24;
            scroller.scrollTo({ top: Math.max(0, top), behavior: smooth && motion() ? 'smooth' : 'auto' });
            if (focus) g.item.el.querySelector('a').focus({ preventScroll: true });
        }

        return { init, show, hide, title: () => { const c = Lines.get().matthew; return c.length ? `From ${c[0].name} to ${c[c.length - 1].name}` : 'Line of descent'; } };
    })();

    // ── A person's tree ─────────────────────────────────────────────────
    const Tree = (() => {
        // World units are CSS pixels at zoom 1. The centred person sits at 0,0.
        const SIZE = {
            centre: { w: 256, h: 164 },
            node: { w: 184, h: 78 },
            spouse: { w: 184, h: 64 },
            small: { w: 160, h: 58 },
            more: { w: 132, h: 44 },
            earlier: { w: 184, h: 48 }
        };
        const NODE_PAD = 29;           // the node's left and right padding
        const GAP_ROW = 64, GAP_COL = 20, GAP_PAIR = 36, GAP_SIDE = 56, GAP_SIB = 14, GAP_STACK = 10, INDENT = 30;
        const LIMIT = { children: 8, grandchildren: 3, siblings: 4 };
        const MAX_UP = 3;
        const DURATION = 520;
        const FOOT_ROOM = 76;          // the legend and controls sit over the bottom of the canvas

        let el, viewport, world, linkLayer, labelLayer, nodeLayer, emptyEl, footEl, controlsEl;
        let zoom, transform;
        let current = null, shownSlug = null, layout = null;
        let expanded = new Set();
        let els = new Map(), positions = new Map();
        let linkTimer = 0;
        let centreH = SIZE.centre.h;   // grows with a two-line name; set for each layout

        // A long name wraps to a second line; the node grows by that line so
        // nothing is clipped, and the layout reads the grown height. Measured on
        // a canvas with the name's own font, since layout runs before the DOM.
        const NAME = { node: { px: 15.5, lead: 1.16 }, quiet: { px: 14, lead: 1.16 }, centre: { px: 27.2, lead: 1.04 } };
        let measurer = null;
        function nameExtra(name, kind, width) {
            const f = kind === 'centre' ? NAME.centre : kind === 'sibling' || kind === 'grandchild' ? NAME.quiet : NAME.node;
            measurer = measurer || document.createElement('canvas').getContext('2d');
            measurer.font = `${f.px}px ${getComputedStyle(document.body).getPropertyValue('--font-display') || 'serif'}`;
            const room = (width - (kind === 'centre' ? 36 : NODE_PAD)) / 1.06;       // a margin for font-loading differences
            let lines = 1, used = 0;
            for (const word of name.split(' ')) {
                const w = measurer.measureText(word).width, space = measurer.measureText(' ').width;
                if (used && used + space + w > room) { lines++; used = w; } else used += (used ? space : 0) + w;
            }
            return (Math.min(lines, 2) - 1) * f.px * f.lead;
        }
        const fit = (person, kind, size) => ({ w: size.w, h: size.h + nameExtra(person.name, kind, size.w) });

        const ancestorY = depth => -(centreH / 2 + GAP_ROW + SIZE.node.h / 2) - (depth - 1) * (SIZE.node.h + GAP_ROW);
        const childY = () => centreH / 2 + GAP_ROW + SIZE.node.h / 2;
        const topOf = n => ({ x: n.x, y: n.y - n.h / 2 });
        const bottomOf = n => ({ x: n.x, y: n.y + n.h / 2 });

        function init(container) {
            el = container;
            transform = d3.zoomIdentity;
            linkLayer = svg('svg', { class: 'ft-links', 'aria-hidden': 'true' });
            labelLayer = h('div', { class: 'ft-labels', 'aria-hidden': 'true' });
            nodeLayer = h('div', { class: 'ft-nodes' });
            world = h('div', { class: 'ft-world' }, h('div', { class: 'ft-halo', 'aria-hidden': 'true' }), linkLayer, labelLayer, nodeLayer);
            viewport = h('div', { class: 'ft-viewport', role: 'region', 'aria-label': 'Family tree. Drag to move, scroll or pinch to zoom, arrow keys to move between relatives.' }, world);
            controlsEl = h('div', { class: 'ft-controls', role: 'group', 'aria-label': 'Zoom' },
                h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zoom in', onclick: () => zoomBy(1.3) }, UI.icon('plus')),
                h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zoom out', onclick: () => zoomBy(1 / 1.3) }, UI.icon('minus')),
                h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Recentre the tree', title: 'Recentre', onclick: () => home(true) }, UI.icon('fit')));
            footEl = h('div', { class: 'ft-foot' });
            emptyEl = h('div', { class: 'ft-empty', hidden: true });
            container.append(viewport, footEl, controlsEl, emptyEl);

            zoom = d3.zoom()
                .scaleExtent([0.3, 1.8])
                .on('zoom', e => {
                    transform = e.transform;
                    world.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
                });
            d3.select(viewport).call(zoom).on('dblclick.zoom', null);

            nodeLayer.addEventListener('keydown', onKey);
            nodeLayer.addEventListener('focusin', e => { const n = nodeFor(e.target); if (n) ensureVisible(n); });
            // Focus can make the browser scroll an overflow:hidden box; the camera owns position.
            viewport.addEventListener('scroll', () => { viewport.scrollTop = 0; viewport.scrollLeft = 0; });
        }

        function show(slug, animate) {
            if (slug === shownSlug) return;
            shownSlug = slug;
            const hadFocus = el.contains(document.activeElement);
            const p = Store.person(slug);
            if (!p || !hasFamily(p)) { showEmpty(p); return; }

            setCanvasHidden(false);
            const moving = animate && current != null && motion();
            if (p !== current) expanded = new Set();
            current = p;
            render(moving);
            home(moving);
            renderFoot();
            if (hadFocus) focusTarget(layout.nodes[0]).focus({ preventScroll: true });
        }

        function hide() {
            d3.select(viewport).interrupt();
        }

        function setCanvasHidden(hidden) {
            viewport.hidden = hidden;
            footEl.hidden = hidden;
            controlsEl.hidden = hidden;
            emptyEl.hidden = !hidden;
        }

        // ── Layout ──
        function build(c) {
            const nodes = [], paths = [], labels = [];
            const used = new Set();
            const add = (person, kind, x, y, size, extra = {}) => {
                let key = person ? `p${person.id}` : extra.key;
                if (used.has(key)) key = `${key}-${kind}`;      // the same person in two places
                used.add(key);
                const n = { key, person, kind, x, y, w: size.w, h: size.h, ...extra };
                nodes.push(n);
                return n;
            };
            const curve = (a, b, cls = '') => {
                const my = (a.y + b.y) / 2;
                paths.push({ d: `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`, cls });
            };
            const label = (text, x, y, align = 'center') => labels.push({ text, x, y, align });

            centreH = SIZE.centre.h + nameExtra(c.name, 'centre', SIZE.centre.w);
            const centre = add(c, 'centre', 0, 0, { w: SIZE.centre.w, h: centreH }, { row: 0 });

            // Ancestors: a pedigree. Each couple sits symmetrically over their
            // child, just far enough apart that the two sides' own ancestry
            // cannot collide. `left`/`right` are a subtree's reach from its node.
            function pedigree(p, depth) {
                const parents = depth < MAX_UP ? Store.parents(p).map(q => pedigree(q, depth + 1)) : [];
                const half = SIZE.node.w / 2;
                let offset = 0, left = half, right = half;
                if (parents.length === 1) {
                    left = Math.max(half, parents[0].left);
                    right = Math.max(half, parents[0].right);
                } else if (parents.length === 2) {
                    const [f, m] = parents;
                    offset = (f.right + m.left + GAP_PAIR) / 2;
                    left = Math.max(half, offset + f.left);
                    right = Math.max(half, offset + m.right);
                }
                return { person: p, depth, parents, offset, left, right };
            }
            function placeParents(t, child, gold) {
                if (!t.parents.length) return null;
                const lineParent = Store.father(t.person) || Store.mother(t.person);
                const placed = t.parents.map((q, i) => {
                    const x = child.x + (t.parents.length === 2 ? (i ? 1 : -1) * t.offset : 0);
                    const onThread = gold && q.person === lineParent;
                    const isFather = q.person === Store.father(t.person);
                    const n = add(q.person, 'ancestor', x, ancestorY(q.depth), fit(q.person, 'ancestor', SIZE.node), {
                        row: -q.depth, label: kinLabel(q.depth, isFather), gold: onThread, down: child
                    });
                    const anchor = placeParents(q, n, onThread);
                    if (anchor) curve(anchor, topOf(n), onThread ? 'gold' : '');
                    else if (q.depth === MAX_UP && Store.parents(q.person).length) earlier(n);
                    return n;
                });
                if (placed.length === 1) return bottomOf(placed[0]);
                const [f, m] = placed;
                const mid = (f.x + f.w / 2 + m.x - m.w / 2) / 2;
                paths.push({ d: `M${f.x + f.w / 2},${f.y} H${mid}`, cls: f.gold ? 'gold' : 'pair' });
                paths.push({ d: `M${mid},${m.y} H${m.x - m.w / 2}`, cls: m.gold ? 'gold' : 'pair' });
                return { x: mid, y: f.y };
            }
            // Above the top of the pedigree: a way further up the line.
            function earlier(n) {
                const line = Store.ancestors(n.person);
                const y = n.y - n.h / 2 - 28 - SIZE.earlier.h / 2;
                const pill = add(null, 'earlier', n.x, y, SIZE.earlier, {
                    key: `earlier-${n.person.id}`, row: n.row - 1, target: n.person, count: line.length, first: line[line.length - 1], down: n
                });
                paths.push({ d: `M${n.x},${pill.y + pill.h / 2} V${n.y - n.h / 2}`, cls: 'more' });
            }
            const parentAnchor = placeParents(pedigree(c, 0), centre, true);
            if (parentAnchor) curve(parentAnchor, topOf(centre), 'gold');

            // Siblings: to the left, in birth order, ending beside the centre.
            const sib = collapse(Store.siblings(c), LIMIT.siblings, 'siblings');
            let x = -(SIZE.centre.w / 2 + GAP_SIDE) - SIZE.small.w / 2;
            const sibNodes = [];
            for (let i = sib.shown.length - 1; i >= 0; i--) {
                sibNodes.unshift(add(sib.shown[i], 'sibling', x, 0, fit(sib.shown[i], 'sibling', SIZE.small), { row: 0 }));
                x -= SIZE.small.w + GAP_SIB;
            }
            if (sib.hidden) {
                sibNodes.unshift(add(null, 'more', x + SIZE.small.w / 2 - SIZE.more.w / 2, 0, SIZE.more, {
                    key: 'more-siblings', group: 'siblings', count: sib.hidden, row: 0, what: 'siblings'
                }));
            }
            if (sibNodes.length) {
                const barY = -centreH / 2 - 22;
                for (const s of sibNodes) {
                    if (parentAnchor) curve(parentAnchor, topOf(s), s.kind === 'more' ? 'more' : '');
                    // No parents recorded: siblings hang from a bar to the centre.
                    else paths.push({ d: `M${s.x},${s.y - s.h / 2} V${barY + 12} Q${s.x},${barY} ${s.x + 12},${barY} H-12 Q0,${barY} 0,${barY + 12} V${-centreH / 2}`, cls: 'pair' });
                }
                const leftmost = sibNodes[0];
                label(sibNodes.length > 1 ? 'Siblings' : 'Sibling', leftmost.x - leftmost.w / 2, leftmost.y + leftmost.h / 2 + 16, 'left');
            }

            // Spouses: stacked to the right, joined by a brace.
            const sps = Store.spouses(c);
            const spX = SIZE.centre.w / 2 + GAP_SIDE + SIZE.spouse.w / 2;
            const pitch = Math.max(SIZE.spouse.h, ...sps.map(s => fit(s, 'spouse', SIZE.spouse).h)) + GAP_STACK;
            sps.forEach((s, i) => {
                const y = (i - (sps.length - 1) / 2) * pitch;
                const n = add(s, 'spouse', spX, y, fit(s, 'spouse', SIZE.spouse), { row: 0 });
                const a = SIZE.centre.w / 2, b = n.x - n.w / 2, m = a + GAP_SIDE / 2;
                paths.push({ d: `M${a},0 C${m},0 ${m},${y} ${b},${y}`, cls: 'pair' });
            });
            if (sps.length) {
                const topY = (-(sps.length - 1) / 2) * pitch - (pitch - GAP_STACK) / 2;
                label(sps.length > 1 ? 'Spouses' : 'Spouse', spX - SIZE.spouse.w / 2, topY - 14, 'left');
            }

            // Children in a row below; each child's own children stacked under it.
            const kids = collapse(Store.children(c), LIMIT.children, 'children');
            const cols = kids.shown.length + (kids.hidden ? 1 : 0);
            const colW = SIZE.node.w + GAP_COL;
            const colX = i => (i - (cols - 1) / 2) * colW;
            kids.shown.forEach((k, i) => {
                const n = add(k, 'child', colX(i), childY(), fit(k, 'child', SIZE.node), { row: 1, up: centre, down: null });
                curve(bottomOf(centre), topOf(n));
                grandchildren(n);
            });
            if (kids.hidden) {
                const n = add(null, 'more', colX(cols - 1), childY(), SIZE.more, {
                    key: 'more-children', group: 'children', count: kids.hidden, row: 1, up: centre, what: 'children'
                });
                curve(bottomOf(centre), topOf(n), 'more');
            }
            if (cols) label(cols > 1 ? 'Children' : 'Child', colX(0) - SIZE.node.w / 2, childY() - SIZE.node.h / 2 - 14, 'left');

            function grandchildren(child) {
                const list = collapse(Store.children(child.person), LIMIT.grandchildren, `gc-${child.person.id}`);
                const left = child.x - child.w / 2, rail = left + 14, w = child.w - INDENT;
                let y = child.y + child.h / 2 + 18, prev = child;
                const rows = list.shown.concat(list.hidden ? [null] : []);
                rows.forEach((g, j) => {
                    const size = g ? fit(g, 'grandchild', { w, h: SIZE.small.h }) : { w, h: SIZE.more.h };
                    const cy = y + size.h / 2;
                    y += size.h + GAP_STACK;
                    const n = g
                        ? add(g, 'grandchild', left + INDENT + w / 2, cy, size, { row: 2 + j, up: prev, down: null })
                        : add(null, 'more', left + INDENT + w / 2, cy, size, {
                            key: `more-gc-${child.person.id}`, group: `gc-${child.person.id}`, count: list.hidden,
                            row: 2 + j, up: prev, down: null, what: `grandchildren through ${child.person.name}`
                        });
                    prev.down = n;
                    prev = n;
                    paths.push({ d: `M${rail},${child.y + child.h / 2} V${cy - 10} Q${rail},${cy} ${rail + 10},${cy} H${left + INDENT}`, cls: g ? '' : 'more' });
                });
            }

            const parentsShown = nodes.filter(n => n.kind === 'ancestor' && n.down === centre);
            centre.up = parentsShown.find(n => n.gold) || parentsShown[0] || null;
            centre.down = nodes.find(n => n.row === 1 && Math.abs(n.x) < colW / 2) || nodes.find(n => n.row === 1) || null;

            const bounds = nodes.reduce((b, n) => ({
                x0: Math.min(b.x0, n.x - n.w / 2), x1: Math.max(b.x1, n.x + n.w / 2),
                y0: Math.min(b.y0, n.y - n.h / 2), y1: Math.max(b.y1, n.y + n.h / 2)
            }), { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
            // gold paths last so the thread is drawn over the hairlines it crosses
            paths.sort((a, b) => (a.cls === 'gold') - (b.cls === 'gold'));
            return { nodes, paths, labels, bounds };
        }

        function kinLabel(depth, isFather) {
            const base = isFather ? 'father' : 'mother';
            if (depth === 1) return isFather ? 'Father' : 'Mother';
            const great = 'Great-'.repeat(Math.max(0, depth - 2));
            return `${great}${great ? 'grand' : 'Grand'}${base}`;
        }

        // Large broods show the most significant few (kept in birth order) behind '+N more'.
        function collapse(list, limit, group) {
            if (expanded.has(group) || list.length <= limit + 1) return { shown: list, hidden: 0 };
            const keep = new Set(list.slice()
                .sort((a, b) => Store.SIG_RANK[a.significance] - Store.SIG_RANK[b.significance])
                .slice(0, limit));
            return { shown: list.filter(p => keep.has(p)), hidden: list.length - limit };
        }

        // ── Drawing ──
        const REL = { spouse: 'Spouse', sibling: 'Sibling', child: 'Child', grandchild: 'Grandchild' };

        function nodeEl(n) {
            const style = { width: `${n.w}px`, height: `${n.h}px` };
            if (n.kind === 'centre') return centreEl(n, style);
            if (n.kind === 'more') {
                return h('button', {
                    type: 'button', class: 'ft-node ft-more', style, 'aria-label': `Show ${n.count} more ${n.what}`,
                    onclick: () => { expanded.add(n.group); render(motion()); }
                }, UI.icon('plus', 'icon-sm'), `${n.count} more`);
            }
            if (n.kind === 'earlier') {
                return h('a', {
                    class: 'ft-node ft-earlier', href: treeHref(n.target), draggable: 'false', style,
                    'aria-label': `${n.count} earlier ${n.count === 1 ? 'generation' : 'generations'}, back to ${n.first.name}. Show ${possessive(n.target.name)} family.`
                }, UI.icon('chevron-down', 'icon-sm ft-up'), h('span', {}, `${n.count} earlier ${n.count === 1 ? 'generation' : 'generations'}`));
            }
            const p = n.person;
            const rel = n.label || REL[n.kind];
            return h('a', {
                class: `ft-node ft-${n.kind}${n.gold ? ' is-gold' : ''}`, href: treeHref(p), draggable: 'false',
                style: { ...style, '--role': UI.familyColor(p.role), ...eraStyle(p) },
                title: p.name,
                'aria-label': `${rel}: ${p.name}, ${lifeText(p) || 'dates not recorded'}. Show ${possessive(p.name)} family.`
            },
                n.label ? h('span', { class: 'ft-rel' }, n.label) : null,
                h('span', { class: 'ft-name' }, p.name),
                datesEl(p, 'ft-dates'));
        }

        function centreEl(n, style) {
            const p = n.person;
            // "Patriarch · Patriarchs" says one thing twice; keep the era only when it adds something.
            const role = Store.roleLabel(p.role), era = eraOf(p)?.name;
            const kicker = [role, era && !(role && era.startsWith(role)) ? era : null].filter(Boolean).join(' · ');
            return h('div', { class: 'ft-node ft-centre', style: { ...style, ...eraStyle(p) } },
                kicker ? h('p', { class: 'ft-centre-kicker', title: kicker }, kicker) : null,
                h('h2', { class: 'ft-centre-name' }, p.name),
                datesEl(p, 'ft-dates'),
                h('a', { class: 'btn btn-sm ft-about', href: UI.href(p), draggable: 'false', 'aria-label': `About ${p.name}` },
                    'About', UI.icon('arrow-right', 'icon-sm')));
        }

        const place = (n, x, y) => `translate(${x - n.w / 2}px, ${y - n.h / 2}px)`;
        const focusTarget = n => (n.kind === 'centre' ? n.el.querySelector('a') : n.el);
        const nodeFor = target => layout && layout.nodes.find(n => n.el === target || n.el.contains(target));

        // Re-render, gliding people who stay on screen from where they were.
        function render(animate) {
            layout = build(current);
            const old = els;
            els = new Map();
            const moving = [];
            for (const n of layout.nodes) {
                const node = nodeEl(n);
                const to = place(n, n.x, n.y);
                const from = animate ? positions.get(n.key) : null;
                if (from) {
                    node.style.transform = place(n, from.x, from.y);
                    moving.push([node, to]);
                } else {
                    node.style.transform = to;
                    if (animate) { node.classList.add('is-arriving'); moving.push([node, to]); }
                }
                if (old.has(n.key)) { old.get(n.key).remove(); old.delete(n.key); }
                nodeLayer.append(node);
                els.set(n.key, node);
                n.el = node;
            }
            for (const gone of old.values()) {
                gone.classList.add('is-leaving');
                gone.inert = true;
                setTimeout(() => gone.remove(), 260);
            }
            if (moving.length) {
                nodeLayer.getBoundingClientRect();     // commit the start positions before moving
                for (const [node, to] of moving) { node.style.transform = to; node.classList.remove('is-arriving'); }
            }
            positions = new Map(layout.nodes.map(n => [n.key, { x: n.x, y: n.y }]));
            drawDecor(animate);
        }

        function drawDecor(animate) {
            clearTimeout(linkTimer);
            UI.clear(linkLayer);
            for (const p of layout.paths) {
                if (p.cls === 'gold') linkLayer.append(svg('path', { d: p.d, class: 'ft-link is-glow' }));
                linkLayer.append(svg('path', { d: p.d, class: `ft-link${p.cls ? ` is-${p.cls}` : ''}` }));
            }
            UI.clear(labelLayer);
            for (const l of layout.labels) {
                labelLayer.append(h('span', {
                    class: `ft-label is-${l.align}`,
                    style: { transform: `translate(${l.x}px, ${l.y}px)` }
                }, l.text));
            }
            if (!animate) return;
            // Connectors would cut across moving nodes; bring them in once everything lands.
            linkLayer.classList.add('is-hidden');
            labelLayer.classList.add('is-hidden');
            linkTimer = setTimeout(() => {
                linkLayer.classList.remove('is-hidden');
                labelLayer.classList.remove('is-hidden');
            }, DURATION * 0.75);
        }

        function renderFoot() {
            const at = Lines.locate(current);
            const { matthew } = Lines.get();
            UI.append(UI.clear(footEl), [
                h('span', { class: 'ft-legend' }, h('span', { class: 'ft-legend-line', 'aria-hidden': 'true' }), 'Line of descent'),
                at && matthew.length ? h('a', {
                    class: 'ft-online',
                    href: Router.build('family', [], { line: at.version === 'luke' ? 'luke' : null, at: current.slug })
                }, h('span', {}, `Generation ${at.index + 1} on the line`,
                    h('span', { class: 'ft-online-long' }, ` from ${matthew[0].name} to ${matthew[matthew.length - 1].name}`)),
                    UI.icon('arrow-right', 'icon-sm')) : null,
                h('span', { class: 'ft-hint' }, 'Drag to move · scroll to zoom · arrow keys to walk the family')]);
        }

        function showEmpty(p) {
            current = null;
            setCanvasHidden(true);
            const suggestions = h('div', { class: 'chip-row ft-empty-chips' },
                startingPoints().map(s => h('a', { class: 'chip', href: treeHref(s), style: { '--chip': UI.familyColor(s.role) } },
                    h('span', { class: 'chip-dot', 'aria-hidden': 'true' }), s.name,
                    h('span', { class: 'chip-sub' }, `${familySize(s)} relatives`))));
            UI.clear(emptyEl).append(h('div', { class: 'ft-empty-card rise' },
                h('span', { class: 'ft-empty-mark', 'aria-hidden': 'true' }, UI.icon('tree', 'icon-lg')),
                p ? h('p', { class: 'eyebrow' }, 'Family tree') : null,
                h('h2', { class: 'ft-empty-title' }, p ? p.name : 'No one by that name'),
                p ? datesEl(p, 'ft-empty-dates') : null,
                h('p', { class: 'ft-empty-text' }, p
                    ? `No parents, spouse, siblings or children are recorded for ${p.name} in this data. Scripture often names a person without their family.`
                    : 'That person is not in the data. Try the search above, or start from one of these families.'),
                p ? h('a', { class: 'btn', href: UI.href(p) }, `About ${p.name}`, UI.icon('arrow-right', 'icon-sm')) : null,
                h('p', { class: 'eyebrow ft-empty-sub' }, 'Fuller families to explore'),
                suggestions));
        }

        // ── Camera ──
        // Fit the whole tree when it fits; otherwise frame it while keeping the
        // centred person comfortably inside the view.
        function homeTransform() {
            const vw = viewport.clientWidth, vh = viewport.clientHeight - FOOT_ROOM, pad = 28;
            const b = layout.bounds;
            const fit = Math.min((vw - pad * 2) / (b.x1 - b.x0), (vh - pad * 2) / (b.y1 - b.y0));
            const k = Math.min(1, Math.max(fit, UI.isMobile() ? 0.62 : 0.5));
            const frame = (lo, hi, view, size) => {
                const room = (view / 2 - pad) / k - size / 2;
                return Math.max(-room, Math.min(room, (lo + hi) / 2));
            };
            const cx = frame(b.x0, b.x1, vw, SIZE.centre.w), cy = frame(b.y0, b.y1, vh, centreH);
            return d3.zoomIdentity.translate(vw / 2 - cx * k, vh / 2 - cy * k).scale(k);
        }

        function home(animate) {
            if (!layout) return;
            const sel = d3.select(viewport);
            if (animate && motion()) sel.transition().duration(DURATION).ease(d3.easeCubicOut).call(zoom.transform, homeTransform());
            else sel.interrupt().call(zoom.transform, homeTransform());
        }

        function zoomBy(factor) {
            const sel = d3.select(viewport);
            if (motion()) sel.transition().duration(280).call(zoom.scaleBy, factor);
            else sel.call(zoom.scaleBy, factor);
        }

        function ensureVisible(n) {
            const { k } = transform;
            const sx = transform.x + n.x * k, sy = transform.y + n.y * k;
            const mx = (n.w / 2) * k + 24, my = (n.h / 2) * k + 24;
            const vw = viewport.clientWidth, vh = viewport.clientHeight - FOOT_ROOM;
            const dx = sx - mx < 0 ? mx - sx : sx + mx > vw ? vw - (sx + mx) : 0;
            const dy = sy - my < 0 ? my - sy : sy + my > vh ? vh - (sy + my) : 0;
            if (!dx && !dy) return;
            const sel = d3.select(viewport);
            if (motion()) sel.transition().duration(280).call(zoom.translateBy, dx / k, dy / k);
            else sel.call(zoom.translateBy, dx / k, dy / k);
        }

        // ── Keyboard: arrows walk between relatives ──
        function onKey(e) {
            const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
            if (!dir || !layout) return;
            const from = nodeFor(document.activeElement);
            if (!from) return;
            e.preventDefault();
            const to = neighbour(from, dir);
            if (to) focusTarget(to).focus({ preventScroll: true });
        }

        function neighbour(n, dir) {
            const nodes = layout.nodes;
            if (dir === 'left' || dir === 'right') {
                const row = nodes.filter(m => m.row === n.row).sort((a, b) => a.x - b.x || a.y - b.y);
                return row[row.indexOf(n) + (dir === 'left' ? -1 : 1)] || null;
            }
            // explicit links (null included) win: Down from a childless child stays put
            if (n[dir] !== undefined) return n[dir];
            const row = n.row + (dir === 'up' ? -1 : 1);
            return nodes.filter(m => m.row === row).sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x))[0] || null;
        }

        return { init, show, hide, get person() { return current; } };
    })();

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        lineLink = h('a', { class: 'fam-switch-opt', href: Router.build('family') }, UI.icon('scroll', 'icon-sm'), 'Line of descent');
        treeLink = h('a', { class: 'fam-switch-opt', href: '#/family' }, UI.icon('tree', 'icon-sm'), 'Family tree');
        lineEl = h('div', { class: 'fl', hidden: true });
        treeEl = h('div', { class: 'ft', hidden: true });
        root = h('div', { class: 'fam' },
            h('div', { class: 'fam-bar' },
                h('nav', { class: 'fam-switch', 'aria-label': 'Family view' }, lineLink, treeLink),
                Picker.build()),
            h('div', { class: 'fam-body' }, lineEl, treeEl));
        el.append(root);
        Line.init(lineEl);
        Tree.init(treeEl);
    }

    function show(route) {
        const slug = route.parts[0] || null;
        const mode = slug ? 'tree' : 'line';
        const wasTree = root.dataset.mode === 'tree';
        root.dataset.mode = mode;
        if (slug) lastTreeSlug = slug;
        lineEl.hidden = mode !== 'line';
        treeEl.hidden = mode !== 'tree';

        const target = Store.person(lastTreeSlug) || startingPoints()[0];
        treeLink.href = target ? treeHref(target) : '#/family';
        for (const [link, m] of [[lineLink, 'line'], [treeLink, 'tree']]) {
            if (m === mode) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
        }

        if (mode === 'line') Line.show(route);
        else Tree.show(slug, wasTree);
    }

    function hide() {
        Line.hide();
        Tree.hide();
    }

    function title(route) {
        const slug = route.parts[0];
        if (!slug) return Line.title();
        const p = Store.person(slug);
        return p ? `The family of ${p.name}` : 'Family tree';
    }

    App.registerView('family', { init, show, hide, title });
    return {};
})();

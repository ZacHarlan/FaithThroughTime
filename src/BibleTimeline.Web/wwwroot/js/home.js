// home.js — the opening. A hero over a living band of history, today's
// discovery, the ways in, and the eras as chapters. Every number, name and
// shape on this page is computed from Store, so it stays true as the data
// is corrected. Nothing here is needed by other modules, so it defines no global.
(() => {
    const { h } = UI;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    let root = null;
    let backdrop = null;

    function init(el) {
        root = el;
        el.setAttribute('aria-label', 'Home');
        const scale = eraScale();
        const all = majorPairs();
        const pairs = notablePairs(all);
        el.append(h('div', { class: 'home' },
            hero(),
            discoverySection(pairs),
            waysIn(scale, previewPair(all)),
            erasSection(),
            footer()));
        backdrop = Backdrop(el.querySelector('.home-hero'), el, scale);
        App.on('theme', () => backdrop.repaint());
        setupReveals(el);
    }

    function show() { backdrop.play(); }
    function hide() { backdrop.pause(); }

    // ── Shared helpers ──────────────────────────────────────────────────
    // CSS custom properties cannot be set through Object.assign(el.style),
    // so views that tint elements by data set them here.
    function vars(el, map) {
        for (const [k, v] of Object.entries(map)) el.style.setProperty(k, v);
        return el;
    }
    function svg(tag, attrs, ...kids) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
        el.append(...kids);
        return el;
    }
    const count = n => n.toLocaleString('en-US');
    const plural = (n, one, many) => `${count(n)} ${n === 1 ? one : many}`;
    const clamp01 = v => Math.max(0, Math.min(1, v));

    // Eras differ wildly in length: the first spans two millennia, another
    // only a few decades. Giving each a width proportional to the square root
    // of its length keeps the short, crowded eras legible without hiding how
    // long the long ones were. Returns year → 0..1.
    function eraScale() {
        const eras = Store.periods;
        if (!eras.length) {
            const total = Time.between(Time.MIN, Time.MAX);
            return { segs: [], at: y => clamp01(Time.between(Time.MIN, y) / total) };
        }
        const weights = eras.map(p => Math.sqrt(Math.max(1, Time.between(p.startYear, p.endYear))));
        const total = weights.reduce((a, b) => a + b, 0);
        let acc = 0;
        const segs = eras.map((p, i) => {
            const from = acc / total;
            acc += weights[i];
            return { period: p, from, to: acc / total };
        });
        function at(year) {
            const s = segs.find(seg => year < seg.period.endYear) || segs[segs.length - 1];
            const t = clamp01(Time.between(s.period.startYear, year) / Math.max(1, Time.between(s.period.startYear, s.period.endYear)));
            return s.from + t * (s.to - s.from);
        }
        return { segs, at };
    }

    // "Six thousand", from the years the timeline actually spans.
    function spanInWords() {
        const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const thousands = Math.floor(Time.between(Time.MIN, Time.MAX) / 1000);
        return WORDS[thousands] ? `${WORDS[thousands]} thousand` : count(thousands * 1000);
    }

    // ── Hero ────────────────────────────────────────────────────────────
    function hero() {
        const stats = [
            [Store.people.length, 'people'],
            [Store.events.length, 'events'],
            [Store.locations.length, 'places'],
            [Time.between(Time.MIN, Time.MAX), 'years']
        ];
        return h('section', { class: 'home-hero', 'aria-labelledby': 'home-title' },
            h('canvas', { class: 'home-sky', 'aria-hidden': 'true' }),
            h('div', { class: 'home-hero-inner' },
                h('p', { class: 'eyebrow home-eyebrow' }, 'From Creation to today'),
                h('h1', { class: 'display hero-type home-title', id: 'home-title' },
                    `${spanInWords()} years. `, h('em', null, 'One story.')),
                h('p', { class: 'lede home-lede' },
                    'The people and events of the Bible, and of the church that followed, set in their places on one timeline — so you can see who lived when, whose lives overlapped, and how it all connects.'),
                h('div', { class: 'home-actions' },
                    h('a', { class: 'btn btn-primary home-btn', href: Router.build('story', ['the-whole-story', 1]) },
                        UI.icon('play', 'icon-sm'), 'Begin the story'),
                    h('a', { class: 'btn home-btn', href: '#/timeline' }, 'Explore the timeline', UI.icon('arrow-right', 'icon-sm')))),
            h('dl', { class: 'home-stats' },
                stats.map(([n, label]) => h('div', { class: 'home-stat' },
                    h('dt', null, label),
                    h('dd', { class: 'num' }, count(n))))),
            h('button', {
                class: 'icon-btn home-cue', type: 'button', 'aria-label': 'Scroll to today’s discovery',
                onclick: () => root.scrollTo({
                    top: root.querySelector('.home-hero').offsetHeight,
                    behavior: UI.reducedMotion() ? 'auto' : 'smooth'
                })
            }, UI.icon('chevron-down')));
    }

    // The living backdrop: every era as a soft wash of its colour, every
    // dated life as a hair-thin thread, every event as a point of light.
    // It draws itself in once, then a slow glint travels along the threads.
    // The finished picture is painted once to an offscreen canvas; each
    // frame only composites it, so the loop stays cheap.
    function Backdrop(host, view, scale) {
        const canvas = host.querySelector('.home-sky');
        const ctx = canvas.getContext('2d');
        const scene = document.createElement('canvas');
        const glint = document.createElement('canvas');
        const DRAW_MS = 4200, GLINT_MS = 16000, GLINT_W = 280;

        let W = 0, H = 0, dpr = 1;
        let raf = 0, t0 = 0, drawn = false;
        let wanted = false, onScreen = true;

        new ResizeObserver(() => { resize(); }).observe(host);
        new IntersectionObserver(entries => {
            onScreen = entries[0].isIntersecting;
            update();
        }, { root: view }).observe(host);
        document.addEventListener('visibilitychange', update);

        function resize() {
            const r = host.getBoundingClientRect();
            if (!r.width || !r.height) return;
            dpr = Math.min(2, window.devicePixelRatio || 1);
            W = r.width; H = r.height;
            for (const c of [canvas, scene]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
            glint.width = Math.round(GLINT_W * dpr); glint.height = scene.height;
            canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
            repaint();
        }

        function repaint() {
            if (!W) return;
            paintScene();
            if (!raf) frame(performance.now());
        }

        function update() {
            const run = wanted && onScreen && !document.hidden && !UI.reducedMotion();
            if (run && !raf) {
                if (!t0) t0 = performance.now();
                raf = requestAnimationFrame(loop);
            } else if (!run && raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
            if (UI.reducedMotion()) { drawn = true; frame(performance.now()); }
        }
        function loop(now) {
            frame(now);
            raf = requestAnimationFrame(loop);
        }

        function frame(now) {
            if (!W) return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const p = drawn ? 1 : (t0 ? clamp01((now - t0) / DRAW_MS) : 0);
            // Ease in and out, so the band unrolls while the title is read.
            const eased = .5 - Math.cos(Math.PI * p) / 2;
            const rx = Math.round(eased * canvas.width);
            if (rx > 0) ctx.drawImage(scene, 0, 0, rx, canvas.height, 0, 0, rx, canvas.height);
            if (p < 1 && rx > 0) drawEdge(rx);
            if (p >= 1) {
                drawn = true;
                if (raf) drawGlint(now);
            }
        }

        // The leading edge of the draw-in: a soft column of gold light.
        function drawEdge(rx) {
            const { cy, bh } = geometry();
            const g = ctx.createRadialGradient(rx, cy * dpr, 0, rx, cy * dpr, bh * 2.4 * dpr);
            g.addColorStop(0, rgba(colors().gold, .55));
            g.addColorStop(1, rgba(colors().gold, 0));
            ctx.fillStyle = g;
            ctx.fillRect(rx - bh * 2.4 * dpr, 0, bh * 4.8 * dpr, canvas.height);
        }

        // Light passing slowly over the threads: the scene re-drawn through
        // a soft-edged window, added on top.
        function drawGlint(now) {
            const travel = W + GLINT_W * 2;
            const gx = ((now - t0 - DRAW_MS) % GLINT_MS) / GLINT_MS * travel - GLINT_W;
            const gctx = glint.getContext('2d');
            gctx.globalCompositeOperation = 'copy';
            gctx.drawImage(scene, gx * dpr, 0, glint.width, glint.height, 0, 0, glint.width, glint.height);
            gctx.globalCompositeOperation = 'destination-in';
            const g = gctx.createLinearGradient(0, 0, glint.width, 0);
            g.addColorStop(0, 'rgba(0,0,0,0)');
            g.addColorStop(.5, 'rgba(0,0,0,1)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            gctx.fillStyle = g;
            gctx.fillRect(0, 0, glint.width, glint.height);
            ctx.globalCompositeOperation = colors().dark ? 'lighter' : 'source-over';
            ctx.globalAlpha = colors().dark ? .85 : .45;
            ctx.drawImage(glint, Math.round(gx * dpr), 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        // Band position and thickness come from CSS so each breakpoint can
        // keep the band clear of the text.
        function geometry() {
            const cs = getComputedStyle(host);
            const y = parseFloat(cs.getPropertyValue('--band-y')) || .72;
            const hgt = parseFloat(cs.getPropertyValue('--band-h')) || .06;
            const stars = parseFloat(cs.getPropertyValue('--band-stars')) || 2;
            return { cy: H * y, bh: H * hgt, stars };
        }

        function colors() {
            const cs = getComputedStyle(document.documentElement);
            return {
                dark: App.theme === 'dark',
                text: hexRgb(cs.getPropertyValue('--text')) || [236, 228, 211],
                gold: hexRgb(cs.getPropertyValue('--gold')) || [216, 178, 90]
            };
        }
        // Era colours are tuned for the dark ground; on parchment they are
        // taken toward ink, as base.css asks.
        function eraRgb(period, c) {
            const rgb = hexRgb(period?.color) || c.gold;
            return c.dark ? rgb : mix(rgb, [0, 0, 0], .3);
        }

        function paintScene() {
            const c = colors();
            const s = scene.getContext('2d');
            s.setTransform(dpr, 0, 0, dpr, 0, 0);
            s.clearRect(0, 0, W, H);
            const { cy, bh, stars } = geometry();
            const x = year => scale.at(year) * W;

            paintWash(s, c, cy, bh, x);

            // The thread of time itself.
            s.fillStyle = rgba(c.gold, c.dark ? .32 : .4);
            s.fillRect(0, cy - .5, W, 1);

            const rand = seeded(7);
            const normal = () => (rand() + rand() + rand() - 1.5) / 1.5;   // soft bell, −1..1
            const SIG_ALPHA = { major: .62, moderate: .4, minor: .26 };
            s.lineCap = 'round';
            for (const item of Store.items) {
                const era = Store.periodAt(item.start);
                const tone = mix(eraRgb(era, c), c.text, c.dark ? .45 : .2);
                const alpha = (SIG_ALPHA[item.significance] ?? .3) * (item.estimated ? .55 : 1);
                if (item.type === 'person') {
                    const y = cy + normal() * bh;
                    const x0 = x(item.start), x1 = Math.max(x(item.end), x0 + 1.5);
                    s.strokeStyle = rgba(tone, alpha);
                    s.lineWidth = item.significance === 'major' ? 1 : .7;
                    s.beginPath(); s.moveTo(x0, y); s.lineTo(x1, y); s.stroke();
                } else {
                    paintStar(s, c, x(item.start), cy + normal() * bh * stars, item.significance, alpha);
                }
            }

            // Fade both ends so the band arrives from and leaves into the dark.
            s.globalCompositeOperation = 'destination-in';
            const edge = s.createLinearGradient(0, 0, W, 0);
            edge.addColorStop(0, 'rgba(0,0,0,0)');
            edge.addColorStop(.07, 'rgba(0,0,0,1)');
            edge.addColorStop(.93, 'rgba(0,0,0,1)');
            edge.addColorStop(1, 'rgba(0,0,0,0)');
            s.fillStyle = edge;
            s.fillRect(0, 0, W, H);
            s.globalCompositeOperation = 'source-over';
        }

        // The eras as one continuous wash: a horizontal gradient through each
        // era's colour at its midpoint, masked to a soft vertical falloff.
        function paintWash(s, c, cy, bh, x) {
            const wash = document.createElement('canvas');
            wash.width = scene.width; wash.height = scene.height;
            const w = wash.getContext('2d');
            w.setTransform(dpr, 0, 0, dpr, 0, 0);
            const g = w.createLinearGradient(0, 0, W, 0);
            // Taken part-way toward the type colour so the eras read as one wash, not a spectrum.
            for (const seg of scale.segs) g.addColorStop((seg.from + seg.to) / 2, rgba(mix(eraRgb(seg.period, c), c.text, .25), 1));
            if (!scale.segs.length) g.addColorStop(0, rgba(c.gold, 1));
            w.fillStyle = g;
            w.fillRect(0, 0, W, H);
            w.globalCompositeOperation = 'destination-in';
            const reach = bh * 2.8;
            const v = w.createLinearGradient(0, cy - reach, 0, cy + reach);
            const peak = c.dark ? .3 : .2;
            v.addColorStop(0, 'rgba(0,0,0,0)');
            v.addColorStop(.35, `rgba(0,0,0,${peak * .45})`);
            v.addColorStop(.5, `rgba(0,0,0,${peak})`);
            v.addColorStop(.65, `rgba(0,0,0,${peak * .45})`);
            v.addColorStop(1, 'rgba(0,0,0,0)');
            w.fillStyle = v;
            w.fillRect(0, 0, W, H);
            s.save();
            s.setTransform(1, 0, 0, 1, 0, 0);
            s.drawImage(wash, 0, 0);
            s.restore();
        }

        function paintStar(s, c, x, y, significance, alpha) {
            if (significance === 'major') {
                const r = 7;
                const g = s.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, rgba(c.gold, c.dark ? .5 : .35));
                g.addColorStop(1, rgba(c.gold, 0));
                s.fillStyle = g;
                s.fillRect(x - r, y - r, r * 2, r * 2);
            }
            s.fillStyle = rgba(significance === 'major' ? c.gold : c.text, Math.min(1, alpha + .2));
            s.beginPath();
            s.arc(x, y, significance === 'major' ? 1.3 : .8, 0, Math.PI * 2);
            s.fill();
        }

        return {
            play() { wanted = true; update(); },
            pause() { wanted = false; update(); },
            repaint
        };
    }

    // ── Colour arithmetic for the canvas (it cannot read CSS variables) ─
    function hexRgb(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return [n >> 16, (n >> 8) & 255, n & 255];
    }
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    // A small deterministic generator, so the band is the same picture on
    // every visit and in both themes.
    function seeded(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ── Pairs worth showing ─────────────────────────────────────────────
    // Every pairing of major figures with recorded dates, compared once.
    function majorPairs() {
        const major = Store.people.filter(p => p.significance === 'major' && Store.datesKnown(p));
        const out = [];
        for (let i = 0; i < major.length; i++) {
            for (let j = i + 1; j < major.length; j++) out.push(Store.overlap(major[i], major[j]));
        }
        return out;
    }

    // When no authored discoveries are available, find surprising pairs in
    // the data itself: lives that missed by only a few years, then lives
    // that overlapped across a great reach of time.
    function notablePairs(all) {
        const NEAR_MISS = 10, LONG_REACH = 250;
        const near = all.filter(o => !o.overlaps && o.gap <= NEAR_MISS).sort((x, y) => x.gap - y.gap);
        const reach = all.filter(o => o.overlaps && o.years > 0 && birthGap(o) >= LONG_REACH && !isParent(o))
            .sort((x, y) => birthGap(y) - birthGap(x));
        return [...near, ...reach];
    }

    // For the small preview, the pair whose shared years fill a good part
    // of the picture reads best as "two overlapping lives".
    function previewPair(all) {
        const IDEAL = .4;
        const share = o => o.years / Math.max(1, Time.between(o.elder.birthYear, Math.max(o.elder.deathYear, o.younger.deathYear)));
        return all.filter(o => o.overlaps && !isParent(o))
            .sort((x, y) => Math.abs(share(x) - IDEAL) - Math.abs(share(y) - IDEAL))[0] || null;
    }
    const birthGap = o => Time.between(o.elder.birthYear, o.younger.birthYear);
    const isParent = o => Store.parents(o.younger).includes(o.elder);

    function dayOfYear() {
        const now = new Date();
        return Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 864e5);
    }

    // Words for a computed pair, written from the numbers; 'about' when they rest on an estimate.
    function describe(o) {
        const births = { approx: !!(o.elder.birthApprox || o.younger.birthApprox) };
        if (o.overlaps) {
            return {
                headline: `The lives of ${o.elder.name} and ${o.younger.name} overlapped for ${Time.years(o.years, { approx: o.approx })}.`,
                body: `${o.elder.name} was ${Time.years(Store.ageIn(o.elder, o.younger.birthYear), births)} old when ${o.younger.name} was born.`
            };
        }
        return {
            headline: `${o.elder.name} died ${Time.years(o.gap, { approx: o.approx })} before ${o.younger.name} was born.`,
            body: `Their births were ${Time.years(birthGap(o), births)} apart, yet their lives all but touched.`
        };
    }

    // ── Today's discovery ───────────────────────────────────────────────
    function discoverySection(pairs) {
        const slot = h('div', { class: 'discovery-slot' });
        Api.getDiscoveries().then(file => {
            const pick = pickDiscovery(file, pairs);
            if (pick) slot.replaceChildren(discoveryCard(pick));
            else slot.closest('.home-discovery').hidden = true;
        });
        return h('section', { class: 'home-section home-discovery', 'aria-label': 'Today’s discovery', dataset: { reveal: '' } },
            h('div', { class: 'home-wrap' }, slot));
    }

    // Authored discoveries, worded and checked against the data by Meet (which owns the
    // token filler); the computed pairs stand in only when the file brought none.
    function pickDiscovery(file, pairs) {
        const usable = (file ? Meet.parseDiscoveries(file) : []).filter(d => d.result.known).map(d => ({
            o: d.result, headline: Meet.fill(d.headline, d.result), body: Meet.fill(d.body, d.result)
        }));
        const list = usable.length ? usable : pairs.map(o => ({ o, ...describe(o) }));
        return list.length ? list[dayOfYear() % list.length] : null;
    }

    function discoveryCard({ o, headline, body }) {
        return h('article', { class: 'discovery' },
            h('div', { class: 'discovery-text' },
                h('p', { class: 'eyebrow discovery-eyebrow' }, UI.icon('sparkle', 'icon-sm'), 'Today’s discovery'),
                h('h2', { class: 'display discovery-headline' }, headline),
                body ? h('p', { class: 'discovery-body' }, body) : null,
                h('div', { class: 'discovery-actions' },
                    h('a', { class: 'btn', href: Router.build('meet', [o.a.slug, o.b.slug]) },
                        'See for yourself', UI.icon('arrow-right', 'icon-sm')),
                    h('a', { class: 'btn btn-quiet', href: '#/meet' }, 'Try any two people')),
                h('p', { class: 'discovery-note' },
                    'Dates follow Ussher’s chronology. ',
                    h('a', { href: '#/about' }, 'How the dates are chosen'))),
            lifeBars(o, { className: 'discovery-bars' }));
    }

    // Two lifetimes on one axis, with the years they shared (or the gap
    // between them) marked between the bars.
    function lifeBars(o, { className = '', labels = true } = {}) {
        const people = [o.elder, o.younger];
        const lo = Math.min(...people.map(p => p.birthYear));
        const hi = Math.max(...people.map(p => p.deathYear));
        const pad = Math.max(1, Time.between(lo, hi) * .08);
        const origin = Time.toAxis(lo) - pad, width = Time.between(lo, hi) + pad * 2;
        // Positions are fractions; the CSS turns them into lengths, because the
        // bars and the shared zone measure against different boxes.
        const pos = y => (Time.toAxis(y) - origin) / width;
        const place = (el, a, b) => vars(el, { '--x': pos(a), '--w': Math.max(0, pos(b) - pos(a)) });

        const rows = people.map(p => h('div', { class: 'lb-row' },
            labels ? h('div', { class: 'lb-label' },
                h('span', { class: 'lb-name' }, p.name),
                h('span', { class: 'lb-dates year' }, Store.dates(p))) : null,
            h('div', { class: 'lb-track' },
                vars(place(h('span', { class: 'lb-bar' }), p.birthYear, p.deathYear), { '--c': UI.familyColor(p.role) }))));

        const zone = place(h('div', { class: `lb-zone ${o.overlaps ? 'is-overlap' : 'is-gap'}`, 'aria-hidden': 'true' }), o.from, o.to);
        const zoneText = o.overlaps ? `Alive together for ${Time.years(o.years, { approx: o.approx })}` : `${Time.years(o.gap, { approx: o.approx })} apart`;
        const summary = `${o.elder.name}, ${Store.dates(o.elder)}; ${o.younger.name}, ${Store.dates(o.younger)}. ${zoneText}.`;

        return h('figure', { class: `lifebars ${className}`.trim(), role: 'img', 'aria-label': summary },
            h('div', { class: 'lb-plot' }, zone, rows),
            labels ? h('figcaption', { class: 'lb-foot' },
                h('span', { class: 'lb-zone-label' }, zoneText),
                h('span', { class: 'lb-axis year' }, Time.year(lo), h('span', { 'aria-hidden': 'true' }, ' — '), Time.year(hi))) : null);
    }

    // ── Ways in ─────────────────────────────────────────────────────────
    function waysIn(scale, meetPair) {
        const jesus = Store.person('jesus');
        const line = jesus ? Store.ancestors(jesus) : [];
        const located = Store.locations.filter(l => l.lat != null && l.lng != null);
        const testaments = Store.books.reduce((m, b) => (m[b.testament] = (m[b.testament] || 0) + 1, m), {});

        const cards = [
            way('timeline', '#/timeline', 'The timeline',
                'Every life and event in its place, from the first morning to the present day. Zoom from millennia to a single reign.',
                ribbonPreview(scale)),
            way('meet', '#/meet', 'Did they meet?',
                'Pick any two people and see whether their lives overlapped, and for how long.',
                meetPair ? lifeBars(meetPair, { className: 'way-bars', labels: false }) : null),
            line.length ? way('family', Router.build('family', [jesus.slug]), 'Family tree',
                `${line[line.length - 1].name} to ${jesus.name} in ${plural(line.length, 'generation', 'generations')}, following the line recorded father to son.`,
                linePreview(jesus, line)) : null,
            way('map', '#/map', 'The map',
                `${plural(located.length, 'place', 'places')} and ${plural(Store.journeys.length, 'journey', 'journeys')}${famousPlaces(4)}.`,
                mapPreview()),
            way('read', '#/read', 'Read',
                `${plural(Store.books.length, 'book', 'books')}: ${count(testaments.OT || 0)} of the Old Testament and ${count(testaments.NT || 0)} of the New, open beside the timeline.`,
                shelfPreview())
        ].filter(Boolean);

        return h('section', { class: 'home-section home-ways', 'aria-labelledby': 'home-ways-title' },
            h('div', { class: 'home-wrap' },
                h('header', { class: 'home-head', dataset: { reveal: '' } },
                    h('p', { class: 'eyebrow' }, 'Ways in'),
                    h('h2', { class: 'display', id: 'home-ways-title' }, 'Start wherever ', h('em', null, 'your question'), ' is.')),
                h('div', { class: 'ways-grid' }, cards)));
    }

    function way(kind, href, title, text, preview) {
        return h('a', { class: `card way way-${kind}`, href, dataset: { reveal: '' } },
            h('div', { class: 'way-preview', 'aria-hidden': 'true' }, preview),
            h('h3', { class: 'way-title' }, title),
            h('p', { class: 'way-text' }, text),
            h('span', { class: 'way-go' }, 'Open', UI.icon('arrow-right', 'icon-sm')));
    }

    // ", including Jerusalem, Rome and Babylon" — the places most events happen in.
    function famousPlaces(n) {
        const names = Store.locations
            .map(l => ({ l, n: Store.eventsAt(l).length }))
            .filter(x => x.n > 0)
            .sort((a, b) => b.n - a.n)
            .slice(0, n)
            .map(x => x.l.name);
        if (!names.length) return '';
        const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
        return `, among them ${list}`;
    }

    // The era ribbon in miniature, with the major events as small marks.
    function ribbonPreview(scale) {
        const marks = Store.items.filter(i => i.type === 'event' && i.significance === 'major');
        return h('div', { class: 'mini-ribbon' },
            h('div', { class: 'mini-marks' },
                marks.map(m => vars(h('span', { class: 'mini-mark' }), { '--x': `${scale.at(m.start) * 100}%` }))),
            h('div', { class: 'mini-eras' },
                scale.segs.map(s => vars(h('span', { class: 'mini-era' }),
                    { '--c': s.period.color, flex: `${s.to - s.from} 1 0` }))),
            h('div', { class: 'mini-ends year' },
                h('span', null, Time.year(Time.MIN)), h('span', null, 'Today')));
    }

    // Every generation on the line as a bead; the major figures are larger.
    function linePreview(person, line) {
        const chain = [...line].reverse().concat(person);
        return h('div', { class: 'mini-line' },
            h('div', { class: 'mini-beads' },
                chain.map(p => h('span', { class: `mini-bead${p.significance === 'major' ? ' is-major' : ''}` }))),
            h('div', { class: 'mini-ends' },
                h('span', null, chain[0].name), h('span', null, person.name)));
    }

    // The journeys drawn from their real coordinates: a small star chart.
    function mapPreview() {
        const paths = Store.journeys.map(j => [...(j.stops || [])]
            .sort((a, b) => a.order - b.order)
            .map(s => Store.location(s.locationId))
            .filter(l => l && l.lat != null && l.lng != null));
        const pts = paths.flat();
        if (pts.length < 2) return null;
        const meanLat = pts.reduce((a, l) => a + l.lat, 0) / pts.length;
        const kx = Math.cos(meanLat * Math.PI / 180);
        const xy = l => [l.lng * kx, -l.lat];
        const xs = pts.map(l => xy(l)[0]), ys = pts.map(l => xy(l)[1]);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const w = Math.max(...xs) - minX || 1, hgt = Math.max(...ys) - minY || 1;
        const padX = w * .06, padY = hgt * .08;
        const box = `${minX - padX} ${minY - padY} ${w + padX * 2} ${hgt + padY * 2}`;
        const seen = new Set();
        return svg('svg', { class: 'mini-map', viewBox: box, preserveAspectRatio: 'xMidYMid meet' },
            ...paths.map(p => svg('polyline', { points: p.map(l => xy(l).join(',')).join(' '), class: 'mini-route' })),
            ...pts.filter(l => !seen.has(l.id) && seen.add(l.id)).map(l => {
                const [x, y] = xy(l);
                return svg('circle', { cx: x, cy: y, r: Math.max(w, hgt) * .008, class: 'mini-stop' });
            }));
    }

    // Sixty-six spines, sized by chapter count once the Bible manifest is in.
    function shelfPreview() {
        const spines = new Map(Store.books.map(b => [b.slug,
            h('span', { class: `mini-spine is-${b.testament === 'NT' ? 'nt' : 'ot'}` })]));
        BibleText.manifest().then(m => {
            const chapters = new Map((m?.books || []).map(b => [b.slug, b.chapters]));
            const most = Math.max(1, ...chapters.values());
            for (const [slug, el] of spines) {
                const n = chapters.get(slug);
                if (n) vars(el, { '--h': `${28 + 72 * Math.sqrt(n / most)}%` });
            }
        });
        return h('div', { class: 'mini-shelf' }, [...spines.values()]);
    }

    // ── Eras ────────────────────────────────────────────────────────────
    function erasSection() {
        const track = h('ol', { class: 'eras-track' },
            Store.periods.map((p, i) => h('li', { class: 'era-item' }, eraCard(p, i))));
        const step = dir => track.scrollBy({
            left: dir * Math.max(280, track.clientWidth * .8),
            behavior: UI.reducedMotion() ? 'auto' : 'smooth'
        });
        return h('section', { class: 'home-section home-eras', 'aria-labelledby': 'home-eras-title' },
            h('div', { class: 'home-wrap home-eras-head', dataset: { reveal: '' } },
                h('div', null,
                    h('p', { class: 'eyebrow' }, 'The chapters'),
                    h('h2', { class: 'display', id: 'home-eras-title' },
                        'The story in ', h('em', null, `${count(Store.periods.length)} eras`), '.')),
                h('div', { class: 'eras-nav' },
                    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Earlier eras', onclick: () => step(-1) }, UI.icon('chevron-left')),
                    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Later eras', onclick: () => step(1) }, UI.icon('chevron-right')))),
            h('div', { class: 'eras-scroller', dataset: { reveal: '' } }, track));
    }

    function eraCard(p, i) {
        const inEra = x => Store.periodAt(x) === p;
        const people = Store.people.filter(x => x.span && inEra(x.span.start)).length;
        const events = Store.events.filter(e => e.startYear != null && inEra(e.startYear)).length;
        return vars(h('a', { class: 'era-card', href: UI.href(p) },
            h('span', { class: 'era-num' }, roman(i + 1)),
            h('h3', { class: 'era-name' }, p.name),
            h('p', { class: 'era-years year' }, Time.span(p.startYear, p.endYear)),
            p.description ? h('p', { class: 'era-desc' }, p.description) : null,
            h('p', { class: 'era-counts' }, `${plural(people, 'person', 'people')} · ${plural(events, 'event', 'events')}`)),
        { '--c': p.color });
    }

    function roman(n) {
        const NUMERALS = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
        let out = '';
        for (const [v, s] of NUMERALS) while (n >= v) { out += s; n -= v; }
        return out;
    }

    // ── Footer ──────────────────────────────────────────────────────────
    function footer() {
        return h('footer', { class: 'home-foot' },
            h('div', { class: 'home-wrap' },
                h('div', { class: 'ornament', 'aria-hidden': 'true' }, h('span')),
                h('div', { class: 'home-foot-body', dataset: { reveal: '' } },
                    h('h2', { class: 'home-foot-title' }, 'How the dates are chosen'),
                    h('p', { class: 'home-foot-text' },
                        'Old Testament dates follow James Ussher’s chronology, one respected reckoning among several, so that every life sits on the same calendar. Each date carries a label saying how sure anyone can be, from anchored in outside records to handed down by tradition.'),
                    h('a', { class: 'btn btn-quiet home-foot-link', href: '#/about' },
                        'Read about the dates and sources', UI.icon('arrow-right', 'icon-sm'))),
                h('p', { class: 'home-colophon' },
                    h('span', { class: 'home-colophon-brand' },
                        svg('svg', { class: 'icon', 'aria-hidden': 'true' }, svg('use', { href: '#i-mark' })),
                        'Faith Through Time'),
                    h('span', null, 'Scripture from the English Standard Version'),
                    h('a', { href: 'https://github.com/ZacHarlan/FaithThroughTime/issues', target: '_blank', rel: 'noopener' },
                        'Report a correction'))));
    }

    // ── Reveals ─────────────────────────────────────────────────────────
    // Sections below the fold rise gently into view. Nothing is hidden
    // unless JavaScript is running and motion is welcome, so the page is
    // whole without any of this.
    function setupReveals(el) {
        if (UI.reducedMotion() || !('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.remove('is-pending');
                entry.target.classList.add('rise');
                io.unobserve(entry.target);
            }
        }, { root: el, rootMargin: '0px 0px -6% 0px' });
        for (const target of el.querySelectorAll('[data-reveal]')) {
            target.classList.add('is-pending');
            // Drop the class once it has played: a finished animation would
            // otherwise pin `transform` and cancel the cards' hover lift.
            target.addEventListener('animationend', () => target.classList.remove('rise'), { once: true });
            io.observe(target);
        }
    }

    App.registerView('home', { init, show, hide, title: () => null });
})();

// meet.js — "Did they meet?" Pick two people; see whether their lifetimes overlapped.
//
//   #/meet               landing: empty pickers and a gallery of curated discoveries
//   #/meet/<a>           one person chosen: suggested partners
//   #/meet/<a>/<b>       the comparison: verdict, nuance, two lifespans on one axis
//
// Every number comes from Store.overlap(); this file only phrases and draws it.
// We never say two people met — only that their lives overlapped.

const Meet = (() => {
    const { h } = UI;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const NEAR_MISS = 100;          // below this many years apart, "missed each other by"
    const GALLERY_FIRST = 9;        // discoveries shown before "Show all"
    const SUGGESTIONS = 8;          // rows in a picker's suggestion list

    let els = {};
    let pickers = [];
    let state = { a: null, b: null };
    let renderedKey = null;         // pair on screen, so returning from a detail sheet does not replay the animation
    let discoveries = [];
    let discoveriesLoaded = false;
    let galleryExpanded = false;
    let chart = null;               // { host, result, width } of the comparison chart, for redraw on resize
    let resizeObserver = null;

    // ── Tokens ──────────────────────────────────────────────────────────
    // Authored copy carries tokens, never literal numbers, because the dates
    // are corrected independently of the prose.
    // A figure resting on an estimated year says 'about', so curated copy never states
    // an estimate as a finding.
    function tokens(r) {
        const t = { a: r.a.name, b: r.b.name };
        const aLife = Store.lifespan(r.a), bLife = Store.lifespan(r.b);
        if (aLife != null) t.aLifespan = Time.years(aLife, { approx: isApprox(r.a) });
        if (bLife != null) t.bLifespan = Time.years(bLife, { approx: isApprox(r.b) });
        if (!r.known) return t;
        t.from = Time.year(r.from);
        t.to = Time.year(r.to);
        t.elderAge = `${birthsApprox(r) ? 'about ' : ''}${Time.between(r.elder.birthYear, r.younger.birthYear).toLocaleString('en-US')}`;
        if (r.overlaps) t.years = Time.years(r.years, { approx: r.approx });
        else t.gap = Time.years(r.gap, { approx: r.approx });
        return t;
    }

    // Unknown tokens are left in place so a broken claim is visible, not silently blank.
    function fill(text, r) {
        const t = tokens(r);
        return String(text || '').replace(/\{(\w+)\}/g, (match, key) => t[key] ?? match);
    }

    // A discovery is shown only while the live data still bears out its wording:
    // {years} claims an overlap, {gap} claims a miss, and every token must fill. Copy
    // that states no computed figure makes no claim to check, so it always shows.
    function claimHolds(d) {
        const r = d.result;
        const text = `${d.headline} ${d.body || ''}`;
        if (text.includes('{years}') && !(r.known && r.overlaps)) return false;
        if (text.includes('{gap}') && !(r.known && !r.overlaps)) return false;
        return !/\{\w+\}/.test(fill(text, r));
    }

    function parseDiscoveries(raw) {
        return (raw.discoveries || [])
            .map(d => ({ ...d, a: Store.person(d.a), b: Store.person(d.b) }))
            .filter(d => d.a && d.b && d.a !== d.b)
            .map(d => ({ ...d, result: Store.overlap(d.a, d.b) }))
            .filter(claimHolds);
    }

    const discoveryFor = (a, b) => discoveries.find(d => (d.a === a && d.b === b) || (d.a === b && d.b === a));

    // ── Phrasing ────────────────────────────────────────────────────────
    const possessive = name => `${name}’s`;
    const isApprox = p => !!(p.birthApprox || p.deathApprox);
    const birthsApprox = r => !!(r.elder.birthApprox || r.younger.birthApprox);   // the elder's age at the other's birth
    const yearsText = r => Time.years(r.overlaps ? r.years : r.gap, { approx: r.approx });

    // The verdict as a list of text and <em> nodes; the key figure is gilded.
    function verdictParts(r) {
        const em = text => h('em', {}, text);
        if (r.a === r.b) return ['That is the same person twice.'];
        if (!r.known) return [`We can’t say — ${missingDates(r)}.`];
        if (r.overlaps) {
            return r.years === 0
                ? ['Their lives just touched, in ', em(Time.year(r.from, { approx: r.approx })), '.']
                : ['Their lives overlapped for ', em(yearsText(r)), '.'];
        }
        return r.gap < NEAR_MISS
            ? ['They missed each other by ', em(yearsText(r)), '.']
            : ['They lived ', em(yearsText(r)), ' apart.'];
    }
    const verdictText = r => verdictParts(r).map(p => (typeof p === 'string' ? p : p.textContent)).join('');

    function missingDates(r) {
        const missing = [r.a, r.b].filter(p => !Store.datesKnown(p));
        const partial = missing.some(p => p.birthYear != null || p.deathYear != null);
        const recorded = partial ? 'fully recorded' : 'recorded';
        return missing.length === 1
            ? `${possessive(missing[0].name)} dates aren’t ${recorded}`
            : `the dates for ${r.a.name} and ${r.b.name} aren’t ${recorded}`;
    }

    // Direct family line between two people, oldest first, or null.
    function familyLine(x, y) {
        const n = Store.generationsBetween(x, y);
        if (!n) return null;
        const [ancestor, descendant] = Store.ancestors(x).includes(y) ? [y, x] : [x, y];
        return { ancestor, descendant, n };
    }
    const KIN = [null, 'parent and child', 'grandparent and grandchild', 'great-grandparent and great-grandchild'];

    // One honest sentence under the verdict.
    function nuance(r) {
        if (r.a === r.b) return `Choose someone else to compare with ${r.a.name}.`;
        if (!r.known) {
            const estimated = [r.a, r.b].some(p => !Store.datesKnown(p) && p.span);
            return 'Without recorded birth and death years any answer would be a guess'
                + (estimated ? '; a dashed bar shows only an estimate of where a life falls.' : '.');
        }
        const { elder, younger } = r;
        const line = familyLine(elder, younger);
        if (r.overlaps) {
            const about = birthsApprox(r);
            const age = Time.between(elder.birthYear, younger.birthYear);
            const born = age === 0
                ? `Both were born ${about ? 'around' : 'in'} ${Time.year(elder.birthYear)}`
                : `${elder.name} was ${about ? 'about ' : ''}${age.toLocaleString('en-US')} when ${younger.name} was born`;
            if (line) return `${born} — ${KIN[line.n] || `${line.n} generations apart on one family line`}.`;
            return `${born}, but sharing years is not the same as sharing a room.`;
        }
        if (line) {
            return line.n === 1
                ? `${line.ancestor.name} was ${possessive(line.descendant.name)} parent.`
                : `${line.descendant.name} descends from ${line.ancestor.name}, ${line.n} generations on.`;
        }
        if (r.gap > Time.between(younger.deathYear, Time.MAX)) {
            return `That is a longer stretch than lies between ${possessive(younger.name)} death and today.`;
        }
        return `${elder.name} died in ${Time.year(elder.deathYear, { approx: elder.deathApprox })}; `
            + `${younger.name} was born in ${Time.year(younger.birthYear, { approx: younger.birthApprox })}.`;
    }

    // Said only when the verdict's figure rests on an estimate (it then reads 'about').
    function approxNote(r) {
        if (!r.known || r.a === r.b || !r.approx) return null;
        const loose = [r.a, r.b].filter(isApprox);
        return loose.length === 1 ? `${possessive(loose[0].name)} dates are estimates` : 'These dates are estimates';
    }

    // Ussher's chronology governs Old Testament dating, so the note belongs on lives that
    // began before the Old Testament's own story closes — not on a New Testament figure
    // who happens to have been born a year or two BC.
    const oldTestamentEnd = () => Math.max(...Store.books
        .filter(book => book.testament === 'OT' && book.coversEnd != null).map(book => book.coversEnd));
    const usesUssher = (a, b) => [a, b].some(p => p.span && p.span.start <= oldTestamentEnd());

    // ── Lives on an axis ────────────────────────────────────────────────
    // Recorded dates when we have them; otherwise the store's estimate, flagged.
    function lifeOf(p) {
        if (Store.datesKnown(p)) return { start: p.birthYear, end: p.deathYear, estimated: false };
        return p.span ? { start: p.span.start, end: p.span.end, estimated: true } : null;
    }

    // Piecewise-linear scale from year to x. Lives far apart get a visible break
    // in the empty middle, both sides on the same years-per-pixel, so neither
    // life shrinks to a dot and their lengths stay comparable.
    function makeScale(lives, width, breakWidth) {
        const ax = lives.map(l => ({ s: Time.toAxis(l.start), e: Time.toAxis(l.end) })).sort((p, q) => p.s - q.s);
        const len = l => Math.max(l.e - l.s, 1);
        let segs, brk = null;
        const apart = ax.length === 2 ? ax[1].s - ax[0].e : 0;
        if (apart > 40 && apart > 1.25 * (len(ax[0]) + len(ax[1]))) {
            const pad = l => Math.max(3, len(l) * 0.1);
            const [p, q] = ax.map(l => [l.s - pad(l), l.e + pad(l)]);
            const k = (width - breakWidth) / ((p[1] - p[0]) + (q[1] - q[0]));
            segs = [
                { y0: p[0], y1: p[1], x0: 0, x1: (p[1] - p[0]) * k },
                { y0: q[0], y1: q[1], x0: width - (q[1] - q[0]) * k, x1: width }
            ];
            brk = { x0: segs[0].x1, x1: segs[1].x0 };
        } else {
            const lo = Math.min(...ax.map(l => l.s)), hi = Math.max(...ax.map(l => l.e));
            const pad = Math.max(hi - lo, 20) * 0.05;
            segs = [{ y0: lo - pad, y1: hi + pad, x0: 0, x1: width }];
        }
        const k = (segs[0].x1 - segs[0].x0) / (segs[0].y1 - segs[0].y0);
        function x(year) {
            const v = Time.toAxis(year);
            const [s1, s2] = segs;
            if (!s2 || v <= s1.y1) return s1.x0 + (v - s1.y0) * k;
            if (v >= s2.y0) return s2.x0 + (v - s2.y0) * k;
            return s1.x1 + (v - s1.y1) / (s2.y0 - s1.y1) * (s2.x0 - s1.x1);
        }
        return { x, segs, brk };
    }

    function svg(tag, attrs = {}, ...children) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
        for (const c of children) if (c != null) el.append(c.nodeType ? c : document.createTextNode(String(c)));
        return el;
    }

    // Place a text element so it never runs off either edge of the chart.
    // Must be in the document to be measured.
    function place(el, x, anchor, width, margin = 4) {
        const w = el.getComputedTextLength();
        let left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
        left = Math.max(margin, Math.min(left, width - margin - w));
        el.setAttribute('x', left);
        return { left, right: left + w, width: w };
    }

    function layout(width) {
        const wide = width >= 640;
        const barH = wide ? 30 : 22;
        const L = { wide, barH, eraLabel: 14 };
        L.nameA = 44;
        L.barA = L.nameA + 10;
        L.yearsA = L.barA + barH + 19;
        L.mid = L.yearsA + 26;
        L.nameB = L.mid + 38;
        L.barB = L.nameB + 10;
        L.yearsB = L.barB + barH + 19;
        L.axis = L.yearsB + 22;
        L.height = L.axis + 28;
        return L;
    }

    // The comparison chart: era bands, two lifespan bars, and either the
    // overlap window or the measured gap between them.
    function drawChart(host, r, animate) {
        const width = Math.max(280, Math.floor(host.clientWidth));
        const L = layout(width);
        const lives = [lifeOf(r.a), lifeOf(r.b)];
        const placed = lives.filter(Boolean);
        const root = svg('svg', {
            class: `meet-svg${animate && !UI.reducedMotion() ? ' is-animated' : ''}`,
            width, height: L.height, viewBox: `0 0 ${width} ${L.height}`, 'aria-hidden': 'true'
        });
        host.replaceChildren(root);
        if (!placed.length) return width;

        const scale = makeScale(placed, width, Math.min(180, Math.max(76, width * 0.2)));
        const ctx = { root, scale, L, width, r };
        drawEras(ctx);
        if (scale.brk) drawBreak(ctx);
        if (r.known && r.overlaps) drawOverlapBand(ctx);
        const keys = keyYears(r);
        drawLife(ctx, r.a, lives[0], 'a', keys);
        drawLife(ctx, r.b, lives[1], 'b', keys);
        if (r.known) drawMeasure(ctx);
        drawAxis(ctx);
        return width;
    }

    // The two years that bound the overlap (or the gap) are marked in gold.
    function keyYears(r) {
        const keys = new Set();
        if (!r.known) return keys;
        const slot = p => (p === r.a ? 'a' : 'b');
        if (r.overlaps) {
            keys.add(`${slot(r.younger)}-start`);
            for (const p of [r.a, r.b]) if (p.deathYear === r.to) keys.add(`${slot(p)}-end`);
        } else {
            keys.add(`${slot(r.elder)}-end`);
            keys.add(`${slot(r.younger)}-start`);
        }
        return keys;
    }

    function drawEras({ root, scale, L, width }) {
        const g = svg('g', { class: 'meet-eras' });
        root.append(g);
        for (const seg of scale.segs) {
            for (const period of Store.periods) {
                const s = Math.max(Time.toAxis(period.startYear), seg.y0);
                const e = Math.min(Time.toAxis(period.endYear), seg.y1);
                if (e <= s) continue;
                const x0 = scale.x(Time.fromAxis(s)), x1 = scale.x(Time.fromAxis(e));
                g.append(svg('rect', {
                    class: 'meet-era', x: x0, y: 0, width: Math.max(0, x1 - x0), height: L.axis,
                    style: `--era:${period.color}`
                }));
                if (x0 > seg.x0 + 1) g.append(svg('line', { class: 'meet-era-line', x1: x0, x2: x0, y1: 0, y2: L.axis }));
                const label = svg('text', { class: 'meet-era-label', y: L.eraLabel }, period.name);
                g.append(label);
                const box = place(label, x0 + 6, 'start', width, 0);
                if (box.right > x1 - 4 || box.left < x0) label.remove();
            }
        }
    }

    function drawBreak({ root, scale, L }) {
        const { x0, x1 } = scale.brk;
        const g = svg('g', { class: 'meet-break' });
        g.append(svg('rect', { class: 'meet-break-fill', x: x0, y: 0, width: x1 - x0, height: L.axis + 6 }));
        for (const x of [x0, x1]) g.append(svg('line', { class: 'meet-break-edge', x1: x, x2: x, y1: 0, y2: L.axis + 6 }));
        root.append(g);
    }

    // The window's edges are drawn only beside each bar. Between the bars sit
    // the lower person's name and the measured label; an edge line there would
    // strike through them (the measure's own ticks mark the window's ends).
    function drawOverlapBand({ root, scale, L, r }) {
        const x0 = scale.x(r.from), x1 = Math.max(scale.x(r.to), x0 + 2);
        const top = L.barA - 8, bottom = L.barB + L.barH + 8;
        const g = svg('g', { class: 'meet-overlap' });
        g.append(svg('rect', { class: 'meet-overlap-fill', x: x0, y: top, width: x1 - x0, height: bottom - top }));
        const runs = [[top, L.barA + L.barH + 4], [L.barB - 4, bottom]];
        for (const x of [x0, x1]) {
            for (const [y1, y2] of runs) g.append(svg('line', { class: 'meet-overlap-edge', x1: x, x2: x, y1, y2 }));
        }
        root.append(g);
    }

    // Vertical lines that cross the lower person's name row: the dashed edges
    // of an axis break, and the drop line from the lower bar up to the gap.
    function nameObstacles({ scale, r }, slot) {
        const xs = scale.brk ? [scale.brk.x0, scale.brk.x1] : [];
        if (slot === 'b' && r.known && !r.overlaps) xs.push(scale.x(r.elder === r.b ? r.from : r.to));
        return xs;
    }

    // Set a name on whichever side of its bar has room: from the bar's start,
    // from its end, or tucked either side of an obstacle. Falls back to a plate that
    // hides whatever it must cross.
    function placeName(ctx, el, life, obstacles) {
        const { scale, width } = ctx;
        const x0 = scale.x(life.start), x1 = Math.max(scale.x(life.end), x0 + 4);
        const clear = box => !obstacles.some(x => x > box.left - 6 && x < box.right + 6);
        const tries = [[x0, 'start'], [x1, 'end'], ...obstacles.flatMap(x => [[x - 8, 'end'], [x + 8, 'start']])];
        for (const [x, anchor] of tries) {
            const box = place(el, x, anchor, width);
            if (clear(box)) return;
        }
        const box = place(el, x0, 'start', width);
        el.before(svg('rect', {
            class: 'meet-plate meet-label', x: box.left - 5, y: el.getBBox().y - 1, width: box.width + 10, height: el.getBBox().height + 2, rx: 4
        }));
    }

    function drawLife(ctx, person, life, slot, keys) {
        const { root, scale, L, width } = ctx;
        const nameY = slot === 'a' ? L.nameA : L.nameB;
        const barY = slot === 'a' ? L.barA : L.barB;
        const yearsY = slot === 'a' ? L.yearsA : L.yearsB;
        const g = svg('g', { class: `meet-life is-${slot}`, style: `--bar:${UI.familyColor(person.role)}` });
        root.append(g);

        const span = Store.lifespan(person);
        const sub = !life ? 'no dates recorded' : life.estimated ? 'estimated' : Time.years(span);
        const name = svg('text', { class: 'meet-name meet-label', y: nameY },
            person.name, svg('tspan', { class: 'meet-name-sub' }, `  ${sub}`));
        g.append(name);
        if (!life) { place(name, 0, 'start', width); return; }

        const x0 = scale.x(life.start), x1 = Math.max(scale.x(life.end), x0 + 4);
        g.append(svg('rect', {
            class: `meet-bar${life.estimated ? ' is-estimated' : ''}`,
            x: x0, y: barY, width: x1 - x0, height: L.barH, rx: Math.min(L.barH / 2, (x1 - x0) / 2)
        }));
        placeName(ctx, name, life, nameObstacles(ctx, slot));

        const approx = life.estimated;
        const startText = Time.year(life.start, { approx: approx || person.birthApprox });
        const endText = Time.year(life.end, { approx: approx || person.deathApprox });
        const start = svg('text', { class: `meet-year meet-label${keys.has(`${slot}-start`) ? ' is-key' : ''}`, y: yearsY }, startText);
        const end = svg('text', { class: `meet-year meet-label${keys.has(`${slot}-end`) ? ' is-key' : ''}`, y: yearsY }, endText);
        g.append(start, end);
        const a = place(start, x0, 'start', width), b = place(end, x1, 'end', width);
        if (a.right + 12 > b.left) {
            // Too short a bar for two labels: one combined label instead.
            start.remove(); end.remove();
            const both = svg('text', { class: 'meet-year meet-label', y: yearsY },
                Time.span(life.start, life.end, { aApprox: approx || person.birthApprox, bApprox: approx || person.deathApprox }));
            g.append(both);
            place(both, x0, 'start', width);
        }
    }

    // A dimension line between the bars: the overlap's length, or the gap's.
    function drawMeasure({ root, scale, L, width, r }) {
        const x0 = scale.x(r.from), x1 = Math.max(scale.x(r.to), x0 + 1);
        const g = svg('g', { class: `meet-measure ${r.overlaps ? 'is-overlap' : 'is-gap'}` });
        root.append(g);
        const y = L.mid;
        if (!r.overlaps) {
            // Drop lines from the end of one life and the start of the other.
            const rowOf = p => (p === r.a ? L.barA : L.barB) + L.barH / 2;
            g.append(svg('line', { class: 'meet-drop', x1: x0, x2: x0, y1: rowOf(r.elder), y2: y }));
            g.append(svg('line', { class: 'meet-drop', x1, x2: x1, y1: rowOf(r.younger), y2: y }));
        }
        const text = r.overlaps && r.years === 0 ? 'the same year' : yearsText(r);
        const label = svg('text', { class: 'meet-measure-label meet-label', y, dy: '0.34em' }, text);
        g.append(label);
        const mid = (x0 + x1) / 2;
        let box = place(label, mid, 'middle', width);
        const fits = box.width + 28 < x1 - x0;
        if (!fits) {
            // Too narrow to hold the label: set it beside the window.
            const right = x1 + 14 + box.width < width - 4;
            box = place(label, right ? x1 + 14 : x0 - 14, right ? 'start' : 'end', width);
        }
        const line = (a, b) => b - a > 1 && g.insertBefore(svg('line', { class: 'meet-measure-line', x1: a, x2: b, y1: y, y2: y }), label);
        if (fits) { line(x0, box.left - 8); line(box.right + 8, x1); } else line(x0, x1);
        // Ends of the window; when they all but coincide one mark stands for both.
        for (const x of x1 - x0 < 6 ? [mid] : [x0, x1]) {
            g.insertBefore(svg('line', { class: 'meet-measure-tick', x1: x, x2: x, y1: y - 6, y2: y + 6 }), label);
        }
        if (scale.brk && fits) {
            const note = svg('text', { class: 'meet-break-note meet-label', y: y + 22 }, 'not to scale');
            g.append(note);
            place(note, mid, 'middle', width);
        }
    }

    const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
    function drawAxis({ root, scale, L, width }) {
        const g = svg('g', { class: 'meet-axis' });
        root.append(g);
        let lastRight = -Infinity;
        for (const seg of scale.segs) {
            g.append(svg('line', { class: 'meet-axis-line', x1: seg.x0, x2: seg.x1, y1: L.axis, y2: L.axis }));
            const years = seg.y1 - seg.y0;
            const want = Math.max(1, Math.floor((seg.x1 - seg.x0) / 110));
            const step = STEPS.find(s => years / s <= want) || 5000;
            const lo = Time.fromAxis(seg.y0), hi = Time.fromAxis(seg.y1);
            for (let y = Math.ceil(lo / step) * step; y <= hi; y += step) {
                if (y === 0) continue;
                const x = scale.x(y);
                const label = svg('text', { class: 'meet-tick-label', y: L.axis + 18 }, Time.year(y));
                g.append(label);
                const box = place(label, x, 'middle', width);
                if (box.left < lastRight + 12 || box.left < seg.x0 - 2 || box.right > seg.x1 + 2) { label.remove(); continue; }
                lastRight = box.right;
                g.append(svg('line', { class: 'meet-tick', x1: x, x2: x, y1: L.axis, y2: L.axis + 5 }));
            }
        }
    }

    // Tiny two-bar preview for a discovery card. Shapes only, no text.
    function miniChart(a, b, r) {
        const W = 300, H = 34;
        const lives = [lifeOf(a), lifeOf(b)];
        const el = svg('svg', { class: 'meet-mini', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
        if (!lives[0] || !lives[1]) return el;
        const scale = makeScale(lives, W, 54);
        if (scale.brk) {
            const c = (scale.brk.x0 + scale.brk.x1) / 2;
            for (const dx of [-4, 4]) el.append(svg('line', { class: 'meet-mini-break', x1: c + dx - 3, x2: c + dx + 3, y1: H - 2, y2: 2 }));
        }
        if (r.overlaps) {
            const x0 = scale.x(r.from), x1 = Math.max(scale.x(r.to), x0 + 2);
            el.append(svg('rect', { class: 'meet-mini-overlap', x: x0, y: 0, width: x1 - x0, height: H }));
        }
        lives.forEach((life, i) => {
            const x0 = scale.x(life.start), x1 = Math.max(scale.x(life.end), x0 + 3);
            el.append(svg('rect', {
                class: 'meet-mini-bar', x: x0, y: i ? 20 : 6, width: x1 - x0, height: 8,
                style: `--bar:${UI.familyColor((i ? b : a).role)}`
            }));
        });
        return el;
    }

    // ── Pickers ─────────────────────────────────────────────────────────
    // A combobox: type a name, choose from instant suggestions with the
    // keyboard or pointer. Shows the chosen person's role and dates.
    function createPicker(slot) {
        const id = `meet-pick-${slot}`;
        const input = h('input', {
            class: 'meet-input', id, type: 'text', role: 'combobox', autocomplete: 'off', spellcheck: 'false',
            'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': `${id}-list`,
            placeholder: 'Type a name…'
        });
        const meta = h('p', { class: 'meet-picker-meta', id: `${id}-meta` });
        input.setAttribute('aria-describedby', meta.id);
        const list = h('ul', { class: 'meet-options', id: `${id}-list`, role: 'listbox', hidden: true, 'aria-label': 'Suggestions' });
        const el = h('div', { class: 'meet-picker' },
            h('label', { class: 'eyebrow meet-picker-label', for: id }, slot === 0 ? 'First person' : 'Second person'),
            input, meta, list);

        let person = null, results = [], active = -1;

        function set(p) {
            person = p;
            input.value = p ? p.name : '';
            el.classList.toggle('is-chosen', !!p);
            el.style.setProperty('--pick', p ? UI.familyColor(p.role) : 'var(--line-strong)');
            const lifespan = p && Store.lifespan(p);
            // Each part is unbreakable so a narrow picker wraps between parts, never inside a date.
            const role = p && Store.roleLabel(p.role);
            const parts = p ? [
                role ? h('span', { class: 'meet-nowrap meet-role' }, role, h('span', { class: 'meet-sep' }, ' · ')) : null,
                h('span', { class: 'meet-nowrap' }, Store.dates(p)),
                lifespan != null ? [' · ', h('span', { class: 'meet-nowrap' }, Time.years(lifespan))] : null
            ] : ['Anyone from the story'];
            meta.replaceChildren(...parts.flat().filter(Boolean));
        }

        function open(items) {
            results = items;
            active = items.length ? 0 : -1;
            list.replaceChildren(...items.map((res, i) => h('li', {
                class: 'meet-option', id: `${id}-opt-${i}`, role: 'option', 'aria-selected': i === active ? 'true' : 'false',
                style: { '--chip': UI.familyColor(res.item.role) },
                onmousedown: e => e.preventDefault(),     // keep focus in the input
                onclick: () => choose(res.item)
            }, h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
                h('span', { class: 'meet-option-name' }, res.item.name),
                h('span', { class: 'meet-option-sub' }, res.sub))));
            if (!items.length && input.value.trim()) list.append(h('li', { class: 'meet-option is-empty', role: 'presentation' }, 'No one by that name'));
            list.hidden = !list.children.length;
            input.setAttribute('aria-expanded', String(!list.hidden));
            syncActive();
        }
        function close() {
            list.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            active = -1;
        }
        function syncActive() {
            [...list.querySelectorAll('[role="option"]')].forEach((li, i) => {
                li.setAttribute('aria-selected', i === active ? 'true' : 'false');
                if (i === active) li.scrollIntoView({ block: 'nearest' });
            });
            if (active >= 0) input.setAttribute('aria-activedescendant', `${id}-opt-${active}`);
            else input.removeAttribute('aria-activedescendant');
        }
        function choose(p) {
            close();
            set(p);
            onPick(slot, p);
        }

        input.addEventListener('input', () => open(Store.search(input.value, { types: ['person'], limit: SUGGESTIONS })));
        input.addEventListener('focus', () => input.select());
        input.addEventListener('blur', () => { close(); set(person); });
        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (list.hidden) { open(Store.search(input.value, { types: ['person'], limit: SUGGESTIONS })); return; }
                if (!results.length) return;
                active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
                syncActive();
            } else if (e.key === 'Enter') {
                if (!list.hidden && results[active]) { e.preventDefault(); choose(results[active].item); }
            } else if (e.key === 'Escape') {
                if (!list.hidden) { e.preventDefault(); close(); set(person); input.select(); }
            }
        });

        set(null);
        return { el, set, focus: () => input.focus() };
    }

    // ── Navigation ──────────────────────────────────────────────────────
    const pairHref = (a, b) => Router.build('meet', [a.slug, b.slug]);

    function onPick(slot, p) {
        const next = { ...state, [slot === 0 ? 'a' : 'b']: p };
        if (next.a && next.b) Router.go(pairHref(next.a, next.b));
        else if (next.a) Router.go(Router.build('meet', [next.a.slug]));
        else {
            // The route cannot hold only a second person; keep it on screen until the first is chosen.
            state = next;
            render();
            pickers[0].focus();
        }
    }

    function swap() {
        if (state.a && state.b) Router.go(pairHref(state.b, state.a));
    }

    function surprise() {
        const pool = discoveries.filter(d => !(d.a === state.a && d.b === state.b));
        if (!pool.length) return;
        const d = pool[Math.floor(Math.random() * pool.length)];
        Router.go(pairHref(d.a, d.b));
    }

    function timelineHref(a, b) {
        const lives = [lifeOf(a), lifeOf(b)].filter(Boolean);
        if (!lives.length) return null;
        const lo = Math.min(...lives.map(l => Time.toAxis(l.start)));
        const hi = Math.max(...lives.map(l => Time.toAxis(l.end)));
        return Router.build('timeline', [], { y: Time.fromAxis((lo + hi) / 2), span: Math.round((hi - lo) * 1.3) + 20 });
    }

    function share(r) {
        if (typeof Share !== 'undefined' && Share.meetCard) Share.meetCard(r);
        else UI.share({ title: `${r.a.name} and ${r.b.name}`, text: verdictText(r), url: window.location.href });
    }

    async function copyLink() {
        const ok = await UI.copy(window.location.href);
        UI.toast(ok ? 'Link copied' : 'Could not copy the link');
    }

    // ── Rendering ───────────────────────────────────────────────────────
    function render() {
        const key = `${state.a?.id ?? ''}|${state.b?.id ?? ''}|${discoveriesLoaded}`;
        if (key === renderedKey) return;
        renderedKey = key;

        pickers[0].set(state.a);
        pickers[1].set(state.b);
        els.swap.disabled = !(state.a && state.b);
        els.surprise.hidden = !discoveries.length;
        chart = null;

        if (state.a && state.b) {
            els.intro.replaceChildren();
            els.intro.hidden = true;
            const r = Store.overlap(state.a, state.b);
            els.stage.replaceChildren(...comparison(r));
            els.live.textContent = verdictText(r);
            if (chart) chart.width = drawChart(chart.host, chart.result, true);
        } else if (state.a || state.b) {
            const p = state.a || state.b;
            intro(['Compare ', h('em', {}, p.name), ' with someone'],
                `Choose a second person, or try one of the lives below that ran alongside ${p.name} or only just missed.`);
            els.stage.replaceChildren(...partners(p));
        } else {
            intro(['Did their lives ', h('em', {}, 'overlap'), '?'],
                'Choose any two people in the story and see, on one line, whether their lifetimes overlapped. Some of the answers are surprising.');
            els.stage.replaceChildren(...landing());
        }
    }

    function intro(title, lede) {
        els.intro.hidden = false;
        els.intro.replaceChildren(
            h('p', { class: 'eyebrow' }, 'Did they meet?'),
            h('h1', { class: 'meet-title' }, title),
            h('p', { class: 'lede meet-lede' }, lede));
    }

    function comparison(r) {
        const { a, b } = r;
        const nodes = [];
        const notes = [];
        const loose = approxNote(r);
        const ussher = a !== b && usesUssher(a, b);
        if (loose) {
            notes.push(h('span', { class: 'meet-flag' }, UI.icon('info', 'icon-sm'), loose,
                ussher ? null : ['. ', h('a', { href: '#/about' }, 'About the dates')]));
        }
        if (ussher) {
            notes.push(h('span', { class: 'meet-ussher' }, 'Old Testament dates follow Ussher’s chronology. ',
                h('a', { href: '#/about' }, 'About the dates')));
        }

        nodes.push(h('div', { class: 'meet-verdict-block' },
            h('h1', { class: 'display meet-verdict' }, ...verdictParts(r)),
            h('p', { class: 'meet-nuance' }, nuance(r)),
            notes.length ? h('p', { class: 'meet-notes' }, ...notes) : null));

        if (a === b) return [...nodes, ...partners(a)];

        const host = h('div', { class: 'meet-chart-host' });
        nodes.push(h('figure', { class: 'meet-chart', role: 'img', 'aria-label': chartLabel(r) }, host));
        chart = { host, result: r };

        const d = discoveryFor(a, b);
        if (d) nodes.push(h('p', { class: 'meet-context' }, fill(d.body, d.result)));

        nodes.push(actions(r));
        nodes.push(h('div', { class: 'meet-also' }, alsoAlive(a, b, 'a'), alsoAlive(b, a, 'b')));
        return nodes;
    }

    function chartLabel(r) {
        const life = p => {
            const l = lifeOf(p);
            if (!l) return `${p.name}: no dates recorded.`;
            return `${p.name}: ${Store.dates(p)}${l.estimated ? ' (estimated)' : ''}.`;
        };
        return `${life(r.a)} ${life(r.b)} ${verdictText(r)}`;
    }

    function actions(r) {
        const tl = timelineHref(r.a, r.b);
        return h('div', { class: 'meet-actions' },
            h('button', { class: 'btn btn-primary', type: 'button', onclick: () => share(r) }, UI.icon('share', 'icon-sm'), 'Share'),
            h('button', { class: 'btn', type: 'button', onclick: copyLink }, UI.icon('link', 'icon-sm'), 'Copy link'),
            tl ? h('a', { class: 'btn', href: tl }, UI.icon('timeline', 'icon-sm'), 'See both on the timeline') : null,
            h('span', { class: 'meet-actions-people' },
                [r.a, r.b].map(p => h('a', { class: 'btn btn-quiet', href: UI.href(p) }, UI.icon('person', 'icon-sm'), `About ${p.name}`))));
    }

    // A pill that loads a new pairing; `sub` says how the lives relate.
    function pairChip(person, href, sub) {
        return h('a', { class: 'chip chip-entity meet-chip', href, style: { '--chip': UI.familyColor(person.role) } },
            h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
            h('span', { class: 'chip-label' }, person.name),
            sub ? h('span', { class: 'chip-sub' }, sub) : null);
    }

    function alsoAlive(p, other, slot) {
        const list = Store.contemporaries(p, { limit: 13 }).filter(c => c.person !== other).slice(0, 12);
        const href = o => (slot === 'a' ? pairHref(p, o) : pairHref(o, p));
        return h('section', { class: 'meet-also-col' },
            h('h2', { class: 'meet-also-title' }, 'Also alive with ', h('span', {}, p.name)),
            list.length
                ? h('div', { class: 'chip-row' }, list.map(c => pairChip(c.person, href(c.person), Time.years(c.years, { approx: c.approx }))))
                : h('p', { class: 'dim meet-empty' }, Store.datesKnown(p)
                    ? `No one else in the story shares recorded years with ${p.name}.`
                    : `${possessive(p.name)} dates aren’t recorded, so we can’t list who shared them.`));
    }

    // People whose lives missed this one by the fewest years.
    function nearMisses(p, limit = 8) {
        if (!Store.datesKnown(p)) return [];
        return Store.people
            .filter(o => o !== p && Store.datesKnown(o))
            .map(o => Store.overlap(p, o))
            .filter(r => !r.overlaps && r.gap <= NEAR_MISS)
            .sort((x, y) => x.gap - y.gap || Store.SIG_RANK[x.b.significance] - Store.SIG_RANK[y.b.significance])
            .slice(0, limit);
    }

    function partners(p) {
        const groups = [];
        const together = Store.contemporaries(p, { limit: 12 });
        if (together.length) {
            groups.push(group('Lives that overlapped', together.map(c => pairChip(c.person, pairHref(p, c.person), Time.years(c.years, { approx: c.approx })))));
        }
        const misses = nearMisses(p);
        if (misses.length) {
            groups.push(group('Near misses', misses.map(r => pairChip(r.b, pairHref(p, r.b), `missed by ${Time.years(r.gap, { approx: r.approx })}`))));
        }
        if (!groups.length) {
            groups.push(h('p', { class: 'dim meet-empty' }, Store.datesKnown(p)
                ? `No one else in the story lived close to ${possessive(p.name)} years.`
                : `${possessive(p.name)} dates aren’t recorded, so any comparison will show only an estimate.`));
        }
        const related = discoveries.filter(d => d.a === p || d.b === p);
        if (related.length) groups.push(gallery(related, `Discoveries with ${p.name}`, false));
        return [h('div', { class: 'meet-partners' }, groups)];
    }

    function group(title, chips) {
        return h('section', { class: 'meet-group' },
            h('h2', { class: 'meet-group-title' }, title),
            h('div', { class: 'chip-row' }, chips));
    }

    function landing() {
        if (!discoveriesLoaded) return [];
        if (!discoveries.length) return [];
        return [gallery(discoveries, 'Discoveries', true)];
    }

    function gallery(list, title, collapsible) {
        const shown = collapsible && !galleryExpanded ? list.slice(0, GALLERY_FIRST) : list;
        const section = h('section', { class: 'meet-gallery', 'aria-label': title },
            h('div', { class: 'meet-gallery-head' },
                h('div', { class: 'ornament', 'aria-hidden': 'true' }, h('span')),
                h('h2', { class: 'meet-gallery-title' }, title)),
            h('ul', { class: 'meet-cards' }, shown.map(d => h('li', {}, card(d)))));
        if (collapsible && shown.length < list.length) {
            section.append(h('div', { class: 'meet-more' }, h('button', {
                class: 'btn', type: 'button',
                onclick: () => { galleryExpanded = true; renderedKey = null; render(); }
            }, `Show all ${list.length} discoveries`)));
        }
        return section;
    }

    function card(d) {
        return h('a', { class: 'card meet-card', href: pairHref(d.a, d.b) },
            miniChart(d.a, d.b, d.result),
            h('p', { class: 'meet-card-headline' }, fill(d.headline, d.result)),
            h('p', { class: 'meet-card-names' },
                h('span', { style: { '--chip': UI.familyColor(d.a.role) } }, d.a.name),
                h('span', { class: 'meet-card-and', 'aria-hidden': 'true' }, UI.icon('overlap', 'icon-sm')),
                h('span', { style: { '--chip': UI.familyColor(d.b.role) } }, d.b.name)));
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        pickers = [createPicker(0), createPicker(1)];
        els.intro = h('header', { class: 'meet-intro' });
        els.swap = h('button', { class: 'icon-btn meet-swap', type: 'button', 'aria-label': 'Swap the two people', onclick: swap }, UI.icon('swap'));
        els.surprise = h('button', { class: 'btn btn-quiet meet-surprise', type: 'button', onclick: surprise, hidden: true },
            UI.icon('sparkle', 'icon-sm'), 'Surprise me');
        els.stage = h('div', { class: 'meet-stage' });
        els.live = h('p', { class: 'sr-only', 'aria-live': 'polite' });   // announces each new verdict
        el.append(h('div', { class: 'meet page' },
            els.intro,
            h('div', { class: 'meet-pickers' }, pickers[0].el, els.swap, pickers[1].el, els.surprise),
            els.stage, els.live));

        Api.getDiscoveries().then(raw => {
            discoveries = parseDiscoveries(raw);
            discoveriesLoaded = true;
            if (App.view !== 'meet') return;
            if (state.a && state.b) addContext();
            else render();
        });
    }

    // Discoveries can arrive after a deep-linked comparison has drawn; add the
    // context paragraph without redrawing (and re-animating) the chart.
    function addContext() {
        renderedKey = `${state.a.id}|${state.b.id}|true`;
        els.surprise.hidden = !discoveries.length;
        const d = discoveryFor(state.a, state.b);
        const figure = els.stage.querySelector('.meet-chart');
        if (d && figure) figure.after(h('p', { class: 'meet-context' }, fill(d.body, d.result)));
    }

    function show(route) {
        const [a, b] = route.parts.map(slug => Store.person(slug));
        state = { a: a || null, b: b || null };
        render();
        if (!resizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                if (!chart || !chart.host.isConnected) return;
                if (Math.max(280, Math.floor(chart.host.clientWidth)) === chart.width) return;
                chart.width = drawChart(chart.host, chart.result, false);
            });
        }
        if (chart) resizeObserver.observe(chart.host);
    }

    function hide() {
        if (resizeObserver) resizeObserver.disconnect();
    }

    function title(route) {
        const [a, b] = route.parts.map(slug => Store.person(slug));
        if (a && b) return `${a.name} and ${b.name}: did they meet?`;
        return 'Did they meet?';
    }

    App.registerView('meet', { init, show, hide, title });
    return { fill, parseDiscoveries };
})();

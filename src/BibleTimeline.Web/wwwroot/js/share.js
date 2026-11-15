// share.js — turns a moment in the app into an image people post, and the dialog to send it.
//
//   Share.open(spec)            open the dialog for a card spec
//   Share.meetCard(overlap)     spec from Store.overlap(a, b), then open
//   Share.entityCard(x)         spec for a person or event, then open
//   Share.render(spec, format)  → Promise<canvas>   ('landscape' | 'portrait')
//   Share.renderSite()          → Promise<canvas>   the default link-preview image
//   Share.specs                 { meet(overlap), entity(x) } build a spec without opening
//
// spec: { kind: 'person'|'event'|'meet'|'fact', title, subtitle, lines[], url, accent,
//         eyebrow, em, bars[], bridge, marker }
//   accent  a role/category name (resolved to its family colour) or a hex colour
//   em      part of the title set in gold italic
//   bars    [{ name, birth, death, birthApprox, deathApprox, group }] drawn on a shared axis
//   bridge  { from, to, overlaps } the shared window (or the gap) between the two bars
//   marker  { from, to } where the subject sits on the era strip
//
// The card is drawn on a canvas with no external images, and is always dark,
// whatever the app theme.
const Share = (() => {
    const SIZES = { landscape: { w: 1200, h: 630, s: 1, bs: 1, pad: 76 }, portrait: { w: 1080, h: 1350, s: 1.3, bs: 1.75, pad: 88 } };
    const SITE = 'faiththroughtime.com';

    // The dark-theme palette, copied from base.css (:root[data-theme='dark']).
    // Literal on purpose: the card must not change with the theme.
    const INK = '#0a0c12', TEXT = '#ece4d3', DIM = '#aaa393', FAINT = '#8a8474';
    const GOLD = '#d8b25a', GOLD_BRIGHT = '#f3d98f';
    const FAMILY = {
        gold: '#e3c06a', amber: '#d99a5b', crimson: '#e27d86', violet: '#a995e0',
        teal: '#62bdb4', green: '#7fbf7a', blue: '#77a5e6', slate: '#98a2b3'
    };
    const DISPLAY = "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
    const SANS = "'Hanken Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

    const accentColor = a => (!a ? GOLD : a.startsWith('#') ? a : FAMILY[UI.family(a)]);

    // ── Fonts ───────────────────────────────────────────────────────────
    // Canvas does not wait for web fonts, so ask for them explicitly. If the
    // network is slow the card falls back to the serif stack rather than hang.
    let fontsReady = null;
    function loadFonts() {
        if (!fontsReady) {
            const faces = ['400 64px Fraunces', '500 64px Fraunces', '600 64px Fraunces', 'italic 500 64px Fraunces',
                '400 20px "Hanken Grotesk"', '500 20px "Hanken Grotesk"', '600 20px "Hanken Grotesk"', '700 20px "Hanken Grotesk"'];
            const load = Promise.all(faces.map(f => document.fonts.load(f, 'Aa0')));
            const timeout = new Promise(resolve => setTimeout(resolve, 3000));
            fontsReady = Promise.race([load, timeout]).catch(() => { });
        }
        return fontsReady;
    }

    // ── Text ────────────────────────────────────────────────────────────
    const font = (weight, size, family, italic) => `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;
    function setTracking(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; }

    // Split into words, marking the ones that fall inside `em`.
    function tokenize(text, em) {
        const start = em ? text.indexOf(em) : -1, end = start + (em ? em.length : 0);
        const words = [];
        for (const m of text.matchAll(/\S+/g)) {
            const em = start >= 0 && m.index < end && m.index + m[0].length > start;
            const prev = words[words.length - 1];
            // The emphasised phrase ("3,078 years") stays on one line.
            if (em && prev && prev.em) prev.text += `\u00a0${m[0]}`;
            else words.push({ text: m[0], em });
        }
        return words;
    }

    // Greedy wrap of styled words into lines no wider than maxW.
    function wrap(ctx, words, maxW, style) {
        const measure = w => { ctx.font = w.em ? style.emFont : style.font; return ctx.measureText(w.text).width; };
        ctx.font = style.font;
        const space = ctx.measureText(' ').width;
        const lines = [];
        let line = [], width = 0;
        for (const w of words) {
            const ww = measure(w);
            if (line.length && width + space + ww > maxW) { lines.push({ words: line, width }); line = []; width = 0; }
            width += (line.length ? space : 0) + ww;
            line.push({ ...w, width: ww });
        }
        if (line.length) lines.push({ words: line, width });
        return { lines, space, widest: Math.max(0, ...lines.map(l => l.width)) };
    }

    // Narrow the measure while the line count holds, so two lines come out even
    // instead of one long line and a stray word.
    function balance(ctx, words, maxW, style) {
        const first = wrap(ctx, words, maxW, style);
        if (first.lines.length < 2) return first;
        let lo = maxW * 0.45, hi = maxW, best = first;
        for (let i = 0; i < 8; i++) {
            const mid = (lo + hi) / 2;
            const t = wrap(ctx, words, mid, style);
            if (t.lines.length === first.lines.length && t.widest <= maxW) { best = t; hi = mid; } else lo = mid;
        }
        return best;
    }

    // Largest size (≤ max) at which the text fits the box. Never clips: at the
    // minimum size an over-long text is ended with an ellipsis.
    function fit(ctx, text, { em, maxW, maxH, max, min, leading, weight = 600, family = DISPLAY, balanced = true }) {
        const words = tokenize(text, em);
        for (let size = max; ; size -= 2) {
            const style = {
                font: font(weight, size, family), emFont: font(500, size, family, true)
            };
            const r = (balanced ? balance : wrap)(ctx, words, maxW, style);
            const tooWide = r.widest > maxW + 0.5;
            const tooTall = r.lines.length * size * leading > maxH + 0.5;
            if ((!tooWide && !tooTall) || size <= min) {
                const rows = Math.max(1, Math.floor(maxH / (size * leading)));
                const truncated = r.lines.length > rows;
                if (truncated) { r.lines.length = rows; markTruncated(ctx, r.lines[rows - 1], maxW, style, r.space); }
                return { ...r, size, style, leading, truncated };
            }
        }
    }
    function markTruncated(ctx, line, maxW, style, space) {
        ctx.font = style.font;
        const ell = ctx.measureText('…').width;
        while (line.words.length > 1 && line.width + ell > maxW) {
            const w = line.words.pop();
            line.width -= w.width + space;
        }
        const last = line.words[line.words.length - 1];
        last.text = `${last.text.replace(/[.,;:–—-]+$/, '')}…`;
    }

    // Draw a fitted block from `top`; returns the y below it.
    function drawBlock(ctx, block, x, top, color, emColor = GOLD_BRIGHT) {
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        let y = top;
        for (const line of block.lines) {
            y += block.size * block.leading;
            let cx = x;
            const baseline = y - (block.size * (block.leading - 0.8)) / 2 - block.size * 0.04;
            for (const w of line.words) {
                ctx.font = w.em ? block.style.emFont : block.style.font;
                ctx.fillStyle = w.em ? emColor : color;
                ctx.fillText(w.text, cx, baseline);
                cx += w.width + block.space;
            }
        }
        return y;
    }
    const blockHeight = b => b.lines.length * b.size * b.leading;

    // ── Ground, frame, brand ────────────────────────────────────────────
    function hashSeed(text) {
        let h = 2166136261;
        for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
        return h >>> 0;
    }
    function random(seed) {
        let a = seed;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function drawGround(ctx, { w, h, s }, seed) {
        ctx.fillStyle = INK;
        ctx.fillRect(0, 0, w, h);
        const glow = ctx.createRadialGradient(w * 0.8, h * 0.12, 0, w * 0.8, h * 0.12, Math.max(w, h) * 0.75);
        glow.addColorStop(0, 'rgba(216, 178, 90, .13)');
        glow.addColorStop(0.55, 'rgba(216, 178, 90, .03)');
        glow.addColorStop(1, 'rgba(216, 178, 90, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        const cool = ctx.createRadialGradient(w * 0.05, h * 1.0, 0, w * 0.05, h * 1.0, Math.max(w, h) * 0.7);
        cool.addColorStop(0, 'rgba(119, 140, 230, .07)');
        cool.addColorStop(1, 'rgba(119, 140, 230, 0)');
        ctx.fillStyle = cool;
        ctx.fillRect(0, 0, w, h);

        // Star-dust: seeded by the title so the same card is always the same image.
        const rnd = random(seed);
        const count = Math.round((w * h) / 2600);
        for (let i = 0; i < count; i++) {
            const x = rnd() * w, y = rnd() * h;
            const bright = rnd() > 0.96;
            ctx.fillStyle = `rgba(236, 228, 211, ${bright ? 0.5 : 0.06 + rnd() * 0.16})`;
            const r = (bright ? 1.5 : 0.6 + rnd() * 0.7) * (s > 1 ? 1.15 : 1);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawFrame(ctx, { w, h, s }) {
        const inset = 26 * s;
        ctx.strokeStyle = 'rgba(216, 178, 90, .5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
        // A small diamond breaks the frame at the top centre, like an illumination.
        const d = 5 * s, cx = w / 2;
        ctx.fillStyle = INK;
        ctx.fillRect(cx - 18 * s, inset - 3, 36 * s, 6);
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.moveTo(cx, inset - d); ctx.lineTo(cx + d, inset); ctx.lineTo(cx, inset + d); ctx.lineTo(cx - d, inset);
        ctx.closePath();
        ctx.fill();
    }

    // The brand mark from the icon sprite (#i-mark, 32×32), drawn at `size` px.
    function drawMark(ctx, x, y, size, color = GOLD) {
        const k = size / 32;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(k, k);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(16, 16, 13.5, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(16, 4); ctx.lineTo(16, 28); ctx.moveTo(8, 12); ctx.lineTo(24, 12); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(16, 19.5); ctx.lineTo(18.6, 22.1); ctx.lineTo(16, 24.7); ctx.lineTo(13.4, 22.1);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    // "Faith Through Time" with the middle word in gold italic, as in the app.
    // Returns its width. `baselineY` is the text baseline.
    function drawWordmark(ctx, x, baselineY, size, { measureOnly = false } = {}) {
        const parts = [['Faith ', false], ['Through', true], [' Time', false]];
        let cx = x;
        for (const [text, em] of parts) {
            ctx.font = em ? font(500, size, DISPLAY, true) : font(500, size, DISPLAY);
            ctx.fillStyle = em ? GOLD : TEXT;
            if (!measureOnly) ctx.fillText(text, cx, baselineY);
            cx += ctx.measureText(text).width;
        }
        return cx - x;
    }

    function drawHeader(ctx, m) {
        const { s, pad } = m, size = 30 * s;
        const y = pad * 0.78 + 14 * s;
        drawMark(ctx, pad, y - size / 2 - 1, size);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        setTracking(ctx, -0.2);
        drawWordmark(ctx, pad + size + 12 * s, y + 7 * s, 23 * s);
        setTracking(ctx, 0);
        return y;
    }

    // `dot` is an optional accent colour: a small diamond before the label.
    function drawEyebrow(ctx, text, x, baselineY, s, dot) {
        if (dot) {
            const d = 6 * s, cy = baselineY - 6 * s;
            ctx.fillStyle = dot;
            ctx.beginPath();
            ctx.moveTo(x + d, cy - d); ctx.lineTo(x + 2 * d, cy); ctx.lineTo(x + d, cy + d); ctx.lineTo(x, cy);
            ctx.closePath(); ctx.fill();
            x += 3 * d;
        }
        ctx.font = font(700, 16 * s, SANS);
        setTracking(ctx, 3.2 * s);
        ctx.fillStyle = GOLD;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text.toUpperCase(), x, baselineY);
        setTracking(ctx, 0);
    }

    function drawFooter(ctx, m, note) {
        const { w, h, s, pad } = m, y = h - pad * 0.78;
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.font = font(600, 18 * s, SANS);
        setTracking(ctx, 0.6 * s);
        ctx.fillStyle = GOLD;
        ctx.fillText(SITE, pad, y);
        setTracking(ctx, 0);
        if (note) {
            ctx.font = font(500, 14 * s, SANS);
            ctx.fillStyle = FAINT;
            ctx.textAlign = 'right';
            ctx.fillText(note, w - pad, y);
            ctx.textAlign = 'left';
        }
        return y;
    }

    // ── The era strip ───────────────────────────────────────────────────
    // The whole timeline as a band of era colours; `marker` shows where a
    // subject sits, `ticks` scatter events along it (the site image).
    function drawStrip(ctx, x0, x1, y, height, { marker, ticks, s = 1 } = {}) {
        const lo = Time.toAxis(Time.MIN), hi = Time.toAxis(Time.MAX);
        const at = year => x0 + ((Time.toAxis(year) - lo) / (hi - lo)) * (x1 - x0);
        const last = Store.periods.length - 1;
        ctx.save();
        Store.periods.forEach((p, i) => {
            const a = at(p.startYear), b = i === last ? x1 : at(p.endYear);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(a + (i ? 1.5 : 0), y, Math.max(1, b - a - (i ? 1.5 : 0) - (i < last ? 1.5 : 0)), height);
        });
        ctx.globalAlpha = 1;
        for (const t of ticks || []) {
            const x = at(t.year), up = (t.major ? 30 : 16) * s;
            ctx.strokeStyle = t.major ? GOLD_BRIGHT : 'rgba(236, 228, 211, .5)';
            ctx.globalAlpha = t.major ? 0.9 : 0.55;
            ctx.lineWidth = 1.5 * s;
            ctx.beginPath(); ctx.moveTo(x, y - 6 * s); ctx.lineTo(x, y - 6 * s - up); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (marker) {
            const a = at(marker.from), b = at(marker.to ?? marker.from), mid = (a + b) / 2;
            ctx.fillStyle = GOLD_BRIGHT;
            ctx.fillRect(Math.min(a, mid - 2 * s), y - 3 * s, Math.max(b - a, 4 * s), height + 6 * s);
            const d = 7 * s;
            ctx.beginPath();
            ctx.moveTo(mid, y - 10 * s); ctx.lineTo(mid + d, y - 10 * s - d); ctx.lineTo(mid, y - 10 * s - 2 * d); ctx.lineTo(mid - d, y - 10 * s - d);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }

    // ── Meet: two lifespans on a shared axis ────────────────────────────
    const yearLabel = (y, approx) => Time.year(y, { approx });

    // Years → x. One continuous axis when the lives are near each other; when
    // they are far apart the empty middle is cut out and shown as a break.
    function buildAxis(bars, bridge, x0, x1, s) {
        const [a, b] = bars;
        const whole = Math.max(a.death, b.death) - Math.min(a.birth, b.birth);
        const far = bridge && !bridge.overlaps && Time.between(bridge.from, bridge.to) > whole * 0.5;
        if (!far) {
            const lo = Math.min(a.birth, b.birth), hi = Math.max(a.death, b.death);
            return { far: false, at: y => x0 + ((y - lo) / (hi - lo)) * (x1 - x0) };
        }
        const breakW = 190 * s, room = x1 - x0 - breakW;
        const da = a.death - a.birth, db = b.death - b.birth;
        const share = Math.min(0.7, Math.max(0.3, da / (da + db)));
        const wa = room * share;
        return {
            far: true, breakW,
            at: y => (y <= a.death ? x0 + ((y - a.birth) / da) * wa : x0 + wa + breakW + ((y - b.birth) / db) * (room - wa))
        };
    }

    function drawBars(ctx, m, spec, top, left, right) {
        const s = m.bs;
        const ordered = spec.bars.slice().sort((p, q) => p.birth - q.birth);
        const axis = buildAxis(ordered, spec.bridge, left, right, s);
        const nameSize = 25 * s, barH = 13 * s, labelSize = 15 * s;
        const rowH = nameSize + 11 * s + barH + 10 * s + labelSize;
        const gapH = GAP * s;
        const rows = ordered.map((bar, i) => {
            const y = top + i * (rowH + gapH);
            return { bar, y, barTop: y + nameSize + 11 * s, x0: axis.at(bar.birth), x1: axis.at(bar.death) };
        });
        const bridge = spec.bridge;
        const bx0 = bridge ? axis.at(bridge.from) : 0, bx1 = bridge ? axis.at(bridge.to) : 0;
        
        // A shared window is washed in gold, a gap in a pale dashed band.
        if (bridge && bridge.overlaps) {
            ctx.fillStyle = 'rgba(216, 178, 90, .13)';
            ctx.fillRect(bx0, rows[0].barTop - 10 * s, Math.max(bx1 - bx0, 3), rows[1].barTop + barH - rows[0].barTop + 20 * s);
        }

        for (const r of rows) {
            const color = FAMILY[UI.family(r.bar.group)];
            ctx.fillStyle = color;
            roundRect(ctx, r.x0, r.barTop, Math.max(r.x1 - r.x0, 4), barH, barH / 2);
            ctx.fill();
            if (bridge && bridge.overlaps) {
                ctx.save();
                roundRect(ctx, r.x0, r.barTop, Math.max(r.x1 - r.x0, 4), barH, barH / 2);
                ctx.clip();
                ctx.fillStyle = GOLD_BRIGHT;
                ctx.fillRect(bx0, r.barTop, Math.max(bx1 - bx0, 3), barH);
                ctx.restore();
            }
            drawRowText(ctx, r, { nameSize, barH, labelSize, left, right, s, color });
        }
        drawBridge(ctx, { bridge, axis, bx0, bx1, gapTop: top + rowH, gapH, s, labelSize, left, right });
        return rowH * 2 + gapH;
    }

    function drawRowText(ctx, r, { nameSize, barH, labelSize, left, right, s, color }) {
        const { bar } = r;
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(600, nameSize, DISPLAY);
        const nameW = ctx.measureText(bar.name).width;
        const alignRight = r.x0 + nameW > right && r.x1 - nameW >= left;
        ctx.fillStyle = TEXT;
        ctx.textAlign = alignRight ? 'right' : 'left';
        ctx.fillText(bar.name, alignRight ? r.x1 : Math.max(left, r.x0), r.y + nameSize * 0.86);

        const a = yearLabel(bar.birth, bar.birthApprox), b = yearLabel(bar.death, bar.deathApprox);
        const y = r.barTop + barH + 10 * s + labelSize * 0.82;
        ctx.font = font(500, labelSize, SANS);
        setTracking(ctx, 0.3 * s);
        ctx.fillStyle = DIM;
        const free = r.x1 - r.x0;
        if (ctx.measureText(`${a}   ${b}`).width + 12 * s > free) {
            // Too short to hold both ends: one centred label over the bar.
            ctx.textAlign = 'left';
            const text = Time.span(bar.birth, bar.death, { aApprox: bar.birthApprox, bApprox: bar.deathApprox });
            const w = ctx.measureText(text).width;
            ctx.fillText(text, Math.min(Math.max(left, r.x0), right - w), y);
        } else {
            ctx.textAlign = 'left'; ctx.fillText(a, r.x0, y);
            ctx.textAlign = 'right'; ctx.fillText(b, r.x1, y);
        }
        setTracking(ctx, 0);
        ctx.textAlign = 'left';
    }

    // The annotation between the rows: a bracket across the shared window or the
    // gap, with its length above it. A near miss is too narrow for a bracket, so
    // it becomes a short connector from one life's end down to the next one's start.
    function drawBridge(ctx, { bridge, axis, bx0, bx1, gapTop, gapH, s, labelSize, left, right }) {
        if (!bridge) return;
        const overlap = bridge.overlaps;
        const color = overlap ? GOLD_BRIGHT : DIM;
        const text = Time.years(Math.max(Time.between(bridge.from, bridge.to), 0), { approx: bridge.approx });
        const x0 = Math.min(bx0, bx1), x1 = Math.max(bx0, bx1);
        const narrow = !overlap && !axis.far && x1 - x0 < 40 * s;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.6 * s;
        ctx.font = font(700, labelSize + 1 * s, SANS);
        setTracking(ctx, 0.4 * s);
        ctx.textBaseline = 'alphabetic';
        const w = ctx.measureText(text).width;

        if (narrow) {
            const x = (x0 + x1) / 2, top = gapTop + 6 * s, bottom = gapTop + gapH - 6 * s;
            ctx.setLineDash([2 * s, 4 * s]);
            ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
            ctx.setLineDash([]);
            ctx.textAlign = 'right';
            ctx.fillText(text, Math.max(x - 14 * s, left + w), gapTop + gapH / 2 + labelSize * 0.35);
        } else {
            const y = gapTop + gapH * 0.68, half = 6 * s;
            if (!overlap && axis.far) ctx.setLineDash([2 * s, 5 * s]);
            ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(x0, y - half); ctx.lineTo(x0, y + half);
            ctx.moveTo(x1, y - half); ctx.lineTo(x1, y + half);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.fillText(text, Math.min(Math.max((x0 + x1) / 2, left + w / 2), right - w / 2), y - 9 * s);
        }
        setTracking(ctx, 0);
        ctx.textAlign = 'left';
    }

    function roundRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
    }

    // ── The card ────────────────────────────────────────────────────────
    const EYEBROWS = { meet: 'Did they meet?', person: 'A life in Scripture', event: 'A moment in Scripture', fact: 'Faith Through Time' };
    const bcNote = marks => (marks.some(y => y != null && y < 0) ? 'Dates follow Ussher’s chronology' : '');

    // Fit the title, subtitle and supporting lines into `room` px of height.
    // The supporting lines go first-come until they run out of space; the title
    // takes whatever is left and shrinks to fit it.
    function layoutText(ctx, spec, { innerW, room, s, portrait }) {
        const subSize = 28 * s, lineSize = 24 * s, leading = 1.45;
        const subtitle = spec.subtitle ? fit(ctx, spec.subtitle, {
            maxW: innerW, maxH: subSize * 1.3 * 2, max: subSize, min: 18 * s, leading: 1.3, weight: 600, family: SANS, balanced: false
        }) : null;
        const subH = subtitle ? blockHeight(subtitle) + 14 * s : 0;
        const minTitle = 30 * s + 40 * s;
        const lines = [];
        let used = 0;
        for (const text of (spec.lines || []).filter(Boolean).slice(0, 3)) {
            const left = room - subH - minTitle - used - 20 * s;
            if (left < lineSize * leading) break;
            // One size for every line (min = max), so a long one ends in an ellipsis rather than shrinking.
            const block = fit(ctx, text, {
                maxW: Math.min(innerW, 880 * s), maxH: Math.min(left, lineSize * leading * 3), max: lineSize, min: lineSize,
                leading, weight: 400, family: SANS, balanced: false
            });
            // A supporting line cut short reads badly; drop it unless it is the only one.
            if (block.truncated && lines.length) break;
            lines.push(block);
            used += blockHeight(block) + 10 * s;
        }
        const titleH = room - subH - used - (used ? 20 * s : 0);
        const title = fit(ctx, spec.title, {
            em: spec.em, maxW: innerW, maxH: titleH, max: portrait ? 124 : 80, min: 30 * s, leading: 1.04
        });
        return { title, subtitle, lines, height: blockHeight(title) + subH + used + 30 * s };
    }

    async function render(spec, format = 'landscape') {
        await loadFonts();
        const m = SIZES[format];
        const canvas = document.createElement('canvas');
        canvas.width = m.w; canvas.height = m.h;
        const ctx = canvas.getContext('2d');
        const { s, pad, w, h } = m;
        drawGround(ctx, m, hashSeed(`${spec.kind}|${spec.title}`));
        drawFrame(ctx, m);
        const headerY = drawHeader(ctx, m);

        const hasBars = spec.kind === 'meet' && spec.bars && spec.bars.length === 2;
        const marks = hasBars ? spec.bars.flatMap(b => [b.birth, b.death]) : [spec.marker?.from, spec.marker?.to];
        const footY = drawFooter(ctx, m, bcNote(marks));
        const innerW = w - pad * 2;

        // Vertical budget: the text block between the header and the visual,
        // which is anchored to the bottom.
        const portrait = format === 'portrait';
        const eyebrowY = headerY + (portrait ? 110 : 74);
        const visualH = hasBars ? barsHeight(m.bs) : 62 * s;
        const visualTop = footY - 36 * s - visualH;
        const topStart = eyebrowY + 20 * s;
        const textBottom = visualTop - 26 * s;

        const text = layoutText(ctx, spec, { innerW, room: textBottom - topStart, s, portrait });
        // Spare height is split so the block sits a little below the header, not glued to it.
        const lift = Math.max(0, Math.min((textBottom - topStart - text.height) * (portrait ? 0.5 : 0.3), 220 * s));
        const accent = accentColor(spec.accent);
        drawEyebrow(ctx, spec.eyebrow || EYEBROWS[spec.kind] || EYEBROWS.fact, pad, eyebrowY + lift, s, spec.accent ? accent : null);
        let y = topStart + lift + 6 * s;
        y = drawBlock(ctx, text.title, pad, y, TEXT) + 10 * s;
        if (text.subtitle) y = drawBlock(ctx, text.subtitle, pad, y + 4 * s, GOLD_BRIGHT) + 10 * s;
        y += 6 * s;
        for (const block of text.lines) y = drawBlock(ctx, block, pad, y, DIM) + 10 * s;

        if (hasBars) drawBars(ctx, m, spec, visualTop, pad, w - pad);
        else drawStrip(ctx, pad, w - pad, visualTop + 30 * s, 12 * s, { marker: spec.marker, s });
        return canvas;
    }
    const GAP = 58;
    const barsHeight = s => (25 + 11 + 13 + 10 + 15) * s * 2 + GAP * s;

    // The default link-preview image: brand, tagline, and the whole timeline.
    async function renderSite() {
        await loadFonts();
        const m = SIZES.landscape;
        const { w, h, pad } = m;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        drawGround(ctx, m, hashSeed('site'));
        drawFrame(ctx, m);
        drawMark(ctx, pad, 92, 84);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        setTracking(ctx, -2.5);
        drawWordmark(ctx, pad - 3, 312, 124);
        setTracking(ctx, 0);
        ctx.font = font(400, 34, SANS);
        ctx.fillStyle = DIM;
        ctx.fillText('The whole story of Scripture on one timeline', pad, 372);

        const ticks = Store.events.filter(e => e.startYear != null && e.significance !== 'minor')
            .map(e => ({ year: e.startYear, major: e.significance === 'major' }));
        drawStrip(ctx, pad, w - pad, 506, 16, { ticks, s: 1 });
        ctx.font = font(700, 15, SANS);
        setTracking(ctx, 3);
        ctx.fillStyle = GOLD;
        ctx.fillText('CREATION', pad, 552);
        ctx.textAlign = 'right';
        ctx.fillText('TODAY', w - pad, 552);
        setTracking(ctx, 0);
        return canvas;
    }

    // ── Specs ───────────────────────────────────────────────────────────
    const absoluteUrl = hash => new URL(hash, window.location.href).href;

    function meetSpec(res) {
        const { a, b } = res;
        const url = absoluteUrl(Router.build('meet', [a.slug, b.slug]));
        if (!res.known) {
            return {
                kind: 'meet', title: `${a.name} and ${b.name}`, subtitle: 'Dates not recorded',
                lines: ['Scripture does not record enough dates to say whether their lives overlapped.'], url, accent: 'slate'
            };
        }
        const bars = [a, b].map(p => ({
            name: p.name, birth: p.birthYear, death: p.deathYear,
            birthApprox: p.birthApprox, deathApprox: p.deathApprox, group: p.role
        }));
        const { elder, younger, approx } = res;     // approx: the figure rests on an estimated year
        if (res.overlaps) {
            const years = res.years < 1 ? null : Time.years(res.years, { approx });
            const age = res.elderAgeAtStart;
            const about = elder.birthApprox || younger.birthApprox ? 'about ' : '';
            return {
                kind: 'meet', url, bars, bridge: { from: res.from, to: res.to, overlaps: true, approx },
                title: years ? `Their lives overlapped for ${years}.` : 'Their lives overlapped by less than a year.',
                em: years || 'less than a year',
                lines: age != null && res.from === younger.birthYear ? [`${elder.name} was ${about}${age} when ${younger.name} was born.`] : []
            };
        }
        const near = res.gap <= 100;
        const gap = Time.years(res.gap, { approx });
        return {
            kind: 'meet', url, bars, bridge: { from: res.from, to: res.to, overlaps: false, approx },
            title: near ? `They missed each other by ${gap}.` : `They lived ${gap} apart.`,
            em: gap,
            lines: near ? [`${elder.name} died ${gap} before ${younger.name} was born.`] : []
        };
    }

    // First sentences of a description, as short lines for a card.
    function sentences(text, count) {
        return (text || '').match(/[^.!?]+[.!?]+(?=\s|$)/g)?.slice(0, count).map(t => t.trim()) || [];
    }

    function entitySpec(x) {
        const person = x.kind === 'person';
        const group = person ? x.role : x.category;
        const start = person ? x.birthYear : x.startYear;
        const end = person ? x.deathYear : x.endYear;
        const era = Store.periodAt(start ?? x.span?.start);
        const label = person ? Store.roleLabel(x.role) : 'Event';
        return {
            kind: x.kind, title: x.name, subtitle: Store.dates(x), accent: group,
            eyebrow: [label, era?.name].filter(Boolean).join('  ·  '),
            lines: sentences(x.description, 3),
            marker: start == null ? null : { from: start, to: end ?? start },
            url: absoluteUrl(UI.href(x))
        };
    }

    // ── The dialog ──────────────────────────────────────────────────────
    const root = () => document.getElementById('share');
    let state = null;   // { spec, format, release, urls, blobs, token }

    function slug(text) {
        return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    }
    const toBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    function open(spec) {
        if (state) close();
        const el = root();
        if (!el) return;
        state = { spec, format: 'landscape', blobs: {}, token: 0 };
        build(el);
        el.hidden = false;
        document.body.classList.add('share-open');
        state.release = UI.trapFocus(el);
        el.querySelector('[data-primary]').focus();
        document.addEventListener('keydown', onKey, true);
        refresh();
    }

    function close() {
        const el = root();
        if (!state || !el) return;
        document.removeEventListener('keydown', onKey, true);
        el.hidden = true;
        document.body.classList.remove('share-open');
        UI.clear(el);
        state.release();
        state = null;
    }

    function onKey(e) {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        close();
    }

    function build(el) {
        const { h, icon } = UI;
        const canShare = typeof navigator.share === 'function';
        const formatButton = (format, label, size) => h('button', {
            type: 'button', class: 'share-format', dataset: { format }, 'aria-pressed': String(format === state.format),
            onclick: () => setFormat(format)
        }, h('span', null, label), h('small', null, size));
        UI.clear(el);
        el.append(
            h('div', { class: 'share-scrim', onclick: close }),
            h('div', { class: 'share-panel' },
                h('header', { class: 'share-head' },
                    h('div', null,
                        h('p', { class: 'eyebrow' }, 'Share'),
                        h('h2', { class: 'share-title' }, state.spec.title)),
                    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('close'))),
                h('div', { class: 'share-stage' },
                    h('div', { class: 'share-frame', dataset: { format: state.format } },
                        h('img', { class: 'share-preview', alt: `Share card: ${state.spec.title}` }),
                        h('div', { class: 'share-wait', 'aria-hidden': 'true' }))),
                h('div', { class: 'share-controls' },
                    h('div', { class: 'share-formats', role: 'group', 'aria-label': 'Card shape' },
                        formatButton('landscape', 'Landscape', '1200 × 630'),
                        formatButton('portrait', 'Portrait', '1080 × 1350')),
                    h('div', { class: 'share-actions' },
                        canShare ? h('button', { type: 'button', class: 'btn btn-primary', 'data-primary': '', onclick: send }, icon('share', 'icon-sm'), 'Share') : null,
                        h('button', { type: 'button', class: canShare ? 'btn' : 'btn btn-primary', 'data-primary': canShare ? null : '', onclick: download }, icon('download', 'icon-sm'), 'Download image'),
                        h('button', { type: 'button', class: 'btn', onclick: copyLink }, icon('link', 'icon-sm'), 'Copy link')))));
        if (canShare) el.querySelector('[data-primary]').focus();
    }

    function setFormat(format) {
        if (!state || state.format === format) return;
        state.format = format;
        const el = root();
        for (const b of el.querySelectorAll('.share-format')) b.setAttribute('aria-pressed', String(b.dataset.format === format));
        el.querySelector('.share-frame').dataset.format = format;
        refresh();
    }

    // Draw (or reuse) the card for the current format and show it.
    async function refresh() {
        const current = state, format = current.format, token = ++current.token;
        const frame = root().querySelector('.share-frame');
        const img = frame.querySelector('img');
        frame.classList.add('is-loading');
        const blob = await cardBlob(current, format);
        if (state !== current || token !== current.token) return;
        if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
        img.dataset.url = URL.createObjectURL(blob);
        img.src = img.dataset.url;
        frame.classList.remove('is-loading');
    }

    async function cardBlob(current, format) {
        if (!current.blobs[format]) current.blobs[format] = toBlob(await render(current.spec, format));
        return current.blobs[format];
    }

    async function currentFile() {
        const blob = await cardBlob(state, state.format);
        return new File([blob], `faith-through-time-${slug(state.spec.title) || 'card'}.png`, { type: 'image/png' });
    }

    async function send() {
        const { spec } = state;
        const file = await currentFile();
        const outcome = await UI.share({ title: spec.title, text: spec.subtitle || spec.title, url: spec.url, file });
        if (outcome === 'shared') shared('native');
        else if (outcome === 'copied') shared('copy_link');
    }

    function shared(method) {
        const { spec } = state;
        let item = spec.url || '';
        try { item = new URL(spec.url).hash.replace(/^#/, '') || item; } catch { /* keep the url */ }
        Analytics.event('share', { method, content_type: spec.kind, item_id: item });
    }

    async function download() {
        const file = await currentFile();
        const url = URL.createObjectURL(file);
        const a = UI.h('a', { href: url, download: file.name });
        document.body.append(a);
        a.click();
        a.remove();
        shared('download');
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    async function copyLink() {
        const ok = await UI.copy(state.spec.url);
        if (ok) shared('copy_link');
        UI.toast(ok ? 'Link copied' : 'Could not copy the link');
    }

    App.on('route', () => { if (state) close(); });

    return {
        open,
        meetCard: res => open(meetSpec(res)),
        entityCard: x => open(entitySpec(x)),
        specs: { meet: meetSpec, entity: entitySpec },
        render, renderSite
    };
})();

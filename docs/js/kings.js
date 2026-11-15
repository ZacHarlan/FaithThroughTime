// kings.js — the kings of Israel and Judah, and the prophets who spoke to them.
// A chart (reigns as blocks sized by their years, prophets as bars between the lanes) and a plain
// table of the same facts. Content is data/kings.json; this file only lays it out.
//
//   #/kings                 the chart
//   #/kings?sel=<slug>      the chart with one king or prophet selected (e.g. ?sel=hezekiah)
//   #/kings?view=list       the table
(() => {
    const { h } = UI;

    // ── Chart geometry ──────────────────────────────────────────────────
    const FROM = -1100, TO = -570;          // years shown (BC), a little either side of 1095–588
    const PX = 8;                           // pixels per year
    const AXIS_H = 30, EVENT_H = 48;        // year axis, then two rows of event labels
    const BLOCK_H = 94, ROW_GAP = 6;        // one sub-row of a lane (overlapping reigns get another)
    const BAR_H = 24, BAR_GAP = 6;          // prophet bars
    const LANE_GAP = 10;
    const MIN_W = 14;                       // the shortest reign is still a block you can see and press
    const VERTICAL_BELOW = 72;              // narrower blocks carry their name sideways
    const x = year => (year - FROM) * PX;
    const WIDTH = x(TO);

    const VERDICTS = {
        good: { word: 'Right', mark: '✓', text: 'The text says he did what was right in the sight of the LORD.' },
        evil: { word: 'Evil', mark: '✕', text: 'The text says he did evil in the sight of the LORD.' },
        mixed: { word: 'Mixed', mark: '◐', text: 'The text qualifies its verdict: right in part, or for a time.' },
        none: { word: 'No verdict', mark: '–', text: 'The text gives no verdict on him.' }
    };
    const KINGDOMS = { united: 'United kingdom', judah: 'Judah', israel: 'Israel', both: 'Judah and Israel' };

    // Events marked on the chart; years are read from the dataset when it has the event.
    const EVENTS = [
        { id: 422, label: 'Temple dedicated', year: -1004, row: 0, side: 'right' },
        { id: 30, label: 'The kingdom divides', year: -975, row: 1, side: 'right' },
        { id: 32, label: 'Samaria falls', year: -721, row: 0, side: 'right' },
        { id: 470, label: 'Jehoiachin exiled', year: -599, row: 0, side: 'left' },
        { id: 35, label: 'Jerusalem falls', year: -588, row: 1, side: 'left' }
    ];

    let root, data = null, loading = null;
    let kings = [], prophets = [];
    let selected = null;                    // a king or prophet record
    let view = 'chart';
    let scroller, cardBox, chartBox, listBox, toggle;
    let rows = [];                          // keyboard rows of chart items
    let nodes = new Map();                  // record → button

    const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const shortName = name => name.replace(/ of (Judah|Israel)$/, '');
    const isKing = r => 'verdict' in r;
    const verdictOf = k => VERDICTS[k.verdict] || VERDICTS.none;
    const reign = r => (r.start === r.end ? Time.year(r.start) : Time.span(r.start, r.end));

    // Ussher's years are the app's; when a king is in the dataset and his years differ, the dataset is read as the
    // authority only for the link, never rewritten here.
    function personOf(r) { return r.person != null ? Store.person(r.person) : null; }

    function readHref(ref) {
        const m = /^((?:[123] )?[A-Za-z]+)\s+(\d+)(?::(\d+))?(?:–(?:(\d+):)?(\d+))?$/.exec(ref);
        const book = m && Store.books.find(b => b.name === m[1]);
        if (!book) return '#/read';
        const sameChapter = !m[4];
        const verses = m[3] && sameChapter ? (m[5] ? `${m[3]}-${m[5]}` : m[3]) : '';
        return Router.build('read', [book.slug, m[2]], verses ? { v: verses } : {});
    }

    const byName = new Map();
    function index() {
        byName.clear();
        for (const k of kings) byName.set(k.name, k);
        for (const p of prophets) byName.set(p.name, p);
    }
    const prophetsOf = k => prophets.filter(p => p.kings.includes(k.name));
    const kingsOf = p => p.kings.map(n => byName.get(n)).filter(Boolean);

    // ── Layout ──────────────────────────────────────────────────────────
    // Greedy packing into sub-rows: each item goes in the first row where it does not overlap the one before.
    function pack(items, extent) {
        const ends = [];
        const placed = new Map();
        for (const it of [...items].sort((a, b) => extent(a)[0] - extent(b)[0] || extent(b)[1] - extent(a)[1])) {
            const [lo, hi] = extent(it);
            let r = ends.findIndex(end => lo >= end);
            if (r < 0) { r = ends.length; ends.push(0); }
            ends[r] = hi + 2;
            placed.set(it, r);
        }
        return { placed, count: Math.max(ends.length, 1) };
    }

    const kingExtent = k => [x(k.start), x(k.start) + Math.max((k.end - k.start) * PX, MIN_W)];
    const prophetExtent = p => {
        const lo = x(p.start), w = barWidth(p);
        const labelW = p.name.length * 7.2 + 36;
        return [lo, lo + Math.max(w, labelW)];
    };
    const barWidth = p => Math.max((Math.min(p.end, TO) - p.start) * PX, 10);

    // ── Building blocks ─────────────────────────────────────────────────
    function mark(glyph) { return h('span', { class: 'kings-mark', 'aria-hidden': 'true' }, glyph); }

    function kingBlock(k, top, height) {
        const w = Math.max((k.end - k.start) * PX, MIN_W);
        const narrow = w < VERTICAL_BELOW;
        const v = verdictOf(k);
        const label = `${k.name}, ${KINGDOMS[k.kingdom]}, ${reign(k)}, ${k.years}, ${v.word.toLowerCase()}`;
        const btn = h('button', {
            type: 'button', class: `kings-king is-${k.verdict}${narrow ? ' is-narrow' : ''}${k.kingdom === 'united' ? ' is-united' : ''}`,
            style: { left: `${x(k.start)}px`, top: `${top}px`, width: `${w}px`, height: `${height}px` },
            'aria-label': label, 'aria-pressed': 'false', title: `${k.name}, ${reign(k)}`,
            dataset: { slug: slug(k.name) },
            onclick: () => select(k, { focus: false })
        },
        mark(v.mark),
        h('span', { class: 'kings-king-name' }, shortName(k.name)),
        narrow ? null : h('span', { class: 'kings-king-years' }, k.years));
        nodes.set(k, btn);
        return btn;
    }

    function prophetBar(p, top) {
        const w = barWidth(p);
        const clipped = p.end > TO;
        const outside = w < p.name.length * 7.2 + 28;
        const btn = h('button', {
            type: 'button', class: `kings-prophet${p.uncertain ? ' is-uncertain' : ''}${outside ? ' is-short' : ''}${clipped ? ' is-clipped' : ''}`,
            style: { left: `${x(p.start)}px`, top: `${top}px`, width: `${w}px`, height: `${BAR_H}px` },
            'aria-label': `${p.name}, prophet, ${p.uncertain ? 'date uncertain, ' : ''}${Time.span(p.start, p.end)}`,
            'aria-pressed': 'false', title: p.name,
            dataset: { slug: slug(p.name) },
            onclick: () => select(p, { focus: false })
        },
        p.uncertain ? mark('?') : null,
        h('span', { class: 'kings-prophet-name' }, p.name),
        clipped ? mark('→') : null);
        nodes.set(p, btn);
        return btn;
    }

    function buildChart() {
        nodes = new Map();
        const united = kings.filter(k => k.kingdom === 'united');
        const judah = kings.filter(k => k.kingdom === 'judah');
        const israel = kings.filter(k => k.kingdom === 'israel');
        const jp = pack(judah, kingExtent), ip = pack(israel, kingExtent), pp = pack(prophets, prophetExtent);

        const yJ = AXIS_H + EVENT_H;
        const jH = jp.count * (BLOCK_H + ROW_GAP) - ROW_GAP;
        const yP = yJ + jH + LANE_GAP;
        const pH = pp.count * (BAR_H + BAR_GAP) - BAR_GAP;
        const yI = yP + pH + LANE_GAP;
        const iH = ip.count * (BLOCK_H + ROW_GAP) - ROW_GAP;
        const height = yI + iH + 8;

        const plot = h('div', { class: 'kings-plot', style: { width: `${WIDTH}px`, height: `${height}px` } });

        // Year axis and gridlines.
        for (let y = -1100; y <= -600; y += 50) {
            const major = y % 100 === 0;
            plot.append(h('div', { class: `kings-grid${major ? ' is-major' : ''}`, style: { left: `${x(y)}px`, top: `${AXIS_H - 6}px`, height: `${height - AXIS_H + 6}px` }, 'aria-hidden': 'true' }),
                h('span', { class: `kings-tick year${major ? ' is-major' : ''}`, style: { left: `${x(y)}px` }, 'aria-hidden': 'true' }, `${-y} BC`));
        }
        // Lane backgrounds.
        const lane = (cls, top, hgt) => plot.append(h('div', { class: `kings-lane ${cls}`, style: { top: `${top}px`, height: `${hgt}px` }, 'aria-hidden': 'true' }));
        lane('is-judah', yJ - 4, jH + 8);
        lane('is-prophets', yP - 4, pH + 8);
        lane('is-israel', yI - 4, iH + 8);

        // Events.
        for (const ev of EVENTS) {
            const row = Store.event(ev.id);
            const year = row?.startYear ?? ev.year;
            const left = ev.side === 'left';
            plot.append(
                h('div', { class: 'kings-event-line', style: { left: `${x(year)}px`, top: `${AXIS_H}px`, height: `${height - AXIS_H}px` }, 'aria-hidden': 'true' }),
                h('a', {
                    class: `kings-event is-${ev.side}`, href: row ? UI.href({ kind: 'event', slug: row.slug }) : null,
                    style: { left: `${x(year)}px`, top: `${AXIS_H + 2 + ev.row * 22}px` },
                    dataset: { event: ev.id }
                }, left ? null : mark('◆'), `${ev.label}, ${Time.year(year)}`, left ? mark('◆') : null));
        }

        // Reigns.
        for (const k of united) plot.append(kingBlock(k, yJ, yI + iH - yJ));
        for (const k of judah) plot.append(kingBlock(k, yJ + jp.placed.get(k) * (BLOCK_H + ROW_GAP), BLOCK_H));
        for (const k of israel) plot.append(kingBlock(k, yI + ip.placed.get(k) * (BLOCK_H + ROW_GAP), BLOCK_H));
        for (const p of prophets) plot.append(prophetBar(p, yP + pp.placed.get(p) * (BAR_H + BAR_GAP)));

        // Keyboard rows, in the order they read: Judah (with the united kings), prophets, Israel.
        const byStart = (a, b) => a.start - b.start || a.order - b.order;
        rows = [[...united, ...judah].sort(byStart), [...prophets].sort(byStart), [...israel].sort(byStart)];
        const first = rows[0][0];
        for (const [r, n] of nodes) n.tabIndex = r === first ? 0 : -1;

        const gutter = h('div', { class: 'kings-gutter', style: { height: `${height}px` }, 'aria-hidden': 'true' },
            gutterLabel('Judah', yJ, jH), gutterLabel('Prophets', yP, pH), gutterLabel('Israel', yI, iH));

        scroller = h('div', {
            class: 'kings-scroll', role: 'region', tabindex: '-1',
            'aria-label': 'Chart of the kings and prophets, from 1095 BC to 588 BC. Scrolls sideways.',
            onkeydown: onChartKey
        }, plot);
        return h('div', { class: 'kings-chart' }, gutter, scroller);
    }

    const gutterLabel = (text, top, hgt) =>
        h('span', { class: 'kings-gutter-label eyebrow', style: { top: `${top}px`, height: `${hgt}px` } }, text);

    // ── Keyboard: arrows move along a row, up and down change row ───────
    function onChartKey(e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const cur = [...nodes].find(([, n]) => n === document.activeElement)?.[0];
        if (!cur) return;
        const r = rows.findIndex(row => row.includes(cur));
        const row = rows[r], i = row.indexOf(cur);
        let target = null;
        if (e.key === 'ArrowRight') target = row[i + 1];
        else if (e.key === 'ArrowLeft') target = row[i - 1];
        else if (e.key === 'Home') target = row[0];
        else if (e.key === 'End') target = row[row.length - 1];
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const other = rows[r + (e.key === 'ArrowDown' ? 1 : -1)];
            if (other) {
                const mid = (cur.start + cur.end) / 2;
                target = other.reduce((best, c) => (Math.abs((c.start + c.end) / 2 - mid) < Math.abs((best.start + best.end) / 2 - mid) ? c : best));
            }
        } else return;
        e.preventDefault();
        if (target) focusItem(target);
    }

    function focusItem(r) {
        for (const [rec, n] of nodes) n.tabIndex = rec === r ? 0 : -1;
        const n = nodes.get(r);
        n.focus({ preventScroll: true });
        reveal(n);
    }

    function reveal(n) {
        const box = scroller.getBoundingClientRect(), b = n.getBoundingClientRect();
        if (b.left < box.left + 8) scroller.scrollLeft -= box.left + 8 - b.left;
        else if (b.right > box.right - 8) scroller.scrollLeft += b.right - (box.right - 8);
    }

    // ── Selection and the card ──────────────────────────────────────────
    function select(rec, { focus = false, scroll = false, push = true } = {}) {
        selected = rec;
        syncSelection();
        renderCard();
        if (focus && nodes.has(rec)) focusItem(rec);
        if (scroll && nodes.has(rec)) centre(nodes.get(rec));
        if (push) Router.replace(Router.build('kings', [], { sel: rec ? slug(rec.name) : '', view: view === 'list' ? 'list' : '' }));
    }

    function centre(n) {
        const box = scroller.getBoundingClientRect(), b = n.getBoundingClientRect();
        scroller.scrollLeft += b.left + b.width / 2 - (box.left + box.width / 2);
    }

    function syncSelection() {
        const related = new Set(selected ? (isKing(selected) ? prophetsOf(selected) : kingsOf(selected)) : []);
        chartBox.classList.toggle('has-sel', !!selected);
        for (const [rec, n] of nodes) {
            const on = rec === selected;
            n.classList.toggle('is-sel', on);
            n.classList.toggle('is-rel', related.has(rec));
            n.setAttribute('aria-pressed', String(on));
        }
    }

    function fact(label, value) {
        return value ? h('div', { class: 'kings-fact' }, h('dt', null, label), h('dd', null, value)) : null;
    }

    function recordChip(rec) {
        const king = isKing(rec);
        return h('button', {
            type: 'button', class: 'chip kings-chip', onclick: () => select(rec, { focus: false, scroll: view === 'chart' })
        }, h('span', { class: 'chip-dot', style: { '--chip': king ? verdictColor(rec.verdict) : 'var(--fam-violet)' } }),
        rec.name, h('span', { class: 'chip-sub' }, reign(rec)));
    }

    const verdictColor = v => `var(--v-${VERDICTS[v] ? v : 'none'})`;

    function renderCard() {
        UI.clear(cardBox);
        const rec = selected;
        if (!rec) {
            cardBox.append(h('p', { class: 'kings-hint' }, 'Select a king or a prophet to see his reign, what Scripture says of him, and who spoke to whom.'));
            return;
        }
        const king = isKing(rec);
        const person = personOf(rec);
        const v = king ? verdictOf(rec) : null;
        const related = king ? prophetsOf(rec) : kingsOf(rec);
        const kingdomText = king ? (rec.kingdom === 'united' ? 'United kingdom' : `Kingdom of ${KINGDOMS[rec.kingdom]}`) : `Prophet · ${KINGDOMS[rec.kingdom]}`;
        cardBox.append(h('article', { class: 'card kings-card', 'aria-labelledby': 'kings-card-title' },
            h('header', { class: 'kings-card-head' },
                h('p', { class: 'eyebrow' }, king ? `${kingdomText} · ${ordinal(rec)}` : kingdomText),
                h('h2', { id: 'kings-card-title', tabindex: '-1' }, rec.name),
                king ? h('p', { class: `kings-verdict is-${rec.verdict}` }, mark(v.mark), h('strong', null, v.word), ` — ${v.text}`) : null),
            h('dl', { class: 'kings-facts' },
                fact(king ? 'Reign' : 'Active', h('span', { class: 'year' }, reign(rec), rec.uncertain ? ' (uncertain)' : '')),
                king ? fact('Scripture’s figure', rec.years) : null,
                king ? fact('Accession', rec.synchronism) : null,
                fact('Where it is told', rec.ref)),
            h('p', { class: 'kings-note' }, rec.note),
            related.length || !king
                ? h('div', { class: 'kings-related' },
                    h('h3', null, king ? 'Prophets who spoke to him' : 'Kings he served under'),
                    related.length
                        ? h('div', { class: 'chip-row' }, related.map(recordChip))
                        : h('p', { class: 'kings-none' }, king ? '' : 'The book names no king, so none is listed.'))
                : h('div', { class: 'kings-related' }, h('h3', null, 'Prophets who spoke to him'),
                    h('p', { class: 'kings-none' }, 'The text names no prophet speaking to him.')),
            h('div', { class: 'kings-links' },
                h('a', { class: 'btn btn-primary btn-sm', href: readHref(rec.ref) }, UI.icon('book', 'icon-sm'), `Read ${rec.ref}`),
                person ? h('a', { class: 'btn btn-sm', href: UI.href({ kind: 'person', slug: person.slug }) }, UI.icon('person', 'icon-sm'), `About ${shortName(person.name)}`) : null)));
    }

    function ordinal(k) {
        return `king ${k.order} of ${kings.filter(x => x.kingdom === k.kingdom).length}`;
    }

    // ── List view ───────────────────────────────────────────────────────
    function buildList() {
        const wrap = h('div', { class: 'kings-list' });
        for (const kd of ['united', 'judah', 'israel']) {
            const rowsOf = kings.filter(k => k.kingdom === kd);
            wrap.append(h('section', { class: 'kings-list-section', 'aria-labelledby': `kings-list-${kd}` },
                h('h2', { id: `kings-list-${kd}` }, kd === 'united' ? 'The united kingdom' : `Kings of ${KINGDOMS[kd]}`),
                h('div', { class: 'kings-table-wrap', role: 'region', tabindex: '0', 'aria-label': `${KINGDOMS[kd]} kings, table` },
                    h('table', { class: 'kings-table' },
                        h('thead', null, h('tr', null, ['#', 'King', 'Reign', 'Scripture’s figure', 'Verdict', 'Began', 'Prophets'].map(t => h('th', { scope: 'col' }, t)))),
                        h('tbody', null, rowsOf.map(listRow))))));
        }
        wrap.append(h('section', { class: 'kings-list-section', 'aria-labelledby': 'kings-list-prophets' },
            h('h2', { id: 'kings-list-prophets' }, 'The prophets'),
            h('div', { class: 'kings-table-wrap', role: 'region', tabindex: '0', 'aria-label': 'Prophets, table' },
                h('table', { class: 'kings-table' },
                    h('thead', null, h('tr', null, ['Prophet', 'Active', 'Kings', 'Passage'].map(t => h('th', { scope: 'col' }, t)))),
                    h('tbody', null, prophets.map(prophetRow))))));
        return wrap;
    }

    const nameCell = rec => {
        const person = personOf(rec);
        return h('th', { scope: 'row' },
            person ? h('a', { href: UI.href({ kind: 'person', slug: person.slug }) }, rec.name) : rec.name);
    };

    function listRow(k) {
        const v = verdictOf(k);
        const ps = prophetsOf(k);
        return h('tr', { dataset: { slug: slug(k.name) } },
            h('td', { class: 'num' }, String(k.order)),
            nameCell(k),
            h('td', { class: 'year' }, reign(k)),
            h('td', null, k.years),
            h('td', null, h('span', { class: `kings-verdict is-${k.verdict}` }, mark(v.mark), v.word)),
            h('td', null, k.synchronism ? k.synchronism.replace(/^In the /, '').replace(/^./, c => c.toUpperCase()) : '—'),
            h('td', null, ps.length ? ps.map((p, i) => [i ? ', ' : '', h('button', { type: 'button', class: 'kings-link', onclick: () => showOnChart(p) }, p.name)]) : '—'));
    }

    function prophetRow(p) {
        return h('tr', { dataset: { slug: slug(p.name) } },
            nameCell(p),
            h('td', { class: 'year' }, Time.span(p.start, p.end), p.uncertain ? ' (uncertain)' : ''),
            h('td', null, p.kings.length ? p.kings.map((n, i) => [i ? ', ' : '', h('button', { type: 'button', class: 'kings-link', onclick: () => showOnChart(byName.get(n)) }, n)]) : '—'),
            h('td', null, h('a', { href: readHref(p.ref) }, p.ref)));
    }

    function showOnChart(rec) {
        setView('chart');
        select(rec, { focus: false, scroll: true });
        cardBox.scrollIntoView({ block: 'nearest', behavior: UI.reducedMotion() ? 'auto' : 'smooth' });
    }

    // ── Shell ───────────────────────────────────────────────────────────
    function legend() {
        const item = key => h('li', { class: `kings-key is-${key}` }, h('span', { class: 'kings-swatch' }, mark(VERDICTS[key].mark)), VERDICTS[key].word === 'Right' ? 'Did right' : VERDICTS[key].word === 'Evil' ? 'Did evil' : VERDICTS[key].word === 'Mixed' ? 'Mixed or qualified' : 'No verdict given');
        return h('ul', { class: 'kings-legend', 'aria-label': 'Key' },
            ['good', 'evil', 'mixed', 'none'].map(item),
            h('li', { class: 'kings-key is-prophet' }, h('span', { class: 'kings-swatch is-prophet' }), 'Prophet'),
            h('li', { class: 'kings-key is-uncertain' }, h('span', { class: 'kings-swatch is-prophet is-uncertain' }, mark('?')), 'Date uncertain'));
    }

    function setView(next) {
        view = next;
        chartBox.hidden = view !== 'chart';
        cardBox.hidden = view !== 'chart';
        listBox.hidden = view !== 'list';
        for (const b of toggle.querySelectorAll('button')) {
            const on = b.dataset.view === view;
            b.setAttribute('aria-pressed', String(on));
            b.classList.toggle('is-on', on);
        }
        Router.replace(Router.build('kings', [], { sel: selected ? slug(selected.name) : '', view: view === 'list' ? 'list' : '' }));
    }

    function skeleton() {
        toggle = h('div', { class: 'kings-toggle', role: 'group', 'aria-label': 'View' },
            ['chart', 'list'].map(v => h('button', {
                type: 'button', class: 'chip', dataset: { view: v }, 'aria-pressed': 'false',
                onclick: () => setView(v)
            }, UI.icon(v === 'chart' ? 'timeline' : 'scroll', 'icon-sm'), v === 'chart' ? 'Chart' : 'List')));
        chartBox = h('div', { class: 'kings-chartbox' });
        cardBox = h('div', { class: 'kings-cardbox', 'aria-live': 'polite' });
        listBox = h('div', { class: 'kings-listbox', hidden: true });
        root.append(h('div', { class: 'page kings-page' },
            h('header', { class: 'kings-head' },
                h('p', { class: 'eyebrow' }, 'Kings and prophets'),
                h('h1', { class: 'display' }, 'Who reigned, ', h('em', null, 'and who spoke to them.')),
                h('p', { class: 'lede' }, 'Saul, David and Solomon, then the two kingdoms from the division to the fall of Samaria and of Jerusalem. Each reign is sized by its years and marked by the verdict Scripture gives it; the prophets sit between the lanes.')),
            h('div', { class: 'kings-bar' }, toggle, legend()),
            chartBox, cardBox, listBox,
            h('p', { class: 'kings-foot' }, 'Years follow Ussher’s chronology, as everywhere in this app; see ', h('a', { href: '#/about' }, 'About the dates'), '. Modern reckonings run decades later.')));
    }

    function failure() {
        root.append(h('div', { class: 'page kings-page' },
            h('p', { class: 'eyebrow' }, 'Kings and prophets'),
            h('h1', { class: 'display' }, 'This could not be loaded'),
            h('p', { class: 'lede' }, 'Check your connection and try again.'),
            h('a', { class: 'btn', href: '#/study' }, 'Back to study tools')));
    }

    // ── Lifecycle ───────────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('kings');
        root.tabIndex = -1;
    }

    async function load() {
        if (data) return true;
        loading ||= Api.getKings();
        try { data = await loading; } catch { loading = null; return false; }
        if (!data || !data.kings?.length) { loading = null; data = null; return false; }
        kings = data.kings;
        prophets = data.prophets || [];
        index();
        return true;
    }

    async function show(route) {
        if (!chartBox && !(await load())) {
            if (!root.querySelector('.kings-page')) failure();
            return;
        }
        if (!chartBox) {
            skeleton();
            chartBox.append(buildChart());
            listBox.append(buildList());
        }
        const want = route.query.sel ? [...kings, ...prophets].find(r => slug(r.name) === route.query.sel) : null;
        const nextView = route.query.view === 'list' ? 'list' : 'chart';
        const firstShow = !chartBox.dataset.shown;
        chartBox.dataset.shown = '1';
        selected = want || null;
        view = nextView;
        chartBox.hidden = view !== 'chart';
        cardBox.hidden = view !== 'chart';
        listBox.hidden = view !== 'list';
        for (const b of toggle.querySelectorAll('button')) {
            const on = b.dataset.view === view;
            b.setAttribute('aria-pressed', String(on));
            b.classList.toggle('is-on', on);
        }
        syncSelection();
        renderCard();
        if (view === 'chart' && firstShow) {
            // Open at the selected reign, or at the start of the chart.
            requestAnimationFrame(() => { scroller.scrollLeft = 0; if (want && nodes.has(want)) centre(nodes.get(want)); });
        }
    }

    function hide() { /* nothing to release */ }

    const title = () => 'Kings and prophets';

    App.registerView('kings', { init, show, hide, title });
})();

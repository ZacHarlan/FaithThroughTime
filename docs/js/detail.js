// detail.js — the detail sheet for one person or event, shown over whatever view is underneath.
//
// Desktop: a panel docked to the right with no scrim, so the timeline beside it stays usable.
// Phones: a bottom sheet with a drag handle and two snap heights (half and full); dragging it
// down past the half height dismisses it. Close, Escape and Back all leave through
// App.closeOverlay(), so the URL is always the single source of truth.
const Detail = (() => {
    const { h } = UI;

    const LIST_LIMIT = 6;          // rows shown before "Show all"
    const CHIP_LIMIT = 10;         // chips shown before "Show all"
    const HALF = 0.55;             // phone half-snap height, as a share of the viewport
    const SWAP_MS = 140;           // cross-fade out before new content arrives
    const HIDE_MS = 560;           // a little longer than the slide-out transition

    const CONFIDENCE = {
        certain: { label: 'Certain', bars: 3, text: 'Anchored to records outside the Bible.' },
        probable: { label: 'Probable', bars: 2, text: 'Well supported by the evidence.' },
        possible: { label: 'Possible', bars: 1, text: 'An estimate.' },
        traditional: { label: 'Traditional', bars: 0, text: 'Follows Ussher’s chronology or church tradition.' }
    };

    // Store.relations(p) entries read "p is <type> of person", so the label shown beside the
    // other person is the inverse: if p is the mentor, the other person is p's student.
    const RELATION_LABEL = {
        mentor: ['Student', 'Students'], student: ['Mentor', 'Mentors'],
        successor: ['Predecessor', 'Predecessors'], predecessor: ['Successor', 'Successors'],
        contemporary: ['Contemporary', 'Contemporaries']
    };
    const FAMILY_TYPES = new Set(['parent', 'child', 'spouse', 'sibling']);
    const FIND = { person: key => Store.person(key), event: key => Store.event(key) };

    let el, bar, barTitle, scroller, body;
    let isOpen = false;
    let currentKey = null;
    let currentTitle = '';
    let returnFocus = null;
    let hideTimer = 0, swapTimer = 0;
    let titleObserver = null;
    let uid = 0;
    let chronology = null;

    // ── Shell ───────────────────────────────────────────────────────────
    function ensureShell() {
        if (el) return;
        el = document.getElementById('detail');
        barTitle = h('p', { class: 'ds-bar-title', 'aria-hidden': 'true' });
        bar = h('div', { class: 'ds-bar' },
            h('span', { class: 'ds-handle', 'aria-hidden': 'true' }),
            barTitle,
            h('button', { class: 'icon-btn ds-close', type: 'button', 'aria-label': 'Close details', onclick: () => App.closeOverlay() },
                UI.icon('close')));
        body = h('article', { class: 'ds-body' });
        scroller = h('div', { class: 'ds-scroll' }, body);
        el.append(bar, scroller);
        el.setAttribute('aria-labelledby', 'ds-title');

        titleObserver = new IntersectionObserver(
            ([entry]) => bar.classList.toggle('is-titled', !entry.isIntersecting),
            { root: scroller, threshold: 0 });

        document.addEventListener('keydown', onKeydown);
        bar.addEventListener('pointerdown', onDragStart);
        scroller.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', UI.debounce(onResize, 120));
    }

    function onKeydown(e) {
        if (e.key !== 'Escape' || !isOpen || e.defaultPrevented) return;
        // Search and Share sit above the sheet and close themselves first.
        if (document.querySelector('#search:not([hidden]), #share:not([hidden])')) return;
        App.closeOverlay();
    }

    // ── Overlay contract ────────────────────────────────────────────────
    function open(route) {
        ensureShell();
        const kind = route.view;
        const slug = route.parts[0];
        const entity = slug ? FIND[kind](slug) : null;
        const key = entity ? `${kind}:${entity.id}` : `missing:${kind}:${slug}`;
        if (isOpen && key === currentKey) return;
        currentKey = key;
        currentTitle = entity ? entity.name : 'Not found';

        if (isOpen) swap(() => fill(kind, entity));
        else show(() => fill(kind, entity));
        if (entity) App.emit('focus-item', { kind, id: entity.id });
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        currentKey = null;
        clearTimeout(swapTimer);
        body.classList.remove('is-swapping');      // a swap cut short must not hide the next sheet
        el.classList.remove('is-open');
        if (UI.isMobile()) setSheetY(sheetOffset('closed'));
        const hadFocus = el.contains(document.activeElement);
        hideTimer = setTimeout(() => {
            el.hidden = true;
            body.replaceChildren();
            titleObserver.disconnect();
        }, HIDE_MS);
        if (hadFocus && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
        returnFocus = null;
    }

    function title(route) {
        const entity = route.parts[0] ? FIND[route.view](route.parts[0]) : null;
        return entity ? entity.name : 'Not found';
    }

    // First arrival: slide in from the right (desktop) or up to half height (phone).
    function show(render) {
        clearTimeout(hideTimer);
        if (!el.contains(document.activeElement)) returnFocus = document.activeElement;
        isOpen = true;
        el.hidden = false;
        render();
        if (UI.isMobile()) {
            el.classList.add('is-dragging');            // place off-screen without animating
            setSheetY(sheetOffset('closed'));
            el.getBoundingClientRect();
            el.classList.remove('is-dragging');
            snapTo('half');
        } else {
            el.getBoundingClientRect();                 // commit the off-screen start position
        }
        el.classList.add('is-open');
    }

    // Another entity while open: fade the old entry out, the new one in, from the top.
    function swap(render) {
        clearTimeout(swapTimer);
        if (UI.reducedMotion()) { render(); return; }
        body.classList.add('is-swapping');
        swapTimer = setTimeout(render, SWAP_MS);   // fill() lifts is-swapping
    }

    function fill(kind, entity) {
        body.classList.remove('is-swapping');
        const era = entity ? eraOf(entity.span) : null;
        if (era) el.style.setProperty('--era', era.color);
        else el.style.removeProperty('--era');

        const content = !entity ? renderMissing(kind)
            : kind === 'person' ? renderPerson(entity, era) : renderEvent(entity, era);
        body.replaceChildren(...content.flat().filter(Boolean));
        scroller.scrollTop = 0;
        barTitle.textContent = currentTitle;
        bar.classList.remove('is-titled');

        if (entity) goDeeper(kind, entity, currentKey);

        const heading = body.querySelector('#ds-title');
        titleObserver.disconnect();
        if (heading) {
            titleObserver.observe(heading);
            heading.focus({ preventScroll: true });
        }
    }

    // ── Phone sheet: snap heights and dragging ──────────────────────────
    let snap = 'half';
    let sheetY = 0;
    let drag = null;

    function sheetOffset(name) {
        const height = el.offsetHeight;
        if (name === 'full') return 0;
        if (name === 'half') return Math.max(0, height - window.innerHeight * HALF);
        return height;
    }
    function setSheetY(y) {
        sheetY = y;
        el.style.setProperty('--y', `${y}px`);
    }
    function snapTo(name) {
        snap = name;
        el.classList.toggle('is-full', name === 'full');
        setSheetY(sheetOffset(name));
    }

    function onDragStart(e) {
        if (!UI.isMobile() || !isOpen || e.button > 0 || e.target.closest('button')) return;
        drag = { startY: e.clientY, from: sheetY, moved: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
        bar.setPointerCapture(e.pointerId);
        bar.addEventListener('pointermove', onDragMove);
        bar.addEventListener('pointerup', onDragEnd);
        bar.addEventListener('pointercancel', onDragEnd);
    }

    function onDragMove(e) {
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.abs(dy) < 4) return;
        if (!drag.moved) { drag.moved = true; el.classList.add('is-dragging'); }
        const y = drag.from + dy;
        setSheetY(y < 0 ? y / 4 : y);              // resist being pulled above full height
        drag.samples.push({ y: e.clientY, t: e.timeStamp });
        if (drag.samples.length > 5) drag.samples.shift();
    }

    function onDragEnd() {
        bar.removeEventListener('pointermove', onDragMove);
        bar.removeEventListener('pointerup', onDragEnd);
        bar.removeEventListener('pointercancel', onDragEnd);
        el.classList.remove('is-dragging');
        const { moved, samples } = drag;
        drag = null;
        if (!moved) { snapTo(snap === 'half' ? 'full' : 'half'); return; }   // a tap toggles

        // Project where a flick would carry the sheet, then settle on the nearest stop.
        const first = samples[0], last = samples[samples.length - 1];
        const velocity = (last.y - first.y) / Math.max(1, last.t - first.t);  // px per ms
        const projected = sheetY + velocity * 180;
        const stops = ['full', 'half', 'closed'];
        const nearest = stops.reduce((best, name) =>
            Math.abs(sheetOffset(name) - projected) < Math.abs(sheetOffset(best) - projected) ? name : best);
        if (nearest === 'closed') App.closeOverlay();
        else snapTo(nearest);
    }

    // At half height the lower part of the entry is off-screen; reading on expands the sheet.
    function onScroll() {
        if (isOpen && UI.isMobile() && snap === 'half' && scroller.scrollTop > 8) snapTo('full');
    }

    function onResize() {
        if (isOpen && UI.isMobile()) snapTo(snap);
    }

    // ── Shared helpers ──────────────────────────────────────────────────
    const midYear = (a, b) => Time.fromAxis((Time.toAxis(a) + Time.toAxis(b)) / 2);
    const eraOf = span => (span && span.start != null ? Store.periodAt(midYear(span.start, span.end)) : null);
    const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    const absoluteUrl = x => `${window.location.origin}${window.location.pathname}${UI.href(x)}`;
    const uniq = list => [...new Set(list)];
    const byStart = (a, b) => (a.span?.start ?? Infinity) - (b.span?.start ?? Infinity);

    function listText(words) {
        if (words.length < 2) return words.join('');
        return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
    }

    // A year for a compact column: the "c." is kept, but quiet.
    function yearCell(year, approx) {
        if (year == null) return '';
        return approx ? [h('span', { class: 'ds-c' }, 'c.'), ' ', Time.year(year)] : Time.year(year);
    }

    function section(heading, ...content) {
        return h('section', { class: 'ds-section' }, h('h2', { class: 'ds-h' }, heading), content);
    }

    // Long lists show the first `limit` items; the rest wait behind "Show all N".
    // A list only one item over the limit is shown whole — a button to reveal one is noise.
    function collapsible(items, limit, noun, tag, cls) {
        const list = h(tag, { class: cls }, items);
        if (items.length <= limit + 1) return list;
        items.slice(limit).forEach(item => { item.hidden = true; });
        const more = h('button', {
            class: 'ds-more', type: 'button',
            onclick: () => {
                items.forEach(item => { item.hidden = false; });
                more.remove();
                const target = items[limit];
                (target.matches('a, button') ? target : target.querySelector('a, button'))?.focus();
            }
        }, `Show all ${items.length} ${noun}`, UI.icon('chevron-down', 'icon-sm'));
        return [list, more];
    }

    function eyebrow(label, era) {
        if (label && era && label.toLowerCase() === era.name.toLowerCase()) label = '';  // "Exile · Exile"
        return h('p', { class: 'eyebrow ds-eyebrow' },
            label ? h('span', null, label) : null,
            label && era ? h('span', { class: 'ds-eyebrow-sep', 'aria-hidden': 'true' }, '·') : null,
            era ? h('a', { class: 'ds-era', href: UI.href(era) },
                h('span', { class: 'ds-era-dot', 'aria-hidden': 'true' }), era.name) : null);
    }

    function nameHeading(name) {
        return h('h1', { class: `ds-name${name.length > 24 ? ' is-long' : ''}`, id: 'ds-title', tabindex: '-1' }, name);
    }

    function confidenceBadge(level) {
        const info = CONFIDENCE[level];
        if (!info) return null;
        const tipId = `ds-tip-${++uid}`;
        const glyph = info.bars
            ? h('span', { class: 'ds-meter', 'aria-hidden': 'true' },
                [1, 2, 3].map(n => h('i', { class: n <= info.bars ? 'is-on' : null })))
            : UI.icon('scroll', 'ds-conf-icon');
        return h('span', { class: 'ds-conf' },
            h('button', { class: 'ds-conf-btn', type: 'button', 'aria-describedby': tipId },
                h('span', { class: 'ds-conf-key' }, 'Dating'), glyph, h('span', null, info.label)),
            h('span', { class: 'ds-tip', role: 'tooltip', id: tipId }, info.text));
    }

    function dateNotes(note, confidence) {
        return h('div', { class: 'ds-notes' },
            confidenceBadge(confidence),
            note ? h('span', { class: 'ds-note' }, note) : null,
            h('a', { class: 'ds-link', href: '#/about' }, 'About the dates'));
    }

    function prose(x) {
        return [
            x.description ? h('p', { class: 'ds-prose' }, x.description) : null,
            x.dateNotes ? h('details', { class: 'ds-dating' },
                h('summary', null, UI.icon('chevron-right', 'icon-sm ds-chev'), 'On the dating'),
                h('p', null, x.dateNotes)) : null
        ];
    }

    // ── The time bar: a life or an event drawn against its era ──────────
    function timeBar({ start, end, estimated, startApprox, endApprox, era, marks, label }) {
        if (start == null) return null;
        const A = Time.toAxis;
        const years = [start, end, ...marks.map(m => m.year)].map(A);
        let lo = Math.min(...years), hi = Math.max(...years);
        if (era) { lo = Math.min(lo, A(era.startYear)); hi = Math.max(hi, A(era.endYear)); }
        const pad = Math.max((hi - lo) * 0.06, 2);
        lo -= pad; hi += pad;
        const frac = y => (A(y) - lo) / (hi - lo);
        const pct = f => `${(f * 100).toFixed(3)}%`;

        const bands = Store.periods
            .filter(p => A(p.endYear) > lo && A(p.startYear) < hi)
            .map(p => {
                const a = Math.max(0, frac(p.startYear)), b = Math.min(1, frac(p.endYear));
                return { p, a, b };
            });
        const width = frac(end) - frac(start);
        const isPoint = width < 0.012;

        const track = h('div', { class: 'ds-tb-track' },
            bands.map(({ p, a, b }) => h('span', {
                class: 'ds-tb-era', title: p.name,
                style: `left:${pct(a)};width:${pct(b - a)};--c:${p.color}`
            })),
            h('span', {
                class: `ds-tb-span${isPoint ? ' is-point' : ''}${estimated ? ' is-estimated' : ''}`,
                style: isPoint ? `left:${pct(frac(start))}` : `left:${pct(frac(start))};width:${pct(width)}`
            }),
            marks.map(m => h('a', {
                class: 'ds-tb-mark', href: UI.href(m.entity), tabindex: '-1',
                title: `${m.entity.name} · ${Time.year(m.year)}`,
                style: `left:${pct(frac(m.year))};--chip:${UI.familyColor(m.entity.category)}`
            })));

        const eraLabels = bands.filter(({ a, b }) => b - a > 0.28).map(({ p, a, b }) =>
            h('span', { class: 'ds-tb-era-name', style: `left:${pct(a)};max-width:${pct(b - a)}` }, p.name));

        return h('figure', { class: 'ds-tb' },
            h('div', { class: 'ds-tb-visual', 'aria-hidden': 'true' },
                h('div', { class: 'ds-tb-eras' }, eraLabels),
                track,
                h('div', { class: 'ds-tb-years' }, spanLabels(start, end, frac, pct, estimated, startApprox, endApprox))),
            h('figcaption', { class: 'sr-only' }, label));
    }

    // One centred label when the bar is short; otherwise its two ends, kept inside the frame.
    function spanLabels(start, end, frac, pct, estimated, startApprox, endApprox) {
        const a = frac(start), b = frac(end);
        const cls = `ds-tb-year${estimated ? ' is-estimated' : ''}`;
        if (b - a < 0.5) {
            const mid = (a + b) / 2;
            const align = mid < 0.22 ? 'start' : mid > 0.78 ? 'end' : 'mid';
            const at = align === 'start' ? a : align === 'end' ? b : mid;
            const text = Time.span(start, end, { aApprox: startApprox, bApprox: endApprox });
            return h('span', { class: `${cls} is-${align}`, style: `left:${pct(at)}` }, text);
        }
        return [
            h('span', { class: `${cls} is-start`, style: `left:${pct(a)}` }, Time.year(start, { approx: startApprox })),
            h('span', { class: `${cls} is-end`, style: `left:${pct(b)}` }, Time.year(end, { approx: endApprox }))
        ];
    }

    // ── Rows ────────────────────────────────────────────────────────────
    function eventRow(e, sub) {
        return h('li', null, h('a', { class: 'ds-row', href: UI.href(e) },
            h('span', { class: 'ds-row-year year' }, yearCell(e.startYear, e.startApprox)),
            h('span', { class: 'ds-row-dot', style: `--chip:${UI.familyColor(e.category)}`, 'aria-hidden': 'true' }),
            h('span', { class: 'ds-row-main' },
                h('span', { class: 'ds-row-title' }, e.name),
                sub ? h('span', { class: 'ds-row-sub' }, sub) : null),
            UI.icon('chevron-right', 'icon-sm ds-row-go')));
    }

    function kinRow(label, people) {
        return h('div', { class: 'ds-kin' },
            h('span', { class: 'ds-kin-label' }, label),
            h('div', null, collapsible(people.map(p => UI.chip(p)), CHIP_LIMIT, label.toLowerCase(), 'div', 'chip-row')));
    }

    // ── Scripture ───────────────────────────────────────────────────────
    function scriptureSection(refs) {
        if (!refs.length) return null;
        const books = uniq(refs.map(r => Study.parse(r.ref)?.book).filter(Boolean));
        return section('Scripture', h('div', { class: 'ds-scrips' }, refs.map(scriptureRow)),
            books.length ? h('p', { class: 'ds-books' }, books.length === 1 ? 'About the book: ' : 'About the books: ',
                books.map((b, i) => [i ? ' · ' : '', h('a', { class: 'ds-link', href: `#/book/${b.slug}` }, b.name)])) : null);
    }

    function scriptureRow(s) {
        const panelId = `ds-scrip-${++uid}`;
        const panel = h('div', { class: 'ds-scrip-body', id: panelId, hidden: true });
        let loaded = false;
        const head = h('button', {
            class: 'ds-scrip-head', type: 'button', 'aria-expanded': 'false', 'aria-controls': panelId,
            onclick: async () => {
                const opening = head.getAttribute('aria-expanded') !== 'true';
                head.setAttribute('aria-expanded', String(opening));
                panel.hidden = !opening;
                if (!opening || loaded) return;
                loaded = true;
                panel.replaceChildren(h('p', { class: 'ds-caption' }, 'Opening the passage…'));
                const passage = await BibleText.getPassage(s.ref).catch(() => null);
                panel.replaceChildren(...passageView(s.ref, passage));
            }
        },
        UI.icon('book', 'ds-scrip-icon'),
        h('span', { class: 'ds-scrip-ref' }, s.ref, s.context ? h('span', { class: 'ds-row-sub' }, s.context) : null),
        UI.icon('chevron-down', 'icon-sm ds-chev'));
        return h('div', { class: 'ds-scrip' }, head, panel);
    }

    function passageView(ref, passage) {
        const link = readLink(BibleText.parseRef(ref));
        if (!passage) {
            return [h('p', { class: 'ds-caption' }, 'The text of this passage is not available here.'),
                link ? h('div', { class: 'ds-passage-foot' }, link) : null].filter(Boolean);
        }
        const { verses } = passage;
        const spansChapters = verses[0].c !== verses[verses.length - 1].c;
        const quote = h('blockquote', { class: 'scripture ds-passage' }, verses.map((v, i) => {
            const newChapter = i > 0 && v.c !== verses[i - 1].c;
            const num = spansChapters && (i === 0 || newChapter) ? `${v.c}:${v.v}` : String(v.v);
            return h('span', { class: 'ds-verse' }, h('sup', { class: 'ds-vn' }, num), v.text, ' ');
        }));
        const version = passage.versions.find(x => x.id === passage.version);
        return [quote, h('div', { class: 'ds-passage-foot' },
            h('span', null,
                version ? h('abbr', { title: version.label }, version.short) : null,
                passage.truncated ? ` · the first ${verses.length} verses` : null),
            link)];
    }

    function readLink(parsed) {
        if (!parsed) return null;
        const book = Store.books.find(b => b.name.toLowerCase() === parsed.book.toLowerCase());
        if (!book) return null;
        const { startCh, startV, endCh, endV } = parsed;
        const verses = startV == null ? null
            : endCh === startCh && endV != null && endV !== startV ? `${startV}-${endV}` : String(startV);
        return h('a', { class: 'ds-link', href: Router.build('read', [book.slug, startCh], { v: verses }) },
            'Read in context', UI.icon('arrow-right', 'icon-sm'));
    }

    // ── Actions ─────────────────────────────────────────────────────────
    function actions(x, spec) {
        const canFocus = typeof Timeline !== 'undefined' && typeof Timeline.focus === 'function';
        const canShare = typeof Share !== 'undefined' && typeof Share.open === 'function';
        return h('div', { class: 'ds-actions' },
            canFocus ? h('button', { class: 'btn', type: 'button', onclick: () => showOnTimeline(x) },
                UI.icon('timeline', 'icon-sm'), 'Show on timeline') : null,
            canShare ? h('button', { class: 'btn', type: 'button', onclick: () => Share.open(spec()) },
                UI.icon('share', 'icon-sm'), 'Share') : null,
            h('button', { class: 'btn ds-copy', type: 'button', 'aria-label': 'Copy link', title: 'Copy link', onclick: () => copyLink(x) },
                UI.icon('link', 'icon-sm')));
    }

    async function copyLink(x) {
        UI.toast(await UI.copy(absoluteUrl(x)) ? 'Link copied' : 'Could not copy the link');
    }

    // On desktop the sheet can stay beside the timeline; on a phone it would cover it.
    function showOnTimeline(x) {
        const focus = () => Timeline.focus(x.kind, x.slug);
        if (App.view === 'timeline') {
            if (UI.isMobile()) App.closeOverlay();
            focus();
            return;
        }
        const off = App.on('route', () => { off(); focus(); });
        Router.go(Router.build('timeline'));
    }

    // ── Person ──────────────────────────────────────────────────────────
    function renderPerson(p, era) {
        return [
            personHeader(p, era),
            actions(p, () => personShare(p, era)),
            p.span ? timeBar({
                start: p.span.start, end: p.span.end, estimated: p.span.estimated, era,
                startApprox: p.span.estimated || p.birthApprox, endApprox: p.span.estimated || p.deathApprox,
                marks: Store.eventsOf(p).filter(l => l.event.startYear != null)
                    .map(l => ({ year: l.event.startYear, entity: l.event })),
                label: `${p.name}: ${personDates(p)}${era ? `, in the ${era.name} era` : ''}.`
            }) : null,
            prose(p),
            h('div', { class: 'ds-dict', hidden: true }),
            personEvents(p),
            family(p),
            connections(p),
            overlapping(p),
            scriptureSection(p.scripture),
            deeperSlot(),
            h('div', { class: 'ornament ds-end', 'aria-hidden': 'true' }, h('span'))
        ];
    }

    function personHeader(p, era) {
        const life = Store.lifespan(p);
        return h('header', { class: 'ds-head' },
            eyebrow(Store.roleLabel(p.role), era),
            nameHeading(p.name),
            p.altNames.length ? h('p', { class: 'ds-alt' }, `Also called ${listText(p.altNames)}`) : null,
            h('p', { class: 'ds-dates' },
                h('span', { class: 'year ds-dates-main' }, personDates(p)),
                life != null ? [h('span', { class: 'ds-sep', 'aria-hidden': 'true' }, '·'),
                    h('span', { class: 'ds-dates-sub' }, `lived ${Time.years(life)}`)] : null),
            dateNotes(personDateNote(p), p.dateConfidence));
    }

    function personDates(p) {
        if (p.birthYear != null && p.deathYear == null) return `Born ${Time.year(p.birthYear, { approx: p.birthApprox })}`;
        if (p.birthYear == null && p.deathYear != null) return `Died ${Time.year(p.deathYear, { approx: p.deathApprox })}`;
        if (p.birthYear == null) return 'Dates unknown';
        return Store.dates(p);
    }

    function personDateNote(p) {
        if (Store.datesKnown(p)) return p.birthApprox || p.deathApprox ? 'Approximate dates.' : null;
        const s = p.span;
        if (!s) return 'No dates are recorded, so they are not placed on the timeline.';
        const about = Time.year(s.start);
        if (s.interpolated) return `No dates are recorded. The timeline places them about ${about} by spacing out the generations of the family line.`;
        if (p.birthYear == null && p.deathYear == null) return `No dates are recorded. The timeline places them about ${about} from the events of their life.`;
        return 'Only one date is recorded; the rest of the life is estimated.';
    }

    function personShare(p, era) {
        const life = Store.lifespan(p);
        const [top] = Store.contemporaries(p, { limit: 1 });
        return {
            kind: 'person', title: p.name, subtitle: personDates(p), url: absoluteUrl(p), accent: era?.color,
            lines: [
                [Store.roleLabel(p.role), era?.name].filter(Boolean).join(' · '),
                life != null ? `Lived ${Time.years(life)}` : null,
                top ? `Life overlapped with ${top.person.name} for ${Time.years(top.years, { approx: top.approx })}` : null
            ].filter(Boolean)
        };
    }

    function personEvents(p) {
        const links = Store.eventsOf(p);
        if (!links.length) return null;
        return section('Events',
            collapsible(links.map(l => eventRow(l.event, capitalize(l.role))), LIST_LIMIT, 'events', 'ul', 'ds-rows'));
    }

    // Parents and children come from father/mother ids and also from parent/child
    // relationships, which record some parents (often mothers) the ids leave out.
    function family(p) {
        const relPeople = type => Store.relations(p, type).map(r => r.person);
        const parents = uniq([...Store.parents(p), ...relPeople('child')]);
        const children = uniq([...Store.children(p), ...relPeople('parent')]).sort(byStart);
        const groups = [
            ['Parent', 'Parents', parents], ['Spouse', 'Spouses', Store.spouses(p)],
            ['Sibling', 'Siblings', Store.siblings(p)], ['Child', 'Children', children]
        ].filter(([, , people]) => people.length);
        if (!groups.length) return null;
        return section('Family',
            groups.map(([one, many, people]) => kinRow(people.length === 1 ? one : many, people)),
            h('a', { class: 'btn btn-quiet ds-tree', href: Router.build('family', [p.slug]) },
                UI.icon('tree', 'icon-sm'), 'See family tree', UI.icon('arrow-right', 'icon-sm')));
    }

    function connections(p) {
        const groups = new Map();
        for (const r of Store.relations(p)) {
            if (FAMILY_TYPES.has(r.type)) continue;
            const [one, many] = RELATION_LABEL[r.type] || [capitalize(r.type), capitalize(r.type)];
            if (!groups.has(one)) groups.set(one, { many, people: [] });
            groups.get(one).people.push(r.person);
        }
        if (!groups.size) return null;
        return section('Connections',
            [...groups].map(([one, { many, people }]) => kinRow(people.length === 1 ? one : many, people)));
    }

    function overlapping(p) {
        const list = Store.contemporaries(p, { limit: 24 });
        if (!list.length) return null;
        const chips = list.map(o => {
            const chip = UI.chip(o.person, { sub: Time.years(o.years, { approx: o.approx }) });
            chip.href = Router.build('meet', [p.slug, o.person.slug]);
            chip.setAttribute('aria-label', `${o.person.name}, lives overlapped by ${Time.years(o.years, { approx: o.approx })}. Compare the two lives`);
            return chip;
        });
        const basis = p.dateConfidence === 'traditional'
            ? 'By recorded dates, which follow Ussher’s chronology.' : 'By recorded dates.';
        return section('Lives that overlapped',
            h('p', { class: 'ds-caption' }, `${basis} Choose one to compare the two lives.`),
            collapsible(chips, 8, 'people', 'div', 'chip-row'),
            h('div', { class: 'ds-meet' },
                h('a', { class: 'btn btn-primary', href: Router.build('meet', [p.slug]) },
                    UI.icon('overlap', 'icon-sm'), `Did ${p.name} meet…?`)));
    }

    // ── Event ───────────────────────────────────────────────────────────
    function renderEvent(e, era) {
        const { start, end } = e.span;
        return [
            eventHeader(e, era),
            actions(e, () => eventShare(e, era)),
            timeBar({
                start, end, estimated: false, startApprox: !!e.startApprox, endApprox: !!e.endApprox, era, marks: [],
                label: `${e.name}: ${Store.dates(e)}${era ? `, in the ${era.name} era` : ''}.`
            }),
            prose(e),
            eventPeople(e),
            eventPlaces(e),
            scriptureSection(e.scripture),
            deeperSlot(),
            aroundTheTime(e),
            h('div', { class: 'ornament ds-end', 'aria-hidden': 'true' }, h('span')),
            pager(e)
        ];
    }

    const categoryLabel = c => (!c || c === 'other' ? 'Event' : capitalize(c));
    const duration = e => (e.endYear != null && e.endYear !== e.startYear ? Time.between(e.startYear, e.endYear) : null);

    function eventHeader(e, era) {
        const years = duration(e);
        const isRange = years != null;
        const approx = e.startApprox || (isRange && e.endApprox);
        return h('header', { class: 'ds-head' },
            eyebrow(categoryLabel(e.category), era),
            nameHeading(e.name),
            h('p', { class: 'ds-dates' },
                h('span', { class: 'year ds-dates-main' }, Store.dates(e)),
                isRange ? [h('span', { class: 'ds-sep', 'aria-hidden': 'true' }, '·'),
                    h('span', { class: 'ds-dates-sub' }, Time.years(years))] : null),
            dateNotes(approx ? (isRange ? 'Approximate dates.' : 'Approximate date.') : null, e.dateConfidence));
    }

    function eventShare(e, era) {
        const years = duration(e);
        const names = Store.peopleOf(e).slice(0, 3).map(l => l.person.name);
        return {
            kind: 'event', title: e.name, subtitle: Store.dates(e), url: absoluteUrl(e), accent: era?.color,
            lines: [
                [categoryLabel(e.category), era?.name].filter(Boolean).join(' · '),
                years != null ? `Lasted ${Time.years(years)}` : null,
                names.length ? `With ${listText(names)}` : null
            ].filter(Boolean)
        };
    }

    function eventPeople(e) {
        const links = Store.peopleOf(e);
        if (!links.length) return null;
        return section('People',
            collapsible(links.map(l => UI.chip(l.person, { sub: capitalize(l.role) })), CHIP_LIMIT + 2, 'people', 'div', 'chip-row'));
    }

    function eventPlaces(e) {
        const places = Store.locationsOf(e);
        if (!places.length) return null;
        return section('Places', h('ul', { class: 'ds-places' }, places.map(l => {
            const sub = [l.modernName && l.modernName !== l.name ? `Today ${l.modernName}` : null, l.region]
                .filter(Boolean).join(' · ');
            return h('li', { class: 'ds-place' },
                UI.icon('pin', 'ds-place-icon'),
                h('span', { class: 'ds-row-main' },
                    h('a', { class: 'ds-row-title ds-place-link', href: `#/place/${l.slug}` }, l.name),
                    sub ? h('span', { class: 'ds-row-sub' }, sub) : null),
                l.lat != null ? h('a', { class: 'btn btn-quiet ds-place-map', href: UI.href(l), 'aria-label': `See ${l.name} on the map` },
                    UI.icon('map', 'icon-sm'), 'See on map') : null);
        })));
    }

    // Widen the window until a few other events appear, then keep the most significant
    // ones nearest the event, shown in date order.
    function nearbyEvents(e) {
        const { start, end } = e.span;
        const mid = Time.toAxis(midYear(start, end));
        const distance = x => Math.abs(Time.toAxis(midYear(x.span.start, x.span.end)) - mid);
        const { prev, next } = neighbours(e);
        const skip = new Set([e, prev, next]);   // the pager already offers these
        let found = [];
        for (const w of [10, 30, 80, 200, 500]) {
            found = Store.eventsIn(start - w, end + w).filter(x => !skip.has(x));
            if (found.length >= 3) break;
        }
        return found
            .sort((a, b) => Store.SIG_RANK[a.significance] - Store.SIG_RANK[b.significance] || distance(a) - distance(b))
            .slice(0, 5)
            .sort((a, b) => a.span.start - b.span.start);
    }

    function aroundTheTime(e) {
        const year = e.span.start;
        if (year == null) return null;
        const involved = new Set(Store.peopleOf(e).map(l => l.person));
        const others = nearbyEvents(e);
        const alive = Store.aliveAt(year).filter(p => !involved.has(p)).slice(0, 12);
        if (!others.length && !alive.length) return null;
        return section('Around the same time',
            others.length ? [h('h3', { class: 'ds-sub' }, 'Other events'),
                h('ul', { class: 'ds-rows' }, others.map(x => eventRow(x)))] : null,
            alive.length ? [h('h3', { class: 'ds-sub' }, `Alive in ${Time.year(year)}`),
                collapsible(alive.map(p => {
                    const age = Store.ageIn(p, year);
                    return UI.chip(p, { sub: age > 0 ? `age ${age}` : null });
                }), 8, 'people', 'div', 'chip-row')] : null);
    }

    // The events either side of this one by date, as shown in the pager.
    function neighbours(e) {
        if (!chronology) {
            chronology = Store.events.filter(x => x.startYear != null)
                .sort((a, b) => a.startYear - b.startYear || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        }
        const i = chronology.indexOf(e);
        return i < 0 ? {} : { prev: chronology[i - 1], next: chronology[i + 1] };
    }

    function pager(e) {
        const { prev, next } = neighbours(e);
        if (!prev && !next) return null;
        const link = (x, dir) => h('a', { class: `ds-page is-${dir}`, href: UI.href(x), rel: dir },
            h('span', { class: 'ds-page-label' },
                dir === 'prev' ? UI.icon('chevron-left', 'icon-sm') : null,
                dir === 'prev' ? 'Earlier' : 'Later',
                dir === 'next' ? UI.icon('chevron-right', 'icon-sm') : null),
            h('span', { class: 'ds-page-name' }, x.name),
            h('span', { class: 'ds-page-year year' }, Store.dates(x)));
        return h('nav', { class: 'ds-pager', 'aria-label': 'Events by date' },
            prev ? link(prev, 'prev') : null, next ? link(next, 'next') : null);
    }


    // ── Go deeper: links into the study tools, built from what applies ──
    const deeperSlot = () => h('section', { class: 'ds-section ds-deeper', hidden: true });

    let studyData = null;
    function loadStudyData() {
        if (!studyData) {
            studyData = Promise.all([Api.getKings(), Api.getParallels(), Api.getProphecy()])
                .then(([kings, parallels, prophecy]) => ({ kings, parallels, prophecy }))
                .catch(() => ({ kings: {}, parallels: {}, prophecy: {} }));
        }
        return studyData;
    }

    // A reference as a comparable range: [book slug, from, to] with chapter*1000+verse.
    function rangeOf(ref) {
        const p = Study.parse(ref);
        if (!p) return null;
        return [p.book.slug, p.startCh * 1000 + (p.startV ?? 0), p.endCh * 1000 + (p.endV ?? 999)];
    }
    function overlaps(refsA, refsB) {
        const b = refsB.map(rangeOf).filter(Boolean);
        return refsA.map(rangeOf).filter(Boolean)
            .some(a => b.some(x => a[0] === x[0] && a[1] <= x[2] && x[1] <= a[2]));
    }

    const kingSlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    function deepRow(href, title, sub) {
        return h('li', null, h('a', { class: 'ds-row ds-deep-row', href },
            h('span', { class: 'ds-row-main' },
                h('span', { class: 'ds-row-title' }, title),
                sub ? h('span', { class: 'ds-row-sub' }, sub) : null),
            UI.icon('chevron-right', 'icon-sm ds-row-go')));
    }

    function deeperRows(kind, x, data) {
        const rows = [];
        const refs = (x.scripture || []).map(s => s.ref);
        const k = [...(data.kings.kings || []), ...(data.kings.prophets || [])].find(r => kind === 'person' && r.person === x.id);
        if (k) {
            const isKing = (data.kings.kings || []).includes(k);
            rows.push(deepRow(`#/kings?sel=${kingSlug(k.name)}`, `See ${x.name} among the kings and prophets`,
                isKing && k.start != null ? `Reigned ${Time.span(k.start, k.end)}` : null));
        }
        const journeys = kind === 'person'
            ? Store.journeys.filter(j => (j.personIds || []).includes(x.id)).map(j => ({ j, step: 0 }))
            : Store.journeys.map(j => ({ j, step: (j.stops || []).findIndex(s => s.eventId === x.id) + 1 })).filter(o => o.step);
        for (const { j, step } of journeys.slice(0, 4)) {
            const stop = step ? j.stops[step - 1] : null;
            rows.push(deepRow(step ? `${UI.href(j)}?step=${step}` : UI.href(j),
                kind === 'person' ? `Travel with ${x.name}: ${j.name}` : `${j.name}, at this stop`,
                stop?.label || (j.stops ? `${j.stops.length} stops on the map` : null)));
        }
        for (const g of data.parallels.groups || []) for (const sec of g.sections || []) {
            if (rows.length > 14) break;
            if (overlaps(refs, sec.passages || [])) rows.push(deepRow(`#/parallel/${sec.id}`, sec.title, 'Parallel accounts'));
        }
        const pro = (data.prophecy.prophecies || []).filter(p => overlaps(refs, [...(p.prophecy || []), ...(p.fulfilment || [])]));
        for (const p of pro.slice(0, 4)) rows.push(deepRow(`#/prophecy/${p.id}`, p.title, 'Prophecy and fulfilment'));
        return rows;
    }

    async function goDeeper(kind, x, key) {
        const data = await loadStudyData();
        if (key !== currentKey) return;
        const slot = body.querySelector('.ds-deeper');
        const rows = slot ? deeperRows(kind, x, data) : [];
        if (rows.length) {
            slot.replaceChildren(h('h2', { class: 'ds-h' }, 'Go deeper'),
                h('ul', { class: 'ds-rows ds-deep' }, rows.slice(0, 8)));
            slot.hidden = false;
        }
        if (kind !== 'person' || typeof Dictionary === 'undefined' || !Dictionary.blockFor) return;
        try {
            const block = await Dictionary.blockFor(x);
            const dict = body.querySelector('.ds-dict');
            if (!block || key !== currentKey || !dict) return;
            dict.replaceChildren(h('details', { class: 'ds-dating ds-dictionary' },
                h('summary', null, UI.icon('chevron-right', 'icon-sm ds-chev'), 'From Easton’s Bible Dictionary'), block));
            dict.hidden = false;
        } catch { /* the dictionary is an extra; the sheet works without it */ }
    }

    // ── Not found ───────────────────────────────────────────────────────
    function renderMissing(kind) {
        return [h('div', { class: 'ds-missing' },
            h('p', { class: 'eyebrow' }, 'Not found'),
            h('h1', { class: 'ds-name', id: 'ds-title', tabindex: '-1' }, `We could not find that ${kind}`),
            h('p', { class: 'ds-caption' }, 'The link may be out of date, or the name may be spelled another way.'),
            h('button', { class: 'btn btn-primary', type: 'button', onclick: () => App.emit('open-search') },
                UI.icon('search', 'icon-sm'), 'Search people and events'))];
    }

    App.registerOverlay(['person', 'event'], { open, close, title });
    return {};
})();

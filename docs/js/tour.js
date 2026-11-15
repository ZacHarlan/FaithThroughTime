// tour.js — guided tours (#/story/<tourId>/<step>), narrated over the timeline.
// The timeline view renders the route; this module drives it through
// Timeline.flyTo / setSpotlight and puts the narration card in #tour-slot.
// Every Timeline call is guarded so the tour still reads well without it.
(() => {
    const FLY_MS = 1800;
    // Autoplay waits at least this long, and longer for long steps, so a
    // step is never taken away before it can be read.
    const AUTOPLAY_MIN_MS = 12000;
    const MS_PER_WORD = 300;
    const FADE_MS = 420;

    let toursPromise = null;
    let current = null;           // { tour, index } while a tour is on screen
    let card = null;              // built once, re-attached on each visit
    let els = {};
    let slot = null;
    let ownSlot = false;          // true when this module had to create #tour-slot
    let autoplay = !UI.reducedMotion();
    let timer = null;
    let routeToken = 0;

    const hasTimeline = () => typeof Timeline !== 'undefined';
    const norm = s => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

    // ── Route handling ──────────────────────────────────────────────────
    async function onRoute(route) {
        const token = ++routeToken;
        if (route.view !== 'story') {
            // A detail sheet opened from the tour sits over it: keep the card.
            if (current && Router.parse(App.basePath).view === 'story') { setAutoplay(false); return; }
            if (current) leave();
            return;
        }
        const { tours } = await loadTours();
        if (token !== routeToken) return;          // the route moved on while loading
        if (!tours.length) {
            UI.toast('The guided tour could not load');
            leave();
            return;
        }
        const tour = tours.find(t => t.id === route.parts[0]) || tours[0];
        const index = Math.min(Math.max((parseInt(route.parts[1], 10) || 1) - 1, 0), tour.steps.length - 1);
        const canonical = Router.build('story', [tour.id, index + 1]);
        if (route.path !== canonical) Router.replace(canonical);
        show(tour, index);
    }

    function loadTours() {
        if (!toursPromise) toursPromise = Api.getTours().then(d => ({ tours: Array.isArray(d?.tours) ? d.tours : [] }));
        return toursPromise;
    }

    function show(tour, index) {
        // Coming back from a sheet opened over the tour: everything is already in place.
        if (current && current.tour === tour && current.index === index && card.isConnected) { setTitle(); return; }
        const fresh = !current || current.tour !== tour;
        current = { tour, index };
        if (!card) buildCard();
        if (fresh) buildTrack(tour);
        mount();
        const step = tour.steps[index];
        els.name.textContent = tour.title;
        card.setAttribute('aria-label', `Guided tour: ${tour.title}`);
        els.count.textContent = `Chapter ${index + 1} of ${tour.steps.length}`;
        swapStage(stageFor(step, index === tour.steps.length - 1), !fresh);
        updateControls();
        setTitle();
        driveTimeline(step);
        scheduleAutoplay();
    }

    function setTitle() {
        const { tour, index } = current;
        document.title = `${tour.steps[index].title} — ${tour.title} — Faith Through Time`;
    }

    function leave() {
        clearTimeout(timer);
        if (hasTimeline()) Timeline.setSpotlight(null);
        card?.remove();
        if (ownSlot) { slot?.remove(); slot = null; ownSlot = false; }
        current = null;
    }

    // The timeline creates #tour-slot. Without it, make one; and if the
    // timeline view is not on screen at all (not built yet), lay the slot over
    // the views so the narration can still be read on its own.
    function mount() {
        slot = document.getElementById('tour-slot');
        if (!slot) {
            const view = document.getElementById('view-timeline');
            slot = UI.h('div', { id: 'tour-slot' });
            (view && !view.hidden ? view : document.getElementById('views')).append(slot);
            ownSlot = true;
        }
        if (card.parentNode !== slot) {
            slot.append(card);
            card.classList.remove('rise');
            void card.offsetWidth;   // restart the entrance animation
            card.classList.add('rise');
        }
    }

    // How much of the timeline the card covers, so the step is framed in the
    // part left clear: its right edge on desktop, its top edge on phones
    // (where it is docked along the bottom). A little air is added.
    function cardInset() {
        if (!slot || !card?.isConnected) return null;
        const view = slot.getBoundingClientRect(), box = card.getBoundingClientRect();
        if (!box.width) return null;
        return UI.isMobile()
            ? { bottom: Math.max(0, view.bottom - box.top + 12) }
            : { left: Math.max(0, box.right - view.left + 24) };
    }

    function driveTimeline(step) {
        if (!hasTimeline()) return;
        Timeline.flyTo({ year: step.year, span: step.span, duration: UI.reducedMotion() ? 0 : FLY_MS, inset: cardInset() });
        const keys = (step.spotlight || []).map(s => {
            const item = s.kind === 'person' ? Store.person(s.slug) : Store.event(s.slug);
            return item ? `${s.kind === 'person' ? 'p' : 'e'}${item.id}` : null;
        }).filter(Boolean);
        Timeline.setSpotlight(keys.length ? keys : null);
    }

    // ── Navigation ──────────────────────────────────────────────────────
    function goTo(index) {
        if (!current) return;
        const last = current.tour.steps.length - 1;
        if (index < 0 || index > last || index === current.index) return;
        Router.go(Router.build('story', [current.tour.id, index + 1]));
    }

    // Leave the tour for the free timeline, keeping what is on screen.
    function exit() {
        if (!current) return;
        const step = current.tour.steps[current.index];
        const view = hasTimeline() ? Timeline.getView() : { year: step.year, span: step.span };
        Router.go(Router.build('timeline', [], { y: Math.round(view.year), span: Math.round(view.span) }));
    }

    function onKey(e) {
        if (!current || !card.isConnected || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
        if (Router.parse().view !== 'story') return;                       // a sheet is open over the tour
        if (!document.getElementById('search')?.hidden) return;
        if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); setAutoplay(false); goTo(current.index + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); setAutoplay(false); goTo(current.index - 1); }
        else if (e.key === 'Escape') { e.preventDefault(); exit(); }
    }

    // Any hands-on interaction with the tour or the timeline pauses autoplay;
    // the play button itself is the one exception.
    function onInteract(e) {
        if (!current || !autoplay || els.play.contains(e.target)) return;
        if (slot?.parentNode?.contains(e.target)) setAutoplay(false);
    }

    // ── Autoplay ────────────────────────────────────────────────────────
    function setAutoplay(on) {
        if (autoplay === on) return;
        autoplay = on;
        if (current) { updateControls(); scheduleAutoplay(); }
    }

    function scheduleAutoplay() {
        clearTimeout(timer);
        const live = current && autoplay && current.index < current.tour.steps.length - 1;
        card.classList.toggle('is-playing', !!live);
        if (!live) return;
        const step = current.tour.steps[current.index];
        const ms = Math.max(AUTOPLAY_MIN_MS, step.body.split(/\s+/).length * MS_PER_WORD);
        card.style.setProperty('--tour-dwell', `${ms}ms`);
        // Restart the progress fill on the current segment.
        const seg = els.track.children[current.index];
        seg.classList.remove('is-filling');
        void seg.offsetWidth;
        seg.classList.add('is-filling');
        timer = setTimeout(() => goTo(current.index + 1), ms);
    }

    // ── DOM ─────────────────────────────────────────────────────────────
    function buildCard() {
        els.count = UI.h('p', { class: 'eyebrow tour-count' });
        els.name = UI.h('span', { class: 'tour-name' });
        els.stage = UI.h('div', { class: 'tour-stage', 'aria-live': 'polite' });
        els.track = UI.h('div', { class: 'tour-track', role: 'group', 'aria-label': 'Chapters' });
        attachScrub(els.track);
        els.prev = UI.h('button', {
            class: 'icon-btn tour-prev', type: 'button', 'aria-label': 'Previous chapter',
            onclick: () => goTo(current.index - 1)
        }, UI.icon('chevron-left'));
        els.play = UI.h('button', {
            class: 'icon-btn tour-play', type: 'button', onclick: () => setAutoplay(!autoplay)
        });
        els.nextLabel = UI.h('span', null, 'Next');
        els.next = UI.h('button', { class: 'btn btn-primary tour-next', type: 'button', onclick: onNext },
            els.nextLabel, UI.icon('arrow-right', 'icon-sm'));

        card = UI.h('section', { class: 'tour-card', role: 'region' },
            UI.h('header', { class: 'tour-top' },
                UI.h('div', { class: 'tour-heading' }, els.count, els.name),
                UI.h('button', { class: 'icon-btn tour-exit', type: 'button', 'aria-label': 'Exit the tour', title: 'Exit the tour (Esc)', onclick: exit },
                    UI.icon('close'))),
            els.stage,
            UI.h('div', { class: 'tour-nav' }, els.track, els.prev, els.play, els.next));
    }

    function onNext() {
        const last = current.index === current.tour.steps.length - 1;
        if (last) exit(); else goTo(current.index + 1);
    }

    function buildTrack(tour) {
        UI.clear(els.track);
        tour.steps.forEach((step, i) => {
            els.track.append(UI.h('button', {
                class: 'tour-seg', type: 'button', 'aria-label': `Chapter ${i + 1}: ${step.title}`,
                // Pointer presses are handled by the track (attachScrub); this is the keyboard path.
                title: step.title, onclick: e => { if (e.detail === 0) goTo(i); }
            }, UI.h('span', { class: 'tour-seg-bar' })));
        });
    }

    // On a phone a long tour leaves each chapter a few pixels wide, too narrow to tap.
    // So for pointers the whole track is one control, like a slider: press anywhere on
    // it, slide to the chapter (it lifts as it is aimed at), let go to open it.
    function attachScrub(track) {
        let aim = -1;
        const setAim = i => {
            track.children[aim]?.classList.remove('is-aim');
            aim = i;
            track.children[aim]?.classList.add('is-aim');
        };
        const indexAt = x => {
            let best = -1, dist = Infinity;
            [...track.children].forEach((seg, i) => {
                const r = seg.getBoundingClientRect();
                const d = Math.abs(x - (r.left + r.width / 2));
                if (d < dist) { dist = d; best = i; }
            });
            return best;
        };
        track.addEventListener('pointerdown', e => {
            if (e.button > 0) return;
            e.preventDefault();                 // no focus ring or text selection from a press
            track.setPointerCapture(e.pointerId);
            setAim(indexAt(e.clientX));
        });
        track.addEventListener('pointermove', e => { if (aim >= 0) setAim(indexAt(e.clientX)); });
        track.addEventListener('pointerup', () => {
            const i = aim;
            setAim(-1);
            if (i >= 0) goTo(i);
        });
        track.addEventListener('pointercancel', () => setAim(-1));
    }

    function updateControls() {
        const { tour, index } = current;
        const last = index === tour.steps.length - 1;
        [...els.track.children].forEach((seg, i) => {
            seg.classList.toggle('is-done', i < index);
            seg.classList.toggle('is-current', i === index);
            if (i === index) seg.setAttribute('aria-current', 'step'); else seg.removeAttribute('aria-current');
            if (i !== index) seg.classList.remove('is-filling');
        });
        els.prev.disabled = index === 0;
        els.nextLabel.textContent = last ? 'Explore on your own' : 'Next';
        els.play.hidden = last;
        els.play.setAttribute('aria-pressed', String(autoplay));
        els.play.setAttribute('aria-label', autoplay ? 'Pause the tour' : 'Play the tour automatically');
        els.play.replaceChildren(UI.icon(autoplay ? 'pause' : 'play'));
    }

    // One step's text: title, body, scripture, link, and on the last step the
    // invitation onward.
    function stageFor(step, last) {
        const linked = step.link ? (step.link.kind === 'person' ? Store.person(step.link.slug) : Store.event(step.link.slug)) : null;
        const scripture = step.scripture ? scriptureToggle(step.scripture) : null;
        const link = linked ? UI.h('a', { class: 'tour-link', href: UI.href(linked) },
            `Open ${linked.name}`, UI.icon('arrow-right', 'icon-sm')) : null;
        return UI.h('div', { class: 'tour-page' },
            UI.h('h2', { class: 'display tour-title' }, step.title),
            UI.h('p', { class: 'tour-body' }, step.body),
            scripture || link ? UI.h('div', { class: 'tour-meta' }, scripture?.button, link) : null,
            scripture?.passage,
            last ? invitation() : null);
    }

    function invitation() {
        return UI.h('div', { class: 'tour-invite' },
            UI.h('p', { class: 'tour-invite-label' }, 'Where next?'),
            UI.h('div', { class: 'chip-row' },
                UI.h('a', { class: 'chip', href: '#/meet' }, UI.icon('overlap', 'icon-sm'), 'Did they meet?'),
                UI.h('a', { class: 'chip', href: '#/family' }, UI.icon('tree', 'icon-sm'), 'Trace the family line')));
    }

    // "Genesis 12:1-3" as a button, and the passage it opens.
    function scriptureToggle(ref) {
        const passage = UI.h('div', { class: 'tour-passage', hidden: true });
        const btn = UI.h('button', { class: 'tour-ref', type: 'button', 'aria-expanded': 'false' },
            UI.icon('book', 'icon-sm'), UI.h('span', null, ref), UI.icon('chevron-down', 'icon-sm tour-ref-chev'));
        let loaded = false;
        btn.addEventListener('click', async () => {
            const open = btn.getAttribute('aria-expanded') !== 'true';
            btn.setAttribute('aria-expanded', String(open));
            passage.hidden = !open;
            if (open && !loaded) {
                loaded = true;
                passage.append(UI.h('p', { class: 'faint tour-passage-wait' }, 'Opening the passage…'));
                // A failed load reads as 'not available' rather than waiting forever.
                fillPassage(passage, ref, await BibleText.getPassage(ref).catch(() => null));
            }
        });
        return { button: btn, passage };
    }

    function fillPassage(el, ref, passage) {
        const readHref = readerHref(ref);
        const more = readHref ? UI.h('a', { class: 'tour-read', href: readHref }, 'Read it in context', UI.icon('arrow-right', 'icon-sm')) : null;
        if (!passage) {
            el.replaceChildren(UI.h('p', { class: 'dim' }, 'The text of this passage is not available here.'), more);
            return;
        }
        const multi = passage.verses.length > 1;
        el.replaceChildren(
            UI.h('blockquote', { class: 'scripture tour-verse' },
                passage.verses.map(v => [multi ? UI.h('sup', null, v.v) : null, `${v.text} `])),
            UI.h('p', { class: 'tour-passage-foot' },
                UI.h('span', { class: 'faint' }, passage.version.toUpperCase()), more));
    }

    function readerHref(ref) {
        const p = BibleText.parseRef(ref);
        if (!p) return null;
        const t = norm(p.book);
        const book = Store.books.find(b => norm(b.name) === t) || Store.books.find(b => norm(b.name).startsWith(t));
        if (!book) return null;
        const v = p.startV == null ? null : (p.endCh === p.startCh && p.endV !== p.startV ? `${p.startV}-${p.endV}` : p.startV);
        return Router.build('read', [book.slug, p.startCh], { v });
    }

    // Cross-fade between steps: the old page fades out on top while the new
    // one fades in, and the stage eases between their heights.
    function swapStage(next, animate) {
        const stage = els.stage;
        for (const old of stage.querySelectorAll('.is-leaving')) old.remove();
        const prev = stage.firstElementChild;
        stage.scrollTop = 0;
        if (!prev || !animate || UI.reducedMotion()) {
            stage.style.height = '';
            stage.replaceChildren(next);
            return;
        }
        const from = stage.offsetHeight;
        prev.classList.add('is-leaving');
        next.classList.add('is-entering');
        stage.append(next);
        stage.style.height = `${from}px`;
        const to = next.offsetHeight;
        void stage.offsetHeight;
        stage.style.height = `${to}px`;
        requestAnimationFrame(() => next.classList.remove('is-entering'));
        setTimeout(() => {
            prev.remove();
            if (stage.firstElementChild === next) stage.style.height = '';
        }, FADE_MS);
    }

    App.on('route', onRoute);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onInteract, true);
    document.addEventListener('wheel', onInteract, { capture: true, passive: true });
})();

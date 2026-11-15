// plan.js — a year of reading: the whole Bible in story order, one day at a time.
//
//   #/plan          today's day (by day of the year)
//   #/plan/<n>      day n of 365
//
// The plan itself is data/reading-plan.json: { title, notes, days: [{ day, passages, title, year }] }.
// Nothing is tracked except the last day opened, so "Continue" can return to it.
const Plan = (() => {
    const { h, icon } = UI;
    const LAST_KEY = 'ftt-plan-last';
    const DAYS = 365;
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // the plan year has no leap day

    let root, token = 0, data = null, current = 0;

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }
    };
    const dayHref = n => Router.build('plan', [n]);
    const lastDay = () => {
        const n = Number(store.get(LAST_KEY));
        return Number.isInteger(n) && n >= 1 && n <= DAYS ? n : null;
    };

    // Today as a plan day: 1 January is day 1; 29 February shares day 59; 31 December in a leap year is day 365.
    function todaysDay(now = new Date()) {
        const start = new Date(now.getFullYear(), 0, 1);
        let n = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 86400000) + 1;
        const leap = new Date(now.getFullYear(), 1, 29).getMonth() === 1;
        if (leap && n > 59) n -= 1;
        return Math.min(Math.max(n, 1), DAYS);
    }

    // "Psalms 8, 19, 23" or "Genesis 1–3" → { name, book, chapters: [..] }; chapters are what the reader opens.
    function parsePassage(text) {
        const m = /^(.+?) ([\d,–\- ]+)$/.exec(text);
        if (!m) return null;
        const name = m[1] === 'Psalm' ? 'Psalms' : m[1];
        const book = Store.books.find(b => b.name === name);
        if (!book) return null;
        const chapters = [];
        for (const part of m[2].split(',')) {
            const [a, z = a] = part.trim().split(/[–-]/).map(Number);
            for (let c = a; c <= z; c++) chapters.push(c);
        }
        return { label: text, book, chapters };
    }

    // The month and day of the month for a plan day, in a year with no leap day.
    function calendarDate(n) {
        let left = n;
        for (let m = 0; m < 12; m++) {
            if (left <= MONTH_LENGTHS[m]) return { month: m, date: left };
            left -= MONTH_LENGTHS[m];
        }
        return { month: 11, date: 31 };
    }

    // ── Pieces ──────────────────────────────────────────────────────────
    function whenLink(year) {
        const era = Store.periodAt(year);
        return h('a', {
            class: 'read-when plan-when', href: Router.build('timeline', [], { y: year, span: 120 }),
            style: era ? `--era: ${era.color}` : null
        },
            h('span', { class: 'read-when-era' }, h('span', { class: 'chip-dot', 'aria-hidden': 'true' }), era?.name || 'Timeline'),
            h('span', { class: 'year read-when-years' }, Time.year(year)),
            h('span', { class: 'read-when-go' }, 'See it on the timeline', icon('arrow-right', 'icon-sm')));
    }

    function passageCard(text) {
        const p = parsePassage(text);
        if (!p) return h('div', { class: 'card plan-passage' }, h('span', { class: 'plan-passage-name' }, text));
        const href = c => Router.build('read', [p.book.slug, c]);
        const many = p.chapters.length > 1;
        return h('div', { class: 'card plan-passage' },
            h('a', { class: 'plan-passage-name', href: href(p.chapters[0]) }, p.label, icon('arrow-right', 'icon-sm')),
            many ? h('div', { class: 'plan-chapters', role: 'group', 'aria-label': `Chapters of ${p.label}` },
                p.chapters.map(c => h('a', {
                    class: 'chip', href: href(c), 'aria-label': `${p.book.name} ${c}`
                }, String(c)))) : null);
    }

    function stepLink(n, dir) {
        const day = data.days[n - 1];
        const label = dir < 0 ? 'Previous day' : 'Next day';
        if (!day) return h('span', { class: 'plan-step is-empty' });
        return h('a', { class: `plan-step ${dir < 0 ? 'is-prev' : 'is-next'}`, href: dayHref(n), rel: dir < 0 ? 'prev' : 'next' },
            dir < 0 ? icon('chevron-left') : null,
            h('span', { class: 'plan-step-text' },
                h('span', { class: 'plan-step-label' }, label),
                h('span', { class: 'plan-step-day' }, `Day ${n}`),
                h('span', { class: 'plan-step-title' }, day.title)),
            dir > 0 ? icon('chevron-right') : null);
    }

    function calendar(n, today) {
        const sections = [];
        let day = 1;
        for (let m = 0; m < 12; m++) {
            const cells = [];
            for (let d = 1; d <= MONTH_LENGTHS[m]; d++, day++) {
                const entry = data.days[day - 1];
                const here = day === n;
                cells.push(h('a', {
                    class: `plan-cell${here ? ' is-current' : ''}${day === today ? ' is-today' : ''}`,
                    href: dayHref(day),
                    'aria-label': `Day ${day}, ${MONTHS[m]} ${d}: ${entry ? entry.title : ''}`,
                    'aria-current': here ? 'page' : null,
                    title: entry ? entry.passages.join(', ') : null
                }, String(day)));
            }
            sections.push(h('div', { class: 'plan-month' },
                h('h3', { class: 'plan-month-name' }, MONTHS[m]),
                h('div', { class: 'plan-cells' }, cells)));
        }
        return h('section', { class: 'plan-year', 'aria-labelledby': 'plan-year-h' },
            h('h2', { id: 'plan-year-h' }, 'The whole year'),
            h('p', { class: 'dim plan-year-hint' }, 'Day 1 is 1 January. Choose any day to jump to it.'),
            h('div', { class: 'plan-months' }, sections));
    }

    function aboutOrder() {
        const notes = (data.notes || '').trim();
        if (!notes) return null;
        const sentences = notes.match(/[^.]+\.(\s+|$)/g) || [notes];
        const short = sentences.slice(0, 2).join('').trim();
        const more = sentences.length > 2;
        return h('section', { class: 'plan-order', 'aria-labelledby': 'plan-order-h' },
            h('h2', { id: 'plan-order-h' }, 'How the plan is ordered'),
            h('p', { class: 'plan-order-short' }, short),
            more ? h('details', { class: 'plan-order-more' },
                h('summary', null, 'How each part of the Bible is placed'),
                h('p', null, notes)) : null);
    }

    // ── States ──────────────────────────────────────────────────────────
    function renderState(kind) {
        const copy = {
            unknown: ['Not found', 'That day is not in the plan', `The plan has ${DAYS} days. Choose one from the year, or start with today.`],
            offline: ['Offline', 'The reading plan could not be loaded', 'Check your connection and try again.']
        }[kind];
        const actions = [h('a', { class: 'btn btn-primary', href: '#/plan' }, 'Open today’s reading')];
        if (kind === 'offline') actions.unshift(h('button', { type: 'button', class: 'btn', onclick: () => show(Router.current) }, 'Try again'));
        root.replaceChildren(h('div', { class: 'page plan-page' },
            h('div', { class: 'plan-state rise', role: 'alert' },
                h('p', { class: 'eyebrow' }, copy[0]),
                h('h1', null, copy[1]),
                h('p', { class: 'lede' }, copy[2]),
                h('div', { class: 'plan-actions' }, actions))));
    }

    // ── A day ───────────────────────────────────────────────────────────
    function renderDay(n) {
        const day = data.days[n - 1];
        const today = todaysDay();
        const last = lastDay();
        current = n;
        store.set(LAST_KEY, String(n));

        const where = calendarDate(n);
        const extra = [];
        if (last && last !== n) {
            extra.push(h('a', { class: 'btn', href: dayHref(last), 'data-plan': 'continue' },
                `Continue with day ${last}`, icon('arrow-right', 'icon-sm')));
        }
        if (today !== n && today !== last) {
            extra.push(h('a', { class: 'btn btn-quiet', href: '#/plan', 'data-plan': 'today' }, `Today is day ${today}`));
        }

        root.replaceChildren(h('div', { class: 'page plan-page' },
            h('header', { class: 'plan-head rise' },
                h('p', { class: 'eyebrow' }, `${data.title || 'Reading plan'} · Day ${n} of ${DAYS}`),
                h('h1', { class: 'display plan-title' }, day.title),
                h('p', { class: 'plan-date dim' }, `${MONTHS[where.month]} ${where.date} in a year of ${DAYS} days`),
                extra.length ? h('div', { class: 'plan-actions' }, extra) : null),
            h('div', { class: 'plan-body' },
                h('section', { class: 'plan-today', 'aria-labelledby': 'plan-read-h' },
                    h('h2', { id: 'plan-read-h', class: 'plan-sub' }, 'Read today'),
                    h('div', { class: 'plan-passages' }, day.passages.map(passageCard))),
                day.year != null ? h('section', { class: 'plan-time', 'aria-labelledby': 'plan-when-h' },
                    h('h2', { id: 'plan-when-h', class: 'plan-sub' }, 'When this happened'),
                    whenLink(day.year)) : null),
            h('nav', { class: 'plan-steps', 'aria-label': 'Previous and next day' },
                stepLink(n - 1, -1), stepLink(n + 1, 1)),
            h('div', { class: 'ornament plan-ornament', 'aria-hidden': 'true' }, h('span')),
            calendar(n, today),
            aboutOrder()));
        root.scrollTop = 0;
        window.scrollTo(0, 0);
    }

    // ── View lifecycle ──────────────────────────────────────────────────
    function init(el) {
        root = el;
        root.classList.add('plan');
        root.tabIndex = -1;
        document.addEventListener('keydown', onKey);
    }

    // Left and right turn the day, unless the person is typing or a sheet is open.
    function onKey(e) {
        if (Router.current.view !== 'plan' || !current) return;
        if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
        if (!/^Arrow(Left|Right)$/.test(e.key)) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
        const next = current + (e.key === 'ArrowRight' ? 1 : -1);
        if (next >= 1 && next <= DAYS) Router.go(dayHref(next));
    }

    async function show(route) {
        const t = ++token;
        if (!data) {
            const loaded = await Api.getReadingPlan();
            if (t !== token) return;
            if (!loaded || !Array.isArray(loaded.days) || !loaded.days.length) { renderState('offline'); return; }
            data = loaded;
        }
        const wanted = route.parts[0];
        if (wanted == null) {
            const n = todaysDay();
            Router.replace(dayHref(n));
            return renderDay(n);
        }
        const n = Number(wanted);
        if (!Number.isInteger(n) || n < 1 || n > data.days.length) { current = 0; renderState('unknown'); return; }
        // A sheet closing over this view shows the same route again: keep the page as it is.
        if (current === n && root.querySelector('.plan-head')) return;
        renderDay(n);
    }

    function hide() { current = 0; }

    function title(route) {
        const n = Number(route.parts[0]);
        const day = route.parts[0] == null ? todaysDay() : n;
        return Number.isInteger(day) && day >= 1 && day <= DAYS ? `Reading plan — Day ${day}` : 'Reading plan';
    }

    App.registerView('plan', { init, show, hide, title });
    return {};
})();

// about.js — "About the dates": where the dates come from and how sure
// anyone can be. A short essay; every count, example and year in it is read
// from Store so the page stays true as the data is corrected. Nothing here is
// needed by other modules, so it defines no global.
(() => {
    const { h } = UI;
    const ISSUES_URL = 'https://github.com/ZacHarlan/FaithThroughTime/issues';

    // The four confidence labels, in order of firmness.
    const LEVELS = [
        { key: 'certain', label: 'Certain', meaning: 'Anchored to records outside the Bible, within a year or two.' },
        { key: 'probable', label: 'Probable', meaning: 'Well supported, within about a decade.' },
        { key: 'possible', label: 'Possible', meaning: 'An inferred estimate.' },
        { key: 'traditional', label: 'Traditional', meaning: 'Follows Ussher or church tradition without an independent anchor.' }
    ];

    function init(el) {
        const sections = [
            ['what', 'What this is', whatThisIs],
            ['ussher', 'Ussher’s chronology', ussher],
            ['others', 'Other reckonings', otherReckonings],
            ['confidence', 'How sure is each date?', confidence],
            ['meet', 'Reading “Did they meet?”', readingMeet],
            ['year-zero', 'There is no year zero', yearZero],
            ['genealogies', 'The two genealogies of Jesus', genealogies],
            ['places', 'Places on the map', places],
            ['scripture', 'Scripture text', scripture],
            ['eras', 'The eras', eras],
            ['corrections', 'Corrections', corrections]
        ].map(([id, title, body]) => ({ id, title, el: section(id, title, body()) }));

        const toc = h('nav', { class: 'about-toc', 'aria-label': 'On this page' },
            h('p', { class: 'eyebrow about-toc-title' }, 'On this page'),
            h('ol', null, sections.map(s => h('li', null,
                h('button', { type: 'button', dataset: { target: s.id }, onclick: () => jumpTo(s.el) }, s.title)))));

        el.append(h('div', { class: 'about' },
            h('header', { class: 'about-head' },
                h('p', { class: 'eyebrow' }, 'About the dates'),
                h('h1', { class: 'display about-title' }, 'Where the dates come from, ', h('em', null, 'and how sure anyone can be.')),
                h('p', { class: 'lede about-lede' },
                    'Every date on this timeline is a reading of ancient sources. Here is whose reading it follows, where scholars differ, and how to tell a firm date from a traditional one.')),
            h('div', { class: 'about-layout' },
                toc,
                h('article', { class: 'about-essay' },
                    sections.map(s => s.el),
                    h('footer', { class: 'about-foot' },
                        h('div', { class: 'ornament', 'aria-hidden': 'true' }, h('span')),
                        h('a', { class: 'btn', href: '#/timeline' }, 'Back to the timeline', UI.icon('arrow-right', 'icon-sm')))))));

        trackCurrent(el, toc, sections);
    }

    function section(id, title, body) {
        return h('section', { class: 'about-section', id: `about-${id}`, 'aria-labelledby': `about-${id}-h` },
            h('h2', { id: `about-${id}-h` }, title), body);
    }

    // Hash links would be read as routes, so the contents scroll by script.
    function jumpTo(target) {
        target.scrollIntoView({ behavior: UI.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        target.querySelector('h2').focus({ preventScroll: true });
    }

    function trackCurrent(el, toc, sections) {
        for (const s of sections) s.el.querySelector('h2').setAttribute('tabindex', '-1');
        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(entries => {
            const visible = entries.filter(e => e.isIntersecting);
            if (!visible.length) return;
            const id = visible[0].target.id.replace(/^about-/, '');
            for (const b of toc.querySelectorAll('button')) {
                const on = b.dataset.target === id;
                b.classList.toggle('is-current', on);
                if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
            }
        }, { root: el, rootMargin: '0px 0px -70% 0px' });
        for (const s of sections) io.observe(s.el);
    }

    // ── Small builders ──────────────────────────────────────────────────
    const p = (...kids) => h('p', null, ...kids);
    const count = n => n.toLocaleString('en-US');
    const plural = (n, one, many) => `${count(n)} ${n === 1 ? one : many}`;
    const link = (entity, text = entity.name) => h('a', { href: UI.href(entity) }, text);
    function list(items) {
        if (items.length < 2) return items;
        return items.flatMap((item, i) => [i === 0 ? null : i === items.length - 1 ? ' and ' : ', ', item]);
    }
    function vars(el, map) {
        for (const [k, v] of Object.entries(map)) el.style.setProperty(k, v);
        return el;
    }

    // ── Sections ────────────────────────────────────────────────────────
    function whatThisIs() {
        return [
            p('Faith Through Time sets the people and events of the Bible, and of the church that followed, on a single timeline. At present it holds ',
                `${plural(Store.people.length, 'person', 'people')}, ${plural(Store.events.length, 'event', 'events')} and ${plural(Store.locations.length, 'place', 'places')}.`),
            p('It is meant for reading and wonder rather than as a work of scholarship. Every date on it is a reading of ancient sources, and this page explains whose reading it follows and how firm each one is.')
        ];
    }

    function ussher() {
        // Years as the data gives them, so 'c.' appears exactly where a year is flagged approximate.
        const anchors = [
            [Store.event('creation'), Store.dates, 'Creation'],
            [Store.event('the-flood'), Store.dates, 'the Flood'],
            [Store.person('abraham'), x => Time.year(x.birthYear, { approx: x.birthApprox }), 'Abraham’s birth'],
            [Store.event('the-exodus'), Store.dates, 'the Exodus']
        ].filter(([x]) => x).map(([x, when, label]) => h('span', null, link(x, label), ' in ', h('span', { class: 'year' }, when(x))));
        return [
            p('Scripture is the authority. Where the Bible gives ages, reign lengths and intervals, those figures set the dates. Where it does not fix a year, the timeline follows the chronology of James Ussher, the seventeenth-century Archbishop of Armagh, published in his ',
                h('cite', null, 'Annales'), ' (1650; in English as ', h('cite', null, 'The Annals of the World'), ', 1658). Ussher added up the ages and reign lengths given in the Hebrew (Masoretic) text of the Bible and tied the total to an anchor in recorded history. His reckoning also dates the foreign kings, the years between the Testaments, and the New Testament to AD 73; church history after that uses standard historical dates.'),
            anchors.length ? p('His reckoning places ', list(anchors), '.') : null
        ];
    }

    function otherReckonings() {
        const exodus = Store.event('the-exodus');
        return [
            p('Ussher’s is one respected tradition among several. The Greek Septuagint gives longer spans for the generations before Abraham, which places Creation and the Flood earlier. Many scholars date the Exodus to about 1446 BC or about 1260 BC',
                exodus ? [' rather than ', h('span', { class: 'year' }, Store.dates(exodus))] : null,
                ', and Edwin Thiele’s reconstruction of the kings of Israel and Judah differs from Ussher’s by decades.'),
            p('Mixing systems would set side by side people dated by different reckonings and make their overlaps meaningless. So the timeline keeps to one consistent chronology, and notes alternatives on individual entries where they matter.')
        ];
    }

    function tally(entries) {
        const out = Object.fromEntries(LEVELS.map(l => [l.key, 0]));
        for (const x of entries) if (x.dateConfidence in out) out[x.dateConfidence]++;
        return out;
    }

    // A proportional bar of the four labels.
    function confidenceBar(counts, label) {
        const total = LEVELS.reduce((a, l) => a + counts[l.key], 0);
        const summary = LEVELS.map(l => `${counts[l.key]} ${l.label.toLowerCase()}`).join(', ');
        return h('div', { class: 'conf-bar', role: 'img', 'aria-label': `${label}: ${summary}` },
            total ? LEVELS.filter(l => counts[l.key]).map(l =>
                vars(h('span', { class: `conf-seg is-${l.key}`, title: `${l.label}: ${counts[l.key]}` }), { flex: `${counts[l.key]} 1 0` })) : null);
    }

    function confidence() {
        const people = tally(Store.people), events = tally(Store.events);
        // Events, not people: a person's label covers a whole life, and a
        // reign can be anchored while the birth year is still an estimate.
        const earliest = Store.events.filter(e => e.dateConfidence === 'certain' && e.startYear != null)
            .sort((a, b) => a.startYear - b.startYear)[0];
        const row = (label, counts, n) => h('div', { class: 'conf-row' },
            h('span', { class: 'conf-row-label' }, label),
            confidenceBar(counts, label),
            h('span', { class: 'conf-row-total num' }, count(n)));
        return [
            p('Every person and event carries one of four labels saying how firm its date is.'),
            h('figure', { class: 'about-fig conf-fig' },
                row('People', people, Store.people.length),
                row('Events', events, Store.events.length),
                h('dl', { class: 'conf-legend' }, LEVELS.map(l => h('div', { class: 'conf-item' },
                    h('dt', null, h('span', { class: `conf-swatch is-${l.key}`, 'aria-hidden': 'true' }), l.label),
                    h('dd', null, l.meaning),
                    h('dd', { class: 'conf-counts num' }, `${plural(people[l.key], 'person', 'people')} · ${plural(events[l.key], 'event', 'events')}`))))),
            earliest ? p('Dates grow firmer as history goes on. The earliest event on the timeline marked certain is ',
                link(earliest), ', in ', h('span', { class: 'year' }, Store.dates(earliest)), '.') : null,
            p('A “c.” before a year means it is approximate. People without both a birth and a death year in the data are placed by an estimate from their family and the events they took part in; those placements are never used to say whether two lives overlapped.')
        ];
    }

    function readingMeet() {
        const dated = Store.people.filter(Store.datesKnown);
        const estimated = dated.filter(x => x.birthApprox || x.deathApprox);
        return [
            p(h('a', { href: '#/meet' }, 'Did they meet?'),
                ' compares two lifetimes. When they overlap, it means only that both people were alive at the same time by this chronology, not that they met or knew of each other. The site says two people met only where Scripture records it.'),
            p('Overlaps are worked out from the birth and death years in the data. Many of those years, especially for people Scripture gives no ages for, are estimates, and are flagged as approximate. Where a comparison rests on one it says “about”, and the figure is only as good as the estimate.'),
            p(`Of the ${plural(Store.people.length, 'person', 'people')} on the timeline, ${count(dated.length)} have both years in the data, and ${count(estimated.length)} of those have at least one approximate year. Anyone without both years is not compared at all.`)
        ];
    }

    function yearZero() {
        const crosser = Store.people
            .filter(x => Store.datesKnown(x) && x.birthYear < 0 && x.deathYear > 0)
            .sort((a, b) => Store.SIG_RANK[a.significance] - Store.SIG_RANK[b.significance])[0];
        return [
            p('The calendar has no year zero: ', h('span', { class: 'year' }, Time.year(-1)), ' is followed directly by ',
                h('span', { class: 'year' }, Time.year(1)), '. So any span that crosses the boundary is one year shorter than simple subtraction suggests.',
                crosser ? [' ', link(crosser), ', dated here ', h('span', { class: 'year' }, Store.dates(crosser)),
                    ', is counted as living ', Time.years(Store.lifespan(crosser)),
                    ', not ', count(crosser.deathYear - crosser.birthYear), '.'] : null),
            p('Every age and span on the site is worked out this way. Because the sources give years rather than days, an age shown may still be a year more or less than the person’s age in fact.')
        ];
    }

    function genealogies() {
        const jesus = Store.person('jesus');
        const line = jesus ? Store.ancestors(jesus) : [];
        const solomon = Store.person('solomon');
        const tree = line.length ? p('The family tree does not choose between them. It follows the father recorded for each person, so its line from ',
            link(line[line.length - 1]), ' to ', h('a', { href: Router.build('family', [jesus.slug]) }, jesus.name), ' runs ',
            plural(line.length, 'generation', 'generations'), ' by way of ', link(line[0]),
            solomon && line.includes(solomon) ? ', following Matthew’s line through Solomon.' : '.') : null;
        return [
            p('Matthew traces the descent of Jesus from Abraham through David’s son Solomon (Matthew 1). Luke traces it back to Adam through another son of David, Nathan (Luke 3). The two lists differ for most of the generations between David and Joseph, and Christians have explained the difference in more than one way.'),
            tree
        ];
    }

    // Which site each debated place is pinned to, and the alternatives, are the data's to
    // say (and are corrected there), so the essay names only the places and links to them.
    function places() {
        const debated = ['mount-sinai', 'ur', 'red-sea-crossing'].map(Store.location).filter(Boolean);
        const unplaced = Store.locations.filter(l => l.lat == null || l.lng == null);
        return [
            p('Most places on the map are known with confidence. Some are not',
                debated.length ? [': ', list(debated.map(l => link(l))), debated.length === 1 ? ' is' : ' are',
                    ' among those whose sites are debated. For these the map marks the traditional site or one proposal, and the pin is best read as one proposal among several; each place’s card on the map sets out the others.'] : '.'),
            unplaced.length ? p(list(unplaced.map(l => l.name)), unplaced.length === 1 ? ' is' : ' are', ' not placed on the map at all.') : null
        ];
    }

    function scripture() {
        const others = h('span');
        BibleText.manifest().then(m => {
            const names = (m?.versions || []).filter(v => v.id !== 'esv').map(v => v.label);
            if (names.length) others.replaceChildren(' (', ...list(names), ')');
        });
        return [
            p('Passages are quoted from the English Standard Version. Other translations', others, ' can be chosen in the reader.')
        ];
    }

    function eras() {
        const itemsIn = period => Store.items.filter(i => Store.periodAt(i.start) === period);
        return [
            p(`The timeline is divided into ${count(Store.periods.length)} eras. Their boundaries are conventions for finding your way, not hard breaks in history. The bar beside each shows how firm its dates are, using the labels above.`),
            h('div', { class: 'about-table-wrap' },
                h('table', { class: 'about-table' },
                    h('thead', null, h('tr', null,
                        h('th', { scope: 'col' }, 'Era'),
                        h('th', { scope: 'col' }, 'Years'),
                        h('th', { scope: 'col', class: 'col-length' }, 'Length'),
                        h('th', { scope: 'col', class: 'col-sure' }, 'How sure'))),
                    h('tbody', null, Store.periods.map(period => {
                        const items = itemsIn(period);
                        const counts = Object.fromEntries(LEVELS.map(l => [l.key, items.filter(i => i.confidence === l.key).length]));
                        return h('tr', null,
                            h('th', { scope: 'row' },
                                h('a', { class: 'era-link', href: UI.href(period) },
                                    vars(h('span', { class: 'era-swatch', 'aria-hidden': 'true' }), { '--c': period.color }),
                                    period.name)),
                            h('td', { class: 'year' }, Time.span(period.startYear, period.endYear)),
                            h('td', { class: 'year col-length' }, Time.years(Time.between(period.startYear, period.endYear))),
                            h('td', { class: 'col-sure' }, confidenceBar(counts, period.name)));
                    }))))
        ];
    }

    function corrections() {
        return [
            p('The data is checked and corrected over time, and readers help. If a date, a name or a place looks wrong, please open an issue on the project’s GitHub page and say what you found and where.'),
            h('a', { class: 'btn about-report', href: ISSUES_URL, target: '_blank', rel: 'noopener' },
                'Report a correction', UI.icon('arrow-right', 'icon-sm'))
        ];
    }

    App.registerView('about', { init, title: () => 'About the dates' });
})();

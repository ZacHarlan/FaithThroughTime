// store.js — the dataset, indexed, plus every pure question the views ask of it.
// Loaded once; everything after that is synchronous and in memory.
//
//   Time   year arithmetic (there is no year 0) and formatting
//   Store  entities, lookups, family, overlap, contemporaries, search
//
// Years are integers: negative = BC, positive = AD. -1 is 1 BC, 1 is AD 1.

const Time = (() => {
    // Axis value: a continuous number line with no gap at the BC/AD boundary.
    const toAxis = y => (y < 0 ? y + 1 : y);
    const fromAxis = v => { const r = Math.round(v); return r <= 0 ? r - 1 : r; };

    // Whole years from a to b, e.g. 4 BC → AD 30 is 33.
    const between = (a, b) => (a == null || b == null ? null : toAxis(b) - toAxis(a));

    function year(y, { approx = false } = {}) {
        if (y == null) return 'unknown';
        const s = y < 0 ? `${-y} BC` : `AD ${y}`;
        return approx ? `c. ${s}` : s;
    }

    // "1996–1821 BC", "5 BC – AD 33", "AD 354–430"
    function span(a, b, { aApprox = false, bApprox = false } = {}) {
        if (a == null && b == null) return 'dates unknown';
        if (b == null || a === b) return year(a, { approx: aApprox });
        if (a == null) return `d. ${year(b, { approx: bApprox })}`;
        const c = aApprox || bApprox ? 'c. ' : '';
        if (a < 0 && b < 0) return `${c}${-a}–${-b} BC`;
        if (a > 0 && b > 0) return `${c}AD ${a}–${b}`;
        return `${c}${-a} BC – AD ${b}`;
    }

    // Move a year by n years along the axis (50 BC + 70 = AD 21, not AD 20).
    const add = (y, n) => fromAxis(toAxis(y) + n);

    // "58 years"; with { approx: true } "about 58 years" — for figures built on estimated dates.
    const years = (n, { approx = false } = {}) => (n == null ? ''
        : `${approx ? 'about ' : ''}${n.toLocaleString('en-US')} ${n === 1 ? 'year' : 'years'}`);

    return { toAxis, fromAxis, between, add, year, span, years, MIN: -4004, MAX: new Date().getFullYear() };
})();

const Store = (() => {
    let data = null;
    let loading = null;

    const people = [], events = [], periods = [], locations = [], books = [], journeys = [];
    const byId = { person: new Map(), event: new Map(), location: new Map(), book: new Map(), period: new Map(), journey: new Map() };
    const bySlug = { person: new Map(), event: new Map(), location: new Map(), book: new Map(), period: new Map(), journey: new Map() };
    const childrenOf = new Map();   // person id → [person]
    const relationsOf = new Map();  // person id → [{ type, person }]
    let items = [];                 // people + events as uniform timeline items
    let searchIndex = [];

    const SIG_RANK = { major: 0, moderate: 1, minor: 2 };
    const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // How a relationship reads from the other person's side.
    const INVERSE = { parent: 'child', child: 'parent', mentor: 'student', successor: 'predecessor' };

    function load() {
        if (data) return Promise.resolve();
        if (!loading) loading = Api.getDataset().then(build);
        return loading;
    }

    function register(kind, list, target) {
        for (const row of list || []) {
            row.kind = kind;
            target.push(row);
            byId[kind].set(row.id, row);
            if (row.slug) bySlug[kind].set(row.slug, row);
        }
    }

    function build(raw) {
        data = raw;
        register('period', raw.periods, periods);
        register('person', raw.people, people);
        register('event', raw.events, events);
        register('location', raw.locations, locations);
        register('book', raw.books, books);
        register('journey', raw.journeys, journeys);
        periods.sort((a, b) => a.startYear - b.startYear);

        for (const p of people) {
            p.altNames = p.altNames || [];
            p.events = p.events || [];
            p.scripture = p.scripture || [];
            for (const parentId of [p.fatherId, p.motherId]) {
                if (parentId == null) continue;
                if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
                childrenOf.get(parentId).push(p);
            }
        }
        for (const e of events) {
            e.people = e.people || [];
            e.locationIds = e.locationIds || [];
            e.scripture = e.scripture || [];
        }

        const addRelation = (fromId, type, toId) => {
            const other = byId.person.get(toId);
            if (!other || !byId.person.has(fromId)) return;
            if (!relationsOf.has(fromId)) relationsOf.set(fromId, []);
            const list = relationsOf.get(fromId);
            if (!list.some(r => r.type === type && r.person === other)) list.push({ type, person: other });
        };
        for (const r of raw.relationships || []) {
            addRelation(r.a, r.type, r.b);
            addRelation(r.b, INVERSE[r.type] || r.type, r.a);
        }

        for (const p of people) p.span = personSpan(p);
        for (const p of people) if (!p.span) p.span = interpolatedSpan(p);
        for (const e of events) {
            e.span = { start: e.startYear, end: e.endYear ?? e.startYear, estimated: false };
        }

        items = [
            ...people.filter(p => p.span).map(p => ({
                key: `p${p.id}`, type: 'person', ref: p, id: p.id, slug: p.slug, name: p.name,
                start: p.span.start, end: p.span.end, estimated: p.span.estimated,
                significance: p.significance, group: p.role || 'other', confidence: p.dateConfidence
            })),
            ...events.filter(e => e.startYear != null).map(e => ({
                key: `e${e.id}`, type: 'event', ref: e, id: e.id, slug: e.slug, name: e.name,
                start: e.span.start, end: e.span.end, estimated: false,
                significance: e.significance, group: e.category || 'other', confidence: e.dateConfidence
            }))
        ].sort((a, b) => a.start - b.start || SIG_RANK[a.significance] - SIG_RANK[b.significance]);

        searchIndex = [
            ...people.map(p => entry('person', p, [p.name, ...p.altNames], p.description,
                [roleLabel(p.role), Time.span(p.birthYear, p.deathYear)].filter(Boolean).join(' · '))),
            ...events.map(e => entry('event', e, [e.name], e.description,
                ['Event', Time.span(e.startYear, e.endYear)].join(' · '))),
            ...locations.map(l => entry('location', l, [l.name, l.modernName], l.description,
                ['Place', l.modernName && l.modernName !== l.name ? `today ${l.modernName}` : l.region].filter(Boolean).join(' · '))),
            ...books.map(b => entry('book', b, [b.name, b.abbreviation], b.genre,
                [b.testament === 'OT' ? 'Old Testament' : 'New Testament', b.genre].filter(Boolean).join(' · '))),
            ...periods.map(p => entry('period', p, [p.name], p.description,
                `Era · ${Time.span(p.startYear, p.endYear)}`))
        ];
    }

    function entry(type, item, names, text, sub) {
        return {
            type, item, sub,
            names: names.filter(Boolean).map(norm),
            text: norm(text),
            rank: SIG_RANK[item.significance] ?? 1
        };
    }

    // Where a person sits on the timeline. Recorded dates when we have them;
    // otherwise an honest estimate from parents, children and events,
    // flagged `estimated` so views can draw it differently.
    function personSpan(p) {
        if (p.birthYear != null && p.deathYear != null) {
            return { start: p.birthYear, end: p.deathYear, estimated: false };
        }
        const TYPICAL = 70;
        const eventYears = p.events
            .map(l => byId.event.get(l.id)).filter(e => e && e.startYear != null)
            .flatMap(e => [e.startYear, e.endYear ?? e.startYear]);
        if (p.birthYear != null) {
            const end = Math.max(Time.add(p.birthYear, TYPICAL), ...eventYears);
            return { start: p.birthYear, end, estimated: true };
        }
        if (p.deathYear != null) {
            const start = Math.min(Time.add(p.deathYear, -TYPICAL), ...eventYears);
            return { start, end: p.deathYear, estimated: true };
        }
        if (eventYears.length) {
            const lo = Math.min(...eventYears), hi = Math.max(...eventYears);
            return { start: Time.add(lo, -30), end: Math.max(Time.add(hi, 20), Time.add(lo, 40)), estimated: true };
        }
        return null; // no dates and no dated events: not placed on the timeline
    }

    // People known only from a genealogy (no dates, no events) are placed by
    // spacing the generations evenly between the nearest dated ancestor and
    // the nearest dated descendant. Always flagged `estimated`.
    function interpolatedSpan(p) {
        const GENERATION = 30, LIFE = 60;
        const dated = x => x && x.span && !x.span.interpolated;
        let up = 0, anc = p;
        const seen = new Set([p.id]);
        do {
            anc = byId.person.get(anc.fatherId) || byId.person.get(anc.motherId);
            up++;
        } while (anc && !dated(anc) && !seen.has(anc.id) && seen.add(anc.id));
        // nearest dated descendant, breadth-first
        let down = 0, desc = null, frontier = [p];
        const visited = new Set([p.id]);
        while (frontier.length && !desc && down < 80) {
            down++;
            const next = [];
            for (const node of frontier) {
                for (const c of childrenOf.get(node.id) || []) {
                    if (visited.has(c.id)) continue;
                    visited.add(c.id);
                    if (dated(c)) { desc = c; break; }
                    next.push(c);
                }
                if (desc) break;
            }
            frontier = next;
        }
        let birth = null;
        if (dated(anc) && desc) birth = Time.add(anc.span.start, Math.round(Time.between(anc.span.start, desc.span.start) * up / (up + down)));
        else if (dated(anc)) birth = Time.add(anc.span.start, GENERATION * up);
        else if (desc) birth = Time.add(desc.span.start, -GENERATION * down);
        if (birth == null) return null;
        return { start: birth, end: Time.add(birth, LIFE), estimated: true, interpolated: true };
    }

    // ── Lookups ─────────────────────────────────────────────────────────
    const lookup = kind => key => {
        if (key == null) return null;
        if (typeof key === 'object') return key;
        return bySlug[kind].get(String(key)) || byId[kind].get(Number(key)) || null;
    };
    const person = lookup('person'), event = lookup('event'), location = lookup('location'),
        book = lookup('book'), period = lookup('period'), journey = lookup('journey');

    function periodAt(year) {
        if (year == null) return null;
        return periods.find(p => year >= p.startYear && year < p.endYear)
            || (year >= periods[periods.length - 1]?.endYear ? periods[periods.length - 1] : periods[0]) || null;
    }

    // ── Family ──────────────────────────────────────────────────────────
    const father = p => byId.person.get(p.fatherId) || null;
    const mother = p => byId.person.get(p.motherId) || null;
    const parents = p => [father(p), mother(p)].filter(Boolean);
    const children = p => (childrenOf.get(p.id) || []).slice().sort(byBirth);
    const relations = (p, type) => (relationsOf.get(p.id) || []).filter(r => !type || r.type === type);
    const spouses = p => relations(p, 'spouse').map(r => r.person);
    function siblings(p) {
        const set = new Set();
        for (const parent of parents(p)) for (const c of children(parent)) if (c !== p) set.add(c);
        for (const r of relations(p, 'sibling')) set.add(r.person);
        return [...set].sort(byBirth);
    }
    function byBirth(a, b) { return (a.span?.start ?? 1e9) - (b.span?.start ?? 1e9) || a.id - b.id; }

    // The direct line upward, father first (mother when no father is recorded).
    function ancestors(p) {
        const line = [], seen = new Set([p.id]);
        for (let cur = father(p) || mother(p); cur && !seen.has(cur.id); cur = father(cur) || mother(cur)) {
            line.push(cur); seen.add(cur.id);
        }
        return line;
    }
    function descendants(p, maxDepth = Infinity) {
        const out = [], seen = new Set([p.id]);
        (function walk(node, depth) {
            if (depth >= maxDepth) return;
            for (const c of children(node)) {
                if (seen.has(c.id)) continue;
                seen.add(c.id); out.push({ person: c, depth: depth + 1 }); walk(c, depth + 1);
            }
        })(p, 0);
        return out;
    }
    // Generations separating two people on a direct line, or null.
    function generationsBetween(a, b) {
        const up = (x, y) => { const i = ancestors(x).indexOf(y); return i < 0 ? null : i + 1; };
        return up(a, b) ?? up(b, a);
    }

    // ── Lifetimes ───────────────────────────────────────────────────────
    const datesKnown = p => p.birthYear != null && p.deathYear != null;
    const lifespan = p => (datesKnown(p) ? Time.between(p.birthYear, p.deathYear) : null);
    const ageIn = (p, year) => (p.birthYear == null ? null : Time.between(p.birthYear, year));

    // Did two lives overlap? Uses the birth and death years in the data, never the
    // timeline's placeholder spans for people with no years at all. Many of those years
    // are themselves estimates (flagged birthApprox / deathApprox); `approx` says whether
    // the figure rests on one, so views can say "about" instead of stating it as a finding.
    function overlap(a, b) {
        if (!datesKnown(a) || !datesKnown(b)) return { known: false, a, b };
        const from = Math.max(a.birthYear, b.birthYear), to = Math.min(a.deathYear, b.deathYear);
        const [elder, younger] = a.birthYear <= b.birthYear ? [a, b] : [b, a];
        const firstToDie = a.deathYear <= b.deathYear ? a : b;
        if (from <= to) {
            return {
                known: true, overlaps: true, a, b, elder, younger, from, to,
                approx: !!(younger.birthApprox || firstToDie.deathApprox),
                years: Time.between(from, to),
                elderAgeAtStart: ageIn(elder, from), elderAgeAtEnd: ageIn(elder, to),
                youngerAgeAtEnd: ageIn(younger, to)
            };
        }
        return {
            known: true, overlaps: false, a, b, elder, younger,
            approx: !!(elder.deathApprox || younger.birthApprox),
            from: elder.deathYear, to: younger.birthYear,
            gap: Time.between(elder.deathYear, younger.birthYear)
        };
    }

    function contemporaries(p, { limit = 12 } = {}) {
        if (!datesKnown(p)) return [];
        return people
            .filter(o => o !== p && datesKnown(o))
            .map(o => ({ person: o, ...overlap(p, o) }))
            .filter(o => o.overlaps && o.years > 0)
            .sort((x, y) => SIG_RANK[x.person.significance] - SIG_RANK[y.person.significance] || y.years - x.years)
            .slice(0, limit);
    }

    const aliveAt = year => people
        .filter(p => p.span && !p.span.estimated && year >= p.span.start && year <= p.span.end)
        .sort((a, b) => SIG_RANK[a.significance] - SIG_RANK[b.significance] || a.span.start - b.span.start);

    // ── Cross-links ─────────────────────────────────────────────────────
    const eventsOf = p => p.events
        .map(l => ({ event: byId.event.get(l.id), role: l.role })).filter(l => l.event)
        .sort((a, b) => (a.event.startYear ?? 0) - (b.event.startYear ?? 0));
    const peopleOf = e => e.people
        .map(l => ({ person: byId.person.get(l.id), role: l.role })).filter(l => l.person);
    const locationsOf = e => e.locationIds.map(id => byId.location.get(id)).filter(Boolean);
    const eventsAt = loc => events.filter(e => e.locationIds.includes(loc.id));
    const eventsIn = (from, to) => events.filter(e => e.startYear != null && e.span.end >= from && e.span.start <= to);

    // ── Search ──────────────────────────────────────────────────────────
    function search(query, { limit = 20, types } = {}) {
        const q = norm(query).trim();
        if (!q) return [];
        const words = q.split(/\s+/);
        const out = [];
        for (const s of searchIndex) {
            if (types && !types.includes(s.type)) continue;
            let score = 0;
            for (const n of s.names) {
                if (n === q) score = Math.max(score, 100);
                else if (n.startsWith(q)) score = Math.max(score, 80);
                else if (words.every(w => n.split(/[^a-z0-9]+/).some(t => t.startsWith(w)))) score = Math.max(score, 60);
                else if (n.includes(q)) score = Math.max(score, 40);
            }
            if (!score && q.length >= 3 && words.every(w => s.text.includes(w))) score = 12;
            if (!score) continue;
            out.push({ type: s.type, item: s.item, sub: s.sub, score: score - s.rank * 6 });
        }
        // Mentions inside descriptions are only useful when the names themselves
        // found little; otherwise "dav" would list everyone David ever met.
        const NAME_MATCH = 30;
        const named = out.filter(r => r.score >= NAME_MATCH);
        const results = named.length >= 3 ? named : out;
        return results.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name)).slice(0, limit);
    }

    // ── Labels ──────────────────────────────────────────────────────────
    const ROLE_LABELS = { 'church-leader': 'Church leader', messiah: 'Messiah' };
    function roleLabel(role) {
        if (!role || role === 'other') return '';
        return ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1);
    }
    const dates = x => (x.kind === 'person'
        ? Time.span(x.birthYear, x.deathYear, { aApprox: x.birthApprox, bApprox: x.deathApprox })
        : Time.span(x.startYear, x.endYear, { aApprox: x.startApprox, bApprox: x.endApprox }));

    return {
        load,
        get ready() { return !!data; },
        get meta() { return data?.meta || {}; },
        people, events, periods, locations, books, journeys,
        get items() { return items; },
        person, event, location, book, period, journey, periodAt,
        father, mother, parents, children, spouses, siblings, relations, ancestors, descendants, generationsBetween,
        datesKnown, lifespan, ageIn, overlap, contemporaries, aliveAt,
        eventsOf, peopleOf, locationsOf, eventsAt, eventsIn,
        search, roleLabel, dates, SIG_RANK
    };
})();

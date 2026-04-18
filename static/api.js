// api.js — Static data client (GitHub Pages / offline version)
// Loads pre-built JSON files and filters client-side.
// Supports inline data (window.__BIBLE_DATA__) for file:// usage,
// or fetch() for HTTP-served deployments.
const Api = (() => {
    let _cache = null;

    async function _load() {
        if (_cache) return _cache;
        if (window.__BIBLE_DATA__) {
            _cache = window.__BIBLE_DATA__;
            return _cache;
        }
        const [timeline, periods, books, filters, people, events, lineagePeople] = await Promise.all([
            fetch('data/timeline.json').then(r => r.json()),
            fetch('data/periods.json').then(r => r.json()),
            fetch('data/books.json').then(r => r.json()),
            fetch('data/filters.json').then(r => r.json()),
            fetch('data/people.json').then(r => r.json()),
            fetch('data/events.json').then(r => r.json()),
            fetch('data/lineage-people.json').then(r => r.json()),
        ]);
        _cache = { timeline, periods, books, filters, people, events, lineagePeople };
        return _cache;
    }

    function filterTimeline(items, params) {
        return items.filter(item => {
            const isPerson = item.type === 'person';

            // includePeople / includeEvents
            if (isPerson && params.includePeople === false) return false;
            if (!isPerson && params.includeEvents === false) return false;

            // startYear: show items that END after or START after the filter
            if (params.startYear != null) {
                const endCol = item.endYear;
                const startCol = item.startYear;
                if (!(endCol == null || endCol >= params.startYear || startCol >= params.startYear)) return false;
            }

            // endYear: show items that START before the filter
            if (params.endYear != null) {
                const startCol = item.startYear;
                if (!(startCol == null || startCol <= params.endYear)) return false;
            }

            // significance
            if (params.significance && item.significance !== params.significance) return false;

            // dateConfidence
            if (params.dateConfidence && item.dateConfidence !== params.dateConfidence) return false;

            // role (people only) — in timeline items, role is stored as `category`
            if (params.role && isPerson && item.category !== params.role) return false;

            // tribe — check against full people data
            if (params.tribe && isPerson) {
                const full = _cache.people[String(item.id)];
                if (!full || full.tribe !== params.tribe) return false;
            }

            // category (events only)
            if (params.category && !isPerson && item.category !== params.category) return false;

            // period — check if item's start year falls within the period
            if (params.period) {
                const period = _cache.periods.find(p => p.name === params.period);
                if (period) {
                    const col = item.startYear;
                    if (col == null || col < period.startYear || col > period.endYear) return false;
                }
            }

            // testament
            if (params.testament) {
                const col = item.startYear;
                if (params.testament === 'OT' && (col == null || col >= -5)) return false;
                if (params.testament === 'NT' && (col == null || col < -5)) return false;
            }

            // bookId — check if item has a scripture reference with that book
            if (params.bookId) {
                const bid = Number(params.bookId);
                if (!item.bookIds || !item.bookIds.includes(bid)) return false;
            }

            // locationId (events only)
            if (params.locationId && !isPerson) {
                const lid = Number(params.locationId);
                if (!item.locationIds || !item.locationIds.includes(lid)) return false;
            }

            return true;
        });
    }

    function computeLineage(subjectId, allPeople) {
        const byId = new Map(allPeople.map(p => [p.id, p]));
        const subject = byId.get(subjectId);
        if (!subject) return null;

        // Ancestors: walk up father_id / mother_id recursively
        const ancestorIds = new Set();
        const queue = [];
        if (subject.fatherId && byId.has(subject.fatherId)) queue.push(subject.fatherId);
        if (subject.motherId && byId.has(subject.motherId)) queue.push(subject.motherId);
        while (queue.length) {
            const pid = queue.pop();
            if (ancestorIds.has(pid)) continue;
            ancestorIds.add(pid);
            const p = byId.get(pid);
            if (p.fatherId && byId.has(p.fatherId)) queue.push(p.fatherId);
            if (p.motherId && byId.has(p.motherId)) queue.push(p.motherId);
        }

        // Descendants: walk down (find children)
        const descendantIds = new Set();
        const dQueue = [subjectId];
        while (dQueue.length) {
            const pid = dQueue.pop();
            for (const p of allPeople) {
                if (p.fatherId === pid || p.motherId === pid) {
                    if (!descendantIds.has(p.id) && p.id !== subjectId) {
                        descendantIds.add(p.id);
                        dQueue.push(p.id);
                    }
                }
            }
        }

        // Siblings: share at least one parent
        const siblings = allPeople.filter(p => {
            if (p.id === subjectId) return false;
            if (subject.fatherId && p.fatherId === subject.fatherId) return true;
            if (subject.motherId && p.motherId === subject.motherId) return true;
            return false;
        });

        // Extended family: children of ancestors not already included
        const alreadyIncluded = new Set([subjectId, ...ancestorIds, ...descendantIds]);
        for (const s of siblings) alreadyIncluded.add(s.id);

        const ancestorAndSubject = new Set([...ancestorIds, subjectId]);
        const extendedFamily = allPeople.filter(p => {
            if (alreadyIncluded.has(p.id)) return false;
            return (p.fatherId && ancestorAndSubject.has(p.fatherId)) ||
                   (p.motherId && ancestorAndSubject.has(p.motherId));
        });

        const pick = id => byId.get(id);
        return {
            subject,
            ancestors: [...ancestorIds].map(pick),
            descendants: [...descendantIds].map(pick),
            siblings,
            extendedFamily,
        };
    }

    return {
        async getTimeline(params = {}) {
            const { timeline } = await _load();
            return filterTimeline(timeline, params);
        },

        async getPeriods() {
            const { periods } = await _load();
            return periods;
        },

        async getBooks() {
            const { books } = await _load();
            return books;
        },

        async getFilters() {
            const { filters } = await _load();
            return filters;
        },

        async getPersonDetail(id) {
            const { people } = await _load();
            return people[String(id)] || null;
        },

        async getEventDetail(id) {
            const { events } = await _load();
            return events[String(id)] || null;
        },

        async search(query, type) {
            const { people, events, books } = await _load();
            const q = query.toLowerCase();
            const results = [];

            if (!type || type === 'person') {
                for (const p of Object.values(people)) {
                    const haystack = [p.name, p.description, p.altNames]
                        .filter(Boolean).join(' ').toLowerCase();
                    if (haystack.includes(q)) {
                        results.push({
                            id: p.id, type: 'person', name: p.name,
                            snippet: p.description, startYear: p.birthYear,
                        });
                    }
                }
            }

            if (!type || type === 'event') {
                for (const e of Object.values(events)) {
                    const haystack = [e.name, e.description]
                        .filter(Boolean).join(' ').toLowerCase();
                    if (haystack.includes(q)) {
                        results.push({
                            id: e.id, type: 'event', name: e.name,
                            snippet: e.description, startYear: e.startYear,
                        });
                    }
                }
            }

            if (!type || type === 'book') {
                for (const b of books) {
                    const haystack = [b.name, b.abbreviation]
                        .filter(Boolean).join(' ').toLowerCase();
                    if (haystack.includes(q)) {
                        results.push({
                            id: b.id, type: 'book', name: b.name,
                            snippet: b.genre, startYear: b.approxWritingYear,
                        });
                    }
                }
            }

            return results.slice(0, 40);
        },

        async getLineagePeople() {
            const { lineagePeople } = await _load();
            return lineagePeople;
        },

        async getLineage(id) {
            const { lineagePeople } = await _load();
            return computeLineage(id, lineagePeople);
        },

        async getMapEvents(startYear, endYear) {
            const { mapEvents } = await _load();
            if (!mapEvents) return [];
            return mapEvents.filter(e => {
                const y = e.startYear ?? e.endYear;
                if (startYear != null && y != null && y < startYear) return false;
                if (endYear != null && y != null && y > endYear) return false;
                return true;
            });
        },

        async getMapPeople() {
            const { mapPeople } = await _load();
            return mapPeople || [];
        },

        async getMapJourney(personId, startYear, endYear) {
            const { mapJourneys } = await _load();
            if (!mapJourneys) return [];
            return mapJourneys.filter(j => {
                if (j.personId !== personId) return false;
                const y = j.startYear ?? j.endYear;
                if (startYear != null && y != null && y < startYear) return false;
                if (endYear != null && y != null && y > endYear) return false;
                return true;
            });
        },

        async getMapLocations() {
            // Not separately exported; not needed for map rendering
            return [];
        },

        async getBookJourneys() {
            const { bookJourneys } = await _load();
            return bookJourneys || [];
        },

        async getBookJourneyStops(journeyId) {
            const { bookJourneyStops } = await _load();
            if (!bookJourneyStops) return [];
            return bookJourneyStops[String(journeyId)] || [];
        },
    };
})();

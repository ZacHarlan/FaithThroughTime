// api.js — Thin API client
const Api = {
    async getTimeline(params = {}) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') qs.set(k, v);
        }
        const res = await fetch(`/api/timeline?${qs}`);
        if (!res.ok) throw new Error(`Timeline fetch failed: ${res.status}`);
        return res.json();
    },

    async getPeriods() {
        const res = await fetch('/api/timeline/periods');
        if (!res.ok) throw new Error(`Periods fetch failed: ${res.status}`);
        return res.json();
    },

    async getBooks() {
        const res = await fetch('/api/timeline/books');
        if (!res.ok) throw new Error(`Books fetch failed: ${res.status}`);
        return res.json();
    },

    async getFilters() {
        const res = await fetch('/api/timeline/filters');
        if (!res.ok) throw new Error(`Filters fetch failed: ${res.status}`);
        return res.json();
    },

    async getPersonDetail(id) {
        const res = await fetch(`/api/people/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Person fetch failed: ${res.status}`);
        return res.json();
    },

    async getEventDetail(id) {
        const res = await fetch(`/api/events/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Event fetch failed: ${res.status}`);
        return res.json();
    },

    async search(query, type) {
        const qs = new URLSearchParams({ q: query });
        if (type) qs.set('type', type);
        const res = await fetch(`/api/search?${qs}`);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        return res.json();
    },

    async getLineagePeople() {
        const res = await fetch('/api/lineage/people');
        if (!res.ok) throw new Error(`Lineage people fetch failed: ${res.status}`);
        return res.json();
    },

    async getLineage(id) {
        const res = await fetch(`/api/lineage/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Lineage fetch failed: ${res.status}`);
        return res.json();
    },

    async getMapEvents(startYear, endYear) {
        const qs = new URLSearchParams();
        if (startYear != null) qs.set('startYear', startYear);
        if (endYear != null) qs.set('endYear', endYear);
        const res = await fetch(`/api/map/events?${qs}`);
        if (!res.ok) throw new Error(`Map events fetch failed: ${res.status}`);
        return res.json();
    },

    async getMapJourney(personId, startYear, endYear) {
        const qs = new URLSearchParams();
        if (startYear != null) qs.set('startYear', startYear);
        if (endYear != null) qs.set('endYear', endYear);
        const res = await fetch(`/api/map/journey/${encodeURIComponent(personId)}?${qs}`);
        if (!res.ok) throw new Error(`Map journey fetch failed: ${res.status}`);
        return res.json();
    },

    async getMapPeople() {
        const res = await fetch('/api/map/people');
        if (!res.ok) throw new Error(`Map people fetch failed: ${res.status}`);
        return res.json();
    },

    async getLocations() {
        const res = await fetch('/api/map/locations');
        if (!res.ok) throw new Error(`Locations fetch failed: ${res.status}`);
        return res.json();
    },

    async getBookJourneys() {
        const res = await fetch('/api/map/journeys');
        if (!res.ok) throw new Error(`Book journeys fetch failed: ${res.status}`);
        return res.json();
    },

    async getBookJourneyStops(journeyId) {
        const res = await fetch(`/api/map/journeys/${encodeURIComponent(journeyId)}`);
        if (!res.ok) throw new Error(`Book journey stops fetch failed: ${res.status}`);
        return res.json();
    },

    async getScripturePassage(ref) {
        try {
            const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
            if (!res.ok) return null;
            const data = await res.json();
            return data && data.text ? data.text.trim() : null;
        } catch {
            return null;
        }
    }
};

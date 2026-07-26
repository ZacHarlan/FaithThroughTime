// map.js — Leaflet-based map with journey animation
const MAPBOX_TOKEN = 'pk.eyJ1Ijoid2hpdGVhbmd1cyIsImEiOiJjbW5nMWV0cXUwNGl3MnFwbnRwNnIwamNjIn0.OnwEsNDYtMliKgM72HLBCQ';

const MapView = (() => {
    let map = null;
    let markersLayer = null;
    let journeyLayer = null;
    let journeyMarker = null;

    let allMapEvents = [];
    let currentJourney = [];
    let mapPeople = [];
    let bookJourneys = [];

    let playInterval = null;
    let isPlaying = false;
    let playSpeed = 1;
    let activated = false;
    let currentStepIndex = -1;

    // Normalized OKLCH-derived hues — same family as the period palette in
    // SeedData.sql so map pins and timeline bands read as one system.
    // Keep the four legend dots in index.html (#map-tab .map-legend) in sync.
    const CATEGORY_COLORS = {
        creation: '#a16844',
        covenant: '#567cd3',
        war: '#e1707c',
        miracle: '#d8bd51',
        prophecy: '#7f79d1',
        exile: '#5c7794',
        birth: '#55b486',
        death: '#90b1bc',
        law: '#bc634d',
        conquest: '#7fae64',
        judgment: '#c3a03a',
        salvation: '#d8bd51'
    };

    function categoryColor(cat) {
        return CATEGORY_COLORS[cat] || '#55b486';
    }

    function formatYear(y) { return Utils.formatYear(y); }

    function escapeHtml(str) { return Utils.escapeHtml(str); }

    function init() {
        document.getElementById('map-person-select').addEventListener('change', onPersonChange);
        document.getElementById('map-play-btn').addEventListener('click', togglePlay);
        document.getElementById('map-speed-btn').addEventListener('click', cycleSpeed);
        document.getElementById('map-year-slider').addEventListener('input', onSliderInput);
        document.getElementById('map-prev-btn').addEventListener('click', () => stepEvent(-1));
        document.getElementById('map-next-btn').addEventListener('click', () => stepEvent(1));
    }

    async function activate() {
        if (activated) {
            if (map) map.invalidateSize();
            return;
        }
        activated = true;

        // Small delay so the container is visible before Leaflet measures it
        await new Promise(r => setTimeout(r, 50));
        initMap();
        await loadData();
    }

    function initMap() {
        map = L.map('map-container', {
            center: [31.5, 35.3],
            zoom: 7,
            zoomControl: true,
            maxBounds: [[-10, -20], [60, 80]],
            minZoom: 4
        });

        L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN, {
            attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
            tileSize: 512,
            zoomOffset: -1,
            maxZoom: 19
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);
        journeyLayer = L.layerGroup().addTo(map);
    }

    async function loadData() {
        try {
            const results = await Promise.all([
                Api.getMapEvents(),
                Api.getMapPeople(),
                Api.getBookJourneys()
            ]);
            allMapEvents = results[0];
            mapPeople = results[1];
            bookJourneys = results[2];
            populatePersonSelect();
            renderMarkers();
        } catch {
            const label = document.getElementById('map-step-label');
            if (label) label.textContent = 'Couldn’t load map data — check your connection and reopen this tab.';
        }
    }

    function populatePersonSelect() {
        const select = document.getElementById('map-person-select');
        while (select.options.length > 1) select.remove(1);

        // Book journeys group
        if (bookJourneys.length > 0) {
            const journeyGroup = document.createElement('optgroup');
            journeyGroup.label = 'Book Journeys';
            for (const j of bookJourneys) {
                const opt = document.createElement('option');
                opt.value = 'journey:' + j.id;
                opt.textContent = `${j.name} (${j.stopCount} stops)`;
                journeyGroup.appendChild(opt);
            }
            select.appendChild(journeyGroup);
        }

        // Person journeys group
        const personGroup = document.createElement('optgroup');
        personGroup.label = 'Person Journeys';

        // Sort: Jesus first, then by event count desc
        const sorted = [...mapPeople].sort((a, b) => {
            if (a.name === 'Jesus') return -1;
            if (b.name === 'Jesus') return 1;
            return b.eventCount - a.eventCount;
        });

        for (const p of sorted) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.eventCount} events)`;
            personGroup.appendChild(opt);
        }
        select.appendChild(personGroup);
    }

    async function onPersonChange() {
        stopPlay();
        clearStepLabel();
        const val = document.getElementById('map-person-select').value;
        if (!val) {
            currentJourney = [];
            journeyLayer.clearLayers();
            journeyMarker = null;
            resetSliderRange();
            renderMarkers();
            return;
        }

        try {
            if (val.startsWith('journey:')) {
                const journeyId = parseInt(val.split(':')[1]);
                currentJourney = await Api.getBookJourneyStops(journeyId);
            } else {
                currentJourney = await Api.getMapJourney(parseInt(val));
            }
            if (currentJourney.length === 0) {
                journeyLayer.clearLayers();
                journeyMarker = null;
                return;
            }

            // Adjust slider to person's event range
            const years = currentJourney
                .map(s => s.startYear ?? s.endYear)
                .filter(y => y != null);
            const minY = Math.min(...years);
            const maxY = Math.max(...years);
            const slider = document.getElementById('map-year-slider');
            slider.min = minY - 5;
            slider.max = maxY + 5;
            slider.value = maxY + 5;
            updateYearLabel(parseInt(slider.value));

            markersLayer.clearLayers();
            renderJourney();
            fitToJourney();
        } catch {
            const label = document.getElementById('map-step-label');
            if (label) label.textContent = 'Couldn’t load this journey — try again.';
        }
    }

    function resetSliderRange() {
        const slider = document.getElementById('map-year-slider');
        slider.min = -4100;
        slider.max = 2030;
        slider.value = 2030;
        updateYearLabel(2030);
    }

    function onSliderInput() {
        const year = parseInt(document.getElementById('map-year-slider').value);
        updateYearLabel(year);
        if (currentJourney.length > 0) {
            renderJourney(year);
        } else {
            renderMarkers(year);
        }
    }

    function updateYearLabel(year) {
        document.getElementById('map-year-label').textContent = formatYear(year);
    }

    // ── Event Stepping ───────────────────────────────────────

    function getEventList() {
        // In journey mode use the journey steps; otherwise use all visible map events
        if (currentJourney.length > 0) {
            return currentJourney.filter(s => s.latitude != null && s.longitude != null);
        }
        return allMapEvents
            .filter(e => e.latitude != null && e.longitude != null)
            .sort((a, b) => (a.startYear ?? a.endYear) - (b.startYear ?? b.endYear));
    }

    function stepEvent(dir) {
        const list = getEventList();
        if (list.length === 0) return;

        currentStepIndex += dir;
        if (currentStepIndex < 0) currentStepIndex = 0;
        if (currentStepIndex >= list.length) currentStepIndex = list.length - 1;

        const ev = list[currentStepIndex];
        const year = ev.startYear ?? ev.endYear;

        // Update slider to this event's year
        const slider = document.getElementById('map-year-slider');
        if (year >= parseInt(slider.min) && year <= parseInt(slider.max)) {
            slider.value = year;
        }
        updateYearLabel(year);

        // Re-render markers showing only up to this step
        if (currentJourney.length > 0) {
            renderJourney(year, currentStepIndex);
        } else {
            renderMarkers(year, currentStepIndex);
        }

        // Pan to the event location
        map.flyTo([ev.latitude, ev.longitude], Math.max(map.getZoom(), 8), { duration: 0.5 });

        // Open detail panel
        showStopDetail(ev);

        // Update step label
        updateStepLabel(currentStepIndex, list.length, ev.eventName);
    }

    function updateStepLabel(idx, total, name) {
        const el = document.getElementById('map-step-label');
        el.textContent = `${idx + 1}/${total}: ${name}`;
    }

    function clearStepLabel() {
        document.getElementById('map-step-label').textContent = '';
        currentStepIndex = -1;
    }

    function showStopDetail(stop) {
        if (stop.eventId && stop.eventId !== 0) {
            // Linked to a real event — show full event detail
            Api.getEventDetail(stop.eventId).then(detail => {
                if (detail) State.setSelectedItem({ type: 'event', ...detail });
            });
        } else {
            // Book journey stop — show stop info directly
            State.setSelectedItem({
                type: 'stop',
                name: stop.eventName,
                year: stop.startYear ?? stop.endYear,
                chapter: stop.chapter || stop.roleInEvent,
                locationName: stop.locationName,
                latitude: stop.latitude,
                longitude: stop.longitude,
                stopDescription: stop.stopDescription || stop.description || null
            });
        }
    }

    // ── All Events Mode ──────────────────────────────────────

    // Offset overlapping markers so each is individually clickable.
    // Groups events by lat/lng and spreads duplicates in a circle.
    function spreadOverlapping(events) {
        const groups = {};
        for (const ev of events) {
            if (ev.latitude == null || ev.longitude == null) continue;
            const key = ev.latitude + ',' + ev.longitude;
            if (!groups[key]) groups[key] = [];
            groups[key].push(ev);
        }
        const result = [];
        const offsetDeg = 0.005; // ~500m spread at Israel latitudes
        for (const key in groups) {
            const group = groups[key];
            if (group.length === 1) {
                result.push({ ev: group[0], lat: group[0].latitude, lng: group[0].longitude });
            } else {
                for (let i = 0; i < group.length; i++) {
                    const angle = (2 * Math.PI * i) / group.length;
                    result.push({
                        ev: group[i],
                        lat: group[i].latitude + offsetDeg * Math.sin(angle),
                        lng: group[i].longitude + offsetDeg * Math.cos(angle)
                    });
                }
            }
        }
        return result;
    }

    function renderMarkers(maxYear, maxIndex) {
        markersLayer.clearLayers();
        journeyLayer.clearLayers();
        journeyMarker = null;

        let events;
        if (maxIndex != null) {
            // Step mode: show exactly the first maxIndex+1 events from the sorted list
            const sorted = allMapEvents
                .filter(e => e.latitude != null && e.longitude != null)
                .sort((a, b) => (a.startYear ?? a.endYear) - (b.startYear ?? b.endYear));
            events = sorted.slice(0, maxIndex + 1);
        } else if (maxYear != null) {
            events = allMapEvents.filter(e => (e.startYear ?? e.endYear) <= maxYear);
        } else {
            events = allMapEvents;
        }

        // Find the most recent year among visible events so we can highlight "current" dots red
        const currentYear = maxYear != null && events.length > 0
            ? Math.max(...events.map(e => e.startYear ?? e.endYear))
            : null;

        const spread = spreadOverlapping(events);

        for (const { ev, lat, lng } of spread) {
            const evYear = ev.startYear ?? ev.endYear;
            const isCurrent = currentYear != null && evYear === currentYear;
            const color = isCurrent ? '#e53e3e' : categoryColor(ev.category);
            const marker = L.circleMarker([lat, lng], {
                radius: isCurrent ? 9 : (ev.significance === 'major' ? 8 : 5),
                fillColor: color,
                color: isCurrent ? '#fff' : '#fff',
                weight: isCurrent ? 2.5 : 1.5,
                opacity: isCurrent ? 1 : 0.9,
                fillOpacity: isCurrent ? 1 : 0.8
            });

            marker.bindTooltip(escapeHtml(ev.eventName), {
                direction: 'top',
                offset: [0, -6],
                className: 'map-tooltip'
            });

            marker.on('click', () => {
                Api.getEventDetail(ev.eventId).then(detail => {
                    if (detail) State.setSelectedItem({ type: 'event', ...detail });
                });
            });

            markersLayer.addLayer(marker);
        }
    }

    // ── Journey Mode ─────────────────────────────────────────

    function renderJourney(maxYear, maxIndex) {
        journeyLayer.clearLayers();
        journeyMarker = null;

        let steps;
        if (maxIndex != null) {
            // Step mode: show exactly the first maxIndex+1 steps
            const validSteps = currentJourney.filter(s => s.latitude != null && s.longitude != null);
            steps = validSteps.slice(0, maxIndex + 1);
        } else if (maxYear != null) {
            steps = currentJourney.filter(s => (s.startYear ?? s.endYear) <= maxYear);
        } else {
            steps = currentJourney;
        }

        if (steps.length === 0) return;

        // Compute offsets for steps sharing the same location
        const locCounts = {};
        const locIndexes = {};
        for (const s of steps) {
            if (s.latitude == null || s.longitude == null) continue;
            const key = s.latitude + ',' + s.longitude;
            locCounts[key] = (locCounts[key] || 0) + 1;
            locIndexes[key] = 0;
        }

        const offsetDeg = 0.005;

        // Draw markers for each step
        const coords = [];
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (s.latitude == null || s.longitude == null) continue;

            const key = s.latitude + ',' + s.longitude;
            const total = locCounts[key];
            let lat = s.latitude, lng = s.longitude;
            if (total > 1) {
                const idx = locIndexes[key]++;
                const angle = (2 * Math.PI * idx) / total;
                lat += offsetDeg * Math.sin(angle);
                lng += offsetDeg * Math.cos(angle);
            }

            const pos = [lat, lng];
            coords.push(pos);

            const isLast = i === steps.length - 1;
            const color = isLast ? '#e53e3e' : categoryColor(s.category);

            const circleMarker = L.circleMarker(pos, {
                radius: isLast ? 9 : 6,
                fillColor: color,
                color: isLast ? '#fff' : 'rgba(255,255,255,0.6)',
                weight: isLast ? 2.5 : 1.5,
                opacity: 1,
                fillOpacity: isLast ? 1 : 0.7
            });

            // Step number label
            const label = L.divIcon({
                className: 'journey-step-label',
                html: '<span>' + (i + 1) + '</span>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            journeyLayer.addLayer(L.marker(pos, { icon: label, interactive: false }));

            circleMarker.bindTooltip(
                (i + 1) + '. ' + escapeHtml(s.eventName) +
                (s.chapter ? ' <em>(' + escapeHtml(s.chapter) + ')</em>' : ''),
                {
                    direction: 'top',
                    offset: [0, -6],
                    className: 'map-tooltip'
                }
            );

            circleMarker.on('click', () => {
                showStopDetail(s);
            });

            journeyLayer.addLayer(circleMarker);
        }

        // Draw path polyline
        if (coords.length >= 2) {
            const polyline = L.polyline(coords, {
                color: '#4a90d9',
                weight: 3,
                opacity: 0.7,
                dashArray: '8 4',
                lineCap: 'round'
            });
            journeyLayer.addLayer(polyline);
        }

        // Animated current-position marker
        if (coords.length > 0) {
            const lastCoord = coords[coords.length - 1];
            const pulseIcon = L.divIcon({
                className: 'journey-pulse',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });
            journeyMarker = L.marker(lastCoord, { icon: pulseIcon, interactive: false });
            journeyLayer.addLayer(journeyMarker);
        }
    }

    function fitToJourney() {
        const coords = currentJourney
            .filter(s => s.latitude != null && s.longitude != null)
            .map(s => [s.latitude, s.longitude]);
        if (coords.length > 0) {
            map.fitBounds(L.latLngBounds(coords).pad(0.2));
        }
    }

    // ── Playback ─────────────────────────────────────────────

    function togglePlay() {
        if (isPlaying) {
            stopPlay();
        } else {
            startPlay();
        }
    }

    function startPlay() {
        const slider = document.getElementById('map-year-slider');
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);

        // If at end, restart
        if (parseInt(slider.value) >= max) {
            slider.value = min;
        }

        isPlaying = true;
        setPlayIcon(true);

        const speeds = [200, 100, 30];
        const interval = speeds[playSpeed - 1] || 100;

        playInterval = setInterval(() => {
            let val = parseInt(slider.value) + 1;
            if (val > max) {
                stopPlay();
                return;
            }
            slider.value = val;
            updateYearLabel(val);
            if (currentJourney.length > 0) {
                renderJourney(val);
            } else {
                renderMarkers(val);
            }
        }, interval);
    }

    function stopPlay() {
        isPlaying = false;
        setPlayIcon(false);
        if (playInterval) {
            clearInterval(playInterval);
            playInterval = null;
        }
    }

    function setPlayIcon(playing) {
        const icon = document.getElementById('map-play-icon');
        if (icon) {
            const useEl = icon.querySelector('use');
            if (useEl) useEl.setAttribute('href', playing ? '#i-pause' : '#i-play');
        } else {
            // Fallback for environments where the SVG slot isn't present
            const btn = document.getElementById('map-play-btn');
            if (btn) btn.textContent = playing ? '⏸' : '▶';
        }
    }

    function cycleSpeed() {
        playSpeed = (playSpeed % 3) + 1;
        document.getElementById('map-speed-btn').textContent = playSpeed + '\u00D7';
        if (isPlaying) {
            stopPlay();
            startPlay();
        }
    }

    // ── Detail Panel Mini-Map ────────────────────────────────

    // One live instance at a time. Leaflet maps hold window/document
    // listeners until .remove() is called — without disposal, every detail
    // view leaked a full map instance for the life of the session.
    let currentMiniMap = null;

    function destroyMiniMap() {
        if (currentMiniMap) {
            try { currentMiniMap.remove(); } catch {}
            currentMiniMap = null;
        }
    }

    function renderMiniMap(containerId, locations) {
        destroyMiniMap();
        const validLocs = locations.filter(l => l.latitude && l.longitude);
        if (validLocs.length === 0) return;

        // Inert preview: the whole mini-map is a click target that opens the
        // Map tab (see detail-panel mini-map-overlay), so no interaction here
        const miniMap = L.map(containerId, {
            center: [validLocs[0].latitude, validLocs[0].longitude],
            zoom: 8,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            touchZoom: false,
            tapHold: false
        });

        L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN, {
            tileSize: 512,
            zoomOffset: -1,
            maxZoom: 19
        }).addTo(miniMap);

        for (const loc of validLocs) {
            L.marker([loc.latitude, loc.longitude])
                .bindPopup('<strong>' + escapeHtml(loc.name) + '</strong>' +
                    (loc.modernName ? '<br>' + escapeHtml(loc.modernName) : ''))
                .addTo(miniMap);
        }

        if (validLocs.length > 1) {
            const bounds = L.latLngBounds(validLocs.map(l => [l.latitude, l.longitude]));
            miniMap.fitBounds(bounds.pad(0.3));
        }

        // Fix Leaflet rendering in hidden/dynamic containers
        setTimeout(() => miniMap.invalidateSize(), 100);
        currentMiniMap = miniMap;
    }

    /**
     * Center the MAIN map on a location and label it — used by the detail
     * panel's "Open in Map view" button. Callers must switch to the Map tab
     * first (activate() creates the map on first open).
     */
    function focusLocation(lat, lng, name) {
        if (!map) return;
        setTimeout(() => {
            map.invalidateSize();
            map.setView([lat, lng], 9, { animate: true });
            if (name) {
                L.popup({ offset: [0, -4] })
                    .setLatLng([lat, lng])
                    .setContent('<strong>' + escapeHtml(name) + '</strong>')
                    .openOn(map);
            }
        }, 80);
    }

    return { init, activate, renderMiniMap, destroyMiniMap, focusLocation };
})();

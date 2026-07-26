// detail-panel.js — Right-side detail panel for selected items
const DetailPanel = (() => {
    const panel = () => document.getElementById('detail-panel');
    const title = () => document.getElementById('detail-title');
    const content = () => document.getElementById('detail-content');

    // Snap-point state for mobile bottom sheet
    const SNAPS = ['hidden', 'peek', 'half', 'full'];
    let currentSnap = 'hidden';

    function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }

    function setSnap(name, opts = {}) {
        if (!SNAPS.includes(name)) name = 'half';
        currentSnap = name;
        const p = panel();
        p.dataset.snap = name;
        // Body class lets siblings (FABs, era ribbon) react
        document.body.classList.remove('sheet-peek', 'sheet-half', 'sheet-full');
        if (name === 'peek' || name === 'half' || name === 'full') {
            document.body.classList.add('sheet-' + name);
        }
        if (opts.haptic !== false && window._vibrate) window._vibrate(8);
    }

    function init() {
        document.getElementById('btn-close-detail').addEventListener('click', close);
        initSheetGestures();
        initSwipeBack();
        initRefLinks();

        // Prevent drag-to-pan handlers on underlying containers from
        // intercepting scroll/touch inside the detail panel
        const p = panel();
        p.addEventListener('mousedown', e => e.stopPropagation());
        p.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
        p.addEventListener('wheel', e => e.stopPropagation(), { passive: true });

        // Re-evaluate on resize / orientation
        window.addEventListener('resize', () => {
            if (!isMobile() && currentSnap !== 'hidden') {
                document.body.classList.remove('sheet-peek', 'sheet-half', 'sheet-full');
            }
        });
    }

    /**
     * Sheet gestures: drag the handle (or top of header) to resize between
     * peek / half / full snap points. Velocity decides the destination on release.
     */
    function initSheetGestures() {
        const handle = panel().querySelector('.detail-drag-handle');
        if (!handle) return;

        let startY = 0;
        let lastY = 0;
        let lastT = 0;
        let velocity = 0;
        let dragging = false;
        let startHeight = 0;

        const heightFor = (snap) => {
            const vh = window.innerHeight;
            const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-height')) || 64;
            const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 52;
            switch (snap) {
                case 'peek': return 96;
                case 'half': return Math.round(vh * 0.6);
                case 'full': return vh - headerH - 16;
                default:     return Math.round(vh * 0.6);
            }
        };

        const onStart = (e) => {
            if (!isMobile()) return;
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            lastY = startY;
            lastT = Date.now();
            velocity = 0;
            dragging = true;
            startHeight = panel().getBoundingClientRect().height;
            panel().style.transition = 'none';
        };

        const onMove = (e) => {
            if (!dragging) return;
            const y = e.touches ? e.touches[0].clientY : e.clientY;
            const now = Date.now();
            const dt = Math.max(1, now - lastT);
            velocity = (y - lastY) / dt; // px / ms (positive = downward)
            lastY = y;
            lastT = now;
            const dy = y - startY;
            const newHeight = Math.max(60, Math.min(window.innerHeight, startHeight - dy));
            panel().style.height = newHeight + 'px';
            if (e.cancelable) e.preventDefault();
        };

        const onEnd = () => {
            if (!dragging) return;
            dragging = false;
            panel().style.transition = '';
            const finalH = panel().getBoundingClientRect().height;

            // Velocity-based snap selection
            const FAST = 0.6; // px/ms
            let target;
            if (velocity > FAST) {
                // Fast downward fling: go down one snap or close
                if (currentSnap === 'full') target = 'half';
                else if (currentSnap === 'half') target = 'peek';
                else target = 'hidden';
            } else if (velocity < -FAST) {
                if (currentSnap === 'peek') target = 'half';
                else if (currentSnap === 'half') target = 'full';
                else target = 'full';
            } else {
                // Snap to nearest by height
                const peekH = heightFor('peek');
                const halfH = heightFor('half');
                const fullH = heightFor('full');
                const candidates = [
                    { name: 'peek', d: Math.abs(finalH - peekH) },
                    { name: 'half', d: Math.abs(finalH - halfH) },
                    { name: 'full', d: Math.abs(finalH - fullH) }
                ];
                if (finalH < 70) target = 'hidden';
                else target = candidates.sort((a, b) => a.d - b.d)[0].name;
            }

            // Clear inline height so CSS data-snap rules take over
            panel().style.height = '';
            if (target === 'hidden') {
                close();
            } else {
                setSnap(target);
            }
        };

        handle.addEventListener('touchstart', onStart, { passive: true });
        handle.addEventListener('touchmove', onMove, { passive: false });
        handle.addEventListener('touchend', onEnd);
        handle.addEventListener('touchcancel', onEnd);
        // Mouse fallback (small desktops)
        handle.addEventListener('mousedown', (e) => {
            onStart(e);
            const mm = (ev) => onMove(ev);
            const mu = () => {
                onEnd();
                window.removeEventListener('mousemove', mm);
                window.removeEventListener('mouseup', mu);
            };
            window.addEventListener('mousemove', mm);
            window.addEventListener('mouseup', mu);
        });
    }

    function initSwipeBack() {
        const p = panel();
        let startX = 0, startY = 0, swiping = false;

        p.addEventListener('touchstart', e => {
            if (navStack.length === 0) return;
            const t = e.touches[0];
            // Only trigger from left edge (first 40px)
            if (t.clientX > 40) return;
            startX = t.clientX;
            startY = t.clientY;
            swiping = true;
        }, { passive: true });

        p.addEventListener('touchmove', e => {
            if (!swiping) return;
            const dx = e.touches[0].clientX - startX;
            const dy = Math.abs(e.touches[0].clientY - startY);
            // If vertical movement dominates, cancel
            if (dy > Math.abs(dx)) { swiping = false; return; }
            if (dx > 0) {
                content().style.transition = 'none';
                content().style.transform = `translateX(${dx}px)`;
                content().style.opacity = Math.max(0, 1 - dx / 200);
            }
        }, { passive: true });

        p.addEventListener('touchend', e => {
            if (!swiping) return;
            swiping = false;
            const dx = e.changedTouches[0].clientX - startX;
            content().style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            if (dx > 80 && navStack.length > 0) {
                content().style.transform = 'translateX(100%)';
                content().style.opacity = '0';
                setTimeout(() => {
                    content().style.transform = '';
                    content().style.opacity = '';
                    content().style.transition = '';
                    popItem();
                }, 200);
            } else {
                content().style.transform = '';
                content().style.opacity = '';
                setTimeout(() => { content().style.transition = ''; }, 200);
            }
        });
    }

    // Element that had focus before the panel opened — restored on close
    let _invoker = null;

    function show(item) {
        if (!item) { close(); return; }

        // Register with surface history so Back closes the panel; person/event
        // views also get a shareable #person/id / #event/id URL for free.
        if (window._surfaces) {
            const url = (item.type === 'person' || item.type === 'event')
                ? `#${item.type}/${item.id}` : undefined;
            window._surfaces.opened('detail', url);
        }

        const wasHidden = panel().classList.contains('hidden');
        if (wasHidden && document.activeElement && document.activeElement !== document.body) {
            _invoker = document.activeElement;
        }

        panel().classList.remove('hidden');

        // Move focus into the panel so keyboard/SR users land where the
        // content is (only on first open — not on drill-downs)
        if (wasHidden) {
            const closeBtn = document.getElementById('btn-close-detail');
            if (closeBtn) closeBtn.focus({ preventScroll: true });
        }
        // On mobile, default to half-snap for new items; if a sheet is already
        // open at full, keep it; if peek, expand to half on drill-in
        if (isMobile()) {
            if (currentSnap === 'hidden' || currentSnap === 'peek') setSnap('half', { haptic: true });
        }
        title().textContent = item.name;

        // Update bookmark button
        updateBookmarkButton(item);
        addShareButton(item);
        updateBackButton();

        if (item.type === 'person') {
            renderPerson(item);
        } else if (item.type === 'stop') {
            renderStop(item);
        } else {
            renderEvent(item);
        }
    }

    function updateBookmarkButton(item) {
        let btn = panel().querySelector('.btn-bookmark');
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'btn-icon btn-bookmark';
            btn.title = 'Save';
            btn.setAttribute('aria-label', 'Save');
            btn.innerHTML = '<svg class="icon"><use href="#i-bookmark"/></svg>';
            const header = panel().querySelector('.panel-header');
            header.insertBefore(btn, header.querySelector('.btn-close'));
        }
        const bm = window._bookmarks;
        if (!bm || item.type === 'stop') { btn.style.display = 'none'; return; }
        btn.style.display = '';
        const saved = bm.isItemSaved(item.type, item.id);
        const useEl = btn.querySelector('use');
        if (useEl) useEl.setAttribute('href', saved ? '#i-bookmark-fill' : '#i-bookmark');
        btn.classList.toggle('bookmarked', saved);
        btn.onclick = () => {
            if (bm.isItemSaved(item.type, item.id)) {
                bm.removeSavedItem(item.type, item.id);
            } else {
                const meta = item.type === 'person' ? (item.role || '') : (item.category || '');
                bm.saveItem(item.type, item.id, item.name, meta);
            }
            updateBookmarkButton(item);
            if (window._vibrate) window._vibrate(10);
        };
    }

    function addShareButton(item) {
        const existing = panel().querySelector('.btn-share');
        if (!navigator.share || item.type === 'stop') {
            // Hide rather than leave the previous item's share handler live
            if (existing) existing.style.display = 'none';
            return;
        }
        if (existing) existing.style.display = '';
        let btn = existing;
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'btn-icon btn-share';
            btn.title = 'Share';
            btn.setAttribute('aria-label', 'Share');
            btn.innerHTML = '<svg class="icon"><use href="#i-share"/></svg>';
            const header = panel().querySelector('.panel-header');
            header.insertBefore(btn, header.querySelector('.btn-close'));
        }
        btn.onclick = () => {
            const url = `${window.location.origin}/#${item.type}/${item.id}`;
            navigator.share({
                title: item.name + ' — Faith Through Time',
                text: `${item.name} — ${item.type === 'person' ? (item.role || 'Biblical Figure') : (item.category || 'Biblical Event')}`,
                url
            }).catch(() => {});
        };
    }

    // Navigation stack for card-based drill-down
    const navStack = [];

    function close() {
        // Consume our history entry first; popstate re-enters close() with
        // the surface manager in its popping state, which falls through here.
        if (window._surfaces && window._surfaces.requestClose('detail')) return;
        panel().classList.add('hidden');
        setSnap('hidden', { haptic: false });
        navStack.length = 0;
        State.selectedItem = null;
        removeBackButton();
        // Dispose the embedded Leaflet mini-map (it leaks listeners otherwise)
        if (typeof MapView !== 'undefined' && MapView.destroyMiniMap) MapView.destroyMiniMap();
        // Return focus to whatever opened the panel
        if (_invoker && document.contains(_invoker)) {
            _invoker.focus({ preventScroll: true });
        }
        _invoker = null;
    }

    function pushItem(item) {
        if (State.selectedItem) {
            navStack.push({ ...State.selectedItem });
        }
        State.setSelectedItem(item);
    }

    function popItem() {
        if (navStack.length === 0) return;
        const prev = navStack.pop();
        // Re-show without pushing to stack
        State.selectedItem = prev;
        panel().classList.remove('hidden');
        title().textContent = prev.name;
        updateBookmarkButton(prev);
        addShareButton(prev);
        updateBackButton();
        if (prev.type === 'person') renderPerson(prev);
        else if (prev.type === 'stop') renderStop(prev);
        else renderEvent(prev);
    }

    function updateBackButton() {
        let btn = panel().querySelector('.btn-back');
        if (navStack.length > 0) {
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'btn-icon btn-back';
                btn.title = 'Back';
                btn.setAttribute('aria-label', 'Back');
                btn.innerHTML = '<svg class="icon"><use href="#i-chevron-left"/></svg>';
                btn.addEventListener('click', popItem);
                const header = panel().querySelector('.panel-header');
                header.insertBefore(btn, header.firstChild);
            }
            btn.style.display = '';
        } else {
            removeBackButton();
        }
    }

    function removeBackButton() {
        const btn = panel().querySelector('.btn-back');
        if (btn) btn.style.display = 'none';
    }

    function showSkeleton() {
        content().innerHTML = '<div class="skeleton-detail">' +
            '<div class="skeleton-line long skeleton-pulse"></div>' +
            '<div class="skeleton-line medium skeleton-pulse"></div>' +
            '<div class="skeleton-line short skeleton-pulse"></div>' +
            '<div class="skeleton-line long skeleton-pulse"></div>' +
            '<div class="skeleton-line medium skeleton-pulse"></div>' +
            '</div>';
    }

    function renderPerson(p) {
        const c = content();
        let html = '';

        // Meta info
        html += '<div class="detail-section"><h3>Details</h3><dl class="detail-meta">';
        html += metaRow('Dates', formatLifespan(p));
        html += metaRow('Confidence', confidenceBadge(p.dateConfidence));
        if (p.role) html += metaRow('Role', capitalize(p.role));
        if (p.tribe) html += metaRow('Tribe', p.tribe);
        if (p.significance) html += metaRow('Significance', capitalize(p.significance));
        if (p.altNames) html += metaRow('Also Known As', p.altNames);
        html += '</dl></div>';

        // Description
        if (p.description) {
            html += `<div class="detail-section"><h3>Description</h3><p class="detail-description">${prose(p.description)}</p></div>`;
        }

        // Date notes
        if (p.dateNotes) {
            html += `<div class="detail-section"><h3>Chronology Notes</h3><p class="detail-description date-uncertain">${prose(p.dateNotes)}</p></div>`;
        }

        // Related events
        if (p.events && p.events.length) {
            html += '<div class="detail-section"><h3>Events</h3><ul class="detail-list">';
            for (const e of p.events) {
                html += `<li data-type="event" data-id="${e.id}">
                    ${escapeHtml(e.name)}
                    <span class="list-meta">${e.roleInEvent ? ` — ${e.roleInEvent}` : ''}</span>
                </li>`;
            }
            html += '</ul></div>';
        }

        // Relationships
        if (p.relationships && p.relationships.length) {
            html += '<div class="detail-section"><h3>Relationships</h3><ul class="detail-list">';
            for (const r of p.relationships) {
                html += `<li data-type="person" data-id="${r.id}">
                    ${escapeHtml(r.name)}
                    <span class="list-meta"> — ${r.relationshipType}</span>
                </li>`;
            }
            html += '</ul></div>';
        }

        // Scripture references
        if (p.scriptureReferences && p.scriptureReferences.length) {
            html += '<div class="detail-section"><div class="scripture-section-head"><h3>Scripture</h3></div><div class="scripture-list">';
            for (const s of p.scriptureReferences) {
                html += scriptureLink(s);
            }
            html += '</div></div>';
        }

        c.innerHTML = html;
        attachListClicks(c);
        initScriptureAccordions(c);
    }

    function renderEvent(e) {
        const c = content();
        let html = '';

        // Meta info
        html += '<div class="detail-section"><h3>Details</h3><dl class="detail-meta">';
        html += metaRow('Date', formatEventDates(e));
        html += metaRow('Confidence', confidenceBadge(e.dateConfidence));
        if (e.category) html += metaRow('Category', capitalize(e.category));
        if (e.significance) html += metaRow('Significance', capitalize(e.significance));
        html += '</dl></div>';

        // Description
        if (e.description) {
            html += `<div class="detail-section"><h3>Description</h3><p class="detail-description">${prose(e.description)}</p></div>`;
        }

        // Date notes
        if (e.dateNotes) {
            html += `<div class="detail-section"><h3>Chronology Notes</h3><p class="detail-description date-uncertain">${prose(e.dateNotes)}</p></div>`;
        }

        // People involved
        if (e.people && e.people.length) {
            html += '<div class="detail-section"><h3>People Involved</h3><ul class="detail-list">';
            for (const p of e.people) {
                html += `<li data-type="person" data-id="${p.id}">
                    ${escapeHtml(p.name)}
                    <span class="list-meta">${p.roleInEvent ? ` — ${p.roleInEvent}` : ''}</span>
                </li>`;
            }
            html += '</ul></div>';
        }

        // Locations
        if (e.locations && e.locations.length) {
            html += '<div class="detail-section"><h3>Locations</h3><ul class="detail-list">';
            for (const loc of e.locations) {
                html += `<li>${escapeHtml(loc.name)}${loc.modernName ? ` (${escapeHtml(loc.modernName)})` : ''}</li>`;
            }
            html += '</ul></div>';
        }

        // Mini-map for locations with coordinates
        if (e.locations && e.locations.some(l => l.latitude && l.longitude)) {
            html += miniMapSection();
        }

        // Scripture references
        if (e.scriptureReferences && e.scriptureReferences.length) {
            html += '<div class="detail-section"><div class="scripture-section-head"><h3>Scripture</h3></div><div class="scripture-list">';
            for (const s of e.scriptureReferences) {
                html += scriptureLink(s);
            }
            html += '</div></div>';
        }

        c.innerHTML = html;
        attachListClicks(c);
        initScriptureAccordions(c);

        // Render mini-map after DOM is updated
        if (e.locations && e.locations.some(l => l.latitude && l.longitude)) {
            setTimeout(() => {
                if (typeof MapView !== 'undefined') {
                    MapView.renderMiniMap('detail-mini-map', e.locations);
                }
            }, 50);
            wireOpenInMap(e.locations.find(l => l.latitude && l.longitude));
        }
    }

    /**
     * Clickable mini-map section. The label is contextual: "Open in Map
     * view" normally, but "Show on map" when the Map tab is already active
     * (offering to open a view you're already in reads as a bug).
     */
    function miniMapSection() {
        const mapTab = document.getElementById('map-tab');
        const onMapTab = mapTab && !mapTab.classList.contains('hidden');
        const label = onMapTab ? 'Show on map' : 'Open in Map view';
        return '<div class="detail-section"><h3>Map</h3><div class="mini-map-wrap">'
            + '<div id="detail-mini-map" class="detail-mini-map"></div>'
            + `<button type="button" id="btn-open-map" class="mini-map-overlay" aria-label="${label}">`
            + `<span class="mini-map-hint"><svg class="icon"><use href="#i-location"/></svg> ${label}</span>`
            + '</button></div></div>';
    }

    // Click on the mini-map: jump to the Map tab centered on this location
    // (a no-op tab switch when already there). On mobile the sheet drops to
    // peek so the map is actually visible.
    function wireOpenInMap(loc) {
        const btn = content().querySelector('#btn-open-map');
        if (!btn || !loc) return;
        btn.addEventListener('click', async () => {
            if (window._vibrate) window._vibrate(8);
            if (isMobile()) setSnap('peek', { haptic: false });
            if (window._switchTab) await window._switchTab('map');
            if (typeof MapView !== 'undefined' && MapView.focusLocation) {
                MapView.focusLocation(loc.latitude, loc.longitude, loc.name);
            }
        });
    }

    function renderStop(s) {
        const c = content();
        let html = '';

        html += '<div class="detail-section"><h3>Details</h3><dl class="detail-meta">';
        if (s.year != null) html += metaRow('Date', s.year < 0 ? `${Math.abs(s.year)} BC` : `AD ${s.year}`);
        if (s.locationName) html += metaRow('Location', escapeHtml(s.locationName));
        html += '</dl></div>';

        if (s.stopDescription) {
            html += `<div class="detail-section"><h3>Description</h3><p class="detail-description">${prose(s.stopDescription)}</p></div>`;
        }

        // Scripture: journey-stop references become the same expandable
        // accordions as person/event scripture (full local text + version
        // picker). Compound refs ("Deuteronomy 34:1-12; Joshua 1:1-18")
        // split into one accordion each.
        if (s.chapter) {
            const refs = s.chapter.split(';').map(r => r.trim()).filter(Boolean);
            html += '<div class="detail-section"><div class="scripture-section-head"><h3>Scripture</h3></div><div class="scripture-list">';
            for (const ref of refs) {
                html += scriptureLink({ referenceText: ref });
            }
            html += '</div></div>';
        }

        // Mini-map for the stop location
        if (s.latitude && s.longitude) {
            html += miniMapSection();
        }

        c.innerHTML = html;
        initScriptureAccordions(c);

        if (s.latitude && s.longitude) {
            setTimeout(() => {
                if (typeof MapView !== 'undefined') {
                    MapView.renderMiniMap('detail-mini-map', [{ name: s.locationName, latitude: s.latitude, longitude: s.longitude }]);
                }
            }, 50);
            wireOpenInMap({ name: s.locationName, latitude: s.latitude, longitude: s.longitude });
        }
    }

    function attachListClicks(container) {
        container.querySelectorAll('li[data-type][data-id]').forEach(li => {
            li.addEventListener('click', () => {
                const type = li.dataset.type;
                const id = parseInt(li.dataset.id);
                // Show skeleton while loading
                title().textContent = li.textContent.trim().split('\n')[0];
                showSkeleton();
                if (type === 'person') {
                    Api.getPersonDetail(id).then(detail => {
                        if (detail) {
                            pushItem({ type: 'person', ...detail });
                        }
                    });
                } else {
                    Api.getEventDetail(id).then(detail => {
                        if (detail) {
                            pushItem({ type: 'event', ...detail });
                        }
                    });
                }
            });
        });
    }

    // Helpers
    function formatLifespan(p) {
        const b = p.birthYear;
        const d = p.deathYear;
        if (b === null && d === null) return 'Unknown';
        const fm = y => Timeline.formatYear(y);
        const t = a => a ? '~' : '';
        if (b !== null && d !== null) {
            const age = Utils.yearSpan(b, d);
            return `${t(p.birthApprox)}${fm(b)} — ${t(p.deathApprox)}${fm(d)} (age ${age})`;
        }
        if (b !== null) return `Born ${t(p.birthApprox)}${fm(b)}`;
        return `Died ${t(p.deathApprox)}${fm(d)}`;
    }

    function formatEventDates(e) {
        const s = e.startYear;
        const en = e.endYear;
        if (s === null && en === null) return 'Unknown';
        const fm = y => Timeline.formatYear(y);
        const t = a => a ? '~' : '';
        if (s !== null && en !== null && s !== en) return `${t(e.startApprox)}${fm(s)} — ${t(e.endApprox)}${fm(en)}`;
        const year = s ?? en;
        const approx = s !== null ? e.startApprox : e.endApprox;
        return `${t(approx)}${fm(year)}`;
    }

    function confidenceBadge(level) {
        return `<span class="confidence-badge ${level}">${level}</span>`;
    }

    function metaRow(label, value) {
        return `<dt>${label}</dt><dd>${value}</dd>`;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function escapeHtml(str) { return Utils.escapeHtml(str); }

    // Escape prose, then make every scripture reference in it clickable
    function prose(str) {
        const escaped = escapeHtml(str);
        return (typeof BibleText !== 'undefined') ? BibleText.linkifyRefs(escaped) : escaped;
    }

    /**
     * Inline reference clicks: expand a passage popout directly below the
     * paragraph containing the reference (clicking the same ref again
     * collapses it). One delegated listener covers all rendered content.
     */
    function initRefLinks() {
        content().addEventListener('click', e => {
            const btn = e.target.closest('.ref-link');
            if (!btn) return;
            const ref = btn.dataset.ref;
            const block = btn.closest('p, dd, li, div');
            if (!block) return;
            let pop = block.nextElementSibling;
            const isOurs = pop && pop.classList.contains('ref-popout');
            if (isOurs && pop.dataset.ref === ref && !pop.hidden) {
                pop.hidden = true;
                btn.setAttribute('aria-expanded', 'false');
                return;
            }
            if (!isOurs) {
                pop = document.createElement('div');
                pop.className = 'scripture-body ref-popout';
                pop.innerHTML = '<p class="scripture-preview"></p>';
                block.after(pop);
            }
            pop.hidden = false;
            pop.dataset.ref = ref;
            btn.setAttribute('aria-expanded', 'true');
            loadPassage(ref, pop);
            if (window._vibrate) window._vibrate(6);
        });
    }

    function scriptureLink(s) {
        const text = escapeHtml(s.referenceText);
        const id = 'scr-' + Math.random().toString(36).slice(2, 8);
        let html = `<div class="scripture-accordion">`;
        html += `<button class="scripture-toggle" aria-expanded="false" data-target="${id}" aria-controls="${id}">`;
        html += `<span class="scripture-ref-text">📖 ${text}</span>`;
        html += `<span class="scripture-chevron">›</span>`;
        html += `</button>`;
        html += `<div class="scripture-body" id="${id}" hidden>`;
        html += `<p class="scripture-preview">Loading passage…</p>`;
        html += `</div></div>`;
        return html;
    }

    function initScriptureAccordions(container) {
        container.querySelectorAll('.scripture-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', !expanded);
                target.hidden = expanded;
                btn.querySelector('.scripture-chevron').textContent = expanded ? '›' : '⌄';
                // Fetch passage on first open
                if (!expanded && target.dataset.loaded !== 'true') {
                    const ref = btn.querySelector('.scripture-ref-text').textContent.replace('📖 ', '');
                    loadPassage(ref, target);
                }
            });
        });
        initVersionPicker(container);
    }

    /**
     * Load passage text: local Bible JSON first (user-selected version),
     * falling back to the bible-api.com KJV snippet when local text is
     * unavailable (e.g. bibles/ not deployed).
     */
    function loadPassage(ref, container) {
        const preview = container.querySelector('.scripture-preview');
        preview.textContent = 'Loading passage…';
        BibleText.getPassage(ref).then(passage => {
            if (passage) {
                // Chapter-qualify verse numbers only for cross-chapter refs
                const multiCh = passage.verses.some(x => x.c !== passage.verses[0].c);
                const parts = passage.verses.map(v =>
                    `<sup>${multiCh ? v.c + ':' : ''}${v.v}</sup> ${escapeHtml(v.text)}`);
                preview.innerHTML = parts.join(' ')
                    + (passage.truncated ? ' <span class="scripture-truncated">… (passage continues)</span>' : '');
                container.dataset.loaded = 'true';
                return;
            }
            // Fallback: external KJV snippet
            return Api.getScripturePassage(ref).then(text => {
                preview.textContent = text
                    ? text.substring(0, 500) + (text.length > 500 ? '…' : '')
                    : 'Passage text is not available.';
                container.dataset.loaded = 'true';
            });
        }).catch(() => {
            preview.textContent = 'Passage text is not available.';
            container.dataset.loaded = 'true';
        });
    }

    /**
     * Bible-version picker, shown in the Scripture section header whenever
     * local bibles exist. Changing it re-loads any open passages and
     * persists the choice for future sessions.
     */
    function initVersionPicker(container) {
        const head = container.querySelector('.scripture-section-head');
        if (!head) return;
        BibleText.manifest().then(man => {
            if (!man) return; // no local bibles — header stays plain
            let sel = head.querySelector('.bible-version-select');
            if (!sel) {
                sel = document.createElement('select');
                sel.className = 'bible-version-select';
                sel.setAttribute('aria-label', 'Bible version');
                head.appendChild(sel);
            }
            sel.innerHTML = man.versions
                .map(v => `<option value="${v.id}">${escapeHtml(v.short)}</option>`)
                .join('');
            const current = BibleText.getVersion();
            sel.value = man.versions.some(v => v.id === current) ? current : man.versions[0].id;
            sel.addEventListener('change', () => {
                BibleText.setVersion(sel.value);
                if (window._vibrate) window._vibrate(6);
                // Re-load every accordion body: open ones now, closed ones lazily
                container.querySelectorAll('.scripture-body').forEach(body => {
                    body.dataset.loaded = 'false';
                    if (!body.hidden) {
                        const btn = container.querySelector(`[data-target="${body.id}"]`);
                        const ref = btn.querySelector('.scripture-ref-text').textContent.replace('📖 ', '');
                        loadPassage(ref, body);
                        body.dataset.loaded = 'true';
                    }
                });
            });
        });
    }

    function chapterRefLink(text) {
        return escapeHtml(text);
    }

    return { init, show, close };
})();

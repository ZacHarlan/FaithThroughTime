// detail-panel.js — Right-side detail panel for selected items
const DetailPanel = (() => {
    const panel = () => document.getElementById('detail-panel');
    const title = () => document.getElementById('detail-title');
    const content = () => document.getElementById('detail-content');

    function init() {
        document.getElementById('btn-close-detail').addEventListener('click', close);
        initSwipeToDismiss();
        initSwipeBack();

        // Prevent drag-to-pan handlers on underlying containers from
        // intercepting scroll/touch inside the detail panel
        const p = panel();
        p.addEventListener('mousedown', e => e.stopPropagation());
        p.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
        p.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    }

    function initSwipeToDismiss() {
        const handle = document.querySelector('.detail-drag-handle');
        if (!handle) return;

        let startY = 0;
        let currentY = 0;
        let dragging = false;

        handle.addEventListener('touchstart', e => {
            startY = e.touches[0].clientY;
            currentY = startY;
            dragging = true;
            panel().style.transition = 'none';
        }, { passive: true });

        handle.addEventListener('touchmove', e => {
            if (!dragging) return;
            currentY = e.touches[0].clientY;
            const dy = Math.max(0, currentY - startY);
            panel().style.transform = `translateY(${dy}px)`;
        }, { passive: true });

        handle.addEventListener('touchend', () => {
            if (!dragging) return;
            dragging = false;
            panel().style.transition = '';
            const dy = currentY - startY;
            if (dy > 80) {
                close();
            } else {
                panel().style.transform = '';
            }
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

    function show(item) {
        if (!item) { close(); return; }

        panel().classList.remove('hidden');
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
            btn.className = 'btn-bookmark';
            btn.title = 'Save';
            const header = panel().querySelector('.panel-header');
            header.insertBefore(btn, header.querySelector('.btn-close'));
        }
        const bm = window._bookmarks;
        if (!bm || item.type === 'stop') { btn.style.display = 'none'; return; }
        btn.style.display = '';
        const saved = bm.isItemSaved(item.type, item.id);
        btn.textContent = saved ? '★' : '☆';
        btn.classList.toggle('bookmarked', saved);
        btn.onclick = () => {
            if (bm.isItemSaved(item.type, item.id)) {
                bm.removeSavedItem(item.type, item.id);
            } else {
                const meta = item.type === 'person'
                    ? (item.role || '')
                    : (item.category || '');
                bm.saveItem(item.type, item.id, item.name, meta);
            }
            updateBookmarkButton(item);
        };
    }

    function addShareButton(item) {
        if (!navigator.share || item.type === 'stop') return;
        let btn = panel().querySelector('.btn-share');
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'btn-bookmark'; // reuse style
            btn.title = 'Share';
            btn.textContent = '↗';
            const header = panel().querySelector('.panel-header');
            header.insertBefore(btn, header.querySelector('.btn-close'));
        }
        btn.onclick = () => {
            const url = `${window.location.origin}/#${item.type}/${item.id}`;
            navigator.share({
                title: item.name + ' — Bible Timeline',
                text: `${item.name} — ${item.type === 'person' ? (item.role || 'Biblical Figure') : (item.category || 'Biblical Event')}`,
                url
            }).catch(() => {});
        };
    }

    // Navigation stack for card-based drill-down
    const navStack = [];

    function close() {
        panel().classList.add('hidden');
        navStack.length = 0;
        State.selectedItem = null;
        removeBackButton();
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
                btn.className = 'btn-back';
                btn.title = 'Back';
                btn.innerHTML = '←';
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
            html += `<div class="detail-section"><h3>Description</h3><p class="detail-description">${escapeHtml(p.description)}</p></div>`;
        }

        // Date notes
        if (p.dateNotes) {
            html += `<div class="detail-section"><h3>Chronology Notes</h3><p class="detail-description date-uncertain">${escapeHtml(p.dateNotes)}</p></div>`;
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
            html += '<div class="detail-section"><h3>Scripture</h3><div class="scripture-list">';
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
            html += `<div class="detail-section"><h3>Description</h3><p class="detail-description">${escapeHtml(e.description)}</p></div>`;
        }

        // Date notes
        if (e.dateNotes) {
            html += `<div class="detail-section"><h3>Chronology Notes</h3><p class="detail-description date-uncertain">${escapeHtml(e.dateNotes)}</p></div>`;
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
            html += '<div class="detail-section"><h3>Map</h3><div id="detail-mini-map" class="detail-mini-map"></div></div>';
        }

        // Scripture references
        if (e.scriptureReferences && e.scriptureReferences.length) {
            html += '<div class="detail-section"><h3>Scripture</h3><div class="scripture-list">';
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
        }
    }

    function renderStop(s) {
        const c = content();
        let html = '';

        html += '<div class="detail-section"><h3>Details</h3><dl class="detail-meta">';
        if (s.year != null) html += metaRow('Date', s.year < 0 ? `${Math.abs(s.year)} BC` : `AD ${s.year}`);
        if (s.chapter) html += metaRow('Reference', chapterRefLink(s.chapter));
        if (s.locationName) html += metaRow('Location', escapeHtml(s.locationName));
        html += '</dl></div>';

        if (s.stopDescription) {
            html += `<div class="detail-section"><h3>Description</h3><p class="detail-description">${escapeHtml(s.stopDescription)}</p></div>`;
        }

        // Mini-map for the stop location
        if (s.latitude && s.longitude) {
            html += '<div class="detail-section"><h3>Map</h3><div id="detail-mini-map" class="detail-mini-map"></div></div>';
        }

        c.innerHTML = html;

        if (s.latitude && s.longitude) {
            setTimeout(() => {
                if (typeof MapView !== 'undefined') {
                    MapView.renderMiniMap('detail-mini-map', [{ name: s.locationName, latitude: s.latitude, longitude: s.longitude }]);
                }
            }, 50);
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
            const age = d - b;
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

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function bibleGatewayUrl(ref) {
        if (!ref) return null;
        return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=ESV`;
    }

    function scriptureLink(s) {
        const text = escapeHtml(s.referenceText);
        const url = bibleGatewayUrl(s.referenceText);
        const id = 'scr-' + Math.random().toString(36).slice(2, 8);
        let html = `<div class="scripture-accordion">`;
        html += `<button class="scripture-toggle" aria-expanded="false" data-target="${id}">`;
        html += `<span class="scripture-ref-text">📖 ${text}</span>`;
        html += `<span class="scripture-chevron">›</span>`;
        html += `</button>`;
        html += `<div class="scripture-body" id="${id}" hidden>`;
        html += `<p class="scripture-preview">Loading passage…</p>`;
        if (url) {
            html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="scripture-read-more">Read full passage on BibleGateway ↗</a>`;
        }
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
                    fetchScripturePreview(ref, target);
                }
            });
        });
    }

    function fetchScripturePreview(ref, container) {
        const preview = container.querySelector('.scripture-preview');
        // Use Bible API (bible-api.com is free, no CORS, no key needed)
        const apiRef = ref.replace(/\s+/g, '+');
        fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
                if (data && data.text) {
                    preview.textContent = data.text.trim().substring(0, 500);
                    if (data.text.length > 500) preview.textContent += '…';
                } else {
                    preview.textContent = 'Tap the link below to read this passage.';
                }
                container.dataset.loaded = 'true';
            })
            .catch(() => {
                preview.textContent = 'Tap the link below to read this passage.';
                container.dataset.loaded = 'true';
            });
    }

    function chapterRefLink(text) {
        const url = bibleGatewayUrl(text);
        if (url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="scripture-link">${escapeHtml(text)}</a>`;
        }
        return escapeHtml(text);
    }

    return { init, show, close };
})();

// detail-panel.js — Right-side detail panel for selected items
const DetailPanel = (() => {
    const panel = () => document.getElementById('detail-panel');
    const title = () => document.getElementById('detail-title');
    const content = () => document.getElementById('detail-content');

    function init() {
        document.getElementById('btn-close-detail').addEventListener('click', close);
        initSwipeToDismiss();

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

    function show(item) {
        if (!item) { close(); return; }

        panel().classList.remove('hidden');
        title().textContent = item.name;

        // Update bookmark button
        updateBookmarkButton(item);
        addShareButton(item);

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

    function close() {
        panel().classList.add('hidden');
        State.selectedItem = null;
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
            html += '<div class="detail-section"><h3>Scripture</h3><ul class="detail-list">';
            for (const s of p.scriptureReferences) {
                html += `<li>${scriptureLink(s)}</li>`;
            }
            html += '</ul></div>';
        }

        c.innerHTML = html;
        attachListClicks(c);
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
            html += '<div class="detail-section"><h3>Scripture</h3><ul class="detail-list">';
            for (const s of e.scriptureReferences) {
                html += `<li>${scriptureLink(s)}</li>`;
            }
            html += '</ul></div>';
        }

        c.innerHTML = html;
        attachListClicks(c);

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
                if (type === 'person') {
                    Api.getPersonDetail(id).then(detail => {
                        if (detail) {
                            State.setSelectedItem({ type: 'person', ...detail });
                            Timeline.zoomToYear(detail.birthYear || detail.deathYear);
                            setTimeout(() => Timeline.scrollToItem('person', id), 550);
                        }
                    });
                } else {
                    Api.getEventDetail(id).then(detail => {
                        if (detail) {
                            State.setSelectedItem({ type: 'event', ...detail });
                            Timeline.zoomToYear(detail.startYear || detail.endYear);
                            setTimeout(() => Timeline.scrollToItem('event', id), 550);
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
        if (url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="scripture-link">${text}</a>`;
        }
        return text;
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

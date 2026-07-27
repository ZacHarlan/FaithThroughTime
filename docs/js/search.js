// search.js — Search functionality
const Search = (() => {
    let debounceTimer;
    let _kbdIndex = -1;
    const DEBOUNCE_MS = 250;

    function init() {
        const input = document.getElementById('search-input');
        const dropdown = document.getElementById('search-results');

        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const q = input.value.trim();
            if (q.length < 2) {
                dropdown.classList.add('hidden');
                return;
            }
            debounceTimer = setTimeout(() => performSearch(q), DEBOUNCE_MS);
        });

        // Keyboard navigation: arrows highlight, Enter opens (the lineage
        // autocomplete had this; the header search inexplicably didn't)
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                input.blur();
                return;
            }
            const items = [...dropdown.querySelectorAll('.search-result-item[data-id]')];
            if (!items.length || dropdown.classList.contains('hidden')) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const dir = e.key === 'ArrowDown' ? 1 : -1;
                _kbdIndex = Math.max(0, Math.min(items.length - 1, _kbdIndex + dir));
                items.forEach((el, i) => el.classList.toggle('kbd-active', i === _kbdIndex));
                items[_kbdIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const target = _kbdIndex >= 0 ? items[_kbdIndex] : items[0];
                if (target) onResultClick(target);
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', e => {
            if (!e.target.closest('.search-container')) {
                dropdown.classList.add('hidden');
            }
        });
    }

    let _searchReq = 0;
    async function performSearch(query) {
        const dropdown = document.getElementById('search-results');
        const reqId = ++_searchReq;
        try {
            const results = await Api.search(query);
            if (reqId !== _searchReq) return; // stale response — newer query in flight
            if (!results.length) {
                dropdown.innerHTML = '<div class="search-result-item"><span class="result-meta">No results found</span></div>';
                dropdown.classList.remove('hidden');
                return;
            }

            // Group like the mobile overlay: People / Events / Books headers
            const groups = { person: [], event: [], book: [] };
            for (const r of results) {
                (groups[r.type] || groups.event).push(r);
            }
            const labels = { person: 'People', event: 'Events', book: 'Books' };
            const parts = [];
            for (const key of ['person', 'event', 'book']) {
                if (!groups[key].length) continue;
                parts.push(`<div class="result-group-header">${labels[key]} · ${groups[key].length}</div>`);
                for (const r of groups[key]) {
                    parts.push(`
                        <div class="search-result-item" data-type="${r.type}" data-id="${r.id}" data-year="${r.startYear || ''}">
                            <div class="result-name">${escapeHtml(r.name)}</div>
                            <div class="result-meta">
                                ${capitalize(r.type)}${r.startYear ? ` · ${Timeline.formatYear(r.startYear)}` : ''}
                                ${r.snippet ? ` — ${truncate(escapeHtml(r.snippet), 80)}` : ''}
                            </div>
                        </div>
                    `);
                }
            }
            dropdown.innerHTML = parts.join('');
            _kbdIndex = -1;

            dropdown.classList.remove('hidden');

            // Attach click handlers
            dropdown.querySelectorAll('.search-result-item[data-id]').forEach(item => {
                item.addEventListener('click', () => onResultClick(item));
            });
        } catch {
            dropdown.innerHTML = '<div class="search-result-item"><span class="result-meta">Search error</span></div>';
            dropdown.classList.remove('hidden');
        }
    }

    function onResultClick(el) {
        const type = el.dataset.type;
        const id = parseInt(el.dataset.id);
        const year = el.dataset.year ? parseInt(el.dataset.year) : null;

        // Close search
        document.getElementById('search-results').classList.add('hidden');
        document.getElementById('search-input').value = '';

        // Zoom to year and scroll to item
        if (year !== null) {
            Timeline.zoomToYear(year, 250);
        }

        // Open detail and scroll to the item after zoom transition completes
        const scrollAfterRender = () => {
            setTimeout(() => Timeline.scrollToItem(type, id), 550);
        };

        if (type === 'person') {
            Api.getPersonDetail(id).then(detail => {
                if (detail) {
                    State.setSelectedItem({ type: 'person', ...detail });
                    scrollAfterRender();
                }
            });
        } else if (type === 'event') {
            Api.getEventDetail(id).then(detail => {
                if (detail) {
                    State.setSelectedItem({ type: 'event', ...detail });
                    scrollAfterRender();
                }
            });
        }
    }

    function escapeHtml(str) { return Utils.escapeHtml(str); }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function truncate(str, len) {
        return str.length > len ? str.slice(0, len) + '…' : str;
    }

    return { init };
})();

// search.js — Search functionality
const Search = (() => {
    let debounceTimer;
    let kbdNav = null;
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

        // Keyboard navigation (shared implementation with the lineage
        // autocomplete): arrows highlight, Enter opens.
        kbdNav = Utils.listKeyNav({
            getItems: () => [...dropdown.querySelectorAll('.search-result-item[data-id]')],
            activeClass: 'kbd-active',
            isOpen: () => !dropdown.classList.contains('hidden'),
            onPick: el => onResultClick(el)
        });
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                input.blur();
                return;
            }
            kbdNav.handle(e);
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

            const parts = [];
            for (const group of Utils.groupSearchResults(results)) {
                parts.push(`<div class="result-group-header">${group.label} · ${group.items.length}</div>`);
                for (const r of group.items) {
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
            kbdNav.reset();

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
            Timeline.zoomToYear(year);
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

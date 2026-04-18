// search.js — Search functionality
const Search = (() => {
    let debounceTimer;
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

        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                input.blur();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', e => {
            if (!e.target.closest('.search-container')) {
                dropdown.classList.add('hidden');
            }
        });
    }

    async function performSearch(query) {
        const dropdown = document.getElementById('search-results');
        try {
            const results = await Api.search(query);
            if (!results.length) {
                dropdown.innerHTML = '<div class="search-result-item"><span class="result-meta">No results found</span></div>';
                dropdown.classList.remove('hidden');
                return;
            }

            dropdown.innerHTML = results.map(r => `
                <div class="search-result-item" data-type="${r.type}" data-id="${r.id}" data-year="${r.startYear || ''}">
                    <div class="result-name">${escapeHtml(r.name)}</div>
                    <div class="result-meta">
                        ${capitalize(r.type)}${r.startYear ? ` · ${Timeline.formatYear(r.startYear)}` : ''}
                        ${r.snippet ? ` — ${truncate(escapeHtml(r.snippet), 80)}` : ''}
                    </div>
                </div>
            `).join('');

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

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function truncate(str, len) {
        return str.length > len ? str.slice(0, len) + '…' : str;
    }

    return { init };
})();

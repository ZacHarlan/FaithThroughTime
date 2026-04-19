// app.js — Application entry point and orchestration
(async function main() {
    // Initialize modules
    Timeline.init();
    Filters.init();
    DetailPanel.init();
    Search.init();
    Lineage.init();

    // ── Unified tab switching (works for both header tabs and bottom nav) ──
    let lineageLoaded = false;
    let mapLoaded = false;

    async function switchTab(tab) {
        // Update all tab button states (header + bottom nav)
        document.querySelectorAll('.tab-btn, .bottom-nav-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });

        // Close mobile drawer on tab switch
        Filters.closeDrawer();
        DetailPanel.close();

        // Hide all tab content
        document.getElementById('app').style.display = 'none';
        document.getElementById('lineage-tab').classList.add('hidden');
        document.getElementById('map-tab').classList.add('hidden');
        const savedTab = document.getElementById('saved-tab');
        if (savedTab) savedTab.classList.add('hidden');
        document.querySelector('.header-center').style.display = 'none';
        document.querySelector('.header-right').style.display = 'none';

        // Close search overlay if open
        const searchOverlay = document.getElementById('search-overlay');
        if (searchOverlay) searchOverlay.classList.add('hidden');

        if (tab === 'timeline') {
            document.getElementById('app').style.display = '';
            document.querySelector('.header-center').style.display = '';
            document.querySelector('.header-right').style.display = '';
        } else if (tab === 'lineage') {
            document.getElementById('lineage-tab').classList.remove('hidden');
            if (!lineageLoaded) {
                lineageLoaded = true;
                await Lineage.loadPeopleList();
            }
        } else if (tab === 'map') {
            document.getElementById('map-tab').classList.remove('hidden');
            if (!mapLoaded) {
                mapLoaded = true;
                MapView.init();
            }
            await MapView.activate();
        } else if (tab === 'search') {
            // Open mobile search overlay
            if (searchOverlay) {
                searchOverlay.classList.remove('hidden');
                const input = document.getElementById('mobile-search-input');
                if (input) {
                    input.focus();
                    loadRecentSearches();
                }
            }
        } else if (tab === 'saved') {
            if (savedTab) {
                savedTab.classList.remove('hidden');
                renderSavedItems();
            }
        }

        // Update URL hash for deep linking
        if (tab !== 'timeline') {
            history.replaceState(null, '', '#' + tab);
        } else {
            history.replaceState(null, '', window.location.pathname);
        }
    }

    // Bind header tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Bind bottom nav
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Mobile search overlay
    const closeSearchBtn = document.getElementById('btn-close-search');
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            document.getElementById('search-overlay').classList.add('hidden');
            // Restore previous tab highlight
            const activeTab = document.querySelector('.tab-btn.active:not([data-tab="search"])');
            document.querySelectorAll('.bottom-nav-btn').forEach(b => {
                b.classList.toggle('active', activeTab && b.dataset.tab === activeTab.dataset.tab);
            });
        });
    }

    // Mobile search input
    const mobileSearchInput = document.getElementById('mobile-search-input');
    if (mobileSearchInput) {
        let mobileDebounce;
        mobileSearchInput.addEventListener('input', () => {
            clearTimeout(mobileDebounce);
            const q = mobileSearchInput.value.trim();
            if (q.length < 2) {
                document.getElementById('mobile-search-results').innerHTML = '';
                return;
            }
            mobileDebounce = setTimeout(() => performMobileSearch(q), 250);
        });
    }

    async function performMobileSearch(query) {
        const container = document.getElementById('mobile-search-results');
        try {
            const results = await Api.search(query);
            if (!results.length) {
                container.innerHTML = '<div class="search-result-item"><span class="result-meta">No results found</span></div>';
                return;
            }
            container.innerHTML = results.map(r => `
                <div class="search-result-item" data-type="${r.type}" data-id="${r.id}" data-year="${r.startYear || ''}">
                    <div class="result-name">${escapeHtml(r.name)}</div>
                    <div class="result-meta">
                        ${capitalize(r.type)}${r.startYear ? ` · ${Timeline.formatYear(r.startYear)}` : ''}
                        ${r.snippet ? ` — ${truncate(escapeHtml(r.snippet), 80)}` : ''}
                    </div>
                </div>
            `).join('');
            container.querySelectorAll('.search-result-item[data-id]').forEach(item => {
                item.addEventListener('click', () => onMobileResultClick(item, query));
            });
        } catch (err) {
            container.innerHTML = '<div class="search-result-item"><span class="result-meta">Search error</span></div>';
        }
    }

    async function onMobileResultClick(item, query) {
        const type = item.dataset.type;
        const id = parseInt(item.dataset.id);
        const year = item.dataset.year ? parseInt(item.dataset.year) : null;

        // Save to recent searches
        saveRecentSearch(query);

        // Close search overlay
        document.getElementById('search-overlay').classList.add('hidden');

        // Switch to timeline
        await switchTab('timeline');

        // Load detail
        if (type === 'person') {
            const detail = await Api.getPersonDetail(id);
            if (detail) {
                State.setSelectedItem({ type: 'person', ...detail });
                if (year) Timeline.zoomToYear(year);
            }
        } else {
            const detail = await Api.getEventDetail(id);
            if (detail) {
                State.setSelectedItem({ type: 'event', ...detail });
                if (year) Timeline.zoomToYear(year);
            }
        }
    }

    // ── Recent Searches (localStorage) ──
    function getRecentSearches() {
        try { return JSON.parse(localStorage.getItem('recentSearches') || '[]'); }
        catch { return []; }
    }
    function saveRecentSearch(q) {
        const searches = getRecentSearches().filter(s => s !== q);
        searches.unshift(q);
        localStorage.setItem('recentSearches', JSON.stringify(searches.slice(0, 10)));
    }
    function loadRecentSearches() {
        const list = document.getElementById('recent-searches-list');
        const container = document.getElementById('recent-searches');
        if (!list || !container) return;
        const searches = getRecentSearches();
        if (!searches.length) { container.style.display = 'none'; return; }
        container.style.display = '';
        list.innerHTML = searches.map(s => `<li>${escapeHtml(s)}</li>`).join('');
        list.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                const input = document.getElementById('mobile-search-input');
                input.value = li.textContent;
                input.dispatchEvent(new Event('input'));
            });
        });
    }

    // ── Bookmarks / Saved Items (localStorage) ──
    function getSavedItems() {
        try { return JSON.parse(localStorage.getItem('savedItems') || '[]'); }
        catch { return []; }
    }
    function saveItem(type, id, name, meta) {
        const items = getSavedItems().filter(i => !(i.type === type && i.id === id));
        items.unshift({ type, id, name, meta, savedAt: Date.now() });
        localStorage.setItem('savedItems', JSON.stringify(items));
    }
    function removeSavedItem(type, id) {
        const items = getSavedItems().filter(i => !(i.type === type && i.id === id));
        localStorage.setItem('savedItems', JSON.stringify(items));
    }
    function isItemSaved(type, id) {
        return getSavedItems().some(i => i.type === type && i.id === id);
    }

    function renderSavedItems() {
        const list = document.getElementById('saved-list');
        const empty = document.getElementById('saved-empty');
        if (!list) return;
        const items = getSavedItems();
        if (!items.length) {
            empty.style.display = '';
            list.innerHTML = '';
            return;
        }
        empty.style.display = 'none';
        list.innerHTML = items.map(i => `
            <li class="saved-item" data-type="${i.type}" data-id="${i.id}">
                <div class="saved-item-icon ${i.type}">${i.type === 'person' ? '👤' : '📅'}</div>
                <div class="saved-item-info">
                    <div class="saved-item-name">${escapeHtml(i.name)}</div>
                    <div class="saved-item-meta">${capitalize(i.type)}${i.meta ? ' · ' + escapeHtml(i.meta) : ''}</div>
                </div>
                <button class="saved-item-remove" data-type="${i.type}" data-id="${i.id}" title="Remove">×</button>
            </li>
        `).join('');
        list.querySelectorAll('.saved-item').forEach(li => {
            li.addEventListener('click', async (e) => {
                if (e.target.closest('.saved-item-remove')) return;
                const type = li.dataset.type;
                const id = parseInt(li.dataset.id);
                await switchTab('timeline');
                if (type === 'person') {
                    const detail = await Api.getPersonDetail(id);
                    if (detail) State.setSelectedItem({ type: 'person', ...detail });
                } else {
                    const detail = await Api.getEventDetail(id);
                    if (detail) State.setSelectedItem({ type: 'event', ...detail });
                }
            });
        });
        list.querySelectorAll('.saved-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeSavedItem(btn.dataset.type, parseInt(btn.dataset.id));
                renderSavedItems();
            });
        });
    }

    // Expose bookmark functions for detail panel
    window._bookmarks = { saveItem, removeSavedItem, isItemSaved, renderSavedItems };

    // Subscribe to state changes
    State.subscribe(async (changeType) => {
        if (changeType === 'filters') {
            await loadTimeline();
        }
        if (changeType === 'items' || changeType === 'periods') {
            Timeline.render();
        }
        if (changeType === 'selection') {
            DetailPanel.show(State.selectedItem);
            Timeline.highlightSelected();
        }
    });

    // ── Deep link handling ──
    async function handleHash() {
        const hash = window.location.hash.replace('#', '');
        if (['lineage', 'map', 'search', 'saved'].includes(hash)) {
            switchTab(hash);
            return;
        }
        // Handle person/event deep links: #person/123 or #event/456
        const match = hash.match(/^(person|event)\/(\d+)$/);
        if (match) {
            const type = match[1];
            const id = parseInt(match[2]);
            await switchTab('timeline');
            if (type === 'person') {
                const detail = await Api.getPersonDetail(id);
                if (detail) {
                    State.setSelectedItem({ type: 'person', ...detail });
                    Timeline.zoomToYear(detail.birthYear || detail.deathYear);
                }
            } else {
                const detail = await Api.getEventDetail(id);
                if (detail) {
                    State.setSelectedItem({ type: 'event', ...detail });
                    Timeline.zoomToYear(detail.startYear || detail.endYear);
                }
            }
        }
    }
    window.addEventListener('hashchange', handleHash);

    // Load initial data
    try {
        const [periods, filterOptions, books] = await Promise.all([
            Api.getPeriods(),
            Api.getFilters(),
            Api.getBooks()
        ]);

        State.setPeriods(periods);
        State.setFilterOptions(filterOptions);
        State.setBooks(books);

        Filters.populate(filterOptions);

        await loadTimeline();

        // Hide loading indicator
        document.getElementById('timeline-loading').style.display = 'none';

        // Fit to show all data
        setTimeout(() => Timeline.fitAll(), 100);

        // Handle deep link on load
        handleHash();
    } catch (err) {
        console.error('Failed to initialize:', err);
        document.getElementById('timeline-loading').textContent = 'Failed to load data. Please refresh.';
    }

    async function loadTimeline() {
        const params = State.getFilterParams();
        const items = await Api.getTimeline(params);
        State.setItems(items);
    }

    // Helpers
    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }
})();

// app.js — Application entry point and orchestration
(async function main() {
    // Initialize modules
    Timeline.init();
    Filters.init();
    DetailPanel.init();
    Search.init();
    Lineage.init();

    // ── Haptics (mobile) ──
    function vibrate(pattern) {
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch {}
        }
    }
    window._vibrate = vibrate;

    // ── Surface history: Back closes the topmost overlay/sheet/drawer ──
    // Each opened surface pushes one history entry; popstate closes it.
    // UI close paths call requestClose() so the entry is consumed via
    // history.back() instead of leaking (Android Back then works as expected).
    const Surfaces = (() => {
        const stack = [];
        const closers = {};
        const queuedOpens = [];
        let popping = false;
        let pendingBack = 0;   // programmatic history.back()s in flight
        let orphaned = 0;      // history entries whose surface closed out of order

        function register(name, closeFn) { closers[name] = closeFn; }

        function opened(name, url) {
            // A programmatic back() is still in flight: pushing now would
            // land BEFORE the back executes and get eaten by it (this was
            // the mobile search dead-end). Queue until the popstate settles.
            if (pendingBack > 0) {
                queuedOpens.push([name, url]);
                return;
            }
            if (stack[stack.length - 1] === name) {
                // Already top (e.g. drill-down within the detail panel) —
                // just keep the URL current, no extra history entry.
                if (url) history.replaceState({ surface: name }, '', url);
                return;
            }
            stack.push(name);
            history.pushState({ surface: name }, '', url);
        }

        /**
         * Bookkeeping for a surface the CALLER is closing synchronously.
         * Always returns false — callers proceed with their own close.
         * (The old design returned true and relied on the async popstate to
         * re-enter close(); the race corrupted the stack — C1/C2/C3.)
         */
        function requestClose(name) {
            const i = stack.lastIndexOf(name);
            if (i === -1) return false;
            const wasTop = i === stack.length - 1;
            stack.splice(i, 1);
            if (!popping) {
                if (wasTop) {
                    pendingBack++;
                    window._suppressNextHash = (window._suppressNextHash || 0) + 1;
                    // If the back() changes no hash, no hashchange fires and
                    // the token would leak — expire it shortly after.
                    setTimeout(() => {
                        if (window._suppressNextHash > 0) window._suppressNextHash--;
                    }, 250);
                    history.back();
                } else {
                    orphaned++;
                }
            }
            return false;
        }

        function closeTop() {
            const name = stack[stack.length - 1];
            if (!name) return false;
            if (closers[name]) closers[name]();
            return true;
        }

        window.addEventListener('popstate', () => {
            if (pendingBack > 0) {
                // Our own back() settling — swallow, then flush queued opens
                pendingBack--;
                if (pendingBack === 0 && queuedOpens.length) {
                    const q = queuedOpens.splice(0);
                    for (const [n, u] of q) opened(n, u);
                }
                return;
            }
            const name = stack.pop();
            if (!name) {
                // Either a real back-navigation with no surfaces open, or an
                // orphaned entry from an out-of-order close — absorb the latter.
                if (orphaned > 0) orphaned--;
                return;
            }
            popping = true;
            try { if (closers[name]) closers[name](); }
            finally { popping = false; }
        });

        return { register, opened, requestClose, closeTop };
    })();
    window._surfaces = Surfaces;

    Surfaces.register('detail', () => DetailPanel.close());
    Surfaces.register('drawer', () => Filters.closeDrawer());
    Surfaces.register('search', () => switchTab(lastNonSearchTab || 'timeline'));

    // Escape closes the topmost surface (sheet, drawer, or search overlay)
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        // Let open dropdowns/autocompletes consume their own Escape first
        if (e.target.closest && e.target.closest('.search-container, .lineage-autocomplete')) return;
        Surfaces.closeTop();
    });

    // ── Theme Toggle ──
    initTheme();

    function initTheme() {
        const saved = localStorage.getItem('bt-theme');
        if (saved === 'light' || saved === 'dark') {
            applyTheme(saved);
        } else {
            // No explicit choice yet — respect the OS preference
            const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
            applyTheme(prefersLight ? 'light' : 'dark');
        }
        const btn = document.getElementById('btn-theme-toggle');
        if (btn) btn.addEventListener('click', toggleTheme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        applyTheme(next);
        localStorage.setItem('bt-theme', next);
        vibrate(8);
    }

    function applyTheme(theme) {
        const btn = document.getElementById('btn-theme-toggle');
        const useEl = btn ? btn.querySelector('use') : null;
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            if (useEl) useEl.setAttribute('href', '#i-sun');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f5f5f0');
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (useEl) useEl.setAttribute('href', '#i-moon');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#1a1a2e');
        }
    }

    // ── Unified tab switching (works for both header tabs and bottom nav) ──
    let lineageLoaded = false;
    let mapLoaded = false;
    let lastNonSearchTab = 'timeline';
    let currentTab = 'timeline';
    // Request tokens — declared up here because loadTimeline() runs during
    // init, before later `let` statements in this function body execute (TDZ)
    let _timelineReq = 0;
    let _mobileSearchReq = 0;

    async function switchTab(tab) {
        if (tab !== 'search') lastNonSearchTab = tab;
        // Update all tab button states (header + bottom nav)
        document.querySelectorAll('.tab-btn, .bottom-nav-btn').forEach(b => {
            const active = b.dataset.tab === tab;
            b.classList.toggle('active', active);
            if (active) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        });

        vibrate(8);

        // Close mobile drawer on tab switch. The detail panel survives most
        // tab switches (peeking at the Map mid-read must not destroy the
        // drill-down stack) — EXCEPT when leaving the Map tab: a lingering
        // journey-stop sidebar over the timeline is stale clutter.
        Filters.closeDrawer();
        if (currentTab === 'map' && tab !== 'map' && tab !== 'search') {
            DetailPanel.close();
        }
        currentTab = tab === 'search' ? currentTab : tab;

        // Hide all tab content
        document.getElementById('app').style.display = 'none';
        document.getElementById('lineage-tab').classList.add('hidden');
        document.getElementById('map-tab').classList.add('hidden');
        const savedTab = document.getElementById('saved-tab');
        if (savedTab) savedTab.classList.add('hidden');
        const headerCenter = document.querySelector('.header-center');
        const headerRight = document.querySelector('.header-right');
        if (headerCenter) headerCenter.style.display = 'none';
        if (headerRight) headerRight.style.display = 'none';

        // Close search overlay if open (consume its history entry too)
        const searchOverlay = document.getElementById('search-overlay');
        if (searchOverlay && !searchOverlay.classList.contains('hidden') && tab !== 'search') {
            Surfaces.requestClose('search');
        }
        if (searchOverlay) searchOverlay.classList.add('hidden');

        if (tab === 'timeline') {
            document.getElementById('app').style.display = '';
            if (headerCenter) headerCenter.style.display = '';
            if (headerRight) headerRight.style.display = '';
            // Re-measure: a rotation while another tab was visible measured
            // the hidden container at 0×0 and blanked the scale range
            if (Timeline.refresh) Timeline.refresh();
            if (DetailPanel.refreshMapHint) DetailPanel.refreshMapHint();
        } else if (tab === 'lineage') {
            document.getElementById('lineage-tab').classList.remove('hidden');
            if (!lineageLoaded) {
                // Flag only after success — a flaky first load must be retryable
                try {
                    await Lineage.loadPeopleList();
                    lineageLoaded = true;
                } catch (e) { console.error('Lineage load failed:', e); }
            }
        } else if (tab === 'map') {
            document.getElementById('map-tab').classList.remove('hidden');
            if (!mapLoaded) {
                mapLoaded = true;
                MapView.init();
            }
            await MapView.activate();
            if (DetailPanel.refreshMapHint) DetailPanel.refreshMapHint();
        } else if (tab === 'search') {
            // Open mobile search overlay
            if (searchOverlay) {
                searchOverlay.classList.remove('hidden');
                Surfaces.opened('search');
                const input = document.getElementById('mobile-search-input');
                if (input) {
                    setTimeout(() => input.focus(), 100);
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

    // Expose for the detail panel's "Open in Map view" navigation
    window._switchTab = switchTab;

    // Bind header tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Bind bottom nav
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Mobile header search button (icon-only) opens the search overlay
    const mobileSearchBtn = document.getElementById('btn-mobile-search');
    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', () => switchTab('search'));
    }

    // Mobile search overlay close — restore previous tab
    const closeSearchBtn = document.getElementById('btn-close-search');
    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', () => {
            Surfaces.requestClose('search'); // bookkeeping only; close is ours
            switchTab(lastNonSearchTab || 'timeline');
        });
    }

    // Clear-input button inside the overlay
    const clearSearchBtn = document.getElementById('btn-clear-search');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            const input = document.getElementById('mobile-search-input');
            if (input) {
                input.value = '';
                input.dispatchEvent(new Event('input'));
                input.focus();
            }
        });
    }

    // Clear-all recent searches
    const clearRecentBtn = document.getElementById('btn-clear-recent');
    if (clearRecentBtn) {
        clearRecentBtn.addEventListener('click', () => {
            localStorage.removeItem('recentSearches');
            loadRecentSearches();
            vibrate(8);
        });
    }

    // Mobile search input
    const mobileSearchInput = document.getElementById('mobile-search-input');
    if (mobileSearchInput) {
        let mobileDebounce;
        mobileSearchInput.addEventListener('input', () => {
            clearTimeout(mobileDebounce);
            const q = mobileSearchInput.value.trim();
            const clearBtn = document.getElementById('btn-clear-search');
            if (clearBtn) clearBtn.classList.toggle('hidden', q.length === 0);
            const recent = document.getElementById('recent-searches');
            const results = document.getElementById('mobile-search-results');
            if (q.length < 2) {
                if (results) results.innerHTML = '';
                if (recent) recent.style.display = '';
                loadRecentSearches();
                return;
            }
            if (recent) recent.style.display = 'none';
            mobileDebounce = setTimeout(() => performMobileSearch(q), 250);
        });
    }

    async function performMobileSearch(query) {
        const container = document.getElementById('mobile-search-results');
        const reqId = ++_mobileSearchReq;
        try {
            const results = await Api.search(query);
            if (reqId !== _mobileSearchReq) return; // stale response
            if (!results.length) {
                container.innerHTML = '<div class="search-result-item" style="justify-content:center"><span class="result-meta">No results found</span></div>';
                return;
            }
            // Group by type ('scripture' is the legacy name for book results)
            const groups = { person: [], event: [], book: [] };
            for (const r of results) {
                const key = groups[r.type] ? r.type : (r.type === 'scripture' ? 'book' : 'event');
                groups[key].push(r);
            }
            const sectionLabels = { person: 'People', event: 'Events', book: 'Books' };
            const sectionIcons = { person: '#i-person', event: '#i-calendar', book: '#i-book' };
            const parts = [];
            for (const key of ['person', 'event', 'book']) {
                const list = groups[key];
                if (!list.length) continue;
                parts.push(`<div class="result-group-header">${sectionLabels[key]} · ${list.length}</div>`);
                for (const r of list) {
                    parts.push(`
                        <div class="search-result-item" data-type="${r.type}" data-id="${r.id}" data-year="${r.startYear || ''}">
                            <span class="result-icon ${r.type}"><svg class="icon"><use href="${sectionIcons[key]}"/></svg></span>
                            <div class="result-info">
                                <div class="result-name">${escapeHtml(r.name)}</div>
                                <div class="result-meta">
                                    ${capitalize(r.type)}${r.startYear ? ` · ${Timeline.formatYear(r.startYear)}` : ''}${r.snippet ? ` · ${truncate(escapeHtml(r.snippet), 60)}` : ''}
                                </div>
                            </div>
                        </div>
                    `);
                }
            }
            container.innerHTML = parts.join('');
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

        // Switch to timeline — switchTab also closes the search overlay and
        // consumes its history entry (don't hide it directly here, or the
        // orphaned entry makes the next Back press a no-op)
        await switchTab('timeline');

        // Load detail. Books have no detail view — jump to their writing era.
        if (type === 'person') {
            const detail = await Api.getPersonDetail(id);
            if (detail) {
                State.setSelectedItem({ type: 'person', ...detail });
                if (year) Timeline.zoomToYear(year, 250);
            }
        } else if (type === 'event') {
            const detail = await Api.getEventDetail(id);
            if (detail) {
                State.setSelectedItem({ type: 'event', ...detail });
                if (year) Timeline.zoomToYear(year, 250);
            }
        } else {
            if (year) Timeline.zoomToYear(year, 400);
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
        list.innerHTML = searches.map((s, i) => `
            <li class="recent-chip" data-i="${i}">
                <span class="recent-chip-text">${escapeHtml(s)}</span>
                <button class="recent-chip-remove" data-i="${i}" aria-label="Remove">×</button>
            </li>
        `).join('');
        list.querySelectorAll('.recent-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                if (e.target.closest('.recent-chip-remove')) return;
                const input = document.getElementById('mobile-search-input');
                input.value = chip.querySelector('.recent-chip-text').textContent;
                input.dispatchEvent(new Event('input'));
            });
        });
        list.querySelectorAll('.recent-chip-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.i);
                const arr = getRecentSearches();
                arr.splice(idx, 1);
                localStorage.setItem('recentSearches', JSON.stringify(arr));
                loadRecentSearches();
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
                <div class="saved-item-icon ${i.type}"><svg class="icon"><use href="#i-${i.type === 'person' ? 'person' : 'calendar'}"/></svg></div>
                <div class="saved-item-info">
                    <div class="saved-item-name">${escapeHtml(i.name)}</div>
                    <div class="saved-item-meta">${capitalize(i.type)}${i.meta ? ' · ' + escapeHtml(i.meta) : ''}</div>
                </div>
                <button class="saved-item-remove btn-icon" data-type="${i.type}" data-id="${i.id}" title="Remove" aria-label="Remove">
                    <svg class="icon"><use href="#i-trash"/></svg>
                </button>
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
        // Programmatic history.back() (surface bookkeeping) restores an old
        // hash like #map — that must NOT re-trigger a tab switch, or leaving
        // the Map tab bounces straight back to it (audit C3).
        if (window._suppressNextHash > 0) {
            window._suppressNextHash--;
            return;
        }
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
                    Timeline.zoomToYear(detail.birthYear || detail.deathYear, 250);
                }
            } else {
                const detail = await Api.getEventDetail(id);
                if (detail) {
                    State.setSelectedItem({ type: 'event', ...detail });
                    Timeline.zoomToYear(detail.startYear || detail.endYear, 250);
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
        if (typeof EraScrubber !== 'undefined') EraScrubber.setPeriods(periods);

        await loadTimeline();

        // Hide loading indicator
        document.getElementById('timeline-loading').style.display = 'none';

        // Fit to show all data
        setTimeout(() => Timeline.fitAll(), 100);

        // Handle deep link on load
        handleHash();

    } catch (err) {
        console.error('Failed to initialize:', err);
        const loading = document.getElementById('timeline-loading');
        const msg = navigator.onLine
            ? 'Something went wrong loading the timeline data.'
            : 'You appear to be offline, and the timeline data hasn’t been cached yet.';
        loading.innerHTML = `
            <h2 class="loading-title">Faith Through Time</h2>
            <p>${msg}</p>
            <button id="btn-retry-init" class="btn-retry" type="button">Try again</button>`;
        document.getElementById('btn-retry-init').addEventListener('click', () => location.reload());
    }

    // ── First-visit gesture hint (touch devices) ──
    (function showFirstVisitHint() {
        const isTouchDev = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        if (!isTouchDev || localStorage.getItem('bt-hint-seen')) return;
        const toast = document.createElement('div');
        toast.className = 'hint-toast';
        toast.setAttribute('role', 'status');
        toast.textContent = 'Pinch to zoom · swipe to explore · tap any item for details';
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        const dismiss = () => {
            localStorage.setItem('bt-hint-seen', '1');
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 400);
        };
        toast.addEventListener('click', dismiss);
        setTimeout(dismiss, 6000);
    })();

    async function loadTimeline() {
        // Monotonic token: if a newer request started while this one was in
        // flight, drop this response — last-issued wins, not last-arrived.
        const reqId = ++_timelineReq;
        const params = State.getFilterParams();
        const items = await Api.getTimeline(params);
        if (reqId !== _timelineReq) return;
        State.setItems(items);
    }

    // Helpers
    function escapeHtml(str) { return Utils.escapeHtml(str); }
    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }
})();

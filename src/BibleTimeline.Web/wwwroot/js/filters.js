// filters.js — Filter panel logic
const Filters = (() => {
    let _options = null;
    let _debounceTimer = null;

    function isMobile() { return window.matchMedia('(max-width: 767px)').matches; }

    function init() {
        // Mobile drawer toggle
        const hamburger = document.getElementById('btn-mobile-filters');
        const backdrop = document.getElementById('mobile-backdrop');
        if (hamburger) {
            hamburger.addEventListener('click', toggleDrawer);
        }
        if (backdrop) {
            backdrop.addEventListener('click', closeDrawer);
        }

        // Show toggles
        document.getElementById('filter-people').addEventListener('change', e => {
            State.updateFilter('includePeople', e.target.checked);
        });
        document.getElementById('filter-events').addEventListener('change', e => {
            State.updateFilter('includeEvents', e.target.checked);
        });

        // Significance toggle buttons
        initToggleGroup('significance-toggle', 'significance');

        // Date range slider
        document.getElementById('range-start').addEventListener('input', onRangeChange);
        document.getElementById('range-end').addEventListener('input', onRangeChange);

        // Dropdowns
        document.getElementById('filter-period').addEventListener('change', e => {
            State.updateFilter('period', e.target.value);
        });
        document.getElementById('filter-confidence').addEventListener('change', e => {
            State.updateFilter('dateConfidence', e.target.value);
        });
        document.getElementById('filter-tribe').addEventListener('change', e => {
            State.updateFilter('tribe', e.target.value);
        });
        document.getElementById('filter-book').addEventListener('change', e => {
            State.updateFilter('bookId', e.target.value);
        });
        document.getElementById('filter-location').addEventListener('change', e => {
            State.updateFilter('locationId', e.target.value);
        });

        // Clear all
        document.getElementById('btn-clear-filters').addEventListener('click', () => {
            State.clearFilters();
            syncUI();
        });

        // Subscribe to state changes
        State.subscribe(changeType => {
            if (changeType === 'filters') {
                updateChips();
                updateContextualVisibility();
                updateFooterCount();
            }
            if (changeType === 'items') {
                updateCount();
                updateFooterCount();
            }
        });

        // Mobile-only enhancements: accordion, footer, edge-swipe close
        injectMobileFooter();
        if (isMobile()) {
            applyMobileAccordion();
            applyChipGroups();
            initEdgeSwipeClose();
        }
        // Re-apply on resize boundary crossings
        window.addEventListener('resize', () => {
            if (isMobile()) {
                applyMobileAccordion();
                applyChipGroups();
            } else {
                resetMobileAccordion();
            }
        });
    }

    function initToggleGroup(groupId, filterKey) {
        const group = document.getElementById(groupId);
        group.addEventListener('click', e => {
            const btn = e.target.closest('.toggle-btn');
            if (!btn) return;
            group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            State.updateFilter(filterKey, btn.dataset.value);
        });
    }

    function onRangeChange() {
        const rangeStart = document.getElementById('range-start');
        const rangeEnd = document.getElementById('range-end');
        let startVal = parseInt(rangeStart.value);
        let endVal = parseInt(rangeEnd.value);

        // Prevent crossover
        if (startVal > endVal - 50) {
            startVal = endVal - 50;
            rangeStart.value = startVal;
        }

        document.getElementById('range-start-label').textContent = formatYear(startVal);
        document.getElementById('range-end-label').textContent = formatYear(endVal);

        // Debounce API call
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => {
            const isDefault = startVal <= -4100 && endVal >= 2030;
            State.updateFilters({
                startYear: isDefault ? null : startVal,
                endYear: isDefault ? null : endVal
            });
        }, 200);
    }

    function populate(options) {
        _options = options;

        // Multi-select checkbox groups
        populateCheckboxGroup('role-checkboxes', options.roles.map(r => ({
            value: r, label: capitalize(r)
        })), 'role');
        populateCheckboxGroup('category-checkboxes', options.eventCategories.map(c => ({
            value: c, label: capitalize(c)
        })), 'category');

        // Dropdowns
        populateSelect('filter-period', options.timePeriods.map(p => ({ value: p.name, label: p.name })));
        populateSelect('filter-confidence', options.dateConfidences.map(d => ({ value: d, label: capitalize(d) })));
        populateSelect('filter-tribe', options.tribes.map(t => ({ value: t, label: t })));
        populateSelect('filter-location', options.locations.map(l => ({ value: l.id, label: l.name })));
        populateSelect('filter-book', options.books.map(b => ({ value: b.id, label: b.name })));

        renderLegend(options);
        updateContextualVisibility();
        // Now that the legend section was just (re-)created, re-apply mobile accordion/chips
        if (isMobile()) {
            applyMobileAccordion();
            applyChipGroups();
        }
        updateFooterCount();
    }

    function populateCheckboxGroup(containerId, items, filterKey) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        for (const item of items) {
            const label = document.createElement('label');
            label.className = 'checkbox-item';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.value = item.value;
            input.addEventListener('change', () => onCheckboxGroupChange(containerId, filterKey));
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + item.label));
            container.appendChild(label);
        }
    }

    function onCheckboxGroupChange(containerId, filterKey) {
        const container = document.getElementById(containerId);
        const checked = [...container.querySelectorAll('input:checked')].map(i => i.value);
        // Single value when one selected, empty when none (= all)
        State.updateFilter(filterKey, checked.length === 1 ? checked[0] : '');
    }

    function populateSelect(id, items) {
        const select = document.getElementById(id);
        const first = select.options[0];
        select.innerHTML = '';
        select.appendChild(first);
        for (const item of items) {
            const opt = document.createElement('option');
            opt.value = item.value;
            opt.textContent = item.label;
            select.appendChild(opt);
        }
    }

    function updateContextualVisibility() {
        const f = State.filters;
        document.querySelectorAll('.filter-people-only').forEach(el => {
            el.classList.toggle('filter-dimmed', !f.includePeople);
        });
        document.querySelectorAll('.filter-events-only').forEach(el => {
            el.classList.toggle('filter-dimmed', !f.includeEvents);
        });
    }

    function updateChips() {
        const f = State.filters;
        const container = document.getElementById('filter-chips');
        const wrapper = document.getElementById('active-filters');
        container.innerHTML = '';

        const chips = [];
        if (f.significance) chips.push({ key: 'significance', label: capitalize(f.significance) });
        if (f.period) chips.push({ key: 'period', label: f.period });
        if (f.role) chips.push({ key: 'role', label: capitalize(f.role) });
        if (f.category) chips.push({ key: 'category', label: capitalize(f.category) });
        if (f.tribe) chips.push({ key: 'tribe', label: f.tribe });
        if (f.dateConfidence) chips.push({ key: 'dateConfidence', label: capitalize(f.dateConfidence) });
        if (f.bookId) {
            const book = _options?.books?.find(b => String(b.id) === String(f.bookId));
            chips.push({ key: 'bookId', label: book ? book.name : 'Book ' + f.bookId });
        }
        if (f.locationId) {
            const loc = _options?.locations?.find(l => String(l.id) === String(f.locationId));
            chips.push({ key: 'locationId', label: loc ? loc.name : 'Location ' + f.locationId });
        }
        if (f.startYear !== null || f.endYear !== null) {
            const start = f.startYear !== null ? formatYear(f.startYear) : '4000 BC';
            const end = f.endYear !== null ? formatYear(f.endYear) : 'AD 100';
            chips.push({ key: 'dateRange', label: start + ' – ' + end });
        }
        if (!f.includePeople) chips.push({ key: 'includePeople', label: 'People hidden' });
        if (!f.includeEvents) chips.push({ key: 'includeEvents', label: 'Events hidden' });

        if (chips.length === 0) {
            wrapper.classList.add('hidden');
            return;
        }
        wrapper.classList.remove('hidden');

        for (const chip of chips) {
            const el = document.createElement('span');
            el.className = 'chip';
            el.textContent = chip.label + ' ';
            const btn = document.createElement('button');
            btn.className = 'chip-remove';
            btn.textContent = '\u00d7';
            btn.setAttribute('aria-label', 'Remove filter: ' + chip.label);
            btn.addEventListener('click', () => removeChip(chip.key));
            el.appendChild(btn);
            container.appendChild(el);
        }
    }

    function removeChip(key) {
        if (key === 'dateRange') {
            State.updateFilters({ startYear: null, endYear: null });
        } else if (key === 'includePeople') {
            State.updateFilter('includePeople', true);
        } else if (key === 'includeEvents') {
            State.updateFilter('includeEvents', true);
        } else {
            State.updateFilter(key, '');
        }
        syncUI();
    }

    function updateCount() {
        const countEl = document.getElementById('filter-count');
        const hasFilters = !document.getElementById('active-filters').classList.contains('hidden');
        if (hasFilters) {
            const total = State.items.length;
            countEl.textContent = total + ' item' + (total !== 1 ? 's' : '') + ' shown';
        } else {
            countEl.textContent = '';
        }
    }

    function syncUI() {
        const f = State.filters;
        document.getElementById('filter-people').checked = f.includePeople;
        document.getElementById('filter-events').checked = f.includeEvents;

        syncToggleGroup('significance-toggle', f.significance);

        document.getElementById('filter-period').value = f.period;
        document.getElementById('filter-confidence').value = f.dateConfidence;
        document.getElementById('filter-tribe').value = f.tribe;
        document.getElementById('filter-book').value = f.bookId;
        document.getElementById('filter-location').value = f.locationId;

        syncCheckboxGroup('role-checkboxes', f.role);
        syncCheckboxGroup('category-checkboxes', f.category);

        document.getElementById('range-start').value = f.startYear ?? -4100;
        document.getElementById('range-end').value = f.endYear ?? 2030;
        document.getElementById('range-start-label').textContent = formatYear(f.startYear ?? -4100);
        document.getElementById('range-end-label').textContent = formatYear(f.endYear ?? 2030);

        updateContextualVisibility();
        updateChips();
    }

    function syncToggleGroup(groupId, value) {
        document.getElementById(groupId).querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === value);
        });
    }

    function syncCheckboxGroup(containerId, value) {
        document.getElementById(containerId).querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = value ? cb.value === value : false;
        });
    }

    function renderLegend(options) {
        const container = document.getElementById('legend-items');
        container.innerHTML = '';

        const legendData = [
            { label: 'Person (lifespan)', color: 'var(--person-color)', shape: 'bar' },
            { label: 'Event (duration)', color: 'var(--event-color)', shape: 'bar' },
            { label: 'Point event', color: 'var(--event-color)', shape: 'diamond' },
            { label: 'Approximate', color: 'var(--text-muted)', shape: 'dashed' },
        ];

        for (const item of legendData) {
            const div = document.createElement('div');
            div.className = 'legend-item';
            const swatch = document.createElement('span');
            swatch.className = 'legend-swatch';
            if (item.shape === 'bar') {
                swatch.style.background = item.color;
            } else if (item.shape === 'diamond') {
                swatch.style.background = item.color;
                swatch.style.transform = 'rotate(45deg) scale(0.7)';
            } else if (item.shape === 'dashed') {
                swatch.style.border = '2px dashed ' + item.color;
                swatch.style.background = 'transparent';
            }
            const label = document.createElement('span');
            label.textContent = item.label;
            div.appendChild(swatch);
            div.appendChild(label);
            container.appendChild(div);
        }

        for (const period of options.timePeriods) {
            if (!period.color) continue;
            const div = document.createElement('div');
            div.className = 'legend-item';
            const swatch = document.createElement('span');
            swatch.className = 'legend-swatch';
            swatch.style.background = period.color;
            swatch.style.opacity = '0.4';
            const label = document.createElement('span');
            label.textContent = period.name;
            div.appendChild(swatch);
            div.appendChild(label);
            container.appendChild(div);
        }
    }

    function formatYear(y) { return Utils.formatYear(y); }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function toggleDrawer() {
        const panel = document.getElementById('filter-panel');
        const backdrop = document.getElementById('mobile-backdrop');
        const isOpen = panel.classList.contains('drawer-open');
        if (isOpen) {
            closeDrawer();
        } else {
            // Drawer and detail sheet are mutually exclusive on mobile —
            // stacked together the sheet buried the drawer's lower half
            if (isMobile() && typeof DetailPanel !== 'undefined') DetailPanel.close();
            panel.classList.add('drawer-open');
            backdrop.classList.remove('hidden');
            requestAnimationFrame(() => backdrop.classList.add('visible'));
            if (window._surfaces) window._surfaces.opened('drawer');
            if (window._vibrate) window._vibrate(8);
        }
    }

    function closeDrawer() {
        const panel = document.getElementById('filter-panel');
        if (!panel.classList.contains('drawer-open')) return;
        // Surface-history bookkeeping; closing proceeds synchronously
        if (window._surfaces) window._surfaces.requestClose('drawer');
        const backdrop = document.getElementById('mobile-backdrop');
        panel.classList.remove('drawer-open');
        backdrop.classList.remove('visible');
        setTimeout(() => backdrop.classList.add('hidden'), 250);
    }

    /**
     * Inject a sticky footer with Reset / Apply (N) buttons. The drawer is
     * always live (filters apply as you change them) so the Apply button
     * simply closes the drawer; Reset clears all filters.
     */
    function injectMobileFooter() {
        const panel = document.getElementById('filter-panel');
        if (!panel || panel.querySelector('.filter-footer')) return;
        const footer = document.createElement('div');
        footer.className = 'filter-footer mobile-only';
        footer.innerHTML = `
            <button type="button" class="btn-reset">Reset</button>
            <button type="button" class="btn-apply">Show <span class="footer-count">all</span></button>
        `;
        panel.appendChild(footer);
        footer.querySelector('.btn-reset').addEventListener('click', () => {
            State.clearFilters();
            syncUI();
            if (window._vibrate) window._vibrate(10);
        });
        footer.querySelector('.btn-apply').addEventListener('click', () => {
            closeDrawer();
            if (window._vibrate) window._vibrate(8);
        });
    }

    function updateFooterCount() {
        const span = document.querySelector('.filter-footer .footer-count');
        if (!span) return;
        const total = State.items.length;
        span.textContent = total + ' item' + (total !== 1 ? 's' : '');
    }

    /** Make every filter section a collapsible accordion on mobile. */
    function applyMobileAccordion() {
        const panel = document.getElementById('filter-panel');
        if (!panel) return;
        const sections = panel.querySelectorAll('.filter-section');
        sections.forEach((sec, i) => {
            if (sec.classList.contains('collapsible')) return;
            sec.classList.add('collapsible');
            // Wrap all children except <h3> in a .filter-body div
            const h3 = sec.querySelector('h3');
            if (!h3) return;
            const body = document.createElement('div');
            body.className = 'filter-body';
            const moving = [];
            for (const child of sec.childNodes) {
                if (child !== h3) moving.push(child);
            }
            moving.forEach(n => body.appendChild(n));
            sec.appendChild(body);
            // First two sections (Show + Significance) start expanded
            if (i < 2) sec.classList.add('open');
            h3.addEventListener('click', () => {
                sec.classList.toggle('open');
                if (window._vibrate) window._vibrate(6);
            });
        });
    }

    function resetMobileAccordion() {
        const panel = document.getElementById('filter-panel');
        if (!panel) return;
        panel.querySelectorAll('.filter-section.collapsible').forEach(sec => {
            const h3 = sec.querySelector('h3');
            const body = sec.querySelector('.filter-body');
            if (body) {
                while (body.firstChild) sec.appendChild(body.firstChild);
                body.remove();
            }
            sec.classList.remove('collapsible', 'open');
            if (h3) {
                const newH3 = h3.cloneNode(true);
                h3.parentNode.replaceChild(newH3, h3);
            }
        });
    }

    function applyChipGroups() {
        document.querySelectorAll('#role-checkboxes, #category-checkboxes').forEach(g => {
            g.classList.add('chip-group');
        });
    }

    /** Edge-swipe-left to close the drawer. */
    function initEdgeSwipeClose() {
        const panel = document.getElementById('filter-panel');
        if (!panel) return;
        let startX = 0, startY = 0, dragging = false;
        panel.addEventListener('touchstart', (e) => {
            if (!panel.classList.contains('drawer-open')) return;
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            dragging = true;
        }, { passive: true });
        panel.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = Math.abs(t.clientY - startY);
            if (dy > Math.abs(dx)) { dragging = false; return; }
            if (dx < 0) {
                panel.style.transform = `translateX(${dx}px)`;
            }
        }, { passive: true });
        panel.addEventListener('touchend', (e) => {
            if (!dragging) return;
            dragging = false;
            const dx = e.changedTouches[0].clientX - startX;
            panel.style.transform = '';
            if (dx < -80) closeDrawer();
        });
    }

    return { init, populate, syncUI, closeDrawer };
})();

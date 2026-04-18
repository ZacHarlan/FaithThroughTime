// app.js — Application entry point and orchestration
(async function main() {
    // Initialize modules
    Timeline.init();
    Filters.init();
    DetailPanel.init();
    Search.init();
    Lineage.init();

    // Tab switching
    let lineageLoaded = false;
    let mapLoaded = false;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Hide all tab content
            document.getElementById('app').style.display = 'none';
            document.getElementById('lineage-tab').classList.add('hidden');
            document.getElementById('map-tab').classList.add('hidden');
            document.querySelector('.header-center').style.display = 'none';
            document.querySelector('.header-right').style.display = 'none';

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
            }
        });
    });

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
    } catch (err) {
        console.error('Failed to initialize:', err);
        document.getElementById('timeline-loading').textContent = 'Failed to load data. Please refresh.';
    }

    async function loadTimeline() {
        const params = State.getFilterParams();
        const items = await Api.getTimeline(params);
        State.setItems(items);
    }
})();

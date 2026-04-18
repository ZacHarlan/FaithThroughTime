// state.js — Centralized application state
const State = {
    items: [],
    periods: [],
    books: [],
    filterOptions: null,
    selectedItem: null,

    // Current filter values
    filters: {
        includePeople: true,
        includeEvents: true,
        significance: '',
        role: '',
        category: '',
        period: '',
        tribe: '',
        dateConfidence: '',
        bookId: '',
        locationId: '',
        startYear: null,
        endYear: null
    },

    // Subscribers
    _listeners: [],

    subscribe(fn) {
        this._listeners.push(fn);
    },

    notify(changeType) {
        for (const fn of this._listeners) {
            fn(changeType);
        }
    },

    setItems(items) {
        this.items = items;
        this.notify('items');
    },

    setPeriods(periods) {
        this.periods = periods;
        this.notify('periods');
    },

    setFilterOptions(options) {
        this.filterOptions = options;
        this.notify('filterOptions');
    },

    setBooks(books) {
        this.books = books;
    },

    setSelectedItem(item) {
        this.selectedItem = item;
        this.notify('selection');
    },

    updateFilter(key, value) {
        this.filters[key] = value;
        this.notify('filters');
    },

    getFilterParams() {
        return {
            role: this.filters.role || undefined,
            category: this.filters.category || undefined,
            significance: this.filters.significance || undefined,
            period: this.filters.period || undefined,
            tribe: this.filters.tribe || undefined,
            dateConfidence: this.filters.dateConfidence || undefined,
            bookId: this.filters.bookId || undefined,
            locationId: this.filters.locationId || undefined,
            startYear: this.filters.startYear || undefined,
            endYear: this.filters.endYear || undefined,
            includePeople: this.filters.includePeople,
            includeEvents: this.filters.includeEvents
        };
    },

    clearFilters() {
        this.filters = {
            includePeople: true,
            includeEvents: true,
            significance: '',
            role: '',
            category: '',
            period: '',
            tribe: '',
            dateConfidence: '',
            bookId: '',
            locationId: '',
            startYear: null,
            endYear: null
        };
        this.notify('filters');
    }
};

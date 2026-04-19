# Faith Through Time — Architecture & Design Document

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │ Filter   │  │   D3.js SVG      │  │  Detail Panel     │  │
│  │ Panel    │  │   Timeline       │  │  (drill-down)     │  │
│  │          │  │   (zoom/pan)     │  │                   │  │
│  └────┬─────┘  └────────┬─────────┘  └────────┬──────────┘  │
│       │                 │                     │              │
│       └─────────────────┼─────────────────────┘              │
│                         │                                    │
│              ┌──────────┴──────────┐                         │
│              │   JS State + API    │                         │
│              │   (vanilla JS)      │                         │
│              └──────────┬──────────┘                         │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/JSON
┌─────────────────────────┼───────────────────────────────────┐
│                   .NET 9 Backend                            │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │           Minimal API Endpoints                      │    │
│  │  /api/timeline  /api/people/{id}  /api/search       │    │
│  │  /api/events/{id}  /api/timeline/periods            │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │         BibleTimelineDb (Dapper + SQLite)            │    │
│  │  - Timeline queries with filtering                   │    │
│  │  - Detail queries with joins                         │    │
│  │  - Full-text search (FTS5)                           │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │              SQLite Database                         │    │
│  │  faith-through-time.db (single file, portable)          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Vanilla JS over React — Justified

**Chosen: Vanilla JS + D3.js**

The UI has three distinct interaction zones (filter panel, timeline, detail panel) with a
single shared state object. The complexity doesn't warrant React because:

- **D3.js owns the DOM** for the timeline — React's virtual DOM adds friction here, not value
- **No component reuse** — the filter panel, search bar, and detail panel are each unique
- **State is simple** — a single `State` object with pub/sub handles all reactivity
- **Zero build step** — no webpack, no JSX compilation, no node_modules
- **Smaller payload** — ~10KB of app JS vs 40KB+ for React alone

React would be justified if: (a) the app grows to 10+ interactive views, (b) complex form
editing for data entry is added, or (c) a team of React developers maintains it.

### 2. SVG over Canvas — Justified

**Chosen: SVG (via D3.js)**

| Factor | SVG | Canvas | Winner |
|--------|-----|--------|--------|
| Dataset size (~200 visible items) | Excellent | Overkill | SVG |
| Click/hover events | Free (DOM) | Manual hit testing | SVG |
| Accessibility | Semantic elements | Opaque bitmap | SVG |
| CSS styling | Full support | None | SVG |
| Text rendering | Native, crisp | Manual, blurry at zoom | SVG |
| Performance at 10K+ elements | Degrades | Excellent | Canvas |

At biblical dataset scale (~500 total entities, ~200 visible at any zoom level), SVG
performs well. Canvas would only be needed if displaying 10,000+ simultaneous elements
(e.g., adding every verse as a data point).

**Hybrid approach** (Canvas for background + SVG for interactive elements) adds complexity
without measurable benefit at this scale.

### 3. Representing Uncertain/Disputed Dates

Biblical chronology is one of the most complex aspects of this application. Our schema
handles uncertainty at three levels:

1. **Approximate flags** (`birth_approx`, `start_approx`) — renders dashed borders
   and tilde (~) prefixes in date display
2. **Confidence levels** — four tiers with visual opacity:
   - `certain` (100% opacity) — corroborated by external records (e.g., Fall of Jerusalem 586 BC)
   - `probable` (85%) — strong internal evidence (e.g., David's reign ~1010-970 BC)
   - `possible` (65%) — scholarly consensus with debate (e.g., Judges chronology)
   - `traditional` (55%) — based on genealogical calculations (e.g., Creation, early patriarchs)
3. **Date notes** — free-text field explaining specific chronological debates
   (e.g., early vs. late date for the Exodus)

### 4. Performance Considerations

| Concern | Current Scale | Mitigation | At Scale |
|---------|---------------|------------|----------|
| DB queries | ~500 entities | Indexed columns, FTS5 | Add pagination if >5000 |
| SVG rendering | ~200 visible | D3 data join (enter/update/exit) | Switch to Canvas at 10K+ |
| JSON payload | ~50KB | Single fetch, client-side filter | Add server-side windowing |
| Search | FTS5 prefix match | Near-instant | Already optimized |

### 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Date accuracy disputes | Users lose trust | Show confidence badges, cite sources, include date_notes |
| UX overload at full zoom-out | Visual clutter | Significance-based filtering, semantic zoom (hide minor items) |
| SVG rendering with 1000+ items | Performance drop | D3 enter/update/exit pattern, viewport culling |
| Schema changes break seed data | Data integrity | Embedded resources, FTS triggers keep search in sync |
| Mobile viewport too small | Unusable UX | Responsive CSS, hide filter panel on mobile |

## Project Structure

```
Bible-Timeline/
├── BibleTimeline.sln
├── ARCHITECTURE.md                          ← This file
├── src/
│   └── BibleTimeline.Web/
│       ├── BibleTimeline.Web.csproj
│       ├── Program.cs                       ← App entry, DI, middleware
│       ├── Data/
│       │   ├── BibleTimelineDb.cs           ← Dapper data access layer
│       │   ├── DatabaseInitializer.cs       ← Schema + seed on startup
│       │   ├── Schema.sql                   ← DDL (embedded resource)
│       │   └── SeedData.sql                 ← 47 people, 52 events, 66 books
│       ├── Models/
│       │   ├── Entities.cs                  ← Person, Event, TimePeriod, etc.
│       │   └── Dtos.cs                      ← TimelineItemDto, PersonDetailDto, etc.
│       ├── Endpoints/
│       │   └── AllEndpoints.cs              ← Minimal API route definitions
│       └── wwwroot/
│           ├── index.html                   ← Single-page entry
│           ├── css/styles.css               ← Dark theme, responsive layout
│           └── js/
│               ├── api.js                   ← Fetch wrapper
│               ├── state.js                 ← Centralized state + pub/sub
│               ├── timeline.js              ← D3.js SVG renderer
│               ├── filters.js               ← Filter panel binding
│               ├── detail-panel.js          ← Drill-down detail view
│               ├── search.js                ← FTS search with debounce
│               └── app.js                   ← Orchestration entry point
├── tests/
│   ├── BibleTimeline.Tests/                 ← xUnit: unit + integration
│   │   ├── UnitTest1.cs                     ← BibleTimelineDb unit tests
│   │   └── IntegrationTests.cs              ← WebApplicationFactory API tests
│   └── BibleTimeline.E2E/                   ← Playwright NUnit E2E tests
│       └── UnitTest1.cs                     ← Browser interaction tests
```

## SQLite Schema (Entity Relationship Summary)

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  people  │────▶│ person_events│◀────│  events  │
│          │     │              │     │          │
│ id       │     │ person_id    │     │ id       │
│ name     │     │ event_id     │     │ name     │
│ birth_yr │     │ role_in_event│     │ start_yr │
│ death_yr │     └──────────────┘     │ end_yr   │
│ role     │                          │ category │
│ signif.  │     ┌──────────────┐     │ signif.  │
│ tribe    ├────▶│person_relati-│     └────┬─────┘
│ approx   │     │  onships     │          │
│ confidence│    │ type         │     ┌────┴──────┐
└─────┬────┘     └──────────────┘     │event_     │
      │                               │locations  │
      │          ┌──────────────┐     └────┬──────┘
      ├─────────▶│person_       │          │
      │          │ scripture    │     ┌────┴──────┐
      │          └──────┬───────┘     │ locations │
      │                 │             │           │
      │          ┌──────┴───────┐     │ name      │
      │          │ scripture_   │     │ lat/lon   │
      │          │ references   │     └───────────┘
      │          │              │
      │          │ reference_   │     ┌───────────┐
      │          │ text         │◀────│ biblical_ │
      │          └──────────────┘     │ books     │
      │                               │ (66 books)│
      │          ┌──────────────┐     └───────────┘
      └─────────▶│ time_periods │
    (via dates)  │ (11 eras)   │
                 └──────────────┘

    FTS5 virtual tables: people_fts, events_fts
    (auto-synced via triggers)
```

## API Endpoints

| Method | Endpoint | Purpose | Key Parameters |
|--------|----------|---------|----------------|
| GET | `/api/timeline` | All timeline items | `startYear`, `endYear`, `role`, `category`, `significance`, `period`, `tribe`, `includePeople`, `includeEvents` |
| GET | `/api/timeline/periods` | Time period bands | — |
| GET | `/api/timeline/books` | Biblical books | — |
| GET | `/api/timeline/filters` | Available filter options | — |
| GET | `/api/people/{id}` | Person detail + relationships | — |
| GET | `/api/events/{id}` | Event detail + people + locations | — |
| GET | `/api/search?q=` | Full-text search | `q` (min 2 chars), `type` (person/event/book) |

## Testing Strategy

### Unit Tests (xUnit) — `BibleTimeline.Tests/UnitTest1.cs`
- **BibleTimelineDb** tests against in-memory SQLite
- Tests all filter combinations, detail queries, search, FTS prefix matching
- 16 tests covering data access layer

### Integration Tests (xUnit + WebApplicationFactory) — `BibleTimeline.Tests/IntegrationTests.cs`
- Full HTTP pipeline tests against real API endpoints
- Tests filter behavior, relationship loading, 404 handling, search
- 23 tests covering all API endpoints

### E2E Tests (Playwright + NUnit) — `BibleTimeline.E2E/UnitTest1.cs`
- Browser-based interaction tests
- Tests: page load, search, detail panel, filters, zoom, close behavior
- 9 scenarios covering core user workflows

## Running the Application

```bash
# Build and run
cd src/BibleTimeline.Web
dotnet run

# Run unit/integration tests
dotnet test tests/BibleTimeline.Tests

# Run E2E tests (app must be running on port 5000)
# First install Playwright browsers:
pwsh tests/BibleTimeline.E2E/bin/Debug/net9.0/playwright.ps1 install
dotnet test tests/BibleTimeline.E2E
```

## Future Extensibility

| Feature | Effort | Schema Change | Notes |
|---------|--------|---------------|-------|
| World history events | Low | Add `source` column to events | Filter by source='biblical' vs 'secular' |
| Interactive maps | Medium | Locations table already has lat/lon | Add Leaflet.js map panel |
| Scripture text display | Medium | Add bible_text table or API | Link to external Bible API |
| User annotations | Medium | Add users + annotations tables | Auth required |
| AI-assisted insights | High | None initially | LLM for cross-reference discovery |
| Comparison mode | Medium | Frontend only | Side-by-side timeline view |
| Data import/export | Low | None | CSV/JSON export of current view |
| Print-friendly timeline | Low | CSS @media print | Generate static SVG |

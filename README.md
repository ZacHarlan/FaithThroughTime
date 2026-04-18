# Bible Timeline

An interactive, zoomable timeline of biblical history built with .NET 9, SQLite, and D3.js.

## Features

- **Interactive SVG timeline** — zoom from 0.1x to 200x, pan freely across 6,000+ years of biblical history
- **322 people, 94 events, 66 books** — pre-seeded from Genesis through Revelation
- **Family tree explorer** — interactive D3-rendered lineage trees with click-and-drag panning, autocomplete search, spouse/sibling display
- **Full-text search** — FTS5-powered instant search with result snippets
- **Rich filtering** — filter by significance, time period, role, event category, and tribe
- **Detail panel** — drill into any person or event to see relationships, locations, scripture references, and chronology notes
- **Ussher chronology** — dates follow James Ussher's *Annals of the World* (1650), with Biblical reign lengths for all Divided Kingdom kings
- **Date confidence indicators** — visual distinction between exact, approximate, estimated, and traditional dates
- **Period bands** — colored background bands for 11 biblical eras (Creation → Apostolic Age)
- **Static deployment** — deployable as a static site via GitHub Pages (`docs/`) or opened directly via `file://`
- **Dark theme** — full dark UI with accessible contrast

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS, D3.js v7, CSS custom properties |
| Backend | .NET 9 Minimal API, C# |
| Database | SQLite + Dapper |
| Search | FTS5 virtual tables with auto-sync triggers |
| Tests | xUnit (106 tests), Playwright (9 E2E scenarios) |

## Quick Start

**Prerequisites:** [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)

```bash
bash init.sh
```

This builds, runs all tests, starts the app, and verifies it's healthy. Open **http://localhost:5180**.

Or manually:

```bash
dotnet build
dotnet test
cd src/BibleTimeline.Web && dotnet run
```

The SQLite database is created and seeded automatically on first run.

## Project Structure

```
Browser (Vanilla JS + D3.js)
  ├── api.js          → fetch wrapper (only file that calls fetch)
  ├── state.js        → centralized pub/sub state
  ├── timeline.js     → D3.js SVG renderer (zoom/pan)
  ├── filters.js      → filter panel bindings
  ├── search.js       → FTS search with debounce
  ├── detail-panel.js → drill-down detail view
  ├── lineage.js      → family tree visualization (drag-to-pan)
  └── app.js          → orchestration entry
        │
        │  HTTP/JSON
        ▼
.NET 9 Minimal API (C#)
  ├── Endpoints/AllEndpoints.cs  → route definitions
  ├── Data/BibleTimelineDb.cs    → Dapper queries
  └── Data/DatabaseInitializer.cs → schema + seed
        │
        ▼
SQLite (bible-timeline.db)
  ├── 10 tables + 2 FTS5 virtual tables
  └── Schema.sql + SeedData.sql (embedded resources)
```

## Static Deployment

The app can be exported as a fully static site for hosting without a server:

```bash
python3 build-static.py     # Build docs/ with inline data
python3 test-static.py      # Validate exported data
```

- **`docs/`** — Static site with all data inlined in `index.html`. Works with both `file://` (just open in browser) and HTTP hosting (GitHub Pages).

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/timeline` | Timeline items (supports filtering via query params) |
| GET | `/api/timeline/periods` | Time period bands |
| GET | `/api/timeline/books` | Biblical books list |
| GET | `/api/timeline/filters` | Available filter values |
| GET | `/api/people/{id}` | Person detail with relationships |
| GET | `/api/events/{id}` | Event detail with people and locations |
| GET | `/api/search?q=` | Full-text search (min 2 chars) |
| GET | `/api/lineage/{id}` | Ancestry/descendant tree for a person |
| GET | `/api/lineage/people` | All people (for autocomplete search) |

## Testing

```bash
dotnet test                       # All 106 tests (unit + integration + architecture)
dotnet test --filter UnitTest     # 38 unit tests (in-memory SQLite)
dotnet test --filter Integration  # 56 integration tests (WebApplicationFactory)
dotnet test --filter Architecture # 12 architecture enforcement tests
```

Architecture tests enforce layer boundaries, fetch isolation to `api.js`, absence of debug artifacts, and SQL resource configuration.

## Database

The database auto-creates from embedded SQL resources on startup. To re-seed, delete `bible-timeline.db` from the build output directory and restart the app.

**Key tables:** `people`, `events`, `time_periods`, `biblical_books`, `locations`, `person_events`, `person_relationships`, `scripture_references`, `people_fts`, `events_fts`

## Contributing

See [AGENTS.md](AGENTS.md) for the full developer guide, including layer rules, environment config, and common tasks.

## License

MIT

# AGENTS.md — Bible Timeline Agent Entry Point

> **First action in any session:** `bash init.sh`
> **Then orient yourself:** `bash agent-status.sh`

## Quick Start

```bash
bash init.sh              # Build, test, start app on http://localhost:5180
bash agent-status.sh      # Check running state, git status, build health
bash quality-sweep.sh     # Find drift: architecture violations, dead code, debug artifacts
dotnet test               # Run all tests (39 unit + integration)
python3 build-static.py   # Build static site → docs/ for GitHub Pages
python3 test-static.py    # Validate exported static data
```

## Architecture Overview

```
Browser (Vanilla JS + D3.js)
  ├── api.js          → fetch wrapper (ONLY file that calls fetch)
  ├── state.js        → centralized pub/sub state
  ├── timeline.js     → D3.js SVG renderer (zoom/pan)
  ├── filters.js      → filter panel bindings
  ├── search.js       → FTS search with debounce
  ├── detail-panel.js → drill-down detail view
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

## Key Files

| File | Purpose | When to Edit |
|------|---------|-------------|
| [src/BibleTimeline.Web/Program.cs](src/BibleTimeline.Web/Program.cs) | App entry, DI, middleware | Adding services, middleware, or config |
| [src/BibleTimeline.Web/Endpoints/AllEndpoints.cs](src/BibleTimeline.Web/Endpoints/AllEndpoints.cs) | All API route definitions | Adding/changing API endpoints |
| [src/BibleTimeline.Web/Data/BibleTimelineDb.cs](src/BibleTimeline.Web/Data/BibleTimelineDb.cs) | All SQL queries via Dapper | Changing queries, adding new data access |
| [src/BibleTimeline.Web/Data/DatabaseInitializer.cs](src/BibleTimeline.Web/Data/DatabaseInitializer.cs) | Schema + seed on startup | Changing DB init behavior |
| [src/BibleTimeline.Web/Data/Schema.sql](src/BibleTimeline.Web/Data/Schema.sql) | DDL: tables, indexes, FTS, triggers | Changing DB schema |
| [src/BibleTimeline.Web/Data/SeedData.sql](src/BibleTimeline.Web/Data/SeedData.sql) | 47 people, 52 events, 66 books | Adding/changing seed data |
| [src/BibleTimeline.Web/Models/Entities.cs](src/BibleTimeline.Web/Models/Entities.cs) | C# record types matching DB | When schema changes |
| [src/BibleTimeline.Web/Models/Dtos.cs](src/BibleTimeline.Web/Models/Dtos.cs) | API response shapes | When API contract changes |
| [src/BibleTimeline.Web/wwwroot/js/api.js](src/BibleTimeline.Web/wwwroot/js/api.js) | **Only** file that uses `fetch()` | Adding/changing API calls |
| [src/BibleTimeline.Web/wwwroot/js/timeline.js](src/BibleTimeline.Web/wwwroot/js/timeline.js) | D3.js SVG timeline renderer | Changing timeline visuals |
| [src/BibleTimeline.Web/wwwroot/js/state.js](src/BibleTimeline.Web/wwwroot/js/state.js) | Centralized state + pub/sub | Adding new state properties |
| [src/BibleTimeline.Web/wwwroot/index.html](src/BibleTimeline.Web/wwwroot/index.html) | Single-page HTML shell | Changing layout structure |
| [src/BibleTimeline.Web/wwwroot/css/styles.css](src/BibleTimeline.Web/wwwroot/css/styles.css) | All CSS (dark theme) | Changing styles |
| [tests/BibleTimeline.Tests/IntegrationTests.cs](tests/BibleTimeline.Tests/IntegrationTests.cs) | API integration tests (23 tests) | When API changes |
| [tests/BibleTimeline.Tests/UnitTest1.cs](tests/BibleTimeline.Tests/UnitTest1.cs) | DB unit tests (16 tests) | When data access changes |

## Layer Rules (Enforced by Architecture Tests)

| Layer | Can Import | **Cannot** Import |
|-------|-----------|-------------------|
| `Endpoints/` | `Models/`, `Data/` | Nothing — it's the top |
| `Data/` | `Models/`, `Microsoft.Data.Sqlite`, `Dapper` | `Endpoints/`, `Services/` |
| `Models/` | Nothing (POCOs only) | `Data/`, `Endpoints/`, `Services/` |
| `wwwroot/js/api.js` | — | — (only file that uses `fetch()`) |
| `wwwroot/js/*.js` (non-api) | `Api`, `State`, `Timeline`, other modules | **Not** `fetch()` directly |

## API Endpoints

| Method | Route | Purpose | Key Params |
|--------|-------|---------|------------|
| GET | `/api/timeline` | All timeline items | `startYear`, `endYear`, `role`, `category`, `significance`, `period`, `tribe`, `includePeople`, `includeEvents` |
| GET | `/api/timeline/periods` | Time period bands | — |
| GET | `/api/timeline/books` | Biblical books list | — |
| GET | `/api/timeline/filters` | Available filter values | — |
| GET | `/api/people/{id}` | Person detail + relationships | — |
| GET | `/api/events/{id}` | Event detail + people + locations | — |
| GET | `/api/search?q=` | Full-text search | `q` (min 2 chars), `type` |

## Environment & Config

| Item | Value | Location |
|------|-------|----------|
| App Port | `5180` (HTTP) | `src/BibleTimeline.Web/Properties/launchSettings.json` |
| Database | `bible-timeline.db` (auto-created) | `bin/Debug/net9.0/` at runtime |
| SQL Files | Embedded resources in assembly | `src/BibleTimeline.Web/Data/` |
| .NET Version | 9.0+ | `global.json` (if present) or SDK |
| Dapper Config | `MatchNamesWithUnderscores = true` | `BibleTimelineDb` constructor |

## Common Tasks

| Task | Command |
|------|---------|
| **Bootstrap everything** | `bash init.sh` |
| **Build** | `dotnet build` |
| **Run app** | `cd src/BibleTimeline.Web && dotnet run` |
| **Run all tests** | `dotnet test` |
| **Run unit tests only** | `dotnet test tests/BibleTimeline.Tests` |
| **Run E2E tests** | Start app first, then `dotnet test tests/BibleTimeline.E2E` |
| **Install Playwright browsers** | `pwsh tests/BibleTimeline.E2E/bin/Debug/net9.0/playwright.ps1 install` |
| **Check system status** | `bash agent-status.sh` |
| **Quality sweep** | `bash quality-sweep.sh` |
| **Re-seed database** | Delete `bible-timeline.db`, then restart app |
| **View feature backlog** | `cat feature_list.json \| python3 -m json.tool` |
| **Build static site** | `python3 build-static.py` (requires app to have run once) |
| **Validate static data** | `python3 test-static.py` |
| **Serve static locally** | `cd docs && python3 -m http.server 8080` |

## Database Schema (Key Tables)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `people` | 47 biblical figures | `name`, `birth_year`, `death_year`, `role`, `significance`, `date_confidence` |
| `events` | 52 biblical events | `name`, `start_year`, `end_year`, `category`, `significance`, `date_confidence` |
| `time_periods` | 11 eras (Creation→Apostolic) | `name`, `start_year`, `end_year`, `color` |
| `biblical_books` | 66 books | `name`, `testament`, `genre`, `period_covered_start/end` |
| `locations` | 15 places | `name`, `modern_name`, `latitude`, `longitude` |
| `person_events` | Junction: who participated in what | `person_id`, `event_id`, `role_in_event` |
| `person_relationships` | Family/mentor links | `person_id_1`, `person_id_2`, `relationship_type` |
| `scripture_references` | 17 key passages | `book_id`, `reference_text` |
| `people_fts` / `events_fts` | FTS5 search indexes | Auto-synced via triggers |

## Deep Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — Design decisions, trade-offs, schema ERD, future roadmap
- [feature_list.json](feature_list.json) — Feature registry with verification steps
- [claude-progress.txt](claude-progress.txt) — Session continuity log

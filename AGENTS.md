# AGENTS.md — Faith Through Time Agent Entry Point

> **First action in any session:** `bash init.sh`
> **Then orient yourself:** `bash agent-status.sh`

## Quick Start

```bash
bash init.sh              # Restore, build, test, start the app on http://localhost:5180
bash agent-status.sh      # Running state, database counts, build/test status, git, feature registry
bash quality-sweep.sh     # Drift: failing tests, debug output, HTML injection, stale docs
dotnet test tests/BibleTimeline.Tests   # Unit, integration, data-integrity and architecture tests
python3 build-static.py   # Build the static site into docs/ (for GitHub Pages)
python3 test-static.py    # Validate the static build
```

## Architecture Overview

```
Browser (vanilla JS, classic scripts, no build step)
  index.html  → shell, hash-routed views
  js/api.js       the ONLY file that calls fetch()
  js/store.js     Time (year maths, no year 0) + Store (dataset, indexes, family, overlap, search)
  js/ui.js        UI.h() DOM builder, icons, loaders
  js/app.js       Router + App (hash routes, view registry, theme, event bus)
  js/bible.js     local Bible text (bibles/<version>/<book>.json)
  js/share.js     share-card dialog (canvas image)
  js/search.js    command palette
  js/detail.js    person/event detail sheet (overlay)
  js/home.js, timeline.js, tour.js, meet.js, family.js, map.js, read.js, about.js   views
  css/base.css    design tokens; one stylesheet per view
  data/tours.json, data/discoveries.json   authored content
  vendor/         D3 v7 and Leaflet, vendored
        │
        │  ONE request: GET data/dataset.json  (or /api/dataset)
        ▼
.NET 9 Minimal API (C#)
  Program.cs                   DI, static files, endpoint mapping, --export-dataset mode
  Endpoints/                   route definitions (no SQL)
  Data/BibleTimelineDb.cs      Dapper queries
  Data/DatasetBuilder.cs       builds the whole-dataset JSON, assigns slugs
  Data/DatabaseInitializer.cs  applies Schema.sql, seeds from SeedData.sql when empty
        │
        ▼
SQLite (faith-through-time.db, in bin/Debug/net9.0/ at runtime)
  14 data tables + 2 FTS5 virtual tables; Schema.sql + SeedData.sql are embedded resources
```

After the dataset loads, the browser answers every question from memory. The older query endpoints
(`/api/timeline`, `/api/people/{id}`, …) still exist and are tested, but the current frontend does not use them.

## Key Files

| File | Purpose | When to Edit |
|------|---------|-------------|
| [src/BibleTimeline.Web/Program.cs](src/BibleTimeline.Web/Program.cs) | Entry, DI, middleware, `--export-dataset` mode | Adding services or startup modes |
| [src/BibleTimeline.Web/Endpoints/DatasetEndpoints.cs](src/BibleTimeline.Web/Endpoints/DatasetEndpoints.cs) | `/api/dataset` and `/data/dataset.json` | Changing how the dataset is served |
| [src/BibleTimeline.Web/Endpoints/AllEndpoints.cs](src/BibleTimeline.Web/Endpoints/AllEndpoints.cs) | Legacy route definitions (timeline, people, events, search, lineage, map) | Changing those routes |
| [src/BibleTimeline.Web/Data/DatasetBuilder.cs](src/BibleTimeline.Web/Data/DatasetBuilder.cs) | Dataset assembly and slug rules | Changing the dataset shape |
| [src/BibleTimeline.Web/Models/DatasetDtos.cs](src/BibleTimeline.Web/Models/DatasetDtos.cs) | Dataset JSON shapes | With DatasetBuilder |
| [src/BibleTimeline.Web/Data/BibleTimelineDb.cs](src/BibleTimeline.Web/Data/BibleTimelineDb.cs) | All SQL via Dapper | Changing queries |
| [src/BibleTimeline.Web/Data/Schema.sql](src/BibleTimeline.Web/Data/Schema.sql) | DDL: tables, indexes, FTS, triggers | Changing the schema |
| [src/BibleTimeline.Web/Data/SeedData.sql](src/BibleTimeline.Web/Data/SeedData.sql) | The data (see "Data rules") | Adding or correcting people, events, places, references |
| [src/BibleTimeline.Web/Models/Entities.cs](src/BibleTimeline.Web/Models/Entities.cs), [Dtos.cs](src/BibleTimeline.Web/Models/Dtos.cs) | Row and legacy API shapes | When schema or legacy API changes |
| [src/BibleTimeline.Web/wwwroot/index.html](src/BibleTimeline.Web/wwwroot/index.html) | Shell, script and stylesheet list | Adding a module or stylesheet (also add it to `sw.js` SHELL) |
| [src/BibleTimeline.Web/wwwroot/js/app.js](src/BibleTimeline.Web/wwwroot/js/app.js) | Route table, view registry, theme, events | New routes or views |
| [src/BibleTimeline.Web/wwwroot/js/store.js](src/BibleTimeline.Web/wwwroot/js/store.js) | Data model and every pure question about it | New derived data |
| [src/BibleTimeline.Web/wwwroot/js/api.js](src/BibleTimeline.Web/wwwroot/js/api.js) | **Only** file that uses `fetch()` | New network calls |
| [src/BibleTimeline.Web/wwwroot/css/base.css](src/BibleTimeline.Web/wwwroot/css/base.css) | Design tokens (colour, type, spacing, themes) | Changing the look globally |
| [src/BibleTimeline.Web/wwwroot/data/tours.json](src/BibleTimeline.Web/wwwroot/data/tours.json), [discoveries.json](src/BibleTimeline.Web/wwwroot/data/discoveries.json) | Authored tours and "did they meet?" discoveries | Editing content |
| [src/BibleTimeline.Web/wwwroot/sw.js](src/BibleTimeline.Web/wwwroot/sw.js) | Service worker, precache list | Bump `CACHE_NAME` when the shell file list changes |
| [tests/BibleTimeline.Tests/DataIntegrityTests.cs](tests/BibleTimeline.Tests/DataIntegrityTests.cs) | Rules the seed must satisfy | When a data rule changes |
| [tests/BibleTimeline.Tests/ArchitectureTests.cs](tests/BibleTimeline.Tests/ArchitectureTests.cs) | Layer and frontend rules | When a rule changes |
| [tests/BibleTimeline.Tests/DatasetTests.cs](tests/BibleTimeline.Tests/DatasetTests.cs) | Dataset endpoint tests | With the dataset |
| [tests/BibleTimeline.Tests/IntegrationTests.cs](tests/BibleTimeline.Tests/IntegrationTests.cs), [UnitTest1.cs](tests/BibleTimeline.Tests/UnitTest1.cs) | Legacy endpoint tests and data-access tests | With those layers |

## Layer Rules (Enforced by `ArchitectureTests`)

| Layer | Can Import | **Cannot** Import |
|-------|-----------|-------------------|
| `Endpoints/` | `Models/`, `Data/` | `Microsoft.Data.Sqlite`, `Dapper`; no raw SQL |
| `Data/` | `Models/`, `Microsoft.Data.Sqlite`, `Dapper` | `Endpoints/`, `Services/` |
| `Models/` | Nothing (POCOs only) | `Data/`, `Endpoints/`, `Services/` |
| `wwwroot/js/api.js` | — | — (only file that uses `fetch()`; only file with `/api/` URLs) |
| `wwwroot/js/*.js` (others) | Globals from earlier scripts | `fetch()`, `console.log/debug/info/warn`, `debugger`, `innerHTML`/`outerHTML` assignment, `insertAdjacentHTML`, `document.write` |

Also tested: every local `<script src>` and stylesheet in `index.html` exists, and `data/tours.json` and
`data/discoveries.json` parse. DOM is built with `UI.h(...)`; text is set as text.

## Routes

Browser (hash-based): `#/` home, `#/timeline`, `#/story/<tour>/<step>`, `#/meet/<a>/<b>`, `#/family/<slug>`,
`#/map/<journey>`, `#/read/<book>/<chapter>`, `#/about`, `#/person/<slug>`, `#/event/<slug>` (detail sheet over the
current view). The table lives in the header comment of `js/app.js`.

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/dataset` | **Whole dataset in one response** (periods, people, events, relationships, locations, books, journeys, meta) |
| GET | `/data/dataset.json` | Same body, at the path the static export uses; this is what `api.js` requests |
| GET | `/api/timeline` | Filtered timeline items (`startYear`, `endYear`, `role`, `category`, `significance`, `period`, `tribe`, `includePeople`, `includeEvents`) |
| GET | `/api/timeline/periods`, `/books`, `/filters` | Periods, books, filter values |
| GET | `/api/people/{id}`, `/api/events/{id}` | Detail with relationships, locations, scripture |
| GET | `/api/search?q=&type=` | FTS5 search (`q` min 2 chars) |
| GET | `/api/lineage/people`, `/api/lineage/{id}` | Ancestors, descendants, siblings (shared parent or `sibling` row), extended family |
| GET | `/api/map/events`, `/api/map/journey/{personId}`, `/api/map/people`, `/api/map/locations`, `/api/map/journeys`, `/api/map/journeys/{id}` | Map data |

## Environment & Config

| Item | Value | Location |
|------|-------|----------|
| App port | `5180` (HTTP) | `src/BibleTimeline.Web/Properties/launchSettings.json` |
| Database | `faith-through-time.db`, auto-created and seeded when empty | `bin/Debug/net9.0/` of whichever project runs it |
| SQL files | Embedded resources | `src/BibleTimeline.Web/Data/` |
| .NET | 9.0+ | SDK |
| Dapper | `MatchNamesWithUnderscores = true` | `BibleTimelineDb` constructor |
| Bible text | `wwwroot/bibles/<version>/<book>.json` as `{chapter: {verse: text}}`; manifest in `bibles/manifest.json` | KJV is public domain; the rest are local text |
| Test database | Deleted by a module initializer in `tests/BibleTimeline.Tests/AssemblyInfo.cs` before each run, so tests always see the current seed | `tests/BibleTimeline.Tests/bin/` |

## Common Tasks

| Task | Command |
|------|---------|
| Bootstrap everything | `bash init.sh` |
| Build | `dotnet build` |
| Run app | `cd src/BibleTimeline.Web && dotnet run` |
| Run all unit/integration tests | `dotnet test tests/BibleTimeline.Tests` |
| Only data rules | `dotnet test tests/BibleTimeline.Tests --filter DataIntegrityTests` |
| Only architecture rules | `dotnet test tests/BibleTimeline.Tests --filter ArchitectureTests` |
| Check system status | `bash agent-status.sh` |
| Quality sweep | `bash quality-sweep.sh` |
| Re-seed the running app's database | Stop the app, delete `faith-through-time.db*` in `src/BibleTimeline.Web/bin/Debug/net9.0/`, restart |
| Export the dataset | `dotnet run --project src/BibleTimeline.Web -- --export-dataset <path>` |
| Build static site | `python3 build-static.py`, then `python3 test-static.py` |
| View feature registry | `python3 -m json.tool feature_list.json` |

## Database

| Table | Rows | Purpose |
|-------|------|---------|
| `people` | 531 | `name` (unique), `alt_names`, `birth_year`, `death_year`, `role`, `significance`, `date_confidence`, `father_id`, `mother_id`, `date_notes` |
| `events` | 241 | `name`, `start_year`, `end_year`, `category`, `significance`, `date_confidence`, `sort_order` |
| `time_periods` | 18 | Contiguous eras, Creation to Modern Era |
| `biblical_books` | 66 | testament, genre, period covered |
| `locations` | 125 | latitude/longitude, region |
| `scripture_references` | 691 | `book_id`, chapter/verse start and end, `reference_text` |
| `person_events` | 499 | who took part in what |
| `person_relationships` | 212 | `spouse`, `sibling`, `mentor`, `successor`, `contemporary` (parent/child live in `father_id`/`mother_id`) |
| `journeys` / `journey_stops` / `journey_people` | 5 / 89 / — | Map journeys |
| `person_scripture`, `event_scripture`, `event_locations` | — | Junctions |
| `people_fts`, `events_fts` | — | FTS5 indexes kept in sync by triggers |

Counts are of the current seed; `agent-status.sh` prints live ones.

## Data rules

- **Chronology policy.** Old Testament dates follow James Ussher (*Annals of the World*, 1650). Foreign rulers and church
  history use standard historical dates. Where scholarship differs, the row's `date_notes` says so. There is one
  chronology; do not mix systems. There is no year 0 (1 BC is `-1`, AD 1 is `1`).
- **Explicit, stable ids.** Every seed row has an explicit id. Add rows with new ids (people currently go up to 661,
  events to 397); never renumber or reuse an id. The seed is one transaction with foreign keys deferred to commit, so a
  row may refer to a higher id.
- **Vocabularies.**
  - `people.role`: patriarch, matriarch, ancestor, prophet, king, queen, ruler, judge, priest, apostle, disciple,
    warrior, sage, church-leader, reformer, messiah, other.
  - `events.category`: creation, covenant, law, judgment, miracle, salvation, war, conquest, kingdom, worship, prophecy,
    exile, birth, death, teaching, mission, council, scripture, persecution, reform, other.
  - `significance`: major, moderate, minor. `date_confidence`: certain, probable, possible, traditional.
- **Names are unique** and disambiguated in the name itself ("James, son of Zebedee", "Joshua son of Nun").
- **Parentage.** `father_id`/`mother_id` hold parent links; do not duplicate them as `parent`/`child` rows. The brothers of
  Jesus (Mark 6:3) deliberately have no parents recorded because traditions differ; they are linked to Jesus by `sibling`
  rows, and the lineage endpoint finds siblings through those rows as well as through shared parents.
- **Parents are born at least 12 years before their children**, with three documented exceptions allowed by name in
  `DataIntegrityTests` (Hezekiah/Ahaz, Boaz/Salmon, Boaz/Rahab).
- **Scripture references** must resolve in the local KJV (`wwwroot/bibles/kjv`).

**To add a person:** pick the next free id; add a row to the people INSERT for the right era in `SeedData.sql` with a
unique name, a role from the vocabulary, years (`NULL` if unknown), `date_confidence`, and `date_notes` explaining the
date; add `person_events`, `person_scripture`, and `person_relationships` rows as needed. **To add an event:** same
pattern in the events INSERT with a category from the vocabulary and a `sort_order`; link people, scripture and
locations. Then delete the local database files, run `dotnet test tests/BibleTimeline.Tests`, and read any
`DataIntegrityTests` failure, which names the offending rows. Update the counts above.

## Deep Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — design, decisions, data audit, static export
- [README.md](README.md) — what the product is, quick start
- [feature_list.json](feature_list.json) — feature registry with verification steps
- [claude-progress.txt](claude-progress.txt) — session continuity log

## End-to-end tests

`tests/BibleTimeline.E2E` (NUnit + Playwright, 60 tests, about 25 seconds) drives the real app in headless Chromium:
every view, the detail sheet, search, share, the tour, the phone layout and an accessibility smoke check. The app must
already be running on http://localhost:5180.

```bash
dotnet test tests/BibleTimeline.E2E
# first time on a machine: install the browser the Playwright package expects
dotnet build tests/BibleTimeline.E2E && pwsh tests/BibleTimeline.E2E/bin/Debug/net9.0/playwright.ps1 install chromium
```

`FTT_BASE_URL` points the suite at another URL, `FTT_CHROMIUM_PATH` at an already-installed Chromium, and `FTT_HEADED=1`
shows the browser. A failing end-to-end test that reflects a real defect is a finding: fix the app, not the test.

## Known gaps

- The static person and event pages (`docs/person/<slug>/`, `docs/event/<slug>/`) have not been checked against a real
  link-preview crawler or the live GitHub Pages server.
- `bibles/esv`, `bibles/niv` and `bibles/nlt` are marked `publicDomain: false` in `bibles/manifest.json`. The owner has
  decided to ship them as they are (2026-11-14); do not raise licensing again. The reader and quoted passages default to the ESV;
  scripture references are still validated against the KJV.
- Do not hand-edit `docs/`; it is regenerated by `python3 build-static.py`.

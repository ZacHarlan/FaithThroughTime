# Faith Through Time — Architecture & Design

## Overview

A browser app over a SQLite database. The server's job is small: hold the data, apply the schema and seed, and hand the
whole dataset to the browser as one JSON document. Everything the user sees is computed in the browser from that document.

```
 SeedData.sql ──► SQLite ──► DatasetBuilder ──► GET /data/dataset.json ──► Store (in memory) ──► views
 (the data)      (runtime)   (slugs, joins)     (one request)              (indexes, family,     (home, timeline,
                                                                           overlap, search)      tours, meet, family,
                                                                                                 map, read, about)
```

## One dataset request, one in-browser store

`Data/DatasetBuilder.cs` joins the tables into a single JSON body: `meta` (version, chronology, generation time, counts),
`periods`, `people` (each with its events and scripture), `events` (each with its people, location ids and scripture),
`relationships`, `locations`, `books`, `journeys`. It is served at `/api/dataset` and at `/data/dataset.json`; the second
path is where the static export puts the same file, so `js/api.js` has one relative URL that works in both deployments.
Each row gets a URL-safe `slug`; where names collide, the more significant row keeps the bare slug and later rows get
`-2`, `-3`.

The dataset is a few hundred kilobytes. Loading it once costs less than the round trips of a query-per-interaction design,
and it makes filtering, search, family walks and "did they meet?" instantaneous and available offline.

`js/store.js` holds two pieces:

- `Time`: year arithmetic. There is no year 0, so BC years are mapped onto a continuous axis (`-1` → `0`) for distances and
  layout, and formatted back (`1996–1821 BC`, `5 BC – AD 33`).
- `Store`: loads the dataset once, indexes it by id and slug, derives children and relationships (with inverses), and
  answers every pure question: lookups, family lines, lifetime overlap between two people, contemporaries, search.

`js/api.js` is the only module that calls `fetch()`. The older query endpoints remain on the server and are tested, but
the frontend no longer uses them.

## Hash router and view registry

`js/app.js` contains `Router` and `App`. Routes are hash-based (`#/timeline?y=&span=`, `#/story/<tour>/<step>`,
`#/meet/<a>/<b>`, `#/family/<slug>`, `#/map/<journey>`, `#/read/<book>/<chapter>`, `#/about`), so they work on any static
host, on `file://`, and under a sub-path. The URL is the single source of truth for what is on screen.

Each view module registers itself with `App` (`init`, `show`, `hide`, `title`). `App` shows one base view at a time and may
open an overlay on top; person and event routes (`#/person/<slug>`, `#/event/<slug>`) are overlays handled by `detail.js`, so
the timeline or map stays underneath. Modules communicate through a small event bus (`route`, `theme`, `focus-item`,
`open-search`, `data-ready`). Scripts are classic (non-module) scripts loaded in order from `index.html`; each exposes at
most one global (`Api`, `Time`, `Store`, `UI`, `Router`, `App`, `BibleText`, `Share`, `Search`, `Timeline`, `Read`, …).

Views: home, timeline (canvas, zoom/pan, lanes packed per zoom level), tours (narrated flights over the timeline, from
`data/tours.json`), meet (lifetime overlap; curated pairs in `data/discoveries.json`), family (line of descent and
per-person trees), map (Leaflet, journeys), read (local Bible text with links back to history), about (dates and sources).
`search.js` is a command palette; `share.js` renders share cards on a canvas.

DOM is built with `UI.h(tag, props, ...children)`, which sets text as text. Assigning HTML strings (`innerHTML`,
`insertAdjacentHTML`, `document.write`) is forbidden in `wwwroot/js` and enforced by an architecture test.

## Design tokens

`css/base.css` defines the design tokens (colour, type, spacing, radii, motion) as CSS custom properties, with dark and
light themes selected by `data-theme` on the root element (stored under `ftt-theme`). Each view has its own stylesheet that
uses only tokens. There is no CSS preprocessor.

## Why no build step

The code is a few thousand lines of plain JavaScript and CSS served as files. No bundler, transpiler or package install means
a browser reload is the whole development loop, the deployed files are the source files, and the static export is a copy plus
the dataset. D3 and Leaflet are vendored under `wwwroot/vendor/` so nothing is fetched from a CDN at runtime (fonts and the
map tiles are the exceptions). The cost is manual script ordering in `index.html` and a hand-maintained precache list in
`sw.js`; the architecture tests check that every referenced file exists.

## Offline

`sw.js` precaches the shell, code, data and manifest (network first, so a deploy is picked up on the next load) and
caches Bible text, vendor libraries and fonts cache first. Bump `CACHE_NAME` when the shell file list changes.

## The data audit and chronology decisions

`Data/SeedData.sql` was regenerated after a full audit and now holds 375 people, 241 events, 95 locations, 536 scripture
references, 18 time periods, 66 books and 5 journeys.

- **One chronology: the Bible first, Ussher second.** Scripture's own figures govern; where Scripture does not fix a
  year, Ussher's *Annals of the World* does (foreign rulers, the Persian and intertestamental periods and New Testament
  events to AD 73 included); standard history only after the Annals end. The owner's exceptions: Esther's Ahasuerus is
  Xerxes I (Persian kings from Darius I on use standard dates) and Sennacherib died in 681 BC (modern Assyrian dates). Anchors the tests check: Creation 4004 BC, Flood 2349 BC, Abraham born 1996 BC, Exodus 1491 BC, kingdom divides
  975 BC, fall of Jerusalem 588 BC. Differences from mainstream scholarship are written in `date_notes`.
- **Explicit stable ids.** Rows carry explicit ids so links, slugs' tie-breaks, shared URLs and tests do not shift when
  rows are added. The seed is a single transaction with deferred foreign keys.
- **Disambiguated names.** People who shared a name were renamed ("Mary, mother of Jesus", "John the Apostle", "James, son
  of Zebedee", "James, brother of Jesus", "Joshua son of Nun"). An invented row ("Father of Lazarus") was removed.
- **Controlled vocabularies** for `people.role` and `events.category` (listed in `Schema.sql` and `AGENTS.md`).
- **Parentage.** Parent links are `father_id`/`mother_id` only; duplicate `parent`/`child` relationship rows were removed.
  The brothers of Jesus have no parents recorded because Catholic, Orthodox and Protestant traditions read Mark 6:3
  differently; they are `sibling` rows. `GetLineageAsync` includes `sibling` rows, so they appear as siblings.
- **Dates are marked uncertain** with `birth_approx`/`death_approx` (and start/end), `date_confidence` and `date_notes`.

`DataIntegrityTests` turns the audit into tests: vocabularies, no year 0, no death before birth or event end before start,
parents at least 12 years older (three documented exceptions), a father chain from Jesus to Adam without a cycle,
contiguous periods, unique names, scripture references that exist in the local KJV, and the Ussher anchors.

## Static export

`dotnet run --project src/BibleTimeline.Web -- --export-dataset <path>` initialises the database, writes the dataset JSON
and exits. `python3 build-static.py` builds the static site into `docs/` (served by GitHub Pages), and
`python3 test-static.py` validates it. The script is being rewritten for the new frontend; treat its documentation as
authoritative over this paragraph once it lands. Because the frontend only needs `data/dataset.json`, `data/tours.json`,
`data/discoveries.json` and files, no server is required.

## Backend layers

```
Endpoints/  →  Data/  →  Models/
```

`Endpoints/` maps routes and never contains SQL; `Data/` holds Dapper queries, the dataset builder and the schema/seed
initialiser; `Models/` holds POCOs. `ArchitectureTests` enforces the imports. SQLite is a single file; FTS5 tables for
people and events are kept in sync by triggers (used by `/api/search`).

## Project structure

```
FaithThroughTime/
├── src/BibleTimeline.Web/
│   ├── Program.cs
│   ├── Endpoints/        AllEndpoints.cs (legacy routes), DatasetEndpoints.cs
│   ├── Data/             BibleTimelineDb.cs, DatasetBuilder.cs, DatabaseInitializer.cs, Schema.sql, SeedData.sql
│   ├── Models/           Entities.cs, Dtos.cs, DatasetDtos.cs
│   └── wwwroot/          index.html, css/, js/, data/, vendor/, bibles/, icons/, manifest.json, sw.js
├── tests/
│   ├── BibleTimeline.Tests/   UnitTest1, IntegrationTests, DatasetTests, DataIntegrityTests, ArchitectureTests
│   └── BibleTimeline.E2E/     Playwright; targets the old UI, to be rewritten
├── init.sh, agent-status.sh, quality-sweep.sh
├── build-static.py, test-static.py, docs/
└── AGENTS.md, ARCHITECTURE.md, README.md, feature_list.json, claude-progress.txt
```

## Testing

`dotnet test tests/BibleTimeline.Tests` runs unit tests (in-memory SQLite), integration tests (`WebApplicationFactory`),
dataset tests, data-integrity tests (against the real seed in a temporary database) and architecture tests. Integration
tests use a database file next to the test assembly that the app seeds only when empty; a module initializer deletes it
before each run so a stale seed cannot mask failures. Test classes run sequentially because they share that file.

## Possible future work

Rewrite the Playwright suite for the new UI; add browser-level tests of the router and views; extend the data with more
post-biblical people and events under the same rules.

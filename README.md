# Faith Through Time

An interactive history of the Bible and the church: 375 people and 241 events from Creation to the present, on one zoomable
timeline, with tours, a family tree, a map, and a scripture reader. .NET 9 Minimal API, SQLite, and a vanilla-JavaScript
frontend with no build step.

## Features

- **Timeline.** Zoom and pan across about six thousand years; people as lifespans, events as marks, eras as bands; a filter
  panel dims everything outside the chosen groups.
- **Tours.** Narrated flights over the timeline ("The whole story", "The line of promise").
- **Did they meet?** Pick two people and see whether their lifetimes overlapped; a gallery of curated pairs.
- **Family.** The line of descent from Adam to Jesus (following Matthew or Luke where the data has both) and a family tree
  for any person.
- **Map.** 208 places and 22 journeys on a Leaflet map, from Genesis to Peter, each played stop by stop with its passage.
- **Read.** The 66 books from local text, with links from verses back to people and events.
- **Study.** Pick a verse and press Study for its cross-references, Old Testament quotations and fulfilled prophecy,
  parallel accounts and the Hebrew or Greek words behind it. Also: search the words of Scripture offline, parallel
  passages side by side (a Gospel harmony; Samuel–Kings with Chronicles), a 365-day reading plan in story order, a chart
  of the kings of Israel and Judah with their prophets, and Strong's word studies.
- **Reference.** A page for every book (author, date, outline, themes) and every place (events, journeys, the verses
  that name it); Nave's Topical Bible; Easton's Bible Dictionary; guides to the covenants, the feasts of Israel and the
  tabernacle.
- **Reader.** Each chapter shows where it stands in history (era, year, who reigned, which prophets spoke); names in
  the text link to people and places; text size, a second translation side by side, and read-aloud. Every page prints
  cleanly.
- **Search.** A command palette (press `/` or Cmd/Ctrl-K) for people, events, places, books, eras, scripture references
  ("john 3:16") and name pairs ("noah and abraham").
- **Detail sheet.** Dates with confidence and notes, relationships, places and scripture for any person or event.
- **Share cards.** Render a moment as an image.
- **About the dates.** Where dates come from and how sure anyone can be. Scripture's own figures come first; where the Bible
  does not fix a year, Ussher's chronology does; church history uses standard dates; every uncertain date says so.
- **Themes and offline.** Dark and light themes; a service worker keeps the app working offline.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS (classic scripts), CSS custom properties, D3 v7 and Leaflet (vendored) |
| Backend | .NET 9 Minimal API, C# |
| Database | SQLite, Dapper, FTS5 |
| Tests | xUnit (unit, integration, data integrity, architecture) and a Playwright end-to-end suite |

## Quick start

Prerequisite: [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0).

```bash
bash init.sh                              # restore, build, test, start on http://localhost:5180
```

Or by hand:

```bash
cd src/BibleTimeline.Web && dotnet run    # http://localhost:5180
dotnet test tests/BibleTimeline.Tests     # from the repo root
```

The app creates and seeds `faith-through-time.db` on first run. After editing `SeedData.sql`, delete the database file so it
is re-seeded.

## Static site

```bash
python3 build-static.py   # build into docs/ (GitHub Pages)
python3 test-static.py    # validate it
```

`dotnet run --project src/BibleTimeline.Web -- --export-dataset <path>` writes the dataset JSON without starting the server.

## More

See [AGENTS.md](AGENTS.md) for the file map, rules and data conventions, and [ARCHITECTURE.md](ARCHITECTURE.md) for the design.

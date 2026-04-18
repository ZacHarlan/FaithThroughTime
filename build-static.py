#!/usr/bin/env python3
"""Build static site for GitHub Pages deployment.

Reads the SQLite database and exports JSON data files,
then copies static assets to the docs/ directory.

Usage:
    python3 build-static.py [output_dir]

    output_dir defaults to 'docs'. Use 'pub' for a shareable zip.

Prerequisites:
    The app must have been run at least once to create/seed the database.
    Run `bash init.sh` first if needed.
"""

import json
import os
import shutil
import sqlite3
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT, "src", "BibleTimeline.Web", "bin", "Debug", "net9.0", "bible-timeline.db")
WWWROOT = os.path.join(ROOT, "src", "BibleTimeline.Web", "wwwroot")


def dict_factory(cursor, row):
    """Convert sqlite3 rows to dicts with camelCase keys."""
    cols = [col[0] for col in cursor.description]
    d = {}
    for col, val in zip(cols, row):
        # Convert snake_case to camelCase
        parts = col.split("_")
        key = parts[0] + "".join(p.capitalize() for p in parts[1:])
        d[key] = val
    return d


def connect():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Run `bash init.sh` first to create and seed the database.")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    return conn


def export_timeline(conn):
    """Export all people and events as timeline items with book/location IDs for filtering."""
    cur = conn.cursor()

    # People as timeline items
    people = cur.execute("""
        SELECT id, 'person' as type, name, birth_year as start_year, death_year as end_year,
               birth_approx as start_approx, death_approx as end_approx,
               date_confidence, significance, role as category,
               description, date_notes
        FROM people
    """).fetchall()

    # Events as timeline items
    events = cur.execute("""
        SELECT id, 'event' as type, name, start_year, end_year,
               start_approx, end_approx,
               date_confidence, significance, category,
               description, date_notes
        FROM events
    """).fetchall()

    # Book IDs per person (via person_scripture junction)
    person_books = {}
    for row in cur.execute("""
        SELECT ps.person_id, sr.book_id
        FROM person_scripture ps
        JOIN scripture_references sr ON sr.id = ps.scripture_id
        WHERE sr.book_id IS NOT NULL
    """).fetchall():
        pid = row["personId"]
        if pid not in person_books:
            person_books[pid] = []
        person_books[pid].append(row["bookId"])

    # Book IDs per event (via event_scripture junction)
    event_books = {}
    for row in cur.execute("""
        SELECT es.event_id, sr.book_id
        FROM event_scripture es
        JOIN scripture_references sr ON sr.id = es.scripture_id
        WHERE sr.book_id IS NOT NULL
    """).fetchall():
        eid = row["eventId"]
        if eid not in event_books:
            event_books[eid] = []
        event_books[eid].append(row["bookId"])

    # Location IDs per event
    event_locations = {}
    for row in cur.execute("SELECT event_id, location_id FROM event_locations").fetchall():
        eid = row["eventId"]
        if eid not in event_locations:
            event_locations[eid] = []
        event_locations[eid].append(row["locationId"])

    # Attach book/location IDs for client-side filtering
    for p in people:
        p["bookIds"] = sorted(set(person_books.get(p["id"], [])))
        p["locationIds"] = []

    for e in events:
        e["bookIds"] = sorted(set(event_books.get(e["id"], [])))
        e["locationIds"] = sorted(set(event_locations.get(e["id"], [])))

    # Convert booleans (sqlite stores as 0/1)
    for item in people + events:
        item["startApprox"] = bool(item["startApprox"])
        item["endApprox"] = bool(item["endApprox"])

    items = sorted(people + events, key=lambda x: x.get("startYear") or 999999)
    return items


def export_periods(conn):
    return conn.execute("SELECT * FROM time_periods ORDER BY sort_order").fetchall()


def export_books(conn):
    return conn.execute("SELECT * FROM biblical_books ORDER BY id").fetchall()


def export_filters(conn):
    cur = conn.cursor()

    roles = [r["role"] for r in cur.execute(
        "SELECT DISTINCT role FROM people WHERE role IS NOT NULL ORDER BY role").fetchall()]

    categories = [r["category"] for r in cur.execute(
        "SELECT DISTINCT category FROM events WHERE category IS NOT NULL ORDER BY category").fetchall()]

    tribes = [r["tribe"] for r in cur.execute(
        "SELECT DISTINCT tribe FROM people WHERE tribe IS NOT NULL ORDER BY tribe").fetchall()]

    genres = [r["genre"] for r in cur.execute(
        "SELECT DISTINCT genre FROM biblical_books WHERE genre IS NOT NULL ORDER BY genre").fetchall()]

    periods = conn.execute("SELECT * FROM time_periods ORDER BY sort_order").fetchall()

    confidences_raw = cur.execute("""
        SELECT DISTINCT date_confidence FROM people WHERE date_confidence IS NOT NULL
        UNION
        SELECT DISTINCT date_confidence FROM events WHERE date_confidence IS NOT NULL
        ORDER BY 1
    """).fetchall()
    confidences = [r["dateConfidence"] for r in confidences_raw]

    locations = cur.execute("SELECT id, name FROM locations ORDER BY name").fetchall()
    books = cur.execute("SELECT id, name, testament FROM biblical_books ORDER BY id").fetchall()

    return {
        "roles": roles,
        "eventCategories": categories,
        "tribes": tribes,
        "genres": genres,
        "dateConfidences": confidences,
        "significances": ["major", "minor"],
        "testaments": ["OT", "NT"],
        "timePeriods": periods,
        "locations": locations,
        "books": books,
    }


def export_people_detail(conn):
    """Export all person details as a dict keyed by id."""
    cur = conn.cursor()

    people = cur.execute("SELECT * FROM people").fetchall()
    # Convert booleans
    for p in people:
        p["birthApprox"] = bool(p.get("birthApprox", 0))
        p["deathApprox"] = bool(p.get("deathApprox", 0))

    # Events per person
    person_events = {}
    for row in cur.execute("""
        SELECT pe.person_id, e.id, e.name, e.category, pe.role_in_event
        FROM person_events pe
        JOIN events e ON e.id = pe.event_id
        ORDER BY e.start_year
    """).fetchall():
        pid = row["personId"]
        if pid not in person_events:
            person_events[pid] = []
        person_events[pid].append({
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "roleInEvent": row["roleInEvent"],
        })

    # Relationships per person
    person_rels = {}
    for row in cur.execute("""
        SELECT pr.person_id_1, p.id, p.name, p.role, pr.relationship_type
        FROM person_relationships pr
        JOIN people p ON p.id = pr.person_id_2
    """).fetchall():
        pid = row["personId1"]
        if pid not in person_rels:
            person_rels[pid] = []
        person_rels[pid].append({
            "id": row["id"],
            "name": row["name"],
            "role": row["role"],
            "relationshipType": row["relationshipType"],
        })

    # Scripture references per person
    person_scriptures = {}
    for row in cur.execute("""
        SELECT ps.person_id, sr.*
        FROM person_scripture ps
        JOIN scripture_references sr ON sr.id = ps.scripture_id
    """).fetchall():
        pid = row["personId"]
        if pid not in person_scriptures:
            person_scriptures[pid] = []
        person_scriptures[pid].append({
            "id": row["id"],
            "bookId": row["bookId"],
            "chapterStart": row["chapterStart"],
            "verseStart": row["verseStart"],
            "chapterEnd": row["chapterEnd"],
            "verseEnd": row["verseEnd"],
            "referenceText": row["referenceText"],
        })

    result = {}
    for p in people:
        pid = p["id"]
        p["events"] = person_events.get(pid, [])
        p["relationships"] = person_rels.get(pid, [])
        p["scriptureReferences"] = person_scriptures.get(pid, [])
        result[str(pid)] = p

    return result


def export_events_detail(conn):
    """Export all event details as a dict keyed by id."""
    cur = conn.cursor()

    events = cur.execute("SELECT * FROM events").fetchall()
    for e in events:
        e["startApprox"] = bool(e.get("startApprox", 0))
        e["endApprox"] = bool(e.get("endApprox", 0))

    # People per event
    event_people = {}
    for row in cur.execute("""
        SELECT pe.event_id, p.id, p.name, p.role, pe.role_in_event
        FROM person_events pe
        JOIN people p ON p.id = pe.person_id
        ORDER BY p.birth_year
    """).fetchall():
        eid = row["eventId"]
        if eid not in event_people:
            event_people[eid] = []
        event_people[eid].append({
            "id": row["id"],
            "name": row["name"],
            "role": row["role"],
            "roleInEvent": row["roleInEvent"],
        })

    # Scripture references per event
    event_scriptures = {}
    for row in cur.execute("""
        SELECT es.event_id, sr.*
        FROM event_scripture es
        JOIN scripture_references sr ON sr.id = es.scripture_id
    """).fetchall():
        eid = row["eventId"]
        if eid not in event_scriptures:
            event_scriptures[eid] = []
        event_scriptures[eid].append({
            "id": row["id"],
            "bookId": row["bookId"],
            "chapterStart": row["chapterStart"],
            "verseStart": row["verseStart"],
            "chapterEnd": row["chapterEnd"],
            "verseEnd": row["verseEnd"],
            "referenceText": row["referenceText"],
        })

    # Locations per event
    event_locs = {}
    for row in cur.execute("""
        SELECT el.event_id, l.*
        FROM event_locations el
        JOIN locations l ON l.id = el.location_id
    """).fetchall():
        eid = row["eventId"]
        if eid not in event_locs:
            event_locs[eid] = []
        event_locs[eid].append({
            "id": row["id"],
            "name": row["name"],
            "modernName": row["modernName"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "region": row["region"],
            "description": row["description"],
        })

    result = {}
    for e in events:
        eid = e["id"]
        e["people"] = event_people.get(eid, [])
        e["scriptureReferences"] = event_scriptures.get(eid, [])
        e["locations"] = event_locs.get(eid, [])
        result[str(eid)] = e

    return result


def export_lineage_people(conn):
    """Export all people with parent IDs for client-side lineage computation."""
    rows = conn.execute("""
        SELECT id, name, birth_year, death_year, birth_approx, death_approx,
               role, father_id, mother_id
        FROM people ORDER BY name
    """).fetchall()
    for r in rows:
        r["birthApprox"] = bool(r.get("birthApprox", 0))
        r["deathApprox"] = bool(r.get("deathApprox", 0))
    return rows


def export_map_events(conn):
    """Export events that have locations (for map markers)."""
    return conn.execute("""
        SELECT e.id AS event_id, e.name AS event_name,
               e.start_year, e.end_year,
               e.category, e.significance,
               l.id AS location_id, l.name AS location_name, l.modern_name,
               l.latitude, l.longitude
        FROM events e
        JOIN event_locations el ON el.event_id = e.id
        JOIN locations l ON l.id = el.location_id
        WHERE l.latitude IS NOT NULL
        ORDER BY e.sort_order, COALESCE(e.start_year, e.end_year)
    """).fetchall()


def export_map_people(conn):
    """Export people who have at least 2 located events (for journey dropdown)."""
    return conn.execute("""
        SELECT p.id, p.name, COUNT(DISTINCT el.event_id) AS event_count
        FROM people p
        JOIN person_events pe ON pe.person_id = p.id
        JOIN event_locations el ON el.event_id = pe.event_id
        JOIN locations l ON l.id = el.location_id
        WHERE l.latitude IS NOT NULL
        GROUP BY p.id, p.name
        HAVING COUNT(DISTINCT el.event_id) >= 2
        ORDER BY p.name
    """).fetchall()


def export_map_journeys(conn):
    """Export person-event-location joins for journey rendering."""
    return conn.execute("""
        SELECT pe.person_id, e.id AS event_id, e.name AS event_name,
               e.start_year, e.end_year,
               e.category, pe.role_in_event,
               l.id AS location_id, l.name AS location_name,
               l.latitude, l.longitude
        FROM person_events pe
        JOIN events e ON e.id = pe.event_id
        JOIN event_locations el ON el.event_id = e.id
        JOIN locations l ON l.id = el.location_id
        WHERE l.latitude IS NOT NULL
        ORDER BY e.sort_order, COALESCE(e.start_year, e.end_year)
    """).fetchall()


def export_book_journeys(conn):
    """Export book journey list with stop counts."""
    return conn.execute("""
        SELECT j.id, j.name, j.description,
               COUNT(js.id) AS stop_count
        FROM journeys j
        JOIN journey_stops js ON js.journey_id = j.id
        GROUP BY j.id, j.name, j.description
        ORDER BY j.name
    """).fetchall()


def export_book_journey_stops(conn):
    """Export all journey stops keyed by journey_id."""
    rows = conn.execute("""
        SELECT js.journey_id,
               COALESCE(js.event_id, 0) AS event_id,
               js.label AS event_name,
               js.year AS start_year,
               COALESCE(e.category, 'other') AS category,
               js.chapter AS role_in_event,
               l.id AS location_id,
               l.name AS location_name,
               l.latitude, l.longitude,
               js.chapter,
               js.description AS stop_description
        FROM journey_stops js
        JOIN locations l ON l.id = js.location_id
        LEFT JOIN events e ON e.id = js.event_id
        WHERE l.latitude IS NOT NULL
        ORDER BY js.journey_id, js.sort_order
    """).fetchall()
    # Group by journey_id
    result = {}
    for r in rows:
        jid = str(r["journeyId"])
        if jid not in result:
            result[jid] = []
        result[jid].append(r)
    return result


def write_json(path, data, label=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    size_kb = os.path.getsize(path) / 1024
    rel = label or os.path.relpath(path, ROOT)
    print(f"  {rel:40s} {size_kb:6.1f} KB")


def copy_static_assets(out_dir, dir_name, inline_data=None):
    """Copy HTML, CSS from wwwroot to output dir.

    If inline_data is provided, embeds the JSON data directly into index.html
    so the site works when opened via file:// (no server needed).
    """
    # index.html — adjust paths for static hosting (remove leading /)
    src_html = os.path.join(WWWROOT, "index.html")
    with open(src_html) as f:
        html = f.read()

    # Fix paths: /css/ -> css/, /js/ -> js/ (for relative hosting)
    html = html.replace('href="/css/', 'href="css/')
    html = html.replace('src="/js/', 'src="js/')

    # Embed inline data for file:// usage
    if inline_data:
        data_script = '<script>window.__BIBLE_DATA__=' + json.dumps(inline_data, separators=(",", ":")) + ';</script>'
        html = html.replace('</head>', data_script + '\n</head>')
        print(f"  {dir_name + '/index.html':40s} (patched + inline data)")
    else:
        print(f"  {dir_name + '/index.html':40s} (patched paths)")

    dst_html = os.path.join(out_dir, "index.html")
    with open(dst_html, "w") as f:
        f.write(html)

    # CSS
    css_src = os.path.join(WWWROOT, "css")
    css_dst = os.path.join(out_dir, "css")
    if os.path.exists(css_dst):
        shutil.rmtree(css_dst)
    shutil.copytree(css_src, css_dst)
    print(f"  {dir_name + '/css/':40s} (copied)")

    # JS files
    js_src = os.path.join(WWWROOT, "js")
    js_dst = os.path.join(out_dir, "js")
    os.makedirs(js_dst, exist_ok=True)

    # Copy all JS files except api.js (which gets a static version)
    for fname in os.listdir(js_src):
        if fname.endswith(".js") and fname != "api.js":
            shutil.copy2(os.path.join(js_src, fname), os.path.join(js_dst, fname))
            print(f"  {dir_name}/js/{fname:33s} (copied)")

    # Write the static api.js
    static_api_path = os.path.join(ROOT, "static", "api.js")
    if os.path.exists(static_api_path):
        shutil.copy2(static_api_path, os.path.join(js_dst, "api.js"))
        print(f"  {dir_name + '/js/api.js':40s} (static version)")

    # .nojekyll for GitHub Pages
    with open(os.path.join(out_dir, ".nojekyll"), "w") as f:
        pass


def build_output(dir_name, data, inline=False):
    """Build one output directory from pre-exported data."""
    out_dir = os.path.join(ROOT, dir_name)

    # Clean (preserve CNAME for GitHub Pages custom domain)
    cname_path = os.path.join(out_dir, "CNAME")
    cname_content = None
    if os.path.exists(cname_path):
        cname_content = open(cname_path).read()
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)
    if cname_content is not None:
        with open(cname_path, "w") as f:
            f.write(cname_content)

    if inline:
        inline_data = data
        print(f"  {len(data['timeline'])} timeline items → inline in index.html")
    else:
        inline_data = None
        data_dir = os.path.join(out_dir, "data")
        os.makedirs(data_dir)
        write_json(os.path.join(data_dir, "timeline.json"), data["timeline"])
        write_json(os.path.join(data_dir, "periods.json"), data["periods"])
        write_json(os.path.join(data_dir, "books.json"), data["books"])
        write_json(os.path.join(data_dir, "filters.json"), data["filters"])
        write_json(os.path.join(data_dir, "people.json"), data["people"])
        write_json(os.path.join(data_dir, "events.json"), data["events"])
        write_json(os.path.join(data_dir, "lineage-people.json"), data["lineagePeople"])

    copy_static_assets(out_dir, dir_name, inline_data=inline_data)

    total_kb = sum(
        os.path.getsize(os.path.join(dirpath, f)) / 1024
        for dirpath, _, filenames in os.walk(out_dir)
        for f in filenames
    )
    print(f"  Total {dir_name}/ size: {total_kb:.0f} KB")


def main():
    print("=" * 60)
    print("Building static site → docs/")
    print("=" * 60)

    print("\n[1/2] Exporting data from SQLite...")
    conn = connect()

    data = {
        "timeline": export_timeline(conn),
        "periods": export_periods(conn),
        "books": export_books(conn),
        "filters": export_filters(conn),
        "people": export_people_detail(conn),
        "events": export_events_detail(conn),
        "lineagePeople": export_lineage_people(conn),
        "mapEvents": export_map_events(conn),
        "mapPeople": export_map_people(conn),
        "mapJourneys": export_map_journeys(conn),
        "bookJourneys": export_book_journeys(conn),
        "bookJourneyStops": export_book_journey_stops(conn),
    }

    conn.close()

    print(f"\n[2/2] Building docs/ (inline data, works via file:// and HTTP)...")
    build_output("docs", data, inline=True)

    print(f"\nDone!")
    print(f"  Open directly: open docs/index.html")
    print(f"  Or serve:      cd docs && python3 -m http.server 8080")


if __name__ == "__main__":
    main()

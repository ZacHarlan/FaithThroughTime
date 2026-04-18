#!/usr/bin/env python3
"""Validate the exported static data (inline in index.html)."""
import json, sys, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(ROOT, "docs")

def load_inline_data():
    """Extract window.__BIBLE_DATA__ from docs/index.html."""
    html_path = os.path.join(DOCS, "index.html")
    with open(html_path) as f:
        html = f.read()
    m = re.search(r'window\.__BIBLE_DATA__\s*=\s*(\{.*?\});\s*</script>', html, re.DOTALL)
    if not m:
        print("FAIL: Could not find window.__BIBLE_DATA__ in docs/index.html")
        sys.exit(1)
    return json.loads(m.group(1))

errors = 0
def check(condition, msg):
    global errors
    if not condition:
        print(f"  FAIL: {msg}")
        errors += 1
    return condition

print("Validating static data export...")

data = load_inline_data()

# Timeline
items = data["timeline"]
check(len(items) > 100, f"Expected 100+ timeline items, got {len(items)}")
people_count = sum(1 for x in items if x["type"] == "person")
events_count = sum(1 for x in items if x["type"] == "event")
check(people_count > 50, f"Expected 50+ people, got {people_count}")
check(events_count > 30, f"Expected 30+ events, got {events_count}")

for item in items[:10]:
    for key in ["id", "type", "name", "startYear", "endYear", "startApprox", "endApprox",
                "dateConfidence", "significance", "category", "bookIds", "locationIds"]:
        check(key in item, f"Missing '{key}' in timeline item {item.get('name','?')}")

# People details
people = data["people"]
check(len(people) > 50, f"Expected 50+ people details, got {len(people)}")
adam = people.get("1", {})
check(adam.get("name") == "Adam", f"Expected Adam at id=1, got {adam.get('name')}")
check("events" in adam, "Adam missing events")
check("relationships" in adam, "Adam missing relationships")
check("scriptureReferences" in adam, "Adam missing scriptureReferences")

# Events details
events = data["events"]
check(len(events) > 30, f"Expected 30+ event details, got {len(events)}")
first = list(events.values())[0]
check("people" in first, "Event missing people")
check("locations" in first, "Event missing locations")
check("scriptureReferences" in first, "Event missing scriptureReferences")

# Filters
filters = data["filters"]
check(len(filters.get("roles", [])) > 0, "No roles in filters")
check(len(filters.get("eventCategories", [])) > 0, "No eventCategories")
check(len(filters.get("timePeriods", [])) > 5, "Expected 5+ time periods")
check(len(filters.get("locations", [])) > 5, "Expected 5+ locations")
check(len(filters.get("books", [])) > 60, "Expected 60+ books")

# Periods
periods = data["periods"]
check(len(periods) > 5, f"Expected 5+ periods, got {len(periods)}")
check("name" in periods[0], "Period missing name")
check("startYear" in periods[0], "Period missing startYear")
check("color" in periods[0], "Period missing color")

# Books
books = data["books"]
check(len(books) >= 66, f"Expected 66 books, got {len(books)}")

# Lineage
lineage = data["lineagePeople"]
check(len(lineage) > 50, f"Expected 50+ lineage people, got {len(lineage)}")
jesus = next((p for p in lineage if p["name"] == "Jesus"), None)
check(jesus is not None, "Jesus not found in lineage")
if jesus:
    check(jesus["fatherId"] is not None, "Jesus missing fatherId")
    check(jesus["motherId"] is not None, "Jesus missing motherId")

has_father = sum(1 for p in lineage if p.get("fatherId"))
check(has_father > 50, f"Expected 50+ people with fatherId, got {has_father}")

if errors:
    print(f"\n{errors} check(s) FAILED")
    sys.exit(1)
else:
    print(f"\nAll checks passed!")
    print(f"  {len(items)} timeline items ({people_count} people, {events_count} events)")
    print(f"  {len(people)} people details, {len(events)} event details")
    print(f"  {len(lineage)} lineage people ({has_father} with parents)")
    print(f"  {len(periods)} periods, {len(books)} books")

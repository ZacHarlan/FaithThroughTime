#!/usr/bin/env python3
"""Validate the built docs/ folder without a browser.

    python3 test-static.py        (run build-static.py first)

Prints every failure and exits non-zero if there are any.
"""

import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = ROOT / "docs"
SITE_NAME = "Faith Through Time"
KEYS = ["meta", "periods", "people", "events", "relationships", "locations", "books", "journeys"]
failures: list[str] = []


def check(ok: bool, message: str) -> None:
    if not ok:
        failures.append(message)


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as err:
        failures.append(f"{path.relative_to(DOCS)}: cannot parse ({err})")
        return None


class Head(HTMLParser):
    """Collects title, meta tags, canonical, and local file references."""

    def __init__(self):
        super().__init__()
        self.title, self.meta, self.canonical, self.refs = "", {}, None, []
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "meta":
            self.meta[a.get("property") or a.get("name")] = a.get("content")
        elif tag == "link":
            if a.get("rel") == "canonical":
                self.canonical = a.get("href")
            elif a.get("href"):
                self.refs.append(a["href"])
        elif tag == "script" and a.get("src"):
            self.refs.append(a["src"])

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def parse(path: Path) -> Head:
    head = Head()
    head.feed(path.read_text(encoding="utf-8"))
    return head


def local(ref: str) -> bool:
    return not re.match(r"^(https?:)?//|^data:|^#", ref)


def check_dataset() -> dict | None:
    data = load_json(DOCS / "data" / "dataset.json")
    if data is None:
        return None
    for key in KEYS:
        check(key in data, f"dataset.json: missing key '{key}'")
    for key, minimum in (("people", 100), ("events", 100), ("locations", 5), ("books", 60), ("periods", 5)):
        check(len(data.get(key, [])) >= minimum, f"dataset.json: '{key}' has fewer than {minimum} entries")
    return data


def check_index_refs() -> None:
    index = DOCS / "index.html"
    if not index.exists():
        failures.append("index.html is missing")
        return
    for ref in parse(index).refs:
        if local(ref):
            check((DOCS / ref.split("?")[0].split("#")[0]).exists(), f"index.html references missing file: {ref}")


def check_sw_precache() -> None:
    sw = (DOCS / "sw.js").read_text(encoding="utf-8")
    check(re.search(r"const CACHE_NAME = 'ftt-[0-9a-f]{12}'", sw) is not None, "sw.js: CACHE_NAME is not the hashed value")
    check(re.search(r"const LIBRARY_CACHE = 'ftt-library-[0-9a-f]{12}'", sw) is not None, "sw.js: LIBRARY_CACHE is not the hashed value")
    shell = re.search(r"const SHELL = \[(.*?)\];", sw, re.S)
    if not shell:
        failures.append("sw.js: SHELL list not found")
        return
    for ref in re.findall(r"'([^']+)'", shell.group(1)):
        if re.match(r"^(js|css)/", ref):
            check((DOCS / ref).exists(), f"sw.js precaches missing file: {ref}")


def check_authored(data: dict) -> None:
    slugs = {"person": {p["slug"] for p in data["people"]}, "event": {e["slug"] for e in data["events"]}}
    for name, key in (("tours.json", "tours"), ("discoveries.json", "discoveries")):
        doc = load_json(DOCS / "data" / name)
        if doc is None:
            continue
        check(bool(doc.get(key)), f"{name}: '{key}' is empty or missing")
        walk(doc, name, slugs)


def walk(node, name: str, slugs: dict) -> None:
    if isinstance(node, dict):
        for k in ("a", "b"):
            if isinstance(node.get(k), str):
                check(node[k] in slugs["person"], f"{name}: unknown person slug '{node[k]}' (key {k})")
        if node.get("kind") in slugs and isinstance(node.get("slug"), str):
            check(node["slug"] in slugs[node["kind"]], f"{name}: unknown {node['kind']} slug '{node['slug']}'")
        for v in node.values():
            walk(v, name, slugs)
    elif isinstance(node, list):
        for v in node:
            walk(v, name, slugs)


def check_pages(data: dict) -> list[str]:
    expected = [("person", p["slug"], p["name"]) for p in data["people"]] + \
               [("event", e["slug"], e["name"]) for e in data["events"]]
    urls = []
    for kind, slug, name in expected:
        rel = f"{kind}/{slug}/index.html"
        path = DOCS / rel
        if not path.exists():
            failures.append(f"missing page: {rel}")
            continue
        head = parse(path)
        urls.append(f"/{kind}/{slug}/")
        check(head.title == f"{name} — {SITE_NAME}", f"{rel}: title {head.title!r} does not match expected name-based title")
        for key in ("description", "og:title", "og:image", "og:description", "og:url", "twitter:card"):
            check(bool(head.meta.get(key)), f"{rel}: missing meta {key}")
        check(head.canonical is not None and head.canonical.endswith(f"/{kind}/{slug}/"), f"{rel}: bad canonical {head.canonical!r}")
        check(head.meta.get("og:title") == head.title, f"{rel}: og:title differs from title")
    return urls


def check_sitemap(urls: list[str]) -> None:
    try:
        root = ET.parse(DOCS / "sitemap.xml").getroot()
    except (ET.ParseError, OSError) as err:
        failures.append(f"sitemap.xml: not well-formed ({err})")
        return
    locs = [el.text for el in root.iter() if el.tag.endswith("loc")]
    domain = (ROOT / "CNAME").read_text().strip()
    expected = {f"https://{domain}/"} | {f"https://{domain}{u}" for u in urls}
    check(len(locs) == len(set(locs)), "sitemap.xml: duplicate URLs")
    check(set(locs) == expected, f"sitemap.xml: URL set differs from pages (missing {len(expected - set(locs))}, extra {len(set(locs) - expected)})")


def check_misc() -> None:
    for name in (".nojekyll", "CNAME", "robots.txt", "404.html"):
        check((DOCS / name).exists(), f"missing {name}")
    robots = DOCS / "robots.txt"
    if robots.exists():
        check("Sitemap:" in robots.read_text(), "robots.txt: no Sitemap line")


def main() -> int:
    if not DOCS.exists():
        print("docs/ does not exist. Run build-static.py first.")
        return 1
    data = check_dataset()
    check_index_refs()
    check_sw_precache()
    check_misc()
    urls = []
    if data:
        check_authored(data)
        urls = check_pages(data)
        check_sitemap(urls)
    if failures:
        print(f"{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"OK: dataset, {len(urls)} entity pages, sitemap, service worker, tours and discoveries all valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

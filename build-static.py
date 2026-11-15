#!/usr/bin/env python3
"""Build the static site for GitHub Pages into docs/.

    python3 build-static.py

Steps: export the dataset through the .NET app (single source of truth), copy
wwwroot/ into an empty docs/, generate a crawlable page for every person and
event, write sitemap/robots/404, and stamp the service worker's two cache names
with hashes of the files each holds. Exits non-zero on any failure.
"""

import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WWWROOT = ROOT / "src" / "BibleTimeline.Web" / "wwwroot"
PROJECT = ROOT / "src" / "BibleTimeline.Web"
DOCS = ROOT / "docs"
SITE_NAME = "Faith Through Time"
FONTS = ("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,0..100;"
         "1,9..144,300..600,0..100&family=Hanken+Grotesk:wght@400;500;600;700&display=swap")


class BuildError(Exception):
    pass


# ── Dataset export ────────────────────────────────────────────────────────

def export_dataset(dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["dotnet", "run", "--project", str(PROJECT), "--", "--export-dataset", str(dest)]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    output = proc.stdout + proc.stderr
    if proc.returncode != 0:
        locked = re.search(r"MSB3021|MSB3027|being used by another process|locked", output, re.I)
        if locked:
            raise BuildError("The build output is locked, most likely by a running app. "
                             "Stop it (bash agent-status.sh shows what is running) and rerun.\n" + output[-1500:])
        raise BuildError("Dataset export failed:\n" + output[-3000:])
    if not dest.exists():
        raise BuildError("Export reported success but wrote no file.")


# ── Copy wwwroot ──────────────────────────────────────────────────────────

def reset_docs() -> None:
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir()


def copy_site() -> None:
    shutil.copytree(WWWROOT, DOCS, dirs_exist_ok=True)
    shutil.copy2(ROOT / "CNAME", DOCS / "CNAME")
    (DOCS / ".nojekyll").write_text("")


def read_domain() -> str:
    return (ROOT / "CNAME").read_text().strip()


# ── Dates, formatted the way the app does (js/store.js Time.span) ─────────

def year_text(y, approx=False) -> str:
    if y is None:
        return "unknown"
    s = f"{-y} BC" if y < 0 else f"AD {y}"
    return f"c. {s}" if approx else s


def span_text(a, b, a_approx=False, b_approx=False) -> str:
    if a is None and b is None:
        return "dates unknown"
    if b is None or a == b:
        return year_text(a, a_approx)
    if a is None:
        return f"d. {year_text(b, b_approx)}"
    c = "c. " if (a_approx or b_approx) else ""
    if a < 0 and b < 0:
        return f"{c}{-a}–{-b} BC"
    if a > 0 and b > 0:
        return f"{c}AD {a}–{b}"
    return f"{c}{-a} BC – AD {b}"


def iso_year(y) -> str:
    """ISO 8601 year with astronomical numbering (1 BC is 0000)."""
    n = y + 1 if y < 0 else y
    return f"-{-n:04d}" if n < 0 else f"{n:04d}"


# ── Page content ──────────────────────────────────────────────────────────

def label(text) -> str:
    return (text or "").replace("_", " ").replace("-", " ").strip().capitalize()


def short(text: str, limit: int = 200) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:.") + "…"


def build_entities(data: dict) -> list[dict]:
    """Normalise people and events into one shape the page template renders."""
    people = {p["id"]: p for p in data["people"]}
    events = {e["id"]: e for e in data["events"]}
    children = {}
    for p in data["people"]:
        for parent_id in (p.get("fatherId"), p.get("motherId")):
            if parent_id is not None:
                children.setdefault(parent_id, []).append(p)

    def link(kind, ent, note=None):
        return {"kind": kind, "slug": ent["slug"], "name": ent["name"], "note": note}

    out = []
    for p in data["people"]:
        related = []
        for pid in (p.get("fatherId"), p.get("motherId")):
            if pid in people:
                related.append(link("person", people[pid], "parent"))
        related += [link("person", c, "child") for c in children.get(p["id"], [])]
        for pe in p.get("events", []):
            if pe["id"] in events:
                related.append(link("event", events[pe["id"]], pe.get("role")))
        out.append({
            "kind": "person", "slug": p["slug"], "name": p["name"],
            "dates": span_text(p.get("birthYear"), p.get("deathYear"), p.get("birthApprox"), p.get("deathApprox")),
            "has_dates": p.get("birthYear") is not None or p.get("deathYear") is not None,
            "start": p.get("birthYear"), "end": p.get("deathYear"),
            "tag": p.get("role"), "description": p.get("description"),
            "refs": [s["ref"] for s in p.get("scripture", [])],
            "related": dedupe(related),
        })
    for e in data["events"]:
        related = [link("person", people[x["id"]], x.get("role")) for x in e.get("people", []) if x["id"] in people]
        out.append({
            "kind": "event", "slug": e["slug"], "name": e["name"],
            "dates": span_text(e.get("startYear"), e.get("endYear"), e.get("startApprox"), e.get("endApprox")),
            "has_dates": e.get("startYear") is not None,
            "start": e.get("startYear"), "end": e.get("endYear"),
            "tag": e.get("category"), "description": e.get("description"),
            "refs": [s["ref"] for s in e.get("scripture", [])],
            "related": dedupe(related),
        })
    return out


def dedupe(links: list[dict]) -> list[dict]:
    seen, out = set(), []
    for item in links:
        key = (item["kind"], item["slug"])
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def json_ld(ent: dict, url: str, description: str) -> str:
    doc = {"@context": "https://schema.org",
           "@type": "Person" if ent["kind"] == "person" else "Event",
           "name": ent["name"], "description": description, "url": url}
    if ent["has_dates"]:
        keys = ("birthDate", "deathDate") if ent["kind"] == "person" else ("startDate", "endDate")
        if ent["start"] is not None:
            doc[keys[0]] = iso_year(ent["start"])
        if ent["end"] is not None:
            doc[keys[1]] = iso_year(ent["end"])
    # "<" is escaped so data can never close the script element.
    return json.dumps(doc, ensure_ascii=False).replace("<", "\\u003c")


def related_html(related: list[dict]) -> str:
    if not related:
        return ""
    items = "".join(
        f'<li><a href="/{r["kind"]}/{html.escape(r["slug"], quote=True)}/">{html.escape(r["name"])}</a>'
        + (f' <span class="note">· {html.escape(label(r["note"]))}</span>' if r["note"] else "")
        + "</li>"
        for r in related)
    return f'<h2>Related</h2><ul class="links">{items}</ul>'


def entity_page(ent: dict, domain: str) -> str:
    esc = lambda s: html.escape(s or "", quote=True)
    url = f"https://{domain}/{ent['kind']}/{ent['slug']}/"
    app_path = f"/#/{ent['kind']}/{ent['slug']}"
    title = f"{ent['name']} — {SITE_NAME}"
    summary = " · ".join(x for x in (label(ent["tag"]), ent["dates"]) if x)
    description = short(ent["description"] or f"{ent['name']}: {summary}.")
    og_image = f"https://{domain}/icons/og-default.png"
    paragraphs = "".join(f"<p>{html.escape(p)}</p>" for p in (ent["description"] or "").split("\n\n") if p.strip())
    refs = ""
    if ent["refs"]:
        refs = "<h2>Scripture</h2><ul class=\"links\">" + "".join(f"<li>{html.escape(r)}</li>" for r in ent["refs"]) + "</ul>"
    return f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{esc(url)}">
<meta property="og:type" content="{'profile' if ent['kind'] == 'person' else 'article'}">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(url)}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{og_image}">
<meta name="theme-color" content="#0a0c12">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="/css/base.css">
<style>html,body{{height:auto}}.links{{list-style:none;padding:0;display:grid;gap:var(--s2);margin:var(--s3) 0 var(--s5)}}.links a{{color:var(--gold)}}.note{{color:var(--text-faint)}}.cta{{margin:var(--s5) 0}}h2{{font-size:var(--fs-h2);margin-top:var(--s6)}}</style>
<script type="application/ld+json">{json_ld(ent, url, description)}</script>
<script>location.replace({json.dumps(app_path)});</script>
</head>
<body>
<main class="page">
<p class="eyebrow">{esc(label(ent['kind']))}{' · ' + esc(label(ent['tag'])) if ent['tag'] else ''}</p>
<h1 class="display">{html.escape(ent['name'])}</h1>
<p class="lede">{html.escape(ent['dates'])}</p>
<div class="prose">{paragraphs}</div>
<p class="cta"><a class="btn btn-primary" href="{esc(app_path)}">Open in the interactive timeline</a></p>
{refs}
{related_html(ent['related'])}
<p><a href="/">{SITE_NAME}</a> — the whole story of Scripture on one timeline.</p>
</main>
</body>
</html>
"""


def write_entity_pages(entities: list[dict], domain: str) -> None:
    for ent in entities:
        folder = DOCS / ent["kind"] / ent["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(entity_page(ent, domain), encoding="utf-8")


# ── Sitemap, robots, 404 ──────────────────────────────────────────────────

def write_sitemap(entities: list[dict], domain: str) -> None:
    urls = [f"https://{domain}/"] + [f"https://{domain}/{e['kind']}/{e['slug']}/" for e in entities]
    body = "\n".join(f"  <url><loc>{html.escape(u)}</loc></url>" for u in urls)
    (DOCS / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n',
        encoding="utf-8")
    (DOCS / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: https://{domain}/sitemap.xml\n")


def write_404() -> None:
    (DOCS / "404.html").write_text(f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page not found — {SITE_NAME}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="/css/base.css">
<style>html,body{{height:auto}}</style>
<script>
// An old-style /person/<slug> or /event/<slug> path that has no page goes to the app.
var m = location.pathname.match(/^\\/(person|event)\\/([^/]+)/);
if (m) location.replace('/#/' + m[1] + '/' + m[2]);
</script>
</head>
<body>
<main class="page">
<p class="eyebrow">Not found</p>
<h1 class="display">This page is <em>not on the map</em></h1>
<p class="lede">The link may be old or mistyped. The whole story is one click away.</p>
<p style="margin-top:var(--s5)"><a class="btn btn-primary" href="/">Go to the timeline</a></p>
</main>
</body>
</html>
""", encoding="utf-8")


# ── Cache busting ─────────────────────────────────────────────────────────

LIBRARY_DIRS = {"bibles", "vendor"}   # served cache-first from sw.js's LIBRARY_CACHE


def tree_hash(include) -> str:
    """Hash of the built files (paths and bytes) for which include(rel) is true."""
    digest = hashlib.sha256()
    for path in sorted(DOCS.rglob("*")):
        rel = path.relative_to(DOCS)
        if path.is_file() and include(rel):
            digest.update(rel.as_posix().encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def stamp_constant(text: str, const: str, value: str) -> str:
    new, n = re.subn(rf"(const {const}\s*=\s*)(['\"]).*?\2", rf"\g<1>'{value}'", text, count=1)
    if n != 1:
        raise BuildError(f"Could not find {const} in docs/sw.js.")
    return new


def stamp_service_worker() -> tuple[str, str]:
    """Name both caches after their contents. The app shell changes with every deploy;
    the library (Bible text, vendored code) only when one of its files is corrected, so
    readers keep the chapters they have downloaded across ordinary deploys."""
    sw = DOCS / "sw.js"
    shell = f"ftt-{tree_hash(lambda rel: rel.parts[0] not in LIBRARY_DIRS and rel.as_posix() != 'sw.js')}"
    library = f"ftt-library-{tree_hash(lambda rel: rel.parts[0] in LIBRARY_DIRS)}"
    text = stamp_constant(sw.read_text(encoding="utf-8"), "CACHE_NAME", shell)
    sw.write_text(stamp_constant(text, "LIBRARY_CACHE", library), encoding="utf-8")
    return shell, library


# ── Main ──────────────────────────────────────────────────────────────────

def size_excluding_bibles() -> int:
    return sum(p.stat().st_size for p in DOCS.rglob("*")
               if p.is_file() and p.relative_to(DOCS).parts[0] != "bibles")


def main() -> None:
    domain = read_domain()
    staging = ROOT / ".dataset-build.json"
    try:
        export_dataset(staging)
        dataset_bytes = staging.read_bytes()
    finally:
        staging.unlink(missing_ok=True)
    data = json.loads(dataset_bytes)

    reset_docs()
    copy_site()
    (DOCS / "data").mkdir(exist_ok=True)
    (DOCS / "data" / "dataset.json").write_bytes(dataset_bytes)

    entities = build_entities(data)
    write_entity_pages(entities, domain)
    write_sitemap(entities, domain)
    write_404()
    cache, library = stamp_service_worker()

    n_people = sum(e["kind"] == "person" for e in entities)
    print(f"Wrote {DOCS}")
    print(f"  {n_people} person pages, {len(entities) - n_people} event pages, caches {cache}, {library}")
    print(f"  docs/ size excluding bibles: {size_excluding_bibles() / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    try:
        main()
    except BuildError as err:
        print(f"BUILD FAILED: {err}", file=sys.stderr)
        sys.exit(1)
    except Exception as err:  # noqa: BLE001 - any failure must exit non-zero with a message
        print(f"BUILD FAILED: {type(err).__name__}: {err}", file=sys.stderr)
        sys.exit(1)

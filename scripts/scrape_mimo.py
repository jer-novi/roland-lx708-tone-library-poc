"""
Scrape mimo-international.com for image references keyed by Wikipedia page
title. MIMO is a museum-instrument aggregator and serves images via a proxied
``/mimo/image.ashx?q=...`` endpoint, with friendly detail URLs of the form
``https://mimo-international.com/MIMO/doc/IFD/<OAI_ID>/<slug>``.

The only programmatic access (no public REST API) is a WCF ``Search.svc``
endpoint that accepts a JSON POST body. We send a free-text search per
unique ``wikipediaPageTitle`` from the seed (157 unique titles) and keep
the top 3 results whose friendly URL slug matches the title, capturing
both the detail URL and the og:image / image-ashx URL.

Output: ``data/mimo_image_references.json`` with structure:

    {
      "generated_at": "...",
      "status": "ok" | "partial" | "error",
      "source": "https://mimo-international.com/MIMO/Ermes/Recherche/Search.svc",
      "matches": {
        "<wikipediaPageTitle>": [
          { "mimo_id": "...", "title": "...", "slug": "...",
            "detail_url": "...", "image_url": "..." }, ...
        ]
      },
      "unmatched": ["<wikipediaPageTitle>", ...],
      "stats": { "wiki_titles": N, "matched": M, "unmatched": K }
    }
"""
from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, unquote
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = REPO_ROOT / "data" / "tones_seed.json"
OUTPUT = REPO_ROOT / "data" / "mimo_image_references.json"

SEARCH_URL = "https://mimo-international.com/MIMO/Ermes/Recherche/Search.svc/Search"
UA = "RolandLX708ToneLibrary/0.1 (research; +https://github.com/novi/roland-lx708-tone-library-poc)"
RATE_LIMIT_SEC = 0.5
TIMEOUT_SEC = 30
RESULT_SIZE = 5
MIN_SLUG_OVERLAP = 0.4  # min fraction of wiki-title words present in the slug

REQUEST_BODY_TEMPLATE = json.dumps({
    "query": {
        "FacetFilter": "",
        "InjectOpenFind": True,
        "QueryString": "__QUERY__",
        "ResultSize": RESULT_SIZE,
        "ScenarioCode": "DEFAULT",
        "XslPath": "Recherche/encart_search_scrolling.xslt",
    }
}, separators=(",", ":")).replace("\"__QUERY__\"", "{QUERY}")


def mimo_search(query: str) -> dict | None:
    body = REQUEST_BODY_TEMPLATE.replace("{QUERY}", json.dumps(query))
    req = Request(SEARCH_URL, data=body.encode("utf-8"), method="POST",
                  headers={"Content-Type": "application/json; charset=utf-8",
                           "User-Agent": UA,
                           "Accept": "application/json, text/javascript, */*; q=0.01",
                           "X-Requested-With": "XMLHttpRequest",
                           "Referer": "https://mimo-international.com/MIMO/default.aspx?lg=en-US"})
    try:
        with urlopen(req, timeout=TIMEOUT_SEC) as r:
            raw = r.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  [error] {e!r}", file=sys.stderr)
        return None
    try:
        d = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  [json-error] {e!r}", file=sys.stderr)
        return None
    if not d.get("success", True):
        print(f"  [api-error] {d.get('message')!r}", file=sys.stderr)
        return None
    return d.get("d", {}) or {}


def parse_results(data: dict) -> list[dict]:
    """Extract (mimo_id, title, slug, friendly_url) per result.

    CustomResult is an HTML snippet; the image is NOT in it (only on the
    detail page), so image_url is left empty here and populated by
    ``fetch_detail_image`` in a second call.
    """
    out = []
    for r in data.get("Results", []):
        url = r.get("FriendlyUrl", "")
        m = re.search(r"/doc/IFD/([^/]+)/([^/?#]+)", url)
        if not m:
            continue
        mimo_id, slug = m.group(1), unquote(m.group(2))
        # Title from CustomResult HTML's <h3 class="title ...">
        title = ""
        custom = r.get("CustomResult", "")
        if isinstance(custom, str):
            tm = re.search(r"<h3[^>]*>([^<]+)</h3>", custom)
            if tm:
                title = tm.group(1).strip()
        out.append({
            "mimo_id": mimo_id,
            "title": title or slug.replace("-", " "),
            "slug": slug,
            "detail_url": url,
            "image_url": "",
        })
    return out


def fetch_detail_image(detail_url: str) -> str | None:
    """Fetch the MIMO detail page to extract the og:image URL (best quality)."""
    try:
        req = Request(detail_url, headers={"User-Agent": UA,
                                           "Accept-Language": "en-US,en;q=0.9"})
        with urlopen(req, timeout=TIMEOUT_SEC) as r:
            html = r.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  [detail-error] {detail_url}: {e!r}", file=sys.stderr)
        return None
    # og:image is highest quality
    m = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if m:
        return m.group(1)
    # Fallback to first image.ashx
    m = re.search(r'(https?://mimo-international\.com/mimo/image\.ashx\?q=[^"\']+)', html)
    if m:
        return m.group(1)
    return None


def slug_overlap(wiki_title: str, slug: str) -> float:
    """Return fraction of wiki-title words (>=3 chars) present in the slug.

    A wiki word matches a slug word if it is a full word OR a prefix
    (e.g. wiki "piano" matches "pianoforte" but wiki "bass" does NOT
    match "section-of-bass-drum" because "bass" is its own word there,
    not a prefix of "section").
    """
    wt_words = [w.lower() for w in re.findall(r"\w+", wiki_title) if len(w) >= 3]
    if not wt_words:
        return 0.0
    slug_lc = slug.lower()
    slug_words = slug_lc.split("-")
    hits = 0
    for w in wt_words:
        if w in slug_words:
            hits += 1
        else:
            for sw in slug_words:
                if sw.startswith(w):
                    hits += 1
                    break
    return hits / len(wt_words)


def best_match(wiki_title: str, results: list[dict]) -> dict | None:
    if not results:
        return None
    # Score each result by slug overlap
    scored = [(slug_overlap(wiki_title, r["slug"]), r) for r in results]
    scored.sort(key=lambda x: (-x[0], len(x[1]["slug"])))
    best_score, best = scored[0]
    if best_score < MIN_SLUG_OVERLAP:
        return None
    return best


# For titles whose first-page results don't include any slug-overlap match
# (e.g. "Accordion" -> Swedish "dragspel"), try these alternative queries
# in order and keep the first result that yields a slug-overlap match.
ALT_QUERIES: dict[str, list[str]] = {
    "Accordion": ["piano accordion", "concertina accordion", "accordion instrument"],
    "Bagpipes": ["highland bagpipes", "scottish bagpipes", "irish bagpipes"],
    "Bell": ["church bell", "hand bell", "tubular bell", "bell instrument"],
    "Bird vocalization": ["bird song", "bird call instrument"],
    "Brass section": ["brass ensemble", "brass band", "brass instrument"],
    "Brush (music)": ["brush snare", "drum brush"],
    "Bubble": ["water sound instrument"],
    "Calliope (music)": ["calliope steam organ", "steam organ"],
    "Car": ["car horn", "automobile horn"],
    "Celesta": ["celesta piano", "keyboard celesta"],
    "Classical guitar": ["spanish guitar", "nylon guitar"],
    "Drum kit": ["drum set", "drum kit instrument", "jazz drum"],
    "Electric guitar": ["solid body guitar", "electric instrument guitar"],
    "Hammond organ": ["hammond b3", "tonewheel organ"],
    "Harpsichord": ["harpsichord instrument"],
    "Pipe organ": ["church organ", "pipe organ instrument"],
    "Synthesizer pad": ["synth pad", "pad synthesizer"],
    "Lead synthesizer": ["synthesizer lead", "monophonic synthesizer"],
    "String section": ["string ensemble", "string orchestra"],
    "Vocoder": ["vocoder machine", "speech synthesizer"],
}


def load_existing() -> dict:
    if OUTPUT.exists():
        try:
            return json.loads(OUTPUT.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def main() -> int:
    seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    tones = seed.get("tones", [])

    unique_titles: list[str] = sorted({
        t["wikipediaPageTitle"] for t in tones if t.get("wikipediaPageTitle")
    })
    print(f"Unique wikipediaPageTitles: {len(unique_titles)}", file=sys.stderr)

    existing = load_existing()
    matches: dict[str, list[dict]] = existing.get("matches", {}) if isinstance(existing, dict) else {}
    unmatched: list[str] = existing.get("unmatched", []) if isinstance(existing, dict) else []
    if isinstance(matches, dict) and isinstance(unmatched, list):
        done = set(matches.keys()) | set(unmatched)
    else:
        done = set()
        matches, unmatched = {}, []

    print(f"Resuming: {len(done)} titles already processed", file=sys.stderr)

    errors = 0
    for i, title in enumerate(unique_titles, 1):
        if title in done:
            continue
        print(f"[{i:3d}/{len(unique_titles)}] {title!r}", file=sys.stderr, end=" ")
        queries = [title] + ALT_QUERIES.get(title, [])
        best = None
        matched_query = None
        for q in queries:
            data = mimo_search(q)
            if not data:
                errors += 1
                continue
            results = parse_results(data)
            best = best_match(title, results)
            if best:
                matched_query = q
                break
            time.sleep(RATE_LIMIT_SEC)
        if not best:
            print(f"  no match (tried {len(queries)} queries)", file=sys.stderr)
            unmatched.append(title)
            time.sleep(RATE_LIMIT_SEC)
            continue
        # Fetch detail page for og:image (best quality)
        img = fetch_detail_image(best["detail_url"])
        if img:
            best["image_url"] = img
        matches[title] = [best]
        print(f"  q={matched_query!r:25s} -> {best['mimo_id']} {best['slug']} img={'Y' if img else 'N'}",
              file=sys.stderr)
        time.sleep(RATE_LIMIT_SEC)

        # Checkpoint every 10 titles
        if i % 10 == 0:
            payload = {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "status": "partial" if errors > 0 else "ok",
                "source": SEARCH_URL,
                "matches": matches,
                "unmatched": unmatched,
                "stats": {
                    "wiki_titles": len(unique_titles),
                    "matched": len(matches),
                    "unmatched": len(unmatched),
                    "errors": errors,
                },
            }
            OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "ok" if errors == 0 else "partial",
        "source": SEARCH_URL,
        "matches": matches,
        "unmatched": unmatched,
        "stats": {
            "wiki_titles": len(unique_titles),
            "matched": len(matches),
            "unmatched": len(unmatched),
            "errors": errors,
        },
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Done. matched={len(matches)} unmatched={len(unmatched)} errors={errors}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

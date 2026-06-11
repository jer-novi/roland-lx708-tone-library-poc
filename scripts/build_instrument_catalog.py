"""
Produceer data/instrument_catalog.json: één single source of truth die
alles bevat wat de backend en frontend nodig hebben om de UI te bouwen
(Fase 3) en de image-fallback-ladder te beheren (Fase 2).

Input:
  - data/horn_bostel_sachs_tree.json   (HS-taxonomie uit Fase 1.1)
  - data/roland_hs_mapping.json       (per-tone HS-mapping uit Fase 1.2)
  - data/instrument_image_matches.json (site-images uit vorige ronde)
  - data/mimo_image_references.json   (MIMO — geskipped)
  - data/tones_seed.json              (source-of-truth per tone)

Output structuur:
  {
    "generated_at": "...",
    "hs_tree": {...},                    // 5 families, 11+2 sub, 350 instr
    "tones": {
      "<category>|<tn>": {
        "name": "...",
        "wikipedia_page_title": "...",
        "hs_codes": [...],
        "hs_paths": [["3", "32", "321.322"], ...],
        "image_refs": {
          "site": { "path": "wiki-thumbs/<sha>.jpg", "source": "site-instruments" },
          "wikimedia": { "url": "https://...", "source": "wiki-summary" }
        }
      }
    },
    "stats": {...}
  }
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = REPO_ROOT / "data" / "tones_seed.json"
HS_TREE_PATH = REPO_ROOT / "data" / "horn_bostel_sachs_tree.json"
ROLAND_HS_PATH = REPO_ROOT / "data" / "roland_hs_mapping.json"
IMAGE_MATCHES_PATH = REPO_ROOT / "data" / "instrument_image_matches.json"
MIMO_REFS_PATH = REPO_ROOT / "data" / "mimo_image_references.json"
OUTPUT = REPO_ROOT / "data" / "instrument_catalog.json"


def main() -> int:
    hs_tree = json.load(HS_TREE_PATH.open(encoding="utf-8"))
    roland_hs = json.load(ROLAND_HS_PATH.open(encoding="utf-8"))
    image_matches = json.load(IMAGE_MATCHES_PATH.open(encoding="utf-8"))
    mimo_refs = json.load(MIMO_REFS_PATH.open(encoding="utf-8"))

    # Combineer per tone
    tones_out: dict[str, dict] = {}
    for composite_key, info in roland_hs["matches"].items():
        tones_out[composite_key] = {
            "name": info["roland_name"],
            "wikipedia_page_title": info.get("wikipedia_page_title"),
            "hs_matched_via": info.get("matched_via"),
            "hs_matched_site_name": info.get("matched_site_name"),
            "hs_codes": info.get("hs_codes", []),
            "hs_paths": info.get("hs_paths", []),
            "image_refs": {},
        }

    # Voeg image-references toe uit de site-mapping
    for composite_key, img_info in image_matches.items():
        if composite_key in tones_out:
            tones_out[composite_key]["image_refs"]["site"] = {
                "url": img_info.get("image_url"),
                "site_name": img_info.get("site_name"),
                "source": "site-instruments",
            }

    # Voeg MIMO-references toe (per wiki-titel, dan op alle tonen met die wiki-titel)
    mimo_by_wiki = mimo_refs.get("matches", {})  # { "<wiki_title>": [{mimo_id, ...}, ...] }
    for composite_key, info in tones_out.items():
        wiki = info.get("wikipedia_page_title")
        if wiki and wiki in mimo_by_wiki:
            mimo_info = mimo_by_wiki[wiki]
            tones_out[composite_key]["image_refs"]["mimo"] = {
                "matched_via_wiki_title": wiki,
                "mimo_id": mimo_info[0].get("mimo_id"),
                "title": mimo_info[0].get("title"),
                "detail_url": mimo_info[0].get("detail_url"),
                "image_url": mimo_info[0].get("image_url"),
                "source": "mimo-international.com",
            }

    # Voeg fallback-info toe voor tonen zonder Wiki-titel
    for composite_key, info in roland_hs["matches"].items():
        wiki = info.get("wikipedia_page_title")
        if wiki:
            tones_out[composite_key]["image_refs"]["wikipedia"] = {
                "page_title": wiki,
                "source": "wikipedia-summary",
            }

    # Stats
    has_image_count = sum(1 for t in tones_out.values() if t["image_refs"].get("site") or t["image_refs"].get("wikipedia"))
    has_hs_count = sum(1 for t in tones_out.values() if t.get("hs_codes"))
    stats = {
        "total_tones": len(tones_out),
        "with_hs_codes": has_hs_count,
        "with_image_ref": has_image_count,
        "with_site_image": sum(1 for t in tones_out.values() if t["image_refs"].get("site")),
        "with_wiki_page": sum(1 for t in tones_out.values() if t["image_refs"].get("wikipedia")),
        "with_mimo_ref": sum(1 for t in tones_out.values() if t["image_refs"].get("mimo")),
        "hs_tree_total_instruments": hs_tree.get("stats", {}).get("total_instruments"),
    }

    catalog = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "version": 1,
        "sources": {
            "hs_tree": "allthemusicalinstrumentsoftheworld.com/ClassificationofMusicalInstruments",
            "site_image_mapping": "scripts/scrape_instrument_site.py + scripts/match_instrument_images.py",
            "mimo_image_mapping": "scripts/scrape_mimo.py — WCF Search.svc POST (mimo-international.com)",
        },
        "stats": stats,
        "hs_tree": hs_tree,
        "tones": tones_out,
    }

    OUTPUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written {OUTPUT}")
    print(f"Stats: {json.dumps(stats, indent=2)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

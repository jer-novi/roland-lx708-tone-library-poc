"""
Probeert extra image-references te vinden op mimo-international.com voor
onze Roland-tonen. MIMO is een aggregator van museum-collecties maar de
search-endpoint is momenteel niet bereikbaar (404 vanaf IIS-server).

Status: MIMO scraping is NIET beschikbaar in de huidige site-state.
We schrijven dit script voor toekomstig gebruik en documenteren de
huidige limitatie.

TODO(als MIMO weer werkt):
  - Gebruik firecrawl-map om de sitemap te crawlen
  - Of: probeer individuele fiche.aspx URLs met BEHEER+QUERY parameters
  - Of: gebruik MIMO's "result-search.aspx?query=...&lg=en-US"
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = REPO_ROOT / "data" / "tones_seed.json"
OUTPUT = REPO_ROOT / "data" / "mimo_image_references.json"

# Ondersteunde URL-patronen op MIMO. Geen enkele gaf 200 bij de eerste
# probe op 2026-06-11 — de zoek-endpoints lijken verwijderd of achter
# een migratie. We houden ze als commentaar zodat ze later opnieuw
# geprobeerd kunnen worden.
CANDIDATE_URL_PATTERNS = [
    # https://mimo-international.com/MIMO/result-search.aspx?query=VIOLIN&lg=en-US
    # https://mimo-international.com/MIMO/fiche.aspx?l=en-US&T=Violin&C=...&ID=...
    # https://mimo-international.com/MIMO/default.aspx?lg=en-US (homepage, 200)
]


def main() -> int:
    seed = json.load(SEED_PATH.open(encoding="utf-8"))
    tones = seed.get("tones", [])

    # Schrijf een lege structuur zodat Fase 1.4 (catalog) weet dat MIMO
    # niet beschikbaar is.
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "skipped",
        "reason": "MIMO search-endpoint niet bereikbaar (404 vanaf IIS-server op 2026-06-11)",
        "candidate_patterns": CANDIDATE_URL_PATTERNS,
        "matches": {},
        "unmatched": [{"category": t.get("category"), "tone_number": t.get("toneNumber"),
                        "name": t.get("name")} for t in tones],
    }

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Skipped: MIMO niet bereikbaar. Wrote {OUTPUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

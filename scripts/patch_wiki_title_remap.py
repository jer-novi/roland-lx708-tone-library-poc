"""Pas de goedgekeurde Wikipedia-artikel-remap toe (Fase 1).

Corrigeert een paar fout/te-generiek gemapte tonen zodat verschillende klanken
niet langer het verkeerde of een nietszeggend artikel (en plaatje) delen. Keyt op
"<category>|<toneNumber>" zodat dubbele namen/nummers niet verwisseld worden.

Idempotent: zet de titel; staat hij er al, dan geen wijziging. Schrijft alle drie de
seed-kopieën. Draai opnieuw na het regenereren van de seed:

    python scripts/patch_wiki_title_remap.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATHS = [
    REPO_ROOT / "data" / "tones_seed.json",
    REPO_ROOT / "backend" / "src" / "main" / "resources" / "data" / "tones_seed.json",
    REPO_ROOT / "frontend" / "lib" / "seed-fallback.json",
]

# "<category>|<toneNumber>" -> nieuwe wikipediaPageTitle
REMAP: dict[str, str] = {
    "Other|255": "Flute",              # Fl.Key Click was fout op 'Piano' gemapt
    "Other|23": "Solfège",             # Do Re Mi 1#  (had geen artikel)
    "Other|24": "Solfège",             # Do Re Mi 1b
    "Other|25": "Solfège",             # Do Re Mi 2#
    "Other|26": "Solfège",             # Do Re Mi 2b
    "Other|143": "String synthesizer", # Syn.Strings1  (was generiek 'Synthesizer')
    "Other|144": "String synthesizer", # Syn.Strings3
    "Other|145": "String synthesizer", # Syn.Strings2
}


def main() -> int:
    for seed_path in SEED_PATHS:
        if not seed_path.exists():
            print(f"SKIP (ontbreekt): {seed_path}", file=sys.stderr)
            continue

        seed = json.loads(seed_path.read_text(encoding="utf-8"))
        changed = 0
        for tone in seed.get("tones", []):
            key = f"{tone.get('category')}|{tone.get('toneNumber')}"
            if key in REMAP and tone.get("wikipediaPageTitle") != REMAP[key]:
                tone["wikipediaPageTitle"] = REMAP[key]
                changed += 1

        if changed:
            seed_path.write_text(
                json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            print(f"{seed_path.relative_to(REPO_ROOT)}: {changed} titel(s) geremapt")
        else:
            print(f"{seed_path.relative_to(REPO_ROOT)}: geen wijzigingen nodig")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

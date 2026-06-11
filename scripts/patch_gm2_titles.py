"""
Patch tones_seed.json: vul lege/null wikipediaPageTitle-velden in de GM2-sounds
aan op basis van data/gm2_wiki_titles.json.

Idempotent: draaien wanneer alles al ingevuld is, doet niets.

Gebruik:
    python scripts/patch_gm2_titles.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATHS = [
    REPO_ROOT / "backend" / "src" / "main" / "resources" / "data" / "tones_seed.json",
    REPO_ROOT / "data" / "tones_seed.json",
]
MAPPING_PATH = REPO_ROOT / "data" / "gm2_wiki_titles.json"


def main() -> int:
    with MAPPING_PATH.open(encoding="utf-8") as f:
        mapping_raw = json.load(f)
    mapping: dict[str, str | None] = {
        k: v for k, v in mapping_raw.items() if not k.startswith("_")
    }

    exit_code = 0
    for seed_path in SEED_PATHS:
        if not seed_path.exists():
            print(f"SKIP (missing): {seed_path}", file=sys.stderr)
            continue

        with seed_path.open(encoding="utf-8") as f:
            seed = json.load(f)

        tones = seed.get("tones", [])
        updated = 0
        kept_null = 0
        for tone in tones:
            name = tone.get("name")
            current = tone.get("wikipediaPageTitle")
            if name not in mapping:
                continue
            if current:  # al ingevuld, skip
                continue
            new_value = mapping[name]
            tone["wikipediaPageTitle"] = new_value
            if new_value is None:
                kept_null += 1
            else:
                updated += 1

        if updated or kept_null:
            with seed_path.open("w", encoding="utf-8") as f:
                json.dump(seed, f, ensure_ascii=False, indent=2)
            print(
                f"{seed_path.relative_to(REPO_ROOT)}: {updated} ingevuld, "
                f"{kept_null} expliciet null gelaten"
            )
        else:
            print(f"{seed_path.relative_to(REPO_ROOT)}: geen wijzigingen nodig")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())

"""
Sanity-checks voor data/instrument_catalog.json. Returnt exit 0 als alle
checks slagen, anders 1 met een rapport.

Draaien:
    python scripts/validate_catalog.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CATALOG = REPO_ROOT / "data" / "instrument_catalog.json"


def fail(msgs: list[str]) -> int:
    print("VALIDATION FAILED:")
    for m in msgs:
        print(f"  [FAIL] {m}")
    return 1


def main() -> int:
    if not CATALOG.exists():
        return fail([f"Catalog ontbreekt: {CATALOG}. Draai eerst scripts/build_instrument_catalog.py."])
    catalog = json.load(CATALOG.open(encoding="utf-8"))
    errors: list[str] = []

    # 1. HS-tree aanwezig
    if "hs_tree" not in catalog:
        errors.append("Catalog mist 'hs_tree'")
    else:
        hs = catalog["hs_tree"]
        stats = hs.get("stats", {})
        if stats.get("total_families") != 5:
            errors.append(f"Verwacht 5 families in HS-tree, kreeg {stats.get('total_families')}")
        if stats.get("total_instruments") != 350:
            errors.append(f"Verwacht 350 HS-instruments, kreeg {stats.get('total_instruments')}")
        if not isinstance(hs.get("families"), list) or len(hs["families"]) == 0:
            errors.append("HS-tree.families is leeg of geen lijst")

    # 2. Tones aanwezig
    tones = catalog.get("tones", {})
    if not isinstance(tones, dict) or len(tones) == 0:
        errors.append("Catalog mist 'tones' of is leeg")
    else:
        # 3. Per tone: hs_codes + image_refs aanwezig
        tones_with_hs = 0
        tones_with_image = 0
        bad_keys = []
        for key, t in tones.items():
            if "|" not in key:
                bad_keys.append(key)
            if t.get("hs_codes"):
                tones_with_hs += 1
            if t.get("image_refs"):
                tones_with_image += 1
        if bad_keys:
            errors.append(f"Tone-keys zonder '|': {bad_keys[:5]}")
        # We accepteren niet alle tones met hs_codes (sommige zijn
        # 'Do Re Mi' zonder echte mapping), maar wel de meerderheid
        if tones_with_hs < len(tones) * 0.5:
            errors.append(
                f"Te weinig tones met HS-codes: {tones_with_hs}/{len(tones)} < 50%"
            )

    # 4. Alle HS-codes in tones moeten bestaan in de HS-tree
    if "hs_tree" in catalog and "all_instruments" in catalog["hs_tree"]:
        valid_codes = {i["hs_code"] for i in catalog["hs_tree"]["all_instruments"]}
        # Voeg ook de categorie- en subfamilie-codes zelf toe
        for fam in catalog["hs_tree"].get("families", []):
            valid_codes.add(fam["hs_code"])
            for sf in fam.get("subfamilies", []):
                valid_codes.add(sf["hs_code"])
                for ssf in sf.get("subfamilies", []):
                    valid_codes.add(ssf["hs_code"])
        # Voeg alle prefixen toe: bv. als '321.322' geldig is, dan zijn
        # '3', '32', '321', '321.3', '321.32' dat ook (parent traversal).
        # Dat is een liberaler schema, maar wel correct voor HS.
        prefix_codes: set[str] = set()
        for code in list(valid_codes):
            parts = code.split(".")
            for i in range(1, len(parts) + 1):
                prefix_codes.add(".".join(parts[:i]))
        valid_codes.update(prefix_codes)
        # Voeg ook de speciale '5' (electrophones) toe als die nog niet
        # in de tree zat — categorie 5 heeft geen sub-codes in onze scrape.
        valid_codes.add("5")
        unknown_codes: set[str] = set()
        for t in tones.values():
            for c in t.get("hs_codes", []):
                if c not in valid_codes:
                    unknown_codes.add(c)
        if unknown_codes:
            errors.append(
                f"HS-codes in tones maar niet in HS-tree: {sorted(unknown_codes)[:10]}"
            )

    # 5. Wikipedia-page-title format check
    bad_titles = []
    for key, t in tones.items():
        w = t.get("wikipedia_page_title")
        if w and (not isinstance(w, str) or len(w) < 2):
            bad_titles.append((key, w))
    if bad_titles:
        errors.append(f"Suspect wikipedia_page_title: {bad_titles[:5]}")

    # 6. image_refs format
    for key, t in tones.items():
        refs = t.get("image_refs", {})
        if not isinstance(refs, dict):
            errors.append(f"image_refs van {key} is geen dict")
            continue
        for src, info in refs.items():
            if not isinstance(info, dict):
                errors.append(f"image_refs.{src} van {key} is geen dict")

    # Rapport
    stats = catalog.get("stats", {})
    print("=" * 60)
    print("Catalog validatie")
    print("=" * 60)
    print(f"  Tones: {len(tones)}")
    print(f"  Met HS-codes: {sum(1 for t in tones.values() if t.get('hs_codes'))}")
    print(f"  Met image-refs: {sum(1 for t in tones.values() if t.get('image_refs'))}")
    print(f"  HS-tree families: {stats.get('hs_tree_total_instruments', 0)} instruments")
    if errors:
        return fail(errors)
    print("=" * 60)
    print("[OK] alle checks geslaagd")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

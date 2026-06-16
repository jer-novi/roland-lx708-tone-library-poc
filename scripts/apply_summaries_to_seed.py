"""Vouw de gegenereerde samenvattingen in de seed (Fase 2).

Leest de twee side-files die de samenvattingen-agent oplevert en:
  1. injecteert `oneLinerNl` / `oneLinerEn` per toon in alle drie de seed-kopieen
     (match op "<category>|<toneNumber>");
  2. kopieert instrument_backgrounds.json naar de backend-classpath zodat
     DataInitializer hem als losse seed-file kan laden (achtergronden zijn
     online-only; ze gaan NIET in de frontend-fallback).

Daarna een dekkingsrapport: welke tonen nog geen one-liner hebben en welke
unieke wikipediaPageTitle nog geen achtergrond heeft.

Idempotent. Draai na elke levering van de agent:

    python scripts/apply_summaries_to_seed.py
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATHS = [
    REPO_ROOT / "data" / "tones_seed.json",
    REPO_ROOT / "backend" / "src" / "main" / "resources" / "data" / "tones_seed.json",
    REPO_ROOT / "frontend" / "lib" / "seed-fallback.json",
]
SUMMARIES = REPO_ROOT / "data" / "tone_summaries.json"
BACKGROUNDS = REPO_ROOT / "data" / "instrument_backgrounds.json"
BACKGROUNDS_CLASSPATH = (
    REPO_ROOT / "backend" / "src" / "main" / "resources" / "data" / "instrument_backgrounds.json"
)


def tone_key(tone: dict) -> str:
    return f"{tone.get('category')}|{tone.get('toneNumber')}"


def main() -> int:
    summaries = json.loads(SUMMARIES.read_text(encoding="utf-8")).get("tones", {})
    backgrounds = json.loads(BACKGROUNDS.read_text(encoding="utf-8")).get("instruments", {})

    # 1. one-liners in de seed-kopieen
    for seed_path in SEED_PATHS:
        if not seed_path.exists():
            print(f"SKIP (ontbreekt): {seed_path}")
            continue
        seed = json.loads(seed_path.read_text(encoding="utf-8"))
        changed = 0
        for tone in seed.get("tones", []):
            entry = summaries.get(tone_key(tone))
            if not entry:
                continue
            ol = entry.get("oneLiner", {})
            for field, val in (("oneLinerNl", ol.get("nl")), ("oneLinerEn", ol.get("en"))):
                if val and tone.get(field) != val:
                    tone[field] = val
                    changed += 1
        if changed:
            seed_path.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{seed_path.relative_to(REPO_ROOT)}: {changed} one-liner-veld(en) bijgewerkt")

    # 2. achtergronden naar de classpath
    shutil.copyfile(BACKGROUNDS, BACKGROUNDS_CLASSPATH)
    print(f"instrument_backgrounds.json -> {BACKGROUNDS_CLASSPATH.relative_to(REPO_ROOT)}")

    # 3. validatie + dekkingsrapport (poort: harde fouten => exit 1)
    seed = json.loads(SEED_PATHS[0].read_text(encoding="utf-8"))
    tones = seed.get("tones", [])
    tone_keys = {tone_key(t) for t in tones}
    titles = {t["wikipediaPageTitle"] for t in tones if t.get("wikipediaPageTitle")}

    required_cats = {"technical", "history", "playful", "exotic"}
    valid_cats = required_cats | {"culture", "usage"}

    errors: list[str] = []
    warnings: list[str] = []

    # Orphan-sleutels: agent leverde een sleutel die niet in de seed bestaat (stille mis!)
    for k in sorted(set(summaries) - tone_keys):
        errors.append(f"one-liner-sleutel bestaat niet in seed: {k!r}")
    for k in sorted(set(backgrounds) - titles):
        errors.append(f"achtergrond-sleutel is geen wikipediaPageTitle: {k!r}")

    # One-liner veld-volledigheid
    for k, entry in summaries.items():
        ol = (entry or {}).get("oneLiner", {})
        if not (ol.get("nl") or "").strip() or not (ol.get("en") or "").strip():
            errors.append(f"one-liner {k!r}: nl/en leeg")

    # Achtergrond: samenvatting + facts-vorm
    for k, entry in backgrounds.items():
        summ = (entry or {}).get("summary", {})
        if not (summ.get("nl") or "").strip() or not (summ.get("en") or "").strip():
            errors.append(f"achtergrond {k!r}: summary nl/en leeg")
        facts = (entry or {}).get("facts", [])
        cats = {f.get("category") for f in facts}
        for f in facts:
            if f.get("category") not in valid_cats:
                errors.append(f"achtergrond {k!r}: ongeldige fact-categorie {f.get('category')!r}")
            if not (f.get("nl") or "").strip() or not (f.get("en") or "").strip():
                errors.append(f"achtergrond {k!r}: fact ({f.get('category')}) nl/en leeg")
        if len(facts) < 5:  # SFX mag 3-4 -> waarschuwing, geen harde fout
            warnings.append(f"achtergrond {k!r}: {len(facts)} facts (<5; ok voor SFX)")
        missing_req = required_cats - cats
        if missing_req:
            warnings.append(f"achtergrond {k!r}: mist verplichte categorie(en) {sorted(missing_req)}")

    missing_ol = sorted(tone_keys - set(summaries))
    missing_bg = sorted(titles - set(backgrounds))

    print("=" * 60)
    print(f"One-liners : {len(tone_keys) - len(missing_ol)}/{len(tone_keys)} tonen gedekt")
    print(f"Achtergrond: {len(titles) - len(missing_bg)}/{len(titles)} instrumenten gedekt")
    if missing_ol:
        print(f"  Nog te doen one-liner ({len(missing_ol)}): {', '.join(missing_ol[:15])}"
              + (" ..." if len(missing_ol) > 15 else ""))
    if missing_bg:
        print(f"  Nog te doen achtergrond ({len(missing_bg)}): {', '.join(missing_bg[:15])}"
              + (" ..." if len(missing_bg) > 15 else ""))
    for w in warnings:
        print(f"  WAARSCHUWING: {w}")
    for e in errors:
        print(f"  FOUT: {e}")
    if errors:
        print(f"\n{len(errors)} harde fout(en) — los op voordat je dit als bron gebruikt.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

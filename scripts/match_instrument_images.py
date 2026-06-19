"""
Match onze 324 seed-tonen tegen de gescrapete site-mapping en produceer
data/instrument_image_matches.json met {tone_id: {site_name, image_url}}.

Matching-strategie (in volgorde van voorkeur):
  1. normalize(seed.name)            == normalize(site.name)
  2. normalize(seed.wikipediaPageTitle) == normalize(site.name)  (Wikipedia-titel is generieker)
  3. Eerste match die substring-bevestiging krijgt via handmatige alias-tabel

De alias-tabel onderaan is optioneel: voeg hier mappings toe voor tonen
waarvan de naam of Wiki-titel niet direct op de site staat, maar die wel
een bekende equivalent hebben (bv. "Rhodes piano" -> "Electric piano").

Output: per tone_id de URL van de BESTE image (header_image heeft voorrang
op play_image) op de site, of null als er geen match is.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = REPO_ROOT / "data" / "tones_seed.json"
SITE_PATH = REPO_ROOT / "data" / "instrument_site_mapping.json"
OUTPUT = REPO_ROOT / "data" / "instrument_image_matches.json"

# Optionele handmatige alias-tabel. Sleutel is de Wikipedia-titel uit de seed
# (genormaliseerd), waarde is de site-naam (exact zoals gescrapet, maar
# de lookup doet zelf normalize). Voeg hier dingen toe die niet via
# automatische matching werken.
ALIASES: dict[str, str] = {
    # "1976 suitcase" -> "Rhodes piano" -> Electric piano? Nee, niets.
    # We laten dit leeg; niet-matchende tonen krijgen null.
    "wurlitzer electronic piano": "Electric piano",
    "yamaha dx7": "Synthesizer",
    "string section": "String",
    "string orchestra": "String",
    "orchestra": "Orchestra",
    "wind ensemble": "Wind",
    "scat singing": "Vocoder",  # benadering
    "hammond organ": "Hammond organ",
    "leslie speaker": "Leslie speaker",  # staat er wellicht
    "glass harmonica": "Glass marimba",  # benadering
    "phaser effect": "Phaser",
}


def normalize(name: str) -> str:
    nfkd = unicodedata.normalize("NFKD", name or "")
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_only = ascii_only.lower()
    ascii_only = re.sub(r"[^a-z0-9\s]", " ", ascii_only)
    return re.sub(r"\s+", " ", ascii_only).strip()


def main() -> int:
    seed = json.load(SEED_PATH.open(encoding="utf-8"))
    site = json.load(SITE_PATH.open(encoding="utf-8"))

    # toneNumber is NIET globaal uniek — het herhaalt per category. Daarom
    # keyen we de output op (category, toneNumber) zodat Violin (Strings, 8)
    # niet wordt overschreven door een tone met dezelfde number in Other.
    matches: dict[str, dict] = {}
    unmatched: list[tuple[str, int, str, str | None]] = []

    for tone in seed.get("tones", []):
        category = tone.get("category", "")
        tone_num = tone.get("toneNumber")
        name = tone["name"]
        wiki_title = tone.get("wikipediaPageTitle")
        # Samengestelde key zoals die in de database voorkomt.
        composite_key = f"{category}|{tone_num}"

        # 1. Directe match op naam
        site_record = site.get(normalize(name))
        # 2. Match op wikipediaPageTitle
        if site_record is None and wiki_title:
            site_record = site.get(normalize(wiki_title))
        # 3. Alias-tabel
        if site_record is None and wiki_title and normalize(wiki_title) in ALIASES:
            site_record = site.get(normalize(ALIASES[normalize(wiki_title)]))

        if site_record:
            best_url = site_record.get("header_image") or site_record.get("play_image")
            matches[composite_key] = {
                "site_name": site_record["name"],
                "image_url": best_url,
            }
        else:
            unmatched.append((category, tone_num, name, wiki_title))

    OUTPUT.write_text(json.dumps(matches, ensure_ascii=False, indent=2), encoding="utf-8")

    total = len(seed.get("tones", []))
    matched = len(matches)
    print(f"Matched: {matched}/{total} ({matched*100//total}%)")
    print(f"Top 30 unmatched:")
    for cat, tn, name, wiki in unmatched[:30]:
        print(f"  cat={cat!r:10s} tn={tn:3d} name={name!r:30s} wiki={wiki!r}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

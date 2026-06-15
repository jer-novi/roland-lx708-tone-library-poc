"""
Koppel de 324 Roland-tonen aan Hornbostel-Sachs codes (best-effort).

Approach (in volgorde van voorkeur):
  1. Match normalized Roland naam tegen de 350 HS-tree instrumenten.
     Geeft ons de exacte HS-code per tone.
  2. Match normalized Roland naam of wikipediaPageTitle tegen de 490
     site-mapping instrumenten (van allthemusicalinstrumentsoftheworld.com).
     Geeft ons de site-canonical naam + categorie, plus HS-code als die
     letterlijk in de site-naam staat (bv. "Claves 111.11").
  3. Fallback via expliciete aliassen (zie ALIASES onderaan).
  4. Voor de overgebleven "Other" GM2-tonen proberen we category-defaults
     (zie CATEGORY_DEFAULTS).

Voor de frontend zijn niet alle 324 tonen nodig — alleen de ~30 meest
voorkomende categories (Piano, E.Piano, Strings) en de duidelijk-mapped
GM2-sounds. We produceren een mapping die in elk geval de "hs_path"
bevat voor de bekende sub-families.

Output: data/roland_hs_mapping.json
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = REPO_ROOT / "data" / "tones_seed.json"
SITE_MAPPING_PATH = REPO_ROOT / "data" / "instrument_site_mapping.json"
HS_TREE_PATH = REPO_ROOT / "data" / "horn_bostel_sachs_tree.json"
OUTPUT = REPO_ROOT / "data" / "roland_hs_mapping.json"

# Expliciete aliases: Roland-tone-naam of Wikipedia-titel → normalized
# zoekterm in de HS-tree OF site-mapping. Dit is onze "manual override"
# voor gevallen waar de directe match faalt maar we WETEN dat de relatie
# bestaat (bijv. "Wurlitzer electronic piano" → "electric piano").
ALIASES: dict[str, str] = {
    # E.Piano wiki-titels
    "wurlitzer electronic piano": "electric piano",
    "wurlitzer": "electric piano",
    "yamaha dx7": "synthesizer",
    "yamaha cp 70": "electric piano",
    "rhodes piano": "electric piano",
    "frequency modulation synthesis": "synthesizer",
    # Strings
    "string section": "string",
    "string orchestra": "string",
    "wind ensemble": "wind",
    "scat singing": "voice",
    # Organ
    "hammond organ": "hammond organ",
    "leslie speaker": "rotary",
    "phaser effect": "phaser",
    # Overige
    "rock piano": "piano",
    "ragtime": "piano",
    "electronic drum": "drum",
    "roland tr 808": "drum machine",
    "brush music": "brush",
    "percussion section": "percussion",
    "sound effect": "percussion",
    "ukelele": "ukulele",
    "twelve string guitar": "twelve",
    "steel string acoustic guitar": "steel",
    "jazz guitar": "jazz",
    "steel guitar": "steel",
    "palm mute": "guitar",
    "distortion music": "distortion",
    "natural harmonic": "harmonic",
    "humming": "voice",
    "whistling": "whistle",
    "bird vocalization": "bird",
    "explosion": "explosion",
    "synthesizer pad": "synthesizer",
    "lead synthesizer": "synthesizer",
    "church bell": "bell",
    "music box": "music box",
    "concert ukulele": "ukulele",
    "concertina": "concertina",
    "classical guitar": "guitar",
    "jazz guitar": "jazz",
    "saxophone": "saxophone",
    "soprano saxophone": "soprano saxophone",
    "tenor saxophone": "tenor saxophone",
    "alto saxophone": "alto saxophone",
    "baritone saxophone": "baritone saxophone",
    "soprano clarinet": "soprano clarinet",
    "flute": "flute",
    "piccolo": "piccolo",
    "oboe": "oboe",
    "english horn": "english horn",
    "clarinet": "clarinet",
    "bassoon": "bassoon",
    "trumpet": "trumpet",
    "trombone": "trombone",
    "french horn": "horn",
    "tuba": "tuba",
    "violin": "violin",
    "viola": "viola",
    "cello": "cello",
    "double bass": "double bass",
    "harp": "harp",
    "harpsichord": "harpsichord",
    "celesta": "celesta",
    "piano": "piano",
    "organ": "organ",
    "accordion": "accordion",
    "harmonica": "harmonica",
    "bagpipes": "bagpipe",
    "banjo": "banjo",
    "ukulele": "ukulele",
    "mandolin": "mandolin",
    "lute": "lute",
    "lyre": "lyre",
    "sitar": "sitar",
    "balalaika": "balalaika",
    "erhu": "erhu",
    "koto": "koto",
    "marimba": "marimba",
    "vibraphone": "vibraphone",
    "glockenspiel": "glockenspiel",
    "xylophone": "xylophone",
    "cymbal": "cymbal",
    "tabla": "tabla",
    "didgeridoo": "didgeridoo",
    "theremin": "theremin",
    "tambourine": "tambourine",
    "gong": "gong",
    "shakuhachi": "shakuhachi",
    "ocarina": "ocarina",
    "shofar": "shofar",
    "zither": "zither",
    "hurdy gurdy": "hurdy",
    "psaltery": "psaltery",
    "synthesizer": "synthesizer",
    "sampler": "synthesizer",
    "timpani": "timpani",
    "snare drum": "snare",
    "bass drum": "bass drum",
    "tom-tom": "tom",
    "guiro": "guiro",
    "maracas": "maracas",
    "cowbell": "cowbell",
    "wood block": "wood",
    "tambura": "tambura",
    "saxophone": "saxophone",
    "soprano saxophone": "soprano saxophone",
    "piano": "piano",
    "electric piano": "electric piano",
    "pipe organ": "organ",
    "reed organ": "organ",
    "trumpet marine": "trumpet",
    "tromba marina": "trumpet",
    "whistle": "whistle",
    "flute": "flute",
    "glass harmonica": "glass harmonica",
    "glasschord": "glass",
    "vibraphone": "vibraphone",
    "celesta": "celesta",
    "sampler": "synthesizer",
    "timpani": "timpani",
    "triangle": "triangle",
    "drum kit": "drum",
    "bongo drum": "bongo",
    "tambourine": "tambourine",
    "snare drum": "snare",
    "wind ensemble": "wind",
    "string ensemble": "string",
    "piano": "piano",
    "electric piano": "electric piano",
    "harpsichord": "harpsichord",
    "clavichord": "clavichord",
    "piano": "piano",
}

# Per-category/subCategory fallback HS-code als geen directe match mogelijk
# is. Voor de "Other" GM2-sounds mappen we op de meest waarschijnlijke
# familie. (Het is een benadering — voor de frontend is dit "beter dan niets".)
CATEGORY_DEFAULTS: dict[str, str] = {
    "Piano": "321.322",                # Keyboard chordophone (grand/upright)
    "E. Piano": "321.322",             # Electronic piano
    "Strings": "321.322",              # String section (composite chordophone)
}
# Andere tonen worden gematcht op de subCategory (GM2-sounds):
#   Drums → 211         (struck membranophone)
#   GM2   → 5            (electrophone) — default voor onbekende GM2-sounds
#   Do Re Mi → geen default (educatieve labels, geen echt instrument)
#   Bass... → 321.322    (composite chordophone)
#   Guitar... → 321.322  (composite chordophone)
#   Horn → 423.22         (trumpet-like aerophone)
#   Organ → 5            (electrophone / pipe organ) — we laten 5 staan
#   Perc → 211           (struck membranophone)
#   Piano → 321.322
#   Sax → 422.212
#   Strings → 321.322
#   Synth → 5
#   Vocal → 5
#   Wind → 421
#   Brass → 423
#   Bell → 111
#   Choir → 5 (electronic choir)
#   FX → 5
#   Pad → 5
#   Lead → 5
SUBCATEGORY_DEFAULTS: dict[str, str] = {
    "Piano": "321.322",
    "E. Piano": "321.322",
    "Organ": "5",  # pipe + electronic organ → electrophone
    "Strings": "321.322",
    "Strings+": "321.322",
    "Bass": "321.322",
    "Guitar": "321.322",
    "Brass": "423",
    "Sax": "422.212",
    "Saxophone": "422.212",
    "Wind": "421",
    "Winds": "421",
    "Vocal": "5",
    "Vox": "5",
    "Choir": "5",
    "Synth": "5",
    "Lead": "5",
    "Pad": "5",
    "FX": "5",
    "Perc": "211",
    "Drums": "211",
    "Drum": "211",
    "Bell": "111",
    "GM2": "5",
}
# Default voor Other zonder subCategory (zou niet moeten voorkomen)
OTHER_DEFAULT = "5"


def normalize(name: str) -> str:
    nfkd = unicodedata.normalize("NFKD", name or "")
    a = "".join(c for c in nfkd if not unicodedata.combining(c)).lower()
    a = re.sub(r"[^a-z0-9\s]", " ", a)
    return re.sub(r"\s+", " ", a).strip()


def build_hs_index(hs_tree: dict) -> tuple[dict[str, list[dict]], dict[str, list[str]]]:
    by_name: dict[str, list[dict]] = {}
    code_to_path: dict[str, list[str]] = {}

    def walk(node: dict, path: list[str]) -> None:
        node_code = node.get("hs_code", "")
        new_path = path + [node_code] if node_code else path
        if node_code:
            code_to_path[node_code] = new_path
        for child in node.get("subfamilies", []):
            walk(child, new_path)
        for inst in node.get("instruments", []):
            ic = inst.get("hs_code", "")
            inst_name = inst.get("name", "")
            n = normalize(inst_name)
            if n:
                full_path = new_path + [ic] if ic else new_path
                by_name.setdefault(n, []).append({
                    "site_name": inst_name,
                    "hs_code": ic,
                    "hs_path": full_path,
                })
            if ic and ic not in code_to_path:
                code_to_path[ic] = new_path + [ic]

    for fam in hs_tree.get("families", []):
        walk(fam, [])
    return by_name, code_to_path


def load_site_mapping() -> dict[str, dict]:
    site = json.load(SITE_MAPPING_PATH.open(encoding="utf-8"))
    out: dict[str, dict] = {}
    hs_re = re.compile(r"\b\d+(?:\.\d+)+\b")
    for key, info in site.items():
        name = info.get("name", "")
        codes = sorted(set(hs_re.findall(name)))
        out[key] = {"site_name": name, "hs_codes": codes}
    return out


def find_match(name: str, wiki: str, hs_by_name, site_by_name) -> tuple[str, list[dict]] | None:
    """Probeer meerdere matchstrategieën en geef de eerste die slaagt."""
    n_name = normalize(name)
    n_wiki = normalize(wiki)

    # 1. Directe naam-match in HS-tree
    if n_name in hs_by_name:
        return ("hs_tree_name", hs_by_name[n_name])
    # 2. Wiki-titel in HS-tree
    if n_wiki in hs_by_name:
        return ("hs_tree_wiki", hs_by_name[n_wiki])
    # 3. Naam in site-mapping (kan HS-codes bevatten als die in de naam staan)
    if n_name in site_by_name:
        site_rec = site_by_name[n_name]
        if site_rec["hs_codes"]:
            hits = [{"site_name": site_rec["site_name"], "hs_code": c, "hs_path": []} for c in site_rec["hs_codes"]]
            return ("site_name", hits)
    # 4. Wiki-titel in site-mapping
    if n_wiki in site_by_name:
        site_rec = site_by_name[n_wiki]
        if site_rec["hs_codes"]:
            hits = [{"site_name": site_rec["site_name"], "hs_code": c, "hs_path": []} for c in site_rec["hs_codes"]]
            return ("site_wiki", hits)
    # 5. Aliassen
    if n_name in ALIASES:
        alias_key = normalize(ALIASES[n_name])
        if alias_key in hs_by_name:
            return ("alias_name", hs_by_name[alias_key])
    if n_wiki in ALIASES:
        alias_key = normalize(ALIASES[n_wiki])
        if alias_key in hs_by_name:
            return ("alias_wiki", hs_by_name[alias_key])
        if alias_key in site_by_name:
            site_rec = site_by_name[alias_key]
            if site_rec["hs_codes"]:
                hits = [{"site_name": site_rec["site_name"], "hs_code": c, "hs_path": []} for c in site_rec["hs_codes"]]
                return ("alias_wiki", hits)
    # 6. Categorie-default voor GM2-sounds
    return None


def main() -> int:
    seed = json.load(SEED_PATH.open(encoding="utf-8"))
    hs_tree = json.load(HS_TREE_PATH.open(encoding="utf-8"))
    hs_by_name, hs_code_to_path = build_hs_index(hs_tree)
    site_by_name = load_site_mapping()

    matches: dict[str, dict] = {}
    unmatched: list[dict] = []
    fallback_default_count = 0

    for tone in seed.get("tones", []):
        category = tone.get("category", "")
        tn = tone.get("toneNumber")
        composite_key = f"{category}|{tn}"
        name = tone["name"]
        wiki = tone.get("wikipediaPageTitle") or ""

        result = find_match(name, wiki, hs_by_name, site_by_name)

        if result:
            via, hits = result
            all_codes = []
            all_paths = []
            for h in hits:
                if h["hs_code"] and h["hs_code"] not in all_codes:
                    all_codes.append(h["hs_code"])
                if h.get("hs_path") and h["hs_path"] not in all_paths:
                    all_paths.append(h["hs_path"])
            matches[composite_key] = {
                "roland_name": name,
                "wikipedia_page_title": wiki or None,
                "matched_via": via,
                "matched_site_name": hits[0]["site_name"],
                "matched_count": len(hits),
                "hs_codes": all_codes,
                "hs_paths": all_paths,
            }
        else:
            # Fallback: category/subCategory default (voor GM2-sounds)
            sub = tone.get("subCategory")
            default_code: str | None = None
            if sub and sub in SUBCATEGORY_DEFAULTS:
                default_code = SUBCATEGORY_DEFAULTS[sub]
            elif category in CATEGORY_DEFAULTS:
                default_code = CATEGORY_DEFAULTS[category]
            else:
                default_code = OTHER_DEFAULT
            if default_code:
                default_path = hs_code_to_path.get(default_code, [default_code])
                matches[composite_key] = {
                    "roland_name": name,
                    "wikipedia_page_title": wiki or None,
                    "matched_via": f"default:{sub or category}",
                    "matched_site_name": None,
                    "matched_count": 0,
                    "hs_codes": [default_code],
                    "hs_paths": [default_path],
                }
                fallback_default_count += 1
            else:
                unmatched.append({
                    "category": category,
                    "tone_number": tn,
                    "name": name,
                    "wikipedia_page_title": wiki or None,
                })

    stats = {
        "total_seed_tones": len(seed.get("tones", [])),
        "matched": len(matches),
        "unmatched": len(unmatched),
        "match_pct": round(100 * len(matches) / max(1, len(seed.get("tones", []))), 1),
        "category_default_fallback": fallback_default_count,
    }
    via_counts: dict[str, int] = defaultdict(int)
    code_counts: dict[str, int] = defaultdict(int)
    for m in matches.values():
        via_counts[m["matched_via"]] += 1
        for c in m["hs_codes"]:
            code_counts[c] += 1
    stats["matched_via"] = dict(via_counts)
    stats["top_hs_codes"] = dict(sorted(code_counts.items(), key=lambda x: -x[1])[:25])

    output_doc = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stats": stats,
        "matches": matches,
        "unmatched": unmatched,
    }

    OUTPUT.write_text(json.dumps(output_doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2))
    print(f"\nWrote {OUTPUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

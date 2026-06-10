#!/usr/bin/env python3
"""Genereer Nederlandse klank-tags (timbre + context) voor alle 324 tones.

Fase C uit docs/Frontend_UX_Plan_Fase2.md. De 68 'native' LX708-tones
(Piano, E. Piano, Strings, Organ, Upright, Classical, Do Re Mi, Drums)
zijn met de hand getagd; de 256 GM2-tones krijgen tags op basis van hun
GM2-instrumentfamilie (program number) plus naam-keywords.

Idempotent: schrijft het veld "tags" (comma-separated) in alle drie de
seed-kopieën. Draai opnieuw na het regenereren van de seed:

    python3 scripts/generate_tags.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED_PATHS = [
    os.path.join(ROOT, "data", "tones_seed.json"),
    os.path.join(ROOT, "backend", "src", "main", "resources", "data", "tones_seed.json"),
    os.path.join(ROOT, "frontend", "lib", "seed-fallback.json"),
]

TIMBRE = {
    "warm", "helder", "donker", "zacht", "percussief", "zwevend", "vintage",
    "synthetisch", "akoestisch", "metallic", "aards", "sprankelend",
}
CONTEXT = {
    "jazz", "klassiek", "kerk/gospel", "folk", "electronic", "ballad",
    "lo-fi", "wereldmuziek", "fx/cinematic",
}

# Handmatige tags voor de native LX708-tones, key = (category, subCategory) -> naam -> tags
NATIVE = {
    ("Piano", None): {
        "European Grand": ["akoestisch", "warm", "klassiek", "ballad"],
        "European v2": ["akoestisch", "warm", "klassiek"],
        "American Grand": ["akoestisch", "helder", "jazz", "ballad"],
        "American v2": ["akoestisch", "helder", "jazz"],
    },
    ("E. Piano", None): {
        "1976SuitCase": ["vintage", "warm", "jazz", "ballad"],
        "Tremolo EP": ["vintage", "zwevend", "warm", "ballad"],
        "Pop EP": ["helder", "sprankelend", "ballad"],
        "Vintage EP": ["vintage", "warm", "lo-fi"],
        "FM E.Piano": ["synthetisch", "helder", "electronic", "ballad"],
        "EP Belle": ["zacht", "sprankelend", "ballad"],
        "60's EP": ["vintage", "warm", "lo-fi"],
        "Clav.": ["percussief", "vintage", "jazz"],
        "Stage Phaser": ["vintage", "zwevend", "electronic"],
        "70's EP": ["vintage", "warm", "jazz"],
        "E.Grand": ["helder", "vintage", "ballad"],
    },
    ("Strings", None): {
        "SymphonicStr1": ["warm", "zwevend", "klassiek", "fx/cinematic"],
        "Epic Strings": ["zwevend", "klassiek", "fx/cinematic"],
        "Rich Strings": ["warm", "zwevend", "ballad"],
        "Orchestra Str": ["akoestisch", "klassiek"],
        "Orchestra": ["akoestisch", "klassiek", "fx/cinematic"],
        "Chamber Winds": ["zacht", "akoestisch", "klassiek"],
        "Harp": ["sprankelend", "zacht", "klassiek"],
        "Violin": ["akoestisch", "helder", "klassiek", "folk"],
        "Velo Strings": ["zwevend", "klassiek"],
        "Flute": ["zacht", "helder", "klassiek"],
        "Cello": ["warm", "donker", "klassiek"],
        "OrchestraBrs": ["helder", "klassiek", "fx/cinematic"],
        "Pizzicato Str": ["percussief", "klassiek"],
        "SymphonicStr2": ["warm", "zwevend", "klassiek"],
        "Soft Pad": ["zwevend", "zacht", "synthetisch", "electronic"],
        "Magical Piano": ["sprankelend", "zwevend", "fx/cinematic"],
        "Jazz Scat": ["vintage", "jazz"],
        "A.Bass+Cymbl": ["akoestisch", "donker", "jazz"],
    },
    ("Other", "Organ"): {
        "Pipe Organ": ["akoestisch", "kerk/gospel", "klassiek"],
        "Nason Flt 8'": ["zacht", "kerk/gospel", "klassiek"],
        "Combo Jz.Org": ["vintage", "jazz"],
        "Ballad Organ": ["warm", "ballad"],
        "ChurchOrgan1": ["akoestisch", "kerk/gospel", "klassiek"],
        "ChurchOrgan2": ["akoestisch", "kerk/gospel", "klassiek"],
        "Gospel Spin": ["vintage", "kerk/gospel"],
        "Full Stops": ["helder", "kerk/gospel", "klassiek"],
        "Mellow Bars": ["warm", "vintage", "jazz"],
        "Light Organ": ["zacht", "vintage", "jazz"],
        "Lower Organ": ["donker", "vintage", "jazz"],
        "60's Organ": ["vintage", "lo-fi"],
    },
    ("Other", "Upright"): {
        "Upright Piano": ["akoestisch", "warm", "folk"],
        "Mellow Upright": ["akoestisch", "zacht", "ballad"],
        "Bright Upright": ["akoestisch", "helder", "folk"],
        "Rock Piano": ["akoestisch", "helder", "percussief"],
        "Ragtime Piano": ["vintage", "lo-fi", "jazz"],
    },
    ("Other", "Classical"): {
        "Fortepiano": ["vintage", "akoestisch", "klassiek"],
        "Mellow Forte": ["vintage", "zacht", "klassiek"],
        "Bright Forte": ["vintage", "helder", "klassiek"],
        "Harpsichord": ["vintage", "sprankelend", "klassiek"],
        "Harpsi 8'+4'": ["vintage", "sprankelend", "klassiek"],
    },
    ("Other", "Do Re Mi"): {
        "Do Re Mi 1#": ["zacht", "zwevend"],
        "Do Re Mi 1b": ["zacht", "zwevend"],
        "Do Re Mi 2#": ["zacht", "zwevend"],
        "Do Re Mi 2b": ["zacht", "zwevend"],
    },
    ("Other", "Drums"): {
        "STANDARD Set": ["percussief"],
        "ROOM Set": ["percussief"],
        "POWER Set": ["percussief", "electronic"],
        "ELEC.Set": ["percussief", "synthetisch", "electronic"],
        "ANALOG Set": ["percussief", "synthetisch", "vintage", "electronic"],
        "JAZZ Set": ["percussief", "akoestisch", "jazz"],
        "BRUSH Set": ["percussief", "zacht", "akoestisch", "jazz"],
        "ORCH.Set": ["percussief", "akoestisch", "klassiek"],
        "SFX Set": ["percussief", "fx/cinematic"],
    },
}

# GM2-instrumentfamilies: (program-van, program-t/m) -> basis-tags
GM2_FAMILIES = [
    ((1, 4), ["akoestisch", "helder"]),          # piano's
    ((5, 6), ["vintage", "warm", "ballad"]),     # e-piano's
    ((7, 7), ["vintage", "sprankelend", "klassiek"]),  # klavecimbel
    ((8, 8), ["percussief", "vintage"]),         # clavinet
    ((9, 12), ["percussief", "sprankelend", "metallic"]),  # celesta/glock/musicbox/vibes
    ((13, 14), ["percussief", "aards", "akoestisch"]),     # marimba/xylofoon
    ((15, 15), ["metallic", "sprankelend", "kerk/gospel"]),  # buisklokken
    ((16, 16), ["sprankelend", "metallic", "wereldmuziek"]),  # santur
    ((17, 19), ["warm", "vintage"]),             # drawbar/perc/rock organ
    ((20, 20), ["akoestisch", "kerk/gospel", "klassiek"]),   # kerkorgel
    ((21, 21), ["zacht", "vintage", "folk"]),    # harmonium
    ((22, 22), ["warm", "akoestisch", "folk", "wereldmuziek"]),  # accordeon
    ((23, 23), ["warm", "akoestisch", "folk"]),  # mondharmonica
    ((24, 24), ["warm", "akoestisch", "wereldmuziek"]),  # bandoneon
    ((25, 26), ["akoestisch", "warm", "folk"]),  # akoestische gitaren
    ((27, 27), ["warm", "vintage", "jazz"]),     # jazzgitaar
    ((28, 29), ["helder", "percussief"]),        # clean/muted gitaar
    ((30, 31), ["metallic", "electronic"]),      # overdrive/distortion
    ((32, 32), ["metallic", "zwevend", "fx/cinematic"]),  # harmonics
    ((33, 33), ["akoestisch", "donker", "jazz"]),  # contrabas
    ((34, 36), ["warm", "donker"]),              # e-bassen
    ((37, 38), ["percussief", "donker"]),        # slap bass
    ((39, 40), ["synthetisch", "donker", "electronic"]),  # synth bass
    ((41, 44), ["akoestisch", "klassiek"]),      # strijkers solo
    ((45, 45), ["zwevend", "klassiek"]),         # tremolo strings
    ((46, 46), ["percussief", "klassiek"]),      # pizzicato
    ((47, 47), ["sprankelend", "zacht", "klassiek"]),  # harp
    ((48, 48), ["percussief", "donker", "klassiek"]),  # pauken
    ((49, 50), ["warm", "zwevend", "klassiek"]),  # strijkersensemble
    ((51, 52), ["synthetisch", "zwevend", "electronic"]),  # synth strings
    ((53, 54), ["zacht", "zwevend"]),            # koor/stem
    ((55, 55), ["synthetisch", "zwevend", "electronic"]),  # synth voice
    ((56, 56), ["percussief", "fx/cinematic"]),  # orchestra hit
    ((57, 59), ["helder", "klassiek"]),          # trompet/trombone/tuba
    ((60, 60), ["zacht", "jazz"]),               # mute trumpet
    ((61, 61), ["warm", "klassiek", "fx/cinematic"]),  # hoorn
    ((62, 62), ["helder", "jazz"]),              # brass section
    ((63, 64), ["synthetisch", "helder", "electronic"]),  # synth brass
    ((65, 68), ["warm", "jazz"]),                # saxen
    ((69, 71), ["warm", "akoestisch", "klassiek"]),  # hobo/althobo/fagot
    ((72, 72), ["warm", "akoestisch", "klassiek", "jazz"]),  # klarinet
    ((73, 74), ["zacht", "helder", "klassiek"]),  # piccolo/fluit
    ((75, 75), ["zacht", "akoestisch", "folk"]),  # blokfluit
    ((76, 76), ["zacht", "aards", "wereldmuziek"]),  # panfluit
    ((77, 77), ["zwevend", "zacht", "fx/cinematic"]),  # bottle blow
    ((78, 78), ["aards", "zacht", "wereldmuziek"]),  # shakuhachi
    ((79, 79), ["helder", "folk"]),              # fluiten (whistle)
    ((80, 80), ["zacht", "aards", "folk", "wereldmuziek"]),  # ocarina
    ((81, 88), ["synthetisch", "helder", "electronic"]),  # synth leads
    ((89, 96), ["synthetisch", "zwevend", "zacht", "electronic"]),  # pads
    ((97, 104), ["synthetisch", "zwevend", "electronic", "fx/cinematic"]),  # synth fx
    ((105, 112), ["akoestisch", "aards", "wereldmuziek"]),  # etnisch
    ((113, 119), ["percussief"]),                # percussie
    ((120, 120), ["zwevend", "metallic", "fx/cinematic"]),  # reverse cymbal
    ((121, 128), ["fx/cinematic"]),              # geluidseffecten
]

# Naam-keywords die GM2-familietags verfijnen (lowercase substring -> extra tags)
GM2_KEYWORDS = [
    ("honky-tonk", ["vintage", "lo-fi"]),
    ("detuned", ["lo-fi"]),
    ("60's", ["vintage", "lo-fi"]),
    ("vintage", ["vintage"]),
    ("fm ep", ["synthetisch"]),
    ("st.fm", ["synthetisch", "electronic"]),
    ("ep legend", ["synthetisch", "ballad"]),
    ("ep phaser", ["zwevend", "electronic"]),
    ("church", ["kerk/gospel"]),
    ("carillon", ["kerk/gospel"]),
    ("ukulele", ["folk", "wereldmuziek"]),
    ("mandolin", ["folk", "wereldmuziek"]),
    ("hawaiian", ["wereldmuziek", "vintage"]),
    ("12-str", ["sprankelend"]),
    ("nylon", ["zacht", "klassiek"]),
    ("funk", ["percussief"]),
    ("feedback", ["fx/cinematic"]),
    ("fretless", ["zacht", "jazz"]),
    ("slow", ["zacht", "ballad"]),
    ("dark", ["donker"]),
    ("bright", ["helder"]),
    ("yang qin", ["wereldmuziek"]),
    ("tr-808", ["vintage", "electronic"]),
    ("synth drum", ["synthetisch", "electronic"]),
    ("elec.perc", ["synthetisch", "electronic"]),
    ("taiko", ["aards", "wereldmuziek"]),
    ("concert bd", ["klassiek"]),
    ("melodic tom", ["electronic"]),
    ("steel drums", ["metallic", "wereldmuziek"]),
    ("agogo", ["metallic", "wereldmuziek"]),
    ("woodblock", ["aards", "wereldmuziek"]),
    ("castanets", ["aards", "wereldmuziek"]),
    ("tinkle bell", ["sprankelend", "metallic"]),
    ("timpani", ["klassiek"]),
    ("sine", ["zacht"]),
    ("analog", ["vintage"]),
    ("80's", ["vintage"]),
    ("itopia", ["zwevend"]),
    ("soundtrack", ["fx/cinematic"]),
    ("echo", ["zwevend"]),
    # geluidseffecten (program 121-128)
    ("seashore", ["zwevend"]),
    ("rain", ["zwevend"]),
    ("thunder", ["donker"]),
    ("wind", ["zwevend"]),
    ("stream", ["zwevend"]),
    ("bubble", ["zwevend"]),
    ("noise", ["percussief"]),
    ("applause", ["percussief"]),
    ("scratch", ["percussief", "lo-fi"]),
]


def gm2_tags(name: str, program: int) -> list[str]:
    tags: list[str] = []
    for (lo, hi), base in GM2_FAMILIES:
        if lo <= program <= hi:
            tags.extend(base)
            break
    lname = name.lower()
    for keyword, extra in GM2_KEYWORDS:
        if keyword in lname:
            tags.extend(extra)
    # dedupliceren met behoud van volgorde
    return list(dict.fromkeys(tags))


def tags_for(tone: dict) -> list[str]:
    key = (tone["category"], tone.get("subCategory"))
    if key in NATIVE:
        return NATIVE[key][tone["name"]]
    if key == ("Other", "GM2"):
        return gm2_tags(tone["name"], tone["midiProgram"])
    raise SystemExit(f"Geen tag-regel voor {key} / {tone['name']}")


def main() -> None:
    for path in SEED_PATHS:
        with open(path, encoding="utf-8") as f:
            seed = json.load(f)

        for tone in seed["tones"]:
            tags = tags_for(tone)
            unknown = [t for t in tags if t not in TIMBRE and t not in CONTEXT]
            if unknown:
                raise SystemExit(f"Onbekende tags {unknown} voor {tone['name']}")
            # geluidseffecten (GM2 program 121-128) mogen zonder timbre-tag
            is_sfx = tone.get("subCategory") == "GM2" and tone["midiProgram"] >= 121
            if not is_sfx and not any(t in TIMBRE for t in tags):
                raise SystemExit(f"Geen timbre-tag voor {tone['name']}: {tags}")
            if not tags:
                raise SystemExit(f"Geen tags voor {tone['name']}")
            tone["tags"] = ",".join(tags)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(seed, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"Tags gegenereerd in {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Merge data/midi_tone_map.json into the tone seed files.

De mapping (Bank Select MSB/LSB + Program Change per tone) komt uit de
officiële Roland LX708/LX706/LX705 MIDI Implementation v1.00, sectie
"4. Tone List". Draai dit script opnieuw na het regenereren van
data/tones_seed.json met generate_tones_seed.py:

    python3 scripts/apply_midi_mapping.py

Het werkt alle drie de kopieën bij:
  - data/tones_seed.json
  - backend/src/main/resources/data/tones_seed.json
  - frontend/lib/seed-fallback.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP_PATH = os.path.join(ROOT, "data", "midi_tone_map.json")
SEED_PATHS = [
    os.path.join(ROOT, "data", "tones_seed.json"),
    os.path.join(ROOT, "backend", "src", "main", "resources", "data", "tones_seed.json"),
    os.path.join(ROOT, "frontend", "lib", "seed-fallback.json"),
]


def main() -> None:
    with open(MAP_PATH, encoding="utf-8") as f:
        mapping = json.load(f)

    by_key = {}
    for row in mapping["tones"]:
        key = (row["category"], row["subCategory"], row["toneNumber"])
        by_key[key] = row
    assert len(by_key) == 324, f"verwachtte 324 unieke tones, kreeg {len(by_key)}"

    for path in SEED_PATHS:
        with open(path, encoding="utf-8") as f:
            seed = json.load(f)

        for tone in seed["tones"]:
            key = (tone["category"], tone.get("subCategory"), tone["toneNumber"])
            row = by_key[key]
            if row["name"] != tone["name"]:
                raise SystemExit(
                    f"Naam-mismatch voor {key}: seed='{tone['name']}' vs MIDI-doc='{row['name']}'"
                )
            tone["midiBankMsb"] = row["midiBankMsb"]
            tone["midiBankLsb"] = row["midiBankLsb"]
            tone["midiProgram"] = row["midiProgram"]

        with open(path, "w", encoding="utf-8") as f:
            json.dump(seed, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"MIDI-mapping toegepast op {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main()

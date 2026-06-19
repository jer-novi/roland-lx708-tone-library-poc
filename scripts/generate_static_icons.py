#!/usr/bin/env python3
"""Genereert statische SVG-iconen voor tonen zonder enige foto-bron.

GM2-sound-effects (Thunder, Explosion, ...) en de Do Re Mi-demotonen
hebben geen Wikipedia-afbeelding en geen museum-object; voor die tonen
genereren we een emoji-icoon op een donkere achtergrond die bij het
app-thema past. `StaticIconThumbnailSource` (backend) leest de hier
geschreven `mapping.json` en serveert de SVG's als laatste trede van de
thumbnail-ladder — een échte foto wint dus altijd.

Output: backend/src/main/resources/data/static-icons/{slug}.svg + mapping.json
Idempotent: bestaande bestanden worden gewoon overschreven.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "backend" / "src" / "main" / "resources" / "data" / "static-icons"

# wikipediaPageTitle -> emoji. De acht bovenste zijn de tonen die na de
# MIMO-uitbreiding nog geen afbeelding hadden; de rest is vangnet voor
# FX-titels die nu een wiki/MIMO-foto hebben maar die kunnen wegvallen.
BY_WIKI_TITLE = {
    "Scat singing": "🎤",
    "Ocean": "🌊",
    "Thunder": "⛈️",
    "Stream": "💧",
    "Bubble": "🫧",
    "Explosion": "💥",
    "Scream": "😱",
    "Punch": "👊",
    # vangnet
    "Applause": "👏",
    "Bird vocalization": "🐦",
    "Breath": "🌬️",
    "Car": "🚗",
    "Dog": "🐕",
    "Gunshot": "🔫",
    "Heart": "💓",
    "Helicopter": "🚁",
    "Human voice": "🗣️",
    "Jet aircraft": "✈️",
    "Laser": "✨",
    "Laughter": "😂",
    "Machine gun": "🔫",
    "Siren": "🚨",
    "Sound effect": "🎚️",
    "Spacecraft": "🚀",
    "Telephone": "📞",
    "Train": "🚂",
    "Wind": "🌬️",
}

# tone.name-prefix -> emoji, voor tonen zonder wikipediaPageTitle.
BY_NAME_PREFIX = {
    "Do Re Mi": "🎼",
}

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#3a2f1f"/>
      <stop offset="100%" stop-color="#16120c"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="278" font-size="240" text-anchor="middle"
        dominant-baseline="middle">{emoji}</text>
</svg>
"""


def slugify(key: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", key.lower()).strip("-")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    mapping = {"byWikiTitle": {}, "byNamePrefix": {}}
    written = set()
    for section, table in (("byWikiTitle", BY_WIKI_TITLE), ("byNamePrefix", BY_NAME_PREFIX)):
        for key, emoji in table.items():
            slug = slugify(key)
            filename = f"{slug}.svg"
            if filename not in written:
                (OUTPUT_DIR / filename).write_text(
                    SVG_TEMPLATE.format(emoji=emoji), encoding="utf-8")
                written.add(filename)
            mapping[section][key] = filename
    (OUTPUT_DIR / "mapping.json").write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(written)} SVG's + mapping.json geschreven naar {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

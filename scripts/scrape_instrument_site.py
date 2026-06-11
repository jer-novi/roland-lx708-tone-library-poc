"""
Scrape allthemusicalinstrumentsoftheworld.com en bouw een mapping
{instrument_name -> {source_url, image_url, ...}} op per detail-pagina.

Output: data/instrument_site_mapping.json

We scrapen /index.php?page=Moredetailsaboutinstruments&letter={A..Z} (26 calls)
en parsen de heading-metadata. Per instrument op die pagina is de eerste
afbeelding (inline in de heading h2/h3) onze 'hoofdafbeelding' voor de
ToneCard; de tweede (in de paragraaf eronder) is de 'detail'-versie.

Geen hotlinking: dit script downloadt niets, het schrijft alleen URLs naar
een JSON. De download gebeurt door download_instrument_images.py.
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

import requests

BASE = "https://www.allthemusicalinstrumentsoftheworld.com"
DETAIL_URL = f"{BASE}/index.php?page=Moredetailsaboutinstruments&letter={{letter}}"
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "instrument_site_mapping.json"

# Polite crawl: 1 request per 1.5s zodat we hun kleine server niet belasten.
REQUEST_DELAY_SECONDS = 1.5
USER_AGENT = (
    "RolandLX708ToneLibraryScraper/0.1 "
    "(https://github.com/jer-novi/roland-lx708-tone-library-poc; persoonlijk gebruik)"
)


class DetailPageParser(HTMLParser):
    """Parseert één detail-pagina en geeft een lijst instrumenten terug.

    Werkelijke HTML-structuur (geverifieerd via curl op letter=V):
      <tr>
        <td colspan="3">
          <h1 style="...">
            <img src=".../thumb-X.jpg" height="30" width="30"> InstrumentNaam
          </h1>
        </td>
      </tr>
      <tr>
        <td valign="top" align="center" width="320">
          <img src=".../thumb-Y.jpg" align="center">
          <p>...</p>
        </td>
        <td valign="top" width="320">
          <img src=".../thumb-Z.jpg" align="center">
        </td>
        <td>...</td>
      </tr>

    We volgen het h1-element en pakken de eerste <img> in de heading als
    'header_image'. De <img>'s in de cellen van de daaropvolgende rij
    zijn de 'instruments being played'-variant. We slaan de eerste
    daarvan op als 'play_image' (handig als header_image ontbreekt).
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_h1 = False
        self.h1_text: list[str] = []
        self.h1_image: str | None = None
        # Na sluiten van h1 verwachten we <tr>...<td><img>...</td>...</tr>
        # waarin we de eerste <img> in een <td> als play_image opvangen.
        self.in_td_after_h1 = False
        self.play_image_pending: str | None = None
        # Output
        self.instruments: list[dict] = []
        # Counter: we sluiten de h1 pas af als we een <tr> zien OF
        # als er een nieuwe h1 begint.
        self._h1_open = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        if tag == "h1" and not self._h1_open:
            self._h1_open = True
            self.in_h1 = True
            self.h1_text = []
            self.h1_image = None
            return
        if tag == "img" and self.in_h1 and self.h1_image is None:
            self.h1_image = attr.get("src")
            return
        # Detecteer de rij met de detail-images: een <tr> direct ná een h1.
        if tag == "tr" and self._h1_open and not self.in_h1:
            self.in_td_after_h1 = True
            self.play_image_pending = None
            return
        if tag == "td" and self.in_td_after_h1 and self.play_image_pending is None:
            # We gaan nu kijken of er een <img> in deze <td> staat.
            self._td_started = True
            return
        if tag == "img" and self.in_td_after_h1 and self.play_image_pending is None:
            src = attr.get("src")
            if src and "ourbusinesses" in src:
                self.play_image_pending = src
            return

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1":
            # Sluit de h1 af. De `in_h1` check zorgt dat we alleen de
            # h1 accepteren waar we nu in zitten; we laten `_h1_open` pas
            # los bij de eerstvolgende <tr>, zodat we play_images kunnen
            # koppelen aan de juiste heading.
            if self.in_h1:
                name = "".join(self.h1_text).strip()
                name = re.sub(r"\s+", " ", name).strip("[] \t\r\n")
                if name:
                    self.instruments.append({
                        "name": name,
                        "header_image": self.h1_image,
                        "play_image": None,  # ingevuld bij eerstvolgende </tr>
                    })
                self.in_h1 = False
                self.h1_text = []
                self.h1_image = None
            return
        if tag == "tr":
            if self.in_td_after_h1:
                if self.play_image_pending and self.instruments and self.instruments[-1]["play_image"] is None:
                    self.instruments[-1]["play_image"] = self.play_image_pending
                self.in_td_after_h1 = False
                self.play_image_pending = None
                # Nu de h1-rij definitief afgesloten is.
                self._h1_open = False
            return

    def handle_data(self, data: str) -> None:
        if self.in_h1:
            self.h1_text.append(data)


def normalize_name(name: str) -> str:
    """Vergelijk-sleutel: lowercase, geaccentueerde letters strippen,
    interpunctie enkelvoudige spatie, en trim."""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_only = ascii_only.lower()
    # Verwijder alles wat geen letter/cijfer/spatie is, spaties normaliseren.
    ascii_only = re.sub(r"[^a-z0-9\s]", " ", ascii_only)
    return re.sub(r"\s+", " ", ascii_only).strip()


def fetch_letter(letter: str) -> list[dict]:
    url = DETAIL_URL.format(letter=letter)
    print(f"  GET {url}", file=sys.stderr)
    resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=20)
    resp.raise_for_status()
    parser = DetailPageParser()
    parser.feed(resp.text)
    return parser.instruments


def main() -> int:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    all_instruments: dict[str, dict] = {}
    for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        try:
            items = fetch_letter(letter)
        except Exception as e:
            print(f"!! letter {letter} failed: {e}", file=sys.stderr)
            continue
        for item in items:
            name = item.get("name")
            if not name:
                continue
            key = normalize_name(name)
            if not key:
                continue
            # Bepaal primaire image: header heeft voorrang, anders play_image.
            primary = item.get("header_image") or item.get("play_image")
            if not primary:
                continue
            if key in all_instruments:
                # Bestaat al — update alleen als we een header-image hebben
                # (beter dan play_image).
                if item.get("header_image"):
                    all_instruments[key] = {
                        "name": name,
                        "header_image": item["header_image"],
                        "play_image": item.get("play_image"),
                    }
                continue
            all_instruments[key] = {
                "name": name,
                "header_image": item.get("header_image"),
                "play_image": item.get("play_image"),
            }
        time.sleep(REQUEST_DELAY_SECONDS)

    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(all_instruments, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(all_instruments)} instruments to {OUTPUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

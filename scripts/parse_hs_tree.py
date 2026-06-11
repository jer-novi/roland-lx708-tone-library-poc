"""
Parse de Firecrawl-scrape van allthemusicalinstrumentsoftheworld.com/Classification
naar data/horn_bostel_sachs_tree.json — een schone, machineleesbare
representatie van de Hornbostel-Sachs-taxonomie.

Input: het ruwe .md-bestand dat door Firecrawl is opgeslagen, OF — als dat
niet aanwezig is — de JSON-wrapper die Firecrawl produceert (de markdown
zit dan in JSON["markdown"] als escaped string).

Output: data/horn_bostel_sachs_tree.json met:
  {
    "source": "...",
    "scraped_at": "ISO8601",
    "families": [
      { "hs_code": "1", "name": "Idiophones", "description": "...",
        "subfamilies": [ { "hs_code": "11", "name": "Struck Idiophones",
                           "subfamilies": [...], "instruments": [...] }, ... ] },
      ...
    ],
    "all_instruments": [ { "hs_code", "name", "instrument_id" }, ... ],
    "stats": { "total_instruments": 350, ... }
  }

Het script is idempotent: herhaaldelijk draaien overschrijft het output-bestand.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FIRECRAWL_OUTPUT = Path(r"C:\Users\J_vdz\.local\share\opencode\tool-output\tool_eb75645fc001mSl3yPquGOgBOU")
OUTPUT = REPO_ROOT / "data" / "horn_bostel_sachs_tree.json"

# Identificeert een H-S section-heading. De dot is escaped in de bron
# (letterlijk `\.`). We schrijven `\\\.` om één letterlijke backslash + één
# letterlijke dot te matchen. De HS-code is een reeks cijfers gescheiden
# door escaped dots. We gebruiken een greedy `\d+` gevolgd door 0+ `\.digit`
# blokken. Let op: `\d+(?:\\\.\d+)*\\\.\s+` werkt wél, maar
# `\d+(?:\\\.\d+)*\.?\s+` niet — Python's regex engine doet dan
# te veel backtracking. Daarom maken we `\\\.\s+` verplicht.
# Identificeert een H-S section-heading. De dot is escaped in de bron
# (letterlijk `\.`). We schrijven `\\\.` om één letterlijke backslash + één
# letterlijke dot te matchen. De HS-code is een reeks cijfers gescheiden
# door escaped dots. We gebruiken een greedy `\d+` gevolgd door 0+ `\.digit`
# blokken. Let op: `\d+(?:\\\.\d+)*\\\.\s+` werkt wél, maar
# `\d+(?:\\\.\d+)*\.?\s+` niet — Python's regex engine doet dan
# te veel backtracking. Daarom maken we `\\\.\s+` verplicht.
HEADING_RE = re.compile(
    r"^(#{1,3})\s+(\d+(?:\\\.\d+)*)\\\.\s+(.+?)\s*$"
)

# HS-code line: "111.11", "421.221.312", "321.22-71", "141", "5"
# Dots zijn NIET escaped in de data (alleen in headings).
HS_CODE_RE = re.compile(r"^(\d+(?:\.\d+)+(?:-\d+)?|\d{1,3})$")

# Pseudo-H4 bold sub-categories: "**111.21. Percussion bars and sticks**"
# (deze zijn sub-groeperingen, géén instrumenten)
BOLD_SUBCATEGORY_RE = re.compile(r"^\*\*(\d+(?:\.\d+)+)(?:-(\d+))?\.\s.+\*\*$")

# Instrument block (5 regels in de markdown). Tussen image-URL en naam staan
# precies 2 backslashes + 2 newlines (zie de character-analyse van het
# Firecrawl-bestand). We gebruiken r"\\\n" (raw string) wat 1 backslash +
# newline matcht in de source-string (raw string interpretatie: \\ = 2 chars
# in de bron, regex-compiler: 1 backslash + escape voor "n"... wacht, na
# JSON-unescape zijn de \\n literals al naar newlines omgezet. Dus in de
# uiteindelijke bron-string staat letterlijk:
#   ...)\<NL>\<NL>Naam
# We matchen dus letterlijk `\<NL>\<NL>`.
INSTRUMENT_BLOCK_PATTERN = (
    r"\[!\[[^\]]*\]\((?P<image>[^)]+)\)"  # image-tag + sluithaakje
    + r"\\\n"                              # 1 backslash + newline
    + r"\\\n"                              # 1 backslash + newline
    + r"\s*(?P<name>[^\]]+)\]\("           # naam en link-open
    + r"(?P<detail_url>[^)]+instrumentID=(?P<id>\d+))" + "\\)"
    + r"\s*(?P<code>\d+(?:\.\d+)+(?:-\d+)?|\d{1,3})"
)
INSTRUMENT_BLOCK_RE = re.compile(INSTRUMENT_BLOCK_PATTERN, re.DOTALL)


def load_markdown() -> str:
    """Laad de markdown van de Firecrawl-scrape. Ondersteunt zowel ruwe
    .md-bestanden als de JSON-wrapper die Firecrawl produceert."""
    candidates = [
        DEFAULT_FIRECRAWL_OUTPUT,
        REPO_ROOT / "data" / "firecrawl_classification.md",
    ]
    for p in candidates:
        if not p.exists():
            continue
        text = p.read_text(encoding="utf-8")
        if text.lstrip().startswith("{"):
            try:
                wrapper = json.loads(text)
                if "markdown" in wrapper:
                    md = wrapper["markdown"]
                    # Unescape literal \n in de JSON string
                    return md.replace("\\n", "\n").replace("\\\\", "\\")
            except json.JSONDecodeError:
                pass
        return text
    print("Geen Firecrawl-output gevonden in verwachte paden.", file=sys.stderr)
    print(f"Verwacht: {DEFAULT_FIRECRAWL_OUTPUT}", file=sys.stderr)
    print("Of hernoem je Firecrawl-output naar data/firecrawl_classification.md", file=sys.stderr)
    sys.exit(1)


def slugify(name: str) -> str:
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(c for c in nfkd if not unicodedata.combining(c))
    ascii_only = ascii_only.lower()
    ascii_only = re.sub(r"[^a-z0-9\s-]", "", ascii_only)
    return re.sub(r"\s+", "-", ascii_only).strip("-")


def split_md_to_lines(md: str) -> list[str]:
    # Sommige Firecrawl-versies produceren al echte newlines, andere
    # escape de \n. We zijn hier al ont-escaped, dus gewone split.
    return md.splitlines()


def parse_headings_and_blocks(md: str) -> tuple[list[dict], list[dict]]:
    """Retourneert (headings, instrument_blocks) op volgorde van voorkomen.
    headings: [{level, hs_code, name, line_no}, ...]
    instrument_blocks: [{hs_code, name, instrument_id, image_url, line_no}, ...]
    """
    lines = split_md_to_lines(md)
    headings: list[dict] = []
    instruments: list[dict] = []

    for i, raw_line in enumerate(lines, 1):
        line = raw_line.rstrip()
        # Headings (H1, H2, H3)
        m = HEADING_RE.match(line)
        if m:
            level = len(m.group(1))
            hs_code_raw = m.group(2).replace("\\.", ".")
            # H1 zoals "1. Idiophones" of "5. Electrophones" — naam is
            # alles na het eerste punt+spatie.
            rest = m.group(3)
            headings.append({
                "level": level,
                "hs_code": hs_code_raw,
                "name": rest.strip(),
                "line_no": i,
            })
            continue

    # Tweede pass: blok-detectie over de oorspronkelijke tekst (niet
    # per regel) want de blokstructuur is multiline.
    for m in INSTRUMENT_BLOCK_RE.finditer(md):
        image_url = m.group("image")
        name = m.group("name").strip()
        url = m.group("detail_url")
        instrument_id = int(m.group("id"))
        code = m.group("code")
        # Vind de startregel
        line_no = md[: m.start()].count("\n") + 1
        instruments.append({
            "hs_code": code,
            "name": name,
            "instrument_id": instrument_id,
            "image_url": image_url,
            "detail_url": url,
            "line_no": line_no,
        })

    return headings, instruments


def attach_instruments_to_headings(headings: list[dict], instruments: list[dict]) -> dict:
    """Bouw een hierarchische tree waarbij elk H2/H3 zijn eigen instrumenten
    bevat. H1 met alleen een H2-container (zoals 11. Struck Idiophones)
    toont zelf geen instrumenten — de H3-kinderen krijgen die. H1 die
    GEEN H2/H3 kinderen heeft (zoals 5. Electrophones) krijgt de
    instrumenten direct. Pseudo-H4 bold sub-categories worden gefilterd."""
    # Filter pseudo-H4
    real_instruments = []
    for inst in instruments:
        if BOLD_SUBCATEGORY_RE.match(inst["name"]):
            continue
        real_instruments.append(inst)

    # Initialiseer H1, H2, H3 nodes
    for h in headings:
        h["instruments"] = []
        h["subfamilies"] = []

    # Bouw parent-child relaties
    for h in headings:
        if h["level"] == 2:
            parent = None
            for h1 in [x for x in headings if x["level"] == 1 and x["line_no"] <= h["line_no"]]:
                if parent is None or h1["line_no"] > parent["line_no"]:
                    parent = h1
            if parent is not None:
                parent["subfamilies"].append(h)
        elif h["level"] == 3:
            parent = None
            for h2 in [x for x in headings if x["level"] == 2 and x["line_no"] <= h["line_no"]]:
                if parent is None or h2["line_no"] > parent["line_no"]:
                    parent = h2
            if parent is not None:
                parent["subfamilies"].append(h)

    # Wijs elk instrument toe aan de diepste section die
    # startlijn <= instrument.line_no. Als er alleen H1 is zonder
    # H2/H3-kinderen, gaat het instrument direct naar de H1.
    sorted_sections = sorted(headings, key=lambda h: (h["line_no"], -h["level"]))
    for inst in real_instruments:
        assigned = None
        for sec in sorted_sections:
            if sec["line_no"] <= inst["line_no"]:
                # Skip "container"-H1 (zoals "11. Struck Idiophones")
                # als het kinderen heeft — het instrument hoort dan bij
                # een H3-kind, niet bij de H2.
                if sec["level"] == 2 and sec.get("subfamilies"):
                    continue
                if sec["level"] == 1 and sec.get("subfamilies"):
                    # Heeft H2-kinderen, maar die hebben geen kinderen.
                    # Dat is H1 met directe H2's — laat H2 het oppakken.
                    continue
                assigned = sec
        if assigned is not None:
            assigned["instruments"].append(inst)

    # Verwijder interne hulplinks en normaliseer output
    for h in headings:
        h.pop("line_no", None)
        h["instrument_count"] = len(h.get("instruments", []))
        h["instruments"] = [
            {k: v for k, v in i.items() if k != "line_no"} for i in h["instruments"]
        ]

    return {
        "families": [h for h in headings if h["level"] == 1],
        "all_instruments": real_instruments,
    }


def add_descriptions(heads: list[dict], md: str) -> None:
    """Voor elke H1-section: pak de paragraaf direct na de heading
    (de description). Voor H2/H3 is de description impliciet in de
    bovenliggende hiërarchie, we laten die leeg tenzij expliciet aanwezig."""
    lines = split_md_to_lines(md)
    # We herbouwen een line_no -> tekst map
    for h in [x for x in heads if x["level"] == 1]:
        # Zoek de heading-line in lines en pak de eerstvolgende niet-lege
        # regel die geen heading is en niet begint met [!
        pass  # zou via dezelfde pass kunnen, voor nu slaan we over — we
              # halen descriptions op uit de oorspronkelijke lijst die
              # al bekend is uit het explore-rapport.


# Bekende descriptions uit het explore-rapport.
# Worden in de tree ingevoegd op de H1-nodes; de bron is verbatim
# van de allthemusicalinstrumentsoftheworld.com-pagina.
H1_DESCRIPTIONS = {
    "1": "Idiophones are instruments which make sound primarily by way of the instrument itself vibrating without the use of membranes or strings.",
    "2": "Membranophones are instruments which make sound primarily by way of a vibrating membrane. This includes all drums.",
    "3": "Chordophones are instruments that produce sound primarily by the vibration of a string or strings.",
    "4": "Aerophones are instruments in which the vibrating air itself is the primary cause of sound. This can include a column of air being set in vibration (as in wind instruments) or an air-flow being interrupted by an edge (as in free-reeds).",
    "5": "Electrophones are instruments in which sound is generated by electrical means. While it is not officially in any published form of the Hornbostel-Sachs system, and hence, lacking proper numerical subdivisions, it is often considered a fifth main category.",
}


def main() -> int:
    md = load_markdown()
    headings, instruments = parse_headings_and_blocks(md)
    tree = attach_instruments_to_headings(headings, instruments)

    # Inject beschrijvingen
    for fam in tree["families"]:
        fam["description"] = H1_DESCRIPTIONS.get(fam["hs_code"], "")

    # Voeg slugs toe (handig voor frontend URL-fragmenten)
    for fam in tree["families"]:
        fam["slug"] = slugify(fam["name"])
        for h2 in fam.get("subfamilies", []):
            h2["slug"] = slugify(h2["name"])
            for h3 in h2.get("subfamilies", []):
                h3["slug"] = slugify(h3["name"])

    # Statistieken
    stats = {
        "total_families": len(tree["families"]),
        "total_subfamilies": sum(len(f.get("subfamilies", [])) for f in tree["families"]),
        "total_subsubfamilies": sum(
            len(h2.get("subfamilies", []))
            for f in tree["families"] for h2 in f.get("subfamilies", [])
        ),
        "total_instruments": len(tree["all_instruments"]),
        "unique_hs_codes": len({i["hs_code"] for i in tree["all_instruments"]}),
    }

    output_doc = {
        "source": "https://www.allthemusicalinstrumentsoftheworld.com/index.php?page=ClassificationofMusicalInstruments",
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "stats": stats,
        "families": tree["families"],
        "all_instruments": tree["all_instruments"],
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output_doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Written {OUTPUT}", file=sys.stderr)
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

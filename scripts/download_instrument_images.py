"""
Download de gematchte instrument-images uit data/instrument_image_matches.json
naar data/instrument-images/{key}.jpg, waar {key} == "{category}|{toneNumber}".

Schrijft ook data/instrument-images.json als sidecar met {key: {width, height}}
zodat de backend de dimensies kan lezen zonder ImageIO aan te roepen
(handig in headless JRE containers).

Idempotent: bestaande files worden niet opnieuw gedownload.

Opslag: data/instrument-images/ (in de Git repo, ~1-2MB totaal).
De docker-compose mount kan deze map ook in de container zetten zodat
de backend ze meteen vindt. Voor de frontend geldt: de backend serveert
ze via een nieuwe /api/instrument-images/{key} endpoint.
"""
from __future__ import annotations

import hashlib
import json
import struct
import sys
import time
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
MATCHES_PATH = REPO_ROOT / "data" / "instrument_image_matches.json"
# Eén single source of truth: backend/src/main/resources/data/instrument-images.
# De Dockerfile COPY't deze map in de runtime-image. We houden ook een
# sync naar /data/instrument-images/ zodat de bestanden lokaal bekeken
# kunnen worden zonder de backend te starten.
OUTPUT_DIR = REPO_ROOT / "backend" / "src" / "main" / "resources" / "data" / "instrument-images"
SYNC_DIR = REPO_ROOT / "data" / "instrument-images"
SIDECAR_PATH = OUTPUT_DIR / "dimensions.json"

SITE_BASE = "https://www.allthemusicalinstrumentsoftheworld.com"
REQUEST_DELAY_SECONDS = 0.4
USER_AGENT = (
    "RolandLX708ToneLibraryScraper/0.1 "
    "(https://github.com/jer-novi/roland-lx708-tone-library-poc; persoonlijk gebruik)"
)


def safe_filename(key: str) -> str:
    return key.replace("|", "__").replace("/", "_") + ".jpg"


def jpeg_dimensions(path: Path) -> tuple[int, int]:
    """Leest de breedte/hoogte uit een JPEG zonder de hele file te decoderen.
    Ondersteunt baseline (SOF0) en progressive (SOF2) JPEG, wat de site
    allemaal levert."""
    with path.open("rb") as f:
        data = f.read(64_000)  # genoeg voor de meeste headers
    i = 0
    while i < len(data) - 1:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        # SOF0 = 0xC0, SOF2 = 0xC2 (skip andere SOFn want ongebruikelijk)
        if marker in (0xC0, 0xC2):
            # Lengte (2), precision (1), height (2), width (2)
            height = struct.unpack(">H", data[i + 5:i + 7])[0]
            width = struct.unpack(">H", data[i + 7:i + 9])[0]
            return width, height
        i += 1
    return 0, 0


def main() -> int:
    matches = json.load(MATCHES_PATH.open(encoding="utf-8"))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    todo: list[tuple[str, str]] = []
    for key, info in matches.items():
        target = OUTPUT_DIR / safe_filename(key)
        if target.exists() and target.stat().st_size > 0:
            continue
        todo.append((key, info["image_url"]))

    print(f"{len(matches)} total matches, {len(todo)} to download", file=sys.stderr)

    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    ok = 0
    failed: list[tuple[str, str, str]] = []
    dimensions: dict[str, dict] = {}
    if SIDECAR_PATH.exists():
        try:
            dimensions = json.load(SIDECAR_PATH.open(encoding="utf-8"))
        except Exception:
            dimensions = {}

    for i, (key, url) in enumerate(todo, 1):
        target = OUTPUT_DIR / safe_filename(key)
        try:
            r = session.get(url, timeout=20)
            r.raise_for_status()
            target.write_bytes(r.content)
            w, h = jpeg_dimensions(target)
            dimensions[key] = {"width": w, "height": h, "site_name": matches[key].get("site_name")}
            ok += 1
        except Exception as e:
            failed.append((key, url, str(e)))
        if i % 25 == 0:
            # Periodiek wegschrijven zodat een crash niet alles verliest.
            SIDECAR_PATH.write_text(json.dumps(dimensions, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  {i}/{len(todo)} downloaded", file=sys.stderr)
        time.sleep(REQUEST_DELAY_SECONDS)

    # Ook voor files die we NIET opnieuw downloaden, dimensies in sidecar zetten.
    for key in matches:
        if key in dimensions:
            continue
        target = OUTPUT_DIR / safe_filename(key)
        if not target.exists() or target.stat().st_size == 0:
            continue
        w, h = jpeg_dimensions(target)
        dimensions[key] = {"width": w, "height": h, "site_name": matches[key].get("site_name")}

    SIDECAR_PATH.write_text(json.dumps(dimensions, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Downloaded {ok}/{len(todo)}", file=sys.stderr)
    if failed:
        print(f"Failed ({len(failed)}):", file=sys.stderr)
        for k, u, err in failed[:10]:
            print(f"  {k}: {u} -> {err}", file=sys.stderr)
    total_bytes = sum(p.stat().st_size for p in OUTPUT_DIR.glob("*.jpg"))
    print(f"Total size on disk: {total_bytes/1024:.1f} KB across {len(list(OUTPUT_DIR.glob('*.jpg')))} files", file=sys.stderr)

    # Sync naar de top-level data/ map zodat ontwikkelaars de images direct
    # kunnen inspecteren zonder in de backend map te kijken.
    SYNC_DIR.mkdir(parents=True, exist_ok=True)
    for f in OUTPUT_DIR.glob("*.jpg"):
        target = SYNC_DIR / f.name
        if not target.exists() or target.stat().st_size != f.stat().st_size:
            target.write_bytes(f.read_bytes())
    if SIDECAR_PATH.exists():
        sync_sidecar = SYNC_DIR / "dimensions.json"
        if not sync_sidecar.exists() or sync_sidecar.stat().st_size != SIDECAR_PATH.stat().st_size:
            sync_sidecar.write_bytes(SIDECAR_PATH.read_bytes())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

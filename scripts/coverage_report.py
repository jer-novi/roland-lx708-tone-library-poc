#!/usr/bin/env python3
"""Baseline-inventarisatie van de image/summary-coverage voor alle 324 tonen.

Verzamelt per tone:
  - SD-thumbnail (URL, bron, opgeslagen breedte/hoogte, werkelijke pixels)
  - HD-thumbnail (idem)
  - mimo_url
  - summary-lengte + of de shortSummary uniek is

en schrijft het resultaat naar data/coverage_report.json zodat we voor en
na elke Fase 4-fix dezelfde meting kunnen doen.

Vereist: draaiende stack (deploy/docker-compose.yml) en Docker CLI.
Gebruik: python scripts/coverage_report.py
"""

from __future__ import annotations

import json
import struct
import subprocess
import sys
import tempfile
import urllib.request
from collections import Counter
from pathlib import Path

API_URL = "http://localhost:8080"
REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = REPO_ROOT / "data" / "coverage_report.json"

# (db-container, api-container, db-naam, db-user) per compose-stack;
# de eerste waarvan de db-container draait wint.
STACKS = [
    ("tone-library-dev-full-db-1", "tone-library-dev-full-api-1",
     "pianosounds_dev", "pianosounds_dev_user"),
    ("tone-library-prod-db-1", "tone-library-prod-api-1",
     "pianosounds", "pianosounds_user"),
    ("deploy-db-1", "deploy-api-1", "pianosounds", "pianosounds_user"),
]


def detect_stack() -> tuple[str, str, str, str]:
    running = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True, text=True, check=True,
    ).stdout.split()
    for stack in STACKS:
        if stack[0] in running:
            return stack
    raise SystemExit(f"Geen bekende db-container actief (gezocht: "
                     f"{[s[0] for s in STACKS]})")


def image_dimensions(path: Path) -> tuple[int, int] | None:
    """Pure-Python pixel-dimensies voor JPEG/PNG/WebP (geen Pillow nodig)."""
    try:
        data = path.read_bytes()
    except OSError:
        return None
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack(">II", data[16:24])
        return w, h
    if data[:2] == b"\xff\xd8":  # JPEG: zoek SOF-marker
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                return w, h
            seg_len = struct.unpack(">H", data[i + 2 : i + 4])[0]
            i += 2 + seg_len
        return None
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        fmt = data[12:16]
        if fmt == b"VP8X":
            w = int.from_bytes(data[24:27], "little") + 1
            h = int.from_bytes(data[27:30], "little") + 1
            return w, h
        if fmt == b"VP8 ":
            w = struct.unpack("<H", data[26:28])[0] & 0x3FFF
            h = struct.unpack("<H", data[28:30])[0] & 0x3FFF
            return w, h
        if fmt == b"VP8L":
            bits = int.from_bytes(data[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    return None


def fetch_tones() -> list[dict]:
    with urllib.request.urlopen(f"{API_URL}/api/tones", timeout=30) as resp:
        return json.load(resp)


def fetch_wiki_data(db_container: str, db_name: str, db_user: str) -> dict[int, dict]:
    """wiki_data per tone_id, rechtstreeks uit Postgres (geen fetch-side-effects)."""
    sql = (
        "SELECT tone_id, thumbnail_path, thumbnail_source, thumbnail_width,"
        " thumbnail_hd_path, thumbnail_hd_source, thumbnail_hd_width,"
        " mimo_url, coalesce(length(summary), 0) FROM wiki_data"
    )
    out = subprocess.run(
        ["docker", "exec", db_container, "psql", "-U", db_user,
         "-d", db_name, "-A", "-t", "-F", "\t", "-c", sql],
        capture_output=True, text=True, check=True,
    ).stdout
    rows: dict[int, dict] = {}
    for line in out.strip().splitlines():
        cols = line.split("\t")
        rows[int(cols[0])] = {
            "thumbnail_path": cols[1] or None,
            "thumbnail_source": cols[2] or None,
            "thumbnail_width": int(cols[3]) if cols[3] else None,
            "thumbnail_hd_path": cols[4] or None,
            "thumbnail_hd_source": cols[5] or None,
            "thumbnail_hd_width": int(cols[6]) if cols[6] else None,
            "mimo_url": cols[7] or None,
            "summary_length": int(cols[8]),
        }
    return rows


def copy_thumbs(tmp: Path, api_container: str) -> tuple[Path, Path]:
    sd_dir, hd_dir = tmp / "sd", tmp / "hd"
    for src, dst in ((f"{api_container}:/var/data/wiki-thumbs", sd_dir),
                     (f"{api_container}:/var/data/wiki-thumbs-hd", hd_dir)):
        subprocess.run(["docker", "cp", src, str(dst)],
                       capture_output=True, check=True)
    return sd_dir, hd_dir


def main() -> None:
    db_container, api_container, db_name, db_user = detect_stack()
    print(f"Stack: {api_container} / {db_container} ({db_name})")
    tones = fetch_tones()
    wiki = fetch_wiki_data(db_container, db_name, db_user)
    with tempfile.TemporaryDirectory() as tmp:
        sd_dir, hd_dir = copy_thumbs(Path(tmp), api_container)
        sd_dims = {p.name: image_dimensions(p) for p in sd_dir.iterdir()}
        hd_dims = {p.name: image_dimensions(p) for p in hd_dir.iterdir()}

    summary_counts = Counter(t.get("shortSummary") for t in tones if t.get("shortSummary"))

    records = []
    for t in sorted(tones, key=lambda x: x["id"]):
        w = wiki.get(t["id"], {})
        sd_file = (w.get("thumbnail_path") or "").split("/")[-1] or None
        hd_file = (w.get("thumbnail_hd_path") or "").split("/")[-1] or None
        sd_real = sd_dims.get(sd_file) if sd_file else None
        hd_real = hd_dims.get(hd_file) if hd_file else None
        short = t.get("shortSummary")
        records.append({
            "id": t["id"],
            "toneNumber": t["toneNumber"],
            "category": t["category"],
            "subCategory": t.get("subCategory"),
            "name": t["name"],
            "wikipediaPageTitle": t.get("wikipediaPageTitle"),
            "sd": {
                "url": t.get("thumbnailUrl"),
                "source": w.get("thumbnail_source"),
                "storedWidth": w.get("thumbnail_width"),
                "realWidth": sd_real[0] if sd_real else None,
                "realHeight": sd_real[1] if sd_real else None,
            },
            "hd": {
                "url": t.get("thumbnailHdUrl"),
                "source": w.get("thumbnail_hd_source"),
                "storedWidth": w.get("thumbnail_hd_width"),
                "realWidth": hd_real[0] if hd_real else None,
                "realHeight": hd_real[1] if hd_real else None,
            },
            "mimoUrl": w.get("mimo_url"),
            "summaryLength": w.get("summary_length", 0),
            "shortSummaryDuplicates": summary_counts.get(short, 0) if short else 0,
        })

    n = len(records)
    sd_cov = sum(1 for r in records if r["sd"]["url"])
    hd_cov = sum(1 for r in records if r["hd"]["url"])
    hd_real_ge_1600 = sum(1 for r in records if (r["hd"]["realWidth"] or 0) >= 1600)
    hd_real_lt_1000 = sum(1 for r in records
                          if r["hd"]["url"] and (r["hd"]["realWidth"] or 0) < 1000)
    no_image = [r["id"] for r in records if not r["sd"]["url"] and not r["hd"]["url"]]
    dup_summaries = sum(1 for r in records if r["shortSummaryDuplicates"] > 1)

    report = {
        "generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "totals": {
            "tones": n,
            "sdCoverage": sd_cov,
            "hdCoverage": hd_cov,
            "hdRealWidthGte1600": hd_real_ge_1600,
            "hdRealWidthLt1000": hd_real_lt_1000,
            "tonesWithoutAnyImage": len(no_image),
            "tonesWithDuplicateShortSummary": dup_summaries,
            "mimoUrlCoverage": sum(1 for r in records if r["mimoUrl"]),
            "hdSourceBreakdown": dict(Counter(
                r["hd"]["source"] for r in records if r["hd"]["source"])),
            "sdSourceBreakdown": dict(Counter(
                r["sd"]["source"] for r in records if r["sd"]["source"])),
        },
        "tonesWithoutAnyImageIds": no_image,
        "tones": records,
    }
    OUTPUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report["totals"], indent=2))
    print(f"\nGeschreven: {OUTPUT}")


if __name__ == "__main__":
    sys.exit(main())

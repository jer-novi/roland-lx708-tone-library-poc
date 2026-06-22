#!/usr/bin/env python3
"""Rapporteer welke tonen hetzelfde Wikipedia-artikel (en dus dezelfde afbeelding) delen.

Read-only diagnose voor Fase 1: groepeert alle tonen op `wikipediaPageTitle` zodat we
kunnen beslissen waar een specifieker/alternatief artikel beter is. Schrijft niets weg —
alleen stdout. Na een remap opnieuw draaien om te verifieren dat clusters kleiner worden.

Gebruik:
    python3 scripts/report_duplicate_wiki_articles.py
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

SEED = Path(__file__).resolve().parent.parent / "data" / "tones_seed.json"


def main() -> None:
    data = json.loads(SEED.read_text(encoding="utf-8"))
    tones = data["tones"]

    by_title: dict[str, list[dict]] = defaultdict(list)
    no_title: list[dict] = []
    for t in tones:
        title = t.get("wikipediaPageTitle")
        if title:
            by_title[title].append(t)
        else:
            no_title.append(t)

    shared = {k: v for k, v in by_title.items() if len(v) > 1}
    shared_ordered = sorted(shared.items(), key=lambda kv: (-len(kv[1]), kv[0]))

    print(f"Totaal tonen          : {len(tones)}")
    print(f"Unieke wiki-titels     : {len(by_title)}")
    print(f"Gedeelde titels (>1)   : {len(shared)}")
    print(f"Tonen zonder titel     : {len(no_title)}")
    print(f"Tonen in deelde cluster: {sum(len(v) for v in shared.values())}")
    print("=" * 72)

    for title, members in shared_ordered:
        cats = sorted({m["category"] for m in members})
        print(f"\n[{len(members):>2}x] {title}   (categorieen: {', '.join(cats)})")
        for m in sorted(members, key=lambda x: x["toneNumber"]):
            print(f"      #{m['toneNumber']:>3}  {m['name']:<22} ({m['category']})")

    if no_title:
        print("\n" + "=" * 72)
        print("Tonen ZONDER wikipediaPageTitle:")
        for m in sorted(no_title, key=lambda x: x["toneNumber"]):
            print(f"      #{m['toneNumber']:>3}  {m['name']:<22} ({m['category']})")


if __name__ == "__main__":
    main()

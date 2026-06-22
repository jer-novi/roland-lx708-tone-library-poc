# Opdracht: tweetalige samenvattingen + fact-blokken genereren (LX708 Tone Library)

> Geef deze prompt aan de externe agent. De agent heeft schrijftoegang tot de repo.
> De agent levert **uitsluitend** twee JSON-bestanden; de repo-eigenaar verwerkt ze daarna
> met `python scripts/apply_summaries_to_seed.py`.

---

## Rol & doel
Je schrijft **gecureerde, tweetalige (Nederlands + Engels) content** voor een digitale
bibliotheek van alle 324 klanken van de Roland LX708 digitale piano. Nederlands is de
hoofdtaal; Engels moet idiomatisch zijn, geen letterlijke vertaling.

De content voedt een swipebare kaart-carousel per klank:
slide 1 = pakkende one-liner (per klank), slide 2 = uitgebreide samenvatting (per
instrument), slides 3..N = gecategoriseerde fact-blokken (per instrument).

## Wat je oplevert — exact twee bestanden
1. `data/tone_summaries.json` — één **one-liner per toon** (NL+EN).
2. `data/instrument_backgrounds.json` — **samenvatting + 5–7 fact-blokken per instrument** (NL+EN).

Beide bestanden **bestaan al** met een `_meta`-blok en enkele *golden voorbeelden*. Behoud
`_meta` en alle bestaande sleutels; **voeg alleen ontbrekende sleutels toe** (idempotent).
De golden voorbeelden zijn je voorbeeld voor toon, lengte en stijl — evenaar die.

## Stap 1 — inventariseer (lees `data/tones_seed.json`)
Itereer over `tones[]`. Per toon:
- **tone-sleutel** = `"<category>|<toneNumber>"` (bijv. `"Piano|1"`, `"E. Piano|1"`, `"Other|273"`).
  Let op: `toneNumber` is alleen uniek *binnen* een categorie, dus de categorie hoort erbij.
- **instrument-sleutel** = exacte waarde van `wikipediaPageTitle` (bijv. `"Grand piano"`,
  `"Rhodes piano"`, `"Agogô"`, `"Solfège"`). Na de remap heeft **elke** toon een titel; er
  zijn geen `null`-waarden meer.

De set unieke `wikipediaPageTitle`-waarden (≈159) bepaalt voor welke instrumenten je een
achtergrond schrijft. Tonen die dezelfde titel delen, delen dezelfde achtergrond — de
one-liner geeft elke klank zijn eigen karakter.

## Stap 2 — feitelijke grounding
Per instrument, haal de Engelse Wikipedia-samenvatting op als bron:
```
GET https://en.wikipedia.org/api/rest_v1/page/summary/<encodeURIComponent(titel)>?redirect=true
Header: Api-User-Agent: lx708-tone-library/1.0
```
**URL-encode de titel** (zoals `encodeURIComponent` / Python `urllib.parse.quote`), niet enkel
spaties → `_`. Anders geven titels met haakjes of diakrieten een 404, bijv. `Mute (music)`,
`Slapping (music)`, `Agogô`, `Solfège`. (Zie `frontend/hooks/useWikiSummary.ts` voor het patroon.)
Houd minstens ~200 ms tussen requests aan (beleefd t.o.v. Wikipedia). Voor meer diepgang mag
je de volledige `/page/html/<titel>` raadplegen. Gebruik daarnaast als bron uit de seed:
`funFacts`, `origin`, `combinationSuggestions`, `tags`, en de MIDI-velden (PureAcoustic =
fysieke modeling; GM2-banken = General MIDI 2).

**Paraphraseer altijd** — neem geen zinnen letterlijk over (auteursrecht). Verzin geen
specifieke jaartallen, namen of specs die je niet kunt staven; bij twijfel houd het algemeen.
Als je geen webtoegang hebt, gebruik dan je eigen kennis maar blijf conservatief en feitelijk.

## Stap 3 — schrijf de content

### `data/tone_summaries.json` → one-liner per toon
- 1 zin, **≤ ~140 tekens**, pakkend en evocatief maar feitelijk.
- Beschrijf het karakter van **déze klank**, niet het generieke instrument. Het is een
  upgrade van `funFacts`.
- Bij varianten (`v2`, `w`, `d`, `Detuned`, `Mellow`, `Bright`, `60's`, …): benoem kort wat
  deze variant onderscheidt.

### `data/instrument_backgrounds.json` → per instrument
- `summary`: **~70–120 woorden**, warm en toegankelijk, NL+EN. Vertel wat het instrument is,
  hoe het klinkt/werkt, en waarom het ertoe doet.
- `facts`: **minimaal 5, streef 6–7**. Verplichte categorieën: `technical`, `history`,
  `playful`, `exotic`. Optioneel: `culture`, `usage`. Elk fact 1–2 zinnen, **≤ ~240 tekens**, NL+EN.
- **SFX / geluidseffecten** (Car, Telephone, Door, Explosion, Bird vocalization, Applause,
  Gunshot, Helicopter, …): 3–4 facts is genoeg; `history`/`technical` mag je overslaan als
  die niet zinvol zijn. Houd het speels.

Categorie-betekenis: `technical` = mechaniek/akoestiek/synthese/MIDI · `history` = uitvinding/
maker/evolutie (droog, feitelijk) · `playful` = luchtig weetje · `exotic` = verrassend/curiosa/
wereldmuziek · `culture` = beroemde nummers/artiesten/films · `usage` = speeltip op de LX708.

## Schema (exact — zie de bestaande golden voorbeelden in de bestanden)
`tone_summaries.json`:
```json
{ "tones": {
  "<category>|<toneNumber>": {
    "name": "<exacte naam uit de seed>",
    "oneLiner": { "nl": "…", "en": "…" }
  }
}}
```
`instrument_backgrounds.json`:
```json
{ "instruments": {
  "<wikipediaPageTitle>": {
    "summary": { "nl": "…", "en": "…" },
    "facts": [ { "category": "technical|history|playful|exotic|culture|usage", "nl": "…", "en": "…" } ]
  }
}}
```

## Harde regels
- Bewerk **uitsluitend** `data/tone_summaries.json` en `data/instrument_backgrounds.json`.
  Raak niets anders in de repo aan. **Niet committen** (tenzij de eigenaar erom vraagt).
- Idempotent: bestaande sleutels behouden, alleen ontbrekende toevoegen.
- Geldig JSON, **UTF-8, 2-space indent, niet-ASCII letterlijk** (dus `Agogô`/`Solfège`, geen
  `\uXXXX`-escapes). Categorie-enum exact zoals hierboven.
- Verlaag geen request-delays naar externe sites.

## Dekking & oplevering
- Doel: **alle 324 tone-sleutels** een one-liner; **alle ≈159 unieke instrument-titels** een
  achtergrond.
- Valideer na afloop: `python -m json.tool data/tone_summaries.json` en idem voor backgrounds.
- Werk gerust in batches per categorie (Piano → E. Piano → Strings → Other) en sla tussentijds op.
- Rapporteer aan het eind: hoeveel one-liners (X/324) en hoeveel instrumenten (Y/159) je hebt
  gevuld, en welke sleutels je hebt overgeslagen en waarom.

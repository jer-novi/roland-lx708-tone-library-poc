# Frontend UX Plan — Fase 2: "Begrijp het instrument in één oogopslag"

Doel: op de hoofdpagina direct zien *wat* een instrument is (beeld + 1-2 zinnen),
hoe het *klinkt* (labels) en waar het bij past — zonder eerst te hoeven klikken.

## 1. Thumbnails & korte samenvatting op de kaart

**Bron: Wikipedia, geen extra API nodig.** De summary-endpoint die we al
aanroepen (`/page/summary/{title}`) levert ook `thumbnail.source` (klein,
~320px) en `originalimage.source`. We slaan de thumbnail-URL op en sturen hem
mee in de lijst-API.

### Backend (klein)
- Flyway **V2**: `wiki_data.thumbnail_url VARCHAR(512)`.
- `WikiService.fetchAndStore()` vult `thumbnailUrl` uit de summary-response.
- Lijst-endpoint `GET /api/tones` levert per tone twee extra velden:
  - `thumbnailUrl` (null als er geen wiki-data is)
  - `shortSummary` (eerste ~220 tekens van de summary, afgekapt op woordgrens)
  - Implementatie: één JOIN naar wiki_data; full_html blijft buiten de lijst
    (payload blijft klein).
- Na deploy eenmalig `POST /api/wiki/refresh-missing` zodat alle 247 gemapte
  tones beeld + samenvatting hebben.

### Frontend kaartontwerp
```
┌────────────────────────────┐
│ ◯ thumb  #12  ★            │   ◯ = ronde thumbnail 48px (fallback:
│ Violin                     │       categorie-icoon op accent-kleur)
│ De viool is een strijk-    │   samenvatting: line-clamp-2,
│ instrument met vier...     │   text-muted, 12px
│ [Strings] [warm] [strijk]  │   chips: categorie + max 2 klank-tags
└────────────────────────────┘
```
- **Responsive**: mobiel (< 640px) wordt de grid 1-koloms met horizontale
  "list cards" (thumb links, tekst rechts) — leest sneller op telefoon.
  Vanaf sm: 2 kolommen, md: 3, lg: 4 (iets groter dan nu, want er is meer
  inhoud per kaart).
- `next/image` met `remotePatterns` voor `upload.wikimedia.org`, lazy loading
  (alleen zichtbare kaarten laden beeld) en vaste afmetingen tegen layout shift.

## 2. Uitklappen vs. modal — de UX-keuze

Drie opties overwogen:

| Optie | Voordeel | Nadeel |
|---|---|---|
| A. Hover-preview | geen klik | werkt niet op touch; verstopt info |
| B. Expand-in-place (accordion-kaart) | context blijft; mobielvriendelijk | grid "springt" |
| C. Alles direct in de modal | al gebouwd | extra klik voor basisinfo |

**Keuze: B + C gecombineerd.**
- Kaart toont standaard 2 regels samenvatting (`line-clamp-2`).
- Tik/klik op de samenvatting (of chevron ⌄) klapt **alleen die kaart** uit
  naar de volledige samenvatting + alle tags (animatie via CSS grid-rows;
  de kaart krijgt `col-span` behoud, alleen hoogte groeit — geen herindeling
  van kolommen, dus rustig beeld).
- "Meer details →" in de uitgeklapte staat opent de bestaande modal
  (volledig artikel, straks audio). Op mobiel wordt de modal een
  **bottom-sheet** (is hij feitelijk al: items-end op small screens).

## 3. Klank-labels (tags)

Twee lagen, beide als chips:

1. **Timbre** (hoe klinkt het): `warm`, `helder`, `donker`, `zacht`,
   `percussief`, `zwevend`, `vintage`, `synthetisch`, `akoestisch`,
   `metallic`, `aards`, `sprankelend`
2. **Context** (waar past het): `jazz`, `klassiek`, `kerk/gospel`, `folk`,
   `electronic`, `ballad`, `lo-fi`, `wereldmuziek`, `fx/cinematic`

### Implementatie
- Flyway **V2** (zelfde migratie): `tones.tags VARCHAR(512)` (comma-separated;
  een join-tabel is overkill voor 324 rijen en deze leespatronen).
- `scripts/generate_tones_seed.py` krijgt een keyword→tags mapping
  (bijv. naam bevat "Pad" → `zwevend,synthetisch,electronic`; subcategorie
  Drums → `percussief`; "Harpsi" → `vintage,klassiek,sprankelend`).
  Later fijnslijpen via de admin-module.
- Frontend: tags op de kaart (max 2) + alle tags uitgeklapt; in de filterbalk
  een "Klank"-dropdown (multi-select chips, OR-logica).

## 4. Virtuele collecties (cross-categorie)

De Roland-indeling (Piano/E. Piano/Strings/Other) is hardware-logica, geen
muzikantenlogica. Bovenop de tags definiëren we collecties die als extra
filterrij verschijnen:

`Toetsen` · `Snaren` · `Blazers` · `Stemmen & koor` · `Percussie & drums` ·
`Synth & pads` · `Wereldinstrumenten` · `FX & geluiden`

Puur afgeleid van tags/subcategorie — geen schemawijziging, mapping in het
seed-script. Een tone mag in meerdere collecties zitten (Violin → Snaren én
Klassiek-context).

## 5. Fasering

| Fase | Inhoud | Omvang |
|---|---|---|
| A | V2-migratie + thumbnail/shortSummary in lijst-API | klein, backend |
| B | Nieuw kaartontwerp + expand-in-place + next/image | middel, frontend |
| C | Tags in seed + chips + klankfilter | middel, beide |
| D | Collecties-filterrij | klein, frontend |

A+B geven de grootste UX-winst en kunnen samen in één PR.

## Open vragen
1. Thumbnails tonen bij GM2-geluiden zonder wiki-mapping (77 stuks): categorie-
   icoon of bewust leeg laten?
2. Taal van de tags: Nederlands (voorstel hierboven) of Engels (matcht de
   tone-namen)?

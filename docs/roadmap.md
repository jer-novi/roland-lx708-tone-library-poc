# Roadmap & feature-registry

Intern werkdocument: geparkeerde features + architectuurbesluiten, zodat ideeën niet
verloren gaan maar wél gefaseerd gebouwd worden. **Niet** gesynct naar
`frontend/content/` (niet-gerenderd). Bron-doc, zoals de rest van `docs/`.

## Achtergrond — zoeken in de app

Er zijn **drie losse zoeklagen**, bewust gescheiden:

1. **BitMidi-track-search** (Speel-lab → MIDI-tracks). Leunt op BitMidi's **eigen index**
   via de publieke API (`/api/midi/search` + `/api/midi/all`): server-side `q`,
   `orderBy` (`plays`/`views`/`createdAt`), `page`/`pageSize`, `total`/`pageTotal`.
   Geen eigen index nodig — BitMidi heeft er al een (~113k files). Proxy:
   `frontend/app/api/bitmidi/search/route.ts`.
2. **App-brede zoekfunctie** (nav, ⌘K). Client-side **Fuse.js** over een genormaliseerd
   `SearchDoc`-schema (`frontend/lib/search/`). Bronnen: tones, genres (`genreTips.ts`),
   combo's (`toneCombos.ts`), doc-secties (`docs.server.ts`). Klein genoeg voor client-side.
3. **Toekomstige backend-search** over eigen tracks/content (zie Fase 2/3 hieronder).

De `SearchProvider`-interface (`lib/search/types.ts`) is de naad waarlangs laag 2 later
naar een server-engine kan verhuizen zonder de UI te raken.

---

## Geparkeerde fases (nog niet bouwen)

### Fase 2 — Backend chip-catalogus + suggesties
- `genre`/`artist`-tabellen + M:N-koppelingen + Flyway-migratie (`V{n}__*.sql`).
- Endpoints voor catalogus + gedeelde, door gebruikers toegevoegde chips.
- Genre-multiselect-modal → gepagineerde artiest-chips; eigen chips toevoegen.
- **Spotify**-suggesties via een Next.js-proxy (OAuth client-credentials + secret-beheer),
  zelfde proxy-patroon als `app/api/bitmidi/*`.
- *Nu al gedaan (Fase 1, frontend-only):* lichte chip-strip (`lib/midiChips.ts`) +
  eigen chips in localStorage.

### Fase 3 — Bladmuziek-upload & OMR-conversie (Audiveris)
- Upload PDF/PNG/JPG/MusicXML → conversie naar **MusicXML + MIDI**.
- **Aparte worker-container** (niet embedded): Audiveris is zwaar (Tesseract, native
  deps, JVM), traag (s–min) en GPL → los proces dat de CLI aanroept isoleert dat.
- Async job + status-polling — **zelfde patroon als `WikiWarmup` + `GET /api/wiki/status`**.
- Output (MusicXML/MIDI) naar object-storage; track-status in Postgres.

### Fase 4 — Interactieve score-rendering (OSMD)
- OpenSheetMusicDisplay rendert MusicXML in de browser; cursor langs de noten +
  autoscroll tijdens playback.

### Fase 5 — Web-MIDI score-sync
- Playback-timestamps koppelen aan score-positie; piano-input-feedback
  (juiste-toets-detectie) bovenop de bestaande `useMidi`-laag.

---

## Live-performance & hardware-track

Eigen faselijn (los van de search/score-fases hierboven) voor het Studio/Speel-lab +
externe hardware. **Detail-uitwerking, layer-spike, openstaande vragen en stap-voor-stap:
zie [`Live_Layering_en_RA30_Arranger.md`](./Live_Layering_en_RA30_Arranger.md).**

### LP-Fase 1 — Combo-content ✅ (gebouwd)
29 nieuwe combo's met twee filterbare/inklapbare categorieën **Artiest-signatuur** (15:
Vangelis, Jan Hammer, Stevie Wonder, Herbie Hancock, Nils Frahm, Einaudi, Jon Lord,
Wakeman, Eno, Ray Charles, Zawinul, Clayderman, Emerson, Toto, Guaraldi) en **Filmscore**
(14: Interstellar, Inception, Blade Runner, Amélie, Schindler's List, Halloween,
Morricone, Sci-fi, LOTR, koor-finale, Burton, Bond, Pirates, Spielberg). Hergebruikt
`toneCombos.ts` + `genreTips.ts` + gids-secties.

### LP-Fase 2 — Multi-kanaals layering (GM2) — spike gebouwd, engine te bouwen
Helft van het klavier met 2 klanken + andere helft met 2 andere, via de multitimbrale
GM2-engine over losse MIDI-kanalen + software-note-router.
- **2a (✅):** layer-spike (`components/LayerSpike.tsx` + `useMidi.onNote`) om GM2-
  multitimbraal, Local Control en live-routing-latency op de echte LX708 te testen.
- **2b/2c (⏳):** `useLayerEngine` + `LayerPanel` zodra de spike-vragen beantwoord zijn.

### LP-Fase 3 — RA-30-arranger + multi-device hub
RA-30 als derde GS-geluidsbron én auto-accompaniment-band. Stijl = PC op CH1, akkoord op
CH1 → Sync Start, tempo via MIDI-clock. Vereist eerst `useMidi`-uitbreiding naar
**meerdere uitgangen** (LX708 + RA-30 via de 2×2-hub). Beste plek: een **Band/Arranger-tab
in het Speel-lab**, gevoed door de progressie-engine of live LX708-akkoorddetectie;
nanoKONTROL voor transport.

### Geparkeerd — "Verras me" met AI
Slimme combinatie-suggesties met tekst & uitleg (API-route + model-call + resultaat-UI).
Aparte iteratie; de huidige `randomize()` (willekeurig binnen de filters) blijft voorlopig.

---

## Architectuurbesluiten

1. **Zoek-engine: Postgres eerst, dedicated engine later.** Postgres FTS
   (`tsvector` + GIN) + `pg_trgm` geeft ranking (`ts_rank`, BM25-achtig) én typo-tolerante
   fuzzy matching, ruim voldoende tot **tienduizenden** tracks (<100 ms). Pas een dedicated
   engine toevoegen als volume/query-patronen het rechtvaardigen — en dan voor app-search
   eerder **Meilisearch/Typesense** (actief onderhouden, typo-tolerance/facets out of the
   box) dan ZincSearch (single-maintainer, richting logs gepivot) of OpenSearch (JVM, zwaar).
2. **Hybrid = naad nu, engine later.** `SearchService`/`SearchProvider`-poort + Postgres-
   adapter. Géén dual-write/extra container voor een mini-catalogus; het dure werk
   (callers migreren) voorkomt juist de interface.
3. **Blobs niet in Postgres.** MusicXML/MIDI/PDF naar object-storage (MinIO/S3-compat of
   gemount volume) + referentie-rijen (`track_asset`: kind, storage_key, sha256, bytes).
   De zoekindex is altijd een **herbouwbare projectie** van de waarheid-in-Postgres.
4. **Datamodel.** `track` (titel, artist, duur, `likes_count` denormalized voor sort),
   `genre`/`artist` + koppeltabellen, `track_asset`, `track_like` (user, track) met
   counter-cache.
5. **Audiveris = aparte container/worker**, niet embedded (zie Fase 3).
6. **Strapi (optioneel CMS).** Content-*bron*, géén zoek-provider. Strapi-content wordt
   gefetcht en op het `SearchDoc`-schema gemapt; de `SearchProvider` bepaalt client- of
   server-side indexering. Niet installeren tot er een concrete contentbehoefte is.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A digital library for all 324 tones of the Roland LX708 digital piano: instrument
background (Wikipedia + Hornbostel–Sachs taxonomy), recording reference, and a live
performance layer that drives a connected LX708 over USB-MIDI (tone selection,
Split/Dual studio control, and a chord/scale/progression "Speel-lab").

**Language convention:** code comments, commit messages, UI strings, and most docs are
in **Dutch**. Match that when editing. Identifiers/types are English.

## Commands

**Backend + database (dev) — run from repo root:**
```bash
docker compose -f deploy/docker-compose.dev.yml up -d --build   # start (db on :55432, api on :8080)
docker compose -f deploy/docker-compose.dev.yml logs -f api      # tail backend logs
docker compose -f deploy/docker-compose.dev.yml down             # stop (keeps data)
docker compose -f deploy/docker-compose.dev.yml down -v          # stop + wipe DB volume
```
This is the **only** supported way to run locally. The prod stack (`docker-compose.yml`,
adds Caddy) also binds `:8080` — only one can run at a time. To debug the backend in
IntelliJ, start just the db (`up -d db`) and run `RolandToneLibraryApplication`;
`application.yml` defaults already target the dev DB.

**Backend tests:**
```bash
cd backend && mvn test          # SeedAndApiSmokeTest runs on H2 (profile "test")
```
The smoke test asserts the full tone list seeds (4 + 11 + 18 + 291 = 324) and filters work.

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev        # http://localhost:3000  (corepack enable activates pnpm)
pnpm lint       # eslint
pnpm build      # next build
```
Reads `NEXT_PUBLIC_API_URL` (defaults to the page hostname on :8080, so Tailscale IPs work).

**Regenerate seed data** (after editing the tone list logic):
```bash
python3 scripts/generate_tones_seed.py    # writes BOTH data/tones_seed.json AND the
                                          # backend classpath copy under src/main/resources/data/
```

**Sync the markdown docs the frontend renders:**
```bash
scripts/sync_docs_to_frontend.sh          # docs/ is the source; copies into frontend/content/
```

## Architecture

### Backend (Spring Boot 3.3, Java 21) — `backend/`
- **Schema is migration-driven.** JPA runs with `ddl-auto: validate`; Flyway
  (`src/main/resources/db/migration/V*.sql`) owns the schema. Any model change needs a new
  `V{n}__*.sql` migration — Hibernate will fail startup on a mismatch.
- **Seeding** (`seed/DataInitializer`) loads `resources/data/tones_seed.json` at boot,
  **idempotently** (restart never duplicates). Disable with `SEED_ENABLED=false`.
- **Wiki + thumbnails run as a background warmup** (`seed/WikiWarmup`, `service/WikiService`)
  after boot, filling missing instrument images. The frontend polls `GET /api/wiki/status`
  for progress. Wiki summaries/HTML are Caffeine-cached and persisted in `wiki_data`.
- **Thumbnail resolution = two ordered source ladders** (`service/thumbnail/`). Each
  `ThumbnailSource` belongs to exactly one ladder via its `hdOnly()` flag:
  - **SD ladder** (`ThumbnailResolver`, card 48–64px): bundled local instrument image →
    Wikipedia summary → Wiki page-images → MIMO museum photo → generated emoji SVG.
  - **HD ladder** (`HdThumbnailResolver`, hover/lightbox): MIMO → Wikipedia originalimage →
    emoji SVG; keeps trying until ≥1200px real width.
  Both **measure real pixel dimensions after download** (`ImageDimensionProbe`) rather than
  trusting the source, and dead/404 URLs are filtered at write time. See
  `docs/development.md` for the full ladder rationale and Wikimedia thumb-width constraints.
- Layering is conventional: `controller` → `service` → `repository`/`model`, with `dto`
  records at the API boundary and `exception/GlobalExceptionHandler` mapping errors.

### Frontend (Next.js 16 app-router, React 19, Tailwind v4) — `frontend/`
- Single-page tone grid in `app/page.tsx`; data via **TanStack Query**. Filters are
  mirrored into the URL query string.
- **Offline fallback:** `lib/api.ts` bundles `lib/seed-fallback.json` so the full library
  still renders when the backend is down (e.g. Render cold start). Fallback tones get
  **negative ids**; detail views skip backend-only data for them.
- Rendered markdown pages (`/gids`, `/studio`) come from `frontend/content/*.md`, which are
  **generated copies** of `docs/` — edit `docs/` then run the sync script, don't edit
  `content/` directly.

### MIDI / live-piano layer (the non-obvious part) — `frontend/hooks/` + `frontend/lib/`
Three cooperating layers, kept pure→stateful→feature:
- **`hooks/useMidi.ts`** — Web MIDI access, device auto-selection (scores ports named
  "LX708"/"Roland"/"piano"), note in/out, and tone-change via Bank Select (CC0/CC32) +
  Program Change. **Default channel is 4 (index 3)** — required to change the *built-in
  keyboard's* sound; other channels only address GM2 multitimbral parts. `echoNotes`
  tracks app-generated notes separately from `activeNotes` (the piano doesn't echo back).
- **`lib/rolandSysex.ts`** (pure) + **`hooks/useRolandSysex.ts`** (stateful) — drive the
  LX708 via Roland's **undocumented DT1/RQ1 SysEx address map** (`ADDR`): keyboard mode,
  per-zone tones (right/splitLeft/dual2), split point/balance, tempo, transport. A
  one-time "enable remote control" handshake per session. Address map documented in
  `docs/LX708_SysEx_Adresmap.md`.
- **`hooks/useStudio.ts`** builds Split/Dual zone control on top; **`components/SpeelLab.tsx`**
  + `hooks/useChartPlayer.ts`/`useMidiPlayer.ts` + `lib/chordChart.ts`/`chordVoicing.ts`/
  `progressions.ts` provide the chord/scale/progression/MIDI-track playground (uses `tonal`).

### Data pipeline — `scripts/` (Python) + `data/`
One-off harvesters (idempotent, polite-rate-limited) that build the seed and image
references: scrape instrument site/MIMO, fuzzy-match the 324 tones, map tones to the
Hornbostel–Sachs tree, generate tags and static icons. `docs/development.md` documents the
scrape scripts; **do not reduce their request delays** (third-party sites).

## Deployment
`deploy/` holds both compose stacks (`docker-compose.dev.yml`, `docker-compose.yml` + Caddy),
server scripts (`bootstrap.sh`, `autodeploy.sh`, `update.sh`), and `render.yaml.example`.
Backend prod config comes from env vars (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`,
`CORS_ALLOWED_ORIGINS`, `SEED_ENABLED`, `PORT`).

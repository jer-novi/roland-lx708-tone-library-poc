# Development Guide

This guide covers the local development workflow for the Roland LX-708 Tone
Library. Production deployment via `deploy/docker-compose.yml` is documented
separately (see top-level `README.md`).

---

## Local dev stack (db + backend)

The local development environment runs entirely in Docker via
`deploy/docker-compose.dev.yml`: one PostgreSQL instance plus the backend
container. This is the **only** way to run locally — the production stack
(`docker-compose.yml`, with Caddy/HTTPS) runs only on the server. The dev
stack uses its own database name, user, volume and compose project name, so
it never interferes with production, even on the same machine.

### Key differences from production

| Setting | Production | Dev |
|---|---|---|
| Host port (db) | not exposed (internal only) | **55432** |
| Host port (api) | 8080 | 8080 (conflicts with prod, see below) |
| Database name | `pianosounds` | `pianosounds_dev` |
| User | `pianosounds_user` | `pianosounds_dev_user` |
| Password | from `deploy/.env` | `devpass` (override via `DEV_DB_PASSWORD` env) |
| Volume | `pgdata` | `pgdata_dev` |
| Stack | api + caddy + db | **api + db** (no caddy) |
| Compose project | `tone-library-prod` | `tone-library-dev` |

### Usage

Run these from the repo root:

```bash
# Start the dev stack (db + api). --build rebuilds the api image after code changes.
docker compose -f deploy/docker-compose.dev.yml up -d --build

# Check it's healthy
docker compose -f deploy/docker-compose.dev.yml ps

# Tail backend logs
docker compose -f deploy/docker-compose.dev.yml logs -f api

# Connect with psql (locally or from any container that can reach 55432)
docker compose -f deploy/docker-compose.dev.yml exec db psql -U pianosounds_dev_user -d pianosounds_dev

# Stop (keeps data)
docker compose -f deploy/docker-compose.dev.yml down

# Stop AND wipe all data (nuclear option)
docker compose -f deploy/docker-compose.dev.yml down -v
```

> **Debugging the backend in IntelliJ?** Start only the database
> (`docker compose -f deploy/docker-compose.dev.yml up -d db`) and run
> `RolandToneLibraryApplication` from the IDE. The `application.yml`
> defaults already point at this dev DB (`pianosounds_dev_user` / `devpass`
> on `localhost:55432`), so no env vars are needed for the database. To
> also serve the bundled instrument photos and emoji icons, set the working
> directory to the repo root **or** provide `LOCAL_THUMBNAILS_DIR`,
> `STATIC_ICONS_DIR` and `MIMO_REFS_FILE` — those paths are tuned for the
> Docker image (`/app/data/...`), not for a native run.

The frontend runs separately: `cd frontend && pnpm dev -- --hostname 0.0.0.0`.

⚠️ Both stacks publish their `api` service on host port **8080**. The dev
stack and the production stack (`docker-compose.yml`) can therefore not run
at the same time — stop one before starting the other.

---

## Scrape-scripts

The `scripts/` directory contains Python tooling for harvesting external
sources. They use plain `requests` and the Firecrawl MCP from
`opencode`/Claude.

| Script | Purpose |
|---|---|
| `scrape_instrument_site.py` | Scrapes `allthemusicalinstrumentsoftheworld.com` detail pages per letter, builds a name→image-URL mapping. |
| `match_instrument_images.py` | Fuzzy-matches the 324 Roland seed tones against the site mapping. |
| `download_instrument_images.py` | Downloads matched images to `backend/src/main/resources/data/instrument-images/`. |
| `patch_gm2_titles.py` | Backfills missing `wikipediaPageTitle` values for GM2 sounds in `tones_seed.json`. |

All scripts are idempotent — re-running them won't corrupt existing data.

### Polite scraping

These scripts make ~300+ HTTP requests to the third-party site. They
include a 1.5s delay between requests and a custom User-Agent identifying
the project. **Do not** reduce the delay or parallelize the requests
unless you are running against your own infrastructure.

---

## Image fallback ladder (dev summary)

There are two ladders: SD (card thumbnails, `wiki_data.thumbnail_path`)
and HD (hover-zoom/lightbox, `wiki_data.thumbnail_hd_path`). A source is
in exactly one ladder, selected by its `hdOnly()` flag.

**SD ladder** (`ThumbnailResolver`):

1. **LocalFileThumbnailSource** (order=3) — reads
   `data/instrument-images/{cat}__{tn}.jpg` from the bundled directory.
   These site-images are only 180-320px (fine for 48-64px cards, useless
   as HD — that's why this source is SD-only).
2. **WikiSummaryThumbnailSource** (order=10) — fetches
   `en.wikipedia.org/.../page/summary/{title}` and rewrites the
   `originalimage` URL to a 960px Wikimedia thumb. If the original is
   ≤960px it downloads the original itself.
3. **WikiPageImagesThumbnailSource** (order=20) — Action API fallback
   for pages without a summary thumbnail.
4. **MimoSdFallbackSource** (order=30) — the same MIMO museum photo the
   HD ladder uses, as a last resort for tones whose Wikipedia page has
   no image at all (or no longer exists — e.g. "Lead synthesizer").
5. **StaticIconThumbnailSource** (order=40) — generated emoji SVG for
   tones no photo source covers: GM2 sound effects ("Thunder",
   "Explosion") and the Do Re Mi demo tones (matched on tone-name
   prefix since they have no Wikipedia title). Icons + mapping come
   from `scripts/generate_static_icons.py`.

**HD ladder** (`HdThumbnailResolver`):

1. **MimoImageThumbnailSource** (order=5) — museum photo via MIMO's
   `image.ashx` proxy. Measured 320-1253px; the proxy ignores width
   parameters, so this is a "best available" source.
2. **WikiHdThumbnailSource** (order=10) — `originalimage` from the REST
   summary endpoint, rewritten to a 1920px Wikimedia thumb when the
   original is wider (avoids multi-MB original downloads).
3. **StaticIconHdSource** (order=40) — the same emoji SVG as the SD
   ladder; SVG is vector so hover-preview and lightbox stay sharp.

Sources can lie about their resolution, so both resolvers measure the
real pixel size after download (`ImageDimensionProbe`, header-only
ImageIO) and store the *measured* dimensions in the database. The HD
resolver additionally keeps trying sources until one delivers ≥1200px
real width, falling back to the best undersized candidate otherwise.

Note: Wikimedia's thumb server only accepts a fixed list of widths
(20/40/60/120/250/330/500/960/1280/1920/3840, see
https://www.mediawiki.org/wiki/Common_thumbnail_sizes); other values
return HTTP 400 unless an old render happens to be cached — see
`WikimediaThumbUrl`.

Stale or 404 URLs are filtered out at write time so the frontend never
sees a broken image link. A Wikipedia page that no longer exists (404
on the summary endpoint) does not abort the pipeline: `WikiService`
stores a wiki_data row without content so the thumbnail ladder and
`mimo_url` still resolve.

MIMO notes (`scripts/scrape_mimo.py`): matches are scored against the
wiki title *or* the search query (so ALT_QUERIES like "minimoog" can
match for "Lead synthesizer"), and every image URL is validated before
being stored — all RMAH/Brussels objects proxy their media from
`www.mimo-db.eu`, which serves HTTP 500, so the scraper walks down the
result list until it finds an object whose image actually loads. Re-runs
re-validate existing matches and self-heal broken ones.

### Image-UX pattern (frontend)

Cards and the detail-modal share one pattern via `ToneThumbnail.tsx`:
a small SD thumbnail (48/64px), a 4× HD preview popup on hover, and —
in the modal header — a click opens a fullscreen lightbox (click/Esc
closes it). The modal body intentionally contains no full-size image;
the "Bekijk op Wikipedia/MIMO" links sit directly below the header.
The modal passes the (fresher) `wiki.thumbnailHdUrl` as HD override.

---

## Testing the full stack locally

```bash
# 1. Start the production-style stack
docker compose -f deploy/docker-compose.yml up -d --build

# 2. Check logs
docker compose -f deploy/docker-compose.yml logs -f api

# 3. Health check
curl http://localhost:8080/actuator/health

# 4. Tear down (preserves data)
docker compose -f deploy/docker-compose.yml down

# 5. Full reset (wipes Postgres volume)
docker compose -f deploy/docker-compose.yml down -v
```

---

## Frontend dev

```bash
cd frontend
pnpm install
pnpm dev      # http://localhost:3000
```

The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`)
to find the backend.

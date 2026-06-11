# Development Guide

This guide covers the local development workflow for the Roland LX-708 Tone
Library. Production deployment via `deploy/docker-compose.yml` is documented
separately (see top-level `README.md`).

---

## Isolated development database

For testing scrape-scripts, seed mutations, schema migrations, or any
change that touches the database, use the **dev database** in
`deploy/docker-compose.dev.yml`. It runs a separate PostgreSQL instance
on a non-conflicting port so it never interferes with the production stack.

### Key differences from production

| Setting | Production | Dev |
|---|---|---|
| Host port | 5432 | **55432** |
| Database name | `pianosounds` | `pianosounds_dev` |
| User | `pianosounds_user` | `pianosounds_dev_user` |
| Password | from `deploy/.env` | `devpass` (override via `DEV_DB_PASSWORD` env) |
| Volume | `pgdata` | `pgdata_dev` |
| Stack | api + caddy + db | **db only** (no api, no caddy) |

### Usage

```bash
# Start the dev database
docker compose -f deploy/docker-compose.dev.yml up -d

# Check it's healthy
docker compose -f deploy/docker-compose.dev.yml ps

# Connect with psql (locally or from any container that can reach 55432)
docker compose -f deploy/docker-compose.dev.yml exec db psql -U pianosounds_dev_user -d pianosounds_dev

# Stop (keeps data)
docker compose -f deploy/docker-compose.dev.yml down

# Stop AND wipe all data (nuclear option)
docker compose -f deploy/docker-compose.dev.yml down -v
```

### Connecting the backend to the dev database

If you want to run the full stack against the dev database:

1. Start both: `docker compose -f deploy/docker-compose.yml up -d db` and
   `docker compose -f deploy/docker-compose.dev.yml up -d db`
2. Override the api service's DB_URL to point at the dev container. The
   easiest way is to set it in `deploy/.env` (don't commit!) or via the
   `psql://` connection string in a temporary override file.

```bash
DB_URL=jdbc:postgresql://localhost:55432/pianosounds_dev \
DB_USERNAME=pianosounds_dev_user \
DB_PASSWORD=devpass \
  docker compose -f deploy/docker-compose.yml up api
```

⚠️ **Always restore** the original `deploy/.env` before starting the
production stack again.

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

**HD ladder** (`HdThumbnailResolver`):

1. **MimoImageThumbnailSource** (order=5) — museum photo via MIMO's
   `image.ashx` proxy. Measured 320-1253px; the proxy ignores width
   parameters, so this is a "best available" source.
2. **WikiHdThumbnailSource** (order=10) — `originalimage` from the REST
   summary endpoint, rewritten to a 1920px Wikimedia thumb when the
   original is wider (avoids multi-MB original downloads).

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
sees a broken image link.

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

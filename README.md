# Roland LX708 Tone Library

Digitale bibliotheek voor alle 324 tones van de Roland LX708, met Wikipedia-achtergrond per instrument, opname-tips en studio-routing referentie.

## Status

| Onderdeel | Status |
|-----------|--------|
| Backend (Spring Boot 3.3, Java 21) | ✅ Werkend: schema, seeding (324 tones), tones-API, Wikipedia-service |
| Seed data (`data/tones_seed.json`) | ✅ Volledige officiële Tone List uit de LX708-handleiding |
| Docs (opnamegids + routingboard) | ✅ `docs/LX708_Opname_Gids.md`, `docs/Studio_Routing_Ideeenboard.md` |
| Frontend (Next.js 16, React 19) | ✅ In `frontend/` — tone-grid, filters, detail-modals, USB-MIDI, warmup-indicator |
| Audio-integratie (Freesound/YouTube), Admin/JWT | ⏳ Gepland |

## Lokaal draaien

**Vereisten:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (draait backend + database) en **Node.js 20+ met pnpm** voor de frontend (`corepack enable` activeert pnpm). Verder is er niets nodig — geen losse Postgres, Java of Maven.

Alles draait lokaal in Docker met één dev-database; de productie-stack draait alleen op de server. Start in **twee terminals**:

**1 — Backend + database** (vanuit de repo-root):

```bash
docker compose -f deploy/docker-compose.dev.yml up -d --build
```

**2 — Frontend:**

```bash
cd frontend
pnpm install
pnpm dev
```

Open daarna **http://localhost:3000** — klaar. De eerste keer haalt de backend op de achtergrond de instrument-thumbnails op; een indicator op de homepage toont de voortgang en de kaarten vullen zich vanzelf.

| Dienst | URL / adres |
|--------|-------------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Health check | http://localhost:8080/actuator/health |
| Database | `localhost:55432` — db `pianosounds_dev`, user `pianosounds_dev_user`, wachtwoord `devpass` |

Handige commando's voor de backend-stack:

```bash
# Logs van de backend volgen
docker compose -f deploy/docker-compose.dev.yml logs -f api

# Stoppen (data blijft) / stoppen + database wissen
docker compose -f deploy/docker-compose.dev.yml down
docker compose -f deploy/docker-compose.dev.yml down -v
```

Flyway maakt het schema aan; bij het opstarten seedt `DataInitializer` alle 324 tones uit `src/main/resources/data/tones_seed.json` (idempotent — herstart maakt nooit duplicaten). De wiki-warmup vult op de achtergrond de ontbrekende thumbnails.

> **Backend in IntelliJ draaien (optioneel, voor debuggen)?** Start dan alléén de database (`docker compose -f deploy/docker-compose.dev.yml up -d db`) en run `RolandToneLibraryApplication` vanuit de IDE — de defaults in `application.yml` wijzen al naar die dev-DB, dus er zijn geen env-vars nodig. Zet wel de werkmap op de repo-root **óf** geef `LOCAL_THUMBNAILS_DIR`, `STATIC_ICONS_DIR` en `MIMO_REFS_FILE` op, anders vindt de native run de lokale instrument-foto's en emoji-iconen niet (die paden zijn op de Docker-image afgestemd). Volledige details: [docs/development.md](docs/development.md).

Meer over de dev-stack, scrape-scripts en de afbeeldingen-ladder: zie [docs/development.md](docs/development.md).

### Environment variables (Render)

| Variabele | Voorbeeld |
|-----------|-----------|
| `DB_URL` | `jdbc:postgresql://<render-hostname>:5432/pianosounds` |
| `DB_USERNAME` | `pianosounds_user` |
| `DB_PASSWORD` | *(secret)* |
| `CORS_ALLOWED_ORIGINS` | `https://jouw-app.vercel.app,http://localhost:3000` |
| `SEED_ENABLED` | `true` (default) — zet op `false` om seeding over te slaan |
| `PORT` | wordt door Render gezet |

## API

| Endpoint | Beschrijving |
|----------|--------------|
| `GET /api/categories` | Categorieën (Piano, E. Piano, Strings, Other) incl. tone count |
| `GET /api/tones?category=&subCategory=&q=` | Tones filteren/zoeken (subcategorieën: Organ, Upright, Classical, Do Re Mi, Drums, GM2) |
| `GET /api/tones/sub-categories` | Lijst van subcategorieën |
| `GET /api/tones/{id}` | Detail incl. wiki-data en audio samples |
| `GET /api/tones/{id}/wiki?refresh=true|false` | Wikipedia summary + volledige HTML (gecachet in DB, 30 dagen vers) |
| `PUT /api/tones/{id}/wiki-title` | Page title handmatig overschrijven: `{"pageTitle": "Rhodes piano"}` |
| `POST /api/wiki/refresh-missing` | Bulk: haal wiki-data op voor alle tones zonder data (rate-limited) |
| `GET /api/wiki/status` | Voortgang van de warmup (`{total, withData, remaining, complete}`) — gepollt door de frontend voor de laad-indicator |
| `GET /actuator/health` | Health check |

## Tests

```bash
cd backend && mvn test
```

Smoke tests draaien op H2 en verifiëren dat de volledige tone list (4 + 11 + 18 + 291) correct seedt en de filters werken.

## Seed data regenereren

```bash
python3 scripts/generate_tones_seed.py
```

Schrijft `data/tones_seed.json` én de classpath-kopie in `backend/src/main/resources/data/`.

## Documentatie

- `docs/LX708_Opname_Gids.md` — opnameknoppen, Dual/Split (max 2 klanken live), intern overdubben, audio naar USB (WAV 44,1 kHz/16-bit), genre-tips
- `docs/Studio_Routing_Ideeenboard.md` — 5 routing-setups voor LX708 + Rubix22 + Maschine MK2 + Ableton + mics
- `docs/Project_Plan_Roland_LX708_Tone_Library.md` — architectuurplan

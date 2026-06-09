# Roland LX708 Tone Library

Digitale bibliotheek voor alle 324 tones van de Roland LX708, met Wikipedia-achtergrond per instrument, opname-tips en studio-routing referentie.

## Status

| Onderdeel | Status |
|-----------|--------|
| Backend (Spring Boot 3.3, Java 21) | ✅ Werkend: schema, seeding (324 tones), tones-API, Wikipedia-service |
| Seed data (`data/tones_seed.json`) | ✅ Volledige officiële Tone List uit de LX708-handleiding |
| Docs (opnamegids + routingboard) | ✅ `docs/LX708_Opname_Gids.md`, `docs/Studio_Routing_Ideeenboard.md` |
| Frontend (Next.js 15) | ⏳ Nog niet in deze repo |
| Audio-integratie (Freesound/YouTube), Admin/JWT | ⏳ Gepland |

## Backend lokaal draaien

Vereist: Java 21, Maven, PostgreSQL (database `pianosounds`).

```bash
cd backend
DB_URL=jdbc:postgresql://localhost:5432/pianosounds \
DB_USERNAME=pianosounds_user \
DB_PASSWORD=... \
mvn spring-boot:run
```

Flyway maakt het schema aan; bij het opstarten seedt `DataInitializer` alle 324 tones uit `src/main/resources/data/tones_seed.json` (idempotent — herstart maakt nooit duplicaten).

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
| `GET /actuator/health` | Health check voor Render |

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

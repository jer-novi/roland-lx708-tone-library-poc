# Roland LX708 Tone Library - PoC

Volledige digitale bibliotheek voor de Roland LX708 piano tones.

## Quick Start (PoC Wikipedia Integratie)

### 1. Backend (Spring Boot)

```bash
cd backend
./mvnw spring-boot:run
# of mvn spring-boot:run
```

- Loopt op http://localhost:8080
- H2 console: http://localhost:8080/h2-console (JDBC URL: jdbc:h2:mem:rolanddb)
- API: http://localhost:8080/api/tones
- Flyway maakt tabellen + categories aan

**Belangrijk**: De seeder is minimaal. Gebruik de Admin endpoints later of voeg handmatig tones toe via SQL/ Admin. De `tones_seed.json` bevat de data uit de originele lijst (controleer/corrigeer categories).

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

- Filter op category of zoek
- Klik op een tone card → modal met Wikipedia summary (automatisch opgehaald via backend)
- Klik "Lees het volledige Wikipedia-artikel" → toont gesanitized HTML uit Wikipedia

### Vereisten
- Java 21+
- Node 20+
- (Optioneel) PostgreSQL voor productie (verander application.yml)

### Volgende stappen na PoC
1. Verbeter DataSeeder om `tones_seed.json` volledig te importeren (categorie lookup + create if not exists)
2. Voeg JWT + Admin UI toe
3. Integreer Freesound + YouTube Data API
4. Deploy frontend naar Vercel, backend naar Render/Railway

Zie `docs/Project_Plan_Roland_LX708_Tone_Library.md` voor het volledige architectuurplan, DB schema en API specificatie.

Gemaakt als Senior Full-Stack Developer opdracht.
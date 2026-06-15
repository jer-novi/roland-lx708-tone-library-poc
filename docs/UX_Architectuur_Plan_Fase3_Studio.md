# UX & Architectuurplan — Fase 3: "Studio, Practice & Platform"

Onderzoeksdocument (geen implementatie). Rol: Lead Full-Stack Architect / UX-onderzoeker.
Bronnen: `docs/lx708_midi_impl.txt` (officiële MIDI Implementation v1.00),
`docs/LX708_Opname_Gids.md`, `docs/Studio_Routing_Ideeenboard.md`,
`docs/Frontend_UX_Plan_Fase2.md`, `frontend/lib/types.ts`, `data/midi_tone_map.json`.

---

## 0. De technische realiteit eerst: wat kan de LX708 wél en níét via MIDI

> **⚠️ HERZIEN (2026-06-13).** Een eerdere versie van dit document concludeerde dat
> recorder, metronoom en Dual/Split *niet* via MIDI bestuurbaar zijn. **Dat was
> onjuist.** Het klopte alleen voor de *gedocumenteerde* standaard-MIDI-laag. De
> piano kent daarnaast een **ongedocumenteerde Roland DT1/RQ1-adresmap** die wél al
> deze paneelfuncties ontsluit — dezelfde die de Roland Piano App gebruikt. Dit is
> **bevestigd op een echte LX708** (model-ID `00 00 00 28`, RQ1-lezen werkt). Zie
> `docs/LX708_SysEx_Adresmap.md` voor de volledige map en `tools/midi-probe/` voor
> de tool waarmee dit is vastgesteld.

De piano spreekt **twee MIDI-lagen**. Het ontwerp mag op beide bouwen.

### Laag A — gedocumenteerde standaard-MIDI (`lx708_midi_impl.txt`)

Universele berichten: Note On/Off + velocity, CC's (Bank Select, Volume, Pan,
Expression, Hold/Sostenuto/Soft, Reverb/Chorus send…), Program Change, RPN
(tuning/pitchbend-range), GM1/GM2 System On, Master Volume/Tuning, GM2 Global
Parameter Control (Reverb-type/-tijd, Chorus) en Identity Request/Reply.

De **Implementation Chart (p.18)** stelt grenzen aan déze laag — en die blijven
gelden voor *standaard* berichten:

| Functie | Recognized | Gevolg voor laag A |
|---|---|---|
| System Real Time: Clock / Start-Stop | X | Geen tempo-sync of transport via *standaard* messages |
| System Common: Song Position / Select | X | Geen SMF-positionering via *standaard* messages |
| Local On/Off | X | Local Control niet via *standaard* messages uit te zetten |
| Bank Select + PC | O | Tones extern oproepbaar (kanaal 4 = klavierkant) |
| SysEx | O | **Inclusief de ongedocumenteerde DT1/RQ1 — zie laag B** |

De laatste rij is de ontsnappingsroute: "SysEx = Recognized" betekent niet alleen
de universele set, maar óók de privé Roland-adresmap.

### Laag B — ongedocumenteerde Roland DT1/RQ1 SysEx (gereverse-engineerd)

Framevorm `F0 41 10 00 00 00 28 <12=DT1|11=RQ1> <adres 4b> <data/len> <checksum> F7`.
Bevestigd op de LX708; adresmap afgeleid van de FP-30X (gedeeld model-ID). Dit
ontsluit o.a.: **keyboard-modus (single/split/dual/twin), split point, tone per
zone, metronoom (tempo/maat/aan-uit), master volume, tuning, ambience, brilliance,
key touch**, en via een knop-simulatieblok de **recorder/transport** (play/stop,
record-standby, rewind, part-selectie). Lezen (RQ1) is veilig en vereist geen
handshake; schrijven (DT1) vereist eerst de handshake naar `01 00 03 06`.

### Herziene conclusies

1. **Recorder, metronoom en Dual/Split zijn wél op afstand bestuurbaar** via laag B
   (per adres nog te verifiëren op de LX708 — checklist in de adresmap). De
   web-app-eigen recorder/metronoom (1.1/1.2) blijven volwaardig en vaak *beter*
   (eigen SMF-export, sample-accurate click) — nu een **keuze**, geen noodgreep.
2. **De webapp kan alles horen wat gespeeld wordt** (Transmit Data p.7–8) — basis
   voor de eigen MIDI-recorder/pianorol; onveranderd.
3. **Identity Reply werkt** (LX708=`11H`) — modeldetectie + het juiste device-ID.
4. **Sound design**: standaard via GM2 GPC (Reverb/Chorus); daarbovenop opent laag B
   ambience/brilliance/key touch. **Piano Designer** (snaarresonantie, hamergeluid,
   per-noot) is op de LX708 véél rijker dan op de FP — die adressen staan nog niet
   in de map en zijn het belangrijkste open onderzoekspunt (zie adresmap §
   "Verschillen LX708 vs FP").
5. **Caveat: laag B is ongedocumenteerd** → firmware-afhankelijk, geen garanties.
   Altijd eerst read-only verifiëren; schrijfacties achter een duidelijke
   "experimenteel"-vlag tot bevestigd.

---

## 1. Studio & Practice Flow

### 1.1 Recording & overdub

> **UPDATE.** De interne SMF-recorder is via laag B (DT1/RQ1) tóch bedienbaar:
> play/stop `01 00 05 05`, reset `01 00 05 02`, record-standby `01 00 03 1B`,
> part-toggles `01 00 05 06–08`, status-uitlezen `01 00 01 03/0C-0E`. De
> web-app-eigen recorder hieronder blijft de aanbevolen hoofdroute (eigen
> SMF-export, geen firmware-afhankelijkheid), maar we kúnnen nu ook de hardware
> aansturen — bijv. één "REC"-knop die zowel onze take start als de piano in
> standby zet.

**Haalbaarheid.** De interne SMF-recorder (Left/Right parts + overdub, zie
Opname-gids) is via standaard-MIDI niet, maar via laag B wél te bedienen. Maar: alle toetsaanslagen komen
realtime binnen via Web MIDI. De webapp kan dus **zelf opnemen** — events
timestampen (`MIDIMessageEvent.timeStamp` is een hoge-resolutie
`performance.now()`-klok, ruim voldoende voor MIDI), in het geheugen bufferen en
client-side naar Standard MIDI File (SMF format 1) serialiseren. Geen library
nodig (SMF schrijven is ~150 regels), of desgewenst `@tonejs/midi` (klein, goed
onderhouden) voor parse + write.

Overdub in de webapp: een eerdere take afspelen via de output (kanaal 4 voor de
klavier-/Local-klank, of GM2-kanalen voor extra lagen) terwijl een nieuwe take
wordt opgenomen. **Caveat:** tijdens playback via kanaal 4 klinkt de piano met
de geselecteerde tone; de speler hoort zijn eigen toetsen ook (Local staat
altijd aan — niet uitschakelbaar via MIDI). Dat is voor piano-overdub meestal
juist gewenst. Punch-in/out is in-app triviaal (events buiten het punch-venster
negeren/behouden).

**UX-voorstel — "Take-deck" onderin (boven de MidiBar):**

```
┌──────────────────────────────────────────────────────────────────┐
│ ● REC   ▶ PLAY   ⏹      ♩=96  [4/4]  count-in: [2 maten ▾]      │
│ Take 1  ▓▓▓▓▓▓▓▓▓░░░░  0:42   tone: Concert Piano    [⟳ overdub]│
│ Take 2  ▓▓▓▓░░░░░░░░░  0:18   tone: Strings          [solo][✕]  │
│ ──────────────────────────────────────────  [⬇ .mid] [💾 opslaan]│
└──────────────────────────────────────────────────────────────────┘
```

- REC start: count-in via Web Audio-click (zie 1.2) → opname start op tel 1.
- Elke take onthoudt de tone (we weten wat we laatst via `sendTone` stuurden,
  én we zien Bank/PC binnenkomen als de speler op het paneel wisselt).
- Sequentiële flows ("count-in → 8 maten → stop → review") zijn een dunne
  state-machine bovenop dit deck; presets als knoppen ("Oefenloop 8 maten").

**Werkverdeling.** Frontend: groot (recorder-hook `useMidiRecorder`, SMF-
serialisatie, take-deck UI). Backend: klein (optioneel: takes opslaan als blob
+ metadata in een `recordings`-tabel, zie 1.4).

### 1.2 Metronoom & opname-selectie

> **UPDATE.** De interne metronoom is via laag B wél instelbaar: maat
> `01 00 02 1F`, patroon `…20`, volume `…21`, toon `…22`, tempo `01 00 03 09`,
> aan/uit `01 00 05 09`. Toch blijft de Web Audio click-track de aanbevolen
> hoofdroute (sample-accuraat, stuurt onze eigen recorder/playback). Optie: de
> twee synchroon laten lopen, of een schakelaar "klik via app / via piano".

**Haalbaarheid.** De interne metronoom is via standaard-MIDI niet instelbaar (geen
Clock); via laag B (DT1) wél. **Web Audio click-track blijft het juiste antwoord** en is met de
standaard lookahead-scheduler (Chris Wilson-patroon: `setInterval` 25 ms +
`AudioContext.currentTime`-scheduling ~100 ms vooruit) sample-accuraat — beter
dan `setTimeout`-clicks. Twee samples (hoog/laag) of synthetische blips, tempo
40–240, maatsoorten 2/4–7/8.

**Opname-selectie** (wát neem je op): een eenvoudige bronkiezer in het take-deck:

- **Klavier (Local, ch. 4)** — standaard: speler speelt, piano klinkt zelf.
- **GM2-laag (ch. 1–3, 5–16)** — voor multitimbrale overdubs: de webapp echo't
  of playback't op een GM2-kanaal met eigen Bank/PC per kanaal.

De kanaal-4-logica blijft zo één consistente regel: *kanaal 4 = de piano zoals
je hem hoort onder je vingers; al het andere = arrangeerlagen*.

**Werkverdeling.** Frontend: middel (`useMetronome`-hook + UI in take-deck).
Backend: geen.

### 1.3 Metadata van LX708-opnames uitlezen

> **UPDATE (genuanceerd).** Via RQ1 (laag B) is de **huidige** recorder-status wél
> leesbaar: sequencer-status `01 00 01 03`, tempo `…08`, maat `…05/0A/0B`,
> part-switches `…0C-0E`, geselecteerd songnummer `01 00 02 10`. Wat níét kan: de
> **opgeslagen lijst** met songnamen/inhoud uitlezen — daar is geen adres voor.
> Dus: live sessie-status ja, song-bibliotheek-metadata nee.

**Deels haalbaar.** Er bestaat geen gedocumenteerde SysEx om de namen of inhoud van
opgeslagen interne opnames op te vragen, en de Opname-gids bevestigt dat interne
songs *niet* als MIDI-stream worden uitgezonden. De live status is wel leesbaar (zie UPDATE).

**Elegant alternatief: metadata aan de bron vangen.** Omdat de webapp toch al
meeluistert, kennen we tijdens élke sessie: tone (Bank/PC), tempo (uit onze
eigen metronoom of geschat uit noot-onsets), duur, nootbereik, pedaalgebruik,
velocity-profiel. Dit wordt automatisch de metadata van een take in het
recording log — rijker dan wat de piano zelf ooit zou kunnen leveren. Voor
WAV's van de USB-stick (1.4): metadata handmatig + afleidbaar (duur, peaks via
wavesurfer).

### 1.4 USB-stick-flow & Recording Log

**Haalbaarheid.** Audio-opname naar USB-stick (WAV 44,1 kHz/16-bit) is een
paneel-handeling; niet op afstand te starten. De webapp kan twee dingen doen:
(a) de handeling **begeleiden**, (b) het resultaat **beheren**.

**UX-voorstel.**
- **Wizard "Opnemen naar USB-stick"** (modal, 4 stappen met paneelfoto's):
  stick erin → ⏺-knop → spelen → ⏹; laatste stap: "sleep de WAV hierheen".
- **Recording Log** (nieuwe pagina `/opnames`): uploadvak (drag & drop),
  per opname: titel, datum, tone(s), setup (A–E uit het Routing-ideeënboard),
  tags, notities, waveform-preview (zie 1.8). Browser-takes (.mid, 1.1) en
  WAV-uploads staan in hetzelfde log; een take kan aan een WAV gekoppeld
  worden ("dit is de audio-render van take 3").

**Werkverdeling.** Backend: middel — `recordings`-tabel (Flyway V4), upload-
endpoint (multipart, opslag op schijf zoals de wiki-thumbs), lijst/detail-API.
Frontend: middel — pagina + uploadflow; sluit aan op bestaande patronen
(TanStack Query, kaartenstijl uit Fase 2).

### 1.5 Transpose met "sfeer"-indicatie (witte-toetsen-meter)

**Haalbaarheid.** Volledig frontend; geen MIDI nodig (de Transpose-functie van
de piano zelf is een paneelinstelling, maar de *indicatie* is pure muziektheorie).
Optioneel kan de webapp transpose ook toepassen op haar eígen playback/echo
(noot ± n verschuiven vóór verzenden) — dat werkt wél via MIDI.

**UX-voorstel.** Slider −6…+6 met per stand:
- Toonsoort-badge (bijv. "D♭ → klinkt als C")
- **Witte-toetsen-score**: aantal zwarte toetsen in de doeltoonsoort (0–5),
  gevisualiseerd als mini-klavier waarop de benodigde zwarte toetsen oplichten.
- Sfeerlabel per toonsoort (herbruik de NL-klanktags-stijl: "warm", "helder").

```
Transpose: [−2]  ▸ Speel in C, klink in B♭
mini-klavier:  ░█░█░ ░█░█░█░   zwarte toetsen nodig: 0  ●●●●● (5/5 wit)
```

**Werkverdeling.** Frontend: klein. Backend: geen.

### 1.6 Live noten-weergave / MIDI-mirror (pianorol)

**Haalbaarheid.** Goed haalbaar. Binnenkomende events worden al verwerkt
(`handleMidiMessage`); een pianorol is een canvas/SVG die note-on→note-off-
balken tekent tegen een tijd-as. Voor live-weergave: scrollend venster (laatste
~20 s). Voor opgenomen takes: volledige rol met scrub/zoom — dit wordt meteen
de review-weergave van het take-deck (1.1). Notenbalk-notatie (i.p.v. pianorol)
kan later via `verovio` of `abcjs`, maar quantisatie van live spel naar nette
notatie is een onderzoeksproject op zich — **pianorol eerst**.

**UX-voorstel.** Tab naast het bestaande live-klavier in de MidiBar:
`[Klavier] [Pianorol]`; in take-review dezelfde component met scrollbar +
klik-om-te-positioneren (playback springt mee).

**Werkverdeling.** Frontend: middel-groot (canvas-rendering, virtualisatie bij
lange takes). Backend: geen.

### 1.7 Split/Dual-presets per genre

> **UPDATE.** De **panel-modi Dual/Split zijn nu wél direct activeerbaar** via laag B:
> keyboard-modus `01 00 02 00` (0=single,1=split,2=dual,3=twin), split point
> `…01`, balans `…03/05`, octaafshift `…02/04`, en de tone per zone via
> `…07` (single) / `…0A` (split) / `…0D` (dual). Dat maakt een echte
> één-klik-preset mogelijk die de píáno in de juiste modus zet — geen wizard meer
> nodig. De software-varianten hieronder blijven nuttig als de tonecombinatie iets
> moet doen wat het paneel niet kan (bijv. >2 lagen, of een GM2-klank die niet als
> zonetone beschikbaar is).

**Haalbaarheid — herzien onderscheid.**
- De **panel-modi Dual/Split** zijn via laag B (DT1) direct te activeren én uit te
  lezen (RQ1) — presets zetten de piano nu echt in de modus. Tone-zone-encoding
  `[categorie, num÷128, num%128]` nog op de LX708 te verifiëren.
- Een **software-Dual** (GM2-echo van binnenkomende noten op een tweede kanaal)
  blijft mogelijk als alternatief/uitbreiding.
- Een **software-Split** blijft half (Local klinkt over het hele klavier) — maar nu
  overbodig, want de echte panel-split is bereikbaar.

**UX-voorstel.** Presetbibliotheek `/presets`, gevoed uit een JSON in `data/`:
categorie (genre, gelinkt aan bestaande `tags`), tone-combinatie (2× toneKey),
type (`dual-panel` | `split-panel` | `dual-software`), balans, beschrijving.
Kaarten in Fase 2-stijl; knop "Activeer" stuurt direct de juiste DT1-modus +
tones (panel) of de Bank/PC-echo (software).

**Werkverdeling.** Frontend: middel. Backend: klein (presets als seed-data,
zelfde patroon als tones) of zelfs alleen statisch JSON.

### 1.8 Audio-navigatie: wavesurfer.js + timestamps

**Haalbaarheid.** Onproblematisch: wavesurfer.js v7 (ESM, React-vriendelijk)
rendert client-side waveforms van geüploade WAV's; het Regions/Markers-plugin
doet timestamp-markers. WAV's van 44,1/16 van enkele minuten zijn prima; voor
lange opnames pre-renderen we peaks server-side (wavesurfer accepteert een
peaks-array) zodat de pagina licht blijft.

**UX-voorstel.** In het Recording Log-detail (1.4): waveform met markers die de
gebruiker zelf zet ("couplet", "foutje hier", "mooi voicing-moment"), plus —
als er een gekoppelde MIDI-take is — automatische markers op sectie-grenzen
(stiltes > 2 s). Markers zijn deeplinkbaar (`/opnames/12?t=83.4`).

**Werkverdeling.** Frontend: middel (nieuwe dependency: `wavesurfer.js`).
Backend: klein (markers als JSON-kolom bij de opname; optioneel peaks-endpoint).

### 1.9 Practice-tempo & Piano Designer

**Practice-tempo.** Volledig in-app haalbaar: per oefening/nummer een
doeltempo + moeilijkheidsgraad (1–5) → starttempo-aanbeveling (bijv. 60% van
doel bij niveau "nieuw", +5 bpm per geslaagde herhaling — klassieke
practice-ladder). Koppel aan de metronoom (1.2) en log voortgang in
localStorage of het recording log. Frontend: klein-middel.

**Piano Designer.** De Piano Designer-app stuurt **ongedocumenteerde Roland-SysEx**
(manufacturer 41H, model-ID `00 00 00 28`) — het *mechanisme* is inmiddels
gedecodeerd (laag B, zie adresmap). De stand van zaken:
- **Basis is binnen handbereik:** ambience `01 00 02 1A`, brilliance `…1C`,
  key touch `…1D`, master tuning `…18` — plus Reverb/Chorus via GM2 GPC. Genoeg
  voor een echt "Klankruimte"-paneeltje, niet alleen een bescheiden versie.
- **De diepe Piano Designer-params (snaar-/dempresonantie, hamergeluid, klepstand,
  per-noot tuning/volume) staan nog níét in de FP-afgeleide map** — de LX708 is
  hierin veel rijker dan de FP-machines (zie adresmap §"Verschillen LX708 vs FP").
  Dít is het concrete open onderzoekspunt: RQ1-sweep van het `01 00 02 xx`-bereik
  voorbij `…25` + één Piano-Designer-app-snoop (Bluetooth HCI-log) om de adressen
  te bevestigen. Geen blind experiment meer maar gericht aanvullen van een
  grotendeels bekende map.
- Daarnaast (zonder enige SysEx): de Tone List bevat de gemodelleerde
  piano-varianten als tones — een "Piano-modellen vergelijker" (A/B tussen 2
  piano-tones via Bank/PC op kanaal 4) blijft haalbaar en didactisch sterk.

---

## 2. Platform, UX & Architectuur

### 2.1 Meertaligheid (i18n) & Wikipedia

**UI-strings.** `next-intl` (de facto standaard voor App Router) met statische
message-files `nl/en/es/fr/de.json`, locale in het URL-pad (`/nl/...`) — dat
speelt ook deep-linking (2.4) in de kaart. UI-volume is klein (~150 strings);
eenmalig AI-/handvertaald en ingecheckt; geen runtime-vertaal-API nodig.

**Wikipedia-content: langlinks eerst, vertaal-API als vangnet.**
1. De summary-endpoint die we al gebruiken heeft een zuster-API:
   `GET /w/api.php?action=query&prop=langlinks&titles=...` → de titel van
   hetzelfde artikel in nl/es/fr/de. Daarmee halen we **native** samenvattingen
   op (kwalitatief beter dan machinevertaling, gratis, geen key). Backend:
   `wiki_data` uitbreiden met `lang`-kolom (composite key page+lang), warmup
   per taal lazy (alleen aangevraagde talen vullen).
2. Voor titels zónder anderstalig artikel (de long tail): **DeepL API Free**
   (500k tekens/maand — ruim voldoende voor 324 × ~220 tekens × 4 talen ≈ 285k,
   eenmalig) als batch-job, resultaat cachen in dezelfde tabel met
   `source='deepl'`-vlag. Het GitHub Student Developer Pack bevat geen
   noemenswaardige vertaal-API; DeepL Free/Azure Translator F0 (2M
   tekens/maand) zijn de juiste gratis routes.
3. NL-klanktags zijn al Nederlands; voor andere talen: tags als keys behandelen
   en via de message-files vertalen (geen schemawijziging).

**Werkverdeling.** Middel-groot, maar goed te faseren: eerst next-intl + NL/EN
UI, daarna langlinks-backend, daarna DeepL-vangnet.

### 2.2 Toetsenbordnavigatie & snelle auditioning

**Haalbaarheid.** Puur frontend. Patroon: **roving tabindex** op de tone-grid
(WAI-ARIA grid-pattern): pijltjes bewegen de focus (←→ binnen rij, ↑↓ over
rijen — kolomaantal uit een ResizeObserver), `Enter`/`Space` = `sendTone` van
de gefocuste kaart (en `record()` voor recently-played), `F` = favoriet,
`Esc` = terug naar zoekveld. Belangrijk detail: auditioning debouncen (~150 ms)
zodat snel doorpijlen niet elke tussenliggende tone naar de piano stuurt.

```
[zoekveld]  ↓ Tab
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ ◉  │→│    │→│    │  ...     ◉ = focus-ring; Enter = klinkt direct
└────┘ └────┘ └────┘ └────┘    op de piano (ch.4)
```

**Werkverdeling.** Frontend: klein-middel (één `useGridNavigation`-hook +
focusbeheer in `ToneCard`).

### 2.3 Quick Access & History

**Bestaat al grotendeels**: `useRecentlyPlayed` (localStorage, max 10, toneKeys)
+ `RecentlyPlayedRow`. Voorstellen ter afronding: (a) `record()` ook aanroepen
bij keyboard-auditioning (2.2) en preset-activatie (1.7); (b) rij sticky maken
onder de filterbalk (2.5); (c) "pin" — een recent item vastzetten zodat het
niet uitstroomt; (d) frequentie meewegen (recency + count) voor een slimmere
volgorde. Frontend: klein.

### 2.4 Deep-linking & URL-state

**Voorstel.** Filters/categorie/tags/zoekterm naar de URL
(`/?cat=Strings&tag=warm&q=viool`), zodat links deelbaar zijn en de
back-button werkt. Architectuur:
- **`nuqs`** (typesafe `useQueryState` voor App Router) als dunne laag boven
  `useSearchParams` — scheelt veel boilerplate (parsing, debounce van `q`,
  `router.replace` zonder scroll-reset). Alternatief zonder dependency:
  eigen hook met `useSearchParams` + `useRouter.replace`; nuqs is de
  pragmatischere keuze.
- Server Components kunnen dezelfde params lezen voor SSR van de gefilterde
  lijst (betere first paint + deelbare links renderen meteen juist).
- Modal-state (geopende tone) ook in de URL (`?tone=Strings%2342`) — maakt
  individuele tones deelbaar en lost het "modal weg na refresh"-probleem op.
- Volgorde-afspraak: filter-keys gesorteerd serialiseren (stabiele URLs voor
  caching/delen).

**Werkverdeling.** Frontend: middel (FilterBar + page-refactor). Backend: geen.

### 2.5 Ergonomie: PWA, sticky UI, Studio/Dark Mode

**PWA.** Doel: fullscreen op een tablet op de muziekstandaard.
- `app/manifest.ts` (Next ondersteunt dit native): naam, icons (192/512),
  `display: "standalone"`, `orientation: "landscape"`, themakleur.
- Service worker via **Serwist** (de onderhouden opvolger van next-pwa,
  werkt met Next 15/16): precache van shell + `seed-fallback.json`;
  runtime-cache (stale-while-revalidate) voor `/api/tones` en thumbnails.
- **Web MIDI werkt in een geïnstalleerde Chrome-PWA** gewoon door (zelfde
  permissie-model); op iPad werkt Web MIDI níét (Safari) — tablet-advies:
  Android/Chrome of een Windows-laptop. Expliciet documenteren.

**Sticky UI.** Filterbalk + MidiBar/take-deck sticky:
```
┌──────────────────────────────┐
│ SiteNav                      │  ← scrollt weg
│ FilterBar  [sticky top-0]    │  ← blijft
│ RecentlyPlayedRow (compact)  │  ← blijft (klapt in bij scroll-down)
│  ... 324 kaarten ...         │
│ MidiBar/Take-deck [sticky    │  ← blijft, bottom-0
│  bottom-0]                   │
└──────────────────────────────┘
```
CSS `position: sticky` + een kleine scroll-richting-hook om de recently-row te
collapsen. Let op CLS: vaste hoogtes reserveren.

**Studio/Dark Mode.** De app ís al donker (surface/border-soft-tokens). Werk
dit uit tot een echt thema-systeem: Tailwind 4 `@theme`-tokens × een
`data-theme`-attribuut met drie standen — `studio` (huidig donker, extra lage
luminantie + amberaccenten voor avondgebruik), `licht`, `auto` (system).
Toggle in SiteNav, voorkeur in localStorage + `prefers-color-scheme`.

**Werkverdeling.** Frontend: middel (PWA klein, sticky klein, theming middel).
Backend: geen.

### 2.6 Perceived performance & caching

- **Shimmer-placeholders**: Tailwind `animate-pulse`-blokken in `ToneCard` op
  exact de afmetingen van thumb/tekst (geen CLS); `next/image` heeft de vaste
  maten al uit Fase 2.
- **Service worker** (zie 2.5): app-shell + seed-fallback precached → de app
  opent en is doorzoekbaar zonder netwerk; thumbnails stale-while-revalidate
  met een cap (bijv. 200 entries, LRU) zodat de cache niet ontspoort.
- **TanStack Query**: `staleTime` ruim voor `/api/tones` (de lijst wijzigt
  zelden), `placeholderData: keepPreviousData` bij filterwissel zodat de grid
  nooit "leegknippert".
- Offline-banner ("offline — bibliotheek uit cache; MIDI werkt gewoon") —
  Web MIDI heeft géén netwerk nodig, een mooi verkoopargument voor de PWA.

---

## 3. Haalbaarheid herzien: wat kan nu wél, en wat blijft niet-haalbaar

**Nu wél haalbaar via DT1/RQ1 (laag B)** — per adres nog te verifiëren op de LX708:

| Idee | Route | Status |
|---|---|---|
| Interne recorder starten/stoppen | Knop-sim `01 00 05 05` (play/stop), `…05 02` (reset), record-standby `01 00 03 1B` | te verifiëren |
| Interne metronoom instellen via app | `01 00 02 1F–25` (maat/patroon/volume/toon), tempo `01 00 03 09`, toggle `01 00 05 09` | te verifiëren |
| Recorder-status uitlezen | RQ1 `01 00 01 03/08/0A-0F` (status, tempo, maat, part-switches) | te verifiëren |
| Panel-Dual/Split activeren | `01 00 02 00` (modus), `…01` (split point), `…07/0A/0D` (tones per zone) | te verifiëren |
| Tuning / ambience / brilliance / key touch | `01 00 02 18/1A/1C/1D` | te verifiëren |

**Blijft niet-haalbaar (of beste alternatief):**

| Idee | Waarom niet | Alternatief |
|---|---|---|
| Local Control uitzetten | Local On/Off: Recognized = X (ook geen DT1-adres bekend) | UX eromheen (overdub mét hoorbare toetsen) |
| Metadata van *bestaande* interne songs uitlezen | Songnaam/inhoud niet via SysEx; alleen huidige status leesbaar | Metadata aan de bron vangen tijdens de sessie (1.3) |
| Piano Designer (snaarresonantie, hamergeluid, per-noot) | Adressen nog onbekend — LX708 veel rijker dan FP-map | RE-onderzoek (adresmap §Verschillen); tot dan GM2 GPC + A/B-vergelijker |
| WAV's automatisch van USB-stick halen | Geen mass-storage-toegang via MIDI/web | Upload-flow + Recording Log (1.4) |
| Tempo-sync (DAW-klok → piano) | System Real Time Clock: Recognized = X | Niet nodig: app is zelf de tempobron |
| Web MIDI op iPad-PWA | Safari ondersteunt Web MIDI niet | Android-tablet/Chrome of laptop documenteren (2.5) |

---

## 4. Gefaseerd prioriteitenvoorstel

Criteria: gebruikerswaarde voor de kernflow (spelen/ontdekken/oefenen),
technisch risico, afhankelijkheden.

| Fase | Inhoud | Omvang | Waarom eerst |
|---|---|---|---|
| **3A — Snel spelen** | Toetsenbordnavigatie (2.2) · URL-state/deep-linking (2.4) · sticky UI + shimmer (2.5/2.6) · recently-played-afronding (2.3) | klein-middel, alleen frontend | Maakt de bestáánde kernflow direct merkbaar beter; geen nieuwe concepten |
| **3B — Metronoom & recorder** | Web Audio-metronoom (1.2) · `useMidiRecorder` + take-deck + SMF-export (1.1) · pianorol live + take-review (1.6) | groot, frontend | Het hart van "studio"; alles client-side, geen backendrisico |
| **3C — Recording Log** | Backend `recordings` + upload (1.4) · wavesurfer + markers (1.8) · koppeling takes↔WAV | middel, full-stack | Bouwt op 3B; eerste echte nieuwe backend-feature |
| **3D — Presets & practice** | Split/Dual-presetbibliotheek (1.7) · transpose-sfeermeter (1.5) · practice-tempo-ladder (1.9) · piano-A/B-vergelijker | middel | Verrijking; hergebruikt 3B-bouwstenen (metronoom, sendTone) |
| **3E — Platform** | PWA/Serwist (2.5/2.6) · i18n next-intl + langlinks (+ DeepL-vangnet) (2.1) · Studio/licht-thema | middel-groot | Waardevol maar orthogonaal; kan parallel aan 3C/3D door tweede spoor |
| **3F — Hardware-besturing (SysEx)** | DT1/RQ1-client + adresmap-verificatie (read-only checklist) · panel-Split/Dual-presets (1.7) · recorder/metronoom-koppeling (1.1/1.2) · live status-readout | middel, frontend | Nieuw mogelijk gemaakt door laag B; bouwt op de probe + adresmap. Verifiëren vóór schrijven. |
| **3X — Experiment** | Piano Designer diepe params via RQ1-sweep + BLE-snoop (1.9) · notatie-weergave (verovio) | onderzoek | Nooit blokkerend; apart label "experiment" |

Nieuwe dependencies (bewust minimaal): `wavesurfer.js` (3C), `nuqs` (3A),
`next-intl` (3E), `@serwist/next` (3E), optioneel `@tonejs/midi` (3B),
optioneel `roland-sysex.js`-stijl helper (3F, of ~40 regels eigen DT1/RQ1-builder).

## Open vragen
1. Recording Log: opnames lokaal op de server opslaan (zoals wiki-thumbs) is
   prima voor één gebruiker — is multi-user/cloud ooit een doel? (Bepaalt of
   we nu al een storage-abstractie willen.)
2. Take-deck: takes standaard alleen lokaal (IndexedDB) en pas bij "opslaan"
   naar de backend, of altijd direct persisteren?
3. i18n: wordt EN of NL de bron-taal van de message-files? (Tone-namen zijn
   Engels; docs zijn NL.)
4. Pianorol-quantisatie naar notenbalk: gewenst genoeg om verovio-onderzoek in
   3D te trekken, of bewust in 3X laten?
5. Hardware-besturing (3F): hoever willen we DT1-schrijfacties standaard inzetten
   gegeven het firmware-risico van laag B? Voorstel: read-out altijd aan,
   schrijfacties achter een "experimenteel"-toggle tot de adresmap LX708-breed
   geverifieerd is.
6. Verhouding app-recorder/metronoom ↔ hardware: één gecombineerde transport-knop
   (start app-take + zet piano in standby), of de twee bewust gescheiden houden?

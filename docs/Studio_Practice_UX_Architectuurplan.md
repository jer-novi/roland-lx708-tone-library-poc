# Studio & Practice — UX/UI- en Architectuurplan

Ontwerp/onderzoeksdocument voor de opname-, overdub- en practice-flow van de
LX708 Tone Library webapp, plus platform-volwassenheid (i18n, PWA, navigatie,
URL-state, performance).

Bronnen: `docs/lx708_midi_impl.txt` (MIDI Implementation v1.00, aug 2021),
`docs/LX708_Opname_Gids.md`, `docs/Studio_Routing_Ideeenboard.md`,
`docs/Frontend_UX_Plan_Fase2.md`, `frontend/hooks/useMidi.ts`,
`frontend/lib/types.ts`, `data/midi_tone_map.json`.

---

## 0. Samenvatting

De centrale bevinding uit de MIDI Implementation: **de LX708 heeft géén
Roland-specifieke, adres-gebaseerde SysEx** (geen DT1/RQ1), **geen MIDI Clock
en geen transport-commando's**. Alles wat "het paneel op afstand bedienen" is
— interne recorder starten, metronoom instellen, Piano Designer, song-metadata
uitlezen — is daarmee **niet haalbaar** via gedocumenteerde MIDI.

Wat wél kan is verrassend veel, en wijst één architectuurprincipe aan:

> **De webapp wordt de sequencer/recorder; de piano is klavier + klankmodule.**
> De webapp ontvangt elke noot en elk pedaal dat je speelt en kan zelf
> opnemen, overdubben, afspelen (multitimbraal via GM2), klikken (via de
> drumkit-metronoomnoten van de piano zelf!) en exporteren naar SMF. Het
> paneel van de piano bedienen we niet — we *choreograferen* het met
> stap-voor-stap-wizards waar de interne recorder of USB-audio nodig is.

Drie onverwacht bruikbare vondsten in de Implementation:

1. **Metronoom uit de piano-speakers zonder audio-route**: de Rhythm Sets
   bevatten op noot 33/34 letterlijk `Metronome Click` / `Metronome Bell`
   (Rhythm Set List, alle kits). De webapp kan dus een sample-accurate click
   uit de piano zelf laten klinken via geplande Web-MIDI-noten op een
   drumkit-kanaal.
2. **Master Coarse Tuning** (Universal Realtime SysEx, ±24 halve tonen) wordt
   ontvangen — functioneel een **remote transpose** voor het hele instrument.
3. **Identity Request/Reply** is gedocumenteerd en onderscheidt LX708/706/705
   — de webapp kan bij verbinden model + firmware tonen en daarop afstemmen.

§1 legt het technisch fundament met letterlijke citaten. §2 behandelt de negen
studio/practice-onderwerpen, §3 de zes platform-onderwerpen, §4 de fasering.
Elke paragraaf eindigt met een werkinschatting (FE/BE, S/M/L).

---

## 1. Technisch fundament: wat de LX708 wél en niet kan via MIDI

### 1.1 Wat de Implementation letterlijk zegt

**Ontvangen SysEx is beperkt tot universele berichten.** Pagina 4:

> "The System Exclusive Messages received by this instrument are; messages
> related to mode settings, Universal Realtime System Exclusive messages, and
> Universal Non-realtime System Exclusive messages."

Concreet gedocumenteerd (Receive): GM1/GM2 System On, Master Volume, Master
Fine/Coarse Tuning, Global Parameter Control (Reverb/Chorus), Controller
Destination Setting, Scale/Octave Tuning, Key-Based Instrument Controllers,
Identity Request. **Er is géén Roland-adresmodel** (geen `41H ... 12H` DT1 of
`11H` RQ1) — er bestaat dus geen enkel adresseerbaar parameter-, song- of
instellingenregister.

**Verzonden SysEx is uitsluitend de Identity Reply.** Sectie "2. Transmit Data
■ System Exclusive Messages" bevat alléén:

```
F0H  7EH, 10H, 06H, 02H, 41H, 19H, 03H, 00H, 00H, 11H, 01H, 00H, 00H  F7H   (LX708)
```

waarbij byte 10 het model onderscheidt: `11H` = LX708, `12H` = LX706,
`13H` = LX705.

**Geen clock, geen transport, geen song-select.** Implementation Chart (p. 18):

```
| System Common    : Song Position         | X | X |
|                  : Song Select           | X | X |
| System Real Time : Clock                 | X | X |
|                  : Commands              | X | X |
```

Dus: de piano zendt geen MIDI Clock (we kunnen het interne tempo niet volgen)
en ontvangt geen Start/Stop/Continue (we kunnen de interne recorder/metronoom
niet starten of stoppen).

**Interne songs blijven binnen.** Opname-gids §6: "de tone-demo's en interne
songs worden *niet* via USB/Bluetooth MIDI uitgezonden." Een interne opname
kan dus niet "afgeluisterd" worden door de webapp; alleen het SMF-bestand
(via Copy Song → USB-stick) kan eruit.

### 1.2 Wat wél bruikbaar is (Receive, tenzij anders vermeld)

| Bericht | Bytes / bron | Gebruik in de webapp |
|---|---|---|
| Bank Select + PC | CC0/CC32 + `CnH` | Tone-keuze, óók per GM2-part (multitimbraal) — werkt al op kanaal 4 voor de lokale klank |
| Note On/Off, CC64/66/67 | transmit **én** receive | De webapp kan alles wat gespeeld wordt opnemen en alles terugspelen |
| Noteweergave zendbereik | "Note Number: 15–113" (Chart) | Bewijst dat paneel-transpose de uitgezonden noten meeverschuift (88 toetsen = 21–108; 15–113 = ±transpose) |
| All Sound Off / All Notes Off | CC120 / CC123 | Panic/stop-knop bij playback |
| CC7/CC10/CC11 | Volume/Pan/Expression per part | Mix van overdub-lagen |
| CC91/CC93 | Reverb/Chorus send per part | Klank-tweaks paneel |
| CC71–78 | Resonance, Release, Attack, Cutoff, Decay, Vibrato | Sound-controllers per part ("Some Tones will not exhibit any change") |
| Master Volume | `F0 7F 7F 04 01 ll mm F7` | Volumeregelaar in de app |
| Master Coarse Tuning | `F0 7F 7F 04 04 ll mm F7`, mm: `28H–40H–58H (-24–0–+24 [semitones])` | **Remote transpose** (§2.5) |
| Master Fine Tuning | `F0 7F 7F 04 03 ll mm F7` of RPN 00 01 | 440↔442 Hz-schakelaar (tabel staat in de Implementation) |
| GPC Reverb | `F0 7F 7F 04 05 01 01 01 01 01 pp vv F7`; pp=0 type (Room1…Plate), pp=1 Reverb Time 0–127 | Reverb-keuze vanuit de app |
| GPC Chorus | idem, slot `01 02`; type/rate/depth/feedback/send | Chorus-keuze |
| Scale/Octave Tuning | `F0 7E 7F 08 08 …` (1-byte form, ±63 cent per toets) | Historische stemmingen als practice-feature (optioneel) |
| Identity Request | `F0 7E 10 06 01 F7` | Model-detectie bij verbinden |
| Rhythm Sets | MSB 120, noten 33 `Metronome Click` / 34 `Metronome Bell` | **Metronoom uit de piano-speakers** (§2.2) |

### 1.3 Architectuurprincipe

```
                 ┌────────────────────────────────────────────┐
                 │                WEBAPP (sequencer)          │
                 │  recorder · metronoom · mirror · presets   │
                 │  takes in IndexedDB · SMF import/export    │
                 └───────▲───────────────────────────┬────────┘
            notes/CC's   │                           │  notes/CC/Bank/PC
            (alles wat   │      USB-MIDI (Web MIDI)  │  geplande events,
             je speelt)  │                           ▼  click op drumkit-ch
                 ┌───────┴────────────────────────────────────┐
                 │            LX708 (klavier + klankmodule)   │
                 │  lokale klank op ch 4 · GM2-parts ch 1–16  │
                 │  paneel: interne recorder, metronoom,      │
                 │  Dual/Split, Ambience  → wizard, niet MIDI │
                 └────────────────────────────────────────────┘
```

Belangrijk kanaal-model (consistent met de bestaande kanaal-4-logica in
`useMidi.ts`):

- **Kanaal 4 = de lokale klank** van het klavier (Bank/PC hierop verandert wat
  je onder je vingers hoort). Dit kanaal is "van de speler".
- **Overige kanalen = GM2-parts**: playback-lagen, click-track, echo-lagen.
  Conventie-voorstel: ch 10 = click (drumkit), ch 5–9 en 11–16 = takes/lagen,
  ch 1 vermijden we als playback-doel omdat het de default transmit channel
  van de piano is (houdt logs leesbaar).

### 1.4 Haalbaarheidsmatrix

| Idee | Haalbaar? | Route |
|---|---|---|
| Interne recorder bedienen (rec/play/stop, punch) | ❌ | Geen transport-messages → webapp-eigen MIDI-recorder + paneel-wizard |
| Metronoom van de piano instellen | ❌ | Geen SysEx/clock → eigen click via drumkit-noten 33/34 (piano-speakers!) of Web Audio |
| Song-metadata uitlezen (naam, tempo, tone, duur) | ❌ | Geen RQ1/dump → SMF van USB-stick uploaden en parsen |
| Opnemen/overdubben in de webapp zelf | ✅ | Alle notes/CC's komen binnen; playback multitimbraal via GM2 |
| Count-in → N maten → auto-stop → review | ✅ | Volledig in webapp-domein |
| Transpose op afstand | 🟡 | Master Coarse Tuning (±24 st) — verifiëren of de lokale klank meegaat; anders paneel-instructie |
| Sfeer-indicator witte/zwarte toetsen | ✅ | Pure frontend-wiskunde |
| MIDI-mirror (pianorol) | ✅ | Live spel; ⚠️ interne songs verschijnen er níét in |
| Dual/Split-modus van het instrument activeren | ❌ | Geen SysEx → "Web Dual/Split" via note-echo op tweede kanaal + paneel-wizard |
| Reverb/chorus/master-tuning vanuit de app | ✅ | GM2 GPC + Universal Realtime (gedocumenteerd) |
| Piano Designer (Ambience, Key Touch, resonanties) | ❌ | Niet in de Implementation; Roland-app gebruikt ongedocumenteerde berichten |
| wavesurfer.js op USB-WAV's | ✅ | Upload + waveform, geen MIDI nodig |
| Model/firmware-detectie | ✅ | Identity Request/Reply |

---

## 2. Studio & Practice Flow

### 2.1 Recording & overdub flow

**Haalbaarheid.** De interne recorder is onbereikbaar (§1.1). Maar de webapp
ontvangt élk note-event en CC64/66/67 met hoge-resolutie timestamps
(`MIDIMessageEvent.timeStamp`, DOMHighResTimeStamp), en Web MIDI ondersteunt
*geplande* output: `output.send(data, timestamp)` — Chrome voert dit uit met
een precisie die ver onder `setTimeout`-jitter ligt. Dat is alles wat een
MIDI-recorder nodig heeft. De speler hoort tijdens het inspelen gewoon de
lokale klank van de piano (nul latency); de webapp logt alleen mee.

**Overdub-mechanisme.** Take 1 wordt bij overdub afgespeeld op een GM2-part
(bijv. ch 5) terwijl de speler live de lokale klank (ch 4) bespeelt. Elke take
krijgt een eigen kanaal + tone. Zo omzeilen we de 2-tonen-limiet van Dual Play
volledig — precies wat het routingboard al voor Ableton beschrijft, maar nu
zonder DAW.

> ⚠️ **Te verifiëren op het instrument**: accepteren GM2-parts ook de
> *native* banks (MSB ≠ 121, bijv. European Grand `0/68/1`)? De Implementation
> documenteert Bank Select op alle kanalen, maar niet welke banks per part
> geldig zijn. Fallback: takes spelen af met het dichtstbijzijnde
> GM2-equivalent (mapping in data, bijv. European Grand → `121/0/1` Piano 1);
> de premium-klank blijft dan voor de live-laag op ch 4.

**Punch-in/out** is in het webapp-domein triviaal: events van de actieve take
tussen maat X en Y vervangen door de nieuw gespeelde events. Geen
piano-beperking, want wij bezitten de data.

**Sequentiële flow** ("count-in → record 8 maten → stop → review"):

```
[Setup] ──► [Count-in 1-2 maten] ──► [REC, maatteller loopt] ──► auto-stop
   ▲          click + groot visueel       na N maten of op ■
   │          aftelgetal                        │
   └──── [Review: direct ▶ playback] ◄─────────┘
              │ goed → "Bewaar take" / overdub volgende laag
              └ fout → "Opnieuw" (take wordt vervangen, vorige blijft als undo)
```

**UI-voorstel** — transportbalk + take-lanes, als nieuw blok op de bestaande
`/studio`-pagina:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ● REC    ▶ PLAY    ■ STOP    ⟳ LOOP     ♩=120 ▾    4/4 ▾   Aftel: 1m ▾ │
│  Maat 3.2 / 8   ▕████████████░░░░░░░░░░░░▏   ⏱ 0:07.4                   │
├─────────────────────────────────────────────────────────────────────────┤
│ Take 1  🎹 European Grand   ch 5   [M][S][⟲ undo][🗑]   ▂▃▅▂▁▂▅▃▂▁▂▃    │
│ Take 2  🎻 SymphonicStr1    ch 6   [M][S]               ● opnemen…      │
│ ＋ Overdub nieuwe laag   ·   ⤓ Exporteer .mid   ·   ⤒ Importeer .mid    │
└─────────────────────────────────────────────────────────────────────────┘
```

- Mini-"waveform" per lane is een note-density-sparkline (geen audio).
- "Exporteer .mid" schrijft een SMF format-1 bestand (één track per take,
  inclusief Bank/PC-events zodat een DAW of de piano-USB-playback de juiste
  klanken pakt).
- Paneel-wizard als alternatief pad: een stappen-overlay die de interne
  opname choreografeert (uit Opname-gids §3: `[●]` → Part kiezen → `[▶/■]`,
  1 maat aftellen, enz.) met de waarschuwing "een part opnieuw opnemen
  **overschrijft** het".

**Architectuur (frontend).**

- `useMidi.ts` uitbreiden met een subscribe-API voor raw events
  (`onEvent(cb)`) naast de bestaande `activeNotes`-state — de recorder en de
  mirror (§2.6) mogen niet per noot een React-render triggeren.
- Nieuw: `useMidiRecorder` (state machine: idle → countIn → recording →
  reviewing), `lib/smf.ts` (writer/reader, ~200 regels, of de kleine dep
  `midi-file`), `lib/scheduler.ts` (lookahead-scheduler, gedeeld met de
  metronoom), takes in IndexedDB (overleeft refresh; localStorage is te klein).

**Werk**: FE **L** (recorder-engine + transport-UI + SMF), BE **—** (v1 is
volledig client-side; opslag op de server komt via de Recording Log, §2.4).

### 2.2 Metronoom & opname-selectie

**Haalbaarheid.** De interne metronoom is niet aanstuurbaar: geen SysEx
ervoor, en `System Real Time : Clock | X | X` sluit ook tempo-sync uit. Drie
alternatieven, in oplopende elegantie:

- **A. Web Audio click** (AudioContext + lookahead-scheduler): sample-accuraat,
  maar klinkt uit laptop/tablet-speakers.
- **B. Click via Bluetooth-audio naar de LX708-speakers** (de piano accepteert
  Bluetooth-audio, zie routingboard setup D): constante latency van
  ~100–200 ms is voor een doorlopende click onhoorbaar (de speler lijnt zich
  uit op wat hij hóórt), maar de count-in/opname-uitlijning moet dan met een
  kalibreerbare offset gecorrigeerd worden.
- **C. ⭐ Click via Web MIDI op de piano zelf.** De Rhythm Set List bevat in
  élke kit: `A1 | 33 | Metronome Click` en `A#1 | 34 | Metronome Bell`. Zet
  een kanaal (voorstel: 10, het GM2-rhythm-kanaal) op de STANDARD Set
  (`120/0/1`, Tone List "Drums" nr. 27) en stuur geplande Note Ons: noot 34 op
  tel 1, noot 33 op de overige tellen, via `output.send(msg, when)`. De click
  klinkt **uit de piano-speakers**, strak, zonder audio-route en zonder
  Bluetooth-latency.

**Aanbeveling**: C als primair, A als fallback zonder verbonden piano — beide
achter dezelfde `Metronome`-abstractie op de gedeelde lookahead-scheduler. De
opname-timeline, count-in en click delen daarmee één tijdbasis.

**Opname-selectie (tone/part/kanaal).** De selectielogica volgt §1.3: de
gebruiker kiest per laag een tone; de webapp bepaalt het kanaal.

```
┌── Opname-instellingen ───────────────────────────────────────┐
│ Live-klank (klavier, ch 4):  [European Grand     ▾]  ← stuurt │
│                                                      Bank/PC  │
│ Click:  [Aan ▾]  Geluid: [Piano-speakers (MIDI) ▾| Web Audio] │
│         Accent op 1: ☑    Volume: ▁▂▃▅ (CC7 op ch 10)        │
│ Maatsoort: [4/4 ▾]   Tempo: [120] ◄────────► tap-tempo        │
└──────────────────────────────────────────────────────────────┘
```

**Werk**: FE **M** (scheduler + metronoom-UI; de recorder hergebruikt alles),
BE **—**.

### 2.3 Metadata van LX708-opnames uitlezen

**Haalbaarheid: ❌ via MIDI.** De SysEx-sectie is hierover ondubbelzinnig: het
instrument *zendt* uitsluitend de Identity Reply (§1.1). Er is geen
song-dump, geen naam-, tempo- of tone-query. Songnaam, tempo, gebruikte tone
en duur zijn dus niet op afstand opvraagbaar.

**Alternatieven, van rijk naar arm:**

1. **SMF-bestanden parsen** (interne opnames, via paneel "Copy Song" naar
   USB-stick → upload in de webapp). Een SMF bevat: tempo (meta-event
   `FF 51`), maatsoort (`FF 58`), duur (ticks × tempo), én de Bank
   Select/Program Change-events — die we via een reverse lookup op
   `data/midi_tone_map.json` terugvertalen naar tone-namen uit de bibliotheek.
   Spring Boot kan dit **zonder extra dependency** met `javax.sound.midi`
   (`MidiSystem.getSequence(...)`).
2. **WAV-bestanden** (USB-audio-opnames): alleen duur/samplerate uit de
   header + bestandsdatum. Tempo en tone weet alleen de gebruiker → daarom
   het handmatige-maar-geassisteerde Recording Log (§2.4) met prefill.
3. **Webapp-opnames** (§2.1) hebben per definitie volledige metadata — nóg
   een argument om de webapp de recorder te maken.

**Wat de Identity Reply wél oplevert**: stuur bij verbinden
`F0 7E 10 06 01 F7`; de reply onderscheidt LX708 (`11H`), LX706 (`12H`),
LX705 (`13H`) + firmware. UI: badge in de MidiBar — "✓ LX708 · fw 1.x". Dit
maakt de verbinding betrouwbaarder dan naam-matching op de poortnaam
(`scoreOutput()` blijft als fallback).

**Werk**: BE **M** (SMF-parser + endpoint, mapping naar tones), FE **S**
(upload + weergave), FE **S** (identity-handshake in `useMidi`).

### 2.4 USB-stick opname-flow & Recording Log

**Flow-ontwerp.** Twee werelden verbinden: opnemen gebeurt op de piano (paneel
+ stick), beheren in de webapp.

```
PIANO (paneel-wizard in de app als spiekbrief)        WEBAPP
1. Stick in USB Memory-poort                          4. /studio → "Importeer van USB-stick"
2. Song-knop vasthouden + draaien → "Audio"           5. Bestanden kiezen (WAV/MID)
3. [●] → [▶/■] → spelen → [▶/■]                       6. Per bestand: metadata-kaart
   (WAV 44,1 kHz/16-bit op de stick)                     prefill: duur (header), tempo/tones
                                                          (SMF-parse §2.3), laatst getriggerde
                                                          tone uit "Recent gespeeld"
                                                       7. Aanvullen: setup A–E, Ambience-stand,
                                                          tags, notitie → opslaan in log
```

**Recording Log datamodel** (Flyway-migratie; het ideeënboard noemde dit al en
de `audio_samples`-tabel "is er al klaar voor" — maar opnames verdienen een
eigen tabel, `audio_samples` is voor referentie-samples per tone):

```sql
recordings(
  id, title, source,            -- 'usb-wav' | 'usb-smf' | 'webapp-midi'
  file_url, duration_seconds,
  tempo_bpm, time_signature,    -- uit SMF of handmatig
  tone_keys VARCHAR,            -- comma-sep toneKey's (category#nr)
  setup CHAR(1),                -- routingboard A–E
  ambience SMALLINT,            -- 0–10, handmatig (niet uitleesbaar)
  notes TEXT, tags VARCHAR,
  recorded_at, created_at
)
recording_markers(id, recording_id, position_ms, label)   -- voor §2.8
```

**UI**: een `/opnames`-pagina (of tab op /studio) met lijst + filters op tone,
setup en tag; rij-klik opent de waveform-speler (§2.8). Kruisverwijzing op de
tone-kaart: "3 opnames met deze tone".

**Werk**: BE **M** (tabel + multipart-upload + statische file-serving + parse),
FE **M** (importflow + logweergave). Bewust ná de webapp-recorder gefaseerd:
de log wordt waardevoller als webapp-takes er ook in landen.

### 2.5 Transpose met "sfeer"-indicatie

**Haalbaarheid.** Drie lagen, gescheiden houden in de UI:

1. **Paneel-transpose** (Kbd Transpose): niet via MIDI instelbaar. Wél
   indirect zichtbaar: de Chart geeft zendbereik "Note Number: 15–113" — een
   88-toets klavier is 21–108, dus uitgezonden noten verschuiven mee met de
   paneel-transpose. De mirror (§2.6) toont dan de *klinkende* noten.
2. **🟡 Remote transpose via Master Coarse Tuning**: `F0 7F 7F 04 04 ll mm F7`
   met `mmH: 28H–40H–58H (-24–0–+24 [semitones])` wordt ontvangen. "Master"
   impliceert het hele instrument inclusief de lokale klank — **op het
   instrument verifiëren**; zo ja, dan heeft de app een echte
   transpose-slider. Let op: dit hertstemt (zelfde toets klinkt hoger), het
   hermapt geen toetsen — functioneel identiek aan transpose.
3. **Software-transpose** voor alles wat de webapp zelf afspeelt of echot
   (takes, Web Split/Dual-lagen): triviaal, noot ± n.

**De "sfeer"-indicator** is pure frontend-wiskunde: gegeven de toonsoort van
het stuk en transpositie *t*, bepaal de resulterende toonsoort en tel de
voortekens (kwintencirkel-afstand). 0–1 voortekens ≈ "(bijna) alleen witte
toetsen".

```
┌── Transpose-verkenner ─────────────────────────────────────────────────┐
│ Stuk staat in: [E majeur ▾]                                            │
│                                                                        │
│  t   klinkt als   voortekens   sfeer                                   │
│ -4   C majeur     ░░░░░░░ 0    ●●●●● alleen wit  ◄ aanbevolen          │
│ -2   D majeur     ♯♯░░░░░ 2    ●●●○○                                   │
│  0   E majeur     ♯♯♯♯░░░ 4    ●●○○○                                   │
│ +1   F majeur     ♭░░░░░░ 1    ●●●●○                                   │
│                                                                        │
│ ▼ mini-klavier bij selectie: ladder-toetsen gemarkeerd                 │
│   │▮│▯│▮│▯│▮│▮│▯│▮│▯│▮│▯│▮│   C D E F G A B → allemaal wit            │
│                                                                        │
│ Toepassen: [Op de piano (SysEx)¹] [Alleen op afspelen] [Paneel-uitleg] │
│ ¹ werkt op het hele instrument; n.v.t. als verificatie faalt           │
└────────────────────────────────────────────────────────────────────────┘
```

Het mini-klavier hergebruikt `MidiKeyboard` met een nieuwe
`highlightedNotes`-prop (ladder-noten), de actieve noten-laag blijft werken —
zo zie je live of je inderdaad op de gemarkeerde toetsen blijft.

**Werk**: FE **M** (theorie-helper `lib/keys.ts` + UI + klavier-prop), FE **S**
(SysEx-send), BE **—**. Verificatiepunt #1 uit §5.

### 2.6 Live noten-weergave / MIDI-mirror

**Haalbaarheid: ✅**, met één belangrijke caveat die in de UI benoemd moet
worden: **interne songs en demo's verschijnen níét in de mirror** (niet via
MIDI uitgezonden, Opname-gids §6). De mirror toont live spel — en playback van
webapp-takes (die kunnen we zelf in de visualisatie injecteren, want wij
sturen ze).

**Ontwerp** — een eigen scherm (route `/mirror`, full-bleed, geschikt voor
tablet op de muziekstandaard):

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⏸ pauzeer scroll   ⟲ live   zoom ─●──   [pianorol ▾| notenbalk]  ⛶  │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  ▬▬▬                ▬▬                          ↑                │ │
│ │      ▬▬▬▬   ▬                ▬▬▬▬▬              │ tijd           │ │
│ │  ▬▬       ▬▬▬▬          ▬▬          (sustain    │ scrollt        │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░  als arcering)          │ omhoog         │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ │▮│▯│▮│▮│▯│▮│▯│▮│  88-toets klavier, actieve noten oplichtend   │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│  ◄────────── scrub door historie (laatste 30 min) ──────────►        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Pianorol eerst**: `<canvas>` + `requestAnimationFrame`, gevoed door de
  event-subscribe-API uit §2.1 (niet via React-state — 30 noten/sec × 60 fps
  re-renders is onhoudbaar). Eventbuffer als ring buffer in een ref; 30 min
  spel is < 1 MB.
- **Scroll-navigatie**: "live" volgt de tijd; slepen/scrubben pauzeert het
  volgen; knop "⟲ live" springt terug.
- **Notenbalk (fase later)**: vereist quantisatie + maat-inferentie (wij
  hebben geen clock van de piano; wél van onze eigen metronoom — koppel de
  notatie dus aan sessies waar de webapp-click aanstond). VexFlow is de
  kandidaat-lib; markeer als **L** en apart te faseren.

**Werk**: FE **M** (pianorol + buffer + scrub), FE **L** (notenbalk, later),
BE **—**.

### 2.7 Split/Dual-presets per genre

**Haalbaarheid.** De Dual/Split-modus van het instrument zelf is **niet** via
MIDI te activeren (geen SysEx voor paneel-instellingen). Twee sporen:

1. **Paneel-wizard**: preset toont "druk [Split/Dual], kies klank 1 + 2,
   splitspunt X" als stappen — de app als spiekbrief, met de Balance-tip uit
   de Opname-gids.
2. **⭐ "Web Dual/Split"**: de webapp echot binnenkomende noten realtime naar
   een tweede kanaal met een GM2-tone. Split = alleen noten onder/boven het
   splitspunt echoën (+ eventueel octaaf-shift per laag); Dual = alles.
   De speler hoort: lokale klank (direct, 0 ms) + GM2-laag (USB-roundtrip,
   ~5–15 ms later). **Eerlijke caveat**: die vertraging is onhoorbaar bij
   pads/strings/koor-lagen, maar kan bij twee percussieve klanken (piano +
   marimba) als flam klinken. De preset-data krijgt daarom een veld
   `webDualGeschikt: boolean`.

**Preset-bibliotheek** — data-gedreven, gekoppeld aan `tags` op `ToneDto` en
de genre-tips uit de Opname-gids (die staan er al klaar: "Gospel Spin + piano
in Dual", "Combo Jz.Org split met AcousticBass", "piano + Soft Pad", …):

```ts
interface SplitDualPreset {
  id: string; naam: string;
  modus: "dual" | "split";
  laag1: string;              // toneKey → lokale klank (ch 4, Bank/PC)
  laag2: string;              // toneKey → echo-laag (GM2-part)
  splitspunt?: number;        // MIDI-noot, alleen bij split
  octaafShift2?: number;
  balans?: number;            // CC7 op de echo-laag
  genreTags: string[];        // matcht ToneDto.tags / context-chips
  bron: "gids" | "eigen";
  webDualGeschikt: boolean;   // anders alleen paneel-wizard tonen
}
```

```
┌── Presets: Gospel ─────────────────────────────────────────────┐
│ ▢ "Zondagochtend"  Gospel Spin + ChurchOrgan-pad    [▶ Probeer]│
│    dual · balans 70/30 · ook op paneel: [toon stappen]         │
│ ▢ "Walking bass"   Combo Jz.Org ◤split F#3◢ A.Bass  [▶ Probeer]│
└────────────────────────────────────────────────────────────────┘
```

"Probeer" doet: Bank/PC op ch 4 (laag 1) + Bank/PC op echo-kanaal (laag 2) +
echo aanzetten. Eén klik van browsen naar spelen.

**Werk**: FE **M** (echo-engine in `useMidi` + preset-UI), BE **S** (presets
als JSON-seed of tabel; v1 mag een statisch bestand zijn). Verificatiepunt #2
(native banks op GM2-parts) bepaalt hoe rijk laag 2 kan zijn.

### 2.8 Audio-navigatie via timestamps + wavesurfer.js

**Haalbaarheid: ✅, goed begrensd.** WAV's van de piano zijn 44,1 kHz/16-bit
≈ 10,6 MB/min stereo. wavesurfer.js v7 rendert client-side prima tot ±10 min
(decodeAudioData); daarboven wil je voorberekende peaks.

**Voorstel:**

- Upload via de Recording Log-flow (§2.4); backend bewaart het bestand en
  serveert het met HTTP `Range`-support (seeken zonder volledige download).
- **Peaks**: bij upload berekent de backend een peaks-JSON (Java: WAV is
  triviaal te lezen — 16-bit PCM samplen naar ~2000 buckets; geen externe
  tool nodig). wavesurfer accepteert `peaks` + `duration` en hoeft de audio
  dan pas te decoderen bij play.
- **Timestamp-markers**: wavesurfer Regions-plugin; dubbelklik = marker,
  label invullen, opslaan in `recording_markers`. Markers zijn deep-linkbaar:
  `/opnames/42?t=83.5` (zelfde URL-state-laag als §3.4).

```
┌── "Improvisatie 12 jun" · European Grand · setup D · 4:12 ─────────────┐
│ ▶ ──╫────▂▃▅▆▅▃▂▁▂▃▅▇▅▃▂▁▁▂▃▅▆▅▃──╫──▂▃▅▃▂──────╫───────  1:23 / 4:12 │
│     │A: thema                     │B: brug      │C: reprise           │
│ [+ marker op afspeelpositie]  [⤓ download WAV]  [✎ metadata]          │
└────────────────────────────────────────────────────────────────────────┘
```

Dit is de eerste echte audio-dependency (`wavesurfer.js`, ~40 kB gzip, geen
transitive deps) — een verantwoorde uitzondering op de "schone package.json".

**Optionele uitbreiding** (flag, niet v1): directe audio-opname in de browser
via `getUserMedia` op de Rubix22-input (LX708 line-out → Rubix22 → Chrome).
Technisch haalbaar (AudioWorklet → WAV), maar het dupliceert wat de
USB-stick-flow al kan en voegt gain/agc-valkuilen toe
(`echoCancellation/noiseSuppression/autoGainControl` expliciet uit).

**Werk**: BE **M** (upload + Range + peaks + markers-API), FE **M**
(wavesurfer-integratie + marker-UX).

### 2.9 Practice tempo-aanbevelingen & Piano Designer

**Practice-modus.** Bouwt op metronoom (§2.2) en recorder (§2.1):

```
┌── Oefenen: "Arabesque No. 1" ──────────────────────────────────┐
│ Doeltempo ♩=120 · starttempo-aanbeveling: ♩=72 (60%)           │
│ Ladder:  72 ▸ 80 ▸ 88 ▸ 96 ▸ 104 ▸ 112 ▸ 120                   │
│          ●────●────●────○────○────○────○   (voortgang)         │
│ [▶ Start: count-in + click op 88]   na schone pass: [+1 trede] │
│ 🎙 elke pass wordt als MIDI-take gelogd → terugluisteren       │
└────────────────────────────────────────────────────────────────┘
```

Starttempo-aanbevelingen als data: per oefening/stuk (handmatig) of generiek
per genre (uit de gids: liquid d&b "87 i.p.v. 174", enz.). Voortgang in
localStorage (zelfde patroon als `useFavorites`). De recorder maakt van elke
pass gratis een review-take — practice en studio delen dezelfde engine.

**De "Piano"-categorie in de Tone List.** De kern-categorie is klein en
bewust premium — letterlijk (Tone List, p. 11):

```
Piano:      1 European Grand 0/68/1 · 2 European v2 0/69/1
            3 American Grand 1/68/1 · 4 American v2 1/69/1
Upright:    13–17 (Upright/Mellow/Bright Upright, Rock, Ragtime)
Classical:  18–22 (Fortepiano-varianten, Harpsichord ×2)
```

UX-kans: deze ~11 piano's verdienen een eigen "Piano-keuzehulp" (vergelijkend,
met de v2-varianten als paren) los van de 324-grid.

**Piano Designer: ❌ via gedocumenteerde MIDI.** De Implementation bevat geen
enkel bericht voor Ambience, Key Touch, snaar-/demperresonantie of andere
Designer-parameters — er ís geen adresmodel om ze op aan te spreken (§1.1).
Roland's eigen Piano App doet dit via propriëtaire, ongedocumenteerde
berichten. Conform de opdracht doen we daar geen aannames over.

- *Optioneel experiment (buiten scope, unsupported)*: de officiële app
  sniffen met een MIDI-monitor en de berichten reverse-engineeren. Risico:
  ongedocumenteerd gedrag, breekt mogelijk per firmware. Niet inplannen;
  hooguit een spike als alles anders af is.
- **Elegant alternatief — "Klank-tweaks"-paneel met wat wél gedocumenteerd
  is**: GPC Reverb (type Room1/2/3, Hall1/2, Plate + Reverb Time), GPC Chorus
  (type/rate/depth/feedback), Master Fine Tuning (de 440↔442 Hz-tabel staat
  letterlijk in de Implementation), CC91/93 sends en CC71–78
  sound-controllers per part. De UI is er eerlijk over: deze tweaks gelden
  voor het MIDI-domein; **Ambience en Key Touch blijven paneelwerk** en
  worden alleen gelogd (Recording Log-veld, zoals gids-tip 14 al voorstelde).

**Werk**: FE **M** (practice-UI; engine bestaat dan al), FE **S**
(tweaks-paneel), BE **S** (starttempo-veld/data).

---

## 3. Platform, UX & Architectuur

### 3.1 Meertaligheid (i18n) & Wikipedia-integratie

**UI-strings.** `next-intl` met een `[locale]`-segment in de App Router;
locales `nl` (default), `en`, `es`, `fr`, `de`. Het stringvolume is klein
(filterbalk, MidiBar, wizards) → statische message-files, eenmaal opgezet
goedkoop te onderhouden. Locale-keuze: URL-prefix (deelbaar, SEO) +
`Accept-Language`-redirect bij eerste bezoek.

**Wikipedia-content: langlinks, géén vertaal-API.** Elke taal-Wikipedia heeft
native artikelen van hogere kwaliteit dan elke machinevertaling, gratis en
zonder licentievragen. Strategie:

1. Bij de bestaande warmup per tone: `action=query&prop=langlinks` op de
   huidige pagina-titel → titels voor es/fr/de (en nl/en).
2. Per taal de al gebruikte REST summary-endpoint van dié wiki aanroepen
   (`https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}`).
3. Schema: `wiki_data` krijgt een `lang`-kolom met unique key
   `(page_title, lang)` (Flyway V-next); de lijst-API krijgt een
   `?lang=`-parameter en levert `shortSummary`/`thumbnailUrl` in die taal.
4. **Fallback-keten** is essentieel: niet elk instrument heeft een artikel in
   elke taal → gevraagde taal → `nl` → `en`, met een klein "🌐 nl"-badge als
   de fallback actief is.

**Vertaal-API's — alleen voor eigen redactionele velden** (`tags`,
`funFacts`, `combinationSuggestions`): eenmalige batch, resultaat opslaan in
DB, daarna handmatig bijschaven. Opties:

| Dienst | Gratis ruimte | Student Pack? |
|---|---|---|
| DeepL API Free | 500k tekens/mnd | nee (los gratis account) |
| Azure AI Translator F0 | 2M tekens/mnd | ✅ via Azure-studentcredits in het Pack |
| Lokale files (handwerk/AI-geassisteerd) | — | n.v.t. |

Aanbeveling: **DeepL Free voor de eenmalige batch** (beste NL↔EU-kwaliteit;
het volume — 324 tones × ~300 tekens × 4 talen ≈ 400k tekens — past in één
maand-quotum), géén runtime-afhankelijkheid van een vertaaldienst. De
klank-tags (vaste woordenlijst van ~21 termen) gewoon als handvertaalde map in
code.

**Werk**: FE **M** (next-intl + refactor strings), BE **M** (lang-kolom +
langlinks in warmup + API-param), eenmalig **S** (batch-vertaling).

### 3.2 Toetsenbordnavigatie & snelle auditioning

**Doel**: 324 klanken vergelijken zonder muis — pijltjes door de grid, Enter
triggert de tone op de piano. Dit maakt de bibliotheek een *instrument*.

- **Roving tabindex** op de grid (ARIA `role="grid"`-patroon): één
  tabindex=0-kaart, pijltjes verplaatsen focus (kolomaantal uit de
  CSS-breakpoint kennen we client-side), Home/End, PageUp/Down per rij-blok.
- Toetsen: `Enter` = `sendTone` (+ registratie in Recent gespeeld), `Space` =
  modal, `F` = favoriet, `/` = focus op zoekveld, `Esc` = modal dicht/zoek
  leeg.
- **Auditioning-modus** (toggle in de MidiBar, ook voor de demo-waarde):
  focus stuurt de tone automatisch na ~150 ms debounce — pijltje-pijltje-
  pijltje wordt klank-klank-klank. Debounce voorkomt een Bank/PC-storm bij
  het doorscrollen; de LX708 wisselt klanken verder zonder klikken ("The
  sound will change beginning with the next note-on", Implementation p. 3 —
  wisselen mag dus zelfs terwijl je speelt).
- Zichtbare focus-ring (Tailwind `ring-accent`) + `aria-live`-regio die de
  tone-naam annonceert (screenreaders meegenomen).

**Werk**: FE **M**, BE **—**. Geen dependencies.

### 3.3 Quick Access & History ("Recent gespeeld")

**Bestaat al in de basis**: `useRecentlyPlayed` (localStorage, max 10,
nieuwste eerst) + `RecentlyPlayedRow`, gevuld vanuit de ▶-knop. Uitbreidingen
die het van handig naar onmisbaar tillen:

1. **Pinnen**: een tone vastzetten in de rij (sessie-werkset; favorieten zijn
   permanent, pins zijn "vandaag").
2. **Frequentie-laag**: naast "recent" ook "vaak gespeeld" (teller per
   toneKey, decay per week) — één gecombineerde rij met twee tabs.
3. **Sessie-herstel**: bij verbinden de laatst gestuurde tone tonen met één
   "↻ opnieuw sturen"-knop (de piano onthoudt zijn klank na uitzetten niet
   per se zoals de app hem achterliet).
4. **Bron-integratie**: triggers vanuit keyboard-nav (§3.2), presets (§2.7)
   en practice (§2.9) registreren óók — `record()` aanroepen op één centrale
   plek in `sendTone` i.p.v. per knop.

```
┌ Recent ▾ | Vaak ─────────────────────────────────────────────┐
│ 📌 European Grand · 🎻 SymphonicStr1 · 🎹 EP Belle · ⏱ Harp …│
└──────────────────────────────────────────────────────────────┘
```

**Werk**: FE **S/M**, BE **—**.

### 3.4 Deep-linking & URL-state-management

**Architectuurvoorstel.** Filters, categorie, tags, zoekterm én open modal in
de URL: `/?cat=Strings&tag=warm&q=viool&tone=Strings%238`.

- **Bibliotheek**: `nuqs` (typed search params voor de App Router, klein, geen
  verdere deps) — verdedigbaar t.o.v. handmatig `useSearchParams` +
  `router.replace`, omdat het debouncen, serialisatie en shallow-updates
  correct afhandelt; dit zelf goed bouwen is verrassend foutgevoelig
  (back-button-loops, scroll-resets).
- **History-beleid**: `push` voor betekenisvolle navigatie (categorie,
  collectie, modal openen), `replace` voor continue input (zoekveld,
  debounced 300 ms). Zo doet de back-button wat je verwacht: modal dicht →
  vorige filterstaat → vorige categorie.
- **Modal als URL-state**: `?tone=<toneKey>` (de bestaande stabiele
  `toneKey()` is hiervoor gemaakt) → deelbare links naar één instrument, en de
  modal overleeft refresh.
- **SSR**: `page.tsx` leest `searchParams` zodat de eerste render al
  gefilterd is (geen flits van "alles").
- **Delen-knop** in de filterbalk: kopieert de huidige URL (en is meteen de
  testcase dat álle state erin zit).

**Werk**: FE **M** (state-refactor van `useState` naar URL), BE **—**.

### 3.5 Ergonomie: PWA, sticky UI & Dark Mode

**PWA (tablet op de muziekstandaard).**

- `app/manifest.ts` (Next built-in): `display: "standalone"`, naam/iconen
  (maskable 192/512), `theme_color` afgestemd op het studio-thema,
  `start_url: "/"`.
- Service worker via `@serwist/next` (de onderhouden opvolger van
  next-pwa) — configuratie deelt hij met §3.6.
- **Screen Wake Lock API** (`navigator.wakeLock`): hét muziekstandaard-detail
  — scherm blijft aan tijdens spelen/oefenen. Aanzetten zodra MIDI verbonden
  is of de mirror/practice-modus actief is; netjes loslaten bij blur.
- Fullscreen-knop (⛶) op mirror en practice (`requestFullscreen`), want ook
  als PWA blijft de adresbalk soms staan op tablets.

**Sticky UI tegen scroll-vermoeidheid bij 324 kaarten.**

```
┌─ sticky top ───────────────────────────────────────────────┐
│ [zoek 🔍] [cat ▾] [klank ▾] [collecties]   🎹 ● LX708  ch4 │ ← compact:
├────────────────────────────────────────────────────────────┤   FilterBar +
│  (grid scrollt hieronder)                                  │   MidiBar
│                                              [↑ top]      │   versmolten
```

- FilterBar en MidiBar versmelten gescrold tot één compacte sticky regel
  (`position: sticky` + `IntersectionObserver` voor de compact-toggle,
  backdrop-blur). De volledige MidiBar (klavier, uitgang-select) klapt uit
  via de status-dot.
- "↑ top"-knop en `scroll-margin` op categorie-ankers.

**Studio/Dark Mode.** De app is al donker; formaliseren tot drie thema's op de
bestaande CSS-tokens (`bg-surface`, `text-muted`, …):

- `light` / `dark` (huidig) / **`studio`**: echt-zwarte achtergrond (OLED),
  gedempte accenten, lager contrast op niet-essentiële chrome — geen fel wit
  oppervlak dat in een donkere kamer schittert.
- Implementatie: `data-theme` op `<html>`, inline no-flash-script in
  `layout.tsx` (localStorage → `prefers-color-scheme`-fallback), toggle in
  `SiteNav`. Tailwind 4: thema-tokens als CSS custom properties per
  `[data-theme]`-blok.

**Werk**: FE **M** (PWA+wake lock **S**, sticky **S**, theming **S/M**), BE **—**.

### 3.6 Perceived performance & caching

- **Shimmer-placeholders**: skeleton-kaarten (`animate-pulse` op de bestaande
  kaart-layout) tijdens de eerste query; thumbnails met vaste afmetingen +
  lichte blur-in bij load (layout shift is al afgedekt via `next/image`).
  De warmup-indicator (bestaat al) blijft de bron van "er komt nog meer".
- **Service worker-strategieën** (Serwist, gedeeld met §3.5):
  - app-shell + statische assets: precache;
  - `GET /api/tones` & categorieën: stale-while-revalidate (oude lijst
    direct, verversing op de achtergrond);
  - wiki-thumbs (`/api/wiki-thumbs*`): cache-first met `maxEntries` ~400 en
    expiratie — na één volledige browse-sessie is de hele bibliotheek
    offline beeldend;
  - offline-fallback-pagina voor navigaties.
- **Offline-bruikbaar zonder wifi**: de tones-payload extra in IndexedDB
  spiegelen (TanStack Query `persistQueryClient` met de IDB-persister) zodat
  de grid ook rendert als de SW-cache koud is. Web MIDI werkt offline gewoon
  — een verbonden piano zonder wifi blijft dus een volledig werkende
  klankenkiezer, wat precies het muziekstandaard-scenario is.
- Indicator "✓ offline beschikbaar" in de footer zodra precache + tones-cache
  compleet zijn.

**Werk**: FE **M** (SW-config + skeletons + persist), BE **S**
(cache-headers/ETags op de lijst-API als die er nog niet zijn).

---

## 4. Gefaseerd prioriteitenvoorstel

Rationale: eerst de frictie uit het dagelijkse browsen (fase 0 — klein werk,
direct voelbaar), dan de studio-kern die de app uniek maakt en waar alle
andere studio-features op stapelen (fase 1: scheduler → metronoom → recorder),
dan het beheer-ecosysteem (fase 2), platformvolwassenheid (fase 3) en
verdieping (fase 4).

| Fase | Inhoud | Omvang | Bouwt op |
|---|---|---|---|
| **0 — Frictie weg** | URL-state & deep-linking (§3.4) · sticky filter/MIDI-balk (§3.5) · keyboard-nav + auditioning (§3.2) · shimmer-skeletons (§3.6) · Recent-gespeeld-uitbreiding (§3.3) · Identity-handshake badge (§2.3) | FE M, BE — | — |
| **1 — Studio-kern** | Lookahead-scheduler + metronoom via piano-drumkit (§2.2) · webapp MIDI-recorder met count-in/N-maten/overdub/punch + SMF-export (§2.1) · MIDI-mirror pianorol (§2.6) | FE L, BE — | fase 0 (event-subscribe in useMidi) |
| **2 — Recording Log** | recordings-schema + upload + SMF/WAV-parsing (§2.3, §2.4) · wavesurfer + markers (§2.8) · paneel-wizards intern/USB (§2.1, §2.4) | FE M, BE M | fase 1 (takes landen in de log) |
| **3 — Platform** | PWA + wake lock + offline caching (§3.5, §3.6) · studio-thema (§3.5) · i18n NL/EN eerst, dan ES/FR/DE + wiki-langlinks (§3.1) | FE M/L, BE M | — (parallel aan 2 mogelijk) |
| **4 — Verdieping** | Web Dual/Split-presets (§2.7) · transpose-verkenner + Master Coarse Tuning (§2.5) · practice-tempoladder (§2.9) · klank-tweaks-paneel GPC/CC (§2.9) · notenbalk-weergave (§2.6) | FE L, BE S | fase 1 (echo/scheduler/recorder) |

**Buiten de roadmap** (expliciet niet doen): interne recorder/metronoom op
afstand bedienen, song-metadata via SysEx, Piano Designer via MIDI — niet
ondersteund door het instrument; de alternatieven hierboven dekken de
onderliggende behoeften.

## 5. Openstaande verificaties op het instrument

Vijf aannames die vóór de bouw van fase 1/4 een kwartier aan de piano kosten:

1. **Master Coarse Tuning** (`F0 7F 7F 04 04 00 4C F7` = +12): verschuift de
   lokale klank van het klavier mee? → bepaalt of de transpose-slider (§2.5)
   "echt" kan.
2. **Native banks op GM2-parts**: accepteert bijv. ch 5 `Bank 0/68 + PC 1`
   (European Grand)? → bepaalt de klankrijkdom van takes en Web Dual (§2.1,
   §2.7).
3. **Drumkit + metronoomnoten**: klinkt `120/0/1` + noot 33/34 op ch 10 (en
   op een ander kanaal)? → metronoom-route C (§2.2).
4. **Noten naar ch 4**: klinken die door de lokale part (en mengen ze met
   live spel)? → playback-strategie van de "klavier-laag" (§2.1).
5. **Echo-latency meten** (note-in → note-out roundtrip): bevestigt de
   Web Dual-geschiktheid per klanktype (§2.7).
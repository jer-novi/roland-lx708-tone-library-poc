# Live-layering & RA-30-arranger — uitwerking

Detail-document bij de **live-performance & hardware-track** in `roadmap.md`. Bevat de
uitwerking van de layer-spike, de openstaande hardware-vragen, en de stap-voor-stap-
uitwerking van de layering-engine (LP-Fase 2) en de RA-30-arranger-integratie (LP-Fase 3).

Bron-doc (niet gesynct naar `frontend/content/`).

## Status

| Onderdeel | Status |
|---|---|
| LP-Fase 1 — combo-content (Artiest + Film) | ✅ gebouwd (29 combo's) |
| LP-Fase 2a — layer-spike | ✅ gebouwd, **wacht op hardware-test** |
| LP-Fase 2b/2c — layer-engine + UI | ⏳ na spike-resultaten |
| LP-Fase 3 — RA-30-arranger + multi-device | ⏳ hardware aanwezig, te bouwen |
| Geparkeerd — "Verras me" met AI | ⏸ aparte iteratie |

---

## 1. De layer-spike

### Wat & waarom
Een **spike** is een klein wegwerp-experiment om eerst één technische onzekerheid weg te
nemen vóór we de echte feature bouwen — je investeert in kennis, niet in code/UI. De
LX708-hardware kan via Split/Dual maar **2** klavierklanken tegelijk. Voor 4 lagen (de
helft van het klavier met tone 1+2, de andere helft met tone 3+4) moeten we de
**multitimbrale GM2-soundengine over losse MIDI-kanalen** gebruiken, plus een software-
note-router voor live spelen. Of dat werkt en goed voelt, weten we pas op de echte piano.

### Waar in de code
- `frontend/components/LayerSpike.tsx` — experimenteel paneel (oranje, onder het
  Speel-lab; alleen zichtbaar als Web MIDI beschikbaar is). Ingehaakt in `app/page.tsx`.
- `frontend/hooks/useMidi.ts` — nieuwe `onNote(listener)`-subscription: vuurt direct bij
  binnenkomende note-on/off (los van de re-renderende `activeNotes`-state), zodat live
  routing lage latency heeft. **Dit blijft** — de echte engine gebruikt dezelfde haak.

### Wat het paneel doet
- Per laag (4 rijen): aan/uit, **MIDI-kanaal** (default 1/2/5/6 — botst niet met de
  Local-klank op ch 4 of GM-drums op ch 10), **klank** (uit de catalogus → Bank/PC),
  en **zone** (Heel klavier / Laag / Hoog t.o.v. het splitpunt).
- **▶ Test** (per laag) en **▶ Test alle ingeschakelde tegelijk** — speelt een C-akkoord
  op de betreffende kanalen.
- **Local Control Aan/Uit** (CC122 op alle 16 kanalen).
- **Live route** + **Splitpunt** — stuurt fysiek gespeelde noten door naar de
  ingeschakelde kanalen, gefilterd op zone.
- Bij verlaten/sluiten: automatische `panic()` (all-notes-off).

### Hoe te testen (handleiding)
1. `cd frontend && pnpm dev` (+ Docker-backend voor de volledige tonenlijst), open in
   **Chrome/Edge**, verbind met de LX708, klap **🧪 Layer-spike** open.
2. Zet 2–4 lagen aan, kies kanalen + klanken, druk **Test** en **Test alle**.
3. Zet **Local Control: Uit** en speel op de piano.
4. Zet **Live route** aan en speel; verstel het **Splitpunt** en de zones.
5. **Zet Local Control daarna weer Aan** (of herstart de piano) voor normaal spelen.

---

## 2. Openstaande vragen (in te vullen na de hardware-test)

> Vul hieronder de bevindingen in; die bepalen LP-Fase 2b/2c.

1. **GM2-multitimbraal hoorbaar per kanaal?**
   - Klinkt elke laag apart (Test) en meerdere tegelijk (Test alle)? ____
   - Welke kanalen werkten / welke niet (bv. botsing met ch 4 Local, ch 10 drums)? ____
   - Worden Bank/PC per kanaal correct opgepakt (juiste klank)? ____
2. **Local Control uit = geen dubbel geluid?**
   - Stopt met *Local Control: Uit* de eigen pianoklank bij fysiek spelen? ____
   - Reageert de LX708 op CC122, of is er een SysEx/menu-route nodig? ____
   - Komt Local automatisch terug na herstart / moeten we hem expliciet weer aanzetten? ____
3. **Live routing — latency & gevoel.**
   - Voelt het strak genoeg om op te spelen, of merkbare vertraging? ____
   - Hangende noten / dubbele note-offs? ____
4. **Velocity & expressie.** Komt aanslaggevoeligheid goed door naar de GM2-parts? Sustain
   (CC64) ook doorsturen? ____
5. **Octaaf/volume per laag.** Werkt per-kanaal volume (CC7) en willen we per laag een
   octaaf-offset (zoals de zone-octaafshift)? ____

---

## 3. LP-Fase 2 — uitwerking layering-engine

**Beslisboom o.b.v. de spike:** strak genoeg → volledige live-router; valt live tegen →
beperk tot app-playback-layering (Speel-lab/MIDI-speler over meerdere kanalen).

### 2b — `frontend/hooks/useLayerEngine.ts` (nieuw)
- Bovenop `useMidi`; abonneert via `midi.onNote`.
- Config: tot 2 zones (splitpunt) × 2 tonen = 4 kanalen; per laag `{ channel, tone,
  enabled, zone, octave, volume }`.
- Bij activeren: per kanaal Bank/PC sturen (hergebruik de send-logica uit
  `hooks/useMidi.ts` `sendTone`/`sendRaw`). Eventueel Local Control uit.
- Per binnenkomende noot: routeer naar de matchende kanalen; **houd per kanaal de
  werkelijk verzonden noten bij** voor schone note-offs (patroon van de MIDI-speler in
  `useMidiPlayer.ts`). Pas octaaf-offset toe vóór verzenden, clamp 0–127.
- Stuur sustain (CC64) door naar de actieve lagen indien nodig.

### 2c — `frontend/components/LayerPanel.tsx` (nieuw)
- Nette UI (vervangt de spike): per laag tone-picker, aan/uit, zone, octaaf, volume.
- Splitpunt-instelling (hergebruik de visuele splitmarkering op het live klavier).
- **Local-Control-toggle** + duidelijke waarschuwing/auto-herstel.
- Persisteren in localStorage (patroon van `hooks/useFavorites.ts`).
- Werkt ook voor app-playback: Speel-lab/MIDI-speler kunnen naar de lagen routeren.

### Aandachtspunten
- Houd dit **gescheiden** van de hardware Split/Dual (`useStudio`): dat is de 2-klanks
  klavier-engine; layering is de GM2-multitimbrale laag eroverheen.
- Zet Local Control altijd netjes terug bij uitschakelen/unmount.

---

## 4. LP-Fase 3 — RA-30-arranger + multi-device hub

Bron: `docs/Roland RA-30 Full Manual.md` (OCR) + Roland RA-30 Owner's Manual.

### Bevestigde RA-30 MIDI-feiten
- **GS-soundmodule-modus** (boot met *Others* ingedrukt): 16-part multitimbraal, standaard
  GS → Bank/PC + noten op kanalen 1–16 = **derde geluidsbron**. Reageert op standaard
  GS-CC's (vol 7, expressie 11, pan 10, reverb 91, chorus 93, sustain 64, bank 0/32).
- **Arranger-modus default-kanalen:**
  - CH1 = akkoord/noot → Arranger 1 **+ Style Program Change**
  - CH2 = bas, CH5/CH6 = accompaniment 1/2, CH10 = drums
  - CH3 / CH13 = noot → Arranger 2 / 3, CH4 = Upper, CH16 = Manual Drums
- **Stijl kiezen** = Program Change op CH1. **Akkoord-invoer** = noten op CH1 → de band
  start via **Sync Start**. **Chord Intelligence** (aan) vereenvoudigt akkoorden
  (majeur = grondtoon, mineur = grondtoon + kleine terts, enz.).
- **Tempo** via MIDI-clock (slave). Verbinding: E.P. MIDI OUT → RA-30 IN, RA-30 OUT → E.P.
  IN; E.P. op kanaal 1, **Local OFF**.
- **Splitpunt** arranger standaard F#3/G3; instelbaar.

### Beschikbare hardware
2×2 USB-MIDI-hub, iRig Keys (2e input, pitch/mod), Korg nanoKONTROL, Maschine MK2
(pads/CC). De app (Web MIDI) kan elke aangesloten poort als in/uit gebruiken.

### Device-topologie (doel)
- **Inputs:** LX708 (hoofdklavier), iRig Keys (2e input / akkoordinvoer), nanoKONTROL
  (control surface), Maschine MK2 (pads/CC, optioneel).
- **Outputs:** LX708-soundengine (GM2), RA-30 (via de 2×2-hub).

### Stappen
- **3a — Multi-device foundation** (`hooks/useMidi.ts`): van één auto-gekozen output naar
  **rol-gebaseerde poorten** (LX708-out, RA-30-out) + meerdere inputs; rol→poort-config +
  persistentie. *(Fundamentele uitbreiding; ook nuttig voor LP-Fase 2 richting RA-30.)*
- **3b — RA-30 als GS-soundbron:** boot in GS-modus; stuur Bank/PC + noten naar de
  RA-30-poort (hergebruik de layer-engine met de RA-30 als doel) → derde laag.
- **3c — RA-30 als backing-band** — nieuwe **"Band / Arranger"-tab in het Speel-lab**
  (`components/SpeelLab.tsx`), de beste integratieplek omdat daar de progressie-/akkoord-
  engine en transport al zitten (`hooks/useChartPlayer.ts`, `lib/progressions.ts`):
  - Stijl via PC op CH1.
  - Akkoorden voeden via (i) de progressie-engine, of (ii) **live akkoorddetectie van de
    LX708** — hergebruik `detectChord` uit `components/MidiKeyboard.tsx` → Sync Start.
  - Tempo-sync via MIDI-clock vanuit de chart-transport.
- **3d — Controllers:** nanoKONTROL-CC's → transport (start/stop, tempo, fills) +
  laag-volumes; Maschine MK2-pads → fills/intro/ending of stijlwissel (optioneel).

### Beste integratieplek
De arranger past het beste als **Band/Arranger-tab in het Speel-lab**: de progressies (of
live LX708-akkoorden) sturen de RA-30-band, jij soleert op de LX708, de nanoKONTROL
bedient het transport.

### Open RA-30-vragen
- **Expliciete Start/Stop/Fill/Intro/Ending via MIDI?** De OCR noemt vooral Sync-Start
  (via akkoord) en paneel/pedaal-functies; controleren of de RA-30 op MIDI-realtime
  Start/Stop (FA/FC) reageert. Sync-Start via akkoord is de zekere route.
- **Style-nummering:** welke PC-waarde op CH1 hoort bij welke stijl (chart aanvullen).
- **Latency** van de keten app → hub → RA-30 (backing band hoeft niet sample-strak, maar
  toetsaanslag-naar-klank wel).
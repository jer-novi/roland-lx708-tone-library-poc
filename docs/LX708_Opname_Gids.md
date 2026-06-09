# Roland LX708 — Opname- & Compositiegids

Praktische referentie gebaseerd op de officiële LX708/LX706/LX705 handleiding (NL, versie 04) en de MIDI Implementation (v1.00, aug 2021).

---

## 1. De belangrijkste knoppen voor opname

| Knop | Functie |
|------|---------|
| **[●] (opname)** | Zet de piano in opname-standby. Nogmaals drukken annuleert. |
| **[▶/■] (play/stop)** | Start de opname (na 1 maat aftellen bij interne opname) en stopt hem. Ook play/stop voor songs. |
| **[Part]** | Kies welk gedeelte (Left/Right) je opneemt of juist uitschakelt. Knipperend = wordt opgenomen, opgelicht = al opgenomen, donker = uit. |
| **[Split/Dual]** | Schakelt tussen Split Play, Dual Play en uit. Meerdere keren drukken wisselt het scherm. |
| **[Tempo]-regelaar** | Tempo van metronoom/song; lang indrukken = terug naar standaard. |
| **Functieknop + draairegelaar** | Kies opnameformaat: **SMF** (intern, MIDI) of **Audio** (USB-stick): houd de song-knop ingedrukt en draai naar "Audio". |

## 2. Hoeveel klanken kun je stapelen?

**Live op het instrument: maximaal 2.**

- **Dual Play**: twee klanken gestapeld over het hele klavier (bijv. European Grand + SymphonicStr1). Balans instelbaar via *Balance (Split, Dual)*.
- **Split Play**: twee verschillende klanken links/rechts van een instelbaar splitspunt.

**Maar via opnemen kun je verder stapelen:**

1. **Intern overdubben (SMF/MIDI)**: neem eerst één hand/part op, en overdub daarna het andere part — zelfs over een interne song heen. Per part kun je een andere (dual-)klanklaag gebruiken. Let op: een part dat al is opgenomen en weer op "knipperend" wordt gezet, wordt **overschreven**.
2. **Audio naar USB-stick**: elke pass wordt een **WAV (44,1 kHz / 16-bit lineair)**. Onbeperkt stapelen door passes te exporteren en in Ableton te combineren.
3. **Via de DAW (aanbevolen voor producties)**: LX708 → Rubix22 → Ableton Live. Zo leg je audio én MIDI tegelijk vast en is het aantal lagen onbeperkt. Zie `Studio_Routing_Ideeenboard.md`.

> **Tip:** audio-opnames kunnen *niet* in het interne geheugen worden opgeslagen — daarvoor is altijd een USB-stick nodig. Trek de stick nooit uit terwijl de toegangsindicator knippert.

## 3. Interne opname-workflow (SMF)

1. Kies je klank (en eventueel Dual/Split).
2. Druk op **[●]** → opname-standby ([▶/■] knippert).
3. Kies met **[Part]** welk gedeelte je opneemt (Left = linkerhand, Right = rechterhand). Geen keuze = beide op Right.
4. **[▶/■]** → 1 maat aftellen → opname loopt.
5. Stop met **[▶/■]**; de song wordt intern opgeslagen en kan naar USB worden gekopieerd (Copy Song in het functiemenu).

**Overdubben:** selecteer de bestaande song → [●] → ga naar het *Overdub*-scherm → kies met [Part] het nieuwe part → opnemen. Je kunt ook het tempo van een interne song vastleggen en daaroverheen spelen.

## 4. Audio-opname naar USB

1. USB-stick in de USB Memory-poort.
2. Klank kiezen.
3. Song-knop ingedrukt houden + draairegelaar → **"Audio"**.
4. [●] → standby, [▶/■] → opname start en wordt automatisch opgeslagen als WAV.

Resultaat is direct bruikbaar in Ableton, voor een cd of online.

## 5. Klank-features die je mix beïnvloeden

- **Ambience Depth (0–10)**: de ingebouwde ruimte/galm. Voor opnames die je later in Ableton van reverb voorziet: laag zetten (0–2) zodat je "droog" opneemt. *Galm wordt niet toegepast op audiobestanden die je afspeelt.*
- **Key Touch**: aanslaggevoeligheid — beïnvloedt de dynamiek van je MIDI-data.
- **Headphones 3D Ambience**: alleen voor koptelefoonbeleving; staat los van wat er via USB/line uitgaat.
- **Volume Limit**: handig om clipping te voorkomen bij vaste gain-instelling op de Rubix22.

## 6. MIDI-feiten (uit de MIDI Implementation)

- Zenden/ontvangen via **USB Computer-poort** en **Bluetooth MIDI** (geen klassieke DIN-poorten).
- MIDI-zendkanaal instelbaar (*MIDI Transmit Ch.*), kanalen 1–16; ontvangt op alle 16 kanalen — de GM2-set is dus **multitimbraal via MIDI** bespeelbaar vanuit Ableton/Maschine: meerdere GM2-klanken tegelijk op verschillende kanalen, met Bank Select + Program Change.
- Ondersteunt Bank Select (CC0/CC32) + Program Change om alle 324 tones extern op te roepen, plus CC1 modulatie, CC64 sustain, CC66/67 sostenuto/soft.
- **Let op:** de tone-demo's en interne songs worden *niet* via USB/Bluetooth MIDI uitgezonden.

## 7. Genre-tips

### Techno / Deephouse
- Neem de LX708 **droog** op (Ambience 0–1), layer in Ableton met een TR-808/909 groove uit Maschine.
- GM2 **TR-808 Tom**, **Synth Bass 1/2** en **ANALOG Set** zijn directe knipogen naar Roland's dance-erfgoed.
- Sidechain de piano/pad-laag op de kick; **Warm Pad** of **Sine Pad** als sublaag onder stabs.
- **Pop EP** of **FM E.Piano** door een chorus + delay = instant deephouse-chord-stabs.

### Pop
- **American Grand** (directer) vaak beter in een dichte mix dan European Grand.
- Dual: piano + **Soft Pad** of **Choir 1**, laag in de mix.
- Dubbel opnemen (audio + MIDI tegelijk via Rubix22 + USB-MIDI): MIDI als vangnet om later noten te fixen en een VST-laag toe te voegen.

### Jazz
- **Combo Jz.Org** in Split met **AcousticBass**: linkerhand walking bass.
- **1976SuitCase** met een vleugje eigen Ambience (3–4) voor ballads; **JAZZ Set**/**BRUSH Set** als GM2-begeleiding via MIDI.

### Modern klassiek (Nils Frahm / Ólafur Arnalds-stijl)
- **Upright Piano** of **Mellow Upright** + microfoons dicht op de kast voor mechanische geluiden (hamers, pedaal) — juist die "ruis" is het genre.
- Dual met **SymphonicStr1** of **Warm Pad** heel zacht eronder.
- Neem ook de room-mics op (zie routingboard, setup C).

### Folk
- **Steel-str.Gt**, **Mandolin**, **Fiddle**, **Accordion** uit GM2 als schetsinstrumenten via MIDI; later vervangen of juist lo-fi houden.
- Upright-piano's met lage Ambience passen mooi onder zang (mic via Rubix22, kanaal 2).

## 8. Compositie-snelstart per sessie

1. Kies een referentietone in de webapp (filter op categorie/subcategorie).
2. Check de *combination suggestions* bij de tone voor een Dual/Split-startpunt.
3. Schets met interne SMF-opname (parts L/R) — geen computer nodig.
4. Klaar om te produceren? Schakel naar setup A of B uit het routingboard en leg audio + MIDI tegelijk vast.

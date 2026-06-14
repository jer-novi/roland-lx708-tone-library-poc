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

> Gear-context bij alle tips: LX708 + Rubix22 (2 in / 2 uit) + Maschine MK2 + Ableton Live, 2 microfoons, en akoestische instrumenten in huis: **gitaar** (jij) en **ukelele** (Judith).

### Elektronisch

#### Techno / Deephouse
- Neem de LX708 **droog** op (Ambience 0–1), layer in Ableton met een TR-808/909 groove uit Maschine.
- GM2 **TR-808 Tom**, **Synth Bass 1/2** en **ANALOG Set** zijn directe knipogen naar Roland's dance-erfgoed.
- Sidechain de piano/pad-laag op de kick; **Warm Pad** of **Sine Pad** als sublaag onder stabs.
- **Pop EP** of **FM E.Piano** door een chorus + delay = instant deephouse-chord-stabs.

#### Melodische techno (Tale Of Us / Afterlife-stijl)
- **Sine Pad** of **Bowed Glass** als melodische hoofdlaag, octaaf lager dubbelen met **Synth Bass 2**.
- Speel arpeggio's op de LX708 als MIDI in en kwantiseer naar 1/16; stuur dezelfde MIDI naar een Maschine-pluck én terug naar de piano (GM2 **Crystal** of **Synth Mallet**) — twee texturen, één performance.
- Lange spanningsbogen: automatiseer in Ableton een low-pass filter over de gestackte lagen.

#### Classic house / piano house (90s, "Show Me Love")
- Hét genre voor deze piano: **Rock Piano** of **Bright Upright**, korte stabs, beetje los gekwantiseerd.
- In Ableton: transponeer samples van je eigen stabs +5/+7 semitonen voor het klassieke pitched-piano-effect.
- **M1-achtig orgel-huis**: GM2 **Organ 2** of **Perc.Organ 1** met release kort.

#### Lo-fi hiphop / chillhop
- **Mellow Upright** of **Mellow Forte**, Ambience laag, opzettelijk niet strak spelen.
- In Ableton/Maschine: pitch-wobble (Wow & Flutter), vinylruis, low-pass rond 8 kHz, mono maken.
- Sample je eigen 4-maats loops in Maschine en chop ze — de LX708 wordt je eigen sample-bibliotheek.
- GM2 **Jazz Guitar** of echte gitaar (DI in Rubix22) met dezelfde lo-fi behandeling erbovenop.

#### Synthwave / retrowave
- **FM E.Piano** + **AnalogBrass1/2** + **Halo Pad** = instant 80s. GM2 **Square Lead1** voor melodieën.
- LinnDrum-achtige drums uit Maschine; alles door een lichte chorus.

#### Ambient / drone
- **Sweep Pad**, **Space Voice**, **Itopia**, **Halo Pad** met sustainpedaal vastgehouden → opnemen → in Ableton time-stretchen (4x) en reverben = instant drone-bed.
- Neem de pianospeakers op met je 2 mics terwijl je door de kamer loopt voor organische modulatie.

#### Downtempo / trip-hop
- **Vintage EP** of **60's EP** met veel ruimte, trage BRUSH-achtige drums.
- Echte gitaar met tremolo-effect in Ableton + **Tremolo Str.** uit GM2 als spookachtige dubbeling.

#### Liquid drum & bass
- **E.Grand** of **Pop EP** voor de typische soulvolle chords; pads eronder (**Warm Pad**).
- Neem chords als MIDI op, halveer het tempo bij inspelen (87 ipv 174 BPM) en versnel daarna.

### Met gitaar & ukelele (voor jou en Judith)

#### Singer-songwriter / indie-folk
- Basis: gitaar (mic 1 of DI) + zang (mic 2) via Rubix22; LX708 erbij als **MIDI** zodat beide ingangen vrij blijven.
- **Mellow Upright** vult gitaarakkoorden mooi aan zonder te concurreren: speel vooral *boven* de gitaar (rechterhand, octaaf 5–6) of juist alleen lage grondtonen.
- EQ-truc: high-pass de piano rond 200 Hz zodat de gitaarbody de warmte levert.

#### Ukelele-pop (Hawaiiaans / "Somewhere Over the Rainbow"-sfeer)
- Uke (mic, 20–30 cm bij de 12e fret) + **Hawaiian Gt** uit GM2 als slide-dubbeling via MIDI.
- Piano minimaal: enkele noten met **Music Box** of **Celesta** als sprankel-laag.
- Duo-opname met Judith: uke op IN 1, zang op IN 2, piano als MIDI — alle drie in één take.

#### Bossa nova / latin
- Nylon-gevoel: GM2 **Nylon-str.Gt** via MIDI of echte gitaar fingerpicking; uke kan de cavaquinho-rol pakken (kort, percussief strummen).
- Piano: **American Grand**, spaarzame comping op de 2&. GM2 **Agogo**/**Castanets** of Maschine voor percussie.

#### Country / americana
- **Honky-tonk** is er letterlijk voor gemaakt; combineer met **Steel-str.Gt** (echt of GM2) en **Fiddle**.
- Train-beat uit Maschine met brushes (**BRUSH Set** via MIDI kan ook).

#### Reggae / ska (leuk met uke!)
- De uke is een natuurlijke skank-machine: strum strak op de offbeats, mic dichtbij en dood de ruimte.
- Piano dubbelt de skank: **Bright Upright**, kort en staccato; orgel-"bubble" met **Organ 2** (linkerhand 1/8-noten).
- Bas: GM2 **FingeredBass** of **AcousticBass** via MIDI, diep en rond gemixt.

#### Blues / gospel / soul
- **Rock Piano** of **Ragtime Piano** voor blues; **Gospel Spin** (Leslie-orgel) is je gospelwapen — Dual met piano kan op het instrument zelf.
- Gitaar met slide + **TremoloOrgan** eronder = zuidelijk kerkje.
- 6/8 gospelballad: piano + **Choir 1** in Dual, echte handclaps via de mics, stack 3 passes.

#### R&B / neo-soul
- **1976SuitCase** of **EP Belle** door lichte auto-wah/phaser in Ableton; speel met veel 9ths/11ths.
- Gitaar: dead-notes en korte double-stops (Maschine-swing op 55–60%).
- D'Angelo-truc: kwantiseer drums strak maar speel keys/gitaar bewust achter de beat.

### Akoestisch / klassiek

#### Jazz
- **Combo Jz.Org** in Split met **AcousticBass**: linkerhand walking bass.
- **1976SuitCase** met een vleugje eigen Ambience (3–4) voor ballads; **JAZZ Set**/**BRUSH Set** als GM2-begeleiding via MIDI.

#### Modern klassiek (Nils Frahm / Ólafur Arnalds-stijl)
- **Upright Piano** of **Mellow Upright** + microfoons dicht op de kast voor mechanische geluiden (hamers, pedaal) — juist die "ruis" is het genre.
- Dual met **SymphonicStr1** of **Warm Pad** heel zacht eronder.
- Neem ook de room-mics op (zie routingboard, setup C).

#### Folk
- **Steel-str.Gt**, **Mandolin**, **Fiddle**, **Accordion** uit GM2 als schetsinstrumenten via MIDI; later vervangen door je echte gitaar/uke of juist lo-fi houden.
- Upright-piano's met lage Ambience passen mooi onder zang (mic via Rubix22, kanaal 2).
- Iers/keltisch: **Tin whistle-rol** kan met GM2 **Recorder** of **Pan Flute**; uke vervangt de bouzouki verrassend goed (capo + arpeggio's).

#### Pop
- **American Grand** (directer) vaak beter in een dichte mix dan European Grand.
- Dual: piano + **Soft Pad** of **Choir 1**, laag in de mix.
- Dubbel opnemen (audio + MIDI tegelijk via Rubix22 + USB-MIDI): MIDI als vangnet om later noten te fixen en een VST-laag toe te voegen.

### Artiest & film

#### Artiest-signaturen
- Herkenbare klanken van beroemde toetsenisten, in één klik via de **Combinaties → Artiest-signatuur**.
- **Vangelis** (AnalogBrass1 + Halo Pad) en **Jan Hammer** (AnalogBrass1 + Synth Bass 2 split) = de analoge CS-80/Prophet-zweef; speel brede, trage akkoorden.
- **Stevie Wonder** (Clav. + Rhodes) en **Herbie Hancock** (FM E.Piano + synthbas) = funk: 16e-feel, ghost-notes, achter de beat.
- **Nils Frahm / Einaudi** (upright + zachte pad) = intiem en repetitief; zacht aanslaan, pedaal halverwege.
- **Jon Lord / Keith Emerson / Rick Wakeman** = orgel-prog; stapel orgel met een snijdende lead of vuile gitaar.

#### Filmscore & soundtracks
- Cinematische texturen via **Combinaties → Filmscore**.
- **Interstellar** (Pipe Organ + Epic Strings) en **Inception** (Brass 1 + Epic Strings) = Zimmer-grandeur; trage hele noten, laat de galm het werk doen.
- **Blade Runner** (AnalogBrass1 + Atmosphere) = neon-noir; **Amélie** (upright + accordeon) = Parijse wals.
- **Schindler's List** (Violin + Slow Strings) en **Morricone-western** (Whistle + Rich Strings) = één zangerige melodielijn boven een strijkersbed.
- **Koor-finale** (Choir 2 + Orchestra) en **Pirates/Spielberg** (orkestbrass/vleugel + Epic Strings) = de grote climax.

## 7b. Productietips (mix & workflow)

**Opnemen**
1. **Altijd audio + MIDI tegelijk** als de kabels toch liggen — MIDI is gratis verzekering.
2. Mic-technieken met 2 mics: **XY** (compact stereo, geen fase-problemen) voor uke/gitaar; **spaced pair** voor piano-kast + room; **close + room** voor modern klassiek.
3. Check fase als je DI + mic combineert: flip polariteit in Ableton en kies wat voller klinkt.
4. Neem 10 seconden "stilte" op in je opnameruimte — handig als noise-print en als lo-fi ruisbed.

**Layeren & arrangeren**
5. Stapel nooit twee brede lagen in hetzelfde register: piano midden, pad eronder (low-passed), sprankel erboven (**Celesta**, **Music Box**, **Crystal**).
6. Gebruik de GM2-set als **arrangeer-schetsblok**: hele band via multitimbrale MIDI, daarna laag voor laag vervangen door echte gitaar/uke/VST's.
7. Sample de LX708 in **Maschine**: elke C van elke octaaf van je favoriete 10 tones opnemen → eigen multisample-kits, ook zonder piano beschikbaar.

**Mixen**
8. EQ-carving piano vs. gitaar/uke: piano high-pass ~150–200 Hz bij gitaar in de mix; uke leeft rond 2–4 kHz — dip de piano daar 2 dB.
9. Reverb als **send** (één ruimte voor alles) klinkt als een band in één kamer; aparte reverbs per spoor klinkt als losse overdubs. Kies bewust.
10. Comprimeer de som van piano-lagen samen (bus-compressie, 2–3 dB reductie) in plaats van elk spoor apart.
11. Mono-check: deephouse/lofi vaak smaller = krachtiger; klassiek/ambient mag breed.
12. Referentietrack via Bluetooth naar de LX708-speakers sturen en meespelen is prima voor schetsen — maar mix op de monitors via de Rubix22.

**Workflow**
13. Eén Ableton-template "LX708" met: audio-in 1/2, MIDI-track LX708, Maschine-track, returns (reverb/delay) en een resample-track. Scheelt elke sessie 10 minuten.
14. Noteer per opname de tone + Ambience-stand (de toekomstige "recording log"-feature in de webapp).
15. Werk in passes van max. 8 maten bij overdubben op de piano zelf; foutje = alleen die pass opnieuw (let op: een part opnieuw opnemen **overschrijft** het).

## 8. Compositie-snelstart per sessie

1. Kies een referentietone in de webapp (filter op categorie/subcategorie).
2. Check de *combination suggestions* bij de tone voor een Dual/Split-startpunt.
3. Schets met interne SMF-opname (parts L/R) — geen computer nodig.
4. Klaar om te produceren? Schakel naar setup A of B uit het routingboard en leg audio + MIDI tegelijk vast.

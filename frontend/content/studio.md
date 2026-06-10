# Studio Routing Ideeënboard

Apparatuur: **Roland LX708** · **Roland Rubix22** (2-in/2-uit audio-interface) · **Maschine MK2** + plugins · **Ableton Live** · klein extra MIDI-keyboard · **NI Kontrol** controller · **2 microfoons**.

De Rubix22 heeft 2 ingangen (XLR/TRS combo, met 48V fantoomvoeding) en 2 uitgangen — je kunt dus **per opnamepass kiezen**: piano stereo, óf 2 microfoons, óf piano mono + 1 mic.

---

## Setup A — "Producer" (techno / deephouse / pop)

Doel: LX708 als klankbron + MIDI-controller, Maschine voor drums/synths, alles in Ableton.

```
LX708 [Output L/R of headphone-out] ──(2x TRS)──► Rubix22 IN 1+2 ──USB──► Ableton (audio)
LX708 [USB Computer-poort] ───────────USB-MIDI──────────────────────────► Ableton (MIDI)
Maschine MK2 ──USB──► Ableton (plugin/MIDI-controller, drums & samples)
NI Kontrol ──USB──► Ableton (mixer/macro-bediening)
Rubix22 OUT L/R ──► monitors / koptelefoon
```

- Neem **audio en MIDI tegelijk** op: audio voor de "echte" LX708-klank, MIDI om later noten te fixen of een extra VST-laag (bijv. Maschine-synth) op dezelfde performance te leggen.
- Stuur MIDI vanuit Ableton terug naar de LX708 (zelfde USB-kabel) en gebruik de **GM2-set multitimbraal**: meerdere klanken op aparte MIDI-kanalen — zo omzeil je de 2-tonen-limiet van Dual Play volledig.
- Monitor via de Rubix22 (direct monitoring-knop) om latency te vermijden.

## Setup B — "Songwriter" (pop / folk, met zang)

Doel: piano + zang tegelijk vastleggen met maar 2 ingangen.

```
LX708 ──USB-MIDI──► Ableton  (piano als MIDI, klank = LX708 zelf of VST)
Mic 1 (zang)  ──XLR──► Rubix22 IN 1 (48V aan bij condensator)
Mic 2 (room/gitaar) ──XLR──► Rubix22 IN 2
```

- De piano gaat als **MIDI** binnen; render hem later door MIDI terug te sturen naar de LX708 en die pass als audio op te nemen (of gebruik een piano-VST). Zo blijven beide Rubix-ingangen vrij voor microfoons.
- Alternatief zonder her-rendering: neem de pianopass als **WAV op USB-stick** op de LX708 zelf op en sleep die in Ableton.

## Setup C — "Modern klassiek" (akoestische textuur)

Doel: de fysieke piano-ervaring vangen — kastresonantie, hamers, pedalen.

```
Mic 1 ──► Rubix22 IN 1   (dicht bij de bovenklep, gericht op de speakers/kast)
Mic 2 ──► Rubix22 IN 2   (room-mic, 1,5–3 m afstand)
LX708 ──USB-MIDI──► Ableton (parallel de MIDI vastleggen)
```

- De LX708 heeft een meerkanaals speakersysteem (waaronder een nearfield-paar onder de klep) — micen van het instrument geeft een verrassend "akoestisch" karakter dat een DI-signaal mist.
- Mix DI (latere render via setup A) + mics voor het Nils Frahm-effect: intiem + ruimte.
- Zet de Ambience van de piano laag; de room-mic levert de echte ruimte.

## Setup D — "Standalone schets" (geen computer)

```
LX708 intern: SMF-opname met Left/Right parts + overdub
LX708 ──► USB-stick: audio-passes als WAV (44,1 kHz/16-bit)
Bluetooth audio: telefoon/tablet ──► LX708 speakers (meespelen met referentietracks)
```

- Ideaal voor compositie zonder studio-opstart: schets intern, neem definitieve passes als WAV op, importeer later in Ableton.

## Setup E — "Hybride live-jam"

```
Maschine MK2 (standalone-ish: Ableton als host, loops/drums)
LX708 = master-keyboard (88 toetsen, MIDI ch. 1) ──► Ableton track-armed synths
Klein MIDI-keyboard ──► tweede instrument (bass/lead) of Maschine-pads-aanvulling
NI Kontrol ──► scene-launch & macro's in Ableton
Rubix22 OUT ──► speakers; LX708 Input/Bluetooth Vol. voor terugmonitoring
```

- Wijs het kleine keyboard en de LX708 aan verschillende Ableton-tracks toe (MIDI-from: specifiek device) zodat je twee instrumenten tegelijk live speelt.

---

## Praktische checklist

- [ ] **MIDI Transmit Ch.** op de LX708 instellen (functiemenu) als je multitimbraal werkt.
- [ ] **Local Control**: speel je de LX708 vanuit Ableton terug, let dan op dubbele noten (piano klinkt zelf + echo via DAW). Schakel in Ableton de MIDI-thru naar de LX708 uit, of monitor alleen het VST.
- [ ] Gain staging: LX708 line-out vol open klinkt het schoonst; regel volume op de Rubix22.
- [ ] 48V **alleen** aan bij condensatormicrofoons.
- [ ] Koop een USB-stick die je permanent in de piano laat zitten voor spontane WAV-opnames.
- [ ] Interne songs/demo's worden **niet** via MIDI uitgezonden — die kun je alleen als audio (mic of line) vangen.

## Toekomstideeën voor de webapp

- Routing-setups als data in de app (setup A–E) met per tone een aanbevolen setup.
- "Recording log": welke tone + setup + Ambience-stand gebruikt per sessie.
- Freesound/YouTube-samples per tone naast je eigen WAV-opnames (audio_samples-tabel is er al klaar voor).

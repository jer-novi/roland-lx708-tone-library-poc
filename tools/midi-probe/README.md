# LX708 MIDI Probe

Standalone reverse-engineering-tool voor de undocumented **Roland DT1/RQ1 SysEx** van de
LX708. Doel: het **model-ID** + adresmap achterhalen die de Roland Piano App gebruikt voor
functies die *niet* in de officiële MIDI Implementation staan (Split/Dual, recorder,
metronoom, Piano Designer, tuning, ambience).

## Achtergrond

De officiële `docs/lx708_midi_impl.txt` documenteert alleen de standaard-MIDI-laag
(GM/GM2, Bank Select/PC). De MIDI Implementation Chart bevestigt dat MIDI Clock,
Start/Stop, Song Position en Local On/Off **niet** worden herkend.

Maar de Roland Piano App / Piano Designer besturen het paneel toch — via undocumented
**DT1 (`0x12`, schrijven)** en **RQ1 (`0x11`, lezen)** SysEx:

```
F0 41 <devID> <model-ID: 4 bytes> <cmd> <adres: 4 bytes> <data/lengte> <checksum> F7
```

- Checksum = `(128 − (som van adres+data bytes mod 128)) mod 128`.
- FP-30 gebruikt model-ID `00 00 00 28` en vereist een "enable remote control"-handshake
  (`DT1 01 00 03 06 = 01`) vóór elke DT1. De LX708 heeft een **ander** model-ID en
  mogelijk een afwijkend handshake-adres → dat zoeken we hier uit.

Referentieprojecten (FP-modellen, als sjabloon): `bluebrother/fp30remote`,
`aortegaCampanillas/RolandFP30xController`, `motiz88/roland-sysex.js`.

## Gebruik

1. Open `index.html` in **Chrome of Edge** (Web MIDI + SysEx; werkt niet in Firefox/Safari).
   - Dubbelklikken (`file://`) volstaat meestal. Lukt SysEx-permissie niet, serveer dan
     even lokaal: `python -m http.server 8765` en open `http://localhost:8765/`.
2. Sluit de LX708 via **USB** aan (of Bluetooth-MIDI gekoppeld).
3. **Verbind met MIDI** → sta SysEx toe → kies de `LX708`-poorten (auto-geselecteerd).
4. **Identity Request** → verwacht een reply die "LX708" bevestigt. Geen reply = verkeerde
   poort of geen tweeweg-verbinding.
5. **Model-ID auto-discovery** → start de sweep. Een treffer logt `★ TREFFER`.
6. Vul het gevonden model-ID in bij sectie 3 en begin adressen te proben met RQ1
   (lezen is veilig; DT1 schrijft echt naar de piano).

### Snelle test-flows (sectie 5 — read-only, veilig)

- **Verificatie-checklist** — leest 8 bekende adressen uit en toont ze gedecodeerd
  (keyboard-modus, split point, tone, metronoom, tempo, volume, status). Verander
  iets op het paneel (bijv. Split aanzetten) en draai opnieuw: de waarde hoort mee
  te bewegen → adres bevestigd voor de LX708.
- **Adres-sweep** — leest een heel blok `basis + 00..7F` (len 1) en logt alleen de
  adressen die antwoorden, met hun waarde. Non-destructief. Gebruik dit om
  onbekende blokken te ontdekken (m.n. Piano Designer voorbij `01 00 02 25`).
  Handige basissen: `01 00 01` (status), `01 00 02` (instellingen),
  `01 00 08` (device-info).

## Fallback: officiële app afluisteren

Als de sweep niets vindt (verkeerd probe-adres of niet-`00 00 00 NN`-ID), capture dan één
sessie van de officiële app — dat onthult model-ID + adressen direct:

- **Bluetooth (makkelijkst, geen hardware):** Android → Ontwikkelaarsopties → *Bluetooth
  HCI snoop log* aanzetten → Roland Piano App draaien en knoppen indrukken → log ophalen
  (`btsnoop_hci.log`) → openen in Wireshark → BLE-MIDI characteristic writes uitlezen.
- **USB:** een USB-MIDI-poort is exclusief, dus de app en deze tool kunnen niet tegelijk
  dezelfde poort openen. Gebruik een proxy (loopMIDI + MIDI-OX/MIDI-router) of sniff op
  URB-niveau met USBPcap/Wireshark.

Plak relevante hex-dumps terug in de repo (bv. in `docs/`) zodat de adresmap groeit.

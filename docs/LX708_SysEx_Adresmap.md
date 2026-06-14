# LX708 — Undocumented Roland DT1/RQ1 SysEx-adresmap

Deze map ontsluit de paneelfuncties die **niet** in de officiële `lx708_midi_impl.txt`
staan (Split/Dual, recorder, metronoom, Piano Designer, tuning, ambience). De Roland
Piano App stuurt deze commando's; ze zijn gereverse-engineerd voor de FP-30X en blijken
op de LX708 te werken via **hetzelfde model-ID**.

> **Status (2026-06-13, geverifieerd op een echte LX708):**
> - Model-ID `00 00 00 28`, device-ID `10`, RQ1-lezen — **bevestigd** (Identity Reply rev `0x11`).
> - Het **hele `01 00 02`-blok is live** en de waarden **bewegen mee met het paneel**: keyboard-modus
>   las correct `single → split → dual` bij het indrukken van [Split/Dual]; tempo, metronoom-status en
>   master volume volgden eveneens. De FP-30X-map klopt hier dus op de LX708.
> - **Blokgrens:** `01 00 02` loopt op de LX708 t/m `0x24` (geen `25/26` zoals de FP). De **diepe
>   Piano Designer-params zitten dus in een ander blok** dat nog gelokaliseerd moet worden
>   (probe → "Scan blokken").
> - **Afwijking om te checken:** `01 00 02 1D` (FP = key touch 0–5) las `60` op de LX708 → mogelijk een
>   andere parameter of schaal. Verifiëren met watch-modus.
> - DT1-**schrijven** is nog niet getest. Annotaties als "non-functional on PP2" komen uit de
>   FP-context en kunnen op de LX708 afwijken.

## Frameformaat

```
F0 41 <devID> 00 00 00 28 <cmd> <adres: 4 bytes> <data/lengte> <checksum> F7
```

- `devID` = `10` (default).
- `cmd` = `12` (DT1, schrijven) of `11` (RQ1, lezen).
- RQ1-data = 4-byte **lengte** van het te lezen blok; DT1-data = de waarde(s).
- **Checksum** = `(128 − (som van adres+data bytes mod 128)) mod 128`.
  De probe-tool (`tools/midi-probe/`) rekent deze automatisch uit — vul daar alleen het
  adres + de lengte/data in.
- **Lezen werkt zonder handshake.** Voor schrijven (DT1) van o.a. volume/metronoom eerst de
  handshake sturen: DT1 → `01 00 03 06` = `01`.

## Read-only statusblok (`01 00 01 xx`)

| Adres | Parameter | Bytes | Codering |
|---|---|---|---|
| 01 00 01 01 | Key transpose (read) | 1 | `waarde − 64` = halve tonen |
| 01 00 01 03 | Sequencer status | 1 | direct |
| 01 00 01 05 | Sequencer maat | 2 | 7-bit multibyte |
| 01 00 01 08 | Sequencer tempo (read) | 2 | `bpm = b0×128 + b1` |
| 01 00 01 0A | Maat-teller (numerator) | 1 | direct |
| 01 00 01 0B | Maat-noemer (denominator) | 1 | direct |
| 01 00 01 0C | Accomp.-part aan/uit | 1 | 0=uit, 1=aan, 2=geen data |
| 01 00 01 0D | Left-part aan/uit | 1 | 0=uit, 1=aan, 2=geen data |
| 01 00 01 0E | Right-part aan/uit | 1 | 0=uit, 1=aan, 2=geen data |
| 01 00 01 0F | Metronoom-status | 1 | 0=uit, 1=aan |
| 01 00 01 11 | Ambience beschikbaar | 1 | 0=nee, 1=ja |

## Lezen/schrijven (`01 00 02 xx`)

| Adres | Parameter | Bytes | Codering |
|---|---|---|---|
| 01 00 02 00 | **Keyboard-modus** | 1 | 0=single, 1=split, 2=dual, 3=twin |
| 01 00 02 01 | Split point | 1 | MIDI-notenummer |
| 01 00 02 02 | Split octave shift | 1 | `waarde − 64` = octaven |
| 01 00 02 03 | Split balance | 1 | direct |
| 01 00 02 04 | Dual octave shift | 1 | `waarde − 64` = octaven |
| 01 00 02 05 | Dual balance | 1 | midden=64 |
| 01 00 02 06 | Twin-piano-modus | 1 | direct |
| 01 00 02 07 | **Tone (single)** | 3 | `[categorie, num÷128, num%128]` |
| 01 00 02 0A | Tone (split) | 3 | idem |
| 01 00 02 0D | Tone (dual) | 3 | idem |
| 01 00 02 10 | Song-nummer | 3 | idem |
| 01 00 02 13 | **Master volume** | 1 | 0–100 (paneelschaal) |
| 01 00 02 18 | Master tuning | 2 | `Hz = (4144 + raw)/10`; A4=440 → raw=256 |
| 01 00 02 1A | Ambience level | 1 | direct |
| 01 00 02 1C | Brilliance | 1 | direct |
| 01 00 02 1D | Key touch | 1 | 0=fix,1=super light,…,5=super heavy |
| 01 00 02 1E | Transpose-modus | 1 | 0=kbd+song, 1=kbd, 2=song |
| 01 00 02 1F | Metronoom-maat | 1 | 0=2/2, 2=2/4, 3=3/4, 4=4/4, 9=6/8, 12=12/8 |
| 01 00 02 20 | Metronoom-patroon | 1 | 0–7 |
| 01 00 02 21 | Metronoom-volume | 1 | 0=uit, 1–10 |
| 01 00 02 22 | Metronoom-toon | 1 | 0=click,1=electronic,2=voice-JP,3=voice-EN |
| 01 00 02 25 | Metronoom-type | 1 | 0=metronoom, 1=ritmepatroon |

### Tone-selectie — bevestigd op de LX708 (watch-modus, 2026-06-13)

Elke tone-zone is 3 bytes: **`[categorie, numHi, numLo]`**, `num = numHi×128 + numLo`.
Categorie = de 4 paneel-bankknoppen: **`0=Piano, 1=E.Piano, 2=Strings, 3=Other`**;
`num` = bladervolgorde-index binnen die categorie.

| Adres | Zone |
|---|---|
| 01 00 02 07–09 | Tone 1 / single / split-rechts |
| 01 00 02 0A–0C | Split-links |
| 01 00 02 0D–0F | Tone 2 (dual-laag) |

**`num` = `toneNumber − 1` (bevestigd).** De catalogus-`toneNumber` loopt per categorie
door (Piano 1–4, E.Piano 1–11, Strings 1–18, Other 1–291). De paneel-bladervolgorde is
exact deze volgorde: harvest via de Windows MIDI Services console toonde dat "Other" begint
met Pipe Organ (Other #1) en dat de GM2-sectie pas bij de 36e tone start ("Piano 1" = Other
#36) — precies `tones_seed.json`. Dus de webapp kan elke tone naar een zone zetten zonder
mapping-tabel: `encodeTone(categorie-index, toneNumber − 1)`. Geïmplementeerd in
`frontend/lib/rolandSysex.ts` (`toneToZoneBytes`).

**Bank/PC-spiegeling (alleen transmit).** Bij elke paneelkeuze zendt de piano de tone óók
als Bank Select + PC uit (tone 1 → kanaal 3, tone 2 → kanaal 6). Maar de piano *ontvangt*
deze niet om een zone te zetten (getest) — daarom gebruiken we DT1 `[cat,num]` op
`07/0A/0D`. De transmit-stroom is wel handig als verificatie-harvest.

## Schrijfcommando's (`01 00 03 xx`)

| Adres | Parameter | Bytes | Notitie |
|---|---|---|---|
| 01 00 03 00 | Application mode | 1 | deel van handshake (notificaties) |
| 01 00 03 06 | **Verbindings-handshake** | 1 | stuur `01` na connect; enabled remote-DT1 |
| 01 00 03 07 | Key transpose (write) | 1 | `waarde = halve tonen + 64` |
| 01 00 03 09 | Sequencer tempo (write) | 2 | `[bpm÷128, bpm%128]`; 10–500 |
| 01 00 03 0B | Tempo reset | 1 | terug naar origineel |
| 01 00 03 0C | Loop-start maat | 2 | 7-bit multibyte |
| 01 00 03 0E | Loop-eind maat | 2 | 7-bit multibyte |
| 01 00 03 17 | Sequencer play | 1 | start(1) — *FP: non-functional op PP2* |
| 01 00 03 19 | Sequencer stop | 1 | stop(1) — *FP: non-functional op PP2* |
| 01 00 03 1A | Metronoom-switch | 1 | 0=uit, 1=aan, 2=aan bij volgende start |
| 01 00 03 1B | **Recorder record-standby** | 1 | 0=annuleer, 1=standby |

## Knop-simulatie — de werkende recorder-route (`01 00 05 xx`)

Deze adressen bootsen fysieke paneelknoppen na (write-only, DT1). **Dit is de betrouwbare
manier om de interne recorder/transport te bedienen** — de directe play/stop (`03 17/19`)
was op de FP onbetrouwbaar, deze knop-simulatie niet.

| Adres | Knop |
|---|---|
| 01 00 05 00 | Rewind (`00`=druk, `01`=vasthouden) |
| 01 00 05 01 | Fast-forward (`00`=druk, `01`=vasthouden) |
| 01 00 05 02 | Reset (naar begin) |
| 01 00 05 03 | Tempo −1 BPM |
| 01 00 05 04 | Tempo +1 BPM |
| 01 00 05 05 | **Play/Stop toggle** |
| 01 00 05 06 | Accomp.-part toggle |
| 01 00 05 07 | Left-part toggle |
| 01 00 05 08 | Right-part toggle |
| 01 00 05 09 | **Metronoom aan/uit toggle** |
| 01 00 05 0A | Vorige song |
| 01 00 05 0B | Volgende song |
| 01 00 05 0C | Tempo −10 BPM |
| 01 00 05 0D | Tempo +10 BPM |

> **Recorder-conclusie:** record-standby (`03 1B` = `1`) + play/stop-toggle (`05 05`) +
> reset (`05 02`) geven samen volledige record/afspeel-besturing. Dit moet nog op de LX708
> bevestigd worden, maar het mechanisme bestaat — de eerdere "kan niet via MIDI" was onjuist.

## Device-info (`01 00 08 xx`)

| Adres | Parameter | Notitie |
|---|---|---|
| 01 00 08 00 | Adresmap-versie | 0=legacy, 1=Apple-Watch-support |
| 01 00 08 01 | **Alive check** | geeft altijd `0`; ideaal om verbinding te testen |

---

## Verificatie-checklist voor de LX708 (read-only, veilig)

Vuur deze in de probe af met **RQ1**, lengte zoals aangegeven. Niks wordt gewijzigd.
Doel: bevestigen dat de FP-30X-adressen 1-op-1 op de LX708 kloppen.

| # | Adres | Lengte | Verwacht | Test |
|---|---|---|---|---|
| 1 | 01 00 08 01 | 00 00 00 01 | `00` | alive-check |
| 2 | 01 00 02 00 | 00 00 00 01 | 0–3 | zet piano in Split → moet `01` lezen |
| 3 | 01 00 02 01 | 00 00 00 01 | ~`42` (F#3=66) | split point |
| 4 | 01 00 02 07 | 00 00 00 03 | 3 bytes | huidige tone — verander tone op paneel, lees opnieuw |
| 5 | 01 00 01 0F | 00 00 00 01 | 0/1 | zet metronoom aan → moet `01` lezen |
| 6 | 01 00 01 08 | 00 00 00 02 | bpm | tempo (b0×128+b1) |
| 7 | 01 00 02 13 | 00 00 00 01 | 0–100 | master volume |
| 8 | 01 00 01 03 | 00 00 00 01 | — | sequencer-status; vergelijk vóór/tijdens afspelen |

**Methode:** verander een instelling op het paneel van de piano, lees daarna het adres met
RQ1, en kijk of de waarde meebeweegt. Klopt het → adres bevestigd voor de LX708. Pas daarna
gaan we voorzichtig DT1-schrijfacties testen (begin met `01 00 05 09`, metronoom-toggle).

## Verschillen LX708 vs FP-30X — en wat we moeten uitzoeken

De adresmap komt van de **FP-30X**, een portable slab-piano. De **LX708** is het
topmodel van de kast-lijn met een veel rijkere featureset. Het gedeelde model-ID
(`00 00 00 28`) suggereert sterk dat de *basis* één-op-één klopt, maar de LX708 heeft
méér. Per paneelknop (uit het LX708-bedieningsoverzicht) de verwachting + actie:

| LX708-knop | Verwachte SysEx-route | FP-map dekt het? | Uitzoeken |
|---|---|---|---|
| [Power] | — | n.v.t. | niet via MIDI |
| [Volume] (draai) | master volume `01 00 02 13` | ✅ | verifiëren (RQ1) |
| [Settings] / [Back] | menu-navigatie | ❌ | waarschijnlijk geen adres; n.v.t. |
| [Select/Confirm] (draai) | context-afhankelijk | ❌ | niet generiek bestuurbaar |
| **[Piano Designer]** | eigen paramblok | ⚠️ deels | **grootste gat** — zie hieronder |
| [Transpose] | key transpose `01 00 03 07` / read `…01 01` | ✅ | verifiëren |
| **[Split/Dual]** | keyboard-modus `01 00 02 00` + zone-tones | ✅ | verifiëren (incl. categorie-encoding) |
| Tone-knoppen [Piano]/[E.Piano]/[Strings]/[Other] | tone-select `01 00 02 07` `[cat,…]` | ⚠️ | **categorie-nummering kan afwijken** — LX708 heeft andere/meer groepen + 291 tones |
| **[Registration]** | registratie oproepen/opslaan | ❌ | **onbekend** — FP-30X heeft minder registraties; adres uitzoeken |
| [Song] | song-select `01 00 02 10` | ✅ | verifiëren; song-*lijst* niet leesbaar |
| [Play/Stop] | knop-sim `01 00 05 05` | ✅ | verifiëren |
| [Recording] (rode stip) | record-standby `01 00 03 1B` | ✅ | verifiëren |
| [Part] | part-toggles `01 00 05 06–08` + read `…01 0C-0E` | ⚠️ | LX708 heeft Left/Right/**Accomp** — part-mapping verifiëren |
| [Metronome] | toggle `01 00 05 09` / params `…02 1F-25` | ✅ | verifiëren |
| [Tempo] (draai) | tempo `01 00 03 09` + ±1/±10 `…05 03/04/0C/0D` | ✅ | verifiëren |

### Concrete open onderzoekspunten (geprioriteerd)

1. **Piano Designer-adressen** (hoogste waarde, grootste gat). **Bevestigd: niet in
   `01 00 02`** (dat blok stopt bij `0x24`). Te lokaliseren via probe → "Scan blokken"
   (`01 00 BB 00` voor BB=00–7F) en daarna watch-modus op het gevonden blok.
   Volledige parameterlijst (uit `docs/Piano Designer Handleiding.md`):
   - **Sound Edit / Cabinet:** Lid, Cabinet Resonance, Soundboard Type, Soundboard Behavior
   - **Hammer:** Hammer Noise, Hammer Response
   - **Strings:** Full Scale String Res, String Resonance, Duplex Scale, Dynamic Harmonic
   - **Damper:** Damper Noise, Damper Resonance
   - **Keyboard:** Key Touch, Key Off Resonance, Key Off Noise
   - **Tuning:** Master Tuning, Temperament (10 stemmingen), Temperament Key
   - **Other:** Ambience, Ear Sense, Headphone 3D Ambience, Volume Limit
   - **Individual Note Voicing (88 noten × 3):** Single Note Tuning, Single Note Character,
     Single Note Volume — plus "reset settings" en voorgeprogrammeerde tuner-setups (stages).

   **Strategie:** globale params (≈22) via watch-modus (knop draaien → adres verschijnt). De
   per-noot-bulk (264 waarden) het efficiëntst via **één Bluetooth-HCI-snoop** van de Piano
   Designer-app, want diff-watchen van 88 noten is te traag. De voorgeprogrammeerde setups
   zijn waarschijnlijk een enkel "recall preset"-adres of een bulk-DT1 — uitzoeken via snoop.
2. **Tone-categorie-encoding.** De FP gebruikt `[categorie, num÷128, num%128]`. De LX708
   heeft een grotere/andere indeling (Piano/E.Piano/Strings/Other + 291 tones in de impl).
   **Actie:** zet bekende tones op het paneel, lees `01 00 02 07` met RQ1, leid de
   categorie-tabel af. Kruis-check met `data/midi_tone_map.json` (Bank/PC) — mogelijk is
   Bank/PC op kanaal 4 alsnog de simpelere route voor tone-selectie.
3. **Registration.** Geen FP-adres bekend. **Actie:** snoop de Roland Piano App terwijl je
   een registratie oproept; zoek het adres + of het index- of inhoud-gebaseerd is.
4. **Recorder Left/Right/Accomp + overdub.** Verifieer of part-toggles/-reads de drie
   LX708-partijen correct dekken, en of audio-(WAV-naar-USB)-opname überhaupt een
   SysEx-trigger heeft (waarschijnlijk niet — alleen SMF).
5. **Temperament / stretch tuning.** LX708 ondersteunt stemmingen (gelijkzwevend, rein,
   …) en stretch tuning; de FP-map toont alleen master tuning (Hz). **Actie:** adres zoeken
   voorbij `01 00 02 18`.
6. **`01 00 03 17/19` (directe play/stop).** Op de FP "non-functional op PP2". **Actie:**
   test op de LX708 of de directe route wél werkt, anders knop-sim `05 05` gebruiken.
7. **Adresmap-versie** `01 00 08 00`. **Actie:** uitlezen — een nieuwere waarde dan de FP
   kan wijzen op een uitgebreider adresbereik dat we systematisch kunnen sweepen.

### Veilige sweep-strategie

RQ1 is non-destructief. Een verkennende sweep (per adres len 1 lezen, kijken of er een
DT1-antwoord komt) brengt levende adressen in kaart zónder iets te wijzigen. De probe-tool
kan hiervoor uitgebreid worden met een adres-sweep (analoog aan de model-ID-sweep). Pas
ná read-only-bevestiging gaan we DT1 schrijven, beginnend met de meest onschuldige
(metronoom-toggle `01 00 05 09`).

## Bronnen / herbruikbare code

- `aortegaCampanillas/RolandFP30xController` — `docs/midi_reference.md` (deze map).
- `bluebrother/fp30remote` — DT1/RQ1 over Web MIDI/Bluetooth.
- `motiz88/roland-sysex.js` — JS-builder voor Roland-SysEx (bruikbaar in de web-app).

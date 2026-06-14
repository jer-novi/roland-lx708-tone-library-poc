import type { ToneDto } from "@/lib/types";

/**
 * Gecureerde Dual/Split-combinaties. `genreId` verwijst naar `lib/genreTips.ts`
 * (badge + hover-tip + deep-link naar de gids). Tones worden bij naam
 * gerefereerd en runtime tegen de catalogus geresolved.
 *
 * - `tone1` = rechts / Tone 1 (de basis), `tone2` = links / Tone 2 (de laag).
 * - `splitPoint` = MIDI-notenummer (alleen split); 48 = C3, 54 = F#3 (default).
 * - `balance` = 0–127 (midden 64); weggelaten = midden.
 */
export interface ToneComboDef {
  id: string;
  type: "dual" | "split";
  tone1: string;
  tone2: string;
  splitPoint?: number;
  balance?: number;
  genreId: string;
  name: string;
  why: string;
}

export const TONE_COMBOS: ToneComboDef[] = [
  // ── Elektronisch ──
  { id: "td-popep-warmpad", type: "dual", tone1: "Pop EP", tone2: "Warm Pad", genreId: "techno-deephouse", name: "Deephouse-stab", why: "EP-stab met een warme sublaag — door chorus + delay deephouse-goud." },
  { id: "td-sinepad-bass", type: "split", tone1: "Sine Pad", tone2: "Synth Bass 2", splitPoint: 48, genreId: "techno-deephouse", name: "Pad + sub", why: "Pad rechts, synthbas links — speel akkoord + bas in één take." },
  { id: "td-fmep-sinepad", type: "dual", tone1: "FM E.Piano", tone2: "Sine Pad", genreId: "techno-deephouse", name: "Glazige chords", why: "FM-EP met gladde pad voor koele house-akkoorden." },
  { id: "mt-bowed-bass", type: "dual", tone1: "Bowed Glass", tone2: "Synth Bass 2", genreId: "melodische-techno", name: "Afterlife-laag", why: "Bowed Glass als melodische hoofdlaag, sub eronder." },
  { id: "mt-sinepad-bass1", type: "dual", tone1: "Sine Pad", tone2: "Synth Bass 1", genreId: "melodische-techno", name: "Spanningsboog", why: "Lange pad-akkoorden met sub; automatiseer er een filter overheen." },
  { id: "mt-crystal-sweep", type: "dual", tone1: "Crystal", tone2: "Sweep Pad", genreId: "melodische-techno", name: "Pluck + bed", why: "Crystal-pluck op een evoluerend pad-bed." },
  { id: "ph-rockpiano-organ", type: "dual", tone1: "Rock Piano", tone2: "Organ 2", genreId: "piano-house", name: "Piano-house", why: "Rock Piano met M1-achtig orgel — de klassieke huis-stack." },
  { id: "ph-upright-bass", type: "split", tone1: "Bright Upright", tone2: "Synth Bass 1", splitPoint: 48, genreId: "piano-house", name: "Stabs + bas", why: "Korte stabs rechts, synthbas links." },
  { id: "ph-popep-choir", type: "dual", tone1: "Pop EP", tone2: "Choir 1", genreId: "piano-house", name: "Soulful house", why: "EP-akkoorden met koor — dromerige deep house." },
  { id: "lf-mellowup-warmpad", type: "dual", tone1: "Mellow Upright", tone2: "Warm Pad", genreId: "lofi", name: "Chillhop-keys", why: "Zachte upright met warme pad; speel bewust los." },
  { id: "lf-mellowforte-soft", type: "dual", tone1: "Mellow Forte", tone2: "Soft Pad", genreId: "lofi", name: "Studeerkamer", why: "Fortepiano-zachtheid met een dunne pad — intiem en stoffig." },
  { id: "lf-vintageep-warm", type: "dual", tone1: "Vintage EP", tone2: "Warm Pad", genreId: "lofi", name: "Tape-EP", why: "Vintage-EP met pad; low-pass en vinylruis maken het af." },
  { id: "sw-fmep-brass", type: "dual", tone1: "FM E.Piano", tone2: "AnalogBrass1", genreId: "synthwave", name: "Miami 1984", why: "FM-EP met analoge brass — direct jaren-80." },
  { id: "sw-fmep-halo", type: "dual", tone1: "FM E.Piano", tone2: "Halo Pad", genreId: "synthwave", name: "Neon-ballad", why: "FM-EP met halo-pad voor brede retrowave-akkoorden." },
  { id: "sw-square-bass", type: "split", tone1: "Square Lead1", tone2: "Synth Bass 2", splitPoint: 48, genreId: "synthwave", name: "Lead + bas", why: "Square-lead rechts, synthbas links — speel de hele track zelf." },
  { id: "am-sweep-space", type: "dual", tone1: "Sweep Pad", tone2: "Space Voice", genreId: "ambient-drone", name: "Drift", why: "Sweep-pad met stemmig laag; sustain vast en time-stretchen." },
  { id: "am-halo-bowed", type: "dual", tone1: "Halo Pad", tone2: "Bowed Glass", genreId: "ambient-drone", name: "Glazen drone", why: "Twee trage texturen die in elkaar smelten." },
  { id: "am-atmos-warm", type: "dual", tone1: "Atmosphere", tone2: "Warm Pad", genreId: "ambient-drone", name: "Warm bed", why: "Atmosphere over een warme pad — eindeloos houdbaar." },
  { id: "dt-vintageep-soft", type: "dual", tone1: "Vintage EP", tone2: "Soft Pad", genreId: "downtempo", name: "Trip-hop EP", why: "Veel ruimte, trage drums eronder." },
  { id: "dt-60ep-warm", type: "dual", tone1: "60's EP", tone2: "Warm Pad", genreId: "downtempo", name: "Smoky", why: "60's-EP met pad voor een rokerige downtempo-sfeer." },
  { id: "ld-egrand-warm", type: "dual", tone1: "E.Grand", tone2: "Warm Pad", genreId: "liquid-dnb", name: "Soulful chords", why: "E.Grand met pad; speel op half tempo in en versnel." },
  { id: "ld-popep-soft", type: "dual", tone1: "Pop EP", tone2: "Soft Pad", genreId: "liquid-dnb", name: "Liquid keys", why: "EP-akkoorden met dunne pad — zwevend boven de breakbeat." },

  // ── Gitaar & ukelele ──
  { id: "ss-mellowup-fingerbass", type: "split", tone1: "Mellow Upright", tone2: "FingeredBass", splitPoint: 48, genreId: "singer-songwriter", name: "Zelfbegeleiding", why: "Vingerbas links, upright rechts — zing erbovenop." },
  { id: "ss-upright-acbass", type: "split", tone1: "Upright Piano", tone2: "AcousticBass", splitPoint: 48, genreId: "singer-songwriter", name: "Folk-trio", why: "Akoestische bas links voor songwriting." },
  { id: "ss-mellowup-soft", type: "dual", tone1: "Mellow Upright", tone2: "Soft Pad", genreId: "singer-songwriter", name: "Onder de zang", why: "Upright met dunne pad, high-pass voor ruimte voor de stem." },
  { id: "uk-celesta-musicbox", type: "dual", tone1: "Celesta", tone2: "Music Box", genreId: "ukelele-pop", name: "Sprankel-duo", why: "Celesta + Music Box als ijle laag boven de uke." },
  { id: "uk-musicbox-soft", type: "dual", tone1: "Music Box", tone2: "Soft Pad", genreId: "ukelele-pop", name: "Slaapliedje", why: "Music Box op een zacht bed — Somewhere Over the Rainbow." },
  { id: "bo-american-nylon", type: "split", tone1: "American Grand", tone2: "Nylon-str.Gt", splitPoint: 54, genreId: "bossa-latin", name: "Bossa-comping", why: "Nylongitaar links, vleugel-comping rechts op de 2&." },
  { id: "bo-vintageep-soft", type: "dual", tone1: "Vintage EP", tone2: "Soft Pad", genreId: "bossa-latin", name: "Café-bossa", why: "Warme EP met dunne pad — Rio bij nacht." },
  { id: "co-honkytonk-steel", type: "dual", tone1: "Honky-tonk", tone2: "Steel-str.Gt", genreId: "country", name: "Saloon", why: "Honky-tonk met staalgitaar — recht uit de bar." },
  { id: "co-honkytonk-fiddle", type: "dual", tone1: "Honky-tonk", tone2: "Fiddle", genreId: "country", name: "Hoedown", why: "Honky-tonk met fiddle voor americana-energie." },
  { id: "rg-upright-organ", type: "dual", tone1: "Bright Upright", tone2: "Organ 2", genreId: "reggae-ska", name: "Skank + bubble", why: "Staccato upright met orgel-bubble in de linkerhand." },
  { id: "rg-upright-bass", type: "split", tone1: "Bright Upright", tone2: "FingeredBass", splitPoint: 48, genreId: "reggae-ska", name: "Offbeat-trio", why: "Skank rechts, diepe ronde bas links." },
  { id: "bg-gospel-grand", type: "dual", tone1: "Gospel Spin", tone2: "European Grand", genreId: "blues-gospel", name: "Zondagochtend", why: "Leslie-orgel met vleugel — het gospelwapen." },
  { id: "bg-rockpiano-choir", type: "dual", tone1: "Rock Piano", tone2: "Choir 1", genreId: "blues-gospel", name: "6/8-ballad", why: "Piano + koor in Dual; stapel handclaps via de mics." },
  { id: "bg-church-choir2", type: "dual", tone1: "ChurchOrgan2", tone2: "Choir 2", genreId: "blues-gospel", name: "Kerk-stack", why: "Kerkorgel met breed koor voor de grote finale." },
  { id: "rn-suitcase-warm", type: "dual", tone1: "1976SuitCase", tone2: "Warm Pad", genreId: "rnb-neosoul", name: "Neo-soul", why: "Rhodes met warme pad; speel 9ths en 11ths achter de beat." },
  { id: "rn-epbelle-soft", type: "dual", tone1: "EP Belle", tone2: "Soft Pad", genreId: "rnb-neosoul", name: "Belle & pad", why: "Belletjes-EP met dunne pad — zacht en breed." },
  { id: "rn-70ep-choir", type: "dual", tone1: "70's EP", tone2: "Choir 1", genreId: "rnb-neosoul", name: "Quiet storm", why: "70's-EP met koor voor slow-jam-sfeer." },

  // ── Akoestisch & klassiek ──
  { id: "jz-jzorg-acbass", type: "split", tone1: "Combo Jz.Org", tone2: "AcousticBass", splitPoint: 48, genreId: "jazz", name: "Orgel-trio", why: "Walking bass links, jazz-orgel rechts." },
  { id: "jz-suitcase-rich", type: "dual", tone1: "1976SuitCase", tone2: "Rich Strings", genreId: "jazz", name: "EP-ballad", why: "Rhodes met rijke strijkers voor een ballad." },
  { id: "jz-vintageep-contrabass", type: "split", tone1: "Vintage EP", tone2: "Contrabass", splitPoint: 48, genreId: "jazz", name: "Clubjazz", why: "Contrabas links, vintage-EP rechts." },
  { id: "mk-upright-warm", type: "dual", tone1: "Upright Piano", tone2: "Warm Pad", genreId: "modern-klassiek", name: "Frahm-bed", why: "Upright met heel zachte pad; mic de kast voor de mechaniek." },
  { id: "mk-mellowup-symph", type: "dual", tone1: "Mellow Upright", tone2: "SymphonicStr1", genreId: "modern-klassiek", name: "Arnalds", why: "Zachte upright met strijkers ver onder de noten." },
  { id: "mk-fortepiano-soft", type: "dual", tone1: "Fortepiano", tone2: "Soft Pad", genreId: "modern-klassiek", name: "Oud & nieuw", why: "Fortepiano met een dunne moderne pad." },
  { id: "fo-mellowup-steel", type: "dual", tone1: "Mellow Upright", tone2: "Steel-str.Gt", genreId: "folk", name: "Schets-folk", why: "Upright met staalgitaar als schetslaag." },
  { id: "fo-upright-accordion", type: "dual", tone1: "Bright Upright", tone2: "Accordion 1", genreId: "folk", name: "Keltisch", why: "Upright met accordeon voor een Iers/keltisch tintje." },
  { id: "po-american-soft", type: "dual", tone1: "American Grand", tone2: "Soft Pad", genreId: "pop", name: "Radio-pop", why: "Directe vleugel met pad laag in de mix." },
  { id: "po-american-choir", type: "dual", tone1: "American Grand", tone2: "Choir 1", genreId: "pop", name: "Anthem", why: "Vleugel met koor voor de grote refreinen." },
  { id: "po-popep-warm", type: "dual", tone1: "Pop EP", tone2: "Warm Pad", genreId: "pop", name: "Synthpop-keys", why: "Pop-EP met warme pad — moderne productie." },

  // ── Experimenteel & creatief ──
  { id: "ci-grand-epic", type: "dual", tone1: "European Grand", tone2: "Epic Strings", genreId: "cinematic", name: "Trailer", why: "Vleugel met epische strijkers — meteen filmisch." },
  { id: "ci-rich-choir", type: "dual", tone1: "Rich Strings", tone2: "Choir 1", genreId: "cinematic", name: "Koorscène", why: "Strijkers met koor voor de emotionele climax." },
  { id: "ci-soundtrack-pipe", type: "dual", tone1: "Soundtrack", tone2: "Pipe Organ", genreId: "cinematic", name: "Episch orgel", why: "Soundtrack-pad met pijporgel — episch en donker." },
  { id: "ci-orchestra-choir2", type: "dual", tone1: "Orchestra", tone2: "Choir 2", genreId: "cinematic", name: "Main theme", why: "Vol orkest met breed koor." },
  { id: "sd-crystal-warm", type: "dual", tone1: "Crystal", tone2: "Warm Pad", genreId: "sound-design", name: "Glinster", why: "Kristal-sprankel op een warm bed." },
  { id: "sd-atmos-bowed", type: "dual", tone1: "Atmosphere", tone2: "Bowed Glass", genreId: "sound-design", name: "Textuur", why: "Twee evoluerende texturen die ademen." },
  { id: "sd-icerain-sweep", type: "dual", tone1: "Ice Rain", tone2: "Sweep Pad", genreId: "sound-design", name: "IJsregen", why: "Ice Rain-pluckjes op een trage sweep." },
  { id: "sd-celesta-soft", type: "dual", tone1: "Celesta", tone2: "Soft Pad", genreId: "sound-design", name: "Bell-bed", why: "Celesta-sprankel op een dunne pad." },
  { id: "rg-square-bass2", type: "split", tone1: "Square Lead1", tone2: "Synth Bass 2", splitPoint: 48, genreId: "retro-game", name: "Chiptune", why: "Square-lead rechts, synthbas links — 8-bit energie." },
  { id: "rg-analogbrass-halo", type: "dual", tone1: "AnalogBrass1", tone2: "Halo Pad", genreId: "retro-game", name: "Boss-thema", why: "Analoge brass met halo-pad voor 80s-game-drama." },
  { id: "rg-saw-bass1", type: "split", tone1: "Saw Lead 1", tone2: "Synth Bass 1", splitPoint: 48, genreId: "retro-game", name: "Arcade", why: "Saw-lead rechts, stevige synthbas links." },
  { id: "sa-church-choir", type: "dual", tone1: "ChurchOrgan1", tone2: "Choir 1", genreId: "sacraal-drone", name: "Kathedraal", why: "Kerkorgel met koor — sacraal en groot." },
  { id: "sa-pipe-space", type: "dual", tone1: "Pipe Organ", tone2: "Space Voice", genreId: "sacraal-drone", name: "Ademend orgel", why: "Pijporgel met stemmig laag; sustain vast voor een drone." },
  { id: "sa-halo-choir2", type: "dual", tone1: "Halo Pad", tone2: "Choir 2", genreId: "sacraal-drone", name: "Meditatie", why: "Halo-pad met koor — een rustig, zwevend bed." },
  { id: "nl-accordion-honky", type: "dual", tone1: "Accordion 1", tone2: "Honky-tonk", genreId: "nl-volksmuziek", name: "Kroeg", why: "Accordeon met honky-tonk — meezingen verzekerd." },
  { id: "nl-brass-honky", type: "dual", tone1: "Brass 1", tone2: "Honky-tonk", genreId: "nl-volksmuziek", name: "Oompah", why: "Brass-stoten met honky-tonk voor après-ski." },
  { id: "nl-accordion2-bandoneon", type: "dual", tone1: "Accordion 2", tone2: "Bandoneon", genreId: "nl-volksmuziek", name: "Trekzak-stack", why: "Twee trekzakken gestapeld — vol en nostalgisch." },
  { id: "bl-nylon-sinepad", type: "dual", tone1: "Nylon-str.Gt", tone2: "Sine Pad", genreId: "blends-folktronica", name: "Blanco-sfeer", why: "Nylongitaar met zachte pad — akoestisch + elektronisch." },
  { id: "bl-mandolin-soft", type: "dual", tone1: "Mandolin", tone2: "Soft Pad", genreId: "blends-folktronica", name: "Andes-folktronica", why: "Mandoline-tremolo op een dunne pad." },
  { id: "bl-nylon-bass", type: "split", tone1: "Nylon-str.Gt", tone2: "Synth Bass 1", splitPoint: 48, genreId: "blends-folktronica", name: "Folk + sub", why: "Nylongitaar rechts, warme synthbas links." },
  { id: "ea-koto-shaku", type: "split", tone1: "Koto", tone2: "Shakuhachi", splitPoint: 54, genreId: "eastern-japanese", name: "Zen-duo", why: "Koto rechts, shakuhachi-fluit links; speel pentatonisch." },
  { id: "ea-sitar-warm", type: "dual", tone1: "Sitar 1", tone2: "Warm Pad", genreId: "eastern-japanese", name: "Raga-drone", why: "Sitar over een warme drone-pad." },
  { id: "ea-koto-pizz", type: "dual", tone1: "Koto", tone2: "Pizzicato Str", genreId: "eastern-japanese", name: "Tokkels", why: "Koto met pizzicato-strijkers — dubbel getokkel." },
  { id: "rw-clav-fingerbass", type: "split", tone1: "Clav.", tone2: "FingeredBass", splitPoint: 48, genreId: "rhythm-work", name: "Funk-groove", why: "Clav rechts, vingerbas links — pure funk-oefening." },
  { id: "rw-rockpiano-acbass", type: "split", tone1: "Rock Piano", tone2: "AcousticBass", splitPoint: 48, genreId: "rhythm-work", name: "Comping-drill", why: "Comping rechts, walking bass links — timing oefenen." },
  { id: "rw-marimba-pizz", type: "dual", tone1: "Marimba", tone2: "Pizzicato Str", genreId: "rhythm-work", name: "Staccato-stack", why: "Marimba met pizzicato — strak en percussief." },
  { id: "fp-rockpiano-brass", type: "dual", tone1: "Rock Piano", tone2: "Brass 1", genreId: "fun-party", name: "Disco", why: "Piano met brass-stoten — handen in de lucht." },
  { id: "fp-clav-slap", type: "split", tone1: "Clav.", tone2: "Slap Bass 1", splitPoint: 48, genreId: "fun-party", name: "Slap-funk", why: "Clav rechts, slapbas links — instant feestje." },
  { id: "fp-square-bass", type: "split", tone1: "Square Lead1", tone2: "Synth Bass 1", splitPoint: 48, genreId: "fun-party", name: "Synth-party", why: "Lead + bas: speel de hele dancefloor zelf." },
  { id: "si-magical-soft", type: "dual", tone1: "Magical Piano", tone2: "Soft Pad", genreId: "signature-sounds", name: "Sprookje", why: "Magical Piano met pad — betoverend en uniek." },
  { id: "si-startheme-warm", type: "dual", tone1: "Star Theme", tone2: "Warm Pad", genreId: "signature-sounds", name: "Ruimtereis", why: "Star Theme over een warme pad — cosmisch." },
  { id: "si-vibraphone-warm", type: "dual", tone1: "Vibraphone", tone2: "Warm Pad", genreId: "signature-sounds", name: "Vibes & pad", why: "Vibrafoon met pad — koel en zwevend." },
];

export interface ResolvedCombo {
  def: ToneComboDef;
  tone1: ToneDto | null;
  tone2: ToneDto | null;
}

/** Resolve combo-tonennamen tegen de catalogus (eerste exacte naam-match). */
export function resolveCombo(def: ToneComboDef, tones: ToneDto[]): ResolvedCombo {
  const find = (name: string) =>
    tones.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null;
  return { def, tone1: find(def.tone1), tone2: find(def.tone2) };
}

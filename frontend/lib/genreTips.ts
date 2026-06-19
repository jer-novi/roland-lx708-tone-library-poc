import GithubSlugger from "github-slugger";

/**
 * Genre-metadata voor de combinatie-badges. `heading` MOET exact gelijk zijn aan
 * een `####`-heading in `content/gids.md` (sectie 7 "Genre-tips"); daaruit leidt
 * `gidsAnchor` met dezelfde slugger als `rehype-slug` een matchende deep-link af.
 * `title` is de korte badge-tekst, `blurb` de hover-tip.
 */
export interface GenreTip {
  id: string;
  section: string;
  title: string;
  heading: string;
  blurb: string;
}

export const GENRE_TIPS: GenreTip[] = [
  // ── Elektronisch ──
  {
    id: "techno-deephouse",
    section: "Elektronisch",
    title: "Techno / Deephouse",
    heading: "Techno / Deephouse",
    blurb: "Droog opnemen (Ambience 0–1), pad of EP-stab onder een 808/909-groove. Sidechain op de kick.",
  },
  {
    id: "melodische-techno",
    section: "Elektronisch",
    title: "Melodische techno",
    heading: "Melodische techno (Tale Of Us / Afterlife-stijl)",
    blurb: "Sine Pad of Bowed Glass als hoofdlaag, een octaaf lager gedubbeld met een synthbas.",
  },
  {
    id: "piano-house",
    section: "Elektronisch",
    title: "Classic / piano house",
    heading: 'Classic house / piano house (90s, "Show Me Love")',
    blurb: "Rock Piano of Bright Upright, korte stabs, los gekwantiseerd. M1-orgel voor het huis-gevoel.",
  },
  {
    id: "lofi",
    section: "Elektronisch",
    title: "Lo-fi hiphop",
    heading: "Lo-fi hiphop / chillhop",
    blurb: "Mellow Upright/Forte, lage Ambience, bewust niet strak. Vinylruis en low-pass eroverheen.",
  },
  {
    id: "synthwave",
    section: "Elektronisch",
    title: "Synthwave",
    heading: "Synthwave / retrowave",
    blurb: "FM E.Piano + AnalogBrass + Halo Pad = instant 80s. Square Lead voor de melodie.",
  },
  {
    id: "ambient-drone",
    section: "Elektronisch",
    title: "Ambient / drone",
    heading: "Ambient / drone",
    blurb: "Sweep Pad, Space Voice, Halo Pad met sustain vastgehouden → opnemen → time-stretchen.",
  },
  {
    id: "downtempo",
    section: "Elektronisch",
    title: "Downtempo / trip-hop",
    heading: "Downtempo / trip-hop",
    blurb: "Vintage EP of 60's EP met veel ruimte, trage brush-achtige drums.",
  },
  {
    id: "liquid-dnb",
    section: "Elektronisch",
    title: "Liquid DnB",
    heading: "Liquid drum & bass",
    blurb: "E.Grand of Pop EP voor soulvolle chords, Warm Pad eronder. Inspelen op half tempo.",
  },

  // ── Gitaar & ukelele ──
  {
    id: "singer-songwriter",
    section: "Gitaar & ukelele",
    title: "Singer-songwriter",
    heading: "Singer-songwriter / indie-folk",
    blurb: "Mellow Upright vult gitaarakkoorden aan; speel boven de gitaar of juist lage grondtonen.",
  },
  {
    id: "ukelele-pop",
    section: "Gitaar & ukelele",
    title: "Ukelele-pop",
    heading: 'Ukelele-pop (Hawaiiaans / "Somewhere Over the Rainbow"-sfeer)',
    blurb: "Uke + Hawaiian Gt; piano minimaal met Music Box of Celesta als sprankel-laag.",
  },
  {
    id: "bossa-latin",
    section: "Gitaar & ukelele",
    title: "Bossa / latin",
    heading: "Bossa nova / latin",
    blurb: "Nylongitaar-gevoel; American Grand spaarzame comping op de 2&. Agogo/Castanets erbij.",
  },
  {
    id: "country",
    section: "Gitaar & ukelele",
    title: "Country / americana",
    heading: "Country / americana",
    blurb: "Honky-tonk is ervoor gemaakt; combineer met Steel-str.Gt en Fiddle. Train-beat met brushes.",
  },
  {
    id: "reggae-ska",
    section: "Gitaar & ukelele",
    title: "Reggae / ska",
    heading: "Reggae / ska (leuk met uke!)",
    blurb: "Bright Upright kort en staccato op de offbeats; orgel-'bubble' met Organ 2 in de linkerhand.",
  },
  {
    id: "blues-gospel",
    section: "Gitaar & ukelele",
    title: "Blues / gospel / soul",
    heading: "Blues / gospel / soul",
    blurb: "Rock/Ragtime Piano voor blues; Gospel Spin (Leslie) Dual met piano. 6/8-ballad met Choir 1.",
  },
  {
    id: "rnb-neosoul",
    section: "Gitaar & ukelele",
    title: "R&B / neo-soul",
    heading: "R&B / neo-soul",
    blurb: "1976SuitCase of EP Belle door lichte phaser; speel met veel 9ths/11ths, achter de beat.",
  },

  // ── Akoestisch & klassiek ──
  {
    id: "jazz",
    section: "Akoestisch & klassiek",
    title: "Jazz",
    heading: "Jazz",
    blurb: "Combo Jz.Org in Split met AcousticBass (walking bass links); 1976SuitCase voor ballads.",
  },
  {
    id: "modern-klassiek",
    section: "Akoestisch & klassiek",
    title: "Modern klassiek",
    heading: "Modern klassiek (Nils Frahm / Ólafur Arnalds-stijl)",
    blurb: "Upright/Mellow Upright + mics op de kast; Dual met SymphonicStr1 of Warm Pad heel zacht.",
  },
  {
    id: "folk",
    section: "Akoestisch & klassiek",
    title: "Folk",
    heading: "Folk",
    blurb: "Steel-str.Gt, Mandolin, Fiddle, Accordion als schetsinstrumenten; upright met lage Ambience.",
  },
  {
    id: "pop",
    section: "Akoestisch & klassiek",
    title: "Pop",
    heading: "Pop",
    blurb: "American Grand zit vaak beter in een dichte mix; Dual met Soft Pad of Choir 1, laag in de mix.",
  },

  // ── Experimenteel & creatief (nieuwe gids-secties) ──
  {
    id: "cinematic",
    section: "Experimenteel & creatief",
    title: "Cinematic & filmscore",
    heading: "Cinematic & filmscore",
    blurb: "Stapel vleugel + epische strijkers + koor voor trailer-grootsheid; pad als lijm eronder.",
  },
  {
    id: "sound-design",
    section: "Experimenteel & creatief",
    title: "Sound design & texturen",
    heading: "Sound design & texturen",
    blurb: "Evoluerende pads + sprankel (Crystal/Celesta) op een bed; opnemen en time-stretchen.",
  },
  {
    id: "retro-game",
    section: "Experimenteel & creatief",
    title: "Retro & game",
    heading: "Retro & game",
    blurb: "Synth-lead rechts + synthbas links voor chiptune-energie; FM + AnalogBrass voor 80s-games.",
  },
  {
    id: "sacraal-drone",
    section: "Experimenteel & creatief",
    title: "Sacraal & meditatie",
    heading: "Sacraal, meditatie & drone",
    blurb: "Kerkorgel + koor, of Halo Pad + Space Voice met sustain vast — een ademend, sacraal bed.",
  },
  {
    id: "nl-volksmuziek",
    section: "Experimenteel & creatief",
    title: "NL volks / après-ski",
    heading: "NL volksmuziek & après-ski",
    blurb: "Accordeon + Honky-tonk voor de kroeg; Brass voor oompah-stoten. Maximaal meezing-gehalte.",
  },
  {
    id: "blends-folktronica",
    section: "Experimenteel & creatief",
    title: "Blends (folktronica)",
    heading: "Blends (folktronica)",
    blurb: "Nylongitaar of mandoline + zachte pad/synthbas — akoestisch warm met een elektronische onderlaag (Blanco White).",
  },
  {
    id: "eastern-japanese",
    section: "Experimenteel & creatief",
    title: "Eastern & Japanese",
    heading: "Eastern & Japanese",
    blurb: "Koto + Shakuhachi over een splitpunt, of Sitar over een drone-pad. Pentatonisch spelen.",
  },
  {
    id: "rhythm-work",
    section: "Experimenteel & creatief",
    title: "Rhythm work & groove",
    heading: "Rhythm work & groove",
    blurb: "Split met bas links + percussieve comping rechts (Clav., Rock Piano) — pure groove-oefening.",
  },
  {
    id: "fun-party",
    section: "Experimenteel & creatief",
    title: "Fun party mixes",
    heading: "Fun party mixes",
    blurb: "Disco-piano + brass, funk-clav + slapbas, of een dikke synth-stack. Gewoon lol.",
  },
  {
    id: "signature-sounds",
    section: "Experimenteel & creatief",
    title: "Other signature sounds",
    heading: "Other signature sounds",
    blurb: "Eigenzinnige handtekening-combo's: Magical Piano, Star Theme, Goblins — durf vreemd te gaan.",
  },

  // ── Artiest-signatuur ──
  {
    id: "artist-signature",
    section: "Artiest-signatuur",
    title: "Artiest-signatuur",
    heading: "Artiest-signaturen",
    blurb: "Herkenbare klanken van beroemde toetsenisten en producers — zet de combo en speel hun signature-sound na.",
  },

  // ── Filmscore ──
  {
    id: "filmscore",
    section: "Filmscore",
    title: "Filmscore",
    heading: "Filmscore & soundtracks",
    blurb: "Iconische filmmuziek-texturen: stapel orgel, strijkers, koor en pads voor cinematische grandeur.",
  },
];

export const genreById = new Map(GENRE_TIPS.map((g) => [g.id, g]));

/** Deep-link naar de genre-tip in de gids; slug = github-slugger van de heading. */
export function gidsAnchor(tip: GenreTip): string {
  return `/gids#${new GithubSlugger().slug(tip.heading)}`;
}

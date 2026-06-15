import { TONE_COMBOS } from "@/lib/toneCombos";

/**
 * Snelkeuze-chips voor de BitMidi-track-zoeker. Een chip vult de zoekterm
 * (`query`) — BitMidi zoekt op bestandsnaam, dus artiesten/componisten/franchises
 * werken het best als zoekterm (genres als "techno" leveren op BitMidi weinig op).
 *
 * De "Toetsenisten"-groep is afgeleid uit de artiest-signatuur-combo's
 * (`lib/toneCombos.ts`); de overige groepen zijn gecureerd. De volwaardige
 * genre→artiest-multiselect met data-API-suggesties is Fase 2 (zie docs/roadmap.md).
 */
export interface MidiChip {
  label: string;
  /** Zoekterm die in BitMidi wordt gezet (kan afwijken van het label). */
  query: string;
  group: string;
  /** Optioneel: thema (`lib/soundThemes.ts`) met bijpassende klanken voor de mini-picker. */
  themeId?: string;
  /** Karakteristieke klanken die voor deze chip bovenaan de singles horen (Zelda → Ocarina). */
  featured?: string[];
}

/** Artiestnamen uit de "Artiest-signatuur"-combo's: "Naam — beschrijving". */
function keyboardistsFromCombos(): MidiChip[] {
  const seen = new Set<string>();
  const chips: MidiChip[] = [];
  for (const c of TONE_COMBOS) {
    if (c.genreId !== "artist-signature") continue;
    const name = c.name.split("—")[0].trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    // Het artiest-thema is afgeleid van dezelfde combo (zie soundThemes.ts).
    chips.push({ label: name, query: name, group: "Toetsenisten", themeId: `artist:${c.id}` });
  }
  return chips;
}

const CURATED: MidiChip[] = [
  // ── Klassiek (per componist een periode-passende klank vooraan) ──
  { label: "Beethoven", query: "Beethoven", group: "Klassiek", themeId: "klassiek", featured: ["Fortepiano", "European Grand"] },
  { label: "Mozart", query: "Mozart", group: "Klassiek", themeId: "klassiek", featured: ["Fortepiano", "European Grand"] },
  { label: "Bach", query: "Bach", group: "Klassiek", themeId: "klassiek", featured: ["Harpsichord", "Fortepiano"] },
  { label: "Chopin", query: "Chopin", group: "Klassiek", themeId: "klassiek", featured: ["European Grand", "Mellow Upright"] },
  { label: "Debussy", query: "Debussy", group: "Klassiek", themeId: "klassiek", featured: ["European Grand"] },
  { label: "Liszt", query: "Liszt", group: "Klassiek", themeId: "klassiek", featured: ["European Grand"] },
  { label: "Satie", query: "Satie", group: "Klassiek", themeId: "klassiek", featured: ["Mellow Upright", "European Grand"] },
  // ── Film & game (karakteristieke klank vooraan) ──
  { label: "Hans Zimmer", query: "Zimmer", group: "Film & game", themeId: "filmscore-game", featured: ["Orchestra", "Epic Strings", "Brass 1"] },
  { label: "John Williams", query: "John Williams", group: "Film & game", themeId: "filmscore-game", featured: ["Orchestra", "Epic Strings", "Brass 1"] },
  { label: "Star Wars", query: "Star Wars", group: "Film & game", themeId: "filmscore-game", featured: ["Orchestra", "Brass 1", "Epic Strings"] },
  { label: "Final Fantasy", query: "Final Fantasy", group: "Film & game", themeId: "filmscore-game", featured: ["Harp", "Celesta", "Pan Flute"] },
  { label: "Zelda", query: "Zelda", group: "Film & game", themeId: "filmscore-game", featured: ["Ocarina", "Pan Flute", "Harp", "Music Box"] },
  { label: "Mario", query: "Super Mario", group: "Film & game", themeId: "filmscore-game", featured: ["Square Lead1", "Marimba", "Steel Drums"] },
  { label: "Pokémon", query: "Pokemon", group: "Film & game", themeId: "filmscore-game", featured: ["Square Lead1", "Celesta", "Music Box"] },
];

/** Ingebouwde chips, gegroepeerd op `group` in invoegvolgorde. */
export const BUILTIN_CHIPS: MidiChip[] = [...keyboardistsFromCombos(), ...CURATED];

/** Chips gegroepeerd per groepsnaam (stabiele volgorde van eerste voorkomen). */
export function chipsByGroup(chips: MidiChip[]): [string, MidiChip[]][] {
  const groups = new Map<string, MidiChip[]>();
  for (const chip of chips) {
    const list = groups.get(chip.group) ?? [];
    list.push(chip);
    groups.set(chip.group, list);
  }
  return [...groups.entries()];
}

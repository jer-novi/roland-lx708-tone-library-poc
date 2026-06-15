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
    chips.push({ label: name, query: name, group: "Toetsenisten" });
  }
  return chips;
}

const CURATED: MidiChip[] = [
  // ── Klassiek ──
  { label: "Beethoven", query: "Beethoven", group: "Klassiek" },
  { label: "Mozart", query: "Mozart", group: "Klassiek" },
  { label: "Bach", query: "Bach", group: "Klassiek" },
  { label: "Chopin", query: "Chopin", group: "Klassiek" },
  { label: "Debussy", query: "Debussy", group: "Klassiek" },
  { label: "Liszt", query: "Liszt", group: "Klassiek" },
  { label: "Satie", query: "Satie", group: "Klassiek" },
  // ── Film & game ──
  { label: "Hans Zimmer", query: "Zimmer", group: "Film & game" },
  { label: "John Williams", query: "John Williams", group: "Film & game" },
  { label: "Star Wars", query: "Star Wars", group: "Film & game" },
  { label: "Final Fantasy", query: "Final Fantasy", group: "Film & game" },
  { label: "Zelda", query: "Zelda", group: "Film & game" },
  { label: "Mario", query: "Super Mario", group: "Film & game" },
  { label: "Pokémon", query: "Pokemon", group: "Film & game" },
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

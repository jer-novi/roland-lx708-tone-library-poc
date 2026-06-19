import type { ToneDto } from "@/lib/types";
import type { Collection } from "@/lib/collections";
import { collectionsFor, parseTags } from "@/lib/collections";
import {
  TONE_COMBOS,
  resolveCombo,
  type ToneComboDef,
  type ResolvedCombo,
} from "@/lib/toneCombos";

/**
 * "Sound themes": koppelen een snelkeuze-chip (artiest/genre/franchise) aan de
 * bijpassende LX708-klanken — losse klanken (singles), duals/splits, en later
 * multi-kanaals layers. Eén thema voedt zo de mini-picker bij de MIDI-tracks
 * (en straks ook het linkificeren van de opnamegids).
 *
 * Singles worden *afgeleid + gefilterd* (besluit): de tonen die in de combo's van
 * het thema voorkomen, verbreed met een per-thema filter op categorie/collectie/
 * tags/namen. Zo blijft de mapping klein maar dekt 'bv. alle klassieke singles'.
 */
export interface SoundTheme {
  id: string;
  label: string;
  /** Welke `TONE_COMBOS`-genres (via `genreId`) bij dit thema passen. */
  genreIds: string[];
  /** Filter voor losse klanken die bij dit thema horen (unie van de dimensies). */
  singles: {
    categories?: string[];
    collections?: Collection[];
    tags?: string[];
    names?: string[];
  };
  /** Combo-id dat altijd bovenaan komt (artiest-signatuur). */
  signatureComboId?: string;
  /** Karakteristieke klanken die bovenaan de singles-lijst horen (in deze volgorde). */
  featured?: string[];
}

/**
 * Multi-kanaals "layered" preset — placeholder voor de toekomstige layer-engine
 * (zie LP-Fase 2). Vorm spiegelt `LayerCfg` uit `components/LayerSpike.tsx`.
 */
export interface LayeredComposition {
  id: string;
  label: string;
  description: string;
  layers: { channel: number; toneName: string; zone: "low" | "high" | "both" }[];
}

/** Combo-defs van een thema, met de signature-combo vooraan. */
export function combosForTheme(theme: SoundTheme): ToneComboDef[] {
  const genres = new Set(theme.genreIds);
  const list = TONE_COMBOS.filter((c) => genres.has(c.genreId));
  if (!theme.signatureComboId) return list;
  const sig = theme.signatureComboId;
  return [...list].sort((a, b) =>
    a.id === sig ? -1 : b.id === sig ? 1 : 0
  );
}

/** Combo's van een thema, geresolved tegen de catalogus (signature vooraan). */
export function resolvedCombosForTheme(
  theme: SoundTheme,
  tones: ToneDto[]
): ResolvedCombo[] {
  return combosForTheme(theme).map((def) => resolveCombo(def, tones));
}

/**
 * Losse klanken die bij een thema passen, **gerangschikt op relevantie**:
 * 1. `featured` (chip-override → signature-combo-tonen → thema-default), in die volgorde;
 * 2. tonen die in de combo's van het thema voorkomen;
 * 3. overige matches op categorie/collectie/tags/expliciete namen.
 *
 * Zo staat de karakteristieke klank vooraan (Zelda → Ocarina; een artiest → zijn
 * eigen signature-instrument i.p.v. een generieke vleugel) i.p.v. altijd Piano.
 * Behoudt binnen elke rang de volgorde van `tones` (typisch `studio.ordered`).
 */
export function singlesForTheme(
  theme: SoundTheme,
  tones: ToneDto[],
  extraFeatured: string[] = []
): ToneDto[] {
  const f = theme.singles;
  // Featured-volgorde: chip-override → signature-combo-tonen → thema-default.
  const sig = theme.signatureComboId
    ? TONE_COMBOS.find((c) => c.id === theme.signatureComboId)
    : undefined;
  const featuredOrder: string[] = [];
  const pushFeatured = (n?: string) => {
    if (!n) return;
    const nl = n.toLowerCase();
    if (!featuredOrder.includes(nl)) featuredOrder.push(nl);
  };
  extraFeatured.forEach(pushFeatured);
  pushFeatured(sig?.tone1);
  pushFeatured(sig?.tone2);
  (theme.featured ?? []).forEach(pushFeatured);
  const featuredRank = new Map(featuredOrder.map((n, i) => [n, i]));

  const comboNames = new Set<string>();
  for (const def of combosForTheme(theme)) {
    comboNames.add(def.tone1.toLowerCase());
    comboNames.add(def.tone2.toLowerCase());
  }
  const explicit = new Set((f.names ?? []).map((n) => n.toLowerCase()));
  const cats = new Set(f.categories ?? []);
  const cols = new Set<Collection>(f.collections ?? []);
  const tags = new Set((f.tags ?? []).map((t) => t.toLowerCase()));

  const matches = (t: ToneDto): boolean => {
    const nl = t.name.toLowerCase();
    if (featuredRank.has(nl) || comboNames.has(nl) || explicit.has(nl)) return true;
    if (cats.has(t.category)) return true;
    if (cols.size && collectionsFor(t).some((c) => cols.has(c))) return true;
    if (tags.size && parseTags(t.tags).some((tag) => tags.has(tag.toLowerCase()))) return true;
    return false;
  };
  const rank = (t: ToneDto): number => {
    const nl = t.name.toLowerCase();
    const fr = featuredRank.get(nl);
    if (fr !== undefined) return fr; // 0..n: expliciete featured-volgorde
    if (comboNames.has(nl)) return 1000; // combo-gerefereerd
    return 2000; // overige filter-matches
  };
  return tones.filter(matches).sort((a, b) => rank(a) - rank(b));
}

// ── Gecureerde thema's ──
const CURATED_THEMES: SoundTheme[] = [
  {
    id: "klassiek",
    label: "Klassiek",
    genreIds: ["modern-klassiek", "cinematic"],
    singles: { categories: ["Piano"], tags: ["klassiek", "warm", "ballad"] },
  },
  {
    id: "filmscore-game",
    label: "Film & game",
    genreIds: ["filmscore", "cinematic", "retro-game"],
    singles: { collections: ["Snaren", "Stemmen & koor", "Synth & pads"] },
  },
];

/** Eén thema per artiest-signatuur-combo; de eigen combo staat vooraan. */
function artistThemes(): SoundTheme[] {
  return TONE_COMBOS.filter((c) => c.genreId === "artist-signature").map((c) => ({
    id: `artist:${c.id}`,
    label: c.name.split("—")[0].trim(),
    genreIds: ["artist-signature"],
    singles: { categories: ["Piano", "E. Piano"] },
    signatureComboId: c.id,
  }));
}

export const THEMES: SoundTheme[] = [...CURATED_THEMES, ...artistThemes()];
export const themeById = new Map(THEMES.map((t) => [t.id, t]));

// ── Layered placeholders (nog geen engine) ──
export const LAYERED_COMPOSITIONS: LayeredComposition[] = [
  {
    id: "layered-cinematic-4",
    label: "Cinematic stack (4 lagen)",
    description: "Vleugel + epische strijkers onder, koor + pad boven — over vier kanalen.",
    layers: [
      { channel: 1, toneName: "American Grand", zone: "low" },
      { channel: 2, toneName: "Epic Strings", zone: "low" },
      { channel: 5, toneName: "Choir 2", zone: "high" },
      { channel: 6, toneName: "Warm Pad", zone: "high" },
    ],
  },
  {
    id: "layered-synth-3",
    label: "Synth stack (3 lagen)",
    description: "Saw-lead boven, FM-EP breed, synthbas onder.",
    layers: [
      { channel: 1, toneName: "Saw Lead 1", zone: "high" },
      { channel: 2, toneName: "FM E.Piano", zone: "both" },
      { channel: 5, toneName: "Synth Bass 1", zone: "low" },
    ],
  },
];

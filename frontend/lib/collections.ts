import type { ToneDto } from "@/lib/types";

/**
 * Virtuele collecties: muzikantenlogica bovenop de hardware-indeling
 * (zie docs/Frontend_UX_Plan_Fase2.md, sectie 4). Een tone mag in
 * meerdere collecties zitten. Afgeleid van categorie, subcategorie en
 * — voor GM2 — de instrumentfamilie van het GM2 program number.
 */
export const COLLECTIONS = [
  "Toetsen",
  "Snaren",
  "Blazers",
  "Stemmen & koor",
  "Percussie & drums",
  "Synth & pads",
  "Wereldinstrumenten",
  "FX & geluiden",
] as const;

export type Collection = (typeof COLLECTIONS)[number];

const STRINGS_CATEGORY_OVERRIDES: Record<string, Collection[]> = {
  "Chamber Winds": ["Blazers"],
  Flute: ["Blazers"],
  OrchestraBrs: ["Blazers"],
  "Jazz Scat": ["Stemmen & koor"],
  "Soft Pad": ["Synth & pads"],
  "Magical Piano": ["Toetsen", "FX & geluiden"],
  "A.Bass+Cymbl": ["Snaren"],
};

/** Namen die naast hun familie-collectie ook Wereldinstrumenten zijn */
const WORLD_NAMES =
  /ukulele|mandolin|hawaiian|yang qin|pan flute|shakuhachi|ocarina|steel drums|agogo|taiko|castanets|santur/i;

function gm2Collections(name: string, program: number): Collection[] {
  const cols: Collection[] = [];
  if (program <= 8) cols.push("Toetsen");
  else if (program <= 15) cols.push("Percussie & drums");
  else if (program === 16) cols.push("Wereldinstrumenten"); // santur
  else if (program <= 22) cols.push("Toetsen"); // orgels + accordeon
  else if (program === 23) cols.push("Blazers"); // mondharmonica
  else if (program === 24) cols.push("Wereldinstrumenten"); // bandoneon
  else if (program <= 47) cols.push("Snaren"); // gitaren, bassen, strijkers, harp
  else if (program === 48) cols.push("Percussie & drums"); // pauken
  else if (program <= 52) cols.push("Snaren"); // ensembles
  else if (program <= 55) cols.push("Stemmen & koor");
  else if (program === 56) cols.push("FX & geluiden"); // orchestra hit
  else if (program <= 80) cols.push("Blazers");
  else if (program <= 104) cols.push("Synth & pads");
  else if (program <= 112) cols.push("Wereldinstrumenten");
  else if (program <= 119) cols.push("Percussie & drums");
  else if (program === 120) cols.push("Percussie & drums", "FX & geluiden");
  else cols.push("FX & geluiden");

  if (program >= 39 && program <= 40) cols.push("Synth & pads"); // synth bass
  if (program >= 51 && program <= 52) cols.push("Synth & pads"); // synth strings
  if (program >= 97 && program <= 104) cols.push("FX & geluiden"); // synth fx
  if (WORLD_NAMES.test(name) && !cols.includes("Wereldinstrumenten")) {
    cols.push("Wereldinstrumenten");
  }
  return cols;
}

export function collectionsFor(
  tone: Pick<ToneDto, "category" | "subCategory" | "name" | "midiProgram">
): Collection[] {
  const { category, subCategory, name } = tone;
  if (category === "Piano" || category === "E. Piano") return ["Toetsen"];
  if (category === "Strings") {
    return STRINGS_CATEGORY_OVERRIDES[name] ?? ["Snaren"];
  }
  switch (subCategory) {
    case "Organ":
    case "Upright":
    case "Classical":
      return ["Toetsen"];
    case "Do Re Mi":
      return ["Stemmen & koor"];
    case "Drums":
      return name === "SFX Set"
        ? ["Percussie & drums", "FX & geluiden"]
        : ["Percussie & drums"];
    case "GM2":
      return tone.midiProgram != null ? gm2Collections(name, tone.midiProgram) : [];
    default:
      return [];
  }
}

/** Comma-separated tags uit de API naar een nette lijst */
export function parseTags(tags: string | null): string[] {
  return tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

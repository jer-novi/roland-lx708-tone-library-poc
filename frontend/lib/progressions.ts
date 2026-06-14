import { Note, Chord } from "tonal";

/** Eén akkoord van een progressie: interval vanaf de grondtoon + akkoordtype. */
export interface ProgChord {
  /** Interval vanaf de grondtoon, bv. "1P", "5P", "6M". */
  iv: string;
  /** Akkoordtype-symbool: "" (majeur), "m", "7", "maj7", "m7", "dim", "m7b5". */
  type: string;
}

export interface ProgressionDef {
  id: string;
  label: string;
  /** Romeinse-cijfer-notatie voor weergave. */
  roman: string;
  mode: "majeur" | "mineur";
  blurb: string;
  chords: ProgChord[];
}

export interface ResolvedChord {
  name: string;
  /** Pitch-class-namen, oplopend (bv. ["A","C","E"]). */
  notes: string[];
}

/**
 * Zet een progressie om naar concrete akkoorden in de gekozen grondtoon.
 * Quality komt expliciet uit `type` (tonal's roman-numeral-parser negeert
 * hoofd/kleine letters, dus dat doen we niet via Romeinse cijfers).
 */
export function resolveProgression(
  prog: ProgressionDef,
  root: string
): ResolvedChord[] {
  return prog.chords.map(({ iv, type }) => {
    const r = Note.pitchClass(Note.transpose(root, iv));
    const name = `${r}${type}`;
    return { name, notes: Chord.get(name).notes };
  });
}

export const PROGRESSIONS: ProgressionDef[] = [
  // ---- Majeur ----
  {
    id: "axis",
    label: "Pop-axis",
    roman: "I–V–vi–IV",
    mode: "majeur",
    blurb: "De 'vier akkoorden'-popformule (Axis of Awesome): werkt in ontelbare hits.",
    chords: [
      { iv: "1P", type: "" },
      { iv: "5P", type: "" },
      { iv: "6M", type: "m" },
      { iv: "4P", type: "" },
    ],
  },
  {
    id: "axis-emotional",
    label: "Ballad-axis",
    roman: "vi–IV–I–V",
    mode: "majeur",
    blurb: "Emotionele variant van de axis; begint op de mineur-relatieve.",
    chords: [
      { iv: "6M", type: "m" },
      { iv: "4P", type: "" },
      { iv: "1P", type: "" },
      { iv: "5P", type: "" },
    ],
  },
  {
    id: "doo-wop",
    label: "Doo-wop (jaren 50)",
    roman: "I–vi–IV–V",
    mode: "majeur",
    blurb: "Het 50s-progressietje; van 'Stand By Me' tot eindeloze ballads.",
    chords: [
      { iv: "1P", type: "" },
      { iv: "6M", type: "m" },
      { iv: "4P", type: "" },
      { iv: "5P", type: "" },
    ],
  },
  {
    id: "blues-three",
    label: "Blues/rock",
    roman: "I7–IV7–V7",
    mode: "majeur",
    blurb: "Drie dominant-septiemen — het hart van blues, rock-'n-roll en boogie.",
    chords: [
      { iv: "1P", type: "7" },
      { iv: "4P", type: "7" },
      { iv: "5P", type: "7" },
    ],
  },
  {
    id: "twelve-bar",
    label: "12-bar blues",
    roman: "I7×4 · IV7×2 · I7×2 · V7–IV7–I7–V7",
    mode: "majeur",
    blurb: "De volledige 12-maats-bluesvorm; speel mee op een pentatonische ladder.",
    chords: [
      { iv: "1P", type: "7" },
      { iv: "1P", type: "7" },
      { iv: "1P", type: "7" },
      { iv: "1P", type: "7" },
      { iv: "4P", type: "7" },
      { iv: "4P", type: "7" },
      { iv: "1P", type: "7" },
      { iv: "1P", type: "7" },
      { iv: "5P", type: "7" },
      { iv: "4P", type: "7" },
      { iv: "1P", type: "7" },
      { iv: "5P", type: "7" },
    ],
  },
  {
    id: "ii-v-i",
    label: "Jazz-cadens",
    roman: "ii7–V7–Imaj7",
    mode: "majeur",
    blurb: "De ii–V–I: de belangrijkste cadens in jazz.",
    chords: [
      { iv: "2M", type: "m7" },
      { iv: "5P", type: "7" },
      { iv: "1P", type: "maj7" },
    ],
  },
  {
    id: "turnaround",
    label: "Jazz-turnaround",
    roman: "Imaj7–vi7–ii7–V7",
    mode: "majeur",
    blurb: "Klassieke turnaround / 'rhythm changes'-opening.",
    chords: [
      { iv: "1P", type: "maj7" },
      { iv: "6M", type: "m7" },
      { iv: "2M", type: "m7" },
      { iv: "5P", type: "7" },
    ],
  },
  {
    id: "pachelbel",
    label: "Canon (Pachelbel)",
    roman: "I–V–vi–iii–IV–I–IV–V",
    mode: "majeur",
    blurb: "De Canon van Pachelbel; ook de basis van talloze popnummers.",
    chords: [
      { iv: "1P", type: "" },
      { iv: "5P", type: "" },
      { iv: "6M", type: "m" },
      { iv: "3M", type: "m" },
      { iv: "4P", type: "" },
      { iv: "1P", type: "" },
      { iv: "4P", type: "" },
      { iv: "5P", type: "" },
    ],
  },
  // ---- Mineur ----
  {
    id: "andalusian",
    label: "Andalusische cadens",
    roman: "i–VII–VI–V",
    mode: "mineur",
    blurb: "Flamenco/Spaanse cadens; dalende lijn naar een grote dominant.",
    chords: [
      { iv: "1P", type: "m" },
      { iv: "7m", type: "" },
      { iv: "6m", type: "" },
      { iv: "5P", type: "" },
    ],
  },
  {
    id: "epic-minor",
    label: "Epische mineur-pop",
    roman: "i–VI–III–VII",
    mode: "mineur",
    blurb: "Filmische, 'epische' mineur-loop (denk soundtrack/EDM).",
    chords: [
      { iv: "1P", type: "m" },
      { iv: "6m", type: "" },
      { iv: "3m", type: "" },
      { iv: "7m", type: "" },
    ],
  },
  {
    id: "natural-minor",
    label: "Pure mineur",
    roman: "i–iv–v",
    mode: "mineur",
    blurb: "Natuurlijk-mineur; donker en rustig.",
    chords: [
      { iv: "1P", type: "m" },
      { iv: "4P", type: "m" },
      { iv: "5P", type: "m" },
    ],
  },
  {
    id: "harmonic-minor",
    label: "Mineur met dominant",
    roman: "i–iv–V",
    mode: "mineur",
    blurb: "Harmonisch-mineur: de grote V geeft spanning richting de i.",
    chords: [
      { iv: "1P", type: "m" },
      { iv: "4P", type: "m" },
      { iv: "5P", type: "" },
    ],
  },
  {
    id: "minor-jazz",
    label: "Mineur jazz-cadens",
    roman: "ii°7–V7–i",
    mode: "mineur",
    blurb: "De mineur-ii–V–i; halfverminderd → dominant → mineur-tonica.",
    chords: [
      { iv: "2M", type: "m7b5" },
      { iv: "5P", type: "7" },
      { iv: "1P", type: "m" },
    ],
  },
];

import type { ProgressionDef } from "@/lib/progressions";
import { resolveProgression } from "@/lib/progressions";

/**
 * Eén cel van een akkoordschema: een akkoord of een rustteken, met een duur in
 * tellen. Dit is het gedeelde model dat de Progressies, de (latere) chord-chart-
 * editor én de (latere) iReal/ChordPro-import allemaal voeden aan de engine.
 */
export interface ChartCell {
  kind: "chord" | "rest";
  /** Akkoordsymbool (bv. "Cmaj7"); vereist bij kind "chord". */
  symbol?: string;
  /** Duur in tellen. */
  beats: number;
}

export interface ChordChart {
  id: string;
  title: string;
  bpm: number;
  beatsPerBar: number;
  feel: "straight" | "swing";
  loop: boolean;
  cells: ChartCell[];
  source?: "builtin" | "editor" | "ireal" | "chordpro";
}

export const chartTotalBeats = (chart: ChordChart): number =>
  chart.cells.reduce((sum, c) => sum + c.beats, 0);

/** Zet een progressie (één akkoord per bar) om naar een afspeelbare chart. */
export function progressionToChart(
  prog: ProgressionDef,
  root: string,
  opts?: { bpm?: number; beatsPerBar?: number; feel?: "straight" | "swing"; loop?: boolean }
): ChordChart {
  const beatsPerBar = opts?.beatsPerBar ?? 4;
  const cells: ChartCell[] = resolveProgression(prog, root).map((c) => ({
    kind: "chord",
    symbol: c.name,
    beats: beatsPerBar,
  }));
  return {
    id: `prog-${prog.id}-${root}`,
    title: `${prog.label} (${root})`,
    bpm: opts?.bpm ?? 100,
    beatsPerBar,
    feel: opts?.feel ?? "straight",
    loop: opts?.loop ?? false,
    cells,
    source: "builtin",
  };
}

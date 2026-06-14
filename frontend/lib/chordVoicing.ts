import { Chord, Note } from "tonal";

export type CompStyle = "block" | "simple";
export type Feel = "straight" | "swing";

/** Eén akkoord-aanslag binnen een cel. */
export interface ChordHit {
  /** Start binnen de cel, in tellen. */
  offsetBeats: number;
  /** Duur in tellen. */
  durBeats: number;
  /** Velocity 1–127. */
  velocity: number;
}

/* ───────────────────────────────────────────────────────────────────────────
 * MODULAIRE SEAM — output-/arrangeerlaag
 *
 * `voiceChord` (symbool → MIDI-noten) en `compPattern` (ritmische aanslagen) zijn
 * bewust de énige plek waar een akkoordschema klank/arrangement wordt. Nu: een
 * simpele PIANO-COMPING via `tonal`.
 *
 * Later schuiven we hier een aparte SYNTH-/BACKING-BAND-ENGINE in:
 *  - een rijkere symbool-parser (`chord-symbol`, jazz-faithful) i.p.v. `tonal`;
 *  - voicing-strategieën (shell, rootless, drop-2…);
 *  - echte stijlen met bas + drums (de "performance-grade" band van iReal Pro).
 * Houd daarom de contracten (`voiceChord`, `compPattern`, `ChordHit`) stabiel;
 * de engine (`useChartPlayer`) kent alleen deze contracten, niet de implementatie.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Vertaalt een akkoordsymbool naar MIDI-noten in een vast pianoregister.
 * Geeft een lege array bij een onbekend symbool.
 */
export function voiceChord(
  symbol: string,
  opts?: { octave?: number; bass?: boolean }
): number[] {
  const octave = opts?.octave ?? 4;
  const chord = Chord.get(symbol);
  if (chord.empty || chord.notes.length === 0) return [];

  // Stapel de akkoordtonen oplopend vanaf het gekozen octaaf.
  let oct = octave;
  let prev = -1;
  const out: number[] = [];
  for (const name of chord.notes) {
    const chroma = Note.chroma(name);
    if (chroma == null) continue;
    if (chroma <= prev) oct++;
    out.push(chroma + (oct + 1) * 12);
    prev = chroma;
  }

  if (opts?.bass) {
    const rootChroma = Note.chroma(chord.tonic ?? chord.notes[0]);
    if (rootChroma != null) out.unshift(rootChroma + octave * 12); // grondtoon een octaaf lager
  }
  return out;
}

/**
 * Comping-patroon binnen één cel. Start-stijlen:
 * - `block`  : één aanslag, hele cel aangehouden.
 * - `simple` : aanslag op tel 1 en (bij ≥3 tellen) tel 3 — lichte comping.
 * `feel` "swing" verschuift de backbeat-aanslag iets richting een triool-gevoel.
 */
export function compPattern(beats: number, style: CompStyle, feel: Feel): ChordHit[] {
  if (style === "block") {
    return [{ offsetBeats: 0, durBeats: beats, velocity: 80 }];
  }
  const hits: ChordHit[] = [
    { offsetBeats: 0, durBeats: Math.min(beats, 1.6), velocity: 84 },
  ];
  if (beats >= 3) {
    const swing = feel === "swing" ? 0.12 : 0;
    hits.push({
      offsetBeats: 2 + swing,
      durBeats: Math.min(beats - 2, 1.6),
      velocity: 72,
    });
  }
  return hits;
}

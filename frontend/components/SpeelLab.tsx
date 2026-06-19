"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chord, Scale, Note } from "tonal";
import type { MidiState } from "@/hooks/useMidi";
import type { Studio } from "@/hooks/useStudio";
import { useMidiPlayer } from "@/hooks/useMidiPlayer";
import { useChartPlayer } from "@/hooks/useChartPlayer";
import { MidiTracksTab } from "@/components/MidiTracksTab";
import { PROGRESSIONS, resolveProgression } from "@/lib/progressions";
import { progressionToChart } from "@/lib/chordChart";
import type { CompStyle } from "@/lib/chordVoicing";
import {
  TRANSPOSE_MIN,
  TRANSPOSE_MAX,
  transposeToRootMidi,
} from "@/lib/rolandSysex";

const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Transpose-stappen oplopend vanaf de laagste klank (−6 = F#3) t/m +5 = F4.
const TRANSPOSE_STEPS = Array.from(
  { length: TRANSPOSE_MAX - TRANSPOSE_MIN + 1 },
  (_, i) => TRANSPOSE_MIN + i
);

/** Pitch-class (0–11) → kleinste transpose binnen −6..+5 (tritonus-split). */
const pcToTranspose = (pc: number) => (pc <= 5 ? pc : pc - 12);

/**
 * Grondtoon-keuze. In sync-modus gekoppeld aan het transpose-wiel (beperkt tot
 * −6..+5, oplopend vanaf de laagste klank); in vrije modus een gewone
 * grondtoon-keuze die met de octaaf-knop samenwerkt.
 */
function GrondtoonSelect({
  studio,
  freeRoot,
  onFreeRoot,
}: {
  studio: Studio;
  freeRoot: string;
  onFreeRoot: (r: string) => void;
}) {
  if (studio.syncMode) {
    return (
      <label
        className="flex items-center gap-1.5"
        title="Gekoppeld aan het transpose-wiel — kies een octaaf via de vrije modus"
      >
        🔗 Grondtoon
        <select
          value={studio.transpose}
          onChange={(e) => studio.setTranspose(Number(e.target.value))}
          className="rounded-lg border border-border-soft bg-surface px-2 py-1 text-foreground"
        >
          {TRANSPOSE_STEPS.map((t) => (
            <option key={t} value={t}>
              {Note.fromMidi(transposeToRootMidi(t))} ({t > 0 ? "+" : ""}
              {t})
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="flex items-center gap-1.5">
      Grondtoon
      <select
        value={freeRoot}
        onChange={(e) => onFreeRoot(e.target.value)}
        className="rounded-lg border border-border-soft bg-surface px-2 py-1 text-foreground"
      >
        {ROOTS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}

const CHORD_TYPES: { label: string; sym: string }[] = [
  { label: "Majeur", sym: "" },
  { label: "Mineur", sym: "m" },
  { label: "7", sym: "7" },
  { label: "Maj7", sym: "maj7" },
  { label: "m7", sym: "m7" },
  { label: "dim", sym: "dim" },
  { label: "aug", sym: "aug" },
  { label: "sus4", sym: "sus4" },
  { label: "sus2", sym: "sus2" },
  { label: "6", sym: "6" },
  { label: "add9", sym: "add9" },
  { label: "9", sym: "9" },
];

const SCALE_TYPES: { label: string; name: string }[] = [
  { label: "Majeur", name: "major" },
  { label: "Mineur", name: "minor" },
  { label: "Dorisch", name: "dorian" },
  { label: "Mixolydisch", name: "mixolydian" },
  { label: "Majeur pentatonisch", name: "major pentatonic" },
  { label: "Mineur pentatonisch", name: "minor pentatonic" },
  { label: "Blues", name: "blues" },
  { label: "Harmonisch mineur", name: "harmonic minor" },
];

/** Pitch-class-namen → oplopende MIDI-nummers vanaf de gekozen octaaf. */
function notesToMidi(names: string[], octave: number): number[] {
  let oct = octave;
  let prevChroma = -1;
  const out: number[] = [];
  for (const n of names) {
    const chroma = Note.chroma(n);
    if (chroma == null) continue;
    if (chroma <= prevChroma) oct++;
    out.push(chroma + (oct + 1) * 12);
    prevChroma = chroma;
  }
  return out;
}

type Tab = "chords" | "progressions" | "scales" | "midi";

export function SpeelLab({ midi, studio }: { midi: MidiState; studio: Studio }) {
  // Stabiele ref naar de (per render nieuwe) midi-state, zodat de
  // opruim-effecten niet bij elke render afvuren en lopende ladders/akkoorden
  // afkappen.
  const midiRef = useRef(midi);
  useEffect(() => {
    midiRef.current = midi;
  }, [midi]);

  const player = useMidiPlayer(midi, studio.transpose);
  const chart = useChartPlayer(midi);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chords");
  const [root, setRoot] = useState("C");
  const [chordSym, setChordSym] = useState("");
  const [scaleName, setScaleName] = useState("major");
  const [octave, setOctave] = useState(4);
  const [progRoot, setProgRoot] = useState("C");
  // Engine-transport voor progressies (en straks de editor/import).
  const [bpm, setBpm] = useState(100);
  const [loop, setLoop] = useState(false);
  const [feel, setFeel] = useState<"straight" | "swing">("straight");
  const [compStyle, setCompStyle] = useState<CompStyle>("block");

  const timers = useRef<number[]>([]);
  const held = useRef<number[]>([]);

  const ready = midi.status === "ready" && midi.outputs.length > 0;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Stopt akkoorden/ladders/progressies van het lab (niet de track-speler). */
  const stopLab = useCallback(() => {
    clearTimers();
    held.current = [];
    chart.stop(); // stopt de progressie-engine (eigen interval)
    // panic ruimt ook hangende ladder-noten + de echo-weergave op.
    midiRef.current.panic();
  }, [chart]);

  /** Stopt álles: lab-geluiden én de MIDI-track-speler. */
  const stopAll = useCallback(() => {
    player.stop();
    stopLab();
  }, [player, stopLab]);

  // Alleen bij unmount opruimen (niet bij elke midi-identiteitswissel).
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      midiRef.current.panic();
    },
    []
  );

  // Klinkende grondtoon in sync-modus = afgeleid van de transpose (vaste band
  // rond midden C). In vrije modus gelden de lokale grondtoon + octaaf.
  const syncRootName = useMemo(
    () => Note.pitchClass(Note.fromMidi(transposeToRootMidi(studio.transpose))),
    [studio.transpose]
  );
  const effRoot = studio.syncMode ? syncRootName : root;
  const effProgRoot = studio.syncMode ? syncRootName : progRoot;
  // Octaaf van de gesynchroniseerde grondtoon: F#3..B3 (negatief) of C4..F4.
  const effOctave = studio.syncMode ? (studio.transpose < 0 ? 3 : 4) : octave;

  // Overgang sync ⟷ vrij: grondtoon meenemen zodat de toonsoort niet verspringt.
  const prevSync = useRef(studio.syncMode);
  const prevTranspose = useRef(studio.transpose);
  useEffect(() => {
    if (studio.syncMode !== prevSync.current) {
      if (studio.syncMode) {
        // Vrij → sync via de schakelaar (wiel onveranderd): map de lokale
        // grondtoon naar transpose. Via het wiel wijzigt transpose juist wél,
        // dus dan niet overschrijven.
        if (studio.transpose === prevTranspose.current) {
          const pc = Note.chroma(root);
          if (pc != null) studio.setTranspose(pcToTranspose(pc));
        }
      } else {
        // Sync → vrij: zet de lokale grondtoon op de laatst klinkende toon,
        // op het referentie-octaaf; klavier speelt weer concert.
        const name = Note.pitchClass(
          Note.fromMidi(transposeToRootMidi(prevTranspose.current))
        );
        setRoot(name);
        setProgRoot(name);
        setOctave(4);
      }
    }
    prevSync.current = studio.syncMode;
    prevTranspose.current = studio.transpose;
  }, [studio.syncMode, studio.transpose, root, studio]);

  const chordNames = Chord.get(`${effRoot}${chordSym}`).notes;
  const scaleNames = Scale.get(`${effRoot} ${scaleName}`).notes;

  // ---- Akkoorden (vasthouden = aangehouden spelen) ----
  const playChord = () => {
    stopAll();
    const mids = notesToMidi(chordNames, effOctave);
    mids.forEach((n) => midiRef.current.noteOn(n, 80));
    held.current = mids;
  };
  const stopChord = () => {
    held.current.forEach((n) => midiRef.current.noteOff(n));
    held.current = [];
  };

  // ---- Toonladder (op en neer) ----
  const playScale = () => {
    stopAll();
    const base = notesToMidi(scaleNames, effOctave);
    if (base.length === 0) return;
    const seq = [...base, base[0] + 12, ...[...base].reverse()];
    const step = 220;
    const dur = 190;
    seq.forEach((n, i) => {
      const onId = window.setTimeout(() => {
        midiRef.current.noteOn(n, 80);
        const offId = window.setTimeout(() => midiRef.current.noteOff(n), dur);
        timers.current.push(offId);
      }, i * step);
      timers.current.push(onId);
    });
  };

  // ---- Progressie (via de gedeelde chart-engine: loop + tempo + comping) ----
  const playProgression = (progId: string) => {
    const prog = PROGRESSIONS.find((p) => p.id === progId);
    if (!prog) return;
    stopAll();
    const ch = progressionToChart(prog, effProgRoot, { bpm, feel, loop });
    chart.play(ch, { style: compStyle });
  };

  // Welke progressie-kaart speelt nu (voor highlight) — afgeleid uit de engine.
  const playingChartId = chart.isPlaying ? chart.chart?.id : null;

  return (
    <div className="mt-3 rounded-xl border border-border-soft bg-surface px-4 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-medium"
        aria-expanded={open}
      >
        <span>🎼 Speel-lab — akkoorden, progressies &amp; toonladders</span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1">
            {([
              ["chords", "Akkoorden"],
              ["progressions", "Progressies"],
              ["scales", "Toonladders"],
              ["midi", "MIDI-tracks"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  tab === key
                    ? "bg-accent text-[#06121f]"
                    : "border border-border-soft text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Gedeelde grondtoon + octaaf (alleen akkoorden/ladders) */}
          {(tab === "chords" || tab === "scales") && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
              <GrondtoonSelect
                studio={studio}
                freeRoot={root}
                onFreeRoot={setRoot}
              />
              {studio.syncMode ? (
                <span className="text-[11px] text-muted/70">
                  Octaaf via transpose-wiel — zet Sync uit voor vrije octaven
                </span>
              ) : (
                <label className="flex items-center gap-1.5">
                  Octaaf
                  <button
                    onClick={() => setOctave((o) => Math.max(2, o - 1))}
                    className="rounded border border-border-soft px-2 py-0.5 hover:text-foreground"
                    aria-label="Octaaf omlaag"
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-mono text-foreground">{octave}</span>
                  <button
                    onClick={() => setOctave((o) => Math.min(6, o + 1))}
                    className="rounded border border-border-soft px-2 py-0.5 hover:text-foreground"
                    aria-label="Octaaf omhoog"
                  >
                    +
                  </button>
                </label>
              )}
            </div>
          )}

          {/* Akkoorden */}
          {tab === "chords" && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {CHORD_TYPES.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => setChordSym(c.sym)}
                    aria-pressed={chordSym === c.sym}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                      chordSym === c.sym
                        ? "bg-accent text-[#06121f]"
                        : "border border-border-soft text-muted hover:text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    // Pointer capturen zodat de noot blijft klinken zolang de
                    // knop ingedrukt is, ook als de cursor er net naast schuift.
                    e.currentTarget.setPointerCapture(e.pointerId);
                    playChord();
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    stopChord();
                  }}
                  onPointerCancel={stopChord}
                  disabled={!ready || chordNames.length === 0}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-[#06121f] transition hover:brightness-110 disabled:opacity-40"
                >
                  ▶ Houd vast om te spelen
                </button>
                <span className="font-mono text-xs text-accent">
                  {root}
                  {chordSym} · {chordNames.join(" ") || "—"}
                </span>
              </div>
            </div>
          )}

          {/* Progressies */}
          {tab === "progressions" && (
            <div className="mt-3 space-y-3">
              {/* Engine-transport */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <GrondtoonSelect
                  studio={studio}
                  freeRoot={progRoot}
                  onFreeRoot={setProgRoot}
                />
                <label className="flex items-center gap-1.5">
                  Tempo
                  <input
                    type="range"
                    min={40}
                    max={220}
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-24 accent-accent"
                    aria-label="Tempo (BPM)"
                  />
                  <span className="w-14 font-mono tabular-nums text-foreground">{bpm} bpm</span>
                </label>
                <button
                  onClick={() => setLoop((v) => !v)}
                  aria-pressed={loop}
                  className={`rounded-lg px-2.5 py-1 font-medium transition ${
                    loop ? "bg-accent text-[#06121f]" : "border border-border-soft hover:text-foreground"
                  }`}
                >
                  🔁 Loop
                </button>
                <label className="flex items-center gap-1.5">
                  Feel
                  <select
                    value={feel}
                    onChange={(e) => setFeel(e.target.value as "straight" | "swing")}
                    className="rounded-lg border border-border-soft bg-surface px-2 py-1 text-foreground"
                  >
                    <option value="straight">Straight</option>
                    <option value="swing">Swing</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  Comping
                  <select
                    value={compStyle}
                    onChange={(e) => setCompStyle(e.target.value as CompStyle)}
                    className="rounded-lg border border-border-soft bg-surface px-2 py-1 text-foreground"
                  >
                    <option value="block">Blok</option>
                    <option value="simple">Simpel</option>
                  </select>
                </label>
                <button
                  onClick={stopAll}
                  className="rounded-lg border border-border-soft px-3 py-1 text-muted hover:text-foreground"
                >
                  ■ Stop
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PROGRESSIONS.map((p) => {
                  const resolved = resolveProgression(p, effProgRoot);
                  const isActive = playingChartId === `prog-${p.id}-${effProgRoot}`;
                  return (
                    <button
                      key={p.id}
                      onClick={() => playProgression(p.id)}
                      disabled={!ready}
                      className={`rounded-lg border px-3 py-2 text-left transition disabled:opacity-40 ${
                        isActive
                          ? "border-accent bg-accent-soft"
                          : "border-border-soft hover:border-accent/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {p.label}
                        </span>
                        <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
                          {p.mode}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-accent">{p.roman}</div>
                      <div className="mt-1 font-mono text-[11px] text-muted">
                        {resolved.map((c, i) => (
                          <span
                            key={i}
                            className={
                              isActive && i === chart.currentCell
                                ? "font-bold text-accent"
                                : undefined
                            }
                          >
                            {c.name}
                            {i < resolved.length - 1 ? " – " : ""}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-muted/80">{p.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toonladders */}
          {tab === "scales" && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {SCALE_TYPES.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setScaleName(s.name)}
                    aria-pressed={scaleName === s.name}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                      scaleName === s.name
                        ? "bg-accent text-[#06121f]"
                        : "border border-border-soft text-muted hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={playScale}
                  disabled={!ready || scaleNames.length === 0}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-[#06121f] transition hover:brightness-110 disabled:opacity-40"
                >
                  ▶ Speel op &amp; neer
                </button>
                <button
                  onClick={stopAll}
                  className="rounded-lg border border-border-soft px-3 py-2 text-xs text-muted hover:text-foreground"
                >
                  ■ Stop
                </button>
                <span className="font-mono text-xs text-accent">{scaleNames.join(" ") || "—"}</span>
              </div>
            </div>
          )}

          {/* MIDI-tracks */}
          {tab === "midi" && (
            <MidiTracksTab
              midi={midi}
              player={player}
              studio={studio}
              onBeforePlay={stopLab}
              transpose={studio.transpose}
            />
          )}

          {!ready && tab !== "midi" && (
            <p className="mt-3 text-xs text-muted">
              Verbind met de piano om akkoorden, progressies en ladders af te vuren.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

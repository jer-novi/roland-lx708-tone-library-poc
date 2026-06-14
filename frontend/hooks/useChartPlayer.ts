"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MidiState } from "@/hooks/useMidi";
import type { ChordChart } from "@/lib/chordChart";
import { compPattern, voiceChord, type CompStyle } from "@/lib/chordVoicing";

interface SchedEvent {
  t: number; // seconden
  type: 0 | 1; // 0 = note-off, 1 = note-on
  midi: number;
  vel: number;
}

const LOOKAHEAD_S = 0.1;
const TICK_MS = 25;
const TAIL_S = 0.3;

type PlayerMidi = Pick<MidiState, "sendRaw" | "panic" | "channel" | "echoOn" | "echoOff">;

export interface ChartPlayOpts {
  style?: CompStyle;
}

/**
 * Speelt een `ChordChart` als piano-comping af via hetzelfde look-ahead
 * scheduler-patroon als `useMidiPlayer` (≤100 ms vooruit; stop altijd direct).
 * Loop + tempo + feel + comping-stijl zitten hier; de daadwerkelijke voicing en
 * ritmiek komen uit `lib/chordVoicing.ts` (de modulaire seam voor een latere
 * synth-/backing-band-engine).
 */
export function useChartPlayer(midi: PlayerMidi) {
  const midiRef = useRef(midi);
  useEffect(() => {
    midiRef.current = midi;
  }, [midi]);

  const [chart, setChart] = useState<ChordChart | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCell, setCurrentCell] = useState(-1);

  const chartRef = useRef<ChordChart | null>(null);
  const eventsRef = useRef<SchedEvent[]>([]);
  const cellStartsRef = useRef<number[]>([]); // starttijd (s) van elke cel
  const durationRef = useRef(0); // seconden voor één doorloop
  const idxRef = useRef(0);
  const startPerfRef = useRef(0);
  const playingRef = useRef(false);
  const activeRef = useRef<Set<number>>(new Set());
  const intervalRef = useRef<number | null>(null);

  const channel = () => midiRef.current.channel & 0x0f;

  const clearTimer = () => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const allNotesOff = useCallback(() => {
    const c = channel();
    const m = midiRef.current;
    activeRef.current.forEach((n) => {
      m.sendRaw([0x80 | c, n, 0]);
      m.echoOff(n);
    });
    activeRef.current.clear();
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    clearTimer();
    allNotesOff();
    setIsPlaying(false);
    setCurrentCell(-1);
  }, [allNotesOff]);

  const build = useCallback((ch: ChordChart, style: CompStyle) => {
    const spb = 60 / Math.max(20, ch.bpm); // seconden per tel
    const evs: SchedEvent[] = [];
    const cellStarts: number[] = [];
    let beat = 0;
    for (const cell of ch.cells) {
      cellStarts.push(beat * spb);
      if (cell.kind === "chord" && cell.symbol) {
        const mids = voiceChord(cell.symbol);
        for (const hit of compPattern(cell.beats, style, ch.feel)) {
          const onT = (beat + hit.offsetBeats) * spb;
          const offT = (beat + hit.offsetBeats + hit.durBeats) * spb;
          for (const m of mids) {
            const mm = m & 0x7f;
            evs.push({ t: onT, type: 1, midi: mm, vel: hit.velocity });
            evs.push({ t: offT, type: 0, midi: mm, vel: 0 });
          }
        }
      }
      beat += cell.beats;
    }
    evs.sort((a, b) => a.t - b.t || a.type - b.type);
    eventsRef.current = evs;
    cellStartsRef.current = cellStarts;
    durationRef.current = beat * spb;
  }, []);

  const tick = useCallback(() => {
    const m = midiRef.current;
    const c = channel();
    const dur = durationRef.current;
    const loop = chartRef.current?.loop ?? false;
    const now = performance.now();
    let elapsed = (now - startPerfRef.current) / 1000;

    // Loop: sla hele doorlopen over en begin de noten-index opnieuw.
    if (loop && dur > 0 && elapsed >= dur) {
      const passes = Math.floor(elapsed / dur);
      startPerfRef.current += passes * dur * 1000;
      elapsed -= passes * dur;
      idxRef.current = 0;
      allNotesOff();
    }

    const horizon = elapsed + LOOKAHEAD_S;
    const evs = eventsRef.current;
    while (idxRef.current < evs.length && evs[idxRef.current].t <= horizon) {
      const e = evs[idxRef.current++];
      const ts = startPerfRef.current + e.t * 1000;
      if (e.type === 1) {
        m.sendRaw([0x90 | c, e.midi, e.vel], ts);
        activeRef.current.add(e.midi);
        m.echoOn(e.midi, e.vel);
      } else {
        m.sendRaw([0x80 | c, e.midi, 0], ts);
        activeRef.current.delete(e.midi);
        m.echoOff(e.midi);
      }
    }

    // Actieve cel (voor bar-highlight).
    const starts = cellStartsRef.current;
    let ci = -1;
    for (let i = 0; i < starts.length; i++) {
      if (elapsed >= starts[i]) ci = i;
      else break;
    }
    setCurrentCell(ci);

    if (!loop && idxRef.current >= evs.length && elapsed >= dur + TAIL_S) {
      stop();
    }
  }, [allNotesOff, stop]);

  const play = useCallback(
    (ch: ChordChart, opts?: ChartPlayOpts) => {
      midiRef.current.panic();
      activeRef.current.clear();
      chartRef.current = ch;
      setChart(ch);
      build(ch, opts?.style ?? "block");
      idxRef.current = 0;
      startPerfRef.current = performance.now();
      playingRef.current = true;
      setIsPlaying(true);
      setCurrentCell(0);
      clearTimer();
      intervalRef.current = window.setInterval(tick, TICK_MS);
      tick();
    },
    [build, tick]
  );

  useEffect(
    () => () => {
      clearTimer();
      playingRef.current = false;
      midiRef.current.panic();
    },
    []
  );

  return { chart, isPlaying, currentCell, play, stop };
}

export type ChartPlayer = ReturnType<typeof useChartPlayer>;

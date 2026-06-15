"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Midi } from "@tonejs/midi";
import type { MidiState } from "@/hooks/useMidi";

export interface PlayerNote {
  midi: number;
  time: number; // seconden
  duration: number; // seconden
  velocity: number; // 0–1
}

export interface LoadedSong {
  name: string;
  duration: number; // seconden
  notes: PlayerNote[];
}

interface SchedEvent {
  t: number; // seconden
  type: 0 | 1; // 0 = note-off, 1 = note-on
  midi: number;
  vel: number; // 1–127
}

// Vangnet-buffer: ruim vooruit plannen zodat de Web-MIDI-backend de track op tijd
// blijft afspelen, óók als de scheduler-tick een keer geknepen wordt (verborgen
// tabblad → timer tot ~1 s geklemd). Stop/seek blijven direct dankzij
// `clearScheduled()` in `allNotesOff()`, dus een diepe wachtrij kost geen latency.
const LOOKAHEAD_S = 0.6; // hoever vooruit we events inplannen
const TICK_MS = 25; // scheduler-interval (tevens afspeelkop-update ≈40 fps)
const TAIL_S = 0.4; // naloop na de laatste noot voor we automatisch stoppen

type PlayerMidi = Pick<MidiState, "sendRaw" | "panic" | "clearScheduled" | "channel">;

const clampNote = (n: number) => Math.max(0, Math.min(127, n));

/**
 * Speelt een geparset MIDI-bestand af op de piano met een look-ahead scheduler
 * (zelfde patroon als Web-Audio-timing): er staat nooit meer dan ~100 ms in de
 * hardware-wachtrij, dus **stop/pauze/seek werken altijd direct** — onafhankelijk
 * van `MIDIOutput.clear()`-support. De afspeelkop (`position`) loopt op dezelfde
 * klok, zodat scrubben de piano niet laat hangen of loopen. (De track-noten
 * worden niet in de keyboard-echo gespiegeld — daarvoor is de piano-roll; dat
 * voorkomt re-renders op noot-tempo.)
 */
export function useMidiPlayer(midi: PlayerMidi, transpose = 0) {
  const midiRef = useRef(midi);
  useEffect(() => {
    midiRef.current = midi;
  }, [midi]);

  // Huidige key-transpose (volgt het wiel). De waarde wordt per afspeel-run
  // bevroren (runTransposeRef) zodat het draaien aan het wiel midden in een
  // song geen frase over twee toonsoorten splitst of noten laat hangen.
  const transposeRef = useRef(transpose);
  useEffect(() => {
    transposeRef.current = transpose;
  }, [transpose]);
  const runTransposeRef = useRef(transpose);

  const [song, setSong] = useState<LoadedSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  const songRef = useRef<LoadedSong | null>(null);
  const eventsRef = useRef<SchedEvent[]>([]);
  const idxRef = useRef(0);
  const startPerfRef = useRef(0); // performance.now() horend bij positie 0
  const positionRef = useRef(0);
  const playingRef = useRef(false);
  const activeRef = useRef<Set<number>>(new Set()); // klinkende noten (voor note-off bij seek/stop)

  // Scheduler-timer: bij voorkeur een Web Worker (ontwijkt achtergrond-throttling),
  // met een main-thread `setInterval` als fallback (SSR/oude browser).
  const workerRef = useRef<Worker | null>(null);
  const fallbackIntervalRef = useRef<number | null>(null);

  const channel = () => midiRef.current.channel & 0x0f;

  // De worker roept altijd de meest recente `tick` aan zonder opnieuw te worden
  // gemaakt; `tick` wisselt namelijk van identiteit (hangt af van `stop`).
  const tickRef = useRef<() => void>(() => {});

  const stopTimer = useCallback(() => {
    workerRef.current?.postMessage({ type: "stop" });
    if (fallbackIntervalRef.current != null) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    if (typeof Worker !== "undefined") {
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("../lib/schedulerWorker.ts", import.meta.url)
        );
        workerRef.current.onmessage = () => tickRef.current();
      }
      workerRef.current.postMessage({ type: "start", interval: TICK_MS });
    } else {
      fallbackIntervalRef.current = window.setInterval(
        () => tickRef.current(),
        TICK_MS
      );
    }
  }, [stopTimer]);

  /**
   * Zet alles wat wíj afspelen stil — sluitend, ook met de look-ahead-wachtrij.
   * Eerst de geplande (toekomstig-getimede) note-ons/offs annuleren via
   * `clearScheduled()`; anders klinkt een al-ingeplande note-on ná de stop en
   * blijft hangen (de directe note-off arriveert er immers vóór). Daarna een
   * expliciete All Notes Off + All Sound Off op het speler-kanaal, zodat álles
   * zwijgt los van de `activeRef`-boekhouding; de `activeRef`-offs zijn vangnet.
   */
  const allNotesOff = useCallback(() => {
    const c = channel();
    const m = midiRef.current;
    m.clearScheduled();
    m.sendRaw([0xb0 | c, 0x7b, 0]); // All Notes Off (CC123)
    m.sendRaw([0xb0 | c, 0x78, 0]); // All Sound Off (CC120)
    activeRef.current.forEach((note) => m.sendRaw([0x80 | c, note, 0]));
    activeRef.current.clear();
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    stopTimer();
    allNotesOff();
    setIsPlaying(false);
    positionRef.current = 0;
    setPosition(0);
  }, [allNotesOff, stopTimer]);

  const pause = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    stopTimer();
    allNotesOff();
    setIsPlaying(false);
    // positionRef blijft staan → play() hervat hier
  }, [allNotesOff, stopTimer]);

  const tick = useCallback(() => {
    const evs = eventsRef.current;
    const m = midiRef.current;
    const c = channel();
    const now = performance.now();
    const elapsed = (now - startPerfRef.current) / 1000;
    const horizon = elapsed + LOOKAHEAD_S;
    while (idxRef.current < evs.length && evs[idxRef.current].t <= horizon) {
      const e = evs[idxRef.current++];
      const ts = startPerfRef.current + e.t * 1000;
      const note = clampNote(e.midi + runTransposeRef.current);
      if (e.type === 1) {
        m.sendRaw([0x90 | c, note, e.vel], ts);
        activeRef.current.add(note);
      } else {
        m.sendRaw([0x80 | c, note, 0], ts);
        activeRef.current.delete(note);
      }
    }
    const dur = songRef.current?.duration ?? 0;
    positionRef.current = Math.min(dur, Math.max(0, elapsed));
    setPosition(positionRef.current);
    if (idxRef.current >= evs.length && elapsed >= dur + TAIL_S) {
      stop();
    }
  }, [stop]);

  // Houd de worker-callback op de actuele `tick` zonder de worker te recreëren.
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startClock = useCallback(
    (fromSec: number) => {
      const evs = eventsRef.current;
      runTransposeRef.current = transposeRef.current; // bevries de transpose voor deze run
      startPerfRef.current = performance.now() - fromSec * 1000;
      let i = 0;
      while (i < evs.length && evs[i].t < fromSec) i++;
      idxRef.current = i;
      positionRef.current = fromSec;
      playingRef.current = true;
      setIsPlaying(true);
      startTimer();
      tick(); // direct eerste venster inplannen
    },
    [tick, startTimer]
  );

  const play = useCallback(() => {
    const s = songRef.current;
    if (!s) return;
    midiRef.current.panic();
    activeRef.current.clear();
    const from = positionRef.current >= s.duration ? 0 : positionRef.current;
    startClock(from);
  }, [startClock]);

  /** Verplaats de afspeelkop (scrubben). Speelt door als hij al speelde. */
  const seek = useCallback(
    (t: number) => {
      const s = songRef.current;
      if (!s) return;
      const clamped = Math.min(s.duration, Math.max(0, t));
      allNotesOff();
      positionRef.current = clamped;
      setPosition(clamped);
      if (playingRef.current) {
        startClock(clamped);
      } else {
        const evs = eventsRef.current;
        let i = 0;
        while (i < evs.length && evs[i].t < clamped) i++;
        idxRef.current = i;
      }
    },
    [allNotesOff, startClock]
  );

  const load = useCallback((buffer: ArrayBuffer, name: string): LoadedSong | null => {
    let parsed: Midi;
    try {
      parsed = new Midi(buffer);
    } catch {
      return null;
    }
    const notes: PlayerNote[] = parsed.tracks
      .flatMap((tr) =>
        tr.notes.map((n) => ({
          midi: n.midi,
          time: n.time,
          duration: n.duration,
          velocity: n.velocity,
        }))
      )
      .sort((a, b) => a.time - b.time);

    const evs: SchedEvent[] = [];
    for (const n of notes) {
      const vel = Math.max(1, Math.min(127, Math.round(n.velocity * 127)));
      const m = n.midi & 0x7f;
      evs.push({ t: n.time, type: 1, midi: m, vel });
      evs.push({ t: n.time + n.duration, type: 0, midi: m, vel: 0 });
    }
    // Op gelijke tijd: note-off (0) vóór note-on (1) om herhaalde noten niet
    // meteen weer af te kappen.
    evs.sort((a, b) => a.t - b.t || a.type - b.type);

    const loaded: LoadedSong = { name, duration: parsed.duration, notes };
    eventsRef.current = evs;
    songRef.current = loaded;
    positionRef.current = 0;
    idxRef.current = 0;
    setSong(loaded);
    setPosition(0);
    return loaded;
  }, []);

  const loadAndPlay = useCallback(
    (buffer: ArrayBuffer, name: string): boolean => {
      const loaded = load(buffer, name);
      if (!loaded || loaded.notes.length === 0) return false;
      midiRef.current.panic();
      activeRef.current.clear();
      startClock(0);
      return true;
    },
    [load, startClock]
  );

  useEffect(
    () => () => {
      stopTimer();
      workerRef.current?.terminate();
      workerRef.current = null;
      playingRef.current = false;
      midiRef.current.panic();
    },
    [stopTimer]
  );

  return { song, isPlaying, position, play, pause, stop, seek, load, loadAndPlay };
}

export type MidiPlayer = ReturnType<typeof useMidiPlayer>;

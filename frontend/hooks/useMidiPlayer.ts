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

const LOOKAHEAD_S = 0.1; // hoever vooruit we events inplannen
const TICK_MS = 25; // scheduler-interval (tevens afspeelkop-update ≈40 fps)
const TAIL_S = 0.4; // naloop na de laatste noot voor we automatisch stoppen

type PlayerMidi = Pick<MidiState, "sendRaw" | "panic" | "channel">;

/**
 * Speelt een geparset MIDI-bestand af op de piano met een look-ahead scheduler
 * (zelfde patroon als Web-Audio-timing): er staat nooit meer dan ~100 ms in de
 * hardware-wachtrij, dus **stop/pauze/seek werken altijd direct** — onafhankelijk
 * van `MIDIOutput.clear()`-support. De afspeelkop (`position`) loopt op dezelfde
 * klok, zodat scrubben de piano niet laat hangen of loopen. (De track-noten
 * worden niet in de keyboard-echo gespiegeld — daarvoor is de piano-roll; dat
 * voorkomt re-renders op noot-tempo.)
 */
export function useMidiPlayer(midi: PlayerMidi) {
  const midiRef = useRef(midi);
  useEffect(() => {
    midiRef.current = midi;
  }, [midi]);

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
  const intervalRef = useRef<number | null>(null);

  const channel = () => midiRef.current.channel & 0x0f;

  const clearTimer = () => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /** Zet alle (door ons) klinkende noten uit. */
  const allNotesOff = useCallback(() => {
    const c = channel();
    const m = midiRef.current;
    activeRef.current.forEach((note) => m.sendRaw([0x80 | c, note, 0]));
    activeRef.current.clear();
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    clearTimer();
    allNotesOff();
    setIsPlaying(false);
    positionRef.current = 0;
    setPosition(0);
  }, [allNotesOff]);

  const pause = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    clearTimer();
    allNotesOff();
    setIsPlaying(false);
    // positionRef blijft staan → play() hervat hier
  }, [allNotesOff]);

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
      if (e.type === 1) {
        m.sendRaw([0x90 | c, e.midi, e.vel], ts);
        activeRef.current.add(e.midi);
      } else {
        m.sendRaw([0x80 | c, e.midi, 0], ts);
        activeRef.current.delete(e.midi);
      }
    }
    const dur = songRef.current?.duration ?? 0;
    positionRef.current = Math.min(dur, Math.max(0, elapsed));
    setPosition(positionRef.current);
    if (idxRef.current >= evs.length && elapsed >= dur + TAIL_S) {
      stop();
    }
  }, [stop]);

  const startClock = useCallback(
    (fromSec: number) => {
      const evs = eventsRef.current;
      startPerfRef.current = performance.now() - fromSec * 1000;
      let i = 0;
      while (i < evs.length && evs[i].t < fromSec) i++;
      idxRef.current = i;
      positionRef.current = fromSec;
      playingRef.current = true;
      setIsPlaying(true);
      clearTimer();
      intervalRef.current = window.setInterval(tick, TICK_MS);
      tick(); // direct eerste venster inplannen
    },
    [tick]
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
      clearTimer();
      playingRef.current = false;
      midiRef.current.panic();
    },
    []
  );

  return { song, isPlaying, position, play, pause, stop, seek, load, loadAndPlay };
}

export type MidiPlayer = ReturnType<typeof useMidiPlayer>;

"use client";

import { useCallback, useRef } from "react";
import type { MidiState } from "@/hooks/useMidi";
import {
  ADDR,
  KeyboardMode,
  type KeyboardModeName,
  buildDT1,
  buildRQ1,
  encodeTone,
  encodeTempo,
  encodeTranspose,
  decodeTranspose,
  encodeOctaveShift,
  decodeOctaveShift,
  parseDT1,
} from "@/lib/rolandSysex";

export type ToneZone = "right" | "splitLeft" | "dual2";

const ZONE_ADDR: Record<ToneZone, readonly number[]> = {
  right: ADDR.toneRight,
  splitLeft: ADDR.toneSplitLeft,
  dual2: ADDR.toneDual2,
};

/**
 * Octaaf-shift-adres per zone, modus-afhankelijk (bevestigd op de LX708):
 * de "right"-zone gebruikt in split `splitRightOctave` (16) en in dual
 * `dualTone1Octave` (17); links → `splitOctaveShift` (02); tone 2 →
 * `dualOctaveShift` (04).
 */
function zoneOctaveAddr(zone: ToneZone, split: boolean): readonly number[] | null {
  if (zone === "right") return split ? ADDR.splitRightOctave : ADDR.dualTone1Octave;
  if (zone === "splitLeft") return ADDR.splitOctaveShift;
  if (zone === "dual2") return ADDR.dualOctaveShift;
  return null;
}

/**
 * Bestuurt de LX708 via de ongedocumenteerde Roland DT1/RQ1-adresmap.
 * Bouwt op `useMidi` (alleen `sendRaw` + `onSysex` nodig) en de pure laag in
 * `lib/rolandSysex.ts`. Zie `docs/LX708_SysEx_Adresmap.md`.
 */
// De LX708 dropt SysEx-frames die te dicht op elkaar (of direct na de
// enable-remote-handshake) binnenkomen — dan landt een moduswissel niet en moet
// je eerst fysiek op Split/Dual drukken. We spreiden DT1-frames daarom met een
// vaste tussenruimte via Web-MIDI-timestamps, en geven de handshake extra marge.
const GAP_MS = 25; // minimale tussenruimte tussen opeenvolgende DT1-frames
const HANDSHAKE_SETTLE_MS = 45; // extra marge ná de handshake vóór het eerste commando

const hex = (bytes: readonly number[]) =>
  bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");

export function useRolandSysex(
  midi: Pick<MidiState, "sendRaw" | "onSysex">
) {
  // De "enable remote control"-handshake hoeft maar één keer per sessie; vaker
  // sturen toont telkens "application connected" op het display.
  const handshakeDone = useRef(false);
  // Volgende toegestane verzendtijd (performance.now()-domein) voor pacing.
  const nextSendRef = useRef(0);

  /** Reserveert het volgende verzend-slot (met spacing) en geeft de timestamp. */
  const reserveSlot = useCallback((gap = GAP_MS): number => {
    const at = Math.max(performance.now(), nextSendRef.current);
    nextSendRef.current = at + gap;
    return at;
  }, []);

  const ensureHandshake = useCallback(() => {
    if (handshakeDone.current) return;
    const ok = midi.sendRaw(buildDT1(ADDR.enableRemote, [0x01]), reserveSlot());
    if (!ok) {
      nextSendRef.current = 0; // niets verstuurd — pacing terugzetten
      return; // geen output — niet als gedaan markeren
    }
    // Extra marge zodat de piano remote-control "zet" vóór het eerste commando.
    midi.sendRaw(buildDT1(ADDR.enableNotify, [0x01]), reserveSlot(HANDSHAKE_SETTLE_MS));
    handshakeDone.current = true;
  }, [midi, reserveSlot]);

  /** Reset de handshake-vlag (bv. na opnieuw verbinden van de piano). */
  const resetSession = useCallback(() => {
    handshakeDone.current = false;
    nextSendRef.current = 0;
  }, []);

  /** Schrijft databytes naar een adres (DT1), met eenmalige handshake + pacing. */
  const write = useCallback(
    (address: readonly number[], data: readonly number[]): boolean => {
      ensureHandshake();
      const at = reserveSlot();
      if (process.env.NODE_ENV !== "production") {
        console.debug(`🎛 DT1 ${hex(address)} = [${hex(data)}] @+${Math.round(at - performance.now())}ms`);
      }
      return midi.sendRaw(buildDT1(address, data), at);
    },
    [midi, ensureHandshake, reserveSlot]
  );

  /** Leest een adres (RQ1) en wacht op het bijbehorende DT1-antwoord. */
  const read = useCallback(
    (
      address: readonly number[],
      length: number,
      timeoutMs = 300
    ): Promise<number[] | null> =>
      new Promise((resolve) => {
        const unsub = midi.onSysex((bytes) => {
          const parsed = parseDT1(bytes);
          if (parsed && address.every((b, i) => b === parsed.address[i])) {
            clearTimeout(timer);
            unsub();
            resolve(parsed.data);
          }
        });
        const timer = setTimeout(() => {
          unsub();
          resolve(null);
        }, timeoutMs);
        if (!midi.sendRaw(buildRQ1(address, length))) {
          clearTimeout(timer);
          unsub();
          resolve(null);
        }
      }),
    [midi]
  );

  // ---- Hoog-niveau bedieningen ----

  const setKeyboardMode = useCallback(
    (mode: KeyboardModeName) => write(ADDR.keyboardMode, [KeyboardMode[mode]]),
    [write]
  );

  /** Zet de tone van een zone. `num` = 0-based index binnen de categorie. */
  const setZoneTone = useCallback(
    (zone: ToneZone, category: number, num: number) =>
      write(ZONE_ADDR[zone], encodeTone(category, num)),
    [write]
  );

  const setSplitPoint = useCallback(
    (midiNote: number) => write(ADDR.splitPoint, [midiNote & 0x7f]),
    [write]
  );

  /** Octaaf-shift (−3..+3) van een zone; `split` = of we in split-modus zitten. */
  const setZoneOctave = useCallback(
    (zone: ToneZone, split: boolean, octaves: number) => {
      const addr = zoneOctaveAddr(zone, split);
      if (!addr) return false;
      return write(addr, encodeOctaveShift(octaves));
    },
    [write]
  );

  /** Leest de octaaf-shift van een zone (RQ1). */
  const readZoneOctave = useCallback(
    async (zone: ToneZone, split: boolean): Promise<number | null> => {
      const addr = zoneOctaveAddr(zone, split);
      if (!addr) return null;
      const r = await read(addr, 1);
      return r && r[0] != null ? decodeOctaveShift(r[0]) : null;
    },
    [read]
  );

  /** Balans 0–127 (midden = 64). */
  const setSplitBalance = useCallback(
    (value: number) => write(ADDR.splitBalance, [value & 0x7f]),
    [write]
  );
  const setDualBalance = useCallback(
    (value: number) => write(ADDR.dualBalance, [value & 0x7f]),
    [write]
  );

  /** Master volume 0–100. */
  const setMasterVolume = useCallback(
    (value: number) => write(ADDR.masterVolume, [Math.max(0, Math.min(100, value))]),
    [write]
  );

  const setTempo = useCallback(
    (bpm: number) => write(ADDR.sequencerTempoWrite, encodeTempo(bpm)),
    [write]
  );

  /** Zet de key transpose (−6..+5 halve tonen) op de piano. */
  const setTranspose = useCallback(
    (semitones: number) => write(ADDR.keyTranspose, encodeTranspose(semitones)),
    [write]
  );

  // ---- Transport / metronoom (knop-simulatie) ----
  const playStop = useCallback(() => write(ADDR.btnPlayStop, [0x00]), [write]);
  const recordStandby = useCallback(
    () => write(ADDR.recordStandby, [0x01]),
    [write]
  );
  const metronomeToggle = useCallback(
    () => write(ADDR.btnMetronomeToggle, [0x00]),
    [write]
  );

  /** Leest enkel de key transpose (RQ1) — voor on-demand resync. */
  const readTranspose = useCallback(async (): Promise<number | null> => {
    const t = await read(ADDR.keyTransposeRead, 1);
    return t && t[0] != null ? decodeTranspose(t[0]) : null;
  }, [read]);

  // ---- Status uitlezen ----
  const readStatus = useCallback(async () => {
    const [mode, metronome, tempo, volume, transpose, splitPoint, toneRight, toneDual2] =
      await Promise.all([
        read(ADDR.keyboardMode, 1),
        read(ADDR.metronomeStatus, 1),
        read(ADDR.sequencerTempo, 2),
        read(ADDR.masterVolume, 1),
        read(ADDR.keyTransposeRead, 1),
        read(ADDR.splitPoint, 1),
        read(ADDR.toneRight, 3),
        read(ADDR.toneDual2, 3),
      ]);
    return {
      keyboardMode: mode?.[0] ?? null,
      metronomeOn: metronome ? metronome[0] === 1 : null,
      tempoBpm: tempo ? tempo[0] * 128 + tempo[1] : null,
      masterVolume: volume?.[0] ?? null,
      transpose: transpose?.[0] != null ? decodeTranspose(transpose[0]) : null,
      splitPoint: splitPoint?.[0] ?? null,
      toneRight: toneRight ? { category: toneRight[0], num: toneRight[1] * 128 + toneRight[2] } : null,
      toneDual2: toneDual2 ? { category: toneDual2[0], num: toneDual2[1] * 128 + toneDual2[2] } : null,
    };
  }, [read]);

  return {
    write,
    read,
    ensureHandshake,
    resetSession,
    setKeyboardMode,
    setZoneTone,
    setSplitPoint,
    setZoneOctave,
    readZoneOctave,
    setSplitBalance,
    setDualBalance,
    setMasterVolume,
    setTempo,
    setTranspose,
    readTranspose,
    playStop,
    recordStandby,
    metronomeToggle,
    readStatus,
  };
}

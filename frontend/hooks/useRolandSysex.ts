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
  parseDT1,
} from "@/lib/rolandSysex";

export type ToneZone = "right" | "splitLeft" | "dual2";

const ZONE_ADDR: Record<ToneZone, readonly number[]> = {
  right: ADDR.toneRight,
  splitLeft: ADDR.toneSplitLeft,
  dual2: ADDR.toneDual2,
};

/**
 * Bestuurt de LX708 via de ongedocumenteerde Roland DT1/RQ1-adresmap.
 * Bouwt op `useMidi` (alleen `sendRaw` + `onSysex` nodig) en de pure laag in
 * `lib/rolandSysex.ts`. Zie `docs/LX708_SysEx_Adresmap.md`.
 */
export function useRolandSysex(
  midi: Pick<MidiState, "sendRaw" | "onSysex">
) {
  // De "enable remote control"-handshake hoeft maar één keer per sessie; vaker
  // sturen toont telkens "application connected" op het display.
  const handshakeDone = useRef(false);

  const ensureHandshake = useCallback(() => {
    if (handshakeDone.current) return;
    const ok = midi.sendRaw(buildDT1(ADDR.enableRemote, [0x01]));
    if (!ok) return; // geen output — niet als gedaan markeren
    midi.sendRaw(buildDT1(ADDR.enableNotify, [0x01]));
    handshakeDone.current = true;
  }, [midi]);

  /** Reset de handshake-vlag (bv. na opnieuw verbinden van de piano). */
  const resetSession = useCallback(() => {
    handshakeDone.current = false;
  }, []);

  /** Schrijft databytes naar een adres (DT1), met eenmalige handshake. */
  const write = useCallback(
    (address: readonly number[], data: readonly number[]): boolean => {
      ensureHandshake();
      return midi.sendRaw(buildDT1(address, data));
    },
    [midi, ensureHandshake]
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

  // ---- Status uitlezen ----
  const readStatus = useCallback(async () => {
    const [mode, metronome, tempo, volume, toneRight, toneDual2] = await Promise.all([
      read(ADDR.keyboardMode, 1),
      read(ADDR.metronomeStatus, 1),
      read(ADDR.sequencerTempo, 2),
      read(ADDR.masterVolume, 1),
      read(ADDR.toneRight, 3),
      read(ADDR.toneDual2, 3),
    ]);
    return {
      keyboardMode: mode?.[0] ?? null,
      metronomeOn: metronome ? metronome[0] === 1 : null,
      tempoBpm: tempo ? tempo[0] * 128 + tempo[1] : null,
      masterVolume: volume?.[0] ?? null,
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
    setSplitBalance,
    setDualBalance,
    setMasterVolume,
    setTempo,
    playStop,
    recordStandby,
    metronomeToggle,
    readStatus,
  };
}

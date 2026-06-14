"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MidiState } from "@/hooks/useMidi";
import type { ToneDto } from "@/lib/types";
import { useRolandSysex, type ToneZone } from "@/hooks/useRolandSysex";
import { ADDR, ToneCategory, type KeyboardModeName } from "@/lib/rolandSysex";

const catIdx = (t: ToneDto) => ToneCategory[t.category] ?? 99;

export const sameTone = (a: ToneDto | null, b: ToneDto | null) =>
  !!a && !!b && a.category === b.category && a.toneNumber === b.toneNumber;

export interface ZoneSlot {
  zone: ToneZone;
  label: string;
}

/**
 * Centrale studio-state (klaviermodus + zone-tones + split/balance) bovenop de
 * Roland-SysEx-laag. Gedeeld tussen het Studio-paneel én de tone-grid, zodat
 * kaarten een klank direct aan een zone kunnen toewijzen.
 */
export function useStudio(midi: MidiState, tones: ToneDto[]) {
  const sysex = useRolandSysex(midi);
  const [mode, setMode] = useState<KeyboardModeName>("single");
  const [zoneTone, setZoneTone] = useState<Record<ToneZone, ToneDto | null>>({
    right: null,
    splitLeft: null,
    dual2: null,
  });
  const [splitPoint, setSplitPointState] = useState(54); // F#3
  // Balans als gecentreerde stap −8..+8 (0 = midden). De LX708 kent discrete
  // stappen, geen 0–127; byte = 64 + stap (≈17 niveaus, center 64). Het exacte
  // bereik per modus nog te bevestigen met de probe (adres 03 split / 05 dual).
  const [balanceStep, setBalanceStepState] = useState(0);
  const BALANCE_CENTER = 64;
  const [masterVolume, setMasterVolumeState] = useState(60); // 0–100 (paneelschaal)

  const ready = midi.status === "ready" && midi.outputs.length > 0;
  const isZoneMode = mode === "split" || mode === "dual";

  const ordered = useMemo(
    () => [...tones].sort((a, b) => catIdx(a) - catIdx(b) || a.toneNumber - b.toneNumber),
    [tones]
  );

  const effectiveTone = useCallback(
    (zone: ToneZone): ToneDto | null => {
      if (zoneTone[zone]) return zoneTone[zone];
      if (ordered.length === 0) return null;
      if (zone === "dual2") return ordered.find((t) => t.category === "Strings") ?? ordered[0];
      return ordered[0];
    },
    [zoneTone, ordered]
  );

  const applyZone = useCallback(
    (zone: ToneZone, tone: ToneDto) => {
      const cat = ToneCategory[tone.category];
      if (cat === undefined) return;
      setZoneTone((z) => ({ ...z, [zone]: tone }));
      sysex.setZoneTone(zone, cat, tone.toneNumber - 1);
    },
    [sysex]
  );

  const stepZone = useCallback(
    (zone: ToneZone, dir: number) => {
      const cur = ordered.findIndex((t) => sameTone(t, effectiveTone(zone)));
      const next = ordered[Math.max(0, Math.min(ordered.length - 1, (cur < 0 ? 0 : cur) + dir))];
      if (next) applyZone(zone, next);
    },
    [ordered, effectiveTone, applyZone]
  );

  const chooseMode = useCallback(
    (m: KeyboardModeName) => {
      setMode(m);
      sysex.setKeyboardMode(m);
    },
    [sysex]
  );

  const changeSplitPoint = useCallback(
    (delta: number) => {
      setSplitPointState((p) => {
        const next = Math.max(21, Math.min(108, p + delta));
        sysex.setSplitPoint(next);
        return next;
      });
    },
    [sysex]
  );

  const setSplitPointAbs = useCallback(
    (note: number) => {
      const n = Math.max(21, Math.min(108, note));
      setSplitPointState(n);
      sysex.setSplitPoint(n);
    },
    [sysex]
  );

  /** Zet het master volume (0–100) op de piano. */
  const setMasterVolume = useCallback(
    (value: number) => {
      const v = Math.max(0, Math.min(100, Math.round(value)));
      setMasterVolumeState(v);
      sysex.setMasterVolume(v);
    },
    [sysex]
  );

  /**
   * Leest het master volume van de piano (RQ1) en zet de schuif daarop. De
   * fysieke volumeknop zendt niets uit, dus dit is de enige manier om de schuif
   * met de echte paneelwaarde te laten kloppen. On-demand i.p.v. pollen.
   */
  const syncVolume = useCallback(async () => {
    const v = await sysex.read(ADDR.masterVolume, 1);
    if (v && v[0] != null) setMasterVolumeState(v[0]);
  }, [sysex]);

  // Lees het volume zodra de piano (opnieuw) herkend is: bij verbinden én elke
  // keer dat de actieve output wijzigt (her-herkenning na uit/in pluggen). Zo
  // begint de schuif altijd op de echte paneelwaarde.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalige RQ1-uitlezing bij (her)verbinden
    if (ready) void syncVolume();
  }, [ready, midi.selectedOutputId, midi.outputs.length, syncVolume]);

  // …en zodra de gebruiker terugkeert naar het tabblad (de fysieke volumeknop of
  // de piano-menu's kunnen het ondertussen gewijzigd hebben). Geen polling.
  useEffect(() => {
    if (!ready) return;
    const resync = () => {
      if (document.visibilityState === "visible") void syncVolume();
    };
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [ready, syncVolume]);

  /** Zet de balans-stap (−8..+8); stuurt byte = 64 + stap naar de actieve modus. */
  const changeBalance = useCallback(
    (step: number) => {
      const s = Math.max(-8, Math.min(8, step));
      setBalanceStepState(s);
      const byte = BALANCE_CENTER + s;
      if (mode === "split") sysex.setSplitBalance(byte);
      else sysex.setDualBalance(byte);
    },
    [mode, sysex]
  );

  const syncFromPiano = useCallback(async () => {
    const s = await sysex.readStatus();
    if (s.keyboardMode != null) {
      const name = (["single", "split", "dual", "twin"] as const)[s.keyboardMode];
      if (name) setMode(name);
    }
    if (s.masterVolume != null) setMasterVolumeState(s.masterVolume);
    const match = (z: { category: number; num: number } | null) =>
      z ? ordered.find((t) => ToneCategory[t.category] === z.category && t.toneNumber - 1 === z.num) ?? null : null;
    setZoneTone((zt) => ({
      ...zt,
      right: match(s.toneRight) ?? zt.right,
      dual2: match(s.toneDual2) ?? zt.dual2,
    }));
  }, [sysex, ordered]);

  /** Past een kant-en-klare combinatie in één keer toe (modus + beide zones + split/balans). */
  const applyCombo = useCallback(
    (combo: {
      type: "dual" | "split";
      tone1: ToneDto;
      tone2: ToneDto;
      splitPoint?: number;
      balance?: number;
    }) => {
      chooseMode(combo.type);
      applyZone("right", combo.tone1);
      applyZone(combo.type === "split" ? "splitLeft" : "dual2", combo.tone2);
      if (combo.splitPoint != null) setSplitPointAbs(combo.splitPoint);
      if (combo.balance != null) {
        setBalanceStepState(combo.balance - BALANCE_CENTER);
        if (combo.type === "split") sysex.setSplitBalance(combo.balance);
        else sysex.setDualBalance(combo.balance);
      }
    },
    [chooseMode, applyZone, setSplitPointAbs, sysex]
  );

  /** Actieve zone-slots voor de huidige modus (voor grid-knoppen + paneel). */
  const zones: ZoneSlot[] = useMemo(() => {
    if (mode === "split") {
      return [
        { zone: "right", label: "Rechts" },
        { zone: "splitLeft", label: "Links" },
      ];
    }
    if (mode === "dual") {
      return [
        { zone: "right", label: "Tone 1" },
        { zone: "dual2", label: "Tone 2" },
      ];
    }
    return [];
  }, [mode]);

  return {
    mode,
    chooseMode,
    ready,
    isZoneMode,
    ordered,
    zones,
    effectiveTone,
    applyZone,
    stepZone,
    splitPoint,
    changeSplitPoint,
    setSplitPointAbs,
    balanceStep,
    changeBalance,
    masterVolume,
    setMasterVolume,
    syncVolume,
    applyCombo,
    syncFromPiano,
  };
}

export type Studio = ReturnType<typeof useStudio>;

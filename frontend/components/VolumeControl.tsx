"use client";

import { useEffect, useState } from "react";
import type { Studio } from "@/hooks/useStudio";

/** Benoemde volume-presets (0–100, paneelschaal van de LX708). */
const PRESETS: { label: string; pct: number }[] = [
  { label: "🤫 Fluisterstil", pct: 15 },
  { label: "🎧 Oefenen", pct: 35 },
  { label: "🔉 Normaal", pct: 60 },
  { label: "🔊 Vol", pct: 85 },
];

// Avondlimiet: tussen 22:00 en 07:00 wordt het volume afgetopt.
const QUIET_START = 22;
const QUIET_END = 7;
const QUIET_MAX = 40;

const isQuietHour = (d: Date) => {
  const h = d.getHours();
  return h >= QUIET_START || h < QUIET_END;
};

const clock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function VolumeControl({ studio }: { studio: Studio }) {
  const { masterVolume, setMasterVolume, ready, syncVolume } = studio;
  const [now, setNow] = useState(() => new Date());
  const [override, setOverride] = useState(false);

  // Klok: elke 30s de tijd verversen zodat de weergave klopt en de avondlimiet
  // vanzelf aan/uit gaat.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // (De automatische volume-resync bij tab-focus/her-herkenning zit in
  // `useStudio`, zodat het ook werkt als dit paneel niet zichtbaar is.)

  const limited = isQuietHour(now) && !override;
  const max = limited ? QUIET_MAX : 100;

  // Top het volume af zodra de limiet actief wordt en het erboven zit.
  useEffect(() => {
    if (limited && masterVolume > max) setMasterVolume(max);
  }, [limited, max, masterVolume, setMasterVolume]);

  const apply = (v: number) => setMasterVolume(Math.min(v, max));

  return (
    <div className="mt-3 rounded-lg border border-border-soft bg-surface-raised px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-medium">🔈 Volume</span>

        <label className="flex flex-1 items-center gap-2 text-xs text-muted">
          <input
            type="range"
            min={0}
            max={max}
            value={Math.min(masterVolume, max)}
            disabled={!ready}
            onChange={(e) => apply(Number(e.target.value))}
            className="min-w-32 flex-1 accent-accent disabled:opacity-40"
            aria-label="Master volume"
          />
          <span className="w-10 text-right font-mono tabular-nums text-foreground">
            {masterVolume}%
          </span>
        </label>

        <button
          onClick={() => void syncVolume()}
          disabled={!ready}
          title="Lees het huidige volume van de piano"
          className="rounded-lg border border-border-soft px-2 py-1 text-[11px] text-muted hover:text-foreground disabled:opacity-40"
        >
          ↻ lees volume
        </button>

        <span className="font-mono text-xs tabular-nums text-muted" aria-label="Huidige tijd">
          🕑 {clock(now)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => {
          const blocked = p.pct > max;
          return (
            <button
              key={p.label}
              onClick={() => apply(p.pct)}
              disabled={!ready || blocked}
              aria-pressed={masterVolume === Math.min(p.pct, max)}
              title={blocked ? `Geblokkeerd door de avondlimiet (max ${max}%)` : undefined}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-30 ${
                masterVolume === p.pct
                  ? "bg-accent text-[#06121f]"
                  : "border border-border-soft text-muted hover:text-foreground"
              }`}
            >
              {p.label} {p.pct}%
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={`rounded px-1.5 py-0.5 ${
            limited ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-muted/70"
          }`}
        >
          {isQuietHour(now)
            ? `🌙 Avondmodus ${limited ? `— max ${QUIET_MAX}%` : "(genegeerd)"}`
            : `🌙 Avondlimiet ${QUIET_START}:00–0${QUIET_END}:00 (max ${QUIET_MAX}%)`}
        </span>
        {isQuietHour(now) && (
          <label className="flex items-center gap-1 text-muted/80">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="accent-accent"
            />
            negeer avondlimiet
          </label>
        )}
      </div>
    </div>
  );
}

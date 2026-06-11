"use client";

import { useState } from "react";
import type { ToneDto } from "@/lib/types";
import { toneKey } from "@/lib/types";

interface Props {
  /** toneKeys, nieuwste eerst */
  recent: string[];
  tones: ToneDto[];
  onPlay: (tone: ToneDto) => Promise<boolean>;
  onOpen: (tone: ToneDto) => void;
  onClear: () => void;
}

/** Horizontale rij met recent op de piano gespeelde tones: klik = direct weer spelen. */
export function RecentlyPlayedRow({ recent, tones, onPlay, onOpen, onClear }: Props) {
  const [flash, setFlash] = useState<string | null>(null);
  const byKey = new Map(tones.map((t) => [toneKey(t), t]));
  const items = recent
    .map((key) => byKey.get(key))
    .filter((t): t is ToneDto => Boolean(t));

  if (items.length === 0) return null;

  const play = async (tone: ToneDto) => {
    const ok = await onPlay(tone);
    setFlash(`${toneKey(tone)}:${ok ? "ok" : "fail"}`);
    setTimeout(() => setFlash(null), 1200);
  };

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted/70">
          Recent gespeeld
        </span>
        <button
          onClick={onClear}
          className="text-[11px] text-muted/50 underline underline-offset-2 hover:text-accent"
        >
          wissen
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((tone) => {
          const key = toneKey(tone);
          const state = flash?.startsWith(`${key}:`)
            ? flash.endsWith("ok")
              ? "ok"
              : "fail"
            : null;
          return (
            <span
              key={key}
              className={`flex shrink-0 items-center overflow-hidden rounded-full border text-xs transition ${
                state === "ok"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  : state === "fail"
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    : "border-border-soft bg-surface text-foreground"
              }`}
            >
              <button
                onClick={() => play(tone)}
                className="py-1 pl-2.5 pr-1.5 font-medium text-accent hover:brightness-125"
                title={`Speel ${tone.name} op de LX708`}
              >
                ▶
              </button>
              <button
                onClick={() => onOpen(tone)}
                className="max-w-36 truncate py-1 pr-2.5 hover:text-accent"
                title={`${tone.name} — details`}
              >
                {tone.name}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

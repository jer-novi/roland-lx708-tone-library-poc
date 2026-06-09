"use client";

import type { ToneDto } from "@/lib/types";
import { toneKey } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  Piano: "bg-amber-500/15 text-amber-300",
  "E. Piano": "bg-rose-500/15 text-rose-300",
  Strings: "bg-sky-500/15 text-sky-300",
  Other: "bg-emerald-500/15 text-emerald-300",
};

interface Props {
  tone: ToneDto;
  isFavorite: boolean;
  onToggleFavorite: (key: string) => void;
  onOpen: (tone: ToneDto) => void;
}

export function ToneCard({ tone, isFavorite, onToggleFavorite, onOpen }: Props) {
  const key = toneKey(tone);
  const badge = CATEGORY_COLORS[tone.category] ?? CATEGORY_COLORS.Other;

  return (
    <div
      className="group relative flex flex-col gap-2 rounded-xl border border-border-soft bg-surface p-4 transition
                 hover:border-accent/40 hover:bg-surface-raised cursor-pointer"
      onClick={() => onOpen(tone)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(tone)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-muted">
          #{tone.toneNumber}
        </span>
        <button
          aria-label={isFavorite ? "Verwijder favoriet" : "Markeer als favoriet"}
          className={`text-lg leading-none transition ${
            isFavorite
              ? "text-accent"
              : "text-muted/40 opacity-0 group-hover:opacity-100 hover:text-accent"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(key);
          }}
        >
          ★
        </button>
      </div>
      <h3 className="text-sm font-semibold leading-tight">{tone.name}</h3>
      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>
          {tone.category}
        </span>
        {tone.subCategory && (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted">
            {tone.subCategory}
          </span>
        )}
        {tone.wikipediaPageTitle && (
          <span className="ml-auto text-[11px] text-muted/70" title="Wikipedia-info beschikbaar">
            W
          </span>
        )}
      </div>
    </div>
  );
}

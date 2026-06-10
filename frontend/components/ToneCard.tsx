"use client";

import Image from "next/image";
import type { ToneDto } from "@/lib/types";
import { toneKey } from "@/lib/types";
import { PlayToneButton } from "@/components/PlayToneButton";

const CATEGORY_COLORS: Record<string, string> = {
  Piano: "bg-amber-500/15 text-amber-300",
  "E. Piano": "bg-rose-500/15 text-rose-300",
  Strings: "bg-sky-500/15 text-sky-300",
  Other: "bg-emerald-500/15 text-emerald-300",
};

const CATEGORY_ICONS: Record<string, string> = {
  Piano: "♪",
  "E. Piano": "⚡",
  Strings: "𝄢",
  Other: "♬",
};

interface Props {
  tone: ToneDto;
  isFavorite: boolean;
  isExpanded: boolean;
  onToggleFavorite: (key: string) => void;
  onToggleExpand: (key: string | null) => void;
  onOpen: (tone: ToneDto) => void;
  onPlay: (tone: ToneDto) => Promise<boolean>;
  midiAvailable: boolean;
}

export function ToneCard({
  tone,
  isFavorite,
  isExpanded,
  onToggleFavorite,
  onToggleExpand,
  onOpen,
  onPlay,
  midiAvailable,
}: Props) {
  const key = toneKey(tone);
  const badge = CATEGORY_COLORS[tone.category] ?? CATEGORY_COLORS.Other;
  const hasSummary = Boolean(tone.shortSummary);

  return (
    <div
      className={`group relative flex flex-col gap-2.5 rounded-xl border bg-surface p-4 transition ${
        isExpanded
          ? "border-accent/40 bg-surface-raised"
          : "border-border-soft hover:border-accent/40 hover:bg-surface-raised"
      }`}
    >
      <div className="flex items-start gap-3">
        {tone.thumbnailUrl ? (
          <Image
            src={tone.thumbnailUrl}
            alt={tone.wikipediaPageTitle ?? tone.name}
            width={48}
            height={48}
            className="size-12 shrink-0 cursor-pointer rounded-lg border border-border-soft object-cover"
            onClick={() => onOpen(tone)}
          />
        ) : (
          <div
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-lg
                       bg-accent-soft text-lg text-accent"
            onClick={() => onOpen(tone)}
            aria-hidden
          >
            {CATEGORY_ICONS[tone.category] ?? "♬"}
          </div>
        )}

        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpen(tone)}>
          <p className="font-mono text-[11px] text-muted">#{tone.toneNumber}</p>
          <h3 className="truncate text-sm font-semibold leading-tight">
            {tone.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>
              {tone.category}
            </span>
            {tone.subCategory && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted">
                {tone.subCategory}
              </span>
            )}
            <PlayToneButton
              tone={tone}
              onPlay={onPlay}
              midiAvailable={midiAvailable}
            />
          </div>
        </div>

        <button
          aria-label={isFavorite ? "Verwijder favoriet" : "Markeer als favoriet"}
          className={`text-lg leading-none transition ${
            isFavorite
              ? "text-accent"
              : "text-muted/40 hover:text-accent sm:opacity-0 sm:group-hover:opacity-100"
          }`}
          onClick={() => onToggleFavorite(key)}
        >
          ★
        </button>
      </div>

      {hasSummary && (
        <div>
          <p
            className={`cursor-pointer text-xs leading-relaxed text-muted ${
              isExpanded ? "" : "line-clamp-2"
            }`}
            onClick={() => onToggleExpand(isExpanded ? null : key)}
          >
            {tone.shortSummary}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <button
              className="text-[11px] text-muted/70 hover:text-accent"
              onClick={() => onToggleExpand(isExpanded ? null : key)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? "▲ Inklappen" : "▼ Meer"}
            </button>
            {isExpanded && (
              <button
                className="rounded-lg bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent hover:brightness-125"
                onClick={() => onOpen(tone)}
              >
                Volledige details →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

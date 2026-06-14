"use client";

import type { ToneDto } from "@/lib/types";
import { toneKey } from "@/lib/types";
import { parseTags } from "@/lib/collections";
import type { ToneZone } from "@/hooks/useRolandSysex";
import { PlayToneButton } from "@/components/PlayToneButton";
import { ToneThumbnail } from "@/components/ToneThumbnail";

export interface ZoneButton {
  zone: ToneZone;
  label: string;
  isActive: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Piano: "bg-amber-500/15 text-amber-300",
  "E. Piano": "bg-rose-500/15 text-rose-300",
  Strings: "bg-sky-500/15 text-sky-300",
  Other: "bg-emerald-500/15 text-emerald-300",
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
  /** In Split/Dual-modus: knoppen om deze klank aan een zone toe te wijzen. */
  zoneButtons?: ZoneButton[];
  onAssignZone?: (tone: ToneDto, zone: ToneZone) => void;
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
  zoneButtons,
  onAssignZone,
}: Props) {
  const key = toneKey(tone);
  const badge = CATEGORY_COLORS[tone.category] ?? CATEGORY_COLORS.Other;
  const hasSummary = Boolean(tone.shortSummary);
  const tags = parseTags(tone.tags);
  const visibleTags = isExpanded ? tags : tags.slice(0, 2);

  return (
    <div
      className={`group relative flex flex-col gap-2.5 rounded-xl border bg-surface p-4 transition ${
        isExpanded
          ? "border-accent/40 bg-surface-raised"
          : "border-border-soft hover:border-accent/40 hover:bg-surface-raised"
      }`}
    >
      <div className="flex items-start gap-3">
        <ToneThumbnail tone={tone} size={48} onClick={() => onOpen(tone)} />

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
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border-soft px-2 py-0.5 text-[11px] text-muted/80"
              >
                {tag}
              </span>
            ))}
            {zoneButtons && zoneButtons.length > 0 ? (
              <span className="flex items-center gap-1">
                {zoneButtons.map((zb) => (
                  <button
                    key={zb.zone}
                    onClick={() => onAssignZone?.(tone, zb.zone)}
                    aria-pressed={zb.isActive}
                    title={`Zet deze klank op zone "${zb.label}"`}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                      zb.isActive
                        ? "bg-accent text-[#06121f]"
                        : "bg-accent-soft text-accent hover:brightness-125"
                    }`}
                  >
                    {zb.label}
                  </button>
                ))}
              </span>
            ) : (
              <PlayToneButton
                tone={tone}
                onPlay={onPlay}
                midiAvailable={midiAvailable}
              />
            )}
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

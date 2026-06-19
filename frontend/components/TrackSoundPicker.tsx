"use client";

import { useMemo, useState } from "react";
import type { Studio } from "@/hooks/useStudio";
import { sameTone } from "@/hooks/useStudio";
import type { ResolvedCombo } from "@/lib/toneCombos";
import {
  type SoundTheme,
  singlesForTheme,
  resolvedCombosForTheme,
  LAYERED_COMPOSITIONS,
} from "@/lib/soundThemes";

type PickType = "single" | "dual" | "split" | "layered";

const TYPE_LABELS: { id: PickType; label: string }[] = [
  { id: "single", label: "Losse klank" },
  { id: "dual", label: "Dual" },
  { id: "split", label: "Split" },
  { id: "layered", label: "Layered" },
];

interface Props {
  studio: Studio;
  theme: SoundTheme;
  /** Chip-specifieke karakteristieke klanken die vooraan komen (bv. Zelda → Ocarina). */
  featured?: string[];
  onClose: () => void;
}

/**
 * Compacte "bijpassende klanken"-picker bij een MIDI-track-chip. Laat zonder weg
 * te navigeren losse klanken + bijpassende duals/splits kiezen (signature-combo
 * vooraan) waarmee de track op de piano klinkt. Layered is een placeholder tot de
 * layer-engine er is. Hergebruikt `studio.applyZone`/`applyCombo`.
 */
export function TrackSoundPicker({ studio, theme, featured, onClose }: Props) {
  const [type, setType] = useState<PickType>("single");

  const featuredKey = (featured ?? []).join("|");
  const singles = useMemo(
    () => singlesForTheme(theme, studio.ordered, featured ?? []),
    // featuredKey vangt de array-inhoud; `featured` zelf is een nieuwe ref per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, studio.ordered, featuredKey]
  );
  const combos = useMemo(
    () => resolvedCombosForTheme(theme, studio.ordered),
    [theme, studio.ordered]
  );
  const duals = useMemo(() => combos.filter((c) => c.def.type === "dual"), [combos]);
  const splits = useMemo(() => combos.filter((c) => c.def.type === "split"), [combos]);

  const counts: Record<PickType, number> = {
    single: singles.length,
    dual: duals.length,
    split: splits.length,
    layered: LAYERED_COMPOSITIONS.length,
  };

  const applySingle = (toneName: string) => {
    const tone = singles.find((t) => t.name === toneName);
    if (!tone) return;
    studio.chooseMode("single");
    studio.applyZone("right", tone);
  };

  return (
    <div className="rounded-xl border border-accent/30 bg-surface-raised px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-accent">
          🎚 Bijpassende klanken — {theme.label}
        </span>
        <button
          onClick={onClose}
          aria-label="Sluit klank-picker"
          className="text-muted/70 hover:text-foreground"
        >
          ×
        </button>
      </div>

      {/* Type-filter */}
      <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Type klank">
        {TYPE_LABELS.map((t) => {
          const disabled = t.id === "layered";
          return (
            <button
              key={t.id}
              onClick={() => !disabled && setType(t.id)}
              disabled={disabled}
              aria-pressed={type === t.id}
              title={disabled ? "Multi-kanaals layering — binnenkort" : undefined}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-40 ${
                type === t.id
                  ? "bg-accent text-[#06121f]"
                  : "border border-border-soft text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              <span className="ml-1 text-[10px] opacity-70">{counts[t.id]}</span>
              {disabled && <span className="ml-1 text-[9px] uppercase">binnenkort</span>}
            </button>
          );
        })}
      </div>

      {!studio.ready && (
        <p className="mt-2 text-[11px] text-muted">Verbind met de piano om een klank te zetten.</p>
      )}

      <div className="mt-2 max-h-72 overflow-y-auto pr-1">
        {type === "single" && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {singles.map((tone) => {
              const active = studio.mode === "single" && sameTone(studio.effectiveTone("right"), tone);
              return (
                <button
                  key={`${tone.category}#${tone.toneNumber}`}
                  onClick={() => applySingle(tone.name)}
                  disabled={!studio.ready}
                  className={`flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition disabled:opacity-40 ${
                    active
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border-soft text-foreground hover:border-accent/50"
                  }`}
                >
                  <span className="truncate text-[11px] font-medium">{tone.name}</span>
                  <span className="text-[10px] text-muted/70">{tone.category}</span>
                </button>
              );
            })}
            {singles.length === 0 && (
              <p className="col-span-full text-[11px] text-muted">Geen losse klanken voor dit thema.</p>
            )}
          </div>
        )}

        {(type === "dual" || type === "split") && (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(type === "dual" ? duals : splits).map((c) => (
              <ComboMini key={c.def.id} combo={c} studio={studio} />
            ))}
            {(type === "dual" ? duals : splits).length === 0 && (
              <p className="col-span-full text-[11px] text-muted">
                Geen {type === "dual" ? "duals" : "splits"} voor dit thema.
              </p>
            )}
          </div>
        )}

        {type === "layered" && (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {LAYERED_COMPOSITIONS.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-dashed border-border-soft px-2.5 py-1.5 opacity-70"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-foreground">{l.label}</span>
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase text-muted">
                    binnenkort
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted/80">{l.description}</p>
                <p className="mt-0.5 text-[10px] text-muted/60">
                  {l.layers.map((x) => x.toneName).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComboMini({ combo, studio }: { combo: ResolvedCombo; studio: Studio }) {
  const { def, tone1, tone2 } = combo;
  const missing = !tone1 || !tone2;
  const disabled = missing || !studio.ready;
  const apply = () => {
    if (!tone1 || !tone2) return;
    studio.applyCombo({ type: def.type, tone1, tone2, splitPoint: def.splitPoint, balance: def.balance });
  };
  return (
    <button
      onClick={apply}
      disabled={disabled}
      title={missing ? "Een klank uit deze combinatie ontbreekt in de catalogus." : def.why}
      className="flex flex-col items-start gap-0.5 rounded-lg border border-border-soft px-2.5 py-1.5 text-left transition hover:border-accent/50 disabled:opacity-40"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
            def.type === "split" ? "bg-sky-500/15 text-sky-300" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {def.type === "split" ? "Split" : "Dual"}
        </span>
        <span className="truncate text-[11px] font-medium text-foreground">{def.name}</span>
      </span>
      <span className="truncate text-[10px] text-muted/70">
        {def.tone1} + {def.tone2}
      </span>
    </button>
  );
}

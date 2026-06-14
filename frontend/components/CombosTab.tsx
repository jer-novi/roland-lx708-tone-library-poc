"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ToneDto } from "@/lib/types";
import type { Studio } from "@/hooks/useStudio";
import { TONE_COMBOS, resolveCombo, type ResolvedCombo } from "@/lib/toneCombos";
import { genreById, gidsAnchor } from "@/lib/genreTips";

const SECTION_ORDER = [
  "Elektronisch",
  "Gitaar & ukelele",
  "Akoestisch & klassiek",
  "Experimenteel & creatief",
];

interface Props {
  studio: Studio;
  tones: ToneDto[];
}

export function CombosTab({ studio, tones }: Props) {
  const bySection = useMemo(() => {
    const groups = new Map<string, ResolvedCombo[]>();
    for (const def of TONE_COMBOS) {
      const section = genreById.get(def.genreId)?.section ?? "Overig";
      const list = groups.get(section) ?? [];
      list.push(resolveCombo(def, tones));
      groups.set(section, list);
    }
    return [...groups.entries()].sort(
      (a, b) => SECTION_ORDER.indexOf(a[0]) - SECTION_ORDER.indexOf(b[0])
    );
  }, [tones]);

  const randomize = () => {
    const playable = TONE_COMBOS.map((d) => resolveCombo(d, tones)).filter(
      (c) => c.tone1 && c.tone2
    );
    if (playable.length === 0) return;
    const pick = playable[Math.floor(Math.random() * playable.length)];
    applyCombo(studio, pick);
  };

  if (tones.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">Catalogus laden…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {TONE_COMBOS.length} kant-en-klare combinaties — één klik zet modus, beide klanken,
          splitpunt en balans.
        </p>
        <button
          onClick={randomize}
          disabled={!studio.ready}
          className="shrink-0 rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition hover:brightness-125 disabled:opacity-40"
        >
          🎲 Verras me
        </button>
      </div>

      {bySection.map(([section, combos]) => (
        <section key={section}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
            {section}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {combos.map((c) => (
              <ComboCard key={c.def.id} combo={c} studio={studio} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function applyCombo(studio: Studio, combo: ResolvedCombo) {
  const { def, tone1, tone2 } = combo;
  if (!tone1 || !tone2) return;
  studio.applyCombo({
    type: def.type,
    tone1,
    tone2,
    splitPoint: def.splitPoint,
    balance: def.balance,
  });
}

function ComboCard({ combo, studio }: { combo: ResolvedCombo; studio: Studio }) {
  const { def, tone1, tone2 } = combo;
  const tip = genreById.get(def.genreId);
  const missing = !tone1 || !tone2;
  const disabled = missing || !studio.ready;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface p-4 transition hover:border-accent/40">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            def.type === "split"
              ? "bg-sky-500/15 text-sky-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {def.type === "split" ? "Split" : "Dual"}
        </span>
        {tip && (
          <span className="group/badge relative inline-block">
            <Link
              href={gidsAnchor(tip)}
              className="rounded-full border border-border-soft px-2 py-0.5 text-[11px] text-muted/90 transition hover:border-accent/50 hover:text-accent"
            >
              {tip.title}
            </Link>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-60 rounded-lg border border-border-soft bg-surface-raised p-2.5 text-[11px] leading-relaxed text-muted opacity-0 shadow-lg transition-opacity duration-150 group-hover/badge:opacity-100 group-focus-within/badge:opacity-100"
            >
              {tip.blurb}
              <span className="mt-1 block text-accent">Lees meer in de gids →</span>
            </span>
          </span>
        )}
      </div>

      <h4 className="text-sm font-semibold">{def.name}</h4>

      <p className="text-xs text-muted">
        <span className="text-foreground">{def.tone1}</span>
        {def.type === "split" ? " (rechts)" : " (boven)"} +{" "}
        <span className="text-foreground">{def.tone2}</span>
        {def.type === "split" ? " (links)" : " (laag)"}
      </p>

      <p className="text-xs leading-relaxed text-muted/90">{def.why}</p>

      <button
        onClick={() => applyCombo(studio, combo)}
        disabled={disabled}
        title={missing ? "Een klank uit deze combinatie ontbreekt in de catalogus." : undefined}
        className="mt-auto self-start rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition hover:brightness-125 disabled:opacity-40"
      >
        {missing ? "Niet beschikbaar" : "Activeer →"}
      </button>
    </div>
  );
}

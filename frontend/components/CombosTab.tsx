"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ToneDto } from "@/lib/types";
import type { Studio } from "@/hooks/useStudio";
import { TONE_COMBOS, resolveCombo, type ResolvedCombo } from "@/lib/toneCombos";
import { genreById, gidsAnchor } from "@/lib/genreTips";

const SECTION_ORDER = [
  "Artiest-signatuur",
  "Filmscore",
  "Elektronisch",
  "Gitaar & ukelele",
  "Akoestisch & klassiek",
  "Experimenteel & creatief",
];

const sectionOf = (genreId: string) => genreById.get(genreId)?.section ?? "Overig";
const bySectionOrder = (a: string, b: string) =>
  SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b);

type TypeFilter = "all" | "dual" | "split";

interface Props {
  studio: Studio;
  tones: ToneDto[];
}

export function CombosTab({ studio, tones }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [hiddenSections, setHiddenSections] = useState<ReadonlySet<string>>(new Set());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  // Alle sectienamen (stabiel, los van de filters) voor de categorie-chips.
  const allSections = useMemo(() => {
    const s = new Set<string>();
    for (const def of TONE_COMBOS) s.add(sectionOf(def.genreId));
    return [...s].sort(bySectionOrder);
  }, []);

  // Gegroepeerd per sectie, gefilterd op type + verborgen categorieën.
  const bySection = useMemo(() => {
    const groups = new Map<string, ResolvedCombo[]>();
    for (const def of TONE_COMBOS) {
      if (typeFilter !== "all" && def.type !== typeFilter) continue;
      const section = sectionOf(def.genreId);
      if (hiddenSections.has(section)) continue;
      const list = groups.get(section) ?? [];
      list.push(resolveCombo(def, tones));
      groups.set(section, list);
    }
    return [...groups.entries()].sort((a, b) => bySectionOrder(a[0], b[0]));
  }, [tones, typeFilter, hiddenSections]);

  const shownCount = bySection.reduce((n, [, c]) => n + c.length, 0);

  const toggleInSet = (
    setter: typeof setHiddenSections,
    value: string
  ) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  // Verras me: kies willekeurig uit de nu zichtbare (gefilterde) combinaties.
  // (AI-gestuurde slimme suggesties zijn een aparte, latere feature.)
  const randomize = () => {
    const pool = bySection
      .flatMap(([, combos]) => combos)
      .filter((c) => c.tone1 && c.tone2);
    if (pool.length === 0) return;
    applyCombo(studio, pool[Math.floor(Math.random() * pool.length)]);
  };

  if (tones.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">Catalogus laden…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex gap-1" role="group" aria-label="Type-filter">
          {(["all", "split", "dual"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                typeFilter === t
                  ? "bg-accent text-[#06121f]"
                  : "border border-border-soft text-muted hover:text-foreground"
              }`}
            >
              {t === "all" ? "Alle" : t === "split" ? "Split" : "Dual"}
            </button>
          ))}
        </div>

        <span className="text-border-soft">|</span>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Categorie-filter">
          {allSections.map((s) => {
            const on = !hiddenSections.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleInSet(setHiddenSections, s)}
                aria-pressed={on}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  on
                    ? "bg-accent-soft text-accent"
                    : "border border-border-soft text-muted/60 hover:text-foreground"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <button
          onClick={randomize}
          disabled={!studio.ready || shownCount === 0}
          className="ml-auto shrink-0 rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition hover:brightness-125 disabled:opacity-40"
        >
          🎲 Verras me
        </button>
      </div>

      <p className="text-xs text-muted">
        {shownCount} {shownCount === 1 ? "combinatie" : "combinaties"} — één klik zet modus,
        beide klanken, splitpunt en balans.
      </p>

      {bySection.map(([section, combos]) => {
        const isCollapsed = collapsed.has(section);
        return (
          <section key={section}>
            <button
              onClick={() => toggleInSet(setCollapsed, section)}
              aria-expanded={!isCollapsed}
              className="mb-2 flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent"
            >
              <span className="text-[10px]">{isCollapsed ? "▸" : "▾"}</span>
              {section}
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-normal text-muted">
                {combos.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {combos.map((c) => (
                  <ComboCard key={c.def.id} combo={c} studio={studio} />
                ))}
              </div>
            )}
          </section>
        );
      })}
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

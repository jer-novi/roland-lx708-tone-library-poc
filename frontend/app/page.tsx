"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchToneLibrary, fetchWarmupStatus, offlineLibrary } from "@/lib/api";
import type { ToneDto } from "@/lib/types";
import { toneKey } from "@/lib/types";
import { useFavorites } from "@/hooks/useFavorites";
import { useMidi } from "@/hooks/useMidi";
import { useStudio, sameTone } from "@/hooks/useStudio";
import { useRecentlyPlayed } from "@/hooks/useRecentlyPlayed";
import type { Collection } from "@/lib/collections";
import { COLLECTIONS, collectionsFor, parseTags } from "@/lib/collections";
import { FilterBar } from "@/components/FilterBar";
import { MidiBar } from "@/components/MidiBar";
import { StudioPanel } from "@/components/StudioPanel";
import { SpeelLab } from "@/components/SpeelLab";
import { CombosTab } from "@/components/CombosTab";
import { RecentlyPlayedRow } from "@/components/RecentlyPlayedRow";
import { ToneCard } from "@/components/ToneCard";
import { ToneModal } from "@/components/ToneModal";
import { ShortcutsOverlay } from "@/components/ShortcutsOverlay";
import { LayerSpike } from "@/components/LayerSpike";

export default function Home() {
  const [category, setCategory] = useState<string | null>(null);
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [selectedTags, setSelectedTags] = useState<ReadonlySet<string>>(
    new Set()
  );
  const [openTone, setOpenTone] = useState<ToneDto | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [studioTab, setStudioTab] = useState<"zones" | "combos">("zones");
  const { favorites, toggle } = useFavorites();
  const { recent, record, clear: clearRecent } = useRecentlyPlayed();
  const midi = useMidi();
  const midiAvailable = midi.status !== "unsupported";

  // "?" opent het sneltoetsen-overzicht (niet tijdens typen in een veld).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const el = e.target as HTMLElement;
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      )
        return;
      e.preventDefault();
      setShowShortcuts(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Filters in de URL: bij laden uitlezen, bij wijzigen spiegelen ---
  const [urlApplied, setUrlApplied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    /* eslint-disable react-hooks/set-state-in-effect --
       one-time hydration-safe load van de URL-filters na mount */
    const cat = p.get("cat");
    if (cat) setCategory(cat);
    const sub = p.get("sub");
    if (sub) setSubCategory(sub);
    const q = p.get("q");
    if (q) setQuery(q);
    if (p.get("fav") === "1") setFavoritesOnly(true);
    const col = p.get("col");
    if (col && (COLLECTIONS as readonly string[]).includes(col)) {
      setCollection(col as Collection);
    }
    const tags = p.get("tags");
    if (tags) setSelectedTags(new Set(tags.split(",").filter(Boolean)));
    setUrlApplied(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!urlApplied) return;
    const p = new URLSearchParams();
    if (category) p.set("cat", category);
    if (category === "Other" && subCategory) p.set("sub", subCategory);
    if (query.trim()) p.set("q", query.trim());
    if (favoritesOnly) p.set("fav", "1");
    if (collection) p.set("col", collection);
    if (selectedTags.size > 0) p.set("tags", [...selectedTags].join(","));
    const qs = p.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
  }, [urlApplied, category, subCategory, query, favoritesOnly, collection, selectedTags]);

  // Warmup-voortgang: de backend vult thumbnails op een achtergrondthread.
  // Pollt elke 3s tot het klaar is — stuurt zowel de laad-indicator (header)
  // als het automatisch verversen van de bibliotheek hieronder aan.
  const { data: warmup } = useQuery({
    queryKey: ["wiki-status"],
    queryFn: fetchWarmupStatus,
    // Blijf elke 3s pollen tijdens de boot/seed-fase (total nog 0) én de
    // warmup; stop pas als er tones zijn én alles verwerkt is. Zo missen we
    // de complete→false→complete-overgang van een verse start niet.
    refetchInterval: (query) => {
      const s = query.state.data;
      return s && s.complete && s.total > 0 ? false : 3000;
    },
  });
  const warmupActive = warmup ? !warmup.complete : false;

  const {
    data: liveData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["library"],
    queryFn: fetchToneLibrary,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: true,
    // Zelfgenezend bij een dode backend (elke 15s opnieuw), én tijdens de
    // warmup elke 4s verversen zodat nieuwe thumbnails per-card binnenkomen.
    refetchInterval: (query) => {
      if (query.state.status === "error") return 15000;
      return warmupActive ? 4000 : false;
    },
  });

  // Toon de volledige bibliotheek uit de gebundelde seed zolang de live data
  // (nog) niet binnen is, zodat de pagina nooit leeg of geblokkeerd is.
  const data = useMemo(
    () => liveData ?? (isError ? offlineLibrary() : undefined),
    [liveData, isError]
  );

  // Studio-state (Split/Dual + zone-tones), gedeeld met de tone-grid.
  const studio = useStudio(midi, data?.tones ?? []);

  const subCategories = useMemo(
    () =>
      [...new Set(data?.tones.flatMap((t) => (t.subCategory ? [t.subCategory] : [])))],
    [data]
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data?.tones ?? []) {
      for (const tag of parseTags(t.tags)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [data]);

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of data?.tones ?? []) {
      for (const col of collectionsFor(t)) {
        counts[col] = (counts[col] ?? 0) + 1;
      }
    }
    return counts;
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.tones ?? []).filter((t) => {
      if (category && t.category !== category) return false;
      if (category === "Other" && subCategory && t.subCategory !== subCategory)
        return false;
      if (favoritesOnly && !favorites.has(toneKey(t))) return false;
      if (collection && !collectionsFor(t).includes(collection)) return false;
      if (selectedTags.size > 0) {
        const tags = parseTags(t.tags);
        if (!tags.some((tag) => selectedTags.has(tag))) return false;
      }
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [
    data,
    category,
    subCategory,
    query,
    favoritesOnly,
    favorites,
    collection,
    selectedTags,
  ]);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  // ▶ spelen + bijhouden in "Recent gespeeld"
  const { sendTone } = midi;
  const playAndRecord = useCallback(
    async (tone: ToneDto): Promise<boolean> => {
      const ok = await sendTone(tone);
      if (ok) record(toneKey(tone));
      return ok;
    },
    [sendTone, record]
  );

  // --- Toetsenbordnavigatie door de grid (pijltjes, Enter = speel, O = details) ---
  const [focusIdx, setFocusIdx] = useState(-1);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const focusCard = useCallback(
    (i: number) => {
      if (filtered.length === 0) return;
      const clamped = Math.max(0, Math.min(i, filtered.length - 1));
      setFocusIdx(clamped);
      const el = cardRefs.current[clamped];
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest" });
    },
    [filtered.length]
  );

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const idxAttr = (e.target as HTMLElement).dataset?.cardIndex;
    if (idxAttr == null) return; // focus staat op een knop ín de kaart
    const idx = Number(idxAttr);
    const cols = gridRef.current
      ? getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length
      : 1;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusCard(idx + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusCard(idx - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        focusCard(idx + cols);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusCard(idx - cols);
        break;
      case "Home":
        e.preventDefault();
        focusCard(0);
        break;
      case "End":
        e.preventDefault();
        focusCard(filtered.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        void playAndRecord(filtered[idx]);
        break;
      case " ":
      case "o":
      case "O":
        e.preventDefault();
        setOpenTone(filtered[idx]);
        break;
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
      <header className="py-8 sm:py-12">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
          Roland LX708
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Tone Library</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Alle 324 klanken van de LX708 — met achtergrond per instrument,
          Dual/Split-combinatietips en opname-referentie.
        </p>
        {data?.offline && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-700/40 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
            <span>
              {isFetching
                ? "Verbinden met de server…"
                : "Server even niet bereikbaar — je ziet de offline bibliotheek. Opnieuw proberen gebeurt automatisch."}
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-md border border-amber-700/50 px-2 py-0.5 font-medium text-amber-200 hover:bg-amber-900/40 disabled:opacity-50"
            >
              {isFetching ? "Bezig…" : "Nu opnieuw proberen"}
            </button>
          </div>
        )}

        {/* Warmup-indicator: tijdens het ophalen van thumbnails op de
            achtergrond. De cards verschijnen al; afbeeldingen poppen er per
            stuk bij. Verdwijnt vanzelf zodra alles geladen is. */}
        {warmup && !warmup.complete && !data?.offline && (
          <div className="mt-3 max-w-md" aria-live="polite">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
              <span>
                Afbeeldingen laden op de achtergrond… {warmup.withData}/
                {warmup.total}
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{
                  width: `${Math.round(
                    (warmup.withData / Math.max(1, warmup.total)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </header>

      <FilterBar
        categories={data?.categories ?? []}
        subCategories={subCategories}
        activeCategory={category}
        activeSubCategory={subCategory}
        query={query}
        favoritesOnly={favoritesOnly}
        favoritesCount={favorites.size}
        onCategory={(c) => {
          setCategory(c);
          setSubCategory(null);
        }}
        onSubCategory={setSubCategory}
        onQuery={setQuery}
        onFavoritesOnly={setFavoritesOnly}
        activeCollection={collection}
        collectionCounts={collectionCounts}
        allTags={allTags}
        selectedTags={selectedTags}
        onCollection={setCollection}
        onToggleTag={toggleTag}
        onClearTags={() => setSelectedTags(new Set())}
      />

      <MidiBar midi={midi} studio={studio} />

      <StudioPanel studio={studio} hidden={!midiAvailable} />

      {midiAvailable && <SpeelLab midi={midi} studio={studio} />}

      {midiAvailable && <LayerSpike midi={midi} tones={data?.tones ?? []} />}

      <RecentlyPlayedRow
        recent={recent}
        tones={data?.tones ?? []}
        onPlay={playAndRecord}
        onOpen={setOpenTone}
        onClear={clearRecent}
      />

      <main className="mt-6">
        {studio.isZoneMode && (
          <div className="mb-4 flex gap-1">
            {(["zones", "combos"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setStudioTab(t)}
                aria-pressed={studioTab === t}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  studioTab === t
                    ? "bg-accent text-[#06121f]"
                    : "border border-border-soft text-muted hover:text-foreground"
                }`}
              >
                {t === "zones" ? "Per zone kiezen" : "✨ Combinaties"}
              </button>
            ))}
          </div>
        )}
        {studio.isZoneMode && studioTab === "combos" ? (
          <CombosTab studio={studio} tones={data?.tones ?? []} />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-border-soft bg-surface"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            Geen tones gevonden voor deze filters.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted">
              {filtered.length} {filtered.length === 1 ? "tone" : "tones"}
              <span className="ml-3 hidden text-muted/60 sm:inline">
                ⌨ klik een kaart · pijltjes = bladeren · Enter = speel op de
                piano · O = details
              </span>
            </p>
            <div
              ref={gridRef}
              role="grid"
              aria-label="Tone-bibliotheek"
              onKeyDown={onGridKeyDown}
              className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              {filtered.map((tone, i) => (
                <div
                  key={toneKey(tone)}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  data-card-index={i}
                  tabIndex={(focusIdx === -1 ? i === 0 : i === focusIdx) ? 0 : -1}
                  onFocus={() => setFocusIdx(i)}
                  className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                >
                  <ToneCard
                    tone={tone}
                    isFavorite={favorites.has(toneKey(tone))}
                    isExpanded={expandedKey === toneKey(tone)}
                    onToggleFavorite={toggle}
                    onToggleExpand={setExpandedKey}
                    onOpen={setOpenTone}
                    onPlay={playAndRecord}
                    midiAvailable={midiAvailable}
                    zoneButtons={
                      studio.isZoneMode
                        ? studio.zones.map((z) => ({
                            ...z,
                            isActive: sameTone(studio.effectiveTone(z.zone), tone),
                          }))
                        : undefined
                    }
                    onAssignZone={(t, z) => studio.applyZone(z, t)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {openTone && (
        <ToneModal
          tone={openTone}
          onClose={() => setOpenTone(null)}
          onPlay={playAndRecord}
          midiAvailable={midiAvailable}
        />
      )}

      <ShortcutsOverlay
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <footer className="mt-16 border-t border-border-soft pt-6 text-xs text-muted">
        Gebaseerd op de officiële Roland LX708 Tone List · Wikipedia-content
        onder CC BY-SA
      </footer>
    </div>
  );
}

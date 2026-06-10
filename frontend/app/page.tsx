"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchToneLibrary } from "@/lib/api";
import type { ToneDto } from "@/lib/types";
import { toneKey } from "@/lib/types";
import { useFavorites } from "@/hooks/useFavorites";
import { useMidi } from "@/hooks/useMidi";
import type { Collection } from "@/lib/collections";
import { collectionsFor, parseTags } from "@/lib/collections";
import { FilterBar } from "@/components/FilterBar";
import { MidiBar } from "@/components/MidiBar";
import { ToneCard } from "@/components/ToneCard";
import { ToneModal } from "@/components/ToneModal";

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
  const { favorites, toggle } = useFavorites();
  const midi = useMidi();
  const midiAvailable = midi.status !== "unsupported";

  const { data, isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: fetchToneLibrary,
  });

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
          <p className="mt-3 inline-block rounded-lg border border-amber-700/40 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
            Backend niet bereikbaar — statische bibliotheek wordt getoond
            (Wikipedia-artikelen tijdelijk niet beschikbaar).
          </p>
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

      <MidiBar midi={midi} />

      <main className="mt-6">
        {isLoading ? (
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
            </p>
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((tone) => (
                <ToneCard
                  key={toneKey(tone)}
                  tone={tone}
                  isFavorite={favorites.has(toneKey(tone))}
                  isExpanded={expandedKey === toneKey(tone)}
                  onToggleFavorite={toggle}
                  onToggleExpand={setExpandedKey}
                  onOpen={setOpenTone}
                  onPlay={midi.sendTone}
                  midiAvailable={midiAvailable}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {openTone && (
        <ToneModal
          tone={openTone}
          onClose={() => setOpenTone(null)}
          onPlay={midi.sendTone}
          midiAvailable={midiAvailable}
        />
      )}

      <footer className="mt-16 border-t border-border-soft pt-6 text-xs text-muted">
        Gebaseerd op de officiële Roland LX708 Tone List · Wikipedia-content
        onder CC BY-SA
      </footer>
    </div>
  );
}

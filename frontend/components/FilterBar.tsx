"use client";

import type { ToneCategoryDto } from "@/lib/types";

interface Props {
  categories: ToneCategoryDto[];
  subCategories: string[];
  activeCategory: string | null;
  activeSubCategory: string | null;
  query: string;
  favoritesOnly: boolean;
  favoritesCount: number;
  onCategory: (name: string | null) => void;
  onSubCategory: (name: string | null) => void;
  onQuery: (q: string) => void;
  onFavoritesOnly: (v: boolean) => void;
}

export function FilterBar({
  categories,
  subCategories,
  activeCategory,
  activeSubCategory,
  query,
  favoritesOnly,
  favoritesCount,
  onCategory,
  onSubCategory,
  onQuery,
  onFavoritesOnly,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Zoek een tone… (bijv. Rhodes, organ, 808)"
          className="w-full rounded-xl border border-border-soft bg-surface px-4 py-2.5 text-sm
                     placeholder:text-muted/60 focus:border-accent/50 focus:outline-none sm:max-w-sm"
        />
        <button
          onClick={() => onFavoritesOnly(!favoritesOnly)}
          className={`flex items-center gap-1.5 self-start rounded-xl border px-3.5 py-2.5 text-sm transition ${
            favoritesOnly
              ? "border-accent/60 bg-accent-soft text-accent"
              : "border-border-soft bg-surface text-muted hover:text-foreground"
          }`}
        >
          ★ Favorieten
          {favoritesCount > 0 && (
            <span className="font-mono text-xs">({favoritesCount})</span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="Alle"
          active={activeCategory === null}
          onClick={() => onCategory(null)}
        />
        {categories.map((c) => (
          <FilterChip
            key={c.name}
            label={`${c.name} (${c.toneCount})`}
            active={activeCategory === c.name}
            onClick={() => onCategory(activeCategory === c.name ? null : c.name)}
          />
        ))}
      </div>

      {activeCategory === "Other" && (
        <div className="flex flex-wrap gap-2">
          {subCategories.map((s) => (
            <FilterChip
              key={s}
              small
              label={s}
              active={activeSubCategory === s}
              onClick={() => onSubCategory(activeSubCategory === s ? null : s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  small,
  onClick,
}: {
  label: string;
  active: boolean;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border transition ${
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      } ${
        active
          ? "border-accent/60 bg-accent-soft text-accent"
          : "border-border-soft bg-surface text-muted hover:border-accent/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

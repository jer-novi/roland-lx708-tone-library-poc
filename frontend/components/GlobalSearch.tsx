"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchToneLibrary, offlineLibrary } from "@/lib/api";
import type { ToneDto } from "@/lib/types";
import { comboDocs, genreDocs, toneDocs } from "@/lib/search/sources";
import { createSearchProvider } from "@/lib/search/provider";
import type { SearchDoc, SearchDocType, SearchProvider, SearchResult } from "@/lib/search/types";

const TYPE_LABEL: Record<SearchDocType, string> = {
  tone: "Klank",
  genre: "Genre",
  combo: "Combinatie",
  doc: "Gids",
  artist: "Artiest",
};

const TYPE_ORDER: SearchDocType[] = ["tone", "genre", "combo", "doc", "artist"];

interface Props {
  /** Server-side gelezen doc-secties (uit lib/search/docs.server.ts). */
  docDocs: SearchDoc[];
}

export function GlobalSearch({ docDocs }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<SearchProvider | null>(null);
  const [building, setBuilding] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Statische documenten (genres/combo's/docs) — onafhankelijk van de backend.
  const staticDocs = useMemo(
    () => [...genreDocs(), ...comboDocs(), ...docDocs],
    [docDocs]
  );

  // Bouw de index lui op bij eerste focus (tones komen lazy van de backend, met
  // offline-fallback zodat de zoeker ook werkt als de backend koud staat).
  const ensureIndex = useCallback(async () => {
    if (provider || building) return;
    setBuilding(true);
    let tones: ToneDto[] = [];
    try {
      tones = (await fetchToneLibrary()).tones;
    } catch {
      tones = offlineLibrary().tones;
    }
    setProvider(createSearchProvider([...staticDocs, ...toneDocs(tones)]));
    setBuilding(false);
  }, [provider, building, staticDocs]);

  // Cmd/Ctrl+K focust het zoekveld.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(
    () => (provider ? provider.search(query, 24) : []),
    [provider, query]
  );

  const grouped = useMemo(() => {
    const byType = new Map<SearchDocType, SearchResult[]>();
    for (const r of results) {
      const list = byType.get(r.doc.type) ?? [];
      list.push(r);
      byType.set(r.doc.type, list);
    }
    return TYPE_ORDER.filter((t) => byType.has(t)).map(
      (t) => [t, byType.get(t)!] as const
    );
  }, [results]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
          void ensureIndex();
        }}
        onBlur={() => {
          // Korte vertraging zodat een klik op een resultaat eerst registreert.
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            inputRef.current?.blur();
          } else if (e.key === "Enter" && results[0]) {
            go(results[0].doc.href);
          }
        }}
        placeholder="Zoek in de app…  (⌘K)"
        aria-label="Zoek in de app"
        className="w-40 rounded-lg border border-border-soft bg-surface px-3 py-1.5 text-xs text-foreground transition focus:w-56 focus:border-accent/50 focus:outline-none"
      />

      {showPanel && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-[70vh] w-80 overflow-auto rounded-xl border border-border-soft bg-surface-raised p-1 shadow-xl">
          {building && (
            <p className="px-3 py-2 text-xs text-muted">Index opbouwen…</p>
          )}
          {!building && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">Geen resultaten.</p>
          )}
          {grouped.map(([type, list]) => (
            <div key={type} className="py-1">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted/60">
                {TYPE_LABEL[type]}
              </p>
              {list.map((r) => (
                <button
                  key={r.doc.id}
                  // onMouseDown vuurt vóór de input-blur, zodat navigatie altijd werkt.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(r.doc.href);
                  }}
                  className="flex w-full flex-col items-start rounded-lg px-3 py-1.5 text-left transition hover:bg-white/5"
                >
                  <span className="truncate text-xs text-foreground">{r.doc.title}</span>
                  {r.doc.subtitle && (
                    <span className="truncate text-[10px] text-muted/70">{r.doc.subtitle}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

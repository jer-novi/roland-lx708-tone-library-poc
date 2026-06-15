import Fuse from "fuse.js";
import type { SearchDoc, SearchProvider } from "./types";

/**
 * Client-side {@link SearchProvider} op Fuse.js (~5 KB, zero-dep). Lichtgewicht
 * fuzzy search met field-weighting. De interface laat later een server-engine
 * (Postgres-FTS/Meilisearch/…) invoegen zonder de callers te raken — zie
 * docs/roadmap.md.
 */
export function createSearchProvider(docs: SearchDoc[]): SearchProvider {
  const fuse = new Fuse(docs, {
    keys: [
      { name: "title", weight: 3 },
      { name: "subtitle", weight: 1 },
      { name: "keywords", weight: 1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return {
    search(query, limit = 24) {
      const q = query.trim();
      if (q.length < 2) return [];
      return fuse.search(q, { limit }).map((r) => ({ doc: r.item, score: r.score }));
    },
  };
}

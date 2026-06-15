/**
 * Genormaliseerd "search-document"-schema voor de app-brede zoekfunctie. Dit is
 * de duurzame abstractie: elke bron (lokale TS-data nu; later Strapi/backend-API)
 * mapt op deze shape, en de `SearchProvider` bepaalt wáár geïndexeerd wordt
 * (client-side Fuse.js nu; later Postgres-FTS/engine). Zie docs/roadmap.md.
 */
export type SearchDocType = "tone" | "genre" | "combo" | "doc" | "artist";

export interface SearchDoc {
  /** Stabiele, unieke id (bv. `tone-42`, `doc-/gids#sectie`). */
  id: string;
  type: SearchDocType;
  title: string;
  subtitle?: string;
  /** Extra termen die meewegen in de match (categorie, tags, tonen, …). */
  keywords: string[];
  /** Bestemming bij klikken (in-app route, eventueel met #anchor of ?query). */
  href: string;
}

export interface SearchResult {
  doc: SearchDoc;
  /** Lager = beter (Fuse-conventie); optioneel voor engine-onafhankelijkheid. */
  score?: number;
}

/** Bron-onafhankelijke zoek-poort. Implementaties: Fuse (client) of later server. */
export interface SearchProvider {
  search(query: string, limit?: number): SearchResult[];
}

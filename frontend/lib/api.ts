import type {
  HsPathResponse,
  HsTreeResponse,
  ToneCategoryDto,
  ToneDetailDto,
  ToneDto,
  WarmupStatus,
  WikiDataDto,
} from "./types";
import seedFallback from "./seed-fallback.json";

/**
 * API-basis-URL. Als NEXT_PUBLIC_API_URL niet is gezet, gebruiken we in de
 * browser de hostname van de huidige pagina met poort 8080. Zo werkt dev
 * zowel via localhost:3000 als via een Tailscale-IP (bv. 100.x.x.x:3000)
 * zonder dat de browser "localhost:8080" op het verkeerde toestel opzoekt.
 * Op de server (SSR/build) valt dit terug op localhost:8080.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8080`
    : "http://localhost:8080");

class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new ApiError(`API ${path} failed: ${res.status}`, res.status);
  }
  return res.json();
}

interface SeedTone {
  toneNumber: number;
  name: string;
  category: string;
  subCategory: string | null;
  origin: string | null;
  wikipediaPageTitle: string | null;
  funFacts: string | null;
  combinationSuggestions: string | null;
  midiBankMsb: number | null;
  midiBankLsb: number | null;
  midiProgram: number | null;
  tags: string | null;
  oneLinerNl?: string | null;
  oneLinerEn?: string | null;
}

interface SeedFile {
  categories: { name: string; displayOrder: number; description: string }[];
  tones: SeedTone[];
}

const seed = seedFallback as SeedFile;

/**
 * Static fallback so the app still shows the full tone library when the
 * backend is unreachable (e.g. Render cold start). Negative ids mark
 * fallback entries; detail views then skip backend-only data like wiki HTML.
 */
function fallbackTones(): ToneDto[] {
  return seed.tones.map((t, i) => ({
    id: -(i + 1),
    ...t,
    thumbnailUrl: null,
    shortSummary: null,
    // Offline voorlopig NL; volledige taalwissel komt met de i18n-laag (Fase 3).
    oneLiner: t.oneLinerNl ?? null,
  }));
}

function fallbackCategories(): ToneCategoryDto[] {
  return seed.categories.map((c, i) => ({
    id: -(i + 1),
    name: c.name,
    displayOrder: c.displayOrder,
    description: c.description,
    toneCount: seed.tones.filter((t) => t.category === c.name).length,
  }));
}

export interface ToneLibrary {
  categories: ToneCategoryDto[];
  tones: ToneDto[];
  /** true when served from the bundled seed instead of the live backend */
  offline: boolean;
}

/**
 * Fetches the live library. Throws on any network/backend failure so the
 * caller (React Query) can retry and self-heal; use {@link offlineLibrary}
 * for the bundled-seed fallback when retries are exhausted.
 */
export async function fetchToneLibrary(): Promise<ToneLibrary> {
  const [categories, tones] = await Promise.all([
    get<ToneCategoryDto[]>("/api/categories"),
    get<ToneDto[]>("/api/tones"),
  ]);
  return { categories, tones, offline: false };
}

/** Bundled-seed fallback so the full tone list still renders when offline. */
export function offlineLibrary(): ToneLibrary {
  return {
    categories: fallbackCategories(),
    tones: fallbackTones(),
    offline: true,
  };
}

export async function fetchToneDetail(
  id: number,
  lang = "nl"
): Promise<ToneDetailDto> {
  return get<ToneDetailDto>(`/api/tones/${id}?lang=${lang}`);
}

/**
 * Voortgang van de wiki-warmup. Wordt gepollt zolang de backend nog
 * thumbnails aan het ophalen is, zodat de UI een indicator kan tonen en de
 * tone-lijst kan verversen zodra er nieuwe afbeeldingen klaarstaan.
 */
export async function fetchWarmupStatus(): Promise<WarmupStatus> {
  return get<WarmupStatus>("/api/wiki/status");
}

export async function fetchWiki(
  id: number,
  refresh = false
): Promise<WikiDataDto> {
  return get<WikiDataDto>(`/api/tones/${id}/wiki?refresh=${refresh}`);
}

/**
 * HS-taxonomy pad voor één tone (3-4 nodes van root-family tot leaf).
 * Voor de kleine boom-grafiek in de detail-modal.
 */
export async function fetchHsPath(id: number): Promise<HsPathResponse> {
  return get<HsPathResponse>(`/api/tones/${id}/hs-path`);
}

/**
 * Volledige HS-tree (5 families, 350 instruments, ~265KB). Voor de
 * "Bekijk hele taxonomy"-knop. Cached door de browser op Cache-Control.
 */
export async function fetchHsTree(): Promise<HsTreeResponse> {
  return get<HsTreeResponse>("/api/hs-tree");
}

import type { ToneCategoryDto, ToneDetailDto, ToneDto, WikiDataDto } from "./types";
import seedFallback from "./seed-fallback.json";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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

export async function fetchToneLibrary(): Promise<ToneLibrary> {
  try {
    const [categories, tones] = await Promise.all([
      get<ToneCategoryDto[]>("/api/categories"),
      get<ToneDto[]>("/api/tones"),
    ]);
    return { categories, tones, offline: false };
  } catch (e) {
    console.warn("Backend unreachable, using bundled seed data", e);
    return {
      categories: fallbackCategories(),
      tones: fallbackTones(),
      offline: true,
    };
  }
}

export async function fetchToneDetail(id: number): Promise<ToneDetailDto> {
  return get<ToneDetailDto>(`/api/tones/${id}`);
}

export async function fetchWiki(
  id: number,
  refresh = false
): Promise<WikiDataDto> {
  return get<WikiDataDto>(`/api/tones/${id}/wiki?refresh=${refresh}`);
}

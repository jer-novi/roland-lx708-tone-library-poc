export interface ToneDto {
  id: number;
  toneNumber: number;
  name: string;
  category: string;
  subCategory: string | null;
  origin: string | null;
  wikipediaPageTitle: string | null;
  combinationSuggestions: string | null;
  funFacts: string | null;
  thumbnailUrl: string | null;
  shortSummary: string | null;
}

export interface ToneCategoryDto {
  id: number;
  name: string;
  displayOrder: number;
  description: string | null;
  toneCount: number;
}

export interface WikiDataDto {
  pageTitle: string;
  summary: string | null;
  fullHtml: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  lastFetchedAt: string | null;
}

export interface AudioSampleDto {
  id: number;
  pitch: string | null;
  fileUrl: string;
  description: string | null;
  source: string | null;
  isPerformance: boolean;
  createdAt: string;
}

export interface ToneDetailDto {
  tone: ToneDto;
  wikiData: WikiDataDto | null;
  audioSamples: AudioSampleDto[];
}

/** Stable key for favorites: survives backend re-seeds and static fallback. */
export function toneKey(tone: Pick<ToneDto, "category" | "toneNumber">): string {
  return `${tone.category}#${tone.toneNumber}`;
}

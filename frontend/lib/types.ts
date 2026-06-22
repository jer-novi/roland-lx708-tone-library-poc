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
  /** HD-variant van de thumbnail (geserveerd onder /api/wiki-thumbs-hd/).
   *  Alleen aanwezig als de HD-resolver een match vond — typisch bij
   *  een MIMO museum-foto of een 1600px+ Wikipedia-image. Null betekent
   *  niet "geen HD beschikbaar" maar liever "val terug op thumbnailUrl". */
  thumbnailHdUrl?: string | null;
  /** Bank Select MSB (CC0) uit de officiële MIDI Implementation */
  midiBankMsb: number | null;
  /** Bank Select LSB (CC32) */
  midiBankLsb: number | null;
  /** Program number 1-128 zoals in het document; verzonden wordt (midiProgram - 1) */
  midiProgram: number | null;
  /** Nederlandse klank-tags (timbre + context), comma-separated */
  tags: string | null;
  /** Pakkende one-liner (taal-geselecteerd door de backend o.b.v. ?lang=).
   *  Slide 1 van de kaart-carousel; valt terug op shortSummary als leeg. */
  oneLiner?: string | null;
}

/** Voortgang van de wiki-warmup (achtergrondvulling van thumbnails). */
export interface WarmupStatus {
  total: number;
  /** tones die de warmup al heeft verwerkt (= met thumbnail) */
  withData: number;
  remaining: number;
  complete: boolean;
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
  /** HD-variant van de detail-page thumbnail, geserveerd onder
   *  /api/wiki-thumbs-hd/. Null als de HD-resolver geen match vond. */
  thumbnailHdUrl: string | null;
  /** Bron van de HD-image, bv. "mimo-hd", "site-instruments-hd", "wiki-hd". */
  thumbnailHdSource: string | null;
  /** "Bekijk op MIMO" link — mimo-international.com detail-URL voor
   *  de museum-match. Null als er geen MIMO-entry is voor deze
   *  wiki-titel. */
  mimoUrl: string | null;
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

/** Eén fact-blok, al taal-geselecteerd. category = technical/history/playful/exotic/culture/usage. */
export interface FactDto {
  category: string;
  text: string;
}

/** Achtergrond per instrument (gedeeld door alle tonen met dezelfde wikipediaPageTitle). */
export interface InstrumentBackgroundDto {
  pageTitle: string;
  summary: string | null;
  facts: FactDto[];
}

/** Verwante klank (zelfde instrument) voor de "Verwante klanken"-slide. */
export interface RelatedToneDto {
  id: number;
  toneNumber: number;
  name: string;
  category: string;
}

export interface ToneDetailDto {
  tone: ToneDto;
  wikiData: WikiDataDto | null;
  audioSamples: AudioSampleDto[];
  /** Taal-geselecteerde one-liner (zelfde als tone.oneLiner, voor het gemak). */
  oneLiner: string | null;
  /** Samenvatting + fact-blokken per instrument; null als er nog geen gecureerde tekst is. */
  background: InstrumentBackgroundDto | null;
  /** Andere klanken die hetzelfde instrument/Wikipedia-artikel delen. */
  relatedTones: RelatedToneDto[];
}

/** Stable key for favorites: survives backend re-seeds and static fallback. */
export function toneKey(tone: Pick<ToneDto, "category" | "toneNumber">): string {
  return `${tone.category}#${tone.toneNumber}`;
}

/**
 * HS-tree node types (Hornbostel-Sachs taxonomy). Elke node heeft een
 * hs_code, een naam en optioneel sub-families en/of instrumenten. De
 * tree is hierarchisch: family → subfamily → (subsubfamily) → instrument.
 */
export interface HsNode {
  level: number;
  hs_code: string;
  name: string;
  slug?: string;
  description?: string;
  instrument_count?: number;
  subfamilies?: HsNode[];
  instruments?: HsInstrument[];
}

export interface HsInstrument {
  hs_code: string;
  name: string;
  instrument_id?: number;
  image_url?: string;
  detail_url?: string;
}

export interface HsTreeResponse {
  source: string;
  scraped_at: string;
  stats: {
    total_families: number;
    total_subfamilies: number;
    total_subsubfamilies: number;
    total_instruments: number;
    unique_hs_codes: number;
  };
  families: HsNode[];
  all_instruments: HsInstrument[];
}

/** Per-tone HS-path response — root-family tot leaf-level instrument. */
export interface HsPathNode {
  code: string;
  name: string;
  slug: string;
  level: string;
}

export interface HsPathResponse {
  toneId: number;
  category: string;
  path: HsPathNode[];
}

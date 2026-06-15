import { GENRE_TIPS, genreById, gidsAnchor } from "@/lib/genreTips";
import { TONE_COMBOS } from "@/lib/toneCombos";
import type { ToneDto } from "@/lib/types";
import type { SearchDoc } from "./types";

/**
 * Bron-adapters die bestaande app-data op het {@link SearchDoc}-schema mappen.
 * Client-safe (geen fs); doc-secties komen uit `docs.server.ts`. Een toekomstige
 * bron (Strapi, backend) levert simpelweg extra SearchDocs in dezelfde shape.
 */

/** Genre-tips → zoekdocumenten (deep-link naar de gids). */
export function genreDocs(): SearchDoc[] {
  return GENRE_TIPS.map((g) => ({
    id: `genre-${g.id}`,
    type: "genre",
    title: g.title,
    subtitle: g.section,
    keywords: [g.section, g.heading, g.blurb],
    href: gidsAnchor(g),
  }));
}

/** Gecureerde Dual/Split-combinaties → zoekdocumenten. */
export function comboDocs(): SearchDoc[] {
  return TONE_COMBOS.map((c) => {
    const tip = genreById.get(c.genreId);
    return {
      id: `combo-${c.id}`,
      type: "combo" as const,
      title: c.name,
      subtitle: `${c.tone1} + ${c.tone2}`,
      keywords: [c.tone1, c.tone2, c.why, tip?.title ?? "", tip?.section ?? ""],
      href: tip ? gidsAnchor(tip) : "/",
    };
  });
}

/** Tones uit de catalogus → zoekdocumenten (filtert de home-grid via `?q=`). */
export function toneDocs(tones: ToneDto[]): SearchDoc[] {
  return tones.map((t) => ({
    id: `tone-${t.id}`,
    type: "tone",
    title: t.name,
    subtitle: t.category,
    keywords: [t.category, t.subCategory ?? "", t.tags ?? ""],
    href: `/?q=${encodeURIComponent(t.name)}`,
  }));
}

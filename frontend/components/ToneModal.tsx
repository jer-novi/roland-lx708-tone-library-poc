"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { fetchWiki, fetchToneDetail } from "@/lib/api";
import type { ToneLibrary } from "@/lib/api";
import type { ToneDto, WikiDataDto } from "@/lib/types";
import { collectionsFor, parseTags } from "@/lib/collections";
import { PlayToneButton } from "@/components/PlayToneButton";
import { ToneFactCarousel } from "@/components/ToneFactCarousel";
import { HornbostelSachsTree } from "@/components/HornbostelSachsTree";
import { HornbostelSachsTreeFull } from "@/components/HornbostelSachsTreeFull";
import { ToneThumbnail } from "@/components/ToneThumbnail";
import { API_URL } from "@/lib/api";

interface Props {
  tone: ToneDto;
  onClose: () => void;
  onPlay: (tone: ToneDto) => Promise<boolean>;
  midiAvailable: boolean;
  /** Open een verwante klank vanuit de carousel (optioneel). */
  onSelectRelated?: (toneId: number) => void;
}

function toShortSummary(summary: string | null): string | null {
  if (!summary) return null;
  if (summary.length <= 220) return summary;
  const cut = summary.slice(0, 220);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : 220)}…`;
}

/**
 * Resolve een relatief pad uit de API (zoals "/api/wiki-thumbs/foo.jpg")
 * naar een absolute URL door de API_URL er voor te plakken. Idem voor
 * de HD-variant.
 */
function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function ImageWithFallback({
  src,
  alt,
  className,
  loading,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-border-soft bg-surface-raised text-xs text-muted ${className ?? ""}`}
        style={{ aspectRatio: "1 / 1" }}
      >
        geen afbeelding
      </div>
    );
  }
  // Plain <img> met onError-fallback. We gebruiken bewust geen next/image
  // hier zodat we zowel de lokale API-URL (same-origin) als de cache-control
  // headers van de controller kunnen respecteren zonder next/image optimalisatie.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={loading ?? "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={`rounded-lg border border-border-soft object-cover ${className ?? ""}`}
    />
  );
}

export function ToneModal({ tone, onClose, onPlay, midiAvailable, onSelectRelated }: Props) {
  const [showFullArticle, setShowFullArticle] = useState(false);
  const [showFullHsTree, setShowFullHsTree] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const queryClient = useQueryClient();

  const wikiEnabled = tone.id > 0 && tone.wikipediaPageTitle !== null;

  const { data: wiki, isLoading, isError } = useQuery({
    queryKey: ["wiki", tone.id],
    queryFn: () => fetchWiki(tone.id),
    enabled: wikiEnabled,
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Gecureerde carousel-content (one-liner + samenvatting + facts + verwante
  // klanken). Backend levert de tekst al taal-geselecteerd; voorlopig NL.
  const { data: detail } = useQuery({
    queryKey: ["toneDetail", tone.id],
    queryFn: () => fetchToneDetail(tone.id),
    enabled: tone.id > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!wiki) return;
    queryClient.setQueryData<ToneLibrary>(["library"], (old) => {
      if (!old) return old;
      const current = old.tones.find((t) => t.id === tone.id);
      if (!current || (current.thumbnailUrl && current.shortSummary)) return old;
      return {
        ...old,
        tones: old.tones.map((t) =>
          t.id === tone.id
            ? {
                ...t,
                thumbnailUrl: t.thumbnailUrl ?? wiki.thumbnailUrl,
                shortSummary: t.shortSummary ?? toShortSummary(wiki.summary),
              }
            : t
        ),
      };
    });
  }, [wiki, tone.id, queryClient]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showLightbox) setShowLightbox(false);
        else if (showFullHsTree) setShowFullHsTree(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, showFullHsTree, showLightbox]);

  const sdUrl = resolveImageUrl(tone.thumbnailUrl);
  const hdUrl = resolveImageUrl(tone.thumbnailHdUrl);
  const wikiHdUrl = resolveImageUrl(wiki?.thumbnailHdUrl);
  // Beste beschikbare grote afbeelding voor de lightbox; null = geen
  // afbeelding, dan is de thumbnail ook niet klikbaar.
  const lightboxUrl = hdUrl ?? wikiHdUrl ?? sdUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border-soft
                   bg-surface shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-soft p-5">
          <div className="flex items-start gap-4">
            {/* Zelfde patroon als op de cards: kleine SD-thumbnail, op
                hover een grote HD-preview, en klik opent de fullscreen
                lightbox (i.p.v. de vroegere full-size image in de body). */}
            <div title={lightboxUrl ? "Klik voor grote weergave" : undefined}>
              <ToneThumbnail
                tone={tone}
                size={64}
                rounded="xl"
                hdUrl={wiki?.thumbnailHdUrl ?? tone.thumbnailHdUrl}
                onClick={lightboxUrl ? () => setShowLightbox(true) : undefined}
              />
            </div>
            <div>
              <p className="font-mono text-xs text-muted">
                {tone.category}
                {tone.subCategory ? ` · ${tone.subCategory}` : ""} · #{tone.toneNumber}
              </p>
              <h2 className="mt-1 text-xl font-bold">{tone.name}</h2>
              {tone.origin && (
                <p className="mt-0.5 text-xs text-muted">{tone.origin}</p>
              )}
              {(parseTags(tone.tags).length > 0 ||
                collectionsFor(tone).length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {collectionsFor(tone).map((col) => (
                    <span
                      key={col}
                      className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
                    >
                      {col}
                    </span>
                  ))}
                  {parseTags(tone.tags).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border-soft px-2 py-0.5 text-[11px] text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-lg border border-border-soft px-2.5 py-1 text-sm text-muted hover:text-foreground"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Geen full-size afbeelding meer in de body: de header-thumbnail
              toont 'm op hover en opent de lightbox bij klik. De MIMO-knop
              staat los van sourceUrl: tonen zonder (bestaande)
              Wikipedia-pagina kunnen wél een museum-object hebben. */}
          {(wiki?.sourceUrl || wiki?.mimoUrl) && (
            <section className="flex flex-wrap gap-2">
              {wiki.sourceUrl && (
                <a
                  href={wiki.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border-soft px-3 py-1.5 text-[11px] text-muted hover:text-foreground"
                >
                  Bekijk op Wikipedia ↗
                </a>
              )}
              {wiki.mimoUrl && (
                <a
                  href={wiki.mimoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border-soft px-3 py-1.5 text-[11px] text-muted hover:text-foreground"
                  title="Museum-object met dezelfde naam in mimo-international.com"
                >
                  Bekijk op MIMO ↗
                </a>
              )}
            </section>
          )}

          {midiAvailable && tone.midiProgram != null && (
            <section className="flex flex-wrap items-center gap-3">
              <PlayToneButton
                tone={tone}
                onPlay={onPlay}
                midiAvailable={midiAvailable}
                variant="modal"
              />
              <span className="font-mono text-[11px] text-muted">
                MIDI: bank {tone.midiBankMsb}/{tone.midiBankLsb} · program{" "}
                {tone.midiProgram}
              </span>
            </section>
          )}

          {(detail?.oneLiner ||
            detail?.background ||
            (detail?.relatedTones?.length ?? 0) > 0) && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
                Over deze klank
              </h3>
              <ToneFactCarousel
                oneLiner={detail?.oneLiner ?? tone.oneLiner ?? null}
                background={detail?.background ?? null}
                relatedTones={detail?.relatedTones ?? []}
                onSelectRelated={onSelectRelated}
              />
            </section>
          )}

          {tone.funFacts && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                Wist je dat
              </h3>
              <p className="text-sm leading-relaxed">{tone.funFacts}</p>
            </section>
          )}

          {tone.combinationSuggestions && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
                Combinatietips (Dual / Split)
              </h3>
              <p className="text-sm leading-relaxed">{tone.combinationSuggestions}</p>
            </section>
          )}

          <section className="flex flex-wrap gap-3">
            <Link
              href="/gids#7-genre-tips"
              className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-muted hover:text-accent"
            >
              📖 Zie opnametips per genre
            </Link>
            <Link
              href="/studio"
              className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-muted hover:text-accent"
            >
              🎛 Routing-setups voor je studio
            </Link>
          </section>

          {/* Hornbostel-Sachs taxonomy section — small tree with the
              3-4 ancestor nodes + link to the full 350-node tree. */}
          {tone.id > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Hornbostel-Sachs taxonomie
                </h3>
                <button
                  onClick={() => setShowFullHsTree(true)}
                  className="text-[11px] text-muted hover:text-accent"
                >
                  Bekijk hele taxonomy →
                </button>
              </div>
              <HornbostelSachsTree toneId={tone.id} />
            </section>
          )}

          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
              Achtergrond{tone.wikipediaPageTitle ? ` — ${tone.wikipediaPageTitle}` : ""}
            </h3>

            {!tone.wikipediaPageTitle && (
              <p className="text-sm text-muted">
                Geen Wikipedia-koppeling voor deze tone.
              </p>
            )}

            {wikiEnabled && isLoading && (
              <p className="animate-pulse text-sm text-muted">Wikipedia laden…</p>
            )}

            {wikiEnabled && isError && (
              <p className="text-sm text-muted">
                Wikipedia-info kon niet worden geladen (backend offline of pagina
                niet gevonden).
              </p>
            )}

            {tone.id < 0 && tone.wikipediaPageTitle && (
              <p className="text-sm text-muted">
                Offline modus: open de app met werkende backend voor het
                Wikipedia-artikel, of bekijk{" "}
                <a
                  className="text-accent underline underline-offset-2"
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(
                    tone.wikipediaPageTitle.replaceAll(" ", "_")
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {tone.wikipediaPageTitle} op Wikipedia
                </a>
                .
              </p>
            )}

            {wiki?.summary && !showFullArticle && (
              <>
                <p className="text-sm leading-relaxed">{wiki.summary}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {wiki.fullHtml && (
                    <button
                      onClick={() => setShowFullArticle(true)}
                      className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent hover:brightness-125"
                    >
                      Lees het volledige artikel
                    </button>
                  )}
                </div>
              </>
            )}

            {wiki?.fullHtml && showFullArticle && (
              <>
                <button
                  onClick={() => setShowFullArticle(false)}
                  className="mb-3 rounded-lg border border-border-soft px-3 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  ← Terug naar samenvatting
                </button>
                <div
                  className="wiki-article"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(wiki.fullHtml, {
                      FORBID_TAGS: ["style", "link", "script"],
                    }),
                  }}
                />
              </>
            )}
          </section>
        </div>
      </div>

      {/* Fullscreen lightbox: beste beschikbare afbeelding op klik van de
          header-thumbnail. Boven de HS-tree overlay (z-60). */}
      {showLightbox && lightboxUrl && (
        <div
          className="fixed inset-0 z-[70] flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/90 p-4 sm:p-8"
          onClick={(e) => {
            e.stopPropagation();
            setShowLightbox(false);
          }}
        >
          <ImageWithFallback
            src={lightboxUrl}
            alt={tone.wikipediaPageTitle ?? tone.name}
            className="max-h-[85vh] max-w-full object-contain"
            loading="eager"
          />
          <p className="text-center text-xs text-white/70">
            {tone.name}
            {" · "}
            {hdUrl ? "HD · lokaal gecached" : wikiHdUrl ? "HD · via wiki" : "Standaard"}
            {" · klik of Esc om te sluiten"}
          </p>
        </div>
      )}

      {/* Full HS-tree modal (overlay) */}
      {showFullHsTree && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 sm:p-6"
          onClick={() => setShowFullHsTree(false)}
        >
          <div
            className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border-soft p-4">
              <div>
                <h2 className="text-lg font-bold">Hornbostel-Sachs taxonomie</h2>
                <p className="text-xs text-muted">
                  5 families · 13 sub-families · 350 museum-instrumenten
                </p>
              </div>
              <button
                onClick={() => setShowFullHsTree(false)}
                aria-label="Sluiten"
                className="rounded-lg border border-border-soft px-2.5 py-1 text-sm text-muted hover:text-foreground"
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-hidden">
              <HornbostelSachsTreeFull />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

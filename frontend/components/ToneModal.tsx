"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { fetchWiki } from "@/lib/api";
import type { ToneDto } from "@/lib/types";

interface Props {
  tone: ToneDto;
  onClose: () => void;
}

export function ToneModal({ tone, onClose }: Props) {
  const [showFullArticle, setShowFullArticle] = useState(false);

  // Fallback entries (negative id) have no backend record to fetch wiki for
  const wikiEnabled = tone.id > 0 && tone.wikipediaPageTitle !== null;

  const { data: wiki, isLoading, isError } = useQuery({
    queryKey: ["wiki", tone.id],
    queryFn: () => fetchWiki(tone.id),
    enabled: wikiEnabled,
    staleTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
          <div>
            <p className="font-mono text-xs text-muted">
              {tone.category}
              {tone.subCategory ? ` · ${tone.subCategory}` : ""} · #{tone.toneNumber}
            </p>
            <h2 className="mt-1 text-xl font-bold">{tone.name}</h2>
            {tone.origin && (
              <p className="mt-0.5 text-xs text-muted">{tone.origin}</p>
            )}
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
                  {wiki.sourceUrl && (
                    <a
                      href={wiki.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-muted hover:text-foreground"
                    >
                      Open op Wikipedia ↗
                    </a>
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
    </div>
  );
}

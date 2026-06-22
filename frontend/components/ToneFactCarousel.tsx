"use client";

import type { ReactNode } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Keyboard, Mousewheel, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { InstrumentBackgroundDto, RelatedToneDto } from "@/lib/types";

/**
 * Swipebare kaart-carousel: pakkende one-liner → uitgebreide samenvatting →
 * gecategoriseerde fact-blokken → verwante klanken. De fact-categorieën en
 * labels zijn voorlopig Nederlands; met de i18n-laag (Fase 3) worden ze
 * vertaald terwijl de backend de tekst al taal-geselecteerd aanlevert.
 */
const FACT_META: Record<string, { label: string; icon: string }> = {
  technical: { label: "Techniek", icon: "⚙️" },
  history: { label: "Historie", icon: "📜" },
  playful: { label: "Leuk weetje", icon: "✨" },
  exotic: { label: "Exotisch", icon: "🌍" },
  culture: { label: "Cultuur", icon: "🎬" },
  usage: { label: "Speeltip", icon: "🎹" },
};

interface Props {
  oneLiner: string | null;
  background: InstrumentBackgroundDto | null;
  relatedTones: RelatedToneDto[];
  /** Klik op een verwante klank; optioneel — zonder handler tonen de chips alleen. */
  onSelectRelated?: (toneId: number) => void;
}

function Slide({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border-soft bg-surface-raised p-4">
      <span className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-accent">
        {label}
      </span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function ToneFactCarousel({
  oneLiner,
  background,
  relatedTones,
  onSelectRelated,
}: Props) {
  const slides: { key: string; node: ReactNode }[] = [];

  if (oneLiner) {
    slides.push({
      key: "oneliner",
      node: (
        <Slide label="In het kort">
          <p className="text-base font-medium leading-relaxed">{oneLiner}</p>
        </Slide>
      ),
    });
  }

  if (background?.summary) {
    slides.push({
      key: "summary",
      node: <Slide label="Achtergrond">{background.summary}</Slide>,
    });
  }

  (background?.facts ?? []).forEach((fact, i) => {
    const meta = FACT_META[fact.category] ?? { label: fact.category, icon: "•" };
    slides.push({
      key: `fact-${i}`,
      node: <Slide label={`${meta.icon} ${meta.label}`}>{fact.text}</Slide>,
    });
  });

  if (relatedTones.length > 0) {
    slides.push({
      key: "related",
      node: (
        <Slide label="Verwante klanken">
          <div className="flex flex-wrap gap-1.5">
            {relatedTones.map((rt) => (
              <button
                key={rt.id}
                onClick={() => onSelectRelated?.(rt.id)}
                disabled={!onSelectRelated}
                className="rounded-full border border-border-soft px-2.5 py-1 text-[12px] text-muted enabled:hover:border-accent/50 enabled:hover:text-accent disabled:cursor-default"
                title={`#${rt.toneNumber} · ${rt.category}`}
              >
                {rt.name}
              </button>
            ))}
          </div>
        </Slide>
      ),
    });
  }

  if (slides.length === 0) return null;

  return (
    <div
      className="tone-carousel"
      // Paginatie-bolletjes in de accentkleur i.p.v. Swiper-blauw.
      style={{ ["--swiper-theme-color" as string]: "#38bdf8" }}
    >
      <Swiper
        modules={[Pagination, Keyboard, Mousewheel]}
        pagination={{ clickable: true }}
        keyboard={{ enabled: true }}
        mousewheel={{ forceToAxis: true }}
        spaceBetween={12}
        autoHeight
        className="!pb-8"
      >
        {slides.map((s) => (
          <SwiperSlide key={s.key} className="h-auto">
            {s.node}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

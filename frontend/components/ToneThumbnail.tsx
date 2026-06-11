"use client";

import Image from "next/image";
import { useState } from "react";
import type { ToneDto } from "@/lib/types";
import { API_URL } from "@/lib/api";

const CATEGORY_ICONS: Record<string, string> = {
  Piano: "♪",
  "E. Piano": "⚡",
  Strings: "𝄢",
  Other: "♬",
};

const FALLBACK_CLASSES =
  "flex shrink-0 cursor-pointer items-center justify-center rounded-lg " +
  "bg-accent-soft text-lg text-accent";

interface Props {
  tone: ToneDto;
  size: 48 | 64;
  onClick?: () => void;
  rounded?: "lg" | "xl";
}

/**
 * Tumbnail met graceful fallback. Toont de SD-thumbnail (lokaal gecached
 * door de backend) als kleine card-afbeelding. Op hover toont het een
 * grotere versie van de HD-image (wanneer beschikbaar) rechtsboven als
 * preview — geeft de gebruiker een blik op het instrument zonder de
 * detail-modal te openen.
 *
 * <p>Pad-only URLs uit de backend worden geplakt aan de API_URL zodat
 * dezelfde code werkt in dev (localhost:8080) en productie.
 */
export function ToneThumbnail({ tone, size, onClick, rounded = "lg" }: Props) {
  const [failed, setFailed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const hasImage = tone.thumbnailUrl != null && !failed;
  const hasHd = tone.thumbnailHdUrl != null;
  const radiusClass = rounded === "xl" ? "rounded-xl" : "rounded-lg";
  const dimensionStyle = { width: size, height: size };

  if (!hasImage) {
    return (
      <div
        className={`${FALLBACK_CLASSES} ${radiusClass}`}
        style={dimensionStyle}
        onClick={onClick}
        aria-hidden
      >
        {CATEGORY_ICONS[tone.category] ?? "♬"}
      </div>
    );
  }

  const raw = tone.thumbnailUrl!;
  const src = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `${API_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;

  const rawHd = tone.thumbnailHdUrl;
  const hdSrc = rawHd
    ? rawHd.startsWith("http://") || rawHd.startsWith("https://")
      ? rawHd
      : `${API_URL}${rawHd.startsWith("/") ? "" : "/"}${rawHd}`
    : null;

  return (
    <div
      className="relative shrink-0"
      style={dimensionStyle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Image
        src={src}
        alt={tone.wikipediaPageTitle ?? tone.name}
        width={size}
        height={size}
        className={`${radiusClass} cursor-pointer border border-border-soft object-cover`}
        style={dimensionStyle}
        onClick={onClick}
        onError={() => setFailed(true)}
        unoptimized
      />
      {hovering && hdSrc && (
        // Hover-preview: toon de HD-image op 4x het card-formaat
        // rechtsboven, met accent-border en schaduw. Pointer-events: none
        // zodat de hover niet "breekt" als de muis over de preview beweegt.
        <div
          className="pointer-events-none absolute left-full top-0 z-30 ml-3"
          style={{ width: size * 4, height: size * 4 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hdSrc}
            alt={`${tone.name} (HD preview)`}
            className={`${radiusClass} h-full w-full border-2 border-accent/60 bg-surface object-cover shadow-2xl`}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
    </div>
  );
}

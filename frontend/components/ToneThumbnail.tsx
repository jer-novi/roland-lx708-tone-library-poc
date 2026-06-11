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
 * Tumbnail with graceful fallback. Renders the locally-stored Wikipedia
 * image (or a future AI/static-fallback image) when available, and falls
 * back to a category icon when the URL is missing OR fails to load
 * (404, blocked CDN, etc.). Path-only URLs from the backend are resolved
 * against the configured API_URL so the same code works in dev (where
 * the API is on localhost:8080) and in production (where the API is on
 * its own host).
 */
export function ToneThumbnail({ tone, size, onClick, rounded = "lg" }: Props) {
  const [failed, setFailed] = useState(false);
  const hasImage = tone.thumbnailUrl != null && !failed;
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

  return (
    <Image
      src={src}
      alt={tone.wikipediaPageTitle ?? tone.name}
      width={size}
      height={size}
      className={`${radiusClass} shrink-0 cursor-pointer border border-border-soft object-cover`}
      style={dimensionStyle}
      onClick={onClick}
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

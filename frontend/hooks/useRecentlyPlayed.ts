"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "lx708-recent-tones";
const MAX_RECENT = 10;

/**
 * Recent op de piano gespeelde tones (toneKeys), nieuwste eerst.
 * Gevuld vanuit de ▶-knop; bewaard in localStorage.
 */
export function useRecentlyPlayed() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // One-time hydration-safe load, zelfde patroon als useFavorites.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // corrupt storage: start fresh
    }
  }, []);

  const record = useCallback((key: string) => {
    setRecent((prev) => {
      const next = [key, ...prev.filter((k) => k !== key)].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecent([]);
  }, []);

  return { recent, record, clear };
}

"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["←", "→", "↑", "↓"], label: "Bladeren door de tone-grid" },
  { keys: ["Enter"], label: "Speel de geselecteerde tone op de piano" },
  { keys: ["O", "Spatie"], label: "Open de details van de tone" },
  { keys: ["Home", "End"], label: "Spring naar de eerste / laatste tone" },
  { keys: ["?"], label: "Toon dit sneltoetsen-overzicht" },
];

/** Eenvoudige overlay met de sneltoetsen; sluit met Esc, klik buiten of de knop. */
export function ShortcutsOverlay({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sneltoetsen"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border-soft bg-surface p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">⌨ Sneltoetsen</h2>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-lg border border-border-soft px-2 py-0.5 text-xs text-muted hover:text-foreground"
          >
            Esc
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted">{s.label}</span>
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-border-soft bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

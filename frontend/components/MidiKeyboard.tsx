"use client";

import { useMemo } from "react";

interface Props {
  /** noot (21-108) -> velocity (1-127) */
  activeNotes: ReadonlyMap<number, number>;
  sustainOn: boolean;
}

const LOWEST = 21; // A0
const HIGHEST = 108; // C8
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function isBlack(note: number): boolean {
  return [1, 3, 6, 8, 10].includes(note % 12);
}

function noteName(note: number): string {
  return `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
}

interface Key {
  note: number;
  black: boolean;
  /** index van de witte toets links van (of gelijk aan) deze toets */
  whiteIndex: number;
}

export function MidiKeyboard({ activeNotes, sustainOn }: Props) {
  const { keys, whiteCount } = useMemo(() => {
    const list: Key[] = [];
    let white = 0;
    for (let note = LOWEST; note <= HIGHEST; note++) {
      const black = isBlack(note);
      list.push({ note, black, whiteIndex: white });
      if (!black) white++;
    }
    return { keys: list, whiteCount: white };
  }, []);

  const whiteWidth = 100 / whiteCount;
  const played = [...activeNotes.keys()].sort((a, b) => a - b);

  return (
    <div>
      <div className="relative h-24 select-none overflow-hidden rounded-lg border border-border-soft bg-black/40 sm:h-28">
        {keys
          .filter((k) => !k.black)
          .map((k) => {
            const velocity = activeNotes.get(k.note);
            return (
              <div
                key={k.note}
                className={`absolute bottom-0 top-0 rounded-b-[3px] border-r border-black/50 transition-colors duration-75 ${
                  velocity ? "bg-accent" : "bg-zinc-100"
                }`}
                style={{
                  left: `${k.whiteIndex * whiteWidth}%`,
                  width: `${whiteWidth}%`,
                  opacity: velocity ? 0.45 + (velocity / 127) * 0.55 : 1,
                }}
                title={noteName(k.note)}
              />
            );
          })}
        {keys
          .filter((k) => k.black)
          .map((k) => {
            const velocity = activeNotes.get(k.note);
            return (
              <div
                key={k.note}
                className={`absolute top-0 z-10 h-[62%] rounded-b-[3px] transition-colors duration-75 ${
                  velocity ? "bg-accent" : "bg-zinc-900"
                }`}
                style={{
                  // zwarte toets zit op de grens met de volgende witte toets
                  left: `${(k.whiteIndex + 0.68) * whiteWidth}%`,
                  width: `${whiteWidth * 0.64}%`,
                  opacity: velocity ? 0.45 + (velocity / 127) * 0.55 : 1,
                }}
                title={noteName(k.note)}
              />
            );
          })}
      </div>
      <div className="mt-2 flex min-h-5 items-center gap-3 font-mono text-xs text-muted">
        <span
          className={`rounded px-1.5 py-0.5 ${
            sustainOn ? "bg-accent-soft text-accent" : "bg-white/5"
          }`}
        >
          pedaal
        </span>
        {played.length > 0 ? (
          <span className="truncate text-accent">
            {played.map(noteName).join("  ")}
          </span>
        ) : (
          <span>Speel op de LX708 om noten live te zien…</span>
        )}
      </div>
    </div>
  );
}

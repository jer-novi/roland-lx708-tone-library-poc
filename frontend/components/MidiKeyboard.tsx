"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Note, Chord } from "tonal";

interface Props {
  /** noot (21-108) -> velocity (1-127) */
  activeNotes: ReadonlyMap<number, number>;
  sustainOn: boolean;
  /** Maakt het klavier klikbaar: speelt de noot op de piano. */
  onNoteOn?: (note: number, velocity: number) => void;
  onNoteOff?: (note: number) => void;
  /** Split-bewuste readout: noten < splitPoint = links. null/undefined = geen split. */
  splitPoint?: number | null;
  leftTone?: string;
  rightTone?: string;
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

/** Herkent het akkoord van een set MIDI-noten; lege string bij < 2 noten of geen match. */
function detectChord(notes: number[]): string {
  if (notes.length < 2) return "";
  const names = notes.map((n) => Note.fromMidi(n));
  const found = Chord.detect(names, { assumePerfectFifth: true });
  return found[0] ?? "";
}

interface Key {
  note: number;
  black: boolean;
  whiteIndex: number;
}

export function MidiKeyboard({
  activeNotes,
  sustainOn,
  onNoteOn,
  onNoteOff,
  splitPoint = null,
  leftTone,
  rightTone,
}: Props) {
  const interactive = !!onNoteOn;
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
  const pointerDown = useRef(false);

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

  const press = useCallback(
    (note: number) => {
      setPressed((prev) => {
        if (prev.has(note)) return prev;
        const next = new Set(prev);
        next.add(note);
        return next;
      });
      onNoteOn?.(note, 80);
    },
    [onNoteOn]
  );

  const release = useCallback(
    (note: number) => {
      setPressed((prev) => {
        if (!prev.has(note)) return prev;
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      onNoteOff?.(note);
    },
    [onNoteOff]
  );

  const releaseAll = useCallback(() => {
    setPressed((prev) => {
      prev.forEach((n) => onNoteOff?.(n));
      return prev.size ? new Set<number>() : prev;
    });
  }, [onNoteOff]);

  useEffect(() => {
    if (!interactive) return;
    const up = () => {
      pointerDown.current = false;
      releaseAll();
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [interactive, releaseAll]);

  const handlers = (note: number) =>
    interactive
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            e.preventDefault();
            pointerDown.current = true;
            press(note);
          },
          onPointerEnter: () => {
            if (pointerDown.current) press(note);
          },
          onPointerLeave: () => {
            if (pointerDown.current) release(note);
          },
          onPointerUp: () => release(note),
        }
      : {};

  const velocityOf = (note: number): number | undefined =>
    activeNotes.get(note) ?? (pressed.has(note) ? 90 : undefined);

  const sounding = useMemo(() => {
    const s = new Set<number>(activeNotes.keys());
    pressed.forEach((n) => s.add(n));
    return [...s].sort((a, b) => a - b);
  }, [activeNotes, pressed]);

  return (
    <div>
      <div
        className="relative h-24 select-none overflow-hidden rounded-lg border border-border-soft bg-black/40 sm:h-28"
        style={{ touchAction: "none" }}
      >
        {keys
          .filter((k) => !k.black)
          .map((k) => {
            const velocity = velocityOf(k.note);
            return (
              <div
                key={k.note}
                {...handlers(k.note)}
                className={`absolute bottom-0 top-0 rounded-b-[3px] border-r border-black/50 transition-colors duration-75 ${
                  velocity ? "bg-accent" : "bg-zinc-100"
                } ${interactive ? "cursor-pointer" : ""}`}
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
            const velocity = velocityOf(k.note);
            return (
              <div
                key={k.note}
                {...handlers(k.note)}
                className={`absolute top-0 z-10 h-[62%] rounded-b-[3px] transition-colors duration-75 ${
                  velocity ? "bg-accent" : "bg-zinc-900"
                } ${interactive ? "cursor-pointer" : ""}`}
                style={{
                  left: `${(k.whiteIndex + 0.68) * whiteWidth}%`,
                  width: `${whiteWidth * 0.64}%`,
                  opacity: velocity ? 0.45 + (velocity / 127) * 0.55 : 1,
                }}
                title={noteName(k.note)}
              />
            );
          })}
      </div>

      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
        <span
          className={`rounded px-1.5 py-0.5 ${
            sustainOn ? "bg-accent-soft text-accent" : "bg-white/5"
          }`}
        >
          pedaal
        </span>

        {sounding.length === 0 ? (
          <span>
            {interactive
              ? "Speel op de LX708 of klik op het klavier…"
              : "Speel op de LX708 om noten live te zien…"}
          </span>
        ) : splitPoint != null ? (
          <SplitReadout
            sounding={sounding}
            splitPoint={splitPoint}
            leftTone={leftTone}
            rightTone={rightTone}
          />
        ) : (
          <ChordLine notes={sounding} />
        )}
      </div>
    </div>
  );
}

function ChordLine({ notes, label }: { notes: number[]; label?: string }) {
  const chord = detectChord(notes);
  return (
    <span className="flex flex-wrap items-center gap-x-2">
      {label && <span className="text-muted/70">{label}:</span>}
      <span className="truncate text-accent">{notes.map(noteName).join(" ")}</span>
      {chord && (
        <span className="rounded bg-accent-soft px-1.5 py-0.5 font-semibold text-accent">
          {chord}
        </span>
      )}
    </span>
  );
}

function SplitReadout({
  sounding,
  splitPoint,
  leftTone,
  rightTone,
}: {
  sounding: number[];
  splitPoint: number;
  leftTone?: string;
  rightTone?: string;
}) {
  const right = sounding.filter((n) => n >= splitPoint);
  const left = sounding.filter((n) => n < splitPoint);
  return (
    <span className="flex flex-col gap-0.5">
      {right.length > 0 && <ChordLine notes={right} label={rightTone ?? "Rechts"} />}
      {left.length > 0 && <ChordLine notes={left} label={leftTone ?? "Links"} />}
    </span>
  );
}

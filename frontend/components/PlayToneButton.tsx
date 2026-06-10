"use client";

import { useEffect, useRef, useState } from "react";
import type { ToneDto } from "@/lib/types";

interface Props {
  tone: ToneDto;
  onPlay: (tone: ToneDto) => Promise<boolean>;
  /** true zodra Web MIDI in deze browser bestaat (ook vóór er verbinding is) */
  midiAvailable: boolean;
  variant?: "card" | "modal";
}

type Feedback = "idle" | "sent" | "failed";

export function PlayToneButton({ tone, onPlay, midiAvailable, variant = "card" }: Props) {
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!midiAvailable || tone.midiProgram == null) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await onPlay(tone);
    setFeedback(ok ? "sent" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback("idle"), 1800);
  };

  const label =
    feedback === "sent"
      ? "✓ Op de piano!"
      : feedback === "failed"
        ? "✗ Geen verbinding"
        : variant === "modal"
          ? "▶ Speel deze tone op de LX708"
          : "▶ Speel";

  const base =
    variant === "modal"
      ? "rounded-lg px-3 py-1.5 text-xs font-medium transition"
      : "rounded-lg px-2.5 py-1 text-[11px] font-medium transition";

  const color =
    feedback === "sent"
      ? "bg-emerald-500/15 text-emerald-300"
      : feedback === "failed"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-accent-soft text-accent hover:brightness-125";

  return (
    <button
      onClick={handleClick}
      className={`${base} ${color}`}
      title={`Bank ${tone.midiBankMsb}/${tone.midiBankLsb} · Program ${tone.midiProgram}`}
    >
      {label}
    </button>
  );
}

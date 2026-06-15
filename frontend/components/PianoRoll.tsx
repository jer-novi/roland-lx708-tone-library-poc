"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PlayerNote } from "@/hooks/useMidiPlayer";

interface Props {
  notes: PlayerNote[];
  duration: number;
  position: number;
  /** Verplaats de afspeelkop (scrubben) naar tijd t (seconden). */
  onSeek: (t: number) => void;
  /** Nu klinkende noten (MIDI-input + app-echo) → velocity, voor de overlay. */
  liveNotes?: ReadonlyMap<number, number>;
  height?: number;
  /** "auto" = compacte C2–C6-as (breidt uit); "full88" = twee 44-toetsen-lanes (A0–C8). */
  layout?: "auto" | "full88";
}

// Vaste, klavier-uitgelijnde toonhoogte-as (C2–C6); breidt alleen uit als de
// track of live noten erbuiten vallen. Een vaste as met C-gridlijnen geeft een
// echte toonhoogte-referentie (anders lijkt elke noot "verschoven").
const DEFAULT_LO = 36; // C2
const DEFAULT_HI = 96; // C6
const MIN_NOTE = 21;
const MAX_NOTE = 108;

const octaveName = (midi: number) => `C${Math.floor(midi / 12) - 1}`;

/**
 * Canvas-piano-roll van een MIDI-track: noten als balkjes (toonhoogte verticaal,
 * tijd horizontaal) met C-gridlijnen, een meebewegende afspeelkop en een overlay
 * van de nu klinkende noten. Klik/sleep = `onSeek` (scrubben). Eerlijke weergave
 * van de track zelf — geen gesynthetiseerde audio.
 */
export function PianoRoll({
  notes,
  duration,
  position,
  onSeek,
  liveNotes,
  height = 140,
  layout = "auto",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const widthRef = useRef(0);
  const draggingRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = widthRef.current || canvas.clientWidth || 1;
    const h = height;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const accent = getComputedStyle(canvas).color || "#22d3ee";

    // achtergrond
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, w, h);

    const dur = Math.max(0.001, duration);
    const xOf = (t: number) => (t / dur) * w;

    // Tekent één toonhoogte-lane (loN..hiN) tussen yTop en yBottom.
    const drawLane = (loN: number, hiN: number, yTop: number, yBottom: number) => {
      const pad = 3;
      const laneH = yBottom - yTop;
      const range = Math.max(1, hiN - loN);
      const rowH = (laneH - pad * 2) / (range + 1);
      const yOf = (midi: number) => yTop + pad + (hiN - midi) * rowH;

      // C-gridlijnen + labels als toonhoogte-referentie
      ctx.font = "9px ui-monospace, monospace";
      ctx.textBaseline = "bottom";
      for (let m = Math.ceil(loN / 12) * 12; m <= hiN; m += 12) {
        const y = yOf(m) + rowH;
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(octaveName(m), 2, y - 1);
      }

      // overlay: nu klinkende noten (MIDI-input/echo) als volle-breedte band
      if (liveNotes) {
        ctx.fillStyle = "rgba(110,231,183,0.18)"; // emerald
        liveNotes.forEach((_vel, m) => {
          if (m < loN || m > hiN) return;
          ctx.fillRect(0, yOf(m), w, Math.max(2, rowH));
        });
      }

      // track-noten — noten die nu klinken (afspeelkop er middenin) lichten op
      const noteH = Math.max(2, rowH - 0.5);
      for (const n of notes) {
        if (n.midi < loN || n.midi > hiN) continue;
        const x = xOf(n.time);
        const bw = Math.max(1.5, xOf(n.time + n.duration) - x);
        const sounding = n.time <= position && position < n.time + n.duration;
        if (sounding) {
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = accent;
          ctx.globalAlpha = 0.5 + n.velocity * 0.5;
        }
        ctx.fillRect(x, yOf(n.midi), bw, noteH);
      }
      ctx.globalAlpha = 1;

      // live-noot-markers aan de linkerrand (bovenop de band)
      if (liveNotes) {
        ctx.fillStyle = "rgba(110,231,183,0.95)";
        liveNotes.forEach((_vel, m) => {
          if (m < loN || m > hiN) return;
          ctx.fillRect(0, yOf(m), 4, Math.max(2, rowH));
        });
      }
    };

    if (layout === "full88") {
      // Twee gestapelde lanes: hoog boven (65–108), laag onder (21–64).
      const mid = Math.round(h / 2);
      drawLane(65, MAX_NOTE, 0, mid);
      drawLane(MIN_NOTE, 64, mid, h);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();
    } else {
      // Compacte as: vast C2–C6, uitgebreid voor uitschieters.
      let lo = DEFAULT_LO;
      let hi = DEFAULT_HI;
      for (const n of notes) {
        if (n.midi < lo) lo = n.midi;
        if (n.midi > hi) hi = n.midi;
      }
      if (liveNotes) {
        for (const m of liveNotes.keys()) {
          if (m < lo) lo = m;
          if (m > hi) hi = m;
        }
      }
      lo = Math.max(MIN_NOTE, lo);
      hi = Math.min(MAX_NOTE, hi);
      drawLane(lo, hi, 0, h);
    }

    // afspeelkop (volledige hoogte)
    const px = xOf(Math.min(dur, Math.max(0, position)));
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
    ctx.stroke();
  }, [notes, duration, position, liveNotes, height, layout]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      widthRef.current = entries[0].contentRect.width;
      draw();
    });
    ro.observe(canvas);
    widthRef.current = canvas.clientWidth;
    return () => ro.disconnect();
  }, [draw]);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(frac * Math.max(0.001, duration));
    },
    [onSeek, duration]
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full cursor-pointer rounded-lg border border-border-soft text-accent"
      style={{ height, touchAction: "none" }}
      aria-label="MIDI piano-roll — klik of sleep om te navigeren"
      onPointerDown={(e) => {
        e.preventDefault();
        draggingRef.current = true;
        canvasRef.current?.setPointerCapture(e.pointerId);
        seekFromEvent(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) seekFromEvent(e.clientX);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        canvasRef.current?.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
    />
  );
}

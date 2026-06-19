"use client";

import { useMemo, useState } from "react";
import { Note } from "tonal";
import type { MidiState } from "@/hooks/useMidi";
import type { Studio } from "@/hooks/useStudio";
import { MidiKeyboard } from "@/components/MidiKeyboard";
import {
  TRANSPOSE_MIN,
  TRANSPOSE_MAX,
  transposeToRootMidi,
} from "@/lib/rolandSysex";

const TRANSPOSE_STEPS = Array.from(
  { length: TRANSPOSE_MAX - TRANSPOSE_MIN + 1 },
  (_, i) => TRANSPOSE_MIN + i
);

/** "+2 · D4" / "0 · C4" — transpose-waarde plus de klinkende grondtoon. */
const transposeLabel = (t: number) =>
  `${t > 0 ? "+" : ""}${t} · ${Note.fromMidi(transposeToRootMidi(t))}`;

// Toonsoort-signatuur per pitch-class (0=C), eenvoudigste enharmonische keuze.
const KEY_SIGNATURES = ["0", "5♭", "2♯", "3♭", "4♯", "1♭", "6♯", "1♯", "4♭", "3♯", "2♭", "5♯"];
const sfeerLabel = (t: number) => KEY_SIGNATURES[(((t % 12) + 12) % 12)];

interface Props {
  midi: MidiState;
  studio?: Studio;
}

export function MidiBar({ midi, studio }: Props) {
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Noten van de MIDI-inputs (fysiek gespeeld) samenvoegen met de noten die de
  // app zelf naar de piano stuurt (speler/akkoorden/ladders/progressies), zodat
  // het klavier álles toont wat klinkt.
  const sounding = useMemo(() => {
    if (midi.echoNotes.size === 0) return midi.activeNotes;
    const merged = new Map(midi.activeNotes);
    midi.echoNotes.forEach((vel, note) => {
      if (!merged.has(note)) merged.set(note, vel);
    });
    return merged;
  }, [midi.activeNotes, midi.echoNotes]);

  if (midi.status === "unsupported") {
    return (
      <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/40 px-4 py-3 text-xs text-amber-300">
        🎹 Web MIDI wordt niet ondersteund in deze browser. Open de app in{" "}
        <strong>Chrome</strong> of <strong>Edge</strong> om tones direct naar je
        LX708 te sturen en het live klavier te zien.
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 mt-4 rounded-xl border border-border-soft bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-xs font-medium">
          <span
            className={`inline-block size-2 rounded-full ${
              midi.status === "ready" && midi.outputs.length > 0
                ? "bg-emerald-400"
                : midi.status === "requesting"
                  ? "animate-pulse bg-amber-400"
                  : "bg-zinc-600"
            }`}
          />
          🎹 LX708 via USB-MIDI
        </span>

        {midi.status === "idle" && (
          <button
            onClick={() => midi.connect()}
            className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent hover:brightness-125"
          >
            Verbind met piano
          </button>
        )}

        {midi.status === "requesting" && (
          <span className="text-xs text-muted">Toegang vragen…</span>
        )}

        {midi.status === "denied" && (
          <span className="text-xs text-amber-300">
            MIDI-toegang geweigerd — sta MIDI toe via het slotje in de adresbalk
            en probeer opnieuw.
          </span>
        )}

        {midi.status === "ready" && midi.outputs.length === 0 && (
          <span className="text-xs text-muted">
            Geen MIDI-apparaat gevonden. Sluit de LX708 aan via USB (poort{" "}
            <span className="font-mono">USB Computer</span>) en zet hem aan.
          </span>
        )}

        {midi.status === "ready" && midi.outputs.length === 1 && (
          <span className="text-xs text-muted">
            Verbonden met{" "}
            <span className="font-medium text-foreground">
              {midi.outputs[0].name}
            </span>
          </span>
        )}

        {midi.status === "ready" && midi.outputs.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted">
            Uitgang:
            <select
              value={midi.selectedOutputId ?? ""}
              onChange={(e) => midi.selectOutput(e.target.value)}
              className="rounded-lg border border-border-soft bg-surface-raised px-2 py-1 text-xs text-foreground"
            >
              {midi.outputs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {midi.status === "ready" && (
          <label className="flex items-center gap-2 text-xs text-muted">
            Kanaal:
            <select
              value={midi.channel}
              onChange={(e) => midi.setChannel(Number(e.target.value))}
              className="rounded-lg border border-border-soft bg-surface-raised px-2 py-1 text-xs tabular-nums text-foreground"
            >
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
        )}

        {midi.status === "ready" && studio && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <label className="flex items-center gap-1.5">
              Transpose:
              <select
                value={studio.transpose}
                onChange={(e) => studio.setTranspose(Number(e.target.value))}
                disabled={!studio.ready}
                title="Key transpose (−6..+5). Bij sync volgen de Speel-lab-grondtonen mee."
                className="rounded-lg border border-border-soft bg-surface-raised px-2 py-1 text-xs tabular-nums text-foreground disabled:opacity-50"
              >
                {TRANSPOSE_STEPS.map((t) => (
                  <option key={t} value={t}>
                    {transposeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <span
              title="Toonsoort van de huidige transpose (aantal kruisen/mollen)"
              className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-muted"
            >
              {sfeerLabel(studio.transpose)}
            </span>
            <button
              onClick={() => studio.setSyncMode(!studio.syncMode)}
              disabled={!studio.ready}
              aria-pressed={studio.syncMode}
              title={
                studio.syncMode
                  ? "Sync aan — grondtonen volgen het transpose-wiel (octaven uit)"
                  : "Vrije modus — octaven actief, transpose uit"
              }
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                studio.syncMode
                  ? "bg-accent-soft text-accent"
                  : "border border-border-soft text-muted hover:text-foreground"
              }`}
            >
              {studio.syncMode ? "🔗 Sync" : "Vrij"}
            </button>
          </div>
        )}

        {midi.status === "ready" && (
          <button
            onClick={() => setShowKeyboard((v) => !v)}
            className="ml-auto rounded-lg border border-border-soft px-3 py-1.5 text-xs text-muted hover:text-foreground"
            aria-expanded={showKeyboard}
          >
            {showKeyboard ? "▲ Verberg klavier" : "▼ Live klavier"}
          </button>
        )}
      </div>

      {midi.status === "ready" && showKeyboard && (
        <div className="mt-3">
          <MidiKeyboard
            activeNotes={sounding}
            sustainOn={midi.sustainOn}
            onNoteOn={midi.noteOn}
            onNoteOff={midi.noteOff}
            splitPoint={studio?.mode === "split" ? studio.splitPoint : null}
            leftTone={studio?.effectiveTone("splitLeft")?.name}
            rightTone={studio?.effectiveTone("right")?.name}
          />
        </div>
      )}
    </div>
  );
}

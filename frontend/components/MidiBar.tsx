"use client";

import { useState } from "react";
import type { MidiState } from "@/hooks/useMidi";
import { MidiKeyboard } from "@/components/MidiKeyboard";

interface Props {
  midi: MidiState;
}

export function MidiBar({ midi }: Props) {
  const [showKeyboard, setShowKeyboard] = useState(false);

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
    <div className="mt-4 rounded-xl border border-border-soft bg-surface px-4 py-3">
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
          <MidiKeyboard activeNotes={midi.activeNotes} sustainOn={midi.sustainOn} />
        </div>
      )}
    </div>
  );
}

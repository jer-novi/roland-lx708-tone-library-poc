"use client";

import { useState } from "react";
import type { ToneDto } from "@/lib/types";
import type { Studio } from "@/hooks/useStudio";
import type { ToneZone } from "@/hooks/useRolandSysex";
import type { KeyboardModeName } from "@/lib/rolandSysex";
import { VolumeControl } from "@/components/VolumeControl";

const MODES: { key: KeyboardModeName; label: string }[] = [
  { key: "single", label: "Single" },
  { key: "split", label: "Split" },
  { key: "dual", label: "Dual" },
  { key: "twin", label: "Twin piano" },
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (n: number) => `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
const octLabel = (o: number) => (o > 0 ? `+${o}` : `${o}`);

interface Props {
  studio: Studio;
  /** True wanneer Web MIDI helemaal niet wordt ondersteund — dan tonen we niets. */
  hidden?: boolean;
}

export function StudioPanel({ studio, hidden }: Props) {
  const [open, setOpen] = useState(false);
  if (hidden) return null;
  const { mode, chooseMode, ready, isZoneMode, zones } = studio;

  return (
    <div className="mt-3 rounded-xl border border-border-soft bg-surface px-4 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-xs font-medium"
      >
        <span className="flex flex-wrap items-center gap-2">
          🎛 Studio — Split / Dual
          {!open && ready && <StatusBadge studio={studio} />}
        </span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex gap-1" role="group" aria-label="Klaviermodus">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => chooseMode(m.key)}
                  disabled={!ready}
                  aria-pressed={mode === m.key}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                    mode === m.key
                      ? "bg-accent text-[#06121f]"
                      : "border border-border-soft text-muted hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => void studio.syncFromPiano()}
              disabled={!ready}
              className="ml-auto rounded-lg border border-border-soft px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-40"
            >
              ⟳ Lees van piano
            </button>
          </div>

          {ready && <VolumeControl studio={studio} />}

          {!ready && (
            <p className="mt-2 text-xs text-muted">
              Verbind eerst met de piano (zie de balk hierboven) om de modus en zone-klanken te sturen.
            </p>
          )}

          {ready && mode === "twin" && (
            <p className="mt-2 text-xs text-muted">
              Twin piano splitst het klavier in twee identieke helften (één klank). Pair/Individual-modus
              regel je voorlopig op het paneel — app-besturing volgt later.
            </p>
          )}

          {ready && isZoneMode && (
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {zones.map((slot) => (
                  <ZonePicker key={slot.zone} studio={studio} zone={slot.zone} label={slot.label} />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted">
                {mode === "split" && (
                  <label className="flex items-center gap-2">
                    Splitpunt:
                    <button
                      onClick={() => studio.changeSplitPoint(-1)}
                      className="rounded border border-border-soft px-2 py-0.5 hover:text-foreground"
                      aria-label="Splitpunt omlaag"
                    >
                      ◀
                    </button>
                    <span className="w-10 text-center font-mono tabular-nums text-foreground">
                      {noteName(studio.splitPoint)}
                    </span>
                    <button
                      onClick={() => studio.changeSplitPoint(1)}
                      className="rounded border border-border-soft px-2 py-0.5 hover:text-foreground"
                      aria-label="Splitpunt omhoog"
                    >
                      ▶
                    </button>
                  </label>
                )}
                <label className="flex flex-1 items-center gap-2">
                  Balans:
                  <span className="text-muted/70">{mode === "split" ? "links" : "tone 2"}</span>
                  <input
                    type="range"
                    min={-8}
                    max={8}
                    step={1}
                    value={studio.balanceStep}
                    onChange={(e) => studio.changeBalance(Number(e.target.value))}
                    className="min-w-32 flex-1 accent-accent"
                  />
                  <span className="text-muted/70">{mode === "split" ? "rechts" : "tone 1"}</span>
                  <span className="w-8 text-right font-mono tabular-nums text-foreground">
                    {studio.balanceStep > 0 ? `+${studio.balanceStep}` : studio.balanceStep}
                  </span>
                </label>

                <span className="text-muted/70">
                  Tip: klik in de lijst hieronder op <strong>Links</strong>/<strong>Rechts</strong> om
                  een klank aan een zone te geven.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Compacte samenvatting van de van de piano gelezen status (ingeklapt). */
function StatusBadge({ studio }: { studio: Studio }) {
  const modeLabel = MODES.find((m) => m.key === studio.mode)?.label ?? studio.mode;
  return (
    <span className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-normal text-muted">
      <span className="rounded bg-white/5 px-1.5 py-0.5">{modeLabel}</span>
      {studio.mode === "split" && (
        <span className="rounded bg-white/5 px-1.5 py-0.5">✂ {noteName(studio.splitPoint)}</span>
      )}
      {studio.transpose !== 0 && (
        <span className="rounded bg-white/5 px-1.5 py-0.5">⇅ {octLabel(studio.transpose)}</span>
      )}
      <span className="rounded bg-white/5 px-1.5 py-0.5">🔊 {studio.masterVolume}</span>
    </span>
  );
}

function ZonePicker({ studio, zone, label }: { studio: Studio; zone: ToneZone; label: string }) {
  const tone = studio.effectiveTone(zone);
  const octave = studio.zoneOctave[zone] ?? 0;
  return (
    <div className="rounded-lg border border-border-soft bg-surface-raised px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          Octaaf
          <button
            onClick={() => studio.changeZoneOctave(zone, -1)}
            className="rounded border border-border-soft px-1.5 py-0.5 hover:text-foreground"
            aria-label={`${label} octaaf omlaag`}
          >
            −
          </button>
          <span className="w-5 text-center font-mono tabular-nums text-foreground">
            {octLabel(octave)}
          </span>
          <button
            onClick={() => studio.changeZoneOctave(zone, 1)}
            className="rounded border border-border-soft px-1.5 py-0.5 hover:text-foreground"
            aria-label={`${label} octaaf omhoog`}
          >
            +
          </button>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => studio.stepZone(zone, -1)}
          className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs hover:text-foreground"
          aria-label="Vorige klank"
        >
          ◀
        </button>
        <select
          value={tone ? `${tone.category}#${tone.toneNumber}` : ""}
          onChange={(e) => {
            const [cat, num] = e.target.value.split("#");
            const picked = studio.ordered.find(
              (t) => t.category === cat && t.toneNumber === Number(num)
            );
            if (picked) studio.applyZone(zone, picked);
          }}
          className="min-w-0 flex-1 rounded-lg border border-border-soft bg-surface px-2 py-1.5 text-xs text-foreground"
        >
          {studio.ordered.map((t: ToneDto) => (
            <option key={`${t.category}#${t.toneNumber}`} value={`${t.category}#${t.toneNumber}`}>
              {t.name} · {t.category}
            </option>
          ))}
        </select>
        <button
          onClick={() => studio.stepZone(zone, 1)}
          className="rounded-lg border border-border-soft px-2.5 py-1.5 text-xs hover:text-foreground"
          aria-label="Volgende klank"
        >
          ▶
        </button>
      </div>
    </div>
  );
}

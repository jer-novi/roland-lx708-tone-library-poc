"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MidiState } from "@/hooks/useMidi";
import type { ToneDto } from "@/lib/types";

/**
 * EXPERIMENTEEL "spike"-paneel om de haalbaarheid van multi-kanaals layering op
 * de LX708 te testen vóór we de echte layer-engine bouwen. Het beantwoordt drie
 * vragen op de echte hardware:
 *   1. Klinken GM2-parts apart per MIDI-kanaal (meer dan 2 lagen)?
 *   2. Kan Local Control uit (zodat live spelen niet dubbel klinkt)?
 *   3. Hoe voelt live routing (note-in → app → note-out) qua latency?
 * Wegwerp-code: zodra we de antwoorden hebben, vervangt de echte engine dit.
 */

type Zone = "low" | "high" | "both";
interface LayerCfg {
  ch: number; // 1-based MIDI-kanaal
  toneId: string | null; // "category#toneNumber"
  enabled: boolean;
  zone: Zone;
}

const DEFAULT_LAYERS: LayerCfg[] = [
  { ch: 1, toneId: null, enabled: false, zone: "high" },
  { ch: 2, toneId: null, enabled: false, zone: "high" },
  { ch: 5, toneId: null, enabled: false, zone: "low" },
  { ch: 6, toneId: null, enabled: false, zone: "low" },
];

const CC_BANK_MSB = 0x00;
const CC_BANK_LSB = 0x20;
const CC_LOCAL = 122; // Local Control on/off
const TEST_CHORD = [60, 64, 67]; // C-majeur
const noteName = (n: number) =>
  `${["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][n % 12]}${Math.floor(n / 12) - 1}`;

export function LayerSpike({ midi, tones }: { midi: MidiState; tones: ToneDto[] }) {
  const [open, setOpen] = useState(false);
  const [layers, setLayers] = useState<LayerCfg[]>(DEFAULT_LAYERS);
  const [splitPoint, setSplitPoint] = useState(60); // C4
  const [liveRoute, setLiveRoute] = useState(false);
  const [localOn, setLocalOn] = useState(true);

  const midiRef = useRef(midi);
  useEffect(() => {
    midiRef.current = midi;
  }, [midi]);

  const cfgRef = useRef({ layers, splitPoint });
  useEffect(() => {
    cfgRef.current = { layers, splitPoint };
  }, [layers, splitPoint]);

  const ready = midi.status === "ready" && midi.outputs.length > 0;

  const toneFor = useCallback(
    (id: string | null): ToneDto | null =>
      id ? tones.find((t) => `${t.category}#${t.toneNumber}` === id) ?? null : null,
    [tones]
  );

  /** Zet de tone van een kanaal via Bank Select + Program Change. */
  const pushTone = useCallback(
    (ch: number, tone: ToneDto | null) => {
      if (!tone || tone.midiBankMsb == null || tone.midiBankLsb == null || tone.midiProgram == null)
        return;
      const c = (ch - 1) & 0x0f;
      midiRef.current.sendRaw([0xb0 | c, CC_BANK_MSB, tone.midiBankMsb]);
      midiRef.current.sendRaw([0xb0 | c, CC_BANK_LSB, tone.midiBankLsb]);
      midiRef.current.sendRaw([0xc0 | c, tone.midiProgram - 1]);
    },
    []
  );

  const pushAllTones = useCallback(() => {
    for (const l of layers) if (l.enabled) pushTone(l.ch, toneFor(l.toneId));
  }, [layers, pushTone, toneFor]);

  /** Speel kort een C-akkoord op één kanaal — hoor je het, dan klinkt die part. */
  const playTest = useCallback(
    (ch: number) => {
      const c = (ch - 1) & 0x0f;
      TEST_CHORD.forEach((n) => midiRef.current.sendRaw([0x90 | c, n, 90]));
      window.setTimeout(() => {
        TEST_CHORD.forEach((n) => midiRef.current.sendRaw([0x80 | c, n, 0]));
      }, 800);
    },
    []
  );

  const testAll = useCallback(() => {
    for (const l of layers) {
      if (!l.enabled) continue;
      pushTone(l.ch, toneFor(l.toneId));
      playTest(l.ch);
    }
  }, [layers, pushTone, playTest, toneFor]);

  /** Local Control on/off op alle 16 kanalen (CC122). */
  const setLocal = useCallback((on: boolean) => {
    for (let c = 0; c < 16; c++) midiRef.current.sendRaw([0xb0 | c, CC_LOCAL, on ? 127 : 0]);
    setLocalOn(on);
  }, []);

  // Live routing: stuur binnenkomende noten door naar de ingeschakelde kanalen.
  useEffect(() => {
    if (!liveRoute || !ready) return;
    pushAllTones(); // zorg dat de parts de juiste klank hebben
    const unsub = midiRef.current.onNote((ev) => {
      const { layers: ls, splitPoint: sp } = cfgRef.current;
      const inLow = ev.note < sp;
      for (const l of ls) {
        if (!l.enabled) continue;
        if (l.zone === "low" && !inLow) continue;
        if (l.zone === "high" && inLow) continue;
        const c = (l.ch - 1) & 0x0f;
        if (ev.type === "on") {
          midiRef.current.sendRaw([0x90 | c, ev.note & 0x7f, Math.max(1, ev.velocity)]);
        } else {
          midiRef.current.sendRaw([0x80 | c, ev.note & 0x7f, 0]);
        }
      }
    });
    return unsub;
    // pushAllTones bewust niet als dep: alleen (her)starten bij toggle/ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRoute, ready]);

  // Opruimen: alle noten uit + Local weer aan bij verlaten.
  useEffect(
    () => () => {
      midiRef.current.panic();
    },
    []
  );

  const updateLayer = (i: number, patch: Partial<LayerCfg>) =>
    setLayers((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const orderedTones = [...tones].sort(
    (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
  );

  return (
    <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-xs font-medium text-amber-200"
      >
        <span>🧪 Layer-spike (experimenteel) — multi-kanaals test</span>
        <span className="text-amber-200/60">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-xs">
          <p className="text-muted">
            Test of de LX708 meerdere klanken op losse MIDI-kanalen tegelijk laat
            klinken (GM2-multitimbraal). Kies per kanaal een klank, druk{" "}
            <strong>Test</strong> en luister. Zet daarna <strong>Live route</strong>{" "}
            aan en speel op de piano — met <strong>Local Control: Uit</strong> hoor je
            alléén de gerouteerde lagen (anders ook de eigen pianoklank = dubbel).
          </p>

          {!ready && (
            <p className="text-amber-300">Verbind eerst met de piano (balk hierboven).</p>
          )}

          <div className="space-y-2">
            {layers.map((l, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={l.enabled}
                  onChange={(e) => updateLayer(i, { enabled: e.target.checked })}
                  aria-label={`Laag ${i + 1} aan`}
                />
                <label className="flex items-center gap-1 text-muted">
                  Kanaal
                  <select
                    value={l.ch}
                    onChange={(e) => updateLayer(i, { ch: Number(e.target.value) })}
                    className="rounded border border-border-soft bg-surface px-1.5 py-1 tabular-nums text-foreground"
                  >
                    {Array.from({ length: 16 }, (_, n) => (
                      <option key={n + 1} value={n + 1}>
                        {n + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <select
                  value={l.toneId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || null;
                    updateLayer(i, { toneId: id });
                    if (id) pushTone(l.ch, toneFor(id));
                  }}
                  className="min-w-40 flex-1 rounded border border-border-soft bg-surface px-1.5 py-1 text-foreground"
                >
                  <option value="">— kies klank —</option>
                  {orderedTones.map((t) => (
                    <option key={`${t.category}#${t.toneNumber}`} value={`${t.category}#${t.toneNumber}`}>
                      {t.name} · {t.category}
                    </option>
                  ))}
                </select>
                <select
                  value={l.zone}
                  onChange={(e) => updateLayer(i, { zone: e.target.value as Zone })}
                  className="rounded border border-border-soft bg-surface px-1.5 py-1 text-foreground"
                  title="Welke helft van het klavier deze laag krijgt (bij Live route)"
                >
                  <option value="both">Heel klavier</option>
                  <option value="low">Laag</option>
                  <option value="high">Hoog</option>
                </select>
                <button
                  onClick={() => {
                    pushTone(l.ch, toneFor(l.toneId));
                    playTest(l.ch);
                  }}
                  disabled={!ready || !l.toneId}
                  className="rounded-lg bg-accent-soft px-2.5 py-1 font-medium text-accent disabled:opacity-40"
                >
                  ▶ Test
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border-soft pt-3">
            <button
              onClick={testAll}
              disabled={!ready}
              className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-[#06121f] disabled:opacity-40"
            >
              ▶ Test alle ingeschakelde tegelijk
            </button>
            <button
              onClick={pushAllTones}
              disabled={!ready}
              className="rounded-lg border border-border-soft px-3 py-1.5 text-muted hover:text-foreground disabled:opacity-40"
            >
              Stuur klanken naar piano
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border-soft pt-3">
            <label className="flex items-center gap-2 text-muted">
              Local Control:
              <button
                onClick={() => setLocal(!localOn)}
                disabled={!ready}
                aria-pressed={!localOn}
                className={`rounded-lg px-2.5 py-1 font-medium transition disabled:opacity-40 ${
                  localOn
                    ? "border border-border-soft text-muted hover:text-foreground"
                    : "bg-accent-soft text-accent"
                }`}
              >
                {localOn ? "Aan (eigen klank speelt mee)" : "Uit (alleen routes)"}
              </button>
            </label>

            <label className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={liveRoute}
                onChange={(e) => setLiveRoute(e.target.checked)}
                disabled={!ready}
              />
              Live route (speel op de piano)
            </label>

            <label className="flex items-center gap-2 text-muted">
              Splitpunt
              <button
                onClick={() => setSplitPoint((p) => Math.max(21, p - 1))}
                className="rounded border border-border-soft px-2 py-0.5 hover:text-foreground"
                aria-label="Splitpunt omlaag"
              >
                ◀
              </button>
              <span className="w-10 text-center font-mono tabular-nums text-foreground">
                {noteName(splitPoint)}
              </span>
              <button
                onClick={() => setSplitPoint((p) => Math.min(108, p + 1))}
                className="rounded border border-border-soft px-2 py-0.5 hover:text-foreground"
                aria-label="Splitpunt omhoog"
              >
                ▶
              </button>
            </label>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-muted/80">
            <li>
              <strong>Vraag 1:</strong> hoor je elke laag apart bij <em>Test</em>, en meerdere
              tegelijk bij <em>Test alle</em>? → GM2-multitimbraal werkt.
            </li>
            <li>
              <strong>Vraag 2:</strong> stopt met <em>Local Control: Uit</em> de eigen
              pianoklank bij fysiek spelen (hoor je alleen de routes)? → dan is dubbel
              geluid te voorkomen.
            </li>
            <li>
              <strong>Vraag 3:</strong> voelt <em>Live route</em> strak genoeg, of merk je
              vertraging? → bepaalt of live routing bruikbaar is.
            </li>
            <li className="text-amber-300/80">
              Let op: zet Local Control daarna weer <strong>Aan</strong> voordat je normaal
              speelt (of herstart de piano).
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

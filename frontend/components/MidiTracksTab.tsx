"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MidiState } from "@/hooks/useMidi";
import type { MidiPlayer } from "@/hooks/useMidiPlayer";
import { PianoRoll } from "@/components/PianoRoll";

interface BitMidiResult {
  id: number;
  name: string;
  downloadUrl: string;
  plays?: number;
}

interface HistItem {
  name: string;
  downloadUrl: string;
}

const HIST_KEY = "lx708.trackHistory";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Persistente lijst met recent gespeelde BitMidi-tracks (één-klik herladen). */
function useTrackHistory() {
  const [items, setItems] = useState<HistItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIST_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalige hydratie uit localStorage
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* corrupt/onbeschikbaar — negeer */
    }
  }, []);
  const add = useCallback((it: HistItem) => {
    setItems((prev) => {
      const next = [it, ...prev.filter((p) => p.downloadUrl !== it.downloadUrl)].slice(0, 12);
      try {
        localStorage.setItem(HIST_KEY, JSON.stringify(next));
      } catch {
        /* quota/onbeschikbaar — negeer */
      }
      return next;
    });
  }, []);
  return { items, add };
}

interface Props {
  midi: MidiState;
  player: MidiPlayer;
  /** Stop andere lab-geluiden (akkoorden/ladders) voor we een track starten. */
  onBeforePlay: () => void;
}

export function MidiTracksTab({ midi, player, onBeforePlay }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BitMidiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const history = useTrackHistory();

  const ready = midi.status === "ready" && midi.outputs.length > 0;

  // Nu klinkende noten (fysiek gespeeld + app-echo) voor de piano-roll-overlay.
  const liveNotes = useMemo(() => {
    if (midi.echoNotes.size === 0) return midi.activeNotes;
    const merged = new Map(midi.activeNotes);
    midi.echoNotes.forEach((vel, note) => {
      if (!merged.has(note)) merged.set(note, vel);
    });
    return merged;
  }, [midi.activeNotes, midi.echoNotes]);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bitmidi/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults((data?.result?.results as BitMidiResult[]) ?? []);
    } catch {
      setError("Zoeken mislukt — probeer het later opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const playFrom = useCallback(
    async (name: string, downloadUrl: string) => {
      setError(null);
      onBeforePlay();
      try {
        const res = await fetch(`/api/bitmidi/file?path=${encodeURIComponent(downloadUrl)}`);
        if (!res.ok) throw new Error();
        const buf = await res.arrayBuffer();
        if (player.loadAndPlay(buf, name)) {
          history.add({ name, downloadUrl });
        } else {
          setError("Kon dit bestand niet afspelen.");
        }
      } catch {
        setError("Downloaden mislukt.");
      }
    },
    [onBeforePlay, player, history]
  );

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    onBeforePlay();
    const buf = await file.arrayBuffer();
    if (!player.loadAndPlay(buf, file.name)) setError("Kon dit bestand niet afspelen.");
    e.target.value = "";
  };

  const song = player.song;

  return (
    <div className="mt-3 space-y-3">
      {!ready && (
        <p className="text-xs text-muted">Verbind met de piano om tracks af te spelen.</p>
      )}

      {/* Zoeken + upload */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Zoek op BitMidi (bv. Beethoven)…"
          className="min-w-48 flex-1 rounded-lg border border-border-soft bg-surface px-3 py-1.5 text-xs text-foreground"
        />
        <button
          onClick={search}
          disabled={loading || !q.trim()}
          className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition hover:brightness-125 disabled:opacity-40"
        >
          {loading ? "Zoeken…" : "Zoek"}
        </button>
        <button
          onClick={() => fileInput.current?.click()}
          className="rounded-lg border border-border-soft px-3 py-1.5 text-xs text-muted hover:text-foreground"
        >
          ⬆ Upload .mid
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".mid,.midi,audio/midi"
          onChange={onUpload}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-amber-300">{error}</p>}

      {/* Nu spelend + piano-roll */}
      {song && (
        <div className="rounded-lg border border-border-soft bg-surface-raised px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground">
              {player.isPlaying ? "▶ " : "❚❚ "}
              {song.name}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted">
              {fmt(player.position)} / {fmt(song.duration)}
            </span>
          </div>

          <div className="mt-2">
            <PianoRoll
              notes={song.notes}
              duration={song.duration}
              position={player.position}
              onSeek={player.seek}
              liveNotes={liveNotes}
            />
          </div>

          <div className="mt-2 flex gap-2">
            {player.isPlaying ? (
              <button
                onClick={player.pause}
                className="rounded-lg border border-border-soft px-3 py-1 text-[11px] text-muted hover:text-foreground"
              >
                ❚❚ Pauze
              </button>
            ) : (
              <button
                onClick={player.play}
                disabled={!ready}
                className="rounded-lg bg-accent px-3 py-1 text-[11px] font-semibold text-[#06121f] disabled:opacity-40"
              >
                ▶ Speel
              </button>
            )}
            <button
              onClick={player.stop}
              className="rounded-lg border border-border-soft px-3 py-1 text-[11px] text-muted hover:text-foreground"
            >
              ■ Stop
            </button>
          </div>
        </div>
      )}

      {/* Resultaten */}
      {results.length > 0 && (
        <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border-soft">
          {results.slice(0, 25).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs">{r.name}</span>
              {typeof r.plays === "number" && (
                <span className="shrink-0 font-mono text-[10px] text-muted/70">
                  {r.plays.toLocaleString("nl-NL")}×
                </span>
              )}
              <button
                onClick={() => playFrom(r.name, r.downloadUrl)}
                disabled={!ready}
                className="shrink-0 rounded-lg bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent transition hover:brightness-125 disabled:opacity-40"
              >
                ▶ Speel
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Recent gespeeld */}
      {history.items.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-medium text-muted">Recent gespeeld</p>
          <div className="flex flex-wrap gap-1.5">
            {history.items.map((h) => (
              <button
                key={h.downloadUrl}
                onClick={() => playFrom(h.name, h.downloadUrl)}
                disabled={!ready}
                title={h.name}
                className="max-w-[14rem] truncate rounded-lg border border-border-soft px-2.5 py-1 text-[11px] text-muted transition hover:text-foreground disabled:opacity-40"
              >
                ↻ {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted/70">
        Tracks spelen op het ingestelde kanaal (de huidige klank). Klik/sleep op de piano-roll om
        te navigeren. MIDI van BitMidi — kwaliteit varieert per upload.
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MidiState } from "@/hooks/useMidi";
import type { MidiPlayer } from "@/hooks/useMidiPlayer";
import type { Studio } from "@/hooks/useStudio";
import { PianoRoll } from "@/components/PianoRoll";
import { TrackSoundPicker } from "@/components/TrackSoundPicker";
import { BUILTIN_CHIPS, chipsByGroup, type MidiChip } from "@/lib/midiChips";
import { themeById } from "@/lib/soundThemes";

interface BitMidiResult {
  id: number;
  name: string;
  downloadUrl: string;
  plays?: number;
  views?: number;
}

interface HistItem {
  name: string;
  downloadUrl: string;
}

type OrderBy = "plays" | "views";

const ORDER_LABELS: { id: OrderBy; label: string }[] = [
  { id: "plays", label: "Populair" },
  { id: "views", label: "Meest bekeken" },
];

const HIST_KEY = "lx708.trackHistory";
const CHIPS_KEY = "lx708.midiChips";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Sorteert de geladen resultaten client-side. Nodig omdat BitMidi's `/search`
 * (zodra er een zoekterm is) `orderBy` negeert en alleen op full-text-relevantie
 * sorteert; alleen `/all` (browse) sorteert server-side. Client-side sorteren maakt
 * de sorteerknoppen overal werkend en is in browse-modus consistent met de server.
 * (Sorteren op datum is bewust weggelaten: de catalogus deelt één bulk-import-datum.)
 */
function sortResults(list: BitMidiResult[], orderBy: OrderBy): BitMidiResult[] {
  return [...list].sort((a, b) => (b[orderBy] ?? 0) - (a[orderBy] ?? 0));
}

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

/** Eigen, door de gebruiker toegevoegde zoek-chips (zelfde patroon als de historie). */
function useCustomChips() {
  const [chips, setChips] = useState<MidiChip[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHIPS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalige hydratie uit localStorage
      if (raw) setChips(JSON.parse(raw));
    } catch {
      /* corrupt/onbeschikbaar — negeer */
    }
  }, []);
  const add = useCallback((label: string) => {
    const q = label.trim();
    if (!q) return;
    setChips((prev) => {
      if (prev.some((c) => c.query.toLowerCase() === q.toLowerCase())) return prev;
      const next = [...prev, { label: q, query: q, group: "Eigen" }];
      try {
        localStorage.setItem(CHIPS_KEY, JSON.stringify(next));
      } catch {
        /* quota/onbeschikbaar — negeer */
      }
      return next;
    });
  }, []);
  const remove = useCallback((query: string) => {
    setChips((prev) => {
      const next = prev.filter((c) => c.query !== query);
      try {
        localStorage.setItem(CHIPS_KEY, JSON.stringify(next));
      } catch {
        /* quota/onbeschikbaar — negeer */
      }
      return next;
    });
  }, []);
  return { chips, add, remove };
}

interface Props {
  midi: MidiState;
  player: MidiPlayer;
  /** Studio-state om bijpassende klanken meteen op de piano te zetten. */
  studio: Studio;
  /** Stop andere lab-geluiden (akkoorden/ladders) voor we een track starten. */
  onBeforePlay: () => void;
  /** Key-transpose (halve tonen) — de speler verschuift de noten, dus de
   *  piano-roll moet hetzelfde schuiven zodat beeld = klank. */
  transpose: number;
}

export function MidiTracksTab({ midi, player, studio, onBeforePlay, transpose }: Props) {
  const [q, setQ] = useState("");
  const [orderBy, setOrderBy] = useState<OrderBy>("plays");
  const [results, setResults] = useState<BitMidiResult[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [pageTotal, setPageTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const history = useTrackHistory();
  const customChips = useCustomChips();
  const [full88, setFull88] = useState(false);
  const [activeChip, setActiveChip] = useState<MidiChip | null>(null);

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

  // Eén plek voor zoeken/browsen/paginering. `append` voegt een volgende pagina
  // toe; anders vervangen we de lijst (nieuwe zoekterm of andere sortering).
  const runFetch = useCallback(
    async (query: string, order: OrderBy, pageNum: number, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ orderBy: order, page: String(pageNum) });
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/bitmidi/search?${params.toString()}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const r = data?.result ?? {};
        const next = (r.results as BitMidiResult[]) ?? [];
        setResults((prev) => (append ? [...prev, ...next] : next));
        setTotal(typeof r.total === "number" ? r.total : null);
        setPageTotal(typeof r.pageTotal === "number" ? r.pageTotal : null);
        setPage(pageNum);
      } catch {
        setError("Zoeken mislukt — probeer het later opnieuw.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Toon bij openen meteen de populairste tracks (browse) i.p.v. een leeg scherm.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalige browse-fetch bij mount
    runFetch("", "plays", 0, false);
  }, [runFetch]);

  const submit = (query: string) => {
    setQ(query);
    runFetch(query, orderBy, 0, false);
  };
  // Chip-klik: zoek + (als de chip een thema heeft) open de bijpassende-klanken-picker.
  const onChip = (chip: MidiChip) => {
    submit(chip.query);
    setActiveChip(chip.themeId ? chip : null);
  };
  const activeTheme = activeChip?.themeId ? themeById.get(activeChip.themeId) ?? null : null;
  const changeOrder = (order: OrderBy) => {
    setOrderBy(order);
    runFetch(q, order, 0, false);
  };
  const loadMore = () => runFetch(q, orderBy, page + 1, true);

  const hasMore = pageTotal !== null && page + 1 < pageTotal;

  // Sorteer client-side (BitMidi's /search negeert orderBy — zie sortResults).
  const shown = useMemo(() => sortResults(results, orderBy), [results, orderBy]);

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

  const allChips = useMemo(
    () => chipsByGroup([...BUILTIN_CHIPS, ...customChips.chips]),
    [customChips.chips]
  );

  const song = player.song;

  // Verschuif de getekende noten met de transpose zodat de piano-roll laat zien
  // wat er werkelijk klinkt (de speler verschuift de verzonden noten net zo).
  const displayNotes = useMemo(
    () =>
      transpose === 0 || !song
        ? (song?.notes ?? [])
        : song.notes.map((n) => ({
            ...n,
            midi: Math.max(0, Math.min(127, n.midi + transpose)),
          })),
    [song, transpose]
  );

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
          onKeyDown={(e) => e.key === "Enter" && submit(q)}
          placeholder="Zoek op BitMidi (bv. Beethoven)…"
          className="min-w-48 flex-1 rounded-lg border border-border-soft bg-surface px-3 py-1.5 text-xs text-foreground"
        />
        <button
          onClick={() => submit(q)}
          disabled={loading}
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

      {/* Sorteren */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted">Sorteer:</span>
        <div className="flex gap-1" role="group" aria-label="Sortering">
          {ORDER_LABELS.map((o) => (
            <button
              key={o.id}
              onClick={() => changeOrder(o.id)}
              aria-pressed={orderBy === o.id}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                orderBy === o.id
                  ? "bg-accent text-[#06121f]"
                  : "border border-border-soft text-muted hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {total !== null && (
          <span className="ml-auto text-[11px] text-muted/70">
            {total.toLocaleString("nl-NL")} {total === 1 ? "resultaat" : "resultaten"}
          </span>
        )}
      </div>

      {/* Snelkeuze-chips (artiest/genre) */}
      <div className="space-y-1.5">
        {allChips.map(([group, chips]) => (
          <div key={group} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-muted/60">{group}</span>
            {chips.map((chip) => (
              <span key={`${group}-${chip.query}`} className="inline-flex items-center">
                <button
                  onClick={() => onChip(chip)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    q.trim().toLowerCase() === chip.query.toLowerCase()
                      ? "bg-accent text-[#06121f]"
                      : "bg-accent-soft text-accent hover:brightness-125"
                  }`}
                >
                  {chip.label}
                  {chip.themeId && <span className="ml-1 text-[9px] opacity-70" title="bijpassende klanken beschikbaar">🎚</span>}
                </button>
                {chip.group === "Eigen" && (
                  <button
                    onClick={() => customChips.remove(chip.query)}
                    title="Eigen chip verwijderen"
                    aria-label={`Verwijder chip ${chip.label}`}
                    className="ml-0.5 text-[11px] text-muted/60 hover:text-amber-300"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        ))}
        <button
          onClick={() => customChips.add(q)}
          disabled={!q.trim()}
          title="Huidige zoekterm als eigen chip bewaren"
          className="rounded-full border border-dashed border-border-soft px-2.5 py-1 text-[11px] text-muted transition hover:text-foreground disabled:opacity-40"
        >
          + Chip van zoekterm
        </button>
      </div>

      {/* Bijpassende klanken bij de gekozen chip (zonder weg te navigeren) */}
      {activeTheme && (
        <TrackSoundPicker
          studio={studio}
          theme={activeTheme}
          featured={activeChip?.featured}
          onClose={() => setActiveChip(null)}
        />
      )}

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
              notes={displayNotes}
              duration={song.duration}
              position={player.position}
              onSeek={player.seek}
              liveNotes={liveNotes}
              layout={full88 ? "full88" : "auto"}
              height={full88 ? 260 : 140}
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
            <button
              onClick={() => setFull88((v) => !v)}
              aria-pressed={full88}
              title="Wissel tussen compacte weergave en de volledige 88 toetsen (2 rijen)"
              className="ml-auto rounded-lg border border-border-soft px-3 py-1 text-[11px] text-muted hover:text-foreground"
            >
              {full88 ? "↕ Compact" : "↕ 88 toetsen"}
            </button>
          </div>
        </div>
      )}

      {/* Resultaten */}
      {results.length > 0 && (
        <>
          <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border-soft">
            {shown.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs">{r.name}</span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-muted/70">
                  {typeof r.plays === "number" && <span title="afspeelacties">▶ {r.plays.toLocaleString("nl-NL")}</span>}
                  {typeof r.views === "number" && <span title="weergaven">👁 {r.views.toLocaleString("nl-NL")}</span>}
                </span>
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
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full rounded-lg border border-border-soft px-3 py-2 text-xs text-muted transition hover:text-foreground disabled:opacity-40"
            >
              {loading ? "Laden…" : "Meer laden"}
            </button>
          )}
        </>
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

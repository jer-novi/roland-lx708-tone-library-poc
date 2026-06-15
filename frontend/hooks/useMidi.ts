"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { ToneDto } from "@/lib/types";

export type MidiStatus =
  | "unsupported" // browser kent geen Web MIDI (Firefox/Safari)
  | "idle" // nog geen toegang gevraagd
  | "requesting"
  | "ready"
  | "denied"; // gebruiker weigerde of beleid blokkeert

export interface MidiDevice {
  id: string;
  name: string;
}

export interface MidiState {
  status: MidiStatus;
  outputs: MidiDevice[];
  inputs: MidiDevice[];
  selectedOutputId: string | null;
  selectOutput: (id: string) => void;
  /**
   * MIDI-kanaal (0-15, weergegeven als 1-16). Default = 3 (kanaal 4).
   * Kanaal 4 is vereist om de klank van het ingebouwde klavier te wijzigen
   * (Bank Select/PC op andere kanalen sturen alleen de GM2-multitimbraal-
   * delen aan, niet de "Local"-klank van de toetsen zelf).
   */
  channel: number;
  setChannel: (ch: number) => void;
  /** Vraagt MIDI-toegang aan (moet vanuit een user gesture gebeuren). */
  connect: () => Promise<boolean>;
  /** Stuurt Bank Select + Program Change voor deze tone. */
  sendTone: (tone: ToneDto) => Promise<boolean>;
  /**
   * Stuurt ruwe MIDI-bytes naar de geselecteerde output. Optionele `timestamp`
   * (performance.now()-domein) laat Web MIDI het bericht precies in de toekomst
   * plannen — gebruikt door de MIDI-speler voor strakke timing.
   */
  sendRaw: (bytes: number[], timestamp?: number) => boolean;
  /** Annuleert geplande berichten en zet alle noten uit (stop/paniek). */
  panic: () => void;
  /**
   * Annuleert alléén nog-niet-verstuurde, getimede berichten in de hardware-
   * wachtrij (`MIDIOutput.clear()`), zonder noten uit te zetten. De MIDI-speler
   * gebruikt dit zodat een stop/seek de vooruit-ingeplande note-ons niet alsnog
   * laat klinken (en blijven hangen).
   */
  clearScheduled: () => void;
  /** Speelt een noot op de piano (klikbaar klavier) op het ingestelde kanaal. */
  noteOn: (note: number, velocity?: number) => boolean;
  /** Laat een noot los. */
  noteOff: (note: number) => boolean;
  /** Abonneer op binnenkomende SysEx-berichten; geeft een unsubscribe terug. */
  onSysex: (listener: (data: Uint8Array) => void) => () => void;
  /**
   * Abonneer op binnenkomende noot-events (note-on/off) van de MIDI-inputs, voor
   * live routing/layering met lage latency (los van de `activeNotes`-state, die
   * re-renders veroorzaakt). Geeft een unsubscribe terug.
   */
  onNote: (
    listener: (ev: {
      type: "on" | "off";
      note: number;
      velocity: number;
      channel: number;
    }) => void
  ) => () => void;
  /** Actieve noten op de aangesloten MIDI-inputs: noot -> velocity (1-127). */
  activeNotes: ReadonlyMap<number, number>;
  /** Sustainpedaal (CC64) ingedrukt op een input */
  sustainOn: boolean;
  /**
   * Door de app zélf gegenereerde, klinkende noten (speler/akkoorden/ladders/
   * progressies) → velocity. Apart van `activeNotes` (die alleen van de MIDI-
   * inputs komt) zodat de keyboard-weergave ook toont wat wíj naar de piano
   * sturen — de piano echoot ontvangen noten immers niet terug.
   */
  echoNotes: ReadonlyMap<number, number>;
  echoOn: (note: number, velocity?: number) => void;
  echoOff: (note: number) => void;
  echoClear: () => void;
}

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CONTROL_CHANGE = 0xb0;
const PROGRAM_CHANGE = 0xc0;
const CC_BANK_MSB = 0x00;
const CC_BANK_LSB = 0x20;
const CC_SUSTAIN = 0x40;

/** Roland-pianos verschijnen als bv. "LX708", "Roland Digital Piano" of "PIANO". */
function scoreOutput(name: string): number {
  const n = name.toLowerCase();
  if (/lx-?70[5-8]/.test(n)) return 3;
  if (n.includes("roland")) return 2;
  if (n.includes("piano")) return 1;
  return 0;
}

const noopSubscribe = () => () => {};

/** Client-only check; tijdens SSR gaan we uit van ondersteuning. */
function useMidiSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => "requestMIDIAccess" in navigator,
    () => true
  );
}

function toDevices(map: Iterable<MIDIInput | MIDIOutput>): MidiDevice[] {
  return [...map].map((port) => ({
    id: port.id,
    name: port.name ?? "Onbekend apparaat",
  }));
}

/** Log alle beschikbare MIDI-poorten naar de console voor diagnose. */
function logAvailableDevices(access: MIDIAccess) {
  console.group("🎹 MIDI Apparaten Audit");
  console.log("--- Beschikbare MIDI Inputs ---");
  if (access.inputs.size === 0) {
    console.log("  (geen inputs gevonden)");
  }
  access.inputs.forEach((input) => {
    console.log(
      `📥 Input: "${input.name}" [manufacturer: ${input.manufacturer || "onbekend"}, ` +
      `state: ${input.state}, connection: ${input.connection}, id: ${input.id}]`
    );
  });
  console.log("--- Beschikbare MIDI Outputs ---");
  if (access.outputs.size === 0) {
    console.log("  (geen outputs gevonden)");
  }
  access.outputs.forEach((output) => {
    console.log(
      `📤 Output: "${output.name}" [manufacturer: ${output.manufacturer || "onbekend"}, ` +
      `state: ${output.state}, connection: ${output.connection}, id: ${output.id}]`
    );
  });
  console.groupEnd();
}

export function useMidi(): MidiState {
  const [status, setStatus] = useState<MidiStatus>("idle");
  const [outputs, setOutputs] = useState<MidiDevice[]>([]);
  const [inputs, setInputs] = useState<MidiDevice[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [channel, setChannel] = useState(3); // 3 = MIDI kanaal 4 (vereist voor "Local"-klank van het klavier)
  const [activeNotes, setActiveNotes] = useState<ReadonlyMap<number, number>>(
    new Map()
  );
  const [sustainOn, setSustainOn] = useState(false);
  const [echoNotes, setEchoNotes] = useState<ReadonlyMap<number, number>>(
    new Map()
  );
  const accessRef = useRef<MIDIAccess | null>(null);
  const userPickedOutput = useRef(false);
  const sysexListeners = useRef<Set<(data: Uint8Array) => void>>(new Set());
  const noteListeners = useRef<
    Set<(ev: { type: "on" | "off"; note: number; velocity: number; channel: number }) => void>
  >(new Set());
  const supported = useMidiSupported();

  const handleMidiMessage = useCallback((e: MIDIMessageEvent) => {
    const data = e.data;
    if (!data) return;
    if (data[0] === 0xf0) {
      // SysEx — doorgeven aan abonnees (Roland DT1/RQ1-afhandeling)
      sysexListeners.current.forEach((fn) => fn(data));
      return;
    }
    if (data.length < 3) return;
    const command = data[0] & 0xf0;
    const channel = data[0] & 0x0f;
    const note = data[1];
    const value = data[2];
    if (command === NOTE_ON && value > 0) {
      setActiveNotes((prev) => new Map(prev).set(note, value));
      noteListeners.current.forEach((fn) =>
        fn({ type: "on", note, velocity: value, channel })
      );
    } else if (command === NOTE_OFF || (command === NOTE_ON && value === 0)) {
      setActiveNotes((prev) => {
        if (!prev.has(note)) return prev;
        const next = new Map(prev);
        next.delete(note);
        return next;
      });
      noteListeners.current.forEach((fn) =>
        fn({ type: "off", note, velocity: 0, channel })
      );
    } else if (command === CONTROL_CHANGE && note === CC_SUSTAIN) {
      setSustainOn(value >= 64);
    }
  }, []);

  const syncPorts = useCallback(() => {
    const access = accessRef.current;
    if (!access) return;

    logAvailableDevices(access);

    setOutputs(toDevices(access.outputs.values()));
    setInputs(toDevices(access.inputs.values()));

    for (const input of access.inputs.values()) {
      input.onmidimessage = handleMidiMessage;
    }

    setSelectedOutputId((current) => {
      const stillThere = current && access.outputs.has(current);
      if (stillThere && userPickedOutput.current) return current;
      let best: string | null = stillThere ? current : null;
      let bestScore = best
        ? scoreOutput(access.outputs.get(best)?.name ?? "")
        : -1;
      for (const out of access.outputs.values()) {
        const score = scoreOutput(out.name ?? "");
        if (score > bestScore) {
          best = out.id;
          bestScore = score;
        }
      }
      if (best) {
        const bestName = access.outputs.get(best)?.name ?? "?";
        console.log(`🎯 Auto-selected output: "${bestName}" (score: ${bestScore}, id: ${best})`);
      }
      return best;
    });
  }, [handleMidiMessage]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (accessRef.current) return true;
    if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
      return false;
    }
    setStatus("requesting");
    try {
      console.log("🚀 Requesting Web MIDI access (sysex: true)...");
      const access = await navigator.requestMIDIAccess({ sysex: true });
      accessRef.current = access;
      console.log("✅ Web MIDI API succesvol geïnitialiseerd.");

      // Live meeluisteren op USB in- en uitpluggen
      access.onstatechange = (event: Event) => {
        const midiEvent = event as MIDIConnectionEvent;
        const port = midiEvent.port;
        if (port) {
          const icon = port.state === "connected" ? "✅" : "❌";
          console.log(
            `🔌 [MIDI StateChange] ${icon} ${port.type} "${port.name}" ` +
            `[manufacturer: ${port.manufacturer || "onbekend"}, ` +
            `state: ${port.state}, connection: ${port.connection}]`
          );
        }
        syncPorts();
      };

      syncPorts();
      setStatus("ready");
      return true;
    } catch (err) {
      console.error("❌ Web MIDI API initialisatie mislukt:", err);
      setStatus("denied");
      return false;
    }
  }, [syncPorts]);

  const selectOutput = useCallback((id: string) => {
    userPickedOutput.current = true;
    setSelectedOutputId(id);
  }, []);

  const sendTone = useCallback(
    async (tone: ToneDto): Promise<boolean> => {
      if (
        tone.midiBankMsb == null ||
        tone.midiBankLsb == null ||
        tone.midiProgram == null
      ) {
        console.warn(`⚠️ Tone "${tone.name}" heeft geen MIDI-mapping (MSB/LSB/PC ontbreekt).`);
        return false;
      }
      if (!accessRef.current && !(await connect())) return false;
      const access = accessRef.current;
      if (!access) return false;

      const output =
        (selectedOutputId && access.outputs.get(selectedOutputId)) ||
        access.outputs.values().next().value;
      if (!output) {
        console.error("❌ Geen MIDI-output beschikbaar om tone te versturen.");
        return false;
      }

      // Volgorde volgens de MIDI Implementation: CC0 (MSB), CC32 (LSB),
      // dan Program Change; de LX708 past de bank pas toe bij de PC.
      // Kanaal is instelbaar via de UI (default 3 = kanaal 4, vereist om de
      // klank van het ingebouwde klavier te wijzigen i.p.v. een GM2-deel).
      output.send([CONTROL_CHANGE | channel, CC_BANK_MSB, tone.midiBankMsb]);
      output.send([CONTROL_CHANGE | channel, CC_BANK_LSB, tone.midiBankLsb]);
      output.send([PROGRAM_CHANGE | channel, tone.midiProgram - 1]);
      console.log(
        `🎵 MIDI verzonden naar "${output.name}" (Ch ${channel + 1}): ` +
        `"${tone.name}" — MSB=${tone.midiBankMsb}, LSB=${tone.midiBankLsb}, PC=${tone.midiProgram}`
      );
      return true;
    },
    [connect, selectedOutputId, channel]
  );

  const getOutput = useCallback((): MIDIOutput | undefined => {
    const access = accessRef.current;
    if (!access) return undefined;
    return (
      (selectedOutputId && access.outputs.get(selectedOutputId)) ||
      access.outputs.values().next().value
    );
  }, [selectedOutputId]);

  const sendRaw = useCallback(
    (bytes: number[], timestamp?: number): boolean => {
      const output = getOutput();
      if (!output) {
        console.error("❌ Geen MIDI-output beschikbaar voor sendRaw.");
        return false;
      }
      output.send(bytes, timestamp);
      return true;
    },
    [getOutput]
  );

  // ---- Echo: in-app weergave van noten die wíj naar de piano sturen ----
  const echoOn = useCallback((note: number, velocity = 80) => {
    setEchoNotes((prev) =>
      new Map(prev).set(note & 0x7f, Math.max(1, Math.min(127, velocity)))
    );
  }, []);

  const echoOff = useCallback((note: number) => {
    setEchoNotes((prev) => {
      const n = note & 0x7f;
      if (!prev.has(n)) return prev;
      const next = new Map(prev);
      next.delete(n);
      return next;
    });
  }, []);

  const echoClear = useCallback(() => {
    setEchoNotes((prev) => (prev.size ? new Map() : prev));
  }, []);

  const clearScheduled = useCallback(() => {
    const output = getOutput();
    // clear() annuleert geplande (getimede) berichten; nog niet in alle TS-libs.
    (output as (MIDIOutput & { clear?: () => void }) | undefined)?.clear?.();
  }, [getOutput]);

  const panic = useCallback(() => {
    echoClear();
    const output = getOutput();
    if (!output) return;
    clearScheduled();
    for (let ch = 0; ch < 16; ch++) {
      output.send([0xb0 | ch, 0x7b, 0]); // All Notes Off
      output.send([0xb0 | ch, 0x78, 0]); // All Sound Off
    }
  }, [getOutput, echoClear, clearScheduled]);

  const noteOn = useCallback(
    (note: number, velocity = 80): boolean => {
      echoOn(note, velocity);
      return sendRaw([NOTE_ON | channel, note & 0x7f, Math.max(1, Math.min(127, velocity))]);
    },
    [sendRaw, channel, echoOn]
  );

  const noteOff = useCallback(
    (note: number): boolean => {
      echoOff(note);
      return sendRaw([NOTE_OFF | channel, note & 0x7f, 0]);
    },
    [sendRaw, channel, echoOff]
  );

  const onSysex = useCallback((listener: (data: Uint8Array) => void) => {
    sysexListeners.current.add(listener);
    return () => {
      sysexListeners.current.delete(listener);
    };
  }, []);

  const onNote = useCallback(
    (
      listener: (ev: {
        type: "on" | "off";
        note: number;
        velocity: number;
        channel: number;
      }) => void
    ) => {
      noteListeners.current.add(listener);
      return () => {
        noteListeners.current.delete(listener);
      };
    },
    []
  );

  return {
    status: supported ? status : "unsupported",
    outputs,
    inputs,
    selectedOutputId,
    selectOutput,
    channel,
    setChannel,
    connect,
    sendTone,
    sendRaw,
    panic,
    clearScheduled,
    noteOn,
    noteOff,
    onSysex,
    onNote,
    activeNotes,
    sustainOn,
    echoNotes,
    echoOn,
    echoOff,
    echoClear,
  };
}

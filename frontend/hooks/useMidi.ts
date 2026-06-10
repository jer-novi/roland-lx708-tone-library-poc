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
  /** Vraagt MIDI-toegang aan (moet vanuit een user gesture gebeuren). */
  connect: () => Promise<boolean>;
  /** Stuurt Bank Select + Program Change voor deze tone. */
  sendTone: (tone: ToneDto) => Promise<boolean>;
  /** Actieve noten op de aangesloten MIDI-inputs: noot -> velocity (1-127). */
  activeNotes: ReadonlyMap<number, number>;
  /** Sustainpedaal (CC64) ingedrukt op een input */
  sustainOn: boolean;
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

export function useMidi(): MidiState {
  const [status, setStatus] = useState<MidiStatus>("idle");
  const [outputs, setOutputs] = useState<MidiDevice[]>([]);
  const [inputs, setInputs] = useState<MidiDevice[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<ReadonlyMap<number, number>>(
    new Map()
  );
  const [sustainOn, setSustainOn] = useState(false);
  const accessRef = useRef<MIDIAccess | null>(null);
  const userPickedOutput = useRef(false);
  const supported = useMidiSupported();

  const handleMidiMessage = useCallback((e: MIDIMessageEvent) => {
    const data = e.data;
    if (!data || data.length < 3) return;
    const command = data[0] & 0xf0;
    const note = data[1];
    const value = data[2];
    if (command === NOTE_ON && value > 0) {
      setActiveNotes((prev) => new Map(prev).set(note, value));
    } else if (command === NOTE_OFF || (command === NOTE_ON && value === 0)) {
      setActiveNotes((prev) => {
        if (!prev.has(note)) return prev;
        const next = new Map(prev);
        next.delete(note);
        return next;
      });
    } else if (command === CONTROL_CHANGE && note === CC_SUSTAIN) {
      setSustainOn(value >= 64);
    }
  }, []);

  const syncPorts = useCallback(() => {
    const access = accessRef.current;
    if (!access) return;

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
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      access.onstatechange = () => syncPorts();
      syncPorts();
      setStatus("ready");
      return true;
    } catch {
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
        return false;
      }
      if (!accessRef.current && !(await connect())) return false;
      const access = accessRef.current;
      if (!access) return false;

      const output =
        (selectedOutputId && access.outputs.get(selectedOutputId)) ||
        access.outputs.values().next().value;
      if (!output) return false;

      // Volgorde volgens de MIDI Implementation: CC0 (MSB), CC32 (LSB),
      // dan Program Change; de LX708 past de bank pas toe bij de PC.
      const channel = 0; // de LX708 ontvangt het keyboard-part standaard op kanaal 1
      output.send([CONTROL_CHANGE | channel, CC_BANK_MSB, tone.midiBankMsb]);
      output.send([CONTROL_CHANGE | channel, CC_BANK_LSB, tone.midiBankLsb]);
      output.send([PROGRAM_CHANGE | channel, tone.midiProgram - 1]);
      return true;
    },
    [connect, selectedOutputId]
  );

  return {
    status: supported ? status : "unsupported",
    outputs,
    inputs,
    selectedOutputId,
    selectOutput,
    connect,
    sendTone,
    activeNotes,
    sustainOn,
  };
}

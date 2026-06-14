/**
 * Roland DT1/RQ1 SysEx voor de LX708 — ongedocumenteerde Roland-adresmap.
 *
 * Geverifieerd op een echte LX708 (2026-06-13): model-ID `00 00 00 28`,
 * device-ID `10`, RQ1-lezen + DT1-schrijven werken. Zie
 * `docs/LX708_SysEx_Adresmap.md` voor de volledige map en herkomst.
 *
 * Dit is een pure (React-vrije) laag: bytes bouwen/parsen. Het versturen
 * (Web MIDI) gebeurt in een hook die de `MIDIOutput` beheert.
 */

export const ROLAND_MANUFACTURER_ID = 0x41;
export const DEFAULT_DEVICE_ID = 0x10;
/** Gedeeld "Roland piano"-model-ID (ook FP-30/FP-30X). */
export const LX708_MODEL_ID = [0x00, 0x00, 0x00, 0x28] as const;

export const CMD_RQ1 = 0x11; // Request data (lezen)
export const CMD_DT1 = 0x12; // Data set (schrijven)

/** Roland-checksum: (128 − (som van adres+data mod 128)) mod 128. */
export function rolandChecksum(bytes: readonly number[]): number {
  let sum = 0;
  for (const b of bytes) sum = (sum + b) & 0x7f;
  return (128 - sum) & 0x7f;
}

/** Bouwt een volledig SysEx-frame inclusief F0…F7 en checksum. */
export function buildSysex(
  cmd: number,
  address: readonly number[],
  payload: readonly number[],
  deviceId: number = DEFAULT_DEVICE_ID
): number[] {
  const body = [...address, ...payload];
  return [
    0xf0,
    ROLAND_MANUFACTURER_ID,
    deviceId,
    ...LX708_MODEL_ID,
    cmd,
    ...body,
    rolandChecksum(body),
    0xf7,
  ];
}

/** DT1 (schrijven): adres + databytes. */
export const buildDT1 = (
  address: readonly number[],
  data: readonly number[],
  deviceId?: number
): number[] => buildSysex(CMD_DT1, address, data, deviceId);

/** RQ1 (lezen): adres + 4-byte lengte. */
export const buildRQ1 = (
  address: readonly number[],
  length: number,
  deviceId?: number
): number[] =>
  buildSysex(CMD_RQ1, address, [0, 0, 0, length & 0x7f], deviceId);

export interface ParsedDT1 {
  deviceId: number;
  /** 4-byte adres. */
  address: number[];
  /** databytes (zonder checksum). */
  data: number[];
}

/**
 * Parseert een binnenkomend DT1-frame van de LX708. Geeft `null` als het geen
 * Roland DT1 met het juiste model-ID is.
 */
export function parseDT1(bytes: Uint8Array | number[]): ParsedDT1 | null {
  const d = Array.from(bytes);
  if (d.length < 14) return null;
  if (d[0] !== 0xf0 || d[1] !== ROLAND_MANUFACTURER_ID) return null;
  const model = d.slice(3, 7);
  if (!model.every((b, i) => b === LX708_MODEL_ID[i])) return null;
  if (d[7] !== CMD_DT1) return null;
  return {
    deviceId: d[2],
    address: d.slice(8, 12),
    data: d.slice(12, d.length - 2), // laatste byte vóór F7 = checksum
  };
}

/** Bekende adressen (4 bytes). Afgeleid van de FP-30X, `01 00 02`-blok bevestigd op LX708. */
export const ADDR = {
  // Handshake — vereist vóór DT1-schrijven (enable remote control + notificaties)
  enableRemote: [0x01, 0x00, 0x03, 0x06],
  enableNotify: [0x01, 0x00, 0x03, 0x00],

  // Keyboard / zones (01 00 02 xx) — geverifieerd op LX708
  keyboardMode: [0x01, 0x00, 0x02, 0x00], // 0=single 1=split 2=dual 3=twin
  splitPoint: [0x01, 0x00, 0x02, 0x01], // MIDI-notenummer
  splitOctaveShift: [0x01, 0x00, 0x02, 0x02], // value−64
  splitBalance: [0x01, 0x00, 0x02, 0x03],
  dualOctaveShift: [0x01, 0x00, 0x02, 0x04], // value−64
  dualBalance: [0x01, 0x00, 0x02, 0x05],
  twinPianoMode: [0x01, 0x00, 0x02, 0x06],
  toneRight: [0x01, 0x00, 0x02, 0x07], // tone 1 / single / split-rechts — [cat,hi,lo]
  toneSplitLeft: [0x01, 0x00, 0x02, 0x0a], // [cat,hi,lo]
  toneDual2: [0x01, 0x00, 0x02, 0x0d], // tone 2 (dual-laag) — [cat,hi,lo]
  songNumber: [0x01, 0x00, 0x02, 0x10],
  masterVolume: [0x01, 0x00, 0x02, 0x13], // 0–100
  splitRightOctave: [0x01, 0x00, 0x02, 0x16], // value−64
  dualTone1Octave: [0x01, 0x00, 0x02, 0x17], // value−64
  masterTuning: [0x01, 0x00, 0x02, 0x18], // 2 bytes
  ambience: [0x01, 0x00, 0x02, 0x1a],
  headphones3D: [0x01, 0x00, 0x02, 0x1b],
  brilliance: [0x01, 0x00, 0x02, 0x1c], // value−64
  metronomeBeat: [0x01, 0x00, 0x02, 0x1f],
  metronomePattern: [0x01, 0x00, 0x02, 0x20],
  metronomeVolume: [0x01, 0x00, 0x02, 0x21],
  metronomeTone: [0x01, 0x00, 0x02, 0x22],

  // Status (01 00 01 xx) — read-only
  sequencerStatus: [0x01, 0x00, 0x01, 0x03],
  sequencerTempo: [0x01, 0x00, 0x01, 0x08], // 2 bytes: hi*128+lo
  metronomeStatus: [0x01, 0x00, 0x01, 0x0f], // 0/1

  // Transport / metronoom (01 00 03 / 05 xx)
  sequencerTempoWrite: [0x01, 0x00, 0x03, 0x09], // 2 bytes [bpm>>7, bpm&127]
  recordStandby: [0x01, 0x00, 0x03, 0x1b], // 0=annuleer 1=standby
  metronomeSwitch: [0x01, 0x00, 0x03, 0x1a], // 0/1/2
  btnRewind: [0x01, 0x00, 0x05, 0x00],
  btnForward: [0x01, 0x00, 0x05, 0x01],
  btnReset: [0x01, 0x00, 0x05, 0x02],
  btnPlayStop: [0x01, 0x00, 0x05, 0x05],
  btnMetronomeToggle: [0x01, 0x00, 0x05, 0x09],
} as const;

export const KeyboardMode = { single: 0, split: 1, dual: 2, twin: 3 } as const;
export type KeyboardModeName = keyof typeof KeyboardMode;

/** Tone-categorie = paneel-bankknop, komt overeen met `tones_seed.json`. */
export const ToneCategory: Record<string, number> = {
  Piano: 0,
  "E. Piano": 1,
  Strings: 2,
  Other: 3,
};

/**
 * Codeert een tone-zone als `[categorie, numHi, numLo]` (num = numHi×128+numLo).
 * `num` is de 0-based positie binnen de categorie in paneel-bladervolgorde.
 */
export function encodeTone(category: number, num: number): number[] {
  return [category & 0x7f, (num >> 7) & 0x7f, num & 0x7f];
}

/** Tempo (10–500 bpm) als 2 bytes voor sequencerTempoWrite. */
export const encodeTempo = (bpm: number): number[] => [
  (bpm >> 7) & 0x7f,
  bpm & 0x7f,
];

/**
 * Vertaalt een catalogus-tone naar `[categorie, numHi, numLo]`.
 * Geverifieerd op de LX708: `num = toneNumber − 1` binnen de categorie
 * (categorieën Piano/E.Piano/Strings/Other lopen 1..N door). Geeft `null`
 * als de categorie onbekend is.
 */
export function toneToZoneBytes(
  category: string,
  toneNumber: number
): number[] | null {
  const cat = ToneCategory[category];
  if (cat === undefined) return null;
  return encodeTone(cat, toneNumber - 1);
}

// Note names → MIDI / Hz. Scientific pitch notation: "C4" = MIDI 60, "A4" = 440 Hz.

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToMidi(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!m) throw new Error(`Invalid note "${note}"`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + PITCH_CLASS[m[1]] + accidental;
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Scale note names (one octave, from the tonic) → strictly ascending MIDI starting at `octave`. */
export function scaleMidi(scale: readonly string[], octave: number): number[] {
  const out: number[] = [];
  for (const name of scale) {
    let m = noteToMidi(`${name}${octave}`);
    while (out.length && m <= out[out.length - 1]) m += 12;
    out.push(m);
  }
  return out;
}

/** Merge pitch: 4 → tonic, 8 → 2nd degree, … one octave up each time the scale runs out. */
export function mergeMidi(scale: readonly number[], value: number, max = 96): number {
  const deg = Math.max(0, Math.round(Math.log2(value)) - 2);
  const n = scale.length;
  return Math.min(max, scale[deg % n] + 12 * Math.floor(deg / n));
}

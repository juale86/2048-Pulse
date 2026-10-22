import { describe, expect, it } from 'vitest';
import { STAGES } from '../stages';
import { mergeMidi, midiToHz, noteToMidi, scaleMidi } from './notes';

describe('notes', () => {
  it('parses scientific pitch notation with accidentals', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('Bb1')).toBe(34);
    expect(noteToMidi('F#3')).toBe(54);
    expect(() => noteToMidi('H2')).toThrow();
  });

  it('converts MIDI to Hz', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(57)).toBeCloseTo(220);
  });

  it('builds strictly ascending scales across the octave break', () => {
    expect(scaleMidi(['A', 'Bb', 'C#', 'D'], 4)).toEqual([69, 70, 73, 74]);
    expect(scaleMidi(['G', 'A', 'B', 'D', 'E'], 4)).toEqual([67, 69, 71, 74, 76]);
  });

  it('raises merge pitch with the tile value and wraps into the next octave', () => {
    const s = scaleMidi(['C', 'D', 'E', 'F', 'G', 'A', 'B'], 4);
    expect(mergeMidi(s, 4)).toBe(60);
    expect(mergeMidi(s, 8)).toBe(62);
    expect(mergeMidi(s, 512)).toBe(72);
    expect(mergeMidi(s, 2 ** 30)).toBe(96);
  });

  it('every stage note parses', () => {
    for (const st of STAGES) {
      for (const loop of st.loops) {
        for (const c of loop.chords) [...c.notes, c.root].forEach((n) => expect(() => noteToMidi(n)).not.toThrow());
        for (const tok of loop.melody.trim().split(/\s+/)) {
          const note = tok.split(':')[0];
          if (note !== '-') expect(() => noteToMidi(note)).not.toThrow();
        }
        expect(() => scaleMidi(loop.scale, 4)).not.toThrow();
      }
    }
  });
});

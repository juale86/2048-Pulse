import { describe, expect, it } from 'vitest';
import { STAGE_START_TILES } from '../core/constants';
import { STAGES, stageBpm, stagePalette, stageTranspose } from './index';
import { LOOP_BARS, STEPS_PER_LOOP, melodySteps, validateStage } from './schema';

describe('stage registry', () => {
  it('has the 6 stages in milestone order', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['abismo', 'dunas', 'neon', 'luciernagas', 'tormenta', 'cosmos']);
    expect(STAGES.map((s) => s.fromTile)).toEqual([...STAGE_START_TILES]);
  });

  it('every stage has 3 four-bar loops with a full-length melody', () => {
    for (const s of STAGES) {
      expect(s.loops).toHaveLength(3);
      for (const loop of s.loops) {
        expect(loop.chords.reduce((n, c) => n + c.bars, 0)).toBe(LOOP_BARS);
        expect(melodySteps(loop.melody)).toBe(STEPS_PER_LOOP);
      }
    }
  });

  it('Abismo starts at 90 BPM and each section adds 6', () => {
    expect(stageBpm({ index: 0, lap: 0 })).toBe(90);
    expect(stageBpm({ index: 0, lap: 0 }, 1)).toBe(96);
    expect(stageBpm({ index: 0, lap: 0 }, 2)).toBe(102);
  });

  it('remix laps raise BPM by 10% each, capped at +30%', () => {
    expect(stageBpm({ index: 0, lap: 1 })).toBe(99);
    expect(stageBpm({ index: 0, lap: 5 })).toBe(stageBpm({ index: 0, lap: 3 }));
  });

  it('remix laps transpose by 2 semitones each, capped at 3 laps', () => {
    expect(stageTranspose({ index: 0, lap: 0 })).toBe(0);
    expect(stageTranspose({ index: 0, lap: 1 })).toBe(2);
    expect(stageTranspose({ index: 0, lap: 9 })).toBe(6);
  });

  it('rejects melodies that do not fill the loop', () => {
    const bad = structuredClone(STAGES[0]);
    bad.loops[0].melody = 'D4:4 E4:4';
    expect(() => validateStage(bad)).toThrow(/melody/);
    bad.loops[0].melody = 'H4:64';
    expect(() => validateStage(bad)).toThrow(/melody/);
  });

  it('rejects malformed step patterns and missing default layers', () => {
    const bad = structuredClone(STAGES[0]);
    bad.layers.bass = { ...bad.layers.bass!, steps: 'x...x' };
    expect(() => validateStage(bad)).toThrow(/bass/);
    const missing = structuredClone(STAGES[0]);
    delete missing.layers.perc;
    expect(() => validateStage(missing)).toThrow(/perc/);
  });

  it('remix laps shift the palette', () => {
    expect(stagePalette({ index: 2, lap: 0 })).toEqual(STAGES[2].palette);
    expect(stagePalette({ index: 2, lap: 1 })).not.toEqual(STAGES[2].palette);
  });
});

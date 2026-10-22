import { describe, expect, it } from 'vitest';
import { createRng, nextFloat } from './rng';

describe('rng', () => {
  it('is deterministic and in [0, 1)', () => {
    const run = () => {
      let r = createRng(42);
      const out: number[] = [];
      for (let i = 0; i < 100; i++) {
        const [v, n] = nextFloat(r);
        out.push(v);
        r = n;
      }
      return out;
    };
    const a = run();
    expect(a).toEqual(run());
    expect(a.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('does not mutate the input state', () => {
    const r = createRng(7);
    nextFloat(r);
    expect(r.s).toBe(7);
  });
});

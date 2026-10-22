// Seeded PRNG (mulberry32). Pure; state is a single serializable uint32. See docs/03-arquitectura.md §4.
export interface RngState {
  s: number;
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

/** Returns a float in [0, 1) and the next state. Does not mutate the input. */
export function nextFloat(rng: RngState): [number, RngState] {
  const s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, { s }];
}

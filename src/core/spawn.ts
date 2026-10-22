// Random tile spawn (2 at 90%, 4 at 10%) on an empty cell. Pure. See docs/01-gdd.md §3.
import { emptyCells } from './board';
import { SPAWN_FOUR_CHANCE } from './constants';
import { nextFloat, type RngState } from './rng';
import type { Tile } from './types';

export function spawnTile(
  tiles: readonly Tile[],
  size: number,
  rng: RngState,
  id: number,
): { tile: Tile; rng: RngState } | null {
  const empty = emptyCells(tiles, size);
  if (empty.length === 0) return null;
  const [r1, rng1] = nextFloat(rng);
  const [r2, rng2] = nextFloat(rng1);
  const cell = empty[Math.floor(r1 * empty.length)];
  const value = r2 < SPAWN_FOUR_CHANCE ? 4 : 2;
  return { tile: { id, value, row: cell.row, col: cell.col }, rng: rng2 };
}

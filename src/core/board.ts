// Board queries. Pure. See docs/03-arquitectura.md §4.
import type { Cell, Tile } from './types';

/** size×size grid of tiles (or null), indexed [row][col]. */
export function toGrid(tiles: readonly Tile[], size: number): (Tile | null)[][] {
  const grid: (Tile | null)[][] = Array.from({ length: size }, () => Array<Tile | null>(size).fill(null));
  for (const t of tiles) grid[t.row][t.col] = t;
  return grid;
}

/** Empty cells in row-major order (deterministic for spawning). */
export function emptyCells(tiles: readonly Tile[], size: number): Cell[] {
  const grid = toGrid(tiles, size);
  const out: Cell[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) out.push({ row, col });
    }
  }
  return out;
}

/** True if there is an empty cell or two equal orthogonal neighbours. */
export function hasMoves(tiles: readonly Tile[], size: number): boolean {
  if (tiles.length < size * size) return true;
  const grid = toGrid(tiles, size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const v = grid[row][col]!.value;
      if (col + 1 < size && grid[row][col + 1]!.value === v) return true;
      if (row + 1 < size && grid[row + 1][col]!.value === v) return true;
    }
  }
  return false;
}

export function maxValue(tiles: readonly Tile[]): number {
  let m = 0;
  for (const t of tiles) if (t.value > m) m = t.value;
  return m;
}

/** Second largest value counting duplicates: [256, 256, 8] → 256; [256, 64] → 64. */
export function secondMaxValue(tiles: readonly Tile[]): number {
  let first = 0;
  let second = 0;
  for (const t of tiles) {
    if (t.value >= first) {
      second = first;
      first = t.value;
    } else if (t.value > second) {
      second = t.value;
    }
  }
  return second;
}

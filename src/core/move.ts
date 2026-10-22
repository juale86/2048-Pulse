// Slide + merge with per-id tracing for animation. Pure. See docs/01-gdd.md §3.
import { toGrid } from './board';
import type { Cell, Direction, Tile, TileMove } from './types';

export interface Merge {
  into: Cell;
  value: number;
  consumedIds: [number, number];
  newId: number;
}

export interface SlideResult {
  tiles: Tile[];
  moves: TileMove[];
  merges: Merge[];
  nextTileId: number;
  changed: boolean;
}

/** Cells of line `i`, ordered from the destination edge inward. */
function lineCells(dir: Direction, i: number, size: number): Cell[] {
  const cells: Cell[] = [];
  for (let k = 0; k < size; k++) {
    switch (dir) {
      case 'left': cells.push({ row: i, col: k }); break;
      case 'right': cells.push({ row: i, col: size - 1 - k }); break;
      case 'up': cells.push({ row: k, col: i }); break;
      case 'down': cells.push({ row: size - 1 - k, col: i }); break;
    }
  }
  return cells;
}

export function slide(tiles: readonly Tile[], size: number, dir: Direction, nextTileId: number): SlideResult {
  const grid = toGrid(tiles, size);
  const out: Tile[] = [];
  const moves: TileMove[] = [];
  const merges: Merge[] = [];
  let nextId = nextTileId;

  for (let i = 0; i < size; i++) {
    const cells = lineCells(dir, i, size);
    // Last placed tile in this line, if it can still merge.
    let open: { tile: Tile; slot: number } | null = null;
    let slot = 0;
    for (const c of cells) {
      const t = grid[c.row][c.col];
      if (!t) continue;
      if (open && open.tile.value === t.value) {
        const into = cells[open.slot];
        moves.push({ id: t.id, from: { row: t.row, col: t.col }, to: into });
        const merged: Tile = { id: nextId++, value: t.value * 2, row: into.row, col: into.col };
        out[out.indexOf(open.tile)] = merged;
        merges.push({ into, value: merged.value, consumedIds: [open.tile.id, t.id], newId: merged.id });
        open = null;
      } else {
        const to = cells[slot];
        moves.push({ id: t.id, from: { row: t.row, col: t.col }, to });
        const placed: Tile = { ...t, row: to.row, col: to.col };
        out.push(placed);
        open = { tile: placed, slot };
        slot++;
      }
    }
  }

  const changed = merges.length > 0 || moves.some((m) => m.from.row !== m.to.row || m.from.col !== m.to.col);
  return { tiles: out, moves, merges, nextTileId: nextId, changed };
}

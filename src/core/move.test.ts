import { describe, expect, it } from 'vitest';
import { slide } from './move';
import type { Direction, Tile } from './types';

/** Builds tiles from a row-major matrix (0 = empty). Ids are 1-based in reading order. */
function fromRows(rows: number[][]): Tile[] {
  const tiles: Tile[] = [];
  let id = 1;
  rows.forEach((r, row) => r.forEach((value, col) => value && tiles.push({ id: id++, value, row, col })));
  return tiles;
}

function toRows(tiles: Tile[], size = 4): number[][] {
  const rows = Array.from({ length: size }, () => Array(size).fill(0));
  for (const t of tiles) rows[t.row][t.col] = t.value;
  return rows;
}

function slideRows(rows: number[][], dir: Direction) {
  const r = slide(fromRows(rows), 4, dir, 100);
  return { ...r, rows: toRows(r.tiles) };
}

describe('slide', () => {
  it.each([
    [[2, 2, 2, 2], [4, 4, 0, 0]],
    [[2, 2, 2, 0], [4, 2, 0, 0]],
    [[4, 4, 8, 8], [8, 16, 0, 0]],
    [[2, 0, 2, 4], [4, 4, 0, 0]],
    [[0, 0, 0, 2], [2, 0, 0, 0]],
    [[2, 4, 8, 16], [2, 4, 8, 16]],
    [[4, 2, 2, 0], [4, 4, 0, 0]],
  ])('left: %j → %j', (line, expected) => {
    const { rows } = slideRows([line, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left');
    expect(rows[0]).toEqual(expected);
  });

  it('merges each tile at most once per move', () => {
    const { rows, merges } = slideRows([[4, 4, 8, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left');
    expect(rows[0]).toEqual([8, 8, 0, 0]);
    expect(merges).toHaveLength(1);
  });

  it('handles all four directions', () => {
    const board = [
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 0],
    ];
    expect(slideRows(board, 'right').rows).toEqual([
      [0, 0, 0, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 2],
    ]);
    expect(slideRows(board, 'up').rows).toEqual([
      [4, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(slideRows(board, 'down').rows).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 2],
    ]);
  });

  it('traces moves and merges by id', () => {
    const r = slideRows([[2, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left');
    expect(r.merges).toEqual([{ into: { row: 0, col: 0 }, value: 4, consumedIds: [1, 2], newId: 100 }]);
    expect(r.moves).toContainEqual({ id: 2, from: { row: 0, col: 2 }, to: { row: 0, col: 0 } });
    expect(r.nextTileId).toBe(101);
    expect(r.tiles).toEqual([{ id: 100, value: 4, row: 0, col: 0 }]);
  });

  it('reports no change when nothing can move', () => {
    const r = slideRows([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left');
    expect(r.changed).toBe(false);
  });
});

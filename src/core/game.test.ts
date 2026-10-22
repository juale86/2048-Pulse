import { describe, expect, it } from 'vitest';
import { hasMoves, secondMaxValue } from './board';
import { applyMove, newGame } from './game';
import { createRng } from './rng';
import { multiplier, par, recordBonus } from './scoring';
import { spawnTile } from './spawn';
import { nextMilestone, sectionFor, stageForRecord } from './stages';
import type { Direction, GameState, Tile } from './types';

function fromRows(rows: number[][]): Tile[] {
  const tiles: Tile[] = [];
  let id = 1;
  rows.forEach((r, row) => r.forEach((value, col) => value && tiles.push({ id: id++, value, row, col })));
  return tiles;
}

function stateWith(rows: number[][], extra: Partial<GameState> = {}): GameState {
  const tiles = fromRows(rows);
  const base = newGame(1);
  return { ...base, tiles, nextTileId: tiles.length + 1, ...extra };
}

const DIRS: Direction[] = ['up', 'right', 'down', 'left'];

describe('newGame', () => {
  it('starts with two tiles of value 2 or 4', () => {
    const g = newGame(123);
    expect(g.tiles).toHaveLength(2);
    expect(g.tiles.every((t) => t.value === 2 || t.value === 4)).toBe(true);
    expect(g.score).toBe(0);
  });
});

describe('applyMove', () => {
  it('invalid move changes nothing (no spawn, same rng, same counters)', () => {
    const s = stateWith([[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const r = applyMove(s, 'left');
    expect(r.events).toEqual([{ type: 'Invalid', dir: 'left' }]);
    expect(r.state).toBe(s);
  });

  it('valid move spawns one tile and adds merge value to score', () => {
    const s = stateWith([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const r = applyMove(s, 'left');
    expect(r.state.tiles).toHaveLength(2);
    expect(r.state.score).toBe(4);
    expect(r.state.totalMoves).toBe(1);
    expect(r.events.map((e) => e.type)).toEqual(['Moved', 'Merged', 'ScoreAdded', 'Spawned']);
  });

  it('is deterministic for the same seed and moves', () => {
    const play = () => {
      let s = newGame(2024);
      for (let i = 0; i < 200; i++) s = applyMove(s, DIRS[i % 4]).state;
      return s;
    };
    expect(play()).toEqual(play());
  });

  it('awards the record bonus once a record ≥ 64 appears', () => {
    const s = stateWith([[32, 32, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], {
      recordTile: 32,
      movesSinceRecord: 9,
    });
    const r = applyMove(s, 'left');
    const rec = r.events.find((e) => e.type === 'NewRecord');
    expect(rec).toMatchObject({ type: 'NewRecord', value: 64, moves: 10, mult: 3, bonus: 192 });
    expect(r.state.score).toBe(64 + 192);
    expect(r.state.movesSinceRecord).toBe(0);
    expect(r.state.recordTile).toBe(64);
  });

  it('changes stage at 128 and emits StageChanged', () => {
    const s = stateWith([[64, 64, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], { recordTile: 64 });
    const r = applyMove(s, 'left');
    expect(r.state.stage).toEqual({ index: 1, lap: 0 });
    expect(r.events).toContainEqual({ type: 'StageChanged', from: { index: 0, lap: 0 }, to: { index: 1, lap: 0 } });
  });

  it('detects game over', () => {
    // Moving right leaves only (0,0) empty; whatever spawns there (2 or 4) cannot merge.
    const s = stateWith([
      [8, 16, 32, 0],
      [64, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    const r = applyMove(s, 'right');
    expect(r.state.tiles).toHaveLength(16);
    expect(r.state.over).toBe(true);
    expect(r.events.at(-1)).toMatchObject({ type: 'GameOver' });
    expect(applyMove(r.state, 'left').events).toEqual([]);
  });

  it('serializes losslessly to JSON', () => {
    let s = newGame(77);
    for (let i = 0; i < 30; i++) s = applyMove(s, DIRS[(i * 3) % 4]).state;
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('hasMoves', () => {
  it('is false on a full board with no equal neighbours', () => {
    const tiles = fromRows([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(hasMoves(tiles, 4)).toBe(false);
  });

  it('is true on a full board with a possible merge', () => {
    const tiles = fromRows([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 4],
    ]);
    expect(hasMoves(tiles, 4)).toBe(true);
  });
});

describe('spawn', () => {
  it('spawns ~90% twos and only on empty cells', () => {
    let rng = createRng(9);
    let fours = 0;
    const N = 5000;
    const tiles = fromRows([[2, 2, 2, 0], [2, 2, 2, 2], [2, 2, 2, 2], [2, 2, 2, 2]]);
    for (let i = 0; i < N; i++) {
      const s = spawnTile(tiles, 4, rng, 99)!;
      expect(s.tile).toMatchObject({ row: 0, col: 3 });
      if (s.tile.value === 4) fours++;
      rng = s.rng;
    }
    expect(fours / N).toBeGreaterThan(0.08);
    expect(fours / N).toBeLessThan(0.12);
  });
});

describe('scoring', () => {
  it('computes par', () => {
    expect(par(256)).toBe(59);
  });

  it('multiplier is 3 at par, 1 at 2·par, linear between', () => {
    expect(multiplier(50, 88)).toBe(3); // multiplier() is independent of PAR_FACTOR
    expect(multiplier(88, 88)).toBe(3);
    expect(multiplier(176, 88)).toBe(1);
    expect(multiplier(300, 88)).toBe(1);
    expect(multiplier(132, 88)).toBe(2);
  });

  it('bonus is an integer', () => {
    expect(Number.isInteger(recordBonus(256, 101).bonus)).toBe(true);
  });
});

describe('stages', () => {
  it.each([
    [64, 0, 0],
    [128, 1, 0],
    [256, 2, 0],
    [512, 3, 0],
    [1024, 4, 0],
    [2048, 5, 0],
    [4096, 0, 1],
    [8192, 1, 1],
    [4096 * 64, 0, 2],
  ])('record %i → stage %i lap %i', (record, index, lap) => {
    expect(stageForRecord(record)).toEqual({ index, lap });
  });

  it('next milestone wraps into the remix lap', () => {
    expect(nextMilestone({ index: 5, lap: 0 })).toBe(4096);
    expect(nextMilestone({ index: 0, lap: 1 })).toBe(8192);
  });

  it('section follows the second-highest tile (Neón: 64 and 128)', () => {
    const neon = { index: 2, lap: 0 };
    expect(sectionFor(neon, 32)).toBe(0);
    expect(sectionFor(neon, 64)).toBe(1);
    expect(sectionFor(neon, 128)).toBe(2);
  });

  it('second max counts duplicates', () => {
    expect(secondMaxValue(fromRows([[256, 256, 8, 0]]))).toBe(256);
    expect(secondMaxValue(fromRows([[256, 64, 8, 0]]))).toBe(64);
  });
});

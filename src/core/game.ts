// Game reducer: newGame + applyMove → { state, events }. Pure. See docs/03-arquitectura.md §4.2.
import { hasMoves, maxValue, secondMaxValue } from './board';
import { BOARD_SIZE, RECORD_BONUS_MIN, START_TILES } from './constants';
import { slide } from './move';
import { createRng } from './rng';
import { recordBonus } from './scoring';
import { spawnTile } from './spawn';
import { sameStage, sectionFor, stageForRecord } from './stages';
import type { Direction, GameEvent, GameState, Tile } from './types';

export function newGame(seed: number, size = BOARD_SIZE): GameState {
  let rng = createRng(seed);
  let tiles: Tile[] = [];
  let nextTileId = 1;
  for (let i = 0; i < START_TILES; i++) {
    const s = spawnTile(tiles, size, rng, nextTileId++);
    if (!s) break;
    tiles = [...tiles, s.tile];
    rng = s.rng;
  }
  const recordTile = maxValue(tiles);
  const stage = stageForRecord(recordTile);
  return {
    size,
    tiles,
    nextTileId,
    rng,
    score: 0,
    recordTile,
    movesSinceRecord: 0,
    totalMoves: 0,
    stage,
    section: sectionFor(stage, secondMaxValue(tiles)),
    over: false,
  };
}

export function applyMove(state: GameState, dir: Direction): { state: GameState; events: GameEvent[] } {
  if (state.over) return { state, events: [] };

  const slid = slide(state.tiles, state.size, dir, state.nextTileId);
  if (!slid.changed) return { state, events: [{ type: 'Invalid', dir }] };

  const events: GameEvent[] = [{ type: 'Moved', dir, moves: slid.moves }];
  for (const m of slid.merges) events.push({ type: 'Merged', ...m });

  const base = slid.merges.reduce((sum, m) => sum + m.value, 0);
  let score = state.score + base;
  if (base > 0) events.push({ type: 'ScoreAdded', base });

  // This move counts toward the record it produces.
  let movesSinceRecord = state.movesSinceRecord + 1;
  let recordTile = state.recordTile;
  const newMax = maxValue(slid.tiles);
  if (newMax > recordTile) {
    if (newMax >= RECORD_BONUS_MIN) {
      const b = recordBonus(newMax, movesSinceRecord);
      score += b.bonus;
      events.push({ type: 'NewRecord', value: newMax, moves: movesSinceRecord, ...b });
    }
    recordTile = newMax;
    movesSinceRecord = 0;
  }

  const stage = stageForRecord(recordTile);
  if (!sameStage(stage, state.stage)) events.push({ type: 'StageChanged', from: state.stage, to: stage });
  const section = sectionFor(stage, secondMaxValue(slid.tiles));
  if (section !== state.section) events.push({ type: 'SectionChanged', section });

  let tiles = slid.tiles;
  let rng = state.rng;
  let nextTileId = slid.nextTileId;
  const s = spawnTile(tiles, state.size, rng, nextTileId);
  if (s) {
    tiles = [...tiles, s.tile];
    rng = s.rng;
    nextTileId++;
    // A spawned 4 can only out-value the record at the very start (< RECORD_BONUS_MIN): no bonus, no event.
    if (s.tile.value > recordTile) recordTile = s.tile.value;
    events.push({ type: 'Spawned', tile: s.tile });
  }

  const over = !hasMoves(tiles, state.size);
  if (over) events.push({ type: 'GameOver', score, recordTile });

  return {
    state: {
      ...state,
      tiles,
      nextTileId,
      rng,
      score,
      recordTile,
      movesSinceRecord,
      totalMoves: state.totalMoves + 1,
      stage,
      section,
      over,
    },
    events,
  };
}

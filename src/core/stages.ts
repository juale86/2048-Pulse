// Stage from record tile, remix laps, section from second-highest tile. Pure. See docs/01-gdd.md §5.
import { REMIX_START_TILE, SECTION_THRESHOLDS, STAGE_START_TILES } from './constants';
import type { Section, StageRef } from './types';

const STAGE_COUNT = STAGE_START_TILES.length;

export function stageForRecord(record: number): StageRef {
  if (record < REMIX_START_TILE) {
    let index = 0;
    for (let i = 0; i < STAGE_COUNT; i++) if (record >= STAGE_START_TILES[i]) index = i;
    return { index, lap: 0 };
  }
  const k = Math.floor(Math.log2(record / REMIX_START_TILE));
  return { index: k % STAGE_COUNT, lap: 1 + Math.floor(k / STAGE_COUNT) };
}

/** First tile value of a stage. */
export function stageStartTile(ref: StageRef): number {
  if (ref.lap === 0) return STAGE_START_TILES[ref.index];
  return REMIX_START_TILE * 2 ** ((ref.lap - 1) * STAGE_COUNT + ref.index);
}

/** Tile value that triggers the stage after `ref` (M in the docs). */
export function nextMilestone(ref: StageRef): number {
  const next = ref.index + 1 < STAGE_COUNT ? { index: ref.index + 1, lap: ref.lap } : { index: 0, lap: ref.lap + 1 };
  return stageStartTile(next);
}

export function sectionFor(ref: StageRef, secondMax: number): Section {
  const m = nextMilestone(ref);
  if (secondMax >= m * SECTION_THRESHOLDS[1]) return 2;
  if (secondMax >= m * SECTION_THRESHOLDS[0]) return 1;
  return 0;
}

export function sameStage(a: StageRef, b: StageRef): boolean {
  return a.index === b.index && a.lap === b.lap;
}

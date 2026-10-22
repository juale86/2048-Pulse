import { Color } from 'three';
import type { StageRef } from '../core/types';
import abismo from './abismo.json';
import cosmos from './cosmos.json';
import dunas from './dunas.json';
import luciernagas from './luciernagas.json';
import neon from './neon.json';
import { validateStage, type StageDef } from './schema';
import tormenta from './tormenta.json';

// Stage registry + remix variations. See docs/01-gdd.md §5.1.

export const STAGES: readonly StageDef[] = [abismo, dunas, neon, luciernagas, tormenta, cosmos].map(validateStage);

/** +10% BPM per remix lap, capped at +30%. */
const REMIX_BPM_STEP = 0.1;
const REMIX_MAX_LAPS = 3;
/** Semitones of transposition per remix lap, capped like the BPM. */
const REMIX_SEMITONES = 2;
/** Hue shift per remix lap (fraction of the color wheel). */
const REMIX_HUE_STEP = 0.11;

export function stageDef(ref: StageRef): StageDef {
  return STAGES[ref.index];
}

/** BPM added by each section within a stage. */
const SECTION_BPM_STEP = 6;

export function stageBpm(ref: StageRef, section = 0): number {
  const base = stageDef(ref).bpm + SECTION_BPM_STEP * section;
  return Math.round(base * (1 + REMIX_BPM_STEP * Math.min(ref.lap, REMIX_MAX_LAPS)));
}

export function stageTranspose(ref: StageRef): number {
  return REMIX_SEMITONES * Math.min(ref.lap, REMIX_MAX_LAPS);
}

export function stagePalette(ref: StageRef): [string, string, string] {
  const p = stageDef(ref).palette;
  if (ref.lap === 0) return p;
  const shift = REMIX_HUE_STEP * ref.lap;
  return p.map((c) => `#${new Color(c).offsetHSL(shift, 0, 0).getHexString()}`) as [string, string, string];
}

// Core types. See docs/03-arquitectura.md §4.1.
import type { RngState } from './rng';

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Row 0 is the top row, col 0 the left column. */
export interface Cell {
  row: number;
  col: number;
}

export interface Tile extends Cell {
  id: number;
  value: number;
}

/** index: 0..5 (Abismo..Cosmos); lap: 0 for the first pass, 1+ for remixes. */
export interface StageRef {
  index: number;
  lap: number;
}

export type Section = 0 | 1 | 2;

export interface GameState {
  size: number;
  tiles: Tile[];
  nextTileId: number;
  rng: RngState;
  score: number;
  recordTile: number;
  movesSinceRecord: number;
  totalMoves: number;
  stage: StageRef;
  section: Section;
  over: boolean;
}

export interface TileMove {
  id: number;
  from: Cell;
  to: Cell;
}

export type GameEvent =
  | { type: 'Moved'; dir: Direction; moves: TileMove[] }
  | { type: 'Merged'; into: Cell; value: number; consumedIds: [number, number]; newId: number }
  | { type: 'Spawned'; tile: Tile }
  | { type: 'Invalid'; dir: Direction }
  | { type: 'ScoreAdded'; base: number }
  | { type: 'NewRecord'; value: number; moves: number; par: number; mult: number; bonus: number }
  | { type: 'StageChanged'; from: StageRef; to: StageRef }
  | { type: 'SectionChanged'; section: Section }
  | { type: 'GameOver'; score: number; recordTile: number };

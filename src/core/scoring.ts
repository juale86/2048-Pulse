// Record bonus measured in moves, not time. See docs/01-gdd.md §4.2.
import { AVG_SPAWN_VALUE, MULT_MAX, MULT_MIN, PAR_FACTOR } from './constants';

/** Par in valid moves to reach record `tile` starting from record tile/2. */
export function par(tile: number): number {
  return Math.ceil((tile / 2 / AVG_SPAWN_VALUE) * PAR_FACTOR);
}

/** MULT_MAX at or under par, MULT_MIN at 2·par or more, linear in between. */
export function multiplier(moves: number, parMoves: number): number {
  if (moves <= parMoves) return MULT_MAX;
  if (moves >= 2 * parMoves) return MULT_MIN;
  return MULT_MAX - ((MULT_MAX - MULT_MIN) * (moves - parMoves)) / parMoves;
}

export function recordBonus(tile: number, moves: number): { par: number; mult: number; bonus: number } {
  const p = par(tile);
  const mult = multiplier(moves, p);
  return { par: p, mult, bonus: Math.round(tile * mult) };
}

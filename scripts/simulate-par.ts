// Calibrates the record-bonus par (docs/01-gdd.md §4.2) with a heuristic bot.
// Usage: npx vite-node scripts/simulate-par.ts [games=200]
import { emptyCells, toGrid } from '../src/core/board';
import { applyMove, newGame } from '../src/core/game';
import { slide } from '../src/core/move';
import { multiplier, par } from '../src/core/scoring';
import type { Direction, GameState, Tile } from '../src/core/types';

const DIRS: Direction[] = ['up', 'left', 'right', 'down'];
const GAMES = Number(process.argv[2] ?? 200);

/** Board heuristic: empty cells, monotonic rows/cols, biggest tile in a corner. */
function score(tiles: Tile[], size: number): number {
  const grid = toGrid(tiles, size).map((r) => r.map((t) => (t ? Math.log2(t.value) : 0)));
  let mono = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j + 1 < size; j++) {
      mono -= Math.max(0, grid[i][j + 1] - grid[i][j]); // rows decreasing to the right
      mono -= Math.max(0, grid[j + 1][i] - grid[j][i]); // cols decreasing downward
    }
  }
  const max = Math.max(...grid.flat());
  return emptyCells(tiles, size).length * 2.7 + mono * 1.0 + (grid[0][0] === max ? max * 1.5 : 0);
}

function chooseMove(s: GameState): Direction | null {
  let best: Direction | null = null;
  let bestScore = -Infinity;
  for (const d of DIRS) {
    const r = slide(s.tiles, s.size, d, s.nextTileId);
    if (!r.changed) continue;
    const v = score(r.tiles, s.size);
    if (v > bestScore) {
      bestScore = v;
      best = d;
    }
  }
  return best;
}

const samples = new Map<number, number[]>();
let maxTiles: number[] = [];
for (let g = 0; g < GAMES; g++) {
  let s = newGame(1000 + g);
  for (;;) {
    const d = chooseMove(s);
    if (!d) break;
    const { state, events } = applyMove(s, d);
    for (const e of events) if (e.type === 'NewRecord') (samples.get(e.value) ?? samples.set(e.value, []).get(e.value)!).push(e.moves);
    s = state;
    if (s.over) break;
  }
  maxTiles.push(s.recordTile);
}

const q = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
console.log(`Games: ${GAMES} · median max tile: ${q(maxTiles.sort((a, b) => a - b), 0.5)}`);
console.log('tile   n     p25   median  p75   par   mult@median');
for (const [tile, xs] of [...samples].sort((a, b) => a[0] - b[0])) {
  xs.sort((a, b) => a - b);
  const p = par(tile);
  const med = q(xs, 0.5);
  console.log(
    `${String(tile).padEnd(6)} ${String(xs.length).padEnd(5)} ${String(q(xs, 0.25)).padEnd(5)} ${String(med).padEnd(7)} ${String(q(xs, 0.75)).padEnd(5)} ${String(p).padEnd(5)} ${multiplier(med, p).toFixed(2)}`,
  );
}

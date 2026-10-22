import type { Direction } from '../core/types';

// Single entry point for directions from every input source. Ignores input while paused.
// Fast input never waits: the handler completes running animations before applying the move,
// so no buffering beyond the current call is needed. See docs/01-gdd.md §7.
export class InputQueue {
  paused = false;

  constructor(private readonly handler: (dir: Direction) => void) {}

  push = (dir: Direction): void => {
    if (!this.paused) this.handler(dir);
  };
}

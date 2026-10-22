import type { Direction } from '../core/types';

// Arrows + WASD (by physical key, so it works on any layout). See docs/01-gdd.md §7.
const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

/** Keys whose default (page scroll) we block. Never Escape. */
const BLOCK_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export class Keyboard {
  constructor(
    private readonly onDirection: (dir: Direction) => void,
    private readonly onConfirm: () => void,
  ) {
    window.addEventListener('keydown', this.handle);
  }

  private handle = (e: KeyboardEvent): void => {
    if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = DIRECTIONS[e.code];
    if (dir) this.onDirection(dir);
    else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') this.onConfirm();
  };

  dispose(): void {
    window.removeEventListener('keydown', this.handle);
  }
}

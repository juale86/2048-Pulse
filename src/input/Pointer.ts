import type { Direction } from '../core/types';

// Touch swipe + mouse drag via Pointer Events. See docs/01-gdd.md §7.
const MAX_THRESHOLD_PX = 30;
const BOARD_FRACTION = 0.06;
const DOMINANCE = 1.5;

export class Pointer {
  private active: { id: number; x: number; y: number; fired: boolean } | null = null;

  constructor(
    private readonly target: HTMLElement,
    private readonly onDirection: (dir: Direction) => void,
    private readonly boardPixels: () => number,
  ) {
    target.addEventListener('pointerdown', this.down);
    target.addEventListener('pointermove', this.move);
    target.addEventListener('pointerup', this.end);
    target.addEventListener('pointercancel', this.end);
  }

  private down = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.active) return;
    this.active = { id: e.pointerId, x: e.clientX, y: e.clientY, fired: false };
    this.target.setPointerCapture(e.pointerId);
  };

  /** Fires as soon as the gesture is unambiguous, once per gesture. */
  private move = (e: PointerEvent): void => {
    const a = this.active;
    if (!a || a.fired || e.pointerId !== a.id) return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const threshold = Math.min(MAX_THRESHOLD_PX, this.boardPixels() * BOARD_FRACTION);
    if (Math.max(ax, ay) < threshold) return;
    if (ax >= ay * DOMINANCE) {
      a.fired = true;
      this.onDirection(dx > 0 ? 'right' : 'left');
    } else if (ay >= ax * DOMINANCE) {
      a.fired = true;
      this.onDirection(dy > 0 ? 'down' : 'up');
    }
  };

  private end = (e: PointerEvent): void => {
    if (this.active?.id === e.pointerId) this.active = null;
  };

  dispose(): void {
    this.target.removeEventListener('pointerdown', this.down);
    this.target.removeEventListener('pointermove', this.move);
    this.target.removeEventListener('pointerup', this.end);
    this.target.removeEventListener('pointercancel', this.end);
  }
}

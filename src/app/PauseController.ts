import type { PlayablesSdk } from '../platform/PlayablesSdk';

// The only place that reacts to platform pause/resume. Never uses visibilitychange.
// See docs/03-arquitectura.md §10.
export interface Pausable {
  pause(): void;
  resume(): void;
}

export class PauseController {
  private readonly parts: Pausable[] = [];
  paused = false;

  constructor(sdk: PlayablesSdk) {
    sdk.onPause(() => this.set(true));
    sdk.onResume(() => this.set(false));
  }

  add(part: Pausable): void {
    this.parts.push(part);
  }

  private set(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    for (const p of this.parts) {
      if (paused) p.pause();
      else p.resume();
    }
  }
}

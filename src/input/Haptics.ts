// Vibration with an on/off switch (Playables MUST). No-op where unsupported. See docs/01-gdd.md §7.
export class Haptics {
  enabled = true;

  /** ~15 ms on merges, ~60 ms on records and stage changes. */
  pulse(ms: number): void {
    if (!this.enabled || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(ms);
  }
}

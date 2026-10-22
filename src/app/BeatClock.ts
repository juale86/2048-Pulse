// The single musical timeline: tempo, quantization and callbacks at beat times. Time only
// advances in update(), called from the render loop (by audio time while audio runs, by frame
// time otherwise), so it stops while the game is paused and keeps the visuals pulsing even
// when audio is muted or blocked. Audio follows it.
// See docs/02-audio-visual.md §3.3.

export type Subdivision = '32n' | '16n' | '8n' | '4n' | '1m';

const BEATS: Record<Subdivision, number> = { '32n': 0.125, '16n': 0.25, '8n': 0.5, '4n': 1, '1m': 4 };

interface Scheduled {
  time: number;
  cb: () => void;
}

export class BeatClock {
  /** Seconds since start. */
  private now = 0;
  /** Quarter notes elapsed (fractional). */
  private beatPos = 0;
  private bpm: number;
  private rampFrom = 0;
  private rampTo = 0;
  private rampStart = 0;
  private rampEnd = 0;
  private readonly pending: Scheduled[] = [];
  private readonly beatCbs: ((beat: number) => void)[] = [];
  private readonly barCbs: ((bar: number) => void)[] = [];

  constructor(bpm: number) {
    this.bpm = bpm;
  }

  /** Seconds since start. */
  get time(): number {
    return this.now;
  }

  /** Quarter notes elapsed since start. */
  get beats(): number {
    return this.beatPos;
  }

  /** Beat position at a (near-future) clock time, at the current tempo. */
  beatAt(time: number): number {
    return this.beatPos + ((time - this.now) * this.bpm) / 60;
  }

  /** Clock time of a (near-future) beat position, at the current tempo. */
  timeOfBeat(beat: number): number {
    return this.now + ((beat - this.beatPos) * 60) / this.bpm;
  }

  /** Clock time (seconds) of the next subdivision boundary. */
  next(sub: Subdivision): number {
    const step = BEATS[sub];
    const target = (Math.floor(this.beatPos / step) + 1) * step;
    return this.now + ((target - this.beatPos) * 60) / this.bpm;
  }

  seconds(sub: Subdivision): number {
    return (BEATS[sub] * 60) / this.bpm;
  }

  /** Sets the tempo right away, cancelling any ramp. */
  setBpm(bpm: number): void {
    this.bpm = bpm;
    this.rampEnd = this.rampStart;
  }

  /** Ramps the tempo linearly over `rampSeconds`, starting at clock time `time`. */
  setBpmAt(bpm: number, rampSeconds: number, time: number): void {
    this.rampFrom = this.bpm;
    this.rampTo = bpm;
    this.rampStart = time;
    this.rampEnd = time + rampSeconds;
  }

  /** Runs a callback when the clock reaches `time`. */
  at(time: number, cb: () => void): void {
    this.pending.push({ time, cb });
  }

  onBeat(cb: (beat: number) => void): void {
    this.beatCbs.push(cb);
  }

  onBar(cb: (bar: number) => void): void {
    this.barCbs.push(cb);
  }

  update(dt: number): void {
    this.now += dt;
    if (this.rampEnd > this.rampStart && this.now >= this.rampStart) {
      const k = Math.min(1, (this.now - this.rampStart) / (this.rampEnd - this.rampStart));
      this.bpm = this.rampFrom + (this.rampTo - this.rampFrom) * k;
      if (k === 1) this.rampEnd = this.rampStart;
    }
    const prev = Math.floor(this.beatPos);
    this.beatPos += (dt * this.bpm) / 60;
    const beat = Math.floor(this.beatPos);
    if (beat > prev) {
      for (const cb of this.beatCbs) cb(beat);
      if (beat % 4 === 0) for (const cb of this.barCbs) cb(beat / 4);
    }
    // Swap-remove keeps this allocation-free; callbacks scheduled from a callback run next frame.
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const s = this.pending[i];
      if (s.time > this.now) continue;
      this.pending[i] = this.pending[this.pending.length - 1];
      this.pending.pop();
      s.cb();
    }
  }
}

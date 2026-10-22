// Shared uniforms driven by the BeatClock: every material that pulses reads these.
// See docs/02-audio-visual.md §4 ("Pulso global").

export interface FloatUniform {
  value: number;
}

export class BeatUniforms {
  /** 1 on each quarter note, decays exponentially. */
  readonly uBeat: FloatUniform = { value: 0 };
  /** 1 on each bar, decays slower. */
  readonly uBar: FloatUniform = { value: 0 };
  /** Merge / drop accents. */
  readonly uAccent: FloatUniform = { value: 0 };
  /** Smoothly follows the board section (0..2). */
  readonly uSection: FloatUniform = { value: 0 };
  /** Seconds since start. */
  readonly uTime: FloatUniform = { value: 0 };
  private sectionTarget = 0;
  private readonly epoch = performance.now();

  beat(): void {
    this.uBeat.value = 1;
  }

  bar(): void {
    this.uBar.value = 1;
  }

  accent(amount: number): void {
    this.uAccent.value = Math.min(1.5, Math.max(this.uAccent.value, amount));
  }

  setSection(section: number): void {
    this.sectionTarget = section;
  }

  update(now: number, dt: number): void {
    this.uTime.value = (now - this.epoch) / 1000;
    this.uBeat.value *= Math.exp(-dt * 6);
    this.uBar.value *= Math.exp(-dt * 3);
    this.uAccent.value *= Math.exp(-dt * 4);
    this.uSection.value += (this.sectionTarget - this.uSection.value) * Math.min(1, dt * 0.8);
  }
}

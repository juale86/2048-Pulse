import type { Fm } from '../stages/schema';

// One reusable note voice: a carrier plus an optional FM modulator. The modulation fades
// faster than the volume, so notes start bright and mellow out like a bell, kalimba or
// electric piano instead of a flat "MIDI" beep. Two oscillators, created once.

/** Attack time constant: soft enough to avoid a click, fast enough to feel plucked. */
const ATTACK_S = 0.004;

export class FmVoice {
  readonly carrier: OscillatorNode;
  /** Voice output: connect it to a filter or bus. */
  readonly env: GainNode;
  private readonly mod: OscillatorNode;
  private readonly modGain: GainNode;

  constructor(ctx: AudioContext, wave: OscillatorType) {
    this.carrier = ctx.createOscillator();
    this.carrier.type = wave;
    this.mod = ctx.createOscillator();
    this.modGain = ctx.createGain();
    this.modGain.gain.value = 0;
    this.env = ctx.createGain();
    this.env.gain.value = 0;
    this.mod.connect(this.modGain);
    this.modGain.connect(this.carrier.frequency);
    this.carrier.connect(this.env);
    this.carrier.start();
    this.mod.start();
  }

  play(hz: number, time: number, peak: number, decay: number, fm?: Fm, attack = ATTACK_S): void {
    this.carrier.frequency.setValueAtTime(hz, time);
    if (fm) {
      const modHz = hz * fm.ratio;
      this.mod.frequency.setValueAtTime(modHz, time);
      // Peak frequency deviation = index × modulator frequency; brightness decays twice as fast.
      this.modGain.gain.setTargetAtTime(fm.index * modHz, time, 0.002);
      this.modGain.gain.setTargetAtTime(0, time + 0.01, decay / 6);
    }
    this.env.gain.setTargetAtTime(peak, time, attack);
    this.env.gain.setTargetAtTime(0, time + attack * 3, decay / 3);
  }

  stop(): void {
    this.carrier.stop();
    this.mod.stop();
  }
}

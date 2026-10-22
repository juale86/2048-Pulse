import type { StageDef } from '../stages/schema';
import type { AudioEngine } from './AudioEngine';
import { FmVoice } from './FmVoice';
import { midiToHz } from './notes';

// The player's sounds: a fixed pool of 6 FM note voices (oldest is stolen) sharing a gentle
// vibrato, plus fixed nodes for the spawn tick, the invalid-move thud and the drop. Nothing is
// created after construction.
// See docs/02-audio-visual.md §2.

const VOICES = 6;
const VIBRATO_HZ = 4.5;
const VIBRATO_CENTS = 4;
/** Notes vary ±10% in level so repeats don't sound machine-identical. */
const humanize = () => 0.9 + Math.random() * 0.2;

interface Voice {
  fm: FmVoice;
  filter: BiquadFilterNode;
  startedAt: number;
}

export class Sfx {
  private readonly ctx: AudioContext;
  private readonly voices: Voice[] = [];
  private readonly tick: GainNode;
  private readonly thud: { osc: OscillatorNode; env: GainNode };
  private readonly drop: { osc: OscillatorNode; env: GainNode; noise: GainNode };

  constructor(private readonly engine: AudioEngine) {
    const ctx = (this.ctx = engine.ctx);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = VIBRATO_HZ;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = VIBRATO_CENTS;
    vibrato.connect(vibratoDepth);
    vibrato.start();
    for (let i = 0; i < VOICES; i++) {
      const fm = new FmVoice(ctx, 'sine');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      vibratoDepth.connect(fm.carrier.detune);
      fm.env.connect(filter);
      filter.connect(engine.sfx);
      this.voices.push({ fm, filter, startedAt: -Infinity });
    }

    const noise = ctx.createBufferSource();
    noise.buffer = engine.noise;
    noise.loop = true;
    noise.start();
    this.tick = this.noiseBranch(noise, 'bandpass', 5000);

    this.thud = this.sine();
    const d = this.sine();
    this.drop = { ...d, noise: this.noiseBranch(noise, 'lowpass', 800) };
  }

  /** One note in the stage's player timbre. `bright` is for merges. */
  note(midi: number, time: number, voice: StageDef['voice'], velocity: number, bright = false): void {
    const v = this.steal();
    v.startedAt = time;
    v.fm.carrier.type = voice.wave;
    v.filter.frequency.setValueAtTime(voice.cutoff * (bright ? 2 : 1), time);
    v.fm.play(midiToHz(midi), time, velocity * humanize(), voice.decay, voice.fm);
    this.engine.duck(time);
  }

  spawned(time: number): void {
    this.envelope(this.tick, time, 0.25, 0.01);
  }

  invalid(time: number): void {
    const f = this.thud.osc.frequency;
    f.setValueAtTime(70, time);
    f.exponentialRampToValueAtTime(40, time + 0.1);
    this.envelope(this.thud.env, time, 0.6, 0.05);
  }

  dropAt(time: number): void {
    const f = this.drop.osc.frequency;
    f.setValueAtTime(120, time);
    f.exponentialRampToValueAtTime(35, time + 0.6);
    this.envelope(this.drop.env, time, 0.9, 0.25);
    this.envelope(this.drop.noise, time, 0.5, 0.15);
  }

  private steal(): Voice {
    let oldest = this.voices[0];
    for (const v of this.voices) if (v.startedAt < oldest.startedAt) oldest = v;
    return oldest;
  }

  private silentGain(): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = 0;
    return g;
  }

  private sine(): { osc: OscillatorNode; env: GainNode } {
    const osc = this.ctx.createOscillator();
    const env = this.silentGain();
    osc.connect(env);
    env.connect(this.engine.sfx);
    osc.start();
    return { osc, env };
  }

  private noiseBranch(noise: AudioBufferSourceNode, type: BiquadFilterType, freq: number): GainNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const env = this.silentGain();
    noise.connect(f);
    f.connect(env);
    env.connect(this.engine.sfx);
    return env;
  }

  private envelope(env: GainNode, time: number, peak: number, tau: number): void {
    env.gain.setTargetAtTime(peak, time, 0.002);
    env.gain.setTargetAtTime(0, time + 0.008, tau);
  }
}

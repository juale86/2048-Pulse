import type { Section } from '../core/types';
import {
  LAYER_NAMES,
  STEPS_PER_BAR,
  STEPS_PER_LOOP,
  stageSections,
  type LayerName,
  type LoopDef,
  type StageDef,
  type TonalLayer,
} from '../stages/schema';
import { dbToGain, type AudioEngine } from './AudioEngine';
import { FmVoice } from './FmVoice';
import { midiToHz, noteToMidi, scaleMidi } from './notes';

// The base of one stage: three composed 4-bar loops (one per section, each in its own key)
// played by drone, pad, melody, bass, arp and perc. A section change waits for the current loop
// to finish, so the phrase completes before the modulation. Every node is created here, once;
// while playing only frequencies and gains are automated. See docs/02-audio-visual.md §3.

export interface Chord {
  notes: number[];
  root: number;
}

interface MelodyNote {
  midi: number;
  steps: number;
}

/** A loop resolved to MIDI: one chord per bar, the scale (octave 4) and melody onsets per step. */
interface Loop {
  chords: Chord[];
  scale: number[];
  melody: (MelodyNote | null)[];
}

function resolveLoop(def: LoopDef, transpose: number): Loop {
  const chords: Chord[] = [];
  for (const c of def.chords) {
    const chord = { notes: c.notes.map((n) => noteToMidi(n) + transpose), root: noteToMidi(c.root) + transpose };
    for (let b = 0; b < c.bars; b++) chords.push(chord);
  }
  const melody: (MelodyNote | null)[] = new Array(STEPS_PER_LOOP).fill(null);
  let at = 0;
  for (const tok of def.melody.trim().split(/\s+/)) {
    const [note, len] = tok.split(':');
    if (note !== '-') melody[at] = { midi: noteToMidi(note) + transpose, steps: Number(len) };
    at += Number(len);
  }
  return { chords, scale: scaleMidi(def.scale, 4).map((m) => m + transpose), melody };
}

const MELODY_VOICES = 2;

/** Bass notes swell in a little instead of plucking. */
const BASS_ATTACK_S = 0.015;
/** Arp and melody notes vary ±10% in level so repeats don't sound machine-identical. */
const humanize = () => 0.9 + Math.random() * 0.2;

const PAD_VOICES = 4;
const PAD_VOICES_LIGHT = 2;
/** Chord changes glide softly (setTargetAtTime time constants). */
const DRONE_GLIDE_S = 0.3;
const PAD_GLIDE_S = 0.15;
/** Pad voices are detuned ±this many cents: a slight chorus without an audible wobble. */
const PAD_DETUNE = 2;
/** The drone's octave-up sine, relative to the root. */
const DRONE_OCTAVE_LEVEL = 0.25;
/** Slow "breathing" of the pad: its level swings ±BREATH_DEPTH around 1 − BREATH_DEPTH. */
const BREATH_HZ = 0.08;
const BREATH_DEPTH = 0.2;
/** Level of the lone drone left under the game over panel, relative to its normal level. */
const GAMEOVER_DRONE = 0.3;

interface StepVoice {
  osc: OscillatorNode;
  env: GainNode;
}

export class StageMusic {
  private readonly ctx: AudioContext;
  private readonly out: GainNode;
  private readonly gains: Partial<Record<LayerName, GainNode>> = {};
  private readonly levels: Partial<Record<LayerName, number>> = {};
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly voices: FmVoice[] = [];
  private readonly loops: Loop[];
  /** Section whose loop is playing, and a change waiting for the next loop boundary. */
  private loop: Section;
  private pending: { section: Section; step: number; ramp: number } | null = null;
  private readonly melody: FmVoice[] = [];
  private melodyVoice = 0;
  private drone: OscillatorNode | null = null;
  private droneOctave: OscillatorNode | null = null;
  private readonly pad: OscillatorNode[] = [];
  private padFilter: BiquadFilterNode | null = null;
  private bass: FmVoice | null = null;
  private arp: FmVoice | null = null;
  private kick: StepVoice | null = null;
  private hat: GainNode | null = null;
  private snare: GainNode | null = null;
  private currentChord = -1;
  private arpStep = 0;

  constructor(
    engine: AudioEngine,
    private readonly def: StageDef,
    transpose: number,
    /** Absolute 16th step at which this stage's loops start. */
    readonly startStep: number,
    light: boolean,
    section: Section,
  ) {
    const ctx = (this.ctx = engine.ctx);
    this.out = ctx.createGain();
    this.out.connect(engine.music);

    this.loops = def.loops.map((loop) => resolveLoop(loop, transpose));
    this.loop = section;

    const l = def.layers;
    if (l.drone) {
      const filter = this.filtered(l.drone, 'drone');
      this.drone = this.osc(l.drone.wave);
      this.drone.connect(filter);
      this.droneOctave = this.osc('sine');
      const octave = ctx.createGain();
      octave.gain.value = DRONE_OCTAVE_LEVEL;
      this.droneOctave.connect(octave);
      octave.connect(filter);
    }
    if (l.pad) {
      this.padFilter = ctx.createBiquadFilter();
      this.padFilter.type = 'lowpass';
      this.padFilter.frequency.value = l.pad.cutoff;
      const breath = ctx.createGain();
      breath.gain.value = 1 - BREATH_DEPTH;
      const lfo = this.osc('sine');
      lfo.frequency.value = BREATH_HZ;
      const depth = ctx.createGain();
      depth.gain.value = BREATH_DEPTH;
      lfo.connect(depth);
      depth.connect(breath.gain);
      this.padFilter.connect(breath);
      breath.connect(this.layerGain('pad', l.pad.gainDb));
      for (let i = 0; i < PAD_VOICES; i++) {
        const o = this.osc(l.pad.wave);
        o.detune.value = (i % 2 ? 1 : -1) * PAD_DETUNE;
        this.pad.push(o);
      }
      this.setLight(light);
    }
    // Start on the first chord so nothing sweeps up from the oscillators' default pitch.
    const first = this.loops[section].chords[0];
    if (this.drone) this.drone.frequency.value = midiToHz(first.root);
    if (this.droneOctave) this.droneOctave.frequency.value = midiToHz(first.root) * 2;
    this.pad.forEach((o, i) => (o.frequency.value = midiToHz(first.notes[i % first.notes.length])));
    if (l.melody) {
      const filter = this.filtered(l.melody, 'melody');
      for (let i = 0; i < MELODY_VOICES; i++) this.melody.push(this.voice(l.melody.wave, filter));
    }
    if (l.bass) this.bass = this.voice(l.bass.wave, this.filtered(l.bass, 'bass'));
    if (l.arp) this.arp = this.voice(l.arp.wave, this.filtered(l.arp, 'arp'));
    if (l.perc) {
      const g = this.layerGain('perc', l.perc.gainDb);
      this.kick = { osc: this.osc('sine'), env: ctx.createGain() };
      this.kick.env.gain.value = 0;
      this.kick.osc.connect(this.kick.env);
      this.kick.env.connect(g);
      const noise = ctx.createBufferSource();
      noise.buffer = engine.noise;
      noise.loop = true;
      noise.start();
      this.sources.push(noise);
      this.hat = this.noiseVoice(noise, 'highpass', 7000, g);
      this.snare = this.noiseVoice(noise, 'bandpass', 1800, g);
    }
  }

  /** Chord sounding at an absolute 16th step. */
  chordAt(step: number): Chord {
    return this.loops[this.loopAt(step)].chords[this.barInLoop(step)];
  }

  /** Scale (MIDI, octave 4) of the loop sounding at a step. */
  scaleAt(step: number): number[] {
    return this.loops[this.loopAt(step)].scale;
  }

  /** First step of the next loop at or after `step`. */
  nextLoopStep(step: number): number {
    return this.startStep + Math.max(0, Math.ceil((step - this.startStep) / STEPS_PER_LOOP)) * STEPS_PER_LOOP;
  }

  /** Schedules one 16th step at audio time `time`; `stepSeconds` is the current 16th length. */
  step(step: number, time: number, stepSeconds: number): void {
    if (this.pending && step >= this.pending.step) {
      this.applySection(this.pending.section, time, this.pending.ramp);
      this.pending = null;
    }
    const loop = this.loops[this.loop];
    const bar = this.barInLoop(step);
    const chord = loop.chords[bar];
    const ci = this.loop * STEPS_PER_LOOP + bar;
    if (ci !== this.currentChord) {
      this.currentChord = ci;
      const root = midiToHz(chord.root);
      this.drone?.frequency.setTargetAtTime(root, time, DRONE_GLIDE_S);
      this.droneOctave?.frequency.setTargetAtTime(root * 2, time, DRONE_GLIDE_S);
      this.pad.forEach((o, i) => o.frequency.setTargetAtTime(midiToHz(chord.notes[i % chord.notes.length]), time, PAD_GLIDE_S));
    }
    const inLoop = this.stepInLoop(step);
    const s = inLoop % STEPS_PER_BAR;
    const l = this.def.layers;
    const note = loop.melody[inLoop];
    if (note && l.melody && this.melody.length) {
      const v = this.melody[this.melodyVoice++ % this.melody.length];
      v.play(midiToHz(note.midi), time, humanize(), Math.max(l.melody.decay, note.steps * stepSeconds), l.melody.fm);
    }
    if (this.bass && l.bass?.steps[s] === 'x') this.bass.play(midiToHz(chord.root + 12), time, 1, l.bass.decay, l.bass.fm, BASS_ATTACK_S);
    if (this.arp && l.arp?.steps[s] === 'x') {
      const n = chord.notes[this.arpStep++ % chord.notes.length];
      this.arp.play(midiToHz(n + 12), time, humanize(), l.arp.decay, l.arp.fm);
    }
    if (l.perc) {
      if (this.kick && l.perc.kick[s] === 'x') {
        const f = this.kick.osc.frequency;
        f.setValueAtTime(150, time);
        f.exponentialRampToValueAtTime(45, time + 0.12);
        this.envelope(this.kick.env, time, 1, 0.08);
      }
      if (this.hat && l.perc.hat[s] === 'x') this.envelope(this.hat, time, 0.5, 0.02);
      if (this.snare && l.perc.snare[s] === 'x') this.envelope(this.snare, time, 0.7, 0.06);
    }
  }

  /** Switches loop and layers right away (boot, title). */
  setSectionNow(section: Section, time: number): void {
    this.pending = null;
    this.applySection(section, time, 0.05);
  }

  /** Switches loop and layers when step `step` (a loop boundary) is scheduled. */
  queueSection(section: Section, step: number, rampSeconds: number): void {
    this.pending = { section, step, ramp: rampSeconds };
  }

  /** Loop `section` plays from now on; its layers ramp in (others out) from `time`. */
  private applySection(section: Section, time: number, rampSeconds: number): void {
    this.loop = section;
    const active = stageSections(this.def)[section];
    for (const name of LAYER_NAMES) {
      const g = this.gains[name];
      if (g) g.gain.setTargetAtTime(active.includes(name) ? this.levels[name]! : 0, time, rampSeconds / 3);
    }
  }

  /** Game over: everything cuts at once; a quiet drone fades back in after `droneDelay`. */
  cut(time: number, droneDelay: number): void {
    for (const name of LAYER_NAMES) this.gains[name]?.gain.setTargetAtTime(0, time, 0.015);
    const drone = this.gains.drone;
    if (drone) drone.gain.setTargetAtTime(this.levels.drone! * GAMEOVER_DRONE, time + droneDelay, 0.4);
  }

  restore(time: number): void {
    this.applySection(this.loop, time, 0.1);
  }

  fade(from: number, to: number, time: number, seconds: number): void {
    const g = this.out.gain;
    g.setValueAtTime(from, time);
    g.linearRampToValueAtTime(to, time + seconds);
  }

  /** Low quality keeps 2 pad oscillators connected instead of 4. */
  setLight(light: boolean): void {
    if (!this.padFilter) return;
    const n = light ? PAD_VOICES_LIGHT : PAD_VOICES;
    this.pad.forEach((o, i) => {
      o.disconnect();
      if (i < n) o.connect(this.padFilter!);
    });
  }

  dispose(): void {
    for (const s of this.sources) s.stop();
    for (const v of this.voices) v.stop();
    this.out.disconnect();
  }

  private loopAt(step: number): Section {
    return this.pending && step >= this.pending.step ? this.pending.section : this.loop;
  }

  private stepInLoop(step: number): number {
    return (((step - this.startStep) % STEPS_PER_LOOP) + STEPS_PER_LOOP) % STEPS_PER_LOOP;
  }

  private barInLoop(step: number): number {
    return Math.floor(this.stepInLoop(step) / STEPS_PER_BAR);
  }

  private osc(wave: OscillatorType): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = wave;
    o.start();
    this.sources.push(o);
    return o;
  }

  private layerGain(name: LayerName, gainDb: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(this.out);
    this.gains[name] = g;
    this.levels[name] = dbToGain(gainDb);
    return g;
  }

  private filtered(layer: TonalLayer, name: LayerName): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = layer.cutoff;
    f.connect(this.layerGain(name, layer.gainDb));
    return f;
  }

  private voice(wave: OscillatorType, out: AudioNode): FmVoice {
    const v = new FmVoice(this.ctx, wave);
    v.env.connect(out);
    this.voices.push(v);
    return v;
  }

  private noiseVoice(noise: AudioBufferSourceNode, type: BiquadFilterType, freq: number, out: GainNode): GainNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const env = this.ctx.createGain();
    env.gain.value = 0;
    noise.connect(f);
    f.connect(env);
    env.connect(out);
    return env;
  }

  /** Click-free attack/decay: both stages are exponential approaches from the current value. */
  private envelope(env: GainNode, time: number, peak: number, tau: number): void {
    env.gain.setTargetAtTime(peak, time, 0.002);
    env.gain.setTargetAtTime(0, time + 0.008, tau);
  }
}

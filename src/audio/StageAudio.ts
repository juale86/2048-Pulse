import type { BeatClock } from '../app/BeatClock';
import type { Direction, Section, StageRef } from '../core/types';
import { stageBpm, stageDef, stageTranspose } from '../stages';
import type { AudioEngine } from './AudioEngine';
import { mergeMidi } from './notes';
import { Sfx } from './Sfx';
import { StageMusic } from './StageMusic';

// Owns the music of the active stage and the player's sounds, and follows the BeatClock:
// every frame it schedules the 16th steps that fall in the next LOOKAHEAD_S seconds.
// It also owns the tempo: each section has its own BPM, applied when its loop starts.
// Audio errors are caught and reported; they never interrupt game logic.
// See docs/02-audio-visual.md §2–3 and §6.

const LOOKAHEAD_S = 0.15;
const STEPS_PER_BEAT = 4;
const SECTION_RAMP_BEATS = 1;
const GAMEOVER_DRONE_DELAY_S = 1;
/** Player note register per direction, in semitones above the chord voicing. */
const REGISTER: Record<Direction, number> = { up: 24, down: 0, left: 12, right: 12 };

export class StageAudio {
  private readonly sfx: Sfx;
  private music: StageMusic;
  private old: { music: StageMusic; until: number } | null = null;
  private ref: StageRef;
  private nextStep = -1;
  private chordStep = 0;
  private light = false;

  constructor(
    private readonly engine: AudioEngine,
    private readonly clock: BeatClock,
    initial: StageRef,
    private readonly onError: () => void = () => {},
  ) {
    this.sfx = new Sfx(engine);
    this.ref = initial;
    this.music = new StageMusic(engine, stageDef(initial), stageTranspose(initial), 0, false, 0);
    engine.setTempo(stageBpm(initial), engine.ctx.currentTime);
  }

  /** Call every frame, after the BeatClock advanced. */
  update(): void {
    this.safe(() => {
      const { engine, clock } = this;
      engine.sync(clock.time);
      if (!engine.running) {
        this.nextStep = -1; // no backlog while suspended or blocked
        return;
      }
      if (this.nextStep < 0) this.nextStep = Math.ceil(clock.beats * STEPS_PER_BEAT);
      const horizon = clock.time + LOOKAHEAD_S;
      const stepSeconds = clock.seconds('16n');
      for (;;) {
        const t = clock.timeOfBeat(this.nextStep / STEPS_PER_BEAT);
        if (t >= horizon) break;
        const at = engine.toAudio(t);
        if (this.old) {
          if (this.nextStep < this.old.until) this.old.music.step(this.nextStep, at, stepSeconds);
          else {
            this.old.music.dispose();
            this.old = null;
          }
        }
        if (this.nextStep >= this.music.startStep) this.music.step(this.nextStep, at, stepSeconds);
        this.nextStep++;
      }
    });
  }

  /**
   * Section change: its loop (new key) and tempo start when the current 4-bar loop ends, so the
   * phrase completes first. `immediate` switches right away (boot / title).
   */
  setSection(section: Section, immediate = false): void {
    this.safe(() => {
      const { clock, engine } = this;
      const bpm = stageBpm(this.ref, section);
      if (immediate) {
        this.music.setSectionNow(section, engine.ctx.currentTime);
        clock.setBpm(bpm);
        engine.setTempo(bpm, engine.ctx.currentTime);
        return;
      }
      const from = Math.max(this.nextStep, Math.ceil(clock.beats * STEPS_PER_BEAT));
      const step = this.music.nextLoopStep(from);
      const time = clock.timeOfBeat(step / STEPS_PER_BEAT);
      const bar = clock.seconds('1m');
      this.music.queueSection(section, step, SECTION_RAMP_BEATS * clock.seconds('4n'));
      clock.setBpmAt(bpm, bar, time);
      engine.setTempo(bpm, this.audioAt(time), bar);
    });
  }

  moved(dir: Direction, time: number): void {
    this.safe(() => {
      const chord = this.music.chordAt(this.stepAt(time));
      const midi = chord.notes[this.chordStep++ % chord.notes.length] + REGISTER[dir];
      this.sfx.note(midi, this.audioAt(time), stageDef(this.ref).voice, 0.5);
    });
  }

  merged(value: number, time: number): void {
    this.safe(() => {
      const scale = this.music.scaleAt(this.stepAt(time));
      this.sfx.note(mergeMidi(scale, value), this.audioAt(time), stageDef(this.ref).voice, 0.65, true);
    });
  }

  spawned(time: number): void {
    this.safe(() => this.sfx.spawned(this.audioAt(time)));
  }

  invalid(): void {
    this.safe(() => this.sfx.invalid(this.engine.ctx.currentTime));
  }

  drop(time: number): void {
    this.safe(() => this.sfx.dropAt(this.audioAt(time)));
  }

  /**
   * At clock time `time` (a bar boundary): the old stage fades out over one bar, the tempo
   * ramps, and the new stage fades in playing the loop of `section`.
   */
  transition(to: StageRef, section: Section, time: number, barSeconds: number): void {
    this.safe(() => {
      const at = this.audioAt(time);
      const startStep = Math.round(this.clock.beatAt(time) * STEPS_PER_BEAT);
      const barSteps = 4 * STEPS_PER_BEAT;
      this.old?.music.dispose();
      this.music.fade(1, 0, at, barSeconds);
      this.old = { music: this.music, until: startStep + 2 * barSteps };
      this.ref = to;
      this.music = new StageMusic(this.engine, stageDef(to), stageTranspose(to), startStep, this.light, section);
      this.music.fade(0, 1, at, barSeconds);
      this.music.setSectionNow(section, at);
      this.engine.setTempo(stageBpm(to, section), at, barSeconds);
    });
  }

  /** Instant cut; a quiet drone comes back after a second. */
  gameOver(): void {
    this.safe(() => this.music.cut(this.engine.ctx.currentTime, GAMEOVER_DRONE_DELAY_S));
  }

  /** Brings the layers of the current section back after a game over. */
  restore(): void {
    this.safe(() => this.music.restore(this.engine.ctx.currentTime));
  }

  setLight(light: boolean): void {
    this.light = light;
    this.safe(() => {
      this.engine.setLight(light);
      this.music.setLight(light);
    });
  }

  private audioAt(clockTime: number): number {
    return this.engine.toAudio(clockTime);
  }

  private stepAt(clockTime: number): number {
    return Math.floor(this.clock.beatAt(clockTime) * STEPS_PER_BEAT + 1e-6);
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[audio]', e);
      this.onError();
    }
  }
}

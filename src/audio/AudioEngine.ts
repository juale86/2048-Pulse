// AudioContext, buses, YouTube mute, volumes, pause, and the BeatClock → currentTime mapping.
// Plain Web Audio: no AudioWorklet, no Workers. See docs/03-arquitectura.md §9.
//
//   music ─► duck ─┬──────────────────────────────► master ─► destination
//   sfx ───────────┤                                   ▲
//   (sends) ─► delay ─► lowpass ─► feedback ─┐         │
//                ▲                           │         │
//                └───────────────────────────┘ ─► wet ─┘

export const dbToGain = (db: number) => 10 ** (db / 20);

/** Per-channel volume 0..100 → gain, with a squared curve so the slider feels even. */
const volumeGain = (vol: number) => (Math.max(0, Math.min(100, vol)) / 100) ** 2;

/** Above this clock/audio drift the offset snaps instead of easing (e.g. after a resume). */
const SNAP_S = 0.08;
/** Largest clock step taken from audio time in one frame (bigger gaps are dropped, then snapped). */
const MAX_STEP_S = 0.25;
const EASE = 0.02;
const DELAY_BEATS = 0.75; // dotted eighth
const MUSIC_SEND = 0.15;
const SFX_SEND = 0.3;

export class AudioEngine {
  /**
   * latencyHint 'playback': larger device buffers. With small buffers the audio thread starved
   * while WebGL rendered. Everything is scheduled ahead, so the extra latency is not felt.
   */
  readonly ctx = new AudioContext({ latencyHint: 'playback' });
  readonly music = this.ctx.createGain();
  readonly sfx = this.ctx.createGain();
  /** One second of white noise, looped by every noise voice. */
  readonly noise: AudioBuffer;
  private readonly duckNode = this.ctx.createGain();
  private readonly master = this.ctx.createGain();
  private readonly musicSend = this.ctx.createGain();
  private readonly sfxSend = this.ctx.createGain();
  private readonly delay = this.ctx.createDelay(2);
  private ytEnabled: boolean;
  /** False while the platform has the game paused: input must not wake the audio then. */
  private wanted = true;
  private offset = 0;
  private synced = false;
  private lastAudio = -1;
  private light = false;

  constructor(ytEnabled: boolean) {
    const ctx = this.ctx;
    this.ytEnabled = ytEnabled;
    this.music.connect(this.duckNode);
    this.duckNode.connect(this.master);
    this.sfx.connect(this.master);

    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2500;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    this.duckNode.connect(this.musicSend);
    this.sfx.connect(this.sfxSend);
    this.musicSend.connect(this.delay);
    this.sfxSend.connect(this.delay);
    this.delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(this.delay);
    delayFilter.connect(wet);
    wet.connect(this.master);
    this.applySends();

    this.master.connect(ctx.destination);
    this.master.gain.value = ytEnabled ? 1 : 0;

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  get running(): boolean {
    return this.ctx.state === 'running';
  }

  /**
   * How far the BeatClock should advance this frame: the audio time elapsed while the context
   * runs, so music and visuals never drift; the frame's dt while audio is suspended or blocked.
   */
  clockStep(frameDt: number): number {
    if (!this.running) {
      this.lastAudio = -1;
      return frameDt;
    }
    const now = this.audioNow();
    const step = this.lastAudio < 0 ? frameDt : now - this.lastAudio;
    this.lastAudio = now;
    return Math.min(Math.max(step, 0), MAX_STEP_S);
  }

  /** Called every frame with the BeatClock time; keeps the clock → audio offset. */
  sync(clockTime: number): void {
    if (!this.running) {
      this.synced = false;
      return;
    }
    const measured = this.ctx.currentTime - clockTime;
    if (!this.synced || Math.abs(measured - this.offset) > SNAP_S) {
      this.offset = measured;
      this.synced = true;
    } else {
      this.offset += (measured - this.offset) * EASE;
    }
  }

  /** BeatClock time → AudioContext time (never in the past). */
  toAudio(clockTime: number): number {
    return Math.max(this.ctx.currentTime, clockTime + this.offset);
  }

  /** YouTube mute always wins over in-game volumes. */
  setYtEnabled(enabled: boolean): void {
    this.ytEnabled = enabled;
    this.master.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.015);
  }

  setVolumes(music: number, sfx: number): void {
    const now = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(volumeGain(music), now, 0.015);
    this.sfx.gain.setTargetAtTime(volumeGain(sfx), now, 0.015);
  }

  /** Delay time follows the tempo, ramping from `time` over `rampSeconds`. */
  setTempo(bpm: number, time: number, rampSeconds = 0): void {
    const d = (DELAY_BEATS * 60) / bpm;
    const p = this.delay.delayTime;
    if (rampSeconds <= 0) {
      p.setValueAtTime(d, time);
      return;
    }
    p.setValueAtTime(p.value, time);
    p.linearRampToValueAtTime(d, time + rampSeconds);
  }

  /** Low quality turns the delay off. */
  setLight(light: boolean): void {
    this.light = light;
    this.applySends();
  }

  /** Short −3 dB dip of the music when a player note sounds. */
  duck(time: number): void {
    const g = this.duckNode.gain;
    g.setTargetAtTime(0.7, time, 0.008);
    g.setTargetAtTime(1, time + 0.05, 0.08);
  }

  /**
   * Tries to start immediately; if the browser blocks it, retries on every input until it runs.
   * The retry stays armed for good: after a lock/unlock or a phone call, mobile browsers may leave
   * the context suspended or "interrupted" until the next gesture. Never blocks the game.
   * Touch only counts as a user activation on pointerup/touchend, not pointerdown.
   */
  unlock(): void {
    void this.ctx.resume().catch(() => {});
    const retry = () => {
      if (this.wanted && !this.running) void this.ctx.resume().catch(() => {});
    };
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) window.addEventListener(type, retry, { capture: true, passive: true });
  }

  pause(): void {
    this.wanted = false;
    void this.ctx.suspend().catch(() => {});
  }

  /** The context keeps running under YouTube mute (master at 0) so scheduling stays alive. */
  resume(): void {
    this.wanted = true;
    void this.ctx.resume().catch(() => {});
    this.master.gain.value = this.ytEnabled ? 1 : 0;
  }

  /** Smooth audio time: currentTime only moves once per render quantum. */
  private audioNow(): number {
    const ts = this.ctx.getOutputTimestamp();
    if (ts.contextTime === undefined || !ts.performanceTime) return this.ctx.currentTime;
    return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
  }

  private applySends(): void {
    this.musicSend.gain.value = this.light ? 0 : MUSIC_SEND;
    this.sfxSend.gain.value = this.light ? 0 : SFX_SEND;
  }
}

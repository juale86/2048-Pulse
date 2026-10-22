// Quality levels and the auto governor. See docs/03-arquitectura.md §8.1.

export type QualityLevel = 'high' | 'medium' | 'low';
export type QualityMode = 'auto' | 'high' | 'low';

export interface QualityPreset {
  maxDpr: number;
  /** Post-processing composer; off renders straight to the canvas. */
  post: boolean;
  bloom: boolean;
  bloomStrength: number;
  particles: number;
  vignette: boolean;
  aberration: boolean;
}

export const PRESETS: Record<QualityLevel, QualityPreset> = {
  high: { maxDpr: 2, post: true, bloom: true, bloomStrength: 0.85, particles: 1, vignette: true, aberration: true },
  medium: { maxDpr: 1.5, post: true, bloom: true, bloomStrength: 0.7, particles: 0.5, vignette: true, aberration: false },
  low: { maxDpr: 2, post: false, bloom: false, bloomStrength: 0, particles: 0.2, vignette: false, aberration: false },
};

const ORDER: QualityLevel[] = ['low', 'medium', 'high'];
const WINDOW_S = 3;
const COOLDOWN_S = 10;
const DOWN_FPS = 50;
const UP_FPS = 58;
/** Below this the device is clearly struggling: step down without waiting for the cooldown. */
const PANIC_FPS = 30;

/** What the browser tells us about the device, for picking the starting level. */
export interface DeviceHints {
  /** GiB, from navigator.deviceMemory (Chromium only; capped at 8). */
  memory?: number;
  /** navigator.hardwareConcurrency. */
  cores?: number;
  /** Primary input is touch (phones, tablets). */
  touch: boolean;
  /** Unmasked WebGL renderer string, when the browser exposes it. */
  gpu?: string;
}

/** Software rasterizers: no GPU at all. */
const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render/i;

/**
 * Starting level for auto mode: low on modest or GPU-less devices, high on clearly strong
 * desktops, medium otherwise. The governor then corrects from measured fps.
 */
export function initialLevel(h: DeviceHints): QualityLevel {
  if (h.gpu && SOFTWARE_GPU.test(h.gpu)) return 'low';
  if ((h.memory !== undefined && h.memory <= 4) || (h.cores !== undefined && h.cores <= 4)) return 'low';
  if (!h.touch && (h.memory ?? 0) >= 8 && (h.cores ?? 0) >= 8) return 'high';
  return 'medium';
}

/** Reads DeviceHints from the browser; every field is optional and failures are ignored. */
export function readDeviceHints(gl: WebGLRenderingContext | WebGL2RenderingContext): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number };
  let gpu: string | undefined;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : undefined;
  } catch {
    gpu = undefined;
  }
  return {
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency || undefined,
    touch: window.matchMedia?.('(pointer: coarse)').matches ?? false,
    gpu,
  };
}

export class QualityGovernor {
  level: QualityLevel = 'medium';
  private mode: QualityMode = 'auto';
  /** Where auto mode starts (see initialLevel). */
  private autoStart: QualityLevel = 'medium';
  private frames = 0;
  private elapsed = 0;
  private sinceChange = 0;
  private holdFor = 0;

  constructor(private readonly onChange: (level: QualityLevel) => void) {}

  /** Starting level for auto mode; applies now if auto is active. */
  setAutoStart(level: QualityLevel): void {
    this.autoStart = level;
    if (this.mode === 'auto') this.apply(level);
  }

  setMode(mode: QualityMode): void {
    this.mode = mode;
    this.reset();
    this.apply(mode === 'auto' ? this.autoStart : mode);
  }

  /** Skip measuring for a while (stage transitions, shader warm-up). */
  hold(seconds: number): void {
    this.holdFor = Math.max(this.holdFor, seconds);
    this.frames = 0;
    this.elapsed = 0;
  }

  sample(dt: number): void {
    if (this.mode !== 'auto') return;
    if (this.holdFor > 0) {
      this.holdFor -= dt;
      return;
    }
    this.sinceChange += dt;
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < WINDOW_S) return;
    const fps = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    const i = ORDER.indexOf(this.level);
    if (fps < PANIC_FPS && i > 0) {
      this.apply(ORDER[i - 1]);
      return;
    }
    if (this.sinceChange < COOLDOWN_S) return;
    if (fps < DOWN_FPS && i > 0) this.apply(ORDER[i - 1]);
    else if (fps > UP_FPS && i < ORDER.length - 1) this.apply(ORDER[i + 1]);
  }

  private apply(level: QualityLevel): void {
    this.sinceChange = 0;
    this.level = level;
    this.onChange(level);
  }

  private reset(): void {
    this.frames = 0;
    this.elapsed = 0;
    this.sinceChange = 0;
  }
}

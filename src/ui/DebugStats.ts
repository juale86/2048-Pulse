// Dev / mock-build overlay for testing on real devices: fps, quality level, render pixel ratio,
// canvas resolution and whether post-processing is on. Never shown in the YouTube build.

const REFRESH_S = 0.5;

export interface StatsSource {
  level: () => string;
  dpr: () => number;
  post: () => boolean;
  canvas: HTMLCanvasElement;
}

export class DebugStats {
  private readonly el = document.createElement('div');
  private frames = 0;
  private elapsed = 0;

  constructor(
    root: HTMLElement,
    private readonly src: StatsSource,
  ) {
    Object.assign(this.el.style, {
      position: 'absolute',
      left: '8px',
      top: '8px',
      padding: '4px 6px',
      font: '11px/1.3 monospace',
      color: '#9f9',
      background: 'rgba(0, 0, 0, 0.55)',
      borderRadius: '4px',
      whiteSpace: 'pre',
      pointerEvents: 'none',
      zIndex: '50',
    });
    root.append(this.el);
  }

  tick(dt: number): void {
    this.frames++;
    this.elapsed += dt;
    if (this.elapsed < REFRESH_S) return;
    const fps = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    const { canvas } = this.src;
    this.el.textContent =
      `${fps.toFixed(0)} fps · ${this.src.level()}\n` +
      `dpr ${this.src.dpr().toFixed(2)}/${(window.devicePixelRatio || 1).toFixed(2)} · ${canvas.width}×${canvas.height}\n` +
      `post ${this.src.post() ? 'on' : 'off'}`;
  }
}

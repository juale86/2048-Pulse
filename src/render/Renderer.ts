import * as THREE from 'three';
import { PostFx } from './PostFx';

// WebGL renderer, camera rig, resize (0×0-safe), context loss. See docs/03-arquitectura.md §8.

/** World units that must stay visible: the 4×4 board plus margin for the HUD. */
const VIEW_WIDTH = 4.8;
const VIEW_HEIGHT = 5.6;
const TILT = THREE.MathUtils.degToRad(8);
const SWAY = THREE.MathUtils.degToRad(0.5);

type FrameCallback = (now: number, dt: number) => void;
type ResizeCallback = (width: number, height: number, dpr: number) => void;

export class Renderer {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  readonly gl: THREE.WebGLRenderer;
  readonly postFx: PostFx;
  /** Reduced effects: no camera sway or punch. */
  reduced = false;
  /** Bar phase 0..1 for the slow camera sway, set from the BeatClock. */
  swayPhase = 0;
  /** Current beat pulse (0..1), modulates bloom. */
  beat: () => number = () => 0;
  private readonly frameCbs: FrameCallback[] = [];
  private readonly resizeCbs: ResizeCallback[] = [];
  private readonly basePosition = new THREE.Vector3();
  private observer: ResizeObserver | null = null;
  private maxDpr = 2;
  private punchAmount = 0;
  private last = 0;
  private running = false;
  private contextLost = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onContextEvent: (lost: boolean) => void = () => {},
  ) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.gl.setClearColor(0x03050a, 1);
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(0x03050a);

    // Moderate light: bright stage palettes (gold, pale cyan) must stay below white before tone mapping.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 3, 6);
    this.scene.add(key);

    this.postFx = new PostFx(this.gl, this.scene, this.camera);

    canvas.addEventListener('webglcontextlost', this.lost);
    canvas.addEventListener('webglcontextrestored', this.restored);
    window.addEventListener('resize', this.resize);
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.resize);
      this.observer.observe(canvas);
    }
    this.resize();
  }

  onFrame(cb: FrameCallback): void {
    this.frameCbs.push(cb);
  }

  onResize(cb: ResizeCallback): void {
    this.resizeCbs.push(cb);
  }

  get pixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, this.maxDpr);
  }

  setMaxDpr(dpr: number): void {
    this.maxDpr = dpr;
    this.resize();
  }

  /** Zoom kick on big merges and drops. */
  punch(amount = 1): void {
    if (!this.reduced) this.punchAmount = Math.max(this.punchAmount, amount);
  }

  /** Approximate on-screen side of the 4×4 board in CSS px (for gesture thresholds). */
  boardPixels(): number {
    const h = this.canvas.clientHeight;
    const visibleH = 2 * this.basePosition.length() * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return visibleH > 0 ? (4 * h) / visibleH : 0;
  }

  /** Compiles every material in the scene (call before gameReady to avoid first-merge hitches). */
  async precompile(): Promise<void> {
    await this.gl.compileAsync(this.scene, this.camera);
    if (this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) this.postFx.render(0, 0);
  }

  /** Ignores 0×0 sizes; distance chosen so the board fits any aspect ratio. */
  private resize = (): void => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = this.pixelRatio;
    this.gl.setPixelRatio(dpr);
    this.gl.setSize(w, h, false);
    this.postFx.setSize(w, h, dpr);
    const aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = Math.max(VIEW_HEIGHT / (2 * tan), VIEW_WIDTH / (2 * tan * aspect));
    this.camera.aspect = aspect;
    this.basePosition.set(0, -d * Math.sin(TILT), d * Math.cos(TILT));
    this.camera.updateProjectionMatrix();
    for (const cb of this.resizeCbs) cb(w, h, dpr);
  };

  start(): void {
    if (this.running || this.contextLost) return;
    this.running = true;
    this.last = 0; // no giant dt after a pause
    this.gl.setAnimationLoop(this.frame);
  }

  stop(): void {
    this.running = false;
    this.gl.setAnimationLoop(null);
  }

  private frame = (now: number): void => {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    for (const cb of this.frameCbs) cb(now, dt);

    this.punchAmount *= Math.exp(-dt * 8);
    this.camera.position.copy(this.basePosition).multiplyScalar(1 - 0.02 * this.punchAmount);
    this.camera.lookAt(0, 0, 0);
    if (!this.reduced) this.camera.rotateZ(Math.sin(this.swayPhase * Math.PI * 2) * SWAY);
    if (this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) this.postFx.render(dt, this.beat());
  };

  private lost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    this.stop();
    this.onContextEvent(true);
  };

  /** three.js re-initializes GL state; resources re-upload on next use. */
  private restored = (): void => {
    this.contextLost = false;
    this.resize();
    this.onContextEvent(false);
    this.start();
  };

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.observer?.disconnect();
    this.gl.dispose();
  }
}

import * as THREE from 'three';
import type { BeatUniforms } from './BeatUniforms';

// GPU particle pool (ring buffer). Motion is computed in the vertex shader from uTime - start,
// so nothing is allocated per frame. Used for merge bursts and spawn materialization.
// See docs/03-arquitectura.md §8.

const CAPACITY = 16384;
const WHITE = new THREE.Color('#ffffff');

const vertexShader = /* glsl */ `
  attribute vec3 aOrigin;
  attribute vec3 aVel;
  attribute vec3 aColor;
  attribute vec4 aTime; // start, life, mode (0 burst fades out, 1 converge fades in), size
  uniform float uTime;
  uniform float uSize;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = (uTime - aTime.x) / aTime.y;
    if (t < 0.0 || t > 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }
    float e = 1.0 - (1.0 - t) * (1.0 - t);
    vec4 mv = modelViewMatrix * vec4(aOrigin + aVel * e, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aTime.w * (1.0 - 0.6 * t * (1.0 - aTime.z)) / -mv.z;
    vColor = aColor;
    vAlpha = mix(1.0 - t, t, aTime.z);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vAlpha;
    gl_FragColor = vec4(vColor * 2.0, a);
  }
`;

export class Particles {
  private readonly origin = new Float32Array(CAPACITY * 3);
  private readonly vel = new Float32Array(CAPACITY * 3);
  private readonly color = new Float32Array(CAPACITY * 3);
  private readonly time = new Float32Array(CAPACITY * 4).fill(-1);
  private readonly geo = new THREE.BufferGeometry();
  private readonly attrs: THREE.BufferAttribute[];
  private readonly sizeUniform = { value: 90 };
  private cursor = 0;
  private dirtyFrom = Infinity;
  private dirtyTo = -1;
  /** Quality × reduced-effects multiplier for particle counts. */
  fraction = 1;

  constructor(scene: THREE.Scene, private readonly beat: BeatUniforms) {
    this.attrs = [
      new THREE.BufferAttribute(this.origin, 3),
      new THREE.BufferAttribute(this.vel, 3),
      new THREE.BufferAttribute(this.color, 3),
      new THREE.BufferAttribute(this.time, 4),
    ];
    ['aOrigin', 'aVel', 'aColor', 'aTime'].forEach((name, i) => {
      this.attrs[i].setUsage(THREE.DynamicDrawUsage);
      this.geo.setAttribute(name, this.attrs[i]);
    });
    // position is required by three; aOrigin drives the actual placement.
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CAPACITY * 3), 3));
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: beat.uTime, uSize: this.sizeUniform },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(this.geo, mat);
    points.frustumCulled = false;
    points.position.z = 0.45;
    scene.add(points);
  }

  setPixelRatio(dpr: number): void {
    this.sizeUniform.value = 90 * dpr;
  }

  /**
   * Merge impact, three layers: a dense core, fast whitish sparks and a few large soft glows.
   * Bigger tiles give more particles and speed. `delay` in seconds.
   */
  burst(x: number, y: number, color: THREE.Color, value: number, delay = 0): void {
    const k = Math.log2(value);
    const f = this.fraction;
    const speed = 0.6 + k * 0.1;
    const spark = color.clone().lerp(WHITE, 0.55);
    for (let i = Math.round((40 + k * 16) * f); i > 0; i--) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.9);
      this.emit(x, y, 0, Math.cos(a) * s, Math.sin(a) * s, Math.random() * 0.8, color, 0.5 + Math.random() * 0.5, 0, delay, 0.8 + Math.random() * 0.6);
    }
    for (let i = Math.round((20 + k * 8) * f); i > 0; i--) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (2 + Math.random());
      this.emit(x, y, 0, Math.cos(a) * s, Math.sin(a) * s, Math.random() * 0.4, spark, 0.25 + Math.random() * 0.2, 0, delay, 0.4 + Math.random() * 0.2);
    }
    for (let i = Math.max(1, Math.round(6 * f)); i > 0; i--) {
      const a = Math.random() * Math.PI * 2;
      this.emit(x, y, 0, Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0, color, 0.4, 0, delay, 3);
    }
  }

  /** Drop / new record: a radial shockwave from the board center plus sparks. */
  shockwave(color: THREE.Color, delay = 0): void {
    const f = this.fraction;
    const spark = color.clone().lerp(WHITE, 0.6);
    for (let i = Math.round(260 * f); i > 0; i--) {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 2;
      this.emit(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.5) * 0.6, color, 0.9, 0, delay, 1);
    }
    for (let i = Math.round(120 * f); i > 0; i--) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      this.emit(0, 0, 0, Math.cos(a) * s, Math.sin(a) * s, Math.random() * 2, spark, 0.6 + Math.random() * 0.5, 0, delay, 0.5);
    }
  }

  /** Particles converging on a cell (spawn). `delay` in seconds. */
  converge(x: number, y: number, color: THREE.Color, delay = 0): void {
    for (let i = Math.round(20 * this.fraction); i > 0; i--) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 0.4;
      const ox = Math.cos(a) * r;
      const oy = Math.sin(a) * r;
      this.emit(x + ox, y + oy, 0.2, -ox, -oy, -0.2, color, 0.12 + Math.random() * 0.06, 1, delay, 0.8);
    }
  }

  /** Uploads only the range written since the last frame. */
  flush(): void {
    if (this.dirtyTo < 0) return;
    for (const a of this.attrs) {
      a.clearUpdateRanges();
      a.addUpdateRange(this.dirtyFrom * a.itemSize, (this.dirtyTo - this.dirtyFrom + 1) * a.itemSize);
      a.needsUpdate = true;
    }
    this.dirtyFrom = Infinity;
    this.dirtyTo = -1;
  }

  private emit(
    x: number, y: number, z: number, vx: number, vy: number, vz: number,
    c: THREE.Color, life: number, mode: number, delay: number, size: number,
  ): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % CAPACITY;
    if (i === 0 && this.dirtyTo >= 0) {
      // Wrapped around: upload everything this frame.
      this.dirtyFrom = 0;
      this.dirtyTo = CAPACITY - 1;
    }
    this.origin.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.color.set([c.r, c.g, c.b], i * 3);
    this.time.set([this.beat.uTime.value + delay, life, mode, size], i * 4);
    this.dirtyFrom = Math.min(this.dirtyFrom, i);
    this.dirtyTo = Math.max(this.dirtyTo, i);
  }
}

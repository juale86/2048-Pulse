import * as THREE from 'three';
import type { BeatUniforms } from '../BeatUniforms';

// Shared pieces for stage environments: the Environment contract, additive point materials,
// and presence (0 = dispersed, 1 = assembled) used by stage transitions. See docs/02-audio-visual.md §6.

export interface Environment {
  readonly group: THREE.Group;
  update(dt: number): void;
  setPixelRatio(dpr: number): void;
  /** Quality × reduced-effects multiplier for particle counts. */
  setFraction(f: number): void;
  setPalette(palette: readonly string[]): void;
  /** 0 = fully dispersed (invisible), 1 = assembled. */
  setPresence(p: number): void;
  onMerge?(x: number, y: number, value: number): void;
  onDrop?(): void;
}

/** GLSL: uniform + helper pushing points outward and fading them as presence drops. */
export const PRESENCE_GLSL = /* glsl */ `
  uniform float uPresence;
  vec3 disperse(vec3 p, float seed) {
    vec3 dir = normalize(p + vec3(0.001, 0.002, 0.003));
    return p + dir * (1.0 - uPresence) * (4.0 + seed * 6.0);
  }
`;

export const SOFT_POINT_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vAlpha;
    gl_FragColor = vec4(vColor * 1.5, a);
  }
`;

export function additive(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function points(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Points {
  const p = new THREE.Points(geometry, material);
  p.frustumCulled = false;
  return p;
}

/** Random positions in a box plus a vec4 of random seeds per point. */
export function scatter(count: number, size: [number, number, number], center: [number, number, number]): THREE.BufferGeometry {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos.set([center[0] + (Math.random() - 0.5) * size[0], center[1] + (Math.random() - 0.5) * size[1], center[2] + (Math.random() - 0.5) * size[2]], i * 3);
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  return g;
}

/**
 * Base class: owns the group, size/presence/palette uniforms and the particle budget.
 * Subclasses register their point clouds with `budget()` so setFraction can trim them.
 */
export abstract class BaseEnvironment implements Environment {
  readonly group = new THREE.Group();
  protected readonly sizeUniform = { value: 60 };
  protected readonly presenceUniform = { value: 0 };
  protected readonly colors = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  private readonly budgets: { geo: THREE.BufferGeometry; count: number }[] = [];

  constructor(
    scene: THREE.Scene,
    protected readonly beat: BeatUniforms,
    palette: readonly string[],
  ) {
    this.setPalette(palette);
    this.group.visible = false;
    scene.add(this.group);
  }

  /** Common uniforms every environment shader can use. */
  protected uniforms(extra: Record<string, THREE.IUniform> = {}): Record<string, THREE.IUniform> {
    return {
      uTime: this.beat.uTime,
      uBeat: this.beat.uBeat,
      uBar: this.beat.uBar,
      uAccent: this.beat.uAccent,
      uSection: this.beat.uSection,
      uSize: this.sizeUniform,
      uPresence: this.presenceUniform,
      uColorA: { value: this.colors[0] },
      uColorB: { value: this.colors[1] },
      uColorC: { value: this.colors[2] },
      ...extra,
    };
  }

  protected budget(geo: THREE.BufferGeometry, count: number): void {
    this.budgets.push({ geo, count });
  }

  setPixelRatio(dpr: number): void {
    this.sizeUniform.value = 60 * dpr;
  }

  setFraction(f: number): void {
    for (const b of this.budgets) b.geo.setDrawRange(0, Math.max(1, Math.round(b.count * f)));
  }

  setPalette(palette: readonly string[]): void {
    palette.forEach((c, i) => this.colors[i].set(c));
  }

  setPresence(p: number): void {
    this.presenceUniform.value = p;
    this.group.visible = p > 0.001;
  }

  abstract update(dt: number): void;
}

import * as THREE from 'three';
import type { BeatUniforms } from '../BeatUniforms';
import { additive, BaseEnvironment, points, PRESENCE_GLSL, scatter, SOFT_POINT_FRAGMENT } from './common';

// Stage 6: cosmos — rotating spiral nebula, twinkling stars, and a cosmic manta made of particles.
// See docs/02-audio-visual.md §5 (Cosmos).

const NEBULA = 3200;
const STARS = 1400;
const MANTA = 900;

const nebulaVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uBeat, uSize, uSection, uAccent;
  uniform vec3 uColorA, uColorB, uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = 1.0 + aSeed.x * 11.0;
    float arm = floor(aSeed.y * 3.0) * 2.094;
    float ang = arm + r * 0.45 + uTime * (0.02 + 0.04 / r) + (aSeed.z - 0.5) * 0.8;
    vec3 p = vec3(cos(ang) * r, sin(ang) * r * 0.55, -12.0 + (aSeed.w - 0.5) * 3.0);
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed.w * 1.4) * (1.0 + 0.4 * uBeat) / -mv.z;
    vColor = aSeed.x < 0.33 ? mix(uColorB, uColorA, aSeed.x * 3.0) : mix(uColorA, uColorC, (aSeed.x - 0.33) * 1.5);
    vAlpha = uPresence * (0.18 + 0.1 * uSection + 0.4 * uAccent) * (1.0 - aSeed.x * 0.5);
  }
`;

const starVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uSize;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(disperse(position, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.3 + aSeed.w * 0.5) / -mv.z;
    vColor = vec3(1.0);
    vAlpha = uPresence * (0.3 + 0.7 * smoothstep(-1.0, 1.0, sin(uTime * (0.5 + aSeed.x * 2.0) + aSeed.y * 40.0)));
  }
`;

const mantaVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uBeat, uSize;
  uniform vec3 uCenter, uColorC, uColorB;
  uniform float uHeading;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float wing = abs(p.x);
    p.y += sin(uTime * 1.6 - wing * 0.9) * wing * 0.35 * (1.0 + 0.5 * uBeat);
    float c = cos(uHeading), s = sin(uHeading);
    p.xz = vec2(c * p.x - s * p.z, s * p.x + c * p.z);
    vec4 mv = modelViewMatrix * vec4(disperse(p + uCenter, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.7 + aSeed.w * 0.6) * (1.0 + 0.5 * uBeat) / -mv.z;
    vColor = mix(uColorC, uColorB, wing / 3.0);
    vAlpha = uPresence * 0.6;
  }
`;

/** Diamond-shaped body with swept wings and a thin tail, in local space facing -z. */
function mantaGeometry(): THREE.BufferGeometry {
  const pos = new Float32Array(MANTA * 3);
  const seed = new Float32Array(MANTA * 4);
  for (let i = 0; i < MANTA; i++) {
    let x: number;
    let z: number;
    if (i < MANTA * 0.9) {
      x = (Math.random() * 2 - 1) * 3;
      const span = 1.4 * (1 - Math.abs(x) / 3);
      z = (Math.random() * 2 - 1) * span + Math.abs(x) * 0.4;
    } else {
      x = (Math.random() - 0.5) * 0.08;
      z = 1.2 + Math.random() * 2.5;
    }
    pos.set([x, (Math.random() - 0.5) * 0.08, z], i * 3);
    seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  return g;
}

export class CosmosEnvironment extends BaseEnvironment {
  private readonly center = new THREE.Vector3();
  private readonly heading = { value: 0 };
  private angle = 0;

  constructor(scene: THREE.Scene, beat: BeatUniforms, palette: readonly string[]) {
    super(scene, beat, palette);
    const nebula = scatter(NEBULA, [1, 1, 1], [0, 0, 0]);
    this.group.add(points(nebula, additive(nebulaVertex, SOFT_POINT_FRAGMENT, this.uniforms())));
    this.budget(nebula, NEBULA);

    const stars = scatter(STARS, [50, 34, 10], [0, 0, -18]);
    this.group.add(points(stars, additive(starVertex, SOFT_POINT_FRAGMENT, this.uniforms())));
    this.budget(stars, STARS);

    const manta = mantaGeometry();
    this.group.add(points(manta, additive(mantaVertex, SOFT_POINT_FRAGMENT, this.uniforms({ uCenter: { value: this.center }, uHeading: this.heading }))));
    this.budget(manta, MANTA);
  }

  update(dt: number): void {
    // Slow elliptical orbit behind the board, heading along the path.
    this.angle += dt * 0.08 * (1 + this.beat.uBeat.value * 0.5);
    this.center.set(Math.cos(this.angle) * 7, Math.sin(this.angle * 2) * 1.5 + 1, -8 + Math.sin(this.angle) * 3);
    this.heading.value = -this.angle + Math.PI / 2;
  }
}

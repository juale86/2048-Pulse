import * as THREE from 'three';
import type { BeatUniforms } from '../BeatUniforms';
import { additive, BaseEnvironment, points, PRESENCE_GLSL, scatter, SOFT_POINT_FRAGMENT } from './common';

// Stage 2: desert dawn — swirling sand, dune waves of light, a sun that rises with the sections.
// See docs/02-audio-visual.md §5 (Dunas).

const SAND = 2200;
const DUNE_W = 70;
const DUNE_D = 22;

const sandVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uBeat, uAccent, uSection, uSize;
  uniform vec3 uColorA, uColorB;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(position.xz - vec2(0.0, -7.0));
    float ang = atan(position.z + 7.0, position.x) + uTime * (0.05 + 0.25 / (1.0 + r)) * (1.0 + 0.6 * uSection);
    vec3 p = vec3(cos(ang) * r, position.y + sin(uTime * 0.6 + aSeed.x * 6.283) * 0.4, sin(ang) * r - 7.0);
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.3 + aSeed.w * 0.6) * (1.0 + 0.4 * uBeat) / -mv.z;
    vColor = mix(uColorA, uColorB, aSeed.y);
    vAlpha = uPresence * (0.3 + 0.5 * uAccent + 0.15 * uSection);
  }
`;

const duneVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  uniform float uTime, uBar, uSize;
  uniform vec3 uColorA, uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += sin(p.x * 0.35 + uTime * 0.15) * 0.6 + sin(p.z * 0.5 + p.x * 0.1) * 0.4;
    vec4 mv = modelViewMatrix * vec4(disperse(p, fract(p.x * 0.37)), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * 1.1 / -mv.z;
    float depth = clamp((-p.z - 3.0) / 20.0, 0.0, 1.0);
    vColor = mix(uColorA, uColorC, depth);
    vAlpha = uPresence * (0.55 + 0.3 * uBar) * (1.0 - depth * 0.5);
  }
`;

const sunVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragment = /* glsl */ `
  uniform float uPresence, uBeat;
  uniform vec3 uColorB, uColorC;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = smoothstep(0.45, 0.4, d);
    float glow = smoothstep(1.0, 0.2, d) * 0.5;
    vec3 col = mix(uColorC, uColorB, smoothstep(0.6, 0.0, d));
    gl_FragColor = vec4(col * (0.8 + 0.2 * uBeat), (core + glow) * uPresence * 0.55);
  }
`;

export class DunasEnvironment extends BaseEnvironment {
  private readonly sun: THREE.Mesh;

  constructor(scene: THREE.Scene, beat: BeatUniforms, palette: readonly string[]) {
    super(scene, beat, palette);
    const sand = scatter(SAND, [22, 12, 14], [0, 0, -7]);
    this.group.add(points(sand, additive(sandVertex, SOFT_POINT_FRAGMENT, this.uniforms())));
    this.budget(sand, SAND);

    const pos: number[] = [];
    for (let x = 0; x < DUNE_W; x++) for (let z = 0; z < DUNE_D; z++) pos.push((x / DUNE_W - 0.5) * 34, -4.5, -3 - z * 0.9);
    const dunes = new THREE.BufferGeometry();
    dunes.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.group.add(points(dunes, additive(duneVertex, SOFT_POINT_FRAGMENT, this.uniforms())));
    // Not budgeted: the dune field is the stage's silhouette and must survive low quality.

    // The sun rises above the board (never behind its center, where it would wash out the tiles).
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), additive(sunVertex, sunFragment, this.uniforms()));
    this.sun.position.set(6.5, 4, -16);
    this.group.add(this.sun);
  }

  update(dt: number): void {
    const targetY = 4 + this.beat.uSection.value * 2.5;
    this.sun.position.y += (targetY - this.sun.position.y) * Math.min(1, dt * 0.4);
  }
}

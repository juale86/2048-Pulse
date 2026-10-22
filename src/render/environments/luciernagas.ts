import * as THREE from 'three';
import type { BeatUniforms } from '../BeatUniforms';
import { additive, BaseEnvironment, points, PRESENCE_GLSL, scatter, SOFT_POINT_FRAGMENT } from './common';

// Stage 4: night forest — blinking fireflies that swarm toward each merge, faint trunks, low mist.
// See docs/02-audio-visual.md §5 (Luciérnagas).

const FIREFLIES = 700;
const MIST = 60;
const TRUNKS = 26;

const fireflyVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uBeat, uSize, uAttract, uSection;
  uniform vec3 uTarget, uColorB, uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p += vec3(sin(uTime * 0.4 + aSeed.x * 9.0), cos(uTime * 0.33 + aSeed.y * 9.0), sin(uTime * 0.27 + aSeed.z * 9.0)) * 0.8;
    vec3 orbit = uTarget + vec3(cos(uTime * 2.0 + aSeed.x * 6.283), sin(uTime * 2.0 + aSeed.y * 6.283), 0.4) * (0.4 + aSeed.z * 0.8);
    p = mix(p, orbit, uAttract * step(0.55, aSeed.w));
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed.w * 0.8) * (1.0 + 0.5 * uBeat) / -mv.z;
    vColor = mix(uColorB, uColorC, aSeed.y);
    float blink = smoothstep(0.2, 1.0, sin(uTime * (1.0 + aSeed.x * 2.0) + aSeed.z * 30.0));
    vAlpha = uPresence * blink * (0.5 + 0.2 * uSection);
  }
`;

const mistVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uSize;
  uniform vec3 uColorA;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position + vec3(sin(uTime * 0.05 + aSeed.x * 6.283) * 2.0, 0.0, 0.0);
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * 14.0 / -mv.z;
    vColor = uColorA;
    vAlpha = uPresence * 0.05;
  }
`;

const trunkVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  uniform vec3 uColorA;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(disperse(position, 0.3), 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = uColorA * 0.5;
    vAlpha = uPresence * 0.25;
  }
`;

const lineFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(vColor, vAlpha); }
`;

export class LuciernagasEnvironment extends BaseEnvironment {
  private readonly target = new THREE.Vector3();
  private readonly attract = { value: 0 };

  constructor(scene: THREE.Scene, beat: BeatUniforms, palette: readonly string[]) {
    super(scene, beat, palette);
    const flies = scatter(FIREFLIES, [22, 13, 10], [0, 0, -5]);
    this.group.add(points(flies, additive(fireflyVertex, SOFT_POINT_FRAGMENT, this.uniforms({ uTarget: { value: this.target }, uAttract: this.attract }))));
    this.budget(flies, FIREFLIES);

    const mist = scatter(MIST, [30, 2, 12], [0, -4, -9]);
    this.group.add(points(mist, additive(mistVertex, SOFT_POINT_FRAGMENT, this.uniforms())));

    const pos: number[] = [];
    for (let i = 0; i < TRUNKS; i++) {
      const x = (Math.random() - 0.5) * 30;
      const z = -5 - Math.random() * 12;
      const lean = (Math.random() - 0.5) * 0.8;
      pos.push(x, -6, z, x + lean, 9, z);
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const trunks = new THREE.LineSegments(tg, additive(trunkVertex, lineFragment, this.uniforms()));
    trunks.frustumCulled = false;
    this.group.add(trunks);
  }

  /** Part of the swarm flies to the merged tile and orbits it for a moment. */
  onMerge(x: number, y: number): void {
    this.target.set(x, y, 0.5);
    this.attract.value = 1;
  }

  update(dt: number): void {
    this.attract.value *= Math.exp(-dt * 0.9);
  }
}

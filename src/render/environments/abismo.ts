import * as THREE from 'three';
import type { BeatUniforms } from '../BeatUniforms';
import { additive, BaseEnvironment, points, PRESENCE_GLSL, scatter, SOFT_POINT_FRAGMENT } from './common';

// Stage 1 environment: bioluminescent plankton, particle jellyfish, light rays in section 3.
// See docs/02-audio-visual.md §5 (Abismo).

const PLANKTON = 1800;
const JELLIES = 3;

const planktonVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uBeat, uAccent, uSection, uSize;
  uniform vec3 uColorB, uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + 7.0 + uTime * (0.04 + aSeed.y * 0.08), 14.0) - 7.0;
    p.x += sin(uTime * 0.25 + aSeed.x * 6.283) * 0.35;
    p.z += cos(uTime * 0.2 + aSeed.z * 6.283) * 0.25;
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.5 + aSeed.w) * (1.0 + 0.5 * uBeat) / -mv.z;
    vColor = mix(uColorB, uColorC, aSeed.x);
    vAlpha = uPresence * (0.25 + 0.2 * uSection + 0.6 * uAccent) * (0.5 + 0.5 * sin(uTime * 1.3 + aSeed.y * 20.0));
  }
`;

const jellyVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute float aTentacle; // 0 bell, 1 tentacle
  attribute float aPhase;
  uniform float uTime, uBeat, uSize;
  uniform vec3 uCenter, uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.xz *= mix(1.0 + 0.14 * uBeat, 1.0, aTentacle);
    p.y *= mix(1.0 - 0.08 * uBeat, 1.0, aTentacle);
    p.x += aTentacle * sin(uTime * 1.5 + p.y * 2.0 + aPhase) * 0.1 * -p.y;
    vec4 mv = modelViewMatrix * vec4(disperse(p + uCenter, aPhase * 0.1), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + 0.4 * uBeat) / -mv.z;
    vColor = uColorC;
    vAlpha = uPresence * mix(0.75, 0.4, aTentacle);
  }
`;

const rayVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rayFragment = /* glsl */ `
  uniform float uRays, uTime, uPresence;
  uniform vec3 uColorC;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
    float a = vUv.y * vUv.y * edge * uRays * uPresence * (0.08 + 0.03 * sin(uTime * 0.7));
    gl_FragColor = vec4(uColorC, a);
  }
`;

function jellyGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const tentacle: number[] = [];
  const phase: number[] = [];
  for (let i = 0; i < 260; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(Math.random()); // upper hemisphere
    pos.push(Math.sin(v) * Math.cos(u) * 0.6, Math.cos(v) * 0.45, Math.sin(v) * Math.sin(u) * 0.6);
    tentacle.push(0);
    phase.push(0);
  }
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    for (let j = 0; j < 22; j++) {
      pos.push(Math.cos(a) * 0.4, -j * 0.075, Math.sin(a) * 0.4);
      tentacle.push(1);
      phase.push(s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTentacle', new THREE.Float32BufferAttribute(tentacle, 1));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  return g;
}

export class AbismoEnvironment extends BaseEnvironment {
  private readonly jellies: { center: THREE.Vector3; speed: number; x: number }[] = [];
  private readonly raysUniform = { value: 0 };

  constructor(scene: THREE.Scene, beat: BeatUniforms, palette: readonly string[]) {
    super(scene, beat, palette);
    const pg = scatter(PLANKTON, [20, 14, 10], [0, 0, -6.5]);
    this.group.add(points(pg, additive(planktonVertex, SOFT_POINT_FRAGMENT, this.uniforms())));
    this.budget(pg, PLANKTON);

    const jg = jellyGeometry();
    for (let i = 0; i < JELLIES; i++) {
      const center = new THREE.Vector3((i - 1) * 5, -6 + i * 4.5, -6 - i * 1.5);
      this.group.add(points(jg, additive(jellyVertex, SOFT_POINT_FRAGMENT, this.uniforms({ uCenter: { value: center } }))));
      this.jellies.push({ center, speed: 0.12 + Math.random() * 0.1, x: center.x + (Math.random() - 0.5) * 2 });
    }

    const rayMat = additive(rayVertex, rayFragment, this.uniforms({ uRays: this.raysUniform }));
    rayMat.side = THREE.DoubleSide;
    const rayGeo = new THREE.PlaneGeometry(1.6, 16);
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(rayGeo, rayMat);
      r.position.set(-4.5 + i * 3, 2, -7);
      r.rotation.z = 0.25 - i * 0.05;
      this.group.add(r);
    }
  }

  update(dt: number): void {
    const target = this.beat.uSection.value >= 1.5 ? 1 : 0;
    this.raysUniform.value += (target - this.raysUniform.value) * Math.min(1, dt * 0.5);
    for (const j of this.jellies) {
      j.center.y += j.speed * dt * (1 + this.beat.uBeat.value);
      if (j.center.y > 8) j.center.y = -8;
      j.center.x = j.x + Math.sin(this.beat.uTime.value * 0.1 + j.speed * 30) * 0.8;
    }
  }
}

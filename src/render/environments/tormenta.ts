import * as THREE from 'three';
import type { BeatUniforms } from '../BeatUniforms';
import { additive, BaseEnvironment, points, PRESENCE_GLSL, scatter, SOFT_POINT_FRAGMENT } from './common';

// Stage 5: storm — churning cloud slab, slanted rain, lightning bolts synced to drops.
// See docs/02-audio-visual.md §5 (Tormenta).

const CLOUD = 2600;
const RAIN = 1800;
const BOLT_SEGMENTS = 18;

const cloudVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uBeat, uSize, uFlash, uSection;
  uniform vec3 uColorA, uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.3 + p.z * 0.4 + aSeed.x * 6.283) * 0.9;
    p.y += cos(uTime * 0.25 + p.x * 0.3) * 0.5;
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (2.0 + aSeed.w * 3.0) / -mv.z;
    vColor = mix(uColorC, uColorA, aSeed.y) * (0.5 + 2.5 * uFlash);
    vAlpha = uPresence * (0.08 + 0.05 * uSection + 0.4 * uFlash) * (0.6 + 0.4 * uBeat);
  }
`;

const rainVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute vec4 aSeed;
  uniform float uTime, uSize, uSection;
  uniform vec3 uColorB;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float fall = mod(p.y - uTime * (7.0 + aSeed.y * 4.0) + 8.0, 16.0) - 8.0;
    p.x += (fall - p.y) * -0.25;
    p.y = fall;
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * 0.35 / -mv.z;
    vColor = uColorB;
    vAlpha = uPresence * (0.2 + 0.2 * uSection) * aSeed.x;
  }
`;

const boltVertex = /* glsl */ `
  uniform float uFlash, uPresence;
  uniform vec3 uColorB;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vColor = uColorB * 3.0;
    vAlpha = uPresence * smoothstep(0.3, 0.9, uFlash);
  }
`;

const lineFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(vColor, vAlpha); }
`;

export class TormentaEnvironment extends BaseEnvironment {
  private readonly flash = { value: 0 };
  private readonly boltGeo = new THREE.BufferGeometry();
  private readonly boltPos = new Float32Array(BOLT_SEGMENTS * 2 * 3);

  constructor(scene: THREE.Scene, beat: BeatUniforms, palette: readonly string[]) {
    super(scene, beat, palette);
    const cloud = scatter(CLOUD, [34, 5, 16], [0, 6, -10]);
    this.group.add(points(cloud, additive(cloudVertex, SOFT_POINT_FRAGMENT, this.uniforms({ uFlash: this.flash }))));
    this.budget(cloud, CLOUD);

    const rain = scatter(RAIN, [26, 16, 14], [0, 0, -7]);
    this.group.add(points(rain, additive(rainVertex, SOFT_POINT_FRAGMENT, this.uniforms())));
    this.budget(rain, RAIN);

    this.boltGeo.setAttribute('position', new THREE.BufferAttribute(this.boltPos, 3));
    const bolt = new THREE.LineSegments(this.boltGeo, additive(boltVertex, lineFragment, this.uniforms({ uFlash: this.flash })));
    bolt.frustumCulled = false;
    this.group.add(bolt);
  }

  /** Lightning on every drop: new jagged bolt + cloud flash. */
  onDrop(): void {
    let x = (Math.random() - 0.5) * 16;
    let y = 6;
    const z = -9 - Math.random() * 4;
    for (let i = 0; i < BOLT_SEGMENTS; i++) {
      const nx = x + (Math.random() - 0.5) * 1.6;
      const ny = y - 0.7 - Math.random() * 0.3;
      this.boltPos.set([x, y, z, nx, ny, z], i * 6);
      x = nx;
      y = ny;
    }
    this.boltGeo.attributes.position.needsUpdate = true;
    this.flash.value = 1;
  }

  update(dt: number): void {
    this.flash.value *= Math.exp(-dt * 5);
  }
}

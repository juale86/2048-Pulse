import * as THREE from 'three';
import type { BeatUniforms } from '../BeatUniforms';
import { additive, BaseEnvironment, points, PRESENCE_GLSL, scatter, SOFT_POINT_FRAGMENT } from './common';

// Stage 3: night city — wireframe skyscrapers that flash on the bar, light rain, a scrolling grid floor.
// See docs/02-audio-visual.md §5 (Neón).

const RAIN = 1600;
const BUILDINGS = 40;

const lineVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute float aShade;
  uniform float uTime, uBar, uAccent;
  uniform vec3 uColorA, uColorB;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(disperse(position, aShade), 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = mix(uColorA, uColorB, aShade);
    vAlpha = uPresence * (0.25 + 0.45 * uBar * step(0.5, fract(aShade * 7.0 + floor(uTime * 0.5) * 0.37)) + 0.3 * uAccent);
  }
`;

const lineFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(vColor * 1.6, vAlpha); }
`;

const floorVertex = /* glsl */ `
  ${PRESENCE_GLSL}
  attribute float aScroll; // 1 for horizontal lines that scroll toward the camera
  uniform float uTime, uBeat;
  uniform vec3 uColorC;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.z = mix(p.z, mod(position.z + uTime * 2.0, 22.0) - 22.0, aScroll);
    vec4 mv = modelViewMatrix * vec4(disperse(p, 0.5), 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = uColorC;
    vAlpha = uPresence * (0.3 + 0.3 * uBeat) * clamp((p.z + 22.0) / 10.0, 0.0, 1.0);
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
    p.y = mod(p.y - uTime * (4.0 + aSeed.y * 3.0) + 8.0, 16.0) - 8.0;
    vec4 mv = modelViewMatrix * vec4(disperse(p, aSeed.w), 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * 0.35 / -mv.z;
    vColor = uColorB;
    vAlpha = uPresence * (0.25 + 0.25 * uSection) * aSeed.x;
  }
`;

function buildingLines(): THREE.BufferGeometry {
  const pos: number[] = [];
  const shade: number[] = [];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let i = 0; i < BUILDINGS; i++) {
    const w = 0.8 + Math.random() * 1.6;
    const h = 2 + Math.random() * 9;
    const x = (Math.random() - 0.5) * 30;
    const z = -6 - Math.random() * 14;
    const y0 = -4.5;
    const c = [
      [x, y0, z], [x + w, y0, z], [x + w, y0, z + w], [x, y0, z + w],
      [x, y0 + h, z], [x + w, y0 + h, z], [x + w, y0 + h, z + w], [x, y0 + h, z + w],
    ];
    const s = Math.random();
    for (const [a, b] of edges) {
      pos.push(...c[a], ...c[b]);
      shade.push(s, s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aShade', new THREE.Float32BufferAttribute(shade, 1));
  return g;
}

function floorLines(): THREE.BufferGeometry {
  const pos: number[] = [];
  const scroll: number[] = [];
  for (let i = 0; i < 22; i++) {
    pos.push(-16, -4.5, -i, 16, -4.5, -i);
    scroll.push(1, 1);
  }
  for (let i = -8; i <= 8; i++) {
    pos.push(i * 2, -4.5, 0, i * 6, -4.5, -22);
    scroll.push(0, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aScroll', new THREE.Float32BufferAttribute(scroll, 1));
  return g;
}

export class NeonEnvironment extends BaseEnvironment {
  constructor(scene: THREE.Scene, beat: BeatUniforms, palette: readonly string[]) {
    super(scene, beat, palette);
    const lines = new THREE.LineSegments(buildingLines(), additive(lineVertex, lineFragment, this.uniforms()));
    lines.frustumCulled = false;
    this.group.add(lines);

    const floor = new THREE.LineSegments(floorLines(), additive(floorVertex, lineFragment, this.uniforms()));
    floor.frustumCulled = false;
    this.group.add(floor);

    const rain = scatter(RAIN, [24, 16, 14], [0, 0, -8]);
    this.group.add(points(rain, additive(rainVertex, SOFT_POINT_FRAGMENT, this.uniforms())));
    this.budget(rain, RAIN);
  }

  update(): void {}
}

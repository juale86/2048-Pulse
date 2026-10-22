import * as THREE from 'three';

// Floating emissive grid whose glow pulses on each bar. See docs/02-audio-visual.md §4.
export class BoardView {
  private readonly mat: THREE.LineBasicMaterial;
  private readonly target = new THREE.Color(0x33e0ff);

  constructor(scene: THREE.Scene, size: number) {
    const half = size / 2;
    const pts: number[] = [];
    for (let i = 0; i <= size; i++) {
      const p = i - half;
      pts.push(-half, p, 0, half, p, 0, p, -half, 0, p, half, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.mat = new THREE.LineBasicMaterial({ color: 0x33e0ff, transparent: true, opacity: 0.35 });
    scene.add(new THREE.LineSegments(geo, this.mat));
  }

  /** Grid color eases toward the stage color. */
  setColor(color: string): void {
    this.target.set(color);
  }

  pulse(bar: number, dt: number): void {
    this.mat.opacity = 0.35 + 0.35 * bar;
    this.mat.color.lerp(this.target, Math.min(1, dt * 1.5));
  }
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Cell, GameEvent, Tile } from '../core/types';

// Tiles: rounded emissive cubes with a number label, slide/pop/spawn animations.
// See docs/02-audio-visual.md §4. TODO: pooling, number atlas.

const SLIDE_MS = 90;
const POP_MS = 150;
const SPAWN_MS = 120;
const TILE = 0.86;
const DEPTH = 0.4;

const WHITE = new THREE.Color('#ffffff');

/** Traditional 2048 colors for the "classic palette" accessibility option. */
const CLASSIC: Record<number, string> = {
  2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b',
  128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
};

interface Anim {
  start: number;
  duration: number;
  update(t: number): void;
  done?(): void;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** WCAG relative luminance; three.js Colors are stored in linear space. */
function relativeLuminance(c: THREE.Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/**
 * Tile colors never go brighter than this relative luminance: a near-white tile (Cosmos' white)
 * lit by the key light crossed the bloom threshold and washed its number out.
 */
const MAX_TILE_LUMINANCE = 0.62;

function capLuminance(c: THREE.Color): THREE.Color {
  const l = relativeLuminance(c);
  return l > MAX_TILE_LUMINANCE ? c.multiplyScalar(MAX_TILE_LUMINANCE / l) : c;
}

/**
 * Number colors: deep burgundy on light tiles, pale rose (a very light burgundy) on dark ones;
 * each label takes whichever reads better (WCAG contrast). Pure white text crossed the bloom
 * threshold and got a blurry halo, so the light color is also dimmed below it.
 */
const TEXT_DARK = new THREE.Color('#4a0e22');
const TEXT_LIGHT = new THREE.Color('#f2c4d0');
/** Keeps the light text's luminance (≈0.63 linear) under the bloom threshold (0.6). */
const LIGHT_TEXT_GAIN = 0.85;

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Stage palette (3 colors, low → high) interpolated by log2(value). */
function paletteColor(palette: THREE.Color[], value: number): THREE.Color {
  const k = Math.log2(value);
  const t = Math.min(1, Math.max(0, (k - 1) / 10)); // 2 → 0, 2048 → 1
  const c = t < 0.5 ? palette[0].clone().lerp(palette[1], t * 2) : palette[1].clone().lerp(palette[2], (t - 0.5) * 2);
  if (k > 11) c.lerp(WHITE, Math.min(0.8, (k - 11) / 6)); // beyond 2048 drift toward white
  return c;
}

export class TileView {
  private readonly root = new THREE.Group();
  private readonly meshes = new Map<number, THREE.Group>();
  private readonly materials = new Map<number, THREE.MeshStandardMaterial>();
  private readonly labels = new Map<number, THREE.MeshBasicMaterial>();
  private readonly boxGeo = new RoundedBoxGeometry(TILE, TILE, DEPTH, 4, 0.12);
  private readonly labelGeo = new THREE.PlaneGeometry(TILE * 0.92, TILE * 0.92);
  private anims: Anim[] = [];
  private palette: THREE.Color[];
  private classic = false;
  private paletteFade: { from: THREE.Color[]; to: THREE.Color[]; t: number; seconds: number } | null = null;

  constructor(scene: THREE.Scene, private readonly size: number, palette: readonly string[]) {
    this.palette = palette.map((c) => new THREE.Color(c));
    this.root.position.z = DEPTH / 2;
    scene.add(this.root);
  }

  colorOf(value: number): THREE.Color {
    if (this.classic) return new THREE.Color(CLASSIC[value] ?? '#3c3a32');
    return capLuminance(paletteColor(this.palette, value));
  }

  /** Switches between the stage palette and the classic 2048 colors. */
  setClassic(classic: boolean): void {
    if (classic === this.classic) return;
    this.classic = classic;
    this.rebuildMaterials();
  }

  /** Cross-fades tile colors to a new stage palette over `seconds` (0 = instant). */
  setPalette(palette: readonly string[], seconds = 0): void {
    const to = palette.map((c) => new THREE.Color(c));
    if (seconds <= 0) {
      this.paletteFade = null;
      this.palette = to;
      this.rebuildMaterials();
      return;
    }
    this.paletteFade = { from: this.palette.map((c) => c.clone()), to, t: 0, seconds };
  }

  /** Advances the palette cross-fade. */
  tick(dt: number): void {
    const f = this.paletteFade;
    if (!f) return;
    f.t = Math.min(1, f.t + dt / f.seconds);
    this.palette = f.from.map((c, i) => c.clone().lerp(f.to[i], f.t));
    if (f.t >= 1) {
      this.paletteFade = null;
      this.rebuildMaterials(); // labels pick their text color from the final palette
      return;
    }
    if (this.classic) return;
    for (const [value, m] of this.materials) {
      const c = this.colorOf(value);
      m.color.copy(c);
      m.emissive.copy(c);
    }
  }

  private rebuildMaterials(): void {
    for (const m of this.materials.values()) m.dispose();
    for (const m of this.labels.values()) {
      m.map?.dispose();
      m.dispose();
    }
    this.materials.clear();
    this.labels.clear();
    for (const g of this.meshes.values()) {
      const value = g.userData.value as number;
      (g.children[0] as THREE.Mesh).material = this.material(value);
      (g.children[1] as THREE.Mesh).material = this.label(value);
    }
  }

  /** Rebuilds every tile from state, dropping pending animations (new game / restore). */
  sync(tiles: readonly Tile[]): void {
    this.anims = [];
    for (const g of this.meshes.values()) this.root.remove(g);
    this.meshes.clear();
    for (const t of tiles) this.create(t.id, t.value, t);
  }

  /** Starts animations for one move's events. Call finishAll() first so nothing overlaps. */
  apply(events: readonly GameEvent[], now: number): void {
    for (const e of events) {
      if (e.type === 'Moved') {
        for (const m of e.moves) {
          const g = this.meshes.get(m.id);
          if (!g || (m.from.row === m.to.row && m.from.col === m.to.col)) continue;
          const from = g.position.clone();
          const to = this.cellPosition(m.to);
          this.anims.push({ start: now, duration: SLIDE_MS, update: (t) => g.position.lerpVectors(from, to, easeOut(t)) });
        }
      } else if (e.type === 'Merged') {
        const consumed = e.consumedIds.map((id) => this.meshes.get(id));
        const merged = this.create(e.newId, e.value, e.into);
        merged.visible = false;
        this.anims.push({
          start: now,
          duration: SLIDE_MS,
          update: () => {},
          done: () => {
            for (const [i, g] of consumed.entries()) {
              if (g) this.root.remove(g);
              this.meshes.delete(e.consumedIds[i]);
            }
          },
        });
        this.anims.push({
          start: now + SLIDE_MS,
          duration: POP_MS,
          update: (t) => {
            merged.visible = true;
            merged.scale.setScalar(1 + 0.2 * Math.sin(Math.PI * t));
          },
        });
      } else if (e.type === 'Spawned') {
        const g = this.create(e.tile.id, e.tile.value, e.tile);
        g.scale.setScalar(0.001);
        this.anims.push({ start: now + SLIDE_MS, duration: SPAWN_MS, update: (t) => g.scale.setScalar(Math.max(0.001, easeOut(t))) });
      }
    }
  }

  update(now: number): void {
    if (this.anims.length === 0) return;
    this.anims = this.anims.filter((a) => {
      if (now < a.start) return true;
      const t = Math.min(1, (now - a.start) / a.duration);
      a.update(t);
      if (t < 1) return true;
      a.done?.();
      return false;
    });
  }

  /** Completes every pending animation instantly (fast input never waits). */
  finishAll(): void {
    const pending = [...this.anims].sort((a, b) => a.start - b.start);
    this.anims = [];
    for (const a of pending) {
      a.update(1);
      a.done?.();
    }
  }

  cellPosition(c: Cell): THREE.Vector3 {
    const half = (this.size - 1) / 2;
    return new THREE.Vector3(c.col - half, half - c.row, 0);
  }

  private create(id: number, value: number, cell: Cell): THREE.Group {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.boxGeo, this.material(value)));
    const label = new THREE.Mesh(this.labelGeo, this.label(value));
    label.position.z = DEPTH / 2 + 0.002;
    g.add(label);
    g.position.copy(this.cellPosition(cell));
    g.userData.value = value;
    this.root.add(g);
    this.meshes.set(id, g);
    return g;
  }

  private material(value: number): THREE.MeshStandardMaterial {
    let m = this.materials.get(value);
    if (!m) {
      const color = this.colorOf(value);
      const t = Math.min(1, (Math.log2(value) - 1) / 10);
      // Bright palette colors (gold, pale cyan) need less self-illumination or they clip to white under bloom.
      const base = this.classic ? 0.15 : (0.25 + 0.5 * t) * (1 - 0.8 * Math.min(1, relativeLuminance(color)));
      // Roughness 0.6: a glossier tile caught a white key-light highlight in the top-right cell that
      // bloomed over its number.
      m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: base, roughness: 0.6, metalness: 0.1 });
      m.userData.base = base;
      this.materials.set(value, m);
    }
    return m;
  }

  private label(value: number): THREE.MeshBasicMaterial {
    let m = this.labels.get(value);
    if (!m) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      // CPU-rasterized canvas: GPU canvas text came out with intermittent glyph garbage at boot
      // (seen on Intel Iris Xe while shaders compile). A dozen small labels, so the cost is nil.
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const text = String(value);
      const px = text.length <= 2 ? 120 : text.length === 3 ? 100 : text.length === 4 ? 80 : 60;
      ctx.font = `600 ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tile = relativeLuminance(this.colorOf(value));
      const light =
        contrast(tile, relativeLuminance(TEXT_LIGHT) * LIGHT_TEXT_GAIN) > contrast(tile, relativeLuminance(TEXT_DARK));
      ctx.fillStyle = `#${(light ? TEXT_LIGHT : TEXT_DARK).getHexString()}`;
      ctx.fillText(text, 128, 136);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      if (light) m.color.setScalar(LIGHT_TEXT_GAIN);
      this.labels.set(value, m);
    }
    return m;
  }
}

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Bloom + vignette + chromatic aberration/flash on drops. See docs/02-audio-visual.md §4.
// With `enabled: false` (low quality) the composer is skipped and the scene renders straight to
// the canvas: no full-screen passes, and the canvas' own antialiasing applies, which is close to
// free on mobile tile GPUs.

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 1 },
    uAberration: { value: 0 },
    uFlash: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uAberration;
    uniform float uFlash;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float ab = uAberration * 0.012;
      vec3 col = vec3(
        texture2D(tDiffuse, vUv + d * ab).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv - d * ab).b
      );
      col *= mix(1.0, smoothstep(0.9, 0.2, length(d)), uVignette * 0.6);
      gl_FragColor = vec4(col + uFlash, 1.0);
    }
  `,
};

export interface PostFxOptions {
  /** Off: render directly to the canvas (no bloom, vignette, flashes or aberration). */
  enabled: boolean;
  bloom: boolean;
  bloomStrength: number;
  vignette: boolean;
  aberration: boolean;
}

export class PostFx {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly final: ShaderPass;
  private flash = 0;
  private aberration = 0;
  private opts: PostFxOptions = { enabled: true, bloom: true, bloomStrength: 0.8, vignette: true, aberration: true };
  /** Reduced effects: no flashes or aberration. */
  reduced = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.55, 0.6); // threshold keeps lit tiles readable
    this.composer.addPass(this.bloom);
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
    this.composer.addPass(new OutputPass());
  }

  configure(opts: PostFxOptions): void {
    this.opts = opts;
    this.bloom.enabled = opts.bloom;
    this.bloom.strength = opts.bloomStrength;
    this.final.uniforms.uVignette.value = opts.vignette ? 1 : 0;
  }

  /** Never call with 0 sizes (Android starts at 0×0). */
  setSize(w: number, h: number, dpr: number): void {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
  }

  get enabled(): boolean {
    return this.opts.enabled;
  }

  drop(): void {
    if (this.reduced) return;
    this.flash = 0.35;
    if (this.opts.aberration) this.aberration = 1;
  }

  render(dt: number, beat: number): void {
    if (!this.opts.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.flash *= Math.exp(-dt * 14);
    this.aberration *= Math.exp(-dt * 5);
    this.final.uniforms.uFlash.value = this.flash;
    this.final.uniforms.uAberration.value = this.aberration;
    this.bloom.strength = this.opts.bloomStrength * (1 + 0.25 * beat);
    this.composer.render(dt);
  }
}

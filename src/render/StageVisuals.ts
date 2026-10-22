import type * as THREE from 'three';
import type { StageRef } from '../core/types';
import { stagePalette } from '../stages';
import type { BeatUniforms } from './BeatUniforms';
import { AbismoEnvironment } from './environments/abismo';
import type { Environment } from './environments/common';
import { CosmosEnvironment } from './environments/cosmos';
import { DunasEnvironment } from './environments/dunas';
import { LuciernagasEnvironment } from './environments/luciernagas';
import { NeonEnvironment } from './environments/neon';
import { TormentaEnvironment } from './environments/tormenta';

// All six environments live in the scene from boot (shaders precompiled); only the active one is
// visible. Transitions disperse the old world while the new one assembles. See docs/02-audio-visual.md §6.

type EnvCtor = new (scene: THREE.Scene, beat: BeatUniforms, palette: readonly string[]) => Environment;
const ENVIRONMENTS: EnvCtor[] = [AbismoEnvironment, DunasEnvironment, NeonEnvironment, LuciernagasEnvironment, TormentaEnvironment, CosmosEnvironment];

export class StageVisuals {
  private readonly envs: Environment[];
  private current = 0;
  private leaving: Environment | null = null;
  private progress = 1;
  private duration = 1;

  constructor(scene: THREE.Scene, beat: BeatUniforms, initial: StageRef) {
    this.envs = ENVIRONMENTS.map((E, i) => new E(scene, beat, stagePalette({ index: i, lap: initial.lap })));
    this.show(initial);
  }

  get active(): Environment {
    return this.envs[this.current];
  }

  /** Makes every environment visible (presence ~0) so precompile sees all materials. */
  revealAllForWarmup(): void {
    for (const e of this.envs) e.setPresence(0.002);
  }

  /** Instant switch (boot, continue, new game). */
  show(ref: StageRef): void {
    this.leaving = null;
    this.progress = 1;
    this.current = ref.index;
    this.envs.forEach((e, i) => {
      if (i === ref.index) e.setPalette(stagePalette(ref));
      e.setPresence(i === ref.index ? 1 : 0);
    });
  }

  /** Disperse the current world and assemble `to` over `seconds`. */
  transition(to: StageRef, seconds: number): void {
    const next = this.envs[to.index];
    next.setPalette(stagePalette(to));
    if (to.index === this.current) return;
    this.leaving?.setPresence(0);
    this.leaving = this.envs[this.current];
    this.current = to.index;
    this.progress = 0;
    this.duration = Math.max(0.1, seconds);
  }

  setPixelRatio(dpr: number): void {
    for (const e of this.envs) e.setPixelRatio(dpr);
  }

  setFraction(f: number): void {
    for (const e of this.envs) e.setFraction(f);
  }

  onMerge(x: number, y: number, value: number): void {
    this.active.onMerge?.(x, y, value);
  }

  onDrop(): void {
    this.active.onDrop?.();
  }

  update(dt: number): void {
    if (this.progress < 1) {
      this.progress = Math.min(1, this.progress + dt / this.duration);
      const e = this.progress * this.progress * (3 - 2 * this.progress);
      this.leaving?.setPresence(1 - e);
      this.active.setPresence(e);
      if (this.progress >= 1) {
        this.leaving?.setPresence(0);
        this.leaving = null;
      }
    }
    this.leaving?.update(dt);
    this.active.update(dt);
  }
}

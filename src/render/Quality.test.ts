import { describe, expect, it } from 'vitest';
import { QualityGovernor, initialLevel, type QualityLevel } from './Quality';

describe('initialLevel', () => {
  it('starts low on modest or GPU-less devices', () => {
    expect(initialLevel({ memory: 4, cores: 8, touch: true })).toBe('low');
    expect(initialLevel({ memory: 8, cores: 4, touch: false })).toBe('low');
    expect(initialLevel({ memory: 8, cores: 8, touch: false, gpu: 'Google SwiftShader' })).toBe('low');
  });

  it('starts high only on clearly strong desktops', () => {
    expect(initialLevel({ memory: 8, cores: 12, touch: false })).toBe('high');
    expect(initialLevel({ memory: 8, cores: 12, touch: true })).toBe('medium');
  });

  it('falls back to medium when the browser exposes nothing', () => {
    expect(initialLevel({ touch: false })).toBe('medium');
  });
});

describe('QualityGovernor', () => {
  const run = (g: QualityGovernor, fps: number, seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / fps) g.sample(1 / fps);
  };

  it('auto mode starts at the device level', () => {
    const levels: QualityLevel[] = [];
    const g = new QualityGovernor((l) => levels.push(l));
    g.setAutoStart('low');
    g.setMode('auto');
    expect(g.level).toBe('low');
  });

  it('steps down right away when fps collapses, without waiting for the cooldown', () => {
    const g = new QualityGovernor(() => {});
    g.setAutoStart('high');
    g.setMode('auto');
    run(g, 20, 3.2);
    expect(g.level).toBe('medium');
  });

  it('waits for the cooldown on a mild drop', () => {
    const g = new QualityGovernor(() => {});
    g.setAutoStart('high');
    g.setMode('auto');
    run(g, 45, 3.2);
    expect(g.level).toBe('high');
    run(g, 45, 10);
    expect(g.level).toBe('medium');
  });
});

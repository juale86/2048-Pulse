import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../core/game';
import type { PlayablesSdk } from './PlayablesSdk';
import { defaultSave, migrate, SaveManager, ScoreReporter } from './SaveManager';

function fakeSdk(stored = '') {
  const saves: string[] = [];
  let fail = false;
  const sdk = {
    loadData: vi.fn(async () => stored),
    saveData: vi.fn(async (d: string) => {
      if (fail) throw new Error('API_UNAVAILABLE');
      saves.push(d);
    }),
    sendScore: vi.fn(async () => {}),
    logWarning: vi.fn(),
  } as unknown as PlayablesSdk;
  return { sdk, saves, setFail: (f: boolean) => (fail = f) };
}

describe('migrate', () => {
  it('empty string → defaults, ok', () => {
    expect(migrate('')).toEqual({ save: defaultSave(), ok: true });
  });

  it('corrupt JSON → defaults, not ok', () => {
    expect(migrate('{nope').ok).toBe(false);
    expect(migrate('[1,2]').ok).toBe(false);
  });

  it('round-trips a v1 save with a game in progress', () => {
    const save = { ...defaultSave(), best: 1234, game: newGame(5) };
    expect(migrate(JSON.stringify(save))).toEqual({ save, ok: true });
  });

  it('fills missing fields from defaults', () => {
    const { save } = migrate('{"v":1,"best":10}');
    expect(save.best).toBe(10);
    expect(save.settings).toEqual(defaultSave().settings);
  });

  it('stays well under the 64 KiB exit flush', () => {
    const save = { ...defaultSave(), game: newGame(1) };
    expect(JSON.stringify(save).length).toBeLessThan(1024);
  });
});

describe('SaveManager', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('never saves before load', async () => {
    const { sdk } = fakeSdk();
    const m = new SaveManager(sdk);
    m.request('now');
    await vi.runAllTimersAsync();
    expect(sdk.saveData).not.toHaveBeenCalled();
  });

  it('debounces saves and sends only the latest state', async () => {
    const { sdk, saves } = fakeSdk();
    const m = new SaveManager(sdk);
    await m.load();
    m.data.best = 1;
    m.request('debounced');
    m.data.best = 2;
    m.request('debounced');
    await vi.advanceTimersByTimeAsync(1000);
    expect(saves).toHaveLength(1);
    expect(JSON.parse(saves[0]).best).toBe(2);
  });

  it('retries with backoff and reports pending state', async () => {
    const { sdk, saves, setFail } = fakeSdk();
    const pending: boolean[] = [];
    const m = new SaveManager(sdk, (p) => pending.push(p));
    await m.load();
    setFail(true);
    m.request('now');
    await vi.advanceTimersByTimeAsync(0);
    expect(pending).toEqual([true]);
    setFail(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(saves).toHaveLength(1);
    expect(pending).toEqual([true, false]);
  });

  it('logs a warning and uses defaults on a corrupt save', async () => {
    const { sdk } = fakeSdk('garbage');
    const m = new SaveManager(sdk);
    expect(await m.load()).toEqual(defaultSave());
    expect(sdk.logWarning).toHaveBeenCalled();
  });
});

describe('ScoreReporter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sends only increases of best, throttled', async () => {
    const { sdk } = fakeSdk();
    let best = 100;
    const r = new ScoreReporter(sdk, () => best);
    r.flush();
    best = 200;
    r.changed();
    best = 300;
    r.changed();
    await vi.advanceTimersByTimeAsync(10000);
    r.flush();
    expect(vi.mocked(sdk.sendScore).mock.calls).toEqual([[100], [300]]);
  });
});

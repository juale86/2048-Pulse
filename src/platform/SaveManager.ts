import type { GameState } from '../core/types';
import type { PlayablesSdk } from './PlayablesSdk';

// Cloud save: schema, migrations, debounce, retries with backoff. See docs/03-arquitectura.md §6.

export type QualitySetting = 'auto' | 'high' | 'low';

export interface Settings {
  music: number;
  sfx: number;
  haptics: boolean;
  reducedFx: boolean;
  classicPalette: boolean;
  quality: QualitySetting;
}

export interface SaveV1 {
  v: 1;
  best: number;
  bestTile: number;
  gamesPlayed: number;
  /** First-game hint already dismissed. */
  tutorialDone: boolean;
  settings: Settings;
  game: GameState | null;
}

export type SaveLatest = SaveV1;

export function defaultSave(reducedMotion = false): SaveLatest {
  return {
    v: 1,
    best: 0,
    bestTile: 0,
    gamesPlayed: 0,
    tutorialDone: false,
    settings: { music: 80, sfx: 80, haptics: true, reducedFx: reducedMotion, classicPalette: false, quality: 'auto' },
    game: null,
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const bool = (x: unknown, d: boolean) => (typeof x === 'boolean' ? x : d);

function looksLikeGame(x: unknown): x is GameState {
  return isObj(x) && Array.isArray(x.tiles) && isObj(x.rng) && typeof x.score === 'number' && typeof x.size === 'number';
}

/**
 * Parses any stored save into the latest version. Never throws: unknown or corrupt data
 * yields defaults with ok=false so the caller can logWarning().
 */
export function migrate(raw: string, reducedMotion = false): { save: SaveLatest; ok: boolean } {
  const base = defaultSave(reducedMotion);
  if (raw === '') return { save: base, ok: true };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { save: base, ok: false };
  }
  if (!isObj(data) || data.v !== 1) return { save: base, ok: false };
  // v1 is current; future versions chain here: v1 → v2 → …
  const s = isObj(data.settings) ? data.settings : {};
  const quality = s.quality === 'high' || s.quality === 'low' ? s.quality : 'auto';
  return {
    save: {
      v: 1,
      best: num(data.best, 0),
      bestTile: num(data.bestTile, 0),
      gamesPlayed: num(data.gamesPlayed, 0),
      tutorialDone: bool(data.tutorialDone, false),
      settings: {
        music: num(s.music, base.settings.music),
        sfx: num(s.sfx, base.settings.sfx),
        haptics: bool(s.haptics, base.settings.haptics),
        reducedFx: bool(s.reducedFx, base.settings.reducedFx),
        classicPalette: bool(s.classicPalette, base.settings.classicPalette),
        quality,
      },
      game: looksLikeGame(data.game) ? data.game : null,
    },
    ok: true,
  };
}

const DEBOUNCE_MS = 1000;
const RETRY_MS = [2000, 5000, 15000, 30000];
const PENDING_INDICATOR_MS = 3000;

export class SaveManager {
  data: SaveLatest = defaultSave();
  private loaded = false;
  private paused = false;
  private dirty = false;
  private inFlight = false;
  private retryIndex = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingShown = false;

  constructor(
    private readonly sdk: PlayablesSdk,
    private readonly onPendingChange: (pending: boolean) => void = () => {},
  ) {}

  /** Must complete before any save (Playables MUST). */
  async load(reducedMotion = false): Promise<SaveLatest> {
    let raw = '';
    try {
      raw = await this.sdk.loadData();
    } catch {
      this.sdk.logWarning();
    }
    const { save, ok } = migrate(raw, reducedMotion);
    if (!ok) this.sdk.logWarning();
    this.data = save;
    this.loaded = true;
    return save;
  }

  /** Marks data dirty. 'debounced' after moves; 'now' on records, game over and pause. */
  request(mode: 'debounced' | 'now'): void {
    this.dirty = true;
    this.armPendingIndicator();
    clearTimeout(this.debounceTimer);
    if (mode === 'now') this.trySave();
    else this.debounceTimer = setTimeout(() => this.trySave(), DEBOUNCE_MS);
  }

  /** Saves immediately, then suspends retries until resume(). */
  pause(): void {
    this.paused = true;
    clearTimeout(this.retryTimer);
    if (this.dirty) {
      clearTimeout(this.debounceTimer);
      this.trySave(true);
    }
  }

  resume(): void {
    this.paused = false;
    if (this.dirty) this.trySave();
  }

  private trySave(force = false): void {
    if (!this.loaded || this.inFlight || (this.paused && !force)) return;
    clearTimeout(this.retryTimer);
    this.inFlight = true;
    this.dirty = false;
    const snapshot = JSON.stringify(this.data);
    this.sdk.saveData(snapshot).then(
      () => {
        this.inFlight = false;
        this.retryIndex = 0;
        if (this.dirty) {
          this.trySave();
        } else {
          this.setPending(false);
        }
      },
      () => {
        this.inFlight = false;
        this.dirty = true;
        this.setPending(true);
        if (this.paused) return;
        const delay = RETRY_MS[Math.min(this.retryIndex, RETRY_MS.length - 1)];
        this.retryIndex++;
        this.retryTimer = setTimeout(() => this.trySave(), delay);
      },
    );
  }

  private armPendingIndicator(): void {
    if (this.pendingShown || this.pendingTimer !== undefined) return;
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = undefined;
      if (this.dirty || this.inFlight) this.setPending(true);
    }, PENDING_INDICATOR_MS);
  }

  private setPending(pending: boolean): void {
    if (!pending) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = undefined;
    }
    if (pending === this.pendingShown) return;
    this.pendingShown = pending;
    this.onPendingChange(pending);
  }
}

const SCORE_THROTTLE_MS = 10000;

/** Sends save.best via sendScore, throttled; the best value sent always equals save.best. */
export class ScoreReporter {
  private lastSent = 0;
  private lastAt = -Infinity;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly sdk: PlayablesSdk,
    private readonly best: () => number,
  ) {}

  /** Call whenever best may have increased. */
  changed(): void {
    if (this.timer !== undefined) return;
    const wait = Math.max(0, this.lastAt + SCORE_THROTTLE_MS - Date.now());
    this.timer = setTimeout(() => this.flush(), wait);
  }

  /** Sends now if best increased (game over, pause). */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const best = this.best();
    if (best <= this.lastSent) return;
    this.lastSent = best;
    this.lastAt = Date.now();
    this.sdk.sendScore(best).catch(() => this.sdk.logWarning());
  }
}

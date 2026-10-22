import { mountMockDebugPanel } from './MockDebugPanel';
import type { PlayablesSdk } from './PlayablesSdk';

// Local stand-in for YouTube's SDK: localStorage saves + a debug panel (backquote key).
// See docs/03-arquitectura.md §5.3.
export const SAVE_KEY = '2048pulse.save';
export const LANG_KEY = '2048pulse.mockLang';

type Listeners<T extends unknown[]> = Set<(...args: T) => void>;

function subscribe<T extends unknown[]>(set: Listeners<T>, cb: (...args: T) => void): () => void {
  set.add(cb);
  return () => {
    set.delete(cb);
  };
}

export class MockSdk implements PlayablesSdk {
  private pauseCbs: Listeners<[]> = new Set();
  private resumeCbs: Listeners<[]> = new Set();
  private audioCbs: Listeners<[boolean]> = new Set();
  audioEnabled = true;
  private language = readLanguage();
  /** Simulated latency for load/save, in ms. */
  latencyMs = 0;
  /** When true, saveData rejects like API_UNAVAILABLE. */
  failSaves = false;
  paused = false;
  /** True while the pause came from the page being hidden, so only that pause auto-resumes. */
  private hiddenPause = false;

  private addDebugButton: ((label: string, action: () => void) => void) | null = null;

  constructor() {
    if (import.meta.env.DEV) this.addDebugButton = mountMockDebugPanel(this);
    // Stands in for the YouTube host, which sends onPause/onResume when the app is backgrounded or
    // the phone is locked. Only the mock may listen to visibility; the game never does.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.paused) return;
        this.hiddenPause = true;
        this.emitPause();
      } else if (this.hiddenPause) {
        this.hiddenPause = false;
        this.emitResume();
      }
    });
  }

  /** Dev-only: lets the game add its own buttons to the debug panel. */
  addDebugAction(label: string, action: () => void): void {
    this.addDebugButton?.(label, action);
  }

  emitPause(): void {
    if (this.paused) return;
    this.paused = true;
    for (const cb of this.pauseCbs) cb();
  }

  emitResume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const cb of this.resumeCbs) cb();
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    for (const cb of this.audioCbs) cb(enabled);
  }

  firstFrameReady(): void {
    console.log('[MockSdk] firstFrameReady');
  }
  gameReady(): void {
    console.log('[MockSdk] gameReady');
  }
  onPause(cb: () => void): () => void {
    return subscribe(this.pauseCbs, cb);
  }
  onResume(cb: () => void): () => void {
    return subscribe(this.resumeCbs, cb);
  }
  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }
  onAudioEnabledChange(cb: (enabled: boolean) => void): () => void {
    return subscribe(this.audioCbs, cb);
  }
  async getLanguage(): Promise<string> {
    return this.language;
  }
  async loadData(): Promise<string> {
    await this.delay();
    try {
      return localStorage.getItem(SAVE_KEY) ?? '';
    } catch {
      return '';
    }
  }
  async saveData(data: string): Promise<void> {
    await this.delay();
    if (this.failSaves) throw Object.assign(new Error('API_UNAVAILABLE'), { errorType: 'API_UNAVAILABLE' });
    localStorage.setItem(SAVE_KEY, data);
    console.log(`[MockSdk] saveData (${data.length} chars)`);
  }
  async sendScore(value: number): Promise<void> {
    console.log('[MockSdk] sendScore', value);
  }
  logError(): void {
    console.error('[MockSdk] logError');
  }
  logWarning(): void {
    console.warn('[MockSdk] logWarning');
  }

  private delay(): Promise<void> {
    return this.latencyMs > 0 ? new Promise((r) => setTimeout(r, this.latencyMs)) : Promise.resolve();
  }
}

function readLanguage(): string {
  try {
    return localStorage.getItem(LANG_KEY) ?? 'en-US';
  } catch {
    return 'en-US';
  }
}

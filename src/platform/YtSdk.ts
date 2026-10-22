import type { PlayablesSdk } from './PlayablesSdk';

// See docs/03-arquitectura.md §5.4. Minimal subset of the official ytgame typings.
// TODO: normalize errors to SdkError with errorType.
declare global {
  interface Window {
    ytgame: {
      game: {
        firstFrameReady(): void;
        gameReady(): void;
        loadData(): Promise<string>;
        saveData(data: string): Promise<void>;
      };
      engagement: { sendScore(args: { value: number }): Promise<void> };
      system: {
        isAudioEnabled(): boolean;
        onAudioEnabledChange(cb: (enabled: boolean) => void): () => void;
        onPause(cb: () => void): () => void;
        onResume(cb: () => void): () => void;
        getLanguage(): Promise<string>;
      };
      health: { logError(): void; logWarning(): void };
    };
  }
}

export class YtSdk implements PlayablesSdk {
  firstFrameReady(): void {
    window.ytgame.game.firstFrameReady();
  }
  gameReady(): void {
    window.ytgame.game.gameReady();
  }
  onPause(cb: () => void): () => void {
    return window.ytgame.system.onPause(cb);
  }
  onResume(cb: () => void): () => void {
    return window.ytgame.system.onResume(cb);
  }
  isAudioEnabled(): boolean {
    return window.ytgame.system.isAudioEnabled();
  }
  onAudioEnabledChange(cb: (enabled: boolean) => void): () => void {
    return window.ytgame.system.onAudioEnabledChange(cb);
  }
  getLanguage(): Promise<string> {
    return window.ytgame.system.getLanguage();
  }
  loadData(): Promise<string> {
    return window.ytgame.game.loadData();
  }
  saveData(data: string): Promise<void> {
    return window.ytgame.game.saveData(data);
  }
  sendScore(value: number): Promise<void> {
    return window.ytgame.engagement.sendScore({ value });
  }
  logError(): void {
    window.ytgame.health.logError();
  }
  logWarning(): void {
    window.ytgame.health.logWarning();
  }
}

// See docs/03-arquitectura.md §5.1
export interface PlayablesSdk {
  firstFrameReady(): void;
  gameReady(): void;
  onPause(cb: () => void): () => void;
  onResume(cb: () => void): () => void;
  isAudioEnabled(): boolean;
  onAudioEnabledChange(cb: (enabled: boolean) => void): () => void;
  getLanguage(): Promise<string>;
  loadData(): Promise<string>;
  saveData(data: string): Promise<void>;
  sendScore(value: number): Promise<void>;
  logError(): void;
  logWarning(): void;
}

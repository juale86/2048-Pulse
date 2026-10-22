import type { PlayablesSdk } from './PlayablesSdk';
import { MockSdk } from './MockSdk';
import { YtSdk } from './YtSdk';

// See docs/03-arquitectura.md §5.2
function create(): PlayablesSdk {
  const kind = import.meta.env.VITE_PLAYABLES_SDK;
  if (kind === 'mock') return new MockSdk();
  if (kind === 'youtube') return new YtSdk();
  throw new Error(`VITE_PLAYABLES_SDK must be "mock" or "youtube", got "${String(kind)}"`);
}

export const sdk: PlayablesSdk = create();
export type { PlayablesSdk };

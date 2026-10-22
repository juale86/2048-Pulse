import type { MockSdk } from './MockSdk';
import { LANG_KEY, SAVE_KEY } from './MockSdk';

// Dev-only panel (toggle with the backquote key) to simulate what YouTube does to a Playable.
// See docs/03-arquitectura.md §5.3.

const LANGUAGES = ['en-US', 'es-419', 'fr-FR'];

/** Returns a function to add more buttons later (game-level debug actions). */
export function mountMockDebugPanel(sdk: MockSdk): (label: string, action: () => void) => void {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;top:8px;right:8px;z-index:9999;display:none;flex-direction:column;gap:4px;padding:8px;' +
    'font:12px monospace;color:#fff;background:rgba(0,0,0,.85);border:1px solid #1de9b6;border-radius:6px';

  const button = (label: () => string, action: () => void) => {
    const b = document.createElement('button');
    b.style.cssText = 'font:inherit;padding:4px 8px;cursor:pointer';
    const refresh = () => (b.textContent = label());
    b.addEventListener('click', () => {
      action();
      refresh();
    });
    refresh();
    panel.append(b);
  };

  const title = document.createElement('div');
  title.textContent = 'MockSdk  ( ` to close )';
  panel.append(title);

  button(() => (sdk.paused ? '▶ Resume (onResume)' : '⏸ Pause (onPause)'), () => (sdk.paused ? sdk.emitResume() : sdk.emitPause()));
  button(() => (sdk.audioEnabled ? '🔊 YouTube audio: on' : '🔇 YouTube audio: off'), () => sdk.setAudioEnabled(!sdk.audioEnabled));
  button(() => (sdk.failSaves ? '☁ Saves: FAILING' : '☁ Saves: ok'), () => (sdk.failSaves = !sdk.failSaves));
  button(
    () => `🌐 Language: ${localStorage.getItem(LANG_KEY) ?? 'en-US'} (reloads)`,
    () => {
      const cur = localStorage.getItem(LANG_KEY) ?? 'en-US';
      localStorage.setItem(LANG_KEY, LANGUAGES[(LANGUAGES.indexOf(cur) + 1) % LANGUAGES.length]);
      location.reload();
    },
  );
  button(
    () => '⬛ Viewport 0×0 for 3 s',
    () => {
      const canvas = document.getElementById('game') as HTMLCanvasElement;
      canvas.style.width = canvas.style.height = '0px';
      setTimeout(() => (canvas.style.width = canvas.style.height = ''), 3000);
    },
  );
  button(
    () => '💥 Lose WebGL context (1.5 s)',
    () => {
      const canvas = document.getElementById('game') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      const ext = gl?.getExtension('WEBGL_lose_context');
      if (!ext) return;
      ext.loseContext();
      setTimeout(() => ext.restoreContext(), 1500);
    },
  );
  button(
    () => '🗑 Clear save (reloads)',
    () => {
      localStorage.removeItem(SAVE_KEY);
      location.reload();
    },
  );

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Backquote') return;
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  });
  document.body.append(panel);
  return (label, action) => button(() => label, action);
}

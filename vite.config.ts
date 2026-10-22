import { mkdirSync, writeFileSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const YT_SDK_TAG = '<script src="https://www.youtube.com/game_api/v1"></script>';

// Validates VITE_PLAYABLES_SDK and injects the YouTube SDK as the first <head> script.
function playablesSdkInject(mode: string): Plugin {
  const value = loadEnv(mode, process.cwd(), 'VITE_').VITE_PLAYABLES_SDK;
  // Vitest runs with mode "test" and has no SDK env; nothing to inject there.
  if (process.env.VITEST) return { name: 'playablesSdkInject' };
  if (value !== 'mock' && value !== 'youtube') {
    throw new Error(
      `[playablesSdkInject] VITE_PLAYABLES_SDK must be "mock" or "youtube", got "${value ?? ''}".`,
    );
  }
  return {
    name: 'playablesSdkInject',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (value !== 'youtube') return html;
        return html.replace(/<head[^>]*>/i, (m) => `${m}\n    ${YT_SDK_TAG}`);
      },
    },
  };
}

/**
 * Dev server only: POST /__capture?name=<file> with a PNG body saves it to marketing/thumbnails/.
 * Used by the dev-only __pulse.capture() helper to render listing thumbnails at any size.
 */
function captureEndpoint(): Plugin {
  return {
    name: 'captureEndpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[A-Za-z0-9._-]+$/.test(name)) {
          res.statusCode = 400;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          mkdirSync('marketing/thumbnails', { recursive: true });
          writeFileSync(`marketing/thumbnails/${name}.png`, Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [playablesSdkInject(mode), captureEndpoint()],
  build: {
    target: 'es2022',
    // Keep each file near Playables' SHOULD of 512 KiB.
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
  test: { include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] },
}));

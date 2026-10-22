// Serves dist/ with the Content-Security-Policy YouTube uses for Playables, so CSP violations
// show up locally (DevTools console). CSP copied from the Test Suite guide; see
// research/youtube-playables-requisitos.md §2.2. Usage: npm run build:mock && npm run preview:csp
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const PORT = Number(process.env.PORT ?? 4180);
const ROOT = 'dist';
const CSP =
  "default-src 'none'; script-src 'report-sample' 'self' 'unsafe-eval' 'unsafe-inline' blob: " +
  'https://www.youtube.com/game_api/v0 https://www.youtube.com/game_api/v0/ ' +
  'https://www.youtube.com/game_api/v1 https://www.youtube.com/game_api/v1/; ' +
  "object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "img-src 'self' blob: data:; media-src 'self' blob:; " +
  "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; " +
  "connect-src 'self' blob: data:; sandbox allow-pointer-lock allow-same-origin allow-scripts; " +
  "base-uri 'self'; manifest-src 'self'; worker-src 'self' blob:";

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

if (!existsSync(join(ROOT, 'index.html'))) throw new Error('dist/index.html not found; run "npm run build:mock" first.');

createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = join(ROOT, path === '' ? 'index.html' : path);
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  const body = readFileSync(file);
  const gzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Content-Security-Policy': CSP,
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(gzip ? gzipSync(body) : body);
}).listen(PORT, () => console.log(`CSP preview on http://localhost:${PORT}/`));

// Checks dist/ against YouTube Playables bundle rules (docs/04-youtube-playables.md §2.3, §4).
// Usage: node scripts/check-bundle.mjs [--mock]   (exit code 1 on any error)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const MOCK = process.argv.includes('--mock');
const MiB = 1024 * 1024;
const NAME_RE = /^[a-zA-Z0-9\-._]+$/;
const SDK_URL = 'https://www.youtube.com/game_api/v1';
/** URLs that legitimately appear in library code (XML namespaces, docs links in strings). */
const ALLOWED_URL = [/^https?:\/\/www\.w3\.org\//, /^https:\/\/www\.youtube\.com\/game_api\//, /^https?:\/\/(github\.com|threejs\.org)\//];

const errors = [];
const warnings = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error('dist/ not found: run the build first.');
  process.exit(1);
}

let total = 0;
let gzTotal = 0;
for (const f of files) {
  const rel = relative(DIST, f).split('\\').join('/');
  for (const seg of rel.split('/')) if (!NAME_RE.test(seg)) errors.push(`Invalid file name: ${rel}`);
  const buf = readFileSync(f);
  total += buf.length;
  const gz = gzipSync(buf).length;
  gzTotal += gz;
  if (buf.length >= 30 * MiB) errors.push(`File ≥ 30 MiB: ${rel}`);
  else if (buf.length > 512 * 1024) warnings.push(`File > 512 KiB (SHOULD): ${rel} (${(buf.length / 1024).toFixed(0)} KiB)`);

  if (/\.(js|html|css)$/.test(rel)) {
    const text = buf.toString('utf8');
    if (/new Worker\s*\(/.test(text)) errors.push(`Web Worker construction found in ${rel}`);
    if (/\beval\s*\(/.test(text)) warnings.push(`eval( found in ${rel}`);
    for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
      if (!ALLOWED_URL.some((re) => re.test(m[0]))) warnings.push(`External URL string in ${rel}: ${m[0]}`);
    }
  }
}

if (files.length > 8000) errors.push(`Too many files: ${files.length} > 8000`);
if (gzTotal >= 30 * MiB) errors.push(`Initial bundle ≥ 30 MiB gzip`);
else if (gzTotal >= 15 * MiB) warnings.push(`Initial bundle ≥ 15 MiB gzip (SHOULD)`);

// index.html: SDK first in <head> (prod), only relative references.
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const firstScript = html.match(/<script[^>]*>/i)?.[0] ?? '';
if (!MOCK && !firstScript.includes(SDK_URL)) errors.push('index.html: the YouTube SDK must be the first <script>');
if (MOCK && html.includes(SDK_URL)) errors.push('index.html: mock build must not include the YouTube SDK');
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const ref = m[1];
  if (ref === SDK_URL) continue;
  if (ref.startsWith('/') || /^[a-z]+:/i.test(ref)) errors.push(`index.html: non-relative reference ${ref}`);
}

console.log(`Files: ${files.length} · total ${(total / 1024).toFixed(0)} KiB · gzip ${(gzTotal / 1024).toFixed(0)} KiB`);
for (const w of [...new Set(warnings)]) console.log(`  warn  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);
if (errors.length) process.exit(1);
console.log('Bundle OK for YouTube Playables rules.');

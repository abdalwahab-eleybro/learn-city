#!/usr/bin/env node
/* Bundles the app for deployment:   node tools/build.js [--min]
   Reads index.html (the single source of truth for load order) and writes dist/:
     dist/index.html   one stylesheet + one script instead of ~35 files, cache-busted by content hash
     dist/app.js       every js/*.js in index.html order (classic script, same globals as before)
     dist/app.css      every stylesheet in order
     dist/data/        copied as is (fetched at runtime)
   --min minifies with esbuild if it is installed (npm i -D esbuild); otherwise it says so and skips.
   No dependencies are needed for the plain bundle. */
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'), DIST = path.join(ROOT, 'dist'), min = process.argv.includes('--min');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const links = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+?)(?:\?[^"]*)?"\s*\/?>/g)];
const scripts = [...html.matchAll(/<script\s+src="([^"]+?)(?:\?[^"]*)?"\s*><\/script>/g)];
if (!scripts.length) { console.error('no <script src> found in index.html'); process.exit(1); }

const read = (f) => { const p = path.join(ROOT, f); if (!fs.existsSync(p)) { console.error('missing file referenced by index.html: ' + f); process.exit(1); } return fs.readFileSync(p, 'utf8'); };
let js = scripts.map(m => `/* ── ${m[1]} ── */\n${read(m[1]).replace(/\s+$/, '')}\n`).join(';\n');
let css = links.map(m => `/* ── ${m[1]} ── */\n${read(m[1]).replace(/\s+$/, '')}\n`).join('\n');

function esbuild(code, loader) {
  const bin = [path.join(ROOT, 'node_modules', '.bin', 'esbuild'), 'esbuild'].find(b => cp.spawnSync(b, ['--version']).status === 0);
  if (!bin) return null;
  const r = cp.spawnSync(bin, ['--minify', '--loader=' + loader], { input: code, encoding: 'utf8', maxBuffer: 1 << 28 });
  return r.status === 0 ? r.stdout : null;
}
if (min) {
  const a = esbuild(js, 'js'), b = esbuild(css, 'css');
  if (a && b) { js = a; css = b; console.log('minified with esbuild'); } else console.log('esbuild not found: skipped minifying (npm i -D esbuild)');
}
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
fs.rmSync(DIST, { recursive: true, force: true }); fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'app.js'), js); fs.writeFileSync(path.join(DIST, 'app.css'), css);

let out = html, firstLink = true, firstScript = true;
out = out.replace(/<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?>/g, () => firstLink ? (firstLink = false, `<link rel="stylesheet" href="app.css?v=${hash(css)}">`) : '');
out = out.replace(/<script\s+src="[^"]+"\s*><\/script>\s*/g, () => firstScript ? (firstScript = false, `<script src="app.js?v=${hash(js)}"></script>\n`) : '');
fs.writeFileSync(path.join(DIST, 'index.html'), out);
if (fs.existsSync(path.join(ROOT, 'data'))) fs.cpSync(path.join(ROOT, 'data'), path.join(DIST, 'data'), { recursive: true });
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`built dist/: ${scripts.length} scripts -> app.js (${kb(js)}), ${links.length} stylesheets -> app.css (${kb(css)})`);

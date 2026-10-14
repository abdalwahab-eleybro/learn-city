/* Structure checks that keep many small files with shared globals from going fragile. */
const { test, assert, ROOT } = require('../lib');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="(js\/[^"?]+)/g)].map(m => m[1]);
const onDisk = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);

test('every script tag points at a file that exists, each only once', () => {
  scripts.forEach(s => assert.ok(fs.existsSync(path.join(ROOT, s)), 'missing ' + s));
  assert.strictEqual(new Set(scripts).size, scripts.length, 'a script is included twice');
});
test('no orphan files: every js/*.js is loaded by index.html', () => {
  const orphans = onDisk.filter(f => !scripts.includes(f)); assert.deepStrictEqual(orphans, []);
});
test('every js file passes a syntax check', () => {
  for (const f of onDisk) { const r = cp.spawnSync(process.execPath, ['--check', path.join(ROOT, f)], { encoding: 'utf8' }); assert.strictEqual(r.status, 0, f + '\n' + r.stderr); }
});
test('each CF.<Module> is defined by exactly one file (extensions use CF.X.register or are listed below)', () => {
  const ALLOWED = { EasyData: ['js/20-easy-data.js', 'js/20b-easy-predict.js'] };   // 20b only adds PREDICT to the existing object
  const owners = {};
  for (const f of scripts) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of src.matchAll(/^\s*CF\.([A-Z]\w*)\s*=\s*[^=]/gm)) (owners[m[1]] = owners[m[1]] || []).push(f);
  }
  const dup = Object.entries(owners).filter(([k, v]) => v.length > 1 && !(ALLOWED[k] && v.every(x => ALLOWED[k].includes(x))));
  assert.deepStrictEqual(dup, [], 'two files both assign the same CF module: ' + JSON.stringify(dup));
});
test('load order: a file only needs modules that are loaded before it at load time', () => {
  /* the few modules that read another module the moment they load (not later, inside a function) */
  const NEEDS = { '23b-visuals-ds.js': ['23-visuals.js'], '20b-easy-predict.js': ['20-easy-data.js'], '29-lessons-builtin.js': ['24-ai-lessons.js', '23b-visuals-ds.js', '21-easy-lab.js'], '24-ai-lessons.js': ['21-easy-lab.js'], '21-easy-lab.js': ['20-easy-data.js', '18-easy-coding.js'] };
  const pos = (n) => scripts.findIndex(s => s.endsWith('/' + n));
  for (const [f, deps] of Object.entries(NEEDS)) deps.forEach(d => assert.ok(pos(d) >= 0 && pos(d) < pos(f), f + ' must load after ' + d));
});
test('the bundler produces one script and one stylesheet that contain every file', () => {
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools', 'build.js')], { encoding: 'utf8' }); assert.strictEqual(r.status, 0, r.stderr);
  const out = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
  assert.strictEqual((out.match(/<script src=/g) || []).length, 1); assert.strictEqual((out.match(/rel="stylesheet"/g) || []).length, 1);
  const app = fs.readFileSync(path.join(ROOT, 'dist', 'app.js'), 'utf8'); scripts.forEach(s => assert.ok(app.includes('/* ── ' + s + ' ── */'), s));
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'data')));
});

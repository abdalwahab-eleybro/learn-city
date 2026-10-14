/* Tiny test toolkit: loads the app's browser modules into a Node vm and runs tests, no dependencies.
   Usage in a test file:   const T = require('../lib');  T.test('name', async () => { ... });  */
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process');
const assert = require('assert');
const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(__dirname, '.cache');

/* load('23-visuals.js', ...) -> a vm context holding window.CF. opts.state adds a stub CF.State. */
function load(files, opts) {
  opts = opts || {};
  const ctx = { console, setTimeout, clearTimeout, localStorage: { getItem() { return null; }, setItem() {} }, document: {}, navigator: {} };
  ctx.window = ctx; vm.createContext(ctx);
  if (opts.state !== false) ctx.CF = { State: { profile: {}, addXP() {}, addCoins() {}, save() {} } };
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f.endsWith('.js') ? f : f + '.js'), 'utf8'), ctx, { filename: f });
  return ctx;
}
/* the modules the lesson/fight code needs, in index.html order */
const LESSON_STACK = ['18-easy-coding', '20-easy-data', '20b-easy-predict', '23-visuals', '23b-visuals-ds', '23c-visuals-general', '27-pyrun', '21-easy-lab', '24-ai-lessons'];
const FULL_STACK = LESSON_STACK.concat(['29-lessons-builtin']);   // + the shipped lessons

const hasPython = (() => { try { return cp.spawnSync('python3', ['--version']).status === 0; } catch (e) { return false; } })();
/* swap the browser's Pyodide for the real python3 running the very same harness */
function usePython(ctx) {
  fs.mkdirSync(CACHE, { recursive: true });
  const h = path.join(CACHE, 'harness.py'); fs.writeFileSync(h, ctx.CF.PyRun.HARNESS);
  ctx.CF.PyRun.setEngine((payload, t) => {
    try { return JSON.parse(cp.execFileSync('python3', ['-I', path.join(__dirname, 'tools', 'hrun.py'), h], { input: payload, timeout: t || 8000, encoding: 'utf8' })); }
    catch (e) { return { error: 'timeout or crash' }; }
  });
}

const queue = [];
function test(name, fn, o) { queue.push({ name, fn, skip: o && o.skip }); }
process.nextTick(() => setImmediate(async () => {
  let fails = 0;
  for (const t of queue) {
    if (t.skip) { console.log('  SKIP ' + t.name + ' (' + t.skip + ')'); continue; }
    try { await t.fn(); console.log('  ok   ' + t.name); }
    catch (e) { fails++; console.log('  FAIL ' + t.name + '\n       ' + String(e && e.message || e).split('\n').join('\n       ')); }
  }
  if (fails) process.exitCode = 1;
}));
/* deep equality that works across the vm boundary (arrays made inside the vm have another prototype) */
const eq = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m);
module.exports = { test, assert, eq, load, usePython, hasPython, LESSON_STACK, FULL_STACK, ROOT };

const { test, assert, eq, load, usePython, hasPython } = require('../lib');
const ctx = load(['27-pyrun', '23-visuals'], { state: false }); const P = ctx.CF.PyRun, V = ctx.CF.Visuals;
if (hasPython) usePython(ctx);
const skip = hasPython ? undefined : 'python3 not found';
test('recursion trace builds a valid stepper with a growing call stack', async () => {
  const spec = { type: 'trace', title: 'f', code: ['def fact(n):', '    if n <= 1:', '        return 1', '    return n * fact(n - 1)', 'print(fact(3))'], notes: ['a', 'b', 'c', 'd', 'e'] };
  eq(V.validate(spec), []);
  const tr = await P.trace(spec.code); assert.strictEqual(tr.error, null); assert.ok(!tr.truncated);
  const st = V.stepperFromTrace(spec, tr); eq(V.validate(st), []);
  assert.strictEqual(Math.max(...st.steps.map(s => (s.stack || []).length)), 3);
  assert.ok(st.steps.some(s => /returns 6/.test(s.caption))); assert.strictEqual(st.steps[st.steps.length - 1].out, '6');
}, { skip });
test('list and output are recorded; infinite loops are cut off', async () => {
  const tr = await P.trace(['s = []', 's.append(1)', 's.append(2)', 'print(s)']);
  eq(tr.steps.find(x => x.list && x.list.items.length === 2).list.items, [1, 2]);
  const loop = await P.trace(['x = 0', 'while True:', '    x += 1'], { max: 12 }); assert.ok(loop.truncated || loop.error);
}, { skip });
test('run, tests and diff ops', async () => {
  assert.strictEqual((await P.run('print(2+3)')).out.trim(), '5');
  assert.ok((await P.run('def (')).error);
  const r = await P.runTests('def f(x):\n    return x * 2', [{ call: 'f(2)', expect: '4' }, { call: 'f(3)', expect: '7' }]);
  eq(r.cases.map(c => c.ok), [true, false]);
  assert.ok(await P.compile('def (')); assert.ok(!(await P.compile('x = 1')));
}, { skip });

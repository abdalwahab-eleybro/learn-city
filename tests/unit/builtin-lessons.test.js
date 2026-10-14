/* The shipped lessons are checked by RUNNING their Python with the real python3 and the app's own harness. */
const { test, assert, load, usePython, hasPython, FULL_STACK } = require('../lib');
const ctx = load(FULL_STACK); const A = ctx.CF.AILessons;
if (hasPython) usePython(ctx);
const skip = hasPython ? undefined : 'python3 not found';
for (const it of A.all(null).filter(x => x.builtin)) {
  test('built-in "' + it.title + '" is valid, its code runs and its visuals are recorded', async () => {
    const s = it.script;
    if (A.isGeneral(s)) {
      assert.deepStrictEqual(Array.from(A.validate(s)), []);
      assert.ok(!/python|def |print\(/i.test(JSON.stringify(s)), 'a general lesson must contain no programming');
      assert.strictEqual(A.buildQuestions(s, it.id).map(q => q.type).join(), 'quiz,quiz,quiz,scenario,order,fill,boss');
      return;
    }
    assert.deepStrictEqual(Array.from(A.validate(s)), []);
    const v = await A.verify(s); assert.deepStrictEqual(Array.from(v.errors), []); assert.ok(!v.skipped);
    assert.ok(s.visuals.every(x => x.type !== 'trace'), 'every trace must be pre-recorded in the shipped file');
    assert.ok(s.practice.boss.tests.length >= 3);
    const wrong = await ctx.CF.PyRun.runTests(s.practice.boss.model.replace(/return /, 'return 0 and '), s.practice.boss.tests);
    assert.ok(wrong.cases.some(c => !c.ok), 'the boss tests must be able to fail a broken solution');
    const qs = A.buildQuestions(s, it.id); assert.ok(qs.length >= 6);
  }, { skip });
}

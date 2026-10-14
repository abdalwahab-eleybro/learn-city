/* Non-coding lessons (cf-lesson/2): validation, visuals, question builders, kind detection, prompts. */
const { test, assert, eq, load, FULL_STACK } = require('../lib');
const ctx = load(FULL_STACK); const A = ctx.CF.AILessons, V = ctx.CF.Visuals, Q = ctx.CF.EasyLab._q;
const clone = (o) => JSON.parse(JSON.stringify(o));
const G = () => clone(A.get('bi-listening').script);

test('the general sample validates and builds quiz×3, scenario, order, fill, boss', () => {
  const s = G(); eq(A.validate(s), []);
  assert.strictEqual(A.buildQuestions(s, 'x').map(q => q.type).join(), 'quiz,quiz,quiz,scenario,order,fill,boss');
});
test('general validation: blanks vs answers, correct index, option count, visuals restricted', () => {
  let s = G(); s.practice.fill.answers.pop(); assert.ok(A.validate(s).some(m => /blank|answer/i.test(m)));
  s = G(); s.practice.quiz[0].correct = 9; assert.ok(A.validate(s).length > 0);
  s = G(); s.practice.quiz[1].options = ['only one']; assert.ok(A.validate(s).length > 0);
  s = G(); s.visuals[0] = { type: 'hashmap', buckets: 4, ops: [] }; assert.ok(A.validate(s).some(m => /non-coding/.test(m)));
  s = G(); s.practice.boss.rubric = ['a']; assert.ok(A.validate(s).length > 0);
});
test('the five general visuals validate and describe', () => {
  const root = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
  for (const v of G().visuals.concat([
    { type: 'worked', problem: '1/2 + 1/4', steps: [{ text: 'Common denominator', result: '2/4 + 1/4' }, { text: 'Add tops' }], answer: '3/4' },
    { type: 'cards', cards: [{ front: 'hola', back: 'hello' }, { front: 'adiós', back: 'goodbye' }, { front: 'gracias', back: 'thanks' }] }])) {
    const bad = V.validate(v); eq(bad, []);
  }
  assert.ok(V.validate({ type: 'compare', leftLabel: 'a', rightLabel: 'b', rows: [] }).length > 0);
  assert.ok(V.validate({ type: 'scenario', situation: 's', choices: [{ text: 't', reply: 'r', good: false, why: 'w' }, { text: 't2', reply: 'r', good: false, why: 'w' }] }).some(m => /good/.test(m)));
  assert.ok(V.validate({ type: 'flow', steps: [{ title: 'a', text: 'b' }] }).length > 0);
});
test('question builders keep the right answer and shuffle', () => {
  for (let i = 0; i < 20; i++) {
    const q = Q.quizFromParts({ title: 't', question: 'q', options: ['a', 'b', 'c', 'd'], correct: 2, why: 'w' });
    assert.strictEqual(q.options[q.correct], 'c');
  }
  const o = Q.plainOrderFrom({ title: 't', statement: 's', steps: ['1', '2', '3', '4'] });
  eq(o.solution, ['1', '2', '3', '4']); assert.ok(o.cards.some((c, i) => c.id !== i));
  const f = Q.plainFillFrom({ title: 't', statement: 's', text: 'A ___ and a ___.\nThen ___.', answers: ['x', 'y', 'z'], extra: ['w'] });
  assert.strictEqual(f.segs.flat().filter(x => x.blank).map(x => x.answer).join(), 'x,y,z'); assert.strictEqual(f.bank.length, 4);
  const b = Q.writeBossFrom({ title: 't', prompt: 'p', model: 'm', rubric: ['a', 'b', 'c'] });
  assert.ok(b.plain && b.rubric.length === 3);
});
test('detectKind: code words local, otherwise asks Gemini, falls back to general', async () => {
  let calls = 0; const gen = (a) => async () => { calls++; if (a instanceof Error) throw a; return a; };
  assert.strictEqual(await A.detectKind('Python loops', { generate: gen('GENERAL') }), 'code'); assert.strictEqual(calls, 0);
  assert.strictEqual(await A.detectKind('communication skills', { generate: gen('GENERAL') }), 'general');
  assert.strictEqual(await A.detectKind('graph theory', { generate: gen('CODE') }), 'code');
  assert.strictEqual(await A.detectKind('Spanish verbs', { generate: gen(new Error('x')) }), 'general');
  assert.strictEqual(await A.detectKind('anything', { kind: 'general' }), 'general');
});
test('general prompts never mention Python or code; code prompts do', () => {
  const g = A.SYSTEM_GENERAL + A.FORMAT_GENERAL + 'x';
  assert.ok(!/python/i.test(A.SYSTEM_GENERAL), 'system'); assert.ok(!/python/i.test(A.FORMAT_GENERAL));
  assert.ok(!/python/i.test(A.buildPrompt('communication skills', 'beginner', '', { kind: 'general' })));
  assert.ok(/python/i.test(A.buildPrompt('loops', 'beginner', '', { kind: 'code' })));
});
test('outline for a non-coding topic returns kind general and a non-code prompt', async () => {
  const prompts = [];
  const gen = async (p) => { prompts.push(p); return /CODE or GENERAL/.test(p) ? 'GENERAL' : JSON.stringify({ course: 'Communication', icon: '🗣️', lessons: [{ title: 'Active Listening', focus: 'a' }, { title: 'Clear Speaking', focus: 'b' }, { title: 'Body Language', focus: 'c' }] }); };
  const plan = await A.outline('communication skills', { generate: gen });
  assert.strictEqual(plan.kind, 'general'); assert.ok(/NOT a programming course/.test(prompts[prompts.length - 1]));
});
test('generate for a general topic skips Python, retries on errors and stamps kind', async () => {
  let n = 0; const bad = G(); bad.practice.quiz[0].correct = 9;
  const s = await A.generate('active listening', { kind: 'general', generate: async (p, o) => { n++; assert.ok(!/python/i.test(o.system + p.split('Previous script')[0])); return JSON.stringify(n === 1 ? bad : G()); } });
  assert.strictEqual(n, 2); assert.strictEqual(s.kind, 'general');
});

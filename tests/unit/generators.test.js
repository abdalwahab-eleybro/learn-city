const { test, assert, load } = require('../lib');
const ctx = load(['18-easy-coding', '20-easy-data', '20b-easy-predict', '21-easy-lab']);
const L = ctx.CF.EasyLab, g = L._gen, P = ctx.CF.EasyCoding.PROBLEMS;

test('50 problems', () => assert.strictEqual(P.length, 50));
test('every problem builds every question type', () => {
  let order = 0, fill = 0, pred = 0;
  for (const p of P) {
    for (const k of ['time', 'space']) { const q = g.genMcq(p.num, k); assert.ok(q.options[q.correct] !== undefined, 'mcq ' + p.num); assert.strictEqual(new Set(q.options).size, q.options.length, 'mcq dupes ' + p.num); }
    if (g.orderEligible(p.num)) { order++; const q = g.genOrder(p.num); assert.ok(g.orderIsValid(q.solution, q.solution), 'order ' + p.num); }
    if (g.fillEligible(p.num)) { fill++; assert.ok(g.genFill(p.num).answers.length >= 1, 'fill ' + p.num); }
    if (g.predictEligible(p.num)) {
      pred++;
      for (let r = 0; r < 15; r++) { const q = g.genPredict(p.num); assert.strictEqual(new Set(q.options).size, 4, 'predict options ' + p.num); assert.strictEqual(q.options[q.correct], ctx.CF.EasyData.PREDICT[p.num].out); }
    }
    assert.ok(g.genBoss(p.num).starter, 'boss ' + p.num);
  }
  assert.strictEqual(order, 50); assert.strictEqual(fill, 50); assert.strictEqual(pred, 50);
});
test('a planned fight is 3 mcq, 1 predict, 2 order, 2 fill, 1 boss', () => {
  const u = L.UNITS[0], qs = g.planFight(u.id);
  assert.strictEqual(qs.map(q => q.type).join(), 'mcq,mcq,mcq,predict,order,order,fill,fill,boss');
  qs.forEach(q => assert.ok(q.card && q.card.key, 'every question has a review card'));
});
test('predictWrong makes believable distinct slips', () => {
  const W = L._q.predictWrong;
  for (const out of ['5', '0', 'True', "'abc'", '[1, 2, 3]', '[]', "['a', 'b']", '[[1, 2], [3]]']) {
    const w = W(out, 3); assert.ok(w.length >= 2, out); assert.ok(!w.includes(out), out); assert.strictEqual(new Set(w).size, w.length, out);
  }
});
test('rebuild round-trips review cards', () => {
  for (const type of ['mcq', 'order', 'fill', 'boss', 'predict']) assert.ok(L.rebuild({ num: 5, type, kind: type === 'mcq' ? 'time' : null }), type);
  assert.strictEqual(L.rebuild({ num: 9999, type: 'mcq' }), null);
});

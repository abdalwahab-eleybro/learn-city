const { test, assert, eq, load } = require('../lib');
const ctx = load(['23-visuals', '23b-visuals-ds'], { state: false });
const V = ctx.CF.Visuals, D = V._ds;
const ok = (spec) => eq(V.validate(spec), [], JSON.stringify(spec));
const no = (spec, re) => { const e = V.validate(spec); assert.ok(e.length && (!re || re.test(e.join(' '))), 'expected an error for ' + JSON.stringify(spec) + ' got ' + e); };

test('new types are registered', () => { ['linkedlist', 'stackqueue', 'tree', 'sort', 'calltree'].forEach(t => assert.ok(V.TYPES.includes(t), t)); });

test('linked list matches a plain array model', () => {
  const spec = { type: 'linkedlist', start: [1, 2, 3], ops: [{ op: 'prepend', value: 0 }, { op: 'append', value: 9 }, { op: 'insert_after', after: 2, value: 5 }, { op: 'delete', value: 1 }, { op: 'find', value: 5 }, { op: 'find', value: 77 }, { op: 'delete', value: 77 }, { op: 'reverse' }] };
  ok(spec);
  const f = D.linkedFrames(spec), a = [1, 2, 3];
  eq(f[1].nodes, [0, 1, 2, 3]); assert.strictEqual(f[1].hl.idx, 0);
  eq(f[2].nodes, [0, 1, 2, 3, 9]); eq(f[2].seen, [0, 1, 2, 3]);
  eq(f[3].nodes, [0, 1, 2, 5, 3, 9]); assert.strictEqual(f[3].hl.idx, 3);
  eq(f[4].nodes, [0, 2, 5, 3, 9]); assert.strictEqual(f[4].hl.ghost, 1);
  assert.strictEqual(f[5].hl.status, 'ok'); assert.strictEqual(f[5].hl.idx, 2);
  assert.strictEqual(f[6].hl.status, 'miss'); assert.strictEqual(f[7].hl.status, 'error');
  eq(f[8].nodes, [9, 3, 5, 2, 0]);
});
test('linked list validation', () => {
  no({ type: 'linkedlist', ops: [{ op: 'spin' }] }); no({ type: 'linkedlist', ops: [{ op: 'insert_after', value: 1 }] }, /after/);
  no({ type: 'linkedlist', start: [1, 2, 3, 4, 5, 6], ops: [{ op: 'append', value: 7 }, { op: 'append', value: 8 }, { op: 'append', value: 9 }, { op: 'append', value: 10 }] }, /9 nodes/);
});

test('stack and queue follow LIFO / FIFO with errors on empty', () => {
  const st = D.stackQueueFrames({ kind: 'stack', ops: [{ op: 'push', value: 1 }, { op: 'push', value: 2 }, { op: 'pop' }, { op: 'pop' }, { op: 'pop' }, { op: 'peek' }] });
  eq(st.map(f => f.items), [[], [1], [1, 2], [1], [], [], []]);
  assert.strictEqual(st[3].out, 2); assert.ok(/pop from empty/.test(st[5].error)); assert.ok(st[6].error);
  const q = D.stackQueueFrames({ kind: 'queue', start: ['a'], ops: [{ op: 'enqueue', value: 'b' }, { op: 'enqueue', value: 'c' }, { op: 'dequeue' }, { op: 'peek' }] });
  assert.strictEqual(q[3].out, 'a'); eq(q[3].items, ['b', 'c']); assert.strictEqual(q[4].hl.idx, 0);
  no({ type: 'stackqueue', kind: 'stack', ops: [{ op: 'enqueue', value: 1 }] }); no({ type: 'stackqueue', kind: 'heap', ops: [{ op: 'push', value: 1 }] });
  ok({ type: 'stackqueue', kind: 'queue', ops: [{ op: 'enqueue', value: 1 }, { op: 'dequeue' }] });
});

test('binary search tree: shape, search path, traversals', () => {
  const spec = { type: 'tree', start: [8, 3, 10, 1, 6, 14], ops: [{ op: 'insert', value: 4 }, { op: 'insert', value: 4 }, { op: 'find', value: 6 }, { op: 'find', value: 7 }, { op: 'inorder' }] };
  ok(spec);
  const f = D.treeFrames(spec), root = f[0].nodes.find(n => n.p === null);
  assert.strictEqual(root.v, 8); assert.strictEqual(f[0].nodes.length, 6);
  eq(f[1].hl.path, [8, 3, 6]); assert.strictEqual(f[1].hl.status, 'add'); assert.strictEqual(f[1].nodes.find(n => n.v === 4).p, 6);
  assert.strictEqual(f[2].hl.status, 'dup'); assert.strictEqual(f[2].nodes.length, 7);
  eq(f[3].hl.path, [8, 3, 6]); assert.strictEqual(f[3].hl.status, 'ok');
  assert.strictEqual(f[4].hl.status, 'miss');
  const inorder = f.filter(x => x.hl && x.hl.status === 'visit').map(x => x.hl.node);
  eq(inorder, [1, 3, 4, 6, 8, 10, 14]);                     // sorted
  eq(f[f.length - 1].out, inorder);
  for (const [op, want] of [['preorder', [8, 3, 1, 6, 4, 10, 14]], ['postorder', [1, 4, 6, 3, 14, 10, 8]], ['levelorder', [8, 3, 10, 1, 6, 14, 4]]]) {
    const g = D.treeFrames({ start: [8, 3, 10, 1, 6, 14, 4], ops: [{ op }] });
    eq(g.filter(x => x.hl && x.hl.status === 'visit').map(x => x.hl.node), want, op);
  }
  no({ type: 'tree', start: [1, 2, 3, 4, 5, 6], ops: [{ op: 'insert', value: 7 }] }, /deep/);
  no({ type: 'tree', start: [5], ops: [{ op: 'insert', value: 1.5 }] });
});

test('sorting: every algorithm really sorts, never loses a value, and counts', () => {
  for (const algo of ['bubble', 'selection', 'insertion', 'merge']) {
    for (const values of [[5, 2, 4, 1, 3], [1, 2, 3, 4], [9, 7, 5, 3, 1, 0], [4, 3, 9]]) {
      const spec = { type: 'sort', algo, values }; ok(spec);
      const f = D.sortFrames(spec), want = values.slice().sort((a, b) => a - b);
      f.forEach(fr => eq(fr.arr.slice().sort((a, b) => a - b), want, algo + ' lost a value'));
      const last = f[f.length - 1];
      eq(last.arr, want, algo); assert.strictEqual(last.hl.sorted.length, values.length);
      assert.ok(f.length <= 60, algo + ' frames ' + f.length);
    }
  }
  const b = D.sortFrames({ algo: 'bubble', values: [3, 2, 1] }); assert.strictEqual(b[b.length - 1].stats.s, 3);
  const sorted = D.sortFrames({ algo: 'bubble', values: [1, 2, 3, 4] }); assert.strictEqual(sorted[sorted.length - 1].stats.s, 0);   // early exit, no swaps
  no({ type: 'sort', algo: 'quantum', values: [1, 2, 3] }); no({ type: 'sort', algo: 'bubble', values: [1, 1, 2] }, /different/); no({ type: 'sort', algo: 'bubble', values: [1, 2] });
});

test('call tree: return values equal the real functions, stack is balanced', () => {
  const fib = n => n < 2 ? n : fib(n - 1) + fib(n - 2), fact = n => n <= 1 ? 1 : n * fact(n - 1), sum = n => n === 0 ? 0 : n + sum(n - 1);
  for (const [fn, n, real, calls] of [['fib', 5, fib, 15], ['fib', 2, fib, 3], ['factorial', 6, fact, 6], ['sum_to', 4, sum, 5], ['power', 10, e => 2 ** e, 5]]) {
    const spec = { type: 'calltree', fn, n }; ok(spec);
    const T = D.callTreeFrames(spec);
    assert.strictEqual(T.root.ret, real(n), fn + n); assert.strictEqual(T.calls, calls, fn + n + ' calls');
    assert.strictEqual(T.frames.length, 1 + 2 * calls); assert.ok(T.frames.length <= 41);
    const last = T.frames[T.frames.length - 1]; eq(last.stack, []); assert.ok(Object.values(last.state).every(s => s === 2));
    T.frames.forEach(f => assert.ok(f.stack.length <= T.levels));
  }
  no({ type: 'calltree', fn: 'fib', n: 9 }, /from 2 to 5/); no({ type: 'calltree', fn: 'ackermann', n: 2 });
});

test('stack frames are consistent with the recorded tree (fib 3)', () => {
  const T = D.callTreeFrames({ fn: 'fib', n: 3 });
  eq(T.frames.slice(1).map(f => f.stack.join('>')), ['fib(3)', 'fib(3)>fib(2)', 'fib(3)>fib(2)>fib(1)', 'fib(3)>fib(2)', 'fib(3)>fib(2)>fib(0)', 'fib(3)>fib(2)', 'fib(3)', 'fib(3)>fib(1)', 'fib(3)', '']);
});

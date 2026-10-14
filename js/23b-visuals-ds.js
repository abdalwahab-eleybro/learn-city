/* ═══════════════════════════════════════════════════════════ */
/*  23b-visuals-ds.js — data-structure & algorithm visuals       */
/*                                                              */
/*    linkedlist  nodes and pointers: prepend, append, insert,   */
/*                delete, find, reverse                          */
/*    stackqueue  a stack (LIFO) or a queue (FIFO)               */
/*    tree        binary search tree: insert, find, 4 traversals */
/*    sort        bubble, selection, insertion, merge            */
/*    calltree    the call tree + call stack of a recursive      */
/*                function (fib, factorial, sum_to, power)       */
/*                                                              */
/*  Same rule as the other visuals: the spec holds only INPUTS    */
/*  (values and operations); every frame is computed here, so an  */
/*  AI can never draw a wrong picture.                            */
/*  Pure compute functions are exported on CF.Visuals._ds.        */
/*  Depends on: 23-visuals.js (register + _ui helpers).           */
/* ═══════════════════════════════════════════════════════════ */
(function () {
  const V = CF.Visuals, U = V._ui;
  const { esc, frameShell, caption, codeChip, isScalar, sameKey, py, show } = U;
  const isInt = (v) => Number.isInteger(v) && v >= -99 && v <= 999;
  const MAX_FRAMES = 60;

  function validateOps(ops, allowed, bad, each, max) {
    if (!Array.isArray(ops) || ops.length < 1 || ops.length > (max || 10)) return bad('ops must have 1-' + (max || 10) + ' items');
    ops.forEach((o, i) => {
      if (!o || typeof o !== 'object' || !allowed.includes(o.op)) return bad('op ' + i + ' must use one of: ' + allowed.join(', '));
      each(o, i);
    });
  }

  /* ═════════════════════════ LINKED LIST ═════════════════════════ */
  function linkedFrames(spec) {
    const L = (spec.start || []).slice();
    const find = (v) => L.findIndex(x => sameKey(x, v));
    const upto = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
    const frames = [{
      code: L.length ? `ll = LinkedList.from_list([${L.map(py).join(', ')}])` : 'll = LinkedList()',
      caption: L.length ? 'A linked list is a chain of nodes. Each node holds a value and a pointer to the NEXT node. The head pointer remembers the first node, and the last node points to None.' : 'An empty linked list: head points at None.',
      nodes: L.slice(), hl: null, seen: []
    }];
    spec.ops.forEach(o => {
      const f = { nodes: null, hl: null, seen: [], code: '', caption: '' };
      if (o.op === 'prepend') {
        L.unshift(o.value); f.code = `ll.prepend(${py(o.value)})`; f.hl = { idx: 0, status: 'add' };
        f.caption = 'Make a new node, point it at the old head, then move head to it. Only two pointers change and nothing is walked: O(1).';
      } else if (o.op === 'append') {
        const walked = L.length; L.push(o.value); f.code = `ll.append(${py(o.value)})`; f.hl = { idx: L.length - 1, status: 'add' }; f.seen = upto(walked);
        f.caption = walked ? `With only a head pointer you must walk past all ${walked} node${walked > 1 ? 's' : ''} to reach the end, then link the new node there: O(n).` : 'The list was empty, so the new node simply becomes the head.';
      } else if (o.op === 'insert_after') {
        const i = find(o.after); f.code = `ll.insert_after(${py(o.after)}, ${py(o.value)})`;
        if (i < 0) { f.hl = { status: 'error' }; f.seen = upto(L.length); f.caption = `${py(o.after)} is not in the list, so there is nowhere to insert. Nothing changes.`; }
        else { L.splice(i + 1, 0, o.value); f.hl = { idx: i + 1, status: 'add' }; f.seen = upto(i + 1); f.caption = `Walk to ${py(o.after)} (${i + 1} node${i ? 's' : ''} looked at), point the new node at ${py(o.after)}'s old next node, then point ${py(o.after)} at the new node. Linking is O(1); finding the spot is O(n).`; }
      } else if (o.op === 'delete') {
        const i = find(o.value); f.code = `ll.delete(${py(o.value)})`;
        if (i < 0) { f.hl = { status: 'error' }; f.seen = upto(L.length); f.caption = `${py(o.value)} is not in the list. Nothing is deleted.`; }
        else {
          L.splice(i, 1); f.hl = { status: 'del', ghost: o.value, at: i }; f.seen = upto(i);
          f.caption = i === 0 ? 'Deleting the head: just move head to the next node. The old head is no longer reachable and gets cleaned up.' : `Walk to the node BEFORE ${py(o.value)} and point it past ${py(o.value)}. Nothing points at the removed node any more, so it is cleaned up.`;
        }
      } else if (o.op === 'find') {
        const i = find(o.value); f.code = `ll.find(${py(o.value)})`;
        f.seen = upto(i >= 0 ? i : L.length); f.hl = i >= 0 ? { idx: i, status: 'ok' } : { status: 'miss' };
        f.caption = i >= 0 ? `Check nodes one at a time from the head. Found ${py(o.value)} after looking at ${i + 1} node${i ? 's' : ''}. There is no shortcut to the middle: O(n).` : `Walked all ${L.length} node${L.length === 1 ? '' : 's'} and never saw ${py(o.value)}. A miss costs a full walk: O(n).`;
      } else {
        L.reverse(); f.code = 'll.reverse()'; f.hl = { status: 'rev' };
        f.caption = 'Walk the list once and flip every pointer to point backwards. The old tail becomes the head. O(n) time and O(1) extra space.';
      }
      f.nodes = L.slice();
      frames.push(f);
    });
    return frames;
  }
  function renderLinked(root, spec) {
    const frames = linkedFrames(spec);
    return frameShell(root, spec, frames.length, (stage, i) => {
      const f = frames[i], hl = f.hl || {};
      const cells = f.nodes.map((v, k) => `<div class="v2-node ${hl.idx === k ? 'hit ' + hl.status : ''} ${f.seen.includes(k) ? 'seen' : ''}"><b>${esc(show(v))}</b><i>${k}</i></div>`);
      if (hl.ghost !== undefined) cells.splice(hl.at, 0, `<div class="v2-node ghost del"><b>${esc(show(hl.ghost))}</b><i>removed</i></div>`);
      const chain = cells.map(c => c + '<span class="v2-arrow">→</span>').join('');
      stage.innerHTML = `${codeChip(f.code)}<div class="v2-ll"><span class="v2-ptr">head</span><span class="v2-arrow">→</span>${chain}<span class="v2-none">None</span></div>
        ${caption(f.caption, hl.status === 'error' ? 'bad' : hl.status === 'add' || hl.status === 'ok' ? 'good' : hl.status === 'del' || hl.status === 'miss' ? 'warn' : '')}
        ${i === 0 ? '<div class="v2-foot">Yellow nodes are the ones that had to be visited on the way.</div>' : ''}`;
    }, (i) => {
      const f = frames[i];
      return `Visual "${spec.title || 'linked list'}": a singly linked list head → ${f.nodes.join(' → ') || '(empty)'} → None. Python being run: ${f.code}. On-screen caption: ${f.caption}`;
    });
  }
  V.register('linkedlist', {
    validate(spec, bad) {
      if (spec.start !== undefined && (!Array.isArray(spec.start) || spec.start.length > 6 || !spec.start.every(isScalar))) bad('linkedlist.start must be up to 6 short values');
      validateOps(spec.ops, ['prepend', 'append', 'insert_after', 'delete', 'find', 'reverse'], bad, (o, i) => {
        if (['prepend', 'append', 'insert_after'].includes(o.op) && !isScalar(o.value)) bad('op ' + i + ': needs a short "value"');
        if (o.op === 'insert_after' && !isScalar(o.after)) bad('op ' + i + ': insert_after needs a short "after" value');
        if (['delete', 'find'].includes(o.op) && !isScalar(o.value)) bad('op ' + i + ': needs a short "value"');
      });
      if (!Array.isArray(spec.ops)) return;
      const fr = linkedFrames(spec);
      if (fr.some(f => f.nodes.length > 9)) bad('the list may never grow beyond 9 nodes');
    },
    render: renderLinked
  });

  /* ═════════════════════════ STACK / QUEUE ═════════════════════════ */
  function stackQueueFrames(spec) {
    const stack = spec.kind === 'stack', A = (spec.start || []).slice();
    const sn = stack ? 'stack' : 'queue', empty = stack ? 'IndexError: pop from empty list' : 'IndexError: pop from an empty deque';
    const frames = [{
      code: stack ? `s = [${A.map(py).join(', ')}]` : `q = deque([${A.map(py).join(', ')}])`,
      caption: stack ? 'A stack: add and remove at the SAME end (the top). The last value in is the first value out (LIFO), like a pile of plates.' : 'A queue: add at the back, remove from the front. The first value in is the first value out (FIFO), like a line at a shop.',
      items: A.slice(), hl: null, out: null, error: null
    }];
    spec.ops.forEach(o => {
      const f = { items: null, hl: null, out: null, error: null, code: '', caption: '' };
      if (o.op === 'push' || o.op === 'enqueue') {
        A.push(o.value); f.code = stack ? `s.append(${py(o.value)})` : `q.append(${py(o.value)})`; f.hl = { idx: A.length - 1, status: 'add' };
        f.caption = stack ? `Push ${py(o.value)}: it goes on TOP of the stack, covering what was there.` : `Enqueue ${py(o.value)}: it joins the BACK of the line.`;
      } else if (o.op === 'pop' || o.op === 'dequeue') {
        f.code = stack ? 's.pop()' : 'q.popleft()';
        if (!A.length) { f.error = empty; f.hl = { status: 'error' }; f.caption = `The ${sn} is empty, so there is nothing to remove. Check before you ${stack ? 'pop' : 'dequeue'}.`; }
        else {
          const v = stack ? A.pop() : A.shift(); f.out = v; f.hl = { status: 'rem' };
          f.caption = stack ? `Pop: the TOP value, ${py(v)}, comes off. It was the most recently added, so it leaves first.` : `Dequeue: the FRONT value, ${py(v)}, is served first. It was waiting the longest.`;
        }
      } else {
        f.code = stack ? 's[-1]' : 'q[0]';
        if (!A.length) { f.error = stack ? 'IndexError: list index out of range' : 'IndexError: deque index out of range'; f.hl = { status: 'error' }; f.caption = `Nothing to peek at: the ${sn} is empty.`; }
        else { const k = stack ? A.length - 1 : 0; f.hl = { idx: k, status: 'peek' }; f.caption = `Peek: look at the ${stack ? 'top' : 'front'} value, ${py(A[k])}, without removing it.`; }
      }
      f.items = A.slice(); frames.push(f);
    });
    return frames;
  }
  function renderStackQueue(root, spec) {
    const frames = stackQueueFrames(spec), stack = spec.kind === 'stack';
    return frameShell(root, spec, frames.length, (stage, i) => {
      const f = frames[i], hl = f.hl || {};
      const cell = (v, k) => `<div class="v2-scell ${hl.idx === k ? 'hit ' + hl.status : ''}">${esc(show(v))}</div>`;
      const gone = f.out !== null ? `<div class="v2-gone">${stack ? 'popped' : 'served'}: <b>${esc(show(f.out))}</b></div>` : '';
      let vis;
      if (stack) vis = `<div class="v2-stackcol"><span class="v2-ends">top</span>${f.items.slice().reverse().map((v, r) => cell(v, f.items.length - 1 - r)).join('') || '<span class="v2-empty">empty</span>'}<div class="v2-floor"></div></div>`;
      else vis = `<div class="v2-queuerow"><span class="v2-ends">front</span><div class="v2-qcells">${f.items.map(cell).join('') || '<span class="v2-empty">empty</span>'}</div><span class="v2-ends">back</span></div>`;
      stage.innerHTML = `${codeChip(f.code)}${vis}${gone}${f.error ? `<div class="v2-error">⚠️ ${esc(f.error)}</div>` : ''}${caption(f.caption, f.error ? 'bad' : hl.status === 'add' ? 'good' : '')}`;
    }, (i) => {
      const f = frames[i];
      return `Visual "${spec.title || spec.kind}": a ${spec.kind}. Python being run: ${f.code}. Contents from ${stack ? 'bottom to top' : 'front to back'}: [${f.items.join(', ')}].${f.out !== null ? ' Removed: ' + f.out + '.' : ''}${f.error ? ' Error: ' + f.error + '.' : ''} On-screen caption: ${f.caption}`;
    });
  }
  V.register('stackqueue', {
    validate(spec, bad) {
      if (!['stack', 'queue'].includes(spec.kind)) return bad('stackqueue.kind must be "stack" or "queue"');
      if (spec.start !== undefined && (!Array.isArray(spec.start) || spec.start.length > 5 || !spec.start.every(isScalar))) bad('stackqueue.start must be up to 5 short values');
      const allowed = spec.kind === 'stack' ? ['push', 'pop', 'peek'] : ['enqueue', 'dequeue', 'peek'];
      validateOps(spec.ops, allowed, bad, (o, i) => { if (['push', 'enqueue'].includes(o.op) && !isScalar(o.value)) bad('op ' + i + ': needs a short "value"'); }, 14);
      if (!Array.isArray(spec.ops)) return;
      if (stackQueueFrames(spec).some(f => f.items.length > 8)) bad('the ' + spec.kind + ' may never hold more than 8 values');
    },
    render: renderStackQueue
  });

  /* ═════════════════════════ BINARY SEARCH TREE ═════════════════════════ */
  function treeFrames(spec) {
    let rootN = null;
    const insert = (v) => {
      const path = [];
      if (!rootN) { rootN = { v }; path.push(v); return { path, added: true }; }
      let n = rootN;
      for (;;) {
        path.push(n.v);
        if (v === n.v) return { path, added: false };
        const side = v < n.v ? 'l' : 'r';
        if (!n[side]) { n[side] = { v }; return { path, added: true }; }
        n = n[side];
      }
    };
    const snap = () => {                              // x = in-order position, d = depth
      const out = []; let i = 0;
      (function walk(n, d, p) { if (!n) return; walk(n.l, d + 1, n.v); out.push({ v: n.v, i: i++, d, p }); walk(n.r, d + 1, n.v); })(rootN, 0, null);
      return out;
    };
    const depth = (n) => n ? 1 + Math.max(depth(n.l), depth(n.r)) : 0;
    (spec.start || []).forEach(insert);
    const steps = (path, v) => path.map(p => v === p ? `${v} = ${p}, a duplicate` : `${v} ${v < p ? '<' : '>'} ${p}: go ${v < p ? 'left' : 'right'}`);
    const frames = [{
      code: (spec.start && spec.start.length) ? `root = build([${spec.start.join(', ')}])` : 'root = None',
      caption: 'A binary search tree: every node has at most two children. Smaller values live in the LEFT subtree, bigger values in the RIGHT subtree. That rule is what makes searching fast.',
      nodes: snap(), hl: null, out: [], seen: []
    }];
    spec.ops.forEach(o => {
      if (o.op === 'insert') {
        const wasEmpty = !rootN, r = insert(o.value);
        frames.push({ code: `root = insert(root, ${o.value})`, nodes: snap(), out: [], seen: [], hl: { path: r.path, status: r.added ? 'add' : 'dup', node: o.value },
          caption: wasEmpty ? `The tree was empty, so ${o.value} becomes the root.` : `Start at the root. ${steps(r.path, o.value).join('. ')}. ${r.added ? `That spot is empty, so ${o.value} becomes a new leaf.` : 'It is already in the tree, so nothing changes.'}` });
      } else if (o.op === 'find') {
        const path = []; let n = rootN, hit = false;
        while (n) { path.push(n.v); if (o.value === n.v) { hit = true; break; } n = o.value < n.v ? n.l : n.r; }
        frames.push({ code: `find(root, ${o.value})`, nodes: snap(), out: [], seen: [], hl: { path, status: hit ? 'ok' : 'miss', node: hit ? o.value : null },
          caption: `${steps(path, o.value).join('. ')}. ${hit ? `Found ${o.value} after ${path.length} comparison${path.length > 1 ? 's' : ''}. Each step throws away a whole subtree.` : `Reached an empty spot: ${o.value} is not in the tree (${path.length} comparison${path.length === 1 ? '' : 's'}).`}` });
      } else {
        const order = []; const nodes = snap();
        const visit = (n) => order.push(n.v);
        (function walk(n) {
          if (!n) return;
          if (o.op === 'preorder') visit(n);
          walk(n.l);
          if (o.op === 'inorder') visit(n);
          walk(n.r);
          if (o.op === 'postorder') visit(n);
        })(o.op === 'levelorder' ? null : rootN);
        if (o.op === 'levelorder') { const q = rootN ? [rootN] : []; while (q.length) { const n = q.shift(); visit(n); if (n.l) q.push(n.l); if (n.r) q.push(n.r); } }
        const rule = { inorder: 'left, node, right', preorder: 'node, left, right', postorder: 'left, right, node', levelorder: 'level by level, using a queue' }[o.op];
        const note = { inorder: ' Inorder on a search tree always comes out SORTED.', preorder: ' Preorder visits a parent before its children, handy for copying a tree.', postorder: ' Postorder visits children before the parent, handy for deleting a tree.', levelorder: ' This is breadth-first search.' }[o.op];
        order.forEach((v, k) => frames.push({ code: `${o.op}(root)`, nodes, out: order.slice(0, k + 1), seen: order.slice(0, k), hl: { path: [], status: 'visit', node: v },
          caption: `${o.op[0].toUpperCase() + o.op.slice(1)} = ${rule}. Visit ${v}. Output so far: [${order.slice(0, k + 1).join(', ')}].${k === order.length - 1 ? note : ''}` }));
      }
    });
    frames.depth = depth(rootN);
    return frames;
  }
  function renderTree(root, spec) {
    const frames = treeFrames(spec);
    return frameShell(root, spec, frames.length, (stage, i) => {
      const f = frames[i], hl = f.hl || {}, N = f.nodes, n = Math.max(N.length, 1);
      const W = 340, H = 30 + 46 * Math.max(1, ...N.map(x => x.d + 1)), X = (k) => 22 + (W - 44) * (n === 1 ? 0.5 : k / (n - 1)), Y = (d) => 24 + 46 * d;
      const byV = new Map(N.map(x => [x.v, x]));
      const edges = N.filter(x => x.p !== null).map(x => { const p = byV.get(x.p), onPath = hl.path && hl.path.includes(x.v) && hl.path.includes(x.p); return `<line class="v2-edge ${onPath ? 'path' : ''}" x1="${X(p.i)}" y1="${Y(p.d)}" x2="${X(x.i)}" y2="${Y(x.d)}"/>`; }).join('');
      const circles = N.map(x => {
        const cls = [hl.node === x.v ? 'cur ' + hl.status : '', hl.path && hl.path.includes(x.v) ? 'path' : '', f.seen.includes(x.v) ? 'seen' : ''].join(' ');
        return `<g class="v2-tn ${cls}"><circle cx="${X(x.i)}" cy="${Y(x.d)}" r="15"/><text x="${X(x.i)}" y="${Y(x.d) + 4}" text-anchor="middle">${esc(x.v)}</text></g>`;
      }).join('');
      const tone = hl.status === 'dup' || hl.status === 'miss' ? 'warn' : hl.status ? 'good' : '';
      stage.innerHTML = `${codeChip(f.code)}<svg class="v2-tree" viewBox="0 0 ${W} ${H}" role="img" aria-label="Binary search tree">${edges}${circles}${N.length ? '' : '<text x="170" y="40" text-anchor="middle" class="v2-vt dim">empty tree</text>'}</svg>
        ${f.out.length ? `<div class="v2-out"><span>output</span>[${f.out.map(esc).join(', ')}]</div>` : ''}${caption(f.caption, tone)}`;
    }, (i) => {
      const f = frames[i];
      return `Visual "${spec.title || 'binary search tree'}": a binary search tree with nodes ${f.nodes.map(x => x.v + (x.p !== null ? ' (child of ' + x.p + ')' : ' (root)')).join(', ') || '(none)'}. Python being run: ${f.code}.${f.out.length ? ' Output so far: [' + f.out.join(', ') + '].' : ''} On-screen caption: ${f.caption}`;
    });
  }
  V.register('tree', {
    validate(spec, bad) {
      if (spec.start !== undefined && (!Array.isArray(spec.start) || spec.start.length > 8 || !spec.start.every(isInt))) bad('tree.start must be up to 8 whole numbers (-99 to 999)');
      validateOps(spec.ops, ['insert', 'find', 'inorder', 'preorder', 'postorder', 'levelorder'], bad, (o, i) => { if (['insert', 'find'].includes(o.op) && !isInt(o.value)) bad('op ' + i + ': needs a whole-number "value"'); }, 8);
      if (!Array.isArray(spec.ops) || (spec.start && !Array.isArray(spec.start))) return;
      const fr = treeFrames(spec);
      if (fr.length > 45) bad('the tree animation is too long (' + fr.length + ' steps, at most 45); use fewer traversals');
      if (fr.some(f => f.nodes.length > 12)) bad('the tree may never have more than 12 nodes');
      if (fr.depth > 5) bad('the tree is too deep (at most 5 levels); choose values that spread out');
    },
    render: renderTree
  });

  /* ═════════════════════════ SORTING ═════════════════════════ */
  const SORT_INFO = {
    bubble: { name: 'Bubble sort', fn: 'bubble_sort', say: 'O(n²) time in the worst case, O(1) extra space. Simple, but slow on big lists.' },
    selection: { name: 'Selection sort', fn: 'selection_sort', say: 'O(n²) time always, O(1) extra space. It makes few swaps but still compares a lot.' },
    insertion: { name: 'Insertion sort', fn: 'insertion_sort', say: 'O(n²) time in the worst case but close to O(n) when the list is nearly sorted. O(1) extra space.' },
    merge: { name: 'Merge sort', fn: 'merge_sort', say: 'O(n log n) time, O(n) extra space. Split in halves, sort each, then merge. Much faster on big lists.' }
  };
  function sortFrames(spec) {
    const a = spec.values.slice(), n = a.length, info = SORT_INFO[spec.algo], frames = [];
    let c = 0, s = 0, sorted = [];
    const rec = (text, hl) => frames.push({ arr: a.slice(), hl: Object.assign({ cmp: null, swap: null, range: null, key: null, min: null, write: null }, hl || {}, { sorted: sorted.slice() }), caption: text, stats: { c, s }, merge: spec.algo === 'merge' });
    const swap = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; s++; };
    rec(`${info.name}. Here is the unsorted list. Step through to watch every comparison${spec.algo === 'merge' ? ' and every value written' : ' and swap'}.`);
    if (spec.algo === 'bubble') {
      for (let i = 0; i < n - 1; i++) {
        let any = false;
        for (let j = 0; j < n - 1 - i; j++) {
          c++;
          if (a[j] > a[j + 1]) { rec(`Compare ${a[j]} and ${a[j + 1]}: ${a[j]} is bigger, so they are in the wrong order.`, { cmp: [j, j + 1] }); swap(j, j + 1); any = true; rec('Swap them: the bigger value moves one step to the right.', { swap: [j, j + 1] }); }
          else rec(`Compare ${a[j]} and ${a[j + 1]}: already in order, leave them.`, { cmp: [j, j + 1] });
        }
        sorted.push(n - 1 - i);
        if (!any) { for (let k = 0; k < n - 1 - i; k++) sorted.push(k); rec('No swaps happened in this pass, so the whole list is sorted and we can stop early.'); break; }
        rec(`End of pass ${i + 1}: the biggest value, ${a[n - 1 - i]}, has bubbled to its final place.`);
      }
    } else if (spec.algo === 'selection') {
      for (let i = 0; i < n - 1; i++) {
        let m = i; rec(`Pass ${i + 1}: find the smallest value in the unsorted part. Start by assuming position ${i} (${a[i]}) is the smallest.`, { min: m });
        for (let j = i + 1; j < n; j++) { c++; rec(`Compare ${a[j]} with the smallest so far, ${a[m]}.`, { cmp: [j, m], min: m }); if (a[j] < a[m]) { m = j; rec(`${a[j]} is smaller: it is the new smallest.`, { min: m }); } }
        if (m !== i) { const was = a[m]; swap(i, m); rec(`Swap the smallest value, ${was}, into position ${i}.`, { swap: [i, m] }); } else rec(`${a[i]} is already the smallest, so it stays in place.`, { min: i });
        sorted.push(i);
      }
      sorted.push(n - 1);
    } else if (spec.algo === 'insertion') {
      sorted = [0];
      for (let i = 1; i < n; i++) {
        rec(`Take ${a[i]} and slide it left into the sorted part until it fits.`, { key: i });
        let j = i;
        while (j > 0) {
          c++;
          if (a[j - 1] > a[j]) { rec(`${a[j - 1]} is bigger than ${a[j]}, so ${a[j]} must move left.`, { cmp: [j - 1, j] }); swap(j - 1, j); rec('Swap: it moves one place left.', { swap: [j - 1, j], key: j - 1 }); j--; }
          else { rec(`${a[j - 1]} is not bigger than ${a[j]}: it fits here, stop.`, { cmp: [j - 1, j] }); break; }
        }
        sorted = Array.from({ length: i + 1 }, (_, k) => k);
        rec(`The first ${i + 1} values are now sorted.`);
      }
    } else {
      const ms = (lo, hi) => {
        if (hi - lo < 2) return;
        const mid = (lo + hi) >> 1; ms(lo, mid); ms(mid, hi);
        const Lh = a.slice(lo, mid), Rh = a.slice(mid, hi); let i = 0, j = 0, k = lo;
        rec(`Merge the two sorted halves [${Lh.join(', ')}] and [${Rh.join(', ')}] into one sorted run.`, { range: [lo, hi] });
        while (i < Lh.length || j < Rh.length) {
          let left, text;
          if (i >= Lh.length) { left = false; text = `Left half is used up: copy ${Rh[j]} from the right.`; }
          else if (j >= Rh.length) { left = true; text = `Right half is used up: copy ${Lh[i]} from the left.`; }
          else { c++; left = Lh[i] <= Rh[j]; text = `Compare ${Lh[i]} (left) with ${Rh[j]} (right): take the smaller, ${left ? Lh[i] : Rh[j]}.`; }
          a[k] = left ? Lh[i++] : Rh[j++]; s++; k++;
          const rest = Lh.slice(i).concat(Rh.slice(j)); rest.forEach((v, m) => { a[k + m] = v; });   // not-yet-merged values stay visible, so nothing seems to vanish
          rec(text, { range: [lo, hi], write: k - 1 });
        }
      };
      ms(0, n);
    }
    sorted = Array.from({ length: n }, (_, k) => k);
    rec(`Sorted! ${c} comparison${c === 1 ? '' : 's'}, ${s} ${spec.algo === 'merge' ? 'writes' : 'swaps'}. ${info.say}`);
    return frames;
  }
  function renderSort(root, spec) {
    const frames = sortFrames(spec), info = SORT_INFO[spec.algo], max = Math.max(...spec.values, 1);
    return frameShell(root, spec, frames.length, (stage, i) => {
      const f = frames[i], hl = f.hl;
      const bars = f.arr.map((v, k) => {
        const cls = [hl.sorted.includes(k) ? 'sorted' : '', hl.cmp && hl.cmp.includes(k) ? 'cmp' : '', hl.swap && hl.swap.includes(k) ? 'swap' : '', hl.key === k ? 'key' : '', hl.min === k ? 'min' : '', hl.write === k ? 'write' : '', hl.range && k >= hl.range[0] && k < hl.range[1] ? 'inrange' : ''].join(' ');
        return `<div class="v2-bar ${cls}"><b>${esc(v)}</b><div class="v2-barfill" style="height:${Math.max(8, Math.round(100 * v / max))}%"></div><i>${k}</i></div>`;
      }).join('');
      stage.innerHTML = `${codeChip(`${info.fn}(a)`)}<div class="v2-bars">${bars}</div>
        <div class="v2-stats"><span>comparisons <b>${f.stats.c}</b></span><span>${f.merge ? 'writes' : 'swaps'} <b>${f.stats.s}</b></span></div>${caption(f.caption, i === frames.length - 1 ? 'good' : '')}
        ${i === 0 ? '<div class="v2-foot">Yellow = being compared · red = swapped · green = in its final place.</div>' : ''}`;
    }, (i) => {
      const f = frames[i];
      return `Visual "${spec.title || info.name}": ${info.name} on the list [${f.arr.join(', ')}] (positions in their final sorted place: ${f.hl.sorted.join(', ') || 'none yet'}). Comparisons so far: ${f.stats.c}, ${f.merge ? 'writes' : 'swaps'}: ${f.stats.s}. On-screen caption: ${f.caption}`;
    });
  }
  V.register('sort', {
    validate(spec, bad) {
      if (!SORT_INFO[spec.algo]) return bad('sort.algo must be one of: ' + Object.keys(SORT_INFO).join(', '));
      if (!Array.isArray(spec.values) || spec.values.length < 3 || spec.values.length > 7 || !spec.values.every(v => Number.isInteger(v) && v >= 0 && v <= 99)) return bad('sort.values must be 3-7 whole numbers from 0 to 99');
      if (new Set(spec.values).size !== spec.values.length) bad('sort.values must all be different (so each bar is easy to follow)');
      else if (sortFrames(spec).length > MAX_FRAMES) bad('the sorting animation is too long; use fewer values');
    },
    render: renderSort
  });

  /* ═════════════════════════ RECURSION CALL TREE ═════════════════════════ */
  const RECURSION = {
    fib: { code: ['def fib(n):', '    if n < 2:', '        return n', '    return fib(n - 1) + fib(n - 2)'], max: 5, min: 2 },
    factorial: { code: ['def factorial(n):', '    if n <= 1:', '        return 1', '    return n * factorial(n - 1)'], max: 6, min: 2 },
    sum_to: { code: ['def sum_to(n):', '    if n == 0:', '        return 0', '    return n + sum_to(n - 1)'], max: 6, min: 1 },
    power: { code: ['def power(b, e):', '    if e == 0:', '        return 1', '    half = power(b, e // 2)', '    if e % 2 == 0:', '        return half * half', '    return half * half * b'], max: 12, min: 1 }
  };
  function buildCall(fn, n, id) {
    const node = { id: id.n++, kids: [], fn, n };
    if (fn === 'fib') {
      node.label = `fib(${n})`;
      if (n < 2) { node.base = true; node.ret = n; }
      else { const a = buildCall(fn, n - 1, id), b = buildCall(fn, n - 2, id); node.kids = [a, b]; node.ret = a.ret + b.ret; node.combine = `${a.ret} + ${b.ret} = ${node.ret}`; }
    } else if (fn === 'factorial') {
      node.label = `factorial(${n})`;
      if (n <= 1) { node.base = true; node.ret = 1; }
      else { const a = buildCall(fn, n - 1, id); node.kids = [a]; node.ret = n * a.ret; node.combine = `${n} × ${a.ret} = ${node.ret}`; }
    } else if (fn === 'sum_to') {
      node.label = `sum_to(${n})`;
      if (n === 0) { node.base = true; node.ret = 0; }
      else { const a = buildCall(fn, n - 1, id); node.kids = [a]; node.ret = n + a.ret; node.combine = `${n} + ${a.ret} = ${node.ret}`; }
    } else {
      node.label = `power(2, ${n})`;
      if (n === 0) { node.base = true; node.ret = 1; }
      else { const a = buildCall(fn, Math.floor(n / 2), id); node.kids = [a]; const sq = a.ret * a.ret; node.odd = n % 2 === 1; node.ret = node.odd ? sq * 2 : sq; node.combine = node.odd ? `${a.ret} × ${a.ret} × 2 = ${node.ret}` : `${a.ret} × ${a.ret} = ${node.ret}`; }
    }
    return node;
  }
  function callTreeFrames(spec) {
    const R = RECURSION[spec.fn], rootN = buildCall(spec.fn, spec.n, { n: 0 }), all = [];
    let leaf = 0;
    (function lay(n, d) { all.push(n); n.d = d; n.kids.forEach(k => lay(k, d + 1)); n.x = n.kids.length ? n.kids.reduce((s, k) => s + k.x, 0) / n.kids.length : leaf++; })(rootN, 0);
    const leaves = leaf, levels = Math.max(...all.map(n => n.d)) + 1;
    const state = {}, stack = [], frames = [];
    const snap = (text, line, cur) => frames.push({ text, line, cur, state: Object.assign({}, state), stack: stack.map(n => n.label) });
    snap(`We call ${rootN.label}. Watch the tree of calls grow, and the call stack fill up and empty again.`, 0, null);
    (function run(n) {
      state[n.id] = 1; stack.push(n);
      snap(n.base ? `Call ${n.label}. This is the BASE case: it needs no more calls.` : `Call ${n.label}. Not the base case, so it waits while it calls ${n.kids.map(k => k.label).join(' and ')}.`, 1, n.id);
      n.kids.forEach(run);
      state[n.id] = 2; stack.pop();
      snap(n.base ? `${n.label} answers right away: it returns ${n.ret}.` : `${n.label} gets its answer${n.kids.length > 1 ? 's' : ''} back (${n.combine}) and returns ${n.ret}.`, n.base ? 2 : (spec.fn === 'power' ? (n.odd ? 6 : 5) : 3), n.id);
    })(rootN);
    return { frames, nodes: all, leaves, levels, root: rootN, code: R.code, calls: all.length };
  }
  function renderCallTree(root, spec) {
    const T = callTreeFrames(spec);
    return frameShell(root, spec, T.frames.length, (stage, i) => {
      const f = T.frames[i], W = 340, H = 18 + 50 * T.levels, pw = Math.min(46, (W - 8) / T.leaves - 3);
      const X = (n) => (W * (n.x + 0.5)) / T.leaves, Y = (n) => 22 + 50 * n.d;
      const edges = T.nodes.filter(n => n.kids.length).map(n => n.kids.map(k => `<line class="v2-edge ${f.state[k.id] ? 'path' : 'faint'}" x1="${X(n)}" y1="${Y(n) + 14}" x2="${X(k)}" y2="${Y(k) - 14}"/>`).join('')).join('');
      const boxes = T.nodes.map(n => {
        const st = f.state[n.id] || 0, label = n.label.replace('power(2, ', 'p(2,').replace('factorial', 'fact');
        return `<g class="v2-cn st${st} ${f.cur === n.id ? 'cur' : ''}"><rect x="${X(n) - pw / 2}" y="${Y(n) - 15}" width="${pw}" height="30" rx="8"/><text x="${X(n)}" y="${Y(n) - 3}" text-anchor="middle" class="v2-cl1">${esc(label)}</text><text x="${X(n)}" y="${Y(n) + 10}" text-anchor="middle" class="v2-cl2">${st === 2 ? '→ ' + esc(n.ret) : st === 1 ? '…' : ''}</text></g>`;
      }).join('');
      const code = T.code.map((l, k) => `<span class="v2-cl ${k === f.line ? 'on' : ''}"><i>${k + 1}</i>${esc(l)}</span>`).join('');
      const stackHTML = f.stack.length ? `<div class="v2-stack" aria-label="Call stack"><div class="v2-var-name">call stack (top first)</div>${f.stack.slice().reverse().map((l, k) => `<div class="v2-frame ${k === 0 ? 'top' : ''}">${esc(l)}</div>`).join('')}</div>` : '<div class="v2-stack"><div class="v2-var-name">call stack</div><div class="v2-empty">empty: all calls have returned</div></div>';
      stage.innerHTML = `<pre class="v2-code">${code}</pre><svg class="v2-calltree" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tree of recursive calls">${edges}${boxes}</svg>${stackHTML}${caption(f.text, i === T.frames.length - 1 ? 'good' : '')}
        ${i === 0 ? `<div class="v2-foot">${T.calls} calls in total${spec.fn === 'fib' ? '. Notice how the same small calls repeat: that is why naive Fibonacci is O(2ⁿ).' : '.'}</div>` : ''}`;
    }, (i) => {
      const f = T.frames[i];
      return `Visual "${spec.title || 'recursion'}": the calls made by ${T.root.label} (${T.calls} calls). Code:\n${T.code.join('\n')}\nCalls so far: ${T.nodes.filter(n => f.state[n.id]).map(n => n.label + (f.state[n.id] === 2 ? '=' + n.ret : ' (waiting)')).join(', ') || 'none'}. Call stack (bottom to top): ${f.stack.join(' > ') || 'empty'}. On-screen caption: ${f.text}`;
    });
  }
  V.register('calltree', {
    validate(spec, bad) {
      const R = RECURSION[spec.fn];
      if (!R) return bad('calltree.fn must be one of: ' + Object.keys(RECURSION).join(', '));
      if (!Number.isInteger(spec.n) || spec.n < R.min || spec.n > R.max) return bad(`calltree.n for ${spec.fn} must be a whole number from ${R.min} to ${R.max}`);
    },
    render: renderCallTree
  });

  V._ds = { linkedFrames, stackQueueFrames, treeFrames, sortFrames, callTreeFrames, SORT_INFO, RECURSION };
})();

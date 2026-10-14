/* ═══════════════════════════════════════════════════════════ */
/*  23-visuals.js — interactive coding visuals from JSON specs   */
/*                                                              */
/*  "Gemini writes DATA, the app draws it."                      */
/*  Every visual is a small JSON object with a `type`:           */
/*    stepper  code lines + variable boxes, step by step         */
/*    branch   if / elif / else path; pick a case, see the route  */
/*    hashmap  buckets, hashing, collisions (frames COMPUTED)     */
/*    set      add / in / remove, no duplicates (COMPUTED)        */
/*    venn     union, intersection, difference (COMPUTED)         */
/*    tuple    index, unpack, "can't change", rebuild (COMPUTED)  */
/*    bigo     growth curves with an n slider                     */
/*  More types live in 23b-visuals-ds.js: linkedlist, stackqueue, */
/*    tree, sort, calltree (all frames COMPUTED here, not drawn    */
/*    by the AI).                                                 */
/*                                                              */
/*  API  CF.Visuals.validate(spec) -> [error strings]            */
/*       CF.Visuals.render(container, spec) -> { destroy() }     */
/*  hashmap / set / venn / tuple frames are calculated here from  */
/*  the `ops`, so an AI can never draw a wrong picture.          */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.Visuals = (() => {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const py = (v) => typeof v === 'number' ? String(v) : JSON.stringify(String(v));   // how a value looks in Python source
  const show = (v) => typeof v === 'number' ? String(v) : String(v);
  const isScalar = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 14) || (typeof v === 'number' && isFinite(v));
  const TYPES = ['stepper', 'trace', 'branch', 'hashmap', 'set', 'venn', 'tuple', 'bigo'];
  const EXT = {};                                   // visual types added by other files (see register)

  /* ═════════ VALIDATION ═════════ */
  function validate(spec) {
    const err = [];
    const bad = (m) => err.push(m);
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return ['visual must be an object'];
    if (!TYPES.includes(spec.type)) return ['unknown visual type "' + spec.type + '" (use one of ' + TYPES.join(', ') + ')'];
    if (spec.title !== undefined && (typeof spec.title !== 'string' || spec.title.length > 90)) bad('title must be a string under 90 characters');
    const t = spec.type;
    if (t === 'trace') {
      if (!Array.isArray(spec.code) || spec.code.length < 2 || spec.code.length > 14 || !spec.code.every(l => typeof l === 'string' && l.length <= 90)) bad('trace.code must be 2-14 strings of Python');
      if (spec.notes !== undefined && (!Array.isArray(spec.notes) || spec.notes.length !== (spec.code || []).length || !spec.notes.every(n => typeof n === 'string' && n.length <= 160))) bad('trace.notes must have one short sentence per code line');
    }
    if (t === 'stepper') {
      if (spec.semantics !== undefined && !['before', 'after'].includes(spec.semantics)) bad('stepper.semantics must be "before" or "after"');
      if (!Array.isArray(spec.code) || spec.code.length < 1 || spec.code.length > 14 || !spec.code.every(l => typeof l === 'string' && l.length <= 90)) bad('stepper.code must be 1-14 strings');
      if (!Array.isArray(spec.steps) || spec.steps.length < 2 || spec.steps.length > 40) bad('stepper.steps must have 2-40 steps');
      else spec.steps.forEach((s, i) => {
        if (!s || typeof s !== 'object') return bad('step ' + i + ' must be an object');
        if (!Number.isInteger(s.line) || s.line < 0 || (Array.isArray(spec.code) && s.line >= spec.code.length)) bad('step ' + i + ': "line" must be a valid code line index (0-based)');
        if (typeof s.caption !== 'string' || !s.caption || s.caption.length > 200) bad('step ' + i + ': caption must be a non-empty string under 200 chars');
        if (s.vars !== undefined) {
          if (!s.vars || typeof s.vars !== 'object' || Array.isArray(s.vars)) bad('step ' + i + ': vars must be an object');
          else if (Object.keys(s.vars).length > 6 || !Object.values(s.vars).every(v => ['string', 'number', 'boolean'].includes(typeof v) && String(v).length <= 24)) bad('step ' + i + ': vars must hold at most 6 short plain values');
        }
        if (s.list !== undefined) {
          const l = s.list;
          if (!l || typeof l.name !== 'string' || !Array.isArray(l.items) || l.items.length > 10 || !l.items.every(x => ['string', 'number', 'boolean'].includes(typeof x) && String(x).length <= 10)) bad('step ' + i + ': list needs a name and at most 10 short items');
          else if (l.at !== undefined && l.at !== null && (!Number.isInteger(l.at) || l.at < 0 || l.at >= l.items.length)) bad('step ' + i + ': list.at must point at an item');
        }
        if (s.out !== undefined && (typeof s.out !== 'string' || s.out.length > 80)) bad('step ' + i + ': out must be a short string');
        if (s.stack !== undefined && (!Array.isArray(s.stack) || s.stack.length > 8 || !s.stack.every(x => typeof x === 'string' && x.length <= 30))) bad('step ' + i + ': stack must be at most 8 short strings');
        if (s.predict !== undefined) {
          const q = s.predict;
          if (!q || typeof q.q !== 'string' || !q.q || q.q.length > 140 || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4 || !q.options.every(o => typeof o === 'string' && o && o.length <= 40) || !Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) bad('step ' + i + ': predict needs q, 2-4 short options and a valid "correct" index');
        }
      });
    } else if (t === 'branch') {
      if (!Array.isArray(spec.branches) || spec.branches.length < 2 || spec.branches.length > 5) bad('branch.branches must have 2-5 items');
      else spec.branches.forEach((b, i) => { if (!b || typeof b.test !== 'string' || !b.test || b.test.length > 40 || typeof b.does !== 'string' || !b.does || b.does.length > 60) bad('branch ' + i + ' needs "test" and "does" (short strings)'); });
      if (!Array.isArray(spec.cases) || spec.cases.length < 1 || spec.cases.length > 6) bad('branch.cases must have 1-6 items');
      else spec.cases.forEach((c, i) => {
        if (!c || typeof c.label !== 'string' || !c.label || c.label.length > 30) bad('case ' + i + ' needs a short label');
        else if (!Number.isInteger(c.takes) || c.takes < 0 || (Array.isArray(spec.branches) && c.takes >= spec.branches.length)) bad('case ' + i + ': "takes" must be a branch index');
        if (c && (typeof c.why !== 'string' || c.why.length > 160)) bad('case ' + i + ' needs a "why" sentence under 160 chars');
      });
    } else if (t === 'hashmap') {
      if (!Number.isInteger(spec.buckets) || spec.buckets < 3 || spec.buckets > 8) bad('hashmap.buckets must be an integer 3-8');
      validateOps(spec.ops, ['put', 'get', 'delete', 'in'], bad, (o, i) => {
        if (!isScalar(o.key)) bad('op ' + i + ': key must be a short string or number');
        if (o.op === 'put' && !isScalar(o.value)) bad('op ' + i + ': put needs a short "value"');
      });
    } else if (t === 'set') {
      if (spec.start !== undefined && (!Array.isArray(spec.start) || spec.start.length > 8 || !spec.start.every(isScalar))) bad('set.start must be up to 8 short values');
      validateOps(spec.ops, ['add', 'in', 'remove', 'discard'], bad, (o, i) => { if (!isScalar(o.value)) bad('op ' + i + ': value must be a short string or number'); });
    } else if (t === 'venn') {
      ['a', 'b'].forEach(k => { if (!Array.isArray(spec[k]) || spec[k].length < 1 || spec[k].length > 8 || !spec[k].every(isScalar)) bad('venn.' + k + ' must be 1-8 short values'); });
      if (spec.nameA !== undefined && (typeof spec.nameA !== 'string' || spec.nameA.length > 14)) bad('nameA must be a short string');
      if (spec.nameB !== undefined && (typeof spec.nameB !== 'string' || spec.nameB.length > 14)) bad('nameB must be a short string');
    } else if (t === 'tuple') {
      if (!Array.isArray(spec.values) || spec.values.length < 2 || spec.values.length > 6 || !spec.values.every(isScalar)) bad('tuple.values must be 2-6 short values');
      validateOps(spec.ops, ['index', 'unpack', 'assign', 'rebuild', 'slice'], bad, (o, i) => {
        const n = Array.isArray(spec.values) ? spec.values.length : 0;
        if (['index', 'assign', 'rebuild'].includes(o.op) && (!Number.isInteger(o.i) || o.i < -n || o.i >= n)) bad('op ' + i + ': i must be a valid index (negative counts from the end)');
        if (['assign', 'rebuild'].includes(o.op) && !isScalar(o.value)) bad('op ' + i + ': needs a short "value"');
        if (o.op === 'unpack' && (!Array.isArray(o.names) || o.names.length !== n || !o.names.every(x => typeof x === 'string' && /^[A-Za-z_]\w{0,9}$/.test(x)))) bad('op ' + i + ': unpack needs one variable name per value');
        if (o.op === 'slice' && !(Number.isInteger(o.a) && Number.isInteger(o.b) && o.a >= 0 && o.b <= n && o.a < o.b)) bad('op ' + i + ': slice needs 0 <= a < b <= length');
      });
    } else if (t === 'bigo') {
      const ok = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'];
      if (!Array.isArray(spec.curves) || spec.curves.length < 2 || !spec.curves.every(c => ok.includes(c))) bad('bigo.curves must be 2+ of ' + ok.join(', '));
      if (spec.highlight !== undefined && !ok.includes(spec.highlight)) bad('bigo.highlight must be one of the curves');
    } else if (EXT[t]) {
      try { EXT[t].validate(spec, bad); } catch (e) { bad(t + ': ' + e.message); }
    }
    return err;
  }
  function validateOps(ops, allowed, bad, each) {
    if (!Array.isArray(ops) || ops.length < 1 || ops.length > 12) return bad('ops must have 1-12 items');
    ops.forEach((o, i) => {
      if (!o || typeof o !== 'object' || !allowed.includes(o.op)) return bad('op ' + i + ' must use one of: ' + allowed.join(', '));
      each(o, i);
    });
  }

  /* ═════════ COMPUTED FRAMES (pure) ═════════ */
  /* teaching hash: add up the character codes (numbers hash to themselves) */
  function hashParts(key, n) {
    const codes = typeof key === 'number' ? [key] : Array.from(String(key)).map(c => c.charCodeAt(0));
    const sum = codes.reduce((a, b) => a + b, 0);
    const idx = ((sum % n) + n) % n;
    const line = typeof key === 'number'
      ? `hash(${key}) = ${key}   →   ${key} % ${n} = ${idx}`
      : `hash(${py(key)}) = ${codes.join(' + ')} = ${sum}   →   ${sum} % ${n} = ${idx}`;
    return { sum, idx, line };
  }
  const sameKey = (a, b) => String(a) === String(b) && typeof a === typeof b;

  function hashmapFrames(spec) {
    const n = spec.buckets, B = Array.from({ length: n }, () => []);
    const snap = () => B.map(c => c.map(e => ({ k: e.k, v: e.v })));
    const frames = [{ code: 'd = {}', caption: `An empty dictionary. Under the hood it is ${n} buckets (numbered 0 to ${n - 1}) waiting for keys.`, buckets: snap(), hl: null }];
    spec.ops.forEach(o => {
      const h = hashParts(o.key, n), chain = B[h.idx], at = chain.findIndex(e => sameKey(e.k, o.key));
      let code, caption, status = 'info';
      if (o.op === 'put') {
        code = `d[${py(o.key)}] = ${py(o.value)}`;
        if (at >= 0) { chain[at].v = o.value; caption = `The key ${py(o.key)} is already in bucket ${h.idx}, so its value is replaced. A dictionary never holds the same key twice.`; status = 'update'; }
        else if (chain.length) { chain.push({ k: o.key, v: o.value }); caption = `Bucket ${h.idx} is already used by ${py(chain[0].k)}. That is a COLLISION: both keys share the bucket, chained one after the other. Lookups still work, they just check the chain.`; status = 'collision'; }
        else { chain.push({ k: o.key, v: o.value }); caption = `Bucket ${h.idx} was empty, so ${py(o.key)} goes straight in. No searching was needed.`; status = 'ok'; }
      } else if (o.op === 'get') {
        code = `d[${py(o.key)}]`;
        if (at >= 0) { caption = `Jump straight to bucket ${h.idx}${chain.length > 1 ? ', walk the short chain' : ''} and find ${py(o.key)}. The value is ${py(chain[at].v)}. This is why a lookup is O(1) on average.`; status = 'ok'; }
        else { caption = `Bucket ${h.idx} has no ${py(o.key)}, so Python raises a KeyError. Use d.get(key) to get None instead of an error.`; status = 'error'; }
      } else if (o.op === 'delete') {
        code = `del d[${py(o.key)}]`;
        if (at >= 0) { chain.splice(at, 1); caption = `Found ${py(o.key)} in bucket ${h.idx} and removed it.`; status = 'ok'; }
        else { caption = `Bucket ${h.idx} has no ${py(o.key)}, so del raises a KeyError.`; status = 'error'; }
      } else {
        code = `${py(o.key)} in d`;
        caption = at >= 0 ? `Hash the key, open bucket ${h.idx}, and the key is there: True.` : `Hash the key, open bucket ${h.idx}, and it is not there: False. The other buckets were never looked at.`;
        status = at >= 0 ? 'ok' : 'miss';
      }
      frames.push({ code, caption, buckets: snap(), hash: h.line, hl: { b: h.idx, k: o.key, status, op: o.op } });
    });
    return frames;
  }

  function setFrames(spec) {
    const items = (spec.start || []).filter((v, i, a) => a.findIndex(x => sameKey(x, v)) === i);
    const snap = () => items.slice();
    const has = v => items.findIndex(x => sameKey(x, v));
    const frames = [{ code: items.length ? 's = {' + items.map(py).join(', ') + '}' : 's = set()', caption: items.length ? 'A set holds each value once, with no order.' : 'An empty set. (Plain {} would make a dictionary, so use set().)', items: snap(), hl: null }];
    spec.ops.forEach(o => {
      const i = has(o.value); let code, caption, status = 'ok';
      if (o.op === 'add') {
        code = `s.add(${py(o.value)})`;
        if (i >= 0) { caption = `${py(o.value)} is already in the set, so nothing changes. Sets never keep duplicates.`; status = 'dup'; }
        else { items.push(o.value); caption = `${py(o.value)} was not there, so it is added.`; }
      } else if (o.op === 'in') {
        code = `${py(o.value)} in s`;
        caption = i >= 0 ? 'True. Membership is checked by hashing, so it is O(1), far faster than scanning a list.' : 'False. Not in the set. Still O(1): no scanning.'; status = i >= 0 ? 'ok' : 'miss';
      } else if (o.op === 'remove') {
        code = `s.remove(${py(o.value)})`;
        if (i >= 0) { items.splice(i, 1); caption = `${py(o.value)} is removed.`; }
        else { caption = `${py(o.value)} is not in the set, so remove raises a KeyError.`; status = 'error'; }
      } else {
        code = `s.discard(${py(o.value)})`;
        if (i >= 0) { items.splice(i, 1); caption = `${py(o.value)} is removed.`; }
        else { caption = `${py(o.value)} was not there. discard shrugs and does nothing, no error.`; status = 'dup'; }
      }
      frames.push({ code, caption, items: snap(), hl: { v: o.value, status, op: o.op } });
    });
    return frames;
  }

  function vennCompute(a, b) {
    const uniq = (x) => x.filter((v, i, arr) => arr.findIndex(y => sameKey(y, v)) === i);
    const A = uniq(a), B = uniq(b), inB = v => B.some(x => sameKey(x, v)), inA = v => A.some(x => sameKey(x, v));
    const onlyA = A.filter(v => !inB(v)), both = A.filter(inB), onlyB = B.filter(v => !inA(v));
    return {
      onlyA, both, onlyB,
      ops: {
        union: { sym: 'a | b', method: 'a.union(b)', result: [...onlyA, ...both, ...onlyB], regions: ['A', 'AB', 'B'], say: 'everything in either set' },
        intersection: { sym: 'a & b', method: 'a.intersection(b)', result: both, regions: ['AB'], say: 'only what is in BOTH' },
        difference: { sym: 'a - b', method: 'a.difference(b)', result: onlyA, regions: ['A'], say: 'what is in a but NOT in b' },
        symmetric: { sym: 'a ^ b', method: 'a.symmetric_difference(b)', result: [...onlyA, ...onlyB], regions: ['A', 'B'], say: 'in one set but not both' }
      }
    };
  }

  function tupleFrames(spec) {
    const v = spec.values.slice(), n = v.length, norm = i => i < 0 ? i + n : i;
    const frames = [{ code: 't = (' + v.map(py).join(', ') + (n === 1 ? ',' : '') + ')', caption: 'A tuple: an ordered row of values, locked once it is made. Each slot has a number, starting at 0.', values: v.slice(), hl: [], names: null, error: null, next: null }];
    spec.ops.forEach(o => {
      const f = { values: v.slice(), hl: [], names: null, error: null, next: null };
      if (o.op === 'index') {
        const i = norm(o.i); f.code = `t[${o.i}]`; f.hl = [i];
        f.caption = `Slot ${i}${o.i < 0 ? ' (negative numbers count from the end)' : ''} holds ${py(v[i])}. Reading never changes the tuple.`;
      } else if (o.op === 'unpack') {
        f.code = `${o.names.join(', ')} = t`; f.hl = v.map((_, i) => i); f.names = o.names.slice();
        f.caption = 'Unpacking: each value is handed to a variable, left to right. The counts must match.';
      } else if (o.op === 'assign') {
        const i = norm(o.i); f.code = `t[${o.i}] = ${py(o.value)}`; f.hl = [i];
        f.error = "TypeError: 'tuple' object does not support item assignment";
        f.caption = 'Tuples are immutable: you cannot change a slot after creation. That is a feature, it means nobody can alter it by accident.';
      } else if (o.op === 'rebuild') {
        const i = norm(o.i), nv = v.slice(); nv[i] = o.value;
        f.code = `t = t[:${i}] + (${py(o.value)},) + t[${i + 1}:]`; f.hl = [i]; f.next = nv;
        f.caption = 'To "change" a tuple, build a NEW one from pieces. The old tuple is untouched; the name t now points at the new one.';
      } else {
        f.code = `t[${o.a}:${o.b}]`; f.hl = []; for (let i = o.a; i < o.b; i++) f.hl.push(i); f.next = v.slice(o.a, o.b);
        f.caption = `A slice copies slots ${o.a} up to (but not including) ${o.b} into a new tuple.`;
      }
      frames.push(f);
    });
    return frames;
  }

  const BIGO = {
    'O(1)': { f: n => 1, color: '#22c55e', note: 'constant: same work for any size' },
    'O(log n)': { f: n => Math.log2(Math.max(n, 1)), color: '#22d3ee', note: 'halving: doubling n adds one step' },
    'O(n)': { f: n => n, color: '#fbbf24', note: 'one pass: work grows in step with n' },
    'O(n log n)': { f: n => n * Math.log2(Math.max(n, 1)), color: '#f97316', note: 'good sorting' },
    'O(n²)': { f: n => n * n, color: '#ef4444', note: 'loop in a loop: doubling n quadruples the work' }
  };

  /* ═════════ RENDER HELPERS ═════════ */
  function frameShell(root, spec, count, draw, describe, locked) {
    let i = 0, alive = true;
    const paint = () => {
      if (!alive) return;
      root.innerHTML = `<div class="v2-card" data-vtype="${esc(spec.type)}">
        ${spec.title ? `<div class="v2-title">${esc(spec.title)}</div>` : ''}
        <div class="v2-stage"></div>
        <div class="v2-nav"><button class="btn ghost v2-prev" ${i === 0 ? 'disabled' : ''} aria-label="Previous step">◀ Back</button>
          <span class="v2-dots">${Array.from({ length: count }, (_, k) => `<i class="${k === i ? 'now' : k < i ? 'on' : ''}"></i>`).join('')}</span>
          <button class="btn primary v2-next" ${i === count - 1 || (locked && locked(i)) ? 'disabled' : ''} aria-label="Next step">${i === count - 1 ? 'Done' : (locked && locked(i)) ? 'Answer first' : 'Next ▶'}</button></div>
        <div class="v2-count">Step ${i + 1} of ${count}</div></div>`;
      draw(root.querySelector('.v2-stage'), i);
      root.querySelector('.v2-prev').addEventListener('click', () => { if (i > 0) { i--; paint(); } });
      root.querySelector('.v2-next').addEventListener('click', () => { if (i < count - 1) { i++; paint(); } });
    };
    paint();
    return { destroy() { alive = false; }, go(k) { i = Math.max(0, Math.min(count - 1, k)); paint(); }, repaint: () => paint(), describe: () => (describe ? `Step ${i + 1} of ${count}. ` + describe(i) : '') };
  }
  const caption = (t, tone) => `<div class="v2-caption ${tone || ''}">${esc(t)}</div>`;
  const codeChip = (c) => `<div class="v2-codeline"><span class="v2-prompt">&gt;&gt;&gt;</span> ${esc(c)}</div>`;

  /* ── stepper ── */
  function renderStepper(root, spec) {
    const names = []; spec.steps.forEach(s => Object.keys(s.vars || {}).forEach(k => { if (!names.includes(k)) names.push(k); }));
    const picked = {};                       // step index -> option chosen (for predict steps)
    const asking = (i) => !!(spec.steps[i].predict && picked[i] === undefined);
    let shell = null;
    const before = spec.semantics === 'before';
    shell = frameShell(root, spec, spec.steps.length, (stage, i) => {
      const s = spec.steps[i], prev = i > 0 ? spec.steps[i - 1] : null, pv = prev && prev.vars || {}, cv = s.vars || {};
      const q = s.predict, ask = asking(i);
      const code = spec.code.map((l, k) => `<span class="v2-cl ${k === s.line ? 'on' : ''}"><i>${k + 1}</i>${esc(l) || ' '}</span>`).join('');
      const stackHTML = s.stack && s.stack.length ? `<div class="v2-stack" aria-label="Call stack"><div class="v2-var-name">call stack</div>${s.stack.slice().reverse().map((f, k) => `<div class="v2-frame ${k === 0 ? 'top' : ''}">${esc(f)}</div>`).join('')}</div>` : '';
      let body = '';
      if (ask) {
        body = `<div class="v2-predict"><div class="v2-predict-q">🔮 ${esc(q.q)}</div><div class="v2-predict-opts">${q.options.map((o, k) => `<button class="v2-popt" data-k="${k}">${esc(o)}</button>`).join('')}</div></div>`;
      } else {
        const boxes = names.map(n => {
          const has = Object.prototype.hasOwnProperty.call(cv, n), changed = has && (!prev || String(pv[n]) !== String(cv[n]));
          return `<div class="v2-var ${has ? '' : 'empty'} ${changed ? 'changed' : ''}"><div class="v2-var-name">${esc(n)}</div><div class="v2-var-box">${has ? esc(cv[n]) : '?'}</div></div>`;
        }).join('');
        let list = '';
        if (s.list) list = `<div class="v2-list"><div class="v2-var-name">${esc(s.list.name)}</div><div class="v2-cells">${s.list.items.map((x, k) => `<div class="v2-cell ${s.list.at === k ? 'at' : ''}"><b>${esc(x)}</b><i>${k}</i></div>`).join('') || '<span class="v2-empty">empty</span>'}</div></div>`;
        const verdict = q ? `<div class="v2-caption ${picked[i] === q.correct ? 'good' : 'bad'}">${picked[i] === q.correct ? '✅ Right.' : '❌ Not quite. It was ' + esc(q.options[q.correct]) + '.'}</div>` : '';
        body = `${boxes ? `<div class="v2-vars">${boxes}</div>` : ''}${list}${s.out ? `<div class="v2-out"><span>output</span>${esc(s.out)}</div>` : ''}${verdict}${caption(s.caption)}`;
      }
      stage.innerHTML = `<pre class="v2-code">${code}</pre>${stackHTML}${body}${i === 0 && before ? '<div class="v2-foot">Values shown are from before the highlighted line runs.</div>' : ''}`;
      stage.querySelectorAll('.v2-popt').forEach(b => b.addEventListener('click', () => { picked[i] = Number(b.dataset.k); shell.repaint(); }));
    }, (i) => {
      const s = spec.steps[i];
      return `Visual "${spec.title || 'stepper'}": a step-through of this code:\n${spec.code.map((l, k) => (k === s.line ? '=> ' : '   ') + l).join('\n')}\nThe arrow marks the line ${before ? 'about to run' : 'just run'}. Variables now: ${Object.keys(s.vars || {}).map(k => k + ' = ' + s.vars[k]).join(', ') || 'none yet'}.${s.list ? ` List ${s.list.name} = [${s.list.items.join(', ')}].` : ''}${s.stack && s.stack.length ? ` Call stack (bottom to top): ${s.stack.join(' > ')}.` : ''}${s.out ? ` Output so far: ${s.out}.` : ''}${asking(i) ? ' The learner is currently being asked: ' + s.predict.q + ' (answer hidden).' : ' On-screen caption: ' + s.caption}`;
    }, (i) => asking(i));
    return shell;
  }

  /* a "trace" spec = { type:'trace', title, code:[lines], notes:[one sentence per line] }.
     The app RUNS the code (CF.PyRun.trace) and this turns the recorded steps into a stepper,
     so every value on screen is real. Pure function (tested without a browser). */
  function stepperFromTrace(spec, tr) {
    const notes = spec.notes || [];
    const steps = tr.steps.map(st => {
      const o = { line: Math.max(0, Math.min(spec.code.length - 1, st.line)), caption: '', vars: st.vars || {} };
      if (st.kind === 'return') o.caption = `This call returns ${st.ret}.`;
      else if (st.kind === 'end') o.caption = 'The program is finished.';
      else o.caption = notes[st.line] || `Line ${st.line + 1} is about to run.`;
      if (st.list) o.list = st.list;
      if (st.stack && st.stack.length) o.stack = st.stack;
      if (st.out) o.out = st.out;
      return o;
    });
    return { type: 'stepper', title: spec.title, code: spec.code, semantics: 'before', steps };
  }

  /* ── branch ── */
  function renderBranch(root, spec) {
    let sel = -1, alive = true;
    const draw = () => {
      if (!alive) return;
      const c = sel >= 0 ? spec.cases[sel] : null;
      const kw = (i, n) => i === 0 ? 'if' : (i === n - 1 && /^else$/i.test(spec.branches[i].test)) ? 'else' : 'elif';
      const rows = spec.branches.map((b, i) => {
        const n = spec.branches.length, k = kw(i, n);
        const checked = c ? i <= c.takes : false, taken = c ? i === c.takes : false;
        const state = !c ? '' : taken ? 'taken' : (i < c.takes ? 'skipped' : 'unseen');
        return `<div class="v2-br ${state}">
          <div class="v2-br-test"><span class="v2-kw">${k}</span> ${k === 'else' ? '' : esc(b.test) + ' ?'}${checked && !taken && k !== 'else' ? '<em class="v2-no">No</em>' : ''}${taken && k !== 'else' ? '<em class="v2-yes">Yes</em>' : ''}</div>
          <div class="v2-br-does">${taken ? '➜ ' : ''}${esc(b.does)}</div></div>`;
      }).join('<div class="v2-br-link" aria-hidden="true">↓ no</div>');
      root.innerHTML = `<div class="v2-card" data-vtype="branch">${spec.title ? `<div class="v2-title">${esc(spec.title)}</div>` : ''}
        <div class="v2-cases">${spec.cases.map((x, i) => `<button class="v2-case ${i === sel ? 'on' : ''}" data-i="${i}">${esc(x.label)}</button>`).join('')}</div>
        <div class="v2-branches">${rows}</div>
        ${c ? caption(`Only ONE branch runs: ${spec.branches[c.takes].does}. ${c.why}`) : caption('Pick a value above to see which way the program goes. Python checks the tests from the top and stops at the first Yes.', 'hint')}</div>`;
      root.querySelectorAll('.v2-case').forEach(b => b.addEventListener('click', () => { sel = Number(b.dataset.i); draw(); }));
    };
    draw();
    return { destroy() { alive = false; }, describe: () => `Visual "${spec.title || 'if/elif/else'}": branches in order: ${spec.branches.map((b, i) => (i === 0 ? 'if ' : i === spec.branches.length - 1 && /^else$/i.test(b.test) ? 'else' : 'elif ') + (/^else$/i.test(b.test) ? '' : b.test) + ' -> ' + b.does).join('; ')}. ${sel >= 0 ? `The learner picked the case "${spec.cases[sel].label}": branch ${spec.cases[sel].takes} runs. ${spec.cases[sel].why}` : 'No case picked yet.'}` };
  }

  /* ── hashmap ── */
  function renderHashmap(root, spec) {
    const frames = hashmapFrames(spec);
    return frameShell(root, spec, frames.length, (stage, i) => {
      const f = frames[i], hl = f.hl;
      const rows = f.buckets.map((chain, b) => {
        const on = hl && hl.b === b;
        const chips = chain.map(e => {
          const hit = on && sameKey(e.k, hl.k);
          return `<span class="v2-entry ${hit ? 'hit ' + hl.status : ''}"><b>${esc(show(e.k))}</b><i>:</i> ${esc(show(e.v))}</span>`;
        }).join('<span class="v2-chain">→</span>');
        const ghost = on && hl.op === 'get' && hl.status === 'error' || on && hl.op === 'delete' && hl.status === 'error' || on && hl.op === 'in' && hl.status === 'miss';
        return `<div class="v2-bucket ${on ? 'on ' + hl.status : ''}"><span class="v2-bi">${b}</span><div class="v2-bchain">${chips || '<span class="v2-empty">empty</span>'}${ghost ? '<span class="v2-ghost">✕ not here</span>' : ''}</div></div>`;
      }).join('');
      const tone = hl ? (hl.status === 'error' ? 'bad' : hl.status === 'collision' ? 'warn' : hl.status === 'ok' || hl.status === 'update' ? 'good' : '') : '';
      stage.innerHTML = `${codeChip(f.code)}${f.hash ? `<div class="v2-hash">${esc(f.hash)}</div>` : ''}<div class="v2-buckets">${rows}</div>${caption(f.caption, tone)}
        ${i === 0 ? '<div class="v2-foot">Teaching hash: add the character codes, then take the remainder. Real Python hashes differ, the idea is identical.</div>' : ''}`;
    }, (i) => {
      const f = frames[i];
      return `Visual "${spec.title || 'hash map'}": a dictionary drawn as ${spec.buckets} buckets (teaching hash = sum of character codes % ${spec.buckets}). Python being run: ${f.code}. ${f.hash ? 'Hashing: ' + f.hash + '. ' : ''}Buckets now: ${f.buckets.map((c, b) => b + ':[' + c.map(e => e.k + '=' + e.v).join(', ') + ']').join(' ')}. On-screen caption: ${f.caption}`;
    });
  }

  /* ── set ── */
  function renderSet(root, spec) {
    const frames = setFrames(spec);
    return frameShell(root, spec, frames.length, (stage, i) => {
      const f = frames[i], hl = f.hl;
      const chips = f.items.map(x => `<span class="v2-chip ${hl && sameKey(x, hl.v) && (hl.status === 'ok' || hl.status === 'dup') ? 'hit' : ''}">${esc(show(x))}</span>`).join('') || '<span class="v2-empty">empty</span>';
      const ghost = hl && (hl.status === 'dup' && hl.op === 'add' ? `<span class="v2-chip ghost dup">${esc(show(hl.v))} ✕ already here</span>`
        : hl.status === 'miss' ? `<span class="v2-chip ghost">${esc(show(hl.v))}? not found</span>`
        : hl.status === 'error' ? `<span class="v2-chip ghost dup">${esc(show(hl.v))}? KeyError</span>`
        : hl.status === 'dup' ? `<span class="v2-chip ghost">${esc(show(hl.v))} was not there</span>` : '') || '';
      const tone = hl ? (hl.status === 'error' ? 'bad' : hl.status === 'dup' ? 'warn' : hl.status === 'miss' ? '' : 'good') : '';
      stage.innerHTML = `${codeChip(f.code)}<div class="v2-set"><div class="v2-set-brace">{</div><div class="v2-set-body">${chips}</div><div class="v2-set-brace">}</div></div>
        ${ghost ? `<div class="v2-ghosts">${ghost}</div>` : ''}${caption(f.caption, tone)}`;
    }, (i) => {
      const f = frames[i];
      return `Visual "${spec.title || 'set'}": a Python set. Python being run: ${f.code}. The set now holds {${f.items.join(', ')}}. On-screen caption: ${f.caption}`;
    });
  }

  /* ── venn ── */
  function renderVenn(root, spec) {
    const V = vennCompute(spec.a, spec.b), nameA = spec.nameA || 'a', nameB = spec.nameB || 'b';
    let sel = 'union', alive = true;
    const col = (arr, x, hot) => {
      const shown = arr.slice(0, 6), more = arr.length - shown.length;
      return shown.map((v, k) => `<text x="${x}" y="${100 - (shown.length - 1) * 11 + k * 22}" text-anchor="middle" class="v2-vt ${hot ? 'hot' : ''}">${esc(show(v))}</text>`).join('') +
        (more > 0 ? `<text x="${x}" y="${100 + (shown.length) * 11 + 8}" text-anchor="middle" class="v2-vt dim">+${more} more</text>` : '');
    };
    const draw = () => {
      if (!alive) return;
      const o = V.ops[sel], R = o.regions;
      const label = { union: 'Union', intersection: 'Intersection', difference: 'Difference', symmetric: 'Symmetric diff.' };
      root.innerHTML = `<div class="v2-card" data-vtype="venn">${spec.title ? `<div class="v2-title">${esc(spec.title)}</div>` : ''}
        <div class="v2-cases">${Object.keys(V.ops).map(k => `<button class="v2-case ${k === sel ? 'on' : ''}" data-k="${k}">${label[k]}</button>`).join('')}</div>
        <svg class="v2-venn" viewBox="0 0 360 200" role="img" aria-label="Venn diagram of two sets">
          <circle cx="135" cy="100" r="82" class="v2-circ a ${R.includes('A') || R.includes('AB') ? 'lit' : ''}"/>
          <circle cx="225" cy="100" r="82" class="v2-circ b ${R.includes('B') || R.includes('AB') ? 'lit' : ''}"/>
          <text x="80" y="22" class="v2-vname">${esc(nameA)}</text><text x="280" y="22" class="v2-vname" text-anchor="end">${esc(nameB)}</text>
          ${col(V.onlyA, 88, R.includes('A'))}${col(V.both, 180, R.includes('AB'))}${col(V.onlyB, 272, R.includes('B'))}
        </svg>
        ${codeChip(`${o.sym}     # or ${o.method}`)}
        <div class="v2-result"><span>result</span>{${o.result.map(x => esc(show(x))).join(', ')}}</div>
        ${caption(`${label[sel]}: ${o.say}.`)}</div>`;
      root.querySelectorAll('.v2-case').forEach(b => b.addEventListener('click', () => { sel = b.dataset.k; draw(); }));
    };
    draw();
    return { destroy() { alive = false; }, describe: () => `Visual "${spec.title || 'Venn'}": set a = {${spec.a.join(', ')}}, set b = {${spec.b.join(', ')}}. Selected: ${sel} (${V.ops[sel].sym}) giving {${V.ops[sel].result.join(', ')}}: ${V.ops[sel].say}.` };
  }

  /* ── tuple ── */
  function renderTuple(root, spec) {
    const frames = tupleFrames(spec);
    return frameShell(root, spec, frames.length, (stage, i) => {
      const f = frames[i], n = f.values.length;
      const cells = (vals, hl, cls) => `<div class="v2-tup ${cls || ''}"><span class="v2-par">(</span>${vals.map((x, k) => `<div class="v2-tcell ${hl.includes(k) ? 'hit' : ''}"><b>${esc(show(x))}</b><i>${k}</i><u>${k - vals.length}</u></div>`).join('')}<span class="v2-par">)</span></div>`;
      const names = f.names ? `<div class="v2-names">${f.names.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '';
      stage.innerHTML = `${codeChip(f.code)}${names}${cells(f.values, f.hl, f.error ? 'locked' : '')}
        ${f.error ? `<div class="v2-error">🔒 ${esc(f.error)}</div>` : ''}
        ${f.next ? `<div class="v2-newlabel">${spec.ops[i - 1].op === 'slice' ? 'new tuple (a copy)' : 'NEW tuple'}</div>${cells(f.next, spec.ops[i - 1].op === 'rebuild' ? f.hl : [], 'new')}` : ''}
        ${caption(f.caption, f.error ? 'bad' : '')}${i === 0 ? '<div class="v2-foot">Top numbers count from the front. Small numbers underneath count from the end (-1 is the last).</div>' : ''}`;
    }, (i) => {
      const f = frames[i];
      return `Visual "${spec.title || 'tuple'}": a tuple (${f.values.join(', ')}). Python being run: ${f.code}.${f.error ? ' Error shown: ' + f.error + '.' : ''}${f.next ? ' New tuple: (' + f.next.join(', ') + ').' : ''} On-screen caption: ${f.caption}`;
    });
  }

  /* ── bigo ── */
  function renderBigO(root, spec) {
    let N = Math.max(2, Math.min(64, Math.round(spec.n || 16))), alive = true;
    const draw = () => {
      if (!alive) return;
      const W = 340, H = 190, pad = 26, curves = spec.curves;
      const ymax = Math.max(...curves.map(c => BIGO[c].f(N)), 2);
      const X = n => pad + (n - 1) / (N - 1) * (W - pad - 8), Y = v => H - pad - Math.min(v, ymax) / ymax * (H - pad - 10);
      const paths = curves.map(c => {
        const pts = []; for (let n = 1; n <= N; n += Math.max(1, N / 60)) pts.push(`${X(n).toFixed(1)},${Y(BIGO[c].f(n)).toFixed(1)}`);
        pts.push(`${X(N).toFixed(1)},${Y(BIGO[c].f(N)).toFixed(1)}`);
        return `<polyline points="${pts.join(' ')}" fill="none" stroke="${BIGO[c].color}" stroke-width="${c === spec.highlight ? 4 : 2.4}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }).join('');
      const rowsHTML = curves.map(c => `<div class="v2-bo-row ${c === spec.highlight ? 'hl' : ''}"><i style="background:${BIGO[c].color}"></i><b>${esc(c)}</b><span>${Math.round(BIGO[c].f(N)).toLocaleString()} steps</span><em>${esc(BIGO[c].note)}</em></div>`).join('');
      root.innerHTML = `<div class="v2-card" data-vtype="bigo">${spec.title ? `<div class="v2-title">${esc(spec.title)}</div>` : ''}
        <svg class="v2-bigo" viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth of work as input size grows">
          <line x1="${pad}" y1="${H - pad}" x2="${W - 6}" y2="${H - pad}" class="v2-axis"/><line x1="${pad}" y1="${H - pad}" x2="${pad}" y2="8" class="v2-axis"/>
          <text x="${W / 2}" y="${H - 6}" text-anchor="middle" class="v2-vt dim">input size n (1 → ${N})</text>
          <text x="10" y="${H / 2}" class="v2-vt dim" transform="rotate(-90 10 ${H / 2})" text-anchor="middle">work</text>${paths}</svg>
        <label class="v2-slider"><span>n = <b>${N}</b></span><input type="range" min="2" max="64" value="${N}" aria-label="Input size n"></label>
        <div class="v2-bo-rows">${rowsHTML}</div>
        ${caption(`With n = ${N}, the slowest curve already needs ${Math.round(Math.max(...curves.map(c => BIGO[c].f(N)))).toLocaleString()} steps while the fastest needs ${Math.round(Math.min(...curves.map(c => BIGO[c].f(N)))).toLocaleString()}. Drag n up and watch the gap explode.`, 'hint')}</div>`;
      root.querySelector('input').addEventListener('input', e => { N = Number(e.target.value); draw(); const r = root.querySelector('input'); if (r) r.focus(); });
    };
    draw();
    return { destroy() { alive = false; }, describe: () => `Visual "${spec.title || 'Big-O'}": growth curves. The slider is at n = ${N}. Steps needed at that n: ${spec.curves.map(c => c + ' = ' + Math.round(BIGO[c].f(N))).join(', ')}.` };
  }

  /* ═════════ PUBLIC ═════════ */
  /* other files add visual types here: register('tree', { validate(spec, bad), render(root, spec) }) */
  function register(type, def) { if (!TYPES.includes(type)) TYPES.push(type); EXT[type] = def; RENDERERS[type] = def.render; }
  const RENDERERS = { stepper: renderStepper, branch: renderBranch, hashmap: renderHashmap, set: renderSet, venn: renderVenn, tuple: renderTuple, bigo: renderBigO };
  function render(container, spec) {
    const errs = validate(spec);
    if (errs.length) {
      container.innerHTML = `<div class="v2-card v2-fail">This visual could not be drawn.<small>${esc(errs[0])}</small></div>`;
      return { destroy() {}, failed: true, errors: errs };
    }
    if (spec.type === 'trace') { container.innerHTML = '<div class="v2-card v2-fail">This visual needs Python to build.<small>Open the lesson while online to prepare it.</small></div>'; return { destroy() {}, failed: true, errors: ['unresolved trace'] }; }
    try { return RENDERERS[spec.type](container, spec); }
    catch (e) {
      console.error('[visuals]', e);
      container.innerHTML = '<div class="v2-card v2-fail">This visual could not be drawn.</div>';
      return { destroy() {}, failed: true, errors: [String(e && e.message || e)] };
    }
  }

  return {
    TYPES, validate, render, stepperFromTrace, register,
    _ui: { esc, frameShell, caption, codeChip, isScalar, sameKey, py, show },
    _compute: { hashParts, hashmapFrames, setFrames, vennCompute, tupleFrames }
  };
})();

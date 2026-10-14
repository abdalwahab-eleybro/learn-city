/* ═══════════════════════════════════════════════════════════ */
/*  21-easy-lab.js — Easy Coding: lesson → practice fight        */
/*                                                              */
/*  LESSON  Imagine → Idea → Code → Watch → Done                 */
/*  FIGHT   9 rounds against a unit enemy:                       */
/*            3 × complexity MCQ   (time / space)                */
/*            1 × predict the output                         */
/*            2 × put the lines in order                         */
/*            2 × fill the missing words                         */
/*            1 × BOSS: write the code                           */
/*  Progress: profile.easyCoding = { done, rewarded, lessons,    */
/*            fights, stats }                                    */
/*  Question GENERATORS are pure functions (see _gen) so they    */
/*  can be tested without any UI.                                */
/*  Depends on: 01-state, 13-visualizer, 14-aitutor (optional),  */
/*              18-easy-coding (problem bank), 20-easy-data.     */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.EasyLab = (() => {
  const S = CF.State, D = CF.EasyData;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = rnd(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const pick = (a) => a[rnd(a.length)];
  const problem = (num) => CF.EasyCoding.PROBLEMS.find(p => p.num === num);
  const unitById = (id) => D.UNITS.find(u => u.id === id);

  /* ── persisted progress ── */
  function st() {
    const p = S.profile;
    if (!p.easyCoding || typeof p.easyCoding !== 'object') p.easyCoding = {};
    const e = p.easyCoding;
    ['done', 'rewarded', 'lessons', 'fights', 'stats'].forEach(k => { if (!e[k] || typeof e[k] !== 'object') e[k] = {}; });
    return e;
  }
  const lessonDone = (id) => !!st().lessons[id]?.completed;
  const fightRec = (id) => st().fights[id] || null;
  const fightCleared = (id) => !!(fightRec(id) && fightRec(id).cleared);
  function bump(num, ok) {
    const e = st().stats; e[num] = e[num] || { c: 0, w: 0 };
    ok ? e[num].c++ : e[num].w++;
  }

  /* ── unit status (same rules as the Algorithms lessons) ── */
  function isLocked(id) {
    const i = D.UNITS.findIndex(u => u.id === id);
    return i > 0 && !lessonDone(D.UNITS[i - 1].id);   // each lesson needs the one before it
  }
  const nextOpen = () => D.UNITS.find(u => !lessonDone(u.id) && !isLocked(u.id)) || null;
  const fightOpen = (id) => lessonDone(id);           // its practice opens the moment the lesson is done

  /* accuracy over every practice question answered for the unit's problems (null = none yet) */
  function unitStats(id) {
    const u = unitById(id); let c = 0, w = 0;
    u.problems.forEach(n => { const s = st().stats[n]; if (s) { c += s.c; w += s.w; } });
    return { c, w, total: c + w, acc: c + w ? c / (c + w) : null };
  }
  const accuracy = (id) => unitStats(id).acc;

  /* ═══════════════════════════════════════════════════════════ */
  /*  QUESTION GENERATORS (pure)                                  */
  /* ═══════════════════════════════════════════════════════════ */
  const codeOf = (num) => (D.META[num] && D.META[num].code) || problem(num).solution;
  const defLine = (code) => code.split('\n').find(l => /^def /.test(l)) || '';
  const bodyLines = (code) => {
    const ls = code.split('\n').filter(l => l.trim() !== '');
    const i = ls.findIndex(l => /^def /.test(l));
    return i >= 0 ? ls.slice(i + 1) : ls;
  };

  /* every built-in question remembers which "card" it is, so CF.Review can schedule it again */
  function withCard(q, num, type, kind, label) {
    q.card = { src: 'easy', key: 'e:' + num + ':' + type + (kind ? ':' + kind : ''), ref: { num, type, kind: kind || null }, label };
    return q;
  }
  /* rebuild a fresh variant of a stored card (null if it no longer exists) */
  function rebuild(ref) {
    try {
      if (!problem(ref.num)) return null;
      if (ref.type === 'mcq') return genMcq(ref.num, ref.kind || 'time');
      if (ref.type === 'order') return orderEligible(ref.num) ? genOrder(ref.num) : null;
      if (ref.type === 'fill') return fillEligible(ref.num) ? genFill(ref.num) : null;
      if (ref.type === 'boss') return genBoss(ref.num);
      if (ref.type === 'predict') return predictEligible(ref.num) ? genPredict(ref.num) : null;
    } catch (e) {}
    return null;
  }

  /* ── 1. complexity MCQ ── */
  const NUMERIC = new Set([25, 26, 28, 29, 30, 31, 32, 33, 34, 49]);
  const WHY_TIME = {
    'O(1)': 'It does a fixed number of steps no matter how big the input is.',
    'O(log n)': 'Every step cuts the problem down (halving, or dropping a digit), so the number of steps grows very slowly.',
    'O(√n)': 'The loop only runs up to the square root of n, never all the way to n.',
    'O(n)': 'It touches each item a constant number of times: one pass.',
    'O(n + m)': 'It makes one pass over each of the two inputs, so the steps add up: n + m.',
    'O(n log n)': 'Sorting dominates. Sorting n items costs about n log n steps.',
    'O(n log log n)': 'This is the sieve of Eratosthenes: marking multiples of each prime costs n log log n in total.',
    'O(n²)': 'A loop inside a loop: for each of n items it looks at up to n others.',
    'O(r·c)': 'Every cell of the r × c grid is visited once.',
    'O(2ⁿ)': 'The work doubles with every extra item.'
  };
  const WHY_SPACE = {
    'O(1)': 'It only keeps a few variables, so the extra memory does not grow with the input.',
    'O(log n)': 'The extra memory grows with the number of digits, which is about log n.',
    'O(n)': 'It builds an extra list, set or dictionary that can grow as large as the input.',
    'O(n + m)': 'The result holds items from both inputs, so it grows with n + m.',
    'O(r + c)': 'It stores one value per row and one per column.',
    'O(r·c)': 'It builds a whole new grid the same size as the input.',
    'O(n²)': 'It stores a value for every pair of items.'
  };
  /* m = { time, space, numeric?, nMeans? }  (works for built-in problems and AI-made lessons) */
  const metaOf = (num) => ({ time: D.META[num].time, space: D.META[num].space, numeric: NUMERIC.has(num), nMeans: num === 27 ? 'n = number of terms to generate.' : null });
  function varNote(m) {
    const t = m.time + ' ' + m.space;
    if (/·|r \+ c/.test(t)) return 'r = number of rows, c = number of columns.';
    if (/n \+ m/.test(t)) return 'n and m are the lengths of the two arrays.';
    if (m.nMeans) return m.nMeans;
    if (m.numeric) return 'n = the value of the number given.';
    return 'n = the size of the input.';
  }
  function complexityOptions(m, kind) {
    const correct = m[kind];
    const grid = /·|r \+ c/.test(m.time + m.space);
    const two = /n \+ m/.test(m.time + m.space);
    let pool = kind === 'time'
      ? ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)']
      : ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'];
    if (m.numeric && kind === 'time') pool.push('O(√n)');
    if (correct === 'O(n log log n)') pool.push('O(n log log n)');
    if (grid) pool.push(...(kind === 'time' ? ['O(r·c)'] : ['O(r + c)', 'O(r·c)']));
    if (two) pool.push('O(n + m)');
    pool = Array.from(new Set(pool.concat(correct)));
    const scale = D.COMPLEXITY_SCALE;
    const idx = (x) => { const i = scale.indexOf(x); return i < 0 ? 99 : i; };
    const near = pool.filter(x => x !== correct).sort((a, b) => Math.abs(idx(a) - idx(correct)) - Math.abs(idx(b) - idx(correct))).slice(0, 5);
    const opts = shuffle([correct].concat(shuffle(near).slice(0, 3)));
    return { options: opts, correct: opts.indexOf(correct), answer: correct };
  }
  /* p = { title, code, time, space, numeric?, nMeans?, num? } */
  function mcqFromComplexity(p, kind) {
    const m = { time: p.time, space: p.space, numeric: p.numeric, nMeans: p.nMeans };
    const o = complexityOptions(m, kind), ans = o.answer;
    const q = {
      type: 'mcq', title: p.title, kind, code: p.code,
      prompt: `What is the ${kind === 'time' ? 'TIME' : 'SPACE'} complexity of this function?`,
      note: kind === 'space' ? `Count only the EXTRA memory it creates. ${varNote(m)}` : varNote(m),
      options: o.options, correct: o.correct,
      why: `${ans}. ` + ((kind === 'time' ? WHY_TIME : WHY_SPACE)[ans] || '')
    };
    if (p.num !== undefined) q.num = p.num;
    return q;
  }
  function genMcq(num, kind) {
    const p = problem(num), mm = metaOf(num);
    const q = mcqFromComplexity({ title: p.title, code: codeOf(num), time: mm.time, space: mm.space, numeric: mm.numeric, nMeans: mm.nMeans, num }, kind);
    return withCard(q, num, 'mcq', kind, p.title);
  }

  /* ── 2. order the lines ── */
  const PY_KW = new Set(['for', 'in', 'if', 'elif', 'else', 'while', 'return', 'not', 'and', 'or', 'def', 'True', 'False', 'None', 'from', 'import', 'lambda']);
  function names(text) { return (text.match(/[A-Za-z_]\w*/g) || []).filter(w => !PY_KW.has(w)); }
  function effects(line) {
    const defs = new Set(), uses = new Set();
    line.trim().split(';').forEach(part => {
      const t = part.trim(); if (!t) return;
      if (/^(from|import)\b/.test(t)) { names(t).forEach(n => defs.add(n)); return; }   // an import defines its names
      const m = t.match(/^(.*?)(\/\/=|>>=|\+=|-=|\*=|%=|(?<![=!<>])=(?!=))(.*)$/);
      if (m) {
        const lhs = m[1], aug = m[2] !== '=';
        names(lhs).forEach(n => { defs.add(n); if (aug) uses.add(n); });
        names(m[3]).forEach(n => uses.add(n));
      } else {
        names(t).forEach(n => uses.add(n));
        const mm = t.match(/^([A-Za-z_]\w*)\./); if (mm) defs.add(mm[1]);      // x.append(...) mutates x
      }
    });
    return { defs, uses };
  }
  const indentOf = (l) => l.length - l.trimStart().length;
  const disjoint = (a, b) => { for (const x of a) if (b.has(x)) return false; return true; };
  /* consecutive same-indent plain statements that do not depend on each other may be written in any order */
  function swapGroups(lines) {
    const groups = []; let cur = null;
    lines.forEach((l, i) => {
      const t = l.trim();
      const simple = !t.endsWith(':') && !/^(return|break|continue|pass)\b/.test(t) && !/^(else|elif)\b/.test(t);
      if (!simple) { cur = null; return; }
      const fx = effects(l), ind = indentOf(l);
      if (cur && cur.indent === ind && cur.items.every(o => disjoint(fx.defs, o.fx.uses) && disjoint(o.fx.defs, fx.uses) && disjoint(fx.defs, o.fx.defs))) {
        cur.items.push({ i, fx }); cur.end = i;
      } else { cur = { indent: ind, start: i, end: i, items: [{ i, fx }] }; groups.push(cur); }
    });
    return groups.filter(g => g.end > g.start);
  }
  function orderIsValid(solution, answer) {
    if (solution.length !== answer.length) return false;
    const inGroup = new Array(solution.length).fill(false);
    for (const g of swapGroups(solution)) {
      const a = solution.slice(g.start, g.end + 1).slice().sort().join('\n');
      const b = answer.slice(g.start, g.end + 1).slice().sort().join('\n');
      if (a !== b) return false;
      for (let i = g.start; i <= g.end; i++) inGroup[i] = true;
    }
    return solution.every((l, i) => inGroup[i] || answer[i] === l);
  }
  const orderEligibleCode = (code) => { const n = bodyLines(code).length; return n >= 3 && n <= 12; };
  const orderEligible = (num) => orderEligibleCode(codeOf(num));
  function orderFromCode(code, title, statement, num) {
    const body = bodyLines(code);
    let cards = body.map((text, i) => ({ id: i, text }));
    let tries = 0;
    do { cards = shuffle(cards); tries++; } while (tries < 8 && cards.every((c, i) => c.id === i));
    const q = { type: 'order', title, def: defLine(code), solution: body, cards, statement,
      why: 'Lines inside a loop or an if are indented under it. Setup lines come first, the loop next, and the return last.' };
    if (num !== undefined) q.num = num;
    return q;
  }
  function genOrder(num) { return withCard(orderFromCode(codeOf(num), problem(num).title, problem(num).statement, num), num, 'order', null, problem(num).title); }

  /* ── 3. fill the words ── */
  const FILL_WORDS = new Set(['for', 'in', 'if', 'elif', 'else', 'while', 'return', 'not', 'and', 'or', 'range', 'len', 'sum', 'sorted', 'set', 'append', 'add', 'max', 'min', 'abs', 'reversed', 'join', 'split', 'get', 'isupper', 'islower', 'enumerate', 'extend', 'pop', 'Counter', 'reverse']);
  const FILL_OPS = new Set(['==', '!=', '<=', '>=', '<', '>', '+=', '-=', '*=', '//=', '>>=', '//', '%', '&', '|']);
  const DISTRACTORS = ['while', 'break', 'lambda', 'pass', 'import', 'global', 'del', 'yield', 'continue', 'assert'];
  const TOKEN_RE = /[A-Za-z_]\w*|\d+|\/\/=|>>=|==|!=|<=|>=|\+=|-=|\*=|\/\/|[<>%&|+\-*]/g;
  function lineTokens(line) {
    const out = []; let m; TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(line))) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    return out;
  }
  function fillCandidates(lines) {
    return lines.map((line, li) => {
      if (/^\s*(from|import)\b/.test(line)) return [];
      return lineTokens(line).filter(t => FILL_WORDS.has(t.text) || FILL_OPS.has(t.text)).map(t => ({ ...t, li }));
    });
  }
  const fillEligibleCode = (code) => fillCandidates(bodyLines(code)).filter(c => c.length).length >= 3;
  const fillEligible = (num) => fillEligibleCode(codeOf(num));
  function genFill(num) { return withCard(fillFromCode(codeOf(num), problem(num).title, problem(num).statement, num), num, 'fill', null, problem(num).title); }
  function fillFromCode(code, title, statement, num) {
    const lines = bodyLines(code), cands = fillCandidates(lines);
    const withCands = cands.map((c, i) => ({ c, i })).filter(x => x.c.length);
    const want = Math.min(4, withCands.length);
    const chosen = shuffle(withCands).slice(0, want).map(x => {
      const words = x.c.filter(t => FILL_WORDS.has(t.text));
      const pool = words.length && Math.random() < 0.65 ? words : x.c;
      return pick(pool);
    }).sort((a, b) => a.li - b.li || a.start - b.start);
    /* build segments: plain text or blank */
    const segs = lines.map((line, li) => {
      const mine = chosen.filter(t => t.li === li); let pos = 0; const parts = [];
      mine.forEach(t => { if (t.start > pos) parts.push({ text: line.slice(pos, t.start) }); parts.push({ blank: true, answer: t.text }); pos = t.end; });
      if (pos < line.length) parts.push({ text: line.slice(pos) });
      return parts;
    });
    const answers = chosen.map(t => t.text);
    const used = new Set(answers);
    const bank = shuffle(answers.concat(shuffle(DISTRACTORS.filter(d => !used.has(d) && !code.includes(d))).slice(0, 2)));
    const q = { type: 'fill', title, def: defLine(code), segs, answers, bank, statement,
      why: 'Each blank is a keyword, function or operator. Read the whole line to see which word makes it do what the problem asks.' };
    if (num !== undefined) q.num = num;
    return q;
  }


  /* ── 3b. predict the output ──
     Built-ins use (call, result) pairs that were produced by running the real model solution
     (js/20b-easy-predict.js); the wrong answers are believable slips made from the right one.
     AI lessons give their own "wrong" answers and the app checks the printed output by running the code. */
  const predictEligible = (num) => !!(D.PREDICT && D.PREDICT[num]);
  function parseLit(t) {
    t = String(t).trim();
    if (/^-?\d+$/.test(t)) return { k: 'int', v: Number(t) };
    if (t === 'True' || t === 'False') return { k: 'bool', v: t === 'True' };
    let m = t.match(/^'((?:[^'\\]|\\.)*)'$/); if (m) return { k: 'str', v: m[1] };
    if (t[0] === '[' && t[t.length - 1] === ']') {
      const inner = t.slice(1, -1).trim(); if (!inner) return { k: 'list', v: [] };
      const parts = []; let d = 0, cur = '', q = '';
      for (const ch of inner) {
        if (q) { cur += ch; if (ch === q) q = ''; continue; }
        if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
        if (ch === '[') d++; if (ch === ']') d--;
        if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
      }
      parts.push(cur);
      const items = parts.map(parseLit); if (items.some(x => !x)) return null;
      return { k: 'list', v: items };
    }
    return null;
  }
  function showLit(x) {
    if (x.k === 'int') return String(x.v);
    if (x.k === 'bool') return x.v ? 'True' : 'False';
    if (x.k === 'str') return "'" + x.v + "'";
    return '[' + x.v.map(showLit).join(', ') + ']';
  }
  /* believable wrong answers for a result written as Python text */
  function predictWrong(out, n) {
    const x = parseLit(out), c = new Set();
    const add = (v) => { try { const t = typeof v === 'string' ? v : showLit(v); if (t !== out && t.length < 60) c.add(t); } catch (e) {} };
    if (!x) return [];
    if (x.k === 'int') [x.v + 1, x.v - 1, x.v + 2, x.v - 2, x.v * 2, -x.v, Math.floor(x.v / 2), x.v + 10, x.v === 0 ? 1 : 0].forEach(v => add({ k: 'int', v }));
    else if (x.k === 'bool') { add({ k: 'bool', v: !x.v }); add('None'); add('0'); add('1'); }
    else if (x.k === 'str') {
      const v = x.v; add({ k: 'str', v: v.split('').reverse().join('') }); add({ k: 'str', v: v.slice(1) }); add({ k: 'str', v: v.slice(0, -1) });
      add({ k: 'str', v: v.toUpperCase() }); add({ k: 'str', v: v.split(' ').reverse().join(' ') }); add({ k: 'str', v: v.split(' ')[0] }); add({ k: 'str', v: v.length > 1 ? v[0] : v + v });
    } else {
      const L = x.v, mk = (a) => ({ k: 'list', v: a }), bump = (it, d) => it.k === 'int' ? { k: 'int', v: it.v + d } : it;
      if (L.length) {
        add(mk(L.slice().reverse())); add(mk(L.slice(1))); add(mk(L.slice(0, -1)));
        add(mk(L.map((it, i) => i === 0 ? bump(it, 1) : it))); add(mk(L.map((it, i) => i === L.length - 1 ? bump(it, -1) : it)));
        add(mk(L.concat([L[0]]))); if (L.length > 1) { const a = L.slice(); [a[0], a[1]] = [a[1], a[0]]; add(mk(a)); }
        if (L.every(it => it.k === 'int')) add(mk(L.slice().sort((a, b) => a.v - b.v)));
        if (L.every(it => it.k === 'int')) add(mk(L.slice().sort((a, b) => b.v - a.v)));
      } else { add('[0]'); add('None'); }
    }
    add('None'); add('It raises an error');
    return shuffle(Array.from(c)).slice(0, n || 3);
  }
  /* p = { title, code, prompt?, out, wrong?, call?, trace? }  ->  question */
  function predictFromParts(p) {
    const wrong = (p.wrong && p.wrong.length >= 3 ? p.wrong.slice() : predictWrong(p.out, 3)).filter(w => w !== p.out).slice(0, 3);
    while (wrong.length < 3) { const f = ['None', 'It raises an error', '0'].find(x => x !== p.out && !wrong.includes(x)); wrong.push(f); }
    const options = shuffle([p.out].concat(wrong));
    return {
      type: 'predict', title: p.title, code: p.code, call: p.call || null,
      prompt: p.prompt || (p.call ? `What does ${p.call} return?` : 'What does this program print?'),
      options, correct: options.indexOf(p.out), trace: p.trace || null,
      why: `The answer is ${p.out}. ${p.call ? 'Follow the code with these exact values, one line at a time.' : 'Run it in your head line by line, writing down each variable as it changes.'}`
    };
  }
  function genPredict(num) {
    const pr = problem(num), d = D.PREDICT[num], code = codeOf(num);
    const q = predictFromParts({ title: pr.title, code, call: d.call, out: d.out, trace: code.split('\n').concat(['print(' + d.call + ')']) });
    q.num = num;
    return withCard(q, num, 'predict', null, pr.title);
  }

  /* ── plain-text questions (lessons that are not about code: communication, languages, maths…) ──
     Same fight, same rounds; only the wording and the look change. All builders are pure. */
  /* p = { title, question, options[], correct (index into options), why, label?, context?, type? } */
  function quizFromParts(p) {
    const order = shuffle(p.options.map((_, i) => i)), options = order.map(i => p.options[i]);
    return { type: p.type || 'quiz', plain: true, title: p.title, prompt: p.question, context: p.context || '', label: p.label || '❓ Quick check', options, correct: order.indexOf(p.correct), why: p.why };
  }
  /* p = { title, statement, steps[] } : the learner puts the steps in the right order */
  function plainOrderFrom(p) {
    let cards = p.steps.map((text, i) => ({ id: i, text })), tries = 0;
    do { cards = shuffle(cards); tries++; } while (tries < 8 && cards.every((c, i) => c.id === i));
    return { type: 'order', plain: true, title: p.title, def: '', solution: p.steps.slice(), cards, statement: p.statement, why: 'Each step sets up the next one. Read the correct order again and notice why it flows that way.' };
  }
  /* p = { title, statement, text (blanks written as ___), answers[], extra[] } */
  function plainFillFrom(p) {
    const lines = p.text.split('\n'); let k = 0;
    const segs = lines.map(line => line.split('___').flatMap((chunk, i, arr) => {
      const out = chunk ? [{ text: chunk }] : [];
      if (i < arr.length - 1) out.push({ blank: true, answer: p.answers[k++] });
      return out;
    }));
    const bank = shuffle(p.answers.concat(p.extra || []));
    return { type: 'fill', plain: true, title: p.title, def: '', segs, answers: p.answers.slice(), bank, statement: p.statement, why: 'Read the whole sentence aloud with each word in place: only one choice per gap keeps the meaning right.' };
  }
  /* p = { title, prompt, model, rubric[] } : the learner writes an answer, then checks it against the rubric */
  function writeBossFrom(p) { return { type: 'boss', plain: true, title: p.title, statement: p.prompt, model: p.model, rubric: p.rubric.slice(), explanation: '' }; }

  /* ── 4. boss: write the code ── */
  const IDEA_TOKENS = ['for', 'while', 'if', 'return', 'range', 'len', 'sum', 'sorted', 'set', 'split', 'join', 'reversed', 'append', 'max', 'min', '%', '//', 'Counter', 'abs', 'enumerate', 'not', '>>', '&', '**', 'elif', 'else'];
  /* b = { title, statement, input, output, model, explanation, code, num? } */
  function bossFromParts(b) {
    const code = b.code || b.model;
    const have = IDEA_TOKENS.filter(t => /^[A-Za-z]+$/.test(t) ? new RegExp('\\b' + t + '\\b').test(code) : code.includes(t));
    const q = { type: 'boss', title: b.title, statement: b.statement, input: b.input, output: b.output,
      starter: defLine(code) + '\n    ', model: b.model, explanation: b.explanation, ideas: have.slice(0, 5) };
    if (b.num !== undefined) q.num = b.num;
    /* how the learner's code can be run and graded (needs CF.PyRun) */
    if (Array.isArray(b.tests) && b.tests.length) q.check = { kind: 'tests', tests: b.tests };
    else if (b.example) q.check = { kind: 'diff', model: b.model, example: b.example };
    return q;
  }
  function genBoss(num) {
    const p = problem(num);
    return withCard(bossFromParts({ title: p.title, statement: p.statement, input: p.input, output: p.output, model: p.solution, explanation: p.explanation, code: codeOf(num), num, example: p.input }), num, 'boss', null, p.title);
  }
  function bossChecks(q, text) {
    const t = text || '';
    const name = (q.starter.match(/def\s+(\w+)/) || [])[1];
    const body = t.split('\n').filter(l => l.trim() && !/^def /.test(l.trim()) && !/^\s*#/.test(l)).length;
    return {
      shape: [
        { label: `defines ${name}(…)`, ok: !!name && new RegExp('def\\s+' + name + '\\s*\\(').test(t) },
        { label: 'has a return', ok: /\breturn\b/.test(t) },
        { label: 'more than a stub (2+ lines of code)', ok: body >= 2 || /return .{12,}/.test(t) }
      ],
      ideas: q.ideas.map(w => ({ label: w, ok: /^[A-Za-z]+$/.test(w) ? new RegExp('\\b' + w + '\\b').test(t) : t.includes(w) }))
    };
  }

  /* ── plan a whole fight: 3 mcq, 1 predict, 2 order, 2 fill, 1 boss ── */
  function planFight(unitId) {
    const u = unitById(unitId);
    const score = (n) => { const s = st().stats[n]; return (s ? s.c + s.w : 0) + Math.random() * 0.9; };  // least-practised first
    const ranked = u.problems.slice().sort((a, b) => score(a) - score(b));
    const used = new Set(), qs = [];
    const take = (ok) => { const n = ranked.find(x => !used.has(x) && ok(x)) ?? ranked.find(ok); if (n !== undefined) used.add(n); return n; };
    [['time'], ['space'], ['time']].forEach(([k]) => { const n = take(() => true); if (n !== undefined) qs.push(genMcq(n, k)); });
    { const n = take(predictEligible); if (n !== undefined) qs.push(genPredict(n)); }
    for (let i = 0; i < 2; i++) { const n = take(orderEligible); if (n !== undefined) qs.push(genOrder(n)); }
    for (let i = 0; i < 2; i++) { const n = take(fillEligible); if (n !== undefined) qs.push(genFill(n)); }
    /* boss problem: prefer one you have not solved yet */
    const bossN = ranked.find(n => !st().done[n]) ?? ranked[0];
    qs.push(genBoss(bossN));
    return qs;
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  LESSON                                                      */
  /* ═══════════════════════════════════════════════════════════ */
  const PHASES = ['Imagine', 'Idea', 'Visual', 'Code', 'Watch', 'Practice'];
  function phaseBar(now) {
    const idx = PHASES.indexOf(now);
    return `<div class="lsn-phases">${PHASES.map((p, i) => `<span class="lsn-phase ${i < idx ? 'past' : ''} ${i === idx ? 'now' : ''}">${p}</span>`).join('')}
      <span class="lsn-phase-spacer"></span><button class="back-btn" id="elQuit" aria-label="Quit">✕</button></div>`;
  }
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  function cleanup(root) { try { root._player && root._player.destroy(); } catch (e) {} root._player = null; try { CF.Narrator.stop(); } catch (e) {} }
  function wireQuit(root, h) {
    root.querySelector('#elQuit')?.addEventListener('click', () => { cleanup(root); try { CF.Music.play('menu'); } catch (e) {} h.onExit && h.onExit(); });
  }

  function curiosityHTML(u) {
    return `<div class="cur-card lsn-anim-in d2"><div class="cur-kicker">🧠 Curiosity</div><div class="cur-q">${esc(u.curiosity.q)}</div>
      <button class="btn ghost cur-btn" id="elCurBtn">Think, then tap to reveal</button><div class="cur-a" id="elCurAns" hidden>${esc(u.curiosity.a)}</div></div>`;
  }

  /* tell the Ask-AI helper what the lesson is and where the learner is */
  function askBackground(u) {
    const tr = u.trace();
    return [`Title: ${u.title}`, `Idea: ${u.imagine.text}`, `Goals: ${u.objectives.join('; ')}`,
      ...u.ideas.map((x, i) => `Idea ${i + 1} - ${x.title}: ${x.text}${x.code ? '\n' + x.code : ''}`),
      'Example code:\n' + tr.code.map((l, i) => `${l}    # ${(u.walk.notes || [])[i] || ''}`).join('\n')].join('\n');
  }
  const askSet = (root, u, where, live) => { try { CF.Ask && CF.Ask.set(root, { key: 'easy-' + u.id, title: u.title, background: askBackground(u), where, live }); } catch (e) {} };

  function lessonIntro(root, u, h) {
    const tr = u.trace();
    root.innerHTML = `<div class="lsn-wrap">
      ${phaseBar('Imagine')}
      <div class="lsn-hero lsn-anim-in"><div class="lsn-hero-icon">${u.icon}</div>
        <div><div class="lsn-hero-title">${esc(u.title)}</div><div class="lsn-hero-sub">Easy Coding · ${u.minutes} min · ${u.problems.length} problems</div></div></div>
      <div class="lsn-imagine lsn-anim-in d1"><div class="lsn-imagine-word">Imagine…</div>
        <p class="lsn-imagine-text">${esc(u.imagine.text)}</p><div class="mt-stage" id="elScene"></div></div>
      <div class="lsn-card plain lsn-anim-in d2"><div class="lsn-obj-title">You will be able to:</div>
        <ul class="lsn-obj">${u.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ul></div>
      ${curiosityHTML(u)}
      <div class="lsn-nav lsn-anim-in d3"><button class="btn ghost" id="elQuit2">Quit</button>
        ${lessonDone(u.id) ? '<button class="btn ghost" id="elJump">Replay from Watch ▶</button>' : ''}
        <button class="btn primary" id="elStart">Start the lesson ▶</button></div></div>`;
    wireQuit(root, h); askSet(root, u, 'The start of the lesson (the imagine picture and goals)');
    root.querySelector('#elQuit2').addEventListener('click', () => root.querySelector('#elQuit').click());
    const b = root.querySelector('#elCurBtn'), a = root.querySelector('#elCurAns');
    b.addEventListener('click', () => { a.hidden = false; b.hidden = true; });
    root.querySelector('#elStart').addEventListener('click', () => { try { CF.Sonify.unlock(); } catch (e) {} lessonIdeas(root, u, h, 0); });
    const j = root.querySelector('#elJump'); if (j) j.addEventListener('click', () => lessonWatch(root, u, h));
    /* the intro scene plays the first moves of the walkthrough on a loop */
    try {
      const stage = root.querySelector('#elScene'), frames = tr.steps.slice(0, 8).map(s => s.state);
      CF.Visualizer.renderScene(stage, frames[0], {});
      if (!reduced() && frames.length > 1) {
        let i = 0;
        const tick = () => { if (!stage.isConnected) return; i = (i + 1) % frames.length; try { CF.Visualizer.renderScene(stage, frames[i], {}); } catch (e) { return; } setTimeout(tick, i === 0 ? 1800 : 1000); };
        setTimeout(tick, 1200);
      }
      CF.Narrator.speak('Imagine this. ' + u.imagine.text);
    } catch (e) { console.error('[easy intro]', e); }
    const lit = () => { const im = root.querySelector('.lsn-imagine'); if (im) im.classList.add('lit'); };
    reduced() ? lit() : setTimeout(lit, 250);
  }

  function lessonIdeas(root, u, h, i) {
    const idea = u.ideas[i], last = i === u.ideas.length - 1;
    root.innerHTML = `<div class="lsn-wrap">${phaseBar('Idea')}
      <div class="lsn-card lsn-anim-in"><div class="el-step">Idea ${i + 1} of ${u.ideas.length}</div>
        <h3 class="el-h">${esc(idea.title)}</h3><p class="el-p">${esc(idea.text)}</p>
        ${idea.code ? `<pre class="el-code">${esc(idea.code)}</pre>` : ''}
        <div class="el-dots">${u.ideas.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div></div>
      <div class="lsn-nav"><button class="btn ghost" id="elBack" ${i === 0 ? 'disabled' : ''}>◀ Back</button>
        <button class="btn primary" id="elNext">${last ? 'See it as code ▶' : 'Next idea ▶'}</button></div></div>`;
    wireQuit(root, h);
    try { CF.Narrator.speak(idea.title + '. ' + idea.text); } catch (e) {}
    askSet(root, u, `Idea ${i + 1} of ${u.ideas.length}: "${idea.title}"`);
    root.querySelector('#elBack').addEventListener('click', () => lessonIdeas(root, u, h, i - 1));
    root.querySelector('#elNext').addEventListener('click', () => last ? (u.visuals && u.visuals.length ? lessonVisual(root, u, h, 0) : lessonCode(root, u, h, 0)) : lessonIdeas(root, u, h, i + 1));
  }

  function lessonVisual(root, u, h, i) {
    const vs = u.visuals, last = i === vs.length - 1;
    root.innerHTML = `<div class="lsn-wrap">${phaseBar('Visual')}
      <div class="lsn-hintline">🎛️ <b>Play with it.</b> ${vs.length > 1 ? `Picture ${i + 1} of ${vs.length}. ` : ''}Step through or tap the buttons to see how it works.</div>
      <div id="elVis"></div>
      <div class="lsn-nav"><button class="btn ghost" id="elBack">◀ Back</button>
        <button class="btn primary" id="elNext">${last ? 'See it as code ▶' : 'Next picture ▶'}</button></div></div>`;
    wireQuit(root, h);
    let vis = null;
    try { vis = CF.Visuals.render(root.querySelector('#elVis'), vs[i]); } catch (e) { console.error('[easy visual]', e); }
    askSet(root, u, `Visual ${i + 1} of ${vs.length}: "${vs[i].title || vs[i].type}" (the learner is playing with it)`, () => (vis && vis.describe ? vis.describe() : ''));
    const gone = () => { try { vis && vis.destroy(); } catch (e) {} };
    root.querySelector('#elBack').addEventListener('click', () => { gone(); i === 0 ? lessonIdeas(root, u, h, u.ideas.length - 1) : lessonVisual(root, u, h, i - 1); });
    root.querySelector('#elNext').addEventListener('click', () => { gone(); last ? lessonCode(root, u, h, 0) : lessonVisual(root, u, h, i + 1); });
  }

  function lessonCode(root, u, h, i) {
    const code = u.trace().code, notes = u.walk.notes, last = i === code.length - 1;
    root.innerHTML = `<div class="lsn-wrap">${phaseBar('Code')}
      <div class="lsn-card lsn-anim-in"><div class="el-step">Line ${i + 1} of ${code.length}</div>
        <pre class="el-code el-walk">${code.map((l, k) => `<span class="el-line ${k === i ? 'on' : k < i ? 'past' : ''}">${esc(l) || ' '}</span>`).join('')}</pre>
        <div class="el-note">${esc(notes[i] || '')}</div></div>
      <div class="lsn-nav"><button class="btn ghost" id="elBack" ${i === 0 ? 'disabled' : ''}>◀ Back</button>
        <button class="btn primary" id="elNext">${last ? 'Watch it run ▶' : 'Next line ▶'}</button></div></div>`;
    wireQuit(root, h);
    try { CF.Narrator.speak(notes[i] || ''); } catch (e) {}
    askSet(root, u, `Code walk-through, line ${i + 1} of ${code.length}: "${code[i]}" (${notes[i] || ''})`);
    root.querySelector('#elBack').addEventListener('click', () => lessonCode(root, u, h, i - 1));
    root.querySelector('#elNext').addEventListener('click', () => last ? lessonWatch(root, u, h) : lessonCode(root, u, h, i + 1));
  }

  function lessonWatch(root, u, h) {
    cleanup(root);
    root.innerHTML = `<div class="lsn-wrap">${phaseBar('Watch')}
      <div class="lsn-hintline">👀 <b>Watch.</b> Pause or step back whenever you like. Stops marked 🤔 ask you to predict the next move first.</div>
      <div class="lsn-player-mount" id="elMount"></div>
      <div class="lsn-nav"><button class="btn ghost" id="elSkip">Skip ▶</button><span class="lsn-next-note" id="elNote">Watch the full walkthrough, then continue.</span></div></div>`;
    wireQuit(root, h); askSet(root, u, 'Watching the animated step-by-step run of the example code');
    const note = root.querySelector('#elNote');
    const finish = () => lessonDoneScreen(root, u, h);
    root.querySelector('#elSkip').addEventListener('click', () => { cleanup(root); finish(); });
    root._player = CF.Visualizer.createPlayer({
      container: root.querySelector('#elMount'), trace: u.trace(), mode: 'watch',
      onDone: () => { note.innerHTML = '<button class="btn primary" id="elNext">Finish the lesson ▶</button>'; note.querySelector('#elNext').addEventListener('click', () => { cleanup(root); finish(); }); }
    });
    setTimeout(() => { try { if (root.isConnected) root._player.play(); } catch (e) {} }, 350);
  }

  function lessonDoneScreen(root, u, h) {
    let xp = 0, coins = 0;
    try {
      const first = !lessonDone(u.id);
      xp = first ? 30 : 8; coins = first ? 15 : 0;
      S.addXP(xp); if (coins) S.addCoins(coins);
      st().lessons[u.id] = { completed: true, ts: Date.now() };
      S.save();
    } catch (e) {}
    const nxt = nextOpen();
    root.innerHTML = `<div class="lsn-wrap">${phaseBar('Practice')}
      <div class="lsn-card lsn-done lsn-anim-in"><div class="lsn-done-emoji">🏆</div><h2>Lesson complete</h2>
        <div class="recap-rewards"><div class="recap-reward"><div class="recap-reward-val">+${xp}</div><div class="recap-reward-lbl">XP</div></div>
          ${coins ? `<div class="recap-reward"><div class="recap-reward-val">+${coins}</div><div class="recap-reward-lbl">🪙 Coins</div></div>` : ''}</div>
        <div class="cur-card cur-deeper"><div class="cur-kicker">🔭 Go deeper</div><div class="cur-a">${esc(u.curiosity.deeper)}</div></div>
        <div class="lsn-done-note">Now take it into a fight: ${u.problems.length} problems from this lesson are waiting.</div>
        <div class="lsn-nav"><button class="btn ghost" id="elBackHub">◀ Back</button>
          <button class="btn primary" id="elFight">${esc(u.enemy.icon)} Fight the ${esc(u.enemy.name)} ▶</button></div></div></div>`;
    wireQuit(root, h); askSet(root, u, 'The lesson is complete; about to start the practice fight');
    try { CF.Narrator.speak('Lesson complete. Time for a fight.'); } catch (e) {}
    root.querySelector('#elBackHub').addEventListener('click', () => { try { CF.Music.play('menu'); } catch (e) {} h.onExit && h.onExit(); });
    root.querySelector('#elFight').addEventListener('click', () => startFight(root, u.id, h));
    try { CF.Rewards && setTimeout(() => { if (root.querySelector('#elFight')) CF.Rewards.showChest({ context: u.title + ' complete' }); }, 900); } catch (e) {}
  }

  function openLesson(root, unitId, h) {
    const u = unitById(unitId); if (!u) return;
    if (isLocked(unitId)) { h && h.onExit && h.onExit(); return; }
    h = h || {};
    lessonIntro(root, u, h);
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  FIGHT                                                       */
  /* ═══════════════════════════════════════════════════════════ */
  function startFight(root, unitId, h) {
    const u = unitById(unitId); if (!u) return;
    h = h || {};
    cleanup(root);
    const run = { u, qs: planFight(unitId), i: 0, hearts: 3, right: 0, wrong: 0, bossTries: 0 };
    nextQuestion(root, run, h);
  }

  /* a fight built from any question list: spec = { id, title, enemy:{name,icon}, build():question[], onWin(info)->{xp,coins} } */
  function startCustomFight(root, spec, h) {
    h = h || {};
    cleanup(root);
    const qs = spec.build();
    if (!qs || !qs.length) { h.onExit && h.onExit(); return; }
    const run = { u: { id: spec.id, title: spec.title, enemy: spec.enemy }, spec, custom: true, qs, i: 0, hearts: 3, right: 0, wrong: 0, bossTries: 0 };
    nextQuestion(root, run, h);
  }

  /* animated spirit if available, emoji as the fallback */
  function spirit(enemy, px) { try { if (CF.Spirits) return CF.Spirits.html(enemy.icon, enemy.name, px); } catch (e) {} return esc(enemy.icon); }

  function dyingSpirit(enemy) { const h = spirit(enemy, 84); return h.includes('class="spirit') ? h.replace('spirit idle', 'spirit die') : '🎉'; }

  function fightHeader(run) {
    const total = run.qs.length, hpPct = Math.max(0, Math.round(100 * (1 - run.right / total)));
    return `<div class="ecf-head">
      <button class="back-btn" id="ecfQuit" aria-label="Leave the fight">✕</button>
      <div class="ecf-enemy"><span class="ecf-enemy-ic">${spirit(run.u.enemy, 60)}</span>
        <div class="ecf-enemy-body"><div class="ecf-enemy-name">${esc(run.u.enemy.name)}</div>
          <div class="ecf-hp" role="progressbar" aria-valuenow="${hpPct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${hpPct}%"></i></div></div></div>
      <div class="ecf-hearts" aria-label="${run.hearts} lives left">${'❤️'.repeat(run.hearts)}${'🖤'.repeat(3 - run.hearts)}</div></div>
      <div class="ecf-count">Round ${Math.min(run.i + 1, total)} of ${total}${run.qs[run.i] && run.qs[run.i].type === 'boss' ? ' · 👑 BOSS' : ''}</div>`;
  }

  let currentRun = null;   /* test seam: lets tests read the question on screen */
  function nextQuestion(root, run, h) {
    currentRun = run;
    if (run.i >= run.qs.length) return fightWon(root, run, h);
    const q = run.qs[run.i];
    if (!run._warm && run.qs.some(x => x.check)) { run._warm = true; try { CF.PyRun && CF.PyRun.supported() && CF.PyRun.ensure().catch(() => {}); } catch (e) {} }
    root.innerHTML = `<div class="lsn-wrap ecf">${fightHeader(run)}<div id="ecfBody"></div></div>`;
    root.querySelector('#ecfQuit').addEventListener('click', () => { if (confirm('Leave the fight? This run will not count.')) { cleanup(root); h.onExit && h.onExit(); } });
    const body = root.querySelector('#ecfBody');
    const settle = (ok, extra) => afterAnswer(root, run, h, q, ok, extra);
    if (q.type === 'mcq') renderMcq(body, q, settle);
    else if (q.type === 'order') renderOrder(body, q, settle);
    else if (q.type === 'fill') renderFill(body, q, settle);
    else if (q.type === 'predict') renderPredict(body, q, settle);
    else if (q.type === 'quiz' || q.type === 'scenario') renderQuiz(body, q, settle);
    else renderBoss(body, q, settle, run);
  }

  function afterAnswer(root, run, h, q, ok) {
    if (q.num !== undefined) bump(q.num, ok);
    try { if (q.card && CF.Review) CF.Review.record(q.card, ok); } catch (e) {}
    if (ok) { run.right++; try { CF.Sonify.fx('win', {}); } catch (e) {} }
    else { run.wrong++; run.hearts--; try { CF.Sonify.fx('lose', {}); } catch (e) {} }
    try { CF.Spirits && CF.Spirits.react(root.querySelector('.ecf-enemy .spirit'), ok ? 'hurt' : 'attack'); } catch (e) {}
    S.save();
    /* show the result in the header right away, not only on the next round */
    const hearts = root.querySelector('.ecf-hearts'), hp = root.querySelector('.ecf-hp i');
    if (hearts) { hearts.textContent = '❤️'.repeat(Math.max(0, run.hearts)) + '🖤'.repeat(3 - Math.max(0, run.hearts)); hearts.setAttribute('aria-label', Math.max(0, run.hearts) + ' lives left'); }
    if (hp) hp.style.width = Math.max(0, Math.round(100 * (1 - run.right / run.qs.length))) + '%';
    const bossRetry = q.type === 'boss' && !ok && run.hearts > 0;
    const dead = run.hearts <= 0;
    const bar = root.querySelector('#ecfBody');
    const fb = document.createElement('div');
    fb.className = 'ecf-fb ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = `<div class="ecf-fb-t">${ok ? '✅ Correct!' : '💥 Not quite. You lose a life.'}</div>
      ${q.why ? `<div class="ecf-fb-w">${esc(q.why)}</div>` : ''}
      ${q.type === 'predict' && q.trace && CF.PyRun && CF.PyRun.supported && CF.PyRun.supported() ? '<button class="btn ghost" id="ecfWatch">▶ Watch it run</button><div id="ecfWatchBox"></div>' : ''}
      <button class="btn primary" id="ecfNext">${dead ? 'Continue' : bossRetry ? 'Try the boss again ▶' : run.i >= run.qs.length - 1 && ok ? 'Defeat the enemy ▶' : 'Next round ▶'}</button>`;
    bar.appendChild(fb);
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    /* lock the question above so the answer cannot be changed */
    bar.querySelectorAll('button:not(#ecfNext):not(#ecfWatch), textarea').forEach(el => { el.disabled = true; });
    const watch = fb.querySelector('#ecfWatch');
    if (watch) watch.addEventListener('click', async () => {
      watch.disabled = true; watch.textContent = 'Running it…';
      const box = fb.querySelector('#ecfWatchBox');
      try {
        const tr = await CF.PyRun.trace(q.trace, { max: 30 });
        if (tr.error && !tr.steps.length) throw new Error(tr.error);
        const spec = CF.Visuals.stepperFromTrace({ title: 'Your code, run step by step', code: q.trace, notes: [] }, tr);
        const errs = CF.Visuals.validate(spec);
        if (errs.length) throw new Error(errs[0]);
        box.innerHTML = ''; CF.Visuals.render(box, spec); watch.hidden = true;
        if (tr.truncated) { const n = document.createElement('p'); n.className = 'ecf-note'; n.textContent = 'Showing the first 30 steps.'; box.appendChild(n); }
      } catch (e) { watch.textContent = 'Could not run it here'; box.textContent = String(e.message || e); }
    });
    fb.querySelector('#ecfNext').addEventListener('click', () => {
      if (dead) return fightLost(root, run, h);
      if (bossRetry) { run.bossTries++; return nextQuestion(root, run, h); }
      run.i++; nextQuestion(root, run, h);
    });
  }

  function fightLost(root, run, h) {
    if (run.custom) {
      root.innerHTML = `<div class="lsn-wrap ecf"><div class="lsn-card lsn-done lsn-anim-in"><div class="lsn-done-emoji">${spirit(run.u.enemy, 84)}</div><h2>${esc(run.u.enemy.name)} wins this round</h2>
        <div class="lsn-done-note">You answered ${run.right} of ${run.qs.length} correctly before running out of lives.</div>
        <div class="lsn-nav"><button class="btn ghost" id="ecfBackL">◀ Back</button><button class="btn primary" id="ecfRetry">Try again ▶</button></div></div></div>`;
      root.querySelector('#ecfBackL').addEventListener('click', () => h.onExit && h.onExit());
      root.querySelector('#ecfRetry').addEventListener('click', () => startCustomFight(root, run.spec, h));
      return;
    }
    root.innerHTML = `<div class="lsn-wrap ecf"><div class="lsn-card lsn-done lsn-anim-in"><div class="lsn-done-emoji">${spirit(run.u.enemy, 84)}</div><h2>${esc(run.u.enemy.name)} wins this round</h2>
      <div class="lsn-done-note">You answered ${run.right} of ${run.qs.length} correctly before running out of lives. Each run draws different problems, so the next one is a fresh start.</div>
      <div class="lsn-nav"><button class="btn ghost" id="ecfBackL">◀ Back to the lesson list</button><button class="btn primary" id="ecfRetry">Try again ▶</button></div></div></div>`;
    root.querySelector('#ecfBackL').addEventListener('click', () => h.onExit && h.onExit());
    root.querySelector('#ecfRetry').addEventListener('click', () => startFight(root, run.u.id, h));
  }

  function fightWon(root, run, h) {
    if (run.custom) {
      const stars = Math.max(1, run.hearts);
      let rw = { xp: 0, coins: 0 };
      try { rw = run.spec.onWin({ stars, right: run.right, wrong: run.wrong }) || rw; if (rw.xp) S.addXP(rw.xp); if (rw.coins) S.addCoins(rw.coins); S.save(); } catch (e) {}
      root.innerHTML = `<div class="lsn-wrap ecf"><div class="lsn-card lsn-done lsn-anim-in"><div class="lsn-done-emoji">${dyingSpirit(run.u.enemy)}</div><h2>${esc(run.u.enemy.name)} defeated!</h2>
        <div class="ecf-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <div class="recap-rewards"><div class="recap-reward"><div class="recap-reward-val">+${rw.xp || 0}</div><div class="recap-reward-lbl">XP</div></div>
          <div class="recap-reward"><div class="recap-reward-val">+${rw.coins || 0}</div><div class="recap-reward-lbl">🪙 Coins</div></div></div>
        <div class="lsn-done-note">${run.right} right · ${run.wrong} missed · ${run.hearts} ${run.hearts === 1 ? 'life' : 'lives'} left.</div>
        <div class="lsn-nav"><button class="btn ghost" id="ecfAgain">Fight again</button><button class="btn primary" id="ecfOn">Back ▶</button></div></div></div>`;
      root.querySelector('#ecfAgain').addEventListener('click', () => startCustomFight(root, run.spec, h));
      root.querySelector('#ecfOn').addEventListener('click', () => h.onExit && h.onExit());
      try { CF.Rewards && setTimeout(() => { if (root.querySelector('#ecfOn')) CF.Rewards.showChest({ context: run.u.enemy.name + ' defeated' }); }, 700); } catch (e) {}
      return;
    }
    const first = !fightCleared(run.u.id), stars = Math.max(1, run.hearts);
    const xp = first ? 50 : 12, coins = first ? 25 : 3;
    try {
      S.addXP(xp); S.addCoins(coins);
      const prev = fightRec(run.u.id) || {};
      st().fights[run.u.id] = { cleared: true, stars: Math.max(prev.stars || 0, stars), runs: (prev.runs || 0) + 1, ts: Date.now() };
      S.save();
    } catch (e) {}
    const nxt = nextOpen();
    root.innerHTML = `<div class="lsn-wrap ecf"><div class="lsn-card lsn-done lsn-anim-in"><div class="lsn-done-emoji">${dyingSpirit(run.u.enemy)}</div><h2>${esc(run.u.enemy.name)} defeated!</h2>
      <div class="ecf-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="recap-rewards"><div class="recap-reward"><div class="recap-reward-val">+${xp}</div><div class="recap-reward-lbl">XP</div></div>
        <div class="recap-reward"><div class="recap-reward-val">+${coins}</div><div class="recap-reward-lbl">🪙 Coins</div></div></div>
      <div class="lsn-done-note">${run.right} right · ${run.wrong} missed · ${run.hearts} ${run.hearts === 1 ? 'life' : 'lives'} left.</div>
      <div class="lsn-nav"><button class="btn ghost" id="ecfAgain">Fight again</button>
        <button class="btn primary" id="ecfOn">${nxt ? 'Next lesson ▶' : 'Back ▶'}</button></div></div></div>`;
    root.querySelector('#ecfAgain').addEventListener('click', () => startFight(root, run.u.id, h));
    root.querySelector('#ecfOn').addEventListener('click', () => { if (nxt) openLesson(root, nxt.id, h); else h.onExit && h.onExit(); });
    try { CF.Rewards && setTimeout(() => { if (root.querySelector('#ecfOn')) CF.Rewards.showChest({ context: run.u.enemy.name + ' defeated' }); }, 700); } catch (e) {}
  }

  /* ─────────── question renderers ─────────── */
  function renderMcq(body, q, settle) {
    body.innerHTML = `<div class="lsn-card"><div class="ecf-type">⏱ Complexity</div>
      <h3 class="el-h">${esc(q.title)}</h3><pre class="el-code">${esc(q.code)}</pre>
      <p class="el-p"><b>${esc(q.prompt)}</b></p><p class="ecf-note">${esc(q.note)}</p>
      <div class="ecf-opts">${q.options.map((o, i) => `<button class="ecf-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div></div>`;
    body.querySelectorAll('.ecf-opt').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.i), ok = i === q.correct;
      body.querySelectorAll('.ecf-opt')[q.correct].classList.add('right');
      if (!ok) b.classList.add('wrong');
      settle(ok);
    }));
  }

  function renderPredict(body, q, settle) {
    body.innerHTML = `<div class="lsn-card"><div class="ecf-type">🔮 Predict the output</div>
      <h3 class="el-h">${esc(q.title)}</h3><pre class="el-code">${esc(q.code)}</pre>
      <p class="el-p"><b>${esc(q.prompt)}</b></p><p class="ecf-note">Work it out in your head first. No running it!</p>
      <div class="ecf-opts">${q.options.map((o, i) => `<button class="ecf-opt ecf-mono" data-i="${i}">${esc(o)}</button>`).join('')}</div></div>`;
    body.querySelectorAll('.ecf-opt').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.i), ok = i === q.correct;
      body.querySelectorAll('.ecf-opt')[q.correct].classList.add('right');
      if (!ok) b.classList.add('wrong');
      settle(ok);
    }));
  }

  function renderQuiz(body, q, settle) {
    body.innerHTML = `<div class="lsn-card ecf-plain"><div class="ecf-type">${esc(q.label)}</div>
      <h3 class="el-h">${esc(q.title)}</h3>${q.context ? `<div class="ecf-situation">${esc(q.context)}</div>` : ''}
      <p class="el-p"><b>${esc(q.prompt)}</b></p>
      <div class="ecf-opts">${q.options.map((o, i) => `<button class="ecf-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div></div>`;
    body.querySelectorAll('.ecf-opt').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.i), ok = i === q.correct;
      body.querySelectorAll('.ecf-opt')[q.correct].classList.add('right');
      if (!ok) b.classList.add('wrong');
      settle(ok);
    }));
  }

  /* boss for non-coding lessons: write your own answer, compare with a model answer, tick the rubric honestly */
  function renderBossWrite(body, q, settle) {
    body.innerHTML = `<div class="lsn-card ecf-boss ecf-plain"><div class="ecf-type">👑 Boss: your turn</div>
      <h3 class="el-h">${esc(q.title)}</h3><p class="el-p">${esc(q.statement)}</p>
      <textarea id="ecfAnswer" class="ecf-answer" rows="6" maxlength="1500" placeholder="Write your answer here, in your own words"></textarea>
      <div class="ecf-actions"><button class="btn primary" id="ecfSubmit">Compare with the model answer ▶</button></div><div id="ecfReview"></div></div>`;
    const ta = body.querySelector('#ecfAnswer');
    body.querySelector('#ecfSubmit').addEventListener('click', () => {
      if (ta.value.trim().length < 8) { body.querySelector('#ecfReview').innerHTML = '<p class="ecf-note">Write at least a sentence first. Trying is what makes it stick.</p>'; return; }
      const rev = body.querySelector('#ecfReview'), need = Math.ceil(q.rubric.length / 2);
      body.querySelector('#ecfSubmit').disabled = true; ta.disabled = true;
      const aiOn = CF.AITutor && CF.AITutor.isConfigured && CF.AITutor.isConfigured();
      rev.innerHTML = `<div class="ecf-lab">A strong answer</div><div class="el-quote">${esc(q.model)}</div>
        <div class="ecf-lab">Tick what YOUR answer did (be honest, at least ${need} of ${q.rubric.length} to win)</div>
        <ul class="ecf-rubric">${q.rubric.map((r, i) => `<li><label><input type="checkbox" data-r="${i}"> <span>${esc(r)}</span></label></li>`).join('')}</ul>
        ${aiOn ? '<div id="ecfAi"><button class="btn ghost" id="ecfAskAi">🤖 Ask the AI tutor for feedback</button><div class="ecf-aifb" id="ecfAiFb"></div></div>' : ''}
        <div class="ecf-actions"><button class="btn primary" id="ecfDone">Done ▶</button></div>`;
      if (aiOn) rev.querySelector('#ecfAskAi').addEventListener('click', async (e) => {
        e.target.disabled = true; const out = rev.querySelector('#ecfAiFb'); out.textContent = 'Reading your answer…';
        try {
          out.textContent = await CF.AITutor.generate([`Task given to the learner: ${q.statement}`, `A strong answer looks like: ${q.model}`, `Rubric: ${q.rubric.join('; ')}`, `The learner wrote:\n${ta.value}`, '',
            'Give kind, specific feedback in at most 4 sentences: what they did well against the rubric, and the one most useful thing to improve. Do not rewrite their whole answer.'].join('\n'), { temperature: 0.3 });
        } catch (err) { out.textContent = 'Could not reach the tutor: ' + err.message; e.target.disabled = false; }
      });
      rev.querySelector('#ecfDone').addEventListener('click', () => {
        const got = rev.querySelectorAll('input[data-r]:checked').length, ok = got >= need;
        if (!ok) q.why = `You covered ${got} of ${q.rubric.length} points. Read the strong answer once more and try writing it again in your own words.`;
        rev.querySelectorAll('input').forEach(x => { x.disabled = true; });
        settle(ok);
      });
    });
  }

  function renderOrder(body, q, settle) {
    const pool = q.cards.slice(), built = [];
    const draw = () => {
      body.innerHTML = `<div class="lsn-card ${q.plain ? 'ecf-plain' : ''}"><div class="ecf-type">🧩 Put the ${q.plain ? 'steps' : 'lines'} in order</div>
        <h3 class="el-h">${esc(q.title)}</h3><p class="el-p">${esc(q.statement)}</p>
        <div class="ecf-lab">${q.plain ? 'Your order (tap a step to take it back)' : 'Your code (tap a line to take it back)'}</div>
        <div class="ecf-build">${q.plain ? '' : `<div class="ecf-def">${esc(q.def)}</div>`}
          ${built.map((c, k) => `<button class="ecf-line" data-b="${k}">${esc(c.text)}</button>`).join('')}
          ${built.length < q.cards.length ? `<div class="ecf-slot">next ${q.plain ? 'step' : 'line'}…</div>` : ''}</div>
        <div class="ecf-lab">${q.plain ? 'Steps to place' : 'Lines to place'}</div>
        <div class="ecf-pool">${pool.map((c, k) => `<button class="ecf-line pool" data-p="${k}">${esc(c.text)}</button>`).join('') || '<span class="ecf-note">All placed. Check your answer.</span>'}</div>
        <div class="ecf-actions"><button class="btn ghost" id="ecfReset">Reset</button><button class="btn primary" id="ecfCheck" ${pool.length ? 'disabled' : ''}>Check ▶</button></div></div>`;
      body.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { built.push(pool.splice(Number(b.dataset.p), 1)[0]); draw(); }));
      body.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => { pool.push(built.splice(Number(b.dataset.b), 1)[0]); draw(); }));
      body.querySelector('#ecfReset').addEventListener('click', () => { while (built.length) pool.push(built.pop()); draw(); });
      body.querySelector('#ecfCheck').addEventListener('click', () => {
        const ans = built.map(c => c.text), ok = q.plain ? ans.join('\u0001') === q.solution.join('\u0001') : orderIsValid(q.solution, ans);
        body.innerHTML = `<div class="lsn-card ${q.plain ? 'ecf-plain' : ''}"><div class="ecf-type">🧩 ${ok ? 'Your order' : 'Your order vs the right one'}</div>
          <h3 class="el-h">${esc(q.title)}</h3>
          <div class="ecf-build">${q.plain ? '' : `<div class="ecf-def">${esc(q.def)}</div>`}${ans.map((l, k) => `<div class="ecf-line ${l === q.solution[k] || ok ? 'good' : 'bad'}">${esc(l)}</div>`).join('')}</div>
          ${ok ? '' : `<div class="ecf-lab">Correct order</div>${q.plain ? `<ol class="ecf-ol">${q.solution.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : `<pre class="el-code">${esc(q.def + '\n' + q.solution.join('\n'))}</pre>`}`}</div>`;
        settle(ok);
      });
    };
    draw();
  }

  function renderFill(body, q, settle) {
    const filled = new Array(q.answers.length).fill(null);   // index into q.bank
    let sel = null;
    const draw = () => {
      let bi = -1;
      const codeHTML = q.segs.map(parts => parts.map(p => {
        if (!p.blank) return esc(p.text);
        bi++;
        const k = bi, w = filled[k] !== null ? q.bank[filled[k]] : null;
        return `<button class="ecf-blank ${w ? 'has' : ''} ${sel === k ? 'sel' : ''}" data-k="${k}">${w ? esc(w) : '&nbsp;&nbsp;&nbsp;&nbsp;'}</button>`;
      }).join('')).join('\n');
      const used = new Set(filled.filter(x => x !== null));
      body.innerHTML = `<div class="lsn-card"><div class="ecf-type">✍️ Fill in the missing words</div>
        <h3 class="el-h">${esc(q.title)}</h3><p class="el-p">${esc(q.statement)}</p>
        ${q.plain ? `<div class="ecf-textfill">${codeHTML.replace(/\n/g, '<br>')}</div>` : `<pre class="el-code ecf-fillcode">${esc(q.def)}\n${codeHTML}</pre>`}
        <div class="ecf-lab">Word bank (tap a word to place it; tap a blank to clear it)</div>
        <div class="ecf-bank">${q.bank.map((w, i) => `<button class="ecf-word ${used.has(i) ? 'used' : ''}" data-w="${i}" ${used.has(i) ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div>
        <div class="ecf-actions"><button class="btn ghost" id="ecfReset">Reset</button><button class="btn primary" id="ecfCheck" ${filled.includes(null) ? 'disabled' : ''}>Check ▶</button></div></div>`;
      body.querySelectorAll('.ecf-blank').forEach(b => b.addEventListener('click', () => { const k = Number(b.dataset.k); if (filled[k] !== null) { filled[k] = null; sel = k; } else sel = k; draw(); }));
      body.querySelectorAll('.ecf-word').forEach(b => b.addEventListener('click', () => {
        const target = sel !== null && filled[sel] === null ? sel : filled.indexOf(null);
        if (target < 0) return; filled[target] = Number(b.dataset.w); sel = null; draw();
      }));
      body.querySelector('#ecfReset').addEventListener('click', () => { filled.fill(null); sel = null; draw(); });
      body.querySelector('#ecfCheck').addEventListener('click', () => {
        const res = filled.map((x, k) => q.bank[x] === q.answers[k]), ok = res.every(Boolean);
        let k2 = -1;
        const html = q.segs.map(parts => parts.map(p => {
          if (!p.blank) return esc(p.text); k2++;
          return `<span class="ecf-blank done ${res[k2] ? 'good' : 'bad'}">${esc(q.bank[filled[k2]])}${res[k2] ? '' : ' → ' + esc(p.answer)}</span>`;
        }).join('')).join('\n');
        body.innerHTML = `<div class="lsn-card"><div class="ecf-type">✍️ ${ok ? 'Complete!' : 'Check the highlighted words'}</div>
          <h3 class="el-h">${esc(q.title)}</h3>${q.plain ? `<div class="ecf-textfill">${html.replace(/\n/g, '<br>')}</div>` : `<pre class="el-code ecf-fillcode">${esc(q.def)}\n${html}</pre>`}</div>`;
        settle(ok);
      });
    };
    draw();
  }

  function renderBoss(body, q, settle, run) {
    if (q.plain) return renderBossWrite(body, q, settle);
    if (q.check && CF.PyRun && CF.PyRun.supported()) return renderBossRun(body, q, settle, run);
    return renderBossLegacy(body, q, settle, run);
  }

  /* the boss, graded by actually running the learner's code */
  function renderBossRun(body, q, settle, run) {
    body.innerHTML = `<div class="lsn-card ecf-boss"><div class="ecf-type">👑 Boss: write the code</div>
      <h3 class="el-h">${esc(q.title)}</h3><p class="el-p">${esc(q.statement)}</p>
      <div class="ec-io"><div><b>Input</b><pre>${esc(q.input)}</pre></div><div><b>Output</b><pre>${esc(q.output)}</pre></div></div>
      <textarea id="ecfCode" class="ec-scratch ecf-editor" rows="9" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(q.starter)}</textarea>
      <div class="ecf-actions"><button class="btn ghost" id="ecfGiveUp">Show solution (lose a life)</button><button class="btn primary" id="ecfRun">▶ Run my code</button></div>
      <div id="ecfReview" role="status"></div></div>`;
    const ta = body.querySelector('#ecfCode'), rev = body.querySelector('#ecfReview'), runBtn = body.querySelector('#ecfRun');
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); const s0 = ta.selectionStart; ta.value = ta.value.slice(0, s0) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s0 + 4; }
    });
    const caseRow = (c) => `<li class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✅' : '❌'} <code>${esc(c.call || c.args)}</code><br><small>expected <code>${esc(c.expected)}</code> · got <code>${esc(c.got)}</code>${c.kind === 'extra' ? ' · extra test' : ''}</small></li>`;
    body.querySelector('#ecfGiveUp').addEventListener('click', () => {
      body.querySelectorAll('#ecfRun,#ecfGiveUp').forEach(b => { b.disabled = true; });
      rev.innerHTML = `<div class="ecf-lab">Model solution</div><pre class="el-code">${esc(q.model)}</pre><p class="ecf-note">${esc(q.explanation)}</p>`;
      q.why = 'Study the model solution above, then try again next time.';
      settle(false);
    });
    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      rev.innerHTML = '<p class="ecf-note">Running your code… (the first run downloads Python, about 10 MB, then it is cached)</p>';
      let r;
      try {
        r = q.check.kind === 'tests' ? await CF.PyRun.runTests(ta.value, q.check.tests) : await CF.PyRun.runDiff(ta.value, q.check.model, q.check.example);
      } catch (err) {
        /* the runner could not start (offline?): fall back to grading yourself */
        runBtn.disabled = false;
        return renderBossLegacy(body, q, settle, run, 'Could not start the Python runner (' + err.message + '), so you will grade this one yourself.');
      }
      if (!body.isConnected) return;
      runBtn.disabled = false;
      if (r.error) { rev.innerHTML = `<div class="ecf-bad"><b>Your code did not run.</b><pre class="ecf-err">${esc(r.error)}</pre><p class="ecf-note">Fix it and press Run again. Running is free.</p></div>`; return; }
      if (!r.cases.length) {
        return renderBossLegacy(body, q, settle, run, 'This problem has no runnable test, so you will grade it yourself.');
      }
      const passN = r.cases.filter(c => c.ok).length;
      if (r.passed) {
        rev.innerHTML = `<div class="ecf-lab">All ${r.cases.length} tests passed</div><ul class="ecf-checks">${r.cases.map(caseRow).join('')}</ul><div class="ecf-lab">Model solution (compare)</div><pre class="el-code">${esc(q.model)}</pre><p class="ecf-note">${esc(q.explanation)}</p>`;
        try { if (q.num !== undefined) st().done[q.num] = st().done[q.num] || Date.now(); } catch (e) {}
        body.querySelectorAll('#ecfRun,#ecfGiveUp').forEach(b => { b.disabled = true; });
        return settle(true);
      }
      const exampleOk = r.cases.filter(c => c.kind === 'example' || c.kind === undefined).every(c => c.ok);
      rev.innerHTML = `<div class="ecf-lab">${passN} of ${r.cases.length} tests passed</div><ul class="ecf-checks">${r.cases.map(caseRow).join('')}</ul>
        <p class="ecf-note">${exampleOk ? 'Your code works on the example but fails an extra test. Look at the failing input.' : 'Not there yet. Compare expected and got, edit your code and run again. Running is free.'}</p>
        ${exampleOk && q.check.kind === 'diff' ? '<div class="ecf-actions"><button class="btn ghost" id="ecfValid">My answer is valid anyway (a different correct output)</button></div>' : ''}`;
      const v = rev.querySelector('#ecfValid');
      if (v) v.addEventListener('click', () => { try { if (q.num !== undefined) st().done[q.num] = st().done[q.num] || Date.now(); } catch (e) {} body.querySelectorAll('#ecfRun,#ecfGiveUp,#ecfValid').forEach(b => { b.disabled = true; }); settle(true); });
    });
  }

  function renderBossLegacy(body, q, settle, run, note) {
    body.innerHTML = `<div class="lsn-card ecf-boss"><div class="ecf-type">👑 Boss: write the code</div>
      <h3 class="el-h">${esc(q.title)}</h3><p class="el-p">${esc(q.statement)}</p>
      <div class="ec-io"><div><b>Input</b><pre>${esc(q.input)}</pre></div><div><b>Output</b><pre>${esc(q.output)}</pre></div></div>
      <textarea id="ecfCode" class="ec-scratch ecf-editor" rows="9" spellcheck="false" autocapitalize="off" autocomplete="off">${esc(q.starter)}</textarea>
      <div class="ecf-actions"><button class="btn primary" id="ecfSubmit">Submit my code ▶</button></div>
      ${note ? `<p class="ecf-note">${esc(note)}</p>` : ''}<div id="ecfReview"></div></div>`;
    const ta = body.querySelector('#ecfCode');
    ta.addEventListener('keydown', e => {            // Tab inserts 4 spaces instead of leaving the box
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; }
    });
    body.querySelector('#ecfSubmit').addEventListener('click', () => {
      const text = ta.value, ch = bossChecks(q, text), shapeOk = ch.shape.every(c => c.ok);
      const rev = body.querySelector('#ecfReview');
      body.querySelector('#ecfSubmit').disabled = true;
      const aiOn = CF.AITutor && CF.AITutor.isConfigured && CF.AITutor.isConfigured();
      rev.innerHTML = `<div class="ecf-lab">Quick checks on your code</div>
        <ul class="ecf-checks">${ch.shape.map(c => `<li class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✅' : '❌'} ${esc(c.label)}</li>`).join('')}</ul>
        ${ch.ideas.length ? `<div class="ecf-lab">Building blocks the model solution uses (advisory; other approaches are fine)</div>
        <ul class="ecf-checks inline">${ch.ideas.map(c => `<li class="${c.ok ? 'ok' : 'maybe'}">${c.ok ? '✅' : '▫️'} ${esc(c.label)}</li>`).join('')}</ul>` : ''}
        ${shapeOk ? `<div class="ecf-lab">Model solution</div><pre class="el-code">${esc(q.model)}</pre><p class="ecf-note">${esc(q.explanation)}</p>
          <div id="ecfAi"></div>
          <div class="ecf-grade"><b>Be honest: does your code do the same job?</b><div class="ecf-actions">
            <button class="btn ghost" id="ecfNo">❌ Not yet</button><button class="btn primary" id="ecfYes">✅ Yes, it works</button></div></div>`
        : `<p class="ecf-note">Write a complete function first: it needs the def line and a return. Edit your code above and submit again.</p>`}`;
      if (!shapeOk) { body.querySelector('#ecfSubmit').disabled = false; return; }
      if (aiOn) {
        const ai = rev.querySelector('#ecfAi');
        ai.innerHTML = '<button class="btn ghost" id="ecfAskAi">🤖 Ask the AI tutor to review it</button><div class="ecf-aifb" id="ecfAiFb"></div>';
        ai.querySelector('#ecfAskAi').addEventListener('click', async (e) => {
          e.target.disabled = true; const out = ai.querySelector('#ecfAiFb'); out.textContent = 'Reviewing…';
          try {
            const text2 = await CF.AITutor.generate([
              `Problem: ${q.statement}`, `Example input: ${q.input}`, `Expected output: ${q.output}`,
              `The learner wrote this Python:\n${ta.value}`, '',
              'Would this code return the correct answer for general inputs, not only the example? First line exactly "VERDICT: PASS" or "VERDICT: RETRY". Then one or two sentences. Do not paste a full corrected solution.'
            ].join('\n'), { temperature: 0.2 });
            out.textContent = text2.replace(/VERDICT:\s*(PASS|RETRY)/i, m => m.toUpperCase().includes('PASS') ? '✅ Looks right.' : '⚠️ Needs another look.');
          } catch (err) { out.textContent = 'Could not reach the tutor: ' + err.message; e.target.disabled = false; }
        });
      }
      rev.querySelector('#ecfYes').addEventListener('click', () => { try { if (q.num !== undefined) st().done[q.num] = st().done[q.num] || Date.now(); } catch (e) {} settle(true); });
      rev.querySelector('#ecfNo').addEventListener('click', () => { q.why = 'Compare your code with the model solution above, then try again.'; settle(false); });
    });
  }

  /* ═══════════════════════════════════════════════════════════ */
  /*  PUBLIC                                                      */
  /* ═══════════════════════════════════════════════════════════ */
  return {
    UNITS: D.UNITS,
    openLesson, startFight, startCustomFight, rebuild, unitStats, isLocked, isDone: lessonDone, nextOpen, fightOpen, fightCleared, fightRec, accuracy,
    stats: () => st(),
    solvedCount: () => Object.keys(st().done).length,
    /* pure generators, exposed for tests */
    _run: () => currentRun,
    _q: { quizFromParts, plainOrderFrom, plainFillFrom, writeBossFrom, predictFromParts, predictWrong, mcqFromComplexity, renderBoss, orderFromCode, fillFromCode, bossFromParts, orderEligibleCode, fillEligibleCode },
    _gen: { genPredict, predictEligible, genMcq, genOrder, genFill, genBoss, orderIsValid, orderEligible, fillEligible, planFight, swapGroups, bossChecks }
  };
})();

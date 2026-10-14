/* ═══════════════════════════════════════════════════════════ */
/*  15a-problem-lab.js — the interactive "Problem" phase        */
/*                                                              */
/*  The learner meets the task with their own eyes BEFORE any   */
/*  code. This module makes that moment alive and un-freezable: */
/*   · live equation / meter that updates with every tap        */
/*   · pointers (L / R) glide to the tapped tiles, an arc is    */
/*     drawn between them, stretches fill in between            */
/*   · wrong answers get a SPECIFIC reason, never a dead end    */
/*   · progressive 💡 nudges, then 👀 "Show me" — a ghost hand   */
/*     solves it on screen so Continue always unlocks           */
/*   · wins: tiles physically swap / sparkles burst / sound     */
/*                                                              */
/*  Every lesson's question has a RULE below, so what the       */
/*  question asks is exactly what gets checked (earlier, 9 of   */
/*  13 questions were graded by the wrong rule and could never  */
/*  be answered — the phase "froze").                           */
/*  Depends on: 13-visualizer.js (Visualizer, Sonify)           */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};

CF.ProblemLab = (() => {
  const esc = CF.esc || (s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const span = (sel) => { const v = sel.map(s => s.i).sort((a, b) => a - b); return [v[0], v[v.length - 1]]; };

  /* ═════════════ RULES ═════════════
     A spec describes ONE question:
       need      how many taps make an answer (1 or 2)
       rows      [{ arr, label?, tag? }]   row 0 = main row, row 1 = reference row
       tappable  which rows accept taps (default [0])
       perRow    one tap per row (two-row questions)
       fill      stretch mode: tiles between the two taps fill in
       live(sel) → { html, meter? }        the live readout
       judge(sel)→ { v:'win'|'near'|'no', msg, swap? }
       hints     progressive nudges  [{ msg, cells:[{r,i}] }]
       demo      [{r,i}…] the solution, tapped by the ghost hand
       punch     optional override of the lesson's punch line        */

  const eq = (parts) => `<span class="pl-eq">${parts}</span>`;
  const chip = (t, cls) => `<i class="${cls || ''}">${esc(t)}</i>`;

  /* ── pair that adds to target (Converging pointers) ── */
  function pairSpec(pb) {
    const a = pb.arr, t = pb.target;
    return {
      need: 2, rows: [{ arr: a }], prompt: 'Tap <b>two</b> tiles.',
      live(sel) {
        const v = sel.map(s => a[s.i]);
        if (!v.length) return { html: eq(`${chip('?')} + ${chip('?')} = <b>${t}</b>`) };
        if (v.length === 1) return { html: eq(`${chip(v[0], 'on')} + ${chip('?')} = <b>${t}</b>`) + `<span class="pl-need">needs ${t - v[0]}</span>` };
        const s = v[0] + v[1];
        return { html: eq(`${chip(v[0], 'on')} + ${chip(v[1], 'on')} = <b class="${s === t ? 'ok' : 'bad'}">${s}</b>`), meter: { v: s, goal: t, mode: 'exact' } };
      },
      judge(sel) {
        const [x, y] = sel.map(s => s.i), s = a[x] + a[y];
        if (s === t) return { v: 'win', msg: `✓ ${a[x]} + ${a[y]} = ${t}.` };
        return { v: 'no', msg: `${a[x]} + ${a[y]} = ${s} — ${s < t ? 'too small' : 'too big'} (need ${t}). Tap two fresh tiles.` };
      },
      hints: [
        { msg: `Pick any tile — then ask: <b>${t} − that tile</b> = ? Is that number in the row?`, cells: [{ r: 0, i: 0 }] },
        { msg: `The tile ${a[0]} needs a partner worth <b>${t - a[0]}</b>. Is it here?`, cells: [{ r: 0, i: 0 }, { r: 0, i: 1 }] }
      ],
      demo: (() => { for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === t) return [{ r: 0, i }, { r: 0, i: j }]; return []; })()
    };
  }

  /* ── stretch whose total is at least `target`, as short as possible ── */
  function shortestSpec(pb) {
    const a = pb.arr, t = pb.target, best = pb.winLen;
    let demo = [];
    for (let l = 0; l < a.length && !demo.length; l++) {
      const r = l + best - 1; if (r < a.length && sum(a.slice(l, r + 1)) >= t) demo = [{ r: 0, i: l }, { r: 0, i: r }];
    }
    return {
      need: 2, fill: true, rows: [{ arr: a }], prompt: 'Tap the <b>first</b> and <b>last</b> room.',
      live(sel) {
        if (sel.length < 2) return { html: eq(`${chip('Σ')} = <b>?</b>`) + `<span class="pl-need">goal ≥ ${t}</span>` };
        const [l, r] = span(sel), s = sum(a.slice(l, r + 1));
        return { html: eq(`${a.slice(l, r + 1).map(v => chip(v, 'on')).join(' + ')} = <b class="${s >= t ? 'ok' : 'bad'}">${s}</b>`) + `<span class="pl-need">${r - l + 1} rooms</span>`, meter: { v: s, goal: t, mode: 'atleast' } };
      },
      judge(sel) {
        const [l, r] = span(sel), len = r - l + 1, s = sum(a.slice(l, r + 1));
        if (s < t) return { v: 'no', msg: `${s} &lt; ${t} — not enough charge yet. Stretch wider.` };
        if (len === best) return { v: 'win', msg: `✓ ${s} ≥ ${t} using only ${len} rooms — nothing shorter exists.` };
        return { v: 'near', msg: `Valid — ${s} ≥ ${t} — but that took ${len} rooms. Can you do it with fewer?` };
      },
      hints: [
        { msg: `A stretch of just <b>${best}</b> rooms is enough. Look for the two biggest neighbours.`, cells: [] },
        { msg: `Glowing tiles sit next to each other and are the big ones — try them.`, cells: demo }
      ],
      demo
    };
  }

  /* ── an exact stretch is asked for ── */
  function exactRangeSpec(pb) {
    const a = pb.arr, [ql, qr] = pb.query;
    return {
      need: 2, fill: true, rows: [{ arr: a }], prompt: `Tap cells <b>${ql}</b> and <b>${qr}</b>.`,
      live(sel) {
        if (sel.length < 2) return { html: eq(`${chip('Σ')} = <b>?</b>`) + `<span class="pl-need">cells ${ql}…${qr}</span>` };
        const [l, r] = span(sel);
        return { html: eq(`${a.slice(l, r + 1).map(v => chip(v, 'on')).join(' + ')} = <b>${sum(a.slice(l, r + 1))}</b>`) + `<span class="pl-need">${r - l + 1} cells walked</span>` };
      },
      judge(sel) {
        const [l, r] = span(sel);
        if (l === ql && r === qr) return { v: 'win', msg: `✓ ${sum(a.slice(l, r + 1))}. But notice — you walked ${r - l + 1} cells, and the NEXT question walks them all again.` };
        return { v: 'no', msg: `That is cells ${l}…${r}, not ${ql}…${qr}. Tap cell ${ql} first, then cell ${qr}.` };
      },
      hints: [{ msg: `Indices count from 0 — the first cell is index 0 (tiny numbers under each tile).`, cells: [{ r: 0, i: ql }, { r: 0, i: qr }] }],
      demo: [{ r: 0, i: ql }, { r: 0, i: qr }]
    };
  }

  /* ── the two ends trade places (reverse) ── */
  function endsSpec(pb) {
    const a = pb.arr, n = a.length;
    return {
      need: 2, rows: [{ arr: a }], prompt: 'Tap the <b>two</b> tiles that swap first.',
      live(sel) {
        const v = sel.map(s => a[s.i]);
        return { html: eq(`${chip(v[0] != null ? v[0] : '?', v.length ? 'on' : '')} ⇄ ${chip(v[1] != null ? v[1] : '?', v.length > 1 ? 'on' : '')}`) };
      },
      judge(sel) {
        const [l, r] = span(sel);
        if (l === 0 && r === n - 1) return { v: 'win', swap: [l, r], msg: `✓ The two ends trade places — that is primitive 3, the in-place swap.` };
        return { v: 'no', msg: `Swapping “${a[l]}” and “${a[r]}” does not start a reversal. Which two tiles are the farthest apart?` };
      },
      hints: [
        { msg: `Reversing means the <b>first</b> tile ends up last. Which tile is that?`, cells: [{ r: 0, i: 0 }] },
        { msg: `…and the last tile ends up first. Swap those two.`, cells: [{ r: 0, i: 0 }, { r: 0, i: n - 1 }] }
      ],
      demo: [{ r: 0, i: 0 }, { r: 0, i: n - 1 }]
    };
  }

  const RULES = {
    /* move zeros to the back — the first tile that must move, and where it lands */
    p2: (pb) => ({
      need: 2, rows: [{ arr: pb.arr }], prompt: 'Tap the tile that <b>moves</b>, then the slot it <b>lands</b> in.',
      live(sel) {
        const a = pb.arr;
        return { html: eq(`${chip(sel[0] ? 'idx ' + sel[0].i + ' (' + a[sel[0].i] + ')' : '?', sel[0] ? 'on' : '')} → ${chip(sel[1] ? 'idx ' + sel[1].i : '?', sel[1] ? 'on' : '')}`) };
      },
      judge(sel) {
        const [l, r] = span(sel);
        if (l === 0 && r === 1) return { v: 'win', swap: [0, 1], msg: `✓ The 1 slides into the first empty slot (index 0). “Read ahead, write behind.”` };
        return { v: 'no', msg: `Not the first move. Scan from the LEFT — where is the first empty slot (0)? What fills it?` };
      },
      hints: [
        { msg: `The very first <b>0</b> is a hole that must be filled.`, cells: [{ r: 0, i: 0 }] },
        { msg: `The first real value to its right (the <b>1</b>) slides into it.`, cells: [{ r: 0, i: 0 }, { r: 0, i: 1 }] }
      ],
      demo: [{ r: 0, i: 1 }, { r: 0, i: 0 }]
    }),

    /* merge from the back: where does the largest value land? */
    p3: (pb) => ({
      need: 1, rows: [{ arr: ['1', '3', '5', '_', '_', '_'], label: 'nums1 — three free slots at the back' }, { arr: ['2', '4', '6'], label: 'nums2' }],
      prompt: 'Tap a cell of <b>nums1</b>.',
      live(sel) { return { html: eq(`${chip('6')} (the largest of all) → ${chip(sel[0] ? 'cell ' + sel[0].i : '?', sel[0] ? 'on' : '')}`) }; },
      judge(sel) {
        const i = sel[0].i;
        if (i === 5) return { v: 'win', msg: `✓ The last cell.` };
        if (i < 3) return { v: 'no', msg: `Cell ${i} already holds a real value — the free space is at the back.` };
        return { v: 'no', msg: `Free, yes — but the LARGEST value (6) goes in the very last slot.` };
      },
      hints: [
        { msg: `Sorted order puts the largest value at the <b>end</b>.`, cells: [{ r: 1, i: 2 }] },
        { msg: `nums1's free slots are at the back — and the last one is for 6.`, cells: [{ r: 0, i: 5 }] }
      ],
      demo: [{ r: 0, i: 5 }]
    }),

    /* run compression: where does the first run end? */
    guard: (pb) => ({
      need: 1, rows: [{ arr: pb.arr }], prompt: 'Tap the <b>last tile</b> of the first run.',
      live(sel) { return { html: eq(`first run ends at ${chip(sel[0] ? 'idx ' + sel[0].i : '?', sel[0] ? 'on' : '')}`) }; },
      judge(sel) {
        const i = sel[0].i;
        if (i === 1) return { v: 'win', msg: `✓ Index 1 is the last “a” — the next tile differs. A skip loop must stop exactly here, without running off the array.` };
        if (i === 0) return { v: 'no', msg: `The run keeps going — index 1 is also “a”.` };
        return { v: 'no', msg: `That is inside a later run. The first run is the opening letters that all match.` };
      },
      hints: [
        { msg: `Start at the left. How many tiles in a row are the same letter?`, cells: [{ r: 0, i: 0 }] },
        { msg: `The run ends right before the letter changes.`, cells: [{ r: 0, i: 1 }, { r: 0, i: 2 }] }
      ],
      demo: [{ r: 0, i: 1 }]
    }),

    /* two sorted rows — first equal pair (one tap per row) */
    p5: (pb) => ({
      need: 2, perRow: true, tappable: [0, 1],
      rows: [{ arr: [1, 2, 2, 3], label: 'A (sorted)', tag: 'a' }, { arr: [2, 2, 4], label: 'B (sorted)', tag: 'b' }],
      prompt: 'Tap <b>one tile in A</b> and <b>one in B</b>.',
      live(sel) {
        const a = sel.find(s => s.r === 0), b = sel.find(s => s.r === 1);
        const av = a ? [1, 2, 2, 3][a.i] : null, bv = b ? [2, 2, 4][b.i] : null;
        const ok = av != null && bv != null && av === bv;
        return { html: eq(`${chip(av != null ? av : '?', av != null ? 'on' : '')} ${av != null && bv != null ? (ok ? '=' : '≠') : '·'} ${chip(bv != null ? bv : '?', bv != null ? 'on' : '')}`) };
      },
      judge(sel) {
        const a = sel.find(s => s.r === 0), b = sel.find(s => s.r === 1);
        if (!a || !b) return { v: 'no', msg: `Pick one tile from <b>each</b> row.` };
        const av = [1, 2, 2, 3][a.i], bv = [2, 2, 4][b.i];
        if (av !== bv) return { v: 'no', msg: `${av} ≠ ${bv} — those two are not equal.` };
        if (a.i === 1 && b.i === 0) return { v: 'win', msg: `✓ A[1] = B[0] = 2 — the first meeting.` };
        return { v: 'near', msg: `Equal, yes — but is it the FIRST meeting when both walkers start from the left?` };
      },
      hints: [
        { msg: `A starts with 1, but B starts with 2. Can the 1 ever match anything in B?`, cells: [{ r: 0, i: 0 }, { r: 1, i: 0 }] },
        { msg: `So the 1 is out. The next tile in A meets B's first tile.`, cells: [{ r: 0, i: 1 }, { r: 1, i: 0 }] }
      ],
      demo: [{ r: 0, i: 1 }, { r: 1, i: 0 }]
    }),

    /* Kadane: the richest consecutive stretch (sum 6) */
    p7: (pb) => {
      const a = pb.arr;
      return {
        need: 2, fill: true, rows: [{ arr: a }], prompt: 'Tap the <b>first</b> and <b>last</b> cell of the richest stretch.',
        live(sel) {
          if (sel.length < 2) return { html: eq(`${chip('Σ')} = <b>?</b>`) + `<span class="pl-need">biggest total wins</span>` };
          const [l, r] = span(sel), s = sum(a.slice(l, r + 1));
          return { html: eq(`${a.slice(l, r + 1).map(v => chip(v, 'on')).join(' + ')} = <b class="${s >= 6 ? 'ok' : ''}">${s}</b>`) };
        },
        judge(sel) {
          const [l, r] = span(sel), s = sum(a.slice(l, r + 1));
          if (s === 6) return { v: 'win', msg: `✓ Total 6 — no other consecutive stretch beats it.` };
          if (s >= 3) return { v: 'near', msg: `Total ${s} — good, but a richer stretch exists. Can you beat it?` };
          return { v: 'no', msg: `Total ${s}. Losses (negatives) drag it down — find a stretch that starts after them.` };
        },
        hints: [
          { msg: `Big gains come in the middle: look around the <b>4</b>.`, cells: [{ r: 0, i: 3 }] },
          { msg: `Start at the 4, and walk right while the running total keeps its value.`, cells: [{ r: 0, i: 3 }, { r: 0, i: 6 }] }
        ],
        demo: [{ r: 0, i: 3 }, { r: 0, i: 6 }]
      };
    },

    /* three-way partition: which kind of cell defines the middle? */
    x1: (pb) => ({
      need: 1, rows: [{ arr: pb.arr }], prompt: 'Tap a cell whose <b>value</b> belongs in the middle zone.',
      live(sel) { return { html: eq(`middle zone = ${chip(sel[0] ? 'value ' + pb.arr[sel[0].i] : '?', sel[0] ? 'on' : '')}`) }; },
      judge(sel) {
        const v = pb.arr[sel[0].i];
        if (v === 1) return { v: 'win', msg: `✓ 0s go to the front, 2s to the back — the 1s are the middle.` };
        return { v: 'no', msg: v === 0 ? `0s belong at the FRONT, not the middle.` : `2s belong at the BACK, not the middle.` };
      },
      hints: [{ msg: `Sorted order is 0, then 1, then 2. Which value sits in the middle?`, cells: [] }, { msg: `Tap either 1.`, cells: [{ r: 0, i: 3 }, { r: 0, i: 4 }] }],
      demo: [{ r: 0, i: 3 }]
    }),

    /* outward expansion: first mirror pair around center 1 */
    x2: (pb) => ({
      need: 2, rows: [{ arr: pb.arr }], prompt: 'Tap the <b>two</b> cells that mirror around the center.',
      live(sel) {
        const a = pb.arr, v = sel.map(s => a[s.i]);
        return { html: eq(`${chip(v[0] != null ? v[0] : '?', v.length ? 'on' : '')} ⟷ ${chip(v[1] != null ? v[1] : '?', v.length > 1 ? 'on' : '')}`) + `<span class="pl-need">center = idx 1</span>` };
      },
      judge(sel) {
        const [l, r] = span(sel);
        if (l === 0 && r === 2) return { v: 'win', msg: `✓ Indices 0 and 2 — one step each side of the center.` };
        if (l === 1 || r === 1) return { v: 'no', msg: `Index 1 IS the center — a mirror pair sits on both sides of it.` };
        return { v: 'no', msg: `Not symmetric around index 1. Distance left must equal distance right.` };
      },
      hints: [
        { msg: `Step <b>one cell left</b> and <b>one cell right</b> of the center.`, cells: [{ r: 0, i: 1 }] },
        { msg: `Those are indices 0 and 2.`, cells: [{ r: 0, i: 0 }, { r: 0, i: 2 }] }
      ],
      demo: [{ r: 0, i: 0 }, { r: 0, i: 2 }]
    }),

    /* prefix + hash map: a stretch summing to 3 that crosses the negative */
    x8: (pb) => {
      const a = pb.arr, k = 3;
      return {
        need: 2, fill: true, rows: [{ arr: a }], prompt: 'Tap the ends of a stretch that adds to <b>3</b> and <b>includes the −3</b>.',
        punch: 'Because of the −3, the running total can go DOWN as the window grows — so a positives-only window can never decide when to shrink. That is why this lesson needs prefix sums and a hash map.',
        live(sel) {
          if (sel.length < 2) return { html: eq(`${chip('Σ')} = <b>?</b>`) + `<span class="pl-need">goal = ${k}</span>` };
          const [l, r] = span(sel), s = sum(a.slice(l, r + 1));
          return { html: eq(`${a.slice(l, r + 1).map(v => chip(v, v < 0 ? 'neg' : 'on')).join(' + ')} = <b class="${s === k ? 'ok' : 'bad'}">${s}</b>`), meter: { v: s, goal: k, mode: 'exact' } };
        },
        judge(sel) {
          const [l, r] = span(sel), s = sum(a.slice(l, r + 1)), has = l <= 3 && r >= 3;
          if (s === k && has) return { v: 'win', msg: `✓ It sums to 3 AND swallows the −3 — a window that only grows on positives would walk right past it.` };
          if (s === k) return { v: 'near', msg: `Sums to 3 — but a positives-only window finds this one easily. Find one that includes the −3.` };
          return { v: 'no', msg: `That sums to ${s}, not ${k}.` };
        },
        hints: [{ msg: `The −3 sits at index 3. Your stretch must cover it.`, cells: [{ r: 0, i: 3 }] }, { msg: `Try starting at index 0 and ending at the −3.`, cells: [{ r: 0, i: 0 }, { r: 0, i: 3 }] }],
        demo: [{ r: 0, i: 0 }, { r: 0, i: 3 }]
      };
    },

    /* exactly-k windows: a stretch with exactly two odd numbers */
    x5: (pb) => {
      const a = pb.arr, k = 2, odd = (x) => Math.abs(x) % 2 === 1;
      return {
        need: 2, fill: true, rows: [{ arr: a }], prompt: 'Tap the ends of a stretch with <b>exactly two odd</b> numbers.',
        live(sel) {
          if (sel.length < 2) return { html: eq(`odd count = <b>?</b>`) + `<span class="pl-need">goal = ${k}</span>` };
          const [l, r] = span(sel), c = a.slice(l, r + 1).filter(odd).length;
          return { html: eq(`${a.slice(l, r + 1).map(v => chip(v, odd(v) ? 'on' : '')).join(' ')} → <b class="${c === k ? 'ok' : 'bad'}">${c} odd</b>`), meter: { v: c, goal: k, mode: 'exact' } };
        },
        judge(sel) {
          const [l, r] = span(sel), c = a.slice(l, r + 1).filter(odd).length;
          if (c === k) return { v: 'win', msg: `✓ Exactly ${k} odd numbers. Several stretches qualify — counting them all without double-counting is the real puzzle.` };
          return { v: 'no', msg: `That stretch holds ${c} odd number${c === 1 ? '' : 's'}, not ${k}.` };
        },
        hints: [{ msg: `Odd tiles light up when selected. Collect exactly two of them.`, cells: [{ r: 0, i: 0 }, { r: 0, i: 1 }] }],
        demo: [{ r: 0, i: 0 }, { r: 0, i: 1 }]
      };
    }
  };

  /* choose the rule: lesson-specific first, then by the legacy `mode` */
  function specFor(lessonId, pb) {
    if (RULES[lessonId]) return RULES[lessonId](pb);
    if (pb.mode === 'pair' && pb.target != null) return pairSpec(pb);
    if (pb.mode === 'stretch' && pb.query) return exactRangeSpec(pb);
    if (pb.mode === 'stretch' && pb.target != null && pb.winLen != null) return shortestSpec(pb);
    if (pb.mode === 'ends') return endsSpec(pb);
    return null; /* open exploration */
  }

  /* ═════════════ MOUNT ═════════════ */
  function mount(root, o) {
    const pb = o.problem, spec = specFor(o.lessonId, pb);
    const stage = root.querySelector('#probStage'), aux = root.querySelector('#probAux');
    const readout = root.querySelector('#plReadout'), meter = root.querySelector('#plMeter');
    const dots = root.querySelector('#plDots'), btnHint = root.querySelector('#plHint');
    const btnDemo = root.querySelector('#plDemo'), btnClear = root.querySelector('#plClear');
    const nextBtn = root.querySelector('#lsnNext');

    const free = !spec;
    const S = free ? { need: 2, rows: [{ arr: pb.arr }], live: () => ({ html: '' }), hints: [], demo: [] } : spec;
    const rows = S.rows.map(r => ({ ...r, arr: [...r.arr] }));
    const tappable = S.tappable || [0];

    let sel = [], solved = false, locked = false, wrong = 0, hintN = 0, helped = false, pendingClear = false, hintCells = [], destroyed = false;
    if (free) nextBtn.disabled = false;

    const key = (r, i) => r + ':' + i;
    const cellEl = (r, i) => {
      const list = r === 0 ? stage.querySelectorAll(':scope > .vz-row > .vz-cell') : stage.querySelectorAll(':scope > .vz-row2-wrap .vz-cell');
      return list[i] || null;
    };
    const centerOf = (el) => {
      const sr = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width, h: r.height };
    };

    /* ── painting ── */
    function setAux(html, cls) { aux.className = 'lsn-prob-aux' + (cls ? ' ' + cls : ''); aux.innerHTML = html; }

    function paint(status) {
      const cls = status || 'cmp';
      const m = [{}, {}];
      sel.forEach(s => { m[s.r][s.i] = cls; });
      if (S.fill && sel.length === 2 && sel[0].r === sel[1].r) {
        const [l, r] = span(sel);
        for (let i = l + 1; i < r; i++) m[sel[0].r][i] = status === 'win' ? 'win' : 'write';
      }
      /* pointers glide to the tapped tiles */
      const p0 = {}, p1 = {};
      if (S.perRow) {
        sel.forEach(s => { (s.r ? p1 : p0)[rows[s.r].tag || (s.r ? 'B' : 'A')] = s.i; });
      } else if (sel.length === 2 && sel[0].r === sel[1].r) {
        const [l, r] = span(sel); p0.L = l; p0.R = r;
      } else if (sel.length === 1) {
        p0.you = sel[0].i;
      }
      const state = { arr: rows[0].arr, ptrs: p0, marks: m[0] };
      if (rows[1]) state.row2 = { arr: rows[1].arr, label: rows[1].label || '', marks: m[1], ptrs: p1 };
      /* arc between the two chosen tiles, drawn live */
      let fx = null;
      if (sel.length === 2 && sel[0].r === 0 && sel[1].r === 0 && !reduced()) {
        const [l, r] = span(sel);
        fx = { arc: [l, r], color: status === 'win' ? '#fbbf24' : status === 'out' ? '#94a3b8' : '#22d3ee', token: status === 'win' };
      }
      CF.Visualizer.renderScene(stage, state, { fx });
      /* the row-1 label lives in the scene; row-0 label sits above the stage */
      applyHints();
      const lv = S.live(sel);
      readout.innerHTML = lv.html || '';
      readout.classList.toggle('empty', !lv.html);
      paintMeter(lv.meter);
    }

    function paintMeter(mt) {
      if (!mt) { meter.hidden = true; return; }
      meter.hidden = false;
      const pct = Math.max(0, Math.min(100, (mt.v / mt.goal) * 100));
      const fill = meter.querySelector('i');
      fill.style.width = pct + '%';
      const hit = mt.mode === 'atleast' ? mt.v >= mt.goal : mt.v === mt.goal;
      meter.className = 'pl-meter' + (hit ? ' hit' : mt.v > mt.goal && mt.mode === 'exact' ? ' over' : '');
      meter.querySelector('b').textContent = `${mt.v} / ${mt.goal}`;
    }

    function applyHints() {
      stage.querySelectorAll('.vz-cell.pl-hint').forEach(c => c.classList.remove('pl-hint'));
      hintCells.forEach(h => { const c = cellEl(h.r, h.i); if (c) c.classList.add('pl-hint'); });
    }

    function paintDots() {
      dots.innerHTML = Array.from({ length: 3 }, (_, i) => `<span class="${i < wrong ? 'miss' : ''}"></span>`).join('');
      dots.title = wrong + ' missed tries';
      btnHint.disabled = solved || free || locked;
      const demoReady = wrong >= 2 || hintN >= 2;
      btnDemo.disabled = solved || free || locked || !demoReady;
      btnDemo.title = demoReady ? '' : 'Unlocks after a couple of tries or nudges';
    }

    /* ── feedback animations ── */
    function shake(cells) {
      if (reduced()) return;
      cells.forEach(c => c && c.animate && c.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-6px)', offset: .2 }, { transform: 'translateX(6px)', offset: .4 },
        { transform: 'translateX(-4px)', offset: .6 }, { transform: 'translateX(3px)', offset: .8 }, { transform: 'translateX(0)' }
      ], { duration: 380, easing: 'ease-out' }));
    }

    function burst(cells) {
      if (reduced()) return;
      cells.forEach(c => {
        if (!c) return;
        const p = centerOf(c);
        for (let k = 0; k < 9; k++) {
          const s = document.createElement('span');
          s.className = 'pl-spark'; s.textContent = k % 3 === 0 ? '✦' : '•';
          s.style.left = p.x + 'px'; s.style.top = p.y + 'px';
          stage.appendChild(s);
          const ang = (Math.PI * 2 * k) / 9 + Math.random() * 0.6, dist = 34 + Math.random() * 34;
          s.animate([
            { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
            { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 10}px)) scale(1.2)`, opacity: 0 }
          ], { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
        }
      });
    }

    function swapAnim(i, j) {
      return new Promise((res) => {
        const a = cellEl(0, i), b = cellEl(0, j);
        if (!a || !b || reduced() || !a.animate) { res(); return; }
        const dx = centerOf(b).x - centerOf(a).x;
        a.style.zIndex = 8; b.style.zIndex = 8;
        const lift = 24;
        a.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx / 2}px,${-lift}px) scale(1.12)`, offset: .5 }, { transform: `translate(${dx}px,0)` }],
          { duration: 720, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        const anim = b.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-dx / 2}px,${lift}px) scale(.94)`, offset: .5 }, { transform: `translate(${-dx}px,0)` }],
          { duration: 720, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        anim.onfinish = () => { a.getAnimations().forEach(x => x.cancel()); b.getAnimations().forEach(x => x.cancel()); a.style.zIndex = ''; b.style.zIndex = ''; res(); };
      });
    }

    /* ── selection logic ── */
    async function tap(r, i) {
      if (solved || locked || destroyed) return;
      if (!tappable.includes(r)) {
        setAux(`That row is only a <b>reference</b> — tap a tile in the <b>${esc((rows[0].label || 'top row').split('—')[0].trim())}</b> row.`);
        return;
      }
      if (pendingClear) { sel = []; pendingClear = false; hintCells = []; }
      hintCells = [];
      const at = sel.findIndex(s => s.r === r && s.i === i);
      if (at >= 0) { sel.splice(at, 1); }
      else {
        if (S.perRow) sel = sel.filter(s => s.r !== r);
        sel.push({ r, i });
        while (sel.length > S.need) sel.shift();
        try { CF.Sonify.fx('init', {}); } catch (e) {}
        const el = cellEl(r, i);
        if (el && el.animate && !reduced()) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.86)', offset: .3 }, { transform: 'scale(1.08)', offset: .7 }, { transform: 'scale(1)' }], { duration: 340, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
      }
      paint();
      if (free) { setAux(sel.length ? `Tapped ${sel.map(s => s.i).join(', ')} — keep exploring, then continue when you feel the shape of it.` : 'Explore: tap any cells.'); return; }
      if (sel.length < S.need) { setAux(S.need === 2 && sel.length === 1 ? 'One more…' : S.prompt); return; }
      await evaluate();
    }

    async function evaluate() {
      const res = S.judge(sel);
      if (res.v === 'win') {
        solved = true; locked = true;
        try { CF.Sonify.fx('win', {}); } catch (e) {}
        if (res.swap) {
          paint('win');
          await swapAnim(res.swap[0], res.swap[1]);
          const [i, j] = res.swap; const t = rows[0].arr[i]; rows[0].arr[i] = rows[0].arr[j]; rows[0].arr[j] = t;
        }
        paint('win');
        const cells = sel.map(s => cellEl(s.r, s.i));
        burst(cells);
        setAux(`${res.msg} <span class="pl-punch">${esc(S.punch || pb.punch || '')}</span>`, 'win');
        locked = false; nextBtn.disabled = false; nextBtn.classList.add('pl-pulse');
        paintDots();
        if (o.onSolved) o.onSolved({ attempts: wrong, helped });
        return;
      }
      if (res.v === 'near') {
        try { CF.Sonify.fx('grow', {}); } catch (e) {}
        paint('cmp'); pendingClear = true;
        setAux(res.msg, 'near');
        return;
      }
      wrong++; pendingClear = true;
      try { CF.Sonify.fx('buzz', {}); } catch (e) {}
      paint('out');
      shake(sel.map(s => cellEl(s.r, s.i)));
      setAux(res.msg, 'no');
      paintDots();
      if (wrong === 2 && !helped) setAux(res.msg + ' <span class="pl-soft">💡 Need a nudge? Try the button below.</span>', 'no');
    }

    /* ── hints & demo ── */
    function nudge() {
      if (solved || free || locked) return;
      const hs = S.hints || [];
      if (!hs.length) return;
      const h = hs[Math.min(hintN, hs.length - 1)];
      hintN++;
      helped = true;
      sel = []; pendingClear = false; hintCells = h.cells || [];
      paint();
      setAux('💡 ' + h.msg, 'hint');
      try { CF.Sonify.fx('compare', { indices: [] }); } catch (e) {}
      paintDots();
    }

    async function demo() {
      if (solved || free || locked || !S.demo.length) return;
      locked = true; helped = true; sel = []; hintCells = []; pendingClear = false;
      paintDots(); paint();
      setAux('👀 Watch how it is done…', 'hint');
      const hand = document.createElement('div');
      hand.className = 'pl-hand'; hand.textContent = '👆';
      stage.appendChild(hand);
      const first = cellEl(S.demo[0].r, S.demo[0].i);
      if (first) { const p = centerOf(first); hand.style.transform = `translate(${p.x - 8}px, ${p.y + 40}px)`; }
      await wait(350);
      for (const step of S.demo) {
        if (destroyed) break;
        const el = cellEl(step.r, step.i); if (!el) continue;
        const p = centerOf(el);
        hand.style.transform = `translate(${p.x - 8}px, ${p.y + 6}px)`;
        await wait(reduced() ? 100 : 750);
        hand.classList.add('press'); await wait(160); hand.classList.remove('press');
        locked = false;                 /* the demo plays by the same rules as the learner */
        await tap(step.r, step.i);
        if (!solved) locked = true;     /* keep the learner out until the demo finishes */
        await wait(250);
      }
      hand.remove();
      locked = false;
    }

    function clearSel() {
      if (solved || locked) return;
      sel = []; hintCells = []; pendingClear = false;
      paint(); setAux(S.prompt || 'Explore: tap any cells.');
    }

    /* ── wire up ── */
    const onStageClick = (ev) => {
      const cell = ev.target.closest && ev.target.closest('.vz-cell');
      if (!cell || !stage.contains(cell)) return;
      const r = cell.closest('.vz-row2-wrap') ? 1 : 0;
      tap(r, Number(cell.dataset.i));
    };
    stage.addEventListener('click', onStageClick);
    btnHint.addEventListener('click', nudge);
    btnDemo.addEventListener('click', demo);
    btnClear.addEventListener('click', clearSel);

    /* first paint + intro hint */
    if (rows[0].label) root.querySelector('#plRow0Label').textContent = rows[0].label;
    paint();
    paintDots();
    if (free) { setAux(pb.mode === 'pair' ? 'Tap <b>two</b> cells.' : 'Explore: tap any cells — then continue when you feel it.'); btnHint.style.display = 'none'; btnDemo.style.display = 'none'; }
    else setAux(S.prompt);

    return { destroy() { destroyed = true; stage.removeEventListener('click', onStageClick); } };
  }

  return { mount, specFor };
})();

/* ═══════════════════════════════════════════════════════════ */
/*  23c-visuals-general.js — visuals for NON-coding lessons      */
/*  (communication, languages, math, study skills, anything)    */
/*                                                              */
/*    compare   two columns "instead of / try", tap a row to see why */
/*    flow      a process revealed step by step                  */
/*    scenario  a situation with choices; tap one, see what happens */
/*    worked    a worked example (problem → steps → answer)       */
/*    cards     flip cards (term / meaning, phrase / translation) */
/*                                                              */
/*  Same rule as the others: the spec is plain data that is       */
/*  validated here, the app draws it.                             */
/*  Depends on: 23-visuals.js (register + _ui helpers).           */
/* ═══════════════════════════════════════════════════════════ */
(function () {
  const V = CF.Visuals, U = V._ui;
  const { esc, frameShell, caption } = U;
  const str = (v, max, min) => typeof v === 'string' && v.trim().length >= (min === undefined ? 1 : min) && v.length <= max;
  const GENERAL_TYPES = ['compare', 'flow', 'scenario', 'worked', 'cards'];

  /* ── compare ── */
  V.register('compare', {
    validate(spec, bad) {
      if (!str(spec.leftLabel, 28) || !str(spec.rightLabel, 28)) bad('compare needs short leftLabel and rightLabel');
      if (!Array.isArray(spec.rows) || spec.rows.length < 2 || spec.rows.length > 5) return bad('compare.rows must have 2-5 items');
      spec.rows.forEach((r, i) => { if (!r || !str(r.left, 100) || !str(r.right, 100) || !str(r.why, 180)) bad('row ' + i + ' needs left, right (max 100 chars) and why (max 180)'); });
    },
    render(root, spec) {
      const open = new Set(); let alive = true;
      const draw = () => {
        if (!alive) return;
        root.innerHTML = `<div class="v2-card" data-vtype="compare">${spec.title ? `<div class="v2-title">${esc(spec.title)}</div>` : ''}
          <div class="v2g-cmp-head"><span class="bad">${esc(spec.leftLabel)}</span><span class="good">${esc(spec.rightLabel)}</span></div>
          ${spec.rows.map((r, i) => `<button class="v2g-cmp-row ${open.has(i) ? 'open' : ''}" data-i="${i}" aria-expanded="${open.has(i)}"><span class="l">${esc(r.left)}</span><span class="r">${esc(r.right)}</span>${open.has(i) ? `<em>${esc(r.why)}</em>` : '<em class="hint">tap to see why</em>'}</button>`).join('')}
          ${caption(open.size === spec.rows.length ? 'You have seen every pair. Which one do you catch yourself doing?' : 'Tap each row to see why the second version works better.', 'hint')}</div>`;
        root.querySelectorAll('.v2g-cmp-row').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.i); open.has(i) ? open.delete(i) : open.add(i); draw(); }));
      };
      draw();
      return { destroy() { alive = false; }, describe: () => `Visual "${spec.title || 'compare'}": pairs of "${spec.leftLabel}" vs "${spec.rightLabel}": ${spec.rows.map((r, i) => `[${r.left}] vs [${r.right}]${open.has(i) ? ' (revealed why: ' + r.why + ')' : ''}`).join('; ')}.` };
    }
  });

  /* ── flow ── */
  V.register('flow', {
    validate(spec, bad) {
      if (!Array.isArray(spec.steps) || spec.steps.length < 3 || spec.steps.length > 6) return bad('flow.steps must have 3-6 items');
      spec.steps.forEach((s, i) => { if (!s || !str(s.title, 44) || !str(s.text, 180)) bad('step ' + i + ' needs title (max 44) and text (max 180)'); });
    },
    render(root, spec) {
      return frameShell(root, spec, spec.steps.length, (stage, i) => {
        stage.innerHTML = `<div class="v2g-flow">${spec.steps.map((s, k) => `<div class="v2g-step ${k === i ? 'now' : k < i ? 'past' : 'later'}"><span class="n">${k + 1}</span><div><b>${esc(s.title)}</b>${k <= i ? `<p>${esc(s.text)}</p>` : ''}</div></div>`).join('')}</div>`;
      }, (i) => `Visual "${spec.title || 'process'}": a ${spec.steps.length}-step process: ${spec.steps.map((s, k) => `${k + 1}. ${s.title}${k <= i ? ' (' + s.text + ')' : ''}`).join('; ')}. The learner has revealed steps 1 to ${i + 1}.`);
    }
  });

  /* ── scenario ── */
  V.register('scenario', {
    validate(spec, bad) {
      if (!str(spec.situation, 260)) bad('scenario.situation must be 1-260 characters');
      if (!Array.isArray(spec.choices) || spec.choices.length < 2 || spec.choices.length > 4) return bad('scenario.choices must have 2-4 items');
      spec.choices.forEach((c, i) => { if (!c || !str(c.text, 130) || !str(c.reply, 220) || typeof c.good !== 'boolean' || !str(c.why, 220)) bad('choice ' + i + ' needs text, reply, good (true/false) and why'); });
      if (!spec.choices.some(c => c && c.good === true)) bad('at least one choice must have good: true');
    },
    render(root, spec) {
      let sel = -1, alive = true;
      const draw = () => {
        if (!alive) return;
        const c = sel >= 0 ? spec.choices[sel] : null;
        root.innerHTML = `<div class="v2-card" data-vtype="scenario">${spec.title ? `<div class="v2-title">${esc(spec.title)}</div>` : ''}
          <div class="v2g-situation">🎭 ${esc(spec.situation)}</div>
          <div class="v2g-choices">${spec.choices.map((x, i) => `<button class="v2g-choice ${i === sel ? 'on ' + (x.good ? 'good' : 'bad') : ''}" data-i="${i}">${esc(x.text)}</button>`).join('')}</div>
          ${c ? `<div class="v2g-reply"><div class="v2g-said">${esc(c.reply)}</div>${caption((c.good ? '✅ ' : '⚠️ ') + c.why, c.good ? 'good' : 'warn')}</div>` : caption('What would you do or say? Tap an option to see what happens next. You can try them all.', 'hint')}</div>`;
        root.querySelectorAll('.v2g-choice').forEach(b => b.addEventListener('click', () => { sel = Number(b.dataset.i); draw(); }));
      };
      draw();
      return { destroy() { alive = false; }, describe: () => `Visual "${spec.title || 'scenario'}": situation: ${spec.situation} Options: ${spec.choices.map(c => c.text).join(' | ')}. ${sel >= 0 ? `The learner tried "${spec.choices[sel].text}" and saw: ${spec.choices[sel].reply} (${spec.choices[sel].good ? 'a good choice' : 'a weaker choice'}: ${spec.choices[sel].why})` : 'No option tried yet.'}` };
    }
  });

  /* ── worked example ── */
  V.register('worked', {
    validate(spec, bad) {
      if (!str(spec.problem, 180)) bad('worked.problem must be 1-180 characters');
      if (!str(spec.answer, 100)) bad('worked.answer must be 1-100 characters');
      if (!Array.isArray(spec.steps) || spec.steps.length < 2 || spec.steps.length > 6) return bad('worked.steps must have 2-6 items');
      spec.steps.forEach((s, i) => { if (!s || !str(s.text, 150) || (s.result !== undefined && !str(s.result, 60))) bad('step ' + i + ' needs text (max 150) and an optional short result'); });
    },
    render(root, spec) {
      const n = spec.steps.length + 2;
      return frameShell(root, spec, n, (stage, i) => {
        const shown = Math.max(0, Math.min(spec.steps.length, i)), last = i === n - 1;
        stage.innerHTML = `<div class="v2g-problem"><span>problem</span>${esc(spec.problem)}</div>
          <div class="v2g-ws">${spec.steps.slice(0, shown).map((s, k) => `<div class="v2g-wstep ${k === shown - 1 && !last ? 'now' : ''}"><i>${k + 1}</i><div>${esc(s.text)}${s.result ? `<code>${esc(s.result)}</code>` : ''}</div></div>`).join('')}</div>
          ${last ? `<div class="v2g-answer">✅ ${esc(spec.answer)}</div>` : ''}${caption(i === 0 ? 'Read the problem, then step through how it is solved.' : last ? 'Now try the same method on a new problem in the practice fight.' : `Step ${shown} of ${spec.steps.length}`, last ? 'good' : 'hint')}`;
      }, (i) => `Visual "${spec.title || 'worked example'}": problem: ${spec.problem}. Steps shown so far: ${spec.steps.slice(0, Math.max(0, Math.min(spec.steps.length, i))).map((s, k) => (k + 1) + '. ' + s.text + (s.result ? ' => ' + s.result : '')).join(' ') || 'none'}.${i === spec.steps.length + 1 ? ' Final answer: ' + spec.answer : ''}`);
    }
  });

  /* ── flip cards ── */
  V.register('cards', {
    validate(spec, bad) {
      if (!Array.isArray(spec.cards) || spec.cards.length < 3 || spec.cards.length > 8) return bad('cards.cards must have 3-8 items');
      spec.cards.forEach((c, i) => { if (!c || !str(c.front, 70) || !str(c.back, 170)) bad('card ' + i + ' needs front (max 70) and back (max 170)'); });
    },
    render(root, spec) {
      const flipped = new Set(); let alive = true;
      const draw = () => {
        if (!alive) return;
        root.innerHTML = `<div class="v2-card" data-vtype="cards">${spec.title ? `<div class="v2-title">${esc(spec.title)}</div>` : ''}
          <div class="v2g-cards">${spec.cards.map((c, i) => `<button class="v2g-card ${flipped.has(i) ? 'flip' : ''}" data-i="${i}" aria-label="${flipped.has(i) ? 'Show front' : 'Show answer'}"><span>${esc(flipped.has(i) ? c.back : c.front)}</span></button>`).join('')}</div>
          ${caption(flipped.size === spec.cards.length ? 'All flipped. Cover the answers and test yourself again.' : `Tap a card to flip it (${flipped.size} of ${spec.cards.length} seen). Try to answer in your head first.`, 'hint')}</div>`;
        root.querySelectorAll('.v2g-card').forEach(b => b.addEventListener('click', () => { const i = Number(b.dataset.i); flipped.has(i) ? flipped.delete(i) : flipped.add(i); draw(); }));
      };
      draw();
      return { destroy() { alive = false; }, describe: () => `Visual "${spec.title || 'flip cards'}": ${spec.cards.length} flip cards: ${spec.cards.map((c, i) => `[${c.front}${flipped.has(i) ? ' => ' + c.back : ''}]`).join(' ')}.` };
    }
  });

  V.GENERAL_TYPES = GENERAL_TYPES;
})();

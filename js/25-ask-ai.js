/* ═══════════════════════════════════════════════════════════ */
/*  25-ask-ai.js — "Ask the AI" during a lesson                  */
/*                                                              */
/*  A floating 🤖 button appears while a lesson screen is open.   */
/*  The question goes to Gemini together with:                    */
/*    · the whole lesson (what is being taught)                   */
/*    · where the learner is right now (idea 2 of 4, code line 3) */
/*    · what is on the visual right now (buckets, variables…)     */
/*    · the last few messages of the conversation                 */
/*  so "why did that go in bucket 2?" is understood.              */
/*                                                              */
/*  API  CF.Ask.set(root, { key, title, background, where, live }) */
/*       called by a lesson on every screen; `live()` returns the  */
/*       current visual's description (or '').                    */
/*       CF.Ask.buildPrompt(state, question, history) is pure.    */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.Ask = (() => {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SYSTEM = [
    'You are a friendly, concise tutor inside a study app. The learner is in the middle of a lesson and asks you a question.',
    'You are given the lesson content, exactly where the learner is right now, and what the interactive visual currently shows.',
    'Answer THEIR question using that context: point at the specific step, line, value or bucket on screen when it helps.',
    'If the question is off-topic, answer in one or two sentences and tie it back to the lesson. If you are not sure, say so instead of guessing.',
    'Plain text only (no markdown headers). Short code snippets are fine. Under 150 words unless asked for more.'
  ].join(' ');
  const clip = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n) + ' …' : t; };

  /* pure: everything the model gets */
  function buildPrompt(ctx, question, history) {
    const live = (() => { try { return ctx.live ? ctx.live() : ''; } catch (e) { return ''; } })();
    const hist = (history || []).slice(-6).map(m => (m.role === 'user' ? 'Learner: ' : 'Tutor: ') + clip(m.text, 600)).join('\n');
    return [
      `LESSON: ${ctx.title}`,
      'LESSON CONTENT (what is being taught):', clip(ctx.background, 3500),
      `LEARNER IS NOW AT: ${ctx.where}`,
      live ? 'WHAT THE VISUAL SHOWS RIGHT NOW: ' + clip(live, 1500) : '',
      hist ? 'CONVERSATION SO FAR:\n' + hist : '',
      `LEARNER'S QUESTION: ${clip(question, 600)}`
    ].filter(Boolean).join('\n\n');
  }

  /* ── UI (one fab + one panel, shared; bound to the lesson root that last called set) ── */
  let fab = null, panel = null, cur = null, histories = {}, timer = null, busy = false;
  const aiOn = () => !!(CF.AITutor && CF.AITutor.isConfigured && CF.AITutor.isConfigured());

  function ensure() {
    if (fab) return;
    fab = document.createElement('button');
    fab.className = 'ask-fab'; fab.type = 'button'; fab.hidden = true;
    fab.setAttribute('aria-label', 'Ask the AI tutor about this lesson');
    fab.innerHTML = '🤖<span>Ask</span>';
    fab.addEventListener('click', () => openPanel());
    document.body.appendChild(fab);
    timer = setInterval(sync, 500);
  }
  /* the button shows only while a lesson page (with its phase bar) is on screen */
  function sync() {
    if (!fab) return;
    const ok = !!(cur && cur.root && cur.root.isConnected && cur.root.offsetParent !== null && cur.root.querySelector('.lsn-phases'));
    fab.hidden = !ok;
    if (!ok && panel) closePanel();
  }
  function set(root, ctx) {
    ensure();
    const keyChanged = !cur || cur.key !== ctx.key;
    cur = Object.assign({ root }, ctx);
    if (keyChanged && panel) closePanel();
    sync();
    if (panel) updateWhere();
  }
  function clear() { cur = null; sync(); }

  function updateWhere() { const w = panel && panel.querySelector('.ask-where'); if (w && cur) w.textContent = '📍 ' + cur.where; }

  function openPanel() {
    if (!cur || panel) return;
    const hist = histories[cur.key] = histories[cur.key] || [];
    panel = document.createElement('div');
    panel.className = 'ask-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Ask the AI tutor');
    panel.innerHTML = `<div class="ask-head"><b>🤖 Ask about this lesson</b><button class="back-btn" id="askX" aria-label="Close">✕</button></div>
      <div class="ask-where"></div>
      <div class="ask-log" id="askLog" aria-live="polite"></div>
      <div class="ask-chips">${['Explain this simply', 'Why does that happen?', 'Give me another example', 'What mistake do people make here?'].map(t => `<button class="ask-chip" type="button">${esc(t)}</button>`).join('')}</div>
      <form class="ask-form" id="askForm"><input id="askIn" maxlength="400" autocomplete="off" placeholder="${aiOn() ? 'Ask anything about this step…' : 'Add your Gemini key in Settings to ask questions'}" ${aiOn() ? '' : 'disabled'}><button class="btn primary" id="askSend" ${aiOn() ? '' : 'disabled'}>Send</button></form>`;
    document.body.appendChild(panel);
    updateWhere();
    const log = panel.querySelector('#askLog');
    const bubble = (role, text) => { const d = document.createElement('div'); d.className = 'ask-msg ' + role; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
    if (!hist.length) bubble('ai', aiOn() ? 'Ask me anything. I can see which part of the lesson you are on and what the visual is showing right now.' : 'This needs your Gemini key. Add it in Settings → AI Tutor, then come back.');
    hist.forEach(m => bubble(m.role === 'user' ? 'me' : 'ai', m.text));
    panel.querySelector('#askX').addEventListener('click', closePanel);
    const ask = async (q) => {
      q = q.trim(); if (!q || busy || !aiOn() || !cur) return;
      busy = true; panel.querySelector('#askSend').disabled = true;
      const myCtx = cur;                                   // the position at the moment of asking
      bubble('me', q);
      const wait = bubble('ai', 'Thinking…'); wait.classList.add('wait');
      try {
        const prompt = buildPrompt(myCtx, q, hist);
        const a = await CF.AITutor.generate(prompt, { system: SYSTEM, temperature: 0.4, maxTokens: 1200 });
        hist.push({ role: 'user', text: q }, { role: 'ai', text: a });
        if (hist.length > 20) hist.splice(0, hist.length - 20);
        wait.classList.remove('wait'); wait.textContent = a;
      } catch (e) { wait.classList.remove('wait'); wait.classList.add('err'); wait.textContent = 'Could not get an answer: ' + e.message; }
      busy = false;
      const sb = panel && panel.querySelector('#askSend'); if (sb) sb.disabled = false;
      log.scrollTop = log.scrollHeight;
    };
    panel.querySelector('#askForm').addEventListener('submit', (e) => { e.preventDefault(); const i = panel.querySelector('#askIn'); const q = i.value; i.value = ''; ask(q); });
    panel.querySelectorAll('.ask-chip').forEach(b => b.addEventListener('click', () => ask(b.textContent)));
    document.body.classList.add('ask-open');
    setTimeout(() => { const i = panel && panel.querySelector('#askIn'); if (i && !i.disabled) i.focus(); }, 50);
  }
  function closePanel() { if (panel) { panel.remove(); panel = null; document.body.classList.remove('ask-open'); } }

  return { set, clear, buildPrompt, SYSTEM, _state: () => ({ cur, histories }), _open: openPanel };
})();

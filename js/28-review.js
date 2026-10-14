/* ═══════════════════════════════════════════════════════════ */
/*  28-review.js — spaced review for Easy Coding and AI lessons  */
/*                                                              */
/*  Every practice question you answer (in a fight or a review)  */
/*  updates a "card":  profile.review.cards[key] =               */
/*     { src:'easy'|'ai', ref, label, box 0-5, due, seen, c, w }  */
/*  Right → the card moves up a box and comes back later          */
/*  (1, 3, 7, 14, 30 days). Wrong → back to box 0, due in 4 hours.*/
/*  Same intervals as the Algorithms review (07-spaced.js).       */
/*  A review session rebuilds a FRESH variant of each due card     */
/*  (new numbers, shuffled lines, new blanks) and plays it as a    */
/*  fight. A weak-spot round does the same for cards you miss.     */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.Review = (() => {
  const S = CF.State;
  const HOUR = 3600 * 1000, DAY = 24 * HOUR;
  const INTERVALS = [4 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY];
  const SESSION_MAX = 8;

  function store() {
    const p = S.profile;
    if (!p.review || typeof p.review !== 'object') p.review = {};
    if (!p.review.cards || typeof p.review.cards !== 'object') p.review.cards = {};
    return p.review.cards;
  }
  const all = () => Object.keys(store()).map(k => Object.assign({ key: k }, store()[k]));

  /* called after every answered practice question that carries a card */
  function record(card, ok, now) {
    if (!card || !card.key) return;
    now = now || Date.now();
    const c = store()[card.key] || { src: card.src, ref: card.ref, label: card.label, box: 0, seen: 0, c: 0, w: 0 };
    c.src = card.src; c.ref = card.ref; c.label = card.label || c.label;
    c.seen++; c.last = now;
    if (ok) { c.c++; c.box = Math.min(5, c.box + 1); } else { c.w++; c.box = 0; }
    c.due = now + INTERVALS[c.box];
    store()[card.key] = c;
    try { S.save(); } catch (e) {}
  }

  const inScope = (c, f) => !f || f(c);
  const due = (f, now) => { now = now || Date.now(); return all().filter(c => c.due <= now && inScope(c, f)).sort((a, b) => a.due - b.due); };
  const weak = (f) => all().filter(c => c.w > 0 && c.box <= 1 && inScope(c, f)).sort((a, b) => (b.w / (b.c + b.w)) - (a.w / (a.c + a.w)) || b.w - a.w);
  const counts = (f, now) => ({ due: due(f, now).length, weak: weak(f).length, total: all().filter(c => inScope(c, f)).length });
  const forget = (key) => { delete store()[key]; try { S.save(); } catch (e) {} };

  function rebuild(card) {
    try { return card.src === 'ai' ? CF.AILessons.rebuild(card.ref) : CF.EasyLab.rebuild(card.ref); } catch (e) { return null; }
  }
  /* a list of questions for a session. Dead cards (deleted lessons) are dropped. At most one boss, played last. */
  function buildSession(mode, f, now) {
    const cards = mode === 'weak' ? weak(f) : due(f, now), qs = [];
    let boss = null;
    for (const c of cards) {
      if (qs.length >= SESSION_MAX - (boss ? 0 : 1)) break;
      const q = rebuild(c);
      if (!q) { forget(c.key); continue; }
      if (q.type === 'boss') { if (!boss) boss = q; continue; }
      qs.push(q);
    }
    if (boss) qs.push(boss);
    return qs;
  }

  /* play a session as a fight. h = { onExit } like any fight */
  function start(root, mode, f, h) {
    h = h || {};
    const spec = {
      id: 'review-' + mode,
      title: mode === 'weak' ? 'Weak-spot round' : 'Review',
      enemy: { name: mode === 'weak' ? 'Weak Spot Wraith' : 'Forgetting Fog', icon: '👻' },
      build: () => buildSession(mode, f),
      onWin: (info) => ({ xp: 10 + 4 * info.right, coins: 5 + info.right })
    };
    if (!buildSession(mode, f).length) { h.onExit && h.onExit(); return false; }
    CF.EasyLab.startCustomFight(root, spec, h);
    return true;
  }

  return { INTERVALS, record, due, weak, counts, buildSession, start, forget, all, _store: store };
})();

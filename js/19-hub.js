/* ═══════════════════════════════════════════════════════════ */
/*  19-hub.js — the home hub: Today · Learn · Practice · Progress */
/*                                                              */
/*  ONE structure for every subject:                            */
/*      Subject  →  Units  →  Items                             */
/*  A subject is registered with registerSubject({...}). Today it */
/*  is only "Algorithms & LeetCode" (lessons, campaign, easy     */
/*  coding, quiz bank). Adding a subject later = register it;    */
/*  Today / Learn / Progress pick it up automatically.           */
/*                                                              */
/*  Study log + settings live in profile.study:                  */
/*     { goalMin, log:{ 'YYYY-MM-DD': { subjectId: seconds } },  */
/*       game:true }                                             */
/*  Depends on: 01-state, 02-campaign, 03-questions, 07-spaced,  */
/*              15-lessons, 18-easy-coding. Loaded before shell. */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.Hub = (() => {
  const S = CF.State;
  const $ = (id) => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let actions = {};          // injected by the shell (startReview, startLevel, ...)
  let tab = 'today';
  let activeSubject = null;

  /* ── persisted study data ── */
  function study() {
    const p = S.profile;
    if (!p.study || typeof p.study !== 'object') p.study = {};
    const st = p.study;
    if (typeof st.goalMin !== 'number') st.goalMin = 30;
    if (!st.log || typeof st.log !== 'object') st.log = {};
    if (st.game === undefined) st.game = true;
    return st;
  }
  const dayKey = (d) => (d || new Date()).toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const secondsOn = (key) => {
    const day = study().log[key];
    return day ? Object.values(day).reduce((a, b) => a + b, 0) : 0;
  };
  const minutesOn = (key) => Math.round(secondsOn(key) / 60);

  /* ── study-time tracker: counts only real, active study ──
        • the tab is visible
        • you are inside Learn / Easy Coding / a fight (not browsing menus)
        • you touched the app in the last 3 minutes                   */
  const COUNTED = { 'screen-learn': 'algo', 'screen-easy': 'easy', 'screen-fight': 'algo' };
  let lastInput = Date.now();
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev =>
    window.addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => {
    if (document.hidden) return;
    if (Date.now() - lastInput > 180000) return;
    const active = document.querySelector('.screen.active');
    const subj = active && COUNTED[active.id];
    if (!subj) return;
    const st = study(), k = dayKey();
    st.log[k] = st.log[k] || {};
    st.log[k][subj] = (st.log[k][subj] || 0) + 10;
    try { S.save(); } catch (e) {}
  }, 10000);

  /* ═════════ SUBJECT REGISTRY ═════════ */
  const subjects = [];
  function registerSubject(sub) {
    if (!sub || !sub.id || subjects.some(s => s.id === sub.id)) return;
    subjects.push(sub);
    if (!activeSubject) activeSubject = sub.id;
  }
  const currentSubject = () => subjects.find(s => s.id === activeSubject) || subjects[0];

  /* ── mastery of one unit (pattern) from three kinds of evidence ──
        lesson finished · campaign levels cleared · quiz recall strength.
        "Mastered" needs recall evidence, so finishing a lesson alone
        can never read as mastered.                                    */
  function masteryOf(unitId) {
    const L = CF.Lessons, Q = CF.Questions;
    const lessonDone = L.isDone(unitId);
    const camp = CF.Campaign.levels.filter(l => l.pattern === unitId);
    const cleared = camp.filter(l => (S.profile.campaignLevels[l.id] || {}).cleared).length;
    const hist = S.profile.questionHistory || {};
    const strengths = Object.keys(hist).filter(qid => { const q = Q.getById(qid); return q && q.pattern === unitId; })
      .map(qid => (hist[qid].strength || 0) / 5);
    const recall = strengths.length ? strengths.reduce((a, b) => a + b, 0) / strengths.length : null;
    const campFrac = camp.length ? cleared / camp.length : null;

    let score = 0, weight = 0;
    score += (lessonDone ? 1 : 0) * 0.4; weight += 0.4;
    if (campFrac !== null) { score += campFrac * 0.3; weight += 0.3; }
    if (recall !== null) { score += recall * 0.3; weight += 0.3; }
    score = score / weight;
    if (recall === null) score = Math.min(score, 0.79);

    const started = lessonDone || cleared > 0 || strengths.length > 0;
    let state = 'new';
    if (started) state = score >= 0.8 && lessonDone ? 'mastered' : score >= 0.5 ? 'solid' : 'learning';
    return { score, state, lessonDone, cleared, campTotal: camp.length, recalled: strengths.length };
  }

  /* the practice fight that belongs to a lesson: its campaign levels, how many are cleared,
     and the next one to play. It opens the moment the lesson is done. */
  function fightOf(unitId) {
    const levels = CF.Campaign.levels.filter(l => l.pattern === unitId);
    if (!levels.length) return null;                       // e.g. Foundations has no fight
    const cleared = levels.filter(l => (S.profile.campaignLevels[l.id] || {}).cleared).length;
    const next = levels.find(l => !(S.profile.campaignLevels[l.id] || {}).cleared) || null;
    const open = CF.Lessons.isDone(unitId) && !!next && S.isLevelUnlocked(next.id);
    return {
      total: levels.length, cleared, next, open,
      tiers: levels.map(l => ({ tier: l.tier, done: !!(S.profile.campaignLevels[l.id] || {}).cleared })),
      sub: open ? `${cleared}/${levels.length} cleared · next: ${next.tier}` : next ? 'opens when the lesson is done' : 'all tiers cleared ✓',
      start: open ? () => actions.startLevel && actions.startLevel(next.id) : null
    };
  }

  /* ═════════ BUILT-IN SUBJECT: Algorithms & LeetCode ═════════ */
  registerSubject({
    id: 'algo',
    name: 'Algorithms & LeetCode',
    icon: '🧩',
    masteryNote: 'Mastered needs three things: the lesson done, campaign levels cleared, and quiz questions recalled correctly over time.',
    weak() {
      const flagged = CF.Spaced.findWeakSpots().slice(0, 5).map(w => ({ name: w.patternName, note: `${w.wrongCount} misses · ${w.accuracy}% accuracy`, go: () => actions.drill && actions.drill(w.patternId) }));
      if (flagged.length) return flagged;
      return this.units().filter(u => u.mastery.state === 'learning').sort((a, b) => a.mastery.score - b.mastery.score).slice(0, 3)
        .map(u => ({ name: u.name, note: 'still learning — worth a drill', go: () => actions.drill && actions.drill(u.id) }));
    },
    units() {
      return CF.Lessons.orderedLessons().map(ls => ({
        id: ls.id, name: ls.title, icon: ls.icon,
        locked: CF.Lessons.isLocked(ls.id),
        mastery: masteryOf(ls.id),
        fight: fightOf(ls.id),
        open: () => actions.openLesson && actions.openLesson(ls.id)
      }));
    },
    /* up to four concrete "do this next" items */
    next() {
      const out = [];
      const due = CF.Spaced.countDue();
      if (due > 0) out.push({ icon: '🔁', title: `Review ${due} due question${due > 1 ? 's' : ''}`, sub: 'Spaced repetition · about 3 min', cta: 'Review', go: () => actions.startReview && actions.startReview() });
      /* a finished lesson's fight comes BEFORE the next lesson */
      const openFights = CF.Lessons.orderedLessons().filter(l => { const f = fightOf(l.id); return CF.Lessons.isDone(l.id) && f && f.open; });
      /* a lesson whose fight has not been started yet beats continuing a fight already under way */
      const pend = openFights.find(l => fightOf(l.id).cleared === 0) || openFights[0];
      if (pend) {
        const f = fightOf(pend.id);
        out.push({ icon: '⚔️', title: `Fight: ${f.next.name || f.next.id}`, sub: `Practice for ${pend.title} · ${f.cleared}/${f.total} cleared`, cta: 'Fight', go: () => actions.startLevel && actions.startLevel(f.next.id) });
      }
      const les = CF.Lessons.nextOpen();
      if (les) out.push({ icon: les.icon || '🎓', title: `Learn: ${les.title}`, sub: `${les.minutes || '?'} min lesson`, cta: 'Start', go: () => actions.openLesson && actions.openLesson(les.id) });
      return out;
    },
    extraProgress() {
      const lp = CF.Campaign.levels;
      const clearedLv = lp.filter(l => (S.profile.campaignLevels[l.id] || {}).cleared).length;
      const lessons = CF.Lessons.LESSONS;
      return [
        { label: 'Lessons', done: lessons.filter(l => CF.Lessons.isDone(l.id)).length, total: lessons.length },
        { label: 'Campaign levels', done: clearedLv, total: lp.length }
      ];
    }
  });


  /* ── spaced review for code subjects (cards come from fight questions; see 28-review.js) ── */
  function reviewItems(sub, max) {
    if (!sub.reviewScope || !CF.Review) return [];
    const n = CF.Review.counts(sub.reviewScope), out = [];
    if (n.due > 0) out.push({ icon: '🔁', title: `Review ${n.due} due question${n.due > 1 ? 's' : ''}`, sub: `${sub.name} · fresh variants of what you practised`, cta: 'Review', go: () => actions.startCodeReview && actions.startCodeReview(sub.id, 'due') });
    return out.slice(0, max || 1);
  }

  /* ═════════ SUBJECT: Easy Coding (9 lessons, each followed by its practice fight) ═════════ */
  function easyMastery(id) {
    const L = CF.EasyLab, lessonDone = L.isDone(id), cleared = L.fightCleared(id), acc = L.accuracy(id);
    let score = (lessonDone ? 0.4 : 0) + (cleared ? 0.3 : 0), weight = 0.7;
    if (acc !== null) { score += acc * 0.3; weight += 0.3; }
    score = score / weight;
    if (acc === null) score = Math.min(score, 0.79);        // "Mastered" needs practice evidence
    const started = lessonDone || cleared || acc !== null;
    let state = 'new';
    if (started) state = score >= 0.8 && lessonDone && cleared ? 'mastered' : score >= 0.5 ? 'solid' : 'learning';
    return { score, state, lessonDone, cleared, recalled: acc === null ? 0 : 1 };
  }
  registerSubject({
    id: 'easy',
    name: 'Easy Coding',
    icon: '💻',
    reviewScope: (c) => c.src === 'easy',
    masteryNote: 'Mastered needs the lesson done, its practice fight cleared, and mostly correct practice answers.',
    weak() {
      const L = CF.EasyLab;
      const fromCards = CF.Review.weak(this.reviewScope).slice(0, 3).map(c => ({ name: c.label || 'Question', note: `missed ${c.w} of ${c.c + c.w} · weak-spot round`, go: () => actions.startCodeReview && actions.startCodeReview('easy', 'weak') }));
      const fromUnits = L.UNITS.map(u => ({ u, s: L.unitStats(u.id) })).filter(x => x.s.total >= 3 && x.s.acc < 0.75 && L.fightOpen(x.u.id))
        .sort((a, b) => a.s.acc - b.s.acc).slice(0, 5)
        .map(x => ({ name: x.u.title, note: `${Math.round(x.s.acc * 100)}% correct over ${x.s.total} answers`, go: () => actions.startEasyFight && actions.startEasyFight(x.u.id) }));
      return fromCards.concat(fromUnits).slice(0, 5);
    },
    units() {
      const L = CF.EasyLab;
      return L.UNITS.map(u => {
        const open = L.fightOpen(u.id), cleared = L.fightCleared(u.id), rec = L.fightRec(u.id);
        return {
          id: u.id, name: u.title, icon: u.icon, locked: L.isLocked(u.id), mastery: easyMastery(u.id),
          fight: {
            open, cleared: cleared ? 1 : 0, total: 1, tiers: [{ tier: 'fight', done: cleared }],
            sub: !open ? 'opens when the lesson is done' : cleared ? `cleared ${'⭐'.repeat(rec.stars || 1)} · fight again` : `${u.problems.length} problems · ends with a boss`,
            label: `${u.enemy.icon} ${u.enemy.name}`,
            start: open ? () => actions.startEasyFight && actions.startEasyFight(u.id) : null
          },
          open: () => actions.openEasyLesson && actions.openEasyLesson(u.id)
        };
      });
    },
    next() {
      const L = CF.EasyLab, out = reviewItems(this);
      const pend = L.UNITS.find(u => L.isDone(u.id) && !L.fightCleared(u.id));
      if (pend) out.push({ icon: pend.enemy.icon, title: `Fight: ${pend.enemy.name}`, sub: `Practice for ${pend.title} · ends with a boss`, cta: 'Fight', go: () => actions.startEasyFight && actions.startEasyFight(pend.id) });
      const les = L.nextOpen();
      if (les) out.push({ icon: les.icon, title: `Learn: ${les.title}`, sub: `Easy Coding · ${les.minutes} min lesson`, cta: 'Start', go: () => actions.openEasyLesson && actions.openEasyLesson(les.id) });
      return out;
    },
    extraProgress() {
      const L = CF.EasyLab, n = L.UNITS.length;
      return [
        { label: 'Lessons', done: L.UNITS.filter(u => L.isDone(u.id)).length, total: n },
        { label: 'Fights cleared', done: L.UNITS.filter(u => L.fightCleared(u.id)).length, total: n },
        { label: 'Problems solved', done: L.solvedCount(), total: CF.EasyCoding.PROBLEMS.length }
      ];
    }
  });

  /* ═════════ SUBJECT: AI Lessons + your own folders ═════════
     "AI Lessons" holds the sample and unfiled lessons. Every folder you create is its own
     subject (same tabs, same chips); lessons you make inside it belong to it.            */
  function makeAISubject(opts) {
    const folder = opts.folder || null;
    const lessons = () => CF.AILessons.all(folder);
    return {
      id: opts.id, name: opts.name, icon: opts.icon, folderId: folder,
      create: () => actions.openAICreate && actions.openAICreate(folder),
      reviewScope: (c) => { if (c.src !== 'ai') return false; const it = CF.AILessons.get(c.ref.lesson); return !!it && (it.folder || null) === folder; },
      emptyNote: folder ? 'This folder is empty. Create a lesson with AI and it will appear here.' : '',
      masteryNote: 'Mastered needs the lesson done and its fight cleared with at least 2 stars.',
      weak() { return CF.Review.weak(this.reviewScope).slice(0, 4).map(c => ({ name: c.label || 'Question', note: `missed ${c.w} of ${c.c + c.w} · weak-spot round`, go: () => actions.startCodeReview && actions.startCodeReview(opts.id, 'weak') })); },
      units() {
        const L = CF.AILessons;
        return lessons().map(it => {
          const done = L.isDone(it.id), cleared = L.fightCleared(it.id), rec = L.prog(it.id).fight;
          return {
            id: it.id, name: it.title + (it.builtin ? ' (built-in)' : ''), icon: it.icon, locked: false, mastery: L.mastery(it.id),
            fight: {
              open: done, cleared: cleared ? 1 : 0, total: 1, tiers: [{ tier: 'fight', done: cleared }],
              sub: !done ? 'opens when the lesson is done' : cleared ? `cleared ${'⭐'.repeat(rec.stars || 1)} · fight again` : 'quick checks, ordering, fill-in and a boss',
              label: '🐲 Guardian',
              start: done ? () => actions.startAIFight && actions.startAIFight(it.id) : null
            },
            open: () => actions.openAILesson && actions.openAILesson(it.id)
          };
        });
      },
      next() {
        const L = CF.AILessons, out = reviewItems(this), all = lessons();
        const pend = all.find(it => L.isDone(it.id) && !L.fightCleared(it.id));
        if (pend) out.push({ icon: '🐲', title: `Fight: ${pend.title}`, sub: 'AI lesson practice · ends with a boss', cta: 'Fight', go: () => actions.startAIFight && actions.startAIFight(pend.id) });
        const les = all.find(it => !L.isDone(it.id));
        if (les) out.push({ icon: les.icon, title: `Learn: ${les.title}`, sub: 'AI lesson with interactive visuals', cta: 'Start', go: () => actions.openAILesson && actions.openAILesson(les.id) });
        return out;
      },
      extraProgress() {
        const L = CF.AILessons, a = lessons();
        return [{ label: 'Lessons', done: a.filter(x => L.isDone(x.id)).length, total: a.length }, { label: 'Fights cleared', done: a.filter(x => L.fightCleared(x.id)).length, total: a.length }];
      }
    };
  }
  registerSubject(makeAISubject({ id: 'ai', name: 'AI Lessons', icon: '✨', folder: null }));

  /* ── user folders (saved in profile.folders = [{id,name,icon}]) ── */
  const folderList = () => { if (!Array.isArray(S.profile.folders)) S.profile.folders = []; return S.profile.folders; };
  const folderSubjectId = (fid) => 'f-' + fid;
  function registerFolder(f) { registerSubject(makeAISubject({ id: folderSubjectId(f.id), name: f.name, icon: f.icon || '📁', folder: f.id })); }
  function unregisterSubject(id) { const i = subjects.findIndex(x => x.id === id); if (i >= 0) subjects.splice(i, 1); if (activeSubject === id) activeSubject = 'ai'; }
  function cleanName(n) { return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 28); }
  function createFolder(name, icon) {
    name = cleanName(name); if (!name) return null;
    if (folderList().some(f => f.name.toLowerCase() === name.toLowerCase())) return { error: 'You already have a folder with that name.' };
    if (folderList().length >= 20) return { error: 'That is the maximum of 20 folders.' };
    const f = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 4), name, icon: icon || '📁' };
    folderList().push(f); S.save(); registerFolder(f); activeSubject = folderSubjectId(f.id); refresh();
    return f;
  }
  function renameFolder(fid, name) {
    name = cleanName(name); const f = folderList().find(x => x.id === fid); if (!f || !name) return false;
    f.name = name; S.save();
    const sub = subjects.find(x => x.id === folderSubjectId(fid)); if (sub) sub.name = name;
    refresh(); return true;
  }
  function deleteFolder(fid) {
    const i = folderList().findIndex(x => x.id === fid); if (i < 0) return;
    folderList().splice(i, 1);
    try { CF.AILessons.unfile(fid); } catch (e) {}
    S.save(); unregisterSubject(folderSubjectId(fid)); refresh();
  }
  /* small dialog: name + icon */
  function folderDialog(opts, done) {
    const old = document.getElementById('hubFolderDlg'); if (old) old.remove();
    const icons = ['📁', '📘', '🧮', '🧪', '🌍', '🎨', '💼', '🎵', '⚽', '🧠'];
    const d = document.createElement('div'); d.id = 'hubFolderDlg'; d.className = 'hub-dlg';
    let icon = opts.icon || icons[0];
    d.innerHTML = `<form class="hub-dlg-card" role="dialog" aria-label="${esc(opts.title)}"><h3>${esc(opts.title)}</h3>
      <input id="hubFName" maxlength="28" placeholder="Folder name, e.g. Math, Python, Interview prep" value="${esc(opts.name || '')}" autocomplete="off">
      ${opts.noIcon ? '' : `<div class="hub-dlg-icons">${icons.map(i => `<button type="button" class="hub-dlg-ic ${i === icon ? 'on' : ''}" data-ic="${i}" aria-label="icon ${i}">${i}</button>`).join('')}</div>`}
      <div class="hub-dlg-err" id="hubFErr" role="alert"></div>
      <div class="hub-dlg-act"><button type="button" class="btn ghost" id="hubFCancel">Cancel</button><button class="btn primary">${esc(opts.cta)}</button></div></form>`;
    document.body.appendChild(d);
    d.querySelectorAll('[data-ic]').forEach(b => b.addEventListener('click', () => { icon = b.dataset.ic; d.querySelectorAll('[data-ic]').forEach(x => x.classList.toggle('on', x === b)); }));
    d.querySelector('#hubFCancel').addEventListener('click', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d) d.remove(); });
    d.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const r = done(d.querySelector('#hubFName').value, icon);
      if (r && r.error) { d.querySelector('#hubFErr').textContent = r.error; return; }
      if (r === null || r === false) { d.querySelector('#hubFErr').textContent = 'Type a name first.'; return; }
      d.remove();
    });
    setTimeout(() => { const i = d.querySelector('#hubFName'); if (i) { i.focus(); i.select(); } }, 30);
  }
  const newFolderDialog = () => folderDialog({ title: 'New folder', cta: 'Create folder' }, (n, i) => createFolder(n, i));

  /* ═════════ PLACEHOLDER SUBJECTS (dummy folders — no content yet) ═════════
     Same Subject → Units shape as the real one, so the subject picker, Learn path
     and Progress already work. To make one real later: drop `placeholder`, give
     units() real mastery, and add next()/extraProgress(). */
  function placeholderSubject(id, name, icon, unitNames) {
    registerSubject({
      id, name, icon, placeholder: true,
      units: () => unitNames.map((n, i) => ({
        id: id + '-' + i, name: n, icon: '📁', locked: false, placeholder: true,
        mastery: { score: 0, state: 'new' }, open: () => {}
      }))
    });
  }
  placeholderSubject('math', 'Math', '➗', ['Arithmetic', 'Algebra', 'Geometry', 'Calculus']);
  placeholderSubject('english', 'English', '📖', ['Grammar', 'Vocabulary', 'Writing', 'Speaking']);

  /* ═════════ TABS ═════════ */
  const PANELS = { today: 'hubToday', learn: 'hubLearn', practice: 'hubPractice', progress: 'hubProgress' };
  function setTab(t) {
    tab = PANELS[t] ? t : 'today';
    Object.entries(PANELS).forEach(([k, id]) => { const el = $(id); if (el) el.hidden = k !== tab; });
    document.querySelectorAll('.hub-tab').forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    refresh();
  }

  function subjectChips() {
    if (subjects.length < 2) return '';   // one subject → no picker, no clutter
    return `<div class="hub-chips">${subjects.map(s => `<button class="hub-chip ${s.id === activeSubject ? 'on' : ''}" data-subj="${s.id}">${esc(s.icon)} ${esc(s.name)}</button>`).join('')}<button class="hub-chip hub-chip-add" data-newfolder="1" aria-label="Create a new folder">＋ Folder</button></div>`;
  }
  function wireChips(root) {
    root.querySelectorAll('[data-subj]').forEach(b => b.addEventListener('click', () => { activeSubject = b.dataset.subj; refresh(); }));
    root.querySelectorAll('[data-newfolder]').forEach(b => b.addEventListener('click', newFolderDialog));
  }

  /* ═════════ TODAY ═════════ */
  function renderToday() {
    const root = $('hubToday'); if (!root) return;
    const st = study(), mins = minutesOn(dayKey()), goal = st.goalMin;
    const pct = Math.min(1, mins / goal);
    const R = 38, C = 2 * Math.PI * R;
    const streak = S.profile.streak ? S.profile.streak.current : 0;
    const items = subjects.flatMap(s => (s.next ? s.next().slice(0, 2) : [])).slice(0, 5);

    root.innerHTML = `
      <div class="hub-goal">
        <svg viewBox="0 0 100 100" class="hub-ring" aria-hidden="true">
          <circle cx="50" cy="50" r="${R}" class="hub-ring-bg"/>
          <circle cx="50" cy="50" r="${R}" class="hub-ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 50 50)"/>
          <text x="50" y="55" text-anchor="middle" class="hub-ring-txt">${Math.round(pct * 100)}%</text>
        </svg>
        <div class="hub-goal-body">
          <div class="hub-goal-big">${mins} <span>/ ${goal} min today</span></div>
          <div class="hub-goal-sub">${mins >= goal ? '🎉 Goal reached — anything more is a bonus.' : `${goal - mins} min to go`}${streak ? ` · 🔥 ${streak}-day streak` : ''}</div>
          <div class="hub-goal-set" role="group" aria-label="Daily goal">${[15, 30, 45, 60].map(g => `<button class="hub-mini ${g === goal ? 'on' : ''}" data-goal="${g}">${g}m</button>`).join('')}</div>
        </div>
      </div>
      <div class="hub-sec">Do next</div>
      ${items.length ? items.map((it, i) => `
        <div class="hub-item">
          <span class="hub-item-ic">${esc(it.icon)}</span>
          <div class="hub-item-body"><div class="hub-item-t">${esc(it.title)}</div><div class="hub-item-s">${esc(it.sub)}</div></div>
          <button class="btn ${i === 0 ? 'primary' : 'ghost'}" data-next="${i}">${esc(it.cta)} ▶</button>
        </div>`).join('') : '<div class="hub-empty">You are all caught up. 🎉</div>'}`;
    root.querySelectorAll('[data-goal]').forEach(b => b.addEventListener('click', () => { study().goalMin = Number(b.dataset.goal); S.save(); renderToday(); }));
    root.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => items[Number(b.dataset.next)].go()));
  }

  /* ═════════ LEARN (unit path) ═════════ */
  const STATE_LABEL = { new: 'New', learning: 'Learning', solid: 'Solid', mastered: 'Mastered' };
  function renderLearn() {
    const root = $('hubLearnPath'); if (!root) return;
    const sub = currentSubject();
    const units = sub && sub.units ? sub.units() : [];
    const allBtn = $('btnLearn'); if (allBtn) allBtn.hidden = !(sub && sub.id === 'algo'); /* the lesson list is Algorithms-only */
    const bankBtn = $('btnEasyBank'); if (bankBtn) bankBtn.hidden = !(sub && sub.id === 'easy'); /* the 50-problem reference list */
    root.innerHTML = `${subjectChips()}
      <div class="hub-sec">${sub ? esc(sub.icon + ' ' + sub.name) : ''} · your path</div>
      ${sub && sub.folderId ? `<div class="hub-foldertools"><button class="btn ghost" id="hubRename">✏️ Rename</button><button class="btn ghost" id="hubDelFolder">🗑 Delete folder</button></div>` : ''}
      ${sub && sub.create ? '<button class="btn primary hub-create" id="hubCreate">✨ Create a lesson with AI</button>' : ''}
      ${sub && sub.emptyNote && !units.length ? `<div class="hub-note">${esc(sub.emptyNote)}</div>` : ''}
      ${units.map(u => `
        <button class="hub-unit ${u.locked || u.placeholder ? 'locked' : ''}" data-unit="${esc(u.id)}" ${u.locked || u.placeholder ? 'aria-disabled="true"' : ''}>
          <span class="hub-unit-ic">${u.locked ? '🔒' : esc(u.icon || '📘')}</span>
          <span class="hub-unit-body">
            <span class="hub-unit-name">${esc(u.name)}</span>
            <span class="hub-bar"><i style="width:${Math.round(u.mastery.score * 100)}%"></i></span>
          </span>
          <span class="hub-state s-${u.mastery.state}">${u.placeholder ? 'Empty' : u.locked ? 'Locked' : STATE_LABEL[u.mastery.state]}</span>
        </button>
        ${u.fight ? `<div class="hub-fight ${u.fight.open ? '' : 'locked'}">
          <span class="hub-fight-ic">⚔️</span>
          <span class="hub-fight-t">${esc(u.fight.label || 'Practice fight')}<small>${esc(u.fight.sub)}</small></span>
          <span class="hub-pips" aria-hidden="true">${u.fight.tiers.map(t => `<i class="${t.done ? 'on' : ''}"></i>`).join('')}</span>
          ${u.fight.start ? `<button class="btn ghost" data-fight="${esc(u.id)}">Fight ▶</button>` : ''}
        </div>` : ''}`).join('')}
      ${sub && sub.placeholder ? '<div class="hub-note">This subject is a placeholder folder. Lessons and practice for it have not been added yet.</div>' : ''}`;
    wireChips(root);
    const cr = root.querySelector('#hubCreate'); if (cr) cr.addEventListener('click', () => sub.create());
    const rn = root.querySelector('#hubRename'); if (rn) rn.addEventListener('click', () => folderDialog({ title: 'Rename folder', cta: 'Save', name: sub.name, noIcon: true }, (n) => renameFolder(sub.folderId, n)));
    const df = root.querySelector('#hubDelFolder'); if (df) df.addEventListener('click', () => { if (confirm(`Delete the folder "${sub.name}"? Its lessons are kept and move to AI Lessons.`)) deleteFolder(sub.folderId); });
    root.querySelectorAll('[data-fight]').forEach(b => b.addEventListener('click', () => {
      const u = units.find(x => x.id === b.dataset.fight);
      if (u && u.fight && u.fight.start) u.fight.start();
    }));
    root.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => {
      const u = units.find(x => x.id === b.dataset.unit);
      if (!u) return;
      if (u.locked || u.placeholder) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); return; }
      u.open();
    }));
  }

  /* ═════════ PRACTICE ═════════ */
  function renderPractice() {
    const sub = currentSubject();
    const chips = $('hubPracticeChips');
    if (chips) { chips.innerHTML = subjectChips(); wireChips(chips); }
    const algo = $('hubPracticeAlgo'), easy = $('hubPracticeEasy'), empty = $('hubPracticeEmpty');
    if (algo) algo.hidden = !(sub && sub.id === 'algo');
    if (easy) easy.hidden = !(sub && (sub.id === 'easy' || sub.id === 'ai'));
    if (empty) {
      empty.hidden = !(sub && sub.placeholder);
      empty.textContent = sub && sub.placeholder ? `${sub.icon} ${sub.name} has no practice yet.` : '';
    }
    if (sub && sub.id === 'algo') {
      const root = $('hubPracticeDue'); if (!root) return;
      const due = CF.Spaced.countDue();
      root.innerHTML = due > 0
        ? `<div class="hub-item"><span class="hub-item-ic">🔁</span><div class="hub-item-body"><div class="hub-item-t">${due} question${due > 1 ? 's' : ''} due for review</div><div class="hub-item-s">Reviewing on time is what makes it stick</div></div><button class="btn primary" id="hubReviewGo">Review ▶</button></div>`
        : `<div class="hub-empty small">Nothing due for review right now.</div>`;
      const go = $('hubReviewGo'); if (go) go.addEventListener('click', () => actions.startReview && actions.startReview());
    } else if (sub && (sub.id === 'easy' || sub.id === 'ai') && easy) {
      const units = sub.units();
      const rc = CF.Review.counts(sub.reviewScope);
      const reviewHTML = `<div class="hub-sec">Review</div>
        ${rc.total ? `<div class="hub-item ${rc.due ? '' : 'dim'}"><span class="hub-item-ic">🔁</span><div class="hub-item-body"><div class="hub-item-t">${rc.due ? `${rc.due} question${rc.due > 1 ? 's' : ''} due` : 'Nothing due right now'}</div><div class="hub-item-s">${rc.total} question${rc.total > 1 ? 's' : ''} in your review pile · each comes back as a fresh variant</div></div>${rc.due ? '<button class="btn primary" data-review="due">Review ▶</button>' : ''}</div>
          ${rc.weak ? `<div class="hub-item"><span class="hub-item-ic">🎯</span><div class="hub-item-body"><div class="hub-item-t">Weak-spot round</div><div class="hub-item-s">${rc.weak} question${rc.weak > 1 ? 's' : ''} you keep missing</div></div><button class="btn ghost" data-review="weak">Practise ▶</button></div>` : ''}`
        : '<div class="hub-note">Questions you answer in fights appear here and come back on a schedule (4 hours after a miss, then 1, 3, 7, 14 and 30 days after correct answers).</div>'}`;
      easy.innerHTML = reviewHTML + `<div class="hub-sec">Practice fights</div>
        <div class="hub-note">Each fight has 3 complexity questions, 1 predict-the-output question, 2 line-ordering puzzles, 2 fill-in-the-words puzzles and a boss where you write the code. A fight opens when its lesson is done.</div>
        ${units.map(u => `
        <div class="hub-item ${u.fight.open ? '' : 'dim'}">
          <span class="hub-item-ic">${u.fight.open ? esc(u.fight.label.split(' ')[0]) : '🔒'}</span>
          <div class="hub-item-body"><div class="hub-item-t">${esc(u.name)}</div><div class="hub-item-s">${esc(u.fight.sub)}</div></div>
          ${u.fight.start ? `<button class="btn ${u.fight.cleared ? 'ghost' : 'primary'}" data-efight="${esc(u.id)}">Fight ▶</button>` : ''}
        </div>`).join('')}`;
      easy.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => actions.startCodeReview && actions.startCodeReview(sub.id, b.dataset.review)));
      easy.querySelectorAll('[data-efight]').forEach(b => b.addEventListener('click', () => {
        const u = units.find(x => x.id === b.dataset.efight); if (u && u.fight.start) u.fight.start();
      }));
    }
  }

  /* ═════════ PROGRESS ═════════ */
  function heatmapHTML() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const dow = (now.getDay() + 6) % 7;                   // Mon = 0
    const monday = new Date(now); monday.setDate(now.getDate() - dow);
    const start = new Date(monday); start.setDate(monday.getDate() - 11 * 7);
    let cells = '';
    for (let w = 0; w < 12; w++) for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setDate(start.getDate() + w * 7 + d);
      const future = day > now, m = future ? 0 : minutesOn(dayKey(day));
      const lv = future ? 'f' : m === 0 ? 0 : m < 10 ? 1 : m < 20 ? 2 : m < 40 ? 3 : 4;
      cells += `<i class="hm l${lv}" title="${dayKey(day)} · ${m} min"></i>`;
    }
    return `<div class="hub-heat" role="img" aria-label="Study minutes per day, last 12 weeks">${cells}</div>`;
  }
  function weekMinutes(offsetWeeks) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - offsetWeeks * 7);
    let t = 0;
    for (let d = 0; d < 7; d++) { const day = new Date(monday); day.setDate(monday.getDate() + d); if (day <= now) t += minutesOn(dayKey(day)); }
    return t;
  }

  function renderProgress() {
    const root = $('hubProgress'); if (!root) return;
    const sub = currentSubject();
    const units = sub && sub.units ? sub.units() : [];
    const extra = sub && sub.extraProgress ? sub.extraProgress() : [];
    if (sub && sub.placeholder) {
      root.innerHTML = `${subjectChips()}<div class="hub-empty">${esc(sub.icon)} <b>${esc(sub.name)}</b> has no content yet, so there is nothing to track.<br>Progress, mastery and weak spots will appear here once lessons are added.</div>`;
      wireChips(root);
      return;
    }
    const counts = { new: 0, learning: 0, solid: 0, mastered: 0 };
    units.forEach(u => { counts[u.mastery.state]++; });

    /* weak spots come from the subject itself (Algorithms: quiz misses; Easy Coding: low practice accuracy) */
    const weak = sub && sub.weak ? sub.weak() : [];
    const thisW = weekMinutes(0), lastW = weekMinutes(1);

    root.innerHTML = `${subjectChips()}
      <div class="hub-sec">Overview</div>
      <div class="hub-stats">${extra.map(x => `
        <div class="hub-stat"><div class="hub-stat-n">${x.done}<span>/${x.total}</span></div><div class="hub-stat-l">${esc(x.label)}</div>
          <div class="hub-bar"><i style="width:${x.total ? Math.round(x.done / x.total * 100) : 0}%"></i></div></div>`).join('')}</div>

      <div class="hub-sec">Mastery by unit</div>
      <div class="hub-legend">${['new', 'learning', 'solid', 'mastered'].map(k => `<span class="hub-state s-${k}">${STATE_LABEL[k]} ${counts[k]}</span>`).join('')}</div>
      ${units.map(u => `
        <div class="hub-row"><span class="hub-row-name">${esc(u.icon || '')} ${esc(u.name)}</span>
          <span class="hub-bar"><i style="width:${Math.round(u.mastery.score * 100)}%"></i></span>
          <span class="hub-state s-${u.mastery.state}">${STATE_LABEL[u.mastery.state]}</span></div>`).join('')}
      <div class="hub-note">${esc((sub && sub.masteryNote) || '')}</div>

      <div class="hub-sec">Study time</div>
      ${heatmapHTML()}
      <div class="hub-week"><b>${thisW}</b> min this week · ${lastW} min last week</div>

      <div class="hub-sec">Weak spots</div>
      ${weak.length ? weak.map((w, i) => `
        <div class="hub-item"><span class="hub-item-ic">🎯</span>
          <div class="hub-item-body"><div class="hub-item-t">${esc(w.name)}</div><div class="hub-item-s">${esc(w.note)}</div></div>
          <button class="btn ghost" data-drill="${i}">Drill ▶</button></div>`).join('')
        : '<div class="hub-empty small">No weak spots yet. Keep practising and any topic you keep missing will show up here.</div>'}`;
    wireChips(root);
    root.querySelectorAll('[data-drill]').forEach(b => b.addEventListener('click', () => { const w = weak[Number(b.dataset.drill)]; if (w && w.go) w.go(); }));
  }

  /* ═════════ MORE MENU + GAME LAYER ═════════ */
  function applyGameLayer() { document.body.classList.toggle('no-game', study().game === false); }
  function wireMore() {
    const btn = $('hubMore'), menu = $('hubMoreMenu'), tog = $('hubGameToggle');
    if (btn && menu) {
      btn.addEventListener('click', (e) => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
      menu.addEventListener('click', (e) => { if (e.target.closest('.menu-btn')) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
      document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    }
    if (tog) {
      tog.checked = study().game !== false;
      tog.addEventListener('change', () => { study().game = tog.checked; S.save(); applyGameLayer(); });
    }
  }

  function refresh() {
    try {
      const streak = $('hubStreak');
      if (streak) streak.textContent = S.profile.streak && S.profile.streak.current ? `🔥 ${S.profile.streak.current}` : '';
      if (tab === 'today') renderToday();
      else if (tab === 'learn') renderLearn();
      else if (tab === 'practice') renderPractice();
      else if (tab === 'progress') renderProgress();
    } catch (e) { console.error('[hub]', e); }
  }

  function init(a) {
    actions = a || {};
    folderList().forEach(registerFolder);
    document.querySelectorAll('.hub-tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    wireMore();
    applyGameLayer();
    setTab(tab);
  }

  /* used by Cinema: today's progress and the single best "what next" item */
  const todayMinutes = () => minutesOn(dayKey());
  const goalMinutes = () => study().goalMin;
  const nextItem = () => { for (const s of subjects) { const n = s.next ? s.next() : []; if (n.length) return n[0]; } return null; };
  function setSubject(id) { if (subjects.some(x => x.id === id)) activeSubject = id; }
  const reviewScopeOf = (id) => { const s = subjects.find(x => x.id === id); return s && s.reviewScope || null; };
  return { init, refresh, registerSubject, reviewScopeOf, createFolder, renameFolder, deleteFolder, folderSubjectId, setTab, setSubject, masteryOf, study, todayMinutes, goalMinutes, nextItem };
})();

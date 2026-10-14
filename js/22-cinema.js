/* ═══════════════════════════════════════════════════════════ */
/*  22-cinema.js — 🎬 Cinema: spend coins on a YouTube video     */
/*                                                              */
/*  Search YouTube → every result shows its length and a coin    */
/*  price (minutes × rate). "Buy ticket" charges the coins and   */
/*  the button becomes "Play". The player closes by itself the   */
/*  moment the video ends, the ticket is used up, and a          */
/*  "welcome back" screen sends you on to your next lesson.      */
/*                                                              */
/*  Optional rules (Settings tab):                               */
/*    • require today's study goal before buying / playing       */
/*    • daily Cinema limit in minutes                            */
/*  Needs a free YouTube Data API v3 key (Settings tab); the key */
/*  stays in this browser only. Data: profile.cinema.            */
/*  Depends on: 01-state, 09-music (optional), 19-hub.           */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.Cinema = (() => {
  const S = CF.State;
  const KEY_STORAGE = 'cf_youtube_key';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const decode = (s) => { const t = document.createElement('textarea'); t.innerHTML = String(s || ''); return t.value; };  // API titles contain &amp; etc.

  /* ── data ── */
  const DEFAULTS = { rate: 8, maxMin: 90, requireGoal: false, dailyLimit: 0 };
  function data() {
    const p = S.profile;
    if (!p.cinema || typeof p.cinema !== 'object') p.cinema = {};
    const c = p.cinema;
    if (!c.tickets || typeof c.tickets !== 'object') c.tickets = {};
    c.settings = Object.assign({}, DEFAULTS, c.settings || {});
    return c;
  }
  const settings = () => data().settings;
  const dayKey = (d) => (d || new Date()).toLocaleDateString('en-CA');

  /* API key lives in localStorage (not in the exportable profile), with an in-memory fallback */
  let memKey = '';
  const getKey = () => { let v = ''; try { v = localStorage.getItem(KEY_STORAGE) || ''; } catch (e) {} return (v || memKey).trim(); };
  const setKey = (k) => { memKey = String(k || '').trim(); try { localStorage.setItem(KEY_STORAGE, memKey); } catch (e) {} };

  /* ── price & time helpers ── */
  function parseDuration(iso) {                       // "PT1H2M3S" → seconds
    const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
    if (!m) return 0;
    return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
  }
  const fmt = (sec) => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
  const priceFor = (sec) => Math.max(10, Math.ceil(sec / 60 * settings().rate));
  const tooLong = (sec) => sec > settings().maxMin * 60;

  /* ── rules: study-goal gate + daily limit ── */
  function gate() {
    if (!settings().requireGoal || !CF.Hub) return { locked: false };
    const done = CF.Hub.todayMinutes(), goal = CF.Hub.goalMinutes();
    return done >= goal ? { locked: false } : { locked: true, done, goal, need: goal - done };
  }
  function boughtTodaySec() {
    const k = dayKey();
    return Object.values(data().tickets).filter(t => dayKey(new Date(t.boughtAt)) === k).reduce((a, t) => a + t.seconds, 0);
  }
  function limitCheck(sec) {
    const lim = Number(settings().dailyLimit) || 0;
    if (!lim) return { ok: true };
    const left = lim * 60 - boughtTodaySec();
    return left >= sec ? { ok: true, left } : { ok: false, left: Math.max(0, left) };
  }

  /* ── YouTube Data API ── */
  class ApiError extends Error {}
  function explain(status, body) {
    const reason = (body && body.error && body.error.errors && body.error.errors[0] && body.error.errors[0].reason) || '';
    const msg = (body && body.error && body.error.message) || '';
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') return 'Today\'s free YouTube search quota is used up. It resets daily, so try again tomorrow.';
    if (reason === 'keyInvalid' || /API key not valid/i.test(msg)) return 'YouTube rejected the API key. Check it in Settings.';
    if (reason === 'accessNotConfigured' || /has not been used|disabled/i.test(msg)) return 'Turn on "YouTube Data API v3" for this key in Google Cloud, then try again.';
    if (status === 403) return 'YouTube refused the request (403). Check the key and its restrictions in Settings.';
    return 'YouTube returned an error (' + status + ').';
  }
  async function yt(path, params) {
    const url = 'https://www.googleapis.com/youtube/v3/' + path + '?' + new URLSearchParams(Object.assign({}, params, { key: getKey() }));
    let resp;
    try { resp = await fetch(url); } catch (e) { throw new ApiError('Cannot reach YouTube. Check your internet connection.'); }
    let body = null; try { body = await resp.json(); } catch (e) {}
    if (!resp.ok) throw new ApiError(explain(resp.status, body));
    return body || {};
  }
  async function searchVideos(q) {
    const found = await yt('search', { part: 'snippet', type: 'video', maxResults: 15, videoEmbeddable: 'true', safeSearch: 'moderate', q });
    const ids = (found.items || []).map(i => i.id && i.id.videoId).filter(Boolean);
    if (!ids.length) return [];
    const det = await yt('videos', { part: 'contentDetails,snippet,status', id: ids.join(',') });
    return (det.items || []).map(v => ({
      id: v.id, title: decode(v.snippet.title), channel: decode(v.snippet.channelTitle),
      thumb: (v.snippet.thumbnails.medium || v.snippet.thumbnails.default || {}).url || '',
      seconds: parseDuration(v.contentDetails.duration),
      embeddable: !(v.status && v.status.embeddable === false),
      live: !!v.snippet.liveBroadcastContent && v.snippet.liveBroadcastContent !== 'none'
    })).filter(v => v.embeddable && !v.live && v.seconds > 0);
  }

  /* ── tickets ── */
  const ticketOf = (id) => data().tickets[id] || null;
  function buy(v) {
    const g = gate(); if (g.locked) return { ok: false, msg: `Cinema opens after your study goal: ${g.need} more minute${g.need === 1 ? '' : 's'} to go.` };
    if (tooLong(v.seconds)) return { ok: false, msg: `Too long: the limit is ${settings().maxMin} minutes per video.` };
    const lim = limitCheck(v.seconds); if (!lim.ok) return { ok: false, msg: `Daily Cinema limit reached (${settings().dailyLimit} min). ${Math.floor(lim.left / 60)} min left today.` };
    if (ticketOf(v.id)) return { ok: false, msg: 'You already have a ticket for this video.' };
    const price = priceFor(v.seconds);
    if (S.profile.coins < price) return { ok: false, msg: `You need ${price - S.profile.coins} more coins.` };
    S.addCoins(-price);
    data().tickets[v.id] = { id: v.id, title: v.title, channel: v.channel, thumb: v.thumb, seconds: v.seconds, price, boughtAt: Date.now(), status: 'ready', pos: 0 };
    S.save();
    return { ok: true, price };
  }
  function refund(id) {
    const t = ticketOf(id); if (!t) return;
    S.addCoins(t.price); delete data().tickets[id]; S.save();
  }

  /* ═══════════ PLAYER ═══════════ */
  let ytReady = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (ytReady) return ytReady;
    ytReady = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { try { prev && prev(); } catch (e) {} resolve(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { ytReady = null; reject(new Error('Could not load the YouTube player. Check your internet connection.')); };
      document.head.appendChild(s);
      setTimeout(() => { if (!(window.YT && window.YT.Player)) { ytReady = null; reject(new Error('The YouTube player took too long to load.')); } }, 15000);
    });
    return ytReady;
  }
  const ERRORS = {
    2: 'YouTube said this video link is invalid.',
    5: 'The video could not be played in this player.',
    100: 'This video was removed or is private.',
    101: 'The owner does not allow this video to be played outside YouTube.',
    150: 'The owner does not allow this video to be played outside YouTube.',
    153: 'YouTube refused to play inside this page. This happens when the app is opened as a file. Run "python3 -m http.server 8000" in the app folder and open http://localhost:8000 instead.'
  };

  function closeOverlay(ov) { try { ov.remove(); } catch (e) {} document.body.classList.remove('cin-open'); }

  function play(id, h, refresh) {
    const t = ticketOf(id);
    if (!t || t.status !== 'ready') return;
    const g = gate(); if (g.locked) { toast(`Study ${g.need} more minute${g.need === 1 ? '' : 's'} to unlock Cinema.`); return; }
    try { CF.Music && CF.Music.stop(); CF.Narrator && CF.Narrator.stop(); } catch (e) {}
    const ov = document.createElement('div');
    ov.className = 'cin-player'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Now playing: ' + t.title);
    ov.innerHTML = `<div class="cin-player-bar"><div class="cin-player-t">${esc(t.title)}</div><button class="btn ghost" id="cinClose">✕ Close</button></div>
      <div class="cin-player-stage"><div id="cinYT"></div><div class="cin-player-msg" id="cinMsg">Loading the player…</div></div>
      <div class="cin-player-note">The video closes by itself when it ends, and the ticket is used up. Close early to resume later.</div>`;
    document.body.appendChild(ov); document.body.classList.add('cin-open');
    const msg = ov.querySelector('#cinMsg');
    let player = null, started = false, over = false, poll = null, watchdog = null;

    const stop = () => { clearInterval(poll); clearTimeout(watchdog); try { player && player.destroy(); } catch (e) {} player = null; };
    const leave = () => { stop(); closeOverlay(ov); try { CF.Music && CF.Music.play('menu'); } catch (e) {} };
    const savePos = () => { try { if (player && player.getCurrentTime) { t.pos = Math.max(0, Math.floor(player.getCurrentTime())); S.save(); } } catch (e) {} };

    ov.querySelector('#cinClose').addEventListener('click', () => { if (over) return; savePos(); leave(); refresh && refresh(); });

    const ended = () => {
      if (over) return; over = true;
      stop();                                           // the video disappears instantly: no replay
      t.status = 'watched'; t.watchedAt = Date.now(); t.pos = 0; S.save();
      welcomeBack(ov, t, h, refresh);
    };
    const failed = (code) => {
      if (over) return; over = true; stop();
      const why = ERRORS[code] || 'The video could not be played.';
      let line = '';
      if (!started) { refund(id); line = ' Your coins were refunded.'; }
      ov.querySelector('.cin-player-stage').innerHTML = `<div class="cin-player-msg show">⚠️ ${esc(why)}${esc(line)}</div>`;
      ov.querySelector('#cinClose').textContent = 'Back';
      ov.querySelector('#cinClose').onclick = () => { closeOverlay(ov); try { CF.Music && CF.Music.play('menu'); } catch (e) {} refresh && refresh(); };
    };

    loadYT().then(() => {
      if (!ov.isConnected) return;
      const vars = { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, start: Math.floor(t.pos || 0) };
      if (/^https?:$/.test(location.protocol)) vars.origin = location.origin;
      player = new YT.Player('cinYT', {
        videoId: id, width: '100%', height: '100%', playerVars: vars,
        events: {
          onReady: () => { msg.classList.remove('show'); watchdog = setTimeout(() => { if (!started && !over) { msg.textContent = 'Still loading… if nothing starts, press Close. You keep your ticket.'; msg.classList.add('show'); } }, 15000); },
          onStateChange: (e) => {
            if (e.data === 1 || e.data === 3) { started = true; msg.classList.remove('show'); }
            if (e.data === 0) ended();
          },
          onError: (e) => failed(e.data)
        }
      });
      poll = setInterval(() => { savePos(); }, 5000);
    }).catch(err => {
      if (over) return; over = true;
      ov.querySelector('.cin-player-stage').innerHTML = `<div class="cin-player-msg show">⚠️ ${esc(err.message)} You keep your ticket.</div>`;
      ov.querySelector('#cinClose').textContent = 'Back';
      ov.querySelector('#cinClose').onclick = () => { closeOverlay(ov); try { CF.Music && CF.Music.play('menu'); } catch (e) {} refresh && refresh(); };
    });
  }

  /* ── welcome back: shown right after the video closes ── */
  function welcomeBack(ov, t, h, refresh) {
    let next = null;
    try { next = CF.Hub && CF.Hub.nextItem(); } catch (e) {}
    const done = CF.Hub ? CF.Hub.todayMinutes() : 0, goal = CF.Hub ? CF.Hub.goalMinutes() : 0;
    ov.className = 'cin-player cin-welcome';
    ov.innerHTML = `<div class="cin-welcome-card">
      <div class="cin-welcome-emoji">👋</div>
      <h2>Welcome back!</h2>
      <p>You watched <b>${esc(t.title)}</b> (${fmt(t.seconds)}). Hope that was a good break.</p>
      <p class="cin-welcome-goal">Today's study: <b>${done}</b> / ${goal} min${done >= goal ? ' · goal reached 🎉' : ''}</p>
      <div class="cin-welcome-actions">
        <button class="btn primary" id="cinNext">${next ? 'Next ▶ ' + esc(next.title) : 'Back to Today ▶'}</button>
        <button class="btn ghost" id="cinBackCin">Stay in Cinema</button>
      </div></div>`;
    try { CF.Music && CF.Music.play('menu'); CF.Sonify && CF.Sonify.fx('win', {}); } catch (e) {}
    ov.querySelector('#cinNext').addEventListener('click', () => {
      closeOverlay(ov);
      if (next && next.go) next.go(); else h.onHome && h.onHome();
    });
    ov.querySelector('#cinBackCin').addEventListener('click', () => { closeOverlay(ov); refresh && refresh(); });
  }

  /* ═══════════ SCREEN ═══════════ */
  let toastTimer = null;
  function toast(text) {
    let el = document.getElementById('cinToast');
    if (!el) { el = document.createElement('div'); el.id = 'cinToast'; el.className = 'cin-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = text; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 3200);
  }

  function render(root, h) {
    h = h || {};
    const st = { tab: 'search', q: '', results: null, loading: false, error: '' };
    const ownedCount = () => Object.values(data().tickets).filter(t => t.status === 'ready').length;

    function banner() {
      const g = gate(), lim = Number(settings().dailyLimit) || 0, parts = [];
      if (g.locked) parts.push(`🔒 Cinema opens after today's study goal: <b>${g.done}/${g.goal}</b> min. ${g.need} to go.`);
      if (lim) { const left = Math.max(0, lim * 60 - boughtTodaySec()); parts.push(`⏳ Daily limit: <b>${Math.floor(left / 60)}</b> of ${lim} min left today.`); }
      if (location.protocol === 'file:') parts.push('ℹ️ Opened as a file: YouTube may refuse to play videos here. If it does, run <code>python3 -m http.server 8000</code> in the app folder and open <code>http://localhost:8000</code>.');
      return parts.map(p => `<div class="cin-banner">${p}</div>`).join('');
    }

    function actionBtn(v) {
      const t = ticketOf(v.id), g = gate();
      if (t && t.status === 'watched') return `<button class="btn ghost" disabled>✓ Watched</button>`;
      if (t) return g.locked ? `<button class="btn ghost" disabled>🔒 Study ${g.need} more min</button>` : `<button class="btn primary" data-play="${esc(v.id)}">▶ Play${t.pos > 5 ? ' (resume)' : ''}</button>`;
      if (tooLong(v.seconds)) return `<button class="btn ghost" disabled>Too long</button>`;
      const price = priceFor(v.seconds);
      if (g.locked) return `<button class="btn ghost" disabled>🔒 Study ${g.need} more min</button>`;
      if (S.profile.coins < price) return `<button class="btn ghost" disabled>Need ${price - S.profile.coins} more 🪙</button>`;
      return `<button class="btn primary" data-buy="${esc(v.id)}">Buy ticket 🪙${price}</button>`;
    }
    const card = (v) => `<div class="cin-card ${ticketOf(v.id) && ticketOf(v.id).status === 'watched' ? 'dim' : ''}">
      <div class="cin-thumb">${v.thumb ? `<img src="${esc(v.thumb)}" alt="" loading="lazy">` : ''}<span class="cin-len">${fmt(v.seconds)}</span></div>
      <div class="cin-info"><div class="cin-title">${esc(v.title)}</div><div class="cin-chan">${esc(v.channel)}</div>
        <div class="cin-row"><span class="cin-price">🪙 ${priceFor(v.seconds)}</span>${actionBtn(v)}</div></div></div>`;

    function setupCard() {
      return `<div class="cin-setup"><h3>Connect YouTube search</h3>
        <p>Cinema needs a free <b>YouTube Data API v3</b> key. It stays in this browser only.</p>
        <ol><li>Open <b>console.cloud.google.com</b> and create a project.</li><li>Enable <b>YouTube Data API v3</b>.</li><li>Create credentials → <b>API key</b> and paste it below.</li></ol>
        <div class="cin-keyrow"><input type="password" id="cinKey" placeholder="Paste your API key" autocomplete="off"><button class="btn primary" id="cinSaveKey">Save</button></div></div>`;
    }

    function draw() {
      const tickets = Object.values(data().tickets).sort((a, b) => (a.status === b.status ? b.boughtAt - a.boughtAt : a.status === 'ready' ? -1 : 1));
      let body = '';
      if (st.tab === 'search') {
        body = !getKey() ? setupCard() : `
          <form class="cin-search" id="cinForm"><input type="search" id="cinQ" value="${esc(st.q)}" placeholder="Search YouTube…" aria-label="Search YouTube"><button class="btn primary" type="submit">Search</button></form>
          ${st.error ? `<div class="cin-error">${esc(st.error)}</div>` : ''}
          ${st.loading ? '<div class="hub-empty small">Searching…</div>' : st.results === null ? '<div class="hub-empty small">Search for a song, a clip or an episode. Each result shows its price.</div>'
            : st.results.length ? st.results.map(card).join('') : '<div class="hub-empty small">No playable videos found. Try another search.</div>'}`;
      } else if (st.tab === 'tickets') {
        body = tickets.length ? tickets.map(t => `<div class="cin-card ${t.status === 'watched' ? 'dim' : ''}">
            <div class="cin-thumb">${t.thumb ? `<img src="${esc(t.thumb)}" alt="" loading="lazy">` : ''}<span class="cin-len">${fmt(t.seconds)}</span></div>
            <div class="cin-info"><div class="cin-title">${esc(t.title)}</div>
              <div class="cin-chan">${t.status === 'watched' ? 'Watched ' + new Date(t.watchedAt).toLocaleDateString() : 'Ready to play · paid 🪙' + t.price}</div>
              <div class="cin-row">${actionBtn(t)}</div></div></div>`).join('')
          : '<div class="hub-empty">No tickets yet. Buy one in Search.</div>';
      } else {
        const s = settings();
        body = `<div class="cin-settings">
          <label>YouTube API key<div class="cin-keyrow"><input type="password" id="cinKey" value="${esc(getKey())}" placeholder="Paste your API key" autocomplete="off"><button class="btn ghost" id="cinSaveKey">Save</button></div></label>
          <label>Coins per minute <input type="number" id="cinRate" min="1" max="100" value="${s.rate}"></label>
          <label>Longest video allowed (minutes) <input type="number" id="cinMax" min="5" max="600" value="${s.maxMin}"></label>
          <label class="cin-check"><input type="checkbox" id="cinGoal" ${s.requireGoal ? 'checked' : ''}> Require today's study goal before buying or playing</label>
          <label>Daily Cinema limit in minutes (0 = no limit) <input type="number" id="cinLimit" min="0" max="600" value="${s.dailyLimit}"></label>
          <p class="cin-hint">Prices: minutes × rate, at least 10 coins. Changing the rate only affects tickets bought from now on.</p></div>`;
      }
      root.innerHTML = `<div class="cin-wrap">
        <div class="cin-head"><button class="back-btn" id="cinBack">← Menu</button><div class="cin-title-h">🎬 Cinema</div><div class="cin-coins" aria-label="Coins">🪙 ${S.profile.coins}</div></div>
        ${banner()}
        <div class="cin-tabs" role="tablist">
          <button class="${st.tab === 'search' ? 'on' : ''}" data-t="search" role="tab">Search</button>
          <button class="${st.tab === 'tickets' ? 'on' : ''}" data-t="tickets" role="tab">My tickets${ownedCount() ? ` (${ownedCount()})` : ''}</button>
          <button class="${st.tab === 'settings' ? 'on' : ''}" data-t="settings" role="tab">Settings</button></div>
        <div class="cin-body">${body}</div></div>`;
      wire();
    }

    function wire() {
      root.querySelector('#cinBack').addEventListener('click', () => h.onExit && h.onExit());
      root.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.t; draw(); }));
      const find = (id) => (st.results || []).find(v => v.id === id) || data().tickets[id];
      root.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
        const v = find(b.dataset.buy); if (!v) return;
        const r = buy(v);
        if (r.ok) { try { CF.Sonify && CF.Sonify.fx('win', {}); } catch (e) {} toast(`Ticket bought for 🪙${r.price}. Press Play when you are ready.`); } else toast(r.msg);
        draw();
      }));
      root.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => play(b.dataset.play, h, draw)));
      const form = root.querySelector('#cinForm');
      if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        st.q = root.querySelector('#cinQ').value.trim(); if (!st.q) return;
        st.loading = true; st.error = ''; draw();
        try { st.results = await searchVideos(st.q); } catch (err) { st.results = null; st.error = err.message; }
        st.loading = false; draw();
      });
      const key = root.querySelector('#cinSaveKey');
      if (key) key.addEventListener('click', () => {
        const v = root.querySelector('#cinKey').value.trim(); setKey(v);
        toast(v ? 'API key saved.' : 'API key removed.'); draw();
      });
      const bind = (id, fn) => { const el = root.querySelector(id); if (el) el.addEventListener('change', () => { fn(el); S.save(); draw(); }); };
      bind('#cinRate', el => { settings().rate = Math.min(100, Math.max(1, Number(el.value) || DEFAULTS.rate)); });
      bind('#cinMax', el => { settings().maxMin = Math.min(600, Math.max(5, Number(el.value) || DEFAULTS.maxMin)); });
      bind('#cinGoal', el => { settings().requireGoal = el.checked; });
      bind('#cinLimit', el => { settings().dailyLimit = Math.min(600, Math.max(0, Number(el.value) || 0)); });
    }
    draw();
  }

  return {
    render, priceFor, parseDuration, fmt,
    /* test seams */
    _buy: buy, _data: data, _gate: gate, _limitCheck: limitCheck, _search: searchVideos
  };
})();

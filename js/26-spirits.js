/* ═══════════════════════════════════════════════════════════ */
/*  26-spirits.js — animated enemy characters (original SVG art) */
/*                                                              */
/*  Replaces the emoji enemy in practice fights. Each spirit has  */
/*  four states driven by CSS:                                   */
/*     idle (bobbing) · hurt (you answered right) ·              */
/*     attack (you lost a heart) · die (you won)                 */
/*  CF.Spirits.html(icon, name, size) -> markup (emoji fallback)  */
/*  CF.Spirits.react(el, state)        -> play a state once       */
/*  All art is drawn here, so there are no image files to load.   */
/* ═══════════════════════════════════════════════════════════ */
window.CF = window.CF || {};
CF.Spirits = (() => {
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  /* eyes: normal (white + pupil) and "hurt" (X) share positions */
  const eyes = (pts, r) => `<g class="sp-eyes-n">${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle class="sp-pupil" cx="${x}" cy="${y + 1}" r="${r * 0.5}" fill="#0b1020"/>`).join('')}</g>` +
    `<g class="sp-eyes-x" stroke="#0b1020" stroke-width="2.4" stroke-linecap="round">${pts.map(([x, y]) => `<path d="M${x - r * .7} ${y - r * .7}L${x + r * .7} ${y + r * .7}M${x + r * .7} ${y - r * .7}L${x - r * .7} ${y + r * .7}"/>`).join('')}</g>`;
  const mouth = (d, c) => `<path class="sp-mouth" d="${d}" fill="none" stroke="${c || '#0b1020'}" stroke-width="2.4" stroke-linecap="round"/>`;

  const ART = {
    slime: () => `<path d="M14 78C10 52 28 30 50 30s40 22 36 48c-1 6-10 9-36 9S15 84 14 78Z" fill="#34d399"/><path d="M22 70C22 52 34 40 50 40" fill="none" stroke="#a7f3d0" stroke-width="4" stroke-linecap="round" opacity=".7"/>${eyes([[38, 58], [62, 58]], 7)}${mouth('M42 72Q50 79 58 72')}`,
    bat: () => `<path class="sp-wing l" d="M40 52C26 34 10 38 4 50c8-2 12 2 14 8 4-4 10-2 12 4 3-4 7-4 10 0Z" fill="#6d28d9"/><path class="sp-wing r" d="M60 52c14-18 30-14 36-2-8-2-12 2-14 8-4-4-10-2-12 4-3-4-7-4-10 0Z" fill="#6d28d9"/><path d="M36 40l-4-16 12 8ZM64 40l4-16-12 8Z" fill="#4c1d95"/><circle cx="50" cy="56" r="22" fill="#7c3aed"/>${eyes([[42, 52], [58, 52]], 6)}${mouth('M44 66Q50 71 56 66')}<path d="M46 66l2 5 2-5ZM50 66l2 5 2-5Z" fill="#fff"/>`,
    dragon: () => `<path d="M22 44L10 22l20 10ZM78 44l12-22-20 10Z" fill="#fbbf24"/><path class="sp-wing l" d="M26 62C10 54 4 66 6 80c8-6 14-4 20 2Z" fill="#dc2626"/><path class="sp-wing r" d="M74 62c16-8 22 4 20 18-8-6-14-4-20 2Z" fill="#dc2626"/><circle cx="50" cy="56" r="29" fill="#ef4444"/><ellipse cx="50" cy="68" rx="17" ry="12" fill="#fca5a5"/><circle cx="44" cy="68" r="2.2" fill="#7f1d1d"/><circle cx="56" cy="68" r="2.2" fill="#7f1d1d"/>${eyes([[38, 48], [62, 48]], 6.5)}<path d="M44 30l6-10 6 10Z" fill="#fbbf24"/>`,
    golem: () => `<rect x="20" y="24" width="60" height="60" rx="10" fill="#94a3b8"/><rect x="12" y="44" width="14" height="30" rx="6" fill="#64748b"/><rect x="74" y="44" width="14" height="30" rx="6" fill="#64748b"/><path d="M30 34l10 8M70 30l-8 10M26 70l12-6" stroke="#64748b" stroke-width="3" fill="none"/><rect x="30" y="42" width="40" height="10" rx="4" fill="#0f172a"/>${eyes([[40, 47], [60, 47]], 4.6)}<g class="sp-glow"><circle cx="40" cy="47" r="3" fill="#22d3ee"/><circle cx="60" cy="47" r="3" fill="#22d3ee"/></g>${mouth('M38 70h24', '#334155')}`,
    imp: () => `<path d="M26 38L16 16l22 12ZM74 38l10-22-22 12Z" fill="#be123c"/><path class="sp-tail" d="M78 82c10 0 14-8 10-16" fill="none" stroke="#9333ea" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="58" r="30" fill="#a855f7"/>${eyes([[39, 52], [61, 52]], 6.5)}${mouth('M36 68Q50 82 64 68', '#3b0764')}<path d="M40 70l3 6 3-4ZM60 70l-3 6-3-4Z" fill="#fff"/>`,
    ghost: () => `<path d="M22 86V50C22 30 34 18 50 18s28 12 28 32v36l-8-7-7 7-7-7-7 7-7-7Z" fill="#e2e8f0"/><path d="M30 40C32 30 40 24 50 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>${eyes([[40, 48], [60, 48]], 7)}<ellipse cx="50" cy="66" rx="6" ry="8" fill="#334155"/>`,
    spider: () => `<g stroke="#1e293b" stroke-width="4" fill="none" stroke-linecap="round" class="sp-legs"><path d="M34 54L10 40L6 58M34 62L8 68L10 86M66 54L90 40L94 58M66 62L92 68L90 86M38 48L22 28M62 48L78 28"/></g><circle cx="50" cy="60" r="24" fill="#475569"/><circle cx="50" cy="44" r="16" fill="#334155"/>${eyes([[43, 42], [57, 42]], 5.5)}<path d="M40 70l10 6 10-6" fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="round"/>`,
    robot: () => `<path d="M50 22V10" stroke="#94a3b8" stroke-width="3"/><circle cx="50" cy="9" r="4" fill="#f43f5e" class="sp-glow"/><rect x="18" y="22" width="64" height="58" rx="12" fill="#38bdf8"/><rect x="26" y="34" width="48" height="24" rx="8" fill="#0f172a"/>${eyes([[38, 46], [62, 46]], 6)}<rect x="34" y="66" width="32" height="6" rx="3" fill="#0369a1"/><rect x="10" y="40" width="8" height="20" rx="3" fill="#0ea5e9"/><rect x="82" y="40" width="8" height="20" rx="3" fill="#0ea5e9"/>`,
    goblin: () => `<path d="M22 54L4 40l24 0ZM78 54l18-14-24 0Z" fill="#65a30d"/><circle cx="50" cy="56" r="28" fill="#84cc16"/>${eyes([[40, 50], [60, 50]], 6.5)}<path d="M50 54l-5 10h10Z" fill="#65a30d"/>${mouth('M38 72Q50 80 62 72', '#365314')}<path d="M40 73l2 6 3-5ZM60 73l-2 6-3-5Z" fill="#fff"/><path d="M30 30l8 8M70 30l-8 8" stroke="#365314" stroke-width="3" stroke-linecap="round"/>`
  };
  const BY_ICON = { '👺': 'goblin', '🟢': 'slime', '🦇': 'bat', '🐉': 'dragon', '🐲': 'dragon', '🗿': 'golem', '😈': 'imp', '👻': 'ghost', '🕷️': 'spider', '🕷': 'spider', '🤖': 'robot' };
  const KINDS = Object.keys(ART);
  const hash = (s) => Array.from(String(s)).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  function kindFor(icon, name) { return BY_ICON[icon] || KINDS[hash(name || icon) % KINDS.length]; }

  function html(icon, name, size) {
    const k = kindFor(icon, name), px = size || 64;
    return `<span class="spirit idle" data-kind="${k}" style="--sp:${px}px" role="img" aria-label="${esc(name || 'enemy')}"><svg viewBox="0 0 100 100" width="${px}" height="${px}" aria-hidden="true"><ellipse class="sp-shadow" cx="50" cy="92" rx="26" ry="5" fill="rgba(0,0,0,.35)"/><g class="sp-body">${ART[k]()}</g></svg></span>`;
  }
  /* play a state once, then go back to idle (die stays) */
  function react(el, state) {
    if (!el) return;
    const s = el.classList.contains('spirit') ? el : el.querySelector && el.querySelector('.spirit');
    if (!s) return;
    ['idle', 'hurt', 'attack', 'die'].forEach(c => s.classList.remove(c));
    void s.getBoundingClientRect();                 // restart the animation
    s.classList.add(state);
    if (state !== 'die') setTimeout(() => { if (s.isConnected && !s.classList.contains('die')) { s.classList.remove(state); s.classList.add('idle'); } }, state === 'attack' ? 900 : 700);
  }
  return { html, react, kindFor, KINDS, _art: ART };
})();

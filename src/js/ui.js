'use strict';
/* ===== UI: DOM overlays (title, HUD, dialogue, menus, wrapped) ===== */
const $ = (s) => document.querySelector(s);
const CH = {
  rahul: { name: 'Rahul', look: () => LOOKS.rahul, pitch: 1.05, bg: '#f08a24' },
  kabir: { name: 'Kabir', look: () => LOOKS.kabir, pitch: 0.85, bg: '#6b4fa0' },
  priya: { name: 'Priya', look: () => LOOKS.priya, pitch: 1.4, bg: '#e8566f' },
  prof: { name: 'Prof. R.K. Sharma', look: () => LOOKS.prof, pitch: 0.65, bg: '#8a6a4a' },
  bhaiya: { name: 'Pappu Bhaiya', look: () => LOOKS.bhaiya, pitch: 0.75, bg: '#c9583a' },
  meera: { name: 'Meera', look: () => LOOKS.meera, pitch: 1.55, bg: '#22b3a6' },
  librarian: { name: 'Librarian Ma\'am', look: () => LOOKS.librarian, pitch: 1.2, bg: '#8a4f9a' },
  guard: { name: 'Guard Uncle', look: () => LOOKS.guard, pitch: 0.7, bg: '#4a5a7a' },
  me: { name: () => S.name, look: () => G.player.look, pitch: 1, bg: '#3a7bd5', me: true },
  sys: { name: '', look: null, pitch: 0.9 },
  phone: { name: 'Phone', look: null, pitch: 1.6, phone: true, bg: '#2a2438' },
};

const ICONS = {
  acad: '<svg viewBox="0 0 8 8"><path d="M1 1h3v6H1zM4 1h3v6H4z" fill="#7fb8ff"/><path d="M2 2h1v1H2zM5 2h1v1H5zM2 4h1v1H2zM5 4h1v1H5z" fill="#1b1e3b"/></svg>',
  att: '<svg viewBox="0 0 8 8"><path d="M1 1h6v6H1z" fill="#8ef0a0"/><path d="M2 4h1v1h1v-1h1v-1h1v1H5v1H4v1H3V5H2z" fill="#1b1e3b"/></svg>',
  energy: '<svg viewBox="0 0 8 8"><path d="M4 0h2L5 3h2L3 8l1-4H2z" fill="#ffd23f"/></svg>',
  money: '<svg viewBox="0 0 8 8"><path d="M2 1h4v1h1v4H6v1H2V6H1V2h1z" fill="#ffb067"/><path d="M3 2h2v1H3v1h2v2H3V5h2" fill="none" stroke="#7a3a10" stroke-width=".8"/></svg>',
  social: '<svg viewBox="0 0 8 8"><path d="M1 2h2v1h2V2h2v3H6v1H5v1H3V6H2V5H1z" fill="#ff8fc0"/></svg>',
};

const UI = {
  dlgState: null, choiceState: null, menuOpen: false, popupState: null, hudCache: {}, skipState: null, textSpeed: 1,

  init() {
    this.buildHud();
    this.buildTouch();
    $('#dlg').addEventListener('click', () => this.advance());
    $('#btn-new').onclick = () => { AU.init(); this.showCreation(); };
    $('#btn-cont').onclick = () => { AU.init(); Game.continueGame(); };
    $('#btn-how').onclick = () => { $('#how').hidden = !$('#how').hidden; };
    $('#btn-start').onclick = () => this.creationSubmit();
    $('#btn-back').onclick = () => { $('#create').hidden = true; $('#title').hidden = false; };
    document.querySelectorAll('.pers').forEach((el) => el.addEventListener('click', () => this.selectPers(el.dataset.p)));
    $('#pause-btn').onclick = () => this.togglePause();
    this.selectPers('owl');
    const prefs = safeStore('get', 'campusexe.prefs');
    if (prefs) { try { const p = JSON.parse(prefs); AU.setMusic(p.music !== false); AU.setSfx(p.sfx !== false); this.textSpeed = p.speed || 1; } catch (e) { /* ignore */ } }
  },

  /* ---------------- Title & creation ---------------- */
  showTitle() {
    G.mode = 'title';
    for (const id of ['#hud', '#side', '#dlg', '#wrapped', '#gameover', '#create', '#pause', '#popup', '#card']) $(id).hidden = true;
    $('#title').hidden = false;
    $('#btn-cont').hidden = !safeStore('get', 'campusexe.save');
    $('#touch').hidden = true;
  },
  showCreation() {
    $('#title').hidden = true; $('#create').hidden = false;
    setTimeout(() => $('#pname').focus(), 50);
  },
  selectPers(p) {
    this.pers = p;
    document.querySelectorAll('.pers').forEach((el) => el.classList.toggle('sel', el.dataset.p === p));
  },
  creationSubmit() {
    if ($('#create').hidden) return;
    const name = ($('#pname').value || '').trim().slice(0, 14) || 'Bunty';
    $('#pname').blur();
    $('#create').hidden = true;
    Game.newGame(name, this.pers || 'owl');
  },
  drawPreviews(t) {
    document.querySelectorAll('.pers canvas').forEach((cvs) => {
      const c = cvs.getContext('2d'); c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, cvs.width, cvs.height);
      c.save(); c.scale(cvs.width / 24, cvs.width / 24);
      const sel = cvs.parentElement.classList.contains('sel');
      drawChar(c, { x: 12, y: 26, look: playerLook(cvs.dataset.p), dir: 'down', pose: sel ? 'cheer' : 'stand', moving: false, walkT: t, phase: 0, expr: sel ? 'happy' : 'normal' }, t);
      c.restore();
    });
  },

  /* ---------------- HUD ---------------- */
  buildHud() {
    const st = $('#stats');
    for (const k of ['acad', 'att', 'energy', 'money', 'social']) {
      const d = document.createElement('div'); d.className = 'st'; d.dataset.k = k; d.title = STAT_META[k].name;
      d.innerHTML = `<span class="ic">${ICONS[k]}</span><span class="lbl">${STAT_META[k].name.slice(0, 4)}</span><b>0</b><span class="bar"><span></span></span>`;
      st.appendChild(d);
    }
  },
  hud() {
    if (!S) return;
    const c = this.hudCache;
    const day = DAY_SHORT[S.day], tm = fmtTime(S.time), sl = SLOTS[slotOf(S.time)];
    if (c.day !== day) { $('#h-day').textContent = day; $('#h-dayn').textContent = 'Day ' + (S.day + 1) + '/7'; c.day = day; }
    if (c.tm !== tm) { $('#h-time').textContent = tm; c.tm = tm; }
    if (c.sl !== sl) { $('#h-slot').textContent = sl; $('#h-sun').className = 'sun s' + slotOf(S.time); c.sl = sl; }
    for (const k in S.stats) {
      const v = S.stats[k];
      if (c[k] !== v) {
        const el = document.querySelector(`.st[data-k="${k}"]`);
        el.querySelector('b').textContent = v;
        el.querySelector('.bar span').style.width = v + '%';
        el.classList.toggle('low', v <= 20);
        c[k] = v;
      }
    }
    const obj = Story.objective();
    if (c.obj !== obj) { $('#obj').innerHTML = obj; c.obj = obj; }
    const dl = Story.deadlineText();
    if (c.dl !== dl) { $('#deadline').textContent = dl || ''; $('#deadline').hidden = !dl; c.dl = dl; }
    $('#mini').hidden = !(G.map && G.map.id === 'campus' && G.showMini);
    $('#roomname').textContent = G.map && G.map.id !== 'campus' ? G.map.name : '';
  },
  flashStat(k, up) {
    const el = document.querySelector(`.st[data-k="${k}"]`); if (!el) return;
    el.classList.remove('up', 'dn'); void el.offsetWidth; el.classList.add(up ? 'up' : 'dn');
  },
  drawMini() {
    const m = MAPS.campus; if (!m || !m.mini || $('#mini').hidden) return;
    const cvs = $('#mini'), c = cvs.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cvs.width, cvs.height);
    c.drawImage(m.mini, 0, 0, cvs.width, cvs.height);
    const sx = cvs.width / m.w, sy = cvs.height / m.h;
    const mk = Story.objMarker();
    if (mk) { const p = (Math.sin(G.t * 6) + 1) / 2; c.fillStyle = `rgba(255,182,39,${0.4 + p * 0.6})`; c.beginPath(); c.arc(mk.x * sx, mk.y * sy, 4 + p * 2, 0, 7); c.fill(); }
    for (const a of G.actors) { if (a === G.player || !a.name || !CH[a.id]) continue; c.fillStyle = CH[a.id].bg || '#fff'; c.fillRect(a.x * sx - 2, a.y * sy - 2, 4, 4); }
    c.fillStyle = '#fff'; c.fillRect(G.player.x * sx - 3, G.player.y * sy - 3, 6, 6); c.fillStyle = '#e2533d'; c.fillRect(G.player.x * sx - 2, G.player.y * sy - 2, 4, 4);
  },

  locToast(name) {
    const el = $('#loc'); el.textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  },
  notify(app, text) {
    AU.sfx('notif');
    const el = document.createElement('div'); el.className = 'notif';
    el.innerHTML = `<div class="napp"><span class="ndot"></span>${app}<em>now</em></div><div class="ntxt"></div>`;
    el.querySelector('.ntxt').textContent = text.replace(/\{P\}/g, S ? S.name : '');
    $('#notifs').appendChild(el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 4800);
  },
  hint(text, sec = 5) {
    const el = $('#hint'); el.innerHTML = text; el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.hintT); this.hintT = setTimeout(() => { el.hidden = true; }, sec * 1000);
  },

  /* ---------------- Dialogue ---------------- */
  speaker(who) {
    if (typeof who === 'string') { const c = CH[who]; return { name: typeof c.name === 'function' ? c.name() : c.name, look: c.look ? c.look() : null, pitch: c.pitch, bg: c.bg, phone: c.phone, me: c.me }; }
    return { name: who.name, look: who.look, pitch: who.pitch || 1, bg: who.bg || '#3a4a6a' };
  },
  say(who, text, expr) { return this.dialog(who, text, expr, null); },
  choose(who, text, opts, expr) { return this.dialog(who, text, expr, opts); },
  dialog(who, text, expr, opts) {
    // queue dialogs so overlapping scripts never clobber each other
    const p = (this.dlgQ || Promise.resolve()).then(() => this._dialog(who, text, expr, opts));
    this.dlgQ = p.catch(() => {});
    return p;
  },
  _dialog(who, text, expr, opts) {
    const sp = this.speaker(who);
    text = String(text).replace(/\{P\}/g, S ? S.name : '');
    const box = $('#dlg');
    box.hidden = false; G.dlg = true;
    box.classList.toggle('sys', !sp.name);
    box.classList.toggle('thought', !!sp.me);
    $('#dlg-name').textContent = sp.name || '';
    $('#dlg-name').hidden = !sp.name;
    $('#dlg-name').style.background = sp.bg || '#ffb627';
    const pc = $('#dlg-por');
    pc.parentElement.hidden = !sp.look && !sp.phone;
    pc.parentElement.style.background = sp.bg ? shade(sp.bg, -0.35) : '#2a2438';
    this.dlgState = { sp, text, shown: 0, expr: expr || 'normal', opts, sel: 0, res: null, done: false };
    $('#dlg-text').textContent = '';
    $('#dlg-choices').innerHTML = ''; $('#dlg-choices').hidden = true;
    $('#dlg-next').hidden = true;
    return new Promise((r) => { this.dlgState.res = r; });
  },
  renderChoices() {
    const st = this.dlgState, ch = $('#dlg-choices');
    ch.innerHTML = ''; ch.hidden = false;
    st.opts.forEach((o, i) => {
      const op = typeof o === 'string' ? { t: o } : o;
      const b = document.createElement('button'); b.className = 'ch' + (i === st.sel ? ' sel' : '') + (op.dis ? ' dis' : '');
      b.innerHTML = `<span class="k">${i + 1}</span><span class="ct"></span>` + (op.hint ? `<span class="hn">${op.hint}</span>` : '');
      b.querySelector('.ct').textContent = op.t.replace(/\{P\}/g, S.name);
      b.onmouseenter = () => { if (st.sel !== i) { st.sel = i; this.renderChoices(); AU.sfx('move'); } };
      b.onclick = (e) => { e.stopPropagation(); this.pickChoice(i); };
      ch.appendChild(b);
    });
  },
  pickChoice(i) {
    const st = this.dlgState; if (!st || !st.opts) return;
    const op = typeof st.opts[i] === 'string' ? { t: st.opts[i] } : st.opts[i];
    if (op.dis) { AU.sfx('down'); return; }
    AU.sfx('confirm'); this.closeDlg(i);
  },
  closeDlg(v) {
    const st = this.dlgState; this.dlgState = null;
    $('#dlg').hidden = true; G.dlg = false;
    if (st && st.res) st.res(v);
  },
  advance() {
    const st = this.dlgState; if (!st) return;
    if (st.shown < st.text.length) { st.shown = st.text.length; return; }
    if (st.opts) return;
    AU.sfx('blip', 1.4);
    this.closeDlg();
  },
  frame(dt) {
    const st = this.dlgState;
    if (st) {
      if (st.shown < st.text.length) {
        const sp = this.textSpeed >= 3 ? 999 : this.textSpeed === 2 ? 90 : 48;
        const prev = Math.floor(st.shown);
        st.shown = Math.min(st.text.length, st.shown + dt * sp);
        if (Math.floor(st.shown) !== prev) { $('#dlg-text').textContent = st.text.slice(0, Math.floor(st.shown)); if (prev % 3 === 0 && st.text[prev] !== ' ') AU.sfx('blip', st.sp.pitch); }
      } else if (!st.done) {
        st.done = true; $('#dlg-text').textContent = st.text;
        if (st.opts) this.renderChoices(); else $('#dlg-next').hidden = false;
      }
      const pc = $('#dlg-por');
      if (st.sp.phone) drawPhone(pc, G.t);
      else if (st.sp.look) drawPortrait(pc, st.sp.look, st.shown < st.text.length && Math.floor(G.t * 8) % 2 && st.expr === 'normal' ? 'normal' : st.expr, G.t);
    }
    if (G.mode === 'play') this.drawMini();
    if (!$('#create').hidden) this.drawPreviews(G.t);
    if (G.mode === 'title' && G.map) { G.cam.x = (Math.sin(G.t * 0.05) * 0.5 + 0.5) * (G.map.w - G.vw); G.cam.y = 120 + Math.sin(G.t * 0.08) * 60; }
    if (this.wrappedCv) this.drawWrappedChar();
    if (this.goCv) this.drawGameOver();
  },

  handleKey(k) {
    if (!$('#wrapped').hidden) { if (k === 'act' || k === 'right') this.wrappedNext(); if (k === 'left') this.wrappedPrev(); return true; }
    if (this.popupState) { if (k === 'act') this.closePopup(); return true; }
    if (k === 'pause' && G.mode === 'play' && $('#gameover').hidden) { this.togglePause(); return true; }
    if (this.menuOpen) { this.menuKey(k); return true; }
    const st = this.dlgState;
    if (st) {
      if (st.opts && st.done) {
        if (k === 'up' || k === 'left') { st.sel = (st.sel + st.opts.length - 1) % st.opts.length; this.renderChoices(); AU.sfx('move'); }
        else if (k === 'down' || k === 'right') { st.sel = (st.sel + 1) % st.opts.length; this.renderChoices(); AU.sfx('move'); }
        else if (k === 'act') this.pickChoice(st.sel);
        else if (k[0] === 'n') { const i = +k[1] - 1; if (i < st.opts.length) this.pickChoice(i); }
        return true;
      }
      if (k === 'act') { this.advance(); return true; }
      return true;
    }
    if (!$('#title').hidden) { if (k === 'act') $('#btn-new').click(); return true; }
    if (!$('#create').hidden) {
      const order = ['owl', 'topper', 'broke'];
      if (k === 'left' || k === 'right') { const i = order.indexOf(this.pers); this.selectPers(order[(i + (k === 'left' ? 2 : 1)) % 3]); AU.sfx('move'); }
      if (k === 'act') this.creationSubmit();
      return true;
    }
    return false;
  },

  /* ---------------- Day card ---------------- */
  card(day, title, sub) {
    const el = $('#card');
    $('#card-n').textContent = 'DAY ' + (day + 1) + ' OF 7';
    $('#card-d').textContent = DAYS[day].toUpperCase();
    $('#card-t').textContent = title;
    $('#card-s').textContent = sub || '';
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    AU.sfx('whoosh');
    return wait(2.8).then(() => { el.classList.add('hide'); return wait(0.5); }).then(() => { el.hidden = true; el.classList.remove('hide'); });
  },

  /* ---------------- Time skip ---------------- */
  async timeSkip(label, minutes, sfx) {
    const el = $('#skip');
    $('#skip-l').textContent = label;
    $('#skip-p').textContent = '+' + (minutes >= 60 ? (Math.round(minutes / 6) / 10) + 'h' : minutes + 'm');
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    const t0 = S.time, dur = Math.min(2.4, 1.1 + minutes / 240);
    let k = 0, sfxT = 0;
    while (k < 1) {
      await wait(0.05); k = Math.min(1, k + 0.05 / dur);
      setTime(Math.round(t0 + minutes * k));
      $('#skip-t').textContent = fmtTime(S.time);
      sfxT -= 0.05; if (sfx && sfxT <= 0) { AU.sfx(sfx); sfxT = sfx === 'type' ? 0.35 : 0.6; }
    }
    await wait(0.35);
    el.hidden = true;
  },

  /* ---------------- Popup card ---------------- */
  popup(html, btn = 'Continue', cls = '') {
    const p = (this.dlgQ || Promise.resolve()).then(() => this._popup(html, btn, cls));
    this.dlgQ = p.catch(() => {});
    return p;
  },
  _popup(html, btn, cls) {
    const el = $('#popup');
    el.className = 'overlay ' + cls;
    $('#popup-body').innerHTML = html;
    $('#popup-btn').textContent = btn;
    el.hidden = false; G.dlg = true;
    $('#popup-btn').onclick = () => this.closePopup();
    return new Promise((r) => { this.popupState = { r }; });
  },
  closePopup() {
    const st = this.popupState; if (!st) return;
    this.popupState = null; $('#popup').hidden = true; G.dlg = false; AU.sfx('confirm'); st.r();
  },

  /* ---------------- Pause ---------------- */
  togglePause() {
    if (G.mode !== 'play') return;
    this.menuOpen = !this.menuOpen; G.paused = this.menuOpen;
    $('#pause').hidden = !this.menuOpen;
    if (this.menuOpen) { this.menuSel = 0; this.menuView = 'main'; this.renderMenu(); }
    AU.sfx('pop');
  },
  renderMenu() {
    const m = $('#pause-menu');
    const prefsSave = () => safeStore('set', 'campusexe.prefs', JSON.stringify({ music: AU.musOn, sfx: AU.sfxOn, speed: this.textSpeed }));
    const views = {
      main: [['Resume', () => this.togglePause()], ['Settings', () => { this.menuView = 'settings'; this.menuSel = 0; this.renderMenu(); }], ['Controls', () => { this.menuView = 'controls'; this.menuSel = 0; this.renderMenu(); }], ['Restart week', () => { this.menuView = 'confirm'; this.menuSel = 1; this.renderMenu(); }], ['Quit to title', () => { this.togglePause(); Game.toTitle(); }]],
      settings: [['Music: ' + (AU.musOn ? 'ON' : 'OFF'), () => { AU.setMusic(!AU.musOn); prefsSave(); this.renderMenu(); }], ['Sound effects: ' + (AU.sfxOn ? 'ON' : 'OFF'), () => { AU.setSfx(!AU.sfxOn); prefsSave(); this.renderMenu(); }], ['Text speed: ' + ['', 'Normal', 'Fast', 'Instant'][this.textSpeed], () => { this.textSpeed = this.textSpeed % 3 + 1; prefsSave(); this.renderMenu(); }], ['Minimap: ' + (G.showMini ? 'ON' : 'OFF'), () => { G.showMini = !G.showMini; this.renderMenu(); }], ['Back', () => { this.menuView = 'main'; this.menuSel = 1; this.renderMenu(); }]],
      controls: [['Back', () => { this.menuView = 'main'; this.menuSel = 2; this.renderMenu(); }]],
      confirm: [['Yes, restart from Monday', () => { this.togglePause(); Game.restart(); }], ['No, keep going', () => { this.menuView = 'main'; this.menuSel = 3; this.renderMenu(); }]],
    };
    const items = views[this.menuView];
    this.menuItems = items;
    $('#pause-title').textContent = { main: 'PAUSED', settings: 'SETTINGS', controls: 'CONTROLS', confirm: 'RESTART THE WEEK?' }[this.menuView];
    $('#pause-info').hidden = this.menuView !== 'controls' && this.menuView !== 'confirm';
    $('#pause-info').innerHTML = this.menuView === 'controls'
      ? '<p><kbd>WASD</kbd>/<kbd>Arrows</kbd> Move · <kbd>Shift</kbd> Run</p><p><kbd>E</kbd>/<kbd>Space</kbd> Interact & advance dialogue</p><p><kbd>1–4</kbd> Pick a choice · <kbd>M</kbd> Minimap · <kbd>Esc</kbd> Pause</p>'
      : this.menuView === 'confirm' ? '<p>All stats, friendships and choices reset. Your current progress is lost.</p>' : '';
    m.innerHTML = '';
    items.forEach(([t, fn], i) => {
      const b = document.createElement('button'); b.textContent = t; b.className = i === this.menuSel ? 'sel' : '';
      b.onclick = () => { AU.sfx('confirm'); fn(); };
      b.onmouseenter = () => { this.menuSel = i; m.querySelectorAll('button').forEach((x, j) => x.className = j === i ? 'sel' : ''); };
      m.appendChild(b);
    });
  },
  menuKey(k) {
    const n = this.menuItems.length;
    if (k === 'up') { this.menuSel = (this.menuSel + n - 1) % n; this.renderMenu(); AU.sfx('move'); }
    if (k === 'down') { this.menuSel = (this.menuSel + 1) % n; this.renderMenu(); AU.sfx('move'); }
    if (k === 'act') { AU.sfx('confirm'); this.menuItems[this.menuSel][1](); }
  },

  /* ---------------- Touch ---------------- */
  buildTouch() {
    const touch = ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
    G.touchUI = touch;
    document.body.classList.toggle('touch', touch);
    const stick = $('#stick'), knob = $('#knob');
    let id = null, cx = 0, cy = 0;
    stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), max = 40;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      G.touch.dx = Math.abs(dx) > 8 ? dx / max : 0; G.touch.dy = Math.abs(dy) > 8 ? dy / max : 0;
    };
    stick.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; G.touch.dx = G.touch.dy = 0; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    $('#abtn').addEventListener('pointerdown', (e) => { e.preventDefault(); AU.init(); if (!this.handleKey('act')) G.pressed.act = true; });
  },
  showGameUI(on) {
    $('#hud').hidden = !on; $('#side').hidden = !on;
    $('#touch').hidden = !(on && G.touchUI);
    $('#pause-btn').hidden = !on;
  },

  /* ---------------- Semester Wrapped ---------------- */
  wrapped(data) {
    this.wData = data; this.wIdx = 0;
    $('#wrapped').hidden = false; G.dlg = true;
    this.showGameUI(false);
    AU.play('fest');
    this.renderWrapped();
  },
  wrappedNext() { if (this.wIdx < this.wData.slides.length - 1) { this.wIdx++; AU.sfx('whoosh'); this.renderWrapped(); } },
  wrappedPrev() { if (this.wIdx > 0) { this.wIdx--; AU.sfx('whoosh'); this.renderWrapped(); } },
  renderWrapped() {
    const d = this.wData, sl = d.slides[this.wIdx];
    const el = $('#w-slide');
    el.className = 'w-slide ' + (sl.cls || '');
    el.innerHTML = sl.html;
    void el.offsetWidth; el.classList.add('in');
    $('#w-dots').innerHTML = d.slides.map((_, i) => `<i class="${i === this.wIdx ? 'on' : ''}"></i>`).join('');
    $('#w-prev').disabled = this.wIdx === 0;
    $('#w-next').hidden = this.wIdx === d.slides.length - 1;
    this.wrappedCv = el.querySelector('canvas.wchar');
    el.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => { if (b.dataset.act === 'again') Game.restart(); else Game.toTitle(); });
    el.querySelectorAll('.wbar i').forEach((b) => { const v = b.dataset.v; b.style.width = '0%'; setTimeout(() => { b.style.width = v + '%'; }, 80); });
    el.querySelectorAll('.count').forEach((n) => { const to = +n.dataset.v; let k = 0; const step = () => { k = Math.min(1, k + 0.05); n.textContent = Math.round(to * k); if (k < 1) requestAnimationFrame(step); }; step(); });
    if (sl.sfx) AU.sfx(sl.sfx);
    $('#w-prev').onclick = () => this.wrappedPrev();
    $('#w-next').onclick = () => this.wrappedNext();
  },
  drawWrappedChar() {
    const cvs = this.wrappedCv; if (!cvs || !cvs.isConnected) { this.wrappedCv = null; return; }
    const c = cvs.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, cvs.width, cvs.height);
    const fr = !!cvs.dataset.friends, u = fr ? 52 : 34;
    c.save(); c.scale(cvs.width / u, cvs.width / u);
    const pose = cvs.dataset.pose || 'dance';
    drawChar(c, { x: u / 2, y: u * 0.78, look: G.player.look, dir: 'down', pose, expr: cvs.dataset.expr || 'happy', phase: 0 }, G.t);
    if (fr) {
      drawChar(c, { x: 10, y: u * 0.8, look: LOOKS.rahul, dir: 'down', pose: 'dance', expr: 'happy', phase: 1 }, G.t);
      drawChar(c, { x: u - 10, y: u * 0.8, look: LOOKS.priya, dir: 'down', pose: 'cheer', expr: 'happy', phase: 2 }, G.t);
    }
    c.restore();
  },

  /* ---------------- Game over ---------------- */
  gameOver(title, line) {
    $('#gameover').hidden = false; G.dlg = true;
    this.showGameUI(false);
    $('#go-title').textContent = title; $('#go-line').textContent = line;
    this.goCv = $('#go-cv'); this.goT0 = G.t;
    AU.play(null); AU.sfx('gameover');
    $('#go-again').onclick = () => { this.goCv = null; Game.restart(); };
    $('#go-title-btn').onclick = () => { this.goCv = null; Game.toTitle(); };
  },
  drawGameOver() {
    const cvs = this.goCv; if (!cvs) return;
    const c = cvs.getContext('2d'); c.imageSmoothingEnabled = false;
    const t = G.t - this.goT0;
    c.clearRect(0, 0, cvs.width, cvs.height);
    c.save(); c.scale(cvs.width / 120, cvs.width / 120);
    R(c, 0, 50, 120, 20, '#3a2a3a');
    drawChar(c, { x: 40, y: 56, look: LOOKS.prof, dir: 'right', pose: t > 1.2 && t < 1.6 ? 'stand' : 'point', expr: 'angry', phase: 0 }, G.t);
    drawChar(c, { x: 78, y: 58, look: G.player.look, dir: 'left', pose: t > 1.4 ? 'tired' : 'stand', expr: t > 1.4 ? 'shock' : 'normal', sweat: true, phase: 0 }, G.t);
    if (t > 1.3) { const k = Math.min(1, (t - 1.3) * 4); c.save(); c.translate(60, 26); c.rotate(-0.15); c.scale(2.2 - k * 1.2, 2.2 - k * 1.2); c.globalAlpha = k; R(c, -28, -8, 56, 16, '#c0392b'); R(c, -26, -6, 52, 12, '#fff4dc'); c.restore(); }
    c.restore();
    if (t > 1.3 && !this.goStamped) { this.goStamped = true; AU.sfx('stamp'); }
    if (t < 1.3) this.goStamped = false;
    if (t > 1.5) { c.save(); c.translate(cvs.width / 2, cvs.width * 26 / 120); c.rotate(-0.15); c.font = `700 ${Math.round(cvs.width / 18)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#c0392b'; c.fillText(this.goStamp || 'DEBARRED', 0, 1); c.restore(); }
  },
};

function drawPhone(cvs, t) {
  const c = cvs.getContext('2d'); c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, cvs.width, cvs.height);
  c.save(); c.scale(cvs.width / 20, cvs.height / 20);
  R(c, 5, 2, 10, 17, '#1a1a22'); R(c, 6, 4, 8, 12, '#2ec4b6'); R(c, 9, 3, 2, 1, '#444'); R(c, 9, 17, 2, 1, '#444');
  const k = Math.floor(t * 4) % 2;
  R(c, 7, 6, 6, 2, '#fff'); R(c, 7, 9, 4, 2, '#fff'); R(c, 7, 12, 5 + k, 2, '#ffd23f');
  if (k) { R(c, 3, 3, 1, 3, '#ffd23f'); R(c, 16, 3, 1, 3, '#ffd23f'); }
  c.restore();
}

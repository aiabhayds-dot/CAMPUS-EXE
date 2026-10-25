'use strict';
/* ===== UI: DOM overlays (title, HUD, notebook, planner, dialogue, menus, wrapped) ===== */
const $ = (s) => document.querySelector(s);
const CH = {
  rahul: { name: 'Rahul', look: () => LOOKS.rahul, pitch: 1.05, bg: '#f08a24' },
  kabir: { name: 'Kabir', look: () => LOOKS.kabir, pitch: 0.85, bg: '#6b4fa0' },
  priya: { name: 'Priya', look: () => LOOKS.priya, pitch: 1.4, bg: '#e8566f' },
  prof: { name: 'Prof. R.K. Sharma', look: () => LOOKS.prof, pitch: 0.65, bg: '#8a6a4a' },
  sharma: { name: 'Prof. R.K. Sharma', look: () => LOOKS.prof, pitch: 0.65, bg: '#8a6a4a' },
  iyer: { name: 'Dr. Meenakshi Iyer', look: () => LOOKS.iyer, pitch: 1.1, bg: '#2f6f6a' },
  coach: { name: 'Coach Thapa', look: () => LOOKS.coach, pitch: 0.8, bg: '#e2533d' },
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
const KIND_LABEL = { class: 'Class', friend: 'Friend', meal: 'Meal', sport: 'NSO', study: 'Study', event: 'Event', social: 'Hostel', side: 'Side' };
const STATUS_ICON = { open: '○', done: '✓', missed: '✗', expired: '–', skipped: '↷' };

const UI = {
  dlgState: null, menuOpen: false, popupState: null, hudCache: {}, textSpeed: 1, overlay: null, diff: 'standard',

  init() {
    this.buildHud();
    this.buildTouch();
    $('#dlg').addEventListener('click', () => this.advance());
    $('#btn-new').onclick = () => { AU.init(); this.showCreation(); };
    $('#btn-cont').onclick = () => { AU.init(); $('#title').hidden = true; if (!Game.loadGame()) this.showTitle(); };
    $('#btn-how').onclick = () => { $('#how').hidden = !$('#how').hidden; };
    $('#btn-start').onclick = () => this.creationSubmit();
    $('#btn-back').onclick = () => { $('#create').hidden = true; $('#title').hidden = false; };
    document.querySelectorAll('.pers').forEach((el) => el.addEventListener('click', () => this.selectPers(el.dataset.p)));
    document.querySelectorAll('.diff button').forEach((el) => el.addEventListener('click', () => this.selectDiff(el.dataset.d)));
    $('#pause-btn').onclick = () => this.togglePause();
    $('#nb-btn').onclick = () => { if (G.mode === 'play' && !G.cut && !G.dlg) this.openNotebook(); };
    $('#cal-btn').onclick = () => { if (G.mode === 'play' && !G.cut && !G.dlg) this.openPlanner(); };
    this.selectPers('owl'); this.selectDiff('standard');
    const prefs = safeStore('get', 'campusexe.prefs');
    if (prefs) { try { const p = JSON.parse(prefs); AU.setMusic(p.music !== false); AU.setSfx(p.sfx !== false); this.textSpeed = p.speed || 1; } catch (e) { /* ignore */ } }
  },

  /* ---------------- Title & creation ---------------- */
  showTitle() {
    G.mode = 'title';
    for (const id of ['#hud', '#side', '#dlg', '#wrapped', '#gameover', '#create', '#pause', '#popup', '#card', '#notebook', '#planner', '#mg-hud', '#study']) $(id).hidden = true;
    $('#title').hidden = false;
    const info = Game.saveInfo();
    const ok = Game.readSave().ok;
    $('#btn-cont').hidden = !ok;
    $('#save-info').textContent = info;
    $('#save-info').hidden = !info;
    $('#save-info').classList.toggle('bad', !ok && !!info);
    $('#touch').hidden = true; $('#pause-btn').hidden = true;
  },
  showCreation() { $('#title').hidden = true; $('#create').hidden = false; setTimeout(() => $('#pname').focus(), 50); },
  selectPers(p) { this.pers = p; document.querySelectorAll('.pers').forEach((el) => el.classList.toggle('sel', el.dataset.p === p)); },
  selectDiff(d) { this.diff = d; document.querySelectorAll('.diff button').forEach((el) => el.classList.toggle('sel', el.dataset.d === d)); $('#diff-note').textContent = d === 'relaxed' ? 'Collapsing from exhaustion sends you home with a penalty.' : 'Collapsing from exhaustion is a game over (you can load your last save).'; },
  creationSubmit() {
    if ($('#create').hidden) return;
    const name = ($('#pname').value || '').replace(/[<>]/g, '').trim().slice(0, 14) || 'Bunty';
    $('#pname').blur();
    $('#create').hidden = true;
    Game.newGame(name, this.pers || 'owl', this.diff);
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
      d.innerHTML = `<span class="ic">${ICONS[k]}</span><span class="lbl">${STAT_META[k].short}</span><b>0</b><span class="bar"><span></span></span>`;
      st.appendChild(d);
    }
  },
  hud() {
    if (!S) return;
    const c = this.hudCache, D = DAY();
    const day = D.wd.toUpperCase(), tm = fmtTime(S.time), sl = SLOTS[slotOf(S.time)];
    if (c.day !== S.day) {
      $('#h-day').textContent = day; $('#h-dayn').textContent = `Day ${S.day + 1}/${SEM_DAYS} · Wk ${D.week}`;
      const ph = PHASES[D.phase]; $('#h-phase').textContent = ph.name; $('#h-phase').style.background = ph.col; c.day = S.day;
    }
    if (c.tm !== tm) { $('#h-time').textContent = tm; c.tm = tm; }
    if (c.sl !== sl) { $('#h-slot').textContent = sl; $('#h-sun').className = 'sun s' + slotOf(S.time); c.sl = sl; }
    for (const k in S.stats) {
      const v = S.stats[k];
      if (c[k] !== v) {
        const el = document.querySelector(`.st[data-k="${k}"]`);
        el.querySelector('b').textContent = v;
        el.querySelector('.bar span').style.width = v + '%';
        el.classList.toggle('low', v <= 20 || (k === 'att' && v < ATT_RULES.endsemMin));
        c[k] = v;
      }
    }
    const ex = !!S.exhausted;
    if (c.ex !== ex) { document.querySelector('.st[data-k="energy"]').classList.toggle('exh', ex); c.ex = ex; }
    const obj = Story.objective();
    if (c.obj !== obj) { $('#obj').innerHTML = obj; c.obj = obj; }
    const dl = Story.deadlineText();
    if (c.dl !== dl) { $('#deadline').textContent = dl || ''; $('#deadline').hidden = !dl; c.dl = dl; }
    const nc = Story.nextClassText();
    if (c.nc !== nc) { $('#nextclass').textContent = nc; $('#nextclass').hidden = !nc; $('#nextclass').classList.toggle('now', nc.includes('NOW')); c.nc = nc; }
    // compact task list
    const ups = Tasks.upcoming(4).filter((t) => t.status === 'open').slice(0, 3);
    const sig = ups.map((t) => t.key + t.status).join('|') + (S.tasks || []).filter((t) => t.status === 'done').length;
    if (c.tasks !== sig) {
      c.tasks = sig;
      const done = (S.tasks || []).filter((t) => t.status === 'done').length, all = (S.tasks || []).length;
      $('#mini-tasks').innerHTML = `<div class="mt-h"><span>TODAY</span><em>${done}/${all} done</em></div>` + (ups.length ? ups.map((t) => `<div class="mt p${t.prio}"><i></i><span>${esc(fillTokens(t.title))}</span></div>`).join('') : '<div class="mt"><span>All clear. Go live a little.</span></div>');
    }
    $('#mini').hidden = !(G.map && G.map.id === 'campus' && G.showMini);
    $('#roomname').textContent = G.map && G.map.id !== 'campus' ? (G.map.loc ? locName(G.map.loc) : G.map.name) : '';
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

  /* ---------------- toasts & warnings ---------------- */
  locToast(name) { const el = $('#loc'); el.textContent = fillTokens(name); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); },
  notify(app, text) {
    AU.sfx('notif');
    if (S && G.mode === 'play') { S.notifLog = S.notifLog || []; S.notifLog.push({ d: S.day, t: S.time, app, text: fillTokens(text) }); if (S.notifLog.length > 30) S.notifLog.shift(); }
    const el = document.createElement('div'); el.className = 'notif';
    el.innerHTML = `<div class="napp"><span class="ndot"></span>${esc(app)}<em>now</em></div><div class="ntxt"></div>`;
    el.querySelector('.ntxt').textContent = fillTokens(text);
    this.pushToast(el, 4600);
  },
  warn(title, sub, level) {
    AU.sfx(level === 'urgent' ? 'alarm' : 'notif');
    const el = document.createElement('div'); el.className = 'notif warnb ' + (level || 'info');
    el.innerHTML = `<div class="wt"></div><div class="ws"></div>`;
    el.querySelector('.wt').textContent = fillTokens(title); el.querySelector('.ws').textContent = fillTokens(sub || '');
    this.pushToast(el, level === 'urgent' ? 5600 : 4800);
  },
  pushToast(el, ms) {
    const box = $('#notifs');
    while (box.children.length >= 3) box.firstChild.remove();
    box.appendChild(el);
    setTimeout(() => el.classList.add('out'), ms - 500);
    setTimeout(() => el.remove(), ms);
  },
  taskToast(t) {
    AU.sfx('up');
    const el = document.createElement('div'); el.className = 'notif warnb done';
    el.innerHTML = '<div class="wt"></div><div class="ws"></div>';
    el.querySelector('.wt').textContent = '✓ ' + fillTokens(t.title.replace(/ · \d+:\d+ [AP]M/, ''));
    el.querySelector('.ws').textContent = t.reward ? fillTokens(t.reward) : 'Task complete';
    this.pushToast(el, 3600);
  },
  saveToast(auto) { const el = $('#savechip'); el.textContent = auto ? 'Autosaved' : 'Game saved'; el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(this.svT); this.svT = setTimeout(() => { el.hidden = true; }, 2200); },
  hint(text, sec = 5) {
    const el = $('#hint'); el.innerHTML = fillTokens(text); el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.hintT); this.hintT = setTimeout(() => { el.hidden = true; }, sec * 1000);
  },

  /* ---------------- Dialogue ---------------- */
  speaker(who) {
    if (typeof who === 'string') { const c = CH[who] || CH.sys; return { name: typeof c.name === 'function' ? c.name() : c.name, look: c.look ? c.look() : null, pitch: c.pitch, bg: c.bg, phone: c.phone, me: c.me }; }
    return { name: who.name, look: who.look, pitch: who.pitch || 1, bg: who.bg || '#3a4a6a' };
  },
  say(who, text, expr) { return this.dialog(who, text, expr, null); },
  choose(who, text, opts, expr) { return this.dialog(who, text, expr, opts); },
  dialog(who, text, expr, opts) {
    const p = (this.dlgQ || Promise.resolve()).then(() => this._dialog(who, text, expr, opts));
    this.dlgQ = p.catch(() => {});
    return p;
  },
  _dialog(who, text, expr, opts) {
    const sp = this.speaker(who);
    text = fillTokens(text);
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
    if (opts) { const first = opts.findIndex((o) => !(typeof o === 'object' && o.dis)); this.dlgState.sel = Math.max(0, first); }
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
      b.innerHTML = `<span class="k">${i + 1}</span><span class="ct"></span>` + (op.hint ? '<span class="hn"></span>' : '');
      b.querySelector('.ct').textContent = fillTokens(op.t);
      if (op.hint) b.querySelector('.hn').textContent = fillTokens(op.hint);
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
      else if (st.sp.look) drawPortrait(pc, st.sp.look, st.expr, G.t);
    }
    if (G.mode === 'play') this.drawMini();
    if (!$('#create').hidden) this.drawPreviews(G.t);
    if (G.mode === 'title' && G.map) { G.cam.x = (Math.sin(G.t * 0.05) * 0.5 + 0.5) * (G.map.w - G.vw); G.cam.y = 120 + Math.sin(G.t * 0.08) * 60; }
    if (this.wrappedCv) this.drawWrappedChar();
    if (this.goCv) this.drawGameOver();
  },

  handleKey(k) {
    if (!$('#wrapped').hidden) { if (k === 'act' || k === 'right') this.wrappedNext(); if (k === 'left') this.wrappedPrev(); return true; }
    if (!$('#gameover').hidden) return true;
    if (this.choiceState) {
      const st = this.choiceState, n = st.opts.length;
      if (k === 'up' || k === 'left') { st.sel = (st.sel + n - 1) % n; this.renderChoiceCard(); AU.sfx('move'); }
      else if (k === 'down' || k === 'right') { st.sel = (st.sel + 1) % n; this.renderChoiceCard(); AU.sfx('move'); }
      else if (k === 'act') this.pickChoiceCard(st.sel);
      else if (k[0] === 'n' && k.length === 2 && +k[1] - 1 < n) this.pickChoiceCard(+k[1] - 1);
      return true;
    }
    if (this.popupState) { if (k === 'act') this.closePopup(); return true; }
    if (this.overlay) { if (k === 'pause' || k === 'act' || k === 'notes' || k === 'cal') this.closeOverlay(); if (this.overlay === 'notebook' || this.overlay === 'planner') { if (k === 'left' || k === 'right') this.overlay === 'notebook' ? this.openPlanner() : this.openNotebook(); } return true; }
    if (k === 'pause' && G.mode === 'play') { this.togglePause(); return true; }
    if (this.menuOpen) { this.menuKey(k); return true; }
    const st = this.dlgState;
    if (st) {
      if (st.opts && st.done) {
        if (k === 'up' || k === 'left') { st.sel = (st.sel + st.opts.length - 1) % st.opts.length; this.renderChoices(); AU.sfx('move'); }
        else if (k === 'down' || k === 'right') { st.sel = (st.sel + 1) % st.opts.length; this.renderChoices(); AU.sfx('move'); }
        else if (k === 'act') this.pickChoice(st.sel);
        else if (k[0] === 'n' && k.length === 2) { const i = +k[1] - 1; if (i < st.opts.length) this.pickChoice(i); }
        return true;
      }
      if (k === 'act') { this.advance(); return true; }
      return true;
    }
    if (!$('#title').hidden) { if (k === 'act') ($('#btn-cont').hidden ? $('#btn-new') : $('#btn-cont')).click(); return true; }
    if (!$('#create').hidden) {
      const order = ['owl', 'topper', 'broke'];
      if (k === 'left' || k === 'right') { const i = order.indexOf(this.pers); this.selectPers(order[(i + (k === 'left' ? 2 : 1)) % 3]); AU.sfx('move'); }
      if (k === 'act') this.creationSubmit();
      return true;
    }
    return false;
  },

  /* ---------------- Day card & daily plan ---------------- */
  card(day, title, sub) {
    const el = $('#card'), D = DAY(day);
    $('#card-n').textContent = `DAY ${day + 1} OF ${SEM_DAYS} · WEEK ${D.week} · ${PHASES[D.phase].name.toUpperCase()}`;
    $('#card-d').textContent = { Mon: 'MONDAY', Tue: 'TUESDAY', Wed: 'WEDNESDAY', Thu: 'THURSDAY', Fri: 'FRIDAY', Sat: 'SATURDAY', Sun: 'SUNDAY' }[D.wd];
    $('#card-t').textContent = title;
    $('#card-s').textContent = sub || '';
    el.style.setProperty('--ph', PHASES[D.phase].col);
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    AU.sfx('whoosh');
    return wait(2.6).then(() => { el.classList.add('hide'); return wait(0.5); }).then(() => { el.hidden = true; el.classList.remove('hide'); });
  },
  taskRow(t, full) {
    const when = t.start !== undefined ? fmtTime(t.start) : t.end !== undefined ? 'by ' + fmtTime(t.end) : 'any time';
    return `<li class="tk ${t.status} p${t.prio}${t.optional ? ' opt' : ''}"><span class="st-ic">${STATUS_ICON[t.status]}</span><div class="tk-b"><div class="tk-t">${esc(fillTokens(t.title))}</div>${full ? `<div class="tk-d">${esc(fillTokens(t.desc || ''))}</div>` : ''}<div class="tk-m"><span class="kind">${KIND_LABEL[t.kind] || 'Task'}</span><span>${when}</span><span>${esc(locName(t.loc))}</span><span class="pr">${PRIO[t.prio]}${t.optional ? ' · optional' : ''}</span></div>${full ? `<div class="tk-r">${t.reward ? '<b>+</b> ' + esc(fillTokens(t.reward)) : ''}${t.fail ? ' <i>−</i> ' + esc(fillTokens(t.fail)) : ''}</div>` : ''}</div></li>`;
  },
  dailyPlan() {
    const D = DAY();
    const list = Tasks.upcoming().filter((t) => t.status === 'open');
    const html = `<div class="plan"><div class="plan-h"><span>TODAY'S PLAN</span><b>${D.wd} · Day ${S.day + 1}</b></div><p class="plan-s">${esc(D.title)} — ${esc(PHASES[D.phase].name)}</p><ul class="tasks">${list.map((t) => this.taskRow(t, false)).join('')}</ul><p class="plan-f">Open the notebook any time with <kbd>N</kbd>. Optional tasks won't hurt you if skipped.</p></div>`;
    return this.popup(html, 'Let\'s go', 'planpop');
  },

  /* ---------------- Notebook & planner (pause the game) ---------------- */
  openOverlay(id) { this.overlay = id; G.paused = true; $('#' + id).hidden = false; AU.sfx('pop'); },
  closeOverlay() { if (!this.overlay) return; $('#' + this.overlay).hidden = true; this.overlay = null; G.paused = false; AU.sfx('pop'); },
  openNotebook() {
    if (this.overlay && this.overlay !== 'notebook') $('#' + this.overlay).hidden = true;
    const list = Tasks.upcoming();
    const D = DAY();
    $('#nb-body').innerHTML = `<div class="nb-h"><div><span class="kick">NOTEBOOK · ${D.wd.toUpperCase()} · DAY ${S.day + 1}</span><h2>${esc(D.title)}</h2></div><div class="nb-time">${fmtTime(S.time)}</div></div><ul class="tasks full">${list.map((t) => this.taskRow(t, true)).join('')}</ul>${this.msgHistory()}<div class="nb-f"><span><kbd>N</kbd>/<kbd>Esc</kbd> close</span><span><kbd>←</kbd><kbd>→</kbd> calendar</span><button id="nb-close">Close</button></div>`;
    $('#nb-close').onclick = () => this.closeOverlay();
    this.overlay = null; this.openOverlay('notebook');
  },
  msgHistory() {
    const log = (S.notifLog || []).filter((m) => m.d === S.day).slice(-6).reverse();
    if (!log.length) return '';
    return `<div class="nb-msgs"><div class="kick">TODAY'S MESSAGES</div>${log.map((m) => `<div class="nb-msg"><b>${esc(m.app)}</b> <em>${fmtTime(m.t)}</em><span>${esc(m.text)}</span></div>`).join('')}</div>`;
  },
  openPlanner() {
    if (this.overlay && this.overlay !== 'planner') $('#' + this.overlay).hidden = true;
    const cells = CALENDAR.map((d, i) => {
      const ph = PHASES[d.phase];
      const ev = [];
      const hidden = (c) => c.type === 'quiz' && d.tags.includes('surprise') && i > S.day; // surprises stay secret
      for (const c of d.classes) ev.push(hidden(c) ? '???' : c.type === 'lecture' ? COURSES[c.course].code : c.type === 'quiz' ? 'QUIZ' : c.type === 'mte' ? 'MTE ' + COURSES[c.course].code : 'FINAL');
      if (d.tags.includes('icebreak')) ev.push('ICEBREAK');
      if (d.nso) ev.push('NSO');
      if (i === ASSIGN_DUE_DAY) ev.push('DUE 11:59');
      if (d.tags.includes('pronite')) ev.push('PRONITE');
      if (d.tags.includes('waterfight')) ev.push('Water fight');
      const st = i < S.day ? 'past' : i === S.day ? 'today' : '';
      const title = d.tags.includes('surprise') && i > S.day ? 'A Normal Friday?' : d.title;
      return `<div class="cal-d ${st}" style="--ph:${ph.col}"><div class="cd-h"><b>${d.wd}</b><span>${i + 1}</span></div><div class="cd-t">${esc(title)}</div><div class="cd-e">${ev.map((e) => `<i>${esc(e)}</i>`).join('')}</div></div>`;
    }).join('');
    const up = [];
    for (let i = S.day; i < SEM_DAYS && up.length < 6; i++) {
      const d = DAY(i);
      if (d.tags.includes('icebreak')) up.push(`<li><b>Day ${i + 1} ${d.wd}</b> Icebreaking · ${fmtTime(ICEBREAK.start)} · ${esc(locName('plaza'))}</li>`);
      for (const c of d.classes) if (c.type !== 'lecture' && !(c.type === 'quiz' && d.tags.includes('surprise') && i > S.day)) up.push(`<li><b>Day ${i + 1} ${d.wd}</b> ${esc(Sched.label(c))} · ${fmtTime(c.start)}</li>`);
      if (i === ASSIGN_DUE_DAY && !S.flags.submitted) up.push(`<li><b>Day ${i + 1} ${d.wd}</b> Assignment 1 due · 11:59 PM</li>`);
      if (d.tags.includes('thomso') && !DAY(i - 1).tags.includes('thomso') && i > 0) up.push(`<li><b>Day ${i + 1} ${d.wd}</b> Thomso begins</li>`);
    }
    const legend = Object.values(PHASES).filter((p, i, a) => a.findIndex((q) => q.name === p.name) === i).map((p) => `<span><i style="background:${p.col}"></i>${p.name}</span>`).join('');
    $('#pl-body').innerHTML = `<div class="nb-h"><div><span class="kick">WEEK PLANNER · FICTIONAL, EDITABLE</span><h2>Your first week</h2></div><div class="nb-time">Day ${S.day + 1}/${SEM_DAYS}</div></div><div class="cal">${cells}</div><div class="cal-f"><div class="legend">${legend}</div><ul class="upc">${up.slice(0, 6).join('') || '<li>Nothing major ahead.</li>'}</ul></div><div class="nb-f"><span><kbd>C</kbd>/<kbd>Esc</kbd> close</span><span><kbd>←</kbd><kbd>→</kbd> notebook</span><button id="pl-close">Close</button></div>`;
    $('#pl-close').onclick = () => this.closeOverlay();
    this.overlay = null; this.openOverlay('planner');
  },

  /* ---------------- Time skip & sleep overlay ---------------- */
  async timeSkip(label, minutes, sfx) {
    if (minutes <= 0) return;
    const el = $('#skip');
    $('#skip-l').textContent = fillTokens(label);
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
    await wait(0.3);
    el.hidden = true;
  },
  async sleepOverlay(on, label) {
    const el = $('#sleepov');
    if (on) { el.hidden = false; $('#sleep-l').textContent = label || 'Sleeping...'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); await wait(1.4); el.hidden = true; }
    else el.hidden = true;
  },

  /* ---------------- Popup card ---------------- */
  popup(html, btn = 'Continue', cls = '', onShow) {
    const p = (this.dlgQ || Promise.resolve()).then(() => this._popup(html, btn, cls, onShow));
    this.dlgQ = p.catch(() => {});
    return p;
  },
  _popup(html, btn, cls, onShow) {
    const el = $('#popup');
    el.className = 'overlay ' + cls;
    $('#popup-body').innerHTML = html;
    $('#popup-btn').textContent = btn;
    el.hidden = false; G.dlg = true;
    $('#popup-btn').onclick = () => this.closePopup();
    if (onShow) setTimeout(onShow, 0);
    return new Promise((r) => { this.popupState = { r }; });
  },
  closePopup() {
    const st = this.popupState; if (!st) return;
    this.popupState = null; $('#popup').hidden = true; G.dlg = false; AU.sfx('confirm'); st.r();
  },

  /* ---------------- Mini-game HUD & study cards ---------------- */
  mgShow(g) {
    const el = $('#mg-hud');
    document.body.classList.toggle('in-mg', !!g);
    if (!g) { el.hidden = true; $('#touch').classList.remove('dance'); this.mgLast = ''; $('#hud').classList.remove('mg'); $('#side').classList.remove('mg'); return; }
    el.hidden = false;
    $('#mg-title').textContent = g.title; $('#mg-help').textContent = G.touchUI ? g.help.replace(/E\/Space|E /g, 'A ').replace(/WASD/g, 'Stick') : g.help;
    $('#hud').classList.add('mg'); $('#side').classList.add('mg');
    $('#touch').classList.toggle('dance', g.title.includes('DANCE'));
  },
  mgHud(html) { if (html !== this.mgLast) { $('#mg-score').innerHTML = html; this.mgLast = html; } },
  studyBuild(g) {
    const el = $('#study'); el.hidden = false;
    el.classList.toggle('tired', g.tired);
    const grid = $('#st-grid'); grid.innerHTML = '';
    g.cards.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.dataset.i = i;
      b.innerHTML = `<span class="fr ${c.kind}"></span><span class="bk">?</span>`;
      b.querySelector('.fr').textContent = c.txt;
      b.onclick = () => { g.sel = i; g.flip(i); this.studyRender(g); };
      grid.appendChild(b);
    });
    this.studyRender(g);
  },
  studyRender(g) {
    document.querySelectorAll('#st-grid .card').forEach((b, i) => {
      const c = g.cards[i];
      b.classList.toggle('up', c.up || c.done); b.classList.toggle('done', c.done); b.classList.toggle('sel', i === g.sel);
    });
  },
  studyClose() { $('#study').hidden = true; },

  /* ---------------- Pause / save / settings ---------------- */
  togglePause() {
    if (G.mode !== 'play') return;
    if (this.overlay) this.closeOverlay();
    this.menuOpen = !this.menuOpen; G.paused = this.menuOpen;
    $('#pause').hidden = !this.menuOpen;
    if (this.menuOpen) { this.menuSel = 0; this.menuView = 'main'; this.renderMenu(); }
    AU.sfx('pop');
  },
  renderMenu() {
    const m = $('#pause-menu');
    const prefsSave = () => safeStore('set', 'campusexe.prefs', JSON.stringify({ music: AU.musOn, sfx: AU.sfxOn, speed: this.textSpeed }));
    const go = (v, sel) => () => { this.menuView = v; this.menuSel = sel || 0; this.renderMenu(); };
    const canSave = G.cut === 0 && !G.dlg && !MG.cur;
    const hasSave = Game.readSave().ok;
    const views = {
      main: [['Resume', () => this.togglePause()],
        [canSave ? 'Save game' : 'Save game (finish the scene first)', () => { if (Game.save(false)) { this.menuMsg = 'Saved · ' + Game.saveInfo(); this.renderMenu(); } }],
        [hasSave ? 'Load last save' : 'Load last save (none yet)', () => { if (hasSave) { this.menuView = 'confirmLoad'; this.menuSel = 1; this.renderMenu(); } }],
        ['Notebook & calendar', () => { this.togglePause(); this.openNotebook(); }],
        ['Settings', go('settings')], ['Controls', go('controls')],
        ['Return to main menu', () => { if (Game.dirty()) go('confirmMenu', 0)(); else { this.togglePause(); Game.toTitle(); } }],
        ['End current run', go('confirmEnd', 1)], ['Quit game', go('quit')]],
      settings: [['Music: ' + (AU.musOn ? 'ON' : 'OFF'), () => { AU.setMusic(!AU.musOn); prefsSave(); this.renderMenu(); }], ['Sound effects: ' + (AU.sfxOn ? 'ON' : 'OFF'), () => { AU.setSfx(!AU.sfxOn); prefsSave(); this.renderMenu(); }], ['Text speed: ' + ['', 'Normal', 'Fast', 'Instant'][this.textSpeed], () => { this.textSpeed = this.textSpeed % 3 + 1; prefsSave(); this.renderMenu(); }], ['Minimap: ' + (G.showMini ? 'ON' : 'OFF'), () => { G.showMini = !G.showMini; this.renderMenu(); }], ['Difficulty: ' + (S.difficulty === 'relaxed' ? 'Relaxed' : 'Standard'), () => { S.difficulty = S.difficulty === 'relaxed' ? 'standard' : 'relaxed'; this.renderMenu(); }], ['Rename places', () => { this.menuView = 'rename'; this.menuSel = 0; this.renderMenu(); }], ['Back', go('main', 4)]],
      rename: [['Reset all names', () => { resetLocNames(); this.renderMenu(); }], ['Back', go('settings', 5)]],
      controls: [['Back', go('main', 5)]],
      confirmLoad: [['Yes, load the last save', () => { this.togglePause(); Game.loadGame(); }], ['No, keep playing', go('main', 2)]],
      confirmMenu: [['Save and go to main menu', () => { if (!Game.save(false)) return; this.togglePause(); Game.toTitle(); }], ['Go without saving (last save is kept)', () => { this.togglePause(); Game.toTitle(); }], ['Cancel', go('main', 6)]],
      confirmEnd: [['Yes, end this run and see my summary', () => { this.togglePause(); runScript(() => Game.endRun()); }], ['No, keep playing', go('main', 7)]],
      quit: [['Save and quit', () => { if (!Game.save(false)) return; this.togglePause(); Game.toTitle(); this.warn('Progress saved.', 'You can close this tab. Continue from the title screen next time.', 'info'); }], ['Quit without saving (last save is kept)', () => { this.togglePause(); Game.toTitle(); }], ['Cancel', go('main', 8)]],
    };
    const items = views[this.menuView];
    this.menuItems = items;
    $('#pause-title').textContent = { main: 'PAUSED', settings: 'SETTINGS', controls: 'CONTROLS', confirmLoad: 'LOAD LAST SAVE?', confirmMenu: 'UNSAVED PROGRESS', confirmEnd: 'END THIS RUN?', rename: 'RENAME PLACES', quit: 'QUIT?' }[this.menuView];
    const info = $('#pause-info');
    let html = '';
    if (this.menuView === 'main') html = `<p class="pi-s">Day ${S.day + 1}/${SEM_DAYS} · ${fmtTime(S.time)} · clock frozen${Chase.active() ? ` · headcount countdown frozen at ${Math.ceil(S.hc.left || 0)}s` : ''}</p>${this.menuMsg ? `<p class="pi-ok">${esc(this.menuMsg)}</p>` : hasSave ? `<p>Last save: ${esc(Game.saveInfo())}</p>` : ''}`;
    if (this.menuView === 'controls') html = '<p><kbd>WASD</kbd>/<kbd>Arrows</kbd> Move · <kbd>Shift</kbd> Run (auto-sprint when you\'re late)</p><p><kbd>E</kbd>/<kbd>Space</kbd> Interact & advance</p><p><kbd>1–5</kbd> Choices · <kbd>N</kbd> Notebook · <kbd>C</kbd> Calendar</p><p><kbd>M</kbd> Minimap · <kbd>Esc</kbd> Pause</p><p>Mini-games: Badminton ←/→ + E (↑ clear, ↓ drop, Shift smash) · Water fight: move + E/click · Dance-off: arrows</p>';
    if (this.menuView === 'confirmLoad') html = `<p>Load: ${esc(Game.saveInfo())}</p><p>Progress since then is lost.</p>`;
    if (this.menuView === 'confirmMenu') html = '<p>You have progress since your last save. Your save file is never deleted by returning to the menu.</p>';
    if (this.menuView === 'confirmEnd') html = '<p>Ends this run now and shows your Semester Wrapped summary. Your save file is <b>not</b> touched — you can still Continue it from the main menu.</p>';
    if (this.menuView === 'quit') html = '<p>In a browser, "quit" saves and returns to the title. Close the tab whenever you like.</p>';
    if (this.menuView === 'rename') html = '<p>Display names only. Quests, saves and navigation keep working.</p><div class="ren">' + Object.keys(LOCATIONS).map((id) => `<label><span>${esc(LOCATIONS[id].name)}</span><input data-loc="${id}" maxlength="32" value="${esc(locName(id))}" spellcheck="false"></label>`).join('') + '</div>';
    info.innerHTML = html; info.hidden = !html;
    this.menuMsg = '';
    info.querySelectorAll('input[data-loc]').forEach((inp) => {
      inp.addEventListener('change', () => { setLocName(inp.dataset.loc, inp.value); inp.value = locName(inp.dataset.loc); UI.hudCache = {}; });
      inp.addEventListener('keydown', (e) => e.stopPropagation());
    });
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
    let id = null, cx = 0, cy = 0, lastDir = null;
    stick.addEventListener('pointerdown', (e) => { id = e.pointerId; const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick.setPointerCapture(id); move(e); });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), max = 40;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      G.touch.dx = Math.abs(dx) > 8 ? dx / max : 0; G.touch.dy = Math.abs(dy) > 8 ? dy / max : 0;
      const dir = d > 24 ? (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down')) : null;
      if (dir && dir !== lastDir) { if (!this.handleKey(dir)) G.pressed[dir] = true; }
      lastDir = dir;
    };
    stick.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== id) return; id = null; lastDir = null; knob.style.transform = ''; G.touch.dx = G.touch.dy = 0; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    $('#abtn').addEventListener('pointerdown', (e) => { e.preventDefault(); AU.init(); if (!this.handleKey('act')) G.pressed.act = true; });
    document.querySelectorAll('#arrows button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); G.pressed[b.dataset.k] = true; }));
  },
  showGameUI(on) {
    $('#hud').hidden = !on; $('#side').hidden = !on;
    $('#touch').hidden = !(on && G.touchUI);
    $('#pause-btn').hidden = !on;
  },

  /* ---------------- Choice cards (festival dilemmas) ---------------- */
  cardChoice(title, text, opts) {
    const p = (this.dlgQ || Promise.resolve()).then(() => new Promise((r) => {
      const el = $('#choicecard');
      $('#cc-title').textContent = fillTokens(title); $('#cc-text').textContent = fillTokens(text);
      el.hidden = false; G.dlg = true; AU.sfx('whoosh');
      this.choiceState = { opts, sel: 0, r };
      this.renderChoiceCard();
    }));
    this.dlgQ = p.catch(() => {});
    return p;
  },
  renderChoiceCard() {
    const st = this.choiceState; if (!st) return;
    const box = $('#cc-opts'); box.innerHTML = '';
    st.opts.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'cc-o' + (i === st.sel ? ' sel' : '');
      b.innerHTML = `<span class="k">${i + 1}</span><span class="ct"></span><span class="hn"></span>`;
      b.querySelector('.ct').textContent = fillTokens(o.t); b.querySelector('.hn').textContent = o.hint || '';
      b.onclick = () => this.pickChoiceCard(i);
      box.appendChild(b);
    });
  },
  pickChoiceCard(i) {
    const st = this.choiceState; if (!st) return;
    this.choiceState = null; $('#choicecard').hidden = true; G.dlg = false; AU.sfx('confirm'); st.r(i);
  },

  /* ---------------- Headcount chase HUD & sprint chip ---------------- */
  sprintChip(on) { const el = $('#sprintchip'); if (el) el.hidden = !on || Chase.active(); },
  chaseShow(on) { const el = $('#chase'); if (!el) return; el.hidden = !on; document.body.classList.toggle('in-chase', !!on); this.chaseLast = ''; },
  chaseHud(h) {
    const left = Math.max(0, h.left), k = h.total ? left / h.total : 0;
    const sig = left.toFixed(1) + h.phase + (h.strikes || 0);
    if (sig === this.chaseLast) return; this.chaseLast = sig;
    $('#ch-time').textContent = left.toFixed(1) + 's';
    const bar = $('#ch-bar i'); bar.style.width = (k * 100) + '%'; bar.classList.toggle('low', k < 0.3);
    $('#ch-phase').innerHTML = h.phase === 'stealth' ? `Sneak to the glowing seat · freeze when he turns${h.strikes ? ` · <b>${h.strikes}/2 spotted</b>` : ''}` : `Run to <b>${esc(locName('lecture'))}</b> · follow the red arrow`;
  },
  chaseReady(txt) { const el = $('#ch-ready'); if (!el) return; if (!txt) { el.hidden = true; return; } el.textContent = txt; el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); },

  /* ---------------- Laptop (bug squash) ---------------- */
  laptopBuild(g) {
    const el = $('#laptop'); el.hidden = false; el.classList.toggle('tired', !!g.tired);
    const grid = $('#lp-grid'); grid.innerHTML = '';
    g.cells.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'lp-c'; b.dataset.i = i;
      b.innerHTML = '<code></code><span class="bug"></span>';
      b.querySelector('code').textContent = c.txt;
      b.onpointerdown = (e) => { e.preventDefault(); g.sel = i; g.tap(i); };
      grid.appendChild(b);
    });
    this.laptopRender(g);
  },
  laptopRender(g) {
    $('#laptop').classList.toggle('frozen', g.freeze > 0);
    document.querySelectorAll('#lp-grid .lp-c').forEach((b, i) => {
      const c = g.cells[i];
      b.className = 'lp-c' + (c.kind ? ' ' + c.kind : '') + (i === g.sel ? ' sel' : '');
      b.querySelector('.bug').textContent = c.kind === 'bug' ? '🐛' : c.kind === 'reel' ? '📱 reel' : c.kind === 'fixed' ? '✓' : '';
    });
  },
  laptopClose() { $('#laptop').hidden = true; },

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
    drawChar(c, { x: u / 2, y: u * 0.78, look: G.player.look, dir: 'down', pose: cvs.dataset.pose || 'dance', expr: 'happy', phase: 0 }, G.t);
    if (fr) {
      drawChar(c, { x: 10, y: u * 0.8, look: LOOKS.rahul, dir: 'down', pose: 'dance', expr: 'happy', phase: 1 }, G.t);
      drawChar(c, { x: u - 10, y: u * 0.8, look: LOOKS.priya, dir: 'down', pose: 'cheer', expr: 'happy', phase: 2 }, G.t);
    }
    c.restore();
  },

  /* ---------------- Game over ---------------- */
  gameOver(title, line, stamp) {
    MG.cur = null; this.mgShow(null);
    $('#gameover').hidden = false; G.dlg = true;
    this.showGameUI(false);
    $('#go-title').textContent = title; $('#go-line').textContent = line;
    this.goStamp = stamp || title; this.goCv = $('#go-cv'); this.goT0 = G.t; this.goKind = title;
    AU.play(null); AU.sfx('gameover');
    const has = Game.readSave().ok;
    $('#go-load').hidden = !has;
    $('#go-load').onclick = () => { this.goCv = null; Game.loadGame(); };
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
    if (this.goKind === 'COLLAPSED') {
      R(c, 34, 40, 52, 14, '#e8e8f0'); R(c, 34, 38, 52, 3, '#ffffff'); R(c, 36, 54, 3, 8, '#888'); R(c, 81, 54, 3, 8, '#888');
      drawChar(c, { x: 64, y: 48, look: G.player.look, dir: 'down', pose: 'sleep', expr: 'sleep', bedW: 30, phase: 0 }, G.t);
      R(c, 92, 20, 2, 36, '#aaa'); R(c, 88, 18, 10, 8, '#cfe8ff');
      drawChar(c, { x: 20, y: 60, look: { skin: '#d49770', hair: '#222', style: 'bun', shirt: '#ffffff', shirt2: '#dddddd', pants: '#ffffff', shoes: '#eee' }, dir: 'right', pose: 'point', expr: 'angry', phase: 0 }, G.t);
    } else {
      drawChar(c, { x: 40, y: 56, look: LOOKS.prof, dir: 'right', pose: t > 1.2 && t < 1.6 ? 'stand' : 'point', expr: 'angry', phase: 0 }, G.t);
      drawChar(c, { x: 78, y: 58, look: G.player.look, dir: 'left', pose: t > 1.4 ? 'tired' : 'stand', expr: t > 1.4 ? 'shock' : 'normal', sweat: true, phase: 0 }, G.t);
    }
    if (t > 1.3) { const k = Math.min(1, (t - 1.3) * 4); c.save(); c.translate(60, 22); c.rotate(-0.15); c.scale(2.2 - k * 1.2, 2.2 - k * 1.2); c.globalAlpha = k; R(c, -30, -8, 60, 16, '#c0392b'); R(c, -28, -6, 56, 12, '#fff4dc'); c.restore(); }
    c.restore();
    if (t > 1.3 && !this.goStamped) { this.goStamped = true; AU.sfx('stamp'); }
    if (t < 1.3) this.goStamped = false;
    if (t > 1.5) { c.save(); c.translate(cvs.width / 2, cvs.width * 22 / 120); c.rotate(-0.15); c.font = `700 ${Math.round(cvs.width / 19)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#c0392b'; c.fillText(this.goStamp || 'DEBARRED', 0, 1); c.restore(); }
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

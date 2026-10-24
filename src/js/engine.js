'use strict';
/* ===== Engine: loop, input, actors, camera, render, scripting helpers ===== */
const G = {
  t: 0, map: null, actors: [], player: null,
  cam: { x: 0, y: 0 }, camTarget: null, camSnap: true,
  mode: 'title', cut: 0, paused: false, dlg: false,
  timers: [], tweens: [], floats: [], parts: [],
  darkness: 0, alarmRing: false, alarmFallen: false, laptopOn: false,
  papers: [], board: 0, shake: 0, fade: 1, interact: null, doorCD: 0,
  vw: 480, vh: 270, scale: 3, offX: 0, offY: 0,
  keys: {}, pressed: {}, touch: { dx: 0, dy: 0 }, stepT: 0, clockAcc: 0, needRepop: false,
  lastSlot: -1, showMini: true, stageLights: false,
};
let S = null; // story/save state
G.actorById = (id) => G.actors.find((a) => a.id === id);

let cv, ctx, buf, bctx;

function makeActor(o) {
  return Object.assign({ id: '', name: '', look: null, x: 0, y: 0, dir: 'down', pose: 'stand', expr: 'normal',
    moving: false, walkT: 0, phase: Math.random() * 6, speed: 60, path: null, res: null,
    talk: null, chatter: null, chatT: rand(3, 9), wander: null, wanderT: rand(1, 4), emote: null, bubble: null,
    solid: true, visible: true, scripted: false }, o);
}

/* ---------- timing helpers ---------- */
function wait(sec) { return new Promise((r) => G.timers.push({ t: sec, r })); }
function tween(obj, key, to, dur) {
  return new Promise((r) => G.tweens.push({ obj, key, from: obj[key], to, dur, t: 0, r }));
}
function fadeOut(d = 0.35) { return tween(G, 'fade', 1, d); }
function fadeIn(d = 0.35) { return tween(G, 'fade', 0, d); }

/* ---------- actor scripting ---------- */
function walk(a, pts, speed) {
  if (!a) return Promise.resolve();
  if (!Array.isArray(pts[0])) pts = [pts];
  a.path = pts.map(([x, y]) => ({ x, y }));
  a.speed = speed || 62;
  a.pose = a.pose === 'sit' || a.pose === 'sleep' ? 'stand' : a.pose;
  return new Promise((r) => { a.res = r; });
}
function face(a, dir) { if (a) a.dir = dir; }
function faceTo(a, b) {
  if (!a || !b) return;
  const dx = b.x - a.x, dy = b.y - a.y;
  a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
}
function emote(a, e, sec = 1.4) { if (a) a.emote = { e, until: G.t + sec, start: G.t }; }
function bubble(a, text, sec = 2.4) { if (a) a.bubble = { text, until: G.t + sec, start: G.t }; }
function shake(amt = 4) { G.shake = amt; }

function spawn(o) {
  let a = G.actorById(o.id);
  if (a) { Object.assign(a, o); return a; }
  a = makeActor(o); G.actors.push(a); return a;
}
function despawn(id) { G.actors = G.actors.filter((a) => a.id !== id || a === G.player); }

function gotoMap(id, x, y, dir) {
  const prevVH = (G.map && G.map.viewH) || 270;
  G.map = MAPS[id];
  if ((G.map.viewH || 270) !== prevVH) resize();
  G.player.x = x; G.player.y = y; G.player.dir = dir || G.player.dir; G.player.path = null;
  G.player.pose = 'stand'; G.player.moving = false;
  G.camTarget = null; G.camSnap = true; G.papers = []; G.board = 0;
  populate();
  G.doorCD = 0.6;
}

function populate() {
  G.actors = [G.player];
  const list = Story.populate(G.map.id) || [];
  for (const o of list) G.actors.push(makeActor(o));
  G.needRepop = false;
}

/* ---------- script runner ---------- */
async function runScript(fn) {
  G.cut++;
  try { await fn(); } catch (e) { console.error('script error', e); }
  finally {
    G.cut = Math.max(0, G.cut - 1);
    if (G.cut === 0) { G.player.path = null; if (G.player.pose !== 'tired') G.player.pose = 'stand'; G.camTarget = null; Story.afterScript(); }
  }
}

/* ---------- stats ---------- */
const STAT_META = {
  acad: { name: 'Academics', col: '#7fb8ff' }, att: { name: 'Attendance', col: '#8ef0a0' },
  energy: { name: 'Energy', col: '#ffd23f' }, money: { name: 'Money', col: '#ffb067' }, social: { name: 'Social', col: '#ff8fc0' },
};
function stat(ch, src) {
  let k = 0, ups = 0, downs = 0;
  const p = src || G.player;
  for (const key in ch) {
    const v = ch[key]; if (!v) continue;
    const before = S.stats[key];
    S.stats[key] = clamp(Math.round(before + v), 0, 100);
    const real = S.stats[key] - before;
    if (key === 'money' && real < 0) S.counters.spent += -real;
    const meta = STAT_META[key];
    const txt = (v > 0 ? '+' : '') + v + ' ' + meta.name + (real !== v ? (S.stats[key] === 100 ? ' (max)' : S.stats[key] === 0 ? ' (empty)' : '') : '');
    G.floats.push({ x: p.x, y: p.y - 26, text: txt, col: v > 0 ? meta.col : '#ff6b7f', t: -k * 0.35, life: 1.9 });
    UI.flashStat(key, v > 0);
    k++; if (v > 0) ups++; else downs++;
  }
  if (k) AU.sfx(ups >= downs ? 'up' : 'down');
}

/* ---------- time ---------- */
function setTime(min) {
  S.time = min;
  const sl = slotOf(S.time);
  if (sl !== G.lastSlot) { G.lastSlot = sl; G.needRepop = true; Story.onSlot(sl); }
}
function addTime(min) { setTime(S.time + min); }

/* ---------- input ---------- */
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', KeyE: 'act', Space: 'act', Enter: 'act', NumpadEnter: 'act', Escape: 'pause', KeyP: 'pause', KeyM: 'map',
  Digit1: 'n1', Digit2: 'n2', Digit3: 'n3', Digit4: 'n4',
};
function initInput() {
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (document.activeElement && document.activeElement.tagName === 'INPUT') { if (e.code === 'Enter') UI.creationSubmit(); return; }
    if (!k) return;
    if (['up', 'down', 'left', 'right', 'act'].includes(k)) e.preventDefault();
    if (!G.keys[k]) G.pressed[k] = true;
    G.keys[k] = true;
    if (UI.handleKey(k)) { G.pressed[k] = false; return; }
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) G.keys[k] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });
}
function consume(k) { if (G.pressed[k]) { G.pressed[k] = false; return true; } return false; }

/* ---------- collision ---------- */
function blocked(x, y, self) {
  const m = G.map;
  if (x < 4 || y < 6 || x > m.w - 4 || y > m.h - 1) return true;
  const box = { x: x - 4, y: y - 4, w: 8, h: 4 };
  for (const s of m.solids) { if (s.when && !s.when()) continue; if (rectsOverlap(box, s)) return true; }
  for (const a of G.actors) {
    if (a === self || !a.solid || !a.visible || a.pose === 'sleep') continue;
    if (rectsOverlap(box, { x: a.x - 4, y: a.y - 3, w: 8, h: 3 })) return true;
  }
  return false;
}

/* ---------- update ---------- */
function update(dt) {
  G.t += dt;
  for (let i = G.timers.length - 1; i >= 0; i--) { const tm = G.timers[i]; tm.t -= dt; if (tm.t <= 0) { G.timers.splice(i, 1); tm.r(); } }
  for (let i = G.tweens.length - 1; i >= 0; i--) { const tw = G.tweens[i]; tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.obj[tw.key] = lerp(tw.from, tw.to, k); if (k >= 1) { G.tweens.splice(i, 1); tw.r(); } }
  if (G.mode === 'title' && G.map) { updateParticles(dt); return; }
  if (G.mode !== 'play' || !G.map) return;

  if (G.needRepop && G.cut === 0) populate();
  G.doorCD = Math.max(0, G.doorCD - dt);

  const free = G.cut === 0 && !G.dlg;
  if (free) updatePlayer(dt); else if (!G.player.path) G.player.moving = false;

  for (const a of G.actors) updateActor(a, dt, free);

  // clock
  if (free) {
    G.clockAcc += dt;
    if (G.clockAcc >= 0.5) { G.clockAcc -= 0.5; addTime(1); }
    Story.tick(dt);
  }

  // interaction target
  G.interact = free ? findInteract() : null;
  if (free && consume('act') && G.interact) { AU.sfx('confirm'); const it = G.interact; runScript(() => it.act()); }
  G.pressed.act = false;
  if (consume('map')) G.showMini = !G.showMini;

  updateCamera(dt);
  updateParticles(dt);
  for (let i = G.floats.length - 1; i >= 0; i--) { const f = G.floats[i]; f.t += dt; if (f.t > f.life) G.floats.splice(i, 1); }
  G.shake = Math.max(0, G.shake - dt * 12);
  UI.hud();
}

function updatePlayer(dt) {
  const p = G.player;
  let dx = 0, dy = 0;
  if (G.keys.left) dx -= 1; if (G.keys.right) dx += 1; if (G.keys.up) dy -= 1; if (G.keys.down) dy += 1;
  if (G.touch.dx || G.touch.dy) { dx = G.touch.dx; dy = G.touch.dy; }
  const tiredPose = S.stats.energy < 18;
  if (dx || dy) {
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const run = G.keys.run;
    const sp = (run ? 108 : 70) * (tiredPose ? 0.72 : 1);
    const nx = p.x + dx * sp * dt, ny = p.y + dy * sp * dt;
    let moved = 0;
    if (!blocked(nx, p.y, p)) { moved += Math.abs(nx - p.x); p.x = nx; }
    if (!blocked(p.x, ny, p)) { moved += Math.abs(ny - p.y); p.y = ny; }
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    p.moving = moved > 0.01;
    p.pose = 'stand';
    if (p.moving) {
      p.walkT += dt * (run ? 1.5 : 1);
      S.counters.steps += moved / 12;
      G.stepT -= dt * (run ? 1.5 : 1);
      if (G.stepT <= 0) { G.stepT = 0.28; AU.sfx('step'); }
    }
    // doors
    if (G.doorCD <= 0) {
      const box = { x: p.x - 4, y: p.y - 4, w: 8, h: 4 };
      for (const d of G.map.doors) if (rectsOverlap(box, d)) { useDoor(d); break; }
    }
  } else {
    p.moving = false;
    p.pose = tiredPose ? 'tired' : 'stand';
  }
}

function useDoor(d) {
  G.doorCD = 1;
  runScript(async () => {
    if (!(await Story.canEnter(d))) { G.player.y += d.to === 'campus' ? -6 : 8; return; }
    AU.sfx('door');
    await fadeOut(0.25);
    gotoMap(d.to, d.sx, d.sy, d.to === 'campus' ? 'down' : 'up');
    UI.locToast(G.map.name);
    await fadeIn(0.25);
    await Story.onEnter(d.to);
  });
}

function updateActor(a, dt, free) {
  if (a.path && a.path.length) {
    const tg = a.path[0];
    const dx = tg.x - a.x, dy = tg.y - a.y, d = Math.hypot(dx, dy);
    const step = a.speed * dt;
    if (d <= step) { a.x = tg.x; a.y = tg.y; a.path.shift(); }
    else { a.x += dx / d * step; a.y += dy / d * step; }
    if (d > 0.5) a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    a.moving = true; a.walkT += dt * (a.speed / 62);
    if (a === G.player) { G.stepT -= dt; if (G.stepT <= 0) { G.stepT = 0.3; AU.sfx('step'); } }
    if (!a.path.length) { a.path = null; a.moving = false; const r = a.res; a.res = null; if (r) r(); }
  } else if (a !== G.player) {
    a.moving = false;
    if (a.wander && !a.scripted) {
      a.wanderT -= dt;
      if (a.wanderT <= 0) {
        a.wanderT = rand(1.5, 5);
        const w = a.wander;
        const tx = w.x + Math.random() * w.w, ty = w.y + Math.random() * w.h;
        if (!blocked(tx, ty, a) && dist(a.x, a.y, G.player.x, G.player.y) > 14) { a.path = [{ x: tx, y: ty }]; a.speed = a.wspeed || 26; }
      }
    }
    if (a.chatter && free) {
      a.chatT -= dt;
      if (a.chatT <= 0) {
        a.chatT = rand(7, 15);
        if (dist(a.x, a.y, G.player.x, G.player.y) < 150 && !a.bubble) bubble(a, typeof a.chatter === 'function' ? a.chatter() : pick(a.chatter), 3);
      }
    }
  }
  if (a.emote && G.t > a.emote.until) a.emote = null;
  if (a.bubble && G.t > a.bubble.until) a.bubble = null;
}

function findInteract() {
  const p = G.player;
  const fx = p.x + (p.dir === 'left' ? -8 : p.dir === 'right' ? 8 : 0), fy = p.y - 4 + (p.dir === 'up' ? -8 : p.dir === 'down' ? 6 : 0);
  let best = null, bd = 1e9;
  for (const o of G.map.objs) {
    if (o.cond && !o.cond()) continue;
    const d = dist(fx, fy, o.x, o.y);
    if (d < (o.r || 16) && d < bd) { bd = d; best = { x: o.x, y: o.y - 14, label: typeof o.label === 'function' ? o.label() : o.label, act: o.act }; }
  }
  for (const a of G.actors) {
    if (a === p || !a.talk || !a.visible) continue;
    const d = dist(fx, fy, a.x, a.y - 4);
    if (d < 20 && d < bd) { bd = d; best = { x: a.x, y: a.y - 30, label: 'Talk to ' + a.name, act: async () => { const pd = a.dir; if (a.pose === 'stand') faceTo(a, p); faceTo(p, a); await a.talk(a); if (a.pose === 'stand') a.dir = pd; } }; }
  }
  return best;
}

function updateCamera(dt) {
  const m = G.map, p = G.player;
  const tx = G.camTarget ? G.camTarget.x : p.x, ty = G.camTarget ? G.camTarget.y : p.y - 10;
  let cx = tx - G.vw / 2, cy = ty - G.vh / 2;
  cx = m.w <= G.vw ? (m.w - G.vw) / 2 : clamp(cx, 0, m.w - G.vw);
  cy = m.h <= G.vh ? (m.h - G.vh) / 2 : clamp(cy, 0, m.h - G.vh);
  if (G.camSnap) { G.cam.x = cx; G.cam.y = cy; G.camSnap = false; }
  else { const k = 1 - Math.pow(0.002, dt); G.cam.x = lerp(G.cam.x, cx, k); G.cam.y = lerp(G.cam.y, cy, k); }
}

/* ---------- particles ---------- */
function updateParticles(dt) {
  const m = G.map; if (!m) return;
  const camR = { x: G.cam.x, y: G.cam.y, w: G.vw, h: G.vh };
  if (m.id === 'campus') {
    if (G.darkness < 0.25 && Math.random() < dt * 1.2) G.parts.push({ x: camR.x + Math.random() * camR.w, y: camR.y - 4, vx: rand(8, 18), vy: rand(10, 18), life: 6, t: 0, kind: 'leaf', col: pick(['#5cb85a', '#e8452c', '#f7d14a']) });
    if (G.darkness > 0.3 && Math.random() < dt * 3) G.parts.push({ x: camR.x + Math.random() * camR.w, y: camR.y + Math.random() * camR.h, vx: rand(-4, 4), vy: rand(-4, 4), life: 3, t: 0, kind: 'fly', col: '#f6ff8a' });
    if (S.day === 3 && S.time >= 1020 && Math.random() < dt * 14) G.parts.push({ x: T(21) + Math.random() * T(18), y: T(26), vx: rand(-10, 10), vy: rand(14, 30), life: 4, t: 0, kind: 'confetti', col: pick(['#ff4f7b', '#ffd23f', '#2ec4b6', '#7a5cff', '#ffffff']) });
    for (const e of m.emitters || []) if (Math.random() < dt * 3) G.parts.push({ x: e.x + rand(-2, 2), y: e.y, vx: rand(2, 6), vy: rand(-12, -8), life: 2.2, t: 0, kind: 'smoke', col: '#ffffff' });
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i]; q.t += dt;
    if (q.kind === 'leaf') { q.x += (q.vx + Math.sin(q.t * 3) * 10) * dt; q.y += q.vy * dt; }
    else if (q.kind === 'fly') { q.vx += rand(-20, 20) * dt; q.vy += rand(-20, 20) * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    else { q.x += q.vx * dt; q.y += q.vy * dt; if (q.kind === 'confetti') q.vx *= 0.99; }
    if (q.t > q.life) G.parts.splice(i, 1);
  }
  if (G.parts.length > 260) G.parts.splice(0, G.parts.length - 260);
}

/* ---------- lighting ---------- */
function skyState(min) {
  const h = ((min % 1440) + 1440) % 1440 / 60;
  let dark = 0, tint = '0,0,0', ta = 0;
  if (h >= 5 && h < 7) { dark = lerp(0.5, 0.08, (h - 5) / 2); tint = '255,170,200'; ta = 0.08; }
  else if (h >= 7 && h < 10) { dark = 0; tint = '255,214,150'; ta = lerp(0.08, 0, (h - 7) / 3); }
  else if (h >= 10 && h < 16) { dark = 0; }
  else if (h >= 16 && h < 18.5) { dark = lerp(0, 0.12, (h - 16) / 2.5); tint = '255,150,60'; ta = lerp(0.04, 0.18, (h - 16) / 2.5); }
  else if (h >= 18.5 && h < 20.5) { dark = lerp(0.12, 0.55, (h - 18.5) / 2); tint = '200,90,160'; ta = lerp(0.18, 0.05, (h - 18.5) / 2); }
  else { dark = 0.58; }
  return { dark, tint, ta };
}
function skyColor(min) {
  const h = ((min % 1440) + 1440) % 1440 / 60;
  if (h >= 7 && h < 16) return '#8ec8f2';
  if (h >= 16 && h < 18.5) return '#f2a86a';
  if (h >= 18.5 && h < 20.5) return '#7a5a9a';
  if (h >= 5 && h < 7) return '#d8a0c0';
  return '#1a2048';
}

function applyLighting(c) {
  const st = skyState(S.time);
  const inside = G.map.interior;
  const dark = inside ? st.dark * 0.45 : st.dark;
  G.darkness = st.dark;
  if (st.ta > 0 && !inside) { c.fillStyle = `rgba(${st.tint},${st.ta})`; c.fillRect(0, 0, G.vw, G.vh); }
  if (dark > 0.01) {
    c.fillStyle = `rgba(10,14,46,${dark})`; c.fillRect(0, 0, G.vw, G.vh);
    c.globalCompositeOperation = 'lighter';
    const cx = Math.round(G.cam.x), cy = Math.round(G.cam.y);
    const lights = G.map.lights.slice();
    if (G.stageLights) lights.push({ x: T(30), y: T(28), r: 90, col: pick(['255,80,140', '80,200,255', '255,210,80', '150,100,255']) });
    for (const l of lights) {
      if (l.when && !l.when()) continue;
      const x = l.x - cx, y = l.y - cy;
      if (x < -l.r || y < -l.r || x > G.vw + l.r || y > G.vh + l.r) continue;
      const g = c.createRadialGradient(x, y, 0, x, y, l.r);
      const a = Math.min(0.55, dark * 0.9);
      g.addColorStop(0, `rgba(${l.col},${a})`); g.addColorStop(1, `rgba(${l.col},0)`);
      c.fillStyle = g; c.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    }
    c.globalCompositeOperation = 'source-over';
  }
}

/* ---------- render ---------- */
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.floor(window.innerWidth * dpr), H = Math.floor(window.innerHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const VH = (G.map && G.map.viewH) || 270, maxW = VH * 2.25, minW = Math.min(300, VH * 1.15);
  let s = H / VH, vw = W / s;
  if (vw > maxW) { vw = maxW; s = Math.min(W / maxW, H / VH); }
  let vh = VH;
  if (vw < minW) { vw = minW; s = W / minW; vh = Math.min(Math.round(VH * 1.9), Math.floor(H / s)); }
  G.vw = Math.round(vw); G.vh = vh; G.scale = s; G.dpr = dpr;
  G.offX = Math.round((W - G.vw * s) / 2); G.offY = Math.round((H - G.vh * s) / 2);
  buf.width = G.vw; buf.height = G.vh;
  G.camSnap = true;
}

function render() {
  ctx.fillStyle = '#0f0d1a'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G.map || !S) return;
  const c = bctx; c.imageSmoothingEnabled = false;
  c.fillStyle = '#14121f'; c.fillRect(0, 0, G.vw, G.vh);
  const sx = G.shake ? Math.round(rand(-G.shake, G.shake)) : 0, sy = G.shake ? Math.round(rand(-G.shake, G.shake)) : 0;
  const cx = Math.round(G.cam.x) + sx, cy = Math.round(G.cam.y) + sy;
  const m = G.map, t = G.t;
  c.save(); c.translate(-cx, -cy);
  c.drawImage(m.bg, 0, 0);
  if (m.id === 'hostel') { R(c, 142, 8, 36, 18, skyColor(S.time)); const night = G.darkness > 0.3; if (night) { blob(c, 168, 14, 3, '#fff6c8'); R(c, 148, 12, 1, 1, '#fff'); R(c, 156, 20, 1, 1, '#fff'); } else blob(c, 166, 15, 3, '#fff2a0'); R(c, 159, 8, 2, 18, '#6e5232'); R(c, 142, 16, 36, 1, '#6e5232'); }
  if (m.id === 'lecture' && G.board > 0) drawBoard(c, G.board);

  const list = [];
  for (const p of m.props) { if (p.when && !p.when()) continue; if (p.x < cx - 80 || p.x > cx + G.vw + 80 || p.y < cy - 20 || p.y > cy + G.vh + 70) continue; list.push(p); }
  for (const a of G.actors) if (a.visible) list.push(a);
  const key = (o) => (o.sortY !== undefined ? o.sortY : o.pose === 'sleep' ? o.y + 14 : o.y);
  list.sort((a, b) => key(a) - key(b));
  for (const o of list) {
    if (o.kind) { if (o.draw) o.draw(c, o.x, o.y, t, o); else PROP[o.kind](c, o.x, o.y, t, o); }
    else if (o.drawFn) o.drawFn(c, o, t); else drawChar(c, o, t);
  }
  for (const tp of m.top || []) PROP[tp.kind](c, tp.x, tp.y, t, tp);
  for (const b of m.overhead) { if (b.when && !b.when()) continue; drawBunting(c, b, t); }
  for (const q of G.parts) {
    if (q.kind === 'smoke') { c.fillStyle = `rgba(240,240,240,${0.5 * (1 - q.t / q.life)})`; c.fillRect(Math.round(q.x), Math.round(q.y), 3, 3); }
    else if (q.kind === 'fly') { c.fillStyle = (Math.floor((q.t + q.x) * 4) % 2) ? q.col : 'rgba(246,255,138,.4)'; c.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
    else { c.fillStyle = q.col; c.fillRect(Math.round(q.x), Math.round(q.y), q.kind === 'confetti' ? 2 : 2, q.kind === 'confetti' ? 1 + (Math.floor(q.t * 8) % 2) : 1); }
  }
  c.restore();
  applyLighting(c);
  if (G.fade > 0) { c.fillStyle = `rgba(12,10,24,${G.fade})`; c.fillRect(0, 0, G.vw, G.vh); }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, 0, 0, G.vw, G.vh, G.offX, G.offY, Math.round(G.vw * G.scale), Math.round(G.vh * G.scale));
  if (G.fade < 0.95) drawOverlay(cx, cy);
}

function drawBunting(c, b, t) {
  const cols = ['#ff4f7b', '#ffd23f', '#2ec4b6', '#7a5cff', '#ff9f43'];
  const seg = 48;
  for (let x0 = b.x1; x0 < b.x2; x0 += seg) {
    for (let i = 0; i < seg; i += 2) {
      const x = x0 + i, sag = Math.sin(i / seg * Math.PI) * b.drop;
      c.fillStyle = '#5a4a3a'; c.fillRect(x, b.y + sag, 2, 1);
      if (i % 8 === 0) {
        const sw = Math.round(Math.sin(t * 3 + x * 0.1));
        c.fillStyle = cols[(x / 8) % cols.length | 0];
        c.fillRect(x - 1, b.y + sag + 1, 5, 2); c.fillRect(x, b.y + sag + 3, 3, 2 + sw); c.fillRect(x + 1, b.y + sag + 5 + sw, 1, 1);
      }
    }
  }
}

function drawBoard(c, k) {
  const x = 116, y = 9;
  c.fillStyle = '#e8f0e8';
  const n = Math.floor(k);
  const lines = [[4, 2, 40], [4, 7, 60], [50, 2, 30], [4, 13, 24], [32, 13, 50], [90, 4, 60], [90, 10, 40], [90, 16, 70], [4, 18, 80]];
  for (let i = 0; i < Math.min(n, lines.length); i++) { const [lx, ly, lw] = lines[i]; for (let j = 0; j < lw; j += 2) c.fillRect(x + lx + j, y + ly + (j % 4 === 0 ? 0 : 1), 2, 1); }
  if (n >= 6) { blob(c, x + 160, y + 10, 6, '#e8f0e8'); blob(c, x + 160, y + 10, 5, '#2f5a46'); c.fillRect(x + 166, y + 10, 10, 1); }
}

/* ---------- overlay (crisp text) ---------- */
function w2s(x, y, cx, cy) { return [G.offX + (x - cx) * G.scale, G.offY + (y - cy) * G.scale]; }
const FONT = '"Pixelify Sans", "Trebuchet MS", system-ui, sans-serif';

function drawOverlay(cx, cy) {
  const c = ctx, s = G.scale;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // labels
  for (const l of G.map.labels) {
    if (l.cond && !l.cond()) continue;
    const [x, y] = w2s(l.x, l.y, cx, cy);
    if (x < -200 || x > cv.width + 200 || y < -40 || y > cv.height + 40) continue;
    c.font = `600 ${Math.round(l.size * s)}px ${FONT}`;
    c.fillStyle = l.color; c.fillText(l.text, x, y);
  }
  const fs = Math.max(12, Math.round(4.6 * s));
  // Zzz & emotes & bubbles
  for (const a of G.actors) {
    if (!a.visible) continue;
    const [x, y] = w2s(a.x, a.y, cx, cy);
    if (a.pose === 'sleep') {
      const k = (G.t * 0.8 + a.phase) % 1.5;
      c.font = `700 ${Math.round(fs * (0.8 + k * 0.3))}px ${FONT}`; c.fillStyle = `rgba(220,230,255,${1 - k / 1.5})`;
      c.fillText('z', x - 8 * s + k * 6 * s, y - 14 * s - k * 10 * s);
    }
    if (a.emote) {
      const e = a.emote, age = G.t - e.start;
      const pop = Math.min(1, age * 6), by = y - 30 * s - (a.pose === 'sleep' ? -10 * s : 0) - Math.sin(Math.min(age * 8, Math.PI)) * 3 * s;
      c.save(); c.translate(x, by); c.scale(pop, pop);
      const glyph = { '!': '!', '?': '?', '...': '…', 'z': 'Zz', 'note': '♪', 'heart': '♥', 'angry': '#!', 'sweat': '💧', 'haha': 'haha', 'star': '✦', '!!': '!!', 'sus': '¬_¬' }[e.e] || e.e;
      c.font = `700 ${fs}px ${FONT}`;
      const w = Math.max(c.measureText(glyph).width + fs * 0.8, fs * 1.6);
      c.fillStyle = e.e === 'angry' ? '#ff5d73' : e.e === 'heart' ? '#ff8fc0' : '#fff8e8';
      roundRect(c, -w / 2, -fs * 0.8, w, fs * 1.6, fs * 0.4); c.fill();
      c.fillStyle = '#1b1e3b'; c.fillText(glyph, 0, 1);
      c.restore();
    }
  }
  for (const a of G.actors) {
    if (!a.bubble || !a.visible) continue;
    const [x, y] = w2s(a.x, a.y, cx, cy);
    const age = G.t - a.bubble.start;
    c.font = `500 ${Math.round(fs * 0.9)}px ${FONT}`;
    const lines = wrapText(c, a.bubble.text, 64 * s);
    const lh = fs * 1.05, w = Math.max(...lines.map((l) => c.measureText(l).width)) + fs, h = lines.length * lh + fs * 0.6;
    const by = y - 28 * s - h - (a.pose === 'sit' || SIT_POSES[a.pose] ? -4 * s : 0);
    const al = Math.min(1, age * 5, (a.bubble.until - G.t) * 3);
    c.globalAlpha = al;
    c.fillStyle = '#fffaf0'; roundRect(c, x - w / 2, by, w, h, fs * 0.5); c.fill();
    c.beginPath(); c.moveTo(x - fs * 0.35, by + h - 1); c.lineTo(x, by + h + fs * 0.5); c.lineTo(x + fs * 0.35, by + h - 1); c.fill();
    c.strokeStyle = '#1b1e3b'; c.lineWidth = Math.max(1.5, s * 0.5); roundRect(c, x - w / 2, by, w, h, fs * 0.5); c.stroke();
    c.fillStyle = '#1b1e3b';
    lines.forEach((l, i) => c.fillText(l, x, by + fs * 0.3 + lh * (i + 0.5)));
    c.globalAlpha = 1;
  }
  // interaction prompt
  if (G.interact && !G.dlg) {
    const [x, y] = w2s(G.interact.x, G.interact.y, cx, cy);
    const bob = Math.sin(G.t * 5) * 2 * s;
    c.font = `600 ${Math.round(fs * 0.92)}px ${FONT}`;
    const lab = G.interact.label, tw = c.measureText(lab).width, k = fs * 1.35;
    const w = tw + k + fs * 1.1, h = fs * 1.7, bx = x - w / 2, by = y - h + bob;
    c.fillStyle = 'rgba(27,30,59,.92)'; roundRect(c, bx, by, w, h, h / 2); c.fill();
    c.strokeStyle = '#ffb627'; c.lineWidth = Math.max(1.5, s * 0.5); roundRect(c, bx, by, w, h, h / 2); c.stroke();
    c.fillStyle = '#ffb627'; roundRect(c, bx + fs * 0.3, by + (h - k) / 2, k, k, fs * 0.25); c.fill();
    c.fillStyle = '#1b1e3b'; c.font = `700 ${Math.round(fs * 0.85)}px ${FONT}`; c.fillText(G.touchUI ? 'A' : 'E', bx + fs * 0.3 + k / 2, by + h / 2 + 1);
    c.fillStyle = '#fff4dc'; c.font = `600 ${Math.round(fs * 0.92)}px ${FONT}`; c.textAlign = 'left'; c.fillText(lab, bx + fs * 0.55 + k, by + h / 2 + 1); c.textAlign = 'center';
  }
  // floats
  for (const f of G.floats) {
    if (f.t < 0) continue;
    const [x, y] = w2s(f.x, f.y - f.t * 14, cx, cy);
    const a = Math.min(1, (f.life - f.t) * 2, f.t * 8);
    c.globalAlpha = a;
    c.font = `700 ${Math.round(fs * 0.95)}px ${FONT}`;
    c.lineWidth = Math.max(3, s * 1.2); c.strokeStyle = '#1b1e3b'; c.strokeText(f.text, x, y);
    c.fillStyle = f.col; c.fillText(f.text, x, y);
    c.globalAlpha = 1;
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function wrapText(c, text, maxW) {
  const words = String(text).split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

/* ---------- main loop ---------- */
let lastT = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016); lastT = ts;
  if (!G.paused) for (let i = 0; i < (G.speed || 1); i++) update(dt);
  render();
  UI.frame(dt);
  requestAnimationFrame(frame);
}

function bootEngine() {
  cv = document.getElementById('game');
  ctx = cv.getContext('2d');
  buf = document.createElement('canvas'); bctx = buf.getContext('2d');
  resize(); window.addEventListener('resize', resize);
  initInput();
  buildAllMaps();
  requestAnimationFrame(frame);
}

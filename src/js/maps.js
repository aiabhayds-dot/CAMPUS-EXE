'use strict';
/* ===== World maps: campus + interiors ===== */
const T = (n) => n * TILE;
const MAPS = {};

function makeMap(id, wT, hT, name, interior) {
  return { id, name, wT, hT, w: wT * TILE, h: hT * TILE, interior: !!interior, bg: null,
    solids: [], props: [], doors: [], objs: [], labels: [], lights: [], overhead: [], ground: null };
}
function addProp(m, kind, x, y, p) {
  p = p || {};
  const o = Object.assign({ kind, x, y, sortY: p.sortY !== undefined ? p.sortY : y }, p);
  m.props.push(o);
  return o;
}
function addSolid(m, x, y, w, h, when) { m.solids.push({ x, y, w, h, when }); }
function getSolids(m) { return m.solids.filter((s) => !s.when || s.when()); }

/* ---------------- CAMPUS ---------------- */
const BUILDINGS = {
  hostel: { x: 3, y: 3, w: 13, h: 9, door: 9, style: 'hostel', label: 'BOYS HOSTEL · C-BLOCK', map: 'hostel' },
  lecture: { x: 42, y: 2, w: 16, h: 10, door: 49, style: 'lecture', label: 'LECTURE HALL 3', map: 'lecture' },
  library: { x: 3, y: 24, w: 13, h: 9, door: 9, style: 'library', label: 'CENTRAL LIBRARY', map: 'library' },
  canteen: { x: 44, y: 25, w: 14, h: 8, door: 50, style: 'canteen', label: 'CANTEEN', map: 'canteen' },
};

function buildCampus() {
  const m = makeMap('campus', 60, 44, 'Campus');
  const W = 60, H = 44;
  const gt = new Array(W * H).fill('g');
  const fill = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) gt[j * W + i] = v; };
  fill(20, 25, 20, 17, 'f');
  fill(25, 9, 11, 8, 'b');
  fill(0, 17, 60, 3, 'p');
  fill(8, 12, 3, 5, 'p'); fill(48, 12, 3, 5, 'p');
  fill(29, 20, 3, 3, 'p'); fill(19, 23, 23, 2, 'p');
  fill(0, 34, 21, 3, 'p'); fill(39, 34, 21, 3, 'p');
  fill(17, 20, 2, 14, 'p'); fill(41, 20, 2, 14, 'p');
  fill(8, 33, 3, 1, 'p'); fill(49, 33, 3, 1, 'p');
  fill(20, 25, 3, 1, 'p'); fill(37, 25, 3, 1, 'p');
  m.ground = gt;

  for (const k in BUILDINGS) {
    const b = BUILDINGS[k];
    const door = T(b.door);
    addSolid(m, T(b.x), T(b.y), T(b.w), T(b.h));
    m.doors.push({ x: door - 2, y: T(b.y + b.h) - 3, w: 20, h: 8, to: b.map, sx: null, sy: null, key: k });
    const rh = Math.round(T(b.h) * 0.42);
    m.labels.push({ x: door + 8, y: T(b.y) + rh + 5, text: b.label, size: 4.2, color: '#ffe9b8' });
  }
  // clock tower on lecture hall (animated)
  addProp(m, 'clocktower', T(49) + 8, T(2) + 2, { sortY: T(12), draw: drawClockTower });
  // canteen chimney smoke
  m.emitters = [{ x: T(55), y: T(25) + 2, kind: 'smoke' }];

  // boundary
  addSolid(m, 0, 0, T(W), 8); addSolid(m, 0, T(H) - 10, T(W), 10);
  addSolid(m, T(W) - 6, 0, 6, T(H)); addSolid(m, 0, 0, 6, T(17)); addSolid(m, 0, T(20), 6, T(H - 20));
  addSolid(m, 0, T(17), 10, T(3));
  for (let x = 0; x < W; x += 2) addProp(m, 'wall', T(x), 10, { w: 32 });
  addProp(m, 'gate', 8, T(17) - 2); addProp(m, 'gate', 8, T(20) + 6);
  addProp(m, 'gatebar', 0, T(20) - 2, { w: 10, sortY: T(20) });
  m.labels.push({ x: 26, y: T(16) + 2, text: 'MAIN GATE', size: 3.6, color: '#fff' });

  // ground fence + stage
  addProp(m, 'hedgeH', T(23), T(25) + 6, { w: T(14) }); addSolid(m, T(23), T(25), T(14), 6);
  addProp(m, 'hedgeV', T(20), T(34), { h: T(8) }); addSolid(m, T(20), T(26), 6, T(8));
  addProp(m, 'hedgeV', T(20), T(42) - 4, { h: T(5) - 4 }); addSolid(m, T(20), T(37), 6, T(5));
  addProp(m, 'hedgeV', T(40) - 6, T(34), { h: T(8) }); addSolid(m, T(40) - 6, T(26), 6, T(8));
  addProp(m, 'hedgeV', T(40) - 6, T(42) - 4, { h: T(5) - 4 }); addSolid(m, T(40) - 6, T(37), 6, T(5));
  addProp(m, 'hedgeH', T(20), T(42), { w: T(20) }); addSolid(m, T(20), T(42) - 7, T(20), 7);
  const stage = addProp(m, 'stage', T(30), T(29), { w: T(10), h: T(3) + 8 });
  Object.defineProperty(stage, 'fest', { get: () => (S && S.day >= 3 ? 2 : S && S.day >= 2 ? 1 : 0) });
  addSolid(m, T(25), T(26) + 4, T(10), T(3) - 4);
  m.labels.push({ x: T(30), y: T(24) + 6, text: 'COLLEGE GROUND', size: 4, color: '#ffffff' });
  m.labels.push({ x: T(30), y: T(26) + 2, text: 'UTSAV 2026', size: 4.4, color: '#ffd23f', cond: () => S && S.day >= 3 });
  // speakers + stalls (festival)
  const fest3 = () => S && S.day >= 3, fest2 = () => S && S.day >= 2;
  addProp(m, 'speaker', T(24), T(29) + 2, { when: fest3 }); addProp(m, 'speaker', T(36), T(29) + 2, { when: fest3 });
  addProp(m, 'stall', T(23), T(32), { when: fest3, col: '#e2533d', items: ['#f2b134', '#c0392b'] }); addSolid(m, T(23) - 18, T(32) - 12, 36, 12, fest3);
  addProp(m, 'stall', T(37), T(32), { when: fest3, col: '#7a5cc4', items: ['#2ec4b6', '#ff6f91', '#ffd23f'] }); addSolid(m, T(37) - 18, T(32) - 12, 36, 12, fest3);
  m.labels.push({ x: T(23), y: T(30) - 4, text: 'CHAAT', size: 3.6, color: '#fff', cond: fest3 });
  m.labels.push({ x: T(37), y: T(30) - 4, text: 'RING TOSS', size: 3.6, color: '#fff', cond: fest3 });
  const banner = addProp(m, 'banner', T(30), T(37), { when: () => S && S.day === 2, done: () => S && S.flags.volunteer });
  addSolid(m, T(30) - 30, T(37) - 4, 4, 4, () => S && S.day === 2); addSolid(m, T(30) + 26, T(37) - 4, 4, 4, () => S && S.day === 2);
  m.labels.push({ x: T(30), y: T(37) - 21, text: 'UTSAV 2026', size: 4.4, color: '#7a2a10', cond: () => S && S.day === 2 && S.flags.volunteer });
  // bunting over main road (festival)
  m.overhead.push({ when: fest2, y: T(17) - 6, x1: T(4), x2: T(56), drop: 6 });
  m.overhead.push({ when: fest2, y: T(23), x1: T(19), x2: T(41), drop: 5 });
  m.overhead.push({ when: fest3, y: T(30), x1: T(21), x2: T(39), drop: 8 });

  // trees & greenery
  const trees = [[18, 4, 0], [21, 7, 1], [19, 11, 2], [23, 13, 0], [23, 4, 2], [38, 4, 1], [40, 8, 0], [37, 12, 2], [27, 6, 1], [33, 6, 0],
    [2, 15, 0], [3, 22, 1], [13, 22, 0], [46, 22, 2], [55, 22, 1], [57, 15, 0], [59, 4, 2], [1, 4, 0],
    [3, 40, 0], [9, 41, 2], [15, 39, 1], [44, 40, 0], [50, 41, 1], [56, 39, 2], [17, 42, 0], [42, 42, 2], [59, 30, 0], [1, 30, 2]];
  for (const [tx, ty, k] of trees) { addProp(m, 'tree', T(tx) + 8, T(ty) + 12, { variant: k }); addSolid(m, T(tx) + 4, T(ty) + 8, 8, 5); }
  for (const [tx, ty] of [[7, 21], [52, 21], [21, 39], [38, 39]]) { addProp(m, 'palm', T(tx) + 8, T(ty) + 12); addSolid(m, T(tx) + 5, T(ty) + 9, 6, 4); }
  const bushes = [[12, 13, '#ff6f91'], [5, 13, null], [44, 13, '#ffd23f'], [56, 13, null], [24, 16, '#ff6f91'], [36, 16, '#ffd23f'], [24, 10, null], [36, 10, null], [16, 24, null], [43, 24, '#ff6f91'], [6, 38, null], [53, 38, '#ffd23f']];
  for (const [tx, ty, fl] of bushes) { addProp(m, 'bush', T(tx) + 8, T(ty) + 12, { flowers: fl }); addSolid(m, T(tx) + 2, T(ty) + 6, 12, 6); }
  addProp(m, 'flowers', T(27) + 8, T(16) + 10, { w: 30 }); addProp(m, 'flowers', T(33) + 8, T(16) + 10, { w: 30 });
  addProp(m, 'flowers', T(9) + 8, T(21) + 10, { w: 26 }); addProp(m, 'flowers', T(50) + 8, T(21) + 10, { w: 26 });

  // plaza fountain
  addProp(m, 'fountain', T(30) + 8, T(13) + 4); addSolid(m, T(30) + 8 - 24, T(13) + 4 - 20, 48, 18);
  // benches & lamps
  for (const [tx, ty] of [[26, 11], [34, 11], [13, 16], [46, 20], [5, 33], [55, 37]]) { addProp(m, 'bench', T(tx) + 8, T(ty) + 14); addSolid(m, T(tx) - 4, T(ty) + 4, 24, 10); }
  for (const x of [5, 14, 22, 38, 46, 54]) { addProp(m, 'lamp', T(x) + 8, T(16) + 14); addSolid(m, T(x) + 6, T(16) + 11, 4, 4); m.lights.push({ x: T(x) + 8, y: T(16) - 6, r: 44, col: '255,214,140' }); }
  for (const x of [4, 14, 45, 55]) { addProp(m, 'lamp', T(x) + 8, T(37) + 14); addSolid(m, T(x) + 6, T(37) + 11, 4, 4); m.lights.push({ x: T(x) + 8, y: T(37) - 6, r: 40, col: '255,214,140' }); }
  // signs
  addProp(m, 'sign', T(19) + 8, T(16) + 14, { w: 40 }); addSolid(m, T(19) + 6, T(16) + 10, 4, 4);
  m.labels.push({ x: T(19) + 8, y: T(16) - 4, text: '↑ HOSTEL  ↓ LIBRARY', size: 2.8, color: '#fff' });
  addProp(m, 'sign', T(40) + 8, T(16) + 14, { w: 44 }); addSolid(m, T(40) + 6, T(16) + 10, 4, 4);
  m.labels.push({ x: T(40) + 8, y: T(16) - 4, text: '↑ LECTURE  ↓ CANTEEN', size: 2.8, color: '#fff' });
  addProp(m, 'sign', T(33) + 8, T(22) + 14, { w: 34 }); addSolid(m, T(33) + 6, T(22) + 10, 4, 4);
  m.labels.push({ x: T(33) + 8, y: T(22) - 4, text: '↓ GROUND', size: 2.8, color: '#fff' });
  // misc
  addProp(m, 'notice', T(53) + 8, T(14) + 8); addSolid(m, T(53) - 6, T(14) + 2, 28, 6);
  addProp(m, 'cycles', T(13) + 8, T(14) + 6); addSolid(m, T(12) - 6, T(14), 44, 6);
  addProp(m, 'cooler', T(24) + 8, T(21) + 8); addSolid(m, T(24) + 2, T(21) + 2, 12, 6);
  addProp(m, 'dog', T(17) + 6, T(31) + 12, { sortY: T(31) + 12 });
  addProp(m, 'dhaba', T(57) + 8, T(19) + 14); addSolid(m, T(57) - 2, T(19) + 4, 20, 10);
  m.labels.push({ x: T(57) + 8, y: T(19) - 6, text: 'CHAI', size: 3.2, color: '#fff' });

  // windows glowing at night
  for (const k in BUILDINGS) { const b = BUILDINGS[k]; m.lights.push({ x: T(b.door) + 8, y: T(b.y + b.h) - 6, r: 34, col: '255,200,120' }); }
  m.lights.push({ x: T(30) + 8, y: T(28), r: 70, col: '255,120,200', when: () => S && S.day === 3 });
  m.lights.push({ x: T(30) + 8, y: T(13), r: 40, col: '140,200,255' });

  // interactables (campus)
  m.objs.push({ x: T(53) + 8, y: T(14) + 14, r: 18, label: 'Read notice board', act: () => Act.notice() });
  m.objs.push({ x: T(24) + 8, y: T(21) + 14, r: 16, label: 'Drink water', act: () => Act.cooler() });
  m.objs.push({ x: T(57) + 8, y: T(20) + 10, r: 20, label: 'Chai tapri (₹)', act: () => Act.chaiTapri() });
  m.objs.push({ x: T(30) + 8, y: T(14) + 8, r: 26, label: 'Toss a coin in the fountain', act: () => Act.fountain() });
  m.objs.push({ x: T(17) + 6, y: T(31) + 14, r: 16, label: 'Pet the sleeping dog', act: () => Act.dog() });
  m.objs.push({ x: 18, y: T(18) + 8, r: 18, label: 'Main gate', act: () => Act.gate() });
  m.objs.push({ x: T(13) + 8, y: T(14) + 14, r: 18, label: 'Cycle stand', act: () => Act.cycles() });
  for (const [tx, ty] of [[26, 11], [34, 11], [13, 16], [46, 20], [5, 33], [55, 37]]) m.objs.push({ x: T(tx) + 8, y: T(ty) + 16, r: 14, label: 'Sit & chill on bench', act: () => Act.bench() });
  m.objs.push({ x: T(23), y: T(32) + 6, r: 22, label: 'Chaat stall', cond: fest3, act: () => Act.chaat() });
  m.objs.push({ x: T(37), y: T(32) + 6, r: 22, label: 'Ring toss (₹)', cond: fest3, act: () => Act.ringToss() });
  m.objs.push({ x: T(30), y: T(31) + 10, r: 34, label: 'Join the concert', cond: () => S && S.day === 3 && S.time >= 1080 && !S.flags.concert, act: () => Story.concert() });
  m.objs.push({ x: T(30), y: T(37) + 6, r: 30, label: 'Fest banner', cond: () => S && S.day === 2, act: () => Act.banner() });
  // random-event sparkles
  m.props.push({ kind: 'sparkle', x: T(33) + 2, y: T(15) + 12, sortY: T(15) + 12, on: () => Story.rnd('coupon'), col: '#ffd23f' });
  m.objs.push({ x: T(33) + 2, y: T(15) + 12, r: 14, label: 'Something shiny', cond: () => Story.rnd('coupon'), act: () => Story.findCoupon() });
  m.props.push({ kind: 'sparkle', x: T(12) + 4, y: T(34) + 8, sortY: T(34) + 8, on: () => Story.rnd('idcard'), col: '#9fd8ff' });
  m.objs.push({ x: T(12) + 4, y: T(34) + 8, r: 14, label: 'Something on the ground', cond: () => Story.rnd('idcard'), act: () => Story.findID() });

  m.spawns = { start: { x: T(9) + 8, y: T(13) + 8 } };
  return m;
}

function drawClockTower(c, x, y, t) {
  R(c, x - 14, y - 26, 28, 30, '#e6b878'); R(c, x - 14, y - 26, 28, 2, '#fff2d8');
  for (let i = 0; i < 9; i++) R(c, x - 16 + i * 0.5, y - 34 + i, 32 - i, 1, '#b4513a');
  R(c, x - 2, y - 40, 4, 6, '#b4513a'); R(c, x - 1, y - 44, 2, 4, '#ffd23f');
  blob(c, x, y - 12, 8, '#fff6e0'); blob(c, x, y - 12, 8, '#3a2a1a', 8); blob(c, x, y - 12, 7, '#fff6e0');
  const m = S ? S.time : 600;
  const ha = ((m / 60) % 12) / 12 * Math.PI * 2 - Math.PI / 2, ma = (m % 60) / 60 * Math.PI * 2 - Math.PI / 2;
  for (let i = 0; i < 4; i++) R(c, x + Math.cos(ha) * i, y - 12 + Math.sin(ha) * i, 1, 1, '#1a1a2a');
  for (let i = 0; i < 6; i++) R(c, x + Math.cos(ma) * i, y - 12 + Math.sin(ma) * i, 1, 1, '#c0392b');
}

function paintCampusBG(m) {
  const cv = document.createElement('canvas'); cv.width = m.w; cv.height = m.h;
  const c = cv.getContext('2d');
  const r = srng(1234);
  const gt = m.ground, W = m.wT;
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= m.hT) ? 'g' : gt[j * W + i];
  for (let j = 0; j < m.hT; j++) for (let i = 0; i < W; i++) {
    const x = T(i), y = T(j), g = at(i, j);
    if (g === 'g' || g === 'f') {
      const base = g === 'f' ? (Math.floor(i / 2) % 2 ? '#8fcb5e' : '#86c256') : ((i + j) % 2 ? '#79c053' : '#74ba4e');
      R(c, x, y, 16, 16, base);
      for (let k = 0; k < 3; k++) R(c, x + Math.floor(r() * 15), y + Math.floor(r() * 14), 1, 2, g === 'f' ? '#7ab44a' : '#5ea342');
      if (g === 'g' && r() < 0.06) { const fx = x + Math.floor(r() * 13), fy = y + Math.floor(r() * 13); R(c, fx, fy, 2, 2, pick(['#ffffff', '#ffd23f', '#ff9fc0'])); }
    } else if (g === 'p') {
      R(c, x, y, 16, 16, '#e6cc98');
      for (let yy = 0; yy < 16; yy += 8) { R(c, x, y + yy, 16, 1, '#d4b47e'); const off = ((j * 2 + yy / 8) % 2) * 4; for (let xx = off; xx < 16; xx += 8) R(c, x + xx, y + yy, 1, 8, '#d4b47e'); }
      if (r() < 0.25) R(c, x + Math.floor(r() * 14), y + Math.floor(r() * 14), 2, 1, '#f2dcae');
      if (at(i, j - 1) === 'g' || at(i, j - 1) === 'f') R(c, x, y, 16, 2, '#c8a46c');
      if (at(i, j + 1) === 'g' || at(i, j + 1) === 'f') R(c, x, y + 14, 16, 2, '#c8a46c');
      if (at(i - 1, j) === 'g' || at(i - 1, j) === 'f') R(c, x, y, 2, 16, '#c8a46c');
      if (at(i + 1, j) === 'g' || at(i + 1, j) === 'f') R(c, x + 14, y, 2, 16, '#c8a46c');
    } else if (g === 'b') {
      R(c, x, y, 16, 16, '#c98062');
      for (let yy = 0; yy < 16; yy += 4) { R(c, x, y + yy, 16, 1, '#b06a4e'); for (let xx = ((yy / 4 + j) % 2) * 4; xx < 16; xx += 8) R(c, x + xx, y + yy, 1, 4, '#b06a4e'); }
    }
  }
  // field chalk + pitch
  c.fillStyle = '#f4f4ee';
  c.fillRect(T(21) + 4, T(30), T(18) - 8, 1); c.fillRect(T(21) + 4, T(41) - 2, T(18) - 8, 1);
  c.fillRect(T(21) + 4, T(30), 1, T(11) - 2); c.fillRect(T(39) - 4, T(30), 1, T(11) - 2);
  R(c, T(29), T(33), T(3), T(6), '#d8b878'); R(c, T(29), T(33), T(3), 1, '#f4f4ee'); R(c, T(29), T(39) - 1, T(3), 1, '#f4f4ee');
  for (const sx of [T(30), T(30) + 8]) { R(c, sx, T(33) + 2, 1, 6, '#f4f4ee'); R(c, sx, T(39) - 8, 1, 6, '#f4f4ee'); }
  // plaza ring
  blob(c, T(30) + 8, T(13) + 2, 36, 'rgba(255,255,255,.08)', 16);
  // buildings
  for (const k in BUILDINGS) paintBuilding(c, BUILDINGS[k]);
  m.bg = cv;
  // minimap
  const mm = document.createElement('canvas'); mm.width = W * 2; mm.height = m.hT * 2;
  const mc = mm.getContext('2d');
  for (let j = 0; j < m.hT; j++) for (let i = 0; i < W; i++) { const g = at(i, j); mc.fillStyle = g === 'p' ? '#e6cc98' : g === 'b' ? '#c98062' : g === 'f' ? '#9ad070' : '#5ea342'; mc.fillRect(i * 2, j * 2, 2, 2); }
  const bc = { hostel: '#c8603f', lecture: '#ecc187', library: '#a8bccf', canteen: '#f2c85c' };
  for (const k in BUILDINGS) { const b = BUILDINGS[k]; mc.fillStyle = bc[k]; mc.fillRect(b.x * 2, b.y * 2, b.w * 2, b.h * 2); mc.fillStyle = 'rgba(0,0,0,.35)'; mc.fillRect(b.x * 2, b.y * 2, b.w * 2, 3); }
  mc.fillStyle = '#5a3a2a'; mc.fillRect(25 * 2, 26 * 2, 20, 7);
  m.mini = mm;
}

/* ---------------- INTERIORS ---------------- */
function paintRoom(m, o) {
  const cv = document.createElement('canvas'); cv.width = m.w; cv.height = m.h;
  const c = cv.getContext('2d');
  const r = srng(m.id.length * 999 + 7);
  const top = o.wallH;
  // floor
  for (let y = top; y < m.h; y += 16) for (let x = 0; x < m.w; x += 16) {
    if (o.floor === 'wood') { R(c, x, y, 16, 16, (Math.floor(y / 16) % 2) ? '#b8875a' : '#b28053'); R(c, x, y + 7, 16, 1, '#9a6c44'); R(c, x + ((y / 16) % 2 ? 4 : 12), y, 1, 8, '#9a6c44'); R(c, x + ((y / 16) % 2 ? 10 : 2), y + 8, 1, 8, '#9a6c44'); }
    else if (o.floor === 'mosaic') { R(c, x, y, 16, 16, '#bdb5a6'); for (let k = 0; k < 7; k++) R(c, x + Math.floor(r() * 15), y + Math.floor(r() * 15), 1, 1, pick(['#9a9284', '#d8d0c0', '#8a8274', '#e0a090'])); R(c, x, y, 16, 1, '#a8a092'); R(c, x, y, 1, 16, '#a8a092'); }
    else if (o.floor === 'tile') { R(c, x, y, 16, 16, ((x + y) / 16) % 2 ? '#e8e0cc' : '#d8ceb6'); R(c, x, y, 16, 1, '#c8bea6'); }
    else if (o.floor === 'checker') { R(c, x, y, 16, 16, ((x + y) / 16) % 2 ? '#d8dcd0' : '#7a8a7a'); }
  }
  // top wall
  R(c, 0, 0, m.w, top, o.wall); for (let x = 0; x < m.w; x += 32) R(c, x, 0, 1, top, shade(o.wall, -0.06));
  R(c, 0, top - 5, m.w, 5, o.skirt); R(c, 0, top - 5, m.w, 1, shade(o.skirt, 0.25));
  R(c, 0, 0, m.w, 3, shade(o.wall, -0.35));
  // side walls
  R(c, 0, 0, 8, m.h, o.side); R(c, m.w - 8, 0, 8, m.h, o.side); R(c, 7, top, 1, m.h, shade(o.side, -0.3)); R(c, m.w - 8, top, 1, m.h, shade(o.side, -0.3));
  R(c, 0, m.h - 8, m.w, 8, o.side); R(c, 0, m.h - 8, m.w, 1, shade(o.side, -0.3));
  // door gap
  const d = o.door;
  R(c, d.x - 2, m.h - 8, d.w + 4, 8, '#3a2a1a'); R(c, d.x, m.h - 8, d.w, 8, '#e6cc98'); R(c, d.x, m.h - 8, d.w, 2, '#5a3a22');
  if (o.paint) o.paint(c, r);
  m.bg = cv;
  addSolid(m, 0, 0, m.w, top - 2); addSolid(m, 0, 0, 8, m.h); addSolid(m, m.w - 8, 0, 8, m.h);
  addSolid(m, 0, m.h - 8, d.x, 8); addSolid(m, d.x + d.w, m.h - 8, m.w - d.x - d.w, 8);
  m.doors.push({ x: d.x, y: m.h - 6, w: d.w, h: 6, to: 'campus', key: m.id });
  m.spawns = { door: { x: d.x + d.w / 2, y: m.h - 18 } };
}

function buildHostel() {
  const m = makeMap('hostel', 20, 12, 'Hostel Room C-214', true); m.viewH = 206;
  paintRoom(m, { wallH: 34, wall: '#e8d8a8', skirt: '#8a6a4a', side: '#5a4a3a', floor: 'mosaic', door: { x: 152, w: 18 },
    paint(c) {
      // window (sky drawn live), posters
      R(c, 140, 6, 40, 22, '#6e5232'); R(c, 142, 8, 36, 18, '#88b8e8');
      R(c, 20, 6, 22, 24, '#2a2438'); R(c, 22, 8, 18, 20, '#e2533d'); R(c, 24, 10, 14, 6, '#ffd23f'); R(c, 24, 18, 14, 8, '#2a2438');
      R(c, 250, 7, 26, 18, '#f4f0e8'); R(c, 252, 9, 22, 2, '#2a2438'); R(c, 252, 13, 18, 2, '#c0392b'); R(c, 252, 17, 20, 2, '#2a2438'); R(c, 251, 14, 24, 1, '#c0392b');
      R(c, 60, 10, 30, 16, '#3a7bd5'); R(c, 62, 12, 26, 12, '#9fd8ff'); blob(c, 75, 18, 4, '#ffd23f');
      R(c, 290, 6, 14, 20, '#ffd23f'); R(c, 292, 8, 10, 16, '#2ec4b6');
      R(c, 200, 10, 30, 2, '#5a5a6a'); R(c, 204, 12, 6, 10, '#ff6f91'); R(c, 214, 12, 5, 8, '#ffffff'); R(c, 222, 12, 6, 11, '#3a7bd5');
      // rug
      R(c, 110, 100, 100, 50, '#a04a5a'); R(c, 114, 104, 92, 42, '#c8605a'); R(c, 118, 108, 84, 34, '#a04a5a');
    } });
  m.labels.push({ x: 59, y: 22, text: 'SLEEP IS A MYTH', size: 2.6, color: '#2a2438', bg: 'rgba(244,240,232,.0)' });
  const pBed = addProp(m, 'bed', 10, 72, { blanket: '#3f6fc4', occupied: () => G.player && G.player.pose === 'sleep' && G.map === m });
  addSolid(m, 10, 44, 58, 28);
  const kBed = addProp(m, 'bed', 252, 72, { blanket: '#a04a5a', occupied: () => { const k = G.actorById && G.actorById('kabir'); return k && k.pose === 'sleep'; } });
  addSolid(m, 252, 44, 58, 28);
  addProp(m, 'sidetable', 80, 60, { ringing: () => G.alarmRing, fallen: () => G.alarmFallen }); addSolid(m, 73, 46, 14, 14);
  addProp(m, 'desk', 92, 52, { w: 44, laptop: true, lampOn: true, books: true, mug: true, on: () => G.laptopOn });
  addSolid(m, 92, 32, 44, 20);
  addProp(m, 'desk', 184, 52, { w: 52, gaming: true }); addSolid(m, 184, 32, 52, 20);
  addProp(m, 'almirah', 280, 168); addSolid(m, 280, 140, 26, 28);
  addProp(m, 'bucket', 24, 172); addSolid(m, 17, 162, 14, 10);
  addProp(m, 'clothes', 60, 152);
  addProp(m, 'maggi', 160, 128, { sortY: 120 }); addProp(m, 'maggi', 172, 132, { sortY: 120 });
  addProp(m, 'guitar', 240, 96); addSolid(m, 235, 86, 10, 10);
  m.beds = { player: { x: 25, y: 60 }, kabir: { x: 267, y: 60 } };
  m.seats = { player: { x: 114, y: 64 }, kabir: { x: 210, y: 64 } };
  m.lights.push({ x: 128, y: 40, r: 50, col: '255,210,140' });
  m.objs.push({ x: 40, y: 78, r: 22, label: () => (S.time >= 1260 || S.time < 420) ? 'Sleep till morning' : 'Take a nap (2h)', act: () => Act.sleep() });
  m.objs.push({ x: 114, y: 60, r: 18, label: 'Use laptop', act: () => Act.desk() });
  m.objs.push({ x: 80, y: 64, r: 12, label: 'Alarm clock', act: () => Act.alarmClock() });
  m.objs.push({ x: 24, y: 176, r: 14, label: 'Bucket (bath)', act: () => Act.bath() });
  m.objs.push({ x: 240, y: 100, r: 14, label: 'Kabir\'s guitar', act: () => Act.guitar() });
  m.objs.push({ x: 160, y: 22, r: 14, label: 'Look out window', act: () => Act.window() });
  return m;
}

function buildLecture() {
  const m = makeMap('lecture', 26, 16, 'Lecture Hall 3', true);
  const rows = [112, 144, 176, 208];
  paintRoom(m, { wallH: 40, wall: '#efe2c6', skirt: '#6a4a3a', side: '#4a3a32', floor: 'wood', door: { x: 384, w: 20 },
    paint(c) {
      R(c, 110, 4, 196, 30, '#6a4a2a'); R(c, 113, 7, 190, 24, '#2f5a46');
      R(c, 120, 33, 176, 3, '#8a6a4a'); R(c, 130, 31, 10, 2, '#ffffff'); R(c, 146, 31, 8, 2, '#ffd23f');
      blob(c, 360, 18, 9, '#fff6e0'); blob(c, 360, 18, 9, '#2a2a2a', 9); blob(c, 360, 18, 8, '#fff6e0');
      R(c, 30, 8, 40, 14, '#c0392b'); R(c, 32, 10, 36, 10, '#ffffff');
      for (const y of rows) { R(c, 40, y - 16, 128, 5, '#8a5a34'); R(c, 248, y - 16, 128, 5, '#8a5a34'); R(c, 40, y - 16, 128, 1, '#a87a4a'); R(c, 248, y - 16, 128, 1, '#a87a4a'); }
      R(c, 176, 44, 64, 4, '#c8a878'); // platform edge
      R(c, 160, 40, 96, 34, '#a87a4a'); R(c, 160, 40, 96, 2, '#c8965e'); R(c, 160, 72, 96, 2, '#7a5230');
    } });
  m.labels.push({ x: 50, y: 16, text: 'NO MOBILES', size: 2.8, color: '#c0392b' });
  m.boardPos = { x: 208, y: 19 };
  addProp(m, 'profdesk', 178, 76, { w: 60 }); addSolid(m, 178, 58, 60, 18);
  m.rows = rows;
  m.paperDesks = [];
  for (const y of rows) {
    addProp(m, 'bench_row', 40, y, { w: 128, papers: () => (G.papers || []).filter((p) => p.y === y).map((p) => p.x) });
    addProp(m, 'bench_row', 248, y, { w: 128, papers: () => (G.papers || []).filter((p) => p.y === y).map((p) => p.x) });
    addSolid(m, 40, y - 12, 128, 12); addSolid(m, 248, y - 12, 128, 12);
  }
  m.seatXs = [60, 92, 124, 156, 260, 292, 324, 356];
  m.playerSeat = { x: 156, y: 166, row: 2 };
  m.profSpot = { x: 208, y: 62 };
  m.lights.push({ x: 208, y: 100, r: 120, col: '255,240,210' });
  m.objs.push({ x: 196, y: 70, r: 18, label: 'Peek at attendance register', act: () => Act.register() });
  m.objs.push({ x: 156, y: 160, r: 16, label: () => Story.classAvailable() ? 'Take your seat (class)' : 'Sit for a bit', act: () => Story.classAvailable() ? Story.startClass() : Act.emptySeat() });
  m.objs.push({ x: 208, y: 44, r: 20, label: 'Read the board', act: () => Act.board() });
  return m;
}

function buildLibrary() {
  const m = makeMap('library', 24, 15, 'Central Library', true); m.viewH = 250;
  paintRoom(m, { wallH: 44, wall: '#d8d0e0', skirt: '#4a3a5a', side: '#3a3048', floor: 'checker', door: { x: 182, w: 20 },
    paint(c) {
      for (let x = 12; x < 370; x += 46) PROP.shelf(c, x, 42, 0, { w: 42 });
      R(c, 150, 2, 84, 10, '#2a2438'); R(c, 152, 4, 80, 6, '#3a3250');
      R(c, 60, 196, 260, 36, 'rgba(255,255,255,.05)');
    } });
  m.labels.push({ x: 192, y: 8, text: 'SILENCE PLEASE', size: 3, color: '#ffd23f' });
  addProp(m, 'shelf', 24, 104, { w: 120 }); addSolid(m, 24, 78, 120, 26);
  addProp(m, 'shelf', 24, 160, { w: 120 }); addSolid(m, 24, 134, 120, 26);
  const tables = [[196, 112, 76], [296, 112, 64], [196, 176, 76], [296, 176, 64]];
  for (const [x, y, w] of tables) { addProp(m, 'table', x, y, { w, items: (c, xx, yy) => { R(c, xx + 6, yy - 12, 8, 5, '#2f8fd0'); R(c, xx + w - 16, yy - 12, 6, 6, '#c0392b'); } }); addSolid(m, x, y - 14, w, 14); }
  addProp(m, 'profdesk', 30, 222, { w: 60 }); addSolid(m, 30, 204, 60, 18);
  addProp(m, 'plant', 360, 72); addSolid(m, 354, 64, 12, 8);
  addProp(m, 'plant', 160, 72); addSolid(m, 154, 64, 12, 8);
  m.seats = [[216, 100], [244, 100], [316, 100], [340, 100], [216, 164], [244, 164], [316, 164], [340, 164]];
  m.playerSeat = { x: 244, y: 164 };
  m.lights.push({ x: 230, y: 100, r: 60, col: '255,230,180' }); m.lights.push({ x: 230, y: 170, r: 60, col: '255,230,180' });
  m.objs.push({ x: 84, y: 110, r: 26, label: 'Browse bookshelf', act: () => Act.shelf() });
  m.objs.push({ x: 84, y: 166, r: 26, label: 'Browse bookshelf', act: () => Act.shelf() });
  m.objs.push({ x: 244, y: 186, r: 18, label: 'Study at desk (2h)', act: () => Act.libStudy() });
  m.objs.push({ x: 60, y: 60, r: 26, label: 'Wall of books', act: () => Act.shelf() });
  return m;
}

function buildCanteen() {
  const m = makeMap('canteen', 22, 14, 'Canteen', true); m.viewH = 236;
  paintRoom(m, { wallH: 40, wall: '#f4dca0', skirt: '#2f9a5a', side: '#7a5a3a', floor: 'tile', door: { x: 166, w: 20 },
    paint(c) {
      R(c, 18, 4, 110, 30, '#3a2a1a'); R(c, 20, 6, 106, 26, '#2a3a2a');
      R(c, 260, 6, 70, 22, '#e2533d'); R(c, 262, 8, 66, 18, '#fff6dc');
    } });
  m.labels.push({ x: 73, y: 11, text: 'MENU', size: 3.4, color: '#ffd23f' });
  m.labels.push({ x: 73, y: 18, text: 'Samosa ₹15 · Chai ₹10', size: 2.6, color: '#e8f0e0' });
  m.labels.push({ x: 73, y: 24, text: 'Maggi ₹40 · Thali ₹60', size: 2.6, color: '#e8f0e0' });
  m.labels.push({ x: 73, y: 30, text: 'Special: Mystery Sabzi', size: 2.6, color: '#ff9f43' });
  m.labels.push({ x: 295, y: 14, text: 'NO UDHAAR', size: 3, color: '#c0392b' });
  m.labels.push({ x: 295, y: 22, text: '(Rahul, this means you)', size: 2.2, color: '#2a2438' });
  addProp(m, 'counter', 150, 64, { w: 176 }); addSolid(m, 150, 44, 176, 20);
  const tables = [[26, 124, 52], [100, 124, 52], [26, 188, 52], [100, 188, 52], [206, 128, 56], [280, 128, 56], [206, 192, 56], [280, 192, 56]];
  m.tables = tables;
  for (const [x, y, w] of tables) {
    addProp(m, 'table', x, y, { w, items: (c, xx, yy) => { R(c, xx + 8, yy - 12, 8, 4, '#ffffff'); R(c, xx + 9, yy - 12, 6, 2, '#f2b134'); R(c, xx + w - 14, yy - 13, 4, 6, '#c8e8ff'); } });
    addSolid(m, x, y - 14, w, 14);
  }
  addProp(m, 'plant', 340, 60); addSolid(m, 334, 52, 12, 8);
  m.top = [{ kind: 'fan', x: 120, y: 92 }, { kind: 'fan', x: 270, y: 104 }];
  m.lights.push({ x: 176, y: 90, r: 110, col: '255,220,160' });
  m.counterSpot = { x: 238, y: 76 };
  m.eatSeat = { x: 130, y: 182 };
  m.objs.push({ x: 238, y: 72, r: 26, label: 'Order food', act: () => Act.order() });
  return m;
}

function buildAllMaps() {
  MAPS.campus = buildCampus(); paintCampusBG(MAPS.campus);
  MAPS.hostel = buildHostel(); MAPS.lecture = buildLecture(); MAPS.library = buildLibrary(); MAPS.canteen = buildCanteen();
  // link campus doors → interiors
  for (const d of MAPS.campus.doors) { const im = MAPS[d.to]; d.sx = im.spawns.door.x; d.sy = im.spawns.door.y; }
  for (const k of ['hostel', 'lecture', 'library', 'canteen']) {
    const im = MAPS[k]; const b = BUILDINGS[k];
    for (const d of im.doors) { d.sx = T(b.door) + 8; d.sy = T(b.y + b.h) + 12; }
  }
}

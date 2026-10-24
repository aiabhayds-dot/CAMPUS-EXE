'use strict';
/* ===== Procedural pixel art: characters, props, buildings ===== */

/* ---------- Character looks ---------- */
const LOOKS = {
  rahul:  { skin: '#c98b5e', hair: '#1b130e', style: 'messy', shirt: '#f08a24', shirt2: '#c4660f', pants: '#3f4458', shoes: '#f2f2f2', hood: true },
  kabir:  { skin: '#d9a07a', hair: '#3a2a1e', style: 'curly', shirt: '#6b4fa0', shirt2: '#4d3878', pants: '#2b2f3d', shoes: '#222', glasses: true, blanket: '#a04a5a' },
  priya:  { skin: '#d49770', hair: '#160f0c', style: 'braid', shirt: '#e8566f', shirt2: '#b83c53', pants: '#30345a', shoes: '#5a3a2a', glasses: true },
  prof:   { skin: '#c0865b', hair: '#c9c9c9', style: 'bald', shirt: '#ece6d4', shirt2: '#cfc6ae', pants: '#5a4a3a', shoes: '#2a1e16', glasses: true, mustache: true, tie: '#8a2c2c' },
  bhaiya: { skin: '#b5754b', hair: '#222', style: 'cap', cap: '#ffffff', shirt: '#f4f1e8', shirt2: '#d8d2c0', pants: '#4a4a4a', shoes: '#333', mustache: true, apron: '#e0b35a' },
  meera:  { skin: '#e2ab84', hair: '#4a2618', style: 'long', shirt: '#22b3a6', shirt2: '#15867c', pants: '#2e2e48', shoes: '#eee' },
  librarian: { skin: '#cf9670', hair: '#5a5a5a', style: 'bun', shirt: '#8a4f9a', shirt2: '#6a3478', pants: '#8a4f9a', shoes: '#333', glasses: true, saree: '#e0a03a' },
  guard:  { skin: '#a8714a', hair: '#222', style: 'cap', cap: '#3a4a6a', shirt: '#4a5a7a', shirt2: '#3a4862', pants: '#3a4862', shoes: '#111', mustache: true },
};
const SKINS = ['#e3ad85', '#d49770', '#c98b5e', '#b5754b', '#9c6440', '#eabf9a'];
const HAIRS = ['#1b130e', '#2b1d14', '#3a2a1e', '#4a2618', '#111111', '#5a3a22'];
const SHIRTS = ['#3a7bd5', '#e8566f', '#2ec4b6', '#f2b134', '#7a5cc4', '#4caf6a', '#e07a3a', '#5a6a8a', '#d04a8a', '#ffffff', '#3a3a4a'];
const PANTS = ['#2e3350', '#3f4458', '#4a3a2a', '#283848', '#5a5a6a', '#1e2a40'];
const STYLES_M = ['short', 'messy', 'short', 'curly', 'spiky'];
const STYLES_F = ['long', 'braid', 'bun', 'long', 'pony'];

function studentLook(seed) {
  const r = srng(seed * 9301 + 49297);
  const f = r() < 0.45;
  const shirt = SHIRTS[Math.floor(r() * SHIRTS.length)];
  return {
    skin: SKINS[Math.floor(r() * SKINS.length)],
    hair: HAIRS[Math.floor(r() * HAIRS.length)],
    style: (f ? STYLES_F : STYLES_M)[Math.floor(r() * 5)],
    shirt, shirt2: shade(shirt, -0.25),
    pants: PANTS[Math.floor(r() * PANTS.length)],
    shoes: r() < 0.5 ? '#222' : '#eee',
    glasses: r() < 0.2,
  };
}

function playerLook(pers) {
  const shirt = pers === 'owl' ? '#5b4fc4' : pers === 'topper' ? '#2f8f6a' : '#e2533d';
  return { skin: '#d9a27c', hair: '#21170f', style: pers === 'topper' ? 'short' : pers === 'owl' ? 'messy' : 'spiky',
    shirt, shirt2: shade(shirt, -0.3), pants: '#2c3352', shoes: '#f0f0f0', glasses: pers === 'topper', blanket: '#3f6fc4' };
}

/* ---------- Character renderer (local coords, origin = feet) ---------- */
const SIT_POSES = { sit: 1, type: 1, write: 1, read: 1, eat: 1 };

function drawChar(c, a, t) {
  const L = a.look; if (!L) return;
  const pose = a.pose || 'stand';
  c.save();
  c.translate(Math.round(a.x), Math.round(a.y));
  if (pose === 'sleep' || pose === 'faint') { drawLying(c, a, t); c.restore(); return; }
  const dir = a.dir || 'down';
  const side = dir === 'left' || dir === 'right';
  if (dir === 'left') c.scale(-1, 1);
  const sit = !!SIT_POSES[pose];
  const ph = a.phase || 0;

  if (!sit) { c.fillStyle = 'rgba(25,20,55,.28)'; c.fillRect(-5, -1, 10, 2); c.fillRect(-4, -2, 8, 1); c.fillRect(-3, 1, 6, 1); }

  const f = a.moving ? Math.floor(a.walkT * 9) % 4 : 0;
  let bob = 0;
  if (a.moving && (f === 1 || f === 3)) bob = -1;
  if (!a.moving && pose === 'stand' && Math.sin(t * 2.2 + ph) > 0.75) bob = 1;
  if (pose === 'dance') bob = (Math.floor(t * 6 + ph) % 2) ? -2 : 0;
  if (pose === 'cheer') bob = (Math.floor(t * 7 + ph) % 2) ? -3 : 0;
  if (pose === 'tired') bob = 1 + ((Math.floor(t * 1.2 + ph) % 2) ? 1 : 0);
  if (pose === 'stretch') bob = -1;
  const oy = (sit ? 4 : 0) + bob;

  /* legs */
  if (!sit) {
    if (side) {
      const back = [-2, -4, -2, 1][f], front = [0, 2, 0, -3][f];
      R(c, back, -6 + bob, 3, 6 - bob, shade(L.pants, -0.2)); R(c, back, -1, 3, 1, L.shoes);
      R(c, front, -6 + bob, 3, 6 - bob, L.pants); R(c, front, -1, 3, 1, L.shoes);
    } else {
      const lL = f === 1 ? 1 : 0, rL = f === 3 ? 1 : 0;
      if (L.saree) { R(c, -5, -6 + bob, 10, 6 - bob, L.shirt); R(c, -4, -1, 3, 1, L.shoes); R(c, 1, -1, 3, 1, L.shoes); }
      else {
        R(c, -4, -6 + bob, 3, 6 - bob - lL, L.pants); R(c, -4, -1 - lL, 3, 1, L.shoes);
        R(c, 1, -6 + bob, 3, 6 - bob - rL, L.pants); R(c, 1, -1 - rL, 3, 1, L.shoes);
      }
    }
  }

  /* torso */
  if (side) {
    R(c, -3, -12 + oy, 7, 7, L.shirt); R(c, -3, -6 + oy, 7, 1, L.shirt2);
    if (L.apron) R(c, 1, -10 + oy, 3, 5, L.apron);
  } else {
    R(c, -5, -12 + oy, 10, 7, L.shirt); R(c, -5, -6 + oy, 10, 1, L.shirt2);
    if (dir === 'down') {
      if (L.tie) { R(c, 0, -12 + oy, 1, 6, L.tie); R(c, -1, -12 + oy, 3, 1, shade(L.tie, -0.2)); }
      if (L.apron) R(c, -4, -10 + oy, 8, 5, L.apron);
      if (L.hood) R(c, -4, -13 + oy, 8, 2, L.shirt2);
      if (L.saree) { R(c, 1, -12 + oy, 3, 7, L.saree); R(c, -5, -7 + oy, 10, 1, L.saree); }
      R(c, -1, -12 + oy, 2, 1, shade(L.skin, -0.15));
    }
  }

  /* arms */
  const s = a.moving ? (f === 1 ? 1 : f === 3 ? -1 : 0) : 0;
  const arm = (x, y, h, col) => { R(c, x, y + oy, 2, h, col || L.shirt2); };
  const hand = (x, y) => R(c, x, y + oy, 2, 2, L.skin);
  if (side) {
    if (pose === 'raise') { arm(0, -20, 8); hand(0, -22); }
    else if (pose === 'phone') { arm(1, -11, 3); hand(3, -10); R(c, 4, -12 + oy, 2, 3, '#222'); R(c, 4, -12 + oy, 1, 1, '#7fd8ff'); }
    else if (pose === 'paint') { const k = Math.floor(t * 4) % 2; arm(2, -12 - k, 2); R(c, 4, -12 + oy - k, 4, 2, L.shirt2); hand(7, -13 - k); R(c, 8, -15 + oy - k, 1, 3, '#a0703a'); }
    else if (pose === 'point') { R(c, 1, -11 + oy, 6, 2, L.shirt2); hand(7, -11); }
    else { arm(-1 + s, -11, 5); hand(-1 + s, -7); }
  } else {
    const up = (x) => { arm(x, -20, 8); hand(x, -22); };
    const down = (x, off) => { arm(x, -11 + (off || 0), 5); hand(x, -7 + (off || 0)); };
    if (pose === 'raise') { down(-7, s); up(5); }
    else if (pose === 'stretch' || pose === 'cheer') { up(-7); up(5); }
    else if (pose === 'dance') { const k = Math.floor(t * 4 + ph) % 2; if (k) { up(-7); down(5); } else { down(-7); up(5); } }
    else if (pose === 'type' || pose === 'write') {
      const k = pose === 'type' ? Math.floor(t * 10 + ph) % 2 : Math.floor(t * 3 + ph) % 2;
      arm(-7, -11 + (pose === 'type' ? k : 0), 4); arm(5, -11 + k, 4);
      if (dir === 'down') { hand(-6, -8); hand(4, -8 + k); }
    }
    else if (pose === 'read') { arm(-7, -11, 4); arm(5, -11, 4); R(c, -5, -10 + oy, 10, 5, a.bookCol || '#c0392b'); R(c, -4, -10 + oy, 8, 4, '#fff6e0'); R(c, 0, -10 + oy, 1, 4, '#c8b89a'); hand(-6, -8); hand(4, -8); }
    else if (pose === 'eat') { down(-7); const k = Math.floor(t * 2.4 + ph) % 2; if (k) { arm(4, -14, 4); hand(3, -15); R(c, 2, -16 + oy, 2, 1, '#ddd'); } else { down(5); } }
    else if (pose === 'phone') { arm(-6, -11, 3); arm(4, -11, 3); R(c, -2, -9 + oy, 4, 4, '#222'); R(c, -1, -8 + oy, 2, 2, '#7fd8ff'); }
    else if (pose === 'guitar') { down(-7); R(c, -6, -10 + oy, 8, 5, '#c47a35'); R(c, -4, -9 + oy, 3, 3, '#3a2010'); R(c, 2, -9 + oy, 7, 1, '#6b4423'); const k = Math.floor(t * 6) % 2; arm(-3, -10 + k, 3); }
    else if (pose === 'drum') { const k = Math.floor(t * 8 + ph) % 2; arm(-7, -12 + k * 2, 4); arm(5, -10 - k * 2, 4); }
    else if (pose === 'mic') { down(-7); arm(4, -14, 4); hand(3, -16); R(c, 3, -18 + oy, 2, 2, '#333'); }
    else if (pose === 'paint') { down(-7); const k = Math.floor(t * 4) % 2; up(5); R(c, 5, -25 + oy + k, 2, 3, '#a0703a'); }
    else if (pose === 'tired') { arm(-6, -10, 5); arm(4, -10, 5); }
    else if (pose === 'point') { down(-7); R(c, 4, -12 + oy, 7, 2, L.shirt2); hand(10, -12); }
    else { down(-7, s); down(5, -s); }
  }

  /* head */
  const hy = -20 + oy + (pose === 'tired' ? 1 : 0);
  if (side) R(c, -3, hy, 7, 8, L.skin); else R(c, -4, hy, 8, 8, L.skin);
  drawHair(c, L, dir, hy, side);
  if (dir !== 'up') drawFace(c, a, L, hy, side, t, pose);

  c.restore();
}

function drawHair(c, L, dir, hy, side) {
  const h = L.hair, st = L.style;
  if (st === 'cap') {
    if (side) { R(c, -4, hy - 2, 8, 3, L.cap); R(c, 3, hy, 3, 1, shade(L.cap, -0.2)); R(c, -4, hy + 1, 2, 3, h); }
    else { R(c, -5, hy - 2, 10, 4, L.cap); R(c, -5, hy + 1, 10, 1, shade(L.cap, -0.2)); if (dir === 'up') R(c, -4, hy + 2, 8, 3, h); }
    return;
  }
  if (st === 'bald') {
    if (side) { R(c, -4, hy + 2, 2, 4, h); }
    else if (dir === 'up') { R(c, -4, hy + 3, 8, 4, h); R(c, -2, hy + 1, 3, 1, shade(L.skin, 0.25)); }
    else { R(c, -5, hy + 2, 2, 4, h); R(c, 3, hy + 2, 2, 4, h); R(c, -2, hy + 1, 3, 1, shade(L.skin, 0.25)); }
    return;
  }
  const longish = st === 'long' || st === 'braid' || st === 'pony';
  if (dir === 'up') {
    R(c, -4, hy - 1, 8, 7, h);
    if (st === 'curly') { R(c, -5, hy - 2, 10, 8, h); }
    if (longish) R(c, -5, hy, 10, 10, h);
    if (st === 'braid') R(c, -1, hy + 9, 2, 5, shade(h, 0.1));
    if (st === 'bun') R(c, -2, hy - 3, 4, 3, h);
    if (st === 'pony') R(c, -1, hy + 6, 2, 6, h);
    return;
  }
  if (side) {
    R(c, -4, hy - 1, 8, 3, h); R(c, -4, hy + 1, 3, 4, h);
    if (st === 'curly') { R(c, -5, hy - 2, 9, 4, h); R(c, -5, hy + 1, 3, 5, h); }
    if (st === 'messy' || st === 'spiky') { R(c, -3, hy - 2, 1, 1, h); R(c, 0, hy - 3, 2, 2, h); R(c, 3, hy - 2, 1, 1, h); }
    if (longish) R(c, -5, hy + 1, 3, 9, h);
    if (st === 'pony') R(c, -7, hy + 1, 3, 6, h);
    if (st === 'bun') R(c, -6, hy - 1, 3, 3, h);
    return;
  }
  R(c, -4, hy - 1, 8, 3, h); R(c, -5, hy + 1, 1, 3, h); R(c, 4, hy + 1, 1, 3, h);
  if (st === 'messy') { R(c, -3, hy - 2, 1, 1, h); R(c, -1, hy - 2, 2, 1, h); R(c, 2, hy - 2, 1, 1, h); R(c, 0, hy + 2, 2, 1, h); }
  if (st === 'spiky') { R(c, -4, hy - 3, 1, 2, h); R(c, -1, hy - 3, 2, 2, h); R(c, 3, hy - 3, 1, 2, h); }
  if (st === 'curly') { R(c, -5, hy - 2, 10, 4, h); R(c, -6, hy, 2, 4, h); R(c, 4, hy, 2, 4, h); }
  if (st === 'short') R(c, -3, hy + 2, 2, 1, h);
  if (longish) { R(c, -5, hy + 1, 2, 10, h); R(c, 3, hy + 1, 2, 10, h); }
  if (st === 'braid') { R(c, 4, hy + 8, 2, 6, shade(h, 0.1)); R(c, 4, hy + 13, 2, 1, '#e8566f'); }
  if (st === 'bun') R(c, -2, hy - 3, 4, 3, h);
}

function drawFace(c, a, L, hy, side, t, pose) {
  const eye = '#1a1730';
  let expr = a.expr || 'normal';
  if (pose === 'tired' && expr === 'normal') expr = 'tired';
  const blink = (Math.floor(t * 10 + (a.phase || 0) * 7) % 37) === 0;
  const ey = hy + 4;
  if (side) {
    if (L.glasses) { R(c, 0, ey - 1, 4, 3, '#cfe8ff'); R(c, 0, ey - 1, 4, 1, '#2a2a3a'); }
    if (expr === 'sleep' || blink || expr === 'happy') R(c, 1, ey + 1, 2, 1, eye);
    else if (expr === 'shock') R(c, 1, ey - 1, 2, 3, eye);
    else if (expr === 'tired') { R(c, 1, ey + 1, 2, 1, eye); R(c, 1, ey + 2, 2, 1, '#a67888'); }
    else R(c, 2, ey, 1, 2, eye);
    if (L.mustache) R(c, 2, hy + 6, 3, 1, L.hair === '#c9c9c9' ? '#555' : L.hair);
    R(c, 4, hy + 4, 1, 1, shade(L.skin, -0.12));
    if (expr === 'shock') R(c, 2, hy + 6, 2, 2, '#5a1a1a');
    else if (!L.mustache) R(c, 2, hy + 6, 2, 1, '#8a3a2a');
  } else {
    if (L.glasses) { R(c, -4, ey - 1, 3, 3, '#cfe8ff'); R(c, 1, ey - 1, 3, 3, '#cfe8ff'); R(c, -1, ey, 2, 1, '#2a2a3a'); R(c, -4, ey - 1, 3, 1, '#2a2a3a'); R(c, 1, ey - 1, 3, 1, '#2a2a3a'); }
    if (expr === 'sleep' || blink) { R(c, -3, ey + 1, 2, 1, eye); R(c, 1, ey + 1, 2, 1, eye); }
    else if (expr === 'happy') { R(c, -3, ey, 2, 1, eye); R(c, 1, ey, 2, 1, eye); R(c, -4, ey + 2, 1, 1, '#f08a8a'); R(c, 3, ey + 2, 1, 1, '#f08a8a'); }
    else if (expr === 'shock') { R(c, -3, ey - 1, 2, 3, eye); R(c, 1, ey - 1, 2, 3, eye); }
    else if (expr === 'tired') { R(c, -3, ey + 1, 2, 1, eye); R(c, 1, ey + 1, 2, 1, eye); R(c, -3, ey + 2, 2, 1, '#a67888'); R(c, 1, ey + 2, 2, 1, '#a67888'); }
    else if (expr === 'angry') { R(c, -3, ey, 1, 2, eye); R(c, 2, ey, 1, 2, eye); R(c, -4, ey - 2, 2, 1, eye); R(c, -2, ey - 1, 1, 1, eye); R(c, 2, ey - 2, 2, 1, eye); R(c, 1, ey - 1, 1, 1, eye); }
    else if (expr === 'sus') { R(c, -3, ey + 1, 2, 1, eye); R(c, 2, ey, 1, 2, eye); R(c, 1, ey - 2, 3, 1, eye); }
    else { R(c, -3, ey, 1, 2, eye); R(c, 2, ey, 1, 2, eye); }
    const my = hy + 6;
    if (L.mustache) R(c, -2, my, 4, 1, L.hair === '#c9c9c9' ? '#555' : L.hair);
    if (expr === 'happy') { R(c, -2, my + (L.mustache ? 1 : 0), 4, 1, '#7a2a20'); R(c, -1, my + 1, 2, 1, '#e86a6a'); }
    else if (expr === 'shock') R(c, -1, my, 2, 2, '#4a1414');
    else if (expr === 'angry' || expr === 'tired') R(c, -1, my + 1, 3, 1, '#7a2a20');
    else if (!L.mustache) R(c, -1, my + 1, 2, 1, '#8a3a2a');
  }
  if (a.sweat || expr === 'stress') { const k = Math.floor(t * 3) % 3; R(c, side ? -4 : 5, hy + 1 + k, 1, 2, '#7fd0ff'); }
}

function drawLying(c, a, t) {
  const L = a.look;
  if (a.pose === 'faint') {
    R(c, -6, -5, 12, 6, L.shirt); R(c, 6, -5, 6, 6, L.pants); R(c, 12, -4, 2, 4, L.shoes);
    R(c, -14, -6, 8, 8, L.skin); R(c, -15, -7, 3, 9, L.hair);
    R(c, -10, -4, 2, 2, '#1a1730'); R(c, -10, -1, 2, 2, '#1a1730'); R(c, -9, -3, 1, 1, L.skin); R(c, -9, 0, 1, 1, L.skin);
    return;
  }
  const bl = L.blanket || '#4f6fc4';
  const bw = a.bedW || 38;
  R(c, -3, -7, bw, 12, bl); R(c, -3, -7, bw, 2, shade(bl, 0.25)); R(c, -3, 4, bw, 1, shade(bl, -0.25));
  for (let i = 0; i < bw / 8; i++) R(c, 2 + i * 8, -4, 1, 7, shade(bl, -0.12));
  const breathe = Math.sin(t * 2 + (a.phase || 0)) > 0 ? 0 : 1;
  R(c, 0, -8 - breathe, 14, 1, shade(bl, 0.3));
  R(c, -11, -6, 8, 8, L.skin); R(c, -12, -7, 3, 10, L.hair);
  const e = a.expr || 'sleep';
  if (e === 'shock') { R(c, -7, -4, 2, 2, '#1a1730'); R(c, -7, 0, 2, 2, '#1a1730'); }
  else { R(c, -7, -4, 1, 2, '#1a1730'); R(c, -7, 0, 1, 2, '#1a1730'); }
  R(c, -5, -2, 1, 2, '#8a3a2a');
}

/* ---------- Portrait (for dialogue box) ---------- */
function drawPortrait(canvas, look, expr, t) {
  const c = canvas.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, canvas.width, canvas.height);
  if (!look) return;
  c.save(); c.scale(canvas.width / 20, canvas.height / 20);
  drawChar(c, { x: 10, y: 24, look, dir: 'down', pose: 'stand', expr: expr || 'normal', phase: 0 }, t || 0);
  c.restore();
}

/* ---------- Props ---------- */
const PROP = {
  tree(c, x, y, t, p) {
    c.fillStyle = 'rgba(25,40,30,.28)'; blob(c, x, y - 1, 10, 'rgba(25,40,30,.25)', 3);
    R(c, x - 2, y - 10, 4, 10, '#6e4426'); R(c, x - 2, y - 10, 1, 10, '#8a5a34');
    const sw = Math.round(Math.sin(t * 1.3 + x * 0.07) * 0.8);
    const k = p.variant || 0;
    const cols = k === 1 ? ['#2f7a3a', '#3f9a48', '#5cb85a'] : k === 2 ? ['#2e6e42', '#3c8a4c', '#56a85e'] : ['#357f3c', '#47a04a', '#66bf5c'];
    blob(c, x + sw, y - 20, 11, cols[0], 10);
    blob(c, x - 1 + sw, y - 22, 9, cols[1], 8);
    blob(c, x - 4 + sw, y - 25, 4, cols[2], 3);
    if (k === 1) { const r = srng(x * 7 + y); for (let i = 0; i < 14; i++) R(c, x - 9 + Math.floor(r() * 18) + sw, y - 29 + Math.floor(r() * 17), 2, 2, i % 3 ? '#e8452c' : '#ff8a3a'); }
    if (k === 2) { const r = srng(x * 3 + y); for (let i = 0; i < 6; i++) R(c, x - 7 + Math.floor(r() * 14) + sw, y - 27 + Math.floor(r() * 14), 2, 2, '#f7d14a'); }
  },
  palm(c, x, y, t) {
    blob(c, x, y - 1, 7, 'rgba(25,40,30,.25)', 2);
    for (let i = 0; i < 26; i++) R(c, x - 1 + Math.round(Math.sin(i * 0.12) * 1), y - i, 3, 1, i % 4 ? '#8a6a44' : '#6e5232');
    const sw = Math.sin(t * 1.5 + x) * 1;
    const lf = (dx, dy, len) => { for (let i = 0; i < len; i++) R(c, x + Math.round(dx * i + sw), y - 27 + Math.round(dy * i + i * i * 0.06), 3, 2, i % 3 ? '#3f9a48' : '#2f7a3a'); };
    lf(1, -0.4, 11); lf(-1, -0.4, 11); lf(0.7, 0.2, 9); lf(-0.7, 0.2, 9); lf(0.2, -0.9, 6);
  },
  bush(c, x, y, t, p) {
    blob(c, x, y - 1, 8, 'rgba(25,40,30,.2)', 2);
    blob(c, x, y - 6, 8, '#3d8a40', 6); blob(c, x - 2, y - 8, 5, '#56a84f', 4);
    if (p.flowers) { R(c, x - 4, y - 9, 2, 2, p.flowers); R(c, x + 3, y - 7, 2, 2, p.flowers); R(c, x - 1, y - 5, 2, 2, p.flowers); }
  },
  bench(c, x, y, t, p) {
    if (p.vertical) { R(c, x - 4, y - 18, 8, 18, '#a06a3a'); for (let i = 0; i < 3; i++) R(c, x - 4, y - 16 + i * 6, 8, 1, '#7a4a24'); R(c, x - 5, y - 18, 1, 18, '#555'); return; }
    R(c, x - 12, y - 4, 2, 4, '#444'); R(c, x + 10, y - 4, 2, 4, '#444');
    R(c, x - 13, y - 10, 26, 6, '#b37440'); R(c, x - 13, y - 10, 26, 1, '#d08c50'); R(c, x - 13, y - 7, 26, 1, '#8a5428');
    R(c, x - 13, y - 14, 26, 3, '#a06a3a');
  },
  lamp(c, x, y, t) {
    R(c, x - 2, y - 2, 4, 2, '#3a3a4a'); R(c, x - 1, y - 24, 2, 22, '#4a4a5c');
    R(c, x - 3, y - 27, 6, 3, '#3a3a4a');
    const night = G && G.darkness > 0.25;
    R(c, x - 2, y - 25, 4, 2, night ? '#fff2a8' : '#d8d8c8');
  },
  sign(c, x, y, t, p) {
    R(c, x - 1, y - 14, 2, 14, '#6e4426');
    const w = p.w || 30;
    R(c, x - w / 2, y - 22, w, 10, '#2f5d8a'); R(c, x - w / 2, y - 22, w, 1, '#4a80b0'); R(c, x - w / 2 + 1, y - 13, w - 2, 1, '#1f3d5c');
  },
  notice(c, x, y) {
    R(c, x - 14, y - 2, 2, 2, '#5a3a22'); R(c, x + 12, y - 2, 2, 2, '#5a3a22');
    R(c, x - 14, y - 22, 28, 20, '#8a5a34'); R(c, x - 12, y - 20, 24, 16, '#d8b88a');
    R(c, x - 10, y - 18, 8, 6, '#fff'); R(c, x + 1, y - 19, 9, 7, '#ffe98a'); R(c, x - 9, y - 10, 10, 5, '#ffb0b0'); R(c, x + 3, y - 10, 6, 5, '#b0e0ff');
  },
  fountain(c, x, y, t) {
    blob(c, x, y - 10, 26, '#9a8f86', 12);
    blob(c, x, y - 11, 23, '#c9c0b4', 10);
    blob(c, x, y - 11, 20, '#3f8fd0', 8);
    const k = t * 2;
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + k * 0.3; R(c, x + Math.cos(a) * (10 + Math.sin(k + i) * 3), y - 11 + Math.sin(a) * 4, 3, 1, '#9fd8ff'); }
    R(c, x - 3, y - 22, 6, 12, '#b8ad9e'); R(c, x - 5, y - 24, 10, 3, '#d8cfc2');
    const jet = Math.floor(t * 8) % 3;
    R(c, x - 1, y - 32 - jet, 2, 9, '#bfe6ff');
    R(c, x - 4, y - 30 + jet, 1, 4, '#9fd8ff'); R(c, x + 3, y - 30 + ((jet + 1) % 3), 1, 4, '#9fd8ff');
  },
  flowers(c, x, y, t, p) {
    R(c, x - p.w / 2, y - 6, p.w, 6, '#7a4a2a'); R(c, x - p.w / 2, y - 6, p.w, 1, '#94603a');
    const r = srng(x * 13 + y);
    for (let i = 0; i < p.w / 3; i++) { R(c, x - p.w / 2 + 1 + Math.floor(r() * (p.w - 3)), y - 6 + Math.floor(r() * 4), 2, 2, ['#ff6f91', '#ffd23f', '#ff9f43', '#ffffff', '#c56cf0'][Math.floor(r() * 5)]); R(c, x - p.w / 2 + 1 + Math.floor(r() * (p.w - 3)), y - 5 + Math.floor(r() * 4), 1, 2, '#3d8a40'); }
  },
  cycles(c, x, y) {
    R(c, x - 22, y - 2, 44, 2, '#6a6a7a');
    for (let i = 0; i < 4; i++) {
      const bx = x - 18 + i * 11, col = ['#e2533d', '#2f8fd0', '#2a2a2a', '#f2b134'][i];
      blob(c, bx, y - 4, 3, '#222', 3); blob(c, bx, y - 4, 1, '#888', 1);
      blob(c, bx + 6, y - 4, 3, '#222', 3); blob(c, bx + 6, y - 4, 1, '#888', 1);
      R(c, bx, y - 8, 7, 1, col); R(c, bx + 2, y - 10, 1, 4, col); R(c, bx + 5, y - 11, 2, 1, '#333'); R(c, bx + 1, y - 11, 3, 1, '#333');
    }
  },
  cooler(c, x, y) {
    R(c, x - 6, y - 16, 12, 16, '#d8dde8'); R(c, x - 6, y - 16, 12, 2, '#eef2fa'); R(c, x - 4, y - 10, 8, 4, '#2f8fd0');
    R(c, x - 1, y - 6, 2, 2, '#888'); R(c, x - 3, y - 18, 6, 2, '#a8b8d8');
  },
  gate(c, x, y) {
    R(c, x - 6, y - 40, 12, 40, '#b0522f'); R(c, x - 7, y - 42, 14, 4, '#d06a40'); R(c, x - 6, y - 40, 12, 2, '#e08a5a');
    for (let i = 0; i < 5; i++) R(c, x - 6, y - 34 + i * 7, 12, 1, '#8a3f22');
  },
  gatebar(c, x, y, t, p) {
    for (let i = 0; i < p.w; i += 5) R(c, x + i, y - 18, 2, 18, '#3a3a4a');
    R(c, x, y - 18, p.w, 2, '#4a4a5c'); R(c, x, y - 8, p.w, 2, '#4a4a5c');
  },
  hedgeH(c, x, y, t, p) { R(c, x, y - 7, p.w, 7, '#3d8a40'); R(c, x, y - 7, p.w, 2, '#56a84f'); for (let i = 0; i < p.w; i += 6) R(c, x + i, y - 8, 4, 1, '#56a84f'); },
  hedgeV(c, x, y, t, p) { R(c, x, y - p.h, 6, p.h, '#3d8a40'); R(c, x, y - p.h, 2, p.h, '#56a84f'); },
  wall(c, x, y, t, p) { R(c, x, y - 10, p.w, 10, '#b86a4a'); R(c, x, y - 10, p.w, 2, '#d88a6a'); for (let i = 0; i < p.w; i += 8) R(c, x + i, y - 8, 1, 8, '#9a5236'); },
  cow(c, x, y, t, p) {
    const sw = Math.floor(t * 2) % 2;
    c.save(); c.translate(x, y); if (p.flip) c.scale(-1, 1);
    blob(c, 0, -1, 12, 'rgba(25,40,30,.25)', 2);
    R(c, -9, -6, 2, 6, '#e8e2d8'); R(c, 6, -6, 2, 6, '#e8e2d8'); R(c, -6, -6, 2, 6, '#d8d2c8'); R(c, 3, -6, 2, 6, '#d8d2c8');
    R(c, -10, -16, 20, 11, '#f4f0e8'); R(c, -6, -14, 5, 4, '#4a3a32'); R(c, 3, -11, 4, 4, '#4a3a32'); R(c, -10, -16, 20, 2, '#ffffff');
    R(c, 9, -19, 7, 8, '#f4f0e8'); R(c, 13, -14, 4, 3, '#e8a8a0'); R(c, 11, -17, 1, 1, '#222'); R(c, 9, -21, 1, 3, '#d8c8a8'); R(c, 15, -21, 1, 3, '#d8c8a8');
    R(c, -12, -15 + sw, 2, 6, '#e8e2d8'); R(c, -13, -9 + sw, 2, 2, '#4a3a32');
    c.restore();
  },
  dog(c, x, y, t) {
    blob(c, x, y - 1, 8, 'rgba(25,40,30,.25)', 2);
    blob(c, x, y - 4, 7, '#b07a3a', 4); blob(c, x + 5, y - 5, 3, '#c08a4a', 3); R(c, x + 6, y - 8, 2, 2, '#7a4a20'); R(c, x + 5, y - 5, 1, 1, '#222');
    R(c, x - 7, y - 4, 3, 2, '#b07a3a');
  },
  stage(c, x, y, t, p) {
    const w = p.w, h = p.h, X = x - w / 2, Y = y - h;
    R(c, X, Y + 10, w, h - 10, '#5a3a2a'); R(c, X, Y + 10, w, 3, '#7a5236');
    for (let i = 0; i < w; i += 16) R(c, X + i, Y + 12, 1, h - 12, '#4a2e20');
    R(c, X, y - 6, w, 6, '#3a2418');
    R(c, X + 2, Y - 18, 3, 30, '#2a2a3a'); R(c, X + w - 5, Y - 18, 3, 30, '#2a2a3a'); R(c, X + 2, Y - 20, w - 4, 3, '#2a2a3a');
    if (p.fest >= 2) {
      R(c, X + 8, Y - 16, w - 16, 12, '#22223a');
      const cols = ['#ff4f7b', '#ffd23f', '#2ec4b6', '#7a5cff'];
      for (let i = 0; i < 6; i++) R(c, X + 10 + i * ((w - 22) / 5), Y - 18, 3, 3, cols[(i + Math.floor(t * 4)) % 4]);
      R(c, X + 8, Y + 14, 12, 16, '#1a1a22'); R(c, X + w - 20, Y + 14, 12, 16, '#1a1a22');
      blob(c, X + 14, Y + 22, 4, '#3a3a4a'); blob(c, X + w - 14, Y + 22, 4, '#3a3a4a');
      blob(c, X + 14, Y + 22, 2 + (Math.floor(t * 8) % 2), '#555');
    } else if (p.fest === 1) {
      R(c, X + 20, Y - 10, 2, 24, '#c9a060'); R(c, X + 22, Y - 4, 12, 2, '#c9a060');
      R(c, X + w / 2 - 20, Y - 15, 40, 10, '#f2e6c8');
    }
  },
  banner(c, x, y, t, p) {
    R(c, x - 30, y - 30, 2, 30, '#6e4426'); R(c, x + 28, y - 30, 2, 30, '#6e4426');
    const sw = Math.round(Math.sin(t * 2) * 1);
    R(c, x - 28, y - 28 + sw, 56, 14, p.done() ? '#ffb627' : '#f2ead8');
    if (!p.done()) { R(c, x - 24, y - 24 + sw, 18, 2, '#e2533d'); R(c, x - 3, y - 24 + sw, 8, 2, '#2ec4b6'); }
    R(c, x - 28, y - 15 + sw, 56, 1, '#00000033');
  },
  stall(c, x, y, t, p) {
    const col = p.col || '#e2533d';
    R(c, x - 18, y - 12, 36, 12, '#c9a26a'); R(c, x - 18, y - 12, 36, 2, '#e0bc84');
    R(c, x - 17, y - 30, 2, 18, '#6e4426'); R(c, x + 15, y - 30, 2, 18, '#6e4426');
    for (let i = 0; i < 6; i++) R(c, x - 20 + i * 7, y - 34, 7, 8, i % 2 ? '#fff4dc' : col);
    for (let i = 0; i < 6; i++) R(c, x - 20 + i * 7 + 1, y - 26, 5, 2, i % 2 ? '#fff4dc' : col);
    if (p.items) { for (let i = 0; i < 4; i++) R(c, x - 12 + i * 7, y - 15, 4, 3, p.items[i % p.items.length]); }
  },
  speaker(c, x, y, t) {
    R(c, x - 6, y - 22, 12, 22, '#1a1a22'); blob(c, x, y - 14, 4, '#3a3a4a'); blob(c, x, y - 14, 2 + (Math.floor(t * 8) % 2), '#555'); blob(c, x, y - 5, 2, '#3a3a4a');
  },
  dhaba(c, x, y) {
    R(c, x - 10, y - 14, 20, 14, '#8a5a34'); R(c, x - 12, y - 18, 24, 5, '#c94a2a'); R(c, x - 6, y - 10, 4, 4, '#ddd'); R(c, x + 2, y - 11, 5, 5, '#a0a0a8');
  },
  sparkle(c, x, y, t, p) {
    if (!p.on()) return;
    const k = Math.floor(t * 5) % 4;
    R(c, x - 3, y - 3, 6, 4, p.col || '#ffffff');
    const s = [2, 3, 4, 3][k];
    R(c, x - 1, y - 8 - s, 2, s * 2 - 1, '#fff6a8'); R(c, x - s, y - 8, s * 2, 1, '#fff6a8');
  },
  /* ---- interior props ---- */
  bed(c, x, y, t, p) {
    R(c, x, y - 30, 58, 30, '#7a4a2a'); R(c, x, y - 30, 58, 2, '#9a6a3a'); R(c, x, y - 4, 58, 4, '#5a3418');
    R(c, x + 2, y - 28, 54, 22, '#efe8dc');
    R(c, x + 3, y - 26, 12, 16, '#ffffff'); R(c, x + 3, y - 12, 12, 2, '#dcd4c6');
    if (!p.occupied || !p.occupied()) { R(c, x + 16, y - 27, 39, 20, p.blanket || '#3f6fc4'); R(c, x + 16, y - 27, 39, 3, shade(p.blanket || '#3f6fc4', 0.25)); for (let i = 0; i < 4; i++) R(c, x + 20 + i * 9, y - 22, 1, 12, shade(p.blanket || '#3f6fc4', -0.15)); }
  },
  desk(c, x, y, t, p) {
    R(c, x, y - 20, p.w, 12, '#a87a4a'); R(c, x, y - 20, p.w, 2, '#c8965e'); R(c, x, y - 8, p.w, 8, '#7a5230'); R(c, x + 2, y - 7, p.w - 4, 1, '#5a3a20');
    if (p.laptop) {
      const on = p.on ? p.on() : false;
      R(c, x + p.w / 2 - 9, y - 29, 18, 11, '#2a2d3a'); R(c, x + p.w / 2 - 8, y - 28, 16, 9, on ? '#6ad0ff' : '#3a4a6a');
      if (on) { for (let i = 0; i < 4; i++) R(c, x + p.w / 2 - 6, y - 26 + i * 2, 4 + ((i * 5 + Math.floor(t * 6)) % 9), 1, '#ffffff'); }
      R(c, x + p.w / 2 - 10, y - 18, 20, 3, '#3a3d4a');
    }
    if (p.gaming) { R(c, x + 6, y - 32, 22, 14, '#111'); R(c, x + 7, y - 31, 20, 12, ['#ff4f7b', '#7a5cff', '#2ec4b6'][Math.floor(t * 2) % 3]); R(c, x + 4, y - 18, 26, 3, '#222'); R(c, x + p.w - 10, y - 30, 6, 12, '#1a1a1a'); R(c, x + p.w - 9, y - 28, 4, 1, '#ff4f7b'); }
    if (p.lampOn) { R(c, x + p.w - 8, y - 30, 2, 10, '#444'); R(c, x + p.w - 12, y - 32, 9, 4, '#f2b134'); }
    if (p.books) { R(c, x + 3, y - 24, 4, 6, '#c0392b'); R(c, x + 7, y - 25, 4, 7, '#2f8fd0'); R(c, x + 11, y - 23, 4, 5, '#2ec4b6'); }
    if (p.mug) { R(c, x + p.w - 14, y - 22, 4, 4, '#fff'); R(c, x + p.w - 10, y - 21, 1, 2, '#fff'); }
  },
  sidetable(c, x, y, t, p) {
    R(c, x - 7, y - 14, 14, 14, '#8a5a34'); R(c, x - 7, y - 14, 14, 2, '#a87a4a');
    const ring = p.ringing && p.ringing();
    const jx = ring ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
    if (!p.fallen || !p.fallen()) {
      R(c, x - 4 + jx, y - 21, 8, 7, '#e2533d'); R(c, x - 3 + jx, y - 20, 6, 5, '#fff6e0'); R(c, x + jx, y - 19, 1, 2, '#222'); R(c, x + jx, y - 18, 2, 1, '#222');
      R(c, x - 5 + jx, y - 23, 3, 2, '#ffd23f'); R(c, x + 2 + jx, y - 23, 3, 2, '#ffd23f');
    }
  },
  almirah(c, x, y) { R(c, x, y - 40, 26, 40, '#8a97a8'); R(c, x, y - 40, 26, 2, '#b0bccc'); R(c, x + 12, y - 38, 1, 36, '#5a6678'); R(c, x + 9, y - 22, 2, 4, '#ddd'); R(c, x + 15, y - 22, 2, 4, '#ddd'); },
  bucket(c, x, y) { R(c, x - 6, y - 10, 12, 10, '#2f8fd0'); R(c, x - 7, y - 11, 14, 2, '#4aa8e8'); R(c, x - 5, y - 9, 10, 3, '#9fd8ff'); R(c, x + 5, y - 14, 5, 4, '#e2533d'); },
  clothes(c, x, y) { blob(c, x, y - 4, 9, '#5a6a8a', 4); R(c, x - 6, y - 7, 6, 3, '#e2533d'); R(c, x + 1, y - 6, 7, 3, '#f2b134'); R(c, x - 2, y - 4, 5, 2, '#ffffff'); },
  maggi(c, x, y) { R(c, x - 4, y - 4, 8, 4, '#f7d14a'); R(c, x - 4, y - 4, 8, 1, '#e2533d'); R(c, x + 3, y - 3, 6, 3, '#f7d14a'); },
  guitar(c, x, y) { blob(c, x, y - 6, 5, '#c47a35', 5); blob(c, x, y - 6, 2, '#3a2010'); R(c, x - 1, y - 22, 2, 12, '#6b4423'); R(c, x - 2, y - 24, 4, 3, '#3a2010'); },
  bench_row(c, x, y, t, p) {
    R(c, x, y - 12, p.w, 8, '#c8955e'); R(c, x, y - 12, p.w, 2, '#e0b07a'); R(c, x, y - 4, p.w, 4, '#8a5a34');
    if (p.papers) for (const px of p.papers()) { R(c, px - 4, y - 11, 8, 6, '#ffffff'); R(c, px - 3, y - 10, 5, 1, '#9aa'); R(c, px - 3, y - 8, 4, 1, '#9aa'); }
  },
  profdesk(c, x, y, t, p) {
    R(c, x, y - 18, p.w, 12, '#7a4a2a'); R(c, x, y - 18, p.w, 2, '#9a6a3a'); R(c, x, y - 6, p.w, 6, '#5a3418');
    R(c, x + 6, y - 17, 14, 9, '#2f5d8a'); R(c, x + 7, y - 16, 12, 7, '#f6efe0'); R(c, x + 12, y - 16, 1, 7, '#c8b89a');
    R(c, x + p.w - 14, y - 16, 8, 5, '#ddd'); R(c, x + p.w - 22, y - 16, 3, 7, '#e2533d');
  },
  shelf(c, x, y, t, p) {
    R(c, x, y - 28, p.w, 28, '#6e4426'); R(c, x, y - 28, p.w, 2, '#8a5a34');
    const r = srng(x * 5 + y * 3);
    for (let row = 0; row < 3; row++) {
      R(c, x + 1, y - 26 + row * 8 + 6, p.w - 2, 1, '#4a2a14');
      for (let bx = x + 2; bx < x + p.w - 3;) { const bw = 2 + Math.floor(r() * 3); R(c, bx, y - 26 + row * 8 + (r() < 0.2 ? 1 : 0), bw, 6, ['#c0392b', '#2f8fd0', '#2ec4b6', '#f2b134', '#7a5cc4', '#4caf6a', '#e8e2d0'][Math.floor(r() * 7)]); bx += bw + (r() < 0.15 ? 2 : 0); }
    }
  },
  table(c, x, y, t, p) {
    R(c, x, y - 14, p.w, 10, '#b88452'); R(c, x, y - 14, p.w, 2, '#d8a46e'); R(c, x + 2, y - 4, 3, 4, '#6e4426'); R(c, x + p.w - 5, y - 4, 3, 4, '#6e4426');
    if (p.items) p.items(c, x, y, t);
  },
  counter(c, x, y, t, p) {
    R(c, x, y - 18, p.w, 18, '#c9583a'); R(c, x, y - 20, p.w, 5, '#e8d8b8'); R(c, x, y - 20, p.w, 1, '#fff');
    for (let i = 8; i < p.w; i += 16) R(c, x + i, y - 12, 8, 8, '#a8442a');
    R(c, x + 10, y - 27, 10, 8, '#a0a0a8'); R(c, x + 12, y - 30, 6, 3, '#c0c0c8');
    const st = Math.floor(t * 3) % 3; R(c, x + 14, y - 34 - st, 2, 3, '#ffffff88');
    for (let i = 0; i < 5; i++) blob(c, x + 34 + i * 7, y - 22, 3, '#d8963a', 2);
    R(c, x + 74, y - 27, 16, 8, '#e8e2d8'); R(c, x + 75, y - 26, 14, 3, '#f2c14e');
    R(c, x + p.w - 30, y - 26, 6, 7, '#e2533d'); R(c, x + p.w - 22, y - 25, 6, 6, '#f2b134');
  },
  plant(c, x, y) { R(c, x - 5, y - 8, 10, 8, '#c4683a'); R(c, x - 6, y - 9, 12, 2, '#d88050'); blob(c, x, y - 15, 7, '#3d8a40', 6); blob(c, x - 2, y - 17, 4, '#56a84f', 3); },
  chair(c, x, y) { R(c, x - 5, y - 10, 10, 6, '#7a5230'); R(c, x - 5, y - 4, 2, 4, '#5a3a20'); R(c, x + 3, y - 4, 2, 4, '#5a3a20'); },
  fan(c, x, y, t) {
    const a = t * 14;
    blob(c, x, y, 3, '#5a5a6a');
    for (let i = 0; i < 3; i++) { const an = a + i * 2.094; for (let r = 3; r < 16; r++) R(c, x + Math.cos(an) * r, y + Math.sin(an) * r * 0.5, 2, 2, '#8a8a9a'); }
  },
};

/* ---------- Building painter (into prerendered background) ---------- */
function paintBuilding(c, b) {
  const X = b.x * TILE, Y = b.y * TILE, W = b.w * TILE, H = b.h * TILE;
  const rh = Math.round(H * 0.42);
  const wy = Y + rh, wh = H - rh;
  const st = b.style;
  const pal = {
    hostel: { wall: '#c8603f', wall2: '#a84c30', roof: '#525c7a', roof2: '#3f4760', trim: '#e8d6b0' },
    lecture: { wall: '#ecc187', wall2: '#d4a468', roof: '#b4513a', roof2: '#8e3c2a', trim: '#fff2d8' },
    library: { wall: '#a8bccf', wall2: '#8aa0b6', roof: '#3d4766', roof2: '#2c3450', trim: '#f4f4f0' },
    canteen: { wall: '#f2c85c', wall2: '#d8ac40', roof: '#8a3f2c', roof2: '#6a2e1e', trim: '#fff6dc' },
  }[st];
  // drop shadow
  c.fillStyle = 'rgba(20,30,40,.25)'; c.fillRect(X + 6, Y + H, W, 6); c.fillRect(X + W, Y + 8, 6, H);
  // roof
  R(c, X, Y, W, rh, pal.roof);
  for (let yy = Y + 4; yy < Y + rh - 4; yy += 5) R(c, X, yy, W, 1, pal.roof2);
  for (let yy = Y + 4, k = 0; yy < Y + rh - 4; yy += 5, k++) for (let xx = X + (k % 2) * 6; xx < X + W; xx += 12) R(c, xx, yy, 1, 5, pal.roof2);
  R(c, X, Y, W, 2, shade(pal.roof, 0.25));
  R(c, X - 2, Y + rh - 4, W + 4, 4, pal.roof2);
  R(c, X - 2, Y + rh - 1, W + 4, 1, '#1a1a2a');
  if (st === 'library') { // pediment
    for (let i = 0; i < 16; i++) R(c, X + W / 2 - 40 + i * 2.5, Y + rh - 6 - i, 80 - i * 5, 1, pal.trim);
  }
  // wall
  R(c, X, wy, W, wh, pal.wall);
  if (st === 'hostel') { for (let yy = wy + 3; yy < Y + H; yy += 4) { R(c, X, yy, W, 1, pal.wall2); for (let xx = X + ((yy / 4) % 2) * 4; xx < X + W; xx += 8) R(c, xx, yy - 3, 1, 3, pal.wall2); } }
  if (st === 'lecture') { for (let yy = wy + 7; yy < Y + H; yy += 8) R(c, X, yy, W, 1, pal.wall2); }
  if (st === 'canteen') { for (let xx = X + 6; xx < X + W; xx += 12) R(c, xx, wy, 1, wh, pal.wall2); }
  R(c, X, Y + H - 4, W, 4, shade(pal.wall2, -0.15));
  // windows
  const doorX = b.door * TILE;
  const nWin = Math.floor(W / 28);
  for (let i = 0; i < nWin; i++) {
    const wx = X + 10 + i * ((W - 20) / nWin) + ((W - 20) / nWin - 14) / 2;
    if (Math.abs(wx + 7 - (doorX + 8)) < 24) continue;
    const wy2 = wy + 8;
    if (st === 'lecture') { R(c, wx, wy2 + 3, 14, 16, pal.trim); R(c, wx + 2, wy2 + 1, 10, 2, pal.trim); R(c, wx + 2, wy2 + 4, 10, 14, '#4a7ab0'); R(c, wx + 3, wy2 + 2, 8, 2, '#4a7ab0'); R(c, wx + 6, wy2 + 2, 2, 16, pal.trim); }
    else if (st === 'library') { R(c, wx - 1, wy2, 16, 22, pal.trim); R(c, wx + 1, wy2 + 2, 12, 18, '#4f7fa8'); R(c, wx + 1, wy2 + 10, 12, 1, pal.trim); R(c, wx + 3, wy2 + 3, 2, 6, '#8fc0e8'); }
    else {
      R(c, wx, wy2, 14, 14, pal.trim); R(c, wx + 2, wy2 + 2, 10, 10, '#4a7ab0'); R(c, wx + 6, wy2 + 2, 1, 10, pal.trim); R(c, wx + 3, wy2 + 3, 2, 4, '#8fc0e8');
      if (st === 'hostel') { R(c, wx - 2, wy2 + 14, 18, 2, '#5a5a6a'); if (i % 2 === 0) { R(c, wx + 2, wy2 + 16, 4, 6, ['#ff6f91', '#2ec4b6', '#ffd23f'][i % 3]); R(c, wx + 8, wy2 + 16, 3, 5, '#ffffff'); } }
    }
  }
  // door
  const dx = doorX - 4, dw = 24;
  R(c, dx - 2, Y + H - 24, dw + 4, 24, pal.trim);
  R(c, dx, Y + H - 22, dw, 22, st === 'library' ? '#3a2a1a' : '#6a3e22');
  R(c, dx + dw / 2 - 1, Y + H - 22, 2, 22, shade(st === 'library' ? '#3a2a1a' : '#6a3e22', -0.3));
  R(c, dx + dw / 2 - 4, Y + H - 12, 2, 2, '#ffd23f'); R(c, dx + dw / 2 + 2, Y + H - 12, 2, 2, '#ffd23f');
  // name plaque
  R(c, doorX + 8 - 34, wy + 1, 68, 7, '#2a2438'); R(c, doorX + 8 - 33, wy + 2, 66, 5, '#3a3250');
  if (st === 'library') { for (let i = 0; i < 4; i++) { const cx = X + 16 + i * 16; if (Math.abs(cx - doorX - 8) < 18) continue; R(c, cx, wy + 2, 6, wh - 6, pal.trim); R(c, cx + 4, wy + 2, 2, wh - 6, '#d8d8d4'); } for (let i = 0; i < 4; i++) { const cx = X + W - 22 - i * 16; if (Math.abs(cx - doorX - 8) < 18) continue; R(c, cx, wy + 2, 6, wh - 6, pal.trim); R(c, cx + 4, wy + 2, 2, wh - 6, '#d8d8d4'); } }
  if (st === 'canteen') { // awning
    for (let i = 0; i < 9; i++) R(c, doorX + 8 - 36 + i * 8, Y + H - 34, 8, 9, i % 2 ? '#fff6dc' : '#2f9a5a');
    for (let i = 0; i < 9; i++) R(c, doorX + 8 - 36 + i * 8 + 1, Y + H - 25, 6, 2, i % 2 ? '#fff6dc' : '#2f9a5a');
    R(c, X + 14, wy + 10, 30, 22, '#2a2a2a'); R(c, X + 16, wy + 12, 26, 18, '#3a4a3a');
    for (let i = 0; i < 4; i++) R(c, X + 18, wy + 14 + i * 4, 10 + (i * 7) % 12, 1, '#e8f0e0');
  }
  // steps
  R(c, dx - 4, Y + H, dw + 8, 3, '#d8d0c0'); R(c, dx - 4, Y + H + 3, dw + 8, 1, '#b8b0a0');
}

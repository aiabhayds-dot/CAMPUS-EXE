'use strict';
/* ===== Mini-game framework + Badminton, Water Fight, Dance-off, Study (memory) =====
   A mini-game is an object with init(), update(dt), render(ctx) (canvas games) or
   overWorld:true (DOM games drawn over the frozen world). While one runs, the world
   is frozen; pausing (Esc) freezes the mini-game too because it runs inside update(). */
const MG = {
  cur: null,
  run(game) {
    return new Promise((res) => {
      game.res = res; game.t = 0;
      this.cur = game;
      G.mouse.clicked = false;
      if (game.init) game.init();
      UI.mgShow(game);
    });
  },
  finish(result) {
    const g = this.cur; if (!g) return;
    this.cur = null;
    if (g.cleanup) g.cleanup();
    UI.mgShow(null);
    g.res(result);
  },
  update(dt) { const g = this.cur; if (!g) return; g.t += dt; g.update(dt); if (this.cur === g) UI.mgHud(g.hud ? g.hud() : ''); },
  render(c) { if (this.cur && this.cur.render) this.cur.render(c); },
};

function mgPress(k) { return consume(k); }
function drawCharAt(c, look, x, y, sc, o) {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(sc, sc);
  drawChar(c, Object.assign({ x: 0, y: 0, look, dir: 'down', pose: 'stand', expr: 'normal', phase: 0 }, o || {}), G.t);
  c.restore();
}
function pixText(c, txt, x, y, col, size) { // tiny canvas label for in-scene text (kept rare)
  c.font = `700 ${size || 8}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#1b1e3b'; c.fillText(txt, x + 1, y + 1); c.fillStyle = col || '#fff'; c.fillText(txt, x, y);
}

/* ======================================================================
   BADMINTON — side view. Move ←/→ (A/D), swing E/Space.
   Hold ↑ for a high clear, ↓ for a drop shot, Shift to smash a high shuttle.
   ====================================================================== */
function Badminton(opts) {
  const drill = opts.mode === 'drill';
  return {
    title: drill ? 'NSO DRILL · Coach Thapa' : `BADMINTON · vs ${opts.opp.name}`,
    help: drill ? 'Return the coach\'s feeds into the far court · ←/→ move · E swing · ↑ clear · ↓ drop' : 'First to 7 · ←/→ move · E/Space swing · hold ↑ clear · ↓ drop · Shift smash',
    init() {
      const W = G.vw, H = G.vh;
      this.W = W; this.H = H; this.floor = H - 40; this.cx = W / 2;
      this.half = Math.min(190, W / 2 - 24); this.x0 = this.cx - this.half; this.x1 = this.cx + this.half; this.netH = 40;
      this.g = 430;
      const sk = clamp((S.sports || 0) / 100, 0, 1);
      this.pSpeed = 128 + sk * 40; this.reach = 24 + sk * 6;
      this.p = { x: this.x0 + this.half * 0.45, swing: 0, swingCD: 0, hitLock: 0, face: 1, walkT: 0, moving: false };
      this.o = { x: this.x1 - this.half * 0.45, swing: 0, face: -1, walkT: 0, moving: false, miss: 0 };
      this.aiSpeed = drill ? 0 : (opts.opp.skill || 0.75) * 150;
      this.aiSkill = opts.opp.skill || 0.75;
      this.sh = { x: 0, y: 0, vx: 0, vy: 0, live: false, last: -1, shot: '', trail: [] };
      this.score = [0, 0]; this.target = opts.target || 7;
      this.server = 0; this.state = 'serve'; this.stT = 0; this.msg = ''; this.rally = 0; this.longest = 0; this.parts = [];
      this.feeds = 0; this.feedMax = 10; this.returns = 0;
      if (drill) { this.server = 1; }
    },
    shotTo(from, kind, q) {
      const dir = from === 0 ? 1 : -1; // direction of travel
      const sh = this.sh, cx = this.cx, half = this.half;
      let tx, T;
      if (kind === 'clear') { tx = cx + dir * (half - rand(14, 40)); T = 1.25; }
      else if (kind === 'drop') { tx = cx + dir * rand(18, 46); T = 0.95; }
      else if (kind === 'smash') { tx = cx + dir * rand(50, half - 30); T = 0.42; }
      else if (kind === 'serve') { tx = cx + dir * rand(half * 0.45, half - 30); T = 1.15; }
      else { tx = cx + dir * rand(55, half - 25); T = 0.8; }
      tx += (1 - q) * rand(-58, 58) * (kind === 'smash' ? 1.2 : 1);
      let vx, vy, ok = false;
      for (let k = 0; k < 16 && !ok; k++) {
        vx = (tx - sh.x) / T; vy = (this.floor - sh.y - 0.5 * this.g * T * T) / T;
        const tn = (cx - sh.x) / vx;
        if (tn > 0) { const yn = sh.y + vy * tn + 0.5 * this.g * tn * tn; ok = yn < this.floor - this.netH - 6 || q < 0.18; } else ok = true;
        if (!ok) T += 0.08;
      }
      sh.vx = vx; sh.vy = vy; sh.live = true; sh.last = from; sh.shot = kind;
      AU.sfx(kind === 'smash' ? 'crash' : 'pop');
      this.rally++;
      for (let i = 0; i < 6; i++) this.parts.push({ x: sh.x, y: sh.y, vx: rand(-60, 60), vy: rand(-60, 20), t: 0, life: 0.35, col: kind === 'smash' ? '#ffd23f' : '#ffffff' });
    },
    prepServe() {
      const s = this.sh; s.live = false; s.trail = [];
      const who = this.server === 0 ? this.p : this.o;
      s.x = who.x + (this.server === 0 ? 10 : -10); s.y = this.floor - 30;
      this.state = 'serve'; this.stT = 0; this.rally = 0;
    },
    point(winner, why) {
      if (this.state === 'point') return;
      if (drill) {
        if (why === 'in-opp') this.returns++;
        this.msg = why === 'in-opp' ? 'GOOD RETURN!' : why === 'net' ? 'NET!' : why === 'out' ? 'OUT!' : 'MISSED!';
        this.state = 'point'; this.stT = 0; this.sh.live = false;
        AU.sfx(why === 'in-opp' ? 'coin' : 'down');
        return;
      }
      this.score[winner]++;
      this.longest = Math.max(this.longest, this.rally);
      this.msg = (winner === 0 ? 'POINT! ' : `${opts.opp.name}'s point · `) + (why === 'net' ? 'NET' : why === 'out' ? 'OUT' : why === 'miss' ? 'MISSED' : 'IN');
      this.state = 'point'; this.stT = 0; this.sh.live = false; this.server = winner;
      AU.sfx(winner === 0 ? 'up' : 'down');
      if (winner === 0) emote(G.player, '!');
    },
    update(dt) {
      const p = this.p, o = this.o, sh = this.sh, F = this.floor;
      this.stT += dt;
      // player movement
      let dx = 0; if (G.keys.left || G.touch.dx < -0.3) dx -= 1; if (G.keys.right || G.touch.dx > 0.3) dx += 1;
      p.x = clamp(p.x + dx * this.pSpeed * dt * (S.exhausted ? 0.6 : 1), this.x0 + 8, this.cx - 14);
      p.moving = !!dx; if (dx) p.walkT += dt;
      p.swing = Math.max(0, p.swing - dt); p.swingCD = Math.max(0, p.swingCD - dt); p.hitLock = Math.max(0, p.hitLock - dt);
      o.swing = Math.max(0, o.swing - dt); o.miss = Math.max(0, o.miss - dt);
      const swingPressed = mgPress('act') || (G.mouse.clicked && (G.mouse.clicked = false, true));
      if (this.state === 'serve') {
        const srv = this.server === 0 ? p : o;
        sh.x = srv.x + (this.server === 0 ? 10 : -10); sh.y = F - 30;
        if (this.server === 0 && !drill) { if (swingPressed || this.stT > 5) { p.swing = 0.25; this.shotTo(0, 'serve', 0.9); this.state = 'play'; } }
        else if (this.stT > (drill ? 0.7 : 0.9)) {
          o.swing = 0.25; sh.x = o.x - 10; sh.y = F - 30;
          if (drill) { this.feeds++; this.shotTo(1, pick(['clear', 'drive', 'drop', 'drive']), 0.95); }
          else this.shotTo(1, 'serve', 0.9);
          this.state = 'play';
        }
      } else if (this.state === 'point') {
        if (this.stT > 1.1) {
          this.msg = '';
          if (drill) { if (this.feeds >= this.feedMax) return MG.finish({ mode: 'drill', returns: this.returns, feeds: this.feedMax }); this.server = 1; this.prepServe(); }
          else if (this.score[0] >= this.target || this.score[1] >= this.target) return MG.finish({ mode: 'match', won: this.score[0] > this.score[1], score: this.score.slice(), longest: this.longest });
          else this.prepServe();
        }
      } else if (this.state === 'play') {
        // physics
        const px = sh.x;
        sh.vy += this.g * dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt;
        sh.trail.push([sh.x, sh.y]); if (sh.trail.length > 8) sh.trail.shift();
        // net
        if ((px - this.cx) * (sh.x - this.cx) <= 0 && sh.y > F - this.netH) {
          sh.x = px; sh.vx = -sh.vx * 0.15; sh.vy = 40; // drops on hitter's side
          this.netHit = true;
        }
        // player swing
        if (swingPressed && p.swingCD <= 0) { p.swing = 0.25; p.swingCD = 0.32; p.window = 0.12; AU.sfx('whoosh'); }
        p.window = Math.max(0, (p.window || 0) - dt);
        if (p.window > 0 && p.hitLock <= 0 && sh.last !== 0 && sh.x < this.cx) {
          const hx = p.x + 10, hy = F - 34;
          const d = Math.hypot(sh.x - hx, (sh.y - hy) * 0.7);
          if (d < this.reach + 8 && sh.y > F - 96) {
            const q = clamp(1 - d / (this.reach + 8), 0.1, 1);
            let kind = 'drive';
            if (G.keys.up || G.touch.dy < -0.4) kind = 'clear';
            else if (G.keys.down || G.touch.dy > 0.4) kind = 'drop';
            else if ((G.keys.run || q > 0.82) && sh.y < F - 52) kind = 'smash';
            p.hitLock = 0.3; p.window = 0;
            this.shotTo(0, kind, q);
          }
        }
        // AI
        if (!drill) {
          let tx = this.x1 - this.half * 0.45;
          if (sh.vx > 0 || sh.x > this.cx) {
            const ty = F - 34, a = 0.5 * this.g, b = sh.vy, cc = sh.y - ty;
            const disc = b * b - 4 * a * cc;
            const tt = disc > 0 ? (-b + Math.sqrt(disc)) / (2 * a) : 0.3;
            tx = sh.x + sh.vx * Math.max(0, tt) + 8;
          }
          tx = clamp(tx, this.cx + 14, this.x1 - 8);
          const mv = clamp(tx - o.x, -this.aiSpeed * dt, this.aiSpeed * dt);
          o.x += mv; o.moving = Math.abs(mv) > 0.2; if (o.moving) o.walkT += dt;
          if (sh.last !== 1 && sh.x > this.cx && o.miss <= 0) {
            const hx = o.x - 10, hy = F - 34;
            const d = Math.hypot(sh.x - hx, (sh.y - hy) * 0.7);
            if (d < 26 && sh.y > F - 96) {
              let pHit = this.aiSkill - (sh.shot === 'smash' ? 0.38 : 0) - (sh.shot === 'drop' ? 0.08 : 0) - (d > 18 ? 0.12 : 0);
              if (Math.random() < pHit) {
                o.swing = 0.25;
                const nearNet = p.x > this.cx - 70;
                const kind = sh.y < F - 60 && Math.random() < 0.25 ? 'smash' : nearNet ? (Math.random() < 0.6 ? 'clear' : 'drive') : (Math.random() < 0.45 ? 'drop' : 'drive');
                this.shotTo(1, kind, rand(0.5, 0.95) * (0.7 + this.aiSkill * 0.4));
              } else { o.swing = 0.25; o.miss = 0.6; }
            }
          }
        } else {
          o.x = lerp(o.x, this.x1 - this.half * 0.5, dt * 2);
          if (sh.last === 0 && sh.x > this.cx + 20 && sh.y > F - 20) { /* coach catches good returns */ }
        }
        // landing
        if (sh.y >= F) {
          sh.y = F;
          const x = sh.x, inside = x >= this.x0 && x <= this.x1;
          if (this.netHit) { this.netHit = false; this.point(sh.last === 0 ? 1 : 0, 'net'); }
          else if (!inside) this.point(sh.last === 0 ? 1 : 0, 'out');
          else if (drill) this.point(0, x > this.cx ? 'in-opp' : 'miss');
          else this.point(x < this.cx ? 1 : 0, sh.last === (x < this.cx ? 1 : 0) ? 'in' : 'miss');
        }
      }
      for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 200 * dt; if (q.t > q.life) this.parts.splice(i, 1); }
    },
    hud() {
      if (drill) return `<b>RETURNS ${this.returns}/${this.feedMax}</b><span>Feed ${Math.min(this.feeds, this.feedMax)} of ${this.feedMax}</span>${this.msg ? `<em>${this.msg}</em>` : ''}`;
      return `<b>YOU ${this.score[0]} – ${this.score[1]} ${opts.opp.name.toUpperCase()}</b><span>First to ${this.target}${this.state === 'serve' && this.server === 0 ? ' · your serve: press E' : ''}</span>${this.msg ? `<em>${this.msg}</em>` : ''}`;
    },
    render(c) {
      const W = this.W, H = this.H, F = this.floor;
      const night = G.darkness > 0.3;
      c.fillStyle = skyColor(S.time); c.fillRect(0, 0, W, H);
      // back fence & spectators
      R(c, 0, F - 96, W, 60, night ? '#1d3a2e' : '#2f6a48');
      for (let x = 0; x < W; x += 12) R(c, x, F - 96, 1, 60, night ? '#26473a' : '#3a7a56');
      for (let i = 0; i < 9; i++) { const sx = 20 + i * (W - 40) / 8; drawCharAt(c, studentLook(800 + i), sx, F - 40, 1, { pose: i % 3 === 0 ? 'cheer' : 'stand', phase: i }); }
      R(c, 0, F - 36, W, 36 + 40, '#3f8f55');
      R(c, this.x0, F, this.x1 - this.x0, 2, '#f4f4ee'); R(c, this.x0, F - 1, 2, 3, '#f4f4ee'); R(c, this.x1 - 2, F - 1, 2, 3, '#f4f4ee');
      R(c, 0, F + 2, W, H - F, '#2f7a45');
      for (let x = this.x0; x < this.x1; x += 6) R(c, x, F + 4, 3, 1, '#f4f4ee55');
      // net
      R(c, this.cx - 1, F - this.netH - 2, 3, this.netH + 2, '#d8d8e0');
      for (let y = F - this.netH; y < F - 6; y += 3) R(c, this.cx - 1, y, 3, 1, '#7a7a8a');
      R(c, this.cx - 2, F - this.netH - 3, 5, 2, '#ffffff');
      // players (2x)
      const pl = this.p, op = this.o;
      const drawPlayer = (who, look, dirName) => {
        const sw = who.swing > 0;
        drawCharAt(c, look, who.x, F, 2, { dir: dirName, pose: sw ? 'raise' : 'stand', moving: who.moving, walkT: who.walkT, expr: sw ? 'happy' : 'normal' });
        const f = dirName === 'right' ? 1 : -1;
        const a = sw ? lerp(0.2, 2.4, who.swing / 0.25) : 2.2;
        const hx = who.x + f * 4, hy = F - 30;
        const rx = hx + f * Math.cos(a) * 14, ry = hy - Math.sin(a) * 16;
        c.strokeStyle = '#3a2a1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(rx, ry); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(rx + f * Math.cos(a) * 4, ry - Math.sin(a) * 4, 4, 5, a, 0, 7); c.stroke();
      };
      drawPlayer(pl, G.player.look, 'right');
      drawPlayer(op, opts.opp.look, 'left');
      // shuttle
      const s = this.sh;
      if (s.live || this.state === 'serve') {
        s.trail.forEach(([tx, ty], i) => { c.fillStyle = `rgba(255,255,255,${i / 16})`; c.fillRect(tx - 1, ty - 1, 2, 2); });
        const ang = Math.atan2(s.vy || 1, s.vx || 1);
        c.save(); c.translate(s.x, s.y); c.rotate(ang);
        R(c, -1, -1, 3, 3, '#e8e2d0'); R(c, -6, -3, 5, 6, '#ffffff'); R(c, -6, -3, 1, 6, '#d8d8d8');
        c.restore();
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(s.x - 3, F - 1, 6, 2);
      }
      for (const q of this.parts) { c.fillStyle = q.col; c.fillRect(q.x, q.y, 2, 2); }
    },
  };
}

/* ======================================================================
   WATER FIGHT — top-down arena. Move WASD, throw E/Space or click (aims at
   cursor; otherwise auto-aims). Shift = dash. Refill at your team's bucket.
   ====================================================================== */
function WaterFight(opts) {
  const AW = 320, AH = 180, SC = 1.5;
  return {
    title: 'WATER FIGHT · Wing A vs Wing B',
    help: 'WASD move · E/Space or click to throw · Shift dash · refill at the blue bucket',
    init() {
      this.dur = opts.dur || 50; this.left = this.dur;
      const mk = (o) => Object.assign({ wet: 0, stun: 0, cd: rand(0.6, 1.4), ammo: 5, hits: 0, walkT: 0, moving: false, dir: 'right', vx: 0, vy: 0, dash: 0, dashCD: 0, refill: 0, ai: { t: 0, tx: 0, ty: 0 } }, o);
      this.ents = [
        mk({ team: 0, x: 50, y: 90, look: G.player.look, name: S.name, me: true }),
        mk({ team: 0, x: 40, y: 50, look: LOOKS.rahul, name: 'Rahul' }),
        mk({ team: 0, x: 40, y: 135, look: LOOKS.kabir, name: 'Kabir' }),
        mk({ team: 1, x: 270, y: 45, look: studentLook(901), name: 'Wing B #1', dir: 'left' }),
        mk({ team: 1, x: 280, y: 92, look: studentLook(902), name: 'Wing B #2', dir: 'left' }),
        mk({ team: 1, x: 270, y: 140, look: studentLook(903), name: 'Wing B #3', dir: 'left' }),
      ];
      this.me = this.ents[0];
      this.buckets = [{ x: 18, y: 90, team: 0 }, { x: 302, y: 90, team: 1 }];
      this.balls = []; this.splash = []; this.score = [0, 0]; this.floats = [];
      this.foun = { x: 160, y: 90, r: 22 };
      this.mouseT = -10;
    },
    toArena(mx, my) { return { x: (mx - (G.vw - AW * SC) / 2) / SC, y: (my - (G.vh - AH * SC) / 2) / SC }; },
    blockedAt(x, y) { const f = this.foun; return Math.hypot(x - f.x, (y - f.y) * 1.3) < f.r || x < 8 || x > AW - 8 || y < 14 || y > AH - 4; },
    throwBall(e, tx, ty, acc) {
      if (e.ammo <= 0 || e.cd > 0 || e.stun > 0) return false;
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), rng = 150;
      if (d > rng) { tx = e.x + dx / d * rng; ty = e.y + dy / d * rng; }
      tx += rand(-acc, acc); ty += rand(-acc, acc);
      const dist2 = Math.hypot(tx - e.x, ty - e.y);
      this.balls.push({ x0: e.x, y0: e.y - 8, x1: tx, y1: ty, k: 0, dur: 0.25 + dist2 / 230, team: e.team, from: e, col: pick(['#ff6f91', '#ffd23f', '#6ad0ff', '#8ef0a0']) });
      e.ammo--; e.cd = e.me ? 0.42 : rand(1.0, 1.9); e.throwT = 0.2;
      e.dir = dx < 0 ? 'left' : 'right';
      AU.sfx('whoosh');
      return true;
    },
    nearestFoe(e) { let best = null, bd = 1e9; for (const o of this.ents) { if (o.team === e.team) continue; const d = dist(e.x, e.y, o.x, o.y); if (d < bd) { bd = d; best = o; } } return best; },
    move(e, dx, dy, sp, dt) {
      const nx = e.x + dx * sp * dt, ny = e.y + dy * sp * dt;
      if (!this.blockedAt(nx, e.y)) e.x = nx;
      if (!this.blockedAt(e.x, ny)) e.y = ny;
      e.moving = !!(dx || dy); if (e.moving) { e.walkT += dt; if (Math.abs(dx) > Math.abs(dy)) e.dir = dx < 0 ? 'left' : 'right'; else e.dir = dy < 0 ? 'up' : 'down'; }
    },
    update(dt) {
      this.left -= dt;
      if (this.left <= 0) {
        const me = this.me;
        return MG.finish({ win: this.score[0] > this.score[1], tie: this.score[0] === this.score[1], score: this.score.slice(), hits: me.hits, wet: me.wet, mvp: this.ents.slice().sort((a, b) => b.hits - a.hits)[0].name });
      }
      if (G.mouse.moved) { this.mouseT = G.t; G.mouse.moved = false; }
      for (const e of this.ents) {
        e.cd = Math.max(0, e.cd - dt); e.stun = Math.max(0, e.stun - dt); e.dashCD = Math.max(0, e.dashCD - dt); e.dash = Math.max(0, e.dash - dt); e.throwT = Math.max(0, (e.throwT || 0) - dt);
        const b = this.buckets[e.team];
        if (dist(e.x, e.y, b.x, b.y) < 16 && e.ammo < 5) { e.refill += dt; if (e.refill > 0.7) { e.ammo = 5; e.refill = 0; if (e.me) AU.sfx('coin'); } } else e.refill = 0;
        if (e.stun > 0) { e.moving = false; continue; }
        if (e.me) {
          let dx = 0, dy = 0;
          if (G.keys.left) dx -= 1; if (G.keys.right) dx += 1; if (G.keys.up) dy -= 1; if (G.keys.down) dy += 1;
          if (G.touch.dx || G.touch.dy) { dx = G.touch.dx; dy = G.touch.dy; }
          const l = Math.hypot(dx, dy); if (l) { dx /= l; dy /= l; }
          if (G.keys.run && e.dashCD <= 0 && l) { e.dash = 0.22; e.dashCD = 1.3; AU.sfx('whoosh'); }
          this.move(e, dx, dy, (e.dash > 0 ? 210 : 82) * (S.exhausted ? 0.6 : 1), dt);
          const clicked = G.mouse.clicked; if (clicked) G.mouse.clicked = false;
          if (mgPress('act') || clicked) {
            let tx, ty;
            if (G.t - this.mouseT < 2.5 || clicked) { const a = this.toArena(G.mouse.x, G.mouse.y); tx = a.x; ty = a.y; }
            else { const f = this.nearestFoe(e); if (f) { tx = f.x + (f.vx || 0) * 0.3; ty = f.y; } }
            if (tx !== undefined && !this.throwBall(e, tx, ty, 6) && e.ammo <= 0) { this.floats.push({ x: e.x, y: e.y - 22, text: 'EMPTY! refill', col: '#ff8fa0', t: 0 }); AU.sfx('down'); }
          }
        } else {
          // AI: keep a throwing distance, dodge a bit, refill when empty
          e.ai.t -= dt;
          const foe = this.nearestFoe(e);
          if (e.ammo <= 0) { e.ai.tx = b.x + (e.team ? -6 : 6); e.ai.ty = b.y; }
          else if (e.ai.t <= 0 && foe) {
            e.ai.t = rand(0.6, 1.4);
            const ang = Math.atan2(e.y - foe.y, e.x - foe.x) + rand(-0.9, 0.9), want = rand(85, 125);
            e.ai.tx = clamp(foe.x + Math.cos(ang) * want, 14, AW - 14); e.ai.ty = clamp(foe.y + Math.sin(ang) * want, 18, AH - 8);
          }
          const dx = e.ai.tx - e.x, dy = e.ai.ty - e.y, d = Math.hypot(dx, dy);
          const pvx = e.x; const pvy = e.y;
          if (d > 4) this.move(e, dx / d, dy / d, e.team ? 64 : 60, dt); else e.moving = false;
          e.vx = (e.x - pvx) / dt; e.vy = (e.y - pvy) / dt;
          if (foe && e.ammo > 0 && dist(e.x, e.y, foe.x, foe.y) < 150) {
            const lead = foe.me ? 0.35 : 0.2;
            this.throwBall(e, foe.x + (foe.vx || 0) * lead, foe.y + (foe.vy || 0) * lead, e.team ? 15 : 18);
          }
          if (e.me === undefined && foe) { if (Math.abs(foe.x - e.x) > 2) e.dir = foe.x < e.x ? 'left' : 'right'; }
        }
      }
      // balloons
      for (let i = this.balls.length - 1; i >= 0; i--) {
        const bl = this.balls[i]; bl.k += dt / bl.dur;
        if (bl.k >= 1) {
          this.balls.splice(i, 1);
          for (let j = 0; j < 10; j++) this.splash.push({ x: bl.x1, y: bl.y1, vx: rand(-50, 50), vy: rand(-50, 30), t: 0, life: 0.5 });
          AU.noise && AU.noise(0.15, 0.12, 1200);
          for (const e of this.ents) {
            if (e.team === bl.team || e.stun > 0.25) continue;
            if (Math.hypot(e.x - bl.x1, (e.y - 6) - bl.y1) < 13) {
              e.wet++; e.stun = 0.55; this.score[bl.team]++; bl.from.hits++;
              this.floats.push({ x: e.x, y: e.y - 24, text: bl.from.me ? 'SPLASH! +1' : e.me ? 'SOAKED!' : '+1', col: bl.team === 0 ? '#8ef0a0' : '#6ad0ff', t: 0 });
              AU.sfx(e.me ? 'down' : 'pop');
              if (e.me) shake(2);
              break;
            }
          }
        }
      }
      for (let i = this.splash.length - 1; i >= 0; i--) { const q = this.splash[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 90 * dt; if (q.t > q.life) this.splash.splice(i, 1); }
      for (let i = this.floats.length - 1; i >= 0; i--) { const f = this.floats[i]; f.t += dt; f.y -= 16 * dt; if (f.t > 1) this.floats.splice(i, 1); }
    },
    hud() {
      return `<b>WING A ${this.score[0]} – ${this.score[1]} WING B</b><span>⏱ ${Math.ceil(this.left)}s · Balloons ${this.me.ammo}/5 · Your hits ${this.me.hits}</span>`;
    },
    render(c) {
      const W = G.vw, H = G.vh;
      c.fillStyle = '#0d1428'; c.fillRect(0, 0, W, H);
      c.save(); c.translate(Math.round((W - AW * SC) / 2), Math.round((H - AH * SC) / 2)); c.scale(SC, SC);
      // lawn
      for (let y = 0; y < AH; y += 10) for (let x = 0; x < AW; x += 10) R(c, x, y, 10, 10, ((x + y) / 10) % 2 ? '#2f5a3a' : '#2a5236');
      R(c, 0, 0, AW, 10, '#3a2a3a'); for (let x = 4; x < AW; x += 40) { R(c, x, 0, 3, 10, '#555'); blob(c, x + 1, 2, 3, '#fff2a8'); }
      R(c, 0, 0, AW, 2, '#1a1a2a');
      // light pools
      c.globalCompositeOperation = 'lighter';
      for (let x = 4; x < AW; x += 40) { const g = c.createRadialGradient(x, 6, 0, x, 6, 50); g.addColorStop(0, 'rgba(255,214,140,.25)'); g.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = g; c.fillRect(x - 50, 0, 100, 60); }
      c.globalCompositeOperation = 'source-over';
      // fountain
      PROP.fountain(c, this.foun.x, this.foun.y + 12, G.t);
      // buckets
      for (const b of this.buckets) { R(c, b.x - 6, b.y - 8, 12, 9, b.team ? '#e2533d' : '#2f8fd0'); R(c, b.x - 5, b.y - 7, 10, 3, '#9fd8ff'); }
      // entities sorted by y
      const list = this.ents.slice().sort((a, b) => a.y - b.y);
      for (const e of list) {
        c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(e.x - 5, e.y - 1, 10, 2);
        drawChar(c, { x: e.x, y: e.y, look: e.look, dir: e.dir, pose: e.stun > 0 ? 'cheer' : e.throwT > 0 ? 'raise' : 'stand', moving: e.moving, walkT: e.walkT, expr: e.stun > 0 ? 'shock' : 'happy', sweat: e.wet > 0, phase: 0 }, G.t);
        if (e.wet > 0) for (let i = 0; i < Math.min(4, e.wet); i++) R(c, e.x - 5 + i * 3, e.y - 24 + ((G.t * 6 + i) % 4), 1, 2, '#6ad0ff');
        if (e.me) { R(c, e.x - 1, e.y - 30, 3, 3, '#ffb627'); }
      }
      // balloons
      for (const bl of this.balls) {
        const x = lerp(bl.x0, bl.x1, bl.k), y = lerp(bl.y0, bl.y1, bl.k), z = Math.sin(Math.PI * bl.k) * (14 + bl.dur * 26);
        c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x - 2, y, 4, 2);
        blob(c, x, y - z, 3, bl.col);
        R(c, x - 1, y - z - 2, 1, 1, '#ffffff');
      }
      for (const q of this.splash) { c.fillStyle = `rgba(150,220,255,${1 - q.t / q.life})`; c.fillRect(q.x, q.y, 2, 2); }
      // aim reticle
      if (G.t - this.mouseT < 2.5) { const a = this.toArena(G.mouse.x, G.mouse.y); c.strokeStyle = '#ffb627'; c.lineWidth = 1; c.beginPath(); c.arc(a.x, a.y, 5, 0, 7); c.stroke(); R(c, a.x, a.y, 1, 1, '#ffb627'); }
      for (const f of this.floats) pixText(c, f.text, f.x, f.y, f.col, 7);
      c.restore();
    },
  };
}

/* ======================================================================
   DANCE-OFF — rhythm. Arrows scroll to the hit zone; press the matching key.
   ====================================================================== */
function DanceOff(opts) {
  const DIRS = ['left', 'up', 'down', 'right'];
  return {
    title: 'THOMSO DANCE-OFF · vs ' + opts.rival.name,
    help: 'Press the matching arrow (or WASD) when it reaches the ring',
    init() {
      this.notes = []; let tt = 1.4;
      const n = 26;
      for (let i = 0; i < n; i++) { tt += pick([0.5, 0.55, 0.62, 0.7]); this.notes.push({ t: tt, d: pick(DIRS), state: 0 }); }
      this.end = tt + 1.6; this.time = 0; this.speed = 150; this.hitX = 70;
      this.score = 0; this.combo = 0; this.maxCombo = 0; this.perfect = 0; this.good = 0; this.miss = 0;
      this.rival = Math.round(n * 100 * rand(0.55, 0.72));
      this.flash = ''; this.flashT = 0; this.crowd = 0;
      AU.play('fest');
    },
    update(dt) {
      this.time += dt; this.flashT = Math.max(0, this.flashT - dt);
      const pressed = DIRS.filter((d) => mgPress(d));
      for (const d of pressed) {
        let best = null, bd = 1e9;
        for (const nt of this.notes) { if (nt.state) continue; const dx = Math.abs((nt.t - this.time) * this.speed); if (dx < bd) { bd = dx; best = nt; } }
        if (best && bd < 26) {
          if (best.d === d) {
            best.state = 1; const perfect = bd < 9;
            this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.score += (perfect ? 100 : 60) + Math.min(this.combo, 20) * 2;
            if (perfect) this.perfect++; else this.good++;
            this.flash = perfect ? 'PERFECT!' : 'GOOD'; this.flashT = 0.4; this.crowd = Math.min(1, this.crowd + 0.1);
            AU.tone(perfect ? 880 : 660, 0.06, 'square', 0.08);
          } else { best.state = 2; this.miss++; this.combo = 0; this.flash = 'WRONG'; this.flashT = 0.4; AU.sfx('down'); }
        }
      }
      for (const nt of this.notes) if (!nt.state && (this.time - nt.t) * this.speed > 26) { nt.state = 2; this.miss++; this.combo = 0; this.flash = 'MISS'; this.flashT = 0.35; this.crowd = Math.max(0, this.crowd - 0.08); }
      if (this.time > this.end) MG.finish({ score: this.score, rival: this.rival, win: this.score > this.rival, perfect: this.perfect, maxCombo: this.maxCombo, miss: this.miss });
    },
    hud() { return `<b>YOU ${this.score} · ${opts.rival.name.toUpperCase()} ${Math.round(this.rival * Math.min(1, this.time / this.end))}</b><span>Combo ×${this.combo}${this.flashT > 0 ? ' · ' + this.flash : ''}</span>`; },
    render(c) {
      const W = G.vw, H = G.vh;
      c.fillStyle = '#120a24'; c.fillRect(0, 0, W, H);
      const cols = ['#ff4f7b', '#ffd23f', '#2ec4b6', '#7a5cff'];
      for (let i = 0; i < 6; i++) { const a = Math.sin(G.t * 1.5 + i) * 0.4; c.save(); c.translate(W * (i + 0.5) / 6, 0); c.rotate(a); c.fillStyle = cols[i % 4] + '33'; c.beginPath(); c.moveTo(-4, 0); c.lineTo(4, 0); c.lineTo(40, H); c.lineTo(-40, H); c.fill(); c.restore(); }
      R(c, 0, H - 70, W, 70, '#3a2418'); R(c, 0, H - 70, W, 3, '#7a5236');
      for (let x = 0; x < W; x += 24) R(c, x, H - 67, 1, 67, '#4a2e20');
      // dancers
      const beat = Math.floor(this.time * 3.2) % 2;
      drawCharAt(c, opts.rival.look, W * 0.32, H - 74, 3, { pose: beat ? 'dance' : 'cheer', expr: 'happy', phase: 1 });
      drawCharAt(c, G.player.look, W * 0.68, H - 74, 3, { pose: this.flashT > 0 && this.flash.includes('MISS') ? 'tired' : beat ? 'cheer' : 'dance', expr: this.flash === 'MISS' || this.flash === 'WRONG' ? 'shock' : 'happy', phase: 0 });
      // crowd heads
      for (let i = 0; i < 16; i++) { const x = (i + 0.5) * W / 16, j = Math.sin(G.t * 8 + i) > 0.3 + (1 - this.crowd) * 0.6 ? -3 : 0; blob(c, x, H - 6 + j, 6, i % 2 ? '#1a1030' : '#22183a'); }
      // lane
      const ly = 34;
      R(c, 0, ly - 14, W, 28, 'rgba(0,0,0,.45)');
      c.strokeStyle = '#ffb627'; c.lineWidth = 2; c.beginPath(); c.arc(this.hitX, ly, 12, 0, 7); c.stroke();
      for (const nt of this.notes) {
        if (nt.state === 1) continue;
        const x = this.hitX + (nt.t - this.time) * this.speed; if (x < -20 || x > W + 20) continue;
        c.save(); c.translate(x, ly); c.rotate({ up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[nt.d]);
        c.fillStyle = nt.state === 2 ? '#555' : { left: '#ff4f7b', up: '#2ec4b6', down: '#ffd23f', right: '#7a5cff' }[nt.d];
        c.beginPath(); c.moveTo(9, 0); c.lineTo(-3, -8); c.lineTo(-3, -3); c.lineTo(-9, -3); c.lineTo(-9, 3); c.lineTo(-3, 3); c.lineTo(-3, 8); c.closePath(); c.fill();
        c.restore();
      }
      if (this.flashT > 0) pixText(c, this.flash, this.hitX, ly + 26, this.flash.includes('PERF') ? '#ffd23f' : this.flash === 'GOOD' ? '#8ef0a0' : '#ff8fa0', 9);
    },
  };
}

/* ======================================================================
   STUDY — memory matching (DOM, over the frozen world). Match each term
   to its meaning before time runs out. Fatigue blurs cards and shortens peeks.
   ====================================================================== */
function StudyRound(subject, tired) {
  return {
    title: 'REVISION · ' + SUBJECT_NAMES[subject],
    help: 'Match each term with its meaning · arrows + E, or click/tap',
    overWorld: true,
    init() {
      const deck = DECKS[subject].slice().sort(() => Math.random() - 0.5).slice(0, 4);
      const cards = [];
      deck.forEach(([a, b], i) => { cards.push({ txt: a, pair: i, kind: 'term' }); cards.push({ txt: b, pair: i, kind: 'def' }); });
      this.cards = cards.sort(() => Math.random() - 0.5).map((c) => Object.assign(c, { up: true, done: false }));
      this.left = tired ? 34 : 42; this.peek = tired ? 0.9 : 1.8; this.sel = 0; this.open = []; this.flipT = 0; this.matched = 0; this.tired = tired;
      UI.studyBuild(this);
    },
    flip(i) {
      if (G.paused || this.peek > 0 || this.flipT > 0) return;
      const c = this.cards[i]; if (!c || c.up || c.done) return;
      c.up = true; this.open.push(i); AU.sfx('pop');
      if (this.open.length === 2) {
        const [a, b] = this.open.map((j) => this.cards[j]);
        if (a.pair === b.pair) { a.done = b.done = true; this.open = []; this.matched++; AU.sfx('coin'); }
        else { this.flipT = this.tired ? 0.45 : 0.75; AU.sfx('down'); }
      }
      UI.studyRender(this);
    },
    update(dt) {
      this.left -= dt;
      if (this.peek > 0) { this.peek -= dt; if (this.peek <= 0) { this.cards.forEach((c) => { c.up = false; }); UI.studyRender(this); } }
      if (this.flipT > 0) { this.flipT -= dt; if (this.flipT <= 0) { this.open.forEach((j) => { this.cards[j].up = false; }); this.open = []; UI.studyRender(this); } }
      const mv = { left: -1, right: 1, up: -4, down: 4 };
      for (const k in mv) if (mgPress(k)) { this.sel = (this.sel + mv[k] + 8) % 8; UI.studyRender(this); }
      if (mgPress('act')) this.flip(this.sel);
      if (this.matched === 4 || this.left <= 0) MG.finish({ pairs: this.matched, timeLeft: Math.max(0, Math.round(this.left)) });
    },
    hud() { return `<b>${SUBJECT_NAMES[subject].toUpperCase()}</b><span>Pairs ${this.matched}/4 · ⏱ ${Math.max(0, Math.ceil(this.left))}s${this.peek > 0 ? ' · memorise!' : ''}</span>`; },
    cleanup() { UI.studyClose(); },
  };
}

/* ======================================================================
   BUG SQUASH — assignment work at the laptop (DOM, over the frozen world).
   Bugs pop up on lines of code: fix them (click/tap, or arrows + E) before
   they vanish. Reel notifications also pop up — opening one wastes time.
   ====================================================================== */
function BugSquash(opts) {
  const tired = !!(opts && opts.tired);
  const LINES = ['def convolve(x, h):', '  y = [0] * (len(x)+len(h)-1)', '  for i in range(len(x)):', '    for j in range(len(h)):', '      y[i+j] += x[i] * h[j]', '  return y', 'plot(freq, abs(X))', '# TODO: understand this', 'print("very easy")'];
  return {
    title: 'ASSIGNMENT 1 · BUG SQUASH',
    help: 'Fix the bugs 🐛 before they escape · avoid the reels 📱 · click/tap, or arrows + E',
    overWorld: true,
    init() {
      this.cells = LINES.map((txt) => ({ txt, kind: null, t: 0 }));
      this.sel = 4; this.left = tired ? 22 : 26; this.tired = tired; this.fixed = 0; this.missed = 0; this.distracted = 0; this.spawnT = 0.6; this.freeze = 0;
      UI.laptopBuild(this);
    },
    tap(i) {
      if (G.paused || this.freeze > 0) return;
      const c = this.cells[i]; if (!c) return;
      if (c.kind === 'bug') { c.kind = 'fixed'; c.t = 0.35; this.fixed++; AU.sfx('coin'); }
      else if (c.kind === 'reel') { c.kind = null; this.distracted++; this.freeze = 1.6; AU.sfx('down'); }
      else AU.sfx('blip', 0.7);
      UI.laptopRender(this);
    },
    update(dt) {
      this.left -= dt;
      if (this.freeze > 0) { this.freeze -= dt; if (this.freeze <= 0) UI.laptopRender(this); }
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = tired ? rand(0.55, 0.95) : rand(0.5, 0.85);
        const free = this.cells.map((c, i) => i).filter((i) => !this.cells[i].kind);
        if (free.length) { const i = pick(free), c = this.cells[i]; const reel = Math.random() < 0.18; c.kind = reel ? 'reel' : 'bug'; c.t = reel ? 1.6 : (tired ? 1.15 : 1.5); }
      }
      let changed = false;
      for (const c of this.cells) if (c.kind) { c.t -= dt; if (c.t <= 0) { if (c.kind === 'bug') this.missed++; c.kind = null; changed = true; } }
      const mv = { left: -1, right: 1, up: -3, down: 3 };
      for (const k in mv) if (mgPress(k)) { this.sel = (this.sel + mv[k] + 9) % 9; changed = true; }
      if (mgPress('act')) this.tap(this.sel);
      if (changed) UI.laptopRender(this);
      if (this.left <= 0) MG.finish({ fixed: this.fixed, missed: this.missed, distracted: this.distracted });
    },
    hud() { return `<b>FIXED ${this.fixed}</b><span>escaped ${this.missed} · reels ${this.distracted} · ⏱ ${Math.max(0, Math.ceil(this.left))}s${this.freeze > 0 ? ' · SCROLLING...' : ''}</span>`; },
    cleanup() { UI.laptopClose(); },
  };
}

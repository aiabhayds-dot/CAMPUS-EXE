'use strict';
/* ===== Chiptune audio: sfx + tiny music sequencer (WebAudio, no files) ===== */
const AU = {
  ctx: null, out: null, mus: null, noiseBuf: null,
  sfxOn: true, musOn: true, theme: null, nextT: 0, step: 0, timer: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      this.ctx = new C();
      this.out = this.ctx.createGain(); this.out.gain.value = 0.45; this.out.connect(this.ctx.destination);
      this.mus = this.ctx.createGain(); this.mus.gain.value = this.musOn ? 0.22 : 0; this.mus.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => this.sched(), 40);
    } catch (e) { this.ctx = null; }
  },

  setMusic(on) { this.musOn = on; if (this.mus) this.mus.gain.value = on ? 0.22 : 0; },
  setSfx(on) { this.sfxOn = on; },

  tone(f, d, type = 'square', v = 0.25, slide = 0, when = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest || this.out);
    o.start(t); o.stop(t + d + 0.03);
  },

  noise(d, v = 0.2, freq = 1500, when = 0, dest, q = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(dest || this.out);
    s.start(t); s.stop(t + d + 0.02);
  },

  sfx(n, p = 1) {
    if (!this.ctx || !this.sfxOn) return;
    switch (n) {
      case 'step': this.noise(0.05, 0.05, 900 + Math.random() * 300); break;
      case 'blip': this.tone(320 * p + Math.random() * 20, 0.04, 'square', 0.05); break;
      case 'move': this.tone(660, 0.05, 'square', 0.08); break;
      case 'confirm': this.tone(880, 0.06, 'square', 0.1); this.tone(1320, 0.08, 'square', 0.08, 0, 0.06); break;
      case 'up': [523, 659, 784].forEach((f, i) => this.tone(f, 0.09, 'square', 0.08, 0, i * 0.06)); break;
      case 'down': [392, 330, 262].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.14, 0, i * 0.07)); break;
      case 'alarm': for (let i = 0; i < 6; i++) this.tone(i % 2 ? 1760 : 1480, 0.09, 'square', 0.12, 0, i * 0.11); break;
      case 'notif': this.tone(988, 0.08, 'sine', 0.2); this.tone(1319, 0.14, 'sine', 0.18, 0, 0.09); break;
      case 'door': this.noise(0.12, 0.15, 400); this.tone(140, 0.12, 'triangle', 0.2, -40); break;
      case 'coin': this.tone(988, 0.06, 'square', 0.1); this.tone(1319, 0.2, 'square', 0.1, 0, 0.06); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(0.06, 0.12, 2200, i * 0.12); break;
      case 'type': for (let i = 0; i < 5; i++) this.noise(0.025, 0.08, 3000 + Math.random() * 2000, i * 0.07); break;
      case 'write': this.noise(0.15, 0.05, 4500, 0, null, 3); break;
      case 'stamp': this.tone(90, 0.25, 'triangle', 0.5, -40); this.noise(0.18, 0.35, 300); break;
      case 'bell': [1046, 1046, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, 0, i * 0.22)); break;
      case 'cheer': this.noise(0.9, 0.12, 1800, 0, null, 0.4); [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.06, 0, i * 0.08)); break;
      case 'laugh': for (let i = 0; i < 4; i++) this.tone(420 + i * 30, 0.06, 'triangle', 0.08, 60, i * 0.09); break;
      case 'whoosh': this.noise(0.35, 0.12, 700, 0, null, 0.6); break;
      case 'crash': this.noise(0.4, 0.4, 500); this.tone(200, 0.3, 'square', 0.12, -150); break;
      case 'snore': this.noise(0.5, 0.06, 200, 0, null, 2); break;
      case 'gameover': [392, 370, 349, 330, 262].forEach((f, i) => this.tone(f, 0.28, 'square', 0.1, 0, i * 0.28)); break;
      case 'fanfare': [523, 523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'square', 0.09, 0, i * 0.12)); break;
      case 'tick': this.tone(1800, 0.02, 'square', 0.05); break;
      case 'pop': this.tone(600, 0.06, 'sine', 0.15, 400); break;
    }
  },

  /* ---- music ---- */
  THEMES: {
    day: { bpm: 112, root: 220, wave: 'square',
      bass: [0, null, 12, null, 0, null, 12, 7, -3, null, 9, null, -3, null, 9, null, -7, null, 5, null, -7, null, 5, null, -5, null, 7, null, -5, 2, 4, null],
      lead: [16, null, 19, null, 21, 19, 16, null, 12, null, 14, 16, null, null, 9, null, 12, null, 14, null, 16, 14, 12, null, 14, null, null, 11, 12, null, null, null] },
    night: { bpm: 76, root: 196, wave: 'triangle',
      bass: [0, null, null, null, 7, null, null, null, -3, null, null, null, 4, null, null, null, -7, null, null, null, 0, null, null, null, -5, null, null, null, 2, null, null, null],
      lead: [12, null, 16, null, 19, null, null, null, 16, null, 14, null, 12, null, null, null, 9, null, 12, null, 14, null, null, null, 11, null, 12, null, 7, null, null, null] },
    fest: { bpm: 132, root: 220, wave: 'square', drums: true,
      bass: [0, 0, 12, 0, 0, 12, 0, 10, -2, -2, 10, -2, -2, 10, -2, 7, -4, -4, 8, -4, -4, 8, -4, 5, -5, -5, 7, -5, 7, 5, 3, 2],
      lead: [12, null, 15, 17, null, 15, 12, null, 10, null, 12, 15, null, 12, 10, null, 8, null, 10, 12, null, 10, 8, null, 7, null, 10, null, 12, null, 15, null] },
    tense: { bpm: 96, root: 196, wave: 'triangle', tick: true,
      bass: [0, null, 0, null, 0, null, 1, null, 0, null, 0, null, -2, null, -1, null, 0, null, 0, null, 0, null, 1, null, 3, null, 1, null, 0, null, -1, null],
      lead: [null, null, 12, null, null, null, 13, null, null, null, 12, null, null, null, 10, null, null, null, 12, null, null, null, 15, null, null, null, 13, null, 12, null, null, null] },
  },

  play(theme) {
    if (this.theme === theme) return;
    this.theme = theme; this.step = 0;
    if (this.ctx) this.nextT = this.ctx.currentTime + 0.1;
  },

  sched() {
    if (!this.ctx || !this.theme) return;
    const th = this.THEMES[this.theme]; if (!th) return;
    const stepLen = 60 / th.bpm / 2;
    if (this.nextT < this.ctx.currentTime - 0.5) this.nextT = this.ctx.currentTime + 0.05;
    while (this.nextT < this.ctx.currentTime + 0.2) {
      const i = this.step % th.bass.length;
      const when = this.nextT - this.ctx.currentTime;
      const b = th.bass[i], l = th.lead[i];
      if (b !== null && b !== undefined) this.tone(th.root / 2 * Math.pow(2, b / 12), stepLen * 0.9, 'triangle', 0.32, 0, when, this.mus);
      if (l !== null && l !== undefined) this.tone(th.root * Math.pow(2, l / 12), stepLen * 1.6, th.wave, 0.09, 0, when, this.mus);
      if (th.drums) {
        if (i % 4 === 0) this.tone(110, 0.12, 'sine', 0.5, -60, when, this.mus);
        if (i % 4 === 2) this.noise(0.08, 0.18, 2500, when, this.mus);
        if (i % 8 === 6) this.tone(180, 0.08, 'sine', 0.3, -40, when, this.mus);
      }
      if (th.tick && i % 2 === 0) this.tone(2400, 0.015, 'square', 0.03, 0, when, this.mus);
      this.nextT += stepLen; this.step++;
    }
  },
};

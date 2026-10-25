'use strict';
/* =====================================================================
   EMERGENCY HEADCOUNT CHASE
   ---------------------------------------------------------------------
   S.proxyCount counts every proxy you actually VOICE (normal attendance
   never touches it). When it reaches HEADCOUNT.threshold (5, i.e. > 4) the
   professor schedules a surprise headcount a little later in the day:
     armed  → (time arrives, player free, outside the hall, no class soon)
     active → ready (3-2-1) → run (sprint across campus) → stealth (sneak to
              the empty seat while the professor faces the board) → result
     done   → next one only after HEADCOUNT.repeatEvery more proxies, and
              never twice in one day.
   The whole state lives in S.hc, so saving mid-chase resumes the exact
   countdown; the countdown only runs inside update(), so pausing freezes it.
   ===================================================================== */
const Chase = {
  st() { if (!S.hc) S.hc = { state: 'none', n: 0, nextAt: HEADCOUNT.threshold, results: [] }; return S.hc; },
  running() { return !!(S && S.hc && S.hc.state === 'active' && (S.hc.phase === 'run' || S.hc.phase === 'stealth')); },
  active() { return !!(S && S.hc && S.hc.state === 'active'); },
  sneaking() { return this.running() && S.hc.phase === 'stealth' && G.map && G.map.id === 'lecture'; },
  blocksInteract() { return this.active(); },
  seat() { return { x: 292, y: 158 }; },
  target() {
    if (!this.running()) return null;
    if (G.map.id === 'lecture') return this.seat();
    return mapExitOr(locPos('lecture'));
  },

  /* called whenever a proxy is voiced (successful or caught) */
  onProxy() {
    const h = this.st();
    S.proxyCount++;
    if (h.state === 'none' || h.state === 'done') {
      if (S.proxyCount >= h.nextAt && h.lastDay !== S.day && S.day < SEM_DAYS - 1) {
        const c = Sched.cls(Sched.active() >= 0 ? Sched.active() : 0);
        const after = c ? Math.max(S.time, c.start + c.dur) : S.time;
        h.state = 'armed'; h.armDay = S.day; h.armAt = after + Rng.int(HEADCOUNT.delayMin[0], HEADCOUNT.delayMin[1]);
        logd(`Proxy #${S.proxyCount}. Somewhere, a professor started counting.`);
      }
    }
  },

  /* checked once per game-minute from Story.tick (player is free) */
  tryStart() {
    const h = this.st();
    if (h.state !== 'armed') return false;
    if (h.armDay !== S.day) { // rolled over a night: re-arm for the next morning
      if (S.day >= SEM_DAYS - 1) { h.state = 'done'; h.results.push('cancelled'); return false; }
      h.armDay = S.day; h.armAt = HEADCOUNT.window[0] + Rng.int(10, 90);
    }
    const t = S.time;
    if (t < h.armAt || t < HEADCOUNT.window[0]) return false;
    if (t > HEADCOUNT.window[1]) { h.armDay = S.day + 1; return false; }
    if (G.map.id === 'lecture' || MG.cur || S.exhausted || G.cut || G.dlg) return false;
    if (Sched.active() >= 0) return false;
    if (DAY().classes.some((c, i) => !Sched.rec(i) && c.start > t && c.start - t < 40)) return false;
    runScript(() => this.start());
    return true;
  },

  async start() {
    const h = this.st();
    h.state = 'active'; h.phase = 'ready'; h.strikes = 0; h.lastDay = S.day; h.n++;
    AU.play('tense'); AU.sfx('alarm'); shake(3);
    UI.warn('EMERGENCY HEADCOUNT!', 'Professor is checking who\'s actually here. Get to the lecture hall!', 'urgent');
    const pid = S.day % 2 ? 'iyer' : 'sharma';
    h.prof = pid;
    await say('phone', Rng.pick([
      `Class Group · CR: 🚨 EMERGENCY HEADCOUNT 🚨 ${PROFS[pid].name} is counting heads in {L:lecture} RIGHT NOW. Proxy wale BHAAGO.`,
      `Class Group · CR: ${PROFS[pid].name} noticed "${S.proxyCount} miracles" in the register. Surprise headcount in {L:lecture}. RUN.`,
      `Hostel Gang · Rahul: BHAI. Sir is doing a HEADCOUNT. Tere naam pe ${S.proxyCount} proxies hain. DAUD.`,
    ]));
    h.total = this.computeTotal(); h.left = h.total;
    UI.chaseShow(true);
    for (const n of [3, 2, 1]) { UI.chaseReady(String(n)); AU.sfx('tick'); await wait(HEADCOUNT.readySec / 3); }
    UI.chaseReady('GO!'); AU.sfx('whoosh');
    h.phase = 'run';
    setSprint('chase');
    G.needRepop = true;
    setTimeout(() => UI.chaseReady(null), 650);
  },
  /* seconds allowed: route distance at sprint speed, with slack, + stealth + reaction buffer */
  computeTotal() {
    const runS = routePx('lecture') / TIME.sprint;
    return Math.round(clamp(runS * HEADCOUNT.slack + HEADCOUNT.stealthSec + HEADCOUNT.bufferSec, HEADCOUNT.minSec, HEADCOUNT.maxSec));
  },

  /* door into the hall during the chase */
  enterHall() {
    const h = this.st();
    h.phase = 'stealth';
    clearSprint();
    G.hcProf = { state: 'board', t: 1.8 };
    UI.hint('Sneak to the <b>glowing seat</b>. <b>Freeze</b> whenever the professor turns around!', 5);
    G.needRepop = true;
  },

  update(dt) {
    if (!this.running() || MG.cur || G.dlg) return;
    const h = S.hc;
    h.left = Math.max(0, h.left - dt);
    UI.chaseHud(h);
    if (G.ending) return;
    if (h.phase === 'stealth' && G.map.id === 'lecture') {
      const pr = G.hcProf || (G.hcProf = { state: 'board', t: 1.8 });
      const prof = G.actorById('prof');
      pr.t -= dt;
      if (pr.state === 'board') { if (prof) { prof.dir = 'up'; prof.pose = 'point'; } if (Math.floor(G.t * 5) % 2) G.board = 1 + (Math.floor(G.t * 3) % 9); if (pr.t <= 0) { pr.state = 'warn'; pr.t = 0.65; if (prof) emote(prof, '!', 0.6); AU.sfx('blip', 0.6); } }
      else if (pr.state === 'warn') { if (pr.t <= 0) { pr.state = 'look'; pr.t = 1.4; if (prof) { prof.dir = 'down'; prof.pose = 'stand'; } } }
      else if (pr.state === 'look') {
        if (G.player.moving && !pr.saw) {
          pr.saw = true; h.strikes++;
          AU.sfx('down'); shake(2);
          if (h.strikes >= 2) return this.finish(false, 'seen');
          if (prof) { prof.expr = 'sus'; bubble(prof, Rng.pick(['Hmm? Who is moving back there?', 'Did that bench just walk?', 'Something moved. Very suspicious.']), 1.6); }
          pr.t += 0.8;
        }
        if (pr.t <= 0) { pr.state = 'board'; pr.saw = false; pr.t = 1.9 + Math.random() * 1.4; if (prof) prof.expr = 'normal'; }
      }
      const s = this.seat();
      if (dist(G.player.x, G.player.y, s.x, s.y) < 10) return this.finish(true, 'seat');
    }
    if (h.left <= 0) return this.finish(false, 'time');
  },

  finish(win, why) {
    if (G.ending) return;
    G.ending = true;
    runScript(async () => {
      try { await (win ? this.win() : this.lose(why)); }
      finally { G.ending = false; }
    });
  },
  close(result) {
    const h = S.hc;
    h.state = 'done'; h.phase = null; h.results.push(result);
    h.nextAt = S.proxyCount + HEADCOUNT.repeatEvery;
    clearSprint(); UI.chaseShow(false); UI.chaseReady(null);
    G.hcProf = null; G.board = 0; G.needRepop = true;
    AU.play(slotOf(S.time) >= 2 ? 'night' : 'day');
    S.pendingSave = true;
  },
  async win() {
    const h = S.hc, p = PL(), s = this.seat(), pid = h.prof || 'sharma';
    p.x = s.x; p.y = s.y + 8; p.pose = 'sit'; p.dir = 'up'; p.moving = false;
    const prof = G.actorById('prof');
    if (prof) { prof.dir = 'down'; prof.pose = 'stand'; }
    await wait(0.4);
    for (const n of ['...forty-six', 'forty-seven', `forty-eight. ${S.name}?`]) { if (prof) bubble(prof, n, 1.1); AU.sfx('blip', 0.65); await wait(1.0); }
    p.pose = 'raise'; bubble(p, '(gasp) ...pre-present!', 1.3); await wait(1.1); p.pose = 'sit';
    await say(pid, pid === 'sharma' ? 'Everyone is here. Hmm. Statistically impossible. Very... easy? No. Suspicious.' : 'Full attendance. The probability of that was low. I will be updating my priors.', 'sus');
    for (const a of G.actors) if (a.pose === 'sit' && a !== p && chance(0.6)) emote(a, 'haha', 1.2);
    emote(p, 'sweat', 1.4);
    await say('me', Rng.pick(['(breathing like I ran a marathon) Nailed it. Nobody look at me.', 'My lungs are on fire. My attendance is not. Worth it.', 'I will never proxy again. (I will.)']), 'happy');
    stat({ social: HEADCOUNT.reward.social, energy: HEADCOUNT.reward.energy });
    memory('Surviving the emergency headcount');
    logd(`Survived the emergency headcount with ${Math.ceil(h.left)}s to spare`);
    setTimeout(() => notify('Hostel Gang', 'Rahul: BHAI TU LEGEND HAI. Sir ne poora count kiya aur tu wahan tha?!'), 1200);
    this.close('won');
    await fadeOut(0.5); p.pose = 'stand'; p.x = 394; p.y = 232; populate(); await fadeIn(0.5);
  },
  async lose(why) {
    const h = S.hc, pid = h.prof || 'sharma', p = PL();
    const back = { map: G.map.id, x: p.x, y: p.y };
    clearSprint();
    if (why === 'seen') {
      const prof = G.actorById('prof');
      if (prof) { prof.expr = 'angry'; prof.dir = 'down'; emote(prof, 'angry', 2); }
      AU.sfx('stamp'); shake(4);
      await say(pid, `${S.name}. Crawling between benches. During a headcount. You are not a ninja. You are a statistic.`, 'angry');
    } else {
      UI.warn('TIME\'S UP!', 'The headcount is over.', 'urgent');
      await fadeOut(0.5);
      gotoMap('lecture', 208, 228, 'up');
      const prof = G.actorById('prof') || spawn({ id: 'prof', name: PROFS[pid].name, look: profLook(pid), x: 208, y: 54, dir: 'down', solid: false });
      prof.expr = 'sus';
      p.visible = false;
      G.camTarget = { x: 208, y: 110 };
      await fadeIn(0.5);
      bubble(prof, 'Forty-seven.', 1.2); await wait(1.1);
      await say(pid, `The register says forty-eight. Who is missing? ...Ah. ${S.name}. Present in ${S.proxyCount} lectures that ${S.name} never attended. Remarkable.`, 'angry');
      AU.sfx('stamp'); shake(3);
    }
    await UI.popup(`<div class="stamp">HEADCOUNT FAILED</div><p>${esc(PROFS[pid].name)} cancels <b>${HEADCOUNT.penalty.attLectures} lectures</b> of your attendance and writes your name in a very small, very permanent notebook. Your friends' proxies are also "under review".</p>`, 'Accept your fate', 'paper');
    Att.penalty(HEADCOUNT.penalty.attLectures);
    stat({ social: HEADCOUNT.penalty.social });
    trust(HEADCOUNT.penalty.trust); rel('rahul', -3); rel('kabir', -2);
    S.flags.caught = true; S.flags.profSus = true; S.counters.caught++;
    logd(why === 'seen' ? 'Got spotted sneaking in during the emergency headcount' : 'Missed the emergency headcount. The register remembers.');
    this.close('lost');
    p.visible = true; G.camTarget = null;
    if (why !== 'seen') { await fadeOut(0.4); gotoMap(back.map, back.x, back.y, 'down'); await fadeIn(0.4); }
    else { await fadeOut(0.4); p.pose = 'stand'; p.x = 394; p.y = 232; populate(); await fadeIn(0.4); }
  },

  /* after loading a save that was made mid-chase */
  resume() {
    const h = this.st();
    if (h.state !== 'active') { UI.chaseShow(false); return; }
    if (h.phase === 'ready') h.phase = 'run';
    UI.chaseShow(true); UI.chaseHud(h);
    if (h.phase === 'run') setSprint('chase');
    if (h.phase === 'stealth') G.hcProf = { state: 'board', t: 2 };
  },
};

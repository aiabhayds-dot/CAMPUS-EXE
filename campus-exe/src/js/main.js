'use strict';
/* ===== Game controller: state, save/load, day cycle, sleep & disturbances ===== */
const SAVE_KEY = 'campusexe.v3.save'; // v3 = 7-day story (old 14-day v2 saves are left untouched)
const SAVE_VERSION = 3;

const Game = {
  freshState(name, pers, difficulty) {
    const s = { acad: 40, att: 75, energy: 70, money: 55, social: 40 };
    if (pers === 'owl') { s.energy = 55; s.social = 58; }
    if (pers === 'topper') { s.acad = 60; s.social = 25; }
    if (pers === 'broke') { s.money = 22; s.social = 72; }
    const evs = ['coupon', 'idcard', 'meera'].sort(() => Math.random() - 0.5).slice(0, 2);
    const att = { held: ATT_RULES.baseHeld, credit: ATT_RULES.baseCredit + (pers === 'topper' ? 1 : 0) };
    s.att = Math.round(100 * att.credit / att.held);
    return {
      v: SAVE_VERSION, name, pers, difficulty: difficulty || 'standard', seed: Math.floor(Math.random() * 1e6),
      day: 0, time: 480, stats: s,
      att, lec: {}, warn: {}, proxyReq: {},
      proxyCount: 0, friendTrust: 20, allNighters: 0, skippedClasses: 0,
      rel: { rahul: 20, priya: 10, kabir: 22, meera: 0 },
      flags: { alarm: 420 }, seen: {},
      counters: { steps: 0, maggi: 0, samosa: 0, chai: 0, veryEasy: 0, trivially: 0, naps: 0, study: 0, spent: 0, faints: 0, books: 0, nods: 0, notes: 0, caught: 0, tasksDone: 0, disturbed: 0, lectures: 0 },
      decisions: [], memories: [], tasks: [],
      assignment: 0, quiz: null, assignScore: null, exam: null,
      prep: { sig: 0, mth: 0 }, mte: {}, project: { group: null, score: 0 },
      nso: { sessions: 0, missed: 0, score: 0 }, sports: pers === 'owl' ? 5 : 10, badminton: { w: 0, l: 0 }, wf: { played: 0, wins: 0, hits: 0 },
      fatigue: 0, exhausted: false, awake: 0,
      rnd: { coupon: evs.includes('coupon'), idcard: evs.includes('idcard'), meera: evs.includes('meera') },
      quizBonus: 0, examBonus: 0,
      hc: { state: 'none', n: 0, nextAt: HEADCOUNT.threshold, results: [] },
      ice: { state: 'none', score: 0, chapo: false },
      rngN: 0, bags: {}, xproxy: {}, notifLog: [], festPlan: {}, festDone: [], evDone: {}, evDay: {}, evNext: 0,
    };
  },

  makePlayer() { G.player = makeActor({ id: 'player', name: S.name, look: playerLook(S.pers), solid: false, bedW: 38 }); },
  resetRuntime() {
    G.timers = []; G.tweens = []; G.floats = []; G.parts = []; G.cut = 0; G.collapsing = false;
    G.alarmRing = false; G.alarmFallen = false; G.laptopOn = false; G.stageLights = false; G.notifT = 60; G.lastMin = -1;
    G.sprint = null; G.ending = false; G.hcProf = null; G.clockAcc = 0; UI.chaseShow(false); UI.chaseReady(null); UI.sprintChip(false);
    MG.cur = null; UI.mgShow(null); UI.dlgQ = null; UI.dlgState = null; UI.popupState = null; UI.menuOpen = false; UI.overlay = null;
    G.paused = false; G.dlg = false; G.camTarget = null;
    for (const id of ['#wrapped', '#gameover', '#popup', '#pause', '#dlg', '#notebook', '#planner', '#study', '#laptop', '#card', '#skip', '#choicecard']) $(id).hidden = true;
    UI.wrappedCv = null; UI.goCv = null; UI.hudCache = {};
  },

  newGame(name, pers, difficulty) {
    S = this.freshState(name, pers, difficulty);
    this.begin();
  },
  begin() {
    this.resetRuntime();
    this.makePlayer();
    G.mode = 'play';
    UI.showGameUI(true);
    runScript(() => this.startDay());
  },
  restart() {
    const name = S ? S.name : 'Bunty', pers = S ? S.pers : 'owl', diff = S ? S.difficulty : 'standard';
    S = this.freshState(name, pers, diff);
    this.begin();
  },
  toTitle() {
    this.resetRuntime();
    this.titleScene();
    UI.showTitle();
  },
  titleScene() {
    S = this.freshState('Demo', 'owl'); S.day = Math.max(0, CALENDAR.findIndex((d) => d.tags.includes('pronite'))); S.time = 1230; S.flags.volunteer = true;
    this.makePlayer(); G.player.visible = false;
    G.mode = 'title'; G.cut = 0; G.timers = []; G.tweens = []; G.parts = [];
    G.map = MAPS.campus; G.lastSlot = slotOf(S.time); resize();
    populate(); G.fade = 0; G.stageLights = true;
    AU.play(null);
  },

  /* ---------------- save / load ---------------- */
  canSave() { return G.mode === 'play' && G.cut === 0 && !G.dlg && !MG.cur && G.map; },
  save(auto) {
    if (!this.canSave()) { if (!auto) UI.warn('Can\'t save right now.', 'Finish the current scene first, then save.', 'warn'); return false; }
    const data = { v: SAVE_VERSION, savedAt: Date.now(), S, pos: { map: G.map.id, x: Math.round(G.player.x), y: Math.round(G.player.y), dir: G.player.dir } };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }
    catch (e) { if (!auto) UI.warn('Save failed.', 'Your browser blocked storage (private mode?).', 'warn'); return false; }
    G.savedSig = this.sig();
    UI.saveToast(auto);
    return true;
  },
  /* fingerprint of progress, used to ask before leaving with unsaved changes */
  sig() { return S ? JSON.stringify([S.day, Math.floor(S.time / 5), S.stats, S.proxyCount, (S.tasks || []).map((t) => t.status)]) : ''; },
  dirty() { return G.mode === 'play' && this.sig() !== G.savedSig; },
  /* end the current run early: show the summary, never touch the save file */
  async endRun() {
    S.flags.endedEarly = true;
    await fadeOut(0.6);
    await Story.wrapped();
  },
  readSave() {
    const raw = safeStore('get', SAVE_KEY);
    if (!raw) return { ok: false, why: 'none' };
    try {
      const d = JSON.parse(raw);
      const s = d && d.S;
      const valid = d && d.v === SAVE_VERSION && s && typeof s.day === 'number' && s.day >= 0 && s.day < SEM_DAYS && s.stats && s.att && d.pos && MAPS[d.pos.map];
      if (!valid) return { ok: false, why: 'corrupt' };
      return { ok: true, data: d };
    } catch (e) { return { ok: false, why: 'corrupt' }; }
  },
  saveInfo() {
    const r = this.readSave(); if (!r.ok) return r.why === 'corrupt' ? 'Save data is damaged.' : '';
    const s = r.data.S;
    return `${s.name} · Day ${s.day + 1}/${SEM_DAYS} (${DAY(s.day).wd}) · ${fmtTime(s.time)}`;
  },
  loadGame() {
    const r = this.readSave();
    if (!r.ok) { UI.warn(r.why === 'corrupt' ? 'Save data is damaged.' : 'No save found.', r.why === 'corrupt' ? 'Start a New Game; the damaged save was left untouched.' : 'Start a New Game.', 'warn'); return false; }
    const d = r.data;
    this.resetRuntime();
    S = d.S;
    // fill fields added after the save was written (forward compatibility)
    const fresh = this.freshState(S.name, S.pers, S.difficulty);
    for (const k in fresh) if (S[k] === undefined) S[k] = fresh[k];
    for (const k in fresh.counters) if (S.counters[k] === undefined) S.counters[k] = 0;
    for (const k in fresh.hc) if (S.hc[k] === undefined) S.hc[k] = fresh.hc[k];
    this.makePlayer();
    G.mode = 'play';
    UI.showGameUI(true);
    G.lastSlot = slotOf(S.time);
    gotoMap(d.pos.map, d.pos.x, d.pos.y, d.pos.dir || 'down');
    G.fade = 1; fadeIn(0.5);
    Story.onSlot(slotOf(S.time));
    UI.locToast(G.map.loc ? locName(G.map.loc) : G.map.name ? fillTokens(G.map.name) : 'Campus');
    UI.warn('Game loaded.', `Day ${S.day + 1} · ${fmtTime(S.time)}`, 'info');
    Chase.resume();
    G.savedSig = this.sig();
    return true;
  },

  /* ---------------- day cycle ---------------- */
  placeInBed() {
    const m = MAPS.hostel;
    gotoMap('hostel', m.beds.player.x, m.beds.player.y, 'down');
    const p = G.player; p.pose = 'sleep'; p.expr = 'sleep';
    G.lastSlot = slotOf(S.time); G.camSnap = true;
  },
  async startDay(opts = {}) {
    G.fade = 1;
    G.lastSlot = -1; setTime(S.time); G.lastSlot = slotOf(S.time);
    S.warn = {}; S.awake = 0; G.lastMin = -1; S.evNext = 0;
    this.rollDay();
    Tasks.gen();
    if (!opts.awake) this.placeInBed();
    Story.onSlot(slotOf(S.time));
    const d = DAY();
    await UI.card(S.day, d.title, d.sub);
    if (S.day === 0 && !S.flags.introDone) await Story.intro();
    else if (!opts.awake) await this.wakeUp();
    else await fadeIn(0.6);
    await this.morningEvents();
    S.pendingSave = true;
  },
  /* per-day random rolls (seeded): an extra classmate proxy request for a lecture nobody scripted */
  rollDay() {
    S.xproxy = S.xproxy || {};
    if (S.xproxy[S.day] !== undefined) return;
    const d = DAY();
    const free = d.classes.map((c, i) => i).filter((i) => d.classes[i].type === 'lecture' && !(d.proxy && d.proxy.cls === i));
    S.xproxy[S.day] = null;
    if (free.length && Rng.chance(0.65)) {
      const cm = Rng.pick([['zoya', 'Zoya', 'Zoya Ahmed'], ['kunal', 'Kunal', 'Kunal Mehta'], ['chirag', 'Chirag', 'Chirag Jain'], ['arjun', 'Arjun', 'Arjun Nair']]);
      S.xproxy[S.day] = { cls: Rng.pick(free), from: cm[0], name: cm[1], full: cm[2] };
    }
  },
  async wakeUp() {
    const p = G.player;
    await fadeIn(0.8);
    await wait(0.4);
    if (S.flags.surpriseWake) {
      S.flags.surpriseWake = false;
      AU.sfx('notif'); await wait(0.3); AU.sfx('notif'); shake(2);
      await say('phone', Rng.pick(['Class Group · CR: GUYS. SURPRISE QUIZ. 8 AM. SHARMA SIR. NOT A JOKE. 🚨', 'Class Group · CR: Sharma sir just emailed: "Quiz at 8 AM today. It will be very easy." PANIC.', 'Hostel Gang · Priya: QUIZ AT 8!!! Wake up wake up wake up']));
      p.expr = 'shock'; emote(p, '!!', 1.4);
      await say('me', `${fmtTime(S.time)}. Quiz at 8:00. In ${locName('lecture')}. Okay. Okay okay okay.`, 'shock');
      S.flags.lateSleep = false;
      p.pose = 'stand'; p.x = 46; p.y = 86; p.dir = 'down';
      return;
    }
    G.alarmRing = true; AU.sfx('alarm'); shake(1);
    await wait(1.1); G.alarmRing = false;
    const risky = S.flags.lateSleep || S.stats.energy < 30 || S.fatigue;
    if (risky) {
      const c = await ask('me', `${fmtTime(S.time)}. Your bed is holding you hostage.`, ['Snooze. Just 5 minutes.', 'Get up. Be a legend.'], 'sleep');
      if (c === 0) {
        G.alarmRing = true; AU.sfx('alarm'); await wait(0.6); G.alarmRing = false;
        setTime(S.time + 50); S.counters.lateWakes = (S.counters.lateWakes || 0) + 1;
        stat({ energy: 5 });
        await say('me', `${fmtTime(S.time)}?! That was NOT five minutes!`, 'shock');
        if (S.counters.lateWakes === 2) logd('Hit snooze twice (it was never 5 minutes)');
      }
    }
    S.flags.lateSleep = false;
    p.pose = 'stand'; p.x = 46; p.y = 86; p.dir = 'down';
    p.pose = 'stretch'; p.expr = 'sleep'; AU.sfx('whoosh');
    await wait(1.0);
    p.pose = 'stand'; p.expr = S.stats.energy < 30 ? 'tired' : 'normal';
    if (S.stats.energy < 30) emote(p, 'z', 1.5);
  },
  async morningEvents() {
    const d = DAY();
    if (S.flags.hungry) { S.flags.hungry = false; await say('me', 'Went to bed without dinner. My stomach is filing a complaint.', 'tired'); stat({ energy: -8 }); }
    if (S.fatigue) await say('me', S.fatigue >= 2 ? 'I can hear colours. Last night is collecting its debt.' : 'Still a bit foggy from last night.', 'tired');
    // proxy requests by phone (scripted friend + any random classmate), dialogue variants via shuffle-bags
    for (let i = 0; i < d.classes.length; i++) {
      const px = d.classes[i].type === 'lecture' ? Story.proxyInfo(i) : null;
      if (!px || (d.proxy && d.proxy.cls === i && d.proxy.how !== 'phone') || S.proxyReq[px.key]) continue;
      const c = d.classes[i], pool = px.classmate ? DLG.proxyAsk.classmate : DLG.proxyAsk[px.from];
      const line = Bag('pask_' + (px.classmate ? 'cm' : px.from), pool).replace('{C}', COURSES[c.course].code).replace('{T}', fmtTime(c.start)).replace('{N}', px.name);
      AU.sfx('notif');
      await say('phone', px.classmate ? line : `${px.name}: ${line}`);
      const warnHC = S.proxyCount + 1 >= Chase.st().nextAt;
      const ch = await ask('phone', `${px.name} is typing...${warnHC ? ' (Your proxy count is getting... noticeable.)' : ''}`, ['Reply: "Theek hai. I\'ll try."', 'Reply: "Khud aa ja bhai."']);
      S.proxyReq[px.key] = ch === 0 ? 'agreed' : 'refused';
      if (ch === 0) { rel(px.from, 5); logd(`Agreed to try a proxy for ${px.name}`); }
      else { rel(px.from, -3); Tasks.fail(px.task, 'skipped'); await say('phone', `${px.name}: theek hai. aata hoon. (sad face x14)`); }
    }
    if (d.tags.includes('icebreak')) {
      AU.sfx('notif');
      await say('phone', Rng.pick([
        `Hostel Group · Vikram Bhaiya: Reminder! Icebreaking is scheduled for TODAY evening, ${fmtTime(ICEBREAK.start)}, {L:plaza}. Sab log time pe aa jaana! Seniors are waiting 😈`,
        `Hostel Group · Ananya Di: Freshers! Icebreaking today ${fmtTime(ICEBREAK.start)} at the {L:plaza}. Koi ragging nahi, bas fun. Late aaye toh gaana gaana padega 🎤`,
        `Hostel Group · Golu Bhaiya: Guys, reminder: Icebreaking is scheduled for today evening (${fmtTime(ICEBREAK.start)}, {L:plaza}). Sab log time pe aa jaana! Chapo bhi hai 👀`,
      ]));
      UI.hint('New task: <b>Icebreaking · ' + fmtTime(ICEBREAK.start) + '</b> at the <b>{L:plaza}</b> (see notebook <kbd>N</kbd>).', 6);
    }
    if (d.tags.includes('deadline')) notify('Course Portal', `Assignment 1 closes tonight at 11:59 PM. Draft: ${S.assignment}%.`);
    if (d.tags.includes('finalprep')) notify('Exam Cell', 'FINAL EXAM · Sunday 10:00 AM · ' + locName('lecture') + '. Carry your ID card.');
    if (d.tags.includes('thomso') && !DAY(S.day - 1).tags.includes('thomso')) notify('Thomso', 'THOMSO BEGINS! Stalls, comedy night, NSO, chaos. Volunteers to the ' + locName('ground') + '.');
    if (d.tags.includes('pronite')) notify('Thomso', 'Dance-off 5–8 PM · Pronite 8 PM · Water fight 10:30 PM (Wing B). Choose wisely.');
    if (d.tags.includes('endsem')) { AU.play('tense'); notify('Exam Cell', 'FINAL · 10:00 AM · ' + locName('lecture') + '. Carry your ID card.'); }
    if (S.flags.repayLater && S.flags.lent && !S.flags.repaid) notify('Hostel Gang', 'Rahul: paise aaj pakka. (pakka pakka)');
    // the personalised daily plan
    await UI.dailyPlan();
    if (S.day === 0) UI.hint('<kbd>WASD</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd> interact · <kbd>N</kbd> notebook · <kbd>C</kbd> calendar · <kbd>Esc</kbd> pause/save', 9);
    const k = G.actorById('kabir');
    if (k && k.pose === 'sleep' && chance(0.5)) bubble(k, pick(['zzz... 5 more semesters...', 'zzz... proxy laga de...', 'zzz... Maggi...']), 2.5);
  },

  /* Sleep from `sleptAt` until `wakeAt` (next morning). May be interrupted once. */
  async sleepNight(sleptAt, wakeAt, opts) {
    opts = opts || {};
    wakeAt = wakeAt || S.flags.alarm || 420;
    // the surprise quiz morning: the group chat wakes you in time (fairness)
    if (S.day + 1 < SEM_DAYS && DAY(S.day + 1).tags.includes('surprise') && wakeAt > sec(7, 5)) { wakeAt = sec(7, 5); S.flags.surpriseWake = true; }
    const p = G.player;
    if (G.map.id !== 'hostel' && !opts.desk) { await fadeOut(0.5); gotoMap('hostel', MAPS.hostel.beds.player.x, MAPS.hostel.beds.player.y, 'down'); p.pose = 'sleep'; p.expr = 'sleep'; await fadeIn(0.5); }
    let lost = 0;
    // occasional disturbance (never two nights in a row, rarer before exams)
    const examTomorrow = S.day + 1 < SEM_DAYS && DAY(S.day + 1).classes.some((c) => c.type !== 'lecture');
    const odds = opts.noDisturb || opts.desk ? 0 : S.flags.disturbedLast ? 0 : examTomorrow ? 0.15 : 0.35;
    S.flags.disturbedLast = false;
    if (Math.random() < odds || G.forceDisturb) {
      G.forceDisturb = false;
      S.flags.disturbedLast = true; S.counters.disturbed++;
      await UI.sleepOverlay(true, 'Sleeping...');
      const r = await this.disturbance();
      lost = r.lost || 0;
      await UI.sleepOverlay(false);
    }
    await fadeOut(1.0);
    const sleptMins = Math.max(60, (1440 + wakeAt) - Math.max(sleptAt, sleptAt) - lost);
    let gain = clamp(Math.round(sleptMins / 60 * 6.4), 12, 54);
    if (S.caffeine) { gain -= 6 * S.caffeine; S.caffeine = 0; }
    if (opts.desk) gain = Math.round(gain * 0.7);
    if (sleptMins >= 360) S.fatigue = 0; else S.fatigue = Math.max(S.fatigue || 0, 1);
    Story.resolveMissed();
    if (S.day >= SEM_DAYS - 1) { if (!S.flags.missedEndsem && S.lec[S.day + '-0'] === 'missed') S.exam = 0; await Story.wrapped(); return; }
    S.day++;
    S.stats.energy = clamp(S.stats.energy + gain, 0, 100);
    S.exhausted = false;
    S.stats.acad = clamp(S.stats.acad - 2, 0, 100); S.stats.social = clamp(S.stats.social - 2, 0, 100);
    S.time = wakeAt;
    p.pose = 'sleep';
    await this.startDay();
    floatTxt(`+${gain} Energy (slept ${Math.round(sleptMins / 60)}h${lost ? ', disturbed' : ''})`, STAT_META.energy.col);
    UI.flashStat('energy', true);
  },

  async disturbance() {
    const p = G.player, m = MAPS.hostel;
    let k = G.actorById('kabir');
    if (!k) k = spawn({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: m.seats.kabir.x, y: m.seats.kabir.y, dir: 'up', pose: 'type' });
    const kinds = ['music', 'knock', 'phone', 'help', 'noise', 'alarm'];
    const kind = G.disturbKind || pick(kinds); G.disturbKind = null;
    setTime(kind === 'alarm' ? sec(28, 50) : sec(25, irand(0, 40)));
    G.fade = 0.25;
    p.expr = 'shock'; emote(p, '!', 1.4);
    let lost = 0, c;
    if (kind === 'music') {
      k.x = m.seats.kabir.x; k.y = m.seats.kabir.y; k.pose = 'dance'; k.dir = 'down';
      for (let i = 0; i < 3; i++) { AU.tone(110, 0.15, 'square', 0.25); AU.tone(165, 0.15, 'square', 0.2, 0, 0.15); emote(k, 'note', 1); await wait(0.45); }
      await say('kabir', 'BHAI YE DROP SUN!! 1 AM is the best time for bass!', 'happy');
      c = await ask('me', 'Kabir has discovered bass boost. At 1 AM.', ['Ignore it (pillow over head)', 'Ask Kabir to stop', 'Join the 1 AM jam session']);
      if (c === 0) { lost = 45; await say('sys', 'You sleep. Kind of. The bass is now part of your dreams.'); }
      else if (c === 1) { k.pose = 'type'; k.dir = 'up'; rel('kabir', -2); await say('kabir', 'Sorry sorry. Headphones. Like a civilised goblin.', 'normal'); lost = 10; }
      else { p.pose = 'stand'; p.x = 46; p.y = 86; p.pose = 'dance'; await UI.timeSkip('1 AM jam session...', 50, 'cheer'); stat({ social: 6 }); rel('kabir', 6); lost = 60; memory('A 1 AM jam session with Kabir'); }
      k.pose = 'type'; k.dir = 'up';
    } else if (kind === 'knock') {
      for (let i = 0; i < 3; i++) { AU.sfx('door'); shake(1); await wait(0.4); }
      await say({ name: 'Rahul (through the door)', look: LOOKS.rahul, bg: CH.rahul.bg }, 'BHAI! Night canteen chalein? Maggi bula rahi hai!', 'happy');
      c = await ask('me', 'Knock knock knock knock.', ['Ignore the knocking', 'Tell them to go away (politely)', 'Go for night Maggi (45 min)']);
      if (c === 0) { lost = 20; rel('rahul', -1); }
      else if (c === 1) { lost = 10; await say({ name: 'Rahul (through the door)', look: LOOKS.rahul, bg: CH.rahul.bg }, 'Theek hai, padhaku. Goodnight!', 'normal'); }
      else { p.pose = 'stand'; await UI.timeSkip('Midnight Maggi run...', 45, 'eat'); stat({ social: 5, money: -5, energy: 3 }); S.counters.maggi++; rel('rahul', 4); lost = 55; }
    } else if (kind === 'phone') {
      AU.sfx('notif'); await wait(0.4); AU.sfx('notif');
      await say('phone', pick(['Mom: beta so gaye? Itni raat ko online kyun the? Good night. Kal call karna.', 'Class Group: "Is tomorrow\'s class cancelled?" (37 replies)', 'Unknown: Congratulations! You have won a free iPhone. Click here.']));
      c = await ask('me', 'The phone glows in the dark like a tiny sun.', ['Reply and go back to sleep', 'Put it on silent']);
      lost = c === 0 ? 10 : 5;
    } else if (kind === 'help') {
      k.pose = 'stand'; k.dir = 'left'; k.x = 140; k.y = 90;
      await say('kabir', 'Bhai... uth. Mera assignment portal pe upload nahi ho raha. 5 minute ka kaam hai. Pakka.', 'tired');
      c = await ask('me', 'It is never 5 minutes.', ['Help Kabir (30 min)', 'Ignore and sleep']);
      if (c === 0) { p.pose = 'stand'; p.x = 46; p.y = 86; await UI.timeSkip('Fixing Kabir\'s upload...', 30, 'type'); rel('kabir', 8); trust(4); lost = 35; await say('kabir', 'Tu legend hai. Kal ka chai mera.', 'happy'); }
      else { rel('kabir', -4); lost = 10; }
      k.x = m.seats.kabir.x; k.y = m.seats.kabir.y; k.pose = 'type'; k.dir = 'up';
    } else if (kind === 'noise') {
      for (let i = 0; i < 3; i++) { AU.sfx('cheer'); shake(1); await wait(0.5); }
      await say('sys', 'Next room: "HAPPY BIRTHDAY, SONU! BUMPS! BUMPS! BUMPS!"');
      c = await ask('me', 'The wall is vibrating.', ['Ignore it', 'Join the birthday bumps (30 min)']);
      if (c === 0) lost = 35; else { p.pose = 'stand'; await UI.timeSkip('Birthday bumps for a guy named Sonu...', 30, 'cheer'); stat({ social: 6 }); lost = 45; memory('Birthday bumps for a stranger named Sonu'); }
    } else {
      G.alarmRing = true; AU.sfx('alarm');
      await say('sys', 'Kabir\'s alarm rings. At 4:50 AM. Kabir does not wake up. Kabir has never woken up to an alarm.');
      G.alarmRing = false;
      c = await ask('me', 'RING RING RING.', ['Throw a pillow at it', 'Get up and turn it off', 'Ignore it (somehow)']);
      if (c === 0) { AU.sfx('crash'); lost = 15; await say('kabir', '...hm? kya? ...zzz', 'sleep'); }
      else if (c === 1) lost = 20; else lost = 40;
    }
    p.pose = 'sleep'; p.x = m.beds.player.x; p.y = m.beds.player.y; p.expr = 'sleep';
    G.fade = 0;
    return { lost };
  },

  /* no sleep at all: straight into the next day */
  async morningAfterAllNighter() {
    await fadeOut(0.6);
    Story.resolveMissed();
    if (S.day >= SEM_DAYS - 1) { if (!S.flags.missedEndsem && S.lec[S.day + '-0'] === 'missed') S.exam = 0; await Story.wrapped(); return; }
    S.day++;
    S.time = sec(6, 30);
    S.fatigue = Math.max(S.fatigue || 0, 2);
    if (DAY(S.day).tags.includes('surprise')) setTimeout(() => notify('Class Group', 'CR: SURPRISE QUIZ AT 8 AM!!! 🚨'), 3500);
    S.flags.lateSleep = false;
    const m = MAPS.hostel;
    gotoMap('hostel', m.seats.player.x, m.seats.player.y + 18, 'down');
    const p = G.player; p.pose = 'tired'; p.expr = 'tired';
    await this.startDay({ awake: true });
    emote(p, 'z', 2);
    await say('me', 'The birds are chirping. I can hear colours. Is this enlightenment?', 'tired');
    const k = G.actorById('kabir');
    if (k) { emote(k, '!'); await say('kabir', 'Bhai... tu soya hi nahi?! Tu zombie lag raha hai. Respect. And concern.', 'shock'); }
  },
  /* stayed awake past dawn without going to bed */
  async dawnAwake() {
    S.allNighters++;
    await say('me', 'The sun is up. I never went to bed. This is my life now.', 'tired');
    logd('Stayed up all night without even trying to sleep');
    await this.morningAfterAllNighter();
  },
};

/* ===== boot ===== */
window.addEventListener('load', () => {
  loadLocNames();
  bootEngine();
  UI.init();
  Game.titleScene();
  UI.showTitle();
});

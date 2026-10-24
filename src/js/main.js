'use strict';
/* ===== Game controller: new game, day cycle, save/continue ===== */
const Game = {
  freshState(name, pers) {
    const s = { acad: 40, att: 72, energy: 70, money: 55, social: 40 };
    if (pers === 'owl') { s.energy = 52; s.social = 58; }
    if (pers === 'topper') { s.acad = 60; s.social = 25; s.att = 80; }
    if (pers === 'broke') { s.money = 22; s.social = 72; }
    const evs = ['coupon', 'idcard', 'meera'].sort(() => Math.random() - 0.5).slice(0, 2);
    return {
      v: 1, name, pers, day: 0, time: 480, stats: s,
      proxyCount: 0, friendTrust: 20, allNighters: 0, skippedClasses: 0,
      rel: { rahul: 20, priya: 10, kabir: 22, meera: 0 },
      flags: { alarm: 420 }, seen: {}, classDone: {},
      counters: { steps: 0, maggi: 0, samosa: 0, chai: 0, veryEasy: 0, naps: 0, study: 0, spent: 0, faints: 0, books: 0, nods: 0, notes: 0 },
      decisions: [], assignment: 0, quiz: null, assignScore: null, exam: null,
      rnd: { coupon: evs.includes('coupon'), idcard: evs.includes('idcard'), meera: evs.includes('meera') },
      quizBonus: 0, examBonus: 0,
    };
  },

  makePlayer() {
    G.player = makeActor({ id: 'player', name: S.name, look: playerLook(S.pers), solid: false, bedW: 38 });
  },

  newGame(name, pers) {
    S = this.freshState(name, pers);
    this.begin();
  },
  continueGame() {
    const raw = safeStore('get', 'campusexe.save');
    if (!raw) return this.toTitle();
    try { S = JSON.parse(raw); } catch (e) { return this.toTitle(); }
    $('#title').hidden = true;
    this.begin();
  },
  restart() {
    UI.dlgQ = null;
    const name = S ? S.name : 'Bunty', pers = S ? S.pers : 'owl';
    for (const id of ['#wrapped', '#gameover', '#popup', '#pause']) $(id).hidden = true;
    UI.popupState = null; UI.menuOpen = false; G.paused = false; UI.dlgState = null; $('#dlg').hidden = true; G.dlg = false;
    UI.wrappedCv = null; UI.goCv = null;
    S = this.freshState(name, pers);
    this.begin();
  },
  toTitle() {
    UI.dlgQ = null;
    for (const id of ['#wrapped', '#gameover', '#popup', '#pause', '#dlg']) $(id).hidden = true;
    UI.popupState = null; UI.menuOpen = false; UI.dlgState = null; G.paused = false; G.dlg = false;
    UI.wrappedCv = null; UI.goCv = null;
    this.titleScene();
    UI.showTitle();
  },
  titleScene() {
    S = this.freshState('Demo', 'owl'); S.day = 3; S.time = 1170; S.flags.volunteer = true;
    this.makePlayer(); G.player.visible = false;
    G.mode = 'title'; G.cut = 0; G.timers = []; G.tweens = []; G.parts = [];
    G.map = MAPS.campus; G.lastSlot = slotOf(S.time); resize();
    populate(); G.fade = 0; G.stageLights = true;
    AU.play(null);
  },

  begin() {
    this.makePlayer();
    G.timers = []; G.tweens = []; G.floats = []; G.parts = []; G.cut = 0; G.fainting = false;
    G.alarmRing = false; G.alarmFallen = false; G.laptopOn = false; G.stageLights = false; G.notifT = 60;
    UI.hudCache = {};
    G.mode = 'play';
    UI.showGameUI(true);
    runScript(() => this.startDay());
  },

  save() { safeStore('set', 'campusexe.save', JSON.stringify(S)); },

  placeInBed() {
    const m = MAPS.hostel;
    gotoMap('hostel', m.beds.player.x, m.beds.player.y, 'down');
    const p = G.player; p.pose = 'sleep'; p.expr = 'sleep';
    G.lastSlot = slotOf(S.time);
    G.camSnap = true;
  },

  async startDay(opts = {}) {
    G.fade = 1;
    G.lastSlot = -1; setTime(S.time); G.lastSlot = slotOf(S.time);
    if (!opts.awake) this.placeInBed();
    this.save();
    Story.onSlot(slotOf(S.time));
    const [title, sub] = DAY_INFO[S.day];
    await UI.card(S.day, title, sub);
    if (S.day === 0 && !S.flags.introDone) { await Story.intro(); return; }
    if (!opts.awake) await this.wakeUp();
    else await fadeIn(0.6);
    await this.morningEvents();
  },

  async wakeUp() {
    const p = G.player;
    await fadeIn(0.8);
    await wait(0.5);
    G.alarmRing = true; AU.sfx('alarm'); shake(1);
    await wait(1.2); G.alarmRing = false;
    const risky = S.flags.lateSleep || S.stats.energy < 30;
    if (risky) {
      const c = await ask('me', `${fmtTime(S.time)}. Your bed is holding you hostage.`, ['Snooze. Just 5 minutes.', 'Get up. Be a legend.'], 'sleep');
      if (c === 0) {
        G.alarmRing = true; AU.sfx('alarm'); await wait(0.6); G.alarmRing = false;
        setTime(S.time + 80); S.counters.lateWakes = (S.counters.lateWakes || 0) + 1;
        stat({ energy: 6 });
        await say('me', `${fmtTime(S.time)}?! That was NOT five minutes!`, 'shock');
        if (S.counters.lateWakes === 2) logd('Hit snooze twice this week (it was never 5 minutes)');
      }
    }
    S.flags.lateSleep = false;
    p.pose = 'stand'; p.x = 46; p.y = 86; p.dir = 'down';
    p.pose = 'stretch'; p.expr = 'sleep'; AU.sfx('whoosh');
    await wait(1.1);
    p.pose = 'stand'; p.expr = S.stats.energy < 30 ? 'tired' : 'normal';
    if (S.stats.energy < 30) emote(p, 'z', 1.5);
  },

  async morningEvents() {
    const d = S.day;
    if (d === 1) {
      await wait(0.4);
      AU.sfx('notif');
      await say('phone', 'Rahul: bro... aaj bhi proxy? Please. Main abhi "almost" utha hoon.', 'normal');
      const c = await ask('phone', 'Rahul is typing...', ['Reply: "Theek hai. Last time."', 'Reply: "Khud aa ja bhai."']);
      S.flags.proxyTue = c === 0 ? 'yes' : 'no';
      if (c === 0) { rel('rahul', 5); logd('Agreed to proxy for Rahul again on Tuesday'); }
      else { rel('rahul', -3); await say('phone', 'Rahul: theek hai. aata hoon. (sad crying face x14)'); }
    }
    if (d === 2) notify('UTSAV 2026', 'Fest prep starts today! Volunteers report to the College Ground.');
    if (d === 3) { notify('UTSAV 2026', 'FEST DAY! Concert tonight at the Ground. Stalls open all day.'); }
    if (d === 4) { notify('Class Group', 'CR: QUIZ AT 8 AM. NOT A DRILL.'); await say('me', 'Quiz at 8 AM. Lecture Hall 3. Let\'s gooo. (please)', 'tired'); }
    if (d === 5) {
      notify('Course Portal', `Assignment 3 closes tonight at 11:59 PM. Current draft: ${S.assignment}%.`);
      if (S.flags.repayLater) notify('Hostel Gang', 'Rahul: paise aaj pakka. (pakka pakka)');
      await say('me', S.assignment >= 80 ? 'Assignment is almost done. Who even am I?' : S.assignment >= 40 ? `Assignment at ${S.assignment}%. Doable. Probably. Maybe.` : `Assignment at ${S.assignment}%. This is fine. Everything is fine.`, S.assignment >= 40 ? 'normal' : 'shock');
    }
    if (d === 6) { AU.play('tense'); notify('Exam Cell', 'FINAL EXAM · 9:00 AM · Lecture Hall 3. Carry your ID card.'); await say('me', 'Final exam day. Whatever happens... it was a week.', 'normal'); }
    if (d === 0) return;
    const k = G.actorById('kabir');
    if (k && k.pose === 'sleep' && d !== 6 && chance(0.6)) { await wait(0.3); bubble(k, pick(['zzz... 5 more semesters...', 'zzz... proxy laga de...', 'zzz... Maggi...']), 2.5); }
  },

  async endDay(sleptAt) {
    const wakeAt = S.flags.alarm || 420;
    const hours = (1440 + wakeAt - sleptAt) / 60;
    const gain = clamp(Math.round(hours * 6.2), 15, 52);
    S.flags.lateSleep = sleptAt >= sec(25) || S.flags.lateSleep;
    await fadeOut(1.0);
    if (S.day >= 6) { await Story.wrapped(); return; }
    S.day++;
    S.stats.energy = clamp(S.stats.energy + gain, 0, 100);
    // overnight drift: you forget a little, people forget you a little
    S.stats.acad = clamp(S.stats.acad - 3, 0, 100); S.stats.social = clamp(S.stats.social - 3, 0, 100);
    S.time = wakeAt;
    G.player.pose = 'sleep';
    await this.startDay();
    floatTxt(`+${gain} Energy (slept ${Math.round(hours)}h)`, STAT_META.energy.col);
    UI.flashStat('energy', true);
  },

  async morningAfterAllNighter() {
    await fadeOut(0.6);
    S.day++;
    S.time = sec(6, 30);
    if (S.day > 6) { await Story.wrapped(); return; }
    const m = MAPS.hostel;
    gotoMap('hostel', m.seats.player.x, m.seats.player.y + 18, 'down');
    const p = G.player; p.pose = 'tired'; p.expr = 'tired';
    await this.startDay({ awake: true });
    emote(p, 'z', 2);
    await say('me', 'The birds are chirping. I can hear colours. Is this enlightenment?', 'tired');
    const k = G.actorById('kabir');
    if (k) { emote(k, '!'); await say('kabir', 'Bhai... tu soya hi nahi?! Tu zombie lag raha hai. Respect. And concern.', 'shock'); }
  },
};

/* ===== boot ===== */
window.addEventListener('load', () => {
  bootEngine();
  UI.init();
  Game.titleScene();
  UI.showTitle();
  const go = () => { document.fonts && document.fonts.ready.then(() => {}); };
  go();
});

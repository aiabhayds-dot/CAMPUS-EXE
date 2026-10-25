'use strict';
/* ===== In-world actions (objects & activities) ===== */
const Act = {
  /* ---------- shared guards ---------- */
  tooTired(min) {
    if (S.exhausted) { UI.warn('Too exhausted for that.', 'Sleep or nap in your hostel bed first. Food helps a little.', 'warn'); return true; }
    if (min && S.stats.energy < min) { UI.warn('Not enough energy.', `You need at least ${min} Energy for this.`, 'warn'); return true; }
    return false;
  },
  /* warn before an activity that would swallow a mandatory class */
  async clashOK(mins) {
    const t = S.time, end = t + mins;
    const cl = DAY().classes.find((c, i) => !Sched.rec(i) && c.start < end && Sched.closeAt(c) > t + 1);
    if (!cl) return true;
    const c = await ask('me', `This takes about ${mins >= 60 ? Math.round(mins / 6) / 10 + ' h' : mins + ' min'}. You'd miss ${Sched.label(cl)} at ${fmtTime(cl.start)}.`, ['Do it anyway', 'Never mind']);
    return c === 0;
  },

  /* ---------- SLEEP ---------- */
  async sleep() {
    const p = PL();
    if (S.day === ASSIGN_DUE_DAY && !S.flags.submitted && S.time >= sec(19)) {
      const c = await ask('me', 'Assignment 1 is due at 11:59 PM. Sleeping now means submitting nothing.', ['Submit what I have, then sleep.', 'Keep working.']);
      if (c === 1) return;
      await this.desk(true);
      if (!S.flags.submitted) return;
    }
    const night = S.time >= sec(20, 30) || S.time < sec(5);
    if (!night) {
      if ((S.flags['naps' + S.day] || 0) >= 2) { await say('me', 'I\'ve napped twice today. Even my pillow is judging me.', 'tired'); return; }
      const c = await ask('me', S.exhausted ? 'Your body is begging for a nap.' : 'A nap sounds incredible right now.', ['Nap for 1 hour (+15 Energy)', 'Nap for 2 hours (+28 Energy)', 'Nah, stay awake.']);
      if (c === 2) return;
      const mins = c === 0 ? 60 : 120;
      if (!(await this.clashOK(mins))) return;
      S.flags['naps' + S.day] = (S.flags['naps' + S.day] || 0) + 1;
      p.x = MAPS.hostel.beds.player.x; p.y = MAPS.hostel.beds.player.y; p.pose = 'sleep'; p.expr = 'sleep'; p.bedW = 38;
      AU.sfx('snore');
      await UI.timeSkip('Napping...', mins, 'snore');
      p.pose = 'stand'; p.x = 46; p.y = 86; p.expr = 'normal'; p.dir = 'down';
      stat({ energy: c === 0 ? 15 : 28 }); S.counters.naps++;
      if (S.counters.naps === 4) logd('Became a professional napper (4+ naps)');
      return;
    }
    const nd = DAY(Math.min(S.day + 1, SEM_DAYS - 1));
    const first = nd.classes.find((c) => !(c.type === 'quiz' && nd.tags.includes('surprise'))); // a surprise stays a surprise
    const auto = first ? clamp(first.start - 60, sec(6), sec(8, 30)) : sec(8, 30);
    const opts = [`Until ${fmtTime(auto)} · an hour before ${first ? Sched.label(first) : 'nothing'}`, 'Until 6:30 AM', 'Until 7:00 AM', 'Until 8:00 AM', 'Not yet'];
    const c = await ask('me', 'Set the alarm. Lights out.', opts);
    if (c === 4) return;
    const wakeAt = [auto, sec(6, 30), sec(7), sec(8)][c];
    S.flags.alarm = wakeAt;
    p.x = MAPS.hostel.beds.player.x; p.y = MAPS.hostel.beds.player.y; p.pose = 'sleep'; p.expr = 'sleep'; p.bedW = 38;
    const k = A('kabir');
    if (k && k.pose !== 'sleep') { await wait(0.4); bubble(k, pick(['Goodnight bro. Main bas ek game aur...', 'Light band kar de... oh wait, mera monitor hai.', 'Sweet dreams. Of Fourier.']), 2.4); }
    await wait(1.2);
    await Game.sleepNight(S.time, wakeAt, {});
  },

  /* ---------- LAPTOP / DESK ---------- */
  async desk(forceSubmit) {
    const p = PL(), m = MAPS.hostel;
    if (!forceSubmit && this.tooTired(6)) return;
    await walk(p, [[m.seats.player.x, m.seats.player.y]], 70); p.dir = 'up'; p.pose = 'type'; G.laptopOn = true;
    const sub = !S.flags.submitted && S.day <= ASSIGN_DUE_DAY;
    const satLeft = S.day === ASSIGN_DUE_DAY && sub ? sec(23, 40) - S.time : 999;
    const examSoon = hasTag('finalprep') || hasTag('endsem');
    const opts = [];
    if (!forceSubmit) {
      if (sub && satLeft >= 30) {
        opts.push({ t: 'Work on Assignment 1 · bug squash (1h)', hint: `${S.assignment}% done · interactive`, k: 'squash' });
        opts.push({ t: satLeft < 120 ? 'Autopilot sprint (until the deadline)' : 'Autopilot work (2h)', hint: 'less efficient, no mini-game', k: 'assign' });
      }
      opts.push({ t: examSoon ? 'Interactive revision session (exam prep)' : 'Interactive revision session', hint: `SIG ${Math.round(S.prep.sig || 0)}% · MTH ${Math.round(S.prep.mth || 0)}%`, k: 'session' });
      opts.push({ t: 'Quick study / revise (2h)', hint: '+Academics -Energy', k: 'study' });
      opts.push({ t: 'Doomscroll reels (1h)', hint: 'it\'s research', k: 'reels' });
    }
    if (sub && (S.day >= ASSIGN_DUE_DAY - 1 || S.assignment >= 100 || forceSubmit)) opts.push({ t: `Submit Assignment 1 now (${S.assignment}%)`, k: 'submit' });
    opts.push({ t: 'Close the laptop', k: 'close' });
    const c = await ask('sys', `Laptop open. ${sub ? 'Assignment 1: ' + S.assignment + '%.' : 'No assignments pending. Suspicious.'} Battery: ${irand(4, 31)}%.`, opts);
    const k = opts[c].k;
    if (k === 'squash') {
      let more = true;
      while (more) {
        const left = S.day === ASSIGN_DUE_DAY ? sec(23, 40) - S.time : 999;
        if (left < 30) { await say('me', 'No time for another round. Submit what I have!', 'shock'); break; }
        if (!(await this.clashOK(60))) break;
        const tired = S.stats.energy < 30 || S.time >= sec(25);
        const res = await MG.run(BugSquash({ tired }));
        G.laptopOn = true; p.pose = 'type';
        await UI.timeSkip('Writing Assignment 1...', 60, 'type');
        const focus = clamp(S.stats.energy / 60, 0.45, 1.15) * (S.fatigue ? 0.8 : 1);
        const gain = Math.max(2, Math.round((3 + res.fixed * 0.4 - res.distracted * 1.5) * focus));
        S.assignment = clamp(S.assignment + gain, 0, 100);
        floatTxt(`+${gain}% Assignment (${res.fixed} bugs fixed)`, '#7fb8ff');
        stat({ energy: -8, acad: 2 });
        if (res.distracted >= 2) await say('me', 'I opened "just one reel". It was three. They were about productivity.', 'tired');
        if (hasTag('chaos') && Rng.chance(0.6)) await Story.roommateChaos();
        if (S.assignment >= 100) { await say('me', 'It\'s... done? It\'s DONE. Who am I?!', 'happy'); break; }
        if (S.stats.energy < 8) { await say('me', 'My eyes are typing on their own. I need a break.', 'tired'); break; }
        more = (await ask('me', `Assignment at ${S.assignment}%. ${fmtTime(S.time)}.`, ['Another round', 'Stop for now'])) === 0;
      }
      G.laptopOn = false; p.pose = 'stand';
      if (sub && S.day === ASSIGN_DUE_DAY && S.assignment >= 100 && !S.flags.submitted) { const c2 = await ask('me', 'Submit now?', ['Submit!', 'Later']); if (c2 === 0) await Story.submitFlow(false); }
      return;
    } else if (k === 'assign') {
      const mins = Math.min(120, satLeft);
      if (!(await this.clashOK(mins))) { G.laptopOn = false; p.pose = 'stand'; return; }
      await UI.timeSkip('Working on Assignment 1...', mins, 'type');
      const gain = Math.round(mins / 120 * Math.max(5, 6 + Math.round(S.stats.energy / 10) + Math.round(S.stats.acad / 14)) * (S.fatigue ? 0.7 : 1));
      S.assignment = clamp(S.assignment + gain, 0, 100);
      floatTxt(`+${gain}% Assignment`, '#7fb8ff');
      stat({ energy: -12, acad: 3 });
      if (hasTag('chaos') && Rng.chance(0.6)) await Story.roommateChaos();
      p.expr = S.assignment >= 100 ? 'happy' : 'tired';
      if (S.assignment >= 100) await say('me', 'It\'s... done? It\'s DONE. Who am I?!', 'happy');
      else if (chance(0.4)) await say('me', pick(['Wrote 300 words. Deleted 280. Progress.', 'Stack Overflow, you beautiful beast.', 'Changed the font size to 12.5. Nobody will notice.']), 'tired');
      p.expr = 'normal';
    } else if (k === 'session') {
      G.laptopOn = false; p.pose = 'read';
      await this.studySession('desk');
    } else if (k === 'study') {
      if (!(await this.clashOK(120))) { G.laptopOn = false; p.pose = 'stand'; return; }
      p.pose = 'read'; p.dir = 'up';
      await UI.timeSkip('Studying at your desk...', 120, 'write');
      stat({ acad: 10, energy: -15, social: -2 }); S.counters.study++;
      const s2 = (S.prep.sig || 0) <= (S.prep.mth || 0) ? 'sig' : 'mth'; S.prep[s2] = clamp((S.prep[s2] || 0) + 6, 0, 100);
    } else if (k === 'reels') {
      await UI.timeSkip('Watching "educational" reels...', 60, 'pop');
      stat({ social: 3, energy: -3, acad: -1 });
      await say('me', pick(['Learned 14 life hacks. Remember zero.', 'Watched a cat play piano for 40 minutes. Worth it.', 'Saw a reel about time management. Took an hour.']), 'normal');
    } else if (k === 'submit') await Story.submitFlow(false);
    G.laptopOn = false; p.pose = 'stand';
  },

  /* ---------- INTERACTIVE STUDY (MTE / Final all-nighter) ---------- */
  async studySession(where) {
    if (this.tooTired(10)) return;
    const p = PL();
    p.pose = 'read';
    const startDay = S.day;
    let rounds = 0, caffeine = 0;
    S.sessionReps = {};
    while (true) {
      const late = S.time >= sec(24);
      const opts = [
        { t: `Signals & Systems`, hint: `prep ${Math.round(S.prep.sig || 0)}%`, k: 'sig' },
        { t: `Probability & Stats`, hint: `prep ${Math.round(S.prep.mth || 0)}%`, k: 'mth' },
        { t: 'Make a cutting chai', hint: '+12 Energy · worse sleep', k: 'chai', dis: caffeine >= 2 },
        { t: rounds ? (late ? 'Stop and sleep' : 'Stop studying') : 'Never mind', k: 'stop' },
      ];
      const c = await ask('sys', `${where === 'library' ? 'Library desk' : 'Your desk'} · ${fmtTime(S.time)} · Energy ${S.stats.energy}. Each chapter takes 1 hour.`, opts);
      const k = opts[c].k;
      if (k === 'stop') break;
      if (k === 'chai') { caffeine++; S.caffeine = (S.caffeine || 0) + 1; stat({ energy: 12 }); AU.sfx('eat'); await UI.timeSkip('Brewing chai on an illegal kettle...', 10, 'eat'); continue; }
      if (S.stats.energy < 6) { await say('me', 'The words are sliding off the page. I can\'t.', 'tired'); break; }
      const tired = S.stats.energy < 30 || S.time >= sec(26);
      const res = await MG.run(StudyRound(k, tired));
      const reps = S.sessionReps[k] = (S.sessionReps[k] || 0) + 1;
      const focus = clamp(S.stats.energy / 70, 0.35, 1.1);
      const prep = S.prep[k] || 0;
      const gain = Math.max(1, Math.round((res.pairs / 4) * 15 * focus * (1 - prep / 130) / (1 + 0.3 * (reps - 1)) + (res.timeLeft > 8 ? 2 : 0)));
      S.prep[k] = clamp(prep + gain, 0, 100);
      S.counters.study++;
      rounds++;
      await UI.timeSkip(`Revising ${SUBJECT_NAMES[k]}...`, 60, 'write');
      stat({ energy: -9, acad: Math.max(1, Math.round(gain / 4)) });
      floatTxt(`+${gain}% ${SUBJECT_NAMES[k]} prep`, '#7fb8ff');
      if (res.pairs === 4 && res.timeLeft > 10 && chance(0.4)) await say('me', 'Wait. I actually get this. Who AM I?', 'happy');
      if (reps >= 3) await say('me', 'Same chapter again... my brain is returning "already read".', 'tired');
      if (S.time >= sec(29, 30)) { await say('me', 'The birds are chirping. That means... it\'s morning.', 'tired'); return this.dawnAfterStudy(); }
      if (S.stats.energy <= 4) {
        await say('sys', 'Your head slowly lands on the desk. You are asleep before it touches the book.');
        S.flags.deskSleep = true;
        return Game.sleepNight(S.time, null, { desk: true });
      }
    }
    if (S.time >= sec(24)) S.flags.lateSleep = true;
    if (S.time >= sec(27)) { S.allNighters++; S.fatigue = 1; logd('Studied past 3 AM for the exams'); }
    if (S.time >= sec(23) && G.map.id === 'hostel') {
      const c = await ask('me', `It's ${fmtTime(S.time)}. Sleep now?`, ['Yes. Bed. Now.', 'Not yet.']);
      if (c === 0) { p.x = MAPS.hostel.beds.player.x; p.y = MAPS.hostel.beds.player.y; p.pose = 'sleep'; p.expr = 'sleep'; await Game.sleepNight(S.time, null, {}); }
    }
    p.pose = 'stand';
  },
  async dawnAfterStudy() {
    S.allNighters++; S.fatigue = 2;
    logd('Pulled an all-nighter revising for the final');
    memory('Watching the sunrise over a textbook');
    await Game.morningAfterAllNighter();
  },

  /* ---------- BADMINTON / NSO / WATER FIGHT ---------- */
  async badmintonFriend(id) {
    const name = CH[id].name;
    const lines = { priya: 'Badminton? I play to win. Also to destress. Mostly to win.', rahul: 'Bhai aaja! Main smash maarunga. Ya shuttle khojunga. Dono me se ek.', kabir: 'I\'m only good at badminton in games. Let\'s test reality.' };
    const c = await ask(id, lines[id] || 'Match?', ['Play a match (first to 7)', 'Not now']);
    if (c === 1) return;
    if (this.tooTired(12)) return;
    if (!(await this.clashOK(40))) return;
    const skill = { priya: 0.8, rahul: 0.62, kabir: 0.7 }[id] || 0.7;
    let again = true;
    while (again) {
      const res = await MG.run(Badminton({ mode: 'match', opp: { id, name, look: LOOKS[id], skill }, target: 7 }));
      AU.play(slotOf(S.time) >= 2 ? 'night' : 'day');
      addTime(35);
      if (res.won) { S.badminton.w++; stat({ social: 6, energy: -7 }); rel(id, 6); S.sports = clamp((S.sports || 0) + 5, 0, 100); await say(id, `${res.score[0]}–${res.score[1]}?! Okay. Respect. Rematch tomorrow.`, 'shock'); if (S.badminton.w === 1) memory(`Beating ${name} at badminton`); }
      else { S.badminton.l++; stat({ social: 4, energy: -7 }); rel(id, 4); S.sports = clamp((S.sports || 0) + 3, 0, 100); await say(id, `${res.score[1]}–${res.score[0]}. Good game though! Your footwork has... potential.`, 'happy'); }
      Tasks.done('badminton');
      logd(`${res.won ? 'Beat' : 'Lost to'} ${name} at badminton (${res.score.join('–')})`);
      again = !S.exhausted && S.stats.energy >= 12 && (await ask('me', 'Rematch?', ['Rematch!', 'Done for today'])) === 0;
    }
  },
  async nso() {
    if (!DAY().nso) { await say('coach', 'No NSO today. Go stretch. Or sleep. Both are training.'); return; }
    if (S.flags['nso' + S.day]) { await say('coach', 'Good session today. Hydrate. And no Maggi for dinner. ...Okay, one Maggi.'); return; }
    const t = S.time;
    if (t > NSO_TIME.start + 30) { await say('coach', `Session started at ${fmtTime(NSO_TIME.start)}. You are ${t - NSO_TIME.start} minutes late. Absence noted.`); return; }
    await say('coach', t < NSO_TIME.start ? 'Early! I like that. Warm up, we start soon.' : 'NSO practice! Today: return drills. I feed, you return. Into the court, not into my face.');
    if (this.tooTired(10)) return;
    if (t < NSO_TIME.start) await UI.timeSkip('Warming up...', NSO_TIME.start - t, null);
    const res = await MG.run(Badminton({ mode: 'drill', opp: { id: 'coach', name: 'Coach', look: LOOKS.coach, skill: 0.9 } }));
    AU.play(slotOf(S.time) >= 2 ? 'night' : 'day');
    S.flags['nso' + S.day] = true;
    S.nso.sessions++; S.nso.score += res.returns;
    S.sports = clamp((S.sports || 0) + 3 + Math.round(res.returns / 2), 0, 100);
    setTime(Math.max(S.time, NSO_TIME.start + NSO_TIME.dur));
    stat({ energy: -8, social: 2 });
    Tasks.done('nso');
    await say('coach', res.returns >= 7 ? `${res.returns} out of 10! You\'re NSO material. Real material.` : res.returns >= 4 ? `${res.returns} out of 10. Decent. Footwork, footwork, footwork.` : `${res.returns} out of 10. The shuttle is not your enemy. Yet.`);
    if (S.nso.sessions === 1) logd('Showed up for NSO practice');
  },
  async waterFight() {
    if (S.flags['wf' + S.day]) { await say('rahul', 'Bhai main abhi bhi geela hoon. Kal baat karte hain.', 'happy'); return; }
    const c = await ask('rahul', 'WING B NE CHALLENGE KIYA HAI. Water balloons, 50 seconds, no mercy. You in?', ['I\'m in. Let\'s soak them.', 'Nah, I\'m going back to the hostel.']);
    if (c === 1) { await say('rahul', 'Traitor. ...Theek hai, sleep well. Dry.', 'normal'); rel('rahul', -2); return; }
    if (this.tooTired(12)) return;
    const firstClass = DAY(Math.min(S.day + 1, SEM_DAYS - 1)).classes[0];
    if (firstClass && firstClass.start <= sec(9)) UI.hint(`Heads up: ${Sched.label(firstClass)} tomorrow at ${fmtTime(firstClass.start)}. Don\'t stay out too late.`, 5);
    let again = true;
    while (again) {
      const res = await MG.run(WaterFight({ dur: 50 }));
      AU.play('night');
      S.wf.played++; S.wf.hits += res.hits; if (res.win) S.wf.wins++;
      addTime(30);
      stat({ energy: -10, social: res.win ? 10 : 6 });
      rel('rahul', 4); rel('kabir', 4);
      await say('rahul', res.win ? `WING A ${res.score[0]}, WING B ${res.score[1]}! MVP: ${res.mvp}! Hostel history!` : res.tie ? 'Draw! Rematch at the next Thomso!' : `${res.score[0]}–${res.score[1]}... they had a bucket advantage. Clearly.`, res.win ? 'happy' : 'normal');
      memory(res.win ? 'Winning the midnight water fight' : 'Getting soaked in the midnight water fight');
      Tasks.done('waterfight');
      again = !S.exhausted && S.stats.energy >= 12 && S.time < sec(23, 50) && (await ask('me', 'One more round?', ['One more!', 'I\'m soaked. Done.'])) === 0;
    }
    S.flags['wf' + S.day] = true; G.needRepop = true;
    logd(`Fought in the water fight (${S.wf.played} total)`);
  },

  /* ---------- small actions ---------- */
  async alarmClock() {
    if (G.alarmFallen) { G.alarmFallen = false; await say('me', 'You put the alarm clock back. It looks at you with betrayal.', 'normal'); return; }
    await say('sys', `The alarm is set for ${fmtTime(S.flags.alarm || sec(7))}. You choose a new time when you go to bed.`);
  },
  async bath() {
    if (S.flags['bath' + S.day]) { await say('me', 'Already had a bucket bath today. Water ration: exhausted.', 'normal'); return; }
    S.flags['bath' + S.day] = true;
    await UI.timeSkip('Bucket bath (cold water, hot regrets)...', 30, 'whoosh');
    stat({ energy: 6, social: 3 });
    await say('me', 'Fresh. Smelling like Lifebuoy and ambition.', 'happy');
  },
  async guitar() {
    await UI.timeSkip('Strumming the only 3 chords you know...', 30, 'pop');
    stat({ social: 2, energy: 2 });
    const k = A('kabir'); if (k && k.pose !== 'sleep') { emote(k, 'note'); await say('kabir', 'Wonderwall? Bhai, every guitar in India is tired of Wonderwall.', 'happy'); }
  },
  async window() {
    const t = S.time;
    await say('sys', t < sec(12) ? 'Sunlight. Birds. Someone yelling "Bhaiya, Maggi!" from the canteen.' : t < sec(17) ? 'The afternoon sun cooks the campus like a samosa.' : t < sec(21) ? (festLevel() ? 'Thomso lights blink across campus. Somewhere, a proxy is being negotiated.' : 'Orange sky. Somewhere, a proxy is being negotiated.') : 'The campus is asleep. Except the canteen, Kabir, and your anxiety.');
  },
  async notice() {
    const rows = [];
    for (let d = S.day; d < Math.min(SEM_DAYS, S.day + 5); d++) {
      const day = DAY(d);
      for (const c of day.classes) if (c.type !== 'lecture' && !(c.type === 'quiz' && day.tags.includes('surprise') && d > S.day)) rows.push(`<li><b>${day.wd} · Day ${d + 1}</b> — ${esc(Sched.label(c))} at ${fmtTime(c.start)}, ${esc(locName('lecture'))}</li>`);
      if (d === ASSIGN_DUE_DAY && !S.flags.submitted) rows.push(`<li><b>${day.wd} · Day ${d + 1}</b> — Assignment 1 closes 11:59 PM. No extensions.</li>`);
      if (day.tags.includes('pronite')) rows.push(`<li><b>${day.wd} · Day ${d + 1}</b> — THOMSO Pronite on the ${esc(locName('stage'))}</li>`);
      if (day.nso) rows.push(`<li><b>${day.wd} · Day ${d + 1}</b> — NSO practice, ${fmtTime(NSO_TIME.start)}, ${esc(locName('court'))}</li>`);
    }
    await UI.popup(`<div class="board"><h3>NOTICE BOARD</h3><ul>${rows.slice(0, 6).join('')}<li class="lost">LOST: sense of purpose. If found, return to 2nd year hostel.</li><li class="lost">FOUND: one slipper. Left. Contact Guard Uncle.</li></ul></div>`, 'Close', 'boardpop');
  },
  async cooler() {
    if (S.flags['water' + S.day + slotOf(S.time)]) { await say('sys', 'You already drank. The cooler hums disapprovingly.'); return; }
    S.flags['water' + S.day + slotOf(S.time)] = 1;
    await say('sys', 'Water from the campus cooler. Tastes like 2009 and iron.');
    stat({ energy: 2 });
  },
  async chaiTapri() {
    const cw = { name: 'Chai Wala', look: studentLook(777), bg: '#7a4a2a' };
    const c = await ask(cw, Bag('chaiwala', ['Garam chai! Adrak wali! 10 rupaye.', 'Chai piyo, tension mat lo. Ya dono karo.', 'Exam ka tension? Chai. Breakup? Chai. Thomso? Do chai.', 'Cutting chai! Half chai, full gossip.']), [{ t: 'One chai, please.', hint: '-3 Money · +5 Energy', dis: S.stats.money < 3 }, 'Just here for the gossip.', 'Leave.']);
    if (c === 0) { await UI.timeSkip('Sipping cutting chai...', 15, 'eat'); stat({ money: -3, energy: 5 }); S.counters.chai++; Tasks.done('side_chai'); if (S.counters.chai === 4) logd('Drank 4+ chais (a lifestyle)'); }
    else if (c === 1) await say(cw, Bag('chaigossip', ['Suna hai Sharma sir 1998 se "very easy" bol rahe hain.', 'Rahul ke 6 udhaar abhi tak pending hain. 6!', 'Library wali madam ne kal ek bachche ko sirf dekh ke silent kar diya.', 'Thomso mein Meera gaati hai. Poora campus aata hai.', 'NSO wale coach saab subah 5 baje daudte hain. Kyun? Koi nahi jaanta.', 'Seniors bol rahe the icebreaking mein ek junior ne Doordarshan ki tune gaayi. Legend.']));
  },
  async fountain() {
    if (S.stats.money < 1) { await say('me', 'No coins. Not even for wishes. That\'s tragic.', 'tired'); return; }
    stat({ money: -1 }); AU.sfx('coin'); Tasks.done('side_fountain');
    const r = Math.random();
    if (r < 0.15) { await say('sys', 'The coin lands perfectly. You feel... smarter? Probably placebo.'); stat({ acad: 3 }); }
    else if (r < 0.3) { await say('sys', 'A frog jumps out. Then back in. A sign? Of what? Unclear.'); stat({ social: 2 }); }
    else await say('sys', pick(['You wish for 75% attendance. The fountain gurgles: "No."', 'You wish for an extension. The fountain is not Sharma sir.', 'You wish for Maggi. The fountain is not Pappu Bhaiya either.']));
  },
  async dog() {
    if (S.flags['dog' + S.day]) { await say('sys', 'The dog is still asleep. Respect the dog.'); return; }
    S.flags['dog' + S.day] = 1;
    await say('sys', 'The dog opens one eye, sees you, and goes back to sleep. Honestly? Same.');
    stat({ social: 1, energy: 1 });
  },
  async cow() { await say('sys', pick(['Moo. (The cow has better attendance than you.)', 'The cow chews thoughtfully. It has never had a surprise quiz.', 'Moo. (Translation: "Fourier was a fraud.")'])); },
  async gate() { await say('guard', pick(['Bahar jaana hai? Outpass dikhao. Nahi hai? Toh andar hi raho, beta.', 'Semester khatam hone tak koi bahar nahi jaayega. Order hai.', 'Rahul ko dekha? Usne mera stool udhaar liya tha 2023 mein.'])); },
  async cycles() { await say('sys', 'Your cycle. Flat tyre since first year. It\'s decorative now.'); },
  async bench() {
    const p = PL();
    p.pose = 'sit'; p.dir = 'down';
    await UI.timeSkip('Chilling on a bench...', 30, null);
    stat({ energy: 4 }); Tasks.done('side_bench');
    if (chance(0.35)) {
      const look = studentLook(irand(600, 700));
      await say({ name: 'Random Senior', look }, pick(['First year? Tip: never trust "very easy".', 'Proxy tip: never stand up. Never.', 'Exam tip: sleep. I didn\'t. Look at me.', 'Canteen bhaiya ka Maggi > life advice.', 'NSO tip: the coach counts. He ALWAYS counts.']));
      stat({ social: 3 });
    }
    p.pose = 'stand';
  },
  async banner() {
    if (S.flags.volunteer) await say('me', 'My masterpiece. Glitter everywhere. Some on my soul.', 'happy');
    else await say('sys', 'A half-painted banner. "TH_MS_". Priya is organising volunteers nearby.');
  },
  async chaat() {
    const c = await ask({ name: 'Chaat Wala', look: studentLook(170), bg: '#e2533d' }, 'Golgappe! Papdi chaat! Teekha ya extra teekha?', [{ t: 'Golgappe plate', hint: '-8 Money · +12 Energy', dis: S.stats.money < 8 }, 'Just looking.']);
    if (c === 0) { stat({ money: -8, energy: 12, social: 4 }); S.counters.maggi++; this.mealDone(); await say('me', 'Extra teekha. My soul left my body. Worth it.', 'shock'); }
  },
  async ringToss() {
    if (S.stats.money < 5) { await say({ name: 'Game Wala', look: studentLook(171) }, 'Paise nahi? Toh ring bhi nahi.'); return; }
    stat({ money: -5 });
    const p = PL(); p.pose = 'point';
    let hits = 0;
    for (let i = 0; i < 3; i++) { AU.sfx('whoosh'); await wait(0.5); const h = chance(0.4); if (h) { hits++; AU.sfx('coin'); emote(p, '!'); } else emote(p, '...'); await wait(0.5); }
    p.pose = 'stand';
    if (hits >= 2) { await say('sys', 'You won a GIANT TEDDY. It is bigger than your future.'); stat({ social: 6 }); memory('Winning a giant teddy at Thomso'); }
    else if (hits === 1) { await say('sys', 'You won a keychain shaped like a samosa.'); stat({ social: 2 }); }
    else await say('sys', 'Zero rings. The game is rigged. (It is.)');
  },
  mealDone() {
    const t = S.time;
    if (t >= 660 && t <= 960) Tasks.done('lunch');
    if (t >= 1080) Tasks.done('dinner');
  },
  async order() {
    const p = PL(), m = MAPS.canteen;
    if (G.map.id !== 'canteen') return;
    if (S.time >= sec(25) && S.time < sec(31)) { await say('bhaiya', 'Canteen band hai, beta. 1 baje ke baad sirf sapne milte hain.'); return; }
    await walk(p, [[m.counterSpot.x, m.counterSpot.y]], 70); p.dir = 'up';
    const night = S.time >= sec(22);
    const opts = [];
    if (S.flags.coupon) opts.push({ t: 'Use FREE MAGGI coupon', hint: '+10 Energy +5 Social', k: 'free' });
    if (!night) opts.push({ t: 'Samosa · ₹15', hint: '-5 Money · +6 Energy', k: 'samosa', dis: S.stats.money < 5 });
    opts.push({ t: 'Maggi · ₹40', hint: '-10 Money · +10 Energy · +5 Social', k: 'maggi', dis: S.stats.money < 10 });
    opts.push({ t: 'Chai · ₹10', hint: '-3 Money · +5 Energy', k: 'chai', dis: S.stats.money < 3 });
    if (!night) opts.push({ t: 'Thali · ₹60 (Mystery Sabzi)', hint: '-12 Money · ???', k: 'thali', dis: S.stats.money < 12 });
    opts.push({ t: 'Nothing. Just vibing.', k: 'none' });
    const greet = night ? 'Raat ko sirf Maggi aur chai. Bas.' : S.stats.money < 10 ? 'Paise kam hain? Udhaar band hai. Rahul ki wajah se.' : Bag('mess', DLG.mess)[1];
    const c = await ask('bhaiya', greet, opts);
    const k = opts[c].k;
    if (k === 'none') { await say('bhaiya', 'Vibing ka bhi charge lagega agle saal se.'); return; }
    const eff = { free: { energy: 10, social: 5 }, samosa: { money: -5, energy: 6, social: 2 }, maggi: { money: -10, energy: 10, social: 5 }, chai: { money: -3, energy: 5 }, thali: { money: -12 } }[k];
    if (k === 'free') S.flags.coupon = false;
    await walk(p, [[176, 76], [176, 166], [m.eatSeat.x, 166], [m.eatSeat.x, m.eatSeat.y - 4]], 75);
    p.dir = 'down'; p.pose = 'eat';
    await UI.timeSkip(k === 'chai' ? 'Sipping chai...' : 'Eating...', k === 'thali' ? 45 : k === 'chai' ? 15 : 30, 'eat');
    if (k === 'samosa') S.counters.samosa++; else if (k === 'maggi' || k === 'free') S.counters.maggi++; else if (k === 'chai') S.counters.chai++;
    if (k === 'thali') {
      const r = Math.random();
      if (r < 0.6) { eff.energy = 15; await say('me', 'The Mystery Sabzi was... good? Unsettlingly good.', 'happy'); }
      else if (r < 0.9) { eff.energy = -5; p.expr = 'shock'; await say('me', 'The sabzi fought back. The sabzi won.', 'shock'); p.expr = 'normal'; }
      else { eff.social = 5; await say('me', 'Found a hair in the dal. At least now I have a story.', 'shock'); }
      if (!S.flags.thaliLog) { S.flags.thaliLog = 1; logd('Survived the Mystery Sabzi thali'); }
    }
    stat(eff);
    if (k !== 'chai') this.mealDone();
    p.pose = 'stand'; p.y = 166;
  },
  async libStudy() {
    const p = PL(), m = MAPS.library;
    if (this.tooTired(8)) return;
    const c = await ask('sys', 'A free desk. The smell of old books and older anxiety.', [{ t: 'Interactive revision session', hint: `SIG ${Math.round(S.prep.sig || 0)}% · MTH ${Math.round(S.prep.mth || 0)}%` }, { t: 'Quick study (2h)', hint: '+Academics' }, 'Leave']);
    if (c === 2) return;
    await walk(p, [[m.playerSeat.x, m.playerSeat.y - 14], [m.playerSeat.x, m.playerSeat.y]], 70);
    p.dir = 'down'; p.pose = 'read'; p.bookCol = pick(['#2f8fd0', '#c0392b', '#7a5cc4']);
    if (c === 0) { await this.studySession('library'); p.pose = 'stand'; p.y = m.playerSeat.y - 14; return; }
    if (!(await this.clashOK(120))) { p.pose = 'stand'; p.y = m.playerSeat.y - 14; return; }
    await UI.timeSkip('Studying in the library...', 120, 'write');
    let eff = { acad: 9, energy: -12, social: -2 };
    S.counters.study++;
    const s2 = (S.prep.sig || 0) <= (S.prep.mth || 0) ? 'sig' : 'mth'; S.prep[s2] = clamp((S.prep[s2] || 0) + 6, 0, 100);
    const r = Math.random();
    if (r < 0.15) { await say('sys', 'You find a senior\'s notes tucked inside the book. Handwritten. Blessed.'); eff.acad += 6; logd('Found a senior\'s secret notes in the library'); }
    else if (r < 0.3) { p.expr = 'sleep'; await say('sys', 'You fell asleep on page 42. Drooled on a formula. Absorbed it, maybe.'); eff = { acad: 5, energy: 8 }; p.expr = 'normal'; }
    else if (r < 0.42) { await say('librarian', 'SHHHH. You were breathing in a distracting manner.', 'normal'); eff.social -= 1; }
    else if (r < 0.52) { await say({ name: 'Stranger', look: studentLook(999) }, 'Is this chair taken? ...Is THIS chair taken? ...What about this one?'); }
    stat(eff);
    p.pose = 'stand'; p.y = m.playerSeat.y - 14;
  },
  async shelf() {
    const b = pick(BOOKS);
    S.counters.books++;
    await UI.timeSkip('Browsing books...', 20, null);
    await say('sys', `You pick up ${b}. You read the blurb. You feel 2% smarter.`);
    stat({ acad: 2 }); Tasks.done('side_shelf');
  },
  async librarian() {
    await say('librarian', pick(['Books issued: zero. Very suspicious behaviour for a student.', 'If I hear one more "bro" in this library...', 'Library is open till 2 AM in exam season. Sleep is also allowed. Elsewhere.', `Ah, ${S.name}. Your face looks like an all-nighter is coming.`]));
  },
  async register() {
    const pc = Att.pct();
    const recent = Object.entries(S.lec).slice(-6).map(([k, v]) => `<li>Day ${+k.split('-')[0] + 1}: ${esc(v)}</li>`).join('');
    await UI.popup(`<div class="paper"><div class="ph">ATTENDANCE REGISTER · ${esc(locName('lecture'))}</div><div class="pn">${esc(S.name)} · ${S.att.credit}/${S.att.held} lectures</div><div class="score">${pc}<small>%</small></div><div class="pc">${pc >= 75 ? 'Safe. For now.' : pc >= ATT_RULES.endsemMin ? 'Danger zone. Your name is circled. In red. Twice.' : `Below ${ATT_RULES.endsemMin}%: you will be debarred from the Final.`}${S.proxyCount ? '<br>Rahul\'s row has a suspicious amount of ticks.' : ''}<ul class="reglist">${recent}</ul></div></div>`, 'Close it quickly', 'paperpop');
  },
  async emptySeat() {
    const p = PL(), m = MAPS.lecture;
    await walk(p, [[m.playerSeat.x, m.playerSeat.y - 6], [m.playerSeat.x, m.playerSeat.y]], 70); p.pose = 'sit'; p.dir = 'up';
    const nx = Sched.next(), c = nx >= 0 ? Sched.cls(nx) : null;
    if (c && c.start - S.time <= 90 && c.start > S.time) {
      const ch = await ask('me', `${Sched.label(c)} starts at ${fmtTime(c.start)}. Wait here?`, ['Wait for it', 'Just sit a bit']);
      if (ch === 0) { await UI.timeSkip('Waiting in the empty hall...', Math.max(0, c.start - 30 - S.time), null); G.needRepop = true; populate(); p.x = 394; p.y = 238; return Story.startClass(nx); }
    }
    await UI.timeSkip('Sitting in an empty lecture hall...', 20, null);
    await say('me', 'Empty classroom. Peaceful. Suspiciously peaceful. Like a trap.', 'normal');
    stat({ energy: 2 });
    p.pose = 'stand'; p.y = m.playerSeat.y - 8;
  },
  async board() { await say('sys', pick(['The board says: "VERY EASY" — underlined three times.', 'Leftover formula on the board. You understand 1 of the 9 symbols.', 'Someone drew a tiny Sharma sir in the corner. He has hair in the drawing.', 'In tiny letters: "it trivially follows" — M.I.'])); },
  async court() {
    if (DAY().nso && S.time >= NSO_TIME.start - 30 && S.time <= NSO_TIME.start + 30) return this.nso();
    await say('sys', 'The {L:court}. NSO practice and friendly matches happen here in the evening (4–7 PM).');
  },
};

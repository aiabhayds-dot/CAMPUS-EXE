'use strict';
/* ===== Story: calendar-driven NPC schedules, lectures, events, endings ===== */
const say = (w, t, e) => UI.say(w, t, e);
const ask = (w, t, o, e) => UI.choose(w, t, o, e);
const notify = (a, t) => UI.notify(a, t);
const PL = () => G.player;
function rel(who, v) { S.rel[who] = clamp((S.rel[who] || 0) + v, -50, 100); }
function trust(v) { S.friendTrust = clamp(S.friendTrust + v, 0, 100); }
function logd(s) { S.decisions.push({ d: S.day, s }); }
function memory(s) { if (!S.memories.includes(s)) { S.memories.push(s); G.floats.push({ x: PL().x, y: PL().y - 34, text: '+ Memory: ' + s, col: '#c9a8ff', t: 0, life: 2.4 }); } }
function floatTxt(text, col) { G.floats.push({ x: PL().x, y: PL().y - 30, text, col: col || '#ffffff', t: 0, life: 2 }); }
function A(id) { return G.actorById(id); }
const sec = (h, m = 0) => h * 60 + m;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CAMPUS_CHAT = ['Bro I\'m 5 minutes away. (He is in bed.)', 'Assignment kiska hua?', 'Who even reads the syllabus?', 'Mess mein aaj kya hai?', 'My code works. I don\'t know why.', 'Sharma sir said "very easy" again', 'Wi-Fi is down. Again.', 'Proxy laga dena kal, pakka', 'Group project = solo project', 'Bhai notes bhej de', 'Canteen chalein?', 'I studied for 10 minutes. I deserve a break.', 'NSO at 5:30? Who schedules sport at 5:30?', 'Final syllabus is "everything". Cool.'];
const CANTEEN_CHAT = ['Ye dal hai ya paani?', 'Bhaiya, ek chai. Udhaar.', 'This sabzi has trust issues.', 'Maggi is a food group.', 'Who puts elaichi in Maggi?', 'Came for samosa, stayed for Wi-Fi.', 'Roti ya papad? Hard to tell.', 'Bhaiya, extra chutney please'];
const LIB_CHAT = ['(whisper) Is this in the syllabus?', '(whisper) Read this page 9 times.', '(whisper) Bro. Wake up.', '(whisper) Library Wi-Fi hits different.', '(whisper) Where is chapter 7?'];
const FEST_CHAT = DLG.fest;
const NOTIFS = [
  ['Mom', 'Beta, khana khaya? Paani piya? Padhai ki?'],
  ['Hostel Gang', 'Rahul: 5 min mein aa raha hoon (he is not)'],
  ['Class Group', 'CR: Is tomorrow\'s class cancelled? ... No. (seen by 87)'],
  ['Bank', 'Your account balance is feeling lonely.'],
  ['Class Group', 'Anyone has notes?? (0 replies)'],
  ['Hostel Gang', 'Kabir: who ate my Maggi. I will find you.'],
  ['CampusGram', 'Priya posted: "Day 4 of studying. Sanity: 12%"'],
  ['Class Group', 'Fwd: "Sharma sir says paper will be VERY EASY"'],
  ['Dad', 'How is studies. Call when free. Ok.'],
  ['Hostel Gang', 'Rahul: anyone up for night canteen? (it is 11 AM)'],
  ['Food App', 'Feeling hungry? So is your wallet.'],
  ['NSO', 'Reminder: sports shoes, not slippers. Looking at you.'],
];
const BOOKS = ['"Thermodynamics: A Love Story"', '"How to Survive on Maggi" (3rd edition)', '"Proxy: The Art of Being in Two Places"', '"Data Structures for People Who Hate Data"', '"Assignments & Other Horror Stories"', '"Very Easy Calculus" by R.K. Sharma', '"Sleep Is For The Weak (Revised: Please Sleep)"', '"1001 Excuses for Late Submission"', '"Fourier Series: Sines You Can\'t Ignore"', '"It Trivially Follows" by M. Iyer'];

const CLASSMATES = [
  { id: 'aman', name: 'Aman', seat: [0, 0] }, { id: 'ishita', name: 'Ishita', seat: [0, 1] }, { id: 'bhavna', name: 'Bhavna', seat: [0, 5] },
  { id: 'chirag', name: 'Chirag', seat: [1, 1] }, { id: 'kunal', name: 'Kunal', seat: [1, 3] }, { id: 'zoya', name: 'Zoya', seat: [1, 6] },
  { id: 'dev', name: 'Dev', seat: [2, 0] }, { id: 'neha', name: 'Neha', seat: [2, 4] }, { id: 'rohit', name: 'Rohit', seat: [2, 6] },
  { id: 'arjun', name: 'Arjun', seat: [3, 2] }, { id: 'tanvi', name: 'Tanvi', seat: [3, 5] }, { id: 'sana', name: 'Sana', seat: [3, 7] },
];
/* Day 2 icebreaking cast (fictional) */
const SENIORS = [
  { id: 'sen1', name: 'Vikram Bhaiya', look: studentLook(951), x: T(28), y: T(14) + 6, bg: '#3d6fd6' },
  { id: 'sen2', name: 'Ananya Di', look: studentLook(954), x: T(30) + 8, y: T(14) + 2, bg: '#c2418c' },
  { id: 'sen3', name: 'Golu Bhaiya', look: studentLook(957), x: T(33), y: T(14) + 6, bg: '#2f8f6a' },
];
const TARA_LOOK = studentLook(962);
const TARA_POS = { x: T(52), y: T(20) + 10 };
const senior = (i) => ({ name: SENIORS[i].name, look: SENIORS[i].look, bg: SENIORS[i].bg });
const TARA = () => ({ name: 'Tara', look: TARA_LOOK, bg: '#e07a2f' });

function seatPos(row, idx) { const m = MAPS.lecture; return { x: m.seatXs[idx], y: m.rows[row] - 10 }; }
function profLook(id) { return LOOKS[PROFS[id].look]; }

const Story = {
  /* ================= HUD helpers ================= */
  rnd(k) {
    if (!S || !hasTag('thomso')) return false;
    if (k === 'coupon') return S.rnd.coupon && !S.flags.couponFound;
    if (k === 'idcard') return S.rnd.idcard && !S.flags.idFound;
    return false;
  },
  deadlineText() {
    if (!S || S.flags.submitted) return '';
    if (S.day < ASSIGN_DUE_DAY) return `Assignment 1 · ${S.assignment}% · due ${DAY(ASSIGN_DUE_DAY).wd} 11:59 PM`;
    if (S.day === ASSIGN_DUE_DAY) { const left = sec(23, 59) - S.time; return left > 0 ? `Assignment 1 · ${S.assignment}% · ${Math.floor(left / 60)}h ${left % 60}m left` : 'Assignment: DEADLINE!'; }
    return '';
  },
  nextClassText() {
    const i = Sched.next(); if (i < 0) return '';
    const c = Sched.cls(i), until = c.start - S.time;
    if (until > 90) return '';
    return until > 0 ? `${Sched.label(c)} · in ${until} min` : `${Sched.label(c)} · NOW · doors close ${fmtTime(Sched.closeAt(c))}`;
  },
  objective() {
    if (Chase.active()) return '<b>EMERGENCY HEADCOUNT</b><br><small>' + (G.map.id === 'lecture' ? 'Sneak to the glowing seat' : 'Run to ' + esc(locName('lecture'))) + '</small>';
    if (S.ice && S.ice.state === 'challenge') return '<b>Chapo challenge</b> · talk to Tara<br><small>near the ' + esc(locName('chai')) + '</small>';
    if (S.ice && S.ice.state === 'returning') return '<b>Chapo challenge</b> · report back to the seniors<br><small>' + esc(locName('plaza')) + '</small>';
    if (S.exhausted) return '<b>EXHAUSTED</b> · sleep in your bed at <b>' + esc(locName('hostel')) + '</b>';
    const f = Tasks.focus();
    if (!f) return 'Free time · explore, eat, rest';
    const t = S.time;
    const when = f.start !== undefined ? (f.start > t ? ` · ${fmtTime(f.start)}` : ' · now') : '';
    return `<b>${esc(fillTokens(f.title.replace(/ · \d+:\d+ [AP]M/, '')))}</b>${when}<br><small>${esc(locName(f.loc))}</small>`;
  },
  objMarker() {
    if (Chase.active()) return locPos('lecture');
    if (S.ice && S.ice.state === 'challenge') return TARA_POS;
    if (S.ice && S.ice.state === 'returning') return locPos('plaza');
    if (S.exhausted) return locPos('hostel');
    const f = Tasks.focus(); return f ? locPos(f.loc) : null;
  },

  /* ================= population ================= */
  populate(id) {
    const d = S.day, t = S.time, sl = slotOf(t), out = [];
    const st = (seed, extra) => Object.assign({ id: 'st' + seed, name: 'Student', look: studentLook(seed) }, extra || {});
    const fest = festLevel();
    if (id === 'campus') {
      out.push({ id: 'guard', name: 'Guard Uncle', look: LOOKS.guard, x: 40, y: T(18) + 10, dir: 'right', talk: () => Act.gate() });
      out.push({ id: 'cow', name: 'Campus Cow', look: null, x: T(46), y: T(39), drawFn: (c, a, tt) => PROP.cow(c, a.x, a.y, tt, { flip: a.dir === 'left' }), wander: { x: T(42), y: T(37) + 8, w: T(14), h: T(4) }, wspeed: 12, talk: () => Act.cow() });
      const n = sl === 3 ? 3 : 8;
      const areas = [{ x: T(2), y: T(17) + 4, w: T(55), h: T(2) }, { x: T(26), y: T(15), w: T(9), h: T(1) }, { x: T(2), y: T(34) + 4, w: T(16), h: T(2) }, { x: T(42), y: T(34) + 4, w: T(15), h: T(2) }];
      for (let i = 0; i < n; i++) { const ar = areas[i % areas.length]; out.push(st(100 + i + d * 20, { x: ar.x + Math.random() * ar.w, y: ar.y + Math.random() * ar.h, wander: ar, chatter: fest ? FEST_CHAT : CAMPUS_CHAT })); }
      if (sl === 3) out.push(st(140 + d, { x: T(56), y: T(20) + 4, dir: 'left', name: 'Night Owl', chatter: ['Chai at 1 AM is a personality.', 'Sleep? Never heard of her.', 'This chai is my 4th. Today.'] }));
      if (!fest && (DAY().phase === 'teach' || DAY().phase === 'project') && (sl === 1 || sl === 2)) {
        out.push(st(150, { x: T(30), y: T(34), dir: 'down', name: 'Batsman', chatter: ['SIX! ... no, that\'s out.', 'One tip one hand!'] }));
        out.push(st(151, { x: T(30) + 8, y: T(39), dir: 'up', pose: 'cheer', name: 'Bowler', chatter: ['Howzaaat!'] }));
        out.push(st(152, { x: T(25), y: T(36), wander: { x: T(23), y: T(33), w: T(14), h: T(6) }, name: 'Fielder', chatter: ['Catch it! ...nope.'] }));
      }
      // Thomso volunteering (fest day with the 'volunteer' tag)
      if (fest === 2 && hasTag('volunteer') && sl === 1 && !S.flags.volunteerDone) out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x: T(32), y: T(37) + 8, dir: 'down', talk: () => Story.priyaVolunteer() });
      if (fest === 2 && hasTag('thomso2') && S.rnd.meera && !S.flags.metMeera && sl === 1) out.push({ id: 'meera', name: 'Meera', look: LOOKS.meera, x: T(36), y: T(36), dir: 'left', pose: 'guitar', talk: () => Story.meera() });
      // legacy Thomso-prep day (unused by the 7-day calendar, kept for custom calendars)
      if (fest === 1 && sl >= 1) {
        out.push(st(160, { x: T(26), y: T(30), dir: 'up', pose: 'paint', name: 'Volunteer', chatter: ['Is it THOMSO or THOSMO?', 'Who has the tape?!'] }));
        out.push(st(161, { x: T(34), y: T(30), dir: 'up', pose: 'paint', name: 'Volunteer', chatter: ['Lights test in 5 minutes. (2 hours)'] }));
        if (!S.flags.volunteerDone) out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x: T(32), y: T(37) + 8, dir: 'down', talk: () => Story.priyaVolunteer() });
        if (S.rnd.meera && !S.flags.metMeera && sl >= 2) out.push({ id: 'meera', name: 'Meera', look: LOOKS.meera, x: T(36), y: T(36), dir: 'left', pose: 'guitar', talk: () => Story.meera() });
        if (sl === 1 && S.flags.idFound && S.flags.idKeep === 'return' && !S.flags.idReturned) out.push({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: T(47), y: T(15), dir: 'down', talk: () => Story.returnID() });
      }
      // Thomso days
      if (fest === 2 && sl >= 1) {
        out.push(st(170, { x: T(23), y: T(32) - 14, dir: 'down', name: 'Chaat Wala', chatter: ['Golgappe! Teekha ya extra teekha?'] }));
        out.push(st(171, { x: T(37), y: T(32) - 14, dir: 'down', name: 'Game Wala', chatter: ['3 rings, 10 rupees! Win a teddy!'] }));
        out.push(st(172, { x: T(34) + 8, y: T(38) + 4, dir: 'down', name: 'Booth Volunteer', chatter: ['Photo booth! Free memories!'] }));
        const concert = hasTag('pronite') && t >= sec(20);
        if (concert) {
          out.push({ id: 'band1', name: 'Drummer', look: studentLook(180), x: T(27), y: T(28) - 2, dir: 'down', pose: 'drum', sortY: T(29) + 2 });
          out.push({ id: 'band2', name: 'Guitarist', look: studentLook(181), x: T(33), y: T(28) - 2, dir: 'down', pose: 'guitar', sortY: T(29) + 2 });
          out.push({ id: 'meera', name: 'Meera', look: LOOKS.meera, x: T(30), y: T(28) - 2, dir: 'down', pose: 'mic', sortY: T(29) + 2 });
          for (let i = 0; i < 12; i++) out.push(st(190 + i, { x: T(25) + (i % 6) * 26 + rand(-4, 4), y: T(31) + Math.floor(i / 6) * 18 + 6, dir: 'up', pose: i % 3 ? 'dance' : 'cheer', name: 'Fan', phase: i }));
        } else if (hasTag('pronite') && t >= sec(17)) {
          out.push({ id: 'rival', name: 'Wing B\'s Dancer', look: studentLook(905), x: T(32), y: T(30), dir: 'down', pose: 'dance', talk: () => Story.danceOff() });
          for (let i = 0; i < 6; i++) out.push(st(210 + i, { x: T(26) + i * 20, y: T(33), dir: 'up', pose: 'cheer', name: 'Crowd', phase: i, chatter: ['DANCE-OFF! DANCE-OFF!'] }));
        } else if (hasTag('thomso2') && t >= sec(19) && t < sec(21)) {
          out.push({ id: 'comic', name: 'Stand-up Comic', look: LOOKS.comedian, x: T(30), y: T(28) - 2, dir: 'down', pose: 'mic', sortY: T(29) + 2, talk: () => Story.comedy() });
          for (let i = 0; i < 8; i++) out.push(st(220 + i, { x: T(25) + (i % 4) * 30, y: T(31) + Math.floor(i / 4) * 18, dir: 'up', pose: i % 2 ? 'cheer' : 'stand', name: 'Audience', phase: i, chatter: ['HAHAHA', 'Too real.'] }));
        } else {
          for (let i = 0; i < 4; i++) out.push(st(230 + i, { x: T(25) + i * 30, y: T(35), wander: { x: T(23), y: T(33), w: T(14), h: T(6) }, chatter: FEST_CHAT }));
        }
      }
      // quiz morning: friends outside the hall
      if (hasTag('quizday') && t < sec(8, 30)) {
        out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x: T(47), y: T(14) + 4, dir: 'down', talk: () => Story.priyaNotes() });
        out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: T(51) + 8, y: T(14) + 6, dir: 'down', expr: 'tired', talk: () => Story.rahulNotes() });
      }
      // court: friend for badminton, coach for NSO
      const bt = Tasks.get('badminton');
      if (bt && bt.status === 'open' && t >= sec(16) && t < sec(19)) {
        const f = hasTag('badmintonIntro') ? { id: 'priya', name: 'Priya' } : Tasks.courtFriend();
        out.push({ id: f.id, name: f.name, look: LOOKS[f.id], x: T(12), y: T(40), dir: 'left', talk: () => Act.badmintonFriend(f.id) });
      }
      if (DAY().nso && t >= sec(17) && t < sec(18, 45)) out.push({ id: 'coach', name: 'Coach Thapa', look: LOOKS.coach, x: T(9), y: T(37) + 10, dir: 'down', talk: () => Act.nso() });
      // water fight crowd
      if (hasTag('waterfight') && t >= sec(22) && t < sec(23, 50) && !S.flags['wf' + d]) {
        out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: T(27), y: T(15) + 4, dir: 'right', expr: 'happy', talk: () => Act.waterFight() });
        out.push({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: T(26), y: T(13), dir: 'right', solid: false });
        for (let i = 0; i < 3; i++) out.push(st(901 + i, { x: T(34) + i * 6, y: T(12) + i * 14, dir: 'left', name: 'Wing B', chatter: ['Wing B rules!', 'You\'re going DOWN.', 'Balloon count: 200.'] }));
      }
      if (hasTag('suspicion') && sl <= 1 && Sched.rec(0) && !(S.ice && S.ice.state !== 'none' && S.ice.state !== 'done')) out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: T(30), y: T(18) + 8, dir: 'down', talk: () => Story.rahulGeneric() });
      // professor walking near the lecture hall (lost ID card)
      if (sl === 1 && S.flags.idFound && S.flags.idKeep === 'return' && !S.flags.idReturned) out.push({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: T(47), y: T(15), dir: 'down', talk: () => Story.returnID() });
      // Day 2 icebreaking at the fountain lawn
      if (hasTag('icebreak') && t >= ICEBREAK.start - 30 && t < ICEBREAK.end && S.ice.state !== 'done') {
        SENIORS.forEach((sn, i) => out.push({ id: sn.id, name: sn.name, look: sn.look, x: sn.x, y: sn.y, dir: 'down', talk: () => Story.iceTalk() }));
        for (let i = 0; i < 5; i++) out.push(st(960 + i, { x: T(27) + i * 22, y: T(16) + 10 + (i % 2) * 8, dir: 'up', pose: i % 2 ? 'cheer' : 'stand', name: 'Fresher', phase: i, chatter: ['Mera intro ho gaya. Mujhe "Maggi" naam mila.', 'Bhai mere haath kaanp rahe hain.', 'Seniors are... actually nice?'] }));
        out.push({ id: 'tara', name: 'Tara', look: TARA_LOOK, x: TARA_POS.x, y: TARA_POS.y, dir: 'left', talk: () => Story.iceTara() });
      }
      // emergency headcount: extra foot traffic on the main road (avoidable)
      if (Chase.running() && S.hc.phase === 'run') {
        for (let i = 0; i < 6; i++) out.push(st(980 + i, { x: T(14) + i * T(5), y: T(17) + 6 + (i % 3) * 14, wander: { x: T(12), y: T(17) + 4, w: T(36), h: T(2) }, wspeed: 34, name: 'Student', chatter: ['Whoa, where\'s the fire?', 'Bhaag kyun raha hai?!', 'Headcount hai kya?!'] }));
      }
    }
    if (id === 'hostel') {
      const k = { id: 'kabir', name: 'Kabir', look: LOOKS.kabir, talk: () => Story.kabir() };
      const m = MAPS.hostel;
      if (hasTag('waterfight') && t >= sec(22) && t < sec(23, 50) && !S.flags['wf' + d]) return out;
      if (sl === 0 && t < sec(10) && !hasTag('mte') && !hasTag('endsem')) Object.assign(k, { x: m.beds.kabir.x, y: m.beds.kabir.y, pose: 'sleep', bedW: 38, dir: 'down' });
      else if (sl === 2 && (d % 3 === 1)) return out;
      else Object.assign(k, { x: m.seats.kabir.x, y: m.seats.kabir.y, pose: 'type', dir: 'up' });
      out.push(k);
    }
    if (id === 'lecture') {
      const ci = Sched.inSession();
      if (Chase.active() && S.hc.phase === 'stealth') {
        CLASSMATES.forEach((cm, i) => { const p = seatPos(cm.seat[0], cm.seat[1]); out.push({ id: cm.id, name: cm.name, look: studentLook(300 + i), x: p.x, y: p.y, dir: 'up', pose: 'sit', solid: false }); });
        const pid = S.hc.prof || 'sharma';
        out.push({ id: 'prof', name: PROFS[pid].name, look: profLook(pid), x: 208, y: 50, dir: 'up', pose: 'point', solid: false });
        out.push({ id: 'hcseat', name: '', look: null, x: Chase.seat().x, y: Chase.seat().y + 2, solid: false, sortY: 0, drawFn: (c, a, tt) => { const k = (Math.sin(tt * 6) + 1) / 2; c.fillStyle = `rgba(255,214,63,${0.25 + k * 0.35})`; c.beginPath(); c.ellipse(a.x, a.y, 9, 4, 0, 0, 7); c.fill(); } });
        return out;
      }
      if (ci >= 0 && t >= sec(7)) {
        const c = Sched.cls(ci);
        let list = CLASSMATES;
        if (fest === 2) list = CLASSMATES.filter((_, i) => i % 2 === 0);
        else if (fest === 1) list = CLASSMATES.filter((_, i) => i % 3 !== 1);
        list.forEach((cm, i) => { const p = seatPos(cm.seat[0], cm.seat[1]); out.push({ id: cm.id, name: cm.name, look: studentLook(300 + i), x: p.x, y: p.y, dir: 'up', pose: 'sit', solid: false }); });
        const pp = seatPos(0, 3); out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x: pp.x, y: pp.y, dir: 'up', pose: 'sit', solid: false });
        if (this.rahulInClass(ci)) { const rp = seatPos(2, 2); out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: rp.x, y: rp.y, dir: 'up', pose: 'sit', solid: false }); }
        const pid = c.course === 'ALL' ? 'sharma' : COURSES[c.course].prof;
        const firstEver = hasTag('intro') && ci === 0 && !S.flags.introProfIn;
        if (!firstEver) out.push({ id: 'prof', name: PROFS[pid].name, look: profLook(pid), x: MAPS.lecture.profSpot.x, y: MAPS.lecture.profSpot.y - 8, dir: 'down', solid: false });
      } else if (sl <= 1) {
        out.push(st(320, { x: 300, y: 230, dir: 'left', name: 'Topper', chatter: ['(Revising... in an empty hall... for fun)'], talk: async () => { await say({ name: 'Topper', look: studentLook(320) }, 'I come here when it\'s empty. The silence is very easy.'); } }));
      }
    }
    if (id === 'library') {
      out.push({ id: 'librarian', name: 'Librarian Ma\'am', look: LOOKS.librarian, x: 60, y: 202, dir: 'down', talk: () => Act.librarian() });
      const seats = MAPS.library.seats;
      const n = sl === 3 ? 2 : (hasTag('finalprep') || hasTag('endsem')) ? 5 : 4;
      for (let i = 0; i < n; i++) { const [x, y] = seats[[0, 2, 4, 7, 3][i]]; out.push(st(400 + i + d, { x, y, dir: 'down', pose: 'read', bookCol: pick(['#c0392b', '#2f8fd0', '#2ec4b6', '#7a5cc4']), chatter: LIB_CHAT, solid: false, talk: async () => { await say({ name: 'Studious Student', look: studentLook(400 + i + d) }, pick(['(whisper) Shhh. I\'m on page 3 of 400.', '(whisper) Do you understand Fourier? Nobody does.', '(whisper) If the librarian looks here, I was reading.'])); } })); }
      if (!isFestDay() && (sl === 1 || sl === 2)) { const [x, y] = seats[1]; out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x, y, dir: 'down', pose: 'read', bookCol: '#e8566f', solid: false, talk: () => Story.priyaLibrary() }); }
    }
    if (id === 'canteen') {
      out.push({ id: 'bhaiya', name: 'Pappu Bhaiya', look: LOOKS.bhaiya, x: 238, y: 47, dir: 'down', talk: () => Act.order() });
      const tables = MAPS.canteen.tables;
      const n = sl === 3 ? 3 : 6;
      const spots = [[0, 14], [0, 36], [4, 14], [5, 40], [6, 20], [7, 14], [2, 30], [3, 14]];
      for (let i = 0; i < n; i++) { const [ti, off] = spots[i]; const [x, y] = tables[ti]; out.push(st(500 + i + d * 3, { x: x + off, y: y - 12, dir: 'down', pose: i % 2 ? 'eat' : 'sit', chatter: CANTEEN_CHAT, solid: false, talk: async () => { await say({ name: 'Hungry Student', look: studentLook(500 + i + d * 3) }, pick(['The Mystery Sabzi blinked at me.', 'Bhaiya ki chai is the only stable thing in my life.', 'I\'m not eating. I\'m "networking".', 'This is my 3rd lunch. Don\'t judge.'])); } })); }
      if (sl >= 1 && (hasTag('intro') || hasTag('borrow') || (hasTag('repay') && sl >= 2))) { const [x, y] = tables[3]; out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: x + 26, y: y - 12, dir: 'down', pose: 'eat', solid: false, talk: () => Story.rahulGeneric() }); }
      if (sl === 2 && d % 3 === 1) { const [x, y] = tables[6]; out.push({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: x + 40, y: y - 12, dir: 'down', pose: 'eat', solid: false, talk: () => Story.kabir() }); }
    }
    return out;
  },
  rahulInClass(ci) {
    const px = this.proxyInfo(ci);
    if (px && px.from === 'rahul') return false;
    if (hasTag('intro')) return false;
    return true;
  },
  /* who (if anyone) asked for a proxy in class i today — scripted friend or a random classmate */
  proxyInfo(i) {
    const d = DAY(), key = Sched.key(i);
    let q = null;
    if (d.proxy && d.proxy.cls === i) q = { from: d.proxy.from, name: CH[d.proxy.from].name, full: { rahul: 'Rahul Verma', kabir: 'Kabir Khanna' }[d.proxy.from] };
    else { const x = (S.xproxy || {})[S.day]; if (x && x.cls === i) q = { from: x.from, name: x.name, full: x.full, classmate: true }; }
    if (!q) return null;
    q.state = S.proxyReq[key] || 'pending'; q.task = 'px' + i; q.key = key;
    return q;
  },

  /* ================= engine hooks ================= */
  onSlot(sl) {
    if (!S || G.mode !== 'play' || MG.cur) return;
    if (festLevel() === 2 && sl >= 2) AU.play('fest');
    else if ((hasTag('mte') || hasTag('endsem')) && sl === 0) AU.play('tense');
    else AU.play(sl >= 2 ? 'night' : 'day');
  },
  async canEnter(d) {
    if (d.to === 'library' && (S.time >= sec(26) || S.time < sec(7))) { await say('guard', 'Library band hai. 2 baje se 7 baje tak, sirf ullu padhte hain. Woh bhi hostel mein.'); return false; }
    return true;
  },
  async onEnter(id) {
    const t = S.time;
    if (Chase.active()) { if (id === 'lecture' && Chase.running()) Chase.enterHall(); return; }
    if (id === 'campus' && hasTag('intro') && !S.flags.proxyAsked && t < DAY().classes[0].start + 20) return this.rahulProxy();
    if (id === 'lecture') { const i = Sched.active(); if (i >= 0) { await wait(0.3); return this.startClass(i); } }
    if (id === 'canteen') {
      if (hasTag('messfood') && !S.flags.messFood && t >= sec(11)) return this.messFood();
      if (hasTag('borrow') && t >= sec(12) && !S.flags.borrowAsked) return this.rahulBorrow();
      if (hasTag('repay') && t >= sec(17) && S.flags.lent && !S.flags.repaid) return this.rahulRepay();
    }
    if (id === 'library' && !S.seen.lib) { S.seen.lib = 1; await wait(0.3); await say('librarian', 'Welcome to the {L:library}. Phones on silent. Thoughts on silent. Breathing... quietly.'); }
  },
  afterScript() {
    if (!S || G.mode !== 'play' || MG.cur) return;
    if (S.att.held > ATT_RULES.baseHeld + 2 && S.stats.att < ATT_RULES.debarBelow && !S.flags.over) { S.flags.over = true; runScript(() => this.debarred('rumour')); return; }
    if (this.energyCheck()) return;
    if (S.pendingSave) { S.pendingSave = false; Game.save(true); }
  },
  energyCheck() {
    if (S.stats.energy <= 0 && !S.exhausted) { S.exhausted = true; S.exhaustAt = S.time; runScript(() => this.exhaustedStart()); return true; }
    if (S.exhausted && S.stats.energy >= 15) { S.exhausted = false; notify('Body', 'Energy back. You feel almost human again.'); }
    if (S.exhausted && S.time - S.exhaustAt >= 120 && !G.collapsing) { G.collapsing = true; runScript(() => this.collapse()); return true; }
    return false;
  },
  tick(dt) {
    if (G.mode !== 'play') return;
    G.notifT = (G.notifT === undefined ? 60 : G.notifT) - dt;
    if (G.notifT <= 0) { G.notifT = rand(90, 160); if (!Chase.active()) { const n = Bag('notifs', NOTIFS); notify(n[0], n[1]); } }
    const m = Math.floor(S.time);
    if (G.lastMin === m) return;
    G.lastMin = m;
    Sched.tick(); Tasks.tick();
    const t = S.time;
    if (Chase.active()) return; // nothing else interrupts an emergency
    if (Chase.tryStart()) return;
    // classes the player never reached
    const cl = DAY().classes;
    for (let i = 0; i < cl.length; i++) {
      const c = cl[i];
      if (Sched.rec(i) || t < Sched.closeAt(c)) continue;
      if (c.type === 'lecture') return runScript(() => this.missClass(i));
      if (c.type === 'quiz') return runScript(() => this.missQuiz(i));
      if (t >= c.start + c.dur - 10) return runScript(() => this.missExam(i));
      return runScript(() => this.lateExam(i));
    }
    // passive tiredness while awake
    S.awake = (S.awake || 0) + 1;
    if (S.awake % 45 === 0) S.stats.energy = clamp(S.stats.energy - 1, 0, 100);
    if (this.energyCheck()) return;
    // deadline
    if (S.day === ASSIGN_DUE_DAY && !S.flags.submitted) {
      if (t >= sec(23) && !S.flags.warn23) { S.flags.warn23 = 1; UI.warn('Assignment closes at 11:59 PM.', '59 minutes left', 'urgent'); }
      if (t >= sec(23, 40)) return runScript(() => this.deadlineCrunch());
    }
    if (hasTag('rahulHelp') && t >= sec(13) && G.map.id === 'campus' && !S.flags.helpAsked) return runScript(() => this.rahulHelp());
    if (hasTag('volunteer') && t >= sec(12) && !S.flags.festHint) { S.flags.festHint = 1; notify('Class Group', 'Priya: Thomso volunteers needed at the {L:ground}! Free food + VIP pass!!'); }
    if (this.iceTick(t)) return;
    if (this.festCardTick(t)) return;
    if (this.eventTick(t)) return;
    if (hasTag('pronite') && t >= sec(17) && !S.flags.danceHint) { S.flags.danceHint = 1; notify('Thomso', 'Dance-off at the {L:stage} till 8 PM. Pronite at 8!'); }
    if (hasTag('pronite') && t >= sec(20) && !S.flags.concertHint) { S.flags.concertHint = 1; notify('Thomso', 'PRONITE is LIVE on the {L:stage}!'); }
    if (hasTag('thomso2') && t >= sec(19) && !S.flags.comedyHint) { S.flags.comedyHint = 1; notify('Thomso', 'Comedy night starting on the {L:stage}.'); }
    if (hasTag('waterfight') && t >= sec(22) && !S.flags['wfHint' + S.day]) { S.flags['wfHint' + S.day] = 1; G.needRepop = true; UI.warn('Wing B has declared war.', 'Water fight at the {L:plaza}, 10:30 PM. Optional!', 'info'); }
    if (t >= sec(30)) return runScript(() => Game.dawnAwake());
    if (t >= sec(26) && !S.flags['stayUp' + S.day] && !(S.day === ASSIGN_DUE_DAY && !S.flags.submitted)) return runScript(() => this.forcedSleep());
  },

  /* ================= DAY 1 ================= */
  async intro() {
    const m = MAPS.hostel, p = PL();
    G.alarmFallen = false;
    p.x = m.beds.player.x; p.y = m.beds.player.y; p.pose = 'sleep'; p.expr = 'sleep'; p.bedW = 38;
    setTime(sec(8, 2));
    AU.play('night');
    await fadeIn(1.2);
    await wait(0.8);
    for (let i = 0; i < 3; i++) {
      G.alarmRing = true; AU.sfx('alarm'); shake(i + 1);
      const al = spawn({ id: 'alarm', x: 80, y: 62, visible: false, solid: false });
      bubble(al, ['RING RING!', 'RIIIING RIIIIING!!', 'R I I I I N G ! ! !'][i], 1.6);
      await wait(1.4);
      G.alarmRing = false;
      if (i === 0) { emote(p, 'z', 1.6); await say('me', '...five more minutes...', 'sleep'); setTime(sec(8, 17)); }
      if (i === 1) { const k = A('kabir'); emote(k, 'angry'); await say('kabir', 'Bhai... band kar isko... ya main isko band kar dunga...', 'sleep'); setTime(sec(8, 38)); await wait(0.6); }
      if (i === 2) { G.alarmFallen = true; AU.sfx('crash'); shake(5); await wait(0.5); }
    }
    despawn('alarm');
    p.expr = 'shock'; emote(p, '!!', 1.5); AU.sfx('pop');
    await wait(0.8);
    p.pose = 'stand'; p.x = 46; p.y = 86; p.dir = 'down';
    await wait(0.25);
    p.pose = 'stretch'; p.expr = 'sleep'; emote(p, '...', 1.4); AU.sfx('whoosh');
    await wait(1.5);
    p.pose = 'tired'; p.expr = 'tired';
    await say('me', '8:40?! SIG-201 is at 9! Sharma sir\'s class!', 'shock');
    await say('me', 'The semester started four minutes ago and I\'m already losing.', 'tired');
    const k = A('kabir');
    await say('kabir', 'Tu 75% attendance pe hai, right? Live life on the edge, bro.', 'sleep');
    await say('kabir', 'Icebreaking kal. Thomso Wednesday se. Assignment Saturday. Final Sunday. Sweet dreams.', 'sleep');
    emote(k, 'z', 3);
    p.pose = 'stand'; p.expr = 'normal';
    stat({ energy: -5 });
    S.flags.introDone = true;
  },

  async rahulProxy() {
    S.flags.proxyAsked = true;
    const p = PL();
    const r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: T(18), y: T(18) + 8, dir: 'left', talk: () => this.rahulGeneric() });
    await wait(0.3);
    bubble(r, `${S.name}!! Ruk bhai!`, 1.5);
    G.camTarget = { x: (p.x + r.x) / 2, y: p.y - 10 };
    await walk(r, [[T(13), T(18) + 8], [p.x + 18, p.y + 2]], 110);
    faceTo(r, p); faceTo(p, r);
    r.expr = 'tired'; emote(r, 'sweat');
    await say('rahul', 'Bro, proxy laga de. Bas aaj ki attendance bacha le.', 'tired');
    await say('rahul', 'Kal raat 4 baje tak padhai ki. Matlab... reels. Educational reels.', 'normal');
    let c = await ask('rahul', 'Sharma sir ki class. Bol na bhai, please? Roll number 42.', ['Theek hai, bas aaj.', 'Nahi bhai, Sharma sir pakad lenge.', 'Kya milega mujhe?']);
    if (c === 2) {
      r.expr = 'happy';
      await say('rahul', 'Canteen pe samosa. Do samose. Plus lifetime dosti. Final offer.', 'happy');
      c = await ask('rahul', 'Deal?', ['Deal. Proxy pakka.', 'Samose se zameer nahi bikta. Nahi.']);
      if (c === 0) S.flags.samosaDeal = true;
    }
    if (c === 0) {
      S.proxyReq['0-0'] = 'agreed'; rel('rahul', 8); trust(4);
      r.expr = 'happy'; emote(r, 'heart');
      await say('rahul', 'Tu bhagwan hai! Deep voice mein bolna. Mera voice thoda... manly hai.', 'happy');
      stat({ social: 3 });
      logd('Promised Rahul a proxy on day one');
    } else {
      S.proxyReq['0-0'] = 'refused'; rel('rahul', -6);
      r.expr = 'angry'; emote(r, 'angry');
      await say('rahul', 'Wow. Dosti ka yeh sila. Theek hai... main hi aa jaata hoon. Kal se.', 'angry');
      Tasks.fail('px0', 'skipped');
      logd('Refused Rahul\'s first proxy request');
    }
    await say('rahul', 'Main chala canteen. Ek "important meeting" hai. Samose ke saath.', 'normal');
    G.camTarget = null;
    walk(r, [[T(30), T(18) + 8], [T(41) + 8, T(18) + 8], [T(41) + 8, T(30)]], 90).then(() => despawn('rahul'));
    UI.hint('Your tasks are in the notebook (<kbd>N</kbd>). The orange dot on the map shows where to go.', 7);
  },

  /* ================= LECTURES ================= */
  async startClass(i) {
    const c = Sched.cls(i);
    if (c.type === 'quiz') return this.quiz(i);
    if (c.type === 'mte' || c.type === 'endsem') return this.exam(i);
    return this.lecture(i);
  },

  async lecture(i) {
    const c = Sched.cls(i), co = COURSES[c.course], pid = co.prof, pf = PROFS[pid], p = PL();
    const px = this.proxyInfo(i);
    const late0 = Math.max(0, S.time - c.start);
    const fname = px ? px.name : '';
    const opts = [
      { t: 'Attend honestly', hint: '+Attendance', k: 'attend' },
      { t: px ? `Attend + give ${fname} a proxy` : 'Attempt a proxy for a friend', hint: px ? (px.state === 'refused' ? 'you already said no' : 'risky') : 'nobody asked today', dis: !px || px.state === 'refused', k: 'proxy' },
      { t: 'Skip it · bunk at the canteen', hint: `-Attendance · ${c.dur} min`, k: 'skip' },
    ];
    const head = late0 > 0 ? `${co.code} started ${late0} min ago. ${pf.name} is mid-sentence.` : S.time < c.start ? `${co.code} · ${co.name} starts at ${fmtTime(c.start)}.` : `${co.code} is starting right now.`;
    const k = opts[await ask('me', head, opts)].k;
    if (k === 'skip') return this.bunk(i, px);
    await walk(p, [[394, 238], [208, 238], [208, 158], [156, 158], [156, 166]], 72);
    p.pose = 'sit'; p.dir = 'up';
    G.camTarget = { x: 208, y: 120 };
    if (S.time < c.start) { await UI.timeSkip('Waiting for class · classmates gossip...', c.start - S.time, null); }
    let prof = A('prof');
    if (!prof) {
      await wait(0.5);
      prof = spawn({ id: 'prof', name: pf.name, look: profLook(pid), x: 394, y: 250, dir: 'up', solid: false });
      AU.sfx('door'); S.flags.introProfIn = true;
      for (const cm of CLASSMATES.slice(0, 5)) emote(A(cm.id), '!', 1);
      await walk(prof, [[394, 238], [208, 238], [208, 88], [250, 88], [250, 54], [208, 54]], 52);
      face(prof, 'down');
      await say(pid, Bag('intro_' + pid, DLG.profIntro[pid]));
    }
    const late = Math.max(0, Math.min(late0, c.dur));
    let credit = 1, status = 'attended';
    if (late > ATT_RULES.lateGrace) {
      prof.expr = 'sus'; emote(prof, 'sus');
      await say(pid, `${S.name}. ${late} minutes late. ${pid === 'sharma' ? 'Punctuality is very easy.' : 'Lateness, it trivially follows, is absence.'}`, 'sus');
      const c2 = await ask('me', 'Every head turns toward the door. And you.', ['Apologise: "Sorry, traffic."', 'Sneak to the back row like a ninja', 'Leave quietly (counts as skipped)']);
      if (c2 === 2) { prof.expr = 'normal'; return this.leaveClass(i, px); }
      if (c2 === 0) { await say(pid, 'Traffic. Inside the campus. Sit. You are marked late, which means absent. But learn something.', 'sus'); credit = 0; status = 'late-absent'; }
      else {
        const caught = Math.random() < 0.3 + pf.strict + (S.flags.profSus ? 0.15 : 0);
        if (caught) { await say(pid, 'The ninja in row three. Absent. And memorable.', 'angry'); credit = 0; status = 'late-absent'; S.flags.profSus = true; AU.sfx('laugh'); }
        else { await say('sys', 'Nobody noticed. Except Chirag, who gives you a slow, respectful nod.'); status = 'late'; }
      }
      prof.expr = 'normal';
    } else if (late > 3) {
      await say(pid, `${S.name}, you are ${late} minutes late. Sit. ${pid === 'sharma' ? 'Quickly. Very easily.' : 'Quietly.'}`, 'sus');
      status = 'late';
    }
    if (late <= 6) await this.rollCall(i, prof, k === 'proxy' ? px : null, pid);
    else if (k === 'proxy') { await say('me', `Roll call is already over. ${fname}'s proxy window closed while I was walking in.`, 'tired'); rel(px.from, -2); S.proxyReq[px.key] = 'missed'; Tasks.fail(px.task); }
    else if (px && px.state !== 'refused') { rel(px.from, -2); Tasks.fail(px.task); }
    await this.teach(i, prof, pid);
    // wrap up
    AU.sfx('bell');
    const nd = S.day + 1 < SEM_DAYS ? DAY(S.day + 1) : null;
    let outro = Bag('outro_' + pid, DLG.profOutro[pid]);
    if (nd && nd.tags.includes('quizday')) outro = Rng.pick(['Revise tonight. For no particular reason. Very easy advice.', 'Sleep early tonight. I am saying this for your health. Only health.']);
    else if (nd && nd.tags.includes('deadline')) outro = 'Assignment 1 is due on Saturday, 11:59 PM. No extensions. Not even for Thomso.';
    else if (S.day + 2 === SEM_DAYS - 1 || S.day + 1 === SEM_DAYS - 1) outro = 'Final exam on Sunday, 10 AM. Everything is in the syllabus. Everything.';
    await say(pid, outro);
    if (pid === 'sharma') S.counters.veryEasy++; else S.counters.trivially++;
    stat({ acad: 2, energy: -6 });
    Att.record(Sched.key(i), status, credit);
    if (credit) Tasks.done('cls' + i); else Tasks.fail('cls' + i);
    await fadeOut(0.6);
    setTime(Math.max(S.time, c.start + c.dur));
    G.camTarget = null; G.board = 0;
    gotoMap('lecture', 208, 228, 'down');
    G.camSnap = true;
    await fadeIn(0.6);
    S.pendingSave = true;
  },

  async leaveClass(i, px) {
    const p = PL();
    await walk(p, [[156, 158], [208, 158], [208, 238], [394, 238]], 80);
    Att.record(Sched.key(i), 'missed', 0); S.skippedClasses++;
    Tasks.fail('cls' + i);
    if (px && px.state !== 'refused') { rel(px.from, -3); Tasks.fail(px.task); }
    G.camTarget = null;
    gotoMap('campus', T(BUILDINGS.lecture.door) + 8, T(BUILDINGS.lecture.y + BUILDINGS.lecture.h) + 12, 'down');
    UI.warn('You missed the lecture. Attendance updated.', 'You left without being marked present', 'urgent');
  },

  async bunk(i, px) {
    const c = Sched.cls(i), co = COURSES[c.course];
    await say('me', pick(['Attendance is a social construct. Samosa is not.', 'One bunk. For mental health. And chutney.', `${co.code} will survive without me. Probably.`]), 'happy');
    await fadeOut(0.5);
    gotoMap('canteen', 126, 176, 'down');
    const p = PL(); p.pose = 'eat';
    const tb = MAPS.canteen.tables[3];
    spawn({ id: 'bunk1', name: 'Kunal', look: studentLook(305), x: tb[0] + 40, y: tb[1] - 12, dir: 'down', pose: 'eat', solid: false });
    G.camTarget = { x: 130, y: 160 };
    await fadeIn(0.5);
    await say({ name: 'Kunal', look: studentLook(305) }, pick(['Welcome to the bunkers\' club. Membership: everyone, eventually.', 'Bro, Sharma sir is probably saying "very easy" right now. I can feel it.', 'I\'ll copy notes from Priya. She\'ll say no. I\'ll ask again.']));
    if (px && px.state !== 'refused') { UI.notify('Hostel Gang', `${px.name}: bro YOU bunked too?! Who is giving my proxy??`); rel(px.from, -3); Tasks.fail(px.task); }
    await UI.timeSkip('Bunking at the canteen...', Math.max(30, c.start + c.dur - S.time), 'eat');
    stat({ social: 5, energy: 4, money: -4 }); S.counters.samosa++;
    Att.record(Sched.key(i), 'bunked', 0); S.skippedClasses++;
    Tasks.fail('cls' + i, 'skipped');
    logd(`Bunked ${co.code} on ${DAY().wd} for samosas`);
    p.pose = 'stand'; p.y = 166; despawn('bunk1'); G.camTarget = null;
    S.pendingSave = true;
  },

  async missClass(i) {
    const c = Sched.cls(i), co = COURSES[c.course], px = this.proxyInfo(i);
    Att.record(Sched.key(i), 'missed', 0);
    S.skippedClasses++;
    Tasks.fail('cls' + i);
    UI.warn('You missed the lecture. Attendance updated.', `${co.code} · ${fmtTime(c.start)}`, 'urgent');
    if (px && px.state !== 'refused') { rel(px.from, -4); Tasks.fail(px.task); setTimeout(() => notify('Hostel Gang', `${px.name}: bro?? proxy?? where were you??`), 900); }
    if (S.skippedClasses === 1) await say('me', 'Missed a lecture. My attendance just flinched.', 'tired');
    logd(`Missed ${co.code} on ${DAY().wd}`);
  },

  async roll(prof, name, who, reply) {
    bubble(prof, name + '?', 1.4); AU.sfx('blip', 0.65);
    await wait(0.9);
    if (!who) return;
    who.pose = 'raise'; bubble(who, reply, 1.4); AU.sfx('blip', 1.2);
    await wait(1.1);
    who.pose = 'sit';
  },

  async rollCall(i, prof, px, pid) {
    const p = PL();
    if (hasTag('suspicion') && pid === 'sharma' && S.proxyCount > 0) {
      prof.expr = 'sus';
      await say(pid, 'Yesterday, someone was present in two places at once. Quantum attendance.', 'sus');
      emote(prof, 'sus', 2); await say(pid, `I am watching you, ${S.name}. Very closely. Very easily.`, 'sus'); emote(p, 'sweat', 2);
      prof.expr = 'normal'; S.flags.profSus = true;
    }
    await say(pid, Rng.pick(pid === 'sharma' ? ['Attendance. And no one answers for anyone else. I have ears.', 'Roll call. One body, one voice. Very easy rule.', 'Attendance. I know every voice in this room. Every. Voice.'] : ['Roll call. One voice per person, please. I have studied voices statistically.', 'Attendance. I will be listening for... anomalies.', 'Roll call. Proxies are a hypothesis I enjoy rejecting.']));
    const names = [['aman', 'Aman Gupta', 'Yes sir!'], ['bhavna', 'Bhavna Rao', 'Present ma\'am!'], ['neha', 'Neha Joshi', 'Present!'], ['dev', 'Dev Malhotra', 'Yes!'], ['tanvi', 'Tanvi Shah', 'Present.']];
    const [a, b] = BagN('rollnames', names, 2);
    await this.roll(prof, a[1], A(a[0]), a[2]);
    if (hasTag('intro') && i === 0) {
      bubble(prof, 'Chirag Jain?', 1.2); await wait(1.0);
      const ch = A('chirag'); emote(ch, 'z', 1.5); await wait(1.0);
      bubble(prof, 'CHIRAG!', 1.0); shake(2); AU.sfx('pop'); await wait(0.5);
      emote(A('kunal'), '!', 1); emote(ch, '!!', 1);
      ch.pose = 'raise'; bubble(ch, 'PRESENT! Yes! Here! Sir!', 1.4); await wait(1.3); ch.pose = 'sit';
      for (const cm of ['ishita', 'neha', 'rohit']) emote(A(cm), 'haha', 1);
      AU.sfx('laugh');
    } else await this.roll(prof, b[1], A(b[0]), b[2]);
    await this.roll(prof, S.name, p, festLevel() === 2 ? 'Yes... (yawn)' : 'Present!');
    const fid = px ? px.from : (this.rahulInClass(i) ? 'rahul' : null);
    if (px) return this.proxyAttempt(i, prof, px, pid, px.full);
    if (fid === 'rahul') {
      const r = A('rahul');
      bubble(prof, 'Rahul Verma?', 1.2); await wait(0.9);
      if (r && festLevel() === 2) { emote(r, 'z', 3); bubble(r, 'Zzz... proxy laga de...', 1.6); await wait(1.4); AU.sfx('laugh'); for (const cm of ['aman', 'tanvi']) emote(A(cm), 'haha', 1); }
      else if (r) { r.pose = 'raise'; bubble(r, hasTag('suspicion') ? 'Yes! (panting) Traffic tha!' : 'Present. In person. Rare.', 1.6); await wait(1.4); r.pose = 'sit'; if (hasTag('suspicion')) { await say(pid, 'Traffic. The hostel is 200 metres away, Rahul.'); AU.sfx('laugh'); } }
    } else if (hasTag('intro')) {
      bubble(prof, 'Rahul Verma?', 1.4); await wait(1.2);
      await say(pid, 'Absent. As usual. Rahul is a myth, like a quiz with no surprises.');
    }
  },

  async proxyAttempt(i, prof, px, pid, fullName) {
    const p = PL(), fr = px.name;
    bubble(prof, fullName + '?', 1.6); await wait(1.2);
    for (const cm of ['dev', 'neha', 'kunal']) emote(A(cm), '...', 1.5);
    const c = await ask('me', `${fr}'s name. The whole class is suddenly fascinated by the ceiling.`, ['Deep voice: "Present."', 'Chicken out. Stay silent.']);
    S.proxyReq[px.key] = 'done';
    if (c === 1) {
      await wait(0.8); prof.expr = 'sus';
      await say(pid, `Absent. Again. ${fr} is a myth.`, 'sus');
      prof.expr = 'normal';
      rel(px.from, -8); Tasks.fail(px.task);
      logd(`Chickened out of ${fr}'s proxy`);
      return;
    }
    p.pose = 'raise'; bubble(p, Rng.pick(['Present. (deep voice)', 'Yes sir. (suspiciously deep)', 'Prejent! (accent included)']), 1.6); AU.tone(110, 0.4, 'sawtooth', 0.15); await wait(1.2); p.pose = 'sit';
    Chase.onProxy(); // every voiced proxy is an attempt, caught or not
    const pf = PROFS[pid];
    const risk = clamp(pf.strict + 0.06 * S.proxyCount + (S.flags.profSus ? 0.12 : 0) + (S.flags.caught ? 0.15 : 0), 0.08, 0.85);
    const r = Rng.next();
    if (r < risk * 0.6) {
      prof.expr = 'sus'; emote(prof, '!', 1.4);
      await say(pid, `${fullName}. Stand up. I want to see your face.`, 'sus');
      for (const cm of CLASSMATES) emote(A(cm.id), '!', 1.2);
      const c3 = await ask('me', 'Every head in the room turns toward you. Your heart is doing cardio.', [`Stand up as ${fr}. Commit to the bit.`, 'Pretend to tie your shoelace.']);
      if (c3 === 0) {
        p.pose = 'stand'; p.dir = 'up';
        const caught = Rng.next() < clamp(0.45 + 0.08 * S.proxyCount, 0, 0.9);
        await wait(0.8);
        if (caught) {
          prof.expr = 'angry'; emote(prof, 'angry', 2);
          await walk(prof, [[208, 88], [208, 158], [170, 158]], 60); faceTo(prof, p);
          await say(pid, `You are ${fr}? Then who is ${S.name}? Your twin? Your understudy?`, 'angry');
          AU.sfx('stamp'); shake(6);
          await UI.popup(`<div class="stamp">PROXY DETECTED</div><p>${esc(pf.name)} marks you <b>absent for two more lectures</b>. ${esc(fr)} gets nothing. The class group chat erupts. You are now a campus legend, for the wrong reasons.</p>`, 'Accept your fate', 'paper');
          Att.penalty(2); stat({ social: 4, acad: -2 });
          S.flags.caught = true; S.flags.profSus = true; S.counters.caught++; rel(px.from, 4); Tasks.fail(px.task);
          logd(`Got CAUGHT giving ${fr} a proxy`);
          await walk(prof, [[208, 158], [208, 88], [208, 54]], 70); face(prof, 'down');
        } else {
          prof.expr = 'sus';
          await say(pid, `...Sit down, ${fr}. You look different. Did you get a haircut? And a new face?`, 'sus');
          for (const cm of CLASSMATES) if (chance(0.6)) emote(A(cm.id), 'haha', 1.4);
          AU.sfx('laugh');
          rel(px.from, 15); trust(8); stat({ social: 6 }); Tasks.done(px.task);
          logd(`Survived a stand-up proxy test for ${fr}. Legendary.`);
        }
        p.pose = 'sit'; prof.expr = 'normal';
      } else {
        p.pose = 'sit';
        await say(pid, `Absent then. And ${S.name}, your shoelace is very interesting. You are wearing slippers.`, 'sus');
        rel(px.from, -4); S.flags.profSus = true; Tasks.fail(px.task);
        logd('Faked a shoelace emergency to escape a proxy test');
      }
      return;
    }
    prof.expr = 'sus'; emote(prof, '?', 1.6);
    if (r < risk) { await say(pid, `...${fr}. Your voice is very different today. Interesting.`, 'sus'); S.flags.profSus = true; }
    else await say(pid, 'Hmm. Present.', 'normal');
    for (const cm of ['dev', 'neha', 'kunal', 'arjun']) emote(A(cm), 'haha', 1.2);
    AU.sfx('laugh');
    rel(px.from, 10); trust(6); Tasks.done(px.task);
    prof.expr = 'normal';
    logd(`Gave ${fr} a deep-voice proxy (${COURSES[Sched.cls(i).course].code}) · proxy #${S.proxyCount}`);
  },

  async teach(i, prof, pid) {
    const c = Sched.cls(i), co = COURSES[c.course], p = PL();
    const n = S.counters.lectures = (S.counters.lectures || 0) + 1;
    const topics = co.subject === 'sig' ? ['Fourier transforms', 'Laplace transforms', 'Convolution', 'Z-transforms', 'Sampling', 'Filters', 'Stability'] : ['Bayes\' theorem', 'Random variables', 'The Poisson distribution', 'Expectation', 'The Central Limit Theorem', 'Hypothesis testing', 'Regression'];
    const topic = topics[n % topics.length];
    await walk(prof, [[208, 50]], 40); face(prof, 'up');
    for (let k = 1; k <= 9; k++) { G.board = k; AU.sfx('write'); await wait(0.2); }
    face(prof, 'down');
    if (pid === 'sharma') { await say(pid, `Today: ${topic}. Integrate from minus infinity to plus infinity. It is very easy.`); S.counters.veryEasy++; }
    else { await say(pid, `Today: ${topic}. Once you accept the assumptions, everything trivially follows.`); S.counters.trivially++; }
    for (const cm of CLASSMATES) { const a = A(cm.id); if (a && chance(0.6)) emote(a, pick(['?', '?', '...', 'sweat', 'z']), 2.2); }
    if (festLevel() === 2) await say(pid, Rng.pick(pid === 'sharma' ? ['I see Thomso on your faces. Mostly the dark circles.', 'Half the class is missing. The other half is asleep. Very easy to teach.'] : ['Attendance is low. Thomso, I assume. The probability of you passing is also low.', 'I count glitter on 14 faces. Correlation with Pronite: strong.']));
    if (hasTag('suspicion') && pid === 'sharma') await this.popQuestion(prof, pid);
    if (hasTag('project') && pid === 'sharma') await this.projectGroups(pid);
    await wait(0.6);
    const tired = S.exhausted || S.stats.energy < 12;
    const opts = [{ t: 'Nod confidently like you understand.', k: 'nod' }, { t: 'Actually take notes.', hint: tired ? 'too tired' : '+Academics', dis: tired, k: 'notes' }, { t: 'Sleep with your eyes open.', hint: '+Energy', k: 'sleep' }];
    const ch = opts[await ask('me', `${PROFS[pid].name.split(' ').slice(-1)[0]} looks directly at you, expecting understanding.`, opts)].k;
    if (ch === 'nod') { emote(p, '!', 1); await say(pid, pid === 'sharma' ? 'Good. See? Very easy. Nobody understands, but everyone nods.' : 'Excellent. Nodding is a sufficient statistic.'); stat({ social: 2, acad: 1 }); S.counters.nods++; }
    else if (ch === 'notes') { p.pose = 'write'; AU.sfx('write'); await wait(1.4); p.pose = 'sit'; stat({ acad: 5, energy: -4 }); S.counters.notes++; S.prep[co.subject] = clamp((S.prep[co.subject] || 0) + 4, 0, 100); }
    else { p.expr = 'sleep'; emote(p, 'z', 2); await wait(1.4); p.expr = 'normal'; if (chance(0.3)) { prof.expr = 'sus'; await say(pid, `${S.name}, are you meditating? This is not yoga class.`, 'sus'); prof.expr = 'normal'; } stat({ energy: 7 }); }
  },

  async popQuestion(prof, pid) {
    await say(pid, `${S.name}. Quick question. What is a Fourier series?`);
    const c = await ask('me', 'Twelve pairs of eyes. One brain cell. Yours.', ['"A sum of sines and cosines, sir."', '"It depends on the boundary conditions."', '"Sir, very easy question. Next?"']);
    if (c === 0) {
      if (S.stats.acad >= 45) { prof.expr = 'happy'; await say(pid, 'Correct! See? Very easy. Someone was listening.', 'happy'); stat({ acad: 4, social: 2 }); S.flags.profImpressed = true; }
      else { await say('me', '"...A sum of sines and... cosines... and... vibes?"', 'shock'); await say(pid, 'Vibes. Fourier is rolling in his grave. Very easily.'); stat({ social: 2 }); }
    } else if (c === 1) {
      if (chance(0.5)) { await say(pid, 'Hmm. Correct, in a way. In a very vague way.'); stat({ acad: 2 }); }
      else { await say(pid, 'Which boundary? The boundary of your knowledge?'); for (const cm of CLASSMATES) if (chance(0.5)) emote(A(cm.id), 'haha', 1.2); AU.sfx('laugh'); stat({ social: 3 }); }
    } else { await say(pid, 'Then you will find the quiz very easy too. I will remember this.'); for (const cm of CLASSMATES) emote(A(cm.id), '!', 1); bubble(A('kunal'), 'Ooooooh', 1.4); S.flags.cocky = true; stat({ social: 4 }); }
    prof.expr = 'normal';
  },

  async projectGroups(pid) {
    await say(pid, 'Course project. Groups of three. Choose wisely. Your marks will be... shared.');
    const c = await ask('me', 'Priya is waving a colour-coded Gantt chart. Rahul and Kabir are waving... a samosa.', ['Join Priya\'s group (serious)', 'Join Rahul & Kabir (chaotic)', 'Go solo (lonely, in control)']);
    S.project.group = ['priya', 'fun', 'solo'][c];
    if (c === 0) { rel('priya', 6); await say('priya', 'Good choice. Meeting today, 4 PM, library. Don\'t be late. I will know.', 'happy'); }
    else if (c === 1) { rel('rahul', 6); rel('kabir', 6); await say('rahul', 'Group name: "Very Easy". Meeting at 4 in the library. Main samose laaunga.', 'happy'); }
    else { await say('me', 'Solo. No group chat. No drama. No help.', 'normal'); }
    logd(['Joined Priya\'s project group', 'Joined the chaotic Rahul–Kabir project group', 'Went solo on the course project'][c]);
  },

  async projectMeeting() {
    const g = S.project.group || 'solo';
    if (Tasks.get('project').status !== 'open') { await say('priya', 'Next meeting: after Thomso. If we survive.', 'normal'); return; }
    if (Act.tooTired()) return;
    const p = PL(), seat = MAPS.library.seats[0];
    await walk(p, [[seat[0], seat[1] - 14], [seat[0], seat[1]]], 70); p.dir = 'down'; p.pose = 'read';
    if (g === 'priya') await say('priya', 'Agenda: one, divide work. Two, follow Gantt chart. Three, no reels.', 'normal');
    else if (g === 'fun') await say('rahul', 'Agenda: one, samosa. Two, decide the project. Three, maybe another samosa.', 'happy');
    else await say('me', 'Solo meeting. Motion to work: passed unanimously.', 'normal');
    await UI.timeSkip('Project meeting...', 90, 'write');
    const gain = g === 'priya' ? 34 : g === 'fun' ? 22 : 26;
    S.project.score = clamp(S.project.score + gain, 0, 100);
    floatTxt(`+${gain} Project`, '#7fb8ff');
    stat({ energy: -8, social: g === 'solo' ? 0 : 4, acad: 2 });
    if (g === 'fun') { rel('rahul', 4); rel('kabir', 4); memory('A project meeting that was 70% samosa'); }
    if (g === 'priya') rel('priya', 6);
    Tasks.done('project');
    p.pose = 'stand'; p.y = seat[1] - 14;
  },

  /* ================= QUIZ / EXAMS ================= */
  async quiz(i) {
    const p = PL(), c = Sched.cls(i);
    S.lec[Sched.key(i)] = 'attended';
    AU.play('tense');
    await walk(p, [[394, 238], [208, 238], [208, 158], [156, 158], [156, 166]], 80);
    p.pose = 'sit'; p.dir = 'up';
    const prof = A('prof') || spawn({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: 208, y: 54, dir: 'down', solid: false });
    G.camTarget = { x: 208, y: 130 };
    if (S.time < c.start) await UI.timeSkip('Waiting for the quiz to begin...', c.start - S.time, 'tick');
    const late = Math.max(0, S.time - c.start);
    if (late > 3) await say('prof', `${late} minutes late to a 30-minute quiz. Bold. Very easy to lose marks.`, 'sus');
    if (hasTag('surprise')) {
      await say('prof', Rng.pick(['Surprise! A quiz. You look surprised. Good. That is the point of a surprise.', 'Good morning. Close your notebooks. Open your fear. Quiz.', 'Some of you went to Pronite. Today we find out if Pronite went to you.']));
      for (const cm of CLASSMATES) { const a = A(cm.id); if (a) emote(a, pick(['!!', 'sweat', '!']), 1.6); }
      AU.sfx('crash');
      await say({ name: 'Kunal', look: studentLook(305) }, Rng.pick(['Sir, ye syllabus mein tha?', 'Sir, mera pen Thomso mein kho gaya.', 'Sir, surprise toh birthday pe hota hai...']));
      await say('prof', 'Everything is in the syllabus. 20 marks. 30 minutes. It is very easy.');
    } else {
      await say('prof', 'Quiz time. 20 marks. 30 minutes. Phones in bags. Bags in another dimension.');
      await say('prof', 'It is very easy.');
    }
    S.counters.veryEasy++;
    G.papers = [];
    await walk(prof, [[208, 88]], 70);
    for (const row of [0, 1, 2, 3]) {
      const y = MAPS.lecture.rows[row];
      await walk(prof, [[208, y - 22]], 80);
      for (let k = 0; k < 8; k++) G.papers.push({ x: MAPS.lecture.seatXs[k], y });
      AU.sfx('whoosh'); await wait(0.25);
    }
    await walk(prof, [[208, 88], [208, 54]], 80); face(prof, 'down');
    for (const a of G.actors) if (a.pose === 'sit') a.pose = 'write';
    p.pose = 'write'; p.sweat = S.stats.energy < 40;
    for (let k = 0; k < 4; k++) { const a = A(pick(CLASSMATES).id); if (a) emote(a, pick(['?', 'sweat', '...', '!']), 1.4); AU.sfx('write'); await wait(0.5); }
    const ch = await ask('me', 'Question 3: "Prove the obvious." Your pen hovers. Chirag\'s paper is RIGHT there.', ['Glance at Chirag\'s paper.', 'Trust your own brain.', 'Write "refer to textbook".']);
    let bonus = S.quizBonus || 0;
    if (ch === 0) { emote(p, '...', 1.2); await wait(1); await say('sys', 'Chirag has drawn a flower and written "I believe in myself". Inspiring. Useless.'); if (chance(0.5)) { prof.expr = 'sus'; await say('prof', `${S.name}. Eyes on your own paper. Very easy instruction.`, 'sus'); prof.expr = 'normal'; bonus -= 4; } else bonus -= 2; logd('Tried to copy from Chirag in Quiz 1'); }
    else if (ch === 1) bonus += 2; else S.flags.referTextbook = true;
    await walk(prof, [[208, 120], [208, 190], [208, 88], [208, 54]], 40);
    face(prof, 'down');
    AU.sfx('bell');
    await say('prof', 'Pens down! PENS. DOWN. Chirag, that is a pencil. Also down.');
    const raw = S.stats.acad * 0.6 + (S.prep.sig || 0) * 0.15 + S.stats.energy * 0.25 + bonus + (S.flags.profFavor ? 5 : 0) + Rng.int(-6, 6) - (S.flags.cocky ? 3 : 0) - late - (S.fatigue || 0) * 4;
    const score = clamp(Math.round(raw / 5), 0, 20);
    S.quiz = score; p.sweat = false;
    const comments = score >= 16 ? ['Excellent. Very easy, as I said.', 'A+'] : score >= 12 ? ['Good. Not great. Good.', 'B+'] : score >= 8 ? [S.flags.referTextbook ? 'Hmm. "Refer to textbook" is not an answer.' : 'Average. Very average. Average is very easy.', 'C'] : ['Did you study, or did you "study"? See me after class.', 'D'];
    await UI.popup(`<div class="paper"><div class="ph">SURPRISE QUIZ · SIG-201 SIGNALS & SYSTEMS</div><div class="pn">Name: <u>${esc(S.name)}</u></div><div class="score">${score}<small>/20</small></div><div class="grade">${comments[1]}</div><div class="pc">"${comments[0]}" — R.K.S.</div></div>`, 'Collect paper', 'paperpop');
    stat({ acad: Math.round((score - 10) / 2), energy: -6 });
    logd(`Scored ${score}/20 in the surprise quiz`);
    Tasks.done('cls' + i);
    for (const a of G.actors) if (a.pose === 'write') a.pose = 'sit';
    await fadeOut(0.5);
    G.papers = []; setTime(Math.max(S.time, c.start + c.dur));
    G.camTarget = null;
    gotoMap('lecture', 208, 228, 'down');
    AU.play('day');
    await fadeIn(0.5);
    const r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: 230, y: 228, dir: 'left', expr: 'tired' });
    await say('rahul', score >= 12 ? `Kitne aaye? ${score}?! Traitor. You studied.` : `Kitne aaye? ${score}? Same pinch. Hum dono ek hi naav mein.`, score >= 12 ? 'shock' : 'happy');
    despawn('rahul');
    S.pendingSave = true;
  },
  async missQuiz(i) {
    S.lec[Sched.key(i)] = 'missed'; S.quiz = 0;
    Tasks.fail('cls' + i);
    UI.warn('You missed the quiz.', 'Zero marks. Sharma sir calls it "very easy".', 'urgent');
    await say('me', 'I missed the quiz. Sharma sir has awarded me a very easy zero.', 'shock');
    stat({ acad: -6 });
    logd('Missed the surprise 8 AM quiz');
  },

  async exam(i, pen) {
    const p = PL(), c = Sched.cls(i), kind = c.type;
    if (kind === 'endsem' && S.stats.att < ATT_RULES.endsemMin) return this.debarred('endsem');
    S.lec[Sched.key(i)] = 'attended';
    AU.play('tense');
    await walk(p, [[394, 238], [208, 238], [208, 158], [156, 158], [156, 166]], 80);
    p.pose = 'sit'; p.dir = 'up';
    const pid = c.course === 'ALL' ? 'sharma' : COURSES[c.course].prof;
    const prof = A('prof') || spawn({ id: 'prof', name: PROFS[pid].name, look: profLook(pid), x: 208, y: 54, dir: 'down', solid: false });
    G.camTarget = { x: 208, y: 130 };
    if (S.time < c.start) await UI.timeSkip('Waiting outside the exam hall...', c.start - S.time, 'tick');
    const late = Math.max(0, S.time - c.start) + (pen || 0);
    if (kind === 'mte') await say(pid, pid === 'sharma' ? 'Mid-term examination. Two hours. Five questions. All very easy.' : 'Mid-term. Two hours. Every answer trivially follows from the previous one. So does every mistake.');
    else await say(pid, 'Final examination. One question. It has fourteen parts. Each part has sub-parts. It is very, very easy.');
    if (pid === 'sharma') S.counters.veryEasy++; else S.counters.trivially++;
    for (const cm of CLASSMATES) { const a = A(cm.id); if (a) emote(a, pick(['!!', 'sweat', '...']), 2); }
    await walk(prof, [[208, 88]], 70);
    for (const row of [0, 1, 2, 3]) { const y = MAPS.lecture.rows[row]; await walk(prof, [[208, y - 22]], 90); for (let k = 0; k < 8; k++) G.papers.push({ x: MAPS.lecture.seatXs[k], y }); AU.sfx('whoosh'); await wait(0.2); }
    await walk(prof, [[208, 88], [208, 54]], 90); face(prof, 'down');
    for (const a of G.actors) if (a.pose === 'sit') a.pose = 'write';
    p.pose = 'write'; p.sweat = true;
    if (S.fatigue) { emote(p, 'z', 1.6); await say('me', 'The letters are swimming. Last night is collecting its debt.', 'tired'); }
    const ch = await ask('me', kind === 'mte' ? 'Question 1 looks familiar. Question 2 looks like it hates you.' : 'Three hours. Your entire semester flashes before your eyes.', ['Write everything you know.', 'Write everything you DON\'T know (longer).', 'Draw a diagram. Any diagram. Confidently.']);
    let bonus = (kind === 'endsem' ? S.examBonus || 0 : 0);
    if (ch === 0) bonus += 2; else if (ch === 1) bonus -= 1; else bonus += chance(0.5) ? 4 : -3;
    await UI.timeSkip(kind === 'mte' ? 'Writing the MTE...' : 'Writing the Final...', Math.max(30, c.start + c.dur - S.time), 'write');
    AU.sfx('bell');
    await say(pid, 'Time! Pens down. Pens. Down. Rahul, you cannot "just finish the sentence" for 10 minutes.');
    p.sweat = false;
    for (const a of G.actors) if (a.pose === 'write') a.pose = 'sit';
    const fat = (S.fatigue || 0) * 6;
    if (kind === 'mte') {
      const sub = COURSES[c.course].subject;
      const raw = (S.prep[sub] || 0) * 0.5 + S.stats.acad * 0.28 + S.stats.energy * 0.14 - fat + bonus + rand(-4, 4) - late * 0.4;
      const marks = clamp(Math.round(raw * 0.3), 0, 30);
      S.mte[sub] = marks;
      const g = marks >= 24 ? 'A' : marks >= 18 ? 'B' : marks >= 12 ? 'C' : 'D';
      await UI.popup(`<div class="paper"><div class="ph">MID-TERM EXAM · ${esc(COURSES[c.course].code)} ${esc(COURSES[c.course].name.toUpperCase())}</div><div class="pn">Name: <u>${esc(S.name)}</u> · Prep: ${Math.round(S.prep[sub] || 0)}%</div><div class="score">${marks}<small>/30</small></div><div class="grade">${g}</div><div class="pc">"${marks >= 20 ? (pid === 'sharma' ? 'Very easy, as predicted.' : 'Your understanding trivially follows.') : marks >= 12 ? 'Acceptable. Barely. Sleep more, panic less.' : 'We need to talk. Over chai. Bring a notebook.'}" — ${pid === 'sharma' ? 'R.K.S.' : 'M.I.'}</div></div>`, 'Breathe out', 'paperpop');
      logd(`MTE ${COURSES[c.course].code}: ${marks}/30`);
      Tasks.done('cls' + i);
      await fadeOut(0.5);
      G.papers = []; setTime(Math.max(S.time, c.start + c.dur));
      G.camTarget = null; gotoMap('lecture', 208, 228, 'down'); AU.play('day');
      await fadeIn(0.5);
      S.pendingSave = true;
      return;
    }
    const prepAvg = ((S.prep.sig || 0) + (S.prep.mth || 0)) / 2;
    const raw = prepAvg * 0.35 + S.stats.acad * 0.3 + S.stats.att * 0.1 + S.stats.energy * 0.1 + (S.quiz || 0) * 0.75 + bonus + (S.flags.profFavor ? 4 : 0) - fat + Rng.int(-5, 5) - late * 0.3;
    S.exam = clamp(Math.round(raw), 0, 100);
    await wait(0.5);
    await fadeOut(1.2);
    await this.wrapped();
  },
  /* silently record anything the day's clock skipped past (sleep, cutscenes) */
  resolveMissed() {
    DAY().classes.forEach((c, i) => {
      if (Sched.rec(i)) return;
      const key = Sched.key(i);
      if (c.type === 'lecture') { Att.record(key, 'missed', 0); S.skippedClasses++; }
      else { S.lec[key] = 'missed'; if (c.type === 'quiz') S.quiz = 0; if (c.type === 'mte') S.mte[COURSES[c.course].subject] = 0; }
      Tasks.fail('cls' + i);
    });
  },
  async missExam(i) {
    const c = Sched.cls(i);
    S.lec[Sched.key(i)] = 'missed';
    Tasks.fail('cls' + i);
    if (c.type === 'mte') {
      S.mte[COURSES[c.course].subject] = 0;
      UI.warn('You missed the MTE.', `${COURSES[c.course].name} · zero marks`, 'urgent');
      await say('me', `I... missed the ${COURSES[c.course].code} mid-term. Completely. That's a zero out of thirty.`, 'shock');
      stat({ acad: -12 });
      logd(`Missed the ${COURSES[c.course].code} MTE entirely`);
      return;
    }
    UI.warn('You missed the Final exam.', 'There is no re-test in this game.', 'urgent');
    await say('me', 'The final... is over. I wasn\'t there.', 'shock');
    S.exam = 0; S.flags.missedEndsem = true;
    logd('Missed the Final exam');
    await fadeOut(1.2);
    await this.wrapped();
  },
  async lateExam(i) {
    const c = Sched.cls(i);
    S.flags.lateExam = true;
    await say('me', `THE EXAM STARTED AT ${fmtTime(c.start)}! It's ${fmtTime(S.time)}!`, 'shock');
    await say('sys', 'You sprint across campus in your pyjamas. Three people take photos.');
    stat({ social: 3 });
    logd(`Ran to ${c.type === 'mte' ? 'an MTE' : 'the Final'} in pyjamas`);
    await fadeOut(0.3);
    const late = S.time - c.start;
    G.player.x = 394; G.player.y = 238;
    gotoMap('lecture', 394, 238, 'up');
    await fadeIn(0.3);
    await say(c.course === 'MTH' ? 'iyer' : 'prof', `${S.name}. You have... the time remaining. Which is very little. Sit.`, 'sus');
    await this.exam(i, Math.min(40, late));
  },

  /* ================= SOCIAL EVENTS (from the original week) ================= */
  async rahulBorrow() {
    S.flags.borrowAsked = true;
    const p = PL();
    let r = A('rahul');
    if (!r) r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: 152, y: 112, dir: 'down', talk: () => this.rahulGeneric() });
    r.pose = 'stand'; r.solid = true;
    await walk(r, [[r.x, 150], [p.x + 16, p.y - 4]], 80); faceTo(r, p); faceTo(p, r);
    r.expr = 'happy';
    const st0 = S.proxyReq['0-0'];
    const prior = st0 === 'done' ? 'Mere proxy king!' : st0 === 'refused' ? 'Haan haan, wahi dost jisne proxy nahi lagayi.' : 'Bhai!';
    await say('rahul', `${prior} Ek chhota sa favour...`, 'happy');
    await say('rahul', 'Thomso pass lena hai. Thode paise udhaar de de. Thursday tak pakka lauta dunga.', 'normal');
    await say('rahul', 'Pinky promise. Mummy promise. Wi-Fi password promise.', 'happy');
    const c = await ask('rahul', 'Bol na?', [{ t: 'Here, take it.', hint: '-15 Money', dis: S.stats.money < 15 }, { t: 'Half de sakta hoon.', hint: '-8 Money', dis: S.stats.money < 8 }, 'Bhai main khud udhaar pe zinda hoon.']);
    if (c === 0) { stat({ money: -15 }); S.flags.lent = 15; rel('rahul', 15); trust(10); emote(r, 'heart'); await say('rahul', 'Tu asli dost hai! Thursday ko interest ke saath. Interest = samosa.', 'happy'); logd('Lent Rahul money for a Thomso pass'); }
    else if (c === 1) { stat({ money: -8 }); S.flags.lent = 8; rel('rahul', 6); trust(4); await say('rahul', 'Aadha dil, aadha paisa. Chalega. Thursday pakka.', 'normal'); logd('Lent Rahul half the money'); }
    else { rel('rahul', -8); r.expr = 'angry'; await say('rahul', 'Theek hai. Mera dil bhi tod de, mera Thomso bhi.', 'angry'); r.expr = 'normal'; logd('Refused to lend Rahul money'); }
    walk(r, [[r.x, 150], [176, 210]], 70).then(() => despawn('rahul'));
  },
  async rahulRepay() {
    S.flags.repaid = true;
    const r = A('rahul') || spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: 152, y: 120, dir: 'down' });
    r.pose = 'stand';
    await walk(r, [[r.x, 150], [PL().x + 16, PL().y - 4]], 80); faceTo(r, PL()); faceTo(PL(), r);
    if (S.rel.rahul >= 35) {
      r.expr = 'happy';
      await say('rahul', 'Told you Thursday! Paise wapas. Plus interest. Interest = ek samosa.', 'happy');
      stat({ money: S.flags.lent + 3, energy: 4 }); S.counters.samosa++; rel('rahul', 5); trust(5);
      logd('Rahul actually repaid you (with a samosa)');
    } else {
      await say('rahul', 'Bhai... paise... "5 minute mein" de dunga. Promise. Kal pakka.', 'tired');
      S.flags.repaid = false; S.flags.repayLater = true;
    }
    walk(r, [[r.x, 150], [176, 210]], 70).then(() => despawn('rahul'));
  },
  async rahulHelp() {
    S.flags.helpAsked = true;
    const p = PL();
    let r = A('rahul');
    if (!r) r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: p.x - 60, y: p.y, dir: 'right' });
    r.expr = 'shock';
    await walk(r, [[p.x - 16, p.y]], 110); faceTo(r, p); faceTo(p, r);
    emote(r, 'sweat', 3);
    await say('rahul', 'BHAI. EMERGENCY. Mera laptop crash ho gaya. Assignment ki file... gayi.', 'shock');
    await say('rahul', 'Bas 2 ghante help kar de. Please. Main tera hamesha ehsaanmand rahunga.', 'tired');
    const c = await ask('me', `Your assignment is at ${S.assignment}%. The deadline doesn't care about friendship.`, ['Help him. (2 hours)', 'Sorry bro, I\'m drowning too.']);
    if (c === 0) {
      await fadeOut(0.4);
      gotoMap('canteen', 126, 176, 'down');
      PL().pose = 'type';
      spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: 152, y: 176, dir: 'down', pose: 'sit', solid: false });
      await fadeIn(0.4);
      await UI.timeSkip('Rescuing Rahul\'s assignment...', 120, 'type');
      PL().pose = 'stand';
      stat({ energy: -10, social: 6 });
      rel('rahul', 20); trust(12); S.flags.helpedRahul = true;
      if (S.flags.lent && !S.flags.repaid) { stat({ money: S.flags.lent }); S.flags.repaid = true; await say('rahul', 'Aur ye le, tere paise. Pura. Main itna bhi bura dost nahi hoon.', 'happy'); }
      await say('rahul', 'Tu asli dost hai. Final ke liye mere notes le. ...Okay, they\'re Priya\'s notes. Maine photo li thi.', 'happy');
      S.examBonus = (S.examBonus || 0) + 5;
      memory('Saving Rahul\'s assignment on deadline day');
      logd('Gave up 2 hours on deadline day to save Rahul\'s assignment');
      despawn('rahul');
    } else {
      rel('rahul', -10);
      await say('rahul', 'Samajh sakta hoon. Main... Kabir ko pakadta hoon. Ya Google ko.', 'tired');
      walk(r, [[r.x - 80, r.y]], 100).then(() => despawn('rahul'));
      logd('Refused to help Rahul on deadline day');
    }
  },
  async deadlineCrunch() {
    S.flags.crunch = true;
    const p = PL();
    AU.play('tense');
    UI.warn('Submission closes in 19 minutes!', 'Assignment 1', 'urgent');
    if (G.map.id !== 'hostel') {
      await say('me', '11:40 PM?! THE ASSIGNMENT!', 'shock');
      await fadeOut(0.3);
      gotoMap('hostel', MAPS.hostel.seats.player.x, MAPS.hostel.seats.player.y, 'up');
      await fadeIn(0.3);
    } else await walk(p, [[MAPS.hostel.seats.player.x, MAPS.hostel.seats.player.y]], 110);
    p.dir = 'up'; p.pose = 'type'; p.sweat = true; G.laptopOn = true;
    for (let k = 0; k < 4; k++) { AU.sfx('type'); emote(p, k % 2 ? '!!' : 'sweat', 0.8); await wait(0.6); }
    S.assignment = clamp(S.assignment + 12, 0, 100);
    await this.submitFlow(true);
  },
  async submitFlow(crunch) {
    const p = PL();
    p.dir = 'up'; p.pose = 'type'; G.laptopOn = true;
    const k = A('kabir');
    await say('sys', 'Uploading... 12%... 47%... 89%...');
    if (crunch) {
      AU.sfx('down'); shake(3);
      await say('sys', 'Wi-Fi disconnected.');
      if (k && S.rel.kabir >= 15) { emote(k, '!'); await say('kabir', 'HOTSPOT! Le, mera hotspot! GO GO GO!', 'shock'); rel('kabir', 5); }
      else { await say('me', 'No Wi-Fi. No hotspot. You climb onto the water tank for one bar of signal.', 'shock'); stat({ energy: -5 }); }
      await say('sys', '99%...... Submitted at 11:59:58 PM.');
      S.flags.submitTime = '11:59:58 PM';
      memory('Submitting at 11:59:58 PM');
    } else S.flags.submitTime = fmtTime(S.time);
    AU.sfx('fanfare');
    S.flags.submitted = true;
    const raw = S.assignment * 0.62 + S.stats.acad * 0.26 + S.stats.energy * 0.12 + rand(-4, 4);
    S.assignScore = clamp(Math.round(raw), 0, 100);
    p.pose = 'cheer'; p.sweat = false; p.expr = 'happy';
    await UI.popup(`<div class="paper"><div class="ph">COURSE PORTAL · SUBMISSION RECEIPT</div><div class="pn">SIG-201 · Assignment 1</div><div class="score small">${S.flags.submitTime}</div><div class="pc">Completion: <b>${S.assignment}%</b>${S.assignment < 40 ? ' (3 pages + a sincere apology)' : S.assignment >= 100 ? ' (actually complete?!)' : ''}<br>Grade appears in your semester results.</div></div>`, 'Breathe', 'paperpop');
    p.pose = 'stand'; p.expr = 'normal'; G.laptopOn = false;
    Tasks.done('submit');
    logd(`Submitted Assignment 1 at ${S.flags.submitTime} (${S.assignment}% done)`);
    if (crunch) AU.play('night');
    S.pendingSave = true;
  },
  async priyaNotes() {
    const pr = A('priya');
    if (S.flags.notesP) { await say('priya', 'Read the yellow highlights. Yellow = definitely coming.', 'normal'); return; }
    if (S.rel.priya >= 18 && S.friendTrust >= 25) {
      S.flags.notesP = true; pr.expr = 'happy';
      await say('priya', 'Notes? Here. Colour-coded. Don\'t fold the pages. Don\'t breathe on them.', 'happy');
      floatTxt('+ Priya\'s notes (quiz boost)', '#7fb8ff'); stat({ acad: 4 }); rel('priya', 4); S.quizBonus = (S.quizBonus || 0) + 10;
      logd('Borrowed Priya\'s colour-coded notes');
    } else {
      await say('priya', `Notes? ${S.name}, we never once studied together. I lend notes to people I know.`, 'normal');
      await say('priya', 'Good luck though. Genuinely.', 'normal');
    }
  },
  async rahulNotes() {
    if (S.flags.notesR) { await say('rahul', 'Bhai the cat is very important. Trust me.', 'tired'); return; }
    S.flags.notesR = true;
    if (S.rel.rahul >= 30) { await say('rahul', 'Mere notes le le. Ek formula aur ek billi ki drawing. Both are important.', 'tired'); S.quizBonus = (S.quizBonus || 0) + 3; floatTxt('+ Rahul\'s notes (1 formula, 1 cat)', '#ffb067'); }
    else await say('rahul', 'Notes? Bhai main khud tujhse maangne aaya tha.', 'tired');
  },
  async rahulGeneric() {
    const lines = S.hc && S.hc.results.includes('won') ? ['Headcount mein tu wahan tha?! Bhai tu Flash hai.', 'Sir ne count kiya aur tu wahan tha. Legend. Main bhi aisa banna chahta hoon.'] : S.flags.caught ? ['Bhai... Sharma sir ne mujhe dekh ke "Hello, Rahul" bola. With a smile. I\'m scared.', 'We\'re famous now. Infamous. Same thing.'] :
      S.proxyCount > 1 ? ['Proxy king! Tu legend hai.', 'Bhai tera deep voice viral hai group mein.'] :
      ['5 minute mein aa raha hoon. Matlab... main yahin hoon. Habit hai.', 'Samosa kha. Life ka purpose samajh aayega.', 'Kal se padhai. Pakka. Pinky promise.', 'NSO mein mujhe shuttle se darr lagta hai. Woh fast aata hai.'];
    await say('rahul', Bag('rahulGen' + lines.length, lines), 'happy');
    if (S.flags.samosaDeal && S.proxyReq['0-0'] === 'done' && !S.flags.samosaPaid) {
      S.flags.samosaPaid = true;
      await say('rahul', 'Aur ye le, promise kiya tha. Do samose. Proxy fees.', 'happy');
      S.counters.samosa += 2; stat({ energy: 8 });
    }
  },
  async priyaLibrary() {
    const pr = A('priya');
    const mte = DAY().phase === 'mte' || DAY().phase === 'endprep';
    const c = await ask('priya', mte ? 'Exam mode. I have three highlighters and zero chill. Join me?' : pick([`${S.name}? In the library? Voluntarily? Should I call someone?`, 'Hi. I\'m on chapter 6. Of the reference book. For fun.', 'Shh. I\'m building a timetable for my timetable.']), ['Study together (2h)', 'Just saying hi.']);
    if (c === 0) {
      if (Act.tooTired()) return;
      if (!(await Act.clashOK(120))) return;
      const p = PL(), seat = MAPS.library.seats[0];
      await walk(p, [[seat[0], seat[1] - 14], [seat[0], seat[1]]], 70); p.dir = 'down'; p.pose = 'read'; p.bookCol = '#2f8fd0';
      pr.pose = 'read';
      await UI.timeSkip('Studying with Priya...', 120, 'write');
      p.pose = 'stand';
      stat({ acad: 9, energy: -12, social: 3 }); rel('priya', 10); trust(5); S.counters.study++;
      const sub = (S.prep.sig || 0) <= (S.prep.mth || 0) ? 'sig' : 'mth';
      S.prep[sub] = clamp((S.prep[sub] || 0) + 8, 0, 100); floatTxt(`+8% ${SUBJECT_NAMES[sub]} prep`, '#7fb8ff');
      await say('priya', pick(['See? Not that bad. You only asked "is this in the syllabus" four times.', 'You\'re smarter than you pretend to be. Annoying, honestly.', 'Same time tomorrow? I\'ll bring highlighters. Many highlighters.']), 'happy');
      if (!S.flags.priyaStudyLogged) { S.flags.priyaStudyLogged = true; logd('Studied in the library with Priya'); }
    } else await say('priya', 'Hi. Bye. Chapter 7 is calling.', 'normal');
  },

  /* ================= THOMSO ================= */
  async priyaVolunteer() {
    const pr = A('priya');
    if (S.flags.volunteerDone) { await say('priya', 'The banner looks great. Thanks for helping, seriously.', 'happy'); return; }
    await say('priya', `${S.name}! Perfect timing. Thomso committee is short of hands. Banner, lights, chaos.`, 'normal');
    await say('priya', 'Volunteers get food coupons, a VIP Pronite pass, and my eternal respect. Mostly the pass.', 'happy');
    const c = await ask('priya', 'You in? (3 hours)', ['Count me in. Let\'s paint!', 'Can\'t, need to rest.', 'Main bas moral support dunga.']);
    if (c === 0) {
      if (Act.tooTired()) return;
      S.flags.volunteer = true; S.flags.volunteerDone = true;
      const p = PL();
      await walk(p, [[T(30) - 8, T(37) + 10]], 60); face(p, 'up'); p.pose = 'paint';
      pr.pose = 'paint'; face(pr, 'up');
      await UI.timeSkip('Painting the Thomso banner...', 180, 'write');
      p.pose = 'stand'; pr.pose = 'stand'; faceTo(pr, p); faceTo(p, pr);
      if (S.stats.energy < 30) await say('priya', 'It\'s... beautiful. Though you spelled it "THOSMO". We\'ll call it avant-garde.', 'happy');
      else await say('priya', 'Look at that! THOMSO, in all its glittery glory.', 'happy');
      stat({ energy: -14, social: 8, money: 10 });
      rel('priya', 15); trust(10);
      Tasks.done('volunteer');
      floatTxt('VIP Pronite Pass!', '#ffd23f');
      memory('Painting the Thomso banner with Priya');
      logd('Volunteered for Thomso');
    } else if (c === 1) { rel('priya', 2); await say('priya', 'Fair. Sleep is also a festival.', 'normal'); }
    else { stat({ social: 2 }); await say('priya', 'Moral support. Wow. Put that on your resume.', 'normal'); }
  },
  async meera() {
    const m = A('meera');
    m.pose = 'stand'; faceTo(m, PL());
    await say('meera', 'Oh, hi. Sorry, just practising for Pronite. Too loud?', 'normal');
    const c = await ask('me', 'She is the lead singer of the Thomso band. Your brain buffers.', ['"That song was really good."', '"Nice weather, na?" (it is 38°C)', 'Panic and walk away.']);
    S.flags.metMeera = true;
    if (c === 0) { m.expr = 'happy'; await say('meera', 'Aww, thanks! Come to Pronite. Front row, okay?', 'happy'); stat({ social: 8 }); S.flags.meeraVibe = 2; logd('Complimented Meera\'s song'); }
    else if (c === 1) { m.expr = 'happy'; await say('meera', 'Haha, 38 degrees of "nice". You\'re funny. I\'m Meera.', 'happy'); stat({ social: 5 }); S.flags.meeraVibe = 1; logd('Said "nice weather" at 38°C to Meera'); }
    else { await say('me', 'You turn around and walk directly into a pole. Smooth.', 'shock'); shake(3); AU.sfx('crash'); stat({ social: -2, energy: -2 }); S.flags.meeraVibe = 0; logd('Panicked in front of Meera'); }
    m.pose = 'guitar'; m.expr = 'normal';
  },
  async findCoupon() {
    S.flags.couponFound = true; AU.sfx('coin');
    await say('sys', 'You found a crumpled coupon: "FREE MAGGI. Valid during Thomso. Not valid for Rahul."');
    S.flags.coupon = true; floatTxt('Free Maggi coupon!', '#ffd23f');
    logd('Found a free Maggi coupon');
  },
  async findID() {
    S.flags.idFound = true; AU.sfx('pop');
    await say('sys', 'An ID card: "Dr. R.K. Sharma, Professor." The photo is from 1998. He had hair.');
    const c = await ask('me', 'What do you do with it?', ['Return it to Sharma sir.', 'Post it in the group chat. For the memes.']);
    if (c === 0) { S.flags.idKeep = 'return'; G.needRepop = true; UI.hint('Sharma sir walks near <b>{L:lecture}</b> in the afternoon.', 6); }
    else { S.flags.idKeep = 'meme'; S.flags.idReturned = true; stat({ social: 8 }); notify('Class Group', '87 people reacted with laughing faces to your post.'); logd('Posted the professor\'s 1998 ID photo in the group chat'); }
  },
  async returnID() {
    const pr = A('prof');
    if (S.flags.idKeep !== 'return' || S.flags.idReturned) { await say('prof', 'Yes? I am thinking about the final. It will be very easy.'); return; }
    S.flags.idReturned = true; S.flags.profFavor = true;
    await say('me', 'Sir, I found your ID card near the library.', 'normal');
    pr.expr = 'happy';
    await say('prof', 'My ID! I had to sign 14 forms to enter my own department. Thank you, beta.', 'happy');
    await say('prof', `I will remember this, ${S.name}. Gratitude is very easy.`, 'happy');
    stat({ social: 4 }); S.counters.veryEasy++;
    logd('Returned Sharma sir\'s lost ID card');
  },
  async danceOff() {
    if (S.flags.danced) { await say({ name: 'Wing B\'s Dancer', look: studentLook(905) }, 'Rematch next Thomso. I\'m practising in the mirror. Every night.'); return; }
    if (Act.tooTired()) return;
    const rival = { name: 'Wing B\'s Dancer', look: studentLook(905) };
    await say(rival, 'You. Me. Dance-off. Loser buys Maggi for the whole wing.', 'happy');
    const c = await ask('me', 'The crowd starts chanting. There is no backing out. (There is.)', ['Bring it on.', 'Back away slowly.']);
    if (c === 1) { await say(rival, 'Thought so. Wing A is all talk.', 'happy'); stat({ social: -2 }); return; }
    S.flags.danced = true;
    const res = await MG.run(DanceOff({ rival }));
    AU.play('fest');
    stat({ energy: -8, social: res.win ? 10 : 4 });
    addTime(30);
    if (res.win) { AU.sfx('cheer'); await say(rival, `${res.score} to ${res.rival}?! Okay okay. Maggi on me. ONE Maggi.`, 'shock'); memory('Winning the Thomso dance-off'); S.counters.danceWins = 1; }
    else await say(rival, `${res.rival} beats ${res.score}. Wing B rules. You owe us Maggi.`, 'happy');
    Tasks.done('danceoff');
    logd(res.win ? 'Won the Thomso dance-off' : 'Lost the Thomso dance-off (respectably)');
  },
  async photoBooth() {
    if (S.flags['photo' + S.day]) { await say({ name: 'Booth Volunteer', look: studentLook(172) }, 'One photo per person per day! Thomso rules. I made them.'); return; }
    S.flags['photo' + S.day] = true;
    AU.sfx('pop'); shake(1);
    const fr = [];
    if (S.rel.rahul >= 30) fr.push('rahul'); if (S.rel.priya >= 25) fr.push('priya'); if (S.rel.kabir >= 30) fr.push('kabir');
    await UI.popup(`<div class="polaroid"><canvas id="photo-cv" width="220" height="150"></canvas><div class="cap">Thomso · ${esc(S.name)}${fr.length ? ' & ' + fr.map((f) => CH[f].name).join(', ') : ' (solo, iconic)'}</div></div>`, 'Keep it', 'paperpop', () => drawPhoto(fr));
    memory(fr.length ? 'A Thomso photo with ' + fr.map((f) => CH[f].name).join(' & ') : 'A solo Thomso photo (iconic)');
    stat({ social: 3 });
    Tasks.done('side_photo');
  },
  async comedy() {
    if (S.flags.comedy) { await say({ name: 'Stand-up Comic', look: LOOKS.comedian }, 'Thank you, thank you. I\'m here till 9. Then I\'m at the canteen.'); return; }
    S.flags.comedy = true;
    const p = PL();
    await walk(p, [[T(30), T(33)]], 70); face(p, 'up');
    const cm = A('comic');
    G.camTarget = { x: T(30), y: T(30) };
    for (const j of ['Attendance at 74.9%. Not a student. A suspense thriller.', 'My professor says everything is "very easy". He also thinks Wi-Fi is a type of fish.', 'Mess food has three flavours: hot, cold, and "why".', 'Proxy is the only group project where everyone participates.']) {
      bubble(cm, j, 3); await wait(2.6);
      for (const a of G.actors) if (a.name === 'Audience') emote(a, 'haha', 1.2);
      AU.sfx('laugh'); emote(p, 'haha', 1); await wait(0.5);
    }
    await UI.timeSkip('Laughing at Thomso comedy night...', 75, 'laugh');
    stat({ social: 6, energy: -4 });
    memory('Comedy night at Thomso');
    Tasks.done('comedy');
    G.camTarget = null;
  },
  async concert() {
    if (S.flags.concert) return;
    S.flags.concert = true;
    const p = PL();
    if (!S.flags.volunteer) {
      if (S.stats.money < 10) { await say('guard', 'Pronite pass 10 rupees. No pass? No Pronite. Bas.'); S.flags.concert = false; return; }
      stat({ money: -10 });
    } else await say('sys', 'You flash your VIP pass. The volunteer at the gate salutes you.');
    AU.play('fest'); G.stageLights = true;
    await walk(p, [[T(30), T(33) + 4]], 70); face(p, 'up');
    G.camTarget = { x: T(30), y: T(30) };
    const m = A('meera');
    if (m) { bubble(m, 'Hello THOMSO!!', 2); AU.sfx('cheer'); await wait(1.8); }
    p.pose = 'dance';
    for (const a of G.actors) if (a.name === 'Fan') emote(a, pick(['note', 'heart', '!!']), 2);
    if (S.flags.metMeera && m) {
      await wait(0.6);
      bubble(m, S.flags.meeraVibe === 1 ? 'This one\'s for the person who said "nice weather" at 38 degrees!' : S.flags.meeraVibe === 2 ? `This one\'s for ${S.name}, who liked my song!` : 'This one\'s for the person who walked into a pole!', 3.2);
      await wait(2.8); emote(p, '!!', 1.6); AU.sfx('cheer'); stat({ social: 5 });
    }
    await UI.timeSkip('Dancing at Pronite...', Math.max(60, sec(24, 30) - S.time), 'cheer');
    p.pose = 'stand';
    stat({ social: 12, energy: -16 });
    memory('Pronite on the Main Stage');
    Tasks.done('pronite');
    logd('Danced at Thomso Pronite');
    G.stageLights = false; G.camTarget = null;
    const r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: p.x + 40, y: p.y + 10, dir: 'left', expr: 'happy' });
    await walk(r, [[p.x + 16, p.y]], 80); faceTo(p, r);
    await say('rahul', 'BHAI! What a night! Thomso isn\'t over. Night canteen? Or we explore the whole fest till sunrise!', 'happy');
    const nd = DAY(S.day + 1), nc = nd.classes.find((x) => !(x.type === 'quiz' && nd.tags.includes('surprise'))); // don't spoil the surprise
    const c = await ask('me', `It's past midnight. ${nc ? 'Class tomorrow at ' + fmtTime(nc.start) + '.' : 'Big day tomorrow.'}`, ['Night canteen after-party', 'Thomso all-nighter: explore till sunrise', 'Go back and sleep']);
    if (c === 0) return this.afterParty();
    if (c === 1) return this.thomsoNight();
    await say('rahul', 'Boring! ...Theek hai. Goodnight, legend.', 'normal');
    walk(r, [[T(41), T(35)]], 80).then(() => despawn('rahul'));
    UI.hint('Head back to <b>{L:hostel}</b> and sleep.', 5);
  },
  async afterParty() {
    await fadeOut(0.6);
    gotoMap('canteen', 126, 176, 'down');
    const p = PL(); p.pose = 'eat';
    const tb = MAPS.canteen.tables[3];
    spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: tb[0] + 40, y: tb[1] - 12, dir: 'down', pose: 'eat', solid: false });
    spawn({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: tb[0] + 12, y: tb[1] - 12, dir: 'down', pose: 'sit', solid: false });
    for (const a of G.actors) if (a.chatter) a.visible = false;
    setTime(Math.max(S.time, sec(25)));
    G.camTarget = { x: 130, y: 160 };
    await fadeIn(0.6);
    await say('bhaiya', 'Raat ke 1 baje. Sirf Maggi. Bas Maggi. Hamesha Maggi.');
    await say('kabir', 'Bro. What if we\'re all just NPCs in someone\'s game?', 'normal');
    await say('rahul', 'Then whoever is playing, please give me attendance.', 'happy');
    await say('kabir', 'And if they\'re playing, why did they choose THIS life? Surprise quizzes? NSO at 5:30?', 'normal');
    await say('rahul', `Because ${S.name} has questionable taste.`, 'happy');
    emote(A('rahul'), 'haha'); emote(A('kabir'), 'haha'); AU.sfx('laugh');
    const c = await ask('me', 'Late-night canteen philosophy reaches its peak.', ['"Guys. Real talk. You\'re good friends."', '"I have class in 7 hours. I\'m going to cry."', '"Let\'s order another Maggi."']);
    if (c === 0) { rel('rahul', 10); rel('kabir', 10); trust(10); await say('rahul', 'Bhai... emotional mat kar. ...Tu bhi.', 'happy'); logd('Got emotional at the 1 AM canteen'); }
    else if (c === 1) { await say('kabir', 'Crying is just your eyes doing revision.', 'normal'); stat({ social: 3 }); }
    else { S.counters.maggi++; stat({ money: -5, energy: 4 }); await say('bhaiya', 'Ek aur Maggi! Ye bachche kabhi sote nahi kya?'); }
    S.counters.maggi++;
    await UI.timeSkip('Night canteen gossip...', 120, 'laugh');
    stat({ social: 8, energy: -18 });
    memory('1 AM Maggi philosophy with Rahul & Kabir');
    logd('Went to the night canteen after-party');
    await Game.sleepNight(S.time, null, { noDisturb: true });
  },
  async thomsoNight() {
    // Thomso all-nighter: an exploration loop until sunrise
    S.allNighters++; S.flags.thomsoNight = true;
    const p = PL(), r = A('rahul');
    await say('rahul', 'YESSS. Plan: food street, ground, chai, sunrise. No sleep. Only memories.', 'happy');
    const stops = [
      { t: sec(25, 30), x: T(23), y: T(34), title: 'Food street, 1:30 AM', text: 'Momos, chaat, and a stall selling "Thomso Special Maggi" (regular Maggi, extra price).', opts: ['Share a plate with Rahul', 'Buy one for the security guard too'], fx: [{ social: 4, money: -6, energy: 6 }, { social: 6, money: -10, energy: 4 }], mem: 'Midnight momos at Thomso' },
      { t: sec(27), x: T(30), y: T(37), title: 'The empty Main Stage, 3 AM', text: 'You lie on the grass in front of the stage. Someone plays a guitar badly. It\'s perfect.', opts: ['Talk about the future', 'Count the stars (you get to 4)'], fx: [{ social: 6 }, { social: 3, energy: 3 }], mem: 'Stargazing on the Sports Ground at 3 AM' },
      { t: sec(29), x: T(56), y: T(21), title: 'Chai Tapri, 5 AM', text: 'The chai wala is just opening. "Thomso walo, sone ka time nahi mila?"', opts: ['Cutting chai for everyone', 'Ask him about his own college days'], fx: [{ social: 4, money: -4, energy: 6 }, { social: 6 }], mem: 'Sunrise chai after Thomso' },
    ];
    for (const s of stops) {
      await fadeOut(0.5);
      setTime(s.t); gotoMap('campus', s.x, s.y, 'up');
      spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: s.x + 16, y: s.y, dir: 'left', expr: 'happy' });
      await fadeIn(0.5);
      UI.locToast(s.title);
      await say('sys', s.text);
      const c = await ask('me', 'What now?', s.opts);
      stat(s.fx[c]); memory(s.mem);
      if (s.t === sec(27)) rel('rahul', 6);
      await UI.timeSkip('Wandering Thomso...', 60, 'cheer');
    }
    stat({ energy: -26 });
    S.fatigue = 2;
    logd('Pulled a Thomso all-nighter (food street → stage → sunrise chai)');
    await Game.morningAfterAllNighter();
  },

  /* ================= night / Kabir / failures ================= */
  async kabir() {
    const k = A('kabir'), d = S.day, t = S.time, sl = slotOf(t);
    const wasPose = k.pose;
    if (k.pose === 'sleep') { emote(k, 'z'); await say('kabir', 'Zzz... five more semesters... zzz', 'sleep'); return; }
    if (sl >= 2 && !S.seen['kabirNight' + d]) {
      S.seen['kabirNight' + d] = 1;
      if (k.pose === 'type') { k.pose = 'stand'; faceTo(k, PL()); }
      await say('kabir', Rng.pick(DLG.kabirNight[d] || DLG.kabirNight[0]), 'normal');
      const opts = [!S.flags.submitted && S.day <= ASSIGN_DUE_DAY ? 'Let\'s work on the assignment together.' : 'Let\'s revise together.', 'Deep talk about life.', 'Sleep. Future me ka problem.'];
      const c = await ask('kabir', 'Toh? Kya plan hai?', opts);
      if (c === 0) {
        if (Act.tooTired()) return;
        const p = PL();
        await walk(p, [[MAPS.hostel.seats.player.x, MAPS.hostel.seats.player.y]], 70); p.dir = 'up'; p.pose = 'type'; G.laptopOn = true;
        k.x = MAPS.hostel.seats.kabir.x; k.y = MAPS.hostel.seats.kabir.y; k.dir = 'up'; k.pose = 'type';
        await UI.timeSkip('Late-night session with Kabir...', 120, 'type');
        if (!S.flags.submitted && S.day <= ASSIGN_DUE_DAY) { const gain = 9 + Math.round(S.stats.energy / 10); S.assignment = clamp(S.assignment + gain, 0, 100); floatTxt(`+${gain}% Assignment`, '#7fb8ff'); }
        else { S.prep.sig = clamp((S.prep.sig || 0) + 5, 0, 100); S.prep.mth = clamp((S.prep.mth || 0) + 5, 0, 100); floatTxt('+5% prep (both)', '#7fb8ff'); }
        stat({ energy: -10, acad: 3 }); rel('kabir', 8); trust(4); G.laptopOn = false;
        Tasks.done('night');
        await say('kabir', 'Productive! I fixed the font. You did... everything else.', 'happy');
      } else if (c === 1) {
        await say('kabir', 'Bro. What if attendance is just a social construct? Like money. Or Maggi\'s "2 minutes".', 'normal');
        await say('me', `Kabir. It's ${fmtTime(S.time)}. Why are you like this.`, 'tired');
        await say('kabir', 'Because nobody asks the real questions. Goodnight, philosopher.', 'happy');
        stat({ social: 6, energy: -6 }); rel('kabir', 10); trust(3);
        Tasks.done('night');
        if (!S.flags.deepTalk) { S.flags.deepTalk = true; memory('Deep talks with Kabir at midnight'); logd('Had a midnight deep talk with Kabir'); }
      } else await say('kabir', 'Wise. Future you is going to hate present you. Classic.', 'normal');
      k.pose = wasPose === 'type' ? 'type' : 'stand'; if (k.pose === 'type') k.dir = 'up';
      return;
    }
    await say('kabir', Bag('roommate', DLG.roommate), 'normal');
  },

  async forcedSleep() {
    const p = PL();
    p.pose = 'tired'; p.expr = 'tired'; emote(p, 'z', 2);
    await say('me', 'It\'s 2 AM. My body has filed a formal complaint.', 'tired');
    const c = await ask('me', 'Your eyelids weigh 40 kilos each.', ['Go to bed. Now.', 'Keep going (all-nighter)']);
    if (c === 1) { S.flags['stayUp' + S.day] = true; notify('Body', 'Fine. But tomorrow you will pay.'); p.expr = 'normal'; return; }
    S.flags.lateSleep = true;
    await fadeOut(0.6);
    gotoMap('hostel', MAPS.hostel.beds.player.x, MAPS.hostel.beds.player.y, 'down');
    PL().pose = 'sleep'; PL().expr = 'sleep';
    await Game.sleepNight(S.time, null, {});
  },

  async exhaustedStart() {
    const p = PL();
    p.pose = 'tired'; p.expr = 'tired'; emote(p, 'z', 2); AU.sfx('down'); shake(2);
    await say('me', 'I\'m... completely out of energy. My legs are buffering.', 'tired');
    UI.warn('EXHAUSTED', S.difficulty === 'relaxed' ? 'You move slowly and can\'t do strenuous things. Sleep or nap in your bed within 2 hours or you\'ll collapse.' : 'You move slowly and can\'t do strenuous things. Sleep or nap within 2 hours, or you will COLLAPSE (game over). Food helps a little.', 'urgent');
    S.counters.exhausted = (S.counters.exhausted || 0) + 1;
  },
  async collapse() {
    const p = PL();
    p.pose = 'faint'; AU.sfx('crash'); shake(4); emote(p, 'star', 2);
    S.counters.faints++;
    await wait(1.2);
    if (S.difficulty !== 'relaxed') {
      G.collapsing = false; G.mode = 'over';
      UI.gameOver('COLLAPSED', `You ran on zero energy for two hours and your body logged out. You wake up in the health centre with a drip and a lecture from the nurse.`, 'COLLAPSED');
      return;
    }
    await say('sys', 'You collapsed from exhaustion. Dramatically.');
    await fadeOut(0.8);
    gotoMap('hostel', MAPS.hostel.beds.player.x, MAPS.hostel.beds.player.y, 'down');
    p.pose = 'sleep'; p.expr = 'sleep';
    addTime(240);
    await fadeIn(0.8);
    await wait(0.6);
    p.pose = 'stand'; p.x = 46; p.y = 86; p.expr = 'tired';
    let k = A('kabir'); if (!k) k = spawn({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: 140, y: 110, dir: 'left' });
    faceTo(k, p);
    await say('kabir', 'Bhai tu library ki seedhiyon pe pada tha. Main tujhe utha ke laaya. Tu heavy hai.', 'normal');
    S.stats.energy = 30; UI.flashStat('energy', true); S.exhausted = false;
    rel('kabir', 5);
    logd('Collapsed from exhaustion. Kabir carried you home.');
    G.collapsing = false;
  },
  async debarred(why) {
    G.mode = 'over';
    if (why === 'endsem') await say('prof', `${S.name}. Your attendance is ${S.stats.att}%. The rule is ${ATT_RULES.endsemMin}%. You cannot write the Final.`, 'angry');
    else await say('prof', `${S.name}. Your attendance is ${S.stats.att}%. That is not attendance. That is a rumour.`, 'angry');
    UI.gameOver('DEBARRED', `Attendance: ${S.stats.att}%. ${why === 'endsem' ? 'Debarred from the Final.' : 'The Academic Office has questions.'} Your parents have been informed. Your cousin's success story is now twice as annoying.`, 'DEBARRED');
  },

  /* ================= DAY 1 · MESS FOOD ================= */
  async messFood() {
    S.flags.messFood = true;
    const p = PL();
    const [who, line] = Bag('mess', DLG.mess);
    await say(who, line);
    const c = await ask('me', 'Your first meal on campus. The thali stares back at you.', ['Eat it bravely', 'Ask what the sabzi actually is', 'Only eat the papad. Safe.']);
    if (c === 0) {
      const r = Rng.next();
      if (r < 0.55) { await say('me', 'It\'s... good? Unsettlingly good. I have questions.', 'happy'); stat({ energy: 10, social: 2 }); }
      else { p.expr = 'shock'; await say('me', 'The sabzi fought back. The sabzi won.', 'shock'); p.expr = 'normal'; stat({ energy: 4 }); }
      memory('Surviving the first mess meal');
    } else if (c === 1) {
      await say('bhaiya', Rng.pick(['Sabzi hai, beta. Bas sabzi. Uska naam mat poocho, uska kaam dekho.', 'Aloo hai. Ya lauki. Ya dono ka bachcha.', 'Recipe classified hai. Chef ne bhi nahi dekhi.']));
      stat({ social: 3, energy: 6 });
    } else { await say('me', 'Papad. Crunchy. Predictable. Like my future.', 'normal'); stat({ energy: 3 }); }
    this.mealHook();
    logd('Faced the Mystery Sabzi on Day 1');
  },
  mealHook() { if (typeof Act !== 'undefined') Act.mealDone(); },

  /* ================= DAY 2 · ICEBREAKING & CHAPO ================= */
  iceTick(t) {
    if (!hasTag('icebreak') || !S.ice) return false;
    const ice = S.ice, w = S.warn.ice || (S.warn.ice = {});
    const pl = locPos('plaza');
    if (ice.state === 'none') {
      const until = ICEBREAK.start - t;
      if (G.map.id !== 'campus' || dist(PL().x, PL().y, pl.x, pl.y) > 90) {
        const tr = Math.ceil(travelMin(routePx('plaza'), TIME.walk));
        if (until <= 15 && until > 5 && !w.w15) { w.w15 = 1; UI.warn('Icebreaking starts in 15 minutes.', `{L:plaza} · ${fmtTime(ICEBREAK.start)}`, 'info'); }
        if (until > 0 && until <= tr + TIME.bufferMin && !w.leave) { w.leave = 1; UI.warn('Leave now for icebreaking.', `Seniors at the {L:plaza} · about ${tr} min walk`, 'warn'); }
        if (t >= ICEBREAK.late && t < ICEBREAK.end && !w.late) { w.late = 1; UI.warn('You\'re running late for icebreaking!', 'The seniors have noticed. Get to the {L:plaza}.', 'urgent'); }
      }
      if (G.map.id === 'campus' && t >= ICEBREAK.start - 20 && t < ICEBREAK.end && dist(PL().x, PL().y, pl.x, pl.y) < 80) { runScript(() => this.icebreak()); return true; }
    }
    if (t >= ICEBREAK.end && (ice.state === 'challenge' || ice.state === 'returning')) {
      ice.state = 'done'; G.needRepop = true;
      notify('Hostel Gang', 'Vikram Bhaiya: Junior, kahan gaye? Chapo agli baar. (We ate it.)');
      logd('Wandered off mid-challenge. The seniors ate your Chapo.');
    }
    if (t >= ICEBREAK.end && ice.state === 'none') { ice.state = 'done'; ice.missed = true; G.needRepop = true; }
    return false;
  },
  async icebreak() {
    const ice = S.ice, p = PL();
    ice.state = 'intro'; ice.score = 0;
    const s1 = A('sen1'), s2 = A('sen2'), s3 = A('sen3');
    G.camTarget = { x: T(30) + 8, y: T(15) };
    for (const sn of [s1, s2, s3]) if (sn) faceTo(sn, p);
    await say(senior(0), Bag('seniorCall', DLG.seniorCall), 'happy');
    await walk(p, [[T(30) + 8, T(16) + 6]], 80); face(p, 'up');
    if (S.time > ICEBREAK.late) { await say(senior(2), `${fmtTime(S.time)}. Junior, IST matlab Indian Standard Time hota hai. Stretchable nahi.`, 'sus'); ice.score -= 1; }
    await say(senior(1), 'Relax, koi ragging nahi hai. Bas intro. Naam, hostel, aur ek interest.', 'happy');
    const c0 = await ask('me', 'Twenty freshers and three seniors are looking at you.', [`"I'm {P}, {L:hostel}. I like long walks to the canteen."`, `"{P}. {L:hostel}. Interests: Maggi, badminton, and avoiding 8 AMs."`, `"Um... {P}? ...I think?"`]);
    ice.score += [2, 2, 1][c0];
    await say(senior(c0 === 2 ? 2 : 0), Bag('react' + (c0 === 2 ? 'awk' : 'fun'), DLG.seniorReact[c0 === 2 ? 'awk' : 'fun']), 'happy');
    const qs = BagN('seniorQ', DLG.seniorQ, 3);
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i], si = i % 3;
      const opts = Rng.shuffle(q.a);
      const k = await ask(senior(si), q.q, opts.map((o) => o[0]));
      const tone = opts[k][1];
      const soc = S.stats.social;
      const pts = tone === 'fun' ? (soc >= 45 ? 2 : 1) : tone === 'conf' ? (soc >= 50 ? 2 : 1) : (soc < 40 ? 1 : 0);
      ice.score += pts;
      for (const a of G.actors) if (a.name === 'Fresher' && chance(0.6)) emote(a, tone === 'awk' ? '...' : 'haha', 1.2);
      if (tone !== 'awk') AU.sfx('laugh');
      await say(senior((si + 1) % 3), Bag('react' + tone, DLG.seniorReact[tone]), tone === 'awk' ? 'normal' : 'happy');
    }
    stat(ICEBREAK.introOnly);
    Tasks.done('icebreak');
    ice.introDone = true;
    logd(`Survived the icebreaking intro (vibe score ${ice.score})`);
    await say(senior(1), 'Okay, bonus round! Chapo challenge. See Tara near the {L:chai}? Fellow fresher, very chill.', 'happy');
    await say(senior(1), 'Go say hi, and ask — politely — if she\'s comfortable sharing her Insta. If she says no, that\'s a no: you say thanks and come back. Respect is part of the challenge.', 'normal');
    const c = await ask(senior(0), 'Toh? Chapo chahiye ya nahi?', ['Challenge accepted.', 'I\'ll politely pass. (no Chapo)']);
    if (c === 1) {
      ice.state = 'done'; ice.chapo = false;
      await say(senior(2), 'Safe player! Respect. Chapo agli baar, junior.', 'happy');
      stat({ social: 2 });
      logd('Politely passed on the Chapo challenge');
      G.camTarget = null; G.needRepop = true;
      return;
    }
    ice.state = 'challenge';
    G.camTarget = null;
    UI.hint('Walk to <b>Tara</b> near the <b>{L:chai}</b> and talk to her (<kbd>E</kbd>).', 6);
  },
  async iceTalk() {
    const ice = S.ice;
    if (ice.state === 'returning') return this.iceReturn();
    if (ice.state === 'challenge') { await say(senior(1), 'Tara is near the {L:chai}. Go! Chapo is getting cold. Chapo doesn\'t get cold. Go anyway.', 'happy'); return; }
    if (ice.state === 'none') return this.icebreak();
    await say(senior(Rng.int(0, 2)), Rng.pick(['Junior, hostel mein koi problem ho toh batana. Seriously.', 'Mess ki kheer try karna Sunday ko. Life badal jaayegi.', 'Proxy mat lagwana zyada. Sharma sir sab yaad rakhte hain.', 'Thomso mein volunteer karna. Free food, free trauma.']), 'happy');
  },
  async iceTara() {
    const ice = S.ice, t = A('tara'), p = PL();
    if (t) faceTo(t, p); faceTo(p, t);
    if (ice.state !== 'challenge') {
      await say(TARA(), ice.tara === 'agreed' ? 'Hi again! Go collect your Chapo, haha.' : Rng.pick(['Hey! Icebreaking was chaotic, right?', 'The seniors made me sing. I sang the Doordarshan tune. No regrets.']), 'happy');
      return;
    }
    const o = await ask('me', 'Tara is sketching the fountain. Your heart: 140 bpm.', ['"Hi! I\'m {P}. The seniors sent me on a mission, and I\'m choosing honesty."', '"Hey, is this the queue for momos? ...No? Hi anyway."', '"(wave) ...hello. ...nice... air today."']);
    let mood = [2, 1 + (S.stats.social >= 50 ? 1 : 0), 0][o];
    await say(TARA(), ['Haha, a mission? At least you\'re honest. Hi, I\'m Tara.', 'Momos are that way. But hi! I\'m Tara.', '...The air is nice, yes. Very... airy. I\'m Tara.'][o], 'happy');
    const ask2 = await ask('me', 'Here goes.', ['"Would you be comfortable sharing your Instagram ID? Totally fine if not."', '"Actually... never mind. Nice meeting you!"']);
    if (ask2 === 1) {
      await say(TARA(), 'Nice meeting you too!', 'happy');
      ice.tara = 'skipped'; ice.taraPts = 0;
    } else {
      const pAgree = clamp(0.32 + 0.14 * mood + (S.stats.social - 40) / 220, 0.1, 0.85);
      const r = Rng.next();
      if (r < pAgree) {
        await say(TARA(), 'Sure, it\'s @tara.doodles. Warning: it\'s 90% sketches of mess food.', 'happy');
        const lines = Rng.shuffle([
          ['charming', '"Then I\'ll follow for the art. The mess food can stay mysterious."'],
          ['awkward', '"Are you a Fourier series? Because... I don\'t understand you. Wait, that came out wrong."'],
          ['funny', '"Are you campus Wi-Fi? Because I feel a connection. A weak one, but still."'],
          ['confident', '"Following now. Fair warning: I comment on every post with \'very easy\'."'],
        ]);
        const k = await ask('me', 'Say something memorable. (Not creepy. Memorable.)', lines.map((l) => l[1]));
        const tone = lines[k][0];
        const react = { charming: ['Okay, that was smooth. Followed back.', 3], awkward: ['Hahaha. I\'ll pretend I didn\'t hear that. Followed anyway.', 1], funny: ['A weak connection! Too real. Okay, you\'re funny.', 2], confident: ['Very easy?! You\'ve been to Sharma sir\'s class. Okay, deal.', 2] }[tone];
        await say(TARA(), react[0], 'happy');
        ice.tara = 'agreed'; ice.taraPts = react[1]; ice.line = tone;
        stat({ social: 3 });
      } else if (r < pAgree + 0.18) {
        await say(TARA(), 'I only have LinkedIn. Want to endorse me for "excellent sketching"?', 'happy');
        await say('me', 'Endorsed. Also for "excellent comebacks".', 'happy');
        ice.tara = 'funny'; ice.taraPts = 2;
      } else {
        await say(TARA(), 'Ah, I don\'t really share it with people I just met. Sorry!', 'normal');
        const k = await ask('me', 'A clear, friendly no.', ['"No worries at all! Nice meeting you."', '"Totally fair. Have a great Thomso!"']);
        await say(TARA(), k === 0 ? 'You too! Good luck with the seniors.' : 'You too! See you around.', 'happy');
        ice.tara = 'declined'; ice.taraPts = 2; // handling a "no" gracefully IS the challenge
      }
    }
    ice.state = 'returning';
    UI.hint('Head back to the seniors at the <b>{L:plaza}</b>.', 5);
  },
  async iceReturn() {
    const ice = S.ice, p = PL();
    const total = (ice.score || 0) + (ice.taraPts || 0);
    const report = { agreed: 'She shared it! And laughed at my line.', funny: 'She only has LinkedIn. I endorsed her.', declined: 'She said no, politely. So I said thanks and left.', skipped: 'I chickened out. But nicely.' }[ice.tara] || 'Mission... attempted.';
    await say('me', report, 'happy');
    const qualifies = ice.tara !== 'skipped' && total >= 4;
    if (ice.tara === 'declined') await say(senior(1), 'And you said thanks and walked away? That\'s the real test. Most people fail that one.', 'happy');
    if (!qualifies) {
      await say(senior(0), 'Hmm. Effort tha, Chapo nahi. Chapo is earned, junior. Next time!', 'normal');
      await say(senior(2), '...Fine, ek toffee le lo. Consolation toffee.', 'happy');
      stat({ social: 3 }); ice.state = 'done'; ice.chapo = false;
      logd('Attempted the Chapo challenge. Got a consolation toffee.');
      G.needRepop = true;
      return;
    }
    await this.chapo();
  },
  async chapo() {
    const ice = S.ice, p = PL();
    if (ice.chapo) return; // one Chapo per run
    ice.chapo = true; ice.state = 'done';
    G.camTarget = { x: T(30) + 8, y: T(15) };
    await say(senior(0), 'CHAPO TIME! Junior ne kamaal kar diya!', 'happy');
    AU.sfx('fanfare');
    for (const sn of SENIORS) { const a = A(sn.id); if (a) { a.pose = 'cheer'; emote(a, 'heart', 1.6); } }
    for (const a of G.actors) if (a.name === 'Fresher') { a.pose = 'cheer'; emote(a, '!!', 1.2); }
    for (let i = 0; i < 40; i++) G.parts.push({ x: p.x + rand(-30, 30), y: p.y - 40 + rand(-10, 10), vx: rand(-20, 20), vy: rand(10, 40), life: 2.5, t: 0, kind: 'confetti', col: pick(['#ff4f7b', '#ffd23f', '#2ec4b6', '#7a5cff']) });
    p.pose = 'cheer'; p.expr = 'happy';
    await UI.popup(`<div class="chapo"><div class="ch-t">CHAPO!</div><div class="ch-food"><span>🥟</span><span>🍩</span><span>🥤</span></div><p>Samosas, jalebi and a cold drink — a senior's treat for a junior who earned it.</p><div class="ch-fx"><b>+${ICEBREAK.chapo.energy} Energy</b><b>+${ICEBREAK.chapo.social} Social</b></div></div>`, 'Eat the Chapo', 'paperpop');
    stat(ICEBREAK.chapo);
    S.counters.samosa += 2;
    memory('Getting Chapo from the seniors on Icebreaking Day');
    logd(`Won Chapo on Icebreaking Day (${ice.tara === 'declined' ? 'took a "no" like a legend' : 'smooth talker'})`);
    await say(senior(1), 'Welcome to the hostel, {P}. Ab tum officially humare ho.', 'happy');
    p.pose = 'stand'; G.camTarget = null; G.needRepop = true;
  },

  /* ================= FEST DILEMMA CARDS (Wed/Thu) ================= */
  festCardTick(t) {
    if (!hasTag('festcards') || G.map.id === 'lecture') return false;
    S.festPlan = S.festPlan || {};
    let plan = S.festPlan[S.day];
    if (!plan) {
      const pool = FEST_CARDS.filter((c) => !(S.festDone || []).includes(c.id) && (c.id !== 'night_plan' || hasTag('pronite')));
      const pickN = BagN('festcards', pool, 2);
      const times = [sec(12, 30) + Rng.int(0, 90), sec(18) + Rng.int(0, 60)];
      if (hasTag('pronite') && !pickN.some((c) => c.id === 'night_plan') && pool.some((c) => c.id === 'night_plan')) pickN[1] = pool.find((c) => c.id === 'night_plan');
      plan = S.festPlan[S.day] = pickN.map((c, i) => ({ id: c.id, at: c.id === 'night_plan' ? sec(23, 10) : times[i], done: false }));
    }
    const due = plan.find((x) => !x.done && t >= x.at && t < x.at + 180);
    if (!due) return false;
    if (Sched.active() >= 0 || DAY().classes.some((c, i) => !Sched.rec(i) && c.start > t && c.start - t < 30)) return false;
    due.done = true;
    runScript(() => this.festCard(FEST_CARDS.find((c) => c.id === due.id)));
    return true;
  },
  async festCard(card) {
    if (!card) return;
    S.festDone = S.festDone || []; S.festDone.push(card.id);
    AU.sfx('notif');
    const k = await UI.cardChoice(card.title, card.text, card.opts.map((o) => ({ t: o.t, hint: fxText(o.fx) })));
    const o = card.opts[k];
    if (o.time) await UI.timeSkip(o.t + '...', o.time, null);
    stat(o.fx);
    if (o.prep) { const sub = (S.prep.sig || 0) <= (S.prep.mth || 0) ? 'sig' : 'mth'; S.prep[sub] = clamp((S.prep[sub] || 0) + o.prep, 0, 100); floatTxt(`+${o.prep}% ${SUBJECT_NAMES[sub]} prep`, '#7fb8ff'); }
    if (o.rel) for (const who in o.rel) rel(who, o.rel[who]);
    if (o.mem) memory(o.mem);
    if (o.flag) S.flags[o.flag] = true;
    logd(o.log || `${card.title}: ${o.t}`);
  },

  /* ================= RANDOM EVENT POOL ================= */
  eventTick(t) {
    if (G.noEvents || G.cut || G.dlg || MG.cur || Chase.active() || S.exhausted) return false; // G.noEvents: test/debug hook
    if (S.ice && (S.ice.state === 'challenge' || S.ice.state === 'returning' || S.ice.state === 'intro')) return false;
    if (t < (S.evNext || 0)) return false;
    S.evNext = t + Rng.int(45, 90);
    if (t < sec(8, 30) || !Rng.chance(0.6)) return false;
    if (Sched.active() >= 0 || DAY().classes.some((c, i) => !Sched.rec(i) && c.start > t && c.start - t < 25)) return false;
    const sl = slotOf(t), fest = isFestDay();
    S.evDone = S.evDone || {}; S.evDay = S.evDay || {};
    const pool = EVENT_POOL.filter((e) => e.maps.includes(G.map.id) && e.slots.includes(sl)
      && (e.fest === undefined || e.fest === fest) && (!e.classDay || DAY().classes.length || (S.day + 1 < SEM_DAYS && DAY(S.day + 1).classes.length))
      && !(e.once && S.evDone[e.id]) && S.evDay[e.id] !== S.day && (!e.cond || e.cond()));
    if (!pool.length) return false;
    const ev = Rng.weighted(pool, (e) => e.weight);
    S.evDay[ev.id] = S.day; if (ev.once) S.evDone[ev.id] = true;
    if (ev.id === 'overhear') { this.evOverhear(); return false; } // ambient, never blocks the player
    runScript(() => ev.run());
    return true;
  },
  async evOverhear() {
    const p = PL(), seq = Bag('casual', DLG.casual); // chosen ONCE for this conversation
    const side = p.x > T(30) ? -1 : 1;
    const ax = clamp(p.x + side * 60, T(2), T(58)), ay = clamp(p.y - 12, T(16), T(20));
    const a = spawn({ id: 'ovA', name: 'Student', look: studentLook(Rng.int(700, 799)), x: ax, y: ay, dir: 'right', solid: false });
    const b = spawn({ id: 'ovB', name: 'Student', look: studentLook(Rng.int(800, 899)), x: ax + 16, y: ay, dir: 'left', solid: false });
    for (const [who, line] of seq) { if (!G.actorById('ovA')) return; bubble(who === 'A' ? a : b, line, 2.2); await wait(2.3); }
    emote(a, 'haha', 1); emote(b, 'haha', 1);
    await wait(1.2);
    walk(a, [[ax - side * 120, ay]], 40).then(() => despawn('ovA'));
    walk(b, [[ax - side * 100, ay + 6]], 40).then(() => despawn('ovB'));
  },
  async evSnack() {
    const look = studentLook(Rng.int(600, 699));
    const [nm, line, food] = Bag('snack', [['Wingmate', 'Bhai, ghar se laddoo aaye hain. Ek lo! Mummy ne bola sabko dena.', 'laddoo'], ['Classmate', 'Want some chips? I bought a family pack. I have no family here.', 'chips'], ['Senior', 'Junior, ye lo, Thekua. Bihar ka gift. Mana mat karna.', 'thekua'], ['Neighbour', 'Mom sent too much namkeen. Save me. Take some.', 'namkeen']]);
    const c = await ask({ name: nm, look }, line, [`Take some ${food}`, 'No thanks, I\'m good']);
    if (c === 0) { stat({ energy: 6, social: 3 }); await say({ name: nm, look }, Rng.pick(['Aur lo! Sharm mat karo.', 'Good. Now you owe me notes.', 'Mummy will be proud.'])); }
    else await say({ name: nm, look }, 'More for me then!');
  },
  async evGameInvite() {
    const look = studentLook(Rng.int(620, 690));
    const [game, line] = Bag('games', [['cricket', 'Ek player kam hai! Gully cricket? One tip one hand rules.'], ['carrom', 'Common room mein carrom chal raha hai. Partner chahiye. Tu aa ja!'], ['football', 'Football! 5-a-side. Goalkeeper chahiye. Talent optional.']]);
    const c = await ask({ name: 'Batchmate', look }, line, ['I\'m in! (30 min)', 'Next time, bro']);
    if (c === 1) return;
    if (Act.tooTired(8)) return;
    await UI.timeSkip(`Playing ${game} with the batch...`, 30, 'cheer');
    const won = Rng.chance(0.5);
    stat({ social: 6, energy: -5 });
    await say({ name: 'Batchmate', look }, won ? 'WE WON! You\'re on the team now. Forever.' : 'We lost, but you looked very sporty losing.', 'happy');
    if (won) memory(`Winning a random ${game} match`);
  },
  async evProfNotice() {
    const n = Bag('profnotice', [
      ['Class Group', 'CR: Sharma sir says "read chapter 3 before next class". Nobody will. Including me.', { acad: 1 }],
      ['Class Group', 'CR: Iyer ma\'am uploaded 40 practice problems. "Optional". Her optional is not optional.', null],
      ['Course Portal', 'Announcement: Office hours moved to "whenever you find me". — R.K. Sharma', null],
      ['Class Group', 'CR: Sir said today\'s topic will "definitely" come in the final. He says that every class.', { acad: 1 }],
      ['Course Portal', 'Reminder: Assignment 1 is due Saturday 11:59 PM. Late submissions will be "very easily" rejected.', null],
    ]);
    notify(n[0], n[1]);
    if (n[2]) stat(n[2]);
  },
  async evAssignHelp() {
    const look = studentLook(Rng.int(700, 760));
    const nm = Rng.pick(['Chirag', 'Zoya', 'Arjun', 'Sana']);
    const c = await ask({ name: nm, look }, Rng.pick(['Hey, can you explain question 2 of the assignment? I\'ve read it 9 times. It reads me back.', 'Bro, assignment ka Q3 samjha de? 10 minute. (It will be 40.)']), ['Explain it (40 min)', 'Sorry, I\'m stuck too']);
    if (c === 1) { await say({ name: nm, look }, 'Same. Solidarity.'); return; }
    if (!(await Act.clashOK(40))) return;
    await UI.timeSkip(`Explaining the assignment to ${nm}...`, 40, 'write');
    S.assignment = clamp(S.assignment + 4, 0, 100);
    stat({ social: 5, energy: -4, acad: 2 }); rel(nm.toLowerCase(), 5);
    floatTxt('+4% Assignment (learning by teaching)', '#7fb8ff');
    await say({ name: nm, look }, 'You\'re a lifesaver. Chai on me. Someday.', 'happy');
  },
  async evFest() {
    const ev = Bag('festev', ['sample', 'luckydraw', 'flashmob', 'mascot', 'hawker']);
    const look = studentLook(Rng.int(500, 560));
    if (ev === 'sample') { await say({ name: 'Stall Volunteer', look }, 'Free sample! Thomso Special Kulfi. Bas ek. EK.'); stat({ energy: 5 }); }
    else if (ev === 'luckydraw') {
      const c = await ask({ name: 'Lucky Draw Guy', look }, 'Lucky draw! 5 rupees. Win 25! Or a keychain. Mostly the keychain.', [{ t: 'Try your luck', dis: S.stats.money < 5 }, 'Walk away']);
      if (c === 0) { stat({ money: -5 }); if (Rng.chance(0.3)) { await say('sys', 'You WON! 25 rupees!'); stat({ money: 25 }); } else await say('sys', 'Keychain. Shaped like a samosa. Again.'); }
    } else if (ev === 'flashmob') {
      const c = await ask('sys', 'A flash mob starts right next to you. They are looking at you to join.', ['Join the flash mob!', 'Film it for the group chat']);
      if (c === 0) { PL().pose = 'dance'; await wait(1.4); PL().pose = 'stand'; stat({ social: 7, energy: -4 }); memory('Joining a random Thomso flash mob'); }
      else { stat({ social: 3 }); notify('Class Group', 'Your flash mob video: 112 views. 1 is Sharma sir.'); }
    } else if (ev === 'mascot') { await say({ name: 'Thomso Mascot', look }, '(The mascot gives you a silent, enthusiastic thumbs up and a hug.)'); stat({ social: 4 }); }
    else {
      const c = await ask({ name: 'Glow-stick Seller', look }, 'Glow sticks! 10 rupees! Pronite mein sabse zyada chamkoge!', [{ t: 'Buy one', dis: S.stats.money < 10 }, 'No thanks']);
      if (c === 0) { stat({ money: -10, social: 4 }); S.flags.glow = true; }
    }
  },
  async evRoommate() {
    const k = A('kabir');
    if (!k || k.pose === 'sleep') return;
    faceTo(k, PL());
    const [line, q, opts] = Bag('roomev', [
      ['Bhai, mera charger dekha? Mera phone 3% pe hai. Meri aatma bhi.', 'Lend Kabir your charger?', [['Give it', { social: 3 }, 4], ['"Mera bhi 5% hai, bhai."', { social: 1 }, 0]]],
      ['Bhai, room saaf karein? Mujhe ek moth ne dekha. Usne judge kiya.', 'Clean the room together?', [['Clean (20 min)', { energy: -3, social: 3 }, 5, 20], ['"Moth ko rent do."', { social: 2 }, 1]]],
      ['Mummy ka video call. Bhai, "hi aunty" bol de. Unhe lagta hai main akela hoon.', 'Say hi to Kabir\'s mom?', [['"Namaste aunty!" (big smile)', { social: 4 }, 6], ['Hide behind the cupboard', { social: -1 }, -2]]],
      ['Ye nayi game try kar. Bas ek match. Sirf ek.', 'One match with Kabir?', [['One match (30 min)', { social: 5, energy: -3 }, 5, 30], ['"Mujhe padhna hai." (lies)', { acad: 1 }, -1]]],
    ]);
    await say('kabir', line, 'normal');
    const c = await ask('me', q, opts.map((o) => o[0]));
    const o = opts[c];
    if (o[3]) await UI.timeSkip('With Kabir...', o[3], null);
    stat(o[1]); rel('kabir', o[2]);
    await say('kabir', Rng.pick(['Tu best roommate hai. Top 3. Out of 1.', 'Theek hai bhai, as you wish.', 'Noted. Mentally. In pencil.']), 'happy');
  },

  /* ================= SATURDAY · ROOMMATE CHAOS (during desk work) ================= */
  async roommateChaos() {
    const k = A('kabir');
    const ev = Bag('chaos', ['charger', 'ball', 'powercut', 'djtest', 'momcall', 'firedrill']);
    if (ev === 'charger') {
      await say('kabir', 'BHAI. Laptop charger udhaar de. Mera assignment bhi aaj hai. 10 minute. Pakka.', 'shock');
      const c = await ask('me', 'Your battery: 23%.', ['Share it (lose 20 min of work)', 'Charger custody battle: no.']);
      if (c === 0) { addTime(20); rel('kabir', 6); stat({ social: 3 }); } else { rel('kabir', -2); await say('kabir', 'Fine. Main power bank se kaam chala lunga. Aur aansuon se.', 'tired'); }
    } else if (ev === 'ball') {
      AU.sfx('crash'); shake(4);
      await say('sys', 'A cricket ball flies through the window and lands next to your laptop. Somebody outside yells "SORRY BHAIYA!"');
      const c = await ask('me', 'The ball looks at you. The laptop survived.', ['Throw it back + join for 2 overs (30 min)', 'Confiscate the ball. Focus.']);
      if (c === 0) { await UI.timeSkip('Two overs of gully cricket...', 30, 'cheer'); stat({ social: 6, energy: -4 }); memory('Hitting a six on deadline day'); }
      else stat({ acad: 1 });
    } else if (ev === 'powercut') {
      AU.sfx('down'); G.fade = 0.6;
      await say('sys', 'POWER CUT. The fan stops. The laptop switches to battery. The hostel collectively screams.');
      const c = await ask('me', 'Battery 31%. Darkness. Mosquitoes.', ['Keep typing by phone torchlight', 'Nap until the power comes back (30 min)']);
      G.fade = 0;
      if (c === 0) { stat({ energy: -4 }); S.assignment = clamp(S.assignment + 3, 0, 100); floatTxt('+3% (torchlight grind)', '#7fb8ff'); }
      else { await UI.timeSkip('Napping in the dark...', 30, 'snore'); stat({ energy: 8 }); }
    } else if (ev === 'djtest') {
      for (let i = 0; i < 3; i++) { AU.tone(90, 0.2, 'square', 0.25); await wait(0.35); }
      await say('sys', 'Next room is "testing speakers for tomorrow". Tomorrow is the final exam. They don\'t care.');
      const c = await ask('me', 'BOOM. BOOM. BOOM.', ['Knock and ask nicely', 'Noise-cancelling headphones (Kabir\'s)', 'Join the "test" (20 min)']);
      if (c === 0) { await say({ name: 'Next-room Senior', look: studentLook(931) }, 'Sorry sorry! Volume 2. Promise. (It is now volume 9.)'); stat({ social: 2 }); }
      else if (c === 1) { rel('kabir', -1); stat({ acad: 1 }); }
      else { await UI.timeSkip('Speaker test party...', 20, 'cheer'); stat({ social: 6, energy: -4 }); }
    } else if (ev === 'momcall') {
      AU.sfx('notif');
      await say('phone', 'Mom (video call): Beta! Khana khaya? Kitna patle ho gaye ho! Assignment ho gaya?');
      const c = await ask('me', 'Mom wants a full room tour.', ['Full room tour (15 min)', '"Mummy, deadline hai, raat ko call karta hoon!"']);
      if (c === 0) { addTime(15); stat({ social: 3, energy: 4 }); memory('A room tour for Mom on deadline day'); } else stat({ energy: 1 });
    } else {
      AU.sfx('alarm'); shake(2);
      await say({ name: 'Hostel Warden', look: LOOKS.guard, bg: '#4a5a7a' }, 'FIRE DRILL! Sab neeche! Haan, laptop ke saath bhi!');
      await UI.timeSkip('Standing in the courtyard for the fire drill...', 20, null);
      stat({ energy: -2, social: 3 });
      await say('kabir', 'Fire drill on deadline day. The universe has a sense of humour.', 'tired');
    }
  },

  /* ================= ENDING ================= */
  async wrapped() {
    G.mode = 'over';
    clearSprint(); UI.chaseShow(false);
    const st = S.stats, q = S.quiz || 0, as = S.assignScore || 0, ex = S.exam || 0;
    const total = q * 5 * 0.25 + as * 0.3 + ex * 0.45;
    const nsoOK = S.nso.sessions >= 1;
    const sgpa = clamp(Math.round(total) / 10 + (st.att >= 75 ? 0.3 : -0.4), 0, 10).toFixed(1);
    const grade = (v) => v >= 85 ? 'A+' : v >= 75 ? 'A' : v >= 62 ? 'B' : v >= 50 ? 'C' : v >= 40 ? 'D' : 'F';
    const gp = +sgpa, hcr = (S.hc && S.hc.results) || [];
    let title, sub;
    if (S.flags.endedEarly) { title = 'Speedrunner (Any%)'; sub = `You ended the run on Day ${S.day + 1}. The semester is still looking for you.`; }
    else if (S.flags.missedEndsem) { title = 'Absent for the Finale'; sub = 'The final happened. You heard it was very easy.'; }
    else if (hcr.includes('won') && S.proxyCount >= HEADCOUNT.threshold) { title = 'Headcount Houdini'; sub = `${S.proxyCount} proxies, one emergency headcount, zero proof. Sharma sir still wonders.`; }
    else if (S.proxyCount >= 3 || (S.flags.caught && S.proxyCount >= 1)) { title = 'Professional Proxy Negotiator'; sub = 'Present in two places. Absent in none. Wanted in one.'; }
    else if (gp < 5) { title = 'Backlog Speedrunner'; sub = 'See you in the supplementary exams. Bring snacks.'; }
    else if (gp >= 8.5 && st.social >= 45) { title = 'Topper With a Social Life'; sub = 'A rare species. Spotted at both the library and Pronite.'; }
    else if (S.ice && S.ice.chapo && st.social >= 60) { title = 'Chapo Champion'; sub = 'The seniors know your name. The juniors will hear your legend.'; }
    else if (S.allNighters >= 2) { title = 'Submitted at 11:59 PM'; sub = 'Sleep is a social construct. So is your skin care routine.'; }
    else if (S.memories.length >= 8 && st.acad < 55) { title = 'Thomso Legend, Academic Casualty'; sub = 'Everyone knows your name. Including the exam department.'; }
    else if ((S.badminton.w >= 2 || S.nso.sessions >= 2) && S.sports >= 25) { title = 'NSO Royalty'; sub = 'Your smash is faster than your Wi-Fi.'; }
    else if (st.acad >= 75 && st.social < 45) { title = 'Library Hermit'; sub = 'The librarian knows your order. The books know your secrets.'; }
    else if (S.skippedClasses >= 4) { title = 'Attendance Is a Social Construct'; sub = 'You believed it. The Academic Office did not.'; }
    else if (st.money <= 10) { title = 'Professionally Broke'; sub = 'Rich in memories. Poor in literally everything else.'; }
    else if (S.flags.helpedRahul && S.friendTrust >= 55) { title = 'The Real One'; sub = 'You saved a friend on deadline day. Legends will speak of this.'; }
    else if (gp >= 6 && st.social >= 45 && st.att >= 70) { title = 'Hostel Legend, Academic Survivor'; sub = 'Balanced. Like a canteen tray carrying four chais.'; }
    else { title = 'Certified Week-One Survivor'; sub = 'You made it. Barely. That\'s the college experience.'; }
    S.title = title;
    const persName = { owl: 'Night Owl', topper: 'Topper Wannabe', broke: 'Broke but Popular' }[S.pers];
    const decisions = S.decisions.slice(-9);
    const bar = (k, label) => `<div class="wrow"><span>${label}</span><div class="wbar"><i data-v="${st[k]}" style="background:${STAT_META[k].col}"></i></div><b>${st[k]}</b></div>`;
    const steps = Math.round(S.counters.steps);
    const ach = [
      [hcr.includes('won'), 'Headcount Houdini', 'Beat the emergency headcount'],
      [hcr.includes('lost'), 'Caught in 4K', 'Lost the emergency headcount'],
      [S.ice && S.ice.chapo, 'Chapo Champion', 'Earned Chapo on Icebreaking Day'],
      [S.ice && S.ice.tara === 'declined', 'Took the L Gracefully', '"No worries! Nice meeting you."'],
      [S.flags.submitTime === '11:59:58 PM', '11:59:58 Club', 'Submitted with 2 seconds left'],
      [S.flags.concert, 'Pronite Survivor', 'Danced at the Main Stage'],
      [S.wf.wins > 0, 'Water Warrior', 'Won a midnight water fight'],
      [S.counters.danceWins, 'Dance-off Royalty', 'Out-danced Wing B'],
      [S.badminton.w > 0, 'Smash Bros', 'Won a badminton match'],
      [S.nso.sessions >= 2, 'NSO Regular', 'Showed up to NSO twice'],
      [S.flags.messFood, 'Mystery Sabzi Survivor', 'Ate the first mess meal'],
      [(S.quiz || 0) >= 16, 'Surprise? What Surprise', '16+ in the surprise quiz'],
      [S.allNighters > 0, 'Sunrise Club', 'Pulled an all-nighter'],
      [S.flags.helpedRahul, 'Ride or Die', 'Saved Rahul\'s assignment'],
      [S.skippedClasses === 0, 'Perfect Attendance', 'Never missed a lecture'],
      [(S.counters.lateWakes || 0) >= 2, 'Snooze Lord', 'Hit snooze twice'],
    ].filter((a) => a[0]);
    const funny = [
      ['steps walked', steps, steps > 4000 ? 'mostly to the canteen' : 'mostly to bed'],
      ['proxy attempts', S.proxyCount, S.proxyCount >= HEADCOUNT.threshold ? 'the register noticed' : S.proxyCount ? 'voice actor of the year' : 'clean record'],
      ['times you heard "very easy"', S.counters.veryEasy, 'it was never easy'],
      ['Maggi & samosas', S.counters.maggi + S.counters.samosa, 'a balanced diet'],
      ['all-nighters', S.allNighters, S.allNighters ? 'the sun saw you' : 'you actually slept?!'],
      ['lectures skipped', S.skippedClasses, S.skippedClasses ? 'the bench missed you' : 'perfect-ish'],
    ];
    const mem = S.memories.slice(-8);
    const rels = [['rahul', 'Rahul'], ['kabir', 'Kabir'], ['priya', 'Priya']].map(([k, n]) => `<div><b class="count" data-v="${Math.max(0, S.rel[k] || 0)}">0</b><span>${n}</span><em>${(S.rel[k] || 0) >= 50 ? 'best friend' : (S.rel[k] || 0) >= 30 ? 'good friend' : (S.rel[k] || 0) >= 10 ? 'friend' : 'it\'s complicated'}</em></div>`).join('');
    const slides = [
      { cls: 'w-intro', sfx: 'fanfare', html: `<div class="wk">SEMESTER WRAPPED · WEEK ONE</div><h2>${esc(S.name)}, your first week was&hellip; a lot.</h2><p>${persName} · ${S.flags.endedEarly ? `ended on Day ${S.day + 1}` : SEM_DAYS + ' days'} · 1 Thomso · 1 surprise quiz · 1 Sharma sir</p><canvas class="wchar" width="240" height="240" data-pose="dance"></canvas><p class="tap">Press <kbd>E</kbd> or tap Next</p>` },
      { cls: 'w-stats', html: `<div class="wk">FINAL STATS</div><h2>How you're leaving the week</h2>${bar('acad', 'Academics')}${bar('att', 'Attendance')}${bar('energy', 'Energy')}${bar('money', 'Money')}${bar('social', 'Social')}<p class="small">Lectures attended: <b>${Object.values(S.lec).filter((v) => v === 'attended' || v === 'late').length}</b> · Proxy attempts: <b>${S.proxyCount}</b> · Headcounts: <b>${hcr.filter((r) => r !== 'cancelled').join(', ') || 'none'}</b></p>` },
      { cls: 'w-grades', html: `<div class="wk">THE GRADES</div><h2>Report card (unofficial, extremely real)</h2><div class="grades"><div><span>Surprise Quiz</span><b><i class="count" data-v="${q}">0</i>/20</b><em>${grade(q * 5)}</em></div><div><span>Assignment 1</span><b><i class="count" data-v="${as}">0</i>%</b><em>${grade(as)}</em></div><div><span>Final Exam</span><b><i class="count" data-v="${ex}">0</i>%</b><em>${grade(ex)}</em></div></div><div class="sgpa">SGPA <b>${sgpa}</b></div><p class="small">NSO: <b>${nsoOK ? 'Satisfactory' : 'Unsatisfactory'}</b> (${S.nso.sessions} sessions) · Attendance ${st.att}% ${st.att < 75 ? '(a "detention warning" letter is on its way home)' : '(Sharma sir nods. Slightly.)'}</p>` },
      { cls: 'w-sport', html: `<div class="wk">FRIENDSHIPS</div><h2>Your people</h2><div class="fun">${rels}<div><b class="count" data-v="${S.friendTrust}">0</b><span>friend trust</span><em>${S.friendTrust >= 50 ? 'they\'d proxy for you' : 'work on it'}</em></div></div>` },
      { cls: 'w-funny', html: `<div class="wk">ACHIEVEMENTS</div><h2>${ach.length} unlocked</h2><ul class="decs ach">${ach.length ? ach.map((a) => `<li><span>🏆</span><b>${esc(a[1])}</b> — ${esc(a[2])}</li>`).join('') : '<li><span>—</span>None. A quiet, mysterious week.</li>'}</ul>` },
      { cls: 'w-funny', html: `<div class="wk">BY THE NUMBERS</div><h2>Your week, quantified</h2><div class="fun">${funny.map(([l, v, c]) => `<div><b class="count" data-v="${v}">0</b><span>${l}</span><em>${c}</em></div>`).join('')}</div>` },
      { cls: 'w-mem', html: `<div class="wk">MEMORIES</div><h2>The bits you'll tell your juniors about</h2><ul class="decs mem">${mem.length ? mem.map((x) => `<li><span>★</span>${esc(x)}</li>`).join('') : '<li><span>—</span>You were very... focused. Maybe next week?</li>'}</ul>` },
      { cls: 'w-dec', html: `<div class="wk">NOTABLE DECISIONS</div><h2>The choices that made you</h2><ul class="decs">${decisions.length ? decisions.map((x) => `<li><span>${DAY(x.d).wd} ${x.d + 1}</span>${esc(x.s)}</li>`).join('') : '<li><span>—</span>You did... remarkably little. Peaceful.</li>'}</ul>` },
      { cls: 'w-title', sfx: 'cheer', html: `<div class="wk">YOUR TITLE</div><canvas class="wchar" width="300" height="300" data-pose="cheer" data-friends="1"></canvas><h1>${title}</h1><p>${sub}</p><div class="wbtns"><button data-act="again" class="primary">Restart</button><button data-act="title">Main menu</button></div>` },
    ];
    S.completed = true;
    safeStore('set', SAVE_KEY + '.done', JSON.stringify({ name: S.name, title, sgpa }));
    UI.wrapped({ slides });
  },
};

/* "+5 Energy · -3 Money" style hint for choice cards */
function fxText(fx) { return Object.entries(fx || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_META[k].name}`).join(' · '); }

function drawPhoto(friends) {
  const cvs = document.getElementById('photo-cv'); if (!cvs) return;
  const c = cvs.getContext('2d'); c.imageSmoothingEnabled = false;
  c.save(); c.scale(5, 5);
  c.fillStyle = '#2a1840'; c.fillRect(0, 0, 44, 30);
  for (let i = 0; i < 8; i++) R(c, 2 + i * 5, 2, 3, 3, ['#ff4f7b', '#ffd23f', '#2ec4b6', '#7a5cff'][i % 4]);
  R(c, 0, 24, 44, 6, '#3a2418');
  const all = ['me', ...friends];
  all.forEach((f, i) => {
    const x = 22 + (i - (all.length - 1) / 2) * 10;
    drawChar(c, { x, y: 27, look: f === 'me' ? G.player.look : LOOKS[f], dir: 'down', pose: i % 2 ? 'cheer' : 'stand', expr: 'happy', phase: i }, 0.4);
  });
  c.restore();
}

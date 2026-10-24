'use strict';
/* ===== Story, NPC schedules, actions, events, endings ===== */
const say = (w, t, e) => UI.say(w, t, e);
const ask = (w, t, o, e) => UI.choose(w, t, o, e);
const notify = (a, t) => UI.notify(a, t);
const PL = () => G.player;
function rel(who, v) { S.rel[who] = clamp((S.rel[who] || 0) + v, -50, 100); }
function trust(v) { S.friendTrust = clamp(S.friendTrust + v, 0, 100); }
function logd(s) { S.decisions.push({ d: S.day, s }); }
function floatTxt(text, col) { G.floats.push({ x: PL().x, y: PL().y - 30, text, col: col || '#ffffff', t: 0, life: 2 }); }
function A(id) { return G.actorById(id); }
const sec = (h, m = 0) => h * 60 + m;

const DAY_INFO = [
  ['The Alarm Disaster', 'Things due: 47'],
  ['Attendance Is a Social Construct', 'Things due: 46 (one was a typo)'],
  ['Festival Preparations', 'Things due: 44 · UTSAV is coming'],
  ['The Night Before Trouble', 'Things due: 41 · Fest night'],
  ['The 8 AM Quiz', 'Things due: 38 · it is 8 AM somewhere'],
  ['Assignment Deadline', 'Things due: 1 (the big one) · 11:59 PM'],
  ['Final Exam', 'Things due: everything'],
];

const CAMPUS_CHAT = ['Bro I\'m 5 minutes away. (He is in bed.)', 'Assignment kiska hua?', 'Who even reads the syllabus?', 'Mess mein aaj kya hai?', 'Fest pass kitne ka hai?', 'My code works. I don\'t know why.', 'Sharma sir said "very easy" again', 'Wi-Fi is down. Again.', 'Proxy laga dena kal, pakka', 'Group project = solo project', 'Is the quiz open book? Open mind?', 'Bhai notes bhej de', 'Canteen chalein?', 'I studied for 10 minutes. I deserve a break.'];
const CANTEEN_CHAT = ['Ye dal hai ya paani?', 'Bhaiya, ek chai. Udhaar.', 'This sabzi has trust issues.', 'Maggi is a food group.', 'Who puts elaichi in Maggi?', 'Came for samosa, stayed for Wi-Fi.', 'Roti ya papad? Hard to tell.', 'Bhaiya, extra chutney please'];
const LIB_CHAT = ['(whisper) Is this in the syllabus?', '(whisper) Read this page 9 times.', '(whisper) Bro. Wake up.', '(whisper) Library Wi-Fi hits different.', '(whisper) Where is chapter 7?'];
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
  ['Class Group', 'Fest volunteer list is out. Did you sign up?'],
];
const BOOKS = ['"Thermodynamics: A Love Story"', '"How to Survive on Maggi" (3rd edition)', '"Proxy: The Art of Being in Two Places"', '"Data Structures for People Who Hate Data"', '"Assignments & Other Horror Stories"', '"Very Easy Calculus" by R.K. Sharma', '"Sleep Is For The Weak (Revised: Please Sleep)"', '"1001 Excuses for Late Submission"', '"Fourier Series: Sines You Can\'t Ignore"'];

const CLASSMATES = [
  { id: 'aman', name: 'Aman', seat: [0, 0] }, { id: 'ishita', name: 'Ishita', seat: [0, 1] }, { id: 'bhavna', name: 'Bhavna', seat: [0, 5] },
  { id: 'chirag', name: 'Chirag', seat: [1, 1] }, { id: 'kunal', name: 'Kunal', seat: [1, 3] }, { id: 'zoya', name: 'Zoya', seat: [1, 6] },
  { id: 'dev', name: 'Dev', seat: [2, 0] }, { id: 'neha', name: 'Neha', seat: [2, 4] }, { id: 'rohit', name: 'Rohit', seat: [2, 6] },
  { id: 'arjun', name: 'Arjun', seat: [3, 2] }, { id: 'tanvi', name: 'Tanvi', seat: [3, 5] }, { id: 'sana', name: 'Sana', seat: [3, 7] },
];

function seatPos(row, idx) { const m = MAPS.lecture; return { x: m.seatXs[idx], y: m.rows[row] - 10 }; }

const Story = {
  /* ================= helpers ================= */
  rnd(k) {
    if (!S) return false;
    if (k === 'coupon') return S.rnd.coupon && S.day === 2 && !S.flags.couponFound;
    if (k === 'idcard') return S.rnd.idcard && S.day === 2 && !S.flags.idFound;
    return false;
  },
  classAvailable() {
    const d = S.day, t = S.time;
    if (S.classDone[d]) return false;
    if (d <= 3) return t < sec(12);
    if (d === 4) return t < sec(10);
    if (d === 6) return t < sec(11, 30);
    return false;
  },
  deadlineText() {
    if (!S || S.flags.submitted) return S && S.flags.submitted ? '' : '';
    if (S.day < 5) return `Assignment ${S.assignment}% · due Sat 11:59 PM`;
    if (S.day === 5) { const left = sec(23, 59) - S.time; return left > 0 ? `Assignment ${S.assignment}% · ${Math.floor(left / 60)}h ${left % 60}m left` : 'Assignment: DEADLINE!'; }
    return '';
  },
  objective() {
    const d = S.day, t = S.time;
    if (d <= 3 && this.classAvailable()) return d === 0 ? '<b>Class!</b> Get to Lecture Hall 3 <small>(north-east)</small>' : '<b>Morning class</b> · Lecture Hall 3';
    if (d === 4 && this.classAvailable()) return '<b>8 AM QUIZ</b> · Lecture Hall 3. Run.';
    if (d === 6 && this.classAvailable()) return '<b>FINAL EXAM</b> · Lecture Hall 3';
    if (d === 1 && !S.flags.borrowAsked && t >= sec(12)) return 'Rahul is lurking near the <b>Canteen</b>';
    if (d === 2 && !S.flags.volunteerAsked && t >= sec(12)) return 'Fest prep at the <b>College Ground</b>';
    if (d === 3 && !S.flags.concert && t >= sec(17)) return 'Concert tonight at the <b>College Ground</b>';
    if (d === 4 && S.flags.lent && !S.flags.repaid && t >= sec(17)) return 'Rahul owes you. Try the <b>Canteen</b>';
    if (d === 5 && !S.flags.submitted) return t >= sec(20) ? '<b>SUBMIT</b> from your hostel laptop!' : 'Finish the assignment at your <b>hostel desk</b>';
    if (t >= sec(22)) return 'Sleep in your <b>hostel bed</b> (or don\'t)';
    if (d === 0 && t >= sec(18)) return 'Night plans: study, sleep, or talk to <b>Kabir</b>';
    if (d === 4) return 'Free day. Assignment due tomorrow night!';
    return 'Free time · eat, study, explore, survive';
  },
  objMarker() {
    const d = S.day, t = S.time;
    const B = (k) => ({ x: T(BUILDINGS[k].door) + 8, y: T(BUILDINGS[k].y + BUILDINGS[k].h) });
    if (this.classAvailable()) return B('lecture');
    if (d === 1 && !S.flags.borrowAsked && t >= sec(12)) return B('canteen');
    if (d === 2 && !S.flags.volunteerAsked && t >= sec(12)) return { x: T(30), y: T(35) };
    if (d === 3 && !S.flags.concert && t >= sec(17)) return { x: T(30), y: T(31) };
    if (d === 5 && !S.flags.submitted) return B('hostel');
    if (t >= sec(22)) return B('hostel');
    return null;
  },

  /* ================= population ================= */
  populate(id) {
    const d = S.day, t = S.time, sl = slotOf(t), out = [];
    const st = (seed, extra) => Object.assign({ id: 'st' + seed, name: CLASSMATES.find((c) => c.id === extra?.cid)?.name || 'Student', look: studentLook(seed) }, extra || {});
    if (id === 'campus') {
      out.push({ id: 'guard', name: 'Guard Uncle', look: LOOKS.guard, x: 40, y: T(18) + 10, dir: 'right', talk: () => Act.gate() });
      out.push({ id: 'cow', name: 'Campus Cow', look: null, x: T(46), y: T(39), drawFn: (c, a, tt) => PROP.cow(c, a.x, a.y, tt, { flip: a.dir === 'left' }), wander: { x: T(42), y: T(37) + 8, w: T(14), h: T(4) }, wspeed: 12, talk: () => Act.cow() });
      const n = sl === 3 ? 3 : 8;
      for (let i = 0; i < n; i++) {
        const areas = [{ x: T(2), y: T(17) + 4, w: T(55), h: T(2) }, { x: T(26), y: T(15), w: T(9), h: T(1) }, { x: T(2), y: T(34) + 4, w: T(16), h: T(2) }, { x: T(42), y: T(34) + 4, w: T(15), h: T(2) }];
        const ar = areas[i % areas.length];
        out.push(st(100 + i + d * 20, { x: ar.x + Math.random() * ar.w, y: ar.y + Math.random() * ar.h, wander: ar, chatter: CAMPUS_CHAT, name: 'Student' }));
      }
      if (sl === 3) out.push(st(140 + d, { x: T(56), y: T(20) + 4, dir: 'left', name: 'Night Owl', chatter: ['Chai at 1 AM is a personality.', 'Sleep? Never heard of her.', 'This chai is my 4th. Today.'] }));
      // cricket (Mon/Tue afternoon/evening)
      if ((d === 0 || d === 1) && (sl === 1 || sl === 2)) {
        out.push(st(150, { x: T(30), y: T(34), dir: 'down', pose: 'stand', name: 'Batsman', chatter: ['SIX! ... no, that\'s out.', 'One tip one hand!'] }));
        out.push(st(151, { x: T(30) + 8, y: T(39), dir: 'up', pose: 'cheer', name: 'Bowler', chatter: ['Howzaaat!'] }));
        out.push(st(152, { x: T(25), y: T(36), dir: 'right', wander: { x: T(23), y: T(33), w: T(14), h: T(6) }, name: 'Fielder', chatter: ['Catch it! ...nope.'] }));
      }
      // Wednesday fest prep
      if (d === 2 && sl >= 1) {
        out.push(st(160, { x: T(26), y: T(30), dir: 'up', pose: 'paint', name: 'Volunteer', chatter: ['Is it UTSAV or UTASV?', 'Who has the tape?!'] }));
        out.push(st(161, { x: T(34), y: T(30), dir: 'up', pose: 'paint', name: 'Volunteer', chatter: ['Lights test in 5 minutes. (2 hours)'] }));
        out.push(st(162, { x: T(28), y: T(34), wander: { x: T(23), y: T(32), w: T(14), h: T(4) }, name: 'Volunteer', chatter: ['Fest committee meeting #47', 'Need more glitter.'] }));
        if (!S.flags.volunteerDone) out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x: T(32), y: T(37) + 8, dir: 'down', talk: () => Story.priyaVolunteer() });
        if (S.rnd.meera && !S.flags.metMeera && sl >= 2) out.push({ id: 'meera', name: 'Meera', look: LOOKS.meera, x: T(36), y: T(36), dir: 'left', pose: 'guitar', talk: () => Story.meera() });
      }
      if (d === 2 && sl === 1 && S.rnd.idcard && S.flags.idFound && !S.flags.idReturned) out.push({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: T(47), y: T(15), dir: 'down', talk: () => Story.returnID() });
      // Thursday fest
      if (d === 3) {
        if (sl >= 1) {
          out.push(st(170, { x: T(23), y: T(32) - 14, dir: 'down', name: 'Chaat Wala', sortY: T(32) - 14, chatter: ['Golgappe! Teekha ya extra teekha?'] }));
          out.push(st(171, { x: T(37), y: T(32) - 14, dir: 'down', name: 'Game Wala', chatter: ['3 rings, 10 rupees! Win a teddy!'] }));
        }
        if (sl >= 2) {
          out.push({ id: 'band1', name: 'Drummer', look: studentLook(180), x: T(27), y: T(28) - 2, dir: 'down', pose: 'drum', sortY: T(29) + 2 });
          out.push({ id: 'band2', name: 'Guitarist', look: studentLook(181), x: T(33), y: T(28) - 2, dir: 'down', pose: 'guitar', sortY: T(29) + 2 });
          out.push({ id: 'meera', name: 'Meera', look: LOOKS.meera, x: T(30), y: T(28) - 2, dir: 'down', pose: 'mic', sortY: T(29) + 2 });
          for (let i = 0; i < 12; i++) out.push(st(190 + i, { x: T(25) + (i % 6) * 26 + rand(-4, 4), y: T(31) + Math.floor(i / 6) * 18 + 6, dir: 'up', pose: i % 3 ? 'dance' : 'cheer', name: 'Fan', phase: i }));
        } else {
          out.push(st(185, { x: T(28), y: T(34), wander: { x: T(23), y: T(33), w: T(14), h: T(6) }, name: 'Student', chatter: ['Concert tonight!!', 'Fest hangover pending...'] }));
          out.push(st(186, { x: T(33), y: T(36), wander: { x: T(23), y: T(33), w: T(14), h: T(6) }, name: 'Student', chatter: ['Have you seen the stage?!', 'Main toh aaj padhai nahi kar raha'] }));
        }
      }
      // Friday: Priya + Rahul outside lecture hall before quiz
      if (d === 4 && t < sec(10) && !S.classDone[4]) {
        out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x: T(47), y: T(14) + 4, dir: 'down', talk: () => Story.priyaNotes() });
        out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: T(51) + 8, y: T(14) + 6, dir: 'down', expr: 'tired', talk: () => Story.rahulNotes() });
      }
      // Saturday Rahul wandering (help request)
      if (d === 5 && sl === 1 && !S.flags.satAsked) out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: T(20), y: T(18) + 8, dir: 'right', expr: 'shock', talk: () => Story.rahulHelp() });
      if (d === 1 && sl === 0 && S.classDone[1]) out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: T(30), y: T(18) + 8, dir: 'down', talk: () => Story.rahulGeneric() });
    }
    if (id === 'hostel') {
      const k = { id: 'kabir', name: 'Kabir', look: LOOKS.kabir, talk: () => Story.kabir() };
      const m = MAPS.hostel;
      if (sl === 0 && d !== 2) Object.assign(k, { x: m.beds.kabir.x, y: m.beds.kabir.y, pose: 'sleep', bedW: 38, dir: 'down' });
      else if (sl === 2 && (d === 1 || d === 3)) return out;
      else Object.assign(k, { x: m.seats.kabir.x, y: m.seats.kabir.y, pose: 'type', dir: 'up' });
      out.push(k);
    }
    if (id === 'lecture') {
      if (this.classAvailable() && S.time >= sec(7)) {
        let list = CLASSMATES;
        if (d === 3) list = CLASSMATES.filter((_, i) => i % 2 === 0);
        if (d === 2) list = CLASSMATES.filter((_, i) => i % 3 !== 1);
        list.forEach((c, i) => { const p = seatPos(c.seat[0], c.seat[1]); out.push({ id: c.id, name: c.name, look: studentLook(300 + i), x: p.x, y: p.y, dir: 'up', pose: 'sit', solid: false }); });
        const pp = seatPos(0, 3); out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x: pp.x, y: pp.y, dir: 'up', pose: 'sit', solid: false });
        if (this.rahulInClass()) { const rp = seatPos(2, 2); out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: rp.x, y: rp.y, dir: 'up', pose: 'sit', solid: false }); }
        if (d !== 0) out.push({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: MAPS.lecture.profSpot.x, y: MAPS.lecture.profSpot.y, dir: 'down', solid: false });
      } else if (sl <= 1) {
        out.push(st(320, { x: 300, y: 230, dir: 'left', name: 'Topper', chatter: ['(Revising... in an empty hall... for fun)'], talk: async () => { await say({ name: 'Topper', look: studentLook(320) }, 'I come here when it\'s empty. The silence is very easy.'); } }));
      }
    }
    if (id === 'library') {
      out.push({ id: 'librarian', name: 'Librarian Ma\'am', look: LOOKS.librarian, x: 60, y: 202, dir: 'down', talk: () => Act.librarian() });
      const seats = MAPS.library.seats;
      const n = sl === 3 ? 2 : 4;
      for (let i = 0; i < n; i++) { const [x, y] = seats[[0, 2, 4, 7, 3][i]]; out.push(st(400 + i + d, { x, y, dir: 'down', pose: 'read', bookCol: pick(['#c0392b', '#2f8fd0', '#2ec4b6', '#7a5cc4']), chatter: LIB_CHAT, solid: false, talk: async () => { await say({ name: 'Studious Student', look: studentLook(400 + i + d) }, pick(['(whisper) Shhh. I\'m on page 3 of 400.', '(whisper) Do you understand Fourier? Nobody does.', '(whisper) If the librarian looks here, I was reading.'])); } })); }
      if ((d === 0 || d === 1 || d === 3) && (sl === 1 || sl === 2)) { const [x, y] = seats[1]; out.push({ id: 'priya', name: 'Priya', look: LOOKS.priya, x, y, dir: 'down', pose: 'read', bookCol: '#e8566f', solid: false, talk: () => Story.priyaLibrary() }); }
    }
    if (id === 'canteen') {
      out.push({ id: 'bhaiya', name: 'Pappu Bhaiya', look: LOOKS.bhaiya, x: 238, y: 47, dir: 'down', talk: () => Act.order() });
      const tables = MAPS.canteen.tables;
      const n = sl === 3 ? 3 : 6;
      const spots = [[0, 14], [0, 36], [4, 14], [5, 40], [6, 20], [7, 14], [2, 30], [3, 14]];
      for (let i = 0; i < n; i++) { const [ti, off] = spots[i]; const [x, y] = tables[ti]; out.push(st(500 + i + d * 3, { x: x + off, y: y - 12, dir: 'down', pose: i % 2 ? 'eat' : 'sit', chatter: CANTEEN_CHAT, solid: false, talk: async () => { await say({ name: 'Hungry Student', look: studentLook(500 + i + d * 3) }, pick(['The Mystery Sabzi blinked at me.', 'Bhaiya ki chai is the only stable thing in my life.', 'I\'m not eating. I\'m "networking".', 'This is my 3rd lunch. Don\'t judge.'])); } })); }
      if ((d === 0 && sl >= 1) || (d === 1 && sl >= 1) || (d === 4 && sl >= 2)) { const [x, y] = tables[3]; out.push({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: x + 26, y: y - 12, dir: 'down', pose: 'eat', solid: false, talk: () => Story.rahulGeneric() }); }
      if ((d === 1 || d === 3) && sl === 2) { const [x, y] = tables[6]; out.push({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: x + 40, y: y - 12, dir: 'down', pose: 'eat', solid: false, talk: () => Story.kabir() }); }
    }
    return out;
  },
  rahulInClass() {
    const d = S.day;
    if (d === 0) return false;
    if (d === 1) return S.flags.proxyTue === 'no';
    return true;
  },

  /* ================= engine hooks ================= */
  onSlot(sl) {
    if (!S || G.mode !== 'play') return;
    if (S.day === 3 && sl >= 2) AU.play('fest');
    else if (S.day === 6 && sl === 0) AU.play('tense');
    else AU.play(sl >= 2 ? 'night' : 'day');
  },
  async canEnter(d) {
    if (d.to === 'lecture' && !this.classAvailable() && S.day <= 3 && S.time >= sec(12) && S.time < sec(13) && !S.seen['lockmsg' + S.day]) { S.seen['lockmsg' + S.day] = 1; }
    return true;
  },
  async onEnter(id) {
    const d = S.day, t = S.time;
    if (id === 'campus') {
      if (d === 0 && !S.flags.proxyAsked && t < sec(12)) return this.rahulProxy();
    }
    if (id === 'lecture' && this.classAvailable()) { await wait(0.3); return this.startClass(); }
    if (id === 'canteen') {
      if (d === 1 && t >= sec(12) && !S.flags.borrowAsked) return this.rahulBorrow();
      if (d === 4 && t >= sec(17) && S.flags.lent && !S.flags.repaid) return this.rahulRepay();
    }
    if (id === 'library' && !S.seen.lib) { S.seen.lib = 1; await wait(0.3); await say('librarian', 'Welcome to the library. Phones on silent. Thoughts on silent. Breathing... quietly.'); }
  },
  afterScript() {
    if (!S || G.mode !== 'play') return;
    if (S.stats.att <= 20 && !S.flags.over) { S.flags.over = true; runScript(() => this.debarred()); return; }
    if (S.stats.energy <= 0 && !G.fainting) { G.fainting = true; runScript(() => this.faint()); }
  },
  tick(dt) {
    const d = S.day, t = S.time;
    if (G.mode !== 'play') return;
    if (d <= 3 && t >= sec(12) && !S.classDone[d] && !S.flags['miss' + d]) return runScript(() => this.missClass());
    if (d === 4 && t >= sec(10) && !S.classDone[4] && !S.flags.missQuiz) return runScript(() => this.missQuiz());
    if (d === 6 && t >= sec(11, 30) && !S.classDone[6]) return runScript(() => this.lateExam());
    if (d === 5 && t >= sec(23) && !S.flags.submitted && !S.flags.warn23) { S.flags.warn23 = 1; notify('Course Portal', 'Assignment closes at 11:59 PM. 59 minutes left. Good luck.'); }
    if (d === 5 && t >= sec(23, 40) && !S.flags.submitted) return runScript(() => this.deadlineCrunch());
    if (d === 5 && t >= sec(13) && G.map.id === 'campus' && !S.flags.satAsked) return runScript(() => this.rahulHelp());
    if (d === 2 && t >= sec(13) && G.map.id === 'campus' && !S.flags.festHint) { S.flags.festHint = 1; notify('Class Group', 'Priya: Fest volunteers needed at the Ground! Free food!!'); }
    if (d === 3 && t >= sec(18) && !S.flags.concertHint) { S.flags.concertHint = 1; notify('UTSAV 2026', 'Concert LIVE at the College Ground. Doors open now!'); }
    if (t >= sec(26) && !(d === 5 && !S.flags.submitted)) return runScript(() => this.forcedSleep());
    if (S.stats.energy <= 0 && !G.fainting) { G.fainting = true; return runScript(() => this.faint()); }
    G.notifT = (G.notifT === undefined ? 50 : G.notifT) - dt;
    if (G.notifT <= 0) { G.notifT = rand(70, 130); const n = pick(NOTIFS); notify(n[0], n[1]); }
  },

  /* ================= MONDAY ================= */
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
    await say('me', '8:40?! Class is at 9! Sharma sir\'s class!', 'shock');
    await say('me', 'The week started four minutes ago and I\'m already losing.', 'tired');
    const k = A('kabir');
    await say('kabir', 'Tu 75% attendance pe hai, right? Live life on the edge, bro.', 'sleep');
    await say('kabir', 'Aur haan, assignment Saturday 11:59 PM. Quiz Friday. Final Sunday. Sweet dreams.', 'sleep');
    emote(k, 'z', 3);
    p.pose = 'stand'; p.expr = 'normal';
    stat({ energy: -5 });
    notify('Calendar', 'This week: Quiz FRI 8 AM · Assignment SAT 11:59 PM · Final SUN');
    UI.hint('<kbd>WASD</kbd>/<kbd>Arrows</kbd> move · <kbd>Shift</kbd> run · <kbd>E</kbd>/<kbd>Space</kbd> interact · <kbd>Esc</kbd> pause', 8);
    AU.play('day');
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
    let c = await ask('rahul', 'Bol na bhai, please? Roll number 42.', ['Theek hai, bas aaj.', 'Nahi bhai, Sharma sir pakad lenge.', 'Kya milega mujhe?']);
    if (c === 2) {
      r.expr = 'happy';
      await say('rahul', 'Canteen pe samosa. Do samose. Plus lifetime dosti. Final offer.', 'happy');
      c = await ask('rahul', 'Deal?', ['Deal. Proxy pakka.', 'Samose se zameer nahi bikta. Nahi.']);
      if (c === 1) c = 1; else { c = 0; S.flags.samosaDeal = true; }
    }
    if (c === 0) {
      S.flags.proxyMon = 'agreed'; rel('rahul', 8); trust(4);
      r.expr = 'happy'; emote(r, 'heart');
      await say('rahul', 'Tu bhagwan hai! Deep voice mein bolna. Mera voice thoda... manly hai.', 'happy');
      stat({ social: 3 });
      logd('Agreed to give Rahul a proxy on Monday');
    } else {
      S.flags.proxyMon = 'refused'; rel('rahul', -6);
      r.expr = 'angry'; emote(r, 'angry');
      await say('rahul', 'Wow. Dosti ka yeh sila. Theek hai... main hi aa jaata hoon. Kal se.', 'angry');
      logd('Refused Rahul\'s Monday proxy');
    }
    await say('rahul', 'Main chala canteen. Ek "important meeting" hai. Samose ke saath.', 'normal');
    G.camTarget = null;
    walk(r, [[T(30), T(18) + 8], [T(41) + 8, T(18) + 8], [T(41) + 8, T(30)]], 90).then(() => despawn('rahul'));
    UI.hint('Lecture Hall 3 is to the <b>north-east</b>. Follow the orange marker on the map.', 6);
  },

  /* ================= CLASS SCENES ================= */
  async startClass() {
    const d = S.day;
    if (d === 4) return this.quiz();
    if (d === 6) return this.exam();
    const m = MAPS.lecture, p = PL();
    S.classDone[d] = true;
    const late = S.time > sec(9, 20);
    // walk to seat
    await walk(p, [[394, 238], [208, 238], [208, 158], [156, 158], [156, 166]], 70);
    p.pose = 'sit'; p.dir = 'up';
    if (d === 0) {
      await wait(0.6);
      const prof = spawn({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: 394, y: 250, dir: 'up', solid: false });
      AU.sfx('door');
      for (const c of CLASSMATES.slice(0, 5)) emote(A(c.id), '!', 1);
      G.camTarget = { x: 208, y: 120 };
      await walk(prof, [[394, 238], [208, 238], [208, 88], [250, 88], [250, 54], [208, 54]], 52);
      face(prof, 'down');
      await say('prof', 'Good morning. Settle down. Phones away. Souls present.');
    } else {
      G.camTarget = { x: 208, y: 120 };
      await wait(0.4);
    }
    const prof = A('prof');
    if (late) { prof.expr = 'sus'; emote(prof, 'sus'); await say('prof', `${S.name}. You are late. Punctuality is very easy. Sit.`, 'sus'); stat({ att: -2 }); prof.expr = 'normal'; }

    if (d === 0) await this.rollMonday(prof);
    if (d === 1) await this.rollTuesday(prof);
    if (d === 2) await this.classWed(prof);
    if (d === 3) await this.classThu(prof);

    // lecture
    await this.lecture(prof, d);
    AU.sfx('bell');
    await say('prof', d === 3 ? 'Quiz tomorrow, 8 AM sharp. Chapters 1 to 9. It is VERY easy.' : 'Assignment due Saturday, 11:59 PM. No extensions. It is very easy.');
    S.counters.veryEasy++;
    for (const c of CLASSMATES) { const a = A(c.id); if (a && chance(0.4)) emote(a, pick(['sweat', '...', '!'])); }
    await wait(0.8);
    stat({ att: 5, acad: 4, energy: -8 });
    await fadeOut(0.6);
    setTime(Math.max(S.time, sec(12)));
    G.camTarget = null; G.board = 0;
    gotoMap('lecture', 208, 228, 'down');
    G.camSnap = true;
    await fadeIn(0.6);
    UI.hint('Class over. Free time! Eat, study, explore — the assignment won\'t write itself.', 5);
  },

  async roll(prof, name, who, reply, opts = {}) {
    bubble(prof, name + '?', 1.4); AU.sfx('blip', 0.65);
    await wait(0.9);
    if (!who) return;
    who.pose = 'raise'; bubble(who, reply, 1.4); AU.sfx('blip', 1.2);
    await wait(1.1);
    who.pose = 'sit';
  },

  async rollMonday(prof) {
    const p = PL();
    await say('prof', 'Attendance. And no one answers for anyone else. I have ears.');
    prof.pose = 'stand';
    await this.roll(prof, 'Aman Gupta', A('aman'), 'Yes sir!');
    await this.roll(prof, 'Bhavna Rao', A('bhavna'), 'Present ma\'am!');
    for (const c of ['aman', 'kunal', 'zoya', 'dev']) emote(A(c), 'haha', 1.2);
    AU.sfx('laugh'); bubble(A('bhavna'), '...sir.', 1.2); await wait(1.1);
    bubble(prof, 'Chirag Jain?', 1.2); await wait(1.0);
    const ch = A('chirag'); emote(ch, 'z', 1.5); await wait(1.0);
    bubble(prof, 'CHIRAG!', 1.0); shake(2); AU.sfx('pop'); await wait(0.5);
    emote(A('kunal'), '!', 1); emote(ch, '!!', 1);
    ch.pose = 'raise'; bubble(ch, 'PRESENT! Yes! Here! Sir!', 1.4); await wait(1.3); ch.pose = 'sit';
    for (const c of ['ishita', 'neha', 'rohit']) emote(A(c), 'haha', 1);
    AU.sfx('laugh');
    await this.roll(prof, S.name, p, 'Yes sir!');
    bubble(prof, 'Rahul Verma?', 1.6); await wait(1.2);
    if (S.flags.proxyMon === 'agreed') {
      for (const c of ['dev', 'neha', 'kunal']) emote(A(c), '...', 1.5);
      const c = await ask('me', 'Rahul\'s roll number. The whole class is suddenly fascinated by the ceiling.', ['Deep voice: "Yes sir."', 'Stay silent. Self-preservation.']);
      if (c === 0) {
        p.pose = 'raise'; bubble(p, 'Yes sir. (deep voice)', 1.6); AU.tone && AU.tone(110, 0.4, 'sawtooth', 0.15); await wait(1.2); p.pose = 'sit';
        prof.expr = 'sus'; emote(prof, '?', 1.6);
        await say('prof', '...Rahul. Your voice is very different today. Puberty, again?', 'sus');
        for (const c2 of ['dev', 'neha', 'kunal', 'arjun']) emote(A(c2), 'haha', 1.2);
        AU.sfx('laugh');
        S.proxyCount++; S.flags.suspicion = 1; rel('rahul', 10); trust(6);
        prof.expr = 'normal';
        logd('Pulled off a deep-voice proxy for Rahul');
      } else {
        await wait(0.8); prof.expr = 'sus';
        await say('prof', 'Absent. As usual. Rahul is a myth, like the syllabus.', 'sus');
        prof.expr = 'normal';
        rel('rahul', -10); S.flags.proxyBailed = true;
        logd('Bailed on the promised proxy');
      }
    } else {
      await wait(0.6);
      await say('prof', 'Absent. As usual. Rahul is a myth, like a quiz with no surprises.');
    }
  },

  async rollTuesday(prof) {
    const p = PL();
    prof.expr = 'sus';
    await say('prof', 'Yesterday, someone was present in two places at once. Quantum attendance.', 'sus');
    if (S.proxyCount > 0) { emote(prof, 'sus', 2); await say('prof', `I am watching you, ${S.name}. Very closely. Very easily.`, 'sus'); emote(p, 'sweat', 2); }
    prof.expr = 'normal';
    await this.roll(prof, 'Aman Gupta', A('aman'), 'Yes sir!');
    await this.roll(prof, 'Chirag Jain', A('chirag'), 'Yes sir! (awake today)');
    await this.roll(prof, S.name, p, 'Present sir!');
    if (S.flags.proxyTue === 'yes') {
      bubble(prof, 'Rahul Verma?', 1.6); await wait(1.2);
      const c = await ask('me', 'Rahul texted you "bro pls" with 14 crying emojis. Here we go again.', ['Deep voice again: "Yes sir."', 'Stay silent this time.']);
      if (c === 0) {
        p.pose = 'raise'; bubble(p, 'Yes sir. (deeper voice)', 1.4); await wait(1.2); p.pose = 'sit';
        prof.expr = 'sus'; emote(prof, '!', 1.4);
        await say('prof', 'Rahul Verma. Stand up. I want to see your face.', 'sus');
        for (const c2 of CLASSMATES) emote(A(c2.id), '!', 1.2);
        const c3 = await ask('me', 'Every head in the room turns toward you. Your heart is doing cardio.', ['Stand up as Rahul. Commit to the bit.', 'Pretend to tie your shoelace.']);
        if (c3 === 0) {
          p.pose = 'stand'; p.dir = 'up';
          const caught = Math.random() < 0.35 + 0.25 * S.proxyCount;
          await wait(0.8);
          if (caught) {
            prof.expr = 'angry'; emote(prof, 'angry', 2);
            await walk(prof, [[208, 88], [208, 158], [170, 158]], 60); faceTo(prof, p);
            await say('prof', `You are Rahul? Then who is ${S.name}? Your twin? Your understudy?`, 'angry');
            AU.sfx('stamp'); shake(6);
            await UI.popup('<div class="stamp">PROXY DETECTED</div><p>Sharma sir marks you <b>absent for three days</b>. The class group chat erupts. You are now a campus legend, for the wrong reasons.</p>', 'Accept your fate', 'paper');
            stat({ att: -15, social: 5, acad: -2 });
            S.flags.caught = true; rel('rahul', 5);
            logd('Got CAUGHT doing a proxy (stood up as Rahul)');
            await walk(prof, [[208, 158], [208, 88], [208, 54]], 70); face(prof, 'down');
          } else {
            prof.expr = 'sus';
            await say('prof', '...Sit down, Rahul. You look different. Did you get a haircut? And a new face?', 'sus');
            for (const c2 of CLASSMATES) if (chance(0.6)) emote(A(c2.id), 'haha', 1.4);
            AU.sfx('laugh');
            S.proxyCount++; rel('rahul', 15); trust(8); stat({ social: 6 });
            logd('Survived a stand-up proxy test. Legendary.');
          }
          p.pose = 'sit'; prof.expr = 'normal';
        } else {
          p.pose = 'sit';
          await say('prof', `Absent then. And ${S.name}, your shoelace is very interesting. You are wearing slippers.`, 'sus');
          stat({ att: -3 }); rel('rahul', -4);
          logd('Faked a shoelace emergency to escape a proxy test');
        }
      } else {
        await wait(0.8); await say('prof', 'Absent. Hmm. At least the voices are consistent today.');
        rel('rahul', -6);
      }
    } else {
      const r = A('rahul');
      bubble(prof, 'Rahul Verma?', 1.2); await wait(0.9);
      if (r) { r.pose = 'raise'; bubble(r, 'Yes sir! (panting) Traffic tha!', 1.6); await wait(1.4); r.pose = 'sit'; await say('prof', 'Traffic. The hostel is 200 metres away, Rahul.'); for (const c of ['aman', 'zoya', 'neha']) emote(A(c), 'haha', 1); AU.sfx('laugh'); }
    }
    // pop question
    await say('prof', `${S.name}. Quick question. What is a Fourier series?`);
    const c = await ask('me', 'Twelve pairs of eyes. One brain cell. Yours.', ['"A sum of sines and cosines, sir."', '"It depends on the boundary conditions."', '"Sir, very easy question. Next?"']);
    if (c === 0) {
      if (S.stats.acad >= 45) { prof.expr = 'happy'; await say('prof', 'Correct! See? Very easy. Someone was listening.', 'happy'); stat({ acad: 4, social: 2 }); S.flags.profImpressed = true; }
      else { await say('me', '"...A sum of sines and... cosines... and... vibes?"', 'shock'); await say('prof', 'Vibes. Fourier is rolling in his grave. Very easily.'); stat({ social: 2 }); }
    } else if (c === 1) {
      if (chance(0.5)) { await say('prof', 'Hmm. Correct, in a way. In a very vague way.'); stat({ acad: 2 }); }
      else { await say('prof', 'Which boundary? The boundary of your knowledge?'); for (const c2 of CLASSMATES) if (chance(0.5)) emote(A(c2.id), 'haha', 1.2); AU.sfx('laugh'); stat({ social: 3 }); }
    } else { await say('prof', 'Then you will find the quiz very easy too. I will remember this.'); for (const c2 of CLASSMATES) emote(A(c2.id), '!', 1); bubble(A('kunal'), 'Ooooooh', 1.4); S.flags.cocky = true; stat({ social: 4 }); }
    prof.expr = 'normal';
  },

  async classWed(prof) {
    await say('prof', 'Half the class is missing. Fest preparations, I am told. The Fourier transform does not care about your fest.');
    await this.roll(prof, 'Aman Gupta', A('aman'), 'Yes sir!');
    await this.roll(prof, S.name, PL(), 'Present!');
    const r = A('rahul');
    if (r) { r.expr = 'happy'; await this.roll(prof, 'Rahul Verma', r, 'PRESENT. In person. Sir.'); if (S.proxyCount > 0) { await say('prof', 'Rahul... in person... His voice is normal today. Interesting.', 'sus'); emote(PL(), 'sweat', 2); } }
  },

  async classThu(prof) {
    await say('prof', 'Fest is tonight. I can see it on your faces. Mostly the dark circles.');
    for (const c of CLASSMATES) { const a = A(c.id); if (a) emote(a, chance(0.5) ? 'z' : '...', 2); }
    await this.roll(prof, S.name, PL(), 'Yes sir... (yawn)');
    const r = A('rahul');
    if (r) { emote(r, 'z', 3); bubble(prof, 'Rahul?', 1); await wait(1.2); bubble(prof, 'Is Rahul... asleep?', 1.4); await wait(1.2); bubble(r, 'Zzz... proxy laga de...', 1.6); await wait(1.4); AU.sfx('laugh'); for (const c of ['aman', 'tanvi']) emote(A(c), 'haha', 1); }
  },

  async lecture(prof, d) {
    const topics = ['Fourier transforms', 'Laplace transforms', 'Convolution', 'Z-transforms'];
    await walk(prof, [[208, 50]], 40); face(prof, 'up');
    for (let i = 1; i <= 9; i++) { G.board = i; AU.sfx('write'); await wait(0.22); }
    face(prof, 'down');
    await say('prof', `Today: ${topics[d]}. Integrate from minus infinity to plus infinity. It is very easy.`);
    S.counters.veryEasy++;
    for (const c of CLASSMATES) { const a = A(c.id); if (a && chance(0.6)) emote(a, pick(['?', '?', '...', 'sweat', 'z']), 2.2); }
    await wait(1.2);
    const c = await ask('me', 'Sharma sir looks directly at you, expecting understanding.', ['Nod confidently like you understand.', 'Actually take notes.', 'Sleep with your eyes open.']);
    const p = PL();
    if (c === 0) { p.pose = 'sit'; emote(p, '!', 1); await say('prof', 'Good. See? Very easy. Your neighbour also nods. Nobody understands, but everyone nods.'); stat({ social: 2, acad: 1 }); S.counters.nods++; }
    else if (c === 1) { p.pose = 'write'; AU.sfx('write'); await wait(1.4); p.pose = 'sit'; stat({ acad: 6, energy: -5 }); S.counters.notes++; }
    else { p.expr = 'sleep'; emote(p, 'z', 2); await wait(1.4); p.expr = 'normal'; if (chance(0.3)) { prof.expr = 'sus'; await say('prof', `${S.name}, are you meditating? This is not yoga class.`, 'sus'); prof.expr = 'normal'; } stat({ energy: 8 }); }
  },

  async missClass() {
    const d = S.day;
    S.flags['miss' + d] = true;
    S.skippedClasses++;
    notify('Hostel Gang', pick(['Rahul: bro Sharma sir took attendance TWICE today', 'Priya: You missed class. Again. Sir asked about you.', 'Kabir: bhai attendance gaya. RIP.']));
    stat({ att: -10 });
    await say('me', d === 0 ? 'I... missed class. On Monday. Day one. Iconic.' : 'Skipped class. My attendance just flinched.', 'tired');
    logd(`Skipped ${DAYS[d]}'s class`);
  },

  /* ================= TUESDAY ================= */
  async rahulBorrow() {
    S.flags.borrowAsked = true;
    const p = PL();
    let r = A('rahul');
    if (!r) r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: 152, y: 112, dir: 'down', talk: () => this.rahulGeneric() });
    r.pose = 'stand'; r.solid = true;
    await walk(r, [[r.x, 150], [p.x + 16, p.y - 4]], 80); faceTo(r, p); faceTo(p, r);
    r.expr = 'happy';
    const prior = S.flags.proxyMon === 'agreed' && !S.flags.proxyBailed ? 'Mere proxy king!' : S.flags.proxyMon === 'refused' ? 'Haan haan, wahi dost jisne proxy nahi lagayi.' : 'Bhai!';
    await say('rahul', `${prior} Ek chhota sa favour...`, 'happy');
    await say('rahul', 'Fest pass lena hai. Thode paise udhaar de de. Friday tak pakka lauta dunga.', 'normal');
    await say('rahul', 'Pinky promise. Mummy promise. Wi-Fi password promise.', 'happy');
    const broke = S.stats.money < 15;
    const c = await ask('rahul', 'Bol na?', [{ t: 'Here, take it.', hint: '-15 Money', dis: broke }, { t: 'Half de sakta hoon.', hint: '-8 Money', dis: S.stats.money < 8 }, 'Bhai main khud udhaar pe zinda hoon.']);
    if (c === 0) { stat({ money: -15 }); S.flags.lent = 15; rel('rahul', 15); trust(10); r.expr = 'happy'; emote(r, 'heart'); await say('rahul', 'Tu asli dost hai! Friday ko interest ke saath. Interest = samosa.', 'happy'); logd('Lent Rahul money for the fest pass'); }
    else if (c === 1) { stat({ money: -8 }); S.flags.lent = 8; rel('rahul', 6); trust(4); await say('rahul', 'Aadha dil, aadha paisa. Chalega. Friday pakka.', 'normal'); logd('Lent Rahul half the money'); }
    else { rel('rahul', -8); r.expr = 'angry'; await say('rahul', 'Theek hai. Mera dil bhi tod de, mera fest bhi.', 'angry'); r.expr = 'normal'; await say('rahul', '...Waise kal proxy chahiye toh? Bata dena. Main message karunga.', 'normal'); logd('Refused to lend Rahul money'); }
    walk(r, [[r.x, 150], [176, 210]], 70).then(() => despawn('rahul'));
  },

  /* ================= WEDNESDAY ================= */
  async priyaVolunteer() {
    const pr = A('priya');
    S.flags.volunteerAsked = true;
    if (S.flags.volunteerDone) { await say('priya', 'The banner looks great. Thanks for helping, seriously.', 'happy'); return; }
    await say('priya', `${S.name}! Perfect timing. Fest committee is short of hands. Banner, lights, chaos.`, 'normal');
    await say('priya', 'Volunteers get free food coupons. And my eternal respect. Mostly the coupons.', 'happy');
    const c = await ask('priya', 'You in?', ['Count me in. Let\'s paint!', 'Can\'t, need to study.', 'Main bas moral support dunga.']);
    if (c === 0) {
      S.flags.volunteer = true; S.flags.volunteerDone = true;
      const p = PL();
      await walk(p, [[T(30) - 8, T(37) + 10]], 60); face(p, 'up'); p.pose = 'paint';
      pr.pose = 'paint'; face(pr, 'up');
      await UI.timeSkip('Painting the fest banner...', 180, 'write');
      p.pose = 'stand'; pr.pose = 'stand'; faceTo(pr, p); faceTo(p, pr);
      if (S.stats.energy < 30) { await say('priya', 'It\'s... beautiful. Though you spelled it "UTSAV 2062". We\'ll call it futuristic.', 'happy'); }
      else await say('priya', 'Look at that! UTSAV 2026, in all its glittery glory.', 'happy');
      stat({ energy: -15, social: 8, money: 10 });
      rel('priya', 15); trust(10);
      await say('priya', 'Here, food coupons. And a VIP pass for tomorrow\'s concert. You earned it.', 'happy');
      floatTxt('VIP Concert Pass!', '#ffd23f');
      logd('Volunteered for the college fest');
    } else if (c === 1) { rel('priya', 3); await say('priya', 'Respect. Somebody has to pass. Go, go.', 'normal'); }
    else { stat({ social: 2 }); await say('priya', 'Moral support. Wow. Put that on your resume.', 'normal'); }
  },

  async meera() {
    const m = A('meera');
    m.pose = 'stand'; faceTo(m, PL());
    await say('meera', 'Oh, hi. Sorry, just practising for tomorrow\'s concert. Too loud?', 'normal');
    const c = await ask('me', 'She is the lead singer of the fest band. Your brain buffers.', ['"That song was really good."', '"Nice weather, na?" (it is 38°C)', 'Panic and walk away.']);
    S.flags.metMeera = true;
    if (c === 0) { m.expr = 'happy'; await say('meera', 'Aww, thanks! Come tomorrow. Front row, okay?', 'happy'); stat({ social: 8 }); S.flags.meeraVibe = 2; logd('Complimented Meera\'s song'); }
    else if (c === 1) { m.expr = 'happy'; await say('meera', 'Haha, 38 degrees of "nice". You\'re funny. I\'m Meera.', 'happy'); stat({ social: 5 }); S.flags.meeraVibe = 1; logd('Said "nice weather" at 38°C to Meera'); }
    else { await say('me', 'You turn around and walk directly into a pole. Smooth.', 'shock'); shake(3); AU.sfx('crash'); stat({ social: -2, energy: -2 }); S.flags.meeraVibe = 0; logd('Panicked in front of Meera'); }
    m.pose = 'guitar'; m.expr = 'normal';
  },

  async findCoupon() {
    S.flags.couponFound = true;
    AU.sfx('coin');
    await say('sys', 'You found a crumpled coupon: "FREE MAGGI. Valid today only. Not valid for Rahul."');
    S.flags.coupon = true; floatTxt('Free Maggi coupon!', '#ffd23f');
    logd('Found a free Maggi coupon');
  },
  async findID() {
    S.flags.idFound = true;
    AU.sfx('pop');
    await say('sys', 'An ID card: "Dr. R.K. Sharma, Professor." The photo is from 1998. He had hair.');
    const c = await ask('me', 'What do you do with it?', ['Return it to Sharma sir.', 'Post it in the group chat. For the memes.']);
    if (c === 0) { S.flags.idKeep = 'return'; UI.hint('Sharma sir is usually near <b>Lecture Hall 3</b> in the afternoon.', 6); }
    else { S.flags.idKeep = 'meme'; S.flags.idReturned = true; stat({ social: 8 }); notify('Class Group', '87 people reacted with laughing faces to your post.'); logd('Posted the professor\'s 1998 ID photo in the group chat'); }
  },
  async returnID() {
    const pr = A('prof');
    if (S.flags.idKeep !== 'return' || S.flags.idReturned) { await say('prof', 'Yes? I am thinking about the quiz. It will be very easy.'); return; }
    S.flags.idReturned = true; S.flags.profFavor = true;
    await say('me', 'Sir, I found your ID card near the library.', 'normal');
    pr.expr = 'happy';
    await say('prof', 'My ID! I had to sign 14 forms to enter my own department. Thank you, beta.', 'happy');
    await say('prof', `I will remember this, ${S.name}. Gratitude is very easy.`, 'happy');
    stat({ social: 4 }); S.counters.veryEasy++;
    logd('Returned Sharma sir\'s lost ID card');
  },

  /* ================= THURSDAY ================= */
  async concert() {
    S.flags.concert = true;
    const p = PL();
    if (!S.flags.volunteer) {
      if (S.stats.money < 10) { await say('guard', 'Ticket 10 rupees. No ticket? No concert. Bas.'); S.flags.concert = false; return; }
      stat({ money: -10 });
    } else { await say('sys', 'You flash your VIP pass. The volunteer at the gate salutes you.'); }
    AU.play('fest'); G.stageLights = true;
    await walk(p, [[T(30), T(33) + 4]], 70); face(p, 'up');
    G.camTarget = { x: T(30), y: T(30) };
    const m = A('meera');
    if (m) { bubble(m, 'Hello UTSAV 2026!!', 2); AU.sfx('cheer'); await wait(1.8); }
    p.pose = 'dance';
    for (const a of G.actors) if (a.name === 'Fan') emote(a, pick(['note', 'heart', '!!']), 2);
    if (S.flags.metMeera && m) {
      await wait(0.6);
      bubble(m, S.flags.meeraVibe === 1 ? 'This one\'s for the person who said "nice weather" at 38 degrees!' : S.flags.meeraVibe === 2 ? `This one\'s for ${S.name}, who liked my song!` : 'This one\'s for the guy who walked into a pole!', 3.2);
      await wait(2.8); emote(p, '!!', 1.6); AU.sfx('cheer'); stat({ social: 5 });
    }
    await UI.timeSkip('Dancing at the UTSAV concert...', Math.max(60, sec(24, 30) - S.time), 'cheer');
    p.pose = 'stand';
    stat({ social: 12, energy: -18 });
    logd('Danced at the UTSAV concert');
    G.stageLights = false; G.camTarget = null;
    const r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: p.x + 40, y: p.y + 10, dir: 'left', expr: 'happy' });
    await walk(r, [[p.x + 16, p.y]], 80); faceTo(p, r);
    await say('rahul', 'BHAI! What a concert! After-party at the night canteen? Maggi + gossip. Chal na!', 'happy');
    const c = await ask('me', 'It\'s past midnight. The quiz is at 8 AM.', ['After-party! YOLO.', 'Go back and sleep. Quiz tomorrow.', 'All-nighter: study for the quiz.']);
    if (c === 0) await this.afterParty();
    else if (c === 1) { await say('rahul', 'Boring! ...Theek hai, padhaku. Goodnight.', 'normal'); walk(r, [[T(41), T(35)]], 80).then(() => despawn('rahul')); UI.hint('Head back to the <b>hostel</b> and sleep.', 5); }
    else { await say('rahul', 'Study? NOW? Tu theek hai na bhai?', 'shock'); despawn('rahul'); await this.allNighter('quiz'); }
  },

  async afterParty() {
    await fadeOut(0.6);
    gotoMap('canteen', 126, 176, 'down');
    const p = PL(); p.pose = 'eat';
    const tb = MAPS.canteen.tables[3];
    spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: tb[0] + 40, y: tb[1] - 12, dir: 'down', pose: 'eat', solid: false });
    spawn({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: tb[0] + 12, y: tb[1] - 12, dir: 'down', pose: 'sit', solid: false });
    for (const a of G.actors) if (a.chatter) a.visible = false;
    setTime(sec(25));
    G.camTarget = { x: 130, y: 160 };
    await fadeIn(0.6);
    await say('bhaiya', 'Raat ke 1 baje. Sirf Maggi. Bas Maggi. Hamesha Maggi.');
    await say('kabir', 'Bro. What if we\'re all just NPCs in someone\'s game?', 'normal');
    await say('rahul', 'Then whoever is playing, please give me attendance.', 'happy');
    await say('kabir', 'And if they\'re playing, why did they choose THIS life? Assignments? Quizzes?', 'normal');
    await say('rahul', `Because ${S.name} has questionable taste.`, 'happy');
    emote(A('rahul'), 'haha'); emote(A('kabir'), 'haha'); AU.sfx('laugh');
    const c = await ask('me', 'Late-night canteen philosophy reaches its peak.', ['"Guys. Real talk. You\'re good friends."', '"The quiz is in 7 hours. I\'m going to cry."', '"Let\'s order another Maggi."']);
    if (c === 0) { rel('rahul', 10); rel('kabir', 10); trust(10); await say('rahul', 'Bhai... emotional mat kar. ...Tu bhi.', 'happy'); logd('Got emotional at the 1 AM canteen'); }
    else if (c === 1) { await say('kabir', 'Crying is just your eyes doing revision.', 'normal'); stat({ social: 3 }); }
    else { S.counters.maggi++; stat({ money: -5, energy: 4 }); await say('bhaiya', 'Ek aur Maggi! Ye bachche kabhi sote nahi kya?'); }
    S.counters.maggi++;
    await UI.timeSkip('Night canteen gossip...', 120, 'laugh');
    stat({ social: 8, energy: -20 });
    S.allNighters++;
    logd('Went to the 3 AM canteen after-party');
    await this.sleepNow(sec(27));
  },

  /* ================= FRIDAY ================= */
  async priyaNotes() {
    const pr = A('priya');
    if (S.flags.notesP) { await say('priya', 'Read the yellow highlights. Yellow = definitely coming.', 'normal'); return; }
    if (S.rel.priya >= 18 && S.friendTrust >= 25) {
      S.flags.notesP = true; pr.expr = 'happy';
      await say('priya', 'Notes? Here. Colour-coded. Don\'t fold the pages. Don\'t breathe on them.', 'happy');
      floatTxt('+ Priya\'s notes (quiz boost)', '#7fb8ff'); stat({ acad: 4 }); rel('priya', 4); S.quizBonus = (S.quizBonus || 0) + 10;
      logd('Borrowed Priya\'s colour-coded notes');
    } else {
      await say('priya', `Notes? ${S.name}, we never once studied together this week. I lend notes to people I know.`, 'normal');
      await say('priya', 'Good luck though. Genuinely.', 'normal');
    }
  },
  async rahulNotes() {
    if (S.flags.notesR) { await say('rahul', 'Bhai the cat is very important. Trust me.', 'tired'); return; }
    S.flags.notesR = true;
    if (S.rel.rahul >= 30) {
      await say('rahul', 'Mere notes le le. Ek formula aur ek billi ki drawing. Both are important.', 'tired');
      S.quizBonus = (S.quizBonus || 0) + 3; floatTxt('+ Rahul\'s notes (1 formula, 1 cat)', '#ffb067');
    } else await say('rahul', 'Notes? Bhai main khud tujhse maangne aaya tha.', 'tired');
  },

  async quiz() {
    const p = PL();
    S.classDone[4] = true;
    AU.play('tense');
    await walk(p, [[394, 238], [208, 238], [208, 158], [156, 158], [156, 166]], 80);
    p.pose = 'sit'; p.dir = 'up';
    const prof = A('prof') || spawn({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: 208, y: 54, dir: 'down', solid: false });
    G.camTarget = { x: 208, y: 130 };
    await say('prof', 'Quiz time. 20 marks. 30 minutes. Phones in bags. Bags in another dimension.');
    await say('prof', 'It is very easy.');
    S.counters.veryEasy++;
    G.papers = [];
    // prof distributes papers walking the aisle
    await walk(prof, [[208, 88]], 70);
    for (const row of [0, 1, 2, 3]) {
      const y = MAPS.lecture.rows[row];
      await walk(prof, [[208, y - 22]], 80);
      for (let i = 0; i < 8; i++) G.papers.push({ x: MAPS.lecture.seatXs[i], y });
      AU.sfx('whoosh'); await wait(0.25);
    }
    await walk(prof, [[208, 88], [208, 54]], 80); face(prof, 'down');
    for (const a of G.actors) if (a.pose === 'sit') a.pose = 'write';
    p.pose = 'write'; p.sweat = S.stats.energy < 40;
    for (let i = 0; i < 4; i++) { const a = A(pick(CLASSMATES).id); if (a) emote(a, pick(['?', 'sweat', '...', '!']), 1.4); AU.sfx('write'); await wait(0.5); }
    const c = await ask('me', 'Question 3: "Prove the obvious." Your pen hovers. Chirag\'s paper is RIGHT there.', ['Glance at Chirag\'s paper.', 'Trust your own brain.', 'Write "refer to textbook".']);
    let bonus = S.quizBonus || 0;
    if (c === 0) { emote(p, '...', 1.2); await wait(1); await say('sys', 'Chirag has drawn a flower and written "I believe in myself". Inspiring. Useless.'); if (chance(0.5)) { prof.expr = 'sus'; await say('prof', `${S.name}. Eyes on your own paper. Very easy instruction.`, 'sus'); prof.expr = 'normal'; bonus -= 4; } else bonus -= 2; logd('Tried to copy from Chirag in the quiz'); }
    else if (c === 1) { bonus += 2; }
    else { bonus += 0; S.flags.referTextbook = true; }
    await walk(prof, [[208, 120], [208, 190], [208, 88], [208, 54]], 40);
    face(prof, 'down');
    AU.sfx('bell');
    await say('prof', 'Pens down! PENS. DOWN. Chirag, that is a pencil. Also down.');
    const raw = S.stats.acad * 0.72 + S.stats.energy * 0.28 + bonus + (S.flags.profFavor ? 5 : 0) + rand(-6, 6) - (S.flags.cocky ? 3 : 0);
    const score = clamp(Math.round(raw / 5), 0, 20);
    S.quiz = score;
    p.sweat = false;
    const comments = score >= 16 ? ['Excellent. Very easy, as I said.', 'A+'] : score >= 12 ? ['Good. Not great. Good.', 'B+'] : score >= 8 ? [S.flags.referTextbook ? 'Hmm. "Refer to textbook" is not an answer.' : 'Average. Very average. Average is very easy.', 'C'] : ['Did you study, or did you "study"? See me after class.', 'D'];
    await UI.popup(`<div class="paper"><div class="ph">QUIZ 1 · SIGNALS & SYSTEMS</div><div class="pn">Name: <u>${S.name}</u></div><div class="score">${score}<small>/20</small></div><div class="grade">${comments[1]}</div><div class="pc">"${comments[0]}" — R.K.S.</div></div>`, 'Collect paper', 'paperpop');
    stat({ acad: Math.round((score - 10) / 2), energy: -6, att: 3 });
    logd(`Scored ${score}/20 in the Friday quiz`);
    for (const a of G.actors) if (a.pose === 'write') a.pose = 'sit';
    await fadeOut(0.5);
    G.papers = []; setTime(Math.max(S.time, sec(10, 30)));
    G.camTarget = null;
    gotoMap('lecture', 208, 228, 'down');
    AU.play('day');
    await fadeIn(0.5);
    const r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: 230, y: 228, dir: 'left', expr: 'tired' });
    await say('rahul', score >= 12 ? `Kitne aaye? ${score}?! Traitor. You studied.` : `Kitne aaye? ${score}? Same pinch. Hum dono ek hi naav mein.`, score >= 12 ? 'shock' : 'happy');
    despawn('rahul');
  },
  async missQuiz() {
    S.flags.missQuiz = true; S.classDone[4] = true; S.quiz = 0;
    notify('Class Group', 'Priya: Quiz is over. Where were you??');
    await say('me', 'I missed the quiz. Sharma sir has awarded me a very easy zero.', 'shock');
    stat({ acad: -8, att: -5 });
    S.skippedClasses++;
    logd('Slept through the 8 AM quiz');
  },
  async rahulRepay() {
    S.flags.repaid = true;
    const r = A('rahul') || spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: 152, y: 120, dir: 'down' });
    r.pose = 'stand';
    await walk(r, [[r.x, 150], [PL().x + 16, PL().y - 4]], 80); faceTo(r, PL()); faceTo(PL(), r);
    if (S.rel.rahul >= 35) {
      r.expr = 'happy';
      await say('rahul', 'Told you Friday! Paise wapas. Plus interest. Interest = ek samosa.', 'happy');
      stat({ money: S.flags.lent + 3, energy: 4 }); S.counters.samosa++; rel('rahul', 5); trust(5);
      logd('Rahul actually repaid you (with a samosa)');
    } else {
      await say('rahul', 'Bhai... paise... "5 minute mein" de dunga. Promise. Monday pakka.', 'tired');
      S.flags.repaid = false; S.flags.repayLater = true;
    }
    walk(r, [[r.x, 150], [176, 210]], 70).then(() => despawn('rahul'));
  },

  /* ================= SATURDAY ================= */
  async rahulHelp() {
    S.flags.satAsked = true;
    const p = PL();
    let r = A('rahul');
    if (!r) { r = spawn({ id: 'rahul', name: 'Rahul', look: LOOKS.rahul, x: p.x - 60, y: p.y, dir: 'right' }); }
    r.expr = 'shock';
    await walk(r, [[p.x - 16, p.y]], 110); faceTo(r, p); faceTo(p, r);
    emote(r, 'sweat', 3);
    await say('rahul', 'BHAI. EMERGENCY. Mera laptop crash ho gaya. Assignment ki file... gayi.', 'shock');
    await say('rahul', 'Bas 2 ghante help kar de. Please. Main tera proxy... I mean, main tera hamesha ehsaanmand rahunga.', 'tired');
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
      await say('rahul', 'Tu asli dost hai. Kal exam ke liye mere notes le. ...Okay, they\'re Priya\'s notes. Maine photo li thi.', 'happy');
      S.examBonus = (S.examBonus || 0) + 5;
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
    notify('Course Portal', 'WARNING: Submission closes in 19 minutes.');
    if (G.map.id !== 'hostel') {
      await say('me', '11:40 PM?! THE ASSIGNMENT!', 'shock');
      await fadeOut(0.3);
      gotoMap('hostel', MAPS.hostel.seats.player.x, MAPS.hostel.seats.player.y, 'up');
      await fadeIn(0.3);
    } else { await walk(p, [[MAPS.hostel.seats.player.x, MAPS.hostel.seats.player.y]], 110); }
    p.dir = 'up'; p.pose = 'type'; p.sweat = true; G.laptopOn = true;
    for (let i = 0; i < 4; i++) { AU.sfx('type'); emote(p, i % 2 ? '!!' : 'sweat', 0.8); await wait(0.6); }
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
      await say('sys', 'Wi-Fi disconnected.', 'shock');
      if (k && S.rel.kabir >= 15) { emote(k, '!'); await say('kabir', 'HOTSPOT! Le, mera hotspot! GO GO GO!', 'shock'); rel('kabir', 5); }
      else { await say('me', 'No Wi-Fi. No hotspot. You climb onto the water tank for one bar of signal.', 'shock'); stat({ energy: -5 }); }
      await say('sys', '99%...... Submitted at 11:59:58 PM.');
      S.flags.submitTime = '11:59:58 PM';
    } else S.flags.submitTime = fmtTime(S.time);
    AU.sfx('fanfare');
    S.flags.submitted = true;
    const raw = S.assignment * 0.62 + S.stats.acad * 0.26 + S.stats.energy * 0.12 + rand(-4, 4);
    S.assignScore = clamp(Math.round(raw), 0, 100);
    p.pose = 'cheer'; p.sweat = false; p.expr = 'happy';
    await UI.popup(`<div class="paper"><div class="ph">COURSE PORTAL · SUBMISSION RECEIPT</div><div class="pn">Signals & Systems · Assignment 3</div><div class="score small">${S.flags.submitTime}</div><div class="pc">Completion: <b>${S.assignment}%</b>${S.assignment < 40 ? ' (3 pages + a sincere apology)' : S.assignment >= 100 ? ' (actually complete?!)' : ''}<br>Grade will be revealed in Semester Wrapped.</div></div>`, 'Breathe', 'paperpop');
    p.pose = 'stand'; p.expr = 'normal'; G.laptopOn = false;
    logd(`Submitted the assignment at ${S.flags.submitTime} (${S.assignment}% done)`);
    if (crunch) AU.play('night');
  },

  /* ================= SUNDAY ================= */
  async exam() {
    const p = PL();
    S.classDone[6] = true;
    AU.play('tense');
    await walk(p, [[394, 238], [208, 238], [208, 158], [156, 158], [156, 166]], 80);
    p.pose = 'sit'; p.dir = 'up';
    const prof = A('prof') || spawn({ id: 'prof', name: 'Prof. Sharma', look: LOOKS.prof, x: 208, y: 54, dir: 'down', solid: false });
    G.camTarget = { x: 208, y: 130 };
    await say('prof', 'Final examination. One question. It has fourteen parts. Each part has sub-parts.');
    await say('prof', 'It is very, very easy.');
    S.counters.veryEasy += 2;
    for (const c of CLASSMATES) { const a = A(c.id); if (a) emote(a, pick(['!!', 'sweat', '...']), 2); }
    await wait(0.6);
    await walk(prof, [[208, 88]], 70);
    for (const row of [0, 1, 2, 3]) { const y = MAPS.lecture.rows[row]; await walk(prof, [[208, y - 22]], 90); for (let i = 0; i < 8; i++) G.papers.push({ x: MAPS.lecture.seatXs[i], y }); AU.sfx('whoosh'); await wait(0.2); }
    await walk(prof, [[208, 88], [208, 54]], 90); face(prof, 'down');
    for (const a of G.actors) if (a.pose === 'sit') a.pose = 'write';
    p.pose = 'write'; p.sweat = true;
    const c = await ask('me', 'Three hours. Your entire week flashes before your eyes.', ['Write everything you know.', 'Write everything you DON\'T know (longer).', 'Draw a diagram. Any diagram. Confidently.']);
    let bonus = S.examBonus || 0;
    if (c === 0) bonus += 2; else if (c === 1) { bonus -= 1; S.flags.longAnswer = true; } else { bonus += chance(0.5) ? 4 : -3; S.flags.diagram = true; }
    await UI.timeSkip('Writing the final exam...', 180, 'write');
    AU.sfx('bell');
    await say('prof', 'Time! Pens down. Pens. Down. Rahul, you cannot "just finish the sentence" for 10 minutes.');
    const raw = S.stats.acad * 0.45 + S.stats.att * 0.15 + S.stats.energy * 0.15 + (S.quiz || 0) * 0.5 + (S.assignScore || 0) * 0.1 + bonus + (S.flags.profFavor ? 4 : 0) + rand(-5, 5) - (S.stats.att < 60 ? 8 : 0);
    S.exam = clamp(Math.round(raw), 0, 100);
    p.sweat = false;
    for (const a of G.actors) if (a.pose === 'write') a.pose = 'sit';
    await wait(0.5);
    await fadeOut(1.2);
    await this.wrapped();
  },
  async lateExam() {
    S.flags.lateExam = true;
    await say('me', 'THE EXAM STARTED AT 9! It\'s 11:30!', 'shock');
    await say('sys', 'You sprint across campus in your pyjamas. Three people take photos.');
    stat({ social: 3, att: -5 });
    S.examBonus = (S.examBonus || 0) - 10;
    logd('Ran to the final exam in pyjamas');
    await fadeOut(0.3);
    S.time = sec(10, 50);
    gotoMap('lecture', 394, 238, 'up');
    await fadeIn(0.3);
    await say('prof', `${S.name}. You have... the time remaining. Which is very little. Sit.`, 'sus');
    await this.exam();
  },

  /* ================= night / sleep / failures ================= */
  async kabir() {
    const k = A('kabir'), d = S.day, t = S.time, sl = slotOf(t);
    const wasPose = k.pose;
    if (k.pose === 'sleep') { emote(k, 'z'); await say('kabir', 'Zzz... five more semesters... zzz', 'sleep'); return; }
    if (sl >= 2 && !S.seen['kabirNight' + d]) {
      S.seen['kabirNight' + d] = 1;
      if (k.pose === 'type') { k.pose = 'stand'; faceTo(k, PL()); }
      const lines = [
        ['Bhai, assignment ka kuch socha? Saturday 11:59. I\'ve started... thinking about starting.', 'normal'],
        ['Rahul ne aaj phir proxy maangi? That man is a professional. He should put it on LinkedIn.', 'happy'],
        ['Fest kal hai. Mera plan: gaming, sleep, gaming. Balanced lifestyle.', 'normal'],
        ['Quiz kal 8 baje. Main alarm nahi lagaunga. Fate decide karegi.', 'normal'],
        ['Assignment kitna hua? Mera 0%. But mentally? 70%.', 'tired'],
        ['Kal final hai. Bhai, it was nice knowing you.', 'normal'],
        ['Final hai, padhai karni chahiye. ...Ek game aur.', 'normal'],
      ];
      await say('kabir', lines[d][0], lines[d][1]);
      const c = await ask('kabir', 'Toh? Kya plan hai?', ['Let\'s work on the assignment together.', 'Deep talk about life.', 'Sleep. Future me ka problem.']);
      if (c === 0) {
        const p = PL();
        await walk(p, [[MAPS.hostel.seats.player.x, MAPS.hostel.seats.player.y]], 70); p.dir = 'up'; p.pose = 'type'; G.laptopOn = true;
        k.x = MAPS.hostel.seats.kabir.x; k.y = MAPS.hostel.seats.kabir.y; k.dir = 'up'; k.pose = 'type';
        await UI.timeSkip('Assignment session with Kabir...', 120, 'type');
        const gain = 9 + Math.round(S.stats.energy / 10);
        S.assignment = clamp(S.assignment + gain, 0, 100); floatTxt(`+${gain}% Assignment`, '#7fb8ff');
        stat({ energy: -10, acad: 3 }); rel('kabir', 8); trust(4); G.laptopOn = false;
        await say('kabir', 'Productive! I fixed the font. You did... everything else.', 'happy');
      } else if (c === 1) {
        await say('kabir', 'Bro. What if attendance is just a social construct? Like money. Or Maggi\'s "2 minutes".', 'normal');
        await say('me', 'Kabir. It\'s 11 PM. Why are you like this.', 'tired');
        await say('kabir', 'Because nobody asks the real questions. Goodnight, philosopher.', 'happy');
        stat({ social: 6, energy: -8 }); rel('kabir', 10); trust(3);
        logd(d === 0 ? 'Had a 2 AM-level deep talk with Kabir on day one' : 'Deep late-night talk with Kabir');
      } else { await say('kabir', 'Wise. Future you is going to hate present you. Classic.', 'normal'); }
      k.pose = wasPose === 'type' ? 'type' : 'stand'; if (k.pose === 'type') k.dir = 'up';
      return;
    }
    const idle = ['Shh, ranked match chal raha hai.', 'Teri chai mein maine elaichi daal di. Sorry not sorry.', 'Bhai light band kar de jab sona ho. Mujhe nahi sona.', 'Did you know the mess sabzi has a fan club? Members: 0.', 'Mera assignment? Haan haan, ho jayega. Kabhi na kabhi.'];
    await say('kabir', pick(idle), 'normal');
  },

  async rahulGeneric() {
    const lines = S.flags.caught ? ['Bhai... Sharma sir ne mujhe dekh ke "Hello, Rahul" bola. With a smile. I\'m scared.', 'We\'re famous now. Infamous. Same thing.'] :
      S.proxyCount > 1 ? ['Proxy king! Tu legend hai. Sharma sir ko pata bhi nahi chala.', 'Bhai tera deep voice viral hai group mein.'] :
      ['5 minute mein aa raha hoon. Matlab... main yahin hoon. Habit hai.', 'Samosa kha. Life ka purpose samajh aayega.', 'Kal se padhai. Pakka. Pinky promise.', 'Ye mystery sabzi hai ya chemistry ka experiment?'];
    await say('rahul', pick(lines), 'happy');
    if (S.flags.samosaDeal && S.flags.proxyMon === 'agreed' && !S.flags.proxyBailed && !S.flags.samosaPaid && S.classDone[0]) {
      S.flags.samosaPaid = true;
      await say('rahul', 'Aur ye le, promise kiya tha. Do samose. Proxy fees.', 'happy');
      S.counters.samosa += 2; stat({ energy: 10 });
    }
    if (S.day === 1 && S.time < sec(12) && !S.flags.proxyTueAsked) {
      S.flags.proxyTueAsked = true;
    }
  },

  async priyaLibrary() {
    const pr = A('priya');
    const c = await ask('priya', pick([`${S.name}? In the library? Voluntarily? Should I call someone?`, 'Hi. I\'m on chapter 6. Of the reference book. For fun.', 'Shh. I\'m building a timetable for my timetable.']), ['Study together (2h)', 'Just saying hi.']);
    if (c === 0) {
      const p = PL();
      const seat = MAPS.library.seats[0];
      await walk(p, [[seat[0], seat[1] - 14], [seat[0], seat[1]]], 70); p.dir = 'down'; p.pose = 'read'; p.bookCol = '#2f8fd0';
      pr.pose = 'read';
      await UI.timeSkip('Studying with Priya...', 120, 'write');
      p.pose = 'stand';
      stat({ acad: 9, energy: -12, social: 3 }); rel('priya', 10); trust(5); S.counters.study++;
      await say('priya', pick(['See? Not that bad. You only asked "is this in the syllabus" four times.', 'You\'re smarter than you pretend to be. Annoying, honestly.', 'Same time tomorrow? I\'ll bring highlighters. Many highlighters.']), 'happy');
      if (!S.flags.priyaStudyLogged) { S.flags.priyaStudyLogged = true; logd('Studied in the library with Priya'); }
    } else await say('priya', 'Hi. Bye. Chapter 7 is calling.', 'normal');
  },

  async allNighter(kind) {
    await fadeOut(0.5);
    gotoMap('hostel', MAPS.hostel.seats.player.x, MAPS.hostel.seats.player.y, 'up');
    const p = PL(); p.pose = 'type'; p.dir = 'up'; G.laptopOn = true;
    await fadeIn(0.5);
    const until = sec(30, 30);
    await UI.timeSkip(kind === 'assign' ? 'All-nighter: assignment grind...' : 'All-nighter: cramming...', until - S.time, 'type');
    S.allNighters++;
    if (kind === 'assign') { const g = 28 + Math.round(S.stats.acad / 12); S.assignment = clamp(S.assignment + g, 0, 100); floatTxt(`+${g}% Assignment`, '#7fb8ff'); stat({ energy: -30, acad: 4 }); }
    else stat({ acad: 15, energy: -30 });
    logd(kind === 'assign' ? 'Pulled an all-nighter on the assignment' : 'Pulled an all-nighter cramming');
    G.laptopOn = false;
    // new morning without sleep
    await Game.morningAfterAllNighter();
  },

  async sleepNow(at) {
    // put the player to bed and roll to next day
    await fadeOut(0.6);
    gotoMap('hostel', MAPS.hostel.beds.player.x, MAPS.hostel.beds.player.y, 'down');
    const p = PL(); p.pose = 'sleep'; p.expr = 'sleep';
    await fadeIn(0.5);
    await wait(1.2);
    await Game.endDay(at || S.time);
  },

  async forcedSleep() {
    const p = PL();
    p.pose = 'tired'; p.expr = 'tired'; emote(p, 'z', 2);
    await say('me', 'It\'s 2 AM. My body has filed a formal complaint.', 'tired');
    const c = await ask('me', 'Your eyelids weigh 40 kilos each.', ['Go to bed. Now.', 'All-nighter. (study till dawn)']);
    if (c === 1) return this.allNighter(S.day === 5 || (S.day === 4 && !S.flags.submitted) ? 'assign' : 'study');
    S.flags.lateSleep = true;
    return this.sleepNow(S.time);
  },

  async faint() {
    const p = PL();
    p.pose = 'faint'; AU.sfx('crash'); shake(4);
    emote(p, 'star', 2);
    S.counters.faints++;
    await wait(1.2);
    await say('sys', 'Your energy hit zero. You fainted. Dramatically.');
    await fadeOut(0.8);
    gotoMap('hostel', MAPS.hostel.beds.player.x, MAPS.hostel.beds.player.y, 'down');
    p.pose = 'sleep'; p.expr = 'sleep';
    addTime(180);
    await fadeIn(0.8);
    await wait(0.6);
    p.pose = 'stand'; p.x = 46; p.y = 86; p.expr = 'tired';
    let k = A('kabir');
    if (!k) k = spawn({ id: 'kabir', name: 'Kabir', look: LOOKS.kabir, x: 140, y: 110, dir: 'left' });
    faceTo(k, p);
    await say('kabir', 'Bhai tu library ki seedhiyon pe so raha tha. Main tujhe utha ke laaya. Tu heavy hai.', 'normal');
    S.stats.energy = 30; UI.flashStat('energy', true);
    rel('kabir', 5);
    logd('Fainted from exhaustion. Kabir carried you home.');
    G.fainting = false;
  },

  async debarred() {
    G.mode = 'over';
    await say('prof', `${S.name}. Your attendance is ${S.stats.att}%. That is not attendance. That is a rumour.`, 'angry');
    UI.goStamp = 'DEBARRED';
    UI.gameOver('DEBARRED', `Your attendance dropped to ${S.stats.att}%. Your parents have been informed. Your cousin's success story is now twice as annoying.`);
    safeStore('del', 'campusexe.save');
  },

  /* ================= ENDING ================= */
  async wrapped() {
    G.mode = 'over';
    const st = S.stats, q = S.quiz || 0, as = S.assignScore || 0, ex = S.exam || 0;
    const total = q * 5 * 0.2 + as * 0.3 + ex * 0.5;
    const sgpa = clamp(Math.round(total / 10 * 10) / 10 + (st.att >= 75 ? 0.3 : -0.5), 0, 10).toFixed(1);
    const grade = (v) => v >= 85 ? 'A+' : v >= 75 ? 'A' : v >= 62 ? 'B' : v >= 50 ? 'C' : v >= 40 ? 'D' : 'F';
    // title
    let title, sub;
    if (S.proxyCount >= 2 || (S.flags.caught && S.proxyCount >= 1)) { title = 'Professional Proxy Negotiator'; sub = 'Present in two places. Absent in none. Wanted in one.'; }
    else if (S.allNighters >= 2) { title = 'Assignment Submitted at 11:59 PM'; sub = 'Sleep is a social construct. So is your skin care routine.'; }
    else if (st.social >= 70 && st.acad < 50) { title = 'Fest Legend, Academic Casualty'; sub = 'Everyone knows your name. Including the exam department.'; }
    else if (st.acad >= 70 && st.social < 45) { title = 'Library Hermit'; sub = 'The librarian knows your order. The books know your secrets.'; }
    else if (S.skippedClasses >= 3) { title = 'Attendance Is a Social Construct'; sub = 'You believed it. Sharma sir did not.'; }
    else if (st.money <= 10) { title = 'Professionally Broke'; sub = 'Rich in memories. Poor in literally everything else.'; }
    else if (S.flags.helpedRahul && S.friendTrust >= 60) { title = 'The Real One'; sub = 'You saved a friend on deadline day. Legends will speak of this.'; }
    else if (st.acad >= 45 && st.social >= 45 && st.att >= 60 && st.energy >= 20) { title = 'Hostel Legend, Academic Survivor'; sub = 'Balanced. Like a canteen tray carrying four chais.'; }
    else { title = 'Certified Survivor of Week One'; sub = 'You made it. Barely. That\'s the college experience.'; }
    S.title = title;
    const persName = { owl: 'Night Owl', topper: 'Topper Wannabe', broke: 'Broke but Popular' }[S.pers];
    const decisions = S.decisions.slice(-8);
    const bar = (k, label) => `<div class="wrow"><span>${label}</span><div class="wbar"><i data-v="${st[k]}" style="background:${STAT_META[k].col}"></i></div><b>${st[k]}</b></div>`;
    const steps = Math.round(S.counters.steps);
    const funny = [
      ['steps walked', steps, steps > 3000 ? 'mostly to the canteen' : 'mostly to bed'],
      ['times you heard "very easy"', S.counters.veryEasy, 'it was never easy'],
      ['Maggi & samosas eaten', S.counters.maggi + S.counters.samosa, 'a balanced diet'],
      ['chai consumed', S.counters.chai, 'blood type: chai+'],
      ['proxies given', S.proxyCount, S.proxyCount ? 'voice actor of the year' : 'clean record'],
      ['all-nighters', S.allNighters, S.allNighters ? 'the sun saw you twice' : 'you actually slept?!'],
      ['classes skipped', S.skippedClasses, S.skippedClasses ? 'the bench missed you' : 'perfect-ish'],
      ['money spent', S.counters.spent, 'Rahul owes you some'],
    ];
    const slides = [
      { cls: 'w-intro', sfx: 'fanfare', html: `<div class="wk">SEMESTER WRAPPED</div><h2>${S.name}, your week was&hellip; a lot.</h2><p>${persName} · 7 days · 47 things due · 1 Sharma sir</p><canvas class="wchar" width="240" height="240" data-pose="dance"></canvas><p class="tap">Press <kbd>E</kbd> or tap Next</p>` },
      { cls: 'w-stats', html: `<div class="wk">FINAL STATS</div><h2>How you're leaving Sunday</h2>${bar('acad', 'Academics')}${bar('att', 'Attendance')}${bar('energy', 'Energy')}${bar('money', 'Money')}${bar('social', 'Social')}<p class="small">Friend trust: <b>${S.friendTrust}</b> · Rahul: <b>${S.rel.rahul}</b> · Priya: <b>${S.rel.priya}</b> · Kabir: <b>${S.rel.kabir}</b></p>` },
      { cls: 'w-grades', html: `<div class="wk">THE GRADES</div><h2>Report card (unofficial, extremely real)</h2><div class="grades"><div><span>Friday quiz</span><b><i class="count" data-v="${q}">0</i>/20</b><em>${grade(q * 5)}</em></div><div><span>Assignment</span><b><i class="count" data-v="${as}">0</i>%</b><em>${grade(as)}</em></div><div><span>Final exam</span><b><i class="count" data-v="${ex}">0</i>%</b><em>${grade(ex)}</em></div></div><div class="sgpa">SGPA <b>${sgpa}</b></div><p class="small">${st.att < 75 ? 'Attendance below 75%: a "detention warning" letter is on its way home.' : 'Attendance above 75%. Sharma sir nods at you. Slightly.'}</p>` },
      { cls: 'w-funny', html: `<div class="wk">BY THE NUMBERS</div><h2>Your week, quantified</h2><div class="fun">${funny.map(([l, v, c]) => `<div><b class="count" data-v="${v}">0</b><span>${l}</span><em>${c}</em></div>`).join('')}</div>` },
      { cls: 'w-dec', html: `<div class="wk">NOTABLE DECISIONS</div><h2>The choices that made you</h2><ul class="decs">${decisions.length ? decisions.map((x) => `<li><span>${DAY_SHORT[x.d]}</span>${x.s}</li>`).join('') : '<li><span>—</span>You did... remarkably little. Peaceful.</li>'}</ul>` },
      { cls: 'w-title', sfx: 'cheer', html: `<div class="wk">YOUR TITLE</div><canvas class="wchar" width="300" height="300" data-pose="cheer" data-friends="1"></canvas><h1>${title}</h1><p>${sub}</p><div class="wbtns"><button data-act="again" class="primary">Play again</button><button data-act="title">Back to title</button></div>` },
    ];
    safeStore('del', 'campusexe.save');
    UI.wrapped({ slides });
  },
};

/* ================= ACTIONS (object interactions) ================= */
const Act = {
  async sleep() {
    const night = S.time >= sec(21) || S.time < sec(5);
    const p = PL();
    if (S.day === 5 && !S.flags.submitted && S.time >= sec(20)) {
      const c = await ask('me', 'The assignment is due at 11:59 PM. Sleeping now means submitting nothing.', ['Submit what I have, then sleep.', 'Keep working.']);
      if (c === 1) return;
      await this.desk(true);
      if (!S.flags.submitted) return;
    }
    if (!night) {
      if ((S.flags['naps' + S.day] || 0) >= 2) { await say('me', 'I\'ve napped twice today. Even my pillow is judging me.', 'tired'); return; }
      const c = await ask('me', 'A nap sounds incredible right now.', ['Nap for 2 hours.', 'Nah, stay awake.']);
      if (c === 1) return;
      S.flags['naps' + S.day] = (S.flags['naps' + S.day] || 0) + 1;
      p.x = MAPS.hostel.beds.player.x; p.y = MAPS.hostel.beds.player.y; p.pose = 'sleep'; p.expr = 'sleep'; p.bedW = 38;
      AU.sfx('snore');
      await UI.timeSkip('Napping...', 120, 'snore');
      p.pose = 'stand'; p.x = 46; p.y = 86; p.expr = 'normal'; p.dir = 'down';
      stat({ energy: 25 }); S.counters.naps++;
      if (S.counters.naps === 3) logd('Became a professional napper (3+ naps)');
      return;
    }
    const c = await ask('me', 'Call it a day?', ['Sleep till morning.', 'Not yet.']);
    if (c === 1) return;
    p.x = MAPS.hostel.beds.player.x; p.y = MAPS.hostel.beds.player.y; p.pose = 'sleep'; p.expr = 'sleep'; p.bedW = 38;
    const k = A('kabir');
    if (k && k.pose !== 'sleep') { await wait(0.5); bubble(k, pick(['Goodnight bro. Main bas ek game aur...', 'Light band kar de... oh wait, mera monitor hai.', 'Sweet dreams. Of Fourier.']), 2.5); }
    await wait(1.5);
    await Game.endDay(S.time);
  },

  async desk(forceSubmit) {
    const p = PL(), m = MAPS.hostel;
    if (S.stats.energy < 8 && !forceSubmit) { await say('me', 'Too tired to look at a screen. The screen is too tired to look at me.', 'tired'); return; }
    await walk(p, [[m.seats.player.x, m.seats.player.y]], 70); p.dir = 'up'; p.pose = 'type'; G.laptopOn = true;
    const late = S.time >= sec(22) && S.time < sec(26);
    const opts = [];
    const sub = !S.flags.submitted;
    const satLeft = S.day === 5 && sub ? sec(23, 40) - S.time : 999;
    if (!forceSubmit) {
      if (sub && satLeft >= 30) opts.push({ t: satLeft < 120 ? 'Final sprint (until the deadline)' : 'Work on the assignment (2h)', hint: `${S.assignment}% done`, k: 'assign' });
      opts.push({ t: 'Study / revise (2h)', hint: '+Acad -Energy', k: 'study' });
      if (late && !(S.day === 5 && sub)) opts.push({ t: 'Pull an all-nighter', hint: 'till dawn', k: 'allnight' });
      opts.push({ t: 'Doomscroll reels (1h)', hint: 'it\'s research', k: 'reels' });
    }
    if (sub && (S.day >= 4 || S.assignment >= 100 || forceSubmit)) opts.push({ t: `Submit assignment now (${S.assignment}%)`, k: 'submit' });
    opts.push({ t: 'Close the laptop', k: 'close' });
    const c = await ask('sys', `Laptop open. ${sub ? 'Assignment: ' + S.assignment + '%.' : 'Assignment submitted. Freedom.'} Battery: ${irand(4, 31)}%.`, opts);
    const k = opts[c].k;
    if (k === 'assign') {
      const mins = Math.min(120, satLeft);
      await UI.timeSkip('Working on the assignment...', mins, 'type');
      const gain = Math.round(mins / 120 * Math.max(6, 8 + Math.round(S.stats.energy / 8) + Math.round(S.stats.acad / 12)));
      S.assignment = clamp(S.assignment + gain, 0, 100);
      floatTxt(`+${gain}% Assignment`, '#7fb8ff');
      stat({ energy: -12, acad: 3 });
      p.expr = S.assignment >= 100 ? 'happy' : 'tired';
      if (S.assignment >= 100) await say('me', 'It\'s... done? It\'s DONE. Who am I?!', 'happy');
      else if (chance(0.4)) await say('me', pick(['Wrote 300 words. Deleted 280. Progress.', 'Stack Overflow, you beautiful beast.', 'Changed the font size to 12.5. Nobody will notice.']), 'tired');
      p.expr = 'normal';
    } else if (k === 'study') {
      p.pose = 'read'; p.dir = 'up';
      await UI.timeSkip('Studying at your desk...', 120, 'write');
      stat({ acad: 10, energy: -15, social: -2 }); S.counters.study++;
    } else if (k === 'allnight') {
      const kind = !S.flags.submitted && (S.day >= 3) ? 'assign' : 'study';
      G.laptopOn = false;
      return Story.allNighter(kind);
    } else if (k === 'reels') {
      await UI.timeSkip('Watching "educational" reels...', 60, 'pop');
      stat({ social: 3, energy: -3, acad: -1 });
      await say('me', pick(['Learned 14 life hacks. Remember zero.', 'Watched a cat play piano for 40 minutes. Worth it.', 'Saw a reel about time management. Took an hour.']), 'normal');
    } else if (k === 'submit') {
      await Story.submitFlow(false);
    }
    G.laptopOn = false; p.pose = 'stand';
  },

  async alarmClock() {
    if (G.alarmFallen) { G.alarmFallen = false; await say('me', 'You put the alarm clock back. It looks at you with betrayal.', 'normal'); return; }
    const c = await ask('sys', `Alarm clock set for ${fmtTime(S.flags.alarm || sec(7))}.`, ['Set it for 6:30 AM (be productive).', 'Keep 7:00 AM.', 'Set it for 8:00 AM (live dangerously).']);
    S.flags.alarm = [sec(6, 30), sec(7), sec(8)][c];
    await say('me', ['6:30 AM. Future me will thank me. Or sue me.', '7 AM. The classic.', '8 AM. Breakfast is a myth anyway.'][c], 'normal');
  },
  async bath() {
    if (S.flags['bath' + S.day]) { await say('me', 'Already had a bucket bath today. Water ration: exhausted.', 'normal'); return; }
    S.flags['bath' + S.day] = true;
    await UI.timeSkip('Bucket bath (cold water, hot regrets)...', 30, 'whoosh');
    stat({ energy: 6, social: 3 });
    await say('me', 'Fresh. Smelling like Lifebuoy and ambition.', 'happy');
  },
  async guitar() {
    PL().pose = 'stand';
    await UI.timeSkip('Strumming the only 3 chords you know...', 30, 'pop');
    stat({ social: 2, energy: 2 });
    const k = A('kabir'); if (k && k.pose !== 'sleep') { emote(k, 'note'); await say('kabir', 'Wonderwall? Bhai, every guitar in India is tired of Wonderwall.', 'happy'); }
  },
  async window() {
    const t = S.time;
    const line = t < sec(12) ? 'Sunlight. Birds. Someone yelling "Bhaiya, Maggi!" from the canteen.' : t < sec(17) ? 'The afternoon sun cooks the campus like a samosa.' : t < sec(21) ? 'Orange sky. The fest lights blink. Somewhere, a proxy is being negotiated.' : 'The campus is asleep. Except the canteen, Kabir, and your anxiety.';
    await say('sys', line);
  },
  async notice() {
    const fest = S.day >= 2 ? '<li><b>UTSAV 2026</b> concert — Thursday night, College Ground</li>' : '<li><b>UTSAV 2026</b> — volunteers needed (ask Priya)</li>';
    await UI.popup(`<div class="board"><h3>NOTICE BOARD</h3><ul><li><b>QUIZ</b> — Friday 8:00 AM, LH-3. "It will be very easy." — R.K.S.</li><li><b>ASSIGNMENT 3</b> due Saturday 11:59 PM. No extensions. No excuses. No.</li>${fest}<li><b>FINAL EXAM</b> — Sunday 9:00 AM</li><li class="lost">LOST: sense of purpose. If found, return to 2nd year hostel.</li><li class="lost">FOUND: one slipper. Left. Contact Guard Uncle.</li></ul></div>`, 'Close', 'boardpop');
  },
  async cooler() {
    if (S.flags['water' + S.day + slotOf(S.time)]) { await say('sys', 'You already drank. The cooler hums disapprovingly.'); return; }
    S.flags['water' + S.day + slotOf(S.time)] = 1;
    await say('sys', 'Water from the campus cooler. Tastes like 2009 and iron.');
    stat({ energy: 2 });
  },
  async chaiTapri() {
    const c = await ask({ name: 'Chai Wala', look: studentLook(777), bg: '#7a4a2a' }, pick(['Garam chai! Adrak wali! 10 rupaye.', 'Chai piyo, tension mat lo. Ya dono karo.', 'Exam ka tension? Chai. Breakup? Chai. Fest? Do chai.']), [{ t: 'One chai, please.', hint: '-3 Money · +5 Energy', dis: S.stats.money < 3 }, 'Just here for the gossip.', 'Leave.']);
    if (c === 0) { PL().pose = 'stand'; await UI.timeSkip('Sipping cutting chai...', 15, 'eat'); stat({ money: -3, energy: 5 }); S.counters.chai++; if (S.counters.chai === 3) logd('Drank 3+ chais (a lifestyle)'); }
    else if (c === 1) await say({ name: 'Chai Wala', look: studentLook(777), bg: '#7a4a2a' }, pick(['Suna hai Sharma sir 1998 se "very easy" bol rahe hain.', 'Rahul ke 6 udhaar abhi tak pending hain. 6!', 'Library wali madam ne kal ek bachche ko sirf dekh ke silent kar diya.', 'Concert mein Meera gaati hai. Poora campus aata hai.']));
  },
  async fountain() {
    if (S.stats.money < 1) { await say('me', 'No coins. Not even for wishes. That\'s tragic.', 'tired'); return; }
    stat({ money: -1 });
    AU.sfx('coin');
    const r = Math.random();
    if (r < 0.15) { await say('sys', 'The coin lands perfectly. You feel... smarter? Probably placebo.'); stat({ acad: 4 }); }
    else if (r < 0.3) { await say('sys', 'A frog jumps out. Then back in. A sign? Of what? Unclear.'); stat({ social: 2 }); }
    else await say('sys', pick(['You wish for 75% attendance. The fountain gurgles: "No."', 'You wish for an extension. The fountain is not Sharma sir.', 'You wish for Maggi. The fountain is not Pappu Bhaiya either.']));
  },
  async dog() {
    if (S.flags['dog' + S.day]) { await say('sys', 'The dog is still asleep. Respect the dog.'); return; }
    S.flags['dog' + S.day] = 1;
    await say('sys', 'The dog opens one eye, sees you, and goes back to sleep. Honestly? Same.');
    stat({ social: 1, energy: 1 });
  },
  async cow() {
    await say('sys', pick(['Moo. (The cow has better attendance than you.)', 'The cow chews thoughtfully. It has never had a deadline.', 'Moo. (Translation: "Fourier was a fraud.")']));
  },
  async gate() {
    await say('guard', pick(['Bahar jaana hai? Outpass dikhao. Nahi hai? Toh andar hi raho, beta.', 'Week khatam hone tak koi bahar nahi jaayega. Order hai.', 'Rahul ko dekha? Usne mera stool udhaar liya tha 2023 mein.']));
  },
  async cycles() { await say('sys', 'Your cycle. Flat tyre since first year. It\'s decorative now.'); },
  async bench() {
    const p = PL();
    p.pose = 'sit'; p.dir = 'down';
    await UI.timeSkip('Chilling on a bench...', 30, null);
    stat({ energy: 4 });
    if (chance(0.35)) {
      const look = studentLook(irand(600, 700));
      await say({ name: 'Random Senior', look }, pick(['First year? Tip: never trust "very easy".', 'Proxy tip: never stand up. Never.', 'The assignment? Start Friday. Panic Saturday. Classic.', 'Canteen bhaiya ka Maggi > life advice.']));
      stat({ social: 3 });
    }
    p.pose = 'stand';
  },
  async banner() {
    if (S.flags.volunteer) await say('me', 'My masterpiece. Glitter everywhere. Some on my soul.', 'happy');
    else await say('sys', 'A half-painted banner. "UTS_V 20_6". Priya is organising volunteers nearby.');
  },
  async chaat() {
    const c = await ask({ name: 'Chaat Wala', look: studentLook(170), bg: '#e2533d' }, 'Golgappe! Papdi chaat! Teekha ya extra teekha?', [{ t: 'Golgappe plate', hint: '-8 Money · +12 Energy', dis: S.stats.money < 8 }, 'Just looking.']);
    if (c === 0) { stat({ money: -8, energy: 12, social: 4 }); S.counters.maggi++; await say('me', 'Extra teekha. My soul left my body. Worth it.', 'shock'); }
  },
  async ringToss() {
    if (S.stats.money < 5) { await say({ name: 'Game Wala', look: studentLook(171) }, 'Paise nahi? Toh ring bhi nahi.'); return; }
    stat({ money: -5 });
    const p = PL(); p.pose = 'point';
    let hits = 0;
    for (let i = 0; i < 3; i++) { AU.sfx('whoosh'); await wait(0.5); const h = chance(0.4); if (h) { hits++; AU.sfx('coin'); emote(p, '!'); } else emote(p, '...'); await wait(0.5); }
    p.pose = 'stand';
    if (hits >= 2) { await say('sys', 'You won a GIANT TEDDY. It is bigger than your future.'); stat({ social: 6 }); logd('Won a giant teddy at ring toss'); }
    else if (hits === 1) { await say('sys', 'You won a keychain shaped like a samosa.'); stat({ social: 2 }); }
    else await say('sys', 'Zero rings. The game is rigged. (It is.)');
  },
  async order() {
    const p = PL(), m = MAPS.canteen;
    if (G.map.id !== 'canteen') return;
    await walk(p, [[m.counterSpot.x, m.counterSpot.y]], 70); p.dir = 'up';
    const night = S.time >= sec(22);
    const opts = [];
    if (S.flags.coupon) opts.push({ t: 'Use FREE MAGGI coupon', hint: '+10 Energy +5 Social', k: 'free' });
    if (!night) opts.push({ t: 'Samosa · ₹15', hint: '-5 Money · +6 Energy', k: 'samosa', dis: S.stats.money < 5 });
    opts.push({ t: 'Maggi · ₹40', hint: '-10 Money · +10 Energy · +5 Social', k: 'maggi', dis: S.stats.money < 10 });
    opts.push({ t: 'Chai · ₹10', hint: '-3 Money · +5 Energy', k: 'chai', dis: S.stats.money < 3 });
    if (!night) opts.push({ t: 'Thali · ₹60 (Mystery Sabzi)', hint: '-12 Money · ???', k: 'thali', dis: S.stats.money < 12 });
    opts.push({ t: 'Nothing. Just vibing.', k: 'none' });
    const greet = night ? 'Raat ko sirf Maggi aur chai. Bas.' : S.stats.money < 10 ? 'Paise kam hain? Udhaar band hai. Rahul ki wajah se.' : pick(['Haan bolo! Aaj ka special: Mystery Sabzi. Mystery mujhe bhi nahi pata.', 'Kya chahiye? Samosa garam hai. Chai aur garam.', 'Bolo bolo, line lambi hai. (There is no line.)']);
    const c = await ask('bhaiya', greet, opts);
    const k = opts[c].k;
    if (k === 'none') { await say('bhaiya', 'Vibing ka bhi charge lagega agle saal se.'); return; }
    const eff = { free: { energy: 10, social: 5 }, samosa: { money: -5, energy: 6, social: 2 }, maggi: { money: -10, energy: 10, social: 5 }, chai: { money: -3, energy: 5 }, thali: { money: -12 } }[k];
    if (k === 'free') S.flags.coupon = false;
    // go sit and eat
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
    p.pose = 'stand'; p.y = 166;
  },
  async libStudy() {
    const p = PL(), m = MAPS.library;
    if (S.stats.energy < 8) { await say('me', 'If I open a book now, I will fall asleep inside it.', 'tired'); return; }
    await walk(p, [[m.playerSeat.x, m.playerSeat.y - 14], [m.playerSeat.x, m.playerSeat.y]], 70);
    p.dir = 'down'; p.pose = 'read'; p.bookCol = pick(['#2f8fd0', '#c0392b', '#7a5cc4']);
    await UI.timeSkip('Studying in the library...', 120, 'write');
    let eff = { acad: 9, energy: -12, social: -2 };
    S.counters.study++;
    const r = Math.random();
    if (r < 0.15) { await say('sys', 'You find a senior\'s notes tucked inside the book. Handwritten. Blessed.'); eff.acad += 6; logd('Found a senior\'s secret notes in the library'); }
    else if (r < 0.3) { p.pose = 'sleep'; p.pose = 'read'; p.expr = 'sleep'; await say('sys', 'You fell asleep on page 42. Drooled on a formula. Absorbed it, maybe.'); eff = { acad: 5, energy: 8 }; p.expr = 'normal'; }
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
    stat({ acad: 2 });
  },
  async librarian() {
    await say('librarian', pick(['Books issued: zero. Very suspicious behaviour for a student.', 'If I hear one more "bro" in this library...', 'The Wi-Fi password is "SilencePlease123". Don\'t tell anyone.', `Ah, ${S.name}. Your face looks like an all-nighter is coming.`]));
  },
  async register() {
    const pc = S.stats.att;
    await UI.popup(`<div class="paper"><div class="ph">ATTENDANCE REGISTER · LH-3</div><div class="pn">Roll ${irand(10, 60)} · ${S.name}</div><div class="score">${pc}<small>%</small></div><div class="pc">${pc >= 75 ? 'Safe. For now.' : pc >= 50 ? 'Danger zone. Sharma sir has circled your name. In red. Twice.' : 'Your name is underlined, circled, and has a small skull next to it.'}${S.proxyCount ? '<br>Rahul\'s row has a suspicious amount of ticks.' : ''}</div></div>`, 'Close it quickly', 'paperpop');
  },
  async emptySeat() {
    const p = PL(); const m = MAPS.lecture;
    await walk(p, [[m.playerSeat.x, m.playerSeat.y - 6], [m.playerSeat.x, m.playerSeat.y]], 70); p.pose = 'sit'; p.dir = 'up';
    await UI.timeSkip('Sitting in an empty lecture hall...', 20, null);
    await say('me', 'Empty classroom. Peaceful. Suspiciously peaceful. Like a trap.', 'normal');
    stat({ energy: 2 });
    p.pose = 'stand'; p.y = m.playerSeat.y - 8;
  },
  async board() {
    await say('sys', pick(['The board says: "VERY EASY" — underlined three times.', 'Leftover formula on the board. You understand 1 of the 9 symbols.', 'Someone drew a tiny Sharma sir in the corner. He has hair in the drawing.']));
  },
};

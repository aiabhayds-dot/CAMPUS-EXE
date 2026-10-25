'use strict';
/* ===== Daily tasks (notebook), lecture timetable + warnings, attendance ledger ===== */

/* Where each location sits on the campus map (for navigation markers + travel time) */
function locPos(id) {
  const B = (k) => ({ x: T(BUILDINGS[k].door) + 8, y: T(BUILDINGS[k].y + BUILDINGS[k].h) + 6 });
  switch (id) {
    case 'hostel': case 'room': return B('hostel');
    case 'lecture': return B('lecture');
    case 'library': return B('library');
    case 'canteen': return B('canteen');
    case 'court': return { x: T(9), y: T(37) + 8 };
    case 'plaza': return { x: T(30) + 8, y: T(16) };
    case 'stage': case 'ground': return { x: T(30), y: T(31) };
    case 'chai': return { x: T(57) + 8, y: T(20) + 10 };
    case 'gate': return { x: 20, y: T(18) + 8 };
  }
  return null;
}
/* Which location the player is currently in (interiors map to their building) */
/* estimated walking route in world px from the player to a location's campus point.
   Campus paths are roughly orthogonal roads (long trips go via the main road), +8% for detours;
   from inside a building add the walk to its exit door. */
function routePx(locId) {
  const dst = locPos(locId);
  let x = G.player.x, y = G.player.y, extra = 0;
  if (G.map.id !== 'campus') {
    const d = G.map.doors.find((q) => q.to === 'campus');
    if (d) extra = Math.abs(d.x + d.w / 2 - x) + Math.abs(d.y + d.h / 2 - y);
    const b = BUILDINGS[G.map.id]; const p = b ? { x: T(b.door) + 8, y: T(b.y + b.h) + 8 } : locPos('hostel'); x = p.x; y = p.y;
  }
  // long trips use the main road (y ≈ T(18)+8): down to it, along it, up from it
  const ROAD = T(18) + 8;
  const campus = Math.abs(dst.x - x) > 64 ? Math.abs(dst.x - x) + Math.abs(y - ROAD) + Math.abs(dst.y - ROAD) : Math.abs(dst.x - x) + Math.abs(dst.y - y);
  return campus * 1.08 + extra;
}
function playerLoc() {
  if (!G.map) return null;
  if (G.map.id !== 'campus') return G.map.id === 'hostel' ? 'hostel' : G.map.id;
  return 'campus';
}

/* ---------------- Attendance ledger ----------------
   Attendance % is DERIVED from records (credit / lectures held), so it cannot be
   farmed: every lecture resolves exactly once. */
const Att = {
  pct() { return S.att.held ? Math.round(100 * S.att.credit / S.att.held) : 100; },
  sync(show) {
    const before = S.stats.att, after = clamp(this.pct(), 0, 100);
    S.stats.att = after;
    const d = after - before;
    if (show && d) {
      G.floats.push({ x: G.player.x, y: G.player.y - 26, text: (d > 0 ? '+' : '') + d + ' Attendance', col: d > 0 ? STAT_META.att.col : '#ff6b7f', t: 0, life: 1.9 });
      UI.flashStat('att', d > 0);
    }
    if (after < ATT_RULES.warnBelow && !S.flags['attWarn' + S.day]) { S.flags['attWarn' + S.day] = 1; setTimeout(() => notify('Academic Office', `Attendance alert: ${after}%. Below ${ATT_RULES.endsemMin}% at the Final = debarred.`), 400); }
  },
  record(key, status, credit) {
    if (S.lec[key]) return false; // already resolved — no double counting
    S.lec[key] = status;
    S.att.held += 1; S.att.credit += credit;
    this.sync(true);
    return true;
  },
  penalty(n) { S.att.credit = Math.max(0, S.att.credit - n); this.sync(true); },
};

/* ---------------- Timetable ---------------- */
const Sched = {
  classes() { return DAY().classes; },
  cls(i) { return DAY().classes[i]; },
  key(i) { return S.day + '-' + i; },
  rec(i) { return S.lec[this.key(i)]; },
  closeAt(c) { return c.start + (c.type === 'lecture' ? ATT_RULES.lateClose : c.type === 'quiz' ? 25 : 60); },
  /* the class whose entry window (start-30 → close) contains now and is unresolved */
  active() {
    const t = S.time;
    return this.classes().findIndex((c, i) => !this.rec(i) && t >= c.start - 30 && t < this.closeAt(c));
  },
  /* class currently in session regardless of the player's record (for populating the hall) */
  inSession() {
    const t = S.time;
    return this.classes().findIndex((c) => t >= c.start - 30 && t < c.start + c.dur);
  },
  next() {
    const t = S.time;
    let best = -1;
    this.classes().forEach((c, i) => { if (!this.rec(i) && t < this.closeAt(c) && (best < 0 || c.start < this.classes()[best].start)) best = i; });
    return best;
  },
  /* game-minutes needed to reach the lecture hall door at `speed` (default: walking) */
  travel(speed) { return G.map.id === 'lecture' ? 0 : Math.ceil(travelMin(routePx('lecture'), speed || TIME.walk)); },
  label(c) {
    const co = COURSES[c.course];
    if (c.type === 'quiz') return `Quiz · ${co.code}`;
    if (c.type === 'mte') return `MTE · ${co.code}`;
    if (c.type === 'endsem') return 'Final Exam';
    return `${co.code} lecture`;
  },
  /* warnings: computed from the clock, the timetable and the player's position */
  tick() {
    const t = S.time;
    this.classes().forEach((c, i) => {
      if (this.rec(i)) return;
      const k = this.key(i), w = S.warn[k] || (S.warn[k] = {});
      const inHall = G.map.id === 'lecture';
      const lbl = this.label(c), until = c.start - t;
      if (!inHall && until <= 15 && until > 5 && !w.w15) { w.w15 = 1; UI.warn(`${lbl} starts in 15 minutes.`, `{L:lecture} · ${fmtTime(c.start)}`, 'info'); }
      const tr = this.travel();
      // "leave now" = estimated walk + reaction buffer (TIME.bufferMin), so the warning is always achievable on foot
      if (!inHall && until > 5 && until <= tr + TIME.bufferMin && !w.leave) { w.leave = 1; UI.warn('You should leave now if you want to make it on time.', `${lbl} · about ${tr} min walk from here`, 'warn'); }
      if (!inHall && until <= 5 && until > 0 && !w.w5) { w.w5 = 1; UI.warn('5 minutes left! You\'re going to be late.', `${lbl} · SPRINT unlocked — just move!`, 'urgent'); setSprint('late', { ci: i }); }
      if (!inHall && until <= 0 && t < this.closeAt(c) && !w.started) { w.started = 1; UI.warn(c.type === 'lecture' ? 'Your lecture has started.' : `${lbl} has started!`, c.type === 'lecture' ? `Late entry allowed until ${fmtTime(this.closeAt(c))}` : 'Get there NOW.', 'urgent'); setSprint('late', { ci: i }); }
    });
  },
};

/* ---------------- Tasks ---------------- */
const PRIO = { 3: 'High', 2: 'Medium', 1: 'Low' };
const Tasks = {
  gen() {
    const d = DAY(), list = [];
    const add = (o) => list.push(Object.assign({ status: 'open', prio: 2, optional: false }, o));
    d.classes.forEach((c, i) => {
      const co = COURSES[c.course];
      if (c.type === 'lecture') add({ key: 'cls' + i, ci: i, kind: 'class', prio: 3, title: `${co.code} lecture · ${fmtTime(c.start)}`, desc: `${co.name} with ${PROFS[co.prof].name}. Roll call at the start. Late entry until ${fmtTime(c.start + ATT_RULES.lateClose)}.`, loc: 'lecture', start: c.start, end: c.start + ATT_RULES.lateClose, reward: '+Attendance · +Academics', fail: 'Attendance drops' });
      if (c.type === 'quiz') add({ key: 'cls' + i, ci: i, kind: 'class', prio: 3, title: `QUIZ · ${co.code} · ${fmtTime(c.start)}`, desc: `20 marks. ${PROFS[co.prof].name} says it is ${PROFS[co.prof].catch}.`, loc: 'lecture', start: c.start, end: c.start + 25, reward: 'Quiz marks', fail: 'Zero marks' });
      if (c.type === 'mte') add({ key: 'cls' + i, ci: i, kind: 'class', prio: 3, title: `MTE · ${co.name} · ${fmtTime(c.start)}`, desc: 'Two hours. Your revision (prep %) decides most of the score.', loc: 'lecture', start: c.start, end: c.start + 60, reward: 'MTE marks', fail: 'Run in late, lose marks' });
      if (c.type === 'endsem') add({ key: 'cls' + i, ci: i, kind: 'class', prio: 3, title: `FINAL EXAM · ${fmtTime(c.start)}`, desc: `Both subjects. Attendance below ${ATT_RULES.endsemMin}% = debarred.`, loc: 'lecture', start: c.start, end: c.start + 60, reward: 'Your semester', fail: 'Everything' });
    });
    d.classes.forEach((c, i) => {
      const px = c.type === 'lecture' ? Story.proxyInfo(i) : null;
      if (!px) return;
      const hc = S.proxyCount + 1 >= Chase.st().nextAt;
      add({ key: px.task, kind: 'friend', prio: 1, optional: true, title: `${px.name} wants a proxy`, desc: `In ${COURSES[c.course].code} at ${fmtTime(c.start)}. Choose "proxy" when you enter class. Risky with ${PROFS[COURSES[c.course].prof].name}. Proxy attempts so far: ${S.proxyCount}.${hc ? ' One more and the professor may do a HEADCOUNT.' : ''}`, loc: 'lecture', start: c.start, end: c.start + ATT_RULES.lateClose, reward: `+Trust with ${px.name}`, fail: 'Caught = marked absent', from: px.from });
    });
    if (!d.tags.includes('endsem')) {
      add({ key: 'lunch', kind: 'meal', prio: 1, optional: true, title: 'Eat lunch', desc: 'Anything from the canteen counts. Samosa is a meal. Probably.', loc: 'canteen', start: 720, end: 900, reward: '+Energy' });
      add({ key: 'dinner', kind: 'meal', prio: 2, title: 'Eat dinner', desc: 'Canteen, before 10:30 PM. Night canteen Maggi counts.', loc: 'canteen', start: 1140, end: 1350, reward: '+Energy', fail: 'Sleep hungry (-8 Energy tomorrow)' });
    }
    if (d.nso) add({ key: 'nso', kind: 'sport', prio: 2, title: `NSO practice · ${fmtTime(NSO_TIME.start)}`, desc: 'Badminton drills with Coach Thapa at the court. Return the shuttles!', loc: 'court', start: NSO_TIME.start, end: NSO_TIME.start + 30, reward: '+NSO credit · +Sports', fail: 'NSO absence recorded' });
    if (d.tags.includes('icebreak')) add({ key: 'icebreak', kind: 'event', prio: 3, title: `Icebreaking · ${fmtTime(ICEBREAK.start)}`, desc: 'Seniors meet the freshers at the {L:plaza} after classes. Introduce yourself. Rumour: a Chapo challenge.', loc: 'plaza', start: ICEBREAK.start, end: ICEBREAK.end, reward: '+Social · Chapo (if you earn it)', fail: 'The seniors will remember' });
    if (S.day < ASSIGN_DUE_DAY) {
      const tgt = ASSIGN_TARGETS[Math.min(S.day, ASSIGN_TARGETS.length - 1)];
      if (S.assignment < tgt) add({ key: 'assign', kind: 'study', prio: 2, optional: true, title: `Assignment 1: reach ${tgt}%`, desc: `Squash bugs at your hostel laptop (interactive). Due ${CALENDAR[ASSIGN_DUE_DAY].wd} 11:59 PM.`, loc: 'hostel', end: 1320, target: tgt, reward: 'Less panic later', fail: 'More panic later' });
    }
    if (S.day === ASSIGN_DUE_DAY) add({ key: 'submit', kind: 'study', prio: 3, title: 'Submit Assignment 1 by 11:59 PM', desc: 'From your hostel laptop. Late = zero.', loc: 'hostel', end: 1439, reward: 'Assignment marks', fail: 'Zero' });
    if (d.tags.includes('badmintonIntro')) add({ key: 'badminton', kind: 'friend', prio: 1, optional: true, title: 'Badminton with Priya', desc: 'She is at the court 4–7 PM. Best of 7 points.', loc: 'court', start: 960, end: 1140, reward: '+Social · +Friendship · +Sports' });
    else if (!d.tags.includes('endsem') && !d.tags.includes('pronite') && !d.tags.includes('icebreak') && S.day % 2 === 0) add({ key: 'badminton', kind: 'friend', prio: 1, optional: true, title: `Badminton with ${this.courtFriend().name}`, desc: 'At the court, 4–7 PM.', loc: 'court', start: 960, end: 1140, reward: '+Social · +Friendship' });
    if (d.tags.includes('waterfight')) add({ key: 'waterfight', kind: 'event', prio: 1, optional: true, title: 'Water fight · 10:30 PM', desc: 'Wing A vs Wing B at the {L:plaza}. Clashes with Pronite — pick your night.', loc: 'plaza', start: 1350, end: 1410, reward: '+Social · memories', fail: '' });
    else if (!d.tags.includes('pronite')) add({ key: 'night', kind: 'social', prio: 1, optional: true, title: 'Hostel night with Kabir', desc: 'Talk to Kabir in your room after 8 PM.', loc: 'hostel', start: 1200, end: 1500, reward: '+Social · +Friendship' });
    if (d.tags.includes('finalprep')) add({ key: 'revise', kind: 'study', prio: 3, title: 'Revise for the Final', desc: 'Interactive revision at your desk or the library (the all-nighter option is yours). Final: Sunday 10 AM.', loc: 'library', reward: '+Prep %', fail: 'Weaker final' });
    if (d.tags.includes('volunteer')) add({ key: 'volunteer', kind: 'friend', prio: 2, optional: true, title: 'Help Priya with Thomso decor', desc: 'She is at the {L:ground}, 12–5 PM.', loc: 'ground', start: 720, end: 1020, reward: '+Friendship · VIP Pronite pass' });
    if (d.tags.includes('pronite')) {
      add({ key: 'danceoff', kind: 'event', prio: 1, optional: true, title: 'Thomso dance-off · 5–8 PM', desc: 'Main Stage. Hit the arrows. Embarrass Wing B.', loc: 'stage', start: 1020, end: 1200, reward: '+Social · memory' });
      add({ key: 'pronite', kind: 'event', prio: 2, optional: true, title: 'Pronite concert · 8 PM', desc: 'The big night on the {L:stage}.', loc: 'stage', start: 1200, end: 1500, reward: '+Social · memory' });
    }
    if (d.tags.includes('thomso2')) add({ key: 'comedy', kind: 'event', prio: 1, optional: true, title: 'Comedy night · 7–9 PM', desc: 'Thomso Day 2 on the {L:stage}.', loc: 'stage', start: 1140, end: 1260, reward: '+Social · memory' });
    if (d.tags.includes('project')) add({ key: 'project', kind: 'friend', prio: 2, optional: true, title: 'Project group meeting · 4 PM', desc: 'Library. Your group decides your project marks.', loc: 'library', start: 960, end: 1140, reward: '+Project marks' });
    // one random optional side activity
    const side = [['chai', 'Chai at the {L:chai}', 'chai'], ['fountain', 'Make a wish at the fountain', 'plaza'], ['shelf', 'Browse the library shelves', 'library'], ['bench', 'Chill on a bench for a bit', 'plaza']];
    const sd = Bag('sidetask', side);
    add({ key: 'side_' + sd[0], kind: 'side', prio: 1, optional: true, title: fillTokens(sd[1]), desc: 'Optional. Small mood boost.', loc: sd[2], reward: '+Small boost' });
    S.tasks = list;
  },
  courtFriend() { const order = ['rahul', 'kabir', 'priya']; const id = order[S.day % 3]; return { id, name: CH[id].name }; },
  get(k) { return (S.tasks || []).find((t) => t.key === k); },
  done(k) {
    const t = this.get(k);
    if (!t || t.status !== 'open') return false;
    t.status = 'done';
    S.counters.tasksDone = (S.counters.tasksDone || 0) + 1;
    UI.taskToast(t);
    return true;
  },
  fail(k, status) { const t = this.get(k); if (t && t.status === 'open') t.status = status || 'missed'; },
  tick() {
    for (const t of S.tasks || []) {
      if (t.status !== 'open') continue;
      if (t.target && S.assignment >= t.target) { this.done(t.key); continue; }
      if (t.kind === 'class') continue; // resolved by the timetable
      if (t.end !== undefined && S.time > t.end) {
        t.status = t.optional ? 'expired' : 'missed';
        if (t.key === 'dinner') S.flags.hungry = true;
        if (t.key === 'nso') { S.nso.missed++; notify('NSO', 'Absence recorded. Coach Thapa is disappointed in a sporty way.'); }
        if (t.from) rel(t.from, -3);
      }
    }
  },
  /* tasks for the HUD: open ones first, ordered by time */
  upcoming(n) {
    const list = (S.tasks || []).slice();
    const w = (t) => (t.status === 'open' ? 0 : 1) * 1e5 + (t.start !== undefined ? t.start : t.end !== undefined ? t.end : 2000) - t.prio * 3;
    list.sort((a, b) => w(a) - w(b));
    return n ? list.slice(0, n) : list;
  },
  /* the most urgent open task with a place to go */
  focus() {
    const t = S.time;
    const open = (S.tasks || []).filter((x) => x.status === 'open');
    const soon = open.filter((x) => x.start !== undefined && x.start - t <= 60 && (x.end === undefined || t <= x.end)).sort((a, b) => b.prio - a.prio || a.start - b.start);
    if (soon.length) return soon[0];
    const main = open.filter((x) => !x.optional && (x.start === undefined || x.start - t <= 180)).sort((a, b) => b.prio - a.prio);
    return main[0] || open.filter((x) => x.start === undefined || x.start - t <= 120)[0] || null;
  },
};

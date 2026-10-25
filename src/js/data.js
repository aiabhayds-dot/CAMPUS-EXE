'use strict';
/* =====================================================================
   EDITABLE GAME DATA — locations, academic calendar, timetable, decks
   ---------------------------------------------------------------------
   Everything in this file is FICTIONAL and CONFIGURABLE. It is only
   *inspired by* student life at IIT Roorkee. No dates, timetables,
   course codes or rules here are official. Edit freely; the rest of
   the game reads from these tables.
   ===================================================================== */

/* ---------- Locations ----------
   `id` is the stable internal identifier (used by saves, tasks, maps).
   `name` is the default display name. Players can rename places in
   Pause → Settings → Rename places; overrides are stored separately,
   so renaming never breaks quests, saves or navigation. */
const LOCATIONS = {
  hostel:  { name: 'Himgiri Bhawan',      hint: 'your hostel (north-west)' },
  room:    { name: 'Room C-214',          hint: 'your room inside the hostel' },
  lecture: { name: 'LHC · Lecture Hall 3', hint: 'north-east' },
  library: { name: 'Central Library',     hint: 'west, below the main road' },
  canteen: { name: 'Bhawan Canteen',      hint: 'east, below the main road' },
  ground:  { name: 'Sports Ground',       hint: 'south, centre' },
  court:   { name: 'NSO Badminton Court', hint: 'south-west corner' },
  plaza:   { name: 'Fountain Lawn',       hint: 'centre, by the fountain' },
  stage:   { name: 'Thomso Main Stage',   hint: 'top of the Sports Ground' },
  chai:    { name: 'Chai Tapri',          hint: 'east end of the main road' },
  gate:    { name: 'Main Gate',           hint: 'west end of the main road' },
};
const LOC_STORE_KEY = 'campusexe.locnames';
let LOC_OVERRIDES = {};
function loadLocNames() {
  try { LOC_OVERRIDES = JSON.parse(safeStore('get', LOC_STORE_KEY) || '{}') || {}; } catch (e) { LOC_OVERRIDES = {}; }
}
function locName(id) {
  const o = LOC_OVERRIDES[id];
  return (o && String(o).trim()) || (LOCATIONS[id] ? LOCATIONS[id].name : id);
}
function setLocName(id, name) {
  if (!LOCATIONS[id]) return;
  name = String(name || '').replace(/[<>]/g, '').trim().slice(0, 32);
  if (!name || name === LOCATIONS[id].name) delete LOC_OVERRIDES[id]; else LOC_OVERRIDES[id] = name;
  safeStore('set', LOC_STORE_KEY, JSON.stringify(LOC_OVERRIDES));
}
function resetLocNames() { LOC_OVERRIDES = {}; safeStore('del', LOC_STORE_KEY); }
/* Text tokens: {P} = player name, {L:id} = location display name */
function fillTokens(s) {
  return String(s)
    .replace(/\{P\}/g, (typeof S !== 'undefined' && S) ? S.name : '')
    .replace(/\{L:(\w+)\}/g, (_, id) => locName(id));
}

/* ---------- Professors & courses (fictional) ---------- */
const PROFS = {
  sharma: { name: 'Prof. R.K. Sharma', look: 'prof', strict: 0.24, catch: 'very easy' },
  iyer:   { name: 'Dr. Meenakshi Iyer', look: 'iyer', strict: 0.12, catch: 'trivially follows' },
};
const COURSES = {
  SIG: { code: 'SIG-201', name: 'Signals & Systems',        prof: 'sharma', start: 540, dur: 90, subject: 'sig' },
  MTH: { code: 'MTH-202', name: 'Probability & Statistics', prof: 'iyer',   start: 840, dur: 75, subject: 'mth' },
};
const SUBJECT_NAMES = { sig: 'Signals & Systems', mth: 'Probability & Stats' };

/* ---------- Time & movement (ONE place to tune pacing) ----------
   The world clock advances 1 in-game minute every `secPerGameMin` real
   seconds while the player is free to move. Cutscenes, dialogue, menus and
   mini-games do NOT advance it (scripted time-skips are explicit).
   Speeds are in world pixels per real second. */
const TIME = {
  secPerGameMin: 0.8,  // 75 in-game minutes per real minute
  walk: 80,            // normal walking
  run: 124,            // holding Shift
  sprint: 168,         // urgent: late for class / emergency headcount
  sneak: 58,           // stealth inside the lecture hall
  bufferMin: 6,        // reaction buffer added to every "leave now" estimate
};
/* game-minutes needed to cover `px` world pixels at `speed` px/s */
function travelMin(px, speed) { return px / (speed || TIME.walk) / TIME.secPerGameMin; }

/* ---------- Academic phases ---------- */
const PHASES = {
  teach:    { name: 'Orientation Week',   col: '#2ec4b6' },
  thomso:   { name: 'Thomso Fest Week',   col: '#c56cf0' },
  quiz:     { name: 'Surprise Quiz',      col: '#ffb627' },
  deadline: { name: 'Deadline Day',       col: '#ff9f43' },
  final:    { name: 'Final Exam',         col: '#ff5d73' },
};

/* ---------- Calendar: the 7-day main story ----------
   One entry per in-game day. Times are minutes after midnight (540 = 9:00 AM).
   classes: lecture | quiz | endsem   ·  nso: NSO practice that evening
   proxy: a friend asks for a proxy in classes[cls] (random classmates may ask too)
   tags: story hooks */
const L = (course, extra) => Object.assign({ type: 'lecture', course, start: COURSES[course].start, dur: COURSES[course].dur }, extra || {});
const Q = (course, start) => ({ type: 'quiz', course, start, dur: 60 });
const X = (type, course, start, dur) => ({ type, course, start, dur });
const NSO_TIME = { start: 1050, dur: 60 }; // 5:30 PM
const CALENDAR = [
  { wd: 'Mon', week: 1, phase: 'teach',    title: 'The Alarm Disaster',        sub: 'Hostel life, mess food & the first proxy', classes: [L('SIG'), L('MTH')], tags: ['intro', 'messfood'], proxy: { cls: 0, from: 'rahul', how: 'inperson' } },
  { wd: 'Tue', week: 1, phase: 'teach',    title: 'Icebreaking Day',           sub: 'Seniors are waiting · 6:00 PM',            classes: [L('SIG'), L('MTH')], tags: ['suspicion', 'borrow', 'icebreak'], proxy: { cls: 1, from: 'kabir', how: 'phone' } },
  { wd: 'Wed', week: 1, phase: 'thomso',   title: 'Thomso Begins',             sub: 'Fest week · badminton · comedy night',     classes: [L('SIG')], nso: true, tags: ['thomso', 'badmintonIntro', 'thomso2', 'volunteer', 'festcards'], proxy: { cls: 0, from: 'rahul', how: 'phone' } },
  { wd: 'Thu', week: 1, phase: 'thomso',   title: 'Thomso: Pronite',           sub: 'Dance-off · Pronite · water fight',         classes: [L('MTH')], tags: ['thomso', 'pronite', 'waterfight', 'repay', 'festcards'], proxy: { cls: 0, from: 'rahul', how: 'phone' } },
  { wd: 'Fri', week: 1, phase: 'quiz',     title: 'The Surprise Quiz',         sub: '8:00 AM. Nobody saw it coming.',           classes: [Q('SIG', 480), L('MTH')], nso: true, tags: ['quizday', 'surprise'], proxy: { cls: 1, from: 'kabir', how: 'phone' } },
  { wd: 'Sat', week: 1, phase: 'deadline', title: 'Deadline & Roommate Chaos', sub: 'Assignment 1 closes at 11:59 PM',          classes: [], tags: ['deadline', 'rahulHelp', 'chaos', 'finalprep'] },
  { wd: 'Sun', week: 1, phase: 'final',    title: 'The Final Exam',            sub: 'Everything. All of it. 10:00 AM',          classes: [X('endsem', 'ALL', 600, 180)], tags: ['endsem'] },
];
const SEM_DAYS = CALENDAR.length; // 7 — the main story always ends on Day 7
const ASSIGN_DUE_DAY = CALENDAR.findIndex((d) => d.tags.includes('deadline'));
const ASSIGN_TARGETS = [15, 30, 45, 60, 75]; // suggested progress per day before the deadline

/* ---------- Emergency headcount (proxy consequence) ----------
   Every proxy you actually voice counts as an attempt. When attempts reach
   `threshold` (i.e. more than 4), a professor schedules a surprise headcount.
   Another one can only happen after `repeatEvery` further attempts, and never
   twice on the same day. */
const HEADCOUNT = {
  threshold: 5, repeatEvery: 3,
  delayMin: [25, 60],          // game-minutes after the triggering proxy
  window: [sec2(9, 30), sec2(19, 30)],
  readySec: 3,                 // "GET READY" before the countdown starts
  bufferSec: 7, stealthSec: 10, minSec: 16, maxSec: 60, slack: 1.35,
  penalty: { attLectures: 1, social: -5, trust: -6 },
  reward: { social: 6, energy: -6 },
};
function sec2(h, m) { return h * 60 + (m || 0); }

/* ---------- Day 2 icebreaking (balancing values) ---------- */
const ICEBREAK = {
  start: 1080, late: 1095, end: 1230, loc: 'plaza',  // 6:00 PM · late after 6:15 · seniors leave 8:30 PM
  chapo: { energy: 10, social: 10 },
  introOnly: { social: 4 },
};

/* ---------- Attendance rules (fictional) ---------- */
const ATT_RULES = { baseHeld: 8, baseCredit: 6, warnBelow: 70, debarBelow: 40, endsemMin: 55, lateGrace: 15, lateClose: 30 };

/* ---------- Study decks for the memory challenge ---------- */
const DECKS = {
  sig: [['Fourier series', 'Sum of sines & cosines'], ['Nyquist rate', '2 x highest frequency'], ['Convolution', 'y = x * h'], ['LTI system', 'Linear + time-invariant'],
    ['Laplace', 'Lives in the s-domain'], ['Z-transform', 'Discrete-time Laplace'], ['Impulse', 'Infinite, but briefly'], ['Aliasing', 'Sampling too slowly']],
  mth: [['Bayes', 'P(A|B) from P(B|A)'], ['Variance', 'E[X^2] - E[X]^2'], ['Poisson', 'Rare events per interval'], ['Normal', 'The bell curve'],
    ['Independence', 'P(AB) = P(A)P(B)'], ['Expectation', 'Sum of x times p(x)'], ['CLT', 'Sums drift to normal'], ['Binomial', 'n trials, p success']],
};

/* ---------- helpers ---------- */
function DAY(i) { return CALENDAR[i === undefined ? (S ? S.day : 0) : i] || CALENDAR[0]; }
function hasTag(t, i) { return !!(S && DAY(i).tags.includes(t)); }
function festLevel() { if (!S) return 0; const d = DAY(); return d.tags.includes('thomso') ? 2 : d.tags.includes('thomsoPrep') ? 1 : 0; }
function isFestDay(i) { return DAY(i).tags.includes('thomso'); }

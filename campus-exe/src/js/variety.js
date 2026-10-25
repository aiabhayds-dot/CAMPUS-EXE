'use strict';
/* =====================================================================
   VARIETY — seeded randomness, shuffle-bags, dialogue variants & event pools
   ---------------------------------------------------------------------
   • Every run has S.seed. All story randomness goes through Rng, whose
     position (S.rngN) is saved, so a save/load or a debug seed replays the
     same choices, while a new game gets a new seed and new combinations.
   • Bag(name, list) is a shuffle-bag: it hands out every variant once before
     repeating, never repeats the last one back-to-back, and its state is
     saved in S.bags. Pick a whole sequence ONCE when an interaction starts
     and keep it until the interaction ends (never per frame).
   ===================================================================== */
const Rng = {
  /* mulberry32 on (seed, step) — deterministic for a given seed */
  next() {
    if (!S) return Math.random();
    S.rngN = (S.rngN || 0) + 1;
    let t = (S.seed + S.rngN * 0x6D2B79F5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); },
  pick(a) { return a[Math.floor(this.next() * a.length)]; },
  chance(p) { return this.next() < p; },
  shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; },
  weighted(list, w) { const tot = list.reduce((s, x) => s + (w(x) || 0), 0); let r = this.next() * tot; for (const x of list) { r -= w(x) || 0; if (r <= 0) return x; } return list[list.length - 1]; },
};
/* Shuffle-bag over a pool: returns an element, persisted in S.bags[name]. */
function Bag(name, list) {
  if (!S) return pick(list);
  S.bags = S.bags || {};
  let b = S.bags[name];
  if (!b || !b.left || !b.left.length || b.n !== list.length) {
    const last = b ? b.last : -1;
    let order = Rng.shuffle(list.map((_, i) => i));
    if (order.length > 1 && order[order.length - 1] === last) [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
    b = S.bags[name] = { left: order, last, n: list.length };
  }
  const i = b.left.pop(); b.last = i;
  return list[i];
}
/* pick n distinct items from a bag */
function BagN(name, list, n) { const out = []; let guard = 0; while (out.length < Math.min(n, list.length) && guard++ < 50) { const x = Bag(name, list); if (!out.includes(x)) out.push(x); } return out; }

/* ---------------- dialogue variants ---------------- */
const DLG = {
  /* two students talking — whole exchanges, chosen once per conversation */
  casual: [
    [['A', 'Bro, assignment kiska hua?'], ['B', 'Mera "almost" ho gaya.'], ['A', 'Almost matlab?'], ['B', 'File ka naam rakh diya.']],
    [['A', 'Mess mein aaj kya hai?'], ['B', 'Mystery Sabzi.'], ['A', 'Kal bhi wahi tha.'], ['B', 'Kal ki mystery solve nahi hui. Sequel hai.']],
    [['A', 'Tu NSO jaata hai?'], ['B', 'Jaata hoon. Khelta nahi. Attendance lagta hai.'], ['A', 'Proxy NSO mein bhi?'], ['B', 'Coach sab ginta hai. Sab.']],
    [['A', 'Sharma sir ne "very easy" bola.'], ['B', 'Kitni baar?'], ['A', 'Ginti chhod di. Chhati baar ke baad.']],
    [['A', 'Wi-Fi gaya phir se.'], ['B', 'Library jaa.'], ['A', 'Wahan Wi-Fi hai?'], ['B', 'Nahi. Par wahan sab dukhi hain. Company milegi.']],
    [['A', 'Thomso pass liya?'], ['B', 'Volunteer ban gaya. Free pass, free food, free trauma.']],
    [['A', 'Kal raat 4 baje soya.'], ['B', 'Padhai?'], ['A', 'Nahi. Ek reel dekhi thi "how to sleep early".']],
    [['A', 'Bro tu Rahul ko jaanta hai?'], ['B', 'Kaun nahi jaanta. Uski proxy aadha batch laga chuka hai.']],
  ],
  /* roommate (Kabir) idle lines */
  roommate: [
    'Shh, ranked match chal raha hai.', 'Teri chai mein maine elaichi daal di. Sorry not sorry.', 'Bhai light band kar de jab sona ho. Mujhe nahi sona.',
    'Did you know the mess sabzi has a fan club? Members: 0.', 'Mera assignment? Haan haan, ho jayega. Kabhi na kabhi.', 'Maine aaj 11 ghante padhai ki. Sapne mein.',
    'Mere charger ko kisne chhua? Uska angle badal gaya hai.', 'Bhai, tu bhi wahi soch raha hai jo main soch raha hoon? Maggi?', 'Room ka smell? Woh "character" hai.',
  ],
  /* Kabir night conversation openers by day */
  kabirNight: [
    ['Pehla din survive kar liya. Mess ki dal ne mujhe dekha. Maine dal ko dekha. Dono dare hue the.', 'Rahul ne pehle hi din proxy maangi? Legend.'],
    ['Icebreaking kaisi rahi? Mujhe seniors ne "hidden talent" pucha. Maine bola "sona". Unhone maan liya.', 'Kal se Thomso! Mera plan: Pronite, Maggi, regret.'],
    ['Thomso Day 1! Comedy night mein mujhe roast kiya. Maine bhi taali bajayi. Confused hoon.', 'NSO mein coach ne mujhe "potential" bola. Ya "potato". Clear nahi tha.'],
    ['Pronite. Was. INSANE.', 'Kal subah kuch hai kya? Nahi na? ...NA?'],
    ['Surprise quiz? Surprise toh tab hota jab main padha hota.', 'Kal assignment ka deadline. Maine "Introduction" likh diya. 3 words.'],
    ['Assignment submit? Mera 0%. But mentally? 70%.', 'Kal final hai. Bhai, it was nice knowing you.'],
    ['Last night of the semester. Weird feeling, na?'],
  ],
  /* mess / canteen jokes */
  mess: [
    ['bhaiya', 'Aaj ka special: Mystery Sabzi. Mystery mujhe bhi nahi pata.'],
    ['bhaiya', 'Dal patli hai? Nahi beta, dal "hydrating" hai.'],
    ['bhaiya', 'Roti ya papad? Dono ek hi hai, bas mood alag hai.'],
    ['bhaiya', 'Paneer dhoondh rahe ho? Main bhi. 2019 se.'],
    ['bhaiya', 'Aaj kheer hai! ...Kal ke chawal se. Recycling hai, beta.'],
    ['bhaiya', 'Chai garam hai, samosa garam hai, aur Rahul ka udhaar bhi garam hai.'],
  ],
  /* friends / classmates asking for proxies (by phone) */
  proxyAsk: {
    rahul: ['bro... {C} at {T}... proxy please? Main abhi "almost" utha hoon.', 'BHAI. {C}. {T}. Proxy. Samosa pakka. Do samose.', 'proxy laga de na {C} mein. Mera alarm "emotionally unavailable" tha.', 'bhai main canteen pe hoon, {C} mein "present" bol dena. Deep voice.'],
    kabir: ['bro {C} at {T}. Ranked match hai. Important. Proxy?', 'Proxy de de {C} mein? Main "mentally" present rahunga.', 'mujhe fever hai. Thoda sa. Game khelne layak. Proxy pls {C}?'],
    classmate: ['{N}: hi! {C} at {T}... can you say "present" for me? Roll no. 17. Pleaseee', '{N}: bro proxy in {C}? I owe you a chai. Or two. Or a lifetime.', '{N}: emergency (Thomso stall duty). {C} proxy? I\'ll share notes. Real notes.'],
  },
  /* professor intros/outros */
  profOutro: {
    sharma: ['That is all. It was very easy.', 'Next class, we do the hard part. It is also very easy.', 'Read chapter four. All of it. It is short. Forty pages.', 'Any questions? No? Very easy then.'],
    iyer: ['That concludes today. The rest trivially follows.', 'Practise ten problems. The eleventh trivially follows.', 'If you understood nothing, that is statistically normal.', 'See you next class. Probability of a quiz: non-zero.'],
  },
  profIntro: {
    sharma: ['Good morning. Settle down. Phones away. Souls present.', 'Sit, sit. Today is very easy. Like always.', 'Good morning. I see fewer faces than yesterday. Thomso, very easy to guess.'],
    iyer: ['Good afternoon. Let us begin with an assumption: you are awake.', 'Settle down. Today\'s topic is beautiful. You will disagree.', 'Afternoon. Phones face-down. Probabilities face-up.'],
  },
  /* senior-junior lines */
  seniorCall: ['Oye junior! Haan tum, jo map dekh ke chal rahe ho. Idhar aao.', 'Fresher spotted! Aao aao, darr kyun rahe ho? Hum log cute hain.', 'Ek aur junior! Line mein aao, intro ka time hai.'],
  seniorQ: [
    { q: 'Tell us something about yourself. Something interesting. Not your JEE rank.', a: [['I can eat Maggi in 47 seconds. Timed.', 'fun'], ['I\'m from {L:hostel}. I know where the cooler is. That\'s power.', 'conf'], ['I... uh... exist? Mostly?', 'awk']] },
    { q: 'Hidden talent? Kuch toh hoga.', a: [['I can sleep with my eyes open. In lectures. Undetected.', 'fun'], ['I can name all nine of Sharma sir\'s "very easy"s.', 'conf'], ['Hiding. My talent is hidden. Even from me.', 'awk']] },
    { q: 'What will you contribute to this hostel?', a: [['A working extension board. Rare. Valuable.', 'conf'], ['Snacks from home. My mom packs for a battalion.', 'fun'], ['Emotional support? And noise complaints?', 'awk']] },
    { q: 'Why should we give YOU Chapo?', a: [['Because I\'ll give Chapo to my juniors next year. Circle of life.', 'conf'], ['Because I am hungry, and you look generous.', 'fun'], ['You shouldn\'t. I\'m not even sure I should be here.', 'awk']] },
    { q: 'Morning person or professional snooze-button user?', a: [['I snooze professionally. Certified. Nine times.', 'fun'], ['Morning person. I wake up at 6. Then sleep till 9.', 'conf'], ['What is morning?', 'awk']] },
    { q: 'Sing one line of any song. Any song. Go.', a: [['(sings the Doordarshan tune with full drama)', 'fun'], ['(hums confidently, wrong lyrics, perfect vibe)', 'conf'], ['(sings "Happy Birthday" at 40% volume)', 'awk']] },
  ],
  seniorReact: {
    fun: ['HAHAHA. Isko rakh lo.', 'Theek hai, theek hai, yeh funny hai.', 'Batch ka comedian mil gaya.'],
    conf: ['Confidence! Mujhe pasand aaya.', 'Arre waah. Senior material.', 'Haan, yeh hostel chalaayega.'],
    awk: ['...Okay. Honest. Hum respect karte hain.', 'Bechara. Koi isko pani do.', 'Itna awkward? Chalo, character development hogi.'],
  },
  /* festival chatter for crowd NPCs */
  fest: ['THOMSO!!!', 'Pronite tonight, bro!', 'Who has passes?', 'I\'m volunteering. I have a lanyard. I have power.', 'The stalls have momos!', 'Sleep is cancelled till Saturday.', 'Wing B is planning a water fight. Be ready.', 'Dance-off at 5! I\'ve practised in the mirror. Twice.'],
};

/* ---------------- festival dilemma cards ---------------- */
const FEST_CARDS = [
  { id: 'study_stalls', title: 'The Stall Street Dilemma', text: 'Momos, chaat, and a stall selling "Thomso Special Maggi". Your notes are in your bag, giving you a look.', opts: [
    { t: 'Eat everything', fx: { money: -10, energy: 8, social: 6 }, log: 'Ate one of everything at the Thomso stalls' },
    { t: 'Eat one plate, revise 30 min', fx: { money: -4, energy: 3, acad: 3 }, prep: 4 },
    { t: 'Walk past. Hydrate. Revise.', fx: { acad: 5, social: -2 }, prep: 7 }] },
  { id: 'nap_or_photo', title: 'Nap vs. Photo Booth', text: 'Rahul has a fest-themed photo booth booked for the gang. Your eyelids have booked a nap.', opts: [
    { t: 'Photo booth with the gang', fx: { social: 8, energy: -4 }, rel: { rahul: 4, kabir: 4 }, mem: 'A silly Thomso photo with the gang' },
    { t: 'Power nap (40 min)', fx: { energy: 12 }, time: 40 },
    { t: 'Both. Sleep in the photo.', fx: { social: 5, energy: 5 }, mem: 'Asleep in a Thomso group photo' }] },
  { id: 'lend_pass', title: 'The Spare Pass', text: 'A first-year from your wing lost their Pronite pass and is close to tears. You have exactly enough money for another one.', opts: [
    { t: 'Buy them a pass', fx: { money: -10, social: 8 }, log: 'Bought a stranger a Pronite pass', mem: 'Saving a junior\'s Pronite' },
    { t: 'Help them search the ground', fx: { energy: -5, social: 4 }, time: 30 },
    { t: '"Sad. Anyway."', fx: { social: -3 } }] },
  { id: 'band_practice', title: 'Backstage Chance', text: 'The Thomso band needs someone to carry speakers. In return: backstage access and possibly a selfie with Meera.', opts: [
    { t: 'Carry the speakers', fx: { energy: -10, social: 9 }, rel: { meera: 6 }, mem: 'Carrying speakers backstage at Thomso' },
    { t: 'Recommend Rahul instead', fx: { social: 3 }, rel: { rahul: 5 } },
    { t: 'Go back to studying', fx: { acad: 4 }, prep: 5 }] },
  { id: 'night_plan', title: 'Midnight Plans', text: 'Friday morning might have something (nobody knows what). The group chat wants a late-night canteen run.', opts: [
    { t: 'Canteen run', fx: { social: 7, money: -6, energy: -6 }, flag: 'lateThu' },
    { t: 'Half an hour, then bed', fx: { social: 3, money: -3 } },
    { t: 'Sleep early like an adult', fx: { energy: 6, social: -2 }, flag: 'earlyThu' }] },
  { id: 'merch', title: 'Merch Madness', text: 'Limited-edition Thomso hoodies. Last three left. Your bank account is shaking its head.', opts: [
    { t: 'Buy the hoodie', fx: { money: -14, social: 6 }, mem: 'Buying the Thomso hoodie' },
    { t: 'Split one with Kabir', fx: { money: -7, social: 3 }, rel: { kabir: 5 } },
    { t: 'Admire it. Spiritually own it.', fx: {} }] },
];

/* ---------------- random event pool ----------------
   Each event: where (map id), when (slots), weight, rules, and a run().
   Story.tick rolls the pool every so often while the player is free. */
const EVENT_POOL = [
  { id: 'overhear', maps: ['campus'], slots: [0, 1, 2], weight: 4, run: () => Story.evOverhear() },
  { id: 'snack', maps: ['campus', 'library'], slots: [1, 2], weight: 3, run: () => Story.evSnack() },
  { id: 'cricket', maps: ['campus'], slots: [1, 2], weight: 2, fest: false, run: () => Story.evGameInvite() },
  { id: 'profNotice', maps: ['campus', 'hostel', 'canteen', 'library'], slots: [0, 1, 2], weight: 2, classDay: true, run: () => Story.evProfNotice() },
  { id: 'assignHelp', maps: ['campus', 'library', 'canteen'], slots: [1, 2], weight: 2, cond: () => !S.flags.submitted && S.day <= ASSIGN_DUE_DAY && S.day >= 1, run: () => Story.evAssignHelp() },
  { id: 'festEncounter', maps: ['campus'], slots: [1, 2, 3], weight: 4, fest: true, run: () => Story.evFest() },
  { id: 'roommate', maps: ['hostel'], slots: [1, 2], weight: 3, run: () => Story.evRoommate() },
  { id: 'coupon', maps: ['campus'], slots: [1, 2], weight: 1, once: true, fest: true, cond: () => S.rnd.coupon, run: () => Story.findCoupon() },
  { id: 'idcard', maps: ['campus'], slots: [1, 2], weight: 1, once: true, cond: () => S.rnd.idcard && S.day >= 1 && S.day <= 4, run: () => Story.findID() },
];

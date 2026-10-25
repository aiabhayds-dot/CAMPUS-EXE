# CAMPUS.EXE v3 — a 7-day IIT Roorkee–inspired campus life sim

A top-down 2D campus-life game in one HTML file (HTML5 Canvas + vanilla JS, no dependencies).
Exactly **seven in-game days**: hostel life and the first proxy, Day 2 icebreaking with the seniors,
Thomso fest week, a surprise 8 AM quiz, an 11:59 PM assignment deadline with roommate chaos, and the final exam.

## Run it
- **Play:** open `dist/campus-exe-standalone.html` in any modern browser (double-click works, no server).
- **Rebuild after editing:** `python3 build.py` → writes `dist/campus-exe.html` and `dist/campus-exe-standalone.html`.

## Controls
| Key | Action |
|---|---|
| WASD / Arrows | Move · Shift run (you auto-sprint when you're late or in a headcount) |
| E / Space | Interact, advance dialogue, swing / throw / fix bugs in mini-games |
| 1–5 | Pick a dialogue or card choice |
| N | Task notebook (tasks + today's messages) · C week planner |
| Esc / ⏸ button | Pause: Resume · Save · Load · Notebook · Settings · Controls · Main menu · End current run · Quit |
| M | Minimap |

## The week
| Day | What happens |
|---|---|
| 1 Mon | Alarm disaster, Rahul's first proxy request, the Mystery Sabzi mess meal, Kabir the roommate |
| 2 Tue | Morning group-chat announcement → **Icebreaking at 6 PM** (Fountain Lawn), senior Q&A, optional Chapo challenge |
| 3 Wed | **Thomso begins**: festival dilemma cards, volunteering, badminton with Priya, NSO, comedy night |
| 4 Thu | Dance-off, Pronite, midnight water fight (they clash — pick one), late-night temptations |
| 5 Fri | **Surprise quiz at 8 AM** (the group chat wakes you at 7:05 so it's always reachable), MTH lecture, NSO |
| 6 Sat | **Assignment due 11:59 PM**: bug-squash laptop rounds, random roommate chaos, Rahul's laptop crisis, all-nighter option |
| 7 Sun | **Final exam 10 AM** → Semester Wrapped: stats, grades & SGPA, friendships, achievements, memories, decisions, title |

## How the new systems work
**Time & movement (fix).** One clock: `update()` advances 1 game-minute every `TIME.secPerGameMin` (0.8 s) real seconds, only while the player is free — dialogue, menus, cutscenes and mini-games don't tick it (scripted time-skips are explicit). Speeds live in `TIME` (`src/js/data.js`): walk 80, run 124, sprint 168, sneak 58 px/s. The "leave now" warning fires at *estimated route time on foot + 6 min buffer* (`routePx()` → `travelMin()`), so it is always achievable by walking. At "5 minutes left" / "lecture has started" you get a temporary **sprint** (faster animation, dust, red arrow to the hall); it never stacks and is removed when you arrive, the class closes, or the event ends.

**Proxy counter & emergency headcount.** `S.proxyCount` counts every proxy you actually voice ("Present (deep voice)") — caught or not; normal attendance never touches it. When it reaches **5 (i.e. > 4)** the professor arms a headcount 25–60 game-minutes later (inside 9:30 AM–7:30 PM, never during or right before a class, never on the final day). Sequence: urgent warning + siren + group-chat message → 3-2-1 → countdown bar → sprint across campus (extra foot traffic on the road) → inside the hall, a stealth phase: reach the glowing seat, freeze whenever the professor turns (2 sightings = caught). Countdown = route distance ÷ sprint speed × 1.35 + 10 s stealth + 7 s buffer (16–60 s). Win: relief scene, +Social. Lose: the professor counts 47 of 48 and finds you missing → −2 lectures of attendance, −Social, −trust. One headcount per day; the next needs 3 more proxies. State is in `S.hc`, so pausing freezes it and a mid-chase save resumes the exact countdown without re-triggering.

**Pause / save.** Esc or the ⏸ button freezes clock, countdowns, input, NPCs and mini-games. Save Game, Load last save, Return to main menu (asks only if there's unsaved progress), End current run (confirm → Wrapped summary; the save file is never touched), Quit. Autosave after lectures, the quiz, headcount results, submissions and every morning. Continue appears on the title screen when a valid save exists; damaged saves are detected and left untouched. Save key: `campusexe.v3.save`.

**Randomized dialogue & events.** `src/js/variety.js`: a seeded RNG (`S.seed`, position saved) and **shuffle-bags** (`Bag()`): every variant is used once before repeating, never twice in a row, and the bag state is saved. A conversation picks its whole sequence once when it starts. Pools cover casual student chats, roommate lines, mess jokes, proxy requests (Rahul/Kabir/random classmates), professor intros/outros/roll calls, festival chatter, senior questions & reactions. `EVENT_POOL` rolls every 45–90 game-minutes while you're free, filtered by map, time of day, fest/non-fest day, class day, once-only flags and per-day repeats — never during a class window, a headcount, the icebreaking challenge or a pause. Fest days also get 2 dilemma cards from `FEST_CARDS`.

**Day 2 icebreaking & Chapo.** Morning group-chat message (also kept in the notebook's message history) + task + 15-min/leave-now/late warnings. Reach the Fountain Lawn after 5:40 PM: seniors call you over, you introduce yourself and answer three random questions (fun / confident / awkward answers, scored with your Social). Then the optional challenge: walk to Tara, open a conversation, politely ask if she's comfortable sharing her Instagram. She may agree (pick a charming / funny / awkward / confident line), joke, or decline — only respectful replies are offered, and taking the "no" gracefully counts toward the challenge. Report back: if you qualify, the Chapo scene gives **+10 Energy, +10 Social** (`ICEBREAK.chapo`), once per run. Passing on the challenge still completes the intro.

## Editing
- `src/js/data.js` — locations/aliases, professors, courses, `TIME`, `CALENDAR` (7 days), `HEADCOUNT`, `ICEBREAK`, attendance rules, study decks. All dates/rules/people are **fictional examples**, not official IIT Roorkee data.
- `src/js/variety.js` — dialogue variants, festival cards, random event pool.
- Rename places in-game: Pause → Settings → Rename places.

## Source layout (`src/js`, concatenated in this order by `build.py`)
util · audio · **data** · **variety** · art · maps · tasks (attendance, timetable & warnings, notebook) · engine (loop, clock, movement, sprint, marker) · **chase** (headcount) · minigames (badminton, water fight, dance-off, revision cards, bug squash) · ui · story · acts · main (state, save/load, day cycle, sleep).

## Known limits
- One save slot. Audio is synthesized. Fonts come from Google Fonts (system fallback offline).
- The 7-day calendar is a compressed example, not a real academic calendar.

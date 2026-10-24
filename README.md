# CAMPUS.EXE

> You have one week. 47 things are due. Good luck.

A top-down 2D campus-life adventure / time-management game. Walk around an illustrated campus, talk to friends and professors, attend class, give (or refuse) proxies, eat Maggi at 1 AM, survive the fest, the 8 AM quiz, the 11:59 PM assignment deadline and the Sunday final — then get your **Semester Wrapped**.

## How to play

| Action | Keys |
|---|---|
| Move | `WASD` / Arrow keys (touch: on-screen joystick) |
| Run | `Shift` |
| Interact / talk / advance dialogue | `E` / `Space` / `Enter` (touch: **A** button) |
| Pick a choice | Arrows + `E`, or `1`–`4`, or click |
| Pause / settings / restart | `Esc` (or the **II** button) |
| Toggle minimap | `M` |

## Launching

- **Easiest:** open `dist/campus-exe-standalone.html` in any modern browser (Chrome, Edge, Firefox, Safari). No install, no server.
- Click once in the page so it receives keyboard input. Sound starts after your first click.
- The pixel fonts load from Google Fonts; offline, the game falls back to system fonts and still works.

## Building from source

```bash
python3 build.py
```

This concatenates `src/js/*.js` and `src/style.css` into `src/index.html` and writes:

- `dist/campus-exe.html` — body-only version (used for the hosted artifact)
- `dist/campus-exe-standalone.html` — full HTML document, double-click to play

## Project layout

```
src/
  index.html      DOM shell: HUD, dialogue box, menus, overlays
  style.css       All UI styling
  js/util.js      Math, RNG, time helpers, safe localStorage
  js/audio.js     WebAudio chiptune SFX + music sequencer (no audio files)
  js/art.js       Procedural pixel art: characters (all poses), props, buildings
  js/maps.js      Campus + Hostel, Lecture Hall, Library, Canteen maps, collisions, doors, objects
  js/engine.js    Game loop, input, movement, collision, camera, lighting, particles, scripting helpers
  js/ui.js        Title, character creation, HUD, minimap, dialogue/choices, pause, Wrapped, game over
  js/story.js     7-day story, NPC schedules, all events, actions, endings
  js/main.js      New game / save / continue / day cycle
build.py          Bundler
```

## Engine note

The brief asked for Godot 4 if available. Godot cannot run in this build environment, so the game uses a purpose-built HTML5 Canvas engine (plain JavaScript, no libraries) that delivers the same 2D top-down gameplay and runs directly in the browser. All art is drawn procedurally in code as pixel sprites; all sound is synthesized.

## Systems

- **Stats (0–100, clamped):** Academics, Attendance, Energy, Money, Social — with floating `+10 Academics` style indicators and HUD bars.
- **Hidden variables:** `proxyCount`, `friendTrust`, `allNighters`, `skippedClasses`, plus per-friend relationship values (Rahul, Priya, Kabir).
- **Time:** Monday–Sunday, Morning / Afternoon / Evening / Night. The clock runs while you walk; actions skip time with an animated clock.
- **Day/night lighting**, festival decorations from Wednesday, live concert on Thursday night.
- **Failure states:** Energy 0 → you faint (recoverable). Attendance ≤ 20% → **DEBARRED** game over with restart.
- **Autosave** at the start of each day; **Continue** from the title screen.
- **Replayability:** random events per run (2 of 3: free Maggi coupon, professor's lost ID card, meeting Meera), randomized outcomes (proxy detection, Mystery Sabzi, library events, ring toss), 9 different ending titles.

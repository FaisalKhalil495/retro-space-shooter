# Ember Drift — project rule book

Read this whole file at the start of every session and follow it.
Update it whenever a new decision changes the project.

## What the project is

**Ember Drift** is a side-scrolling space shooter that runs in a phone's web
browser, inspired by the original Space Impact on the Nokia 3310 (2000). The
player's ship flies left to right while the screen scrolls by itself, shooting
waves of enemy ships and fighting a boss at the end of each level.

The owner plays on an Android phone (Chrome). A friend plays on an iPhone 16 Pro
(Safari). Most phone shooters have tiny on-screen buttons you have to keep
looking down at, which covers the action. Ember Drift's controls must feel like
a real console controller, so you can play by feel while watching the game.

## Out of scope (agreed)

- Nokia's name, logo, original sprites, original graphics, or original music
- Online multiplayer
- Publishing to the Google Play Store or Apple App Store
- A shared online high-score table — **postponed, not rejected**. Scores are
  kept on each phone for now; revisit a shared table once the game is finished.

## Decisions (settled — don't re-ask them)

### Gameplay
- Follows the original 3310 version: free movement in all directions, an
  auto-scrolling screen the player can't speed up, and enemies that follow
  fixed paths, chase the ship, or shoot at it.
- 8 levels, each in a different setting, with a boss at the end of each.
- Pickups give extra lives or special weapons: bombs, rockets, and a
  long-range laser.
- The game keeps a score and a high-score table.
- **Difficulty: Hard** (changed from "Classic" after Stage 2 testing — the
  owner found level 1 and Rockjaw far too easy). Bosses should feel like
  modern console bosses: players who've met one before should groan when they
  see it again. Hard but **fair**: every attack has a clear warning (flash,
  sound or wind-up), the ship's hitbox stays smaller than its drawing, nothing
  hits from off-screen without warning. Level 1 is still the easiest level;
  each level after steps up.
- **Boss rule (all 8):** at least 3 phases, at least 5 different attacks, its
  own entrance with a title card, a roar, boss music, and real movement —
  never a target that just sits there. Standing still in front of a boss
  should be the most dangerous thing you can do.
- **Continue:** when all lives are lost, the player may continue from the start
  of the level they reached, but the score resets to zero.
- **Special weapons: carry one at a time.** A pickup gives a few shots
  (e.g. 3 bombs); picking up a different special replaces the current one.
  The Special button fires whatever is carried. A small icon + ammo count in a
  corner of the screen shows what you have.
- Level length: roughly 2–3 minutes each (Claude's call; adjust if it plays badly).
- Special weapon details (Claude's call, Stage 2): **Bombs** (3 shots) send out a
  shockwave that damages everything on screen and wipes enemy bullets.
  **Rockets** (4 shots) fire a pair that home in on enemies. **Laser** (3 shots)
  is a 0.8-second beam straight ahead that pierces everything. Pickups come
  from slow, harmless **cargo pods** you shoot open; the pod's light shows
  which pickup is inside. Extra lives are rare (one per level).
- Bosses are armoured except at a weak point/moment (Rockjaw: only while his
  jaw is open). Specials obey the same rule, so timing matters.
- Stage 5 note: with bosses this hard, suggest a boss checkpoint when the
  continue system is built (owner to decide then).
- Game over currently restarts the level; the continue system arrives in Stage 5.
- **Health bar** (owner request, v0.4.0): 3 lives, each with **5 health
  blocks**. Bullets/acid/gravel cost 1, small rocks and ramming small enemies
  2, big rocks 3, Rockjaw's bite charge 3, being sucked into his mouth 5
  (instant death). 1 second of safety after a hit; red edge flash; warning
  beeps and smoke at 1 block.
- **Automatic power-ups** (round orbs, no button): Shield (absorbs 3 hits or
  10 s), Repair (+2 blocks), Spread Shot (3-way fire, 12 s), Rapid Fire
  (double rate, 12 s), Wingman drone (fires with you, 15 s). They stack;
  re-collecting resets the timer. Sources: cargo pods in the level, random
  drops from gunships (30%), seekers, rocks (see v0.7.0) and weavers (small
  chance), and boss supply pods.
- **Smart supplies** (owner request, v0.4.1): during a boss fight a supply
  pod arrives every 20 s (first one 3 s in). What's inside is decided when
  it's shot open: health <= 2 → Repair; no shield → Shield; not full health
  → Repair; no laser → Laser special; otherwise Rapid Fire or Spread Shot.
  During levels, when health is 2 blocks or fewer, drop chances rise
  (x2.5 + 6%) and 60% of drops are Repair; at full health drops are unchanged.
- **Rock fragments toned down** (owner request, v0.4.2): shooting a big rock
  breaks it into 2 blinking fragments that fly up/down away from the ship,
  slower, costing 1 block (a whole small rock still costs 2). Rockjaw's
  splitting rocks crack and flash for 0.5 s first, then burst into 2 slower
  pieces of gravel (was 3, no warning).
- **Tried and reverted (v0.5.0):** an asteroid rework (streakers, boulders,
  treasure rocks, level meteor showers, outward-bursting fragments, Ember
  Crystals + Ember Surge, level 1 split into 5 named sections). The owner
  found level 1 boring with it and asked to go back to v0.4.2. Don't
  reintroduce these without asking.
- **Longer, deadlier level 1** (owner request, v0.6.0): about 3 minutes
  before Rockjaw, in three parts with no calm breaks — 0:00–1:00 the opening,
  1:00–2:00 snipers, spinners and asteroid fields, 2:00–3:00 everything.
  Cargo pods spread out; a second Repair pod at 2:20. **Level rocks only**
  (Rockjaw's fight keeps the gentle v0.4.2 split): big rocks burst into 3
  blinking shards in all directions (some towards you), faster, 1 block each;
  small rocks crack into 2 pebbles (1 block each). More shooters: new
  **Sniper** (parks on the right, flashes a dotted red aim line for 0.6 s,
  then a fast shot along it; 3 shots, then leaves) and **Spinner** (rotating
  disc, 8-way star bursts about every 2 s, 3 bursts, then leaves); rows fire
  from the first and last pod; weavers spit 2 times in 3; seekers fire once
  as they pass; dive-bombers fire. Every shot is preceded by a blink warning.
- **More gunships** (owner request, v0.6.1): gunships roughly doubled in
  level 1 (14 → 28), including groups of 3. Groups hover in separate lanes
  (above, level with and below the player) and fire in turn, not all at once.
- **v0.7.0 changes** (owner request):
  - **Pods only shoot out of their noses.** Pods ambushing from behind never
    fire (they only ram); pods from the front fire only while the player is
    still ahead of their gun; dive-bombers from above/below can fire.
  - **Rocks carry real loot** (no glints, nothing from v0.5.0): big rocks
    25% (40% when health <= 2), small rocks 6% (12% when hurt). About 30% of
    rock drops are special weapon ammo, which tops up the special you carry
    (random one if you carry none); the rest are power-ups. When hurt, 60%
    of drops are Repair. Fragments, pebbles and Rockjaw's rocks never drop.
    About 15 items per level if every rock is shot (was about 2).
- Level 1 enemies (Hard): some pods shoot, weavers spit acid, gunners fire 4
  faster shots, seekers steer harder; ambushes from behind, dive-bombers from
  top/bottom and pincers, each flagged by a red "!" warning marker first.

### The 8 levels and bosses (in order)
1. **The Outer Belt** — asteroid field in deep blue space, distant amber sun.
   Easy opener. Boss: **Rockjaw**, a living asteroid; its mouth opens to spit
   rocks, and that's when it's vulnerable.
2. **Rust Moon** — low flight over dusty red canyons, turrets in the rock.
   Boss: **The Siege Crawler**, a giant walking tank firing upward.
3. **Frostring** — frozen comet ring, pale blues and whites, drifting ice.
   Boss: **The Glacier Warden**, an ice-armoured ship; chip armour off to
   expose the core.
4. **The Ember Mines** — underground tunnels lit by soft amber crystals;
   ceiling and floor squeeze the space. Boss: **The Drill Worm**, a mechanical
   worm bursting from walls above and below.
5. **Stormveil** — inside a gas giant's cloud layers, dusty-orange storm bands,
   lightning. Boss: **The Tempest Ray**, hides in clouds and calls lightning
   strikes (with warning flashes first).
6. **The Shipwreck Graveyard** — drifting wrecks; enemies ambush from behind
   debris. Boss: **The Scrap King**, built from salvage; throws debris and gets
   faster as pieces fall off.
7. **The Molten Deep** — lava tunnels deep underground, glowing deep red.
   Boss: **The Magma Leviathan**, rises from lava and sprays sweeping fire.
8. **The Hive World** — the invaders' strange, organic homeworld; hardest
   level. Boss: **The Hive Mother**, two phases: swarms of small ships, then
   fights directly.

### Progress, scores and modes
- High scores are saved **on each phone** (no server) for now.
- The game **remembers the furthest level reached**. The title screen offers
  "Continue" from that level, or a fresh start from Level 1. Starting mid-game
  starts the score at zero.
- **Practice mode:** replay any level already reached. Practice scores never go
  on the high-score table.

### Content rating: adults (18+)
- **Explosions, not blood** (owner request, v0.7.0 — blood everywhere was
  distracting): machines (pods, gunships, seekers, snipers, spinners, cargo
  pods) explode in pixel-art blasts — flash, fireball cooling from cream to
  amber to red, smoke, sparks; bigger ones add a shockwave ring and metal
  wreckage. Rocks crumble into stone dust. The player's ship sparks when hit
  and explodes with glass and wreckage on death (no blood).
- **Blood only for living creatures:** weavers bleed lightly (a small spurt
  when hit, a short puff on death, no stains). Rockjaw keeps the full gore:
  bleeds, loses teeth and an eye, long gory death. Future living bosses may
  bleed too; ask before adding blood to anything else.
- Blood uses deep, dark crimsons that fit the muted palette (no bright
  cartoon red, no neon).
- **Swearing is allowed** in on-screen text: boss taunts, death / game-over
  quips.
- Stage 5 adds a **"Blood: On / Off"** menu switch (on by default).

### Look
- Modern retro **pixel art in colour**.
- Muted, warm palette: deep space blues, soft ambers, dusty reds.
- **No neon colours and no neon glow effects.**
- All names, ship, enemies, bosses, artwork and sounds are our own originals.

### Sound
- **Warm retro** style: retro-electronic but softer and richer (16-bit-console
  feel), melodic and a little moody.
- A music theme for each level, plus more intense boss music. **Boss music
  arrives early (Stage 2 rework)**; level themes still come in Stage 6.
- All sound and music is generated by code inside the game (no audio files),
  so it's 100% original and loads instantly.

### Screen and controls
- Played in **landscape** (phone held sideways).
- The game screen sits in the middle; controls live in the left and right
  margins so thumbs never cover the action.
- **Left:** a floating direction pad appears wherever the thumb lands; sliding
  steers in 8 directions.
- **Right:** big console-style **Fire** and **Special** buttons, angled where a
  thumb naturally rests. Holding Fire keeps firing.
- Touch areas are bigger than the visible buttons, so near-misses still count.
  Buttons light up when pressed.
- **Feedback:** buttons vibrate on Android. iPhone browsers don't support
  vibration, so on iPhone use stronger visual and sound feedback instead.
- Keep the controls and game clear of the iPhone 16 Pro's camera cutout
  (Dynamic Island) in landscape — respect the browser's safe-area insets on
  both sides, since the phone can be turned either way.
- Must work in **Chrome on Android** and **Safari on iPhone**.

### Technical approach
- Plain modern JavaScript + HTML canvas, no game engine and no build step.
  What's in the repository is exactly what runs in the browser. This keeps the
  game small and fast and gives full control over the touch controls.
- No passwords, API keys or secrets in the code, ever.

### Playing it on a phone (hosting and updates)
- The repository is **public** (decided so GitHub Pages works for free).
- **GitHub Pages** serves the `main` branch, root folder, at:
  **https://faisalkhalil495.github.io/retro-space-shooter/**
- `.nojekyll` in the root tells GitHub Pages to serve files exactly as they are.
- Update flow: Claude works on the session's own branch and pushes there. When
  a stage (or fix) is ready, **Claude opens a pull request into `main` and
  merges it itself** (the owner gave standing permission for this), then tells
  the owner in chat that it's live. About 1–2 minutes later the game link shows
  the new version. Each merge is a save point; if a version breaks, fix it or
  revert that merge to go back to the last working version.
- After a merge, bring the work branch up to date with `main` before new work
  (fast-forward; never rewrite history).
- Show a small version label in the game so the owner can tell whether the
  phone is showing the latest version (phones can keep an old copy for a few
  minutes).

## Stage plan

Approved by the owner. Keep the status column up to date.

| # | Stage | What's in it | Status |
|---|-------|--------------|--------|
| 1 | **First Flight** | Pixel-art ship over a scrolling starfield; full control layout (floating d-pad, Fire + Special, oversized touch areas, light-up, Android vibration); centred game screen clear of the iPhone cutout; "turn sideways" prompt; 3 basic enemies (straight, weaving, shooting); lives, score, game over + tap to play again; auto-pause when switching apps. | Done (v0.1.0) |
| 2 | **The Outer Belt** | Full level 1 (2–3 min of planned waves + asteroids); pickups (extra life, bombs, rockets, laser) + corner ammo icon; boss Rockjaw; level-complete screen; basic sound effects (shots, explosions, button clicks — iPhone feedback relies on sound). | Built — owner testing |
| 3 | **Levels 2–4** | Rust Moon, Frostring, Ember Mines + bosses; tunnel walls you can crash into; new enemy types per setting. | |
| 4 | **Levels 5–8** | Stormveil, Shipwreck Graveyard, Molten Deep, Hive World + bosses (two-phase Hive Mother); ending screen. | |
| 5 | **Menus & Progress** | Title screen, pause button/menu, continue option, "Continue from Level X" remembered, Practice mode, high-score table on the phone. | |
| 6 | **Music & Polish** | Warm retro music per level + boss music; screen shake, explosions, transitions; "Add to Home Screen" full-screen support (extra Claude suggested); final check on both phones. | |

Testing: Claude checks each stage on a simulated phone screen before handing
it over. The owner tests on Android; ideally the friend checks iPhone each stage.

## Code map

- `index.html` — the page: canvas, start / pause / "turn sideways" screens, CSS.
- `js/main.js` — start-up, screen sizing, game loop, pause, full screen.
- `js/config.js` — version, game-pixel size (208×144), palette, player tuning.
- `js/layout.js` — where the game screen and thumb zones go (safe areas).
- `js/controls.js` — floating d-pad, Fire/Special, near-miss touch areas, drawing them.
- `js/feedback.js` — vibration (Android) and its strengths.
- `js/game.js` — game state: player, shots, enemies, pickups, collisions,
  damage/armour, lives, score, HUD, banners, level clear.
- `js/enemies.js` — enemy types (incl. asteroids, seekers, snipers, spinners,
  cargo pods) and how they move/shoot.
- `js/bosses.js` — boss behaviour (Rockjaw so far: 3 phases, 8 attacks,
  entrance, transitions, gory death).
- `js/weapons.js` — special weapons (bombs, rockets, laser), pickups, corner icon.
- `js/powerups.js` — automatic power-ups (shield, repair, spread, rapid,
  wingman), their orbs, timers and HUD icons.
- `js/waves.js` — enemy formations. `js/levels.js` — level timelines + runner.
- `js/background.js` — starfield, sun, dust band, distant rocks (per-level theme).
- `js/sprites.js` — pixel art as text grids. `js/rockart.js` — asteroids and
  Rockjaw drawn by code. `js/font.js` — 5×5 pixel font.
- `js/audio.js` — all sound effects, synthesised in code (incl. boss roar,
  growl, jaw snap, inhale, splat).
- `js/music.js` — boss music, generated live.
- `js/gore.js` — blood (creatures only), chunks/debris, stains, screen-glass
  smears, boss corpses.
- `js/blasts.js` — explosions: fireballs, shockwave rings, smoke, rock dust.
- `js/util.js` — small maths helpers.
- `tools/set-version.sh X.Y.Z` — bump the version everywhere (do this for every
  release so phones fetch fresh files).
- `tools/smoke-test.mjs` — simulated-phone test (Android + iPhone sizes):
  `PLAYWRIGHT_PATH=/opt/node22/lib/node_modules/playwright node tools/smoke-test.mjs <screenshot-dir>`
- `tools/level-test.mjs` — invincible autopilot plays a whole level at high
  speed; checks pickups, specials, boss and level clear (same command style).
- Testing aids: add `?safe=62` to the URL to fake an iPhone camera cutout;
  `?start=boss` jumps straight to the boss with a laser loaded;
  `?start=60` starts 60 seconds into the level.

## HOW TO WORK WITH ME — these rules apply for the whole project, every session
- I'm not an experienced coder. Assume I don't know the technical details, but work at full strength. Just keep me in the loop in language I can follow.
- Write to me in plain English. No jargon. If a technical term is worth using, use it and explain it in one line the first time.
- When you make a significant decision, tell me what you chose and why in a sentence or two.
- When I need to do something myself, give me the exact thing to type or tap, and tell me what I should see when it works.
- I'm working only from my phone, through the Claude app, with no computer. Every instruction and every test step must be something I can do on my phone.
- Don't assume I know the terminal, git, GitHub, package managers, or deployment. Walk me through anything I have to do.
- One thing at a time. Don't stack three decisions into one message.
- If I ask for something that's a bad idea, say so and tell me why.

## BUILD RULES
- Build it properly. Use the approach you'd actually recommend, and tell me in one line what you picked and what it gets us.
- Tell me when you go beyond what I asked (extra features, a refactor, a restructure) and what changed, so nothing surprises me later.
- The game and its menus must be genuinely well designed, modern, and feel great on a phone. It must work in Chrome on Android and Safari on iPhone.
- When you add a library or service, say in one line what it does and why.
- Never put passwords, API keys, or secrets directly in the code.
- After each stage works, save the progress in GitHub so we can go back if something breaks later, and tell me in plain English that it's saved.
- If you're unsure what I meant, ask instead of guessing.

## Working process (every session)
1. Read this file.
2. After each stage: stop, describe what was built in one short paragraph, and
   give exact phone test steps (what to tap, what success looks like, what
   failure looks like). Wait for the owner to test before moving on.
3. If something doesn't work: say what you're seeing and what you're trying.
   If going round in circles, say so and offer options, including going back
   to the last version that worked.
4. The owner also prefers: always ask before starting anything big.

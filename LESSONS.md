# Ember Drift — what we've learned (owner preferences + lessons)

This file is the project's memory of **how** we work and **why** things ended
up the way they are. `CLAUDE.md` is the rule book (the *what*: settled
decisions and numbers). This file is the *why*: the owner's tastes, what was
tried, what was rejected, and the lessons that should shape every future
stage — and, one day, a system for building more games.

**When to use it**
- Read it (with `CLAUDE.md`) before planning any stage.
- Update it at the end of **every** stage: add a retrospective (section 7),
  add any new preferences or lessons, and move anything reusable into
  section 8 ("Recipe for future games").

Last updated: end of Stage 2 (v0.10.3).

---

## 1. How the owner likes to work

- **Phone only.** No computer. Every instruction and test step must be
  tappable on a phone. Give direct links, including shortcut links
  (e.g. `?start=boss` to jump to the boss) — the owner asked for these.
- **Plain English, short, concrete.** Numbers help: "about 4 per run",
  "1 in 4 big rocks", "25% of the level". Tables comparing *now vs. new*
  were well received and the owner explicitly asked for them.
- **Plan first, then build.** The owner usually says "analyse the current
  state, then plan". Show what exists today (with numbers), then the plan,
  then ask "Do you approve?". Don't build before approval.
- **One decision at a time.** When a plan has a real choice in it, ask one
  clear question (with a recommendation) rather than a list of options.
- **The owner edits plans by reply.** Expect short corrections like
  "Don't show STAGE BROKEN" or "Keep the time 25%" — apply exactly that,
  restate the revised plan briefly, and carry on.
- **Ask when it's ambiguous.** "Keep the time the same. 25%" could mean
  several things — asking once (with options) avoided building the wrong
  thing. Don't guess on numbers the owner has opinions about.
- **"Review the new update" after almost every release.** The owner asks
  for a code review after nearly every change, and those reviews found real
  bugs every time. Lesson: **review every release before handing it over**
  (see section 5), so the owner gets the fixed version first.
- **Claude merges.** Standing permission: open the pull request and merge it,
  then tell the owner it's live and saved, with phone test steps (what to
  tap, what success looks like, what failure looks like).
- **Phones cache old versions.** Once the owner tested an old copy (v0.4.2)
  and sent a screenshot of it. Always remind them to check the version label
  in the corner, and how to reload (⋮ → circular arrow in Chrome).
- **Wants to understand the systems.** Questions like "how often do power-ups
  appear?" or "what are we supposed to get in the boss fight?" deserve a
  real audit of the code, with numbers — that's how the supply-pod bug
  (weapons never arriving) was found.

## 2. Gameplay taste (learned the hard way)

**Difficulty**
- Wants it **hard**. "Classic" was "far too easy"; Rockjaw had to become a
  modern console-style boss ("God of War-like", menacing, many tricks).
- But hard must be **fair** and **survivable**: after the hard rework the
  owner asked for a health bar and power-ups; after "came very close twice"
  asked for help that adapts to need. Pattern: *raise the threat, then add
  smart help*, never just make things easier.
- Help should be **earned or needed**, not random: smart supply pods that
  read your state, a bonus for breaking each boss stage, more drops when
  badly hurt, no wasted Repairs at full health.

**What the owner wants more of**
- **Things that shoot back.** Asked twice for more shooters ("more enemies
  that fire bullets", "more of these [gunships]").
- **Dangerous environment.** Rock fragments should actually hurt in levels —
  but not in a way that feels cheap (they were toned down once when they
  felt unfair at the boss).
- **Longer levels** (~3 minutes before the boss) with **no calm breaks**.
- **Bosses with personality**: talking, taunting, swearing, reacting to
  pain — in **comic-book speech bubbles**, not as screen titles or narrator
  captions. But **never while you're dodging**: bubbles during attacks were
  "distracting" (v0.10.4). Talk only in pauses (entrance, stage breaks,
  after a kill) and keep bubbles out of the space between ship and boss.
- **Rewards for progress**: e.g. a bonus every time a boss stage breaks.
- **A gamble / mystery**: loot hidden in big rocks with **no visual tell** —
  "I need to guess which rock" makes it interesting.
- **Real, useful loot** — actual power-ups and ammo, not abstract currencies.

**What the owner rejected or disliked**
- **v0.5.0 asteroid rework → "level 1 feels boring", reverted.** It added
  many systems at once (streakers, boulders, treasure rocks with glints,
  meteor showers, an "Ember Crystal" currency + "Ember Surge", named level
  sections). Lessons: don't stack many new systems in one release; avoid
  abstract meta-currencies; don't slow the action down with "sections".
- **Glints / tells on loot rocks** — rejected twice ("I don't want glints").
- **Banners** like "STAGE BROKEN!" — rejected. Keep rewards quiet (a small
  floating "+1000") and let the action speak.
- **Blood everywhere** — "distracting". Replaced by explosions; blood only
  for living creatures, and lightly except for the boss.
- **Things that don't make physical sense**: pods firing from behind
  ("their asses are facing me, not their guns"). Enemies should behave
  plausibly — guns fire where they point.
- **Wasted rewards**: a Repair at full health, ammo for a full weapon,
  a pod that swaps away the weapon you're saving. Every drop should be useful
  at the moment you get it.

**Numbers the owner has set (and cares about)**
- Level 1 ≈ 3 minutes before the boss, in three parts.
- Spread Shot and Rapid Fire should each be running **about 25%** of the
  level — the owner wants *more pickups* but not *more uptime*.
- Big rocks hold loot 35% of the time; small rocks never.
- Gunships doubled; groups hover in lanes and fire in turn.
- (Full list: `CLAUDE.md` → Decisions.)

## 3. Look, sound and presentation

- Modern retro **pixel art**, muted warm palette (deep blues, ambers, dusty
  reds). **No neon, no glow.** Original art and sound only (no Nokia assets).
- **Explosions** are the main "juice": flash → fireball cooling cream →
  amber → red → smoke; bigger enemies add a shockwave ring and wreckage.
- **Colour language must stay consistent**: amber "A" = ammo everywhere;
  white light = survival pod; a pod's light always shows what it gives.
- **Nothing may hide a threat**: effects, smoke and speech bubbles are drawn
  *under* bullets, rocks, enemies and pickups.
- Swearing is welcome in boss lines and death quips (adult game).
- All sound is synthesised in code (warm, filtered, 16-bit feel).

## 4. Things that went wrong, and the lesson from each

| What happened | Lesson |
|---|---|
| v0.5.0 rework rejected as boring | Change one system at a time; let the owner feel each change before adding the next. Cheap reverts (each merge is a save point) made recovery easy — keep it that way. |
| Boss supply pods almost never gave weapons | Priority chains starve later items when an earlier condition is almost always true (shield lasts 10 s, pods come every 20 s). Simulate real timings, not just the rule on paper. |
| Tests missed the supply-pod bug | The test shortcut (`?start=boss`) handed the player a laser, hiding the bug. Test the real path the player takes, not only shortcuts. |
| Bonus items vanished off-screen | Test extremes: the boss at the screen edge, the player dying at the same moment, the last life. Several bugs only appeared there. |
| A fix's test passed on the old code too | Prove a new check would have **failed before the fix** (temporarily revert, run, restore). |
| Pod light promised a Laser but gave Repair | Anything that *shows* a reward must use the same function that *decides* it. Decide rewards at pickup time ("decide when grabbed") so they're never stale. |
| Fireballs hid bullets | Draw order is a fairness rule, not just a looks rule. |
| Speech bubble hid behind the boss | Big bosses leave no "free" space; placements need fallbacks and must not jump frame to frame. |
| The level test sometimes raced the live game | A test hook that "pauses" the game must actually stop the live loop (`window.__ember.frozen`). |
| Owner played an old cached version | Version label on screen + reload instructions in every hand-over. |
| Ambiguous request ("25%") | Ask with concrete options instead of guessing. |
| Speech bubbles distracted mid-fight | Anything that asks to be read must happen when the player isn't busy dodging. Flavour goes in pauses, never on top of the action. |
| A quick self-review missed bugs a deeper one found (v0.10.4) | Self-review every release at the **deeper** level, not the quick one. |
| A new check couldn't fail (the test player never dies, so no kill line) | When adding a check, also break the code on purpose and confirm the check fails. |
| Turrets got stuck at the left edge once their spire scrolled away (3B-1) | Don't make one object follow another that can be removed; give each its own movement and only *read* shared facts (like the spire's height). |
| Adding a floor nearly changed level 1 (dust puffs and bouncing shards at the screen's bottom edge) | When a new level adds a shared rule, check what it does on the old levels too; guard it so levels without that feature behave exactly as before. |
| Floor turrets sat 1 pixel too low for the ship's gun to ever hit them (v0.12.0 review) | For every enemy that can't move, check the ship can actually line up a shot on it from somewhere it's allowed to fly. Now an automatic check. |
| A test kept a reference to the ship from before a level reset, so it could never fail | Tests must re-read game objects after anything that rebuilds them (reset, respawn, next level). Breaking the code on purpose caught it. |
| The Siege Crawler's open core was almost unhittable: shots clipped the armour a pixel in front of it (v0.13.0, before release) | **Time the boss fight on autopilot and compare with the last boss.** A fight 10x longer than expected meant a bug, not a balance problem. A weak point's hit area must reach the edge a shot arrives from. |
| A check on the flak gap passed on broken code only by luck (the gap's position is random) | When a rule depends on random positions, pin the worst case in the test instead of hoping the dice land on it. |
| The boss's knock-back assumed you were always in front of it | Knock-backs, pushes and "away from" moves must work from every side, including behind a boss — and must fully clear it, not just nudge. |
| v0.13.0 review: the cannon couldn't aim low and close, leaving a safe spot right where you shoot the core | For every boss, look for **safe pockets** (low in front, behind, on top) and check at least one attack reaches each. A boss's weak spot must never also be a safe spot. |
| Boss drawing used the game's dice for its wobble | Drawing must never use the game's random numbers, or tests stop being repeatable. |

## 5. Our working process (what works)

1. **Read** `CLAUDE.md` and this file.
2. **Analyse the current state** with real numbers from the code.
3. **Plan** in plain English with a now-vs-new comparison; one question;
   wait for approval.
4. **Build** in small, focused changes on the work branch.
5. **Test**: lint, the simulated-phone smoke test (Android + iPhone sizes,
   fake camera cutout), the autopilot level test, and screenshots of
   anything visual. Add a check for every new rule.
6. **Self-review before hand-over** (new from Stage 2's lessons): run a
   code review on the change, verify each finding, fix the real ones, and
   only then release. The owner shouldn't have to ask.
7. **Release**: bump the version (`tools/set-version.sh`), update
   `CLAUDE.md`, pull request, merge, fast-forward the branch.
8. **Hand over**: what changed (plain English), phone test steps with
   links, what success and failure look like, and that it's saved.
9. **End of stage**: full code review of the whole game, clean-up release,
   mark the stage done, and update this file.

## 6. Technical notes worth keeping

- **No engine, no build step**: plain JavaScript modules + HTML canvas,
  served as-is by GitHub Pages. Every import carries `?v=X.Y.Z` so phones
  fetch fresh files after each release.
- **Fixed game resolution** (208×144 "game pixels") scaled to the phone,
  with a fixed physics step (1/120 s) for steady behaviour on any phone.
- **Controls**: floating d-pad on the left half, big Fire/Special on the
  right, oversized touch areas, safe-area insets for the iPhone camera
  cutout, vibration on Android and sound feedback on iPhone.
- **Everything drawn in code**: sprites as text grids, rocks/boss painted by
  code, synthesised sound and music — tiny and instant to load.
- **Enemy types are plain objects with optional hooks** (update, draw,
  onDeath, hitTest, aimPoint, onScreen, contactDamage…). New enemies and
  bosses plug in without touching the core loop. Supply pods and stage
  bonuses live in the game core, so every boss gets them.
- **Tests**: Playwright drives a real Chromium on simulated phones; an
  invincible autopilot plays the whole level at high speed. The lint
  config is kept outside the repo (in the session scratchpad) — consider
  adding one to the repo so it's always available.
- **Ground (`js/terrain.js`)**: a level with `floor: N` gets a solid floor
  strip and rock spires (`spires` pattern). Everything on the ground
  scrolls at `GROUND_SPEED`; `terrain.solid()` stops shots on rock. Levels
  with `floor: 0` behave exactly as before. The Ember Mines' tunnels will
  build on this.
- **Boss toolkit** (from building the second boss): a boss is a plain enemy
  type with modes (enter → intro → taunt → fight ↔ transition → dying),
  a moveset per stage that never repeats the last attack, attacks as small
  functions that return true when done, and a warning flag for each
  attack that the tests can read. Shared help lives in Game (supply pods,
  stage bonuses, talking rules, player hitbox). Measuring each boss on
  autopilot (fight length, how long the weak point is open) keeps
  difficulty steps honest.
- **Per-level difficulty**: `shotSpeed` on a level scales every enemy shot
  (Rust Moon 1.1). An enemy whose gun isn't at its front-middle gives a
  `muzzle(e)` so the warning blink shows in the right place.

## 7. Stage retrospectives

### Stage 1 — First Flight (v0.1.0)
Built the foundation: ship, starfield, the full console-style control
layout, safe areas, "turn sideways" prompt, three basic enemies, lives,
score, game over, auto-pause. The owner approved the controls quickly
("controls are fine") — the up-front care on touch controls paid off.

### Stage 2 — The Outer Belt (v0.2.0 → v0.10.3)
The longest stage by far: about 20 releases, almost all driven by the
owner playing on the phone and reporting how it felt.
- v0.2–0.3: level 1 + Rockjaw built, then made **Hard** ("far too easy"),
  boss rebuilt as a 3-phase, 8-attack console-style boss; gore and
  swearing added.
- v0.4.x: health bar + automatic power-ups ("much more difficult now"),
  smart supply pods at the boss, gentler rock fragments.
- v0.5.0: big asteroid rework — **rejected and reverted**.
- v0.6.x: longer level (~3 min), Sniper and Spinner, more shooters,
  dangerous level rocks, gunships doubled.
- v0.7.x: pods only fire forwards, explosions instead of blood, loot in
  rocks.
- v0.8.x: loot only in big rocks (35%, no tells), no wasted Repairs.
- v0.9.x: boss pods take turns (survival / weapon) — fixed specials never
  arriving at the boss.
- v0.10.x: Rockjaw talks in speech bubbles; bonus for breaking each boss
  stage; full code review and clean-up; Stage 2 done.

**What worked:** short feedback loops (play → report → plan → build →
play); numbers in plans; reverting quickly when something felt wrong;
reviewing every release.
**What to do better in Stage 3:** self-review before hand-over; change
fewer things per release; test edge cases (screen edges, deaths, last
life) from the start; carry Stage 2's preferences into the first plan so
fewer rounds are needed.

### Carry into Stage 3 (checklist for the plan)
- Each boss: 3+ phases, 5+ attacks, entrance + name card, roar, music,
  real movement, **speech bubbles in first person**, a **stage bonus** per
  broken stage, **alternating supply pods**, weak point / armour rule.
- Ask before giving a boss blood: Siege Crawler, Glacier Warden and Drill
  Worm read as machines → explosions by default.
- Plenty of shooters, every shot with a warning blink, guns fire where they
  point, nothing from off-screen without warning.
- Loot that's useful when you get it; mystery loot without tells is liked.
- No banners; quiet rewards; nothing drawn over bullets.
- Each level steps up in difficulty from the last; ~3 minutes, no calm
  breaks.
- One new system per release where possible.

## 8. Recipe for future games (reusable)

The parts of this project that would carry over to any new game:

**Kick-off questions that worked** (asked one at a time at the start):
name; genre and inspiration; who plays and on what phones; difficulty;
number of levels/bosses; art style and palette; sound style; content
rating (blood, swearing); controls layout; saving progress and scores;
what's out of scope.

**Documents to create on day one**
- `CLAUDE.md` — the rule book: settled decisions, stage plan with status,
  code map, the owner's working rules.
- `LESSONS.md` — this file: preferences, lessons, retrospectives.

**Default tech recipe for a phone browser game**: plain JS + canvas, no
build step, GitHub Pages hosting from `main`, versioned imports, a fixed
low game resolution scaled up, a version label on screen, Playwright smoke
test on Android and iPhone sizes, an autopilot playthrough test, and
`?start=` shortcut links for testing.

**Default way of working**: work in stages; plan →
approve → build → self-review → release → phone test → feedback; one
decision at a time; Claude merges with standing permission; full review +
retrospective at the end of every stage.

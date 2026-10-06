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
  long-range laser. Rockets (v0.13.2) go for a boss's open weak spot first,
  prefer unarmoured targets, and never chase cargo pods, mines or mortar
  shells.
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
- **Rust Moon (level 2), step 3B-1, v0.12.0**: about 3 min, three parts
  with no calm breaks, each new enemy shown alone first (turret 0:08,
  skimmers 0:22, mortar 0:34); the same cargo-pod schedule as level 1; the
  boss event at 3:04 (v0.13.0). Enemy shots 10% faster (`shotSpeed: 1.1`).
  - **Ground**: the bottom 14 px is a canyon floor you can't fly into (it
    doesn't hurt). **Rock spires** stand on it: crashing costs 2 blocks and
    knocks you back the way you came (or up and over); shots stop on them
    with a dust puff; indestructible. Spires stay solid while you're
    flashing after a hit or respawn (they just don't hurt then; v0.12.1).
    Dropped items always appear above spires, never inside them.
    Pods diving from above crash into the ground (or into a spire in
    their way; v0.14.3); snipers leave upwards.
  - **Cliff turret** (on spires, or on a low rock mound on the floor, so
    the ordinary gun can always reach it): shut and armoured 1.6 s, hatch
    blinks 0.4 s, opens and fires 2 aimed shots at least 0.35 s apart,
    then stays open venting — **1.6 s open in all** (owner, v0.14.2: they
    were too hard to kill), then shuts. Only hurt while open (specials too;
    ramming a shut turret costs you 2 blocks and doesn't break it). **3 HP**,
    50 pts, 15% drop; your shots also count 2 px above its dome. Arriving at
    a random moment, roughly lined up, one dies in about 1.2 s / 9 shots
    (was 3.1 s / 24). Never fires at a ship that's behind it.
  - **Dust skimmer**: races in along the floor (hopping spires), swoops to
    your height, blinks 0.3 s, fires a 3-shot spread, climbs away. Only
    fires if you're in front of it. 2 HP, 40 pts, 10% drop.
  - **Mortar crawler**: a ground tank — it **never leaves the ground**
    (owner, v0.14.2). At a spire it digs under it in a puff of dirt (out of
    reach, can't fire, shown as a moving dirt mound) and pops out the other
    side — **only where it has room to fire** (48 px of open ground before
    the next spire; owner, v0.15.0: they kept popping up in gaps between
    towers doing nothing), so it tunnels under a whole row of close spires
    in one go. It **arrives only over open ground**: it waits (up to 10 s)
    until the newest spire is 60 px in from the right edge. It walks in the
    open, hurries past spires, and **only fires
    when you could shoot back** (never with a spire right in front of it).
    Lobs a shell every 1.8 s (about 19 shells a level; every crawler fires
    at least once). A red
    ring with a cross marks where it bursts (where you were at launch)
    0.9 s ahead; the burst costs 1 if you're on it and throws 4 fragments
    (1 each). A shell that touches you on the way bursts right there.
    Shells can be shot down. 3 HP, 50 pts, 15% drop.
  - **No rocks on this planet** (owner, v0.14.0: rocks belong to level
    1's asteroid field, not a planet). Their loot went to supply drones
    (v0.14.0), which the owner found no fun ("they don't fire, they just
    come towards me"), so since v0.15.0 it's carried by **Rust Raiders**:
    small armed fighters (rust-red, swept-back grey wings) flying in
    convoys of 1–4 in a gentle wave, the whole convoy at one speed (so its
    ships never merge). While you're in front of its nose a raider blinks
    0.3 s, then fires an aimed shot, and a second 1.5 s later (2 at most;
    never at a ship behind it); a convoy takes turns (each one's first shot
    0.45 s after the one before). Ram 2 blocks, 3 HP, 40 pts; they lift
    over spires like every flyer. **All raiders look the same**, about
    **35% carry loot** (50% when hurt), and about 30% of that is "A" ammo,
    the rest power-ups — the owner's guessing game, about 10 items a level
    (as the rocks gave).
  - **Turrets are never hidden** (owner, v0.14.0): a turret's spire (or
    mound) is at least as tall as every spire on screen when it arrives
    (`terrain.turretPerch`), so a straight shot always reaches it.
  - **Cargo pods fly above the towers** on levels with ground (their bottom
    stays above the tallest possible spire, `MAX_SPIRE` = 74 px in
    terrain.js; no spire is ever taller).
  - **No flying enemy ever passes through a tower** (owner, v0.14.3):
    pods, skimmers, gunships, seekers, snipers, spinners and weavers lift
    over any spire just ahead, keeping 10 px clear (`ROCK_CLEARANCE`); a
    sniper lifted mid-aim cancels its shot and aims again. Dive-bombers
    crash instead. Gunships in a group never stack up looking like one
    ship: the upper-lane one keeps above the lower one (v0.14.4).
  - **Ambushes from behind** (owner, v0.14.3) only come while the towers
    are short — every spire on screen 44 px or less (`SHORT_SPIRE`); an
    ambush waits up to 6 s for that — and their lanes are always above
    the tallest tower on screen (checked again as each pod arrives, in
    case a taller one came into view during the warning; v0.15.0). Level 2 ambushes at 0:46, 1:33, 1:57,
    2:31 and 2:53.
  - About 15 turrets, 20 skimmers, 9 mortars, 21 gunships, 10 snipers,
    6 spinners and 30 Rust Raiders.
- **The Siege Crawler** (boss of Rust Moon, step 3B-2, v0.13.0): a giant
  six-legged gunmetal war machine walking the canyon floor (gunmetal so it
  stands out against the red canyon). Name card "SIEGE CRAWLER / THE
  WALKING FORTRESS" (names too wide for big letters are drawn a size
  smaller), horn blast, a marching version of the boss music, metallic
  voice blips. 210 HP (Rockjaw 200); on autopilot it lasts about 1.6x as
  long as Rockjaw. Machine: explosions, no blood.
  - **Weak point**: a core behind armour plates on the front of its hull,
    open only while the main cannon locks on and fires (and ~1 s after),
    and from stage 2 while drones launch. Specials obey the same rule.
  - **Attacks** (every one warned): **Cannon** (barrel tracks you, snaps
    on as it locks, then a dotted red aim line 0.8/0.7/0.6 s, a heavy shell
    costing 2; 3 shells in stage 3; it can aim anywhere above it and tip
    steeply down over its nose, so there's no safe spot low in front of it
    or behind it; between attacks it walks straight at a ship hiding low
    at its feet); **Mortar barrage** (3/4/5 shells on red rings, the first
    where you are); **Flak wall** (dotted line across the screen with a
    gap between two posts, 1 line then 2, bursts sweep right to left,
    1 block, never reaching into the gap; fragments fly away from the other
    line, so neither gap is crossed); stage 2+: **Mines** (drift,
    burst after 3 s or 0.5 s after you get close, or on touch, 2 blocks +
    fragments, shootable), **Drones** (hunt you, blink, fire once), **Stomp**
    (rears up 0.6 s, a dust wave rolls along the floor both ways, 2 blocks,
    fly above it; then the ground cracks open: each crack shows with a "!"
    for 0.75 s — the first one under you — before a rock spike bursts up out
    of the floor, 2 blocks, then crumbles; cracks and spikes scroll with
    the ground; it keeps walking while they play out, and starts no new
    attack until the last spike has gone; a stage break closes cracks still
    waiting, while standing spikes crumble as normal); stage 3: **Tread charge**
    (revs 1 s with horn and smoke, runs across the screen, 3 blocks, fly
    over it) and **All guns** (flak wall + mortars together).
  - Stages at 66% and 33%: armour blows off ("YOU SCRATCHED MY FUCKING
    PAINT"), then burning ("ALL GUNS. NOW."). Taunt "STEP INTO MY FUCKING
    SIGHTS"; kill lines include "FLATTENED". Talks only in pauses; stage
    bonuses; alternating supply pods (high on the screen).
  - Bumping into it pushes you clear: out of its front or back if you hit
    an end, otherwise (on top of it, while it's charging, or at the screen
    edge) up over its turret.
  - Death: chain explosions, the turret blows off and spins away, a huge
    blast, and the burnt-out hull drops onto the floor.
- **Moving between levels** (Stage 3A, v0.11.0): after the level-clear
  screen, "TAP TO CONTINUE" flies you into the next level with your **score,
  lives and special weapon**; health refills to 5 blocks; timed power-ups
  don't carry. Game over restarts the current level fresh (score 0, 3
  lives, no special). After the last level that exists, you go back to
  level 1 with a fresh run. If you die in the seconds after a boss dies,
  the level still clears once you respawn.
- **Health bar** (owner request, v0.4.0): 3 lives, each with **5 health
  blocks**. Bullets/acid/gravel cost 1, small rocks and ramming small enemies
  2, big rocks 3, Rockjaw's bite charge 3, being sucked into his mouth 5
  (instant death — only while he's actually pulling you in; touching him
  before/after the pull is 2 like any scrape). 1 second of safety after a hit; red edge flash; warning
  beeps and smoke at 1 block.
- **Automatic power-ups** (round orbs, no button): Shield (absorbs 3 hits or
  10 s), Repair (+2 blocks), Spread Shot (3-way fire, 12 s), Rapid Fire
  (double rate, 12 s), Wingman drone (fires with you, 15 s). They stack;
  re-collecting resets the timer. Sources: cargo pods in the level, random
  drops from gunships (30%), seekers, rocks (see v0.7.0) and weavers (small
  chance), and boss supply pods.
- **Smart supplies** (owner request, v0.4.1; reworked v0.9.0): during a boss
  fight a supply pod arrives every 20 s (first one 3 s in), and pods take
  turns. What's inside is decided when it's shot open.
  **Survival pods** (1st, 3rd, 5th…): health <= 2 → Repair; no shield →
  Shield; not full health → Repair; otherwise Rapid Fire or Spread Shot.
  **Weapon pods** (2nd, 4th, 6th…): a Laser if you carry no special;
  otherwise an "A" ammo capsule (tops up whatever you carry when grabbed);
  if your special is already full, Rapid Fire (Spread Shot if Rapid is
  running); Repair instead when health <= 2. The pod's light always shows
  what it would give right now (ammo shows amber, like the "A" capsule).
  Survival pods have a white light. (Before v0.9.0 the Laser step sat
  behind "no shield → Shield", and a shield never outlasts the 20 s gap, so
  bosses effectively never gave specials.)
  During levels, when health is 2 blocks or fewer, drop chances rise
  (x2.5 + 6%) and 60% of drops are Repair — only for enemies that carry
  loot at all (plain pods and cargo pods never drop extra items). **At full health random drops
  never give Repair** (v0.8.0): its share goes to Spread and Rapid
  (Shield 20%, Spread 35%, Rapid 35%, Wingman 10%).
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
  as they pass; dive-bombers fire. Every shot is preceded by a blink warning
  (weavers too, since v0.10.3); a shooter that loses its chance stops
  blinking.
- **More gunships** (owner request, v0.6.1): gunships roughly doubled in
  level 1 (14 → 28), including groups of 3. Groups hover in separate lanes
  (above, level with and below the player) and fire in turn, not all at once.
- **v0.7.0 changes** (owner request):
  - **Pods only shoot out of their noses.** Pods ambushing from behind never
    fire (they only ram); pods from the front fire only while the player is
    still ahead of their gun; dive-bombers from above/below can fire.
  - **Rocks carry real loot** (no glints, nothing from v0.5.0). v0.8.0: loot
    is **only in big rocks, 35%** (50% when health <= 2); small rocks never
    drop. All rocks look alike — the owner wants to guess which one is
    loaded. Spread and Rapid should each run about 25% of the level (owner's
    target; 12 s each, timer resets on re-pickup). About 30% of
    rock drops are an amber **"A" ammo capsule**: when collected it tops up
    the special you carry at that moment (a random one if you carry none),
    so it never swaps your weapon away; the rest are power-ups. When hurt, 60%
    of drops are Repair. Fragments, pebbles and Rockjaw's rocks never drop.
    About 14 items per level if every big rock is broken (was about 2).
- **Bosses talk in speech bubbles** (owner request, v0.10.0): comic-book
  bubbles beside the boss, tail pointing at its mouth, words typed out with a
  low growl blip, about 2 s. **A boss only talks when it isn't attacking**
  (owner, v0.10.4 — bubbles mid-fight were distracting): after its name card
  it hangs back, says its taunt, then starts the fight; at a stage break it
  doesn't attack again until it has finished shouting; after a kill line it
  doesn't start a new attack until the bubble is gone. Bubbles sit **above**
  the boss, or **below** it if it's high on the screen (out of the space
  between you and it), two short lines at most. Round cream bubble for taunts, jagged amber
  bubble for roars. Drawn under pickups, enemies and bullets so they never
  hide anything. Name cards stay big titles; the boss's lines are spoken in
  first person (no narrator banners). Rockjaw: taunt "YOU ARE FUCKING
  DINNER" after his name card, "MY FUCKING EYE!" (stage 2), "NOW I EAT YOU
  WHOLE" (stage 3), and a kill line in a bubble when he kills you.
- **Stage bonus** (owner request, v0.10.0): breaking a boss into its next
  stage gives a score bonus (+1000, then +2000, shown as a small floating
  number — **no "STAGE BROKEN" banner**, owner's call) and two bonus items
  that burst from the wound and float to the ship (only while you're
  playing): a survival item (Repair if hurt, else Shield, or Rapid/Spread
  if a Shield is up) and a weapon item (Laser if no special, else ammo, or
  Rapid Fire / Spread Shot if the special is full). What they give is
  decided when grabbed, and they always show what they'd give right now,
  so they never swap your weapon or give a wasted Repair. They always
  appear on screen (even if his mouth is off the edge) and never scroll
  away. They arrive
  during the boss's roar, when he doesn't attack. Bubbles never hide behind
  the boss (placement keeps clear of his body); a boss only gloats once
  he's on screen; the opening taunt is skipped if you've just died.
- Level 1 enemies (Hard): some pods shoot, weavers spit acid, gunners fire 4
  faster shots, seekers steer harder; ambushes from behind, dive-bombers from
  top/bottom and pincers, each flagged by a red "!" warning marker first.

- **Boss code conventions** (for Stage 3+): a boss type can define
  `aimPoint(e)` (its mouth/weak point — speech tails and bonus items use it)
  and `onScreen(e)` (false during its entrance — hides the health bar and
  stops it gloating). Supply pods and stage bonuses live in Game: pods arrive
  automatically while a boss is in 'fight' or 'transition' mode (first 3 s
  in, then every 20 s; a boss can give `supplyY(e, g)` for how high they
  fly in), and a boss calls `g.stageBonus(e, stage)` when a stage breaks.
  Drawing code must use `Math.random()`, never `g.rand()` (the game's own
  dice), so drawing frames can't change what happens.
  **Every boss must check `g.bossMayAttack(e)` before starting any attack
  and before leaving a pause** (false while its speech bubble is up). Its
  opening taunt waits for the name card (`g.title`) to clear, then the boss
  holds back until it has finished talking. More optional hooks (v0.13.0):
  `voicePoint(e)` (where the speech tail points, if not its weak point),
  `knockback(e, p)` (how it shoves you when you touch it),
  `contactDamage(e)`, `music` (which boss song) and `voice` ('metal' for
  machines). Hazards a boss handles itself use `g.playerVulnerable()` and
  `g.touchesPlayer(x, y, w, h)` (one shared player hitbox, `g.playerHitbox()`).
  `fireShot` returns the shot, so a boss can give it more damage (`.dmg`).
  Enemy hooks for towers (v0.14.3): `flies: true` makes Game lift the enemy
  over spires (`Game.keepAboveRock`); `liftsOver(e)` can say "not now"
  (a diving pod; a skimmer hopping spires itself); `onLift(e, d)` lets a
  type shift its own planned path when lifted by `d` pixels.

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
| 2 | **The Outer Belt** | Full level 1 (2–3 min of planned waves + asteroids); pickups (extra life, bombs, rockets, laser) + corner ammo icon; boss Rockjaw; level-complete screen; basic sound effects (shots, explosions, button clicks — iPhone feedback relies on sound). | Done (v0.10.3, after a full code review) |
| 3 | **Levels 2–4** | Rust Moon, Frostring, Ember Mines + bosses; tunnel walls you can crash into; new enemy types per setting. Built in steps, owner tests each: 3A level flow → 3B Rust Moon (3B-1 level, 3B-2 Siege Crawler) → 3C Frostring + Glacier Warden → 3D Ember Mines + Drill Worm → wrap-up review. | In progress — 3A done (v0.11.0), 3B done (Rust Moon v0.12.1, Siege Crawler v0.13.0, owner fixes to v0.15.0) |
| 4 | **Levels 5–8** | Stormveil, Shipwreck Graveyard, Molten Deep, Hive World + bosses (two-phase Hive Mother); ending screen. | |
| 5 | **Menus & Progress** | Title screen, pause button/menu, continue option, "Continue from Level X" remembered, Practice mode, high-score table on the phone. | |
| 6 | **Music & Polish** | Warm retro music per level + boss music; screen shake, explosions, transitions; "Add to Home Screen" full-screen support (extra Claude suggested); final check on both phones. | |

Testing: Claude checks each stage on a simulated phone screen before handing
it over. The owner tests on Android; ideally the friend checks iPhone each stage.

## Code map

- `LESSONS.md` — the owner's preferences, lessons learned, stage
  retrospectives and a reusable recipe for future games.
- `index.html` — the page: canvas, start / pause / "turn sideways" screens, CSS.
- `js/main.js` — start-up, screen sizing, game loop, pause, full screen.
- `js/config.js` — version, game-pixel size (208×144), palette, player tuning.
- `js/layout.js` — where the game screen and thumb zones go (safe areas).
- `js/controls.js` — floating d-pad, Fire/Special, near-miss touch areas, drawing them.
- `js/feedback.js` — vibration (Android) and its strengths.
- `js/game.js` — game state: player, shots, enemies, pickups, collisions,
  damage/armour, lives, score, HUD, banners, level clear.
- `js/enemies.js` — enemy types (incl. asteroids, seekers, snipers, spinners,
  cargo pods; Rust Moon's cliff turrets, dust skimmers, mortar crawlers and
  shells, Rust Raiders) and how they move/shoot.
- `js/bosses.js` — Rockjaw (3 phases, 8 attacks, entrance, transitions,
  gory death).
- `js/crawler.js` — the Siege Crawler (3 stages, 7 attacks + paired attacks,
  entrance, transitions, death) and its mines and drones.
  `js/crawlerart.js` — its hull painted by code; legs, cannon and core
  hatch drawn each frame.
- `js/weapons.js` — special weapons (bombs, rockets, laser), pickups, corner icon.
- `js/powerups.js` — automatic power-ups (shield, repair, spread, rapid,
  wingman), their orbs, timers and HUD icons.
- `js/waves.js` — enemy formations. `js/levels.js` — level timelines + runner.
  A level ends with a `'boss'` event or an `'end'` event (no boss: cleared
  once every enemy, including ones still due to arrive, has gone; 8 s max).
- `js/background.js` — starfield, sun, dust band, distant rocks, Rust Moon
  canyon (sky bands, mesas, walls, dust devils) (per-level theme).
- `js/terrain.js` — solid ground: floor strip, rock spires, `solid()` for shots,
  `tallestOnScreen()`, `openAtEdge()`, `turretPerch()`.
- `js/sprites.js` — pixel art as text grids. `js/rockart.js` — asteroids and
  Rockjaw drawn by code. `js/font.js` — 5×5 pixel font.
- `js/audio.js` — all sound effects, synthesised in code (incl. boss roar,
  growl, jaw snap, inhale, splat).
- `js/music.js` — boss music, generated live (Rockjaw's, and the Siege
  Crawler's march).
- `js/gore.js` — blood (creatures only), chunks/debris, stains, screen-glass
  smears, boss corpses.
- `js/blasts.js` — explosions: fireballs, shockwave rings, smoke, rock dust.
- `js/speech.js` — comic-book speech bubbles for talking bosses.
- `js/util.js` — small shared helpers (clamp, overlaps, pixel discs).
- `tools/set-version.sh X.Y.Z` — bump the version everywhere (do this for every
  release so phones fetch fresh files).
- `tools/smoke-test.mjs` — simulated-phone test (Android + iPhone sizes):
  `PLAYWRIGHT_PATH=/opt/node22/lib/node_modules/playwright node tools/smoke-test.mjs <screenshot-dir>`
- `tools/level-test.mjs` — invincible autopilot plays level 1 then level 2
  (with both bosses) at high speed; checks pickups, specials, bosses,
  talking, stage bonuses, new enemies and level clears (same command
  style).
  It freezes the live game loop (`window.__ember.frozen = true`) and drives
  the game itself, so results are repeatable.
- `tools/serve.mjs` — the tests' tiny web server (this computer only; refuses
  paths outside the repository).
- Testing aids: add `?safe=62` to the URL to fake an iPhone camera cutout;
  `?start=boss` jumps straight to the boss with a laser loaded;
  `?start=60` starts 60 seconds into the level; `?level=2` starts on level 2
  (combine them: `?level=2&start=boss`).

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
1. Read this file **and `LESSONS.md`** (the owner's preferences and what
   we've learned — read it before planning anything).
2. After each stage: stop, describe what was built in one short paragraph, and
   give exact phone test steps (what to tap, what success looks like, what
   failure looks like). Wait for the owner to test before moving on.
3. If something doesn't work: say what you're seeing and what you're trying.
   If going round in circles, say so and offer options, including going back
   to the last version that worked.
4. The owner also prefers: always ask before starting anything big.
5. Review every release yourself before handing it over (code review,
   verify findings, fix the real ones) — the owner shouldn't have to ask.
6. **At the end of every stage:** full code review + clean-up release, mark
   the stage done, and **update `LESSONS.md`** (retrospective, new
   preferences, new lessons, anything reusable for future games).

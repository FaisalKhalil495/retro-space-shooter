import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.14.0';
import { ROCKS } from './rockart.js?v=0.14.0';
import { SPRITES } from './sprites.js?v=0.14.0';
import { ROCKJAW_TYPE } from './bosses.js?v=0.14.0';
import { SIEGE_CRAWLER_TYPE, CRAWLER_MINIONS } from './crawler.js?v=0.14.0';
import { clamp, rectHitsCircle } from './util.js?v=0.14.0';
import { GROUND_SPEED } from './terrain.js?v=0.14.0';
import { sfx } from './audio.js?v=0.14.0';

// Each enemy type: its sprite, toughness, points, and how it moves.
// Optional extras: draw (custom drawing), onDeath, inset (forgiving hitbox),
// harmless (doesn't hurt on contact), hitTest (custom hit areas), aimPoint
// (where homing rockets aim), organic (bleeds when hit), gore (what flies
// out when it dies: blood amount, flesh/metal/rock chunks, a stain),
// ram (health blocks lost if it rams you, default 2), dropChance (odds of
// leaving a random power-up behind).
export const ENEMY_TYPES = {
  // A small pod with an alien pilot. Flies straight; some take a pot-shot.
  drifter: {
    sprite: 'drifter',
    hp: 1,
    score: 10,
    gore: { metal: 4 },
    init(e) {
      e.vx = -(e.speed || 46);
      e.vy = e.vy || 0;
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // A dive-bomber that reaches solid ground crashes into it (no points).
      if (game.terrain.floor && e.y + e.h > game.terrain.floorY + 2) {
        e.dead = true;
        game.blasts.blast(e.x + e.w / 2, game.terrain.floorY - 2, 0.4);
        sfx.explode(0.3);
        return;
      }
      // Pods only shoot out of their noses. Ambushers coming from behind
      // have their backs to you, so they never fire; pods coming from the
      // front only fire while you're still ahead of their gun; dive-bombers
      // from above or below can fire.
      if (e.shooter && !e.fired && !e.flip) {
        const p = game.player;
        const diving = Math.abs(e.vy) > 30;
        const facing = diving || p.x + p.w < e.x - 6;
        const inView = e.x < VIEW_W - 34;
        if (!facing) {
          e.charge = 0;
          e.aim = 0; // full warning blink again if it faces you later
        }
        if (inView && facing) {
          e.aim = (e.aim || 0) + dt;
          e.charge = 1;
          if (e.aim > 0.35) {
            e.fired = true;
            e.charge = 0;
            game.fireAtPlayer(e.x, e.y + e.h / 2, 74);
          }
        }
      }
    },
  },

  // A living alien manta, all muscle and teeth. Weaves in snake-like chains
  // and sometimes spits a glob of acid.
  weaver: {
    sprite: 'weaver',
    hp: 1,
    score: 20,
    organic: true,
    dropChance: 0.03,
    gore: { blood: 7, flesh: 2 },
    init(e, game) {
      e.baseY = e.y;
      e.amp = e.amp || 18;
      e.phase = e.phase || 0;
      e.spitAt = game.rand() < 0.66 ? 0.9 + game.rand() * 2 : 0;
    },
    update(e, dt, game) {
      e.x -= 44 * dt;
      e.y = e.baseY + Math.sin(e.t * 2.8 + e.phase) * e.amp;
      // Spitting: its mouth blinks for a moment first (fair warning).
      if (e.spitAt && e.t > e.spitAt && e.x < VIEW_W - 20 && e.x > game.player.x + 20) {
        e.windup = (e.windup || 0) + dt;
        e.charge = 1;
        if (e.windup > 0.35) {
          e.spitAt = 0;
          e.charge = 0;
          game.fireAtPlayer(e.x, e.y + e.h / 2, 58);
        }
      } else if (e.charge) {
        e.charge = 0; // lost its chance (passed you); the blink stops
        e.windup = 0;
      }
    },
  },

  // Gunship: slides in, hovers, fires aimed shots (with a warning blink),
  // then pushes on through.
  gunner: {
    sprite: 'gunner',
    hp: 5,
    score: 50,
    dropChance: 0.3,
    gore: { metal: 10 },
    init(e) {
      e.mode = 'enter';
      e.targetX = e.targetX || VIEW_W - 52;
      e.fireTimer = e.fireDelay || 0.7;
      e.laneOff = e.laneOff || 0;
      e.shots = 0;
      e.charge = 0;
    },
    update(e, dt, game) {
      if (e.mode === 'enter') {
        e.x += (e.targetX - e.x) * Math.min(1, dt * 2.6) - 8 * dt;
        if (e.x - e.targetX < 2) e.mode = 'hold';
      } else if (e.mode === 'hold') {
        const py = game.player.y + game.player.h / 2 - e.h / 2 + e.laneOff;
        e.y += clamp(py - e.y, -1, 1) * 20 * dt;
        e.fireTimer -= dt;
        e.charge = e.fireTimer < 0.28 ? 1 : 0;
        if (e.fireTimer <= 0) {
          game.fireAtPlayer(e.x - 1, e.y + e.h / 2, 84);
          e.shots++;
          e.fireTimer = 0.85;
          if (e.shots >= 4) e.mode = 'leave';
        }
      } else {
        e.charge = 0;
        e.x -= 60 * dt;
      }
      e.y = clamp(e.y, HUD_H + 2, game.terrain.floorY - e.h - 2);
    },
  },

  // Fast dart that steers hard towards the player.
  seeker: {
    sprite: 'seeker',
    hp: 2,
    score: 30,
    dropChance: 0.08,
    explodeSize: 0.5,
    gore: { metal: 4 },
    init(e) {
      e.vy = 0;
    },
    update(e, dt, game) {
      e.x -= 70 * dt;
      if (e.x > game.player.x + 8) {
        const want = game.player.y + game.player.h / 2 - (e.y + e.h / 2);
        e.vy += clamp(want, -1, 1) * 115 * dt;
        e.vy = clamp(e.vy, -50, 50);
      } else {
        e.vy *= 1 - dt * 2;
      }
      e.y += e.vy * dt;
      // Takes one shot as it closes in (muzzle blinks first).
      const gap = e.x - game.player.x;
      if (!e.fired && gap < 95 && gap > 30) {
        e.aim = (e.aim || 0) + dt;
        e.charge = 1;
        if (e.aim > 0.3) {
          e.fired = true;
          e.charge = 0;
          game.fireAtPlayer(e.x, e.y + e.h / 2, 80);
        }
      } else if (!e.fired && e.charge) {
        // Got too close (or too far) before it could fire: stop the warning
        // blink rather than flash a shot that never comes.
        e.charge = 0;
        e.aim = 0;
      }
    },
  },

  // Sniper: parks at the far right, shows a thin flashing aiming line for a
  // moment, then fires a fast shot along it. Three shots, then it leaves.
  sniper: {
    sprite: 'sniper',
    hp: 3,
    score: 60,
    dropChance: 0.15,
    gore: { metal: 7 },
    init(e) {
      e.mode = 'enter';
      e.targetX = e.targetX || VIEW_W - 24;
      e.timer = 0.4;
      e.shots = 0;
    },
    update(e, dt, game) {
      const mx = e.x;
      const my = e.y + e.h / 2;
      if (e.mode === 'enter') {
        e.x += (e.targetX - e.x) * Math.min(1, dt * 3) - 6 * dt;
        if (e.x - e.targetX < 2) e.mode = 'wait';
      } else if (e.mode === 'wait') {
        e.timer -= dt;
        if (e.timer <= 0) {
          // Lock on: the aim is fixed from here, so you can dodge it.
          const p = game.player;
          e.aimAngle = Math.atan2(p.y + p.h / 2 - my, p.x + p.w / 2 - mx);
          e.aimLine = 0.6;
          e.mode = 'aim';
        }
      } else if (e.mode === 'aim') {
        e.aimLine -= dt;
        e.charge = 1;
        if (e.aimLine <= 0) {
          e.aimLine = 0;
          e.charge = 0;
          game.fireShot(mx - 1, my, e.aimAngle, 150, 'fast');
          e.shots++;
          e.timer = 1.1;
          e.mode = e.shots >= 3 ? 'leave' : 'wait';
        }
      } else {
        // Leaves up or down, whichever edge is nearer (always up over solid
        // ground).
        e.x -= 30 * dt;
        e.y += (e.y < VIEW_H / 2 || game.terrain.floor ? -40 : 40) * dt;
      }
    },
    draw(e, ctx, snap, game, spr) {
      if (e.aimLine > 0 && Math.floor(e.aimLine * 20) % 2 === 0) {
        // The aiming line: a dotted red line along the shot's path.
        const x0 = e.x;
        const y0 = e.y + e.h / 2;
        ctx.fillStyle = PAL.red;
        for (let d = 4; d < 260; d += 4) {
          const x = x0 + Math.cos(e.aimAngle) * d;
          const y = y0 + Math.sin(e.aimAngle) * d;
          if (x < -2 || y < -2 || y > VIEW_H + 2) break;
          ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      }
      ctx.drawImage(spr, snap(e.x), snap(e.y));
    },
  },

  // Spinner: a rotating disc that drifts in and sprays 8 bullets in a star
  // pattern every couple of seconds (it blinks just before each burst).
  spinner: {
    sprite: 'spinner',
    hp: 6,
    score: 80,
    dropChance: 0.2,
    gore: { metal: 9 },
    init(e) {
      e.targetX = e.targetX || VIEW_W * 0.68;
      e.timer = 1.0;
      e.bursts = 0;
      e.spin = 0;
    },
    update(e, dt, game) {
      e.spin += dt * 2.2;
      if (e.bursts < 3) {
        e.x += (e.targetX - e.x) * Math.min(1, dt * 1.5) - 3 * dt;
      } else {
        e.x -= 40 * dt;
      }
      e.timer -= dt;
      e.charge = e.timer < 0.4 && e.bursts < 3 ? 1 : 0;
      if (e.timer <= 0 && e.bursts < 3) {
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2;
        const off = e.bursts * (Math.PI / 8);
        for (let k = 0; k < 8; k++) {
          game.fireShot(cx, cy, off + (k * Math.PI) / 4, 52);
        }
        e.bursts++;
        e.timer = 2.1;
      }
    },
    draw(e, ctx, snap, game, spr) {
      const cx = snap(e.x + e.w / 2);
      const cy = snap(e.y + e.h / 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(e.spin);
      ctx.drawImage(spr, -Math.floor(e.w / 2), -Math.floor(e.h / 2));
      ctx.restore();
      if (e.charge && Math.floor(game.time * 16) % 2 === 0) {
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(cx - 1, cy - 1, 3, 3);
      }
    },
  },

  // Harmless cargo pod; drops its pickup when destroyed.
  carrier: {
    sprite: 'carrier',
    hp: 3,
    score: 40,
    harmless: true,
    gore: { metal: 10 },
    init(e) {
      e.baseY = e.y;
    },
    update(e, dt) {
      e.x -= 26 * dt;
      e.y = e.baseY + Math.sin(e.t * 2) * 3;
    },
    onDeath(e, game) {
      // Boss supply pods decide what's inside at the moment they're opened.
      const kind = game.supplyContents(e.drop) ?? e.drop;
      game.spawnPickup(kind, e.x + e.w / 2 - 4, e.y + e.h / 2 - 4);
    },
    draw(e, ctx, snap, game, spr) {
      ctx.drawImage(spr, snap(e.x), snap(e.y));
      const info = game.pickupInfo(e.drop);
      ctx.fillStyle = Math.floor(e.t * 4) % 2 ? info.light : info.color;
      ctx.fillRect(snap(e.x) + 4, snap(e.y) + 4, 5, 1);
    },
  },

  // Asteroids drift across. Big ones split in two when destroyed.
  // Big rocks break into two fragments when shot. The fragments fly up and
  // down, away from the ship's path, and blink so they're easy to spot.
  // In Rockjaw's fight the fragments fly gently up and down, away from you.
  // In the level they burst out in all directions, including at you.
  rockBig: rockType('big', 6, 25, 9, 3, (e, game) => {
    const cx = e.x + e.w / 2 - 5;
    const cy = e.y + e.h / 2 - 5;
    if (e.byBoss) {
      for (const side of [-1, 1]) {
        game.spawnEnemy('rockShard', cx, cy, { vx: e.vx * 0.45, vy: side * (40 + game.rand() * 12), byBoss: true });
      }
      return;
    }
    const a0 = game.rand() * Math.PI * 2;
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k * Math.PI * 2) / 3;
      game.spawnEnemy('rockShard', cx, cy, { vx: e.vx * 0.3 + Math.cos(a) * 70, vy: Math.sin(a) * 70 });
    }
  }),
  // Small rocks crack into 2 sharp pebbles in the level (1 block each).
  rockSmall: rockType('small', 2, 5, 5, 2, (e, game) => {
    if (e.byBoss) return;
    const a0 = game.rand() * Math.PI * 2;
    for (const off of [0, Math.PI]) {
      game.fireShot(e.x + e.w / 2, e.y + e.h / 2, a0 + off, 62, 'gravel');
    }
  }),

  // A fragment of a big rock: weaker (costs 1 health block), slower, and it
  // just flies off the screen instead of bouncing back into play.
  rockShard: {
    ...rockType('small', 1, 3, 4, 1),
    noDrop: true,
    explodeSize: 0.3,
    update(e, dt) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy *= 1 - 0.4 * dt;
      e.flash = e.t < 0.5 && Math.floor(e.t * 16) % 2 === 0 ? 0.02 : e.flash;
    },
  },

  // A rock spat by Rockjaw. Some burst into two pieces of gravel mid-flight,
  // after flashing and shaking for half a second as a warning.
  rockSpit: {
    ...rockType('small', 2, 0, 5, 2),
    noDrop: true,
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (!e.splitAt) return;
      const left = e.splitAt + SPLIT_WARNING - e.t;
      if (left > 0 && left <= SPLIT_WARNING) {
        // Cracking: blink pale and jitter.
        e.flash = Math.floor(e.t * 14) % 2 === 0 ? 0.02 : 0;
        e.y += (game.rand() - 0.5) * 1.5;
        if (!e.creaked) {
          e.creaked = true;
          game.burst(e.x + e.w / 2, e.y + e.h / 2, 3, 30, ['#9c8478', '#c4a68e']);
        }
      }
      if (left <= 0) {
        e.dead = true;
        game.burst(e.x + e.w / 2, e.y + e.h / 2, 8, 60);
        const base = Math.atan2(e.vy, e.vx);
        for (const off of [-0.32, 0.32]) {
          game.fireShot(e.x + e.w / 2, e.y + e.h / 2, base + off, 72, 'gravel', true);
        }
      }
    },
  },

  // ---- Rust Moon ----

  // Supply drone: the enemy keeps its canyon turrets stocked with drones
  // that fly across in small convoys, each carrying a crate. Shoot one down
  // and its crate bursts open. All crates look the same, and only about a
  // third hold anything (a power-up or special-weapon ammo), so it's a
  // gamble which ones are worth chasing. They don't shoot, but they ram.
  // They lift up over any rock spire in their way.
  hauler: {
    sprite: 'hauler',
    hp: 3,
    score: 25,
    ram: 2,
    dropChance: 0.35,
    hurtDropChance: 0.5,
    ammoLoot: true,
    explodeSize: 0.6,
    gore: { metal: 6 },
    init(e, game) {
      e.vx = e.vx ?? -(40 + game.rand() * 8);
      e.baseY = e.y;
      e.phase = game.rand() * 6;
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      // Fly at its own height, but climb over any spire just ahead. (If a
      // spire pops up right under it at the screen's edge, it jumps clear.)
      const clear = game.terrain.groundTop(e.x - 30, e.w + 32) - e.h - 4;
      const want = Math.min(e.baseY, clear) + Math.sin(e.t * 3 + e.phase) * 2;
      if (game.terrain.hits(e.x, e.y, e.w, e.h)) e.y = Math.min(e.y, clear);
      else e.y += clamp(want - e.y, -80 * dt, 50 * dt);
    },
    onDeath(e, game) {
      // The crate bursts: splinters either way; anything inside drops out
      // (see Game.maybeDrop).
      game.burst(e.x + e.w / 2, e.y + e.h - 3, 8, 50, CRATE_BITS);
    },
  },

  // Cliff turret: sits on a rock spire (or a low mound), armoured shut.
  // Its hatch blinks, it opens, fires two aimed shots, then shuts again. It
  // can only be hurt while it's open (shots spark off the shut armour).
  cliffTurret: {
    sprite: 'turretShut',
    hp: 4,
    score: 50,
    dropChance: 0.15,
    gore: { metal: 7 },
    init(e) {
      e.mode = 'shut';
      e.timer = 1.0;
      e.open = false;
      if (e.spire) e.x = e.spire.x + e.spire.w / 2 - e.w / 2;
    },
    isVulnerable(e) {
      return e.open;
    },
    muzzle(e) {
      return { x: e.x - 2, y: e.y + 2 };
    },
    update(e, dt, game) {
      // It sits on top of its spire. Once the spire has scrolled away it
      // keeps going on its own, so it can never get left behind.
      if (e.spire && game.terrain.spires.includes(e.spire)) {
        e.x = e.spire.x + e.spire.w / 2 - e.w / 2;
        e.y = e.spire.top - e.h + 2;
      } else {
        e.x -= GROUND_SPEED * dt;
        if (!e.spire) e.y = game.terrain.floorY - e.h + 1;
      }
      const p = game.player;
      // It only ever fires forwards (to the left), at a ship it can see.
      const ahead = p.x + p.w / 2 < e.x - 6 && e.x < VIEW_W - 10;
      e.timer -= dt;
      if (e.mode === 'shut') {
        if (e.timer <= 0 && ahead) {
          e.mode = 'charge';
          e.timer = 0.4;
          e.charge = 1; // the hatch blinks: it's about to open
        }
      } else if (e.mode === 'charge') {
        if (e.timer <= 0) {
          e.charge = 0;
          e.mode = 'open';
          e.open = true;
          e.timer = 0.9;
          e.shots = 0;
          e.shotCd = 0;
        }
      } else if (e.mode === 'open') {
        // Two shots, always at least 0.35 s apart.
        e.shotCd -= dt;
        if (e.shots < 2 && e.shotCd <= 0 && ahead) {
          game.fireAtPlayer(e.x - 2, e.y + 3, 70);
          e.shots++;
          e.shotCd = 0.35;
        }
        if (e.timer <= 0) {
          e.mode = 'shut';
          e.open = false;
          e.timer = 1.6;
        }
      }
    },
    draw(e, ctx, snap) {
      const name = e.open ? 'turretOpen' : 'turretShut';
      const img = SPRITES[name + (e.flash > 0 ? 'Flash' : '')];
      ctx.drawImage(img, snap(e.x), snap(e.y));
    },
  },

  // Dust skimmer: races in low along the canyon floor (hopping spires), then
  // swoops up to your height, blinks, fires a 3-shot spread and climbs away.
  dustSkimmer: {
    sprite: 'skimmer',
    hp: 2,
    score: 40,
    dropChance: 0.1,
    explodeSize: 0.5,
    gore: { metal: 5 },
    init(e, game) {
      e.mode = 'run';
      e.vx = -90;
      e.y = game.terrain.floorY - e.h - 2;
    },
    update(e, dt, game) {
      const p = game.player;
      const floorY = game.terrain.floorY;
      const inFront = p.x + p.w < e.x - 4;
      e.x += e.vx * dt;
      if (e.mode === 'run') {
        // Skim the ground, lifting over any spire just ahead.
        let want = floorY - e.h - 2;
        for (const s of game.terrain.spires) {
          if (s.x < e.x + e.w + 26 && s.x + s.w > e.x - 4) want = Math.min(want, s.top - e.h - 3);
        }
        e.y += (want - e.y) * Math.min(1, dt * 9);
        if (inFront && e.x - p.x < 110 && e.x < VIEW_W - 12) {
          e.mode = 'swoop';
          e.timer = 0.6;
          e.y0 = e.y;
          e.ty = clamp(p.y + p.h / 2 - e.h / 2, HUD_H + 4, floorY - e.h - 2);
        }
      } else if (e.mode === 'swoop') {
        e.timer -= dt;
        const k = 1 - Math.max(0, e.timer) / 0.6;
        e.y = e.y0 + (e.ty - e.y0) * (1 - (1 - k) * (1 - k));
        e.vx += (-40 - e.vx) * Math.min(1, dt * 5);
        if (e.timer <= 0) {
          e.mode = 'aim';
          e.timer = 0.3;
        }
      } else if (e.mode === 'aim') {
        e.timer -= dt;
        e.charge = inFront ? 1 : 0;
        if (!inFront) e.mode = 'climb'; // you slipped past: no shot
        else if (e.timer <= 0) {
          e.charge = 0;
          const a = Math.atan2(p.y + p.h / 2 - (e.y + e.h / 2), p.x + p.w / 2 - e.x);
          for (const off of [-0.14, 0, 0.14]) game.fireShot(e.x - 1, e.y + e.h / 2, a + off, 100);
          e.mode = 'climb';
        }
      } else {
        e.vx += (-60 - e.vx) * Math.min(1, dt * 3);
        e.y -= 70 * dt;
      }
    },
  },

  // Mortar crawler: a six-legged walker on the canyon floor that lobs a shell
  // every 2.5 s. A red ring marks where the shell will burst (where you were
  // when it fired), so keep moving.
  mortarCrawler: {
    sprite: 'crawler',
    hp: 3,
    score: 50,
    dropChance: 0.15,
    gore: { metal: 8 },
    init(e, game) {
      e.y = game.terrain.floorY - e.h;
      e.timer = 0.6;
    },
    muzzle(e) {
      return { x: e.x + 1, y: e.y - 1 };
    },
    update(e, dt, game) {
      e.x -= (GROUND_SPEED + 8) * dt;
      // It walks along the floor and clambers up and over any spire in its
      // way, starting just before it gets there (so it can never hide
      // inside the rock).
      const want = game.terrain.groundTop(e.x - 12, e.w + 10) - e.h;
      e.base = e.base === undefined ? want : e.base + clamp(want - e.base, -60 * dt, 90 * dt);
      e.y = e.base + (Math.floor(e.t * 6) % 2); // little steps
      const inRange = e.x > 40 && e.x < VIEW_W - 20;
      if (!inRange) {
        e.charge = 0;
        return;
      }
      e.timer -= dt;
      e.charge = e.timer < 0.4 ? 1 : 0;
      if (e.timer <= 0) {
        e.charge = 0;
        e.timer = 2.5;
        const p = game.player;
        game.spawnEnemy('mortarShell', e.x + 1, e.y - 2, { tx: p.x + p.w / 2, ty: p.y + p.h / 2 });
        sfx.mortar();
      }
    },
  },

  // A mortar shell in flight. It bursts exactly on its red ring after 0.9 s
  // (1 block if you're on the ring) into 4 fragments (1 block each), or
  // early if it touches you on the way. You can shoot it down first.
  mortarShell: {
    hp: 1,
    score: 10,
    harmless: true, // it hurts by bursting, not by ramming
    noDrop: true,
    explodeSize: 0.3,
    inset: 0,
    init(e, game) {
      e.w = 4;
      e.h = 4;
      e.ty = clamp(e.ty, HUD_H + 6, game.terrain.floorY - 6);
      e.x0 = e.x;
      e.y0 = e.y;
      e.vx = (e.tx - e.x) / SHELL_TIME;
      e.vy = (e.ty - e.y - 0.5 * SHELL_G * SHELL_TIME * SHELL_TIME) / SHELL_TIME;
    },
    update(e, dt, game) {
      const t = Math.min(e.t, SHELL_TIME);
      e.x = e.x0 + e.vx * t - e.w / 2;
      e.y = e.y0 + e.vy * t + 0.5 * SHELL_G * t * t - e.h / 2;
      const p = game.player;
      const live = game.playerVulnerable();
      const touching = live && game.touchesPlayer(e.x, e.y, e.w, e.h);
      if (e.t < SHELL_TIME && !touching) return;
      // Burst: on the ring, or wherever it touched you.
      const bx = touching ? e.x + e.w / 2 : e.tx;
      const by = touching ? e.y + e.h / 2 : e.ty;
      e.dead = true;
      game.blasts.blast(bx, by, 0.45);
      game.burst(bx, by, 8, 60);
      sfx.explode(0.35);
      if (touching || (live && Math.hypot(p.x + p.w / 2 - bx, p.y + p.h / 2 - by) < 7)) game.hurtPlayer(1, e);
      for (let k = 0; k < 4; k++) game.fireShot(bx, by, Math.PI / 4 + (k * Math.PI) / 2, 50, 'gravel', !!e.byBoss);
    },
    draw(e, ctx, snap, game) {
      // The target ring: always shown, flickering, and closing in as the
      // shell comes down, with a cross in the middle.
      const left = Math.max(0, SHELL_TIME - e.t);
      const r = 7 + 5 * (left / SHELL_TIME);
      const tx = Math.round(e.tx);
      const ty = Math.round(e.ty);
      ctx.fillStyle = Math.floor(e.t * 12) % 2 === 0 ? PAL.red : PAL.redSoft;
      for (let i = 0; i < 20; i++) {
        const a = (i * Math.PI) / 10;
        ctx.fillRect(Math.round(tx + Math.cos(a) * r), Math.round(ty + Math.sin(a) * r), 1, 1);
      }
      ctx.fillRect(tx - 2, ty, 5, 1);
      ctx.fillRect(tx, ty - 2, 1, 5);
      const x = snap(e.x);
      const y = snap(e.y);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = e.flash > 0 ? PAL.cream : PAL.amberDark;
      ctx.fillRect(x + 1, y + 1, 2, 2);
      if (Math.floor(game.time * 16) % 2 === 0) {
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    },
  },

  rockjaw: ROCKJAW_TYPE,
  siegeCrawler: SIEGE_CRAWLER_TYPE,
  ...CRAWLER_MINIONS,
};

const SHELL_TIME = 0.9; // seconds from launch to burst
const CRATE_BITS = ['#7a3a36', '#9a6a4a', '#6d6a73', '#c4a68e'];
const SHELL_G = 120; // gravity on a mortar shell (pixels per second squared)

const SPLIT_WARNING = 0.5; // seconds a spat rock cracks before it bursts

function rockType(size, hp, score, radius, ram, onDeath) {
  return {
    hp,
    score,
    ram,
    // Only big rocks carry loot (power-ups or special weapon ammo, see
    // maybeDrop in game.js), and they all look alike, so it's a gamble which
    // ones are worth breaking. Chances go up when you're badly hurt.
    dropChance: size === 'big' ? 0.35 : 0,
    hurtDropChance: size === 'big' ? 0.5 : 0,
    ammoLoot: size === 'big', // some of the loot is special-weapon ammo
    explodeSize: size === 'big' ? 1 : 0.5,
    gore: { rock: size === 'big' ? 12 : 6 },
    // Rocks are round, so hits are checked against a circle, not a box.
    hitTest(e, x, y, w, h) {
      return rectHitsCircle(x, y, w, h, e.x + e.w / 2, e.y + e.h / 2, radius) ? 'hit' : null;
    },
    init(e, game) {
      const set = ROCKS[size];
      e.variant = e.variant ?? Math.floor(game.rand() * set.length);
      e.w = set[e.variant].width;
      e.h = set[e.variant].height;
      e.vx = e.vx ?? -(36 + game.rand() * 20);
      e.vy = e.vy ?? (game.rand() - 0.5) * 14;
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const floorY = game.terrain.floorY;
      // Drifting rocks bounce gently off the top and bottom so they stay in
      // play; falling meteors (Rockjaw's) just fall through.
      if (!e.fall) {
        if (e.y < HUD_H - e.h / 3 && e.vy < 0) e.vy = -e.vy;
        if (e.y > floorY - (e.h * 2) / 3 && e.vy > 0) e.vy = -e.vy;
      }
    },
    onDeath,
    draw(e, ctx, snap) {
      const set = e.flash > 0 ? ROCKS[size + 'Flash'] : ROCKS[size];
      ctx.drawImage(set[e.variant], snap(e.x), snap(e.y));
    },
  };
}

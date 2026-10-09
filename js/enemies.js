import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.21.2';
import { ROCKS } from './rockart.js?v=0.21.2';
import { SPRITES } from './sprites.js?v=0.21.2';
import { ROCKJAW_TYPE } from './bosses.js?v=0.21.2';
import { SIEGE_CRAWLER_TYPE, CRAWLER_MINIONS } from './crawler.js?v=0.21.2';
import { GLACIER_WARDEN_TYPE, WARDEN_MINIONS } from './warden.js?v=0.21.2';
import { clamp, rectHitsCircle, rectsOverlap, fillDisc } from './util.js?v=0.21.2';
import { FINE, snapFine } from './detail.js?v=0.21.2';
import { GROUND_SPEED, ROCK_CLEARANCE, ICE_COLORS } from './terrain.js?v=0.21.2';
import { sfx } from './audio.js?v=0.21.2';

// Each enemy type: its sprite, toughness, points, and how it moves.
// Optional extras: draw (custom drawing), onDeath, inset (forgiving hitbox),
// harmless (doesn't hurt on contact), hitTest (custom hit areas), aimPoint
// (where homing rockets aim), organic (bleeds when hit), gore (what flies
// out when it dies: blood amount, flesh/metal/rock chunks, a stain),
// ram (health blocks lost if it rams you, default 2), dropChance (odds of
// leaving a random power-up behind), isVulnerable (false while armoured:
// shots spark off), shotTest (a more forgiving area for your shots than for
// bumping into you), muzzle (where its "about to fire" blink shows). An
// enemy with e.under set is underground: out of reach of everything.
export const ENEMY_TYPES = {
  // A small pod with an alien pilot. Flies straight; some take a pot-shot.
  drifter: {
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
    liftsOver: (e) => Math.abs(e.vy) <= DIVE_VY, // a dive-bomber crashes instead
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
      // A dive-bomber that reaches solid ground (or a spire, or a slab of
      // ice) crashes into it (no points).
      const diving = Math.abs(e.vy) > DIVE_VY;
      const rock = diving && game.terrain.hits(e.x, e.y, e.w, e.h);
      if ((game.terrain.floor && e.y + e.h > game.terrain.floorY + 2) || rock) {
        e.dead = true;
        const by = rock && rock.ty !== undefined ? e.y + e.h / 2 : Math.min(e.y + e.h, game.terrain.floorY - 2);
        game.blasts.blast(e.x + e.w / 2, by, 0.4);
        sfx.explode(0.3);
        return;
      }
      // Pods only shoot out of their noses. Ambushers coming from behind
      // have their backs to you, so they never fire; pods coming from the
      // front only fire while you're still ahead of their gun; dive-bombers
      // from above or below can fire.
      if (e.shooter && !e.fired && !e.flip) {
        const p = game.player;
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
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
    onLift(e, d) {
      e.baseY -= d; // its whole weave moves up
    },
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
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
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
        // Keep above a lower-lane gunship of the same group, so two never
        // stack up looking like one (e.g. both lifted over the same spire).
        for (const o of game.enemies) {
          if (o.type !== 'gunner' || o === e || o.dead || o.laneOff <= e.laneOff || Math.abs(o.x - e.x) >= e.w) continue;
          const above = o.y - e.h - 3;
          if (e.y > above) e.y -= Math.min(e.y - above, 60 * dt);
        }
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
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
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
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
    // Pushed up mid-aim? Its aim line would no longer be true, so it
    // re-aims from its new spot (with a fresh warning).
    onLift(e) {
      if (e.mode === 'aim') {
        e.mode = 'wait';
        e.timer = 0.2;
        e.aimLine = 0;
        e.charge = 0;
      }
    },
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
        // (One dashed stroke, a pixel thick: smooth at double detail, easy
        // to see, and a single drawing call.)
        ctx.save();
        ctx.strokeStyle = PAL.red;
        ctx.lineWidth = 1;
        ctx.setLineDash([1.5, 1.5]);
        ctx.beginPath();
        ctx.moveTo(x0 + Math.cos(e.aimAngle) * 4, y0 + Math.sin(e.aimAngle) * 4);
        ctx.lineTo(x0 + Math.cos(e.aimAngle) * 260, y0 + Math.sin(e.aimAngle) * 260);
        ctx.stroke();
        ctx.restore();
      }
      ctx.drawImage(spr, snap(e.x), snap(e.y));
    },
  },

  // Spinner: a rotating disc that drifts in and sprays 8 bullets in a star
  // pattern every couple of seconds (it blinks just before each burst).
  spinner: {
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
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
        fillDisc(ctx, cx + 0.5, cy + 0.5, 1.5);
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
    avoidsIce: true, // steers around slabs of ice (see Game.keepClearOfIce)
    onLift(e, d) {
      e.baseY -= d;
    },
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

  // Rust Raider: a small armed fighter flying in with its convoy in a gentle
  // wave. While you're in front of its nose it blinks, then fires an aimed
  // shot, and a second one a moment later if you're still there (2 at
  // most; never at a ship behind it). A convoy takes turns (each one's
  // first shot comes a little later than the one before). Raiders all look
  // alike, and about a third carry loot (a power-up or special-weapon ammo),
  // so it's a gamble which ones are worth chasing.
  raider: {
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
    onLift(e, d) {
      e.baseY -= d; // its whole wave moves up
    },
    sprite: 'raider',
    hp: 3,
    score: 40,
    ram: 2,
    dropChance: 0.35,
    hurtDropChance: 0.5,
    ammoLoot: true,
    explodeSize: 0.5,
    gore: { metal: 6 },
    init(e, game) {
      e.vx = e.vx ?? -(44 + game.rand() * 6); // (a convoy shares one speed)
      e.baseY = e.y;
      e.phase = game.rand() * 6;
      e.shots = 0;
      e.fireTimer = RAIDER_FIRST + (e.slot || 0) * RAIDER_TURN;
      e.charge = 0;
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.y = Math.max(HUD_H + 2, e.baseY + Math.sin(e.t * 2.2 + e.phase) * 5);
      if (e.shots >= 2) return;
      const p = game.player;
      const inFront = p.x + p.w < e.x - 6;
      const inView = e.x < VIEW_W - 16 && e.x > 24;
      if (!inFront || !inView) {
        // No shot from here: stop any warning blink (it blinks afresh
        // before its next shot).
        e.fireTimer = Math.max(e.fireTimer, RAIDER_BLINK);
        e.charge = 0;
        return;
      }
      e.fireTimer -= dt;
      e.charge = e.fireTimer < RAIDER_BLINK ? 1 : 0;
      if (e.fireTimer <= 0) {
        e.charge = 0;
        e.shots++;
        e.fireTimer = 1.5;
        game.fireAtPlayer(e.x - 1, e.y + e.h / 2, 80);
      }
    },
  },

  // Cliff turret: sits on a rock spire (or a low mound), armoured shut.
  // Its hatch blinks, it opens, fires two aimed shots, then shuts again. It
  // can only be hurt while it's open (shots spark off the shut armour).
  cliffTurret: {
    sprite: 'turretShut',
    hp: 3,
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
    // Your shots count a couple of pixels above its dome and across its whole
    // height, so you don't need pixel-perfect aim (it's small). Bumping into
    // it uses its drawing.
    shotTest(e, x, y, w, h) {
      return rectsOverlap(x, y, w, h, e.x, e.y - 2, e.w, e.h + 1) ? 'hit' : null;
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
          // Fires its two shots, then stays open venting for a while, so
          // you get a fair chance to hit back.
          e.mode = 'open';
          e.open = true;
          e.timer = TURRET_OPEN;
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
    flies: true, // lifts over rock spires (see Game.keepAboveRock)
    liftsOver: (e) => e.mode !== 'run', // (while skimming it hops spires itself)
    onLift(e, d) {
      if (e.y0 !== undefined) {
        e.y0 -= d;
        e.ty -= d;
      }
    },
    sprite: 'skimmer',
    hp: 2,
    score: 40,
    dropChance: 0.1,
    explodeSize: 0.5,
    gore: { metal: 5 },
    init(e, game) {
      e.mode = 'run';
      e.vx = -90;
      e.y = skimHeight(e, game.terrain); // (already above a spire it's born beside)
    },
    update(e, dt, game) {
      const p = game.player;
      const floorY = game.terrain.floorY;
      const inFront = p.x + p.w < e.x - 4;
      e.x += e.vx * dt;
      if (e.mode === 'run') {
        // Skim the ground, lifting over any spire just ahead.
        const want = skimHeight(e, game.terrain);
        e.y += (want - e.y) * Math.min(1, dt * 9);
        if (game.terrain.hits(e.x, e.y, e.w, e.h)) e.y = Math.min(e.y, want); // never inside rock
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
  // every 1.8 s. A red ring marks where the shell will burst (where you were
  // when it fired), so keep moving. It always stays on the ground: when it
  // reaches a rock spire it digs under it (it can't shoot or be hit while
  // underground) and only comes up again where it has room to fire, so it
  // tunnels right under a row of close spires in one go.
  mortarCrawler: {
    sprite: 'crawler',
    hp: 3,
    score: 50,
    dropChance: 0.15,
    gore: { metal: 8 },
    init(e, game) {
      e.y = game.terrain.floorY - e.h;
      e.timer = 0.6;
      e.under = crawlerAtRock(e, game.terrain) || crawlerCovered(e, game.terrain, CRAWLER_ROOM); // no room? start dug in
    },
    muzzle(e) {
      return { x: e.x + 1, y: e.y - 1 };
    },
    isVulnerable(e) {
      return !e.under;
    },
    // Underground it can't be hit or bumped into.
    hitTest(e, x, y, w, h) {
      return !e.under && rectsOverlap(x, y, w, h, e.x + 1, e.y + 1, e.w - 2, e.h - 2) ? 'hit' : null;
    },
    update(e, dt, game) {
      const terrain = game.terrain;
      e.y = terrain.floorY - e.h + (e.under ? 0 : Math.floor(e.t * 6) % 2); // little steps
      // A spire just ahead (or over it): dig under it, in a puff of dust,
      // and tunnel along fast until it's clear of the rock *and* has room to
      // fire before the next spire, then pop back out. (Coming up in a narrow
      // gap between spires, where it could never fire, would be pointless.)
      const rock = crawlerAtRock(e, terrain);
      if (rock && !e.under) {
        e.under = true;
        e.charge = 0;
        game.burst(e.x + e.w / 2, terrain.floorY - 2, 10, 50, DIRT);
      } else if (e.under && !rock && !crawlerCovered(e, terrain, CRAWLER_ROOM)) {
        e.under = false;
        e.timer = Math.max(e.timer, 0.6); // a moment before it can fire
        game.burst(e.x + e.w / 2, terrain.floorY - 2, 10, 50, DIRT);
      }
      // Underground it tunnels fast; tucked behind a spire it hurries on;
      // out in the open it walks slowly while it shells you.
      const covered = !e.under && crawlerCovered(e, terrain);
      e.x -= (GROUND_SPEED + (e.under ? 60 : covered ? 36 : 13)) * dt;
      if (e.under) return;
      // Fair play: it only fires when you could shoot back, so it holds its
      // fire while a spire stands right in front of it (and blinks again
      // before its next shot once it's in the open).
      const inRange = e.x > 40 && e.x < VIEW_W - 20 && !covered;
      if (!inRange) {
        e.timer = Math.max(e.timer, 0.4);
        e.charge = 0;
        return;
      }
      e.timer -= dt;
      e.charge = e.timer < 0.4 ? 1 : 0;
      if (e.timer <= 0) {
        e.charge = 0;
        e.timer = 1.8;
        const p = game.player;
        game.spawnEnemy('mortarShell', e.x + 1, e.y - 2, { tx: p.x + p.w / 2, ty: p.y + p.h / 2 });
        sfx.mortar();
      }
    },
    draw(e, ctx, snap, game, spr) {
      if (!e.under) {
        ctx.drawImage(spr, snap(e.x), snap(e.y));
        return;
      }
      // Tunnelling: a little mound of churned-up dirt moving along the floor
      // (only in the open — under a spire, it's hidden by the rock).
      // (Columns of half a pixel, rising and falling as it churns.)
      const floorY = game.terrain.floorY;
      for (let i = 0; i < e.w; i += FINE) {
        if (game.terrain.hits(e.x + i, floorY - 4, 1, 4)) continue;
        const k = Math.round(i / FINE);
        const h = 1 + Math.sin(i * 0.9) * 0.5 + ((k + Math.floor(game.time * 20)) % 3 === 0 ? 0.5 : 0);
        ctx.fillStyle = DIRT[k % 3];
        ctx.fillRect(snap(e.x) + i, floorY - snapFine(h), FINE, snapFine(h));
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
      // (A ring of one-pixel dots, twice as many as before so it reads as a
      // smooth circle, and a cross.)
      ctx.fillStyle = Math.floor(e.t * 12) % 2 === 0 ? PAL.red : PAL.redSoft;
      for (let i = 0; i < 40; i++) {
        const a = (i * Math.PI) / 20;
        if (i % 4 === 3) continue;
        ctx.fillRect(snapFine(tx + Math.cos(a) * r) - 0.5, snapFine(ty + Math.sin(a) * r) - 0.5, 1, 1);
      }
      ctx.fillRect(tx - 2.5, ty - 0.5, 5, 1);
      ctx.fillRect(tx - 0.5, ty - 2.5, 1, 5);
      // The shell: a round iron ball with a lit fuse.
      const x = snap(e.x);
      const y = snap(e.y);
      ctx.fillStyle = PAL.ink;
      fillDisc(ctx, x + 2, y + 2, 2);
      ctx.fillStyle = e.flash > 0 ? PAL.cream : PAL.amberDark;
      fillDisc(ctx, x + 2, y + 2, 1.5);
      ctx.fillStyle = PAL.amberSoft;
      ctx.fillRect(x + 1, y + 1, 1, FINE);
      if (Math.floor(game.time * 16) % 2 === 0) {
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(x + 1.5, y + 0.5, 1, 1);
      }
    },
  },

  rockjaw: ROCKJAW_TYPE,
  siegeCrawler: SIEGE_CRAWLER_TYPE,
  ...CRAWLER_MINIONS,
  glacierWarden: GLACIER_WARDEN_TYPE,
  ...WARDEN_MINIONS,

  // ---- Frostring ----

  // Rime Guard: a gunship frozen inside an ice shell. While frozen it's
  // harmless: your shots crack the shell (4 hits; a bomb or the laser breaks
  // it at once), or it thaws itself free after 5 s on screen (its ice
  // flickers and drips for the last second). Free, it tracks your height
  // and, while you're in front of it, blinks and fires an aimed 3-shot burst
  // every 1.8 s; after 3 bursts it leaves (or after 6 s with you behind
  // it). All Rime Guards look alike, and
  // about a third carry loot (like the Rust Raiders).
  rimeGuard: {
    flies: true, // steers round ice (see Game.keepClearOfIce)
    sprite: 'rimeIced',
    hp: 3,
    score: 50,
    ram: 2,
    dropChance: 0.35,
    hurtDropChance: 0.5,
    ammoLoot: true,
    explodeSize: 0.6,
    gore: { metal: 8 },
    init(e) {
      e.frozen = true;
      e.shell = RIME_SHELL;
      e.thaw = RIME_THAW;
      e.mode = 'enter';
      e.targetX = e.targetX ?? VIEW_W - 44;
      e.bursts = 0;
      e.burstLeft = 0;
      e.fireTimer = 0.8;
      e.charge = 0;
    },
    // (Frozen counts as armour, so rockets go for something else first.)
    isVulnerable: (e) => !e.frozen,
    // Hits on a frozen Rime Guard crack its shell instead.
    shield(e, amount, game, hx, hy) {
      if (!e.frozen) return false;
      e.shell -= amount;
      e.flash = 0.06;
      game.burst(hx, hy, 3, 40, ICE_COLORS.slice(2));
      if (e.shell <= 0) breakFree(e, game, true);
      else sfx.iceChip();
      return true;
    },
    update(e, dt, game) {
      const p = game.player;
      if (e.mode === 'enter') {
        e.x += (e.targetX - e.x) * Math.min(1, dt * 2.2) - 6 * dt;
        if (e.x - e.targetX < 2) e.mode = 'hold';
      } else if (e.mode === 'leave' || e.mode === 'retreat') {
        // (Retreat: backing out to the right after getting wedged in, see
        // keepApart. It holds again as soon as it's clear of the others,
        // if that's still on screen; otherwise it's gone.)
        e.charge = 0;
        e.x += (e.mode === 'leave' ? -55 : 70) * dt;
        keepApart(e, dt, game);
        if (e.mode === 'retreat' && e.x + e.w < VIEW_W - 2 && !nearGuard(e, game)) {
          e.mode = 'hold';
          e.targetX = e.x;
        }
        return;
      }
      if (e.frozen) {
        keepApart(e, dt, game);
        if (e.x < VIEW_W - e.w) e.thaw -= dt; // (it only thaws once it's on screen)
        if (e.thaw <= 0) breakFree(e, game, false);
        return;
      }
      // Free: track your height (slowly; one in a group keeps to its own
      // lane above or below).
      e.y += clamp(p.y + p.h / 2 - e.h / 2 + (e.laneOff || 0) - e.y, -1, 1) * 22 * dt;
      e.y = clamp(e.y, HUD_H + 2, game.terrain.floorY - e.h - 2);
      keepApart(e, dt, game);
      if (e.mode !== 'hold') return;
      const inFront = p.x + p.w < e.x - 6;
      if (e.burstLeft > 0) {
        // Mid-burst: the next shot (only while you're still in front).
        if (!inFront) {
          e.burstLeft = 0;
          return;
        }
        e.burstGap -= dt;
        if (e.burstGap <= 0) {
          game.fireAtPlayer(e.x - 1, e.y + e.h / 2, 84);
          e.burstGap = 0.13;
          if (--e.burstLeft === 0 && ++e.bursts >= 3) e.mode = 'leave';
        }
        return;
      }
      if (!inFront) {
        e.fireTimer = Math.max(e.fireTimer, RIME_BLINK);
        e.charge = 0;
        // (You've flown past it: after a while it gives up and leaves.)
        if ((e.idle = (e.idle || 0) + dt) > RIME_IDLE) e.mode = 'leave';
        return;
      }
      e.idle = 0;
      e.fireTimer -= dt;
      e.charge = e.fireTimer < RIME_BLINK ? 1 : 0;
      if (e.fireTimer <= 0) {
        e.charge = 0;
        e.burstLeft = 3;
        e.burstGap = 0;
        e.fireTimer = 1.8;
      }
    },
    draw(e, ctx, snap, game) {
      const x = snap(e.x);
      const y = snap(e.y);
      if (!e.frozen) {
        ctx.drawImage(SPRITES['rimeGuard' + (e.flash > 0 ? 'Flash' : '')], x, y);
        return;
      }
      // Frozen: the shell, cracking as it's hit; in its last second it
      // drips and flickers (the ice and the gunship inside it in turn:
      // about to break free).
      if (e.thaw < 1 && Math.floor(e.thaw * 12) % 2 === 0 && !(e.flash > 0)) {
        const g = SPRITES.rimeGuard;
        ctx.drawImage(g, x + Math.floor((e.w - g.width) / 2), y + Math.floor((e.h - g.height) / 2));
      } else {
        ctx.drawImage(SPRITES['rimeIced' + (e.flash > 0 ? 'Flash' : '')], x, y);
        ctx.fillStyle = ICE_COLORS[0];
        for (const [cx, cy, k] of RIME_CRACKS) if (k < RIME_SHELL - e.shell) ctx.fillRect(x + cx, y + cy, 1, 1);
      }
      if (e.thaw < 1) {
        ctx.fillStyle = ICE_COLORS[3];
        for (let i = 0; i < 3; i++) ctx.fillRect(x + 3 + i * 4, y + e.h + ((Math.floor(game.time * 10) + i * 2) % 4), 1, 1);
      }
    },
  },

  // Cryo Layer: an ore hauler crossing the top of the screen, dropping 3-4
  // frost mines behind it as it goes.
  cryoLayer: {
    flies: true, // steers round ice
    onLift(e, d) {
      e.baseY -= d;
    },
    sprite: 'cryoLayer',
    hp: 5,
    score: 60,
    ram: 2,
    dropChance: 0.15,
    explodeSize: 0.7,
    gore: { metal: 10 },
    init(e, game) {
      e.vx = -(36 + game.rand() * 8);
      e.baseY = e.y;
      e.dropTimer = 0.3;
      e.dropped = 0;
      e.mines = e.mines ?? 3 + (game.rand() < 0.5 ? 1 : 0);
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.y = e.baseY + Math.sin(e.t * 2) * 2;
      if (e.dropped < e.mines && e.x < VIEW_W - 24 && e.x > 40) {
        e.dropTimer -= dt;
        if (e.dropTimer <= 0) {
          e.dropTimer = 0.85;
          e.dropped++;
          game.spawnEnemy('frostMine', e.x + 5, e.y + 6, { vy: 40 + game.rand() * 110 });
        }
      }
    },
  },

  // A frost mine: drifts slowly with the ice. Come close and it blinks for
  // half a second, then bursts into 6 icicles (1 block each); touch it and it
  // bursts at once. Shoot it and it breaks harmlessly. Left alone it fizzles
  // out after 8 s, and one that drifts into a slab of ice just fizzles.
  frostMine: {
    sprite: 'frostMine',
    hp: 1,
    score: 10,
    harmless: true, // (it hurts by bursting, not by ramming)
    noDrop: true,
    inset: 0,
    gore: { ice: 6 },
    init(e) {
      e.vy = e.vy ?? 26; // (how far it falls before it settles: about vy / 2.5 pixels)
      e.life = MINE_LIFE;
      e.fuse = 0;
    },
    muzzle(e) {
      return { x: e.x + 2, y: e.y + 2 };
    },
    update(e, dt, game) {
      e.x -= MINE_DRIFT * dt;
      e.vy *= 1 - Math.min(1, dt * 2.5);
      e.y += e.vy * dt;
      e.life -= dt;
      if (e.life <= 0 || game.terrain.slabAt(e.x, e.y, e.w, e.h)) {
        fizzle(e, game);
        return;
      }
      if (game.playerVulnerable() && game.touchesPlayer(e.x, e.y, e.w, e.h)) {
        burstMine(e, game);
        return;
      }
      if (e.fuse > 0) {
        e.fuse -= dt;
        e.charge = 1;
        if (e.fuse <= 0) burstMine(e, game);
        return;
      }
      const c = game.playerCenter();
      if (game.state === 'playing' && Math.hypot(c.x - (e.x + e.w / 2), c.y - (e.y + e.h / 2)) < MINE_RANGE) e.fuse = MINE_FUSE;
    },
    draw(e, ctx, snap) {
      // Armed: it flashes, fast.
      const lit = e.fuse > 0 && Math.floor(e.fuse * 16) % 2 === 0;
      ctx.drawImage(SPRITES['frostMine' + (lit || e.flash > 0 ? 'Flash' : '')], snap(e.x), snap(e.y));
    },
  },

  // Prism: an ice crystal drifting in. The first ordinary hit splits it into
  // two small shards; a powerful hit (a bomb, a rocket, the laser) shatters
  // it whole first.
  prism: {
    flies: true, // steers round ice
    onLift(e, d) {
      e.baseY -= d;
    },
    sprite: 'prism',
    hp: 3,
    score: 30,
    ram: 2,
    dropChance: 0.1,
    gore: { ice: 14 },
    init(e, game) {
      e.vx = -(22 + game.rand() * 8);
      e.baseY = e.y;
      e.phase = game.rand() * 6;
    },
    update(e, dt) {
      e.x += e.vx * dt;
      e.y = e.baseY + Math.sin(e.t * 1.8 + e.phase) * 4;
    },
    onHit(e, game, hx, hy, amount) {
      const powerful = amount >= 3 || e.laserAcc !== undefined;
      if (!powerful) e.split = true;
      e.hp = 0; // either way, it breaks now
    },
    onDeath(e, game) {
      if (!e.split) return;
      for (const side of [-1, 1]) game.spawnEnemy('prismShard', e.x + 2, e.y + 2, { vy: side * 55, vx: -14 });
    },
  },

  // A small shard of a Prism: it flies apart from its twin, blinks, fires
  // one aimed shot (only while you're in front of it), and flees.
  prismShard: {
    flies: true, // steers round ice
    sprite: 'prismShard',
    hp: 1,
    score: 15,
    ram: 1,
    noDrop: true,
    gore: { ice: 6 },
    init(e) {
      e.timer = SHARD_AIM + SHARD_BLINK;
      e.fired = false;
      e.charge = 0;
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.vy *= 1 - Math.min(1, dt * 3);
      e.y = clamp(e.y + e.vy * dt, HUD_H + 1, game.terrain.floorY - e.h - 1);
      if (e.fired) {
        e.vx = Math.max(-90, e.vx - 160 * dt); // flee
        return;
      }
      const p = game.player;
      const inFront = p.x + p.w < e.x - 4;
      e.timer -= dt;
      e.charge = inFront && e.timer < SHARD_BLINK ? 1 : 0;
      if (e.timer <= 0) {
        e.charge = 0;
        e.fired = true;
        if (inFront) game.fireAtPlayer(e.x - 1, e.y + e.h / 2, 84);
      }
    },
  },
};

const RIME_SHELL = 4; // hits to crack a frozen Rime Guard's shell
const RIME_THAW = 5; // seconds on screen before it thaws itself free
const RIME_BLINK = 0.4; // its warning blink before each burst
const RIME_IDLE = 6; // seconds free with you behind it before it leaves
// Where cracks show in its shell: [x, y, shown after this many hits].
const RIME_CRACKS = [[5, 3, 0], [6, 4, 0], [7, 4, 0], [9, 7, 1], [8, 8, 1], [4, 8, 2], [3, 7, 2], [10, 3, 2], [11, 4, 3], [6, 9, 3]];
const MINE_LIFE = 8; // seconds before an untouched frost mine fizzles out
const MINE_DRIFT = 22; // how fast mines drift left
const MINE_RANGE = 26; // how close your ship sets one off...
const MINE_FUSE = 0.5; // ...and how long it blinks before it bursts
const SHARD_AIM = 0.35; // a Prism shard flies apart this long...
const SHARD_BLINK = 0.4; // ...then blinks this long before it fires

// A Rime Guard breaking out of its shell (shot open: +10 points), and now
// a smaller, uncovered gunship in the middle of where the shell was.
function breakFree(e, game, shotOpen) {
  e.frozen = false;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  e.w = SPRITES.rimeGuard.width;
  e.h = SPRITES.rimeGuard.height;
  e.x = cx - e.w / 2;
  e.y = cy - e.h / 2;
  e.fireTimer = Math.max(e.fireTimer, 0.8); // a moment (and a blink) before its first burst
  for (let i = 0; i < 10; i++) game.burst(cx + (game.rand() - 0.5) * 12, cy + (game.rand() - 0.5) * 10, 1, 45, ICE_COLORS.slice(1));
  sfx.shatter();
  if (shotOpen) game.score += 10;
}

// Rime Guards never stack up looking like one ship: one that overlaps
// another (or nearly) moves out of its way, the upper one up and the lower
// one down (one pinned at the top or bottom edge stays, and the other
// moves), and the right-hand one also edges right (the left-hand one left),
// for when ice leaves only one gap for both of them (two leaving side by
// side through a gap, too).
// Rime Guards flying off (leave) or backing out (retreat).
const moving = (g) => g.mode === 'leave' || g.mode === 'retreat';
// Is another Rime Guard touching this one (or within 2 pixels)?
const nearGuard = (e, game) => game.enemies.some((o) => o !== e && o.type === 'rimeGuard' && !o.dead &&
  e.x < o.x + o.w + 2 && o.x < e.x + e.w + 2 && e.y < o.y + o.h + 2 && o.y < e.y + e.h + 2);

function keepApart(e, dt, game) {
  const top = HUD_H + 2;
  const low = game.terrain.floorY - e.h - 2;
  let stuck = false;
  for (const o of game.enemies) {
    if (o === e || o.type !== 'rimeGuard' || o.dead) continue;
    if (e.x >= o.x + o.w + 2 || o.x >= e.x + e.w + 2) continue;
    if (e.y >= o.y + o.h + 2 || o.y >= e.y + e.h + 2) continue;
    const first = game.enemies.indexOf(e) < game.enemies.indexOf(o);
    const ey = e.y + e.h / 2;
    const oy = o.y + o.h / 2;
    const above = ey < oy || (ey === oy && first);
    const want = above ? o.y - e.h - 2 : o.y + o.h + 2;
    e.y = clamp(e.y + clamp(want - e.y, -60 * dt, 60 * dt), top, low);
    // Sideways: they move apart, except that a guard flying off (or backing
    // out) past one that's staying keeps going, and the other makes way
    // (moving against it, so they pass quickly).
    const passing = moving(e) !== moving(o);
    if (passing && moving(e)) continue;
    const ex = e.x + e.w / 2;
    const ox = o.x + o.w / 2;
    const behind = ex > ox || (ex === ox && !first); // this one's further back (right)
    const right = passing ? o.mode === 'leave' : behind;
    e.x = clamp(e.x + (right ? 30 : -30) * dt, Math.min(e.x, VIEW_W * 0.45), Math.max(e.x, VIEW_W - e.w - 2));
    // Still half on top of a guard that's staying, from behind it?
    if (!moving(o) && behind) {
      const ow = Math.min(e.x + e.w, o.x + o.w) - Math.max(e.x, o.x);
      const oh = Math.min(e.y + e.h, o.y + o.h) - Math.max(e.y, o.y);
      if (ow > 0 && oh > 0 && ow * oh > 0.25 * e.w * e.h) stuck = true;
    }
  }
  // Wedged on top of another guard with no room to move (ice and other
  // guards all round): after a moment the one further back backs out to
  // the right until it's clear, so two guards never sit stacked into one.
  e.stuck = stuck ? (e.stuck || 0) + dt : 0;
  if (e.stuck > 0.3 && !moving(e)) {
    e.mode = 'retreat';
    e.stuck = 0;
    e.charge = 0;
    e.burstLeft = 0;
  }
}

// A frost mine bursting into 6 icicles.
function burstMine(e, game) {
  e.dead = true;
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const a0 = game.rand() * Math.PI;
  for (let k = 0; k < 6; k++) game.fireShot(cx, cy, a0 + (k * Math.PI) / 3, 70, 'icicle');
  game.burst(cx, cy, 8, 50, ICE_COLORS.slice(1));
  sfx.shatter();
}

// A frost mine fizzling out harmlessly.
function fizzle(e, game) {
  e.dead = true;
  game.burst(e.x + e.w / 2, e.y + e.h / 2, 4, 25, ICE_COLORS.slice(2));
}

const SHELL_TIME = 0.9; // seconds from launch to burst
const DIVE_VY = 30; // a pod falling faster than this is dive-bombing
// Is a mortar crawler at (or about to walk into) a spire? Then it digs under.
const crawlerAtRock = (e, terrain) => terrain.hits(e.x - 3, terrain.floorY - e.h, e.w + 4, e.h) !== null;
// Is a mortar crawler tucked behind a spire (one right in front of it, with
// no room for your ship to slip in between and shoot it)?
const crawlerCovered = (e, terrain, reach = 26) => terrain.spires.some((s) => s.x + s.w <= e.x + 2 && s.x + s.w > e.x - reach);
// How much open ground a crawler needs in front of it before it comes up:
// enough to walk out and fire at least once before the next spire covers it.
const CRAWLER_ROOM = 48;
// How high a dust skimmer flies: just above the floor, or clear of any spire
// just ahead of it (it flies left) or under it.
function skimHeight(e, terrain) {
  let want = terrain.floorY - e.h - 2;
  for (const s of terrain.spires) {
    if (s.x + s.w > e.x - 30 && s.x < e.x + e.w + 4) want = Math.min(want, s.top - e.h - ROCK_CLEARANCE);
  }
  return want;
}
const RAIDER_FIRST = 0.5; // a raider's first shot (once you're in its sights)
const RAIDER_TURN = 0.45; // ...and how much later each one in its convoy fires
const RAIDER_BLINK = 0.3; // its warning blink before each shot
const TURRET_OPEN = 1.6; // seconds a cliff turret stays open (its core exposed)
const DIRT = ['#57302a', '#7a4632', '#9a6a4a'];
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

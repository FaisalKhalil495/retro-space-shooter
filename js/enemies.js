import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.10.1';
import { ROCKS } from './rockart.js?v=0.10.1';
import { ROCKJAW_TYPE } from './bosses.js?v=0.10.1';
import { clamp, rectHitsCircle } from './util.js?v=0.10.1';

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
      if (e.spitAt && e.t > e.spitAt && e.x < VIEW_W - 20 && e.x > game.player.x + 20) {
        e.spitAt = 0;
        game.fireAtPlayer(e.x, e.y + e.h / 2, 58);
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
      e.y = clamp(e.y, HUD_H + 2, VIEW_H - e.h - 2);
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
        e.x -= 30 * dt;
        e.y += (e.y < VIEW_H / 2 ? -40 : 40) * dt;
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

  rockjaw: ROCKJAW_TYPE,
};

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
    rockLoot: size === 'big',
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
    update(e, dt) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // Drifting rocks bounce gently off the top and bottom so they stay in
      // play; falling meteors just fall through.
      if (!e.fall) {
        if (e.y < HUD_H - e.h / 3 && e.vy < 0) e.vy = -e.vy;
        if (e.y > VIEW_H - (e.h * 2) / 3 && e.vy > 0) e.vy = -e.vy;
      }
    },
    onDeath,
    draw(e, ctx, snap) {
      const set = e.flash > 0 ? ROCKS[size + 'Flash'] : ROCKS[size];
      ctx.drawImage(set[e.variant], snap(e.x), snap(e.y));
    },
  };
}

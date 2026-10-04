import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.5.0';
import { ROCKS } from './rockart.js?v=0.5.0';
import { ROCKJAW_TYPE } from './bosses.js?v=0.5.0';
import { clamp, rectHitsCircle } from './util.js?v=0.5.0';

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
    gore: { blood: 14, flesh: 4, metal: 3, splat: 1 },
    init(e) {
      e.vx = -(e.speed || 46);
      e.vy = e.vy || 0;
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.shooter && !e.fired) {
        const inView = e.flip ? e.x > 30 : e.x < VIEW_W - 34;
        if (inView) {
          e.aim = (e.aim || 0) + dt;
          e.charge = 1;
          if (e.aim > 0.35) {
            e.fired = true;
            e.charge = 0;
            game.fireAtPlayer(e.x + (e.flip ? e.w : 0), e.y + e.h / 2, 74);
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
    gore: { blood: 22, flesh: 8, splat: 1.6 },
    init(e, game) {
      e.baseY = e.y;
      e.amp = e.amp || 18;
      e.phase = e.phase || 0;
      e.spitAt = game.rand() < 0.35 ? 0.9 + game.rand() * 2 : 0;
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
    gore: { blood: 20, flesh: 6, metal: 9, splat: 1.5 },
    init(e) {
      e.mode = 'enter';
      e.targetX = e.targetX || VIEW_W - 52;
      e.fireTimer = 0.7;
      e.shots = 0;
      e.charge = 0;
    },
    update(e, dt, game) {
      if (e.mode === 'enter') {
        e.x += (e.targetX - e.x) * Math.min(1, dt * 2.6) - 8 * dt;
        if (e.x - e.targetX < 2) e.mode = 'hold';
      } else if (e.mode === 'hold') {
        const py = game.player.y + game.player.h / 2 - e.h / 2;
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
    gore: { blood: 10, flesh: 3, metal: 3, splat: 1 },
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
      // A 'smart' pod decides what's inside at the moment it's opened.
      const kind = e.drop === 'smart' ? game.smartSupply() : e.drop;
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
  // Big rocks break into blinking fragments when shot.
  // - In Rockjaw's fight: 2 fragments flying up and down, away from you.
  // - In the level: 3 fragments bursting out in all directions, including
  //   towards you, so blasting a big rock in your face is a risk.
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
      game.spawnEnemy('rockShard', cx, cy, { vx: e.vx * 0.3 + Math.cos(a) * 55, vy: Math.sin(a) * 55 });
    }
  }, { crystals: [2, 3] }),
  rockSmall: rockType('small', 2, 5, 5, 2, null, { crystals: [0, 1] }),

  // Streaker: a small rock moving very fast at a slight angle. A red marker
  // flashes on the right edge just before one arrives.
  streaker: rockType('small', 1, 15, 4, 2, null, {
    crystals: [1, 1],
    init(e, game) {
      e.variant = Math.floor(game.rand() * ROCKS.small.length);
      e.w = ROCKS.small[e.variant].width;
      e.h = ROCKS.small[e.variant].height;
      e.vx = e.vx ?? -(90 + game.rand() * 16);
      e.vy = e.vy ?? 0;
    },
    update(e, dt, game) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // Dust trail streaming behind it.
      if (game.rand() < dt * 40) {
        game.particles.push({
          x: e.x + e.w / 2 + 3, y: e.y + e.h / 2 + (game.rand() - 0.5) * 3, vx: 30, vy: 0,
          life: 0.25, max: 0.25, color: game.rand() < 0.5 ? '#75605f' : '#4d3f45', size: 1,
        });
      }
    },
  }),

  // Boulder: huge and very tough. Mostly you fly around it; break it and it
  // splits into three big rocks.
  boulder: rockType('boulder', 40, 120, 15, 3, (e, game) => {
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 1.2 + Math.PI;
      game.spawnEnemy('rockBig', e.x + e.w / 2 - 14, e.y + e.h / 2 - 14, {
        vx: e.vx + Math.cos(a) * 25,
        vy: Math.sin(a) * 30,
      });
    }
  }, {
    solid: true, // ramming it hurts you and knocks you back, but it survives
    explodeSize: 1.6,
    dropChance: 0.25,
    crystals: [5, 5],
    gore: { rock: 24 },
    init(e, game) {
      e.variant = Math.floor(game.rand() * ROCKS.boulder.length);
      e.w = ROCKS.boulder[e.variant].width;
      e.h = ROCKS.boulder[e.variant].height;
      if (e.centerY != null) e.y = e.centerY - e.h / 2;
      e.vx = e.vx ?? -22;
      e.vy = e.vy ?? 0;
    },
  }),

  // Treasure rock: crystal veins glint in the stone. Tough to crack, but it
  // always holds a power-up (or special weapon) and a burst of crystals.
  treasure: rockType('treasure', 14, 150, 9, 3, (e, game) => {
    const kind = !e.drop || e.drop === 'smart' ? game.smartSupply() : e.drop;
    game.spawnPickup(kind, e.x + e.w / 2 - 4, e.y + e.h / 2 - 4);
  }, {
    crystals: [8, 8],
    gore: { rock: 14 },
    init(e, game) {
      e.variant = Math.floor(game.rand() * ROCKS.treasure.length);
      e.w = ROCKS.treasure[e.variant].width;
      e.h = ROCKS.treasure[e.variant].height;
      if (e.centerY != null) e.y = e.centerY - e.h / 2;
      e.vx = e.vx ?? -26;
      e.vy = e.vy ?? 0;
    },
    draw(e, ctx, snap, game) {
      const set = e.flash > 0 ? ROCKS.treasureFlash : ROCKS.treasure;
      ctx.drawImage(set[e.variant], snap(e.x), snap(e.y));
      // A twinkling glint so it stands out from ordinary rocks.
      const tw = Math.floor(game.time * 3 + e.variant) % 3;
      const gx = snap(e.x) + Math.round(e.w * (0.35 + tw * 0.15));
      const gy = snap(e.y) + Math.round(e.h * (0.3 + (tw % 2) * 0.3));
      ctx.fillStyle = PAL.cream;
      ctx.fillRect(gx - 1, gy, 3, 1);
      ctx.fillRect(gx, gy - 1, 1, 3);
    },
  }),

  // A fragment of a big rock: weaker (costs 1 health block), slower, and it
  // just flies off the screen instead of bouncing back into play.
  rockShard: {
    ...rockType('small', 1, 3, 4, 1),
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

function rockType(size, hp, score, radius, ram, onDeath, extra = {}) {
  return {
    hp,
    score,
    ram,
    dropChance: size === 'big' ? 0.06 : 0,
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
    onDeath: onDeath || undefined,
    draw(e, ctx, snap) {
      const set = e.flash > 0 ? ROCKS[size + 'Flash'] : ROCKS[size];
      ctx.drawImage(set[e.variant], snap(e.x), snap(e.y));
    },
    ...extra,
  };
}

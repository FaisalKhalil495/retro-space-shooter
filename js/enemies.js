import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.2.0';
import { ROCKS } from './rockart.js?v=0.2.0';
import { ROCKJAW_TYPE } from './bosses.js?v=0.2.0';
import { clamp, rectHitsCircle } from './util.js?v=0.2.0';

// Each enemy type: its sprite, toughness, points, and how it moves.
// Optional extras: draw (custom drawing), onDeath, inset (forgiving hitbox),
// harmless (doesn't hurt on contact), hitTest (custom hit areas, used by
// bosses), aimPoint (where homing rockets aim).
export const ENEMY_TYPES = {
  // Flies straight across. Fodder.
  drifter: {
    sprite: 'drifter',
    hp: 1,
    score: 10,
    init(e) {
      e.vx = -(e.speed || 46);
    },
    update(e, dt) {
      e.x += e.vx * dt;
    },
  },

  // Weaves up and down in a snake-like chain.
  weaver: {
    sprite: 'weaver',
    hp: 1,
    score: 20,
    init(e) {
      e.baseY = e.y;
      e.amp = e.amp || 18;
      e.phase = e.phase || 0;
    },
    update(e, dt) {
      e.x -= 40 * dt;
      e.y = e.baseY + Math.sin(e.t * 2.6 + e.phase) * e.amp;
    },
  },

  // Slides in, stops, fires aimed shots at the player, then pushes on through.
  gunner: {
    sprite: 'gunner',
    hp: 4,
    score: 50,
    init(e) {
      e.mode = 'enter';
      e.targetX = e.targetX || VIEW_W - 52;
      e.fireTimer = 0.9;
      e.shots = 0;
      e.charge = 0;
    },
    update(e, dt, game) {
      if (e.mode === 'enter') {
        e.x += (e.targetX - e.x) * Math.min(1, dt * 2.4) - 8 * dt;
        if (e.x - e.targetX < 2) e.mode = 'hold';
      } else if (e.mode === 'hold') {
        // Track the player's height a little while hovering.
        const py = game.player.y + game.player.h / 2 - e.h / 2;
        e.y += clamp(py - e.y, -1, 1) * 14 * dt;
        e.fireTimer -= dt;
        // Warn the player for a moment before each shot (fair, not cheap).
        e.charge = e.fireTimer < 0.3 ? 1 : 0;
        if (e.fireTimer <= 0) {
          game.fireAtPlayer(e.x - 1, e.y + e.h / 2, 64);
          e.shots++;
          e.fireTimer = 1.15;
          if (e.shots >= 3) e.mode = 'leave';
        }
      } else {
        e.charge = 0;
        e.x -= 54 * dt;
      }
      e.y = clamp(e.y, HUD_H + 2, VIEW_H - e.h - 2);
    },
  },

  // Small dart that steers towards the player's height as it crosses.
  seeker: {
    sprite: 'seeker',
    hp: 2,
    score: 30,
    init(e) {
      e.vy = 0;
    },
    update(e, dt, game) {
      e.x -= 58 * dt;
      // Only steers while it's still in front of the player.
      if (e.x > game.player.x + 10) {
        const want = game.player.y + game.player.h / 2 - (e.y + e.h / 2);
        e.vy += clamp(want, -1, 1) * 70 * dt;
        e.vy = clamp(e.vy, -34, 34);
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
    init(e) {
      e.baseY = e.y;
    },
    update(e, dt) {
      e.x -= 26 * dt;
      e.y = e.baseY + Math.sin(e.t * 2) * 3;
    },
    onDeath(e, game) {
      game.spawnPickup(e.drop, e.x + e.w / 2 - 4, e.y + e.h / 2 - 4);
    },
    draw(e, ctx, snap, game, spr) {
      ctx.drawImage(spr, snap(e.x), snap(e.y));
      const info = game.pickupInfo(e.drop);
      ctx.fillStyle = Math.floor(e.t * 4) % 2 ? info.light : info.color;
      ctx.fillRect(snap(e.x) + 4, snap(e.y) + 4, 5, 1);
    },
  },

  // Asteroids drift slowly across. Big ones split in two when destroyed.
  rockBig: rockType('big', 6, 25, 9, (e, game) => {
    for (const side of [-1, 1]) {
      game.spawnEnemy('rockSmall', e.x + e.w / 2 - 5, e.y + e.h / 2 - 5, {
        vx: e.vx * 1.15,
        vy: side * (18 + game.rand() * 10),
      });
    }
  }),
  rockSmall: rockType('small', 2, 5, 5),

  rockjaw: ROCKJAW_TYPE,
};

function rockType(size, hp, score, radius, onDeath) {
  return {
    hp,
    score,
    explodeSize: size === 'big' ? 1 : 0.5,
    // Rocks are round, so hits are checked against a circle, not a box.
    hitTest(e, x, y, w, h) {
      return rectHitsCircle(x, y, w, h, e.x + e.w / 2, e.y + e.h / 2, radius) ? 'hit' : null;
    },
    init(e, game) {
      const set = ROCKS[size];
      e.variant = e.variant ?? Math.floor(game.rand() * set.length);
      e.w = set[e.variant].width;
      e.h = set[e.variant].height;
      e.vx = e.vx ?? -(28 + game.rand() * 14);
      e.vy = e.vy ?? (game.rand() - 0.5) * 10;
    },
    update(e, dt) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // Bounce gently off the top and bottom so rocks stay in play.
      if (e.y < HUD_H - e.h / 3 && e.vy < 0) e.vy = -e.vy;
      if (e.y > VIEW_H - (e.h * 2) / 3 && e.vy > 0) e.vy = -e.vy;
    },
    onDeath,
    draw(e, ctx, snap) {
      const set = e.flash > 0 ? ROCKS[size + 'Flash'] : ROCKS[size];
      ctx.drawImage(set[e.variant], snap(e.x), snap(e.y));
    },
  };
}

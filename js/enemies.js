import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.1.0';

// Each enemy type: its sprite, toughness, points, and how it moves.
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
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

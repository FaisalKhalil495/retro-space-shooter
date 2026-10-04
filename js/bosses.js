import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.2.0';
import { ROCKJAW } from './rockart.js?v=0.2.0';
import { sfx } from './audio.js?v=0.2.0';
import { clamp, rectHitsCircle, rectsOverlap } from './util.js?v=0.2.0';

// ROCKJAW — boss of The Outer Belt.
// A living asteroid. Its rocky hide shrugs off every shot. Every few seconds
// it rumbles, opens its jaw and spits rocks at you, and only while the jaw is
// open can its soft mouth be hurt. Below half health it gets angry: it opens
// up more often and spits three rocks at a time.

const R = ROCKJAW.radius;

export const ROCKJAW_TYPE = {
  boss: true,
  name: 'ROCKJAW',
  hp: 90,
  score: 2500,
  explodeSize: 2,

  init(e) {
    e.w = ROCKJAW.frames[0].width;
    e.h = ROCKJAW.frames[0].height;
    e.x = VIEW_W + 4;
    e.y = (VIEW_H + HUD_H) / 2 - e.h / 2;
    e.targetX = VIEW_W - e.w + 4;
    e.mode = 'enter';
    e.timer = 0;
    e.jaw = 0;
    e.spits = 0;
    e.wobble = 0;
  },

  update(e, dt, game) {
    const angry = e.hp < e.maxHp / 2;
    e.timer += dt;
    e.wobble = 0;
    const set = (mode) => {
      e.mode = mode;
      e.timer = 0;
    };

    // Drift up and down to stay level with the player, slower with the jaw open.
    if (e.mode !== 'enter' && e.mode !== 'dying') {
      const cy = e.y + e.h / 2;
      const py = game.player.y + game.player.h / 2;
      const speed = e.mode === 'open' ? 8 : angry ? 26 : 18;
      e.y += clamp(py - cy, -speed, speed) * dt * 1.2;
      e.y = clamp(e.y, HUD_H - e.h / 4, VIEW_H - (e.h * 3) / 4);
    }

    switch (e.mode) {
      case 'enter':
        e.x += (e.targetX - e.x) * Math.min(1, dt * 1.1);
        if (e.timer > 2.6) {
          sfx.roar();
          game.shake = Math.max(game.shake, 3);
          set('closed');
        }
        break;
      case 'closed':
        e.jaw = 0;
        if (e.timer > (angry ? 1.3 : 2.2)) {
          sfx.rumble();
          set('opening');
        }
        break;
      case 'opening':
        // Shudders before opening: the player's cue to line up a shot.
        e.wobble = 1;
        e.jaw = Math.min(1, e.timer / 0.45);
        if (e.timer >= 0.45) {
          e.spits = 0;
          set('open');
        }
        break;
      case 'open': {
        e.jaw = 1;
        const spitTimes = [0.35, 1.0, 1.65];
        if (e.spits < spitTimes.length && e.timer >= spitTimes[e.spits]) {
          e.spits++;
          spit(e, game, angry);
        }
        if (e.timer > 2.15) set('closing');
        break;
      }
      case 'closing':
        e.jaw = Math.max(0, 1 - e.timer / 0.25);
        if (e.timer >= 0.25) set('closed');
        break;
      case 'dying':
        // A chain of explosions across its body, then one big blast.
        e.wobble = 2;
        e.boomTimer = (e.boomTimer || 0) - dt;
        if (e.boomTimer <= 0) {
          e.boomTimer = 0.11;
          const a = game.rand() * Math.PI * 2;
          const d = game.rand() * R * 0.8;
          game.burst(e.x + e.w / 2 + Math.cos(a) * d, e.y + e.h / 2 + Math.sin(a) * d, 10, 60);
          sfx.explode(0.6);
          game.shake = Math.max(game.shake, 2.5);
        }
        if (e.timer > 1.9) game.finishBoss(e);
        break;
    }
  },

  // Rockets home in on the mouth.
  aimPoint(e) {
    return { x: e.x + e.w / 2 - R * 0.6, y: e.y + e.h / 2 };
  },

  isVulnerable(e) {
    return e.jaw >= 0.6 && e.mode !== 'dying';
  },

  // 'hit' = struck the soft mouth, 'block' = bounced off rock, null = missed.
  hitTest(e, x, y, w, h) {
    if (e.mode === 'dying') return null;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    if (!rectHitsCircle(x, y, w, h, cx, cy, R * 0.95)) return null;
    if (ROCKJAW_TYPE.isVulnerable(e) && rectsOverlap(x, y, w, h, cx - R - 2, cy - R * 0.4, R * 0.85, R * 0.8)) {
      return 'hit';
    }
    return 'block';
  },

  draw(e, ctx, snap, game) {
    const i = Math.round(e.jaw * 3);
    const img = e.flash > 0 ? ROCKJAW.flash[i] : ROCKJAW.frames[i];
    const wx = e.wobble ? Math.round((game.rand() - 0.5) * 2 * e.wobble) : 0;
    const wy = e.wobble ? Math.round((game.rand() - 0.5) * 2 * e.wobble) : 0;
    ctx.drawImage(img, snap(e.x) + wx, snap(e.y) + wy);
  },
};

function spit(e, game, angry) {
  const mx = e.x + e.w / 2 - R * 0.9;
  const my = e.y + e.h / 2;
  const p = game.player;
  const base = Math.atan2(p.y + p.h / 2 - my, p.x + p.w / 2 - mx);
  const angles = angry ? [base - 0.32, base, base + 0.32] : [base];
  for (const a of angles) {
    game.spawnEnemy('rockSmall', mx - 8, my - 8, { vx: Math.cos(a) * 58, vy: Math.sin(a) * 58 });
  }
  sfx.rumble();
}

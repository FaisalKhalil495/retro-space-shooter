import { VIEW_W, VIEW_H, PAL } from './config.js?v=0.26.0';
import { drawText } from './font.js?v=0.26.0';
import { FINE } from './detail.js?v=0.26.0';
import { sfx } from './audio.js?v=0.26.0';
import { buzz } from './feedback.js?v=0.26.0';

// Special weapons and pickups.
// The player carries ONE special at a time. A pickup gives some shots;
// picking up the same kind tops it up, a different kind replaces it.

export const SPECIALS = {
  bomb: { label: 'B', name: 'BOMBS', color: PAL.red, light: PAL.redSoft, ammo: 3, max: 5 },
  rockets: { label: 'R', name: 'ROCKETS', color: PAL.amberSoft, light: PAL.amberLight, ammo: 4, max: 8 },
  laser: { label: 'L', name: 'LASER', color: PAL.blue, light: PAL.bluePale, ammo: 3, max: 5 },
};
const LIFE_PICKUP = { label: '+', name: 'EXTRA LIFE', color: PAL.cream, light: '#ffffff' };
// Ammo from rocks: tops up whatever special you carry when you collect it
// (a random one if you carry none), so it never swaps your weapon away.
const AMMO_PICKUP = { label: 'A', name: 'AMMO', color: PAL.amberSoft, light: PAL.amberLight };
const SPECIAL_KINDS = Object.keys(SPECIALS);

export const BOMB_DAMAGE = 8;
const BOMB_SPEED = 300;  // how fast the shockwave ring spreads (game px/s)
const ROCKET_DAMAGE = 4;
const LASER_TIME = 0.8;
const LASER_DPS = 18;

export function pickupInfo(kind) {
  return kind === 'life' ? LIFE_PICKUP : kind === 'ammo' ? AMMO_PICKUP : SPECIALS[kind];
}

// Draw a pickup capsule (also used for the corner icon).
// A rounded square with a thin ink edge, a lit top edge and its letter.
export function drawCapsule(ctx, kind, x, y, blink = false, dim = false) {
  const info = pickupInfo(kind);
  const F = FINE;
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x + F, y, 9 - F * 2, 9);
  ctx.fillRect(x, y + F, 9, 9 - F * 2);
  ctx.fillStyle = dim ? PAL.blueDark : blink ? info.light : info.color;
  ctx.fillRect(x + F * 2, y + F, 9 - F * 4, 9 - F * 2);
  ctx.fillRect(x + F, y + F * 2, 9 - F * 2, 9 - F * 4);
  if (!dim && !blink) {
    ctx.fillStyle = info.light;
    ctx.fillRect(x + F * 2, y + F, 9 - F * 4, F);
  }
  drawText(ctx, info.label, x + 2, y + 2, dim ? PAL.blue : PAL.ink);
}

export class Weapons {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.kind = null;
    this.ammo = 0;
    this.bombs = [];
    this.rockets = [];
    this.laser = null;
  }

  collect(kind) {
    const g = this.game;
    if (kind === 'life') {
      g.lives = Math.min(g.lives + 1, 6);
      sfx.oneUp();
      g.showToast('EXTRA LIFE');
      return;
    }
    if (kind === 'ammo') kind = this.kind || SPECIAL_KINDS[Math.floor(g.rand() * SPECIAL_KINDS.length)];
    const s = SPECIALS[kind];
    if (this.kind === kind) this.ammo = Math.min(s.max, this.ammo + s.ammo);
    else {
      this.kind = kind;
      this.ammo = s.ammo;
    }
    sfx.pickup();
    buzz(20);
    g.showToast(s.name);
  }

  // Called when the Special button is pressed.
  fire() {
    const g = this.game;
    const p = g.player;
    if (!this.kind || this.ammo <= 0) {
      sfx.empty();
      g.showToast('NO SPECIAL WEAPON');
      return;
    }
    if (this.kind === 'laser' && this.laser) return; // still firing
    this.ammo--;
    const nose = { x: p.x + p.w - 2, y: p.y + p.h / 2 };
    if (this.kind === 'bomb') {
      this.bombs.push({ x: nose.x - 6, y: nose.y, r: 0, hit: new Set() });
      g.shake = Math.max(g.shake, 4);
      g.flash = 0.12;
      sfx.bomb();
      buzz(60);
    } else if (this.kind === 'rockets') {
      for (const side of [-1, 1]) {
        this.rockets.push({ x: nose.x - 6, y: nose.y + side * 4, vx: 40, vy: side * 50, t: 0, trail: [] });
      }
      sfx.rocket();
      buzz(25);
    } else if (this.kind === 'laser') {
      this.laser = { t: 0 };
      sfx.laser(LASER_TIME);
      buzz(LASER_TIME * 1000);
    }
    if (this.ammo <= 0) this.kind = null;
  }

  update(dt) {
    const g = this.game;
    const p = g.player;

    // Bomb: a shockwave ring that damages everything it sweeps over and wipes
    // out enemy bullets.
    for (const b of this.bombs) {
      b.r += BOMB_SPEED * dt;
      for (const e of g.enemies) {
        if (e.dead || b.hit.has(e)) continue;
        const d = Math.hypot(e.x + e.w / 2 - b.x, e.y + e.h / 2 - b.y);
        if (d < b.r + Math.max(e.w, e.h) / 2) {
          b.hit.add(e);
          g.damage(e, BOMB_DAMAGE);
        }
      }
      for (const s of g.enemyShots) {
        if (Math.hypot(s.x - b.x, s.y - b.y) < b.r) s.dead = true;
      }
      // ...and shatters every slab of ice it reaches.
      for (const s of g.terrain.slabs) {
        if (!s.dead && Math.hypot(s.x + s.w / 2 - b.x, s.y + s.h / 2 - b.y) < b.r + Math.max(s.w, s.h) / 2) {
          g.chipSlab(s, s.hp, s.x + s.w / 2, s.y + s.h / 2);
        }
      }
    }
    this.bombs = this.bombs.filter((b) => b.r < VIEW_W * 1.3);

    // Rockets: curve towards the nearest enemy.
    for (const r of this.rockets) {
      r.t += dt;
      // (A target that dies or digs underground is dropped for a new one.)
      const keep = r.target && !r.target.dead && !r.target.under;
      const target = keep ? r.target : (r.target = g.nearestEnemy(r.x, r.y));
      let ax = 260;
      let ay = 0;
      if (target && r.t > 0.12) {
        const tp = g.aimPoint(target);
        const dx = tp.x - r.x;
        const dy = tp.y - r.y;
        const d = Math.hypot(dx, dy) || 1;
        ax = (dx / d) * 520;
        ay = (dy / d) * 520;
      }
      r.vx += ax * dt;
      r.vy += ay * dt;
      const sp = Math.hypot(r.vx, r.vy);
      const max = 170;
      if (sp > max) {
        r.vx *= max / sp;
        r.vy *= max / sp;
      }
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 6) r.trail.shift();
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (g.strike(e, r.x - 2, r.y - 1, 4, 3, ROCKET_DAMAGE)) {
          r.dead = true;
          g.burst(r.x, r.y, 8, 60);
          break;
        }
      }
      if (r.t > 3 || r.x > VIEW_W + 10 || r.x < -10 || r.y < -10 || r.y > VIEW_H + 10) r.dead = true;
    }
    this.rockets = this.rockets.filter((r) => !r.dead);

    // Laser: a beam straight ahead from the ship's nose. Pierces everything.
    if (this.laser) {
      const L = this.laser;
      L.t += dt;
      if (L.t >= LASER_TIME || g.state !== 'playing') {
        this.laser = null;
      } else {
        const x0 = p.x + p.w - 2;
        const y = p.y + p.h / 2;
        L.x0 = x0;
        L.y = y;
        for (const e of g.enemies) {
          if (e.dead) continue;
          if (g.hits(e, x0, y - 2, VIEW_W - x0, 4)) {
            e.laserAcc = (e.laserAcc || 0) + LASER_DPS * dt;
            while (e.laserAcc >= 1 && !e.dead) {
              e.laserAcc -= 1;
              g.strike(e, x0, y - 2, VIEW_W - x0, 4, 1);
            }
          }
        }
        for (const s of g.enemyShots) {
          if (s.x > x0 && Math.abs(s.y - y) < 4) s.dead = true;
        }
        // It cuts straight through ice, breaking it as it goes.
        for (const s of g.terrain.slabs) {
          if (s.dead || s.x + s.w < x0 || y + 2 < s.y || y - 2 > s.y + s.h) continue;
          s.laserAcc = (s.laserAcc || 0) + LASER_DPS * dt;
          while (s.laserAcc >= 1 && !s.dead) {
            s.laserAcc -= 1;
            g.chipSlab(s, 1, Math.max(x0, s.x), y);
          }
        }
      }
    }
  }

  draw(ctx, snap) {
    for (const b of this.bombs) {
      const k = b.r / (VIEW_W * 1.3);
      ctx.strokeStyle = k < 0.5 ? PAL.amberLight : PAL.amberSoft;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(snap(b.x), snap(b.y), b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = PAL.cream;
      ctx.beginPath();
      ctx.arc(snap(b.x), snap(b.y), Math.max(0, b.r - 5), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const r of this.rockets) {
      r.trail.forEach((t, i) => {
        ctx.fillStyle = i % 2 ? PAL.amberSoft : PAL.grey;
        ctx.fillRect(snap(t.x), snap(t.y), FINE, FINE);
      });
      // A slim rocket: cream body with little fins and a red nose.
      const x = snap(r.x);
      const y = snap(r.y);
      ctx.fillStyle = PAL.cream;
      ctx.fillRect(x - 2, y - 0.75, 3.5, 1.5);
      ctx.fillStyle = PAL.grey;
      ctx.fillRect(x - 2, y - 1.25, 1, FINE);
      ctx.fillRect(x - 2, y + 0.75, 1, FINE);
      ctx.fillStyle = PAL.red;
      ctx.fillRect(x + 1, y - 0.75, 1.5, 1.5);
      ctx.fillRect(x + 2.5, y - 0.25, FINE, FINE);
    }

    if (this.laser && this.laser.x0 !== undefined) {
      const L = this.laser;
      const x0 = snap(L.x0);
      const y = snap(L.y);
      const fade = L.t > LASER_TIME - 0.15 ? 1 : Math.floor(L.t * 30) % 2;
      // The beam in half-pixel bands, from a blue edge to a white core.
      ctx.fillStyle = PAL.blue;
      ctx.fillRect(x0, y - 2, VIEW_W - x0, 4);
      ctx.fillStyle = '#7d96c4';
      ctx.fillRect(x0, y - 1.5, VIEW_W - x0, 3);
      ctx.fillStyle = PAL.bluePale;
      ctx.fillRect(x0, y - 1, VIEW_W - x0, 2);
      ctx.fillStyle = fade ? PAL.cream : PAL.bluePale;
      ctx.fillRect(x0, y - (fade ? 0.5 : 0), VIEW_W - x0, fade ? 1 : FINE);
      // A rounded flare at the muzzle.
      ctx.fillStyle = PAL.cream;
      ctx.fillRect(x0 - 1, y - 3, 2, 6);
      ctx.fillRect(x0 - 1.5, y - 2.5, 3, 5);
    }
  }

  // Corner display: which special is loaded and how many shots are left.
  drawHud(ctx) {
    const x = 3;
    const y = VIEW_H - 12;
    if (!this.kind) {
      drawCapsule(ctx, 'bomb', x, y, false, true);
      return;
    }
    drawCapsule(ctx, this.kind, x, y);
    const text = 'X' + this.ammo;
    drawText(ctx, text, x + 11.5, y + 2.5, PAL.ink);
    drawText(ctx, text, x + 11, y + 2, PAL.cream);
  }
}

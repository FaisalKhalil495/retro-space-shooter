import { PAL, PLAYER } from './config.js?v=0.25.0';
import { sfx } from './audio.js?v=0.25.0';
import { buzz } from './feedback.js?v=0.25.0';
import { fillDisc } from './util.js?v=0.25.0';
import { FINE } from './detail.js?v=0.25.0';

// Automatic power-ups: they work the moment you fly into them, no button.
// They're drawn as ROUND orbs, so they never get mixed up with the square
// special-weapon capsules you fire with the Special button.

export const POWERUPS = {
  shield: { name: 'SHIELD', color: '#34406a', light: PAL.bluePale, dur: 10, icon: 'shield' },
  repair: { name: 'REPAIR', color: PAL.redDark, light: PAL.redSoft, dur: 0, icon: 'plus' },
  spread: { name: 'SPREAD SHOT', color: PAL.amberDark, light: PAL.amber, dur: 12, icon: 'fan' },
  rapid: { name: 'RAPID FIRE', color: '#8a3a22', light: PAL.amberSoft, dur: 12, icon: 'bolt' },
  wingman: { name: 'WINGMAN', color: PAL.blue, light: PAL.cream, dur: 15, icon: 'ship' },
};
const SHIELD_HITS = 3;
const REPAIR_AMOUNT = 2;

// How likely each power-up is when an enemy or rock drops a random one.
const DROP_WEIGHTS = { repair: 3, shield: 2, spread: 2, rapid: 2, wingman: 1 };
// At full health a Repair would be wasted, so its share is split between
// Spread Shot and Rapid Fire instead.
const { repair: REPAIR_SHARE, ...REST } = DROP_WEIGHTS;
const FULL_HEALTH_WEIGHTS = {
  ...REST,
  spread: REST.spread + REPAIR_SHARE / 2,
  rapid: REST.rapid + REPAIR_SHARE / 2,
};
const TABLES = [DROP_WEIGHTS, FULL_HEALTH_WEIGHTS].map((weights) => ({
  entries: Object.entries(weights),
  total: Object.values(weights).reduce((a, b) => a + b, 0),
}));

export function randomPowerup(rand, fullHealth = false) {
  const { entries, total } = TABLES[fullHealth ? 1 : 0];
  let r = rand() * total;
  for (const [kind, w] of entries) {
    r -= w;
    if (r < 0) return kind;
  }
  return entries[entries.length - 1][0];
}

// The icons inside the orbs, drawn as lines (or filled shapes) on a 10x10
// grid of half pixels, like the lettering, so they stay crisp.
const ICONS = {
  shield: { d: 'M5 1 L8.8 2.4 L8.4 5.8 Q7.6 8.4 5 9.4 Q2.4 8.4 1.6 5.8 L1.2 2.4 Z', fill: false },
  plus: { d: 'M5 1 L5 9 M1 5 L9 5', fill: false },
  fan: { d: 'M1.2 5 L9 5 M1.2 5 L8.6 1.4 M1.2 5 L8.6 8.6', fill: false },
  bolt: { d: 'M6.6 0.6 L2.2 5.6 L5.2 5.6 L3.4 9.6 L8.2 4 L5.2 4 Z', fill: true },
  ship: { d: 'M1 1.2 L9.4 5 L1 8.8 L3.2 5 Z', fill: true },
};
for (const icon of Object.values(ICONS)) icon.path = new Path2D(icon.d);

// A 9x9 round orb with its icon: a thin ink edge, a lit upper-left and the
// icon in the middle (double detail).
export function drawOrb(ctx, kind, x, y, blink = false) {
  const info = POWERUPS[kind];
  const cx = x + 4.5;
  const cy = y + 4.5;
  ctx.fillStyle = PAL.ink;
  fillDisc(ctx, cx, cy, 4.5);
  ctx.fillStyle = blink ? info.light : info.color;
  fillDisc(ctx, cx, cy, 4);
  if (!blink) {
    ctx.fillStyle = info.light;
    ctx.fillRect(cx - 2.5, cy - 3.5, 1.5, FINE);
    ctx.fillRect(cx - 3.5, cy - 2.5, FINE, 1.5);
  }
  const icon = ICONS[info.icon];
  ctx.save();
  ctx.translate(x + 2, y + 2);
  ctx.scale(FINE, FINE);
  if (icon.fill) {
    ctx.fillStyle = blink ? PAL.ink : PAL.cream;
    ctx.fill(icon.path);
  } else {
    ctx.strokeStyle = blink ? PAL.ink : PAL.cream;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke(icon.path);
  }
  ctx.restore();
}

export class PowerUps {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.timers = {}; // kind -> seconds left
    this.shieldHits = 0;
    this.shieldFlash = 0;
    this.drone = null;
  }

  has(kind) {
    return (this.timers[kind] || 0) > 0;
  }

  collect(kind) {
    const g = this.game;
    const info = POWERUPS[kind];
    if (kind === 'repair') {
      g.health = Math.min(PLAYER.health, g.health + REPAIR_AMOUNT);
      sfx.repair();
    } else {
      this.timers[kind] = info.dur;
      if (kind === 'shield') this.shieldHits = SHIELD_HITS;
      if (kind === 'wingman' && !this.drone) {
        const p = g.player;
        this.drone = { x: p.x - 10, y: p.y - 12, cooldown: 0, side: -1 };
      }
      sfx.powerUp();
    }
    buzz(25);
    g.showToast(info.name);
  }

  // Called when something would hurt the player. Returns true if the shield
  // soaked it up.
  absorb() {
    if (!this.has('shield') || this.shieldHits <= 0) return false;
    this.shieldHits--;
    this.shieldFlash = 0.25;
    sfx.shieldHit();
    buzz(30);
    if (this.shieldHits <= 0) {
      this.timers.shield = 0;
      this.game.showToast('SHIELD DOWN');
    }
    return true;
  }

  fireInterval() {
    return PLAYER.fireInterval * (this.has('rapid') ? 0.5 : 1);
  }

  update(dt, input) {
    const g = this.game;
    for (const k of Object.keys(this.timers)) {
      if (this.timers[k] > 0) {
        this.timers[k] -= dt;
        if (this.timers[k] <= 0 && POWERUPS[k].dur) g.showToast(POWERUPS[k].name + ' OVER');
      }
    }
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);

    // Wingman drone: hovers above-behind the ship (or below, if there's no
    // room) and fires along with you.
    if (this.drone) {
      if (!this.has('wingman') || g.state === 'gameover') {
        g.burst(this.drone.x + 3, this.drone.y + 2, 8, 40);
        this.drone = null;
      } else {
        const p = g.player;
        const d = this.drone;
        d.side = p.y < 24 ? 1 : p.y > 110 ? -1 : d.side;
        const tx = p.x - 6;
        const ty = p.y + (d.side < 0 ? -12 : p.h + 4);
        d.x += (tx - d.x) * Math.min(1, dt * 8);
        d.y += (ty - d.y) * Math.min(1, dt * 8);
        d.cooldown -= dt;
        if (input.fire && g.state === 'playing' && d.cooldown <= 0) {
          d.cooldown = this.fireInterval() * 1.6;
          g.bullets.push({ x: d.x + 6, y: d.y + 2, vy: 0 });
        }
      }
    }
  }

  draw(ctx, snap) {
    const g = this.game;
    const p = g.player;
    if (this.has('shield') && g.state === 'playing') {
      const t = this.timers.shield;
      const ending = t < 2 && Math.floor(t * 10) % 2 === 0;
      if (!ending) {
        const cx = snap(p.x + p.w / 2);
        const cy = snap(p.y + p.h / 2);
        ctx.strokeStyle = this.shieldFlash > 0 ? PAL.cream : PAL.bluePale;
        ctx.globalAlpha = this.shieldFlash > 0 ? 1 : 0.7;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.stroke();
        // Dashed inner ring, slowly turning.
        ctx.strokeStyle = PAL.blue;
        ctx.setLineDash([2, 3]);
        ctx.lineDashOffset = -g.time * 12;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }
    if (this.drone) {
      const x = snap(this.drone.x);
      const y = snap(this.drone.y);
      const ending = this.timers.wingman < 2 && Math.floor(g.time * 10) % 2 === 0;
      if (!ending) {
        // A little rounded pod with a thin ink edge (double detail).
        const F = FINE;
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(x - F, y - F, 7.5, 5);
        ctx.fillRect(x - 1, y, 8.5, 3);
        ctx.fillStyle = PAL.blue;
        ctx.fillRect(x, y, 6.5, 4);
        ctx.fillRect(x - F, y + F, 7.5, 2.5);
        ctx.fillStyle = PAL.bluePale;
        ctx.fillRect(x + F, y, 5, F);
        ctx.fillStyle = PAL.blueDark;
        ctx.fillRect(x + F, y + 3.5, 5.5, F);
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(x + 6, y + 1, 1, 2);
        ctx.fillStyle = Math.floor(g.time * 30) % 2 ? PAL.amber : PAL.amberSoft;
        ctx.fillRect(x - 2, y + 1.5, 1.5, 1);
        ctx.fillRect(x - 1.5, y + 1, 1, 2);
      }
    }
  }

  // Top HUD: an orb per running power-up with a shrinking timer bar.
  drawHud(ctx, x0) {
    let x = x0;
    for (const kind of ['shield', 'spread', 'rapid', 'wingman']) {
      const t = this.timers[kind] || 0;
      if (t <= 0) continue;
      const blink = t < 2 && Math.floor(this.game.time * 8) % 2 === 0;
      drawOrb(ctx, kind, x, 1, blink);
      const frac = t / POWERUPS[kind].dur;
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x, 11, 9, 2);
      ctx.fillStyle = POWERUPS[kind].light;
      ctx.fillRect(x, 11, Math.max(1, Math.round(9 * frac)), 1);
      if (kind === 'shield') {
        for (let i = 0; i < this.shieldHits; i++) {
          ctx.fillStyle = PAL.cream;
          ctx.fillRect(x + 1 + i * 3, 12, 2, 1);
        }
      }
      x += 12;
    }
    return x;
  }
}


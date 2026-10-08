import { PAL, PLAYER } from './config.js?v=0.19.0';
import { sfx } from './audio.js?v=0.19.0';
import { buzz } from './feedback.js?v=0.19.0';

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
export const SHIELD_HITS = 3;
export const REPAIR_AMOUNT = 2;

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

// 5x5 pixel icons shown inside the orbs.
const ICONS = {
  shield: ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
  plus: ['..#..', '..#..', '#####', '..#..', '..#..'],
  fan: ['....#', '..##.', '#####', '..##.', '....#'],
  bolt: ['..##.', '.##..', '#####', '..##.', '.##..'],
  ship: ['##...', '.###.', '#####', '.###.', '##...'],
};

const ORB = ['..#####..', '.#######.', '#########', '#########', '#########', '#########', '#########', '.#######.', '..#####..'];

// A 9x9 round orb with its icon. `fade` (0..1) dims it, for running-out timers.
export function drawOrb(ctx, kind, x, y, blink = false) {
  const info = POWERUPS[kind];
  ctx.fillStyle = PAL.ink;
  ORB.forEach((row, ry) => {
    for (let rx = 0; rx < 9; rx++) if (row[rx] === '#') ctx.fillRect(x + rx, y + ry, 1, 1);
  });
  ctx.fillStyle = blink ? info.light : info.color;
  ORB.forEach((row, ry) => {
    if (ry === 0 || ry === 8) return;
    for (let rx = 1; rx < 8; rx++) {
      if (row[rx] === '#' && row[rx - 1] === '#' && row[rx + 1] === '#') ctx.fillRect(x + rx, y + ry, 1, 1);
    }
  });
  ctx.fillStyle = blink ? PAL.ink : PAL.cream;
  ICONS[info.icon].forEach((row, ry) => {
    for (let rx = 0; rx < 5; rx++) if (row[rx] === '#') ctx.fillRect(x + 2 + rx, y + 2 + ry, 1, 1);
  });
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
        ctx.lineWidth = 1;
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
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(x - 1, y - 1, 9, 6);
        ctx.fillStyle = PAL.blue;
        ctx.fillRect(x, y, 6, 4);
        ctx.fillStyle = PAL.bluePale;
        ctx.fillRect(x + 1, y, 4, 1);
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(x + 6, y + 1, 1, 2);
        ctx.fillStyle = Math.floor(g.time * 30) % 2 ? PAL.amber : PAL.amberSoft;
        ctx.fillRect(x - 2, y + 1, 2, 2);
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


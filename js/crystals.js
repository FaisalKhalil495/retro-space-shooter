import { VIEW_W, VIEW_H, PAL } from './config.js?v=0.5.0';
import { drawText } from './font.js?v=0.5.0';
import { sfx } from './audio.js?v=0.5.0';
import { buzz } from './feedback.js?v=0.5.0';

// Ember Crystals: small amber gems that pop out of broken asteroids. They're
// worth points, and every SURGE_AT crystals you collect triggers an
// "Ember Surge": a free power-up, chosen like a smart supply pod.

export const SURGE_AT = 25;
const POINTS = 10;
const LIFE = 7;          // seconds before an uncollected crystal fades away
const MAGNET = 24;       // crystals closer than this drift to the ship
const SCROLL = 20;       // they drift left with the scenery

export class Crystals {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.list = [];
    this.count = 0; // progress towards the next surge
    this.pulse = 0;
    this.chime = 0;
  }

  // A burst of crystals flying out from a broken rock.
  burst(x, y, n) {
    const r = this.game.rand;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const v = 25 + r() * 35;
      this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: r() * 0.3 });
    }
  }

  // A calm trail of crystals drifting in from the right (between sections).
  trail(n, y, wave = 0) {
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: VIEW_W + 6 + i * 10,
        y: y + Math.sin(i * 0.7) * wave,
        vx: 0,
        vy: 0,
        t: -i * 0.1,
        trail: true,
      });
    }
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const alive = g.state === 'playing' && p.entering <= 0;
    this.pulse = Math.max(0, this.pulse - dt);
    this.chime = Math.max(0, this.chime - dt * 1.5);
    for (const c of this.list) {
      c.t += dt;
      c.vx *= 1 - 2.5 * dt;
      c.vy *= 1 - 2.5 * dt;
      c.x += (c.vx - SCROLL) * dt;
      c.y += c.vy * dt;
      if (!alive) continue;
      const dx = px - c.x;
      const dy = py - c.y;
      const d = Math.hypot(dx, dy);
      if (d < MAGNET) {
        const pull = 160 * (1 - d / MAGNET) + 40;
        c.x += (dx / (d || 1)) * pull * dt;
        c.y += (dy / (d || 1)) * pull * dt;
      }
      if (d < 7) {
        c.taken = true;
        this.collect();
      }
    }
    const lifeOf = (c) => (c.trail ? LIFE + 6 : LIFE);
    this.list = this.list.filter((c) => !c.taken && c.t < lifeOf(c) && c.x > -6 && c.y > -6 && c.y < VIEW_H + 6);
  }

  collect() {
    const g = this.game;
    g.score += POINTS;
    this.count++;
    this.pulse = 0.2;
    sfx.crystal(this.chime);
    this.chime = Math.min(1, this.chime + 0.12);
    if (this.count >= SURGE_AT) {
      this.count -= SURGE_AT;
      g.emberSurge();
      buzz(40);
    }
  }

  draw(ctx, snap) {
    const g = this.game;
    for (const c of this.list) {
      if (c.t < 0) continue;
      const life = c.trail ? LIFE + 6 : LIFE;
      if (life - c.t < 2 && Math.floor(c.t * 10) % 2 === 0) continue; // fading: blink
      const x = snap(c.x);
      const y = snap(c.y);
      const glint = Math.floor((g.time + c.x * 0.05) * 6) % 6 === 0;
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - 1, y - 2, 3, 5);
      ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillStyle = PAL.amberSoft;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = glint ? PAL.cream : PAL.amberLight;
      ctx.fillRect(x, y - 1, 1, 2);
    }
  }

  // Bottom-right counter: a gem and "12/25".
  drawHud(ctx) {
    const text = `${this.count}/${SURGE_AT}`;
    const x = VIEW_W - 4 - text.length * 6;
    const y = VIEW_H - 8;
    const gx = x - 6;
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(gx - 1, y - 1, 5, 7);
    ctx.fillStyle = this.pulse > 0 ? PAL.cream : PAL.amberSoft;
    ctx.fillRect(gx, y, 3, 5);
    ctx.fillStyle = PAL.amberLight;
    ctx.fillRect(gx + 1, y, 1, 3);
    drawText(ctx, text, x + 1, y + 1, PAL.ink);
    drawText(ctx, text, x, y, this.pulse > 0 ? PAL.cream : PAL.amberLight);
  }
}

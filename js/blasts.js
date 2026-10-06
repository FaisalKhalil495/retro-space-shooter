import { PAL } from './config.js?v=0.14.3';
import { ROCK } from './gore.js?v=0.14.3';
import { fillDisc } from './util.js?v=0.14.3';

// Explosions, drawn as chunky pixel art in the warm palette (no neon, no
// glow). A blast is a quick white-hot flash, a fireball that swells and cools
// from cream to amber to red before breaking up, an optional shockwave ring
// for bigger things, and a few puffs of smoke that drift off with the scroll.
// Rocks get a puff of stone dust instead of a fireball.

const SCROLL = 18; // smoke drifts left with the near stars
const FIRE = [
  // [outer, inner, core] colours as the fireball cools
  [PAL.amberLight, PAL.cream, PAL.cream],
  [PAL.amber, PAL.amberLight, PAL.cream],
  [PAL.amberSoft, PAL.amber, PAL.amberLight],
  [PAL.red, PAL.amberSoft, PAL.amber],
  [PAL.redDark, PAL.red, PAL.amberSoft],
];
const SMOKE = [PAL.grey, '#3a3a52', PAL.blueDark];

export class Blasts {
  constructor(rand) {
    this.rand = rand;
    this.reset();
  }

  reset() {
    this.fires = [];
    this.rings = [];
    this.puffs = [];
  }

  // size: about 0.4 for small enemies, 0.8 for big ones, 1.5+ for huge.
  blast(x, y, size = 0.6) {
    const r = this.rand;
    const R = 4 + size * 7;
    this.fire(x, y, R, 0.22 + size * 0.22, 0);
    if (size >= 0.7) {
      // A couple of smaller secondary bursts, a moment later.
      const n = size >= 1.4 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const d = R * (0.5 + r() * 0.5);
        this.fire(x + Math.cos(a) * d, y + Math.sin(a) * d, R * (0.45 + r() * 0.2), 0.25, 0.05 + i * 0.06);
      }
      this.rings.push({ x, y, R: R * 2.3, t: 0, life: 0.28 + size * 0.08 });
    }
    const smoke = Math.round(2 + size * 4);
    for (let i = 0; i < smoke; i++) {
      const a = r() * Math.PI * 2;
      const v = 8 + r() * 14 * (0.5 + size);
      this.puffs.push({
        x: x + Math.cos(a) * 2, y: y + Math.sin(a) * 2,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        r: 1 + r() * (1 + size), grow: 3 + r() * 3,
        t: -(0.12 + r() * 0.12), life: 0.45 + r() * 0.35,
        color: SMOKE[Math.floor(r() * SMOKE.length)],
      });
    }
  }

  // A puff of stone dust (for rocks breaking up).
  dust(x, y, size = 0.6) {
    const r = this.rand;
    const n = Math.round(3 + size * 5);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const v = 10 + r() * 22 * (0.5 + size);
      this.puffs.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        r: 1 + r() * (1.5 + size * 2), grow: 2 + r() * 3,
        t: 0, life: 0.35 + r() * 0.3,
        color: ROCK[Math.floor(r() * ROCK.length)],
      });
    }
    this.fire(x, y, 2 + size * 3, 0.12, 0); // a brief flash of impact
  }

  fire(x, y, R, life, delay) {
    this.fires.push({ x, y, R, life, t: -delay });
  }

  update(dt) {
    for (const f of this.fires) {
      f.t += dt;
      f.x -= SCROLL * 0.3 * dt;
    }
    this.fires = this.fires.filter((f) => f.t < f.life);
    for (const g of this.rings) {
      g.t += dt;
      g.x -= SCROLL * 0.3 * dt;
    }
    this.rings = this.rings.filter((g) => g.t < g.life);
    for (const p of this.puffs) {
      p.t += dt;
      if (p.t < 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx = p.vx * (1 - 3 * dt) - SCROLL * dt;
      p.vy *= 1 - 3 * dt;
      p.r += p.grow * dt;
    }
    this.puffs = this.puffs.filter((p) => p.t < p.life);
  }

  draw(ctx, snap) {
    // Smoke first, so the fire sits on top of it.
    for (const p of this.puffs) {
      if (p.t < 0) continue;
      const k = p.t / p.life;
      disc(ctx, snap(p.x), snap(p.y), p.r, p.color, k > 0.5 ? (k > 0.8 ? 2 : 1) : 0);
    }
    for (const g of this.rings) {
      const k = g.t / g.life;
      ctx.fillStyle = k < 0.4 ? PAL.cream : PAL.amberSoft;
      ring(ctx, snap(g.x), snap(g.y), 3 + (g.R - 3) * Math.sqrt(k), k > 0.6);
    }
    for (const f of this.fires) {
      if (f.t < 0) continue;
      const k = f.t / f.life;
      const x = snap(f.x);
      const y = snap(f.y);
      // Swells quickly, then holds while it cools and breaks apart.
      const r = Math.max(1.5, f.R * Math.min(1, 0.35 + k * 2.2));
      const [outer, inner, core] = FIRE[Math.min(FIRE.length - 1, Math.floor(k * FIRE.length))];
      const breakup = k > 0.75 ? 2 : k > 0.55 ? 1 : 0;
      disc(ctx, x, y, r, outer, breakup);
      disc(ctx, x, y, r * 0.66, inner, breakup ? 1 : 0);
      if (k < 0.6) disc(ctx, x, y, r * 0.33, core, 0);
    }
  }
}

// A filled pixel disc. dither 1 keeps every other pixel (a checkerboard),
// 2 keeps one in four, so things look like they're breaking up as they fade.
// Dithered rows are filled with a repeating pattern: one draw call per row
// instead of one per pixel, which keeps big explosions cheap on phones.
function disc(ctx, cx, cy, r, color, dither = 0) {
  ctx.fillStyle = dither ? ditherPattern(ctx, color, dither) : color;
  fillDisc(ctx, cx, cy, r);
}

const patterns = new Map();
function ditherPattern(ctx, color, dither) {
  const key = color + dither;
  let pat = patterns.get(key);
  if (!pat) {
    const cv = document.createElement('canvas');
    cv.width = 2;
    cv.height = 2;
    const c = cv.getContext('2d');
    c.fillStyle = color;
    c.fillRect(0, 0, 1, 1);
    if (dither === 1) c.fillRect(1, 1, 1, 1);
    pat = ctx.createPattern(cv, 'repeat');
    patterns.set(key, pat);
  }
  return pat;
}

// A one-pixel circle outline (optionally dotted).
function ring(ctx, cx, cy, r, dotted) {
  const steps = Math.max(12, Math.round(r * 6));
  for (let i = 0; i < steps; i++) {
    if (dotted && i % 2) continue;
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}

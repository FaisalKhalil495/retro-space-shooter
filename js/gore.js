import { VIEW_H, BLOOD } from './config.js?v=0.19.1';
import { fillDisc } from './util.js?v=0.19.1';

// Blood, gore and debris. Only living creatures bleed: weavers lightly,
// Rockjaw fully. Machines and the player explode instead (see blasts.js).
// All the blood is switched off by BLOOD in config.js (a menu switch arrives
// in Stage 5).
//
// - droplets: small blood particles that spray out and slow down
// - gibs: tumbling chunks (flesh, bone, rock, metal, molten rock)
// - splats: blood stains left in space that drift away with the scroll
// - lens: blood smeared on the "screen glass" after very close kills
// - corpses: big pieces of a dead boss flying apart

export const BLOOD_COLORS = ['#3d1014', '#5a1a1e', '#7a2228', '#9e2f2f'];
export const FLESH = ['#5a1a1e', '#7a2228', '#9e2f2f', '#b0605a'];
export const BONE = ['#efe3cf', '#c9b9a0'];
export const MOLTEN = ['#8a3a22', '#b5562a', '#d9813f'];
export const METAL = ['#34406a', '#5a6a9a', '#6d6a73'];
export const GLASS = ['#9fb0d0', '#efe3cf'];
export const ROCK = ['#4d3f45', '#75605f', '#9c8478'];

const SCROLL = 18; // stains drift left at about the speed of the near stars

export class Gore {
  constructor(rand) {
    this.rand = rand;
    this.reset();
  }

  reset() {
    this.drops = [];
    this.gibs = [];
    this.splats = [];
    this.lens = [];
    this.corpses = [];
  }

  // A spray of blood. dir (radians) and spread aim it; omit dir for all round.
  blood(x, y, n, speed = 60, dir = null, spread = Math.PI, stains = true) {
    if (!BLOOD) return;
    const r = this.rand;
    for (let i = 0; i < n; i++) {
      const a = dir === null ? r() * Math.PI * 2 : dir + (r() - 0.5) * spread;
      const v = speed * (0.3 + r() * 0.8);
      const life = 0.5 + r() * 0.9;
      this.drops.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life,
        color: BLOOD_COLORS[1 + Math.floor(r() * 3)],
        size: r() < 0.45 ? 2 : 1,
        stain: stains && r() < 0.12, // some droplets leave a stain where they stop
      });
    }
  }

  // Tumbling chunks. Flesh chunks leave a trail of blood.
  chunks(x, y, n, palette = FLESH, speed = 70, bleeds = true) {
    if (!BLOOD && palette !== ROCK && palette !== METAL && palette !== MOLTEN && palette !== GLASS) return;
    const r = this.rand;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const v = speed * (0.35 + r() * 0.75);
      const life = 0.9 + r() * 1.2;
      this.gibs.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life, max: life,
        w: 1 + Math.floor(r() * 3), h: 1 + Math.floor(r() * 2),
        color: palette[Math.floor(r() * palette.length)],
        bleeds: bleeds && BLOOD,
        trail: 0,
      });
    }
  }

  // One special chunk (a tooth, a helmet...) drawn from a tiny pixel map.
  piece(x, y, rows, colors, vx, vy, spin = 0) {
    this.gibs.push({
      x, y, vx, vy, life: 2.5, max: 2.5, rows, colors, spin, angle: 0,
      bleeds: BLOOD && !!colors.bleeds, trail: 0,
    });
  }

  splat(x, y, size) {
    if (!BLOOD) return;
    const r = this.rand;
    const blobs = [];
    const n = 3 + Math.floor(size * 2);
    for (let i = 0; i < n; i++) {
      blobs.push({
        dx: (r() - 0.5) * size * 2.2, dy: (r() - 0.5) * size * 1.6,
        r: 0.6 + r() * size * 0.55, c: BLOOD_COLORS[Math.floor(r() * 3)],
      });
    }
    this.splats.push({ x, y, blobs, life: 3.5, max: 3.5 });
  }

  // Blood on the screen glass, near (x, y) in game pixels.
  smear(x, y, amount = 1) {
    if (!BLOOD) return;
    const r = this.rand;
    const n = Math.round(3 + amount * 4);
    for (let i = 0; i < n; i++) {
      this.lens.push({
        x: x + (r() - 0.5) * 50 * amount, y: y + (r() - 0.5) * 40 * amount,
        r: 2 + r() * 6 * amount, drip: 0, dripSpeed: 4 + r() * 10,
        life: 1.6 + r() * 1.2, max: 2.8, c: BLOOD_COLORS[1 + Math.floor(r() * 3)],
      });
    }
  }

  // A boss corpse half: part of an image that flies off spinning.
  // (bleeds: false for machines; floor: a ground line it comes to rest on.)
  corpse(img, sx, sy, sw, sh, x, y, vx, vy, spin, bleeds = true, floor = Infinity) {
    this.corpses.push({ img, sx, sy, sw, sh, x, y, vx, vy, spin, bleeds, floor, angle: 0, life: 3, max: 3, t: 0 });
  }

  update(dt) {
    for (const d of this.drops) {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx = d.vx * (1 - 1.6 * dt) - SCROLL * dt;
      d.vy *= 1 - 1.6 * dt;
      if (d.stain && d.life <= 0) this.splat(d.x, d.y, 1.2);
    }
    this.drops = this.drops.filter((d) => d.life > 0);

    for (const g of this.gibs) {
      g.life -= dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx = g.vx * (1 - 0.6 * dt) - SCROLL * 0.5 * dt;
      g.vy = g.vy * (1 - 0.6 * dt) + 14 * dt;
      if (g.spin) g.angle += g.spin * dt;
      if (g.bleeds && (g.trail -= dt) <= 0) {
        g.trail = 0.05;
        this.drops.push({
          x: g.x, y: g.y, vx: -g.vx * 0.1, vy: -g.vy * 0.1, life: 0.5, max: 0.5,
          color: BLOOD_COLORS[2], size: 1, stain: false,
        });
      }
    }
    this.gibs = this.gibs.filter((g) => g.life > 0 && g.x > -10 && g.y < VIEW_H + 10);

    for (const s of this.splats) {
      s.life -= dt;
      s.x -= SCROLL * dt;
    }
    this.splats = this.splats.filter((s) => s.life > 0 && s.x > -30);

    for (const l of this.lens) {
      l.life -= dt;
      l.drip = Math.min(l.drip + l.dripSpeed * dt, 18);
    }
    this.lens = this.lens.filter((l) => l.life > 0);

    for (const c of this.corpses) {
      c.t += dt;
      c.life -= dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 20 * dt;
      c.angle += c.spin * dt;
      if (c.y + c.sh / 2 > c.floor) {
        c.y = c.floor - c.sh / 2;
        c.vy = 0;
        c.spin = 0;
      }
      if (BLOOD && c.bleeds && Math.floor(c.t * 30) % 2 === 0) {
        this.blood(c.x, c.y, 2, 30);
      }
    }
    this.corpses = this.corpses.filter((c) => c.life > 0);
  }

  // Stains go under everything else.
  drawBack(ctx, snap) {
    for (const s of this.splats) {
      ctx.globalAlpha = Math.min(1, s.life / 1.2) * 0.85;
      for (const b of s.blobs) {
        ctx.fillStyle = b.c;
        fillDisc(ctx, snap(s.x + b.dx), snap(s.y + b.dy), b.r);
      }
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx, snap) {
    for (const c of this.corpses) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.life / 0.8);
      ctx.translate(snap(c.x), snap(c.y));
      ctx.rotate(c.angle);
      ctx.drawImage(c.img, c.sx, c.sy, c.sw, c.sh, -c.sw / 2, -c.sh / 2, c.sw, c.sh);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    for (const g of this.gibs) {
      ctx.globalAlpha = Math.min(1, g.life / 0.5);
      if (g.rows) {
        ctx.save();
        ctx.translate(snap(g.x), snap(g.y));
        ctx.rotate(g.angle);
        g.rows.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const col = g.colors[row[x]];
            if (!col) continue;
            ctx.fillStyle = col;
            ctx.fillRect(x - row.length / 2, y - g.rows.length / 2, 1, 1);
          }
        });
        ctx.restore();
      } else {
        ctx.fillStyle = g.color;
        ctx.fillRect(snap(g.x), snap(g.y), g.w, g.h);
      }
    }
    for (const d of this.drops) {
      ctx.globalAlpha = Math.min(1, (d.life / d.max) * 2);
      ctx.fillStyle = d.color;
      ctx.fillRect(snap(d.x), snap(d.y), d.size, d.size);
    }
    ctx.globalAlpha = 1;
  }

  // Screen-glass blood, drawn over the whole game view.
  drawLens(ctx) {
    for (const l of this.lens) {
      ctx.globalAlpha = Math.min(0.9, l.life / 0.8);
      ctx.fillStyle = l.c;
      fillDisc(ctx, Math.round(l.x), Math.round(l.y), l.r);
      ctx.fillRect(Math.round(l.x) - 1, Math.round(l.y), 2, Math.round(l.drip));
      ctx.fillRect(Math.round(l.x), Math.round(l.y + l.drip), 1, 2);
    }
    ctx.globalAlpha = 1;
  }
}

// Little pixel-map pieces.
export const TOOTH = { rows: ['ab', 'aa', '.a'], colors: { a: BONE[0], b: BONE[1] } };

import { look } from './look.js?v=0.38.0';

// The new look's effects (the look sample, after v0.37.0): light, staged
// explosions, sparks, wreckage and tumbling wrecks. Nothing here changes
// what happens in the game: it only draws, with its own dice (Math.random),
// so the game's dice roll the same whichever look is on.
//
// An explosion goes in stages: a white flash that lights everything near
// it, a fireball of rolling blobs that cool from white through amber to
// deep red and turn into smoke, sparks that streak away, shards of the
// thing that blew up, and (for big ones) a shockwave ring.
// Light is warm and soft, never neon: it's added on top of the picture, so
// a blast really does brighten the ships and rocks beside it.

const SCROLL = 18; // smoke drifts left with the near stars
const FIRE = ['#fff8e6', '#ffe9b0', '#ffd070', '#f6a94a', '#e97f36', '#c9552e', '#8f3326', '#56222a'];
const SMOKE = ['#4a4050', '#383444', '#2a2a3a', '#1f2030'];
const DUST = ['#b9a493', '#8f7a70', '#665558', '#473b42'];
const ICE = ['#f4fbff', '#cfe6f6', '#9fc4e2', '#6d94bd'];
export const SHARDS = {
  metal: ['#b3b4d6', '#7775a0', '#4d4b72', '#302e4e'],
  steel: ['#c8d4ec', '#8f9fc4', '#5a6a9a', '#34406a'],
  rock: ['#a28c7f', '#786560', '#524449', '#352b33'],
  flesh: ['#cf7d6c', '#a64942', '#782b30', '#4e1a24'],
  ice: ICE,
};
const LIGHTS = { warm: '#ffb469', hot: '#fff2d6', red: '#ff5c36', cool: '#8fc0ff', amber: '#ffcf7a', pale: '#dfeaff' };

// Pictures painted once: crisp pixel discs (per size and colour, at the
// art's fineness) and soft round lights.
const discs = new Map(); // fineness -> colour -> [by radius]
function discSprite(r, color, k) {
  let byK = discs.get(k);
  if (!byK) discs.set(k, (byK = new Map()));
  let list = byK.get(color);
  if (!list) byK.set(color, (list = []));
  let c = list[r];
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const x = c.getContext('2d');
  x.fillStyle = color;
  for (let y = -r; y < r; y++) {
    const half = Math.round(Math.sqrt(r * r - (y + 0.5) * (y + 0.5)));
    if (half) x.fillRect(r - half, y + r, half * 2, 1);
  }
  list[r] = c;
  return c;
}
// A soft round light, kept at several sizes (32 to 512 pixels across):
// drawing one at about its own size costs a slow phone far less than
// stretching and smoothing a single picture every frame.
const lightSprites = {};
const LIGHT_STOPS = [[0, 1], [0.12, 0.72], [0.3, 0.36], [0.55, 0.12], [0.8, 0.03], [1, 0]];
export function softLight(hex, S, stops = LIGHT_STOPS, sx = 1, sy = 1) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(S * sx));
  c.height = Math.max(1, Math.round(S * sy));
  const x = c.getContext('2d');
  x.scale(sx, sy);
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(',');
  for (const [stop, a] of stops) g.addColorStop(stop, `rgba(${rgb},${a})`);
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  return c;
}
function lightSprite(name, px) {
  const set = lightSprites[name] || (lightSprites[name] = []);
  let level = 0;
  while (level < 4 && 32 << level < px) level++;
  return set[level] || (set[level] = softLight(LIGHTS[name], 32 << level));
}
// Keep only the items that pass, without making a new list every step.
function keep(list, test) {
  let n = 0;
  for (let i = 0; i < list.length; i++) if (test(list[i])) list[n++] = list[i];
  list.length = n;
}

export class Fx {
  constructor() {
    this.reset();
  }

  reset() {
    this.blobs = []; // fire and smoke
    this.sparks = [];
    this.shards = [];
    this.pieces = []; // tumbling wrecks
    this.rings = [];
    this.flashes = []; // lights that fade
    this.frame = []; // lights lit for this frame only
    this.later = [];
    this.stop = 0; // a split-second pause on a big kill
  }

  // ---- making things ----
  // A light for this frame only (an engine, a shot): call it every frame.
  glow(x, y, r, color = 'warm', power = 0.5) {
    this.frame.push(x, y, r, color, power);
  }

  // A light that fades (a muzzle flash, a hit).
  flash(x, y, r, color = 'hot', power = 0.8, life = 0.1) {
    this.flashes.push({ x, y, r, color, power, life, t: 0 });
  }

  // An explosion. size: about 0.4 for small enemies, 0.8 big, 1.5+ huge.
  // shards: what flies out (a palette from SHARDS), or null.
  explode(x, y, size = 0.6, { shards = SHARDS.metal, delay = 0, vx = 0, vy = 0 } = {}) {
    if (delay > 0) {
      this.later.push({ t: delay, fn: () => this.explode(x, y, size, { shards, vx, vy }) });
      return;
    }
    const R = 4 + size * 7;
    const rnd = Math.random;
    this.flash(x, y, R * 5.5, 'hot', 0.95, 0.1 + size * 0.05);
    this.flash(x, y, R * 6.5, 'warm', 0.55, 0.45 + size * 0.25);
    // The fireball: blobs thrown outwards that slow, cool and turn to smoke.
    const n = Math.round(10 + size * 13);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const inner = i < n * 0.4;
      const v = (inner ? 6 + rnd() * 16 : 22 + rnd() * 46) * (0.6 + size * 0.5);
      this.blobs.push({
        x: x + Math.cos(a) * R * 0.15, y: y + Math.sin(a) * R * 0.15,
        vx: Math.cos(a) * v + vx * 0.5, vy: Math.sin(a) * v + vy * 0.5 - 4,
        r: R * (inner ? 0.42 + rnd() * 0.3 : 0.16 + rnd() * 0.24),
        t: -rnd() * 0.05, fire: (inner ? 0.34 : 0.22) + rnd() * 0.2 + size * 0.1, smoke: 0.35 + rnd() * 0.5 + size * 0.2,
        heat: inner ? 0 : 1,
      });
    }
    const sp = Math.round(8 + size * 14);
    for (let i = 0; i < sp; i++) {
      const a = rnd() * Math.PI * 2;
      const v = (50 + rnd() * 130) * (0.6 + size * 0.4);
      this.sparks.push({ x, y, vx: Math.cos(a) * v + vx, vy: Math.sin(a) * v + vy, t: 0, life: 0.25 + rnd() * 0.55, len: 0.03 + rnd() * 0.03, drag: 2.2 });
    }
    if (shards) this.debris(x, y, Math.round(4 + size * 7), shards, 40 + size * 50, true);
    if (size >= 0.7) this.rings.push({ x, y, R: R * 3.2, t: 0, life: 0.3 + size * 0.08 });
    if (size >= 0.8) this.stop = Math.max(this.stop, Math.min(0.09, 0.03 + size * 0.02));
  }

  // Shards of something that broke up (smoking: each trails a wisp).
  debris(x, y, n, palette, speed = 60, smoking = false) {
    const rnd = Math.random;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const v = speed * (0.3 + rnd() * 0.9);
      this.shards.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: rnd() * 6, vr: (rnd() - 0.5) * 22,
        size: 0.7 + rnd() * 1.3, pal: palette, t: 0, life: 0.6 + rnd() * 0.8, smoke: smoking && rnd() < 0.5 ? 0 : -1,
      });
    }
  }

  // A puff of dust (a rock breaking up, a shot stopping on stone or ice).
  dust(x, y, size = 0.6, palette = DUST) {
    const rnd = Math.random;
    const n = Math.round(5 + size * 7);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const v = (8 + rnd() * 30) * (0.5 + size * 0.6);
      this.blobs.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (2 + size * 3) * (0.5 + rnd() * 0.6), t: 0, fire: 0, smoke: 0.45 + rnd() * 0.5, pal: palette });
    }
    this.flash(x, y, 10 + size * 14, 'pale', 0.35, 0.12);
  }

  // Sparks where a shot lands. kind: 'metal', 'rock', 'ice', 'flesh', 'block'
  // (armour: the shot bounces off).
  hit(x, y, kind = 'metal') {
    const rnd = Math.random;
    if (kind === 'flesh') return;
    if (kind === 'rock' || kind === 'ice') {
      this.debris(x, y, 2, SHARDS[kind], 45);
      this.flash(x, y, 7, 'pale', 0.4, 0.07);
      return;
    }
    const n = kind === 'block' ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (rnd() - 0.5) * 2.4; // thrown back the way the shot came
      const v = 40 + rnd() * 90;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.12 + rnd() * 0.2, len: 0.035, drag: 3, cool: kind === 'block' });
    }
    this.flash(x, y, kind === 'block' ? 9 : 8, kind === 'block' ? 'cool' : 'hot', 0.6, 0.07);
  }

  // A tumbling wreck (or a piece of one). art: { frames, size } from
  // models.js. burn: trails fire and smoke. blast: the explosion it ends in.
  piece(art, x, y, vx, vy, { life = 0.7, burn = true, blast = 0.4, spin = 14, pull = 60, shards = SHARDS.metal } = {}) {
    this.pieces.push({ art, x, y, vx, vy, t: 0, life, burn, blast, spin: spin * (Math.random() < 0.5 ? -1 : 1), fr: Math.random() * art.frames.length, pull, shards, puff: 0 });
  }

  // ---- every step ----
  update(dt) {
    if (this.later.length) {
      for (const l of this.later) l.t -= dt;
      const due = this.later.filter((l) => l.t <= 0);
      this.later = this.later.filter((l) => l.t > 0);
      for (const l of due) l.fn();
    }

    for (const b of this.blobs) {
      b.t += dt;
      if (b.t < 0) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const drag = 1 - Math.min(1, 4.2 * dt);
      b.vx = b.vx * drag - (b.t > b.fire ? SCROLL * dt : 0);
      b.vy = b.vy * drag - (b.t > b.fire ? 5 * dt : 0); // (smoke lifts a little)
    }
    keep(this.blobs, (b) => b.t < b.fire + b.smoke);
    if (this.blobs.length > 260) this.blobs.splice(0, this.blobs.length - 260);

    for (const s of this.sparks) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const d = 1 - Math.min(1, s.drag * dt);
      s.vx *= d;
      s.vy = s.vy * d + 26 * dt;
    }
    keep(this.sparks, (s) => s.t < s.life);
    if (this.sparks.length > 320) this.sparks.splice(0, this.sparks.length - 320);

    for (const s of this.shards) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vr * dt;
      s.vx = s.vx * (1 - 1.2 * dt) - SCROLL * 0.4 * dt;
      s.vy *= 1 - 1.2 * dt;
      if (s.smoke >= 0) {
        s.smoke -= dt;
        if (s.smoke <= 0 && s.t < s.life * 0.7) {
          s.smoke = 0.05;
          this.blobs.push({ x: s.x, y: s.y, vx: 0, vy: 0, r: 0.9, t: 0, fire: 0, smoke: 0.3, pal: SMOKE });
        }
      }
    }
    keep(this.shards, (s) => s.t < s.life);

    for (const p of this.pieces) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.pull * dt;
      p.vx -= SCROLL * 0.5 * dt;
      p.fr += p.spin * dt;
      if (p.burn) {
        p.puff -= dt;
        if (p.puff <= 0) {
          p.puff = 0.035;
          const rnd = Math.random;
          this.blobs.push({ x: p.x + (rnd() - 0.5) * 3, y: p.y + (rnd() - 0.5) * 3, vx: p.vx * 0.2, vy: p.vy * 0.2, r: 1.4 + rnd() * 1.4, t: 0, fire: 0.1 + rnd() * 0.12, smoke: 0.35 + rnd() * 0.3, heat: 2 });
        }
      }
      if (p.t >= p.life && p.blast) this.explode(p.x, p.y, p.blast, { shards: p.shards, vx: p.vx * 0.3, vy: p.vy * 0.3 });
    }
    keep(this.pieces, (p) => p.t < p.life);

    for (const r of this.rings) r.t += dt;
    keep(this.rings, (r) => r.t < r.life);
    for (const f of this.flashes) f.t += dt;
    keep(this.flashes, (f) => f.t < f.life);
  }

  // ---- drawing ----
  // Smoke, fire, wrecks and shards (under shots and your ship).
  draw(ctx, snap) {
    const k = look.k;
    const put = (x, y, r, color) => {
      const ri = Math.max(1, Math.round(r * k));
      const s = discSprite(ri, color, k);
      ctx.drawImage(s, Math.round(x * k - ri) / k, Math.round(y * k - ri) / k, (ri * 2) / k, (ri * 2) / k);
    };
    // Smoke and dust first (the fire sits on top of them).
    for (const b of this.blobs) {
      if (b.t < b.fire || b.t < 0) continue;
      const q = (b.t - b.fire) / b.smoke;
      const pal = b.pal || SMOKE;
      const r = b.r * (0.75 + q * 0.7);
      ctx.globalAlpha = Math.max(0, (b.pal ? 0.6 : 0.5) * (1 - q) ** 1.3);
      const i = Math.min(pal.length - 2, Math.floor(q * (pal.length - 1)));
      put(b.x, b.y, r, pal[i + 1]);
      put(b.x - r * 0.18, b.y - r * 0.22, r * 0.68, pal[i]);
    }
    ctx.globalAlpha = 1;
    for (const p of this.pieces) {
      const f = p.art.frames[((Math.floor(p.fr) % p.art.frames.length) + p.art.frames.length) % p.art.frames.length];
      ctx.drawImage(f, snap(p.x - f.width / 2), snap(p.y - f.height / 2));
    }
    // Shards: little tumbling plates in the colours of what broke up.
    for (const s of this.shards) {
      const c = Math.cos(s.rot);
      const sn = Math.sin(s.rot);
      const w = s.size * (0.4 + 0.6 * Math.abs(Math.cos(s.rot * 0.7)));
      const h = s.size * 0.55;
      ctx.globalAlpha = s.t > s.life - 0.2 ? Math.max(0, (s.life - s.t) / 0.2) : 1;
      ctx.fillStyle = s.pal[Math.abs(Math.floor(s.rot * 1.3)) % s.pal.length];
      ctx.beginPath();
      ctx.moveTo(s.x + c * w - sn * h, s.y + sn * w + c * h);
      ctx.lineTo(s.x - c * w - sn * h, s.y - sn * w + c * h);
      ctx.lineTo(s.x - c * w + sn * h, s.y - sn * w - c * h);
      ctx.lineTo(s.x + c * w + sn * h, s.y + sn * w - c * h);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Fire: coolest first, so the white-hot hearts end up on top.
    for (let pass = 2; pass >= 0; pass--) {
      for (const b of this.blobs) {
        if (b.t < 0 || b.t >= b.fire || (b.heat || 0) !== pass) continue;
        const q = b.t / b.fire;
        const swell = Math.min(1, 0.45 + q * 4) * (q > 0.7 ? 1 - (q - 0.7) * 0.9 : 1);
        const r = b.r * swell;
        const i = Math.min(FIRE.length - 2, Math.floor(q * q * (FIRE.length - 1) + (b.heat || 0) * 0.9));
        put(b.x, b.y, r, FIRE[i + 1]);
        put(b.x - r * 0.1, b.y - r * 0.14, r * 0.74, FIRE[i]);
        if (r > 1.2 && q < 0.45 && i > 0) put(b.x - r * 0.16, b.y - r * 0.2, r * 0.42, FIRE[i - 1]);
      }
    }
  }

  // Everything that gives off light, added on top of the finished picture.
  drawLights(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sc = ctx.getTransform().a; // screen pixels per game pixel
    const F = this.frame;
    for (let i = 0; i < F.length; i += 5) {
      ctx.globalAlpha = F[i + 4];
      ctx.drawImage(lightSprite(F[i + 3], F[i + 2] * 2 * sc), F[i] - F[i + 2], F[i + 1] - F[i + 2], F[i + 2] * 2, F[i + 2] * 2);
    }
    F.length = 0;
    for (const f of this.flashes) {
      const q = 1 - f.t / f.life;
      ctx.globalAlpha = f.power * q * q;
      const r = f.r * (0.7 + 0.3 * q);
      ctx.drawImage(lightSprite(f.color, r * 2 * sc), f.x - r, f.y - r, r * 2, r * 2);
    }
    // Fire lights the smoke round it.
    for (const b of this.blobs) {
      if (b.t < 0 || b.t >= b.fire || b.heat) continue; // (the fireball's heart only)
      const q = 1 - b.t / b.fire;
      ctx.globalAlpha = 0.4 * q;
      ctx.drawImage(lightSprite('warm', b.r * 5.2 * sc), b.x - b.r * 2.6, b.y - b.r * 2.6, b.r * 5.2, b.r * 5.2);
    }
    // Sparks: bright streaks that cool as they fly.
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 3; pass++) {
      ctx.beginPath();
      for (const s of this.sparks) {
        const q = s.t / s.life;
        if ((q < 0.3 ? 0 : q < 0.65 ? 1 : 2) !== pass) continue;
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * s.len, s.y - s.vy * s.len);
      }
      ctx.globalAlpha = pass === 2 ? 0.7 : 1;
      ctx.strokeStyle = pass === 0 ? '#fff3d0' : pass === 1 ? '#ffb45a' : '#d9532e';
      ctx.lineWidth = pass === 0 ? 0.6 : 0.5;
      ctx.stroke();
    }
    // Shockwave rings.
    for (const r of this.rings) {
      const q = r.t / r.life;
      ctx.globalAlpha = 0.55 * (1 - q) ** 1.5;
      ctx.strokeStyle = '#ffe3b0';
      ctx.lineWidth = 0.4 + 1.6 * (1 - q);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 3 + (r.R - 3) * Math.sqrt(q), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

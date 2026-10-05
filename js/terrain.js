import { VIEW_W, VIEW_H } from './config.js?v=0.12.1';
import { seeded } from './util.js?v=0.12.1';

// Solid ground for levels that have it (Rust Moon first; the Ember Mines'
// tunnels will build on this). Two parts:
//   - a floor strip along the bottom: you can't fly into it, it doesn't hurt
//   - rock spires standing on the floor: they scroll with the ground, cost
//     2 health blocks if you crash into one, and stop shots.
// Everything here moves at GROUND_SPEED, the same speed as pickups drift,
// so the ground, spires, turrets on them and boulders all move together.

export const GROUND_SPEED = 20;

const FLOOR_COLORS = ['#3a2224', '#57302a', '#7a4632', '#9a6a4a'];
const SPIRE_COLORS = ['#2e1c1f', '#4a2a27', '#6b3d2e', '#8c5a3e', '#a8785a'];

// A spire is a tapering column of layered rock, painted once and reused.
const spireCache = new Map();
function spireImage(w, h, seed) {
  const key = w + 'x' + h + ':' + seed;
  if (spireCache.has(key)) return spireCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  const r = seeded(seed);
  const rows = [];
  for (let y = 0; y < h; y++) {
    // Narrow at the top, widest at the base, with a slightly ragged edge.
    const k = y / h;
    const half = Math.max(1.5, (w / 2) * (0.45 + 0.55 * Math.sqrt(k))) + (r() - 0.5) * 1.2;
    rows.push(half);
  }
  for (let y = 0; y < h; y++) {
    const half = rows[y];
    const band = Math.floor((y + Math.floor(r() * 2)) / 4) % 3; // rock strata
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - w / 2;
      if (Math.abs(dx) > half) continue;
      const edge = Math.abs(dx) > half - 1 || y === 0;
      // Lit from the upper left, like the asteroids.
      let shade = dx < -half * 0.3 ? 3 : dx < half * 0.35 ? 2 : 1;
      if (band === 1) shade = Math.max(1, shade - 1);
      if (y < 2) shade = Math.min(4, shade + 1);
      c.fillStyle = edge ? SPIRE_COLORS[0] : SPIRE_COLORS[shade];
      c.fillRect(x, y, 1, 1);
    }
  }
  spireCache.set(key, cv);
  return cv;
}

export class Terrain {
  // floor: height of the floor strip in game pixels (0 = no ground).
  constructor(floor = 0) {
    this.floor = floor;
    this.spires = [];
    this.scroll = 0;
  }

  get floorY() {
    return VIEW_H - this.floor;
  }

  // Stand a spire on the floor just off the right edge. Returns it so a
  // turret can be mounted on top.
  addSpire(h, w = 12, seed = 1) {
    const s = { x: VIEW_W + 4, w, h, top: this.floorY - h, img: spireImage(w, h, seed) };
    this.spires.push(s);
    return s;
  }

  update(dt) {
    this.scroll += GROUND_SPEED * dt;
    for (const s of this.spires) s.x -= GROUND_SPEED * dt;
    this.spires = this.spires.filter((s) => s.x > -s.w - 4);
  }

  // Does a rectangle touch solid rock? Spires use a slightly smaller box
  // than their drawing (the tapered top and ragged edges don't count), so
  // near-misses really are misses.
  hits(x, y, w, h) {
    for (const s of this.spires) {
      if (x < s.x + s.w - 2 && x + w > s.x + 2 && y + h > s.top + 3 && y < this.floorY) return s;
    }
    return null;
  }

  // Does a shot (or anything small) touch rock: a spire or the floor?
  // Levels without ground have no floor, so nothing stops at the bottom edge.
  solid(x, y, w, h) {
    return !!this.hits(x, y, w, h) || (this.floor > 0 && y + h > this.floorY);
  }

  draw(ctx, snap) {
    if (!this.floor) return;
    for (const s of this.spires) ctx.drawImage(s.img, snap(s.x), snap(s.top));
    // The floor: a strip of layered ground with pebbles, scrolling along.
    const y0 = this.floorY;
    ctx.fillStyle = FLOOR_COLORS[0];
    ctx.fillRect(0, y0, VIEW_W, this.floor);
    ctx.fillStyle = FLOOR_COLORS[2];
    ctx.fillRect(0, y0, VIEW_W, 1);
    ctx.fillStyle = FLOOR_COLORS[1];
    ctx.fillRect(0, y0 + 1, VIEW_W, 2);
    const off = Math.floor(this.scroll) % 16;
    for (let x = -off; x < VIEW_W + 16; x += 16) {
      ctx.fillStyle = FLOOR_COLORS[1];
      ctx.fillRect(x + 3, y0 + 5, 5, 1);
      ctx.fillRect(x + 10, y0 + 9, 4, 1);
      ctx.fillStyle = FLOOR_COLORS[3];
      ctx.fillRect(x + 6, y0 + 3, 2, 1);
      ctx.fillRect(x + 13, y0 + 7, 1, 1);
      ctx.fillStyle = FLOOR_COLORS[2];
      ctx.fillRect(x + 1, y0 + 11, 3, 1);
    }
  }
}

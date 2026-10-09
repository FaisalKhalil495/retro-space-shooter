import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.20.0';
import { seeded } from './util.js?v=0.20.0';

// Solid things in the way, for levels that have them:
//   - Rust Moon (and later the Ember Mines' tunnels): a floor strip along the
//     bottom (you can't fly into it; it doesn't hurt) and rock spires standing
//     on it, which scroll with the ground, cost 2 health blocks if you crash
//     into one, and stop shots.
//   - Frostring: drifting slabs of ice (see addSlab), which work like spires
//     but float, and break: your shots crack them until they shatter.
// Everything here moves at GROUND_SPEED, the same speed as pickups drift,
// so the ground, spires, the turrets on them and anything else standing on
// the ground all move together.

export const GROUND_SPEED = 20;
// The tallest a spire can be. (On levels with ground, cargo pods fly above
// it, so a spire can never get in the way of one.)
export const MAX_SPIRE = 74;
// Spires this tall or less count as "short": they only fill the bottom third
// of the screen. Ambushes from behind wait for a stretch of short spires.
export const SHORT_SPIRE = 44;
// How far flying things keep above a spire's top: enough to clear a cliff
// turret sitting on it too.
export const ROCK_CLEARANCE = 10;

// There's always at least this much open space to fly through, top to bottom,
// across any stretch of the screen SLAB_WINDOW wide (so slabs can't wall you in
// or make a staircase you can't squeeze through).
export const SLAB_GAP = 30;
const SLAB_WINDOW = 44;
const SLAB_DROP = 32; // how fast a slab drifting in from above or below moves into place
export const ICE_COLORS = ['#2a3a58', '#4d6890', '#7f9cc0', '#b8cde3', '#e6eef7'];

const FLOOR_COLORS = ['#3a2224', '#57302a', '#7a4632', '#9a6a4a'];
const SPIRE_COLORS = ['#2e1c1f', '#4a2a27', '#6b3d2e', '#8c5a3e', '#a8785a'];

// A spire is a tapering column of layered rock, painted once when it's made
// (each spire keeps its own picture; nothing is kept after it scrolls away).
function spireImage(w, h, seed) {
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
  return cv;
}

// A slab of ice, painted once: a pale block with bevelled edges, lit from the
// upper left, with a few facet lines and frost specks.
export function slabImage(w, h, seed) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  const r = seeded(seed);
  const cut = Math.min(3, Math.floor(Math.min(w, h) / 4)); // clipped corners
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.min(x, w - 1 - x);
      const cy = Math.min(y, h - 1 - y);
      if (cx + cy < cut) continue;
      const edge = cx + cy === cut || x === 0 || y === 0 || x === w - 1 || y === h - 1;
      let shade = 3;
      if (x + y < (w + h) * 0.3) shade = 4; // lit corner
      else if (x + y > (w + h) * 0.72) shade = 2; // shaded corner
      if (edge) shade = x + y < (w + h) / 2 ? 3 : 1;
      c.fillStyle = edge ? (x === w - 1 || y === h - 1 ? ICE_COLORS[0] : ICE_COLORS[shade]) : ICE_COLORS[shade];
      c.fillRect(x, y, 1, 1);
    }
  }
  // Facet lines and frost.
  c.fillStyle = ICE_COLORS[4];
  for (let i = 0; i < Math.max(1, Math.floor(w / 14)); i++) {
    const fx = 2 + Math.floor(r() * (w - 6));
    for (let k = 0; k < Math.min(h - 3, 6); k++) c.fillRect(fx + Math.floor(k / 2), 2 + k, 1, 1);
  }
  c.fillStyle = ICE_COLORS[2];
  for (let i = 0; i < (w * h) / 40; i++) c.fillRect(2 + Math.floor(r() * (w - 4)), 2 + Math.floor(r() * (h - 4)), 1, 1);
  return cv;
}

// Where a slab will crack: a few jagged lines spreading from a point, as a
// list of pixels in the order they appear (more show as the slab weakens).
function slabCracks(w, h, seed) {
  const r = seeded(seed * 7 + 3);
  const px = [];
  const ox = Math.floor(w * (0.3 + r() * 0.4));
  const oy = Math.floor(h * (0.3 + r() * 0.4));
  const arms = 3 + Math.floor(r() * 2);
  for (let a = 0; a < arms; a++) {
    let x = ox;
    let y = oy;
    const ang = (a / arms) * Math.PI * 2 + r() * 0.8;
    const len = Math.max(w, h) * (0.35 + r() * 0.3);
    for (let i = 0; i < len; i++) {
      x += Math.cos(ang) + (r() - 0.5) * 0.9;
      y += Math.sin(ang) + (r() - 0.5) * 0.9;
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix < 1 || iy < 1 || ix > w - 2 || iy > h - 2) break;
      px.push([ix, iy, i / len]);
    }
  }
  // Inner cracks first, then the outer reaches.
  return px.sort((p, q) => p[2] - q[2]);
}

export class Terrain {
  // floor: height of the floor strip in game pixels (0 = no ground).
  constructor(floor = 0) {
    this.floor = floor;
    this.spires = [];
    this.slabs = [];
    this.scroll = 0;
  }

  get floorY() {
    return VIEW_H - this.floor;
  }

  // Stand a spire on the floor just off the right edge. Returns it so a
  // turret can be mounted on top.
  addSpire(h, w = 12, seed = 1) {
    h = Math.min(h, MAX_SPIRE);
    const s = { x: VIEW_W + 4, w, h, top: this.floorY - h, img: spireImage(w, h, seed) };
    this.spires.push(s);
    return s;
  }

  // A slab of ice w x h. from: 'right' (drifts in from the right edge at
  // height y), or 'top' / 'bottom' (drifts in from that edge, at column x,
  // and settles at height y before drifting on). speed: how fast it drifts
  // left. Returns the slab, or null if it would wall off the way through
  // (the caller can try again later).
  addSlab({ w, h, y, x = VIEW_W + 4, from = 'right', speed = 22, seed = 1, wait = 0 }) {
    y = Math.max(HUD_H, Math.min(this.floorY - h, y));
    if (!this.canPlace({ x, w, y, h, from })) return null;
    const hp = Math.max(4, Math.min(14, Math.round(Math.sqrt(w * h) / 2.6)));
    const s = {
      x,
      y: from === 'top' ? HUD_H - h : from === 'bottom' ? VIEW_H : y,
      w,
      h,
      ty: y,
      from,
      wait, // (a slab coming from above or below waits off screen while its warning shows)
      vx: speed,
      hp,
      maxHp: hp,
      flash: 0,
      img: slabImage(w, h, seed),
      cracks: slabCracks(w, h, seed),
    };
    this.slabs.push(s);
    return s;
  }

  // Would a slab here (and everywhere it sweeps through on its way in)
  // still leave a way through? pieces: other slabs placed at the same time.
  canPlace(slab, pieces = []) {
    const { x, w } = slab;
    // Never on top of another slab (or where one is still drifting in)...
    const [y0, y1] = this.span(slab);
    for (const s of this.slabs) {
      const [a0, a1] = this.span(s);
      if (!s.dead && x < s.x + s.w + 3 && x + w > s.x - 3 && y0 < a1 + 2 && y1 > a0 - 2) return false;
    }
    // ...and always leaving a way through.
    return this.freeBand(x - SLAB_WINDOW, x + w + SLAB_WINDOW, [slab, ...pieces]) >= SLAB_GAP;
  }

  // The stretch of height a slab blocks: where it is, or, while it's still
  // waiting or drifting in from above or below, everything it will sweep
  // through on its way to where it settles.
  span(s) {
    const ty = s.ty ?? s.y; // where it settles (a planned slab is already there)
    const coming = s.ty === undefined || s.y !== s.ty;
    if (coming && s.from === 'top') return [HUD_H, ty + s.h];
    if (coming && s.from === 'bottom') return [ty, this.floorY];
    return [s.y, s.y + s.h];
  }

  // The tallest open stretch, top to bottom of the play area, across the
  // columns x0..x1 (counting `extra` slabs as if they were there too).
  freeBand(x0, x1, extra = []) {
    const spans = [];
    for (const s of [...this.slabs, ...extra]) {
      if (s.dead || s.x >= x1 || s.x + s.w <= x0) continue;
      spans.push(this.span(s));
    }
    for (const s of this.spires) if (s.x < x1 && s.x + s.w > x0) spans.push([s.top, this.floorY]);
    spans.sort((a, b) => a[0] - b[0]);
    let best = 0;
    let y = HUD_H;
    for (const [a, b] of spans) {
      best = Math.max(best, a - y);
      y = Math.max(y, b);
    }
    return Math.max(best, this.floorY - y);
  }

  update(dt) {
    this.scroll += GROUND_SPEED * dt;
    for (const s of this.spires) s.x -= GROUND_SPEED * dt;
    this.spires = this.spires.filter((s) => s.x > -s.w - 4);
    // Slabs drift left (settling into place first if they came from above or
    // below). A faster slab never closes the way through: if catching up with
    // a slower one would leave too little room between them, it slows to
    // match it instead.
    this.slabs.sort((a, b) => a.x - b.x);
    for (let i = 0; i < this.slabs.length; i++) {
      const s = this.slabs[i];
      s.flash = Math.max(0, s.flash - dt);
      // (While its warning shows, a slab due in from above or below drifts
      // along out of sight, so it comes in right where the warning was.)
      if (s.wait > 0) s.wait -= dt;
      else if (s.y !== s.ty) s.y = s.y < s.ty ? Math.min(s.ty, s.y + SLAB_DROP * dt) : Math.max(s.ty, s.y - SLAB_DROP * dt);
      for (let j = 0; j < i; j++) {
        const a = this.slabs[j];
        if (a.vx >= s.vx || s.x - (a.x + a.w) > SLAB_WINDOW + 2) continue;
        if (this.freeBand(a.x - SLAB_WINDOW, s.x + s.w + SLAB_WINDOW, [{ ...s, x: a.x }]) < SLAB_GAP) s.vx = a.vx;
        // (Ice never drifts through ice: one that would bump into a slower
        // slab at the same height slows down behind it.)
        const [s0, s1] = this.span(s);
        const [a0, a1] = this.span(a);
        if (s.x - (a.x + a.w) < 3 && s0 < a1 + 2 && s1 > a0 - 2) s.vx = a.vx;
      }
      s.x -= s.vx * dt;
    }
    this.slabs = this.slabs.filter((s) => !s.dead && s.x > -s.w - 4);
  }

  // The slab (if any) a rectangle touches. (A pixel inside the drawing's
  // edge, so grazing a corner isn't a crash.)
  slabAt(x, y, w, h) {
    for (const s of this.slabs) {
      if (!s.dead && x < s.x + s.w - 1 && x + w > s.x + 1 && y < s.y + s.h - 1 && y + h > s.y + 1) return s;
    }
    return null;
  }

  // Move a box of height h, at x..x+w, out of any slab: the nearest height
  // at or near y that's clear of every slab around it (by `clear` pixels).
  // (If there's no such height on screen, it stays where it is: see freeY.)
  clearOfIce(x, w, y, h, clear = 2) {
    return this.freeY(x, w, y, h, clear) ?? y;
  }

  // The nearest height to y where a box of height h fits at x..x+w, clear of
  // every slab by `clear` pixels; null if there's nowhere on screen.
  freeY(x, w, y, h, clear = 2) {
    const blocked = [];
    for (const s of this.slabs) {
      if (!s.dead && x < s.x + s.w && x + w > s.x) blocked.push([s.y - clear - h, s.y + s.h + clear]);
    }
    if (!blocked.length) return y;
    blocked.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const b of blocked) {
      const last = merged[merged.length - 1];
      if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]);
      else merged.push([...b]);
    }
    const lo = HUD_H + 1;
    const hi = this.floorY - h - 1;
    for (const [a, b] of merged) {
      if (y <= a || y >= b) continue;
      // Inside this blocked stretch: go to whichever free edge is nearer
      // (and on screen).
      const up = a >= lo ? a : null;
      const down = b <= hi ? b : null;
      if (up === null) return down;
      if (down === null) return up;
      return y - up <= down - y ? up : down;
    }
    return y;
  }

  // Does a rectangle touch solid rock? Spires use a slightly smaller box
  // than their drawing (the tapered top and ragged edges don't count), so
  // near-misses really are misses.
  hits(x, y, w, h) {
    for (const s of this.spires) {
      if (x < s.x + s.w - 2 && x + w > s.x + 2 && y + h > s.top + 3 && y < this.floorY) return s;
    }
    return this.slabAt(x, y, w, h);
  }

  // The top of the ground under a strip from x to x + w: the floor, or the
  // top of the tallest spire there. (Flying enemies lift over spires;
  // dropped items float above them.)
  groundTop(x, w) {
    let top = this.floorY;
    for (const s of this.spires) {
      if (x < s.x + s.w - 2 && x + w > s.x + 2) top = Math.min(top, s.top);
    }
    return top;
  }

  // How much open ground there is at the right edge of the screen: the gap
  // between the newest spire and the edge (negative while one is still
  // coming in; Infinity with no spires at all).
  openAtEdge() {
    let right = -Infinity;
    for (const s of this.spires) right = Math.max(right, s.x + s.w);
    return VIEW_W - right;
  }

  // The tallest spire on screen right now (0 if none).
  tallestOnScreen() {
    let h = 0;
    for (const s of this.spires) if (s.x < VIEW_W && s.x + s.w > 0) h = Math.max(h, s.h);
    return h;
  }

  // How tall a spire (or mound) carrying a turret must be so that no spire
  // on screen can stand between your ship and the turret: at least as tall
  // as every one of them. (They're all to its left, as it's the newest.)
  turretPerch(h) {
    for (const s of this.spires) if (s.x + s.w > 0) h = Math.max(h, s.h);
    return Math.min(h, MAX_SPIRE);
  }

  // Does a shot (or anything small) touch rock: a spire or the floor?
  // Levels without ground have no floor, so nothing stops at the bottom edge.
  solid(x, y, w, h) {
    return !!this.hits(x, y, w, h) || (this.floor > 0 && y + h > this.floorY);
  }

  draw(ctx, snap) {
    for (const s of this.slabs) {
      const x = snap(s.x);
      const y = snap(s.y);
      ctx.drawImage(s.img, x, y);
      // Cracks spread as it weakens; it flashes pale for a moment when hit.
      const shown = Math.floor(s.cracks.length * (1 - s.hp / s.maxHp));
      ctx.fillStyle = s.flash > 0 ? ICE_COLORS[4] : ICE_COLORS[0];
      for (let i = 0; i < shown; i++) ctx.fillRect(x + s.cracks[i][0], y + s.cracks[i][1], 1, 1);
    }
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

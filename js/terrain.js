import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.27.0';
import { seeded } from './util.js?v=0.27.0';
import { DETAIL, FINE, detailCanvas, pixels, grit } from './detail.js?v=0.27.0';

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
const SLAB_GAP = 30;
const SLAB_WINDOW = 44;
const SLAB_DROP = 32; // how fast a slab drifting in from above or below moves into place
export const ICE_COLORS = ['#2a3a58', '#4d6890', '#7f9cc0', '#b8cde3', '#e6eef7'];

const FLOOR_COLORS = ['#3a2224', '#57302a', '#7a4632', '#9a6a4a'];
const SPIRE_COLORS = ['#2e1c1f', '#4a2a27', '#6b3d2e', '#8c5a3e', '#a8785a'];

// A spire is a tapering column of layered rock, painted once when it's made
// (each spire keeps its own picture; nothing is kept after it scrolls away).
// Double detail (v0.22.0): painted in half-pixel steps with the same shape
// as before, plus thin dark strata lines, a lit left edge and grit.
export function spireImage(w, h, seed) {
  const { canvas } = detailCanvas(w, h);
  const px = pixels(canvas);
  const r = seeded(seed);
  const rows = [];
  for (let y = 0; y < h; y++) {
    // Narrow at the top, widest at the base, with a slightly ragged edge.
    const k = y / h;
    rows.push(Math.max(1.5, (w / 2) * (0.45 + 0.55 * Math.sqrt(k))) + (r() - 0.5) * 1.2);
  }
  const bands = [];
  for (let y = 0; y < h; y++) bands.push(Math.floor((y + Math.floor(r() * 2)) / 4) % 3); // rock strata
  for (let fy = 0; fy < h * DETAIL; fy++) {
    const y = Math.floor(fy / DETAIL);
    // The edge runs smoothly from one row's width to the next.
    const t = (fy % DETAIL) / DETAIL;
    const half = rows[y] * (1 - t) + rows[Math.min(h - 1, y + 1)] * t;
    const band = bands[y];
    for (let fx = 0; fx < w * DETAIL; fx++) {
      const dx = (fx + 0.5) / DETAIL - w / 2;
      if (Math.abs(dx) > half) continue;
      const edge = Math.abs(dx) > half - 0.5 || fy === 0;
      let shade = dx < -half * 0.3 ? 3 : dx < half * 0.35 ? 2 : 1;
      if (band === 1) shade = Math.max(1, shade - 1);
      if (y < 2) shade = Math.min(4, shade + 1);
      if (!edge && dx < 0 && Math.abs(dx) > half - 1) shade = Math.min(4, shade + 1); // lit left edge
      if (fy % (4 * DETAIL) === 0 && fy > 0) shade = Math.max(1, shade - 1); // a thin dark stratum line
      const g = grit(fx, fy, seed);
      if (g < 0.05) shade = Math.max(1, shade - 1);
      else if (g > 0.97) shade = Math.min(4, shade + 1);
      px.set(fx, fy, edge ? SPIRE_COLORS[0] : SPIRE_COLORS[shade]);
    }
  }
  px.done();
  return canvas;
}

// The canyon floor: layered ground with pebbles, a pattern that repeats
// every 16 pixels, painted once at double detail as one strip a screen and
// a tile wide (drawn in one piece, so no seams show between tiles).
const FLOOR_TILE = 16;
const floorTiles = new Map();
export function floorTile(h) {
  if (floorTiles.has(h)) return floorTiles.get(h);
  const { canvas, ctx: c } = detailCanvas(VIEW_W + FLOOR_TILE * 2, h);
  for (let x0 = 0; x0 < VIEW_W + FLOOR_TILE * 2; x0 += FLOOR_TILE) {
    c.save();
    c.translate(x0, 0);
    paintFloorTile(c, h);
    c.restore();
  }
  floorTiles.set(h, canvas);
  return canvas;
}
function paintFloorTile(c, h) {
  c.fillStyle = FLOOR_COLORS[0];
  c.fillRect(0, 0, 16, h);
  c.fillStyle = FLOOR_COLORS[2];
  c.fillRect(0, 0, 16, 1);
  c.fillStyle = FLOOR_COLORS[3];
  c.fillRect(0, 0, 16, 0.5); // the lit lip of the ground
  c.fillStyle = FLOOR_COLORS[1];
  c.fillRect(0, 1, 16, 2);
  // Pebbles (lit on top) and layers of grit.
  const pebble = (x, y, w) => {
    c.fillStyle = FLOOR_COLORS[0];
    c.fillRect(x - 0.5, y + 0.5, w + 1, 1);
    c.fillStyle = FLOOR_COLORS[2];
    c.fillRect(x, y, w, 1);
    c.fillStyle = FLOOR_COLORS[3];
    c.fillRect(x, y, w, 0.5);
  };
  c.fillStyle = FLOOR_COLORS[1];
  c.fillRect(3, 5, 5, 0.5);
  c.fillRect(10, 9, 4, 0.5);
  c.fillRect(1.5, 12.5, 4, 0.5);
  pebble(6, 3, 2);
  pebble(13, 7, 1);
  pebble(1, 10.5, 2.5);
  c.fillStyle = FLOOR_COLORS[3];
  c.fillRect(9.5, 5.5, 0.5, 0.5);
  c.fillRect(4.5, 8, 0.5, 0.5);
  c.fillRect(12, 11.5, 0.5, 0.5);
}

// A slab of ice, painted once at double detail: a pale block with clipped
// corners, a deep blue rim (so it shows against anything), a lit bevel on
// the upper left, a few facet lines and frost specks.
export function slabImage(w, h, seed) {
  const { canvas } = detailCanvas(w, h);
  const px = pixels(canvas);
  const r = seeded(seed);
  const cut = Math.min(3, Math.floor(Math.min(w, h) / 4)); // clipped corners
  const inside = (X, Y) => X > 0 && Y > 0 && X < w && Y < h && Math.min(X, w - X) + Math.min(Y, h - Y) >= cut + 1;
  // Facet lines: short diagonals running down to the right.
  const facets = [];
  for (let i = 0; i < Math.max(1, Math.floor(w / 12)); i++) {
    facets.push({ x: 2 + r() * (w - 6), y: 1.5 + r() * Math.max(0, h / 3 - 1.5), len: Math.min(h - 3, 4 + r() * 5) });
  }
  const W2 = w * DETAIL;
  const H2 = h * DETAIL;
  // (The shape tested once at each half pixel; edges read from that.)
  const mask = new Uint8Array(W2 * H2);
  for (let fy = 0; fy < H2; fy++) {
    for (let fx = 0; fx < W2; fx++) if (inside((fx + 0.5) / DETAIL, (fy + 0.5) / DETAIL)) mask[fy * W2 + fx] = 1;
  }
  const m = (fx, fy) => fx >= 0 && fy >= 0 && fx < W2 && fy < H2 && mask[fy * W2 + fx] === 1;
  for (let fy = 0; fy < H2; fy++) {
    for (let fx = 0; fx < W2; fx++) {
      if (!m(fx, fy)) continue;
      const X = (fx + 0.5) / DETAIL;
      const Y = (fy + 0.5) / DETAIL;
      const lower = X + Y > (w + h) / 2; // the lower-right half of the block
      let c;
      if (!m(fx + 1, fy) || !m(fx, fy + 1)) c = 0; // dark rim, lower right
      else if (!m(fx - 1, fy) || !m(fx, fy - 1)) c = 1; // deep blue rim, upper left
      else if (!m(fx - 2, fy) || !m(fx, fy - 2)) c = lower ? 2 : 4; // the bevel
      else if (!m(fx + 2, fy) || !m(fx, fy + 2)) c = 1;
      else {
        c = X + Y < (w + h) * 0.3 ? 4 : X + Y > (w + h) * 0.72 ? 2 : 3;
        for (const f of facets) {
          const t = Y - f.y;
          if (t < 0 || t > f.len) continue;
          const d = X - (f.x + t / 2);
          if (d >= 0 && d < FINE) c = 4;
          else if (d >= FINE && d < FINE * 2) c = 2;
        }
        const g = grit(fx, fy, seed);
        if (g < 0.025) c = 2;
        else if (g > 0.99) c = 4;
      }
      px.set(fx, fy, ICE_COLORS[c]);
    }
  }
  px.done();
  return canvas;
}

// Where a slab will crack: a few jagged lines spreading from a point, as a
// list of half pixels in the order they appear (more show as the slab
// weakens).
function slabCracks(w, h, seed) {
  const r = seeded(seed * 7 + 3);
  const px = [];
  const W2 = w * DETAIL;
  const H2 = h * DETAIL;
  const ox = Math.floor(W2 * (0.3 + r() * 0.4));
  const oy = Math.floor(H2 * (0.3 + r() * 0.4));
  const arms = 3 + Math.floor(r() * 2);
  for (let a = 0; a < arms; a++) {
    let x = ox;
    let y = oy;
    const ang = (a / arms) * Math.PI * 2 + r() * 0.8;
    const len = Math.max(W2, H2) * (0.35 + r() * 0.3);
    for (let i = 0; i < len; i++) {
      x += Math.cos(ang) + (r() - 0.5) * 0.9;
      y += Math.sin(ang) + (r() - 0.5) * 0.9;
      const ix = Math.round(x);
      const iy = Math.round(y);
      if (ix < 2 || iy < 2 || ix > W2 - 3 || iy > H2 - 3) break;
      px.push([ix, iy, i / len]);
    }
  }
  // Inner cracks first, then the outer reaches.
  return px.sort((p, q) => p[2] - q[2]);
}

// The cracks showing on a slab right now, kept as a picture and repainted
// only when they change (when it's hit), not drawn dot by dot every frame.
function slabCrackImage(s, shown) {
  const flash = s.flash > 0;
  const key = shown * 2 + (flash ? 1 : 0);
  if (s.crackKey === key) return s.crackImg;
  if (!s.crackImg) s.crackImg = detailCanvas(s.w, s.h);
  const px = pixels(s.crackImg.canvas); // (starts blank: the old cracks go)
  const W2 = s.w * DETAIL;
  const on = new Set();
  for (let i = 0; i < shown; i++) on.add(s.cracks[i][1] * W2 + s.cracks[i][0]);
  // (Never out past the clipped corners or onto the rim.)
  const cut = Math.min(3, Math.floor(Math.min(s.w, s.h) / 4));
  const inIce = (fx, fy) => {
    const X = (fx + 0.5) / DETAIL;
    const Y = (fy + 0.5) / DETAIL;
    return Math.min(X, s.w - X) + Math.min(Y, s.h - Y) >= cut + 2;
  };
  for (let i = 0; i < shown; i++) {
    const [fx, fy] = s.cracks[i];
    if (!inIce(fx, fy)) continue;
    px.set(fx, fy, flash ? ICE_COLORS[4] : ICE_COLORS[0]);
    // A pale lip along each crack, so it reads as a split in the ice.
    if (!flash && !on.has((fy + 1) * W2 + fx + 1)) px.set(fx + 1, fy + 1, ICE_COLORS[4]);
  }
  px.done();
  s.crackKey = key;
  return s.crackImg;
}

export class Terrain {
  // floor: height of the floor strip in game pixels (0 = no ground).
  constructor(floor = 0) {
    this.floor = floor;
    this.spires = [];
    this.slabs = [];
    this.scroll = 0;
  }

  // Paint a slab nobody sees, as an icy level starts: the first slabs
  // painted take several times longer than later ones (the browser is
  // still getting the painting code up to speed), and that's best done
  // before play begins.
  warmUp() {
    for (let i = 0; i < 6; i++) slabImage(44, 44, i);
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
      seed,
      img: null, // (painted soon, at most one slab a frame: see update)
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
    // Paint at most one new slab of ice a step, rather than every slab of
    // a wall in the same frame (painting one takes a few milliseconds on a
    // phone). They come in from off screen, so they're ready in time.
    const unpainted = this.slabs.find((s) => !s.img);
    if (unpainted) unpainted.img = slabImage(unpainted.w, unpainted.h, unpainted.seed);
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
      if (!s.img) s.img = slabImage(s.w, s.h, s.seed); // (not painted yet: now)
      ctx.drawImage(s.img, x, y);
      // Cracks spread as it weakens; it flashes pale for a moment when hit.
      const shown = Math.floor(s.cracks.length * (1 - s.hp / s.maxHp));
      if (shown > 0) ctx.drawImage(slabCrackImage(s, shown).canvas, x, y);
    }
    if (!this.floor) return;
    for (const s of this.spires) ctx.drawImage(s.img, snap(s.x), snap(s.top));
    // The floor: a strip of layered ground with pebbles, scrolling along
    // (a tile painted once, repeated).
    const y0 = this.floorY;
    // (Snapped like the spires, so they don't slide about on it.)
    const off = snap(this.scroll % FLOOR_TILE);
    ctx.drawImage(floorTile(this.floor), -off, y0);
  }
}

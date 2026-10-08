import { PAL } from './config.js?v=0.19.0';
import { seeded } from './util.js?v=0.19.0';

// THE GLACIER WARDEN, painted by code (the owner's chosen "Saw Crown"
// design): the Ice Harvesters' flagship. A giant saw ring spins round a hub
// where six wedge-shaped plates of ice cover its furnace core; an engine
// body with two swept fins sits behind the ring, in hazard paint.
//
// The body and fins are painted once for each of 3 damage stages; the ring
// is painted in a few rotation frames so it can spin; each ice plate has its
// own pictures (whole, cracked, badly cracked, refreezing, hit-flash); the
// core is drawn fresh every frame (it glows).
//
// Layout inside the boss's box (80 x 68 game pixels): the ring's centre at
// HUB, the hub (plates over the core) out to radius 17, the ring out to the
// tips of its teeth (radius 31); the body and fins to the right of it.

export const WARDEN_W = 80;
export const WARDEN_H = 68;
export const HUB = { x: 32, y: 34 }; // the ring's centre and the core
export const CORE_R = 8; // the core's housing (the weak point)
const HUB_R = 17;
const PLATE_R = 16;
const RING_IN = 20;
const RING_OUT = 27;
const TOOTH_R = 31;
export const TEETH = 18;
export const RING_FRAMES = 6; // rotation frames between one tooth and the next
export const PLATE_HP = 10; // hits to break one plate of ice
export const PLATES = 6;
// Where things come out of it (inside its box).
export const NOSE = { x: HUB.x - HUB_R, y: HUB.y }; // the hub's front edge
export const ENGINES = [{ x: 79, y: 29 }, { x: 79, y: 39 }];
export const FIN_TIPS = [{ x: 68, y: 4 }, { x: 68, y: 64 }];

const C = {
  k: PAL.ink, a: PAL.amber, A: PAL.amberSoft, o: PAL.amberDark, l: PAL.amberLight, c: PAL.cream,
  s: PAL.redSoft, r: PAL.red, R: PAL.redDark, g: PAL.grey, n: '#46444d', h: '#a7a4ad',
  i: '#e6eef7', j: '#b8cde3', m: '#7f9cc0', q: '#4d6890', d: '#2a3a58',
};
const HOLE = ['#140e10', '#b5562a', '#d9813f'];

// ---------------------------------------------------------------- painting
// A grid of colours with a "shape" brush: a filled shape with a border, a
// light top-left edge and a dark bottom-right edge (like the rest of the
// game's pixel art). Coordinates are inside the boss's box.
function grid() {
  const px = Array.from({ length: WARDEN_H }, () => Array(WARDEN_W).fill(null));
  const g = {
    px,
    set(x, y, col) {
      if (x >= 0 && y >= 0 && x < WARDEN_W && y < WARDEN_H) px[y][x] = col;
    },
    get(x, y) {
      return x >= 0 && y >= 0 && x < WARDEN_W && y < WARDEN_H ? px[y][x] : null;
    },
    shape(inside, { fill, border = C.k, hi, shade, shadeW = 1, pattern }) {
      for (let y = 0; y < WARDEN_H; y++) {
        for (let x = 0; x < WARDEN_W; x++) {
          if (!inside(x, y)) continue;
          let col = (pattern && pattern(x, y)) || fill;
          if (shade) for (let d = 1; d <= shadeW; d++) if (!inside(x + d, y + d) || !inside(x, y + d)) col = shade;
          if (hi && (!inside(x - 1, y - 1) || !inside(x, y - 1))) col = hi;
          if (border && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) col = border;
          g.set(x, y, col);
        }
      }
    },
    // An ink outline round everything painted so far.
    outline() {
      const add = [];
      for (let y = 0; y < WARDEN_H; y++) {
        for (let x = 0; x < WARDEN_W; x++) {
          if (!px[y][x] && (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1))) add.push([x, y]);
        }
      }
      for (const [x, y] of add) px[y][x] = C.k;
    },
  };
  return g;
}

function toCanvas(g, flash = false) {
  const c = document.createElement('canvas');
  c.width = WARDEN_W;
  c.height = WARDEN_H;
  const ctx = c.getContext('2d');
  for (let y = 0; y < WARDEN_H; y++) {
    for (let x = 0; x < WARDEN_W; x++) {
      const col = g.px[y][x];
      if (!col) continue;
      ctx.fillStyle = flash ? (col === C.k ? C.k : PAL.cream) : col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

const poly = (pts) => (x, y) => {
  const X = x + 0.5;
  const Y = y + 0.5;
  let inn = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > Y !== yj > Y && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inn = !inn;
  }
  return inn;
};
const rect = (x0, y0, w, h) => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
const dist = (x, y) => Math.hypot(x + 0.5 - HUB.x, y + 0.5 - HUB.y);
// Angle round the hub, 0 = right, growing clockwise (screen y points down).
const angle = (x, y) => {
  const a = Math.atan2(y + 0.5 - HUB.y, x + 0.5 - HUB.x);
  return a < 0 ? a + Math.PI * 2 : a;
};
const hazard = (x, y) => (((x + y) >> 1) % 2 ? C.a : C.k);
const hull = { fill: C.g, hi: C.h, shade: C.n, shadeW: 2 };
const dark = { fill: C.n, hi: C.g, shade: C.k };
const ice = { fill: C.j, border: C.q, hi: C.i, shade: C.m, shadeW: 2 };
const ice2 = { fill: C.m, border: C.q, hi: C.j, shade: C.q };

// The engine body, the two swept fins and the engines, behind the ring.
// stage 1: clean; 2: the fins' ice tips have broken off, scorch marks;
// 3: holes blown in it, glowing.
const BODY = [[41, 23], [71, 19], [77, 27], [77, 41], [71, 49], [41, 45]];
const FIN_TOP = [[53, 19], [67, 3], [73, 5], [65, 20]];
const FIN_LOW = [[53, 49], [67, 65], [73, 63], [65, 48]];
const TIP_TOP = [[61, 4], [71, 3], [69, 10], [63, 11]];
const TIP_LOW = [[61, 64], [71, 65], [69, 58], [63, 57]];
// Where the scorch marks and burning holes go (stage 3 fire comes out here).
export const HOLES = [[52, 36], [64, 26], [70, 42], [58, 21]];
function paintBody(stage) {
  const g = grid();
  g.shape(poly(FIN_TOP), dark);
  g.shape(poly(FIN_LOW), dark);
  if (stage === 1) {
    g.shape(poly(TIP_TOP), ice);
    g.shape(poly(TIP_LOW), ice);
  }
  g.shape(poly(BODY), hull);
  g.shape(rect(49, 27, 22, 4), { fill: C.a, pattern: hazard });
  g.shape(rect(49, 37, 22, 4), { fill: C.a, pattern: hazard });
  for (const [ex, ey] of [[77, 29], [77, 39]]) {
    g.shape(rect(ex, ey - 2, 3, 5), { fill: C.n, hi: C.g, shade: C.k });
  }
  const rnd = seeded(41 + stage);
  if (stage >= 2) {
    // Scorch marks.
    for (const [hx, hy] of HOLES.slice(0, stage === 2 ? 2 : 4)) {
      for (let i = 0; i < 9; i++) {
        const x = hx + Math.round((rnd() - 0.5) * 6);
        const y = hy + Math.round((rnd() - 0.5) * 4);
        if (g.get(x, y) && g.get(x, y) !== C.k) g.set(x, y, i % 3 ? C.n : C.k);
      }
    }
  }
  if (stage === 3) {
    // Holes blown in the hull, glowing inside.
    for (const [hx, hy] of HOLES.slice(0, 3)) {
      g.shape((x, y) => Math.hypot(x + 0.5 - hx, y + 0.5 - hy) < 2.6, { fill: HOLE[1], border: HOLE[0] });
      g.set(hx, hy, HOLE[2]);
    }
  }
  g.outline();
  return g;
}

// The saw ring at one rotation (ph radians): 18 teeth leaning the way it
// spins, a steel band and a hazard-striped inner rim, all turning together.
function paintRing(ph) {
  const g = grid();
  for (let t = 0; t < TEETH; t++) {
    const a = (t / TEETH) * Math.PI * 2 + ph;
    const tip = [HUB.x + Math.cos(a) * TOOTH_R, HUB.y + Math.sin(a) * TOOTH_R];
    const b1 = [HUB.x + Math.cos(a - 0.17) * (RING_OUT - 1), HUB.y + Math.sin(a - 0.17) * (RING_OUT - 1)];
    const b2 = [HUB.x + Math.cos(a + 0.12) * (RING_OUT - 1), HUB.y + Math.sin(a + 0.12) * (RING_OUT - 1)];
    g.shape(poly([tip, b1, b2]), { fill: C.h, hi: C.c });
  }
  const seg = (Math.PI * 2) / TEETH;
  g.shape((x, y) => dist(x, y) >= RING_IN && dist(x, y) <= RING_OUT, {
    fill: C.h, hi: C.c, shade: C.g,
    pattern: (x, y) => ((((angle(x, y) - ph) / seg) % 1) + 1) % 1 < 0.5 ? C.g : null,
  });
  g.shape((x, y) => dist(x, y) >= HUB_R && dist(x, y) < RING_IN + 0.5, {
    fill: C.a,
    pattern: (x, y) => (Math.floor((((angle(x, y) - ph) / (seg / 2)) % (TEETH * 2) + TEETH * 2) % (TEETH * 2)) % 2 ? C.k : C.a),
  });
  g.outline();
  return g;
}

// The hub: a dark socket under the plates (what you see where a plate has
// broken off), with a rim.
function paintHub() {
  const g = grid();
  g.shape((x, y) => dist(x, y) < HUB_R, { fill: C.n, border: C.k, shade: C.k });
  for (let r = 10; r < HUB_R - 1; r += 3) {
    g.shape((x, y) => Math.abs(dist(x, y) - r) < 0.5, { fill: '#3a3940', border: null });
  }
  return g;
}

// Plate k covers the wedge from angle k*60 to (k+1)*60 degrees (0 = right,
// clockwise), from the centre out to the rim. 2 is lower-left, 3 is
// upper-left: the two facing you.
const GAP = 0.06; // a thin seam between neighbouring plates
function inPlate(k, x, y) {
  const d = dist(x, y);
  if (d > PLATE_R) return false;
  const a = angle(x, y);
  const a0 = (k * Math.PI) / 3;
  const a1 = ((k + 1) * Math.PI) / 3;
  const seam = d < CORE_R + 1.5 ? 0 : GAP; // (no seam over the core: it never glows through)
  return a >= a0 + seam && a < a1 - seam;
}
// Cracks on a plate: jagged lines from near the centre outwards; `level`
// 1 or 2 (more cracks as it's hit).
function crackPixels(k, level) {
  const rnd = seeded(97 + k * 13);
  const out = [];
  const mid = ((k + 0.5) * Math.PI) / 3;
  for (let n = 0; n < level; n++) {
    let a = mid + (n ? 0.35 : -0.2) + (rnd() - 0.5) * 0.3;
    let r = 4 + n * 2;
    while (r < PLATE_R - 1) {
      out.push([Math.round(HUB.x - 0.5 + Math.cos(a) * r), Math.round(HUB.y - 0.5 + Math.sin(a) * r)]);
      r += 1;
      a += (rnd() - 0.5) * 0.25;
    }
  }
  return out;
}
// A cheap fixed "random" per pixel, for the ragged edge of the frost.
const speckle = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 100 / 100;
// A plate freezing back over: frost creeps in from the rim towards the
// centre, with a ragged edge.
const frosted = (x, y, grow) => dist(x, y) + speckle(x, y) * 2.5 >= PLATE_R * (1 - grow) + 1;
function paintPlate(k, { cracks = 0, grow = 1 } = {}) {
  const g = grid();
  const look = k % 2 ? ice2 : ice;
  g.shape((x, y) => inPlate(k, x, y) && (grow >= 1 || frosted(x, y, grow)), {
    ...look,
    // While it refreezes it's all thin frost, no shading.
    ...(grow < 1 ? { fill: C.j, hi: C.i, shade: null, border: null } : {}),
  });
  if (cracks) for (const [x, y] of crackPixels(k, cracks)) if (g.get(x, y)) g.set(x, y, C.q);
  return g;
}

export const WARDEN = {};
export function buildWardenArt() {
  if (WARDEN.bodies) return WARDEN;
  WARDEN.bodies = [1, 2, 3].map((s) => toCanvas(paintBody(s)));
  WARDEN.bodyFlash = toCanvas(paintBody(1), true);
  WARDEN.ring = [];
  for (let f = 0; f < RING_FRAMES; f++) WARDEN.ring.push(toCanvas(paintRing((f / RING_FRAMES) * ((Math.PI * 2) / TEETH))));
  WARDEN.ringFlash = toCanvas(paintRing(0), true);
  WARDEN.hub = toCanvas(paintHub());
  WARDEN.plates = [];
  for (let k = 0; k < PLATES; k++) {
    WARDEN.plates.push({
      looks: [0, 1, 2].map((c) => toCanvas(paintPlate(k, { cracks: c }))),
      grow: [0.25, 0.5, 0.75].map((gr) => toCanvas(paintPlate(k, { grow: gr }))),
      flash: toCanvas(paintPlate(k), true),
    });
  }
  return WARDEN;
}

// ---------------------------------------------------------------- what's where
// What is at each pixel of the boss's box? 0 = nothing, RING (the saw
// ring: your shots fly through its open spokes, but your ship gets cut on
// it), ARMOUR (hub rim, body, fins), CORE, or PLATE + k for plate k (which
// counts only while that plate is there: a broken plate leaves a hole).
export const RING = 4;
export const ARMOUR = 1;
export const CORE = 2;
export const PLATE = 5;
const MAP = new Uint8Array(WARDEN_W * WARDEN_H);
const PLATE_AT = new Int8Array(WARDEN_W * WARDEN_H).fill(-1);
(() => {
  const inBody = [poly(BODY), poly(FIN_TOP), poly(FIN_LOW)];
  for (let y = 0; y < WARDEN_H; y++) {
    for (let x = 0; x < WARDEN_W; x++) {
      const i = y * WARDEN_W + x;
      const d = dist(x, y);
      // (The thin seams between plates count as plate too, so no shot can
      // slip through a seam to the core.)
      if (d <= PLATE_R + 0.5) PLATE_AT[i] = Math.floor(angle(x, y) / (Math.PI / 3)) % PLATES;
      if (d <= CORE_R) MAP[i] = CORE;
      else if (d <= PLATE_R + 0.5) MAP[i] = ARMOUR; // the hub's socket (under the plates)
      else if (d < TOOTH_R - 1.5) MAP[i] = RING; // the hub's rim and the saw ring
      else if (inBody.some((f) => f(x, y))) MAP[i] = ARMOUR;
    }
  }
})();
// What's at (x, y) inside the box, given which plates are still there.
export function wardenAt(x, y, plateThere) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= WARDEN_W || y >= WARDEN_H) return 0;
  const i = y * WARDEN_W + x;
  const k = PLATE_AT[i];
  if (k >= 0 && plateThere(k)) return PLATE + k;
  if (MAP[i] === ARMOUR && dist(x, y) <= PLATE_R + 0.5) return 0; // a hole where a plate was
  return MAP[i];
}

// The furnace core: a warm glow in a dark housing (pulsing; pale when hit).
export function drawWardenCore(ctx, cx, cy, t, hit) {
  const pulse = (Math.sin(t * 8) + 1) / 2;
  for (let y = -CORE_R; y <= CORE_R; y++) {
    for (let x = -CORE_R; x <= CORE_R; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      if (d > CORE_R + 0.3) continue;
      let col;
      if (d > 6.6) col = d > 7.6 ? C.k : C.n;
      else if (hit) col = PAL.cream;
      else if (d < 1.8) col = C.c;
      else if (d < 3.6) col = pulse > 0.5 ? C.l : C.a;
      else col = d < 5.2 ? C.s : C.R;
      ctx.fillStyle = col;
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}

// Where the saw teeth tips are at a ring angle (for their warning glint).
export function toothTips(ph) {
  const out = [];
  for (let t = 0; t < TEETH; t++) {
    const a = (t / TEETH) * Math.PI * 2 + ph;
    out.push({ x: HUB.x + Math.cos(a) * (TOOTH_R - 1), y: HUB.y + Math.sin(a) * (TOOTH_R - 1) });
  }
  return out;
}

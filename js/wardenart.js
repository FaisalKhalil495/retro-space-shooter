import { PAL } from './config.js?v=0.27.0';
import { DETAIL, FINE, detailCanvas, pixels, rgba, grit } from './detail.js?v=0.27.0';

// THE GLACIER WARDEN, painted by code (the owner's chosen "Saw Crown"
// design): the Ice Harvesters' flagship. A giant saw ring spins round a hub
// where six wedge-shaped plates of ice cover its furnace core; an engine
// body with two swept fins sits behind the ring, in hazard paint.
//
// The body and fins are painted once for each of 3 damage stages; the ring
// is painted in a few rotation frames so it can spin; the core in its three
// looks (dim, bright, hit). The six ice plates (whole, cracked, badly
// cracked, refreezing, hit-flash) turn, so they're painted fresh every frame
// into one small picture.
//
// Double detail (v0.23.0): everything is painted in half-pixel steps, with
// the same shapes as before (so what your shots hit hasn't moved), plus
// finer edges, panel seams, rivets, bolts on the ring and glints in the ice.
//
// Layout inside the boss's box (80 x 68 game pixels): the ring's centre at
// HUB, the hub (plates over the core) out to radius 17, the ring out to the
// tips of its teeth (radius 31); the body and fins to the right of it.

export const WARDEN_W = 80;
export const WARDEN_H = 68;
export const HUB = { x: 32, y: 34 }; // the ring's centre and the core
const CORE_R = 8; // the core's housing (the weak point)
const HUB_R = 17;
const PLATE_R = 16;
const RING_IN = 20;
const RING_OUT = 27;
const TOOTH_R = 31;
export const TEETH = 18;
export const RING_FRAMES = 6; // rotation frames between one tooth and the next
export const PLATE_HP = 6; // hits to break one plate of ice
export const PLATES = 6;
// Where things come out of it (inside its box).
export const NOSE = { x: HUB.x - HUB_R, y: HUB.y }; // the hub's front edge

const C = {
  k: PAL.ink, a: PAL.amber, A: PAL.amberSoft, o: PAL.amberDark, l: PAL.amberLight, c: PAL.cream,
  s: PAL.redSoft, r: PAL.red, R: PAL.redDark, g: PAL.grey, n: '#46444d', h: '#a7a4ad', G: '#8c8992',
  i: '#e6eef7', j: '#b8cde3', m: '#7f9cc0', q: '#4d6890', d: '#2a3a58', y: '#f6dcae',
};
const HOLE = ['#140e10', '#b5562a', '#d9813f', '#4a2a22'];

// ---------------------------------------------------------------- painting
// A grid of colours, one cell per half pixel, with a "shape" brush: a
// filled shape with a border, a light top-left edge and a dark bottom-right
// edge (like the rest of the game's pixel art). Shapes are tested at each
// half pixel's centre (X, Y) in game pixels inside the boss's box, so they
// keep exactly the size and place they had before double detail.
const W2 = WARDEN_W * DETAIL;
const H2 = WARDEN_H * DETAIL;
const at = (f) => (f + 0.5) / DETAIL; // a half pixel's centre, in game pixels
function grid() {
  const px = Array.from({ length: H2 }, () => Array(W2).fill(null));
  const g = {
    px,
    set(fx, fy, col) {
      if (fx >= 0 && fy >= 0 && fx < W2 && fy < H2) px[fy][fx] = col;
    },
    get(fx, fy) {
      return fx >= 0 && fy >= 0 && fx < W2 && fy < H2 ? px[fy][fx] : null;
    },
    // box: [x0, y0, x1, y1] in game pixels, somewhere the shape lies wholly
    // inside (only that part of the picture is tested: much faster).
    shape(inside, { fill, border = C.k, hi, shade, shadeW = 1, pattern }, box = [0, 0, WARDEN_W, WARDEN_H]) {
      // Test the shape once at each half pixel in its box, then read the
      // edges from that (rather than testing the shape again for each edge).
      const fx0 = Math.max(0, Math.floor(box[0] * DETAIL) - 1);
      const fy0 = Math.max(0, Math.floor(box[1] * DETAIL) - 1);
      const fx1 = Math.min(W2, Math.ceil(box[2] * DETAIL) + 1);
      const fy1 = Math.min(H2, Math.ceil(box[3] * DETAIL) + 1);
      const mw = fx1 - fx0;
      const mask = new Uint8Array(mw * (fy1 - fy0));
      for (let fy = fy0; fy < fy1; fy++) {
        for (let fx = fx0; fx < fx1; fx++) if (inside(at(fx), at(fy))) mask[(fy - fy0) * mw + fx - fx0] = 1;
      }
      const m = (fx, fy) => fx >= fx0 && fy >= fy0 && fx < fx1 && fy < fy1 && mask[(fy - fy0) * mw + fx - fx0] === 1;
      const sw = Math.round(shadeW * DETAIL);
      for (let fy = fy0; fy < fy1; fy++) {
        for (let fx = fx0; fx < fx1; fx++) {
          if (!m(fx, fy)) continue;
          let col = (pattern && pattern(at(fx), at(fy), fx, fy)) || fill;
          if (shade) {
            for (let d = 1; d <= sw; d++) if (!m(fx + d, fy + d) || !m(fx, fy + d)) col = shade;
          }
          if (hi && (!m(fx - 1, fy - 1) || !m(fx, fy - 1))) col = hi;
          if (border && (!m(fx - 1, fy) || !m(fx + 1, fy) || !m(fx, fy - 1) || !m(fx, fy + 1))) col = border;
          g.set(fx, fy, col);
        }
      }
    },
    // An ink outline (one half pixel) round everything painted so far.
    outline() {
      const add = [];
      for (let fy = 0; fy < H2; fy++) {
        for (let fx = 0; fx < W2; fx++) {
          if (!px[fy][fx] && (g.get(fx - 1, fy) || g.get(fx + 1, fy) || g.get(fx, fy - 1) || g.get(fx, fy + 1))) add.push([fx, fy]);
        }
      }
      for (const [fx, fy] of add) px[fy][fx] = C.k;
    },
  };
  return g;
}

function toCanvas(g) {
  const { canvas } = detailCanvas(WARDEN_W, WARDEN_H);
  const p = pixels(canvas);
  for (let fy = 0; fy < H2; fy++) {
    for (let fx = 0; fx < W2; fx++) {
      const col = g.px[fy][fx];
      if (col) p.set(fx, fy, col);
    }
  }
  p.done();
  return canvas;
}

// Shapes, tested at a point (X, Y) in game pixels.
const poly = (pts) => (X, Y) => {
  let inn = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > Y !== yj > Y && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) inn = !inn;
  }
  return inn;
};
const rect = (x0, y0, w, h) => (X, Y) => X >= x0 && X < x0 + w && Y >= y0 && Y < y0 + h;
// Boxes round shapes (see grid().shape), with a pixel to spare.
const polyBox = (pts) => [
  Math.min(...pts.map((p) => p[0])) - 1, Math.min(...pts.map((p) => p[1])) - 1,
  Math.max(...pts.map((p) => p[0])) + 1, Math.max(...pts.map((p) => p[1])) + 1,
];
const rectBox = (x0, y0, w, h) => [x0 - 1, y0 - 1, x0 + w + 1, y0 + h + 1];
const hubBox = (r) => [HUB.x - r - 1, HUB.y - r - 1, HUB.x + r + 1, HUB.y + r + 1];
const dist = (X, Y) => Math.hypot(X - HUB.x, Y - HUB.y);
// Angle round the hub, 0 = right, growing clockwise (screen y points down).
const angle = (X, Y) => {
  const a = Math.atan2(Y - HUB.y, X - HUB.x);
  return a < 0 ? a + Math.PI * 2 : a;
};
// Hazard stripes two pixels wide, leaning like "\".
const hazard = (X, Y) => (Math.floor((X + Y) / 2) % 2 ? C.a : C.k);
const hull = { fill: C.g, hi: C.h, shade: C.n, shadeW: 2 };
const dark = { fill: C.n, hi: C.g, shade: C.k };
const ice = { fill: C.j, border: C.q, hi: C.i, shade: C.m, shadeW: 2 };

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
  const inBody = poly(BODY);
  // The fins: dark steel with a row of bolts along each.
  for (const fin of [FIN_TOP, FIN_LOW]) {
    const inFin = poly(fin);
    g.shape(inFin, { ...dark, pattern: (X, Y) => {
      // A spar down the middle of the fin, with bolts on it.
      const [p0, p1] = [fin[0], fin[1]];
      const t = ((X - p0[0]) * (p1[0] - p0[0]) + (Y - p0[1]) * (p1[1] - p0[1])) / ((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2);
      const ox = p0[0] + t * (p1[0] - p0[0]) + 3.5;
      const oy = p0[1] + t * (p1[1] - p0[1]);
      if (Math.hypot(X - ox, Y - oy) < 0.6 && Math.floor(t * 8) % 2 === 0) return C.G;
      return null;
    } }, polyBox(fin));
  }
  if (stage === 1) {
    for (const tip of [TIP_TOP, TIP_LOW]) {
      g.shape(poly(tip), { ...ice, pattern: (X, Y) => (Math.abs(X - Y * 0.3 - (tip === TIP_TOP ? 65 : 47)) < 0.4 ? C.i : null) }, polyBox(tip));
    }
  }
  // The hull: plates with seams and rivets, lit along its top.
  g.shape(inBody, { ...hull, pattern: (X, Y) => {
    for (const sx of [56, 66]) {
      if (X > sx - 0.5 && X < sx) return C.n; // a seam
      if (X > sx && X < sx + 0.5) return C.h; // its lit lip
      if (Math.abs(X - (sx + 1.5)) < 0.3 && (Math.abs(Y - 24.5) < 0.3 || Math.abs(Y - 43.5) < 0.3)) return C.h; // rivets
    }
    if (Y > 33 && Y < 35 && X > 44 && X < 70) return Y < 34 ? C.n : C.G; // a vent between the stripes
    return null;
  } }, polyBox(BODY));
  g.shape(rect(49, 27, 22, 4), { fill: C.a, pattern: hazard }, rectBox(49, 27, 22, 4));
  g.shape(rect(49, 37, 22, 4), { fill: C.a, pattern: hazard }, rectBox(49, 37, 22, 4));
  // The engines: heavy nozzles with a dark mouth and a warm glow inside.
  for (const [ex, ey] of [[77, 29], [77, 39]]) {
    g.shape(rect(ex, ey - 2, 3, 5), { fill: C.n, hi: C.g, shade: C.k, pattern: (X, Y) => {
      if (X > ex + 1.5 && Math.abs(Y - (ey + 0.5)) < 1.5) return Math.abs(Y - (ey + 0.5)) < 0.75 ? C.l : C.A;
      return null;
    } }, rectBox(ex, ey - 2, 3, 5));
  }
  if (stage >= 2) {
    // Scorch marks: soot speckled round where it's been hit.
    for (const [hx, hy] of HOLES.slice(0, stage === 2 ? 2 : 4)) {
      for (let fy = (hy - 4) * DETAIL; fy < (hy + 4) * DETAIL; fy++) {
        for (let fx = (hx - 5) * DETAIL; fx < (hx + 5) * DETAIL; fx++) {
          const d = Math.hypot((at(fx) - hx) / 1.4, at(fy) - hy);
          const c = g.get(fx, fy);
          if (!c || c === C.k || d > 3) continue;
          const r = grit(fx, fy, hx + stage);
          if (r < 0.55 - d * 0.15) g.set(fx, fy, r < 0.2 ? C.k : C.n);
        }
      }
    }
  }
  if (stage === 3) {
    // Holes blown in the hull: ragged, scorched round the edge, glowing inside.
    for (const [hx, hy] of HOLES.slice(0, 3)) {
      const inHole = (X, Y) => {
        const a = Math.atan2(Y - hy, X - hx);
        return Math.hypot(X - hx, Y - hy) < 2.6 + 0.4 * Math.sin(a * 5 + hx);
      };
      g.shape(inHole, { fill: HOLE[1], border: HOLE[0], pattern: (X, Y) => {
        const d = Math.hypot(X - hx, Y - hy);
        return d < 1 ? HOLE[2] : d > 1.8 ? HOLE[3] : null;
      } }, [hx - 4, hy - 4, hx + 4, hy + 4]);
    }
  }
  g.outline();
  return g;
}

// The saw ring at one rotation (ph radians): 18 teeth leaning the way it
// spins, a steel band with a bolt by each tooth, and a hazard-striped
// inner rim, all turning together.
function paintRing(ph) {
  const g = grid();
  for (let t = 0; t < TEETH; t++) {
    const a = (t / TEETH) * Math.PI * 2 + ph;
    const tip = [HUB.x + Math.cos(a) * TOOTH_R, HUB.y + Math.sin(a) * TOOTH_R];
    const b1 = [HUB.x + Math.cos(a - 0.17) * (RING_OUT - 1), HUB.y + Math.sin(a - 0.17) * (RING_OUT - 1)];
    const b2 = [HUB.x + Math.cos(a + 0.12) * (RING_OUT - 1), HUB.y + Math.sin(a + 0.12) * (RING_OUT - 1)];
    g.shape(poly([tip, b1, b2]), { fill: C.h, hi: C.c, shade: C.G, shadeW: FINE }, polyBox([tip, b1, b2]));
  }
  const seg = (Math.PI * 2) / TEETH;
  g.shape((X, Y) => dist(X, Y) >= RING_IN && dist(X, Y) <= RING_OUT, {
    fill: C.h, hi: C.c, shade: C.g,
    pattern: (X, Y) => {
      const f = ((((angle(X, Y) - ph) / seg) % 1) + 1) % 1;
      const d = dist(X, Y);
      // A bolt in the middle of each light segment.
      if (Math.abs(d - (RING_IN + RING_OUT) / 2) < 0.8 && Math.abs(f - 0.75) * seg * d < 0.8) return Math.abs(f - 0.75) * seg * d < 0.3 && d < 23.6 ? C.c : C.n;
      if (f < 0.5) return Math.abs(d - (RING_IN + RING_OUT) / 2) < 0.3 ? C.n : C.g; // dark segments, with a groove
      return null;
    },
  }, hubBox(RING_OUT));
  g.shape((X, Y) => dist(X, Y) >= HUB_R && dist(X, Y) < RING_IN + 0.5, {
    fill: C.a,
    pattern: (X, Y) => (Math.floor((((angle(X, Y) - ph) / (seg / 2)) % (TEETH * 2) + TEETH * 2) % (TEETH * 2)) % 2 ? C.k : C.a),
  }, hubBox(RING_IN + 1));
  g.outline();
  return g;
}

// The hub: a dark socket under the plates (what you see where a plate has
// broken off), with a rim and fine rings.
function paintHub() {
  const g = grid();
  g.shape((X, Y) => dist(X, Y) < HUB_R, { fill: C.n, border: C.k, shade: C.k, shadeW: FINE }, hubBox(HUB_R));
  for (let r = 10; r < HUB_R - 1; r += 3) {
    g.shape((X, Y) => Math.abs(dist(X, Y) - r) < 0.25, { fill: '#3a3940', border: null }, hubBox(r + 1));
  }
  return g;
}

// The six plates sit round the core like the slices of a pie, and the
// whole set TURNS (hubAng, radians, clockwise): plate k covers the wedge from
// k*60 to (k+1)*60 degrees past hubAng (0 = pointing right). Because they
// turn, they're painted fresh every frame into a small picture of the hub.
export const SECTOR = Math.PI / 3;
const GAP = 0.09; // a thin seam between neighbouring plates (none over the core)
const TAU = Math.PI * 2;
// Which plate is at angle a (radians, 0 = right, clockwise) when the hub
// has turned by hubAng.
const plateAtAngle = (a, hubAng) => Math.floor((((a - hubAng) % TAU) + TAU) % TAU / SECTOR) % PLATES;
// A cheap fixed "random" per half pixel, for frost glints and the ragged
// edge of refreezing frost.
const speckle = (fx, fy) => grit(fx, fy, 5);

const HALF = PLATE_R + 1;
const SIZE = HALF * 2;
const SIZE2 = SIZE * DETAIL;
const HUB_PIXELS = [];
for (let py = 0; py < SIZE2; py++) {
  for (let px = 0; px < SIZE2; px++) {
    const X = HUB.x - HALF + at(px);
    const Y = HUB.y - HALF + at(py);
    const d = dist(X, Y);
    if (d <= PLATE_R + 0.3) HUB_PIXELS.push({ i: py * SIZE2 + px, d, a: angle(X, Y), s: speckle(px, py) });
  }
}
let layer = null;
// Draw the plates (as they are now, turned by hubAng) with the hub's
// centre at (cx, cy). plates: [{ hp, grow, flash }].
export function drawWardenPlates(ctx, cx, cy, plates, hubAng) {
  if (!layer) {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE2;
    canvas.height = SIZE2;
    const c = canvas.getContext('2d');
    const img = c.createImageData(SIZE2, SIZE2);
    layer = { canvas, c, img, buf: new Uint32Array(img.data.buffer), col: {} };
    for (const [k, v] of Object.entries({ i: C.i, j: C.j, m: C.m, q: C.q, P: '#c8d4ec', cream: PAL.cream })) layer.col[k] = rgba(v);
  }
  const { buf, col } = layer;
  buf.fill(0);
  for (const P of HUB_PIXELS) {
    const rel = (((P.a - hubAng) % TAU) + TAU) % TAU;
    const k = Math.floor(rel / SECTOR) % PLATES;
    const w = rel - k * SECTOR; // how far round inside its own wedge
    const plate = plates[k];
    const seam = P.d > CORE_R + 1.5 && (w < GAP || w > SECTOR - GAP);
    if (seam) continue;
    let c = 0;
    const lit = P.a > Math.PI * 1.05 && P.a < Math.PI * 1.7; // facing the upper left
    if (plate.hp > 0) {
      if (plate.flash > 0) c = col.cream;
      else if (P.d > PLATE_R - 0.5 || (P.d > CORE_R + 1.5 && (w < GAP + 0.06 || w > SECTOR - GAP - 0.06))) {
        // Its rim and edges: lit on the upper left, dark elsewhere.
        c = P.d > PLATE_R - 0.5 && lit ? col.i : col.q;
      } else {
        c = k % 2 ? col.m : col.j;
        if (P.d > PLATE_R - 2.5 && lit) c = k % 2 ? col.j : col.i; // a bright bevel
        else if (P.d > PLATE_R - 1.5 && !lit) c = k % 2 ? col.q : col.m; // the shaded bevel
        // A facet line down the middle of each plate, and glints in the ice.
        if (Math.abs(w - SECTOR / 2) * P.d < 0.25 && P.d > CORE_R + 3) c = k % 2 ? col.j : col.P;
        if (P.s > 0.985) c = col.i;
        // Cracks spread as it's hit: one at two-thirds strength, two at a third.
        const level = plate.hp <= PLATE_HP * 0.34 ? 2 : plate.hp <= PLATE_HP * 0.67 ? 1 : 0;
        for (let n = 0; n < level; n++) {
          const cw = SECTOR * 0.5 + (n ? 0.2 : -0.14) + 0.06 * Math.sin(P.d * 1.7 + k * 2 + n * 3);
          const off = Math.abs(w - cw) * P.d;
          if (P.d >= 4 + n * 2 && off < 0.35) c = col.q;
          else if (P.d >= 4 + n * 2 && off < 0.7 && w < cw) c = col.i; // the crack's lit lip
        }
      }
    } else if (plate.grow > 0) {
      // Freezing back over: frost creeps in from the rim with a ragged edge.
      if (P.d + P.s * 2.5 >= PLATE_R * (1 - plate.grow) + 1) c = plate.flash > 0 ? col.cream : P.s > 0.55 ? col.i : col.j;
    }
    buf[P.i] = c;
  }
  layer.c.putImageData(layer.img, 0, 0);
  ctx.drawImage(layer.canvas, cx - HALF, cy - HALF, SIZE, SIZE);
}

// The furnace core: a warm glow in a dark housing, painted once in each of
// its looks (dim, bright, and pale when hit).
function paintCore(look) {
  const n = (CORE_R * 2 + 1) * DETAIL;
  const { canvas } = detailCanvas(CORE_R * 2 + 1, CORE_R * 2 + 1);
  const p = pixels(canvas);
  for (let fy = 0; fy < n; fy++) {
    for (let fx = 0; fx < n; fx++) {
      // (Centred CORE_R in from the picture's corner, where the hub is.)
      const x = at(fx) - CORE_R;
      const y = at(fy) - CORE_R;
      const d = Math.hypot(x, y);
      if (d > CORE_R + 0.3) continue;
      let col;
      if (d > 6.6) col = d > 7.8 ? C.k : d > 7.2 ? C.n : x + y < -2 ? C.G : C.n; // the housing, lit top-left
      else if (look === 2) col = PAL.cream;
      else if (d < 1.8) col = d < 0.8 && x < 0 && y < 0 ? '#ffffff' : look ? C.y : C.c;
      else if (d < 3.6) col = look ? C.l : C.a;
      else if (d < 5.2) col = C.s;
      else col = d > 6.2 ? C.k : C.R;
      p.set(fx, fy, col);
    }
  }
  p.done();
  return canvas;
}
let CORES = null;
export function drawWardenCore(ctx, cx, cy, t, hit) {
  if (!CORES) CORES = [0, 1, 2].map(paintCore);
  const look = hit ? 2 : (Math.sin(t * 8) + 1) / 2 > 0.5 ? 1 : 0;
  ctx.drawImage(CORES[look], cx - CORE_R, cy - CORE_R);
}

export const WARDEN = {};
export function buildWardenArt() {
  if (WARDEN.bodies) return WARDEN;
  WARDEN.bodies = [1, 2, 3].map((s) => toCanvas(paintBody(s)));
  WARDEN.ring = [];
  for (let f = 0; f < RING_FRAMES; f++) WARDEN.ring.push(toCanvas(paintRing((f / RING_FRAMES) * ((Math.PI * 2) / TEETH))));
  WARDEN.hub = toCanvas(paintHub());
  if (!CORES) CORES = [0, 1, 2].map(paintCore);
  bladeFrame(0);
  return WARDEN;
}

// ---------------------------------------------------------------- what's where
// What is at each pixel of the boss's box? 0 = nothing, RING (the saw
// ring: your shots fly through its open spokes, but your ship gets cut on
// it), ARMOUR (hub rim, body, fins), CORE, or PLATE + k for plate k (which
// counts only while that plate is there: a broken plate leaves a hole).
// (Tested at each whole pixel's centre, exactly as before double detail.)
export const RING = 4;
export const ARMOUR = 1;
export const CORE = 2;
export const PLATE = 5;
const MAP = new Uint8Array(WARDEN_W * WARDEN_H);
const ANGLE = new Float32Array(WARDEN_W * WARDEN_H).fill(-1); // round the hub, where the plates are
(() => {
  const inBody = [poly(BODY), poly(FIN_TOP), poly(FIN_LOW)];
  for (let y = 0; y < WARDEN_H; y++) {
    for (let x = 0; x < WARDEN_W; x++) {
      const i = y * WARDEN_W + x;
      const d = dist(x + 0.5, y + 0.5);
      // (The thin seams between plates count as plate too, so no shot can
      // slip through a seam to the core.)
      if (d <= PLATE_R + 0.5) ANGLE[i] = angle(x + 0.5, y + 0.5);
      if (d <= CORE_R) MAP[i] = CORE;
      else if (d <= PLATE_R + 0.5) MAP[i] = ARMOUR; // the hub's socket (under the plates)
      else if (d < TOOTH_R - 1.5) MAP[i] = RING; // the hub's rim and the saw ring
      else if (inBody.some((f) => f(x + 0.5, y + 0.5))) MAP[i] = ARMOUR;
    }
  }
})();
// What's at (x, y) inside the box, given which plates are still there and
// how far the hub has turned.
export function wardenAt(x, y, plateThere, hubAng = 0) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= WARDEN_W || y >= WARDEN_H) return 0;
  const i = y * WARDEN_W + x;
  const k = ANGLE[i] >= 0 ? plateAtAngle(ANGLE[i], hubAng) : -1;
  if (k >= 0 && plateThere(k)) return PLATE + k;
  if (MAP[i] === ARMOUR && dist(x + 0.5, y + 0.5) <= PLATE_R + 0.5) return 0; // a hole where a plate was
  return MAP[i];
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

// A thrown saw blade, painted in a few rotation frames between one tooth
// and the next: a steel disc with six hooked teeth and a hazard-striped
// hub. The picture is BLADE_SIZE game pixels across, centred on the blade
// (its middle is 4.5 in from the corner of its 9 x 9 box); the teeth reach
// past the 4-pixel circle that hurts, as the old drawing's did, so it
// never cuts you while it looks clear.
const BLADE_FRAMES = 6;
export const BLADE_SIZE = 12;
const BC = BLADE_SIZE / 2;
function paintBlade(ph) {
  const { canvas } = detailCanvas(BLADE_SIZE, BLADE_SIZE);
  const p = pixels(canvas);
  const n = BLADE_SIZE * DETAIL;
  const inside = (X, Y) => {
    const d = Math.hypot(X - BC, Y - BC);
    const a = Math.atan2(Y - BC, X - BC) - ph;
    const f = (((a / ((Math.PI * 2) / 6)) % 1) + 1) % 1; // round each tooth
    return d <= 3.6 || d <= 3.6 + 1.9 * (1 - f);
  };
  for (let fy = 0; fy < n; fy++) {
    for (let fx = 0; fx < n; fx++) {
      const X = at(fx);
      const Y = at(fy);
      if (!inside(X, Y)) continue;
      const d = Math.hypot(X - BC, Y - BC);
      let col = X + Y < BLADE_SIZE - 0.6 ? C.c : C.h;
      if (d > 2 && d < 2.9) col = X + Y < BLADE_SIZE ? C.G : C.g;
      if (d <= 1.7) col = Math.floor((Math.atan2(Y - BC, X - BC) - ph) / (Math.PI / 3) + 12) % 2 ? C.a : C.k;
      if (d <= 0.5) col = C.n;
      if (!inside(X - FINE, Y) || !inside(X + FINE, Y) || !inside(X, Y - FINE) || !inside(X, Y + FINE)) col = C.k;
      p.set(fx, fy, col);
    }
  }
  p.done();
  return canvas;
}
let BLADES = null;
export function bladeFrame(spinA) {
  if (!BLADES) BLADES = Array.from({ length: BLADE_FRAMES }, (_, f) => paintBlade((f / BLADE_FRAMES) * ((Math.PI * 2) / 6)));
  const step = (Math.PI * 2) / 6 / BLADE_FRAMES;
  return BLADES[((Math.floor(spinA / step) % BLADE_FRAMES) + BLADE_FRAMES) % BLADE_FRAMES];
}

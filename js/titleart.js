import { PAL } from './config.js?v=0.27.0';
import { detailCanvas, rgba } from './detail.js?v=0.27.0';
import { renderShip } from './shipmodel.js?v=0.27.0';

// The title: "EMBER DRIFT" in our own angular, forward-slanted lettering
// (a metal face lit pale above a dark horizon line and amber below, a
// rust-red 3D side, an ink outline, a glint) on an angular squadron-badge
// plate with an amber border, and your ship crossing the plate's corner,
// its engine trail sweeping under it (the owner's pick, "Squadron badge",
// after v0.26.0). Painted once, pixel by pixel, at double detail.
//
// The badge is designed on a 416 x 288 grid (the game screen at double
// detail) and painted at any size with a scale k and an offset.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

// Our letters, 12 units tall, as outlines (and holes), with cut corners.
const LETTERS = {
  E: { w: 9, shapes: [[[1.5, 0], [9.5, 0], [8.8, 3], [3, 3], [3, 4.6], [7.6, 4.6], [7, 7.4], [3, 7.4], [3, 9], [9, 9], [9, 12], [1.5, 12], [0, 10.5], [0, 1.5]]] },
  M: { w: 12, shapes: [[[0, 12], [0, 1.5], [1.5, 0], [4, 0], [6, 3.6], [8, 0], [10.5, 0], [12, 1.5], [12, 12], [9, 12], [9, 5.2], [6, 9.2], [3, 5.2], [3, 12]]] },
  B: { w: 9.5, shapes: [
    [[0, 0], [8, 0], [9.5, 1.5], [9.5, 4.6], [8.4, 6], [9.5, 7.4], [9.5, 10.5], [8, 12], [0, 12]],
    [[3, 2.7], [6.5, 2.7], [6.5, 4.7], [3, 4.7]],
    [[3, 7.3], [6.5, 7.3], [6.5, 9.3], [3, 9.3]],
  ] },
  R: { w: 9.5, shapes: [
    [[0, 0], [8, 0], [9.5, 1.5], [9.5, 5.6], [8, 7.1], [9.6, 12], [6.4, 12], [5, 7.6], [3, 7.6], [3, 12], [0, 12]],
    [[3, 2.7], [6.5, 2.7], [6.5, 5], [3, 5]],
  ] },
  D: { w: 9.5, shapes: [
    [[0, 0], [7, 0], [9.5, 2.5], [9.5, 9.5], [7, 12], [0, 12]],
    [[3, 3], [5.8, 3], [6.5, 3.7], [6.5, 8.3], [5.8, 9], [3, 9]],
  ] },
  I: { w: 3, shapes: [[[0, 0], [3, 0], [3, 12], [0, 12]]] },
  F: { w: 9, shapes: [[[1.5, 0], [9.5, 0], [8.8, 3], [3, 3], [3, 4.6], [7.6, 4.6], [7, 7.4], [3, 7.4], [3, 12], [0, 12], [0, 1.5]]] },
  T: { w: 10, shapes: [[[0, 0], [10.5, 0], [9.8, 3], [6.5, 3], [6.5, 12], [3.5, 12], [3.5, 3], [0, 3]]] },
};
const GAP = 1.1;
const wordWidth = (word) => [...word].reduce((s, c) => s + LETTERS[c].w, 0) + GAP * (word.length - 1);

// A painting surface: W x H pixels (0 = see-through).
function surface(W, H) {
  return { W, H, buf: new Uint32Array(W * H) };
}

// A sharp (not blurred) mask of whatever draw() fills.
function mask(S, draw) {
  const c = document.createElement('canvas');
  c.width = S.W;
  c.height = S.H;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  draw(x);
  const d = x.getImageData(0, 0, S.W, S.H).data;
  const m = new Uint8Array(S.W * S.H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  return m;
}

// A word as a metal logo. place(u, v) maps letter units to pixels.
function logoWord(S, word, place, { depth = 6, ex = 0.3, ey = 1, glint = 0.3 } = {}) {
  const { W, H, buf } = S;
  const face = mask(S, (ctx) => {
    let ux = 0;
    ctx.beginPath();
    for (const c of word) {
      for (const shape of LETTERS[c].shapes) {
        shape.forEach(([x, y], i) => {
          const [X, Y] = place(ux + x, y);
          if (i === 0) ctx.moveTo(X, Y);
          else ctx.lineTo(X, Y);
        });
        ctx.closePath();
      }
      ux += LETTERS[c].w + GAP;
    }
    ctx.fill('evenodd');
  });
  let top = H;
  let bottom = 0;
  for (let i = 0; i < face.length; i++) {
    if (!face[i]) continue;
    const y = Math.floor(i / W);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  // The 3D side: the face pushed back step by step.
  const side = new Uint8Array(W * H);
  for (let k = depth; k >= 1; k--) {
    const dx = Math.round(k * ex);
    const dy = Math.round(k * ey);
    for (let y = Math.max(0, top + dy); y <= Math.min(H - 1, bottom + dy); y++) {
      for (let x = Math.max(0, dx); x < W; x++) if (face[(y - dy) * W + x - dx]) side[y * W + x] = k;
    }
  }
  const sideCols = ['#b5562a', '#8a3a22', '#7a3a36', '#5a1f22', '#3d1014'];
  const bands = [[0.1, '#efe3cf'], [0.3, '#f6dcae'], [0.46, '#f2cf8a'], [0.52, '#8a5a2e'], [0.6, '#c98f4a'], [0.8, '#e3a857'], [9, '#c98f4a']];
  const ink = rgba(PAL.ink);
  const solid = (i) => face[i] || side[i];
  for (let y = Math.max(0, top - 1); y <= Math.min(H - 1, bottom + depth + 1); y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!solid(i)) continue;
      let outer = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      if (!outer) outer = !solid(i + 1) || !solid(i - 1) || !solid(i + W) || !solid(i - W);
      if (outer) {
        buf[i] = ink;
        continue;
      }
      if (!face[i]) {
        const k = Math.floor((side[i] / depth) * sideCols.length + bayer(x, y) * 0.8);
        buf[i] = rgba(sideCols[Math.min(sideCols.length - 1, k)]);
        continue;
      }
      if (!face[i + W]) {
        buf[i] = ink; // where the face meets its own side
        continue;
      }
      const t = (y - top) / Math.max(1, bottom - top) + bayer(x, y) * 0.08 - 0.04;
      let col = bands.find(([end]) => t < end)[1];
      if (!face[i - W]) col = '#efe3cf'; // a lit bevel along the top edges
      const g = Math.floor(x - W * glint + (y - top) * 0.55);
      if (t < 0.46 && ((g >= 0 && g < 3) || g === 5)) col = '#efe3cf'; // a glint
      buf[i] = rgba(col);
    }
  }
}

// A tapering engine trail along a curve (4 control points).
function trail(S, pts, width) {
  const { W, H, buf } = S;
  const at = (t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * pts[0][k] + 3 * u * u * t * pts[1][k] + 3 * u * t * t * pts[2][k] + t * t * t * pts[3][k]);
  };
  const cols = ['#efe3cf', '#f2cf8a', '#e3a857', '#c98f4a', '#8a5a2e', '#7a3a36'];
  for (let s = 0; s <= 500; s++) {
    const t = s / 500;
    const p = at(t);
    const q = at(Math.min(1, t + 0.002));
    const n = [-(q[1] - p[1]), q[0] - p[0]];
    const l = Math.hypot(n[0], n[1]) || 1;
    const half = width * (1 - t) ** 0.8 * 0.5;
    for (let w = -half; w <= half; w += 0.5) {
      const X = Math.round(p[0] + (n[0] / l) * w);
      const Y = Math.round(p[1] + (n[1] / l) * w);
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      if (t > 0.6 && bayer(X, Y) < (t - 0.6) * 2.4) continue; // fading out
      const heat = t * 1.2 + (Math.abs(w) / Math.max(half, 0.5)) * 0.5 + bayer(X, Y) * 0.25;
      buf[Y * W + X] = rgba(cols[Math.min(cols.length - 1, Math.floor(heat * 3.4))]);
    }
  }
}

// Space behind (for pictures that need their own sky, like the link
// preview): dark sky, stars, a soft sun.
export function paintSky(S, sun, seed = 3) {
  const { W, H, buf } = S;
  let s = seed;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cols = ['#0b0f1c', '#10142a', '#141a2e', '#1d2540', '#232c4a'];
  const warm = ['#5a3a1e', '#8a5a2e', '#c98f4a', '#e3a857', '#f2cf8a'];
  const pick = (list, v, x, y) => list[Math.max(0, Math.min(list.length - 1, Math.round(v * (list.length - 1) + bayer(x, y) - 0.5)))];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const glow = Math.max(0, 1 - Math.hypot(x - sun.x, y - sun.y) / sun.r);
      buf[y * W + x] = rgba(glow > 0.6 ? pick(warm, (glow - 0.6) / 0.4, x, y) : pick(cols, Math.min(0.999, (y / H) * 0.65 + glow * 0.5), x, y));
    }
  }
  for (let k = 0; k < (W * H) / 700; k++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    buf[y * W + x] = rgba(rand() < 0.15 ? PAL.cream : rand() < 0.5 ? PAL.bluePale : '#5a6a9a');
  }
}

// The badge with the ship, onto surface S, scaled by k and moved by
// (ox, oy) from its 416 x 288 design grid.
export function paintBadge(S, k = 1, ox = 0, oy = 0) {
  const { W, H, buf } = S;
  const P = (x, y) => [ox + x * k, oy + y * k];
  // The plate: an angular slab of dark metal, an amber border inset from
  // its ink edge, faint diagonal brushing.
  const plate = mask(S, (ctx) => {
    ctx.beginPath();
    [[44, 22], [316, 22], [342, 60], [316, 166], [44, 166], [18, 128]].forEach(([x, y], i) => {
      const [X, Y] = P(x, y);
      if (i) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.fill();
  });
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && plate[y * W + x];
  const border = Math.max(2, Math.round(3 * k));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!plate[y * W + x]) continue;
      const edge = !at(x + 1, y) || !at(x - 1, y) || !at(x, y + 1) || !at(x, y - 1);
      const inner = !at(x + border, y) || !at(x - border, y) || !at(x, y + border) || !at(x, y - border);
      let col = ['#141a2e', '#1d2540', '#232c4a'][Math.min(2, Math.floor((1 - (y - oy) / (166 * k)) * 2 + bayer(x, y)))];
      if (!edge && !inner && (x + y) % Math.round(23 * k) === 0 && y % 2 === 0) col = '#34406a';
      buf[y * W + x] = rgba(edge ? PAL.ink : inner ? PAL.amberSoft : col);
    }
  }
  // The ship (painted aside first, to know where its engine is), the trail
  // from its engine, the letters, then the ship on top.
  const ship = new Uint32Array(W * H);
  const [cx, cy] = P(352, 112);
  const pos = renderShip(ship, W, H, { yaw: -0.45, pitch: 0.5, roll: 0.75, scale: 5.4 * k, cx, cy, dist: 60 }, rgba);
  const t = pos.tail;
  trail(S, [[t.x, t.y], [t.x - 40 * k, t.y + 60 * k], P(200, 186), P(10, 186)], 12 * k);
  const sc = 4.4 * k;
  const depth = Math.max(3, Math.round(6 * k));
  const word = (w, x0, y0, glint) => logoWord(S, w, (u, v) => {
    const [X, Y] = P(x0 - (wordWidth(w) * 4.4) / 2, y0);
    return [X + (u - v * 0.25) * sc, Y + v * sc];
  }, { depth, glint });
  word('EMBER', 188, 36, (ox + 150 * k) / W);
  word('DRIFT', 198, 98, (ox + 230 * k) / W);
  for (let i = 0; i < ship.length; i++) if (ship[i]) buf[i] = ship[i];
}

// Put a painted surface into a double-detail picture (w x h game pixels).
function toPicture(S, w, h) {
  const { canvas } = detailCanvas(w, h);
  canvas.hi.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(S.buf.buffer), S.W, S.H), 0, 0);
  return canvas;
}

// The opening screen's badge, filling the game screen (208 x 144), and
// the main menu's smaller one (104 x 48). Painted the first time they're
// needed, then kept.
let big = null;
let small = null;
export function titleBadge() {
  if (!big) {
    const S = surface(416, 288);
    paintBadge(S, 1, 0, 6);
    big = toPicture(S, 208, 144);
  }
  return big;
}
export function menuBadge() {
  if (!small) {
    const S = surface(208, 96);
    const k = 0.52;
    paintBadge(S, k, 2 - 18 * k, 2 - 22 * k);
    small = toPicture(S, 104, 48);
  }
  return small;
}

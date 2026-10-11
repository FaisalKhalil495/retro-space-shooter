// Title logo designs: "EMBER DRIFT" in our own angular, forward-slanted
// lettering with a metal face, 3D depth and an ink outline, combined with
// your ship (the 3D model from poster.js). Drawn as pixel art at the game
// screen's double detail (416 x 288). Runs in the browser page.

import { PAL } from '../js/config.js';
import { renderShip } from './poster.js';
import { drawTextCentered } from '../js/font.js';

const W = 416;
const H = 288;
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

// A word's outline as a path, placed by a transform from letter units.
function wordPath(ctx, word, place) {
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
}

// A sharp (not blurred) mask of whatever draw() fills.
function mask(draw) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  draw(x);
  const d = x.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  return m;
}

// Draw a word as a metal logo into buf. place(u, v) maps letter units to
// pixels (it does the slant, size and any perspective).
// depth: how far the 3D side reaches (pixels) and which way (ex, ey).
function logoWord(buf, rgba, word, place, { depth = 7, ex = 0.3, ey = 1, glint = 0.3 } = {}) {
  const face = mask((x) => {
    wordPath(x, word, place);
    x.fill('evenodd');
  });
  // The word's top and bottom on screen, for the metal's light bands.
  let top = H;
  let bottom = 0;
  for (let i = 0; i < W * H; i++) {
    if (face[i]) {
      const y = Math.floor(i / W);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  const side = new Uint8Array(W * H); // how deep into the 3D side (1..depth)
  for (let k = depth; k >= 1; k--) {
    const dx = Math.round(k * ex);
    const dy = Math.round(k * ey);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const X = x - dx;
        const Y = y - dy;
        if (X >= 0 && Y >= 0 && X < W && Y < H && face[Y * W + X]) side[y * W + x] = k;
      }
    }
  }
  const sideCols = ['#b5562a', '#8a3a22', '#7a3a36', '#5a1f22', '#3d1014'];
  // Chrome: pale sky above a dark horizon line, warm amber ground below.
  const chrome = (t, x, y) => {
    const d = bayer(x, y) * 0.08 - 0.04;
    t += d;
    if (t < 0.1) return '#efe3cf';
    if (t < 0.3) return '#f6dcae';
    if (t < 0.46) return '#f2cf8a';
    if (t < 0.52) return '#8a5a2e';
    if (t < 0.6) return '#c98f4a';
    if (t < 0.8) return '#e3a857';
    return '#c98f4a';
  };
  const ink = rgba(PAL.ink);
  const solid = (i) => face[i] || side[i];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!solid(i)) continue;
      // Ink round the outside of the whole thing.
      let outer = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx;
        const Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= H || !solid(Y * W + X)) outer = true;
      }
      if (outer) {
        buf[i] = ink;
        continue;
      }
      if (!face[i]) {
        const k = side[i];
        buf[i] = rgba(sideCols[Math.min(sideCols.length - 1, Math.floor((k / depth) * sideCols.length + bayer(x, y) * 0.8))]);
        continue;
      }
      // The face: an ink line where it meets its own side, a lit bevel
      // along its top edges, chrome bands, and a diagonal glint.
      const below = y + 1 < H && !face[i + W];
      if (below) {
        buf[i] = ink;
        continue;
      }
      const t = (y - top) / Math.max(1, bottom - top);
      let col = chrome(t, x, y);
      if (y > 0 && !face[i - W]) col = '#efe3cf';
      const g = (x - W * glint + (y - top) * 0.55) | 0;
      if (g >= 0 && g < 3 && t < 0.46) col = '#efe3cf';
      if (g >= 5 && g < 6 && t < 0.46) col = '#efe3cf';
      buf[i] = rgba(col);
    }
  }
}

// A tapering ribbon along a curve (the engine trail), into buf.
function trail(buf, rgba, pts, width) {
  // pts: control points of a cubic curve; width: thickness at the start.
  const at = (t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * pts[0][k] + 3 * u * u * t * pts[1][k] + 3 * u * t * t * pts[2][k] + t * t * t * pts[3][k]);
  };
  const cols = ['#efe3cf', '#f2cf8a', '#e3a857', '#c98f4a', '#8a5a2e', '#7a3a36'];
  for (let s = 0; s <= 400; s++) {
    const t = s / 400;
    const p = at(t);
    const q = at(Math.min(1, t + 0.002));
    const n = [-(q[1] - p[1]), q[0] - p[0]];
    const l = Math.hypot(...n) || 1;
    const half = width * (1 - t) ** 0.8 * 0.5;
    for (let w = -half; w <= half; w += 0.5) {
      const X = Math.round(p[0] + (n[0] / l) * w);
      const Y = Math.round(p[1] + (n[1] / l) * w);
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      // Hot in the middle and at the start, cooling outwards and along.
      const heat = t * 1.2 + (Math.abs(w) / Math.max(half, 0.5)) * 0.5 + bayer(X, Y) * 0.25;
      if (t > 0.6 && bayer(X, Y) < (t - 0.6) * 2.4) continue; // fading out
      buf[Y * W + X] = rgba(cols[Math.min(cols.length - 1, Math.floor(heat * 3.4))]);
    }
  }
}

// Space behind: dark sky, stars, a soft sun.
function sky(buf, rgba, rand, sun) {
  const cols = ['#0b0f1c', '#10142a', '#141a2e', '#1d2540', '#232c4a'];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const glow = sun ? Math.max(0, 1 - Math.hypot(x - sun.x, y - sun.y) / sun.r) : 0;
      let v = (y / H) * 0.65 + glow * 0.5;
      v = Math.max(0, Math.min(0.999, v)) * (cols.length - 1) + bayer(x, y) - 0.5;
      buf[y * W + x] = rgba(cols[Math.max(0, Math.min(cols.length - 1, Math.round(v)))]);
      if (glow > 0.6) {
        const g = ['#5a3a1e', '#8a5a2e', '#c98f4a', '#e3a857', '#f2cf8a'];
        const f = ((glow - 0.6) / 0.4) * (g.length - 1) + bayer(x, y) - 0.5;
        buf[y * W + x] = rgba(g[Math.max(0, Math.min(g.length - 1, Math.round(f)))]);
      }
    }
  }
  for (let k = 0; k < 170; k++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    buf[y * W + x] = rgba(rand() < 0.15 ? PAL.cream : rand() < 0.5 ? PAL.bluePale : '#5a6a9a');
  }
}

const overlay = (buf, layer) => {
  for (let i = 0; i < W * H; i++) if (layer[i]) buf[i] = layer[i];
};

// Where the title-screen buttons will go (shown faintly, so the design is
// judged as a start screen).
function buttonsHint(ctx) {
  ctx.save();
  ctx.scale(2, 2);
  const btn = (x, y, w, h, label, main) => {
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.fillStyle = main ? PAL.amber : '#1d2540';
    ctx.fillRect(x, y, w, h);
    drawTextCentered(ctx, label, x + w / 2, y + (h - 5) / 2, main ? PAL.ink : PAL.cream);
  };
  btn(30, 104, 72, 14, 'CONTINUE', true);
  btn(106, 104, 72, 14, 'NEW GAME', false);
  ['LEVELS', 'SCORES', 'OPTIONS', 'HELP'].forEach((l, i) => btn(6 + i * 50, 124, 46, 13, l, false));
  ctx.restore();
}

export function concept(n, rgba, seed = 3) {
  let s = seed;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const buf = new Uint32Array(img.data.buffer);
  const ship = new Uint32Array(W * H);
  // The ship is drawn first (to learn where its engine is), the trail
  // runs from the engine, then the letters, then the ship on top.
  if (n === 1) {
    // 1. BURST THROUGH: two lines tilted back like a film title; the ship
    // bursts out between them towards you, its trail curving round under
    // DRIFT.
    sky(buf, rgba, rand, { x: 360, y: 30, r: 70 });
    const pos = renderShip(ship, W, H, { yaw: -1.0, pitch: -0.2, roll: -0.5, scale: 8.2, cx: 262, cy: 108, dist: 30 }, rgba);
    const persp = (cx, u, v, scale, x0, y0, shear, k0, k1) => {
      const px = x0 + (u - v * shear) * scale;
      const py = y0 + v * scale;
      const f = k0 + (k1 - k0) * (v / 12);
      return [cx + (px - cx) * f, py];
    };
    const t = pos.tail;
    trail(buf, rgba, [[t.x, t.y], [t.x - 120, t.y + 20], [40, 210], [300, 196]], 16);
    logoWord(buf, rgba, 'EMBER', (u, v) => persp(208, u, v, 6.4, 208 - (wordWidth('EMBER') * 6.4) / 2 + 12, 10, 0.22, 0.86, 1), { depth: 8, glint: 0.32 });
    logoWord(buf, rgba, 'DRIFT', (u, v) => persp(208, u, v, 6.4, 208 - (wordWidth('DRIFT') * 6.4) / 2 + 40, 116, 0.22, 0.92, 1.06), { depth: 8, glint: 0.62 });
    overlay(buf, ship);
  } else if (n === 2) {
    // 2. SKIMMING: one long, steeply slanted line; the ship skims along
    // the top of the letters, its flame a long streak under the name.
    sky(buf, rgba, rand, { x: 60, y: 40, r: 60 });
    const pos = renderShip(ship, W, H, { yaw: -0.3, pitch: -0.2, roll: 0.95, scale: 5.2, cx: 336, cy: 48, dist: 60 }, rgba);
    const sc = 3.55;
    const total = wordWidth('EMBER') + 6 + wordWidth('DRIFT');
    const x0 = 208 - (total * sc) / 2 + 14;
    const t = pos.tail;
    trail(buf, rgba, [[t.x, t.y], [t.x - 60, t.y + 70], [140, 150], [6, 148]], 12);
    const place = (off) => (u, v) => [x0 + (off + u - v * 0.42) * sc, 92 + v * sc];
    logoWord(buf, rgba, 'EMBER', place(0), { depth: 7, ex: 0.5, glint: 0.3 });
    logoWord(buf, rgba, 'DRIFT', place(wordWidth('EMBER') + 6), { depth: 7, ex: 0.5, glint: 0.7 });
    overlay(buf, ship);
  } else {
    // 3. SQUADRON BADGE: the name on an angular metal plate, the ship
    // crossing its corner, trail sweeping under the plate.
    sky(buf, rgba, rand, { x: 60, y: 36, r: 55 });
    const plate = mask((x) => {
      x.beginPath();
      const p = [[44, 22], [316, 22], [342, 60], [316, 166], [44, 166], [18, 128]];
      p.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
      x.closePath();
      x.fill();
    });
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!plate[i]) continue;
        let edge = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!plate[i + dx + dy * W]) edge = 1;
        let inner = 0;
        for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if (!plate[i + dx + dy * W]) inner = 1;
        const shade = ['#141a2e', '#1d2540', '#232c4a'][Math.min(2, Math.floor((1 - y / 166) * 2 + bayer(x, y)))];
        buf[i] = rgba(edge ? PAL.ink : inner ? PAL.amberSoft : shade);
        if (!edge && !inner && (x + y) % 23 === 0 && y % 2 === 0) buf[i] = rgba('#34406a');
      }
    }
    const pos = renderShip(ship, W, H, { yaw: -0.45, pitch: 0.5, roll: 0.75, scale: 5.4, cx: 352, cy: 112, dist: 60 }, rgba);
    const t = pos.tail;
    trail(buf, rgba, [[t.x, t.y], [t.x - 40, t.y + 60], [200, 186], [10, 186]], 12);
    const sc = 4.4;
    logoWord(buf, rgba, 'EMBER', (u, v) => [180 - (wordWidth('EMBER') * sc) / 2 + (u - v * 0.25) * sc + 8, 36 + v * sc], { depth: 6, glint: 0.3 });
    logoWord(buf, rgba, 'DRIFT', (u, v) => [180 - (wordWidth('DRIFT') * sc) / 2 + (u - v * 0.25) * sc + 18, 98 + v * sc], { depth: 6, glint: 0.5 });
    overlay(buf, ship);
  }
  ctx.putImageData(img, 0, 0);
  buttonsHint(ctx);
  return c;
}

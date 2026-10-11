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
// Tall, narrow letters with knife-edge ends ('blade').
const BLADE = {
  E: { w: 6.5, shapes: [[[0, 0], [7.5, 0], [6.2, 2.2], [2.2, 2.2], [2.2, 4.9], [5.4, 4.9], [4.6, 7.1], [2.2, 7.1], [2.2, 9.8], [7.5, 9.8], [6.2, 12], [0, 12]]] },
  M: { w: 9, shapes: [[[0, 12], [0, 0], [2.4, 0], [4.5, 5], [6.6, 0], [9, 0], [9, 12], [6.8, 12], [6.8, 5.5], [4.5, 10], [2.2, 5.5], [2.2, 12]]] },
  B: { w: 6.8, shapes: [
    [[0, 0], [5.6, 0], [6.8, 1.2], [6.8, 4.8], [5.9, 6], [6.8, 7.2], [6.8, 10.8], [5.6, 12], [0, 12]],
    [[2.2, 2.2], [4.6, 2.2], [4.6, 4.9], [2.2, 4.9]],
    [[2.2, 7.1], [4.6, 7.1], [4.6, 9.8], [2.2, 9.8]],
  ] },
  R: { w: 6.8, shapes: [
    [[0, 0], [5.6, 0], [6.8, 1.2], [6.8, 5.8], [5.6, 7], [7.6, 12], [5.1, 12], [3.4, 7.1], [2.2, 7.1], [2.2, 12], [0, 12]],
    [[2.2, 2.2], [4.6, 2.2], [4.6, 4.9], [2.2, 4.9]],
  ] },
  D: { w: 6.8, shapes: [
    [[0, 0], [4.8, 0], [6.8, 2], [6.8, 10], [4.8, 12], [0, 12]],
    [[2.2, 2.2], [4, 2.2], [4.6, 2.8], [4.6, 9.2], [4, 9.8], [2.2, 9.8]],
  ] },
  I: { w: 2.2, shapes: [[[0, 0.9], [2.2, 0], [2.2, 11.1], [0, 12]]] },
  F: { w: 6.5, shapes: [[[0, 0], [7.5, 0], [6.2, 2.2], [2.2, 2.2], [2.2, 4.9], [5.4, 4.9], [4.6, 7.1], [2.2, 7.1], [2.2, 10.2], [1.1, 12], [0, 12]]] },
  T: { w: 7.6, shapes: [[[-0.6, 0], [8.4, 0], [7.2, 2.2], [4.9, 2.2], [4.9, 12], [2.7, 12], [2.7, 2.2], [0.6, 2.2]]] },
};
// Heavy square letters with stencil gaps ('stencil'): the angular
// letters, upright, with bridges cut through them (in letter units).
const CUTS = {
  E: [[3, -1, 0.8, 4.2], [3, 4.4, 0.8, 3.2], [3, 8.8, 0.8, 4.2]],
  M: [[5.6, -1, 0.8, 10.8]],
  B: [[3.3, -1, 0.8, 4], [3.3, 4.4, 0.8, 3.2], [3.3, 9, 0.8, 4]],
  R: [[3.3, -1, 0.8, 4], [3.3, 4.8, 0.8, 3]],
  D: [[3.3, -1, 0.8, 4], [3.3, 9, 0.8, 4]],
  I: [[-1, 5.6, 5, 0.8]],
  F: [[3, -1, 0.8, 4.2], [3, 4.4, 0.8, 3.2]],
  T: [[2.6, 3, 5, 0.8]],
};
// Wide, round letters drawn as thick strokes ('racer'), with round ends.
const RACER = {
  E: { w: 10, lines: [[[9.6, 1.7], [1.7, 1.7], [1.7, 10.3], [9.6, 10.3]], [[1.7, 6], [7.6, 6]]] },
  M: { w: 12.4, lines: [[[1.7, 10.3], [1.7, 1.7], [6.2, 6.6], [10.7, 1.7], [10.7, 10.3]]] },
  B: { w: 10.4, lines: [
    [[1.7, 10.3], [1.7, 1.7], [7.4, 1.7], [8.9, 2.4], [9.3, 3.85], [8.9, 5.3], [7.4, 6], [1.7, 6]],
    [[7.4, 6], [9.1, 6.7], [9.6, 8.15], [9.1, 9.6], [7.4, 10.3], [1.7, 10.3]],
  ] },
  R: { w: 10.4, lines: [[[1.7, 10.3], [1.7, 1.7], [7.4, 1.7], [8.9, 2.4], [9.3, 3.85], [8.9, 5.3], [7.4, 6], [1.7, 6]], [[6, 6], [9.6, 10.3]]] },
  D: { w: 10.4, closed: true, lines: [[[1.7, 1.7], [6.5, 1.7], [8.7, 2.7], [9.6, 4.8], [9.6, 7.2], [8.7, 9.3], [6.5, 10.3], [1.7, 10.3]]] },
  I: { w: 3.4, lines: [[[1.7, 1.7], [1.7, 10.3]]] },
  F: { w: 10, lines: [[[9.6, 1.7], [1.7, 1.7], [1.7, 10.3]], [[1.7, 6], [7.6, 6]]] },
  T: { w: 10.4, lines: [[[0.4, 1.7], [10, 1.7]], [[5.2, 1.7], [5.2, 10.3]]] },
};
const FONTS = {
  angular: { glyphs: LETTERS, gap: 1.1 },
  stencil: { glyphs: LETTERS, gap: 1.3, cuts: CUTS },
  blade: { glyphs: BLADE, gap: 0.9 },
  racer: { glyphs: RACER, gap: 1.5, stroke: 3.0 },
};
const wordWidth = (word, font = 'angular') => {
  const F = FONTS[font];
  return [...word].reduce((s, c) => s + F.glyphs[c].w, 0) + F.gap * (word.length - 1);
};

// Fill a word's shape, placed by a transform from letter units.
// (scale: pixels per unit, for the stroke-drawn letters.)
function fillWord(ctx, word, place, font, scale) {
  const F = FONTS[font];
  let ux = 0;
  const pt = (x, y, first) => {
    const [X, Y] = place(ux + x, y);
    if (first) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  };
  if (F.stroke) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = F.stroke * scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const c of word) {
      const g = F.glyphs[c];
      for (const line of g.lines) {
        ctx.beginPath();
        line.forEach(([x, y], i) => pt(x, y, i === 0));
        if (g.closed) ctx.closePath();
        ctx.stroke();
      }
      ux += g.w + F.gap;
    }
    return;
  }
  ctx.beginPath();
  for (const c of word) {
    for (const shape of F.glyphs[c].shapes) {
      shape.forEach(([x, y], i) => pt(x, y, i === 0));
      ctx.closePath();
    }
    ux += F.glyphs[c].w + F.gap;
  }
  ctx.fill('evenodd');
  if (F.cuts) {
    // Stencil bridges: cut out after filling.
    ux = 0;
    ctx.globalCompositeOperation = 'destination-out';
    for (const c of word) {
      for (const [x, y, w, h] of F.cuts[c]) {
        ctx.beginPath();
        pt(x, y, true);
        pt(x + w, y);
        pt(x + w, y + h);
        pt(x, y + h);
        ctx.closePath();
        ctx.fill();
      }
      ux += F.glyphs[c].w + F.gap;
    }
    ctx.globalCompositeOperation = 'source-over';
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
// Finishes for the face: light bands from top (0) to bottom (1).
const FINISH = {
  chrome: [[0.1, '#efe3cf'], [0.3, '#f6dcae'], [0.46, '#f2cf8a'], [0.52, '#8a5a2e'], [0.6, '#c98f4a'], [0.8, '#e3a857'], [1.1, '#c98f4a']],
  steel: [[0.12, '#e6eef7'], [0.32, '#c8d4ec'], [0.47, '#9fb0d0'], [0.53, '#34406a'], [0.62, '#5a6a9a'], [0.82, '#7f9cc0'], [1.1, '#5a6a9a']],
  sunset: [[0.14, '#efe3cf'], [0.34, '#f2cf8a'], [0.54, '#e3a857'], [0.72, '#d07a5e'], [0.88, '#a8544a'], [1.1, '#7a3a36']],
};
const SIDES = {
  chrome: ['#b5562a', '#8a3a22', '#7a3a36', '#5a1f22', '#3d1014'],
  steel: ['#4d6890', '#34406a', '#232c4a', '#1d2540', '#141a2e'],
  sunset: ['#7a3a36', '#5a1f22', '#4a1a1e', '#3d1014', '#24161a'],
};

function logoWord(buf, rgba, word, place, { depth = 7, ex = 0.3, ey = 1, glint = 0.3, font = 'angular', scale = 6, finish = 'chrome', stripes = null, rim = '#efe3cf' } = {}) {
  const face = mask((x) => fillWord(x, word, place, font, scale));
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
  if (stripes) {
    // Speed stripes cut clean through the letters.
    for (let y = top; y <= bottom; y++) {
      const t = (y - top) / Math.max(1, bottom - top);
      if (stripes.some(([a, b]) => t >= a && t < b)) for (let x = 0; x < W; x++) face[y * W + x] = 0;
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
  const sideCols = SIDES[finish];
  // Chrome-like bands: pale above a dark horizon line, deeper below.
  const bands = FINISH[finish];
  const chrome = (t, x, y) => {
    t += bayer(x, y) * 0.08 - 0.04;
    for (const [end, col] of bands) if (t < end) return col;
    return bands[bands.length - 1][1];
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
      if (y > 0 && !face[i - W]) col = rim;
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
  } else if (n === 3) {
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
  } else if (n === 4) {
    // 4. STENCIL SQUADRON: heavy upright stencil letters in brushed steel,
    // stacked; the ship climbs away past them on the right.
    sky(buf, rgba, rand, { x: 380, y: 26, r: 60 });
    const pos = renderShip(ship, W, H, { yaw: -0.25, pitch: 0.55, roll: 1.05, scale: 5.6, cx: 336, cy: 96, dist: 60 }, rgba);
    const t = pos.tail;
    trail(buf, rgba, [[t.x, t.y], [t.x - 50, t.y + 60], [200, 196], [0, 192]], 13);
    const sc = 4.6;
    logoWord(buf, rgba, 'EMBER', (u, v) => [22 + u * sc, 16 + v * sc], { font: 'stencil', finish: 'steel', depth: 7, ex: 0.5, glint: 0.25, rim: '#e6eef7' });
    logoWord(buf, rgba, 'DRIFT', (u, v) => [52 + u * sc, 92 + v * sc], { font: 'stencil', finish: 'steel', depth: 7, ex: 0.5, glint: 0.4, rim: '#e6eef7' });
    overlay(buf, ship);
  } else if (n === 5) {
    // 5. RACER: wide round letters, sunset-coloured, with speed stripes;
    // the ship flies in from the left, its exhaust running through the
    // stripes of DRIFT.
    sky(buf, rgba, rand, { x: 360, y: 34, r: 55 });
    const sc = 4.3;
    const stripes = [[0.6, 0.65], [0.76, 0.8]];
    const place = (x0, y0) => (u, v) => [x0 + (u - v * 0.27) * sc, y0 + v * sc];
    const y2 = 104;
    // The exhaust lines, through DRIFT's stripes, from the ship's engine.
    const shipX = 70;
    for (const [a, b] of stripes) {
      const y = Math.round(y2 + ((a + b) / 2) * 12 * sc);
      for (let x = 0; x < W; x++) {
        const f = x / W;
        if (bayer(x, y) < 1 - f * 0.7) buf[y * W + x] = rgba(f < 0.3 ? '#f2cf8a' : f < 0.65 ? '#e3a857' : '#c98f4a');
      }
    }
    logoWord(buf, rgba, 'EMBER', place(30, 18), { font: 'racer', scale: sc, finish: 'sunset', stripes, depth: 5, ex: 0.4, glint: 0.4 });
    logoWord(buf, rgba, 'DRIFT', place(140, y2), { font: 'racer', scale: sc, finish: 'sunset', stripes, depth: 5, ex: 0.4, glint: 0.75 });
    renderShip(ship, W, H, { yaw: -0.45, pitch: 0.12, roll: 0.4, scale: 5, cx: shipX, cy: y2 + 12 * sc * 0.62, dist: 60 }, rgba);
    overlay(buf, ship);
  } else {
    // 6. BLADE: tall knife-edged letters in one line; the ship rises
    // head-on beneath them, coming straight at you.
    sky(buf, rgba, rand, { x: 380, y: 140, r: 60 });
    const sc = 4.9;
    const total = wordWidth('EMBER', 'blade') + 4 + wordWidth('DRIFT', 'blade');
    const x0 = 208 - (total * sc) / 2 + 6;
    const place = (off) => (u, v) => [x0 + (off + u - v * 0.14) * sc, 24 + v * sc];
    logoWord(buf, rgba, 'EMBER', place(0), { font: 'blade', depth: 9, ex: 0, ey: 1, glint: 0.3 });
    logoWord(buf, rgba, 'DRIFT', place(wordWidth('EMBER', 'blade') + 4), { font: 'blade', depth: 9, ex: 0, ey: 1, glint: 0.7 });
    // A thin rule under the name, broken by the ship.
    for (let x = 30; x < W - 30; x++) {
      if (Math.abs(x - 208) < 40) continue;
      buf[100 * W + x] = rgba(x % 4 < 2 ? '#c98f4a' : '#8a5a2e');
    }
    renderShip(ship, W, H, { yaw: -1.35, pitch: -0.42, roll: 0.25, scale: 7.4, cx: 208, cy: 146, dist: 42 }, rgba);
    overlay(buf, ship);
  }
  ctx.putImageData(img, 0, 0);
  buttonsHint(ctx);
  return c;
}

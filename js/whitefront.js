import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.37.0';
import { seeded, fillDisc } from './util.js?v=0.37.0';
import { FINE, detailCanvas } from './detail.js?v=0.37.0';
import { GROUND_SPEED } from './terrain.js?v=0.37.0';

// The White Front (level 4): the ice planet below Frostring, where the
// invaders are fighting their way across the snow. All drawn by code (the
// look the owner chose from the preview, tools/white-front/world2.js).
// Far to near: a still sky (sun with its ice halo, Frostring's ring), long
// cloud banks drifting, landing ships coming down, searchlights, the glacier
// front line with the defenders' bunkers firing tracers and flak, the frozen
// lake, and the flat snowfield you fly over, with the battle's leftovers on
// it (pale wrecks, tank traps, sandbags, flags). The battle is scenery only:
// nothing here can hurt you, and nothing collides with it.
//
// The big layers are painted once (the first time the level starts) and
// then only slide past. They're painted straight at double detail (one
// sharp pixel = half a game pixel), on canvases carried as `.hi` by
// normal-size stand-ins, like every picture in the game.

const H = 288; // the screen's height in sharp pixels
const FAR_W = 832; // the far view repeats every 832 sharp pixels (416 game pixels)
const GROUND_L = 1024; // the ground repeats every 1024 game pixels
export const SNOW_LINE = 131; // the top of the snowfield, in game pixels
export const SNOW_FLOOR = VIEW_H - SNOW_LINE; // the solid floor strip's height
const FAR_SPEED = 7; // game pixels a second
const CLOUD_SPEED = 2.5;
const FLAK_PUFFS = [[0, 0], [1.5, -1], [-1.5, 0.5], [0.5, 1.5]]; // a flak burst's smoke

let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRGB = (a, b, t) => {
  t = Math.max(0, Math.min(1, t));
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
};
const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mix = (a, b, t) => css(mixRGB(hex(a), hex(b), t));

// A sharp canvas (w x h sharp pixels) and its normal-size stand-in.
function sharp(w, h) {
  const hi = document.createElement('canvas');
  hi.width = w;
  hi.height = h;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w / 2);
  canvas.height = Math.ceil(h / 2);
  canvas.hi = hi;
  return { canvas, c: hi.getContext('2d') };
}

// Painting thousands of single pixels with fillRect is slow on a phone, so
// the heavy parts of the far view are painted into a pixel buffer first
// (with see-through colours blended in), then put on the canvas in one go.
function raster(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  return {
    // rgb: [r, g, b]; a: opacity 0..1. x wraps round (the layer repeats).
    put(x, y, rgb, a = 1, pw = 1, ph = 1) {
      for (let j = 0; j < ph; j++) {
        const yy = Math.round(y) + j;
        if (yy < 0 || yy >= h) continue;
        for (let i = 0; i < pw; i++) {
          const xx = (((Math.round(x) + i) % w) + w) % w;
          const k = (yy * w + xx) * 4;
          const old = data[k + 3] / 255;
          const out = a + old * (1 - a);
          for (let c = 0; c < 3; c++) data[k + c] = out ? (rgb[c] * a + data[k + c] * old * (1 - a)) / out : 0;
          data[k + 3] = out * 255;
        }
      }
    },
    paint(ctx) {
      ctx.putImageData(new ImageData(data, w, h), 0, 0);
    },
  };
}

// ---------------------------------------------------------------- the sky
function paintSky() {
  const { canvas, c } = sharp(416, H);
  const px = (x, y, col, w = 1, h = 1) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  for (let y = 0; y < H; y++) {
    const t = y / 190;
    px(0, y, t < 0.6 ? mix('#6383b0', '#a9c3de', t / 0.6) : mix('#a9c3de', '#e2ecf5', (t - 0.6) / 0.4), 416);
  }
  // Frostring's ring, the one you just freed, arcing high across the sky.
  for (const [ry, a, w] of [[0, 0.3, 9], [11, 0.18, 4], [-8, 0.16, 3], [5, 0.12, 1]]) {
    c.strokeStyle = `rgba(240,246,252,${a})`;
    c.lineWidth = w;
    c.beginPath();
    c.ellipse(170, 260 + ry, 330, 214, -0.18, Math.PI * 1.06, Math.PI * 1.62);
    c.stroke();
  }
  seed = 4;
  for (let i = 0; i < 160; i++) {
    // ice glitter in the ring
    const t = Math.PI * (1.06 + rnd() * 0.56);
    const r = 1 + (rnd() - 0.5) * 0.05;
    const x = 170 + Math.cos(t) * 330 * r * Math.cos(-0.18) - Math.sin(t) * 214 * r * Math.sin(-0.18);
    const y = 260 + Math.cos(t) * 330 * r * Math.sin(-0.18) + Math.sin(t) * 214 * r * Math.cos(-0.18);
    if (y < 150) px(Math.round(x), Math.round(y), `rgba(255,255,255,${0.25 + rnd() * 0.4})`);
  }
  seed = 5;
  for (let i = 0; i < 34; i++) {
    // high wispy cloud
    const y = 18 + rnd() * 130;
    const x = rnd() * 416;
    c.fillStyle = `rgba(236,244,250,${0.1 + rnd() * 0.12})`;
    c.fillRect(x, y, 24 + rnd() * 70, 1);
  }
  // The sun with its ice halo, sun dogs and pillar (very cold air).
  const sx = 296;
  const sy = 46;
  for (const [r, a] of [[30, 0.1], [20, 0.2], [13, 0.4]]) {
    c.fillStyle = `rgba(250,246,236,${a})`;
    c.beginPath();
    c.arc(sx, sy, r, 0, 7);
    c.fill();
  }
  c.fillStyle = '#fbf8ef';
  c.beginPath();
  c.arc(sx, sy, 8, 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(244,236,220,0.5)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(sx, sy, 44, 0, 7);
  c.stroke();
  c.strokeStyle = 'rgba(230,180,140,0.22)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(sx, sy, 46, 0, 7);
  c.stroke();
  for (const d of [-44, 44]) {
    c.fillStyle = 'rgba(250,240,220,0.75)';
    c.fillRect(sx + d - 2, sy - 2, 4, 4);
    c.fillStyle = 'rgba(250,240,220,0.3)';
    c.fillRect(sx + d - (d < 0 ? 8 : -4), sy - 1, 4, 2);
  }
  c.fillStyle = 'rgba(250,246,236,0.16)';
  c.fillRect(sx - 2, sy - 34, 4, 26);
  c.fillRect(sx - 2, sy + 8, 4, 40);
  return canvas;
}

// Long flat banks of cloud, lit on top, thin enough to see the sky through.
function paintClouds() {
  const W = FAR_W;
  const { canvas, c } = sharp(W, 120);
  seed = 61;
  for (let k = 0; k < 7; k++) {
    const x0 = (k / 7) * W + rnd() * 50;
    const y0 = 30 + rnd() * 60;
    const n = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (14 + rnd() * 10);
      const y = y0 + (rnd() - 0.5) * 4;
      const rx = 16 + rnd() * 16;
      const ry = 2.5 + rnd() * 2.5;
      for (const [dy, col, kx] of [[1.5, 'rgba(150,176,206,0.16)', 1], [0, 'rgba(232,240,248,0.24)', 1], [-1.5, 'rgba(250,252,254,0.22)', 0.7]]) {
        for (const off of [0, -W]) {
          c.fillStyle = col;
          c.beginPath();
          c.ellipse((((x % W) + W) % W) + off, y + dy, rx * kx, ry * kx, 0, 0, 7);
          c.fill();
        }
      }
    }
  }
  return canvas;
}

// ---------------------------------------------------------------- the far view
// Three mountain ranges, the glacier (blocks of ice with crevasses) and the
// defenders' bunkers on it, the frozen lake with its ice spires.
function paintFar() {
  const W = FAR_W;
  const { canvas, c } = sharp(W, H);
  const buf = raster(W, H);
  const WHITE = [255, 255, 255];
  // Three ranges, far to near; sunlit faces pale, shaded faces blue with
  // rock showing through.
  const range = (base, top, step, sd, lit, shade, snow, rock) => {
    seed = sd;
    const [L, S, N] = [hex(lit), hex(shade), hex(snow)];
    const R = rock && hex(rock);
    const n = W / step;
    const pts = [];
    let y = base - 24;
    for (let i = 0; i < n; i++) {
      y = Math.max(top, Math.min(base - 8, y + (rnd() - 0.5) * step * 2.6));
      pts.push(y);
    }
    const at = (x) => {
      const i = Math.floor(x / step);
      const t = (x % step) / step;
      return pts[i % n] + (pts[(i + 1) % n] - pts[i % n]) * t;
    };
    for (let x = 0; x < W; x++) {
      const yy = Math.round(at(x));
      const slope = at(x + 1) - at(x);
      const facing = slope > 0;
      const cap = Math.max(1, Math.round((base - 10 - yy) * 0.45));
      buf.put(x, yy, facing ? N : mixRGB(N, S, 0.35), 1, 1, cap);
      for (let y2 = yy + cap; y2 < base; y2++) {
        let col = mixRGB(facing ? L : S, S, ((y2 - yy) / (base - yy)) * 0.6);
        if (R && !facing && Math.abs(slope) > 0.6 && (x * 7 + y2 * 3) % 11 < 3) col = R;
        buf.put(x, y2, col);
      }
      if (rnd() < 0.08) buf.put(x, yy + cap + Math.round(rnd() * 6), [236, 244, 250], 0.6, 1, 2 + Math.round(rnd() * 5));
      if (facing && slope > 0.9) buf.put(x, yy, WHITE); // a lit ridge
    }
  };
  range(150, 92, 14, 9, '#c7d6e6', '#93aac4', '#eef3f8', null);
  range(178, 96, 11, 3, '#b4c8dd', '#6f8db0', '#eef4fa', '#5d7393');
  range(196, 128, 8, 17, '#a7bfd7', '#5f7fa6', '#e6eff7', '#4f6788');
  // The glacier: blocks of ice (seracs) with crevasses, strata and snow.
  seed = 23;
  const gTop = new Array(W).fill(170);
  const [I0, I1, I2, I3, I4, I5] = ['#d6e7f4', '#5f8dbb', '#eef5fb', '#8db4d8', '#9fc0de', '#3f6590'].map(hex);
  let x0 = 0;
  while (x0 < W) {
    let w = 10 + Math.round(rnd() * 16);
    if (W - (x0 + w) < 10) w = W - x0;
    const top = 146 + Math.round(rnd() * 26);
    const lean = (rnd() - 0.5) * 6;
    for (let x = x0; x < x0 + w; x++) {
      const u = (x - x0) / w;
      const tt = Math.round(top + Math.abs(u - 0.5 + lean / 20) * 8 + (rnd() < 0.2 ? 1 : 0));
      gTop[x] = tt;
      for (let y = tt; y < 216; y++) {
        const t = (y - tt) / (216 - tt);
        let col = mixRGB(I0, I1, t * 0.95);
        if (u < 0.18) col = mixRGB(I2, I3, t);
        else if (u > 0.82) col = mixRGB(I4, I5, t);
        if ((y - tt) % 11 === 5 && u > 0.18 && u < 0.82) col = mixRGB(col, WHITE, 0.25);
        if ((y - tt) % 11 === 6 && u > 0.2 && u < 0.8) col = mixRGB(col, I5, 0.12);
        buf.put(x, y, col);
      }
      buf.put(x, tt - 3, WHITE, 1, 1, 2);
      buf.put(x, tt - 1, I2, 1, 1, 2);
      if (u > 0.85) buf.put(x, tt - 1, hex('#cfe0ef'));
    }
    for (let y = top + 6; y < 214; y++) buf.put(x0 + w - 1, y, hex(y % 9 < 6 ? '#355a85' : '#2b4c74'));
    const cx = x0 + Math.round(w * (0.35 + rnd() * 0.3));
    const cl = 10 + rnd() * 30;
    for (let y = top + 8; y < top + 8 + cl; y++) {
      if (rnd() < 0.85) {
        buf.put(cx + (y % 7 === 0 ? 1 : 0), y, hex('#6f9cc6'));
        buf.put(cx + 1 + (y % 7 === 0 ? 1 : 0), y, [238, 246, 252], 0.45);
      }
    }
    for (let x = x0 + 2; x < x0 + w - 2; x += 3 + Math.round(rnd() * 3)) {
      const l = 2 + Math.round(rnd() * 5);
      buf.put(x, 216, hex('#b7d3ea'), 1, 1, l);
      buf.put(x, 216, hex('#e4f0f8'));
    }
    x0 += w;
  }
  buf.paint(c);
  // From here on, few enough pixels to paint on the canvas directly.
  const px = (x, y, col, w = 1, h = 1) => {
    c.fillStyle = col;
    c.fillRect(((x % W) + W) % W, y, w, h);
  };
  // The defenders' front line on top of the glacier: bunkers, twin guns,
  // searchlights, a mast with their flag.
  const guns = [];
  const lights = [];
  const bunker = (x, kind) => {
    const top = Math.round(gTop[x]);
    for (let i = -14; i <= 14; i++) {
      const h = 3 - Math.abs(i) / 7;
      px(x + i, top - Math.round(h), '#e8eff5', 1, Math.round(h) + 1);
    }
    c.fillStyle = '#0e1222';
    c.fillRect(x - 12, top - 11, 24, 11);
    c.fillStyle = '#5b6474';
    c.fillRect(x - 11, top - 10, 22, 10);
    c.fillStyle = '#7b8596';
    c.fillRect(x - 11, top - 10, 22, 2);
    c.fillRect(x - 11, top - 10, 2, 9);
    c.fillStyle = '#3c4350';
    c.fillRect(x - 11, top - 2, 22, 2);
    c.fillStyle = '#1c2029';
    c.fillRect(x - 7, top - 6, 9, 2); // the firing slit
    c.fillStyle = '#eef4fa';
    c.fillRect(x - 12, top - 12, 24, 2); // snow on the roof
    if (kind === 'aa') {
      c.fillStyle = '#4a5160';
      c.fillRect(x + 1, top - 15, 7, 4);
      for (const dy of [0, 3]) {
        c.strokeStyle = '#2b3039';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x + 6, top - 14 - dy);
        c.lineTo(x + 15, top - 22 - dy);
        c.stroke();
      }
      guns.push([(x + 16) / 2, (top - 24) / 2]);
    } else if (kind === 'light') {
      c.fillStyle = '#4a5160';
      c.fillRect(x, top - 16, 6, 6);
      c.fillStyle = '#f6e7c4';
      c.fillRect(x + 4, top - 15, 3, 3);
      lights.push([(x + 6) / 2, (top - 14) / 2]);
    } else {
      c.strokeStyle = '#3c4350';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - 4, top - 11);
      c.lineTo(x - 4, top - 32);
      c.stroke();
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(x - 8 + k, top - 26 + k * 4);
        c.lineTo(x - k, top - 26 + k * 4);
        c.stroke();
      }
      c.fillStyle = '#c98f4a';
      c.fillRect(x - 3, top - 32, 8, 4);
      c.fillStyle = '#e3a857';
      c.fillRect(x - 3, top - 32, 8, 1); // the defenders' amber flag
    }
  };
  [[64, 'aa'], [158, 'light'], [262, 'aa'], [346, 'mast'], [480, 'aa'], [574, 'aa'], [678, 'light'], [762, 'aa']].forEach(([x, k]) => bunker(x, k));
  // The frozen lake: smooth ice, reflections, cracks, wind-swept snow.
  for (let y = 214; y < H; y++) {
    c.fillStyle = mix('#b9d3e8', '#d9e8f3', (y - 214) / 36);
    c.fillRect(0, y, W, 1);
  }
  for (let x = 0; x < W; x++) px(x, 222 + (x % 3), 'rgba(111,156,198,0.25)', 1, Math.round((216 - gTop[x]) * 0.25));
  c.strokeStyle = 'rgba(79,122,166,0.55)';
  c.lineWidth = 1;
  seed = 41;
  for (let i = 0; i < 14; i++) {
    let x = 20 + rnd() * (W - 120);
    let y = 220 + rnd() * 26;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += 6 + rnd() * 10;
      y += (rnd() - 0.5) * 6;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  for (let i = 0; i < 18; i++) {
    const x = rnd() * W;
    const y = 218 + rnd() * 30;
    c.fillStyle = 'rgba(246,250,253,0.55)';
    c.fillRect(x, y, 10 + rnd() * 26, 1);
  }
  for (let i = 0; i < 80; i++) px(Math.floor(rnd() * W), Math.floor(216 + rnd() * 32), '#f4f9fd');
  const spire = (x, base, h, w) => {
    c.fillStyle = '#e4f0f8';
    c.beginPath();
    c.moveTo(x - w, base);
    c.lineTo(x, base - h);
    c.lineTo(x, base);
    c.fill();
    c.fillStyle = '#86aed2';
    c.beginPath();
    c.moveTo(x, base - h);
    c.lineTo(x + w, base);
    c.lineTo(x, base);
    c.fill();
    c.fillStyle = '#b7d3ea';
    c.beginPath();
    c.moveTo(x, base - h);
    c.lineTo(x + w * 0.35, base);
    c.lineTo(x, base);
    c.fill();
    px(x - 1, base - h + 2, '#ffffff', 1, 4);
    c.fillStyle = 'rgba(134,174,210,0.35)';
    c.fillRect(x - w, base, w * 2, 2); // its reflection
  };
  spire(36, 236, 46, 8);
  spire(48, 238, 28, 6);
  spire(332, 232, 52, 9);
  spire(345, 236, 30, 6);
  spire(140, 230, 22, 5);
  spire(520, 234, 40, 7);
  spire(700, 236, 34, 7);
  spire(712, 238, 20, 5);
  for (let y = 206; y < 226; y++) {
    const a = 0.32 * Math.sin(((y - 206) / 20) * Math.PI);
    c.fillStyle = `rgba(236,243,249,${a.toFixed(3)})`;
    c.fillRect(0, y, W, 1);
  }
  return { canvas, guns, lights };
}

// ---------------------------------------------------------------- the near ground
// The flat snowfield, with the battle's leftovers on it. Scenery only: you
// fly through it all and your shots pass through it (owner: a solid dark
// wreck hurt the ship and hid enemies from its shots), and the wrecks are
// pale and snow-dusted so they never look like an enemy.
function paintGround() {
  const W = GROUND_L * 2;
  const gy = SNOW_LINE * 2;
  const y0 = gy - 40; // the strip starts 20 game pixels above the snow, for things standing on it
  const { canvas, c } = sharp(W, H - y0);
  const px = (x, y, col, w = 1, h = 1) => {
    c.fillStyle = col;
    c.fillRect(((x % W) + W) % W, y - y0, w, h);
  };
  // The snow's layers (painted as full-width bands, not column by column).
  for (const [dy, col, h] of [[0, '#ffffff', 1], [1, '#f1f6fa', 5], [6, '#dde8f1', 4], [10, '#a8c7e2', 3], [13, '#7fa6cc', 4], [17, '#a8c7e2', 2], [19, '#5d86b2', 6], [25, '#3f6590', H]]) {
    c.fillStyle = col;
    c.fillRect(0, gy + dy - y0, W, h);
  }
  for (let x = 0; x < W; x++) {
    if ((x * 5) % 17 === 0) px(x, gy + 2, '#cfdeec');
    if ((x * 11) % 37 === 0) px(x, gy + 14, '#d6e7f4', 1, 2);
    if ((x * 3) % 41 === 0) px(x, gy + 20, '#89b0d6', 1, 4);
    // wind ripples on the drifts
    if (Math.sin(x * 0.21) > 0.7 && x % 4 < 3) px(x, gy + 4, '#d3e0ec');
    if (Math.sin(x * 0.13 + 2) > 0.85 && x % 3 < 2) px(x, gy + 8, '#cbd9e7');
  }
  seed = 77;
  for (let i = 0; i < 150; i++) {
    const x = Math.round(rnd() * (W - 2)) + 1;
    const y = gy + 1 + Math.round(rnd() * 8);
    px(x, y, '#ffffff');
    if (rnd() < 0.3) {
      px(x - 1, y, 'rgba(255,255,255,0.6)');
      px(x + 1, y, 'rgba(255,255,255,0.6)');
    }
  }
  const P = (pts, col) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1] - y0);
    for (const p of pts.slice(1)) c.lineTo(p[0], p[1] - y0);
    c.closePath();
    c.fill();
  };
  const R = (x, y, w, h, col) => {
    c.fillStyle = col;
    c.fillRect(x, y - y0, w, h);
  };
  const snowCap = (xa, xb, y) => {
    for (let x = xa; x < xb; x++) R(x, y - 1 - (Math.sin(x * 0.7) > 0.3 ? 1 : 0), 1, 2, '#f7fafd');
  };
  const deco = [];
  // 1. a landing ship's wreck, nose down in the snow (it smokes)
  const wreck = (wx) => {
    const wy = gy + 4;
    P([[wx - 30, wy], [wx - 26, wy - 16], [wx - 6, wy - 26], [wx + 22, wy - 22], [wx + 30, wy - 8], [wx + 26, wy]], '#98a2b2');
    P([[wx - 26, wy - 16], [wx - 6, wy - 26], [wx - 4, wy - 22], [wx - 22, wy - 13]], '#b4bdca');
    P([[wx + 22, wy - 22], [wx + 30, wy - 8], [wx + 26, wy], [wx + 18, wy], [wx + 20, wy - 14]], '#808a9a');
    P([[wx - 2, wy - 25], [wx + 4, wy - 24], [wx + 2, wy], [wx - 4, wy]], '#768090');
    P([[wx + 6, wy - 23], [wx + 9, wy - 23], [wx + 7, wy], [wx + 4, wy]], '#768090');
    P([[wx - 30, wy], [wx - 26, wy - 16], [wx - 16, wy - 21], [wx - 18, wy]], '#808a9a');
    P([[wx - 26, wy - 16], [wx - 16, wy - 21], [wx - 16, wy - 17], [wx - 23, wy - 13]], '#98a2b2');
    P([[wx - 18, wy - 8], [wx - 8, wy - 14], [wx - 2, wy - 6], [wx - 10, wy - 2]], '#636c7c'); // a torn hole
    R(wx - 12, wy - 9, 3, 2, '#e3a857');
    R(wx - 11, wy - 9, 1, 1, '#f6dcae');
    for (let x = wx - 34; x < wx + 34; x++) R(x, wy - 1, 1, 3, '#f7fafd');
    snowCap(wx - 24, wx + 18, wy - 18);
    deco.push({ kind: 'smoke', x: (wx - 10) / 2, y: (wy - 10) / 2 });
  };
  // 2. tank traps: crossed steel beams, half buried
  const trap = (x) => {
    const y = gy + 2;
    c.strokeStyle = '#3c4350';
    c.lineWidth = 3;
    for (const [a, b] of [[[-8, 0], [6, -14]], [[8, 0], [-6, -14]], [[-9, -5], [9, -5]]]) {
      c.beginPath();
      c.moveTo(x + a[0], y + a[1] - y0);
      c.lineTo(x + b[0], y + b[1] - y0);
      c.stroke();
    }
    c.strokeStyle = '#6f7888';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - 7, y - 2 - y0);
    c.lineTo(x + 5, y - 13 - y0);
    c.stroke();
    R(x - 8, y - 14, 4, 1, '#f7fafd');
    R(x + 4, y - 14, 4, 1, '#f7fafd');
    R(x - 2, y - 6, 4, 1, '#f7fafd');
    for (let i = -8; i <= 8; i++) R(x + i, y - 1 + Math.round(Math.abs(i) / 4), 1, 3, '#f1f6fa');
  };
  // 3. a sandbag wall with snow on it
  const bags = (x) => {
    const y = gy + 2;
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 4 - r; i++) {
        const bx = x - 14 + r * 4 + i * 8;
        const by = y - 5 - r * 5;
        c.fillStyle = '#8a8170';
        c.beginPath();
        c.ellipse(bx + 4, by + 2 - y0, 4.4, 2.6, 0, 0, 7);
        c.fill();
        c.fillStyle = '#a99f8b';
        c.fillRect(bx + 1, by - y0, 6, 1);
      }
    }
    snowCap(x - 10, x + 14, y - 11);
  };
  // 4. the defenders' toppled radar dish
  const dish = (x) => {
    const y = gy + 3;
    c.strokeStyle = '#4a5160';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 2, y - y0);
    c.lineTo(x + 6, y - 10 - y0);
    c.stroke();
    c.fillStyle = '#9aa3b2';
    c.beginPath();
    c.ellipse(x + 9, y - 13 - y0, 9, 4, -0.7, Math.PI, 0);
    c.fill();
    c.fillStyle = '#c3cad5';
    c.beginPath();
    c.ellipse(x + 9, y - 14 - y0, 7, 2.6, -0.7, Math.PI, 0);
    c.fill();
    snowCap(x + 3, x + 15, y - 19);
    for (let i = -6; i <= 14; i++) R(x + i, y - 1, 1, 3, '#f1f6fa');
  };
  // 5. a scorched shell crater
  const crater = (x) => {
    const y = gy + 3;
    c.fillStyle = 'rgba(62,66,78,0.55)';
    c.beginPath();
    c.ellipse(x, y - y0, 16, 4, 0, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(40,42,50,0.7)';
    c.beginPath();
    c.ellipse(x, y + 1 - y0, 9, 2.4, 0, 0, 7);
    c.fill();
    for (const [dx, dy] of [[-18, -1], [17, 0], [-12, -3], [13, -2]]) R(x + dx, y + dy, 2, 1, '#5a6070');
  };
  // 6. the defenders' flag on a pole, still standing (it waves: drawn live)
  const flag = (x) => {
    const y = gy + 2;
    R(x, y - 30, 1, 30, '#3c4350');
    R(x + 1, y - 30, 1, 30, '#6f7888');
    deco.push({ kind: 'flag', x: (x + 2) / 2, y: (y - 30) / 2 });
    for (let i = -4; i <= 4; i++) R(x + i, y - 1, 1, 3, '#f7fafd');
  };
  wreck(260);
  trap(430);
  trap(452);
  bags(560);
  crater(700);
  dish(820);
  flag(940);
  wreck(1180);
  bags(1330);
  trap(1460);
  crater(1560);
  trap(1700);
  flag(1820);
  dish(1940);
  return { canvas, top: y0 / 2, deco };
}

// ---------------------------------------------------------------- landing ships
// An invader landing ship, in the Iron Wolves' paint (gunmetal, hazard
// seams, a red eye), with engine pods and thrusters underneath. s: its
// scale (nearer ships are bigger).
function paintLander(s) {
  const w = Math.ceil(32 * s) + 4;
  const h = Math.ceil(16 * s) + 4;
  const { canvas, c } = sharp(w + (w % 2), h + (h % 2));
  const x = w / 2;
  const y = h / 2 - s;
  const P = (pts, col) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
    for (const p of pts.slice(1)) c.lineTo(x + p[0] * s, y + p[1] * s);
    c.closePath();
    c.fill();
  };
  const Rr = (x0, y0, ww, hh, col) => {
    c.fillStyle = col;
    c.fillRect(x + x0 * s, y + y0 * s, ww * s, hh * s);
  };
  for (const px0 of [-6, 5]) {
    P([[px0 - 1, 2], [px0 + 5, 2], [px0 + 4.4, 5.6], [px0 - 0.4, 5.6]], '#202a32');
    P([[px0 - 0.4, 2.4], [px0 + 4.4, 2.4], [px0 + 3.9, 5], [px0 + 0.1, 5]], '#3b4548');
  }
  P([[-15, 1], [-10, -5.6], [9, -6.4], [15.4, -2], [14.4, 4], [-12, 4]], '#202a32');
  P([[-14, 1], [-9.5, -4.8], [8.6, -5.6], [14.2, -1.8], [13.2, 3.2], [-11, 3.2]], '#4e5461');
  P([[-13.2, 0], [-9.2, -4.8], [8.6, -5.6], [10.4, -3.6], [-7.6, -2.8]], '#6a717e');
  P([[-11, 2], [13.2, 1.6], [13.2, 3.2], [-11, 3.2]], '#383d48');
  P([[-14, 1], [-9.5, -4.8], [-4.6, -5], [-5.6, 3.2], [-11, 3.2]], '#383d48');
  P([[-13.2, 0], [-9.2, -4.8], [-4.6, -5], [-4.9, -2.6], [-8, -2.4]], '#4e5461');
  Rr(-0.5, -5.2, 1, 7.4, '#cf8f3c');
  Rr(1.2, -5.3, 0.6, 7.5, '#cf8f3c');
  Rr(9, -2.6, 4, 4, '#2c3539');
  for (let k = 0; k < 2; k++) Rr(9.4, -1.8 + k * 1.6, 3.2, 0.6, '#596264');
  Rr(-11, -1.4, 4, 0.9, '#c8643f');
  Rr(-11, -1.4, 1, 0.9, '#ffd9a8');
  Rr(2, -4.6, 1, 0.8, '#d99b43');
  Rr(7.4, 0.2, 1, 0.8, '#d99b43');
  for (const tx of [-4, 7]) Rr(tx - 1, 5.4, 2, 1, 'rgba(241,214,154,0.95)');
  // Hazed with the sky's colour (more the further away), so a distant
  // landing ship never looks like an enemy you have to dodge.
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = `rgba(160,184,212,${(0.62 - s * 0.22).toFixed(2)})`;
  c.fillRect(0, 0, w + 1, h + 1);
  c.globalCompositeOperation = 'source-over';
  return { canvas, s, thrusters: [-4, 7].map((tx) => (x + (tx - 0.6) * s) / 2), thrustY: (y + 6.4 * s) / 2 };
}

// A searchlight beam: a thin wedge fading out along its length, pointing
// right from its base (turned to aim it). Painted once.
function paintBeam() {
  const L = 150;
  const { canvas, c } = sharp(L, 24);
  const g = c.createLinearGradient(0, 0, L, 0);
  g.addColorStop(0, 'rgba(250,244,226,0.34)');
  g.addColorStop(1, 'rgba(250,244,226,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, 12);
  c.lineTo(L, 12 - L * Math.tan(0.07));
  c.lineTo(L, 12 + L * Math.tan(0.07));
  c.fill();
  return canvas;
}

// Everything above, painted once (the first time the level starts: about a
// tenth of a second on a phone, before play begins).
let ART = null;
export function whiteFrontArt() {
  if (!ART) {
    const far = paintFar();
    ART = {
      sky: paintSky(),
      clouds: paintClouds(),
      far: far.canvas,
      guns: far.guns,
      lights: far.lights,
      ground: paintGround(),
      ships: [1.3, 0.95, 0.65].map(paintLander),
      beam: paintBeam(),
    };
  }
  return ART;
}

// Round puffs of smoke (and flak flashes), painted once per colour and size
// (in half-pixel steps of radius) and drawn see-through as they fade:
// one drawing call each, instead of one per row.
const discs = new Map();
function puff(ctx, snap, color, x, y, r, alpha) {
  const ri = Math.max(1, Math.min(14, Math.round(r * 2)));
  const key = color + ri;
  let img = discs.get(key);
  if (!img) {
    const size = Math.ceil(ri / 2) * 2;
    const d = detailCanvas(size, size);
    d.ctx.fillStyle = color;
    fillDisc(d.ctx, size / 2, size / 2, ri / 2);
    img = d.canvas;
    discs.set(key, img);
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, snap(x) - img.width / 2, snap(y) - img.height / 2);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- the live battle
// The moving parts, in game pixels. Uses its own dice (not the game's), so
// scenery can never change what happens in play; drawing uses Math.random.
export class WhiteFront {
  constructor() {
    this.art = whiteFrontArt();
    this.rand = seeded(404);
    this.t = 0;
    this.farX = 0;
    this.groundX = 0;
    this.ships = [];
    this.tracers = [];
    this.flak = [];
    this.puffs = [];
    this.powder = [];
    this.gunT = this.art.guns.map((_, i) => 0.4 + i * 0.55);
    this.shipT = 4;
    for (let i = 0; i < 3; i++) this.addShip(25 + i * 75);
    this.snow = [];
    for (let i = 0; i < 30; i++) this.snow.push(this.newFlake(this.rand() * VIEW_W));
  }

  addShip(x = VIEW_W + 7) {
    const r = this.rand;
    const k = Math.floor(r() * 3);
    this.ships.push({ k, x, y: 11 + r() * 25 + k * 5, vx: -(2.5 + r() * 3.5) * (1 - k * 0.2), vy: 0.5 + r() * 0.7, hit: 0 });
  }

  newFlake(x) {
    const depth = this.rand();
    return { x, y: HUD_H + this.rand() * (SNOW_LINE - HUD_H), vx: 8 + depth * 18, vy: 4 + depth * 6, near: depth > 0.7, phase: this.rand() * 6 };
  }

  update(dt) {
    const r = this.rand;
    this.t += dt;
    this.farX = (this.farX + FAR_SPEED * dt) % (FAR_W / 2);
    this.groundX = (this.groundX + GROUND_SPEED * dt) % GROUND_L;
    // Landing ships come down slowly in the distance.
    if ((this.shipT -= dt) <= 0) {
      this.shipT = 6 + r() * 5;
      if (this.ships.length < 4) this.addShip();
    }
    for (const sh of this.ships) {
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      if (sh.hit && r() < dt * 10) {
        const im = this.art.ships[sh.k].canvas;
        this.puffs.push({ x: sh.x + im.width * 0.7, y: sh.y + 1.5, r: 0.8, life: 1.4, max: 1.4, vx: 1.5, vy: -2.5, a: 0.4 });
      }
    }
    this.ships = this.ships.filter((sh) => sh.x > -45 && sh.y < 85);
    // The bunkers' guns fire bursts of tracer at the ships; flak bursts
    // where they end.
    const fw = FAR_W / 2;
    this.art.guns.forEach(([gx, gy], i) => {
      if ((this.gunT[i] -= dt) > 0) return;
      this.gunT[i] = 1.4 + r() * 2.2;
      for (const k of [0, 1]) {
        const x = gx - this.farX + k * fw;
        if (x < 3 || x > VIEW_W - 3) continue;
        const near = this.ships.filter((sh) => sh.x > x - 20 && sh.x < x + 120);
        const tg = near.length ? near[Math.floor(r() * near.length)] : null;
        const im = tg && this.art.ships[tg.k].canvas;
        const tx = tg ? tg.x + im.width / 2 + (r() - 0.5) * 12 : x + 25 + r() * 60;
        const ty = tg ? tg.y + 2 + (r() - 0.5) * 8 : 8 + r() * 30;
        for (let j = 0; j < 5; j++) this.tracers.push({ x, y: gy, tx, ty, d: -j * 0.07, last: j === 4, ship: tg, px: x, py: gy });
      }
    });
    for (const tr of this.tracers) {
      tr.d += dt;
      if (tr.d < 0) continue;
      const len = Math.hypot(tr.tx - tr.x, tr.ty - tr.y) || 1;
      const k = Math.min(1, (tr.d * 100) / len);
      tr.px = tr.x + (tr.tx - tr.x) * k;
      tr.py = tr.y + (tr.ty - tr.y) * k;
      if (k >= 1) {
        tr.done = true;
        if (tr.last) {
          this.flak.push({ x: tr.tx, y: tr.ty, t: 0 });
          if (tr.ship && r() < 0.08) tr.ship.hit = 1;
        }
      }
    }
    this.tracers = this.tracers.filter((tr) => !tr.done);
    for (const f of this.flak) f.t += dt;
    this.flak = this.flak.filter((f) => f.t < 1.2);
    // The wrecks smoke; powder blows off the snow.
    for (const d of this.art.ground.deco) {
      if (d.kind !== 'smoke' || r() >= dt * 5) continue;
      for (const k of [0, 1]) {
        const x = d.x - this.groundX + k * GROUND_L;
        if (x < -10 || x > VIEW_W + 10) continue;
        this.puffs.push({ x, y: d.y, r: 1, life: 2.4, max: 2.4, vx: -2, vy: -6, a: 0.45, ground: true });
      }
    }
    for (const p of this.puffs) {
      p.life -= dt;
      p.x += p.vx * dt - (p.ground ? GROUND_SPEED * dt : 0);
      p.y += p.vy * dt;
      p.r += dt * 1.2;
    }
    this.puffs = this.puffs.filter((p) => p.life > 0);
    if (r() < dt * 6) this.powder.push({ x: 20 + r() * 90, y: SNOW_LINE - 0.5, vx: -22 - r() * 14, vy: -4 - r() * 6, life: 0.9, max: 0.9 });
    for (const p of this.powder) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 45 * dt;
    }
    this.powder = this.powder.filter((p) => p.life > 0);
    for (let i = 0; i < this.snow.length; i++) {
      const f = this.snow[i];
      f.x -= f.vx * dt;
      f.y += (f.vy + Math.sin(this.t * 1.5 + f.phase) * 3) * dt;
      if (f.x < -2 || f.y > SNOW_LINE) this.snow[i] = { ...this.newFlake(VIEW_W + 2), y: HUD_H + this.rand() * (SNOW_LINE - HUD_H) * 0.8 };
    }
  }

  // The sky, the distant battle and the far view (behind everything).
  drawBack(ctx, snap) {
    const a = this.art;
    ctx.drawImage(a.sky, 0, 0);
    const cw = a.clouds.width;
    const cx = (this.t * CLOUD_SPEED) % cw;
    for (let x = -cx; x < VIEW_W; x += cw) ctx.drawImage(a.clouds, snap(x), -19);
    for (const sh of this.ships) {
      const im = a.ships[sh.k];
      ctx.globalAlpha = 0.88 - sh.k * 0.1;
      ctx.drawImage(im.canvas, snap(sh.x), snap(sh.y));
      ctx.globalAlpha = 1;
      if (Math.random() < 0.5) {
        // thruster flames flickering
        ctx.fillStyle = 'rgba(242,207,138,0.45)';
        for (const tx of im.thrusters) ctx.fillRect(snap(sh.x + tx), snap(sh.y + im.thrustY), FINE, 1 + Math.floor(Math.random() * 3) * FINE);
      }
    }
    // Searchlights sweeping the sky from the glacier.
    const fw = FAR_W / 2;
    a.lights.forEach(([lx, ly], i) => {
      for (const k of [0, 1]) {
        const x = lx - this.farX + k * fw;
        if (x < -30 || x > VIEW_W + 30) continue;
        ctx.save();
        ctx.translate(snap(x), snap(ly));
        ctx.rotate(-1.75 + Math.sin(this.t * 0.45 + i * 1.9) * 0.5);
        ctx.drawImage(a.beam, 0, -6);
        ctx.restore();
      }
    });
    for (let x = -this.farX; x < VIEW_W; x += fw) ctx.drawImage(a.far, snap(x), 0);
    for (const p of this.puffs) {
      if (!p.ground) puff(ctx, snap, '#565a66', p.x, p.y, p.r, p.a * (p.life / p.max));
    }
    for (const f of this.flak) {
      const k = f.t / 1.2;
      if (f.t < 0.08) puff(ctx, snap, '#fff1cf', f.x, f.y, 2, 1);
      for (const [dx, dy] of FLAK_PUFFS) puff(ctx, snap, '#464a54', f.x + dx * (1 + k), f.y + dy * (1 + k), 1.2 + k * 2, 0.7 * (1 - k));
    }
    ctx.fillStyle = '#f1d69a';
    ctx.beginPath(); // (every tracer in one go)
    for (const tr of this.tracers) {
      if (tr.d < 0) continue;
      const ang = Math.atan2(tr.ty - tr.y, tr.tx - tr.x);
      for (let i = 0; i < 3; i++) ctx.rect(snap(tr.px - Math.cos(ang) * i), snap(tr.py - Math.sin(ang) * i), FINE * (i ? 1 : 2), FINE * (i ? 1 : 2));
    }
    ctx.fill();
  }

  // The snowfield and what stands on it (in front of the far view, behind
  // the enemies), plus falling snow.
  drawGround(ctx, snap) {
    const g = this.art.ground;
    for (let x = -this.groundX; x < VIEW_W; x += GROUND_L) ctx.drawImage(g.canvas, snap(x), g.top);
    for (const p of this.puffs) {
      if (p.ground) puff(ctx, snap, '#5c606c', p.x, p.y, p.r, p.a * (p.life / p.max));
    }
    // The defenders' flags, waving.
    for (const d of g.deco) {
      if (d.kind !== 'flag') continue;
      for (const k of [0, 1]) {
        const x = snap(d.x - this.groundX + k * GROUND_L);
        if (x < -10 || x > VIEW_W + 4) continue;
        ctx.fillStyle = '#c98f4a';
        ctx.beginPath();
        for (let i = 0; i < 12; i++) ctx.rect(x + i * FINE, snap(d.y + Math.sin(i * 0.6 - this.t * 7) * 0.7 * (i / 12)), FINE, 3.5);
        ctx.fill();
        ctx.fillStyle = '#e3a857';
        ctx.fillRect(x, d.y + FINE, 1.5, FINE);
      }
    }
    // Blowing powder and falling snow (each colour in one go).
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (const p of this.powder) ctx.rect(snap(p.x), snap(p.y), FINE, FINE);
    for (const f of this.snow) if (f.near) ctx.rect(snap(f.x), snap(f.y), FINE, FINE);
    ctx.fill();
    ctx.fillStyle = '#e3ecf4';
    ctx.beginPath();
    for (const f of this.snow) if (!f.near) ctx.rect(snap(f.x), snap(f.y), FINE, FINE);
    ctx.fill();
  }
}

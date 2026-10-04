import { PAL } from './config.js?v=0.2.0';

// Asteroids and Rockjaw are drawn by code rather than by hand: a lumpy
// circle, shaded from the top-left with a pixel-art checkerboard "dither"
// between shades, plus a few craters. A fixed random seed means each rock
// looks the same every time the game loads.

const ROCK_SHADES = ['#2b2530', '#4d3f45', '#75605f', '#9c8478'];
// Asteroids you can crash into are lighter and warmer, so they stand out
// clearly from the harmless background rocks.
const NEAR_SHADES = ['#4d3f45', '#75605f', '#9c8478', '#c4a68e'];
const LIGHT = [-0.62, -0.78];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Radius at a given angle: a circle with smooth bumps.
function lumpy(rand, r, bumps = 5, amount = 0.16) {
  const waves = [];
  for (let i = 0; i < bumps; i++) {
    waves.push({ k: 1 + Math.floor(rand() * 4), p: rand() * Math.PI * 2, a: (rand() - 0.3) * amount });
  }
  return (ang) => r * (1 + waves.reduce((sum, w) => sum + Math.sin(ang * w.k + w.p) * w.a, 0));
}

function shadeIndex(nx, ny, x, y, levels) {
  const lit = -(nx * LIGHT[0] + ny * LIGHT[1]); // -1 (dark) .. 1 (lit)
  let v = (lit + 1) / 2 * (levels - 0.01);
  // Dither: nudge alternate pixels so bands blend like old pixel art.
  if ((x + y) % 2 === 0) v += 0.35;
  return Math.max(0, Math.min(levels - 1, Math.floor(v)));
}

function makeCraters(rand, r, count) {
  const craters = [];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * r * 0.55;
    craters.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: 1.2 + rand() * r * 0.22 });
  }
  return craters;
}

// Paint one rock into a canvas. `mouth` (0..1) cuts an open jaw on the left.
function paintRock(r, seed, { craters = 3, mouth = -1, eye = false, flash = false, shades = ROCK_SHADES } = {}) {
  const rand = seeded(seed);
  const radiusAt = lumpy(rand, r);
  const cr = makeCraters(rand, r, craters);
  const size = Math.ceil(r * 1.4) * 2 + 3;
  const c0 = Math.floor(size / 2);
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  const inside = (px, py) => {
    const dx = px - c0;
    const dy = py - c0;
    return Math.hypot(dx, dy) <= radiusAt(Math.atan2(dy, dx));
  };
  const jawAngle = mouth >= 0 ? 0.12 + mouth * 0.62 : 0; // half-opening in radians
  const inMouth = (dx, dy) => {
    if (mouth < 0) return false;
    const ang = Math.atan2(dy, -dx); // 0 = pointing left
    const dist = Math.hypot(dx, dy);
    return dist > r * 0.08 && Math.abs(ang) < jawAngle && dx < 0;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inside(x, y)) continue;
      const dx = x - c0;
      const dy = y - c0;
      let color;
      if (flash) {
        color = PAL.cream;
      } else if (inMouth(dx, dy)) {
        const depth = Math.hypot(dx, dy) / r;
        color = depth < 0.45 ? '#2a1418' : depth < 0.8 ? '#4a2228' : PAL.redDark;
      } else {
        const d = Math.hypot(dx, dy) || 1;
        let idx = shadeIndex(dx / d, dy / d, x, y, shades.length);
        for (const c of cr) {
          const cd = Math.hypot(dx - c.x, dy - c.y);
          if (cd < c.r) idx = Math.max(0, idx - 1);
          else if (cd < c.r + 1 && dx - c.x > 0 && dy - c.y > 0) idx = Math.min(3, idx + 1);
        }
        color = shades[idx];
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  if (!flash && mouth >= 0) {
    // Teeth along both jaw edges.
    ctx.fillStyle = PAL.cream;
    const teeth = Math.max(2, Math.round(r / 5));
    for (let i = 1; i <= teeth; i++) {
      const dist = r * (0.3 + (0.62 * i) / teeth);
      for (const side of [-1, 1]) {
        const a = Math.PI + side * jawAngle;
        const tx = Math.round(c0 + Math.cos(a) * dist);
        const ty = Math.round(c0 + Math.sin(a) * dist);
        if (mouth < 0.1) {
          ctx.fillRect(tx, ty, 1, 1);
        } else {
          ctx.fillRect(tx, ty - (side < 0 ? 0 : 1), 1, 2);
        }
      }
    }
    if (mouth < 0.1) {
      // Closed: a dark seam where the jaw meets.
      ctx.fillStyle = PAL.ink;
      for (let x = 0; x < r * 0.9; x++) {
        const px = c0 - Math.round(radiusAt(Math.PI)) + x;
        if (inside(px, c0)) ctx.fillRect(px, c0 + (x % 4 === 0 ? 1 : 0), 1, 1);
      }
    }
  }

  if (!flash && eye) {
    // A small amber eye above the jaw.
    const ex = Math.round(c0 - r * 0.42);
    const ey = Math.round(c0 - r * 0.5);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(ex - 1, ey - 1, 5, 4);
    ctx.fillStyle = mouth > 0.5 ? PAL.amberLight : PAL.amber;
    ctx.fillRect(ex, ey, 3, 2);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(ex, ey, 1, 2);
  }

  // Dark outline so rocks read clearly against space.
  const img = ctx.getImageData(0, 0, size, size);
  const out = ctx.createImageData(size, size);
  out.data.set(img.data);
  const alpha = (x, y) => (x < 0 || y < 0 || x >= size || y >= size ? 0 : img.data[(y * size + x) * 4 + 3]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (alpha(x, y)) continue;
      if (alpha(x - 1, y) || alpha(x + 1, y) || alpha(x, y - 1) || alpha(x, y + 1)) {
        const i = (y * size + x) * 4;
        out.data[i] = 14;
        out.data[i + 1] = 18;
        out.data[i + 2] = 34;
        out.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return cv;
}

export const ROCKS = {
  big: [101, 202, 303].map((s) => paintRock(9, s, { craters: 3, shades: NEAR_SHADES })),
  small: [11, 22, 33, 44].map((s) => paintRock(5, s, { craters: 1, shades: NEAR_SHADES })),
};
ROCKS.bigFlash = ROCKS.big.map((_, i) => paintRock(9, [101, 202, 303][i], { flash: true }));
ROCKS.smallFlash = ROCKS.small.map((_, i) => paintRock(5, [11, 22, 33, 44][i], { flash: true }));

// Rockjaw: four jaw positions from shut to wide open, plus hit-flash copies.
const JAW_SEED = 777;
const JAW_R = 21;
export const ROCKJAW = {
  frames: [0, 0.35, 0.7, 1].map((m) => paintRock(JAW_R, JAW_SEED, { craters: 6, mouth: m, eye: true })),
  flash: [0, 0.35, 0.7, 1].map((m) => paintRock(JAW_R, JAW_SEED, { craters: 6, mouth: m, eye: true, flash: true })),
  radius: JAW_R,
};

// Distant, dim rocks for the background layer.
export const FAR_ROCKS = [5, 6, 7, 8].map((s, i) => {
  const r = 2 + Math.floor(i / 2);
  const cv = paintRock(r, s * 13, { craters: 0 });
  // Darken them heavily so they sit far behind the action.
  const ctx = cv.getContext('2d');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(20, 26, 46, 0.8)';
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
});

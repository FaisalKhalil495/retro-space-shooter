import { PAL } from './config.js?v=0.14.3';
import { seeded } from './util.js?v=0.14.3';

// Asteroids and Rockjaw are drawn by code rather than by hand: a lumpy
// circle, shaded from the top-left with a pixel-art checkerboard "dither"
// between shades, plus a few craters. A fixed random seed means each rock
// looks the same every time the game loads.

const ROCK_SHADES = ['#2b2530', '#4d3f45', '#75605f', '#9c8478'];
// Asteroids you can crash into are lighter and warmer, so they stand out
// clearly from the harmless background rocks.
const NEAR_SHADES = ['#4d3f45', '#75605f', '#9c8478', '#c4a68e'];
const LIGHT = [-0.62, -0.78];

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
  outline(ctx, size);
  return cv;
}

export const ROCKS = {
  big: [101, 202, 303].map((s) => paintRock(9, s, { craters: 3, shades: NEAR_SHADES })),
  small: [11, 22, 33, 44].map((s) => paintRock(5, s, { craters: 1, shades: NEAR_SHADES })),
};
ROCKS.bigFlash = ROCKS.big.map((_, i) => paintRock(9, [101, 202, 303][i], { flash: true }));
ROCKS.smallFlash = ROCKS.small.map((_, i) => paintRock(5, [11, 22, 33, 44][i], { flash: true }));

// ROCKJAW, painted by code. 4 jaw positions (shut .. wide open) for each of
// 3 damage stages (healthy, cracked, wrecked), plus pale hit-flash copies.
// He has a heavy brow, a slit red eye, jagged teeth and a raw red throat.
// As he's damaged, cracks open up showing molten rock, teeth go missing and
// finally his eye is shot out.
const JAW_R = 27;
const JAW_SEED = 9137;
const JAW_SHADES = ['#221d27', '#3b3139', '#5d4d50', '#85706a'];
const THROAT = ['#1e0a0d', '#3d1014', '#5a1a1e', '#7a2228'];
const LAVA = ['#8a3a22', '#b5562a', '#d9813f'];

function paintRockjaw(mouth, damage, flash) {
  const r = JAW_R;
  const rand = seeded(JAW_SEED);
  const radiusAt = lumpy(rand, r, 6, 0.12);
  const craters = makeCraters(rand, r, 7);
  const crackRand = seeded(JAW_SEED + 1);
  const size = Math.ceil(r * 1.3) * 2 + 3;
  const c0 = Math.floor(size / 2);
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d');
  const px = (x, y, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const inside = (x, y) => {
    const dx = x - c0;
    const dy = y - c0;
    return Math.hypot(dx, dy) <= radiusAt(Math.atan2(dy, dx));
  };
  const jaw = 0.06 + mouth * 0.6; // half-opening angle (radians)
  const inMouth = (dx, dy) => dx < 0 && Math.abs(Math.atan2(dy, -dx)) < jaw && Math.hypot(dx, dy) > r * 0.12;
  const eye = { x: Math.round(c0 - r * 0.38), y: Math.round(c0 - r * 0.46) };

  // Body and throat.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inside(x, y)) continue;
      const dx = x - c0;
      const dy = y - c0;
      if (flash) {
        px(x, y, PAL.cream);
        continue;
      }
      if (mouth > 0.05 && inMouth(dx, dy)) {
        const depth = Math.hypot(dx, dy) / r;
        let idx = depth < 0.35 ? 0 : depth < 0.6 ? 1 : depth < 0.85 ? 2 : 3;
        // A tongue along the lower jaw.
        if (dy > 0 && Math.atan2(dy, -dx) > jaw * 0.45 && depth > 0.3 && depth < 0.8) idx = 3;
        px(x, y, THROAT[idx]);
        continue;
      }
      const d = Math.hypot(dx, dy) || 1;
      let idx = shadeIndex(dx / d, dy / d, x, y, JAW_SHADES.length);
      for (const c of craters) {
        const cd = Math.hypot(dx - c.x, dy - c.y);
        if (cd < c.r) idx = Math.max(0, idx - 1);
        else if (cd < c.r + 1 && dx - c.x > 0 && dy - c.y > 0) idx = Math.min(3, idx + 1);
      }
      // Heavy brow: a dark ridge over the eye.
      if (y >= eye.y - 4 && y <= eye.y - 2 && x >= eye.x - 5 && x <= eye.x + 7) idx = 0;
      px(x, y, JAW_SHADES[idx]);
    }
  }

  if (!flash) {
    // Molten cracks (more of them the more damaged he is).
    const cracks = damage === 0 ? 0 : damage === 1 ? 5 : 10;
    for (let i = 0; i < cracks; i++) {
      let a = crackRand() * Math.PI * 2;
      let x = c0 + Math.cos(a) * r * 0.85;
      let y = c0 + Math.sin(a) * r * 0.85;
      const len = 6 + crackRand() * 10;
      for (let k = 0; k < len; k++) {
        a += (crackRand() - 0.5) * 1.2;
        x -= Math.cos(a) * 1.1;
        y -= Math.sin(a) * 1.1;
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (!inside(ix, iy) || inMouth(ix - c0, iy - c0)) continue;
        px(ix, iy, LAVA[k < 2 ? 0 : k % 3 === 0 ? 2 : 1]);
        if (k % 4 === 0 && inside(ix + 1, iy)) px(ix + 1, iy, LAVA[0]);
      }
    }

    // Teeth: jagged fangs along both jaws, pointing into the mouth.
    const teeth = 6;
    const missing = damage === 0 ? [] : damage === 1 ? [2] : [1, 2, 4];
    for (let i = 0; i < teeth; i++) {
      if (missing.includes(i)) continue;
      const dist = r * (0.3 + (0.68 * i) / (teeth - 1));
      if (mouth <= 0.05) {
        // Shut: upper and lower fangs interlock in a neat zig-zag.
        const tx = Math.round(c0 - dist);
        px(tx, c0 - 2, PAL.cream);
        px(tx, c0 - 1, PAL.cream);
        px(tx + 1, c0 - 1, '#c9b9a0');
        px(tx + 2, c0 + 1, PAL.cream);
        px(tx + 2, c0 + 2, PAL.cream);
        px(tx + 1, c0 + 1, '#c9b9a0');
        continue;
      }
      for (const side of [-1, 1]) {
        const a = Math.PI + side * jaw;
        const bx = c0 + Math.cos(a) * dist;
        const by = c0 + Math.sin(a) * dist;
        const long = i % 2 === 0 ? 4 : 3;
        for (let k = 0; k < long; k++) {
          // Fangs point towards the middle of the mouth.
          const tx = Math.round(bx);
          const ty = Math.round(by - side * k);
          px(tx, ty, k === 0 ? '#c9b9a0' : PAL.cream);
          if (k < long - 2) px(tx + 1, ty, '#c9b9a0');
        }
      }
    }
    if (mouth <= 0.05) {
      // Shut: a dark seam between the jaws.
      for (let x = 0; x < r * 0.95; x++) {
        const sx = c0 - Math.round(radiusAt(Math.PI)) + x;
        if (inside(sx, c0)) px(sx, c0 + (x % 5 === 0 ? 1 : 0), PAL.ink);
      }
    }

    // Eye: a slit red eye, or a bleeding empty socket once it's shot out.
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(eye.x - 1, eye.y - 1, 7, 5);
    if (damage < 1) {
      ctx.fillStyle = mouth > 0.5 ? '#c4453a' : '#9e2f2f';
      ctx.fillRect(eye.x, eye.y, 5, 3);
      ctx.fillStyle = PAL.amberLight;
      ctx.fillRect(eye.x + 2, eye.y, 1, 3);
    } else {
      ctx.fillStyle = '#1e0a0d';
      ctx.fillRect(eye.x, eye.y, 5, 3);
      ctx.fillStyle = '#7a2228';
      ctx.fillRect(eye.x + 1, eye.y + 1, 3, 1);
      // Blood running down from the socket.
      for (let k = 0; k < 7; k++) px(eye.x + 2, eye.y + 3 + k, k < 4 ? '#7a2228' : '#5a1a1e');
      px(eye.x + 3, eye.y + 4, '#5a1a1e');
    }
    // Blood drooling from the lower jaw once he's hurt.
    if (damage > 0 && mouth > 0.05) {
      const a = Math.PI - jaw;
      for (let k = 0; k < 3 + damage * 2; k++) {
        const dx = Math.round(c0 + Math.cos(a) * r * 0.75);
        const dy = Math.round(c0 + Math.sin(a) * r * 0.75) + k;
        px(dx, dy, k % 2 ? '#7a2228' : '#9e2f2f');
      }
    }
  }

  outline(ctx, size);
  return cv;
}

function outline(ctx, size) {
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
}

const JAWS = [0, 0.35, 0.7, 1];
export const ROCKJAW = {
  // frames[damage][jaw]
  frames: [0, 1, 2].map((dmg) => JAWS.map((m) => paintRockjaw(m, dmg, false))),
  flash: JAWS.map((m) => paintRockjaw(m, 0, true)),
  radius: JAW_R,
  eye: { dx: -JAW_R * 0.38 + 2, dy: -JAW_R * 0.46 + 1 },
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

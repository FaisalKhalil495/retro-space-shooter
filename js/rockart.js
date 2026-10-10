import { PAL } from './config.js?v=0.23.2';
import { seeded } from './util.js?v=0.23.2';
import { DETAIL, FINE, detailCanvas, pixels, grit } from './detail.js?v=0.23.2';

// Asteroids and Rockjaw are drawn by code rather than by hand: a lumpy
// circle, shaded from the top-left with a pixel-art checkerboard "dither"
// between shades, plus a few craters. A fixed random seed means each rock
// looks the same every time the game loads.
//
// Double detail (v0.21.0): everything is painted in half-pixel steps onto
// a sharp canvas (detailCanvas), with the same shapes, sizes and colours as
// before, plus finer craters, specks of grit and a one-half-pixel outline.

const ROCK_SHADES = ['#2b2530', '#4d3f45', '#75605f', '#9c8478'];
// Asteroids you can crash into are lighter and warmer, so they stand out
// clearly from the harmless background rocks.
const NEAR_SHADES = ['#4d3f45', '#75605f', '#9c8478', '#c4a68e'];
const LIGHT = [-0.62, -0.78];

// Every half pixel of a size x size picture: fx, fy count half pixels;
// (dx, dy) is the matching point in the old one-pixel grid relative to the
// centre c0, so shapes land exactly where they always did.
function eachFine(size, c0, fn) {
  const n = size * DETAIL;
  for (let fy = 0; fy < n; fy++) {
    for (let fx = 0; fx < n; fx++) fn(fx, fy, (fx + 0.5) / DETAIL - 0.5 - c0, (fy + 0.5) / DETAIL - 0.5 - c0);
  }
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

// Paint one rock. Returns a normal-size stand-in carrying the sharp
// picture (see detail.js).
function paintRock(r, seed, { craters = 3, flash = false, shades = ROCK_SHADES } = {}) {
  const rand = seeded(seed);
  const radiusAt = lumpy(rand, r);
  const cr = makeCraters(rand, r, craters);
  const size = Math.ceil(r * 1.4) * 2 + 3;
  const c0 = Math.floor(size / 2);
  const { canvas } = detailCanvas(size, size);
  const px = pixels(canvas);
  eachFine(size, c0, (fx, fy, dx, dy) => {
    if (Math.hypot(dx, dy) > radiusAt(Math.atan2(dy, dx))) return;
    let color = PAL.cream;
    if (!flash) {
      const d = Math.hypot(dx, dy) || 1;
      let idx = shadeIndex(dx / d, dy / d, fx, fy, shades.length);
      for (const c of cr) {
        // Craters: shadowed inside (deepest on the side away from the
        // light), with a thin lit rim on the far edge.
        const cd = Math.hypot(dx - c.x, dy - c.y);
        if (cd < c.r) idx = Math.max(0, idx - 1 - (cd < c.r * 0.5 && dx - c.x < 0 ? 1 : 0));
        else if (cd < c.r + FINE * 1.5 && dx - c.x > 0 && dy - c.y > 0) idx = Math.min(shades.length - 1, idx + 1);
      }
      // Specks of grit, lighter and darker.
      const g = grit(fx, fy, seed);
      if (g > 0.96) idx = Math.min(shades.length - 1, idx + 1);
      else if (g < 0.04) idx = Math.max(0, idx - 1);
      color = shades[idx];
    }
    px.set(fx, fy, color);
  });
  px.done();
  outline(canvas.hi);
  return canvas;
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
const THROAT = ['#1e0a0d', '#3d1014', '#5a1a1e', '#7a2228', '#9e2f2f'];
const LAVA = ['#8a3a22', '#b5562a', '#d9813f'];

// His stone body is the same in every picture, so its shading (shape,
// light, craters, grit and the heavy brow) is worked out once and shared.
const JAW_SIZE = Math.ceil(JAW_R * 1.3) * 2 + 3;
const JAW_C0 = Math.floor(JAW_SIZE / 2);
const JAW_EYE = { x: Math.round(-JAW_R * 0.38), y: Math.round(-JAW_R * 0.46) }; // relative to the centre
let jawBody = null;
function rockjawBody() {
  if (jawBody) return jawBody;
  const r = JAW_R;
  const rand = seeded(JAW_SEED);
  const radiusAt = lumpy(rand, r, 6, 0.12);
  const craters = makeCraters(rand, r, 7);
  const eye = JAW_EYE;
  const cells = [];
  eachFine(JAW_SIZE, JAW_C0, (fx, fy, dx, dy) => {
    if (Math.hypot(dx, dy) > radiusAt(Math.atan2(dy, dx))) return;
    const d = Math.hypot(dx, dy) || 1;
    let idx = shadeIndex(dx / d, dy / d, fx, fy, JAW_SHADES.length);
    for (const c of craters) {
      const cd = Math.hypot(dx - c.x, dy - c.y);
      if (cd < c.r) idx = Math.max(0, idx - 1 - (cd < c.r * 0.5 && dx - c.x < 0 ? 1 : 0));
      else if (cd < c.r + FINE * 1.5 && dx - c.x > 0 && dy - c.y > 0) idx = Math.min(3, idx + 1);
    }
    const g = grit(fx, fy, JAW_SEED);
    if (g > 0.965) idx = Math.min(3, idx + 1);
    else if (g < 0.035) idx = Math.max(0, idx - 1);
    // Heavy brow: a dark arched ridge over the eye.
    const bx = dx - eye.x - 1;
    const top = eye.y - 4 + (bx * bx) / 40;
    if (dx >= eye.x - 5 && dx <= eye.x + 7.5 && dy >= top && dy <= eye.y - 1.5) idx = 0;
    cells.push({ fx, fy, dx, dy, idx });
  });
  jawBody = { radiusAt, cells };
  return jawBody;
}

function paintRockjaw(mouth, damage, flash) {
  const r = JAW_R;
  const { radiusAt, cells } = rockjawBody();
  const crackRand = seeded(JAW_SEED + 1);
  const size = JAW_SIZE;
  const c0 = JAW_C0;
  const { canvas, ctx } = detailCanvas(size, size);
  // One half pixel at a point given relative to the centre, in the same
  // grid the shapes use.
  const dot = (dx, dy, c) => {
    const fx = Math.round((c0 + dx + 0.5) * DETAIL - 0.5);
    const fy = Math.round((c0 + dy + 0.5) * DETAIL - 0.5);
    ctx.fillStyle = c;
    ctx.fillRect(fx * FINE, fy * FINE, FINE, FINE);
  };
  const inside = (dx, dy) => Math.hypot(dx, dy) <= radiusAt(Math.atan2(dy, dx));
  const jaw = 0.06 + mouth * 0.6; // half-opening angle (radians)
  const inMouth = (dx, dy) => dx < 0 && Math.abs(Math.atan2(dy, -dx)) < jaw && Math.hypot(dx, dy) > r * 0.12;
  const eye = JAW_EYE;
  const open = !flash && mouth > 0.05;

  // Body and throat.
  const px = pixels(canvas);
  for (const { fx, fy, dx, dy, idx } of cells) {
    let col = JAW_SHADES[idx];
    if (flash) col = PAL.cream;
    else if (open && inMouth(dx, dy)) {
      const depth = Math.hypot(dx, dy) / r;
      let t = depth < 0.35 ? 0 : depth < 0.6 ? 1 : depth < 0.85 ? 2 : 3;
      // A tongue along the lower jaw, with a wet highlight on its top.
      const ang = Math.atan2(dy, -dx);
      if (dy > 0 && ang > jaw * 0.45 && depth > 0.3 && depth < 0.8) t = ang < jaw * 0.53 ? 4 : 3;
      // Ridges down the throat.
      else if (depth < 0.6 && Math.round(depth * 40) % 5 === 0) t = Math.max(0, t - 1);
      col = THROAT[t];
    }
    px.set(fx, fy, col);
  }
  px.done();

  if (!flash) {
    // Molten cracks (more of them the more damaged he is): thin glowing
    // seams with darker edges, in half-pixel steps.
    const cracks = damage === 0 ? 0 : damage === 1 ? 5 : 10;
    for (let i = 0; i < cracks; i++) {
      let a = crackRand() * Math.PI * 2;
      let x = Math.cos(a) * r * 0.85;
      let y = Math.sin(a) * r * 0.85;
      const len = (6 + crackRand() * 10) * DETAIL;
      for (let k = 0; k < len; k++) {
        a += (crackRand() - 0.5) * 0.85;
        x -= Math.cos(a) * 0.55;
        y -= Math.sin(a) * 0.55;
        // (Only on his stone: never outside him or inside his mouth.)
        const onStone = (u, v) => inside(u, v) && !(open && inMouth(u, v));
        if (!onStone(x, y)) continue;
        if (onStone(x + FINE, y)) dot(x + FINE, y, LAVA[0]);
        if (onStone(x, y + FINE)) dot(x, y + FINE, LAVA[0]);
        dot(x, y, k < 4 ? LAVA[0] : k % 5 === 0 ? LAVA[2] : LAVA[1]);
      }
    }

    // Teeth: jagged fangs along both jaws, pointing into the mouth.
    const teeth = 6;
    const missing = damage === 0 ? [] : damage === 1 ? [2] : [1, 2, 4];
    const fang = (bx, by, dir, long) => {
      // A tapering fang from a base on the jaw towards the middle line:
      // a bone-coloured shaded side and a cream lit side.
      for (let k = 0; k < long; k += FINE) {
        const w = 1.25 * (1 - k / long) + FINE;
        for (let s = 0; s < w; s += FINE) dot(bx + s - w / 2, by + dir * k, s < w / 2 ? PAL.cream : '#c9b9a0');
      }
    };
    for (let i = 0; i < teeth; i++) {
      if (missing.includes(i)) continue;
      const dist = r * (0.3 + (0.68 * i) / (teeth - 1));
      if (mouth <= 0.05) {
        // Shut: upper and lower fangs interlock in a neat zig-zag.
        fang(-dist + 0.5, -2.5, 1, 2.5);
        fang(-dist + 2.5, 2.5, -1, 2.5);
        continue;
      }
      const long = i % 2 === 0 ? 4 : 3;
      for (const side of [-1, 1]) {
        const a = Math.PI + side * jaw;
        // side -1: the lower jaw (its fangs point up), 1: the upper jaw.
        fang(Math.cos(a) * dist, Math.sin(a) * dist, side < 0 ? -1 : 1, long);
      }
    }
    if (mouth <= 0.05) {
      // Shut: a dark seam between the jaws.
      for (let x = 0; x < r * 0.95; x += FINE) {
        const sx = -radiusAt(Math.PI) + x;
        if (inside(sx, 0)) dot(sx, Math.round(x) % 5 === 0 ? FINE : 0, PAL.ink);
      }
    }

    // Eye: a slit red eye with a glint, or a bleeding empty socket once
    // it's shot out. (Same place and size as ever: the charge warning
    // flashes over it.)
    const ex = c0 + eye.x;
    const ey = c0 + eye.y;
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(ex - 1, ey - 1 + FINE, 7, 4);
    ctx.fillRect(ex - FINE, ey - 1, 6, 5);
    if (damage < 1) {
      ctx.fillStyle = mouth > 0.5 ? '#c4453a' : '#9e2f2f';
      ctx.fillRect(ex, ey, 5, 3);
      ctx.fillStyle = mouth > 0.5 ? '#d9675a' : '#c4453a';
      ctx.fillRect(ex + FINE, ey, 4, 1);
      ctx.fillStyle = PAL.amberLight;
      ctx.fillRect(ex + 2.5, ey, FINE, 3); // (on the half-pixel grid: crisp, not smeared)
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(ex + 2.5, ey + 1, FINE, 1);
      ctx.fillStyle = PAL.cream;
      ctx.fillRect(ex + FINE, ey + FINE, FINE, FINE);
    } else {
      ctx.fillStyle = '#1e0a0d';
      ctx.fillRect(ex, ey, 5, 3);
      ctx.fillStyle = '#5a1a1e';
      ctx.fillRect(ex + 1, ey + 1, 3, 1.5);
      ctx.fillStyle = '#7a2228';
      ctx.fillRect(ex + 1.5, ey + 1, 2, FINE);
      // Blood running down from the socket, thinning as it goes.
      for (let k = 0; k < 7; k += FINE) {
        ctx.fillStyle = k < 4 ? '#7a2228' : '#5a1a1e';
        ctx.fillRect(ex + 2, ey + 3 + k, k < 3 ? 1 : FINE, FINE);
      }
      ctx.fillStyle = '#5a1a1e';
      ctx.fillRect(ex + 3, ey + 4, FINE, 1.5);
    }
    // Blood drooling from the lower jaw once he's hurt.
    if (damage > 0 && mouth > 0.05) {
      const a = Math.PI - jaw;
      const bx = Math.cos(a) * r * 0.75;
      const by = Math.sin(a) * r * 0.75;
      for (let k = 0; k < 3 + damage * 2; k += FINE) {
        dot(bx, by + k, Math.round(k * 2) % 2 ? '#7a2228' : '#9e2f2f');
        if (k < 2) dot(bx + FINE, by + k, '#5a1a1e');
      }
    }
  }

  outline(canvas.hi);
  return canvas;
}

// A dark one-pixel (of the sharp canvas: half a game pixel) outline round
// everything painted, so rocks read clearly against space.
function outline(cv) {
  const ctx = cv.getContext('2d');
  const w = cv.width;
  const h = cv.height;
  const img = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  out.data.set(img.data);
  const alpha = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha(x, y)) continue;
      if (alpha(x - 1, y) || alpha(x + 1, y) || alpha(x, y - 1) || alpha(x, y + 1)) {
        const i = (y * w + x) * 4;
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
jawBody = null; // (only needed while his pictures were being painted)

// Distant, dim rocks for the background layer.
export const FAR_ROCKS = [5, 6, 7, 8].map((s, i) => {
  const r = 2 + Math.floor(i / 2);
  const cv = paintRock(r, s * 13, { craters: 0 });
  // Darken them heavily so they sit far behind the action.
  const ctx = cv.hi.getContext('2d');
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(20, 26, 46, 0.8)';
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
});

import { PAL } from './config.js?v=0.14.2';
import { seeded } from './util.js?v=0.14.2';

// THE SIEGE CRAWLER, painted by code: a rusty iron war machine on six legs.
// The hull (with its turret, flak guns and mortar rack) is painted once for
// each of 3 damage stages; the legs, the cannon barrel and the armoured
// hatch over its core move, so they're drawn fresh every frame.
//
// Layout inside the boss's box (72 x 52 game pixels):
//   turret dome on top (cannon pivot at PIVOT), flak guns and mortar rack
//   on the back deck, hull from y 18 to 37, the core behind its hatch at
//   CORE on the front of the hull, legs from the hull down to the feet at
//   the bottom edge.

export const CRAWLER_W = 72;
export const CRAWLER_H = 52;
const BODY_H = 40;
export const PIVOT = { x: 25, y: 12 }; // where the cannon barrel turns
export const CORE = { x: 12, y: 28, r: 6 }; // the weak point, behind a hatch
export const MORTAR_RACK = { x: 62, y: 9 };
export const FLAK_GUNS = [{ x: 50, y: 7 }, { x: 55, y: 7 }];
export const DRONE_BAY = { x: 44, y: 30 };
export const MINE_HATCH = { x: 36, y: 18 };
export const SLIT = { x: 27, y: 10, w: 5 }; // the turret's vision slit

// Gunmetal, dark to light, with rust streaks; lit from the upper left like
// everything else. (Cool blue-grey so it stands out against the red canyon.)
const IRON = ['#1d2030', '#33384d', '#4f5569', '#727688', '#a3a5ad'];
const RUST = '#8a4a32';
const HOLE = ['#140e10', '#6d6a73', '#b5562a', '#d9813f'];

function hullLeft(y) {
  return y < 30 ? 14 - ((y - 18) * 10) / 12 : 4 + ((y - 30) * 4) / 7;
}
function hullRight(y) {
  return y < 26 ? 64 + ((y - 18) * 6) / 8 : 70 - ((y - 26) * 4) / 11;
}
function inHull(x, y) {
  return y >= 18 && y <= 37 && x >= hullLeft(y) && x <= hullRight(y);
}
function turretHalf(y) {
  if (y < 5 || y > 18) return -1;
  if (y === 5) return 5;
  if (y === 6) return 6.5;
  return 7 + (y - 5) * 0.35;
}
function inTurret(x, y) {
  const hw = turretHalf(y);
  return hw > 0 && Math.abs(x + 0.5 - 34) <= hw;
}
function inMantlet(x, y) {
  return x >= 21 && x <= 27 && y >= 9 && y <= 15;
}
function inFlak(x, y) {
  if (x >= 48 && x <= 57 && y >= 14 && y <= 18) return true; // base
  return y >= 7 && y <= 14 && ((x >= 49 && x <= 51) || (x >= 54 && x <= 56));
}
function inMortar(x, y) {
  if (x >= 58 && x <= 67 && y >= 13 && y <= 18) return true; // rack
  return y >= 9 && y <= 13 && (x === 59 || x === 60 || x === 62 || x === 63 || x === 65 || x === 66);
}
function solid(x, y) {
  return inHull(x, y) || inTurret(x, y) || inMantlet(x, y) || inFlak(x, y) || inMortar(x, y);
}

// Battle damage: blown-open holes showing pipes and a hot glow inside.
const HOLES = [
  [],
  [[31, 30, 2.6], [55, 22, 2.2], [46, 35, 2], [39, 9, 1.8]],
  [[31, 30, 2.6], [55, 22, 2.2], [46, 35, 2], [39, 9, 1.8], [20, 22, 2.4], [62, 31, 2.6], [36, 25, 1.8], [30, 15, 1.6]],
];

function paintBody(stage) {
  const cv = document.createElement('canvas');
  cv.width = CRAWLER_W;
  cv.height = BODY_H;
  const c = cv.getContext('2d');
  const rand = seeded(77 + stage);
  const put = (x, y, color) => {
    c.fillStyle = color;
    c.fillRect(x, y, 1, 1);
  };
  for (let y = 0; y < BODY_H; y++) {
    for (let x = 0; x < CRAWLER_W; x++) {
      if (!solid(x, y)) continue;
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      if (edge) {
        put(x, y, PAL.ink);
        continue;
      }
      let s;
      if (inHull(x, y)) {
        s = y <= 20 ? 3 : y <= 31 ? 2 : 1;
        if ((y === 21 || y === 32) && (x + y) % 2 === 0) s += 1; // dithered band edge
        if (x < hullLeft(y) + 3 && y < 30) s = 3; // the lit nose
        if ([26, 38, 50, 60].includes(x) && y > 20) s = 0; // plate seams
        if (y === 31) s = 0;
        if ((y === 22 || y === 35) && x % 4 === 0) s = 4; // rivets
      } else if (inTurret(x, y)) {
        const hw = turretHalf(y);
        s = x + 0.5 < 34 - hw * 0.3 ? 3 : x + 0.5 > 34 + hw * 0.5 ? 1 : 2;
        if (y <= 6 && x % 2 === 0) s = 4;
        if (y === 14) s = 1;
      } else if (inMantlet(x, y)) {
        s = x < 24 ? 2 : 1;
      } else {
        s = x % 3 === 0 ? 3 : 2; // guns and racks
      }
      let color = IRON[Math.max(0, Math.min(4, s))];
      if (s > 0 && s < 4 && rand() < 0.07) color = RUST; // rust streaks
      put(x, y, color);
    }
  }
  // Portholes (amber lights) along the hull.
  for (const px of [30, 42, 54]) {
    c.fillStyle = PAL.ink;
    c.fillRect(px - 1, 23, 4, 4);
    c.fillStyle = PAL.amberSoft;
    c.fillRect(px, 24, 2, 2);
    put(px, 24, PAL.amberLight);
  }
  // The vision slit on the turret.
  c.fillStyle = PAL.ink;
  c.fillRect(SLIT.x - 1, SLIT.y - 1, SLIT.w + 2, 3);
  c.fillStyle = PAL.amberDark;
  c.fillRect(SLIT.x, SLIT.y, SLIT.w, 1);
  // Gun muzzles and mortar tubes: dark mouths.
  c.fillStyle = PAL.ink;
  for (const g of FLAK_GUNS) c.fillRect(g.x, g.y, 1, 2);
  for (const tx of [59, 62, 65]) c.fillRect(tx, 9, 2, 1);
  // The drone bay door and the mine hatch.
  c.fillStyle = PAL.ink;
  c.fillRect(DRONE_BAY.x - 5, DRONE_BAY.y - 3, 11, 7);
  c.fillStyle = IRON[1];
  c.fillRect(DRONE_BAY.x - 4, DRONE_BAY.y - 2, 9, 5);
  c.fillStyle = PAL.ink;
  c.fillRect(DRONE_BAY.x, DRONE_BAY.y - 2, 1, 5);
  c.fillRect(MINE_HATCH.x - 3, MINE_HATCH.y, 7, 1);
  // The recess the core sits in.
  c.fillStyle = PAL.ink;
  for (let y = -CORE.r - 1; y <= CORE.r + 1; y++) {
    for (let x = -CORE.r - 1; x <= CORE.r + 1; x++) {
      const d = Math.hypot(x, y);
      if (d <= CORE.r + 0.6) put(CORE.x + x, CORE.y + y, d > CORE.r - 0.4 ? IRON[0] : HOLE[0]);
    }
  }
  // Battle damage.
  for (const [hx, hy, r] of HOLES[stage]) {
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        const d = Math.hypot(x, y);
        if (!solid(hx + x, hy + y)) continue;
        if (d <= r) {
          const glow = d < r * 0.45;
          put(hx + x, hy + y, glow ? HOLE[2 + ((x + y) & 1)] : (x * 3 + y) % 4 === 0 ? HOLE[1] : HOLE[0]);
        } else if (d <= r + 1.6 && rand() < 0.6) {
          put(hx + x, hy + y, IRON[0]); // scorched edge
        }
      }
    }
  }
  return cv;
}

export const CRAWLER = {
  bodies: [0, 1, 2].map((s) => paintBody(s)),
};

// A thick pixel line: a square brush of width w stepped along the line.
function line(ctx, x0, y0, x1, y1, w, color) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  ctx.fillStyle = color;
  const h = Math.floor(w / 2);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    ctx.fillRect(x - h, y - h, w, w);
  }
}

// Six legs: the far three darker, behind; the near three in front. `step`
// is the walk cycle (radians) and `walking` (0..1) how much the feet lift.
export function drawLegs(ctx, ox, oy, step, walking, front) {
  const hips = front ? [16, 36, 56] : [22, 42, 62];
  hips.forEach((hx, i) => {
    const ph = step + i * 2.1 + (front ? 0 : Math.PI);
    const sway = Math.sin(ph) * 3 * walking;
    const lift = Math.max(0, Math.cos(ph)) * 3 * walking;
    const kx = ox + hx - 4 + sway;
    const ky = oy + 29 - lift;
    const fx = ox + hx - 8 + sway * 1.6;
    const fy = oy + CRAWLER_H - 1 - lift;
    const hx0 = ox + hx;
    const hy0 = oy + 35;
    if (front) {
      line(ctx, hx0, hy0, kx, ky, 4, PAL.ink);
      line(ctx, kx, ky, fx, fy, 4, PAL.ink);
      line(ctx, hx0, hy0, kx, ky, 2, IRON[2]);
      line(ctx, kx, ky, fx, fy, 2, IRON[3]);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(Math.round(kx) - 2, Math.round(ky) - 2, 5, 5);
      ctx.fillStyle = IRON[3];
      ctx.fillRect(Math.round(kx) - 1, Math.round(ky) - 1, 3, 3);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(Math.round(fx) - 3, Math.round(fy) - 1, 7, 2);
    } else {
      line(ctx, hx0, hy0, kx, ky, 3, PAL.ink);
      line(ctx, kx, ky, fx, fy, 3, PAL.ink);
      line(ctx, hx0, hy0, kx, ky, 1, IRON[1]);
      line(ctx, kx, ky, fx, fy, 1, IRON[1]);
    }
  });
}

// The cannon: a thick barrel from the pivot along `ang`, with a muzzle brake.
// `recoil` pulls it back into the turret just after a shot.
export function drawBarrel(ctx, px, py, ang, len, recoil = 0) {
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const x0 = px - ux * recoil;
  const y0 = py - uy * recoil;
  const x1 = x0 + ux * len;
  const y1 = y0 + uy * len;
  line(ctx, x0, y0, x1, y1, 5, PAL.ink);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(Math.round(x1) - 3, Math.round(y1) - 3, 7, 7);
  line(ctx, x0, y0, x1, y1, 3, IRON[2]);
  line(ctx, x0 - 1, y0 - 1, x1 - 1, y1 - 1, 1, IRON[4]); // highlight
  ctx.fillStyle = IRON[3];
  ctx.fillRect(Math.round(x1) - 2, Math.round(y1) - 2, 5, 5);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(Math.round(x1), Math.round(y1), 1, 1);
}

// The core and the two armour plates over it. open: 0 (shut) .. 1 (wide).
export function drawCore(ctx, cx, cy, open, t, hit) {
  const pulse = (Math.sin(t * 9) + 1) / 2;
  const colors = hit ? [PAL.cream, PAL.cream, PAL.cream] : [HOLE[2], pulse > 0.5 ? HOLE[3] : HOLE[2], PAL.amberLight];
  for (let y = -4; y <= 4; y++) {
    for (let x = -4; x <= 4; x++) {
      const d = Math.hypot(x, y);
      if (d > 4.3) continue;
      ctx.fillStyle = d < 1.6 ? colors[2] : d < 3 ? colors[1] : colors[0];
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  const plate = Math.round(6 * (1 - open));
  if (plate <= 0) return;
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(cx - 6, cy - 6, 13, plate + 1);
  ctx.fillRect(cx - 6, cy + 7 - plate - 1, 13, plate + 1);
  ctx.fillStyle = IRON[2];
  ctx.fillRect(cx - 5, cy - 5, 11, plate - 1);
  ctx.fillRect(cx - 5, cy + 7 - plate, 11, plate - 1);
  ctx.fillStyle = IRON[4];
  ctx.fillRect(cx - 5, cy - 5, 11, 1);
}

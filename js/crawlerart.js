import { PAL } from './config.js?v=0.23.1';
import { seeded, fillDisc } from './util.js?v=0.23.1';
import { DETAIL, FINE, detailCanvas, pixels, snapFine, grit } from './detail.js?v=0.23.1';

// THE SIEGE CRAWLER, painted by code: a rusty iron war machine on six legs.
// The hull (with its turret, flak guns and mortar rack) is painted once for
// each of 3 damage stages; the legs, the cannon barrel and the armoured
// hatch over its core move, so they're drawn fresh every frame.
//
// Double detail (v0.22.0): all of it is painted in half-pixel steps, with
// the same shapes, sizes and colours as before, plus finer plate seams,
// rivets, rust streaks, bolts and glints.
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
  return y >= 17.75 && y <= 37.25 && x >= hullLeft(y) - 0.25 && x <= hullRight(y) + 0.25;
}
function turretHalf(y) {
  if (y < 5 || y > 18) return -1;
  if (y === 5) return 5;
  if (y === 6) return 6.5;
  return 7 + (y - 5) * 0.35;
}
function inTurret(x, y) {
  const hw = turretHalf(Math.round(y));
  return hw > 0 && Math.abs(x + 0.5 - 34) <= hw + 0.25;
}
function inMantlet(x, y) {
  return x >= 20.75 && x <= 27.25 && y >= 8.75 && y <= 15.25;
}
function inFlak(x, y) {
  if (x >= 47.75 && x <= 57.25 && y >= 13.75 && y <= 18.25) return true; // base
  return y >= 6.75 && y <= 14.25 && ((x >= 48.75 && x <= 51.25) || (x >= 53.75 && x <= 56.25));
}
function inMortar(x, y) {
  if (x >= 57.75 && x <= 67.25 && y >= 12.75 && y <= 18.25) return true; // rack
  return y >= 8.75 && y <= 13.25 && ((x >= 58.75 && x <= 60.25) || (x >= 61.75 && x <= 63.25) || (x >= 64.75 && x <= 66.25));
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
  const { canvas, ctx: c } = detailCanvas(CRAWLER_W, BODY_H);
  const px = pixels(canvas);
  const rand = seeded(77 + stage);
  // Rust streaks: a few columns where rust runs down from a plate seam.
  const streaks = [];
  for (let i = 0; i < 9; i++) streaks.push({ x: 8 + rand() * 58, y: 20 + rand() * 10, len: 2 + rand() * 6 });
  const W = CRAWLER_W * DETAIL;
  const H = BODY_H * DETAIL;
  // (fx, fy) counts half pixels; (x, y) is the same point in the old grid.
  const at = (f) => (f + 0.5) / DETAIL - 0.5;
  const isSolid = (fx, fy) => fx >= 0 && fy >= 0 && fx < W && fy < H && solid(at(fx), at(fy));
  for (let fy = 0; fy < H; fy++) {
    for (let fx = 0; fx < W; fx++) {
      if (!isSolid(fx, fy)) continue;
      const x = at(fx);
      const y = at(fy);
      if (!isSolid(fx - 1, fy) || !isSolid(fx + 1, fy) || !isSolid(fx, fy - 1) || !isSolid(fx, fy + 1)) {
        px.set(fx, fy, PAL.ink);
        continue;
      }
      // A lit edge along the top and left of every part (one half pixel).
      const litEdge = !isSolid(fx, fy - 2) || !isSolid(fx - 2, fy);
      const xi = Math.round(x);
      const yi = Math.round(y);
      let s;
      if (inHull(x, y)) {
        s = y <= 20.25 ? 3 : y <= 31.25 ? 2 : 1;
        if ((yi === 21 || yi === 32) && (fx + fy) % 2 === 0) s += 1; // dithered band edge
        if (x < hullLeft(y) + 3 && y < 30) s = 3; // the lit nose
        // (Each old pixel is two half pixels: x - xi is -0.25 or +0.25.)
        for (const sx of [26, 38, 50, 60]) {
          if (y > 20.25 && xi === sx) s = x < sx ? 0 : Math.min(4, s + 1); // plate seams, with a lit lip
        }
        if (yi === 31) s = y < 31 ? 0 : Math.min(4, s + 1);
        if ((yi === 22 || yi === 35) && xi % 4 === 0) {
          // Rivets: a lit dot with a shadow below-right.
          if (x < xi && y < yi) s = 4;
          else if (x > xi && y > yi) s = 0;
        }
        if (litEdge && s > 0) s = Math.min(4, s + 1);
      } else if (inTurret(x, y)) {
        const hw = turretHalf(yi);
        s = x + 0.5 < 34 - hw * 0.3 ? 3 : x + 0.5 > 34 + hw * 0.5 ? 1 : 2;
        if (y <= 6.25 && fx % 3 === 0) s = 4;
        if (yi === 14) s = y < 14 ? 0 : 1; // a seam, and the shaded band below it
        if (litEdge) s = Math.min(4, s + 1);
      } else if (inMantlet(x, y)) {
        s = x < 24 ? 2 : 1;
        if (yi === 12 && y < 12) s = 0; // a seam across it
        if (litEdge) s = 3;
      } else {
        s = fx % 4 < 2 ? 3 : 2; // guns and racks, ribbed
        if (litEdge) s = 4;
      }
      let color = IRON[Math.max(0, Math.min(4, s))];
      if (s > 0 && s < 4) {
        for (const r of streaks) {
          if (Math.abs(x - r.x) < 0.3 && y > r.y && y < r.y + r.len && inHull(x, y)) color = RUST;
        }
        if (grit(fx, fy, 77 + stage) < 0.025) color = RUST; // flecks
      }
      px.set(fx, fy, color);
    }
  }
  px.done();
  // Portholes (amber lights) along the hull: round, with a glint.
  for (const hx of [30, 42, 54]) {
    c.fillStyle = PAL.ink;
    fillDisc(c, hx + 1, 25, 2);
    c.fillStyle = PAL.amberSoft;
    fillDisc(c, hx + 1, 25, 1.5);
    c.fillStyle = PAL.amberLight;
    c.fillRect(hx + 0.5, 24, 0.5, 0.5);
  }
  // The vision slit on the turret.
  c.fillStyle = PAL.ink;
  c.fillRect(SLIT.x - 0.5, SLIT.y - 0.5, SLIT.w + 1, 2);
  c.fillStyle = PAL.amberDark;
  c.fillRect(SLIT.x, SLIT.y, SLIT.w, 1);
  c.fillStyle = PAL.amberSoft;
  c.fillRect(SLIT.x, SLIT.y, SLIT.w, FINE);
  // Gun muzzles and mortar tubes: dark mouths with a lit rim.
  c.fillStyle = PAL.ink;
  for (const g of FLAK_GUNS) c.fillRect(g.x, g.y, 1, 1.5);
  for (const tx of [59, 62, 65]) c.fillRect(tx, 9, 1.5, 1);
  // The drone bay door (two leaves with a seam) and the mine hatch.
  c.fillStyle = PAL.ink;
  c.fillRect(DRONE_BAY.x - 4.5, DRONE_BAY.y - 2.5, 10, 6);
  c.fillStyle = IRON[1];
  c.fillRect(DRONE_BAY.x - 4, DRONE_BAY.y - 2, 9, 5);
  c.fillStyle = IRON[2];
  c.fillRect(DRONE_BAY.x - 4, DRONE_BAY.y - 2, 9, FINE);
  c.fillStyle = PAL.ink;
  c.fillRect(DRONE_BAY.x, DRONE_BAY.y - 2, FINE, 5);
  c.fillStyle = IRON[2];
  c.fillRect(DRONE_BAY.x + FINE, DRONE_BAY.y - 2, FINE, 5); // (its lit lip; the two leaves match)
  c.fillRect(MINE_HATCH.x - 3, MINE_HATCH.y, 7, FINE);
  // The recess the core sits in: a dark socket with a steel rim.
  c.fillStyle = IRON[0];
  fillDisc(c, CORE.x + 0.5, CORE.y + 0.5, CORE.r + 0.5);
  c.fillStyle = HOLE[0];
  fillDisc(c, CORE.x + 0.5, CORE.y + 0.5, CORE.r - 0.25);
  // Battle damage: ragged holes, scorched round the edge, glowing inside,
  // with a broken pipe across some.
  const hole = pixels(canvas);
  for (const [hx, hy, r] of HOLES[stage]) {
    for (let fy = Math.floor((hy - 5) * DETAIL); fy < (hy + 5) * DETAIL; fy++) {
      for (let fx = Math.floor((hx - 5) * DETAIL); fx < (hx + 5) * DETAIL; fx++) {
        const x = at(fx);
        const y = at(fy);
        if (!isSolid(fx, fy)) continue;
        const d = Math.hypot(x - hx, y - hy);
        const rr = r + 0.45 * Math.sin(Math.atan2(y - hy, x - hx) * 5 + hx);
        if (d <= rr) {
          const glow = d < rr * 0.45;
          const pipe = Math.abs(y - hy - (x - hx) * 0.3) < 0.3 && d < rr - 0.5;
          hole.set(fx, fy, pipe ? IRON[2] : glow ? HOLE[2 + ((fx + fy) & 1)] : d < rr * 0.7 ? '#4a2a22' : HOLE[0]);
        } else if (d <= rr + 1.6 && grit(fx, fy, hx) < 0.6) {
          hole.set(fx, fy, IRON[0]); // scorched edge
        }
      }
    }
  }
  hole.done();
  return canvas;
}

export const CRAWLER = {
  bodies: [0, 1, 2].map((s) => paintBody(s)),
};

// A thick line with square ends, drawn as one stroke (smooth at double
// detail, and one drawing call however long it is: the legs and the cannon
// are drawn fresh every frame).
function line(ctx, x0, y0, x1, y1, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

// Six legs: the far three darker, behind; the near three in front. `step`
// is the walk cycle (radians) and `walking` (0..1) how much the feet lift.
export function drawLegs(ctx, ox, oy, step, walking, front) {
  ctx.save(); // (line() sets the stroke style; keep it to the legs)
  const hips = front ? [16, 36, 56] : [22, 42, 62];
  hips.forEach((hx, i) => {
    const ph = step + i * 2.1 + (front ? 0 : Math.PI);
    const sway = Math.sin(ph) * 3 * walking;
    const lift = Math.max(0, Math.cos(ph)) * 3 * walking;
    // (Joints sit on whole half pixels, so the legs don't shimmer as they
    // move.)
    const kx = snapFine(ox + hx - 4 + sway);
    const ky = snapFine(oy + 29 - lift);
    const fx = snapFine(ox + hx - 8 + sway * 1.6);
    const fy = snapFine(oy + CRAWLER_H - 1 - lift);
    const hx0 = ox + hx;
    const hy0 = oy + 35;
    if (front) {
      line(ctx, hx0, hy0, kx, ky, 4, PAL.ink);
      line(ctx, kx, ky, fx, fy, 4, PAL.ink);
      line(ctx, hx0, hy0, kx, ky, 3, IRON[2]);
      line(ctx, kx, ky, fx, fy, 3, IRON[3]);
      // A lit edge down each strut, and a hydraulic rod.
      line(ctx, hx0 - 0.75, hy0, kx - 0.75, ky, FINE, IRON[4]);
      line(ctx, kx - 0.75, ky, fx - 0.75, fy, FINE, IRON[4]);
      line(ctx, hx0 + 0.75, hy0, kx + 0.75, ky, FINE, IRON[1]);
      // The knee: a round joint with a bolt.
      ctx.fillStyle = PAL.ink;
      fillDisc(ctx, kx, ky, 2.5);
      ctx.fillStyle = IRON[3];
      fillDisc(ctx, kx, ky, 2);
      ctx.fillStyle = IRON[4];
      ctx.fillRect(kx - 1, ky - 1, 1, FINE);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(kx - FINE, ky - FINE, FINE, FINE);
      // The foot: a splayed claw.
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(fx - 3.5, fy - 1, 7, 2);
      ctx.fillStyle = IRON[2];
      ctx.fillRect(fx - 3, fy - 0.5, 6, 1);
      ctx.fillStyle = IRON[4];
      ctx.fillRect(fx - 3, fy - 0.5, 6, FINE);
    } else {
      line(ctx, hx0, hy0, kx, ky, 3, PAL.ink);
      line(ctx, kx, ky, fx, fy, 3, PAL.ink);
      line(ctx, hx0, hy0, kx, ky, 2, IRON[1]);
      line(ctx, kx, ky, fx, fy, 2, IRON[1]);
      line(ctx, kx - 0.5, ky, fx - 0.5, fy, FINE, IRON[2]);
    }
  });
  ctx.restore();
}

// The cannon: a thick barrel from the pivot along `ang`, with a muzzle brake.
// `recoil` pulls it back into the turret just after a shot.
export function drawBarrel(ctx, px, py, ang, len, recoil = 0) {
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const x0 = snapFine(px - ux * recoil);
  const y0 = snapFine(py - uy * recoil);
  const x1 = snapFine(x0 + ux * len);
  const y1 = snapFine(y0 + uy * len);
  ctx.save(); // (line() sets the stroke style; keep it to the barrel)
  line(ctx, x0, y0, x1, y1, 5, PAL.ink);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(snapFine(x1) - 3.5, snapFine(y1) - 3.5, 7, 7);
  line(ctx, x0, y0, x1, y1, 4, IRON[2]);
  // Shading across the barrel: the side facing up-left (towards the light)
  // is lit, the other dark, whichever way it points.
  const lit = uy - ux > 0 ? 1 : -1; // which of the two sides faces up-left
  const nx = -uy * lit * 1.25;
  const ny = ux * lit * 1.25;
  line(ctx, x0 + nx, y0 + ny, x1 + nx, y1 + ny, FINE, IRON[4]);
  line(ctx, x0 - nx, y0 - ny, x1 - nx, y1 - ny, FINE, IRON[1]);
  ctx.restore();
  // Muzzle brake: a heavy block with a lit top edge and a dark bore.
  const mx = x1;
  const my = y1;
  ctx.fillStyle = IRON[3];
  ctx.fillRect(mx - 3, my - 3, 6, 6);
  ctx.fillStyle = IRON[4];
  ctx.fillRect(mx - 3, my - 3, 6, FINE);
  ctx.fillRect(mx - 3, my - 3, FINE, 6);
  ctx.fillStyle = IRON[1];
  ctx.fillRect(mx - 3, my + 2.5, 6, FINE);
  ctx.fillStyle = PAL.ink;
  fillDisc(ctx, mx, my, 1.25);
}

// The core and the two armour plates over it. open: 0 (shut) .. 1 (wide).
export function drawCore(ctx, cx, cy, open, t, hit) {
  const pulse = (Math.sin(t * 9) + 1) / 2;
  const colors = hit ? [PAL.cream, PAL.cream, PAL.cream] : [HOLE[2], pulse > 0.5 ? HOLE[3] : HOLE[2], PAL.amberLight];
  ctx.fillStyle = colors[0];
  fillDisc(ctx, cx + 0.5, cy + 0.5, 4.5);
  ctx.fillStyle = colors[1];
  fillDisc(ctx, cx + 0.5, cy + 0.5, 3);
  ctx.fillStyle = colors[2];
  fillDisc(ctx, cx + 0.5, cy + 0.5, 1.5);
  if (!hit) {
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(cx - 0.5, cy - 0.5, FINE, FINE); // a white-hot glint
  }
  const plate = Math.round(6 * (1 - open) * DETAIL) / DETAIL;
  if (plate <= 0) return;
  // Two plates sliding shut from top and bottom, each with a lit edge and
  // a row of bolts.
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(cx - 6, cy - 6, 13, plate + 0.5);
  ctx.fillRect(cx - 6, cy + 6.5 - plate, 13, plate + 0.5);
  ctx.fillStyle = IRON[2];
  ctx.fillRect(cx - 5.5, cy - 5.5, 12, plate - 0.5);
  ctx.fillRect(cx - 5.5, cy + 7 - plate, 12, plate - 0.5);
  if (plate < 1) return;
  ctx.fillStyle = IRON[4];
  ctx.fillRect(cx - 5.5, cy - 5.5, 12, FINE);
  ctx.fillRect(cx - 5.5, cy + 7 - plate, 12, FINE);
  if (plate >= 2) {
    ctx.fillStyle = IRON[3];
    for (let bx = -4; bx <= 5; bx += 3) {
      ctx.fillRect(cx + bx, cy - 4.5, FINE, FINE);
      ctx.fillRect(cx + bx, cy + 8 - plate, FINE, FINE);
    }
  }
}

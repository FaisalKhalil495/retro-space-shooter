import { DETAIL, fillCrisp } from './detail.js?v=0.21.1';

// Small maths helpers shared across the game.
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Does a rectangle overlap a circle?
export function rectHitsCircle(x, y, w, h, cx, cy, r) {
  const nx = clamp(cx, x, x + w);
  const ny = clamp(cy, y, y + h);
  return (nx - cx) ** 2 + (ny - cy) ** 2 <= r * r;
}

// A filled circle built from horizontal rows of half-pixel steps (double
// detail), so its edge is stepped like pixel art rather than smooth. Uses
// the current fill colour.
export function fillDisc(ctx, cx, cy, r) {
  const D = DETAIL;
  const ri = Math.max(1, Math.round(r * D));
  const x0 = Math.round(cx * D);
  const y0 = Math.round(cy * D);
  // (Rows meet on whole screen pixels, so no seams show between them.)
  const m = ctx.getTransform();
  const crisp = !m.b && !m.c;
  for (let y = -ri; y <= ri; y++) {
    const half = Math.floor(Math.sqrt(ri * ri - y * y));
    if (crisp) fillCrisp(ctx, m, (x0 - half) / D, (y0 + y) / D, (half * 2 + 1) / D, 1 / D);
    else ctx.fillRect((x0 - half) / D, (y0 + y) / D, (half * 2 + 1) / D, 1 / D);
  }
}

// A repeatable random-number generator: the same seed always gives the same
// sequence, so art painted by code looks identical every time.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Do two rectangles overlap?
export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

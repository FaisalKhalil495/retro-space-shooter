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

// A filled circle built from horizontal pixel rows, so its edge is stepped
// like pixel art rather than smooth. Uses the current fill colour.
export function fillDisc(ctx, cx, cy, r) {
  const ri = Math.max(1, Math.round(r));
  for (let y = -ri; y <= ri; y++) {
    const half = Math.floor(Math.sqrt(ri * ri - y * y));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

// Do two rectangles overlap?
export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

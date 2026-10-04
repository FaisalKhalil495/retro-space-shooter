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

// Do two rectangles overlap?
export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

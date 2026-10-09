import { FINE, snapFine } from './detail.js?v=0.22.1';

// The game's lettering (v0.20.0): our own smooth letters, drawn as lines by
// the game itself, so they look exactly the same on every phone and stay
// sharp at any size. Each letter sits in the same 5x5 game-pixel space the
// old blocky letters used (6 pixels apart), so all the text still fits where
// it did.
//
// Each letter is a path (like a drawing in SVG) on a 10x10 grid, where one
// step is half a game pixel: M = move the pen, L = straight line, Q = curve
// (through a corner point), Z = close the shape.
const GLYPHS = {
  A: 'M 0.6 9 L 0.6 3.5 Q 0.6 1 3.93 1 L 5.25 1 Q 8.58 1 8.58 3.5 L 8.58 9 M 0.6 5.5 L 8.58 5.5',
  B: 'M 0.6 9 L 0.6 1 L 5.65 1 Q 8.05 1 8.05 3 Q 8.05 5 5.65 5 L 0.6 5 M 5.65 5 L 6.19 5 Q 8.58 5 8.58 7 Q 8.58 9 6.19 9 L 0.6 9',
  C: 'M 8.58 1 L 3.93 1 Q 0.6 1 0.6 3.5 L 0.6 6.5 Q 0.6 9 3.93 9 L 8.58 9',
  D: 'M 0.6 1 L 4.59 1 Q 8.58 1 8.58 4 L 8.58 6 Q 8.58 9 4.59 9 L 0.6 9 Z',
  E: 'M 8.58 1 L 0.6 1 L 0.6 9 L 8.58 9 M 0.6 5 L 6.58 5',
  F: 'M 8.58 1 L 0.6 1 L 0.6 9 M 0.6 5 L 6.58 5',
  G: 'M 8.58 1 L 3.93 1 Q 0.6 1 0.6 3.5 L 0.6 6.5 Q 0.6 9 3.93 9 L 8.58 9 L 8.58 5.2 L 5.25 5.2',
  H: 'M 0.6 1 L 0.6 9 M 8.58 1 L 8.58 9 M 0.6 5 L 8.58 5',
  I: 'M 0.6 1 L 8.58 1 M 4.59 1 L 4.59 9 M 0.6 9 L 8.58 9',
  J: 'M 3.26 1 L 8.58 1 L 8.58 6.5 Q 8.58 9 5.25 9 L 3.93 9 Q 0.6 9 0.6 6.5',
  K: 'M 0.6 1 L 0.6 9 M 8.58 1 L 2.73 5 L 8.58 9 M 0.6 5 L 2.73 5',
  L: 'M 0.6 1 L 0.6 9 L 8.58 9',
  M: 'M 0.6 9 L 0.6 1 L 4.59 5 L 8.58 1 L 8.58 9',
  N: 'M 0.6 9 L 0.6 1 L 8.58 9 L 8.58 1',
  O: 'M 3.93 1 L 5.25 1 Q 8.58 1 8.58 3.5 L 8.58 6.5 Q 8.58 9 5.25 9 L 3.93 9 Q 0.6 9 0.6 6.5 L 0.6 3.5 Q 0.6 1 3.93 1 Z',
  P: 'M 0.6 9 L 0.6 1 L 5.65 1 Q 8.58 1 8.58 3.25 Q 8.58 5.5 5.65 5.5 L 0.6 5.5',
  Q: 'M 3.93 1 L 5.25 1 Q 8.58 1 8.58 3.5 L 8.58 6.5 Q 8.58 9 5.25 9 L 3.93 9 Q 0.6 9 0.6 6.5 L 0.6 3.5 Q 0.6 1 3.93 1 Z M 5.39 6.6 L 9.11 9.6',
  R: 'M 0.6 9 L 0.6 1 L 5.65 1 Q 8.58 1 8.58 3.25 Q 8.58 5.5 5.65 5.5 L 0.6 5.5 M 4.86 5.5 L 8.58 9',
  S: 'M 8.58 1 L 3.26 1 Q 0.6 1 0.6 3 Q 0.6 5 3.26 5 L 5.92 5 Q 8.58 5 8.58 7 Q 8.58 9 5.92 9 L 0.6 9',
  T: 'M 0.6 1 L 8.58 1 M 4.59 1 L 4.59 9',
  U: 'M 0.6 1 L 0.6 6.5 Q 0.6 9 3.93 9 L 5.25 9 Q 8.58 9 8.58 6.5 L 8.58 1',
  V: 'M 0.6 1 L 0.6 4.5 L 4.59 9 L 8.58 4.5 L 8.58 1',
  W: 'M 0.6 1 L 0.6 9 L 4.59 5.5 L 8.58 9 L 8.58 1',
  X: 'M 0.6 1 L 8.58 9 M 8.58 1 L 0.6 9',
  Y: 'M 0.6 1 L 4.59 5 L 8.58 1 M 4.59 5 L 4.59 9',
  Z: 'M 0.6 1 L 8.58 1 L 0.6 9 L 8.58 9',
  0: 'M 3.93 1 L 5.25 1 Q 8.58 1 8.58 3.5 L 8.58 6.5 Q 8.58 9 5.25 9 L 3.93 9 Q 0.6 9 0.6 6.5 L 0.6 3.5 Q 0.6 1 3.93 1 Z',
  1: 'M 1.93 2.6 L 4.59 1 L 4.59 9 M 1.93 9 L 7.25 9',
  2: 'M 0.6 1 L 5.92 1 Q 8.58 1 8.58 3 Q 8.58 5 5.92 5 L 3.26 5 Q 0.6 5 0.6 7 L 0.6 9 L 8.58 9',
  3: 'M 0.6 1 L 5.92 1 Q 8.58 1 8.58 3 Q 8.58 5 5.92 5 L 2.6 5 M 5.92 5 Q 8.58 5 8.58 7 Q 8.58 9 5.92 9 L 0.6 9',
  4: 'M 0.6 1 L 0.6 6 L 8.58 6 M 6.58 1 L 6.58 9',
  5: 'M 8.58 1 L 0.6 1 L 0.6 5 L 5.92 5 Q 8.58 5 8.58 7 Q 8.58 9 5.92 9 L 0.6 9',
  6: 'M 7.92 1 L 3.93 1 Q 0.6 1 0.6 3.5 L 0.6 7 Q 0.6 9 3.26 9 L 5.92 9 Q 8.58 9 8.58 7 Q 8.58 5 5.92 5 L 0.6 5',
  7: 'M 0.6 1 L 8.58 1 L 8.58 3 L 3.93 9',
  8: 'M 3.26 5 Q 0.87 5 0.87 3 Q 0.87 1 3.26 1 L 5.92 1 Q 8.31 1 8.31 3 Q 8.31 5 5.92 5 Z M 3.26 5 L 5.92 5 Q 8.58 5 8.58 7 Q 8.58 9 5.92 9 L 3.26 9 Q 0.6 9 0.6 7 Q 0.6 5 3.26 5 Z',
  9: 'M 1.27 9 L 5.25 9 Q 8.58 9 8.58 6.5 L 8.58 3 Q 8.58 1 5.92 1 L 3.26 1 Q 0.6 1 0.6 3 Q 0.6 5 3.26 5 L 8.58 5',
  '.': 'M 4.59 7.9 L 4.59 10.1',
  ':': 'M 4.59 1.9 L 4.59 4.1 M 4.59 7.9 L 4.59 10.1',
  '-': 'M 1.93 5 L 7.25 5',
  '+': 'M 1.27 5 L 7.92 5 M 4.59 2.5 L 4.59 7.5',
  '!': 'M 4.59 -0.1 L 4.59 6.5 M 4.59 7.9 L 4.59 10.1',
  '?': 'M 0.6 2.6 Q 0.6 1 3.26 1 L 5.92 1 Q 8.58 1 8.58 3 Q 8.58 5 5.92 5 L 4.59 5 L 4.59 6.5 M 4.59 7.9 L 4.59 10.1',
  '/': 'M 8.58 1 L 0.6 9',
  ',': 'M 4.59 7.9 L 4.59 9.6 L 3.26 10.9',
  "'": 'M 4.59 -0.1 L 4.59 3.4',
};

const ADVANCE = 6;
const STROKE = 2.2; // line thickness, in half pixels (a little over one game pixel)

const paths = {};
for (const [ch, d] of Object.entries(GLYPHS)) paths[ch] = new Path2D(d);

export function textWidth(str, px = 1) {
  return str.length ? (str.length * ADVANCE - 1) * px : 0;
}

// Draw text with its top-left at (x, y). px = size of one font pixel.
export function drawText(ctx, str, x, y, color, px = 1) {
  const s = String(str).toUpperCase();
  const m = ctx.getTransform();
  const k = px * FINE; // one step of a letter's grid
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = STROKE;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 1.6; // sharp corners get trimmed, never spiky
  for (let i = 0; i < s.length; i++) {
    const path = paths[s[i]];
    if (!path) continue;
    // Each letter in its own place and size: one transform, no nesting.
    const gx = x + (i * ADVANCE - 0.3) * px;
    ctx.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, m.e + m.a * gx + m.c * y, m.f + m.b * gx + m.d * y);
    ctx.stroke(path);
  }
  ctx.restore();
}

export function drawTextCentered(ctx, str, cx, y, color, px = 1) {
  drawText(ctx, str, snapFine(cx - textWidth(str, px) / 2), y, color, px);
}

// For the tests: which characters have a letter.
export const GLYPH_CHARS = Object.keys(GLYPHS).join('');

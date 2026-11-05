// Sharp sprites from shapes traced over the owner's paintings. Each vehicle is
// a list of shapes in the painting's own pixel coordinates (later ones on top):
//   { m: material, t: base shade 0-3, poly: [[x, y], ...] | ell: [cx, cy, rx, ry] | rect: [x0, y0, x1, y1] }
//   { line: [x0, y0, x1, y1], m, t }  a one-pixel line (barrels, seams, ribs, antennae)
//   { dot: [x, y], m, t }             a single pixel (lamps, rivets)
// A shape can say flat: true (no lit top edge / dark underside), only: 'wolves' or
// 'coast' (drawn in that paint only), when: 'open' or 'closed' (only about to fire, or only not). Each sprite pixel takes the shape covering
// most of it; a panel's top row is lit and its bottom row shaded, so neighbouring
// panels read as separate plates. An outline goes round the outside.
export const RAMPS = {
  wolves: {
    light: ['#e0e4ea', '#b8bec9', '#9097a4', '#6c7281'],
    main: ['#7f899c', '#626c80', '#4b5467', '#373e4e'],
    mech: ['#8a8f96', '#4a4e55', '#2f3237', '#1b1d21'],
    glass: ['#a9bccb', '#647a8c', '#3b4858', '#232b36'],
    cu: ['#f8dc98', '#eab25a', '#cf8f3c', '#93602c'],
    haz: ['#f8dc98', '#eab25a', '#cf8f3c', '#93602c'],
    lamp: ['#ffe6bc', '#f2864e', '#cf5136', '#8a3326'],
    snow: ['#ffffff', '#eef3f7', '#d6e1ea', '#b9c8d6'],
    k: '#0e1222',
  },
  coast: {
    light: ['#f6f2de', '#e2dec4', '#c9c5ac', '#a8a48c'],
    main: ['#aeb189', '#8d906e', '#6f7353', '#575b40'],
    mech: ['#a7afb0', '#727b7e', '#4d5659', '#2e363a'],
    glass: ['#a9bccb', '#647a8c', '#3b4858', '#232b36'],
    cu: ['#e0b783', '#c09363', '#9b7953', '#7a5e40'],
    haz: ['#aeb189', '#8d906e', '#6f7353', '#575b40'],
    lamp: ['#fff1cf', '#f6c36a', '#d99b43', '#a8722f'],
    snow: ['#ffffff', '#eef3f7', '#d6e1ea', '#b9c8d6'],
    k: '#0e1222',
  },
};
function inPoly(x, y, pts) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function covers(s, x, y) {
  if (s.poly) return inPoly(x, y, s.poly);
  if (s.rect) return x >= s.rect[0] && x < s.rect[2] && y >= s.rect[1] && y < s.rect[3];
  if (s.ell) { const [cx, cy, rx, ry] = s.ell; return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1; }
  return false;
}
function bounds(v) {
  const xs = [], ys = [];
  for (const s of v.shapes) {
    if (s.poly) for (const [x, y] of s.poly) { xs.push(x); ys.push(y); }
    if (s.rect) { xs.push(s.rect[0], s.rect[2]); ys.push(s.rect[1], s.rect[3]); }
    if (s.ell) { xs.push(s.ell[0] - s.ell[2], s.ell[0] + s.ell[2]); ys.push(s.ell[1] - s.ell[3], s.ell[1] + s.ell[3]); }
    if (s.line) { xs.push(s.line[0], s.line[2]); ys.push(s.line[1], s.line[3]); }
  }
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
// Shapes traced on a coordinate guide picture (guide: [painting x, painting y, zoom] of its
// top-left corner, drawn 30 pixels in) are moved back into painting coordinates once.
function norm(v) {
  if (!v.guide || v._norm) return v;
  const [gx, gy, z] = v.guide, P = ([x, y]) => [gx + (x - 30) / z, gy + (y - 30) / z];
  for (const s of v.shapes) {
    if (s.poly) s.poly = s.poly.map(P);
    if (s.rect) s.rect = [...P(s.rect.slice(0, 2)), ...P(s.rect.slice(2))];
    if (s.ell) s.ell = [...P(s.ell.slice(0, 2)), s.ell[2] / z, s.ell[3] / z];
    if (s.line) s.line = [...P(s.line.slice(0, 2)), ...P(s.line.slice(2))];
    if (s.dot) s.dot = P(s.dot);
  }
  v.muzzles = (v.muzzles || []).map(P);
  v._norm = true; return v;
}
// Returns { w, h, id[y][x] (shape index), tone[y][x], X0, Y0, scale }.
export function raster(v, pal, open = false) {
  norm(v);
  const [X0, Y0, X1, Y1] = bounds(v), scale = v.width / (X1 - X0);
  const tw = v.width, th = Math.round((Y1 - Y0) * scale), w = tw + 2, h = th + 2;
  const id = Array.from({ length: h }, () => Array(w).fill(-1));
  const use = (s) => (!s.only || s.only === pal) && (!s.when || (s.when === 'open') === !!open);
  const fills = v.shapes.map((s, i) => [s, i]).filter(([s]) => (s.poly || s.rect || s.ell) && use(s));
  const S = 4;
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    const votes = new Map(); let hit = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const px = X0 + (tx + (sx + 0.5) / S) / scale, py = Y0 + (ty + (sy + 0.5) / S) / scale;
      let top = -1; for (const [s, i] of fills) if (covers(s, px, py)) top = i;
      if (top >= 0) { hit++; votes.set(top, (votes.get(top) || 0) + 1 + (v.shapes[top].m === 'lamp' ? 1 : 0)); }
    }
    if (hit < (S * S) * 0.44) continue;
    let best = -1, bv = 0; for (const [i, n] of votes) if (n > bv || (n === bv && i > best)) { bv = n; best = i; }
    id[ty + 1][tx + 1] = best;
  }
  const at = (x, y) => (id[y] && id[y][x] !== undefined ? id[y][x] : -1);
  const tone = Array.from({ length: h }, () => Array(w).fill(0));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = id[y][x]; if (i < 0) continue; const s = v.shapes[i];
    let t = s.t ?? 1;
    if (!s.flat) { if (at(x, y - 1) !== i) t -= 1; else if (at(x, y + 1) !== i) t += 1; }
    tone[y][x] = Math.max(0, Math.min(3, t));
  }
  const map = (px, py) => [Math.floor((px - X0) * scale) + 1, Math.floor((py - Y0) * scale) + 1];
  // lines and dots go on top
  v.shapes.forEach((s, i) => {
    if (!use(s)) return;
    const put = (x, y) => { if (y >= 1 && y < h - 1 && x >= 1 && x < w - 1 && (s.over || id[y][x] >= 0)) { id[y][x] = i; tone[y][x] = s.t ?? 1; } };
    if (s.line) {
      let [x0, y0] = map(s.line[0], s.line[1]); const [x1, y1] = map(s.line[2], s.line[3]);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
      for (;;) { put(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    }
    if (s.dot) { const [x, y] = map(s.dot[0], s.dot[1]); put(x, y); }
  });
  return { w, h, id, tone, X0, Y0, scale, map };
}
export function paint(v, pal, open) {
  const r = raster(v, pal, open), R = RAMPS[pal];
  const a = r.id.map((row, y) => row.map((i, x) => (i < 0 ? null : R[v.shapes[i].m][r.tone[y][x]])));
  // snow lying in clumps on the upward-facing edges, as in the paintings
  if (v.snow !== false) for (let y = 1; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const i = r.id[y][x]; if (i < 0 || r.id[y - 1][x] >= 0) continue;
    const m = v.shapes[i].m; if (m !== 'light' && m !== 'main') continue;
    if ((x * 7 + y * 3) % 9 < 4) a[y][x] = R.snow[(x + y) % 3 ? 0 : 1];
  }
  if (open) {
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.id[y][x] >= 0 && v.shapes[r.id[y][x]].m === 'lamp') a[y][x] = R.lamp[0];
    for (const [px, py] of v.muzzles || []) { const [x, y] = r.map(px, py); if (a[y]) { a[y][x] = R.lamp[0]; if (a[y][x + 1]) a[y][x + 1] = R.lamp[1]; } }
  }
  const b = a.map((row) => row.slice());
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (!b[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => b[y + dy] && b[y + dy][x + dx])) a[y][x] = R.k;
  return { w: r.w, h: r.h, a, r };
}

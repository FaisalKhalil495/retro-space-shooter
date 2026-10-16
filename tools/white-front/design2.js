// The White Front enemies, draft 2: shaded parts, frost and icicles.
const K = '#0e1222';
const G = (w, h) => ({ w, h, a: Array.from({ length: h }, () => Array(w).fill(null)) });
const inside = (g, x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h;
function inPoly(px, py, pts) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
const P = (pts) => (x, y) => inPoly(x + 0.5, y + 0.5, pts);
const E = (cx, cy, rx, ry) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const R = (x0, y0, w, h) => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
const and = (a, b) => (x, y) => a(x, y) && b(x, y);
const not = (a) => (x, y) => !a(x, y);
// Paint a shaded part. mat = [highlight, light, mid, dark, deepest].
function part(g, shape, mat, { flat = false, light = 'top' } = {}) {
  const m = [];
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (shape(x, y)) m.push([x, y]);
  const has = new Set(m.map(([x, y]) => x + ',' + y));
  const at = (x, y) => has.has(x + ',' + y);
  // column extents for the cylinder-like shading
  const top = {}, bot = {};
  for (const [x, y] of m) { top[x] = Math.min(top[x] ?? 99, y); bot[x] = Math.max(bot[x] ?? -1, y); }
  for (const [x, y] of m) {
    let t = 2;
    if (!flat) {
      const h = bot[x] - top[x] + 1, f = h > 1 ? (y - top[x]) / (h - 1) : 0.5;
      t = f < 0.28 ? 1 : f < 0.68 ? 2 : 3;
    }
    if (!at(x, y + 1)) t = 4;
    if (!at(x + 1, y) && t < 3) t = 3;
    if (!at(x - 1, y) && t > 1 && t < 4) t = Math.max(1, t - 1);
    if (!at(x, y - 1)) t = light === 'top' ? 0 : 1;
    g.a[y][x] = mat[t];
  }
}
const px = (g, x, y, c) => { if (inside(g, x, y)) g.a[y][x] = c; };
const hline = (g, x0, x1, y, c) => { for (let x = x0; x <= x1; x++) px(g, x, y, c); };
const vline = (g, x, y0, y1, c) => { for (let y = y0; y <= y1; y++) px(g, x, y, c); };
function line(g, x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) px(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c); }
function outline(g) {
  const b = g.a.map((r) => r.slice());
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (b[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => b[y + dy] && b[y + dy][x + dx])) g.a[y][x] = K;
  }
  return g;
}
// Frost on the top edges, icicles hanging under the bottom edge (painted after the outline).
const ICE = ['#ffffff', '#e6f0f8', '#b7d3ea', '#86aed2'];
function frost(g, cols = [], icicles = []) {
  for (const x of cols) for (let y = 0; y < g.h; y++) if (g.a[y][x] && g.a[y][x] !== K) { g.a[y][x] = ICE[0]; if (g.a[y + 1] && g.a[y + 1][x] && g.a[y + 1][x] !== K) g.a[y + 1][x] = ICE[1]; break; }
  for (const [x, l0] of icicles) {
    const len = Math.max(2, l0);
    let y = g.h - 1; while (y > 0 && !g.a[y][x]) y--;
    if (y + len >= g.h) continue;
    for (let i = 1; i <= len; i++) px(g, x, y + i, i === len ? ICE[3] : i === 1 ? ICE[1] : ICE[2]);
  }
  return g;
}
const range = (a, b, s = 1) => { const r = []; for (let i = a; i <= b; i += s) r.push(i); return r; };

// ---------------------------------------------------------------- materials
const M = {
  white: ['#ffffff', '#e6ebf1', '#c3cbd6', '#929daf', '#636e84'],
  grey: ['#cdd2da', '#9da4b1', '#788090', '#59606f', '#3c4252'],
  red: ['#e0907a', '#b85844', '#953f34', '#70302b', '#4f1f20'],
  gun: ['#bdbac2', '#8a8794', '#64616e', '#4a4853', '#302f37'],
  glass: ['#eef4fc', '#a9bcdc', '#5d6ea0', '#3a4778', '#252e52'],
  glow: ['#fff6e0', '#f6dcae', '#f2cf8a', '#e3a857', '#c98f4a'],
  hide2: ['#e9edf2', '#c9d0da', '#a3adbb', '#7c8799', '#58627a'],
  slate: ['#9aa6ba', '#6f7c94', '#535f76', '#3e475c', '#2a3142'],
  fur: ['#fffaf0', '#ebe0c9', '#cdbd9e', '#a6957a', '#7d6e58'],
  hide: ['#d0a47a', '#ad8159', '#8a6a4e', '#6b4f3a', '#4a3628'],
  bone: ['#ffffff', '#f1e9d6', '#d8ccb2', '#b3a68a', '#857a62'],
  paint: ['#d07a5e', '#a8483c', '#8a3a36', '#6a2a28', '#4a1c1c'],
  shell: ['#a896be', '#75608f', '#54436a', '#3a2e4c', '#251d33'],
  sac: ['#fff0c8', '#ecd08e', '#c9a05a', '#9a7638', '#6e5226'],
  eye: ['#f6c0a8', '#e08a6a', '#b0543f', '#7a3a36', '#4f1f20'],
  wing: ['#f4f8fd', '#d6dfec', '#b3bdd0', '#8e9ab2', '#6c7790'],
  iron: ['#a3a3ae', '#7a7a86', '#5a5a66', '#40404a', '#2a2a31'],
  cu: ['#eab088', '#c98250', '#a8683c', '#7a4a2a', '#55321c'],
  brass: ['#f6e0aa', '#ddbd7c', '#c9a05a', '#9a7638', '#6e5226'],
  skin: ['#d8886a', '#b05e44', '#8a4432', '#622e24', '#421c16'],
};
const GLOW = (g, x, y, big = false) => { px(g, x, y, M.glow[0]); if (big) { px(g, x + 1, y, M.glow[1]); px(g, x, y + 1, M.glow[2]); px(g, x + 1, y + 1, M.glow[3]); } };

// ---------------------------------------------------------------- A: Siege Legion
const legion = {
  drifter() {
    const g = G(20, 16);
    part(g, P([[2, 8], [6, 3.6], [15, 3.2], [18.6, 6], [18.6, 10.4], [15, 12.6], [6, 12.4]]), M.white);
    part(g, P([[1, 8], [5.6, 4.4], [7.6, 4.4], [7.6, 11.6], [5.6, 11.6]]), M.grey);
    part(g, and(P([[2, 8], [6, 3.6], [15, 3.2], [18.6, 6], [18.6, 10.4], [15, 12.6], [6, 12.4]]), R(11, 0, 2, 16)), M.red, { flat: true });
    part(g, P([[8.4, 5], [10.8, 4.4], [10.8, 7.2], [8.4, 7.2]]), M.glass); px(g, 9, 5, M.glass[0]);
    hline(g, 13, 17, 9, M.white[3]); px(g, 15, 5, M.white[3]); px(g, 15, 11, M.white[3]);
    part(g, R(17, 6, 2, 4), M.gun); px(g, 18, 7, M.glow[1]); px(g, 18, 8, M.glow[2]);
    hline(g, 6, 15, 13, M.gun[3]); px(g, 6, 13, M.gun[1]);
    line(g, 14, 3, 16, 1, M.gun[2]);
    outline(g);
    return frost(g, [7, 9, 10, 13, 14], [[8, 2], [12, 2], [14, 1]]);
  },
  weaver() { // war raptor, a creature
    const g = G(22, 18);
    part(g, P([[8, 9.5], [10.5, 3], [13.5, 0.6], [19.5, 2.6], [17, 6], [14.5, 9.5]]), M.slate);
    for (const x of [11, 13, 15, 17]) line(g, x - 1, 8, x + 1, 3, M.slate[3]);
    part(g, E(12, 11, 6.2, 3.4), M.hide2);
    part(g, P([[16.6, 10], [21.6, 12.6], [16.6, 13.2]]), M.slate);
    part(g, E(5, 9.4, 3.4, 2.5), M.hide2);
    part(g, P([[3, 6.4], [5, 4.4], [6.4, 7.6]]), M.red);
    part(g, P([[0.4, 10.2], [3, 8.8], [3.2, 11.4]]), M.bone);
    px(g, 4, 9, M.eye[1]); px(g, 5, 9, K);
    part(g, P([[9, 8], [15.4, 8], [15.4, 10.4], [9, 10.4]]), M.red);
    hline(g, 9, 15, 10, M.gun[2]); px(g, 10, 9, M.red[0]); px(g, 14, 9, M.red[0]);
    line(g, 10, 14, 9, 16, M.hide2[3]); line(g, 14, 14, 15, 16, M.hide2[3]); px(g, 8, 16, M.bone[2]); px(g, 16, 16, M.bone[2]);
    outline(g);
    return frost(g, [12, 13, 14], []);
  },
  gunner() {
    const g = G(28, 22);
    const hull = P([[3, 9], [8, 5.6], [22, 5.6], [26.6, 8.6], [26.6, 14], [22, 17.2], [8, 17.2], [3, 13]]);
    part(g, hull, M.white);
    part(g, and(hull, R(0, 14, 28, 8)), M.grey);
    part(g, P([[11, 5.8], [13, 2.2], [19.4, 2.2], [21, 5.8]]), M.grey);
    part(g, R(8, 3, 6, 2), M.gun); px(g, 8, 3, M.gun[0]);
    part(g, P([[6, 7], [10.6, 6], [10.6, 9], [6, 9]]), M.glass); px(g, 7, 7, M.glass[0]); px(g, 8, 7, M.glass[0]);
    part(g, and(hull, R(16, 0, 2, 22)), M.red, { flat: true }); part(g, and(hull, R(19, 0, 1, 22)), M.red, { flat: true });
    part(g, R(0, 8, 6, 2), M.gun); part(g, R(0, 12, 6, 2), M.gun);
    px(g, 0, 8, M.gun[0]); px(g, 0, 12, M.gun[0]);
    for (const x of [10, 13, 22, 24]) px(g, x, 11, M.white[3]);
    hline(g, 9, 23, 14, M.grey[3]);
    part(g, R(25, 9, 2, 4), M.gun); px(g, 26, 10, M.glow[1]); px(g, 26, 11, M.glow[2]);
    outline(g);
    return frost(g, [9, 10, 14, 15, 16, 17, 20, 22, 23], [[10, 2], [14, 3], [19, 2], [23, 1]]);
  },
  seeker() {
    const g = G(20, 14);
    part(g, P([[13.5, 5], [17, 1], [18.8, 1], [17, 5.2]]), M.grey);
    part(g, P([[13.5, 9], [17, 13], [18.8, 13], [17, 8.8]]), M.grey);
    part(g, R(4, 5, 14, 4), M.white);
    part(g, P([[0.8, 7], [4.6, 4.6], [4.6, 9.4]]), M.red);
    part(g, R(8, 5, 2, 4), M.grey, { flat: true });
    part(g, R(17, 6, 1, 2), M.gun); px(g, 18, 6, M.glow[1]); px(g, 18, 7, M.glow[2]);
    outline(g);
    return frost(g, [5, 6, 11, 12, 13], [[10, 1]]);
  },
  sniper() {
    const g = G(28, 14);
    part(g, P([[14, 3.4], [24, 3.4], [27, 6], [27, 9.4], [24, 11.6], [14, 11.6]]), M.white);
    part(g, R(1, 5, 14, 1), M.gun, { flat: true }); part(g, R(1, 9, 14, 1), M.gun, { flat: true });
    for (const x of [3, 7, 11]) part(g, R(x, 4, 2, 7), M.red);
    hline(g, 1, 14, 7, M.glow[2]); hline(g, 2, 13, 7, M.glow[1]);
    part(g, R(0, 4, 1, 7), M.gun);
    part(g, R(16, 1, 7, 2), M.gun); px(g, 16, 1, M.eye[1]); px(g, 16, 2, M.eye[2]);
    part(g, R(21, 4, 2, 7), M.red, { flat: true });
    for (const y of [5, 9]) px(g, 25, y, M.white[3]);
    outline(g);
    return frost(g, [15, 17, 18, 19, 22, 24, 25], [[18, 2], [23, 1]]);
  },
  spinner() {
    const g = G(22, 22);
    for (let i = 0; i < 4; i++) {
      const t = 0.4 + (i * Math.PI) / 2, cx = 11 + Math.cos(t) * 8.4, cy = 11 + Math.sin(t) * 8.4;
      part(g, E(cx, cy, 1.6, 1.6), M.gun);
      line(g, Math.round(11 + Math.cos(t) * 6), Math.round(11 + Math.sin(t) * 6), Math.round(cx), Math.round(cy), M.gun[2]);
    }
    part(g, E(11, 11, 7, 7), M.white);
    part(g, and(E(11, 11, 7, 7), not(E(11, 11, 5, 5))), M.grey);
    part(g, E(11, 11, 3, 3), M.red);
    px(g, 10, 10, M.glow[0]); px(g, 11, 10, M.glow[1]); px(g, 10, 11, M.glow[2]); px(g, 11, 11, M.glow[3]);
    outline(g);
    return frost(g, [8, 9, 10, 11, 12, 13], [[9, 1], [12, 2]]);
  },
};

// ---------------------------------------------------------------- B: Hunt Pack
const pack = {
  drifter() { // bone sled with a hooded rider
    const g = G(20, 16);
    part(g, R(3, 13, 15, 1), M.bone, { flat: true }); px(g, 2, 12, M.bone[1]); px(g, 1, 11, M.bone[1]); px(g, 1, 10, M.bone[0]);
    px(g, 6, 12, M.bone[3]); px(g, 14, 12, M.bone[3]);
    part(g, P([[3, 7], [15, 7], [18.6, 9.6], [17.6, 12.4], [3, 12.4]]), M.hide);
    for (const x of [6, 9, 12, 15]) vline(g, x, 8, 11, M.bone[3]);
    part(g, R(4, 6, 11, 2), M.fur);
    part(g, P([[0.4, 8.6], [3.6, 7.2], [3.6, 10.2]]), M.bone);
    part(g, E(11, 3.8, 2.8, 2.8), M.fur); px(g, 10, 3, K); px(g, 10, 4, K); px(g, 9, 4, M.eye[1]);
    line(g, 13, 7, 16, 0, M.hide[3]); px(g, 16, 0, M.bone[0]);
    part(g, R(7, 9, 1, 3), M.paint, { flat: true });
    outline(g);
    return frost(g, [5, 6, 7, 11, 12], [[5, 1], [16, 1]]);
  },
  weaver() { // snow wolf-bat, a creature
    const g = G(22, 18);
    part(g, P([[9, 9.5], [12.5, 1.6], [16, 0.6], [20, 3.4], [16.4, 9.5]]), M.hide);
    for (const [x0, y0, x1, y1] of [[10, 9, 13, 2], [13, 9, 16, 1], [15, 9, 19, 4]]) line(g, x0, y0, x1, y1, M.bone[2]);
    part(g, E(12, 11.6, 6.2, 3.4), M.fur);
    part(g, P([[16.6, 10.6], [21.6, 9.4], [20.2, 12.6], [16.6, 13.6]]), M.fur);
    part(g, E(5.2, 10.6, 3.4, 2.7), M.fur);
    part(g, P([[0.4, 11.6], [3, 9.6], [3.6, 12.8]]), M.fur);
    px(g, 0, 11, K); px(g, 1, 13, M.bone[0]); px(g, 2, 13, M.bone[1]);
    part(g, P([[3.8, 8.6], [5.4, 5.4], [7, 8.6]]), M.fur); px(g, 5, 7, M.paint[1]);
    px(g, 4, 10, M.eye[1]); px(g, 5, 10, K);
    line(g, 10, 14, 9, 16, M.fur[3]); line(g, 14, 14, 15, 16, M.fur[3]);
    outline(g);
    return frost(g, [11, 12, 13, 14], []);
  },
  gunner() { // tusk barge
    const g = G(28, 22);
    const hull = P([[6, 7], [22, 6], [26.6, 10], [26.6, 14], [22, 17.4], [6, 16.4], [4, 12]]);
    part(g, hull, M.hide);
    part(g, P([[6, 6.6], [22, 5.6], [25, 8.4], [6, 9.4]]), M.fur);
    for (const x of [10, 14, 18, 22]) vline(g, x, 10, 15, M.bone[3]);
    part(g, P([[7.6, 8.4], [3, 6.4], [0.4, 2.6], [2, 2.2], [4.4, 5], [8.4, 7]]), M.bone);
    part(g, P([[7.6, 14.6], [3, 16.6], [0.4, 20.4], [2, 20.8], [4.4, 18], [8.4, 16]]), M.bone);
    part(g, R(1, 10, 6, 2), M.gun);
    part(g, E(6.6, 11.6, 2.8, 2.8), M.bone); px(g, 5, 11, K); px(g, 7, 11, K); px(g, 6, 13, K); px(g, 5, 11, M.eye[2]);
    part(g, P([[16, 6], [18, 1], [19, 1], [19, 6]]), M.hide); part(g, P([[19, 1.2], [23, 2.4], [19, 3.8]]), M.paint);
    part(g, R(13, 11, 3, 1), M.paint, { flat: true }); part(g, R(19, 13, 3, 1), M.paint, { flat: true });
    px(g, 26, 11, M.glow[1]); px(g, 26, 12, M.glow[2]);
    outline(g);
    return frost(g, [8, 9, 10, 12, 13, 15, 20, 21, 22], [[11, 2], [17, 1], [21, 2]]);
  },
  seeker() { // spear glider
    const g = G(20, 14);
    part(g, P([[8, 6.4], [11.6, 2], [14.6, 2], [12.4, 6.4]]), M.hide);
    part(g, R(3, 6, 14, 2), M.hide);
    part(g, P([[0.4, 7], [4.6, 4.8], [4.6, 9.2]]), M.bone);
    part(g, P([[15, 6.6], [19.6, 2.6], [18, 7]]), M.fur);
    part(g, P([[15, 7.4], [19.6, 11.4], [18, 7]]), M.fur);
    part(g, R(6, 6, 1, 2), M.paint, { flat: true });
    outline(g);
    return frost(g, [10, 11, 12, 13], [[8, 1]]);
  },
  sniper() { // skull cannon
    const g = G(28, 14);
    part(g, R(1, 5, 16, 4), M.bone);
    for (let x = 2; x < 16; x += 3) vline(g, x, 5, 8, M.bone[3]);
    part(g, R(0, 4, 2, 6), M.bone);
    part(g, P([[16.6, 3.4], [18.6, 0.4], [20.6, 2.6]]), M.bone);
    part(g, E(21.6, 7, 5.8, 5.4), M.bone);
    part(g, E(19.6, 6, 1.5, 1.5), M.hide); px(g, 19, 6, M.eye[1]); px(g, 19, 5, M.eye[0]);
    part(g, E(23.6, 6, 1.5, 1.5), M.hide);
    hline(g, 18, 24, 10, K); for (const x of [19, 21, 23]) px(g, x, 10, M.bone[1]);
    outline(g);
    return frost(g, [3, 4, 9, 10, 20, 21, 22, 23], [[5, 1], [12, 2]]);
  },
  spinner() { // fanged bone wheel
    const g = G(22, 22);
    for (let i = 0; i < 8; i++) {
      const t = 0.2 + (i / 8) * Math.PI * 2, w = 0.2;
      part(g, P([[11 + Math.cos(t - w) * 7.4, 11 + Math.sin(t - w) * 7.4], [11 + Math.cos(t) * 10.6, 11 + Math.sin(t) * 10.6], [11 + Math.cos(t + w) * 7.4, 11 + Math.sin(t + w) * 7.4]]), M.bone);
    }
    part(g, E(11, 11, 8, 8), M.bone);
    part(g, E(11, 11, 6, 6), M.hide);
    for (let i = 0; i < 4; i++) { const t = 0.7 + (i * Math.PI) / 2; line(g, Math.round(11 + Math.cos(t) * 2.5), Math.round(11 + Math.sin(t) * 2.5), Math.round(11 + Math.cos(t) * 6), Math.round(11 + Math.sin(t) * 6), M.bone[2]); }
    part(g, E(11, 11, 2.6, 2.6), M.paint); px(g, 10, 10, M.glow[1]); px(g, 11, 10, M.glow[2]);
    outline(g);
    return frost(g, [8, 9, 12, 13], [[10, 1]]);
  },
};

// ---------------------------------------------------------------- C: Chitin Swarm
const swarm = {
  drifter() { // beetle pod
    const g = G(20, 16);
    line(g, 7, 13, 6, 15, M.shell[4]); line(g, 11, 14, 11, 15, M.shell[4]); line(g, 15, 13, 16, 15, M.shell[4]);
    part(g, E(11.6, 8, 7.6, 5.8), M.shell);
    vline(g, 11, 3, 13, M.shell[4]); px(g, 9, 4, M.shell[0]); px(g, 14, 4, M.shell[0]);
    part(g, E(4, 8.2, 2.8, 2.6), M.shell); px(g, 3, 7, M.eye[1]); px(g, 4, 7, M.eye[0]);
    line(g, 1, 6, 0, 5, M.shell[1]); line(g, 1, 10, 0, 11, M.shell[1]);
    outline(g);
    return frost(g, [8, 9, 13, 14], [[13, 1]]);
  },
  weaver() { // swarm wasp, a creature
    const g = G(22, 18);
    part(g, E(11, 4.6, 5.4, 2.6), M.wing); line(g, 7, 5, 15, 4, M.wing[3]);
    part(g, E(16.2, 10.6, 5, 3.3), M.shell);
    part(g, R(14, 8, 1, 6), M.sac, { flat: true }); part(g, R(17, 8, 1, 6), M.sac, { flat: true });
    part(g, P([[20.4, 9.6], [21.6, 11], [20, 12.4]]), M.shell);
    part(g, E(9.6, 9.6, 3.4, 3), M.shell);
    part(g, E(4, 9.6, 2.9, 2.7), M.shell);
    part(g, E(3.4, 9, 1.7, 1.7), M.eye);
    line(g, 8, 12, 7, 15, M.shell[4]); line(g, 10, 12, 10, 16, M.shell[4]); line(g, 12, 12, 13, 15, M.shell[4]);
    px(g, 0, 11, M.shell[1]); px(g, 1, 11, M.shell[1]);
    outline(g);
    return frost(g, [], []);
  },
  gunner() { // carapace gunship
    const g = G(28, 22);
    part(g, E(15.6, 11, 10.6, 7.8), M.shell);
    for (const x of [11, 16, 21]) line(g, x, 4, x - 1, 16, M.shell[4]);
    for (const x of [9, 13, 18, 23]) px(g, x, 5, M.shell[0]);
    for (let x = 9; x <= 23; x += 3) { px(g, x, 15, M.sac[1]); px(g, x, 16, M.sac[3]); }
    part(g, P([[6, 8], [2, 5.4], [0.4, 6], [3, 9.6]]), M.shell); px(g, 0, 6, M.sac[0]); px(g, 1, 6, M.sac[2]);
    part(g, P([[6, 14], [2, 16.6], [0.4, 16], [3, 12.4]]), M.shell); px(g, 0, 16, M.sac[0]); px(g, 1, 16, M.sac[2]);
    part(g, E(5.6, 11, 3.6, 3.6), M.shell);
    px(g, 4, 9, M.eye[1]); px(g, 4, 12, M.eye[1]); px(g, 3, 10, M.eye[0]); px(g, 3, 11, M.eye[2]);
    outline(g);
    return frost(g, [12, 13, 14, 17, 18, 19], [[12, 2], [19, 1]]);
  },
  seeker() { // needle drone
    const g = G(20, 14);
    part(g, E(12, 3.8, 3.4, 1.8), M.wing);
    part(g, E(16.6, 7, 2.8, 2.2), M.shell);
    part(g, E(12.6, 7, 3, 2.5), M.shell);
    part(g, E(8.2, 7, 2.6, 2.2), M.shell);
    line(g, 0, 7, 5, 7, M.shell[1]);
    px(g, 7, 6, M.eye[1]);
    outline(g);
    return frost(g, [], []);
  },
  sniper() { // spine lancer
    const g = G(28, 14);
    part(g, P([[16, 3.4], [18, 0.4], [19, 3.4]]), M.shell); part(g, P([[20, 2.8], [22, 0.4], [23, 3]]), M.shell);
    part(g, P([[0.2, 7], [15, 5.4], [15, 8.6]]), M.shell);
    part(g, E(21, 7, 6.4, 5), M.shell);
    part(g, E(16, 7, 2.2, 2.2), M.eye);
    part(g, E(24, 8.6, 2.2, 2), M.sac);
    outline(g);
    return frost(g, [18, 21, 22], [[21, 1]]);
  },
  spinner() { // spore wheel
    const g = G(22, 22);
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2, w = 0.2;
      part(g, P([[11 + Math.cos(t - w) * 7.4, 11 + Math.sin(t - w) * 7.4], [11 + Math.cos(t) * 10.7, 11 + Math.sin(t) * 10.7], [11 + Math.cos(t + w) * 7.4, 11 + Math.sin(t + w) * 7.4]]), M.shell);
    }
    part(g, E(11, 11, 8, 8), M.shell);
    for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + (i / 8) * Math.PI * 2; line(g, Math.round(11 + Math.cos(t) * 5), Math.round(11 + Math.sin(t) * 5), Math.round(11 + Math.cos(t) * 7.6), Math.round(11 + Math.sin(t) * 7.6), M.shell[4]); }
    part(g, E(11, 11, 3.2, 3.2), M.sac);
    outline(g);
    return frost(g, [9, 10, 11, 12], []);
  },
};

// ---------------------------------------------------------------- D: Furnace Corps
const furnace = {
  drifter() { // boiler pod
    const g = G(20, 16);
    part(g, R(12, 1, 3, 4), M.iron); part(g, R(12, 1, 3, 1), M.brass, { flat: true }); px(g, 13, 0, M.glow[1]);
    part(g, E(11.6, 9, 7, 5.2), M.iron);
    part(g, P([[1, 6.4], [5.6, 4.4], [5.6, 13.6], [1, 11.6]]), M.cu);
    part(g, R(14, 8, 3, 3), M.glow); hline(g, 14, 16, 9, M.iron[4]);
    for (const x of [8, 11]) { px(g, x, 6, M.brass[1]); px(g, x, 12, M.brass[2]); }
    outline(g);
    return frost(g, [7, 8, 9, 10, 16, 17], [[9, 1], [15, 1]]);
  },
  weaver() { // fire lizard, a creature
    const g = G(22, 18);
    part(g, P([[9, 9.4], [12.6, 4.4], [16, 5], [14.6, 9.4]]), M.cu);
    part(g, E(12, 10.6, 6.8, 3.2), M.skin);
    part(g, P([[17.6, 9.6], [21.6, 12.6], [17, 12.8]]), M.skin);
    part(g, E(4.6, 10, 3.2, 2.4), M.skin);
    part(g, P([[0.4, 10.6], [2.6, 9.2], [2.6, 12]]), M.skin);
    for (const x of [7, 9, 11, 13, 15, 17]) px(g, x, 8, M.glow[1]);
    px(g, 4, 9, M.glow[0]);
    line(g, 9, 13, 8, 15, M.skin[3]); line(g, 14, 13, 15, 15, M.skin[3]);
    outline(g);
    return frost(g, [], []);
  },
  gunner() { // furnace frigate
    const g = G(28, 22);
    part(g, R(12, 2, 3, 6), M.iron); part(g, R(12, 4, 3, 1), M.brass, { flat: true }); px(g, 13, 1, M.glow[1]);
    part(g, R(17, 3, 3, 5), M.iron); part(g, R(17, 5, 3, 1), M.brass, { flat: true }); px(g, 18, 2, M.glow[1]);
    part(g, P([[4, 8], [24, 8], [27, 11], [27, 16], [24, 18.6], [4, 18.6], [2.6, 14]]), M.iron);
    for (const x of [9, 14, 19]) { part(g, R(x, 13, 3, 2), M.glow); }
    for (let x = 6; x <= 24; x += 3) px(g, x, 17, M.brass[1]);
    part(g, R(0, 10, 8, 3), M.cu); part(g, R(0, 10, 1, 3), M.iron);
    part(g, R(26, 12, 1, 3), M.glow, { flat: true });
    outline(g);
    return frost(g, [5, 6, 7, 8, 9, 10, 21, 22, 23], [[8, 2], [16, 1], [22, 2]]);
  },
  seeker() { // steam rocket
    const g = G(20, 14);
    part(g, P([[15, 4.6], [18.6, 1.6], [18.6, 4.6]]), M.iron);
    part(g, P([[15, 9.4], [18.6, 12.4], [18.6, 9.4]]), M.iron);
    part(g, E(10.6, 7, 7, 3), M.cu);
    part(g, P([[0.6, 7], [4.6, 4.6], [4.6, 9.4]]), M.iron);
    part(g, R(8, 4, 1, 6), M.brass, { flat: true }); part(g, R(12, 4, 1, 6), M.brass, { flat: true });
    px(g, 18, 6, M.glow[1]); px(g, 18, 7, M.glow[2]);
    outline(g);
    return frost(g, [6, 7, 10, 11], [[10, 1]]);
  },
  sniper() { // heat lance
    const g = G(28, 14);
    part(g, R(0, 6, 16, 2), M.cu);
    for (const x of [3, 7, 11]) { part(g, R(x, 4, 2, 6), M.brass); px(g, x, 6, M.glow[1]); px(g, x + 1, 7, M.glow[2]); }
    part(g, P([[15, 3], [25, 3], [27, 5.6], [27, 9], [25, 11], [15, 11]]), M.iron);
    part(g, E(21, 7, 2.3, 2.3), M.brass); px(g, 21, 6, K); px(g, 20, 7, K);
    part(g, R(15, 5, 1, 2), M.glow, { flat: true });
    part(g, R(25, 8, 2, 2), M.glow);
    outline(g);
    return frost(g, [16, 17, 18, 23, 24], [[19, 2]]);
  },
  spinner() { // flywheel
    const g = G(22, 22);
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2, w = 0.15;
      part(g, P([[11 + Math.cos(t - w) * 8.6, 11 + Math.sin(t - w) * 8.6], [11 + Math.cos(t - w * 0.6) * 10.6, 11 + Math.sin(t - w * 0.6) * 10.6], [11 + Math.cos(t + w * 0.6) * 10.6, 11 + Math.sin(t + w * 0.6) * 10.6], [11 + Math.cos(t + w) * 8.6, 11 + Math.sin(t + w) * 8.6]]), M.iron);
    }
    part(g, and(E(11, 11, 9, 9), not(E(11, 11, 7, 7))), M.iron);
    for (let i = 0; i < 6; i++) { const t = 0.4 + (i / 6) * Math.PI * 2; line(g, Math.round(11 + Math.cos(t) * 2.5), Math.round(11 + Math.sin(t) * 2.5), Math.round(11 + Math.cos(t) * 7.4), Math.round(11 + Math.sin(t) * 7.4), M.iron[1]); }
    part(g, E(11, 11, 3, 3), M.brass); px(g, 10, 10, M.glow[0]); px(g, 11, 10, M.glow[1]); px(g, 10, 11, M.glow[2]); px(g, 11, 11, M.glow[3]);
    outline(g);
    return frost(g, [7, 8, 13, 14], [[11, 1]]);
  },
};

export const SETS = [
  { key: 'A', title: 'A  THE SIEGE LEGION', sub: 'a disciplined assault army: white armour, red markings, heavy guns', fns: legion,
    names: { drifter: 'assault lander', weaver: 'war raptor (creature)', gunner: 'armoured gunship', seeker: 'missile drone', sniper: 'rail cannon', spinner: 'flak turret' } },
  { key: 'B', title: 'B  THE HUNT PACK', sub: 'raiders who tamed the planet’s beasts: fur, hide, bone, war paint', fns: pack,
    names: { drifter: 'bone sled', weaver: 'snow wolf-bat (creature)', gunner: 'tusk barge', seeker: 'spear glider', sniper: 'skull cannon', spinner: 'fanged bone wheel' } },
  { key: 'C', title: 'C  THE CHITIN SWARM', sub: 'the invaders’ own insect troops: dark shells, red eyes, glowing sacs', fns: swarm,
    names: { drifter: 'beetle pod', weaver: 'swarm wasp (creature)', gunner: 'carapace gunship', seeker: 'needle drone', sniper: 'spine lancer', spinner: 'spore wheel' } },
  { key: 'D', title: 'D  THE FURNACE CORPS', sub: 'heat-powered iron and copper machines with glowing furnaces', fns: furnace,
    names: { drifter: 'boiler pod', weaver: 'fire lizard (creature)', gunner: 'furnace frigate', seeker: 'steam rocket', sniper: 'heat lance', spinner: 'flywheel' } },
];
export const ORDER = ['drifter', 'weaver', 'gunner', 'seeker', 'sniper', 'spinner'];
export { G, P, E, R, and, not, part, px, hline, vline, line, outline, frost, M, K, GLOW };

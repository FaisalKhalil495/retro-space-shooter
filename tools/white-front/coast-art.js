// The White Front's invaders, redrawn sharp from ChatGPT's "Glacier Coast"
// designs: drawn straight onto their final double-detail grids (one grid
// pixel = half a game pixel), never painted big and shrunk. Each returns
// { w, h, a } with a[y][x] = colour or null. Every enemy faces left.
import { G, P, E, R, and, not, part, px, hline, vline, line, outline, K } from './design2.js';

// Materials: [highlight, light, mid, dark, deepest]
const M = {
  olive: ['#a9ac84', '#8b8d6c', '#6e7252', '#575b40', '#40442f'],
  cream: ['#f3efd9', '#e0dcc1', '#c9c5ac', '#a8a48c', '#84816c'],
  steel: ['#a7afb0', '#859092', '#636d70', '#4b5558', '#363f43'],
  dark: ['#6f797c', '#525c60', '#3b4548', '#2c3539', '#20282c'],
  copper: ['#e0b783', '#c09363', '#9b7953', '#7a5e40', '#57422e'],
};
const AMBER = ['#fff1cf', '#f1d69a', '#d99b43', '#a8722f'];
const SNOW = ['#ffffff', '#eef3ec', '#d9e3e0'];

// A flat armour panel: body colour, lit top row and left column, dark bottom row.
function panel(g, x, y, w, h, mat = M.olive) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let c = mat[2];
    if (j === 0) c = mat[1]; else if (j === h - 1) c = mat[3]; else if (i === 0) c = mat[1];
    px(g, x + i, y + j, c);
  }
}
// Engine vent: dark box with steel slats every other row.
function vent(g, x, y, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, j % 2 ? M.dark[4] : M.steel[3]);
  hline(g, x, x + w - 1, y, M.steel[2]);
}
// A gun barrel along a row: lit top, dark under side, copper muzzle.
function barrel(g, x0, x1, y, thick = 2) {
  for (let x = x0; x <= x1; x++) { px(g, x, y, M.steel[1]); for (let k = 1; k < thick; k++) px(g, x, y + k, M.steel[3]); }
  for (let k = 0; k < thick; k++) px(g, x0, y + k, M.copper[1]);
}
const lamp = (g, x, y, lit = false) => { px(g, x, y, lit ? AMBER[0] : AMBER[1]); px(g, x + 1, y, lit ? AMBER[1] : AMBER[2]); };
// Snow lying on the top edges of these columns (after the outline).
function snow(g, cols) {
  for (const x of cols) for (let y = 0; y < g.h; y++) {
    const c = g.a[y][x]; if (!c || c === K) continue;
    g.a[y][x] = SNOW[0];
    break;
  }
  return g;
}
const done = (g, cols = []) => snow(outline(g), cols);

// ------------------------------------------------------------ ground units
function skiff(open) { // Shelf Skiff: armoured sled, twin guns, fires a 3-shot spread
  const g = G(28, 18);
  // ski runner with a curled tip
  part(g, R(4, 15, 22, 2), M.steel, { flat: true }); px(g, 3, 14, M.steel[1]); px(g, 2, 13, M.steel[0]); px(g, 3, 15, M.steel[2]);
  hline(g, 4, 25, 16, M.steel[3]);
  for (const x of [8, 20]) { vline(g, x, 12, 14, M.dark[2]); vline(g, x + 1, 12, 14, M.dark[3]); }
  const hull = P([[2, 7], [7, 3], [22, 3], [26.6, 6.6], [26, 12.4], [7, 12.4], [2, 10.4]]);
  part(g, hull, M.olive);
  part(g, and(hull, P([[2, 7], [7.6, 3.6], [12.4, 4.4], [11.4, 12.4], [7, 12.4], [2, 10.4]])), M.cream);
  line(g, 12, 4, 11, 11, M.cream[4]);
  panel(g, 13, 4, 7, 4); hline(g, 13, 19, 8, M.olive[4]);
  vent(g, 21, 6, 4, 4); panel(g, 25, 7, 2, 4, M.dark);
  for (const x of [15, 18]) px(g, x, 10, M.olive[4]);
  hline(g, 14, 17, 2, M.dark[2]); px(g, 14, 2, M.steel[1]);
  barrel(g, 1, 6, 6); barrel(g, 1, 5, 9);
  if (open) { px(g, 1, 6, AMBER[0]); px(g, 1, 7, AMBER[1]); px(g, 1, 9, AMBER[0]); px(g, 1, 10, AMBER[1]); }
  lamp(g, 8, 5, open);
  return done(g, [9, 10, 15, 16, 17, 22, 23]);
}
function anchor(open) { // Anchor Gun: armoured turret, opens its hatch to fire a heavy shell
  const g = G(24, 16);
  part(g, P([[1.6, 15.6], [4.4, 12.4], [10, 12], [12.6, 13.4], [21.6, 13.6], [22.6, 15.6]]), M.steel);
  panel(g, 9, 10, 5, 3, M.dark);
  const head = P([[3, 5], [7, 1.6], [18, 1.6], [22.4, 4.6], [21.4, 10.4], [9, 11.4], [3.6, 9]]);
  part(g, head, M.olive);
  vent(g, 16, 5, 4, 4);
  if (open) {
    for (let y = 3; y <= 9; y++) for (let x = 5; x <= 12; x++) px(g, x, y, y === 3 ? M.dark[3] : M.dark[4]);
    hline(g, 6, 11, 6, M.copper[1]); hline(g, 7, 10, 6, AMBER[1]); px(g, 8, 6, AMBER[0]);
    part(g, P([[5, 3.6], [7, 0.4], [13, 0.4], [12.4, 3.6]]), M.cream);
    part(g, P([[5, 10], [12.4, 10], [13, 12.6], [7, 12.6]]), M.cream);
  } else {
    part(g, and(head, R(4, 2, 9, 9)), M.cream);
    line(g, 8, 3, 8, 9, M.cream[4]);
    px(g, 6, 4, M.cream[3]); px(g, 10, 4, M.cream[3]); px(g, 6, 9, M.cream[3]); px(g, 10, 9, M.cream[3]);
  }
  barrel(g, 1, 6, 5); px(g, 1, 4, M.steel[2]); px(g, 1, 7, M.steel[3]);
  if (open) { px(g, 1, 5, AMBER[0]); px(g, 1, 6, AMBER[1]); }
  lamp(g, 15, 3, open);
  return done(g, [7, 8, 9, 13, 14, 17, 18]);
}
function roller(open) { // Snow Roller: drum-wheeled tank that rolls charges along the snow
  const g = G(32, 20);
  const body = P([[8, 8], [16, 5.4], [27.6, 8.6], [29.6, 13.6], [23, 17.4], [9, 17]]);
  part(g, body, M.olive);
  part(g, and(body, R(12, 6, 7, 6)), M.cream);
  line(g, 12, 12, 18, 12, M.cream[4]);
  vent(g, 21, 9, 5, 4);
  lamp(g, 25, 7, open);
  const wheel = (cx, cy, r) => {
    // a drum wheel: steel tyre with dark tread notches, dark rim, steel hub, copper axle
    part(g, E(cx, cy, r, r), M.steel);
    const n = Math.round(r * 1.6);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.3;
      px(g, Math.floor(cx + Math.cos(a) * (r - 0.9)), Math.floor(cy + Math.sin(a) * (r - 0.9)), M.dark[3]);
    }
    part(g, E(cx, cy, r - 2.2, r - 2.2), M.dark, { flat: true });
    part(g, E(cx, cy, r * 0.45, r * 0.45), M.steel, { flat: true });
    px(g, Math.floor(cx), Math.floor(cy), M.copper[1]); px(g, Math.floor(cx) - 1, Math.floor(cy) - 1, M.steel[0]);
  };
  part(g, P([[8, 13], [10, 12], [16, 17], [14.6, 18]]), M.steel, { flat: true });
  wheel(8.5, 12.5, 7.4); wheel(26.5, 15, 4.4);
  // the charge launcher: a drum of four tubes, and a long gun on top
  part(g, E(20.5, 4.5, 3.6, 3.6), M.steel);
  for (const [x, y] of [[19, 3], [21, 3], [19, 5], [21, 5]]) { px(g, x, y, open ? AMBER[1] : M.cream[1]); }
  if (open) px(g, 19, 3, AMBER[0]);
  barrel(g, 1, 17, 2); px(g, 1, 1, M.steel[2]); px(g, 2, 1, M.steel[2]);
  return done(g, [13, 14, 15, 16, 17, 23, 24]);
}
// ------------------------------------------------------------ flyers
function dart(open) { // Twin Dart: arrowhead fighter, flies in pairs, aimed shots
  const g = G(22, 16);
  const body = P([[0.6, 8], [11, 1], [21.4, 2.4], [18, 8], [21.4, 13.6], [11, 15]]);
  part(g, body, M.olive);
  part(g, and(body, P([[0.6, 8], [10.6, 4], [13.4, 6], [12.6, 10.4], [9.4, 12.4]])), M.cream);
  panel(g, 13, 6, 6, 4, M.dark); vent(g, 18, 6, 2, 4);
  hline(g, 13, 18, 3, M.olive[1]); hline(g, 13, 18, 12, M.olive[4]);
  lamp(g, 10, 5, open);
  if (open) { barrel(g, 1, 9, 7, 2); px(g, 1, 7, AMBER[0]); px(g, 1, 8, AMBER[1]); }
  else hline(g, 3, 9, 8, M.cream[4]);
  return done(g, [9, 10, 12, 13, 14, 15]);
}
function bomber(open) { // Crest Bomber: wide-winged, drops bombs on a target ring
  const g = G(36, 20);
  part(g, P([[1.4, 6], [8, 2], [18, 8], [13, 12], [8, 9.4], [1.4, 10.4]]), M.cream);
  part(g, P([[20, 8], [28, 2], [34.6, 6], [34, 10.4], [28, 9.4], [24.6, 13]]), M.olive);
  for (const x0 of [1, 29]) { panel(g, x0, 5, 6, 6, M.dark); vent(g, x0 + 1, 6, 4, 4); }
  const fus = P([[9, 9], [15, 5], [24, 6], [28, 10], [24.4, 16.4], [14, 17], [10, 14]]);
  part(g, fus, M.cream);
  panel(g, 17, 7, 7, 4); hline(g, 17, 23, 11, M.olive[4]);
  vent(g, 23, 12, 4, 3);
  lamp(g, 11, 9, open);
  if (open) {
    for (let y = 15; y <= 19; y++) for (let x = 14; x <= 24; x++) px(g, x, y, M.dark[4]);
    for (const x of [16, 21]) { part(g, R(x, 16, 3, 3), M.copper); px(g, x + 1, 18, AMBER[2]); }
    vline(g, 13, 15, 19, M.cream[2]); vline(g, 25, 15, 19, M.cream[2]);
  } else { panel(g, 14, 15, 10, 2); }
  return done(g, [4, 5, 9, 10, 15, 16, 19, 20, 29, 30, 31]);
}
function needle(open) { // Needle Wing: long rail gun, dotted aim line then a fast shot
  const g = G(32, 16);
  part(g, P([[19.4, 9], [25, 1], [27.6, 0.4], [26.4, 9]]), M.olive);
  part(g, P([[21.6, 9], [25.6, 2.6], [26.4, 2.4], [24.6, 9]]), M.cream, { flat: true });
  part(g, P([[17, 11.6], [21, 11.6], [23, 15.4], [21.4, 15.4]]), M.cream);
  panel(g, 10, 8, 18, 5);
  panel(g, 8, 8, 8, 5, M.cream);
  vent(g, 24, 9, 4, 3);
  panel(g, 28, 9, 3, 3, M.dark);
  barrel(g, 1, 9, 9, 2); vline(g, 13, 7, 8, M.dark[2]); px(g, 14, 7, M.dark[2]);
  lamp(g, 13, 7, open);
  if (open) { px(g, 1, 9, AMBER[0]); px(g, 1, 10, AMBER[1]); px(g, 2, 9, AMBER[1]); }
  return done(g, [10, 11, 12, 16, 17, 25, 26]);
}
function hunter(open) { // Wake Hunter: swept-wing interceptor that aims, then dashes at you
  const g = G(30, 20);
  part(g, P([[10, 8.6], [16, 3], [29.4, 0.4], [27.6, 3], [20, 6.4], [18, 9]]), M.olive);
  part(g, P([[10.4, 8.6], [16.4, 3.2], [28.6, 0.6], [26, 2], [17.4, 5], [14, 8.6]]), M.cream, { flat: true });
  part(g, P([[14, 13], [21, 13], [29.4, 18.4], [28.6, 19.6], [18, 17], [11, 14]]), M.olive);
  part(g, P([[16, 13.4], [21, 13.4], [28.4, 18.2], [27.4, 18.8], [20, 15.8]]), M.cream, { flat: true });
  panel(g, 7, 8, 16, 6);
  part(g, P([[1.6, 10], [7.6, 7.6], [12.4, 9], [10.6, 13.6], [3, 12.8]]), M.cream);
  panel(g, 21, 9, 5, 5, M.dark); vent(g, 22, 10, 3, 3);
  if (open) { vline(g, 26, 10, 12, AMBER[1]); px(g, 27, 11, AMBER[2]); }
  barrel(g, 1, 6, 9, 2); barrel(g, 1, 5, 12, 2);
  lamp(g, 8, 9, open);
  for (const [x, y] of [[23, 3], [26, 2], [22, 15], [25, 17]]) px(g, x, y, M.steel[2]);
  return done(g, [11, 12, 14, 15, 16, 17, 18]);
}
// ------------------------------------------------------------ their shots
function charge(open) { // rolling charge (from the Snow Roller)
  const g = G(16, 16);
  part(g, E(8, 8, 7, 7), M.copper);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; px(g, Math.floor(8 + Math.cos(a) * 5.6), Math.floor(8 + Math.sin(a) * 5.6), M.copper[4]); }
  part(g, E(8, 8, 4, 4), M.dark);
  part(g, R(7, 7, 2, 2), open ? [AMBER[0], AMBER[0], AMBER[1], AMBER[2], AMBER[3]] : M.copper, { flat: true });
  hline(g, 5, 8, 2, M.cream[1]);
  return done(g, []);
}
function bomb(open) { // falling bomb (from the Crest Bomber): fins up, nose down
  const g = G(16, 16);
  part(g, P([[4, 1], [7, 1], [7, 5], [5.6, 5]]), M.dark); part(g, P([[9, 1], [12, 1], [10.4, 5], [9, 5]]), M.dark);
  part(g, R(7, 1, 2, 4), M.steel, { flat: true });
  const body = E(8, 9.4, 3.6, 5.4);
  part(g, body, M.copper);
  part(g, and(body, R(0, 6, 16, 1)), M.cream, { flat: true });
  part(g, and(body, R(0, 11, 16, 2)), [AMBER[1], AMBER[1], AMBER[2], AMBER[2], AMBER[3]], { flat: true });
  if (open) { px(g, 7, 13, AMBER[0]); px(g, 8, 13, AMBER[0]); }
  return done(g, []);
}

export const COAST = { skiff, anchor, roller, dart, bomber, needle, hunter, charge, bomb };
export const COAST_NAMES = {
  skiff: 'SHELF SKIFF', anchor: 'ANCHOR GUN', roller: 'SNOW ROLLER', dart: 'TWIN DART', bomber: 'CREST BOMBER',
  needle: 'NEEDLE WING', hunter: 'WAKE HUNTER', charge: 'ROLLING CHARGE', bomb: 'BOMB',
};
void not;

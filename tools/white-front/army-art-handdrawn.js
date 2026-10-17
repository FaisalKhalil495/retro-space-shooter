// The invaders' army on the White Front, drawn sharp at game size (double
// detail: one grid pixel = half a game pixel) from ChatGPT's concept sheet.
// Their look matches the crashed landing ships: blue-grey gunmetal in curved,
// ribbed plates (like a beetle's shell), dull ember-glowing slits, frost on
// the top edges. Every one faces left. Each returns { w, h, a }.
import { G, P, E, R, and, not, part, px, hline, vline, line, outline, K } from './design2.js';

const M = {
  plate: ['#b9c0cc', '#8a93a3', '#666e7e', '#4a505d', '#32363f'],
  dark: ['#6a707c', '#4a4f5a', '#363a43', '#272a31', '#1a1c21'],
  steel: ['#c3c9d2', '#99a1ad', '#727a87', '#555c68', '#3b414b'],
  ember: ['#f8dca0', '#eeae5c', '#d8803a', '#a8552a', '#6e3420'],
  wing: ['rgba(232,228,218,0.80)', 'rgba(205,199,187,0.74)', 'rgba(178,171,159,0.70)', 'rgba(150,143,131,0.70)', 'rgba(120,114,104,0.75)'],
  hide: ['#8f8a86', '#6d6864', '#524e4b', '#3c3936', '#29272a'],
};
const SNOW = ['#ffffff', '#e2ebf3'];
const ember = (g, x, y, w = 2, bright = false) => { for (let i = 0; i < w; i++) px(g, x + i, y, i === 0 || i === w - 1 ? M.ember[2] : bright ? M.ember[0] : M.ember[1]); };
// A rib: a dark seam with a lit edge after it, bending like a shell plate.
function rib(g, shape, x0, bend = 1.5) {
  let y0 = 99, y1 = -1;
  for (let y = 0; y < g.h; y++) if (shape(x0, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (y1 < 0) return;
  const cy = (y0 + y1) / 2, hh = Math.max(1, (y1 - y0) / 2);
  for (let y = y0; y <= y1; y++) {
    const x = Math.round(x0 - bend * (1 - ((y - cy) / hh) ** 2));
    if (shape(x, y)) px(g, x, y, M.plate[4]);
    if (shape(x + 1, y) && y > y0) px(g, x + 1, y, y < cy ? M.plate[0] : M.plate[1]);
  }
}
// A gun barrel along a row.
function barrel(g, x0, x1, y, thick = 2) {
  for (let x = x0; x <= x1; x++) { px(g, x, y, M.steel[1]); for (let k = 1; k < thick; k++) px(g, x, y + k, M.steel[3]); }
  for (let x = x0 + 3; x < x1; x += 4) { px(g, x, y, M.steel[3]); }
  for (let k = 0; k < thick; k++) px(g, x0, y + k, M.dark[3]);
}
// A slanted barrel from (x0,y0) to (x1,y1), 2 pixels thick.
function slant(g, x0, y0, x1, y1) { line(g, x0, y0, x1, y1, M.steel[1]); line(g, x0, y0 + 1, x1, y1 + 1, M.steel[3]); px(g, x1, y1, M.dark[3]); px(g, x1, y1 + 1, M.dark[3]); }
// Frost lying on the top edge of these columns.
function frost(g, cols) {
  for (const x of cols) for (let y = 0; y < g.h; y++) {
    const c = g.a[y][x]; if (!c || c === K) continue;
    if (c.startsWith('rgba')) break;
    g.a[y][x] = SNOW[0]; if (g.a[y + 1] && g.a[y + 1][x] && g.a[y + 1][x] !== K) g.a[y + 1][x] = SNOW[1];
    break;
  }
  return g;
}
const done = (g, cols) => frost(outline(g), cols);
const blade = (g, pts, mat = M.plate) => part(g, P(pts), mat);

// ------------------------------------------------------------ flyers
function pod(open) { // Assault pod: a small armoured beetle with claws at the front
  const g = G(32, 26);
  for (const pts of [[[0.6, 9], [9, 7.6], [9, 10.4]], [[1, 14], [9, 12.4], [9, 15.4]], [[2.6, 19.6], [10.4, 16.6], [10.6, 19]]]) blade(g, pts, M.dark);
  const body = P([[6, 11], [10, 5.6], [18, 3.6], [26, 5.6], [30.6, 11], [29, 17.4], [18, 21], [8.6, 19]]);
  part(g, body, M.plate);
  part(g, and(body, R(0, 17, 32, 9)), M.dark);
  for (const x of [12, 16, 20, 24]) rib(g, body, x, 1.6);
  for (const x of [12, 16, 20, 24]) ember(g, x + 1, 18, 2, open);
  ember(g, 8, 10, 3, open);
  part(g, E(29.4, 12, 1.6, 2.6), M.ember, { flat: true });
  return done(g, [11, 12, 14, 16, 18, 19, 22, 24]);
}
function wasp(open) { // Hive wasp: a living war beast with armour bolted on
  const g = G(36, 30);
  // wings behind the body
  part(g, P([[11, 11], [14, 2], [20, 0.4], [21, 3], [15, 12]]), M.wing, { flat: true });
  part(g, P([[14, 12], [22, 3], [31, 1.6], [32, 4], [19, 13]]), M.wing, { flat: true });
  line(g, 12, 10, 18, 2, M.wing[4]); line(g, 16, 11, 29, 3, M.wing[4]); line(g, 19, 7, 25, 6, M.wing[3]);
  // legs
  for (const [x0, x1] of [[11, 8], [14, 13], [17, 19]]) { line(g, x0, 18, x1, 24, M.hide[3]); line(g, x1, 24, x1 - 2, 28, M.hide[2]); px(g, x1 - 2, 28, M.hide[4]); }
  // abdomen: segmented and armoured, ember glowing between the plates
  const abd = E(25.6, 18, 9.4, 5.6);
  part(g, abd, M.plate);
  for (const x of [20, 24, 28, 32]) { rib(g, abd, x, 1.2); px(g, x, 22, M.ember[2]); px(g, x + 1, 22, open ? M.ember[0] : M.ember[1]); }
  px(g, 34, 19, M.dark[2]); px(g, 35, 19, M.dark[3]);
  // thorax and head
  part(g, E(14, 16, 4.4, 4), M.hide);
  part(g, E(7.6, 16, 4.6, 3.8), M.plate);
  rib(g, E(7.6, 16, 4.6, 3.8), 9, 1);
  px(g, 5, 15, M.ember[1]); px(g, 6, 15, open ? M.ember[0] : M.ember[2]); px(g, 5, 16, M.ember[3]);
  // mandibles
  part(g, P([[1, 17], [4, 17.6], [3.4, 21], [1.6, 21.6]]), M.dark); part(g, P([[3.4, 19], [6, 19.4], [5, 22.6]]), M.dark);
  return done(g, [6, 7, 8, 9, 22, 23, 26, 27, 30]);
}
function gunship(open) { // Gunship: a small copy of the landing ship, jaw plate, twin cannons
  const g = G(48, 34);
  blade(g, [[24, 6], [31, 0.6], [33.6, 1], [30, 6.4]]); blade(g, [[34, 6], [41, 1.6], [43.4, 2.4], [39.6, 7]]);
  blade(g, [[33, 21.4], [41.6, 30], [39.4, 31], [29.6, 22.4]]);
  const hull = P([[9, 11], [17, 5.4], [38, 5.4], [46.6, 11], [45, 19.6], [35, 22.6], [15, 22], [8.4, 17]]);
  part(g, hull, M.plate);
  part(g, and(hull, R(0, 18, 48, 6)), M.dark);
  for (const x of [17, 22, 27, 32, 37, 42]) rib(g, hull, x, 1.8);
  for (const x of [18, 23, 28, 33]) ember(g, x, 20, 2, open);
  // the jaw: an armoured lip with a glowing mouth slit
  part(g, P([[5.4, 15.6], [15, 17], [14, 21.6], [8, 20]]), M.plate);
  hline(g, 8, 14, 15, M.ember[2]); hline(g, 9, 13, 15, open ? M.ember[0] : M.ember[1]);
  // twin cannons under the jaw
  part(g, R(12, 21, 9, 6), M.dark);
  barrel(g, 1, 13, 22); barrel(g, 2, 13, 25);
  if (open) { px(g, 1, 22, M.ember[0]); px(g, 2, 25, M.ember[0]); }
  part(g, E(46.4, 13, 1.4, 3.4), M.ember, { flat: true });
  return done(g, [12, 18, 19, 25, 26, 29, 36, 37, 44]);
}
function dart(open) { // Strike dart: a narrow interceptor of swept-back blades
  const g = G(34, 24);
  blade(g, [[11, 8.6], [21, 1.4], [24.6, 1.6], [18, 9.6]]); blade(g, [[19, 9.6], [28.6, 3.4], [31, 4], [25, 10.4]]);
  blade(g, [[11, 15.4], [21, 22.6], [24.6, 22.4], [18, 14.4]], M.dark); blade(g, [[19, 14.4], [28.6, 20.6], [31, 20], [25, 13.6]], M.dark);
  const body = P([[1, 12], [11, 8.6], [27, 9], [32.6, 12], [27, 15], [11, 15.4]]);
  part(g, body, M.plate);
  for (const x of [14, 19, 24]) rib(g, body, x, 1);
  ember(g, 8, 11, 4, open); ember(g, 15, 14, 2, open); ember(g, 20, 14, 2, open);
  px(g, 32, 11, M.ember[1]); px(g, 32, 12, M.ember[2]);
  return done(g, [9, 10, 13, 15, 21, 22, 27, 28]);
}
function lancer(open) { // Rail lancer: the sniper, one long thin cannon and a glowing sight
  const g = G(58, 22);
  blade(g, [[33, 6.4], [43, 0.6], [45.6, 1], [41, 6.6]]); blade(g, [[44, 6.6], [50, 2.6], [51.6, 3], [48, 7.4]]);
  blade(g, [[37, 13.6], [45.4, 20.6], [43, 21.4], [33, 14.6]], M.dark);
  const body = P([[23, 10], [29.6, 6], [46, 6], [54.6, 10], [51, 14], [30, 15]]);
  part(g, body, M.plate);
  for (const x of [32, 37, 42, 47]) rib(g, body, x, 1.2);
  barrel(g, 1, 27, 9, 2); part(g, R(20, 8, 6, 4), M.dark);
  for (const x of [34, 39, 44]) ember(g, x, 13, 2, open);
  px(g, 28, 7, open ? M.ember[0] : M.ember[1]); px(g, 29, 7, M.ember[2]); px(g, 28, 8, M.ember[3]);
  if (open) { px(g, 1, 9, M.ember[0]); px(g, 1, 10, M.ember[1]); }
  part(g, E(54.6, 10.4, 1.2, 2.2), M.ember, { flat: true });
  return done(g, [30, 31, 35, 36, 40, 41, 43, 49]);
}
function wheel(open) { // Flak wheel: a spinning armoured drone, eight barrels round its rim
  const g = G(36, 36);
  const C = 18;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
    part(g, P([[C + c * 10 - s * 1.6, C + s * 10 + c * 1.6], [C + c * 16.6 - s * 1.6, C + s * 16.6 + c * 1.6], [C + c * 16.6 + s * 1.6, C + s * 16.6 - c * 1.6], [C + c * 10 + s * 1.6, C + s * 10 - c * 1.6]]), M.steel);
    px(g, Math.floor(C + c * 16), Math.floor(C + s * 16), open ? M.ember[0] : M.ember[2]);
  }
  part(g, and(E(C, C, 13, 13), not(E(C, C, 11, 11))), M.dark);
  part(g, E(C, C, 9.4, 9.4), M.plate);
  rib(g, E(C, C, 9.4, 9.4), 14, 1.2); rib(g, E(C, C, 9.4, 9.4), 22, -1.2);
  hline(g, 14, 21, 18, M.dark[4]); hline(g, 15, 20, 18, M.ember[2]); hline(g, 16, 19, 18, open ? M.ember[0] : M.ember[1]);
  return done(g, [12, 13, 16, 17, 19, 20, 23]);
}
// ------------------------------------------------------------ ground units
function skiff(open) { // Ice skiff: a ribbed armoured sled with a twin-gun turret
  const g = G(48, 28);
  // skis with upturned tips, and their struts
  for (const [x0, x1, y] of [[3, 24, 24], [27, 46, 25]]) {
    part(g, R(x0, y, x1 - x0, 2), M.dark, { flat: true }); px(g, x0 - 1, y - 1, M.dark[1]); px(g, x0 - 2, y - 2, M.dark[0]); px(g, x0 - 1, y, M.dark[2]);
    for (const x of [x0 + 5, x1 - 5]) { vline(g, x, y - 4, y - 1, M.dark[3]); }
  }
  const hull = P([[5, 15], [11, 9], [34, 8], [45, 12.6], [43, 20], [10, 21]]);
  part(g, hull, M.plate);
  part(g, and(hull, R(0, 17, 48, 5)), M.dark);
  for (const x of [15, 21, 27, 33, 39]) rib(g, hull, x, 1.4);
  for (const x of [16, 22, 28, 34]) ember(g, x, 18, 2, open);
  // the turret and its twin guns
  part(g, P([[18, 8.4], [21, 3.6], [31, 3.4], [34, 8.4]]), M.plate);
  rib(g, P([[18, 8.4], [21, 3.6], [31, 3.4], [34, 8.4]]), 26, 1);
  barrel(g, 5, 19, 4); barrel(g, 6, 19, 7);
  if (open) { px(g, 5, 4, M.ember[0]); px(g, 6, 7, M.ember[0]); }
  px(g, 22, 5, M.ember[1]); px(g, 23, 5, M.ember[2]);
  return done(g, [12, 13, 20, 21, 24, 25, 30, 31, 37, 38]);
}
function turret(open) { // Drop turret: a dome on a glowing core, planted on spiked legs
  const g = G(40, 34);
  for (const pts of [[[10, 23.6], [2, 32.6], [5.6, 32.6], [14, 25]], [[16, 25], [12.6, 33.4], [16.6, 33.4], [19.6, 25]], [[22.4, 25], [24.6, 33.4], [28.6, 33.4], [26, 25]], [[29, 23.6], [36, 32.6], [39.4, 32.6], [32, 25]]]) blade(g, pts, M.dark);
  part(g, P([[10, 21], [32, 21], [34, 25.6], [8.6, 25.6]]), M.plate);
  // the core: armoured shutters, glowing slits (wide open when it fires)
  part(g, R(15, 12, 13, 9), M.dark);
  for (const x of [17, 20, 23, 26]) for (let y = 13; y < 20; y++) px(g, x, y, open ? (y % 3 ? M.ember[1] : M.ember[0]) : (y % 2 ? M.ember[2] : M.ember[3]));
  if (open) for (const x of [18, 21, 24]) for (let y = 13; y < 20; y++) px(g, x, y, M.ember[2]);
  const head = P([[10, 12.4], [13, 4.6], [21, 2], [29, 3.6], [33, 9], [32.6, 12.4]]);
  part(g, head, M.plate);
  for (const x of [17, 22, 27]) rib(g, head, x, 1.2);
  slant(g, 14, 7, 2, 1); slant(g, 14, 10, 2, 4);
  if (open) { px(g, 2, 1, M.ember[0]); px(g, 2, 4, M.ember[0]); }
  return done(g, [13, 14, 18, 19, 23, 24, 28, 29]);
}
function drum(open) { // Drum tank: a huge spiked roller in front, a launcher on top
  const g = G(52, 32);
  // the body and the rear wheel
  const body = P([[18, 12], [22, 9], [46, 9], [50, 14], [49, 24], [20, 25]]);
  part(g, body, M.plate);
  part(g, and(body, R(0, 21, 52, 5)), M.dark);
  for (const x of [26, 32, 38, 44]) rib(g, body, x, 1.4);
  for (const x of [27, 33, 39]) ember(g, x, 22, 2, open);
  part(g, E(43.4, 25.6, 5.4, 5.4), M.dark); part(g, E(43.4, 25.6, 2.4, 2.4), M.steel); px(g, 43, 25, M.ember[2]);
  // the launcher: four tubes facing forward
  part(g, P([[19, 2.4], [38, 2.4], [40, 8.6], [19, 8.6]]), M.plate);
  rib(g, P([[19, 2.4], [38, 2.4], [40, 8.6], [19, 8.6]]), 30, 0.8);
  for (const [x, y] of [[20, 3], [23, 3], [20, 6], [23, 6]]) { px(g, x, y, M.dark[4]); px(g, x + 1, y, open ? M.ember[0] : M.ember[2]); px(g, x, y + 1, open ? M.ember[1] : M.ember[3]); px(g, x + 1, y + 1, M.dark[4]); }
  // the drum: spikes all round, then the drum and its hub
  const cx = 13, cy = 20;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    part(g, P([[cx + c * 9 - s * 1.8, cy + s * 9 + c * 1.8], [cx + c * 12.6, cy + s * 12.6], [cx + c * 9 + s * 1.8, cy + s * 9 - c * 1.8]]), M.steel);
  }
  part(g, E(cx, cy, 10, 10), M.dark);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI; line(g, Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 9), Math.round(cx - Math.cos(a) * 9), Math.round(cy - Math.sin(a) * 9), M.dark[3]); }
  part(g, E(cx, cy, 4, 4), M.plate); px(g, cx - 1, cy - 1, M.plate[0]); px(g, cx, cy, M.ember[2]);
  return done(g, [9, 10, 13, 16, 22, 23, 27, 28, 34, 35, 41, 47]);
}

export const ARMY = { pod, wasp, gunship, dart, lancer, wheel, skiff, turret, drum };
export const ARMY_NAMES = {
  pod: 'ASSAULT POD', wasp: 'HIVE WASP', gunship: 'GUNSHIP', dart: 'STRIKE DART', lancer: 'RAIL LANCER',
  wheel: 'FLAK WHEEL', skiff: 'ICE SKIFF', turret: 'DROP TURRET', drum: 'DRUM TANK',
};

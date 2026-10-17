// The Siege Legion, improved (same sizes as their level 1 cousins). What's
// new on every one: the Legion's mark (a red chevron), a lit top rim, a dark
// belly line, glowing exhausts with a short heat trail, and sharper guns.
// Plus two new designs that come out of the story: the Drop Pod and the
// Searchlight Drone. Every one faces left.
import { G, P, E, R, and, not, part, px, hline, vline, line, outline, frost, M, K, GLOW } from './design2.js';

const SNOW = ['#ffffff', '#f1f6fa', '#dde8f1', '#bccee2', '#a9bed6'];
const chevron = (g, x, y) => { px(g, x + 1, y, M.red[1]); px(g, x, y + 1, M.red[0]); px(g, x + 1, y + 2, M.red[1]); }; // a '<' pointing forward
const exhaust = (g, x, y, n = 2) => { for (let i = 0; i < n; i++) px(g, x + i, y, i === 0 ? M.glow[1] : M.glow[3]); };
// a lit rim along the top edge of these columns (after the outline)
function rim(g, cols) {
  for (const x of cols) for (let y = 0; y < g.h; y++) { const c = g.a[y][x]; if (!c || c === K) continue; if (c === M.white[1] || c === M.white[2] || c === M.grey[1] || c === M.grey[2]) g.a[y][x] = M.white[0]; break; }
  return g;
}

export const legion2 = {
  drifter() { // assault lander
    const g = G(20, 16);
    const hull = P([[2, 8], [6, 3.6], [15, 3.2], [18.6, 6], [18.6, 10.4], [15, 12.6], [6, 12.4]]);
    part(g, hull, M.white);
    part(g, and(hull, R(0, 10, 20, 6)), M.grey);
    part(g, P([[1, 8], [5.6, 4.4], [7.6, 4.4], [7.6, 11.6], [5.6, 11.6]]), M.grey);
    part(g, and(hull, R(11, 0, 2, 16)), M.red, { flat: true });
    part(g, P([[8.4, 5], [10.8, 4.4], [10.8, 7.2], [8.4, 7.2]]), M.glass); px(g, 9, 5, M.glass[0]); px(g, 10, 6, M.glass[1]);
    hline(g, 13, 17, 9, M.white[3]); px(g, 15, 5, M.white[3]); px(g, 15, 11, M.white[3]);
    chevron(g, 14, 6);
    part(g, R(17, 6, 2, 4), M.gun); px(g, 18, 7, M.glow[1]); px(g, 18, 8, M.glow[2]);
    hline(g, 6, 15, 13, M.gun[3]); px(g, 6, 13, M.gun[1]); px(g, 9, 14, M.gun[2]); px(g, 13, 14, M.gun[2]);
    line(g, 14, 3, 16, 1, M.gun[2]); px(g, 16, 1, M.eye[1]);
    hline(g, 0, 2, 9, M.gun[1]); px(g, 0, 10, M.gun[3]); // the nose gun
    outline(g);
    exhaust(g, 19, 7); exhaust(g, 19, 8);
    rim(g, [3, 4, 5, 6, 7, 13, 14, 15, 16, 17]);
    return frost(g, [7, 9, 10, 13], [[8, 2], [12, 2], [14, 1]]);
  },
  weaver() { // war raptor, a living creature in a Legion harness
    const g = G(22, 18);
    part(g, P([[8, 9.5], [10.5, 3], [13.5, 0.6], [19.5, 2.6], [17, 6], [14.5, 9.5]]), M.slate);
    for (const x of [11, 13, 15, 17]) line(g, x - 1, 8, x + 1, 3, M.slate[3]);
    for (const x of [12, 14, 16]) px(g, x, 2, M.slate[0]);
    part(g, E(12, 11, 6.2, 3.4), M.hide2);
    part(g, P([[16.6, 10], [21.6, 12.6], [16.6, 13.2]]), M.slate);
    line(g, 18, 11, 21, 12, M.slate[0]);
    part(g, E(5, 9.4, 3.4, 2.5), M.hide2);
    part(g, P([[3, 6.4], [5, 4.4], [6.4, 7.6]]), M.red);
    part(g, P([[0.4, 10.2], [3, 8.8], [3.2, 11.4]]), M.bone); px(g, 0, 11, M.bone[3]); // the hooked beak
    px(g, 4, 9, M.eye[0]); px(g, 5, 9, K); px(g, 4, 8, M.eye[2]);
    part(g, P([[9, 8], [15.4, 8], [15.4, 10.4], [9, 10.4]]), M.red);
    hline(g, 9, 15, 10, M.gun[2]); px(g, 10, 9, M.red[0]); px(g, 14, 9, M.red[0]);
    part(g, R(11, 7, 3, 1), M.gun, { flat: true }); px(g, 12, 6, M.gun[1]); // a harness-mounted gun
    line(g, 10, 14, 9, 16, M.hide2[3]); line(g, 14, 14, 15, 16, M.hide2[3]);
    px(g, 8, 16, M.bone[2]); px(g, 7, 17, M.bone[3]); px(g, 16, 16, M.bone[2]); px(g, 17, 17, M.bone[3]); // talons
    outline(g);
    return frost(g, [12, 13, 14], []);
  },
  gunner() { // armoured gunship
    const g = G(28, 22);
    const hull = P([[3, 9], [8, 5.6], [22, 5.6], [26.6, 8.6], [26.6, 14], [22, 17.2], [8, 17.2], [3, 13]]);
    part(g, hull, M.white);
    part(g, and(hull, R(0, 14, 28, 8)), M.grey);
    part(g, P([[11, 5.8], [13, 2.2], [19.4, 2.2], [21, 5.8]]), M.grey);
    part(g, R(8, 3, 6, 2), M.gun); px(g, 8, 3, M.gun[0]);
    part(g, P([[6, 7], [10.6, 6], [10.6, 9], [6, 9]]), M.glass); px(g, 7, 7, M.glass[0]); px(g, 8, 7, M.glass[0]); px(g, 9, 8, M.glass[1]);
    part(g, and(hull, R(16, 0, 2, 22)), M.red, { flat: true }); part(g, and(hull, R(19, 0, 1, 22)), M.red, { flat: true });
    chevron(g, 22, 9);
    part(g, R(0, 8, 6, 2), M.gun); part(g, R(0, 12, 6, 2), M.gun);
    px(g, 0, 8, M.gun[0]); px(g, 0, 12, M.gun[0]); px(g, 3, 9, M.gun[3]); px(g, 3, 13, M.gun[3]);
    for (const x of [10, 13, 22, 24]) px(g, x, 11, M.white[3]);
    hline(g, 9, 23, 14, M.grey[3]);
    for (const x of [10, 14, 18]) { px(g, x, 16, M.glow[2]); px(g, x + 1, 16, M.glow[3]); } // belly vents
    part(g, R(25, 9, 2, 4), M.gun); px(g, 26, 10, M.glow[1]); px(g, 26, 11, M.glow[2]);
    outline(g);
    exhaust(g, 27, 10); exhaust(g, 27, 11);
    rim(g, [9, 10, 11, 21, 22, 23, 24]);
    return frost(g, [9, 10, 14, 15, 16, 17, 20, 22, 23], [[10, 2], [14, 3], [19, 2], [23, 1]]);
  },
  seeker() { // missile drone
    const g = G(20, 14);
    part(g, P([[13.5, 5], [17, 1], [18.8, 1], [17, 5.2]]), M.grey);
    part(g, P([[13.5, 9], [17, 13], [18.8, 13], [17, 8.8]]), M.grey);
    part(g, R(4, 5, 14, 4), M.white);
    part(g, P([[0.8, 7], [4.6, 4.6], [4.6, 9.4]]), M.red); px(g, 2, 6, M.red[0]);
    part(g, R(8, 5, 2, 4), M.grey, { flat: true });
    chevron(g, 11, 5);
    hline(g, 5, 16, 8, M.white[3]);
    part(g, R(17, 6, 1, 2), M.gun); px(g, 18, 6, M.glow[1]); px(g, 18, 7, M.glow[2]);
    outline(g);
    exhaust(g, 19, 6); exhaust(g, 19, 7);
    rim(g, [5, 6, 7, 12, 13, 14]);
    return frost(g, [5, 6, 11, 12, 13], [[10, 1]]);
  },
  sniper() { // rail cannon
    const g = G(28, 14);
    part(g, P([[14, 3.4], [24, 3.4], [27, 6], [27, 9.4], [24, 11.6], [14, 11.6]]), M.white);
    part(g, R(1, 5, 14, 1), M.gun, { flat: true }); part(g, R(1, 9, 14, 1), M.gun, { flat: true });
    for (const x of [3, 7, 11]) part(g, R(x, 4, 2, 7), M.red);
    hline(g, 1, 14, 7, M.glow[2]); hline(g, 2, 13, 7, M.glow[1]); px(g, 1, 7, M.glow[0]);
    part(g, R(0, 4, 1, 7), M.gun);
    part(g, R(16, 1, 7, 2), M.gun); px(g, 16, 1, M.eye[0]); px(g, 16, 2, M.eye[2]); // the red sight
    part(g, R(21, 4, 2, 7), M.red, { flat: true });
    chevron(g, 18, 6);
    for (const y of [5, 9]) px(g, 25, y, M.white[3]);
    outline(g);
    rim(g, [15, 17, 18, 19, 22, 24, 25]);
    return frost(g, [15, 17, 18, 19, 22, 24, 25], [[18, 2], [23, 1]]);
  },
  spinner() { // flak turret
    const g = G(22, 22);
    for (let i = 0; i < 4; i++) {
      const t = 0.4 + (i * Math.PI) / 2, cx = 11 + Math.cos(t) * 8.4, cy = 11 + Math.sin(t) * 8.4;
      part(g, E(cx, cy, 1.6, 1.6), M.gun);
      line(g, Math.round(11 + Math.cos(t) * 6), Math.round(11 + Math.sin(t) * 6), Math.round(cx), Math.round(cy), M.gun[2]);
      px(g, Math.round(cx), Math.round(cy), M.glow[2]);
    }
    part(g, E(11, 11, 7, 7), M.white);
    part(g, and(E(11, 11, 7, 7), not(E(11, 11, 5, 5))), M.grey);
    for (let i = 0; i < 8; i++) { const t = (i * Math.PI) / 4; px(g, Math.round(11 + Math.cos(t) * 6), Math.round(11 + Math.sin(t) * 6), M.grey[3]); }
    part(g, E(11, 11, 3, 3), M.red);
    px(g, 10, 10, M.glow[0]); px(g, 11, 10, M.glow[1]); px(g, 10, 11, M.glow[2]); px(g, 11, 11, M.glow[3]);
    outline(g);
    return frost(g, [8, 9, 10, 11, 12, 13], [[9, 1], [12, 2]]);
  },
  // ---------------- new: the Drop Pod, falling from a landing ship (closed),
  // then planted in the snow and opened into a twin-gun turret
  droppod() {
    const g = G(18, 26);
    part(g, P([[4, 6], [9, 1.4], [14, 6], [14, 20], [4, 20]]), M.white);
    part(g, and(P([[4, 6], [9, 1.4], [14, 6], [14, 20], [4, 20]]), R(11, 0, 4, 26)), M.grey);
    part(g, R(4, 10, 10, 2), M.red, { flat: true });
    chevron(g, 8, 13);
    part(g, P([[2.6, 20], [15.4, 20], [14, 24], [4, 24]]), M.gun);
    for (const x of [5, 8, 11]) { px(g, x, 24, M.glow[1]); px(g, x + 1, 24, M.glow[2]); px(g, x, 25, M.glow[3]); }
    part(g, P([[1, 14], [4, 12], [4, 20], [1.4, 21]]), M.grey); part(g, P([[17, 14], [14, 12], [14, 20], [16.6, 21]]), M.grey);
    outline(g);
    return frost(g, [7, 8, 9, 10], []);
  },
  droppodOpen() {
    const g = G(26, 20);
    part(g, P([[3, 19.6], [6, 13], [20, 13], [23, 19.6]]), M.grey); // its opened petals in the snow
    part(g, P([[0.4, 19.6], [3, 15], [6, 19.6]]), M.white); part(g, P([[20, 19.6], [23, 15], [25.6, 19.6]]), M.white);
    part(g, E(13, 12, 6.6, 5), M.white);
    part(g, and(E(13, 12, 6.6, 5), R(0, 13, 26, 8)), M.grey);
    part(g, R(9, 10, 8, 1), M.red, { flat: true });
    part(g, R(1, 8, 10, 2), M.gun); part(g, R(1, 11, 10, 2), M.gun); px(g, 1, 8, M.gun[0]); px(g, 1, 11, M.gun[0]);
    px(g, 14, 9, M.eye[0]); px(g, 15, 9, M.eye[2]);
    outline(g);
    for (let x = 0; x < 26; x++) if (g.a[19][x]) g.a[19][x] = SNOW[x % 3 ? 1 : 0];
    return frost(g, [11, 12, 13, 14, 15], []);
  },
  // ---------------- new: the Searchlight Drone, sweeping a beam; caught in it, artillery comes for you
  searchlight() {
    const g = G(22, 16);
    part(g, E(12, 7, 8.4, 4.6), M.white);
    part(g, and(E(12, 7, 8.4, 4.6), R(0, 8, 22, 8)), M.grey);
    part(g, R(10, 2, 1, 2), M.gun); px(g, 10, 1, M.eye[1]); // aerial
    part(g, P([[1, 9], [6, 7], [8, 9.6], [6, 13], [1.6, 12]]), M.gun); // the lamp housing
    part(g, E(3.4, 10.4, 1.8, 2.2), M.glow, { flat: true }); px(g, 3, 10, '#fffaf0');
    chevron(g, 15, 5);
    part(g, R(9, 12, 7, 1), M.gun, { flat: true });
    for (const x of [10, 14]) { px(g, x, 13, M.glow[2]); px(g, x, 14, M.glow[3]); }
    outline(g);
    rim(g, [7, 8, 9, 11, 12, 13, 14, 15, 16]);
    return frost(g, [8, 9, 12, 13, 16], []);
  },
};
export const LEGION2_NAMES = {
  drifter: 'ASSAULT LANDER', weaver: 'WAR RAPTOR', gunner: 'ARMOURED GUNSHIP', seeker: 'MISSILE DRONE', sniper: 'RAIL CANNON', spinner: 'FLAK TURRET',
  droppod: 'DROP POD (falling)', droppodOpen: 'DROP POD (landed)', searchlight: 'SEARCHLIGHT DRONE',
};

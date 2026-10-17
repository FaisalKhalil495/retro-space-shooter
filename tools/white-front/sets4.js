// Four new looks for the White Front's army, each with the same seven jobs
// and the same sizes as the coast army (double-detail grids, facing left):
// skiff 28x18, anchor 24x16, roller 32x20 (ground); dart 22x16,
// bomber 36x20, needle 32x16, hunter 30x20 (air).
import { G, P, E, R, and, not, part, px, hline, vline, line, outline, frost, M, K } from './design2.js';

const C = {
  camo: ['#f4f6f8', '#d8dee6', '#b6bfcb', '#8c97a8', '#646f82'],
  camoD: ['#a2adbf', '#7d899e', '#5f6b82', '#465166', '#2f374a'],
  visor: ['#5a6474', '#2c323e', '#1c2029', '#14171e', '#0c0e13'],
  haz: ['#f8dc98', '#eab25a', '#cf8f3c', '#93602c', '#5e3c1c'],
  wolf: ['#8f96a3', '#6a717e', '#4e5461', '#383d48', '#252931'],
  chit: ['#9f8fb7', '#75628f', '#56466c', '#3c3050', '#271f35'],
  sac: ['#fff0c8', '#ecd08e', '#d0a35a', '#9a7638', '#6e5226'],
  eye: ['#ffd9a8', '#f2a26a', '#c8643f', '#8a3c2c', '#57221c'],
  wing: ['rgba(236,232,246,0.85)', 'rgba(208,200,226,0.78)', 'rgba(176,166,200,0.74)', 'rgba(140,128,168,0.74)', 'rgba(110,98,140,0.8)'],
  iron: ['#8d8a92', '#6b6870', '#4f4c55', '#3a3840', '#26252b'],
  cu: ['#efb98c', '#cf8d58', '#a8683c', '#7a4a2a', '#55321c'],
  glow: ['#fff3d6', '#f8d79a', '#f0b25a', '#d7853a', '#a5592a'],
};
const ink = (g, cols = [], ice = []) => frost(outline(g), cols, ice);
const barrel = (g, x0, x1, y, mat = M.gun, t = 2) => { for (let x = x0; x <= x1; x++) { px(g, x, y, mat[1]); for (let k = 1; k < t; k++) px(g, x, y + k, mat[3]); } px(g, x0, y, mat[0]); };
const glowAt = (g, x, y, open, w = 2) => { for (let i = 0; i < w; i++) px(g, x + i, y, open ? C.glow[0] : C.glow[2]); };

// ===================================================================== 1. ICE COMMANDOS
// Winter camouflage: pale armour with blue-grey splinter patches, black
// visors, boxy and military. The invaders' special forces.
const splinter = (g, shape, pts) => part(g, and(shape, P(pts)), C.camoD, { flat: true });
const commando = {
  skiff(o) { const g = G(28, 18);
    part(g, R(3, 15, 23, 2), C.visor, { flat: true }); px(g, 2, 14, C.visor[0]); px(g, 1, 13, C.visor[0]);
    for (const x of [8, 20]) vline(g, x, 12, 14, C.visor[2]);
    const hull = P([[2, 8], [6, 4], [24, 4], [26.6, 7], [26.6, 12.4], [4, 12.4]]);
    part(g, hull, C.camo); splinter(g, hull, [[10, 4], [16, 4], [12, 9]]); splinter(g, hull, [[18, 12.4], [24, 7], [26, 12.4]]);
    part(g, P([[3, 7.6], [6, 5], [10, 5], [10, 8]]), C.visor);
    part(g, R(13, 1, 9, 4), C.camoD); barrel(g, 2, 13, 2, M.gun); barrel(g, 4, 13, 5, M.gun, 1);
    if (o) { px(g, 2, 2, C.glow[0]); px(g, 2, 3, C.glow[1]); }
    return ink(g, [7, 8, 15, 16, 22], [[12, 2], [22, 1]]); },
  anchor(o) { const g = G(24, 16);
    part(g, P([[2, 15.6], [5, 12], [19, 12], [22, 15.6]]), C.camoD);
    const box = P([[5, 4], [19, 4], [21, 7], [21, 12], [5, 12]]);
    part(g, box, C.camo); splinter(g, box, [[12, 4], [17, 4], [14, 9]]);
    if (o) { part(g, R(7, 6, 6, 4), C.visor); hline(g, 8, 12, 8, C.glow[1]); px(g, 10, 8, C.glow[0]); } else part(g, R(7, 6, 6, 4), C.camoD);
    barrel(g, 1, 7, 7, M.gun, 3); px(g, 1, 7, o ? C.glow[0] : M.gun[0]);
    part(g, R(15, 1, 2, 4), M.gun); px(g, 15, 1, C.eye[1]);
    return ink(g, [8, 9, 13, 18], [[10, 1]]); },
  roller(o) { const g = G(32, 20);
    for (let x = 3; x < 30; x++) { px(g, x, 18, C.visor[2]); px(g, x, 17, x % 3 ? C.visor[1] : C.visor[3]); }
    part(g, P([[2, 17.6], [4, 13], [29, 13], [30.6, 17.6]]), C.visor);
    for (const x of [6, 12, 18, 24]) part(g, E(x + 1.5, 15.2, 1.8, 1.8), M.gun);
    const body = P([[5, 13], [8, 7], [26, 7], [29, 13]]);
    part(g, body, C.camo); splinter(g, body, [[14, 7], [20, 7], [17, 13], [13, 13]]);
    part(g, R(18, 2, 9, 5), C.camoD); for (const [x, y] of [[19, 3], [22, 3], [19, 5], [22, 5]]) { px(g, x, y, o ? C.glow[0] : C.visor[2]); px(g, x + 1, y, o ? C.glow[2] : C.visor[3]); }
    part(g, P([[7.6, 8.4], [11, 7.6], [11, 10], [7.6, 10]]), C.visor);
    return ink(g, [9, 10, 15, 21, 24], [[16, 2]]); },
  dart(o) { const g = G(22, 16);
    const body = P([[1, 8], [8, 4], [20, 4.6], [20, 11.4], [8, 12]]);
    part(g, body, C.camo); splinter(g, body, [[11, 4], [16, 4.4], [12, 8]]);
    part(g, P([[11, 4.4], [18, 1], [20, 1], [17, 4.6]]), C.camoD); part(g, P([[11, 11.6], [18, 15], [20, 15], [17, 11.4]]), C.camoD);
    part(g, P([[3, 7.4], [8, 5.2], [10, 5.2], [10, 7.4]]), C.visor);
    hline(g, 2, 7, 9, M.gun[2]); if (o) { px(g, 1, 8, C.glow[0]); px(g, 2, 9, C.glow[1]); }
    glowAt(g, 19, 7, o); glowAt(g, 19, 8, o);
    return ink(g, [6, 7, 12, 13], [[9, 1]]); },
  bomber(o) { const g = G(36, 20);
    part(g, P([[2, 7], [10, 3], [30, 3], [34.6, 7], [33, 11], [3, 11]]), C.camoD);
    const hull = P([[8, 6], [12, 4], [28, 4], [31, 9], [28, 15], [12, 15], [8, 12]]);
    part(g, hull, C.camo); splinter(g, hull, [[18, 4], [24, 4], [20, 10]]);
    part(g, P([[9, 7], [12, 5], [15, 5], [15, 8]]), C.visor);
    for (const x of [2, 31]) { part(g, R(x, 7, 4, 4), C.visor); px(g, x + 1, 8, C.glow[2]); }
    if (o) { part(g, R(14, 15, 10, 4), C.visor); for (const x of [16, 20]) { part(g, R(x, 16, 2, 3), M.cu); } } else part(g, R(14, 15, 10, 2), C.camoD);
    return ink(g, [11, 12, 19, 20, 25, 26], [[14, 2], [24, 2]]); },
  needle(o) { const g = G(32, 16);
    part(g, P([[11, 9], [14, 5], [28, 5], [31, 8], [29, 11], [12, 11]]), C.camo);
    splinter(g, P([[11, 9], [14, 5], [28, 5], [31, 8], [29, 11], [12, 11]]), [[20, 5], [25, 5], [22, 11], [18, 11]]);
    part(g, P([[22, 5.4], [26, 1], [28, 1], [27, 5.4]]), C.camoD); part(g, P([[22, 10.6], [26, 15], [28, 15], [27, 10.6]]), C.camoD);
    barrel(g, 1, 13, 7, M.gun, 2); part(g, R(13, 6, 4, 4), C.visor); px(g, 14, 7, o ? C.glow[0] : C.eye[2]);
    if (o) { px(g, 1, 7, C.glow[0]); px(g, 1, 8, C.glow[1]); }
    return ink(g, [15, 16, 18, 19, 24], [[17, 1]]); },
  hunter(o) { const g = G(30, 20);
    part(g, P([[12, 8], [20, 1], [28.6, 0.6], [24, 7]]), C.camoD); part(g, P([[12, 12], [20, 19], [28.6, 19.4], [24, 13]]), C.camoD);
    const body = P([[1, 10], [7, 6], [25, 6.6], [28.6, 10], [25, 13.4], [7, 14]]);
    part(g, body, C.camo); splinter(g, body, [[14, 6.4], [19, 6.6], [16, 10]]); splinter(g, body, [[18, 13.6], [23, 10], [25, 13.4]]);
    part(g, P([[3, 9.4], [7, 7.2], [10, 7.2], [10, 9.6]]), C.visor);
    barrel(g, 1, 6, 11, M.gun, 1); glowAt(g, 27, 9, o); glowAt(g, 27, 10, o);
    return ink(g, [5, 6, 12, 13, 18], [[11, 1]]); },
};

// ===================================================================== 2. IRON WOLVES
// Dark gunmetal hunters with hazard-orange stripes and a red eye slit:
// sharp wedges and swept fins, built to look fast and mean.
const stripe = (g, shape, x, w = 2) => part(g, and(shape, R(x, 0, w, 40)), C.haz, { flat: true });
const redEye = (g, x, y, w = 3) => { for (let i = 0; i < w; i++) px(g, x + i, y, i ? C.eye[2] : C.eye[0]); };
const wolves = {
  skiff(o) { const g = G(28, 18);
    for (const [x0, x1] of [[3, 13], [15, 26]]) { part(g, R(x0, 15, x1 - x0, 2), M.gun, { flat: true }); px(g, x0 - 1, 14, M.gun[0]); }
    const hull = P([[1, 10], [9, 4], [22, 3.4], [27, 7], [26, 13], [5, 13]]);
    part(g, hull, C.wolf); stripe(g, hull, 15); stripe(g, hull, 19, 1);
    part(g, P([[22, 3.6], [26, 0.6], [27, 1], [25.6, 5]]), C.wolf);
    redEye(g, 5, 8, 4); barrel(g, 0, 6, 10, M.gun, 1); barrel(g, 1, 6, 12, M.gun, 1);
    if (o) { px(g, 0, 10, C.glow[0]); px(g, 1, 12, C.glow[0]); }
    return ink(g, [10, 11, 16, 20], [[13, 1]]); },
  anchor(o) { const g = G(24, 16);
    for (const pts of [[[4, 12], [0.4, 15.6], [3, 15.6], [7, 12.6]], [[17, 12], [23.6, 15.6], [21, 15.6], [15, 12.6]], [[10, 12], [9, 15.6], [12, 15.6], [12, 12]]]) part(g, P(pts), M.gun);
    const head = P([[3, 8], [8, 2], [17, 2], [21, 6], [21, 12], [5, 12.4]]);
    part(g, head, C.wolf); stripe(g, head, 16, 2);
    if (o) { part(g, P([[6, 7], [11, 4], [13, 6], [13, 10], [7, 10]]), C.visor); hline(g, 8, 12, 7, C.glow[1]); px(g, 10, 7, C.glow[0]); }
    else redEye(g, 7, 7, 4);
    barrel(g, 0, 6, 9, M.gun, 2); if (o) px(g, 0, 9, C.glow[0]);
    return ink(g, [9, 10, 14, 15], [[12, 1]]); },
  roller(o) { const g = G(32, 20);
    const body = P([[11, 9], [15, 5], [28, 5], [31, 10], [30, 14], [12, 14]]);
    part(g, body, C.wolf); stripe(g, body, 22); stripe(g, body, 25, 1);
    part(g, E(9, 13, 7, 6.4), M.gun); part(g, E(9, 13, 4.6, 4.2), C.wolf);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; part(g, P([[9 + Math.cos(a - 0.2) * 6.4, 13 + Math.sin(a - 0.2) * 6], [9 + Math.cos(a) * 9, 13 + Math.sin(a) * 8.6], [9 + Math.cos(a + 0.2) * 6.4, 13 + Math.sin(a + 0.2) * 6]]), C.haz, { flat: true }); }
    part(g, E(26, 15.6, 3.6, 3.6), M.gun); px(g, 9, 13, C.glow[2]);
    part(g, R(15, 1, 10, 4), C.wolf); for (const x of [16, 19]) { px(g, x, 2, o ? C.glow[0] : C.visor[2]); px(g, x, 3, o ? C.glow[2] : C.visor[3]); }
    redEye(g, 26, 7, 3);
    return ink(g, [16, 17, 20, 24, 27], [[19, 1]]); },
  dart(o) { const g = G(22, 16);
    part(g, P([[8, 7], [16, 0.6], [21.4, 0.6], [15, 7.4]]), C.wolf); part(g, P([[8, 9], [16, 15.4], [21.4, 15.4], [15, 8.6]]), C.wolf);
    const body = P([[0.6, 8], [8, 5.4], [19, 6], [21.4, 8], [19, 10], [8, 10.6]]);
    part(g, body, C.wolf); stripe(g, body, 12, 2);
    redEye(g, 3, 7, 4); if (o) { px(g, 0, 8, C.glow[0]); }
    glowAt(g, 20, 8, o);
    return ink(g, [5, 6, 13, 18], []); },
  bomber(o) { const g = G(36, 20);
    part(g, P([[6, 9], [14, 2], [22, 2], [30, 9]]), C.wolf); part(g, P([[2, 11], [12, 6], [12, 10]]), C.wolf); part(g, P([[34, 11], [24, 6], [24, 10]]), C.wolf);
    const hull = P([[8, 10], [12, 6], [26, 6], [30, 10], [26, 15], [12, 15]]);
    part(g, hull, C.wolf); stripe(g, hull, 17, 2);
    redEye(g, 10, 9, 3);
    if (o) { part(g, R(14, 15, 9, 4), C.visor); for (const x of [15, 19]) part(g, R(x, 16, 3, 3), C.haz); } else part(g, R(14, 14, 9, 2), M.gun);
    for (const x of [2, 33]) glowAt(g, x, 11, o, 1);
    return ink(g, [15, 16, 20, 21], []); },
  needle(o) { const g = G(32, 16);
    part(g, P([[16, 6.4], [24, 0.6], [27, 0.6], [24, 6.6]]), C.wolf); part(g, P([[16, 9.6], [24, 15.4], [27, 15.4], [24, 9.4]]), C.wolf);
    const body = P([[12, 8], [16, 5.6], [28, 6], [31, 8], [28, 10], [16, 10.4]]);
    part(g, body, C.wolf); stripe(g, body, 21, 2);
    barrel(g, 0, 14, 7, M.gun, 2); redEye(g, 15, 7, 3); if (o) { px(g, 0, 7, C.glow[0]); px(g, 0, 8, C.glow[1]); }
    return ink(g, [17, 18, 22, 25], []); },
  hunter(o) { const g = G(30, 20);
    part(g, P([[10, 9], [20, 0.6], [29, 0.6], [20, 8]]), C.wolf); part(g, P([[10, 11], [20, 19.4], [29, 19.4], [20, 12]]), C.wolf);
    for (const y of [3, 17]) hline(g, 20, 27, y, C.haz[1]);
    const body = P([[0.6, 10], [8, 7], [24, 7.4], [28, 10], [24, 12.6], [8, 13]]);
    part(g, body, C.wolf); stripe(g, body, 15, 2);
    redEye(g, 3, 9, 4); barrel(g, 0, 6, 11, M.gun, 1);
    glowAt(g, 26, 9, o); glowAt(g, 26, 10, o);
    return ink(g, [5, 6, 16, 22], []); },
};

// ===================================================================== 3. HIVE BROOD
// The invaders' own living troops, ahead of their homeworld: segmented
// violet shells, glowing amber sacs, insect legs and wings. (They bleed
// a little, like the weavers.)
const brood = {
  skiff(o) { const g = G(28, 18); // armoured crawler on six legs
    for (const x of [6, 11, 16, 21]) { line(g, x, 12, x - 2, 16, C.chit[3]); px(g, x - 3, 17, C.chit[4]); }
    part(g, E(15, 9, 12, 5), C.chit); for (const x of [10, 15, 20]) vline(g, x, 5, 13, C.chit[3]);
    part(g, E(15, 12, 8, 1.6), C.sac, { flat: true });
    part(g, E(4, 9, 3.6, 3.2), C.chit); px(g, 2, 8, C.eye[0]); px(g, 3, 8, C.eye[2]);
    part(g, P([[0.4, 10], [2, 9.6], [1.6, 12]]), M.bone);
    for (const x of [12, 17]) px(g, x, 12, o ? C.glow[0] : C.sac[1]);
    return ink(g, [9, 14, 19], [[15, 1]]); },
  anchor(o) { const g = G(24, 16); // spore mortar: a bulb on a root
    part(g, P([[4, 15.6], [9, 11], [15, 11], [20, 15.6]]), C.chit);
    part(g, E(12, 7, 7, 6), o ? C.sac : C.chit);
    if (!o) for (const x of [9, 12, 15]) vline(g, x, 2, 12, C.chit[3]);
    else { part(g, E(12, 7, 3.6, 3.2), C.glow, { flat: true }); px(g, 11, 6, C.glow[0]); }
    part(g, P([[2, 6], [6, 5], [6, 8], [2, 8]]), C.chit); px(g, 2, 6, C.eye[1]);
    return ink(g, [10, 11, 12, 13], []); },
  roller(o) { const g = G(32, 20); // a rolling armadillo beast
    part(g, E(14, 11, 11.4, 8.4), C.chit);
    for (let k = 0; k < 6; k++) { const a = Math.PI + (k / 5) * Math.PI; line(g, Math.round(14 + Math.cos(a) * 4), Math.round(11 + Math.sin(a) * 3), Math.round(14 + Math.cos(a) * 11), Math.round(11 + Math.sin(a) * 8), C.chit[3]); }
    part(g, E(14, 15, 7, 2.4), C.sac, { flat: true });
    part(g, E(27, 13, 4, 4), C.chit); px(g, 28, 12, C.eye[0]); px(g, 29, 12, C.eye[2]);
    for (const x of [10, 14, 18]) px(g, x, 15, o ? C.glow[0] : C.sac[1]);
    for (const x of [8, 20]) { line(g, x, 18, x - 1, 19, C.chit[4]); }
    return ink(g, [8, 11, 14, 17, 20], []); },
  dart(o) { const g = G(22, 16); // swarm wasp
    part(g, P([[8, 7], [12, 1], [18, 0.6], [14, 7]]), C.wing, { flat: true }); line(g, 9, 7, 16, 1, C.wing[4]);
    part(g, E(14, 9, 6.4, 3), C.chit); for (const x of [12, 15, 18]) vline(g, x, 7, 11, C.chit[3]);
    part(g, P([[19, 8], [21.6, 9], [19, 10.4]]), C.chit);
    part(g, E(5, 8.6, 3.4, 2.6), C.chit); px(g, 4, 8, C.eye[0]); px(g, 5, 8, C.eye[2]);
    part(g, P([[0.6, 9], [2.6, 8.4], [2, 11]]), M.bone);
    for (const x of [13, 16]) px(g, x, 11, o ? C.glow[0] : C.sac[1]);
    return ink(g, [], []); },
  bomber(o) { const g = G(36, 20); // a bloated carrier with egg sacs
    part(g, P([[10, 7], [14, 1], [24, 0.6], [20, 7]]), C.wing, { flat: true }); part(g, P([[18, 7], [24, 1.4], [32, 2], [26, 8]]), C.wing, { flat: true });
    part(g, E(20, 11, 13, 6), C.chit); for (const x of [12, 17, 22, 27]) vline(g, x, 6, 16, C.chit[3]);
    part(g, E(5, 10, 4, 3.4), C.chit); px(g, 3, 9, C.eye[0]); px(g, 4, 9, C.eye[2]);
    for (const x of [14, 19, 24]) part(g, E(x + 1, 16, 2, 2), o ? C.glow : C.sac);
    return ink(g, [], []); },
  needle(o) { const g = G(32, 16); // stinger lancer
    part(g, P([[14, 6], [18, 1], [24, 0.6], [20, 6]]), C.wing, { flat: true }); line(g, 15, 6, 22, 1, C.wing[4]);
    part(g, E(22, 8, 8.6, 3.2), C.chit); for (const x of [18, 22, 26]) vline(g, x, 5, 11, C.chit[3]);
    part(g, P([[0.6, 8], [14, 6.6], [14, 9.4]]), M.bone); hline(g, 2, 13, 8, M.bone[3]);
    part(g, E(14, 8, 2.6, 2.4), C.chit); px(g, 13, 7, C.eye[0]);
    if (o) { px(g, 0, 8, C.glow[0]); px(g, 1, 8, C.glow[1]); } px(g, 24, 10, o ? C.glow[0] : C.sac[1]);
    return ink(g, [], []); },
  hunter(o) { const g = G(30, 20); // mantis with raised scythes
    part(g, P([[12, 9], [18, 1], [27, 1.4], [22, 8]]), C.wing, { flat: true });
    part(g, E(20, 11, 8.4, 3.4), C.chit); for (const x of [17, 21, 25]) vline(g, x, 8, 14, C.chit[3]);
    part(g, E(8, 10, 4, 3), C.chit); px(g, 6, 9, C.eye[0]); px(g, 7, 9, C.eye[2]);
    line(g, 9, 12, 3, 16, C.chit[1]); line(g, 3, 16, 1, 12, C.chit[0]); line(g, 11, 12, 6, 17, C.chit[1]); line(g, 6, 17, 4, 13, C.chit[0]);
    for (const x of [16, 22]) { line(g, x, 14, x - 2, 19, C.chit[3]); }
    px(g, 27, 11, o ? C.glow[0] : C.sac[1]);
    return ink(g, [], []); },
};

// ===================================================================== 4. FURNACE CORPS
// Heat-powered iron and copper machines that melt their way across the
// snow: glowing grilles, smoke stacks, rivets. They steam in the cold.
const grille = (g, x, y, w, h, open) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, j % 2 ? C.iron[4] : (open ? C.glow[1] : C.glow[3])); };
const rivets = (g, xs, y) => { for (const x of xs) px(g, x, y, C.cu[0]); };
const furnace = {
  skiff(o) { const g = G(28, 18);
    for (let x = 3; x < 26; x++) { px(g, x, 16, C.iron[3]); px(g, x, 15, x % 3 ? C.iron[2] : C.iron[4]); }
    part(g, E(14, 9, 11.6, 5.4), C.iron); part(g, and(E(14, 9, 11.6, 5.4), R(0, 4, 28, 3)), C.cu, { flat: true });
    grille(g, 10, 10, 8, 3, o); rivets(g, [6, 10, 14, 18, 22], 8);
    part(g, R(20, 0, 3, 5), C.iron); px(g, 21, 0, C.glow[3]);
    barrel(g, 0, 5, 8, C.cu, 2); if (o) px(g, 0, 8, C.glow[0]);
    return ink(g, [8, 12, 16], [[6, 1]]); },
  anchor(o) { const g = G(24, 16);
    part(g, P([[3, 15.6], [6, 12], [18, 12], [21, 15.6]]), C.iron);
    part(g, E(12, 7.6, 8, 5.6), C.iron); part(g, and(E(12, 7.6, 8, 5.6), R(0, 2, 24, 2)), C.cu, { flat: true });
    grille(g, 9, 7, 6, o ? 5 : 3, o); rivets(g, [6, 18], 7);
    barrel(g, 0, 5, 6, C.cu, 3); if (o) px(g, 0, 6, C.glow[0]);
    part(g, R(16, 0, 2, 3), C.iron);
    return ink(g, [9, 10, 13], []); },
  roller(o) { const g = G(32, 20);
    part(g, E(9, 12.6, 7.6, 7), C.iron); part(g, E(9, 12.6, 5, 4.6), C.cu); px(g, 9, 12, C.glow[2]);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; px(g, Math.round(9 + Math.cos(a) * 6.6), Math.round(12.6 + Math.sin(a) * 6), C.iron[0]); }
    part(g, P([[13, 8], [16, 5], [29, 5], [31, 9], [30, 16], [14, 16]]), C.iron);
    grille(g, 18, 9, 9, 3, o); rivets(g, [16, 20, 24, 28], 7);
    part(g, R(24, 0, 3, 5), C.iron); part(g, R(19, 1, 3, 4), C.cu);
    part(g, E(27, 17, 3, 3), C.iron);
    return ink(g, [17, 21, 25], []); },
  dart(o) { const g = G(22, 16);
    part(g, P([[1, 8], [6, 4.6], [17, 5], [21, 8], [17, 11], [6, 11.4]]), C.iron);
    part(g, and(P([[1, 8], [6, 4.6], [17, 5], [21, 8], [17, 11], [6, 11.4]]), R(0, 4, 22, 2)), C.cu, { flat: true });
    part(g, P([[10, 5], [15, 1], [17, 1], [15, 5]]), C.cu);
    grille(g, 10, 8, 6, 2, o); px(g, 3, 7, C.glow[2]); glowAt(g, 20, 8, o, 1);
    return ink(g, [7, 12], []); },
  bomber(o) { const g = G(36, 20);
    part(g, E(18, 9, 15.4, 6.4), C.iron); part(g, and(E(18, 9, 15.4, 6.4), R(0, 2, 36, 3)), C.cu, { flat: true });
    for (const x of [8, 14, 20, 26]) vline(g, x, 4, 14, C.iron[3]);
    grille(g, 11, 8, 14, 3, o); rivets(g, [5, 11, 17, 23, 29], 6);
    for (const x of [12, 22]) { part(g, R(x, 0, 3, 3), C.iron); }
    if (o) { part(g, R(14, 15, 8, 4), C.iron); part(g, R(16, 16, 4, 3), C.glow); } else part(g, R(14, 14, 8, 2), C.cu);
    return ink(g, [], []); },
  needle(o) { const g = G(32, 16);
    part(g, P([[12, 8], [16, 4.6], [28, 4.6], [31, 8], [28, 11.4], [16, 11.4]]), C.iron);
    part(g, and(P([[12, 8], [16, 4.6], [28, 4.6], [31, 8], [28, 11.4], [16, 11.4]]), R(0, 4, 32, 2)), C.cu, { flat: true });
    barrel(g, 0, 13, 7, C.cu, 2); for (const x of [3, 7, 11]) vline(g, x, 6, 9, C.iron[2]);
    grille(g, 18, 8, 7, 2, o); part(g, R(26, 1, 2, 4), C.iron);
    if (o) { px(g, 0, 7, C.glow[0]); px(g, 0, 8, C.glow[1]); }
    return ink(g, [19, 23], []); },
  hunter(o) { const g = G(30, 20);
    part(g, P([[10, 8], [18, 1], [27, 1], [22, 8]]), C.cu); part(g, P([[10, 12], [18, 19], [27, 19], [22, 12]]), C.cu);
    part(g, P([[1, 10], [7, 6.4], [24, 6.6], [28.6, 10], [24, 13.4], [7, 13.6]]), C.iron);
    grille(g, 12, 9, 8, 3, o); rivets(g, [5, 22], 9);
    barrel(g, 0, 6, 11, C.cu, 1); glowAt(g, 27, 9, o); glowAt(g, 27, 10, o);
    return ink(g, [9, 15], []); },
};

export const SETS4 = [
  { key: 'commando', title: 'ICE COMMANDOS', sub: 'winter camouflage, black visors', fns: commando },
  { key: 'wolves', title: 'IRON WOLVES', sub: 'dark gunmetal, hazard stripes, red eyes', fns: wolves },
  { key: 'brood', title: 'HIVE BROOD', sub: 'the invaders\' living troops', fns: brood },
  { key: 'furnace', title: 'FURNACE CORPS', sub: 'iron and copper, glowing grilles', fns: furnace },
];
void not;

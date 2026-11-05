// The Siege Legion's three ground units (for the all-code sample), in the
// same style as its flyers: white armour, red markings, gunmetal, frost.
import { G, P, E, R, and, part, px, hline, vline, line, outline, frost, M, GLOW } from '../design2.js';

const SNOW = ['#ffffff', '#f1f6fa', '#dde8f1', '#bccee2', '#a9bed6'];
// a thick bar from (x0,y0) to (x1,y1), w wide, as a polygon
const bar = (x0, y0, x1, y1, w) => {
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  return P([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
};

export const legionGround = {
  skitank() { // snow lancer: a hull on skis, its turret's barrel is drawn by the game
    const g = G(46, 28);
    part(g, R(3, 25, 41, 2), M.gun, { flat: true }); px(g, 2, 24, M.gun[1]); px(g, 1, 23, M.gun[0]); px(g, 2, 25, M.gun[2]);
    for (const x of [10, 22, 34]) vline(g, x, 22, 24, M.gun[3]);
    const hull = P([[4, 21.5], [8.5, 14], [38, 13], [44.6, 17], [44.6, 22], [40, 24.4], [6, 24.4]]);
    part(g, hull, M.white);
    part(g, and(hull, R(0, 21, 46, 6)), M.grey);
    part(g, and(hull, R(27, 0, 3, 28)), M.red, { flat: true });
    part(g, and(hull, R(31, 0, 1, 28)), M.red, { flat: true });
    for (const x of [11, 17, 23, 36, 40]) px(g, x, 18, M.white[3]);
    part(g, R(42, 15, 3, 3), M.gun); px(g, 44, 16, M.glow[1]);
    const tur = E(21, 11, 9.5, 5.6);
    part(g, tur, M.white);
    part(g, and(tur, R(0, 13, 46, 6)), M.grey);
    part(g, P([[13.6, 9], [18.4, 8.6], [18.4, 11], [13.6, 11]]), M.glass); px(g, 14, 9, M.glass[0]);
    part(g, R(23, 5, 5, 2), M.gun); px(g, 23, 5, M.gun[0]);
    line(g, 27, 5, 30, 1, M.gun[2]); px(g, 30, 1, M.eye[1]);
    outline(g);
    return frost(g, [16, 17, 19, 20, 21, 22, 24, 25, 33, 34], [[12, 2], [20, 3], [33, 2], [39, 1]]);
  },
  rocketsled() { // rocket sled: a launcher box angled up and forward
    const g = G(52, 34);
    part(g, R(4, 31, 45, 2), M.gun, { flat: true }); px(g, 3, 30, M.gun[1]); px(g, 2, 29, M.gun[0]); px(g, 3, 31, M.gun[2]);
    for (const x of [12, 26, 40]) vline(g, x, 28, 30, M.gun[3]);
    const body = P([[5, 29.6], [8.6, 22], [46, 22], [50.6, 25.6], [50.6, 30.4], [6, 30.4]]);
    part(g, body, M.white);
    part(g, and(body, R(0, 27, 52, 6)), M.grey);
    part(g, and(body, R(23, 0, 3, 34)), M.red, { flat: true });
    part(g, P([[39, 22.4], [41, 15.6], [47, 15.6], [49, 22.4]]), M.white);
    part(g, P([[41.6, 17], [46.4, 17], [47.4, 20], [41, 20]]), M.glass); px(g, 42, 17, M.glass[0]);
    part(g, bar(30, 22, 27, 15, 4), M.gun);
    const box = P([[11, 19.6], [16.6, 4.4], [37, 9.4], [32.4, 22.4]]);
    part(g, box, M.white);
    part(g, and(box, bar(14, 12, 34, 16, 3)), M.red, { flat: true });
    for (let k = 0; k < 3; k++) {
      const x = 12.6 + k * 1.6, y = 15.6 - k * 4.6;
      part(g, E(x, y, 1.7, 1.7), M.gun); px(g, Math.round(x - 0.5), Math.round(y - 0.5), M.red[1]);
    }
    for (const x of [8, 16, 34, 44]) px(g, x, 25, M.white[3]);
    outline(g);
    return frost(g, [16, 17, 19, 21, 23, 25, 27, 42, 44, 46], [[10, 2], [20, 3], [30, 2], [45, 1]]);
  },
  flakbunker() { // flak bunker: an armoured dome dug into a snow mound, twin guns up and forward
    const g = G(44, 30);
    part(g, bar(19, 15, 7, 4, 3), M.gun); part(g, bar(23, 14, 12, 2, 3), M.gun);
    part(g, R(5, 2, 3, 3), M.gun); part(g, R(10, 0, 3, 3), M.gun);
    GLOW(g, 6, 3); GLOW(g, 11, 1);
    const dome = E(22, 21, 13.4, 8.6);
    part(g, dome, M.white);
    part(g, and(dome, R(0, 23, 44, 8)), M.grey);
    part(g, and(dome, R(0, 19, 44, 2)), M.red, { flat: true });
    hline(g, 12, 18, 22, M.gun[4]); hline(g, 13, 17, 23, M.gun[3]);
    part(g, R(28, 11, 4, 3), M.gun); px(g, 29, 11, M.eye[1]);
    part(g, E(22, 31, 22.4, 7.4), SNOW);
    for (const x of [6, 14, 30, 38]) px(g, x, 27, SNOW[3]);
    outline(g);
    return frost(g, [17, 18, 20, 21, 22, 24, 25, 26], []);
  },
};
export const GROUND_ORDER = ['skitank', 'rocketsled', 'flakbunker'];

// Four more designs for the White Front's boss, all on the ground (owner:
// no flying or hovering boss; and no walking machine, which is the Siege
// Crawler). Shapes for vec.js in double-detail pixels; all face left;
// `when: 'open'` shapes show the weak point exposed.
export const GROUND = {};
const teeth = (n, r, cx, cy, len, m = 'mech', t = 2, a0 = 0) => Array.from({ length: n }, (_, k) => {
  const a = a0 + (k / n) * Math.PI * 2, b = 0.12;
  return { m, t, flat: true, poly: [[cx + Math.cos(a - b) * r, cy + Math.sin(a - b) * r], [cx + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len)], [cx + Math.cos(a + b) * r, cy + Math.sin(a + b) * r]] };
});
const spokes = (n, r, cx, cy, m = 'mech', t = 2, a0 = 0) => Array.from({ length: n }, (_, k) => {
  const a = a0 + (k / n) * Math.PI * 2;
  return { line: [cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3, cx + Math.cos(a) * r, cy + Math.sin(a) * r], m, t };
});
// Tank tracks: a long rounded band with road wheels.
const tracks = (x0, x1, y0, y1) => {
  const r = (y1 - y0) / 2, out = [];
  out.push({ m: 'mech', t: 3, poly: [[x0 + r, y0], [x1 - r, y0], [x1, y0 + r], [x1 - r, y1], [x0 + r, y1], [x0, y0 + r]] });
  for (let x = x0 + r; x <= x1 - r + 0.1; x += (x1 - x0 - 2 * r) / Math.max(1, Math.round((x1 - x0 - 2 * r) / 16))) {
    out.push({ m: 'mech', t: 1, ell: [x, y0 + r, r * 0.62, r * 0.62] });
    out.push({ dot: [x, y0 + r], m: 'mech', t: 3 });
  }
  for (let x = x0 + r; x < x1 - r; x += 5) out.push({ line: [x, y0, x + 2, y0], m: 'mech', t: 1 });
  return out;
};

// ---------------------------------------------------------------- E
// The Iron Wheel: a giant armoured wheel with a gun cab in its hub, a
// spiked, snow-packed tyre and a stabiliser boom dragging a ski behind.
// It rolls back and forth, leaps and slams down. Weak point: its hub cab,
// open while it stops to fire.
GROUND.wheel = {
  name: 'IRON WHEEL', sub: 'THE ROLLING DEATH', width: 156,
  shapes: [
    // the stabiliser boom and its ski, behind the wheel
    { m: 'main', t: 2, poly: [[96, 54], [146, 82], [142, 88], [92, 62]] },
    { m: 'mech', t: 2, poly: [[128, 92], [156, 92], [152, 96], [126, 96]] },
    { m: 'mech', t: 2, rect: [138, 84, 144, 92] },
    { only: 'wolves', m: 'haz', t: 1, poly: [[112, 64], [120, 68], [118, 72], [110, 68]] },
    // the tyre: spiked, snow packed into its tread
    ...teeth(16, 46, 58, 50, 6, 'mech', 2, 0.1),
    { m: 'mech', t: 2, ell: [58, 50, 47, 47] },
    { m: 'mech', t: 3, ell: [58, 50, 40, 40] },
    { m: 'light', t: 2, ell: [58, 50, 34, 34] },
    { m: 'mech', t: 3, ell: [58, 50, 29, 29] },
    ...spokes(8, 29, 58, 50, 'main', 2, 0.2),
    { m: 'snow', t: 1, flat: true, poly: [[22, 30], [30, 20], [34, 23], [27, 33]] },
    { m: 'snow', t: 1, flat: true, poly: [[78, 8], [92, 14], [90, 18], [76, 12]] },
    { m: 'snow', t: 1, flat: true, poly: [[100, 46], [105, 60], [101, 62], [97, 48]] },
    { only: 'wolves', m: 'haz', t: 1, flat: true, poly: [[56, 9], [62, 9], [62, 16], [56, 16]] },
    { only: 'wolves', m: 'haz', t: 1, flat: true, poly: [[56, 84], [62, 84], [62, 91], [56, 91]] },
    // the hub: an armoured cab with a red eye and a cannon
    { m: 'main', t: 1, ell: [58, 50, 20, 20] },
    { m: 'light', t: 1, poly: [[42, 40], [58, 32], [72, 38], [58, 44]] },
    { m: 'mech', t: 2, rect: [10, 48, 40, 54] }, { m: 'mech', t: 1, rect: [6, 47, 12, 55] },
    { m: 'lamp', t: 1, poly: [[44, 46], [60, 44], [60, 48], [46, 50]] },
    { m: 'mech', t: 2, when: 'closed', ell: [62, 56, 9, 7] },
    { m: 'lamp', t: 2, when: 'open', ell: [62, 56, 9, 7] }, { m: 'lamp', t: 0, when: 'open', ell: [62, 56, 4, 3] },
    { m: 'lamp', t: 1, when: 'open', rect: [4, 48, 8, 54] },
  ],
};

// ---------------------------------------------------------------- F
// The Snow Auger: a tracked ice-breaker with two great screw augers on its
// nose that churn the snow and hurl ice. Weak point: the engine grille on
// its flank, opened to vent when the augers overheat.
GROUND.auger = {
  name: 'SNOW AUGER', sub: 'THE ICE BREAKER', width: 186,
  shapes: [
    ...tracks(46, 182, 70, 92),
    // hull, cab and smokestacks
    { m: 'main', t: 1, poly: [[50, 34], [170, 34], [184, 48], [184, 70], [50, 70]] },
    { m: 'light', t: 1, poly: [[52, 36], [168, 36], [176, 44], [56, 44]] },
    { m: 'main', t: 2, poly: [[96, 12], [146, 12], [154, 34], [90, 34]] },
    { m: 'glass', t: 1, poly: [[100, 16], [118, 16], [118, 26], [98, 26]] },
    { m: 'mech', t: 2, rect: [156, 14, 164, 34] }, { m: 'mech', t: 2, rect: [168, 20, 176, 36] },
    { m: 'mech', t: 1, rect: [154, 12, 166, 15] }, { m: 'mech', t: 1, rect: [166, 18, 178, 21] },
    { only: 'wolves', m: 'haz', t: 1, rect: [50, 58, 184, 62] },
    { only: 'wolves', m: 'haz', t: 1, poly: [[126, 14], [134, 14], [134, 34], [126, 34]] },
    // the engine grille: shut, or open and glowing hot
    { m: 'mech', t: 2, when: 'closed', rect: [138, 44, 168, 56] },
    { line: [142, 45, 142, 55], m: 'mech', t: 3, when: 'closed' }, { line: [148, 45, 148, 55], m: 'mech', t: 3, when: 'closed' },
    { line: [154, 45, 154, 55], m: 'mech', t: 3, when: 'closed' }, { line: [160, 45, 160, 55], m: 'mech', t: 3, when: 'closed' },
    { m: 'lamp', t: 2, when: 'open', rect: [138, 44, 168, 56] }, { m: 'lamp', t: 0, when: 'open', rect: [144, 47, 162, 53] },
    { m: 'mech', t: 2, when: 'open', poly: [[136, 44], [170, 44], [166, 38], [140, 38]] },
    // the auger arms and the two screws
    { m: 'mech', t: 2, poly: [[40, 30], [60, 36], [60, 68], [40, 74]] },
    { m: 'mech', t: 1, rect: [0, 20, 52, 46] }, { m: 'mech', t: 1, rect: [0, 54, 52, 80] },
    ...[[0, 20, 46], [0, 54, 80]].flatMap(([x, y0, y1]) => Array.from({ length: 7 }, (_, k) => ({ m: 'light', t: 1, flat: true, poly: [[x + k * 7 + 2, y0], [x + k * 7 + 7, y0], [x + k * 7 + 2, y1], [x + k * 7 - 3, y1]] }))),
    { only: 'wolves', m: 'haz', t: 1, rect: [44, 20, 50, 46] }, { only: 'wolves', m: 'haz', t: 1, rect: [44, 54, 50, 80] },
    { m: 'mech', t: 2, poly: [[-6, 33], [0, 26], [0, 40]] }, { m: 'mech', t: 2, poly: [[-6, 67], [0, 60], [0, 74]] },
    { dot: [70, 42], m: 'lamp', t: 1 }, { dot: [76, 42], m: 'lamp', t: 1 },
  ],
};

// ---------------------------------------------------------------- G
// The Rail Cannon: a colossal gun carriage running on rails laid across the
// snow, its barrel ringed with charging coils, flak guns on its deck. It
// slides back and forth along the rails and kicks back when it fires.
// Weak point: the coils, glowing while it charges a shot.
GROUND.rail = {
  name: 'RAIL CANNON', sub: 'THE LONG HOWL', width: 206,
  shapes: [
    // bogies on the rails
    { m: 'mech', t: 2, rect: [70, 78, 112, 88] }, { m: 'mech', t: 2, rect: [146, 78, 192, 88] },
    { m: 'mech', t: 1, ell: [80, 88, 7, 7] }, { m: 'mech', t: 1, ell: [102, 88, 7, 7] }, { m: 'mech', t: 1, ell: [158, 88, 7, 7] }, { m: 'mech', t: 1, ell: [182, 88, 7, 7] },
    { dot: [80, 88], m: 'mech', t: 3 }, { dot: [102, 88], m: 'mech', t: 3 }, { dot: [158, 88], m: 'mech', t: 3 }, { dot: [182, 88], m: 'mech', t: 3 },
    // the carriage
    { m: 'main', t: 1, poly: [[64, 52], [198, 52], [206, 64], [198, 78], [64, 78]] },
    { m: 'light', t: 1, poly: [[66, 54], [196, 54], [200, 60], [70, 60]] },
    { only: 'wolves', m: 'haz', t: 1, rect: [64, 70, 206, 74] },
    // the turret block and the gunner's cab
    { m: 'main', t: 2, poly: [[96, 22], [176, 22], [186, 52], [90, 52]] },
    { m: 'light', t: 1, poly: [[98, 24], [174, 24], [178, 32], [96, 32]] },
    { m: 'glass', t: 1, rect: [150, 30, 166, 38] },
    { dot: [104, 40], m: 'lamp', t: 1 }, { dot: [110, 40], m: 'lamp', t: 1 },
    // deck flak guns
    { m: 'mech', t: 2, rect: [176, 40, 192, 50] }, { line: [180, 41, 170, 30], m: 'mech', t: 1, over: true }, { line: [186, 41, 176, 30], m: 'mech', t: 1, over: true },
    // the barrel: long, with charging coils
    { m: 'mech', t: 1, poly: [[0, 30], [100, 28], [100, 42], [0, 40]] },
    { m: 'mech', t: 0, flat: true, rect: [0, 30, 100, 32] },
    { m: 'mech', t: 2, rect: [0, 28, 8, 42] },
    ...[18, 34, 50, 66, 82].flatMap((x) => [
      { m: 'main', t: 1, when: 'closed', rect: [x, 25, x + 7, 45] },
      { only: 'wolves', m: 'haz', t: 1, when: 'closed', rect: [x + 2, 25, x + 4, 45] },
      { m: 'lamp', t: 1, when: 'open', rect: [x, 25, x + 7, 45] },
      { m: 'lamp', t: 0, when: 'open', rect: [x + 2, 27, x + 4, 43] },
    ]),
  ],
};

// ---------------------------------------------------------------- H
// The Undertow: a burrowing mole-tank with a great toothed cutter wheel.
// It travels under the snow (only its fin cuts the surface), then bursts
// up to fight. Weak point: the cutter's hub, open while it spins up.
GROUND.burrower = {
  name: 'UNDERTOW', sub: 'IT HUNTS BENEATH THE SNOW', width: 174,
  shapes: [
    ...tracks(56, 170, 72, 92),
    // wedge hull and the dorsal fin that cuts the snow
    { m: 'main', t: 1, poly: [[52, 40], [128, 26], [170, 40], [172, 72], [52, 72]] },
    { m: 'light', t: 1, poly: [[56, 42], [128, 28], [160, 38], [124, 40], [60, 50]] },
    { m: 'main', t: 2, poly: [[104, 32], [132, 0], [146, 2], [138, 32]] },
    { m: 'light', t: 1, poly: [[110, 30], [132, 4], [138, 4], [122, 30]] },
    { only: 'wolves', m: 'haz', t: 1, poly: [[146, 34], [154, 36], [154, 72], [146, 72]] },
    { m: 'mech', t: 2, rect: [160, 48, 172, 60] }, { dot: [170, 54], m: 'lamp', t: 1, over: true },
    { dot: [72, 48], m: 'lamp', t: 1 }, { dot: [78, 47], m: 'lamp', t: 1 },
    { m: 'snow', t: 0, flat: true, poly: [[80, 40], [126, 30], [124, 34], [84, 42]] },
    // the cutter wheel on its nose
    ...teeth(14, 32, 40, 54, 8, 'mech', 1, 0.15),
    { m: 'mech', t: 2, ell: [40, 54, 33, 33] },
    { m: 'light', t: 2, ell: [40, 54, 26, 26] },
    ...spokes(6, 26, 40, 54, 'mech', 2, 0.3),
    { only: 'wolves', m: 'haz', t: 1, flat: true, poly: [[38, 22], [44, 22], [44, 30], [38, 30]] },
    { m: 'mech', t: 3, when: 'closed', ell: [40, 54, 9, 9] },
    { m: 'lamp', t: 2, when: 'open', ell: [40, 54, 9, 9] }, { m: 'lamp', t: 0, when: 'open', ell: [40, 54, 4, 4] },
  ],
};

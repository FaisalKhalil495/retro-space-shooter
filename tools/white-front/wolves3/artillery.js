// Three ideas for the White Front's artillery (the Iron Wolves' third new
// enemy), drawn as shapes for vec.js in tenths of a double-detail pixel,
// facing left. Each one ends in shells landing on a warning ring that
// tightens until it hits, so you always see where and when.
export const ART = {};
const rot = (pts, a, cx, cy) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const bar = (x0, y0, len, th, a) => rot([[x0, y0 - th / 2], [x0 + len, y0 - th / 2], [x0 + len, y0 + th / 2], [x0, y0 + th / 2]], a, x0, y0);

// A: a tracked gun that raises a long barrel and fires shells up off the top of the screen
const A_ANG = Math.PI + 0.55; // up and to the left
ART.howler = {
  name: 'HOWLER BATTERY', width: 40, muzzles: [],
  shapes: [
    { m: 'mech', t: 1, poly: bar(196, 70, 230, 16, A_ANG) },
    { m: 'mech', t: 0, flat: true, poly: bar(196, 64, 230, 4, A_ANG) },
    { m: 'mech', t: 2, poly: bar(196 + Math.cos(A_ANG) * 200, 70 + Math.sin(A_ANG) * 200, 40, 26, A_ANG) },
    { m: 'lamp', t: 0, when: 'open', poly: bar(196 + Math.cos(A_ANG) * 236, 70 + Math.sin(A_ANG) * 236, 40, 34, A_ANG) },
    { m: 'mech', t: 2, poly: [[20, 152], [44, 130], [340, 130], [366, 152], [344, 178], [44, 178]] },
    ...[62, 112, 162, 212, 262, 312].flatMap((x) => [{ m: 'mech', t: 1, ell: [x, 156, 17, 17] }, { dot: [x, 156], m: 'mech', t: 3 }]),
    { m: 'main', t: 1, poly: [[30, 132], [70, 96], [324, 96], [362, 132]] },
    { m: 'light', t: 1, poly: [[82, 100], [200, 100], [192, 128], [88, 128]] },
    { m: 'mech', t: 2, rect: [330, 64, 348, 98] },
    { m: 'cu', t: 1, rect: [292, 78, 302, 96] }, { m: 'cu', t: 1, rect: [306, 78, 316, 96] },
    { m: 'main', t: 1, poly: [[150, 96], [168, 58], [282, 54], [306, 96]] },
    { m: 'light', t: 1, poly: [[170, 60], [278, 56], [272, 70], [176, 72]] },
    { m: 'mech', t: 2, ell: [196, 72, 22, 22] },
    { line: [222, 84, 248, 84], m: 'lamp', t: 1 },
    { only: 'wolves', m: 'haz', t: 1, rect: [236, 98, 252, 130] },
  ],
};

// B: a small spotter drone that shines a red beam on you; the big guns far behind fire on its mark
ART.spotter = {
  name: 'SPOTTER', width: 24,
  shapes: [
    { line: [140, 10, 140, 48], m: 'mech', t: 1, over: true }, { line: [176, 22, 170, 52], m: 'mech', t: 1, over: true },
    { dot: [140, 8], m: 'lamp', t: 2, over: true },
    { m: 'mech', t: 2, rect: [120, 118, 150, 140] }, { m: 'mech', t: 2, rect: [180, 118, 210, 140] },
    { m: 'main', t: 1, ell: [160, 86, 76, 40] },
    { m: 'light', t: 1, poly: [[100, 62], [210, 58], [196, 74], [110, 78]] },
    { only: 'wolves', m: 'haz', t: 1, rect: [190, 50, 204, 124] },
    { m: 'mech', t: 2, ell: [82, 92, 40, 40] },
    { m: 'mech', t: 3, flat: true, ell: [74, 92, 28, 28] },
    { m: 'lamp', t: 2, flat: true, ell: [70, 92, 15, 15] },
    { m: 'lamp', t: 0, flat: true, when: 'open', ell: [68, 92, 10, 10] },
  ],
};
// the long-range guns far behind, drawn small and dim in the background (they can't be shot)
export const FAR_GUN = {
  width: 26, snow: false,
  shapes: [
    { m: 'mech', t: 2, poly: bar(120, 60, 180, 12, Math.PI + 0.75) },
    { m: 'main', t: 2, poly: [[40, 110], [80, 60], [200, 56], [240, 110]] },
    { m: 'mech', t: 3, rect: [20, 110, 260, 130] },
  ],
};

// C: a rocket sled with a four-tube launcher that walks a barrage of rings towards you
const C_ANG = Math.PI + 0.62;
ART.rocketSled = {
  name: 'ROCKET SLED', width: 40,
  shapes: [
    { m: 'mech', t: 1, poly: [[0, 150], [20, 132], [44, 160], [330, 164], [340, 178], [40, 180], [8, 166]] },
    { m: 'mech', t: 2, rect: [80, 120, 100, 162] }, { m: 'mech', t: 2, rect: [250, 120, 270, 162] },
    { m: 'mech', t: 2, poly: [[40, 128], [340, 120], [350, 140], [50, 146]] },
    { m: 'main', t: 1, poly: [[30, 120], [60, 80], [150, 74], [340, 74], [356, 120]] },
    { m: 'light', t: 1, poly: [[30, 120], [60, 80], [120, 76], [118, 120]] },
    { m: 'glass', t: 2, poly: [[62, 82], [116, 78], [114, 94], [66, 96]] },
    { line: [76, 88, 100, 87], m: 'lamp', t: 1 },
    { only: 'wolves', m: 'haz', t: 1, rect: [300, 76, 316, 120] },
    { m: 'mech', t: 2, rect: [226, 52, 262, 80] },
    { m: 'light', t: 1, poly: bar(250, 62, 150, 64, C_ANG) },
    { m: 'main', t: 2, flat: true, poly: bar(250, 80, 150, 16, C_ANG) },
    { m: 'mech', t: 2, flat: true, poly: bar(250 + Math.cos(C_ANG) * 140, 62 + Math.sin(C_ANG) * 140, 18, 70, C_ANG) },
    ...[-16, 16].map((o) => { const x = 250 + Math.cos(C_ANG) * 152 - Math.sin(C_ANG) * o, y = 62 + Math.sin(C_ANG) * 152 + Math.cos(C_ANG) * o; return { m: 'mech', t: 3, flat: true, ell: [x, y, 11, 11] }; }),
    ...[-16, 16].map((o) => { const x = 250 + Math.cos(C_ANG) * 152 - Math.sin(C_ANG) * o, y = 62 + Math.sin(C_ANG) * 152 + Math.cos(C_ANG) * o; return { m: 'lamp', t: 0, flat: true, when: 'open', ell: [x, y, 8, 8] }; }),
    { only: 'wolves', m: 'haz', t: 1, flat: true, poly: bar(250 + Math.cos(C_ANG) * 60, 62 + Math.sin(C_ANG) * 60, 16, 64, C_ANG) },
  ],
};

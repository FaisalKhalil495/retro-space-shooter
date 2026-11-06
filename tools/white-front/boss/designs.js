// Four designs for the White Front's boss (the Iron Wolves' commander), for
// the owner to pick from. Drawn as shapes with vec.js (like the Wolves
// themselves), in double-detail pixels; all face left. `when: 'open'`
// shapes show the weak point exposed (or the attack about to fire).
export const BOSS = {};
const ring = (n, r, cx, cy, a0 = 0, sy = 1) => Array.from({ length: n }, (_, k) => { const a = a0 + (k / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy]; });

// ---------------------------------------------------------------- A
// The Alpha Carrier: the biggest of the landing ships, come down to finish
// the battle itself. Weak point: its belly bay, open while it drops Wolves.
BOSS.carrier = {
  name: 'ALPHA CARRIER', sub: 'MOTHER OF THE PACK', width: 190,
  shapes: [
    // engine pods and their thrust (under the hull)
    { m: 'mech', t: 2, poly: [[34, 54], [64, 54], [62, 76], [36, 76]] },
    { m: 'mech', t: 2, poly: [[126, 54], [158, 54], [156, 76], [128, 76]] },
    { m: 'mech', t: 3, rect: [38, 74, 60, 80] }, { m: 'mech', t: 3, rect: [130, 74, 154, 80] },
    { m: 'cu', t: 0, flat: true, poly: [[40, 80], [58, 80], [49, 94]] }, { m: 'cu', t: 0, flat: true, poly: [[132, 80], [152, 80], [142, 96]] },
    { m: 'lamp', t: 0, flat: true, poly: [[44, 80], [54, 80], [49, 87]] }, { m: 'lamp', t: 0, flat: true, poly: [[136, 80], [148, 80], [142, 88]] },
    { only: 'wolves', m: 'haz', t: 1, rect: [34, 60, 64, 64] }, { only: 'wolves', m: 'haz', t: 1, rect: [126, 60, 158, 64] },
    // the tail fin
    { m: 'main', t: 2, poly: [[150, 16], [172, -8], [184, -6], [180, 20]] },
    { m: 'light', t: 1, poly: [[156, 14], [172, -4], [178, -4], [168, 14]] },
    // the hull
    { m: 'main', t: 1, poly: [[0, 42], [16, 24], [58, 12], [156, 10], [180, 18], [190, 34], [184, 52], [156, 62], [40, 62], [10, 56]] },
    { m: 'light', t: 1, poly: [[22, 24], [58, 14], [156, 12], [176, 20], [166, 28], [60, 28]] },
    { m: 'main', t: 2, poly: [[40, 50], [184, 46], [184, 52], [156, 62], [40, 62]] },
    // rocket racks on its back
    { m: 'mech', t: 2, rect: [72, 0, 118, 12] },
    { m: 'mech', t: 1, rect: [74, 2, 82, 10] }, { m: 'mech', t: 1, rect: [86, 2, 94, 10] }, { m: 'mech', t: 1, rect: [98, 2, 106, 10] }, { m: 'mech', t: 1, rect: [110, 2, 116, 10] },
    { m: 'haz', t: 1, flat: true, rect: [74, 2, 82, 4] }, { m: 'haz', t: 1, flat: true, rect: [86, 2, 94, 4] }, { m: 'haz', t: 1, flat: true, rect: [98, 2, 106, 4] }, { m: 'haz', t: 1, flat: true, rect: [110, 2, 116, 4] },
    { line: [146, 10, 152, -10], m: 'mech', t: 2, over: true }, { dot: [152, -10], m: 'lamp', t: 1, over: true },
    // hazard bands and panel seams
    { only: 'wolves', m: 'haz', t: 1, poly: [[62, 14], [70, 14], [70, 60], [62, 60]] },
    { only: 'wolves', m: 'haz', t: 1, poly: [[136, 12], [144, 12], [144, 60], [136, 60]] },
    { line: [90, 30, 90, 58], m: 'mech', t: 2 }, { line: [114, 30, 114, 58], m: 'mech', t: 2 },
    { line: [72, 40, 134, 38], m: 'main', t: 3 },
    { m: 'glass', t: 2, rect: [74, 32, 80, 36] }, { m: 'glass', t: 2, rect: [96, 32, 102, 36] }, { m: 'glass', t: 2, rect: [120, 31, 126, 35] },
    // the Wolves' emblem: a wolf's head in hazard orange
    { only: 'wolves', m: 'haz', t: 1, flat: true, poly: [[146, 30], [150, 22], [153, 28], [158, 22], [160, 30], [162, 38], [154, 44], [146, 38]] },
    { m: 'mech', t: 2, flat: true, poly: [[149, 32], [153, 32], [152, 35]] }, { m: 'mech', t: 2, flat: true, poly: [[155, 32], [159, 32], [157, 35]] },
    // the nose: armoured cockpit, a red eye slit, the belly cannon
    { m: 'light', t: 2, poly: [[0, 42], [16, 26], [44, 22], [48, 42], [34, 52], [8, 52]] },
    { m: 'glass', t: 1, poly: [[20, 28], [40, 24], [42, 31], [24, 34]] },
    { m: 'lamp', t: 1, poly: [[6, 38], [30, 35], [31, 40], [8, 42]] },
    { m: 'mech', t: 2, rect: [22, 52, 42, 60] },
    { line: [22, 56, 0, 60], m: 'mech', t: 1, over: true }, { line: [22, 58, 0, 62], m: 'mech', t: 2, over: true },
    // the belly bay: shut, or open with a Wolf about to drop
    { m: 'mech', t: 2, when: 'closed', poly: [[72, 60], [132, 60], [128, 68], [76, 68]] },
    { only: 'wolves', m: 'haz', t: 1, when: 'closed', line: [80, 62, 86, 67] }, { only: 'wolves', m: 'haz', t: 1, when: 'closed', line: [94, 62, 100, 67] },
    { only: 'wolves', m: 'haz', t: 1, when: 'closed', line: [108, 62, 114, 67] }, { only: 'wolves', m: 'haz', t: 1, when: 'closed', line: [120, 62, 126, 67] },
    { m: 'lamp', t: 2, when: 'open', poly: [[74, 60], [130, 60], [126, 72], [78, 72]] },
    { m: 'lamp', t: 0, when: 'open', poly: [[84, 62], [120, 62], [118, 68], [86, 68]] },
    { m: 'mech', t: 2, when: 'open', poly: [[70, 60], [76, 60], [66, 78], [62, 76]] },
    { m: 'mech', t: 2, when: 'open', poly: [[128, 60], [134, 60], [142, 76], [138, 78]] },
  ],
};

// ---------------------------------------------------------------- B
// The Iron Avalanche: a war train on runners racing along the snow: a
// plough engine, a mortar car and a rocket car, broken off one by one.
// Weak point: each car's hatch while it fires.
BOSS.train = {
  name: 'IRON AVALANCHE', sub: 'WAR TRAIN OF THE WOLVES', width: 214,
  shapes: [
    // runners, with upturned tips
    { m: 'mech', t: 2, poly: [[2, 66], [80, 66], [80, 72], [8, 72], [0, 68]] },
    { m: 'mech', t: 2, poly: [[86, 66], [142, 66], [142, 72], [92, 72], [84, 68]] },
    { m: 'mech', t: 2, poly: [[150, 66], [212, 66], [212, 72], [156, 72], [148, 68]] },
    { m: 'mech', t: 3, rect: [80, 54, 88, 59] }, { m: 'mech', t: 3, rect: [142, 54, 150, 59] },
    // engine: boiler body, cab, smokestack
    { m: 'main', t: 1, poly: [[28, 26], [80, 26], [80, 64], [28, 64]] },
    { m: 'main', t: 2, poly: [[42, 10], [74, 8], [80, 26], [38, 26]] },
    { m: 'glass', t: 1, poly: [[46, 13], [58, 12], [58, 22], [44, 22]] },
    { m: 'mech', t: 2, rect: [62, 0, 72, 10] }, { m: 'mech', t: 1, rect: [60, 0, 74, 3] },
    { only: 'wolves', m: 'haz', t: 1, rect: [28, 44, 80, 48] },
    { dot: [34, 32], m: 'lamp', t: 1 }, { dot: [34, 38], m: 'lamp', t: 1 }, { dot: [35, 32], m: 'lamp', t: 2 }, { dot: [35, 38], m: 'lamp', t: 2 },
    { line: [50, 28, 50, 62], m: 'main', t: 3 }, { line: [66, 28, 66, 62], m: 'main', t: 3 },
    // the plough: a snow-caked wedge
    { m: 'light', t: 1, poly: [[0, 66], [20, 28], [34, 28], [34, 66]] },
    { m: 'light', t: 2, poly: [[10, 66], [24, 40], [30, 40], [30, 66]] },
    { only: 'wolves', m: 'haz', t: 1, line: [4, 62, 22, 32] }, { only: 'wolves', m: 'haz', t: 1, line: [12, 64, 26, 38] },
    { m: 'lamp', t: 1, when: 'open', poly: [[2, 60], [10, 60], [8, 66], [0, 66]] },
    // mortar car: flatbed and a squat turret with a stubby barrel
    { m: 'main', t: 1, rect: [88, 46, 142, 64] },
    { m: 'light', t: 1, flat: true, rect: [88, 46, 142, 48] },
    { m: 'mech', t: 2, poly: [[104, 30], [118, 6], [128, 10], [116, 34]] },
    { m: 'mech', t: 0, flat: true, poly: [[116, 6], [128, 10], [126, 13], [115, 9]] },
    { m: 'main', t: 1, ell: [115, 42, 20, 13] },
    { m: 'light', t: 1, flat: true, poly: [[100, 34], [130, 34], [126, 38], [104, 38]] },
    { m: 'mech', t: 2, when: 'closed', rect: [108, 42, 122, 48] },
    { m: 'lamp', t: 1, when: 'open', rect: [108, 42, 122, 48] }, { m: 'lamp', t: 0, when: 'open', rect: [112, 43, 118, 46] },
    { only: 'wolves', m: 'haz', t: 1, rect: [92, 54, 138, 57] },
    // rocket car: a launcher box raised on its bed
    { m: 'main', t: 1, rect: [150, 42, 210, 64] },
    { m: 'light', t: 1, flat: true, rect: [150, 42, 210, 44] },
    { m: 'mech', t: 2, poly: [[156, 22], [200, 8], [206, 32], [160, 42]] },
    { m: 'mech', t: 1, poly: [[154, 20], [164, 17], [168, 40], [158, 42]] },
    { m: 'mech', t: 3, when: 'closed', rect: [156, 22, 162, 38] },
    { m: 'lamp', t: 1, when: 'open', rect: [156, 22, 162, 38] }, { m: 'lamp', t: 0, when: 'open', rect: [157, 25, 160, 30] },
    { only: 'wolves', m: 'haz', t: 1, poly: [[172, 16], [178, 14], [184, 36], [178, 38]] },
    { line: [176, 44, 176, 62], m: 'main', t: 3 },
  ],
};

// ---------------------------------------------------------------- C
// The Pack Leader: a fast command gunship shaped like a wolf's head, with
// its escort pack (drawn apart, as BOSS.escort). Weak point: the gunship
// itself, only while its pack's shield is broken.
BOSS.leader = {
  name: 'PACK LEADER', sub: 'FIRST OF THE WOLVES', width: 158,
  shapes: [
    // the body behind the head, and its engine
    { m: 'main', t: 2, poly: [[112, 30], [150, 34], [158, 42], [150, 52], [112, 58]] },
    { m: 'mech', t: 2, rect: [146, 36, 158, 48] }, { dot: [156, 42], m: 'lamp', t: 0, over: true }, { dot: [156, 41], m: 'lamp', t: 1, over: true },
    // ears: tall, pointed, the near one with a lit inside
    { m: 'main', t: 2, poly: [[92, 28], [108, 0], [116, 30]] },
    { m: 'main', t: 1, poly: [[66, 30], [76, -4], [94, 28]] },
    { m: 'light', t: 2, poly: [[73, 26], [77, 4], [87, 26]] },
    // the head: a long wolf's snout, a heavy brow
    { m: 'main', t: 1, poly: [[0, 46], [18, 38], [48, 32], [66, 26], [108, 26], [130, 32], [138, 42], [130, 52], [106, 58], [58, 60], [22, 56]] },
    { m: 'light', t: 1, poly: [[48, 34], [66, 28], [106, 28], [98, 36], [62, 38]] },
    { m: 'light', t: 2, poly: [[0, 46], [18, 39], [48, 35], [50, 44], [14, 48]] },
    { m: 'mech', t: 3, rect: [0, 44, 4, 48] },
    { only: 'wolves', m: 'haz', t: 1, poly: [[100, 28], [108, 28], [108, 56], [100, 56]] },
    // cheek plates swept back like fur
    { m: 'light', t: 2, poly: [[84, 48], [126, 42], [120, 56]] },
    { m: 'main', t: 2, poly: [[96, 38], [134, 34], [130, 46]] },
    // the eye
    { m: 'lamp', t: 1, poly: [[46, 38], [64, 35], [66, 40], [48, 42]] },
    { dot: [52, 39], m: 'lamp', t: 0 },
    // the jaw: shut, or dropped open over its twin cannons
    { m: 'mech', t: 2, when: 'closed', poly: [[8, 50], [62, 52], [58, 60], [22, 58]] },
    { m: 'lamp', t: 2, when: 'open', poly: [[10, 50], [62, 52], [60, 58], [16, 56]] },
    { m: 'lamp', t: 0, when: 'open', poly: [[18, 52], [52, 53], [50, 56], [22, 55]] },
    { m: 'mech', t: 2, when: 'open', poly: [[14, 58], [62, 58], [56, 68], [24, 66]] },
    { line: [34, 54, 2, 52], m: 'mech', t: 1, over: true }, { line: [38, 57, 4, 58], m: 'mech', t: 2, over: true },
  ],
};
// One of the Pack Leader's escorts: a small wedge drone (it holds a shield
// round its leader with the others).
BOSS.escort = {
  name: 'ESCORT', width: 30,
  shapes: [
    { m: 'main', t: 1, poly: [[0, 10], [18, 0], [30, 4], [30, 16], [18, 20]] },
    { m: 'light', t: 1, poly: [[4, 9], [18, 2], [28, 5], [16, 9]] },
    { only: 'wolves', m: 'haz', t: 1, rect: [20, 2, 24, 18] },
    { dot: [8, 10], m: 'lamp', t: 1 }, { dot: [9, 10], m: 'lamp', t: 0 },
  ],
};

// ---------------------------------------------------------------- D
// The Blizzard Engine: a flying storm machine with two great turbines,
// a snow cannon between them, frost all over. Weak point: the turbines'
// hot cores, open only while they spin up to throw the storm.
const fan = (cx, cy, rx, ry, open) => {
  const out = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    out.push({ line: [cx, cy, cx + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.92], m: open ? 'cu' : 'mech', t: open ? 1 : 1 });
  }
  return out;
};
BOSS.blizzard = {
  name: 'BLIZZARD ENGINE', sub: 'MAKER OF STORMS', width: 170, snow: false,
  shapes: [
    // the body between the turbines, with cooling fins
    { m: 'main', t: 1, poly: [[34, 44], [124, 36], [168, 50], [168, 66], [124, 80], [34, 72]] },
    { m: 'light', t: 1, poly: [[40, 46], [124, 38], [156, 48], [124, 50], [44, 54]] },
    { line: [92, 44, 92, 74], m: 'mech', t: 2 }, { line: [100, 43, 100, 75], m: 'mech', t: 2 }, { line: [108, 42, 108, 76], m: 'mech', t: 2 },
    { dot: [140, 56], m: 'lamp', t: 1 }, { dot: [148, 58], m: 'lamp', t: 1 },
    // the snow cannon
    { m: 'mech', t: 2, poly: [[0, 54], [40, 52], [40, 64], [0, 62]] },
    { m: 'snow', t: 1, flat: true, rect: [0, 52, 6, 64] },
    { m: 'lamp', t: 1, when: 'open', rect: [0, 55, 4, 61] },
    // the top turbine
    { m: 'main', t: 1, poly: [[44, 6], [126, 10], [136, 26], [126, 42], [44, 46]] },
    { only: 'wolves', m: 'haz', t: 1, rect: [86, 8, 94, 44] },
    { m: 'light', t: 2, ell: [44, 26, 16, 22] },
    { m: 'mech', t: 3, when: 'closed', ell: [44, 26, 12, 17] },
    { m: 'lamp', t: 2, when: 'open', ell: [44, 26, 12, 17] }, { m: 'lamp', t: 0, when: 'open', ell: [44, 26, 5, 7] },
    ...fan(44, 26, 12, 17, false).map((s) => ({ ...s, when: 'closed' })),
    ...fan(44, 26, 12, 17, true).map((s) => ({ ...s, when: 'open' })),
    { m: 'mech', t: 1, ell: [44, 26, 3, 4] },
    // the bottom turbine
    { m: 'main', t: 1, poly: [[44, 70], [126, 74], [136, 90], [126, 106], [44, 110]] },
    { only: 'wolves', m: 'haz', t: 1, rect: [86, 72, 94, 108] },
    { m: 'light', t: 2, ell: [44, 90, 16, 22] },
    { m: 'mech', t: 3, when: 'closed', ell: [44, 90, 12, 17] },
    { m: 'lamp', t: 2, when: 'open', ell: [44, 90, 12, 17] }, { m: 'lamp', t: 0, when: 'open', ell: [44, 90, 5, 7] },
    ...fan(44, 90, 12, 17, false).map((s) => ({ ...s, when: 'closed' })),
    ...fan(44, 90, 12, 17, true).map((s) => ({ ...s, when: 'open' })),
    { m: 'mech', t: 1, ell: [44, 90, 3, 4] },
    // frost: snow caps on the turbines and icicles hanging below
    { m: 'snow', t: 0, flat: true, poly: [[50, 6], [124, 10], [118, 13], [56, 10]] },
    { m: 'snow', t: 0, flat: true, poly: [[50, 70], [124, 74], [118, 77], [56, 74]] },
    { m: 'snow', t: 1, flat: true, poly: [[60, 110], [64, 110], [62, 118]] }, { m: 'snow', t: 1, flat: true, poly: [[76, 109], [82, 109], [79, 121]] },
    { m: 'snow', t: 1, flat: true, poly: [[100, 108], [104, 108], [102, 115]] }, { m: 'snow', t: 1, flat: true, poly: [[112, 107], [118, 107], [115, 119]] },
    // exhaust nozzles at the back
    { m: 'mech', t: 2, rect: [126, 20, 140, 32] }, { m: 'mech', t: 2, rect: [126, 84, 140, 96] },
  ],
};

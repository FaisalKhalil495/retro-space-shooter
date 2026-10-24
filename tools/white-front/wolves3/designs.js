// New Iron Wolves designs for the two classic enemy kinds that had none yet:
// the weaver (weaves up and down, spits once) and the spinner (turns, fires
// 8-way bursts). Three options each, for the owner to pick from. Drawn as
// shapes (vec.js) in units of a tenth of a double-detail pixel; all face left.
export const D = {};
const rot = (pts, a, cx, cy) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const ring = (n, r, cx, cy, a0 = 0) => Array.from({ length: n }, (_, k) => { const a = a0 + (k / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

// ---------------------------------------------------------------- weavers
D.weaverA = { // "Wolf Hound": a drone shaped like a wolf's head; its jaw drops to spit
  name: 'WOLF HOUND', width: 28, muzzles: [[14, 102]],
  shapes: [
    { m: 'main', t: 1, poly: [[118, 44], [146, -36], [176, 44]] },
    { m: 'light', t: 1, poly: [[128, 40], [146, -20], [150, 40]] },
    { m: 'main', t: 2, poly: [[168, 44], [210, -24], [226, 48]] },
    { m: 'mech', t: 2, poly: [[236, 62], [292, 68], [294, 100], [236, 108]] },
    { m: 'main', t: 1, poly: [[44, 62], [110, 32], [200, 32], [240, 56], [252, 82], [240, 110], [180, 124], [110, 118]] },
    { m: 'light', t: 1, poly: [[112, 34], [198, 34], [190, 52], [120, 54]] },
    { m: 'light', t: 2, poly: [[160, 100], [232, 96], [222, 132], [172, 128]] },
    { m: 'light', t: 1, poly: [[0, 84], [50, 60], [122, 58], [130, 96], [50, 100]] },
    { m: 'mech', t: 2, when: 'closed', poly: [[10, 94], [124, 98], [120, 120], [40, 112]] },
    { m: 'lamp', t: 1, when: 'open', poly: [[16, 94], [124, 96], [122, 108], [24, 106]] },
    { m: 'mech', t: 2, when: 'open', poly: [[20, 108], [124, 108], [114, 138], [36, 130]] },
    { line: [76, 70, 108, 64], m: 'lamp', t: 1 },
    { dot: [288, 84], m: 'lamp', t: 2 },
    { only: 'wolves', m: 'haz', t: 1, poly: [[200, 36], [216, 42], [216, 112], [200, 118]] },
  ],
};
D.weaverB = { // "Chain Serpent": an armoured head trailing three linked plates that ripple as it weaves
  name: 'CHAIN SERPENT', width: 32, muzzles: [[8, 84]],
  shapes: [
    { m: 'mech', t: 2, rect: [96, 74, 116, 100] }, { m: 'mech', t: 2, rect: [166, 82, 186, 106] }, { m: 'mech', t: 2, rect: [226, 90, 246, 112] },
    { m: 'light', t: 2, poly: [[272, 102], [320, 74], [312, 102], [320, 128]] },
    { m: 'main', t: 1, ell: [258, 102, 20, 22] },
    { m: 'main', t: 1, ell: [206, 94, 26, 28] }, { m: 'light', t: 1, flat: true, poly: [[186, 72], [226, 72], [222, 80], [190, 80]] },
    { m: 'main', t: 1, ell: [142, 86, 32, 34] }, { m: 'light', t: 1, flat: true, poly: [[118, 56], [166, 56], [162, 64], [122, 64]] },
    { only: 'wolves', m: 'haz', t: 1, rect: [138, 54, 150, 120] },
    { m: 'light', t: 1, poly: [[0, 84], [40, 50], [100, 40], [110, 84], [100, 124], [40, 116]] },
    { m: 'main', t: 1, poly: [[44, 48], [80, 14], [100, 42]] },
    { m: 'mech', t: 2, when: 'closed', poly: [[4, 88], [64, 94], [56, 108], [16, 100]] },
    { m: 'lamp', t: 1, when: 'open', poly: [[4, 86], [64, 88], [64, 100], [10, 100]] },
    { line: [30, 70, 72, 64], m: 'lamp', t: 1 },
  ],
};
D.weaverC = { // "Iron Bat": a machine with scalloped bat wings, a red eye and a spitter in its snout
  name: 'IRON BAT', width: 28, muzzles: [[10, 86]],
  shapes: [
    { m: 'main', t: 1, poly: [[110, 64], [128, -34], [160, 4], [190, -40], [214, 6], [252, -24], [262, 30], [232, 64]] },
    { m: 'light', t: 1, poly: [[112, 62], [128, -30], [138, -18], [124, 62]] },
    { line: [150, 62, 128, -28], m: 'mech', t: 2 }, { line: [180, 62, 190, -36], m: 'mech', t: 2 }, { line: [212, 62, 250, -20], m: 'mech', t: 2 },
    { m: 'main', t: 2, poly: [[110, 104], [136, 172], [168, 140], [200, 178], [222, 138], [258, 152], [242, 104]] },
    { line: [150, 106, 138, 166], m: 'mech', t: 3 }, { line: [190, 106, 200, 172], m: 'mech', t: 3 }, { line: [224, 106, 254, 148], m: 'mech', t: 3 },
    { m: 'mech', t: 2, poly: [[236, 70], [282, 76], [282, 96], [236, 102]] },
    { m: 'main', t: 1, ell: [160, 84, 76, 22] },
    { only: 'wolves', m: 'haz', t: 1, rect: [176, 60, 192, 108] },
    { m: 'light', t: 1, poly: [[0, 86], [40, 64], [96, 60], [100, 106], [40, 104]] },
    { m: 'main', t: 1, poly: [[50, 64], [64, 34], [80, 62]] }, { m: 'main', t: 1, poly: [[72, 62], [92, 32], [100, 62]] },
    { m: 'mech', t: 2, rect: [4, 80, 30, 94] },
    { line: [44, 74, 80, 70], m: 'lamp', t: 1 },
    { dot: [276, 86], m: 'lamp', t: 2 },
  ],
};

// ---------------------------------------------------------------- spinners (they turn, so no snow)
const C = 130;
D.spinnerA = { // "Rotor Mine": a hub with four hazard-tipped blades, a red eye in the middle
  name: 'ROTOR MINE', width: 26, snow: false,
  shapes: [
    ...[0, 1, 2, 3].flatMap((k) => {
      const a = k * Math.PI / 2 + 0.35;
      return [
        { m: 'main', t: 1, flat: true, poly: rot([[C + 30, C - 26], [C + 126, C - 34], [C + 130, C + 6], [C + 30, C + 26]], a, C, C) },
        { m: 'light', t: 1, flat: true, poly: rot([[C + 30, C - 26], [C + 126, C - 34], [C + 128, C - 16], [C + 30, C - 8]], a, C, C) },
        { only: 'wolves', m: 'haz', t: 1, flat: true, poly: rot([[C + 100, C - 33], [C + 128, C - 34], [C + 130, C + 6], [C + 100, C + 12]], a, C, C) },
      ];
    }),
    { m: 'mech', t: 2, flat: true, ell: [C, C, 56, 56] },
    ...ring(8, 44, C, C, 0.2).map(([x, y]) => ({ dot: [x, y], m: 'mech', t: 0 })),
    { m: 'light', t: 1, flat: true, ell: [C, C, 30, 30] },
    { m: 'lamp', t: 1, flat: true, ell: [C, C, 15, 15] },
  ],
};
D.spinnerB = { // "Flak Star": an armoured octagon with eight short guns round its rim
  name: 'FLAK STAR', width: 26, snow: false,
  shapes: [
    ...ring(8, 0, C, C).map((_, k) => { const a = (k / 8) * Math.PI * 2; return { m: 'mech', t: 1, flat: true, poly: rot([[C + 80, C - 12], [C + 130, C - 12], [C + 130, C + 12], [C + 80, C + 12]], a, C, C) }; }),
    ...ring(8, 0, C, C).map((_, k) => { const a = (k / 8) * Math.PI * 2; const [x, y] = rot([[C + 124, C]], a, C, C)[0]; return { dot: [x, y], m: 'mech', t: 3 }; }),
    { m: 'main', t: 1, flat: true, poly: ring(8, 96, C, C, Math.PI / 8) },
    ...ring(8, 0, C, C).map((_, k) => { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; return { only: 'wolves', m: 'haz', t: k % 2 ? 2 : 1, flat: true, poly: rot([[C + 74, C - 14], [C + 92, C - 16], [C + 92, C + 16], [C + 74, C + 14]], a, C, C) }; }),
    { m: 'light', t: 1, flat: true, poly: ring(8, 66, C, C, Math.PI / 8) },
    { m: 'light', t: 0, flat: true, poly: [...ring(8, 66, C, C, Math.PI / 8).slice(4, 8), [C, C]] },
    { m: 'mech', t: 2, flat: true, ell: [C, C, 34, 34] },
    { m: 'lamp', t: 1, flat: true, ell: [C, C, 17, 17] },
  ],
};
const cog = (n, r1, r2) => { const pts = []; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, d = Math.PI / n; for (const [aa, r] of [[a - d * 0.95, r1], [a - d * 0.45, r2], [a + d * 0.45, r2], [a + d * 0.95, r1]]) pts.push([C + Math.cos(aa) * r, C + Math.sin(aa) * r]); } return pts; };
D.spinnerC = { // "Iron Cog": a heavy toothed wheel, the Wolves' red eye in its hub
  name: 'IRON COG', width: 26, snow: false,
  shapes: [
    { m: 'main', t: 1, flat: true, poly: cog(8, 100, 130) },
    ...ring(8, 116, C, C).map(([x, y], k) => ({ only: 'wolves', m: 'haz', t: 1, flat: true, ell: [x, y, 10, 10] })),
    { m: 'mech', t: 2, flat: true, ell: [C, C, 82, 82] },
    ...ring(4, 0, C, C).map((_, k) => ({ m: 'light', t: 1, flat: true, poly: rot([[C + 20, C - 14], [C + 76, C - 22], [C + 76, C + 22], [C + 20, C + 14]], k * Math.PI / 2 + Math.PI / 4, C, C) })),
    { m: 'light', t: 0, flat: true, ell: [C, C, 34, 34] },
    { m: 'mech', t: 2, flat: true, ell: [C, C, 24, 24] },
    { line: [C - 18, C, C + 18, C], m: 'lamp', t: 1 },
  ],
};

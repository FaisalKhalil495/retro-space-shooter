// The owner's own painting of the White Front's boss (after the eight
// designs: "I like this as a boss"), traced shape by shape like the Iron
// Wolves (vec.js), in the painting's own pixels (cropped at 20, 320 of
// the 1536 x 1024 picture). A land battleship on four ski runners: a drill
// cannon in an armoured plough nose, cream armour bands, an olive hull
// (gunmetal in the Wolves' paint), a bridge with lit windows, masts, side
// engines, vents and smoking exhaust stacks. Faces left.
const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rings = (x0, x1, y0, y1, n, m, t) => Array.from({ length: n }, (_, k) => {
  const x = x0 + ((x1 - x0) * k) / n;
  return { line: [x, y0, x, y1], m, t };
});
export const LANDSHIP = {
  name: 'LANDSHIP', width: 250,
  muzzles: [[180, 262]],
  shapes: [
    // ---- masts and aerials (behind everything)
    { line: [1057, 15, 1057, 150], m: 'mech', t: 2, over: true },
    { line: [1052, 40, 1062, 40], m: 'mech', t: 2, over: true }, { line: [1050, 70, 1064, 70], m: 'mech', t: 2, over: true },
    { line: [1030, 62, 1030, 130], m: 'mech', t: 2, over: true }, { line: [1026, 80, 1034, 80], m: 'mech', t: 2, over: true },
    { line: [1076, 85, 1076, 150], m: 'mech', t: 2, over: true },
    { line: [815, 35, 815, 125], m: 'mech', t: 2, over: true }, { line: [810, 60, 820, 60], m: 'mech', t: 2, over: true },
    { line: [796, 70, 796, 125], m: 'mech', t: 2, over: true }, { line: [790, 92, 802, 92], m: 'mech', t: 2, over: true },
    { line: [870, 90, 870, 125], m: 'mech', t: 2, over: true },
    // ---- the exhaust stacks and the machinery at the stern
    { m: 'mech', t: 1, poly: [[1196, 88], [1238, 72], [1252, 140], [1210, 150]] },
    { m: 'mech', t: 1, poly: [[1252, 80], [1296, 68], [1310, 142], [1264, 150]] },
    { m: 'mech', t: 2, poly: [[1296, 118], [1336, 110], [1344, 168], [1302, 172]] },
    { m: 'mech', t: 0, flat: true, poly: [[1196, 88], [1238, 72], [1240, 80], [1198, 95]] },
    { m: 'mech', t: 0, flat: true, poly: [[1252, 80], [1296, 68], [1298, 76], [1254, 87]] },
    { line: [1200, 110, 1244, 98], m: 'mech', t: 3 }, { line: [1256, 104, 1302, 94], m: 'mech', t: 3 },
    { line: [1204, 128, 1248, 118], m: 'mech', t: 3 }, { line: [1260, 124, 1306, 114], m: 'mech', t: 3 },
    { line: [1298, 140, 1340, 134], m: 'mech', t: 3 },
    { m: 'mech', t: 2, poly: R(1140, 140, 1352, 215) },
    { m: 'mech', t: 1, flat: true, poly: R(1140, 140, 1352, 148) },
    { line: [1180, 150, 1180, 212], m: 'mech', t: 3 }, { line: [1236, 150, 1236, 212], m: 'mech', t: 3 }, { line: [1296, 150, 1296, 212], m: 'mech', t: 3 },
    // ---- the bridge: a raised deck with a row of lit windows, small turrets
    { m: 'main', t: 1, poly: [[650, 135], [690, 118], [900, 116], [930, 132], [930, 170], [650, 170]] },
    { m: 'main', t: 0, flat: true, poly: [[660, 132], [692, 121], [898, 119], [920, 132]] },
    ...Array.from({ length: 9 }, (_, k) => ({ m: 'lamp', t: 2, rect: [672 + k * 20, 144, 684 + k * 20, 152] })),
    { m: 'mech', t: 1, poly: R(728, 100, 772, 120) }, { m: 'mech', t: 1, poly: R(824, 106, 882, 124) },
    { m: 'main', t: 2, poly: [[978, 112], [1036, 104], [1048, 140], [984, 142]] },
    { m: 'mech', t: 2, poly: R(488, 150, 580, 175) }, { m: 'mech', t: 1, flat: true, poly: R(492, 150, 576, 156) },
    { m: 'mech', t: 2, poly: R(348, 158, 418, 178) },
    // ---- the hull: olive above, cream armour band, dark below
    { m: 'main', t: 1, poly: [[540, 180], [650, 166], [1010, 160], [1150, 172], [1300, 184], [1352, 214], [1400, 244], [1395, 255], [1290, 242], [560, 218]] },
    { m: 'main', t: 0, flat: true, poly: [[560, 184], [650, 172], [1010, 166], [1140, 178], [1100, 186], [600, 192]] },
    { m: 'light', t: 1, poly: [[555, 216], [930, 228], [1150, 236], [1290, 240], [1395, 252], [1398, 286], [555, 300]] },
    { m: 'mech', t: 2, poly: [[500, 298], [1398, 282], [1418, 300], [1402, 344], [1330, 362], [580, 376], [520, 362]] },
    { m: 'mech', t: 1, flat: true, poly: [[520, 300], [1398, 285], [1400, 292], [520, 308]] },
    { line: [905, 300, 905, 370], m: 'mech', t: 3 }, { line: [1150, 296, 1150, 365], m: 'mech', t: 3 }, { line: [700, 302, 700, 372], m: 'mech', t: 3 },
    { m: 'mech', t: 2, poly: [[1398, 282], [1440, 288], [1398, 300]] },
    { m: 'lamp', t: 1, poly: R(1372, 262, 1384, 278) },
    // ---- the side engines: dark housings with steel cylinders and copper bands
    { m: 'mech', t: 3, poly: R(700, 222, 905, 305) },
    { m: 'mech', t: 2, poly: R(704, 226, 901, 301) },
    { m: 'mech', t: 1, poly: R(740, 240, 875, 296) }, { m: 'mech', t: 1, ell: [740, 268, 14, 28] }, { m: 'mech', t: 2, ell: [875, 268, 12, 28] },
    { m: 'mech', t: 0, flat: true, poly: R(740, 248, 875, 258) },
    { m: 'mech', t: 3, flat: true, poly: R(740, 286, 875, 296) },
    ...[770, 812, 852].map((x) => ({ m: 'cu', t: 1, flat: true, poly: R(x, 240, x + 8, 296) })),
    { m: 'mech', t: 3, poly: R(1147, 246, 1282, 318) },
    { m: 'mech', t: 2, poly: R(1151, 250, 1278, 314) },
    { m: 'mech', t: 1, poly: R(1180, 258, 1262, 306) }, { m: 'mech', t: 1, ell: [1180, 282, 12, 24] }, { m: 'mech', t: 2, ell: [1262, 282, 10, 24] },
    { m: 'mech', t: 0, flat: true, poly: R(1180, 265, 1262, 273) },
    { m: 'mech', t: 3, flat: true, poly: R(1180, 298, 1262, 306) },
    ...[1206, 1236].map((x) => ({ m: 'cu', t: 1, flat: true, poly: R(x, 258, x + 7, 306) })),
    // ---- vents in the olive hull
    { m: 'mech', t: 3, poly: R(920, 190, 1000, 232) }, ...rings(926, 1000, 192, 230, 7, 'mech', 1),
    { m: 'mech', t: 3, poly: R(1060, 160, 1115, 205) }, ...[166, 174, 182, 190, 198].map((y) => ({ line: [1062, y, 1113, y], m: 'mech', t: 1 })),
    { m: 'mech', t: 3, poly: R(1210, 192, 1250, 236) }, ...[198, 206, 214, 222, 230].map((y) => ({ line: [1212, y, 1248, y], m: 'mech', t: 1 })),
    { line: [600, 205, 680, 205], m: 'cu', t: 2 }, { line: [560, 312, 900, 306], m: 'cu', t: 2 }, { line: [960, 304, 1140, 300], m: 'cu', t: 2 },
    { dot: [1080, 214], m: 'cu', t: 1 }, { dot: [780, 210], m: 'cu', t: 1 }, { dot: [1300, 230], m: 'cu', t: 1 },
    // ---- ski struts and the four runners
    ...[[540, 600], [880, 940], [1258, 1300]].flatMap(([a, b]) => [
      { m: 'mech', t: 1, poly: [[a, 350], [a + 14, 350], [a + 36, 402], [a + 22, 402]] },
      { m: 'mech', t: 2, poly: [[b - 14, 350], [b, 350], [b - 18, 402], [b - 32, 402]] },
      { m: 'mech', t: 2, poly: R(a + 6, 340, b - 6, 356) },
    ]),
    { m: 'mech', t: 1, poly: [[138, 432], [192, 400], [746, 400], [748, 426], [728, 444], [196, 448]] },
    { m: 'mech', t: 0, flat: true, poly: [[192, 400], [746, 400], [744, 408], [186, 408]] },
    { m: 'mech', t: 1, poly: [[822, 404], [836, 390], [1086, 388], [1094, 412], [1076, 428], [838, 428]] },
    { m: 'mech', t: 0, flat: true, poly: [[836, 390], [1086, 388], [1088, 396], [834, 398]] },
    { m: 'mech', t: 1, poly: [[1204, 394], [1216, 378], [1430, 376], [1440, 398], [1426, 414], [1218, 414]] },
    { m: 'mech', t: 0, flat: true, poly: [[1216, 378], [1430, 376], [1432, 384], [1214, 386]] },
    { m: 'mech', t: 1, poly: [[14, 412], [42, 396], [130, 394], [126, 418], [30, 422]] },
    // ---- the nose: the lower plough blade, an upper plough plate, machinery, the drill cannon
    { m: 'light', t: 2, poly: [[18, 414], [102, 300], [236, 262], [252, 296], [146, 396], [60, 420]] },
    { m: 'light', t: 1, flat: true, poly: [[22, 410], [104, 302], [234, 265], [238, 275], [112, 310], [32, 412]] },
    { m: 'light', t: 1, poly: [[128, 192], [270, 168], [302, 174], [282, 206], [226, 236], [168, 222]] },
    { m: 'light', t: 0, flat: true, poly: [[134, 192], [270, 171], [296, 176], [266, 182], [150, 198]] },
    { m: 'mech', t: 2, poly: [[260, 200], [380, 176], [470, 210], [470, 330], [300, 330], [250, 300]] },
    { m: 'mech', t: 3, poly: [[300, 300], [470, 300], [470, 340], [320, 340]] },
    // the drill cannon: a copper breech, a ribbed steel barrel, a big dark muzzle
    { m: 'cu', t: 1, poly: [[284, 218], [384, 212], [388, 306], [286, 304]] },
    { m: 'cu', t: 0, flat: true, poly: [[286, 230], [384, 226], [384, 238], [286, 242]] },
    { m: 'cu', t: 3, flat: true, poly: [[286, 290], [386, 290], [386, 304], [286, 304]] },
    ...[300, 326, 352].map((x) => ({ m: 'mech', t: 2, flat: true, poly: R(x, 214, x + 8, 306) })),
    { m: 'mech', t: 2, poly: [[226, 226], [288, 222], [290, 302], [226, 300]] },
    { m: 'mech', t: 1, flat: true, poly: [[228, 232], [288, 230], [288, 242], [228, 244]] },
    ...[238, 254, 270].map((x) => ({ m: 'mech', t: 3, flat: true, poly: R(x, 224, x + 5, 302) })),
    { m: 'mech', t: 2, ell: [212, 262, 26, 44] },
    { m: 'mech', t: 1, ell: [204, 262, 22, 38] },
    { m: 'mech', t: 0, flat: true, poly: [[188, 230], [214, 226], [214, 236], [190, 240]] },
    { m: 'mech', t: 3, when: 'closed', ell: [198, 262, 13, 24] },
    { m: 'lamp', t: 2, when: 'open', ell: [198, 262, 13, 24] }, { m: 'lamp', t: 0, when: 'open', ell: [196, 262, 6, 12] },
    // ---- the plough blades and the armour plates over the nose
    { m: 'light', t: 1, poly: [[368, 172], [552, 172], [552, 230], [440, 232], [368, 210]] },
    { m: 'light', t: 1, poly: [[145, 438], [300, 266], [362, 226], [452, 226], [372, 330], [252, 414], [190, 442]] },
    { m: 'light', t: 2, poly: [[300, 410], [420, 266], [500, 234], [548, 234], [540, 300], [452, 384], [360, 412]] },
    { m: 'light', t: 1, poly: [[452, 384], [510, 300], [556, 262], [562, 330], [502, 376]] },
    { line: [190, 440, 362, 228], m: 'light', t: 3 }, { line: [300, 410, 500, 236], m: 'light', t: 3 },
    { line: [372, 210, 552, 210], m: 'light', t: 3 },
    { dot: [420, 300], m: 'cu', t: 2 }, { dot: [330, 360], m: 'cu', t: 2 }, { dot: [480, 330], m: 'cu', t: 2 },
    // ---- the Wolves' paint only: hazard stripes and a red eye lamp
    { only: 'wolves', m: 'haz', t: 1, poly: R(555, 290, 1398, 298) },
    { only: 'wolves', m: 'haz', t: 1, poly: [[1010, 162], [1030, 162], [1030, 230], [1010, 228]] },
    { only: 'wolves', m: 'lamp', t: 1, poly: [[392, 186], [450, 184], [450, 196], [392, 198]] },
  ],
};

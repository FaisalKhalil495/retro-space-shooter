import { PAL } from './config.js?v=0.9.1';

// Pixel art is written as text grids: each character is one pixel and maps
// to a palette colour ('.' is transparent). Each sprite is drawn once onto
// its own small canvas at start-up, plus a pale "hit flash" copy.
const KEY = {
  k: PAL.ink,
  b: PAL.blueDark,
  B: PAL.blue,
  p: PAL.bluePale,
  c: PAL.cream,
  l: PAL.amberLight,
  a: PAL.amber,
  A: PAL.amberSoft,
  o: PAL.amberDark,
  r: PAL.red,
  R: PAL.redDark,
  s: PAL.redSoft,
  g: PAL.grey,
};

const ART = {
  // The player's ship, facing right. Cream canopy, steel-blue hull, amber trim.
  player: [
    '....kkk...........',
    '...kpppk..........',
    '..kBppcpk.........',
    'kkkBBppppkkkkk....',
    'kAkBBpppppaalck...',
    'kaAkBBBppppppccck.',
    'kAkBBBBBBBBBbkkk..',
    'kkkbBBBBBbkkkk....',
    '..kbbBBbk.........',
    '...kbbbk..........',
    '....kkk...........',
  ],
  // Small dusty-red pod that drifts straight across.
  drifter: [
    '...kkkk...',
    '..kRrrRk..',
    '.kRrssrRkk',
    'kcRrrrrRRk',
    'kcRrrrrRRk',
    '.kRrssrRkk',
    '..kRrrRk..',
    '...kkkk...',
  ],
  // Living alien manta: raw red flesh, cream teeth, a little amber eye.
  weaver: [
    '.........kk',
    '.......kkrk',
    '....kkkrrRk',
    'kkkklsrrrRk',
    '.kccssrrrRk',
    'kkkklsrrrRk',
    '....kkkrrRk',
    '.......kkrk',
    '.........kk',
  ],
  // Armoured gunship with a twin cannon on its left side.
  gunner: [
    '....kkkkkk....',
    '...kgBBBBgk...',
    '..kgBpppBBgk..',
    'kkkkgBBBBBBgk.',
    'kggkRrrsrRBgkk',
    '.kkkRrsllrRBgk',
    'kggkRrrsrRBgkk',
    'kkkkgBBBBBBgk.',
    '..kgBBBBBBgk..',
    '...kgBBBBgk...',
    '....kkkkkk....',
  ],
  // Fast red dart that steers towards the player.
  seeker: [
    '......kkk.',
    '....kkRrk.',
    '..kkRrrRkk',
    'kclsrrrRRk',
    '..kkRrrRkk',
    '....kkRrk.',
    '......kkk.',
  ],
  // Slow, harmless cargo pod. Shoot it to release the pickup inside (the
  // slot in the middle shows the pickup's colour).
  carrier: [
    '..kkkkkkkkk..',
    '.kpppppppppk.',
    'kpBBBBBBBBBpk',
    'kBbkkkkkkkbBk',
    'kBbk.....kbBk',
    'kBbkkkkkkkbBk',
    'kpBBBBBBBBBpk',
    '.kbbbbbbbbbk.',
    '..kkkkkkkkk..',
  ],
  // Sniper: a long-barrelled gunship. Shows an aiming line, then fires a
  // fast shot along it.
  sniper: [
    '......kkkkkk..',
    '....kkBBBBppk.',
    'kkkkkBBrrBBBpk',
    'cclccbBrsBBBBk',
    'kkkkkBBrrBBBpk',
    '....kkbbbbbbk.',
    '......kkkkkk..',
  ],
  // Spinner: a rotating disc that sprays bullets in a star pattern.
  spinner: [
    '.....k.....',
    '....kgk....',
    '...kBBBk...',
    '.kkBpppBkk.',
    'kgBprrrpBgk',
    'kgBprsrpBgk',
    'kgBprrrpBgk',
    '.kkBpppBkk.',
    '...kBBBk...',
    '....kgk....',
    '.....k.....',
  ],
  // Tiny ship used for the lives counter.
  lifeIcon: [
    '.kkk...',
    'kABpkk.',
    'kaBppck',
    'kABpkk.',
    '.kkk...',
  ],
};

function build(rows, colorOverride) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = colorOverride || KEY[ch] || '#ff00ff';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

export const SPRITES = {};
for (const [name, rows] of Object.entries(ART)) {
  SPRITES[name] = build(rows);
  SPRITES[name + 'Flash'] = build(rows, PAL.cream);
}

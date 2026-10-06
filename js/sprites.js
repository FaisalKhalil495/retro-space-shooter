import { PAL } from './config.js?v=0.15.0';

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
  // Rust Moon's desert garrison: sand, khaki and dark tan armour.
  d: '#c9ab86',
  e: '#9a7352',
  f: '#5e4434',
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
  // Rust Moon: a cliff turret, armoured shut...
  turretShut: [
    '....kkkk...',
    '..kkooook..',
    '.koAAAAook.',
    '.koAoooAok.',
    'kkkkkkkkkkk',
    'kgRgRgRgRgk',
    'kkkkkkkkkkk',
  ],
  // ...and open, showing its soft red core and barrel (only now can it be hurt).
  turretOpen: [
    '.....kkkk..',
    '....kooook.',
    'kkkkkrssrok',
    'cclckrlsrok',
    'kkkkkrssrok',
    'kgRgRgRgRgk',
    'kkkkkkkkkkk',
  ],
  // Rust Moon: a low, fast skimmer that hugs the canyon floor.
  skimmer: [
    '......kkkk..',
    '...kkkaAAak.',
    '.kkoooaaaaak',
    'klcoooooooRk',
    '.kkRRRRRRkk.',
    '...kkkkkk...',
  ],
  // Rust Moon: a six-legged mortar crawler; its stubby tube points up-left.
  crawler: [
    '..kk..........',
    '.kok..........',
    '..kok.........',
    '...kokkkkkk...',
    '...kRRRRRRRk..',
    '..kRrsrrrsrRk.',
    '..kRRRRRRRRRk.',
    '..k.k.k.k.k.k.',
    '.k.k.k...k.k.k',
  ],
  // Rust Moon: a raider, a small armed fighter (rust-red hull, swept-back
  // gunmetal wings, amber cockpit); its gun is in its nose, facing left.
  raider: [
    '.........kkk.',
    '.......kkggk.',
    '......kgggk..',
    '..kkkkRRrrRk.',
    'kclgRRsraaRRk',
    '..kkkkRRrrRk.',
    '......kgggk..',
    '.......kkggk.',
    '.........kkk.',
  ],
  // Siege Crawler's floating mine (its light blinks, see crawler.js).
  mine: [
    '...p...',
    '.p.k.p.',
    '..kBk..',
    'pkBsBkp',
    '..kBk..',
    '.p.k.p.',
    '...p...',
  ],
  // Siege Crawler's attack drone, gun at the front (left).
  drone: [
    '.kkkkk..',
    'kgAoooAk',
    'lcooooRk',
    'kgAoooAk',
    '.kkkkk..',
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

// Rust Moon's own look for the enemy types it shares with level 1: the same
// shapes and sizes (so you know each threat at a glance), dressed as the
// planet's desert garrison: sand and khaki armour, gunmetal frames, rust-red
// guns and amber visors, which stand out against the dark red canyon. The
// weaver becomes a native dust manta with a sandy, leathery hide.
// (Cargo pods look the same on every level: their light is a signal.)
const RUST_ART = {
  drifter: [
    '...kkkk...',
    '..keddek..',
    '.kedaadekk',
    'kcRrrrrRfk',
    'kcRrrrrRfk',
    '.kedaadekk',
    '..keefek..',
    '...kkkk...',
  ],
  weaver: [
    '.........kk',
    '.......kkek',
    '....kkkdefk',
    'kkkkladdefk',
    '.kccaedfdfk',
    'kkkkladdefk',
    '....kkkdefk',
    '.......kkek',
    '.........kk',
  ],
  gunner: [
    '....kkkkkk....',
    '...kgddddgk...',
    '..kgdaaaddgk..',
    'kkkkgddddddgk.',
    'kggkRrrsrRdgkk',
    '.kkkRrsllrRdgk',
    'kggkRrrsrRdgkk',
    'kkkkgeeeeeegk.',
    '..kgeeeeeegk..',
    '...kgeeeegk...',
    '....kkkkkk....',
  ],
  seeker: [
    '......kkk.',
    '....kkedk.',
    '..kkeddekk',
    'kclRrddeek',
    '..kkeddekk',
    '....kkedk.',
    '......kkk.',
  ],
  sniper: [
    '......kkkkkk..',
    '....kkddddaak.',
    'kkkkkddrrddeak',
    'cclccfdrsdeeek',
    'kkkkkddrrddeak',
    '....kkffffffk.',
    '......kkkkkk..',
  ],
  spinner: [
    '.....k.....',
    '....kgk....',
    '...kedek...',
    '.kkedddekk.',
    'kgedrrrdegk',
    'kgedrsrdegk',
    'kgedrrrdegk',
    '.kkedddekk.',
    '...kedek...',
    '....kgk....',
    '.....k.....',
  ],
};
for (const [name, rows] of Object.entries(RUST_ART)) ART[name + '_rust'] = rows;

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

import { PAL } from './config.js?v=0.17.0';

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
  // Rust Moon: sand, tan and dark tan (canvas, planks, desert hide).
  d: '#c9ab86',
  e: '#9a7352',
  f: '#5e4434',
  h: '#a7a4ad', // steel (gun barrels)
  n: '#46444d', // dark gunmetal
  // Frostring: ice, from frost-white to deep blue.
  i: '#e6eef7',
  j: '#b8cde3',
  m: '#7f9cc0',
  q: '#4d6890',
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

// Rust Moon's own versions of the enemy types it shares with level 1, chosen
// by the owner (v0.16.0) from four sets: the "Dust Pirates", desert raiders
// who patch their craft together from canvas, planks and rust-red metal.
// Each is exactly the size of its level 1 cousin and behaves exactly the
// same; only the look changes. (Cargo pods look the same on every level:
// their light is a signal.)
const RUST_ART = {
  // Pod -> sail skiff: a small patched hull under a canvas sail.
  drifter: [
    '.....kk...',
    '....kcck..',
    '...kcccck.',
    '..kkkekkkk',
    'kaRrrrrrRk',
    'klRssrrrRk',
    '.kRRRRRRk.',
    '..kkkkkk..',
  ],
  // Weaver -> dust bat: a native creature with ragged wings and a snapping
  // mouth (it still bleeds lightly, like the weaver).
  weaver: [
    '......k.k..',
    '.....kdkdk.',
    '....kddedk.',
    'kk.kdeeek..',
    'kcklseeefkk',
    'kk.kdeeek..',
    '....kddedk.',
    '.....kdkdk.',
    '......k.k..',
  ],
  // Gunship -> sand galleon: a flying ship with two sails, portholes, a plank
  // keel and twin cannons out front.
  gunner: [
    '......kk..kk..',
    '.....kcckkcck.',
    '....kccckcccck',
    '...kkkkkkkkkkk',
    'hhkRrrrrrrrrRk',
    'kkRrcRcRcRrrRk',
    'hhkRrrrrrrrrRk',
    '.kRRRRRRRRRRk.',
    '..kfefefefek..',
    '...kkkkkkkkk..',
    '..............',
  ],
  // Seeker -> kite glider: a fast canvas-winged glider.
  seeker: [
    '.....kk...',
    '...kkcck..',
    '.kkcccccrk',
    'kaRRRRRrrk',
    '.kkcccccrk',
    '...kkcck..',
    '.....kk...',
  ],
  // Sniper -> harpoon gun: a long barbed harpoon on a patched hull.
  sniper: [
    '..........kk..',
    '.........kcck.',
    'kk.....kkkcckk',
    'ckkhhhhhRrrrRk',
    'kk.....kRsrRek',
    '........kRRRk.',
    '.........kkk..',
  ],
  // Spinner -> windmill: four canvas sails (drawn spinning).
  spinner: [
    '....kcckk..',
    '.k..kccddk.',
    'kdk.kccdk..',
    'kddkkcdk...',
    'cccdfRfkkkk',
    'ccccRRRcccc',
    'kkkkfRfdccc',
    '...kdckkddk',
    '..kdcck.kdk',
    '.kddcck..k.',
    '..kkcck....',
  ],
};
// Frostring's own versions of the shared enemy types, chosen by the owner
// from eight sets: the "Ice Harvesters", the invaders' mining crews
// strip-mining the comet ring, in yellow-and-black hazard paint with drills
// and saw blades. Same sizes and behaviour as level 1 (cargo pods unchanged).
const FROST_ART = {
  // Pod -> drill pod: a hazard-striped pod with a drill for a nose.
  drifter: [
    '..kkkkkk..',
    '.kAaAaAak.',
    'kakAkAkAak',
    'hhkgggggak',
    'hhkgggggak',
    'kAkAkAkAak',
    '.kkkkkkkk.',
    '..........',
  ],
  // Weaver -> tunnel grub: a fat, ridged creature that bores through ice
  // (it still bleeds lightly, like the weaver).
  weaver: [
    '...........',
    '..kkkkkkk..',
    '.kcdcdcdck.',
    'kscdcdcdcek',
    'kccdcdcdcek',
    'kscdcdcdcek',
    '.kcdcdcdck.',
    '..kkkkkkk..',
    '...........',
  ],
  // Gunship -> ice cutter: a hauler with a saw blade out front and a cab.
  gunner: [
    '....kkkkkk....',
    '...kaaaaaak...',
    '..kaAkAkAak...',
    '.khkkkkkkkkk..',
    'hhhkgggggggak.',
    'hlhkgnnngggak.',
    'hhhkgggggggak.',
    '.khkkkkkkkkk..',
    '..kaAkAkAak...',
    '...kaaaaaak...',
    '....kkkkkk....',
  ],
  // Seeker -> rivet dart: a riveted, striped dart.
  seeker: [
    '..........',
    '...kkkkk..',
    '.kkaAaAak.',
    'hhkgggggak',
    '.kkaAaAak.',
    '...kkkkk..',
    '..........',
  ],
  // Sniper -> core drill: a long drill bit on a striped housing.
  sniper: [
    '........kkkk..',
    '.......kaAaak.',
    'kkkkkkkkgggak.',
    'hlhlhlhkgnnggk',
    'kkkkkkkkgggak.',
    '.......kaAaak.',
    '........kkkk..',
  ],
  // Spinner -> saw disc: a toothed saw blade (drawn spinning).
  spinner: [
    '...kkhhkk..',
    '.kkhkhkkhk.',
    'khkhhhhhkk.',
    'kkhhhahgghk',
    'hkhhanaggkk',
    'hhhannnaggh',
    'kkhhanaggkh',
    'khhggagggkk',
    '.kkgggggkhk',
    '.khkkgkhkk.',
    '..kkhhkk...',
  ],
};
for (const [name, rows] of Object.entries(RUST_ART)) ART[name + '_rust'] = rows;
for (const [name, rows] of Object.entries(FROST_ART)) ART[name + '_frost'] = rows;

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

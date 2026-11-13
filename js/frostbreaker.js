import { VIEW_W, HUD_H, PAL } from './config.js?v=0.37.0';
import { sfx } from './audio.js?v=0.37.0';
import { clamp, fillDisc } from './util.js?v=0.37.0';
import { FINE, snapFine, detailCanvas } from './detail.js?v=0.37.0';
import { METAL, MOLTEN } from './gore.js?v=0.37.0';
import { BOMB_DAMAGE } from './weapons.js?v=0.37.0';
import { GROUND_SPEED } from './terrain.js?v=0.37.0';
import { burstRing } from './wolves.js?v=0.37.0';
import { LANDSHIP_PAL, LANDSHIP_POINTS, LANDSHIP_HULL, LANDSHIP_BLADES } from './landshipart.js?v=0.37.0';

// FROSTBREAKER · FLAGSHIP OF THE WHITE FRONT — boss of level 4.
//
// The Iron Wolves' commander's own ship, from the owner's painting: a land
// battleship on four ski runners, in its own olive and cream (not the
// Wolves' gunmetal). It slides on the snow, never flies or walks: back and
// forth on the right, surging at you and charging (further and faster each
// stage).
//
// Its weak point is earned twice: the drill cannon's core sits behind two
// plough blades in a V in front of its muzzle in stage 1. Shoot a blade off
// (6 hits) to open a gap (it stays off: v0.37.0, no more welding drones);
// even then the core can only be hurt while the cannon spins up, fires and
// a moment after. From stage 2 its nose armour is gone, blades and all.
// Specials obey the same rules: a bomb blows both blades off, the laser
// cuts through one, rockets go for whatever is open.
//
// v0.37.0 (owner: its last stage "fired everything all at once"): never
// more than two attacks at once, a real rest between rounds, and it keeps
// out of the left of the screen.
// Stage 1 (100–66%), one attack at a time: Drill Cannon, Searchlight Guns,
//   Plough Blast. (The drill cannon every other time.)
// Stage 2 (66–33%), its nose armour blown off and holed: + Ram Charge
//   (always alone), Cinder Rain; at most a pair.
// Stage 3 (33–0%), burning, a mast down: + Full Steam (alone, every third
//   round), after which it overheats: the burning holes in its hull glow
//   open for 2 s. At most a pair; its cannon fires two shells.
// Every attack has a warning: an aim line, a light, digging ploughs, a
// horn, glowing stacks, a hiss.

// Its size in game pixels (half its sharp picture's; owner, after v0.35.0:
// "a little bit" smaller, 116 x 36, was 126 x 39).
export const SHIP_W = LANDSHIP_HULL[0][0].length / 2;
export const SHIP_H = LANDSHIP_HULL[0].length / 2;
const SINK = SHIP_H - 1; // its runners' undersides, from its top (they rest on the snow)
const HP = 270;
const BLADE_HP = 6;
const SPEED = [0, 20, 26, 32]; // how fast it slides about
const IDLE = [0, 1.3, 1.1, 1.0]; // its rest between rounds
const HOME_X = VIEW_W - SHIP_W + 4; // (its stern a little off the right edge)
const LEFT_X = [0, 84, 72, 64]; // how far it pushes in (only a ram charge goes further)
const AIM = [0, 0.85, 0.75, 0.65]; // the drill cannon's aim line
const OPEN_AFTER = 1.5; // the core stays open this long after the cannon fires
const STAGGER = [0, 0, 1.0, 1.0]; // before a pair's second attack (its warning never overlaps the first's)
const OVERHEAT = 2.0; // after full steam, its hull's holes glow open this long
// The holes in its hull that glow open when it overheats (stage 3), and the
// band of heights where a shot then hurts it anywhere along its hull.
const HOT = { y0: 12, y1: 22 };
// Its rounds of attacks: each stage takes turns between a round with the
// drill cannon (its core opens) and one without.
// (Never more than two at once; a pair is one attack that fills the screen
// with one aimed at you. The ram and full steam always come alone; full
// steam every third round in stage 3.)
const ROUNDS = [
  null,
  { drill: [['drill']], other: [['search'], ['plough']] },
  {
    drill: [['drill'], ['drill', 'cinders']],
    other: [['search', 'cinders'], ['plough'], ['ram']],
  },
  {
    drill: [['drill', 'cinders'], ['drill', 'plough']],
    other: [['ram'], ['search', 'cinders'], ['search', 'plough']],
  },
];
const SMOKE = ['#4d4f57', '#62646c', '#7a7c84'];
const STEAM = ['#f4f6f8', '#e2e9ef', '#cdd8e2'];
const SNOWY = ['#ffffff', '#eef3f7', '#d6e1ea'];
const CREAMS = ['#f6f2de', '#e2dec4', '#c9c5ac', '#a8a48c'];
const EMBER = ['#fff1cf', '#f6c36a', '#e08a3c', '#a8543a'];

// ---------------------------------------------------------------- pictures
// Baked at double detail (js/landshipart.js); the normal-size picture (its
// size and hit area) is made from the sharp one: a pixel is filled when any
// of its four sharp pixels is, so both fill exactly the same box.
const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-/:;<=>?@^_~';
const RGB = LANDSHIP_PAL.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const CREAM_RGB = [0xef, 0xe3, 0xcf];
function picture(rows, tint) {
  const W = rows[0].length;
  const H = rows.length;
  const hi = document.createElement('canvas');
  hi.width = W;
  hi.height = H;
  const lo = document.createElement('canvas');
  lo.width = W / 2;
  lo.height = H / 2;
  const hd = new ImageData(W, H);
  const ld = new ImageData(W / 2, H / 2);
  const mask = new Uint8Array((W / 2) * (H / 2));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = CH.indexOf(rows[y][x]);
      if (k < 0) continue;
      const c = tint ? tint(RGB[k]) : RGB[k];
      const i = (y * W + x) * 4;
      hd.data.set(c, i);
      hd.data[i + 3] = 255;
      const m = (y >> 1) * (W / 2) + (x >> 1);
      if (!mask[m]) {
        mask[m] = 1;
        ld.data.set(c, m * 4);
        ld.data[m * 4 + 3] = 255;
      }
    }
  }
  hi.getContext('2d').putImageData(hd, 0, 0);
  lo.getContext('2d').putImageData(ld, 0, 0);
  lo.hi = hi;
  lo.mask = mask;
  return lo;
}
// (the burnt-out wreck it leaves on the snow: its stage 3 look, charred)
const charred = ([r, g, b]) => [Math.round(r * 0.32 + 14), Math.round(g * 0.28 + 12), Math.round(b * 0.27 + 13)];

// Places on it, in game pixels from its top-left corner.
const PT = Object.fromEntries(Object.entries(LANDSHIP_POINTS).filter(([, v]) => typeof v[0] === 'number').map(([k, [x, y]]) => [k, { x: x / 2, y: y / 2 }]));
const HOLES = LANDSHIP_POINTS.holes.map(([x, y]) => ({ x: x / 2, y: y / 2 }));
// Its core: the drill cannon's muzzle (shots reach it only through a gap):
// at these heights, the first of its pixels a shot meets from in front of
// its blades (its lower plough covers the muzzle's bottom).
const CORE = { front: PT.tip.x - 4, x1: PT.muzzleBack.x, y0: PT.coreTop.y, y1: PT.coreBottom.y };
const SEARCH = { x: PT.bridge.x - 4, y: PT.bridge.y + 1 }; // the searchlight on the bridge roof
// Its other two weak points (owner, after v0.35.1: one place to hit kept
// you pinned low in front; "I want to move all over"): the searchlight's
// lamp and the bridge front it sits on (middle height), open while its beam
// sweeps; and its exhaust stacks (high, at the back), open while they glow
// (cinder rain, revving up to ram). Each a box from its top-left corner,
// in game pixels; shots reach them past its thin masts.
const SPOTS = {
  search: { x0: PT.bridge.x - 13, x1: SEARCH.x + 4, y0: SEARCH.y - 3, y1: SEARCH.y + 2.5 },
  stacks: { x0: PT.stackA.x - 5, x1: PT.stackB.x + 5, y0: PT.stackB.y - 2.5, y1: PT.stackA.y + 4 },
};
const RAM_STOP = 10; // its ram charge stops with its nose this far in from the left edge
const PLOUGH = { x: PT.tip.x - 1, y: PT.tip.y + 9 }; // where the plough throws its ice
const JETS = [PT.engineA.x, PT.engineB.x]; // the steam jets, over its side engines
const JET_W = 9;

let ART = null;
export function buildFrostbreakerArt() {
  if (ART) return ART;
  const hull = LANDSHIP_HULL.map((rows) => picture(rows));
  // What stops a shot: its hull without its masts and aerials (runs at
  // most 2 pixels wide above the deck: a mast and its outline).
  for (const h of hull) {
    const W = h.width;
    h.block = h.mask.slice();
    for (let y = 0; y < Math.floor(SHIP_H * 0.4); y++) {
      for (let x = 0; x < W; ) {
        if (!h.mask[y * W + x]) {
          x++;
          continue;
        }
        let x1 = x;
        while (x1 < W && h.mask[y * W + x1]) x1++;
        if (x1 - x <= 2) for (let k = x; k < x1; k++) h.block[y * W + k] = 0;
        x = x1;
      }
    }
    // (and above the bridge roof, everything in front of the stacks: masts
    // and small gun mounts that would otherwise hide them)
    for (let y = 0; y < Math.floor(SPOTS.search.y0); y++) {
      for (let x = 0; x < SPOTS.stacks.x0; x++) h.block[y * W + x] = 0;
    }
  }
  const blades = LANDSHIP_BLADES.map((B) => {
    const pic = picture(B.rows);
    const rows = new Set(); // (the heights it guards, in the ship's game pixels)
    for (let y = 0; y < pic.height; y++) for (let x = 0; x < pic.width; x++) if (pic.mask[y * pic.width + x]) rows.add(B.y / 2 + y);
    return { pic, flash: picture(B.rows, () => CREAM_RGB), x: B.x / 2, y: B.y / 2, w: pic.width, h: pic.height, mask: pic.mask, rows };
  });
  ART = { hull, wreck: picture(LANDSHIP_HULL[2], charred), blades, drill: drillFrames() };
  return ART;
}
// For the tests: the middle of the gap blade k leaves when it's off (a
// height, from its top, where only that blade guards the core).
const gapRows = [];
export function gapRow(k) {
  if (gapRows[k] !== undefined) return gapRows[k];
  const A = buildFrostbreakerArt();
  const rows = [];
  for (let y = Math.ceil(CORE.y0); y < CORE.y1; y++) {
    if (A.blades[k].rows.has(y) && !A.blades.some((b, j) => j !== k && b.rows.has(y))) rows.push(y);
  }
  gapRows[k] = rows.length ? rows[Math.floor(rows.length / 2)] + 0.5 : null;
  return gapRows[k];
}
// For the tests: the height to aim at its searchlight and its stacks.
export const spotRow = (key) => (key === 'search' ? SEARCH.y : PT.stackB.y);
// For the tests: where its steam jets rise (from its left edge).
export const steamJets = () => JETS.slice();
// For the tests: are its pictures painted yet? And every picture it draws.
export const frostbreakerArtReady = () => !!ART;
export function frostbreakerPictures() {
  const A = buildFrostbreakerArt();
  return [...A.hull, A.wreck, ...A.blades.flatMap((B) => [B.pic, B.flash]), ...A.drill.flat()];
}

// Shapes painted smooth at double detail, then every pixel made fully solid
// or clear, so they stay crisp pixel art.
function crisp(canvas) {
  const c = canvas.hi.getContext('2d');
  const d = c.getImageData(0, 0, canvas.hi.width, canvas.hi.height);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= 128 ? 255 : 0;
  c.putImageData(d, 0, 0);
  return canvas;
}
// The drill shell: a fat steel drill bit with a copper spiral and a hot
// tip, turned to 16 headings, two frames of spin each.
const HEADINGS = 16;
function drillFrames() {
  return Array.from({ length: HEADINGS }, (_, i) => [0, 1].map((f) => {
    const { canvas, ctx } = detailCanvas(14, 14);
    ctx.translate(7, 7);
    ctx.rotate((i * Math.PI * 2) / HEADINGS);
    const body = (grow, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-5.5 - grow, -2.5 - grow);
      ctx.lineTo(1.5, -2.2 - grow);
      ctx.lineTo(6 + grow, 0);
      ctx.lineTo(1.5, 2.2 + grow);
      ctx.lineTo(-5.5 - grow, 2.5 + grow);
      ctx.closePath();
      ctx.fill();
    };
    body(0.6, PAL.ink);
    body(0, '#727b7e');
    ctx.fillStyle = '#a7afb0';
    ctx.fillRect(-5, -2, 6, 1);
    ctx.fillStyle = '#c09363';
    for (let k = -5 + f * 1.5; k < 3; k += 3) {
      ctx.beginPath();
      ctx.moveTo(k, -2.2);
      ctx.lineTo(k + 1, -2.2);
      ctx.lineTo(k + 2.5, 2.2);
      ctx.lineTo(k + 1.5, 2.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#4d5659';
    ctx.fillRect(-6, -2.5, 1, 5);
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(4, -0.5, 1.5, 1);
    ctx.fillStyle = PAL.amberLight;
    ctx.fillRect(3, -1, 1, 2);
    return crisp(canvas);
  }));
}
function drawDrill(ctx, s, snap) {
  const i = (Math.round(Math.atan2(s.vy, s.vx) / ((Math.PI * 2) / HEADINGS)) + HEADINGS) % HEADINGS;
  ctx.drawImage(ART.drill[i][Math.floor(s.t * 20) % 2], snap(s.x) - 7, snap(s.y) - 7);
}

// ---------------------------------------------------------------- helpers
const pc = (g) => g.playerCenter();
const bladeUp = (B) => B.hp > 0;
const gap = (e) => e.blades.some((B) => !bladeUp(B));
const look = (e) => (e.mode === 'dying' ? 2 : e.phase - 1);
const at = (e, p) => ({ x: e.x + p.x, y: e.y + p.y });
const offScreen = (e) => e.x > VIEW_W - 20 || e.x + SHIP_W < 20;

// Slides about the right of the screen, sometimes surging in at you. A ship
// that slips round behind it gets crushed against the edge: it backs up.
function drift(e, dt, g, k = 1) {
  if (pc(g).x > e.x + SHIP_W - 14 && e.dest !== HOME_X + 6) {
    e.dest = HOME_X + 6;
    e.surge = 2.2;
  }
  if (e.dest === undefined || Math.abs(e.dest - e.x) < 1.5) {
    const surge = g.rand() < 0.3;
    e.dest = surge ? LEFT_X[e.phase] : LEFT_X[e.phase] + 8 + g.rand() * (HOME_X - LEFT_X[e.phase] - 8);
    e.surge = surge ? 2.2 : 1;
  }
  const want = clamp((e.dest - e.x) * 2, -SPEED[e.phase] * e.surge, SPEED[e.phase] * e.surge) * k;
  slide(e, want, dt);
}
// Moves at speed `want`, speeding up and slowing down like something heavy.
function slide(e, want, dt) {
  e.vx += clamp(want - e.vx, -dt * 90, dt * 90);
  e.x += e.vx * dt;
}

// The angle from a point to your ship.
const aimFrom = (g, x, y) => {
  const p = pc(g);
  return Math.atan2(p.y - y, p.x - x);
};
// Turns `a` towards `b` by at most `step`.
function turn(a, b, step) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + clamp(d, -step, step);
}
// The drill cannon can aim anywhere ahead of it: from steeply up to steeply
// down (never behind it).
function cannonLimit(a) {
  let d = a - Math.PI;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.PI + clamp(d, -1.35, 1.2);
}

// ---------------------------------------------------------------- attacks
// Each returns true when finished; a.t is the time since it began.
const ATTACKS = {
  // Drill cannon: its core glows and the drill spins up; a dotted red aim
  // line tracks you, then snaps on as it locks (0.85/0.75/0.6 s), and it
  // fires a heavy drill shell along it (2 blocks). Two shells in stage 3
  // (the second with its own, shorter aim). Its core is open from the first
  // glow until a moment after the last shell.
  drill(e, a, dt, g) {
    const aim = AIM[e.phase];
    const shells = e.phase === 3 ? 2 : 1;
    const m = at(e, PT.muzzle);
    if (!a.started) {
      a.started = true;
      a.k = 0;
      a.w = 0;
      a.after = 0;
      a.ang = cannonLimit(aimFrom(g, m.x, m.y));
      sfx.charge(aim);
    }
    e.coreOpen = true;
    if (a.k < shells) {
      a.w += dt;
      if (a.w < aim * 0.7) a.ang = turn(a.ang, cannonLimit(aimFrom(g, m.x, m.y)), dt * 2.6);
      else if (!a.locked) {
        a.locked = true;
        sfx.tick();
      }
      e.aim = { ang: a.ang, lit: a.locked };
      if (a.w >= aim) {
        const s = g.fireShot(m.x - 3, m.y, a.ang, 140, 'drill', true);
        s.dmg = 2;
        s.draw = drawDrill;
        g.blasts.blast(m.x - 3, m.y, 0.35);
        g.burst(m.x - 2, m.y, 6, 60, [PAL.amberLight, PAL.cream, ...SMOKE]);
        sfx.cannon();
        g.shake = Math.max(g.shake, 2);
        e.recoil = 0.25;
        a.k++;
        a.w = aim * 0.3; // (a second shell: a shorter warning)
        a.locked = false;
        if (a.k < shells) sfx.charge(aim * 0.7);
      }
      return false;
    }
    a.after += dt;
    return a.after > OPEN_AFTER;
  },

  // Searchlight guns: a searchlight on the bridge flicks on and sweeps the
  // sky (the slice it sweeps is centred on you), and its guns follow just
  // behind the light: bursts of tracer fire where the beam was a moment
  // ago. Cross its path between bursts, or stay ahead of the light.
  search(e, a, dt, g) {
    const warn = 0.6;
    const sweep = [0, 1.7, 1.55, 1.4][e.phase];
    const width = [0, 1.0, 1.15, 1.3][e.phase];
    const lag = 0.3;
    const s = at(e, SEARCH);
    // (lift: 0 is straight ahead to the left, PI / 2 straight up)
    const lift = (ang) => Math.atan2(-Math.sin(ang), -Math.cos(ang));
    const dir = (l) => Math.atan2(-Math.sin(l), -Math.cos(l));
    if (!a.from && a.from !== 0) {
      // (it can swing round over its own deck, at a ship behind it too)
      const mid = clamp(lift(aimFrom(g, s.x, s.y)), 0.1, 2.75);
      const way = g.rand() < 0.5 ? 1 : -1;
      a.from = clamp(mid - (way * width) / 2, -0.15, 2.95);
      a.to = clamp(mid + (way * width) / 2, -0.15, 2.95);
      a.fire = 0;
      sfx.tick();
    }
    const at_ = (t) => a.from + (a.to - a.from) * clamp((t - warn) / sweep, 0, 1);
    if (a.t < warn + sweep) e.beamA = { x: s.x, y: s.y, ang: dir(at_(a.t)), on: a.t >= warn || Math.floor(a.t * 20) % 2 === 0 };
    if (a.t < warn + sweep + lag) e.searchOpen = true; // (its lamp is open while it shines)
    if (a.t >= warn + lag && a.t < warn + sweep + lag) {
      a.fire -= dt;
      const inBurst = ((a.t - warn - lag) % 0.34) < 0.19;
      if (a.fire <= 0 && inBurst) {
        a.fire = 0.065;
        const ang = dir(at_(a.t - lag));
        g.fireShot(s.x + Math.cos(ang) * 5, s.y + Math.sin(ang) * 5, ang, 125, 'tracer', true);
        if ((a.n = (a.n || 0) + 1) % 2) sfx.shoot();
      }
    }
    return a.t > warn + sweep + lag + 0.2;
  },

  // Plough blast: its ploughs dig into the snow (snow sprays up, the nose
  // shudders: 0.6/0.55/0.5 s), then it hurls a fan of ice chunks at you
  // (7/8/9 of them).
  plough(e, a, dt, g) {
    const warn = [0, 0.6, 0.55, 0.5][e.phase];
    const n = [0, 7, 8, 9][e.phase];
    const fans = 1;
    const p = at(e, PLOUGH);
    if (!a.started) {
      a.started = true;
      a.fired = 0;
      sfx.rumble();
    }
    if (a.t < warn) {
      e.dig = 1;
      if (g.rand() < 0.7) g.burst(p.x + g.rand() * 6, g.terrain.floorY - 1, 2, 50, SNOWY);
      return false;
    }
    if (a.fired < fans && a.t >= warn + a.fired * 0.4) {
      const mid = aimFrom(g, p.x, p.y);
      const spread = 1.1;
      for (let i = 0; i < n; i++) {
        const ang = mid - spread / 2 + (spread * (i + (a.fired ? 0.5 : 0))) / (n - 1);
        g.fireShot(p.x, p.y, ang, 82 + (i % 2) * 8, 'ice', true);
      }
      for (let i = 0; i < 10; i++) g.burst(p.x, p.y, 2, 80, SNOWY);
      sfx.shatter();
      g.shake = Math.max(g.shake, 1.5);
      a.fired++;
    }
    return a.fired >= fans && a.t > warn + (fans - 1) * 0.4 + 0.5;
  },

  // Ram charge: its horn blares and its engines roar, smoke pouring from the
  // stacks (1 s, backing up a little), then it charges across the screen
  // pushing a wall of snow ahead of it (3 blocks if it hits you: fly over)
  // almost to the left edge, brakes and reverses. Always alone.
  ram(e, a, dt, g) {
    const warn = 1.0;
    const speed = [0, 140, 140, 155][e.phase];
    if (!a.started) {
      a.started = true;
      a.stage = 'rev';
      sfx.horn();
    }
    if (a.stage === 'rev') {
      slide(e, 12, dt);
      e.glowStacks = 1;
      e.shudder = 1;
      if (g.rand() < 0.6) smoke(e, g, 2);
      if (a.t >= warn) {
        a.stage = 'charge';
        sfx.stomp();
      }
      return false;
    }
    if (a.stage === 'charge') {
      e.vx = -speed;
      e.x -= speed * dt;
      e.charging = true;
      e.wall = 1;
      if (g.rand() < 0.8) g.burst(e.x - 4 + g.rand() * 6, g.terrain.floorY - 4 - g.rand() * 10, 2, 70, SNOWY);
      // The wall of snow ahead of its plough hurts too.
      if (g.playerVulnerable() && g.touchesPlayer(e.x - 12, g.terrain.floorY - 15, 14, 15)) g.hurtPlayer(3, e);
      if (e.x <= RAM_STOP) {
        // It brakes hard, ploughing up a spray of snow...
        e.x = RAM_STOP;
        a.stage = 'brake';
        a.brake = 0;
        e.vx = 0;
        g.shake = Math.max(g.shake, 4);
        sfx.stomp();
        for (let i = 0; i < 24; i++) g.burst(e.x - 6 + g.rand() * 14, g.terrain.floorY - g.rand() * 14, 2, 90, SNOWY);
      }
      return false;
    }
    if (a.stage === 'brake') {
      a.brake += dt;
      e.shudder = 1;
      if (a.brake > 0.5) a.stage = 'back';
      return false;
    }
    // ...then reverses back to where it likes to be, on the right.
    slide(e, clamp((HOME_X - 10 - e.x) * 3, 0, 80), dt);
    if (g.rand() < 0.4) smoke(e, g, 1);
    return e.x >= HOME_X - 13;
  },

  // Cinder rain: its stacks glow and belch smoke (0.8 s), then burning
  // cinders arc up out of them, high off the top of the screen, and fall
  // straight down columns marked by dotted lines and rings on the snow: one
  // over you, the others either side and further out (1 block each).
  cinders(e, a, dt, g) {
    const warn = 0.8;
    const n = e.phase === 3 ? 6 : 5;
    if (!a.started) {
      a.started = true;
      a.k = 0;
      a.next = warn;
      const px = pc(g).x;
      const lead = g.rand() < 0.5 ? -1 : 1;
      a.cols = [px, px + 24 * lead, px - 24 * lead, px + 48 * lead, px - 50 * lead, px + 74 * lead].slice(0, n).map((x) => clamp(x, 6, VIEW_W - 6));
      sfx.charge(warn);
    }
    if (a.t < warn) {
      e.glowStacks = 1;
      if (g.rand() < 0.5) smoke(e, g, 1);
      return false;
    }
    if (a.k < a.cols.length || a.t < a.next + 1) e.glowStacks = 1; // (still hot: open)
    if (a.k < a.cols.length && a.t >= a.next) {
      const st = at(e, a.k % 2 ? PT.stackB : PT.stackA);
      g.spawnEnemy('cinder', st.x - 2, st.y - 2, { sx: st.x, sy: st.y, tx: a.cols[a.k] });
      g.burst(st.x, st.y, 4, 40, EMBER);
      sfx.mortar();
      a.k++;
      a.next = a.t + 0.2;
    }
    return a.k >= a.cols.length && a.t > a.next + 1.8;
  },

  // Full steam (stage 3, always alone): a hiss and puffs of steam from its
  // side engines, with dotted guide lines up both columns (0.9 s), then
  // scalding steam jets straight up from both engines to the top of the
  // screen (1.4 s, 2 blocks). Then it overheats: the burning holes in its
  // hull glow open for 2 s, your best chance to hurt it. It holds still
  // throughout.
  steam(e, a, dt, g) {
    const warn = 0.9;
    const blow = 1.4;
    if (!a.started) {
      a.started = true;
      sfx.beam(warn * 0.8);
    }
    e.hold = 1;
    if (a.t < warn) {
      e.steamGuide = 1;
      if (g.rand() < 0.5) for (const jx of JETS) g.burst(e.x + jx + (g.rand() - 0.5) * 6, e.y + PT.engineA.y - 1, 1, 25, STEAM);
      return false;
    }
    if (a.t < warn + blow) {
      if (!a.on) {
        a.on = true;
        sfx.howl(blow);
      }
      e.jets = 1;
      if (g.playerVulnerable()) {
        for (const jx of JETS) {
          const x = e.x + jx - JET_W / 2;
          if (g.touchesPlayer(x, HUD_H, JET_W, e.y + PT.engineA.y - HUD_H)) {
            g.hurtPlayer(2, e);
            break;
          }
        }
      }
      return false;
    }
    if (a.t < warn + blow + OVERHEAT) {
      if (!a.hot) {
        a.hot = true;
        sfx.crack();
        for (const h of HOLES) g.burst(e.x + h.x, e.y + h.y, 3, 40, EMBER);
      }
      e.overheat = 1;
      e.shudder = 0.5;
      if (g.rand() < 0.5) {
        const h = HOLES[Math.floor(g.rand() * HOLES.length)];
        g.burst(e.x + h.x, e.y + h.y, 1, 30, STEAM);
      }
      return false;
    }
    return true;
  },
};

// Smoke billowing from its stacks.
function smoke(e, g, n) {
  for (let i = 0; i < n; i++) {
    const st = at(e, g.rand() < 0.5 ? PT.stackA : PT.stackB);
    g.particles.push({
      x: st.x + (g.rand() - 0.5) * 3, y: st.y, vx: 6 + g.rand() * 10, vy: -14 - g.rand() * 12,
      life: 1.1, max: 1.1, color: SMOKE[Math.floor(g.rand() * 3)], size: 3,
    });
  }
}

// ---------------------------------------------------------------- the boss
export const FROSTBREAKER_TYPE = {
  boss: true,
  name: 'FROSTBREAKER',
  title: 'FLAGSHIP OF THE WHITE FRONT',
  taunt: 'FULL AHEAD. CRUSH IT.',
  stageLines: [null, null, 'YOU HOLED MY FUCKING HULL', 'ALL ENGINES. BURN IT.'],
  killLines: ['UNDER THE RUNNERS', 'FLATTENED. NEXT.', 'PLOUGH IT UNDER', 'THE FRONT IS MINE'],
  voice: 'metal',
  music: 'flagship',
  hp: HP,
  score: 8000,
  explodeSize: 2,

  // (Game calls this as the level starts: its pictures are painted then.)
  prepare() {
    buildFrostbreakerArt();
  },

  init(e, g) {
    buildFrostbreakerArt();
    e.w = SHIP_W;
    e.h = SHIP_H;
    e.x = VIEW_W + 40;
    e.y = g.terrain.floorY - SINK;
    e.vx = 0;
    e.surge = 1;
    e.mode = 'enter';
    e.timer = 0;
    e.phase = 1;
    e.blades = LANDSHIP_BLADES.map(() => ({ hp: BLADE_HP, flash: 0 }));
    e.round = null;
    e.drillNext = true;
    e.idle = 1;
    e.rounds = 0;
    e.sink = 0;
    e.recoil = 0;
    e.hitBlade = -1;
    // The snow drift it smashes through as it arrives.
    e.drift = { x: VIEW_W - 34, w: 30, h: 14 };
  },

  update(e, dt, g) {
    e.timer += dt;
    e.coreOpen = false;
    e.searchOpen = false;
    e.aim = null;
    e.beamA = null;
    e.dig = 0;
    e.glowStacks = 0;
    e.jets = 0;
    e.steamGuide = 0;
    e.overheat = 0;
    e.charging = false;
    e.wall = 0;
    e.hold = 0;
    e.shudder = 0;
    e.recoil = Math.max(0, e.recoil - dt);
    e.y = g.terrain.floorY - SINK + e.sink;
    for (const B of e.blades) B.flash = Math.max(0, B.flash - dt);
    const set = (mode) => {
      e.mode = mode;
      e.timer = 0;
    };
    if (e.phase === 3 && e.mode !== 'enter') burning(e, g);
    if (e.phase >= 2 && e.mode !== 'enter' && g.rand() < dt * 3) smoke(e, g, 1);

    switch (e.mode) {
      case 'enter': {
        // A ship's horn off-screen, smoke rising at the right edge... then it
        // smashes through a snow drift on its runners.
        if (!e.entered) {
          e.entered = true;
          g.darkenTo(0.25);
        }
        if (e.timer > 0.3 && !e.horned) {
          e.horned = true;
          sfx.horn();
        }
        const D = e.drift;
        if (D) D.x -= GROUND_SPEED * dt;
        if (e.timer > 0.6 && g.rand() < 0.5) {
          g.particles.push({
            x: VIEW_W - 2 - g.rand() * 8, y: e.y + 2 + g.rand() * 8, vx: -4 - g.rand() * 6, vy: -16 - g.rand() * 10,
            life: 1.4, max: 1.4, color: SMOKE[Math.floor(g.rand() * 3)], size: 3,
          });
        }
        if (e.timer > 2.0) {
          slide(e, -75, dt);
          if (g.rand() < 0.7) g.burst(e.x + 8 + g.rand() * 10, g.terrain.floorY - 1, 1, 40, SNOWY);
          if (D && e.x + PT.tip.x < D.x + D.w * 0.6) {
            // Through the drift in a burst of snow.
            for (let i = 0; i < 40; i++) g.burst(D.x + g.rand() * D.w, g.terrain.floorY - g.rand() * D.h, 2, 110, SNOWY);
            g.shake = 6;
            sfx.crack();
            sfx.stomp();
            e.drift = null;
          }
          if (e.x <= HOME_X) {
            e.x = HOME_X;
            e.vx = 0;
            sfx.horn();
            g.shake = 4;
            set('intro');
            g.showTitle(FROSTBREAKER_TYPE);
          }
        }
        break;
      }
      case 'intro':
        e.shudder = 1;
        if (g.rand() < 0.5) smoke(e, g, 1);
        if (e.timer > 2.4) {
          g.darkenTo(0);
          set('taunt');
        }
        break;
      case 'taunt':
        drift(e, dt, g, 0.3);
        if (!g.title && !e.taunted) {
          e.taunted = true;
          if (g.state === 'playing') g.say(e, FROSTBREAKER_TYPE.taunt);
        }
        if (e.taunted && g.bossMayAttack(e)) {
          set('fight');
          e.idle = 0.6;
        }
        break;
      case 'fight':
        if (!e.round) {
          drift(e, dt, g);
          if (!g.bossMayAttack(e)) break;
          e.idle -= dt;
          if (e.idle <= 0) startRound(e, g);
        } else {
          let done = true;
          let rams = false;
          for (const a of e.round) {
            if (a.done) continue;
            done = false;
            if (a.name === 'ram') rams = true;
            if ((a.wait -= dt) > 0) continue;
            a.t += dt;
            if (ATTACKS[a.name](e, a, dt, g)) a.done = true;
          }
          if (!rams && !e.hold) drift(e, dt, g, 0.35);
          else if (e.hold) slide(e, 0, dt);
          if (done) {
            e.round = null;
            e.idle = IDLE[e.phase];
          }
        }
        break;
      case 'transition':
        // Untouchable and furious for a moment. It doesn't attack again
        // until it has finished shouting.
        e.shudder = 1.5;
        slide(e, clamp((HOME_X - 6 - e.x) * 2, -40, 40), dt);
        if (e.timer > 2 && g.bossMayAttack(e)) {
          set('fight');
          e.idle = 0.5;
        }
        break;
      case 'dying':
        dying(e, dt, g);
        break;
    }
    // Snow thrown up by its runners as it slides.
    if (e.mode !== 'dying' && Math.abs(e.vx) > 8 && g.rand() < 0.6) {
      const sx = e.x + [0.1, 0.4, 0.75][Math.floor(g.rand() * 3)] * SHIP_W + g.rand() * 20;
      if (sx > 0 && sx < VIEW_W) g.burst(sx, g.terrain.floorY - 1, 1, 30, SNOWY);
    }
  },

  // Its weak point (where rockets and bonus items aim): whichever is open,
  // else the middle of the lower blade's gap, in front of the muzzle.
  aimPoint(e) {
    if (e.overheat) return at(e, HOLES[HOLES.length - 1]);
    if (e.searchOpen) return at(e, SEARCH);
    if (e.glowStacks) return { x: e.x + (SPOTS.stacks.x0 + SPOTS.stacks.x1) / 2, y: e.y + PT.stackA.y };
    return { x: e.x + PT.muzzle.x, y: e.y + (gapRow(1) ?? PT.muzzle.y) };
  },

  // Its speech tail points at its bridge.
  voicePoint(e) {
    return at(e, { x: PT.bridge.x, y: PT.bridge.y });
  },

  // Supply pods fly in high, well clear of it.
  supplyY(e, g) {
    return HUD_H + 6 + g.rand() * 34;
  },

  onScreen(e) {
    return e.mode !== 'enter';
  },

  // Bumping into it: out of its front if you hit its nose, otherwise up
  // over it.
  knockback(e, p) {
    const front = p.x + p.w / 2 < e.x + 22 && !e.charging;
    const x = e.x - p.w - 3;
    if (front && x >= 2) p.x = x;
    else p.y = Math.max(HUD_H + 1, e.y - p.h - 2);
  },

  contactDamage(e) {
    return e.charging ? 3 : 2;
  },

  // The core can be hurt while the drill cannon is firing and a blade is
  // off (a shot gets through only at the gap's height); the searchlight
  // while it shines, the stacks while they glow, its hull while it
  // overheats.
  isVulnerable(e) {
    return e.mode === 'fight' && ((e.coreOpen && gap(e)) || e.searchOpen || !!e.glowStacks || !!e.overheat);
  },

  hitTest(e, x, y, w, h) {
    return scan(e, x, y, w, h, false);
  },

  shotTest(e, x, y, w, h) {
    return scan(e, x, y, w, h, true);
  },

  // Hits on a blade dent it instead of hurting the ship; a bomb blows every
  // blade off.
  shield(e, amount, g) {
    if (e.mode !== 'fight') return false;
    if (amount >= BOMB_DAMAGE) {
      let any = false;
      e.blades.forEach((B, k) => {
        if (bladeUp(B)) {
          breakBlade(e, k, g);
          any = true;
        }
      });
      return any;
    }
    const B = e.blades[e.hitBlade];
    if (!B || !bladeUp(B)) return false;
    B.flash = 0.06;
    B.hp -= amount;
    if (B.hp <= 0) breakBlade(e, e.hitBlade, g);
    else sfx.block();
    return true;
  },

  onHit(e, g, x, y) {
    g.burst(x, y, 3, 50, [PAL.amberLight, PAL.cream]);
    const next = e.phase === 1 && e.hp <= e.maxHp * 0.66 ? 2 : e.phase === 2 && e.hp <= e.maxHp * 0.33 ? 3 : 0;
    if (!next || e.hp <= 0) return;
    e.phase = next;
    e.mode = 'transition';
    e.timer = 0;
    e.round = null;
    e.rounds = 0;
    if (offScreen(e)) e.x = HOME_X;
    // Its nose armour blows off, every blade left with it (for good).
    for (const B of e.blades) B.hp = 0;
    const where = next === 2 ? [PT.tip, PT.muzzle, { x: 30, y: 6 }, HOLES[0], HOLES[1]] : [PT.mastFoot, PT.engineA, PT.engineB, HOLES[3], HOLES[4]];
    for (const p of where) {
      const q = at(e, p);
      g.blasts.blast(q.x, q.y, 0.7);
      g.gore.chunks(q.x, q.y, 4, METAL, 100, false);
    }
    if (next === 2) for (let i = 0; i < 10; i++) g.burst(e.x + 14 + g.rand() * 20, e.y + 4 + g.rand() * 10, 2, 90, CREAMS);
    sfx.crack();
    sfx.horn();
    g.shake = 8;
    g.flash = 0.12;
    g.say(e, FROSTBREAKER_TYPE.stageLines[next], 'roar');
    g.stageBonus(e, next);
  },

  draw(e, ctx, snap, g) {
    const A = ART;
    if (e.drift) drawDrift(ctx, e.drift, g, snap);
    const shake = e.shudder ? Math.round((Math.random() - 0.5) * 2 * e.shudder) * FINE : 0;
    const x = snap(e.x) + shake + (e.recoil > 0 ? FINE * 2 : 0);
    const y = snap(e.y);
    const fy = g.terrain.floorY;
    // A soft blue shadow on the snow.
    ctx.fillStyle = 'rgba(40,70,115,0.28)';
    ctx.fillRect(x + 4, fy - 0.5, SHIP_W - 6, 1);
    // The steam jets' guide lines and the searchlight beam go behind it.
    if (e.steamGuide && Math.floor(g.time * 14) % 2 === 0) {
      ctx.fillStyle = STEAM[1];
      ctx.beginPath();
      for (const jx of JETS) {
        for (const side of [-JET_W / 2, JET_W / 2 - 1]) {
          for (let yy = HUD_H + 1; yy < y + PT.engineA.y - 2; yy += 3) ctx.rect(snapFine(x + jx + side), yy, 1, 1.5);
        }
      }
      ctx.fill();
    }
    if (e.beamA && e.beamA.on) drawBeam(ctx, e.beamA);
    ctx.drawImage(e.mode === 'dying' && e.timer > 3.2 ? A.wreck : A.hull[look(e)], x, y);
    // The drill cannon's core: glowing while it's open.
    if (e.coreOpen) {
      const m = { x: x + PT.muzzle.x, y: y + PT.muzzle.y };
      const hot = Math.floor(g.time * 16) % 2 === 0;
      ctx.fillStyle = EMBER[3];
      fillDisc(ctx, m.x, m.y, 3.5);
      ctx.fillStyle = hot ? EMBER[1] : EMBER[2];
      fillDisc(ctx, m.x, m.y, 2.5);
      ctx.fillStyle = hot ? EMBER[0] : EMBER[1];
      fillDisc(ctx, m.x - 0.5, m.y, 1.5);
    }
    // Its guard blades (stage 1).
    e.blades.forEach((B, k) => {
      const b = A.blades[k];
      if (bladeUp(B)) ctx.drawImage(B.flash > 0 ? b.flash : b.pic, x + b.x, y + b.y);
    });
    const pulse = Math.floor(g.time * 6) % 2 === 0;
    // Its open weak points glow: a warm halo, a bright core and, blinking,
    // an amber ring round them (the same look as its open cannon).
    const halo = (cx, cy, r) => {
      ctx.globalAlpha = pulse ? 0.55 : 0.35;
      ctx.fillStyle = EMBER[1];
      fillDisc(ctx, cx, cy, r);
      ctx.globalAlpha = 1;
      if (pulse) {
        ctx.save();
        ctx.strokeStyle = PAL.amberLight;
        ctx.lineWidth = FINE;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    };
    if (e.glowStacks) {
      // Its stacks glowing red-hot: open to your shots.
      halo(x + (PT.stackA.x + PT.stackB.x) / 2, y + (PT.stackA.y + PT.stackB.y) / 2 + 1, 5.5);
      for (const p of [PT.stackA, PT.stackB]) {
        ctx.fillStyle = pulse ? EMBER[0] : EMBER[1];
        ctx.fillRect(x + p.x - 2.5, y + p.y - 0.5, 5, 1.5);
        ctx.fillStyle = EMBER[2];
        ctx.fillRect(x + p.x - 2, y + p.y + 1, 4, 1.5);
      }
    }
    // The searchlight: a lamp on the bridge roof, lit and glowing while it
    // shines (open to your shots), dark and shuttered otherwise.
    {
      const lx = x + SEARCH.x;
      const ly = y + SEARCH.y;
      if (e.searchOpen) halo(lx, ly, 4);
      ctx.fillStyle = PAL.ink;
      fillDisc(ctx, lx, ly, 2.5);
      ctx.fillStyle = e.searchOpen ? (pulse ? PAL.cream : PAL.amberLight) : '#4d5659';
      fillDisc(ctx, lx - 0.5, ly, 2);
    }
    // Overheated (after full steam): the burning holes in its hull glow
    // white-hot, open to your shots.
    if (e.overheat) {
      for (const h of HOLES) {
        halo(x + h.x, y + h.y, 3.5);
        ctx.fillStyle = pulse ? EMBER[0] : EMBER[1];
        fillDisc(ctx, x + h.x, y + h.y, 1.5);
      }
    }
    // Snow churned up by its digging ploughs.
    if (e.dig) {
      ctx.fillStyle = SNOWY[1];
      for (let i = 0; i < 6; i++) ctx.fillRect(snapFine(x + 2 + Math.random() * 14), fy - 1 - Math.random() * 5, 1, 1);
    }
    // The wall of snow it pushes when it charges.
    if (e.wall) drawWall(ctx, x, fy);
    // The steam jets: scalding white columns from its engines to the sky.
    if (e.jets) {
      for (const jx of JETS) {
        const cx = x + jx;
        const top = y + PT.engineA.y;
        ctx.fillStyle = 'rgba(214,225,234,0.75)';
        ctx.fillRect(cx - JET_W / 2, HUD_H, JET_W, top - HUD_H);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(cx - 2, HUD_H, 4, top - HUD_H);
        ctx.fillStyle = STEAM[0];
        for (let k = 0; k < 6; k++) {
          const py = top - ((g.time * 160 + k * 17) % (top - HUD_H));
          fillDisc(ctx, cx + Math.sin(k * 2.1 + g.time * 9) * 2, py, 3);
        }
      }
    }
    // The drill cannon's aim line: dotted red, brighter once it has locked.
    if (e.aim && (e.aim.lit || Math.floor(g.time * 14) % 2 === 0)) {
      const m = { x: x + PT.muzzle.x - 3, y: y + PT.muzzle.y };
      ctx.save();
      ctx.strokeStyle = e.aim.lit ? '#e8a060' : '#c8643f';
      ctx.lineWidth = 1;
      ctx.setLineDash([1.5, 2]);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + Math.cos(e.aim.ang) * 260, m.y + Math.sin(e.aim.ang) * 260);
      ctx.stroke();
      ctx.restore();
    }
  },
};

// What a rectangle reaches first, scanning from its left edge rightwards
// (your shots fly right): a blade, the core (only while it's open) or its
// armour. shots: note which blade (or the core, -1) it hit.
function scan(e, x, y, w, h, shots) {
  if (e.mode === 'dying' || e.mode === 'enter') return null;
  const rx0 = Math.max(0, Math.floor(x - e.x));
  const rx1 = Math.min(SHIP_W - 1, Math.floor(x + w - e.x));
  if (rx1 < rx0) return null;
  const ry = y - e.y;
  // A shot counts along its centre line; your ship by its whole height.
  const rows = shots || h <= 2 ? [ry + h / 2] : [ry + 0.5, ry + h / 2, ry + h - 0.5];
  const mask = ART.hull[look(e)].block;
  const open = e.mode === 'fight';
  for (let cx = rx0; cx <= rx1; cx++) {
    for (const r of rows) {
      const yy = Math.floor(r);
      if (yy < 0 || yy >= SHIP_H) continue;
      for (let k = 0; k < e.blades.length; k++) {
        if (!bladeUp(e.blades[k])) continue;
        const b = ART.blades[k];
        const bx = cx - b.x;
        const by = yy - b.y;
        if (bx >= 0 && bx < b.w && by >= 0 && by < b.h && b.mask[by * b.w + bx]) {
          if (shots) e.hitBlade = k;
          return 'hit';
        }
      }
    }
    for (const r of rows) {
      const yy = Math.floor(r);
      if (yy < 0 || yy >= SHIP_H) continue;
      // Overheated: its hull hurts at the burning holes' heights.
      if (shots && open && e.overheat && r >= HOT.y0 && r < HOT.y1 && mask[yy * SHIP_W + cx]) {
        e.hitBlade = -2;
        return 'hit';
      }
      const guard = e.blades.findIndex((B, k) => bladeUp(B) && ART.blades[k].rows.has(yy));
      if (guard >= 0 && cx >= CORE.front && cx < CORE.x1 && r >= CORE.y0 && r < CORE.y1 && mask[yy * SHIP_W + cx]) {
        // (the hull's edge just in front of a blade, at a height it guards,
        // counts as that blade: a shot lined up with a gap always reaches
        // the blade covering it)
        if (shots) e.hitBlade = guard;
        return 'hit';
      }
      if (guard < 0 && cx >= CORE.front && cx < CORE.x1 && r >= CORE.y0 && r < CORE.y1 && (mask[yy * SHIP_W + cx] || cx >= PT.muzzle.x - 2)) {
        if (!shots) return 'hit';
        e.hitBlade = -1;
        return e.mode === 'fight' && (e.coreOpen || (e.overheat && r >= HOT.y0 && r < HOT.y1)) ? 'hit' : 'block';
      }
      // The searchlight and the stacks: a hit anywhere in their box while
      // they're open (the glow round them counts).
      for (const [key, on] of [['search', e.searchOpen], ['stacks', e.glowStacks]]) {
        const Z = SPOTS[key];
        if (shots && on && open && cx >= Z.x0 && cx < Z.x1 && r >= Z.y0 && r < Z.y1) {
          e.hitBlade = -2;
          return 'hit';
        }
      }
      if (mask[yy * SHIP_W + cx]) return shots ? 'block' : 'hit';
    }
  }
  return null;
}

// Its next round of attacks: with the drill cannon every other time (and
// in stage 3, full steam alone every third round).
function startRound(e, g) {
  const R = ROUNDS[e.phase];
  e.rounds++;
  let pick;
  if (e.phase === 3 && e.rounds % 3 === 0) pick = ['steam'];
  else {
    const pool = e.drillNext ? R.drill : R.other;
    pick = pool[Math.floor(g.rand() * pool.length)];
    if (pool.length > 1 && pick === e.lastRound) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    e.drillNext = !e.drillNext;
  }
  e.lastRound = pick;
  e.round = pick.map((name, i) => ({ name, t: 0, wait: i * STAGGER[e.phase], done: false }));
  e.dest = undefined;
}

// A blade is blown off for good (+50 points when you do it).
function breakBlade(e, k, g) {
  const B = e.blades[k];
  const b = ART.blades[k];
  B.hp = 0;
  const px = e.x + b.x + b.w / 2;
  const py = e.y + b.y + b.h / 2;
  g.blasts.blast(px, py, 0.4);
  g.gore.chunks(px, py, 4, CREAMS, 90, false);
  sfx.explode(0.4);
  g.score += 50;
  g.popups.push({ x: px - 4, y: py - 8, text: '+50', t: 0.8 });
}

// Stage 3: fire and smoke pour from the holes in its hull.
function burning(e, g) {
  if (g.rand() > 0.4) return;
  const h = HOLES[Math.floor(g.rand() * HOLES.length)];
  const fire = g.rand() < 0.55;
  g.particles.push({
    x: e.x + h.x, y: e.y + h.y, vx: 6 + (g.rand() - 0.5) * 8, vy: -14 - g.rand() * 14,
    life: fire ? 0.35 : 0.9, max: fire ? 0.35 : 0.9,
    color: fire ? MOLTEN[Math.floor(g.rand() * 3)] : SMOKE[Math.floor(g.rand() * 3)], size: fire ? 1 : 2,
  });
}

// Its death: its engines blow one by one, a mast topples, the bridge
// erupts, it slews and its plough digs into the snow; then a huge blast,
// and its burnt-out wreck is left burning on the snow.
function dying(e, dt, g) {
  e.aim = null;
  e.shudder = 2;
  g.shake = Math.max(g.shake, 2.5);
  slide(e, e.timer < 2.4 ? -14 : 0, dt); // (it slews on, ploughing in)
  e.sink = Math.min(3, e.timer * 1.2);
  if (g.rand() < 0.6) g.burst(e.x + 4 + g.rand() * 14, g.terrain.floorY - 1, 2, 60, SNOWY);
  burning(e, g);
  const once = (key, t, fn) => {
    if (e.timer > t && !e[key]) {
      e[key] = true;
      fn();
    }
  };
  const big = (p, size, n) => {
    const q = at(e, p);
    g.blasts.blast(q.x, q.y, size);
    g.gore.chunks(q.x, q.y, n, METAL, 110, false);
    g.gore.chunks(q.x, q.y, Math.round(n / 2), MOLTEN, 90, false);
    sfx.explode(size);
  };
  once('d1', 0.3, () => big(PT.engineA, 1.1, 10));
  once('d2', 0.9, () => big(PT.engineB, 1.1, 10));
  once('d3', 1.4, () => {
    big(PT.mastFoot, 0.8, 8);
    sfx.crack();
  });
  once('d4', 2.0, () => {
    big(PT.bridge, 1.5, 14);
    g.shake = 7;
  });
  e.boom = (e.boom || 0) - dt;
  if (e.boom <= 0) {
    e.boom = 0.14;
    const bx = e.x + 6 + g.rand() * (SHIP_W - 12);
    const by = e.y + 6 + g.rand() * (SHIP_H - 14);
    g.blasts.blast(bx, by, 0.4 + g.rand() * 0.5);
    g.gore.chunks(bx, by, 3, METAL, 90, false);
    sfx.explode(0.5);
  }
  if (e.timer > 3.2 && !e.blown) {
    e.blown = true;
    const cx = e.x + SHIP_W / 2;
    const cy = e.y + SHIP_H / 2;
    g.blasts.blast(cx, cy, 2.6);
    g.gore.chunks(cx, cy, 40, METAL, 150, false);
    g.gore.chunks(cx, cy, 16, MOLTEN, 120, false);
    for (let i = 0; i < 30; i++) g.burst(cx - 50 + g.rand() * 100, g.terrain.floorY - 2, 2, 90, SNOWY);
    g.flash = 0.3;
    g.shake = 9;
    sfx.explode(2);
    sfx.horn();
    // The burnt-out wreck stays on the snow, burning, as the front moves on.
    g.spawnEnemy('frostWreck', e.x, e.y, {});
    g.finishBoss(e);
  }
}

// The snow drift it smashes through as it arrives.
function drawDrift(ctx, D, g, snap) {
  const fy = g.terrain.floorY;
  const x0 = snap(D.x);
  for (let i = 0; i < D.w * 2; i++) {
    const fx = i / (D.w * 2);
    const h = Math.round(Math.sin(fx * Math.PI) * D.h * 2 * (0.85 + 0.15 * Math.sin(i * 0.9))) / 2;
    ctx.fillStyle = '#b9c8d6';
    ctx.fillRect(x0 + i * FINE, fy - h, FINE, h + 1);
    ctx.fillStyle = i % 7 < 4 ? '#ffffff' : '#eef3f7';
    ctx.fillRect(x0 + i * FINE, fy - h, FINE, Math.max(FINE, h * 0.55));
  }
}

// The wall of snow ahead of its plough when it charges.
function drawWall(ctx, x, fy) {
  for (let i = 0; i < 28; i++) {
    const fx = i / 28;
    const h = Math.round((Math.sin(fx * Math.PI * 0.9 + 0.2) * 15 + Math.random() * 1.5) * 2) / 2;
    const px = x - 13 + i * FINE;
    ctx.fillStyle = '#b9c8d6';
    ctx.fillRect(px, fy - h, FINE, h);
    ctx.fillStyle = (i + Math.floor(Math.random() * 3)) % 4 ? '#ffffff' : '#d6e1ea';
    ctx.fillRect(px, fy - h, FINE, h * 0.6);
  }
}

// The searchlight's beam: a pale shaft of light widening across the sky,
// with a bright line down its middle.
function drawBeam(ctx, B) {
  const ux = Math.cos(B.ang);
  const uy = Math.sin(B.ang);
  const L = 260;
  ctx.fillStyle = 'rgba(255,246,214,0.22)';
  ctx.beginPath();
  ctx.moveTo(B.x - uy * 0.5, B.y + ux * 0.5);
  ctx.lineTo(B.x + ux * L - uy * 14, B.y + uy * L + ux * 14);
  ctx.lineTo(B.x + ux * L + uy * 14, B.y + uy * L - ux * 14);
  ctx.lineTo(B.x + uy * 0.5, B.y - ux * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,250,232,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(B.x, B.y);
  ctx.lineTo(B.x + ux * L, B.y + uy * L);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = PAL.cream;
  fillDisc(ctx, B.x, B.y, 1.5);
}

// ---------------------------------------------------------------- its helpers
export const FROSTBREAKER_MINIONS = {
  // A burning cinder from its stacks: arcs up off the top of the screen,
  // then falls straight down its column (marked by a dotted line and a ring
  // on the snow). Out of reach; 1 block if it hits you on the way down or
  // bursts within 6 px of you.
  cinder: {
    hp: 1,
    score: 0,
    harmless: true,
    noDrop: true,
    noTarget: true,
    hitTest: () => null,
    shotTest: () => null,
    init(e, g) {
      e.w = 4;
      e.h = 4;
      e.under = true;
      e.up = 0.8;
      e.top = HUD_H - 14;
      e.gy = g.terrain.floorY - 1;
      e.cx = e.sx;
      e.cy = e.sy;
      e.vy = 0;
      e.fall = Math.sqrt((2 * (e.gy - e.top)) / 260);
    },
    update(e, dt, g) {
      if (e.t < e.up) {
        const f = e.t / e.up;
        e.cx = e.sx + (e.tx - e.sx) * f;
        e.cy = e.sy + (e.top - e.sy) * (1 - (1 - f) * (1 - f));
      } else {
        e.cx = e.tx;
        if (e.cy < e.top) e.cy = e.top;
        e.vy += 260 * dt;
        e.cy += e.vy * dt;
      }
      e.x = e.cx - 2;
      e.y = e.cy - 2;
      const live = g.playerVulnerable();
      if (e.t >= e.up && e.cy > HUD_H && live && g.touchesPlayer(e.cx - 1.5, e.cy - 2.5, 3, 5)) {
        e.dead = true;
        g.burst(e.cx, e.cy, 8, 50, EMBER);
        g.hurtPlayer(1, e);
      } else if (e.cy >= e.gy) {
        e.dead = true;
        g.blasts.blast(e.cx, e.gy, 0.35);
        g.burst(e.cx, e.gy - 1, 8, 50, [...EMBER, ...SNOWY]);
        sfx.mortar();
        const p = pc(g);
        if (live && Math.hypot(p.x - e.cx, p.y - e.gy) < 6) g.hurtPlayer(1, e);
      }
    },
    draw(e, ctx, snap, g) {
      const f = Math.min(1, e.t / (e.up + e.fall));
      const lit = f > 0.6 && Math.floor(e.t * 12) % 2 === 0;
      const x = snap(e.tx);
      ctx.fillStyle = lit ? '#f6c36a' : f > 0.6 ? '#e08a3c' : 'rgba(224,138,60,0.65)';
      ctx.beginPath();
      for (let y = HUD_H + 2.5; y < e.gy - 3; y += 3) ctx.rect(x - 0.5, y, 1, 1);
      ctx.fill();
      burstRing(ctx, e.tx, e.gy, 6 + 4 * (1 - f), 2 + 1.5 * (1 - f), lit, snap);
      // The cinder: a glowing ember with a short trail.
      if (e.cy > -4) {
        const hot = Math.floor(e.t * 20) % 2;
        const cx = snap(e.cx);
        const cy = snap(e.cy);
        const up = e.t < e.up ? 1 : -1;
        ctx.fillStyle = EMBER[3];
        ctx.fillRect(cx - 0.5, cy + up * 1.5, 1, 2.5 * up || 1);
        ctx.fillStyle = PAL.ink;
        fillDisc(ctx, cx, cy, 2);
        ctx.fillStyle = hot ? EMBER[1] : EMBER[2];
        fillDisc(ctx, cx, cy, 1.5);
        ctx.fillStyle = EMBER[0];
        ctx.fillRect(cx - 0.5, cy - 0.5, 1, 1);
      }
    },
  },

  // Its burnt-out wreck, left burning on the snow as the front moves on.
  frostWreck: {
    hp: 1,
    score: 0,
    harmless: true,
    noDrop: true,
    noTarget: true,
    hitTest: () => null,
    shotTest: () => null,
    init(e) {
      e.w = SHIP_W;
      e.h = SHIP_H;
      e.under = true;
    },
    update(e, dt, g) {
      e.x -= GROUND_SPEED * dt;
      e.y = g.terrain.floorY - SINK + 3;
      if (g.rand() < 0.5) burning(e, g);
      if (e.x < -SHIP_W - 4) e.dead = true;
    },
    draw(e, ctx, snap) {
      ctx.drawImage(ART.wreck, snap(e.x), snap(e.y));
    },
  },
};

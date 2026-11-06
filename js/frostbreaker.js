import { VIEW_W, HUD_H, PAL } from './config.js?v=0.33.0';
import { sfx } from './audio.js?v=0.33.0';
import { clamp, fillDisc } from './util.js?v=0.33.0';
import { FINE, snapFine, detailCanvas } from './detail.js?v=0.33.0';
import { METAL, MOLTEN } from './gore.js?v=0.33.0';
import { BOMB_DAMAGE } from './weapons.js?v=0.33.0';
import { GROUND_SPEED } from './terrain.js?v=0.33.0';
import { burstRing } from './wolves.js?v=0.33.0';
import { LANDSHIP_PAL, LANDSHIP_POINTS, LANDSHIP_HULL, LANDSHIP_BLADES } from './landshipart.js?v=0.33.0';

// FROSTBREAKER · FLAGSHIP OF THE WHITE FRONT — boss of level 4.
//
// The Iron Wolves' commander's own ship, from the owner's painting: a land
// battleship on four ski runners, in its own olive and cream (not the
// Wolves' gunmetal). It slides on the snow, never flies or walks: back and
// forth on the right, surging at you and charging (further and faster each
// stage).
//
// Its weak point is earned twice: the drill cannon's core sits behind two
// plough blades in a V in front of its muzzle. Shoot a blade off (6 hits)
// to open a gap; even then the core can only be hurt while the cannon spins
// up, fires and a moment after. Small welding drones fly out to bolt a
// broken blade back on (shoot one and the gap stays open until the next);
// fresh blades each stage. Specials obey the same rules: a bomb blows both
// blades off, the laser cuts through one, rockets go for the core once a
// gap is open and the cannon is firing.
//
// Stage 1 (100–66%), one attack at a time: Drill Cannon, Searchlight Guns,
//   Plough Blast. (The drill cannon every other time.)
// Stage 2 (66–33%), its nose armour blown off and holed, attacks in pairs:
//   + Ram Charge, Cinder Rain.
// Stage 3 (33–0%), burning, a mast down, three at once and its blades
//   welded back faster: + Full Steam (and the cannon fires faster), Rocket
//   Sled support.
// Every attack has a warning: an aim line, a light, digging ploughs, a
// horn, glowing stacks, a hiss, blinking bridge lights.

export const SHIP_W = 126;
export const SHIP_H = 39;
const SINK = 38; // its runners' undersides, from its top (they rest on the snow)
const HP = 280;
const BLADE_HP = 6;
const SPEED = [0, 20, 26, 32]; // how fast it slides about
const IDLE = [0, 0.95, 0.8, 0.65];
const HOME_X = VIEW_W - SHIP_W + 4; // (its stern a little off the right edge)
const LEFT_X = [0, 64, 50, 36]; // how far it pushes in
const WELD_WAIT = [0, 2.4, 2.0, 1.4]; // a drone sets out this long after a blade breaks
const WELD_TIME = [0, 2.6, 2.2, 1.7]; // ...and takes this long to bolt it back
const AIM = [0, 0.85, 0.75, 0.6]; // the drill cannon's aim line
const OPEN_AFTER = 1.5; // the core stays open this long after the cannon fires
const STAGGER = [0, 0, 0.8, 0.65]; // between the attacks of a pair or three
// Its rounds of attacks: each stage takes turns between a round with the
// drill cannon (its core opens) and one without.
const ROUNDS = [
  null,
  { drill: [['drill']], other: [['search'], ['plough']] },
  {
    drill: [['drill', 'search'], ['drill', 'cinders'], ['drill', 'plough']],
    other: [['plough', 'search'], ['ram', 'cinders'], ['plough', 'cinders'], ['ram']],
  },
  {
    drill: [['drill', 'steam', 'search'], ['drill', 'cinders', 'rockets'], ['drill', 'plough', 'search'], ['drill', 'steam', 'cinders']],
    other: [['ram', 'rockets', 'cinders'], ['plough', 'steam', 'search'], ['ram', 'cinders'], ['plough', 'rockets', 'search']],
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
const CORE = { front: PT.tip.x - 1, x1: PT.muzzleBack.x, y0: PT.coreTop.y, y1: PT.coreBottom.y };
const SEARCH = { x: PT.bridge.x - 4, y: PT.bridge.y + 1 }; // the searchlight on the bridge roof
const PLOUGH = { x: PT.tip.x - 1, y: PT.tip.y + 9 }; // where the plough throws its ice
const JETS = [PT.engineA.x, PT.engineB.x]; // the steam jets, over its side engines
const JET_W = 9;

let ART = null;
export function buildFrostbreakerArt() {
  if (ART) return ART;
  const hull = LANDSHIP_HULL.map((rows) => picture(rows));
  const blades = LANDSHIP_BLADES.map((B) => {
    const pic = picture(B.rows);
    const rows = new Set(); // (the heights it guards, in the ship's game pixels)
    for (let y = 0; y < pic.height; y++) for (let x = 0; x < pic.width; x++) if (pic.mask[y * pic.width + x]) rows.add(B.y / 2 + y);
    return { pic, flash: picture(B.rows, () => CREAM_RGB), x: B.x / 2, y: B.y / 2, w: pic.width, h: pic.height, mask: pic.mask, rows };
  });
  ART = { hull, wreck: picture(LANDSHIP_HULL[2], charred), blades, drone: droneFrames(), drill: drillFrames() };
  return ART;
}
// For the tests: are its pictures painted yet? And every picture it draws.
export const frostbreakerArtReady = () => !!ART;
export function frostbreakerPictures() {
  const A = buildFrostbreakerArt();
  return [...A.hull, A.wreck, ...A.blades.flatMap((B) => [B.pic, B.flash]), ...A.drone, ...A.drill.flat()];
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
// A welding drone: a little olive pod under a rotor, a lamp, and a torch arm
// reaching right (towards the blade it mends). Two frames: lamp on and off.
function droneFrames() {
  return [0, 1].map((f) => {
    const { canvas, ctx } = detailCanvas(9, 7);
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0.5, 0, 7, 1.5);
    ctx.fillRect(3, 0.5, 2, 2);
    fillDisc(ctx, 4, 4, 3);
    ctx.fillRect(6, 3.5, 3, 1.5);
    ctx.fillStyle = '#4d5659';
    ctx.fillRect(1, 0.5, 6, 0.5);
    ctx.fillRect(3.5, 1, 1, 1.5);
    ctx.fillStyle = '#6f7353';
    fillDisc(ctx, 4, 4, 2.5);
    ctx.fillStyle = '#aeb189';
    fillDisc(ctx, 3.5, 3.5, 1.5);
    ctx.fillStyle = CREAMS[1];
    ctx.fillRect(1.5, 4.5, 5, 0.5);
    ctx.fillStyle = '#727b7e';
    ctx.fillRect(6.5, 4, 2, 0.5);
    ctx.fillStyle = '#c09363';
    ctx.fillRect(8, 3.5, 0.5, 1.5);
    ctx.fillStyle = f ? PAL.amberLight : PAL.redDark;
    ctx.fillRect(2.5, 3, 1, 1);
    return crisp(canvas);
  });
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
    e.dest = surge ? LEFT_X[e.phase] - 8 : LEFT_X[e.phase] + g.rand() * (HOME_X - LEFT_X[e.phase]);
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
  // fires a heavy drill shell along it (2 blocks). Two shells in stage 3 or
  // at full steam. Its core is open from the first glow until a moment
  // after the last shell.
  drill(e, a, dt, g) {
    const fast = e.phase === 3 || e.steamT > 0;
    const aim = e.steamT > 0 ? 0.5 : AIM[e.phase];
    const shells = fast ? 2 : 1;
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
    const warn = 0.55;
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
  // shudders: 0.6/0.55/0.5 s), then it hurls a fan of ice chunks at you (a
  // second fan, offset into the first one's gaps, in stage 3).
  plough(e, a, dt, g) {
    const warn = [0, 0.6, 0.55, 0.5][e.phase];
    const n = [0, 7, 8, 8][e.phase];
    const fans = e.phase === 3 ? 2 : 1;
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
  // stacks (1 s, backing up a little), then it charges right across the
  // screen pushing a wall of snow ahead of it (3 blocks if it hits you: fly
  // over), off the left edge, and comes back in from the right.
  ram(e, a, dt, g) {
    const warn = 1.0;
    const speed = [0, 140, 150, 172][e.phase];
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
      if (e.x < -SHIP_W - 16) {
        a.stage = 'back';
        e.x = VIEW_W + 24;
        e.vx = -60;
      }
      return false;
    }
    // Back in from the right, to where it likes to be.
    slide(e, clamp((HOME_X - 10 - e.x) * 2, -70, 0), dt);
    return e.x <= HOME_X - 8;
  },

  // Cinder rain: its stacks glow and belch smoke (0.7 s), then burning
  // cinders arc up out of them, high off the top of the screen, and fall
  // straight down columns marked by dotted lines and rings on the snow: one
  // over you, the others either side and further out (1 block each).
  cinders(e, a, dt, g) {
    const warn = 0.7;
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
    if (a.k < a.cols.length && a.t >= a.next) {
      const st = at(e, a.k % 2 ? PT.stackB : PT.stackA);
      g.spawnEnemy('cinder', st.x - 2, st.y - 2, { sx: st.x, sy: st.y, tx: a.cols[a.k] });
      g.burst(st.x, st.y, 4, 40, EMBER);
      sfx.mortar();
      a.k++;
      a.next = a.t + 0.12;
    }
    return a.k >= a.cols.length && a.t > a.next + 1.8;
  },

  // Full steam (stage 3): a hiss and puffs of steam from its side engines,
  // with dotted guide lines up both columns (0.8 s), then scalding steam
  // jets straight up from both engines to the top of the screen (1.4 s, 2
  // blocks). It holds still meanwhile, and its cannon fires faster for a
  // few seconds after.
  steam(e, a, dt, g) {
    const warn = 0.8;
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
        e.steamT = 5;
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
    return a.t > warn + blow + 0.3;
  },

  // Rocket Sled support (stage 3): its bridge lights blink as it radios for
  // help (0.6 s), then Rocket Sleds off to the right send a ripple of 5
  // rockets over (the level's own rocket columns: where you're heading,
  // where you are, either side of you and further ahead).
  rockets(e, a, dt, g) {
    const warn = 0.6;
    if (!a.started) {
      a.started = true;
      a.k = 0;
      a.pvx = 0;
      sfx.tick();
    }
    const px = pc(g).x;
    if (a.lpx !== undefined && dt > 0) a.pvx = a.pvx * 0.85 + ((px - a.lpx) / dt) * 0.15;
    a.lpx = px;
    if (a.t < warn) {
      e.radio = 1;
      return false;
    }
    if (!a.cols) {
      const lx = px + a.pvx * 1.2;
      a.cols = [lx, px, px - 20, px + 20, lx + 38].map((x) => clamp(x, 8, 200));
      a.next = warn;
    }
    if (a.k < a.cols.length && a.t >= a.next) {
      const mx = VIEW_W + 6;
      const my = 112 + a.k * 3;
      g.spawnEnemy('wolfRocket', mx - 7, my - 7, { mx, my, tx: a.cols[a.k] });
      sfx.rocket();
      a.k++;
      a.next = a.t + 0.15;
    }
    return a.k >= a.cols.length && a.t > a.next + 1.9;
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
    e.mode = 'enter';
    e.timer = 0;
    e.phase = 1;
    e.blades = LANDSHIP_BLADES.map(() => ({ hp: BLADE_HP, flash: 0, weld: 0, wait: 0, drone: null }));
    e.round = null;
    e.drillNext = true;
    e.idle = 1;
    e.steamT = 0;
    e.sink = 0;
    e.recoil = 0;
    e.hitBlade = -1;
    // The snow drift it smashes through as it arrives.
    e.drift = { x: VIEW_W - 34, w: 30, h: 14 };
  },

  update(e, dt, g) {
    e.timer += dt;
    e.coreOpen = false;
    e.aim = null;
    e.beamA = null;
    e.dig = 0;
    e.glowStacks = 0;
    e.jets = 0;
    e.steamGuide = 0;
    e.radio = 0;
    e.charging = false;
    e.wall = 0;
    e.hold = 0;
    e.shudder = 0;
    e.steamT = Math.max(0, e.steamT - dt);
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
        welding(e, dt, g);
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
        // Fresh blades are welded on while it's untouchable and furious. It
        // doesn't attack again until it has finished shouting.
        e.shudder = 1.5;
        slide(e, clamp((HOME_X - 6 - e.x) * 2, -40, 40), dt);
        for (const B of e.blades) B.weld = Math.min(1, e.timer / 1.8);
        if (e.timer > 2 && g.bossMayAttack(e)) {
          for (const B of e.blades) {
            B.hp = BLADE_HP;
            B.weld = 0;
          }
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
      const sx = e.x + [12, 50, 95][Math.floor(g.rand() * 3)] + g.rand() * 20;
      if (sx > 0 && sx < VIEW_W) g.burst(sx, g.terrain.floorY - 1, 1, 30, SNOWY);
    }
  },

  aimPoint(e) {
    return at(e, PT.muzzle);
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
  // off (a shot gets through only at the gap's height).
  isVulnerable(e) {
    return e.mode === 'fight' && e.coreOpen && gap(e);
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
    e.steamT = 0;
    if (offScreen(e)) e.x = HOME_X;
    // Its drones are blown away, and every blade left is blown off (fresh
    // ones are welded on during the shouting).
    for (const B of e.blades) {
      if (B.drone && !B.drone.dead) B.drone.dead = true;
      B.drone = null;
      B.hp = 0;
      B.weld = 0;
    }
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
    // Its guard blades (rebuilding ones drawn growing from the top).
    e.blades.forEach((B, k) => {
      const b = A.blades[k];
      const img = B.flash > 0 ? b.flash : b.pic;
      if (bladeUp(B)) ctx.drawImage(img, x + b.x, y + b.y);
      else if (B.weld > 0) {
        const h = Math.max(1, Math.round(b.h * B.weld));
        ctx.drawImage(img, 0, 0, b.w, h, x + b.x, y + b.y, b.w, h);
      }
    });
    // Glowing stack tops (cinders or a charge coming), blinking bridge
    // lights (rockets called in).
    const blink = Math.floor(g.time * 12) % 2 === 0;
    if (e.glowStacks && blink) {
      ctx.fillStyle = EMBER[1];
      for (const p of [PT.stackA, PT.stackB]) ctx.fillRect(x + p.x - 2, y + p.y, 4, 1);
    }
    if (e.radio && blink) {
      ctx.fillStyle = PAL.red;
      for (let k = 0; k < 9; k++) ctx.fillRect(x + PT.lights.x + k * 3.5, y + PT.lights.y - 0.5, 2, 1.5);
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
  const mask = ART.hull[look(e)].mask;
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
      const guarded = e.blades.some((B, k) => bladeUp(B) && ART.blades[k].rows.has(yy));
      if (!guarded && cx >= CORE.front && cx < CORE.x1 && r >= CORE.y0 && r < CORE.y1 && (mask[yy * SHIP_W + cx] || cx >= PT.muzzle.x - 2)) {
        if (!shots) return 'hit';
        e.hitBlade = -1;
        return e.mode === 'fight' && e.coreOpen ? 'hit' : 'block';
      }
      if (mask[yy * SHIP_W + cx]) return shots ? 'block' : 'hit';
    }
  }
  return null;
}

// Its next round of attacks: with the drill cannon every other time.
function startRound(e, g) {
  const R = ROUNDS[e.phase];
  const pool = e.drillNext ? R.drill : R.other;
  let pick = pool[Math.floor(g.rand() * pool.length)];
  if (pool.length > 1 && pick === e.lastRound) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
  e.lastRound = pick;
  e.drillNext = !e.drillNext;
  e.round = pick.map((name, i) => ({ name, t: 0, wait: i * STAGGER[e.phase], done: false }));
  e.dest = undefined;
}

// A blade is blown off (+50 points when you do it); a drone will come to
// weld it back.
function breakBlade(e, k, g) {
  const B = e.blades[k];
  const b = ART.blades[k];
  B.hp = 0;
  B.weld = 0;
  B.wait = WELD_WAIT[e.phase];
  const px = e.x + b.x + b.w / 2;
  const py = e.y + b.y + b.h / 2;
  g.blasts.blast(px, py, 0.4);
  g.gore.chunks(px, py, 4, CREAMS, 90, false);
  sfx.explode(0.4);
  g.score += 50;
  g.popups.push({ x: px - 4, y: py - 8, text: '+50', t: 0.8 });
}

// Welding drones: one sets out for each broken blade (not while it's off
// screen charging), flies to it and bolts it back on.
function welding(e, dt, g) {
  e.blades.forEach((B, k) => {
    if (bladeUp(B) || (B.drone && !B.drone.dead)) return;
    B.drone = null;
    if (B.weld > 0) B.weld = Math.max(0, B.weld - dt * 0.5); // (a half-done weld falls apart)
    if (offScreen(e)) return;
    B.wait -= dt;
    if (B.wait > 0) return;
    const s = at(e, PT.hullTop);
    B.drone = g.spawnEnemy('weldDrone', s.x - 30, s.y - 4, { owner: e, k });
    sfx.tick();
  });
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
  // A welding drone: flies from its deck to a broken blade and bolts it
  // back on (sparks fly). Shoot it (2 hits) and the gap stays open until the
  // next one comes. It doesn't fire; touching it costs 1.
  weldDrone: {
    hp: 2,
    score: 30,
    ram: 1,
    noDrop: true,
    explodeSize: 0.4,
    gore: { metal: 3 },
    init(e) {
      e.w = 9;
      e.h = 7;
      e.state = 'fly';
    },
    update(e, dt, g) {
      const o = e.owner;
      if (!o || o.dead || o.mode !== 'fight' || o.charging || offScreen(o) || e.state === 'home') {
        // Its job's done (or its ship is busy charging): back up onto the
        // deck. (A blade it hadn't finished gets another drone later.)
        e.state = 'home';
        if (o && o.blades && o.blades[e.k].drone === e) o.blades[e.k].drone = null;
        e.x += 40 * dt;
        e.y -= 30 * dt;
        if (e.y < HUD_H - 10 || e.x > VIEW_W + 10) e.dead = true;
        return;
      }
      const B = o.blades[e.k];
      const b = ART.blades[e.k];
      const tx = o.x + b.x - e.w + 1;
      const ty = o.y + b.y + b.h / 2 - e.h / 2;
      if (e.state === 'fly') {
        const dx = tx - e.x;
        const dy = ty - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const s = Math.min(d, 75 * dt);
        e.x += (dx / d) * s;
        e.y += (dy / d) * s;
        if (d < 1.5) e.state = 'weld';
        return;
      }
      e.x = tx;
      e.y = ty;
      B.weld = Math.min(1, B.weld + dt / WELD_TIME[o.phase]);
      if (g.rand() < 0.6) g.burst(e.x + e.w, e.y + e.h / 2, 1, 50, [PAL.cream, PAL.amberLight, '#9fd2ff']);
      if (B.weld >= 1) {
        B.hp = BLADE_HP;
        B.weld = 0;
        B.drone = null;
        sfx.block();
        e.state = 'home';
      }
    },
    onDeath(e) {
      const o = e.owner;
      if (!o || o.dead) return;
      const B = o.blades[e.k];
      if (B && B.drone === e && !(B.hp > 0)) {
        B.drone = null;
        B.wait = WELD_WAIT[o.phase];
      }
    },
    draw(e, ctx, snap, g) {
      const f = e.state === 'weld' ? Math.floor(g.time * 16) % 2 : Math.floor(g.time * 4) % 2;
      ctx.drawImage(ART.drone[f], snap(e.x), snap(e.y));
      if (e.flash > 0) {
        ctx.fillStyle = PAL.cream;
        fillDisc(ctx, snap(e.x) + 4, snap(e.y) + 4, 2);
      }
    },
  },

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

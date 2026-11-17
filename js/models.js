import { Mesh, rockMesh, renderModel, turn, V } from './model.js?v=0.38.2';
import { buildShip, MAT as SHIP_MAT } from './shipmodel.js?v=0.38.2';

// The new look's models (the look sample: your ship and level 1's enemies).
// Each is built in "game pixels" (one unit = one game pixel), nose towards
// +x, y up, z towards the camera; enemies are flipped to face left when
// drawn. Models with moving parts take the part's angle, so each frame of
// an animation is the same model with something turned a little further.

// ---- materials: five shades each, dark to light ----
const SHARED = {
  // cargo pods: plain steel with brass straps
  crate: ['#1a2032', '#333c56', '#566284', '#8792b4', '#c2cbe0'],
  brass: ['#4a2e1a', '#8a5a2e', '#c98f4a', '#e3a857', '#f2cf8a'],
  window: ['#0b0d18', '#0b0d18', '#0b0d18', '#0b0d18', '#0b0d18'],
  // asteroids
  rock: ['#231b20', '#40312f', '#66503f', '#94775a', '#c4a57c'],
};
const TILT = 0.38; // every craft is seen a little from above

// ---- the models: level 1's enemies, the "Crimson Blades" (the owner's pick
// of six looks, after v0.38.1) ----
// "Crimson Blades": the invaders' strike wing. Knife shapes: diamond hulls
// with a sharp ridge, crimson armour over gunmetal, cream blade edges,
// amber-lit glass.
export const C_MATS = {
  hull: ['#2a0c14', '#5a1620', '#8f2630', '#c24a44', '#eb8a70'],
  dark: ['#101320', '#1e2334', '#333a52', '#515a78', '#7c86a6'],
  mech: ['#12141c', '#262832', '#40434f', '#666974', '#989ba2'],
  glass: ['#3a2410', '#7a4a1c', '#c0802e', '#eab25a', '#fbe2a4'],
  accent: ['#5a5248', '#8a8070', '#b8ad98', '#dccfb8', '#f6ecd8'],
  glow: ['#f2864e', '#ffb46a', '#ffd9a0', '#fff1cf', '#fff8e6'],
  eye: ['#e3a857', '#f2cf8a', '#f6dcae', '#fff1cf', '#fff8e6'],
  flesh: ['#1c1028', '#3a2150', '#5f3a7a', '#8c5ea4', '#bd92cc'],
  wing: ['#170d22', '#301b44', '#4e2f6a', '#754c92', '#a478b8'],
  bone: ['#544540', '#857263', '#b5a18a', '#dccbb0', '#f4e9d2'],
};
const sides = (r, i, up) => 'b' + r + (up ? 'u' : 'd');

export function daggerPod() {
  const m = new Mesh();
  m.lathe([[-4.6, 0.9, 1.0], [-3.2, 2.6, 2.4], [0.4, 2.9, 2.7], [3.0, 1.7, 1.5], [5.0, 0.15, 0.15]], 4, (r) => (r === 0 ? 'dark' : 'hull'), sides, { pow: 1 });
  m.lathe([[0.0, 0.1, 0.1, 2.7], [1.2, 0.95, 0.95, 2.35], [3.0, 0.55, 0.65, 1.7], [3.9, 0.1, 0.1, 1.2]], 4, 'glass', 'canopy', { pow: 1 });
  for (const s of [-1, 1]) m.plate([-2.6, -0.2, 2.1 * s], [1.4, -0.2, 2.3 * s], [4.8, -1.0, 6.3 * s], [2.6, -1.0, 6.5 * s], [0, 0.45, 0], 'hull', 'blade' + s, 'accent');
  m.plate([-4.3, 2.1, -0.25], [-1.0, 2.6, -0.25], [-3.3, 5.2, -0.25], [-5.0, 5.2, -0.25], [0, 0, 0.5], 'dark', 'fin', 'accent');
  m.lathe([[1.4, 0.45, 0.45, -2.3], [5.7, 0.38, 0.38, -2.3]], 6, 'mech', 'gun');
  m.ball([-4.7, 0, 0], 1.05, 'glow', 'core', { n: 6, m: 3 });
  return m;
}

export function razorRay(flap = 0.6) {
  const m = new Mesh();
  m.lathe([[-3.4, 0.4, 0.5], [-2.0, 1.0, 1.3], [0.5, 1.45, 1.9], [3.0, 1.2, 1.5], [5.0, 0.3, 0.4]], 6, (r, i, up) => (up ? 'flesh' : 'wing'), (r, i, up) => 'body' + (up ? 'u' : 'd'));
  for (const s of [-1, 1]) {
    m.ball([3.7, 0.7, 0.9 * s], 0.55, 'eye', 'eye' + s, { n: 6, m: 3 });
    const lift = Math.sin(flap) * 0.5;
    const up = (p, k) => [p[0], p[1] + Math.abs(p[2]) * lift * k, p[2]];
    // long, narrow wings swept hard back, like a pair of sickles
    const r0 = [-0.6, 0.2, 1.4 * s];
    const r1 = [3.0, 0.2, 1.4 * s];
    const m0 = up([-3.0, 0.2, 4.6 * s], 0.5);
    const m1 = up([0.2, 0.2, 4.5 * s], 0.5);
    const t0 = up([-6.4, 0.2, 7.9 * s], 1);
    const t1 = up([-4.9, 0.2, 7.6 * s], 1);
    m.plate(r0, r1, m1, m0, [0, 0.3, 0], 'wing', 'wingIn' + s, 'flesh');
    m.plate(m0, m1, t1, t0, [0, 0.25, 0], 'wing', 'wingOut' + s, 'flesh');
    // a bone blade along each leading edge
    m.plate(V.add(r1, [0, 0.3, 0]), V.add(r1, [0.5, 0.3, 0]), V.add(m1, [0.5, 0.3, 0]), V.add(m1, [0, 0.3, 0]), [0, 0.15, 0], 'bone', 'edgeIn' + s);
    m.plate(V.add(m1, [0, 0.25, 0]), V.add(m1, [0.5, 0.25, 0]), V.add(t1, [0.4, 0.25, 0]), V.add(t1, [0, 0.25, 0]), [0, 0.15, 0], 'bone', 'edgeOut' + s);
    // a forked tail
    m.plate([-3.2, -0.2, 0.1 * s], [-3.2, 0.2, 0.5 * s], [-7.0, 0.1, 1.6 * s], [-7.0, -0.1, 1.3 * s], [0, 0.3, 0], 'flesh', 'tail' + s);
  }
  return m;
}

export function stiletto(roll = 0.3) {
  const m = new Mesh();
  m.lathe([[-4.8, 0.7, 0.7], [-3.6, 1.25, 1.25], [1.0, 1.0, 1.0], [5.2, 0.1, 0.1]], 4, (r) => (r === 1 ? 'hull' : 'dark'), sides, { pow: 1 });
  m.ball([5.0, 0, 0], 0.5, 'glow', 'tip', { n: 6, m: 3 });
  m.ball([-4.9, 0, 0], 0.75, 'glow', 'core', { n: 6, m: 3 });
  for (let f = 0; f < 3; f++) {
    const blade = new Mesh().plate([-4.8, 1.0, -0.15], [-1.4, 1.0, -0.15], [-4.2, 4.0, -0.15], [-5.9, 4.0, -0.15], [0, 0, 0.3], 'hull', 'f' + f, 'accent');
    m.add(blade, (p) => turn(p, 'x', roll + (f * Math.PI * 2) / 3));
  }
  return m;
}

export function cleaver(recoil = 0) {
  const m = new Mesh();
  m.lathe([[-6.4, 1.6, 2.6], [-5.0, 3.2, 4.6], [-0.5, 3.0, 4.4], [3.5, 1.6, 3.2], [6.2, 0.4, 1.6]], 6, (r) => (r === 1 ? 'dark' : 'hull'), sides, { pow: 1 });
  m.box([1.0, 1.9, -1.7], [3.7, 2.5, 1.7], 'glass', 'slit');
  m.plate([-5.6, 3.0, -0.3], [-0.6, 3.0, -0.3], [-3.6, 6.8, -0.3], [-6.6, 6.8, -0.3], [0, 0, 0.6], 'hull', 'tail', 'accent');
  for (const s of [-1, 1]) {
    m.box([1.4 - recoil, -1.7, 3.4 * s - 0.7], [8.3 - recoil, -0.5, 3.4 * s + 0.7], 'dark', 'prong' + s);
    m.ball([8.4 - recoil, -1.1, 3.4 * s], 0.7, 'glow', 'tip' + s, { n: 6, m: 3 });
    m.plate([-4.6, 0, 4.3 * s], [0.6, 0, 4.1 * s], [-3.0, -0.7, 7.5 * s], [-6.0, -0.7, 7.5 * s], [0, 0.45, 0], 'hull', 'wing' + s, 'accent');
    m.box([-6.9, -0.8, 2.2 * s - 1.1], [-5.2, 1.2, 2.2 * s + 1.1], 'mech', 'eng' + s);
    m.ball([-6.9, 0.2, 2.2 * s], 1.0, 'glow', 'burn' + s, { n: 6, m: 3 });
  }
  return m;
}

export function lance() {
  const m = new Mesh();
  m.lathe([[-6.6, 0.8, 1.0], [-5.2, 1.9, 2.2], [-1.5, 1.8, 2.0], [0.6, 0.9, 1.0]], 4, (r) => (r === 0 ? 'dark' : 'hull'), sides, { pow: 1 });
  m.box([-1.2, 0.35, -0.35], [7.2, 0.95, 0.35], 'dark', 'rail1');
  m.box([-1.2, -1.35, -0.35], [7.2, -0.75, 0.35], 'dark', 'rail2');
  m.box([5.6, -0.75, -0.3], [6.6, 0.35, 0.3], 'glow', 'charge');
  m.box([-3.6, 1.7, -0.4], [-1.0, 2.4, 0.4], 'mech', 'scope');
  m.ball([-0.9, 2.05, 0], 0.5, 'glow', 'sight', { n: 6, m: 3 });
  m.ball([-6.7, 0, 0], 0.8, 'glow', 'core', { n: 6, m: 3 });
  for (const s of [-1, 1]) m.plate([-6.2, 0.1, 1.6 * s], [-3.0, 0.1, 1.9 * s], [-5.4, -0.5, 4.6 * s], [-7.2, -0.5, 4.6 * s], [0, 0.4, 0], 'hull', 'fin' + s, 'accent');
  return m;
}

export function shuriken(spin = 0.2) {
  const m = new Mesh();
  m.ball([0, 0, 0], 2.2, 'dark', 'hub', { n: 10, m: 5, squash: [1, 1, 0.6] });
  m.ball([0, 0, 1.0], 1.05, 'glow', 'core', { n: 8, m: 3 });
  for (let i = 0; i < 4; i++) {
    const b = new Mesh();
    b.plate([1.5, -0.9, -0.3], [1.5, 0.9, -0.3], [4.4, 1.7, -0.3], [3.5, -0.5, -0.3], [0, 0, 0.6], 'hull', 'b' + i, 'accent');
    b.plate([3.5, -0.5, -0.3], [4.4, 1.7, -0.3], [5.4, 3.5, -0.3], [5.1, 1.3, -0.3], [0, 0, 0.6], 'hull', 'h' + i, 'accent');
    m.add(b, (p) => turn(p, 'z', spin + (i * Math.PI) / 2));
  }
  return m;
}

const INVADER = { ...C_MATS, ...SHARED };
// Level 1's light: the amber sun is up and to the right, a little behind.
export const BELT_LIGHT = {
  mats: INVADER,
  light: [0.3, 0.62, 0.72],
  rim: [0.8, 0.5, -0.33],
  rimColor: '#ffcf8a',
  flat: ['glow', 'eye', 'window'],
  ink: '#090a14',
};
const SHIP_LOOK = { ...BELT_LIGHT, mats: { ...SHIP_MAT, glow: SHIP_MAT.glow }, light: [0.2, 0.66, 0.72] };
const ROCK_LOOK = { ...BELT_LIGHT, light: [0.55, 0.7, 0.45], faceted: true, dither: 0.5, floor: 0, base: 0.4, gain: 4.4 };


// A cargo pod: a riveted steel capsule with brass straps and a window for
// its light.
function cargo() {
  const m = new Mesh();
  m.lathe([[-6.2, 2.2, 2.2], [-5.4, 3.5, 3.5], [5.4, 3.5, 3.5], [6.2, 2.2, 2.2]], 8, 'crate', (r, i) => 'c' + r + i, { pow: 0.45 });
  for (const x of [-3.9, 3.1]) m.lathe([[x, 3.75, 3.75], [x + 0.9, 3.75, 3.75]], 8, 'brass', 'strap' + x, { pow: 0.45, caps: false });
  for (const s of [-1, 1]) m.box([-2.9, -0.7, 3.4 * s], [2.9, 1.3, 3.75 * s], 'window', 'window' + s);
  m.box([-6.9, -0.6, -0.6], [-6.1, 0.6, 0.6], 'mech', 'hitch');
  return m;
}

// ---- baking: each model drawn once per frame of its animation ----
// k: how fine (2 = today's double detail, 4 = twice as fine again).
// Every entry: { w, h } of the game's own sprite (the enemy's size, which
// never changes), and the frames drawn on a slightly bigger canvas centred
// on it (pad pixels each side), so wings and fins can reach past the box.
//
// A set of frames paints each picture the first time it's asked for
// (get(i)), and warm() paints the ones not asked for yet a few at a time,
// in the order a level will need them: painting hundreds of pictures the
// moment an enemy first appears or dies made the game stutter (v0.38.1).
export class Frames {
  constructor(n, make) {
    this.length = n;
    this.make = make;
    this.pics = new Array(n);
  }

  get(i) {
    return this.pics[i] || (this.pics[i] = this.make(i));
  }

  all() {
    return Array.from({ length: this.length }, (_, i) => this.get(i));
  }
}
const baked = new Map();
const frame = (mesh, k, w, h, pad, spin, opts = {}) => {
  const view = { w: w + pad * 2, h: h + pad * 2, k, scale: opts.scale || 1, cx: (w + pad * 2) / 2 + (opts.dx || 0), cy: (h + pad * 2) / 2 + (opts.dy || 0), spin, flip: opts.flip !== false };
  return renderModel(mesh, view, opts.look || BELT_LIGHT);
};
// (a mesh built once, the first time a frame needs it)
const once = (build) => {
  let m = null;
  return () => m || (m = build());
};

const BAKERS = {
  // Your ship: seven frames of bank, from diving (0) to climbing (6).
  player: (k) => {
    const mesh = once(() => {
      const m = new Mesh();
      m.tris = buildShip();
      return m;
    });
    return { pad: 4, frames: new Frames(7, (i) => frame(mesh(), k, 18, 11, 4, [['x', TILT + (i - 3) * 0.17]], { scale: 0.84, flip: false, look: SHIP_LOOK, dx: 0.3, dy: 0.3 })) };
  },
  // The Crimson Blades. A dagger pod sways as it flies (six frames of a
  // gentle roll), a razor ray beats its wings, a stiletto spins on its
  // three fins, a cleaver banks and kicks back as it fires, a shuriken
  // turns.
  drifter: (k) => ({ pad: 3, frames: new Frames(6, (i) => frame(daggerPod(), k, 10, 8, 3, [['x', TILT + Math.sin((i / 6) * Math.PI * 2) * 0.16]], { scale: 0.98 })) }),
  weaver: (k) => ({ pad: 4, frames: new Frames(10, (i) => frame(razorRay((i / 10) * Math.PI * 2), k, 11, 9, 4, [['x', 0.95]], { scale: 0.9 })) }),
  seeker: (k) => ({ pad: 3, frames: new Frames(6, (i) => frame(stiletto((i / 6) * ((Math.PI * 2) / 3)), k, 10, 7, 3, [['x', TILT]], { scale: 1.0 })) }),
  // The gunship: five frames of bank, each with its prongs out and kicked back.
  gunner: (k) => ({ pad: 4, frames: new Frames(10, (j) => frame(cleaver(j < 5 ? 0 : 1.4), k, 14, 11, 4, [['x', TILT + ((j % 5) - 2) * 0.2]], { scale: 0.92, dy: 0.6 })) }),
  sniper: (k) => ({ pad: 3, frames: new Frames(1, () => frame(lance(), k, 14, 7, 3, [['x', TILT]], { scale: 0.98 })) }),
  spinner: (k) => ({ pad: 2, frames: new Frames(8, (i) => frame(shuriken((i / 8) * (Math.PI / 2)), k, 11, 11, 2, [['x', 0.25]], { scale: 0.93, flip: false })) }),
  carrier: (k) => ({ pad: 2, frames: new Frames(1, () => frame(cargo(), k, 13, 9, 2, [['x', 0.3]], { scale: 0.98 })) }),
};

// Tumbling asteroids: `n` frames of a rock turning about a tilted axis.
function rockFrames(k, seed, size, r, n) {
  const mesh = once(() => rockMesh(seed, r, size > 20 ? 2 : 1));
  const axis = (seed * 0.77) % 1.2;
  return new Frames(n, (i) => renderModel(mesh(), { w: size, h: size, k, scale: 1, cx: size / 2, cy: size / 2, spin: [['z', (i / n) * Math.PI * 2], ['x', axis], ['y', axis * 0.6]] }, ROCK_LOOK));
}
BAKERS.rockBig = (k) => ({ pad: 0, sets: [11, 23, 37].map((s) => rockFrames(k, s, 29, 9.9, 24)) });
BAKERS.rockSmall = (k) => ({ pad: 0, sets: [3, 14, 29, 41].map((s) => rockFrames(k, s, 17, 5.7, 16)) });
BAKERS.rockBit = (k) => ({ pad: 0, sets: [5, 9, 13].map((s) => rockFrames(k, s, 9, 3.3, 12)) });

// A wreck: a model (or just some of its parts) tumbling, in `n` frames.
const WRECKS = {
  drifter: () => [daggerPod()],
  seeker: () => [stiletto()],
  gunner: () => [cleaver(0).only((p) => /^b[3-4]|prong|tip|slit/.test(p)), cleaver(0).only((p) => /^b[0-2]|tail|wing|eng|burn/.test(p))],
  weaver: () => [razorRay(1.2).only((p) => /wing(In|Out)-1|edge(In|Out)-1/.test(p)), razorRay(1.2).only((p) => /wing(In|Out)1|edge(In|Out)1/.test(p)), razorRay(0).only((p) => /body|eye|tail/.test(p))],
  carrier: () => [cargo()],
  sniper: () => [lance()],
  spinner: () => [shuriken(0).only((p) => /hub|core|[bh][02]/.test(p)), shuriken(0).only((p) => /[bh][13]/.test(p))],
  player: () => {
    const m = new Mesh();
    m.tris = buildShip();
    return [m.only((p) => /wingL|gun-1/.test(p)), m.only((p) => /wingR|gun1/.test(p)), m.only((p) => !/wing|gun/.test(p))];
  },
};
const char = (mats) => Object.fromEntries(Object.entries(mats).map(([name, ramp]) => [name, name === 'glow' || name === 'eye' ? ['#3a1418', '#6a2222', '#9e2f2f', '#c8553f', '#f2864e'] : ramp.map((c, i) => ramp[Math.max(0, i - 1)])]));
const CHARRED = { invader: char(INVADER), ship: char(SHIP_MAT) };
function wreckFrames(name, k, n = 12) {
  const size = name === 'gunner' || name === 'player' ? 22 : 16;
  const parts = once(() => WRECKS[name]().map((mesh) => {
    // (each piece turns about its own middle)
    let c = [0, 0, 0];
    for (const t of mesh.tris) c = V.add(c, V.mul(V.add(V.add(t[0], t[1]), t[2]), 1 / 3));
    c = V.mul(c, 1 / Math.max(1, mesh.tris.length));
    return new Mesh().add(mesh, (p) => V.sub(p, c));
  }));
  const count = { drifter: 1, seeker: 1, gunner: 2, weaver: 3, carrier: 1, sniper: 1, spinner: 2, player: 3 }[name];
  const looks = { ...BELT_LIGHT, mats: name === 'player' ? CHARRED.ship : name === 'weaver' ? INVADER : CHARRED.invader, flat: name === 'weaver' ? ['eye'] : [] };
  const out = [];
  for (let pi = 0; pi < count; pi++) {
    out.push({ size, frames: new Frames(n, (i) => renderModel(parts()[pi], { w: size, h: size, k, scale: name === 'player' ? 0.84 : 0.95, cx: size / 2, cy: size / 2, spin: [['x', TILT + pi], ['z', (i / n) * Math.PI * 2]], flip: name !== 'player' }, looks)) });
  }
  return out;
}

// The baked pictures for a model at fineness k (made the first time they're
// asked for, then kept).
export function art(name, k) {
  let set = baked.get(k);
  if (!set) baked.set(k, (set = {}));
  return set[name] || (set[name] = BAKERS[name](k));
}
export function wreckArt(name, k) {
  const key = 'wreck:' + name + '@' + k;
  if (!baked.has(key)) baked.set(key, wreckFrames(name, k));
  return baked.get(key);
}
// Paints pictures that will be needed soon, for at most `ms` milliseconds
// (always at least one), in the order level 1 brings things on. Call it
// once a frame; returns how many are still to paint.
const WARM_ORDER = ['player', 'drifter', 'weaver', '!drifter', '!weaver', 'rockSmall', 'rockBit', 'seeker', '!seeker', 'gunner', '!gunner', 'carrier', '!carrier', 'rockBig', 'sniper', '!sniper', 'spinner', '!spinner', '!player'];
const queues = new Map();
export function warm(k, ms) {
  let q = queues.get(k);
  if (!q) {
    q = { list: [], at: 0 };
    for (const name of WARM_ORDER) {
      const sets = name[0] === '!' ? wreckArt(name.slice(1), k).map((p) => p.frames) : art(name, k).sets || [art(name, k).frames];
      for (const f of sets) for (let i = 0; i < f.length; i++) q.list.push(f, i);
    }
    queues.set(k, q);
  }
  if (q.at >= q.list.length) return 0;
  const until = performance.now() + ms;
  do {
    q.list[q.at].get(q.list[q.at + 1]);
    q.at += 2;
  } while (q.at < q.list.length && performance.now() < until);
  return (q.list.length - q.at) / 2;
}
export const MODEL_NAMES = Object.keys(BAKERS);
export const hasModel = (name) => !!BAKERS[name];
export const hasWreck = (name) => !!WRECKS[name];

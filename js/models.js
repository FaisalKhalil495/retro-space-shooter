import { Mesh, rockMesh, renderModel, turn, V } from './model.js?v=0.37.0';
import { buildShip, MAT as SHIP_MAT } from './shipmodel.js?v=0.37.0';

// The new look's models (the look sample: your ship and level 1's enemies).
// Each is built in "game pixels" (one unit = one game pixel), nose towards
// +x, y up, z towards the camera; enemies are flipped to face left when
// drawn. Models with moving parts take the part's angle, so each frame of
// an animation is the same model with something turned a little further.

// ---- materials: five shades each, dark to light ----
const INVADER = {
  // the invaders' ships: slate-violet armour, dark machinery, red-lit glass
  hull: ['#211f3a', '#3d3b64', '#62608f', '#9391bd', '#cdcee9'],
  dark: ['#141528', '#272a44', '#3d415e', '#5a5f7e', '#8086a4'],
  mech: ['#12141c', '#262832', '#40434f', '#666974', '#989ba2'],
  glass: ['#2a0d12', '#5c1d20', '#9e3328', '#d9603a', '#f8b074'],
  accent: ['#3a1418', '#6a2222', '#9e2f2f', '#c8553f', '#e8926a'],
  glow: ['#cf5136', '#f2864e', '#ffb46a', '#ffd9a0', '#fff1cf'],
  eye: ['#e3a857', '#f2cf8a', '#f6dcae', '#fff1cf', '#fff8e6'],
  // the manta (a living thing)
  flesh: ['#2c0f18', '#5a1f28', '#8c3436', '#bb564a', '#e09480'],
  wing: ['#210c15', '#4a1a22', '#742a2e', '#a04540', '#c9776a'],
  bone: ['#544540', '#857263', '#b5a18a', '#dccbb0', '#f4e9d2'],
  // cargo pods: plain steel with brass straps
  crate: ['#1a2032', '#333c56', '#566284', '#8792b4', '#c2cbe0'],
  brass: ['#4a2e1a', '#8a5a2e', '#c98f4a', '#e3a857', '#f2cf8a'],
  window: ['#0b0d18', '#0b0d18', '#0b0d18', '#0b0d18', '#0b0d18'],
  // asteroids
  rock: ['#231b20', '#40312f', '#66503f', '#94775a', '#c4a57c'],
};
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

const TILT = 0.38; // every craft is seen a little from above

// ---- the models ----
// A pod: a round cockpit with a red-lit canopy, swept fins, a gun under its
// nose and a three-bladed stabiliser spinning behind it.
function pod(spin = 0) {
  const m = new Mesh();
  m.lathe([[-4.2, 1.5, 1.6], [-3.2, 2.7, 2.9], [-0.8, 3.3, 3.6], [1.8, 3.1, 3.3], [3.6, 2.0, 2.2], [4.6, 0.8, 0.9]], 10,
    (r) => (r === 1 ? 'dark' : 'hull'), (r, i, up) => 'b' + r + (up ? 'u' : 'd'));
  // (a red-lit canopy bulging from its front, a visor lamp under it)
  m.ball([1.5, 1.3, 0], 2.9, 'glass', 'canopy', { n: 10, m: 5, squash: [1.15, 0.95, 0.95], to: Math.PI * 0.62 });
  m.box([3.6, -0.5, -1.2], [4.5, 0.1, 1.2], 'glow', 'visor');
  m.lathe([[-1.2, 3.45, 3.75], [-0.4, 3.45, 3.75]], 10, 'accent', 'band', { caps: false });
  for (const s of [-1, 1]) {
    m.plate([-3.4, -0.6, 2.6 * s], [1.2, -0.6, 2.9 * s], [-2.4, -1.6, 6.6 * s], [-4.6, -1.6, 6.6 * s], [0, 0.5, 0], 'hull', 'fin' + s, 'accent');
    m.box([-4.2, -1.9, 5.9 * s], [-2.2, -1.0, 7.0 * s], 'accent', 'tip' + s);
  }
  m.lathe([[1.5, 0.5, 0.5, -3.0], [5.8, 0.42, 0.42, -3.0]], 6, 'mech', 'gun');
  m.lathe([[-5.1, 1.4, 1.4], [-4.1, 1.8, 1.8]], 8, 'mech', 'nozzle', { caps: false });
  m.ball([-4.8, 0, 0], 1.15, 'glow', 'core', { n: 6, m: 3 });
  for (let b = 0; b < 3; b++) {
    const a = spin + (b * Math.PI * 2) / 3;
    const blade = new Mesh().plate([-5.0, 1.7, -0.7], [-4.0, 1.7, 0.7], [-4.2, 5.0, 1.1], [-5.2, 5.0, -0.5], [0.3, 0, 0], 'hull', 'blade' + b, 'accent');
    m.add(blade, (p) => turn(p, 'x', a));
  }
  return m;
}

// A manta: a living thing, all muscle and ribbed wings that beat.
function manta(flap = 0, sway = 0) {
  const m = new Mesh();
  m.lathe([[-3.6, 0.5, 0.6], [-2.2, 1.3, 1.7], [0.2, 1.8, 2.4], [2.6, 1.6, 2.1], [4.2, 1.0, 1.4], [5.0, 0.35, 0.6]], 8, (r, i, up) => (up ? 'flesh' : 'wing'), (r, i, up) => 'body' + (up ? 'u' : 'd'));
  for (const s of [-1, 1]) {
    m.ball([4.0, 0.75, 1.0 * s], 0.62, 'eye', 'eye' + s, { n: 6, m: 3 });
    // A wing in two joints: the outer half beats further than the inner.
    const lift = Math.sin(flap) * 0.55;
    const tipLift = Math.sin(flap - 0.7) * 0.95;
    const hinge = (p, ang, zr) => {
      const q = [p[0], p[1], p[2] - zr * s];
      const t = turn(q, 'x', -ang * s);
      return [t[0], t[1], t[2] + zr * s];
    };
    const r0 = [-2.4, 0.3, 1.8 * s];
    const r1 = [3.2, 0.3, 1.8 * s];
    const m0 = hinge([-3.4, 0.3, 4.6 * s], lift, 1.8);
    const m1 = hinge([1.6, 0.3, 4.8 * s], lift, 1.8);
    const t0 = V.add(m0, V.sub(hinge([-4.6, 0.3, 7.6 * s], tipLift, 4.6), [-3.4, 0.3, 4.6 * s]));
    const t1 = V.add(m1, V.sub(hinge([-1.6, 0.3, 7.9 * s], tipLift, 4.8), [1.6, 0.3, 4.8 * s]));
    m.plate(r0, r1, m1, m0, [0, 0.3, 0], 'wing', 'wingIn' + s, 'flesh');
    m.plate(m0, m1, t1, t0, [0, 0.25, 0], 'wing', 'wingOut' + s, 'flesh');
    // ribs along the wing
    for (const f of [0.2, 0.55, 0.9]) {
      const a = V.mix(r0, r1, f);
      const b = V.mix(m0, m1, f);
      const c = V.mix(t0, t1, f);
      m.plate(V.add(a, [-0.25, 0.3, 0]), V.add(a, [0.25, 0.3, 0]), V.add(b, [0.2, 0.3, 0]), V.add(b, [-0.2, 0.3, 0]), [0, 0.12, 0], 'bone', 'rib' + s + f);
      m.plate(V.add(b, [-0.2, 0.25, 0]), V.add(b, [0.2, 0.25, 0]), V.add(c, [0.15, 0.25, 0]), V.add(c, [-0.15, 0.25, 0]), [0, 0.12, 0], 'bone', 'ribO' + s + f);
    }
  }
  // a whip tail that sways
  let prev = [-3.4, 0, 0];
  for (let i = 1; i <= 4; i++) {
    const next = [-3.4 - i * 1.3, 0, Math.sin(sway + i * 0.9) * 0.45 * i];
    const r = 0.5 - i * 0.09;
    m.plate(V.add(prev, [0, -r, -r]), V.add(prev, [0, -r, r]), V.add(next, [0, -r * 0.8, r * 0.8]), V.add(next, [0, -r * 0.8, -r * 0.8]), [0, r * 2, 0], 'flesh', 'tail' + i);
    prev = next;
  }
  return m;
}

// A dart: a slim hull with a lamp for a nose and four fins that turn as it
// flies (it rolls like a drill).
function dart(roll = 0) {
  const m = new Mesh();
  m.lathe([[-4.6, 0.9, 0.9], [-3.4, 1.5, 1.5], [0.6, 1.45, 1.45], [3.2, 0.95, 0.95], [4.4, 0.45, 0.45]], 8,
    (r, i) => (r === 1 && i % 2 ? 'accent' : r === 2 ? 'dark' : 'hull'), (r, i) => 'b' + r + (r === 1 ? i % 2 : ''));
  m.ball([4.5, 0, 0], 0.62, 'glow', 'nose', { n: 6, m: 3 });
  m.ball([-4.7, 0, 0], 0.8, 'glow', 'core', { n: 6, m: 3 });
  for (let f = 0; f < 4; f++) {
    const a = roll + Math.PI / 4 + (f * Math.PI) / 2;
    const fin = new Mesh().plate([-4.6, 1.2, -0.2], [-1.0, 1.2, -0.2], [-3.2, 3.6, -0.2], [-5.2, 3.6, -0.2], [0, 0, 0.4], 'hull', 'fin' + f, 'accent');
    m.add(fin, (p) => turn(p, 'x', a));
  }
  return m;
}

// A gunship: a heavy hull, a red-lit dome, twin cannons under its nose
// (they kick back when they fire) and an engine pod each side.
function gunship(recoil = 0) {
  const m = new Mesh();
  m.lathe([[-6.2, 1.5, 2.0], [-5.2, 2.9, 3.6], [-1.2, 3.6, 4.4], [2.8, 3.1, 3.8], [5.2, 1.9, 2.5], [6.6, 0.8, 1.1]], 10,
    (r, i, up) => (r === 2 && !up ? 'dark' : r === 1 ? 'dark' : r === 3 && up ? 'accent' : 'hull'), (r, i, up) => 'b' + r + (up ? 'u' : 'd'));
  m.ball([0.2, 2.9, 0], 2.7, 'glass', 'dome', { n: 10, m: 4, to: Math.PI / 2 });
  m.lathe([[-2.6, 0.5, 2.9, 3.0], [3.0, 0.5, 2.9, 3.0]], 10, 'mech', 'collar', { pow: 1 });
  m.plate([-5.6, 3.0, -0.3], [-2.6, 3.0, -0.3], [-4.4, 6.2, -0.3], [-6.4, 6.2, -0.3], [0, 0, 0.6], 'hull', 'tail', 'accent');
  for (const s of [-1, 1]) {
    // cannons
    const x0 = 0.5 - recoil;
    m.lathe([[x0, 0.75, 0.75, -2.6], [x0 + 6.2, 0.6, 0.6, -2.6]], 6, 'mech', 'gun' + s, { cz: 2.6 * s });
    m.lathe([[x0 + 6.2, 0.9, 0.9, -2.6], [x0 + 7.4, 0.9, 0.9, -2.6]], 6, 'dark', 'muzzle' + s, { cz: 2.6 * s });
    m.box([-1.5, -3.5, 1.7 * s - 0.9], [2.2, -1.9, 1.7 * s + 0.9 + 0.9 * s], 'dark', 'mount' + s);
    // engine pods
    m.lathe([[-7.2, 1.2, 1.2, 0.2], [-6.2, 1.7, 1.7, 0.2], [-2.2, 1.6, 1.6, 0.2], [-0.8, 0.7, 0.7, 0.2]], 8, (r) => (r === 1 ? 'hull' : 'mech'), 'pod' + s, { cz: 5.3 * s });
    m.ball([-7.1, 0.2, 5.3 * s], 0.95, 'glow', 'burn' + s, { n: 6, m: 3 });
    m.box([-4.6, -0.2, 3.6 * s], [-2.6, 0.6, 4.6 * s], 'dark', 'strut' + s);
  }
  return m;
}

// A sniper: a long rail gun slung under a narrow hull, a red sight on top.
function sniper() {
  const m = new Mesh();
  m.lathe([[-6.4, 0.9, 1.2], [-5.2, 1.7, 2.1], [-0.5, 1.9, 2.3], [3.0, 1.3, 1.6], [4.6, 0.5, 0.7]], 8, (r, i, up) => (r === 1 && up ? 'accent' : r === 2 ? 'hull' : 'dark'), (r, i, up) => 'b' + r + (up ? 'u' : 'd'), { pow: 0.7 });
  m.lathe([[-2.5, 0.55, 0.55, -1.9], [6.9, 0.45, 0.45, -1.9]], 6, 'mech', 'rail');
  m.lathe([[5.9, 0.85, 0.85, -1.9], [7.0, 0.85, 0.85, -1.9]], 6, 'dark', 'muzzle');
  m.box([-1.6, -1.6, -0.5], [1.4, -0.8, 0.5], 'dark', 'sling');
  m.box([-0.5, 1.7, -0.5], [2.4, 2.5, 0.5], 'mech', 'scope');
  m.ball([2.6, 2.1, 0], 0.62, 'glow', 'sight', { n: 6, m: 3 });
  m.ball([-6.5, 0, 0], 0.85, 'glow', 'core', { n: 6, m: 3 });
  for (const s of [-1, 1]) m.plate([-6.0, 0.2, 1.6 * s], [-2.8, 0.2, 1.9 * s], [-4.6, 0.9, 4.4 * s], [-6.4, 0.9, 4.4 * s], [0, 0.4, 0], 'hull', 'fin' + s, 'accent');
  return m;
}

// A spinner: a disc that turns to face you, eight spikes round its rim, a
// lamp at its hub.
function disc(spin = 0) {
  const m = new Mesh();
  const face = (p) => turn(turn(p, 'y', -Math.PI / 2), 'z', spin); // (its axis points at the camera)
  const body = new Mesh();
  body.lathe([[-1.3, 2.2, 2.2], [-0.7, 4.3, 4.3], [0.7, 4.3, 4.3], [1.3, 2.6, 2.6]], 16, (r, i) => (r === 1 ? (i % 2 ? 'accent' : 'dark') : 'hull'), (r, i) => 'd' + r + (r === 1 ? i : ''), { pow: 1 });
  body.ball([1.3, 0, 0], 1.5, 'glow', 'hub', { n: 8, m: 3 });
  m.add(body, face);
  for (let i = 0; i < 8; i++) {
    const a = spin + (i * Math.PI) / 4;
    // (panels on its face, so you can see it turn)
    const panel = new Mesh().plate([2.0, -0.45, 1.3], [2.0, 0.45, 1.3], [3.7, 0.85, 0.8], [3.7, -0.85, 0.8], [0, 0, 0.25], i % 2 ? 'accent' : 'dark', 'panel' + i);
    m.add(panel, (p) => turn(p, 'z', a + Math.PI / 8));
    const spike = new Mesh().plate([3.9, -0.7, -0.5], [3.9, 0.7, -0.5], [5.9, 0.12, -0.2], [5.9, -0.12, -0.2], [0, 0, 0.9], 'mech', 'spike' + i, 'hull');
    m.add(spike, (p) => turn(p, 'z', a));
  }
  return m;
}

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
const baked = new Map();
const frame = (mesh, k, w, h, pad, spin, opts = {}) => {
  const view = { w: w + pad * 2, h: h + pad * 2, k, scale: opts.scale || 1, cx: (w + pad * 2) / 2 + (opts.dx || 0), cy: (h + pad * 2) / 2 + (opts.dy || 0), spin, flip: opts.flip !== false };
  return renderModel(mesh, view, opts.look || BELT_LIGHT);
};

const BAKERS = {
  // Your ship: seven frames of bank, from diving (0) to climbing (6).
  player: (k) => {
    const mesh = new Mesh();
    mesh.tris = buildShip();
    const frames = [];
    for (let i = 0; i < 7; i++) frames.push(frame(mesh, k, 18, 11, 4, [['x', TILT + (i - 3) * 0.17]], { scale: 0.84, flip: false, look: SHIP_LOOK, dx: 0.3, dy: 0.3 }));
    return { pad: 4, frames };
  },
  drifter: (k) => {
    const frames = [];
    for (let i = 0; i < 8; i++) frames.push(frame(pod((i / 8) * ((Math.PI * 2) / 3)), k, 10, 8, 3, [['x', TILT]], { scale: 0.98 }));
    return { pad: 3, frames };
  },
  weaver: (k) => {
    const frames = [];
    for (let i = 0; i < 10; i++) frames.push(frame(manta((i / 10) * Math.PI * 2, (i / 10) * Math.PI * 2), k, 11, 9, 4, [['x', 0.95]], { scale: 0.92 }));
    return { pad: 4, frames };
  },
  seeker: (k) => {
    const frames = [];
    for (let i = 0; i < 6; i++) frames.push(frame(dart((i / 6) * (Math.PI / 2)), k, 10, 7, 3, [['x', TILT]], { scale: 1.0 }));
    return { pad: 3, frames };
  },
  // The gunship: five frames of bank, each with its cannons out and kicked back.
  gunner: (k) => {
    const frames = [];
    for (const recoil of [0, 1.6]) for (let i = 0; i < 5; i++) frames.push(frame(gunship(recoil), k, 14, 11, 4, [['x', TILT + (i - 2) * 0.2]], { scale: 0.94, dy: 0.6 }));
    return { pad: 4, frames };
  },
  sniper: (k) => ({ pad: 3, frames: [frame(sniper(), k, 14, 7, 3, [['x', TILT]], { scale: 0.98, dy: -0.3 })] }),
  spinner: (k) => {
    const frames = [];
    for (let i = 0; i < 8; i++) frames.push(frame(disc((i / 8) * (Math.PI / 4)), k, 11, 11, 2, [['x', 0.25]], { scale: 0.95, flip: false }));
    return { pad: 2, frames };
  },
  carrier: (k) => {
    const frames = [];
    for (let i = 0; i < 1; i++) frames.push(frame(cargo(), k, 13, 9, 2, [['x', 0.3]], { scale: 0.98 }));
    return { pad: 2, frames };
  },
};

// Tumbling asteroids: `n` frames of a rock turning about a tilted axis.
function rockFrames(k, seed, size, r, n) {
  const mesh = rockMesh(seed, r, size > 20 ? 2 : 1);
  const frames = [];
  const axis = (seed * 0.77) % 1.2;
  for (let i = 0; i < n; i++) {
    frames.push(renderModel(mesh, { w: size, h: size, k, scale: 1, cx: size / 2, cy: size / 2, spin: [['z', (i / n) * Math.PI * 2], ['x', axis], ['y', axis * 0.6]] }, ROCK_LOOK));
  }
  return frames;
}
BAKERS.rockBig = (k) => ({ pad: 0, sets: [11, 23, 37].map((s) => rockFrames(k, s, 29, 9.9, 24)) });
BAKERS.rockSmall = (k) => ({ pad: 0, sets: [3, 14, 29, 41].map((s) => rockFrames(k, s, 17, 5.7, 16)) });
BAKERS.rockBit = (k) => ({ pad: 0, sets: [5, 9, 13].map((s) => rockFrames(k, s, 9, 3.3, 12)) });

// A wreck: a model (or just some of its parts) tumbling, in `n` frames.
const WRECKS = {
  drifter: () => [pod(0.4)],
  seeker: () => [dart(0.3)],
  gunner: () => [gunship(0).only((p) => /^b[3-5]|gun|muzzle|mount|dome|collar/.test(p)), gunship(0).only((p) => /^b[0-2]|tail|pod|burn|strut/.test(p))],
  weaver: () => [manta(1.2, 0).only((p) => /wing(In|Out)-1|rib(O)?-1/.test(p)), manta(1.2, 0).only((p) => /wing(In|Out)1|rib(O)?1/.test(p)), manta(0, 0).only((p) => /body|eye|tail/.test(p))],
  carrier: () => [cargo()],
  sniper: () => [sniper()],
  spinner: () => [disc(0).only((p) => !/spike[0-3]/.test(p)), disc(0).only((p) => /spike[0-3]/.test(p))],
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
  return WRECKS[name]().map((mesh, pi) => {
    // (each piece turns about its own middle)
    let c = [0, 0, 0];
    for (const t of mesh.tris) c = V.add(c, V.mul(V.add(V.add(t[0], t[1]), t[2]), 1 / 3));
    c = V.mul(c, 1 / Math.max(1, mesh.tris.length));
    const centred = new Mesh().add(mesh, (p) => V.sub(p, c));
    const frames = [];
    for (let i = 0; i < n; i++) {
      frames.push(renderModel(centred, { w: size, h: size, k, scale: name === 'player' ? 0.84 : 0.95, cx: size / 2, cy: size / 2, spin: [['x', TILT + pi], ['z', (i / n) * Math.PI * 2]], flip: name !== 'player' }, { ...BELT_LIGHT, mats: name === 'player' ? CHARRED.ship : name === 'weaver' ? INVADER : CHARRED.invader, flat: name === 'weaver' ? ['eye'] : [] }));
    }
    return { frames, off: c, size };
  });
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
export const MODEL_NAMES = Object.keys(BAKERS);
export const hasModel = (name) => !!BAKERS[name];
export const hasWreck = (name) => !!WRECKS[name];

// Two more complete looks for level 1's six enemies, for the owner to
// compare with today's sprites and the new look's first set (after
// v0.38.1). Not loaded by the game: tools/look/sets-sheet.mjs draws them.
// Each model is built like the game's (js/models.js): one unit = one game
// pixel, nose towards +x, y up, z towards the camera.
import { Mesh, rockMesh, turn, V } from '../../js/model.js';

const MECH = ['#12141c', '#262832', '#40434f', '#666974', '#989ba2'];
const BONE = ['#544540', '#857263', '#b5a18a', '#dccbb0', '#f4e9d2'];
const LIGHT = { light: [0.3, 0.62, 0.72], rim: [0.8, 0.5, -0.33], rimColor: '#ffcf8a', flat: ['glow', 'eye'], ink: '#090a14' };

// ============================================================ set C
// "Crimson Blades": the invaders' strike wing. Knife shapes: diamond hulls
// with a sharp ridge, crimson armour over gunmetal, cream blade edges,
// amber-lit glass.
const C_MATS = {
  hull: ['#2a0c14', '#5a1620', '#8f2630', '#c24a44', '#eb8a70'],
  dark: ['#101320', '#1e2334', '#333a52', '#515a78', '#7c86a6'],
  mech: MECH,
  glass: ['#3a2410', '#7a4a1c', '#c0802e', '#eab25a', '#fbe2a4'],
  accent: ['#5a5248', '#8a8070', '#b8ad98', '#dccfb8', '#f6ecd8'],
  glow: ['#f2864e', '#ffb46a', '#ffd9a0', '#fff1cf', '#fff8e6'],
  eye: ['#e3a857', '#f2cf8a', '#f6dcae', '#fff1cf', '#fff8e6'],
  flesh: ['#1c1028', '#3a2150', '#5f3a7a', '#8c5ea4', '#bd92cc'],
  wing: ['#170d22', '#301b44', '#4e2f6a', '#754c92', '#a478b8'],
  bone: BONE,
};
const ridge = () => 'hull';
const sides = (r, i, up) => 'b' + r + (up ? 'u' : 'd');

function daggerPod() {
  const m = new Mesh();
  m.lathe([[-4.6, 0.9, 1.0], [-3.2, 2.6, 2.4], [0.4, 2.9, 2.7], [3.0, 1.7, 1.5], [5.0, 0.15, 0.15]], 4, (r) => (r === 0 ? 'dark' : 'hull'), sides, { pow: 1 });
  m.lathe([[0.0, 0.1, 0.1, 2.7], [1.2, 0.95, 0.95, 2.35], [3.0, 0.55, 0.65, 1.7], [3.9, 0.1, 0.1, 1.2]], 4, 'glass', 'canopy', { pow: 1 });
  for (const s of [-1, 1]) m.plate([-2.6, -0.2, 2.1 * s], [1.4, -0.2, 2.3 * s], [4.8, -1.0, 6.3 * s], [2.6, -1.0, 6.5 * s], [0, 0.45, 0], 'hull', 'blade' + s, 'accent');
  m.plate([-4.3, 2.1, -0.25], [-1.0, 2.6, -0.25], [-3.3, 5.2, -0.25], [-5.0, 5.2, -0.25], [0, 0, 0.5], 'dark', 'fin', 'accent');
  m.lathe([[1.4, 0.45, 0.45, -2.3], [5.7, 0.38, 0.38, -2.3]], 6, 'mech', 'gun');
  m.ball([-4.7, 0, 0], 1.05, 'glow', 'core', { n: 6, m: 3 });
  return m;
}

function razorRay(flap = 0.6) {
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

function stiletto(roll = 0.3) {
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

function cleaver(recoil = 0) {
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

function lance() {
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

function shuriken(spin = 0.2) {
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

// ============================================================ set D
// "Stone Reavers": raiders who armour their ships with the belt's own
// rock. Chunky slabs of cool grey stone bolted to rusty iron frames, with
// sea-green furnace light in every port and vent.
const D_MATS = {
  stone: ['#1a1d26', '#2f3442', '#4a5162', '#6e7686', '#a0a8b4'],
  iron: ['#16110f', '#2c211c', '#47362c', '#665040', '#8c725c'],
  mech: MECH,
  glow: ['#1f6f6a', '#2fa39a', '#5fd0bf', '#8fdcc8', '#b4ead9'],
  eye: ['#e3a857', '#f2cf8a', '#f6dcae', '#fff1cf', '#fff8e6'],
  accent: ['#4a3a16', '#7a6024', '#b08a36', '#d8b458', '#f2dc96'],
  shell: ['#22212b', '#3d3c4b', '#5e5d6d', '#898892', '#bcbbc0'],
  flesh: ['#2c0f18', '#5a1f28', '#8c3436', '#bb564a', '#e09480'],
  bone: BONE,
};
// A lump of rock: seed, size, how it's stretched, where it sits.
const rock = (seed, r, squash, move, part = 'rock') => new Mesh().add(rockMesh(seed, r, 1, 'stone'), (p) => [p[0] * squash[0] + move[0], p[1] * squash[1] + move[1], p[2] * squash[2] + move[2]], () => part);

function boulderPod() {
  const m = new Mesh();
  m.add(rock(7, 3.3, [1.25, 0.95, 1.0], [0, 0.2, 0]));
  m.lathe([[-0.7, 3.5, 3.7, 0.2], [0.5, 3.5, 3.7, 0.2]], 10, 'iron', 'band', { caps: false });
  m.lathe([[3.0, 1.75, 1.75, 0.3], [3.9, 1.75, 1.75, 0.3]], 8, 'iron', 'rim', { caps: false, pow: 1 });
  m.ball([3.6, 0.3, 0], 1.5, 'glow', 'port', { n: 8, m: 4, squash: [0.8, 1, 1] });
  m.box([-2.4, 3.0, -0.7], [-1.0, 3.5, 0.7], 'accent', 'mark');
  m.lathe([[1.0, 0.5, 0.5, -3.0], [5.6, 0.42, 0.42, -3.0]], 6, 'mech', 'gun');
  for (const s of [-1, 1]) {
    m.lathe([[-5.4, 0.9, 0.9, -0.6], [-3.0, 1.25, 1.25, -0.6]], 6, 'iron', 'pod' + s, { cz: 2.7 * s });
    m.ball([-5.4, -0.6, 2.7 * s], 0.8, 'glow', 'burn' + s, { n: 6, m: 3 });
  }
  return m;
}

function beltCrab(flap = 0.8) {
  const m = new Mesh();
  m.ball([0, 0.4, 0], 3.5, 'shell', 'shell', { n: 12, m: 4, squash: [1.3, 0.62, 1.02], to: Math.PI / 2 });
  m.ball([0, 0.4, 0], 3.3, 'flesh', 'belly', { n: 12, m: 3, squash: [1.25, 0.3, 0.95], from: Math.PI / 2, to: Math.PI });
  // ridges across its shell
  for (const x of [-2.2, -0.4, 1.4]) m.box([x, 2.0 - Math.abs(x) * 0.25, -2.6 + Math.abs(x) * 0.3], [x + 0.5, 2.5 - Math.abs(x) * 0.25, 2.6 - Math.abs(x) * 0.3], 'bone', 'ridge' + x);
  for (const s of [-1, 1]) {
    m.ball([4.2, 1.5, 1.0 * s], 0.6, 'eye', 'eye' + s, { n: 6, m: 3 });
    m.box([3.9, 0.6, 1.0 * s - 0.2], [4.3, 1.3, 1.0 * s + 0.2], 'flesh', 'stalk' + s);
    // three paddling legs a side
    for (let i = 0; i < 3; i++) {
      const x = -2.6 + i * 2.1;
      const kick = Math.sin(flap + i * 2.1 + (s > 0 ? 0 : 1.5)) * 1.1;
      m.plate([x - 0.6, 0.2, 3.0 * s], [x + 0.6, 0.2, 3.0 * s], [x + 0.4 + kick, -0.5, 5.4 * s], [x - 0.6 + kick, -0.5, 5.4 * s], [0, 0.5, 0], 'flesh', 'leg' + s + i);
      m.plate([x - 0.5 + kick, -0.5, 5.4 * s], [x + 0.2 + kick, -0.5, 5.4 * s], [x - 0.7 + kick * 1.6, -1.2, 6.9 * s], [x - 1.0 + kick * 1.6, -1.2, 6.9 * s], [0, 0.3, 0], 'bone', 'foot' + s + i);
    }
    // claws
    m.plate([3.4, 0.1, 1.6 * s], [4.4, 0.1, 2.2 * s], [6.2, 0.1, 3.2 * s], [5.4, 0.1, 3.9 * s], [0, 0.5, 0], 'shell', 'arm' + s);
    m.plate([5.6, 0.1, 3.3 * s], [6.3, 0.1, 3.0 * s], [7.6, 0.1, 2.0 * s], [7.0, 0.1, 2.9 * s], [0, 0.45, 0], 'bone', 'pincer' + s);
  }
  return m;
}

function shardDart(roll = 0.4) {
  const m = new Mesh();
  m.add(rock(19, 1.7, [2.3, 0.8, 0.8], [0, 0, 0]));
  m.lathe([[3.0, 1.0, 1.0], [5.3, 0.1, 0.1]], 6, 'iron', 'nose', { pow: 1 });
  m.lathe([[-4.9, 1.0, 1.0], [-3.6, 1.35, 1.35]], 8, 'iron', 'collar', { caps: false });
  m.ball([-4.8, 0, 0], 0.85, 'glow', 'core', { n: 6, m: 3 });
  for (let f = 0; f < 3; f++) {
    const fin = new Mesh().plate([-4.8, 1.1, -0.2], [-2.0, 1.1, -0.2], [-4.0, 3.5, -0.2], [-5.6, 3.5, -0.2], [0, 0, 0.4], 'iron', 'f' + f, 'accent');
    m.add(fin, (p) => turn(p, 'x', roll + (f * Math.PI * 2) / 3));
  }
  return m;
}

function rampart(recoil = 0) {
  const m = new Mesh();
  m.box([-5.6, -2.7, -2.3], [4.6, -1.1, 2.3], 'iron', 'keel');
  m.add(rock(31, 4.2, [1.45, 0.8, 1.05], [-0.6, 0.9, 0]));
  m.add(rock(43, 2.0, [1.3, 0.8, 1.0], [-2.9, 3.7, 0]), (p) => p, () => 'cap');
  m.lathe([[-2.2, 3.9, 4.8, 0.7], [-1.1, 3.9, 4.8, 0.7]], 10, 'iron', 'band', { caps: false });
  m.lathe([[4.2, 1.9, 2.3, 0.6], [5.3, 1.9, 2.3, 0.6]], 8, 'iron', 'rim', { caps: false, pow: 1 });
  m.ball([5.1, 0.6, 0], 1.6, 'glow', 'furnace', { n: 8, m: 4, squash: [0.5, 1, 1.2] });
  for (const s of [-1, 1]) {
    m.lathe([[0.4 - recoil, 0.8, 0.8, -2.5], [7.4 - recoil, 0.65, 0.65, -2.5]], 6, 'mech', 'gun' + s, { cz: 3.1 * s });
    m.lathe([[7.2 - recoil, 0.95, 0.95, -2.5], [8.2 - recoil, 0.95, 0.95, -2.5]], 6, 'iron', 'muzzle' + s, { cz: 3.1 * s });
    m.lathe([[-7.4, 1.1, 1.1, 0], [-5.2, 1.6, 1.6, 0]], 6, 'iron', 'pod' + s, { cz: 3.3 * s });
    m.ball([-7.4, 0, 3.3 * s], 0.95, 'glow', 'burn' + s, { n: 6, m: 3 });
  }
  return m;
}

function menhir() {
  const m = new Mesh();
  m.add(rock(53, 1.9, [2.7, 0.85, 0.9], [-1.6, 0.3, 0]));
  m.lathe([[1.5, 0.55, 0.55, -0.2], [7.1, 0.45, 0.45, -0.2]], 6, 'mech', 'barrel');
  m.lathe([[6.4, 0.8, 0.8, -0.2], [7.3, 0.8, 0.8, -0.2]], 6, 'iron', 'muzzle');
  for (const x of [-4.2, 0.2]) m.lathe([[x, 1.85, 1.95, 0.3], [x + 0.8, 1.85, 1.95, 0.3]], 8, 'iron', 'clamp' + x, { caps: false });
  m.box([-1.6, 1.7, -0.3], [-0.9, 2.6, 0.3], 'iron', 'post');
  m.ball([-1.2, 2.8, 0], 0.6, 'glow', 'sight', { n: 6, m: 3 });
  m.ball([-6.8, 0.3, 0], 0.85, 'glow', 'core', { n: 6, m: 3 });
  return m;
}

function geode(spin = 0.25) {
  const m = new Mesh();
  const face = (p) => turn(p, 'y', -Math.PI / 2); // (its axis points at the camera)
  const ring = new Mesh();
  ring.lathe([[-0.9, 3.5, 3.5], [0.9, 3.5, 3.5]], 12, 'iron', 'ring', { pow: 1, caps: false });
  ring.lathe([[-0.4, 3.3, 3.3], [-0.2, 0.1, 0.1]], 12, 'iron', 'back', { pow: 1, caps: false });
  m.add(ring, face);
  m.ball([0, 0, 0.5], 2.0, 'glow', 'core', { n: 6, m: 3 });
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * Math.PI) / 3;
    m.add(rock(60 + i * 7, 1.45, [1.25, 0.85, 0.8], [4.7, 0, 0]), (p) => turn(p, 'z', a), () => 'tooth' + i);
  }
  return m;
}

// ---- how each is framed (the same box as the game's own sprite) ----
const BOX = {
  drifter: { w: 10, h: 8, pad: 3, tilt: 0.38, scale: 0.98 },
  weaver: { w: 11, h: 9, pad: 4, tilt: 0.95, scale: 0.9 },
  seeker: { w: 10, h: 7, pad: 3, tilt: 0.38, scale: 1.0 },
  gunner: { w: 14, h: 11, pad: 4, tilt: 0.38, scale: 0.92, dy: 0.6 },
  sniper: { w: 14, h: 7, pad: 3, tilt: 0.38, scale: 0.98 },
  spinner: { w: 11, h: 11, pad: 2, tilt: 0.25, scale: 0.93, flip: false },
};
export const ORDER = ['drifter', 'weaver', 'seeker', 'gunner', 'sniper', 'spinner'];
export const KINDS = { drifter: 'POD', weaver: 'CREATURE', seeker: 'DART', gunner: 'GUNSHIP', sniper: 'SNIPER', spinner: 'SPINNER' };
export const SETS = {
  C: {
    name: 'CRIMSON BLADES',
    look: { ...LIGHT, mats: C_MATS },
    models: { drifter: ['DAGGER POD', daggerPod], weaver: ['RAZOR RAY', razorRay], seeker: ['STILETTO', stiletto], gunner: ['CLEAVER', cleaver], sniper: ['LANCE', lance], spinner: ['SHURIKEN', shuriken] },
  },
  D: {
    name: 'STONE REAVERS',
    look: { ...LIGHT, mats: D_MATS },
    models: { drifter: ['BOULDER POD', boulderPod], weaver: ['BELT CRAB', beltCrab], seeker: ['SHARD DART', shardDart], gunner: ['RAMPART', rampart], sniper: ['MENHIR', menhir], spinner: ['GEODE', geode] },
  },
};
export function viewOf(kind, k) {
  const B = BOX[kind];
  return { w: B.w + B.pad * 2, h: B.h + B.pad * 2, k, scale: B.scale, cx: (B.w + B.pad * 2) / 2, cy: (B.h + B.pad * 2) / 2 + (B.dy || 0), spin: [['x', B.tilt]], flip: B.flip !== false, pad: B.pad, box: B };
}

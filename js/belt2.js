import { VIEW_W, VIEW_H } from './config.js?v=0.38.1';
import { seeded } from './util.js?v=0.38.1';
import { rgba } from './detail.js?v=0.38.1';
import { look } from './look.js?v=0.38.1';
import { rockMesh, renderModel, hexMix } from './model.js?v=0.38.1';
import { BELT_LIGHT } from './models.js?v=0.38.1';
import { softLight } from './fx.js?v=0.38.1';

// The Outer Belt in the new look (the look sample, after v0.37.0): seven
// layers that move at different speeds, so space has depth:
//   1 a painted cloud of gas, glowing warm round the sun
//   2 three layers of stars, some twinkling
//   3 the amber sun, with real light round it
//   4 a shattered planetoid far away, with its broken pieces
//   5 a far belt of small rocks
//   6 nearer rocks that tumble slowly (dimmed, so they never look like the
//     ones that can hit you)
//   7 in front of everything: fine dust streaking past, and now and then
//     the dark edge of a huge rock sliding by along the top or bottom.
// Everything is painted once (per art fineness) and only moved after that.

const SPACE = '#090c1b';

// ---- the gas cloud ----
// Smooth "noise" that repeats exactly every `period` cells across, so the
// cloud scrolls round for ever without a seam.
function noiseField(seed, period) {
  const h = (x, y) => {
    const n = Math.sin((((x % period) + period) % period) * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = s(x - x0);
    const fy = s(y - y0);
    const a = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * fx;
    const b = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const COOL = ['#090c1b', '#0d1228', '#131a38', '#1a2148', '#232a5a', '#2e356c'];
const VIOLET = ['#090c1b', '#110f28', '#1b1438', '#281a48', '#382258', '#4a2d66'];
const WARM = ['#090c1b', '#140f22', '#21142c', '#331b34', '#47233a', '#5c2d40'];
let cloud = null;
function makeCloud() {
  if (cloud) return cloud;
  const D = 2; // (painted chunkier than the sprites: it sits far behind them)
  const W = VIEW_W * 2 * D;
  const H = VIEW_H * D;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x2 = c.getContext('2d');
  const img = x2.createImageData(W, H);
  const buf = new Uint32Array(img.data.buffer);
  const P = 8; // noise cells across the loop
  const n1 = noiseField(3, P);
  const n2 = noiseField(11, P * 2);
  const n3 = noiseField(29, P * 4);
  const n4 = noiseField(47, P * 8);
  const hue = noiseField(71, P);
  const ramps = [COOL, VIOLET, WARM].map((r) => r.map(rgba));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x / W) * P;
      const v = (y / H) * (P * 0.7);
      // Wispy: big shapes, broken up by finer ones, thicker in a band
      // that runs across the middle of the sky.
      let d = n1(u, v) * 0.5 + n2(u * 2, v * 2) * 0.27 + n3(u * 4, v * 4) * 0.15 + n4(u * 8, v * 8) * 0.08;
      const band = 1 - Math.abs(y / H - 0.52 - Math.sin((x / W) * Math.PI * 2) * 0.1) * 2.1;
      d = (d - 0.43) * 2.3 + Math.max(-0.6, band) * 0.5;
      const t = Math.max(0, Math.min(0.999, d)) * 5;
      const dither = BAYER[(y & 3) * 4 + (x & 3)] / 16;
      const level = Math.min(5, Math.floor(t + dither * 0.9));
      const hv = hue(u + 2.5, v + 1.5) + (n2(u * 2 + 5, v * 2) - 0.5) * 0.3;
      const ramp = hv < 0.42 ? ramps[0] : hv < 0.63 ? ramps[1] : ramps[2];
      buf[y * W + x] = ramp[level];
    }
  }
  x2.putImageData(img, 0, 0);
  cloud = c;
  return c;
}

// ---- rocks far away ----
// A rock picture washed towards the colour of space (things far off are
// dimmer and bluer), so it sits back.
function haze(pic, amount) {
  const x = pic.hi.getContext('2d');
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = hexMix(SPACE, '#232c5e', 0.6);
  x.globalAlpha = amount;
  x.fillRect(0, 0, pic.hi.width, pic.hi.height);
  x.globalAlpha = 1;
  x.globalCompositeOperation = 'source-over';
  return pic;
}
const FAR_LOOK = { ...BELT_LIGHT, light: [0.6, 0.65, 0.4], faceted: true, dither: 0.5, floor: 0, base: 0.3, gain: 4.4 };
const made = new Map();
function scenery(k) {
  if (made.has(k)) return made.get(k);
  const rock = (seed, r, size, frames, hz, detail = 1) => {
    const mesh = rockMesh(seed, r, detail);
    const out = [];
    for (let i = 0; i < frames; i++) {
      out.push(haze(renderModel(mesh, { w: size, h: size, k, scale: 1, cx: size / 2, cy: size / 2, spin: [['z', (i / frames) * Math.PI * 2], ['x', seed * 0.37], ['y', seed * 0.21]] }, FAR_LOOK), hz));
    }
    return out;
  };
  const S = {
    // the shattered planetoid: one big body, and the pieces torn off it
    planet: rock(101, 25, 72, 1, 0.74, 3)[0],
    chunks: [[7, 6.5, 18], [19, 4.2, 12], [31, 3.0, 9], [43, 2.2, 7], [57, 1.6, 5]].map(([s, r, z]) => rock(s, r, z, 1, 0.72, 1)[0]),
    far: [2, 8, 15, 21, 33, 40].map((s, i) => rock(s, 1.2 + (i % 3) * 0.6, 8, 1, 0.78, 1)[0]),
    mid: [5, 12, 26, 38].map((s, i) => rock(s, 3.2 + i * 0.8, 16, 16, 0.68, 1)),
    near: rock(77, 30, 80, 1, 0, 2)[0],
  };
  // The near rock is only ever a dark shape against the stars.
  const x = S.near.hi.getContext('2d');
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = '#05060e';
  x.globalAlpha = 0.86;
  x.fillRect(0, 0, S.near.hi.width, S.near.hi.height);
  made.set(k, S);
  return S;
}

// The sun's light and its long thin flare, made once at the screen's own
// size (drawing a picture at its own size is cheap; stretching and
// smoothing one every frame is what slows a phone).
const SUN_STOPS = [[0, 0.95], [0.08, 0.7], [0.2, 0.32], [0.45, 0.1], [0.75, 0.025], [1, 0]];
const sunPics = new Map();
function sunLight(sc) {
  const key = Math.round(sc * 100);
  if (!sunPics.has(key)) sunPics.set(key, { glow: softLight('#ffbe6e', Math.round(124 * sc), SUN_STOPS), flare: softLight('#ffbe6e', Math.round(300 * sc), SUN_STOPS, 1, 18 / 300) });
  return sunPics.get(key);
}

const STAR_LAYERS = [
  { count: 70, speed: 1.2, color: '#2a3158' },
  { count: 36, speed: 3.5, color: '#4a5a8a' },
  { count: 16, speed: 9, color: '#9fb0d0' },
];

export class Belt2 {
  constructor() {
    const r = seeded(20260);
    this.r = r;
    this.t = 0;
    this.cloudX = 0;
    this.sunX = VIEW_W * 0.78;
    this.planetX = VIEW_W * 0.2;
    this.stars = [];
    for (const layer of STAR_LAYERS) for (let i = 0; i < layer.count; i++) this.stars.push({ x: r() * VIEW_W, y: r() * VIEW_H, layer, tw: r() * 6.3, big: layer.speed > 8 && r() < 0.35 });
    this.far = [];
    for (let i = 0; i < 30; i++) this.far.push({ x: r() * (VIEW_W + 20), y: 0, u: r(), i: Math.floor(r() * 6), speed: 4 + r() * 3 });
    for (const f of this.far) f.y = this.bandY(f.x, f.u, 34);
    this.mid = [];
    for (let i = 0; i < 4; i++) this.mid.push(this.newMid(r() * VIEW_W));
    this.motes = [];
    for (let i = 0; i < 14; i++) this.motes.push({ x: r() * VIEW_W, y: r() * VIEW_H, speed: 46 + r() * 50, len: 2 + r() * 4 });
    this.near = null;
    this.nearT = 6 + r() * 6;
  }

  // The belt of rocks runs across the sky in a gentle wave.
  bandY(x, u, width) {
    return VIEW_H * 0.5 + Math.sin(x / 70) * 9 + (u - 0.5) * width;
  }

  newMid(x) {
    const r = this.r;
    return { x, y: 14 + r() * (VIEW_H - 40), i: Math.floor(r() * 4), speed: 10 + r() * 7, fr: r() * 16, spin: (0.8 + r() * 1.6) * (r() < 0.5 ? -1 : 1) };
  }

  update(dt) {
    this.t += dt;
    this.cloudX = (this.cloudX + 2 * dt) % (VIEW_W * 2);
    this.sunX -= 0.6 * dt;
    if (this.sunX < -50) this.sunX = VIEW_W + 50;
    this.planetX -= 1.3 * dt;
    if (this.planetX < -90) this.planetX = VIEW_W + 30;
    for (const s of this.stars) {
      s.x -= s.layer.speed * dt;
      if (s.x < -2) {
        s.x += VIEW_W + 4;
        s.y = this.r() * VIEW_H;
      }
    }
    for (const f of this.far) {
      f.x -= f.speed * dt;
      if (f.x < -10) {
        f.x += VIEW_W + 20;
        f.u = this.r();
      }
      f.y = this.bandY(f.x + this.t * 3, f.u, 34);
    }
    for (let i = 0; i < this.mid.length; i++) {
      const m = this.mid[i];
      m.x -= m.speed * dt;
      m.fr += m.spin * dt;
      if (m.x < -20) this.mid[i] = this.newMid(VIEW_W + 4 + this.r() * 30);
    }
    for (const m of this.motes) {
      m.x -= m.speed * dt;
      if (m.x < -8) {
        m.x = VIEW_W + this.r() * 20;
        m.y = this.r() * VIEW_H;
      }
    }
    if (this.near) {
      this.near.x -= 64 * dt;
      if (this.near.x < -90) this.near = null;
    } else if ((this.nearT -= dt) <= 0) {
      this.nearT = 9 + this.r() * 9;
      const top = this.r() < 0.5;
      // (only its edge comes on screen: it never covers the fight)
      this.near = { x: VIEW_W + 10, y: top ? -66 + this.r() * 6 : VIEW_H - 14 - this.r() * 6 };
    }
  }

  // The far layers (the gas cloud, the slow stars, the sun and its light,
  // the planetoid) hardly move, so they're painted into one screen-sized
  // picture only every sixth frame; copying that picture each frame costs
  // a slow phone far less than painting them all again.
  paintFar(c, sc, S) {
    const x = c.getContext('2d');
    x.setTransform(sc, 0, 0, sc, 0, 0);
    x.imageSmoothingEnabled = false;
    const snap = (v) => Math.round(v * sc) / sc;
    const put = (pic, px, py) => x.drawImage(pic.hi, px, py, pic.width, pic.height);
    const C = makeCloud();
    const cx = snap(this.cloudX);
    x.drawImage(C, -cx, 0, VIEW_W * 2, VIEW_H);
    x.drawImage(C, VIEW_W * 2 - cx, 0, VIEW_W * 2, VIEW_H);
    const z = Math.max(1, Math.round(look.k / 2.5)) / look.k;
    for (const s of this.stars) {
      if (s.layer.speed > 4) continue;
      x.fillStyle = s.layer.color;
      x.fillRect(snap(s.x), snap(s.y), s.layer.speed > 3 ? 0.5 : z, s.layer.speed > 3 ? 0.5 : z);
    }
    // The sun: a hot disc, and warm light spreading from it.
    const sx = snap(this.sunX);
    const sy = 27;
    x.globalCompositeOperation = 'lighter';
    const L = sunLight(sc);
    x.globalAlpha = 0.88;
    x.drawImage(L.glow, sx - 62, sy - 62, 124, 124);
    x.globalAlpha = 0.55;
    x.drawImage(L.flare, sx - 150, sy - 9, 300, 18);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#ffd9a0';
    x.beginPath();
    x.arc(sx, sy, 6.5, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff6e0';
    x.beginPath();
    x.arc(sx, sy, 5, 0, Math.PI * 2);
    x.fill();
    const px = snap(this.planetX);
    put(S.planet, px, 66);
    S.chunks.forEach((ch, i) => {
      const drift = this.t * (0.25 + i * 0.08);
      put(ch, snap(px + 60 + i * 9 + drift + Math.sin(i * 2.3) * 6), snap(60 + i * 5.5 + Math.cos(i * 1.7) * 9 - drift * 0.4));
    });
  }

  // Everything behind the fight.
  draw(ctx, snap) {
    const S = scenery(look.k);
    const sc = ctx.getTransform().a; // screen pixels per game pixel
    const W = Math.round(VIEW_W * sc);
    const H = Math.round(VIEW_H * sc);
    if (!this.farPic || this.farPic.width !== W || this.farPic.height !== H) {
      this.farPic = document.createElement('canvas');
      this.farPic.width = W;
      this.farPic.height = H;
      this.farAge = 99;
    }
    if (++this.farAge >= 6) {
      this.farAge = 0;
      this.paintFar(this.farPic, sc, S);
    }
    ctx.drawImage(this.farPic, 0, 0, VIEW_W, VIEW_H);
    // The near stars (some twinkle), drawn fresh each frame.
    for (const s of this.stars) {
      if (s.layer.speed <= 4) continue;
      const bright = s.big && Math.sin(this.t * 2.4 + s.tw) > 0.3;
      ctx.fillStyle = bright ? '#fff3d6' : s.layer.color;
      const x = snap(s.x);
      const y = snap(s.y);
      ctx.fillRect(x, y, 0.5, 0.5);
      if (bright) {
        ctx.fillRect(x - 0.5, y, 1.5, 0.5);
        ctx.fillRect(x, y - 0.5, 0.5, 1.5);
      }
    }

    for (const f of this.far) ctx.drawImage(S.far[f.i], snap(f.x), snap(f.y));
    for (const m of this.mid) {
      const frames = S.mid[m.i];
      ctx.drawImage(frames[((Math.floor(m.fr) % 16) + 16) % 16], snap(m.x), snap(m.y));
    }
  }

  // What passes in front of the fight.
  drawFront(ctx, snap) {
    ctx.fillStyle = 'rgba(160,176,214,0.22)';
    for (const m of this.motes) ctx.fillRect(snap(m.x), snap(m.y), m.len, 1 / look.k);
    if (this.near) ctx.drawImage(scenery(look.k).near, snap(this.near.x), snap(this.near.y));
  }
}

import { VIEW_W, VIEW_H, PAL } from './config.js?v=0.24.0';
import { FAR_ROCKS } from './rockart.js?v=0.24.0';
import { fillDisc, seeded } from './util.js?v=0.24.0';
import { DETAIL, FINE, detailCanvas, pixels } from './detail.js?v=0.24.0';

// Deep-space backdrop: a slow distant amber sun, a band of dust, distant
// asteroids and four layers of stars moving at different speeds, which
// gives a sense of depth (parallax). Each level picks which parts it shows.
// Everything here is drawn at double detail (half-pixel steps).
const LAYERS = [
  { count: 60, speed: 1.5, color: '#232a45', size: FINE }, // faint far dust of stars
  { count: 30, speed: 4, color: PAL.blueDark, size: FINE },
  { count: 20, speed: 11, color: PAL.blue, size: FINE },
  { count: 9, speed: 26, color: PAL.bluePale, size: FINE },
];

// Blend two '#rrggbb' colours (t = 0 gives a, 1 gives b).
function mix(a, b, t) {
  const n = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

// A distant sun as flat rings (no glow), with in-between rings so the edge
// fades in fine steps. Kept dim so it never hides enemies or shots.
function sunRings(rings) {
  const out = [];
  for (let i = 0; i < rings.length; i++) {
    out.push(rings[i]);
    if (i + 1 < rings.length) out.push([(rings[i][0] + rings[i + 1][0]) / 2, mix(rings[i][1], rings[i + 1][1], 0.5)]);
  }
  return out;
}
// Painted once into a picture (it never changes shape), drawn centred.
const SUN_SIZE = 32;
const sunCache = new Map();
function makeSun(rings) {
  if (sunCache.has(rings)) return sunCache.get(rings);
  const { canvas, ctx } = detailCanvas(SUN_SIZE, SUN_SIZE);
  for (const [r, c] of rings) {
    ctx.fillStyle = c;
    fillDisc(ctx, SUN_SIZE / 2, SUN_SIZE / 2, r);
  }
  sunCache.set(rings, canvas);
  return canvas;
}
const SUN = sunRings([[15, '#262638'], [12, '#4a3530'], [9, PAL.amberDark], [6, '#a87545']]);
const LOW_SUN = sunRings([[13, '#3e2824'], [10, '#5e4234'], [7, '#8c6a4e'], [4, '#c4a07a']]);

// Space lightening very slightly towards the bottom: painted once as a
// one-pixel-wide strip and stretched across the screen (a gradient
// repainted every frame is slow on phones that draw without a graphics chip).
const skyCache = new Map();
function makeSky(color) {
  if (skyCache.has(color)) return skyCache.get(color);
  const { canvas } = detailCanvas(1, VIEW_H);
  const px = pixels(canvas);
  const n = VIEW_H * DETAIL;
  for (let fy = 0; fy < n; fy++) {
    const col = mix(color, '#2a3256', (0.18 * fy) / (n - 1));
    for (let fx = 0; fx < DETAIL; fx++) px.set(fx, fy, col);
  }
  px.done();
  skyCache.set(color, canvas);
  return canvas;
}

// A faint band of space dust, drawn once with a checkerboard "dither"
// pattern (the classic pixel-art way to fade between two colours). Its
// wavy edge repeats exactly every screen width, so the loop is seamless.
// It's built once and shared, not rebuilt on every restart.
const DUST_H = 26;
const dustCanvases = new Map();
function makeDust(color = '#19203a') {
  if (dustCanvases.has(color)) return dustCanvases.get(color);
  const { canvas } = detailCanvas(VIEW_W * 2, DUST_H);
  const px = pixels(canvas);
  // Checked at every half pixel, so the dither is twice as fine.
  for (let fy = 0; fy < DUST_H * DETAIL; fy++) {
    const y = fy * FINE;
    const edge = Math.min(y, DUST_H - FINE - y);
    for (let fx = 0; fx < VIEW_W * 2 * DETAIL; fx++) {
      const wobble = Math.sin((fx * FINE / VIEW_W) * Math.PI * 4) * 2;
      const solid = edge + wobble > 6;
      const dither = edge + wobble > 2 && (fx + fy) % 2 === 0;
      if (solid || dither) px.set(fx, fy, color);
    }
  }
  px.done();
  dustCanvases.set(color, canvas);
  return canvas;
}

// ---- Rust Moon canyon scenery ----

// A dusty sky that lightens towards the horizon, in dithered bands. It never
// changes, so it's painted once and reused.
let canyonSky = null;
function makeCanyonSky() {
  if (canyonSky) return canyonSky;
  const { canvas, ctx: c } = detailCanvas(VIEW_W, VIEW_H);
  const bands = ['#24161a', '#2c1a1c', '#35201f', '#3e2622'];
  c.fillStyle = bands[0];
  c.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let i = 1; i < bands.length; i++) {
    const y0 = 24 + i * 16;
    c.fillStyle = bands[i];
    c.fillRect(0, y0 + 3, VIEW_W, VIEW_H - y0 - 3);
    // A dithered edge in fine steps: sparse, then denser, then solid.
    for (let x = 0; x < VIEW_W; x += FINE * 2) {
      c.fillRect(x + (i % 2) * FINE, y0, FINE, FINE);
      c.fillRect(x + ((i + 1) % 2) * FINE, y0 + 1, FINE, FINE);
      c.fillRect(x + (i % 2) * FINE, y0 + 2, FINE, FINE);
      c.fillRect(x, y0 + 2.5, FINE * 2, FINE);
    }
  }
  canyonSky = canvas;
  return canvas;
}
// A long strip of skyline (mesas or canyon walls) that repeats seamlessly
// every `w` pixels. `flat` makes flat-topped mesas; strata adds rock layers.
const ridgeCache = new Map();
function makeRidge(key, w, h, seed, { flat, color, strata, rough }) {
  if (ridgeCache.has(key)) return ridgeCache.get(key);
  const r = seeded(seed);
  const tops = new Array(w);
  let x = 0;
  while (x < w) {
    // Runs of level ground (mesa tops) or rough slopes.
    const run = flat ? 14 + Math.floor(r() * 30) : 3 + Math.floor(r() * 6);
    const height = Math.floor(h * (0.25 + r() * 0.7));
    for (let i = 0; i < run && x < w; i++, x++) tops[x] = height + (flat ? 0 : Math.floor((r() - 0.5) * rough));
  }
  // Ease the join so the strip loops without a seam.
  for (let i = 0; i < 6; i++) tops[w - 1 - i] = Math.round(tops[w - 1 - i] * (i / 6) + tops[0] * (1 - i / 6));
  const { canvas, ctx: c } = detailCanvas(w * 2, h);
  // Painted in half-pixel columns: rough slopes run smoothly between their
  // points; flat mesa tops keep their sharp edges.
  for (let copy = 0; copy < 2; copy++) {
    for (let xf = 0; xf < w; xf += FINE) {
      const xi = Math.floor(xf);
      const next = tops[(xi + 1) % w];
      const t = flat ? 0 : xf - xi;
      const top = h - Math.round((tops[xi] * (1 - t) + next * t) / FINE) * FINE;
      c.fillStyle = color;
      c.fillRect(copy * w + xf, top, FINE, h - top);
      if (strata) {
        c.fillStyle = strata;
        for (let y = top + 3; y < h; y += 2.5) {
          if (Math.round(xf / FINE + y / FINE) % 9 > 1) c.fillRect(copy * w + xf, y, FINE, FINE);
        }
      }
    }
  }
  ridgeCache.set(key, canvas);
  return canvas;
}

// ---- Frostring scenery ----

// The pale giant planet the comet ring circles, with its own thin ring: drawn
// once, kept dim (it's far away) so it never hides anything.
let ringedPlanet = null;
function makeRingedPlanet() {
  if (ringedPlanet) return ringedPlanet;
  const W = 96;
  const H = 64;
  const cx = 48;
  const cy = 32;
  const R = 22;
  const { canvas } = detailCanvas(W, H);
  const pxs = pixels(canvas);
  const bands = ['#26334f', '#2b3a58', '#314262', '#2b3a58', '#3a4d70'];
  const ring = (x, y) => {
    const d = ((x - cx) / 44) ** 2 + ((y - cy) / 7) ** 2;
    return d < 1 && d > 0.62;
  };
  const ringEdge = (x, y) => {
    const d = ((x - cx) / 44) ** 2 + ((y - cy) / 7) ** 2;
    return d > 0.96 || d < 0.65;
  };
  const px = (x, y, col) => pxs.set(Math.round(x * DETAIL), Math.round(y * DETAIL), col);
  // Every half pixel (x, y = its top-left corner; X, Y = its centre).
  const each = (y0, y1, fn) => {
    for (let y = y0; y < y1; y += FINE) for (let x = 0; x < W; x += FINE) fn(x, y, x + FINE / 2, y + FINE / 2);
  };
  const odd = (x, y) => Math.round((x + y) / FINE) % 2 === 0;
  // The back half of the ring (behind the planet)...
  each(0, cy, (x, y, X, Y) => {
    if (ring(X, Y) && odd(x, y)) px(x, y, '#2e3d5c');
  });
  // ...the planet, in soft wavy bands, lit from the upper left...
  each(0, H, (x, y, X, Y) => {
    const dx = X - cx;
    const dy = Y - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) return;
    let col = bands[Math.floor((Y + Math.sin(X / 7) * 1.5) / 5) % bands.length];
    if (dx + dy > R * 0.9) col = '#1e2942'; // the shadowed side
    else if (dx + dy > R * 0.75 && odd(x, y)) col = '#1e2942'; // dithered into the shadow
    else if (d > R - 0.7) col = '#3a4d70'; // the rim
    if (dx + dy < -R * 0.75 && odd(x, y)) col = '#4d6890'; // a soft highlight
    px(x, y, col);
  });
  // ...and the front half of the ring across it, with darker edges.
  each(cy, H, (x, y, X, Y) => {
    if (!ring(X, Y)) return;
    px(x, y, ringEdge(X, Y) ? '#3d5078' : Math.round(X / FINE) % 5 ? '#4a5f86' : '#5d74a0');
  });
  pxs.done();
  ringedPlanet = canvas;
  return canvas;
}

export class Background {
  constructor(rand, theme = {}) {
    this.rand = rand;
    this.theme = { space: PAL.space, sun: true, dust: true, farRocks: false, ...theme };
    this.stars = [];
    for (const layer of LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          x: rand() * VIEW_W,
          y: rand() * VIEW_H,
          layer,
          twinkle: rand() * Math.PI * 2,
        });
      }
    }
    this.farRocks = [];
    if (this.theme.farRocks) {
      for (let i = 0; i < 9; i++) this.farRocks.push(this.newFarRock(rand() * VIEW_W));
    }
    this.sunX = VIEW_W * 0.8;
    this.dust = this.theme.dust ? makeDust(this.theme.dustColor) : null;
    if (this.theme.canyon) {
      // Far mesas, nearer canyon walls, and the odd dust devil.
      this.mesas = makeRidge('mesas', VIEW_W, 34, 7, { flat: true, color: '#2a1a1e' });
      this.walls = makeRidge('walls', VIEW_W, 44, 19, { flat: false, color: '#3a2322', strata: '#412725', rough: 6 });
      this.mesaX = 0;
      this.wallX = 0;
      this.devils = [];
      this.devilT = 2;
    }
    if (this.theme.frost) {
      // Snow drifting past: a few tiny flakes at three depths.
      this.planetX = VIEW_W - 70;
      this.snow = [];
      for (let i = 0; i < 26; i++) this.snow.push(this.newFlake(rand() * VIEW_W));
    }
    this.dustX = 0;
    this.t = 0;
  }

  newFlake(x) {
    const depth = this.rand();
    return {
      x,
      y: this.rand() * VIEW_H,
      vx: 8 + depth * 22,
      vy: 2 + depth * 5,
      color: depth > 0.8 ? '#9fb0d0' : depth > 0.4 ? '#5a6a9a' : '#34406a',
      phase: this.rand() * 6,
    };
  }

  newFarRock(x) {
    const img = FAR_ROCKS[Math.floor(this.rand() * FAR_ROCKS.length)];
    return { x, y: this.rand() * (VIEW_H - img.height), img, speed: 4 + this.rand() * 3 };
  }

  update(dt) {
    this.t += dt;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.x -= s.layer.speed * dt;
      if (s.x < -2) {
        s.x += VIEW_W + 4;
        s.y = this.rand() * VIEW_H;
      }
    }
    for (let i = 0; i < this.farRocks.length; i++) {
      const r = this.farRocks[i];
      r.x -= r.speed * dt;
      if (r.x < -r.img.width) this.farRocks[i] = this.newFarRock(VIEW_W + this.rand() * 40);
    }
    this.sunX -= 0.6 * dt;
    if (this.sunX < -40) this.sunX = VIEW_W + 40;
    this.dustX = (this.dustX + 3 * dt) % VIEW_W;
    if (this.theme.frost) {
      this.planetX -= 0.5 * dt;
      if (this.planetX < -100) this.planetX = VIEW_W + 10;
      for (let i = 0; i < this.snow.length; i++) {
        const f = this.snow[i];
        f.x -= f.vx * dt;
        f.y += (f.vy + Math.sin(this.t * 1.5 + f.phase) * 3) * dt;
        if (f.x < -2 || f.y > VIEW_H + 2) this.snow[i] = { ...this.newFlake(VIEW_W + 2), y: this.rand() * VIEW_H * 0.8 };
      }
    }
    if (this.theme.canyon) {
      this.mesaX = (this.mesaX + 3 * dt) % VIEW_W;
      this.wallX = (this.wallX + 9 * dt) % VIEW_W;
      // Dust devils: little spinning columns of dust drifting along the
      // canyon floor. Pure scenery — they can't hurt you.
      this.devilT -= dt;
      if (this.devilT <= 0) {
        this.devilT = 5 + this.rand() * 6;
        this.devils.push({ x: VIEW_W + 6, h: 14 + this.rand() * 12, t: 0 });
      }
      for (const d of this.devils) {
        d.x -= 14 * dt;
        d.t += dt;
      }
      this.devils = this.devils.filter((d) => d.x > -12);
    }
  }

  draw(ctx, snap) {
    // Space lightens very slightly towards the bottom (Rust Moon has its
    // own dusty sky instead).
    if (this.theme.canyon) ctx.drawImage(makeCanyonSky(), 0, 0);
    else ctx.drawImage(makeSky(this.theme.space), 0, 0, VIEW_W, VIEW_H);

    if (this.theme.frost) ctx.drawImage(makeRingedPlanet(), snap(this.planetX), 14);

    if (this.dust) ctx.drawImage(this.dust, -snap(this.dustX), Math.round(VIEW_H * 0.6));

    if (this.theme.sun) {
      // Distant sun drawn as flat pixel rings (no glow), kept dim so it never
      // hides enemies or shots.
      const sx = snap(this.sunX);
      const low = this.theme.canyon; // Rust Moon: a pale sun low over the mesas
      const sy = low ? 74 : 30;
      ctx.drawImage(makeSun(low ? LOW_SUN : SUN), sx - SUN_SIZE / 2, sy - SUN_SIZE / 2);
    }

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      if (this.theme.canyon && s.y > 56) continue; // only a few stars high in the dusty sky
      const bright = s.layer.speed > 20 && Math.sin(this.t * 3 + s.twinkle) > 0.6;
      ctx.fillStyle = bright ? PAL.cream : s.layer.color;
      const x = snap(s.x);
      const y = snap(s.y);
      ctx.fillRect(x, y, s.layer.size, s.layer.size);
      if (bright) {
        // A twinkle: a tiny cross of half pixels.
        ctx.fillRect(x - FINE, y, FINE * 3, FINE);
        ctx.fillRect(x, y - FINE, FINE, FINE * 3);
      }
    }

    for (const r of this.farRocks) ctx.drawImage(r.img, snap(r.x), snap(r.y));

    if (this.theme.frost) {
      for (const f of this.snow) {
        ctx.fillStyle = f.color;
        ctx.fillRect(snap(f.x), snap(f.y), FINE, FINE);
      }
    }

    if (this.theme.canyon) {
      const ground = VIEW_H - (this.theme.floor || 0);
      ctx.drawImage(this.mesas, -snap(this.mesaX), ground - 34 - 18);
      ctx.drawImage(this.walls, -snap(this.wallX), ground - 44 + 2);
      ctx.fillStyle = '#6b4a3a';
      ctx.beginPath(); // (every grain filled in one go)
      for (const d of this.devils) {
        for (let i = 0; i < d.h; i += 1) {
          const k = i / d.h; // wider at the top
          const half = 1 + k * 4 + Math.sin(d.t * 9 + i) * 1.2;
          const y = ground - 1 - i;
          ctx.rect(snap(d.x - half), y, FINE, FINE);
          ctx.rect(snap(d.x + half), y, FINE, FINE);
          if ((i + Math.floor(d.t * 12)) % 4 === 0) ctx.rect(snap(d.x + Math.sin(d.t * 7 + i) * half), y - FINE, FINE, FINE);
        }
      }
      ctx.fill();
    }
  }
}

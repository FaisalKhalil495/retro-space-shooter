import { rgba } from './detail.js?v=0.38.2';

// The new look's art pipeline (the look sample, after v0.37.0): small 3D
// models drawn as pixel art. A model is a list of triangles, each with a
// material (a ramp of five shades, dark to light) and the name of the part
// it belongs to. renderModel() turns one, seen from any angle, into a
// picture at any fineness (k pixels a game pixel): lit from one side,
// shaded in five steps with an ordered dither between them, a warm rim of
// light on the side facing the level's sun, coloured outlines (each part
// outlined in a darker shade of its own colour, never plain black) and
// lamps that stay bright. Because the same model can be turned, tilted and
// taken apart, ships can bank, spin, flap and tumble as wrecks.

export const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  mix: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

// Turn a point about an axis ('x', 'y' or 'z') by an angle.
export function turn(p, axis, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const [x, y, z] = p;
  if (axis === 'x') return [x, y * c - z * s, y * s + z * c];
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

// ---- building models ----
// A Mesh collects triangles. Every helper takes a material and a part name.
export class Mesh {
  constructor() {
    this.tris = [];
  }

  tri(a, b, c, mat, part) {
    this.tris.push([a, b, c, mat, part]);
    return this;
  }

  quad(a, b, c, d, mat, part) {
    this.tris.push([a, b, c, mat, part], [a, c, d, mat, part]);
    return this;
  }

  // A body of revolution along x: stations [x, half-height, half-width,
  // centre height]; n sides; `mat(station, side, up)` picks each panel's
  // material; pow < 1 squares the section off (crisper panel edges).
  lathe(stations, n, mat, part, { pow = 0.8, caps = true, cz = 0 } = {}) {
    const rings = stations.map(([x, h, w, cy = 0]) => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        pts.push([x, cy + Math.sign(s) * Math.abs(s) ** pow * h, cz + Math.sign(c) * Math.abs(c) ** pow * w]);
      }
      return pts;
    });
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const up = rings[r][i][1] + rings[r][j][1] > 2 * (stations[r][3] || 0);
        const m = typeof mat === 'function' ? mat(r, i, up) : mat;
        const pn = typeof part === 'function' ? part(r, i, up) : part;
        this.quad(rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i], m, pn);
      }
    }
    if (caps) {
      for (const [r, st] of [[0, stations[0]], [rings.length - 1, stations[stations.length - 1]]]) {
        const c = [st[0], st[3] || 0, cz];
        const m = typeof mat === 'function' ? mat(Math.min(r, rings.length - 2), 0, true) : mat;
        const pn = typeof part === 'function' ? part(Math.min(r, rings.length - 2), 0, true) : part;
        for (let i = 0; i < n; i++) this.tri(rings[r][i], rings[r][(i + 1) % n], c, m, pn);
      }
    }
    return this;
  }

  // A box between two corners.
  box(a, b, mat, part) {
    const [x0, y0, z0] = a;
    const [x1, y1, z1] = b;
    const p = (x, y, z) => [x, y, z];
    this.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0), mat, part);
    this.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), mat, part);
    this.quad(p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), p(x0, y1, z0), mat, part);
    this.quad(p(x1, y0, z0), p(x1, y0, z1), p(x1, y1, z1), p(x1, y1, z0), mat, part);
    this.quad(p(x0, y1, z0), p(x1, y1, z0), p(x1, y1, z1), p(x0, y1, z1), mat, part);
    this.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), mat, part);
    return this;
  }

  // A thin plate (a wing, a fin, a blade): four corners and a thickness
  // along `up`. edge: the material of its rim.
  plate(a, b, c, d, up, mat, part, edge = mat) {
    const o = (p) => V.add(p, up);
    this.quad(a, b, c, d, mat, part);
    this.quad(o(a), o(b), o(c), o(d), mat, part);
    this.quad(a, b, o(b), o(a), edge, part);
    this.quad(b, c, o(c), o(b), edge, part);
    this.quad(c, d, o(d), o(c), edge, part);
    this.quad(d, a, o(a), o(d), edge, part);
    return this;
  }

  // A ball (an eye, a dome, a lamp, a joint): `squash` scales [x, y, z].
  ball(c, r, mat, part, { n = 8, m = 5, squash = [1, 1, 1], from = 0, to = Math.PI } = {}) {
    const pt = (i, j) => {
      const th = from + ((to - from) * j) / m; // from the +y pole down
      const ph = (i / n) * Math.PI * 2;
      return [c[0] + Math.sin(th) * Math.cos(ph) * r * squash[0], c[1] + Math.cos(th) * r * squash[1], c[2] + Math.sin(th) * Math.sin(ph) * r * squash[2]];
    };
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) this.quad(pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1), mat, part);
    return this;
  }

  // Another mesh's triangles, moved by fn(point) (and optionally renamed).
  add(mesh, fn = (p) => p, rename = (n) => n) {
    for (const [a, b, c, mat, part] of mesh.tris) this.tris.push([fn(a), fn(b), fn(c), mat, rename(part)]);
    return this;
  }

  // Only the triangles whose part name passes the test.
  only(test) {
    const m = new Mesh();
    m.tris = this.tris.filter((t) => test(t[4]));
    return m;
  }
}

// A lumpy rock: a ball of triangles pushed in and out by a fixed "noise"
// (the same seed always gives the same rock), flat-faced like cut stone.
export function rockMesh(seed, r, detail = 2, mat = 'rock') {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(V.norm);
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let d = 0; d < detail; d++) {
    const mid = new Map();
    const midpoint = (a, b) => {
      const key = a < b ? a + ':' + b : b + ':' + a;
      if (!mid.has(key)) {
        verts.push(V.norm(V.mix(verts[a], verts[b], 0.5)));
        mid.set(key, verts.length - 1);
      }
      return mid.get(key);
    };
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  // Lumps: a few big waves and some small ones, plus two or three dents.
  const h = (n) => {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const waves = [];
  for (let i = 0; i < 7; i++) waves.push([V.norm([h(i * 3) - 0.5, h(i * 3 + 1) - 0.5, h(i * 3 + 2) - 0.5]), 1.5 + h(i + 40) * (i < 3 ? 1.5 : 4.5), (i < 3 ? 0.2 : 0.07) * (0.6 + h(i + 60) * 0.8), h(i + 80) * 6]);
  const dents = [];
  for (let i = 0; i < 3; i++) dents.push([V.norm([h(i + 100) - 0.5, h(i + 110) - 0.5, h(i + 120) - 0.5]), 0.25 + h(i + 130) * 0.2]);
  verts = verts.map((v) => {
    let k = 1;
    for (const [dir, f, amp, ph] of waves) k += Math.sin(V.dot(v, dir) * f + ph) * amp;
    for (const [dir, size] of dents) {
      const d = 1 - V.dot(v, dir);
      if (d < size) k -= (1 - d / size) * 0.16;
    }
    return V.mul(v, r * k);
  });
  const m = new Mesh();
  faces.forEach(([a, b, c], i) => m.tri(verts[a], verts[b], verts[c], mat, 'f' + i));
  return m;
}

// ---- drawing a model as pixel art ----
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hexMix = (a, b, t) => {
  const n = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * t).toString(16).padStart(2, '0')).join('');
};
export { hexMix };

// view: { w, h (the picture's size in game pixels), k (fineness), scale
//   (game pixels per model unit), cx, cy (where the model's origin goes),
//   spin: [[axis, angle], ...] turns applied in order, flip (face left) }
// look: { mats: { name: [5 shades] }, light: [x, y, z], rim: [x, y, z] or
//   null, rimColor, ink (the darkest outline colour), flat: ['glow', ...]
//   (materials that don't shade: lamps), seams (draw lines between parts) }
// Returns a normal-size canvas carrying the sharp one as .hi (like every
// picture in the game), and `flash`, the same picture washed out pale (for
// the blink when something is hit).
let bakes = 0;
// How many pictures have been painted so far (the tests watch for painting
// in the middle of play).
export const bakeCount = () => bakes;
export function renderModel(mesh, view, look) {
  bakes++;
  const k = view.k;
  const W = Math.ceil(view.w * k);
  const H = Math.ceil(view.h * k);
  const zbuf = new Float32Array(W * H).fill(-Infinity);
  const part = new Int32Array(W * H).fill(-1);
  const shade = new Float32Array(W * H);
  const rimOf = new Uint8Array(W * H);
  const matOf = new Array(W * H);
  const partIds = new Map();
  const light = V.norm(look.light || [-0.45, 0.75, 0.55]);
  const rim = look.rim ? V.norm(look.rim) : null;
  const spin = view.spin || [];
  const sc = view.scale * k;
  const ox = view.cx * k;
  const oy = view.cy * k;
  const place = (p) => {
    // (turned to face left first, then tilted: so a craft facing either
    // way is seen a little from above, never from below)
    let q = view.flip ? [-p[0], p[1], -p[2]] : p;
    for (const [axis, ang] of spin) q = turn(q, axis, ang);
    return { x: ox + q[0] * sc, y: oy - q[1] * sc, z: q[2], r: q };
  };
  for (const [a, b, c, mat, pname] of mesh.tris) {
    const A = place(a);
    const B = place(b);
    const C = place(c);
    let n = V.norm(V.cross(V.sub(B.r, A.r), V.sub(C.r, A.r)));
    if (n[2] < 0) n = [-n[0], -n[1], -n[2]]; // face the camera
    const lit = Math.max(0, V.dot(n, light));
    const rimLit = rim && V.dot(n, rim) > 0.5 && n[2] < 0.75 ? 1 : 0;
    let id = partIds.get(pname);
    if (id === undefined) partIds.set(pname, (id = partIds.size));
    const minX = Math.max(0, Math.floor(Math.min(A.x, B.x, C.x)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(A.x, B.x, C.x)));
    const minY = Math.max(0, Math.floor(Math.min(A.y, B.y, C.y)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(A.y, B.y, C.y)));
    const area = (B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y);
    if (Math.abs(area) < 1e-6) continue;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = ((B.x - px) * (C.y - py) - (C.x - px) * (B.y - py)) / area;
        const w1 = ((C.x - px) * (A.y - py) - (A.x - px) * (C.y - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) continue;
        const z = w0 * A.z + w1 * B.z + w2 * C.z;
        const i = y * W + x;
        if (z > zbuf[i]) {
          zbuf[i] = z;
          part[i] = id;
          matOf[i] = mat;
          shade[i] = lit;
          rimOf[i] = rimLit;
        }
      }
    }
  }
  const hi = document.createElement('canvas');
  hi.width = W;
  hi.height = H;
  const c2 = hi.getContext('2d');
  const img = c2.createImageData(W, H);
  const buf = new Uint32Array(img.data.buffer);
  const flat = look.flat || ['glow'];
  const ink = look.ink || '#0b0d18';
  const cache = new Map();
  const col = (mat, key, make) => {
    const id = mat + key;
    let v = cache.get(id);
    if (v === undefined) cache.set(id, (v = rgba(make())));
    return v;
  };
  const seams = look.seams !== false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (part[i] < 0) continue;
      const mat = matOf[i];
      const ramp = look.mats[mat];
      let outer = false;
      let seam = false;
      for (let d = 0; d < 4; d++) {
        const X = x + (d === 0 ? 1 : d === 1 ? -1 : 0);
        const Y = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
        const j = Y * W + X;
        if (X < 0 || Y < 0 || X >= W || Y >= H || part[j] < 0) outer = true;
        else if (part[j] !== part[i] && zbuf[j] < zbuf[i] - 0.01 && matOf[j] !== undefined) seam = true; // (the nearer part keeps its edge)
      }
      if (outer) {
        // A coloured outline: this part's own darkest shade, deepened.
        buf[i] = col(mat, 'o', () => hexMix(ramp[0], ink, 0.55));
        continue;
      }
      if (flat.includes(mat)) {
        buf[i] = col(mat, 'f', () => ramp[ramp.length - 1]);
        continue;
      }
      if (seam && seams && !look.faceted) {
        buf[i] = col(mat, 's', () => hexMix(ramp[0], ink, 0.25));
        continue;
      }
      if (rimOf[i]) {
        buf[i] = col(mat, 'r', () => hexMix(ramp[4], look.rimColor || '#ffd9a0', 0.6));
        continue;
      }
      const d = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
      // (never the very darkest shade on a lit model: that's for outlines' kin)
      const level = Math.max(look.floor ?? 1, Math.min(4, Math.floor((look.base ?? 0.9) + shade[i] * (look.gain ?? 3.9) + d * (look.dither ?? 0.3))));
      buf[i] = col(mat, level, () => ramp[level]);
    }
  }
  c2.putImageData(img, 0, 0);
  const wrap = (sharp) => {
    const canvas = document.createElement('canvas');
    canvas.width = view.w;
    canvas.height = view.h;
    canvas.hi = sharp;
    return canvas;
  };
  const out = wrap(hi);
  // The pale version for the hit blink.
  const fl = document.createElement('canvas');
  fl.width = W;
  fl.height = H;
  const f2 = fl.getContext('2d');
  const fimg = f2.createImageData(W, H);
  const fb = new Uint32Array(fimg.data.buffer);
  const pale = rgba('#fff3dc');
  for (let i = 0; i < buf.length; i++) if (buf[i]) fb[i] = pale;
  f2.putImageData(fimg, 0, 0);
  out.flash = wrap(fl);
  return out;
}

import { PAL } from './config.js?v=0.27.0';

// Your ship as a small 3D model, built from its in-game shape (a long
// pointed nose with the amber stripe, a glass canopy, swept wings with
// amber bands and gun pods, twin tail fins, a glowing engine), lit and
// drawn as pixel art from any angle. Used for the title badge (titleart.js)
// and the link preview.

// Shades for each material, darkest to lightest (our muted palette).
const MAT = {
  hull: ['#1d2540', '#34406a', '#5a6a9a', '#8f9fc4', '#c8d4ec'],
  belly: ['#10142a', '#1d2540', '#2a3456', '#3e4a74', '#5a6a9a'],
  glass: ['#141a2e', '#2a3a58', '#4d6890', '#9fb0d0', '#e6eef7'],
  amber: ['#4a2e1a', '#8a5a2e', '#c98f4a', '#e3a857', '#f2cf8a'],
  metal: ['#141824', '#2a2c38', '#46444d', '#6d6a73', '#a7a4ad'],
  glow: ['#c98f4a', '#e3a857', '#f2cf8a', '#f6dcae', '#efe3cf'],
};

// ---- the model ----
// x runs from the tail (-10) to the nose (+10), y is up, z is to the right.
function buildShip() {
  const tris = []; // [a, b, c, material, part]
  const quad = (a, b, c, d, mat, part) => {
    tris.push([a, b, c, mat, part]);
    tris.push([a, c, d, mat, part]);
  };
  // The fuselage: rings of 10 points along its length.
  const N = 10;
  const stations = [
    // [x, half-width, half-height, centre height]
    [-10.4, 1.7, 1.5, 0.1],
    [-9.5, 2.3, 2.0, 0.1],
    [-6.5, 2.6, 2.2, 0.15],
    [-2.5, 2.4, 2.0, 0.1],
    [1.5, 1.9, 1.6, 0],
    [5, 1.3, 1.1, -0.15],
    [8, 0.65, 0.6, -0.25],
    [10.6, 0.08, 0.08, -0.3],
  ];
  const rings = stations.map(([x, w, h, cy]) => {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      // A slightly flattened, hexagon-ish section (crisp panel edges).
      const c = Math.cos(a);
      const s = Math.sin(a);
      pts.push([x, cy + Math.sign(s) * Math.abs(s) ** 0.8 * h, Math.sign(c) * Math.abs(c) ** 0.8 * w]);
    }
    return pts;
  });
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const a = rings[r][i];
      const b = rings[r][j];
      const c = rings[r + 1][j];
      const d = rings[r + 1][i];
      const up = a[1] + b[1] > 2 * stations[r][3];
      // An amber stripe along the flanks towards the nose (as in the game).
      const side = Math.abs(Math.sin(((i + 0.5) / N) * Math.PI * 2)) < 0.32;
      const mat = side && (r === 4 || r === 5) ? 'amber' : up ? 'hull' : 'belly';
      // (Each length of the body is its own panel, so seams show between.)
      quad(a, b, c, d, mat, 'body' + r + (up ? 'u' : 'd'));
    }
  }
  // The engine: a dark nozzle with a hot glowing core at the back.
  const back = rings[0];
  const centre = [-10.5, 0.1, 0];
  for (let i = 0; i < N; i++) {
    const a = back[i];
    const b = back[(i + 1) % N];
    const ia = [-10.6, centre[1] + (a[1] - centre[1]) * 0.55, a[2] * 0.55];
    const ib = [-10.6, centre[1] + (b[1] - centre[1]) * 0.55, b[2] * 0.55];
    quad(a, b, ib, ia, 'metal', 'nozzle');
    tris.push([ia, ib, [-10.5, centre[1], 0], 'glow', 'core']);
  }
  // The canopy: a long glass bubble on top, a little behind the middle.
  const can = [];
  const CN = 8;
  const cst = [[-5.5, 0], [-4.5, 0.9], [-2.5, 1.25], [0, 1.1], [2, 0.6], [3.2, 0]];
  for (const [x, k] of cst) {
    const top = 2.1;
    const pts = [];
    for (let i = 0; i <= CN; i++) {
      const a = (i / CN) * Math.PI;
      pts.push([x, top - 0.2 + Math.sin(a) * 1.5 * k, Math.cos(a) * 1.35 * Math.max(k, 0.05)]);
    }
    can.push(pts);
  }
  for (let r = 0; r < can.length - 1; r++) {
    for (let i = 0; i < CN; i++) quad(can[r][i], can[r][i + 1], can[r + 1][i + 1], can[r + 1][i], 'glass', 'canopy');
  }
  // Swept wings (a little anhedral), thin, with amber lights at the tips.
  for (const sz of [-1, 1]) {
    const thick = 0.25;
    const root0 = [-8, -0.5, 2.2 * sz];
    const root1 = [2.5, -0.5, 1.8 * sz];
    const tip0 = [-8.8, -1.6, 10.5 * sz];
    const tip1 = [-5.8, -1.5, 10.5 * sz];
    const up = (p) => [p[0], p[1] + thick, p[2]];
    const part = sz < 0 ? 'wingL' : 'wingR';
    const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
    // The top in three panels: inner, an amber band, outer.
    const m0 = mix(root0, tip0, 0.45);
    const m1 = mix(root1, tip1, 0.45);
    const n0 = mix(root0, tip0, 0.55);
    const n1 = mix(root1, tip1, 0.55);
    quad(up(root0), up(root1), up(m1), up(m0), 'hull', part + 'In');
    quad(up(m0), up(m1), up(n1), up(n0), 'amber', part + 'Band');
    quad(up(n0), up(n1), up(tip1), up(tip0), 'hull', part + 'Out');
    quad(root0, root1, tip1, tip0, 'belly', part);
    quad(root1, up(root1), up(tip1), tip1, 'hull', part); // leading edge
    quad(tip0, up(tip0), up(root0), root0, 'belly', part);
    quad(tip1, up(tip1), up(tip0), tip0, 'amber', part + 'Tip');
    // A gun pod under each wing, pointing forward.
    const gz = 4.2 * sz;
    const g = (x, y, z) => [x, y, z];
    const r = 0.35;
    const pod = [[-4, r], [3.5, r], [5, 0.15]];
    for (let s = 0; s < pod.length - 1; s++) {
      const [xa, ra] = pod[s];
      const [xb, rb] = pod[s + 1];
      for (let i = 0; i < 6; i++) {
        const a0 = (i / 6) * Math.PI * 2;
        const a1 = ((i + 1) / 6) * Math.PI * 2;
        quad(
          g(xa, -0.78 + Math.sin(a0) * ra, gz + Math.cos(a0) * ra),
          g(xa, -0.78 + Math.sin(a1) * ra, gz + Math.cos(a1) * ra),
          g(xb, -0.78 + Math.sin(a1) * rb, gz + Math.cos(a1) * rb),
          g(xb, -0.78 + Math.sin(a0) * rb, gz + Math.cos(a0) * rb),
          'metal', 'gun' + sz,
        );
      }
    }
  }
  // Twin tail fins, canted outwards.
  for (const sz of [-1, 1]) {
    const part = 'fin' + sz;
    const b0 = [-9.6, 1.6, 1.3 * sz];
    const b1 = [-5.6, 1.9, 1.1 * sz];
    const t0 = [-10.6, 5.2, 2.5 * sz];
    const t1 = [-9.0, 5.2, 2.3 * sz];
    const off = [0, 0, 0.18 * sz];
    const o = (p) => [p[0] + off[0], p[1] + off[1], p[2] + off[2]];
    quad(b0, b1, t1, t0, 'hull', part);
    quad(o(b0), o(b1), o(t1), o(t0), 'hull', part);
    quad(t0, t1, o(t1), o(t0), 'amber', part); // an amber tip
    quad(b1, t1, o(t1), o(b1), 'hull', part);
  }
  return tris;
}

// ---- drawing it ----
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
function rotate(p, yaw, pitch, roll) {
  let [x, y, z] = p;
  // roll about the ship's length (x), then yaw about y, then pitch about z.
  [y, z] = [y * Math.cos(roll) - z * Math.sin(roll), y * Math.sin(roll) + z * Math.cos(roll)];
  [x, z] = [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
  [x, y] = [x * Math.cos(pitch) - y * Math.sin(pitch), x * Math.sin(pitch) + y * Math.cos(pitch)];
  return [x, y, z];
}

// Draw the ship into a pixel buffer W x H (an ImageData's Uint32 view).
// view: { yaw, pitch, roll, scale, cx, cy, dist }. Returns the screen
// position of the engine (for the flame).
export function renderShip(buf, W, H, view, rgba) {
  const tris = buildShip();
  const zbuf = new Float32Array(W * H).fill(Infinity);
  const part = new Int32Array(W * H).fill(-1);
  const matOf = new Array(W * H);
  const litOf = new Float32Array(W * H);
  const partIds = {};
  const light = norm([-0.45, 0.75, 0.55]); // from the upper left, a little in front
  const toScreen = (p) => {
    const r = rotate(p, view.yaw, view.pitch, view.roll);
    const z = view.dist - r[2]; // the camera looks along -z from +z
    const k = (view.scale * view.dist) / z;
    return { x: view.cx + r[0] * k, y: view.cy - r[1] * k, z, r };
  };
  for (const [a, b, c, mat, pname] of tris) {
    const A = toScreen(a);
    const B = toScreen(b);
    const C = toScreen(c);
    let n = norm(cross(sub(B.r, A.r), sub(C.r, A.r)));
    if (dot(n, [0, 0, 1]) < 0) n = [-n[0], -n[1], -n[2]]; // face the camera
    const lit = mat === 'glow' ? 2 : Math.max(0, dot(n, light));
    const id = partIds[pname] ?? (partIds[pname] = Object.keys(partIds).length);
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
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * A.z + w1 * B.z + w2 * C.z;
        const i = y * W + x;
        if (z < zbuf[i]) {
          zbuf[i] = z;
          part[i] = id;
          matOf[i] = mat;
          litOf[i] = lit;
        }
      }
    }
  }
  // Ink outlines where the ship meets space or one part meets another.
  const ink = rgba(PAL.ink);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (part[i] < 0) continue;
      let edge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx;
        const Y = y + dy;
        const j = Y * W + X;
        if (X < 0 || Y < 0 || X >= W || Y >= H || part[j] < 0) edge = true;
        else if (part[j] !== part[i] && zbuf[j] > zbuf[i]) edge = true; // (the far side gets the line)
      }
      if (edge) {
        buf[i] = ink;
        continue;
      }
      // Light to shade, with an ordered dither between neighbouring
      // shades, so curved surfaces shade smoothly in pixel art.
      const d = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
      const level = Math.max(0, Math.min(4, Math.floor(0.5 + litOf[i] * 3.7 + d * 0.3)));
      buf[i] = rgba(MAT[matOf[i]][level]);
    }
  }
  return { tail: toScreen([-10.6, 0.1, 0]), nose: toScreen([10.6, -0.3, 0]) };
}

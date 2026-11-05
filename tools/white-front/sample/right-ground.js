// The White Front's ground, painted by code at double detail: a walkable
// band of snow seen from slightly above (tracks, wind ripples, rocks, ice
// chunks, craters) and its icy front face (facets, strata, icicles).
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
const C = Object.fromEntries(Object.entries({
  lip: '#ffffff', snow0: '#f6f9fd', snow1: '#e8f0f8', snow2: '#d6e3f0', snow3: '#bccee2', track: '#a9bed6', trackD: '#8ea7c4',
  corn: '#f2f8fd', ice0: '#d6e8f6', ice1: '#a9cbe8', ice2: '#7eaad6', ice3: '#5683b8', ice4: '#3c6299', ice5: '#2a4778', icHi: '#eef6fc',
  rock0: '#6b7180', rock1: '#4d5260', rock2: '#363a46', rock3: '#262933', soot: '#7d8494', soot2: '#9aa3b2',
}).map(([k, v]) => [k, hex(v)]));

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// smooth value noise
function noise1(seed) { const r = rng(seed), v = Array.from({ length: 4096 }, r); return (x) => { const i = Math.floor(x), f = x - i, a = v[i & 4095], b = v[(i + 1) & 4095], t = f * f * (3 - 2 * f); return a + (b - a) * t; }; }

// The ground's shape in game pixels: where the snow band's back edge is, and how deep the band is.
export function shape(seed = 11) {
  const n1 = noise1(seed), n2 = noise1(seed + 7);
  return {
    back: (xg) => 124 + (n1(xg / 46) - 0.5) * 14 + (n2(xg / 13) - 0.5) * 3,
    depth: (xg) => 11 + (n2(xg / 70 + 30) - 0.5) * 3,
  };
}

// Paint a stretch of ground [x0, x0+w) game px into a canvas w*2 x 288 (hi px).
export function paint(x0, w, seed = 11, craters = [], S = shape(seed), loop = false) {
  const W = w * 2, H = 288;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), img = c.createImageData(W, H), d = img.data;
  const put = (x, y, col, a = 255) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; if (a >= 255) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; } else { const f = a / 255; d[i] = d[i] + (col[0] - d[i]) * f; d[i + 1] = d[i + 1] + (col[1] - d[i + 1]) * f; d[i + 2] = d[i + 2] + (col[2] - d[i + 2]) * f; d[i + 3] = Math.max(d[i + 3], a); } };
  const get = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  // hash noise from world position (so painting any stretch gives the same ground)
  const hsh = (x, y) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const nf = noise1(seed + 3), nt = noise1(seed + 5), nc = noise1(seed + 9);
  const backAt = (X) => Math.round(S.back(X / 2) * 2), frontAt = (X) => backAt(X) + Math.round(S.depth(X / 2) * 2);
  // crater dents (game px centre, radius)
  const dent = (X) => { let dd = 0; for (const cr of craters) { const u = (X / 2 - cr.x) / cr.r; if (Math.abs(u) < 1) dd = Math.max(dd, (1 - u * u) * cr.r * 0.5); } return dd; };
  // ice blocks along the face (world positions, so any stretch matches)
  const blocks = [];
  { const r = rng(seed * 13); let bx = -4000; while (bx < 400000) { const w = 14 + Math.floor(r() * 18); blocks.push({ x0: bx, w, f0: 4 + Math.floor(r() * 14), slope: (r() - 0.3) * 0.9, f1: 24 + Math.floor(r() * 20), slope2: (r() - 0.6) * 0.8, tone: (r() - 0.5) * 0.3 }); bx += w; } }
  const blockAt = (X) => { let lo = 0, hi = blocks.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (blocks[m].x0 <= X) lo = m; else hi = m - 1; } return blocks[lo]; };
  const shards = [];
  { const r = rng(seed * 17); let sx = -4000; while (sx < 400000) { sx += 18 + Math.floor(r() * 40); shards.push({ x: sx, w: 7 + Math.floor(r() * 9), h: 14 + Math.floor(r() * 26) }); } }
  const shardAt = (X) => { let lo = 0, hi = shards.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (shards[m].x - 20 <= X) lo = m; else hi = m - 1; } for (let k = Math.max(0, lo - 2); k <= Math.min(shards.length - 1, lo + 2); k++) if (Math.abs(X - shards[k].x) < shards[k].w) return shards[k]; return null; };
  for (let x = 0; x < W; x++) {
    const X = x0 * 2 + x; // world hi-px column
    const yb = backAt(X), yf = frontAt(X), band = yf - yb, dn = Math.round(dent(X) * 2);
    // --- the snow surface
    for (let y = yb; y < yf; y++) {
      const t = (y - yb) / band;
      let col = t < 0.5 ? mixc(C.snow0, C.snow1, t * 2) : mixc(C.snow1, C.snow2, (t - 0.5) * 2);
      const r = hsh(X, y);
      if (r < 0.06) col = mixc(col, C.snow2, 0.6); else if (r > 0.97) col = C.lip;
      put(x, y, col);
    }
    put(x, yb, C.lip); put(x, yb + 1, C.snow0);
    if (hsh(X, 1) < 0.25) put(x, yb - 1, C.snow0); // a soft, uneven back edge
    // wind ripples (sastrugi): short pale-blue dashes along the surface
    for (let k = 0; k < 3; k++) {
      const fy = 0.25 + k * 0.22, yy = Math.round(yb + band * fy + Math.sin(X * 0.05 + k * 2) * 1.2);
      if (nf(X / 9 + k * 50) > 0.62 && (X + k * 3) % 5 < 3) put(x, yy, C.snow2);
    }
    // ski and tyre tracks: pairs of soft grooves, wandering a little, coming and going
    if (nt(X / 140) > 0.42) for (const fy of [0.42, 0.62]) {
      const yy = Math.round(yb + band * fy + (nt(X / 60 + 9) - 0.5) * 4);
      put(x, yy, C.snow3); put(x, yy + 1, C.lip);
      put(x, yy + 3, C.snow3); put(x, yy + 4, C.lip);
    }
    // --- the front edge: a snow cornice
    put(x, yf, C.corn); put(x, yf + 1, C.lip); put(x, yf + 2, C.snow1);
    // --- the ice face below: big angular blocks of ice, lit on the left,
    // with a facet edge across each and pointed shards rising from below
    const blk = blockAt(X), u = (X - blk.x0) / blk.w;
    for (let y = yf + 3; y < H; y++) {
      const dpt = (y - yf) / 70;
      const dk = Math.max(0, Math.min(1, dpt + blk.tone));
      let col;
      if (u < 0.2) col = mixc(C.ice0, C.ice2, dk);
      else if (u > 0.9) col = mixc(C.ice3, C.ice5, dk);
      else col = mixc(C.ice1, C.ice4, dk);
      const fy = yf + blk.f0 + (X - blk.x0) * blk.slope, fy2 = yf + blk.f1 + (X - blk.x0) * blk.slope2;
      if (u >= 0.2 && u <= 0.9) {
        if (y < fy) col = mixc(col, C.ice0, 0.4);
        else if (y > fy2) col = mixc(col, C.ice5, 0.25);
        if (Math.abs(y - fy) < 0.6 || Math.abs(y - fy2) < 0.6) col = mixc(col, C.icHi, 0.75);
      }
      // pointed shards rising from the bottom
      const sh = shardAt(X);
      if (sh && y > H - sh.h * (1 - Math.abs((X - sh.x) / sh.w))) col = (X < sh.x) ? mixc(C.ice0, C.ice1, (H - y) / sh.h) : mixc(C.ice2, C.ice3, (H - y) / sh.h);
      if (sh && Math.abs(X - sh.x) < 1 && y > H - sh.h) col = C.icHi;
      if (hsh(X, y) < 0.003) col = C.icHi;
      put(x, y, col);
    }
    // a dark crack between blocks
    if (X === blk.x0) for (let y = yf + 3; y < H; y++) put(x, y, mixc(C.ice4, C.ice5, (y - yf) / 60));
    // icicles hanging from the cornice
    const ic = hsh(X, 7);
    if (ic < 0.32) {
      const len = 3 + Math.floor(hsh(X, 9) * 10);
      for (let i = 0; i < len; i++) put(x, yf + 3 + i, i < len - 2 ? C.icHi : C.ice0, i < len - 1 ? 255 : 160);
      if (hsh(X, 11) < 0.5) for (let i = 0; i < Math.floor(len * 0.6); i++) put(x + 1, yf + 3 + i, C.ice0);
    }
    // crater dent: the snow scooped out, sooty rim
    if (dn > 0) {
      for (let y = yb; y < yb + dn + 3 && y < yf; y++) {
        const k = (y - yb) / (dn + 3);
        put(x, y, k < 0.7 ? mixc(C.soot, C.snow3, k) : C.soot2);
      }
    }
  }
  c.putImageData(img, 0, 0);
  // --- rocks and ice chunks sitting on the snow (painted over the surface)
  const props = [];
  for (let gx = Math.floor(x0 / 30) * 30 - 30; gx < x0 + w + 30; gx += 30) {
    const rr = rng(seed * 977 + gx * 7919);
    const n = rr() < 0.75 ? 1 + (rr() < 0.35 ? 1 : 0) : 0;
    for (let k = 0; k < n; k++) props.push({ X: gx * 2 + Math.floor(rr() * 56), kind: rr() < 0.5 ? 'rock' : 'ice', s: 0.7 + rr() * 0.7, depthF: 0.2 + rr() * 0.6, j: rr() });
  }
  props.sort((a, b) => a.depthF - b.depthF);
  const rgb = (col) => `rgb(${col.join(',')})`;
  const poly = (pts, col) => { c.fillStyle = rgb(col); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fill(); };
  for (const p of props) {
    const x = p.X - x0 * 2; if (x < -40 || x > W + 40 || (loop && (x < 4 || x + 44 > W))) continue;
    const yb = backAt(p.X), band = frontAt(p.X) - yb, base = Math.round(yb + band * p.depthF + 2), s2 = p.s;
    c.fillStyle = 'rgba(50,85,130,0.28)'; c.beginPath(); c.ellipse(x + 9 * s2, base, 12 * s2, 2.2, 0, 0, 7); c.fill();
    if (p.kind === 'rock') {
      const w2 = 18 * s2, h2 = (9 + p.j * 5) * s2, pk = x + w2 * (0.35 + p.j * 0.3);
      const L = [x, base], R = [x + w2, base], T = [pk, base - h2], M = [pk + w2 * 0.15, base - h2 * 0.55];
      poly([L, T, M, [pk - w2 * 0.05, base]], C.rock1);
      poly([T, R, [pk - w2 * 0.05, base], M], C.rock2);
      poly([L, [x + w2 * 0.15, base - h2 * 0.5], T, [pk - w2 * 0.1, base - h2 * 0.6]], C.rock0);
      // snow cap
      poly([[pk - w2 * 0.28, base - h2 * 0.55], T, [pk + w2 * 0.25, base - h2 * 0.5], [pk + w2 * 0.05, base - h2 * 0.62], [pk - w2 * 0.12, base - h2 * 0.48]], C.snow0);
      c.fillStyle = rgb(C.rock3); c.fillRect(Math.round(x), base - 1, Math.round(w2), 1);
      // a little drift of snow against its foot
      poly([[x - 3, base + 1], [x + w2 * 0.4, base - 2], [x + w2 + 3, base + 1]], C.snow1);
    } else {
      const w2 = 16 * s2, h2 = (11 + p.j * 7) * s2, pk = x + w2 * (0.3 + p.j * 0.3);
      const L = [x, base], R = [x + w2, base], T = [pk, base - h2], S = [pk + w2 * 0.25, base - h2 * 0.7];
      poly([L, T, [pk + w2 * 0.05, base]], C.ice1);
      poly([T, S, R, [pk + w2 * 0.05, base]], C.ice3);
      poly([T, S, [pk + w2 * 0.1, base - h2 * 0.5]], C.ice2);
      c.strokeStyle = rgb(C.icHi); c.lineWidth = 1; c.beginPath(); c.moveTo(L[0] + 1, L[1] - 1); c.lineTo(T[0], T[1] + 1); c.stroke();
      c.fillStyle = rgb(C.ice3); c.fillRect(Math.round(x), base - 1, Math.round(w2), 1);
      poly([[x - 2, base + 1], [x + w2 * 0.5, base - 2], [x + w2 + 2, base + 1]], C.snow1);
    }
  }
  return { canvas: cv, backAt: (xh) => backAt(x0 * 2 + xh), frontAt: (xh) => frontAt(x0 * 2 + xh) };
}

// The same ground made to repeat every L game px: over its last B px the
// shape blends into how it starts, so the end meets the beginning.
export function paintLoop(L = 1024, seed = 11, B = 120) {
  const S = shape(seed);
  const sm = (t) => t * t * (3 - 2 * t);
  const blend = (f) => (xg) => { xg = ((xg % L) + L) % L; if (xg < L - B) return f(xg); const t = sm((xg - (L - B)) / B); return f(xg) * (1 - t) + f(xg - L) * t; };
  const P = { back: blend(S.back), depth: blend(S.depth) };
  return { ...paint(0, L, seed, [], P, true), shape: P };
}

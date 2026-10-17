// Cut ChatGPT's enemy sheet into six game sprites at double detail.
export const SIZES = { drifter: [20, 16], weaver: [22, 18], gunner: [28, 22], seeker: [20, 14], sniper: [28, 14], spinner: [22, 22] };
export const ORDER = ['drifter', 'weaver', 'gunner', 'seeker', 'sniper', 'spinner'];
const INK = [14, 18, 34];

function keyGreen(d) {
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], m = Math.max(r, b);
    if (g > 150 && g - m > 90) d[i + 3] = 0;
    else if (g > m + 20) { d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, 1 - (g - m - 20) / 90))); d[i + 1] = m; }
  }
}

// Shrink by repeated halving (keeps colours honest), then to the exact size.
function shrink(src, w, h) {
  let cur = src;
  while (cur.width / 2 >= w * 1.6 && cur.height / 2 >= h * 1.6) {
    const n = document.createElement('canvas'); n.width = Math.round(cur.width / 2); n.height = Math.round(cur.height / 2);
    const c = n.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(cur, 0, 0, n.width, n.height); cur = n;
  }
  const n = document.createElement('canvas'); n.width = w; n.height = h;
  const c = n.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(cur, 0, 0, w, h);
  return n;
}

// Shrink keeping crisp colour patches: each tiny pixel takes the most common
// colour in its patch of the big picture (not the average, which smudges).
function modeShrink(src, w, h) {
  const sw = src.width, sh = src.height;
  const d = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const x0 = Math.floor((tx * sw) / w), x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * sw) / w));
    const y0 = Math.floor((ty * sh) / h), y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * sh) / h));
    const bins = new Map(); let solid = 0, all = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * sw + x) * 4; all++;
      if (d[i + 3] < 128) continue;
      solid++;
      const key = ((d[i] >> 5) << 6) | ((d[i + 1] >> 5) << 3) | (d[i + 2] >> 5);
      const b = bins.get(key) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; bins.set(key, b);
    }
    const o = (ty * w + tx) * 4;
    if (solid < all * 0.4) continue;
    let best = null; for (const b of bins.values()) if (!best || b[3] > best[3]) best = b;
    out[o] = best[0] / best[3]; out[o + 1] = best[1] / best[3]; out[o + 2] = best[2] / best[3]; out[o + 3] = 255;
  }
  return out;
}

// Shrink by averaging (true colours), then sharpen at the small size and
// reduce to a small set of colours, so edges and panels come out crisp.
function sharpShrink(src, w, h, amount = 0.9, colours = 24) {
  const small = shrink(src, w, h);
  const d = small.getContext('2d').getImageData(0, 0, w, h).data;
  const px = new Float32Array(w * h * 4);
  for (let i = 0; i < d.length; i++) px[i] = d[i];
  // un-premultiply soft edges against themselves
  for (let i = 0; i < w * h; i++) { const a = px[i * 4 + 3] / 255; if (a > 0.05) for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.min(255, px[i * 4 + c] / Math.max(a, 0.5)); }
  const out = new Float32Array(px);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (px[i + 3] < 128) continue;
    for (let c = 0; c < 3; c++) {
      let sum = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = (Y * w + X) * 4; if (px[j + 3] < 128) continue; sum += px[j + c]; n++; }
      if (n) out[i + c] = Math.max(0, Math.min(255, px[i + c] + amount * (px[i + c] - sum / n)));
    }
  }
  // k-means to a few colours
  const pts = []; for (let i = 0; i < w * h; i++) if (out[i * 4 + 3] >= 128) pts.push(i);
  const k = Math.min(colours, pts.length);
  let cent = []; for (let j = 0; j < k; j++) { const i = pts[Math.floor((j * pts.length) / k)]; cent.push([out[i * 4], out[i * 4 + 1], out[i * 4 + 2]]); }
  const asg = new Int32Array(pts.length);
  for (let it = 0; it < 12; it++) {
    pts.forEach((i, n) => { let b = 0, bd = 1e9; cent.forEach((c, j) => { const dd = (out[i * 4] - c[0]) ** 2 + (out[i * 4 + 1] - c[1]) ** 2 + (out[i * 4 + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; b = j; } }); asg[n] = b; });
    const sum = cent.map(() => [0, 0, 0, 0]);
    pts.forEach((i, n) => { const s2 = sum[asg[n]]; s2[0] += out[i * 4]; s2[1] += out[i * 4 + 1]; s2[2] += out[i * 4 + 2]; s2[3]++; });
    cent = cent.map((c, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c));
  }
  const res = new Uint8ClampedArray(w * h * 4);
  pts.forEach((i, n) => { const c = cent[asg[n]]; res[i * 4] = c[0]; res[i * 4 + 1] = c[1]; res[i * 4 + 2] = c[2]; res[i * 4 + 3] = 255; });
  return res;
}

// Shrink keeping what matters on dark armour: ember glow wins its patch even
// when small, snow only where it lies on a top edge, and the gunmetal is
// lifted out of near-black so its plates read on a phone.
function armyShrink(src, w, h, info) {
  const sw = src.width, sh = src.height;
  const d = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const out = new Uint8ClampedArray(w * h * 4), kind = new Uint8Array(w * h); // 1 metal, 2 ember, 3 snow
  const lift = (v) => 255 * Math.pow(v / 255, 0.6);
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const x0 = Math.floor((tx * sw) / w), x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * sw) / w));
    const y0 = Math.floor((ty * sh) / h), y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * sh) / h));
    let all = 0, solid = 0; const em = [0, 0, 0, 0], sn = [0, 0, 0, 0]; const bins = new Map();
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * sw + x) * 4; all++; if (d[i + 3] < 128) continue; solid++;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > 170 && r - b > 90 && g > 50) { em[0] += r; em[1] += g; em[2] += b; em[3]++; continue; }
      if (r > 195 && g > 200 && b > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 40) { sn[0] += r; sn[1] += g; sn[2] += b; sn[3]++; continue; }
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bb = bins.get(key) || [0, 0, 0, 0]; bb[0] += r; bb[1] += g; bb[2] += b; bb[3]++; bins.set(key, bb);
    }
    const o = (ty * w + tx) * 4, k = ty * w + tx;
    if (solid < all * 0.4) continue;
    out[o + 3] = 255;
    if (em[3] >= solid * 0.1) { out[o] = Math.min(255, em[0] / em[3] + 20); out[o + 1] = Math.min(255, em[1] / em[3] + 10); out[o + 2] = em[2] / em[3]; kind[k] = 2; continue; }
    let best = null; for (const bb of bins.values()) if (!best || bb[3] > best[3]) best = bb;
    if (sn[3] >= solid * 0.5 || !best) { out[o] = 240; out[o + 1] = 245; out[o + 2] = 250; kind[k] = 3; continue; }
    out[o] = lift(best[0] / best[3]); out[o + 1] = lift(best[1] / best[3]); out[o + 2] = Math.min(255, lift(best[2] / best[3]) + 8); kind[k] = 1;
  }
  // snow only on top edges (else it reads as speckle): a snow pixel needs open air or snow above
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x; if (kind[k] !== 3) continue;
    const up = y > 0 ? kind[k - w] : 0, upA = y > 0 ? out[(k - w) * 4 + 3] : 0;
    if (upA && up !== 3) { kind[k] = 1; out[k * 4] = 150; out[k * 4 + 1] = 158; out[k * 4 + 2] = 172; }
  }
  // a lit edge along the top of the metal
  for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x; if (kind[k] !== 1 || out[(k - w) * 4 + 3]) continue;
    for (let c = 0; c < 3; c++) out[k * 4 + c] = Math.min(255, out[k * 4 + c] + 34);
  }
  if (info) info.kind = kind;
  return out;
}

// Sharp version: the same reading of each patch (ember wins, snow only on
// top edges), but the armour is the patch's average brightness sorted into
// five fixed tones, so plates come out as clean bands of one colour instead
// of noisy near-blacks; then lone pixels are cleaned up.
export let SHARPEN = 0.9;
export const setSharpen = (v) => { SHARPEN = v; };
const ARMOUR = [[20, 22, 28], [38, 42, 51], [64, 70, 83], [104, 113, 129], [158, 167, 182]];
const EMBER = [[122, 48, 24], [194, 90, 36], [233, 143, 62], [246, 207, 134]];
function armySharp(src, w, h) {
  const sw = src.width, sh = src.height;
  const d = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const kind = new Uint8Array(w * h), lum = new Float32Array(w * h), eml = new Float32Array(w * h);
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const x0 = Math.floor((tx * sw) / w), x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * sw) / w));
    const y0 = Math.floor((ty * sh) / h), y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * sh) / h));
    let all = 0, solid = 0, ne = 0, ns = 0, nm = 0, sl = 0, se = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * sw + x) * 4; all++; if (d[i + 3] < 128) continue; solid++;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > 170 && r - b > 90 && g > 50) { ne++; se += 0.6 * r + 0.4 * g; continue; }
      if (r > 195 && g > 200 && b > 205 && Math.max(r, g, b) - Math.min(r, g, b) < 40) { ns++; continue; }
      nm++; sl += 0.3 * r + 0.59 * g + 0.11 * b;
    }
    const k = ty * w + tx;
    if (solid < all * 0.4) continue;
    if (ne >= solid * 0.1) { kind[k] = 2; eml[k] = se / ne; continue; }
    if (ns >= solid * 0.5 || !nm) { kind[k] = 3; continue; }
    kind[k] = 1; lum[k] = sl / nm;
  }
  // sharpen: push each patch away from its neighbours' average, so plate
  // edges and seams stand out before the tones are chosen
  const sharp = Float32Array.from(lum);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x; if (kind[k] !== 1) continue;
    let s2 = 0, n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (kind[j] !== 1) continue; s2 += lum[j]; n++;
    }
    if (n) sharp[k] = lum[k] + SHARPEN * (lum[k] - s2 / n);
  }
  lum.set(sharp);
  // tone thresholds from this sprite's own spread of brightness
  const ls = []; for (let k = 0; k < w * h; k++) if (kind[k] === 1) ls.push(lum[k]);
  ls.sort((a, b) => a - b);
  const q = (f) => ls[Math.min(ls.length - 1, Math.floor(f * ls.length))] ?? 0;
  const cut = [q(0.3), q(0.62), q(0.86), q(0.97)];
  const tone = new Int8Array(w * h).fill(-1);
  for (let k = 0; k < w * h; k++) if (kind[k] === 1) { let t = 0; while (t < 4 && lum[k] > cut[t]) t++; tone[k] = t; }
  // snow only on top edges; elsewhere it becomes the light armour tone
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x; if (kind[k] !== 3) continue;
    if (y > 0 && kind[k - w] && kind[k - w] !== 3) { kind[k] = 1; tone[k] = 3; }
  }
  // clean lone tones: a pixel unlike all its four neighbours takes their majority tone
  const t2 = Int8Array.from(tone);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; if (kind[k] !== 1) continue;
    const nb = [k - 1, k + 1, k - w, k + w].filter((j) => kind[j] === 1).map((j) => tone[j]);
    if (nb.length < 3 || nb.includes(tone[k])) continue;
    const cnt = {}; for (const t of nb) cnt[t] = (cnt[t] || 0) + 1;
    const [bt, bc] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; if (bc >= 2) t2[k] = +bt;
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x, o = k * 4; if (!kind[k]) continue;
    let c;
    if (kind[k] === 2) { const e = eml[k]; c = EMBER[e > 225 ? 3 : e > 195 ? 2 : e > 160 ? 1 : 0]; }
    else if (kind[k] === 3) c = [236, 242, 248];
    else { let t = t2[k]; if (y > 0 && !kind[k - w] && t < 3) t = Math.min(4, t + 2); c = ARMOUR[t]; } // lit top edge
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  }
  return out;
}

// Sharp, same colours: yesterday's lifted colours, sharpened (each armour
// pixel pushed away from its neighbours' average, so plates and seams stand
// out), then reduced to this sprite's own ten armour colours (no noise), lone
// pixels cleaned, ember and frost untouched.
function armySharpColour(src, w, h, amount = 0.4, colours = 8) {
  const info = {}, d = armyShrink(src, w, h, info), kind = info.kind;
  const f = new Float32Array(d.length); for (let i = 0; i < d.length; i++) f[i] = d[i];
  const g = new Float32Array(f);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x; if (kind[k] !== 1) continue;
    const nb = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && kind[Y * w + X] === 1) nb.push(Y * w + X); }
    if (!nb.length) continue;
    for (let c = 0; c < 3; c++) { let m = 0; for (const j of nb) m += f[j * 4 + c]; m /= nb.length; g[k * 4 + c] = Math.max(0, Math.min(255, f[k * 4 + c] + amount * (f[k * 4 + c] - m))); }
  }
  // k-means on the armour pixels only
  const pts = []; for (let k = 0; k < w * h; k++) if (kind[k] === 1) pts.push(k);
  const K = Math.min(colours, pts.length);
  const byL = pts.slice().sort((a, b) => (g[a * 4] + g[a * 4 + 1] + g[a * 4 + 2]) - (g[b * 4] + g[b * 4 + 1] + g[b * 4 + 2]));
  let cent = []; for (let j = 0; j < K; j++) { const k = byL[Math.floor(((j + 0.5) * byL.length) / K)]; cent.push([g[k * 4], g[k * 4 + 1], g[k * 4 + 2]]); }
  const asg = new Int32Array(pts.length);
  for (let it = 0; it < 14; it++) {
    pts.forEach((k, n) => { let b = 0, bd = 1e9; cent.forEach((c, j) => { const dd = (g[k * 4] - c[0]) ** 2 + (g[k * 4 + 1] - c[1]) ** 2 + (g[k * 4 + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; b = j; } }); asg[n] = b; });
    const sum = cent.map(() => [0, 0, 0, 0]);
    pts.forEach((k, n) => { const s2 = sum[asg[n]]; s2[0] += g[k * 4]; s2[1] += g[k * 4 + 1]; s2[2] += g[k * 4 + 2]; s2[3]++; });
    cent = cent.map((c, j) => (sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c));
  }
  const lab = new Int32Array(w * h).fill(-1); pts.forEach((k, n) => { lab[k] = asg[n]; });
  // clean lone pixels: unlike all four neighbours -> their majority colour
  let lab2 = Int32Array.from(lab);
  for (let pass = 0; pass < 2; pass++) {
    const src2 = Int32Array.from(lab2);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const k = y * w + x; if (src2[k] < 0) continue;
      const nb = [k - 1, k + 1, k - w, k + w].map((j) => src2[j]).filter((v) => v >= 0);
      if (nb.length < 3 || nb.includes(src2[k])) continue;
      const cnt = {}; for (const v of nb) cnt[v] = (cnt[v] || 0) + 1;
      const [bv, bc] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; if (bc >= 2) lab2[k] = +bv;
    }
  }
  const out = new Uint8ClampedArray(d);
  for (let k = 0; k < w * h; k++) if (lab2[k] >= 0) { const c = cent[lab2[k]]; out[k * 4] = c[0]; out[k * 4 + 1] = c[1]; out[k * 4 + 2] = c[2]; }
  return out;
}

// Remove lone stray pixels: a pixel unlike all four neighbours takes the
// colour most of them share (keeps edges, cleans the noise).
function despeckle(d, w, h) {
  const o = new Uint8ClampedArray(d);
  const same = (i, j) => Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) < 40;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4; if (d[i + 3] < 128) continue;
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ((y + dy) * w + x + dx) * 4).filter((j) => d[j + 3] >= 128);
    if (nb.length < 4 || nb.some((j) => same(i, j))) continue;
    let best = nb[0], bc = 0;
    for (const j of nb) { const c = nb.filter((k) => same(j, k)).length; if (c > bc) { bc = c; best = j; } }
    if (bc >= 2) for (let ch = 0; ch < 3; ch++) o[i + ch] = d[best + ch];
  }
  return o;
}

export async function cut(src, scale = 1, method = 'mode', order = ORDER, sizes = SIZES) {
  const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const W = img.width, H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const id = c.getImageData(0, 0, W, H); keyGreen(id.data); c.putImageData(id, 0, 0);
  // Find the six pieces: connected solid areas (on a 1/4 grid for speed).
  const S = 4, gw = Math.ceil(W / S), gh = Math.ceil(H / S), solid = new Uint8Array(gw * gh);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (id.data[(y * W + x) * 4 + 3] > 128) solid[((y / S) | 0) * gw + ((x / S) | 0)] = 1;
  const lab = new Int32Array(gw * gh).fill(-1), comps = [];
  for (let s = 0; s < gw * gh; s++) {
    if (!solid[s] || lab[s] >= 0) continue;
    const q = [s]; lab[s] = comps.length; let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    while (q.length) {
      const p = q.pop(), px = p % gw, py = (p / gw) | 0; n++;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = px + dx, Y = py + dy; if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
        const t = Y * gw + X; if (solid[t] && lab[t] < 0) { lab[t] = comps.length; q.push(t); }
      }
    }
    comps.push({ n, x0, y0, x1, y1, id: comps.length });
  }
  const big = comps.filter((k) => k.n > 300).sort((a, b) => b.n - a.n).slice(0, order.length);
  const owner = new Int32Array(comps.length).fill(-1);
  for (const b of big) owner[b.id] = b.id;
  // small bits (icicles, antennas, flames) join the nearest big piece
  for (const k of comps) {
    if (big.includes(k) || k.n < 3) continue;
    let best = null, bd = 1e9;
    for (const b of big) { const dx = Math.max(0, b.x0 - k.x1, k.x0 - b.x1), dy = Math.max(0, b.y0 - k.y1, k.y0 - b.y1); const dd = dx + dy; if (dd < bd) { bd = dd; best = b; } }
    if (best && bd < 6) { owner[k.id] = best.id; best.x0 = Math.min(best.x0, k.x0); best.y0 = Math.min(best.y0, k.y0); best.x1 = Math.max(best.x1, k.x1); best.y1 = Math.max(best.y1, k.y1); }
  }
  // rows of the sheet (by centre height, in thirds), then left to right
  const band = (k) => Math.floor(((k.y0 + k.y1) / 2) / (gh / 3));
  big.sort((a, b) => band(a) - band(b) || a.x0 - b.x0);
  const out = {};
  big.forEach((b, i) => {
    const name = order[i];
    const bx = b.x0 * S, by = b.y0 * S, bw = (b.x1 - b.x0 + 1) * S, bh = (b.y1 - b.y0 + 1) * S;
    const crop = document.createElement('canvas'); crop.width = bw; crop.height = bh;
    const cc = crop.getContext('2d'); cc.drawImage(cv, bx, by, bw, bh, 0, 0, bw, bh);
    // keep only this piece's own pixels (a neighbour may reach into its box)
    const cd = cc.getImageData(0, 0, bw, bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const L = lab[(((by + y) / S) | 0) * gw + (((bx + x) / S) | 0)];
      if (L < 0 || owner[L] !== b.id) cd.data[(y * bw + x) * 4 + 3] = 0;
    }
    cc.putImageData(cd, 0, 0);
    const TW = Math.round(sizes[name][0] * scale), TH = Math.round(sizes[name][1] * scale);
    // fit inside the box, leaving 1 pixel all round for the outline
    const k = Math.min((TW - 2) / bw, (TH - 2) / bh), w = Math.max(1, Math.round(bw * k)), h = Math.max(1, Math.round(bh * k));
    const sd = method === 'sharp-colour' ? armySharpColour(crop, w, h) : method === 'sharp-army' ? armySharp(crop, w, h) : method === 'army' ? despeckle(armyShrink(crop, w, h), w, h) : method === 'mode' ? despeckle(modeShrink(crop, w, h), w, h) : method === 'avg' ? (() => { const d = shrink(crop, w, h).getContext('2d').getImageData(0, 0, w, h).data; return d; })() : sharpShrink(crop, w, h);
    const fin = document.createElement('canvas'); fin.width = TW; fin.height = TH;
    const fc = fin.getContext('2d'), fd = fc.createImageData(TW, TH);
    const ox = Math.floor((TW - w) / 2), oy = Math.floor((TH - h) / 2);
    const solidAt = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sd[(y * w + x) * 4 + 3] >= 110;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!solidAt(x, y)) continue;
      const s = (y * w + x) * 4, o = ((y + oy) * TW + x + ox) * 4, a = sd[s + 3] / 255;
      // un-premultiply the soft edge, lift the contrast a little
      for (let ch = 0; ch < 3; ch++) { let v = sd[s + ch] / Math.max(a, 0.4); v = (v - 128) * 1.04 + 128; fd.data[o + ch] = Math.max(0, Math.min(255, v)); }
      fd.data[o + 3] = 255;
    }
    // a one-pixel ink outline, like every sprite in the game
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (solidAt(x, y)) continue;
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solidAt(x + dx, y + dy))) continue;
      const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= TW || Y >= TH) continue;
      const o = (Y * TW + X) * 4; fd.data[o] = INK[0]; fd.data[o + 1] = INK[1]; fd.data[o + 2] = INK[2]; fd.data[o + 3] = 255;
    }
    fc.putImageData(fd, 0, 0);
    out[name] = { canvas: fin, crop };
  });
  return out;
}

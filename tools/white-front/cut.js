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

export async function cut(src, scale = 1) {
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
  const big = comps.filter((k) => k.n > 300).sort((a, b) => b.n - a.n).slice(0, 6);
  const owner = new Int32Array(comps.length).fill(-1);
  for (const b of big) owner[b.id] = b.id;
  // small bits (icicles, antennas, flames) join the nearest big piece
  for (const k of comps) {
    if (big.includes(k) || k.n < 3) continue;
    let best = null, bd = 1e9;
    for (const b of big) { const dx = Math.max(0, b.x0 - k.x1, k.x0 - b.x1), dy = Math.max(0, b.y0 - k.y1, k.y0 - b.y1); const dd = dx + dy; if (dd < bd) { bd = dd; best = b; } }
    if (best && bd < 6) { owner[k.id] = best.id; best.x0 = Math.min(best.x0, k.x0); best.y0 = Math.min(best.y0, k.y0); best.x1 = Math.max(best.x1, k.x1); best.y1 = Math.max(best.y1, k.y1); }
  }
  big.sort((a, b) => ((a.y0 + a.y1) / 2 > gh / 2) - ((b.y0 + b.y1) / 2 > gh / 2) || a.x0 - b.x0);
  const out = {};
  big.forEach((b, i) => {
    const name = ORDER[i];
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
    const TW = Math.round(SIZES[name][0] * scale), TH = Math.round(SIZES[name][1] * scale);
    // fit inside the box, leaving 1 pixel all round for the outline
    const k = Math.min((TW - 2) / bw, (TH - 2) / bh), w = Math.max(1, Math.round(bw * k)), h = Math.max(1, Math.round(bh * k));
    const sd = modeShrink(crop, w, h);
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

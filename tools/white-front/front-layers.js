// The White Front's two painted layers (from ChatGPT's front-line picture,
// split by ChatGPT): the far view (sky, ring, planet, sun, mountains) and the
// front line (glacier wall, bunkers, wrecks, smoke) on green, cut out and
// made to repeat. Sizes are in double-detail pixels (the screen is 416x288).
const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// shrink by halving (keeps colours honest), then to the exact size
function shrink(src, w, h) {
  let cur = src;
  while (cur.width / 2 >= w * 1.4 && cur.height / 2 >= h * 1.4) {
    const n = canvas(Math.round(cur.width / 2), Math.round(cur.height / 2)), c = n.getContext('2d');
    c.imageSmoothingQuality = 'high'; c.drawImage(cur, 0, 0, n.width, n.height); cur = n;
  }
  const n = canvas(w, h), c = n.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(cur, 0, 0, w, h);
  return n;
}

export const FAR_K = 288 / 941; // the far view fills the screen's height
export const LINE_K = 0.35;     // the front line's scale
export const LINE_Y = 140;      // where the front line's band top (source row 300) sits on screen

export async function build(farSrc, lineSrc) {
  // ---- the far view: one picture, panned very slowly
  const fi = await load(farSrc);
  const far = shrink(fi, Math.round(fi.width * FAR_K), 288);
  // ---- the front line: green keyed out, shrunk, the ends joined so it repeats
  const li = await load(lineSrc);
  const W = li.width, H = li.height, full = canvas(W, H), fc = full.getContext('2d');
  fc.drawImage(li, 0, 0);
  const id = fc.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], m = Math.max(r, b);
    if (g > 150 && g - m > 90) d[i + 3] = 0;
    else if (g > m + 20) { d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, 1 - (g - m - 20) / 90))); d[i + 1] = m; }
  }
  fc.putImageData(id, 0, 0);
  const SW = Math.round(W * LINE_K), SH = Math.round(H * LINE_K);
  const small = shrink(full, SW, SH), a = small.getContext('2d').getImageData(0, 0, SW, SH).data;
  // the join: the two strips that look most alike (ice and snow rows only)
  const O = 36, y0 = Math.round(380 * LINE_K), y1 = Math.round(590 * LINE_K);
  let best = null;
  for (let S0 = 0; S0 < 120; S0 += 2) for (let E0 = SW - O - 120; E0 <= SW - O; E0 += 2) {
    let diff = 0;
    for (let x = 0; x < O; x += 2) for (let y = y0; y < y1; y += 2) {
      const p = (y * SW + S0 + x) * 4, q = (y * SW + E0 + x) * 4;
      diff += Math.abs(a[p] - a[q]) + Math.abs(a[p + 1] - a[q + 1]) + Math.abs(a[p + 2] - a[q + 2]) + Math.abs(a[p + 3] - a[q + 3]);
    }
    if (!best || diff < best.diff) best = { S0, E0, diff };
  }
  const { S0, E0 } = best, TW = E0 - S0;
  const top = Math.round(30 * LINE_K), TH = Math.round(600 * LINE_K) - top; // rows kept: smoke top to the snow line
  const tile = canvas(TW, TH), t = tile.getContext('2d'); t.drawImage(small, -S0, -top);
  const td = t.getImageData(0, 0, TW, TH);
  for (let y = 0; y < TH; y++) for (let x = 0; x < O; x++) {
    const f = x / O, i = (y * TW + x) * 4, p = ((y + top) * SW + S0 + x) * 4, q = ((y + top) * SW + E0 + x) * 4;
    for (let ch = 0; ch < 4; ch++) td.data[i + ch] = Math.round(a[q + ch] * (1 - f) + a[p + ch] * f);
  }
  // the smoke plume at the picture's left edge was cut off by its border:
  // fade it out towards the join so the repeat shows no hard edge
  const plumeRows = Math.round(300 * LINE_K) - top, FADE = 90;
  for (let y = 0; y < plumeRows; y++) for (let x = 0; x < FADE; x++) {
    const i = (y * TW + x) * 4, k = x / FADE; td.data[i + 3] = Math.round(td.data[i + 3] * k * k);
  }
  t.putImageData(td, 0, 0);
  // where the fires are (for flicker and fresh smoke), on a coarse grid
  const fires = [];
  for (let gy = 0; gy < TH; gy += 5) for (let gx = 0; gx < TW; gx += 5) {
    let n = 0;
    for (let y = gy; y < Math.min(TH, gy + 5); y++) for (let x = gx; x < Math.min(TW, gx + 5); x++) {
      const i = (y * TW + x) * 4, r = td.data[i], g = td.data[i + 1], b = td.data[i + 2];
      if (td.data[i + 3] > 200 && r > 200 && g > 100 && b < 110 && r - b > 110) n++;
    }
    if (n >= 3) fires.push([gx + 2, gy + 2, n]);
  }
  // the anti-aircraft guns' muzzles (measured on the source picture)
  const toTile = ([x, y]) => [x * LINE_K - S0, y * LINE_K - top];
  const inTile = ([x]) => x > 2 && x < TW - 2;
  const guns = [[472, 304], [695, 313], [940, 330], [1178, 350], [1483, 335]].map(toTile).filter(inTile);
  const radars = [[108, 318], [1320, 345]].map(toTile).filter(inTile);
  return { far, tile, fires, guns, radars, lineY: LINE_Y - (300 * LINE_K - top), S0, E0 };
}

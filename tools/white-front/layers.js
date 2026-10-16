// Turn the ChatGPT far background into game layers: a scrolling landscape
// tile (sun and ships removed, edges blended so it repeats) and ship cut-outs.
export async function build(src) {
  const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const W = img.width, H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const id = c.getImageData(0, 0, W, H), d = id.data;
  const at = (x, y) => (y * W + x) * 4;
  const skyLike = (i) => d[i + 2] > d[i] + 40 && d[i + 2] > 170 && d[i] < 200;
  // The sky's colour on each row (median of sky-like pixels).
  const skyRow = [];
  for (let y = 0; y < 420; y++) {
    const rs = [], gs = [], bs = [];
    for (let x = 0; x < W; x += 3) { const i = at(x, y); if (skyLike(i)) { rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); } }
    const med = (a) => a.sort((p, q) => p - q)[a.length >> 1] ?? 0;
    skyRow.push(rs.length > 20 ? [med(rs), med(gs), med(bs)] : skyRow[y - 1]);
  }
  const ships = [[235, 105, 290, 135], [690, 170, 180, 90], [925, 235, 145, 80], [1340, 252, 120, 80]];
  const smoke = [[440, 0, 430, 240]];
  const sun = [1015, 15, 330, 270];
  const notSky = (i, y) => { const s = skyRow[y]; return Math.abs(d[i] - s[0]) + Math.abs(d[i + 1] - s[1]) + Math.abs(d[i + 2] - s[2]) > 36; };
  const cloud = (i) => d[i] > 200 && d[i + 1] > 210 && d[i + 2] > 225 && d[i + 2] - d[i] < 45;
  const shipPix = (i) => !cloud(i) || (d[i] > d[i + 2]); // dark hulls, orange flames
  // Cut the ships out into their own pictures, then paint sky where they were.
  const cut = [];
  for (const [bx, by, bw, bh] of ships) {
    const s = document.createElement('canvas'); s.width = bw; s.height = bh;
    const sc = s.getContext('2d'), sd = sc.createImageData(bw, bh);
    const mask = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const i = at(bx + x, by + y); if (notSky(i, by + y) && shipPix(i)) mask[y * bw + x] = 1; }
    // grow the mask by 2 pixels so no rim of ship is left behind
    const grow = mask.slice();
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (mask[y * bw + x]) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < bw && Y < bh) grow[Y * bw + X] = 1; }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = at(bx + x, by + y), o = (y * bw + x) * 4;
      if (mask[y * bw + x]) { sd.data[o] = d[i]; sd.data[o + 1] = d[i + 1]; sd.data[o + 2] = d[i + 2]; sd.data[o + 3] = 255; }
      if (grow[y * bw + x]) { const s2 = skyRow[by + y]; d[i] = s2[0]; d[i + 1] = s2[1]; d[i + 2] = s2[2]; }
    }
    sc.putImageData(sd, 0, 0); cut.push({ canvas: s, x: bx, y: by });
  }
  for (const [bx, by, bw, bh] of smoke) for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) {
    const i = at(x, y); if (notSky(i, y) && !cloud(i)) { const s = skyRow[y]; d[i] = s[0]; d[i + 1] = s[1]; d[i + 2] = s[2]; }
  }
  // The sun, its halo and sun dogs: everything within reach of it becomes sky.
  void sun;
  for (let y = 0; y < 300; y++) for (let x = 990; x < 1370; x++) {
    const r = Math.hypot(x - 1175, y - 150);
    if (r < 142 || (Math.abs(y - 150) < 22 && Math.abs(Math.abs(x - 1175) - 150) < 40)) { const i = at(x, y), s = skyRow[y]; d[i] = s[0]; d[i + 1] = s[1]; d[i + 2] = s[2]; }
  }
  c.putImageData(id, 0, 0);
  // Shrink to the game: 288 tall at double detail.
  const k = 288 / H, SW = Math.round(W * k);
  const small = document.createElement('canvas'); small.width = SW; small.height = 288;
  const s2 = small.getContext('2d'); s2.imageSmoothingQuality = 'high'; s2.drawImage(cv, 0, 0, SW, 288);
  // Blend the two ends so the picture repeats with no seam.
  // (the join sits where no bunker stands, so none is blended into a ghost)
  const O = 40, S0 = 44, E0 = 331, TW = E0 - S0;
  const tile = document.createElement('canvas'); tile.width = TW; tile.height = 288;
  const t = tile.getContext('2d'); t.drawImage(small, -S0, 0);
  const a = s2.getImageData(0, 0, SW, 288).data, td = t.getImageData(0, 0, TW, 288);
  for (let y = 0; y < 288; y++) for (let x = 0; x < O; x++) {
    const f = x / O, i = (y * TW + x) * 4, p = (y * SW + S0 + x) * 4, q = (y * SW + E0 + x) * 4;
    for (let ch = 0; ch < 3; ch++) td.data[i + ch] = Math.round(a[q + ch] * (1 - f) + a[p + ch] * f);
  }
  t.putImageData(td, 0, 0);
  const shipsSmall = cut.map(({ canvas, x, y }) => {
    const w = Math.max(1, Math.round(canvas.width * k)), h = Math.max(1, Math.round(canvas.height * k));
    const s = document.createElement('canvas'); s.width = w; s.height = h;
    const sc = s.getContext('2d'); sc.imageSmoothingQuality = 'high'; sc.drawImage(canvas, 0, 0, w, h);
    return { canvas: s, x: x * k, y: y * k };
  });
  return { tile, ships: shipsSmall, full: cv };
}

// The near ground: green cut away (with the green fringe taken off the
// edges), shrunk to the same scale as the far picture, the ends blended so
// it repeats, and the height of its top edge in every column (what you crash into).
export async function buildGround(src, k = 288 / 1024) {
  const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const W = img.width, H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const id = c.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], m = Math.max(r, b);
    if (g > 150 && g - m > 90) d[i + 3] = 0; // the green
    else if (g > m + 20) { // a green-tinged edge: take the green out, make it see-through in part
      d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, 1 - (g - m - 20) / 90)));
      d[i + 1] = m;
    }
  }
  c.putImageData(id, 0, 0);
  const SW = Math.round(W * k), SH = Math.round(H * k);
  const small = document.createElement('canvas'); small.width = SW; small.height = SH;
  const s = small.getContext('2d'); s.imageSmoothingQuality = 'high'; s.drawImage(cv, 0, 0, SW, SH);
  // Blend the ends (the join avoids the rocks and the wreck).
  const f = k / (288 / 1024); // (the join points were chosen at the first scale)
  const O = Math.round(24 * f), S0 = Math.round(54 * f), E0 = Math.min(Math.round(408 * f), SW - O), TW = E0 - S0;
  const tile = document.createElement('canvas'); tile.width = TW; tile.height = SH;
  const t = tile.getContext('2d'); t.drawImage(small, -S0, 0);
  const a = s.getImageData(0, 0, SW, SH).data, td = t.getImageData(0, 0, TW, SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < O; x++) {
    const f = x / O, i = (y * TW + x) * 4, p = (y * SW + S0 + x) * 4, q = (y * SW + E0 + x) * 4;
    for (let ch = 0; ch < 4; ch++) td.data[i + ch] = Math.round(a[q + ch] * (1 - f) + a[p + ch] * f);
  }
  t.putImageData(td, 0, 0);
  // The top edge, column by column (first fairly solid pixel).
  const top = [];
  for (let x = 0; x < TW; x++) { let y = 0; while (y < SH && td.data[(y * TW + x) * 4 + 3] < 128) y++; top.push(y); }
  return { tile, top };
}

// Ground seen from slightly above (a walkable snow band on top, its front
// face below). Green cut away, shrunk, and repeated with the join placed
// where the two ends look most alike. Returns the band's back edge per
// column and how deep the snow band is.
export async function buildGround2(src, k = 0.23) {
  const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
  const W = img.width, H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const id = c.getImageData(0, 0, W, H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], m = Math.max(r, b);
    if (g > 150 && g - m > 90) d[i + 3] = 0;
    else if (g > m + 20) { d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, 1 - (g - m - 20) / 90))); d[i + 1] = m; }
  }
  c.putImageData(id, 0, 0);
  // the ground's top in the big picture, and where its snow band ends (the
  // front face starts where the colour turns to deep blue ice)
  let topMin = H; for (let x = 0; x < W; x += 4) { let y = 0; while (y < H && d[(y * W + x) * 4 + 3] < 128) y++; topMin = Math.min(topMin, y); }
  let faceY = 0, rows = 0;
  for (let x = 0; x < W; x += 8) {
    for (let y = topMin + 60; y < H; y++) { const i = (y * W + x) * 4; if (d[i + 2] > 150 && d[i] < 120 && d[i + 1] < 170) { faceY += y; rows++; break; } }
  }
  faceY = faceY / Math.max(1, rows);
  const SW = Math.round(W * k), SH = Math.round(H * k);
  const small = document.createElement('canvas'); small.width = SW; small.height = SH;
  const s = small.getContext('2d'); s.imageSmoothingQuality = 'high'; s.drawImage(cv, 0, 0, SW, SH);
  const a = s.getImageData(0, 0, SW, SH).data;
  // choose the join: the two strips of the picture that look most alike
  const O = 28, y0 = Math.floor(topMin * k);
  let best = null;
  for (let S0 = 0; S0 < 60; S0 += 2) for (let E0 = Math.max(S0 + 280, SW - 90); E0 <= SW - O; E0 += 2) {
    let diff = 0;
    for (let x = 0; x < O; x += 2) for (let y = y0; y < SH; y += 2) { const p = (y * SW + S0 + x) * 4, q = (y * SW + E0 + x) * 4; diff += Math.abs(a[p] - a[q]) + Math.abs(a[p + 1] - a[q + 1]) + Math.abs(a[p + 2] - a[q + 2]) + Math.abs(a[p + 3] - a[q + 3]); }
    if (!best || diff < best.diff) best = { S0, E0, diff };
  }
  const { S0, E0 } = best, TW = E0 - S0;
  const tile = document.createElement('canvas'); tile.width = TW; tile.height = SH;
  const t = tile.getContext('2d'); t.drawImage(small, -S0, 0);
  const td = t.getImageData(0, 0, TW, SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < O; x++) {
    const f = x / O, i = (y * TW + x) * 4, p = (y * SW + S0 + x) * 4, q = (y * SW + E0 + x) * 4;
    for (let ch = 0; ch < 4; ch++) td.data[i + ch] = Math.round(a[q + ch] * (1 - f) + a[p + ch] * f);
  }
  t.putImageData(td, 0, 0);
  const top = [];
  for (let x = 0; x < TW; x++) { let y = 0; while (y < SH && td.data[(y * TW + x) * 4 + 3] < 128) y++; top.push(y); }
  return { tile, top, band: Math.round((faceY - topMin) * k), topMin: Math.round(topMin * k) };
}

// The White Front, all drawn by code (the look the owner chose), richer and
// more alive. Layers, each repeating so it can scroll: a still sky (sun with
// its ice halo, Frostring's ring, cloud banks), the far view (three mountain
// ranges, the glacier front line with the defenders' bunkers, the frozen
// lake) and the near ground (snow drifts with the battle's leftovers).
// On top, moving things are drawn every frame: Legion landing ships coming
// down, tracer fire and flak, searchlights, smoke, blowing powder, snow.
// Sizes are double-detail pixels (the screen is 416 x 288).
const H = 288;
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => { const A = hex(a), B = hex(b); t = Math.max(0, Math.min(1, t)); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const L = 1024;
const TAU = Math.PI * 2;
export const groundY = () => 131; // a flat snowfield (owner: make the surface flat)

// ------------------------------------------------------------ the sky
export function sky() {
  const cv = canvas(416, H), c = cv.getContext('2d');
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  for (let y = 0; y < H; y++) { const t = y / 190; px(0, y, t < 0.6 ? mix('#6383b0', '#a9c3de', t / 0.6) : mix('#a9c3de', '#e2ecf5', (t - 0.6) / 0.4), 416); }
  // Frostring's ring, the one you just freed, arcing high across the sky
  for (const [ry, a, w] of [[0, 0.30, 9], [11, 0.18, 4], [-8, 0.16, 3], [5, 0.12, 1]]) {
    c.strokeStyle = `rgba(240,246,252,${a})`; c.lineWidth = w;
    c.beginPath(); c.ellipse(170, 260 + ry, 330, 214, -0.18, Math.PI * 1.06, Math.PI * 1.62); c.stroke();
  }
  seed = 4;
  for (let i = 0; i < 160; i++) { // ice glitter in the ring
    const t = Math.PI * (1.06 + rnd() * 0.56), r = 1 + (rnd() - 0.5) * 0.05;
    const x = 170 + Math.cos(t) * 330 * r * Math.cos(-0.18) - Math.sin(t) * 214 * r * Math.sin(-0.18);
    const y = 260 + Math.cos(t) * 330 * r * Math.sin(-0.18) + Math.sin(t) * 214 * r * Math.cos(-0.18);
    if (y < 150) px(Math.round(x), Math.round(y), `rgba(255,255,255,${0.25 + rnd() * 0.4})`);
  }
  // high wispy cloud
  seed = 5;
  for (let i = 0; i < 34; i++) { const y = 18 + rnd() * 130, x = rnd() * 416; c.fillStyle = `rgba(236,244,250,${0.1 + rnd() * 0.12})`; c.fillRect(x, y, 24 + rnd() * 70, 1); }
  // the sun with its 22-degree halo, sun dogs and pillar (very cold air)
  const sx = 296, sy = 46;
  for (const [r, a] of [[30, 0.1], [20, 0.2], [13, 0.4]]) { c.fillStyle = `rgba(250,246,236,${a})`; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill(); }
  c.fillStyle = '#fbf8ef'; c.beginPath(); c.arc(sx, sy, 8, 0, 7); c.fill();
  c.strokeStyle = 'rgba(244,236,220,0.5)'; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 44, 0, 7); c.stroke();
  c.strokeStyle = 'rgba(230,180,140,0.22)'; c.lineWidth = 1; c.beginPath(); c.arc(sx, sy, 46, 0, 7); c.stroke();
  for (const d of [-44, 44]) { c.fillStyle = 'rgba(250,240,220,0.75)'; c.fillRect(sx + d - 2, sy - 2, 4, 4); c.fillStyle = 'rgba(250,240,220,0.3)'; c.fillRect(sx + d - (d < 0 ? 8 : -4), sy - 1, 4, 2); }
  c.fillStyle = 'rgba(250,246,236,0.16)'; c.fillRect(sx - 2, sy - 34, 4, 26); c.fillRect(sx - 2, sy + 8, 4, 40);
  return cv;
}

// A cloud bank (soft, layered blobs, lit from above): painted once, drifts slowly.
export function clouds(W = 832) {
  // long flat banks of cloud, lit on top, thin enough to see the sky through
  const cv = canvas(W, 120), c = cv.getContext('2d');
  seed = 61;
  for (let k = 0; k < 7; k++) {
    const x0 = (k / 7) * W + rnd() * 50, y0 = 30 + rnd() * 60, n = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (14 + rnd() * 10), y = y0 + (rnd() - 0.5) * 4, rx = 16 + rnd() * 16, ry = 2.5 + rnd() * 2.5;
      for (const [dy, col, kx] of [[1.5, 'rgba(150,176,206,0.16)', 1], [0, 'rgba(232,240,248,0.24)', 1], [-1.5, 'rgba(250,252,254,0.22)', 0.7]]) {
        for (const off of [0, -W]) { c.fillStyle = col; c.beginPath(); c.ellipse(((x % W) + W) % W + off, y + dy, rx * kx, ry * kx, 0, 0, 7); c.fill(); }
      }
    }
  }
  return cv;
}

// ------------------------------------------------------------ the far view
export function far(W = 832) {
  const cv = canvas(W, H), c = cv.getContext('2d');
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(((x % W) + W) % W, y, w, h); };
  // three ranges, far to near; sunlit faces pale, shaded faces blue with rock showing through
  const range = (base, top, step, sd, lit, shade, snow, rock) => {
    seed = sd;
    const n = W / step, pts = []; let y = base - 24;
    for (let i = 0; i < n; i++) { y = Math.max(top, Math.min(base - 8, y + (rnd() - 0.5) * step * 2.6)); pts.push(y); }
    const at = (x) => { const i = Math.floor(x / step), t = (x % step) / step; return pts[i % n] + (pts[(i + 1) % n] - pts[i % n]) * t; };
    for (let x = 0; x < W; x++) {
      const yy = Math.round(at(x)), slope = at(x + 1) - at(x), facing = slope > 0;
      const cap = Math.max(1, Math.round((base - 10 - yy) * 0.45));
      px(x, yy, facing ? snow : mix(snow, shade, 0.35), 1, cap);
      for (let y2 = yy + cap; y2 < base; y2++) {
        let col = mix(facing ? lit : shade, shade, (y2 - yy) / (base - yy) * 0.6);
        if (rock && !facing && Math.abs(slope) > 0.6 && ((x * 7 + y2 * 3) % 11 < 3)) col = rock;
        px(x, y2, col);
      }
      if (rnd() < 0.08) px(x, yy + cap + Math.round(rnd() * 6), 'rgba(236,244,250,0.6)', 1, 2 + Math.round(rnd() * 5));
      if (facing && slope > 0.9) px(x, yy, '#ffffff'); // a lit ridge
    }
  };
  range(150, 92, 14, 9, '#c7d6e6', '#93aac4', '#eef3f8', null);
  range(178, 96, 11, 3, '#b4c8dd', '#6f8db0', '#eef4fa', '#5d7393');
  range(196, 128, 8, 17, '#a7bfd7', '#5f7fa6', '#e6eff7', '#4f6788');
  // the glacier: blocks of ice (seracs) with crevasses, strata and snow cornices
  seed = 23;
  const gTop = new Array(W).fill(170);
  let x0 = 0;
  while (x0 < W) {
    let w = 10 + Math.round(rnd() * 16); if (W - (x0 + w) < 10) w = W - x0;
    const top = 146 + Math.round(rnd() * 26), lean = (rnd() - 0.5) * 6;
    for (let x = x0; x < x0 + w; x++) {
      const u = (x - x0) / w;
      const tt = Math.round(top + Math.abs(u - 0.5 + lean / 20) * 8 + (rnd() < 0.2 ? 1 : 0));
      gTop[x] = tt;
      for (let y = tt; y < 216; y++) {
        const t = (y - tt) / (216 - tt);
        let col = mix('#d6e7f4', '#5f8dbb', t * 0.95);
        if (u < 0.18) col = mix('#eef5fb', '#8db4d8', t);
        else if (u > 0.82) col = mix('#9fc0de', '#3f6590', t);
        if ((y - tt) % 11 === 5 && u > 0.18 && u < 0.82) col = mix(col, '#ffffff', 0.25);
        if ((y - tt) % 11 === 6 && u > 0.2 && u < 0.8) col = mix(col, '#3f6590', 0.12);
        px(x, y, col);
      }
      px(x, tt - 3, '#ffffff', 1, 2); px(x, tt - 1, '#eef5fb', 1, 2);
      if (u > 0.85) px(x, tt - 1, '#cfe0ef', 1, 1);
    }
    for (let y = top + 6; y < 214; y++) px(x0 + w - 1, y, y % 9 < 6 ? '#355a85' : '#2b4c74');
    const cx = x0 + Math.round(w * (0.35 + rnd() * 0.3)), cl = 10 + rnd() * 30;
    for (let y = top + 8; y < top + 8 + cl; y++) if (rnd() < 0.85) { px(cx + (y % 7 === 0 ? 1 : 0), y, '#6f9cc6'); px(cx + 1 + (y % 7 === 0 ? 1 : 0), y, 'rgba(238,246,252,0.45)'); }
    for (let x = x0 + 2; x < x0 + w - 2; x += 3 + Math.round(rnd() * 3)) { const l = 2 + Math.round(rnd() * 5); px(x, 216, '#b7d3ea', 1, l); px(x, 216, '#e4f0f8', 1, 1); }
    x0 += w;
  }
  // the defenders' front line on top of the glacier: bunkers, twin AA guns, masts, flags
  const guns = [], lights = [];
  const bunker = (x, kind) => {
    const top = Math.round(gTop[x]);
    // sandbagged snow wall
    for (let i = -14; i <= 14; i++) { const h = 3 - Math.abs(i) / 7; px(x + i, top - Math.round(h), '#e8eff5', 1, Math.round(h) + 1); }
    c.fillStyle = '#0e1222'; c.fillRect(x - 12, top - 11, 24, 11);
    c.fillStyle = '#5b6474'; c.fillRect(x - 11, top - 10, 22, 10);
    c.fillStyle = '#7b8596'; c.fillRect(x - 11, top - 10, 22, 2); c.fillRect(x - 11, top - 10, 2, 9);
    c.fillStyle = '#3c4350'; c.fillRect(x - 11, top - 2, 22, 2);
    c.fillStyle = '#1c2029'; c.fillRect(x - 7, top - 6, 9, 2); // the firing slit
    c.fillStyle = '#eef4fa'; c.fillRect(x - 12, top - 12, 24, 2); // snow on the roof
    if (kind === 'aa') {
      c.fillStyle = '#4a5160'; c.fillRect(x + 1, top - 15, 7, 4);
      for (const dy of [0, 3]) { c.strokeStyle = '#2b3039'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, top - 14 - dy); c.lineTo(x + 15, top - 22 - dy); c.stroke(); }
      guns.push([x + 16, top - 24]);
    } else if (kind === 'light') {
      c.fillStyle = '#4a5160'; c.fillRect(x, top - 16, 6, 6); c.fillStyle = '#f6e7c4'; c.fillRect(x + 4, top - 15, 3, 3);
      lights.push([x + 6, top - 14]);
    } else {
      c.strokeStyle = '#3c4350'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 4, top - 11); c.lineTo(x - 4, top - 32); c.stroke();
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - 8 + k, top - 26 + k * 4); c.lineTo(x - k, top - 26 + k * 4); c.stroke(); }
      c.fillStyle = '#c98f4a'; c.fillRect(x - 3, top - 32, 8, 4); c.fillStyle = '#e3a857'; c.fillRect(x - 3, top - 32, 8, 1); // the defenders' amber flag
    }
  };
  [[64, 'aa'], [158, 'light'], [262, 'aa'], [346, 'mast'], [480, 'aa'], [574, 'aa'], [678, 'light'], [762, 'aa']].forEach(([x, k]) => bunker(x, k));
  // the frozen lake: smooth ice, reflections, cracks, wind-swept snow
  for (let y = 214; y < H; y++) { c.fillStyle = mix('#b9d3e8', '#d9e8f3', (y - 214) / 36); c.fillRect(0, y, W, 1); }
  for (let x = 0; x < W; x++) px(x, 222 + (x % 3), 'rgba(111,156,198,0.25)', 1, Math.round((216 - gTop[x]) * 0.25));
  c.strokeStyle = 'rgba(79,122,166,0.55)'; c.lineWidth = 1;
  seed = 41;
  for (let i = 0; i < 14; i++) { let x = 20 + rnd() * (W - 120), y = 220 + rnd() * 26; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += 6 + rnd() * 10; y += (rnd() - 0.5) * 6; c.lineTo(x, y); } c.stroke(); }
  for (let i = 0; i < 18; i++) { const x = rnd() * W, y = 218 + rnd() * 30; c.fillStyle = 'rgba(246,250,253,0.55)'; c.fillRect(x, y, 10 + rnd() * 26, 1); }
  for (let i = 0; i < 80; i++) px(Math.floor(rnd() * W), Math.floor(216 + rnd() * 32), '#f4f9fd');
  const spire = (x, base, h, w) => {
    c.fillStyle = '#e4f0f8'; c.beginPath(); c.moveTo(x - w, base); c.lineTo(x, base - h); c.lineTo(x, base); c.fill();
    c.fillStyle = '#86aed2'; c.beginPath(); c.moveTo(x, base - h); c.lineTo(x + w, base); c.lineTo(x, base); c.fill();
    c.fillStyle = '#b7d3ea'; c.beginPath(); c.moveTo(x, base - h); c.lineTo(x + w * 0.35, base); c.lineTo(x, base); c.fill();
    px(x - 1, base - h + 2, '#ffffff', 1, 4);
    c.fillStyle = 'rgba(134,174,210,0.35)'; c.fillRect(x - w, base, w * 2, 2); // its reflection
  };
  spire(36, 236, 46, 8); spire(48, 238, 28, 6); spire(332, 232, 52, 9); spire(345, 236, 30, 6); spire(140, 230, 22, 5);
  spire(520, 234, 40, 7); spire(700, 236, 34, 7); spire(712, 238, 20, 5);
  for (let y = 206; y < 226; y++) { const a = 0.32 * Math.sin(((y - 206) / 20) * Math.PI); c.fillStyle = `rgba(236,243,249,${a.toFixed(3)})`; c.fillRect(0, y, W, 1); }
  return { canvas: cv, guns, lights };
}

// ------------------------------------------------------------ the near ground
export function ground() {
  const W = L * 2;
  let minY = H; for (let x = 0; x < W; x++) minY = Math.min(minY, Math.round(groundY(x / 2) * 2));
  const y0 = minY - 40, cv = canvas(W, H - y0), c = cv.getContext('2d');
  const px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(((x % W) + W) % W, y - y0, w, h); };
  const gy = (x) => Math.round(groundY(x / 2) * 2);
  for (let x = 0; x < W; x++) {
    const y = gy(x);
    px(x, y, '#ffffff'); px(x, y + 1, '#f1f6fa', 1, 5); px(x, y + 6, '#dde8f1', 1, 4); px(x, y + 10, '#a8c7e2', 1, 3);
    px(x, y + 13, '#7fa6cc', 1, 4); px(x, y + 17, '#a8c7e2', 1, 2); px(x, y + 19, '#5d86b2', 1, 6); px(x, y + 25, '#3f6590', 1, H);
    if ((x * 5) % 17 === 0) px(x, y + 2, '#cfdeec');
    if ((x * 11) % 37 === 0) px(x, y + 14, '#d6e7f4', 1, 2);
    if ((x * 3) % 41 === 0) px(x, y + 20, '#89b0d6', 1, 4);
    // wind ripples on the drifts
    if (Math.sin(x * 0.21) > 0.7 && (x % 4) < 3) px(x, y + 4, '#d3e0ec');
    if (Math.sin(x * 0.13 + 2) > 0.85 && (x % 3) < 2) px(x, y + 8, '#cbd9e7');
  }
  seed = 77;
  for (let i = 0; i < 150; i++) { const x = Math.round(rnd() * (W - 2)) + 1, y = gy(x) + 1 + Math.round(rnd() * 8); px(x, y, '#ffffff'); if (rnd() < 0.3) { px(x - 1, y, 'rgba(255,255,255,0.6)'); px(x + 1, y, 'rgba(255,255,255,0.6)'); } }
  const P = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1] - y0); for (const p of pts.slice(1)) c.lineTo(p[0], p[1] - y0); c.closePath(); c.fill(); };
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y - y0, w, h); };
  const snowCap = (x0, x1, y) => { for (let x = x0; x < x1; x++) R(x, y - 1 - (Math.sin(x * 0.7) > 0.3 ? 1 : 0), 1, 2, '#f7fafd'); };
  const deco = [];
  // 1. a Legion landing ship's wreck, nose down in a drift (smokes)
  // (scenery only: faded and snow-dusted so it never looks like an enemy, and nothing collides with it)
  const wreck = (wx) => {
    const wy = gy(wx) + 4;
    P([[wx - 30, wy], [wx - 26, wy - 16], [wx - 6, wy - 26], [wx + 22, wy - 22], [wx + 30, wy - 8], [wx + 26, wy]], '#98a2b2');
    P([[wx - 26, wy - 16], [wx - 6, wy - 26], [wx - 4, wy - 22], [wx - 22, wy - 13]], '#b4bdca');
    P([[wx + 22, wy - 22], [wx + 30, wy - 8], [wx + 26, wy], [wx + 18, wy], [wx + 20, wy - 14]], '#808a9a');
    P([[wx - 2, wy - 25], [wx + 4, wy - 24], [wx + 2, wy], [wx - 4, wy]], '#768090');
    P([[wx + 6, wy - 23], [wx + 9, wy - 23], [wx + 7, wy], [wx + 4, wy]], '#768090');
    P([[wx - 30, wy], [wx - 26, wy - 16], [wx - 16, wy - 21], [wx - 18, wy]], '#808a9a'); // the cream nose plate
    P([[wx - 26, wy - 16], [wx - 16, wy - 21], [wx - 16, wy - 17], [wx - 23, wy - 13]], '#98a2b2');
    P([[wx - 18, wy - 8], [wx - 8, wy - 14], [wx - 2, wy - 6], [wx - 10, wy - 2]], '#636c7c'); // a torn hole
    R(wx - 12, wy - 9, 3, 2, '#e3a857'); R(wx - 11, wy - 9, 1, 1, '#f6dcae');
    for (let x = wx - 34; x < wx + 34; x++) R(x, wy - 1, 1, 3, '#f7fafd');
    snowCap(wx - 24, wx + 18, wy - 18);
    deco.push({ kind: 'smoke', x: wx - 10, y: wy - 10 });
  };
  // 2. tank traps: crossed steel beams, half buried
  const trap = (x) => {
    const y = gy(x) + 2;
    c.strokeStyle = '#3c4350'; c.lineWidth = 3;
    for (const [a, b] of [[[-8, 0], [6, -14]], [[8, 0], [-6, -14]], [[-9, -5], [9, -5]]]) { c.beginPath(); c.moveTo(x + a[0], y + a[1] - y0); c.lineTo(x + b[0], y + b[1] - y0); c.stroke(); }
    c.strokeStyle = '#6f7888'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 7, y - 2 - y0); c.lineTo(x + 5, y - 13 - y0); c.stroke();
    R(x - 8, y - 14, 4, 1, '#f7fafd'); R(x + 4, y - 14, 4, 1, '#f7fafd'); R(x - 2, y - 6, 4, 1, '#f7fafd');
    for (let i = -8; i <= 8; i++) R(x + i, y - 1 + Math.round(Math.abs(i) / 4), 1, 3, '#f1f6fa');
  };
  // 3. a sandbag wall with snow on it
  const bags = (x) => {
    const y = gy(x) + 2;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4 - r; i++) {
      const bx = x - 14 + r * 4 + i * 8, by = y - 5 - r * 5;
      c.fillStyle = '#8a8170'; c.beginPath(); c.ellipse(bx + 4, by + 2 - y0, 4.4, 2.6, 0, 0, 7); c.fill();
      c.fillStyle = '#a99f8b'; c.fillRect(bx + 1, by - y0, 6, 1);
    }
    snowCap(x - 10, x + 14, y - 11);
  };
  // 4. the defenders' toppled radar dish
  const dish = (x) => {
    const y = gy(x) + 3;
    c.strokeStyle = '#4a5160'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 2, y - y0); c.lineTo(x + 6, y - 10 - y0); c.stroke();
    c.fillStyle = '#9aa3b2'; c.beginPath(); c.ellipse(x + 9, y - 13 - y0, 9, 4, -0.7, Math.PI, 0); c.fill();
    c.fillStyle = '#c3cad5'; c.beginPath(); c.ellipse(x + 9, y - 14 - y0, 7, 2.6, -0.7, Math.PI, 0); c.fill();
    snowCap(x + 3, x + 15, y - 19);
    for (let i = -6; i <= 14; i++) R(x + i, y - 1, 1, 3, '#f1f6fa');
  };
  // 5. a scorched shell crater
  const crater = (x) => {
    const y = gy(x) + 3;
    c.fillStyle = 'rgba(62,66,78,0.55)'; c.beginPath(); c.ellipse(x, y - y0, 16, 4, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(40,42,50,0.7)'; c.beginPath(); c.ellipse(x, y + 1 - y0, 9, 2.4, 0, 0, 7); c.fill();
    for (const [dx, dy] of [[-18, -1], [17, 0], [-12, -3], [13, -2]]) R(x + dx, y + dy, 2, 1, '#5a6070');
  };
  // 6. the defenders' flag on a pole, still standing
  const flag = (x) => {
    const y = gy(x) + 2;
    R(x, y - 30, 1, 30, '#3c4350'); R(x + 1, y - 30, 1, 30, '#6f7888');
    deco.push({ kind: 'flag', x: x + 2, y: y - 30 });
    for (let i = -4; i <= 4; i++) R(x + i, y - 1, 1, 3, '#f7fafd');
  };
  wreck(260); trap(430); trap(452); bags(560); crater(700); dish(820); flag(940); wreck(1180); bags(1330); trap(1460); crater(1560); trap(1700); flag(1820); dish(1940);
  const top = [], lane = [];
  for (let x = 0; x < L; x++) { top.push(+groundY(x).toFixed(2)); lane.push(+(groundY(x) + 1.5).toFixed(2)); }
  return { canvas: cv, y0, top, lane, deco };
}

// ------------------------------------------------------------ moving things
// An invader landing ship: a big cousin of the coast army (olive armour, a
// cream nose plate, panel seams, dark vents, amber lights, engine pods
// with glowing thrusters underneath), any size.
export function lander(c, x, y, s, t = 0, hit = false) {
  const P = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x + pts[0][0] * s, y + pts[0][1] * s); for (const p of pts.slice(1)) c.lineTo(x + p[0] * s, y + p[1] * s); c.closePath(); c.fill(); };
  const Rr = (x0, y0, w, h, col) => { c.fillStyle = col; c.fillRect(x + x0 * s, y + y0 * s, w * s, h * s); };
  // engine pods under the hull
  for (const px0 of [-6, 5]) { P([[px0 - 1, 2], [px0 + 5, 2], [px0 + 4.4, 5.6], [px0 - 0.4, 5.6]], '#202a32'); P([[px0 - 0.4, 2.4], [px0 + 4.4, 2.4], [px0 + 3.9, 5], [px0 + 0.1, 5]], '#3b4548'); }
  P([[-15, 1], [-10, -5.6], [9, -6.4], [15.4, -2], [14.4, 4], [-12, 4]], '#202a32');
  P([[-14, 1], [-9.5, -4.8], [8.6, -5.6], [14.2, -1.8], [13.2, 3.2], [-11, 3.2]], '#4e5461');
  P([[-13.2, 0], [-9.2, -4.8], [8.6, -5.6], [10.4, -3.6], [-7.6, -2.8]], '#6a717e');
  P([[-11, 2], [13.2, 1.6], [13.2, 3.2], [-11, 3.2]], '#383d48');
  // the cream nose plate
  P([[-14, 1], [-9.5, -4.8], [-4.6, -5], [-5.6, 3.2], [-11, 3.2]], '#383d48');
  P([[-13.2, 0], [-9.2, -4.8], [-4.6, -5], [-4.9, -2.6], [-8, -2.4]], '#4e5461');
  // panel seams and a dark vent at the back
  Rr(-0.5, -5.2, 1, 7.4, '#cf8f3c'); Rr(1.2, -5.3, 0.6, 7.5, '#cf8f3c');
  Rr(9, -2.6, 4, 4, '#2c3539'); for (let k = 0; k < 2; k++) Rr(9.4, -1.8 + k * 1.6, 3.2, 0.6, '#596264');
  // a lamp on the nose and running lights
  Rr(-11, -1.4, 4, 0.9, '#c8643f'); Rr(-11, -1.4, 1, 0.9, '#ffd9a8'); Rr(2, -4.6, 1, 0.8, '#d99b43'); Rr(7.4, 0.2, 1, 0.8, '#d99b43');
  // thrusters, flickering a little with t
  for (const tx of [-4, 7]) {
    const f = 0.7 + 0.3 * Math.sin(t * 30 + tx);
    Rr(tx - 1, 5.4, 2, 1, 'rgba(241,214,154,0.95)');
    c.fillStyle = `rgba(241,214,154,${0.35 * f})`; c.fillRect(x + (tx - 0.6) * s, y + 6.4 * s, 1.2 * s, 4 * s * f);
  }
  if (hit) { c.fillStyle = '#e3a857'; c.fillRect(x + 8 * s, y - 4 * s, 2 * s, 2 * s); }
}

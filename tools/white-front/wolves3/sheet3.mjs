// Sheet: the painting with the traced shapes drawn over it | Iron Wolves flying | about to fire | coast colours.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import http from 'node:http'; import { once } from 'node:events';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const HERE = new URL('.', import.meta.url).pathname;
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(''); return; } try { const b = fs.readFileSync(HERE + p.slice(1)); res.writeHead(200, { 'content-type': p.endsWith('.png') ? 'image/png' : 'text/javascript' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(0, '127.0.0.1'); await once(server, 'listening');
const b = await chromium.launch(); const page = await b.newPage(); page.on('pageerror', (e) => console.log('ERR', e.message)); page.on('console', (m) => console.log(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
const CLEAN = process.argv[5] === 'clean';
const names = process.argv[2] ? process.argv[2].split(',') : null, out = process.argv[3] || 'vec-sheet.png', Z = +(process.argv[4] || 8);
const url = await page.evaluate(async ([names, Z, CLEAN]) => {
  const VC = await import('/vec.js?' + Date.now()), VS = await import('/vehicles.js?' + Date.now());
  const list = names || Object.keys(VS.V);
  const grid = (g) => { const c = document.createElement('canvas'); c.width = g.w; c.height = g.h; const x = c.getContext('2d'); g.a.forEach((r, j) => r.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const rows = [];
  for (const n of list) {
    const v = VS.V[n], im = new Image(); im.src = '/ref/' + n + '.png'; await im.decode();
    const w = VC.paint(v, 'wolves', false), wo = VC.paint(v, 'wolves', true), co = VC.paint(v, 'coast', false);
    rows.push({ n, v, im, r: w.r, g: [grid(w), grid(wo), grid(co)] });
  }
  const W = CLEAN ? 1800 : 2200, rowH = rows.map((o) => Math.max(o.g[0].height * Z + 24, 200));
  const H = 50 + rowH.reduce((s, v) => s + v + 12, 0) + 150;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0f1c'; c.fillRect(0, 0, W, H);
  const sky = (y, h) => { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#9fbedc'); g.addColorStop(1, '#e6eef6'); return g; };
  let y = 40;
  rows.forEach((o, i) => {
    const h = rowH[i], r = o.r, bw = (r.w - 2) / r.scale, bh = (r.h - 2) / r.scale, k = Math.min(520 / bw, h / bh);
    c.imageSmoothingEnabled = true; c.drawImage(o.im, r.X0, r.Y0, bw, bh, 16, y, bw * k, bh * k); c.imageSmoothingEnabled = false;
    if (!CLEAN) { c.save(); c.translate(16, y); c.scale(k, k); c.translate(-r.X0, -r.Y0); c.lineWidth = 2 / k; c.strokeStyle = 'rgba(255,0,200,0.9)';
    for (const s of o.v.shapes) { c.beginPath(); if (s.poly) { s.poly.forEach(([x, yy], j) => (j ? c.lineTo(x, yy) : c.moveTo(x, yy))); c.closePath(); } else if (s.rect) c.rect(s.rect[0], s.rect[1], s.rect[2] - s.rect[0], s.rect[3] - s.rect[1]); else if (s.ell) c.ellipse(s.ell[0], s.ell[1], s.ell[2], s.ell[3], 0, 0, 7); else if (s.line) { c.moveTo(s.line[0], s.line[1]); c.lineTo(s.line[2], s.line[3]); } else if (s.dot) c.rect(s.dot[0] - 4, s.dot[1] - 4, 8, 8); c.stroke(); }
    c.restore(); }
    let x = 560;
    for (const [g, z] of (CLEAN ? [[o.g[0], Z], [o.g[1], Z]] : [[o.g[0], Z], [o.g[1], Z], [o.g[2], Z / 2]])) { c.fillStyle = sky(y, h); c.fillRect(x, y, g.width * z + 24, h); c.drawImage(g, x + 12, y + (h - g.height * z) / 2, g.width * z, g.height * z); x += g.width * z + 36; }
    y += h + 12;
  });
  c.fillStyle = sky(y, 130); c.fillRect(16, y, W - 32, 130);
  let x = 40; for (const o of rows) { const g = o.g[0]; c.drawImage(g, x, y + 65 - g.height, g.width * 2, g.height * 2); x += g.width * 2 + 40; }
  return cv.toDataURL();
}, [names, Z, CLEAN]);
fs.writeFileSync(HERE + out, Buffer.from(url.split(',')[1], 'base64'));
await b.close(); server.close();

// Coordinate guides: each painting's vehicle with a labelled grid every 50 painting pixels,
// to trace shapes from.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import http from 'node:http'; import { once } from 'node:events';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const HERE = new URL('.', import.meta.url).pathname;
const { REF } = await import('./ref.js');
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); try { const b = fs.readFileSync(HERE + p.slice(1)); res.writeHead(200, { 'content-type': 'image/png' }); res.end(b); } catch { res.writeHead(200, { 'content-type': 'text/html' }); res.end(''); } }).listen(0, '127.0.0.1'); await once(server, 'listening');
const b = await chromium.launch(); const page = await b.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/`);
for (const [n, r] of Object.entries(REF)) {
  if (process.argv[2] && n !== process.argv[2]) continue;
  const out = await page.evaluate(async ([n, r]) => {
    const im = new Image(); im.src = '/ref/' + n + '.png'; await im.decode();
    const [x0, y0, x1, y1] = r.box, s = 1500 / (x1 - x0);
    const cv = document.createElement('canvas'); cv.width = 1540; cv.height = (y1 - y0) * s + 40; const c = cv.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(im, x0, y0, x1 - x0, y1 - y0, 30, 30, 1500, (y1 - y0) * s);
    c.font = 'bold 13px sans-serif';
    for (let x = Math.ceil(x0 / 50) * 50; x <= x1; x += 50) { const X = 30 + (x - x0) * s; c.strokeStyle = x % 100 ? 'rgba(255,0,255,0.35)' : 'rgba(255,0,255,0.8)'; c.beginPath(); c.moveTo(X, 30); c.lineTo(X, cv.height); c.stroke(); if (x % 100 === 0) { c.fillStyle = '#ff0'; c.fillText(x, X - 12, 20); } }
    for (let y = Math.ceil(y0 / 50) * 50; y <= y1; y += 50) { const Y = 30 + (y - y0) * s; c.strokeStyle = y % 100 ? 'rgba(255,0,255,0.35)' : 'rgba(255,0,255,0.8)'; c.beginPath(); c.moveTo(30, Y); c.lineTo(cv.width, Y); c.stroke(); c.fillStyle = '#ff0'; c.fillText(y, 0, Y + 5); }
    return cv.toDataURL();
  }, [n, r]);
  fs.writeFileSync(HERE + 'coords-' + n + '.png', Buffer.from(out.split(',')[1], 'base64'));
}
await b.close(); server.close();

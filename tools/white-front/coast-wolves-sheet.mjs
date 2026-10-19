import { createRequire } from 'node:module';
import fs from 'node:fs'; import http from 'node:http'; import { once } from 'node:events';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const HERE = new URL('.', import.meta.url).pathname;
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(''); return; } try { const b = fs.readFileSync(HERE + p.slice(1)); res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(0, '127.0.0.1'); await once(server, 'listening');
const b = await chromium.launch(); const page = await b.newPage(); page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
const out = await page.evaluate(async () => {
  const S4 = await import('/white/sets4.js?' + Date.now());
  const CA = await import('/white/sample/coast-art.js');
  const grid = (gr) => { const c = document.createElement('canvas'); c.width = gr.w; c.height = gr.h; const x = c.getContext('2d'); gr.a.forEach((row, j) => row.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const list = [['SHELF SKIFF', 'skiff'], ['ANCHOR GUN', 'anchor'], ['SNOW ROLLER', 'roller'], ['TWIN DART', 'dart'], ['CREST BOMBER', 'bomber'], ['NEEDLE WING', 'needle'], ['WAKE HUNTER', 'hunter'], ['CHARGE / BOMB', 'charge']];
  const Z = 8, RH = 124, W = 1400, H = 120 + list.length * RH + 170;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0f1c'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#efe3cf'; c.font = 'bold 28px DejaVu Sans'; c.fillText('THE COAST ARMY, REPAINTED AS THE IRON WOLVES', 16, 40);
  c.font = '16px DejaVu Sans'; c.fillStyle = '#c9b8a0'; c.fillText('Same shapes and sizes. Left: as you liked them. Right: Iron Wolves colours (gunmetal, hazard orange, red eye slit). Each shown flying, then about to fire.', 16, 66);
  c.fillStyle = '#efe3cf'; c.font = 'bold 18px DejaVu Sans'; c.fillText('BEFORE', 260, 100); c.fillText('IRON WOLVES', 830, 100);
  const sky = (y, h) => { const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#9fbedc'); gr.addColorStop(1, '#e6eef6'); return gr; };
  list.forEach(([label, n], i) => {
    const y = 110 + i * RH;
    c.fillStyle = '#efe3cf'; c.font = 'bold 17px DejaVu Sans'; c.fillText(label, 16, y + RH / 2 + 6);
    const pairs = n === 'charge' ? [[CA.COAST.charge, S4.WOLF_COAST.charge], [CA.COAST.bomb, S4.WOLF_COAST.bomb]] : [[CA.COAST[n], S4.WOLF_COAST[n]]];
    [0, 1].forEach((side) => {
      const x0 = 230 + side * 570; c.fillStyle = sky(y, RH - 8); c.fillRect(x0, y, 550, RH - 8);
      let x = x0 + 14;
      for (const pr of pairs) for (const o of [false, true]) { const im = grid(pr[side](o)); c.drawImage(im, x, y + (RH - 8 - im.height * Z / 2) / 2, im.width * Z / 2, im.height * Z / 2); x += im.width * Z / 2 + 30; }
    });
  });
  // the squadron at about phone size
  const y = 120 + list.length * RH; c.fillStyle = '#efe3cf'; c.font = 'bold 18px DejaVu Sans'; c.fillText('THE WHOLE IRON WOLVES SQUADRON, ABOUT PHONE SIZE', 16, y + 14);
  c.fillStyle = sky(y + 26, 130); c.fillRect(16, y + 26, W - 32, 130);
  let x = 40; for (const n of ['skiff', 'anchor', 'roller', 'dart', 'bomber', 'needle', 'hunter', 'charge', 'bomb']) { const im = grid(S4.WOLF_COAST[n](false)); c.drawImage(im, x, y + 92 - im.height * 1.25, im.width * 2.5 / 2 * 2, im.height * 2.5 / 2 * 2); x += im.width * 2.5 + 40; }
  return cv.toDataURL();
});
fs.writeFileSync(HERE + 'iron-wolves-coast-army.png', Buffer.from(out.split(',')[1], 'base64'));
await b.close(); server.close();

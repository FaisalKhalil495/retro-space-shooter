// Picture for the owner: three weaver and three spinner options in Iron Wolves colours,
// each flying (or turned a little) and about to fire, then beside the Wolves already chosen.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import http from 'node:http'; import { once } from 'node:events';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const HERE = new URL('.', import.meta.url).pathname;
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(''); return; } try { const b = fs.readFileSync(HERE + p.slice(1)); res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(0, '127.0.0.1'); await once(server, 'listening');
const b = await chromium.launch(); const page = await b.newPage(); page.on('pageerror', (e) => console.log('ERR', e.message)); page.on('console', (m) => console.log(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
const url = await page.evaluate(async () => {
  const VC = await import('/vec.js?' + Date.now()), DS = await import('/designs.js?' + Date.now()), VS = await import('/vehicles.js?' + Date.now());
  const grid = (g) => { const c = document.createElement('canvas'); c.width = g.w; c.height = g.h; const x = c.getContext('2d'); g.a.forEach((r, j) => r.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const W = 1500, Z = 9, H = 1180;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0f1c'; c.fillRect(0, 0, W, H);
  const sky = (y, h) => { const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#9fbedc'); g.addColorStop(1, '#e6eef6'); return g; };
  const title = (t, y, sub) => { c.fillStyle = '#efe3cf'; c.font = 'bold 26px DejaVu Sans'; c.fillText(t, 16, y); c.font = '15px DejaVu Sans'; c.fillStyle = '#c9b8a0'; c.fillText(sub, 16, y + 22); };
  const block = (keys, y0, spin) => keys.forEach((k, i) => {
    const v = DS.D[k], x0 = 16 + i * 490, y = y0;
    c.fillStyle = sky(y, 300); c.fillRect(x0, y, 470, 300);
    c.fillStyle = '#efe3cf'; c.font = 'bold 20px DejaVu Sans'; c.fillText(String.fromCharCode(65 + i) + '  ' + v.name, x0 + 12, y + 28);
    const a = grid(VC.paint(v, 'wolves', false)), o = grid(VC.paint(v, 'wolves', true));
    c.drawImage(a, x0 + 14, y + 50, a.width * Z, a.height * Z);
    if (spin) { c.save(); c.translate(x0 + 360, y + 50 + a.height * Z / 2); c.rotate(0.6); c.drawImage(o, -o.width * Z / 4, -o.height * Z / 4, o.width * Z / 2, o.height * Z / 2); c.restore(); }
    else c.drawImage(o, x0 + 300, y + 60, o.width * Z / 2, o.height * Z / 2);
    c.fillStyle = '#3a4a60'; c.font = '13px DejaVu Sans'; c.fillText(spin ? 'about to fire, mid-turn' : 'about to spit', x0 + 300, y + 285);
  });
  title('IRON WOLVES: WEAVER OPTIONS', 36, 'Weaves up and down and spits once (the wavy one). Big: flying. Small: about to spit.');
  block(['weaverA', 'weaverB', 'weaverC'], 70, false);
  title('IRON WOLVES: SPINNER OPTIONS', 420, 'Turns as it flies and fires shots in 8 directions. Big: flying. Small: about to fire, turned as in the game.');
  block(['spinnerA', 'spinnerB', 'spinnerC'], 454, true);
  // with the squadron, about phone size
  const y = 800; c.fillStyle = '#efe3cf'; c.font = 'bold 20px DejaVu Sans'; c.fillText('WITH THE IRON WOLVES YOU CHOSE, ABOUT PHONE SIZE', 16, y);
  c.fillStyle = sky(y + 14, 340); c.fillRect(16, y + 14, W - 32, 340);
  const row = (list, yy) => { let x = 40; for (const [lab, im] of list) { c.drawImage(im, x, yy - im.height, im.width * 2.2, im.height * 2.2); c.fillStyle = '#3a4a60'; c.font = '13px DejaVu Sans'; c.fillText(lab, x, yy + im.height * 1.2 + 18); x += Math.max(im.width * 2.2, 60) + 44; } };
  const P = (k) => grid(VC.paint(VS.V[k], 'wolves', false)), Q = (k) => grid(VC.paint(DS.D[k], 'wolves', false));
  row([['Twin Dart', P('dart')], ['Needle Wing', P('needle')], ['Wake Hunter', P('hunter')], ['Crest Bomber', P('bomber')], ['Skiff', P('skiff')], ['Roller', P('roller')]], y + 100);
  row([['Weaver A', Q('weaverA')], ['Weaver B', Q('weaverB')], ['Weaver C', Q('weaverC')], ['Spinner A', Q('spinnerA')], ['Spinner B', Q('spinnerB')], ['Spinner C', Q('spinnerC')]], y + 250);
  return cv.toDataURL();
});
fs.writeFileSync(HERE + '../../iron-wolves-weaver-spinner.png', Buffer.from(url.split(',')[1], 'base64'));
await b.close(); server.close();

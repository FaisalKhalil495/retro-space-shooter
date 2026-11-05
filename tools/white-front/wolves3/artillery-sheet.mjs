// Picture for the owner: the three artillery ideas, each as the enemy close up (flying / about to
// fire) and a little scene showing how its attack plays out.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import http from 'node:http'; import { once } from 'node:events';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const HERE = new URL('.', import.meta.url).pathname, REPO = '/home/user/retro-space-shooter/';
const server = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(''); return; } const f = p.startsWith('/repo/') ? REPO + p.slice(6) : HERE + p.slice(1); try { const b = fs.readFileSync(f); res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(b); } catch { res.writeHead(404); res.end(); } }).listen(0, '127.0.0.1'); await once(server, 'listening');
const b = await chromium.launch(); const page = await b.newPage(); page.on('pageerror', (e) => console.log('ERR', e.message)); page.on('console', (m) => console.log(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
const url = await page.evaluate(async () => {
  const VC = await import('/vec.js?' + Date.now()), AR = await import('/artillery.js?' + Date.now()), SP = await import('/repo/js/sprites.js');
  const ship = SP.SPRITES.player.hi;
  const grid = (g) => { const c = document.createElement('canvas'); c.width = g.w; c.height = g.h; const x = c.getContext('2d'); g.a.forEach((r, j) => r.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const W = 1560, H = 1500, Z = 7, S = 2.4;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0f1c'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#efe3cf'; c.font = 'bold 26px DejaVu Sans'; c.fillText('IRON WOLVES ARTILLERY: THREE IDEAS', 16, 36);
  c.font = '15px DejaVu Sans'; c.fillStyle = '#c9b8a0'; c.fillText('Every shell lands on a red ring that tightens as it falls: when the ring closes, it hits. Left: the enemy (and about to fire). Right: how it plays.', 16, 60);
  // a scene in double-detail pixels (416 x 150), drawn zoomed
  const scene = (x0, y0, draw) => {
    const sc = document.createElement('canvas'); sc.width = 416; sc.height = 150; const g = sc.getContext('2d'); g.imageSmoothingEnabled = false;
    const sky = g.createLinearGradient(0, 0, 0, 150); sky.addColorStop(0, '#9fbedc'); sky.addColorStop(1, '#e6eef6'); g.fillStyle = sky; g.fillRect(0, 0, 416, 150);
    g.fillStyle = '#c4d4e6'; g.beginPath(); g.moveTo(0, 104); for (let x = 0; x <= 416; x += 26) g.lineTo(x, 84 + ((x * 37) % 23)); g.lineTo(416, 120); g.lineTo(0, 120); g.fill();
    g.fillStyle = '#f2f6fa'; g.fillRect(0, 128, 416, 22); g.fillStyle = '#d6e1ea'; g.fillRect(0, 128, 416, 2);
    draw(g);
    c.drawImage(sc, x0, y0, 416 * S, 150 * S);
  };
  const ring = (g, x, y, k) => { // k: how far it has tightened (0..1)
    g.strokeStyle = '#c8643f'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(x, y, 8 + 22 * (1 - k), 0, 7); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#e8a060'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.stroke(); g.fillStyle = '#c8643f'; g.fillRect(x - 5, y - 1, 10, 2); g.fillRect(x - 1, y - 5, 2, 10);
  };
  const shell = (g, x, y) => { g.fillStyle = '#5a5f68'; g.fillRect(x - 2, y - 6, 4, 8); g.fillStyle = '#eab25a'; g.fillRect(x - 2, y + 2, 4, 2); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(x - 1, y - 20, 2, 12); };
  const dots = (g, x0, y0, x1, y1, col) => { g.fillStyle = col; const n = Math.hypot(x1 - x0, y1 - y0) / 4; for (let i = 0; i < n; i += 2) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 2, 2); };
  const put = (g, im, x, y) => g.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height / 2));
  const rows = [
    ['A', AR.ART.howler, 'Rolls in on the snow, stops and raises its long gun (the barrel glints, a deep boom). It fires 3 shells', 'straight up off the screen; each comes down on a ring set where you were. Shoot the battery (5 hits) to stop it.', (g, im, io) => {
      put(g, io, 330, 128 - io.height / 2 + 2); put(g, ship, 120, 70);
      ring(g, 120, 70, 0.6); shell(g, 120, 30); ring(g, 190, 96, 0.15); dots(g, 274, 80, 250, 0, '#e8a060');
    }],
    ['B', AR.ART.spotter, 'A small drone that can\'t hurt you itself: it shines a red beam on you, the ring follows you for 1 s, then', 'locks; the big guns in the background battle fire and the shell lands 1 s later. It keeps calling shots until you shoot it (3 hits).', (g, im, io, far) => {
      put(g, far, 60, 96); g.fillStyle = '#ffe6bc'; g.fillRect(34, 76, 6, 4);
      put(g, io, 300, 46); put(g, ship, 150, 78);
      dots(g, 286, 50, 150, 78, '#d2553a'); ring(g, 150, 78, 0.45); shell(g, 150, 34);
    }],
    ['C', AR.ART.rocketSled, 'Slides in, tilts up its four-tube launcher and fires 4 rockets high; their rings appear in a line', 'that walks towards you, landing one after another. Dodge up or down, or slip between them. 5 hits to destroy.', (g, im, io) => {
      put(g, io, 340, 128 - io.height / 2 + 2); put(g, ship, 110, 66);
      ring(g, 260, 92, 0.9); ring(g, 214, 84, 0.65); ring(g, 168, 76, 0.4); ring(g, 122, 68, 0.15);
      shell(g, 260, 70); dots(g, 320, 104, 300, 0, '#e8a060');
    }],
  ];
  const far = grid(VC.paint(AR.FAR_GUN, 'wolves', false));
  rows.forEach(([letter, v, l1, l2, draw], i) => {
    const y = 84 + i * 460, im = grid(VC.paint(v, 'wolves', false)), io = grid(VC.paint(v, 'wolves', true));
    c.fillStyle = '#efe3cf'; c.font = 'bold 22px DejaVu Sans'; c.fillText(letter + '  ' + v.name, 16, y + 20);
    c.font = '15px DejaVu Sans'; c.fillStyle = '#c9b8a0'; c.fillText(l1, 16, y + 44); c.fillText(l2, 16, y + 64);
    const sky = c.createLinearGradient(0, y + 80, 0, y + 440); sky.addColorStop(0, '#9fbedc'); sky.addColorStop(1, '#e6eef6');
    c.fillStyle = sky; c.fillRect(16, y + 80, 500, 360);
    c.drawImage(im, 30, y + 96, im.width * Z, im.height * Z);
    c.drawImage(io, 30 + 250, y + 96 + im.height * Z + 30, io.width * Z / 2, io.height * Z / 2);
    c.fillStyle = '#3a4a60'; c.font = '13px DejaVu Sans'; c.fillText('about to fire', 30 + 250, y + 96 + im.height * Z + 30 + io.height * Z / 2 + 18);
    scene(530, y + 80, (g) => draw(g, im, io, far));
  });
  return cv.toDataURL();
});
fs.writeFileSync(HERE + '../../iron-wolves-artillery.png', Buffer.from(url.split(',')[1], 'base64'));
await b.close(); server.close();

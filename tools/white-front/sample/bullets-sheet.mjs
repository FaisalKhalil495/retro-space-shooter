// Picture for the owner: each Iron Wolves enemy with its own bullets, drawn by the preview's own code.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const DIR = '/tmp/claude-0/-home-user-retro-space-shooter/f7c087f3-dbbb-5353-90a7-7f6ce7502295/scratchpad/';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto('file://' + DIR + 'white-front-sample-WORLD.html'); await page.waitForTimeout(800);
await page.mouse.click(700, 300); await page.waitForTimeout(300);
const url = await page.evaluate(() => {
  const rows = [['TWIN DART', 'dart', 'tracer'], ['SHELF SKIFF', 'skiff', 'slug'], ['NEEDLE WING', 'needle', 'rail'], ['WOLF HOUND', 'hound', 'slag'],
    ['FLAK STAR', 'flak', 'flak'], ['CREST BOMBER (its bomb)', 'bomber', 'shard'], ['SNOW ROLLER (its charge)', 'roller', 'ice']];
  const Z = 2.2, cw = 200, ch = 50, out = document.createElement('canvas'); out.width = 2 * cw * 2 * Z + 60; out.height = Math.ceil(rows.length / 2) * (ch * 2 * Z + 50) + 100;
  const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.fillStyle = '#0b0f1c'; o.fillRect(0, 0, out.width, out.height);
  o.fillStyle = '#efe3cf'; o.font = 'bold 26px DejaVu Sans'; o.fillText('IRON WOLVES: EVERY ENEMY FIRES ITS OWN BULLET', 16, 36);
  o.font = '15px DejaVu Sans'; o.fillStyle = '#c9b8a0'; o.fillText('Drawn by the preview itself, zoomed in. The Rocket Sled keeps its rockets.', 16, 60);
  rows.forEach(([label, type, kind], i) => {
    const col = i % 2, row = Math.floor(i / 2), X = 16 + col * (cw * 2 * Z + 24), Y = 76 + row * (ch * 2 * Z + 50);
    g.setTransform(1, 0, 0, 1, 0, 0); const sky = g.createLinearGradient(0, 0, 0, ch * 2); sky.addColorStop(0, '#a9c4de'); sky.addColorStop(1, '#e6eef6'); g.fillStyle = sky; g.fillRect(0, 0, cw * 2, ch * 2);
    const im = IMG['c_' + type]; g.drawImage(im, cw * 2 - im.width - 14, ch - im.height / 2);
    for (let k = 0; k < 4; k++) drawBullet({ x: 16 + k * 26, y: ch / 2 + (k % 2 ? -3 : 3), vx: -60, vy: (k % 2 ? -12 : 10), kind, seed: k * 0.37 });
    o.drawImage(off, 0, 0, cw * 2, ch * 2, X, Y + 24, cw * 2 * Z, ch * 2 * Z);
    o.fillStyle = '#efe3cf'; o.font = 'bold 17px DejaVu Sans'; o.fillText(label, X, Y + 16);
  });
  return out.toDataURL();
});
fs.writeFileSync(DIR + 'iron-wolves-bullets.png', Buffer.from(url.split(',')[1], 'base64'));
await b.close();

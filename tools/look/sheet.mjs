// The new look's model sheet: every model's frames at each fineness, beside
// today's sprite. node tools/look/sheet.mjs <out.png> [names] [ks] [zoom]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { serve } = await import('../serve.mjs');
const { server, base } = await serve();
const out = process.argv[2];
const names = (process.argv[3] || 'player,drifter,weaver,seeker,gunner,carrier').split(',');
const ks = (process.argv[4] || '2,4').split(',').map(Number);
const zoom = +(process.argv[5] || 10);
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 2000, height: 1400 } });
page.on('pageerror', (e) => console.log('ERR', e.stack));
page.on('console', (m) => console.log('LOG', m.text()));
await page.goto(base);
await page.waitForTimeout(300);
const size = await page.evaluate(async ({ names, ks, zoom }) => {
  const v = new URL(document.querySelector('script[type=module]').src).search;
  const { art, wreckArt, hasWreck } = await import('/js/models.js' + v);
  const { SPRITES } = await import('/js/sprites.js' + v);
  const { ROCKS } = await import('/js/rockart.js' + v);
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:#0b0f1c';
  const c = document.createElement('canvas');
  c.width = 2000; c.height = 4000;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#10152a'; x.fillRect(0, 0, c.width, c.height);
  x.font = '16px sans-serif';
  let y = 10;
  const t0 = performance.now();
  for (const name of names) {
    for (const k of ks) {
      const A = art(name, k);
      const frames = A.frames || A.sets.flatMap((s) => s.filter((_, i) => i % 4 === 0));
      let px = 10;
      x.fillStyle = '#e3a857';
      x.fillText(`${name} @${k}`, px, y + 14);
      y += 20;
      const old = SPRITES[name] || (name === 'rockBig' ? ROCKS.big[0] : name === 'rockSmall' ? ROCKS.small[0] : null);
      let rowH = 0;
      if (old) {
        x.drawImage(old.hi || old, px, y + (A.pad || 0) * zoom, old.width * zoom, old.height * zoom);
        px += old.width * zoom + 20;
      }
      for (const f of frames) {
        if (px + f.width * zoom > c.width - 10) { px = 10; y += rowH + 6; }
        x.drawImage(f.hi, px, y, f.width * zoom, f.height * zoom);
        px += f.width * zoom + 6;
        rowH = Math.max(rowH, f.height * zoom);
      }
      y += rowH + 8;
      if (hasWreck(name) && k === ks[ks.length - 1]) {
        px = 10; rowH = 0;
        for (const piece of wreckArt(name, k)) for (const f of piece.frames.filter((_, i) => i % 2 === 0)) {
          if (px + f.width * zoom * 0.6 > c.width - 10) { px = 10; y += rowH + 6; }
          x.drawImage(f.hi, px, y, f.width * zoom * 0.6, f.height * zoom * 0.6);
          px += f.width * zoom * 0.6 + 4; rowH = Math.max(rowH, f.height * zoom * 0.6);
        }
        y += rowH + 8;
      }
    }
  }
  console.log('baked in', Math.round(performance.now() - t0), 'ms');
  return y;
}, { names, ks, zoom });
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 2000, height: Math.min(size + 10, 4000) } });
await b.close(); server.close();

// The comparison table of level 1's enemy looks: today's sprites, the new
// look's first set, and the extra sets in tools/look/sets.js, one row per
// enemy. node tools/look/sets-sheet.mjs <out.jpg> [fineness]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { serve } = await import('../serve.mjs');
const { server, base } = await serve();
const out = process.argv[2];
const k = +(process.argv[3] || 4);
const want = (process.argv[4] || 'A,B,C,D').split(',');
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1900, height: 1200 } });
page.on('pageerror', (e) => console.log('ERR', e.stack));
page.on('console', (m) => m.type() === 'error' && console.log('LOG', m.text()));
await page.goto(base);
await page.waitForTimeout(300);
const url = await page.evaluate(async ({ k, want }) => {
  const v = new URL(document.querySelector('script[type=module]').src).search;
  const { art } = await import('/js/models.js' + v);
  const { SPRITES } = await import('/js/sprites.js' + v);
  const { renderModel } = await import('/js/model.js');
  const { SETS, ORDER, KINDS, viewOf } = await import('/tools/look/sets.js');
  const many = want.length > 4;
  const Z = many ? 11 : 15; // screen pixels per game pixel
  const colW = many ? 290 : 400, labelW = 170, gap = 14, headH = 92;
  const NAMES = { A: 'TODAY', B: many ? 'NEW (IN GAME)' : 'NEW (IN THE GAME NOW)' };
  const cols = want.map((l) => [l, NAMES[l] || SETS[l].name]);
  const rowH = (kind) => (viewOf(kind, k).h) * Z + 44;
  const W = labelW + cols.length * (colW + gap) + gap;
  const H = headH + ORDER.reduce((a, kind) => a + rowH(kind) + gap, 0) + 10;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = '#0b0f1c'; x.fillRect(0, 0, W, H);
  cols.forEach(([letter, name], i) => {
    const cx = labelW + gap + i * (colW + gap);
    x.fillStyle = '#e3a857'; x.font = 'bold 52px sans-serif'; x.fillText(letter, cx + 6, 58);
    x.fillStyle = '#efe3cf'; x.font = `bold ${many ? 20 : 24}px sans-serif`; x.fillText(name, cx + 50, 52);
  });
  const B_FRAME = { drifter: 0, weaver: 2, seeker: 0, gunner: 2, sniper: 0, spinner: 0 };
  let y = headH;
  for (const kind of ORDER) {
    const V = viewOf(kind, k);
    const h = rowH(kind);
    x.fillStyle = '#9c9584'; x.font = 'bold 24px sans-serif'; x.fillText(KINDS[kind], 14, y + h / 2 + 8);
    cols.forEach(([letter], i) => {
      const cx = labelW + gap + i * (colW + gap);
      x.fillStyle = '#151a38'; x.fillRect(cx, y, colW, h);
      x.fillStyle = '#1b2148'; x.fillRect(cx, y + h * 0.55, colW, h * 0.45); // (a band of the level's cloud, to judge them against)
      let pic, name = '';
      if (letter === 'A') {
        const s = SPRITES[kind];
        const hi = s.hi || s;
        x.drawImage(hi, Math.round(cx + colW / 2 - (s.width * Z) / 2), Math.round(y + (V.h * Z) / 2 - (s.height * Z) / 2), s.width * Z, s.height * Z);
      } else {
        if (letter === 'B') pic = art(kind, k).frames.get(B_FRAME[kind]);
        else { const [nm, build] = SETS[letter].models[kind]; name = nm; pic = renderModel(build(), V, SETS[letter].look); }
        x.drawImage(pic.hi, Math.round(cx + colW / 2 - (pic.width * Z) / 2), y, pic.width * Z, pic.height * Z);
      }
      if (name) { x.fillStyle = '#c9c0ab'; x.font = '20px sans-serif'; x.fillText(name, cx + 10, y + h - 12); }
    });
    y += h + gap;
  }
  return c.toDataURL('image/jpeg', 0.92);
}, { k, want });
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await b.close(); server.close();

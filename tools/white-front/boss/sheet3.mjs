// The White Front's boss from the owner's own painting (art/white-front/boss/
// owner-landship.png), traced (landship.js) and drawn sharp: the painting,
// close-ups in its own colours and in the Iron Wolves' paint, and both at
// real size in the level. Run: node tools/white-front/boss/sheet3.mjs [out.png]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const REPO = new URL('../../../', import.meta.url).pathname;
const { serve } = await import(REPO + 'tools/serve.mjs');
const { server, base } = await serve();
const b = await chromium.launch();
const page = await b.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(base + 'index.html');
const url = await page.evaluate(async () => {
  const v = new URL(document.querySelector('script[type=module]').src).search;
  const { LANDSHIP } = await import('/tools/white-front/boss/landship.js?' + Date.now());
  const { paint } = await import('/tools/white-front/wolves3/vec.js');
  const { whiteFrontArt } = await import('/js/whitefront.js' + v);
  const { SPRITES } = await import('/js/sprites.js' + v);
  const { drawText } = await import('/js/font.js' + v);
  const art = whiteFrontArt();
  const ref = new Image(); ref.src = '/art/white-front/boss/owner-landship.png'; await ref.decode();
  const grid = (g) => { const c = document.createElement('canvas'); c.width = g.w; c.height = g.h; const x = c.getContext('2d'); g.a.forEach((r, j) => r.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const looks = { coast: grid(paint(LANDSHIP, 'coast', false)), wolves: grid(paint(LANDSHIP, 'wolves', false)), wolvesOpen: grid(paint(LANDSHIP, 'wolves', true)), coastOpen: grid(paint(LANDSHIP, 'coast', true)) };
  const SNOW = 131;
  const scene = (im, farX) => {
    const c = document.createElement('canvas'); c.width = 416; c.height = 288;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(art.sky.hi, 0, 0);
    g.drawImage(art.clouds.hi, -farX, -38);
    g.drawImage(art.far.hi, -farX, 0);
    g.drawImage(art.ground.canvas.hi, -farX * 3, art.ground.top * 2);
    const x = 416 - im.width - 6, y = SNOW * 2 - im.height + 2;
    // smoke from its stacks, snow thrown up by its runners
    for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(110,114,124,${0.5 - i * 0.04})`; const r = 4 + i * 2; g.beginPath(); g.arc(x + im.width * 0.86 + i * 7, y + 8 - i * 6, r, 0, 7); g.fill(); }
    g.drawImage(im, x, y);
    g.fillStyle = '#ffffff';
    for (const [sx, n] of [[0.1, 30], [0.5, 24], [0.86, 24]]) for (let i = 0; i < n; i++) g.fillRect(Math.round(x + im.width * sx + (i % 12) * 4 - 10), Math.round(SNOW * 2 - 2 - Math.sin(i * 1.7) * 6 - (i % 5)), 2 + (i % 2), 2);
    g.drawImage(SPRITES.player.hi, 40, 120);
    return c;
  };
  const W = 1736, H = 1640, PAD = 24;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0f1c'; c.fillRect(0, 0, W, H);
  const text = (str, x, y, col, px = 1) => { c.save(); c.translate(x, y); c.scale(2.5, 2.5); drawText(c, str, 0, 0, col, px); c.restore(); };
  text('THE WHITE FRONT BOSS: FROM YOUR PAINTING', PAD, 26, '#e3a857', 2);
  text('TRACED SHAPE BY SHAPE AND DRAWN SHARP, IN TWO PAINTS. THE SAME SIZE IN BOTH.', PAD, 76, '#9fb0d0');
  // the painting, and the close-ups
  c.imageSmoothingEnabled = true;
  c.drawImage(ref, PAD, 116, 560, 373);
  c.imageSmoothingEnabled = false;
  text('YOUR PAINTING', PAD, 500, '#9fb0d0');
  const Z = 4;
  c.fillStyle = '#c7d9ea'; c.fillRect(620, 116, W - 620 - PAD, 360);
  c.drawImage(looks.coast, 640, 130, looks.coast.width * Z, looks.coast.height * Z);
  text('1. ITS OWN COLOURS: OLIVE AND CREAM', 620, 492, '#f2cf8a');
  c.fillStyle = '#c7d9ea'; c.fillRect(620, 540, W - 620 - PAD, 360);
  c.drawImage(looks.wolves, 640, 554, looks.wolves.width * Z, looks.wolves.height * Z);
  text('2. THE IRON WOLVES\' PAINT: GUNMETAL, ORANGE STRIPES, RED EYE', 620, 916, '#f2cf8a');
  text('CLOSE-UPS 4X BIGGER THAN IN THE GAME', PAD, 560, '#9fb0d0');
  text('IN THE GAME IT IS', PAD, 610, '#efe3cf'); text('125 X 38 GAME PIXELS:', PAD, 640, '#efe3cf'); text('MORE THAN HALF THE', PAD, 670, '#efe3cf'); text('SCREEN WIDE, ON THE SNOW.', PAD, 700, '#efe3cf');
  // both at real size in the level
  const PW = 832, PH = 576, y0 = 970;
  c.drawImage(scene(looks.coastOpen, 60), PAD, y0, PW, PH);
  c.drawImage(scene(looks.wolvesOpen, 200), PAD * 2 + PW, y0, PW, PH);
  text('1. OWN COLOURS, IN THE LEVEL', PAD, y0 + PH + 14, '#f2cf8a');
  text('2. IRON WOLVES PAINT, IN THE LEVEL', PAD * 2 + PW, y0 + PH + 14, '#f2cf8a');
  return cv.toDataURL();
});
const out = process.argv[2] || REPO + 'art/white-front/all-code/white-front-boss-landship.png';
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', out);
await b.close();
server.close();

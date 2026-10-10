// Draws the home-screen icons and the link-preview picture from the game's
// own art, into icons/. Run it again after changing the ship or the title:
// PLAYWRIGHT_PATH=/opt/node22/lib/node_modules/playwright node tools/make-icons.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = new URL('..', import.meta.url).pathname;
const { server, base } = await serve();
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
page.on('pageerror', (e) => console.log('error:', e.message));
await page.goto(base);
await page.waitForTimeout(500);
const files = await page.evaluate(async () => {
  const v = new URL(document.querySelector('script[type=module]').src).search;
  const { SPRITES } = await import('/js/sprites.js' + v);
  const { PAL } = await import('/js/config.js' + v);
  const { Menu } = await import('/js/menu.js' + v);
  const { Background } = await import('/js/background.js' + v);
  const { LEVELS } = await import('/js/levels.js' + v);
  const { useDetail } = await import('/js/detail.js' + v);
  const { drawTextCentered } = await import('/js/font.js' + v);
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = {};

  // The icon: your ship on deep space, with its flame and a few embers.
  // (Everything inside the middle 80%, so phones that cut icons into
  // circles or rounded squares never clip the ship.)
  const icon = (size) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const g = x.createRadialGradient(size * 0.55, size * 0.45, size * 0.05, size * 0.5, size * 0.5, size * 0.75);
    g.addColorStop(0, '#232c4a');
    g.addColorStop(1, PAL.void);
    x.fillStyle = g;
    x.fillRect(0, 0, size, size);
    const s = size / 512;
    for (let i = 0; i < 40; i++) {
      x.fillStyle = i % 5 ? '#34406a' : PAL.bluePale;
      const r = (i % 7 === 0 ? 4 : 2.5) * s;
      x.fillRect(rand() * size, rand() * size, r, r);
    }
    const ship = SPRITES.player.hi;
    const k = Math.floor((size * 0.56) / ship.width); // whole sharp pixels per pixel
    const w = ship.width * k;
    const h = ship.height * k;
    const sx = Math.round((size - w) / 2 + size * 0.06);
    const sy = Math.round((size - h) / 2);
    // The flame: a tapered glow out of the engine.
    const fl = (len, th, col) => {
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(sx + k, sy + h / 2 - th / 2);
      x.lineTo(sx - len, sy + h / 2);
      x.lineTo(sx + k, sy + h / 2 + th / 2);
      x.fill();
    };
    fl(size * 0.2, h * 0.5, PAL.amberSoft);
    fl(size * 0.13, h * 0.3, PAL.amberLight);
    fl(size * 0.05, h * 0.14, PAL.cream);
    x.drawImage(ship, sx, sy, w, h);
    for (let i = 0; i < 9; i++) {
      x.fillStyle = [PAL.amber, PAL.amberLight, PAL.redSoft][i % 3];
      const r = (3 + (i % 3) * 2) * s;
      x.fillRect(sx - size * (0.06 + rand() * 0.22), sy + h / 2 + (rand() - 0.5) * size * 0.3, r, r);
    }
    return c.toDataURL('image/png');
  };
  out['icon-192.png'] = icon(192);
  out['icon-512.png'] = icon(512);
  out['apple-touch-icon.png'] = icon(180);

  // The link preview: the title screen (logo, tagline, ship) in a console
  // bezel on a 1200 x 630 card.
  const W = 1200;
  const H = 630;
  const card = document.createElement('canvas');
  card.width = W;
  card.height = H;
  const cx = card.getContext('2d');
  cx.fillStyle = PAL.void;
  cx.fillRect(0, 0, W, H);
  const S = 4; // screen pixels per game pixel
  const gw = 208 * S;
  const gh = 144 * S;
  const gx = (W - gw) / 2;
  const gy = (H - gh) / 2;
  cx.fillStyle = PAL.bezel;
  cx.fillRect(gx - 10, gy - 10, gw + 20, gh + 20);
  const screen = document.createElement('canvas');
  screen.width = gw;
  screen.height = gh;
  const sctx = useDetail(screen.getContext('2d'));
  sctx.imageSmoothingEnabled = false;
  sctx.setTransform(S, 0, 0, S, 0, 0);
  const bg = new Background(rand, LEVELS[0].background);
  for (let i = 0; i < 40; i++) bg.update(0.1);
  bg.draw(sctx, (v) => Math.round(v * S) / S);
  const menu = new Menu({});
  menu.t = 1.2;
  sctx.translate(0, 18); // (the logo a little lower, without buttons under it)
  menu.drawTitle(sctx);
  sctx.translate(0, -18);
  drawTextCentered(sctx, 'THREE WORLDS. THREE BOSSES.', 104, 98, PAL.cream);
  drawTextCentered(sctx, 'MORE COMING SOON', 104, 108, PAL.amber);
  drawTextCentered(sctx, "PLAY IN YOUR PHONE'S BROWSER", 104, 124, PAL.textDim);
  cx.drawImage(screen, gx, gy);
  out['preview.png'] = card.toDataURL('image/png');
  return out;
});
fs.mkdirSync(root + 'icons', { recursive: true });
for (const [name, url] of Object.entries(files)) {
  fs.writeFileSync(root + 'icons/' + name, Buffer.from(url.split(',')[1], 'base64'));
  console.log('icons/' + name);
}
await browser.close();
server.close();

// The White Front's boss: the four designs on one sheet, each at its real
// size in the level (your ship for scale), with a glimpse of its signature
// attacks and what it does. Run: node tools/white-front/boss/sheet.mjs [out.png]
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
  const { BOSS } = await import('/tools/white-front/boss/designs.js?' + Date.now());
  const { paint } = await import('/tools/white-front/wolves3/vec.js');
  const { whiteFrontArt } = await import('/js/whitefront.js' + v);
  const { SPRITES } = await import('/js/sprites.js' + v);
  await import('/js/wolves.js' + v); // (adds the Wolves' pictures)
  const { drawText } = await import('/js/font.js' + v);
  const art = whiteFrontArt();
  const grid = (g) => { const c = document.createElement('canvas'); c.width = g.w; c.height = g.h; const x = c.getContext('2d'); g.a.forEach((r, j) => r.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const pic = (n, open) => grid(paint(BOSS[n], 'wolves', open));
  // A scene: the level at real size, in sharp pixels (416 x 288).
  const scene = (farX, draw) => {
    const c = document.createElement('canvas'); c.width = 416; c.height = 288;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(art.sky.hi, 0, 0);
    g.drawImage(art.clouds.hi, -farX, -38);
    g.drawImage(art.far.hi, -farX, 0);
    g.drawImage(art.ground.canvas.hi, -farX * 3, art.ground.top * 2);
    draw(g);
    return c;
  };
  const at = (g, im, x, y) => g.drawImage(im.hi || im, Math.round(x * 2), Math.round(y * 2)); // (game pixels)
  const ship = (g, x, y) => at(g, SPRITES.player, x, y);
  const dots = (g, x0, y0, x1, y1, col) => { g.fillStyle = col; const n = Math.hypot(x1 - x0, y1 - y0) / 1.5; for (let i = 0; i < n; i += 2) g.fillRect(Math.round((x0 + (x1 - x0) * i / n) * 2), Math.round((y0 + (y1 - y0) * i / n) * 2), 2, 2); };
  const ring = (g, x, y, r, col, sy = 0.35) => { g.fillStyle = col; for (let i = 0; i < 36; i++) { if (i % 3 === 2) continue; const a = i * Math.PI / 18; g.fillRect(Math.round((x + Math.cos(a) * r) * 2) - 1, Math.round((y + Math.sin(a) * r * sy) * 2) - 1, 2, 2); } };
  const RED = '#c8643f';
  const panels = [
    { n: 'carrier', farX: 40, corner: 'br',  draw: (g) => {
      const o = pic('carrier', true);
      at(g, o, 96, 16);
      at(g, SPRITES.wolfHound, 131, 58); at(g, SPRITES.wolfHound, 120, 70);
      for (const x of [40, 60, 80]) { dots(g, x, 10, x, 131, RED); ring(g, x, 131, 8, RED); }
      at(g, SPRITES.wolfRocketless || SPRITES.wolfBomb, 59, 40);
      ship(g, 22, 84);
    }, text: [
      'THE BIGGEST LANDING SHIP COMES DOWN ITSELF.',
      'MOVES: HOVERS AND SWINGS ACROSS THE SKY, DIVES LOW.',
      'WEAK POINT: ITS BELLY BAY, OPEN AS IT DROPS WOLVES.',
      'ATTACKS: DROPS WOLF PACKS, CARPET BOMBING RUN,',
      'BELLY CANNON SWEEP, ROCKET RAIN, ENGINE-BLAST PASS.',
      'STAGES: ITS ENGINES GO ONE BY ONE, IT TILTS AND BURNS.',
    ] },
    { n: 'train', farX: 120, corner: 'tl',  draw: (g) => {
      const o = pic('train', true);
      at(g, o, 100, 131 - o.height / 2 + 1);
      // a wall of snow ploughed up ahead of it, and a mortar ring
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 26; i++) g.fillRect(Math.round((70 + i * 0.9) * 2), Math.round((128 - Math.sin(i / 26 * Math.PI) * 14 - (i % 3)) * 2), 3, 3 + (i % 4));
      ring(g, 46, 74, 9, RED, 1); dots(g, 120, 72, 46, 74, 'rgba(200,100,63,0.7)');
      dots(g, 182, 12, 182, 70, RED);
      ship(g, 30, 70);
    }, text: [
      'A WAR TRAIN ON RUNNERS, RACING ALONG THE SNOW.',
      'MOVES: CHARGES BACK AND FORTH, PLOUGHS AT YOU.',
      'WEAK POINT: EACH CAR\'S HATCH WHILE IT FIRES.',
      'ATTACKS: SNOW WALL FROM THE PLOUGH, MORTAR RINGS,',
      'ROCKET COLUMNS, RAMMING CHARGE, FLAK FROM ITS ROOFS.',
      'STAGES: YOU BREAK IT CAR BY CAR, THE ENGINE LAST.',
    ] },
    { n: 'leader', farX: 200, corner: 'br',  draw: (g) => {
      const o = pic('leader', true), e = pic('escort', false);
      const cx = 140, cy = 58;
      at(g, o, cx - o.width / 4, cy - o.height / 4);
      // its escorts holding a shield round it
      g.fillStyle = 'rgba(242,207,138,0.85)';
      for (let i = 0; i < 64; i++) { if (i % 4 === 3) continue; const a = i / 64 * Math.PI * 2; g.fillRect(Math.round((cx + Math.cos(a) * 46) * 2), Math.round((cy + Math.sin(a) * 30) * 2), 2, 2); }
      for (const a of [0.5, 2.0, 3.6, 5.1]) at(g, e, cx + Math.cos(a) * 46 - 8, cy + Math.sin(a) * 30 - 5);
      dots(g, cx - 44, cy + 6, 26, 96, RED);
      ship(g, 18, 92);
    }, text: [
      'A FAST WOLF-HEADED GUNSHIP WITH ITS ESCORT PACK.',
      'MOVES: HUNTS YOU: DASHES, CIRCLES, CUTS YOU OFF.',
      'WEAK POINT: ONLY WHILE ITS PACK\'S SHIELD IS BROKEN.',
      'ATTACKS: LOCK-ON DASH, ESCORT PINCER, JAW CANNONS,',
      'PACK VOLLEY, A HOWL THAT SENDS THE PACK AT YOU.',
      'STAGES: MORE ESCORTS, FASTER, THEN IT FIGHTS ALONE.',
    ] },
    { n: 'blizzard', farX: 300, corner: 'br',  draw: (g) => {
      const o = pic('blizzard', true);
      at(g, o, 116, 22);
      // the storm: wind streaks and a fan of frost shots
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 40; i++) { const x = (i * 53) % 200, y = 14 + (i * 37) % 110; g.fillRect(x * 2, y * 2, 10 + (i % 3) * 6, 1); }
      g.fillStyle = '#ffffff';
      for (const a of [-0.35, -0.17, 0, 0.17, 0.35]) { const x = 110 - Math.cos(a) * 30, y = 52 + Math.sin(a) * 30; g.fillRect(Math.round(x * 2) - 2, Math.round(y * 2) - 2, 5, 5); g.fillStyle = '#9fbedc'; g.fillRect(Math.round(x * 2) - 1, Math.round(y * 2) - 1, 3, 3); g.fillStyle = '#ffffff'; }
      ship(g, 26, 60);
    }, text: [
      'A FLYING STORM MACHINE: TWO GREAT TURBINES.',
      'MOVES: DRIFTS AND SURGES, THE STORM MOVES WITH IT.',
      'WEAK POINT: ITS TURBINES\' HOT CORES AS THEY SPIN UP.',
      'ATTACKS: SNOW CANNON, HAIL FROM ABOVE, ICE WALLS,',
      'WIND THAT PUSHES YOU, A WHITEOUT THAT HIDES ITS SHOTS.',
      'STAGES: ONE TURBINE BURSTS, THEN IT GOES BERSERK.',
    ] },
  ];
  const PW = 832, PH = 576, PAD = 24, CAP = 200;
  const W = PW * 2 + PAD * 3, H = 120 + (PH + CAP + PAD) * 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0f1c'; c.fillRect(0, 0, W, H);
  const text = (str, x, y, col, px) => { c.save(); c.translate(x, y); c.scale(2.5, 2.5); drawText(c, str, 0, 0, col, px); c.restore(); };
  text('THE WHITE FRONT: FOUR BOSS DESIGNS', PAD, 30, '#e3a857', 2);
  text('EACH AT ITS REAL SIZE IN THE LEVEL, YOUR SHIP FOR SCALE. LAMPS LIT: ITS WEAK POINT OPEN.', PAD, 80, '#9fb0d0', 1);
  panels.forEach((p, i) => {
    const x = PAD + (i % 2) * (PW + PAD), y = 120 + Math.floor(i / 2) * (PH + CAP + PAD);
    c.drawImage(scene(p.farX, p.draw), x, y, PW, PH);
    const d = BOSS[p.n];
    text(`${'ABCD'[i]}.  ${d.name}`, x, y + PH + 14, '#e3a857', 1.5);
    text(d.sub, x + 22 + (d.name.length + 4) * 22.5, y + PH + 20, '#9fb0d0', 1);
    p.text.forEach((l, k) => text(l, x, y + PH + 60 + k * 22, k ? '#efe3cf' : '#f2cf8a', 1));
    // the shut look, small, in the panel's corner
    const shut = pic(p.n, false);
    const bw = shut.width + 8, bh = shut.height + 30;
    const bx = p.corner === 'tl' ? x + 8 : x + PW - bw - 8;
    const by = p.corner === 'tl' ? y + 8 : y + PH - bh - 8;
    c.fillStyle = 'rgba(11,15,28,0.6)';
    c.fillRect(bx, by, bw, bh);
    c.drawImage(shut, bx + 4, by + 4);
    c.save(); c.translate(bx + 4, by + 8 + shut.height); c.scale(2, 2); drawText(c, 'SHUT', 0, 0, '#9fb0d0', 1); c.restore();
  });
  return cv.toDataURL();
});
const out = process.argv[2] || REPO + 'art/white-front/all-code/white-front-boss-designs.png';
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', out);
await b.close();
server.close();

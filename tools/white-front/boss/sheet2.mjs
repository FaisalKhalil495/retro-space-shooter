// The White Front's boss, round two (owner: no flying or hovering boss):
// four ground designs on one sheet, each at its real
// size in the level (your ship for scale), with a glimpse of its signature
// attacks and what it does. Run: node tools/white-front/boss/sheet2.mjs [out.png]
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
  const { GROUND: BOSS } = await import('/tools/white-front/boss/ground.js?' + Date.now());
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
  const SNOW = 131; // the snow line, in game pixels
  const onSnow = (g, o, x, sink = 1) => at(g, o, x, SNOW - o.height / 2 + sink);
  const spray = (g, x, y, n, w = 22, h = 14) => { g.fillStyle = '#ffffff'; for (let i = 0; i < n; i++) g.fillRect(Math.round((x + (i / n) * w) * 2), Math.round((y - Math.sin((i / n) * Math.PI) * h - (i % 3)) * 2), 3, 3 + (i % 4)); };
  const chunk = (g, x, y) => { g.fillStyle = '#0e1222'; g.fillRect(Math.round(x * 2) - 3, Math.round(y * 2) - 3, 7, 7); g.fillStyle = '#d6e7f4'; g.fillRect(Math.round(x * 2) - 2, Math.round(y * 2) - 2, 5, 5); g.fillStyle = '#ffffff'; g.fillRect(Math.round(x * 2) - 2, Math.round(y * 2) - 2, 2, 2); };
  const panels = [
    { n: 'wheel', farX: 60, corner: 'tl', draw: (g) => {
      const o = pic('wheel', true);
      onSnow(g, o, 112, 2);
      spray(g, 104, 130, 20, 14, 10);
      // the arc of a leap ending in a slam: dotted, with the shockwave ring
      dots(g, 150, 70, 70, 20, 'rgba(200,100,63,0.75)'); dots(g, 70, 20, 40, 112, 'rgba(200,100,63,0.75)');
      ring(g, 40, 131, 16, RED);
      for (const [x, y] of [[90, 60], [96, 52], [84, 68]]) chunk(g, x, y);
      ship(g, 22, 70);
    }, text: [
      'A GIANT ARMOURED WHEEL WITH A GUN CAB IN ITS HUB.',
      'MOVES: ROLLS BACK AND FORTH, LEAPS, SLAMS DOWN.',
      'WEAK POINT: ITS HUB CAB, OPEN WHILE IT STOPS TO FIRE.',
      'ATTACKS: ROLLING CHARGE, LEAP AND SLAM SHOCKWAVE,',
      'HUB CANNON, FLUNG SPIKES AND ICE, A WALL OF SNOW.',
      'STAGES: ITS TYRE BREAKS, IT GOES FASTER, THEN BURNS.',
    ] },
    { n: 'auger', farX: 140, corner: 'tl', draw: (g) => {
      const o = pic('auger', true);
      onSnow(g, o, 110, 1);
      spray(g, 92, 128, 30, 18, 20);
      for (const [x, y] of [[70, 70], [60, 88], [80, 54], [52, 104], [88, 40]]) chunk(g, x, y);
      dots(g, 104, 96, 36, 76, 'rgba(255,255,255,0.9)');
      ship(g, 26, 78);
    }, text: [
      'A TRACKED ICE-BREAKER WITH TWO GREAT SCREW AUGERS.',
      'MOVES: GRINDS FORWARD, BACKS OFF, CHARGES THE SNOW.',
      'WEAK POINT: ITS ENGINE GRILLE, OPEN TO VENT THE HEAT.',
      'ATTACKS: HURLED ICE CHUNKS, A SNOW-BLOWER BLAST',
      'THAT PUSHES YOU, AUGER CHARGE, FLAK, SMOKE MORTARS.',
      'STAGES: ONE AUGER SNAPS, THEN THE ENGINE BURNS.',
    ] },
    { n: 'rail', farX: 220, corner: 'tl', draw: (g) => {
      const o = pic('rail', true);
      // the rails, laid along the snow
      g.fillStyle = '#3c4350'; g.fillRect(0, SNOW * 2 - 1, 416, 3);
      g.fillStyle = '#6f7888'; g.fillRect(0, SNOW * 2 - 1, 416, 1);
      for (let x = 2; x < 416; x += 14) { g.fillStyle = '#5a6070'; g.fillRect(x, SNOW * 2 + 2, 8, 3); }
      onSnow(g, o, 104, -1);
      // its charged shot: a long aim line at your height, and flak above
      dots(g, 104, 51, 0, 51, RED);
      for (const [x, y] of [[60, 24], [76, 16], [44, 30]]) { g.fillStyle = '#626871'; g.fillRect(x * 2 - 4, y * 2 - 4, 9, 9); g.fillStyle = '#eab25a'; g.fillRect(x * 2 - 4, y * 2, 9, 2); }
      ship(g, 24, 47);
    }, text: [
      'A COLOSSAL GUN CARRIAGE RUNNING ON RAILS.',
      'MOVES: SLIDES ALONG THE RAILS, KICKS BACK WHEN IT FIRES.',
      'WEAK POINT: ITS COILS, GLOWING WHILE IT CHARGES.',
      'ATTACKS: CHARGED RAIL SHOT DOWN AN AIM LINE, FLAK,',
      'MINE CARTS SENT DOWN THE RAILS, SHELLS, A SWEEP.',
      'STAGES: COILS BLOW ONE BY ONE, THEN IT OVERLOADS.',
    ] },
    { n: 'burrower', farX: 320, corner: 'tl', draw: (g) => {
      const o = pic('burrower', true);
      spray(g, 100, 134, 34, 90, 22);
      onSnow(g, o, 112, 6);
      // a crack in the snow where it will burst up next
      g.fillStyle = RED;
      for (let i = 0; i < 9; i++) g.fillRect(Math.round((38 + i * 3) * 2), Math.round((131 + (i % 2)) * 2), 4, 2);
      g.fillStyle = '#0e1222'; g.fillRect(48 * 2, 120 * 2, 3, 12); g.fillStyle = '#f2cf8a'; g.fillRect(48 * 2 + 1, 120 * 2 + 1, 1, 10);
      ship(g, 30, 74);
    }, text: [
      'A BURROWING MOLE-TANK WITH A TOOTHED CUTTER WHEEL.',
      'MOVES: DIVES UNDER THE SNOW, ONLY ITS FIN SHOWING.',
      'WEAK POINT: THE CUTTER\'S HUB, OPEN AS IT SPINS UP.',
      'ATTACKS: BURSTS UP UNDER YOU AFTER A WARNING CRACK,',
      'FLUNG ICE, A CUTTER CHARGE, FIN WAKE, SNOW GEYSERS.',
      'STAGES: ITS ARMOUR CRACKS, THEN IT STAYS UP AND RAGES.',
    ] },
  ];
  const PW = 832, PH = 576, PAD = 24, CAP = 200;
  const W = PW * 2 + PAD * 3, H = 120 + (PH + CAP + PAD) * 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#0b0f1c'; c.fillRect(0, 0, W, H);
  const text = (str, x, y, col, px) => { c.save(); c.translate(x, y); c.scale(2.5, 2.5); drawText(c, str, 0, 0, col, px); c.restore(); };
  text('THE WHITE FRONT: FOUR MORE BOSS DESIGNS, ON THE GROUND', PAD, 30, '#e3a857', 2);
  text('EACH AT ITS REAL SIZE IN THE LEVEL, YOUR SHIP FOR SCALE. LAMPS LIT: ITS WEAK POINT OPEN.', PAD, 80, '#9fb0d0', 1);
  panels.forEach((p, i) => {
    const x = PAD + (i % 2) * (PW + PAD), y = 120 + Math.floor(i / 2) * (PH + CAP + PAD);
    c.drawImage(scene(p.farX, p.draw), x, y, PW, PH);
    const d = BOSS[p.n];
    text(`${'EFGH'[i]}.  ${d.name}`, x, y + PH + 14, '#e3a857', 1.5);
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
const out = process.argv[2] || REPO + 'art/white-front/all-code/white-front-boss-designs-ground.png';
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', out);
await b.close();
server.close();

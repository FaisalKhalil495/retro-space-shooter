// Picture for the owner: every Iron Wolves enemy, big, with what it fires beside it,
// all drawn by the preview's own code.
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
  const R = [
    ['TWIN DART', 'sky, replaces the pod', 'Flies in pairs; each one blinks, then fires an aimed shot (twice).', 'dart', [['bullet', 'tracer']], 'red tracer bolt'],
    ['NEEDLE WING', 'sky, replaces the sniper', 'Shows a dotted aim line, then a fast rail shot along it.', 'needle', [['bullet', 'rail']], 'long icy needle'],
    ['WAKE HUNTER', 'sky, replaces the seeker', 'Locks an aim line on you, then dashes straight at you. No bullets: it rams.', 'hunter', [], 'none (it rams you)'],
    ['CREST BOMBER', 'sky, replaces the gunship', 'Marks a ring where you are and drops a bomb on it; the bomb bursts into shards.', 'bomber', [['img', 'c_bomb'], ['bullet', 'shard']], 'bomb, then spinning shards'],
    ['WOLF HOUND', 'sky, replaces the weaver', 'Weaves in groups; its jaw drops open before it spits once.', 'hound', [['bullet', 'slag']], 'red-hot glob'],
    ['FLAK STAR', 'sky, replaces the spinner', 'Hovers and turns; its lights glow before each ring of 8 shots.', 'flak', [['bullet', 'flak']], 'round grey flak ball'],
    ['SHELF SKIFF', 'ground, level 4\'s own', 'Slides in on skis, brakes, fires a 3-shot spread from its twin guns.', 'skiff', [['bullet', 'slug']], 'brass arrowhead'],
    ['SNOW ROLLER', 'ground, level 4\'s own', 'Rolls a charge along the snow that bursts into a fan of ice.', 'roller', [['img', 'c_charge'], ['bullet', 'ice']], 'rolling charge, then ice crystals'],
    ['ROCKET SLED', 'ground, level 4\'s artillery', 'Fires 5 rockets up; each drops down a marked column from sky to snow.', 'rsled', [['rocket']], 'rocket (falls down a column)'],
  ];
  const Z = 4, W = 1500, RH = 200, out = document.createElement('canvas'); out.width = W; out.height = 110 + R.length * RH + 20;
  const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.fillStyle = '#0b0f1c'; o.fillRect(0, 0, W, out.height);
  o.fillStyle = '#efe3cf'; o.font = 'bold 28px DejaVu Sans'; o.fillText('THE IRON WOLVES: ALL 9 ENEMIES AND WHAT THEY FIRE', 16, 40);
  o.font = '15px DejaVu Sans'; o.fillStyle = '#c9b8a0'; o.fillText('Level 4, The White Front. Drawn by the preview itself; enemies zoomed in, their bullets zoomed in a little more so you can see them.', 16, 66);
  const cell = (draw, w, h) => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#a9c4de'); sky.addColorStop(1, '#e6eef6'); g.fillStyle = sky; g.fillRect(0, 0, w, h); draw(); return [w, h]; };
  R.forEach(([name, role, how, type, fires, firesName], i) => {
    const y = 86 + i * RH;
    o.fillStyle = i % 2 ? '#10162a' : '#0d1222'; o.fillRect(8, y, W - 16, RH - 8);
    o.fillStyle = '#efe3cf'; o.font = 'bold 22px DejaVu Sans'; o.fillText(name, 24, y + 34);
    o.fillStyle = '#e8a060'; o.font = 'bold 14px DejaVu Sans'; o.fillText(role.toUpperCase(), 24, y + 56);
    o.fillStyle = '#c9b8a0'; o.font = '14px DejaVu Sans';
    const words = how.split(' '); let line = '', ly = y + 80; for (const w of words) { if (o.measureText(line + w).width > 330) { o.fillText(line, 24, ly); line = ''; ly += 19; } line += w + ' '; } o.fillText(line, 24, ly);
    // the enemy
    const im = IMG['c_' + type], cw = 84, chh = 46;
    cell(() => g.drawImage(im, Math.round(cw / 2 - im.width / 2), Math.round(chh / 2 - im.height / 2)), cw, chh);
    o.drawImage(off, 0, 0, cw, chh, 380, y + 4, cw * Z, chh * Z);
    // what it fires
    o.fillStyle = '#efe3cf'; o.font = 'bold 14px DejaVu Sans'; o.fillText('FIRES: ' + firesName.toUpperCase(), 760, y + 24);
    let x = 760;
    for (const f of fires) {
      cell(() => {
        if (f[0] === 'bullet') drawBullet({ x: 7, y: 7, vx: -60, vy: 0, kind: f[1], seed: 0.3 });
        else if (f[0] === 'img') { const i2 = IMG[f[1]]; g.drawImage(i2, Math.round(14 - i2.width / 2), Math.round(14 - i2.height / 2)); }
        else if (f[0] === 'rocket') { const keepR = Wd.rockets, keepS = Wd.strikes; Wd.rockets = [{ x: 7, y: 7, vx: 0, vy: 120, col: { x: 7, y: 30 } }]; Wd.strikes = []; drawStrikes(); Wd.rockets = keepR; Wd.strikes = keepS; }
      }, 28, 28);
      o.drawImage(off, 0, 0, 28, 28, x, y + 36, 28 * Z * 1.25, 28 * Z * 1.25);
      x += 28 * Z * 1.25 + 20;
    }
    if (!fires.length) { o.fillStyle = '#6f7a90'; o.font = 'italic 15px DejaVu Sans'; o.fillText('(nothing: it rams you)', 760, y + 90); }
  });
  return out.toDataURL();
});
fs.writeFileSync(DIR + 'iron-wolves-roster.png', Buffer.from(url.split(',')[1], 'base64'));
await b.close();

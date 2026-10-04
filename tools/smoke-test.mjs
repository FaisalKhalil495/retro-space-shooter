// Automated check: opens the game on simulated phones, plays a few seconds
// with fake thumbs, and saves screenshots. Run: node tools/smoke-test.mjs <outdir>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || '.';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const PHONES = [
  { name: 'android', width: 915, height: 412, dpr: 2.625, query: '' },
  { name: 'iphone', width: 874, height: 402, dpr: 3, query: '?safe=62' },
];

const browser = await chromium.launch();
let failures = 0;

for (const phone of PHONES) {
  const context = await browser.newContext({
    viewport: { width: phone.width, height: phone.height },
    deviceScaleFactor: phone.dpr,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + phone.query);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${phone.name}-1-start.png` });

  const cdp = await context.newCDPSession(page);
  const touch = (type, points) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map(([x, y, id]) => ({ x, y, id })),
    });

  // Tap to start.
  await touch('touchStart', [[phone.width / 2, phone.height / 2, 1]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(800);

  const L = await page.evaluate(() => window.__ember.layout);
  const fire = await page.evaluate(() => {
    const b = window.__ember.controls.buttons.fire;
    return [b.x, b.y];
  });
  const padX = L.leftZone.x + L.leftZone.w / 2;
  const padY = L.leftZone.y + L.leftZone.h * 0.6;

  // Left thumb down, slide up-right; right thumb holds Fire.
  const y0 = await page.evaluate(() => window.__ember.game.player.y);
  await touch('touchStart', [[padX, padY, 1]]);
  await touch('touchStart', [[padX, padY, 1], [fire[0], fire[1], 2]]);
  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', [[padX + i * 4, padY - i * 4, 1], [fire[0], fire[1], 2]]);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(900);
  const mid = await page.evaluate(() => {
    const g = window.__ember.game;
    const c = window.__ember.controls;
    return { y: g.player.y, x: g.player.x, bullets: g.bullets.length, dir: c.pad.dir, fireHeld: c.buttons.fire.held };
  });
  await page.screenshot({ path: `${out}/${phone.name}-2-playing.png` });
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({
    fireHeld: window.__ember.controls.buttons.fire.held,
    padActive: window.__ember.controls.pad.active,
  }));

  // Near-miss: touch well outside the Special button but closer to it.
  const sp = await page.evaluate(() => {
    const b = window.__ember.controls.buttons.special;
    return [b.x, b.y, b.r];
  });
  await touch('touchStart', [[sp[0] + sp[2] * 0.6, sp[1] - sp[2] * 1.4, 3]]);
  await page.waitForTimeout(50);
  const nearMiss = await page.evaluate(() => window.__ember.controls.buttons.special.held);
  await touch('touchEnd', []);

  // Let enemies arrive.
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/${phone.name}-3-enemies.png` });
  const state = await page.evaluate(() => {
    const g = window.__ember.game;
    return { enemies: g.enemies.length, score: g.score, lives: g.lives, state: g.state };
  });

  const checks = {
    'ship moved up': mid.y < y0 - 10,
    'ship moved right': mid.x > 30,
    'diagonal direction (up-right = 7)': mid.dir === 7,
    'fire held fires bullets': mid.fireHeld === 1 && mid.bullets > 2,
    'releasing clears controls': after.fireHeld === 0 && !after.padActive,
    'near-miss counts for Special': nearMiss === 1,
    'enemies spawned': state.enemies > 0 || state.score > 0,
    'no script errors': errors.length === 0,
  };
  console.log(`\n[${phone.name}] layout game=${JSON.stringify(L.game)} margins L=${L.leftZone.w.toFixed(0)} R=${L.rightZone.w.toFixed(0)}`);
  console.log(`  state ${JSON.stringify(state)}`);
  for (const [name, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) failures++;
  }
  if (errors.length) console.log('  errors:', errors);

  // Health and shield: a hit costs a block; a shield soaks up hits.
  const health = await page.evaluate(() => {
    const g = window.__ember.game;
    g.state = 'playing';
    g.player.entering = 0;
    g.health = 5;
    g.hurtPlayer(1);
    const afterHit = g.health;
    g.powerups.collect('shield');
    g.hurtPlayer(3);
    const shielded = g.health;
    g.powerups.collect('repair');
    return { afterHit, shielded, repaired: g.health };
  });
  const hpOk = health.afterHit === 4 && health.shielded === 4 && health.repaired === 5;
  console.log(`  ${hpOk ? 'PASS' : 'FAIL'}  health bar, shield and repair ${JSON.stringify(health)}`);
  if (!hpOk) failures++;

  // Smart supply: the pod gives what you need most.
  const smart = await page.evaluate(() => {
    const g = window.__ember.game;
    g.powerups.reset();
    g.weapons.reset();
    g.health = 2;
    const low = g.smartSupply();
    g.health = 5;
    const noShield = g.smartSupply();
    g.powerups.collect('shield');
    const shielded = g.smartSupply();
    g.weapons.collect('laser');
    const armed = g.smartSupply();
    return { low, noShield, shielded, armed };
  });
  const smartOk = smart.low === 'repair' && smart.noShield === 'shield' && smart.shielded === 'laser' &&
    ['rapid', 'spread'].includes(smart.armed);
  console.log(`  ${smartOk ? 'PASS' : 'FAIL'}  smart supply choices ${JSON.stringify(smart)}`);
  if (!smartOk) failures++;

  // Portrait: should ask to rotate.
  await page.setViewportSize({ width: phone.height, height: phone.width });
  await page.waitForTimeout(400);
  const rotateShown = await page.evaluate(() => !document.getElementById('rotate').hidden);
  console.log(`  ${rotateShown ? 'PASS' : 'FAIL'}  portrait shows "turn sideways"`);
  if (!rotateShown) failures++;
  await page.screenshot({ path: `${out}/${phone.name}-4-portrait.png` });
  await context.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

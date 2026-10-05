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

  // Rockjaw's rock fragments: gentle, flying away from the ship's path; spat
  // rocks warn before splitting into 2 slower pieces.
  const rocks = await page.evaluate(() => {
    const g = window.__ember.game;
    g.enemies = [];
    g.enemyShots = [];
    const big = g.spawnEnemy('rockBig', 120, 60, { vx: -50, vy: 0, byBoss: true });
    g.killEnemy(big);
    const shards = g.enemies.filter((e) => e.type === 'rockShard');
    const start = shards.map((s) => ({ vx: Math.round(s.vx), vy: Math.round(Math.abs(s.vy)) }));
    const spit = g.spawnEnemy('rockSpit', 150, 60, { vx: -40, vy: 0, splitAt: 0.1 });
    const step = () => g.moveWorld(1 / 60);
    for (let i = 0; i < 12; i++) step(); // 0.2s: cracking, not yet burst
    const warned = !spit.dead && g.enemyShots.length === 0;
    for (let i = 0; i < 30; i++) step(); // past the 0.5s warning
    const gravel = g.enemyShots.map((s) => Math.round(Math.hypot(s.vx, s.vy)));
    g.enemies = [];
    g.enemyShots = [];
    return {
      shards: shards.length,
      ram: shards.map((s) => s.T.ram),
      vy: start.map((s) => s.vy),
      vx: start.map((s) => s.vx),
      warned,
      gravel,
    };
  });
  const rocksOk = rocks.shards === 2 && rocks.ram.every((r) => r === 1) && rocks.vy.every((v) => v >= 40) &&
    rocks.vx.every((v) => Math.abs(v) < 30) && rocks.warned && rocks.gravel.length === 2 && rocks.gravel.every((v) => v <= 72);
  console.log(`  ${rocksOk ? 'PASS' : 'FAIL'}  gentler rock fragments ${JSON.stringify(rocks)}`);
  if (!rocksOk) failures++;

  // Level rocks are deadlier: big rocks burst into 3 shards in all directions
  // (some towards the ship), small rocks crack into 2 pebbles.
  const lvlRocks = await page.evaluate(() => {
    const g = window.__ember.game;
    g.enemies = [];
    g.enemyShots = [];
    g.killEnemy(g.spawnEnemy('rockBig', 120, 60, { vx: -30, vy: 0 }));
    const shards = g.enemies.filter((e) => e.type === 'rockShard').map((s) => Math.round(s.vx));
    g.enemies = [];
    g.killEnemy(g.spawnEnemy('rockSmall', 120, 60, { vx: -30, vy: 0 }));
    const pebbles = g.enemyShots.filter((s) => s.kind === 'gravel').length;
    g.enemies = [];
    g.enemyShots = [];
    return { shards, pebbles };
  });
  const lvlOk = lvlRocks.shards.length === 3 && lvlRocks.shards.some((v) => v < -20) && lvlRocks.pebbles === 2;
  console.log(`  ${lvlOk ? 'PASS' : 'FAIL'}  level rocks burst outwards ${JSON.stringify(lvlRocks)}`);
  if (!lvlOk) failures++;

  // New shooters: a sniper shows its aim line then fires a fast shot; a
  // spinner fires an 8-way star.
  const shooters = await page.evaluate(() => {
    const g = window.__ember.game;
    g.enemies = [];
    g.enemyShots = [];
    const sn = g.spawnEnemy('sniper', 180, 40, { targetX: 186 });
    let aimed = false;
    for (let i = 0; i < 240 && !g.enemyShots.length; i++) {
      g.moveWorld(1 / 120);
      if (sn.aimLine > 0) aimed = true;
    }
    const fast = g.enemyShots.filter((s) => s.kind === 'fast').length;
    g.enemies = [];
    g.enemyShots = [];
    g.spawnEnemy('spinner', 180, 60, { targetX: 140 });
    let star = 0;
    for (let i = 0; i < 360 && !star; i++) {
      g.moveWorld(1 / 120);
      star = g.enemyShots.length;
    }
    g.enemies = [];
    g.enemyShots = [];
    return { aimed, fast, star };
  });
  const shootOk = shooters.aimed && shooters.fast === 1 && shooters.star === 8;
  console.log(`  ${shootOk ? 'PASS' : 'FAIL'}  sniper aims then fires; spinner star burst ${JSON.stringify(shooters)}`);
  if (!shootOk) failures++;

  // v0.7.0: pods only fire when facing you; machines explode without blood,
  // weavers bleed lightly; rocks carry real loot.
  const v7 = await page.evaluate(() => {
    const g = window.__ember.game;
    const step = (n) => { for (let i = 0; i < n; i++) g.moveWorld(1 / 120); };
    const clear = () => { g.enemies = []; g.enemyShots = []; g.pickups = []; };
    g.player.x = 60; g.player.y = 60;
    clear();
    g.spawnEnemy('drifter', 20, 60, { speed: -64, flip: true, shooter: true });
    step(120);
    const behind = g.enemyShots.length;
    clear();
    g.spawnEnemy('drifter', 40, 40, { shooter: true });
    step(120);
    const passed = g.enemyShots.length;
    clear();
    g.spawnEnemy('drifter', 120, 20, { speed: 22, vy: 62, shooter: true });
    step(60);
    const dive = g.enemyShots.length;
    clear();
    g.gore.reset();
    g.killEnemy(g.spawnEnemy('gunner', 120, 60));
    const gunner = { blood: g.gore.drops.length, fire: g.blasts.fires.length };
    g.gore.reset();
    g.killEnemy(g.spawnEnemy('weaver', 120, 60));
    step(240);
    const weaver = { stains: g.gore.splats.length };
    g.gore.reset();
    g.killEnemy(g.spawnEnemy('weaver', 120, 60));
    weaver.blood = g.gore.drops.length;
    clear();
    g.health = 5;
    g.weapons.kind = 'laser';
    g.weapons.ammo = 1;
    let drops = 0;
    const kinds = new Set();
    for (let i = 0; i < 600; i++) {
      g.pickups = [];
      g.killEnemy(g.spawnEnemy('rockBig', 120, 60));
      if (g.pickups.length) { drops++; kinds.add(g.pickups[0].kind); }
      g.enemies = [];
    }
    g.enemyShots = [];
    g.pickups = [];
    // Rock ammo is decided when collected: it tops up what you carry then.
    g.weapons.kind = 'bomb';
    g.weapons.ammo = 1;
    g.collectPickup('ammo');
    const ammo = { kind: g.weapons.kind, n: g.weapons.ammo };
    // A pod that turns away loses its wind-up, so the next shot gets the
    // full warning blink.
    g.player.x = 60;
    const pod = g.spawnEnemy('drifter', 100, 60, { speed: 0.01, shooter: true });
    for (let i = 0; i < 36; i++) g.moveWorld(1 / 120);
    g.player.x = 140;
    g.moveWorld(1 / 120);
    const aimReset = pod.aim === 0 && !pod.fired;
    g.enemies = [];
    return { behind, passed, dive, gunner, weaver, rockRate: +(drops / 600).toFixed(2), kinds: [...kinds], ammo, aimReset };
  });
  const v7ok = v7.behind === 0 && v7.passed === 0 && v7.dive === 1 && v7.gunner.blood === 0 && v7.gunner.fire > 0 &&
    v7.weaver.blood > 0 && v7.weaver.blood <= 9 && v7.weaver.stains === 0 && v7.rockRate > 0.18 && v7.rockRate < 0.32 &&
    v7.kinds.includes('ammo') && !v7.kinds.some((k) => ['bomb', 'rockets', 'laser'].includes(k)) &&
    v7.ammo.kind === 'bomb' && v7.ammo.n === 4 && v7.aimReset;
  console.log(`  ${v7ok ? 'PASS' : 'FAIL'}  pods face you, blasts not blood, rock loot ${JSON.stringify(v7)}`);
  if (!v7ok) failures++;

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

// Automated check: opens the game on simulated phones, plays a few seconds
// with fake thumbs, and saves screenshots. Run: node tools/smoke-test.mjs <outdir>
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const out = process.argv[2] || '.';
const { server, base } = await serve();

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

  // Boss supply pods: survival pods give what keeps you alive; weapon pods
  // give special ammo, and their light always matches what's inside.
  const smart = await page.evaluate(() => {
    const g = window.__ember.game;
    const light = () => g.pickupInfo('weapon').name;
    g.powerups.reset();
    g.weapons.reset();
    g.health = 2;
    const low = g.smartSupply();
    const lowWeapon = [g.weaponSupply(), light()];
    g.health = 5;
    const noShield = g.smartSupply();
    const weapon = [g.weaponSupply(), light()];
    g.powerups.collect('shield');
    const shielded = g.smartSupply();
    g.weapons.kind = 'bomb';
    g.weapons.ammo = 1;
    const topUp = [g.weaponSupply(), light()];
    g.weapons.ammo = 5;
    const full = [g.weaponSupply(), light()];
    g.weapons.reset();
    g.powerups.reset();
    g.health = 5;
    return { low, lowWeapon, noShield, weapon, shielded, topUp, full };
  });
  const same = (a, b) => a.join() === b.join();
  const smartOk = smart.low === 'repair' && same(smart.lowWeapon, ['repair', 'REPAIR']) &&
    smart.noShield === 'shield' && same(smart.weapon, ['laser', 'LASER']) &&
    ['rapid', 'spread'].includes(smart.shielded) && same(smart.topUp, ['ammo', 'AMMO']) &&
    same(smart.full, ['rapid', 'RAPID FIRE']);
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
    // Small rocks never drop anything; at full health no Repair drops.
    let small = 0;
    for (let i = 0; i < 300; i++) {
      g.killEnemy(g.spawnEnemy('rockSmall', 120, 60));
      small += g.pickups.length;
      g.pickups = [];
      g.enemies = [];
    }
    g.enemyShots = [];
    // When hurt: small rocks still drop nothing, and Repair drops again.
    g.health = 2;
    let hurtRepair = 0;
    for (let i = 0; i < 300; i++) {
      g.killEnemy(g.spawnEnemy('rockSmall', 120, 60));
      small += g.pickups.length;
      g.pickups = [];
      g.killEnemy(g.spawnEnemy('rockBig', 120, 60));
      if (g.pickups.some((pk) => pk.kind === 'repair')) hurtRepair++;
      g.pickups = [];
      g.enemies = [];
    }
    g.enemyShots = [];
    g.health = 5;
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
    return { behind, passed, dive, gunner, weaver, rockRate: +(drops / 600).toFixed(2), kinds: [...kinds], ammo, aimReset, small, hurtRepair };
  });
  const v7ok = v7.behind === 0 && v7.passed === 0 && v7.dive === 1 && v7.gunner.blood === 0 && v7.gunner.fire > 0 &&
    v7.weaver.blood > 0 && v7.weaver.blood <= 9 && v7.weaver.stains === 0 && v7.rockRate > 0.28 && v7.rockRate < 0.42 && v7.small === 0 && !v7.kinds.includes('repair') && v7.hurtRepair > 40 &&
    v7.kinds.includes('ammo') && !v7.kinds.some((k) => ['bomb', 'rockets', 'laser'].includes(k)) &&
    v7.ammo.kind === 'bomb' && v7.ammo.n === 4 && v7.aimReset;
  console.log(`  ${v7ok ? 'PASS' : 'FAIL'}  pods face you, blasts not blood, rock loot ${JSON.stringify(v7)}`);
  if (!v7ok) failures++;

  // Stage bonus: both items reach the ship even if the boss's mouth is off
  // the left edge of the screen (right after a charge).
  const bonus = await page.evaluate(() => {
    const g = window.__ember.game;
    g.enemies = [];
    g.pickups = [];
    g.health = 3;
    g.weapons.kind = 'laser';
    g.weapons.ammo = 1;
    g.player.x = 60;
    g.player.y = 60;
    g.player.invuln = 99;
    const got = [];
    const collect = g.collectPickup.bind(g);
    g.collectPickup = (k) => { got.push(k); collect(k); };
    const fake = { x: -40, y: 50, w: 40, h: 40, T: { aimPoint: () => ({ x: -2, y: 70 }) } };
    g.stageBonus(fake, 2);
    for (let i = 0; i < 360 && got.length < 2; i++) {
      g.moveWorld(1 / 120);
      g.collide();
    }
    g.collectPickup = collect;
    const left = g.pickups.filter((pk) => !pk.taken).length;
    g.pickups = [];
    g.weapons.reset();
    g.health = 5;
    return { got, left };
  });
  const bonusOk = bonus.got.length === 2 && bonus.got.includes('repair') && bonus.got.includes('ammo') && bonus.left === 0;
  console.log(`  ${bonusOk ? 'PASS' : 'FAIL'}  stage bonus reaches the ship from off-screen ${JSON.stringify(bonus)}`);
  if (!bonusOk) failures++;

  // Clean-up rules: Rockjaw's inhale only kills while pulling; plain pods
  // never drop loot (even when you're hurt); weavers blink before spitting;
  // a seeker that gets too close stops its warning blink.
  const rules = await page.evaluate(() => {
    const g = window.__ember.game;
    g.enemies = [];
    g.pickups = [];
    const RJ = (() => { const e = g.spawnEnemy('rockjaw', 300, 40); g.enemies = []; g.boss = null; return e.T; })();
    const afterSnap = RJ.contactDamage({ attack: { name: 'inhale', pulling: false } });
    const pulling = RJ.contactDamage({ attack: { name: 'inhale', pulling: true } });
    g.health = 2;
    let podDrops = 0;
    for (let i = 0; i < 300; i++) {
      g.killEnemy(g.spawnEnemy('drifter', 120, 60));
      podDrops += g.pickups.length;
      g.pickups = [];
      g.enemies = [];
    }
    g.health = 5;
    g.player.x = 20;
    g.player.y = 60;
    const w = g.spawnEnemy('weaver', 150, 60);
    w.spitAt = 0.01;
    let blinked = false;
    let shotAt = -1;
    for (let i = 0; i < 120 && shotAt < 0; i++) {
      g.moveWorld(1 / 120);
      if (w.charge) blinked = true;
      if (g.enemyShots.length) shotAt = i;
    }
    g.enemies = [];
    g.enemyShots = [];
    const s = g.spawnEnemy('seeker', 120, 60);
    g.player.x = 50;
    for (let i = 0; i < 12; i++) g.moveWorld(1 / 120);
    g.player.x = s.x - 20; // suddenly too close
    g.moveWorld(1 / 120);
    const seekerStopped = s.charge === 0 && !s.fired;
    g.enemies = [];
    g.enemyShots = [];
    return { afterSnap, pulling, podDrops, weaverBlinkFirst: blinked && shotAt > 30, seekerStopped };
  });
  const rulesOk = rules.afterSnap === 2 && rules.pulling === 5 && rules.podDrops === 0 &&
    rules.weaverBlinkFirst && rules.seekerStopped;
  console.log(`  ${rulesOk ? 'PASS' : 'FAIL'}  clean-up rules ${JSON.stringify(rules)}`);
  if (!rulesOk) failures++;

  // A boss never starts an attack while its bubble is up (e.g. gloating
  // after a kill), and when it floats high the bubble goes below it, not
  // into the space between ship and boss.
  const talk = await page.evaluate(() => {
    const g = window.__ember.game;
    g.enemies = [];
    g.enemyShots = [];
    const e = g.spawnEnemy('rockjaw', 0, 0);
    Object.assign(e, { mode: 'fight', entered: true, attack: null, queued: null, idle: 0, timer: 0 });
    e.x = 130;
    e.y = 50 - e.h / 2;
    g.say(e, 'PICKING YOU OUT OF MY TEETH');
    g.speech.draw(document.createElement('canvas').getContext('2d'), (v) => v, g.voicePointOf);
    const spot = g.speech.bubble.spot;
    let attackedWhileTalking = false;
    for (let i = 0; i < 400 && g.isSpeaking(e); i++) {
      e.T.update(e, 1 / 120, g);
      g.speech.update(1 / 120);
      if (e.attack) attackedWhileTalking = true;
    }
    let attackedAfter = false;
    const stillTalking = g.isSpeaking(e);
    for (let i = 0; i < 240 && !attackedAfter; i++) {
      e.T.update(e, 1 / 120, g);
      g.speech.update(1 / 120);
      if (e.attack) attackedAfter = true;
    }
    g.enemies = [];
    g.enemyShots = [];
    g.boss = null;
    g.speech.reset();
    return { spot, attackedWhileTalking, attackedAfter, stillTalking };
  });
  const talkOk = (talk.spot === 0 || talk.spot === 1) && !talk.attackedWhileTalking && talk.attackedAfter && !talk.stillTalking;
  console.log(`  ${talkOk ? 'PASS' : 'FAIL'}  boss holds attacks while talking; bubble stays out of the way ${JSON.stringify(talk)}`);
  if (!talkOk) failures++;

  // Portrait: should ask to rotate.
  await page.setViewportSize({ width: phone.height, height: phone.width });
  await page.waitForTimeout(400);
  const rotateShown = await page.evaluate(() => !document.getElementById('rotate').hidden);
  console.log(`  ${rotateShown ? 'PASS' : 'FAIL'}  portrait shows "turn sideways"`);
  if (!rotateShown) failures++;
  await page.screenshot({ path: `${out}/${phone.name}-4-portrait.png` });
  await context.close();
}

// Stage 3A: level flow. "?level=2" starts on level 2; clearing level 1
// carries score, lives and the special into level 2 with full health;
// beating the Siege Crawler clears level 2; after the last level you're back
// on level 1 with a fresh run. A level that ends without a boss clears
// itself.
{
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '?level=2');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForTimeout(300);
  const flow = await page.evaluate(() => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    const startedOn = g.level.number;
    const idle = { dx: 0, dy: 0, fire: true, special: false, tap: false };
    const tap = { ...idle, tap: true };
    // Jump to level 2's boss (invincible); once the fight is on, finish the
    // Siege Crawler off and the level should clear.
    g.runner.skipTo(g.runner.endsAt - 0.5);
    let t = 0;
    let killed = false;
    while (g.state !== 'clear' && t < 60) {
      g.player.invuln = 1;
      const b = g.boss;
      if (b && b.mode === 'fight' && !killed) {
        killed = true;
        b.hatch = 1;
        b.hp = 1;
        g.damage(b, 5);
      }
      g.update(1 / 120, idle);
      t += 1 / 120;
    }
    const level2Cleared = killed && g.state === 'clear';
    // Tap on: no level 3 yet, so back to level 1, fresh.
    g.stateTimer = 4;
    g.update(1 / 120, tap);
    const afterLast = { level: g.level.number, score: g.score, lives: g.lives };
    // Clear level 1 with some score, 2 lives and 2 laser shots.
    g.score = 1234;
    g.lives = 2;
    g.health = 3;
    g.weapons.kind = 'laser';
    g.weapons.ammo = 2;
    g.levelClear();
    const withBonus = g.score;
    g.stateTimer = 4;
    g.update(1 / 120, tap);
    const next = { level: g.level.number, score: g.score, expected: withBonus, lives: g.lives, health: g.health, weapon: g.weapons.kind, ammo: g.weapons.ammo, state: g.state };
    // Dying just after a boss dies must not block the level clear.
    g.levelIndex = 0;
    g.reset();
    g.clearPending = true;
    g.state = 'dying';
    g.stateTimer = 0;
    let t2 = 0;
    while (g.state !== 'clear' && t2 < 5) {
      g.update(1 / 120, idle);
      t2 += 1 / 120;
    }
    const clearAfterRespawn = g.state === 'clear';
    // A level that ends without a boss (an 'end' event) still ends when you
    // start past it. (No real level does this right now, so a stand-in
    // timeline is swapped into level 2 for a moment.)
    g.levelIndex = 1;
    const realEvents = g.level.events;
    g.level.events = [[2, 'row', { n: 3 }], [6, 'end']];
    g.startAt = 10;
    g.reset();
    let t3 = 0;
    while (g.state !== 'clear' && t3 < 15) {
      g.player.invuln = 1;
      g.update(1 / 120, idle);
      t3 += 1 / 120;
    }
    const skippedEndStillEnds = g.state === 'clear';
    g.level.events = realEvents;
    g.startAt = 0;
    return {
      clearAfterRespawn, skippedEndStillEnds,
      startedOn, level2Cleared, afterLast,
      next,
    };
  });
  const flowOk = flow.startedOn === 2 && flow.level2Cleared && flow.clearAfterRespawn && flow.skippedEndStillEnds &&
    flow.afterLast.level === 1 && flow.afterLast.score === 0 && flow.afterLast.lives === 3 &&
    flow.next.level === 2 && flow.next.score === flow.next.expected && flow.next.lives === 2 &&
    flow.next.health === 5 && flow.next.weapon === 'laser' && flow.next.ammo === 2 && flow.next.state === 'playing' &&
    errs.length === 0;
  console.log(`${flowOk ? 'PASS' : 'FAIL'}  level flow: level 1 -> level 2 carries score, lives and special ${JSON.stringify(flow)} ${errs.join(' ')}`);
  if (!flowOk) failures++;
  await context.close();
}


// Stage 3B-1: Rust Moon's ground, spires and new enemies follow the rules.
{
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '?level=2');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    // The same copy of the wave patterns the game uses.
    const v = new URL(document.querySelector('script[type=module]').src).search;
    const { PATTERNS } = await import('/js/waves.js' + v);
    const idle = { dx: 0, dy: 0, fire: false, special: false, tap: false };
    const step = (sec, keepSafe = true) => {
      for (let i = 0; i < sec * 120; i++) {
        if (keepSafe) g.player.invuln = 1;
        g.update(1 / 120, idle);
      }
    };
    // A quiet level 2 with nothing scheduled.
    const quiet = () => {
      g.reset();
      g.runner.next = g.level.events.length;
      g.banner = null;
      g.player.entering = 0;
      g.player.x = 20;
      g.player.y = 40;
    };
    const res = {};

    // Cliff turret: shots spark off while it's shut; only hurt while open.
    quiet();
    const tur = g.spawnEnemy('cliffTurret', 150, 0);
    step(0.1);
    g.damage(tur, 1);
    res.turretShutHp = tur.hp; // still 4
    let opened = false;
    for (let i = 0; i < 400 && !opened; i++) {
      step(1 / 120);
      opened = tur.open;
    }
    g.damage(tur, 1);
    res.turretOpenHp = tur.hp; // 3
    // ...and it never fires backwards at a ship that's behind it.
    quiet();
    const tur2 = g.spawnEnemy('cliffTurret', 60, 0);
    g.player.x = 120;
    step(4);
    res.turretShotsWhenBehind = g.enemyShots.length;
    res.turretOpenedWhenBehind = tur2.open || tur2.mode !== 'shut';

    // Every turret can be hit by the ship's ordinary straight gun from some
    // height: on a low floor mound, on a short spire and on a tall one.
    const reachable = (makeTurret) => {
      let heights = 0;
      for (let y = 12; y < g.terrain.floorY; y += 2) {
        quiet();
        const t = makeTurret();
        t.mode = 'open';
        t.open = true;
        t.timer = 99;
        t.shotCd = 99;
        g.update(1 / 120, idle);
        for (let i = 0; i < 90; i++) {
          g.player.invuln = 1;
          g.player.x = 20;
          g.player.y = y;
          g.update(1 / 120, { ...idle, fire: true });
        }
        if (t.hp < 4) heights++;
      }
      return heights;
    };
    const onSpire = (h) => () => {
      const s = g.terrain.addSpire(h, 12, 3);
      s.x = 140;
      return g.spawnEnemy('cliffTurret', s.x, 0, { spire: s });
    };
    res.turretReach = [
      reachable(() => {
        PATTERNS.turret(g, g.rand);
        const t = g.enemies.find((e) => e.type === 'cliffTurret');
        if (t.spire) t.spire.x = 140;
        else t.x = 140;
        return t;
      }),
      reachable(onSpire(22)),
      reachable(onSpire(74)),
    ];

    // A turret whose first shot was held back still spaces its two shots.
    quiet();
    const tur3 = g.spawnEnemy('cliffTurret', 100, 0);
    tur3.mode = 'open';
    tur3.open = true;
    tur3.timer = 0.9;
    tur3.shotCd = 0;
    tur3.shots = 0;
    g.player.x = 150; // behind it
    step(0.4);
    g.player.x = 20;
    const shotTimes = [];
    for (let i = 0; i < 70; i++) {
      const before = g.enemyShots.length;
      step(1 / 120);
      if (g.enemyShots.length > before) shotTimes.push(g.time);
    }
    res.turretShotGap = shotTimes.length === 2 ? +(shotTimes[1] - shotTimes[0]).toFixed(2) : -1;

    // Mortar: the red ring (the shell's target) is up for ~0.9 s before the
    // burst, sits where you were at launch, and the burst throws 4 fragments.
    quiet();
    g.spawnEnemy('mortarCrawler', 150, 0);
    let shell = null;
    let launchAt = null;
    for (let i = 0; i < 600 && !shell; i++) {
      step(1 / 120);
      shell = g.enemies.find((e) => e.type === 'mortarShell');
    }
    const p = g.player;
    res.ringOnYou = !!shell && Math.abs(shell.tx - (p.x + p.w / 2)) < 1 && Math.abs(shell.ty - (p.y + p.h / 2)) < 1;
    launchAt = g.time;
    g.player.y = 100; // dodge
    let burstAt = null;
    for (let i = 0; i < 240 && burstAt === null; i++) {
      step(1 / 120);
      if (shell.dead) burstAt = g.time;
    }
    res.ringWarning = burstAt === null ? -1 : +(burstAt - launchAt).toFixed(2);
    res.fragments = g.enemyShots.filter((s) => s.kind === 'gravel').length;

    // Crashing into a spire costs exactly 2 blocks and knocks you clear.
    quiet();
    const sp = g.terrain.addSpire(60, 14, 5);
    sp.x = 60;
    g.player.x = 52;
    g.player.y = g.terrain.floorY - 30;
    g.player.invuln = 0;
    g.health = 5;
    g.update(1 / 120, idle);
    res.spireDamage = 5 - g.health;
    const q = g.player;
    res.knockedClear = !g.terrain.hits(q.x + 5, q.y + 3, q.w - 9, q.h - 6);
    // Hitting a spire's right side pushes you back to the right, not through.
    quiet();
    const sp2 = g.terrain.addSpire(60, 14, 5);
    sp2.x = 60;
    g.player.x = sp2.x + sp2.w - 10; // just touching its right side
    g.player.y = g.terrain.floorY - 30;
    g.player.invuln = 0;
    g.update(1 / 120, idle);
    res.pushedRight = g.player.x > sp2.x + sp2.w;
    // Spires stay solid while you're flashing after a hit (no damage then).
    quiet();
    const sp3 = g.terrain.addSpire(60, 14, 5);
    sp3.x = 60;
    g.player.x = 52;
    g.player.y = g.terrain.floorY - 30;
    g.player.invuln = 0.8;
    g.health = 5;
    g.update(1 / 120, idle);
    const f = g.player;
    res.solidWhileFlashing = !g.terrain.hits(f.x + 5, f.y + 3, f.w - 9, f.h - 6) && g.health === 5;

    // A mortar shell that touches you on the way bursts right there (1 block,
    // 4 fragments, no points for ramming it).
    quiet();
    g.health = 5;
    g.enemyShots = [];
    const sc = g.score;
    const touch = g.spawnEnemy('mortarShell', 150, 100, { tx: 20, ty: 40 });
    g.player.invuln = 0;
    g.player.x = touch.x - 14;
    g.player.y = touch.y - 4;
    g.update(1 / 120, idle);
    res.shellTouch = { dead: touch.dead, hurt: 5 - g.health, fragments: g.enemyShots.length, points: g.score - sc };

    // Enemy shots fly 10% faster on Rust Moon.
    quiet();
    g.enemyShots = [];
    g.fireShot(100, 60, 0, 100);
    res.shotSpeed = +g.enemyShots[0].vx.toFixed(1);

    // Dive-bombers crash into the ground here instead of flying through it.
    quiet();
    const diver = g.spawnEnemy('drifter', 100, g.terrain.floorY - 12, { speed: 10, vy: 62 });
    step(0.5);
    res.diverCrashed = diver.dead;

    // Big rusty boulders carry loot about 35% of the time; small ones never.
    quiet();
    let big = 0;
    let small = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      g.pickups = [];
      g.killEnemy(g.spawnEnemy('rockBig', 100, 60, { rust: true, ground: true }));
      big += g.pickups.length;
      g.pickups = [];
      g.killEnemy(g.spawnEnemy('rockSmall', 100, 60, { rust: true, ground: true }));
      small += g.pickups.length;
      g.enemies = [];
      g.enemyShots = [];
    }
    res.bigLoot = +(big / N).toFixed(3);
    res.smallLoot = small;
    g.reset();
    return res;
  });
  const ok = r.turretShutHp === 4 && r.turretOpenHp === 3 && r.turretShotsWhenBehind === 0 && !r.turretOpenedWhenBehind &&
    r.ringOnYou && r.ringWarning >= 0.85 && r.ringWarning <= 0.95 && r.fragments === 4 &&
    r.spireDamage === 2 && r.knockedClear && r.shotSpeed === 110 && r.diverCrashed &&
    r.turretReach.every((n) => n > 0) && r.turretShotGap >= 0.34 && r.pushedRight && r.solidWhileFlashing &&
    r.shellTouch.dead && r.shellTouch.hurt === 1 && r.shellTouch.fragments === 4 && r.shellTouch.points === 0 &&
    r.bigLoot > 0.31 && r.bigLoot < 0.39 && r.smallLoot === 0 && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Rust Moon rules ${JSON.stringify(r)} ${errs.join(' ')}`);
  if (!ok) failures++;
  await context.close();
}


// Stage 3B-2: the Siege Crawler plays by the rules.
{
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '?level=2');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    const idle = { dx: 0, dy: 0, fire: false, special: false, tap: false };
    // A Siege Crawler already in the fight, nothing else around.
    const fresh = (phase = 1) => {
      g.reset();
      g.runner.next = g.level.events.length;
      g.banner = null;
      g.player.entering = 0;
      const b = g.spawnEnemy('siegeCrawler', 0, 0);
      Object.assign(b, { mode: 'fight', entered: true, taunted: true, x: 120, phase, idle: 99, attack: null });
      return b;
    };
    const res = {};

    // Its core is armoured unless the hatch is open; shots at the core's
    // height from the ship really reach it when it is open.
    let b = fresh();
    const c = g.aimPoint(b);
    g.strike(b, c.x - 8, c.y - 1, 7, 2, 1);
    res.shutHp = b.maxHp - b.hp;
    b.hatch = 1;
    b.hatchTarget = 1;
    g.player.x = 20;
    g.player.y = c.y - g.player.h / 2;
    for (let i = 0; i < 120; i++) {
      g.player.invuln = 1;
      b.hatch = 1; // held open for the test
      b.hatchTarget = 1;
      g.update(1 / 120, { ...idle, fire: true });
    }
    res.openHits = b.maxHp - b.hp;

    // Every attack warns (aim line, flak line, blinking hatch, rings, wind-up
    // or revving) at least 0.3 s before anything can hurt you.
    res.warnings = {};
    for (const name of ['cannon', 'mortars', 'flak', 'mines', 'drones', 'stomp', 'charge']) {
      b = fresh(3);
      g.player.x = 30;
      g.player.y = 60;
      b.attack = { name, t: 0 };
      let warnAt = null;
      let dangerAt = null;
      let shots = 0;
      for (let i = 0; i < 6 * 120 && dangerAt === null; i++) {
        g.player.invuln = 1;
        g.update(1 / 120, idle);
        const t = i / 120;
        const warned = b.aimLine || b.flak || b.lightT > 0 || b.lift > 0 || b.slit || g.markers.length > 0 ||
          g.enemies.some((e) => e.type === 'mortarShell' || e.charge);
        if (warned && warnAt === null) warnAt = t;
        const danger = g.enemyShots.length > shots || b.waves.length > 0 || b.flakFiring ||
          (b.attack && b.attack.running);
        shots = g.enemyShots.length;
        if (danger) dangerAt = t;
      }
      res.warnings[name] = warnAt === null || dangerAt === null ? -1 : +(dangerAt - warnAt).toFixed(2);
    }

    // The flak wall's gap is safe right up to its posts (where = 'mid',
    // 'left' or 'right' of the gap); anywhere else on the line is not.
    const flakAt = (where) => {
      b = fresh(1);
      g.player.x = 30;
      g.player.y = 50;
      b.attack = { name: 'flak', t: 0 };
      g.update(1 / 120, idle);
      const L = b.flak[0];
      // A gap whose left post sits exactly on a burst (bursts fall every
      // 12 px from x = 202), the worst case for the edge of the gap.
      L.gap0 = 94;
      L.gap1 = 124;
      // Where the ship's hitbox goes (see Game.playerHitbox: it starts 5 px
      // in from the ship's left and is 9 px wide).
      const spot = {
        mid: (L.gap0 + L.gap1) / 2 - g.player.w / 2,
        left: L.gap0 + 1 - 5,
        right: L.gap1 - 1 - 9 - 5,
        out: L.gap1 + 30 < 180 ? L.gap1 + 30 : L.gap0 - 50,
      }[where];
      g.player.invuln = 0;
      g.health = 5;
      for (let i = 0; i < 2 * 120 && b.attack; i++) {
        g.player.x = spot;
        g.player.y = L.y - g.player.h / 2;
        g.update(1 / 120, idle);
      }
      return 5 - g.health;
    };
    res.flakGap = ['mid', 'left', 'right'].map(flakAt);
    res.flakLine = flakAt('out');

    // Running you down throws you up over it, not into the screen edge.
    b = fresh(3);
    b.attack = { name: 'charge', t: 0, stage: 'run', running: true };
    b.x = 90;
    g.player.x = 90; // right in its path
    g.player.y = b.y + 30;
    g.player.invuln = 0;
    g.health = 5;
    g.update(1 / 120, idle);
    res.runDown = { hurt: 5 - g.health, thrownUp: g.player.y + g.player.h <= b.y + 20 };
    // No safe spots from the cannon: low and close in front (where you
    // shoot the core), and behind it a little below the gun, the aim line
    // still runs through the ship.
    const aimMiss = (dx, dy) => {
      b = fresh(1);
      const pv = { x: b.x + 25, y: b.y + 12 };
      g.player.x = pv.x + dx - g.player.w / 2;
      g.player.y = pv.y + dy - g.player.h / 2;
      b.attack = { name: 'cannon', t: 0 };
      for (let i = 0; i < 120 && !b.aimLine; i++) {
        g.player.invuln = 1;
        g.update(1 / 120, idle);
      }
      const ang = Math.atan2(-Math.sin(b.ang), -Math.cos(b.ang));
      const pc = g.playerCenter();
      // Distance from the ship's centre to the aim line.
      const vx = pc.x - pv.x;
      const vy = pc.y - pv.y;
      return +Math.abs(vx * Math.sin(ang) - vy * Math.cos(ang)).toFixed(1);
    };
    res.aimMiss = [aimMiss(-40, 20), aimMiss(-30, 16), aimMiss(40, 4)];

    // Two flak lines: a ship parked in the lower line's gap stays safe (no
    // fragment from the upper line falls through it).
    b = fresh(2);
    g.player.x = 30;
    g.player.y = 70;
    b.attack = { name: 'flak', t: 0 };
    g.update(1 / 120, idle);
    const [top, low] = [...b.flak].sort((m, n) => m.y - n.y);
    top.gap0 = 20;
    top.gap1 = 50;
    // (Fragments thrown down-left from the top line's burst at x = 130
    // would cross the lower line around x = 120, the middle of this gap.)
    low.gap0 = 105;
    low.gap1 = 135;
    g.health = 5;
    for (let i = 0; i < 3 * 120; i++) {
      g.player.invuln = 0;
      g.player.x = 120 - g.player.w / 2;
      g.player.y = low.y - g.player.h / 2;
      g.update(1 / 120, idle);
    }
    res.lowGapSafe = g.health === 5;

    // Stomp rocks fall straight down onto their "!" markers.
    b = fresh(2);
    b.attack = { name: 'stomp', t: 0 };
    const marks = [];
    const landed = [];
    const seen = new Set();
    for (let i = 0; i < 4 * 120; i++) {
      g.player.invuln = 1;
      g.player.y = 20;
      g.update(1 / 120, idle);
      for (const m of g.markers) if (!marks.includes(m.x)) marks.push(m.x);
      for (const e of g.enemies) {
        if (e.type.startsWith('rock') && !seen.has(e) && e.y + e.h >= g.terrain.floorY - 0.5) {
          seen.add(e);
          landed.push(e.x + e.w / 2);
        }
      }
    }
    res.rockDrift = landed.length ? +Math.max(...landed.map((x) => Math.min(...marks.map((m) => Math.abs(m - x))))).toFixed(1) : -1;

    // Supply pods keep coming in its fight (shared with every boss) and take
    // turns, survival then weapon.
    b = fresh(1);
    const pods = [];
    const spawn = g.spawnEnemy.bind(g);
    g.spawnEnemy = (type, x, y, opts = {}) => {
      if (type === 'carrier') pods.push(opts.drop);
      return spawn(type, x, y, opts);
    };
    for (let i = 0; i < 45 * 120; i++) {
      g.player.invuln = 1;
      g.update(1 / 120, idle);
    }
    g.spawnEnemy = spawn;
    res.pods = pods.join();

    // Landing on top of it throws you up off it, not along it.
    b = fresh(1);
    b.x = 80;
    g.player.x = b.x + 30;
    g.player.y = b.y + 14;
    g.player.invuln = 0;
    g.update(1 / 120, idle);
    const hb = g.playerHitbox();
    res.offTop = !b.T.hitTest(b, hb.x, hb.y, hb.w, hb.h);

    // Bumping into it from behind pushes you back out behind it.
    b = fresh(1);
    b.x = 60;
    g.player.x = b.x + 60;
    g.player.y = b.y + 30;
    g.player.invuln = 0;
    const beforeX = g.player.x;
    g.update(1 / 120, idle);
    const hb2 = g.playerHitbox();
    res.behindPushedOut = g.player.x > beforeX && !b.T.hitTest(b, hb2.x, hb2.y, hb2.w, hb2.h);
    g.reset();
    return res;
  });
  const w = r.warnings;
  const ok = r.shutHp === 0 && r.openHits >= 5 &&
    Object.values(w).every((v) => v >= 0.3) &&
    r.flakGap.every((n) => n === 0) && r.flakLine === 1 && r.runDown.hurt === 3 && r.runDown.thrownUp && r.behindPushedOut &&
    r.aimMiss.every((d) => d < 3) && r.lowGapSafe && r.rockDrift >= 0 && r.rockDrift < 3 &&
    r.pods === 'smart,weapon,smart' && r.offTop && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Siege Crawler rules ${JSON.stringify(r)} ${errs.join(' ')}`);
  if (!ok) failures++;
  await context.close();
}

// The test web server must refuse paths outside the game folder.
const escape = await fetch(base + '..%2f..%2f..%2fetc%2fpasswd');
const serverOk = escape.status === 403;
console.log(`${serverOk ? 'PASS' : 'FAIL'}  test server refuses paths outside the game (${escape.status})`);
if (!serverOk) failures++;

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

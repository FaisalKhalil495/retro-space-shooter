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
  const flow = await page.evaluate(async () => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    const { LEVELS } = await import('/js/levels.js' + new URL(document.querySelector('script[type=module]').src).search);
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
    // Tap on: into level 3 (Frostring), with the score carried over.
    const scoreAfter2 = g.score;
    g.stateTimer = 4;
    g.update(1 / 120, tap);
    const toLevel3 = { level: g.level.number, scoreKept: g.score === scoreAfter2 && scoreAfter2 > 0 };
    // After the last level there is: back to level 1, fresh.
    g.levelIndex = LEVELS.length - 1;
    g.reset();
    g.levelClear();
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
      startedOn, level2Cleared, toLevel3, afterLast,
      next,
    };
  });
  const flowOk = flow.startedOn === 2 && flow.level2Cleared && flow.toLevel3.level === 3 && flow.toLevel3.scoreKept && flow.clearAfterRespawn && flow.skippedEndStillEnds &&
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
    res.turretShutHp = tur.maxHp - tur.hp; // 0: armour held
    let opened = false;
    for (let i = 0; i < 400 && !opened; i++) {
      step(1 / 120);
      opened = tur.open;
    }
    g.damage(tur, 1);
    res.turretOpenHp = tur.maxHp - tur.hp; // 1
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
        if (t.hp < t.maxHp) heights++;
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

    // A turret dies in one opening: arriving at any moment in its cycle and
    // roughly lined up, on average it's gone in well under 2 s; and a shot
    // just above its dome still counts while it's open.
    let ttk = 0;
    let trials = 0;
    for (let arrive = 0; arrive < 3.6; arrive += 0.4) {
      quiet();
      const sp = g.terrain.addSpire(40, 12, 3);
      sp.x = 150;
      const t = g.spawnEnemy('cliffTurret', sp.x, 0, { spire: sp });
      for (let i = 0; i < (1.5 + arrive) * 120; i++) {
        g.player.invuln = 5;
        g.player.y = 120;
        g.update(1 / 120, idle);
      }
      let time = 0;
      for (let i = 0; i < 20 * 120 && !t.dead; i++) {
        g.player.invuln = 5;
        g.player.x = 30;
        g.player.y = t.y + t.h / 2 - 6 + (i % 240 < 120 ? 2 : -2); // a little off, drifting
        g.update(1 / 120, { ...idle, fire: true });
        time += 1 / 120;
      }
      ttk += time;
      trials++;
    }
    res.turretSecondsToKill = +(ttk / trials).toFixed(1);
    quiet();
    const topT = g.spawnEnemy('cliffTurret', 120, 0);
    g.update(1 / 120, idle);
    topT.open = true;
    g.strike(topT, topT.x - 3, topT.y - 2, 7, 2, 1);
    res.domeGraze = topT.hp === topT.maxHp - 1; // a graze just above it really hurts it

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

    // Rust Raiders carry loot about 35% of the time, and about 30% of that
    // loot is special-weapon ammo (no rocks on this planet).
    quiet();
    let loot = 0;
    let ammo = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      g.pickups = [];
      g.killEnemy(g.spawnEnemy('raider', 100, 60));
      loot += g.pickups.length;
      ammo += g.pickups.filter((pk) => pk.kind === 'ammo').length;
      g.enemies = [];
      g.enemyShots = [];
    }
    res.raiderLoot = +(loot / N).toFixed(3);
    res.ammoShare = +(ammo / Math.max(1, loot)).toFixed(2);

    // Rust Moon draws its own look for the enemy types it shares with level
    // 1 (exactly the same sizes, so they're as easy to hit); level 1 keeps
    // its own; cargo pods look the same everywhere.
    const { SPRITES } = await import('/js/sprites.js' + v);
    const { LEVELS } = await import('/js/levels.js' + v);
    const shared = ['drifter', 'weaver', 'gunner', 'seeker', 'sniper', 'spinner'];
    res.rustLook = {
      own: shared.filter((n) => g.spriteName(n) === n + '_rust').length,
      sameSize: shared.filter((n) => {
        const e = g.spawnEnemy(n, 300, 60);
        g.enemies = g.enemies.filter((x) => x !== e);
        return e.w === SPRITES[n].width && e.h === SPRITES[n].height;
      }).length,
      level1Plain: !LEVELS[0].skin,
      cargoSame: g.spriteName('carrier') === 'carrier',
    };

    // A raider never fires at a ship behind it; in front, it blinks before
    // each shot and fires 2 at most.
    quiet();
    const raider = g.spawnEnemy('raider', 150, 60);
    let behindShots = 0;
    let behindBlink = false;
    for (let i = 0; i < 2 * 120; i++) {
      g.player.x = 170;
      g.player.y = 60;
      g.player.invuln = 5;
      const before = g.enemyShots.length;
      step(1 / 120);
      behindShots += g.enemyShots.length - before;
      if (raider.charge) behindBlink = true;
    }
    quiet();
    const raider2 = g.spawnEnemy('raider', 170, 60);
    let frontShots = 0;
    let blinkBefore = 0;
    let blinkRun = 0;
    let blinkOk = true;
    for (let i = 0; i < 4 * 120; i++) {
      g.player.x = 30;
      g.player.y = 60;
      g.player.invuln = 5;
      const before = g.enemyShots.length;
      step(1 / 120);
      if (g.enemyShots.length > before) {
        frontShots += g.enemyShots.length - before;
        if (blinkRun < 0.25) blinkOk = false;
        blinkRun = 0;
      }
      blinkRun = raider2.charge ? blinkRun + 1 / 120 : 0;
      if (raider2.charge) blinkBefore = 1;
    }
    // A convoy takes turns: no two raiders' first shots at the same moment.
    quiet();
    PATTERNS.raiders(g, g.rand, { n: 4, y: 60 });
    const firstShot = new Map();
    for (let i = 0; i < 5 * 120; i++) {
      g.player.x = 20;
      g.player.y = 60;
      g.player.invuln = 5;
      step(1 / 120);
      for (const e of g.enemies) if (e.type === 'raider' && e.shots && !firstShot.has(e)) firstShot.set(e, i / 120);
    }
    const times = [...firstShot.values()].sort((a, b) => a - b);
    const minGap = Math.min(...times.slice(1).map((t, k) => t - times[k]));
    // A convoy flies at one speed, so lifted over a tall spire (all to the
    // same height) its ships still never merge into one.
    quiet();
    const tallRock = g.terrain.addSpire(70, 14, 3);
    tallRock.x = 190;
    PATTERNS.raiders(g, g.rand, { n: 4, y: 110 });
    const speeds = new Set();
    let merged = 0;
    for (let i = 0; i < 5 * 120; i++) {
      g.player.x = 20;
      g.player.y = 110;
      g.player.invuln = 5;
      step(1 / 120);
      const rs = g.enemies.filter((e) => e.type === 'raider' && !e.dead);
      for (const a of rs) {
        speeds.add(a.vx);
        for (const c of rs) {
          if (a === c) continue;
          const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
          const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
          if (ox > 0 && oy > 0 && ox * oy > a.w * a.h * 0.6) merged++;
        }
      }
    }
    res.raiders = { behindShots, behindBlink, frontShots, blinkOk: blinkOk && blinkBefore === 1, convoyShooters: times.length, minGap: +minGap.toFixed(2), convoySpeeds: speeds.size, merged };

    const { MAX_SPIRE, SHORT_SPIRE } = await import('/js/terrain.js' + new URL(document.querySelector('script[type=module]').src).search);
    // A turret's tower is never shorter than a tower on screen in front of
    // it, even one the ship had already flown past when the turret arrived.
    quiet();
    const tall = g.terrain.addSpire(56, 14, 3);
    tall.x = 120;
    g.player.x = 150;
    PATTERNS.spires(g, g.rand, { heights: [34], turrets: [0] });
    step(0.05);
    const newest = g.terrain.spires[g.terrain.spires.length - 1];
    res.perchHeight = newest.h;
    // An ambush called while a tall spire is on screen waits for it to go.
    quiet();
    const tallOne = g.terrain.addSpire(70, 14, 3);
    tallOne.x = 100;
    PATTERNS.ambush(g, g.rand, { n: 2 });
    let warnedWhileTall = false;
    let cameLater = false;
    for (let i = 0; i < 8 * 120; i++) {
      step(1 / 120);
      if (g.markers.length && g.terrain.tallestOnScreen() > SHORT_SPIRE) warnedWhileTall = true;
      if (g.enemies.some((e) => e.type === 'drifter' && e.flip)) cameLater = true;
    }
    // ...and still comes once the tall spire has gone.
    res.ambushWaits = !warnedWhileTall && cameLater;
    // A tall spire that comes into view between an ambush's warning and its
    // pods arriving: the pods still come in above it.
    quiet();
    PATTERNS.ambush(g, g.rand, { n: 4 });
    step(0.1);
    const lateTall = g.terrain.addSpire(64, 14, 3);
    lateTall.x = 150;
    let lateLow = 0;
    let lateSeen = 0;
    const lateDone = new Set();
    for (let i = 0; i < 3 * 120; i++) {
      step(1 / 120);
      for (const e of g.enemies) {
        if (e.type !== 'drifter' || !e.flip || lateDone.has(e)) continue;
        lateDone.add(e);
        lateSeen++;
        if (e.y + e.h > g.terrain.floorY - 64 - 4) lateLow++;
      }
    }
    res.ambushLateSpire = { seen: lateSeen, low: lateLow };

    // A gunship group lifted over a tall spire (you flying low) never ends
    // up stacked, two ships looking like one.
    quiet();
    const under = g.terrain.addSpire(70, 14, 3);
    under.x = 170;
    PATTERNS.gunner(g, g.rand, { n: 3 });
    let stacked = 0;
    for (let i = 0; i < 4 * 120; i++) {
      g.player.x = 40;
      g.player.y = 100;
      g.player.invuln = 5;
      step(1 / 120);
      const gs = g.enemies.filter((e) => e.type === 'gunner' && !e.dead);
      for (const a of gs) {
        for (const c of gs) {
          if (a === c) continue;
          const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
          const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
          if (ox > 0 && oy > 0 && ox * oy > a.w * a.h * 0.6) stacked++;
        }
      }
    }
    res.gunshipsStacked = stacked / 2 / 120; // seconds

    // A raider flying over a turret's tower clears the turret too.
    quiet();
    const perch = g.terrain.addSpire(40, 12, 3);
    perch.x = 150;
    const gun = g.spawnEnemy('cliffTurret', perch.x, 0, { spire: perch });
    const drone = g.spawnEnemy('raider', 200, g.terrain.floorY - 30);
    let overlapTurret = false;
    for (let i = 0; i < 4 * 120; i++) {
      step(1 / 120);
      if (!drone.dead && !gun.dead && drone.x < gun.x + gun.w && drone.x + drone.w > gun.x && drone.y + drone.h > gun.y) overlapTurret = true;
    }
    res.raiderClearsTurret = !overlapTurret;

    // The whole level, start to boss, with the ship parked out of the way:
    // no turret is hidden behind a taller spire (a straight shot at it from
    // the left always gets through), and no cargo pod or flying enemy ever
    // flies into a spire.
    g.reset();
    g.banner = null;
    const turrets = new Map();
    let pods = 0;
    let lowPods = 0;
    let crawlerOn = 0;
    let crawlerHidden = 0;
    let crawlersOffGround = 0;
    let firedHidden = 0;
    let shellsFired = 0;
    const flyersInRock = new Set();
    const ambushers = [];
    const crawlerWasHidden = new Map();
    // Per crawler: shells fired, and pointless pop-ups (came up, then dug
    // back in without a single shot).
    const crawlerRec = new Map();
    let pointlessPopUps = 0;
    const intoRock = [];
    const seen = new Set();
    for (let i = 0; i < 184 * 120; i++) {
      g.player.invuln = 5;
      g.player.x = 4;
      g.player.y = 12;
      g.update(1 / 120, idle);
      for (const e of g.enemies) {
        if (e.type === 'cliffTurret' && e.x < 196 && e.x > 30) {
          const rec = turrets.get(e) || { on: 0, hidden: 0, at: Math.round(g.runner.t) };
          rec.on++;
          const y = e.y + e.h / 2;
          if (g.terrain.spires.some((sp) => sp !== e.spire && sp.x > 0 && sp.x + sp.w < e.x && y > sp.top + 3)) rec.hidden++;
          turrets.set(e, rec);
        }
        if (e.type === 'mortarCrawler') {
          const rec = crawlerRec.get(e) || { shells: 0, wasUnder: e.under, upAt: -1 };
          if (rec.wasUnder && !e.under) rec.upAt = rec.shells; // came up
          if (!rec.wasUnder && e.under && rec.upAt === rec.shells) pointlessPopUps++; // dug in, no shot
          if (e.under) rec.upAt = -1;
          rec.wasUnder = e.under;
          crawlerRec.set(e, rec);
        }
        if (e.type === 'mortarCrawler' && e.x > 30 && e.x < 196) {
          crawlerOn++;
          if (e.y + e.h < g.terrain.floorY - 1) crawlersOffGround++;
          // Out of reach: underground, or a spire right in front of it with
          // no room for your ship to slip in between.
          const hiddenNow = e.under || g.terrain.spires.some((sp) => sp.x + sp.w <= e.x + 2 && sp.x + sp.w > e.x - 26);
          if (hiddenNow) crawlerHidden++;
          crawlerWasHidden.set(e, hiddenNow);
        }
        // A shell launched by a crawler you couldn't reach would be unfair.
        if (e.type === 'mortarShell' && !seen.has(e)) {
          seen.add(e);
          shellsFired++;
          const from = g.enemies.find((c) => c.type === 'mortarCrawler' && Math.abs(c.x + 1 - e.x0) < 3);
          if (from && crawlerWasHidden.get(from)) firedHidden++;
          if (from && crawlerRec.has(from)) crawlerRec.get(from).shells++;
        }
        // No flying enemy ever passes through a spire (dive-bombers crash).
        if (e.T.flies && e.x > -e.w && e.x < 208 && g.terrain.hits(e.x + 1, e.y + 1, e.w - 2, e.h - 2)) {
          flyersInRock.add(e.type + '@' + Math.round(g.runner.t));
        }
        // Ambushers from behind: note the spires on screen when each arrives.
        if (e.type === 'drifter' && e.flip && !seen.has(e)) {
          seen.add(e);
          const tallest = g.terrain.tallestOnScreen();
          ambushers.push({ tallest, clear: e.y + e.h <= g.terrain.floorY - tallest - 4 });
        }
        if (e.type === 'carrier') {
          if (!seen.has(e)) {
            seen.add(e);
            pods++;
            // Its lowest point (with its bob) must clear the tallest spire
            // there can ever be (74 px), so no spire can stand in the way.
            if (e.baseY + e.h + 3 > g.terrain.floorY - MAX_SPIRE) lowPods++;
          }
          if (g.terrain.hits(e.x + 1, e.y + 1, e.w - 2, e.h - 2)) intoRock.push(e.type + '@' + Math.round(g.runner.t));
        }
      }
    }
    res.hiddenTurrets = [...turrets.values()].filter((t) => t.hidden / t.on > 0.1).map((t) => t.at);
    res.crawlersOffGround = crawlersOffGround;
    res.crawlerHiddenPct = Math.round(100 * crawlerHidden / Math.max(1, crawlerOn));
    res.shellsFromCover = firedHidden;
    res.shells = shellsFired;
    res.crawlers = crawlerRec.size;
    res.silentCrawlers = [...crawlerRec.values()].filter((c) => c.shells === 0).length;
    res.pointlessPopUps = pointlessPopUps;
    res.flyersInRock = [...flyersInRock].slice(0, 6);
    res.ambushers = ambushers.length;
    res.ambushAmongTall = ambushers.filter((a) => a.tallest > SHORT_SPIRE).length;
    res.ambushLow = ambushers.filter((a) => !a.clear).length;
    res.turretsSeen = turrets.size;
    res.pods = pods;
    res.lowPods = lowPods;
    res.intoRock = [...new Set(intoRock)].slice(0, 5);
    g.reset();
    return res;
  });
  const ok = r.turretShutHp === 0 && r.turretOpenHp === 1 && r.turretSecondsToKill < 1.8 && r.domeGraze && r.turretShotsWhenBehind === 0 && !r.turretOpenedWhenBehind &&
    r.ringOnYou && r.ringWarning >= 0.85 && r.ringWarning <= 0.95 && r.fragments === 4 &&
    r.spireDamage === 2 && r.knockedClear && r.shotSpeed === 110 && r.diverCrashed &&
    r.turretReach.every((n) => n > 0) && r.turretShotGap >= 0.34 && r.pushedRight && r.solidWhileFlashing &&
    r.shellTouch.dead && r.shellTouch.hurt === 1 && r.shellTouch.fragments === 4 && r.shellTouch.points === 0 &&
    r.raiders.behindShots === 0 && !r.raiders.behindBlink && r.raiders.frontShots === 2 && r.raiders.blinkOk && r.raiders.convoyShooters === 4 && r.raiders.minGap >= 0.3 && r.raiders.convoySpeeds === 1 && r.raiders.merged === 0 && r.raiderLoot > 0.31 && r.raiderLoot < 0.39 && r.ammoShare > 0.22 && r.ammoShare < 0.38 &&
    r.rustLook.own === 6 && r.rustLook.sameSize === 6 && r.rustLook.level1Plain && r.rustLook.cargoSame && r.perchHeight >= 56 && r.raiderClearsTurret && r.ambushWaits && r.ambushLateSpire.seen === 4 && r.ambushLateSpire.low === 0 && r.gunshipsStacked === 0 && r.hiddenTurrets.length === 0 && r.turretsSeen === 15 && r.pods === 10 && r.lowPods === 0 && r.crawlersOffGround === 0 && r.flyersInRock.length === 0 && r.ambushers === 20 && r.ambushAmongTall === 0 && r.ambushLow === 0 && r.shellsFromCover === 0 && r.crawlerHiddenPct <= 60 && r.shells >= 14 && r.shells <= 22 && r.crawlers === 9 && r.silentCrawlers === 0 && r.pointlessPopUps === 0 && r.intoRock.length === 0 && errs.length === 0;
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
    // (The last one is as low as you can fly, right in front of its feet.)
    res.aimMiss = [aimMiss(-40, 20), aimMiss(-30, 16), aimMiss(40, 4), aimMiss(-34, 33.5)];

    // Hiding low at its feet gets you walked over.
    b = fresh(1);
    b.x = 130;
    g.player.x = 112;
    g.player.y = 118;
    g.health = 5;
    g.update(1 / 120, idle);
    // It sets off straight for you (not just wandering)...
    const headsForYou = Math.abs(b.targetX - (g.playerCenter().x - 4)) < 1;
    for (let i = 0; i < 4 * 120; i++) g.update(1 / 120, idle);
    // ...and gets you.
    res.trampled = headsForYou && g.health < 5;

    // The empty air in front of its sloped nose isn't part of it.
    b = fresh(1);
    const by0 = b.y;
    res.airTouch = b.T.hitTest(b, b.x + 3, by0 + 15, 9, 5);

    // Level things that came up in the whole-level review:
    g.reset();
    g.runner.next = g.level.events.length;
    g.player.entering = 0;
    // Mortar crawlers stay on the ground: at a spire they dig under it
    // (out of reach while underground) and come back out the other side.
    const sp = g.terrain.addSpire(30, 14, 4);
    sp.x = 80;
    const mc = g.spawnEnemy('mortarCrawler', 100, 0);
    let climbed = false;
    let visibleInRock = false;
    let wentUnder = false;
    let cameOut = false;
    for (let i = 0; i < 3 * 120; i++) {
      g.player.invuln = 1;
      g.player.y = 20;
      g.update(1 / 120, idle);
      if (mc.dead) break;
      if (mc.y + mc.h < g.terrain.floorY - 1) climbed = true;
      if (mc.under) wentUnder = true;
      if (wentUnder && !mc.under && mc.x + mc.w < sp.x) cameOut = true;
      if (!mc.under && mc.x + 2 < sp.x + sp.w - 2 && mc.x + mc.w - 2 > sp.x + 2) visibleInRock = true;
    }
    res.crawlerGround = { climbed, visibleInRock, wentUnder, cameOut };
    // Underground it can't be shot.
    const dug = g.spawnEnemy('mortarCrawler', 100, 0, {});
    dug.under = true;
    res.underShootable = g.hits(dug, dug.x - 4, dug.y + 3, 8, 2);
    // Rockets never pick an underground crawler, and a bomb's shockwave
    // makes no sparks at one (it's out of reach, hidden in the rock).
    g.enemies = [dug];
    res.rocketIgnoresUnder = g.nearestEnemy(30, 100) === null;
    const sparks = g.particles.length;
    g.damage(dug, 1);
    res.noSparksUnder = g.particles.length === sparks && dug.hp === dug.maxHp;
    // Items dropped over a spire float above it, not inside it.
    g.pickups = [];
    g.spawnPickup('shield', sp.x + 2, g.terrain.floorY - 6);
    res.pickupClear = g.pickups[0].y + 11 <= sp.top;
    // Ramming a shut turret hurts you but doesn't break its armour.
    g.enemies = [];
    const tur = g.spawnEnemy('cliffTurret', 100, 0);
    g.update(1 / 120, idle);
    g.player.x = tur.x - 6;
    g.player.y = tur.y - 3;
    g.player.invuln = 0;
    g.health = 5;
    g.update(1 / 120, idle);
    res.ramShut = { turretAlive: !tur.dead && tur.hp === tur.maxHp, hurt: 5 - g.health };
    // Rockets skip shells, mines and cargo pods; an open boss core comes first.
    g.enemies = [];
    g.spawnEnemy('mortarShell', 40, 60, { tx: 100, ty: 60 });
    g.spawnEnemy('carrier', 45, 60, { drop: 'shield' });
    const far = g.spawnEnemy('dustSkimmer', 150, 0);
    res.rocketSkipsJunk = g.nearestEnemy(30, 60) === far;
    b = fresh(1);
    b.hatch = 1;
    g.spawnEnemy('drone', 40, 60, {});
    res.rocketPrefersCore = g.nearestEnemy(30, 60) === b;

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


    // The stomp cracks the ground: the first crack opens under you, every
    // crack shows (with a "!") for 0.75 s before its spike bursts up, and a
    // spike costs 2 blocks.
    b = fresh(2);
    g.player.x = 40;
    g.player.y = 60;
    b.attack = { name: 'stomp', t: 0 };
    const crackSeen = new Map();
    let firstUnder = null;
    let gap = Infinity;
    for (let i = 0; i < 4 * 120; i++) {
      g.player.invuln = 1;
      g.update(1 / 120, idle);
      for (const sk of b.spikes) {
        if (sk.t >= 0 && !crackSeen.has(sk)) {
          crackSeen.set(sk, g.time);
          if (firstUnder === null) firstUnder = Math.abs(sk.x - g.playerCenter().x) < 2;
        }
        if (sk.t >= 0.75 && !sk.rose) {
          sk.rose = true;
          gap = Math.min(gap, g.time - crackSeen.get(sk));
        }
      }
    }
    b = fresh(2);
    b.spikes.push({ x: 60, t: 0.8 });
    g.player.x = 60 - g.player.w / 2;
    g.player.y = g.terrain.floorY - g.player.h - 1;
    g.player.invuln = 0;
    g.health = 5;
    g.update(1 / 120, idle);
    const spikeHurt = 5 - g.health;
    // Cracks and spikes move with the scrolling ground.
    b = fresh(2);
    b.spikes.push({ x: 100, t: 0 });
    for (let i = 0; i < 60; i++) {
      g.player.invuln = 1;
      g.update(1 / 120, idle);
    }
    const scrolled = b.spikes.length ? +(100 - b.spikes[0].x).toFixed(1) : -1;
    // It keeps walking while its spikes play out (it never just stands).
    b = fresh(2);
    g.player.y = 20;
    b.attack = { name: 'stomp', t: 0 };
    let walked = 0;
    let lastX = b.x;
    while (b.attack && b.attack.t < 6) {
      g.player.invuln = 1;
      g.update(1 / 120, idle);
      if (b.attack && b.attack.t > 1.7) walked += Math.abs(b.x - lastX);
      lastX = b.x;
    }
    // A stage break closes waiting cracks but lets a standing spike crumble.
    b = fresh(2);
    b.spikes.push({ x: 60, t: 0.9 }, { x: 100, t: -0.3 });
    b.hp = Math.floor(b.maxHp * 0.33) + 1; // stage 2 -> 3
    b.hatch = 1;
    g.damage(b, 2);
    const keepsStanding = b.spikes.length === 1 && b.spikes[0].t >= 0.9;
    // Just beside a spike's thin tip is a miss (it hurts where it's drawn).
    b = fresh(2);
    b.spikes.push({ x: 60, t: 0.9 });
    g.player.x = 57;
    g.player.y = g.terrain.floorY - 29;
    g.player.invuln = 0;
    g.health = 5;
    g.update(1 / 120, idle);
    const tipMiss = g.health === 5;
    // A stage break closes any cracks still waiting to burst.
    b = fresh(2);
    b.spikes.push({ x: 60, t: -0.5 });
    b.hp = Math.floor(b.maxHp * 0.33) + 1;
    b.hatch = 1;
    g.damage(b, 2);
    const stageClears = b.mode === 'transition' && b.spikes.length === 0;
    res.spikes = { cracks: crackSeen.size, firstUnder, warnGap: +gap.toFixed(2), hurt: spikeHurt, tipMiss, stageClears, scrolled, walked: +walked.toFixed(1), keepsStanding };

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
    r.aimMiss.every((d) => d < 3) && r.lowGapSafe &&
    r.pods === 'smart,weapon,smart' && r.offTop &&
    r.spikes.cracks === 4 && r.spikes.firstUnder && r.spikes.warnGap >= 0.7 && r.spikes.hurt === 2 && r.spikes.tipMiss && r.spikes.stageClears &&
    r.spikes.scrolled > 9 && r.spikes.scrolled < 11 && r.spikes.walked > 1 && r.spikes.keepsStanding &&
    r.trampled && r.airTouch === null && !r.crawlerGround.climbed && !r.crawlerGround.visibleInRock && r.crawlerGround.wentUnder && r.crawlerGround.cameOut && !r.underShootable &&
    r.rocketIgnoresUnder && r.noSparksUnder && r.pickupClear &&
    r.ramShut.turretAlive && r.ramShut.hurt === 2 && r.rocketSkipsJunk && r.rocketPrefersCore && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Siege Crawler rules ${JSON.stringify(r)} ${errs.join(' ')}`);
  if (!ok) failures++;
  await context.close();
}

// Stage 3C-1: Frostring's slabs of ice and its look follow the rules.
{
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '?level=3');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    const v = new URL(document.querySelector('script[type=module]').src).search;
    const { PATTERNS } = await import('/js/waves.js' + v);
    const { SPRITES } = await import('/js/sprites.js' + v);
    const fire = { dx: 0, dy: 0, fire: true, special: false, tap: false };
    const idle = { ...fire, fire: false };
    const step = (sec, input = idle, keepSafe = true) => {
      for (let i = 0; i < sec * 120; i++) {
        if (keepSafe) g.player.invuln = 1;
        g.update(1 / 120, input);
      }
    };
    const quiet = () => {
      g.reset();
      g.runner.next = g.level.events.length;
      g.banner = null;
      g.player.entering = 0;
      g.player.x = 20;
      g.player.y = 40;
    };
    const res = {};
    const hb = () => { const h = g.playerHitbox(); return g.terrain.slabAt(h.x, h.y, h.w, h.h); };

    // Your shots crack a slab, one hit at a time, until it shatters (+10).
    quiet();
    const slab = g.terrain.addSlab({ w: 20, h: 16, x: 120, y: 60, speed: 0 });
    g.player.y = 61;
    const hp0 = slab.hp;
    let firstHit = null;
    const score0 = g.score;
    for (let i = 0; i < 4 * 120 && !slab.dead; i++) {
      g.player.invuln = 1;
      g.update(1 / 120, fire);
      if (firstHit === null && slab.hp < hp0) firstHit = hp0 - slab.hp;
    }
    step(1 / 120); // (a shattered slab is cleared away on the next frame)
    res.chip = { hp0, firstHit, shattered: !!slab.dead, score: g.score - score0, gone: !g.terrain.slabs.includes(slab) };

    // Crashing into one costs 2 blocks and knocks you clear.
    quiet();
    g.terrain.addSlab({ w: 30, h: 30, x: 60, y: 40, speed: 0 });
    g.player.x = 52;
    g.player.y = 48;
    g.player.invuln = 0;
    const health0 = g.health;
    g.update(1 / 120, idle);
    res.crash = { hurt: health0 - g.health, clear: !hb() };

    // Enemy shots stop on ice (nobody shoots you through it).
    quiet();
    g.terrain.addSlab({ w: 20, h: 40, x: 100, y: 50, speed: 0 });
    g.player.y = 64;
    g.player.invuln = 0;
    const health1 = g.health;
    g.fireShot(190, 70, Math.PI, 100);
    step(2.5, idle, false);
    res.shotStops = g.health === health1 && g.enemyShots.length === 0;

    // A bomb shatters every slab on screen; the laser cuts through one.
    quiet();
    const three = [g.terrain.addSlab({ w: 20, h: 20, x: 60, y: 20, speed: 0 }), g.terrain.addSlab({ w: 30, h: 30, x: 150, y: 90, speed: 0 }), g.terrain.addSlab({ w: 18, h: 14, x: 180, y: 30, speed: 0 })];
    g.weapons.kind = 'bomb';
    g.weapons.ammo = 1;
    g.weapons.fire();
    step(2);
    res.bomb = three.filter((s) => s.dead).length;
    quiet();
    const lasered = g.terrain.addSlab({ w: 24, h: 24, x: 130, y: 54, speed: 0 });
    g.player.y = 60;
    g.weapons.kind = 'laser';
    g.weapons.ammo = 1;
    g.weapons.fire();
    step(1);
    res.laser = !!lasered.dead;

    // A dropped item never appears inside ice.
    quiet();
    g.terrain.addSlab({ w: 30, h: 30, x: 100, y: 50, speed: 0 });
    g.spawnPickup('shield', 110, 60);
    const pk = g.pickups[0];
    res.itemClear = !g.terrain.slabAt(pk.x, pk.y, 9, 9);

    // A slab that would wall off the way through isn't placed.
    quiet();
    const a = g.terrain.addSlab({ w: 20, h: 60, x: 150, y: 10, speed: 0 });
    const b = g.terrain.addSlab({ w: 20, h: 44, x: 150 + 0, y: 100, speed: 0 });
    const c = g.terrain.addSlab({ w: 20, h: 20, x: 175, y: 74, speed: 0 });
    res.wallOff = { placed: !!a && !!b, refused: c === null };

    // A dive-bomber crashes into ice (no points).
    quiet();
    g.terrain.addSlab({ w: 30, h: 20, x: 100, y: 80, speed: 0 });
    const diver = g.spawnEnemy('drifter', 105, 40, { speed: 4, vy: 62 });
    const score1 = g.score;
    step(1);
    res.diveCrash = !!diver.dead && g.score === score1;

    // A slab from above: its "!" shows first, then it slides in right there.
    quiet();
    PATTERNS.ice(g, g.rand, { n: 1, from: 'top', size: 'small' });
    step(0.05);
    const warned = g.markers.length === 1 && g.terrain.slabs.every((s) => s.y + s.h <= 10);
    const mx = g.markers[0] ? g.markers[0].x : -99;
    let atMarker = null;
    for (let i = 0; i < 3 * 120 && atMarker === null; i++) {
      step(1 / 120);
      const s = g.terrain.slabs.find((q) => q.y + q.h > 10);
      if (s) atMarker = Math.abs(s.x + s.w / 2 - mx);
    }
    res.fromTop = { warned, atMarker };

    // Frostring's own look: the Ice Harvesters, at level 1's sizes.
    const shared = ['drifter', 'weaver', 'gunner', 'seeker', 'sniper', 'spinner'];
    res.frostLook = {
      own: shared.filter((n) => g.spriteName(n) === n + '_frost').length,
      sameSize: shared.filter((n) => SPRITES[n + '_frost'].width === SPRITES[n].width && SPRITES[n + '_frost'].height === SPRITES[n].height).length,
      cargoSame: g.spriteName('carrier') === 'carrier',
    };

    // The whole level, start to end, with the ship parked out of the way:
    // there's always a way through (an open stretch at least 30 pixels tall
    // across every 44-pixel-wide part of the screen), ice never overlaps ice,
    // no enemy is ever inside ice, and no item either; Rime Guards don't
    // stack up.
    g.reset();
    g.banner = null;
    let minGap = 999;
    let overlaps = 0;
    const inIce = new Set();
    let pkInIce = 0;
    const seen = new Set();
    let fromEdges = 0;
    let stack = 0;
    let longestStack = 0;
    for (let i = 0; i < 200 * 120 && !g.boss; i++) {
      g.player.invuln = 5;
      g.player.x = 4;
      g.player.y = 12;
      g.update(1 / 120, idle);
      const sl = g.terrain.slabs.filter((s) => !s.dead && s.x < 208 && s.x + s.w > 0 && s.y + s.h > 10 && s.y < 144);
      for (const s of g.terrain.slabs) if (!seen.has(s)) { seen.add(s); if (s.from !== 'right') fromEdges++; }
      if (i % 30 === 0) {
        for (let x0 = -20; x0 < 208; x0 += 4) {
          const spans = sl.filter((s) => s.x < x0 + 44 && s.x + s.w > x0).map((s) => [s.y, s.y + s.h]).sort((p, q) => p[0] - q[0]);
          let best = 0;
          let y = 10;
          for (const [p, q] of spans) { best = Math.max(best, p - y); y = Math.max(y, q); }
          minGap = Math.min(minGap, Math.max(best, 144 - y));
        }
      }
      for (let p = 0; p < sl.length; p++) {
        for (let q = p + 1; q < sl.length; q++) {
          const A = sl[p];
          const C = sl[q];
          if (A.x < C.x + C.w - 1 && A.x + A.w > C.x + 1 && A.y < C.y + C.h - 1 && A.y + A.h > C.y + 1) overlaps++;
        }
      }
      for (const e of g.enemies) {
        if (!(e.T.flies || e.T.avoidsIce) || e.dead || e.x > 208 || e.x + e.w < 0) continue;
        if (g.terrain.slabAt(e.x + 1, e.y + 1, e.w - 2, e.h - 2)) inIce.add(e.type + '@' + Math.round(g.runner.t));
      }
      for (const p of g.pickups) if (!p.magnet && g.terrain.slabAt(p.x, p.y, 9, 9)) pkInIce++;
      // Rime Guards never sit on top of one another (more than half hidden)
      // for longer than a moment (one flying past another).
      const rg = g.enemies.filter((e) => e.type === 'rimeGuard' && !e.dead && e.x < 208);
      const stacked = rg.some((A, p) => rg.slice(p + 1).some((C) => {
        const ox = Math.min(A.x + A.w, C.x + C.w) - Math.max(A.x, C.x);
        const oy = Math.min(A.y + A.h, C.y + C.h) - Math.max(A.y, C.y);
        return ox > 0 && oy > 0 && ox * oy > 0.5 * Math.min(A.w * A.h, C.w * C.h);
      }));
      stack = stacked ? stack + 1 : 0;
      longestStack = Math.max(longestStack, stack / 120);
    }
    res.level = { bossCame: !!g.boss, slabs: seen.size, fromEdges, minGap: Math.floor(minGap), overlaps, inIce: [...inIce].slice(0, 6), pkInIce, longestStack: +longestStack.toFixed(2) };
    return res;
  });
  const ok = r.chip.firstHit === 1 && r.chip.shattered && r.chip.gone && r.chip.score >= 10 &&
    r.crash.hurt === 2 && r.crash.clear && r.shotStops && r.bomb === 3 && r.laser && r.itemClear &&
    r.wallOff.placed && r.wallOff.refused && r.diveCrash && r.fromTop.warned && r.fromTop.atMarker !== null && r.fromTop.atMarker < 3 &&
    r.frostLook.own === 6 && r.frostLook.sameSize === 6 && r.frostLook.cargoSame &&
    r.level.bossCame && r.level.slabs >= 40 && r.level.fromEdges >= 6 && r.level.minGap >= 30 && r.level.overlaps === 0 &&
    r.level.inIce.length === 0 && r.level.pkInIce === 0 && r.level.longestStack < 0.6 && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Frostring rules ${JSON.stringify(r)} ${errs.join(' ')}`);
  if (!ok) failures++;
  await context.close();
}

// Stage 3C-1 (part 2): Frostring's three new enemies follow the rules.
{
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '?level=3');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    const fire = { dx: 0, dy: 0, fire: true, special: false, tap: false };
    const idle = { ...fire, fire: false };
    const step = (sec, input = idle) => {
      for (let i = 0; i < sec * 120; i++) {
        g.player.invuln = 1;
        g.update(1 / 120, input);
      }
    };
    const quiet = () => {
      g.reset();
      g.runner.next = g.level.events.length;
      g.banner = null;
      g.player.entering = 0;
      g.player.x = 20;
      g.player.y = 60;
    };
    const res = {};
    // Shots fired since the last clear (by anyone).
    let shots = 0;
    const fireShot = g.fireShot.bind(g);
    g.fireShot = (...a) => { shots++; return fireShot(...a); };
    // Watch something until a shot is fired: was it blinking (charge) in the
    // last moment before, how many shots came in that burst?
    const watchFire = (e, sec) => {
      let lastCharge = -99;
      let firstShot = null;
      let t = 0;
      shots = 0;
      for (let i = 0; i < sec * 120; i++) {
        g.player.invuln = 1;
        g.update(1 / 120, idle);
        t += 1 / 120;
        if (e.charge) lastCharge = t;
        if (shots && firstShot === null) firstShot = t;
      }
      return { blinkedFirst: firstShot !== null && firstShot - lastCharge < 0.1 && lastCharge > 0, firstShot, shots };
    };

    // Rime Guard. Frozen, it's harmless (never fires), even with you right
    // in front of it, until it thaws free after about 5 s.
    quiet();
    let rg = g.spawnEnemy('rimeGuard', 150, 56, { targetX: 150 });
    shots = 0;
    step(4.8);
    res.rimeFrozen = { shots, frozen: rg.frozen, armoured: !rg.T.isVulnerable(rg) };
    step(0.4);
    res.rimeThawed = !rg.frozen;
    // Free, it blinks, then fires a 3-shot burst at you.
    res.rimeFires = watchFire(rg, 1.6);
    // ...and never while you're behind it (after a while it gives up and
    // leaves).
    quiet();
    rg = g.spawnEnemy('rimeGuard', 100, 56, { targetX: 100 });
    g.player.x = 160;
    shots = 0;
    step(8);
    res.rimeBehind = { shots, free: !rg.frozen };
    step(6);
    res.rimeBehind.leaves = rg.mode === 'leave';
    // A burst stops if you slip behind it after its first shot.
    quiet();
    rg = g.spawnEnemy('rimeGuard', 100, 56, { targetX: 100 });
    g.damage(rg, 9);
    shots = 0;
    for (let i = 0; i < 3 * 120 && !shots; i++) step(1 / 120);
    g.player.x = 160;
    step(1);
    res.rimeBurstStops = shots;
    // Its shell takes 4 hits (no damage to the gunship inside); breaking it
    // open is worth 10 points.
    quiet();
    rg = g.spawnEnemy('rimeGuard', 150, 56, { targetX: 150 });
    const s0 = g.score;
    for (let i = 0; i < 3; i++) g.damage(rg, 1);
    const after3 = rg.frozen;
    g.damage(rg, 1);
    res.rimeShell = { after3, after4: rg.frozen, hp: rg.hp, points: g.score - s0 };
    // About a third carry loot (some of it "A" ammo).
    let drops = 0;
    let ammo = 0;
    for (let i = 0; i < 400; i++) {
      quiet();
      const e = g.spawnEnemy('rimeGuard', 120, 50, { targetX: 120 });
      g.damage(e, 9);
      for (let k = 0; k < 3; k++) g.damage(e, 1);
      if (g.pickups.length) drops++;
      if (g.pickups.some((p) => p.kind === 'ammo')) ammo++;
    }
    res.rimeLoot = { drops, ammo };
    // Two in the same spot move apart rather than stack up as one ship.
    quiet();
    const twins = [g.spawnEnemy('rimeGuard', 150, 56, { targetX: 150 }), g.spawnEnemy('rimeGuard', 150, 56, { targetX: 150 })];
    step(1.5);
    const [A, B] = twins;
    res.rimeApart = A.y + A.h <= B.y || B.y + B.h <= A.y || A.x + A.w <= B.x || B.x + B.w <= A.x;

    // Cryo Layer: crosses the top dropping 3-4 frost mines.
    quiet();
    g.player.x = 4;
    g.player.y = 125;
    const seen = new Set();
    const layer = g.spawnEnemy('cryoLayer', 216, 14);
    for (let i = 0; i < 7 * 120; i++) {
      g.player.invuln = 1;
      g.update(1 / 120, idle);
      for (const e of g.enemies) if (e.type === 'frostMine') seen.add(e);
    }
    res.cryo = { mines: seen.size, high: layer.y < 40 };
    // A mine you come near blinks for half a second, then bursts into 6
    // icicles.
    quiet();
    let mine = g.spawnEnemy('frostMine', 60, 60, { vy: 0 });
    g.player.x = 40;
    const fuse = watchFire(mine, 0.8);
    res.mineBurst = { ...fuse, icicles: g.enemyShots.filter((s) => s.kind === 'icicle').length };
    // ...touch one and it bursts at once.
    quiet();
    g.player.x = 40;
    g.player.invuln = 0;
    g.player.y = 60;
    mine = g.spawnEnemy('frostMine', g.player.x + 2, g.player.y + 1, { vy: 0 });
    g.update(1 / 120, idle);
    res.mineTouch = g.enemyShots.filter((s) => s.kind === 'icicle').length === 6;
    // A mine you shoot breaks harmlessly.
    quiet();
    mine = g.spawnEnemy('frostMine', 120, 60, { vy: 0 });
    shots = 0;
    g.damage(mine, 1);
    step(0.5);
    res.mineShot = mine.dead && shots === 0;
    // Left alone (you far away) it fizzles out after 8 s.
    quiet();
    g.player.y = 125;
    g.player.x = 4;
    mine = g.spawnEnemy('frostMine', 205, 20, { vy: 0 });
    shots = 0;
    step(7.5);
    const alive75 = !mine.dead;
    step(0.7);
    res.mineFizzle = alive75 && mine.dead && shots === 0;
    // One that ends up inside ice just fizzles.
    quiet();
    g.terrain.addSlab({ w: 30, h: 30, x: 100, y: 50, speed: 0 });
    mine = g.spawnEnemy('frostMine', 110, 60, { vy: 0 });
    shots = 0;
    step(0.2);
    res.mineIce = mine.dead && shots === 0;

    // Prism: an ordinary hit splits it into two shards; the laser (or a
    // bomb) breaks it whole.
    const shardsAfter = (hit) => {
      quiet();
      const pr = g.spawnEnemy('prism', 120, 56);
      g.player.y = 56;
      hit(pr);
      step(0.05);
      return { dead: !!pr.dead, shards: g.enemies.filter((e) => e.type === 'prismShard').length };
    };
    // (Keeps lined up with it as it bobs, and stops firing once it breaks.)
    res.prismShot = shardsAfter((pr) => {
      for (let i = 0; i < 120 && !pr.dead; i++) {
        g.player.y = pr.y + pr.h / 2 - g.player.h / 2;
        step(1 / 120, fire);
      }
    });
    res.prismLaser = shardsAfter(() => { g.weapons.kind = 'laser'; g.weapons.ammo = 1; g.weapons.fire(); step(0.3); });
    res.prismBomb = shardsAfter(() => { g.weapons.kind = 'bomb'; g.weapons.ammo = 1; g.weapons.fire(); step(0.5); });
    // A shard blinks before it fires its one shot...
    quiet();
    const shard = g.spawnEnemy('prismShard', 140, 50, { vx: -14, vy: 0 });
    res.shardFires = watchFire(shard, 1.2);
    // ...and never fires at a ship behind it.
    quiet();
    g.player.x = 170;
    g.spawnEnemy('prismShard', 100, 50, { vx: -14, vy: 0 });
    shots = 0;
    step(1.5);
    res.shardBehind = shots === 0;
    g.fireShot = fireShot;
    return res;
  });
  const between = (v, a, b) => v >= a && v <= b;
  const ok = r.rimeFrozen.shots === 0 && r.rimeFrozen.frozen && r.rimeFrozen.armoured && r.rimeThawed &&
    r.rimeFires.blinkedFirst && r.rimeFires.shots === 3 && r.rimeBehind.free && r.rimeBehind.shots === 0 && r.rimeBehind.leaves && r.rimeBurstStops === 1 &&
    r.rimeShell.after3 && !r.rimeShell.after4 && r.rimeShell.hp === 3 && r.rimeShell.points === 10 &&
    between(r.rimeLoot.drops, 100, 180) && between(r.rimeLoot.ammo, 15, 60) && r.rimeApart &&
    between(r.cryo.mines, 3, 4) && r.cryo.high &&
    r.mineBurst.blinkedFirst && between(r.mineBurst.firstShot, 0.45, 0.6) && r.mineBurst.icicles === 6 &&
    r.mineTouch && r.mineShot && r.mineFizzle && r.mineIce &&
    r.prismShot.dead && r.prismShot.shards === 2 && r.prismLaser.dead && r.prismLaser.shards === 0 &&
    r.prismBomb.dead && r.prismBomb.shards === 0 &&
    r.shardFires.blinkedFirst && r.shardFires.shots === 1 && r.shardBehind && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Frostring enemies ${JSON.stringify(r)} ${errs.join(' ')}`);
  if (!ok) failures++;
  await context.close();
}

// Stage 3C-2: the Glacier Warden plays by the rules.
{
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(base + '?level=3');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    const idle = { dx: 0, dy: 0, fire: false, special: false, tap: false };
    const fire = { ...idle, fire: true };
    // A Glacier Warden already in the fight, holding still, nothing else around.
    const fresh = (phase = 1) => {
      g.reset();
      g.runner.next = g.level.events.length;
      g.banner = null;
      g.player.entering = 0;
      g.player.x = 20;
      g.player.y = 60;
      const b = g.spawnEnemy('glacierWarden', 0, 0);
      Object.assign(b, { mode: 'fight', entered: true, taunted: true, block: null, x: 116, y: 38, phase, idle: 99, attack: null });
      b.dest = { x: b.x, y: b.y };
      return b;
    };
    const hold = (b) => {
      b.dest = { x: b.x, y: b.y };
      b.idle = 99;
    };
    const step = (sec, b, input = idle, safe = true) => {
      for (let i = 0; i < sec * 120; i++) {
        if (safe) g.player.invuln = 1;
        if (b) hold(b);
        g.update(1 / 120, input);
      }
    };
    // Line the ship's guns up with the core.
    const lineUp = (b) => {
      g.player.y = b.y + 34 - g.player.h / 2;
    };
    const res = {};
    const plates = (b) => b.plates.map((P) => P.hp).join(',');

    // Armoured: a shot at the core's height cracks a front plate (through the
    // saw ring), and the core takes nothing. 10 hits break the plate; then
    // shots reach the core.
    let b = fresh();
    const full = b.plates[0].hp; // a whole plate
    lineUp(b);
    let firstPlate = null;
    let coreHitAt = null;
    for (let i = 0; i < 4 * 120 && coreHitAt === null; i++) {
      g.player.invuln = 1;
      hold(b);
      lineUp(b);
      g.update(1 / 120, fire);
      if (firstPlate === null && b.plates.some((P) => P.hp < full)) firstPlate = { untouched: b.hp === b.maxHp, plates: plates(b), open: b.T.isVulnerable(b) };
      if (b.hp < b.maxHp) coreHitAt = plates(b);
    }
    res.armour = { firstPlate, coreHitAt, vulnerable: b.T.isVulnerable(b) };

    // A bomb shatters every plate at once.
    b = fresh();
    g.weapons.kind = 'bomb';
    g.weapons.ammo = 1;
    g.weapons.fire();
    step(1.5, b);
    res.bomb = plates(b);
    // The laser cuts through a plate to the core.
    b = fresh();
    lineUp(b);
    g.weapons.kind = 'laser';
    g.weapons.ammo = 1;
    g.weapons.fire();
    step(1, b);
    res.laser = { plates: plates(b), coreHurt: b.maxHp - b.hp };
    // Rockets go for the core once it's open (and never chase saw blades).
    b = fresh();
    g.spawnEnemy('sawBlade', 60, 60, { vx: 0, vy: 0, owner: b });
    res.rocketsArmoured = (g.nearestEnemy(30, 60) || {}).type || null;
    b.plates[3].hp = 0;
    res.rocketsOpen = (g.nearestEnemy(30, 60) || {}).type || null;

    // The plates turn: with one gap, a shot at the core's height reaches the
    // core only while the gap faces it (some of the time, not all of it).
    b = fresh(1);
    g.player.y = 125;
    b.plates[0].hp = 0;
    b.plates[0].wait = 1e9; // (no refreezing during this check)
    let open = 0;
    let frames = 0;
    for (let i = 0; i < 8 * 120; i++) {
      step(1 / 120, b);
      const saved = b.hitPlate;
      if (b.T.shotTest(b, b.x, b.y + 33, 40, 2) === 'hit' && b.hitPlate === -1) open++;
      b.hitPlate = saved;
      frames++;
    }
    res.turning = +(open / frames).toFixed(2);
    // Its icicle fan is its own ice: one icicle from each whole plate, and
    // with no plates left it can't fire a fan or raise a wall at all.
    const fanShots = (wholePlates) => {
      b = fresh(1);
      b.plates.forEach((P, k) => {
        P.hp = k < wholePlates ? full : 0;
        P.wait = 1e9;
      });
      b.attack = { name: 'fan', t: 0 };
      let n = 0;
      for (let i = 0; i < 2 * 120 && b.attack; i++) {
        const before = g.enemyShots.length;
        step(1 / 120, b);
        n += Math.max(0, g.enemyShots.length - before);
      }
      return n;
    };
    res.ammo = { six: fanShots(6), two: fanShots(2) };
    // ...and no fan means no warning either (no glow before nothing).
    b = fresh(1);
    b.plates.forEach((P) => {
      P.hp = 0;
      P.wait = 1e9;
    });
    b.attack = { name: 'fan', t: 0 };
    let glowed = 0;
    for (let i = 0; i < 120 && b.attack; i++) {
      step(1 / 120, b);
      if (b.glow) glowed++;
    }
    res.ammo.emptyGlow = glowed;
    b = fresh(1);
    b.plates.forEach((P) => {
      P.hp = 0;
    });
    const picks = new Set();
    for (let i = 0; i < 60; i++) {
      b.attack = null;
      b.idle = 0;
      b.last = null;
      g.update(1 / 120, idle);
      if (b.attack) picks.add(b.attack.name);
      b.attack = null;
    }
    res.ammo.strippedPicks = [...picks].sort().join();

    // It freezes broken plates back over (one at a time in stage 1, faster
    // and two at once later), and shooting the frost knocks it back.
    b = fresh(1);
    b.plates[2].hp = 0;
    b.plates[3].hp = 0;
    g.player.y = 125;
    step(10, b);
    res.refreeze1 = plates(b) === Array(6).fill(full).join();
    b = fresh(2);
    b.plates[2].hp = 0;
    b.plates[3].hp = 0;
    g.player.y = 125;
    let grew = null;
    for (let i = 0; i < 6 * 120 && grew === null; i++) {
      step(1 / 120, b);
      const P = b.plates.find((Q) => Q.grow > 0.5);
      if (P) grew = b.plates.indexOf(P);
    }
    const before = grew === null ? 0 : b.plates[grew].grow;
    if (grew !== null) {
      b.hitPlate = grew;
      for (let k = 0; k < 3; k++) b.T.shield(b, 1, g);
    }
    res.refreeze2 = { grew, knockedBack: grew !== null && b.plates[grew].grow < before - 0.25 };
    step(9, b);
    res.refreeze2.closedAgain = !b.T.isVulnerable(b);

    // Every attack warns (glowing hub, guide lines, "!" marks, glinting
    // teeth, a blinking hatch, the wind rising) at least 0.3 s before
    // anything can hurt you.
    res.warnings = {};
    for (const name of ['fan', 'beam', 'hail', 'wall', 'blades', 'mines', 'blizzard']) {
      b = fresh(3);
      b.attack = { name, t: 0 };
      let warnAt = null;
      let dangerAt = null;
      let shots = 0;
      const slabs0 = g.terrain.slabs.length;
      const x0 = g.player.x;
      for (let i = 0; i < 6 * 120 && dangerAt === null; i++) {
        g.player.invuln = 1;
        hold(b);
        g.update(1 / 120, idle);
        const t = i / 120;
        const warned = b.glow || b.glint || b.beamGuide || b.lightT > 0 || b.wind > 0 || g.markers.length > 0;
        if (warned && warnAt === null) warnAt = t;
        const danger = g.enemyShots.length > shots || b.beam || g.terrain.slabs.length > slabs0 ||
          g.enemies.some((e) => e.type === 'sawBlade' || e.type === 'frostMine') || g.player.x < x0 - 1;
        shots = g.enemyShots.length;
        if (danger) dangerAt = t;
      }
      res.warnings[name] = warnAt === null || dangerAt === null ? -1 : +(dangerAt - warnAt).toFixed(2);
    }

    // The frost beam only sweeps the slice its guide lines show: sit in it
    // and it costs 2 blocks; get out of it in time and it misses; a slab of
    // ice in the way stops it.
    const beamAt = (move, slab) => {
      b = fresh(1);
      g.player.x = 30;
      g.player.y = 60;
      b.attack = { name: 'beam', t: 0 };
      g.update(1 / 120, idle);
      if (slab) g.terrain.addSlab({ x: 70, y: 40, w: 20, h: 50, speed: 0 });
      if (move) g.player.y = g.player.y > 70 ? 14 : 125; // well out of the slice
      g.player.invuln = 0;
      g.health = 5;
      for (let i = 0; i < 2.5 * 120 && b.attack; i++) {
        hold(b);
        g.update(1 / 120, idle);
      }
      return 5 - g.health;
    };
    res.beam = { stay: beamAt(false), dodge: beamAt(true), ice: beamAt(false, true) };

    // Hail: the first "!" right above you.
    b = fresh(1);
    g.player.x = 50;
    b.attack = { name: 'hail', t: 0 };
    step(0.3, b);
    const pc = g.playerCenter();
    res.hailAbove = g.markers.length ? Math.min(...g.markers.map((m) => Math.abs(m.x - pc.x))) : -1;

    // Saw blades fly out and come back to the ring (none left behind).
    b = fresh(1);
    g.player.x = 30;
    b.attack = { name: 'blades', t: 0 };
    let maxBlades = 0;
    for (let i = 0; i < 6 * 120; i++) {
      g.player.invuln = 1;
      hold(b);
      g.update(1 / 120, idle);
      maxBlades = Math.max(maxBlades, g.enemies.filter((e) => e.type === 'sawBlade').length);
    }
    res.blades = { thrown: maxBlades, left: g.enemies.filter((e) => e.type === 'sawBlade').length };

    // Blizzard: the wind pushes you back (it doesn't hurt by itself).
    b = fresh(3);
    g.player.x = 120 - 40;
    g.player.y = 125;
    b.attack = { name: 'blizzard', t: 0 };
    const px0 = g.player.x;
    step(3, b);
    res.blizzardPush = Math.round(px0 - g.player.x);

    // No safe spot: wherever you sit (in front, high, low, behind it), its
    // attacks reach you within 25 s of a stage-3 fight.
    res.noSafeSpot = {};
    for (const [name, x, y] of [['front', 30, 60], ['top', 30, 12], ['bottom', 30, 128], ['behind', 196, 12]]) {
      b = fresh(3);
      b.x = 80;
      b.idle = 0.5;
      let hits = 0;
      const hurt = g.hurtPlayer.bind(g);
      g.hurtPlayer = (n) => {
        hits += n;
        g.player.invuln = 1;
      };
      for (let i = 0; i < 25 * 120; i++) {
        g.player.x = x;
        g.player.y = y;
        b.dest = { x: 80, y: 38 }; // it holds its spot; you hold yours
        g.update(1 / 120, idle);
      }
      g.hurtPlayer = hurt;
      res.noSafeSpot[name] = hits;
    }

    // Bumping into it costs 2 blocks and leaves you clear of it.
    b = fresh(1);
    g.player.x = b.x + 6;
    g.player.y = b.y + 30;
    g.player.invuln = 0;
    g.health = 5;
    g.update(1 / 120, idle);
    const h = g.playerHitbox();
    res.bump = { hurt: 5 - g.health, clear: g.contact(b, h.x, h.y, h.w, h.h) === null };
    // ...and from behind, out behind it (never through it).
    b = fresh(1);
    b.x = 80;
    g.player.x = b.x + 64;
    g.player.y = b.y + 6;
    g.player.invuln = 0;
    g.update(1 / 120, idle);
    res.bump.behind = g.player.x > b.x + 40;

    // Breaking it into stage 2: it roars, a bonus, it can't be hurt while
    // its fresh plates freeze over, and it starts stage 2 armoured.
    b = fresh(1);
    b.plates[3].hp = 0;
    b.hp = Math.floor(b.maxHp * 0.66) + 1;
    b.hitPlate = -1;
    const score0 = g.score;
    g.damage(b, 2);
    res.stage2 = { phase: b.phase, mode: b.mode, bonus: g.score - score0, openInTransition: b.T.isVulnerable(b) };
    for (let i = 0; i < 6 * 120 && b.mode !== 'fight'; i++) step(1 / 120, b);
    res.stage2.armouredAfter = b.mode === 'fight' && !b.T.isVulnerable(b);
    return res;
  });
  const w = r.warnings;
  const ok = r.armour.firstPlate && r.armour.firstPlate.untouched && !r.armour.firstPlate.open &&
    r.armour.coreHitAt !== null && r.armour.vulnerable &&
    r.bomb === '0,0,0,0,0,0' && r.laser.coreHurt > 0 && r.laser.plates.split(',').filter((x) => x === '0').length >= 1 &&
    r.rocketsArmoured !== 'sawBlade' && r.rocketsOpen === 'glacierWarden' &&
    r.refreeze1 && r.turning > 0.08 && r.turning < 0.5 &&
    r.ammo.six === 6 && r.ammo.two === 2 && r.ammo.emptyGlow === 0 && !/fan|wall/.test(r.ammo.strippedPicks) && r.ammo.strippedPicks.length > 0 &&
    r.refreeze2.grew !== null && r.refreeze2.knockedBack && r.refreeze2.closedAgain &&
    Object.values(w).every((v) => v >= 0.3) &&
    r.beam.stay === 2 && r.beam.dodge === 0 && r.beam.ice === 0 &&
    r.hailAbove >= 0 && r.hailAbove < 3 && r.blades.thrown >= 2 && r.blades.left === 0 &&
    r.blizzardPush > 40 && Object.values(r.noSafeSpot).every((n) => n > 0) &&
    r.bump.hurt === 2 && r.bump.clear && r.bump.behind &&
    r.stage2.phase === 2 && r.stage2.mode === 'transition' && r.stage2.bonus >= 1000 && !r.stage2.openInTransition &&
    r.stage2.armouredAfter && errs.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  Glacier Warden rules ${JSON.stringify(r)} ${errs.join(' ')}`);
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

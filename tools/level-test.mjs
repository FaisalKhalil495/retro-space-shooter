// Plays levels 1, 2, 3 and 4 (with all four bosses) automatically at high speed (an
// invincible autopilot that lines up with enemies and holds Fire) to check
// the level scripts, pickups, special weapons and the boss all work and each
// level can be finished.
// Run: node tools/level-test.mjs <screenshot-dir>
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const out = process.argv[2] || '.';
const { server, base } = await serve();

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base);
await page.waitForTimeout(300);
// The game's dice come from a seed, so a run can be replayed exactly: a
// fresh seed each time (for variety), printed; replay one with SEED=n.
const seed = Number(process.env.SEED) || Math.floor(Math.random() * 1e9);
console.log(`seed ${seed} (replay with SEED=${seed})`);
await page.evaluate((seed) => {
  // Stop the real-time loop from also stepping the game while we drive it.
  window.__ember.frozen = true;
  window.__ember.play();
  const g = window.__ember.game;
  let s = seed >>> 0;
  g.rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}, seed);
await page.waitForTimeout(300);

// Anything still blurry? While the autopilot plays, every 8th step is also
// drawn (at double detail, onto a canvas of our own) and every picture
// drawn without its sharp double-detail version is noted, with the code
// that drew it.
await page.evaluate(async () => {
  const v = new URL(document.querySelector('script[type=module]').src).search;
  const { useDetail } = await import('/js/detail.js' + v);
  const cv = document.createElement('canvas');
  cv.width = 416;
  cv.height = 288;
  const ctx = useDetail(cv.getContext('2d'));
  const inner = ctx.drawImage;
  const blurry = (window.__blurry = {});
  ctx.drawImage = (img, ...a) => {
    // (A picture shrunk to half size or less is sharp enough as it is.)
    const shrink = a.length === 2 ? 1 : a.length === 4 ? img.width / a[2] : a[2] / a[6];
    if (img && !img.hi && shrink < 2) {
      const at = new Error().stack.split('\n').slice(2).find((l) => !l.includes('detail.js')) || '';
      const k = `${img.width}x${img.height} ${at.trim().replace(/.*\/js\//, '').replace(/\?v=[0-9.]+/, '')}`;
      blurry[k] = (blurry[k] || 0) + 1;
    }
    return inner(img, ...a);
  };
  window.__drawSharp = (g) => {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    g.draw(ctx, (x) => Math.round(x * 2) / 2);
  };
});

// Freeze the real-time loop's influence by pausing input, then drive the
// simulation directly in big batches.
const run = (seconds, opts = {}) => page.evaluate(({ seconds, opts }) => {
  const g = window.__ember.game;
  const log = window.__log || (window.__log = { collected: [], specials: 0, bossSeen: false, maxEnemies: 0, types: [] });
  if (!g.__wrapped) {
    const collect = g.collectPickup.bind(g);
    g.collectPickup = (k) => { log.collected.push(k); collect(k); };
    const say = g.say.bind(g);
    log.said = [];
    g.say = (e, text, style, dur) => { log.said.push(text); say(e, text, style, dur); };
    const bonus = g.stageBonus.bind(g);
    log.bonuses = 0;
    g.stageBonus = (e, stage) => { log.bonuses++; bonus(e, stage); };
    const chip = g.chipSlab.bind(g);
    log.shattered = 0;
    g.chipSlab = (s, ...rest) => { chip(s, ...rest); if (s.dead && !s.counted) { s.counted = true; log.shattered++; } };
    const fire = g.fireShot.bind(g);
    log.shotKinds = [];
    g.fireShot = (...a) => { if (!log.shotKinds.includes(a[4])) log.shotKinds.push(a[4]); return fire(...a); };
    const spawn = g.spawnEnemy.bind(g);
    log.spawned = 0;
    // (enemies only: not cargo pods, nor bombs, charges and rockets, nor
    // Frostbreaker and its drones, cinders and wreck)
    g.spawnEnemy = (...a) => {
      if (!['carrier', 'wolfBomb', 'wolfCharge', 'wolfRocket', 'frostbreaker', 'cinder', 'frostWreck'].includes(a[0])) log.spawned++;
      return spawn(...a);
    };
    g.__wrapped = true;
  }
  const step = 1 / 120;
  const VIEW_W_ = 208; // the game's width in game pixels
  for (let i = 0; i < seconds / step; i++) {
    const p = g.player;
    if (opts.invincible) p.invuln = Math.max(p.invuln, 1);
    // Autopilot: line up with the nearest target (or the boss's mouth), and
    // drift towards pickups.
    let ty = p.y;
    const pk = g.pickups[0];
    // The autopilot's own pick: the nearest thing on screen, cargo pods
    // first (rockets ignore pods, but the autopilot must shoot them open).
    let target = null;
    let best = Infinity;
    for (const e of g.enemies) {
      if (e.dead || e.mode === 'dying' || e.x > VIEW_W_ || e.x + e.w < 0) continue;
      const tp = g.aimPoint(e);
      const d = Math.hypot(tp.x - p.x, tp.y - p.y - p.h / 2) + (tp.x < p.x ? 80 : 0) - (e.type === 'carrier' ? 40 : 0);
      if (d < best) {
        best = d;
        target = e;
      }
    }
    // A cargo pod still ahead comes first, before chasing loose items (they
    // drift slower than pods, so they can wait): chasing items let a slow
    // pod cross the whole screen behind the ship unopened, about one run in
    // thirty.
    const pod = g.enemies.find((e) => e.type === 'carrier' && !e.dead && e.x < VIEW_W_ && g.aimPoint(e).x > p.x + p.w);
    if (pod && !(pk && pk.magnet)) {
      target = pod;
      ty = g.aimPoint(pod).y - p.h / 2;
    } else if (pk) ty = pk.y - 1;
    else if (target) ty = g.aimPoint(target).y - p.h / 2;
    let dx = 0;
    if (pod && !(pk && pk.magnet)) dx = p.x > 40 ? -1 : 0;
    else if (pk) dx = pk.x > p.x + 6 ? 1 : pk.x < p.x ? -1 : 0;
    else dx = p.x > 40 ? -1 : 0;
    const dy = Math.abs(ty - p.y) < 1.5 ? 0 : ty > p.y ? 1 : -1;
    let special = false;
    if (opts.useSpecials && g.weapons.kind && g.boss && g.boss.T.isVulnerable(g.boss) && !g.weapons.laser) {
      special = true;
      log.specials++;
    }
    g.update(step, { dx, dy, fire: true, special, tap: false });
    if (i % 8 === 0) window.__drawSharp(g);
    if (g.boss) log.bossSeen = true;
    // While a boss talks (taunt, roars) it must be holding back, not
    // fighting. (No kill lines here: the autopilot is invincible.)
    if (g.boss && g.isSpeaking(g.boss) && (g.boss.mode === 'fight' || g.boss.attack || g.boss.round)) {
      log.talkAttacks = (log.talkAttacks || 0) + 1;
    }
    log.maxEnemies = Math.max(log.maxEnemies, g.enemies.length);
    for (const e of g.enemies) if (!log.types.includes(e.type)) log.types.push(e.type);
    if (g.state === 'clear') break;
  }
  return {
    t: +g.runner.t.toFixed(1), state: g.state, score: g.score, lives: g.lives,
    boss: g.boss ? { hp: g.boss.hp, mode: g.boss.mode } : null,
    weapon: g.weapons.kind, ammo: g.weapons.ammo, ...log,
  };
}, { seconds, opts });

// Boss supply pods: count them over about 55 seconds of boss fight, and check
// they alternate survival / weapon.
const supply = await page.evaluate(() => {
  const g = window.__ember.game;
  g.reset();
  g.runner.skipTo(g.runner.endsAt - 0.5);
  let pods = 0;
  const kinds = [];
  const spawn = g.spawnEnemy.bind(g);
  g.spawnEnemy = (type, x, y, opts = {}) => {
    if (type === 'carrier' && (opts.drop === 'smart' || opts.drop === 'weapon')) {
      pods++;
      kinds.push(opts.drop);
    }
    return spawn(type, x, y, opts);
  };
  for (let i = 0; i < 70 * 120; i++) {
    g.player.invuln = 1;
    g.update(1 / 120, { dx: 0, dy: 0, fire: false, special: false, tap: false });
  }
  g.spawnEnemy = spawn;
  g.reset();
  return { pods, kinds };
});
console.log('supply pods in ~55s of boss fight:', JSON.stringify(supply));
const pods = supply.pods;

const results = {};
results.early = await run(30, { invincible: true });
await page.screenshot({ path: `${out}/lvl-early.png` });
results.mid = await run(130, { invincible: true });
await page.screenshot({ path: `${out}/lvl-mid.png` });
results.preBoss = await run(32, { invincible: true, useSpecials: true });
await page.screenshot({ path: `${out}/lvl-boss.png` });
results.boss = await run(240, { invincible: true, useSpecials: true });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/lvl-clear.png` });

// On to level 2 (Rust Moon), carrying the run over.
const level2 = await page.evaluate(() => {
  const g = window.__ember.game;
  g.stateTimer = 4;
  g.update(1 / 120, { dx: 0, dy: 0, fire: false, special: false, tap: true });
  const log = window.__log;
  log.collected = [];
  log.types = [];
  log.maxEnemies = 0;
  log.bossSeen = false;
  log.said = [];
  log.bonuses = 0;
  log.talkAttacks = 0;
  return { level: g.level.number, state: g.state };
});
results.rust = await run(560, { invincible: true, useSpecials: true });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/lvl2-clear.png` });

// On to level 3 (Frostring).
const level3 = await page.evaluate(() => {
  const g = window.__ember.game;
  g.stateTimer = 4;
  g.update(1 / 120, { dx: 0, dy: 0, fire: false, special: false, tap: true });
  const log = window.__log;
  log.collected = [];
  log.types = [];
  log.maxEnemies = 0;
  log.shattered = 0;
  log.bossSeen = false;
  log.said = [];
  log.bonuses = 0;
  log.talkAttacks = 0;
  return { level: g.level.number, state: g.state };
});
results.frost = await run(560, { invincible: true, useSpecials: true });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/lvl3-clear.png` });

// On to level 4 (The White Front) and its boss, Frostbreaker.
const level4 = await page.evaluate(() => {
  const g = window.__ember.game;
  g.stateTimer = 4;
  g.update(1 / 120, { dx: 0, dy: 0, fire: false, special: false, tap: true });
  const log = window.__log;
  log.collected = [];
  log.types = [];
  log.maxEnemies = 0;
  log.bossSeen = false;
  log.said = [];
  log.bonuses = 0;
  log.talkAttacks = 0;
  log.shotKinds = [];
  log.spawned = 0;
  // (loot from enemies only, not the cargo pods)
  const drop = g.maybeDrop.bind(g);
  log.dropped = 0;
  g.maybeDrop = (e) => { const n = g.pickups.length; drop(e); log.dropped += g.pickups.length - n; };
  return { level: g.level.number, state: g.state };
});
results.white = await run(60, { invincible: true });
await page.screenshot({ path: `${out}/lvl4-early.png` });
const w1 = { types: [...results.white.types] };
results.white = await run(400, { invincible: true, useSpecials: true });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/lvl4-clear.png` });
results.white.types = [...new Set([...w1.types, ...results.white.types])];

// Each Wolf left alone (you don't shoot back): every one attacks with its
// own bullet (the autopilot usually shoots them first).
const attacks = await page.evaluate(() => {
  const g = window.__ember.game;
  g.reset();
  g.runner.update = () => {}; // (no waves: one Wolf at a time)
  const out = {};
  for (const type of ['wolfDart', 'needleWing', 'wakeHunter', 'crestBomber', 'wolfHound', 'flakStar', 'shelfSkiff', 'snowRoller', 'rocketSled']) {
    g.enemies = [];
    g.enemyShots = [];
    const kinds = [];
    const fire = g.fireShot;
    g.fireShot = (...a) => { if (!kinds.includes(a[4])) kinds.push(a[4]); return fire(...a); };
    g.spawnEnemy(type, 212, 50, { spitAt: 0.6 });
    const seen = new Set();
    for (let i = 0; i < 10 * 120; i++) {
      g.player.invuln = 1;
      g.player.x = 30;
      g.player.y = 60;
      g.update(1 / 120, { dx: 0, dy: 0, fire: false, special: false, tap: false });
      for (const e of g.enemies) seen.add(e.type + ':' + e.mode);
    }
    g.fireShot = fire;
    out[type] = { kinds, dashed: seen.has('wakeHunter:dash'), bomb: [...seen].some((k) => k.startsWith('wolfBomb')),
      charge: [...seen].some((k) => k.startsWith('wolfCharge')), rockets: [...seen].some((k) => k.startsWith('wolfRocket')) };
  }
  g.reset();
  return out;
});
results.attacks = attacks;

console.log(JSON.stringify(results, null, 1));
const blurry = await page.evaluate(() => window.__blurry);
if (Object.keys(blurry).length) console.log('pictures drawn without their sharp version:', blurry);
const r = results.boss;
const r2 = results.rust;
const r3 = results.frost;
const r4 = results.white;
const pickups2 = ['rockets', 'shield', 'bomb', 'spread', 'life', 'rapid', 'laser', 'wingman'];
const checks = {
  'enemies appeared': results.early.maxEnemies > 3,
  'snipers and spinners appeared': ['sniper', 'spinner'].every((t) => r.types && r.types.includes(t)),
  'rockets pickup collected': r.collected.includes('rockets'),
  'bomb pickup collected': r.collected.includes('bomb'),
  'extra life collected': r.collected.includes('life'),
  'laser pickup collected': r.collected.includes('laser'),
  'shield power-up collected': r.collected.includes('shield'),
  'spread shot power-up collected': r.collected.includes('spread'),
  'wingman power-up collected': r.collected.includes('wingman'),
  'boss appeared': r.bossSeen,
  'Rockjaw talks in speech bubbles': ['YOU ARE FUCKING DINNER', 'MY FUCKING EYE!', 'NOW I EAT YOU WHOLE']
    .every((line) => r.said.includes(line)),
  'a stage bonus for each broken stage': r.bonuses === 2,
  'Rockjaw never attacks while talking': !r.talkAttacks,
  'boss sends a supply pod every ~20s': pods >= 3,
  'supply pods alternate survival / weapon': supply.kinds.slice(0, 3).join() === 'smart,weapon,smart',
  'level cleared': r.state === 'clear',
  'level 2 follows level 1': level2.level === 2 && level2.state === 'playing',
  'Rust Moon enemies appeared': ['cliffTurret', 'dustSkimmer', 'mortarCrawler', 'mortarShell', 'raider', 'sniper', 'spinner', 'gunner']
    .every((t) => r2.types.includes(t)),
  'Rust Moon cargo pods all collected': pickups2.every((k) => r2.collected.includes(k)),
  'Siege Crawler appeared': r2.bossSeen,
  'Siege Crawler talks in speech bubbles': ['STEP INTO MY FUCKING SIGHTS', 'YOU SCRATCHED MY FUCKING PAINT', 'ALL GUNS. NOW.']
    .every((line) => r2.said.includes(line)),
  'a Siege Crawler stage bonus for each broken stage': r2.bonuses === 2,
  'Siege Crawler never attacks while talking': !r2.talkAttacks,
  'Rust Moon cleared': r2.state === 'clear',
  'level 3 (Frostring) follows level 2': level3.level === 3 && level3.state === 'playing',
  'Frostring cargo pods all collected': pickups2.every((k) => r3.collected.includes(k)),
  'slabs of ice broken by your shots': r3.shattered >= 10,
  'Frostring enemies appeared': ['rimeGuard', 'cryoLayer', 'frostMine', 'prism', 'prismShard', 'gunner', 'sniper', 'spinner']
    .every((t) => r3.types.includes(t)),
  'Glacier Warden appeared': r3.bossSeen,
  'Glacier Warden talks in speech bubbles': ['THIS RING IS FUCKING MINE', 'YOU CRACKED MY FUCKING ICE', 'FREEZE, YOU LITTLE SHIT']
    .every((line) => r3.said.includes(line)),
  'a Glacier Warden stage bonus for each broken stage': r3.bonuses === 2,
  'Glacier Warden never attacks while talking': !r3.talkAttacks,
  'Frostring cleared': r3.state === 'clear',
  'level 4 (The White Front) follows level 3': level4.level === 4 && level4.state === 'playing',
  'all nine Wolves appeared': ['wolfDart', 'needleWing', 'wakeHunter', 'crestBomber', 'wolfHound', 'flakStar', 'shelfSkiff', 'snowRoller', 'rocketSled']
    .every((t) => r4.types.includes(t)),
  'each Wolf attacks its own way, with its own bullet': attacks.wolfDart.kinds.join() === 'tracer' && attacks.needleWing.kinds.join() === 'rail' &&
    attacks.wolfHound.kinds.join() === 'slag' && attacks.flakStar.kinds.join() === 'flak' && attacks.crestBomber.bomb &&
    attacks.crestBomber.kinds.join() === 'shard' && attacks.wakeHunter.dashed &&
    attacks.shelfSkiff.kinds.join() === 'slug' && attacks.snowRoller.charge && attacks.snowRoller.kinds.join() === 'ice' &&
    attacks.rocketSled.rockets && attacks.rocketSled.kinds.length === 0,
  'no plain enemy bullets on the White Front': !r4.shotKinds.some((k) => !['tracer', 'rail', 'slag', 'flak', 'shard', 'slug', 'ice', 'drill', undefined].includes(k)),
  'about 230 Wolves in the level': r4.spawned >= 215 && r4.spawned <= 290,
  'White Front cargo pods all collected': pickups2.every((k) => r4.collected.includes(k)),
  'White Front loot gamble (about 10 items)': r4.dropped >= 5 && r4.dropped <= 25,
  'Frostbreaker appeared': r4.bossSeen && r4.types.includes('cinder'),
  'Frostbreaker talks in speech bubbles': ['FULL AHEAD. CRUSH IT.', 'YOU HOLED MY FUCKING HULL', 'ALL ENGINES. BURN IT.']
    .every((line) => r4.said.includes(line)),
  'a Frostbreaker stage bonus for each broken stage': r4.bonuses === 2,
  'Frostbreaker never attacks while talking': !r4.talkAttacks,
  'its drill shells fired': r4.shotKinds.includes('drill'),
  'White Front cleared': r4.state === 'clear',
  'every picture drawn sharp (double detail)': Object.keys(blurry).length === 0,
  'no script errors': errors.length === 0,
};
let failures = 0;
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
}
if (errors.length) console.log(errors);
await browser.close();
server.close();
process.exit(failures ? 1 : 0);

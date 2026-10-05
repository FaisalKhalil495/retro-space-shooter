// Plays level 1 and then level 2 automatically at high speed (an
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
await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
await page.waitForTimeout(300);

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
    if (pk) ty = pk.y - 1;
    else if (target) ty = g.aimPoint(target).y - p.h / 2;
    let dx = 0;
    if (pk) dx = pk.x > p.x + 6 ? 1 : pk.x < p.x ? -1 : 0;
    else dx = p.x > 40 ? -1 : 0;
    const dy = Math.abs(ty - p.y) < 1.5 ? 0 : ty > p.y ? 1 : -1;
    let special = false;
    if (opts.useSpecials && g.weapons.kind && g.boss && g.boss.T.isVulnerable(g.boss) && !g.weapons.laser) {
      special = true;
      log.specials++;
    }
    g.update(step, { dx, dy, fire: true, special, tap: false });
    if (g.boss) log.bossSeen = true;
    // While a boss talks (taunt, roars) it must be holding back, not
    // fighting. (No kill lines here: the autopilot is invincible.)
    if (g.boss && g.isSpeaking(g.boss) && (g.boss.mode === 'fight' || g.boss.attack)) {
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

// Stop the real-time loop from also stepping the game while we drive it.
await page.evaluate(() => {
  window.__ember.frozen = true;
});

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

console.log(JSON.stringify(results, null, 1));
const r = results.boss;
const r2 = results.rust;
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
  'Rust Moon enemies appeared': ['cliffTurret', 'dustSkimmer', 'mortarCrawler', 'mortarShell', 'rockBig', 'sniper', 'spinner', 'gunner']
    .every((t) => r2.types.includes(t)),
  'Rust Moon cargo pods all collected': pickups2.every((k) => r2.collected.includes(k)),
  'Siege Crawler appeared': r2.bossSeen,
  'Siege Crawler talks in speech bubbles': ['STEP INTO MY FUCKING SIGHTS', 'YOU SCRATCHED MY FUCKING PAINT', 'ALL GUNS. NOW.']
    .every((line) => r2.said.includes(line)),
  'a Siege Crawler stage bonus for each broken stage': r2.bonuses === 2,
  'Siege Crawler never attacks while talking': !r2.talkAttacks,
  'Rust Moon cleared': r2.state === 'clear',
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

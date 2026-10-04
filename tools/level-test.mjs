// Plays level 1 automatically at high speed (an invincible autopilot that
// lines up with enemies and holds Fire) to check the level script, pickups,
// special weapons and the boss all work and the level can be finished.
// Run: node tools/level-test.mjs <screenshot-dir>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || '.';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
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
  const log = window.__log || (window.__log = { collected: [], specials: 0, bossSeen: false, maxEnemies: 0 });
  if (!g.__wrapped) {
    const collect = g.weapons.collect.bind(g.weapons);
    g.weapons.collect = (k) => { log.collected.push(k); collect(k); };
    g.__wrapped = true;
  }
  const step = 1 / 120;
  for (let i = 0; i < seconds / step; i++) {
    const p = g.player;
    if (opts.invincible) p.invuln = Math.max(p.invuln, 1);
    // Autopilot: line up with the nearest target (or the boss's mouth), and
    // drift towards pickups.
    let ty = p.y;
    const pk = g.pickups[0];
    const target = g.nearestEnemy(p.x, p.y + p.h / 2);
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
    log.maxEnemies = Math.max(log.maxEnemies, g.enemies.length);
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
  const g = window.__ember.game;
  g.__realUpdate = g.update;
});
await page.evaluate(() => {
  // Pause the live loop by marking the game paused (main.js checks 'paused'
  // via the overlay); simplest is to make the live update a no-op.
  const g = window.__ember.game;
  const real = g.update.bind(g);
  g.update = () => {};
  window.__step = real;
});
// Re-point run() at the real update.
await page.evaluate(() => {
  const g = window.__ember.game;
  g.update = window.__step;
  window.__ember.liveOff = true;
});

const results = {};
results.early = await run(30, { invincible: true });
await page.screenshot({ path: `${out}/lvl-early.png` });
results.mid = await run(70, { invincible: true });
await page.screenshot({ path: `${out}/lvl-mid.png` });
results.preBoss = await run(32, { invincible: true, useSpecials: true });
await page.screenshot({ path: `${out}/lvl-boss.png` });
results.boss = await run(90, { invincible: true, useSpecials: true });
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/lvl-clear.png` });

console.log(JSON.stringify(results, null, 1));
const r = results.boss;
const checks = {
  'enemies appeared': results.early.maxEnemies > 3,
  'rockets pickup collected': r.collected.includes('rockets'),
  'bomb pickup collected': r.collected.includes('bomb'),
  'extra life collected': r.collected.includes('life'),
  'laser pickup collected': r.collected.includes('laser'),
  'boss appeared': r.bossSeen,
  'level cleared': r.state === 'clear',
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

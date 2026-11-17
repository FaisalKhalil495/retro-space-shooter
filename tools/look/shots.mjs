// Screenshots of level 1 in a given look, at given moments, with a simple
// autopilot. node tools/look/shots.mjs <out-dir> <look> [times] [level]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { serve } = await import('../serve.mjs');
const { server, base } = await serve();
const out = process.argv[2];
const lk = process.argv[3] || '4';
const times = (process.argv[4] || '4,9,13,17,23,27').split(',').map(Number);
const level = process.argv[5] || '1';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.stack));
page.on('console', (m) => m.type() === 'error' && console.log('LOG', m.text()));
await page.goto(base + `?level=${level}&look=${lk}`);
await page.waitForTimeout(500);
await page.evaluate(() => {
  window.__ember.frozen = true; window.__ember.play();
  const g = window.__ember.game;
  let s = 12345;
  g.rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let rs = 99; Math.random = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
  window.__t = 0;
  window.__run = (until) => {
    while (window.__t < until) {
      g.player.invuln = 1;
      const p = g.player;
      const e = g.enemies.filter((q) => !q.dead && q.x < 205 && q.x > p.x + 20 && !q.T.boss).sort((a, c) => a.x - c.x)[0];
      const dy = e ? Math.sign(Math.round((e.y + e.h / 2 - (p.y + 6)) / 2)) : 0;
      g.update(1 / 120, { dx: 0, dy, fire: true, special: false, tap: false });
      window.__t += 1 / 120;
    }
  };
});
await page.waitForTimeout(600);
for (const t of times) {
  await page.evaluate((t) => window.__run(t), t);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}/look${lk}-${String(t).padStart(3, '0')}.png`, clip: { x: 160, y: 0, width: 595, height: 412 } });
}
await b.close(); server.close();

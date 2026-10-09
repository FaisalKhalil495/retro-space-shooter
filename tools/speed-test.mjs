// How fast the game draws on a slow phone: plays five busy scenes with the
// processor slowed 4x and counts the frames drawn in 3 seconds (higher is
// better). Run it before and after a change that touches drawing and
// compare. Run: node tools/speed-test.mjs
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { server, base } = await serve();
const browser = await chromium.launch();
const SCENES = [
  ['Level 1, busy', '?level=1&start=110', 6],
  ['Rockjaw', '?level=1&start=boss', 25],
  ['Frostring', '?level=3&start=120', 6],
  ['Glacier Warden', '?level=3&start=boss', 40],
  ['Siege Crawler', '?level=2&start=boss', 30],
];
for (const [name, query, secs] of SCENES) {
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(base + query);
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await page.waitForTimeout(300);
  // Play into the scene at full speed (invincible, firing), then let the
  // live game run with the processor slowed down.
  await page.evaluate((secs) => {
    window.__ember.frozen = true;
    const g = window.__ember.game;
    for (let i = 0; i < secs * 120; i++) {
      const p = g.player;
      p.invuln = Math.max(p.invuln, 1);
      g.update(1 / 120, { dx: p.x < 36 ? 1 : p.x > 44 ? -1 : 0, dy: 0, fire: true, special: false, tap: false });
    }
    window.__ember.frozen = false;
  }, secs);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const frames = await page.evaluate(() => new Promise((done) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
      else done(n);
    };
    requestAnimationFrame(tick);
  }));
  console.log(`${name.padEnd(16)} ${frames} frames in 3 s`);
  await context.close();
}
await browser.close();
server.close();

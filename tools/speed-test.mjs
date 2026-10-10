// How fast the game draws on a slow phone: plays five busy scenes with the
// processor slowed 4x and counts the frames drawn in 3 seconds (higher is
// better). Then, for each scene, two numbers that don't depend on the
// computer (so they're steady from run to run, unlike frame counts): how
// many drawing calls a frame makes, and how much short-lived memory
// ("garbage") the game makes a second, which a phone must stop to clear up
// now and then (lower is better for both). Run it before and after a change
// that touches drawing and compare. Run: node tools/speed-test.mjs
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
  // Every random number in the page (the game's dice, explosions, drawing)
  // comes from a seed we can reset, so every run plays the same scene.
  await context.addInitScript(() => {
    let seed = 1;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    window.__seedRandom = (n) => { seed = n; };
  });
  const page = await context.newPage();
  await page.goto(base + query);
  await page.waitForTimeout(300);
  // Play into the scene at full speed (invincible, firing), from the same
  // seed every run, so every run reaches the same moment.
  await page.evaluate((secs) => {
    window.__ember.frozen = true; // (before the start tap: no live frames at all)
    window.__seedRandom(7);
    document.getElementById('start').dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    const g = window.__ember.game;
    window.__step = () => {
      const p = g.player;
      p.invuln = Math.max(p.invuln, 1);
      g.update(1 / 120, { dx: p.x < 36 ? 1 : p.x > 44 ? -1 : 0, dy: 0, fire: true, special: false, tap: false });
    };
    for (let i = 0; i < secs * 120; i++) window.__step();
  }, secs);
  const cdp = await context.newCDPSession(page);
  // Drawing calls a frame, then garbage a second: the same 60 frames each
  // time (two fixed game steps before each one is drawn), measured apart
  // (counting calls makes garbage of its own).
  const calls = await page.evaluate(() => new Promise((done) => {
    const ctx = document.getElementById('screen').getContext('2d');
    let n = 0;
    const names = ['fillRect', 'drawImage', 'stroke', 'fill', 'putImageData', 'fillText', 'clearRect'];
    const saved = names.map((k) => ctx[k]);
    names.forEach((k, i) => {
      ctx[k] = function (...a) { n++; return saved[i].apply(this, a); };
    });
    let frames = 0;
    window.__seedRandom(11); // (frames drawn while waiting used up random numbers)
    const tick = () => {
      if (frames++ < 60) {
        window.__step();
        window.__step();
        requestAnimationFrame(tick);
      } else {
        names.forEach((k, i) => { ctx[k] = saved[i]; });
        done(Math.round(n / 60));
      }
    };
    requestAnimationFrame(tick);
  }));
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', {
    samplingInterval: 512, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true,
  });
  await page.evaluate(() => new Promise((done) => {
    let frames = 0;
    window.__seedRandom(11); // (frames drawn while waiting used up random numbers)
    const tick = () => {
      if (frames++ < 60) {
        window.__step();
        window.__step();
        requestAnimationFrame(tick);
      } else done();
    };
    requestAnimationFrame(tick);
  }));
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  // Then the frames the live game manages in 3 s with the processor slowed.
  await page.evaluate(() => { window.__ember.frozen = false; });
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
  const garbage = profile.samples.reduce((a, x) => a + x.size, 0) / 1024 / 1024; // (60 frames: one second)
  console.log(`${name.padEnd(16)} ${String(frames).padStart(3)} frames in 3 s · ${String(calls).padStart(4)} drawing calls a frame · ${garbage.toFixed(1)} MB garbage a second`);
  await context.close();
}
await browser.close();
server.close();

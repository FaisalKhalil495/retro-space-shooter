// How smooth the new look runs when a lot blows up: plays a busy stretch
// of level 1 live for some seconds with the processor slowed 4x and
// reports the frame times (typical, the slowest 5%, the worst), how many
// frames took over 50 ms, and how many model pictures had to be painted
// in the middle of play (each one is a possible hitch).
// node tools/look/frames.mjs [look] [start] [seconds] [skip]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const { serve } = await import('../serve.mjs');
const { server, base } = await serve();
const lk = process.argv[2] || '4';
const start = process.argv[3] || '0';
const secs = +(process.argv[4] || 30);
const skip = +(process.argv[5] || 0); // seconds played before measuring starts
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  let seed = 5; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(base + `?level=1&start=${start}&look=${lk}`);
await page.waitForTimeout(500);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const r = await page.evaluate(async ({ secs, skip }) => {
  const v = new URL(document.querySelector('script[type=module]').src).search;
  const M = await import('/js/model.js' + v);
  window.__ember.play();
  const g = window.__ember.game;
  // An autopilot through the real controls' place: it steers the ship at
  // whatever is nearest and holds fire, invincible.
  const up = g.update.bind(g);
  g.update = (dt, input) => {
    const p = g.player; p.invuln = 1;
    const e = g.enemies.filter((q) => !q.dead && q.x < 205 && q.x > p.x + 20 && !q.T.boss).sort((a, c) => a.x - c.x)[0];
    const dy = e ? Math.sign(Math.round((e.y + e.h / 2 - (p.y + 6)) / 2)) : 0;
    return up(dt, { dx: 0, dy, fire: true, special: false, tap: false });
  };
  if (skip) await new Promise((done) => setTimeout(done, skip * 1000));
  const times = [];
  let last = performance.now();
  const t0 = last;
  const bakes0 = M.bakeCount ? M.bakeCount() : -1;
  await new Promise((done) => { const tick = (now) => { times.push(now - last); last = now; if (now - t0 < secs * 1000) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
  times.sort((a, c) => a - c);
  const q = (f) => Math.round(times[Math.floor(times.length * f)]);
  return { frames: times.length, typical: q(0.5), slow5: q(0.95), worst: Math.round(times[times.length - 1]), over50: times.filter((t) => t > 50).length, over100: times.filter((t) => t > 100).length, bakesInPlay: M.bakeCount ? M.bakeCount() - bakes0 : 'n/a' };
}, { secs, skip });
console.log(`look ${lk}, from ${start}s (+${skip}s), ${secs}s:`, JSON.stringify(r));
await b.close(); server.close();

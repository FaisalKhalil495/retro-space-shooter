// Bakes the Iron Wolves' pictures (traced shape by shape over the owner's
// paintings: wolves3/) into the game as double-detail text grids:
// js/wolfart.js. Each one comes shut and "open" (about to fire), exactly
// even in size (so its normal picture is exactly half, filling the same
// outline box). Run: node tools/white-front/bake-wolves.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const REPO = new URL('../../', import.meta.url).pathname;
const { serve } = await import(REPO + 'tools/serve.mjs');
const { server, base } = await serve();
const b = await chromium.launch();
const page = await b.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(base + 'index.html');
const out = await page.evaluate(async () => {
  const { V } = await import('/tools/white-front/wolves3/vehicles.js');
  const { D } = await import('/tools/white-front/wolves3/designs.js');
  const { ART } = await import('/tools/white-front/wolves3/artillery.js');
  const { paint } = await import('/tools/white-front/wolves3/vec.js');
  const { WOLF_COAST } = await import('/tools/white-front/sets4.js');
  // game name: [source, painted name]
  const LIST = {
    wolfDart: 'dart', needleWing: 'needle', wakeHunter: 'hunter', crestBomber: 'bomber',
    wolfHound: 'weaverA', flakStar: 'spinnerB', shelfSkiff: 'skiff', snowRoller: 'roller', rocketSled: 'rocketSled',
  };
  const box = (a) => {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    a.forEach((row, y) => row.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }));
    return [x0, y0, x1 + 1, y1 + 1];
  };
  const crop = (a, [x0, y0, x1, y1]) => a.slice(y0, y1).map((r) => r.slice(x0, x1));
  const pair = (closed, open) => {
    const A = box(closed), B = box(open);
    const bb = [Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[2], B[2]), Math.max(A[3], B[3])];
    return { bb, even: (bb[2] - bb[0]) % 2 === 0 && (bb[3] - bb[1]) % 2 === 0, closed: crop(closed, bb), open: crop(open, bb) };
  };
  const res = {};
  for (const [name, src] of Object.entries(LIST)) {
    const v = V[src] || D[src] || ART[src];
    paint(v, 'wolves', false); // (moves traced shapes into place once)
    let got = null;
    for (const d of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      const vv = { ...v, width: v.width + d };
      const p = pair(paint(vv, 'wolves', false).a, paint(vv, 'wolves', true).a);
      if (p.even) { got = { ...p, d }; break; }
    }
    res[name] = got;
  }
  for (const [name, src] of [['wolfBomb', 'bomb'], ['wolfCharge', 'charge']]) {
    const p = pair(WOLF_COAST[src](false).a, WOLF_COAST[src](true).a);
    res[name] = { ...p, d: 0 };
  }
  return res;
});
await b.close();
server.close();
// Colours to letters.
const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-/:;<=>?@^_~';
const pal = [];
const code = (c) => {
  if (!c) return '.';
  let i = pal.indexOf(c);
  if (i < 0) { i = pal.length; pal.push(c); }
  if (i >= CH.length) throw new Error('too many colours');
  return CH[i];
};
let js = `// The Iron Wolves (level 4, The White Front), at double detail: made by
// tools/white-front/bake-wolves.mjs from the shapes traced over the owner's
// paintings (tools/white-front/wolves3/). Don't edit by hand: change the
// shapes and bake again. Each picture comes shut and open (about to fire).
// '.' is see-through; every other letter is a colour in WOLF_PAL.
`;
const art = {};
for (const [name, r] of Object.entries(out)) {
  if (!r || !r.even) {
    // (an odd size: pad it to even with see-through)
    console.log('odd size, padding', name);
    for (const k of ['closed', 'open']) {
      const g = r[k];
      if (g[0].length % 2) g.forEach((row) => row.push(null));
      if (g.length % 2) g.push(g[0].map(() => null));
    }
  }
  art[name] = r.closed.map((row) => row.map(code).join(''));
  art[name + 'Open'] = r.open.map((row) => row.map(code).join(''));
  console.log(name, r.closed[0].length + 'x' + r.closed.length, 'width tweak', r.d);
}
js += `export const WOLF_PAL = ${JSON.stringify(pal)};\n`;
js += `export const WOLF_ART = {\n`;
for (const [n, rows] of Object.entries(art)) js += `  ${n}: [\n${rows.map((r) => `    '${r}',`).join('\n')}\n  ],\n`;
js += `};\n`;
fs.writeFileSync(REPO + 'js/wolfart.js', js);
console.log('colours', pal.length, 'bytes', js.length);

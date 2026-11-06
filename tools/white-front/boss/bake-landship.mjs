// Bakes Frostbreaker (the White Front's boss: the owner's own painting of a
// land battleship, traced shape by shape in landship.js) into the game as
// double-detail text grids, in its own colours (olive and cream): js/
// landshipart.js. Three looks of the hull (whole; nose armour blown off and
// holed; burning with a mast down), the two guard blades in front of its
// drill cannon (separate pictures: you shoot them off), and the places
// the game needs (muzzle, stacks, engines...) in sharp pixels.
// Run: node tools/white-front/boss/bake-landship.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
const REPO = new URL('../../../', import.meta.url).pathname;
const { serve } = await import(REPO + 'tools/serve.mjs');
const { server, base } = await serve();
const b = await chromium.launch();
const page = await b.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(base + 'index.html');
const out = await page.evaluate(async () => {
  const { LANDSHIP } = await import('/tools/white-front/boss/landship.js');
  const { paint } = await import('/tools/white-front/wolves3/vec.js');
  // The whole ship's frame, so every part lines up with the hull.
  const full = paint(LANDSHIP, 'coast', false);
  const box = [full.r.X0, full.r.Y0, full.r.X0 + LANDSHIP.width / full.r.scale, null];
  // (bounds of every shape, as vec.js works them out)
  const ys = [];
  for (const s of LANDSHIP.shapes) {
    if (s.poly) s.poly.forEach(([, y]) => ys.push(y));
    if (s.rect) ys.push(s.rect[1], s.rect[3]);
    if (s.ell) ys.push(s.ell[1] - s.ell[3], s.ell[1] + s.ell[3]);
    if (s.line) ys.push(s.line[1], s.line[3]);
  }
  box[3] = Math.max(...ys);
  const part = (keep) => paint({ ...LANDSHIP, box, shapes: LANDSHIP.shapes.filter(keep) }, 'coast', false);
  const blade = (s) => s.part && s.part.startsWith('blade');
  const looks = [
    part((s) => !blade(s) && s.part !== 'hole2' && s.part !== 'hole3'),
    part((s) => !blade(s) && s.part !== 'nose' && s.part !== 'hole3'),
    part((s) => !blade(s) && s.part !== 'nose' && s.part !== 'mast'),
  ];
  const blades = [0, 1].map((k) => part((s) => s.part === 'blade' + k));
  const { map } = full.r;
  const P = (x, y) => map(x, y);
  return {
    w: full.w, h: full.h,
    looks: looks.map((p) => p.a),
    blades: blades.map((p) => p.a),
    points: {
      muzzle: P(198, 262), muzzleTop: P(212, 210), muzzleBottom: P(212, 314), muzzleBack: P(238, 262),
      tip: P(134, 242), coreTop: P(212, 200), coreBottom: P(212, 306), stackA: P(1217, 78), stackB: P(1274, 70), stern: P(1320, 112),
      engineA: P(802, 236), engineB: P(1214, 256), bridge: P(790, 118), lights: P(690, 148),
      mast: P(1057, 15), mastFoot: P(1057, 150), nose: P(60, 410), hullTop: P(800, 160),
      holes: [P(300, 200), P(520, 250), P(640, 196), P(960, 252), P(1110, 196), P(1330, 262), P(800, 186)],
    },
  };
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
const even = (g) => {
  if (g[0].length % 2) g.forEach((row) => row.push(null));
  if (g.length % 2) g.push(g[0].map(() => null));
  return g;
};
// A blade: cropped to its box (on even sharp pixels, so its normal-size
// picture sits on whole game pixels).
const cropEven = (a) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  a.forEach((row, y) => row.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }));
  x0 -= x0 % 2; y0 -= y0 % 2; x1 += 1 + ((x1 + 1) % 2); y1 += 1 + ((y1 + 1) % 2);
  return { x: x0, y: y0, a: a.slice(y0, y1).map((r) => r.slice(x0, x1)) };
};
const rows = (g) => g.map((r) => r.map(code).join(''));
const hull = out.looks.map((g) => rows(even(g)));
const blades = out.blades.map((g) => { const c = cropEven(g); return { x: c.x, y: c.y, rows: rows(c.a) }; });
let js = `// Frostbreaker, the White Front's boss, at double detail: made by
// tools/white-front/boss/bake-landship.mjs from the shapes traced over the
// owner's painting (tools/white-front/boss/landship.js). Don't edit by hand:
// change the shapes and bake again. '.' is see-through; every other letter
// is a colour in LANDSHIP_PAL. Positions are in sharp pixels.
`;
js += `export const LANDSHIP_PAL = ${JSON.stringify(pal)};\n`;
js += `export const LANDSHIP_POINTS = ${JSON.stringify(out.points)};\n`;
js += `export const LANDSHIP_HULL = [\n${hull.map((g) => `  [\n${g.map((r) => `    '${r}',`).join('\n')}\n  ],`).join('\n')}\n];\n`;
js += `export const LANDSHIP_BLADES = [\n${blades.map((B) => `  { x: ${B.x}, y: ${B.y}, rows: [\n${B.rows.map((r) => `    '${r}',`).join('\n')}\n  ] },`).join('\n')}\n];\n`;
fs.writeFileSync(REPO + 'js/landshipart.js', js);
console.log('hull', hull[0][0].length + 'x' + hull[0].length, 'blades', blades.map((B) => `${B.x},${B.y} ${B.rows[0].length}x${B.rows.length}`).join(' '), 'colours', pal.length, 'bytes', js.length);
console.log(JSON.stringify(out.points));

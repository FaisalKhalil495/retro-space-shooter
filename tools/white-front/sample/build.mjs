// Builds the two White Front look samples (LEFT: all drawn by code; RIGHT:
// ChatGPT art + code ground) as single self-contained HTML files.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import { once } from 'node:events';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const REPO = '/home/user/retro-space-shooter', HERE = new URL('.', import.meta.url).pathname, WHITE = HERE + '../';
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = p.startsWith('/white/') ? WHITE + p.slice(7) : REPO + p;
  const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : 'text/html';
  try { const b = fs.readFileSync(file); res.writeHead(200, { 'content-type': type }); res.end(b); } catch { res.writeHead(404); res.end(); }
}).listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}/`;
const b = await chromium.launch();
const page = await b.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
page.on('console', (m) => console.log('LOG', m.text()));
await page.goto(base + 'white/none');
const packs = await page.evaluate(async () => {
  const url = (c) => c.toDataURL('image/png');
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const gridCanvas = (gr) => { const c = canvas(gr.w, gr.h), x = c.getContext('2d'); gr.a.forEach((row, j) => row.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const { SPRITES } = await import('/js/sprites.js?v=0.29.0');
  const player = url(SPRITES.player.hi);
  const ORDER = ['drifter', 'weaver', 'gunner', 'seeker', 'sniper', 'spinner'], GN = ['skitank', 'rocketsled', 'flakbunker'];
  const types = (imgs) => Object.fromEntries([...ORDER, ...GN].map((n) => [n, { w: imgs[n].width / 2, h: imgs[n].height / 2 }]));

  // ---------------- LEFT: everything drawn by code
  const LW = await import('/white/sample/left-world.js');
  const D2 = await import('/white/design2.js');
  const LG = await import('/white/sample/legion-ground.js');
  const lImgs = {};
  for (const n of ORDER) lImgs[n] = gridCanvas(D2.SETS[0].fns[n]());
  for (const n of GN) lImgs[n] = gridCanvas(LG.legionGround[n]());
  const lg = LW.ground();
  const left = {
    side: 'LEFT SAMPLE', sub: 'all drawn|by code', tag: 'LEFT', label: 'LEFT: ALL DRAWN BY CODE',
    images: { player, sky: url(LW.sky()), far: url(LW.far()), ground: url(lg.canvas) },
    layers: [{ img: 'sky', speed: 0 }, { img: 'far', speed: 'far' }],
    ground: { y0: lg.y0, L: LW.L, top: lg.top, lane: lg.lane },
    types: types(lImgs), barrel: ['#4a4853', '#bdbac2'],
  };
  for (const n of ORDER) left.images['e_' + n] = url(lImgs[n]);
  for (const n of GN) left.images['u_' + n] = url(lImgs[n]);
  Object.assign(left.types.skitank, { pivot: [7, 4.5], foot: 0 });
  Object.assign(left.types.rocketsled, { muzzle: [7, 5.5], foot: 0 });
  Object.assign(left.types.flakbunker, { muzzle: [3, 1.5], foot: 0.5 });

  // ---------------- RIGHT: ChatGPT far world and enemies, code ground
  const F = await import('/white/far.js');
  const Cc = await import('/white/cut.js');
  const RG = await import('/white/sample/right-ground.js');
  const { tile, ships } = await F.build('/white/far-src.png');
  const E = await Cc.cut('/white/enemies-src.png', 1.6, 'mode');
  const U = await Cc.cut('/white/ground-enemies-src.png', 1, 'mode', GN, { skitank: [46, 28], rocketsled: [52, 34], flakbunker: [44, 30] });
  const rImgs = {}; for (const n of ORDER) rImgs[n] = E[n].canvas; for (const n of GN) rImgs[n] = U[n].canvas;
  // the landing ships: their own slow layer, repeating every 416 hi px
  const shipL = canvas(416, 160), sx = shipL.getContext('2d');
  for (const s of ships) for (const k of [0, -416]) sx.drawImage(s.canvas, (Math.round(s.x * 0.95) % 416) + k, Math.round(s.y));
  // haze and the sun, still
  const over = canvas(416, 288), o = over.getContext('2d');
  const hz = o.createLinearGradient(0, 120, 0, 288); hz.addColorStop(0, 'rgba(226,236,246,0.10)'); hz.addColorStop(1, 'rgba(226,236,246,0.35)');
  o.fillStyle = hz; o.fillRect(0, 0, 416, 288);
  const SX = 300, SY = 42;
  for (const [r, a] of [[26, 0.12], [17, 0.25], [11, 0.45]]) { o.fillStyle = `rgba(252,248,236,${a})`; o.beginPath(); o.arc(SX, SY, r, 0, 7); o.fill(); }
  o.fillStyle = '#fdf9ec'; o.beginPath(); o.arc(SX, SY, 7.5, 0, 7); o.fill();
  o.strokeStyle = 'rgba(248,240,222,0.6)'; o.lineWidth = 1.5; o.beginPath(); o.arc(SX, SY, 33, 0, 7); o.stroke();
  // the ground, repeating every 1024 game px, with a soft shadow above its back edge
  const L = 1024, gr = RG.paintLoop(L, 11);
  let minB = 1e9; for (let x = 0; x < L * 2; x++) minB = Math.min(minB, gr.backAt(x));
  const y0 = minB - 10, gc = canvas(L * 2, 288 - y0), gx = gc.getContext('2d');
  for (let x = 0; x < L * 2; x++) { const t = gr.backAt(x) - y0; const g2 = gx.createLinearGradient(0, t - 8, 0, t); g2.addColorStop(0, 'rgba(40,70,110,0)'); g2.addColorStop(1, 'rgba(40,70,110,0.25)'); gx.fillStyle = g2; gx.fillRect(x, t - 8, 1, 8); }
  gx.drawImage(gr.canvas, 0, -y0);
  const top = [], lane = [];
  for (let x = 0; x < L; x++) { const bk = gr.shape.back(x), dp = gr.shape.depth(x); top.push(+bk.toFixed(2)); lane.push(+(bk + dp * 0.62).toFixed(2)); }
  const right = {
    side: 'RIGHT SAMPLE', sub: 'ChatGPT art|+ code ground', tag: 'RIGHT', label: 'RIGHT: CHATGPT ART + CODE GROUND',
    images: { player, far: url(tile), ships: url(shipL), over: url(over), ground: url(gc) },
    layers: [{ img: 'far', speed: 'far' }, { img: 'ships', speed: 'ships', alpha: 0.7 }, { img: 'over', speed: 0 }],
    ground: { y0, L, top, lane },
    types: types(rImgs), barrel: ['#2f3138', '#6a6d76'],
  };
  for (const n of ORDER) right.images['e_' + n] = url(rImgs[n]);
  for (const n of GN) right.images['u_' + n] = url(rImgs[n]);
  Object.assign(right.types.skitank, { pivot: [6.5, 3.5], foot: 1 });
  Object.assign(right.types.rocketsled, { muzzle: [5, 4], foot: 1 });
  Object.assign(right.types.flakbunker, { muzzle: [4, 2], foot: 1 });
  // ---------------- FRONT: the new front-line background (preview, no enemies)
  const F3 = await import('/white/front3.js?' + Date.now());
  const L3 = await F3.build('/white/front-far-src.png', '/white/front-line-src.png');
  const front = {
    side: 'BACKGROUND', sub: 'THE FRONT LINE|no enemies yet', tag: 'PREVIEW', label: 'BACKGROUND PREVIEW: THE FRONT LINE',
    images: { player, far: url(L3.far), front: url(L3.tile), ground: right.images.ground },
    layers: [], ground: right.ground, types: {}, barrel: right.barrel,
    front: { lineY: L3.lineY, guns: L3.guns, fires: L3.fires }, shipCount: ships.length,
  };
  // the invaders' army (ChatGPT's designs, brought to game size sharp, in the colours the owner chose)
  const C2 = await import('/white/cut2.js?' + Date.now());
  const AO = ['pod', 'wasp', 'gunship', 'dart', 'lancer', 'wheel', 'skiff', 'turret', 'drum', 'lander'];
  const AS = { pod: [32, 26], wasp: [36, 30], gunship: [48, 34], dart: [34, 24], lancer: [58, 22], wheel: [36, 36], skiff: [48, 28], turret: [40, 34], drum: [52, 32], lander: [100, 44] };
  const ARMY = await C2.cut('/white/army-src.png', 1, 'sharp-colour', AO, AS);
  // the game's enemy jobs, played by the new army
  const ROLE = { drifter: 'pod', weaver: 'wasp', gunner: 'gunship', seeker: 'dart', sniper: 'lancer', spinner: 'wheel', skitank: 'skiff', rocketsled: 'drum', flakbunker: 'turret' };
  for (const [job, n] of Object.entries(ROLE)) {
    const cv = ARMY[n].canvas;
    front.images[(job in { skitank: 1, rocketsled: 1, flakbunker: 1 } ? 'u_' : 'e_') + job] = url(cv);
    front.types[job] = { w: cv.width / 2, h: cv.height / 2 };
  }
  Object.assign(front.types.skitank, { pivot: [2.5, 2.5], muzzle: [2.5, 2.5], foot: 1 });
  Object.assign(front.types.rocketsled, { muzzle: [10, 2], foot: 1 });
  Object.assign(front.types.flakbunker, { muzzle: [1.5, 1], foot: 1 });
  front.barrel = null;
  // the landing ships in the sky: the intact version of the wrecks, two sizes
  // far away: smaller than any enemy and hazed with the sky's colour, so nobody mistakes them for targets
  const distant = (k, haze) => {
    const src = ARMY.lander.canvas, c3 = document.createElement('canvas');
    c3.width = Math.round(src.width * k); c3.height = Math.round(src.height * k);
    const x3 = c3.getContext('2d'); x3.imageSmoothingQuality = 'high'; x3.drawImage(src, 0, 0, c3.width, c3.height);
    x3.globalCompositeOperation = 'source-atop'; x3.fillStyle = `rgba(150,176,210,${haze})`; x3.fillRect(0, 0, c3.width, c3.height);
    return c3;
  };
  front.images.ship0 = url(distant(0.5, 0.4)); front.images.ship1 = url(distant(0.34, 0.5)); front.shipCount = 2;
  front.sub = 'THE FRONT LINE|+ the invaders'; front.label = 'THE WHITE FRONT: PREVIEW';
  // ---------------- WORLD: the all-code White Front (the look the owner chose) + the coast army
  const W2 = await import('/white/world2.js?' + Date.now());
  const CA = await import('/white/sample/coast-art.js?' + Date.now());
  const S4 = await import('/white/sets4.js?' + Date.now());
  const WF = S4.SETS4.find((x) => x.key === 'wolves').fns;
  const ARMY_FN = (await import('/white/wolves3/army.js?' + Date.now())).WOLVES;
  const gridC = (gr) => { const c = canvas(gr.w, gr.h), x = c.getContext('2d'); gr.a.forEach((row, j) => row.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); } })); return c; };
  const far2 = W2.far(), g2 = W2.ground();
  const world = {
    side: 'THE WHITE FRONT', sub: 'all drawn by code|+ the Iron Wolves', tag: 'PREVIEW', label: 'THE WHITE FRONT: PREVIEW',
    images: { player, sky: url(W2.sky()), clouds: url(W2.clouds()), far: url(far2.canvas), ground: url(g2.canvas) },
    layers: [], ground: { y0: g2.y0, L: W2.L, top: g2.top, lane: g2.lane }, types: {}, barrel: null,
    world: { guns: far2.guns, lights: far2.lights, deco: g2.deco }, coastTypes: {},
  };
  [1.3, 0.95, 0.65].forEach((s, k) => { const w = Math.ceil(32 * s) + 4, h = Math.ceil(16 * s) + 4, c = canvas(w, h); W2.lander(c.getContext('2d'), w / 2, h / 2 - 1 * s, s, 0); world.images['lander' + k] = url(c); });
  for (const n of ['skiff', 'anchor', 'roller', 'dart', 'bomber', 'needle', 'hunter', 'charge', 'bomb']) {
    const idle = gridC(ARMY_FN[n](false)), open = gridC(ARMY_FN[n](true));
    world.images['c_' + n] = url(idle); world.images['c_' + n + '_open'] = url(open);
    world.coastTypes[n] = { w: idle.width / 2, h: idle.height / 2 };
  }
  return { left, right, front, world };
});
const tpl = fs.readFileSync(HERE + 'game.html', 'utf8');
const OUT = WHITE + '../';
for (const [key, pack, title] of [['LEFT', packs.left, 'White Front Left Sample'], ['RIGHT', packs.right, 'White Front Right Sample'], ['FRONT', packs.front, 'White Front Background'], ['WORLD', packs.world, 'White Front Preview']]) {
  const body = tpl.replace('/*TITLE*/', title).replace('/*PACK*/null', JSON.stringify(pack));
  // the artifact version (the host adds the page skeleton) and a stand-alone file to download
  fs.writeFileSync(HERE + `artifact-${key}.html`, body);
  const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n` +
    body.replace('<canvas id="screen">', '</head>\n<body>\n<canvas id="screen">') + '\n</body>\n</html>\n';
  fs.writeFileSync(OUT + `white-front-sample-${key}.html`, full);
  console.log(key, (full.length / 1024 / 1024).toFixed(2), 'MB', Object.fromEntries(Object.entries(pack.types).map(([k, v]) => [k, [v.w, v.h]])));
}
await b.close(); server.close();

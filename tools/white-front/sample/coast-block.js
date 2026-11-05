// ---------------------------------------------------------------- the White Front world (all code) and its coast army
// Far to near: still sky, drifting cloud banks, landing ships coming down,
// searchlights, the glacier front line (bunkers fire tracers, flak bursts),
// then the ground with its wrecks (smoking) and flags (waving).
const WORLD = PACK.world || null;
let Wd = null;
function resetWorld() {
  Wd = { ships: [], tracers: [], flak: [], puffs: [], gunT: WORLD.guns.map((_, i) => 0.4 + i * 0.55), shipT: 4 };
  for (let i = 0; i < 3; i++) wShip(50 + i * 150);
}
function wShip(x) {
  const k = Math.floor(rand() * 3);
  Wd.ships.push({ k, x: x ?? 430, y: 22 + rand() * 50 + k * 10, vx: -(5 + rand() * 7) * (1 - k * 0.2), vy: 1 + rand() * 1.4, hit: 0 });
}
const farW = () => IMG.far.width;
function updateWorld(dt) {
  if ((Wd.shipT -= dt) <= 0) { Wd.shipT = 6 + rand() * 5; if (Wd.ships.length < 4) wShip(); }
  for (const sh of Wd.ships) {
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
    if (sh.hit && Math.random() < dt * 10) Wd.puffs.push({ x: sh.x + IMG['lander' + sh.k].width * 0.7, y: sh.y + 3, r: 1.6, life: 1.4, max: 1.4, vx: 3, vy: -5, a: 0.4 });
  }
  Wd.ships = Wd.ships.filter((sh) => sh.x > -90 && sh.y < 170);
  const off = (S.far * 2) % farW();
  WORLD.guns.forEach(([gx, gy], i) => {
    if ((Wd.gunT[i] -= dt) > 0) return;
    Wd.gunT[i] = 1.4 + rand() * 2.2;
    for (const k of [0, 1]) {
      const x = gx - off + k * farW(); if (x < 6 || x > 410) continue;
      const near = Wd.ships.filter((sh) => sh.x > x - 40 && sh.x < x + 240);
      const tg = near.length ? near[Math.floor(rand() * near.length)] : null;
      const tx = tg ? tg.x + IMG['lander' + tg.k].width / 2 + (rand() - 0.5) * 24 : x + 50 + rand() * 120, ty = tg ? tg.y + 4 + (rand() - 0.5) * 16 : 16 + rand() * 60;
      for (let j = 0; j < 5; j++) Wd.tracers.push({ x, y: gy, tx, ty, d: -j * 0.07, last: j === 4, ship: tg });
    }
  });
  for (const tr of Wd.tracers) {
    tr.d += dt; if (tr.d < 0) continue;
    const Ld = Math.hypot(tr.tx - tr.x, tr.ty - tr.y), k = Math.min(1, (tr.d * 200) / Ld);
    tr.px = tr.x + (tr.tx - tr.x) * k; tr.py = tr.y + (tr.ty - tr.y) * k;
    if (k >= 1) { tr.done = true; if (tr.last) { Wd.flak.push({ x: tr.tx, y: tr.ty, t: 0 }); if (tr.ship && Math.random() < 0.2) tr.ship.hit = 1; } }
  }
  Wd.tracers = Wd.tracers.filter((tr) => !tr.done);
  for (const f of Wd.flak) f.t += dt;
  Wd.flak = Wd.flak.filter((f) => f.t < 1.2);
  // the wrecks smoke; powder blows off the drifts
  const goff = (S.scroll * 2) % (GR.L * 2);
  for (const d of WORLD.deco) if (d.kind === 'smoke' && Math.random() < dt * 5) for (const k of [0, 1]) {
    const x = d.x - goff + k * GR.L * 2; if (x < -20 || x > 436) continue;
    Wd.puffs.push({ x, y: d.y, r: 2, life: 2.4, max: 2.4, vx: -4, vy: -12, a: 0.45, ground: true });
  }
  if (Math.random() < dt * 6) { const x = 40 + Math.random() * 180; S.fx.push({ k: 'spray', x, y: groundTop(S.scroll + x) - 0.5, vx: -22 - Math.random() * 14, vy: -4 - Math.random() * 6, life: 0.9, max: 0.9 }); }
  for (const p of Wd.puffs) { p.life -= dt; p.x += p.vx * dt - (p.ground ? GROUND_SPEED * 2 * dt : 0); p.y += p.vy * dt; p.r += dt * 2.4; }
  Wd.puffs = Wd.puffs.filter((p) => p.life > 0);
}
function drawWorld() {
  g.drawImage(IMG.sky, 0, 0);
  tileX(IMG.clouds, S.t * 5, -38);
  for (const sh of Wd.ships) {
    const im = IMG['lander' + sh.k]; g.drawImage(im, Math.round(sh.x), Math.round(sh.y));
    if (Math.random() < 0.5) { g.fillStyle = 'rgba(242,207,138,0.45)'; for (const f of [0.3, 0.5, 0.7]) g.fillRect(Math.round(sh.x + im.width * f), Math.round(sh.y + im.height - 2), 1, 2 + Math.floor(Math.random() * 3)); }
  }
  const off = (S.far * 2) % farW();
  WORLD.lights.forEach(([lx, ly], i) => {
    for (const k of [0, 1]) {
      const x = lx - off + k * farW(); if (x < -60 || x > 470) continue;
      const a = -1.75 + Math.sin(S.t * 0.45 + i * 1.9) * 0.5, L = 150;
      const gr = g.createLinearGradient(x, ly, x + Math.cos(a) * L, ly + Math.sin(a) * L);
      gr.addColorStop(0, 'rgba(250,244,226,0.34)'); gr.addColorStop(1, 'rgba(250,244,226,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, ly); g.lineTo(x + Math.cos(a - 0.07) * L, ly + Math.sin(a - 0.07) * L); g.lineTo(x + Math.cos(a + 0.07) * L, ly + Math.sin(a + 0.07) * L); g.fill();
    }
  });
  tileX(IMG.far, S.far * 2, 0);
  for (const p of Wd.puffs) if (!p.ground) { g.fillStyle = `rgba(86,90,102,${p.a * (p.life / p.max)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
  for (const f of Wd.flak) {
    const k = f.t / 1.2;
    if (f.t < 0.08) { g.fillStyle = '#fff1cf'; g.beginPath(); g.arc(f.x, f.y, 4, 0, 7); g.fill(); }
    g.fillStyle = `rgba(70,74,84,${0.7 * (1 - k)})`;
    for (const [dx, dy] of [[0, 0], [3, -2], [-3, 1], [1, 3]]) { g.beginPath(); g.arc(f.x + dx * (1 + k), f.y + dy * (1 + k), 2.4 + k * 4, 0, 7); g.fill(); }
  }
  for (const tr of Wd.tracers) if (tr.d >= 0) { const a = Math.atan2(tr.ty - tr.y, tr.tx - tr.x); g.strokeStyle = '#f1d69a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tr.px, tr.py); g.lineTo(tr.px - Math.cos(a) * 5, tr.py - Math.sin(a) * 5); g.stroke(); }
}
function drawWorldNear() {
  const goff = (S.scroll * 2) % (GR.L * 2);
  for (const p of Wd.puffs) if (p.ground) { g.fillStyle = `rgba(92,96,108,${p.a * (p.life / p.max)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
  for (const d of WORLD.deco) if (d.kind === 'flag') for (const k of [0, 1]) {
    const x = d.x - goff + k * GR.L * 2; if (x < -20 || x > 436) continue;
    g.fillStyle = '#c98f4a'; g.beginPath(); g.moveTo(x, d.y);
    for (let i = 0; i <= 12; i++) g.lineTo(x + i, d.y + Math.sin(i * 0.6 - S.t * 7) * 1.4 * (i / 12));
    for (let i = 12; i >= 0; i--) g.lineTo(x + i, d.y + 7 + Math.sin(i * 0.6 - S.t * 7) * 1.4 * (i / 12));
    g.fill(); g.fillStyle = '#e3a857'; g.fillRect(x, d.y + 1, 3, 1);
  }
}

// The army (ChatGPT's coast designs, redrawn sharp at game size), with the
// attacks from its sample: every one warns before it fires (its "open" look).
const CT = PACK.coastTypes || {};
const CHP = { skiff: 4, anchor: 4, roller: 5, dart: 2, bomber: 5, needle: 3, hunter: 3, charge: 1, bomb: 1 };
const CPTS = { skiff: 40, anchor: 50, roller: 60, dart: 30, bomber: 60, needle: 50, hunter: 50, charge: 10, bomb: 10 };
const CGROUND = { skiff: 1, anchor: 1, roller: 1, charge: 1 };
function coast(type, x, y = 0, extra = {}) {
  const t = CT[type];
  const o = { kind: 'coast', type, x, y, baseY: y, hw: t.w * 0.42, hh: t.h * 0.42, hp: CHP[type], t: 0, mode: 'enter', timer: 0, n: 0, flash: 0, open: false, ground: !!CGROUND[type], ...extra };
  if (o.ground) placeC(o);
  S.foes.push(o); return o;
}
function placeC(o) { const t = CT[o.type]; let s = 0, n = 0; for (let i = -t.w / 2; i < t.w / 2; i += 2) { s += laneAt(S.scroll + o.x + i); n++; } o.base = s / n; o.y = o.base - t.h / 2 + 0.5; }
const ph = (o, m, time = 0) => { o.mode = m; o.timer = time; o.open = m === 'warn' || m === 'vent'; };
const facingC = (o) => pAlive() && o.x - o.hw > S.p.x + 6 && o.x < VW - 2 && o.x > 8;
const nose = (o, dy = 0) => [o.x - CT[o.type].w / 2 + 1, o.y + dy];
const aimFrom = ([x, y]) => Math.atan2(S.p.y - y, S.p.x - x);
function fireA(m, a, sp, kind, dmg = 1) { eshot(m[0], m[1], Math.cos(a) * sp, Math.sin(a) * sp, kind, dmg); tone(kind === 'rail' ? 1200 : 640, kind === 'rail' ? 220 : 380, 0.08, 'square', 0.035); }
function updateCoast(o, dt) {
  o.t += dt; const p = S.p;
  if (o.ground && o.type !== 'charge') placeC(o);
  switch (o.type) {
    case 'skiff':
      o.x -= (o.mode === 'enter' ? 52 : o.mode === 'leave' ? 65 : GROUND_SPEED) * dt;
      if (o.mode === 'enter' && o.x <= 150) ph(o, 'brake', 0.35);
      else if (o.mode === 'brake') { if ((o.timer -= dt) <= 0 && facingC(o)) ph(o, 'warn', 0.6); }
      else if (o.mode === 'warn') {
        if (!facingC(o)) ph(o, 'leave');
        else if ((o.timer -= dt) <= 0) { const m = nose(o, -1), a = aimFrom(m); for (const d of [-0.17, 0, 0.17]) fireA(m, a + d, 72); o.n++; ph(o, o.n < 2 ? 'brake' : 'leave', 1.2); }
      }
      if (o.mode !== 'enter' && o.x < p.x + 12) ph(o, 'leave');
      break;
    case 'anchor':
      o.x -= GROUND_SPEED * dt;
      if (o.mode === 'enter') ph(o, 'closed', 0.7);
      else if (o.mode === 'closed') { if (facingC(o) && (o.timer -= dt) <= 0) ph(o, 'warn', 0.75); }
      else if (o.mode === 'warn') {
        if (!facingC(o)) ph(o, 'closed', 0.7);
        else if ((o.timer -= dt) <= 0) { const m = nose(o, -1.5); fireA(m, aimFrom(m), 70, 'shell', 2); boom(0.1, 0.25, 1600); ph(o, 'vent', 1.6); }
      } else if (o.mode === 'vent') { if ((o.timer -= dt) <= 0) ph(o, 'closed', 1.3); }
      break;
    case 'roller':
      o.x -= (o.mode === 'enter' ? 42 : o.mode === 'leave' ? 45 : GROUND_SPEED) * dt;
      if (o.mode === 'enter' && o.x <= 150) ph(o, 'wait', 0.35);
      else if (o.mode === 'wait') { if ((o.timer -= dt) <= 0 && facingC(o)) ph(o, 'warn', 0.8); }
      else if (o.mode === 'warn') {
        if (!facingC(o)) ph(o, 'leave');
        else if ((o.timer -= dt) <= 0) { coast('charge', o.x - CT.roller.w / 2 - 3, 0, { life: 1.5 }); tone(300, 140, 0.15, 'square', 0.05); o.n++; ph(o, o.n < 2 ? 'wait' : 'leave', 1.65); }
      }
      if (o.mode !== 'enter' && o.x < p.x + 12) ph(o, 'leave');
      break;
    case 'charge':
      o.x -= 54 * dt; placeC(o); o.rot = (o.rot || 0) - dt * 7;
      if (o.t >= o.life - 0.65) o.open = true;
      if (o.t >= o.life) { o.hp = 0; blast(o.x, o.y, 0.6, true); for (let i = 0; i < 5; i++) { const a = -Math.PI + 0.25 + (i * (Math.PI - 0.5)) / 4; eshot(o.x, o.y - 2, Math.cos(a) * 62, Math.sin(a) * 62); } }
      break;
    case 'dart':
      o.y = o.baseY + Math.sin(o.t * 2) * 2;
      if (o.mode === 'enter') { o.x -= 48 * dt; if (o.x <= (o.lane ? 178 : 150)) ph(o, 'wait', 0.5 + (o.lane || 0) * 0.65); }
      else if (o.mode === 'leave') o.x -= 70 * dt;
      else if (o.mode === 'wait') { if ((o.timer -= dt) <= 0) ph(o, facingC(o) ? 'warn' : 'leave', 0.45); }
      else if (o.mode === 'warn') {
        if (!facingC(o)) ph(o, 'leave');
        else if ((o.timer -= dt) <= 0) { const m = nose(o); fireA(m, aimFrom(m), 82); o.n++; ph(o, o.n < 2 ? 'wait' : 'leave', 1.15); }
      }
      break;
    case 'bomber':
      o.y = o.baseY + Math.sin(o.t) * 1.5;
      if (o.mode === 'enter') { o.x -= 38 * dt; if (o.x <= 150) ph(o, 'wait', 0.4); }
      else if (o.mode === 'leave') o.x -= 52 * dt;
      else if (o.mode === 'wait') {
        if ((o.timer -= dt) <= 0) {
          if (!facingC(o)) ph(o, 'leave');
          else { o.tx = Math.max(12, Math.min(185, p.x)); o.ty = Math.max(o.y + o.hh + 14, Math.min(groundTop(S.scroll + o.tx) - 8, p.y)); ph(o, 'warn', 0.8); }
        }
      } else if (o.mode === 'warn') {
        if (!facingC(o)) ph(o, 'leave');
        else if ((o.timer -= dt) <= 0) { coast('bomb', o.x, o.y + o.hh, { sx: o.x, sy: o.y + o.hh, tx: o.tx, ty: o.ty }); tone(500, 200, 0.2, 'triangle', 0.05); o.n++; ph(o, o.n < 2 ? 'wait' : 'leave', 1.4); }
      }
      break;
    case 'bomb': {
      const k = Math.min(1, o.t / 1.1); o.x = o.sx + (o.tx - o.sx) * k; o.y = o.sy + (o.ty - o.sy) * k * k; o.open = Math.floor(o.t * 10) % 2 === 0;
      if (k >= 1) { o.hp = 0; blast(o.tx, o.ty, 0.7); if (near(o.tx, o.ty, 9)) hurt(1); for (let i = 0; i < 6; i++) eshot(o.tx, o.ty, Math.cos(i * Math.PI / 3) * 58, Math.sin(i * Math.PI / 3) * 58); }
      break;
    }
    case 'needle':
      if (o.mode === 'enter') { o.x -= 46 * dt; if (o.x <= 152) ph(o, 'aim', 0.5); }
      else if (o.mode === 'leave') o.x -= 78 * dt;
      else if (o.mode === 'aim') { o.ang = aimFrom(nose(o)); if ((o.timer -= dt) <= 0) ph(o, facingC(o) ? 'warn' : 'leave', 0.65); }
      else if (o.mode === 'warn') {
        if (!facingC(o)) ph(o, 'leave');
        else if ((o.timer -= dt) <= 0) { fireA(nose(o), o.ang, 115, 'rail'); o.n++; ph(o, o.n < 2 ? 'aim' : 'leave', 1.0); }
      }
      break;
    case 'hunter':
      if (o.mode === 'enter') { o.x -= 52 * dt; if (o.x <= 147) { o.ang = aimFrom(nose(o)); ph(o, 'warn', 0.8); } }
      else if (o.mode === 'warn') { if (!facingC(o)) ph(o, 'leave'); else if ((o.timer -= dt) <= 0) { o.vx = Math.cos(o.ang) * 145; o.vy = Math.sin(o.ang) * 145; ph(o, 'dash', 0.9); tone(220, 900, 0.3, 'sawtooth', 0.04); } }
      else if (o.mode === 'dash') { o.x += o.vx * dt; o.y = Math.max(HUD + 4, Math.min(groundTop(S.scroll + o.x) - o.hh - 2, o.y + o.vy * dt)); o.open = true; if ((o.timer -= dt) <= 0) ph(o, 'leave'); }
      else if (o.mode === 'leave') { o.x -= 80 * dt; o.y = Math.max(HUD + 4, o.y - 30 * dt); }
      break;
  }
  if (!o.ground && o.type !== 'bomb') { const top = groundTop(S.scroll + o.x); if (o.y + o.hh > top - 2) { o.y = top - 2 - o.hh; o.baseY = Math.min(o.baseY, o.y); } }
}
const coastArmoured = (o) => o.type === 'anchor' && !o.open;
function ringAt(x, y, lit) {
  g.strokeStyle = lit ? '#e4b16a' : '#a8544a'; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.arc(x * 2, y * 2, 14, 0, 7); g.stroke(); g.setLineDash([]);
  g.fillStyle = g.strokeStyle; g.fillRect(x * 2 - 6, y * 2 - 1, 12, 2); g.fillRect(x * 2 - 1, y * 2 - 6, 2, 12);
}
function drawCoast(o) {
  const key = 'c_' + o.type + (o.open ? '_open' : '');
  if (o.ground && o.type !== 'charge') { const t = CT[o.type]; g.fillStyle = 'rgba(40,70,115,0.3)'; g.beginPath(); g.ellipse(o.x * 2, o.base * 2, t.w * 1.05, 3, 0, 0, 7); g.fill(); }
  if (o.type === 'bomber' && o.mode === 'warn') ringAt(o.tx, o.ty, Math.floor(o.t * 8) % 2 === 0);
  if (o.type === 'bomb') ringAt(o.tx, o.ty, Math.floor(o.t * 8) % 2 === 0);
  if (o.type === 'charge' && o.open) ringAt(o.x, o.y - 8, Math.floor(o.t * 10) % 2 === 0);
  if ((o.type === 'needle' && (o.mode === 'aim' || o.mode === 'warn')) || (o.type === 'hunter' && o.mode === 'warn')) {
    const [mx, my] = nose(o), locked = o.mode === 'warn';
    dotted(mx, my, mx + Math.cos(o.ang) * 220, my + Math.sin(o.ang) * 220, locked ? '#d99b43' : 'rgba(168,137,105,0.8)');
  }
  sprite(key, o);
}

import { VIEW_W, HUD_H, PAL } from './config.js?v=0.30.0';
import { SPRITES, HI_NAMES } from './sprites.js?v=0.30.0';
import { WOLF_ART, WOLF_PAL } from './wolfart.js?v=0.30.0';
import { clamp } from './util.js?v=0.30.0';
import { sfx } from './audio.js?v=0.30.0';

// The Iron Wolves: the invaders' army on the White Front (level 4). Dark
// gunmetal armour, orange hazard stripes, red eye lamps. Their shapes were
// traced over the owner's own paintings and drawn sharp (js/wolfart.js).
// Like levels 2 and 3, the level has level 1's six kinds of enemy in its own
// look, but here each one also fights its own way (from the preview the
// owner played): pod -> Twin Dart, sniper -> Needle Wing, seeker -> Wake
// Hunter, gunship -> Crest Bomber, weaver -> Wolf Hound, spinner -> Flak
// Star. Every one warns before it fires (its lamps blink: its "open" look),
// and every one has its own bullet, a different shape and colour each, all
// with a dark outline so they show on snow and sky.

// ---------------------------------------------------------------- pictures
// Each traced picture is a double-detail grid; its normal-size picture (which
// sets its size and hit area) is made from it here: a pixel is filled when
// any of its four sharp pixels is, so both fill exactly the same box.
const CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-/:;<=>?@^_~';
const RGB = WOLF_PAL.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const CREAM = [0xef, 0xe3, 0xcf]; // PAL.cream: the white flash when hit

function picture(rows, flash) {
  const W = rows[0].length;
  const H = rows.length;
  const hi = document.createElement('canvas');
  hi.width = W;
  hi.height = H;
  const lo = document.createElement('canvas');
  lo.width = W / 2;
  lo.height = H / 2;
  const hd = new ImageData(W, H);
  const ld = new ImageData(W / 2, H / 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = CH.indexOf(rows[y][x]);
      if (k < 0) continue;
      const c = flash ? CREAM : RGB[k];
      const i = (y * W + x) * 4;
      hd.data.set(c, i);
      hd.data[i + 3] = 255;
      // (the normal picture takes the first filled sharp pixel of its four)
      const j = ((y >> 1) * (W / 2) + (x >> 1)) * 4;
      if (!ld.data[j + 3]) {
        ld.data.set(c, j);
        ld.data[j + 3] = 255;
      }
    }
  }
  hi.getContext('2d').putImageData(hd, 0, 0);
  lo.getContext('2d').putImageData(ld, 0, 0);
  lo.hi = hi;
  return lo;
}
for (const [name, rows] of Object.entries(WOLF_ART)) {
  SPRITES[name] = picture(rows, false);
  SPRITES[name + 'Flash'] = picture(rows, true);
  HI_NAMES.push(name); // (the tests check every sharp picture)
}

// Its picture: shut, or open (lamps lit: about to fire). warn: blink
// between the two (the warning before a shot).
function drawWolf(e, ctx, snap, game, open = false, warn = false) {
  const on = open || (warn && Math.floor(game.time * 10) % 2 === 0);
  ctx.drawImage(SPRITES[e.T.sprite + (on ? 'Open' : '') + (e.flash > 0 ? 'Flash' : '')], snap(e.x), snap(e.y));
}

// ---------------------------------------------------------------- bullets
// Painted once, in sharp pixels, as small pictures: turned to 16 headings
// (bullets that point the way they fly), or a few frames of spin, wobble or
// blink. Shapes are painted smooth, then every pixel is made fully solid or
// fully clear, so they stay crisp pixel art.
const K = PAL.ink;
function crisp(c, n) {
  const d = c.getImageData(0, 0, n, n);
  for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] >= 128 ? 255 : 0;
  c.putImageData(d, 0, 0);
}
// size: in game pixels. paint(c, i) paints frame i centred on (0, 0), in
// sharp pixels. Faint parts (a fading tail) go on their own layer:
// faint(c, i) and its opacity.
function frames(size, count, paint, faint = null, alpha = 0.4) {
  const n = size * 2;
  return Array.from({ length: count }, (_, i) => {
    const hi = document.createElement('canvas');
    hi.width = hi.height = n;
    const c = hi.getContext('2d');
    if (faint) {
      const f = document.createElement('canvas');
      f.width = f.height = n;
      const fc = f.getContext('2d');
      fc.translate(n / 2, n / 2);
      faint(fc, i);
      crisp(fc, n);
      c.globalAlpha = alpha;
      c.drawImage(f, 0, 0);
      c.globalAlpha = 1;
    }
    const s = document.createElement('canvas');
    s.width = s.height = n;
    const sc = s.getContext('2d');
    sc.translate(n / 2, n / 2);
    paint(sc, i);
    crisp(sc, n);
    c.drawImage(s, 0, 0);
    const lo = document.createElement('canvas');
    lo.width = lo.height = size;
    lo.hi = hi;
    return lo;
  });
}
const HEADINGS = 16;
const turned = (i) => (i * Math.PI * 2) / HEADINGS;
const tri = (c, pts, col) => {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) c.lineTo(pts[k], pts[k + 1]);
  c.closePath();
  c.fill();
};
const box = (c, x, y, w, h, col) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};
const SHOT = {
  // Twin Dart: a red tracer bolt with a hot head and a fading tail.
  tracer: frames(
    18,
    HEADINGS,
    (c, i) => {
      c.rotate(turned(i));
      box(c, -6, -3, 12, 6, K);
      box(c, -5, -1, 8, 2, '#c8643f');
      box(c, 3, -2, 2, 4, '#ffe6bc');
    },
    (c, i) => {
      c.rotate(turned(i));
      box(c, -13, -1, 8, 2, '#c8643f');
    },
    0.4,
  ),
  // Needle Wing: a long icy needle of light from its rail gun.
  rail: frames(
    20,
    HEADINGS,
    (c, i) => {
      c.rotate(turned(i));
      box(c, -9, -3, 19, 6, K);
      box(c, -8, -1.5, 17, 3, '#9fbedc');
      box(c, -2, -1, 10, 1.5, '#ffffff');
    },
    (c, i) => {
      c.rotate(turned(i));
      box(c, -18, -1, 10, 2, '#bed6ee');
    },
    0.5,
  ),
  // (Shelf Skiff, step 2: a brass arrowhead, nose first.)
  slug: frames(10, HEADINGS, (c, i) => {
    c.rotate(turned(i));
    tri(c, [6, 0, -4, -5, -1, 0, -4, 5], K);
    tri(c, [4, 0, -2, -3, 0, 0, -2, 3], '#e8a845');
    box(c, 2, 0, 2, 1, '#fff1cf');
  }),
  // Wolf Hound: a wobbling glob of red-hot slag.
  slag: frames(8, 2, (c, i) => {
    const w = i;
    c.fillStyle = K;
    c.beginPath();
    c.ellipse(0, 0, 5 + w, 4 - w, 0, 0, 7);
    c.fill();
    c.fillStyle = '#8a3326';
    c.beginPath();
    c.ellipse(0, 0, 4 + w, 3 - w, 0, 0, 7);
    c.fill();
    box(c, -2, -2, 3, 3, '#e2683e');
    box(c, -1, -1, 1, 1, '#ffe6bc');
  }),
  // Flak Star: a round grey flak ball with an orange band and a blinking fuse.
  flak: frames(10, 2, (c, i) => {
    c.fillStyle = K;
    c.beginPath();
    c.arc(0, 0, 4.5, 0, 7);
    c.fill();
    c.fillStyle = '#626871';
    c.beginPath();
    c.arc(0, 0, 3.5, 0, 7);
    c.fill();
    box(c, -2, -3, 2, 1, '#9aa0a8');
    box(c, -3, 0, 7, 1, '#eab25a');
    if (i) box(c, 2, -4, 2, 2, '#ffe6bc');
  }),
  // The Crest Bomber's bomb: jagged spinning triangles of casing, one edge
  // still glowing.
  shard: frames(10, 6, (c, i) => {
    c.rotate((i * Math.PI * 2) / 3 / 6);
    tri(c, [-5, 4, 0, -5, 5, 4], K);
    tri(c, [-3, 3, 0, -3, 3, 3], '#5b5f66');
    box(c, -3, 2, 6, 1, '#f2864e');
  }),
  // (Snow Roller, step 2: a white four-pointed ice crystal.)
  ice: frames(10, 4, (c, i) => {
    c.rotate((i * Math.PI) / 2 / 4);
    box(c, -1.5, -6.5, 3, 13, K);
    box(c, -6.5, -1.5, 13, 3, K);
    box(c, -2.5, -2.5, 5, 5, K);
    box(c, -0.5, -5.5, 1, 11, '#ffffff');
    box(c, -5.5, -0.5, 11, 1, '#ffffff');
    box(c, -1.5, -1.5, 3, 3, '#9fbedc');
    box(c, -0.5, -0.5, 1, 1, '#ffffff');
  }),
};
export const WOLF_SHOT_KINDS = new Set(Object.keys(SHOT));

// Draws one of the Wolves' bullets (Game.draw asks, by its kind).
export function drawWolfShot(ctx, s, snap) {
  const f = SHOT[s.kind];
  let i = 0;
  if (f.length === HEADINGS) i = (Math.round(Math.atan2(s.vy, s.vx) / (Math.PI * 2 / HEADINGS)) + HEADINGS) % HEADINGS;
  else if (s.kind === 'shard') i = Math.floor(s.t * 24) % f.length;
  else if (s.kind === 'ice') i = Math.floor(s.t * 10) % f.length;
  else i = Math.floor(s.t * (s.kind === 'flak' ? 16 : 22)) % 2;
  const img = f[i];
  ctx.drawImage(img, snap(s.x) - img.width / 2, snap(s.y) - img.height / 2);
}

// ---------------------------------------------------------------- helpers
const cx = (e) => e.x + e.w / 2;
const cy = (e) => e.y + e.h / 2;
// Its gun, at its nose (facing left).
const nose = (e, dy = 0) => [e.x + 1, cy(e) + dy];
// Is your ship flying (not exploded, or still gliding back in)?
const alive = (game) => game.state === 'playing' && !(game.player.entering > 0);
const pcx = (game) => game.player.x + game.player.w / 2;
const pcy = (game) => game.player.y + game.player.h / 2;
// Are you in front of its nose (and is it on screen)? It never fires at a
// ship behind it.
const facing = (e, game) => alive(game) && e.x + e.w * 0.08 > pcx(game) + 6 && cx(e) < VIEW_W - 2 && cx(e) > 8;
const aimFrom = ([x, y], game) => Math.atan2(pcy(game) - y, pcx(game) - x);
const fire = (game, [x, y], angle, speed, kind) => game.fireShot(x, y, angle, speed, kind);
const go = (e, mode, timer = 0) => {
  e.mode = mode;
  e.timer = timer;
};
// A dotted aim line from its nose along `angle`.
function aimLine(ctx, e, angle, color) {
  const [x, y] = nose(e);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([1.5, 1.5]);
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3);
  ctx.lineTo(x + Math.cos(angle) * 260, y + Math.sin(angle) * 260);
  ctx.stroke();
  ctx.restore();
}
// The Crest Bomber's target ring (where its bomb will land), with a cross.
function targetRing(ctx, x, y, lit, snap) {
  ctx.fillStyle = lit ? PAL.amberLight : PAL.red;
  for (let i = 0; i < 36; i++) {
    if (i % 3 === 2) continue;
    const a = (i * Math.PI) / 18;
    ctx.fillRect(snap(x + Math.cos(a) * 7) - 0.5, snap(y + Math.sin(a) * 7) - 0.5, 1, 1);
  }
  ctx.fillRect(snap(x) - 3, snap(y) - 0.5, 6, 1);
  ctx.fillRect(snap(x) - 0.5, snap(y) - 3, 1, 6);
}

const NEEDLE_SHOTS = 5; // a Needle Wing's shots before it leaves (owner: was 2)
const BOMB_FALL = 1.1; // seconds a bomb takes to land on its ring

export const WOLF_TYPES = {
  // Twin Dart (pod): comes in pairs, one a little behind and below the
  // other. Each stops, blinks and fires two aimed tracer bolts (only while
  // you're in front of it), then leaves. Carries the White Front's loot
  // gamble (like the Rust Raiders): about one in five carries a power-up or
  // "A" ammo (a third when you're hurt), about 10 items a level.
  wolfDart: {
    sprite: 'wolfDart',
    flies: true, // (kept above the snow)
    onLift(e, d) {
      e.baseY -= d;
    },
    hp: 2,
    score: 30,
    ram: 2,
    dropChance: 0.2,
    hurtDropChance: 0.35,
    ammoLoot: true,
    explodeSize: 0.5,
    gore: { metal: 5 },
    init(e) {
      e.baseY = e.y;
      e.n = 0;
      go(e, 'enter');
    },
    update(e, dt, game) {
      e.y = e.baseY + Math.sin(e.t * 2) * 2;
      if (e.mode === 'enter') {
        e.x -= 48 * dt;
        if (cx(e) <= (e.lane ? 178 : 150)) go(e, 'wait', 0.5 + (e.lane ? 0.65 : 0));
      } else if (e.mode === 'leave') e.x -= 70 * dt;
      else if (e.mode === 'wait') {
        if ((e.timer -= dt) <= 0) go(e, facing(e, game) ? 'warn' : 'leave', 0.45);
      } else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'leave');
        else if ((e.timer -= dt) <= 0) {
          const m = nose(e);
          fire(game, m, aimFrom(m, game), 82, 'tracer');
          e.n++;
          go(e, e.n < 2 ? 'wait' : 'leave', 1.15);
        }
      }
    },
    draw(e, ctx, snap, game) {
      drawWolf(e, ctx, snap, game, false, e.mode === 'warn');
    },
  },

  // Needle Wing (sniper): parks on the right, hovering gently. Its dotted
  // aim line follows you for half a second, then locks (and blinks) for
  // 0.65 s before a fast rail shot along it; 5 shots, 0.85 s apart, then it
  // leaves (owner: stays longer and fires more). It waits while you respawn.
  needleWing: {
    sprite: 'needleWing',
    flies: true,
    onLift(e, d) {
      e.baseY -= d;
    },
    hp: 3,
    score: 50,
    ram: 2,
    dropChance: 0.05,
    explodeSize: 0.6,
    gore: { metal: 6 },
    init(e) {
      e.baseY = e.y;
      e.n = 0;
      e.ang = Math.PI;
      go(e, 'enter');
    },
    update(e, dt, game) {
      if (e.mode !== 'enter' && e.mode !== 'leave') e.y = e.baseY + Math.sin(e.t * 0.9) * 3;
      if (e.mode === 'enter') {
        e.x -= 46 * dt;
        if (cx(e) <= 152) {
          e.baseY = e.y;
          go(e, 'aim', 0.5);
        }
      } else if (e.mode === 'leave') e.x -= 78 * dt;
      else if (e.mode === 'aim') {
        e.ang = aimFrom(nose(e), game);
        if ((e.timer -= dt) <= 0) {
          if (!alive(game)) e.timer = 0.3;
          else go(e, facing(e, game) ? 'warn' : 'leave', 0.65);
        }
      } else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'leave');
        else if ((e.timer -= dt) <= 0) {
          fire(game, nose(e), e.ang, 115, 'rail');
          e.n++;
          go(e, e.n < NEEDLE_SHOTS ? 'aim' : 'leave', 0.85);
        }
      }
    },
    draw(e, ctx, snap, game) {
      if (e.mode === 'aim' && alive(game)) aimLine(ctx, e, e.ang, 'rgba(168,84,74,0.55)');
      if (e.mode === 'warn' && Math.floor(e.timer * 20) % 2 === 0) aimLine(ctx, e, e.ang, PAL.red);
      drawWolf(e, ctx, snap, game, false, e.mode === 'warn');
    },
  },

  // Wake Hunter (seeker): its crescent blades come in, lock on (a dotted
  // line shows the way it will go, for 0.8 s), then it dashes along that
  // line, fast, and flies off. Get out of the line.
  wakeHunter: {
    sprite: 'wakeHunter',
    flies: true,
    liftsOver: (e) => e.mode !== 'dash',
    hp: 3,
    score: 50,
    ram: 2,
    dropChance: 0.05,
    explodeSize: 0.6,
    gore: { metal: 6 },
    init(e) {
      e.ang = Math.PI;
      go(e, 'enter');
    },
    update(e, dt, game) {
      if (e.mode === 'enter') {
        e.x -= 52 * dt;
        if (cx(e) <= 147) {
          e.ang = aimFrom(nose(e), game);
          go(e, 'warn', 0.8);
        }
      } else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'leave');
        else if ((e.timer -= dt) <= 0) {
          e.vx = Math.cos(e.ang) * 145;
          e.vy = Math.sin(e.ang) * 145;
          go(e, 'dash', 0.9);
          sfx.charge(0.3);
        }
      } else if (e.mode === 'dash') {
        e.x += e.vx * dt;
        e.y = clamp(e.y + e.vy * dt, HUD_H + 2, game.terrain.floorY - e.h - 1);
        if ((e.timer -= dt) <= 0) go(e, 'leave');
      } else {
        e.x -= 80 * dt;
        e.y = Math.max(HUD_H + 2, e.y - 30 * dt);
      }
    },
    draw(e, ctx, snap, game) {
      if (e.mode === 'warn' && Math.floor(e.timer * 20) % 2 === 0) aimLine(ctx, e, e.ang, PAL.red);
      drawWolf(e, ctx, snap, game, e.mode === 'dash', e.mode === 'warn');
    },
  },

  // Crest Bomber (gunship): flies in slowly and hovers. A blinking target
  // ring appears where you are (0.8 s), then it drops a bomb that lands
  // exactly on the ring and bursts into 6 jagged shards (1 block if you're
  // on the ring). Two bombs, then it leaves.
  crestBomber: {
    sprite: 'crestBomber',
    flies: true,
    onLift(e, d) {
      e.baseY -= d;
    },
    hp: 5,
    score: 60,
    ram: 2,
    dropChance: 0.1,
    ammoLoot: true,
    explodeSize: 0.8,
    gore: { metal: 8 },
    init(e) {
      e.baseY = e.y;
      e.n = 0;
      go(e, 'enter');
    },
    update(e, dt, game) {
      e.y = e.baseY + Math.sin(e.t) * 1.5;
      if (e.mode === 'enter') {
        e.x -= 38 * dt;
        if (cx(e) <= 150) go(e, 'wait', 0.4);
      } else if (e.mode === 'leave') e.x -= 52 * dt;
      else if (e.mode === 'wait') {
        if ((e.timer -= dt) <= 0) {
          if (!facing(e, game)) go(e, 'leave');
          else {
            e.tx = clamp(pcx(game), 12, 185);
            e.ty = Math.max(e.y + e.h + 8, Math.min(game.terrain.floorY - 8, pcy(game)));
            go(e, 'warn', 0.8);
          }
        }
      } else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'leave');
        else if ((e.timer -= dt) <= 0) {
          const bomb = SPRITES.wolfBomb;
          const sx = cx(e);
          const sy = e.y + e.h;
          game.spawnEnemy('wolfBomb', sx - bomb.width / 2, sy - bomb.height / 2, { sx, sy, tx: e.tx, ty: e.ty });
          e.n++;
          go(e, e.n < 2 ? 'wait' : 'leave', 1.4);
        }
      }
    },
    draw(e, ctx, snap, game) {
      if (e.mode === 'warn') targetRing(ctx, e.tx, e.ty, Math.floor(e.t * 8) % 2 === 0, snap);
      drawWolf(e, ctx, snap, game, false, e.mode === 'warn');
    },
  },

  // The Crest Bomber's bomb: falls onto its ring (1.1 s) and bursts into 6
  // shards; it bursts early if it touches you. You can shoot it down.
  wolfBomb: {
    sprite: 'wolfBomb',
    hp: 1,
    score: 10,
    harmless: true, // it hurts by bursting, not by ramming
    noDrop: true,
    noTarget: true, // (rockets don't chase it)
    explodeSize: 0.3,
    gore: { metal: 2 },
    init() {},
    update(e, dt, game) {
      const k = Math.min(1, e.t / BOMB_FALL);
      e.x = e.sx + (e.tx - e.sx) * k - e.w / 2;
      e.y = e.sy + (e.ty - e.sy) * k * k - e.h / 2;
      const live = game.playerVulnerable();
      const touching = live && game.touchesPlayer(e.x, e.y, e.w, e.h);
      if (k < 1 && !touching) return;
      const bx = touching ? cx(e) : e.tx;
      const by = touching ? cy(e) : e.ty;
      e.dead = true;
      game.blasts.blast(bx, by, 0.5);
      game.burst(bx, by, 8, 60);
      sfx.explode(0.4);
      if (touching || (live && Math.hypot(pcx(game) - bx, pcy(game) - by) < 9)) game.hurtPlayer(1, e);
      for (let i = 0; i < 6; i++) game.fireShot(bx, by, (i * Math.PI) / 3, 58, 'shard');
    },
    draw(e, ctx, snap, game) {
      targetRing(ctx, e.tx, e.ty, Math.floor(e.t * 8) % 2 === 0, snap);
      drawWolf(e, ctx, snap, game, Math.floor(e.t * 10) % 2 === 0);
    },
  },

  // Wolf Hound (weaver): a wolf's-head drone flying in packs in a deep
  // weave. Some drop their jaw (0.4 s warning) and spit one glob of red-hot
  // slag at you.
  wolfHound: {
    sprite: 'wolfHound',
    flies: true,
    onLift(e, d) {
      e.baseY -= d;
    },
    hp: 2,
    score: 20,
    ram: 2,
    explodeSize: 0.5,
    gore: { metal: 5 },
    init(e) {
      e.baseY = e.y;
      e.n = 0;
      e.ph = e.ph || 0;
      go(e, 'enter');
    },
    update(e, dt, game) {
      e.x -= 44 * dt;
      e.y = e.baseY + Math.sin(e.t * 2.8 + e.ph) * 16;
      if (e.mode === 'enter' && e.spitAt !== undefined && e.t > e.spitAt && !e.n && facing(e, game)) go(e, 'warn', 0.4);
      else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'fly');
        else if ((e.timer -= dt) <= 0) {
          const m = nose(e, 1);
          fire(game, m, aimFrom(m, game), 62, 'slag');
          e.n = 1;
          go(e, 'fly');
        }
      }
    },
    draw(e, ctx, snap, game) {
      drawWolf(e, ctx, snap, game, false, e.mode === 'warn');
    },
  },

  // Flak Star (spinner): an armoured octagon with a gun on each corner,
  // turning as it hovers. Its lamps blink, then it fires 8 flak balls all
  // round (each burst turned a little from the last); 3 bursts, then it
  // leaves.
  flakStar: {
    sprite: 'flakStar',
    flies: true,
    hp: 5,
    score: 80,
    ram: 2,
    dropChance: 0.1,
    explodeSize: 0.8,
    gore: { metal: 8 },
    init(e) {
      e.n = 0;
      e.rot = 0;
      go(e, 'enter');
    },
    update(e, dt, game) {
      e.rot += dt * 2.2;
      if (e.mode === 'enter') {
        e.x += (150 - cx(e)) * Math.min(1, dt * 1.5) - 3 * dt;
        if (cx(e) < 156) go(e, 'wait', 0.6);
      } else if (e.mode === 'leave') e.x -= 40 * dt;
      else if (e.mode === 'wait') {
        if ((e.timer -= dt) <= 0) go(e, 'warn', 0.45);
      } else if (e.mode === 'warn') {
        if ((e.timer -= dt) <= 0) {
          const off = (e.n * Math.PI) / 8;
          for (let k = 0; k < 8; k++) fire(game, [cx(e), cy(e)], off + (k * Math.PI) / 4, 52, 'flak');
          e.n++;
          go(e, e.n < 3 ? 'wait' : 'leave', 1.65);
        }
      }
    },
    draw(e, ctx, snap, game) {
      const on = e.mode === 'warn' && Math.floor(game.time * 10) % 2 === 0;
      const spr = SPRITES['flakStar' + (on ? 'Open' : '') + (e.flash > 0 ? 'Flash' : '')];
      ctx.save();
      ctx.translate(snap(cx(e)), snap(cy(e)));
      ctx.rotate(e.rot);
      ctx.drawImage(spr, -e.w / 2, -e.h / 2);
      ctx.restore();
    },
  },
};

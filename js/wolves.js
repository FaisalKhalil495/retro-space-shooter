import { VIEW_W, HUD_H, PAL } from './config.js?v=0.35.0';
import { SPRITES, HI_NAMES } from './sprites.js?v=0.35.0';
import { WOLF_ART, WOLF_PAL } from './wolfart.js?v=0.35.0';
import { clamp } from './util.js?v=0.35.0';
import { sfx } from './audio.js?v=0.35.0';
import { GROUND_SPEED } from './terrain.js?v=0.35.0';

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
// The Rocket Sled's rocket: a gunmetal body with an orange band and a
// flame, turned to 16 headings (it climbs, then falls nose down).
const ROCKET = frames(14, HEADINGS, (c, i) => {
  c.rotate(turned(i));
  box(c, -7, -3, 14, 6, K);
  box(c, -6, -1.5, 11, 3, '#7f899c');
  box(c, -6, -1.5, 11, 1, '#a9b1bf');
  box(c, 3, -1.5, 2, 3, '#eab25a');
  box(c, -10, -1.5, 3, 3, '#ffe6bc');
  box(c, -13, -1, 3, 2, '#f2864e');
});
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
// A ring's dots, worked out once.
const RING_COS = Array.from({ length: 36 }, (_, i) => Math.cos((i * Math.PI) / 18));
const RING_SIN = Array.from({ length: 36 }, (_, i) => Math.sin((i * Math.PI) / 18));

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
  ctx.beginPath(); // (the whole ring in one go)
  for (let i = 0; i < 36; i++) {
    if (i % 3 === 2) continue;
    ctx.rect(snap(x + RING_COS[i] * 7) - 0.5, snap(y + RING_SIN[i] * 7) - 0.5, 1, 1);
  }
  ctx.rect(snap(x) - 3, snap(y) - 0.5, 6, 1);
  ctx.rect(snap(x) - 0.5, snap(y) - 3, 1, 6);
  ctx.fill();
}

const NEEDLE_SHOTS = 5; // a Needle Wing's shots before it leaves (owner: was 2)
const BOMB_FALL = 1.1; // seconds a bomb takes to land on its ring
// The Rocket Sled's rockets: gravity going up, gravity coming down (a little
// gentler), how high the arc peaks (above the screen), seconds between rockets.
const ROCKET_G = 480;
const ROCKET_FALL = 380;
const ROCKET_TOP = -26;
const ROCKET_GAP = 0.15;
const TRAIL = 16; // smoke puffs a rocket leaves (0.5 s of them)
const ROCKET_BURST = 9; // a rocket bursting on the snow hurts within this many pixels
const CHARGE_LIFE = 1.5; // seconds a Snow Roller's charge rolls before it bursts
const CHARGE_WARN = 0.65; // ...the last of them blinking its warning ring

// Ground Wolves stand on the snow (sunk a pixel into it) and scroll with it.
const onSnow = (e, game) => {
  e.y = game.terrain.floorY - e.h + 1;
};
// A soft blue shadow on the snow under a ground Wolf.
function shadow(ctx, e, game, snap) {
  const y = game.terrain.floorY;
  ctx.fillStyle = 'rgba(40,70,115,0.28)';
  ctx.fillRect(snap(e.x - 1), y - 0.5, e.w + 2, 1);
  ctx.fillRect(snap(e.x + 2), y + 0.5, e.w - 4, 0.5);
}
// A ring of dots with a cross (where something will burst).
export function burstRing(ctx, x, y, r, ry, lit, snap) {
  ctx.fillStyle = lit ? PAL.amberLight : PAL.red;
  ctx.beginPath(); // (the whole ring in one go)
  for (let i = 0; i < 36; i++) {
    if (i % 3 === 2) continue;
    ctx.rect(snap(x + RING_COS[i] * r) - 0.5, snap(y + RING_SIN[i] * ry) - 0.5, 1, 1);
  }
  ctx.rect(snap(x) - 2.5, snap(y) - 0.5, 5, 1);
  ctx.fill();
}

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
    hp: 3,
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
        if (cx(e) <= (e.lane ? 178 : 150)) go(e, 'wait', 0.3 + (e.lane ? 0.65 : 0));
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
    hp: 4,
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
      // (a gentle hover while it holds its spot, starting from where it parked)
      if (e.mode !== 'enter' && e.mode !== 'leave') e.y = e.baseY + Math.sin((e.t - e.parked) * 0.9) * 3;
      if (e.mode === 'enter') {
        e.x -= 46 * dt;
        if (cx(e) <= 152) {
          e.baseY = e.y;
          e.parked = e.t;
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
    hp: 6,
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
    hp: 6,
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
  // ---- Ground Wolves (step 2) ----

  // Shelf Skiff: a sled racing in along the snow. It brakes, blinks (0.6 s)
  // and fires 3 brass arrowheads in a spread at you; twice, then it races
  // off. It never fires at a ship behind it, and leaves once you're past.
  shelfSkiff: {
    sprite: 'shelfSkiff',
    hp: 5,
    score: 40,
    ram: 2,
    dropChance: 0.05,
    explodeSize: 0.6,
    gore: { metal: 6 },
    init(e, game) {
      e.n = 0;
      onSnow(e, game);
      go(e, 'enter');
    },
    update(e, dt, game) {
      onSnow(e, game);
      e.x -= (e.mode === 'enter' ? 52 : e.mode === 'leave' ? 65 : GROUND_SPEED) * dt;
      if (e.mode === 'enter') {
        if (cx(e) <= 150) go(e, 'brake', 0.35);
      } else if (e.mode === 'brake') {
        if ((e.timer -= dt) <= 0 && facing(e, game)) go(e, 'warn', 0.6);
      } else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'leave');
        else if ((e.timer -= dt) <= 0) {
          const m = nose(e, -1);
          const a = aimFrom(m, game);
          for (const d of [-0.17, 0, 0.17]) fire(game, m, a + d, 72, 'slug');
          e.n++;
          go(e, e.n < 2 ? 'brake' : 'leave', 1.2);
        }
      }
      if (e.mode !== 'enter' && e.mode !== 'leave' && cx(e) < pcx(game) + 12) go(e, 'leave');
    },
    draw(e, ctx, snap, game) {
      shadow(ctx, e, game, snap);
      drawWolf(e, ctx, snap, game, false, e.mode === 'warn');
    },
  },

  // Snow Roller: a big snow-crusted drum wheel. It rolls in, blinks (0.8 s)
  // and sends a charge rolling along the snow at you, which bursts into 5
  // white ice crystals fanning upwards; twice, then it rolls off.
  snowRoller: {
    sprite: 'snowRoller',
    hp: 5,
    score: 60,
    ram: 2,
    dropChance: 0.08,
    explodeSize: 0.8,
    gore: { metal: 8 },
    init(e, game) {
      e.n = 0;
      onSnow(e, game);
      go(e, 'enter');
    },
    update(e, dt, game) {
      onSnow(e, game);
      e.x -= (e.mode === 'enter' ? 42 : e.mode === 'leave' ? 45 : GROUND_SPEED) * dt;
      if (e.mode === 'enter') {
        if (cx(e) <= 150) go(e, 'wait', 0.35);
      } else if (e.mode === 'wait') {
        if ((e.timer -= dt) <= 0 && facing(e, game)) go(e, 'warn', 0.8);
      } else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'leave');
        else if ((e.timer -= dt) <= 0) {
          game.spawnEnemy('wolfCharge', e.x - 5, 0);
          sfx.charge(0.15);
          e.n++;
          go(e, e.n < 2 ? 'wait' : 'leave', 1.65);
        }
      }
      if (e.mode !== 'enter' && e.mode !== 'leave' && cx(e) < pcx(game) + 12) go(e, 'leave');
    },
    draw(e, ctx, snap, game) {
      shadow(ctx, e, game, snap);
      drawWolf(e, ctx, snap, game, false, e.mode === 'warn');
    },
  },

  // The Snow Roller's charge: rolls along the snow towards you (1.5 s),
  // blinking a warning ring for its last 0.65 s, then bursts into 5 ice
  // crystals fanning upwards. Touch it and it bursts at once (1 block);
  // shoot it and it breaks harmlessly.
  wolfCharge: {
    sprite: 'wolfCharge',
    hp: 1,
    score: 10,
    harmless: true, // it hurts by bursting, not by ramming
    noDrop: true,
    noTarget: true, // (rockets don't chase it)
    explodeSize: 0.3,
    gore: { metal: 2 },
    init(e, game) {
      e.rot = 0;
      onSnow(e, game);
    },
    update(e, dt, game) {
      onSnow(e, game);
      e.x -= 54 * dt;
      e.rot -= dt * 7;
      const live = game.playerVulnerable();
      const touching = live && game.touchesPlayer(e.x, e.y, e.w, e.h);
      if (e.t < CHARGE_LIFE && !touching) return;
      e.dead = true;
      game.blasts.blast(cx(e), cy(e), 0.45);
      sfx.explode(0.35);
      if (touching) game.hurtPlayer(1, e);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI + 0.25 + (i * (Math.PI - 0.5)) / 4;
        game.fireShot(cx(e), cy(e) - 2, a, 62, 'ice');
      }
    },
    draw(e, ctx, snap, game) {
      const warn = e.t >= CHARGE_LIFE - CHARGE_WARN;
      if (warn) burstRing(ctx, cx(e), cy(e) - 1, 7, 7, Math.floor(e.t * 10) % 2 === 0, snap);
      const spr = SPRITES['wolfCharge' + (warn && Math.floor(e.t * 10) % 2 === 0 ? 'Open' : '') + (e.flash > 0 ? 'Flash' : '')];
      ctx.save();
      ctx.translate(snap(cx(e)), snap(cy(e)));
      ctx.rotate(e.rot);
      ctx.drawImage(spr, -e.w / 2, -e.h / 2);
      ctx.restore();
    },
  },

  // Rocket Sled (the artillery; owner's pick, made more aggressive after
  // their test): slides in and holds its spot, driving against the scroll.
  // Its tubes glow (0.5 s), then a ripple of 5 rockets leaves the launcher,
  // fast and steeply up to a peak above the screen, each over its own
  // column, then drops straight down the whole column to the snow. Each
  // column shows as a dotted red line from the sky to a ring on the snow
  // until its rocket lands: where you're heading, where you are, 20 px
  // either side of you and further ahead. 3 salvos, then it leaves; it
  // waits while you respawn.
  rocketSled: {
    sprite: 'rocketSled',
    hp: 6,
    score: 60,
    ram: 2,
    dropChance: 0.1,
    explodeSize: 0.9,
    gore: { metal: 9 },
    init(e, game) {
      e.n = 0;
      e.k = 0;
      e.pvx = 0;
      onSnow(e, game);
      go(e, 'enter');
    },
    update(e, dt, game) {
      onSnow(e, game);
      // (how fast you're moving sideways, smoothed: where you're heading)
      const px = pcx(game);
      if (e.lpx !== undefined && dt > 0) e.pvx = e.pvx * 0.85 + ((px - e.lpx) / dt) * 0.15;
      e.lpx = px;
      e.x -= (e.mode === 'enter' ? 55 : e.mode === 'leave' ? 60 : 5) * dt;
      if (e.mode === 'enter') {
        if (cx(e) <= 174) go(e, 'warn', 0.5);
      } else if ((e.mode === 'reload' || e.mode === 'warn') && !alive(game)) {
        e.timer = Math.max(e.timer, 0.45); // waits for you to come back
      } else if (e.mode === 'reload') {
        if ((e.timer -= dt) <= 0) go(e, facing(e, game) ? 'warn' : 'leave', 0.5);
      } else if (e.mode === 'warn') {
        if (!facing(e, game)) go(e, 'leave');
        else if ((e.timer -= dt) <= 0) {
          const lx = px + e.pvx * 1.2;
          e.cols = [lx, px, px - 20, px + 20, lx + 38].map((x) => clamp(x, 8, 200));
          e.k = 0;
          go(e, 'fire', 0);
        }
      } else if (e.mode === 'fire') {
        if ((e.timer -= dt) <= 0) {
          const mx = e.x + 7;
          const my = e.y + 1;
          game.spawnEnemy('wolfRocket', mx - 7, my - 7, { mx, my, tx: e.cols[e.k] });
          game.blasts.blast(mx, my - 1, 0.15);
          sfx.rocket();
          e.timer = ROCKET_GAP;
          e.k++;
          if (e.k >= e.cols.length) {
            e.n++;
            go(e, e.n < 3 ? 'reload' : 'leave', 1.8);
          }
        }
      }
      if (e.mode !== 'enter' && e.mode !== 'leave' && e.mode !== 'fire' && cx(e) < pcx(game) + 12) go(e, 'leave');
    },
    draw(e, ctx, snap, game) {
      shadow(ctx, e, game, snap);
      drawWolf(e, ctx, snap, game, e.mode === 'fire', e.mode === 'warn');
    },
  },

  // One of the Rocket Sled's rockets, with its column warning. Out of reach
  // (it can't be shot down), and it hurts only on the way down: anything in
  // its column, or within 9 px of where it bursts on the snow (2 blocks).
  wolfRocket: {
    hp: 1,
    score: 0,
    harmless: true,
    noDrop: true,
    noTarget: true,
    hitTest: () => null,
    shotTest: () => null,
    init(e, game) {
      e.w = 14;
      e.h = 14;
      e.under = true; // (out of reach of your shots and specials)
      e.x0 = e.mx;
      e.gy = game.terrain.floorY - 1;
      e.up = Math.sqrt((2 * (e.my - ROCKET_TOP)) / ROCKET_G);
      e.down = Math.sqrt((2 * (e.gy - ROCKET_TOP)) / ROCKET_FALL);
      e.rx = e.mx;
      e.ry = e.my;
      e.vx = (e.tx - e.mx) / e.up;
      e.vy = -ROCKET_G * e.up;
      e.trail = new Float32Array(TRAIL * 3); // x, y, age of its smoke puffs (a ring of slots)
      e.trail.fill(-1);
      e.slot = 0;
      e.puff = 0;
    },
    update(e, dt, game) {
      if (e.t < e.up) {
        e.vy += ROCKET_G * dt;
        e.rx += e.vx * dt;
        e.ry += e.vy * dt;
      } else {
        e.rx = e.tx;
        e.vx = 0;
        e.vy += ROCKET_FALL * dt;
        e.ry += e.vy * dt;
      }
      e.x = e.rx - 7;
      e.y = e.ry - 7;
      const tr = e.trail;
      for (let k = 2; k < tr.length; k += 3) if (tr[k] >= 0) tr[k] += dt;
      if ((e.puff -= dt) <= 0) {
        e.puff = 0.03;
        tr[e.slot * 3] = e.rx;
        tr[e.slot * 3 + 1] = e.ry;
        tr[e.slot * 3 + 2] = 0;
        e.slot = (e.slot + 1) % TRAIL;
      }
      const live = game.playerVulnerable();
      const falling = e.t >= e.up && e.ry > HUD_H;
      if (falling && live && game.touchesPlayer(e.rx - 1.5, e.ry - 4, 3, 7)) {
        e.dead = true;
        game.blasts.blast(e.rx, e.ry, 0.9);
        sfx.explode(0.6);
        game.hurtPlayer(2, e);
      } else if (e.ry >= e.gy) {
        e.dead = true;
        game.blasts.blast(e.rx, e.gy, 0.9);
        game.burst(e.rx, e.gy - 1, 10, 60, game.terrain.dust || undefined);
        sfx.explode(0.6);
        if (live && Math.hypot(pcx(game) - e.rx, pcy(game) - e.gy) < ROCKET_BURST) game.hurtPlayer(2, e);
      }
    },
    draw(e, ctx, snap, game) {
      // The column: a dotted line from the sky to the snow, brightening and
      // blinking as its rocket comes, and a ring on the snow as wide as the
      // burst.
      const f = Math.min(1, e.t / (e.up + e.down));
      const lit = f > 0.6 && Math.floor(e.t * 12) % 2 === 0;
      const x = snap(e.tx);
      ctx.fillStyle = lit ? '#e8a060' : f > 0.6 ? '#c8643f' : 'rgba(200,100,63,0.65)';
      ctx.beginPath();
      for (let y = HUD_H + 1; y < e.gy - 3; y += 3) ctx.rect(x - 0.5, y, 1, 1.5);
      ctx.fill();
      burstRing(ctx, e.tx, e.gy, ROCKET_BURST + 6 * (1 - f), 2 + 2 * (1 - f), lit, snap);
      // Its smoke trail, then the rocket itself.
      ctx.fillStyle = 'rgba(120,124,134,0.5)';
      ctx.beginPath();
      const tr = e.trail;
      for (let k = 0; k < tr.length; k += 3) {
        const age = tr[k + 2];
        if (age < 0 || age > 0.5) continue;
        const r = snap(0.5 + age * 2) || 0.5;
        ctx.rect(snap(tr[k] - r / 2), snap(tr[k + 1] - r / 2), r, r);
      }
      ctx.fill();
      const i = (Math.round(Math.atan2(e.vy, e.vx) / ((Math.PI * 2) / HEADINGS)) + HEADINGS) % HEADINGS;
      ctx.drawImage(ROCKET[i], snap(e.rx) - 7, snap(e.ry) - 7);
    },
  },
};

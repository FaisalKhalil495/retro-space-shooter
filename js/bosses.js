import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.10.2';
import { ROCKJAW } from './rockart.js?v=0.10.2';
import { sfx } from './audio.js?v=0.10.2';
import { clamp, rectHitsCircle, rectsOverlap } from './util.js?v=0.10.2';
import { FLESH, MOLTEN, ROCK, TOOTH } from './gore.js?v=0.10.2';

// ROCKJAW · THE LIVING ASTEROID — boss of The Outer Belt.
//
// His rocky hide shrugs off every shot; only his open mouth can be hurt.
// He never sits still and never simply lines up with you: standing in front
// of his mouth is the most dangerous place on screen.
//
// Phase 1 (100–66%): Bite Charge, Rock Burst.
// Phase 2 (66–33%), Cracked: + Double Charge, Gravel Sweep, Meteor Call,
//   Fake-out. His eye gets shot out when this phase starts.
// Phase 3 (33–0%), Enraged: + Inhale (sucks you in), Rolling Fury.
// Every attack has a wind-up: a shudder, a growl, a flashing eye or a warning
// marker, so a careful player can always react.

const R = ROCKJAW.radius;
const MID_Y = (HUD_H + VIEW_H) / 2;
const HOME_X = VIEW_W - 46;
const SPEED = [0, 1, 1.18, 1.38];
const IDLE = [0, 1.25, 0.85, 0.6];
const SUPPLY_EVERY = 20; // seconds between smart supply pods during the fight
const MOVESETS = [
  null,
  ['charge', 'spit', 'charge', 'spit'],
  ['charge2', 'spit', 'gravel', 'meteors', 'fakeout'],
  ['inhale', 'roll', 'charge2', 'gravel', 'fakeout', 'spit', 'meteors'],
];

const center = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
const mouth = (e) => ({ x: e.x + e.w / 2 - R * 0.85, y: e.y + e.h / 2 });

function setCenter(e, x, y) {
  e.x = x - e.w / 2;
  e.y = y - e.h / 2;
}

function moveToward(e, tx, ty, speed, dt) {
  const c = center(e);
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) return true;
  const s = Math.min(d, speed * dt);
  setCenter(e, c.x + (dx / d) * s, c.y + (dy / d) * s);
  return d < 1.5;
}

// Wandering loop on the right of the screen. Deliberately NOT following you.
function wander(e, dt, k = 1) {
  e.pathT += dt * SPEED[e.phase];
  const tx = HOME_X + Math.sin(e.pathT * 0.8) * 12;
  const ty = MID_Y + Math.sin(e.pathT * 1.3) * 40;
  moveToward(e, tx, ty, 48 * SPEED[e.phase] * k, dt);
}

function playerCenter(g) {
  const p = g.player;
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

function shut(e, dt, speed = 5) {
  e.jaw = Math.max(0, e.jaw - dt * speed);
}

// ---------------------------------------------------------------- attacks
// Each returns true when finished. a.t is the time since the attack began.
const ATTACKS = {
  // Pulls back, locks on to your height, then rams across the whole screen
  // with his jaws open and slams them shut on the far side.
  charge(e, a, dt, g) {
    const wind = a.fast ? 0.32 : [0, 0.8, 0.6, 0.45][e.phase];
    const c = center(e);
    if (!a.stage) {
      a.stage = 'wind';
      sfx.growl();
    }
    if (a.stage === 'wind') {
      e.wobble = 1.5;
      e.eyeFlash = 1;
      shut(e, dt);
      moveToward(e, VIEW_W - R + 10, playerCenter(g).y, 130, dt);
      if (a.t >= wind) {
        a.stage = 'dash';
        a.y = c.y;
        sfx.roar();
      }
    } else if (a.stage === 'dash') {
      e.jaw = Math.min(1, e.jaw + dt * 9);
      setCenter(e, c.x - 255 * SPEED[e.phase] * dt, a.y);
      g.shake = Math.max(g.shake, 1.5);
      if (c.x <= R - 6) {
        a.stage = 'bite';
        a.bite = a.t;
        e.jaw = 0;
        sfx.snap();
        g.shake = Math.max(g.shake, 4);
        const pc = playerCenter(g);
        const m = mouth(e);
        if (Math.hypot(pc.x - m.x, pc.y - m.y) < 30) g.gore.smear(m.x + 20, m.y, 1.1);
      }
    } else if (a.stage === 'bite') {
      e.wobble = 1;
      if (a.t - a.bite > 0.32) a.stage = 'back';
    } else if (a.stage === 'back') {
      if (moveToward(e, HOME_X, c.y, 120 * SPEED[e.phase], dt)) {
        if (a.count > 1) {
          e.queued = { name: 'charge', count: a.count - 1, fast: true };
        }
        return true;
      }
    }
    return false;
  },

  charge2(e, a, dt, g) {
    a.count = a.count || 2;
    return ATTACKS.charge(e, a, dt, g);
  },

  // Opens up and spits a fan of rocks; every other one bursts into shards.
  spit(e, a, dt, g) {
    if (!a.started) {
      a.started = true;
      sfx.rumble();
    }
    wander(e, dt, 0.35);
    const volleys = e.phase === 1 ? [0.55] : [0.55, 1.1];
    if (a.t < 0.45) {
      e.jaw = a.t / 0.45;
      e.wobble = 1;
    } else if (a.t < 1.55) {
      e.jaw = 1;
    } else {
      shut(e, dt, 4);
    }
    a.v = a.v || 0;
    if (a.v < volleys.length && a.t >= volleys[a.v]) {
      a.v++;
      const m = mouth(e);
      const pc = playerCenter(g);
      const base = Math.atan2(pc.y - m.y, pc.x - m.x);
      const n = e.phase === 1 ? 5 : 7;
      const spread = 1.05;
      for (let i = 0; i < n; i++) {
        const ang = base + (i / (n - 1) - 0.5) * spread + (a.v === 2 ? spread / (n - 1) / 2 : 0);
        const sp = 84 * Math.sqrt(SPEED[e.phase]);
        g.spawnEnemy('rockSpit', m.x - 5, m.y - 5, {
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          splitAt: i % 2 === 1 ? 0.5 + g.rand() * 0.25 : 0,
          byBoss: true,
        });
      }
      sfx.explode(0.5);
      g.shake = Math.max(g.shake, 2);
    }
    return a.t > 1.8;
  },

  // A stream of gravel sweeping top to bottom, with one gap to slip through.
  gravel(e, a, dt, g) {
    const sweeps = e.phase === 3 ? 2 : 1;
    const dur = 1.55;
    if (!a.started) {
      a.started = true;
      a.gaps = [0.2 + g.rand() * 0.6, 0.2 + g.rand() * 0.6];
      a.emit = 0;
      sfx.rumble();
    }
    wander(e, dt, 0.25);
    const open = 0.4;
    if (a.t < open) {
      e.jaw = a.t / open;
      e.wobble = 1;
      return false;
    }
    const st = a.t - open;
    const sweep = Math.floor(st / dur);
    if (sweep >= sweeps) {
      shut(e, dt, 4);
      return st > sweeps * dur + 0.35;
    }
    e.jaw = 1;
    let f = (st % dur) / dur;
    if (sweep === 1) f = 1 - f;
    a.emit -= dt;
    if (a.emit <= 0) {
      a.emit = 0.042;
      const gap = a.gaps[sweep];
      if (f < gap || f > gap + 0.15) {
        const m = mouth(e);
        const ang = Math.PI + (f - 0.5) * 1.9;
        g.fireShot(m.x, m.y, ang, 92 * Math.sqrt(SPEED[e.phase]), 'gravel', true);
      }
    }
    return false;
  },

  // Roars and calls down a rain of meteors, each marked a moment before.
  meteors(e, a, dt, g) {
    const n = e.phase === 3 ? 12 : 9;
    if (!a.started) {
      a.started = true;
      sfx.roar();
      g.shake = Math.max(g.shake, 5);
      for (let i = 0; i < n; i++) {
        const when = 0.5 + (i * 2.6) / n;
        const x = 34 + g.rand() * (VIEW_W - 60);
        const big = i % 3 === 0;
        g.later(when, () => g.warn(x, HUD_H + 3, 0.75));
        g.later(when + 0.75, () => {
          if (g.boss !== e || e.mode === 'dying') return;
          g.spawnEnemy(big ? 'rockBig' : 'rockSmall', x - 6, -16, {
            vx: -22 - g.rand() * 14,
            vy: 78 + g.rand() * 22,
            fall: true,
            byBoss: true,
          });
        });
      }
    }
    if (a.t < 0.9) {
      e.jaw = Math.min(1, a.t * 4);
      e.wobble = 2;
    } else {
      shut(e, dt);
      wander(e, dt);
    }
    return a.t > 3.9;
  },

  // Opens wide and inhales, dragging your ship towards his mouth, then
  // slams shut. Steer away hard!
  inhale(e, a, dt, g) {
    const dur = 3.1;
    if (!a.started) {
      a.started = true;
      sfx.inhale(dur + 0.3);
    }
    moveToward(e, HOME_X + 6, MID_Y, 30, dt);
    if (a.t < 0.45) {
      e.jaw = a.t / 0.45;
      e.wobble = 1;
      return false;
    }
    if (a.t < 0.45 + dur) {
      e.jaw = 1;
      e.wobble = 0.5;
      const m = mouth(e);
      const p = g.player;
      if (g.state === 'playing' && p.entering <= 0) {
        const pc = playerCenter(g);
        const dx = m.x - pc.x;
        const dy = m.y - pc.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = 60 * Math.min(1, (a.t - 0.45) * 2);
        p.x = clamp(p.x + (dx / d) * pull * dt, 2, VIEW_W - p.w - 2);
        p.y = clamp(p.y + (dy / d) * pull * dt, HUD_H + 1, VIEW_H - p.h - 1);
      }
      // Dust and debris streaming into his mouth.
      for (let i = 0; i < 2; i++) {
        const sx = g.rand() * VIEW_W * 0.7;
        const sy = HUD_H + g.rand() * (VIEW_H - HUD_H);
        const d = Math.hypot(m.x - sx, m.y - sy) || 1;
        g.particles.push({
          x: sx, y: sy, vx: ((m.x - sx) / d) * 140, vy: ((m.y - sy) / d) * 140,
          life: d / 140, max: d / 140, color: g.rand() < 0.5 ? '#6d6a73' : '#4d3f45', size: 1, noDrag: true,
        });
      }
      return false;
    }
    if (!a.snapped) {
      a.snapped = true;
      e.jaw = 0;
      sfx.snap();
      g.shake = Math.max(g.shake, 5);
    }
    return a.t > dur + 0.85;
  },

  // Curls up and rolls around the edges of the screen, spraying rocks inwards.
  roll(e, a, dt, g) {
    const top = HUD_H + R - 9;
    const bottom = VIEW_H - R + 9;
    if (!a.path) {
      a.path = [
        [VIEW_W - R + 4, top],
        [R - 4, top],
        [R - 4, bottom],
        [VIEW_W - R + 4, bottom],
        [HOME_X, MID_Y],
      ];
      a.i = 0;
      a.fire = 0.5;
      sfx.growl();
    }
    shut(e, dt, 8);
    if (a.t < 0.6) {
      e.wobble = 2;
      e.angle = Math.sin(a.t * 30) * 0.08;
      return false;
    }
    const before = center(e);
    const [tx, ty] = a.path[a.i];
    if (moveToward(e, tx, ty, 150 * SPEED[e.phase] * 0.8, dt)) a.i++;
    const after = center(e);
    e.angle -= Math.hypot(after.x - before.x, after.y - before.y) / R;
    g.shake = Math.max(g.shake, 1);
    a.fire -= dt;
    if (a.fire <= 0 && a.i < a.path.length - 1) {
      a.fire = 0.28;
      const pc = playerCenter(g);
      const ang = Math.atan2(pc.y - after.y, pc.x - after.x) + (g.rand() - 0.5) * 0.5;
      g.fireShot(after.x + Math.cos(ang) * R, after.y + Math.sin(ang) * R, ang, 78, 'gravel', true);
    }
    if (a.i >= a.path.length) {
      e.angle = 0;
      return true;
    }
    return false;
  },

  // Looks exactly like a Rock Burst... then snaps shut early and charges.
  fakeout(e, a, dt) {
    if (!a.started) {
      a.started = true;
      sfx.rumble();
    }
    wander(e, dt, 0.3);
    if (a.t < 0.45) {
      e.jaw = a.t / 0.45;
      e.wobble = 1;
    } else if (a.t < 0.72) {
      e.jaw = 1;
    } else if (!a.snapped) {
      a.snapped = true;
      e.jaw = 0;
      sfx.snap();
      e.queued = { name: 'charge', fast: true };
      return true;
    }
    return false;
  },
};

// ---------------------------------------------------------------- the boss
export const ROCKJAW_TYPE = {
  boss: true,
  name: 'ROCKJAW',
  title: 'THE LIVING ASTEROID',
  taunt: 'YOU ARE FUCKING DINNER',
  // Said in his speech bubble when he kills you (and shown on Game Over).
  killLines: [
    'I FUCKING ATE YOU',
    'CHEWED UP AND SPAT OUT',
    'PICKING YOU OUT OF MY TEETH',
    'BITTEN IN FUCKING HALF',
  ],
  hp: 200,
  score: 5000,
  explodeSize: 2,

  init(e) {
    e.w = ROCKJAW.frames[0][0].width;
    e.h = ROCKJAW.frames[0][0].height;
    setCenter(e, VIEW_W + R + 30, MID_Y);
    e.mode = 'enter';
    e.timer = 0;
    e.jaw = 0;
    e.phase = 1;
    e.angle = 0;
    e.wobble = 0;
    e.eyeFlash = 0;
    e.pathT = 0;
    e.attack = null;
    e.last = null;
    e.queued = null;
    e.idle = 1;
    e.toothDmg = 0;
    e.supplyT = Infinity;
  },

  update(e, dt, g) {
    e.timer += dt;
    e.wobble = 0;
    e.eyeFlash = 0;
    const set = (mode) => {
      e.mode = mode;
      e.timer = 0;
    };

    // Supply pods: one every 20 seconds of fighting, taking turns between
    // survival and weapon pods (see Game.nextSupplyKind). What's inside is
    // decided when you shoot it open.
    if (e.mode === 'fight' || e.mode === 'transition') {
      e.supplyT -= dt;
      if (e.supplyT <= 0) {
        e.supplyT = SUPPLY_EVERY;
        supplyPod(e, g);
      }
    }

    switch (e.mode) {
      case 'enter': {
        // The screen darkens, the ground shakes, then he smashes in through
        // the asteroids.
        if (!e.entered) {
          e.entered = true;
          g.darkenTo(0.55);
          sfx.quake();
          for (let i = 0; i < 4; i++) {
            g.spawnEnemy(i % 2 ? 'rockSmall' : 'rockBig', VIEW_W - 36 + (i % 2) * 14, HUD_H + 14 + i * 30, { vx: -8, vy: 0, byBoss: true });
          }
        }
        g.shake = Math.max(g.shake, 1.2);
        if (e.timer > 1.0) {
          moveToward(e, HOME_X, MID_Y, 150, dt);
          smashRocks(e, g, R + 8);
        }
        if (e.timer > 2.0) {
          // Anything left in his way gets pulverised by the shockwave.
          smashRocks(e, g, VIEW_W);
          set('intro');
          sfx.roar();
          g.shake = 7;
          // Once his name card has gone, he taunts you in a speech bubble.
          g.showTitle(ROCKJAW_TYPE, () => {
            if (g.boss === e && e.mode !== 'dying') g.say(e, ROCKJAW_TYPE.taunt);
          });
        }
        break;
      }
      case 'intro':
        e.wobble = 2;
        e.jaw = e.timer < 0.15 ? e.timer / 0.15 : e.timer < 1.7 ? 1 : Math.max(0, 1 - (e.timer - 1.7) * 4);
        if (e.timer > 2.4) {
          g.darkenTo(0);
          set('fight');
          e.idle = 0.6;
          e.supplyT = 3; // the first pod comes early
        }
        break;
      case 'fight':
        if (!e.attack) {
          wander(e, dt);
          shut(e, dt);
          e.idle -= dt;
          if (e.queued) {
            e.attack = { ...e.queued, t: 0 };
            e.queued = null;
          } else if (e.idle <= 0) {
            startAttack(e, g);
          }
        } else {
          e.attack.t += dt;
          if (ATTACKS[e.attack.name](e, e.attack, dt, g)) {
            e.attack = null;
            e.idle = IDLE[e.phase];
          }
        }
        break;
      case 'transition':
        // Shell blasts off; he's briefly untouchable and furious.
        e.wobble = 2.5;
        shut(e, dt, 8);
        e.angle = 0;
        moveToward(e, HOME_X, MID_Y, 40, dt);
        if (e.timer > 1.9) {
          set('fight');
          e.idle = 0.4;
        }
        break;
      case 'dying':
        dying(e, dt, g);
        break;
    }
  },

  aimPoint(e) {
    return mouth(e);
  },

  // Health blocks lost by touching him: getting sucked into his mouth is
  // death, his bite charge takes 3, scraping his hide takes 2.
  contactDamage(e) {
    const a = e.attack;
    if (a && a.name === 'inhale') return 5;
    if (a && a.name.startsWith('charge') && (a.stage === 'dash' || a.stage === 'bite')) return 3;
    return 2;
  },

  isVulnerable(e) {
    return e.mode === 'fight' && e.jaw >= 0.5;
  },

  // 'hit' = the soft mouth, 'block' = rock, null = missed.
  hitTest(e, x, y, w, h) {
    if (e.mode === 'dying' || e.mode === 'enter') return null;
    const c = center(e);
    if (!rectHitsCircle(x, y, w, h, c.x, c.y, R * 0.93)) return null;
    if (ROCKJAW_TYPE.isVulnerable(e) && rectsOverlap(x, y, w, h, c.x - R - 3, c.y - R * 0.42, R * 0.85, R * 0.84)) {
      return 'hit';
    }
    return 'block';
  },

  // Every hit in the mouth draws blood; enough damage knocks a tooth out.
  onHit(e, g, x, y, amount) {
    g.gore.blood(x, y, 3 + Math.min(6, amount * 2), 70, Math.PI, 1.6);
    e.toothDmg += amount;
    if (e.toothDmg >= 14) {
      e.toothDmg = 0;
      const m = mouth(e);
      g.gore.piece(m.x, m.y + (g.rand() - 0.5) * 10, TOOTH.rows, TOOTH.colors, -50 - g.rand() * 40, (g.rand() - 0.5) * 60, 9);
      sfx.splat();
    }
    const next = e.phase === 1 && e.hp <= e.maxHp * 0.66 ? 2 : e.phase === 2 && e.hp <= e.maxHp * 0.33 ? 3 : 0;
    if (next && e.hp > 0) {
      e.phase = next;
      e.mode = 'transition';
      e.timer = 0;
      e.attack = null;
      e.queued = null;
      e.jaw = 0;
      const c = center(e);
      sfx.crack();
      sfx.roar();
      g.shake = 8;
      g.flash = 0.12;
      g.gore.chunks(c.x, c.y, 26, ROCK, 120, false);
      g.gore.chunks(c.x, c.y, 12, MOLTEN, 90, false);
      g.gore.blood(c.x - R * 0.5, c.y, 40, 110, Math.PI, 2.2);
      if (next === 2) {
        // His eye gets blown out.
        const ex = c.x + ROCKJAW.eye.dx;
        const ey = c.y + ROCKJAW.eye.dy;
        g.gore.blood(ex, ey, 45, 120, -Math.PI * 0.75, 1.6);
        g.gore.chunks(ex, ey, 8, FLESH, 80);
        sfx.splat();
      }
      g.say(e, next === 2 ? 'MY FUCKING EYE!' : 'NOW I EAT YOU WHOLE', 'roar');
      g.stageBonus(e, next);
    }
  },

  draw(e, ctx, snap, g) {
    const stage = Math.min(2, e.phase - 1);
    const i = Math.round(clamp(e.jaw, 0, 1) * 3);
    const img = e.flash > 0 ? ROCKJAW.flash[i] : ROCKJAW.frames[stage][i];
    const wx = e.wobble ? Math.round((g.rand() - 0.5) * 2 * e.wobble) : 0;
    const wy = e.wobble ? Math.round((g.rand() - 0.5) * 2 * e.wobble) : 0;
    if (e.angle) {
      ctx.save();
      ctx.translate(snap(e.x + e.w / 2) + wx, snap(e.y + e.h / 2) + wy);
      ctx.rotate(e.angle);
      ctx.drawImage(img, -Math.floor(e.w / 2), -Math.floor(e.h / 2));
      ctx.restore();
    } else {
      ctx.drawImage(img, snap(e.x) + wx, snap(e.y) + wy);
    }
    // Eye flashes before a charge (a warning).
    if (e.eyeFlash && stage === 0 && Math.floor(g.time * 16) % 2 === 0) {
      const c = center(e);
      ctx.fillStyle = '#efe3cf';
      ctx.fillRect(snap(c.x + ROCKJAW.eye.dx) - 2 + wx, snap(c.y + ROCKJAW.eye.dy) - 1 + wy, 5, 3);
    }
  },
};

// A supply pod comes in on the side of the screen away from Rockjaw.
function supplyPod(e, g) {
  if (g.boss !== e || e.mode === 'dying') return;
  const above = center(e).y > MID_Y;
  g.spawnEnemy('carrier', VIEW_W + 8, above ? HUD_H + 8 : VIEW_H - 20, { drop: g.nextSupplyKind() });
}

function startAttack(e, g) {
  const options = MOVESETS[e.phase].filter((n) => n !== e.last);
  const name = options[Math.floor(g.rand() * options.length)];
  e.last = name;
  e.attack = { name, t: 0 };
}

function smashRocks(e, g, reach) {
  const c = center(e);
  for (const o of g.enemies) {
    if (o === e || o.dead || !o.type.startsWith('rock')) continue;
    if (Math.hypot(o.x + o.w / 2 - c.x, o.y + o.h / 2 - c.y) < reach) {
      o.dead = true;
      g.burst(o.x + o.w / 2, o.y + o.h / 2, 14, 90);
      g.gore.chunks(o.x + o.w / 2, o.y + o.h / 2, 10, ROCK, 110, false);
      sfx.explode(1);
      g.shake = Math.max(g.shake, 4);
    }
  }
}

// A long, nasty death: he shudders and bleeds everywhere, teeth fly, molten
// guts pour out, then he splits clean in two.
function dying(e, dt, g) {
  const c = center(e);
  const m = mouth(e);
  e.wobble = 2.5;
  e.jaw = 0.5 + 0.5 * Math.sin(e.timer * 14);
  g.shake = Math.max(g.shake, 2.5);
  e.boom = (e.boom || 0) - dt;
  if (e.boom <= 0) {
    e.boom = 0.09;
    const a = g.rand() * Math.PI * 2;
    const d = g.rand() * R * 0.8;
    const x = c.x + Math.cos(a) * d;
    const y = c.y + Math.sin(a) * d;
    g.gore.blood(x, y, 12, 90);
    g.gore.chunks(x, y, 3, g.rand() < 0.5 ? FLESH : MOLTEN, 80);
    g.burst(x, y, 6, 50);
    if (g.rand() < 0.5) sfx.splat();
    else sfx.explode(0.6);
  }
  // A fountain of blood from his mouth.
  g.gore.blood(m.x, m.y, 2, 95, Math.PI, 0.7);
  e.toothT = (e.toothT || 0) - dt;
  if (e.toothT <= 0) {
    e.toothT = 0.3;
    g.gore.piece(m.x, m.y, TOOTH.rows, TOOTH.colors, -60 - g.rand() * 40, (g.rand() - 0.5) * 80, 10);
  }
  if (e.timer > 2.9) {
    const img = ROCKJAW.frames[2][0];
    const half = Math.floor(e.h / 2);
    g.gore.corpse(img, 0, 0, e.w, half, c.x, c.y - half / 2, -24, -38, -1.6);
    g.gore.corpse(img, 0, half, e.w, e.h - half, c.x, c.y + half / 2, -12, 30, 1.3);
    g.gore.blood(c.x, c.y, 130, 150);
    g.gore.chunks(c.x, c.y, 40, FLESH, 130);
    g.gore.chunks(c.x, c.y, 20, MOLTEN, 110, false);
    g.gore.chunks(c.x, c.y, 24, ROCK, 120, false);
    g.gore.smear(c.x - 30, c.y, 2.2);
    g.flash = 0.3;
    g.shake = 9;
    sfx.explode(2);
    sfx.splat();
    sfx.roar();
    g.finishBoss(e);
  }
}

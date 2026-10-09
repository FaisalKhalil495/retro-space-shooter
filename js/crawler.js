import { VIEW_W, HUD_H, PAL } from './config.js?v=0.19.2';
import { sfx } from './audio.js?v=0.19.2';
import { clamp, rectsOverlap } from './util.js?v=0.19.2';
import { METAL, MOLTEN } from './gore.js?v=0.19.2';
import { GROUND_SPEED } from './terrain.js?v=0.19.2';
import { drawText } from './font.js?v=0.19.2';
import {
  CRAWLER, CRAWLER_W, CRAWLER_H, PIVOT, CORE, MORTAR_RACK, FLAK_GUNS, DRONE_BAY, MINE_HATCH, SLIT,
  drawLegs, drawBarrel, drawCore,
} from './crawlerart.js?v=0.19.2';

// THE SIEGE CRAWLER · THE WALKING FORTRESS — boss of Rust Moon.
//
// A giant six-legged war machine that walks the canyon floor and fights you
// from below. Its iron hide shrugs off every shot; only its core can be
// hurt, and the armour plates over the core only open while the main cannon
// winds up and fires (and, from stage 2, for a moment as it launches drones).
// So to hurt it you have to fly into its line of fire.
//
// Stage 1 (100–66%): Cannon Shot, Mortar Barrage, Flak Wall.
// Stage 2 (66–33%), armour blown off: + Mines, Drones, Stomp.
// Stage 3 (33–0%), burning, "ALL GUNS": + Tread Charge, a 3-shot cannon
//   burst, and attacks paired up (mortars during a flak wall).
// Every attack has a warning: an aim line, red rings, a flashing flak line,
// blinking hatches, a wind-up with a rumble, or revving engines.

const SPEED = [0, 1, 1.15, 1.3];
const IDLE = [0, 1.1, 0.8, 0.55];
const HOME_X = VIEW_W - CRAWLER_W - 6;
const LEFT_LIMIT = [0, 74, 56, 44];
const BARREL = 18; // barrel length
const FLAK_R = 7; // how far a flak burst reaches
const MOVESETS = [
  null,
  ['cannon', 'mortars', 'cannon', 'flak'],
  ['cannon', 'mortars', 'flak', 'mines', 'cannon', 'drones', 'stomp'],
  ['cannon', 'charge', 'allguns', 'mines', 'cannon', 'drones', 'stomp', 'mortars', 'flak'],
];
const DUST = ['#6b4a3a', '#9a6a4a', '#c4a68e'];
// Its solid parts (relative to its body), following the drawing: turret,
// the hull in three bands (its nose slopes back at the top), and the legs.
const ARMOUR = [[21, 5, 26, 14], [14, 18, 52, 6], [7, 24, 63, 10], [8, 34, 58, 4], [6, 38, 62, 14]];
const SMOKE = ['#3a2a2a', '#4d3f45', '#5e4a44'];

// ---------------------------------------------------------------- helpers
// The body bobs as it walks, rises for a stomp and sinks as it dies; e.y
// stays the top of its box (so speech bubbles and bonus items stay put).
const bodyY = (e) => e.y - e.lift + e.bob + e.sink;
const pivot = (e) => ({ x: e.x + PIVOT.x, y: bodyY(e) + PIVOT.y });
const core = (e) => ({ x: e.x + CORE.x, y: bodyY(e) + CORE.y });

// The cannon's aim is kept as an angle measured from "straight left" going
// up and over: 0 = left, PI/2 = up, PI = right. It can tip well below
// level either way (down over its nose, so there's no safe spot low in
// front of it), but never swings down through its own body.
const AIM_MIN = -0.8;
const AIM_MAX = Math.PI + 0.8;
const aimDir = (a) => ({ x: -Math.cos(a), y: -Math.sin(a) });
function aimTo(e, x, y) {
  const p = pivot(e);
  let a = Math.atan2(-(y - p.y), -(x - p.x));
  if (a < -Math.PI / 2) a += Math.PI * 2; // behind it and below: past PI
  return clamp(a, AIM_MIN, AIM_MAX);
}
function muzzle(e) {
  const p = pivot(e);
  const d = aimDir(e.ang);
  return { x: p.x + d.x * BARREL, y: p.y + d.y * BARREL };
}


// Walk back and forth along the floor between attacks.
function pace(e, dt, g, k = 1) {
  if (e.targetX === null || Math.abs(e.targetX - e.x) < 2) {
    e.targetX = LEFT_LIMIT[e.phase] + g.rand() * (HOME_X - LEFT_LIMIT[e.phase]);
  }
  walkTo(e, e.targetX, 16 * SPEED[e.phase] * k, dt);
}
function walkTo(e, x, speed, dt) {
  const d = x - e.x;
  const s = Math.min(Math.abs(d), speed * dt);
  e.x += Math.sign(d) * s;
  e.walk = s > 0.001 ? Math.max(e.walk, 1) : e.walk;
  e.step += (s * 0.35 + GROUND_SPEED * dt * 0.1) * (s > 0.001 ? 1 : 0);
  return Math.abs(d) < 1;
}

// Turn the cannon towards an angle at a limited speed.
function turnTo(e, a, rate, dt) {
  e.ang += clamp(a - e.ang, -rate * dt, rate * dt);
}

// A blinking warning light somewhere on the hull (relative to the body).
function light(e, spot, t = 0.12) {
  e.lightAt = spot;
  e.lightT = t;
}

// ---------------------------------------------------------------- attacks
// Each returns true when finished. a.t is the time since the attack began.
const ATTACKS = {
  // The turret swings round to track you, locks on (a dotted red aim line
  // flashes and the armour over its core opens), then fires a heavy shell
  // along the line (3 in stage 3). The core stays open a moment after.
  cannon(e, a, dt, g) {
    const track = e.phase === 3 ? 0.35 : 0.5;
    const lock = [0, 0.8, 0.7, 0.6][e.phase];
    const shots = e.phase === 3 ? 3 : 1;
    if (!a.started) {
      a.started = true;
      sfx.rumble();
    }
    const pc = g.playerCenter();
    if (a.t < track) {
      turnTo(e, aimTo(e, pc.x, pc.y), 4, dt);
      e.slit = true;
      return false;
    }
    if (!a.locked) {
      a.locked = true;
      e.ang = aimTo(e, pc.x, pc.y); // snaps right on to you as it locks
      e.hatchTarget = 1;
      e.aimLine = true;
      sfx.charge(lock);
    }
    e.slit = true;
    const fireAt = track + lock;
    a.fired = a.fired || 0;
    if (a.fired < shots && a.t >= fireAt + a.fired * 0.22) {
      a.fired++;
      const m = muzzle(e);
      const d = aimDir(e.ang);
      g.fireShot(m.x, m.y, Math.atan2(d.y, d.x), 150, 'shell', true).dmg = 2;
      e.recoil = 3;
      g.shake = Math.max(g.shake, 3);
      g.burst(m.x, m.y, 8, 60, [PAL.amberLight, PAL.cream, ...SMOKE]);
      sfx.cannon();
    }
    if (a.fired >= shots) {
      e.aimLine = false;
      const after = a.t - (fireAt + (shots - 1) * 0.22);
      if (after > 1.0) e.hatchTarget = 0; // vents for a moment, then shuts
      return after > 1.3;
    }
    return false;
  },

  // Lobs 3–5 shells from the rack on its back. Each lands on a red ring
  // (like the canyon's mortar crawlers): the first where you are, the rest
  // around you.
  mortars(e, a, dt, g) {
    const n = [0, 3, 4, 5][e.phase];
    pace(e, dt, g, 0.6);
    if (a.t < 0.5) {
      light(e, MORTAR_RACK);
      return false;
    }
    a.n = a.n || 0;
    if (a.n < n && a.t >= 0.5 + a.n * 0.3) {
      const pc = g.playerCenter();
      const spread = a.n === 0 ? 0 : 1;
      g.spawnEnemy('mortarShell', e.x + MORTAR_RACK.x, bodyY(e) + MORTAR_RACK.y, {
        tx: clamp(pc.x + (g.rand() - 0.5) * 70 * spread, 8, VIEW_W - 8),
        ty: pc.y + (g.rand() - 0.5) * 44 * spread,
        byBoss: true,
      });
      a.n++;
      sfx.mortar();
    }
    return a.n >= n && a.t > 0.5 + n * 0.3 + 0.3;
  },

  // A dotted line flashes across the screen at your height (two lines in
  // later stages), each with one gap. Then the flak guns fire upwards and
  // the shells burst all along the line, sweeping right to left — except
  // in the gap.
  flak(e, a, dt, g) {
    const lines = e.phase === 1 ? 1 : 2;
    const warn = [0, 0.9, 0.8, 0.7][e.phase];
    if (!a.lines) {
      const top = HUD_H + 8;
      const low = bodyY(e) + FLAK_GUNS[0].y - 12; // the flak can't reach below its own guns
      const y0 = clamp(g.playerCenter().y, top, low);
      const ys = [y0];
      if (lines > 1) ys.push(y0 - 26 >= top ? y0 - 26 : y0 + 26);
      a.lines = ys.map((y) => {
        const gap = 18 + g.rand() * (VIEW_W - 64);
        return { y: Math.round(y), gap0: gap, gap1: gap + 30, next: VIEW_W - 6, count: 0 };
      });
      a.lowest = Math.max(...a.lines.map((L) => L.y));
      e.flak = a.lines;
      sfx.warning();
    }
    if (a.t < warn) return false;
    if (!a.firing) {
      a.firing = true;
      e.flakFiring = true;
      for (const gun of FLAK_GUNS) g.burst(e.x + gun.x, bodyY(e) + gun.y, 5, 40, [PAL.amberLight, ...SMOKE]);
      sfx.cannon();
    }
    // Bursts sweep from right to left along each line, one every 12 px.
    const sweep = (a.t - warn) * 520;
    let left = false;
    for (const L of a.lines) {
      while (L.next > 0 && VIEW_W - 6 - L.next <= sweep) {
        const x = L.next;
        L.next -= 12;
        // No burst reaches into the gap: the space between its posts is safe.
        if (x + FLAK_R > L.gap0 && x - FLAK_R < L.gap1) continue;
        g.blasts.blast(x, L.y, 0.35);
        g.burst(x, L.y, 3, 40, [PAL.amberLight, PAL.amber]);
        if (g.playerVulnerable() && g.touchesPlayer(x - FLAK_R, L.y - FLAK_R, FLAK_R * 2, FLAK_R * 2)) {
          g.hurtPlayer(1, e);
        }
        // Every other burst throws a hot fragment back and away from the
        // other line (the top line's go up, the bottom line's go down), so
        // no fragment can fall through the other line's gap.
        const up = L.y < a.lowest;
        if (L.count++ % 2 === 0) g.fireShot(x, L.y + (up ? -2 : 2), Math.PI * (up ? -0.62 : 0.62), 46, 'gravel', true);
      }
      if (L.next > 0) left = true;
    }
    if (!left && !a.done) {
      a.done = a.t;
      e.flak = null;
      e.flakFiring = false;
    }
    return !!a.done && a.t - a.done > 0.35;
  },

  // Pops floating mines out of a hatch on its deck (the hatch blinks
  // first). Mines drift, then burst after 3 s or when you get close.
  mines(e, a, dt, g) {
    const n = e.phase === 3 ? 5 : 3;
    pace(e, dt, g, 0.5);
    if (a.t < 0.5) {
      light(e, MINE_HATCH);
      return false;
    }
    a.n = a.n || 0;
    if (a.n < n && a.t >= 0.5 + a.n * 0.25) {
      g.spawnEnemy('mine', e.x + MINE_HATCH.x - 3, bodyY(e) + MINE_HATCH.y - 4, {
        vx: -20 - g.rand() * 55,
        vy: -55 - g.rand() * 35,
        byBoss: true,
      });
      a.n++;
      sfx.mortar();
    }
    return a.n >= n && a.t > 0.5 + n * 0.25 + 0.4;
  },

  // The drone bay blinks and the armour over its core swings open while 2–3
  // drones launch. Each drone hunts you down, blinks and fires once.
  drones(e, a, dt, g) {
    const n = e.phase === 3 ? 3 : 2;
    if (a.t < 0.5) {
      light(e, DRONE_BAY);
      e.hatchTarget = 1;
      return false;
    }
    a.n = a.n || 0;
    if (a.n < n && a.t >= 0.5 + a.n * 0.3) {
      g.spawnEnemy('drone', e.x + DRONE_BAY.x - 4, bodyY(e) + DRONE_BAY.y - 2, {
        vx: -35 - a.n * 10,
        vy: -45 - g.rand() * 20,
        byBoss: true,
      });
      a.n++;
      sfx.mortar();
    }
    const end = 0.5 + n * 0.3 + 0.5;
    if (a.t > end) e.hatchTarget = 0;
    return a.t > end + 0.3;
  },

  // Rears up with a rumble, then slams down: a wave of dust rolls along the
  // floor both ways (fly above it), and the ground cracks open — at each
  // crack (marked with a "!" first, the first one under you) a rock spike
  // bursts up out of the canyon floor, then crumbles.
  stomp(e, a, dt, g) {
    const rise = 0.6;
    if (!a.started) {
      a.started = true;
      sfx.rumble();
    }
    if (a.t < rise) {
      e.lift = Math.min(7, (a.t / rise) * 7);
      e.wobble = 1;
      return false;
    }
    if (!a.slammed) {
      a.slammed = true;
      e.lift = 0;
      g.shake = Math.max(g.shake, 6);
      sfx.stomp();
      const feet = g.terrain.floorY - 2;
      g.burst(e.x + 10, feet, 12, 70, DUST);
      g.burst(e.x + CRAWLER_W - 10, feet, 12, 70, DUST);
      const speed = e.phase === 3 ? 130 : 110;
      e.waves.push({ x: e.x + 2, vx: -speed }, { x: e.x + CRAWLER_W - 2, vx: speed });
      const n = e.phase === 3 ? 6 : 4;
      const under = g.playerCenter().x;
      for (let i = 0; i < n; i++) {
        const x = i === 0 ? under : 10 + g.rand() * (VIEW_W - 20);
        e.spikes.push({ x: Math.round(clamp(x, 8, VIEW_W - 8)), t: -(0.1 + i * 0.3) });
      }
    }
    // It keeps walking while its spikes play out, and the stomp isn't over
    // (so no new attack starts) until the last spike has crumbled.
    pace(e, dt, g, 0.6);
    return a.t > rise + 1.0 && !e.spikes.length;
  },

  // Revs its engines (smoke, a blast of its horn, flashing lights), then
  // charges across the whole screen along the floor and walks back. Fly over
  // the top of it!
  charge(e, a, dt, g) {
    const rev = 1.0;
    if (!a.stage) {
      a.stage = 'rev';
      sfx.horn();
      sfx.rumble();
    }
    if (a.stage === 'rev') {
      e.slit = true;
      e.wobble = 1;
      e.step += dt * 14; // stamping in place
      e.walk = 1;
      if (Math.floor(a.t * 20) % 2 === 0) {
        g.particles.push({
          x: e.x + CRAWLER_W - 4, y: bodyY(e) + 14, vx: 30 + g.rand() * 20, vy: -20 - g.rand() * 20,
          life: 0.8, max: 0.8, color: SMOKE[Math.floor(g.rand() * 3)], size: 2,
        });
      }
      if (a.t >= rev) {
        a.stage = 'run';
        sfx.roar();
      }
    } else if (a.stage === 'run') {
      a.running = true;
      e.x -= 125 * SPEED[e.phase] * dt;
      e.step += dt * 16;
      e.walk = 1;
      g.shake = Math.max(g.shake, 1.5);
      if (Math.floor(a.t * 15) % 2 === 0) g.burst(e.x + CRAWLER_W - 6, g.terrain.floorY - 2, 2, 40, DUST);
      if (e.x <= 2) {
        e.x = 2;
        a.stage = 'brake';
        a.brake = a.t;
        a.running = false;
        g.shake = Math.max(g.shake, 5);
        sfx.stomp();
      }
    } else if (a.stage === 'brake') {
      if (a.t - a.brake > 0.5) a.stage = 'back';
    } else if (walkTo(e, HOME_X, 60 * SPEED[e.phase], dt)) {
      return true;
    }
    return false;
  },

  // Stage 3: everything at once — a mortar barrage during a flak wall.
  allguns(e, a, dt, g) {
    if (!a.parts) a.parts = [{ t: 0 }, { t: 0 }];
    if (!a.finished) a.finished = [false, false];
    let done = true;
    ['flak', 'mortars'].forEach((name, i) => {
      if (a.finished[i]) return;
      const part = a.parts[i];
      part.t += dt;
      if (ATTACKS[name](e, part, dt, g)) a.finished[i] = true;
      else done = false;
    });
    return done;
  },
};

// ---------------------------------------------------------------- the boss
export const SIEGE_CRAWLER_TYPE = {
  boss: true,
  name: 'SIEGE CRAWLER',
  title: 'THE WALKING FORTRESS',
  taunt: 'STEP INTO MY FUCKING SIGHTS',
  stageLines: [null, null, 'YOU SCRATCHED MY FUCKING PAINT', 'ALL GUNS. NOW.'],
  killLines: ['FLATTENED', 'FUCKING SHELLED', 'TARGET DOWN. FUCKING PATHETIC', 'GROUND INTO THE DIRT'],
  voice: 'metal',
  music: 'march',
  hp: 210,
  score: 6000,
  explodeSize: 2,

  init(e, g) {
    e.w = CRAWLER_W;
    e.h = CRAWLER_H;
    e.x = VIEW_W + 6;
    e.y = g.terrain.floorY - CRAWLER_H;
    e.mode = 'enter';
    e.timer = 0;
    e.phase = 1;
    e.ang = 0.25; // cannon angle (see aimTo)
    e.hatch = 0;
    e.hatchTarget = 0;
    e.recoil = 0;
    e.lift = 0;
    e.bob = 0;
    e.sink = 0;
    e.step = 0;
    e.walk = 0;
    e.wobble = 0;
    e.targetX = null;
    e.waves = [];
    e.spikes = [];
    e.flak = null;
    e.attack = null;
    e.last = null;
    e.idle = 1;
    e.lightT = 0;
  },

  update(e, dt, g) {
    e.timer += dt;
    e.wobble = 0;
    e.slit = false;
    e.walk = Math.max(0, e.walk - dt * 4);
    e.lightT = Math.max(0, e.lightT - dt);
    e.recoil = Math.max(0, e.recoil - dt * 12);
    e.hatch += clamp(e.hatchTarget - e.hatch, -dt * 5, dt * 5);
    e.bob = e.walk > 0.2 ? Math.round(Math.abs(Math.sin(e.step)) * 1) : 0;
    const set = (mode) => {
      e.mode = mode;
      e.timer = 0;
    };

    updateWaves(e, dt, g);
    updateSpikes(e, dt, g);
    if (e.phase === 3 && e.mode !== 'dying') burning(e, g);

    switch (e.mode) {
      case 'enter': {
        // The screen darkens and the ground shakes in time with its
        // footsteps as it marches in from the right.
        if (!e.entered) {
          e.entered = true;
          g.darkenTo(0.45);
          sfx.quake();
        }
        const before = Math.floor(e.step / Math.PI);
        walkTo(e, HOME_X, 24, dt);
        if (Math.floor(e.step / Math.PI) !== before) {
          g.shake = Math.max(g.shake, 3);
          sfx.stomp();
        }
        if (e.x <= HOME_X + 0.5) {
          set('intro');
          sfx.horn();
          g.shake = 6;
          g.showTitle(SIEGE_CRAWLER_TYPE);
        }
        break;
      }
      case 'intro':
        // Raises its cannon to the sky and blasts its horn.
        e.wobble = 1.5;
        e.slit = true;
        turnTo(e, e.timer < 1.6 ? Math.PI / 2 : 0.25, 2.5, dt);
        if (e.timer > 2.4) {
          g.darkenTo(0);
          set('taunt');
        }
        break;
      case 'taunt':
        // It holds back and taunts you once its name card has gone, and only
        // starts the fight when it's finished talking. (Skipped if you've
        // just died.)
        if (!g.title && !e.taunted) {
          e.taunted = true;
          if (g.state === 'playing') g.say(e, SIEGE_CRAWLER_TYPE.taunt);
        }
        if (e.taunted && g.bossMayAttack(e)) {
          set('fight');
          e.idle = 0.6;
        }
        break;
      case 'fight': {
        if (!e.attack) {
          // A ship hiding low at its feet gets walked over.
          const low = g.playerCenter();
          if (low.y > bodyY(e) + 20 && low.x > e.x - 50 && low.x < e.x + 6) {
            e.targetX = clamp(low.x - 4, LEFT_LIMIT[e.phase], HOME_X);
            walkTo(e, e.targetX, 28 * SPEED[e.phase], dt);
          } else {
            pace(e, dt, g);
          }
          e.hatchTarget = 0;
          // Between attacks the cannon idly follows you.
          const pc = g.playerCenter();
          turnTo(e, aimTo(e, pc.x, pc.y), 1.2, dt);
          // A boss never starts an attack while its speech bubble is up
          // (e.g. gloating after a kill) — see Game.bossMayAttack.
          if (!g.bossMayAttack(e)) break;
          e.idle -= dt;
          if (e.idle <= 0) startAttack(e, g);
        } else {
          e.attack.t += dt;
          if (ATTACKS[e.attack.name](e, e.attack, dt, g)) {
            e.attack = null;
            e.idle = IDLE[e.phase];
          }
        }
        break;
      }
      case 'transition':
        // Armour plates blow off; it's briefly untouchable and furious.
        e.wobble = 2;
        e.hatchTarget = 0;
        // It doesn't attack again until it's finished shouting.
        if (e.timer > 1.9 && g.bossMayAttack(e)) {
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
    return core(e);
  },

  // Supply pods fly in high, well above it.
  supplyY(e, g) {
    return HUD_H + 8 + g.rand() * 30;
  },

  // Where its speech bubble's tail points: the vision slit on its turret.
  voicePoint(e) {
    return { x: e.x + SLIT.x + 2, y: bodyY(e) + SLIT.y };
  },

  muzzle(e) {
    return muzzle(e);
  },

  onScreen(e) {
    return e.mode !== 'enter';
  },

  // Bumping into it pushes you clear of it: out of the front if you hit its
  // front, out of the back if you hit its back, otherwise (on top of it, or
  // when it's running you down, or at the edge of the screen) up and over
  // its turret, so it can never pin you.
  knockback(e, p) {
    const cx = p.x + p.w / 2;
    let x = null;
    if (!(e.attack && e.attack.running)) {
      if (cx < e.x + 10) x = e.x - 12;
      else if (cx > e.x + e.w - 8) x = e.x + e.w - 4;
    }
    if (x !== null && x >= 2 && x <= VIEW_W - p.w - 2) p.x = x;
    else p.y = Math.max(HUD_H + 1, bodyY(e) - p.h + 2);
  },

  // Health blocks lost by touching it: 3 if it runs you down, 2 otherwise.
  contactDamage(e) {
    return e.attack && e.attack.running ? 3 : 2;
  },

  isVulnerable(e) {
    return e.mode === 'fight' && e.hatch >= 0.5;
  },

  // 'hit' = the open core, 'block' = armour, null = missed.
  hitTest(e, x, y, w, h) {
    if (e.mode === 'dying' || e.mode === 'enter') return null;
    const by = bodyY(e);
    // The open core counts from the front edge of the hull, so a shot at
    // its height can't clip the armour just in front of it first.
    if (SIEGE_CRAWLER_TYPE.isVulnerable(e) && rectsOverlap(x, y, w, h, e.x + 5, by + CORE.y - 5, CORE.x, 10)) return 'hit';
    for (const [px, py, pw, ph] of ARMOUR) {
      if (rectsOverlap(x, y, w, h, e.x + px, by + py, pw, ph)) return 'block';
    }
    return null;
  },

  onHit(e, g, x, y) {
    g.burst(x, y, 3, 50, [PAL.amberLight, PAL.cream]);
    const next = e.phase === 1 && e.hp <= e.maxHp * 0.66 ? 2 : e.phase === 2 && e.hp <= e.maxHp * 0.33 ? 3 : 0;
    if (next && e.hp > 0) {
      e.phase = next;
      e.mode = 'transition';
      e.timer = 0;
      e.attack = null;
      e.aimLine = false;
      e.flak = null;
      e.flakFiring = false;
      // Cracks still waiting to burst close up; spikes already standing
      // crumble as normal.
      e.spikes = e.spikes.filter((s) => s.t >= SPIKE_WARN);
      e.lift = 0;
      const by = bodyY(e);
      // Armour plates blow off all over the hull.
      for (let i = 0; i < 6; i++) {
        const px = e.x + 12 + g.rand() * 52;
        const py = by + 8 + g.rand() * 26;
        g.blasts.blast(px, py, 0.6);
        g.gore.chunks(px, py, 4, METAL, 110, false);
      }
      g.gore.chunks(e.x + 36, by + 24, 10, MOLTEN, 90, false);
      sfx.crack();
      sfx.horn();
      g.shake = 8;
      g.flash = 0.12;
      g.say(e, SIEGE_CRAWLER_TYPE.stageLines[next], 'roar');
      g.stageBonus(e, next);
    }
  },

  draw(e, ctx, snap, g) {
    const stage = Math.min(2, e.phase - 1);
    // (Drawing uses Math.random, never the game's own dice.)
    const wx = e.wobble ? Math.round((Math.random() - 0.5) * 2 * e.wobble) : 0;
    const x = snap(e.x) + wx;
    const y = snap(bodyY(e));
    drawWaves(e, ctx, g);
    drawSpikes(e, ctx, g);
    drawLegs(ctx, x, y, e.step, Math.min(1, e.walk), false);
    if (e.turretGone) {
      ctx.drawImage(CRAWLER.bodies[2], 0, 17, CRAWLER_W, 23, x, y + 17, CRAWLER_W, 23);
    } else {
      ctx.drawImage(CRAWLER.bodies[stage], x, y);
    }
    drawCore(ctx, x + CORE.x, y + CORE.y, e.hatch, g.time, e.flash > 0);
    if (!e.turretGone) drawBarrel(ctx, x + PIVOT.x, y + PIVOT.y, e.ang + Math.PI, BARREL, e.recoil);
    drawLegs(ctx, x, y, e.step + 1, Math.min(1, e.walk), true);
    const blink = Math.floor(g.time * 16) % 2 === 0;
    // The vision slit glows while it's taking aim or revving.
    if (e.slit && blink && !e.turretGone) {
      ctx.fillStyle = PAL.amberLight;
      ctx.fillRect(x + SLIT.x, y + SLIT.y, SLIT.w, 1);
    }
    // A hatch or rack blinking: something's about to come out of it.
    if (e.lightT > 0 && blink && e.lightAt) {
      ctx.fillStyle = PAL.amberLight;
      ctx.fillRect(x + e.lightAt.x - 1, y + e.lightAt.y - 1, 3, 3);
    }
    // The cannon's aim line: dotted red along the barrel, to the edge.
    if (e.aimLine && Math.floor(g.time * 20) % 2 === 0) {
      const m = muzzle(e);
      const d = aimDir(e.ang);
      ctx.fillStyle = PAL.red;
      for (let s = 4; s < 300; s += 4) {
        const px = m.x + d.x * s;
        const py = m.y + d.y * s;
        if (px < -2 || px > VIEW_W + 2 || py < -2 || py > g.terrain.floorY) break;
        ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
    }
    // Flak warning: a flashing dotted line across the screen, with a gap.
    if (e.flak && !e.flakFiring) {
      ctx.fillStyle = Math.floor(g.time * 12) % 2 === 0 ? PAL.red : PAL.redSoft;
      for (const L of e.flak) {
        for (let px = 2; px < VIEW_W - 2; px += 3) {
          if (px > L.gap0 && px < L.gap1) continue;
          ctx.fillRect(px, L.y, 2, 1);
        }
        // Little posts either side of the gap.
        ctx.fillRect(Math.round(L.gap0), L.y - 2, 1, 5);
        ctx.fillRect(Math.round(L.gap1), L.y - 2, 1, 5);
      }
    }
  },
};

function startAttack(e, g) {
  const options = MOVESETS[e.phase].filter((n) => n !== e.last);
  const name = options[Math.floor(g.rand() * options.length)];
  e.last = name;
  e.attack = { name, t: 0 };
}

// The stomp's dust waves roll along the floor; 2 blocks if one catches you.
const WAVE_H = 14;
function updateWaves(e, dt, g) {
  if (!e.waves.length) return;
  const floorY = g.terrain.floorY;
  for (const w of e.waves) {
    w.x += w.vx * dt;
    if (g.playerVulnerable() && g.touchesPlayer(w.x - 5, floorY - WAVE_H, 10, WAVE_H)) g.hurtPlayer(2, e);
  }
  e.waves = e.waves.filter((w) => w.x > -12 && w.x < VIEW_W + 12);
}

function drawWaves(e, ctx, g) {
  const floorY = g.terrain.floorY;
  for (const w of e.waves) {
    const dir = Math.sign(w.vx);
    for (let i = 0; i < 12; i++) {
      // A rolling crest: tallest at the front, trailing off behind.
      const h = Math.round(WAVE_H * (1 - i / 12) * (0.75 + 0.25 * Math.sin(g.time * 30 + i)));
      const px = Math.round(w.x - dir * i);
      ctx.fillStyle = DUST[i < 2 ? 2 : i < 6 ? 1 : 0];
      ctx.fillRect(px, floorY - h, 1, h);
    }
  }
}

// The stomp's ground eruptions. Each crack in the floor shows for
// SPIKE_WARN seconds with a "!" above it, then a rock spike shoots up
// (2 blocks if it catches you), holds a moment and crumbles.
const SPIKE_WARN = 0.75;
const SPIKE_UP = 0.1;
const SPIKE_HOLD = 0.45;
const SPIKE_H = 26;
const SPIKE_W = 8;
const SPIKE_ROCK = ['#2e1c1f', '#6b3d2e', '#8c5a3e', '#a8785a'];
const spikeHeight = (s) => (s.t < SPIKE_WARN ? 0 : SPIKE_H * Math.min(1, (s.t - SPIKE_WARN) / SPIKE_UP));
function updateSpikes(e, dt, g) {
  if (!e.spikes.length) return;
  const floorY = g.terrain.floorY;
  let finished = false;
  for (const s of e.spikes) {
    const before = s.t;
    s.t += dt;
    if (s.t >= 0) s.x -= GROUND_SPEED * dt; // cracks and spikes are part of the ground
    if (before < SPIKE_WARN && s.t >= SPIKE_WARN) {
      sfx.crack();
      g.shake = Math.max(g.shake, 2);
      g.burst(s.x, floorY - 2, 8, 70, DUST);
    }
    const h = spikeHeight(s);
    // It hurts where it's drawn: wide at the base, a thin point on top.
    const base = h / 2;
    if (h > 4 && g.playerVulnerable() &&
        (g.touchesPlayer(s.x - SPIKE_W / 2 + 1, floorY - base, SPIKE_W - 2, base) ||
         g.touchesPlayer(s.x - 1, floorY - h, 2, h - base))) {
      g.hurtPlayer(2, e);
    }
    if (s.t > SPIKE_WARN + SPIKE_UP + SPIKE_HOLD) {
      s.done = true;
      finished = true;
      g.burst(s.x, floorY - SPIKE_H / 2, 10, 50, DUST); // crumbles to dust
    }
  }
  if (finished) e.spikes = e.spikes.filter((s) => !s.done);
}

function drawSpikes(e, ctx, g) {
  const floorY = g.terrain.floorY;
  for (const s of e.spikes) {
    if (s.t < 0) continue;
    const h = Math.round(spikeHeight(s));
    if (!h) {
      // The crack: a jagged dark split in the ground, opening up.
      const open = Math.min(1, s.t / SPIKE_WARN);
      ctx.fillStyle = SPIKE_ROCK[0];
      for (let i = -4; i <= 4; i++) {
        if (Math.abs(i) > 1 + open * 3) continue;
        ctx.fillRect(s.x + i, floorY + ((i + 4) % 3), 1, 2);
      }
      if (Math.floor(g.time * 12) % 2 === 0) {
        ctx.fillStyle = DUST[1];
        ctx.fillRect(s.x - 1 + Math.round(Math.sin(g.time * 30) * 2), floorY - 2, 1, 1);
      }
      // A blinking "!" above the crack (moving with it, like the ground).
      if (Math.floor(s.t * 10) % 2 === 0) {
        const mx = Math.round(s.x);
        const my = floorY - SPIKE_H - 12;
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(mx - 3, my - 1, 7, 9);
        ctx.fillStyle = PAL.red;
        ctx.fillRect(mx - 2, my, 5, 7);
        drawText(ctx, '!', mx - 2, my + 1, PAL.cream);
      }
      continue;
    }
    // The spike: a jagged column of rock, wide at the base, pointed on top.
    for (let y = 0; y < h; y++) {
      const half = Math.max(0.5, (SPIKE_W / 2) * (y / h)) + ((y * 7) % 3 === 0 ? 0.6 : 0);
      const py = floorY - h + y;
      ctx.fillStyle = SPIKE_ROCK[0];
      ctx.fillRect(Math.round(s.x - half - 1), py, Math.round(half * 2) + 2, 1);
      ctx.fillStyle = SPIKE_ROCK[y < 3 ? 3 : 2];
      ctx.fillRect(Math.round(s.x - half), py, Math.max(1, Math.round(half)), 1);
      ctx.fillStyle = SPIKE_ROCK[1];
      ctx.fillRect(Math.round(s.x), py, Math.max(1, Math.round(half)), 1);
    }
  }
}

// Stage 3: fires and smoke pour out of the holes in its hull.
function burning(e, g) {
  if (g.rand() > 0.35) return;
  const spots = [[31, 30], [55, 22], [20, 22], [62, 31]];
  const [sx, sy] = spots[Math.floor(g.rand() * spots.length)];
  const fire = g.rand() < 0.5;
  g.particles.push({
    x: e.x + sx, y: bodyY(e) + sy, vx: (g.rand() - 0.5) * 10 - 8, vy: -18 - g.rand() * 16,
    life: fire ? 0.35 : 0.9, max: fire ? 0.35 : 0.9,
    color: fire ? MOLTEN[Math.floor(g.rand() * 3)] : SMOKE[Math.floor(g.rand() * 3)], size: fire ? 1 : 2,
  });
}

// Its death: a chain of explosions runs over the hull, the turret is blown
// clean off and spins away, then the whole machine goes up in one huge blast
// and the wreck collapses.
function dying(e, dt, g) {
  e.waves = [];
  e.spikes = [];
  e.flak = null;
  e.aimLine = false;
  e.hatchTarget = 1;
  e.wobble = 2;
  e.sink = Math.min(8, e.timer * 2.5); // its legs buckle
  g.shake = Math.max(g.shake, 2.5);
  const by = bodyY(e);
  e.boom = (e.boom || 0) - dt;
  if (e.boom <= 0) {
    e.boom = 0.12;
    const x = e.x + 8 + g.rand() * (CRAWLER_W - 16);
    const y = by + 8 + g.rand() * 30;
    g.blasts.blast(x, y, 0.5 + g.rand() * 0.5);
    g.gore.chunks(x, y, 3, METAL, 90, false);
    sfx.explode(0.6);
  }
  if (e.timer > 1.4 && !e.turretGone) {
    e.turretGone = true;
    g.gore.corpse(CRAWLER.bodies[2], 18, 3, 32, 16, e.x + 34, by + 11, -24, -80, 3, false);
    g.blasts.blast(e.x + 34, by + 14, 1.2);
    g.gore.chunks(e.x + 34, by + 14, 14, METAL, 120, false);
    g.shake = 7;
    sfx.explode(1.4);
  }
  if (e.timer > 3.0) {
    const cx = e.x + CRAWLER_W / 2;
    const cy = by + 26;
    g.blasts.blast(cx, cy, 2.5);
    // The burnt-out hull drops onto the canyon floor and scrolls away.
    g.gore.corpse(CRAWLER.bodies[2], 0, 17, CRAWLER_W, 23, cx, by + 28, -GROUND_SPEED, 6, 0, false, g.terrain.floorY);
    g.gore.chunks(cx, cy, 40, METAL, 140, false);
    g.gore.chunks(cx, cy, 16, MOLTEN, 110, false);
    g.flash = 0.3;
    g.shake = 9;
    sfx.explode(2);
    sfx.horn();
    g.finishBoss(e);
  }
}

// ---------------------------------------------------------------- its weapons
// Small enemies the Siege Crawler launches.
export const CRAWLER_MINIONS = {
  // A floating mine: drifts, blinks, and bursts after 3 s, or sooner (0.5 s
  // of fast blinking) when you come close, or at once if you touch it. 2
  // blocks if you're caught in the burst, and it throws fragments. Shoot it
  // first and it just breaks.
  mine: {
    sprite: 'mine',
    hp: 2,
    score: 20,
    harmless: true, // it hurts by bursting, not by ramming
    noDrop: true,
    explodeSize: 0.4,
    init(e) {
      e.fuse = 3;
    },
    update(e, dt, g) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx += (-12 - e.vx) * Math.min(1, dt * 1.5);
      e.vy += (Math.sin(e.t * 3) * 6 - e.vy) * Math.min(1, dt * 2);
      e.y = clamp(e.y, HUD_H + 2, g.terrain.floorY - e.h - 2);
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const pc = g.playerCenter();
      const d = Math.hypot(pc.x - cx, pc.y - cy);
      if (d < 22 && e.fuse > 0.5) e.fuse = 0.5; // you're close: it arms
      e.fuse -= dt;
      e.charge = e.fuse < 0.5 ? 1 : 0;
      const live = g.playerVulnerable();
      const touching = live && g.touchesPlayer(e.x, e.y, e.w, e.h);
      if (e.fuse > 0 && !touching) return;
      e.dead = true;
      g.blasts.blast(cx, cy, 0.7);
      g.burst(cx, cy, 10, 70);
      sfx.explode(0.5);
      if (live && (touching || g.touchesPlayer(cx - 12, cy - 12, 24, 24))) g.hurtPlayer(2, e);
      for (let k = 0; k < 6; k++) g.fireShot(cx, cy, (k * Math.PI) / 3 + 0.3, 50, 'gravel', true);
    },
    muzzle(e) {
      return { x: e.x + e.w / 2 - 1, y: e.y + e.h / 2 - 1 };
    },
    draw(e, ctx, snap, g, spr) {
      ctx.drawImage(spr, snap(e.x), snap(e.y));
      // A slow red blink, fast once it's armed.
      const rate = e.fuse < 0.5 ? 16 : 3;
      if (Math.floor(g.time * rate) % 2 === 0) {
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(snap(e.x) + 3, snap(e.y) + 3, 1, 1);
      }
    },
  },

  // A drone: flies out to a spot in front of you, blinks, fires once and
  // climbs away.
  drone: {
    sprite: 'drone',
    hp: 1,
    score: 20,
    ram: 1,
    noDrop: true,
    explodeSize: 0.35,
    init(e) {
      e.mode = 'hunt';
    },
    update(e, dt, g) {
      const p = g.player;
      const inFront = p.x + p.w < e.x - 4;
      if (e.mode === 'hunt') {
        const tx = clamp(p.x + p.w + 46, 30, VIEW_W - 12);
        const ty = clamp(p.y + p.h / 2 - e.h / 2, HUD_H + 3, g.terrain.floorY - e.h - 3);
        e.vx += clamp(tx - e.x, -1, 1) * 160 * dt;
        e.vy += clamp(ty - e.y, -1, 1) * 160 * dt;
        e.vx = clamp(e.vx, -60, 60) * (1 - dt);
        e.vy = clamp(e.vy, -60, 60) * (1 - dt);
        if (e.t > 1.4 || (Math.abs(tx - e.x) < 6 && Math.abs(ty - e.y) < 6)) {
          e.mode = 'aim';
          e.aim = 0;
        }
      } else if (e.mode === 'aim') {
        e.vx *= 1 - dt * 5;
        e.vy *= 1 - dt * 5;
        e.charge = inFront ? 1 : 0;
        if (!inFront) e.mode = 'leave'; // you got behind it: no shot
        else if ((e.aim += dt) > 0.35) {
          e.charge = 0;
          g.fireAtPlayer(e.x - 1, e.y + e.h / 2, 85, 'orb', true);
          e.mode = 'leave';
        }
      } else {
        e.vy = Math.max(-70, e.vy - 120 * dt);
        e.vx = -25;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    },
  },
};

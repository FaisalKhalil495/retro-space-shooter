import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.23.1';
import { sfx } from './audio.js?v=0.23.1';
import { clamp, fillDisc } from './util.js?v=0.23.1';
import { FINE, snapFine } from './detail.js?v=0.23.1';
import { METAL, MOLTEN } from './gore.js?v=0.23.1';
import { ICE_COLORS, slabImage } from './terrain.js?v=0.23.1';
import { BOMB_DAMAGE } from './weapons.js?v=0.23.1';
import {
  WARDEN, WARDEN_W, WARDEN_H, HUB, PLATE_HP, PLATES, NOSE, HOLES, RING_FRAMES, TEETH,
  CORE, PLATE, RING, SECTOR, buildWardenArt, wardenAt, drawWardenCore, drawWardenPlates, toothTips, bladeFrame,
} from './wardenart.js?v=0.23.1';

// THE GLACIER WARDEN · KEEPER OF THE RING — boss of Frostring.
//
// The Ice Harvesters' flagship: a giant saw ring spinning round a hub where
// six wedge-shaped plates of ice cover its furnace core — and the plates
// TURN, like a revolving door. Your shots crack the plate facing you (6
// hits); a broken plate leaves a gap, and the core can only be hit while a
// gap is facing you, so break more plates for more (and longer) chances.
// The ice is also its ammunition: its icicle fan fires one icicle from each
// plate still there, and it can only raise an ice wall while it has plates,
// so stripping it weakens it too. It freezes broken plates back over (frost
// creeps in from the rim for 2.5 s; shooting the frost knocks it back) —
// slowly in stage 1, faster later — and each stage starts with a fresh set.
// The hub turns faster each stage and, in stage 3, suddenly reverses. A bomb
// shatters every plate; the laser cuts through one. It never sits still: it
// drifts round the right of the screen and pushes in towards you.
//
// Stage 1 (100–66%): Icicle Fan, Frost Beam, Hailstorm, Ice Wall, Saw Blades.
// Stage 2 (66–33%), the ice crust blown off: + Frost Mines; faster refreezing.
// Stage 3 (33–0%), burning: + Blizzard (wind pushes you back while it keeps
//   attacking); everything faster, two fans at a time, plates refreeze
//   sooner, and the hub suddenly reverses now and then.
// Every attack has a warning: a glowing hub, guide lines, "!" markers,
// glinting teeth, a blinking hatch or a howling wind.

const SPIN = [0, 2, 2.8, 4]; // the ring's normal spin (radians a second)
const SPEED = [0, 22, 27, 33]; // how fast it drifts about
const IDLE = [0, 0.85, 0.65, 0.5];
const HOME_X = VIEW_W - WARDEN_W - 2;
const LEFT_LIMIT = [0, 108, 94, 80];
const TOP_Y = HUD_H + 1;
const LOW_Y = VIEW_H - WARDEN_H - 1;
const REFREEZE = [0, 2.6, 2.1, 1.7]; // seconds after a plate breaks before it starts to refreeze
const FROST_PAUSE = 0.6; // ...and after you knock its frost out
const HUB_SPIN = [0, 0.8, 1.1, 1.45]; // how fast the plates turn (radians a second)
const GROW_TIME = 2.5; // seconds for a plate to freeze back over
const MOVESETS = [
  null,
  ['fan', 'beam', 'hail', 'fan', 'wall', 'blades'],
  ['fan', 'beam', 'hail', 'wall', 'blades', 'mines', 'fan'],
  ['fan', 'beam', 'hail', 'wall', 'blades', 'mines', 'blizzard', 'blizzard'],
];
const SMOKE = ['#3a2a2a', '#4d3f45', '#5e4a44'];
const FROST = ICE_COLORS.slice(2);

// ---------------------------------------------------------------- helpers
const hub = (e) => ({ x: e.x + HUB.x, y: e.y + HUB.y });
const nose = (e) => ({ x: e.x + NOSE.x - 1, y: e.y + NOSE.y });
const plateUp = (P) => P.hp > 0 || P.grow > 0; // solid: whole, or freezing back over
const whole = (e) => e.plates.filter((P) => P.hp > 0).length; // its ammunition
// Is there a gap in its plates at all? (Rockets go for it then; whether a
// shot reaches the core depends on where the gap has turned to.)
const coreOpen = (e) => e.plates.some((P) => !plateUp(P));
// Where plate k is now (the middle of its wedge), as an angle.
const plateMid = (e, k) => e.hubAng + (k + 0.5) * SECTOR;
const soft = (code) => code === CORE || code >= PLATE; // what a shot can do damage to

// Drift about the right of the screen between attacks (and slowly during
// some), sometimes pushing in towards you.
function drift(e, dt, g, k = 1) {
  if (!e.dest || (Math.abs(e.dest.x - e.x) < 2 && Math.abs(e.dest.y - e.y) < 2)) {
    e.dest = {
      x: LEFT_LIMIT[e.phase] + g.rand() * (HOME_X - LEFT_LIMIT[e.phase]),
      y: TOP_Y + g.rand() * (LOW_Y - TOP_Y),
    };
  }
  const s = SPEED[e.phase] * k * dt;
  const dx = e.dest.x - e.x;
  const dy = e.dest.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.x += (dx / d) * Math.min(s, d);
  e.y += (dy / d) * Math.min(s, d);
}

// The point on a ray from (x, y) at angle a where it stops: at a slab of ice
// or the edge of the screen (a beam or its guide line).
function rayEnd(g, x, y, a) {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let s = 0;
  for (; s < 320; s += 2) {
    const px = x + dx * s;
    const py = y + dy * s;
    if (px < -2 || px > VIEW_W + 2 || py < HUD_H || py > VIEW_H) break;
    if (s > 4 && g.terrain.slabAt(px - 1, py - 1, 2, 2)) break;
  }
  return { x: x + dx * s, y: y + dy * s, len: s };
}

function light(e, what, t = 0.12) {
  e.lightAt = what;
  e.lightT = t;
}

// ---------------------------------------------------------------- attacks
// Each returns true when finished. a.t is the time since the attack began.
const ATTACKS = {
  // The hub glows and whines, then its plates fire: a fan of icicles aimed
  // at you, one from each plate still whole (so a stripped Warden fires thin
  // fans; a second fan in stage 3, offset into the first one's gaps).
  fan(e, a, dt, g) {
    const warn = [0, 0.5, 0.45, 0.4][e.phase];
    const fans = e.phase === 3 ? 2 : 1;
    drift(e, dt, g, 0.4);
    if (!a.started) {
      if (!whole(e)) return true; // no ice left to fire: no fan (and no false warning)
      a.started = true;
      sfx.charge(warn);
    }
    if (a.t < warn) {
      e.glow = 1;
      return false;
    }
    a.fired = a.fired || 0;
    if (a.fired < fans && a.t >= warn + a.fired * 0.45) {
      const h = hub(e);
      const pc = g.playerCenter();
      const mid = Math.atan2(pc.y - h.y, pc.x - h.x);
      const from = e.plates.map((P, k) => k).filter((k) => e.plates[k].hp > 0);
      const n = from.length;
      const spread = Math.min(1.2, 0.24 * (n - 1)); // up to about 70 degrees
      const step = n > 1 ? spread / (n - 1) : 0;
      from.forEach((k, i) => {
        const pa = plateMid(e, k);
        const sx = h.x + Math.cos(pa) * 10;
        const sy = h.y + Math.sin(pa) * 10;
        const ang = mid - spread / 2 + i * step + (a.fired && n > 1 ? step / 2 : 0);
        g.fireShot(sx, sy, ang, [0, 80, 86, 90][e.phase], 'icicle', true);
        g.burst(sx, sy, 2, 40, FROST);
      });
      if (n) sfx.shatter();
      a.fired++;
    }
    return a.fired >= fans && a.t > warn + (fans - 1) * 0.45 + 0.5;
  },

  // Frost beam: two dotted guide lines show the slice of the screen the beam
  // will sweep (from the bright one to the dim one), centred on you; then a
  // beam of frost sweeps across it. 2 blocks. Ice stops it — hide behind a
  // slab, or get out of the slice.
  beam(e, a, dt, g) {
    const warn = [0, 0.9, 0.8, 0.7][e.phase];
    const width = [0, 0.55, 0.65, 0.75][e.phase];
    const sweep = 0.9;
    if (!a.arc) {
      const m = nose(e);
      const pc = g.playerCenter();
      const mid = Math.atan2(pc.y - m.y, pc.x - m.x);
      const dir = g.rand() < 0.5 ? 1 : -1;
      a.arc = { from: mid - (dir * width) / 2, to: mid + (dir * width) / 2 };
      e.beamGuide = a.arc;
      sfx.charge(warn);
    }
    if (a.t < warn) {
      e.glow = 1;
      return false;
    }
    e.beamGuide = null;
    const k = clamp((a.t - warn) / sweep, 0, 1);
    if (!a.on) {
      a.on = true;
      sfx.beam(sweep + 0.15);
    }
    if (a.t < warn + sweep + 0.15) {
      const m = nose(e);
      const ang = a.arc.from + (a.arc.to - a.arc.from) * k;
      const end = rayEnd(g, m.x, m.y, ang);
      e.beam = { x: m.x, y: m.y, ang, len: end.len };
      if (g.playerVulnerable()) {
        for (let s = 6; s < end.len; s += 2) {
          const px = m.x + Math.cos(ang) * s;
          const py = m.y + Math.sin(ang) * s;
          if (g.touchesPlayer(px - 1.5, py - 1.5, 3, 3)) {
            g.hurtPlayer(2, e);
            break;
          }
        }
      }
      if (Math.floor(a.t * 30) % 3 === 0) g.burst(end.x, end.y, 1, 30, FROST);
      return false;
    }
    e.beam = null;
    return a.t > warn + sweep + 0.5;
  },

  // Hailstorm: red "!" marks flash along the top of the screen (the first
  // right above you), then chunks of hail come crashing straight down under
  // each one.
  hail(e, a, dt, g) {
    const n = [0, 5, 6, 8][e.phase];
    const warn = [0, 0.9, 0.85, 0.8][e.phase];
    drift(e, dt, g, 0.5);
    if (!a.cols) {
      const pc = g.playerCenter();
      a.cols = [clamp(pc.x, 6, VIEW_W - 6)];
      for (let tries = 0; a.cols.length < n && tries < 60; tries++) {
        const x = 8 + g.rand() * (e.x - 4);
        if (a.cols.every((c) => Math.abs(c - x) > 14)) a.cols.push(x);
      }
      a.cols.forEach((x, i) => g.later(i * 0.12, () => g.warn(x, HUD_H + 2, warn, 'down')));
      sfx.warning();
    }
    // 2 chunks down each column (3 in stage 3), one after another.
    const per = e.phase === 3 ? 3 : 2;
    a.n = a.n || 0;
    while (a.n < a.cols.length * per && a.t >= warn + Math.floor(a.n / per) * 0.12 + (a.n % per) * 0.28) {
      g.fireShot(a.cols[Math.floor(a.n / per)], HUD_H + 2, Math.PI / 2, 105, 'icicle', true);
      a.n++;
    }
    return a.n >= a.cols.length * per && a.t > warn + a.cols.length * 0.12 + 0.3 * per + 0.3;
  },

  // Ice wall: the hub flashes and a wall of ice freezes up right in front of
  // it, with a gap to fly through, and drifts at you. (Your shots can break
  // through it too.) If you're right in its face, the gap forms round you.
  wall(e, a, dt, g) {
    if (a.t < 0.45) {
      e.glow = 1;
      if (!a.started) {
        a.started = true;
        sfx.charge(0.45);
      }
      return false;
    }
    if (!a.done) {
      const t = g.terrain;
      const gap = [0, 40, 38, 36][e.phase];
      const w = 14 + Math.floor(g.rand() * 5);
      const x = e.x + 1 - w;
      const p = g.player;
      const close = p.x + p.w > x - 8;
      const mid = close ? p.y + p.h / 2 : TOP_Y + gap / 2 + g.rand() * (t.floorY - TOP_Y - gap);
      const g0 = clamp(mid - gap / 2, HUD_H, t.floorY - gap);
      const pieces = [];
      if (g0 - HUD_H >= 8) pieces.push({ x, w, y: HUD_H, h: g0 - HUD_H });
      if (t.floorY - (g0 + gap) >= 8) pieces.push({ x, w, y: g0 + gap, h: t.floorY - g0 - gap });
      if (pieces.every((q) => t.canPlace(q, pieces.filter((o) => o !== q)))) {
        const speed = [0, 34, 40, 46][e.phase];
        for (const q of pieces) {
          t.addSlab({ ...q, speed, seed: 1 + Math.floor(g.rand() * 999) });
          for (let i = 0; i < 6; i++) g.burst(x + w / 2, q.y + g.rand() * q.h, 2, 40, FROST);
        }
        sfx.shatter();
        a.done = a.t;
      } else if (a.t > 1.5) {
        a.done = a.t; // no room for a wall right now (other ice in the way)
      }
      return false;
    }
    return a.t - a.done > 0.6;
  },

  // Saw blades: the ring spins up with a grinding whine and its teeth glint,
  // then it flings 2–4 spinning blades at you. They curve back to it like
  // boomerangs (so they pass you twice). 2 blocks each.
  blades(e, a, dt, g) {
    const n = [0, 2, 3, 4][e.phase];
    const warn = 0.6;
    if (!a.started) {
      a.started = true;
      sfx.grind(warn + 0.3);
    }
    e.spinBoost = 2.5;
    if (a.t < warn) {
      e.glint = 1;
      return false;
    }
    a.n = a.n || 0;
    if (a.n < n && a.t >= warn + a.n * 0.3) {
      const h = hub(e);
      const pc = g.playerCenter();
      const toYou = Math.atan2(pc.y - h.y, pc.x - h.x);
      // The first one straight at you, the rest either side.
      const off = a.n === 0 ? 0 : (a.n % 2 ? 1 : -1) * (0.3 + 0.12 * Math.floor((a.n - 1) / 2));
      const ang = toYou + off;
      g.spawnEnemy('sawBlade', h.x + Math.cos(ang) * 30 - 4, h.y + Math.sin(ang) * 30 - 4, {
        vx: Math.cos(ang) * 145, vy: Math.sin(ang) * 145, owner: e, byBoss: true,
      });
      sfx.grind(0.2);
      a.n++;
    }
    return a.n >= n && a.t > warn + n * 0.3 + 0.4;
  },

  // Frost mines (stage 2+): a hatch on its hub blinks, then it spits out 3–4
  // frost mines (the same ones the Cryo Layers drop).
  mines(e, a, dt, g) {
    const n = e.phase === 3 ? 4 : 3;
    drift(e, dt, g, 0.5);
    if (a.t < 0.5) {
      light(e, 'hatch');
      return false;
    }
    a.n = a.n || 0;
    if (a.n < n && a.t >= 0.5 + a.n * 0.25) {
      const m = nose(e);
      const vy = (a.n % 2 ? 1 : -1) * (40 + g.rand() * 90);
      g.spawnEnemy('frostMine', m.x - 6, m.y - 3, { vy, byBoss: true });
      g.burst(m.x, m.y, 4, 40, FROST);
      sfx.mortar();
      a.n++;
    }
    return a.n >= n && a.t > 0.5 + n * 0.25 + 0.4;
  },

  // Blizzard (stage 3): it howls and snow starts streaking past; then for 4 s
  // a wind blows you back towards the left edge (it doesn't hurt — hold
  // right), while it keeps firing icicle fans at you.
  blizzard(e, a, dt, g) {
    const warn = 1.0;
    const blow = 4;
    if (!a.started) {
      a.started = true;
      sfx.howl(warn + blow);
      a.fans = [];
    }
    e.wind = a.t < warn ? (a.t / warn) * 0.35 : a.t < warn + blow ? 1 : Math.max(0, 1 - (a.t - warn - blow) * 2);
    if (a.t >= warn && a.t < warn + blow && g.state === 'playing' && !(g.player.entering > 0)) {
      const p = g.player;
      p.x = Math.max(2, p.x - 34 * dt);
    }
    // Fans during the wind (each runs as its own little attack).
    for (const at of [warn + 0.6, warn + 2.4]) {
      if (a.t >= at && !a.fans.some((f) => f.at === at)) a.fans.push({ at, t: 0, done: false });
    }
    for (const f of a.fans) {
      if (f.done) continue;
      f.t += dt;
      f.done = ATTACKS.fan(e, f, dt, g);
    }
    if (a.t > warn + blow + 0.5 && a.fans.every((f) => f.done)) {
      e.wind = 0;
      return true;
    }
    return false;
  },
};

// ---------------------------------------------------------------- the boss
export const GLACIER_WARDEN_TYPE = {
  boss: true,
  name: 'GLACIER WARDEN',
  title: 'KEEPER OF THE RING',
  taunt: 'THIS RING IS FUCKING MINE',
  stageLines: [null, null, 'YOU CRACKED MY FUCKING ICE', 'FREEZE, YOU LITTLE SHIT'],
  killLines: ['FROZEN SOLID', 'SHATTERED. FUCKING PATHETIC', 'ANOTHER ONE FOR THE ICE', 'STAY FROZEN'],
  voice: 'metal',
  music: 'glacier',
  hp: 250,
  score: 7000,
  explodeSize: 2,

  init(e) {
    buildWardenArt();
    e.w = WARDEN_W;
    e.h = WARDEN_H;
    e.x = HOME_X;
    e.y = Math.round((HUD_H + VIEW_H) / 2 - WARDEN_H / 2);
    e.mode = 'enter';
    e.timer = 0;
    e.phase = 1;
    e.ringAng = 0;
    e.spin = 0;
    e.hubAng = 0;
    e.hubDir = 1;
    e.flipT = 4;
    e.jolt = 0;
    e.spinBoost = 1;
    e.plates = Array.from({ length: PLATES }, () => ({ hp: PLATE_HP, grow: 0, flash: 0 }));
    e.attack = null;
    e.last = null;
    e.idle = 1;
    e.lightT = 0;
    e.glow = 0;
    e.glint = 0;
    e.wind = 0;
    e.wobble = 0;
    e.beam = null;
    e.beamGuide = null;
    // The giant slab of ice it hides behind as it arrives.
    e.block = { x: VIEW_W + 6, w: 92, h: 104, seed: 77, crack: 0 };
  },

  update(e, dt, g) {
    e.timer += dt;
    e.wobble = 0;
    e.glow = 0;
    e.glint = 0;
    e.lightT = Math.max(0, e.lightT - dt);
    const spinWant = e.mode === 'dying' ? 0 : SPIN[e.phase] * e.spinBoost;
    e.spin += clamp(spinWant - e.spin, -dt * 4, dt * 4);
    e.spinBoost = 1;
    e.ringAng += e.spin * dt;
    // The plates turn (not while it's dying); in stage 3 it suddenly
    // reverses now and then, with a grinding jolt.
    if (e.mode !== 'dying') {
      if (e.phase === 3 && (e.flipT -= dt) <= 0) {
        e.flipT = 3 + g.rand() * 2;
        e.hubDir = -e.hubDir;
        e.jolt = 0.3;
        sfx.grind(0.25);
      }
      if (e.jolt > 0) {
        e.jolt -= dt;
        e.wobble = 1.5; // the jolt of it reversing
      }
      e.hubAng += HUB_SPIN[e.phase] * e.hubDir * dt;
    }
    for (const P of e.plates) P.flash = Math.max(0, P.flash - dt);
    const set = (mode) => {
      e.mode = mode;
      e.timer = 0;
    };
    if (e.phase === 3 && e.mode !== 'dying' && e.mode !== 'enter') burning(e, g);

    switch (e.mode) {
      case 'enter': {
        // A giant slab of ice drifts in and stops; it shudders and cracks...
        // and the Warden bursts out of it.
        const B = e.block;
        if (!e.entered) {
          e.entered = true;
          g.darkenTo(0.35);
          sfx.quake();
        }
        B.x += (HOME_X - 6 - B.x) * Math.min(1, dt * 1.6);
        if (e.timer > 2.2) {
          if (!B.cracking) {
            B.cracking = true;
            sfx.crack();
          }
          B.crack = Math.min(1, (e.timer - 2.2) / 1.0);
          e.wobble = 0;
          g.shake = Math.max(g.shake, 1 + B.crack * 2);
        }
        if (e.timer > 3.2) {
          const by = e.y + WARDEN_H / 2 - B.h / 2;
          for (let i = 0; i < 40; i++) g.burst(B.x + g.rand() * B.w, by + g.rand() * B.h, 2, 90, ICE_COLORS.slice(1));
          sfx.shatter();
          sfx.iceRoar();
          g.shake = 7;
          g.flash = 0.12;
          e.block = null;
          e.spin = 9; // it bursts out spinning hard
          set('intro');
          g.showTitle(GLACIER_WARDEN_TYPE);
        }
        break;
      }
      case 'intro':
        e.wobble = 1;
        e.spinBoost = 3;
        if (e.timer > 2.4) {
          g.darkenTo(0);
          set('taunt');
        }
        break;
      case 'taunt':
        // It holds back and taunts you once its name card has gone, and only
        // starts the fight when it's finished talking. (Skipped if you've
        // just died.)
        drift(e, dt, g, 0.3);
        if (!g.title && !e.taunted) {
          e.taunted = true;
          if (g.state === 'playing') g.say(e, GLACIER_WARDEN_TYPE.taunt);
        }
        if (e.taunted && g.bossMayAttack(e)) {
          set('fight');
          e.idle = 0.6;
        }
        break;
      case 'fight':
        refreeze(e, dt, g);
        if (!e.attack) {
          drift(e, dt, g);
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
      case 'transition':
        // Its old plates blew off; a fresh set freezes over the core while
        // it's untouchable and furious. It doesn't attack again until it has
        // finished shouting.
        e.wobble = 2;
        e.spinBoost = 2;
        for (const P of e.plates) {
          if (P.hp <= 0) {
            P.grow = Math.min(1, e.timer / 1.8);
            if (P.grow >= 1) {
              P.hp = PLATE_HP;
              P.grow = 0;
            }
          }
        }
        if (e.timer > 1.9 && g.bossMayAttack(e)) {
          for (const P of e.plates) {
            P.hp = PLATE_HP;
            P.grow = 0;
          }
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
    return hub(e);
  },

  // Supply pods fly in on the other side of the screen from it.
  supplyY(e, g) {
    const lowHalf = e.y + HUB.y > (HUD_H + VIEW_H) / 2;
    return lowHalf ? HUD_H + 6 + g.rand() * 24 : VIEW_H - 34 + g.rand() * 16;
  },

  onScreen(e) {
    return e.mode !== 'enter';
  },

  // Bumping into it shoves you clear: back out the way you came (in front
  // of it, or behind it if you got round the back), or, if that would push
  // you off the screen, up or down away from its hub.
  knockback(e, p) {
    const behind = p.x + p.w / 2 > e.x + HUB.x;
    const x = behind ? e.x + WARDEN_W + 2 : e.x - p.w - 3;
    if (x >= 2 && x <= VIEW_W - p.w - 2) {
      p.x = x;
    } else {
      const above = p.y + p.h / 2 < e.y + HUB.y;
      p.y = above ? Math.max(HUD_H + 1, e.y - p.h - 2) : Math.min(VIEW_H - p.h - 1, e.y + WARDEN_H + 2);
    }
  },

  contactDamage() {
    return 2;
  },

  // The core can be hurt once there's a gap in its plates (a shot gets
  // through only while the gap faces it).
  isVulnerable(e) {
    return e.mode === 'fight' && coreOpen(e);
  },

  // Your ship touching it (the ring, the hub, the body).
  hitTest(e, x, y, w, h) {
    return scan(e, x, y, w, h, false);
  },

  // Your shots (bullets, rockets, the laser): what they reach first, flying
  // right: an ice plate, the core (only once it's open) or armour. It
  // remembers which plate (or the core) for the shield hook.
  shotTest(e, x, y, w, h) {
    return scan(e, x, y, w, h, true);
  },

  // Hits on its ice plates crack them instead of hurting it. A bomb (it
  // hits everything at once, at BOMB_DAMAGE) shatters every plate.
  shield(e, amount, g) {
    if (e.mode !== 'fight') return false;
    if (amount >= BOMB_DAMAGE) {
      // A bomb: every plate still there shatters.
      let any = false;
      e.plates.forEach((P, k) => {
        if (plateUp(P)) {
          breakPlate(e, k, g);
          any = true;
        }
      });
      return any;
    }
    const k = e.hitPlate;
    if (k < 0) return false; // the core itself
    const P = e.plates[k];
    P.flash = 0.06;
    if (P.hp > 0) {
      P.hp -= amount;
      if (P.hp <= 0) breakPlate(e, k, g);
      else sfx.iceChip();
    } else {
      // Freezing back over: each hit knocks the frost back.
      P.grow -= amount / PLATE_HP;
      if (P.grow <= 0) {
        P.grow = 0;
        P.wait = FROST_PAUSE;
        g.burst(e.x + HUB.x - 8, e.y + HUB.y, 4, 30, FROST);
      }
      sfx.iceChip();
    }
    return true;
  },

  onHit(e, g, x, y) {
    g.burst(x, y, 3, 50, [PAL.amberLight, PAL.cream]);
    const next = e.phase === 1 && e.hp <= e.maxHp * 0.66 ? 2 : e.phase === 2 && e.hp <= e.maxHp * 0.33 ? 3 : 0;
    if (next && e.hp > 0) {
      e.phase = next;
      e.mode = 'transition';
      e.timer = 0;
      e.attack = null;
      e.beam = null;
      e.beamGuide = null;
      e.wind = 0;
      // Every plate left blows off in a burst of ice (they freeze back
      // during the transition).
      e.plates.forEach((P, k) => {
        if (plateUp(P)) breakPlate(e, k, g, false);
        P.grow = 0;
      });
      const h = hub(e);
      for (let i = 0; i < 5; i++) {
        const px = e.x + 44 + g.rand() * 30;
        const py = e.y + 20 + g.rand() * 28;
        g.blasts.blast(px, py, 0.6);
        g.gore.chunks(px, py, 3, METAL, 100, false);
      }
      for (let i = 0; i < 16; i++) g.burst(h.x, h.y, 3, 110, ICE_COLORS.slice(1));
      sfx.crack();
      sfx.iceRoar();
      g.shake = 8;
      g.flash = 0.12;
      g.say(e, GLACIER_WARDEN_TYPE.stageLines[next], 'roar');
      g.stageBonus(e, next);
    }
  },

  draw(e, ctx, snap, g) {
    const wx = e.wobble ? Math.round((Math.random() - 0.5) * 2 * e.wobble) : 0;
    const x = snap(e.x) + wx;
    const y = snap(e.y);
    if (e.block) {
      drawBlock(e, ctx, snap, g);
      return;
    }
    const stage = e.mode === 'dying' ? 2 : e.phase - 1;
    if (!e.ringGone) {
      ctx.drawImage(WARDEN.bodies[stage], x, y);
      const frame = Math.floor(((e.ringAng / ((Math.PI * 2) / TEETH)) % 1 + 1) % 1 * RING_FRAMES) % RING_FRAMES;
      ctx.drawImage(WARDEN.ring[frame], x, y);
      ctx.drawImage(WARDEN.hub, x, y);
      drawWardenCore(ctx, x + HUB.x, y + HUB.y, g.time, e.flash > 0);
      drawWardenPlates(ctx, x + HUB.x, y + HUB.y, e.plates, e.hubAng);
    } else {
      ctx.drawImage(WARDEN.bodies[2], x, y);
    }
    const blink = Math.floor(g.time * 16) % 2 === 0;
    // The hub's front glows before it fires (icicles, beam, wall).
    if (e.glow && blink) {
      ctx.fillStyle = ICE_COLORS[3];
      fillDisc(ctx, x + NOSE.x, y + NOSE.y + 0.5, 2.5);
      ctx.fillStyle = PAL.cream;
      fillDisc(ctx, x + NOSE.x + 0.5, y + NOSE.y + 0.5, 1.5);
    }
    // The saw teeth glint before it throws blades.
    if (e.glint && blink) {
      ctx.fillStyle = PAL.cream;
      // (A small four-pointed sparkle on each tooth.)
      for (const t of toothTips(e.ringAng)) {
        const tx = x + snapFine(t.x);
        const ty = y + snapFine(t.y);
        ctx.fillRect(tx - FINE, ty, FINE * 3, FINE);
        ctx.fillRect(tx, ty - FINE, FINE, FINE * 3);
      }
    }
    // A hatch blinking: mines are coming.
    if (e.lightT > 0 && blink) {
      ctx.fillStyle = PAL.amberLight;
      fillDisc(ctx, x + NOSE.x + 0.5, y + NOSE.y + 10.5, 1.5);
    }
    // Frost beam guide lines: dotted, the bright one where the beam starts
    // and the dim one where it stops.
    if (e.beamGuide && Math.floor(g.time * 14) % 2 === 0) {
      const m = nose(e);
      // (Each one dashed stroke a pixel thick, like the other aim lines.)
      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([1.5, 2.5]);
      [[e.beamGuide.from, ICE_COLORS[4]], [e.beamGuide.to, ICE_COLORS[2]]].forEach(([ang, col]) => {
        const end = rayEnd(g, m.x, m.y, ang);
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(ang) * 6, m.y + Math.sin(ang) * 6);
        ctx.lineTo(m.x + Math.cos(ang) * end.len, m.y + Math.sin(ang) * end.len);
        ctx.stroke();
      });
      ctx.restore();
    }
    // The beam itself: a pale shaft with a white-hot middle.
    if (e.beam) {
      // (Three strokes, outside in: a deep blue edge, the pale shaft and
      // its white-hot core, flickering a little.)
      const { x: bx, y: by, ang, len } = e.beam;
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      const flick = Math.floor(g.time * 30) % 2 ? FINE : 0;
      ctx.save();
      ctx.lineCap = 'round';
      [[ICE_COLORS[1], 3.5 + flick], [ICE_COLORS[3], 2.5], [ICE_COLORS[4], 1 + flick]].forEach(([col, wdt]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = wdt;
        ctx.beginPath();
        ctx.moveTo(bx + ux * 2, by + uy * 2);
        ctx.lineTo(bx + ux * len, by + uy * len);
        ctx.stroke();
      });
      ctx.restore();
    }
    // Blizzard: snow streaking past from right to left, thicker as it blows.
    if (e.wind > 0) {
      const n = Math.round(60 * e.wind);
      for (let i = 0; i < n; i++) {
        const seed = i * 97.31;
        const sy = HUD_H + ((seed * 7.7) % (VIEW_H - HUD_H));
        const sx = VIEW_W - ((g.time * (260 + (i % 5) * 40) + seed * 13) % (VIEW_W + 30));
        // (Thin streaks with a bright head.)
        const len = 4 + (i % 3) * 2;
        ctx.fillStyle = ICE_COLORS[i % 3 ? 2 : 3];
        ctx.fillRect(snapFine(sx), snapFine(sy), len, FINE);
        ctx.fillStyle = ICE_COLORS[4];
        ctx.fillRect(snapFine(sx), snapFine(sy), 1, FINE);
      }
    }
  },
};

// What a rectangle reaches first, scanning from its left edge rightwards
// (your shots fly right). remember: note the plate (or core) it hit.
function scan(e, x, y, w, h, remember) {
  if (e.mode === 'dying' || e.mode === 'enter') return null;
  const rx0 = Math.max(0, Math.floor(x - e.x));
  const rx1 = Math.min(WARDEN_W - 1, Math.floor(x + w - e.x));
  if (rx1 < rx0) return null;
  const ry = y - e.y;
  // A shot counts along its centre line (bullets and the laser alike); your
  // ship by its whole height.
  const rows = remember || h <= 2 ? [ry + h / 2] : [ry + h / 2, ry + 0.5, ry + h - 0.5];
  const up = (k) => plateUp(e.plates[k]);
  for (let cx = rx0; cx <= rx1; cx++) {
    let code = 0;
    for (const r of rows) {
      let c = wardenAt(cx, r, up, e.hubAng);
      if (c === RING && remember) c = 0; // shots fly through the saw ring's open spokes
      if (c && (!code || soft(c))) code = c; // plates and the core before armour
      if (soft(code)) break;
    }
    if (!code) continue;
    if (code >= PLATE && e.mode === 'fight') {
      if (remember) e.hitPlate = code - PLATE;
      return 'hit';
    }
    if (code === CORE && e.mode === 'fight') {
      if (remember) e.hitPlate = -1;
      return 'hit';
    }
    return 'block';
  }
  return null;
}

function startAttack(e, g) {
  e.beam = null;
  e.beamGuide = null;
  e.wind = 0;
  // (Its fans and walls are made of its own ice: none without plates.)
  const options = MOVESETS[e.phase].filter((n) => n !== e.last && (whole(e) > 0 || (n !== 'fan' && n !== 'wall')));
  const name = options[Math.floor(g.rand() * options.length)];
  e.last = name;
  e.attack = { name, t: 0 };
}

// A plate shatters in a burst of ice (+50 points when you break it).
function breakPlate(e, k, g, points = true) {
  const P = e.plates[k];
  P.hp = 0;
  P.grow = 0;
  P.wait = REFREEZE[e.phase];
  const a = plateMid(e, k);
  const px = e.x + HUB.x + Math.cos(a) * 9;
  const py = e.y + HUB.y + Math.sin(a) * 9;
  g.burst(px, py, 14, 80, ICE_COLORS.slice(1));
  sfx.shatter();
  if (points) {
    g.score += 50;
    g.popups.push({ x: px, y: py - 6, text: '+50', t: 0.8 });
  }
}

// It freezes every broken plate back over: a plate starts to refreeze
// REFREEZE seconds after it broke (sooner each stage), and frost creeps in
// over GROW_TIME. Frost you knock out starts again after a short pause.
function refreeze(e, dt, g) {
  for (const P of e.plates) {
    if (P.hp > 0) continue;
    if (P.grow <= 0) {
      P.wait = (P.wait ?? REFREEZE[e.phase]) - dt;
      if (P.wait <= 0) P.grow = 0.02;
      continue;
    }
    P.grow += dt / GROW_TIME;
    if (P.grow >= 1) {
      P.hp = PLATE_HP;
      P.grow = 0;
      sfx.iceChip();
      g.burst(e.x + HUB.x, e.y + HUB.y, 6, 40, FROST);
    }
  }
}

// Stage 3: fire and smoke pour out of the holes in its hull.
function burning(e, g) {
  if (g.rand() > 0.35) return;
  const [sx, sy] = HOLES[Math.floor(g.rand() * 3)];
  const fire = g.rand() < 0.5;
  g.particles.push({
    x: e.x + sx, y: e.y + sy, vx: (g.rand() - 0.5) * 10 + 10, vy: -16 - g.rand() * 16,
    life: fire ? 0.35 : 0.9, max: fire ? 0.35 : 0.9,
    color: fire ? MOLTEN[Math.floor(g.rand() * 3)] : SMOKE[Math.floor(g.rand() * 3)], size: fire ? 1 : 2,
  });
}

// The giant slab of ice it arrives behind, cracking before it bursts.
let blockImg = null;
function drawBlock(e, ctx, snap, g) {
  const B = e.block;
  if (!blockImg) blockImg = slabImage(B.w, B.h, B.seed);
  const shake = B.crack ? Math.round((Math.random() - 0.5) * 2 * (1 + B.crack)) : 0;
  const bx = snap(B.x) + shake;
  const by = snap(e.y + WARDEN_H / 2 - B.h / 2);
  ctx.drawImage(blockImg, bx, by);
  if (!B.crack) return;
  // Cracks spreading out from the middle (fixed shapes, longer as it goes).
  // The cracks: thin dark lines wandering out from the middle, all drawn
  // as one path.
  const cx = bx + Math.round(B.w * 0.45);
  const cy = by + Math.round(B.h * 0.5);
  ctx.save();
  ctx.strokeStyle = ICE_COLORS[0];
  ctx.lineWidth = 0.75;
  ctx.lineJoin = 'bevel';
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    let a = k * 0.9 + 0.3;
    let px = cx + 0.5;
    let py = cy + 0.5;
    ctx.moveTo(px, py);
    const len = B.crack * (22 + (k % 3) * 9);
    for (let s = 0; s < len; s++) {
      a += Math.sin(k * 3.1 + s * 0.7) * 0.15;
      px += Math.cos(a);
      py += Math.sin(a);
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  ctx.restore();
  if (Math.floor(g.time * 10) % 2 === 0) {
    ctx.fillStyle = ICE_COLORS[4];
    fillDisc(ctx, cx + 0.5, cy + 0.5, 1.5);
  }
}

// Its death: its plates shatter, explosions run over the hull, the saw ring
// tears loose and spins away, then a huge blast — and the burning wreck
// falls away down the screen, towards the ice planet below.
function dying(e, dt, g) {
  e.beam = null;
  e.beamGuide = null;
  e.wind = 0;
  e.wobble = 2;
  g.shake = Math.max(g.shake, 2.5);
  e.plates.forEach((P, k) => {
    if (plateUp(P) && e.timer > 0.15 * (k + 1)) breakPlate(e, k, g, false);
  });
  e.boom = (e.boom || 0) - dt;
  if (e.boom <= 0) {
    e.boom = 0.12;
    const bx = e.x + 6 + g.rand() * (WARDEN_W - 12);
    const by = e.y + 6 + g.rand() * (WARDEN_H - 12);
    g.blasts.blast(bx, by, 0.5 + g.rand() * 0.5);
    g.gore.chunks(bx, by, 3, METAL, 90, false);
    sfx.explode(0.6);
  }
  if (e.timer > 1.6 && !e.ringGone) {
    e.ringGone = true;
    const h = hub(e);
    g.gore.corpse(WARDEN.ring[0], 0, 2, 64, 64, h.x, h.y, -40, -50, 6, false);
    g.blasts.blast(h.x, h.y, 1.4);
    g.gore.chunks(h.x, h.y, 14, METAL, 120, false);
    for (let i = 0; i < 20; i++) g.burst(h.x, h.y, 3, 120, ICE_COLORS.slice(1));
    g.shake = 7;
    sfx.explode(1.4);
    sfx.grind(0.6);
  }
  if (e.timer > 3.0) {
    const cx = e.x + WARDEN_W / 2 + 10;
    const cy = e.y + WARDEN_H / 2;
    g.blasts.blast(cx, cy, 2.5);
    // The burning wreck of its engine body falls away below.
    g.gore.corpse(WARDEN.bodies[2], 40, 2, 40, 64, cx, cy, -14, 40, 0.8, false);
    g.gore.chunks(cx, cy, 40, METAL, 140, false);
    g.gore.chunks(cx, cy, 16, MOLTEN, 110, false);
    g.flash = 0.3;
    g.shake = 9;
    sfx.explode(2);
    sfx.iceRoar();
    g.finishBoss(e);
  }
}

// ---------------------------------------------------------------- its weapons
export const WARDEN_MINIONS = {
  // A spinning saw blade flung from its ring: flies out at you, slows, and
  // curves back to the ring like a boomerang (so it passes you twice).
  // It can't be shot down (your shots spark off it). 2 blocks.
  sawBlade: {
    hp: 999,
    score: 0,
    ram: 2,
    noDrop: true,
    noTarget: true, // rockets don't chase it
    init(e) {
      e.w = 9;
      e.h = 9;
      e.spinA = 0;
    },
    isVulnerable: () => false,
    hitTest(e, x, y, w, h) {
      const cx = e.x + 4.5;
      const cy = e.y + 4.5;
      const nx = clamp(cx, x, x + w);
      const ny = clamp(cy, y, y + h);
      return Math.hypot(nx - cx, ny - cy) < 4 ? 'block' : null;
    },
    update(e, dt) {
      const o = e.owner;
      e.spinA += dt * 18;
      if (!o || o.dead || o.mode === 'dying') {
        e.vx -= 60 * dt; // its ring is gone: it just flies off
      } else {
        // Pulled back towards the ring's hub.
        const hx = o.x + HUB.x - 4.5;
        const hy = o.y + HUB.y - 4.5;
        const dx = hx - e.x;
        const dy = hy - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.vx += (dx / d) * 118 * dt;
        e.vy += (dy / d) * 118 * dt;
        if (e.t > 0.8 && d < 16) {
          e.dead = true; // caught by the ring
          return;
        }
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.t > 6) e.dead = true;
    },
    draw(e, ctx, snap, g) {
      // A spinning blade (painted in rotation frames) with a blinking light.
      ctx.drawImage(bladeFrame(e.spinA), snap(e.x), snap(e.y));
      ctx.fillStyle = Math.floor(g.time * 12) % 2 ? PAL.amber : PAL.cream;
      ctx.fillRect(snap(e.x) + 4, snap(e.y) + 4, 1, 1);
    },
  },
};


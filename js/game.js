import { VIEW_W, VIEW_H, HUD_H, PAL, PLAYER } from './config.js?v=0.5.0';
import { SPRITES } from './sprites.js?v=0.5.0';
import { ENEMY_TYPES } from './enemies.js?v=0.5.0';
import { LEVELS, LevelRunner } from './levels.js?v=0.5.0';
import { Background } from './background.js?v=0.5.0';
import { Weapons, drawCapsule, pickupInfo } from './weapons.js?v=0.5.0';
import { drawText, drawTextCentered, textWidth } from './font.js?v=0.5.0';
import { buzz, HAPTIC } from './feedback.js?v=0.5.0';
import { sfx } from './audio.js?v=0.5.0';
import { clamp, rectsOverlap } from './util.js?v=0.5.0';
import { Gore, FLESH, METAL, ROCK, GLASS, HELMET } from './gore.js?v=0.5.0';
import { BLOOD } from './config.js?v=0.5.0';
import { startBossMusic, stopMusic } from './music.js?v=0.5.0';
import { PowerUps, POWERUPS, drawOrb, randomPowerup } from './powerups.js?v=0.5.0';
import { Crystals } from './crystals.js?v=0.5.0';

const DIAG = Math.SQRT1_2;
const SPARK_COLORS = [PAL.amberLight, PAL.amber, PAL.amberSoft, PAL.red, PAL.cream];
const BLOCK_COLORS = [PAL.grey, PAL.cream, PAL.bluePale];
const LIFE_BONUS = 500;
const SMART_POD = { color: PAL.cream, light: PAL.amberLight }; // light on a smart supply pod

// Things the game says when you die. Adults-only humour, as agreed.
const DEATH_LINES = [
  'SPLATTERED ACROSS THE BELT',
  'WHAT A FUCKING MESS',
  'SPACE MEAT',
  'THAT LOOKED PAINFUL AS HELL',
  'SHIT. TRY AGAIN.',
  'THEY WILL NEED A MOP',
];

export class Game {
  constructor({ startAt = 0 } = {}) {
    this.rand = Math.random;
    this.startAt = startAt; // testing aid: skip ahead in the level
    this.levelIndex = 0;
    this.weapons = new Weapons(this);
    this.powerups = new PowerUps(this);
    this.crystals = new Crystals(this);
    this.gore = new Gore(this.rand);
    this.pickupInfo = (kind) =>
      kind === 'smart' ? SMART_POD : POWERUPS[kind] || pickupInfo(kind);
    this.reset();
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  reset() {
    this.score = 0;
    this.lives = PLAYER.lives;
    this.health = PLAYER.health;
    this.hurtFlash = 0;
    this.lowBeep = 0;
    this.state = 'playing'; // 'playing' | 'dying' | 'gameover' | 'clear'
    this.stateTimer = 0;
    this.time = 0;
    this.player = {
      x: -18,
      y: VIEW_H / 2 - 5,
      w: SPRITES.player.width,
      h: SPRITES.player.height,
      invuln: PLAYER.respawnInvuln,
      cooldown: 0,
      entering: 0.5,
      moveX: 0,
    };
    this.bullets = [];
    this.enemyShots = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.popups = [];
    this.timers = [];
    this.toast = null;
    this.shake = 0;
    this.flash = 0;
    this.boss = null;
    this.warning = null;
    this.banner = { t: 0 };
    this.bonus = 0;
    this.markers = [];
    this.darken = 0;
    this.darkenTarget = 0;
    this.title = null;
    this.quip = '';
    this.gore.reset();
    stopMusic(0.3);
    this.bg = new Background(this.rand, this.level.background);
    this.weapons.reset();
    this.powerups.reset();
    this.crystals.reset();
    this.section = null;
    this.runner = new LevelRunner(this, this.level);
    if (this.startAt) {
      const bossAt = this.level.events.find((ev) => ev[1] === 'boss')[0];
      this.runner.skipTo(this.startAt === 'boss' ? bossAt - 0.5 : this.startAt);
      this.banner = null;
      this.weapons.kind = 'laser';
      this.weapons.ammo = 3;
    }
  }

  // ---- helpers used by enemies, patterns and weapons ----
  spawnEnemy(type, x, y, opts = {}) {
    const T = ENEMY_TYPES[type];
    const spr = T.sprite ? SPRITES[T.sprite] : null;
    const e = {
      type,
      T,
      x,
      y,
      w: spr ? spr.width : 8,
      h: spr ? spr.height : 8,
      hp: T.hp,
      t: 0,
      flash: 0,
      ...opts,
    };
    T.init(e, this);
    e.maxHp = e.hp;
    this.enemies.push(e);
    if (T.boss) this.boss = e;
    return e;
  }

  spawnPickup(kind, x, y) {
    if (kind) this.pickups.push({ kind, x, y, baseY: y, t: 0 });
  }

  // Specials and extra lives go to the weapon system; the rest are
  // automatic power-ups.
  collectPickup(kind) {
    if (POWERUPS[kind]) this.powerups.collect(kind);
    else this.weapons.collect(kind);
  }

  // Tough enemies sometimes leave a power-up behind.
  // When you're hurt (2 health blocks or fewer), drops get more likely and
  // lean towards Repair. At full health they stay as they are.
  maybeDrop(e) {
    if (e.byBoss) return;
    const hurt = this.health <= 2;
    let chance = e.T.dropChance || 0;
    if (hurt) chance = chance * 2.5 + 0.06;
    if (chance && this.rand() < chance) {
      const kind = hurt && this.rand() < 0.6 ? 'repair' : randomPowerup(this.rand);
      this.spawnPickup(kind, e.x + e.w / 2 - 4, e.y + e.h / 2 - 4);
    }
  }

  // Every 25 Ember Crystals: a free power-up, chosen like a smart pod.
  emberSurge() {
    const kind = this.smartSupply();
    this.collectPickup(kind);
    const p = this.player;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 24, 90, [PAL.amberLight, PAL.amber, PAL.cream]);
    this.flash = Math.max(this.flash, 0.08);
    sfx.surge();
    this.showToast('EMBER SURGE');
  }

  // Name of a new part of the level, shown briefly at the top.
  showSection(name) {
    this.section = { name, t: 0 };
  }

  // What a smart supply pod gives you: whatever you need most right now.
  smartSupply() {
    if (this.health <= 2) return 'repair';
    if (!this.powerups.has('shield')) return 'shield';
    if (this.health < PLAYER.health) return 'repair';
    if (this.weapons.kind !== 'laser' || this.weapons.ammo < 2) return 'laser';
    return this.rand() < 0.5 ? 'rapid' : 'spread';
  }

  fireAtPlayer(x, y, speed) {
    const p = this.player;
    const a = Math.atan2(p.y + p.h / 2 - y, p.x + p.w / 2 - x);
    this.fireShot(x, y, a, speed);
  }

  // kind: 'orb' (glowing enemy bullet) or 'gravel' (a stone, from bosses).
  fireShot(x, y, angle, speed, kind = 'orb', byBoss = false) {
    this.enemyShots.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, t: 0, kind, byBoss,
    });
  }

  // A flashing warning marker, shown before something arrives there.
  warn(x, y, dur = 0.8, dir = 'down') {
    this.markers.push({ x, y, t: 0, dur, dir });
  }

  darkenTo(v) {
    this.darkenTarget = v;
  }

  showTitle(T) {
    this.title = { T, t: 0 };
  }

  later(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  showToast(text) {
    this.toast = { text, t: 1.4 };
  }

  nearestEnemy(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.dead || e.mode === 'dying' || e.x > VIEW_W || e.x + e.w < 0) continue;
      const tp = this.aimPoint(e);
      const d = Math.hypot(tp.x - x, tp.y - y) + (tp.x < x ? 80 : 0); // prefer targets ahead
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  aimPoint(e) {
    return e.T.aimPoint ? e.T.aimPoint(e) : { x: e.x + e.w / 2, y: e.y + e.h / 2 };
  }

  // Does a rectangle touch this enemy? Returns 'hit', 'block' or null.
  contact(e, x, y, w, h) {
    if (e.T.hitTest) return e.T.hitTest(e, x, y, w, h);
    const i = e.T.inset ?? 1;
    return rectsOverlap(x, y, w, h, e.x + i, e.y + i, e.w - i * 2, e.h - i * 2) ? 'hit' : null;
  }

  hits(e, x, y, w, h) {
    return this.contact(e, x, y, w, h) !== null;
  }

  // Hit an enemy with something that has a position (shot, rocket, beam).
  strike(e, x, y, w, h, amount) {
    const res = this.contact(e, x, y, w, h);
    if (res === 'hit') this.damage(e, amount, x + w, y + h / 2);
    else if (res === 'block') this.blocked(x + w, y + h / 2);
    return res;
  }

  // Damage an enemy. Bosses ignore damage while armoured.
  damage(e, amount, hx = e.x + e.w / 2, hy = e.y + e.h / 2) {
    if (e.dead || e.mode === 'dying') return;
    if (e.T.isVulnerable && !e.T.isVulnerable(e)) {
      this.blocked(e.x + e.w / 3, e.y + e.h / 2);
      return;
    }
    e.hp -= amount;
    if (e.T.onHit) e.T.onHit(e, this, hx, hy, amount);
    else if (e.T.organic) this.gore.blood(hx, hy, 4, 50, 0, 1.4);
    // Flash pale when hit, but not on every tick of a laser, or the enemy
    // would turn into a solid white shape.
    if (!(e.flashCd > 0)) {
      e.flash = 0.06;
      e.flashCd = 0.13;
    }
    sfx.hit();
    if (e.hp <= 0) {
      if (e.T.boss) this.startBossDeath(e);
      else this.killEnemy(e);
    }
  }

  blocked(x, y) {
    if (this.rand() < 0.6) {
      this.burst(x, y, 3, 50, BLOCK_COLORS);
    }
    sfx.block();
  }

  // ---- simulation ----
  update(dt, input) {
    this.time += dt;
    this.bg.update(dt);
    this.updateEffects(dt);

    for (const tm of this.timers) {
      tm.t -= dt;
      if (tm.t <= 0) {
        tm.done = true;
        tm.fn();
      }
    }
    this.timers = this.timers.filter((tm) => !tm.done);
    for (const m of this.markers) m.t += dt;
    this.markers = this.markers.filter((m) => m.t < m.dur);
    this.darken += clamp(this.darkenTarget - this.darken, -dt * 0.8, dt * 0.8);
    if (this.title && (this.title.t += dt) > 3.6) this.title = null;
    this.gore.update(dt);

    if (this.state === 'gameover') {
      this.stateTimer += dt;
      this.moveWorld(dt);
      if (input.tap && this.stateTimer > 1.1) this.reset();
      return;
    }

    if (this.state === 'clear') {
      this.stateTimer += dt;
      // The ship flies off to the right in triumph.
      const p = this.player;
      if (this.stateTimer > 1.2) p.x += (this.stateTimer - 1.2) * 160 * dt;
      p.moveX = 1;
      this.moveWorld(dt);
      if (input.tap && this.stateTimer > 3) this.reset();
      return;
    }

    if (this.state === 'playing') {
      this.updatePlayer(dt, input);
    } else if (this.state === 'dying') {
      this.stateTimer += dt;
      if (this.stateTimer > 1.4) {
        if (this.lives > 0) this.respawn();
        else {
          this.state = 'gameover';
          this.stateTimer = 0;
        }
      }
    }

    this.runner.update(dt);
    this.weapons.update(dt);
    this.powerups.update(dt, input);
    this.crystals.update(dt);
    if (this.state === 'playing' && this.health === 1) {
      // Warning beeps and smoke when you're on your last health block.
      this.lowBeep -= dt;
      if (this.lowBeep <= 0) {
        this.lowBeep = 1.1;
        sfx.lowHealth();
      }
      const p = this.player;
      if (this.rand() < dt * 25) {
        this.particles.push({
          x: p.x + 4 + this.rand() * 6, y: p.y + 3, vx: -25 - this.rand() * 15, vy: -8 + this.rand() * 6,
          life: 0.5, max: 0.5, color: this.rand() < 0.3 ? PAL.amber : PAL.grey, size: this.rand() < 0.5 ? 2 : 1,
        });
      }
    }
    this.moveWorld(dt);
    this.collide();
  }

  updatePlayer(dt, input) {
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - dt);

    if (p.entering > 0) {
      // Glide in from the left edge after (re)spawning.
      p.entering -= dt;
      p.x += (22 - p.x) * Math.min(1, dt * 9);
      p.moveX = 1;
      return;
    }

    let { dx, dy } = input;
    if (dx && dy) {
      dx *= DIAG;
      dy *= DIAG;
    }
    p.moveX = dx;
    p.x = clamp(p.x + dx * PLAYER.speed * dt, 2, VIEW_W - p.w - 2);
    p.y = clamp(p.y + dy * PLAYER.speed * dt, HUD_H + 1, VIEW_H - p.h - 1);

    p.cooldown -= dt;
    if (input.fire && p.cooldown <= 0) {
      this.bullets.push({ x: p.x + p.w - 3, y: p.y + 5, vy: 0 });
      if (this.powerups.has('spread')) {
        this.bullets.push({ x: p.x + p.w - 4, y: p.y + 4, vy: -55 });
        this.bullets.push({ x: p.x + p.w - 4, y: p.y + 6, vy: 55 });
      }
      p.cooldown = this.powerups.fireInterval();
      sfx.shoot();
    }
    if (input.special) this.weapons.fire();
  }

  moveWorld(dt) {
    for (const b of this.bullets) {
      b.x += PLAYER.bulletSpeed * dt;
      b.y += (b.vy || 0) * dt;
    }
    this.bullets = this.bullets.filter((b) => b.x < VIEW_W + 8 && b.y > -4 && b.y < VIEW_H + 4 && !b.dead);

    for (const e of this.enemies) {
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.flashCd = (e.flashCd || 0) - dt;
      e.T.update(e, dt, this);
    }
    this.enemies = this.enemies.filter(
      (e) => !e.dead && (e.T.boss || (e.x > -e.w - 30 && e.x < VIEW_W + 90 && e.y > -60 && e.y < VIEW_H + 60)),
    );

    for (const s of this.enemyShots) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.enemyShots = this.enemyShots.filter(
      (s) => !s.dead && s.x > -6 && s.x < VIEW_W + 6 && s.y > -6 && s.y < VIEW_H + 6,
    );

    for (const pk of this.pickups) {
      pk.t += dt;
      pk.x -= 20 * dt;
      pk.y = pk.baseY + Math.sin(pk.t * 3) * 4;
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken && pk.x > -12);
  }

  updateEffects(dt) {
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (!q.noDrag) {
        q.vx *= 1 - 2.2 * dt;
        q.vy *= 1 - 2.2 * dt;
      }
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const pp of this.popups) {
      pp.t -= dt;
      pp.y -= 10 * dt;
    }
    this.popups = this.popups.filter((pp) => pp.t > 0);
    if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null;
    if (this.banner && (this.banner.t += dt) > 3.6) this.banner = null;
    if (this.warning && (this.warning.t += dt) > 2.6) this.warning = null;
    if (this.section && (this.section.t += dt) > 2.4) this.section = null;
    this.shake = Math.max(0, this.shake - dt * 14);
    this.flash = Math.max(0, this.flash - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
  }

  collide() {
    // Player shots hitting enemies.
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (this.strike(e, b.x, b.y, 7, 2, 1)) {
          b.dead = true;
          break;
        }
      }
    }

    const p = this.player;
    if (this.state !== 'playing' || p.entering > 0) return;

    // Pickups: generous grab area (the whole ship).
    for (const pk of this.pickups) {
      if (rectsOverlap(p.x, p.y, p.w, p.h, pk.x - 1, pk.y - 1, 11, 11)) {
        pk.taken = true;
        this.collectPickup(pk.kind);
      }
    }

    // Anything hitting the player. The player's hitbox is smaller than the
    // drawing so scrapes that look like near-misses really are misses.
    if (p.invuln > 0) return;
    const hx = p.x + 5;
    const hy = p.y + 3;
    const hw = p.w - 9;
    const hh = p.h - 6;
    for (const s of this.enemyShots) {
      if (rectsOverlap(hx, hy, hw, hh, s.x - 1.5, s.y - 1.5, 3, 3)) {
        s.dead = true;
        this.hurtPlayer(s.dmg || 1, s);
        return;
      }
    }
    for (const e of this.enemies) {
      if (e.dead || e.T.harmless) continue;
      if (this.contact(e, hx, hy, hw, hh)) {
        const dmg = e.T.contactDamage ? e.T.contactDamage(e, this) : e.T.ram ?? 2;
        if (e.T.boss || e.T.solid) {
          // Bounced off a boss or boulder: knocked back so you don't keep
          // scraping it.
          p.x = clamp(p.x - 14, 2, VIEW_W - p.w - 2);
        } else {
          this.killEnemy(e);
        }
        this.hurtPlayer(dmg, e);
        return;
      }
    }
  }

  killEnemy(e) {
    e.dead = true;
    this.score += e.T.score;
    const size = e.T.explodeSize ?? (e.T.hp > 1 ? 0.8 : 0.4);
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const gore = e.T.gore || {};
    // Bloody kills get fewer sparks so the blood reads clearly.
    const sparks = Math.round((10 + size * 14) * (gore.blood && BLOOD ? 0.4 : 1));
    this.burst(cx, cy, sparks, 60 + size * 20);
    sfx.explode(size);
    if (gore.blood) {
      this.gore.blood(cx, cy, gore.blood, 75);
      this.gore.chunks(cx, cy, gore.flesh || 0, FLESH, 70);
      if (gore.splat) this.gore.splat(cx, cy, gore.splat);
      sfx.splat();
    }
    if (gore.metal) this.gore.chunks(cx, cy, gore.metal, METAL, 80, false);
    if (gore.rock) this.gore.chunks(cx, cy, gore.rock, ROCK, 60, false);
    if (e.T.onDeath) e.T.onDeath(e, this);
    this.maybeDrop(e);
    if (e.T.crystals && !e.byBoss) {
      const [lo, hi] = e.T.crystals;
      this.crystals.burst(cx, cy, lo + Math.floor(this.rand() * (hi - lo + 1)));
    }
    if (e.T.score >= 40) {
      this.popups.push({ x: e.x + e.w / 2, y: e.y, text: '+' + e.T.score, t: 0.8 });
      this.shake = Math.max(this.shake, 1.5);
    }
  }

  startBossDeath(e) {
    e.mode = 'dying';
    e.timer = 0;
    e.flash = 0;
    e.attack = null;
    this.enemyShots = [];
    this.markers = [];
    this.timers = [];
    this.darkenTo(0);
    stopMusic(2.5);
    // Everything else on screen breaks apart too (no points for those).
    for (const o of this.enemies) {
      if (o !== e && !o.dead) {
        o.dead = true;
        this.burst(o.x + o.w / 2, o.y + o.h / 2, 8, 50);
      }
    }
    sfx.roar();
  }

  finishBoss(e) {
    e.dead = true;
    this.boss = null;
    this.score += e.T.score;
    this.burst(e.x + e.w / 2, e.y + e.h / 2, 70, 130);
    this.popups.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, text: '+' + e.T.score, t: 1.5 });
    this.shake = 7;
    this.flash = 0.2;
    sfx.explode(2);
    buzz([80, 40, 120]);
    this.later(3, () => this.levelClear());
  }

  levelClear() {
    if (this.state !== 'playing') return;
    this.state = 'clear';
    this.stateTimer = 0;
    this.bonus = this.lives * LIFE_BONUS;
    this.score += this.bonus;
    this.player.invuln = 99;
    sfx.levelClear();
  }

  startWarning() {
    this.warning = { t: 0 };
    sfx.warning();
    startBossMusic();
  }

  // Something hit the player. The shield soaks it up if it's running;
  // otherwise health blocks are lost, and at zero a life is lost.
  hurtPlayer(amount, source = null) {
    const p = this.player;
    if (this.powerups.absorb()) {
      p.invuln = 0.35;
      this.burst(p.x + p.w / 2, p.y + p.h / 2, 10, 70, [PAL.bluePale, PAL.cream]);
      return;
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.killPlayer(source);
      return;
    }
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    p.invuln = PLAYER.hurtInvuln;
    this.hurtFlash = 0.4;
    this.shake = Math.max(this.shake, 2 + amount);
    this.burst(cx, cy, 10, 70);
    this.gore.chunks(cx, cy, 4, GLASS, 60, false);
    this.gore.blood(cx, cy, 4 + amount * 3, 60);
    buzz(HAPTIC.hurt);
    sfx.hurt();
    if (this.health === 1) {
      this.showToast('HULL CRITICAL');
      this.lowBeep = 0.6;
    }
  }

  killPlayer(source = null) {
    const p = this.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    this.burst(cx, cy, 36, 95);
    // Gritty: cockpit glass, blood, and the pilot's helmet tumbling away.
    this.gore.chunks(cx, cy, 10, GLASS, 90, false);
    this.gore.chunks(cx, cy, 8, METAL, 80, false);
    this.gore.blood(cx, cy, 40, 95);
    this.gore.chunks(cx, cy, 6, FLESH, 70);
    this.gore.splat(cx, cy, 2);
    this.gore.piece(cx, cy, HELMET.rows, HELMET.colors, -30 + this.rand() * 20, -40, 5);
    this.gore.smear(cx + 10, cy, 0.8);
    const byBoss = source && (source.byBoss || (source.T && source.T.boss));
    const lines = byBoss && this.boss ? this.boss.T.killLines : DEATH_LINES;
    this.quip = lines[Math.floor(this.rand() * lines.length)];
    this.shake = 5;
    buzz(HAPTIC.hurt);
    sfx.playerDie();
    this.lives--;
    this.health = 0;
    this.state = 'dying';
    this.stateTimer = 0;
    if (this.lives > 0) this.showToast(this.quip);
  }

  respawn() {
    const p = this.player;
    p.x = -18;
    p.y = VIEW_H / 2 - p.h / 2;
    p.entering = 0.5;
    p.invuln = PLAYER.respawnInvuln;
    p.cooldown = 0;
    this.health = PLAYER.health;
    this.enemyShots = [];
    this.state = 'playing';
  }

  burst(x, y, n, speed, colors = SPARK_COLORS) {
    for (let i = 0; i < n; i++) {
      const a = this.rand() * Math.PI * 2;
      const v = speed * (0.25 + this.rand() * 0.75);
      const life = 0.3 + this.rand() * 0.45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life,
        max: life,
        color: colors[Math.floor(this.rand() * colors.length)],
        size: this.rand() < 0.3 ? 2 : 1,
      });
    }
  }

  // ---- drawing (in game pixels) ----
  draw(ctx, snap) {
    ctx.save();
    if (this.shake > 0) {
      ctx.translate(
        snap((this.rand() - 0.5) * this.shake * 2),
        snap((this.rand() - 0.5) * this.shake * 2),
      );
    }
    this.bg.draw(ctx, snap);
    this.gore.drawBack(ctx, snap);
    if (this.darken > 0.01) {
      ctx.fillStyle = `rgba(5, 6, 12, ${this.darken})`;
      ctx.fillRect(-10, -10, VIEW_W + 20, VIEW_H + 20);
    }

    for (const pk of this.pickups) {
      const blink = pk.x < 40 && Math.floor(pk.t * 8) % 2 === 0;
      const lit = Math.floor(pk.t * 4) % 2 === 0;
      if (POWERUPS[pk.kind]) drawOrb(ctx, pk.kind, snap(pk.x), snap(pk.y), lit);
      else drawCapsule(ctx, pk.kind, snap(pk.x), snap(pk.y), lit);
      if (blink) {
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(snap(pk.x) + 3, snap(pk.y) - 2, 3, 1);
      }
    }

    for (const e of this.enemies) {
      const spr = e.T.sprite ? SPRITES[e.T.sprite + (e.flash > 0 ? 'Flash' : '')] : null;
      if (e.T.draw) e.T.draw(e, ctx, snap, this, spr);
      else if (e.flip) {
        ctx.save();
        ctx.translate(snap(e.x) + e.w, snap(e.y));
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0);
        ctx.restore();
      } else ctx.drawImage(spr, snap(e.x), snap(e.y));
      if (e.charge && Math.floor(this.time * 20) % 2 === 0) {
        // Blinking muzzle: a warning that this enemy is about to fire.
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(snap(e.flip ? e.x + e.w : e.x - 2), snap(e.y + e.h / 2 - 1), 2, 2);
      }
    }

    for (const s of this.enemyShots) {
      const x = snap(s.x);
      const y = snap(s.y);
      if (s.kind === 'gravel') {
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(x - 2, y - 2, 4, 4);
        ctx.fillStyle = '#9c8478';
        ctx.fillRect(x - 1, y - 1, 2, 2);
        ctx.fillStyle = '#c4a68e';
        ctx.fillRect(x - 1, y - 1, 1, 1);
        continue;
      }
      ctx.fillStyle = PAL.red;
      ctx.fillRect(x - 2, y - 1, 4, 2);
      ctx.fillRect(x - 1, y - 2, 2, 4);
      ctx.fillStyle = Math.floor(s.t * 12) % 2 ? PAL.amberLight : PAL.cream;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    this.crystals.draw(ctx, snap);
    this.weapons.draw(ctx, snap);
    this.drawPlayer(ctx, snap);
    this.powerups.draw(ctx, snap);

    for (const b of this.bullets) {
      const x = snap(b.x);
      const y = snap(b.y);
      ctx.fillStyle = PAL.amberSoft;
      ctx.fillRect(x, y, 3, 2);
      ctx.fillStyle = PAL.cream;
      ctx.fillRect(x + 3, y, 4, 2);
    }

    for (const q of this.particles) {
      ctx.globalAlpha = Math.min(1, (q.life / q.max) * 1.6);
      ctx.fillStyle = q.color;
      ctx.fillRect(snap(q.x), snap(q.y), q.size, q.size);
    }
    ctx.globalAlpha = 1;
    this.gore.draw(ctx, snap);

    for (const m of this.markers) {
      if (Math.floor(m.t * 10) % 2) continue;
      const x = Math.round(m.x);
      const y = Math.round(m.y);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - 3, y - 1, 7, 9);
      ctx.fillStyle = PAL.red;
      ctx.fillRect(x - 2, y, 5, 7);
      drawText(ctx, '!', x - 2, y + 1, PAL.cream);
    }

    for (const pp of this.popups) {
      drawTextCentered(ctx, pp.text, snap(pp.x), snap(pp.y), PAL.amberLight);
    }
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(242, 207, 138, ${this.flash * 1.5})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    this.gore.drawLens(ctx);

    if (this.hurtFlash > 0) {
      // Red flash around the screen edges when you take a hit.
      const a = Math.min(0.75, this.hurtFlash * 2);
      ctx.fillStyle = `rgba(158, 47, 47, ${a})`;
      ctx.fillRect(0, 0, VIEW_W, 5);
      ctx.fillRect(0, VIEW_H - 5, VIEW_W, 5);
      ctx.fillRect(0, 5, 5, VIEW_H - 10);
      ctx.fillRect(VIEW_W - 5, 5, 5, VIEW_H - 10);
      ctx.fillStyle = `rgba(158, 47, 47, ${a * 0.5})`;
      ctx.fillRect(5, 5, VIEW_W - 10, 3);
      ctx.fillRect(5, VIEW_H - 8, VIEW_W - 10, 3);
    }

    this.drawHud(ctx);
  }

  drawPlayer(ctx, snap) {
    const p = this.player;
    if (this.state !== 'playing' && this.state !== 'clear') return;
    // Blink while invulnerable.
    if (this.state === 'playing' && p.invuln > 0 && p.entering <= 0 && Math.floor(p.invuln * 12) % 2 === 0) {
      return;
    }
    const x = snap(p.x);
    const y = snap(p.y);
    // Engine flame flickers, longer when pushing forward.
    const len = 2 + (p.moveX > 0 ? 3 : p.moveX < 0 ? 0 : 1) + (Math.floor(this.time * 30) % 2);
    ctx.fillStyle = PAL.amberSoft;
    ctx.fillRect(x - len, y + 4, len, 3);
    ctx.fillStyle = PAL.amberLight;
    ctx.fillRect(x - Math.ceil(len / 2), y + 5, Math.ceil(len / 2), 1);
    ctx.drawImage(SPRITES.player, x, y);
  }

  drawHud(ctx) {
    const score = String(this.score).padStart(6, '0');
    drawText(ctx, score, 4, 3, PAL.ink);
    drawText(ctx, score, 3, 2, PAL.cream);

    // Health: 5 blocks next to the score. Amber when healthy, red when low,
    // and the last one blinks.
    const hx = 42;
    const low = this.health <= 2;
    for (let i = 0; i < PLAYER.health; i++) {
      const x = hx + i * 6;
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - 1, 1, 7, 7);
      const full = i < this.health;
      const blinkOff = this.health === 1 && Math.floor(this.time * 6) % 2 === 0;
      ctx.fillStyle = !full ? '#232c4a' : blinkOff ? PAL.redDark : low ? PAL.red : PAL.amber;
      ctx.fillRect(x, 2, 5, 5);
      if (full && !low) {
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(x, 2, 5, 1);
      }
    }
    this.powerups.drawHud(ctx, hx + PLAYER.health * 6 + 5);

    const icon = SPRITES.lifeIcon;
    for (let i = 0; i < Math.max(0, this.lives); i++) {
      ctx.drawImage(icon, VIEW_W - 4 - (i + 1) * (icon.width + 3), 2);
    }

    if (this.state !== 'clear') {
      this.weapons.drawHud(ctx);
      this.crystals.drawHud(ctx);
    }
    if (this.section) {
      const t = this.section.t;
      if (t < 2.2 && (t > 0.3 || Math.floor(t * 12) % 2 === 0)) {
        drawTextCentered(ctx, this.section.name, VIEW_W / 2 + 1, 31, PAL.ink);
        drawTextCentered(ctx, this.section.name, VIEW_W / 2, 30, PAL.bluePale);
      }
    }

    // Boss health bar along the bottom.
    const boss = this.boss;
    if (boss && boss.mode !== 'enter') {
      const w = 90;
      const x = Math.round(VIEW_W / 2 - w / 2);
      const y = VIEW_H - 8;
      drawTextCentered(ctx, boss.T.name, VIEW_W / 2, y - 7, PAL.amberLight);
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - 1, y - 1, w + 2, 6);
      ctx.fillStyle = PAL.redDark;
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = boss.flash > 0 ? PAL.cream : PAL.red;
      ctx.fillRect(x, y, Math.round((w * Math.max(0, boss.hp)) / boss.maxHp), 4);
      ctx.fillStyle = PAL.redSoft;
      ctx.fillRect(x, y, Math.round((w * Math.max(0, boss.hp)) / boss.maxHp), 1);
    }

    if (this.toast) {
      const w = textWidth(this.toast.text) + 8;
      ctx.fillStyle = 'rgba(14, 18, 34, 0.8)';
      ctx.fillRect(Math.round(VIEW_W / 2 - w / 2), 14, w, 11);
      drawTextCentered(ctx, this.toast.text, VIEW_W / 2, 17, PAL.amberLight);
    }

    if (this.banner) {
      const t = this.banner.t;
      if (t > 0.4 && t < 3.4 && (t > 0.8 || Math.floor(t * 10) % 2 === 0)) {
        drawTextCentered(ctx, 'LEVEL ' + this.level.number, VIEW_W / 2 + 1, 51, PAL.redDark, 2);
        drawTextCentered(ctx, 'LEVEL ' + this.level.number, VIEW_W / 2, 50, PAL.amber, 2);
        drawTextCentered(ctx, this.level.name, VIEW_W / 2, 66, PAL.cream);
      }
    }

    if (this.warning) {
      const on = Math.floor(this.warning.t * 4) % 2 === 0;
      ctx.fillStyle = 'rgba(122, 58, 54, 0.55)';
      ctx.fillRect(0, 52, VIEW_W, 30);
      ctx.fillStyle = PAL.red;
      for (let x = (Math.floor(this.time * 40) % 8) - 8; x < VIEW_W; x += 8) {
        ctx.fillRect(x, 52, 4, 2);
        ctx.fillRect(x + 4, 80, 4, 2);
      }
      if (on) drawTextCentered(ctx, 'WARNING', VIEW_W / 2, 57, PAL.amberLight, 2);
      drawTextCentered(ctx, ENEMY_TYPES[this.level.boss].name + ' APPROACHES', VIEW_W / 2, 71, PAL.cream);
    }

    if (this.title) {
      // Boss title card.
      const t = this.title.t;
      const T = this.title.T;
      const cx = Math.round(VIEW_W * 0.4);
      if (t < 3.3 && (t > 0.3 || Math.floor(t * 20) % 2 === 0)) {
        drawTextCentered(ctx, T.name, cx + 2, 34, PAL.ink, 3);
        drawTextCentered(ctx, T.name, cx + 1, 33, PAL.redDark, 3);
        drawTextCentered(ctx, T.name, cx, 32, PAL.amber, 3);
        if (t > 0.6) drawTextCentered(ctx, T.title, cx, 54, PAL.cream);
        if (t > 1.3) drawTextCentered(ctx, T.taunt, cx, 66, Math.floor(t * 6) % 2 ? PAL.redSoft : PAL.red);
      }
    }

    if (this.state === 'gameover') {
      const k = Math.min(1, this.stateTimer * 2);
      ctx.fillStyle = `rgba(11, 15, 28, ${0.6 * k})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawTextCentered(ctx, 'GAME OVER', VIEW_W / 2 + 1, 45, PAL.redDark, 3);
      drawTextCentered(ctx, 'GAME OVER', VIEW_W / 2, 44, PAL.amber, 3);
      if (this.stateTimer > 0.5) drawTextCentered(ctx, this.quip, VIEW_W / 2, 64, PAL.redSoft);
      drawTextCentered(ctx, 'SCORE ' + score, VIEW_W / 2, 78, PAL.cream);
      if (this.stateTimer > 1.1 && Math.floor(this.time * 2.5) % 2 === 0) {
        drawTextCentered(ctx, 'TAP TO TRY AGAIN', VIEW_W / 2, 96, PAL.amberLight);
      }
    }

    if (this.state === 'clear') {
      const t = this.stateTimer;
      const k = Math.min(1, t * 1.5);
      ctx.fillStyle = `rgba(11, 15, 28, ${0.5 * k})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawTextCentered(ctx, 'LEVEL CLEAR', VIEW_W / 2 + 1, 31, PAL.redDark, 2);
      drawTextCentered(ctx, 'LEVEL CLEAR', VIEW_W / 2, 30, PAL.amber, 2);
      drawTextCentered(ctx, this.level.name, VIEW_W / 2, 46, PAL.cream);
      if (t > 0.8) {
        drawTextCentered(ctx, `LIVES BONUS ${this.lives} X ${LIFE_BONUS}`, VIEW_W / 2, 64, PAL.bluePale);
      }
      if (t > 1.4) drawTextCentered(ctx, 'SCORE ' + score, VIEW_W / 2, 76, PAL.amberLight);
      if (t > 2) drawTextCentered(ctx, 'MORE LEVELS COMING IN STAGE 3', VIEW_W / 2, 96, PAL.textDim);
      if (t > 3 && Math.floor(this.time * 2.5) % 2 === 0) {
        drawTextCentered(ctx, 'TAP TO PLAY AGAIN', VIEW_W / 2, 112, PAL.amberLight);
      }
    }
  }
}

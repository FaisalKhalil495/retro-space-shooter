import { VIEW_W, VIEW_H, HUD_H, PAL, PLAYER } from './config.js?v=0.21.1';
import { SPRITES } from './sprites.js?v=0.21.1';
import { ENEMY_TYPES } from './enemies.js?v=0.21.1';
import { LEVELS, LevelRunner } from './levels.js?v=0.21.1';
import { Background } from './background.js?v=0.21.1';
import { Weapons, SPECIALS, drawCapsule, pickupInfo } from './weapons.js?v=0.21.1';
import { drawText, drawTextCentered, textWidth } from './font.js?v=0.21.1';
import { buzz, HAPTIC } from './feedback.js?v=0.21.1';
import { sfx } from './audio.js?v=0.21.1';
import { clamp, rectsOverlap, fillDisc } from './util.js?v=0.21.1';
import { FINE, snapFine, fillCrisp } from './detail.js?v=0.21.1';
import { Gore, FLESH, METAL, ROCK, GLASS } from './gore.js?v=0.21.1';
import { Blasts } from './blasts.js?v=0.21.1';
import { Speech } from './speech.js?v=0.21.1';
import { Terrain, ROCK_CLEARANCE, ICE_COLORS } from './terrain.js?v=0.21.1';
import { startBossMusic, stopMusic } from './music.js?v=0.21.1';
import { PowerUps, POWERUPS, drawOrb, randomPowerup } from './powerups.js?v=0.21.1';

const DIAG = Math.SQRT1_2;
const SPARK_COLORS = [PAL.amberLight, PAL.amber, PAL.amberSoft, PAL.red, PAL.cream];
const BLOCK_COLORS = [PAL.grey, PAL.cream, PAL.bluePale];
const DUST_COLORS = ['#7a4632', '#9a6a4a', '#c4a68e'];
// A broken-off piece of the player's wing, for the death explosion (a map
// of half pixels, like every gore piece).
const WING = {
  rows: ['kkkk....', 'kaaabk..', 'kaabbbkk', 'kabbbbck', '.kbbdcck', '..kkkkk.'],
  colors: { k: PAL.ink, a: PAL.bluePale, b: PAL.blue, c: PAL.amberSoft, d: PAL.blueDark },
};
const LIFE_BONUS = 500;
const TITLE_TIME = 3.3; // seconds a boss name card stays up
const SUPPLY_EVERY = 20; // seconds between supply pods in a boss fight
const LIFT_LOOK = 48; // how far ahead (either way) flying enemies look for spires (and ice)
const ICE_CLEARANCE = 4; // how far flying enemies keep from a slab of ice
const SLAB_SCORE = 10;
const FIRST_SUPPLY = 3; // the first one comes early
const SMART_POD = { color: PAL.cream, light: '#ffffff' }; // white light on a survival supply pod

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
  constructor({ startAt = 0, level = 1 } = {}) {
    this.rand = Math.random;
    this.startAt = startAt; // testing aid: skip ahead in the level
    this.levelIndex = Math.min(LEVELS.length, level) - 1;
    this.weapons = new Weapons(this);
    this.powerups = new PowerUps(this);
    this.gore = new Gore(this.rand);
    this.blasts = new Blasts(this.rand);
    this.speech = new Speech();
    // Where a speech bubble's tail points (a boss's mouth, or wherever its
    // voice comes from). Made once, used every frame.
    this.voicePointOf = (e) => (e.T.voicePoint ? e.T.voicePoint(e) : this.aimPoint(e));
    // What a pod's light shows. A weapon pod shows exactly what it would
    // give if shot open right now (ammo shows the colour of your special).
    this.pickupInfo = (kind) => {
      if (kind === 'smart') return SMART_POD;
      if (kind === 'weapon') return this.pickupInfo(this.weaponSupply()); // ammo shows amber, like the "A" capsule
      return POWERUPS[kind] || pickupInfo(kind);
    };
    this.reset();
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  // Start (or restart) the current level. With carry, it's the next level of
  // a run: score, lives and the special weapon come along; health refills.
  // Without it, it's a fresh start (new game, or retry after game over).
  reset(carry = null) {
    this.score = carry ? carry.score : 0;
    this.supplyCount = 0; // boss supply pods so far (they take turns)
    this.clearPending = false; // the boss is dead; clear the level when alive
    this.lives = carry ? carry.lives : PLAYER.lives;
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
    this.blasts.reset();
    this.speech.reset();
    stopMusic(0.3);
    // The scenery stands on the same ground line as the solid terrain.
    this.bg = new Background(this.rand, { ...this.level.background, floor: this.level.floor || 0 });
    this.terrain = new Terrain(this.level.floor || 0);
    this.weapons.reset();
    this.powerups.reset();
    if (carry && carry.weapon) {
      this.weapons.kind = carry.weapon;
      this.weapons.ammo = carry.ammo;
    }
    this.runner = new LevelRunner(this, this.level);
    if (this.startAt) {
      this.runner.skipTo(this.startAt === 'boss' ? this.runner.endsAt - 0.5 : this.startAt);
      this.banner = null;
      this.weapons.kind = 'laser';
      this.weapons.ammo = 3;
    }
  }

  // ---- helpers used by enemies, patterns and weapons ----
  spawnEnemy(type, x, y, opts = {}) {
    const T = ENEMY_TYPES[type];
    const spr = T.sprite ? SPRITES[this.spriteName(T.sprite)] : null; // (its size: this level's look)
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

  // magnet: the pickup floats towards the ship so it can't be missed.
  spawnPickup(kind, x, y, magnet = false) {
    y = Math.min(y, this.terrain.groundTop(x, 9) - 12); // never inside the ground or a spire
    y = this.terrain.clearOfIce(x - 1, 11, y - 1, 11) + 1; // ...or a slab of ice
    if (kind) this.pickups.push({ kind, x, y, baseY: y, t: 0, magnet });
  }

  // Something a character says, in a comic-book speech bubble beside them.
  say(speaker, text, style = 'talk', dur) {
    this.speech.say(speaker, text, style, dur);
  }

  // Is this character's speech bubble still up?
  isSpeaking(e) {
    return this.speech.isSpeaking(e);
  }

  // Shared rule for every boss: it may not start an attack while it's
  // talking (owner, v0.10.4 — bubbles mid-fight were distracting). A boss
  // checks this before starting any attack, and before leaving a pause.
  bossMayAttack(e) {
    return !this.isSpeaking(e);
  }

  // Breaking a boss into its next stage: a score bonus, and two bonus items
  // burst out of the wound and float to the ship (one to keep you alive, one
  // for your special weapon).
  // What the two items are is decided when you grab them (and they always
  // show what they'd give right now), so they stay right even if things
  // change on the way: you take a hit, die and respawn, or pick up a special.
  stageBonus(e, stage) {
    const m = this.aimPoint(e);
    const bonus = stage === 2 ? 1000 : 2000;
    this.score += bonus;
    // Keep the items and the bonus number on screen even if his mouth is off
    // the edge (after a charge).
    const x = clamp(m.x - 6, 4, VIEW_W - 14);
    const y = clamp(m.y - 4, HUD_H + 10, VIEW_H - 18);
    this.popups.push({ x: clamp(m.x, 16, VIEW_W - 16), y: y - 12, text: '+' + bonus, t: 1.5 });
    this.spawnPickup('bonusSurvival', x, y - 6, true);
    this.spawnPickup('bonusWeapon', x, y + 6, true);
    this.burst(m.x, m.y, 12, 70);
  }

  // Stage-bonus survival item: Repair if you're hurt, else a Shield, or Rapid
  // Fire / Spread Shot if a Shield is already up.
  // If the weapon item is about to give the same power-up, it gives the
  // other one, so the two items never show the same thing.
  survivalPick() {
    if (this.health < PLAYER.health) return 'repair';
    if (!this.powerups.has('shield')) return 'shield';
    const pick = this.powerups.has('rapid') ? 'spread' : 'rapid';
    if (pick !== this.weaponPick()) return pick;
    return pick === 'rapid' ? 'spread' : 'rapid';
  }

  // Bonus items stand in for whatever they'd give right now.
  resolvePickup(kind) {
    if (kind === 'bonusSurvival') return this.survivalPick();
    if (kind === 'bonusWeapon') return this.weaponPick();
    return kind;
  }

  // Specials and extra lives go to the weapon system; the rest are
  // automatic power-ups.
  collectPickup(kind) {
    if (POWERUPS[kind]) this.powerups.collect(kind);
    else this.weapons.collect(kind);
  }

  // Tough enemies and big rocks sometimes leave a power-up behind.
  // When you're hurt (2 health blocks or fewer), drops get more likely and
  // lean towards Repair. At full health they never give Repair (it would be
  // wasted); Spread Shot and Rapid Fire get its share.
  maybeDrop(e) {
    if (e.byBoss || e.T.noDrop) return;
    // Only enemies that carry loot can drop it (never plain pods or cargo
    // pods, whose contents are fixed).
    let chance = e.T.dropChance || 0;
    if (!chance) return;
    const hurt = this.health <= 2;
    if (hurt) chance = e.T.hurtDropChance ?? chance * 2.5 + 0.06;
    if (!chance || this.rand() >= chance) return;
    let kind;
    if (hurt && this.rand() < 0.6) kind = 'repair';
    else if (e.T.ammoLoot && this.rand() < 0.3) kind = 'ammo'; // special ammo, see weapons.js
    else kind = randomPowerup(this.rand, this.health >= PLAYER.health);
    this.spawnPickup(kind, e.x + e.w / 2 - 4, e.y + e.h / 2 - 4);
  }

  // Boss supply pods take turns: survival, weapon, survival, weapon...
  nextSupplyKind() {
    this.supplyCount++;
    return this.supplyCount % 2 === 0 ? 'weapon' : 'smart';
  }

  // What a boss supply pod holds, decided when it's shot open (null for an
  // ordinary cargo pod, whose contents are fixed).
  supplyContents(drop) {
    if (drop === 'smart') return this.smartSupply();
    if (drop === 'weapon') return this.weaponSupply();
    return null;
  }

  // What a survival supply pod gives you: whatever keeps you alive best.
  smartSupply() {
    if (this.health <= 2) return 'repair';
    if (!this.powerups.has('shield')) return 'shield';
    if (this.health < PLAYER.health) return 'repair';
    return this.rand() < 0.5 ? 'rapid' : 'spread';
  }

  // What a weapon supply pod gives you: special weapon ammo. With no special
  // you get a Laser (best against Rockjaw's open jaw); otherwise an "A" ammo
  // capsule that tops up whatever you carry when you grab it, so it can never
  // swap your weapon. If your special is already full, ammo would be wasted,
  // so you get Rapid Fire (or Spread Shot if Rapid is running). On your last
  // 2 health blocks it gives Repair instead.
  weaponSupply() {
    if (this.health <= 2) return 'repair';
    return this.weaponPick();
  }

  // The weapon item to hand out: a Laser if you have no special, ammo for the
  // one you carry, or Rapid Fire / Spread Shot if your special is full.
  weaponPick() {
    const w = this.weapons;
    if (!w.kind) return 'laser';
    if (w.ammo >= SPECIALS[w.kind].max) return this.powerups.has('rapid') ? 'spread' : 'rapid';
    return 'ammo';
  }

  fireAtPlayer(x, y, speed, kind = 'orb', byBoss = false) {
    const p = this.player;
    const a = Math.atan2(p.y + p.h / 2 - y, p.x + p.w / 2 - x);
    return this.fireShot(x, y, a, speed, kind, byBoss);
  }

  // kind: 'orb' (glowing enemy bullet), 'gravel' (a stone), 'fast' (sniper
  // round) or 'shell' (a heavy cannon shell).
  fireShot(x, y, angle, speed, kind = 'orb', byBoss = false) {
    speed *= this.level.shotSpeed || 1; // later levels shoot a little faster
    const shot = { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, t: 0, kind, byBoss };
    this.enemyShots.push(shot);
    return shot;
  }

  // Flying enemies never pass through rock spires: they lift up over any
  // spire near them (and any turret on it), looking well ahead either way so
  // the climb is smooth. A type can opt out at times (liftsOver(e) false,
  // e.g. a dive-bomber, which crashes into rock instead) and react to being
  // lifted (onLift(e, d), e.g. to move its whole weave up or re-aim).
  keepAboveRock(e, dt) {
    if (e.T.liftsOver && !e.T.liftsOver(e)) return;
    const clear = this.terrain.groundTop(e.x - LIFT_LOOK, e.w + LIFT_LOOK * 2) - e.h - ROCK_CLEARANCE;
    if (e.y <= clear) return;
    const inRock = this.terrain.hits(e.x, e.y, e.w, e.h);
    const d = inRock ? e.y - clear : Math.min(e.y - clear, 120 * dt);
    e.y -= d;
    if (e.T.onLift) e.T.onLift(e, d);
  }

  // A level can give the enemy types it shares with others its own look
  // (level.skin, e.g. 'rust' draws 'gunner_rust' instead of 'gunner').
  spriteName(name) {
    const skin = this.level.skin;
    return skin && SPRITES[name + '_' + skin] ? name + '_' + skin : name;
  }

  // Flying enemies never pass through a slab of ice either: they steer up or
  // down (whichever is nearer and on screen) around any slab near them. A
  // type can opt out at times (liftsOver(e) false: a dive-bomber crashes into
  // ice instead) and react to being moved (onLift(e, d), d > 0 when moved up).
  keepClearOfIce(e, dt) {
    if (e.T.liftsOver && !e.T.liftsOver(e)) return;
    // Look well ahead (and behind) so it turns early; if ice fills every
    // height across that whole stretch, just keep clear of what's right here
    // (there's always room there).
    const t = this.terrain;
    const want = t.freeY(e.x - LIFT_LOOK, e.w + LIFT_LOOK * 2, e.y, e.h, ICE_CLEARANCE) ?? t.freeY(e.x - 2, e.w + 4, e.y, e.h, 1) ?? e.y;
    if (want === e.y) return;
    const inIce = this.terrain.slabAt(e.x, e.y, e.w, e.h);
    const d = inIce ? e.y - want : clamp(e.y - want, -120 * dt, 120 * dt);
    e.y -= d;
    if (e.T.onLift) e.T.onLift(e, d);
  }

  // A shot (or a weapon) hitting a slab of ice: it cracks, and shatters into
  // harmless snow once it's taken enough.
  chipSlab(s, dmg, x, y) {
    if (s.dead) return;
    s.hp -= dmg;
    s.flash = 0.06;
    this.burst(x, y, 2, 30, ICE_COLORS.slice(2));
    if (s.hp > 0) {
      sfx.iceChip();
      return;
    }
    s.dead = true;
    this.score += SLAB_SCORE;
    sfx.shatter();
    const n = Math.min(40, Math.round((s.w * s.h) / 18));
    for (let i = 0; i < n; i++) {
      this.burst(s.x + this.rand() * s.w, s.y + this.rand() * s.h, 1, 40, ICE_COLORS.slice(1));
    }
  }

  // The middle of the player's ship (what enemies aim at).
  playerCenter() {
    const p = this.player;
    return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
  }

  // Boss supply pods: one every 20 s of fighting (the first 3 s in), taking
  // turns survival / weapon (see nextSupplyKind). Every boss gets them; a
  // boss type's supplyY(e) says how high they fly in (away from it).
  updateSupplies(dt) {
    const b = this.boss;
    if (!b || (b.mode !== 'fight' && b.mode !== 'transition')) return;
    if (b.supplyT === undefined) b.supplyT = FIRST_SUPPLY;
    b.supplyT -= dt;
    if (b.supplyT > 0) return;
    b.supplyT = SUPPLY_EVERY;
    const y = b.T.supplyY ? b.T.supplyY(b, this) : HUD_H + 8;
    this.spawnEnemy('carrier', VIEW_W + 8, y, { drop: this.nextSupplyKind() });
  }

  // The player's hitbox: smaller than the drawing, so scrapes that look like
  // near-misses really are misses. Everything that can hit you uses this.
  playerHitbox() {
    const p = this.player;
    return { x: p.x + 5, y: p.y + 3, w: p.w - 9, h: p.h - 6 };
  }

  // Can you be hurt right now? (In play, not flying in, not flashing.)
  playerVulnerable() {
    const p = this.player;
    return this.state === 'playing' && !(p.entering > 0) && !(p.invuln > 0);
  }

  // Does a rectangle touch the player's hitbox?
  touchesPlayer(x, y, w, h) {
    const b = this.playerHitbox();
    return rectsOverlap(b.x, b.y, b.w, b.h, x, y, w, h);
  }

  // A flashing warning marker, shown before something arrives there.
  warn(x, y, dur = 0.8, dir = 'down') {
    this.markers.push({ x, y, t: 0, dur, dir });
  }

  darkenTo(v) {
    this.darkenTarget = v;
  }

  // A boss's big name card. (A boss waits for g.title to clear before its
  // opening taunt.)
  showTitle(T) {
    this.title = { T, t: 0 };
  }

  later(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  showToast(text) {
    this.toast = { text, t: 1.4 };
  }

  // The best target near a point (for homing rockets). Real fighters only:
  // never cargo pods, mines, mortar shells or a boss's saw blades. A boss
  // with its weak spot open comes first; armoured targets come after open
  // ones.
  nearestEnemy(x, y) {
    const b = this.boss;
    if (b && this.bossOnScreen() && b.mode !== 'dying' && b.T.isVulnerable && b.T.isVulnerable(b)) return b;
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.dead || e.mode === 'dying' || e.under || e.T.harmless || e.T.noTarget || e.x > VIEW_W || e.x + e.w < 0) continue;
      const tp = this.aimPoint(e);
      let d = Math.hypot(tp.x - x, tp.y - y) + (tp.x < x ? 80 : 0); // prefer targets ahead
      if (e.T.isVulnerable && !e.T.isVulnerable(e)) d += 60; // armour up: try something else first
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

  // Has the boss finished its entrance? (Each boss type can say.)
  bossOnScreen() {
    const b = this.boss;
    return !!b && (!b.T.onScreen || b.T.onScreen(b));
  }

  // Does a rectangle touch this enemy? Returns 'hit', 'block' or null.
  contact(e, x, y, w, h) {
    if (e.T.hitTest) return e.T.hitTest(e, x, y, w, h);
    const i = e.T.inset ?? 1;
    return rectsOverlap(x, y, w, h, e.x + i, e.y + i, e.w - i * 2, e.h - i * 2) ? 'hit' : null;
  }

  // Does one of your shots (bullet, rocket, laser) touch this enemy? An
  // enemy type can give a more forgiving area for your shots (shotTest) than
  // for bumping into your ship.
  shotContact(e, x, y, w, h) {
    return e.T.shotTest ? e.T.shotTest(e, x, y, w, h) : this.contact(e, x, y, w, h);
  }

  hits(e, x, y, w, h) {
    return this.shotContact(e, x, y, w, h) !== null;
  }

  // Hit an enemy with something that has a position (shot, rocket, beam).
  strike(e, x, y, w, h, amount) {
    const res = this.shotContact(e, x, y, w, h);
    if (res === 'hit') this.damage(e, amount, x + w, y + h / 2);
    else if (res === 'block') this.blocked(x + w, y + h / 2);
    return res;
  }

  // Damage an enemy. Bosses ignore damage while armoured. An enemy with a
  // shell that soaks up hits (shield: a frozen Rime Guard's ice) takes them
  // there first.
  damage(e, amount, hx = e.x + e.w / 2, hy = e.y + e.h / 2) {
    if (e.dead || e.mode === 'dying' || e.under) return; // (underground: out of reach, no sparks)
    if (e.T.shield && e.T.shield(e, amount, this, hx, hy)) return;
    if (e.T.isVulnerable && !e.T.isVulnerable(e)) {
      this.blocked(e.x + e.w / 3, e.y + e.h / 2);
      return;
    }
    e.hp -= amount;
    if (e.T.onHit) e.T.onHit(e, this, hx, hy, amount);
    else if (e.T.organic) this.gore.blood(hx, hy, 2, 45, 0, 1.2, false);
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
    if (this.title && (this.title.t += dt) > TITLE_TIME) this.title = null;
    this.gore.update(dt);
    this.blasts.update(dt);
    this.speech.update(dt);

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
      if (input.tap && this.stateTimer > 3) this.nextLevel();
      return;
    }

    if (this.state === 'playing') {
      if (this.clearPending) {
        this.clearPending = false;
        this.levelClear();
        return;
      }
      this.updatePlayer(dt, input);
    } else if (this.state === 'dying') {
      this.stateTimer += dt;
      if (this.stateTimer > 1.4) {
        if (this.lives > 0) this.respawn();
        else {
          this.state = 'gameover';
          this.stateTimer = 0;
          this.speech.reset(); // the Game Over card shows the line instead
        }
      }
    }

    this.runner.update(dt);
    this.weapons.update(dt);
    this.powerups.update(dt, input);
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
    p.y = clamp(p.y + dy * PLAYER.speed * dt, HUD_H + 1, this.terrain.floorY - p.h - 1);

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
    this.terrain.update(dt);
    for (const b of this.bullets) {
      b.x += PLAYER.bulletSpeed * dt;
      b.y += (b.vy || 0) * dt;
      // Shots crack ice, and stop against solid rock with a puff of dust.
      const slab = this.terrain.slabAt(b.x, b.y, 7, 2);
      if (slab) {
        b.dead = true;
        this.chipSlab(slab, 1, b.x + 6, b.y + 1);
      } else if (this.terrain.solid(b.x, b.y, 7, 2)) {
        b.dead = true;
        this.burst(b.x + 6, b.y + 1, 3, 30, DUST_COLORS);
      }
    }
    this.bullets = this.bullets.filter((b) => b.x < VIEW_W + 8 && b.y > -4 && b.y < VIEW_H + 4 && !b.dead);

    for (const e of this.enemies) {
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.flashCd = (e.flashCd || 0) - dt;
      e.T.update(e, dt, this);
      if (e.T.flies && this.terrain.floor && !e.dead) this.keepAboveRock(e, dt);
      if ((e.T.flies || e.T.avoidsIce) && this.terrain.slabs.length && !e.dead) this.keepClearOfIce(e, dt);
    }
    this.updateSupplies(dt);
    this.enemies = this.enemies.filter(
      (e) => !e.dead && (e.T.boss || (e.x > -e.w - 30 && e.x < VIEW_W + 90 && e.y > -60 && e.y < VIEW_H + 60)),
    );

    for (const s of this.enemyShots) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (this.terrain.solid(s.x - 1, s.y - 1, 2, 2)) {
        s.dead = true;
        this.burst(s.x, s.y, 2, 25, this.terrain.slabAt(s.x - 1, s.y - 1, 2, 2) ? ICE_COLORS.slice(2) : DUST_COLORS);
      }
    }
    this.enemyShots = this.enemyShots.filter(
      (s) => !s.dead && s.x > -6 && s.x < VIEW_W + 6 && s.y > -6 && s.y < VIEW_H + 6,
    );

    const p = this.player;
    for (const pk of this.pickups) {
      pk.t += dt;
      pk.x -= 20 * dt;
      if (pk.magnet && pk.t > 0.35 && this.state === 'playing') {
        const dx = p.x + p.w / 2 - (pk.x + 4);
        const dy = p.y + p.h / 2 - (pk.baseY + 4);
        const d = Math.hypot(dx, dy) || 1;
        pk.x += (dx / d) * 90 * dt;
        pk.baseY += (dy / d) * 90 * dt;
      }
      // A slab drifting into an item nudges it out of the way.
      if (!pk.magnet && this.terrain.slabs.length) pk.baseY = this.terrain.clearOfIce(pk.x - 1, 11, pk.baseY - 5, 19) + 5;
      pk.y = pk.baseY + Math.sin(pk.t * 3) * (pk.magnet ? 1 : 4);
    }
    // Homing bonus items never scroll away; everything else does.
    this.pickups = this.pickups.filter((pk) => !pk.taken && (pk.magnet || pk.x > -12));
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
    this.shake = Math.max(0, this.shake - dt * 14);
    // Pick this frame's shake offset here (not when drawing), so a paused
    // game's frozen picture stays still.
    this.shakeX = (this.rand() - 0.5) * this.shake * 2;
    this.shakeY = (this.rand() - 0.5) * this.shake * 2;
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
        this.collectPickup(this.resolvePickup(pk.kind));
      }
    }

    // Anything hitting the player (see playerHitbox).
    const { x: hx, y: hy, w: hw, h: hh } = this.playerHitbox();
    // Crashing into a rock spire or a slab of ice: 2 blocks, and you're
    // knocked clear of it, back the way you came (or up and over a spire, or
    // to the nearer open side of a slab, if that's blocked, so it can never
    // pin you against the screen edge). They stay solid while you're
    // flashing after a hit or a respawn; they just don't hurt then.
    const rock = this.terrain.hits(hx, hy, hw, hh);
    if (rock) {
      const ice = rock.ty !== undefined;
      const top = ice ? rock.y : rock.top;
      const bottom = ice ? rock.y + rock.h : this.terrain.floorY;
      const onTop = p.y + p.h / 2 < top + 4;
      const below = ice && p.y + p.h / 2 > bottom - 4;
      const fromRight = p.x + p.w / 2 > rock.x + rock.w / 2;
      if (!onTop && !below) {
        p.x = fromRight ? Math.min(VIEW_W - p.w - 2, rock.x + rock.w + 2) : Math.max(2, rock.x - p.w - 4);
      }
      if (onTop || below || this.terrain.hits(p.x + 5, hy, hw, hh)) {
        if (ice) p.y = this.terrain.clearOfIce(p.x, p.w, p.y, p.h, 2);
        else p.y = Math.max(HUD_H + 1, top - p.h - 2); // up and over
      }
      if (p.invuln > 0) return;
      this.hurtPlayer(2, rock);
      return;
    }
    if (p.invuln > 0) return;
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
        if (e.T.boss) {
          // Bounced off the boss: knocked back so you don't keep scraping it.
          if (e.T.knockback) e.T.knockback(e, p);
          else p.x = clamp(p.x - 14, 2, VIEW_W - p.w - 2);
        } else if (e.T.isVulnerable && !e.T.isVulnerable(e)) {
          // Rammed something armoured (a shut turret): it shrugs you off.
          p.x = clamp(p.x - 12, 2, VIEW_W - p.w - 2);
          this.blocked(p.x + p.w, p.y + p.h / 2);
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
    // Ice shatters, rocks crumble into dust; everything else explodes.
    if (gore.ice) {
      this.burst(cx, cy, gore.ice, 55, ICE_COLORS.slice(1));
      sfx.shatter();
    } else {
      if (gore.rock) this.blasts.dust(cx, cy, size);
      else this.blasts.blast(cx, cy, size);
      this.burst(cx, cy, Math.round(6 + size * 10), 60 + size * 20);
      sfx.explode(size);
    }
    if (gore.blood) {
      // Only living creatures bleed (lightly; no stains left behind).
      this.gore.blood(cx, cy, gore.blood, 70, null, Math.PI, false);
      this.gore.chunks(cx, cy, gore.flesh || 0, FLESH, 70, false);
    }
    if (gore.metal) this.gore.chunks(cx, cy, gore.metal, METAL, 80, false);
    if (gore.rock) this.gore.chunks(cx, cy, gore.rock, ROCK, 60, false);
    if (e.T.onDeath) e.T.onDeath(e, this);
    this.maybeDrop(e);
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
    // A few seconds later the level is cleared — as soon as you're alive
    // (if a leftover shot got you just after the boss died, it waits for
    // your respawn rather than never clearing).
    this.later(3, () => {
      this.clearPending = true;
    });
  }

  // After a level-clear screen: on to the next level with your score, lives
  // and special weapon. After the last level that exists so far, back to
  // level 1 for a fresh run.
  nextLevel() {
    this.startAt = 0;
    if (this.levelIndex + 1 < LEVELS.length) {
      const carry = { score: this.score, lives: this.lives, weapon: this.weapons.kind, ammo: this.weapons.ammo };
      this.levelIndex++;
      this.reset(carry);
    } else {
      this.levelIndex = 0;
      this.reset();
    }
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
    startBossMusic(ENEMY_TYPES[this.level.boss].music);
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
    // A big explosion: cockpit glass and wreckage spinning away.
    this.blasts.blast(cx, cy, 1.6);
    this.gore.chunks(cx, cy, 10, GLASS, 90, false);
    this.gore.chunks(cx, cy, 14, METAL, 90, false);
    this.gore.piece(cx, cy, WING.rows, WING.colors, -30 + this.rand() * 20, -40, 5);
    this.gore.piece(cx, cy, WING.rows, WING.colors, 10 + this.rand() * 20, 35, -4);
    const byBoss = source && (source.byBoss || (source.T && source.T.boss));
    // Only a boss that's on screen and alive gets to gloat.
    const bossTalks = byBoss && this.boss && this.boss.mode !== 'dying' && this.bossOnScreen();
    const lines = bossTalks ? this.boss.T.killLines : DEATH_LINES;
    this.quip = lines[Math.floor(this.rand() * lines.length)];
    this.shake = 5;
    buzz(HAPTIC.hurt);
    sfx.playerDie();
    this.lives--;
    this.health = 0;
    this.state = 'dying';
    this.stateTimer = 0;
    // A boss says its kill line in a speech bubble; anything else gets a
    // caption at the top of the screen.
    if (bossTalks) this.say(this.boss, this.quip);
    else if (this.lives > 0) this.showToast(this.quip);
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
    if (this.shake > 0) ctx.translate(snap(this.shakeX || 0), snap(this.shakeY || 0));
    this.bg.draw(ctx, snap);
    this.terrain.draw(ctx, snap);
    this.gore.drawBack(ctx, snap);
    if (this.darken > 0.01) {
      ctx.fillStyle = `rgba(5, 6, 12, ${this.darken})`;
      ctx.fillRect(-10, -10, VIEW_W + 20, VIEW_H + 20);
    }

    // Speech bubbles go under pickups, enemies, rocks and bullets, so a
    // bubble can never hide anything that matters.
    this.speech.draw(ctx, snap, this.voicePointOf);

    for (const pk of this.pickups) {
      const blink = !pk.magnet && pk.x < 40 && Math.floor(pk.t * 8) % 2 === 0;
      const lit = Math.floor(pk.t * 4) % 2 === 0;
      const kind = this.resolvePickup(pk.kind);
      if (POWERUPS[kind]) drawOrb(ctx, kind, snap(pk.x), snap(pk.y), lit);
      else drawCapsule(ctx, kind, snap(pk.x), snap(pk.y), lit);
      if (blink) {
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(snap(pk.x) + 3, snap(pk.y) - 1.5, 3, FINE);
      }
    }

    for (const e of this.enemies) {
      const spr = e.T.sprite ? SPRITES[this.spriteName(e.T.sprite) + (e.flash > 0 ? 'Flash' : '')] : null;
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
        // (An enemy whose gun isn't at its front-middle says where it is.)
        const m = e.T.muzzle ? e.T.muzzle(e) : { x: e.flip ? e.x + e.w : e.x - 2, y: e.y + e.h / 2 - 1 };
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(snap(m.x) + FINE, snap(m.y), 1, 2);
        ctx.fillRect(snap(m.x), snap(m.y) + FINE, 2, 1);
      }
    }

    // Explosions sit under bullets and the player, so they never hide a shot.
    this.blasts.draw(ctx, snap);

    for (const s of this.enemyShots) {
      const x = snap(s.x);
      const y = snap(s.y);
      // Shots are drawn in half-pixel steps (double detail).
      if (s.kind === 'gravel') {
        // A chip of rock.
        ctx.fillStyle = PAL.ink;
        fillDisc(ctx, x, y, 2);
        ctx.fillStyle = '#9c8478';
        fillDisc(ctx, x, y, 1.25);
        ctx.fillStyle = '#c4a68e';
        ctx.fillRect(x - 1, y - 1, 1, FINE);
        continue;
      }
      if (s.kind === 'shell') {
        // Heavy cannon shell: a fat round with a smoky trail.
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const dx = s.vx / sp;
        const dy = s.vy / sp;
        for (let i = 12; i >= 1; i--) {
          ctx.fillStyle = i > 6 ? '#4d3f45' : PAL.redDark;
          const sz = i > 8 ? FINE * 2 : FINE * 3;
          ctx.fillRect(snapFine(s.x - dx * i) - sz / 2, snapFine(s.y - dy * i) - sz / 2, sz, sz);
        }
        ctx.fillStyle = PAL.ink;
        fillDisc(ctx, x, y, 3);
        ctx.fillStyle = PAL.red;
        fillDisc(ctx, x, y, 2.25);
        ctx.fillStyle = Math.floor(s.t * 12) % 2 ? PAL.amberLight : PAL.cream;
        fillDisc(ctx, x, y, 1);
        continue;
      }
      if (s.kind === 'icicle') {
        // A shard of ice: a dark-edged pale spike pointing the way it flies
        // (dark edges so it shows on ice as well as on space), tapering to
        // its tail.
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const dx = s.vx / sp;
        const dy = s.vy / sp;
        for (let i = 6; i >= 0; i--) {
          const sz = snapFine(2.5 - i * 0.2);
          ctx.fillStyle = PAL.ink;
          ctx.fillRect(snapFine(s.x - dx * i * 0.75) + 0.5 - sz / 2, snapFine(s.y - dy * i * 0.75) + 0.5 - sz / 2, sz, sz);
        }
        for (let i = 6; i >= 0; i--) {
          const sz = i < 2 ? 1 : FINE;
          ctx.fillStyle = i === 0 ? ICE_COLORS[4] : i < 3 ? ICE_COLORS[3] : ICE_COLORS[2];
          ctx.fillRect(snapFine(s.x - dx * i * 0.75) + 0.5 - sz / 2, snapFine(s.y - dy * i * 0.75) + 0.5 - sz / 2, sz, sz);
        }
        continue;
      }
      if (s.kind === 'fast') {
        // Sniper round: a short streak with a tapering trail along its path.
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const dx = s.vx / sp;
        const dy = s.vy / sp;
        for (let i = 9; i >= 0; i--) {
          ctx.fillStyle = i < 2 ? PAL.cream : i < 5 ? PAL.redSoft : PAL.redDark;
          const sz = i < 5 ? 2 : i < 8 ? 1.5 : 1;
          ctx.fillRect(snapFine(s.x - dx * i * 0.75) - sz / 2, snapFine(s.y - dy * i * 0.75) - sz / 2, sz, sz);
        }
        continue;
      }
      // An ordinary round: a red ball with a blinking hot core.
      ctx.fillStyle = PAL.redDark;
      fillDisc(ctx, x, y, 2);
      ctx.fillStyle = PAL.red;
      fillDisc(ctx, x, y, 1.5);
      ctx.fillStyle = Math.floor(s.t * 12) % 2 ? PAL.amberLight : PAL.cream;
      fillDisc(ctx, x, y, 0.75);
    }

    this.weapons.draw(ctx, snap);
    this.drawPlayer(ctx, snap);
    this.powerups.draw(ctx, snap);

    for (const b of this.bullets) {
      const x = snap(b.x);
      const y = snap(b.y);
      // A bolt: a thin amber tail into a rounded cream head.
      ctx.fillStyle = PAL.amberSoft;
      ctx.fillRect(x, y + FINE, 4, 1);
      ctx.fillStyle = PAL.amber;
      ctx.fillRect(x + 2.5, y + FINE, 1.5, 1);
      ctx.fillStyle = PAL.cream;
      ctx.fillRect(x + 3.5, y, 3, 2);
      ctx.fillRect(x + 6.5, y + FINE, FINE, 1);
    }

    for (const q of this.particles) {
      ctx.globalAlpha = Math.min(1, (q.life / q.max) * 1.6);
      ctx.fillStyle = q.color;
      // Sparks are half the size they used to be (double detail).
      ctx.fillRect(snap(q.x), snap(q.y), q.size * FINE, q.size * FINE);
    }
    ctx.globalAlpha = 1;
    this.gore.draw(ctx, snap);

    for (const m of this.markers) {
      if (Math.floor(m.t * 10) % 2) continue;
      const x = Math.round(m.x);
      const y = Math.round(m.y);
      // A red tag with rounded corners and a thin ink edge.
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - 2.5, y - 1, 6, 9);
      ctx.fillRect(x - 3, y - FINE, 7, 8);
      ctx.fillStyle = PAL.red;
      ctx.fillRect(x - 2, y - FINE, 5, 8);
      ctx.fillRect(x - 2.5, y, 6, 7);
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
    // A tapered flame in half-pixel rows: longest in the middle, with a
    // bright core and a white-hot spot at the nozzle.
    // (Rows meet on whole screen pixels, so no seams show between them.)
    const m = ctx.getTransform();
    for (let r = 0; r < 6; r++) {
      const k = 1 - Math.abs(r + 0.5 - 3) / 3.2;
      const L = snapFine(len * (0.45 + 0.55 * k));
      const ry = y + 4 + r * FINE;
      ctx.fillStyle = PAL.amberSoft;
      fillCrisp(ctx, m, x - L, ry, L, FINE);
      if (r >= 1 && r <= 4) {
        const L2 = snapFine(L * 0.6);
        ctx.fillStyle = PAL.amberLight;
        fillCrisp(ctx, m, x - L2, ry, L2, FINE);
      }
      if (r === 2 || r === 3) {
        ctx.fillStyle = PAL.cream;
        fillCrisp(ctx, m, x - 1, ry, 1, FINE);
      }
    }
    ctx.drawImage(SPRITES.player, x, y);
  }

  drawHud(ctx) {
    const score = String(this.score).padStart(6, '0');
    drawText(ctx, score, 3.5, 2.5, PAL.ink); // a half-pixel shadow
    drawText(ctx, score, 3, 2, PAL.cream);

    // Health: 5 blocks next to the score. Amber when healthy, red when low,
    // and the last one blinks.
    const hx = 42;
    const low = this.health <= 2;
    for (let i = 0; i < PLAYER.health; i++) {
      const x = hx + i * 6;
      // A small rounded block with a thin ink edge, lit along the top.
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(x - FINE, 2 - FINE, 6, 6);
      const full = i < this.health;
      const blinkOff = this.health === 1 && Math.floor(this.time * 6) % 2 === 0;
      ctx.fillStyle = !full ? '#232c4a' : blinkOff ? PAL.redDark : low ? PAL.red : PAL.amber;
      ctx.fillRect(x, 2, 5, 5);
      if (full && !low) {
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(x, 2, 5, FINE);
        ctx.fillStyle = PAL.amberDark;
        ctx.fillRect(x, 6.5, 5, FINE);
      }
    }
    this.powerups.drawHud(ctx, hx + PLAYER.health * 6 + 5);

    const icon = SPRITES.lifeIcon;
    for (let i = 0; i < Math.max(0, this.lives); i++) {
      ctx.drawImage(icon, VIEW_W - 4 - (i + 1) * (icon.width + 3), 2);
    }

    if (this.state !== 'clear') this.weapons.drawHud(ctx);

    // Boss health bar along the bottom.
    const boss = this.boss;
    if (boss && this.bossOnScreen()) {
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
      // Big letters, or a size smaller if the name wouldn't fit.
      const px = textWidth(T.name, 3) <= VIEW_W - 12 ? 3 : 2;
      const cx = Math.round(Math.max(VIEW_W * 0.4, textWidth(T.name, px) / 2 + 6));
      if (t > 0.3 || Math.floor(t * 20) % 2 === 0) {
        drawTextCentered(ctx, T.name, cx + 2, 34, PAL.ink, px);
        drawTextCentered(ctx, T.name, cx + 1, 33, PAL.redDark, px);
        drawTextCentered(ctx, T.name, cx, 32, PAL.amber, px);
        if (t > 0.6) drawTextCentered(ctx, T.title, cx, 54, PAL.cream);
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
      const next = LEVELS[this.levelIndex + 1];
      if (t > 2) {
        // Long level names drop the "LEVEL n" part so the line still fits.
        let line = next ? 'NEXT  LEVEL ' + next.number + '  ' + next.name : 'MORE LEVELS COMING SOON';
        if (next && textWidth(line) > VIEW_W - 8) line = 'NEXT  ' + next.name;
        if (next && textWidth(line) > VIEW_W - 8) line = next.name;
        drawTextCentered(ctx, line, VIEW_W / 2, 96, PAL.textDim);
      }
      if (t > 3 && Math.floor(this.time * 2.5) % 2 === 0) {
        drawTextCentered(ctx, next ? 'TAP TO CONTINUE' : 'TAP TO PLAY AGAIN', VIEW_W / 2, 112, PAL.amberLight);
      }
    }
  }
}

import { VIEW_W, VIEW_H, HUD_H, PAL, PLAYER } from './config.js?v=0.2.0';
import { SPRITES } from './sprites.js?v=0.2.0';
import { ENEMY_TYPES } from './enemies.js?v=0.2.0';
import { LEVELS, LevelRunner } from './levels.js?v=0.2.0';
import { Background } from './background.js?v=0.2.0';
import { Weapons, drawCapsule, pickupInfo } from './weapons.js?v=0.2.0';
import { drawText, drawTextCentered, textWidth } from './font.js?v=0.2.0';
import { buzz, HAPTIC } from './feedback.js?v=0.2.0';
import { sfx } from './audio.js?v=0.2.0';
import { clamp, rectsOverlap } from './util.js?v=0.2.0';

const DIAG = Math.SQRT1_2;
const SPARK_COLORS = [PAL.amberLight, PAL.amber, PAL.amberSoft, PAL.red, PAL.cream];
const BLOCK_COLORS = [PAL.grey, PAL.cream, PAL.bluePale];
const LIFE_BONUS = 500;

export class Game {
  constructor({ startAt = 0 } = {}) {
    this.rand = Math.random;
    this.startAt = startAt; // testing aid: skip ahead in the level
    this.levelIndex = 0;
    this.weapons = new Weapons(this);
    this.pickupInfo = pickupInfo;
    this.reset();
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  reset() {
    this.score = 0;
    this.lives = PLAYER.lives;
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
    this.bg = new Background(this.rand, this.level.background);
    this.weapons.reset();
    this.runner = new LevelRunner(this, this.level);
    if (this.startAt) {
      this.runner.skipTo(this.startAt);
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

  fireAtPlayer(x, y, speed) {
    const p = this.player;
    const a = Math.atan2(p.y + p.h / 2 - y, p.x + p.w / 2 - x);
    this.enemyShots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: 0 });
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
    if (res === 'hit') this.damage(e, amount);
    else if (res === 'block') this.blocked(x + w, y + h / 2);
    return res;
  }

  // Damage an enemy. Bosses ignore damage while armoured.
  damage(e, amount) {
    if (e.dead || e.mode === 'dying') return;
    if (e.T.isVulnerable && !e.T.isVulnerable(e)) {
      this.blocked(e.x + e.w / 3, e.y + e.h / 2);
      return;
    }
    e.hp -= amount;
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
      this.bullets.push({ x: p.x + p.w - 3, y: p.y + 5 });
      p.cooldown = PLAYER.fireInterval;
      sfx.shoot();
    }
    if (input.special) this.weapons.fire();
  }

  moveWorld(dt) {
    for (const b of this.bullets) b.x += PLAYER.bulletSpeed * dt;
    this.bullets = this.bullets.filter((b) => b.x < VIEW_W + 8 && !b.dead);

    for (const e of this.enemies) {
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.flashCd = (e.flashCd || 0) - dt;
      e.T.update(e, dt, this);
    }
    this.enemies = this.enemies.filter(
      (e) => !e.dead && (e.T.boss || (e.x > -e.w - 30 && e.y > -60 && e.y < VIEW_H + 60)),
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
      q.vx *= 1 - 2.2 * dt;
      q.vy *= 1 - 2.2 * dt;
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
    this.flash = Math.max(0, this.flash - dt);
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
        this.weapons.collect(pk.kind);
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
        this.killPlayer();
        return;
      }
    }
    for (const e of this.enemies) {
      if (e.dead || e.T.harmless) continue;
      if (this.contact(e, hx, hy, hw, hh)) {
        if (!e.T.boss) this.killEnemy(e);
        this.killPlayer();
        return;
      }
    }
  }

  killEnemy(e) {
    e.dead = true;
    this.score += e.T.score;
    const size = e.T.explodeSize ?? (e.T.hp > 1 ? 0.8 : 0.4);
    this.burst(e.x + e.w / 2, e.y + e.h / 2, Math.round(10 + size * 14), 60 + size * 20);
    sfx.explode(size);
    if (e.T.onDeath) e.T.onDeath(e, this);
    if (e.T.score >= 40) {
      this.popups.push({ x: e.x + e.w / 2, y: e.y, text: '+' + e.T.score, t: 0.8 });
      this.shake = Math.max(this.shake, 1.5);
    }
  }

  startBossDeath(e) {
    e.mode = 'dying';
    e.timer = 0;
    e.flash = 0;
    this.enemyShots = [];
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
    this.later(2.2, () => this.levelClear());
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
  }

  killPlayer() {
    const p = this.player;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 36, 95);
    this.shake = 5;
    buzz(HAPTIC.hurt);
    sfx.playerDie();
    this.lives--;
    this.state = 'dying';
    this.stateTimer = 0;
  }

  respawn() {
    const p = this.player;
    p.x = -18;
    p.y = VIEW_H / 2 - p.h / 2;
    p.entering = 0.5;
    p.invuln = PLAYER.respawnInvuln;
    p.cooldown = 0;
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

    for (const pk of this.pickups) {
      const blink = pk.x < 40 && Math.floor(pk.t * 8) % 2 === 0;
      drawCapsule(ctx, pk.kind, snap(pk.x), snap(pk.y), Math.floor(pk.t * 4) % 2 === 0);
      if (blink) {
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(snap(pk.x) + 3, snap(pk.y) - 2, 3, 1);
      }
    }

    for (const e of this.enemies) {
      const spr = e.T.sprite ? SPRITES[e.T.sprite + (e.flash > 0 ? 'Flash' : '')] : null;
      if (e.T.draw) e.T.draw(e, ctx, snap, this, spr);
      else ctx.drawImage(spr, snap(e.x), snap(e.y));
      if (e.charge && Math.floor(this.time * 20) % 2 === 0) {
        ctx.fillStyle = PAL.amberLight;
        ctx.fillRect(snap(e.x - 2), snap(e.y + e.h / 2 - 1), 2, 2);
      }
    }

    for (const s of this.enemyShots) {
      const x = snap(s.x);
      const y = snap(s.y);
      ctx.fillStyle = PAL.red;
      ctx.fillRect(x - 2, y - 1, 4, 2);
      ctx.fillRect(x - 1, y - 2, 2, 4);
      ctx.fillStyle = Math.floor(s.t * 12) % 2 ? PAL.amberLight : PAL.cream;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    this.weapons.draw(ctx, snap);
    this.drawPlayer(ctx, snap);

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

    for (const pp of this.popups) {
      drawTextCentered(ctx, pp.text, snap(pp.x), snap(pp.y), PAL.amberLight);
    }
    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(242, 207, 138, ${this.flash * 1.5})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
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

    const icon = SPRITES.lifeIcon;
    for (let i = 0; i < Math.max(0, this.lives); i++) {
      ctx.drawImage(icon, VIEW_W - 4 - (i + 1) * (icon.width + 3), 2);
    }

    if (this.state !== 'clear') this.weapons.drawHud(ctx);

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

    if (this.state === 'gameover') {
      const k = Math.min(1, this.stateTimer * 2);
      ctx.fillStyle = `rgba(11, 15, 28, ${0.6 * k})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawTextCentered(ctx, 'GAME OVER', VIEW_W / 2 + 1, 45, PAL.redDark, 3);
      drawTextCentered(ctx, 'GAME OVER', VIEW_W / 2, 44, PAL.amber, 3);
      drawTextCentered(ctx, 'SCORE ' + score, VIEW_W / 2, 70, PAL.cream);
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

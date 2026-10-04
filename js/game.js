import { VIEW_W, VIEW_H, HUD_H, PAL, PLAYER } from './config.js?v=0.1.0';
import { SPRITES } from './sprites.js?v=0.1.0';
import { ENEMY_TYPES } from './enemies.js?v=0.1.0';
import { Spawner } from './waves.js?v=0.1.0';
import { Background } from './background.js?v=0.1.0';
import { drawText, drawTextCentered, textWidth } from './font.js?v=0.1.0';
import { buzz, HAPTIC } from './feedback.js?v=0.1.0';

const DIAG = Math.SQRT1_2;
const SPARK_COLORS = [PAL.amberLight, PAL.amber, PAL.amberSoft, PAL.red, PAL.cream];

export class Game {
  constructor() {
    this.rand = Math.random;
    this.bg = new Background(this.rand);
    this.spawner = new Spawner(this.rand);
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = PLAYER.lives;
    this.state = 'playing'; // 'playing' | 'dying' | 'gameover'
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
    this.particles = [];
    this.popups = [];
    this.toast = null;
    this.shake = 0;
    this.spawner.reset();
  }

  // ---- spawning helpers (used by enemy patterns) ----
  spawnEnemy(type, x, y, opts = {}) {
    const T = ENEMY_TYPES[type];
    const spr = SPRITES[T.sprite];
    const e = { type, T, x, y, w: spr.width, h: spr.height, hp: T.hp, t: 0, flash: 0, ...opts };
    T.init(e);
    this.enemies.push(e);
  }

  fireAtPlayer(x, y, speed) {
    const p = this.player;
    const a = Math.atan2(p.y + p.h / 2 - y, p.x + p.w / 2 - x);
    this.enemyShots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: 0 });
  }

  // ---- simulation ----
  update(dt, input) {
    this.time += dt;
    this.bg.update(dt);
    this.updateEffects(dt);

    if (this.state === 'gameover') {
      this.stateTimer += dt;
      this.moveWorld(dt);
      if (input.tap && this.stateTimer > 1.1) this.reset();
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

    this.spawner.update(dt, this);
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
    }
    if (input.special) {
      this.toast = { text: 'NO SPECIAL WEAPON YET', t: 1.4 };
    }
  }

  moveWorld(dt) {
    for (const b of this.bullets) b.x += PLAYER.bulletSpeed * dt;
    this.bullets = this.bullets.filter((b) => b.x < VIEW_W + 8 && !b.dead);

    for (const e of this.enemies) {
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.T.update(e, dt, this);
    }
    this.enemies = this.enemies.filter(
      (e) => !e.dead && e.x > -e.w - 30 && e.y > -60 && e.y < VIEW_H + 60,
    );

    for (const s of this.enemyShots) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.enemyShots = this.enemyShots.filter(
      (s) => !s.dead && s.x > -6 && s.x < VIEW_W + 6 && s.y > -6 && s.y < VIEW_H + 6,
    );
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
    this.shake = Math.max(0, this.shake - dt * 14);
  }

  collide() {
    // Player shots hitting enemies.
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (b.x + 6 > e.x && b.x < e.x + e.w && b.y + 2 > e.y + 1 && b.y < e.y + e.h - 1) {
          b.dead = true;
          e.hp--;
          e.flash = 0.07;
          if (e.hp <= 0) this.killEnemy(e);
          break;
        }
      }
    }

    // Anything hitting the player. The player's hitbox is smaller than the
    // drawing so scrapes that look like near-misses really are misses.
    const p = this.player;
    if (this.state !== 'playing' || p.invuln > 0 || p.entering > 0) return;
    const hx = p.x + 5;
    const hy = p.y + 3;
    const hw = p.w - 9;
    const hh = p.h - 6;
    for (const s of this.enemyShots) {
      if (s.x + 1.5 > hx && s.x - 1.5 < hx + hw && s.y + 1.5 > hy && s.y - 1.5 < hy + hh) {
        s.dead = true;
        this.killPlayer();
        return;
      }
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (hx < e.x + e.w - 2 && hx + hw > e.x + 2 && hy < e.y + e.h - 2 && hy + hh > e.y + 2) {
        this.killEnemy(e);
        this.killPlayer();
        return;
      }
    }
  }

  killEnemy(e) {
    e.dead = true;
    this.score += e.T.score;
    this.burst(e.x + e.w / 2, e.y + e.h / 2, e.T.hp > 1 ? 22 : 12, 70);
    if (e.T.score >= 50) {
      this.popups.push({ x: e.x + e.w / 2, y: e.y, text: '+' + e.T.score, t: 0.8 });
      this.shake = Math.max(this.shake, 1.5);
    }
  }

  killPlayer() {
    const p = this.player;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 36, 95);
    this.shake = 5;
    buzz(HAPTIC.hurt);
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

  burst(x, y, n, speed) {
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
        color: SPARK_COLORS[Math.floor(this.rand() * SPARK_COLORS.length)],
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

    for (const e of this.enemies) {
      const spr = SPRITES[e.T.sprite + (e.flash > 0 ? 'Flash' : '')];
      ctx.drawImage(spr, snap(e.x), snap(e.y));
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

    this.drawHud(ctx);
  }

  drawPlayer(ctx, snap) {
    const p = this.player;
    if (this.state !== 'playing') return;
    // Blink while invulnerable.
    if (p.invuln > 0 && p.entering <= 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
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

    if (this.toast) {
      const w = textWidth(this.toast.text) + 8;
      ctx.fillStyle = 'rgba(14, 18, 34, 0.8)';
      ctx.fillRect(Math.round(VIEW_W / 2 - w / 2), VIEW_H - 20, w, 11);
      drawTextCentered(ctx, this.toast.text, VIEW_W / 2, VIEW_H - 17, PAL.amberLight);
    }

    if (this.state === 'gameover') {
      const k = Math.min(1, this.stateTimer * 2);
      ctx.fillStyle = `rgba(11, 15, 28, ${0.6 * k})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawTextCentered(ctx, 'GAME OVER', VIEW_W / 2 + 1, 59, PAL.redDark, 3);
      drawTextCentered(ctx, 'GAME OVER', VIEW_W / 2, 58, PAL.amber, 3);
      drawTextCentered(ctx, 'SCORE ' + score, VIEW_W / 2, 88, PAL.cream);
      if (this.stateTimer > 1.1 && Math.floor(this.time * 2.5) % 2 === 0) {
        drawTextCentered(ctx, 'TAP TO FLY AGAIN', VIEW_W / 2, 118, PAL.amberLight);
      }
    }
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

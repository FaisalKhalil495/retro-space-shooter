import { VIEW_W, VIEW_H, PAL } from './config.js?v=0.30.0';
import { drawText, drawTextCentered, textWidth } from './font.js?v=0.30.0';
import { FINE, detailCanvas } from './detail.js?v=0.30.0';
import { fillDisc } from './util.js?v=0.30.0';
import { SPRITES } from './sprites.js?v=0.30.0';
import { drawOrb } from './powerups.js?v=0.30.0';
import { drawCapsule } from './weapons.js?v=0.30.0';
import { LEVELS } from './levels.js?v=0.30.0';
import { titleBadge, menuBadge } from './titleart.js?v=0.30.0';
import { save, TOP, bestScore } from './save.js?v=0.30.0';
import { whiteFrontArt } from './whitefront.js?v=0.30.0';

// The menus: title screen, level select, high scores, options, how to play,
// pause, game over, entering your initials and the "to be continued"
// screen after the last level. Drawn by the game itself on the game screen
// (game pixels, our own lettering), so they look the same on every phone
// and match the game. Tapping a button acts on it when the finger lifts on
// it, so a finger that slides off cancels.

// Levels still to come, shown as "coming soon" on the level select.
export const COMING_SOON = 1;
const BOSS_NAMES = { rockjaw: 'ROCKJAW', siegeCrawler: 'SIEGE CRAWLER', glacierWarden: 'GLACIER WARDEN' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NAME_MAX = 8; // letters in a name on the high-score table
const pad6 = (n) => String(n).padStart(6, '0');
const MENU_X = 110; // the main menu's column of buttons
const MENU_W = 92;

export class Menu {
  // hooks: what the buttons do, supplied by main.js.
  constructor(hooks) {
    this.hooks = hooks;
    this.screen = 'title';
    this.back = 'title'; // where Options returns to (the title or the pause menu)
    this.t = 0;
    this.pressed = null;
    this.entry = null; // the name being typed for the high-score table
    this.info = {}; // what the current screen shows (score, level...)
  }

  open(screen, info = {}) {
    if (screen === 'options' || screen === 'help') this.back = this.screen === 'pause' ? 'pause' : 'title';
    this.screen = screen;
    // (Back at the title, nothing from the last game carries over.)
    this.info = screen === 'title' ? { ...info } : { ...this.info, ...info };
    this.pressed = null;
    this.t = 0;
    if (screen === 'entry') {
      this.entry = { name: save.lastName || '' }; // (the last name used, ready to confirm)
    }
  }

  get visible() {
    return this.screen !== null;
  }

  update(dt) {
    this.t += dt;
  }

  // ---- buttons ----
  buttons() {
    const h = this.hooks;
    const s = this.screen;
    const B = [];
    const btn = (id, x, y, w, hh, label, act, kind = 'normal', sub = '') => B.push({ id, x, y, w, h: hh, label, act, kind, sub });
    const backBtn = (to = 'title') => btn('back', 74, 124, 60, 14, 'BACK', () => this.open(to));
    if (s === 'splash') {
      // The opening screen: one tap anywhere goes on to the main menu.
      if (this.t > 0.4) btn('go', 0, 0, VIEW_W, VIEW_H, '', () => h.toMenu(), 'none');
    } else if (s === 'title') {
      // The main menu: one column of buttons on the right, centred
      // top to bottom (the badge sits on the left).
      const lv = LEVELS[save.reached - 1];
      const fresh = save.reached <= 1;
      const items = [];
      items.push(['play', fresh ? 'PLAY' : 'CONTINUE', () => h.play(save.reached, false)]);
      if (!fresh) items.push(['new', 'NEW GAME', () => h.play(1, false)]);
      items.push(['levels', 'LEVELS', () => this.open('levels')]);
      items.push(['scores', 'HIGH SCORES', () => this.open('scores')]);
      items.push(['options', 'OPTIONS', () => this.open('options')]);
      items.push(['help', 'HOW TO PLAY', () => this.open('help')]);
      const gap = 4;
      let y = Math.round((VIEW_H - (22 + (items.length - 1) * (13 + gap))) / 2);
      items.forEach(([id, label, act], i) => {
        if (i === 0) {
          btn(id, MENU_X, y, MENU_W, 22, label, act, 'primary', lv.name);
          y += 22 + gap;
        } else {
          btn(id, MENU_X, y, MENU_W, 13, label, act);
          y += 13 + gap;
        }
      });
    } else if (s === 'levels') {
      for (let i = 0; i < LEVELS.length + COMING_SOON; i++) {
        const lv = LEVELS[i];
        const open = lv && lv.number <= save.reached;
        btn('lv' + (i + 1), 14, 27 + i * 19, 180, 17, '', open ? () => h.play(i + 1, true) : null, open ? 'row' : 'rowOff');
      }
      backBtn();
    } else if (s === 'scores') {
      backBtn();
    } else if (s === 'options') {
      const set = save.settings;
      const vol = (key, y) => {
        btn(key + '-', 98, y - 3, 13, 12, '-', () => h.setting(key, Math.max(0, set[key] - 1)), 'small');
        btn(key + '+', 166, y - 3, 13, 12, '+', () => h.setting(key, Math.min(5, set[key] + 1)), 'small');
      };
      vol('music', 30);
      vol('sound', 50);
      if (h.canVibrate) btn('vibrate', 130, 67, 49, 12, set.vibrate ? 'ON' : 'OFF', () => h.setting('vibrate', !set.vibrate), set.vibrate ? 'on' : 'small');
      btn('blood', 130, 87, 49, 12, set.blood ? 'ON' : 'OFF', () => h.setting('blood', !set.blood), set.blood ? 'on' : 'small');
      backBtn(this.back);
    } else if (s === 'help') {
      backBtn(this.back);
    } else if (s === 'pause') {
      btn('resume', 49, 36, 110, 18, 'RESUME', () => h.resume(), 'primary');
      btn('restart', 49, 58, 110, 14, 'RESTART LEVEL', () => h.restart());
      btn('options', 49, 76, 110, 14, 'OPTIONS', () => this.open('options'));
      btn('help', 49, 94, 110, 14, 'HOW TO PLAY', () => this.open('help'));
      btn('quit', 49, 112, 110, 14, 'QUIT TO TITLE', () => h.quit());
    } else if (s === 'gameover') {
      // (Buttons wait a moment, so a finger still firing doesn't hit one;
      // not when coming back from saving the score.)
      const ready = this.t > 1 || this.info.place >= 0;
      if (ready && this.info.newBest) {
        btn('save', 34, 84, 140, 22, 'SAVE MY SCORE', () => this.open('entry', { after: 'gameover' }), 'primary', 'NEW HIGH SCORE');
      } else if (ready) {
        const lv = LEVELS[(this.info.level || 1) - 1];
        const where = this.info.boss ? 'BOSS' : `LEVEL ${lv.number}`;
        const sub = this.info.practice ? `${where}  PRACTICE` : `${where}  SCORE FROM 0`;
        btn('continue', 34, 84, 140, 22, 'CONTINUE', () => h.continueLevel(), 'primary', sub);
        btn('quit', 34, 110, 140, 14, 'QUIT TO TITLE', () => h.quit());
      }
    } else if (s === 'entry') {
      // Our own keyboard, 7 keys a row (the phone's own keyboard would
      // cover most of the screen when the phone is sideways).
      const e = this.entry;
      for (let i = 0; i < LETTERS.length; i++) {
        const ch = LETTERS[i];
        const x = 21 + (i % 7) * 24;
        const y = 62 + Math.floor(i / 7) * 15;
        btn('key' + ch, x, y, 22, 13, ch, () => {
          if (e.name.length < NAME_MAX) e.name += ch;
        }, 'key');
      }
      btn('del', 21 + 5 * 24, 107, 46, 13, 'DEL', () => {
        e.name = e.name.slice(0, -1);
      }, 'key');
      btn('ok', 74, 126, 60, 14, 'OK', e.name ? () => h.enterName(e.name) : null, e.name ? 'primary' : 'off');
    } else if (s === 'quick') {
      // (Testing links like ?level=2: one tap anywhere starts.)
      btn('go', 0, 0, VIEW_W, VIEW_H, '', () => h.quickStart(), 'none');
    } else if (s === 'end') {
      if (this.t > 2) btn('ok', 64, 120, 80, 16, 'CONTINUE', () => h.endDone(), 'primary');
    }
    return B;
  }

  // A finger touched / lifted at (gx, gy) in game pixels. Buttons count a
  // little past their edges, so near-misses still work.
  hit(gx, gy) {
    const m = 3;
    let best = null;
    let bestD = Infinity;
    for (const b of this.buttons()) {
      if (!b.act) continue;
      if (gx < b.x - m || gx > b.x + b.w + m || gy < b.y - m || gy > b.y + b.h + m) continue;
      const d = Math.abs(gx - (b.x + b.w / 2)) / b.w + Math.abs(gy - (b.y + b.h / 2)) / b.h;
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  down(gx, gy) {
    const b = this.hit(gx, gy);
    this.pressed = b ? b.id : null;
    return !!b;
  }

  up(gx, gy) {
    const b = this.hit(gx, gy);
    const was = this.pressed;
    this.pressed = null;
    if (b && b.id === was) {
      b.act();
      return true;
    }
    return false;
  }

  // ---- drawing ----
  // (The game's own scene, if any, is already drawn underneath.)
  draw(ctx) {
    const s = this.screen;
    if (s === 'pause' || s === 'gameover' || s === 'entry' || ((s === 'options' || s === 'help') && this.back === 'pause')) {
      ctx.fillStyle = 'rgba(11, 15, 28, 0.84)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (s === 'splash') this.drawSplash(ctx);
    else if (s === 'title') this.drawTitle(ctx);
    else if (s === 'levels') this.drawLevels(ctx);
    else if (s === 'scores') this.drawScores(ctx);
    else if (s === 'options') this.drawOptions(ctx);
    else if (s === 'help') this.drawHelp(ctx);
    else if (s === 'pause') heading(ctx, 'PAUSED', 12);
    else if (s === 'gameover') this.drawGameOver(ctx);
    else if (s === 'entry') this.drawEntry(ctx);
    else if (s === 'end') this.drawEnd(ctx);
    else if (s === 'quick') {
      ctx.drawImage(menuBadge(), 52, 10);
      drawTextCentered(ctx, `TEST START  LEVEL ${this.info.level}`, 104, 70, PAL.bluePale);
      if (Math.floor(this.t * 2.5) % 2 === 0) drawTextCentered(ctx, 'TAP TO START', 104, 86, PAL.amberLight);
    }
    for (const b of this.buttons()) drawButton(ctx, b, b.id === this.pressed);
  }

  drawTitle(ctx) {
    // The badge on the left, embers drifting up off it, your best score
    // under it.
    ctx.drawImage(menuBadge(), 3, 42);
    embers(ctx, this.t, 10, 96, 20, 50);
    const best = bestScore();
    if (best) drawTextCentered(ctx, 'BEST  ' + pad6(best), 55, 100, PAL.textDim);
  }

  drawSplash(ctx) {
    ctx.drawImage(titleBadge(), 0, 0);
    embers(ctx, this.t, 10, 170, 40, 60);
    drawTextCentered(ctx, 'DEFEND THE WORLDS', 104, 104, PAL.bluePale);
    if (this.t > 0.4 && Math.floor(this.t * 2.2) % 2 === 0) {
      drawTextCentered(ctx, 'TAP TO CONTINUE', 104.5, 122.5, PAL.ink);
      drawTextCentered(ctx, 'TAP TO CONTINUE', 104, 122, PAL.amberLight);
    }
  }

  drawLevels(ctx) {
    heading(ctx, 'SELECT LEVEL', 4);
    drawTextCentered(ctx, 'PRACTICE  SCORES ARE NOT SAVED', 104, 18, PAL.textDim);
    for (let i = 0; i < LEVELS.length + COMING_SOON; i++) {
      const lv = LEVELS[i];
      const x = 14;
      const y = 27 + i * 19 + (this.pressed === 'lv' + (i + 1) ? FINE : 0);
      const open = lv && lv.number <= save.reached;
      ctx.drawImage(thumb(lv ? i + 1 : 0), x + 2, y + 2);
      if (lv && !open) {
        ctx.fillStyle = 'rgba(11, 15, 28, 0.6)';
        ctx.fillRect(x + 2, y + 2, 28, 13);
        lock(ctx, x + 13.5, y + 4.5);
      }
      if (lv) {
        drawText(ctx, `${lv.number}  ${lv.name}`, x + 35, y + 3, open ? PAL.cream : PAL.textDim);
        drawText(ctx, lv.boss ? 'BOSS  ' + BOSS_NAMES[lv.boss] : 'BOSS  COMING SOON', x + 35, y + 10, open ? PAL.bluePale : '#4d5570');
        if (open) chevron(ctx, x + 172, y + 5.5, PAL.amber);
      } else if (save.finished) {
        // (Only someone who has finished the last level learns it's the
        // last one for now.)
        drawText(ctx, `${i + 1}  ???`, x + 35, y + 3, PAL.textDim);
        drawText(ctx, 'COMING SOON', x + 35, y + 10, PAL.amberSoft);
      } else {
        // Before that, it's just another locked level.
        ctx.fillStyle = 'rgba(11, 15, 28, 0.6)';
        ctx.fillRect(x + 2, y + 2, 28, 13);
        lock(ctx, x + 13.5, y + 4.5);
        drawText(ctx, `${i + 1}  ???`, x + 35, y + 3, PAL.textDim);
        drawText(ctx, 'BOSS  ???', x + 35, y + 10, '#4d5570');
        drawText(ctx, 'LOCKED', x + 180 - 40, y + 3, PAL.textDim);
      }
      if (lv && !open) {
        drawText(ctx, 'LOCKED', x + 180 - 40, y + 3, PAL.textDim);
      }
    }
  }

  drawScores(ctx) {
    heading(ctx, 'HIGH SCORES', 4);
    const fresh = this.info.place;
    for (let i = 0; i < TOP; i++) {
      const s = save.scores[i];
      const y = 21 + i * 9.5;
      const mine = i === fresh && Math.floor(this.t * 3) % 2 === 0;
      const col = !s ? '#4d5570' : mine ? PAL.amberLight : i === 0 ? PAL.amber : PAL.cream;
      const rank = String(i + 1) + '.';
      drawText(ctx, rank, 42 - textWidth(rank), y, s ? PAL.textDim : '#4d5570');
      drawText(ctx, s ? s.name : '---', 50, y, col);
      const sc = s ? pad6(s.score) : '------';
      drawText(ctx, sc, 150 - textWidth(sc), y, col);
      if (s) drawText(ctx, 'L' + s.level, 158, y, PAL.textDim);
    }
  }

  drawOptions(ctx) {
    heading(ctx, 'OPTIONS', 4);
    const set = save.settings;
    const row = (label, y) => drawText(ctx, label, 26, y, PAL.cream);
    const bars = (v, y) => {
      for (let i = 0; i < 5; i++) {
        const x = 118 + i * 9;
        ctx.fillStyle = PAL.ink;
        ctx.fillRect(x - FINE, y - 3 - FINE, 7, 10);
        ctx.fillStyle = i < v ? PAL.amber : '#232c4a';
        ctx.fillRect(x, y - 3, 6, 9);
        if (i < v) {
          ctx.fillStyle = PAL.amberLight;
          ctx.fillRect(x, y - 3, 6, FINE);
        }
      }
    };
    row('MUSIC', 30);
    bars(set.music, 30);
    row('SOUND', 50);
    bars(set.sound, 50);
    row('VIBRATION', 70);
    if (!this.hooks.canVibrate) drawText(ctx, 'NOT SUPPORTED', 107, 70, '#4d5570');
    row('BLOOD', 90);
    drawText(ctx, 'OFF: NO BLOOD FROM CREATURES', 26, 104, PAL.textDim);
  }

  drawHelp(ctx) {
    heading(ctx, 'HOW TO PLAY', 4);
    const lines = (x, y, a, b) => {
      drawText(ctx, a, x, y, PAL.cream);
      drawText(ctx, b, x, y + 7, PAL.textDim);
    };
    // Controls (left).
    ctx.fillStyle = '#232c4a';
    fillDisc(ctx, 12, 27, 6);
    ctx.fillStyle = PAL.bluePale;
    fillDisc(ctx, 14, 25.5, 2.5);
    lines(22, 22, 'LEFT THUMB', 'SLIDE TO STEER');
    button(ctx, 12, 49, 6, PAL.red, 'F');
    lines(22, 44, 'HOLD FIRE', 'RIGHT THUMB');
    button(ctx, 12, 71, 5, PAL.amberDark, 'S');
    lines(22, 66, 'TAP SPECIAL', 'FOR BIG GUNS');
    // Things to know (right).
    ctx.drawImage(SPRITES.carrier, 108, 21);
    lines(124, 22, 'CARGO PODS', 'OPEN FOR LOOT');
    drawOrb(ctx, 'shield', 110, 44);
    lines(124, 44, 'POWER-UPS', 'WORK AT ONCE');
    drawCapsule(ctx, 'ammo', 110, 66);
    lines(124, 66, 'AMMO', 'REFILLS GUNS');
    drawTextCentered(ctx, 'BOSSES WEAR ARMOUR', 104, 90, PAL.amber);
    drawTextCentered(ctx, 'HIT THE WEAK SPOT WHEN IT OPENS', 104, 99, PAL.cream);
    drawTextCentered(ctx, 'EVERY ATTACK IS WARNED FIRST', 104, 108, PAL.textDim);
  }

  drawGameOver(ctx) {
    drawTextCentered(ctx, 'GAME OVER', 105, 17, PAL.redDark, 3);
    drawTextCentered(ctx, 'GAME OVER', 104, 16, PAL.amber, 3);
    if (this.info.quip) drawTextCentered(ctx, this.info.quip, 104, 40, PAL.redSoft);
    drawTextCentered(ctx, 'SCORE  ' + pad6(this.info.score || 0), 104, 54, PAL.cream);
    if (this.info.place >= 0) drawTextCentered(ctx, `NUMBER ${this.info.place + 1} ON THE HIGH SCORES`, 104, 66, PAL.amberLight);
  }

  drawEntry(ctx) {
    heading(ctx, 'NEW HIGH SCORE', 6);
    drawTextCentered(ctx, pad6(this.info.score || 0), 104, 20, PAL.cream, 1.5);
    drawText(ctx, 'NAME', 46, 39, PAL.textDim);
    // The name so far in a box, with a blinking cursor while there's room.
    const name = this.entry.name;
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(73.5, 33.5, 89, 17);
    ctx.fillStyle = '#1d2540';
    ctx.fillRect(74, 34, 88, 16);
    drawText(ctx, name, 78, 37, PAL.amberLight, 1.5);
    if (name.length < NAME_MAX && Math.floor(this.t * 2.5) % 2 === 0) {
      ctx.fillStyle = PAL.amber;
      ctx.fillRect(78 + name.length * 9, 46, 7.5, 1);
    }
    drawText(ctx, name.length + '/' + NAME_MAX, 166, 39, PAL.textDim);
  }

  drawEnd(ctx) {
    // The White Front at dusk, its snowfield quiet, the invaders' landing
    // ships climbing away.
    const art = whiteFrontArt();
    ctx.drawImage(art.sky, 0, 0);
    ctx.drawImage(art.far, 0, 0);
    ctx.drawImage(art.ground.canvas, 0, art.ground.top);
    ctx.fillStyle = 'rgba(11, 15, 28, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillRect(0, 59, VIEW_W, 26); // (darker still behind the small lettering)
    const k = Math.min(1, this.t / 10);
    [[150, 58, 0], [112, 70, 1], [178, 76, 2]].forEach(([x0, y0, i]) => {
      const im = art.ships[i];
      const x = Math.round((x0 + k * (40 + i * 10)) * 2) / 2;
      const y = Math.round((y0 - k * (70 + i * 6)) * 2) / 2;
      ctx.drawImage(im.canvas, x, y);
      if (Math.floor(this.t * 12) % 2) {
        ctx.fillStyle = PAL.amberLight;
        for (const tx of im.thrusters) ctx.fillRect(x + Math.round(tx * 2) / 2, y + Math.round(im.thrustY * 2) / 2, FINE, 1);
      }
    });
    heading(ctx, 'THE FRONT HOLDS', 8);
    drawTextCentered(ctx, 'THE INVADERS RETREAT', 104, 24, PAL.cream);
    drawTextCentered(ctx, 'TO THE EMBER MINES', 104, 32, PAL.cream);
    if (this.t > 1) {
      drawTextCentered(ctx, 'TO BE CONTINUED', 105, 47, PAL.redDark, 2);
      drawTextCentered(ctx, 'TO BE CONTINUED', 104, 46, PAL.amberLight, 2);
    }
    if (this.t > 1.6) {
      drawTextCentered(ctx, 'LEVEL 5  COMING SOON', 104, 64, PAL.bluePale);
      drawTextCentered(ctx, 'FINAL SCORE  ' + pad6(this.info.score || 0), 104, 76, PAL.cream);
    }
  }
}

// ---- pieces ----

// A big title in our lettering, with a dark drop shadow.
function heading(ctx, str, y) {
  drawTextCentered(ctx, str, 104.5, y + FINE, PAL.redDark, 2);
  drawTextCentered(ctx, str, 104, y, PAL.amber, 2);
}

// Embers drifting up from a band (x0..x1, rising from y0 over h).
function embers(ctx, t, x0, x1, y0, h) {
  for (let i = 0; i < 14; i++) {
    const life = (t * 0.45 + i * 0.37) % 1;
    const x = x0 + ((i * 53) % (x1 - x0)) + Math.sin(t * 2 + i) * 2;
    const y = y0 + h - life * h;
    ctx.globalAlpha = 1 - life;
    ctx.fillStyle = i % 3 === 0 ? PAL.amberLight : i % 3 === 1 ? PAL.amber : PAL.redSoft;
    ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, FINE, FINE);
  }
  ctx.globalAlpha = 1;
}

const STYLES = {
  primary: { fill: PAL.amber, lit: PAL.amberLight, shade: PAL.amberDark, text: PAL.ink, sub: PAL.amberDark, down: PAL.amberLight },
  normal: { fill: '#1d2540', lit: '#34406a', shade: PAL.ink, text: PAL.cream, down: '#34406a' },
  small: { fill: '#1d2540', lit: '#34406a', shade: PAL.ink, text: PAL.cream, down: '#34406a' },
  on: { fill: PAL.amberDark, lit: PAL.amberSoft, shade: PAL.ink, text: PAL.amberLight, down: PAL.amberSoft },
  key: { fill: '#1d2540', lit: '#34406a', shade: PAL.ink, text: PAL.cream, down: PAL.amberDark },
  off: { fill: '#141a2e', lit: '#1d2540', shade: PAL.ink, text: '#4d5570', down: '#141a2e' },
};

function drawButton(ctx, b, pressed) {
  if (b.kind === 'none') return;
  if (b.kind === 'row' || b.kind === 'rowOff') {
    // A level row: a quiet panel (its picture and words are drawn by the
    // level screen).
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(b.x, b.y, b.w, FINE);
    ctx.fillRect(b.x, b.y + b.h - FINE, b.w, FINE);
    if (b.kind === 'row') {
      ctx.globalAlpha = pressed ? 0.5 : 0.25;
      ctx.fillStyle = PAL.blueDark;
      ctx.fillRect(b.x, b.y + FINE, b.w, b.h - 1);
      ctx.globalAlpha = 1;
    }
    return;
  }
  const st = STYLES[b.kind] || STYLES.normal;
  const y = b.y + (pressed ? FINE : 0);
  // Ink edge with clipped corners, the face, a lit top and a shaded foot.
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(b.x + FINE, y - FINE, b.w - 1, b.h + 1);
  ctx.fillRect(b.x - FINE, y + FINE, b.w + 1, b.h - 1);
  ctx.fillStyle = pressed ? st.down : st.fill;
  ctx.fillRect(b.x, y, b.w, b.h);
  ctx.fillStyle = st.lit;
  ctx.fillRect(b.x + FINE, y, b.w - 1, FINE);
  ctx.fillStyle = st.shade;
  ctx.fillRect(b.x + FINE, y + b.h - FINE, b.w - 1, FINE);
  const cx = b.x + b.w / 2;
  if (b.sub) {
    drawTextCentered(ctx, b.label, cx, y + 3, st.text, 1.5);
    drawTextCentered(ctx, b.sub, cx, y + 13.5, st.sub || PAL.textDim);
  } else {
    drawTextCentered(ctx, b.label, cx, y + (b.h - 5) / 2, st.text);
  }
}

// A round controller button with a letter, for the help screen.
function button(ctx, cx, cy, r, color, letter) {
  ctx.fillStyle = PAL.ink;
  fillDisc(ctx, cx, cy, r + FINE);
  ctx.fillStyle = color;
  fillDisc(ctx, cx, cy, r);
  drawTextCentered(ctx, letter, cx, cy - 2.5, PAL.cream);
}

// A small padlock.
function lock(ctx, x, y) {
  ctx.fillStyle = PAL.textDim;
  ctx.fillRect(x + 1, y, 3, FINE);
  ctx.fillRect(x + FINE, y + FINE, FINE, 3);
  ctx.fillRect(x + 4, y + FINE, FINE, 3);
  ctx.fillStyle = PAL.amberSoft;
  ctx.fillRect(x, y + 3, 5, 4);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x + 2, y + 4, 1, 1.5);
}

// A tiny picture of each level for the level select (0: still to come),
// painted once.
const thumbs = {};
function thumb(n) {
  if (thumbs[n]) return thumbs[n];
  const { canvas, ctx } = detailCanvas(28, 13);
  const star = (x, y, c = PAL.bluePale) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, FINE, FINE);
  };
  if (n === 1) {
    ctx.fillStyle = PAL.space;
    ctx.fillRect(0, 0, 28, 13);
    [[3, 2], [9, 8], [15, 3], [24, 10], [12, 11], [26, 2]].forEach(([x, y]) => star(x, y));
    ctx.fillStyle = PAL.amber;
    fillDisc(ctx, 22, 4, 2.5);
    ctx.fillStyle = PAL.amberLight;
    fillDisc(ctx, 21.5, 3.5, 1);
    ctx.fillStyle = '#4d3f45';
    fillDisc(ctx, 8, 8, 3);
    ctx.fillStyle = '#75605f';
    fillDisc(ctx, 7.5, 7.5, 2);
  } else if (n === 2) {
    const bands = ['#24161a', '#3a2026', '#5a2e2a'];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * 3, 28, 3);
    });
    ctx.fillStyle = '#2a1a1e';
    ctx.fillRect(0, 6, 28, 7);
    ctx.fillStyle = '#3a2322';
    ctx.fillRect(2, 5, 6, 8);
    ctx.fillRect(15, 4, 4, 9);
    ctx.fillRect(22, 6.5, 5, 7);
    ctx.fillStyle = '#5c3a2e';
    ctx.fillRect(0, 11, 28, 2);
    ctx.fillStyle = '#c4b7a6';
    fillDisc(ctx, 10, 3, 1.5);
  } else if (n === 3) {
    ctx.fillStyle = '#111829';
    ctx.fillRect(0, 0, 28, 13);
    [[2, 9], [6, 3], [13, 11], [25, 8]].forEach(([x, y]) => star(x, y));
    ctx.fillStyle = '#9fb0d0';
    fillDisc(ctx, 20, 5, 3.5);
    ctx.fillStyle = '#c8d4ec';
    fillDisc(ctx, 19.5, 4.5, 2);
    ctx.fillStyle = '#e6eef7';
    ctx.fillRect(13, 5.5, 14, FINE);
    ctx.fillStyle = '#4d6890';
    ctx.fillRect(3.5, 6.5, 7, 5);
    ctx.fillStyle = '#b8cde3';
    ctx.fillRect(4, 7, 6, 4);
    ctx.fillStyle = '#e6eef7';
    ctx.fillRect(4, 7, 6, FINE);
  } else if (n === 4) {
    // The White Front: daylight sky, the sun's halo, white peaks, snow.
    ['#6f8db6', '#8aa6c8', '#a9c3de', '#c7d9ea'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, i * 2, 28, 2);
    });
    ctx.fillStyle = '#c7d9ea';
    ctx.fillRect(0, 8, 28, 1);
    ctx.fillStyle = 'rgba(250,246,236,0.5)';
    fillDisc(ctx, 21, 3, 2.5);
    ctx.fillStyle = '#fbf8ef';
    fillDisc(ctx, 21, 3, 1);
    ctx.fillStyle = '#93aac4';
    for (const [x, h] of [[0, 2], [3, 4], [7, 2.5], [11, 5], [16, 3], [20, 4.5], [25, 2.5]]) {
      ctx.beginPath();
      ctx.moveTo(x - 3, 9);
      ctx.lineTo(x, 9 - h);
      ctx.lineTo(x + 3, 9);
      ctx.fill();
    }
    ctx.fillStyle = '#eef3f8';
    ctx.fillRect(0, 9, 28, 4);
    ctx.fillStyle = '#a8c7e2';
    ctx.fillRect(0, 12, 28, 1);
    ctx.fillStyle = '#4e5461'; // a landing ship coming down
    ctx.fillRect(6, 3, 5, 1.5);
    ctx.fillStyle = '#cf8f3c';
    ctx.fillRect(8, 3, FINE, 1.5);
  } else {
    ctx.fillStyle = PAL.ink;
    ctx.fillRect(0, 0, 28, 13);
    ctx.fillStyle = '#1d2540';
    ctx.fillRect(FINE, FINE, 27, 12);
    drawTextCentered(ctx, '?', 14, 4, PAL.textDim);
  }
  thumbs[n] = canvas;
  return canvas;
}

// A small arrow pointing right.
function chevron(ctx, x, y, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < 4; r++) {
    const w = (4 - r) * 2 - 1;
    ctx.fillRect(x + r, y + 3.5 - w / 2, 1, w);
  }
}

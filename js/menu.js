import { VIEW_W, VIEW_H, PAL } from './config.js?v=0.25.1';
import { drawText, drawTextCentered, textWidth } from './font.js?v=0.25.1';
import { FINE, detailCanvas, pixels, grit } from './detail.js?v=0.25.1';
import { fillDisc } from './util.js?v=0.25.1';
import { SPRITES } from './sprites.js?v=0.25.1';
import { drawOrb } from './powerups.js?v=0.25.1';
import { drawCapsule } from './weapons.js?v=0.25.1';
import { LEVELS } from './levels.js?v=0.25.1';
import { drawShip } from './game.js?v=0.25.1';
import { save, TOP, bestScore } from './save.js?v=0.25.1';

// The menus: title screen, level select, high scores, options, how to play,
// pause, game over, entering your initials and the "to be continued"
// screen after the last level. Drawn by the game itself on the game screen
// (game pixels, our own lettering), so they look the same on every phone
// and match the game. Tapping a button acts on it when the finger lifts on
// it, so a finger that slides off cancels.

// Levels still to come, shown as "coming soon" on the level select.
export const COMING_SOON = 2;
const BOSS_NAMES = { rockjaw: 'ROCKJAW', siegeCrawler: 'SIEGE CRAWLER', glacierWarden: 'GLACIER WARDEN' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const NAME_MAX = 8; // letters in a name on the high-score table
const pad6 = (n) => String(n).padStart(6, '0');

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
    if (s === 'title') {
      const lv = LEVELS[save.reached - 1];
      const fresh = save.reached <= 1;
      btn('play', 42, 52, 124, 22, fresh ? 'PLAY' : 'CONTINUE', () => h.play(save.reached, false), 'primary',
        `LEVEL ${lv.number}  ${lv.name}`);
      if (!fresh) btn('new', 42, 78, 124, 14, 'NEW GAME', () => h.play(1, false));
      const row = fresh ? 82 : 100;
      const labels = [['levels', 'LEVELS'], ['scores', 'SCORES'], ['options', 'OPTIONS'], ['help', 'HELP']];
      labels.forEach(([id, label], i) => btn(id, 6 + i * 50, row, 46, 14, label, () => this.open(id)));
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
    if (s === 'title') this.drawTitle(ctx);
    else if (s === 'levels') this.drawLevels(ctx);
    else if (s === 'scores') this.drawScores(ctx);
    else if (s === 'options') this.drawOptions(ctx);
    else if (s === 'help') this.drawHelp(ctx);
    else if (s === 'pause') heading(ctx, 'PAUSED', 12);
    else if (s === 'gameover') this.drawGameOver(ctx);
    else if (s === 'entry') this.drawEntry(ctx);
    else if (s === 'end') this.drawEnd(ctx);
    else if (s === 'quick') {
      logo(ctx, 40);
      drawTextCentered(ctx, `TEST START  LEVEL ${this.info.level}`, 104, 70, PAL.bluePale);
      if (Math.floor(this.t * 2.5) % 2 === 0) drawTextCentered(ctx, 'TAP TO START', 104, 86, PAL.amberLight);
    }
    for (const b of this.buttons()) drawButton(ctx, b, b.id === this.pressed);
  }

  drawTitle(ctx) {
    const t = this.t;
    // Embers drifting up off the name.
    for (let i = 0; i < 14; i++) {
      const life = (t * 0.45 + i * 0.37) % 1;
      const x = 12 + ((i * 53) % 184) + Math.sin(t * 2 + i) * 2;
      const y = 36 - life * 26;
      ctx.globalAlpha = 1 - life;
      ctx.fillStyle = i % 3 === 0 ? PAL.amberLight : i % 3 === 1 ? PAL.amber : PAL.redSoft;
      ctx.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, FINE, FINE);
    }
    ctx.globalAlpha = 1;
    logo(ctx, 18);
    // A thin rule either side of the tagline.
    const tag = 'DEFEND THE WORLDS';
    const tw = textWidth(tag);
    ctx.fillStyle = PAL.amberDark;
    ctx.fillRect(104 - tw / 2 - 26, 40.5, 20, FINE);
    ctx.fillRect(104 + tw / 2 + 6, 40.5, 20, FINE);
    drawTextCentered(ctx, tag, 104, 38, PAL.bluePale);
    // Your ship, idling on the left, and a gunship-free sky.
    const bob = Math.round(Math.sin(t * 2.2) * 2 * 2) / 2;
    drawShip(ctx, 20, 60 + bob, 3 + (Math.floor(t * 30) % 2));
    const best = bestScore();
    if (best) drawTextCentered(ctx, 'BEST  ' + pad6(best), 104, save.reached <= 1 ? 104 : 121, PAL.textDim);
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
        drawText(ctx, 'BOSS  ' + BOSS_NAMES[lv.boss], x + 35, y + 10, open ? PAL.bluePale : '#4d5570');
        if (open) chevron(ctx, x + 172, y + 5.5, PAL.amber);
      } else {
        drawText(ctx, `${i + 1}  ???`, x + 35, y + 3, PAL.textDim);
        drawText(ctx, 'COMING SOON', x + 35, y + 10, PAL.amberSoft);
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
    ctx.drawImage(planetImage(), 0, PLANET_TOP);
    // The Warden's burning wreck, falling away towards the planet.
    const k = Math.min(1, this.t / 6);
    const wx = 170 - k * 46;
    const wy = 40 + k * 56;
    if (k < 1) {
      for (let i = 1; i < 9; i++) {
        ctx.globalAlpha = 0.5 * (1 - i / 9);
        ctx.fillStyle = PAL.grey;
        ctx.fillRect(Math.round((wx + i * 2.3) * 2) / 2, Math.round((wy - i * 2.5) * 2) / 2, 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = Math.floor(this.t * 12) % 2 ? PAL.amberLight : PAL.amber;
      ctx.fillRect(Math.round(wx * 2) / 2, Math.round(wy * 2) / 2, 1.5, 1.5);
    }
    heading(ctx, 'FROSTRING IS FREE', 8);
    drawTextCentered(ctx, 'THE INVADERS FALL BACK', 104, 24, PAL.cream);
    drawTextCentered(ctx, 'TO THE ICE PLANET BELOW', 104, 32, PAL.cream);
    if (this.t > 1) {
      drawTextCentered(ctx, 'TO BE CONTINUED', 105, 47, PAL.redDark, 2);
      drawTextCentered(ctx, 'TO BE CONTINUED', 104, 46, PAL.amberLight, 2);
    }
    if (this.t > 1.6) {
      drawTextCentered(ctx, 'LEVEL 4  COMING SOON', 104, 64, PAL.bluePale);
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

// EMBER DRIFT: big letters lit pale along the top and darker at the foot,
// over a soft red shadow.
function logo(ctx, y) {
  const s = 'EMBER DRIFT';
  drawTextCentered(ctx, s, 105, y + 1, PAL.redDark, 3);
  drawTextCentered(ctx, s, 104, y, PAL.amber, 3);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y - 2, VIEW_W, 7);
  ctx.clip();
  drawTextCentered(ctx, s, 104, y, PAL.amberLight, 3);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y + 11, VIEW_W, 6);
  ctx.clip();
  drawTextCentered(ctx, s, 104, y, PAL.amberSoft, 3);
  ctx.restore();
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

// The ice planet's curve filling the foot of the "to be continued" screen
// (painted once): snowfields lit from the upper left, faint cloud bands and
// a thin blue haze along the edge.
const PLANET_TOP = 92;
let planet = null;
function planetImage() {
  if (planet) return planet;
  const H = VIEW_H - PLANET_TOP;
  const { canvas } = detailCanvas(VIEW_W, H);
  const px = pixels(canvas);
  const cx = 104;
  const R = 150;
  const cy = PLANET_TOP + R;
  const shades = ['#e6eef7', '#c8d4ec', '#9fb0d0', '#7f9cc0', '#4d6890', '#34406a'];
  for (let fy = 0; fy < H * 2; fy++) {
    for (let fx = 0; fx < VIEW_W * 2; fx++) {
      const x = (fx + 0.5) / 2;
      const y = (fy + 0.5) / 2 + PLANET_TOP;
      const dist = Math.hypot(x - cx, y - cy);
      const d = R - dist; // how far in from the rim
      if (d < -1) continue;
      if (d < 0) {
        px.set(fx, fy, shades[5]); // a thin haze of air round the rim
        continue;
      }
      // Lit from the upper left, as a ball is: brightest facing the sun.
      const nx = (x - cx) / R;
      const ny = (y - cy) / R;
      const lit = -nx * 0.55 - ny * 0.85;
      let i = lit > 0.85 ? 0 : lit > 0.7 ? 1 : lit > 0.5 ? 2 : 3;
      // Soft bands of cloud and snowfield following the curve.
      const band = (d + Math.sin(x * 0.06) * 1.2) % 14;
      if (band > 10 && band < 10.8) i = Math.min(3, i + 1);
      if (d < 1) i = 4; // darker right at the rim
      if (i < 3 && grit(fx, fy, 3) > 0.985) i = 0; // glints of ice
      px.set(fx, fy, shades[i]);
    }
  }
  px.done();
  planet = canvas;
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

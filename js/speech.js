import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.10.0';
import { drawText, textWidth } from './font.js?v=0.10.0';
import { sfx } from './audio.js?v=0.10.0';

// Comic-book speech bubbles for characters that talk (bosses so far).
// A bubble sits beside the speaker, follows them around, points its tail at
// their mouth, and types its words out a letter at a time.
//   'talk' - a round cream bubble with dark text (taunts)
//   'roar' - a jagged amber bubble (pain and fury)
// Bubbles are drawn underneath enemy bullets so they never hide a shot.

const MAX_LINE = 13; // letters per line, so a bubble never covers too much
const TYPE_SPEED = 28; // letters per second
const LINE_H = 7;

export class Speech {
  constructor() {
    this.reset();
  }

  reset() {
    this.bubble = null;
  }

  say(speaker, text, style = 'talk', dur = 2.6) {
    this.bubble = { speaker, lines: wrap(text), style, t: 0, dur, typed: 0 };
  }

  update(dt) {
    const b = this.bubble;
    if (!b) return;
    if (b.speaker.dead || b.t > b.dur) {
      this.bubble = null;
      return;
    }
    b.t += dt;
    const total = b.lines.join('').length;
    const typed = Math.min(total, Math.floor(b.t * TYPE_SPEED));
    // A low growl blip every few letters while it's typing.
    if (typed > b.typed && Math.floor(typed / 3) > Math.floor(b.typed / 3)) sfx.voice(b.style === 'roar');
    b.typed = typed;
  }

  draw(ctx, snap) {
    const b = this.bubble;
    if (!b) return;
    if (b.t > b.dur - 0.25 && Math.floor(b.t * 20) % 2 === 0) return; // blinks out
    const e = b.speaker;
    const anchor = e.T.aimPoint ? e.T.aimPoint(e) : { x: e.x + e.w / 2, y: e.y + e.h / 2 };
    const ax = snap(anchor.x);
    const ay = snap(anchor.y);
    const w = Math.max(...b.lines.map((l) => textWidth(l))) + 8;
    const h = b.lines.length * LINE_H + 5;
    // Up and to the left of the mouth (towards the player), kept on screen.
    let bx = Math.round(Math.min(Math.max(ax - w - 6, 2), VIEW_W - w - 2));
    let by = Math.round(Math.min(Math.max(ay - h - 10, HUD_H + 4), VIEW_H - h - 2));
    // If the mouth is right under the bubble, put the bubble below instead.
    if (ay < by + h + 3 && ay > by - 3) by = Math.min(VIEW_H - h - 2, ay + 10);

    const roar = b.style === 'roar';
    const fill = roar ? PAL.amberSoft : PAL.cream;
    const ink = PAL.ink;
    const pop = b.t < 0.08 ? 1 : 0; // a one-frame bigger "pop" as it appears

    // Tail: a short tapering line of blocks from the bubble towards the mouth.
    const tx = Math.min(Math.max(ax, bx + 4), bx + w - 5);
    const ty = ay > by ? by + h : by;
    const dx = ax - tx;
    const dy = ay - ty;
    const len = Math.min(8, Math.hypot(dx, dy));
    const ux = dx / (Math.hypot(dx, dy) || 1);
    const uy = dy / (Math.hypot(dx, dy) || 1);
    for (let i = len; i >= 0; i--) {
      const s = i < 3 ? 3 : i < 6 ? 2 : 1;
      const px = Math.round(tx + ux * i - s / 2);
      const py = Math.round(ty + uy * i - s / 2);
      ctx.fillStyle = ink;
      ctx.fillRect(px - 1, py - 1, s + 2, s + 2);
    }
    for (let i = len - 1; i >= 0; i--) {
      const s = i < 3 ? 3 : i < 6 ? 2 : 1;
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(tx + ux * i - s / 2), Math.round(ty + uy * i - s / 2), s, s);
    }

    // Body.
    const x0 = bx - pop;
    const y0 = by - pop;
    const W = w + pop * 2;
    const H = h + pop * 2;
    ctx.fillStyle = ink;
    if (roar) {
      // Jagged edge: little spikes all the way round.
      for (let x = x0 + 2; x < x0 + W - 2; x += 5) {
        ctx.fillRect(x, y0 - 2, 2, 2);
        ctx.fillRect(x + 2, y0 + H, 2, 2);
      }
      for (let y = y0 + 2; y < y0 + H - 2; y += 5) {
        ctx.fillRect(x0 - 2, y, 2, 2);
        ctx.fillRect(x0 + W, y + 2, 2, 2);
      }
      ctx.fillRect(x0 - 1, y0 - 1, W + 2, H + 2);
    } else {
      // Rounded corners.
      ctx.fillRect(x0, y0 - 1, W, H + 2);
      ctx.fillRect(x0 - 1, y0, W + 2, H);
    }
    ctx.fillStyle = fill;
    if (roar) ctx.fillRect(x0, y0, W, H);
    else {
      ctx.fillRect(x0 + 1, y0, W - 2, H);
      ctx.fillRect(x0, y0 + 1, W, H - 2);
    }
    // Restore the tail joint so it looks attached.
    ctx.fillRect(tx - 1, ty - 1, 3, 2);

    // Words, typed out.
    let left = b.typed;
    b.lines.forEach((line, i) => {
      const shown = line.slice(0, Math.max(0, left));
      left -= line.length;
      const lx = bx + Math.round((w - textWidth(line)) / 2);
      drawText(ctx, shown, lx, by + 3 + i * LINE_H, roar ? PAL.ink : PAL.redDark);
    });
  }
}

function wrap(text) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > MAX_LINE) {
      lines.push(line);
      line = word;
    } else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

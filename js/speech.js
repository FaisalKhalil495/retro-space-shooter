import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.10.1';
import { drawText, textWidth } from './font.js?v=0.10.1';
import { sfx } from './audio.js?v=0.10.1';

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
    const lines = wrap(text);
    this.bubble = {
      speaker, lines, style, t: 0, dur, typed: 0,
      total: lines.join('').length,
      w: Math.max(...lines.map((l) => textWidth(l))) + 8,
      h: lines.length * LINE_H + 5,
    };
  }

  update(dt) {
    const b = this.bubble;
    if (!b) return;
    if (b.speaker.dead || b.t > b.dur) {
      this.bubble = null;
      return;
    }
    b.t += dt;
    const typed = Math.min(b.total, Math.floor(b.t * TYPE_SPEED));
    // A low growl blip every few letters while it's typing.
    if (typed > b.typed && Math.floor(typed / 3) > Math.floor(b.typed / 3)) sfx.voice(b.style === 'roar');
    b.typed = typed;
  }

  // anchorOf(e) gives the point the tail aims at (the speaker's mouth).
  draw(ctx, snap, anchorOf) {
    const b = this.bubble;
    if (!b) return;
    if (b.t > b.dur - 0.25 && Math.floor(b.t * 20) % 2 === 0) return; // blinks out
    const e = b.speaker;
    const anchor = anchorOf(e);
    const ax = snap(anchor.x);
    const ay = snap(anchor.y);
    const { w, h } = b;
    // Bubbles are drawn under the speaker, so pick the first spot that keeps
    // clear of their body: up-left of the mouth (towards the player), then
    // above them, then below them. Always kept on screen.
    const fit = (x, y) => ({
      x: Math.round(Math.min(Math.max(x, 2), VIEW_W - w - 2)),
      y: Math.round(Math.min(Math.max(y, HUD_H + 4), VIEW_H - h - 2)),
    });
    const clearOf = (p) =>
      p.x + w < e.x - 1 || p.x > e.x + e.w + 1 || p.y + h < e.y - 1 || p.y > e.y + e.h + 1;
    const spots = [fit(ax - w - 6, ay - h - 10), fit(ax - w / 2, e.y - h - 8), fit(ax - w / 2, e.y + e.h + 8)];
    const { x: bx, y: by } = spots.find(clearOf) || spots[0];

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

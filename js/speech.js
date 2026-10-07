import { VIEW_W, VIEW_H, HUD_H, PAL } from './config.js?v=0.18.0';
import { drawText, textWidth } from './font.js?v=0.18.0';
import { sfx } from './audio.js?v=0.18.0';

// Comic-book speech bubbles for characters that talk (bosses so far).
// A bubble sits beside the speaker, follows them around, points its tail at
// their mouth, and types its words out a letter at a time.
//   'talk' - a round cream bubble with dark text (taunts)
//   'roar' - a jagged amber bubble (pain and fury)
// Bubbles are drawn underneath enemy bullets so they never hide a shot.

const MAX_LINE = 18; // letters per line: most lines fit on two, so it's short
const TYPE_SPEED = 40; // letters per second
const LINE_H = 7;

export class Speech {
  constructor() {
    this.reset();
  }

  reset() {
    this.bubble = null;
  }

  say(speaker, text, style = 'talk', dur = 2.0) {
    const lines = wrap(text);
    const lineW = lines.map((l) => textWidth(l));
    this.bubble = {
      speaker, lines, style, t: 0, dur, typed: 0,
      total: lines.join('').length,
      lineW,
      w: Math.max(...lineW) + 8,
      spot: -1, // which placement it's using (kept while it still fits)
      h: lines.length * LINE_H + 5,
    };
  }

  // Is this character's bubble still up?
  isSpeaking(speaker) {
    return !!this.bubble && this.bubble.speaker === speaker;
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
    if (typed > b.typed && Math.floor(typed / 3) > Math.floor(b.typed / 3)) sfx.voice(b.style === 'roar', b.speaker.T && b.speaker.T.voice);
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
    // Bubbles are drawn under the speaker, so they must keep clear of their
    // body. Placements, in order of preference: above them, then below them
    // (both out of the space between you and the boss), then up-left of the
    // mouth, then beside them as a last resort. The
    // bubble keeps its placement while it still fits, so it doesn't jump
    // about as the speaker moves; otherwise it takes the clearest one.
    let spot = b.spot >= 0 ? placement(b.spot, e, ax, ay, w, h) : null;
    if (!spot || overlap(spot, e, w, h) > 0) {
      let best = Infinity;
      for (let i = 0; i < 4; i++) {
        const s = placement(i, e, ax, ay, w, h);
        const o = overlap(s, e, w, h);
        if (o < best) {
          best = o;
          spot = s;
          b.spot = i;
          if (o === 0) break;
        }
      }
    }
    const { x: bx, y: by } = spot;

    const roar = b.style === 'roar';
    const fill = roar ? PAL.amberSoft : PAL.cream;
    const ink = PAL.ink;
    const pop = b.t < 0.08 ? 1 : 0; // a one-frame bigger "pop" as it appears

    // Tail: a short tapering line of blocks from the bubble towards the mouth.
    // The tail leaves from the side facing the mouth: the right or left edge
    // when the mouth is level with the bubble, otherwise the top or bottom.
    const level = ay > by + 2 && ay < by + h - 2;
    const tx = level ? (ax > bx ? bx + w : bx - 1) : Math.min(Math.max(ax, bx + 4), bx + w - 5);
    const ty = level ? ay : ay > by ? by + h : by;
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
    if (level) ctx.fillRect(ax > bx ? tx - 1 : tx, ty - 1, 2, 3);
    else ctx.fillRect(tx - 1, ty - 1, 3, 2);

    // Words, typed out.
    let left = b.typed;
    b.lines.forEach((line, i) => {
      const shown = line.slice(0, Math.max(0, left));
      left -= line.length;
      const lx = bx + Math.round((w - b.lineW[i]) / 2);
      drawText(ctx, shown, lx, by + 3 + i * LINE_H, roar ? PAL.ink : PAL.redDark);
    });
  }
}

// Where a bubble goes for placement i, kept on screen.
function placement(i, e, ax, ay, w, h) {
  const x = i === 0 || i === 1 ? ax - w / 2 : i === 2 ? ax - w - 6 : e.x - w - 6;
  const y = i === 0 ? e.y - h - 8 : i === 1 ? e.y + e.h + 8 : i === 2 ? ay - h - 10 : ay - h / 2;
  return {
    x: Math.round(Math.min(Math.max(x, 2), VIEW_W - w - 2)),
    y: Math.round(Math.min(Math.max(y, HUD_H + 4), VIEW_H - h - 2)),
  };
}

// How many pixels of the bubble would sit under the speaker's body.
function overlap(p, e, w, h) {
  const ox = Math.min(p.x + w, e.x + e.w) - Math.max(p.x, e.x);
  const oy = Math.min(p.y + h, e.y + e.h) - Math.max(p.y, e.y);
  return ox > 0 && oy > 0 ? ox * oy : 0;
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

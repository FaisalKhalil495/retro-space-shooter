import { PAL } from './config.js?v=0.19.2';
import { clamp } from './util.js?v=0.19.2';
import { drawTextCentered } from './font.js?v=0.19.2';
import { buzz, canVibrate, HAPTIC } from './feedback.js?v=0.19.2';
import { sfx } from './audio.js?v=0.19.2';

// Console-style touch controls.
//
// Left half of the screen: a floating direction pad. It appears wherever the
// thumb lands and sliding steers in 8 directions. If the thumb slides past
// the ring, the ring follows it, so reversing direction is always a short move.
//
// Right half of the screen: Fire and Special. Any touch on the right half
// goes to the nearest button, so the touch areas are far bigger than the
// drawn buttons and near-misses still count. A thumb can also slide from one
// button to the other.

const PAD_RADIUS = 46;     // CSS px: how far the thumb travels for full steer
const PAD_DEAD = 11;       // CSS px: wiggle room before the ship moves
const SECTOR = Math.PI / 4;
const HYSTERESIS = 0.12;   // radians: stops flicker between two directions

const DIRS = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

export class Controls {
  constructor(target) {
    this.target = target;
    this.layout = null;
    this.pad = { active: false, id: null, cx: 0, cy: 0, x: 0, y: 0, dir: -1, used: false };
    this.buttons = {
      fire: { name: 'fire', label: 'FIRE', x: 0, y: 0, r: 40, held: 0, ripples: [] },
      special: { name: 'special', label: 'SPECIAL', x: 0, y: 0, r: 31, held: 0, ripples: [] },
    };
    this.pointerButton = new Map(); // pointerId -> button name
    this.keys = new Set();
    this.specialQueued = false;
    this.tapQueued = false;
    this.enabled = true;

    target.addEventListener('pointerdown', (e) => this.onDown(e), { passive: false });
    target.addEventListener('pointermove', (e) => this.onMove(e), { passive: false });
    target.addEventListener('pointerup', (e) => this.onUp(e));
    target.addEventListener('pointercancel', (e) => this.onUp(e));
    target.addEventListener('lostpointercapture', (e) => this.onUp(e));
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  setLayout(layout) {
    this.layout = layout;
    const z = layout.rightZone;
    const fire = this.buttons.fire;
    const special = this.buttons.special;
    // Fire sits where the right thumb rests; Special is up and to the right,
    // on the arc the thumb sweeps when it pivots from the corner of the phone.
    fire.r = clamp(z.w * 0.27, 30, 46);
    special.r = fire.r * 0.84;
    fire.x = z.x + z.w * 0.4;
    fire.y = z.y + z.h * 0.7;
    special.x = Math.min(fire.x + z.w * 0.33, z.x + z.w - special.r - 8);
    special.y = fire.y - z.h * 0.3;
  }

  // ---- pointer handling ----
  onDown(e) {
    e.preventDefault();
    this.tapQueued = true;
    if (!this.enabled || !this.layout) return;
    try {
      this.target.setPointerCapture(e.pointerId);
    } catch {
      // Not critical; events still arrive without capture.
    }
    const leftSide = e.clientX < this.layout.cssW / 2;
    if (leftSide) {
      if (this.pad.active) return; // already steering with another finger
      const p = this.pad;
      p.active = true;
      p.id = e.pointerId;
      p.cx = p.x = e.clientX;
      p.cy = p.y = e.clientY;
      p.dir = -1;
      p.used = true;
    } else {
      this.setPointerButton(e.pointerId, this.nearestButton(e.clientX, e.clientY));
    }
  }

  onMove(e) {
    if (!this.layout) return;
    if (this.pad.active && e.pointerId === this.pad.id) {
      e.preventDefault();
      this.updatePad(e.clientX, e.clientY);
    } else if (this.pointerButton.has(e.pointerId)) {
      e.preventDefault();
      this.setPointerButton(e.pointerId, this.nearestButton(e.clientX, e.clientY));
    }
  }

  onUp(e) {
    if (this.pad.active && e.pointerId === this.pad.id) {
      this.pad.active = false;
      this.pad.id = null;
      this.pad.dir = -1;
    }
    if (this.pointerButton.has(e.pointerId)) {
      this.setPointerButton(e.pointerId, null);
      this.pointerButton.delete(e.pointerId);
    }
  }

  updatePad(x, y) {
    const p = this.pad;
    p.x = x;
    p.y = y;
    let dx = x - p.cx;
    let dy = y - p.cy;
    const dist = Math.hypot(dx, dy);
    if (dist > PAD_RADIUS) {
      // Drag the ring along behind the thumb.
      const k = (dist - PAD_RADIUS) / dist;
      p.cx += dx * k;
      p.cy += dy * k;
      dx = x - p.cx;
      dy = y - p.cy;
    }
    let dir = -1;
    if (dist >= PAD_DEAD) {
      const ang = Math.atan2(dy, dx);
      dir = mod(Math.round(ang / SECTOR), 8);
      // Stick with the current direction unless the thumb is clearly past
      // the boundary, so the ship doesn't jitter between two directions.
      if (p.dir >= 0 && dir !== p.dir) {
        const off = Math.abs(angleDiff(ang, p.dir * SECTOR));
        if (off < SECTOR / 2 + HYSTERESIS) dir = p.dir;
      }
    }
    if (dir !== p.dir) {
      if (dir >= 0) {
        buzz(HAPTIC.direction);
        if (!canVibrate) sfx.tick(); // iPhone: a soft tick instead of a buzz
      }
      p.dir = dir;
    }
  }

  nearestButton(x, y) {
    let best = null;
    let bestScore = Infinity;
    for (const b of Object.values(this.buttons)) {
      const score = Math.hypot(x - b.x, y - b.y) / b.r; // bigger buttons win ties
      if (score < bestScore) {
        bestScore = score;
        best = b.name;
      }
    }
    return best;
  }

  setPointerButton(id, name) {
    const prev = this.pointerButton.get(id) || null;
    if (prev === name) return;
    if (prev) this.buttons[prev].held--;
    if (name) {
      const b = this.buttons[name];
      b.held++;
      this.press(b);
    }
    this.pointerButton.set(id, name);
  }

  press(b) {
    buzz(HAPTIC.button);
    if (!canVibrate) sfx.click(); // iPhone: a click instead of a buzz
    b.ripples.push({ t: 0 });
    if (b.name === 'special') this.specialQueued = true;
  }

  // ---- keyboard (for testing on a computer) ----
  onKey(e, down) {
    const map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down',
      ' ': 'fire', j: 'fire', z: 'fire', k: 'special', x: 'special',
    };
    const key = map[e.key] || map[e.key.toLowerCase?.()];
    if (!key) return;
    e.preventDefault();
    if (down) {
      this.tapQueued = true;
      if (this.keys.has(key)) return;
      this.keys.add(key);
      if (key === 'fire' || key === 'special') {
        this.buttons[key].held++;
        this.press(this.buttons[key]);
      }
    } else {
      if (!this.keys.has(key)) return;
      this.keys.delete(key);
      if (key === 'fire' || key === 'special') this.buttons[key].held--;
    }
  }

  // Forget every touch, e.g. when the game pauses, so nothing stays stuck.
  releaseAll() {
    this.pad.active = false;
    this.pad.id = null;
    this.pad.dir = -1;
    this.pointerButton.clear();
    this.keys.clear();
    for (const b of Object.values(this.buttons)) b.held = 0;
    this.specialQueued = false;
    this.tapQueued = false;
  }

  // Snapshot for the game, read once per frame.
  read() {
    let dx = 0;
    let dy = 0;
    if (this.pad.active && this.pad.dir >= 0) {
      [dx, dy] = DIRS[this.pad.dir];
    }
    if (this.keys.has('left')) dx = -1;
    if (this.keys.has('right')) dx = 1;
    if (this.keys.has('up')) dy = -1;
    if (this.keys.has('down')) dy = 1;
    const state = {
      dx,
      dy,
      fire: this.buttons.fire.held > 0,
      special: this.specialQueued,
      tap: this.tapQueued,
    };
    this.specialQueued = false;
    this.tapQueued = false;
    return state;
  }

  // ---- drawing (in CSS pixels) ----
  draw(ctx, dt) {
    if (!this.layout) return;
    this.drawPad(ctx);
    for (const b of Object.values(this.buttons)) this.drawButton(ctx, b, dt);
  }

  drawPad(ctx) {
    const p = this.pad;
    const z = this.layout.leftZone;
    let cx;
    let cy;
    let alpha;
    if (p.active) {
      cx = p.cx;
      cy = p.cy;
      alpha = 1;
    } else {
      // Resting hint in the middle of the left margin.
      cx = z.x + z.w / 2;
      cy = z.y + z.h * 0.62;
      alpha = p.used ? 0.16 : 0.35;
    }
    ctx.save();
    ctx.globalAlpha = alpha;

    // Ring base.
    ctx.fillStyle = 'rgba(29, 37, 64, 0.85)';
    circle(ctx, cx, cy, PAD_RADIUS + 10);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = PAL.blueDark;
    ctx.stroke();

    // Active direction wedge.
    if (p.active && p.dir >= 0) {
      const a = p.dir * SECTOR;
      ctx.fillStyle = 'rgba(227, 168, 87, 0.28)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, PAD_RADIUS + 10, a - SECTOR / 2, a + SECTOR / 2);
      ctx.closePath();
      ctx.fill();
    }

    // 8 direction notches.
    for (let i = 0; i < 8; i++) {
      const a = i * SECTOR;
      const lit = p.active && p.dir === i;
      ctx.fillStyle = lit ? PAL.amber : PAL.blue;
      const r = PAD_RADIUS + 2;
      const s = i % 2 === 0 ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r + s), cy + Math.sin(a) * (r + s));
      ctx.lineTo(cx + Math.cos(a + 0.16) * (r - s), cy + Math.sin(a + 0.16) * (r - s));
      ctx.lineTo(cx + Math.cos(a - 0.16) * (r - s), cy + Math.sin(a - 0.16) * (r - s));
      ctx.closePath();
      ctx.fill();
    }

    // Thumb knob.
    let kx = cx;
    let ky = cy;
    if (p.active) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.hypot(dx, dy);
      const k = d > PAD_RADIUS ? PAD_RADIUS / d : 1;
      kx = cx + dx * k;
      ky = cy + dy * k;
    }
    ctx.fillStyle = PAL.ink;
    circle(ctx, kx, ky + 3, 22);
    ctx.fill();
    ctx.fillStyle = p.active ? PAL.amberSoft : PAL.blue;
    circle(ctx, kx, ky, 22);
    ctx.fill();
    ctx.fillStyle = p.active ? PAL.amber : PAL.bluePale;
    circle(ctx, kx, ky - 2, 15);
    ctx.fill();

    if (!p.used) {
      drawTextCentered(ctx, 'MOVE', cx, cy + PAD_RADIUS + 20, PAL.bluePale, 2);
    }
    ctx.restore();
  }

  drawButton(ctx, b, dt) {
    const pressed = b.held > 0;
    const isFire = b.name === 'fire';
    const face = isFire ? PAL.amberSoft : PAL.red;
    const faceLit = isFire ? PAL.amberLight : PAL.redSoft;
    const rim = isFire ? PAL.amberDark : PAL.redDark;
    const sink = pressed ? 3 : 0;

    // Ripples: a ring that spreads out from a fresh press. Bigger on phones
    // that can't vibrate, so a press is unmistakable by eye.
    const spread = canVibrate ? 16 : 30;
    const life = canVibrate ? 0.25 : 0.38;
    b.ripples = b.ripples.filter((rp) => (rp.t += dt) < life);
    for (const rp of b.ripples) {
      const k = rp.t / life;
      ctx.strokeStyle = faceLit;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.lineWidth = canVibrate ? 3 : 5;
      circle(ctx, b.x, b.y, b.r + 4 + k * spread);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Base (the "hole" the button sits in).
    ctx.fillStyle = PAL.ink;
    circle(ctx, b.x, b.y + 4, b.r + 3);
    ctx.fill();
    // Side of the button (gives it height).
    ctx.fillStyle = rim;
    circle(ctx, b.x, b.y + 3, b.r);
    ctx.fill();
    // Face.
    ctx.fillStyle = pressed ? faceLit : face;
    circle(ctx, b.x, b.y - 1 + sink, b.r);
    ctx.fill();
    // Soft highlight crescent on the top edge.
    if (!pressed) {
      ctx.strokeStyle = 'rgba(242, 207, 138, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y - 1, b.r - 4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    const px = Math.min(2, (b.r * 1.55) / (b.label.length * 6 - 1));
    drawTextCentered(ctx, b.label, b.x, b.y - 1 + sink - 2.5 * px, pressed ? PAL.ink : PAL.cream, px);
  }
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}
function mod(n, m) {
  return ((n % m) + m) % m;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

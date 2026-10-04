import { VIEW_W, VIEW_H, PAL } from './config.js?v=0.1.0';

// Deep-space backdrop: a slow distant amber sun and three layers of stars
// moving at different speeds, which gives a sense of depth (parallax).
const LAYERS = [
  { count: 30, speed: 4, color: PAL.blueDark, size: 1 },
  { count: 20, speed: 11, color: PAL.blue, size: 1 },
  { count: 9, speed: 26, color: PAL.bluePale, size: 1 },
];

// A faint band of space dust, drawn once with a checkerboard "dither"
// pattern (the classic pixel-art way to fade between two colours).
const DUST_H = 26;
function makeDust() {
  const cv = document.createElement('canvas');
  cv.width = VIEW_W * 2;
  cv.height = DUST_H;
  const c = cv.getContext('2d');
  c.fillStyle = '#19203a';
  for (let y = 0; y < DUST_H; y++) {
    const edge = Math.min(y, DUST_H - 1 - y); // 0 at the edges, larger inside
    for (let x = 0; x < cv.width; x++) {
      const wobble = Math.sin((x / cv.width) * Math.PI * 6) * 2;
      const solid = edge + wobble > 6;
      const dither = edge + wobble > 2 && (x + y) % 2 === 0;
      if (solid || dither) c.fillRect(x, y, 1, 1);
    }
  }
  return cv;
}

export class Background {
  constructor(rand) {
    this.rand = rand;
    this.stars = [];
    for (const layer of LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          x: rand() * VIEW_W,
          y: rand() * VIEW_H,
          layer,
          twinkle: rand() * Math.PI * 2,
        });
      }
    }
    this.sunX = VIEW_W * 0.8;
    this.dust = makeDust();
    this.dustX = 0;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    for (const s of this.stars) {
      s.x -= s.layer.speed * dt;
      if (s.x < -2) {
        s.x += VIEW_W + 4;
        s.y = this.rand() * VIEW_H;
      }
    }
    this.sunX -= 0.6 * dt;
    if (this.sunX < -40) this.sunX = VIEW_W + 40;
    this.dustX = (this.dustX + 3 * dt) % VIEW_W;
  }

  draw(ctx, snap) {
    ctx.fillStyle = PAL.space;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.drawImage(this.dust, -snap(this.dustX), Math.round(VIEW_H * 0.6));

    // Distant sun drawn as flat pixel rings (no glow), kept dim so it never
    // hides enemies or shots.
    const sx = snap(this.sunX);
    const sy = 30;
    const rings = [
      [15, '#262638'],
      [12, '#4a3530'],
      [9, PAL.amberDark],
      [6, '#a87545'],
    ];
    for (const [r, c] of rings) {
      ctx.fillStyle = c;
      pixelDisc(ctx, sx, sy, r);
    }

    for (const s of this.stars) {
      const bright = s.layer.speed > 20 && Math.sin(this.t * 3 + s.twinkle) > 0.6;
      ctx.fillStyle = bright ? PAL.cream : s.layer.color;
      ctx.fillRect(snap(s.x), snap(s.y), s.layer.size, s.layer.size);
    }
  }
}

// A filled circle built from horizontal pixel rows, so its edge is stepped
// like pixel art rather than smooth.
function pixelDisc(ctx, cx, cy, r) {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

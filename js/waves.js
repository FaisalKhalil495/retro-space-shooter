import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.1.0';

// Stage 1 test flight: an endless stream of enemy formations that slowly gets
// harder. Stage 2 replaces this with a hand-designed level.
const TOP = HUD_H + 10;
const BOTTOM = VIEW_H - 16;

const PATTERNS = {
  // A row of drifters following each other.
  row(game, rand) {
    const n = 4 + Math.floor(rand() * 3);
    const y = TOP + rand() * (BOTTOM - TOP);
    for (let i = 0; i < n; i++) game.spawnEnemy('drifter', VIEW_W + 8 + i * 15, y);
  },
  // A diagonal line, high-to-low or low-to-high.
  slant(game, rand) {
    const n = 5;
    const down = rand() < 0.5;
    for (let i = 0; i < n; i++) {
      const y = down ? TOP + i * 22 : BOTTOM - i * 22;
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 13, y, { speed: 52 });
    }
  },
  // A wall of drifters with one gap to fly through (or shoot open).
  wall(game, rand) {
    const slots = 5;
    const gap = 1 + Math.floor(rand() * (slots - 2));
    const step = (BOTTOM - TOP) / (slots - 1);
    for (let i = 0; i < slots; i++) {
      if (i === gap) continue;
      game.spawnEnemy('drifter', VIEW_W + 8, TOP + i * step - 4, { speed: 38 });
    }
  },
  // A snake of weavers.
  snake(game, rand) {
    const n = 5 + Math.floor(rand() * 3);
    const y = TOP + 18 + rand() * (BOTTOM - TOP - 36);
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('weaver', VIEW_W + 8 + i * 14, y, { phase: -i * 0.55, amp: 16 });
    }
  },
  // One or two gunships.
  gunner(game, rand, level) {
    const two = level > 0.35 && rand() < 0.6;
    if (two) {
      game.spawnEnemy('gunner', VIEW_W + 8, TOP + 6, { targetX: VIEW_W - 48 });
      game.spawnEnemy('gunner', VIEW_W + 28, BOTTOM - 16, { targetX: VIEW_W - 32 });
    } else {
      game.spawnEnemy('gunner', VIEW_W + 8, TOP + rand() * (BOTTOM - TOP - 12));
    }
  },
};

export class Spawner {
  constructor(rand) {
    this.rand = rand;
    this.reset();
  }

  reset() {
    this.waves = 0;
    this.next = 1.6;
  }

  update(dt, game) {
    this.next -= dt;
    if (this.next > 0) return;
    const level = Math.min(1, this.waves / 30); // 0 = gentle, 1 = full pressure
    this.spawnWave(game, level);
    this.waves++;
    this.next = 3.3 - level * 1.5 + this.rand() * 0.7;
  }

  spawnWave(game, level) {
    if (this.waves < 2) {
      PATTERNS.row(game, this.rand);
      return;
    }
    const weights = {
      row: 3,
      slant: 2,
      snake: 3,
      wall: this.waves > 5 ? 2 : 0,
      gunner: this.waves > 2 ? 2 + level * 2 : 0,
    };
    const name = pick(weights, this.rand);
    PATTERNS[name](game, this.rand, level);
    // Later on, sometimes add a gunship on top of another formation.
    if (name !== 'gunner' && level > 0.5 && this.rand() < level * 0.4) {
      PATTERNS.gunner(game, this.rand, 0);
    }
  }
}

function pick(weights, rand) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [name, w] of Object.entries(weights)) {
    r -= w;
    if (r < 0) return name;
  }
  return Object.keys(weights)[0];
}

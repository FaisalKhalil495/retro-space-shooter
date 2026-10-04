import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.2.0';

// Enemy formations. Levels are built by placing these on a timeline
// (see levels.js). Every pattern takes the game, a random-number function
// and an options object.
const TOP = HUD_H + 10;
const BOTTOM = VIEW_H - 16;

export const PATTERNS = {
  // A row of drifters following each other.
  row(game, rand, { n = 5, y } = {}) {
    const yy = y ?? TOP + rand() * (BOTTOM - TOP);
    for (let i = 0; i < n; i++) game.spawnEnemy('drifter', VIEW_W + 8 + i * 15, yy);
  },

  // A diagonal line, high-to-low or low-to-high.
  slant(game, rand, { down = rand() < 0.5 } = {}) {
    for (let i = 0; i < 5; i++) {
      const y = down ? TOP + i * 22 : BOTTOM - i * 22;
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 13, y, { speed: 52 });
    }
  },

  // A wall of drifters with one gap to fly through (or shoot open).
  wall(game, rand, { gap } = {}) {
    const slots = 5;
    const g = gap ?? 1 + Math.floor(rand() * (slots - 2));
    const step = (BOTTOM - TOP) / (slots - 1);
    for (let i = 0; i < slots; i++) {
      if (i === g) continue;
      game.spawnEnemy('drifter', VIEW_W + 8, TOP + i * step - 4, { speed: 38 });
    }
  },

  // A snake of weavers.
  snake(game, rand, { n = 6, y } = {}) {
    const yy = y ?? TOP + 18 + rand() * (BOTTOM - TOP - 36);
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('weaver', VIEW_W + 8 + i * 14, yy, { phase: -i * 0.55, amp: 16 });
    }
  },

  // One or two gunships.
  gunner(game, rand, { two = false } = {}) {
    if (two) {
      game.spawnEnemy('gunner', VIEW_W + 8, TOP + 6, { targetX: VIEW_W - 48 });
      game.spawnEnemy('gunner', VIEW_W + 28, BOTTOM - 16, { targetX: VIEW_W - 32 });
    } else {
      game.spawnEnemy('gunner', VIEW_W + 8, TOP + rand() * (BOTTOM - TOP - 12));
    }
  },

  // Darts that chase the player's height.
  seekers(game, rand, { n = 2 } = {}) {
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('seeker', VIEW_W + 8 + i * 22, TOP + rand() * (BOTTOM - TOP));
    }
  },

  // A cargo pod carrying a pickup.
  carrier(game, rand, { drop, y } = {}) {
    game.spawnEnemy('carrier', VIEW_W + 8, y ?? TOP + 10 + rand() * (BOTTOM - TOP - 20), { drop });
  },

  // Asteroids, either all at once or spread over a few seconds.
  rocks(game, rand, { big = 0, small = 3, spread = 0 } = {}) {
    const list = [...Array(big).fill('rockBig'), ...Array(small).fill('rockSmall')];
    list.forEach((type, i) => {
      const delay = spread ? (spread * i) / list.length + rand() * 0.4 : i * 0.25;
      game.later(delay, () => {
        const y = TOP - 6 + rand() * (BOTTOM - TOP + 6);
        game.spawnEnemy(type, VIEW_W + 4, y);
      });
    });
  },
};

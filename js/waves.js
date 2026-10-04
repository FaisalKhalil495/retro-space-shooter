import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.4.1';

// Enemy formations. Levels are built by placing these on a timeline
// (see levels.js). Every pattern takes the game, a random-number function
// and an options object.
const TOP = HUD_H + 10;
const BOTTOM = VIEW_H - 16;

export const PATTERNS = {
  // A row of drifters following each other.
  // With shooter: true, the lead pod takes an aimed shot.
  row(game, rand, { n = 5, y, shooter = false } = {}) {
    const yy = y ?? TOP + rand() * (BOTTOM - TOP);
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 15, yy, { shooter: shooter && i === 0 });
    }
  },

  // A diagonal line, high-to-low or low-to-high.
  slant(game, rand, { down = rand() < 0.5 } = {}) {
    for (let i = 0; i < 5; i++) {
      const y = down ? TOP + i * 22 : BOTTOM - i * 22;
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 13, y, { speed: 52 });
    }
  },

  // A wall of drifters with one gap to fly through (or shoot open).
  wall(game, rand, { gap, shooter = false } = {}) {
    const slots = 5;
    const g = gap ?? 1 + Math.floor(rand() * (slots - 2));
    const step = (BOTTOM - TOP) / (slots - 1);
    const gunner = shooter ? (g + 2) % slots : -1;
    for (let i = 0; i < slots; i++) {
      if (i === g) continue;
      game.spawnEnemy('drifter', VIEW_W + 8, TOP + i * step - 4, { speed: 40, shooter: i === gunner });
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

  // Ambush from BEHIND: pods sneak in from the left edge (a warning marker
  // flashes there first) and fire as they pass.
  ambush(game, rand, { n = 3 } = {}) {
    for (let i = 0; i < n; i++) {
      const y = TOP + rand() * (BOTTOM - TOP);
      game.warn(7, y, 0.9, 'left');
      game.later(0.9 + i * 0.35, () => {
        game.spawnEnemy('drifter', -12, y, { speed: -64, flip: true, shooter: i % 2 === 0 });
      });
    }
  },

  // Pods dive-bombing in from the top or bottom edge.
  dive(game, rand, { n = 4 } = {}) {
    const fromTop = rand() < 0.5;
    for (let i = 0; i < n; i++) {
      const x = VIEW_W * 0.35 + i * 22 + rand() * 10;
      const y = fromTop ? HUD_H + 3 : VIEW_H - 8;
      game.warn(x, y, 0.7);
      game.later(0.7 + i * 0.22, () => {
        game.spawnEnemy('drifter', x, fromTop ? -10 : VIEW_H + 2, {
          speed: 22,
          vy: fromTop ? 62 : -62,
        });
      });
    }
  },

  // Two rows squeezing in along the top and bottom at the same time.
  pincer(game, rand, { n = 5 } = {}) {
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 14, TOP, { speed: 54, vy: 9, shooter: i === 0 });
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 14, BOTTOM - 4, { speed: 54, vy: -9, shooter: i === 0 });
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

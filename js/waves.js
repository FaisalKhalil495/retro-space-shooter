import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.12.0';

// Enemy formations. Levels are built by placing these on a timeline
// (see levels.js). Every pattern takes the game, a random-number function
// and an options object.
const TOP = HUD_H + 10;
// The lowest row formations use: just above the ground on levels that have
// one, otherwise near the bottom of the screen.
const bottom = (game) => Math.min(VIEW_H - 16, game.terrain.floorY - 16);

export const PATTERNS = {
  // Rock spires standing on the canyon floor (levels with ground), one every
  // `every` seconds. heights: list of heights in game pixels (one per spire).
  // turrets: indexes of spires that get a cliff turret on top.
  spires(game, rand, { heights = [24, 36], every = 1.6, turrets = [] } = {}) {
    heights.forEach((h, i) => {
      game.later(i * every, () => {
        const w = 10 + Math.floor(rand() * 7);
        const spire = game.terrain.addSpire(h, w, 1 + Math.floor(rand() * 999));
        if (turrets.includes(i)) game.spawnEnemy('cliffTurret', spire.x, spire.top - 6, { spire });
      });
    });
  },

  // A row of drifters following each other.
  // With shooter: true, the lead pod takes an aimed shot.
  row(game, rand, { n = 5, y, shooter = false } = {}) {
    const yy = y ?? TOP + rand() * (bottom(game) - TOP);
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 15, yy, { shooter: shooter && (i === 0 || i === n - 1) });
    }
  },

  // A diagonal line, high-to-low or low-to-high.
  slant(game, rand, { down = rand() < 0.5 } = {}) {
    for (let i = 0; i < 5; i++) {
      const y = down ? TOP + i * 22 : bottom(game) - i * 22;
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 13, y, { speed: 52 });
    }
  },

  // A wall of drifters with one gap to fly through (or shoot open).
  wall(game, rand, { gap, shooter = false } = {}) {
    const slots = 5;
    const g = gap ?? 1 + Math.floor(rand() * (slots - 2));
    const step = (bottom(game) - TOP) / (slots - 1);
    const gunner = shooter ? (g + 2) % slots : -1;
    for (let i = 0; i < slots; i++) {
      if (i === g) continue;
      game.spawnEnemy('drifter', VIEW_W + 8, TOP + i * step - 4, { speed: 40, shooter: i === gunner });
    }
  },

  // A snake of weavers.
  snake(game, rand, { n = 6, y } = {}) {
    const yy = y ?? TOP + 18 + rand() * (bottom(game) - TOP - 36);
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('weaver', VIEW_W + 8 + i * 14, yy, { phase: -i * 0.55, amp: 16 });
    }
  },

  // One, two or three gunships. Groups hover in separate lanes and fire
  // one after another rather than all at once.
  gunner(game, rand, { two = false, n = two ? 2 : 1 } = {}) {
    if (n === 1) {
      game.spawnEnemy('gunner', VIEW_W + 8, TOP + rand() * (bottom(game) - TOP - 12));
    } else if (n === 2) {
      game.spawnEnemy('gunner', VIEW_W + 8, TOP + 6, { targetX: VIEW_W - 48, laneOff: -14 });
      game.spawnEnemy('gunner', VIEW_W + 28, bottom(game) - 16, { targetX: VIEW_W - 32, laneOff: 14, fireDelay: 1.1 });
    } else {
      game.spawnEnemy('gunner', VIEW_W + 8, TOP + 4, { targetX: VIEW_W - 50, laneOff: -24 });
      game.spawnEnemy('gunner', VIEW_W + 24, (TOP + bottom(game)) / 2 - 6, { targetX: VIEW_W - 30, laneOff: 0, fireDelay: 1.0 });
      game.spawnEnemy('gunner', VIEW_W + 40, bottom(game) - 14, { targetX: VIEW_W - 50, laneOff: 24, fireDelay: 1.3 });
    }
  },

  // Ambush from BEHIND: pods sneak in from the left edge (a warning marker
  // flashes there first) and try to ram you. Their guns face away from you,
  // so they never fire.
  ambush(game, rand, { n = 3 } = {}) {
    for (let i = 0; i < n; i++) {
      const y = TOP + rand() * (bottom(game) - TOP);
      game.warn(7, y, 0.9, 'left');
      game.later(0.9 + i * 0.35, () => {
        game.spawnEnemy('drifter', -12, y, { speed: -64, flip: true });
      });
    }
  },

  // Pods dive-bombing in from the top or bottom edge.
  dive(game, rand, { n = 4 } = {}) {
    // On levels with ground, dive-bombers always come from above.
    const fromTop = game.terrain.floor > 0 || rand() < 0.5;
    for (let i = 0; i < n; i++) {
      const x = VIEW_W * 0.35 + i * 22 + rand() * 10;
      const y = fromTop ? HUD_H + 3 : VIEW_H - 8;
      game.warn(x, y, 0.7);
      game.later(0.7 + i * 0.22, () => {
        game.spawnEnemy('drifter', x, fromTop ? -10 : VIEW_H + 2, {
          speed: 22,
          vy: fromTop ? 62 : -62,
          shooter: true,
        });
      });
    }
  },

  // Two rows squeezing in along the top and bottom at the same time.
  pincer(game, rand, { n = 5 } = {}) {
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 14, TOP, { speed: 54, vy: 9, shooter: i === 0 });
      game.spawnEnemy('drifter', VIEW_W + 8 + i * 14, bottom(game) - 4, { speed: 54, vy: -9, shooter: i === 0 });
    }
  },

  // Snipers parking at the far right, spread out vertically.
  snipers(game, rand, { n = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? TOP + rand() * (bottom(game) - TOP - 8) : TOP + ((bottom(game) - TOP - 8) * i) / (n - 1);
      game.spawnEnemy('sniper', VIEW_W + 8 + i * 10, y, { targetX: VIEW_W - 22 - i * 6 });
    }
  },

  // Spinners: one in the middle, or two (top and bottom).
  spinner(game, rand, { n = 1 } = {}) {
    const ys = n === 1 ? [VIEW_H / 2 - 5] : [TOP + 12, bottom(game) - 20];
    ys.forEach((y, i) => game.spawnEnemy('spinner', VIEW_W + 8 + i * 16, y, { targetX: VIEW_W * (0.62 + i * 0.1) }));
  },

  // Darts that chase the player's height.
  seekers(game, rand, { n = 2 } = {}) {
    for (let i = 0; i < n; i++) {
      game.spawnEnemy('seeker', VIEW_W + 8 + i * 22, TOP + rand() * (bottom(game) - TOP));
    }
  },

  // A cargo pod carrying a pickup.
  carrier(game, rand, { drop, y } = {}) {
    game.spawnEnemy('carrier', VIEW_W + 8, y ?? TOP + 10 + rand() * (bottom(game) - TOP - 20), { drop });
  },

  // Asteroids, either all at once or spread over a few seconds.
  rocks(game, rand, { big = 0, small = 3, spread = 0 } = {}) {
    const list = [...Array(big).fill('rockBig'), ...Array(small).fill('rockSmall')];
    list.forEach((type, i) => {
      const delay = spread ? (spread * i) / list.length + rand() * 0.4 : i * 0.25;
      game.later(delay, () => {
        const y = TOP - 6 + rand() * (bottom(game) - TOP + 6);
        game.spawnEnemy(type, VIEW_W + 4, y);
      });
    });
  },

  // ---- Rust Moon ----

  // Rusty boulders bouncing along the canyon floor, spread over a few
  // seconds. With cliff: true some tumble in from high up and drop.
  boulders(game, rand, { big = 2, small = 2, spread = 4, cliff = false } = {}) {
    const list = [...Array(big).fill('rockBig'), ...Array(small).fill('rockSmall')];
    list.forEach((type, i) => {
      game.later((spread * i) / list.length + rand() * 0.4, () => {
        const vx = -(28 + rand() * 16);
        if (cliff && i % 2 === 0) {
          game.spawnEnemy(type, VIEW_W + 4, TOP + rand() * 30, { rust: true, ground: true, vx, vy: 10 });
        } else {
          const e = game.spawnEnemy(type, VIEW_W + 4, 0, { rust: true, ground: true, vx, vy: -(20 + rand() * 40) });
          e.y = game.terrain.floorY - e.h;
        }
      });
    });
  },

  // Dust skimmers racing in low along the floor, one after another.
  skimmers(game, rand, { n = 2, gap = 0.7 } = {}) {
    for (let i = 0; i < n; i++) game.later(i * gap, () => game.spawnEnemy('dustSkimmer', VIEW_W + 8, 0));
  },

  // Mortar crawlers walking in along the floor.
  mortar(game, rand, { n = 1, gap = 1.4 } = {}) {
    for (let i = 0; i < n; i++) game.later(i * gap, () => game.spawnEnemy('mortarCrawler', VIEW_W + 4, 0));
  },

  // A cliff turret standing on the canyon floor (no spire under it).
  turret(game) {
    game.spawnEnemy('cliffTurret', VIEW_W + 4, 0);
  },
};

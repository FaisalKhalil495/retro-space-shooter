import { VIEW_W, VIEW_H, HUD_H } from './config.js?v=0.14.3';
import { MAX_SPIRE, SHORT_SPIRE } from './terrain.js?v=0.14.3';

// Enemy formations. Levels are built by placing these on a timeline
// (see levels.js). Every pattern takes the game, a random-number function
// and an options object.
const TOP = HUD_H + 10;
// The lowest row formations use: just above the ground on levels that have
// one, otherwise near the bottom of the screen (floorY is the screen's
// bottom edge when there's no ground).
const bottom = (game) => game.terrain.floorY - 16;
// On levels with ground, cargo pods fly above the tallest possible spire
// (their bottom, with their bob, stays clear of it).
const skyLane = (game) => game.terrain.floorY - MAX_SPIRE - 16;

export const PATTERNS = {
  // Rock spires standing on the canyon floor (levels with ground), one every
  // `every` seconds. heights: list of heights in game pixels (one per spire,
  // at most MAX_SPIRE). turrets: indexes of spires that get a cliff turret.
  // A turret's spire is always at least as tall as every spire already in
  // front of it, so another spire never hides the turret from your gun.
  spires(game, rand, { heights = [24, 36], every = 1.6, turrets = [] } = {}) {
    heights.forEach((h, i) => {
      game.later(i * every, () => {
        const w = 10 + Math.floor(rand() * 7);
        if (turrets.includes(i)) h = game.terrain.turretPerch(h);
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
  // On levels with ground, an ambush waits (up to 6 s) for a stretch where
  // every spire on screen is short, then comes in above them all (and the
  // pods lift over any spire that turns up, so they never go through rock).
  ambush(game, rand, { n = 3 } = {}) {
    const go = () => {
      const terrain = game.terrain;
      const low = terrain.floor > 0 ? terrain.floorY - terrain.tallestOnScreen() - 18 : bottom(game);
      for (let i = 0; i < n; i++) {
        const y = TOP + rand() * (Math.max(TOP, low) - TOP);
        game.warn(7, y, 0.9, 'left');
        game.later(0.9 + i * 0.35, () => {
          game.spawnEnemy('drifter', -12, y, { speed: -64, flip: true });
        });
      }
    };
    if (!game.terrain.floor) {
      go();
      return;
    }
    let waited = 0;
    const tryNow = () => {
      if (game.terrain.tallestOnScreen() <= SHORT_SPIRE || waited >= 6) go();
      else {
        waited += 0.25;
        game.later(0.25, tryNow);
      }
    };
    tryNow();
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

  // A cargo pod carrying a pickup. On levels with ground it flies high,
  // above the tallest rock spire, so spires never get in the way.
  carrier(game, rand, { drop, y } = {}) {
    const [high, low] = game.terrain.floor > 0 ? [TOP, skyLane(game)] : [TOP + 10, bottom(game) - 10];
    game.spawnEnemy('carrier', VIEW_W + 8, y ?? high + rand() * (low - high), { drop });
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

  // A convoy of supply drones, each carrying a crate, flying in one after
  // another at roughly the same height (some crates hold loot).
  haulers(game, rand, { n = 3, gap = 0.45, y } = {}) {
    const base = y ?? TOP + 12 + rand() * (bottom(game) - TOP - 20);
    for (let i = 0; i < n; i++) {
      const yy = Math.max(TOP, base + (i % 2 ? 6 : 0) - (i % 3 === 2 ? 12 : 0));
      game.later(i * gap, () => game.spawnEnemy('hauler', VIEW_W + 8, yy));
    }
  },

  // Dust skimmers racing in low along the floor, one after another.
  skimmers(game, rand, { n = 2, gap = 0.7 } = {}) {
    for (let i = 0; i < n; i++) game.later(i * gap, () => game.spawnEnemy('dustSkimmer', VIEW_W + 8, 0));
  },

  // Mortar crawlers walking in along the floor.
  mortar(game, rand, { n = 1, gap = 1.4 } = {}) {
    for (let i = 0; i < n; i++) game.later(i * gap, () => game.spawnEnemy('mortarCrawler', VIEW_W + 4, 0));
  },

  // A cliff turret on a low rock mound on the canyon floor. (The mound
  // lifts it into the line of fire of a ship flying low over the ground.)
  // (If taller spires are still on screen, the mound becomes a spire tall
  // enough that none of them hides the turret.)
  turret(game, rand) {
    const mound = game.terrain.addSpire(game.terrain.turretPerch(8), 14, 1 + Math.floor(rand() * 999));
    game.spawnEnemy('cliffTurret', mound.x, 0, { spire: mound });
  },
};

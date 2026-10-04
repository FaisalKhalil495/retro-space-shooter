import { PATTERNS } from './waves.js?v=0.5.0';

// Level scripts. Each event is [seconds from the start, pattern, options].
// The final 'boss' event waits for the screen to clear, flashes a warning
// and brings in the boss.
export const LEVELS = [
  {
    number: 1,
    name: 'THE OUTER BELT',
    boss: 'rockjaw',
    background: { sun: true, dust: true, farRocks: true },
    // Five sections, each with its own job, and short breathers between
    // them (often with a crystal trail to collect).
    events: [
      // WARM-UP: pods and weavers; learn shooting and pickups.
      [1, 'section', { name: 'WARM-UP' }],
      [2, 'row', { n: 4 }],
      [5, 'snake', { n: 5 }],
      [8, 'row', { n: 5, shooter: true }],
      [11, 'seekers', { n: 2 }],
      [13, 'carrier', { drop: 'rockets' }],
      [15, 'gunner'],
      [18, 'slant'],
      [20, 'snake', { n: 6 }],
      [23, 'crystals', { n: 6, wave: 14 }],

      // BELT EDGE: the first asteroids, and a treasure rock in a safe spot.
      [26, 'section', { name: 'BELT EDGE' }],
      [27, 'rocks', { small: 3, spread: 2 }],
      [28, 'treasure', { drop: 'shield' }],
      [31, 'rocks', { big: 2, small: 2, spread: 3 }],
      [34, 'streakers', { n: 3 }],
      [36, 'snake', { n: 6 }],
      [38, 'shower', { n: 6, from: 'top' }],
      [41, 'rocks', { big: 3, small: 3, spread: 4 }],
      [43, 'gunner'],
      [45, 'streakers', { n: 4 }],
      [47, 'ambush', { n: 3 }],
      [49, 'crystals', { n: 7, wave: 0 }],

      // AMBUSH ALLEY: boulders form corridors; enemies wait in the gaps.
      [52, 'section', { name: 'AMBUSH ALLEY' }],
      [53, 'boulders', { open: 1 }],
      [54, 'gunner', { two: true }],
      [57, 'ambush', { n: 4 }],
      [58, 'carrier', { drop: 'bomb' }],
      [60, 'boulders', { open: 2 }],
      [61, 'seekers', { n: 3 }],
      [62, 'carrier', { drop: 'wingman' }],
      [64, 'dive', { n: 5 }],
      [65, 'boulders', { open: 0, n: 3 }],
      [66, 'treasure', { y: 30, drop: 'spread' }],
      [68, 'pincer'],
      [71, 'wall', { shooter: true }],
      [73, 'gunner'],
      [74, 'carrier', { drop: 'life', y: 70 }],
      [76, 'crystals', { n: 6, wave: 18 }],

      // THE STORM: dense asteroids, streakers and meteor showers, fewer
      // enemies. A treasure rock sits right in the middle of the danger.
      [78, 'section', { name: 'THE STORM' }],
      [79, 'shower', { n: 8, from: 'top' }],
      [81, 'streakers', { n: 4 }],
      [83, 'rocks', { big: 3, small: 5, spread: 5 }],
      [86, 'shower', { n: 8, from: 'bottom' }],
      [87, 'treasure', { drop: 'rapid' }],
      [89, 'streakers', { n: 5, gap: 0.35 }],
      [91, 'boulders', { open: 3 }],
      [92, 'shower', { n: 10, from: 'top', dur: 3.5 }],
      [95, 'seekers', { n: 3 }],
      [97, 'rocks', { big: 4, small: 6, spread: 5 }],
      [99, 'streakers', { n: 5, gap: 0.35 }],
      [102, 'crystals', { n: 7, wave: 10 }],

      // GAUNTLET: everything at once, building up to Rockjaw.
      [104, 'section', { name: 'GAUNTLET' }],
      [105, 'carrier', { drop: 'laser' }],
      [106, 'snake', { n: 8 }],
      [107, 'gunner', { two: true }],
      [109, 'shower', { n: 8, from: 'bottom' }],
      [111, 'ambush', { n: 4 }],
      [112, 'streakers', { n: 4 }],
      [114, 'boulders', { open: 2 }],
      [115, 'dive', { n: 6 }],
      [117, 'treasure', { drop: 'smart' }],
      [118, 'pincer'],
      [120, 'seekers', { n: 4 }],
      [121, 'shower', { n: 8, from: 'top' }],
      [123, 'row', { n: 7, shooter: true }],
      [124, 'gunner'],
      [126, 'wall', { shooter: true }],
      [130, 'boss'],
    ],
  },
];

// Plays a level's timeline.
export class LevelRunner {
  constructor(game, level) {
    this.game = game;
    this.level = level;
    this.t = 0;
    this.next = 0;
    this.bossPhase = null; // null | 'waiting' | 'warning' | 'fight'
    this.bossTimer = 0;
  }

  // Jump ahead, e.g. straight to the boss for testing.
  skipTo(seconds) {
    this.t = seconds;
    while (this.next < this.level.events.length && this.level.events[this.next][0] < seconds) {
      this.next++;
    }
  }

  get progress() {
    const last = this.level.events[this.level.events.length - 1][0];
    return Math.min(1, this.t / last);
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    const events = this.level.events;
    while (this.next < events.length && events[this.next][0] <= this.t) {
      const [, name, opts] = events[this.next++];
      if (name === 'boss') {
        this.bossPhase = 'waiting';
        this.bossTimer = 0;
      } else {
        PATTERNS[name](g, g.rand, opts);
      }
    }

    if (this.bossPhase === 'waiting') {
      // Give the player a breather: wait for stragglers to leave (max 5s).
      this.bossTimer += dt;
      if (g.enemies.length === 0 || this.bossTimer > 5) {
        this.bossPhase = 'warning';
        this.bossTimer = 0;
        g.startWarning();
      }
    } else if (this.bossPhase === 'warning') {
      this.bossTimer += dt;
      if (this.bossTimer > 3) {
        this.bossPhase = 'fight';
        g.spawnEnemy(this.level.boss, 0, 0);
      }
    }
  }
}

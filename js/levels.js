import { PATTERNS } from './waves.js?v=0.3.0';

// Level scripts. Each event is [seconds from the start, pattern, options].
// The final 'boss' event waits for the screen to clear, flashes a warning
// and brings in the boss.
export const LEVELS = [
  {
    number: 1,
    name: 'THE OUTER BELT',
    boss: 'rockjaw',
    background: { sun: true, dust: true, farRocks: true },
    events: [
      [2, 'row', { n: 5, shooter: true }],
      [5, 'snake', { n: 6 }],
      [8, 'rocks', { small: 4, spread: 2.5 }],
      [11, 'slant'],
      [12, 'seekers', { n: 2 }],
      [15, 'gunner'],
      [18, 'ambush', { n: 3 }],
      [20, 'carrier', { drop: 'rockets' }],
      [22, 'snake', { n: 7 }],
      [25, 'rocks', { big: 2, small: 3, spread: 3 }],
      [28, 'pincer'],
      [31, 'dive', { n: 4 }],
      [34, 'gunner', { two: true }],
      [38, 'seekers', { n: 3 }],
      [39, 'row', { n: 6, shooter: true }],
      [42, 'rocks', { big: 3, small: 6, spread: 6 }],
      [45, 'ambush', { n: 4 }],
      [49, 'carrier', { drop: 'bomb' }],
      [50, 'wall', { shooter: true }],
      [53, 'snake', { n: 8 }],
      [54, 'seekers', { n: 2 }],
      [57, 'gunner', { two: true }],
      [58, 'dive', { n: 5 }],
      [62, 'pincer'],
      [63, 'seekers', { n: 3 }],
      [67, 'rocks', { big: 4, small: 6, spread: 7 }],
      [71, 'ambush', { n: 4 }],
      [72, 'gunner'],
      [76, 'carrier', { drop: 'life' }],
      [77, 'wall', { shooter: true }],
      [80, 'snake', { n: 8 }],
      [81, 'dive', { n: 5 }],
      [85, 'gunner', { two: true }],
      [86, 'seekers', { n: 4 }],
      [90, 'pincer'],
      [91, 'ambush', { n: 5 }],
      [95, 'rocks', { big: 3, small: 8, spread: 6 }],
      [99, 'carrier', { drop: 'laser' }],
      [101, 'slant'],
      [102, 'snake', { n: 8 }],
      [103, 'gunner', { two: true }],
      [108, 'seekers', { n: 4 }],
      [109, 'dive', { n: 6 }],
      [113, 'wall', { shooter: true }],
      [114, 'ambush', { n: 4 }],
      [118, 'row', { n: 7, shooter: true }],
      [119, 'gunner'],
      [124, 'boss'],
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

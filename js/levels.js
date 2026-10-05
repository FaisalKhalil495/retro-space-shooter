import { PATTERNS } from './waves.js?v=0.10.0';

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
      // Part 1 (0:00-1:00): the opening, much as before.
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
      [36, 'carrier', { drop: 'shield' }],
      [38, 'seekers', { n: 3 }],
      [39, 'row', { n: 6, shooter: true }],
      [42, 'rocks', { big: 3, small: 6, spread: 6 }],
      [44, 'gunner'],
      [45, 'ambush', { n: 4 }],
      [49, 'carrier', { drop: 'bomb' }],
      [50, 'wall', { shooter: true }],
      [53, 'snake', { n: 8 }],
      [54, 'seekers', { n: 2 }],
      [57, 'gunner', { two: true }],
      [58, 'dive', { n: 5 }],
      // Part 2 (1:00-2:00): snipers, spinners and asteroid fields join in.
      [61, 'snipers', { n: 1 }],
      [62, 'rocks', { big: 2, small: 4, spread: 4 }],
      [64, 'carrier', { drop: 'spread' }],
      [65, 'pincer'],
      [67, 'seekers', { n: 3 }],
      [69, 'spinner'],
      [72, 'row', { n: 6, shooter: true }],
      [73, 'rocks', { big: 3, small: 5, spread: 5 }],
      [76, 'ambush', { n: 4 }],
      [77, 'carrier', { drop: 'life' }],
      [78, 'snipers', { n: 2 }],
      [80, 'gunner', { two: true }],
      [82, 'snake', { n: 8 }],
      [84, 'dive', { n: 5 }],
      [86, 'rocks', { big: 4, small: 6, spread: 6 }],
      [87, 'gunner'],
      [88, 'spinner'],
      [90, 'carrier', { drop: 'repair' }],
      [91, 'wall', { shooter: true }],
      [93, 'seekers', { n: 4 }],
      [95, 'snipers', { n: 2 }],
      [97, 'gunner', { n: 3 }],
      [99, 'rocks', { big: 3, small: 8, spread: 6 }],
      [101, 'ambush', { n: 4 }],
      [103, 'spinner', { n: 2 }],
      [106, 'slant'],
      [107, 'dive', { n: 5 }],
      [109, 'rocks', { big: 4, small: 5, spread: 6 }],
      [110, 'carrier', { drop: 'rapid' }],
      [112, 'snipers', { n: 1 }],
      [113, 'snake', { n: 8 }],
      [113, 'gunner', { two: true }],
      [115, 'pincer'],
      [117, 'seekers', { n: 3 }],
      // Part 3 (2:00-3:00): everything at once.
      [121, 'gunner', { n: 3 }],
      [122, 'rocks', { big: 4, small: 8, spread: 7 }],
      [124, 'snipers', { n: 2 }],
      [126, 'carrier', { drop: 'laser' }],
      [127, 'spinner'],
      [129, 'ambush', { n: 5 }],
      [131, 'row', { n: 7, shooter: true }],
      [133, 'dive', { n: 6 }],
      [134, 'rocks', { big: 3, small: 8, spread: 6 }],
      [136, 'seekers', { n: 4 }],
      [137, 'gunner', { two: true }],
      [138, 'snipers', { n: 3 }],
      [140, 'carrier', { drop: 'repair' }],
      [141, 'wall', { shooter: true }],
      [143, 'spinner', { n: 2 }],
      [145, 'gunner', { two: true }],
      [147, 'rocks', { big: 5, small: 8, spread: 7 }],
      [149, 'pincer'],
      [150, 'ambush', { n: 4 }],
      [152, 'snipers', { n: 2 }],
      [154, 'carrier', { drop: 'wingman' }],
      [155, 'snake', { n: 8 }],
      [156, 'gunner'],
      [157, 'dive', { n: 6 }],
      [159, 'spinner'],
      [160, 'seekers', { n: 4 }],
      [162, 'rocks', { big: 4, small: 8, spread: 6 }],
      [164, 'gunner', { n: 3 }],
      [166, 'snipers', { n: 3 }],
      [168, 'ambush', { n: 5 }],
      [170, 'row', { n: 7, shooter: true }],
      [171, 'spinner', { n: 2 }],
      [173, 'rocks', { big: 3, small: 6, spread: 5 }],
      [174, 'gunner', { n: 3 }],
      [175, 'wall', { shooter: true }],
      [177, 'seekers', { n: 3 }],
      [184, 'boss'],
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

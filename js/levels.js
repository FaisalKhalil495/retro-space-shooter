import { PATTERNS } from './waves.js?v=0.2.0';

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
      [3, 'row', { n: 4 }],
      [7, 'row', { n: 5 }],
      [10, 'rocks', { small: 3, spread: 2 }],
      [14, 'snake', { n: 5 }],
      [19, 'slant'],
      [22, 'carrier', { drop: 'rockets' }],
      [25, 'rocks', { big: 1, small: 2, spread: 2 }],
      [29, 'snake', { n: 6 }],
      [33, 'gunner'],
      [38, 'row', { n: 6 }],
      [41, 'rocks', { big: 2, small: 3, spread: 6 }],
      [49, 'seekers', { n: 2 }],
      [53, 'wall'],
      [57, 'carrier', { drop: 'bomb' }],
      [60, 'snake', { n: 7 }],
      [63, 'gunner', { two: true }],
      [69, 'rocks', { big: 3, small: 4, spread: 8 }],
      [73, 'seekers', { n: 3 }],
      [79, 'slant'],
      [82, 'row', { n: 5 }],
      [83, 'seekers', { n: 2 }],
      [87, 'carrier', { drop: 'life' }],
      [89, 'wall'],
      [93, 'snake', { n: 7 }],
      [94, 'gunner'],
      [100, 'carrier', { drop: 'laser' }],
      [103, 'rocks', { big: 2, small: 5, spread: 7 }],
      [109, 'gunner', { two: true }],
      [110, 'seekers', { n: 3 }],
      [115, 'slant'],
      [117, 'snake', { n: 6 }],
      [122, 'wall'],
      [126, 'boss'],
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
      if (this.bossTimer > 2.6) {
        this.bossPhase = 'fight';
        g.spawnEnemy(this.level.boss, 0, 0);
      }
    }
  }
}

import { PATTERNS } from './waves.js?v=0.11.0';

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
  {
    // Placeholder (Stage 3, step 3A): proves the flow from level 1 into
    // level 2. The real Rust Moon arrives in step 3B.
    number: 2,
    name: 'RUST MOON',
    boss: null,
    background: { space: '#24161a', sun: true, dust: false, farRocks: true },
    events: [
      [2, 'row', { n: 5, shooter: true }],
      [5, 'gunner'],
      [8, 'rocks', { big: 2, small: 3, spread: 3 }],
      [11, 'snipers', { n: 1 }],
      [14, 'seekers', { n: 3 }],
      [17, 'spinner'],
      [20, 'gunner', { two: true }],
      [24, 'end'],
    ],
  },
];

// Plays a level's timeline. The level ends with either a 'boss' event
// (wait for stragglers, warning, boss) or an 'end' event (a level without a
// boss: it's cleared once the last enemies have gone).
export class LevelRunner {
  constructor(game, level) {
    this.game = game;
    this.level = level;
    this.t = 0;
    this.next = 0;
    this.phase = null; // null | 'ending' | 'waiting' | 'warning' | 'fight'
    this.phaseTimer = 0;
  }

  // When the level's last event (the boss or the end) happens.
  get endsAt() {
    const events = this.level.events;
    return events[events.length - 1][0];
  }

  get progress() {
    return Math.min(1, this.t / this.endsAt);
  }

  // Jump ahead, e.g. straight to the boss for testing. Enemy waves that are
  // skipped don't happen, but a skipped boss or end still does.
  skipTo(seconds) {
    this.t = seconds;
    const events = this.level.events;
    while (this.next < events.length && events[this.next][0] < seconds) {
      const name = events[this.next++][1];
      if (name === 'boss' || name === 'end') this.startPhase(name === 'boss' ? 'waiting' : 'ending');
    }
  }

  startPhase(phase) {
    this.phase = phase;
    this.phaseTimer = 0;
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    const events = this.level.events;
    while (this.next < events.length && events[this.next][0] <= this.t) {
      const [, name, opts] = events[this.next++];
      if (name === 'boss') this.startPhase('waiting');
      else if (name === 'end') this.startPhase('ending');
      else PATTERNS[name](g, g.rand, opts);
    }

    this.phaseTimer += dt;
    if (this.phase === 'ending') {
      // Wait until every enemy (including any still due to arrive) is gone,
      // or 8 seconds at most; never while you're mid-death.
      const clearOfEnemies = g.enemies.length === 0 && g.timers.length === 0;
      if ((clearOfEnemies || this.phaseTimer > 8) && g.state === 'playing') {
        this.phase = null;
        g.levelClear();
      }
    } else if (this.phase === 'waiting') {
      // Give the player a breather: wait for stragglers to leave (max 5s).
      if (g.enemies.length === 0 || this.phaseTimer > 5) {
        this.startPhase('warning');
        g.startWarning();
      }
    } else if (this.phase === 'warning') {
      if (this.phaseTimer > 3) {
        this.startPhase('fight');
        g.spawnEnemy(this.level.boss, 0, 0);
      }
    }
  }
}

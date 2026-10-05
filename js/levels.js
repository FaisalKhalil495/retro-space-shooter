import { PATTERNS } from './waves.js?v=0.13.1';

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
    // Rust Moon: low over red canyons. The ground is solid, rock spires
    // (some with turrets) stand in the way, and enemy shots fly 10% faster.
    // Boss: the Siege Crawler.
    number: 2,
    name: 'RUST MOON',
    boss: 'siegeCrawler',
    floor: 14,
    shotSpeed: 1.1,
    background: { canyon: true, space: '#24161a', sun: true, dust: true, dustColor: '#33201f', farRocks: false },
    events: [
      // Part 1 (0:00-1:00): each new enemy shows up alone first.
      [2, 'row', { n: 5, shooter: true }],
      [4, 'spires', { heights: [24, 36], every: 2 }],
      [8, 'spires', { heights: [30], turrets: [0] }], // first cliff turret
      [12, 'boulders', { big: 1, small: 2, spread: 3 }],
      [15, 'snake', { n: 6 }],
      [18, 'gunner'],
      [20, 'carrier', { drop: 'rockets' }],
      [22, 'skimmers', { n: 2, gap: 1.2 }], // first dust skimmers
      [26, 'spires', { heights: [28, 44, 34], every: 2.2, turrets: [1] }],
      [28, 'seekers', { n: 2 }],
      [30, 'boulders', { big: 2, small: 2, spread: 4 }],
      [34, 'mortar'], // first mortar crawler
      [36, 'carrier', { drop: 'shield' }],
      [39, 'skimmers', { n: 3 }],
      [40, 'row', { n: 6, shooter: true }],
      [42, 'spires', { heights: [36, 26], turrets: [0] }],
      [44, 'gunner', { two: true }],
      [46, 'ambush', { n: 3 }],
      [49, 'carrier', { drop: 'bomb' }],
      [50, 'boulders', { big: 3, small: 3, spread: 5, cliff: true }],
      [52, 'dive', { n: 4 }],
      [54, 'skimmers', { n: 2 }],
      [55, 'turret'],
      [57, 'gunner'],
      [58, 'snake', { n: 7 }],
      // Part 2 (1:00-2:00): turrets on spires, mortars, snipers, spinners.
      [61, 'mortar', { n: 2, gap: 1.6 }],
      [62, 'spires', { heights: [40, 52, 30], every: 2.4, turrets: [0, 2] }],
      [64, 'carrier', { drop: 'spread' }],
      [65, 'snipers', { n: 1 }],
      [67, 'skimmers', { n: 3, gap: 0.6 }],
      [69, 'boulders', { big: 3, small: 3, spread: 5 }],
      [71, 'spinner'],
      [73, 'gunner', { two: true }],
      [75, 'ambush', { n: 4 }],
      [77, 'carrier', { drop: 'life' }],
      [78, 'snipers', { n: 2 }],
      [80, 'spires', { heights: [56, 34], every: 2.6, turrets: [0] }],
      [81, 'seekers', { n: 3 }],
      [83, 'boulders', { big: 4, small: 4, spread: 6, cliff: true }],
      [84, 'mortar'],
      [86, 'skimmers', { n: 2 }],
      [88, 'spinner'],
      [90, 'carrier', { drop: 'repair' }],
      [91, 'gunner', { n: 3 }],
      [93, 'dive', { n: 5 }],
      [95, 'snipers', { n: 2 }],
      [96, 'turret'],
      [98, 'row', { n: 6, shooter: true }],
      [99, 'boulders', { big: 3, small: 4, spread: 5 }],
      [101, 'spires', { heights: [44, 30, 60], every: 2.2, turrets: [2] }],
      [103, 'skimmers', { n: 2 }],
      [104, 'mortar'],
      [106, 'ambush', { n: 4 }],
      [108, 'gunner', { two: true }],
      [110, 'carrier', { drop: 'rapid' }],
      [111, 'snake', { n: 8 }],
      [113, 'snipers', { n: 1 }],
      [115, 'pincer'],
      [117, 'seekers', { n: 3 }],
      // Part 3 (2:00-3:00): tall spires close together, everything at once.
      [121, 'spires', { heights: [64, 40, 70, 48], every: 1.8, turrets: [1, 3] }],
      [122, 'gunner', { n: 3 }],
      [124, 'skimmers', { n: 2, gap: 0.5 }],
      [126, 'carrier', { drop: 'laser' }],
      [127, 'mortar', { n: 2 }],
      [128, 'boulders', { big: 4, small: 4, spread: 6, cliff: true }],
      [130, 'snipers', { n: 2 }],
      [132, 'spinner'],
      [134, 'ambush', { n: 5 }],
      [136, 'spires', { heights: [56, 72, 44], every: 1.8, turrets: [0, 2] }],
      [137, 'gunner', { two: true }],
      [139, 'dive', { n: 5 }],
      [140, 'carrier', { drop: 'repair' }],
      [141, 'skimmers', { n: 2 }],
      [143, 'boulders', { big: 4, small: 5, spread: 6 }],
      [145, 'spinner', { n: 2 }],
      [147, 'mortar'],
      [148, 'row', { n: 7, shooter: true }],
      [150, 'snipers', { n: 2 }],
      [152, 'turret'],
      [154, 'carrier', { drop: 'wingman' }],
      [155, 'gunner', { two: true }],
      [158, 'spires', { heights: [68, 50, 74], every: 1.8, turrets: [1] }],
      [159, 'seekers', { n: 4 }],
      [161, 'boulders', { big: 3, small: 4, spread: 5, cliff: true }],
      [163, 'mortar'],
      [164, 'pincer'],
      [166, 'spinner'],
      [167, 'ambush', { n: 4 }],
      [169, 'gunner', { n: 3 }],
      [171, 'skimmers', { n: 2 }],
      [172, 'boulders', { big: 3, small: 3, spread: 4 }],
      [174, 'wall', { shooter: true }],
      [176, 'seekers', { n: 3 }],
      [184, 'boss'],
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

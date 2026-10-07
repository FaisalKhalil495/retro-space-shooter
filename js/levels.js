import { PATTERNS } from './waves.js?v=0.17.0';

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
    skin: 'rust', // its own look for the enemy types it shares with level 1
    background: { canyon: true, space: '#24161a', sun: true, dust: true, dustColor: '#33201f', farRocks: false },
    events: [
      // Part 1 (0:00-1:00): each new enemy shows up alone first.
      [2, 'row', { n: 5, shooter: true }],
      [4, 'spires', { heights: [24, 36], every: 2 }],
      [8, 'spires', { heights: [40], turrets: [0] }], // first cliff turret
      [12, 'raiders', { n: 1 }], // first raider convoy
      [15, 'snake', { n: 6 }],
      [18, 'gunner'],
      [20, 'carrier', { drop: 'rockets' }],
      [22, 'skimmers', { n: 2, gap: 1.2 }], // first dust skimmers
      [26, 'spires', { heights: [28, 44, 34], every: 2.2, turrets: [1] }],
      [28, 'seekers', { n: 2 }],
      [30, 'raiders', { n: 2 }],
      [34, 'mortar'], // first mortar crawler
      [36, 'carrier', { drop: 'shield' }],
      [39, 'skimmers', { n: 3 }],
      [40, 'row', { n: 6, shooter: true }],
      [42, 'spires', { heights: [36, 26], turrets: [0] }],
      [44, 'gunner', { two: true }],
      [46, 'ambush', { n: 3 }],
      [49, 'carrier', { drop: 'bomb' }],
      [50, 'raiders', { n: 3 }],
      [52, 'dive', { n: 4 }],
      [54, 'skimmers', { n: 2 }],
      [55, 'turret'],
      [57, 'gunner'],
      [58, 'snake', { n: 7 }],
      // Part 2 (1:00-2:00): turrets on spires, mortars, snipers, spinners.
      [61, 'mortar', { n: 2, gap: 1.6 }],
      [62, 'spires', { heights: [40, 30, 52], every: 2.4, turrets: [0, 2] }],
      [64, 'carrier', { drop: 'spread' }],
      [65, 'snipers', { n: 1 }],
      [67, 'skimmers', { n: 3, gap: 0.6 }],
      [69, 'raiders', { n: 3 }],
      [71, 'spinner'],
      [73, 'gunner', { two: true }],
      [77, 'carrier', { drop: 'life' }],
      [78, 'snipers', { n: 2 }],
      [80, 'spires', { heights: [56, 34], every: 2.6, turrets: [0] }],
      [81, 'seekers', { n: 3 }],
      [83, 'raiders', { n: 4 }],
      [84, 'mortar'],
      [86, 'skimmers', { n: 2 }],
      [88, 'spinner'],
      [90, 'carrier', { drop: 'repair' }],
      [91, 'gunner', { n: 3 }],
      [93, 'ambush', { n: 4 }], // ambushes come while the spires are short
      [93, 'dive', { n: 5 }],
      [95, 'snipers', { n: 2 }],
      [96, 'turret'],
      [98, 'row', { n: 6, shooter: true }],
      [99, 'raiders', { n: 3 }],
      [101, 'spires', { heights: [44, 30, 60], every: 2.2, turrets: [2] }],
      [103, 'skimmers', { n: 2 }],
      [104, 'mortar'],
      [108, 'gunner', { two: true }],
      [110, 'carrier', { drop: 'rapid' }],
      [111, 'snake', { n: 8 }],
      [113, 'snipers', { n: 1 }],
      [115, 'pincer'],
      [117, 'ambush', { n: 4 }],
      [117, 'seekers', { n: 3 }],
      // Part 3 (2:00-3:00): tall spires close together, everything at once.
      [121, 'spires', { heights: [40, 48, 64, 70], every: 1.8, turrets: [1, 3] }],
      [122, 'gunner', { n: 3 }],
      [124, 'skimmers', { n: 2, gap: 0.5 }],
      [126, 'carrier', { drop: 'laser' }],
      [127, 'mortar', { n: 2 }],
      [128, 'raiders', { n: 4 }],
      [130, 'snipers', { n: 2 }],
      [132, 'spinner'],
      [136, 'spires', { heights: [44, 56, 72], every: 1.8, turrets: [0, 2] }],
      [137, 'gunner', { two: true }],
      [139, 'dive', { n: 5 }],
      [140, 'carrier', { drop: 'repair' }],
      [141, 'skimmers', { n: 2 }],
      [143, 'raiders', { n: 4 }],
      [145, 'spinner', { n: 2 }],
      [147, 'mortar'],
      [148, 'row', { n: 7, shooter: true }],
      [150, 'snipers', { n: 2 }],
      [151, 'ambush', { n: 5 }],
      [152, 'turret'],
      [154, 'carrier', { drop: 'wingman' }],
      [155, 'gunner', { two: true }],
      [158, 'spires', { heights: [50, 68, 74], every: 1.8, turrets: [1] }],
      [159, 'seekers', { n: 4 }],
      [161, 'raiders', { n: 3 }],
      [163, 'mortar'],
      [164, 'pincer'],
      [166, 'spinner'],
      [169, 'gunner', { n: 3 }],
      [171, 'skimmers', { n: 2 }],
      [172, 'raiders', { n: 3 }],
      [173, 'ambush', { n: 4 }],
      [174, 'wall', { shooter: true }],
      [176, 'seekers', { n: 3 }],
      [184, 'boss'],
    ],
  },
  {
    // Frostring: open space inside a frozen comet ring. Slabs of ice drift
    // across (they block you and stop shots both ways, but your shots break
    // them), and enemy shots fly 20% faster. The invaders' mining crews (the
    // "Ice Harvesters") are stripping the ring. Boss (step 3C-2): the Glacier
    // Warden; until it's built the level ends when the last wave has gone.
    number: 3,
    name: 'FROSTRING',
    shotSpeed: 1.2,
    skin: 'frost', // its own look for the enemy types it shares with level 1
    background: { frost: true, space: '#111829', sun: false, dust: true, dustColor: '#1a2640', farRocks: false },
    events: [
      // Part 1 (0:00-1:00): slabs of ice, shown alone first, then from above
      // and below.
      [2, 'row', { n: 5, shooter: true }],
      [5, 'ice', { n: 2, size: 'small', every: 2.5 }], // first slabs of ice
      [9, 'snake', { n: 6 }],
      [12, 'ice', { n: 1, size: 'big' }],
      [14, 'gunner'],
      [17, 'ice', { n: 2, from: 'top', every: 2 }], // first slabs from above
      [20, 'carrier', { drop: 'rockets' }],
      [22, 'seekers', { n: 2 }],
      [24, 'ice', { n: 2, from: 'bottom', every: 2 }], // ...and from below
      [27, 'slant'],
      [30, 'gunner', { two: true }],
      [32, 'ice', { n: 3, every: 1.8 }],
      [34, 'dive', { n: 4 }],
      [36, 'carrier', { drop: 'shield' }],
      [38, 'snake', { n: 7 }],
      [41, 'ice', { n: 2, size: 'big', every: 2.6 }],
      [43, 'row', { n: 6, shooter: true }],
      [46, 'ambush', { n: 3 }],
      [49, 'carrier', { drop: 'bomb' }],
      [51, 'seekers', { n: 3 }],
      [53, 'ice', { n: 2, from: 'top', every: 1.6 }],
      [55, 'gunner'],
      [57, 'pincer'],
      // Part 2 (1:00-2:00): fields of ice, the first walls, snipers, spinners.
      [61, 'ice', { n: 4, every: 1.6 }],
      [62, 'snipers', { n: 1 }],
      [64, 'carrier', { drop: 'spread' }],
      [66, 'snake', { n: 7 }],
      [68, 'spinner'],
      [70, 'iceWall', { gap: 44 }], // first wall of ice
      [72, 'gunner', { two: true }],
      [75, 'ice', { n: 2, from: 'bottom', every: 1.5 }],
      [77, 'carrier', { drop: 'life' }],
      [78, 'snipers', { n: 2 }],
      [81, 'seekers', { n: 3 }],
      [83, 'ice', { n: 3, size: 'big', every: 2.2 }],
      [86, 'spinner'],
      [88, 'dive', { n: 5 }],
      [90, 'carrier', { drop: 'repair' }],
      [91, 'gunner', { n: 3 }],
      [94, 'ambush', { n: 4 }],
      [96, 'iceWall', { gap: 42, n: 2 }],
      [98, 'row', { n: 6, shooter: true }],
      [101, 'ice', { n: 2, from: 'top', every: 1.5 }],
      [103, 'snipers', { n: 2 }],
      [106, 'snake', { n: 8 }],
      [108, 'gunner', { two: true }],
      [110, 'carrier', { drop: 'rapid' }],
      [112, 'ice', { n: 3, every: 1.6 }],
      [114, 'pincer'],
      [117, 'seekers', { n: 3 }],
      // Part 3 (2:00-3:00): corridors of ice, everything at once.
      [121, 'iceWall', { gap: 40, n: 3, every: 2.4 }],
      [122, 'gunner', { n: 3 }],
      [126, 'carrier', { drop: 'laser' }],
      [128, 'snipers', { n: 2 }],
      [130, 'ice', { n: 3, from: 'mixed', every: 1.4 }],
      [132, 'spinner'],
      [135, 'dive', { n: 5 }],
      [137, 'gunner', { two: true }],
      [140, 'carrier', { drop: 'repair' }],
      [141, 'ice', { n: 4, every: 1.4 }],
      [143, 'snake', { n: 8 }],
      [145, 'spinner', { n: 2 }],
      [148, 'row', { n: 7, shooter: true }],
      [150, 'snipers', { n: 2 }],
      [151, 'ambush', { n: 5 }],
      [153, 'iceWall', { gap: 38, n: 3, every: 2.2 }],
      [154, 'carrier', { drop: 'wingman' }],
      [155, 'gunner', { two: true }],
      [159, 'seekers', { n: 4 }],
      [162, 'ice', { n: 3, from: 'mixed', every: 1.3 }],
      [164, 'pincer'],
      [166, 'spinner'],
      [169, 'gunner', { n: 3 }],
      [172, 'ice', { n: 3, size: 'big', every: 1.6 }],
      [173, 'ambush', { n: 4 }],
      [174, 'wall', { shooter: true }],
      [176, 'seekers', { n: 3 }],
      [182, 'end'],
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

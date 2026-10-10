// What the game remembers on this phone (no server): the furthest level
// reached, the top 10 scores and the player's settings. Kept in the
// browser's local storage; if that's unavailable (a private window), the
// game still works and simply forgets when closed.

const KEY = 'emberDrift.save.v1';
export const TOP = 10; // high-score places

const DEFAULTS = () => ({
  reached: 1, // furthest level reached (1..)
  scores: [], // [{ name: 'ABC', score, level }], best first
  settings: { music: 4, sound: 4, vibrate: true, blood: true }, // volumes 0..5
});

function load() {
  const d = DEFAULTS();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      if (Number.isInteger(raw.reached) && raw.reached >= 1) d.reached = raw.reached;
      if (Array.isArray(raw.scores)) {
        d.scores = raw.scores
          .filter((s) => s && typeof s.name === 'string' && Number.isFinite(s.score))
          .slice(0, TOP);
      }
      if (raw.settings && typeof raw.settings === 'object') Object.assign(d.settings, raw.settings);
    }
  } catch {
    // Nothing saved yet, or storage is blocked: start fresh.
  }
  return d;
}

export const save = load();

export function store() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage full or blocked: the game carries on without saving.
  }
}

// Remember that the player has got as far as level n.
export function reachLevel(n, maxLevel) {
  const lv = Math.min(n, maxLevel);
  if (lv > save.reached) {
    save.reached = lv;
    store();
  }
}

// Would this score make the high-score table?
export function isHighScore(score) {
  if (score <= 0) return false;
  return save.scores.length < TOP || score > save.scores[save.scores.length - 1].score;
}

// Put a score on the table; returns its place (0 = top), or -1.
export function addScore(name, score, level) {
  if (!isHighScore(score)) return -1;
  const entry = { name, score, level };
  save.scores.push(entry);
  save.scores.sort((a, b) => b.score - a.score);
  save.scores.length = Math.min(save.scores.length, TOP);
  store();
  return save.scores.indexOf(entry);
}

export function bestScore() {
  return save.scores.length ? save.scores[0].score : 0;
}

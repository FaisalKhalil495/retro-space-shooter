// The soundtrack: one piece per level and one per boss, each in its own
// style, played with the instruments in soundtrack.js (beside this file).
// The game doesn't run this code: it's far too heavy for a phone to play
// live, so tools/render-music.mjs records each song into music/*.mp3,
// which the game plays (js/music.js). Every song is
// a list of bars; `play(K)` schedules all of it, where K.t(bar, step)
// is the time of a 16th-note step and K.S the length of one step.
// `loop` is the bar a song returns to when it repeats (after its intro).

import * as I from './soundtrack.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function nn(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// A melody written one word per 16th: a note, '.' to hold it, '-' rest.
function mel(lines) {
  const w = lines.join(' ').trim().split(/\s+/);
  const out = [];
  w.forEach((x, i) => {
    if (x === '.' || x === '-') return;
    let len = 1;
    while (w[i + len] === '.') len++;
    out.push({ i, n: nn(x), len });
  });
  return out;
}
// A chord name ('Dm', 'Bb', 'F#') as [root, third, fifth] in octave `oct`.
function chord(name, oct = 3) {
  const m = /^([A-G])(#|b)?(m)?$/.exec(name);
  const r = nn(m[1] + (m[2] || '') + oct);
  return [r, r + (m[3] ? 3 : 4), r + 7];
}
const low = (n, top) => (n > top ? n - 12 : n); // keep a bass note under `top`
const power = (r) => [r, r + 7, r + 12];
// Play melody `m` starting at `bar`; fn(time, note, seconds).
function playMel(K, m, bar, spb, fn) {
  for (const { i, n, len } of m) fn(K.t(bar + Math.floor(i / spb), i % spb), n, len * K.S);
}

// ------------------------------------------------------------------
// LEVEL 1, THE OUTER BELT: a dark synth chase. D minor, 126 bpm.
// Pulsing sequenced bass, pumping chords, big drums, a heroic lead.
const BELT_CH = [
  'Dm', 'Dm', 'Bb', 'Bb',
  'Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A',
  'Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'A',
  'Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A',
  'Gm', 'Gm', 'A', 'A',
];
const BELT_B = mel([
  'D5 . . . . . A4 . D5 . E5 . F5 . . .', 'G5 . . . F5 . . . E5 . . . D5 . . .',
  'D5 . . . C5 . . . Bb4 . . . D5 . G5 .', 'A5 . . . . . . . . . . . E5 . C#5 .',
  'D5 . . . . . A4 . D5 . E5 . F5 . . .', 'G5 . . . A5 . . . Bb5 . . . A5 . G5 .',
  'F5 . . . . . E5 . D5 . . . E5 . F5 .', 'E5 . . . . . . . C#5 . . . A4 . . .',
]);
const BELT_C = mel([
  'F5 . . . . . . . D6 . . . . . C6 .', 'C6 . . . . . . . G5 . . . . . . .',
  'A5 . . . . . . . D6 . . . F6 . E6 .', 'D6 . . . . . . . . . . . . . . .',
  'F6 . . . E6 . D6 . . . . . Bb5 . . .', 'C6 . . . D6 . E6 . . . . . G5 . . .',
  'A5 . . . . . . . C#6 . . . E6 . . .', 'A5 . . . . . . . . . . . - - - -',
]);
const BELT_BASS = [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 7, 12];

function belt(K) {
  for (let bar = 0; bar < 32; bar++) {
    const sec = bar < 4 ? 'intro' : bar < 12 ? 'A' : bar < 20 ? 'B' : bar < 28 ? 'C' : 'D';
    const c = chord(BELT_CH[bar], 2);
    const root = low(c[0], 44);
    const up = [c[0] + 24, c[1] + 24, c[2] + 24, c[0] + 36];
    const cut = sec === 'intro' ? 350 + bar * 400 : sec === 'D' ? 900 : 2000;
    if (bar === 0) I.impact(K.t(0, 0), { v: 0.8 });
    if (bar === 2) I.riser(K.t(2, 0), K.S * 32, { v: 0.7 });
    if (bar === 26) I.riser(K.t(26, 0), K.S * 32, { v: 0.5 });
    if (bar === 30) I.riser(K.t(30, 0), K.S * 32, { v: 0.8 });
    if ([4, 12, 20].includes(bar)) I.crash(K.t(bar, 0), { v: 1 });
    if (bar === 28) I.braam(K.t(28, 0), c[0] + 12, K.S * 28, { v: 0.9 });
    if (sec !== 'intro' && sec !== 'D') I.pad(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24], K.S * 16, { v: sec === 'C' ? 1.1 : 0.9 });
    if (sec === 'D') I.strings(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12], K.S * 16, { v: 1.2 });
    for (let s = 0; s < 16; s++) {
      const t = K.t(bar, s);
      // bass
      if (sec === 'D') {
        if (s % 4 === 0) I.synthBass(t, root, K.S * 3.5, { cut: 700 });
      } else I.synthBass(t, root + BELT_BASS[s], K.S * 0.85, { cut, v: s % 4 === 0 ? 1 : 0.8 });
      // arpeggio (quiet under the lead)
      const ai = [0, 1, 2, 3, 2, 1, 2, 3][s % 8];
      if (sec !== 'B') I.arp(t, up[ai], K.S * 0.8, { v: sec === 'C' ? 0.6 : 1, pan: s % 2 ? 0.45 : -0.45, cut: sec === 'intro' ? 600 + bar * 600 : 2800 });
      // drums
      if (sec === 'intro') {
        if (bar >= 2 && s % 2 === 0) I.hat(t, { v: s % 4 === 2 ? 0.9 : 0.5 });
        if (bar === 3 && s >= 8) I.snare(t, { v: 0.25 + (s - 8) * 0.08, r: 0.1 });
      } else if (sec === 'D') {
        if (s === 0 || (s === 10 && bar % 2)) I.kick(t);
        if (s === 8) I.snare(t, { v: 1.1, r: 0.5 });
        if (s % 2 === 0) I.hat(t, { v: 0.6, open: s % 4 === 2 });
        if (bar === 31 && s >= 8) I.snare(t, { v: 0.4 + (s - 8) * 0.08, r: 0.15 });
      } else {
        if (s % 4 === 0) I.kick(t);
        if (s === 4 || s === 12) I.snare(t, { v: 1, r: 0.35 });
        I.hat(t, { v: s % 4 === 2 ? 0.9 : 0.45, open: s % 4 === 2 && sec === 'C' });
        if (sec === 'C' && s % 4 === 0) I.ride(t, { v: 0.6 });
        if ((bar === 11 || bar === 19 || bar === 27) && s >= 12) I.tom(t, 52 - (s - 12) * 4, { pan: 0.5 - (s - 12) * 0.3 });
      }
    }
  }
  playMel(K, BELT_B, 12, 16, (t, n, d) => I.synthLead(t, n, d));
  playMel(K, BELT_C, 20, 16, (t, n, d) => {
    I.synthLead(t, n, d, { v: 1.05 });
    I.brass(t, [n - 12], d, { v: 0.8, pan: 0.2 });
  });
}

// ------------------------------------------------------------------
// LEVEL 2, RUST MOON: desert war metal. E with a raised third (the
// "Phrygian dominant" desert scale: E F G# A B C D), 150 bpm, galloping
// guitars, tribal drums, a twanging oud, war horns.
const RUST_SCALE = [4, 5, 8, 9, 11, 0, 2];
const third = (n) => {
  const i = RUST_SCALE.indexOf(((n % 12) + 12) % 12);
  if (i < 0) return n + 3;
  const j = RUST_SCALE[(i + 2) % 7];
  let k = n + ((j - (n % 12) + 12) % 12);
  if (k === n) k += 12;
  return k;
};
const RUST_RIFF = [['E2', 'E2', 'E2', 'F2'], ['E2', 'E2', 'G2', 'F2'], ['E2', 'E2', 'E2', 'F2'], ['D2', 'D2', 'C2', 'B1']];
const RUST_OUD = mel([
  'E4 . F4 . G#4 . . . F4 . E4 . F4 . . .', 'E4 . . . . . . . - - - - B3 . C4 .',
  'D4 . C4 . B3 . C4 . B3 . A3 . G#3 . . .', 'E3 . . . . . . . - - - - - - - -',
]);
const RUST_B = mel([
  'E5 . . . F5 . G#5 . A5 . . . G#5 . F5 .', 'E5 . . . . . . . . . . . B4 . C5 .',
  'D5 . . . C5 . B4 . C5 . . . B4 . A4 .', 'G#4 . . . . . . . B4 . . . . . . .',
  'E5 . . . F5 . G#5 . A5 . . . B5 . C6 .', 'B5 . . . . . A5 . G#5 . . . F5 . . .',
  'G#5 . . . F5 . E5 . D5 . . . F5 . E5 .', 'E5 . . . . . . . . . . . - - - -',
]);
const RUST_HORN = mel([
  'E4 . . . . . . . F4 . . . G#4 . . .', 'A4 . . . . . . . G#4 . . . F4 . . .',
  'E4 . . . . . . . . . . . D4 . C4 .', 'B3 . . . . . . . . . . . . . . .',
  'E4 . . . . . . . F4 . . . G#4 . . .', 'A4 . . . . . . . B4 . . . C5 . . .',
  'B4 . . . . . . . A4 . . . G#4 . F4 .', 'E4 . . . . . . . . . . . . . . .',
]);
const RUST_D = mel([
  'B4 . C5 . B4 . A4 . G#4 . A4 . B4 . C5 .', 'D5 . C5 . B4 . A4 . G#4 . F4 . E4 . F4 .',
  'G#4 . . . A4 . . . B4 . . . C5 . D5 .', 'E5 . . . . . . . - - - - - - - -',
]);
const BREAK = 'x..x..x...x.x...';

function rust(K) {
  for (let bar = 0; bar < 32; bar++) {
    const sec = bar < 4 ? 'intro' : bar < 12 ? 'A' : bar < 20 ? 'B' : bar < 28 ? 'C' : 'D';
    const riff = RUST_RIFF[bar % 4].map(nn);
    if (bar === 0) I.drone(K.t(0, 0), 40, K.S * 64, { v: 1.2 });
    if (bar === 0 || bar === 2) I.brass(K.t(bar, 0), [52, 40], K.S * 24, { v: 1.1, bright: 0.6 });
    if (bar === 3) I.riser(K.t(3, 0), K.S * 16, { v: 0.7 });
    if ([4, 12, 28].includes(bar)) I.impact(K.t(bar, 0), { v: 0.7 });
    if (bar === 20 || bar === 24) I.braam(K.t(bar, 0), 52, K.S * 24, { v: 0.7 });
    for (let s = 0; s < 16; s++) {
      const t = K.t(bar, s);
      const beat = s >> 2;
      const sb = s & 3;
      if (sec === 'intro') {
        if ([0, 3, 6, 8, 12, 14].includes(s)) I.taiko(t, { v: s === 0 ? 1 : 0.7, f: s % 8 === 0 ? 55 : 68 });
        if (s === 10 || s === 13 || s === 15) I.tom(t, s === 10 ? 50 : 55, { v: 0.6, pan: 0.4 });
        if (bar === 3 && s >= 8) I.tom(t, 57 - (s - 8) * 2, { v: 0.5 + (s - 8) * 0.06, pan: 0.6 - (s - 8) * 0.15 });
        continue;
      }
      if (sec === 'C') {
        // Half-time breakdown: heavy syncopated chugs, snare on 3.
        const hit = BREAK[s] === 'x';
        const r = bar % 4 === 3 && s >= 12 ? 41 : 40;
        if (hit) {
          I.guitar(t, power(r), K.S * (s === 0 ? 3 : 2), { mute: s !== 0, v: 1.1 });
          I.bassGtr(t, r, K.S * 2);
          I.kick(t, { tight: true });
        }
        if (s === 8) I.snare(t, { v: 1.2, r: 0.4 });
        if (s === 0) I.crash(t, { v: 0.7, pan: bar % 2 ? 0.5 : -0.5 });
        if (s % 4 === 2) I.hat(t, { v: 0.5, open: true });
        continue;
      }
      // The gallop: chugs on 1, 3 and 4 of every beat; a changed note rings.
      const r = riff[beat];
      if (r !== 40) {
        if (sb === 0) {
          I.guitar(t, power(r), K.S * 3.6, { v: 1.05 });
          I.bassGtr(t, r, K.S * 3.6);
        }
      } else if (sb !== 1) {
        I.guitar(t, power(r), K.S, { mute: true, v: sb === 0 ? 1 : 0.85 });
        I.bassGtr(t, r, K.S, { mute: true });
      }
      if (sb !== 1) I.kick(t, { tight: true, v: sb === 0 ? 0.95 : 0.7 });
      if (s === 4 || s === 12) I.snare(t, { v: 1.1, r: 0.3 });
      if (sb === 0) I.ride(t, { v: s === 0 ? 0.9 : 0.6 });
      if (s === 0 && bar % 2 === 0) I.crash(t, { v: 0.8, pan: bar % 4 ? 0.5 : -0.5 });
      if ((bar === 11 || bar === 19 || bar === 31) && s >= 12) I.tom(t, 52 - (s - 12) * 4, { pan: 0.5 - (s - 12) * 0.3 });
    }
  }
  playMel(K, RUST_OUD, 0, 16, (t, n, d) => I.pluck(t, n, { len: Math.max(0.4, d * 1.2) }));
  playMel(K, RUST_B, 12, 16, (t, n, d) => I.leadGtr(t, n, d));
  playMel(K, RUST_HORN, 20, 16, (t, n, d) => {
    I.brass(t, [n, n - 12], d, { v: 1.2, bright: 0.8 });
    I.pluck(t, n + 12, { v: 0.7, pan: -0.3 });
  });
  playMel(K, RUST_D, 28, 16, (t, n, d) => {
    I.leadGtr(t, n, d, { pan: -0.25 });
    I.leadGtr(t, third(n), d, { pan: 0.25, v: 0.8 });
  });
}

// ------------------------------------------------------------------
// LEVEL 3, FROSTRING: cold movie-style tension. B minor, 92 bpm in half
// time. A string ostinato, a deep drone, metal clanks and cracking ice,
// a cold choir; horns and strings carry the theme.
const FROST_CH = [
  'Bm', 'Bm', 'Bm', 'Bm',
  'Bm', 'Bm', 'G', 'G', 'Em', 'Em', 'F#', 'F#',
  'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#',
  'Bm', 'G', 'Em', 'F#',
];
const FROST_OST = [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 7, 12, 7, 0];
const FROST_THEME = mel([
  'B4 . . . . . . . . . . . C#5 . D5 .', 'E5 . . . . . . . D5 . . . B4 . . .',
  'A4 . . . . . . . . . . . F#4 . A4 .', 'C#5 . . . . . . . . . . . . . . .',
  'D5 . . . . . . . C#5 . . . B4 . . .', 'G5 . . . . . . . F#5 . . . E5 . . .',
  'E5 . . . . . . . D5 . . . C#5 . . .', 'F#5 . . . . . . . . . . . . . . .',
]);
const FROST_TOP = mel([
  'D6 . . . . . . . C#6 . . . B5 . . .', 'G6 . . . . . . . F#6 . . . E6 . . .',
  'E6 . . . . . . . D6 . . . C#6 . . .', 'F#6 . . . . . . . . . . . . . . .',
]);

function frost(K) {
  for (let bar = 0; bar < 24; bar++) {
    const sec = bar < 4 ? 'intro' : bar < 12 ? 'A' : bar < 20 ? 'B' : 'C';
    const c = chord(FROST_CH[bar], 2);
    const root = low(c[0] + 12, 52);
    if (bar === 0) {
      I.drone(K.t(0, 0), 47, K.S * 64, { v: 1.3 });
      I.strings(K.t(0, 0), [nn('B5'), nn('F#6')], K.S * 64, { v: 0.5, att: 1.5, trem: 9 });
    }
    if (sec !== 'intro') I.drone(K.t(bar, 0), low(c[0] + 12, 50), K.S * 16, { v: 0.9 });
    if (bar % 2 === 0) I.crackle(K.t(bar, 3), K.S * 6, { v: 0.6, pan: bar % 4 ? 0.6 : -0.6 });
    if (bar === 3) I.riser(K.t(3, 0), K.S * 16, { v: 0.6 });
    if (bar === 4 || bar === 12) I.impact(K.t(bar, 0), { v: 0.8 });
    if (bar === 20) {
      I.impact(K.t(20, 0), { v: 1 });
      I.braam(K.t(20, 0), 47, K.S * 32, { v: 0.9 });
    }
    if (sec === 'A') I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12], K.S * 16, { v: 0.9, vowel: 'u', att: 0.6 });
    if (sec === 'C') {
      I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24], K.S * 16, { v: 1, vowel: 'a', att: 0.3 });
      I.strings(K.t(bar, 0), [c[0] + 36, c[2] + 36], K.S * 16, { v: 0.5, att: 0.2, trem: 11 });
    }
    if (sec === 'B') I.strings(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12], K.S * 16, { v: 0.7, att: 0.5 });
    for (let s = 0; s < 16; s++) {
      const t = K.t(bar, s);
      if (bar >= 2) I.stacc(t, root + FROST_OST[s], { v: s % 4 === 0 ? 1 : 0.7 });
      if (sec === 'C') I.stacc(t, root + 24 + [0, 7, 12, 7][s % 4], { v: 0.5, pan: -0.4 });
      if (sec === 'intro') {
        if ((bar === 0 && s === 0) || (bar === 1 && s === 10) || (bar === 2 && s === 4)) I.clank(t, { v: 0.6, f: 1300, r: 0.8, len: 1.2, pan: s ? 0.6 : -0.5 });
        continue;
      }
      if (sec === 'C') {
        if (s % 4 === 0 || s === 14 || s === 15) I.kick(t, { v: s % 4 ? 0.7 : 1 });
        if (s === 4 || s === 12) I.snare(t, { v: 1.1, r: 0.5, tone: 170 });
        if (s === 0 || s === 6 || s === 8) I.taiko(t, { v: 0.9 });
        I.hat(t, { v: s % 2 ? 0.35 : 0.6 });
        if (s === 0 && bar % 2 === 0) I.crash(t, { v: 0.7 });
      } else {
        if (s === 0 || s === 6 || (s === 11 && bar % 2)) I.kick(t, { v: s ? 0.8 : 1 });
        if (s === 8) I.snare(t, { v: 1.1, r: 0.6, tone: 170 });
        I.hat(t, { v: s % 4 === 2 ? 0.45 : 0.25, pan: -0.3 });
        if (s === 14 && bar % 2) I.clank(t, { v: 0.7, f: 1100, pan: bar % 4 === 1 ? 0.5 : -0.5 });
        if (sec === 'B' && s === 0) I.taiko(t, { v: 0.8 });
        if ((bar === 11 || bar === 19) && s >= 12) I.taiko(t, { v: 0.5 + (s - 12) * 0.12, f: 70 });
      }
    }
  }
  playMel(K, FROST_THEME, 12, 16, (t, n, d) => {
    I.strings(t, [n], d, { v: 1.4, att: 0.12 });
    I.brass(t, [n - 12], d, { v: 1, bright: 0.7, pan: 0.2 });
  });
  playMel(K, FROST_TOP, 20, 16, (t, n, d) => {
    I.strings(t, [n, n - 12], d, { v: 1.3, att: 0.1 });
    I.brass(t, [n - 24, n - 12], d, { v: 1.1, bright: 0.9 });
  });
}

// ------------------------------------------------------------------
// BOSS 1, ROCKJAW: monster metal. C# with clashing notes (a half step
// and a tritone), 176 bpm, double kick drums, blast beats, a horror
// choir and brass, a screaming lead.
const JAW_RIFF = [
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 6, 0, 5, 0, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3, 0, 2, 1, 0, -1],
];
const JAW_BLAST = [37, 36, 35, 34, 33, 34, 35, 36];
const JAW_THEME = mel([
  'C#4 . . . . . . . D4 . . . . . . .', 'G4 . . . . . . . F#4 . . . . . . .',
  'E4 . . . . . . . D4 . . . C#4 . . .', 'C#4 . . . . . . . . . . . . . . .',
  'C#4 . . . . . . . D4 . . . . . . .', 'A4 . . . . . . . G4 . . . . . . .',
  'F#4 . . . G4 . . . F#4 . . . D4 . . .', 'C#4 . . . . . . . . . . . . . . .',
]);
const JAW_SOLO = mel([
  'C#5 . D5 . C#5 . G5 . F#5 . . . E5 . D5 .', 'C#5 . . . . . . . G4 . G#4 . A4 . C5 .',
  'C#5 . D5 . C#5 . G5 . F#5 . . . E5 . D5 .', 'G5 . . . F#5 . . . E5 . . . D5 . . .',
  'C#5 . . . . . . . . . . . . . . .',
]);

function rockjaw(K) {
  const R = 37; // C#2
  for (let bar = 0; bar < 32; bar++) {
    const sec = bar < 2 ? 'intro' : bar < 10 ? 'A' : bar < 18 ? 'B' : bar < 26 ? 'C' : 'D';
    if (bar === 0) {
      I.braam(K.t(0, 0), 49, K.S * 32, { v: 1.1 });
      I.choir(K.t(0, 0), [nn('C#4'), nn('D4'), nn('G4'), nn('C#5')], K.S * 30, { v: 0.9, att: 1 });
      I.riser(K.t(1, 0), K.S * 16, { v: 0.9 });
    }
    if ([2, 10, 26].includes(bar)) I.impact(K.t(bar, 0), { v: 0.9 });
    if (bar === 18 || bar === 22) I.braam(K.t(bar, 0), 49, K.S * 30, { v: 1 });
    if (sec === 'B' && bar % 2 === 0) {
      const r = JAW_BLAST[bar - 10];
      I.choir(K.t(bar, 0), [r + 24, r + 27, r + 30], K.S * 8, { v: 0.8, att: 0.05 });
    }
    for (let s = 0; s < 16; s++) {
      const t = K.t(bar, s);
      if (sec === 'intro') {
        if (s === 0 || s === 3) I.kick(t, { v: s ? 0.7 : 1, len: 0.6 });
        if (bar === 1 && s >= 4) I.snare(t, { v: 0.2 + (s - 4) * 0.07, r: 0.2 });
        continue;
      }
      if (sec === 'A' || sec === 'D') {
        const k = JAW_RIFF[bar % 2][s];
        if (k === 0) I.guitar(t, power(R), K.S, { mute: true, v: s % 4 === 0 ? 1 : 0.85 });
        else I.guitar(t, power(R + k), K.S * 2, { v: 1 });
        I.bassGtr(t, R + k, K.S, { mute: k === 0 });
        I.kick(t, { tight: true, v: s % 4 === 0 ? 0.9 : 0.6, len: 0.2 });
        if (s === 4 || s === 12) I.snare(t, { v: 1.15, r: 0.25 });
        if (s % 2 === 0) I.ride(t, { v: 0.6 });
        if (s === 0 && bar % 2 === 0) I.crash(t, { v: 0.8, pan: bar % 4 ? 0.5 : -0.5 });
      } else if (sec === 'B') {
        // Blast beat and tremolo-picked chords sliding down and back.
        const r = JAW_BLAST[bar - 10];
        I.guitar(t, power(r), K.S * 0.9, { v: 0.95 });
        if (s % 2 === 0) I.bassGtr(t, r, K.S * 2);
        if (s % 2 === 0) I.kick(t, { tight: true, v: 0.8, len: 0.2 });
        if (s % 2 === 1) I.snare(t, { v: s % 4 === 3 ? 0.9 : 0.6, r: 0.15 });
        if (s % 2 === 0) I.ride(t, { v: 0.7 });
        if (s === 0) I.crash(t, { v: 0.7, pan: bar % 2 ? 0.5 : -0.5 });
      } else {
        // Half-time breakdown.
        const hit = 'x..x..x.x..x.x..'[s] === 'x';
        if (hit) {
          I.guitar(t, power(R), K.S * (s === 0 ? 4 : 2), { mute: s !== 0, v: 1.1 });
          I.bassGtr(t, R, K.S * 2);
          I.kick(t, { tight: true });
        }
        if (s === 8) I.snare(t, { v: 1.25, r: 0.45 });
        if (s % 4 === 0) I.hat(t, { v: 0.6, open: true });
      }
      if ((bar === 9 || bar === 17 || bar === 25 || bar === 31) && s >= 8) I.tom(t, 55 - (s - 8) * 2.5, { v: 0.8, pan: 0.6 - (s - 8) * 0.15 });
    }
  }
  playMel(K, JAW_THEME, 18, 16, (t, n, d) => {
    I.brass(t, [n - 12, n - 24], d, { v: 1.3, bright: 1.1 });
    I.choir(t, [n, n + 7], d, { v: 0.7, att: 0.15 });
  });
  playMel(K, JAW_THEME.filter((x) => x.i >= 64), 18, 16, (t, n, d) => I.leadGtr(t, n + 12, d, { v: 0.9 }));
  playMel(K, JAW_SOLO, 26, 16, (t, n, d) => I.leadGtr(t, n, d));
}

// ------------------------------------------------------------------
// BOSS 2, THE SIEGE CRAWLER: an industrial war march. F minor, 116 bpm.
// Rigid machine-gun guitars, anvils, steam, sirens, a marching snare and
// a huge brass war theme.
const MARCH_CH = [
  'Fm', 'Fm', 'Db', 'Db',
  'Fm', 'Fm', 'Db', 'Db', 'Eb', 'Eb', 'C', 'C',
  'Fm', 'Fm', 'Db', 'Db', 'Eb', 'Eb', 'C', 'C',
  'Fm', 'Fm', 'Db', 'C',
  'Fm', 'Fm', 'Db', 'Db', 'Eb', 'Eb', 'C', 'C',
];
const MARCH_ACC = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0];
const MARCH_THEME = mel([
  'F4 . . . . . . . C4 . . . F4 . G4 .', 'Ab4 . . . . . . . G4 . . . F4 . . .',
  'Ab4 . . . . . . . Bb4 . . . C5 . . .', 'Db5 . . . . . . . C5 . . . Bb4 . . .',
  'Bb4 . . . . . . . G4 . . . Eb4 . . .', 'G4 . . . . . . . Ab4 . . . Bb4 . . .',
  'C5 . . . . . . . . . . . E4 . G4 .', 'C5 . . . . . . . . . . . . . . .',
]);
const JAM = 'x.x...x.xx......';

function march(K) {
  for (let bar = 0; bar < 32; bar++) {
    const sec = bar < 4 ? 'intro' : bar < 12 ? 'A' : bar < 20 ? 'B' : bar < 24 ? 'C' : 'D';
    const c = chord(MARCH_CH[bar], 2);
    const r = low(c[0], 42);
    if (bar === 0) {
      I.brass(K.t(0, 0), [41, 53], K.S * 30, { v: 1.2, bright: 0.5 });
      I.siren(K.t(0, 0), K.S * 64, { v: 0.9 });
      I.steam(K.t(0, 0), 1.5, { pan: -0.5 });
    }
    if (bar === 2) {
      I.brass(K.t(2, 0), [37, 49], K.S * 30, { v: 1.2, bright: 0.5 });
      I.steam(K.t(2, 8), 1.2, { pan: 0.5 });
    }
    if (bar === 3) I.riser(K.t(3, 0), K.S * 16, { v: 0.7 });
    if ([4, 12, 24].includes(bar)) I.impact(K.t(bar, 0), { v: 0.9 });
    if (bar === 20) {
      I.braam(K.t(20, 0), 53, K.S * 32, { v: 1 });
      I.siren(K.t(20, 0), K.S * 64, { v: 1, lo: 60, hi: 67 });
      I.steam(K.t(21, 4), 1.4, { pan: 0.6 });
    }
    if (sec === 'D') I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24], K.S * 16, { v: 0.8, vowel: 'o', att: 0.15 });
    if (sec === 'B') I.strings(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12], K.S * 16, { v: 0.6, att: 0.2 });
    for (let s = 0; s < 16; s++) {
      const t = K.t(bar, s);
      if (sec === 'intro') {
        if ('x..x..x.x..x..x.'[s] === 'x') I.clank(t, { v: 0.8, f: s % 2 ? 1000 : 700, pan: s % 2 ? 0.5 : -0.5 });
        if (bar >= 2) I.snare(t, { v: 0.12 + ((bar - 2) * 16 + s) * 0.025, r: 0.15, pan: 0.2 });
        if (s === 0) I.kick(t, { len: 0.7 });
        continue;
      }
      if (sec === 'C') {
        // The machine jams: hits and silence.
        if (JAM[s] === 'x') {
          I.guitar(t, power(r), K.S * 1.5, { mute: s % 8 !== 0, v: 1.1 });
          I.synthBass(t, r, K.S * 1.5, { cut: 900 });
          I.kick(t, { tight: true });
        }
        if (s === 12) I.clank(t, { v: 1, f: 650 });
        if (s === 14) I.clank(t, { v: 0.7, f: 980, pan: 0.5 });
        if (s === 8) I.snare(t, { v: 1.2, r: 0.5 });
        continue;
      }
      const acc = MARCH_ACC[s];
      I.guitar(t, power(r), K.S * (acc ? 2 : 1), { mute: !acc, v: acc ? 1 : 0.8 });
      I.synthBass(t, r, K.S * 0.9, { cut: acc ? 1400 : 700 });
      if (s % 4 === 0 || s === 14) I.kick(t, { tight: true });
      if (s === 4 || s === 12) I.snare(t, { v: 1.2, r: 0.35 });
      else if (s % 2 === 0) I.snare(t, { v: 0.18, r: 0.05, pan: 0.25 });
      if (s === 6 || s === 14) I.clank(t, { v: 0.8, f: s === 6 ? 760 : 1020, pan: s === 6 ? -0.5 : 0.5 });
      if (s % 2 === 0) I.hat(t, { v: 0.5 });
      if (s === 0 && bar % 2 === 0) I.crash(t, { v: 0.8, pan: bar % 4 ? 0.5 : -0.5 });
      if ((bar === 11 || bar === 19 || bar === 31) && s >= 8) I.snare(t, { v: 0.5 + (s - 8) * 0.07, r: 0.2 });
    }
  }
  playMel(K, MARCH_THEME, 12, 16, (t, n, d) => I.brass(t, [n, n - 12, n - 24], d, { v: 1.25, bright: 1 }));
  playMel(K, MARCH_THEME, 24, 16, (t, n, d) => {
    I.brass(t, [n + 12, n, n - 12], d, { v: 1.2, bright: 1.2 });
    I.leadGtr(t, n + 12, d, { v: 0.7, pan: -0.3, bend: false });
  });
}

// ------------------------------------------------------------------
// BOSS 3, THE GLACIER WARDEN: epic orchestral, in a lurching 7/8 like a
// spinning saw (bars of 7 eighths, grouped 2+2+3). A minor, 150 bpm.
// Driving strings, taiko, choir, huge brass and an icy spin-up.
const WARDEN_CH = [
  'Am', 'Am', 'Am', 'Am',
  'Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E',
  'Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E',
  'F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E',
  'Am', 'Am', 'E', 'E',
];
const WARDEN_OST = [0, 0, 7, 0, 12, 10, 7];
const WARDEN_B = mel([
  'A4 . . . . . . . E5 . . . . .', 'D5 . . . C5 . . . B4 . . . . .',
  'C5 . . . . . . . A4 . . . . .', 'F5 . . . . . . . E5 . . . . .',
  'D5 . . . . . . . F5 . . . . .', 'A5 . . . G5 . . . F5 . . . . .',
  'E5 . . . . . . . . . . . . .', 'G#5 . . . . . . . B5 . . . . .',
]);
const WARDEN_C = mel([
  'C6 . . . . . . . A5 . . . . .', 'B5 . . . . . . . D6 . . . . .',
  'C6 . . . B5 . . . A5 . . . . .', 'E5 . . . . . . . . . . . . .',
  'F5 . . . A5 . . . C6 . . . . .', 'D6 . . . . . . . B5 . . . . .',
  'B5 . . . . . . . G#5 . . . . .', 'E6 . . . . . . . . . . . . .',
]);

function warden(K) {
  for (let bar = 0; bar < 32; bar++) {
    const sec = bar < 4 ? 'intro' : bar < 12 ? 'A' : bar < 20 ? 'B' : bar < 28 ? 'C' : 'D';
    const c = chord(WARDEN_CH[bar], 2);
    const root = low(c[0] + 12, 50);
    const B = K.S * 14;
    if (bar === 0) {
      I.impact(K.t(0, 0), { v: 1 });
      I.crackle(K.t(0, 0), 2.5, { v: 0.9 });
      I.choir(K.t(0, 0), [nn('A3'), nn('E4'), nn('A4')], B * 4, { v: 0.9, vowel: 'u', att: 1.2 });
    }
    if (bar === 3 || bar === 30) {
      I.riser(K.t(bar, 0), B * 2 - K.S, { v: 0.8 });
      I.siren(K.t(bar, 0), B * 2, { v: 1.4, lo: 45, hi: 81, rate: 0.5 / (B * 2) });
    }
    if ([4, 12, 20].includes(bar)) {
      I.impact(K.t(bar, 0), { v: 0.8 });
      I.braam(K.t(bar, 0), root + 12, B * 2, { v: 1 });
    }
    if (sec === 'B') I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12], B, { v: 0.9, att: 0.15 });
    if (sec === 'C') {
      I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24], B, { v: 1, att: 0.1 });
      I.strings(K.t(bar, 0), [c[0] + 36, c[1] + 36], B, { v: 0.45, att: 0.1, trem: 12 });
    }
    if (sec === 'A' && bar % 2 === 0) I.brass(K.t(bar, 0), [c[0] + 12, c[2] + 12], K.S * 6, { v: 0.8, bright: 0.8 });
    for (let s = 0; s < 14; s++) {
      const t = K.t(bar, s);
      const e = s >> 1; // which eighth
      const accent = s === 0 || s === 4 || s === 8;
      if (s % 2 === 0 && bar >= 1) I.stacc(t, root + WARDEN_OST[e], { v: accent ? 1.1 : 0.75, len: 0.15 });
      if (s % 2 === 0 && bar >= 1) I.stacc(t, root - 12 + (e === 6 ? 7 : 0), { v: accent ? 0.9 : 0.5, len: 0.18 });
      if ((sec === 'C' || sec === 'B') && bar % 2 === 1) I.stacc(t, root + 24 + [0, 3, 7, 3][s % 4] + (c[1] - c[0] === 4 && s % 4 === 1 ? 1 : 0), { v: 0.45, len: 0.08, pan: -0.45 });
      if (sec === 'intro') {
        if (bar >= 2 && accent) I.taiko(t, { v: s === 0 ? 1 : 0.7 });
        continue;
      }
      if (accent) I.taiko(t, { v: s === 0 ? 1 : 0.75, f: s === 8 ? 70 : 58 });
      if (sec === 'D') {
        if (bar === 31 && s >= 8) I.taiko(t, { v: 0.5 + (s - 8) * 0.08, f: 75 });
        continue;
      }
      if (s === 0 || s === 8 || s === 10) I.kick(t, { v: s === 10 ? 0.7 : 1 });
      if (s === 4 || s === 12) I.snare(t, { v: s === 4 ? 1.1 : 0.7, r: 0.4 });
      if (s % 2 === 0) I.hat(t, { v: accent ? 0.6 : 0.35 });
      if (s === 0 && bar % 4 === 0) I.crash(t, { v: 0.9 });
      if ((bar === 11 || bar === 19 || bar === 27) && s >= 8) I.taiko(t, { v: 0.5 + (s - 8) * 0.1, f: 64 + (s - 8) * 2 });
    }
  }
  playMel(K, WARDEN_B, 12, 14, (t, n, d) => {
    I.brass(t, [n - 12, n - 24], d, { v: 1.3, bright: 1 });
    I.strings(t, [n], d, { v: 0.9, att: 0.08 });
  });
  playMel(K, WARDEN_C, 20, 14, (t, n, d) => {
    I.strings(t, [n, n - 12], d, { v: 1.2, att: 0.06 });
    I.brass(t, [n - 12, n - 24], d, { v: 1.3, bright: 1.2 });
    I.choir(t, [n - 12], d, { v: 0.6, att: 0.08 });
  });
}

// ------------------------------------------------------------------
// LEVEL 4, THE WHITE FRONT: a winter battle charge in a rolling 12/8 (every
// beat split in three, like a gallop across the snow). G minor, dotted
// quarter = 112 (written as 84 bpm with 12 eighths a bar): marching snare
// drums, staccato strings, a heroic horn theme, heavy guitars for the
// charge, choir, and high ice bells.
const FRONT_CH = [
  'Gm', 'Gm',
  'Gm', 'Gm', 'Eb', 'Eb', 'Cm', 'Cm', 'D', 'D',
  'Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D',
  'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Bb', 'D', 'D',
  'Cm', 'Cm', 'D', 'D',
];
// (12 eighths a bar; '.' holds, '-' rests)
const FRONT_CALL = mel([
  'G4 . . . . . D5 . . . . .', 'G5 . . . . . . . . - - -',
]);
const FRONT_B = mel([
  'G4 . . . . . D5 . . . . .', 'C5 . . Bb4 . . A4 . . . . .',
  'Bb4 . . . . . G4 . . Bb4 . .', 'A4 . . . . . . . . F#4 . .',
  'G4 . . . . . D5 . . . G5 .', 'F5 . . Eb5 . . D5 . . C5 . .',
  'Bb4 . . . . . C5 . . D5 . .', 'D5 . . . . . . . . - - -',
]);
const FRONT_C = mel([
  'G5 . . . . . Bb5 . . . . .', 'F5 . . . . . D5 . . F5 . .',
  'C6 . . . . . A5 . . . F5 .', 'G5 . . . . . . . . . . .',
  'G5 . . . . . Bb5 . . Eb6 . .', 'D6 . . . . . C6 . . Bb5 . .',
  'A5 . . . . . F#5 . . A5 . .', 'D6 . . . . . . . . - - -',
]);
// The strings' ostinato under each chord (semitones above its root), one
// note an eighth: up the chord and back, rolling like the rhythm.
const FRONT_OST = [0, 7, 12, 7, 0, 7, 0, 7, 12, 15, 12, 7];

function front(K) {
  const BAR = K.S * 12;
  for (let bar = 0; bar < 30; bar++) {
    const sec = bar < 2 ? 'intro' : bar < 10 ? 'A' : bar < 18 ? 'B' : bar < 26 ? 'C' : 'D';
    const c = chord(FRONT_CH[bar], 2);
    const root = low(c[0] + 12, 46); // (bass and guitars: G2 up to F#2)
    const minor = c[1] - c[0] === 3;
    if (bar === 0) {
      I.impact(K.t(0, 0), { v: 0.9 });
      I.steam(K.t(0, 0), BAR * 2, { v: 0.6 }); // the wind
      I.crackle(K.t(0, 0), BAR * 1.5, { v: 0.6, pan: 0.3 });
      I.strings(K.t(0, 0), [nn('G2'), nn('D3'), nn('G3')], BAR * 2, { v: 0.8, att: 1 });
      I.riser(K.t(1, 0), BAR, { v: 0.7 });
    }
    if ([2, 10, 18].includes(bar)) {
      I.crash(K.t(bar, 0), { v: 1 });
      I.impact(K.t(bar, 0), { v: 0.6 });
    }
    if (bar === 26) I.braam(K.t(26, 0), root + 12, BAR * 2, { v: 1 });
    if (bar === 28) I.braam(K.t(28, 0), root + 12, BAR * 2, { v: 1.1 });
    if (bar === 29) I.riser(K.t(29, 0), BAR, { v: 0.8 });
    // Choir and pads by section.
    if (sec === 'B') I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12], BAR, { v: 0.7, vowel: 'o', att: 0.3 });
    if (sec === 'C') I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24], BAR, { v: 0.95, att: 0.12 });
    if (sec === 'D') I.choir(K.t(bar, 0), [c[0] + 12, c[2] + 12, c[0] + 24], BAR, { v: 0.9, vowel: 'u', att: 0.4 });
    if (sec === 'A' && bar % 2 === 0) I.strings(K.t(bar, 0), [c[0] + 24, c[1] + 24, c[2] + 24], BAR * 2, { v: 0.5, att: 0.4 });
    for (let s = 0; s < 12; s++) {
      const t = K.t(bar, s);
      const beat = s % 3 === 0; // the four dotted beats: 0, 3, 6, 9
      // The strings' rolling ostinato (from the second bar on).
      if (bar >= 1) {
        const o = FRONT_OST[s] === 15 && !minor ? 16 : FRONT_OST[s];
        I.stacc(t, root + 12 + o, { v: beat ? 1 : 0.7, len: 0.12, pan: s % 2 ? 0.35 : -0.35 });
      }
      if (sec === 'intro') {
        // A marching snare roll swelling into the charge.
        if (bar === 1) I.snare(t, { v: 0.25 + s * 0.06, r: 0.1, tone: 210 });
        if (bar === 1 && s % 3 === 0) I.taiko(t, { v: 0.5 + s * 0.04 });
        continue;
      }
      if (sec === 'D') {
        // Half-time: war drums and a held breath, then the roll back in.
        if (s === 0 || s === 6) I.taiko(t, { v: s === 0 ? 1 : 0.8, f: s === 0 ? 55 : 62 });
        if (s === 0) I.kick(t);
        if (s === 6) I.snare(t, { v: 1, r: 0.5 });
        if (s === 0) I.guitar(t, power(root), BAR * 0.9, { v: 0.9 });
        if (s === 0) I.bassGtr(t, root, BAR * 0.9);
        if (bar === 29) I.snare(t, { v: 0.3 + s * 0.06, r: 0.1, tone: 210 });
        continue;
      }
      // Drums: kick on 1 and 3, snare on 2 and 4, the march's triplet
      // ghost notes between, hats on every eighth.
      if (s === 0 || s === 6 || (sec === 'C' && (s === 8 || s === 11))) I.kick(t, { v: s % 6 === 0 ? 1 : 0.7 });
      if (s === 3 || s === 9) I.snare(t, { v: 1.1, r: 0.35 });
      else if (s % 3 === 2 || (sec !== 'A' && s % 3 === 1)) I.snare(t, { v: 0.28, r: 0.06, tone: 220, pan: 0.2 });
      I.hat(t, { v: beat ? 0.7 : 0.35, open: sec === 'C' && (s === 3 || s === 9) });
      if (sec === 'C' && beat) I.ride(t, { v: 0.55 });
      if (s === 0 && bar % 4 === 2) I.crash(t, { v: 0.7, pan: bar % 8 === 2 ? -0.5 : 0.5 });
      if ((bar === 9 || bar === 17 || bar === 25) && s >= 6) I.tom(t, 52 - (s - 6) * 2, { v: 0.8, pan: 0.5 - (s - 6) * 0.2 });
      // Bass and guitars: the gallop (all three eighths of a beat, the
      // first one ringing); guitars come in for the theme and the charge.
      I.bassGtr(t, root, K.S * (beat ? 1.6 : 0.9), { mute: !beat, v: beat ? 1 : 0.8 });
      if (sec !== 'A') I.guitar(t, power(root), K.S * (beat ? 1.6 : 0.9), { mute: !beat, v: beat ? 1 : 0.8 });
      // Ice bells, high and sparse.
      if ((sec === 'A' || sec === 'B') && s === 0 && bar % 2 === 1) I.pluck(t, c[2] + 36, { v: 0.5, pan: 0.5, len: 1.4 });
      if ((sec === 'A' || sec === 'B') && s === 6 && bar % 2 === 1) I.pluck(t, c[1] + 36, { v: 0.4, pan: -0.5, len: 1.4 });
    }
  }
  playMel(K, FRONT_CALL, 0, 12, (t, n, d) => I.brass(t, [n, n - 12], d, { v: 0.9, bright: 0.6 }));
  playMel(K, FRONT_B, 10, 12, (t, n, d) => {
    I.brass(t, [n, n - 12], d, { v: 1.25, bright: 0.9 });
    I.strings(t, [n + 12], d, { v: 0.6, att: 0.06 });
  });
  playMel(K, FRONT_C, 18, 12, (t, n, d) => {
    I.leadGtr(t, n, d, { v: 0.95 });
    I.brass(t, [n - 12, n - 24], d, { v: 1.2, bright: 1.1 });
    I.strings(t, [n], d, { v: 0.7, att: 0.05 });
  });
}

// ------------------------------------------------------------------
// BOSS 4, FROSTBREAKER: a battleship war anthem in a lurching 5/4 (five
// beats a bar, grouped 3+3+4 eighths, like a heavy ship ploughing on).
// C minor, 150 bpm: ship-horn blasts, steam, thrash guitars and double
// kick, a choir and brass theme, a screaming lead guitar for the climax.
const FLAG_CH = [
  'Cm', 'Cm',
  'Cm', 'Cm', 'Ab', 'G', 'Cm', 'Cm', 'Bb', 'G',
  'Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'F', 'G',
  'Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'G', 'G',
  'Cm', 'Cm',
];
// (20 sixteenths a bar; '.' holds, '-' rests)
const FLAG_B = mel([
  'C5 . . . . . G4 . . . . . C5 . . . Eb5 . . .', 'D5 . . . . . C5 . . . . . Ab4 . . . . . . .',
  'G4 . . . . . Bb4 . . . . . Eb5 . . . D5 . . .', 'D5 . . . . . . . . . . . F5 . . . . . . .',
  'Eb5 . . . . . D5 . . . . . C5 . . . G5 . . .', 'F5 . . . . . Eb5 . . . . . C5 . . . . . . .',
  'Ab5 . . . . . G5 . . . . . F5 . . . Eb5 . . .', 'D5 . . . . . . . . . . . B4 . . . . . . .',
]);
const FLAG_C = mel([
  'C6 . . . Bb5 . Ab5 . . . G5 . Ab5 . . . C6 . . .', 'D6 . . . . . F6 . . . . . D6 . . . Bb5 . . .',
  'Eb6 . . . D6 . C6 . . . G5 . . . . . Eb6 . D6 .', 'C6 . . . . . . . . . . . . . . . - - - -',
  'Ab5 . . . C6 . Eb6 . . . D6 . C6 . . . Ab5 . . .', 'Bb5 . . . D6 . F6 . . . Eb6 . D6 . . . F6 . . .',
  'G6 . . . . . F6 . . . Eb6 . D6 . . . B5 . . .', 'D6 . . . . . . . . . . . - - - - - - - -',
]);
// The riff's chugs (x rings, o muted, . rest) and the drums, in 3+3+4.
const FLAG_RIFF = 'x.oo..x.oo..x.ooo.o.';
const FLAG_KICK = 'x..x..x..x..x.x.x.x.';
const FLAG_SNARE = '....x.....x.....x...';

function flagship(K) {
  const BAR = K.S * 20;
  for (let bar = 0; bar < 28; bar++) {
    const sec = bar < 2 ? 'intro' : bar < 10 ? 'A' : bar < 18 ? 'B' : bar < 26 ? 'C' : 'D';
    const c = chord(FLAG_CH[bar], 2);
    const r = low(c[0], 44); // (C2 up to Bb2)
    if (bar === 0) {
      // the ship's horn, twice, over steam and the engine room
      I.brass(K.t(0, 0), [36, 43], K.S * 14, { v: 1.3, bright: 0.4 });
      I.braam(K.t(0, 0), 48, K.S * 14, { v: 0.9 });
      I.brass(K.t(1, 0), [36, 43], K.S * 16, { v: 1.3, bright: 0.5 });
      I.braam(K.t(1, 0), 48, K.S * 16, { v: 1 });
      I.steam(K.t(0, 10), 1.3, { pan: -0.5 });
      I.riser(K.t(1, 0), BAR, { v: 0.8 });
    }
    if ([2, 10, 18].includes(bar)) {
      I.impact(K.t(bar, 0), { v: 0.9 });
      I.crash(K.t(bar, 0), { v: 1 });
    }
    if (bar === 10 || bar === 26) I.braam(K.t(bar, 0), r + 12, BAR, { v: 1 });
    if (bar === 26) I.steam(K.t(26, 6), 1.4, { pan: 0.5 });
    if (bar === 27) I.riser(K.t(27, 0), BAR, { v: 0.8 });
    if (sec === 'B') I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12], BAR, { v: 0.85, vowel: 'o', att: 0.2 });
    if (sec === 'C') {
      I.choir(K.t(bar, 0), [c[0] + 12, c[1] + 12, c[2] + 12, c[0] + 24], BAR, { v: 0.9, att: 0.1 });
      I.strings(K.t(bar, 0), [c[0] + 36, c[2] + 24], BAR, { v: 0.4, att: 0.1, trem: 12 });
    }
    if (sec === 'D') I.choir(K.t(bar, 0), [c[0] + 12, c[2] + 12, c[0] + 24], BAR, { v: 0.9, vowel: 'u', att: 0.4 });
    for (let s = 0; s < 20; s++) {
      const t = K.t(bar, s);
      if (sec === 'intro') {
        // the engine room: clanking in 3+3+4
        if (FLAG_KICK[s] === 'x') I.clank(t, { v: 0.6, f: s % 6 === 0 ? 650 : 950, pan: s % 2 ? 0.4 : -0.4 });
        if (bar === 1) I.snare(t, { v: 0.15 + s * 0.04, r: 0.1 });
        if (s === 0 || s === 12) I.taiko(t, { v: 0.8 });
        continue;
      }
      if (sec === 'D') {
        // Half-time breakdown: war drums and heavy hits on the groups.
        if (s === 0 || s === 6 || s === 12) {
          I.guitar(t, power(r), K.S * (s === 12 ? 7 : 5), { v: 1.1 });
          I.bassGtr(t, r, K.S * 5);
          I.taiko(t, { v: s === 0 ? 1 : 0.8, f: 58 });
          I.kick(t);
        }
        if (s === 16) I.snare(t, { v: 1.1, r: 0.5 });
        if (bar === 27 && s >= 10) I.snare(t, { v: 0.4 + (s - 10) * 0.06, r: 0.1 });
        continue;
      }
      // Guitars and bass: the 3+3+4 riff (sustained chords under the theme).
      const ch = FLAG_RIFF[s];
      if (sec === 'B') {
        if (s === 0 || s === 12) {
          I.guitar(t, power(r), K.S * (s === 0 ? 11.5 : 7.5), { v: 0.9 });
          I.bassGtr(t, r, K.S * (s === 0 ? 11.5 : 7.5));
        }
      } else if (ch !== '.') {
        I.guitar(t, power(r), K.S * (ch === 'x' ? 1.8 : 0.9), { mute: ch === 'o', v: ch === 'x' ? 1.05 : 0.85 });
        I.bassGtr(t, r, K.S * (ch === 'x' ? 1.8 : 0.9), { mute: ch === 'o' });
      }
      // Drums: kicks on the groups (double kick through the climax), snare
      // on the off-beats, ride and crashes.
      if (sec === 'C') I.kick(t, { tight: true, v: s % 2 ? 0.7 : 0.95 });
      else if (FLAG_KICK[s] === 'x' && (sec === 'A' || s % 6 === 0)) I.kick(t, { tight: true, v: s % 6 === 0 ? 1 : 0.75 });
      if (FLAG_SNARE[s] === 'x') I.snare(t, { v: 1.1, r: 0.35 });
      if (s % 2 === 0) I.hat(t, { v: s % 6 === 0 ? 0.7 : 0.4 });
      if (sec === 'C' && s % 4 === 0) I.ride(t, { v: 0.55 });
      if (s === 0 && bar % 2 === 0 && sec !== 'B') I.crash(t, { v: 0.7, pan: bar % 4 ? 0.5 : -0.5 });
      if ((bar === 9 || bar === 17 || bar === 25) && s >= 12) I.tom(t, 52 - (s - 12) * 2, { v: 0.8, pan: 0.5 - (s - 12) * 0.12 });
      // A ship's horn blast between phrases.
      if (sec === 'A' && s === 0 && bar % 4 === 3) I.brass(t, [c[0], c[0] + 7], K.S * 10, { v: 1.1, bright: 0.5 });
    }
  }
  playMel(K, FLAG_B, 10, 20, (t, n, d) => {
    I.brass(t, [n, n - 12], d, { v: 1.3, bright: 0.9 });
    I.strings(t, [n + 12], d, { v: 0.5, att: 0.06 });
  });
  playMel(K, FLAG_C, 18, 20, (t, n, d) => {
    I.leadGtr(t, n, d, { v: 1 });
    I.brass(t, [n - 12, n - 24], d, { v: 1.1, bright: 1.1 });
  });
}

export const SONGS = {
  belt: { bpm: 126, spb: 16, bars: 32, loop: 4, play: belt },
  rust: { bpm: 150, spb: 16, bars: 32, loop: 4, play: rust },
  frost: { bpm: 92, spb: 16, bars: 24, loop: 4, play: frost },
  rockjaw: { bpm: 176, spb: 16, bars: 32, loop: 2, play: rockjaw },
  march: { bpm: 116, spb: 16, bars: 32, loop: 4, play: march },
  glacier: { bpm: 150, spb: 14, bars: 32, loop: 4, play: warden },
  front: { bpm: 84, spb: 12, bars: 30, loop: 2, play: front },
  flagship: { bpm: 150, spb: 20, bars: 28, loop: 2, play: flagship },
};

// Schedule a whole song from time t0 into the instruments' context.
export function schedule(name, t0) {
  const song = SONGS[name];
  const S = 60 / song.bpm / 4;
  song.play({ S, t: (bar, step) => t0 + (bar * song.spb + step) * S });
  I.finish();
  return song.bars * song.spb * S;
}

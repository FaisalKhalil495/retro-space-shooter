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

export const SONGS = {
  belt: { bpm: 126, spb: 16, bars: 32, loop: 4, play: belt },
  rust: { bpm: 150, spb: 16, bars: 32, loop: 4, play: rust },
  frost: { bpm: 92, spb: 16, bars: 24, loop: 4, play: frost },
  rockjaw: { bpm: 176, spb: 16, bars: 32, loop: 2, play: rockjaw },
  march: { bpm: 116, spb: 16, bars: 32, loop: 4, play: march },
  glacier: { bpm: 150, spb: 14, bars: 32, loop: 4, play: warden },
};

// Schedule a whole song from time t0 into the instruments' context.
export function schedule(name, t0) {
  const song = SONGS[name];
  const S = 60 / song.bpm / 4;
  song.play({ S, t: (bar, step) => t0 + (bar * song.spb + step) * S });
  I.finish();
  return song.bars * song.spb * S;
}

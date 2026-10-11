import { audioOut } from './audio.js?v=0.27.0';

// All the music, generated live (no audio files). Each level has its own
// theme and the title screen has a calm one (warm and a little moody: a
// soft pad, a round bass, a singing lead, light drums); the bosses have
// their own, harder songs.
//
// Boss music: pounding drums, a growling bass line and dark
// stabbing chords. Rockjaw's is in D minor with a flattened second (the
// "phrygian" sound used in a lot of heavy, ominous music); the Siege
// Crawler's is a slower military march; the Glacier Warden's is cold, with
// glassy chimes. Notes are scheduled slightly ahead
// of time so the rhythm stays tight even if the game is busy.

const LOOKAHEAD = 0.15;

// MIDI note numbers. 38 = D2.
const SONGS = {
  // Rockjaw: fast and frantic.
  rockjaw: {
    bpm: 150,
    bass: [
      // bar 1: D
      38, 0, 38, 50, 38, 0, 38, 48, 38, 0, 38, 50, 51, 0, 50, 48,
      // bar 2: Eb
      39, 0, 39, 51, 39, 0, 39, 50, 39, 0, 39, 51, 53, 0, 51, 50,
      // bar 3: D
      38, 0, 38, 50, 38, 0, 38, 48, 38, 0, 38, 50, 51, 0, 50, 48,
      // bar 4: C then Bb, climbing back
      36, 0, 36, 48, 36, 0, 36, 46, 34, 0, 34, 46, 44, 45, 46, 47,
    ],
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    // Chord stabs at the start of each bar.
    chords: [
      [62, 65, 69], // Dm
      [63, 67, 70], // Eb
      [62, 65, 69], // Dm
      [60, 63, 67], // Cm
    ],
    bell: 80,
  },
  // The Siege Crawler: slower and heavier, a military march in C minor with
  // a kick on every beat and snare rolls, like marching boots.
  march: {
    bpm: 126,
    bass: [
      // bar 1: C
      36, 0, 0, 36, 36, 0, 43, 0, 36, 0, 0, 36, 36, 0, 46, 0,
      // bar 2: Ab
      32, 0, 0, 32, 32, 0, 39, 0, 32, 0, 0, 32, 32, 0, 43, 0,
      // bar 3: C
      36, 0, 0, 36, 36, 0, 43, 0, 36, 0, 0, 36, 36, 0, 46, 0,
      // bar 4: G, stomping up
      31, 0, 0, 31, 31, 0, 38, 0, 31, 31, 33, 33, 35, 35, 37, 38,
    ],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1],
    chords: [
      [60, 63, 67], // Cm
      [56, 60, 63], // Ab
      [60, 63, 67], // Cm
      [55, 59, 62], // G
    ],
    bell: 79,
  },
  // The Glacier Warden: cold and heavy, in E minor, with a glassy arpeggio
  // of chimes ringing over the drums like ice.
  glacier: {
    bpm: 118,
    bass: [
      // bar 1: Em
      40, 0, 0, 40, 52, 0, 40, 0, 40, 0, 0, 40, 50, 0, 47, 0,
      // bar 2: C
      36, 0, 0, 36, 48, 0, 36, 0, 36, 0, 0, 36, 47, 0, 43, 0,
      // bar 3: Am
      33, 0, 0, 33, 45, 0, 33, 0, 33, 0, 0, 33, 43, 0, 40, 0,
      // bar 4: B, climbing back
      35, 0, 0, 35, 47, 0, 35, 0, 35, 0, 35, 0, 39, 42, 45, 47,
    ],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    chords: [
      [64, 67, 71], // Em
      [60, 64, 67], // C
      [57, 60, 64], // Am
      [59, 63, 66], // B
    ],
    bell: 83,
    // Chimes on every other 16th, up and down each chord.
    arp: [
      76, 0, 79, 0, 83, 0, 88, 0, 83, 0, 79, 0, 76, 0, 79, 0,
      72, 0, 76, 0, 79, 0, 84, 0, 79, 0, 76, 0, 72, 0, 76, 0,
      69, 0, 72, 0, 76, 0, 81, 0, 76, 0, 72, 0, 69, 0, 72, 0,
      71, 0, 75, 0, 78, 0, 83, 0, 78, 0, 75, 0, 71, 0, 75, 0,
    ],
  },
};

// ---- the themes (levels and title) ----
// A theme is a chord for each bar, a bass pattern (steps above the chord's
// root, per 16th), drums (per 16th) and a lead melody written one 16th per
// word: a note ('D5', 'Bb4', 'F#5'), '.' to hold it, '-' for silence.
const TUNES = {
  // The Outer Belt: driving and a little wistful, in D minor.
  belt: {
    bpm: 104,
    level: 0.3,
    chords: 'Dm Bb F C Dm Bb Gm A Bb C Dm Dm Gm C F A',
    bassPat: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, null, 12, 7],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: 0.018,
    lead: 'square',
    melody: [
      'D5 . . . . . F5 . A5 . . . G5 . F5 .', 'D5 . . . . . . . - - Bb4 . C5 . D5 .',
      'C5 . . . A4 . . . F4 . . . A4 . C5 .', 'E5 . . . . . . . . . . . - - - -',
      'D5 . . . F5 . A5 . D6 . . . C6 . A5 .', 'Bb5 . . . A5 . . . F5 . . . D5 . . .',
      'G5 . . . Bb5 . . . A5 . G5 . F5 . E5 .', 'E5 . . . . . . . C#5 . . . - - - -',
      'F5 . . . . . D5 . . . F5 . G5 . . .', 'E5 . . . . . C5 . . . E5 . G5 . . .',
      'A5 . . . . . . . G5 . F5 . E5 . F5 .', 'D5 . . . . . . . . . . . - - - -',
      'Bb4 . . . D5 . G5 . . . F5 . D5 . . .', 'C5 . . . E5 . G5 . . . A5 . Bb5 . . .',
      'A5 . . . . . F5 . . . . . C5 . . .', 'C#5 . . . E5 . . . A5 . . . . . . .',
    ],
  },
  // Rust Moon: a dusty desert gallop in A minor, with a plucked lead.
  rust: {
    bpm: 96,
    level: 0.3,
    chords: 'Am Am G G F F E E Dm Am E Am Dm Am F E',
    bassPat: [0, null, null, 0, null, null, 0, null, 7, null, null, 7, null, null, 12, null],
    kick: [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: 0.014,
    lead: 'pluck',
    melody: [
      'A4 . . . E5 . . . . . D5 . C5 . B4 .', 'C5 . . . A4 . . . . . . . - - - -',
      'B4 . . . D5 . . . G5 . . . F5 . E5 .', 'D5 . . . . . . . - - B4 . C5 . D5 .',
      'C5 . . . A4 . . . F5 . . . E5 . D5 .', 'C5 . . . . . . . A4 . . . C5 . . .',
      'B4 . . . G#4 . . . E4 . . . G#4 . B4 .', 'E5 . . . . . . . . . . . - - - -',
      'F5 . . . E5 . D5 . . . A4 . . . D5 .', 'E5 . . . . . C5 . . . A4 . . . . .',
      'G#4 . . . B4 . . . E5 . . . D5 . . .', 'C5 . . . B4 . A4 . . . . . - - - -',
      'D5 . . . F5 . A5 . . . G5 . F5 . . .', 'E5 . . . . . C5 . . . E5 . A5 . . .',
      'A5 . . . G5 . F5 . . . E5 . D5 . C5 .', 'B4 . . . . . G#4 . . . . . E4 . . .',
    ],
  },
  // Frostring: slow and cold in E minor, chimes ringing up each chord.
  frost: {
    bpm: 84,
    level: 0.32,
    chords: 'Em C G D Em C Am B C D Em Em Am C B B',
    bassPat: [0, null, null, null, null, null, 7, null, 0, null, null, null, 12, null, null, null],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: 0.01,
    lead: 'soft',
    arp: [0, null, 1, null, 2, null, 3, null, 2, null, 1, null, 0, null, 1, null],
    melody: [
      'B4 . . . . . . . E5 . . . . . . .', 'G5 . . . . . . . E5 . . . . . D5 .',
      'D5 . . . . . . . B4 . . . . . . .', 'A4 . . . . . . . - - - - - - - -',
      'B4 . . . . . . . E5 . . . F#5 . G5 .', 'G5 . . . . . . . E5 . . . . . . .',
      'C5 . . . E5 . . . A5 . . . G5 . . .', 'F#5 . . . . . . . D#5 . . . - - - -',
      'E5 . . . . . . . G5 . . . . . . .', 'F#5 . . . . . . . A5 . . . . . . .',
      'B5 . . . . . . . . . . . A5 . G5 .', 'E5 . . . . . . . . . . . - - - -',
      'A4 . . . C5 . . . E5 . . . . . . .', 'G5 . . . . . . . E5 . . . C5 . . .',
      'D#5 . . . . . . . F#5 . . . . . . .', 'B4 . . . . . . . . . . . - - - -',
    ],
  },
  // The title screen: calm and wide, in D minor.
  title: {
    bpm: 72,
    level: 0.3,
    chords: 'Dm Bb F C Dm Bb C C',
    bassPat: [0, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: 0,
    lead: 'soft',
    arp: [0, null, 1, null, 2, null, 1, null, 3, null, 2, null, 1, null, 2, null],
    melody: [
      'A4 . . . . . . . D5 . . . . . E5 .', 'F5 . . . . . . . D5 . . . . . . .',
      'C5 . . . . . . . A4 . . . C5 . . .', 'G4 . . . . . . . . . . . - - - -',
      'A4 . . . . . . . D5 . . . F5 . . .', 'A5 . . . . . . . G5 . . . F5 . . .',
      'E5 . . . . . . . G5 . . . . . . .', 'E5 . . . . . . . - - - - - - - -',
    ],
  },
};

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// 'F#5' -> MIDI note number (60 = middle C).
function noteNum(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error('bad note ' + name);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// 'F#m' -> the chord's three notes, root in octave 3.
function chordNotes(name) {
  const m = /^([A-G])(#|b)?(m?)$/.exec(name);
  if (!m) throw new Error('bad chord ' + name);
  const root = noteNum(m[1] + (m[2] || '') + '3');
  return [root, root + (m[3] ? 3 : 4), root + 7];
}
// Turn the written themes into what the player needs: each bar's chord,
// and for every 16th, the lead note starting there and how long it lasts.
for (const T of Object.values(TUNES)) {
  T.tune = true;
  T.chordList = T.chords.split(' ').map(chordNotes);
  const words = T.melody.join(' ').split(' ');
  if (words.length !== T.chordList.length * 16) throw new Error('melody and chords differ in length');
  T.notes = words.map(() => null);
  words.forEach((w, i) => {
    if (w === '.' || w === '-') return;
    let len = 1;
    while (words[i + len] === '.') len++;
    T.notes[i] = { n: noteNum(w), len };
  });
  T.length = words.length;
}

const hz = (n) => 440 * 2 ** ((n - 69) / 12);

let timer = null;
let step = 0;
let nextTime = 0;
let bus = null;
let song = SONGS.rockjaw;
let playing = null; // the name of the song playing, or null
let STEP = 60 / song.bpm / 4; // one 16th note

// Start a song (a boss's, a level's or the title's), fading in. Any song
// already playing is faded out first, so changing songs crossfades.
export function startMusic(name) {
  const out = audioOut();
  if (!out || playing === name) return;
  if (timer) stopMusic(1);
  song = SONGS[name] || TUNES[name] || SONGS.rockjaw;
  playing = name;
  STEP = 60 / song.bpm / 4;
  const { ac, master } = out;
  bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, ac.currentTime);
  bus.gain.exponentialRampToValueAtTime(song.level || 0.42, ac.currentTime + 1.5);
  bus.connect(master);
  step = 0;
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(schedule, 25);
}

export const startBossMusic = (name = 'rockjaw') => startMusic(name);

export const musicPlaying = () => playing;

export function stopMusic(fade = 1.5) {
  const out = audioOut();
  if (!timer || !out) return;
  clearInterval(timer);
  timer = null;
  playing = null;
  const g = bus;
  const t = out.ac.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  setTimeout(() => g.disconnect(), (fade + 0.2) * 1000);
}

function schedule() {
  const out = audioOut();
  if (!out) return;
  const { ac } = out;
  if (ac.state !== 'running') return; // paused: hold position
  // If the game was paused a long time, don't try to catch up.
  if (nextTime < ac.currentTime - 0.2) nextTime = ac.currentTime + 0.05;
  while (nextTime < ac.currentTime + LOOKAHEAD) {
    if (song.tune) playTuneStep(out, step, nextTime);
    else playStep(out, step, nextTime);
    nextTime += STEP;
    step = (step + 1) % (song.tune ? song.length : song.bass.length);
  }
}

function playStep({ ac, noiseBuf }, i, t) {
  const s16 = i % 16;
  const bar = Math.floor(i / 16);
  const note = song.bass[i];
  if (note) bass(ac, hz(note), t);
  if (song.kick[s16]) kick(ac, t);
  if (song.snare[s16]) snare(ac, noiseBuf, t);
  if (s16 % 2 === 0) hat(ac, noiseBuf, t, s16 % 4 === 2 ? 0.05 : 0.025);
  if (s16 === 0) stab(ac, song.chords[bar].map(hz), t);
  // An eerie high bell every other bar, on the off-beat.
  if (s16 === 10 && bar % 2 === 1) bell(ac, hz(song.bell), t);
  if (song.arp && song.arp[i]) chime(ac, hz(song.arp[i]), t);
}

function playTuneStep({ ac, noiseBuf }, i, t) {
  const T = song;
  const s16 = i % 16;
  const chord = T.chordList[Math.floor(i / 16)];
  if (s16 === 0) pad(ac, chord.map((n) => hz(n + 12)), t, STEP * 16);
  const b = T.bassPat[s16];
  if (b !== null) softBass(ac, hz(chord[0] - 12 + b), t);
  if (T.kick[s16]) kick(ac, t, 0.4);
  if (T.snare[s16]) snare(ac, noiseBuf, t, 0.45);
  if (T.hat && s16 % 2 === 0) hat(ac, noiseBuf, t, s16 % 4 === 2 ? T.hat * 1.6 : T.hat);
  if (T.arp && T.arp[s16] !== null) {
    const k = T.arp[s16];
    chime(ac, hz(k === 3 ? chord[0] + 36 : chord[k] + 24), t, 0.6);
  }
  const note = T.notes[i];
  if (note) lead(ac, hz(note.n), t, note.len * STEP, T.lead);
}

// A round bass: a triangle wave over a sine an octave down.
function softBass(ac, f, t) {
  const dur = STEP * 2.2;
  for (const [type, mul, vol] of [['triangle', 1, 0.2], ['sine', 0.5, 0.16]]) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = f * mul;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

// A soft pad holding the bar's chord: two slightly detuned saws per note,
// darkened, swelling in and out.
function pad(ac, freqs, t, dur) {
  const filt = ac.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 900;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + Math.min(0.5, dur * 0.3));
  g.gain.setValueAtTime(0.05, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
  filt.connect(g).connect(bus);
  for (const f of freqs) {
    for (const det of [-6, 6]) {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = det;
      osc.connect(filt);
      osc.start(t);
      osc.stop(t + dur + 0.35);
    }
  }
}

// The singing lead. 'square': a mellow square with a slow vibrato; 'pluck':
// a twangy plucked saw; 'soft': a gentle triangle.
function lead(ac, f, t, dur, kind) {
  const osc = ac.createOscillator();
  const filt = ac.createBiquadFilter();
  const g = ac.createGain();
  filt.type = 'lowpass';
  const end = t + dur;
  if (kind === 'pluck') {
    osc.type = 'sawtooth';
    filt.frequency.setValueAtTime(3200, t);
    filt.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.4, dur));
  } else {
    osc.type = kind === 'soft' ? 'triangle' : 'square';
    filt.frequency.value = kind === 'soft' ? 2400 : 1500;
    const vol = kind === 'soft' ? 0.09 : 0.045;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol * 0.8, Math.max(t + 0.04, end - 0.06));
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
    if (dur > 0.3) {
      // A gentle vibrato on held notes.
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = 5;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(f * 0.006, t + 0.3);
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(end + 0.15);
    }
  }
  osc.frequency.value = f;
  osc.connect(filt).connect(g).connect(bus);
  osc.start(t);
  osc.stop(Math.max(end, t + 0.4) + 0.15);
}

function bass(ac, f, t) {
  const osc = ac.createOscillator();
  const sub = ac.createOscillator();
  const filt = ac.createBiquadFilter();
  const g = ac.createGain();
  osc.type = 'sawtooth';
  sub.type = 'square';
  osc.frequency.value = f;
  sub.frequency.value = f / 2;
  filt.type = 'lowpass';
  filt.Q.value = 6;
  filt.frequency.setValueAtTime(900, t);
  filt.frequency.exponentialRampToValueAtTime(160, t + STEP * 1.6);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.8);
  osc.connect(filt);
  sub.connect(filt);
  filt.connect(g).connect(bus);
  osc.start(t);
  sub.start(t);
  osc.stop(t + STEP * 2);
  sub.stop(t + STEP * 2);
}

function kick(ac, t, vol = 0.7) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.3);
}

function noiseHit(ac, buf, t, { dur, vol, type, freq, q = 0.8 }) {
  const src = ac.createBufferSource();
  const filt = ac.createBiquadFilter();
  const g = ac.createGain();
  src.buffer = buf;
  filt.type = type;
  filt.frequency.value = freq;
  filt.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function snare(ac, buf, t, k = 1) {
  noiseHit(ac, buf, t, { dur: 0.18, vol: 0.45 * k, type: 'bandpass', freq: 1800, q: 0.7 });
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  g.gain.setValueAtTime(0.25 * k, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 0.12);
}

function hat(ac, buf, t, vol) {
  noiseHit(ac, buf, t, { dur: 0.04, vol, type: 'highpass', freq: 7000 });
}

function stab(ac, freqs, t) {
  for (const f of freqs) {
    for (const det of [-7, 7]) {
      const osc = ac.createOscillator();
      const filt = ac.createBiquadFilter();
      const g = ac.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      osc.detune.value = det;
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(2200, t);
      filt.frequency.exponentialRampToValueAtTime(400, t + 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(filt).connect(g).connect(bus);
      osc.start(t);
      osc.stop(t + 0.65);
    }
  }
}

// A short glassy chime: a sine with a faint, slightly sharp overtone.
function chime(ac, f, t, k = 1) {
  for (const [mul, vol] of [[1, 0.03 * k], [2.01, 0.012 * k]]) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = f * mul;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + 0.5);
  }
}

function bell(ac, f, t) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + 1.25);
}

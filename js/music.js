import { audioOut } from './audio.js?v=0.4.1';

// Boss music, generated live: pounding drums, a growling bass line and dark
// stabbing chords in D minor with a flattened second (the "phrygian" sound
// used in a lot of heavy, ominous music). Notes are scheduled slightly ahead
// of time so the rhythm stays tight even if the game is busy.

const BPM = 150;
const STEP = 60 / BPM / 4; // one 16th note
const LOOKAHEAD = 0.15;

// MIDI note numbers. 38 = D2.
const BASS = [
  // bar 1: D
  38, 0, 38, 50, 38, 0, 38, 48, 38, 0, 38, 50, 51, 0, 50, 48,
  // bar 2: Eb
  39, 0, 39, 51, 39, 0, 39, 50, 39, 0, 39, 51, 53, 0, 51, 50,
  // bar 3: D
  38, 0, 38, 50, 38, 0, 38, 48, 38, 0, 38, 50, 51, 0, 50, 48,
  // bar 4: C then Bb, climbing back
  36, 0, 36, 48, 36, 0, 36, 46, 34, 0, 34, 46, 44, 45, 46, 47,
];
const KICK = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
// Chord stabs at the start of each bar.
const CHORDS = [
  [62, 65, 69], // Dm
  [63, 67, 70], // Eb
  [62, 65, 69], // Dm
  [60, 63, 67], // Cm
];

const hz = (n) => 440 * 2 ** ((n - 69) / 12);

let timer = null;
let step = 0;
let nextTime = 0;
let bus = null;

export function startBossMusic() {
  const out = audioOut();
  if (!out || timer) return;
  const { ac, master } = out;
  bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, ac.currentTime);
  bus.gain.exponentialRampToValueAtTime(0.42, ac.currentTime + 1.5);
  bus.connect(master);
  step = 0;
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(schedule, 25);
}

export function stopMusic(fade = 1.5) {
  const out = audioOut();
  if (!timer || !out) return;
  clearInterval(timer);
  timer = null;
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
    playStep(out, step, nextTime);
    nextTime += STEP;
    step = (step + 1) % BASS.length;
  }
}

function playStep({ ac, noiseBuf }, i, t) {
  const s16 = i % 16;
  const bar = Math.floor(i / 16);
  const note = BASS[i];
  if (note) bass(ac, hz(note), t);
  if (KICK[s16]) kick(ac, t);
  if (SNARE[s16]) snare(ac, noiseBuf, t);
  if (s16 % 2 === 0) hat(ac, noiseBuf, t, s16 % 4 === 2 ? 0.05 : 0.025);
  if (s16 === 0) stab(ac, CHORDS[bar].map(hz), t);
  // An eerie high bell every other bar, on the off-beat.
  if (s16 === 10 && bar % 2 === 1) bell(ac, hz(80), t);
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

function kick(ac, t) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);
  g.gain.setValueAtTime(0.7, t);
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

function snare(ac, buf, t) {
  noiseHit(ac, buf, t, { dur: 0.18, vol: 0.45, type: 'bandpass', freq: 1800, q: 0.7 });
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
  g.gain.setValueAtTime(0.25, t);
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

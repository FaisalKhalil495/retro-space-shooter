// Action music: a harder sound for the themes (punchy drums, driving bass,
// distorted power chords or big synth chords, a lead that cuts through).
// Three styles to choose from; this file renders them for samples.

let ac = null;
let bus = null;
let noise = null;
let delayIn = null;

export function bind(context, out) {
  ac = context;
  bus = out;
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // A shared echo for leads.
  delayIn = ac.createGain();
  const dl = ac.createDelay(1);
  const fb = ac.createGain();
  const wet = ac.createGain();
  dl.delayTime.value = 0.3;
  fb.gain.value = 0.32;
  wet.gain.value = 0.35;
  delayIn.connect(dl);
  dl.connect(fb).connect(dl);
  dl.connect(wet).connect(bus);
}

const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteNum(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
function chordRoot(name) {
  const m = /^([A-G])(#|b)?(m?)$/.exec(name);
  const r = noteNum(m[1] + (m[2] || '') + '2');
  return { root: r, minor: !!m[3] };
}

let shaperCurve = null;
function drive(amount) {
  const ws = ac.createWaveShaper();
  if (!shaperCurve || shaperCurve.amount !== amount) {
    shaperCurve = new Float32Array(2048);
    shaperCurve.amount = amount;
    for (let i = 0; i < 2048; i++) {
      const x = (i / 2047) * 2 - 1;
      shaperCurve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
  }
  ws.curve = shaperCurve;
  return ws;
}

function env(g, t, peak, attack, hold, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

function noiseHit(t, { dur, vol, type, freq, q = 0.8, hold = 0 }) {
  const src = ac.createBufferSource();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  src.buffer = noise;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  if (hold) g.gain.setValueAtTime(vol, t + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + hold + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + hold + dur + 0.05);
}

// ---- drums ----
function kick(t, v = 1) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(170, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  g.gain.setValueAtTime(0.95 * v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.4);
  noiseHit(t, { dur: 0.018, vol: 0.35 * v, type: 'highpass', freq: 3000 });
}
function snare(t, v = 1, gated = false) {
  noiseHit(t, { dur: 0.17, vol: 0.6 * v, type: 'bandpass', freq: 1900, q: 0.6 });
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(210, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
  g.gain.setValueAtTime(0.35 * v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.14);
  if (gated) noiseHit(t, { dur: 0.05, vol: 0.2 * v, type: 'lowpass', freq: 6000, hold: 0.2 });
}
function hat(t, v = 1, open = false) {
  noiseHit(t, { dur: open ? 0.22 : 0.035, vol: 0.13 * v, type: 'highpass', freq: 8000 });
}
function crash(t, v = 1) {
  noiseHit(t, { dur: 1.5, vol: 0.22 * v, type: 'highpass', freq: 4500 });
}
function tom(t, n, v = 1) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.setValueAtTime(hz(n), t);
  o.frequency.exponentialRampToValueAtTime(hz(n) * 0.6, t + 0.25);
  g.gain.setValueAtTime(0.6 * v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.32);
}

// ---- tones ----
function bass(n, t, dur, gritty = 2) {
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  const sh = drive(gritty);
  f.type = 'lowpass';
  f.Q.value = 5;
  f.frequency.setValueAtTime(1600, t);
  f.frequency.exponentialRampToValueAtTime(260, t + Math.max(0.08, dur * 0.9));
  env(g, t, 0.24, 0.004, dur * 0.5, dur * 0.6);
  for (const [type, mul] of [['sawtooth', 1], ['square', 0.5]]) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = hz(n) * mul;
    o.connect(sh);
    o.start(t);
    o.stop(t + dur * 1.2 + 0.05);
  }
  sh.connect(f).connect(g).connect(bus);
}
// A distorted power chord (root, fifth, octave), like an overdriven guitar.
function power(n, t, dur, muted = false, v = 1) {
  const sh = drive(7);
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  f.type = 'lowpass';
  f.frequency.value = muted ? 1100 : 3000;
  f.Q.value = 0.9;
  env(g, t, 0.075 * v, 0.004, muted ? 0.04 : dur * 0.7, muted ? 0.08 : dur * 0.4);
  for (const k of [0, 7, 12]) {
    for (const det of [-9, 9]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(n + k);
      o.detune.value = det;
      o.connect(sh);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }
  sh.connect(f).connect(g).connect(bus);
}
// A wide stack of detuned saws (the big synth chord sound).
function supersaw(notes, t, dur, v = 1, cutoff = 2400) {
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  env(g, t, 0.05 * v, 0.01, dur * 0.75, dur * 0.3);
  for (const n of notes) {
    for (const det of [-22, -11, 0, 11, 22]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }
  f.connect(g).connect(bus);
}
// The lead: 'rock' a gritty square, 'synth' a bright saw pair with echo,
// 'brass' a swelling brass-like saw.
function lead(n, t, dur, kind) {
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  f.type = 'lowpass';
  const out = kind === 'rock' ? drive(3) : null;
  const oscs = [];
  const types = kind === 'rock' ? [['square', -6], ['square', 6]] : kind === 'synth' ? [['sawtooth', -12], ['sawtooth', 12], ['square', 0]] : [['sawtooth', -8], ['sawtooth', 0], ['sawtooth', 8]];
  for (const [type, det] of types) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = hz(n);
    o.detune.value = det;
    oscs.push(o);
  }
  if (kind === 'brass') {
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.09);
    f.frequency.exponentialRampToValueAtTime(1500, t + 0.4);
  } else f.frequency.value = kind === 'rock' ? 3400 : 4200;
  const vol = kind === 'rock' ? 0.07 : kind === 'synth' ? 0.05 : 0.06;
  env(g, t, vol, kind === 'brass' ? 0.04 : 0.01, Math.max(0.02, dur - 0.08), 0.12);
  if (dur > 0.3) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(hz(n) * 0.008, t + 0.25);
    lfo.connect(depth);
    for (const o of oscs) depth.connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.2);
  }
  for (const o of oscs) {
    o.connect(out || f);
    o.start(t);
    o.stop(t + dur + 0.2);
  }
  if (out) out.connect(f);
  f.connect(g).connect(bus);
  if (kind !== 'brass') g.connect(delayIn);
}

// ---- the sample: the same tune in three styles ----
const CHORDS = 'Dm Bb C Dm Gm Bb A A Dm Bb C Dm Gm A Dm Dm'.split(' ');
const MELODY = [
  'D5 . . . A4 . D5 . E5 . F5 . . . E5 .', 'D5 . . . . . C5 . D5 . . . F5 . . .',
  'E5 . . . G5 . . . C6 . . . A5 . G5 .', 'A5 . . . . . . . . . . . - - A4 .',
  'D5 . . . Bb4 . D5 . G5 . . . F5 . E5 .', 'F5 . . . D5 . F5 . Bb5 . . . A5 . G5 .',
  'A5 . . . . . G5 . F5 . . . E5 . . .', 'C#5 . . . E5 . . . A5 . . . . . . .',
  'D5 . . . A4 . D5 . E5 . F5 . . . E5 .', 'D5 . . . . . C5 . D5 . . . F5 . G5 .',
  'E5 . . . G5 . . . C6 . . . A5 . G5 .', 'A5 . . . . . . . D6 . . . C6 . A5 .',
  'Bb5 . . . A5 . G5 . D5 . . . G5 . A5 .', 'A5 . . . G5 . F5 . E5 . . . C#5 . E5 .',
  'D5 . . . . . . . F5 . E5 . D5 . . .', 'D5 . . . . . . . - - - - - - - -',
].join(' ').split(' ');
const NOTES = MELODY.map((w, i) => {
  if (w === '.' || w === '-') return null;
  let len = 1;
  while (MELODY[i + len] === '.') len++;
  return { n: noteNum(w), len };
});

export const STYLES = {
  rock: { bpm: 156, name: 'Arcade rock' },
  synth: { bpm: 140, name: 'Synthwave action' },
  opera: { bpm: 132, name: 'Space opera' },
};

// Schedule the whole 16-bar sample in style s, from time t0.
export function schedule(style, t0) {
  const { bpm } = STYLES[style];
  const S = 60 / bpm / 4; // one 16th
  for (let i = 0; i < 16 * 16; i++) {
    const t = t0 + i * S;
    const s16 = i % 16;
    const bar = Math.floor(i / 16);
    const { root, minor } = chordRoot(CHORDS[bar]);
    const third = root + (minor ? 3 : 4);
    const fill = bar % 8 === 7 && s16 >= 12;
    if (s16 === 0 && bar % 4 === 0) crash(t, 0.9);
    const note = NOTES[i];
    if (style === 'rock') {
      // Rock drums: kick on 1 and 3 with pushes, snare on 2 and 4.
      if ([0, 3, 8, 10].includes(s16)) kick(t);
      if (s16 === 4 || s16 === 12) snare(t, 1);
      if (s16 % 2 === 0) hat(t, s16 % 4 === 0 ? 1 : 0.7);
      if (fill) tom(t, 50 - (s16 - 12) * 4);
      // Bass and palm-muted chugs on every 8th; a ringing chord on the 1.
      if (s16 % 2 === 0) bass(root, t, S * 1.6, 2.5);
      if (s16 === 0) power(root + 12, t, S * 3, false, 1);
      else if (s16 % 2 === 0) power(root + 12, t, S, true, 0.9);
      if (note) lead(note.n, t, note.len * S, 'rock');
    } else if (style === 'synth') {
      // Four-on-the-floor, a big gated snare, running hats; an octave-
      // bouncing bass on every 16th and pumping chords.
      if (s16 % 4 === 0) kick(t);
      if (s16 === 4 || s16 === 12) snare(t, 1, true);
      hat(t, s16 % 4 === 2 ? 1 : 0.45, s16 % 4 === 2);
      if (fill) snare(t, 0.6);
      bass(root + (s16 % 2 ? 12 : 0), t, S * 0.9, 1.5);
      if (s16 % 4 === 0) supersaw([root + 24, third + 24, root + 31], t + S * 0.5, S * 3, 1);
      if (note) lead(note.n + 12, t, note.len * S, 'synth');
    } else {
      // Space opera: a march snare, timpani on the roots, brass chords
      // that hit and swell, strings holding underneath.
      if (s16 === 0 || s16 === 8) {
        kick(t, 0.8);
        tom(t, root + 12, 0.9);
      }
      if (s16 === 4 || s16 === 12) snare(t, 1);
      if (s16 % 2 === 1) snare(t, 0.18);
      if (fill) snare(t, 0.7);
      if (s16 === 0) supersaw([root + 24, third + 24, root + 31, root + 36], t, S * 16, 0.6, 1400);
      if (s16 === 0 || s16 === 6 || s16 === 10) lead(root + 24, t, S * 2, 'brass');
      if (s16 % 4 === 0) bass(root, t, S * 2, 1.2);
      if (note) {
        lead(note.n, t, note.len * S, 'brass');
        lead(note.n - (minor ? 3 : 4), t, note.len * S, 'brass');
      }
    }
  }
  return 16 * 16 * (60 / bpm / 4);
}

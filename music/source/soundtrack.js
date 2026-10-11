// The soundtrack's instruments, all made by code: drums
// (kick, snare, metal hi-hats, cymbals, toms, taiko, anvil clanks, impacts,
// risers), distorted guitars, basses, synths, and a small orchestra
// (strings, brass, choir, low "braam" hits). Everything plays through a
// stereo mix with a shared reverb, an echo and a "pump" bus that dips
// under the kick drum. Songs (songs.js) call these with exact times.

let ac = null;
let out = null; // the mix
let rev = null; // reverb send
let dly = null; // echo send
let pumpBus = null; // ducks under the kick
let noise = null;
let kicks = [];
const curves = new Map();

export const hz = (n) => 440 * 2 ** ((n - 69) / 12);

// Connect the instruments to a context; `beat` (seconds) sets the echo.
export function bind(context, dest, beat) {
  ac = context;
  kicks = [];
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 28;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 8;
  comp.ratio.value = 3;
  comp.attack.value = 0.008;
  comp.release.value = 0.2;
  out = ac.createGain();
  out.gain.value = 0.55;
  out.connect(hp).connect(comp).connect(dest);

  noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  // Reverb: a dark, wide hall made from decaying noise.
  rev = ac.createGain();
  const revHp = ac.createBiquadFilter();
  revHp.type = 'highpass';
  revHp.frequency.value = 220;
  const conv = ac.createConvolver();
  conv.buffer = hall(2.8);
  const revOut = ac.createGain();
  revOut.gain.value = 0.8;
  rev.connect(revHp).connect(conv).connect(revOut).connect(out);

  // Echo: a dotted-eighth on the left, a quarter on the right, feeding back.
  dly = ac.createGain();
  const merge = ac.createChannelMerger(2);
  const dark = ac.createBiquadFilter();
  dark.type = 'lowpass';
  dark.frequency.value = 2600;
  dly.connect(dark);
  for (const [ch, time] of [[0, beat * 0.75], [1, beat]]) {
    const d = ac.createDelay(3);
    const fb = ac.createGain();
    d.delayTime.value = time;
    fb.gain.value = 0.36;
    dark.connect(d);
    d.connect(fb).connect(d);
    d.connect(merge, 0, ch);
  }
  const dlyOut = ac.createGain();
  dlyOut.gain.value = 0.55;
  merge.connect(dlyOut).connect(out);
  dlyOut.connect(rev);

  pumpBus = ac.createGain();
  pumpBus.connect(out);
}

// After a song is scheduled: make the pump bus dip under every kick.
export function finish() {
  const ts = [...new Set(kicks.map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);
  const g = pumpBus.gain;
  ts.forEach((t, i) => {
    const next = i + 1 < ts.length ? ts[i + 1] - 0.002 : t + 0.25;
    g.setValueAtTime(0.3, t);
    g.linearRampToValueAtTime(1, Math.min(t + 0.24, next));
  });
}

function hall(secs) {
  const n = Math.floor(ac.sampleRate * secs);
  const b = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n;
      const a = 0.85 - 0.7 * k; // darker as it fades
      y += a * (Math.random() * 2 - 1 - y);
      d[i] = y * (1 - k) ** 2.6 * (i < 40 ? i / 40 : 1);
    }
  }
  return b;
}

function shaper(amount) {
  if (!curves.has(amount)) {
    const c = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) {
      const x = (i / 4095) * 2 - 1;
      c[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    curves.set(amount, c);
  }
  const ws = ac.createWaveShaper();
  ws.curve = curves.get(amount);
  ws.oversample = '4x';
  return ws;
}

function filter(type, f, q = 0.7, gain = 0) {
  const b = ac.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.gain.value = gain;
  return b;
}

function osc(type, f, t, end, detune = 0) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = f;
  o.detune.value = detune;
  o.start(t);
  o.stop(end);
  return o;
}

function noiseSrc(t, end) {
  const s = ac.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  s.start(t, Math.random() * 1.5);
  s.stop(end);
  return s;
}

// Envelope: silent → peak in `a`, held for `h`, fades over `r`.
function env(g, t, peak, a, h, r) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + Math.max(0.001, a));
  g.gain.setValueAtTime(peak, t + a + h);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + r);
  return t + a + h + r + 0.02;
}

function gain(v) {
  const g = ac.createGain();
  g.gain.value = v;
  return g;
}

// Send a voice to the mix: panned, with reverb/echo sends, maybe pumped.
function send(node, { pan = 0, r = 0, d = 0, pump = false } = {}) {
  const p = ac.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  node.connect(p);
  p.connect(pump ? pumpBus : out);
  if (r) p.connect(gain(r)).connect(rev);
  if (d) p.connect(gain(d)).connect(dly);
}

function vibrato(oscs, t, f, end, depth = 0.005, delay = 0.25, rate = 5.4) {
  const l = osc('sine', rate, t, end);
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(f * depth, t + delay + 0.3);
  l.connect(g);
  for (const o of oscs) g.connect(o.frequency);
}

// ---------------------------------------------------------------- drums

export function kick(t, { v = 1, len = 0.45, tight = false } = {}) {
  const end = t + len + 0.05;
  const o = osc('sine', 150, t, end);
  o.frequency.setValueAtTime(tight ? 210 : 160, t);
  o.frequency.exponentialRampToValueAtTime(tight ? 58 : 48, t + (tight ? 0.045 : 0.07));
  o.frequency.exponentialRampToValueAtTime(40, t + len);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.9 * v, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(shaper(2)).connect(g);
  send(g);
  const n = noiseSrc(t, t + 0.04);
  const ng = ac.createGain();
  env(ng, t, (tight ? 0.5 : 0.25) * v, 0.001, 0.003, 0.012);
  n.connect(filter('highpass', tight ? 3500 : 2500)).connect(ng);
  send(ng);
  kicks.push(t);
}

export function snare(t, { v = 1, r = 0.25, tone = 190, pan = 0 } = {}) {
  const end = t + 0.35;
  const b = osc('triangle', tone * 1.2, t, end);
  b.frequency.exponentialRampToValueAtTime(tone, t + 0.05);
  const bg = ac.createGain();
  env(bg, t, 0.5 * v, 0.001, 0.01, 0.12);
  b.connect(bg);
  send(bg, { pan, r: r * 0.6 });
  const n = noiseSrc(t, end);
  const ng = ac.createGain();
  env(ng, t, 0.55 * v, 0.001, 0.015, 0.2);
  n.connect(filter('highpass', 1300)).connect(filter('peaking', 3800, 0.8, 5)).connect(ng);
  send(ng, { pan, r });
}

const METAL = [263, 400, 421, 474, 587, 845];
function metal(t, end, mul, bp) {
  const m = ac.createGain();
  m.gain.value = 0.18;
  for (const f of METAL) osc('square', f * mul, t, end).connect(m);
  return m.connect(filter('bandpass', bp, 0.7)).connect(filter('highpass', bp * 0.7));
}

export function hat(t, { v = 1, open = false, pan = 0.3 } = {}) {
  const len = open ? 0.28 : 0.045;
  const end = t + len + 0.05;
  const g = ac.createGain();
  env(g, t, 0.32 * v, 0.001, 0.004, len);
  metal(t, end, 1.7, 10500).connect(g);
  send(g, { pan, r: 0.05 });
}

export function ride(t, { v = 1, pan = -0.35 } = {}) {
  const g = ac.createGain();
  env(g, t, 0.2 * v, 0.001, 0.01, 0.6);
  metal(t, t + 0.7, 2.3, 7000).connect(g);
  send(g, { pan, r: 0.1 });
}

export function crash(t, { v = 1, pan = -0.4, len = 2 } = {}) {
  const end = t + len + 0.1;
  const g = ac.createGain();
  env(g, t, 0.3 * v, 0.002, 0.05, len);
  metal(t, end, 1.3, 7500).connect(g);
  const n = noiseSrc(t, end);
  const ng = ac.createGain();
  env(ng, t, 0.22 * v, 0.002, 0.05, len * 0.8);
  n.connect(filter('highpass', 5000)).connect(ng);
  send(g, { pan, r: 0.3 });
  send(ng, { pan: -pan * 0.5, r: 0.3 });
}

export function tom(t, n, { v = 1, pan = 0 } = {}) {
  const end = t + 0.5;
  const o = osc('sine', hz(n) * 1.6, t, end);
  o.frequency.exponentialRampToValueAtTime(hz(n), t + 0.06);
  const g = ac.createGain();
  env(g, t, 0.7 * v, 0.001, 0.02, 0.38);
  o.connect(shaper(1.5)).connect(g);
  send(g, { pan, r: 0.25 });
  const nz = noiseSrc(t, t + 0.06);
  const ng = ac.createGain();
  env(ng, t, 0.2 * v, 0.001, 0.005, 0.04);
  nz.connect(filter('lowpass', 2500)).connect(ng);
  send(ng, { pan });
}

export function taiko(t, { v = 1, f = 60, pan = 0 } = {}) {
  const end = t + 1.4;
  const o = osc('sine', f * 2, t, end);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
  const g = ac.createGain();
  env(g, t, 0.95 * v, 0.002, 0.03, 1.0);
  o.connect(g);
  send(g, { pan, r: 0.4 });
  const sk = osc('triangle', f * 3.1, t, t + 0.3);
  const sg = ac.createGain();
  env(sg, t, 0.25 * v, 0.001, 0.01, 0.18);
  sk.connect(sg);
  send(sg, { pan, r: 0.4 });
  const nz = noiseSrc(t, t + 0.25);
  const ng = ac.createGain();
  env(ng, t, 0.5 * v, 0.001, 0.01, 0.14);
  nz.connect(filter('lowpass', 700)).connect(ng);
  send(ng, { pan, r: 0.5 });
}

// A hammer on metal: inharmonic ringing (two frequencies modulating).
export function clank(t, { v = 1, f = 900, pan = 0, r = 0.35, len = 0.45 } = {}) {
  const end = t + len + 0.1;
  const c = osc('sine', f, t, end);
  const m = osc('sine', f * 1.414, t, end);
  const mg = ac.createGain();
  mg.gain.setValueAtTime(f * 3, t);
  mg.gain.exponentialRampToValueAtTime(f * 0.2, t + len);
  m.connect(mg).connect(c.frequency);
  const c2 = osc('sine', f * 2.76, t, end);
  const g = ac.createGain();
  env(g, t, 0.22 * v, 0.001, 0.005, len);
  c.connect(g);
  c2.connect(gain(0.4)).connect(g);
  send(g, { pan, r });
  const nz = noiseSrc(t, t + 0.05);
  const ng = ac.createGain();
  env(ng, t, 0.35 * v, 0.001, 0.003, 0.03);
  nz.connect(filter('bandpass', f * 3, 1.2)).connect(ng);
  send(ng, { pan, r });
}

// A deep cinematic boom.
export function impact(t, { v = 1 } = {}) {
  const end = t + 3;
  const o = osc('sine', 70, t, end);
  o.frequency.exponentialRampToValueAtTime(30, t + 1.6);
  const g = ac.createGain();
  env(g, t, 0.9 * v, 0.003, 0.08, 2.2);
  o.connect(shaper(2.5)).connect(g);
  send(g, { r: 0.3 });
  const nz = noiseSrc(t, end);
  const ng = ac.createGain();
  env(ng, t, 0.6 * v, 0.002, 0.05, 1.2);
  nz.connect(filter('lowpass', 420)).connect(ng);
  send(ng, { r: 0.6 });
  crash(t, { v: 0.6 * v, len: 2.5 });
}

// Rising noise into a section.
export function riser(t, dur, { v = 1 } = {}) {
  const end = t + dur + 0.05;
  const nz = noiseSrc(t, end);
  const bp = filter('bandpass', 300, 3);
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(8000, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * v, t + dur);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
  nz.connect(bp).connect(g);
  send(g, { r: 0.4 });
}

export function steam(t, dur, { v = 1, pan = 0 } = {}) {
  const nz = noiseSrc(t, t + dur + 0.1);
  const g = ac.createGain();
  env(g, t, 0.2 * v, 0.02, dur * 0.3, dur * 0.7);
  nz.connect(filter('highpass', 3500)).connect(filter('peaking', 6000, 1, 6)).connect(g);
  send(g, { pan, r: 0.3 });
}

// Cracking ice: a burst of tiny sharp clicks.
export function crackle(t, dur, { v = 1, pan = 0 } = {}) {
  const n = Math.floor(dur * 40);
  for (let i = 0; i < n; i++) {
    const tt = t + Math.random() * dur;
    const nz = noiseSrc(tt, tt + 0.03);
    const g = ac.createGain();
    env(g, tt, (0.1 + Math.random() * 0.25) * v, 0.0005, 0.001, 0.01 + Math.random() * 0.02);
    nz.connect(filter('bandpass', 2000 + Math.random() * 6000, 3)).connect(g);
    send(g, { pan: pan + (Math.random() - 0.5) * 1.2, r: 0.5 });
  }
}

// ---------------------------------------------------------------- basses

// A sequenced synth bass, filter snapping shut (pumps under the kick).
export function synthBass(t, n, dur, { v = 1, cut = 1800, q = 6 } = {}) {
  const end = t + dur + 0.1;
  const f = filter('lowpass', cut, q);
  f.frequency.setValueAtTime(cut, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(110, cut * 0.15), t + 0.16);
  const g = ac.createGain();
  env(g, t, 0.3 * v, 0.003, Math.max(0, dur - 0.05), 0.05);
  const sh = shaper(2.5);
  osc('sawtooth', hz(n), t, end, -7).connect(sh);
  osc('sawtooth', hz(n), t, end, 7).connect(sh);
  sh.connect(f).connect(g);
  send(g, { pump: true });
  const s = osc('sine', hz(n), t, end);
  const sg = ac.createGain();
  env(sg, t, 0.3 * v, 0.003, Math.max(0, dur - 0.05), 0.05);
  s.connect(sg);
  send(sg, { pump: true });
}

// A picked, overdriven bass guitar.
export function bassGtr(t, n, dur, { v = 1, mute = false } = {}) {
  const end = t + dur + 0.15;
  const g = ac.createGain();
  env(g, t, 0.32 * v, 0.003, mute ? 0.04 : Math.max(0, dur - 0.04), mute ? 0.08 : 0.1);
  const sh = shaper(4);
  osc('sawtooth', hz(n), t, end).connect(sh);
  osc('square', hz(n), t, end, 5).connect(gain(0.5)).connect(sh);
  sh.connect(filter('lowpass', mute ? 650 : 1300)).connect(filter('highpass', 45)).connect(g);
  send(g);
  const s = osc('sine', hz(n), t, end);
  const sg = ac.createGain();
  env(sg, t, 0.28 * v, 0.003, mute ? 0.04 : Math.max(0, dur - 0.04), 0.08);
  s.connect(sg);
  send(sg);
}

// A slow growling drone.
export function drone(t, n, dur, { v = 1, cut = 380 } = {}) {
  const end = t + dur + 1;
  const f = filter('lowpass', cut, 3);
  const l = osc('sine', 0.15, t, end);
  const lg = gain(cut * 0.5);
  l.connect(lg).connect(f.frequency);
  const g = ac.createGain();
  env(g, t, 0.22 * v, Math.min(1.5, dur * 0.4), dur * 0.4, Math.min(1.5, dur * 0.4));
  osc('sawtooth', hz(n), t, end, -8).connect(f);
  osc('sawtooth', hz(n), t, end, 8).connect(f);
  osc('sine', hz(n - 12), t, end).connect(gain(1.2)).connect(f);
  f.connect(g);
  send(g, { r: 0.2 });
}

// ---------------------------------------------------------------- guitars

// Distorted rhythm guitar, double-tracked left and right. `notes` is a
// chord (e.g. a power chord [40, 47, 52]); `mute` is a tight palm-muted chug.
export function guitar(t, notes, dur, { v = 1, mute = false } = {}) {
  const end = t + dur + 0.25;
  for (const side of [-0.8, 0.8]) {
    const pre = ac.createGain();
    pre.gain.value = 1.2;
    for (const n of notes) {
      osc('sawtooth', hz(n), t, end, side * 5 + (Math.random() - 0.5) * 6).connect(pre);
      osc('sawtooth', hz(n) * 1.002, t, end, -side * 3).connect(pre);
    }
    const g = ac.createGain();
    env(g, t, 0.1 * v, 0.002, mute ? 0.035 : Math.max(0, dur - 0.06), mute ? 0.08 : 0.16);
    pre
      .connect(filter('highpass', 130))
      .connect(filter('lowpass', mute ? 650 : 2800))
      .connect(shaper(16))
      .connect(filter('peaking', 2400, 1, 4))
      .connect(filter('lowpass', 4300, 0.7))
      .connect(filter('lowpass', 6500, 0.5))
      .connect(filter('highpass', 85))
      .connect(g);
    send(g, { pan: side, r: 0.07 });
  }
}

// A screaming lead guitar: a bend into the note, vibrato, echo.
export function leadGtr(t, n, dur, { v = 1, pan = 0, bend = true } = {}) {
  const end = t + dur + 0.4;
  const a = osc('sawtooth', hz(n), t, end);
  const b = osc('sawtooth', hz(n), t, end, 7);
  if (bend && dur > 0.15) {
    for (const o of [a, b]) {
      o.frequency.setValueAtTime(hz(n - 1), t);
      o.frequency.exponentialRampToValueAtTime(hz(n), t + 0.07);
    }
  }
  if (dur > 0.3) vibrato([a, b], t, hz(n), end, 0.009, 0.22, 5.8);
  const g = ac.createGain();
  env(g, t, 0.15 * v, 0.004, Math.max(0, dur - 0.03), 0.25);
  const pre = ac.createGain();
  a.connect(pre);
  b.connect(pre);
  pre
    .connect(filter('highpass', 220))
    .connect(shaper(20))
    .connect(filter('peaking', 1700, 1, 5))
    .connect(filter('lowpass', 3600, 0.8))
    .connect(g);
  send(g, { pan, r: 0.25, d: 0.25 });
}

// A plucked string with a desert twang (an oud-like sound).
export function pluck(t, n, { v = 1, pan = 0, len = 0.7 } = {}) {
  const end = t + len + 0.1;
  const f = filter('lowpass', 4500, 2);
  f.frequency.setValueAtTime(4500, t);
  f.frequency.exponentialRampToValueAtTime(500, t + len * 0.6);
  const g = ac.createGain();
  env(g, t, 0.2 * v, 0.002, 0.01, len);
  osc('sawtooth', hz(n), t, end, -4).connect(f);
  osc('triangle', hz(n), t, end, 4).connect(f);
  f.connect(g);
  send(g, { pan, r: 0.35, d: 0.2 });
}

// ---------------------------------------------------------------- synths

export function synthLead(t, n, dur, { v = 1, pan = 0 } = {}) {
  const end = t + dur + 0.3;
  const a = osc('sawtooth', hz(n), t, end, -9);
  const b = osc('sawtooth', hz(n), t, end, 9);
  const c = osc('square', hz(n - 12), t, end);
  const f = filter('lowpass', 2600, 2);
  f.frequency.setValueAtTime(5000, t);
  f.frequency.exponentialRampToValueAtTime(2400, t + 0.2);
  if (dur > 0.3) vibrato([a, b, c], t, hz(n), end, 0.006, 0.3, 5.5);
  const g = ac.createGain();
  env(g, t, 0.11 * v, 0.008, Math.max(0, dur - 0.04), 0.18);
  a.connect(f);
  b.connect(f);
  c.connect(gain(0.35)).connect(f);
  f.connect(shaper(1.6)).connect(g);
  send(g, { pan, r: 0.25, d: 0.3 });
}

export function arp(t, n, dur, { v = 1, pan = 0, cut = 2800 } = {}) {
  const end = t + dur + 0.1;
  const f = filter('lowpass', cut, 5);
  f.frequency.setValueAtTime(cut, t);
  f.frequency.exponentialRampToValueAtTime(cut * 0.22, t + 0.12);
  const g = ac.createGain();
  env(g, t, 0.075 * v, 0.002, Math.max(0, dur - 0.04), 0.06);
  osc('sawtooth', hz(n), t, end).connect(f);
  f.connect(g);
  send(g, { pan, r: 0.15, d: 0.35, pump: true });
}

// Wide detuned chords (pumping under the kick).
export function pad(t, notes, dur, { v = 1, cut = 1700, att = 0.06, pump = true } = {}) {
  const end = t + dur + 0.5;
  for (const side of [-0.65, 0.65]) {
    const f = filter('lowpass', cut, 0.7);
    const g = ac.createGain();
    env(g, t, 0.05 * v, att, Math.max(0, dur - att - 0.1), 0.4);
    for (const n of notes) {
      for (const det of [-24, -9, 6, 21]) osc('sawtooth', hz(n), t, end, det * Math.sign(side) * (det > 0 ? 1 : 0.9)).connect(f);
    }
    f.connect(g);
    send(g, { pan: side, r: 0.3, pump });
  }
}

// ---------------------------------------------------------------- orchestra

// Strings section: detuned saws, soft attack, vibrato. Low notes sit a
// little right, high ones a little left (like an orchestra on stage).
export function strings(t, notes, dur, { v = 1, att = 0.25, cut = 2600, trem = 0 } = {}) {
  const end = t + dur + 0.6;
  for (const n of notes) {
    const os = [-11, 0, 10].map((d) => osc('sawtooth', hz(n), t, end, d + (Math.random() - 0.5) * 6));
    vibrato(os, t, hz(n), end, 0.004, 0.3, 5.1);
    const f = filter('lowpass', Math.min(cut, hz(n) * 8), 0.6);
    const g = ac.createGain();
    env(g, t, 0.045 * v, att, Math.max(0, dur - att), 0.4);
    for (const o of os) o.connect(f);
    let node = f.connect(filter('highpass', 160)).connect(g);
    if (trem) {
      const tg = ac.createGain();
      tg.gain.value = 0.55;
      const l = osc('sine', trem, t, end);
      l.connect(gain(0.45)).connect(tg.gain);
      node = node.connect(tg);
    }
    send(node, { pan: Math.max(-0.6, Math.min(0.6, (60 - n) / 30)), r: 0.45 });
  }
}

// Short, bitten string notes (an ostinato).
export function stacc(t, n, { v = 1, len = 0.13, pan = null } = {}) {
  const end = t + len + 0.2;
  const f = filter('lowpass', 3400, 0.9);
  f.frequency.setValueAtTime(4200, t);
  f.frequency.exponentialRampToValueAtTime(1400, t + len);
  const g = ac.createGain();
  env(g, t, 0.075 * v, 0.004, len * 0.3, len);
  for (const d of [-9, 0, 9]) osc('sawtooth', hz(n), t, end, d).connect(f);
  f.connect(filter('highpass', 110)).connect(g);
  send(g, { pan: pan ?? Math.max(-0.5, Math.min(0.5, (57 - n) / 30)), r: 0.3 });
}

// Brass: a scooped attack, the tone opening up like a horn.
export function brass(t, notes, dur, { v = 1, bright = 1, pan = 0 } = {}) {
  const end = t + dur + 0.4;
  for (const n of notes) {
    const os = [-7, 0, 7].map((d) => osc('sawtooth', hz(n), t, end, d));
    for (const o of os) {
      o.detune.setValueAtTime(-35, t);
      o.detune.linearRampToValueAtTime(0, t + 0.06);
    }
    if (dur > 0.4) vibrato(os, t, hz(n), end, 0.004, 0.35, 5);
    const top = Math.min(6000, 1300 * bright + hz(n) * 2.5);
    const f = filter('lowpass', top, 1.2);
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(top, t + 0.09);
    f.frequency.exponentialRampToValueAtTime(top * 0.6, t + 0.6);
    const g = ac.createGain();
    env(g, t, 0.06 * v, 0.035, Math.max(0, dur - 0.06), 0.25);
    for (const o of os) o.connect(f);
    f.connect(shaper(1.8)).connect(g);
    send(g, { pan, r: 0.4 });
  }
}

// A huge low brass "braam": an octave, a fifth, distortion, a slow swell.
export function braam(t, n, dur, { v = 1 } = {}) {
  const end = t + dur + 0.5;
  const f = filter('lowpass', 140, 1.5);
  f.frequency.setValueAtTime(140, t);
  f.frequency.exponentialRampToValueAtTime(1700, t + 0.45);
  f.frequency.exponentialRampToValueAtTime(380, t + dur);
  const g = ac.createGain();
  env(g, t, 0.13 * v, 0.06, dur * 0.45, dur * 0.5);
  const pre = ac.createGain();
  pre.gain.value = 0.5;
  for (const k of [-12, 0, 7, 12]) {
    for (const d of [-16, -5, 6, 15]) osc('sawtooth', hz(n + k), t, end, d).connect(pre);
  }
  pre.connect(shaper(3)).connect(f).connect(g);
  send(g, { r: 0.5 });
  const s = osc('sine', hz(n - 12), t, end);
  const sg = ac.createGain();
  env(sg, t, 0.35 * v, 0.05, dur * 0.45, dur * 0.5);
  s.connect(sg);
  send(sg);
}

const VOWELS = {
  a: [[730, 1, 9], [1090, 0.5, 11], [2440, 0.22, 13]],
  o: [[570, 1, 9], [840, 0.45, 11], [2410, 0.18, 13]],
  u: [[320, 1, 8], [800, 0.3, 11], [2240, 0.1, 13]],
};

// A choir: voices through vowel filters, slow swell, deep reverb.
export function choir(t, notes, dur, { v = 1, vowel = 'a', att = 0.35 } = {}) {
  const end = t + dur + 0.8;
  notes.forEach((n, i) => {
    const os = [-9, 2, 11].map((d) => osc('sawtooth', hz(n), t, end, d + (Math.random() - 0.5) * 6));
    vibrato(os, t, hz(n), end, 0.006, 0.2, 5.3 + i * 0.2);
    const mix = ac.createGain();
    for (const o of os) o.connect(mix);
    const g = ac.createGain();
    env(g, t, 0.16 * v, att, Math.max(0, dur - att), 0.6);
    for (const [ff, k, q] of VOWELS[vowel]) mix.connect(filter('bandpass', ff, q)).connect(gain(k)).connect(g);
    send(g, { pan: (i % 2 ? 0.45 : -0.45) * (i ? 1 : 0.3), r: 0.6 });
  });
}

// A siren: a filtered saw slowly sweeping up and down.
export function siren(t, dur, { v = 1, lo = 62, hi = 69, rate = 0.5 } = {}) {
  const end = t + dur + 0.2;
  const o = osc('sawtooth', hz(lo), t, end);
  const steps = Math.ceil(dur * rate * 2);
  for (let i = 0; i <= steps; i++) {
    const tt = t + (i / steps) * dur;
    o.frequency[i ? 'exponentialRampToValueAtTime' : 'setValueAtTime'](hz(i % 2 ? hi : lo), tt);
  }
  const g = ac.createGain();
  env(g, t, 0.05 * v, 0.6, dur - 1.2, 0.6);
  o.connect(filter('lowpass', 1400, 2)).connect(g);
  send(g, { pan: 0.5, r: 0.6 });
}

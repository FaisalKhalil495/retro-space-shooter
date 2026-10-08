// Sound effects, made with code (the browser's Web Audio synthesiser), so
// there are no audio files and every sound is our own. The "warm retro"
// character comes from soft wave shapes run through low-pass filters, which
// take the harsh top off classic chiptune bleeps.

let ac = null;
let master = null;
let noiseBuf = null;
let lastShot = 0;
let lastHit = 0;
let lastBlock = 0;

// Browsers only allow sound after the player has touched the screen, so this
// is called from the "tap to start" handler.
export function unlockAudio() {
  try {
    if (!ac) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ac = new Ctx();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master = ac.createGain();
      master.gain.value = 0.6;
      master.connect(comp);
      comp.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      // Older iPhones need a sound played inside the tap itself to wake up.
      const src = ac.createBufferSource();
      src.buffer = ac.createBuffer(1, 1, 22050);
      src.connect(ac.destination);
      src.start(0);
    }
    if (ac.state !== 'running') ac.resume();
  } catch {
    ac = null; // no sound available; the game carries on silently
  }
}

export function suspendAudio() {
  if (ac && ac.state === 'running') ac.suspend();
}

export function resumeAudio() {
  if (ac && ac.state !== 'running') ac.resume();
}

const ready = () => ac && ac.state === 'running';

// For the music player, which shares the same sound system.
export function audioOut() {
  return ac && master ? { ac, master, noiseBuf } : null;
}

// A gritty overdrive, used to make boss sounds feel huge and ugly.
let curve = null;
function grit() {
  if (!curve) {
    curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 4);
    }
  }
  const ws = ac.createWaveShaper();
  ws.curve = curve;
  ws.oversample = '2x';
  ws.connect(master);
  return ws;
}

// A dirty low voice: several detuned saw waves through the overdrive.
function growlVoice({ f0, f1, dur, vol, cutoff = 900, when = 0, wobble = 0 }) {
  const t = ac.currentTime + when;
  const out = grit();
  const filt = ac.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(cutoff, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.4), t + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.06);
  gain.gain.setValueAtTime(vol, t + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  filt.connect(gain).connect(out);
  for (const det of [-14, 0, 9]) {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.detune.value = det;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (wobble) {
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = wobble;
      depth.gain.value = f0 * 0.08;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    osc.connect(filt);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

// One synthesised note with a pitch slide and a quick fade-out.
function tone({ type = 'square', f0, f1 = f0, dur, vol, attack = 0.004, cutoff = 2600, when = 0 }) {
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const filt = ac.createBiquadFilter();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  filt.type = 'lowpass';
  filt.frequency.value = cutoff;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filt).connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// A burst of filtered noise (explosions, rumbles, whooshes).
function noise({ dur, vol, f0 = 2000, f1 = 200, q = 0.7, type = 'lowpass', when = 0 }) {
  const t = ac.currentTime + when;
  const src = ac.createBufferSource();
  const filt = ac.createBiquadFilter();
  const gain = ac.createGain();
  src.buffer = noiseBuf;
  src.loop = true;
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(gain).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  shoot() {
    if (!ready() || ac.currentTime - lastShot < 0.05) return;
    lastShot = ac.currentTime;
    tone({ type: 'square', f0: 760, f1: 520, dur: 0.07, vol: 0.05, cutoff: 1800 });
  },
  hit() {
    if (!ready() || ac.currentTime - lastHit < 0.04) return;
    lastHit = ac.currentTime;
    tone({ type: 'triangle', f0: 320, f1: 160, dur: 0.06, vol: 0.12 });
  },
  block() {
    if (!ready() || ac.currentTime - lastBlock < 0.06) return;
    lastBlock = ac.currentTime;
    tone({ type: 'square', f0: 1500, f1: 1300, dur: 0.035, vol: 0.04, cutoff: 3200 });
  },
  explode(size = 1) {
    if (!ready()) return;
    noise({ dur: 0.18 + size * 0.22, vol: 0.22 + size * 0.12, f0: 1600, f1: 120 });
    tone({ type: 'sine', f0: 150, f1: 45, dur: 0.2 + size * 0.15, vol: 0.18 + size * 0.1 });
  },
  playerDie() {
    if (!ready()) return;
    noise({ dur: 0.9, vol: 0.45, f0: 2200, f1: 80 });
    noise({ dur: 0.25, vol: 0.3, f0: 5000, f1: 2000, type: 'highpass' }); // glass
    tone({ type: 'sawtooth', f0: 420, f1: 40, dur: 0.8, vol: 0.12, cutoff: 900 });
  },
  pickup() {
    if (!ready()) return;
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ type: 'triangle', f0: f, dur: 0.1, vol: 0.12, when: i * 0.055 }));
  },
  hurt() {
    // Taking a hit: a crunchy thud and a short alarm chirp.
    if (!ready()) return;
    noise({ dur: 0.22, vol: 0.4, f0: 2600, f1: 300 });
    tone({ type: 'sine', f0: 160, f1: 60, dur: 0.2, vol: 0.4 });
    tone({ type: 'square', f0: 880, f1: 660, dur: 0.12, vol: 0.05, cutoff: 2000, when: 0.05 });
  },
  shieldHit() {
    if (!ready()) return;
    tone({ type: 'triangle', f0: 1400, f1: 900, dur: 0.18, vol: 0.16 });
    tone({ type: 'sine', f0: 2100, f1: 1700, dur: 0.12, vol: 0.06 });
  },
  powerUp() {
    if (!ready()) return;
    [392, 494, 587, 784, 988].forEach((f, i) =>
      tone({ type: 'triangle', f0: f, dur: 0.09, vol: 0.12, when: i * 0.045 }));
  },
  repair() {
    if (!ready()) return;
    [330, 440, 554, 659].forEach((f, i) =>
      tone({ type: 'sine', f0: f, f1: f * 1.02, dur: 0.14, vol: 0.16, when: i * 0.08 }));
  },
  lowHealth() {
    // Warning beep at one health block left.
    if (!ready()) return;
    tone({ type: 'square', f0: 990, dur: 0.07, vol: 0.05, cutoff: 2200 });
    tone({ type: 'square', f0: 990, dur: 0.07, vol: 0.05, cutoff: 2200, when: 0.12 });
  },
  oneUp() {
    if (!ready()) return;
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      tone({ type: 'square', f0: f, dur: 0.12, vol: 0.06, cutoff: 1800, when: i * 0.07 }));
  },
  click() {
    // Button feedback on iPhones, which can't vibrate.
    if (!ready()) return;
    tone({ type: 'sine', f0: 1100, f1: 700, dur: 0.035, vol: 0.14 });
  },
  tick() {
    // D-pad direction change on iPhones.
    if (!ready()) return;
    tone({ type: 'sine', f0: 620, f1: 560, dur: 0.02, vol: 0.05 });
  },
  empty() {
    if (!ready()) return;
    tone({ type: 'triangle', f0: 220, f1: 180, dur: 0.08, vol: 0.1 });
  },
  bomb() {
    if (!ready()) return;
    noise({ dur: 1.1, vol: 0.5, f0: 900, f1: 50 });
    tone({ type: 'sine', f0: 110, f1: 28, dur: 1.0, vol: 0.4 });
  },
  rocket() {
    if (!ready()) return;
    noise({ dur: 0.35, vol: 0.18, f0: 600, f1: 2400, q: 3, type: 'bandpass' });
  },
  laser(dur) {
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 180, f1: 140, dur, vol: 0.1, cutoff: 1300, attack: 0.02 });
    tone({ type: 'square', f0: 361, f1: 283, dur, vol: 0.04, cutoff: 1600, attack: 0.02 });
  },
  warning() {
    if (!ready()) return;
    for (let i = 0; i < 3; i++) {
      tone({ type: 'triangle', f0: 440, dur: 0.22, vol: 0.16, when: i * 0.6 });
      tone({ type: 'triangle', f0: 330, dur: 0.22, vol: 0.16, when: i * 0.6 + 0.26 });
    }
  },
  rumble() {
    if (!ready()) return;
    noise({ dur: 0.4, vol: 0.2, f0: 300, f1: 90 });
  },
  roar() {
    // A boss roar: dirty growl, rushing breath and a sub-bass punch.
    if (!ready()) return;
    growlVoice({ f0: 95, f1: 48, dur: 1.5, vol: 0.32, cutoff: 1100, wobble: 11 });
    growlVoice({ f0: 142, f1: 70, dur: 1.2, vol: 0.14, cutoff: 1500, wobble: 7, when: 0.05 });
    noise({ dur: 1.3, vol: 0.3, f0: 1400, f1: 200, q: 0.9 });
    tone({ type: 'sine', f0: 70, f1: 30, dur: 1.2, vol: 0.45 });
  },
  growl() {
    // Wind-up before a charge.
    if (!ready()) return;
    growlVoice({ f0: 62, f1: 74, dur: 0.75, vol: 0.24, cutoff: 600, wobble: 16 });
    noise({ dur: 0.7, vol: 0.12, f0: 220, f1: 500, q: 2, type: 'bandpass' });
  },
  voice(roar = false, kind) {
    // A low growly blip while a boss's speech bubble types out ('metal': a
    // harsher, radio-like buzz for machines).
    if (!ready()) return;
    if (kind === 'metal') {
      const f = (roar ? 110 : 150) + Math.random() * 30;
      tone({ type: 'square', f0: f, f1: f * 0.9, dur: 0.05, vol: roar ? 0.06 : 0.045, cutoff: 1400 });
      return;
    }
    const f = (roar ? 70 : 95) + Math.random() * 25;
    tone({ type: 'sawtooth', f0: f, f1: f * 0.8, dur: 0.06, vol: roar ? 0.09 : 0.06, cutoff: 700 });
  },
  horn() {
    // A war machine's roar: a deep, detuned horn blast with engine noise.
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 73, f1: 62, dur: 1.3, vol: 0.2, attack: 0.08, cutoff: 600 });
    tone({ type: 'sawtooth', f0: 110, f1: 92, dur: 1.3, vol: 0.13, attack: 0.08, cutoff: 800 });
    noise({ dur: 1.2, vol: 0.18, f0: 500, f1: 120 });
  },
  stomp() {
    // A huge iron foot hitting the ground.
    if (!ready()) return;
    tone({ type: 'sine', f0: 90, f1: 32, dur: 0.35, vol: 0.4 });
    noise({ dur: 0.3, vol: 0.3, f0: 700, f1: 90 });
  },
  cannon() {
    // The main gun: a sharp crack and a deep boom.
    if (!ready()) return;
    noise({ dur: 0.12, vol: 0.4, f0: 5000, f1: 800, type: 'highpass' });
    noise({ dur: 0.5, vol: 0.35, f0: 900, f1: 80 });
    tone({ type: 'sine', f0: 120, f1: 40, dur: 0.4, vol: 0.3 });
  },
  charge(dur) {
    // A rising whine as the cannon powers up (a warning).
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 180, f1: 900, dur, vol: 0.05, attack: 0.05, cutoff: 1800 });
  },
  snap() {
    // Jaws slamming shut: a crunch and a thump.
    if (!ready()) return;
    noise({ dur: 0.18, vol: 0.55, f0: 3500, f1: 600, q: 0.8, type: 'highpass' });
    noise({ dur: 0.25, vol: 0.4, f0: 900, f1: 120 });
    tone({ type: 'sine', f0: 120, f1: 40, dur: 0.3, vol: 0.5 });
  },
  inhale(dur) {
    // A huge breath sucking everything in.
    if (!ready()) return;
    noise({ dur, vol: 0.35, f0: 180, f1: 1600, q: 1.5, type: 'bandpass' });
    growlVoice({ f0: 40, f1: 58, dur, vol: 0.16, cutoff: 400, wobble: 5 });
  },
  quake() {
    if (!ready()) return;
    noise({ dur: 1.4, vol: 0.4, f0: 260, f1: 60 });
    tone({ type: 'sine', f0: 48, f1: 28, dur: 1.4, vol: 0.4 });
  },
  splat() {
    // Wet, meaty burst.
    if (!ready()) return;
    noise({ dur: 0.16, vol: 0.32, f0: 1300, f1: 180, q: 3, type: 'bandpass' });
    tone({ type: 'sine', f0: 180, f1: 60, dur: 0.14, vol: 0.25 });
  },
  crack() {
    // Shell breaking off.
    if (!ready()) return;
    noise({ dur: 0.5, vol: 0.5, f0: 4000, f1: 300, q: 0.7, type: 'highpass' });
    noise({ dur: 0.7, vol: 0.4, f0: 600, f1: 80 });
  },
  iceChip() {
    // A shot chipping ice: a short, glassy tick.
    if (!ready() || ac.currentTime - lastBlock < 0.05) return;
    lastBlock = ac.currentTime;
    tone({ type: 'triangle', f0: 2100, f1: 1500, dur: 0.04, vol: 0.05, cutoff: 4000 });
  },
  shatter() {
    // A slab of ice bursting: a bright crash and falling tinkles.
    if (!ready()) return;
    noise({ dur: 0.35, vol: 0.3, f0: 6000, f1: 900, q: 0.8, type: 'highpass' });
    [1900, 1500, 2300, 1250].forEach((f, i) =>
      tone({ type: 'triangle', f0: f, f1: f * 0.8, dur: 0.09, vol: 0.05, when: 0.04 + i * 0.05, cutoff: 5000 }));
  },
  grind(dur = 0.6) {
    // A saw ring spinning up: a rising, grinding whine.
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 220, f1: 640, dur, vol: 0.06, attack: 0.03, cutoff: 2400 });
    noise({ dur, vol: 0.1, f0: 1800, f1: 4200, q: 4, type: 'bandpass' });
  },
  beam(dur) {
    // The frost beam: a cold hiss with a high, wavering tone.
    if (!ready()) return;
    noise({ dur, vol: 0.18, f0: 5200, f1: 3000, q: 1.5, type: 'bandpass' });
    tone({ type: 'triangle', f0: 1320, f1: 990, dur, vol: 0.05, attack: 0.03, cutoff: 4000 });
  },
  howl(dur) {
    // A blizzard: wind howling up and dying away.
    if (!ready()) return;
    noise({ dur, vol: 0.22, f0: 300, f1: 1400, q: 6, type: 'bandpass' });
    noise({ dur: dur * 0.8, vol: 0.12, f0: 900, f1: 500, q: 4, type: 'bandpass', when: 0.4 });
  },
  iceRoar() {
    // The Glacier Warden: its horn, a grinding saw and cracking ice at once.
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 82, f1: 65, dur: 1.4, vol: 0.18, attack: 0.08, cutoff: 700 });
    tone({ type: 'sawtooth', f0: 123, f1: 98, dur: 1.4, vol: 0.11, attack: 0.08, cutoff: 900 });
    noise({ dur: 1.2, vol: 0.16, f0: 2400, f1: 5200, q: 3, type: 'bandpass' });
    noise({ dur: 0.5, vol: 0.3, f0: 6000, f1: 900, q: 0.8, type: 'highpass', when: 0.1 });
  },
  mortar() {
    // Hollow "thoomp" of a mortar shell leaving its tube.
    if (!ready()) return;
    tone({ type: 'sine', f0: 220, f1: 70, dur: 0.16, vol: 0.2 });
    noise({ dur: 0.12, vol: 0.12, f0: 900, f1: 200 });
  },
  levelClear() {
    if (!ready()) return;
    const notes = [523, 659, 784, 659, 784, 1047];
    notes.forEach((f, i) =>
      tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.13, when: i * 0.12 }));
  },
};

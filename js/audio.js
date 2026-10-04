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
    tone({ type: 'sawtooth', f0: 420, f1: 40, dur: 0.8, vol: 0.12, cutoff: 900 });
  },
  pickup() {
    if (!ready()) return;
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ type: 'triangle', f0: f, dur: 0.1, vol: 0.12, when: i * 0.055 }));
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
    if (!ready()) return;
    tone({ type: 'sawtooth', f0: 130, f1: 70, dur: 0.6, vol: 0.14, cutoff: 700 });
    noise({ dur: 0.5, vol: 0.12, f0: 700, f1: 150 });
  },
  levelClear() {
    if (!ready()) return;
    const notes = [523, 659, 784, 659, 784, 1047];
    notes.forEach((f, i) =>
      tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.13, when: i * 0.12 }));
  },
};

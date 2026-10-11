import { VERSION, VIEW_W, VIEW_H, PAL } from './config.js?v=0.26.0';
import { readSafeArea, computeLayout } from './layout.js?v=0.26.0';
import { Controls } from './controls.js?v=0.26.0';
import { Game } from './game.js?v=0.26.0';
import { unlockAudio, suspendAudio, setVolumes, sfx } from './audio.js?v=0.26.0';
import { startMusic, stopMusic, musicPlaying } from './music.js?v=0.26.0';
import { useDetail } from './detail.js?v=0.26.0';
import { Menu } from './menu.js?v=0.26.0';
import { save, store, reachLevel, isHighScore, addScore } from './save.js?v=0.26.0';
import { buzz, canVibrate, setVibrate, HAPTIC } from './feedback.js?v=0.26.0';
import { Background } from './background.js?v=0.26.0';
import { LEVELS } from './levels.js?v=0.26.0';

const canvas = document.getElementById('screen');
const ctx = useDetail(canvas.getContext('2d', { alpha: false }));
const rotateOverlay = document.getElementById('rotate');

const controls = new Controls(canvas);
// Testing aids: "?start=boss" jumps straight to the boss (with a laser
// loaded); "?start=60" starts 60 seconds into the level; "?level=2" starts
// on level 2 (they combine: "?level=2&start=boss"). With either, the game
// skips the title screen: one tap starts that level.
const params = new URLSearchParams(location.search);
const startParam = params.get('start');
const startAt = startParam === 'boss' ? 'boss' : Number(startParam) || 0;
const urlLevel = Math.min(LEVELS.length, Math.max(1, Math.round(Number(params.get('level')) || 1)));
const testStart = params.has('level') || params.has('start');
const game = new Game({ startAt, level: urlLevel });

// The sky behind the menus (its own dice, never the game's), and the one
// behind the "to be continued" screen.
const titleBg = new Background(Math.random, LEVELS[0].background);
const endBg = new Background(Math.random, { space: '#111829', sun: false, dust: true, dustColor: '#1a2640' });

// 'menu': title and its screens, no game running; 'play': playing;
// 'paused': the game frozen under the pause menu; 'over': game over, the
// game's wreckage still settling under its menu.
let mode = 'menu';
let layout = null;
let dpr = 1;
let testFreeze = false; // automated tests drive the game themselves
let fade = 0; // 1 = the screen just changed: it fades in from dark

function applySettings() {
  setVolumes(save.settings.music, save.settings.sound);
  setVibrate(save.settings.vibrate);
}
applySettings();

const menu = new Menu({
  canVibrate,
  play: (level, practice) => startLevel(level, practice),
  quickStart: () => startLevel(urlLevel, false, startAt),
  setting(key, value) {
    save.settings[key] = value;
    store();
    applySettings();
  },
  resume: () => resume(),
  restart() {
    game.reset(game.carry); // the level again, as it started
    resume();
  },
  quit: () => showTitle(),
  continueLevel() {
    // The same level, score from 0, 3 lives; from the boss if you got that
    // far (the boss checkpoint).
    game.startAt = menu.info.boss ? 'checkpoint' : 0;
    game.reset();
    game.startAt = 0;
    mode = 'play';
    menu.screen = null;
    controls.releaseAll();
  },
  enterName(name) {
    const place = addScore(name, menu.info.score, menu.info.level);
    if (menu.info.after === 'end') menu.open('scores', { place });
    else menu.open('gameover', { newBest: false, place });
  },
  endDone() {
    if (isHighScore(menu.info.score)) menu.open('entry', { after: 'end' });
    else showTitle();
  },
});
menu.open(testStart ? 'quick' : 'title', { level: urlLevel });

function startLevel(level, practice, at = 0) {
  game.levelIndex = level - 1;
  game.startAt = at;
  game.practice = practice;
  game.reset();
  if (!practice) reachLevel(level, LEVELS.length);
  fade = 1;
  mode = 'play';
  menu.screen = null;
  controls.releaseAll();
  lastTime = performance.now();
}

function showTitle() {
  stopMusic(0.3);
  fade = 1;
  mode = 'menu';
  menu.open('title', { place: -1, after: null });
}

// After a level-clear screen: the next level, or (after the last one) the
// "to be continued" screen; a practice run goes back to the level list.
game.onLevelDone = () => {
  if (game.practice) {
    stopMusic(0.3);
    fade = 1;
    mode = 'menu';
    menu.open('levels');
  } else if (game.levelIndex + 1 < LEVELS.length) {
    reachLevel(game.levelIndex + 2, LEVELS.length);
    game.nextLevel();
  } else {
    save.finished = true; // (the level list now says what's coming)
    store();
    stopMusic(0.5);
    fade = 1;
    mode = 'menu';
    menu.open('end', { score: game.score, level: game.level.number, after: 'end', place: -1 });
  }
};

// ---- sizing ----
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  layout = computeLayout(w, h, readSafeArea());
  controls.setLayout(layout);
  checkOrientation();
}

const isPortrait = () => window.innerHeight > window.innerWidth;

function checkOrientation() {
  const portrait = isPortrait();
  rotateOverlay.hidden = !portrait;
  if (portrait) pause();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
window.visualViewport?.addEventListener('resize', resize);

// ---- full screen, pause ----
async function goFullscreen() {
  // Android Chrome can hide its address bar and lock to landscape. iPhone
  // Safari doesn't allow this for web pages, so it quietly does nothing there.
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
      setTimeout(resize, 300); // the screen size changes after going full screen
    }
    await screen.orientation?.lock?.('landscape');
  } catch {
    // Not supported or not allowed: the game still works in the normal view.
  }
}

function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  controls.releaseAll();
  menu.open('pause');
}

function resume() {
  mode = 'play';
  menu.screen = null;
  controls.releaseAll();
  lastTime = performance.now();
}

// Pause automatically when the player switches apps, locks the phone or
// gets a call, so they never come back to a lost life.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    suspendAudio(); // (any tap wakes the sound again)
  }
});
window.addEventListener('blur', pause);
window.addEventListener('pagehide', pause);

// The pause button: top of the right margin, above Special. (A finger on
// it never reaches the Fire and Special buttons.)
function pauseRect() {
  const z = layout.rightZone;
  return { x: z.x + z.w - 48, y: z.y + 10, w: 38, h: 38 };
}
window.addEventListener('pointerdown', (e) => {
  if (mode !== 'play' || !layout) return;
  const r = pauseRect();
  const m = 10; // a near miss still counts
  if (e.clientX > r.x - m && e.clientX < r.x + r.w + m && e.clientY > r.y - m && e.clientY < r.y + r.h + m) {
    e.stopPropagation();
    e.preventDefault();
    buzz(HAPTIC.button);
    sfx.click();
    pause();
  }
}, true);

// ---- menu taps ----
const menuShown = () => mode !== 'play' && menu.screen !== null;
const toGame = (e) => [(e.clientX - layout.game.x) / layout.scale, (e.clientY - layout.game.y) / layout.scale];
canvas.addEventListener('pointerdown', (e) => {
  if (!menuShown() || isPortrait()) return;
  menu.down(...toGame(e));
});
canvas.addEventListener('pointerup', (e) => {
  unlockAudio(); // browsers only allow sound after a touch
  if (!menuShown() || isPortrait()) return;
  if (menu.up(...toGame(e))) {
    buzz(HAPTIC.button);
    sfx.click();
    if (mode === 'play') goFullscreen(); // just started playing
  }
});

// Stop the browser's own touch gestures (zoom, text selection, pull-to-refresh).
for (const type of ['touchstart', 'touchmove', 'gesturestart', 'dblclick', 'contextmenu']) {
  document.addEventListener(type, (e) => e.cancelable && e.preventDefault(), { passive: false });
}

// ---- main loop ----
const STEP = 1 / 120; // physics runs in small fixed steps for smooth, even motion
let lastTime = performance.now();

// Testing aid: ?fps shows how smoothly the game runs on this phone: frames
// a second, how many frames came late while playing (each one is a small
// stutter) and the longest one. Any screen refresh rate (60, 90, 120 Hz).
const meter = params.has('fps') ? { n: 0, t0: 0, fps: 0, avg: 16.7, late: 0, worst: 0 } : null;
function measure(now, ms) {
  meter.n++;
  if (now - meter.t0 >= 1000) {
    meter.fps = Math.round((meter.n * 1000) / (now - meter.t0));
    meter.n = 0;
    meter.t0 = now;
  }
  const playing = mode === 'play' && game.state === 'playing';
  if (playing && ms > meter.avg * 1.7 && ms > 20 && ms < 1000) {
    meter.late++;
    meter.worst = Math.max(meter.worst, Math.round(ms));
  }
  if (ms < meter.avg * 2) meter.avg += (ms - meter.avg) * 0.05;
}

function stepGame(dt, input) {
  let left = dt;
  while (left > 1e-6) {
    const step = Math.min(STEP, left);
    game.update(step, input);
    // One-shot presses only count once per frame.
    input.special = false;
    input.tap = false;
    left -= step;
  }
}

function frame(now) {
  if (meter) measure(now, now - lastTime);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  controls.enabled = mode === 'play';
  if (testFreeze) {
    // (A test is driving the game itself.)
  } else if (mode === 'play') {
    stepGame(dt, controls.read());
    if (game.state === 'gameover') {
      mode = 'over';
      stopMusic(1.5);
      menu.open('gameover', {
        level: game.level.number, score: game.score, quip: game.quip, practice: !!game.practice, boss: game.reachedBoss,
        newBest: !game.practice && isHighScore(game.score), place: -1, after: 'gameover',
      });
    }
  } else if (mode === 'over') {
    // The wreckage settles under the Game Over menu.
    stepGame(dt, { ...NO_INPUT });
  } else if (mode === 'menu') {
    menuBg().update(dt); // the stars drift behind the menus
    if (musicPlaying() !== 'title') startMusic('title'); // (once sound is allowed)
  }
  if (!testFreeze && mode !== 'play') menu.update(dt);

  render(dt);
  requestAnimationFrame(frame);
}

const NO_INPUT = { dx: 0, dy: 0, fire: false, special: false, tap: false };
const menuBg = () => (menu.screen === 'end' || menu.info.after === 'end' ? endBg : titleBg);

function render(dt) {
  const L = layout;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAL.void;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Screen bezel, like a handheld console.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = L.game;
  ctx.fillStyle = PAL.bezel;
  roundRect(ctx, g.x - 6, g.y - 6, g.w + 12, g.h + 12, 10);
  ctx.fill();

  // Game world, scaled up from game pixels.
  const k = L.scale * dpr; // device pixels per game pixel
  const snap = (v) => Math.round(v * k) / k;
  ctx.save();
  ctx.setTransform(k, 0, 0, k, Math.round(g.x * dpr), Math.round(g.y * dpr));
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.clip();
  if (mode === 'menu') menuBg().draw(ctx, snap);
  else game.draw(ctx, snap);
  if (menuShown()) {
    ctx.setTransform(k, 0, 0, k, Math.round(g.x * dpr), Math.round(g.y * dpr));
    menu.draw(ctx);
  }
  if (fade > 0) {
    // Fading in from dark after changing between the menus and the game.
    ctx.fillStyle = PAL.void;
    ctx.globalAlpha = Math.min(1, fade);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = 1;
    fade -= dt * 2.5;
  }
  ctx.restore();

  // Controls on top, in CSS pixels.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (mode === 'play') {
    controls.draw(ctx, dt);
    drawPauseButton();
  }

  // Version label, bottom of the left margin.
  ctx.fillStyle = PAL.textDim;
  ctx.globalAlpha = 0.7;
  ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.fillText('v' + VERSION, L.leftZone.x + 8, L.leftZone.y + L.leftZone.h - 8);
  if (meter) {
    ctx.fillText(`${meter.fps} fps`, L.leftZone.x + 8, L.leftZone.y + 18);
    ctx.fillText(`late ${meter.late}`, L.leftZone.x + 8, L.leftZone.y + 30);
    ctx.fillText(`worst ${meter.worst} ms`, L.leftZone.x + 8, L.leftZone.y + 42);
  }
  ctx.globalAlpha = 1;
}

// Two bars on a dark rounded square, quiet so it doesn't distract.
function drawPauseButton() {
  const r = pauseRect();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = PAL.bezel;
  roundRect(ctx, r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = PAL.blueDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PAL.cream;
  ctx.fillRect(r.x + r.w / 2 - 7, r.y + 11, 5, r.h - 22);
  ctx.fillRect(r.x + r.w / 2 + 2, r.y + 11, 5, r.h - 22);
  ctx.globalAlpha = 1;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

resize();
requestAnimationFrame(frame);

// Small hook so automated tests can inspect the game. Harmless for players.
window.__ember = {
  game,
  controls,
  menu,
  get mode() { return mode; },
  // Start a level as the Play button does (default: the one in the link).
  play(level = urlLevel, practice = false) {
    unlockAudio();
    startLevel(level, practice, level === urlLevel ? startAt : 0);
  },
  get layout() { return layout; },
  set frozen(v) { testFreeze = v; }, // stop the live loop stepping the game
};

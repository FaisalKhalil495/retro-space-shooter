import { VERSION, STAGE_LABEL, VIEW_W, VIEW_H, PAL } from './config.js?v=0.3.0';
import { readSafeArea, computeLayout } from './layout.js?v=0.3.0';
import { Controls } from './controls.js?v=0.3.0';
import { Game } from './game.js?v=0.3.0';
import { unlockAudio, suspendAudio, resumeAudio } from './audio.js?v=0.3.0';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });
const startOverlay = document.getElementById('start');
const pauseOverlay = document.getElementById('pause');
const rotateOverlay = document.getElementById('rotate');

document.querySelectorAll('[data-version]').forEach((el) => {
  el.textContent = `v${VERSION} · ${STAGE_LABEL}`;
});

const controls = new Controls(canvas);
// Testing aid: "?start=boss" jumps straight to the boss (with a laser loaded);
// "?start=60" starts 60 seconds into the level.
const startParam = new URLSearchParams(location.search).get('start');
const startAt = startParam === 'boss' ? 'boss' : Number(startParam) || 0;
const game = new Game({ startAt });

let layout = null;
let dpr = 1;
let started = false;
let paused = false;

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
  if (portrait && started) pause();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
window.visualViewport?.addEventListener('resize', resize);

// ---- start / pause ----
async function goFullscreen() {
  // Android Chrome can hide its address bar and lock to landscape. iPhone
  // Safari doesn't allow this for web pages, so it quietly does nothing there.
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    }
    await screen.orientation?.lock?.('landscape');
  } catch {
    // Not supported or not allowed: the game still works in the normal view.
  }
}

startOverlay.addEventListener('pointerup', (e) => {
  e.preventDefault();
  unlockAudio();
  goFullscreen();
  startOverlay.hidden = true;
  started = true;
  controls.releaseAll();
  game.reset();
  setTimeout(resize, 300); // the screen size changes after going full screen
});

pauseOverlay.addEventListener('pointerup', (e) => {
  e.preventDefault();
  if (isPortrait()) return;
  unlockAudio();
  goFullscreen();
  resume();
});

function pause() {
  if (!started || paused) return;
  paused = true;
  controls.releaseAll();
  pauseOverlay.hidden = false;
  suspendAudio();
}

function resume() {
  paused = false;
  resumeAudio();
  controls.releaseAll();
  pauseOverlay.hidden = true;
  lastTime = performance.now();
}

// Pause automatically when the player switches apps, locks the phone or
// gets a call, so they never come back to a lost life.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', pause);
window.addEventListener('pagehide', pause);

// Stop the browser's own touch gestures (zoom, text selection, pull-to-refresh).
for (const type of ['touchstart', 'touchmove', 'gesturestart', 'dblclick', 'contextmenu']) {
  document.addEventListener(type, (e) => e.cancelable && e.preventDefault(), { passive: false });
}

// ---- main loop ----
const STEP = 1 / 120; // physics runs in small fixed steps for smooth, even motion
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (started && !paused) {
    const input = controls.read();
    let left = dt;
    while (left > 1e-6) {
      const step = Math.min(STEP, left);
      game.update(step, input);
      // One-shot presses only count once per frame.
      input.special = false;
      input.tap = false;
      left -= step;
    }
  } else {
    // Keep the starfield drifting behind menus.
    game.bg.update(dt);
  }

  render(dt);
  requestAnimationFrame(frame);
}

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
  if (started) game.draw(ctx, snap);
  else game.bg.draw(ctx, snap);
  ctx.restore();

  // Controls on top, in CSS pixels.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (started) controls.draw(ctx, dt);

  // Version label, bottom of the left margin.
  ctx.fillStyle = PAL.textDim;
  ctx.globalAlpha = 0.7;
  ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.fillText('v' + VERSION, L.leftZone.x + 8, L.leftZone.y + L.leftZone.h - 8);
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
window.__ember = { game, controls, get layout() { return layout; } };

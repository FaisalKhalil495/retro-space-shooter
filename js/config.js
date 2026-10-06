// Shared constants for Ember Drift.
// VERSION is shown in-game so the owner can tell whether the phone has the
// latest copy. Change it with tools/set-version.sh, never by hand, so every
// file's cache-busting "?v=" stays in step.
export const VERSION = '0.14.0';
export const STAGE_LABEL = 'Stage 3 \u00b7 Rust Moon';

// The game world is a fixed grid of "game pixels". It is scaled up to fit the
// phone, so every phone sees exactly the same playfield.
export const VIEW_W = 208;
export const VIEW_H = 144;
export const HUD_H = 10; // strip at the top the ship can't fly into

// Blood and gore on/off (Stage 5 adds a menu switch for this).
export const BLOOD = true;

// Muted, warm palette. No neon.
export const PAL = {
  void: '#0b0f1c',      // screen margins / console body
  bezel: '#1b2238',
  space: '#141a2e',     // deep space
  spaceMid: '#1d2540',
  ink: '#0e1222',       // sprite outlines
  blueDark: '#34406a',
  blue: '#5a6a9a',
  bluePale: '#9fb0d0',
  cream: '#efe3cf',
  amberLight: '#f2cf8a',
  amber: '#e3a857',
  amberSoft: '#c98f4a',
  amberDark: '#8a5a2e',
  red: '#a8544a',
  redDark: '#7a3a36',
  redSoft: '#d07a5e',
  grey: '#6d6a73',
  textDim: '#9c9584',
};

export const PLAYER = {
  speed: 80,           // game pixels per second
  fireInterval: 0.13,  // seconds between shots while Fire is held
  bulletSpeed: 220,
  lives: 3,
  health: 5,           // health blocks per life
  hurtInvuln: 1.0,     // seconds of safety after taking a hit
  respawnInvuln: 2.2,
};

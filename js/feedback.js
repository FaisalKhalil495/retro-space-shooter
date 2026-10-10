// Touch feedback. Android browsers can vibrate; iPhone browsers can't, so on
// iPhone the controls use bigger visual pulses instead (and sound, from
// Stage 2 onwards). The player can switch vibration off in Options.
export const canVibrate =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

let on = true; // the Vibration option

export function setVibrate(v) {
  on = v;
}

export function buzz(ms) {
  if (!canVibrate || !on) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // Some browsers throw if vibration is blocked; feedback is optional.
  }
}

export const HAPTIC = {
  button: 16,    // pressing Fire or Special
  direction: 8,  // the d-pad clicking into a new direction
  hurt: [40, 30, 60],
};

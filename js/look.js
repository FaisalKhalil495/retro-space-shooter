// Which look the game is drawn in (the look sample, after v0.37.0).
//   id 1: today's game, exactly as it is (the default everywhere).
//   id 2: the new look being tried out: 3D-modelled sprites that animate,
//         light, staged explosions, wrecks, a layered background.
//   k:    how fine the new look's art is (pixels per game pixel): 2 is
//         today's double detail, 4 twice as fine again.
// Only test links and the preview page change it: ?look=2 (new, as fine as
// today), ?look=3 (new, finer: k 3), ?look=4 (new, finest: k 4).
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('look') : null;
export const look = { id: 1, k: 2 };
export function setLook(v) {
  const n = +v || 1;
  look.id = n >= 2 ? 2 : 1;
  look.k = n >= 2 ? n : 2;
}
setLook(q);
export const isNew = () => look.id === 2;

// The Iron Wolves army for the preview: each vehicle as a function (open) -> { w, h, a },
// like the older sprite sets; shots stay as they were. The owner removed the big sled
// (and with it the Anchor Gun), so the preview has six enemy types.
import { V } from './vehicles.js';
import { D } from './designs.js';
import { ART as AR } from './artillery.js';
import { paint } from './vec.js';
import { WOLF_COAST } from '../sets4.js';
const make = (n) => (open) => { const p = paint(V[n] || D[n] || AR[n], 'wolves', open); return { w: p.w, h: p.h, a: p.a }; };
export const WOLVES = {
  spotter: make('spotter'), // the owner's pick for the artillery: calls in the far guns
  hound: make('weaverA'), flak: make('spinnerB'), // the owner's picks: Wolf Hound, Flak Star
  skiff: make('skiff'), roller: make('roller'), dart: make('dart'),
  bomber: make('bomber'), needle: make('needle'), hunter: make('hunter'),
  charge: WOLF_COAST.charge, bomb: WOLF_COAST.bomb,
};

// The Iron Wolves army for the preview: each vehicle as a function (open) -> { w, h, a },
// like the older sprite sets. The big sled takes the Anchor Gun's place (same attack:
// armoured until it opens up for a heavy shell); shots stay as they were.
import { V } from './vehicles.js';
import { paint } from './vec.js';
import { WOLF_COAST } from '../sets4.js';
const make = (n) => (open) => { const p = paint(V[n], 'wolves', open); return { w: p.w, h: p.h, a: p.a }; };
export const WOLVES = {
  skiff: make('skiff'), anchor: make('hauler'), roller: make('roller'), dart: make('dart'),
  bomber: make('bomber'), needle: make('needle'), hunter: make('hunter'),
  charge: WOLF_COAST.charge, bomb: WOLF_COAST.bomb,
};

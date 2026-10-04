import { VIEW_W, VIEW_H } from './config.js?v=0.6.0';

// Each side margin must leave at least this much room (CSS pixels) for a thumb.
const MIN_MARGIN = 118;

const probe = document.createElement('div');
probe.style.cssText =
  'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
  'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
document.documentElement.appendChild(probe);

// Testing aid: "?safe=59" pretends the phone has a 59px camera cutout on
// each side, like an iPhone 16 Pro held sideways.
const fakeSafe = Number(new URLSearchParams(location.search).get('safe')) || 0;

// The "safe area" is the part of the screen clear of camera cutouts and
// rounded corners. The browser reports it; we keep everything inside it.
export function readSafeArea() {
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: Math.max(parseFloat(cs.paddingRight) || 0, fakeSafe),
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: Math.max(parseFloat(cs.paddingLeft) || 0, fakeSafe),
  };
}

// Work out where the game screen and the two thumb zones go.
export function computeLayout(cssW, cssH, safe) {
  // A cutout appears on whichever side the camera ends up, so reserve the
  // larger inset on both sides to keep the game centred.
  const side = Math.max(safe.left, safe.right);
  const availW = cssW - side * 2;
  const availH = cssH - safe.top - safe.bottom;

  let scale = Math.min(availH / VIEW_H, (availW - MIN_MARGIN * 2) / VIEW_W);
  scale = Math.max(scale, 0.5);
  const gw = VIEW_W * scale;
  const gh = VIEW_H * scale;
  const gx = side + (availW - gw) / 2;
  const gy = safe.top + (availH - gh) / 2;

  return {
    cssW,
    cssH,
    scale,
    game: { x: gx, y: gy, w: gw, h: gh },
    // Visible control areas, kept inside the safe area.
    leftZone: { x: side, y: safe.top, w: gx - side, h: availH },
    rightZone: { x: gx + gw, y: safe.top, w: cssW - side - (gx + gw), h: availH },
  };
}

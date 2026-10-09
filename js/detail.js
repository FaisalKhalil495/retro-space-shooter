// Double detail (v0.20.0). The game still works on its 208x144 grid of game
// pixels: every position, size and hit area is in game pixels, exactly as
// before. But pictures are now drawn with twice as many pixels each way.
//
// A picture keeps its normal-size canvas, so code that measures it (like
// SPRITES.player.width) is unchanged, and carries its sharper version as
// `.hi`. useDetail(ctx) makes a drawing context draw the sharper version,
// in the same place and at the same size, whenever a picture has one.
export const DETAIL = 2; // pixels per game pixel in the sharper pictures

// The smallest step for things drawn by code (half a game pixel).
export const FINE = 1 / DETAIL;

export function useDetail(ctx) {
  const draw = ctx.drawImage.bind(ctx);
  ctx.drawImage = (img, ...a) => {
    const hi = img && img.hi;
    if (!hi) return draw(img, ...a);
    // drawImage(img, x, y): at its normal size.
    if (a.length === 2) return draw(hi, a[0], a[1], img.width, img.height);
    // drawImage(img, x, y, w, h): stretched to a size given in game pixels.
    if (a.length === 4) return draw(hi, ...a);
    // drawImage(img, sx, sy, sw, sh, x, y, w, h): part of the picture,
    // measured in the normal picture's pixels.
    const f = hi.width / img.width;
    return draw(hi, a[0] * f, a[1] * f, a[2] * f, a[3] * f, a[4], a[5], a[6], a[7]);
  };
  return ctx;
}

// A blank picture to paint by code at double detail. Returns `canvas`, a
// normal-size stand-in (measure it and draw it like any picture; it carries
// the sharp one as .hi), and `ctx`, the sharp canvas's context, already
// scaled so you paint in game pixels (FINE = one sharp pixel).
export function detailCanvas(w, h) {
  const hi = document.createElement('canvas');
  hi.width = Math.ceil(w * DETAIL);
  hi.height = Math.ceil(h * DETAIL);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.hi = hi;
  const ctx = hi.getContext('2d');
  ctx.scale(DETAIL, DETAIL);
  return { canvas, ctx };
}

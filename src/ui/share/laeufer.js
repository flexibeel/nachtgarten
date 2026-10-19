/**
 * Nachtgarten – Teilen: das Mannequin mitten im Schritt, für Laufkarten.
 *
 *   drawRunner(ctx, x, y, h, theme)  Läuferin als Piktogramm, Füße auf (x, y) – Mitte unten
 *   runnerSealRows()                 Silhouette als Siegel-Motiv („#“ ausgespart), 11 × 13
 */

import { boundsOf, rasterPose } from './mannequin.js';
import { drawFigure, figureBounds } from './piktogramm.js';
import { runnerMotion } from './pose.js';

/**
 * Malt die Läuferin als Piktogramm (Silhouette); Füße auf (x, y) – Mitte unten, h = Höhe in px.
 * colors: {ink, far} – Standard aus dem Thema.
 */
export function drawRunner(ctx, x, y, h, theme, { colors, makeCanvas } = {}) {
  const { def, pose } = runnerMotion();
  const fr = figureBounds(def, [pose], { props: false, pad: 1 });
  const s = h / fr[3];
  const c = colors || (theme === 'dunkel' ? { ink: '#EEE9E4', far: '#7A726E' } : { ink: '#24211F', far: '#A29A94' });
  const x0 = x - (fr[2] * s) / 2; const y0 = y - fr[3] * s;
  drawFigure(ctx, pose, def, { x: x0, y: y0, s, frame: fr, ink: c.ink, far: c.far, props: false, makeCanvas });
  return { x: x0, y: y0, w: fr[2] * s, h: fr[3] * s };
}

let sealCache = null;
/** Siegel-Motiv: die Läuferin als Silhouette, 11 breit × 13 hoch. */
export function runnerSealRows() {
  if (sealCache) return sealCache;
  const { def, pose } = runnerMotion();
  const fr = boundsOf(def, [pose], { props: false, pad: 0.5 });
  const rows = 13;
  const side = fr[3];
  const frame = [fr[0] + fr[2] / 2 - (side * 11) / 13 / 2, fr[1], (side * 11) / 13, side];
  const R = rasterPose(pose, def, { frame, cols: 11, rows, props: false, detail: false, ss: 4 });
  sealCache = Array.from({ length: rows }, (_, j) => Array.from({ length: 11 }, (_, i) => (R.cells[j * 11 + i] ? '#' : '.')).join(''));
  return sealCache;
}

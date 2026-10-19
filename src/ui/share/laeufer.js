/**
 * Nachtgarten – Teilen: das Mannequin mitten im Schritt, für Laufkarten.
 *
 *   drawRunner(ctx, x, y, h, theme)  kleine Pixel-Läuferin, Füße auf (x, y) – Mitte unten
 *   runnerSealRows()                 Silhouette als Siegel-Motiv („#“ ausgespart), 11 × 13
 */

import { boundsOf, MANNEQUIN_COLORS, paintRaster, rasterPose } from './mannequin.js';
import { runnerMotion } from './pose.js';

/** Malt die Läuferin; h = Höhe in px. Gibt {x, y, w, h} der Figur zurück. */
export function drawRunner(ctx, x, y, h, theme, { colors, unit = 1.6 } = {}) {
  const { def, pose } = runnerMotion();
  const fr = boundsOf(def, [pose], { props: false, pad: 1 });
  const s = h / fr[3];
  const p = Math.max(2, Math.round(s * unit));
  const cols = Math.round((fr[2] * s) / p); const rows = Math.round((fr[3] * s) / p);
  const frame = [fr[0] + fr[2] / 2 - (cols * p) / s / 2, fr[1] + fr[3] - (rows * p) / s, (cols * p) / s, (rows * p) / s];
  const R = rasterPose(pose, def, { frame, cols, rows, props: false, moving: new Set(['n.thigh', 'n.shin', 'f.thigh', 'f.shin']) });
  const x0 = Math.round(x - (cols * p) / 2); const y0 = Math.round(y - rows * p);
  paintRaster(ctx, R, x0, y0, p, colors || MANNEQUIN_COLORS[theme === 'dunkel' ? 'dunkel' : 'hell']);
  return { x: x0, y: y0, w: cols * p, h: rows * p };
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

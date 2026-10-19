/**
 * Siegel aus dem gewählten Begleiter: die Pixel-Figur (ohne Schatten und Effekte) auf
 * 9 × 9 verkleinert, „#“ = ausgespart. Rein, ohne DOM.
 */

import { SPECIES } from '../companion/sprites.js';

const SIZE = 9;
/** Anteil Körper-Pixel, ab dem ein Siegel-Pixel ausgespart wird (höher = schlankere Figur). */
const THRESHOLD = 0.8;

/**
 * @param {string[]} grid   Pixel-Bild (Zeichen je Farbe, „.“ = leer)
 * @returns {string[]}
 */
export function sealFromGrid(grid) {
  // Körper: Kleinbuchstaben (Großbuchstaben sind gemeinsame Effekte, Schatten, Pflanzen).
  const on = (x, y) => /[a-df-z]/.test(grid[y]?.[x] ?? '.');
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  grid.forEach((row, y) => [...row].forEach((_, x) => {
    if (!on(x, y)) return;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }));
  if (x1 < 0) return Array.from({ length: SIZE }, () => '.'.repeat(SIZE));
  const side = Math.max(x1 - x0, y1 - y0) + 1;
  const ox = x0 - (side - (x1 - x0 + 1)) / 2;
  const oy = y0 - (side - (y1 - y0 + 1)) / 2;
  const cell = side / SIZE;
  return Array.from({ length: SIZE }, (_, j) =>
    Array.from({ length: SIZE }, (_, i) => {
      let hit = 0;
      let all = 0;
      for (let y = Math.floor(oy + j * cell); y < oy + (j + 1) * cell; y++) {
        for (let x = Math.floor(ox + i * cell); x < ox + (i + 1) * cell; x++) {
          all++;
          if (on(x, y)) hit++;
        }
      }
      return all && hit / all >= THRESHOLD ? '#' : '.';
    }).join(''),
  );
}

/**
 * Siegel-Motiv für eine Art (Standbild „idle“); unbekannte Art → null.
 * @param {string} species
 */
export function sealForSpecies(species) {
  const grid = SPECIES[species]?.frames?.idle?.[0]?.grid;
  return grid ? sealFromGrid(grid) : null;
}

import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { gridToRuns, gridToRects, frameMarkup, spriteSvg } from '../../../src/ui/companion/companion.js';
import { SPECIES } from '../../../src/ui/companion/sprites.js';

test('Läufe decken genau die sichtbaren Pixel ab', () => {
  const grid = SPECIES.elefant.frames.idle[0].grid;
  const runs = gridToRuns(grid);
  const painted = runs.reduce((s, r) => s + r.w, 0);
  const visible = grid.join('').replace(/\./g, '').length;
  assert.equal(painted, visible);
  for (const r of runs) assert.equal(grid[r.y].slice(r.x, r.x + r.w), r.key.repeat(r.w));
});

test('Rechtecke decken jedes sichtbare Pixel genau einmal ab', () => {
  for (const id of Object.keys(SPECIES)) {
    const grid = SPECIES[id].frames.proud[2].grid;
    const seen = grid.map((r) => [...r].map(() => 0));
    for (const r of gridToRects(grid)) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          assert.equal(grid[y][x], r.key, `${id}: falsche Farbe bei ${x},${y}`);
          seen[y][x]++;
        }
      }
    }
    grid.forEach((row, y) => [...row].forEach((c, x) => assert.equal(seen[y][x], c === '.' ? 0 : 1, `${id}: ${x},${y}`)));
  }
});

test('Markup füllt nur mit CSS-Variablen', () => {
  const svg = frameMarkup('elefant', SPECIES.elefant.frames.happy[2].grid);
  const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(fills.length > 20);
  for (const f of fills) assert.match(f, /^var\(--ng-(elefant|fx)-[a-z]\)$/);
});

test('spriteSvg liefert ein scharfes 32er-SVG und fällt bei Unbekanntem auf den Elefanten zurück', () => {
  const s = spriteSvg('einhorn', 'tanzt', 0, 64);
  assert.match(s, /viewBox="0 0 32 32"/);
  assert.match(s, /shape-rendering="crispEdges"/);
  assert.match(s, /--ng-elefant-/);
});

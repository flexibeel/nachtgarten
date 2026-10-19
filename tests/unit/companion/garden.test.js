import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGarden, gardenMarkup, gardenCss, seasonFor, GARDEN_W, GARDEN_H, GARDEN_KEYS, SEASONS } from '../../../src/ui/companion/garden.js';

const PLANT_KEYS = /[VUBL]/g;

test('Szene hat feste Größe in jeder Stufe und Jahreszeit', () => {
  for (const season of SEASONS) {
    for (let stage = 0; stage <= 4; stage++) {
      const { grid } = buildGarden({ stage, season });
      assert.equal(grid.length, GARDEN_H);
      for (const row of grid) assert.equal(row.length, GARDEN_W);
      for (const c of grid.join('')) assert.ok(c in GARDEN_KEYS, `unbekannte Farbe ${c}`);
    }
  }
});

test('der Garten wächst mit der Stufe', () => {
  let last = -1;
  for (let stage = 0; stage <= 4; stage++) {
    const n = (buildGarden({ stage, season: 'sommer' }).grid.join('').match(PLANT_KEYS) || []).length;
    assert.ok(n > last, `Stufe ${stage}: ${n} ≤ ${last}`);
    last = n;
  }
});

test('Stufe wird begrenzt, Glühwürmchen erst ab Stufe 3', () => {
  assert.deepEqual(buildGarden({ stage: 9 }).grid, buildGarden({ stage: 4 }).grid);
  assert.deepEqual(buildGarden({ stage: -2 }).grid, buildGarden({ stage: 0 }).grid);
  const flies = (s) => (buildGarden({ stage: s }).grid.join('').match(/F/g) || []).length;
  assert.equal(flies(2), flies(0));
  assert.ok(flies(4) > flies(3) && flies(3) > flies(2));
});

test('Markup nutzt nur Variablen, Funkeln ruht bei reduzierter Bewegung', () => {
  const svg = gardenMarkup({ stage: 4 });
  for (const m of svg.matchAll(/fill="([^"]+)"/g)) assert.match(m[1], /^var\(--ng-gd-[a-z0-9]+\)$/);
  assert.match(svg, /class="ng-twinkle"/);
  const css = gardenCss();
  assert.match(css, /prefers-reduced-motion: reduce\)\{\.ng-garden \.ng-twinkle\{animation:none\}/);
  assert.match(css, /\.ng-garden\[data-time="nacht"\]/);
});

test('Jahreszeit aus dem Datum', () => {
  assert.equal(seasonFor(new Date(2026, 9, 19)), 'herbst');
  assert.equal(seasonFor(new Date(2026, 0, 5)), 'winter');
  assert.equal(seasonFor(new Date(2026, 3, 1)), 'fruehling');
  assert.equal(seasonFor(new Date(2026, 6, 1)), 'sommer');
});

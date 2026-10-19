import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSIC_FALLBACK, CLASSIC_ROUTES, classicUrl } from '../../src/features/classic/classic.js';

const APP = 'https://flexibeel.github.io/nachtgarten/#feed';
const BETA = 'https://flexibeel.github.io/nachtgarten/beta/#mama';

test('klassische Version: aus der App, aus der Beta, mit Direktsprung', () => {
  assert.equal(classicUrl('feed', { base: 'klassisch/', href: APP }), 'https://flexibeel.github.io/nachtgarten/klassisch/#feed');
  assert.equal(classicUrl('mama', { base: '../klassisch/', href: BETA }), 'https://flexibeel.github.io/nachtgarten/klassisch/#mama');
  assert.equal(classicUrl(undefined, { base: 'klassisch/', href: APP }), 'https://flexibeel.github.io/nachtgarten/klassisch/');
});

test('klassische Version: unbekannte Sprünge entfallen, ohne Angabe gilt die feste Adresse', () => {
  assert.equal(classicUrl('irgendwas', { base: 'klassisch/', href: APP }), 'https://flexibeel.github.io/nachtgarten/klassisch/');
  assert.equal(classicUrl('kurz', { base: null, href: 'http://127.0.0.1:8000/' }), `${CLASSIC_FALLBACK}#kurz`);
});

test('jeder Direktsprung existiert in der klassischen Version (ROUTES in src/app.html)', () => {
  const source = readFileSync(new URL('../../src/app.html', import.meta.url), 'utf8');
  const routes = source.match(/const ROUTES=\{(.*)\};$/m)[1];
  for (const r of CLASSIC_ROUTES) assert.match(routes, new RegExp(`(^|[,{;])${r}:`), r);
});

test('index.html nennt den Ort der klassischen Version', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="ng-classic" content="klassisch\/">/);
});

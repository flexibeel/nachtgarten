import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MODULES, anyEnabled, moveTile, normalizeModules, orderTiles, sportTarget, toggleModule } from '../../src/domain/modules.js';
import { createStore, memoryAdapter } from '../../src/core/store.js';

const KNOWN = ['train', 'mama', 'habits', 'handy', 'ideen'];

test('Module normalisieren: bekannte Reihenfolge, Unbekanntes raus, leer/null → Standard', () => {
  assert.deepEqual(normalizeModules(['handy', 'train', 'quatsch', 'handy'], KNOWN), ['train', 'handy']);
  assert.deepEqual(normalizeModules(null, KNOWN), [...DEFAULT_MODULES]);
  assert.deepEqual(normalizeModules([], KNOWN), ['train', 'habits']);
  assert.deepEqual(normalizeModules(null, ['handy', 'ideen']), ['handy'], 'ohne Standard-Module: das erste');
});

test('Module umschalten: an, aus, das letzte bleibt', () => {
  assert.deepEqual(toggleModule(['train'], 'mama', KNOWN), ['train', 'mama']);
  assert.deepEqual(toggleModule(['train', 'mama'], 'train', KNOWN), ['mama']);
  assert.deepEqual(toggleModule(['mama'], 'mama', KNOWN), ['mama']);
  assert.deepEqual(toggleModule(['mama'], 'quit', KNOWN), ['mama'], 'unbekannte Module werden ignoriert');
  assert.equal(anyEnabled(['mama'], ['train', 'mama']), true);
  assert.equal(anyEnabled(['handy'], ['train', 'mama']), false);
});

test('Kacheln sortieren: gespeicherte Reihenfolge zuerst, neue an Standard-Position dahinter', () => {
  assert.deepEqual(orderTiles(['a', 'b', 'c'], []), ['a', 'b', 'c']);
  assert.deepEqual(orderTiles(['a', 'b', 'c'], ['c', 'a']), ['c', 'a', 'b']);
  assert.deepEqual(orderTiles(['a', 'b'], ['x', 'b', 'a']), ['b', 'a'], 'unsichtbare Einträge stören nicht');
});

test('Kachel verschieben merkt sich unsichtbare Kacheln', () => {
  assert.deepEqual(moveTile(['a', 'b', 'c'], [], 'c', -1), ['a', 'c', 'b']);
  assert.deepEqual(moveTile(['a', 'b', 'c'], [], 'a', -1), ['a', 'b', 'c'], 'oben bleibt oben');
  assert.deepEqual(moveTile(['a', 'b', 'c'], [], 'c', 1), ['a', 'b', 'c'], 'unten bleibt unten');
  assert.deepEqual(moveTile(['a', 'b'], ['x', 'b', 'a'], 'a', -1), ['a', 'b', 'x']);
});

test('Sport starten: Mama vor Training, sonst nichts', () => {
  assert.equal(sportTarget(['train']), 'live');
  assert.equal(sportTarget(['train', 'mama']), 'mama');
  assert.equal(sportTarget(['mama']), 'mama');
  assert.equal(sportTarget(['habits', 'handy']), null);
});

test('Einstellungen: Module und Kachel-Reihenfolge liegen in ng2.settings', () => {
  const adapter = memoryAdapter();
  const store = createStore(adapter);
  assert.equal(store.settings.get().enabledModules, null);
  assert.deepEqual(store.settings.get().tileOrder, []);
  store.settings.update((s) => ({ ...s, enabledModules: ['mama'], tileOrder: ['mama', 'sport'] }));
  const raw = JSON.parse(adapter.get('ng2.settings'));
  assert.deepEqual(raw.enabledModules, ['mama']);
  assert.deepEqual(raw.tileOrder, ['mama', 'sport']);
  // ältere Einstellungen ohne die neuen Felder bekommen die Standards
  const old = createStore(memoryAdapter({ 'ng2.settings': JSON.stringify({ theme: 'dark' }) }));
  assert.deepEqual(old.settings.get().tileOrder, []);
  assert.equal(old.settings.get().theme, 'dark');
});

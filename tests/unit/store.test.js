import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_NAMES, PREFIX, SCHEMA_VERSION, createStore, defaultOf, keyOf, localStorageAdapter, memoryAdapter,
} from '../../src/core/store.js';

/** Minimaler Storage-Ersatz wie im Browser. */
function fakeStorage(fail = false) {
  const data = {};
  const guard = () => {
    if (fail) throw new Error('SecurityError');
  };
  return Object.defineProperties(
    {},
    {
      getItem: { value: (k) => (guard(), k in data ? data[k] : null) },
      setItem: { value: (k, v) => (guard(), (data[k] = String(v))) },
      removeItem: { value: (k) => (guard(), delete data[k]) },
      key: { value: (i) => (guard(), Object.keys(data)[i] ?? null) },
      length: { get: () => (guard(), Object.keys(data).length) },
    },
  );
}

test('Standardwerte, wenn nichts gespeichert ist', () => {
  const store = createStore(memoryAdapter());
  assert.equal(store.profile.get(), null);
  assert.deepEqual(store.gear.get(), ['Körpergewicht']);
  assert.equal(store.settings.get().theme, 'system');
  assert.equal(store.meta.get().schema, SCHEMA_VERSION);
  assert.equal(store.profile.exists(), false);
});

test('Standardwerte werden nicht geteilt', () => {
  const store = createStore(memoryAdapter());
  store.gear.get().push('Kurzhanteln');
  assert.deepEqual(store.gear.get(), ['Körpergewicht']);
  assert.notEqual(defaultOf('settings'), defaultOf('settings'));
});

test('set/get/update/reset mit Präfix ng2.', () => {
  const adapter = memoryAdapter();
  const store = createStore(adapter);
  store.dump.set(['Milch kaufen']);
  assert.equal(adapter.get('ng2.dump'), '["Milch kaufen"]');
  const next = store.dump.update((d) => [...d, 'Oma anrufen']);
  assert.deepEqual(next, ['Milch kaufen', 'Oma anrufen']);
  store.dump.reset();
  assert.equal(adapter.get('ng2.dump'), null);
  assert.deepEqual(store.dump.get(), []);
  assert.equal(keyOf('dump'), `${PREFIX}dump`);
});

test('Objekt-Bereiche bekommen neue Felder aus dem Standard', () => {
  const store = createStore(memoryAdapter({ 'ng2.settings': '{"theme":"dark"}' }));
  const s = store.settings.get();
  assert.equal(s.theme, 'dark');
  assert.equal(s.restSeconds, 90);
  assert.equal(s.lockDuringTraining, true);
});

test('Kaputtes JSON oder falsche Form → Standard', () => {
  const store = createStore(memoryAdapter({ 'ng2.plans': '{kaputt', 'ng2.gear': '{"a":1}', 'ng2.habit': 'null' }));
  assert.deepEqual(store.plans.get(), []);
  assert.deepEqual(store.gear.get(), ['Körpergewicht']);
  assert.equal(store.habit.get().name, '');
});

test('exportAll enthält nur vorhandene Bereiche, importAll schreibt sie', () => {
  const a = createStore(memoryAdapter());
  a.motto.set('Weniger scrollen.');
  a.gear.set(['Bänder']);
  const data = a.exportAll();
  assert.deepEqual(Object.keys(data).sort(), ['gear', 'motto']);
  const b = createStore(memoryAdapter());
  b.importAll({ ...data, unbekannt: 1 });
  assert.equal(b.motto.get(), 'Weniger scrollen.');
  assert.deepEqual(b.gear.get(), ['Bänder']);
});

test('clearAll löscht nur v2, readLegacy liest nur v1', () => {
  const adapter = memoryAdapter({ 'lab.name': '"Felix"', 'ng2.motto': '"x"', fremd: '1' });
  const store = createStore(adapter);
  assert.deepEqual(store.readLegacy(), { 'lab.name': '"Felix"' });
  store.clearAll();
  assert.deepEqual(adapter.dump(), { 'lab.name': '"Felix"', fremd: '1' });
});

test('onChange meldet geänderte Bereiche', () => {
  const changed = [];
  const store = createStore(memoryAdapter(), { onChange: (a) => changed.push(a) });
  store.focus.set({ day: '2026-10-19', text: 'Lesen', done: false });
  store.focus.reset();
  assert.deepEqual(changed, ['focus', 'focus']);
});

test('jeder Bereich hat einen Standard', () => {
  for (const area of AREA_NAMES) assert.doesNotThrow(() => defaultOf(area), area);
  assert.ok(AREA_NAMES.length >= 20);
});

test('localStorage-Adapter liest und schreibt Strings', () => {
  const storage = fakeStorage();
  const adapter = localStorageAdapter(storage);
  adapter.set('ng2.x', '1');
  assert.equal(adapter.get('ng2.x'), '1');
  assert.deepEqual(adapter.keys(), ['ng2.x']);
  adapter.remove('ng2.x');
  assert.equal(adapter.get('ng2.x'), null);
});

test('localStorage-Adapter schluckt Fehler (Privatmodus)', () => {
  const adapter = localStorageAdapter(fakeStorage(true));
  assert.doesNotThrow(() => adapter.set('a', 'b'));
  assert.equal(adapter.get('a'), null);
  assert.doesNotThrow(() => adapter.remove('a'));
  assert.deepEqual(localStorageAdapter(null).keys(), []);
});

import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { REV_KEY, hasUserData, mirroredAdapter, needsSnapshot, planRestore, pruneSnapshots, readData, replaceData, revOf } from '../../src/core/durable.js';
import { createStore, memoryAdapter } from '../../src/core/store.js';

const PLAN = JSON.stringify([{ id: 'p', name: 'Oben', items: [{ exercise: 'bench', sets: 3, reps: '8' }] }]);

test('Abgleich: geleerter localStorage wird aus IndexedDB ergänzt und umgekehrt', () => {
  const full = { 'ng2.plans': PLAN, 'ng2.meta': '{}', [REV_KEY]: '7' };
  assert.equal(planRestore({}, full), 'fromMirror', 'localStorage leer → aus der Kopie');
  assert.equal(planRestore({ 'ng2.meta': '{}' }, full), 'fromMirror', 'nur Verwaltungsangaben zählen nicht als Daten');
  assert.equal(planRestore(full, {}), 'toMirror', 'Kopie leer → Kopie anlegen');
  assert.equal(planRestore({}, {}), 'none');
  assert.equal(planRestore(full, { ...full }), 'none', 'gleich → nichts tun');
  assert.equal(planRestore({ ...full, [REV_KEY]: '9', 'ng2.dump': '["x"]' }, full), 'toMirror', 'neuere lokale Daten gewinnen');
  assert.equal(planRestore({ ...full, [REV_KEY]: '3' }, full), 'fromMirror', 'neuere Kopie gewinnt');
  assert.equal(planRestore({ ...full, 'ng2.dump': '[]' }, full), 'toMirror', 'Gleichstand, aber anders → lokal maßgeblich');
  assert.equal(hasUserData({ 'ng2.meta': '{}', [REV_KEY]: '1', 'lab.x': '1' }), false);
  assert.equal(revOf({ [REV_KEY]: 'kaputt' }), 0);
});

test('Gespiegelter Adapter: jede Änderung an ng2.* geht mit, Revision steigt, v1 bleibt außen vor', () => {
  const primary = memoryAdapter({ 'lab.name': 'Lena' });
  /** @type {[string, string|null][]} */
  const sent = [];
  const adapter = mirroredAdapter(primary, { put: (k, v) => sent.push([k, v]) });
  const store = createStore(adapter);
  store.plans.set(JSON.parse(PLAN));
  store.dump.set(['Milch']);
  store.dump.reset();
  assert.equal(primary.get(REV_KEY), '3');
  assert.deepEqual(sent.filter(([k]) => k !== REV_KEY).map(([k, v]) => [k, v === null ? null : 'x']), [['ng2.plans', 'x'], ['ng2.dump', 'x'], ['ng2.dump', null]]);
  assert.deepEqual(sent.at(-1), [REV_KEY, '3']);
  adapter.set('lab.other', '1');
  assert.equal(sent.some(([k]) => k === 'lab.other'), false, 'v1-Schlüssel werden nie gespiegelt');
  assert.deepEqual(Object.keys(readData(primary)).sort(), ['ng2._rev', 'ng2.plans']);
});

test('Wiederherstellen: localStorage leeren, aus der Kopie zurückholen – der Plan ist wieder da', () => {
  const primary = memoryAdapter();
  const mirror = memoryAdapter();
  const adapter = mirroredAdapter(primary, { put: (k, v) => (v === null ? mirror.remove(k) : mirror.set(k, v)) });
  createStore(adapter).plans.set(JSON.parse(PLAN));
  for (const k of primary.keys()) primary.remove(k); // Browser räumt localStorage auf
  assert.equal(planRestore(readData(primary), readData(mirror)), 'fromMirror');
  replaceData(primary, readData(mirror));
  assert.equal(createStore(primary).plans.get()[0].name, 'Oben');
});

test('Tagesstände: einer pro Tag, die letzten fünf bleiben', () => {
  const days = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-18'].map((day) => ({ day }));
  assert.equal(needsSnapshot(days, '2026-10-18'), false);
  assert.equal(needsSnapshot(days, '2026-10-19'), true);
  assert.deepEqual(pruneSnapshots(days), ['2026-10-12']);
  assert.deepEqual(pruneSnapshots([...days, { day: '2026-10-19' }]), ['2026-10-13', '2026-10-12']);
  assert.deepEqual(pruneSnapshots([{ day: '2026-10-19' }]), []);
});

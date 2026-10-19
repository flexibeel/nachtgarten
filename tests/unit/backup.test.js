import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION, createStore, memoryAdapter } from '../../src/core/store.js';
import { BACKUP_VERSION, backupFilename, createBackup, parseBackup, restoreBackup } from '../../src/domain/backup.js';
import { v1Raw } from './helpers/v1-sample.js';
import { at } from './helpers/fixtures.js';

const NOW = at(2026, 10, 19, 21);

function filledStore() {
  const store = createStore(memoryAdapter({ 'lab.name': '"Felix"' }));
  store.profile.set({ name: 'Felix', goal: 'Kraft', age: null, weight: 80, days: 3 });
  store.sessions.set([{ id: 'a', date: '2026-10-19', kind: 'strength', planId: null, muscleSets: { chest: 3 }, setCount: 3 }]);
  store.motto.set('Ruhig bleiben.');
  store.live.set(null);
  return store;
}

test('Sicherung enthält Version, Schema, Zeitpunkt und alle vorhandenen Bereiche', () => {
  const b = createBackup(filledStore(), NOW);
  assert.equal(b.app, 'nachtgarten');
  assert.equal(b.version, BACKUP_VERSION);
  assert.equal(b.schema, SCHEMA_VERSION);
  assert.equal(b.created, new Date(NOW).toISOString());
  assert.deepEqual(Object.keys(b.data).sort(), ['live', 'motto', 'profile', 'sessions']);
  assert.equal(backupFilename('2026-10-19'), 'nachtgarten-sicherung-2026-10-19.json');
});

test('Rundreise: sichern, lesen, auf neuem Gerät einspielen', () => {
  const source = filledStore();
  const text = JSON.stringify(createBackup(source, NOW));
  const parsed = parseBackup(text);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.sourceVersion, 2);
  assert.equal(parsed.areas, 4);
  assert.equal(parsed.created.getTime(), NOW);

  const target = createStore(memoryAdapter({ 'ng2.dump': '["alt"]', 'lab.motto': '"v1 bleibt"' }));
  restoreBackup(target, parsed.data, NOW);
  assert.deepEqual(target.profile.get(), source.profile.get());
  assert.deepEqual(target.sessions.get(), source.sessions.get());
  assert.deepEqual(target.dump.get(), [], 'alte v2-Daten ersetzt');
  assert.equal(target.adapter.get('lab.motto'), '"v1 bleibt"', 'v1-Daten unberührt');
  assert.ok(target.meta.get().migratedFromV1, 'keine erneute v1-Übernahme');
});

test('v1-Sicherung wird übersetzt', () => {
  const v1 = { app: 'nachtgarten', version: 1, created: '2026-10-01T10:00:00.000Z', data: { ...v1Raw(), fremd: 'x', 'lab.kaputt': 5 } };
  const parsed = parseBackup(JSON.stringify(v1));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.sourceVersion, 1);
  assert.equal(parsed.data.profile.name, 'Felix');
  assert.equal(parsed.data.settings.theme, 'light');
  assert.ok(Array.isArray(parsed.data.sessions));
  const store = createStore(memoryAdapter());
  restoreBackup(store, parsed.data, NOW);
  assert.equal(store.buddy.get().tone, 'frech');
});

test('Fehler: kein JSON, fremde Datei, zu neu, beschädigt', () => {
  assert.deepEqual(parseBackup('kein json'), { ok: false, error: 'backup.notJson' });
  assert.deepEqual(parseBackup('[]'), { ok: false, error: 'backup.notNachtgarten' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'andere', version: 2, data: {} })), { ok: false, error: 'backup.notNachtgarten' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: 2 })), { ok: false, error: 'backup.notNachtgarten' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: 3, data: {} })), { ok: false, error: 'backup.tooNew' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: 2, schema: SCHEMA_VERSION + 1, data: {} })), { ok: false, error: 'backup.tooNew' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: '2', data: {} })), { ok: false, error: 'backup.tooNew' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: 2, data: { sessions: {} } })), { ok: false, error: 'backup.invalidData' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: 2, data: { settings: [] } })), { ok: false, error: 'backup.invalidData' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: 2, data: { motto: 5 } })), { ok: false, error: 'backup.invalidData' });
  assert.deepEqual(parseBackup(JSON.stringify({ app: 'nachtgarten', version: 2, data: { profile: 'x' } })), { ok: false, error: 'backup.invalidData' });
});

test('unbekannte Bereiche werden ignoriert, null ist erlaubt wo vorgesehen, Datum optional', () => {
  const parsed = parseBackup(JSON.stringify({ app: 'nachtgarten', version: 2, data: { zukunft: 1, live: null, motto: null, gear: [] } }));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.data, { live: null, motto: null, gear: [] });
  assert.equal(parsed.created, null);
});

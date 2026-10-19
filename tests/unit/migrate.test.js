import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, memoryAdapter } from '../../src/core/store.js';
import { LEGACY_KEYS, convertV1, migrateFromV1 } from '../../src/domain/migrate.js';
import { weekReview } from '../../src/domain/week.js';
import { LIVE_START, V1_VALUES, v1Raw } from './helpers/v1-sample.js';
import { at } from './helpers/fixtures.js';

const NOW = at(2026, 10, 19, 20, 0);

test('jeder v1-Schlüssel aus src/app.html ist zugeordnet', () => {
  const source = readFileSync(new URL('../../src/app.html', import.meta.url), 'utf8');
  const used = new Set(source.match(/"lab\.[A-Za-z0-9]+"/g).map((k) => k.slice(1, -1)));
  const missing = [...used].filter((k) => !(k in LEGACY_KEYS));
  assert.deepEqual(missing, []);
  assert.ok(used.size >= 40, `nur ${used.size} Schlüssel gefunden`);
});

test('Profil und Einstellungen', () => {
  const d = convertV1(v1Raw());
  assert.deepEqual(d.profile, {
    name: 'Felix', goal: 'Muskelaufbau', age: 34, weight: null, days: 4, companion: { species: 'keimling', name: 'Keimi' },
  });
  assert.deepEqual(d.settings, {
    theme: 'light', view: 'profi', startView: 'live', restSeconds: 120, timeTracking: true, lockDuringTraining: false,
    enabledModules: ['train', 'handy', 'mama', 'habits'], tileOrder: [],
  });
  assert.deepEqual(d.gear, V1_VALUES['lab.gear']);
});

test('Theme als JSON-String wird ebenfalls gelesen', () => {
  const d = convertV1({ 'lab.theme': '"dark"' });
  assert.equal(d.settings.theme, 'dark');
  assert.equal(d.settings.lockDuringTraining, true);
});

test('Pläne und Wochenplan', () => {
  const d = convertV1(v1Raw());
  assert.deepEqual(d.plans, [
    { id: 'ok', name: 'Oberkörper', example: true, items: [{ exercise: 'bench', sets: 3, reps: '8–10' }, { exercise: 'row1', sets: 3, reps: '10' }] },
    { id: 'p1760000000000', name: 'Push', items: [{ exercise: 'chestpress', sets: 4, reps: '10' }, { exercise: 'k_ropepush', sets: 3, reps: '12' }] },
  ]);
  assert.deepEqual(d.schedule, {
    0: { kind: 'plan', id: 'ok' }, 2: { kind: 'plan', id: 'p1760000000000' }, 4: { kind: 'activity', id: 'run' },
  });
});

test('Trainingsprotokoll: Arten, echte Satzzahl, Messwerte, Beispiel entfällt, sortiert', () => {
  const { sessions } = convertV1(v1Raw());
  assert.deepEqual(sessions.map((s) => s.date), ['2026-10-11', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
  const [auto, plan, live, run, home] = sessions;
  assert.equal(auto.kind, 'strength');
  assert.equal(auto.planId, 'p1760000000000');
  assert.equal(auto.setCount, 7);
  assert.equal(auto.autoFinished, true);
  assert.deepEqual(auto.exercises, ['chestpress', 'k_ropepush']);
  assert.equal('metrics' in auto, false, 'leere Messwerte entfallen');
  assert.equal(plan.setCount, 3);
  assert.equal(plan.name, 'Oberkörper');
  assert.equal(live.planId, null);
  assert.equal(live.live, true);
  assert.equal(live.setCount, 4, 'ohne n: gerundete gewichtete Summe wie in v1');
  assert.deepEqual({ kind: run.kind, planId: run.planId, setCount: run.setCount, durationMin: run.durationMin, km: run.km, rpe: run.rpe }, {
    kind: 'activity', planId: 'run', setCount: 0, durationMin: 35, km: 6.2, rpe: 6,
  });
  assert.deepEqual(run.metrics, { Blutzucker: { before: '110', after: '92', timeBefore: '18:01', timeAfter: '18:50' } });
  assert.deepEqual({ kind: home.kind, planId: home.planId }, { kind: 'homeplan', planId: 'b1' });
  assert.equal(new Set(sessions.map((s) => s.id)).size, sessions.length);
});

test('Verlauf, Live-Training, Bestleistungen', () => {
  const d = convertV1(v1Raw());
  assert.deepEqual(d.history.bench, [
    { date: '2026-10-13', weight: 60, reps: 10, rir: null, session: null },
    { date: '2026-10-19', weight: 62.5, reps: 9, rir: 2, session: LIVE_START },
  ]);
  assert.equal(d.history.chestpress.length, 1, 'ungültige Einträge entfallen');
  assert.equal('leer' in d.history, false);
  assert.equal(d.live.start, LIVE_START);
  assert.deepEqual(d.live.sets[1], { exercise: 'k_row', weight: 40, reps: 12, rir: null, at: LIVE_START + 600000, attachment: 'V-Griff', height: 'mittel' });
  assert.equal(d.live.form, 'high');
  assert.deepEqual(d.live.queue, { planId: 'ok', name: 'Oberkörper', items: [{ exercise: 'bench', sets: 3, reps: '8–10' }, { exercise: 'row1', sets: 3, reps: '10' }], index: 1 });
  assert.deepEqual(d.live.metrics, { Puls: { before: '64', after: null, timeBefore: '17:39', timeAfter: null } });
  assert.equal(d.live.legHintDismissed, true);
  assert.equal('_budEnd' in d.live, false);
  assert.deepEqual(d.prs[0], { date: '2026-10-19', exercise: 'bench', weight: 62.5, reps: 9, session: LIVE_START });
  assert.equal(d.prs[1].session, null);
});

test('Übungen: eigene, Favoriten, Einstellungen je Übung', () => {
  const { exercises } = convertV1(v1Raw());
  assert.deepEqual(exercises.custom, [
    { id: 'c1759000000000', name: 'Glute-Maschine Studio', gear: 'Eigenes', muscles: ['glutes'], source: 'custom' },
    { id: 'db12', name: 'Alternate Hammer Curl', gear: 'Kurzhanteln', muscles: ['biceps', 'forearms'], source: 'db' },
  ]);
  assert.deepEqual(exercises.favorites, ['latpull', 'chestpress', 'press', 'c1759000000000']);
  assert.deepEqual(exercises.prefs, {
    chestpress: { step: 5 }, lat: { step: 1 }, bench: { repRange: [6, 10] }, k_row: { attachment: 'V-Griff', height: 'mittel' },
  });
  assert.equal(exercises.lastRir, 2);
});

test('Heute-Bereich: Gewohnheit, Fokus, Abladen, Feed, Menschen, Motto, Ideen', () => {
  const d = convertV1(v1Raw());
  assert.deepEqual(d.habit, { name: '10 Min. lesen', anchor: 'nach dem Frühstück', days: { '2026-10-18': true, '2026-10-19': true } });
  assert.deepEqual(d.focus, { day: '2026-10-19', text: 'Exposé fertig', done: false });
  assert.deepEqual(d.dump, ['Oma anrufen', 'Laufschuhe']);
  assert.equal(d.feed.items.length, 2);
  assert.deepEqual(d.feed.items[1], { title: 'Podcast über Langeweile', source: 'Gespeichert', tag: 'Gespeichert', read: false });
  assert.deepEqual(d.feed.queue, [{ title: 'Rezept Linsencurry', source: 'Gespeichert' }]);
  assert.equal(d.feed.day, '2026-10-19');
  assert.equal(d.feed.readDay, '2026-10-19');
  assert.deepEqual(d.people, [{ name: 'Tim', lastContact: '2026-09-07', example: true }, { name: 'Mama', lastContact: '2026-10-17' }]);
  assert.equal(d.motto, 'Weniger scrollen, mehr erleben.');
  assert.deepEqual(d.ideas, { likes: ['feed', 'gate', 'training'] });
});

test('Zeitkonto, Umlenkungen, Keimi, Schwangerschaft, Messwerte, Abschluss-Karte', () => {
  const d = convertV1(v1Raw());
  assert.deepEqual(d.account.days['2026-10-18'], { tries: 4, redirects: 2, used: 10, earned: 10, earnKeys: ['kontakt0', 'kontakt1'] });
  assert.equal(d.account.unlock.until, V1_VALUES['lab.igUnlock'].until);
  assert.deepEqual(d.redirects, { '2026-10-12': 3, '2026-10-19': 2 });
  assert.deepEqual(d.buddy, { tone: 'frech', on: true, maxStage: 3, lastVisit: '2026-10-19', backDay: '2026-10-10', backShown: true });
  assert.deepEqual(d.mama, { mode: 'post', date: '2026-08-01', cesarean: true, seenPhase: 'pp1', safetyOk: true, check6: true, check12: false });
  assert.deepEqual(d.metrics, [{ name: 'Blutzucker', unit: 'mg/dl', lo: 70, hi: 180 }, { name: 'Puls', unit: '' }]);
  assert.equal(d.lastCard.volume, 3150);
  assert.deepEqual(d.lastCard.items[0], { name: 'Brustpresse', gear: 'Maschinen', sets: [{ weight: 45, reps: 10 }], pr: true });
  assert.equal('hr' in d.lastCard, false);
});

test('Sonderfälle: Name "du", alte Schwerpunkte im Fokus-Feld, Beispielkarte, kaputtes JSON', () => {
  const d = convertV1({
    'lab.profile': JSON.stringify({ name: 'du', goal: 'Unbekannt', age: '', weight: '72', days: 12 }),
    'lab.focus': JSON.stringify(['train']),
    'lab.lastCard': JSON.stringify({ title: 'Oberkörper', sample: true }),
    'lab.plans': '{kaputt',
    'lab.tlog': '"kein Array"',
  });
  assert.deepEqual(d.profile, { name: '', goal: '', age: null, weight: 72, days: 7, companion: { species: 'keimling', name: 'Keimi' } });
  assert.deepEqual(d.settings.enabledModules, ['train', 'habits']);
  assert.equal('focus' in d, false);
  assert.equal('lastCard' in d, false);
  assert.equal('plans' in d, false);
  assert.equal('sessions' in d, false);
});

test('nur vorhandene Bereiche, leere v1-Daten → leeres Ergebnis', () => {
  assert.deepEqual(convertV1({}), {});
  assert.deepEqual(Object.keys(convertV1({ 'lab.dump': '["a"]' })), ['dump']);
});

test('migrateFromV1: schreibt v2, lässt v1 unverändert, läuft nur einmal', () => {
  const raw = v1Raw();
  const adapter = memoryAdapter(raw);
  const store = createStore(adapter);
  const r = migrateFromV1(store, { now: NOW });
  assert.equal(r.status, 'done');
  assert.ok(r.areas.includes('sessions') && r.areas.includes('mama'));
  for (const [k, v] of Object.entries(raw)) assert.equal(adapter.get(k), v, `${k} unverändert`);
  assert.equal(store.meta.get().migratedFromV1, new Date(NOW).toISOString());
  assert.equal(store.profile.get().name, 'Felix');

  // Änderungen in v2 bleiben bei erneutem Lauf erhalten
  store.motto.set('Neu in v2');
  assert.deepEqual(migrateFromV1(store, { now: NOW + 1000 }), { status: 'already' });
  assert.equal(store.motto.get(), 'Neu in v2');
});

test('migrateFromV1 überschreibt keine vorhandenen v2-Bereiche', () => {
  const store = createStore(memoryAdapter({ ...v1Raw(), 'ng2.motto': '"schon da"' }));
  const r = migrateFromV1(store, { now: NOW });
  assert.equal(r.areas.includes('motto'), false);
  assert.equal(store.motto.get(), 'schon da');
});

test('migrateFromV1 ohne v1-Daten legt nur meta an', () => {
  const store = createStore(memoryAdapter());
  assert.deepEqual(migrateFromV1(store, { now: NOW }), { status: 'nothing' });
  assert.equal(store.meta.get().createdAt, new Date(NOW).toISOString());
  assert.equal(store.meta.get().migratedFromV1, null);
});

test('übernommene Daten funktionieren mit der Domain-Logik', () => {
  const store = createStore(memoryAdapter(v1Raw()));
  migrateFromV1(store, { now: NOW });
  const review = weekReview({
    sessions: store.sessions.get(), prs: store.prs.get(), profile: store.profile.get(), schedule: store.schedule.get(), now: at(2026, 10, 16, 20),
  });
  assert.equal(review.units, 4);
  assert.equal(review.goal, 4);
  assert.equal(review.sets, 7);
  assert.equal(review.activities.km, 6.2);
  assert.equal(review.comparison.mode, 'sameWeekday');
});

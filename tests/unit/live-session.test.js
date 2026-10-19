import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialUi, liveReducer, nextQueueExercise, prefill, queueFromPlan, queueProgress, restLeft, restProgress, setsDone, MAX_REST } from '../../src/domain/live-session.js';
import { startLive } from '../../src/domain/training.js';
import { categoryOf, filterExercises, matches, toggleFavorite } from '../../src/domain/library.js';

test('Reducer: Übung wählen, Werte begrenzen, Reserve an/aus', () => {
  let s = liveReducer(initialUi(), { type: 'select', exercise: 'bench', weight: 40, reps: 8 });
  assert.deepEqual([s.exercise, s.weight, s.reps], ['bench', 40, 8]);
  s = liveReducer(s, { type: 'weight', value: -5 });
  assert.equal(s.weight, 0);
  s = liveReducer(s, { type: 'reps', value: 140 });
  assert.equal(s.reps, 100);
  s = liveReducer(s, { type: 'rir', value: 2 });
  assert.equal(s.rir, 2);
  s = liveReducer(s, { type: 'rir', value: 2 });
  assert.equal(s.rir, null, 'erneut tippen hebt auf');
  assert.equal(liveReducer(s, { type: 'unbekannt' }), s);
});

test('Pause: zeitstempelbasiert, verlängern, überspringen', () => {
  let s = liveReducer(initialUi(), { type: 'logged', at: 1_000_000, restSeconds: 90 });
  assert.deepEqual(s.rest, { start: 1_000_000, duration: 90 });
  assert.equal(restLeft(s.rest, 1_000_000), 90);
  assert.equal(restLeft(s.rest, 1_000_000 + 30_500), 60, 'aufgerundet');
  assert.equal(restLeft(s.rest, 1_000_000 + 200_000), 0);
  assert.equal(restProgress(s.rest, 1_000_000 + 45_000), 0.5);
  s = liveReducer(s, { type: 'restAdd' });
  assert.equal(s.rest.duration, 120);
  s = liveReducer(s, { type: 'restAdd', seconds: 9999 });
  assert.equal(s.rest.duration, MAX_REST);
  s = liveReducer(s, { type: 'restSkip' });
  assert.equal(s.rest, null);
  assert.equal(restLeft(null, 5), 0);
  assert.equal(liveReducer(initialUi(), { type: 'logged', at: 1, restSeconds: 0 }).rest, null);
});

test('Vorbelegung: Verlauf, Gerät, Plan-Soll, Tagesform', () => {
  const history = [{ date: '2026-10-12', weight: 40, reps: 10, rir: 2 }];
  assert.deepEqual(prefill({ history, gear: 'Langhantel' }), { weight: 40, reps: 10 });
  assert.deepEqual(prefill({ history: [], gear: 'Langhantel', goal: 'Kraft' }), { weight: 20, reps: 3 });
  assert.deepEqual(prefill({ history: [], gear: 'Kurzhanteln', target: '8–12' }), { weight: 5, reps: 8 });
  assert.deepEqual(prefill({ history: [], gear: 'Körpergewicht' }), { weight: 0, reps: 8 });
  assert.equal(prefill({ history, gear: 'Langhantel', form: 'low' }).weight, 35);
});

test('Plan-Warteschlange: nächste offene Übung, Fortschritt', () => {
  const plan = { id: 'p', name: 'Oben', items: [{ exercise: 'a', sets: 2, reps: '8' }, { exercise: 'b', sets: 1, reps: '10' }] };
  const live = { ...startLive(0), queue: queueFromPlan(plan) };
  assert.equal(nextQueueExercise(live, null), 'a');
  live.sets = [{ exercise: 'a', weight: 1, reps: 8, rir: null, at: 1 }, { exercise: 'a', weight: 1, reps: 8, rir: null, at: 2 }];
  assert.equal(setsDone(live, 'a'), 2);
  assert.equal(nextQueueExercise(live, 'a'), 'b');
  assert.deepEqual(queueProgress(live), { done: 2, total: 3 });
  live.sets.push({ exercise: 'b', weight: 1, reps: 10, rir: null, at: 3 }, { exercise: 'b', weight: 1, reps: 10, rir: null, at: 4 });
  assert.equal(nextQueueExercise(live, 'b'), null);
  assert.deepEqual(queueProgress(live), { done: 3, total: 3 }, 'mehr als das Soll zählt nicht doppelt');
  assert.equal(nextQueueExercise(startLive(0), null), null);
});

test('Bibliothek: Kategorien, Suche deutsch/englisch, Favoriten zuerst', () => {
  assert.equal(categoryOf({ muscles: ['chest', 'triceps'] }), 'push');
  assert.equal(categoryOf({ muscles: ['shoulders', 'back'] }), 'pull');
  assert.equal(categoryOf({ muscles: ['lowerback', 'hams', 'glutes', 'back'] }), 'full');
  assert.equal(categoryOf({ muscles: ['glutes'] }), 'glutes');
  assert.equal(categoryOf({ muscles: ['abs'] }), 'core');
  assert.equal(categoryOf({ muscles: ['biceps'] }), 'arms');
  assert.equal(categoryOf({ muscles: ['calves'] }), 'legs');
  const ex = { name: 'Trizepsdrücken mit Seil', gear: 'Kabelzug', attachment: 'Seil', muscles: ['triceps'] };
  assert.ok(matches(ex, 'rope'));
  assert.ok(matches(ex, 'trizeps seil'));
  assert.ok(matches(ex, 'TRIZEPSDRUCKEN'));
  assert.ok(!matches(ex, 'squat'));
  const list = [
    { id: 'a', name: 'A', gear: 'Langhantel', muscles: ['chest'] },
    { id: 'b', name: 'B', gear: 'Kabelzug', muscles: ['back'], pop: true },
    { id: 'c', name: 'C', gear: 'Eigenes', muscles: ['chest'] },
  ];
  assert.deepEqual(filterExercises(list, { favorites: ['c'] }).map((e) => e.id), ['c', 'b', 'a']);
  assert.deepEqual(filterExercises(list, { category: 'push' }).map((e) => e.id), ['a', 'c']);
  assert.deepEqual(filterExercises(list, { gear: 'Sonstiges' }).map((e) => e.id), ['c']);
  assert.deepEqual(filterExercises(list, { onlyFavorites: true, favorites: ['a'] }).map((e) => e.id), ['a']);
  assert.deepEqual(toggleFavorite(['a'], 'a'), []);
  assert.deepEqual(toggleFavorite([], 'a'), ['a']);
});

import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_MINUTES, HISTORY_DAYS, balance, dayOf, earn, endUnlock, isTrainingLocked, recentDays, recordRedirect, recordTry, take,
  takeOptions, unlockMinutesLeft, withToday,
} from '../../src/domain/account.js';
import { AUTO_FINISH_MS, startLive } from '../../src/domain/training.js';
import { at } from './helpers/fixtures.js';

const TODAY = '2026-10-19';
const empty = () => ({ days: {}, unlock: null });

test('Grundzeit 15 Minuten, auch ohne Eintrag', () => {
  assert.equal(balance(empty(), TODAY), BASE_MINUTES);
  assert.deepEqual(dayOf(empty(), TODAY), { tries: 0, redirects: 0, used: 0, earned: 0, earnKeys: [] });
});

test('Training verdient einmal am Tag 15 Minuten', () => {
  let r = earn(empty(), TODAY, 'training');
  assert.equal(r.minutes, 15);
  assert.equal(balance(r.state, TODAY), 30);
  r = earn(r.state, TODAY, 'training');
  assert.equal(r.minutes, 0);
  assert.equal(balance(r.state, TODAY), 30);
  const tomorrow = earn(r.state, '2026-10-20', 'training');
  assert.equal(tomorrow.minutes, 15);
});

test('Kontakt: dreimal am Tag +5, mit eigenen Schlüsseln', () => {
  let s = empty();
  const got = [];
  for (let i = 0; i < 5; i++) {
    const r = recordRedirect(s, TODAY);
    s = r.state;
    got.push(r.minutes);
  }
  assert.deepEqual(got, [5, 5, 5, 0, 0]);
  assert.equal(dayOf(s, TODAY).redirects, 5);
  assert.deepEqual(dayOf(s, TODAY).earnKeys, ['kontakt0', 'kontakt1', 'kontakt2']);
  assert.equal(balance(s, TODAY), 30);
});

test('Feed-Gutschrift unabhängig von anderen', () => {
  let s = earn(empty(), TODAY, 'feed').state;
  s = earn(s, TODAY, 'training').state;
  s = earn(s, TODAY, 'feed').state;
  assert.equal(dayOf(s, TODAY).earned, 20);
});

test('Versuche zählen, Zustand bleibt unverändert (rein)', () => {
  const s0 = empty();
  const s1 = recordTry(recordTry(s0, TODAY), TODAY);
  assert.equal(dayOf(s1, TODAY).tries, 2);
  assert.deepEqual(s0, empty());
});

test('Zeit nehmen öffnet Freigabe, Rest wird aufgerundet', () => {
  const now = at(2026, 10, 19, 20);
  const s = take(empty(), TODAY, 10, now);
  assert.equal(balance(s, TODAY), 5);
  assert.equal(s.unlock.until, now + 600_000);
  assert.equal(unlockMinutesLeft(s, now + 1), 10);
  assert.equal(unlockMinutesLeft(s, now + 9 * 60_000 + 1), 1);
  assert.equal(unlockMinutesLeft(s, now + 600_000), 0);
  assert.equal(unlockMinutesLeft(empty(), now), 0);
  assert.throws(() => take(s, TODAY, 10, now), RangeError);
  assert.throws(() => take(s, TODAY, 0, now), RangeError);
});

test('Freigabe vorzeitig beenden schreibt volle Restminuten gut', () => {
  const now = at(2026, 10, 19, 20);
  const s = take(empty(), TODAY, 15, now);
  const ended = endUnlock(s, now + 4.5 * 60_000);
  assert.equal(ended.unlock, null);
  assert.equal(dayOf(ended, TODAY).used, 5, '10 volle Minuten zurück');
  assert.equal(endUnlock(ended, now), ended);
  const late = endUnlock(s, now + 20 * 60_000);
  assert.equal(dayOf(late, TODAY).used, 15);
});

test('Auswahl beim Zeit-Nehmen', () => {
  assert.deepEqual(takeOptions(30), [5, 10, 15]);
  assert.deepEqual(takeOptions(12), [5, 10]);
  assert.deepEqual(takeOptions(3), [3]);
  assert.deepEqual(takeOptions(0), []);
});

test('Verlauf wird auf 30 Tage gekürzt', () => {
  let s = empty();
  const keys = [];
  for (let i = 0; i < 40; i++) keys.push(new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10));
  for (const k of keys) s = recordTry(s, k);
  assert.equal(Object.keys(s.days).length, HISTORY_DAYS);
  assert.equal(Object.keys(s.days).sort()[0], keys[10]);
  assert.ok(withToday(s, keys.at(-1)).days[keys.at(-1)]);
});

test('Trainingssperre: nur mit laufendem Training unter 3 Stunden und eingeschalteter Sperre', () => {
  const t0 = at(2026, 10, 19, 18);
  const live = startLive(t0);
  assert.equal(isTrainingLocked({ live, lockDuringTraining: true, now: t0 + 1000 }), true);
  assert.equal(isTrainingLocked({ live, lockDuringTraining: false, now: t0 + 1000 }), false);
  assert.equal(isTrainingLocked({ live: null, lockDuringTraining: true, now: t0 }), false);
  assert.equal(isTrainingLocked({ live, lockDuringTraining: true, now: t0 + AUTO_FINISH_MS }), false);
  const withSet = { ...live, sets: [{ exercise: 'bench', weight: 60, reps: 8, rir: null, at: t0 + 2 * 3_600_000 }] };
  assert.equal(isTrainingLocked({ live: withSet, lockDuringTraining: true, now: t0 + AUTO_FINISH_MS + 1 }), true);
});

test('recentDays füllt fehlende Tage mit Nullen', () => {
  const s = recordTry(empty(), '2026-10-18');
  const days = recentDays(s, ['2026-10-17', '2026-10-18']);
  assert.deepEqual(days.map((d) => [d.key, d.tries]), [['2026-10-17', 0], ['2026-10-18', 1]]);
});

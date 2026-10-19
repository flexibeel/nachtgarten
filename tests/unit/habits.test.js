import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ANCHORS, anchorSentence, habitMessage, toggleDay, weekDots } from '../../src/domain/habits.js';
import { at } from './helpers/fixtures.js';

const habit = (days = {}, extra = {}) => ({ name: '10 Min. lesen', anchor: null, days, ...extra });
const WED = at(2026, 10, 21, 9);

test('Wochenpunkte Mo–So mit heute und Zukunft', () => {
  const dots = weekDots(habit({ '2026-10-19': true }), WED);
  assert.equal(dots.length, 7);
  assert.deepEqual(dots.map((d) => d.label), ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
  assert.equal(dots[0].done, true);
  assert.equal(dots[2].today, true);
  assert.deepEqual(dots.map((d) => d.future), [false, false, false, true, true, true, true]);
});

test('Wochenpunkte in der Woche mit Jahreswechsel', () => {
  const dots = weekDots(habit({ '2027-01-01': true }), at(2027, 1, 3, 10));
  assert.equal(dots[0].key, '2026-12-28');
  assert.equal(dots[4].done, true);
  assert.equal(dots[6].today, true);
});

test('toggleDay: an/aus, Zukunft gesperrt, rein', () => {
  const h = habit();
  const on = toggleDay(h, '2026-10-21', WED);
  assert.deepEqual(on.days, { '2026-10-21': true });
  assert.deepEqual(h.days, {});
  assert.deepEqual(toggleDay(on, '2026-10-21', WED).days, {});
  assert.equal(toggleDay(h, '2026-10-22', WED), h);
});

test('Hinweise: leer und Zähler', () => {
  assert.deepEqual(habitMessage(habit(), WED), { key: 'habit.empty' });
  assert.deepEqual(habitMessage(habit({ '2026-10-19': true, '2026-10-20': true, '2026-10-21': true }), WED), { key: 'habit.count', params: { count: 3 } });
});

test('nie zweimal verpassen', () => {
  // heute ja, gestern nein → Comeback
  assert.equal(habitMessage(habit({ '2026-10-21': true, '2026-10-19': true }), WED).key, 'habit.comeback');
  // heute nein, gestern nein, vorgestern ja → gestern Pause
  assert.equal(habitMessage(habit({ '2026-10-19': true }), WED).key, 'habit.missedYesterday');
  // drei Tage nichts → Mini-Neustart
  assert.equal(habitMessage(habit({ '2026-10-10': true }), WED).key, 'habit.restart');
  // heute nein, gestern ja → normaler Zähler
  assert.deepEqual(habitMessage(habit({ '2026-10-20': true }), WED), { key: 'habit.count', params: { count: 1 } });
});

test('nie zweimal verpassen über die Wochengrenze (Montag)', () => {
  const monday = at(2026, 10, 26, 9);
  assert.equal(habitMessage(habit({ '2026-10-24': true }), monday).key, 'habit.missedYesterday');
  // Zähler gilt nur für die neue Woche
  assert.deepEqual(habitMessage(habit({ '2026-10-25': true }), monday), { key: 'habit.empty' });
});

test('Anker-Satz', () => {
  assert.equal(anchorSentence(habit()), null);
  assert.equal(anchorSentence(habit({}, { anchor: '  ' })), null);
  assert.equal(anchorSentence(habit({}, { anchor: 'nach dem Frühstück' })), 'Nach dem Frühstück: 10 Min. lesen');
  assert.equal(anchorSentence(habit({}, { anchor: 'vor dem Schlafengehen', name: 'Dehnen...' })), 'Vor dem Schlafengehen: Dehnen');
  assert.equal(ANCHORS.length, 6);
});

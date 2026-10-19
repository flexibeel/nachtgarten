import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, dateKey, daysBetween, isDateKey, lastWeekDates, monday, parseKey, todayIdx, toDate, weekDates, weekdayIdx,
} from '../../src/core/dates.js';
import { at } from './helpers/fixtures.js';

test('dateKey nutzt lokale Zeit, auch kurz nach Mitternacht', () => {
  assert.equal(dateKey(at(2026, 10, 19, 0, 5)), '2026-10-19');
  assert.equal(dateKey(at(2026, 10, 19, 23, 59)), '2026-10-19');
  assert.equal(dateKey(new Date(2026, 0, 1)), '2026-01-01');
});

test('toDate kopiert Date-Objekte und akzeptiert Millisekunden', () => {
  const d = new Date(2026, 4, 5);
  const copy = toDate(d);
  assert.notEqual(copy, d);
  assert.equal(copy.getTime(), d.getTime());
  assert.equal(toDate(0).getTime(), 0);
});

test('isDateKey prüft Form und Kalender', () => {
  assert.ok(isDateKey('2024-02-29'));
  assert.ok(!isDateKey('2025-02-29'));
  assert.ok(!isDateKey('2026-13-01'));
  assert.ok(!isDateKey('2026-1-01'));
  assert.ok(!isDateKey(''));
  assert.ok(!isDateKey(null));
  assert.throws(() => parseKey('kaputt'), RangeError);
  assert.deepEqual(parseKey('2026-10-19'), { year: 2026, month: 10, day: 19 });
});

test('addDays über Monats-, Jahres- und Schaltjahrgrenzen', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDays('2025-02-28', 1), '2025-03-01');
  assert.equal(addDays('2024-02-29', 365), '2025-02-28');
  assert.equal(addDays('2026-10-19', 0), '2026-10-19');
});

test('addDays und daysBetween sind gegen Zeitumstellung immun', () => {
  // Sommerzeit-Beginn 29.03.2026, Ende 25.10.2026 (Europe/Berlin)
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(daysBetween('2026-10-26', '2026-10-24'), -2);
});

test('daysBetween zählt Schalttage', () => {
  assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2);
  assert.equal(daysBetween('2025-02-28', '2025-03-01'), 1);
  assert.equal(daysBetween('2026-01-01', '2027-01-01'), 365);
  assert.equal(daysBetween('2024-01-01', '2025-01-01'), 366);
});

test('weekdayIdx und todayIdx: Montag = 0, Sonntag = 6', () => {
  assert.equal(weekdayIdx('2026-10-19'), 0);
  assert.equal(weekdayIdx('2026-10-25'), 6);
  assert.equal(weekdayIdx('1970-01-01'), 3);
  assert.equal(weekdayIdx('1969-12-29'), 0);
  assert.equal(todayIdx(at(2026, 10, 25, 23, 30)), 6);
  assert.equal(todayIdx(at(2026, 10, 26, 0, 30)), 0);
});

test('monday und weekDates in der Woche der Zeitumstellung (Herbst)', () => {
  const sundayNight = at(2026, 10, 25, 23, 30);
  assert.equal(monday(sundayNight), '2026-10-19');
  assert.deepEqual(weekDates(sundayNight), [
    '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
  ]);
  // Sonntag 02:30 gibt es zweimal – beides gehört zur selben Woche
  assert.equal(monday(at(2026, 10, 25, 2, 30)), '2026-10-19');
  assert.equal(monday(at(2026, 10, 26, 0, 1)), '2026-10-26');
});

test('weekDates in der Woche der Zeitumstellung (Frühjahr)', () => {
  const ds = weekDates(at(2026, 3, 29, 3, 30));
  assert.equal(ds[0], '2026-03-23');
  assert.equal(ds[6], '2026-03-29');
  assert.equal(new Set(ds).size, 7);
});

test('weekDates über den Jahreswechsel', () => {
  assert.deepEqual(weekDates('2026-12-31'), [
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
  ]);
  assert.equal(monday('2021-01-01'), '2020-12-28');
  assert.equal(monday(at(2027, 1, 3, 23, 59)), '2026-12-28');
});

test('weekDates mit Schalttag', () => {
  assert.ok(weekDates('2024-02-29').includes('2024-02-29'));
  assert.equal(monday('2024-03-01'), '2024-02-26');
});

test('lastWeekDates ist genau eine Woche früher', () => {
  const ds = lastWeekDates(at(2027, 1, 2));
  assert.equal(ds[0], '2026-12-21');
  assert.equal(ds[6], '2026-12-27');
});

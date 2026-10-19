import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WEEK_GOAL, defaultSchedule, muscleVolume, todayPlan, volumeReport, volumeStatus, weekGoal, weekReview, weekRing,
} from '../../src/domain/week.js';
import { at } from './helpers/fixtures.js';

const session = (date, extra = {}) => ({
  id: `s-${date}-${Math.random()}`, date, kind: 'strength', planId: null, muscleSets: {}, setCount: 0, ...extra,
});
const profile = (days) => ({ name: 'Felix', goal: 'Muskelaufbau', age: null, weight: null, days });
const sched = { 0: { kind: 'plan', id: 'ok' }, 2: { kind: 'plan', id: 'uk' }, 4: { kind: 'activity', id: 'run' } };

test('Wochenziel: Profil, sonst Wochenplan, sonst 3', () => {
  assert.equal(weekGoal(profile(4), sched), 4);
  assert.equal(weekGoal(null, sched), 3);
  assert.equal(weekGoal(profile(0), { 1: { kind: 'plan', id: 'x' } }), 1);
  assert.equal(weekGoal(null, {}), DEFAULT_WEEK_GOAL);
});

test('Wochenring: Einträge zählen (auch zwei am Tag und Aktivitäten)', () => {
  const now = at(2026, 10, 21, 20); // Mittwoch
  const sessions = [
    session('2026-10-18'), // Vorwoche
    session('2026-10-19'),
    session('2026-10-19', { kind: 'activity', planId: 'run' }),
    session('2026-10-21', { kind: 'homeplan', planId: 'b1' }),
  ];
  const ring = weekRing({ sessions, profile: profile(4), schedule: sched, now });
  assert.equal(ring.done, 3);
  assert.equal(ring.goal, 4);
  assert.equal(ring.fraction, 0.75);
  assert.equal(ring.headline, 'week.remainingOne');
  assert.deepEqual(ring.days.map((d) => d.done), [true, false, true, false, false, false, false]);
  assert.deepEqual(ring.days.map((d) => d.planned), [true, false, true, false, true, false, false]);
  assert.equal(ring.days.findIndex((d) => d.today), 2);
  assert.equal(ring.days[0].label, 'Mo');
});

test('Wochenring: Anfang, mehrere offen, geschafft und übererfüllt', () => {
  const now = at(2026, 10, 19, 8);
  assert.equal(weekRing({ sessions: [], profile: profile(3), schedule: {}, now }).headline, 'week.start');
  const one = weekRing({ sessions: [session('2026-10-19')], profile: profile(3), schedule: {}, now });
  assert.equal(one.headline, 'week.remaining');
  assert.deepEqual(one.params, { left: 2 });
  const over = weekRing({ sessions: ['2026-10-19', '2026-10-19', '2026-10-19', '2026-10-19'].map((d) => session(d)), profile: profile(3), schedule: {}, now });
  assert.equal(over.headline, 'week.done');
  assert.equal(over.fraction, 1);
});

test('Wochenring in der Woche der Zeitumstellung, Sonntag spät', () => {
  const now = at(2026, 10, 25, 23, 45);
  const ring = weekRing({ sessions: [session('2026-10-25'), session('2026-10-26')], profile: profile(3), schedule: {}, now });
  assert.equal(ring.done, 1);
  assert.equal(ring.days[6].today, true);
});

test('Muskelvolumen und Status gegen 10–20', () => {
  const sessions = [
    session('2026-10-19', { muscleSets: { chest: 6, triceps: 3 } }),
    session('2026-10-21', { muscleSets: { chest: 5, triceps: 1.5, back: 21 } }),
    session('2026-10-12', { muscleSets: { chest: 50 } }),
  ];
  const dates = ['2026-10-19', '2026-10-20', '2026-10-21'];
  assert.deepEqual(muscleVolume(sessions, dates), { chest: 11, triceps: 4.5, back: 21 });
  assert.equal(volumeStatus(0), 'lo');
  assert.equal(volumeStatus(6), 'mid');
  assert.equal(volumeStatus(9.5), 'mid');
  assert.equal(volumeStatus(10), 'ok');
  assert.equal(volumeStatus(20), 'ok');
  assert.equal(volumeStatus(20.5), 'hi');
  const report = volumeReport(sessions, at(2026, 10, 22));
  assert.equal(report.length, 12);
  assert.deepEqual(report.find((r) => r.muscle === 'chest'), { muscle: 'chest', sets: 11, status: 'ok' });
  assert.deepEqual(report.find((r) => r.muscle === 'back'), { muscle: 'back', sets: 21, status: 'hi' });
  assert.equal(report.find((r) => r.muscle === 'calves').status, 'lo');
});

test('Wochenrückblick: Vergleich bis zum gleichen Wochentag', () => {
  const now = at(2026, 10, 21, 18); // Mittwoch
  const sessions = [
    session('2026-10-12', { setCount: 10 }), // Mo Vorwoche
    session('2026-10-14', { setCount: 10 }), // Mi Vorwoche
    session('2026-10-16', { setCount: 20 }), // Fr Vorwoche – zählt nicht für "bis Mittwoch"
    session('2026-10-19', { setCount: 12 }),
    session('2026-10-21', { setCount: 13 }),
    session('2026-10-20', { kind: 'activity', planId: 'run', durationMin: 30, km: 5.25 }),
    session('2026-10-21', { kind: 'activity', planId: 'bike', durationMin: 45 }),
  ];
  const prs = [{ date: '2026-10-19', exercise: 'bench', weight: 60, reps: 8 }, { date: '2026-10-13', exercise: 'bench', weight: 55, reps: 8 }];
  const r = weekReview({ sessions, prs, profile: profile(4), schedule: sched, now });
  assert.equal(r.units, 4);
  assert.equal(r.goal, 4);
  assert.equal(r.sets, 25);
  assert.equal(r.prs, 1);
  assert.deepEqual(r.activities, { count: 2, minutes: 75, km: 5.25 });
  assert.equal(r.comparison.mode, 'sameWeekday');
  assert.equal(r.comparison.lastWeekSameDaySets, 20);
  assert.equal(r.comparison.lastWeekSets, 40);
  assert.equal(r.comparison.changePercent, 25);
});

test('Wochenrückblick: sonntags ganze Vorwoche, ohne Vorwoche kein Vergleich', () => {
  const sunday = at(2026, 10, 25, 20);
  const sessions = [session('2026-10-13', { setCount: 20 }), session('2026-10-24', { setCount: 10 })];
  const r = weekReview({ sessions, prs: [], profile: null, schedule: {}, now: sunday });
  assert.equal(r.comparison.mode, 'fullWeek');
  assert.equal(r.comparison.changePercent, -50);
  const none = weekReview({ sessions: [session('2026-10-24', { setCount: 10 })], prs: [], profile: null, schedule: {}, now: sunday });
  assert.equal(none.comparison.mode, 'none');
  assert.equal(none.comparison.changePercent, null);
  const empty = weekReview({ sessions: [], prs: [], profile: null, schedule: {}, now: sunday });
  assert.equal(empty.sets, 0);
  assert.equal(empty.goal, 3);
});

test('Wochenrückblick über den Jahreswechsel', () => {
  const now = at(2027, 1, 1, 12); // Freitag, Woche ab 28.12.2026
  const sessions = [session('2026-12-21', { setCount: 8 }), session('2026-12-28', { setCount: 10 }), session('2027-01-01', { setCount: 6 })];
  const r = weekReview({ sessions, prs: [], profile: profile(3), schedule: {}, now });
  assert.equal(r.sets, 16);
  assert.equal(r.comparison.lastWeekSameDaySets, 8);
  assert.equal(r.comparison.changePercent, 100);
});

test('Wochenplan-Vorschlag verteilt Pläne reihum', () => {
  assert.deepEqual(defaultSchedule(3, ['ok', 'uk']), {
    0: { kind: 'plan', id: 'ok' }, 2: { kind: 'plan', id: 'uk' }, 4: { kind: 'plan', id: 'ok' },
  });
  assert.deepEqual(Object.keys(defaultSchedule(2, ['a'])), ['0', '3']);
  assert.equal(Object.keys(defaultSchedule(9, ['a'])).length, 7);
  assert.equal(Object.keys(defaultSchedule(0, ['a'])).length, 1);
  assert.deepEqual(defaultSchedule(3, []), {});
});

test('todayPlan', () => {
  const now = at(2026, 10, 21, 9);
  assert.deepEqual(todayPlan({ sessions: [], schedule: sched, now }), { slot: { kind: 'plan', id: 'uk' }, done: false });
  assert.deepEqual(todayPlan({ sessions: [session('2026-10-21')], schedule: {}, now }), { slot: null, done: true });
});

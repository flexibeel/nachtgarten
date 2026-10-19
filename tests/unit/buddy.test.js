import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_COUNT, activeDays, growth, isIdle, moodFor, stageFromActiveDays, visit } from '../../src/domain/buddy.js';

const TODAY = '2026-10-19';
const buddy = (extra = {}) => ({
  tone: 'motiv', on: true, maxStage: 1, lastVisit: null, backDay: null, backShown: false, ...extra,
});

test('aktive Tage: Training, Gewohnheit, Umlenkung im 28-Tage-Fenster, ohne Doppelte', () => {
  const days = activeDays({
    today: TODAY,
    sessionDates: ['2026-10-19', '2026-10-19', '2026-09-22', '2026-09-21', '2026-10-20'],
    habitDays: { '2026-10-18': true, '2026-10-17': false },
    accountDays: { '2026-10-16': { redirects: 2 }, '2026-10-15': { redirects: 0 } },
  });
  // 22.09. ist genau Tag 28 (heute − 27), 21.09. liegt draußen, 20.10. ist Zukunft
  assert.deepEqual([...days].sort(), ['2026-09-22', '2026-10-16', '2026-10-18', '2026-10-19']);
});

test('aktive Tage über den Jahreswechsel', () => {
  const days = activeDays({ today: '2027-01-05', sessionDates: ['2026-12-08', '2026-12-09', '2027-01-01'], habitDays: {}, accountDays: {} });
  assert.deepEqual([...days].sort(), ['2026-12-09', '2027-01-01']);
});

test('Stufen-Grenzen', () => {
  assert.equal(stageFromActiveDays(0), 1);
  assert.equal(stageFromActiveDays(3), 1);
  assert.equal(stageFromActiveDays(4), 2);
  assert.equal(stageFromActiveDays(9), 2);
  assert.equal(stageFromActiveDays(10), 3);
  assert.equal(stageFromActiveDays(15), 3);
  assert.equal(stageFromActiveDays(16), 4);
  assert.equal(STAGE_COUNT, 4);
});

test('Keimi schrumpft höchstens eine Stufe', () => {
  assert.deepEqual(growth(16, 1), { stage: 4, maxStage: 4 });
  assert.deepEqual(growth(0, 4), { stage: 3, maxStage: 4 });
  assert.deepEqual(growth(5, 4), { stage: 3, maxStage: 4 });
  assert.deepEqual(growth(0, 2), { stage: 1, maxStage: 2 });
  assert.deepEqual(growth(10, 0), { stage: 3, maxStage: 3 });
});

test('eingeschlafen nach vier Tagen ohne Aktivität', () => {
  assert.equal(isIdle(new Set(['2026-10-16']), TODAY, false), false, 'vor drei Tagen ist noch wach');
  assert.equal(isIdle(new Set(['2026-10-15']), TODAY, false), true);
  assert.equal(isIdle(new Set(), TODAY, false), false, 'ganz neu ist nicht eingeschlafen');
  assert.equal(isIdle(new Set(), TODAY, true), true);
});

test('Besuch: Begrüßung nach mindestens drei Tagen Pause', () => {
  const first = visit(buddy(), TODAY);
  assert.equal(first.lastVisit, TODAY);
  assert.equal(first.backDay, null);
  assert.equal(visit(first, TODAY), first);
  const twoDays = visit(buddy({ lastVisit: '2026-10-17' }), TODAY);
  assert.equal(twoDays.backDay, null);
  const back = visit(buddy({ lastVisit: '2026-10-16', backShown: true }), TODAY);
  assert.equal(back.backDay, TODAY);
  assert.equal(back.backShown, false);
});

test('Stimmung: feste Reihenfolge', () => {
  const base = {
    state: buddy(), today: TODAY, hour: 14, prToday: false, trainedToday: false, plannedToday: false, idle: false,
    redirectsThisWeek: 0, random: () => 0.99,
  };
  assert.deepEqual(moodFor({ ...base, state: buddy({ backDay: TODAY }) }), { context: 'back', mood: 'happy', wake: true });
  assert.equal(moodFor({ ...base, state: buddy({ backDay: TODAY, backShown: true }) }).context, 'day');
  assert.deepEqual(moodFor({ ...base, prToday: true, trainedToday: true }), { context: 'pr', mood: 'proud' });
  assert.equal(moodFor({ ...base, trainedToday: true, hour: 23 }).context, 'trainDone');
  assert.deepEqual(moodFor({ ...base, hour: 22, idle: true }), { context: 'night', mood: 'tired' });
  assert.equal(moodFor({ ...base, hour: 4 }).context, 'night');
  assert.equal(moodFor({ ...base, hour: 5 }).context, 'morning');
  assert.deepEqual(moodFor({ ...base, idle: true, plannedToday: true }), { context: 'sleepy', mood: 'tired' });
  assert.deepEqual(moodFor({ ...base, plannedToday: true }), { context: 'trainToday', mood: 'cheer' });
  assert.equal(moodFor({ ...base, plannedToday: true, state: buddy({ tone: 'ruhig' }) }).mood, 'calm');
});

test('Stimmung: Zufall für Umlenkungs-Lob, Ruhetag und Tageszeit', () => {
  const base = {
    state: buddy(), today: TODAY, prToday: false, trainedToday: false, plannedToday: false, idle: false, redirectsThisWeek: 3,
  };
  assert.deepEqual(moodFor({ ...base, hour: 14, random: () => 0.1 }), { context: 'redirect', mood: 'happy', redirects: 3 });
  assert.deepEqual(moodFor({ ...base, hour: 14, random: () => 0.45 }), { context: 'rest', mood: 'calm' });
  assert.equal(moodFor({ ...base, hour: 10, random: () => 0.9 }).context, 'morning');
  assert.equal(moodFor({ ...base, hour: 11, random: () => 0.9 }).context, 'day');
  assert.equal(moodFor({ ...base, hour: 17, random: () => 0.9 }).context, 'evening');
  assert.equal(moodFor({ ...base, redirectsThisWeek: 0, hour: 14, random: () => 0.1 }).context, 'rest');
});

test('Momentaufnahme: Besuch, Wachstum mit Gedächtnis und Begrüßung nach Pause', async () => {
  const { buddySnapshot } = await import('../../src/domain/buddy.js');
  const base = {
    today: TODAY, hour: 9, prDates: [], habitDays: {}, accountDays: {}, plannedToday: false, redirectsThisWeek: 0, random: () => 0.9,
  };
  const fresh = buddySnapshot({ ...base, state: buddy(), sessionDates: [] });
  assert.equal(fresh.stage, 1);
  assert.equal(fresh.context, 'morning');
  assert.equal(fresh.state.lastVisit, TODAY);

  const dates = Array.from({ length: 10 }, (_, i) => `2026-10-${String(10 + i).padStart(2, '0')}`);
  const grown = buddySnapshot({ ...base, state: buddy(), sessionDates: dates });
  assert.equal(grown.stage, 3);
  assert.equal(grown.state.maxStage, 3);
  assert.equal(grown.context, 'trainDone');

  const back = buddySnapshot({ ...base, state: buddy({ lastVisit: '2026-10-10', maxStage: 4 }), sessionDates: ['2026-10-01'] });
  assert.equal(back.wake, true);
  assert.equal(back.context, 'back');
  assert.equal(back.stage, 3, 'schrumpft höchstens eine Stufe');
  assert.equal(back.state.backShown, true, 'Begrüßung nur einmal');
  const again = buddySnapshot({ ...base, state: back.state, sessionDates: ['2026-10-01'] });
  assert.equal(again.wake, false);
});

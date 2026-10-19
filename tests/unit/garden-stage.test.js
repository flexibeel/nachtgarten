import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GARDEN_THRESHOLDS, daysToNextStage, gardenStage, shouldFlyBy, trainingDaysThisMonth } from '../../src/domain/garden.js';

test('Gartenstufe ab 0, 2, 5, 9, 14 Trainingstagen', () => {
  assert.deepEqual(GARDEN_THRESHOLDS, [0, 2, 5, 9, 14]);
  const cases = [[0, 0], [1, 0], [2, 1], [4, 1], [5, 2], [8, 2], [9, 3], [13, 3], [14, 4], [30, 4], [NaN, 0], [-3, 0]];
  for (const [days, stage] of cases) assert.equal(gardenStage(days), stage, `${days} Tage`);
});

test('Trainingstage im Monat: jeder Tag einmal, nur dieser Monat, nichts aus der Zukunft', () => {
  const sessions = [
    { date: '2026-10-01' }, { date: '2026-10-01' }, { date: '2026-10-07' },
    { date: '2026-09-30' }, { date: '2026-10-25' }, { date: 'kaputt' }, {},
  ];
  assert.equal(trainingDaysThisMonth(sessions, '2026-10-19'), 2);
  assert.equal(trainingDaysThisMonth(sessions, '2026-10-31'), 3);
  assert.equal(trainingDaysThisMonth([], '2026-10-19'), 0);
});

test('Tage bis zur nächsten Stufe', () => {
  assert.equal(daysToNextStage(0), 2);
  assert.equal(daysToNextStage(6), 3);
  assert.equal(daysToNextStage(14), null);
});

test('Vorbeiflug höchstens einmal, nie bei reduzierter Bewegung', () => {
  assert.equal(shouldFlyBy({ shown: false, reducedMotion: false, random: () => 0 }), true);
  assert.equal(shouldFlyBy({ shown: true, reducedMotion: false, random: () => 0 }), false);
  assert.equal(shouldFlyBy({ shown: false, reducedMotion: true, random: () => 0 }), false);
  assert.equal(shouldFlyBy({ shown: false, reducedMotion: false, random: () => 0.99 }), false);
});

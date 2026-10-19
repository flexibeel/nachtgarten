import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REP_RANGE, applyDailyForm, lastSessionSets, platesPerSide, repRangeOrDefault, stepOrDefault, suggest, targetLowReps,
} from '../../src/domain/progression.js';
import { text } from '../../src/data/texts/de.js';

const TODAY = '2026-10-19';
const s = (date, weight, reps, rir = null) => ({ date, weight, reps, rir, session: null });
const base = { today: TODAY, bodyweight: false, repRange: [8, 12], step: 2.5 };

test('ohne früheres Training kein Vorschlag', () => {
  assert.equal(suggest({ ...base, history: [] }), null);
  assert.equal(suggest({ ...base, history: [s(TODAY, 60, 10)] }), null, 'nur heute zählt nicht');
});

test('lastSessionSets nimmt den letzten Tag vor heute', () => {
  const h = [s('2026-10-10', 50, 10), s('2026-10-12', 55, 9), s('2026-10-12', 55, 8), s(TODAY, 60, 1)];
  assert.deepEqual(lastSessionSets(h, TODAY).map((x) => x.reps), [9, 8]);
});

test('im Bereich: gleiches Gewicht, +1 Wiederholung (gedeckelt)', () => {
  const r = suggest({ ...base, history: [s('2026-10-12', 60, 10), s('2026-10-12', 60, 9)] });
  assert.equal(r.key, 'progression.addRep');
  assert.equal(r.weight, 60);
  assert.equal(r.reps, 11);
  const capped = suggest({ ...base, history: [s('2026-10-12', 60, 12), s('2026-10-12', 60, 11)] });
  assert.equal(capped.reps, 12);
});

test('oben angekommen: +Stufe, wieder unten im Bereich', () => {
  const r = suggest({ ...base, history: [s('2026-10-12', 60, 12), s('2026-10-12', 60, 12, 2)] });
  assert.equal(r.key, 'progression.addWeight');
  assert.equal(r.weight, 62.5);
  assert.equal(r.reps, 8);
  assert.equal(text(r.key, r.params), 'Oben angekommen (12 Wdh.). Heute +2,5 kg, dafür ab 8 Wdh.');
});

test('Satz bis zum Versagen (RIR 0) zählt nicht als sicher oben', () => {
  const r = suggest({ ...base, history: [s('2026-10-12', 60, 12, 0), s('2026-10-12', 60, 12, 1)] });
  assert.equal(r.key, 'progression.addRep');
});

test('nur ein Satz beim letzten Mal reicht zum Steigern', () => {
  const r = suggest({ ...base, history: [s('2026-10-12', 60, 12)] });
  assert.equal(r.key, 'progression.addWeight');
});

test('nur Sätze mit dem höchsten Gewicht zählen', () => {
  const r = suggest({ ...base, history: [s('2026-10-12', 50, 12), s('2026-10-12', 60, 12), s('2026-10-12', 60, 12)] });
  assert.equal(r.key, 'progression.addWeight');
  const notYet = suggest({ ...base, history: [s('2026-10-12', 50, 15), s('2026-10-12', 60, 12), s('2026-10-12', 60, 10)] });
  assert.equal(notYet.key, 'progression.addRep');
  assert.equal(notYet.reps, 12);
});

test('leichte Gewichte: kein Sprung über 12 %, erst +1 Wdh.', () => {
  const r = suggest({ ...base, step: 2.5, history: [s('2026-10-12', 8, 12), s('2026-10-12', 8, 12)] });
  assert.equal(r.key, 'progression.repBeforeBigJump');
  assert.equal(r.weight, 8);
  assert.equal(r.reps, 13);
  assert.equal(r.params.percent, 31);
  assert.match(text(r.key, r.params), /31 % mehr/);
});

test('leichte Gewichte: deutlich über dem Bereich ist der Sprung erlaubt', () => {
  const r = suggest({ ...base, step: 2.5, history: [s('2026-10-12', 8, 15), s('2026-10-12', 8, 15)] });
  assert.equal(r.key, 'progression.jumpAfterOvershoot');
  assert.equal(r.weight, 10.5);
  assert.equal(r.reps, 8);
});

test('kleine Stufe macht den Sprung wieder normal', () => {
  const r = suggest({ ...base, step: 1, history: [s('2026-10-12', 10, 12), s('2026-10-12', 10, 12)] });
  assert.equal(r.key, 'progression.addWeight');
  assert.equal(r.weight, 11);
});

test('Fließkomma: 1,25-kg-Schritte bleiben sauber', () => {
  const r = suggest({ ...base, step: 1.25, history: [s('2026-10-12', 11.25, 12)] });
  assert.equal(r.weight, 12.5);
});

test('klar unter dem Bereich: etwas leichter', () => {
  const r = suggest({ ...base, history: [s('2026-10-12', 60, 5), s('2026-10-12', 60, 4)] });
  assert.equal(r.key, 'progression.lighter');
  assert.equal(r.weight, 57.5);
  assert.equal(r.reps, 8);
  const minimal = suggest({ ...base, history: [s('2026-10-12', 2.5, 4)] });
  assert.equal(minimal.key, 'progression.addRep', 'nicht unter 0 kg');
  const justBelow = suggest({ ...base, history: [s('2026-10-12', 60, 7)] });
  assert.equal(justBelow.key, 'progression.addRep', 'eine Wdh. unter dem Bereich ist ok');
});

test('Körpergewicht: Wiederholungen, dann Zusatzgewicht', () => {
  const bw = { ...base, bodyweight: true, repRange: [8, 15] };
  const r = suggest({ ...bw, history: [s('2026-10-12', 0, 10), s('2026-10-12', 0, 9)] });
  assert.equal(r.key, 'progression.bodyweightRep');
  assert.equal(r.reps, 11);
  assert.equal(r.weight, null);
  const top = suggest({ ...bw, history: [s('2026-10-12', 0, 15), s('2026-10-12', 0, 16)] });
  assert.equal(top.key, 'progression.bodyweightLoad');
  const loaded = suggest({ ...bw, history: [s('2026-10-12', 5, 15), s('2026-10-12', 5, 15)] });
  assert.equal(loaded.key, 'progression.repBeforeBigJump', 'mit Zusatzgewicht gelten die Gewichtsregeln');
});

test('Standards für Stufe und Bereich', () => {
  assert.equal(stepOrDefault(undefined), 2.5);
  assert.equal(stepOrDefault(3), 2.5);
  assert.equal(stepOrDefault(1.25), 1.25);
  assert.deepEqual(repRangeOrDefault(undefined, 'Kraft'), [3, 6]);
  assert.deepEqual(repRangeOrDefault([6, 10], 'Kraft'), [6, 10]);
  assert.deepEqual(repRangeOrDefault([10, 6], 'Kraft'), [3, 6]);
  assert.deepEqual(repRangeOrDefault(undefined, ''), DEFAULT_REP_RANGE);
});

test('targetLowReps aus Plan-Soll', () => {
  assert.equal(targetLowReps('8–10'), 8);
  assert.equal(targetLowReps('12'), 12);
  assert.equal(targetLowReps('45 s'), null);
  assert.equal(targetLowReps('1 min'), null);
  assert.equal(targetLowReps('max'), null);
  assert.equal(targetLowReps('500'), 100);
});

test('Tagesform', () => {
  assert.equal(applyDailyForm(60, 'low', { hasHistory: true }), 52.5);
  assert.equal(applyDailyForm(0, 'low', { hasHistory: true }), 0);
  assert.equal(applyDailyForm(60, 'high', { hasHistory: true, step: 1.25 }), 61.25);
  assert.equal(applyDailyForm(20, 'high', { hasHistory: false }), 20);
  assert.equal(applyDailyForm(60, 'ok', { hasHistory: true }), 60);
  assert.equal(applyDailyForm(60, null), 60);
});

test('Scheibenrechner', () => {
  assert.deepEqual(platesPerSide(60), [20]);
  assert.deepEqual(platesPerSide(102.5), [25, 15, 1.25]);
  assert.deepEqual(platesPerSide(20), []);
  assert.deepEqual(platesPerSide(15), []);
  assert.deepEqual(platesPerSide(50, 10), [20]);
});

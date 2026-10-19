import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_FINISH_MS, HISTORY_LIMIT, addMuscleSets, bestSet, countsForPR, e1rm, finishChecklist, finishLive, isPersonalRecord,
  lastActivityAt, liveTitle, logSet, muscleSetsFromChecklist, muscleSetsFromLive, planMinutes, rebuildExercise,
  shouldAutoFinish, startLive, summarizeChecklist, summarizeLive, validateSet,
} from '../../src/domain/training.js';
import { EXERCISES, at, lookup } from './helpers/fixtures.js';

const rec = (weight, reps, rir = null, date = '2026-10-12') => ({ date, weight, reps, rir, session: null });

test('e1RM nach Epley, mit Reserve', () => {
  assert.equal(e1rm(100, 10), 100 * (1 + 10 / 30));
  assert.equal(e1rm(100, 8, 2), e1rm(100, 10));
  assert.ok(Math.abs(e1rm(60, 1) - 62) < 1e-9);
  assert.equal(e1rm(0, 12), 12, 'Körpergewicht: Wiederholungen');
  assert.equal(e1rm(0, 12, 3), 15);
  assert.equal(e1rm(50, 5, null), e1rm(50, 5, 0));
});

test('gewichtete Muskelsätze: Hauptmuskel 1, Hilfsmuskeln 0,5', () => {
  assert.deepEqual(addMuscleSets(EXERCISES.bench, 3), { chest: 3, triceps: 1.5, shoulders: 1.5 });
  assert.deepEqual(addMuscleSets(undefined, 3), {});
  assert.deepEqual(addMuscleSets(EXERCISES.curl, 0), {});
  const acc = addMuscleSets(EXERCISES.row1, 2, { biceps: 1 });
  assert.deepEqual(acc, { back: 2, biceps: 2 });
});

test('Live-Sätze: RIR ≤ 4 oder unbekannt zählt, unbekannte Übungen nicht', () => {
  const sets = [
    { exercise: 'bench', weight: 60, reps: 10, rir: null, at: 0 },
    { exercise: 'bench', weight: 60, reps: 10, rir: 2, at: 0 },
    { exercise: 'bench', weight: 40, reps: 10, rir: 5, at: 0 },
    { exercise: 'gibtsnicht', weight: 10, reps: 10, rir: 1, at: 0 },
  ];
  assert.deepEqual(muscleSetsFromLive(sets, lookup), { chest: 2, triceps: 1, shoulders: 1 });
});

test('Abhaken nach Plan', () => {
  const plan = { id: 'ok', name: 'Oberkörper', items: [{ exercise: 'bench', sets: 3, reps: '8' }, { exercise: 'curl', sets: 2, reps: '12' }] };
  assert.deepEqual(muscleSetsFromChecklist(plan, [2, 1], lookup), { chest: 2, triceps: 1, shoulders: 1, biceps: 1 });
  assert.deepEqual(muscleSetsFromChecklist(plan, [], lookup), {});
});

test('Bestleistung: erster Satz nie, besser als alles bisher, RIR-Regel', () => {
  assert.equal(isPersonalRecord([], { weight: 100, reps: 5 }), false);
  const prev = [rec(60, 10), rec(65, 8)];
  assert.equal(isPersonalRecord(prev, { weight: 70, reps: 8, rir: null }), true, 'RIR unbekannt erlaubt');
  assert.equal(isPersonalRecord(prev, { weight: 70, reps: 8, rir: 3 }), true);
  assert.equal(isPersonalRecord(prev, { weight: 70, reps: 8, rir: 4 }), false, 'zu viel Reserve');
  assert.equal(isPersonalRecord(prev, { weight: 60, reps: 10 }), false, 'gleich gut ist keine Bestleistung');
  assert.equal(isPersonalRecord([rec(0, 12)], { weight: 0, reps: 13 }), true, 'Körpergewicht über Wiederholungen');
  assert.ok(countsForPR(undefined));
  assert.ok(!countsForPR(4));
});

test('Bestleistung ignoriert die RIR früherer Sätze', () => {
  // 60×10 mit RIR 3 wäre geschätzt stärker, zählt aber nur als 60×10
  assert.equal(isPersonalRecord([rec(60, 10, 3)], { weight: 60, reps: 11 }), true);
});

test('bestSet', () => {
  assert.equal(bestSet([]), null);
  const best = bestSet([rec(60, 10), rec(70, 5), rec(65, 8)]);
  assert.deepEqual([best.weight, best.reps], [65, 8]);
});

test('validateSet', () => {
  assert.equal(validateSet(42.5, 8), null);
  assert.equal(validateSet(0, 1), null);
  assert.equal(validateSet(-1, 8), 'set.invalidWeight');
  assert.equal(validateSet(501, 8), 'set.invalidWeight');
  assert.equal(validateSet(NaN, 8), 'set.invalidWeight');
  assert.equal(validateSet(20, 0), 'set.invalidReps');
  assert.equal(validateSet(20, 8.5), 'set.invalidReps');
  assert.equal(validateSet(20, 101), 'set.invalidReps');
});

test('logSet schreibt Live, Verlauf und Bestleistung fort, ohne Eingaben zu verändern', () => {
  const t0 = at(2026, 10, 19, 18, 0);
  const state = {
    live: startLive(t0),
    history: { bench: [rec(60, 10, null, '2026-10-12')] },
    prs: [],
  };
  const frozen = JSON.stringify(state);
  const r1 = logSet(state, { exercise: 'bench', weight: 62.5, reps: 10, rir: 2 }, t0 + 60_000);
  assert.equal(JSON.stringify(state), frozen);
  assert.equal(r1.pr, true);
  assert.equal(r1.live.sets.length, 1);
  assert.deepEqual(r1.history.bench.at(-1), { date: '2026-10-19', weight: 62.5, reps: 10, rir: 2, session: t0 });
  assert.deepEqual(r1.prs, [{ date: '2026-10-19', exercise: 'bench', weight: 62.5, reps: 10, session: t0 }]);

  const r2 = logSet(r1, { exercise: 'bench', weight: 62.5, reps: 9, attachment: 'Seil', height: 'hoch' }, t0 + 120_000);
  assert.equal(r2.pr, false);
  assert.equal(r2.live.sets[1].rir, null);
  assert.equal(r2.live.sets[1].attachment, 'Seil');
  assert.equal(r2.prs.length, 1);
});

test('logSet: erster Satz einer neuen Übung ist keine Bestleistung, Verlauf ist begrenzt', () => {
  const t0 = at(2026, 10, 19);
  const long = Array.from({ length: HISTORY_LIMIT }, () => rec(20, 10));
  const r = logSet({ live: startLive(t0), history: { curl: long }, prs: [] }, { exercise: 'curl', weight: 10, reps: 10 }, t0);
  assert.equal(r.history.curl.length, HISTORY_LIMIT);
  const fresh = logSet({ live: startLive(t0), history: {}, prs: [] }, { exercise: 'squat', weight: 80, reps: 5 }, t0);
  assert.equal(fresh.pr, false);
});

test('rebuildExercise nach Löschen eines Satzes', () => {
  const t0 = at(2026, 10, 19, 18);
  let s = { live: startLive(t0), history: { bench: [rec(60, 10)] }, prs: [] };
  s = { ...s, ...logSet(s, { exercise: 'bench', weight: 65, reps: 10 }, t0 + 1000) };
  s = { ...s, ...logSet(s, { exercise: 'bench', weight: 70, reps: 10 }, t0 + 2000) };
  assert.equal(s.prs.length, 2);
  // ersten Satz (65) löschen
  const live = { ...s.live, sets: s.live.sets.slice(1) };
  const r = rebuildExercise({ ...s, live }, 'bench');
  assert.deepEqual(r.history.bench.map((x) => x.weight), [60, 70]);
  assert.deepEqual(r.prs.map((p) => p.weight), [70]);
});

test('rebuildExercise entfernt alte Bestleistungen ohne Zuordnung am selben Tag', () => {
  const t0 = at(2026, 10, 19, 18);
  const live = { ...startLive(t0), sets: [{ exercise: 'bench', weight: 60, reps: 8, rir: null, at: t0 }] };
  const r = rebuildExercise({
    live,
    history: { bench: [rec(60, 10)] },
    prs: [{ date: '2026-10-19', exercise: 'bench', weight: 99, reps: 1, session: null }, { date: '2026-10-01', exercise: 'bench', weight: 50, reps: 1 }],
  }, 'bench');
  assert.deepEqual(r.prs.map((p) => p.date), ['2026-10-01']);
});

test('Auto-Ende nach drei Stunden ohne Satz', () => {
  const t0 = at(2026, 10, 19, 18);
  const live = { ...startLive(t0), sets: [{ exercise: 'bench', weight: 60, reps: 8, rir: null, at: t0 + 3_600_000 }] };
  assert.equal(lastActivityAt(live), t0 + 3_600_000);
  assert.equal(lastActivityAt(null), 0);
  assert.equal(shouldAutoFinish(live, t0 + 3_600_000 + AUTO_FINISH_MS - 1), false);
  assert.equal(shouldAutoFinish(live, t0 + 3_600_000 + AUTO_FINISH_MS), true);
  assert.equal(shouldAutoFinish(null, t0), false);
});

test('liveTitle aus den Hauptmuskeln, Beine zusammengefasst', () => {
  const mk = (ids) => ({ ...startLive(0), sets: ids.map((exercise) => ({ exercise, weight: 1, reps: 1, rir: null, at: 0 })) });
  assert.equal(liveTitle(mk([]), lookup), 'Live-Training');
  assert.equal(liveTitle(mk(['bench', 'bench', 'curl']), lookup), 'Brust & Bizeps');
  assert.equal(liveTitle(mk(['squat', 'squat', 'legcurl', 'legcurl']), lookup), 'Beine');
  assert.equal(liveTitle(mk(['bench', 'bench', 'bench', 'bench', 'curl']), lookup), 'Brust');
  assert.equal(liveTitle({ ...mk(['bench']), queue: { planId: 'ok', name: 'Oberkörper', items: [], index: 0 } }, lookup), 'Oberkörper');
});

test('finishLive: Datum vom letzten Satz (nach Mitternacht), Plan, Messwerte', () => {
  const start = at(2026, 10, 19, 23, 30);
  const live = {
    ...startLive(start),
    sets: [
      { exercise: 'bench', weight: 60, reps: 10, rir: 2, at: start + 10 * 60_000 },
      { exercise: 'row1', weight: 50, reps: 10, rir: null, at: start + 45 * 60_000 },
    ],
    queue: { planId: 'ok', name: 'Oberkörper', items: [], index: 0 },
    metrics: { Puls: { before: '62', after: null } },
  };
  const s = finishLive(live, lookup, { autoFinished: true });
  assert.equal(s.date, '2026-10-20');
  assert.equal(s.planId, 'ok');
  assert.equal(s.setCount, 2);
  assert.deepEqual(s.exercises, ['bench', 'row1']);
  assert.equal(s.autoFinished, true);
  assert.deepEqual(s.metrics, { Puls: { before: '62', after: null } });
  assert.deepEqual(s.muscleSets, { chest: 1, triceps: 0.5, shoulders: 0.5, back: 1, biceps: 0.5 });
  assert.equal(finishLive(startLive(start), lookup), null);
  assert.equal('autoFinished' in finishLive(live, lookup), false);
});

test('finishChecklist', () => {
  const plan = { id: 'ok', name: 'Oberkörper', items: [{ exercise: 'bench', sets: 3, reps: '8' }, { exercise: 'curl', sets: 2, reps: '12' }] };
  const now = at(2026, 10, 19, 19);
  const s = finishChecklist(plan, [3, 0], lookup, now);
  assert.equal(s.setCount, 3);
  assert.deepEqual(s.exercises, ['bench']);
  assert.equal(s.date, '2026-10-19');
  assert.equal(finishChecklist(plan, [0, 0], lookup, now), null);
});

test('planMinutes: 2,5 Min. pro Satz, auf 5 gerundet, mindestens 10', () => {
  const p = (n) => ({ id: 'x', name: 'x', items: [{ exercise: 'bench', sets: n, reps: '8' }] });
  assert.equal(planMinutes(p(1)), 10);
  assert.equal(planMinutes(p(16)), 40);
  assert.equal(planMinutes(p(13)), 35);
  assert.equal(planMinutes({ id: 'x', name: 'x', items: [] }), 10);
});

test('summarizeLive für die Abschluss-Karte', () => {
  const t0 = at(2026, 10, 19, 18);
  const live = {
    ...startLive(t0),
    sets: [
      { exercise: 'bench', weight: 60, reps: 10, rir: null, at: t0 + 60_000 },
      { exercise: 'bench', weight: 65, reps: 8, rir: null, at: t0 + 300_000 },
      { exercise: 'pushup', weight: 0, reps: 20, rir: null, at: t0 + 600_000 },
    ],
  };
  const prs = [{ date: '2026-10-19', exercise: 'bench', weight: 65, reps: 8, session: t0 }];
  const card = summarizeLive(live, { lookup, prs, now: t0 + 52 * 60_000, timeTracking: true });
  assert.equal(card.title, 'Brust');
  assert.equal(card.minutes, 52);
  assert.equal(card.sets, 3);
  assert.equal(card.reps, 38);
  assert.equal(card.volume, 1120);
  assert.equal(card.muscles.chest, 3);
  assert.deepEqual(card.items.map((i) => [i.name, i.sets.length, i.pr]), [['Bankdrücken', 2, true], ['Liegestütze', 1, false]]);
  assert.equal(summarizeLive(live, { lookup, prs, now: t0, timeTracking: false }).minutes, null);
});

test('summarizeChecklist ohne Gewichte', () => {
  const plan = { id: 'ok', name: 'Oberkörper', items: [{ exercise: 'bench', sets: 3, reps: '8–10' }, { exercise: 'curl', sets: 2, reps: '12' }] };
  const now = at(2026, 10, 19, 19);
  const card = summarizeChecklist(plan, [2, 0], { lookup, startedAt: now - 30 * 60_000, now, timeTracking: true });
  assert.equal(card.minutes, 30);
  assert.equal(card.sets, 2);
  assert.equal(card.reps, null);
  assert.deepEqual(card.items, [{ name: 'Bankdrücken', gear: 'Langhantel', sets: [{ weight: null, reps: '8–10' }, { weight: null, reps: '8–10' }] }]);
  assert.equal(summarizeChecklist(plan, [1, 1], { lookup, startedAt: null, now, timeTracking: true }).minutes, null);
});

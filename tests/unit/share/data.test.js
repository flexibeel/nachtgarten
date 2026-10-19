import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  facts, fmtCoord, fmtDuration, fmtInt, fmtKg, fmtKm, fmtPace, moonLight, moonName, moonPhase, musclesText,
  paceProfile, paceVariation, setsCompact, setsText, suggestCards, summarizeStrength, themeFor,
} from '../../../src/ui/share/data.js';
import { LEG_DAY, PUSH_DAY, RUN } from './fixtures.js';

test('Formatierung: deutsch, mit Komma und Tausenderpunkt', () => {
  assert.equal(fmtKm(7420), '7,42');
  assert.equal(fmtKm(10000), '10,00');
  assert.equal(fmtKm(123456), '123,5');
  assert.equal(fmtKm(-5), '0,00');
  assert.equal(fmtInt(15920), '15.920');
  assert.equal(fmtKg(72.5), '72,5');
  assert.equal(fmtKg(100), '100');
  assert.equal(fmtDuration(2478), '41:18');
  assert.equal(fmtDuration(3725), '1:02:05');
  assert.equal(fmtDuration(0), '0:00');
  assert.equal(fmtPace(334), '5:34');
  assert.equal(fmtPace(0), '–');
  assert.equal(fmtPace(Infinity), '–');
  assert.equal(fmtCoord(53.5683, 'N', 'S'), '53° 34′ N');
  assert.equal(fmtCoord(10.0035, 'O', 'W'), '10° 00′ O');
  assert.equal(fmtCoord(-0.9999, 'O', 'W'), '1° 00′ W');
});

test('Mondphase: bekannter Vollmond und Neumond', () => {
  // Vollmond 23.04.2024 23:49 UTC, Neumond 08.04.2024 18:21 UTC
  const full = moonPhase('2024-04-23T23:49:00Z');
  const neu = moonPhase('2024-04-08T18:21:00Z');
  assert.ok(Math.abs(full - 0.5) < 0.03, `full=${full}`);
  assert.ok(neu < 0.03 || neu > 0.97, `neu=${neu}`);
  assert.equal(moonName(full), 'Vollmond');
  assert.equal(moonName(neu), 'Neumond');
  assert.ok(moonLight(0.5) > 0.99 && moonLight(0) < 0.01);
  assert.equal(moonName(moonPhase(RUN.start)), 'erstes Viertel');
});

test('paceProfile: Splits oder gleichmäßig aus Zeit und Distanz', () => {
  assert.equal(paceProfile(RUN).length, 8);
  assert.deepEqual(paceProfile({ distanceM: 5000, durationS: 1500 }), [300, 300, 300, 300, 300]);
  assert.deepEqual(paceProfile({ distanceM: 0, durationS: 100 }), []);
  assert.ok(paceVariation(RUN) > 0.02);
  assert.equal(paceVariation({ distanceM: 5000, durationS: 1500 }), 0);
});

test('summarizeStrength: Volumen, Sätze, Hauptübung, Bestwert, Belastung', () => {
  const s = summarizeStrength(LEG_DAY);
  assert.equal(s.sets, 19);
  assert.equal(s.volume, 15920);
  assert.deepEqual(s.top, { name: 'Kniebeuge', kg: 100, reps: 8, pr: true });
  assert.deepEqual(s.prs, [{ name: 'Kniebeuge', kg: 100, reps: 8 }]);
  assert.equal(s.load.quads, 1);
  assert.ok(s.load.glutes > 0.5 && s.load.glutes < 1);
  assert.equal(s.load.chest, undefined);
  // ohne Bestwert: erste Übung mit Gewicht, ihr schwerster Satz
  const p = summarizeStrength(PUSH_DAY);
  assert.deepEqual(p.top, { name: 'Bankdrücken', kg: 72.5, reps: 5, pr: false });
  assert.ok(p.load.triceps > 0, 'Dips ohne Gewicht zählen trotzdem');
  assert.deepEqual(summarizeStrength({ exercises: [] }), { volume: 0, sets: 0, reps: 0, top: null, load: {}, prs: [] });
});

test('setsText: gleiche, wechselnde, ohne Gewicht, Halten, je Seite', () => {
  const ex = (sets, more = {}) => ({ name: 'x', sets, ...more });
  assert.deepEqual(setsText(ex([{ reps: 8, kg: 100 }, { reps: 8, kg: 100 }, { reps: 8, kg: 100 }])), { reps: '3 × 8', load: '100 kg' });
  assert.deepEqual(setsText(ex([{ reps: 10, kg: 80 }, { reps: 8, kg: 80 }])), { reps: '10 · 8', load: '80 kg' });
  assert.deepEqual(setsText(ex([{ reps: 6, kg: 70 }, { reps: 5, kg: 72.5 }])), { reps: '6 · 5', load: '70 · 72,5 kg' });
  assert.deepEqual(setsText(ex([{ reps: 10 }, { reps: 10 }])), { reps: '2 × 10', load: 'Körpergewicht' });
  assert.deepEqual(setsText(ex([{ sec: 45 }, { sec: 45 }, { sec: 45 }])), { reps: '3 × 45 s', load: 'Körpergewicht' });
  assert.deepEqual(setsText(ex([{ reps: 12, kg: 8 }], { perSide: true })), { reps: '1 × 12', load: '8 kg je Seite' });
  assert.deepEqual(setsText(ex([])), { reps: '', load: '' });
});

test('setsCompact: eine Zeile, „bis“ bei wechselndem Gewicht', () => {
  assert.equal(setsCompact(LEG_DAY.exercises[0]), '3 × 8 · 100 kg');
  assert.equal(setsCompact(LEG_DAY.exercises[1]), '10 · 10 · 8 · bis 85 kg');
  assert.equal(setsCompact(PUSH_DAY.exercises[3]), '10 · 10 · 8');
});

test('musclesText: die zwei wichtigsten Muskeln, deutsch', () => {
  assert.equal(musclesText(LEG_DAY.exercises[0]), 'Beine vorn · Po');
  assert.equal(musclesText({ muscles: ['chest', 'triceps', 'shoulders'] }), 'Brust · Trizeps');
});

test('facts: höchstens drei Zahlen, Bestwert als Heldenzahl', () => {
  const r = facts(RUN);
  assert.equal(r.hero.value, '7,42');
  assert.ok(r.stats.length <= 3);
  assert.equal(r.stats[0].value, '41:18');
  assert.equal(r.stats[1].value, '5:34');
  assert.match(r.line, /^Nr\. 112 · Montag, 19\. Oktober 2026 · 18:42$/);
  const k = facts(LEG_DAY, 'bestwert');
  assert.equal(k.hero.value, '100');
  assert.equal(k.hero.label, 'Bestwert Kniebeuge');
  assert.equal(facts(LEG_DAY).hero.value, '15.920');
});

test('themeFor: abends und nachts dunkel', () => {
  assert.equal(themeFor('2026-10-19T18:42:00+02:00'), 'dunkel');
  assert.equal(themeFor('2026-10-22T07:15:00+02:00'), 'hell');
  assert.equal(themeFor('2026-10-22T05:30:00+02:00'), 'dunkel');
});

test('suggestCards: 3–4 verschiedene Vorschläge, sortiert, mit Grund', () => {
  for (const s of [RUN, LEG_DAY, PUSH_DAY]) {
    const list = suggestCards(s);
    assert.ok(list.length >= 3 && list.length <= 4, `${list.length}`);
    const keys = list.map((x) => `${x.template}:${x.opts.detail}`);
    assert.equal(new Set(keys).size, keys.length, 'keine Dopplungen');
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].score >= list[i].score);
    for (const x of list) { assert.ok(x.reason.length > 5); assert.ok(['hell', 'dunkel'].includes(x.opts.theme)); }
  }
});

test('suggestCards: Bestwert zuerst, Programmheft bei vielen Übungen', () => {
  const leg = suggestCards(LEG_DAY);
  assert.equal(leg[0].template, 'typo');
  assert.equal(leg[0].opts.focus, 'bestwert');
  assert.match(leg[0].reason, /Kniebeuge 100 kg/);
  assert.equal(leg[1].template, 'kraft');
  assert.equal(leg[1].opts.detail, 'detailliert');
  const push = suggestCards(PUSH_DAY);
  assert.equal(push[0].opts.detail, 'detailliert', 'ohne Bestwert führt das Programmheft');
  assert.equal(push[0].opts.theme, 'hell', 'morgens hell');
});

test('suggestCards: langer Lauf → Sternbild zuerst; mit Route ein Sticker', () => {
  const run = suggestCards(RUN);
  assert.ok(run.some((x) => x.template === 'sticker' && x.opts.transparent));
  const long = suggestCards({ ...RUN, distanceM: 12400 });
  assert.equal(long[0].template, 'sternbild');
  assert.match(long[0].reason, /lange Runde/);
  const noRoute = suggestCards({ ...RUN, route: [] });
  assert.ok(!noRoute.some((x) => x.template === 'sticker' || x.template === 'sternbild'));
  assert.ok(noRoute.length >= 3);
  const pr = suggestCards({ ...RUN, pr: { label: 'schnellste 5 km', value: '26:41', unit: '' } });
  assert.equal(pr[0].opts.focus, 'bestwert');
});

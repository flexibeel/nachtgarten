import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clock, days, fillTemplate, formatKg, formatNumber, minutes, parseDecimal, percentChange, plural, reps, round, sets, units, weeks,
} from '../../src/core/format.js';
import { TEXTS, text } from '../../src/data/texts/de.js';

test('formatNumber: Komma, Tausenderpunkt, Rundung', () => {
  assert.equal(formatNumber(1234.5), '1.234,5');
  assert.equal(formatNumber(42.25, 2), '42,25');
  assert.equal(formatNumber(42.25, 1), '42,3');
  assert.equal(formatNumber(1.005, 2), '1,01');
  assert.equal(formatNumber(3, 2), '3');
  assert.equal(formatNumber(NaN), '0');
  assert.equal(formatNumber('7,5'), '0');
  assert.equal(formatNumber(-2.5), '-2,5');
});

test('round vermeidet Fließkomma-Ausreißer', () => {
  assert.equal(round(0.1 + 0.2, 2), 0.3);
  assert.equal(round(2.675, 2), 2.68);
  assert.equal(round(7), 7);
});

test('Einzahl nur bei genau 1', () => {
  assert.equal(sets(1), '1 Satz');
  assert.equal(sets(2), '2 Sätze');
  assert.equal(sets(0), '0 Sätze');
  assert.equal(sets(1.5), '1,5 Sätze');
  assert.equal(minutes(1), '1 Minute');
  assert.equal(minutes(45), '45 Minuten');
  assert.equal(weeks(1), '1 Woche');
  assert.equal(weeks(12), '12 Wochen');
  assert.equal(days(1), '1 Tag');
  assert.equal(days(3), '3 Tage');
  assert.equal(units(1), '1 Einheit');
  assert.equal(units(4), '4 Einheiten');
  assert.equal(reps(1), '1 Wiederholung');
  assert.equal(plural(1000, 'Schritt', 'Schritte'), '1.000 Schritte');
});

test('formatKg', () => {
  assert.equal(formatKg(42.5), '42,5 kg');
  assert.equal(formatKg(1.25), '1,25 kg');
  assert.equal(formatKg(0), '0 kg');
  assert.equal(formatKg(1000), '1.000 kg');
});

test('percentChange mit echtem Minus und ohne Vergleich', () => {
  assert.equal(percentChange(12, 10), '+20 %');
  assert.equal(percentChange(9, 10), '−10 %');
  assert.equal(percentChange(10, 10), '±0 %');
  assert.equal(percentChange(5, 0), null);
});

test('clock', () => {
  assert.equal(clock(0), '0:00');
  assert.equal(clock(75), '1:15');
  assert.equal(clock(3725), '1:02:05');
  assert.equal(clock(-5), '0:00');
  assert.equal(clock(59.9), '0:59');
});

test('parseDecimal liest Komma und Punkt', () => {
  assert.equal(parseDecimal('42,5'), 42.5);
  assert.equal(parseDecimal(' 7 '), 7);
  assert.equal(parseDecimal('.5'), 0.5);
  assert.ok(Number.isNaN(parseDecimal('')));
  assert.ok(Number.isNaN(parseDecimal('12kg')));
  assert.ok(Number.isNaN(parseDecimal(null)));
});

test('fillTemplate formatiert Zahlen deutsch und lässt Unbekanntes stehen', () => {
  assert.equal(fillTemplate('+{step} kg für {name}', { step: 2.5, name: 'Felix' }), '+2,5 kg für Felix');
  assert.equal(fillTemplate('{a} und {b}', { a: 1 }), '1 und {b}');
});

test('Texte: Schlüssel werden aufgelöst, unbekannte zurückgegeben', () => {
  assert.equal(text('progression.addWeight', { hi: 12, step: 2.5, lo: 8 }), 'Oben angekommen (12 Wdh.). Heute +2,5 kg, dafür ab 8 Wdh.');
  assert.equal(text('gibt.es.nicht'), 'gibt.es.nicht');
  for (const [key, value] of Object.entries(TEXTS)) assert.ok(value.length > 0, key);
});

test('Texte: jeder Schlüssel, den die Domain liefert, hat einen Text', () => {
  const domainKeys = [
    'progression.bodyweightLoad', 'progression.bodyweightRep', 'progression.jumpAfterOvershoot', 'progression.repBeforeBigJump',
    'progression.addWeight', 'progression.lighter', 'progression.addRep',
    'set.invalidWeight', 'set.invalidReps',
    'week.done', 'week.remaining', 'week.remainingOne', 'week.start',
    'habit.empty', 'habit.count', 'habit.comeback', 'habit.restart', 'habit.missedYesterday', 'habit.noAnchor',
    'backup.notJson', 'backup.notNachtgarten', 'backup.tooNew', 'backup.invalidData',
  ];
  for (const key of domainKeys) assert.ok(key in TEXTS, key);
  assert.equal(text('week.remaining', { left: 2 }), 'Noch 2 Trainingstage bis zu deinem Wochenziel.');
});

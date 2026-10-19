import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDump, currentFocus, dayPart, greetingKey, removeDump, restoreDump, setFocus, toggleFocusDone, DUMP_MAX_LENGTH } from '../../src/domain/today.js';
import { TEXTS } from '../../src/data/texts/de.js';

test('Tageszeit und Begrüßung', () => {
  assert.deepEqual([4, 5, 10, 11, 16, 17, 21, 22, 0].map(dayPart), ['night', 'morning', 'morning', 'day', 'day', 'evening', 'evening', 'night', 'night']);
  for (const h of [0, 6, 12, 18]) assert.ok(greetingKey(h) in TEXTS);
});

test('Eine Sache heute: gilt nur für ihren Tag', () => {
  const f = setFocus('  Steuer machen  ', '2026-10-19');
  assert.deepEqual(f, { day: '2026-10-19', text: 'Steuer machen', done: false });
  assert.deepEqual(currentFocus(f, '2026-10-20'), { day: '2026-10-20', text: '', done: false });
  const done = toggleFocusDone(f, '2026-10-19');
  assert.equal(done.done, true);
  assert.equal(toggleFocusDone(done, '2026-10-19').done, false);
  assert.equal(toggleFocusDone(f, '2026-10-20').done, false, 'gestern lässt sich heute nicht abhaken');
  assert.equal(setFocus('x'.repeat(500), '2026-10-19').text.length, 120);
});

test('Kurz abladen: anhängen, löschen, rückgängig', () => {
  let d = addDump([], ' Milch ');
  d = addDump(d, '   ');
  d = addDump(d, 'Mama anrufen');
  assert.deepEqual(d, ['Milch', 'Mama anrufen']);
  const removed = removeDump(d, 0);
  assert.deepEqual(removed, ['Mama anrufen']);
  assert.deepEqual(restoreDump(removed, 0, 'Milch'), d);
  assert.deepEqual(restoreDump([], 5, 'a'), ['a']);
  assert.equal(addDump([], 'y'.repeat(999))[0].length, DUMP_MAX_LENGTH);
});

test('Neue Text-Schlüssel sind vorhanden', () => {
  for (const k of ['greeting.morning', 'greeting.day', 'greeting.evening', 'greeting.night', 'mama.noDate', 'mama.dueTooFar', 'mama.dueLongPast', 'mama.birthInFuture', 'mama.birthTooOld']) {
    assert.ok(k in TEXTS, k);
  }
});

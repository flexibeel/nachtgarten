import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mamaStatus, markBirth, phaseChanged, postpartumStatus, pregnancyStatus } from '../../src/domain/pregnancy.js';

test('SSW aus dem Termin: 280 − Tage bis zum Termin', () => {
  const s = pregnancyStatus('2027-03-01', '2026-10-19');
  // 133 Tage bis zum Termin → Tag 147 → 21+0
  assert.equal(s.daysUntilDue, 133);
  assert.equal(s.gestationalDays, 147);
  assert.equal(s.label, 'SSW 21+0');
  assert.equal(s.phase, 't2');
  assert.equal(s.overdue, false);
  assert.equal(s.askBirth, false);
});

test('Drittel-Grenzen 13+6 / 14+0 und 27+6 / 28+0', () => {
  const due = '2027-04-01';
  const at = (ga) => pregnancyStatus(due, addDaysBack(due, 280 - ga));
  assert.equal(at(13 * 7 + 6).phase, 't1');
  assert.equal(at(14 * 7).phase, 't2');
  assert.equal(at(27 * 7 + 6).phase, 't2');
  assert.equal(at(28 * 7).phase, 't3');
  assert.equal(at(0).label, 'SSW 0+0');
});

test('am Termin 40+0, danach überfällig', () => {
  const due = pregnancyStatus('2026-10-19', '2026-10-19');
  assert.equal(due.label, 'SSW 40+0');
  assert.equal(due.askBirth, true);
  assert.equal(due.overdue, false);
  const late = pregnancyStatus('2026-10-19', '2026-10-29');
  assert.equal(late.label, 'SSW 41+3');
  assert.equal(late.overdue, true);
  assert.equal(late.daysUntilDue, -10);
  const before = pregnancyStatus('2026-10-20', '2026-10-19');
  assert.equal(before.label, 'SSW 39+6');
  assert.equal(before.askBirth, false);
});

test('Termin zu weit weg oder ungültig → null', () => {
  assert.equal(pregnancyStatus('2027-10-19', '2026-10-19'), null);
  assert.equal(pregnancyStatus('', '2026-10-19'), null);
  assert.equal(pregnancyStatus('2026-02-30', '2026-10-19'), null);
});

test('SSW über Schalttag und Zeitumstellung', () => {
  // Zwischen 2024-02-01 und 2024-03-01 liegen 29 Tage
  const s = pregnancyStatus('2024-03-01', '2024-02-01');
  assert.equal(s.daysUntilDue, 29);
  assert.equal(s.label, 'SSW 35+6');
  const dst = pregnancyStatus('2026-10-26', '2026-10-24');
  assert.equal(dst.daysUntilDue, 2);
});

test('nach der Geburt: Wochen und Phasen mit Abfragen', () => {
  const birth = '2026-08-01';
  const w = (weeks, checks) => postpartumStatus(birth, addDaysForward(birth, weeks * 7), checks);
  assert.equal(w(0).label, '0 Wochen nach der Geburt');
  assert.equal(w(1).label, '1 Woche nach der Geburt');
  assert.equal(w(5).phase, 'pp0');
  assert.equal(w(5).needsCheck, null);

  const six = w(6);
  assert.equal(six.naturalPhase, 'pp1');
  assert.equal(six.phase, 'pp0', 'ohne 6-Wochen-Check bleibt pp0');
  assert.equal(six.needsCheck, 'pp1');
  assert.equal(w(6, { check6: true }).phase, 'pp1');
  assert.equal(w(6, { check6: true }).needsCheck, null);

  const twelve = w(12, { check6: true });
  assert.equal(twelve.phase, 'pp1');
  assert.equal(twelve.needsCheck, 'pp2');
  assert.equal(w(12, { check6: true, check12: true }).phase, 'pp2');
  assert.equal(w(12).phase, 'pp0', 'ohne beide Checks');
  assert.equal(w(12).needsCheck, 'pp1');
});

test('Geburtsdatum in der Zukunft oder ungültig → null', () => {
  assert.equal(postpartumStatus('2026-10-20', '2026-10-19'), null);
  assert.equal(postpartumStatus('nix', '2026-10-19'), null);
});

test('mamaStatus wählt den Modus', () => {
  const base = { cesarean: false, seenPhase: null, safetyOk: false, check6: true, check12: false };
  assert.equal(mamaStatus(null, '2026-10-19'), null);
  assert.equal(mamaStatus({ ...base, mode: 'preg', date: '' }, '2026-10-19'), null);
  assert.equal(mamaStatus({ ...base, mode: 'preg', date: '2026-12-01' }, '2026-10-19').mode, 'preg');
  const post = mamaStatus({ ...base, mode: 'post', date: '2026-08-01' }, '2026-10-19');
  assert.equal(post.mode, 'post');
  assert.equal(post.phase, 'pp1');
});

test('Baby ist da: Wechsel in „nach der Geburt“, Abfragen zurückgesetzt', () => {
  const m = markBirth({ mode: 'preg', date: '2026-10-19', cesarean: true, seenPhase: 't3', safetyOk: true, check6: true, check12: true });
  assert.deepEqual(m, { mode: 'post', date: '', cesarean: false, seenPhase: 't3', safetyOk: true, check6: false, check12: false });
});

test('Phasenwechsel-Hinweis', () => {
  const m = { seenPhase: 't2' };
  assert.equal(phaseChanged(m, 't3'), true);
  assert.equal(phaseChanged(m, 't2'), false);
  assert.equal(phaseChanged({ seenPhase: null }, 't1'), false);
  assert.equal(phaseChanged(m, null), false);
});

/* Hilfen ohne Abhängigkeit vom getesteten Code */
function addDaysForward(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
function addDaysBack(key, n) {
  return addDaysForward(key, -n);
}

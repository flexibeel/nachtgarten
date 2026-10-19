import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAMA, BEGIN, SOURCES } from '../../src/data/homeplans.js';
import {
  WEEK_GOAL, checklistKeys, confirmCheck, findPlan, homeSession, homeWeek, mamaPrompt, phaseById, todayPick, weekTip,
} from '../../src/domain/homeplans.js';
import { buildProgram, shortMinutes } from '../../src/domain/timer.js';
import { createMamaState, mamaStatus } from '../../src/domain/pregnancy.js';
import { TEXTS as de } from '../../src/data/texts/de.js';
import { TEXTS as en } from '../../src/data/texts/en.js';
import { at } from './helpers/fixtures.js';

const ALL = { mama: MAMA, begin: BEGIN };
const NOW = at(2026, 10, 21, 18, 0); // Mittwoch
const session = (date, planId) => ({ id: `${date}-${planId}`, date, kind: 'homeplan', planId, muscleSets: {}, setCount: 0 });

test('Inhalte vollständig: sechs Phasen, Pläne nach SPEC, Sicherheitslisten', () => {
  assert.deepEqual(MAMA.phases.map((p) => p.id), ['t1', 't2', 't3', 'pp0', 'pp1', 'pp2']);
  assert.deepEqual(MAMA.phases.map((p) => p.plans.map((x) => x.id).join(',')), ['t1a,t1b', 't2a,t2b', 't3a,t3b', 'pp0a', 'pp1a,pp1b', 'pp2a,pp2b']);
  assert.equal(MAMA.contraindications_absolute.length, 12);
  assert.equal(MAMA.contraindications_relative.length, 13);
  assert.equal(MAMA.stop_signs.length, 14);
  assert.equal(MAMA.principles.length, 17);
  assert.deepEqual(BEGIN.map((b) => b.id), ['b1', 'b2']);
  assert.match(SOURCES, /Mottola/);
  for (const id of ['pp0', 'pp1', 'pp2']) assert.ok(phaseById(MAMA, id).csection_notes?.length, `${id}: Kaiserschnitt-Hinweise`);
  assert.ok(phaseById(MAMA, 'pp2').return_to_running_criteria.length);
});

test('Warnzeichen im Text-Katalog stimmen mit den Inhalten überein', () => {
  assert.deepEqual(de['mama.stopSigns'], MAMA.stop_signs);
  assert.equal(en['mama.stopSigns'].length, MAMA.stop_signs.length);
});

test('jeder Plan lässt sich als Schrittfolge bauen, Minuten plausibel', () => {
  for (const phase of MAMA.phases) {
    for (const plan of phase.plans) {
      const steps = buildProgram(plan, { includeScar: true });
      assert.ok(steps.length > 3, plan.id);
      assert.ok(steps.every((s) => s.kind === 'rest' ? s.duration > 0 : s.duration === null || s.duration > 0), plan.id);
      assert.ok(shortMinutes(plan) < plan.minutes, plan.id);
      assert.ok(plan.level && plan.equipment.length, plan.id);
    }
  }
  const b1 = buildProgram(BEGIN[0]);
  assert.equal(b1[0].label, 'Marschieren auf der Stelle');
});

test('Narbenmobilisation nur nach Kaiserschnitt', () => {
  const pp1b = findPlan(ALL, 'pp1b').plan;
  const has = (steps) => steps.some((s) => /Narbenmobilisation/.test(s.label));
  assert.equal(has(buildProgram(pp1b)), false);
  assert.equal(has(buildProgram(pp1b, { includeScar: true })), true);
});

test('Ton: Inhalte sprechen über Wohlbefinden, nie über Figur oder Gewicht', () => {
  const text = JSON.stringify({ MAMA, BEGIN }).toLowerCase();
  for (const word of ['figur', 'abnehm', 'kalorie', 'straff', 'bikini', 'problemzone', 'zurück in form', 'flacher bauch']) {
    assert.ok(!text.includes(word), word);
  }
  const ui = Object.entries(de).filter(([k]) => k.startsWith('mama.') || k.startsWith('player.')).map(([, v]) => JSON.stringify(v)).join(' ');
  assert.ok(!/!/.test(ui), 'keine Ausrufezeichen');
});

test('findPlan: Phasen und Einsteigerpläne', () => {
  assert.equal(findPlan(ALL, 't2a').phase.id, 't2');
  assert.equal(findPlan(ALL, 'b1').phase, null);
  assert.equal(findPlan(ALL, 'nix'), null);
});

test('Heute für dich: erster Plan, dann abwechselnd, heute erledigt', () => {
  const t2 = phaseById(MAMA, 't2');
  assert.deepEqual([todayPick(t2, [], '2026-10-21').plan.id, todayPick(t2, [], '2026-10-21').doneToday], ['t2a', false]);
  assert.equal(todayPick(t2, [session('2026-10-19', 't2a')], '2026-10-21').plan.id, 't2b');
  assert.equal(todayPick(t2, [session('2026-10-19', 't2a'), session('2026-10-20', 't2b')], '2026-10-21').plan.id, 't2a');
  const done = todayPick(t2, [session('2026-10-21', 't2b')], '2026-10-21');
  assert.deepEqual([done.plan.id, done.doneToday], ['t2b', true]);
  // Pläne anderer Phasen und Aktivitäten zählen nicht
  assert.equal(todayPick(t2, [session('2026-10-20', 't1b'), { ...session('2026-10-20', 'run'), kind: 'activity' }], '2026-10-21').plan.id, 't2a');
});

test('Woche: Heimplan-Tage Mo–So, Ziel 3, Pläne gezählt', () => {
  const week = homeWeek([session('2026-10-19', 't2a'), session('2026-10-21', 't2b'), session('2026-10-12', 't2a'), { ...session('2026-10-20', 'x'), kind: 'strength' }], NOW);
  assert.deepEqual(week.days, [true, false, true, false, false, false, false]);
  assert.equal(week.todayIndex, 2);
  assert.equal(week.count, 2);
  assert.equal(week.goal, WEEK_GOAL);
  assert.deepEqual(week.plansDone, { t2a: 1, t2b: 1 });
});

test('Wochentipp: notes[Woche mod Anzahl]', () => {
  const t1 = phaseById(MAMA, 't1');
  assert.equal(weekTip(t1, 0), t1.notes[0]);
  assert.equal(weekTip(t1, t1.notes.length + 1), t1.notes[1]);
});

test('Abfragen: Baby da?, nächster Schritt (mit Narbe), neue Phase – höchstens eine', () => {
  const preg = { ...createMamaState({ mode: 'preg', date: '2026-10-15' }), seenPhase: 't3' };
  assert.deepEqual(mamaPrompt(preg, mamaStatus(preg, '2026-10-21')), { kind: 'askBirth' });

  const post = { ...createMamaState({ mode: 'post', date: '2026-08-20', cesarean: true }), seenPhase: 'pp0' };
  const status = mamaStatus(post, '2026-10-21'); // 8 Wochen
  assert.deepEqual(mamaPrompt(post, status), { kind: 'check', needs: 'pp1' });
  assert.deepEqual(checklistKeys('pp1', true), ['mama.check6a', 'mama.check6b', 'mama.check6c', 'mama.checkScar']);
  assert.deepEqual(checklistKeys('pp2', false), ['mama.check12a', 'mama.check12b', 'mama.check12c']);

  const ok = confirmCheck(post, 'pp1');
  const next = mamaStatus(ok, '2026-10-21');
  assert.equal(next.phase, 'pp1');
  assert.deepEqual(mamaPrompt(ok, next), { kind: 'newPhase', phase: 'pp1' });
  assert.equal(mamaPrompt({ ...ok, seenPhase: 'pp1' }, next), null);
  assert.equal(confirmCheck(post, 'pp2').check12, true);
});

test('Protokoll-Eintrag eines Heimplans', () => {
  const plan = findPlan(ALL, 't2a').plan;
  const s = homeSession(plan, { now: NOW });
  assert.deepEqual(
    { kind: s.kind, planId: s.planId, name: s.name, date: s.date, durationMin: s.durationMin, setCount: s.setCount },
    { kind: 'homeplan', planId: 't2a', name: plan.name, date: '2026-10-21', durationMin: plan.minutes, setCount: 0 },
  );
  assert.equal(homeSession(plan, { now: NOW, short: true }).durationMin, shortMinutes(plan));
});

test('Inhalte wörtlich wie in der klassischen Version (src/app.html)', () => {
  const source = readFileSync(new URL('../../src/app.html', import.meta.url), 'utf8');
  const v1 = JSON.parse(source.match(/const MAMA=(\{.*?\});\n/s)[1]);
  const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v === null ? undefined : v)));
  assert.deepEqual(MAMA, strip(v1));
});

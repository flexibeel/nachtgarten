import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ITEM, MAX_SESSIONS, dropProgram, editProgram, itemLabel, newProgram, planIdOf, programFromTemplate, programHints, syncProgram } from '../../src/domain/plan-editor.js';
import { PLAN_TEMPLATES } from '../../src/data/plans.js';
import { libraryIdFor } from '../../src/data/plan-exercise-map.js';

const base = () => newProgram({ name: 'Mein Plan', sessionName: 'Oberkörper', now: 1000 });
const run = (p, ...actions) => actions.reduce(editProgram, p);

test('Editor: Einheiten anlegen, umbenennen, entfernen (die letzte bleibt), wiederherstellen', () => {
  let p = base();
  assert.deepEqual(p.sessions.map((s) => s.id), ['A']);
  p = run(p, { type: 'addSession', name: 'Beine' }, { type: 'renameSession', session: 'B', name: 'Unterkörper' }, { type: 'rename', name: 'Zwei Tage' });
  assert.deepEqual(p.sessions.map((s) => [s.id, s.name]), [['A', 'Oberkörper'], ['B', 'Unterkörper']]);
  assert.equal(p.name, 'Zwei Tage');
  p = run(p, { type: 'toggleDay', session: 'B', day: 3 });
  const removed = p.sessions[1];
  p = run(p, { type: 'removeSession', session: 'B' });
  assert.deepEqual(p.sessions.map((s) => s.id), ['A']);
  assert.equal(p.week[3], null, 'Tag wird frei');
  assert.equal(run(p, { type: 'removeSession', session: 'A' }), p, 'letzte Einheit bleibt');
  p = run(p, { type: 'restoreSession', index: 1, value: removed, days: [3] });
  assert.deepEqual([p.sessions.map((s) => s.id), p.week[3]], [['A', 'B'], 'B']);
  let full = p;
  for (let i = 0; i < 10; i++) full = run(full, { type: 'addSession', name: '' });
  assert.equal(full.sessions.length, MAX_SESSIONS);
  assert.equal(run(p, { type: 'unbekannt' }), p);
});

test('Editor: Übungen hinzufügen (mehrere), verschieben, löschen mit Rückgängig, bearbeiten mit Grenzen', () => {
  let p = run(base(), { type: 'addItems', session: 'A', exercises: ['bench', 'latpull', 'ohp'] });
  assert.deepEqual(p.sessions[0].items.map((i) => i.exercise), ['bench', 'latpull', 'ohp']);
  assert.deepEqual(p.sessions[0].items[0], { exercise: 'bench', ...DEFAULT_ITEM });
  p = run(p, { type: 'moveItem', session: 'A', from: 2, to: 0 });
  assert.deepEqual(p.sessions[0].items.map((i) => i.exercise), ['ohp', 'bench', 'latpull']);
  assert.equal(run(p, { type: 'moveItem', session: 'A', from: 0, to: 9 }), p, 'außerhalb: nichts');
  const gone = p.sessions[0].items[1];
  const after = run(p, { type: 'removeItem', session: 'A', index: 1 });
  assert.deepEqual(after.sessions[0].items.map((i) => i.exercise), ['ohp', 'latpull']);
  const undone = run(after, { type: 'restoreItem', session: 'A', index: 1, item: gone });
  assert.deepEqual(undone.sessions[0].items, p.sessions[0].items, 'Rückgängig stellt an derselben Stelle wieder her');
  p = run(p, { type: 'updateItem', session: 'A', index: 0, patch: { sets: 99, reps: [12, 6], rir: [-1, 9], rest: 5 } });
  const it = p.sessions[0].items[0];
  assert.deepEqual([it.sets, it.reps, it.rir, it.rest], [10, [12, 12], [0, 5], 15]);
  assert.equal(itemLabel({ ...it, sets: 3, reps: [8, 10] }), '3 × 8–10');
  assert.equal(itemLabel({ ...it, sets: 2, reps: [5, 5] }), '2 × 5');
  assert.equal(base().sessions[0].items.length, 0, 'Ausgangsprogramm unverändert');
});

test('Editor: Wochentage – ein Tag hat höchstens eine Einheit', () => {
  let p = run(base(), { type: 'addSession', name: 'B' }, { type: 'toggleDay', session: 'A', day: 0 }, { type: 'toggleDay', session: 'B', day: 2 });
  assert.deepEqual(p.week, ['A', null, 'B', null, null, null, null]);
  p = run(p, { type: 'toggleDay', session: 'B', day: 0 });
  assert.equal(p.week[0], 'B', 'umgelegt');
  p = run(p, { type: 'toggleDay', session: 'B', day: 0 });
  assert.equal(p.week[0], null, 'erneut tippen nimmt weg');
  assert.equal(run(p, { type: 'toggleDay', session: 'A', day: 7 }), p);
});

test('Editor: Übertragen in Pläne und Wochenplan, fremde Pläne und Aktivitäten bleiben', () => {
  let p = run(base(), { type: 'addItems', session: 'A', exercises: ['bench'] }, { type: 'addSession', name: 'Beine' }, { type: 'addItems', session: 'B', exercises: ['press~horizontal'] }, { type: 'toggleDay', session: 'A', day: 0 }, { type: 'toggleDay', session: 'B', day: 3 });
  const other = { id: 'gk3-a', name: 'Ganzkörper A', items: [] };
  const synced = syncProgram(p, { plans: [other], schedule: { 0: { kind: 'plan', id: 'gk3-a' }, 5: { kind: 'activity', id: 'run' } } });
  assert.deepEqual(synced.plans.map((x) => x.id), ['gk3-a', planIdOf(p, 'A'), planIdOf(p, 'B')]);
  assert.deepEqual(synced.plans[1].items[0], { exercise: 'bench', sets: 3, reps: '8–12', rir: [1, 2], rest: 90 });
  assert.deepEqual(synced.schedule, { 0: { kind: 'plan', id: planIdOf(p, 'A') }, 3: { kind: 'plan', id: planIdOf(p, 'B') }, 5: { kind: 'activity', id: 'run' } });
  // erneut übertragen ersetzt, statt zu verdoppeln
  const again = syncProgram(run(p, { type: 'removeSession', session: 'B' }), synced);
  assert.deepEqual(again.plans.map((x) => x.id), ['gk3-a', planIdOf(p, 'A')]);
  assert.equal(again.schedule[3], undefined);
  const dropped = dropProgram(p, synced);
  assert.deepEqual(dropped.plans.map((x) => x.id), ['gk3-a']);
  assert.deepEqual(Object.keys(dropped.schedule), ['5']);
});

test('Aus Vorlage starten: Einheiten, Werte und Woche der Vorlage, eigene Id', () => {
  const tpl = PLAN_TEMPLATES.find((t) => t.id === 'ou4');
  const p = programFromTemplate(tpl, { now: 5, mapId: (id) => (id === 'press' ? 'press~horizontal' : id) });
  assert.equal(p.id, 'p5');
  assert.equal(p.template, 'ou4');
  assert.equal(p.sessions.length, tpl.sessions.length);
  assert.equal(p.week.filter(Boolean).length, tpl.daysPerWeek);
  const first = tpl.sessions[0].items[0];
  assert.deepEqual(p.sessions[0].items[0].reps, first.reps);
  assert.equal(PLAN_TEMPLATES.length, 10, 'zehn Vorlagen');
});

test('Sanfte Hinweise: Frequenz zuerst, höchstens drei, nie bei leerem Plan', () => {
  assert.deepEqual(programHints(base()), []);
  let p = run(base(), { type: 'addItems', session: 'A', exercises: ['bench', 'latpull', 'legcurl', 'squat'] });
  assert.deepEqual(programHints(p), [], 'ohne Wochentage keine Hinweise');
  p = run(p, { type: 'toggleDay', session: 'A', day: 0 });
  const hints = programHints(p);
  assert.ok(hints.length > 0 && hints.length <= 3);
  assert.equal(hints[0].code, 'frequency');
  assert.match(hints[0].text, /nur 1× pro Woche/);
  for (const tpl of PLAN_TEMPLATES) {
    assert.deepEqual(programHints(programFromTemplate(tpl, { now: 1, mapId: libraryIdFor })), [], `${tpl.id}: unveränderte Vorlage soll still sein`);
  }
});

test('Vorlage: Gerät tauschen behält die Zuordnung, andere Übung nicht', () => {
  const tpl = PLAN_TEMPLATES.find((t) => t.id === 'gk3');
  let p = programFromTemplate(tpl, { now: 1, mapId: libraryIdFor });
  const s = p.sessions[2];
  const idx = s.items.findIndex((it) => it.exercise === 'press');
  assert.ok(idx >= 0);
  p = editProgram(p, { type: 'updateItem', session: s.id, index: idx, patch: { exercise: 'press~horizontal' } });
  assert.equal(p.sessions[2].items[idx].src, 'press');
  p = editProgram(p, { type: 'updateItem', session: s.id, index: idx, patch: { exercise: 'plank' } });
  assert.equal(p.sessions[2].items[idx].src, undefined);
});

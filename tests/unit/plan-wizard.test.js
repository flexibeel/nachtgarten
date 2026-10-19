import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { WIZARD_OPTIONS, WIZARD_STEPS, experienceGuess, focusFromGoal, isComplete, wizardQuery, wizardResults } from '../../src/domain/plan-wizard.js';
import { PLAN_EXERCISES } from '../../src/data/plans.js';
import { G_MAP, libraryIdFor } from '../../src/data/plan-exercise-map.js';
import { CURATED } from '../../src/data/library.js';
import { EXDB } from '../../src/data/exercise-db.js';

test('Vier Fragen, jede mit festen Antworten', () => {
  assert.deepEqual([...WIZARD_STEPS], ['days', 'minutes', 'where', 'experience']);
  assert.deepEqual([...WIZARD_OPTIONS.days], [2, 3, 4, 5, 6]);
  assert.ok(!isComplete({ days: 3, minutes: 45, where: 'gym' }));
  assert.ok(isComplete({ days: 3, minutes: 45, where: 'gym', experience: 'neu' }));
});

test('Antworten → Anfrage für recommendPlans', () => {
  const q = wizardQuery({ days: 4, minutes: 60, where: 'home', experience: 'etwas' }, { goal: 'Kraft' });
  assert.deepEqual(q, { daysPerWeek: 4, minutesPerSession: 60, equipment: ['home'], experience: 'etwas', focus: 'kraft' });
  assert.equal(wizardQuery({ days: 3, minutes: 75, where: 'gym', experience: 'neu' }).minutesPerSession, 90, '75+ = offen');
  assert.equal(focusFromGoal('Abnehmen'), 'fit');
  assert.equal(focusFromGoal(''), 'muskel');
  assert.equal(experienceGuess([]), 'neu');
  assert.equal(experienceGuess([{ kind: 'activity' }, { kind: 'strength' }]), 'etwas');
});

test('Vorschläge passen zu den Antworten', () => {
  const studio = wizardResults({ days: 3, minutes: 45, where: 'gym', experience: 'neu' }, { goal: 'Muskelaufbau' });
  assert.equal(studio.length, 3);
  assert.equal(studio[0].id, 'gk3');
  const none = wizardResults({ days: 2, minutes: 30, where: 'none', experience: 'neu' });
  assert.ok(none.length >= 1 && none.every((r) => r.plan.equipment === 'none'));
  const pro = wizardResults({ days: 6, minutes: 75, where: 'gym', experience: 'erfahren' });
  assert.equal(pro[0].id, 'ppl6');
});

test('Jede g_-Übung ist zugeordnet; Ziele existieren in der Bibliothek', () => {
  const ids = new Set(CURATED.map((e) => e.id));
  for (const id of Object.keys(PLAN_EXERCISES).filter((k) => k.startsWith('g_'))) {
    const link = G_MAP[id];
    assert.ok(link, `${id} fehlt in G_MAP`);
    if (link.to?.startsWith('db')) assert.ok(EXDB[Number(link.to.slice(2))], `${id} → ${link.to}`);
    else if (link.to) assert.ok(ids.has(link.to), `${id} → ${link.to}`);
    if (!link.exact) assert.equal(link.cues?.length, 3, `${id}: eigene Hinweise`);
    assert.equal(libraryIdFor(id), link.exact ? link.to : id);
  }
  assert.equal(libraryIdFor('bench'), 'bench');
  // Stichprobe: die exakten Treffer heißen wirklich so
  assert.match(EXDB[279][0], /Incline Dumbbell Press/);
  assert.match(EXDB[154][0], /Dead Bug/);
});

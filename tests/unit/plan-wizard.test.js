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

test('Vorlage übernehmen: Pläne mit Bibliotheks-Ids, Wochenplan, eigene Pläne bleiben', async () => {
  const { adoptTemplate, sessionChip } = await import('../../src/domain/plan-wizard.js');
  const { planById } = await import('../../src/data/plans.js');
  const { weekOf } = await import('../../src/domain/plan-select.js');
  const home = planById('home');
  const week = weekOf(home, { days: 3 });
  const own = { id: 'p1', name: 'Mein Plan', items: [] };
  const old = { id: 'gk2-a', name: 'alt', items: [] };
  const schedule = { 0: { kind: 'plan', id: 'p1' }, 5: { kind: 'activity', id: 'run' } };
  const r = adoptTemplate(home, { week, plans: [own, old], schedule, previous: 'gk2' }, libraryIdFor);
  assert.ok(r.plans.includes(own) && !r.plans.some((p) => p.id === 'gk2-a'));
  const adopted = r.plans.filter((p) => p.template === 'home');
  assert.equal(adopted.length, home.sessions.length);
  const ids = adopted.flatMap((p) => p.items.map((it) => it.exercise));
  assert.ok(ids.includes('db29') && ids.includes('db361'), 'Pull-Apart und Seitheben liegend → Bibliothek');
  assert.ok(ids.includes('g_bulgarian'), 'nur verwandt: eigene Id bleibt');
  assert.ok(!ids.some((id) => G_MAP[id]?.exact), 'keine exakt zugeordnete g_-Id übrig');
  assert.deepEqual(r.schedule[5], { kind: 'activity', id: 'run' });
  assert.equal(r.days, 3);
  week.forEach((s, d) => assert.equal(r.schedule[d]?.id, s ? `home-${s}`.toLowerCase() : d === 5 ? 'run' : undefined));
  assert.equal(sessionChip({ id: 'A', name: 'Ganzkörper A' }), 'A');
  assert.equal(sessionChip({ id: 'PUSH_A', name: 'Push A (schwer)' }), 'Push');
});

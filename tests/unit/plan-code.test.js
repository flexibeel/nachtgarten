import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { compactPlan, decodePlan, encodePlan, expandPlan } from '../../src/domain/plan-code.js';
import { PLAN_TEMPLATES } from '../../src/data/plans.js';

const PLAN = { id: 'x', name: 'Oberkörper „A“', items: [
  { exercise: 'bench', sets: 3, reps: '8–10' },
  { exercise: 'latpull', sets: 3, reps: '10–12' },
  { exercise: 'mine-1', sets: 2, reps: '45 s' },
] };

test('Plan als Link: hin und zurück, komprimiert und als Rückfall', async () => {
  const custom = (id) => (id === 'mine-1' ? 'Meine Übung' : undefined);
  for (const deflate of [true, false]) {
    const code = await encodePlan(PLAN, custom, { deflate });
    assert.match(code, /^[zj][\w-]+$/, 'nur URL-sichere Zeichen');
    assert.equal(code[0], deflate ? 'z' : 'j');
    const back = await decodePlan(code);
    assert.equal(back.name, PLAN.name);
    assert.deepEqual(back.items.map((it) => [it.exercise, it.sets, it.reps]), PLAN.items.map((it) => [it.exercise, it.sets, it.reps]));
    assert.equal(back.items[2].name, 'Meine Übung');
    assert.equal(back.items[0].name, undefined);
  }
});

test('Plan als Link: übliche Pläne bleiben kurz', async () => {
  const sessions = PLAN_TEMPLATES.flatMap((tpl) => tpl.sessions);
  const longest = sessions.reduce((a, x) => (x.items.length > a.items.length ? x : a));
  const plan = { name: longest.name, items: longest.items.map((it) => ({ exercise: it.ex, sets: it.sets, reps: Array.isArray(it.reps) ? it.reps.join('–') : String(it.reps) })) };
  const code = await encodePlan(plan);
  assert.ok(code.length < 600, `Link zu lang: ${code.length}`);
});

test('Plan als Link: Fremdes und Kaputtes wird abgewiesen', async () => {
  assert.equal(await decodePlan(''), null);
  assert.equal(await decodePlan('zkaputt!!'), null);
  assert.equal(await decodePlan('j' + Buffer.from('{"a":1}').toString('base64url')), null);
  assert.equal(expandPlan([2, 'x', [['bench', 3, '8']]]), null, 'unbekannte Version');
  assert.equal(expandPlan([1, 'x', [['<script>', 3, '8']]]), null, 'ungültige Id');
  assert.equal(expandPlan([1, 'x', [['bench', 0, '8']]]), null, 'Sätze außerhalb');
  assert.equal(expandPlan([1, '  ', [['bench', 3, '8']]]), null, 'ohne Namen');
  assert.equal(expandPlan([1, 'x', []]), null, 'ohne Übungen');
  const big = expandPlan([1, 'x'.repeat(500), Array.from({ length: 99 }, () => ['bench', 3, '8'.repeat(50)])]);
  assert.equal(big.name.length, 60);
  assert.equal(big.items.length, 40);
  assert.equal(big.items[0].reps.length, 12);
  assert.deepEqual(compactPlan(PLAN)[2][0], ['bench', 3, '8–10']);
});

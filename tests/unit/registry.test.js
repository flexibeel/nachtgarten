import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../../src/features/registry.js';
import { createAppRegistry } from '../../src/features/modules.js';

const noop = () => ({ el: null });
const mount = () => {};

function sample() {
  return createRegistry()
    .register({
      id: 'train',
      label: 'Training',
      hint: '',
      icon: 'training',
      views: [
        { route: 'training', title: 'Training', tab: { label: 'Training', icon: 'training' }, mount },
        { route: 'live', title: 'Live', chrome: 'bare', aliases: ['sport'], modules: ['train', 'mama'], mount },
      ],
      tiles: [
        { id: 'sport', title: 'Sport', render: noop, modules: ['train', 'mama'] },
        { id: 'week', title: 'Woche', render: noop },
      ],
    })
    .register({
      id: 'mama',
      label: 'Mama',
      hint: '',
      icon: 'mama',
      views: [{ route: 'mama', title: 'Mama', tab: { label: 'Mama', icon: 'mama' }, mount }],
      tiles: [{ id: 'mama', title: 'Mama', render: noop, size: 'small' }],
    })
    .register({ id: 'habits', label: 'Gewohnheiten', hint: '', icon: 'leaf', tiles: [{ id: 'habit', title: 'Gewohnheit', render: noop }] });
}

test('Registry: Kacheln nur von eingeschalteten Modulen, gemeinsame Kacheln einmal', () => {
  const r = sample();
  assert.deepEqual(r.ids(), ['train', 'mama', 'habits']);
  assert.deepEqual(r.tiles(['train', 'habits']).map((t) => t.id), ['sport', 'week', 'habit']);
  assert.deepEqual(r.tiles(['mama']).map((t) => t.id), ['sport', 'mama'], 'Sport auch für Mama, Woche nicht');
  assert.deepEqual(r.tiles(['habits']).map((t) => t.id), ['habit']);
  assert.equal(r.tiles(['mama'])[1].module, 'mama');
  assert.equal(r.tiles(['mama'])[1].size, 'small');
});

test('Registry: Reihenfolge der Kacheln folgt tileOrder', () => {
  const r = sample();
  assert.deepEqual(r.tiles(['train', 'mama', 'habits'], ['habit', 'mama']).map((t) => t.id), ['habit', 'mama', 'sport', 'week']);
});

test('Registry: Tabs, Routen, Aliase und gesperrte Ansichten', () => {
  const r = sample();
  assert.deepEqual(r.tabs(['train']).map((t) => t.route), ['training']);
  assert.deepEqual(r.tabs(['mama', 'habits']).map((t) => t.route), ['mama']);
  assert.deepEqual(r.routes(), ['training', 'live', 'mama']);
  assert.deepEqual(r.aliases(), { sport: 'live' });
  assert.equal(r.view('training', ['mama']), null, 'ausgeschaltet = nicht erreichbar');
  assert.equal(r.view('live', ['mama'])?.module, 'train');
  assert.equal(r.view('gibtsnicht', ['train']), null);
});

test('Registry: doppelte Module, Routen oder Kacheln werden abgelehnt', () => {
  const r = sample();
  assert.throws(() => r.register({ id: 'train', label: '', hint: '', icon: '' }), /Modul doppelt/);
  assert.throws(() => r.register({ id: 'x', label: '', hint: '', icon: '', views: [{ route: 'sport', title: '', mount }] }), /Route doppelt/);
  assert.throws(() => r.register({ id: 'y', label: '', hint: '', icon: '', tiles: [{ id: 'week', title: '', render: noop }] }), /Kachel doppelt/);
});

test('App-Registry: alle Module angemeldet, Standard zeigt Training und Gewohnheiten', () => {
  const r = createAppRegistry();
  assert.deepEqual(r.ids(), ['train', 'mama', 'habits', 'handy', 'ideen']);
  assert.deepEqual(r.enabled(null), ['train', 'habits']);
  assert.deepEqual(r.tiles(null).map((t) => t.id), ['sport', 'week', 'one-thing', 'habit', 'dump']);
  assert.deepEqual(r.tabs(null).map((t) => t.route), ['training']);
  assert.deepEqual(r.tabs(['ideen']).map((t) => t.route), ['ideen'], 'Ideen-Labor nur, wenn an');
  assert.equal(r.view('fokus', ['train']), null);
  assert.equal(r.aliases().umlenken, 'fokus');
  for (const m of r.list()) assert.ok(m.label && m.hint && m.icon, m.id);
});

import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry } from '../../src/features/registry.js';
import { createAppRegistry } from '../../src/features/modules.js';
import { TEXTS as DE } from '../../src/data/texts/de.js';

const noop = () => ({ el: null });
const mount = () => {};

function sample() {
  return createRegistry()
    .register({
      id: 'train',
      labelKey: 'module.train.label',
      hintKey: 'module.train.hint',
      icon: 'training',
      views: [
        { route: 'training', titleKey: 'view.training', tab: { labelKey: 'tab.training', icon: 'training' }, mount },
        { route: 'live', titleKey: 'view.live', chrome: 'bare', aliases: ['sport'], modules: ['train', 'mama'], mount },
      ],
      tiles: [
        { id: 'sport', titleKey: 'tile.sport', render: noop, modules: ['train', 'mama'] },
        { id: 'week', titleKey: 'tile.week', render: noop },
      ],
    })
    .register({
      id: 'mama',
      labelKey: 'module.mama.label',
      hintKey: 'module.mama.hint',
      icon: 'mama',
      views: [{ route: 'mama', titleKey: 'view.mama', tab: { labelKey: 'tab.mama', icon: 'mama' }, mount }],
      tiles: [{ id: 'mama', titleKey: 'tile.mama', render: noop, size: 'small' }],
    })
    .register({ id: 'habits', labelKey: 'module.habits.label', hintKey: 'module.habits.hint', icon: 'leaf', tiles: [{ id: 'habit', titleKey: 'tile.habit', render: noop }] });
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
  assert.throws(() => r.register({ id: 'train', labelKey: '', hintKey: '', icon: '' }), /Modul doppelt/);
  assert.throws(() => r.register({ id: 'x', labelKey: '', hintKey: '', icon: '', views: [{ route: 'sport', titleKey: '', mount }] }), /Route doppelt/);
  assert.throws(() => r.register({ id: 'y', labelKey: '', hintKey: '', icon: '', tiles: [{ id: 'week', titleKey: '', render: noop }] }), /Kachel doppelt/);
});

test('App-Registry: alle Module angemeldet, Standard zeigt Training und Gewohnheiten', () => {
  const r = createAppRegistry();
  assert.deepEqual(r.ids(), ['train', 'mama', 'habits', 'handy', 'ideen']);
  assert.deepEqual(r.enabled(null), ['train', 'habits']);
  assert.deepEqual(r.tiles(null).map((t) => t.id), ['garden', 'sport', 'week', 'one-thing', 'habit', 'dump']);
  assert.deepEqual(r.tabs(null).map((t) => t.route), ['training']);
  assert.deepEqual(r.tabs(['ideen']).map((t) => t.route), ['ideen'], 'Ideen-Labor nur, wenn an');
  assert.equal(r.view('fokus', ['train']), null);
  assert.equal(r.aliases().umlenken, 'fokus');
  // Alle Beschriftungen sind vorhandene Text-Schlüssel.
  const keys = [
    ...r.list().flatMap((m) => [m.labelKey, m.hintKey, ...(m.views ?? []).flatMap((v) => [v.titleKey, v.tab?.labelKey, `placeholder.${v.route}`])]),
    ...r.allTiles().map((x) => x.titleKey),
  ].filter(Boolean);
  for (const k of keys) assert.ok(k in DE, `Text fehlt: ${k}`);
  for (const m of r.list()) assert.ok(m.icon, m.id);
});

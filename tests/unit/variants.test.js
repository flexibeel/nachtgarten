import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { VARIANT_GROUPS } from '../../src/data/variants.js';
import { CURATED } from '../../src/data/library.js';
import { EXDB } from '../../src/data/exercise-db.js';
import { TEXTS as de } from '../../src/data/texts/de.js';
import { TEXTS as en } from '../../src/data/texts/en.js';
import { applyVariants, baseOf, isDerived, preferredVariant, rememberVariant, siblingsOf, swapInQueue, variantOf } from '../../src/domain/variants.js';
import { showIntro } from '../../src/domain/live-session.js';

const curated = new Set(CURATED.map((c) => c.id));
const exists = (id) => (isDerived(id) ? curated.has(baseOf(id)) : curated.has(id) || (/^db\d+$/.test(id) && !!EXDB[Number(id.slice(2))]));

test('Varianten-Daten: jede Übung gibt es, nur in einer Gruppe, mit Chip-Text in beiden Sprachen', () => {
  const seen = new Set();
  for (const group of VARIANT_GROUPS) {
    assert.ok(group.variants.length >= 2, `${group.id}: mindestens zwei Varianten`);
    for (const v of group.variants) {
      assert.ok(exists(v.id), `${group.id}: unbekannte Übung ${v.id}`);
      assert.ok(!seen.has(v.id), `${v.id} steht in zwei Gruppen`);
      seen.add(v.id);
      assert.ok(de[v.label] && en[v.label], `Text fehlt: ${v.label}`);
    }
  }
  // Felix’ Beispiel: Beinpresse 45°, horizontal, Hackenschmidt, Kurzhantel-Alternative
  assert.deepEqual(siblingsOf('press').map((v) => v.id), ['press', 'press~horizontal', 'db253', 'goblet']);
  assert.equal(EXDB[253][0], 'Hack Squat');
});

test('Varianten: abgeleitete Ids, bevorzugte Wahl, Warteschlange', () => {
  assert.equal(isDerived('press~horizontal'), true);
  assert.equal(baseOf('press~horizontal'), 'press');
  assert.equal(baseOf('bench'), 'bench');
  assert.equal(variantOf('k_row').group.id, 'row');
  assert.equal(variantOf('plank'), null);
  assert.deepEqual(siblingsOf('plank'), []);
  let chosen = rememberVariant({}, 'press~horizontal');
  assert.deepEqual(chosen, { legpress: 'press~horizontal' });
  assert.equal(rememberVariant(chosen, 'plank'), chosen, 'ohne Gruppe nichts merken');
  assert.equal(preferredVariant('press', chosen), 'press~horizontal');
  assert.equal(preferredVariant('db253', chosen), 'press~horizontal', 'Gruppe zählt, nicht die Übung');
  assert.equal(preferredVariant('bench', chosen), 'bench');
  assert.equal(preferredVariant('press', { legpress: 'quatsch' }), 'press', 'ungültige Wahl ignorieren');
  const queue = { name: 'Beine', items: [{ exercise: 'press', sets: 3 }, { exercise: 'plank', sets: 2 }] };
  assert.deepEqual(applyVariants(queue, chosen).items.map((it) => it.exercise), ['press~horizontal', 'plank']);
  assert.deepEqual(swapInQueue(queue, 'press', 'db253').items.map((it) => it.exercise), ['db253', 'plank']);
  assert.equal(queue.items[0].exercise, 'press', 'Plan bleibt unverändert');
});

test('„So geht’s“ vor der Übung: nur beim ersten Mal, nie mitten in der Übung', () => {
  assert.equal(showIntro({ setsToday: 0, hasHistory: false, seen: false }), true);
  assert.equal(showIntro({ setsToday: 0, hasHistory: true, seen: false }), false, 'schon trainiert');
  assert.equal(showIntro({ setsToday: 0, hasHistory: false, seen: true }), false, 'schon gesehen');
  assert.equal(showIntro({ setsToday: 1, hasHistory: false, seen: false, setting: 'always' }), false, 'nicht bei Satz 2');
  assert.equal(showIntro({ setsToday: 0, hasHistory: true, seen: true, setting: 'always' }), true);
  assert.equal(showIntro({ setsToday: 0, hasHistory: false, seen: false, setting: 'never' }), false);
});

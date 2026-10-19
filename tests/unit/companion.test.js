import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { companionOf, withCompanion } from '../../src/domain/companion.js';
import { DEFAULT_SPECIES, SPECIES, speciesInfo } from '../../src/data/companions.js';
import { COMPANION_LINES, ONBOARDING_LINES, SPECIES_LINES, TONES, companionLine, fillLine, linePool } from '../../src/data/texts/companion.js';
import { convertV1 } from '../../src/domain/migrate.js';
import { STAGE_COUNT } from '../../src/domain/buddy.js';

test('Begleiter aus dem Profil, mit Standard-Art und -Namen', () => {
  assert.deepEqual(companionOf(null), { species: 'keimling', name: 'Keimi' });
  assert.deepEqual(companionOf({ companion: { species: 'keimling', name: '  Bohne ' } }), { species: 'keimling', name: 'Bohne' });
  assert.deepEqual(companionOf({ companion: { species: 'drache', name: '' } }), { species: DEFAULT_SPECIES, name: 'Keimi' }, 'unbekannte Art → Standard');
  assert.deepEqual(withCompanion({ companion: { species: 'keimling', name: 'Bohne' } }, { name: '' }), { species: 'keimling', name: 'Keimi' });
  assert.equal(companionOf({ companion: { species: 'keimling', name: 'x'.repeat(40) } }).name.length, 16);
});

test('Jede Art hat Standardnamen und so viele Stufen-Namen wie das Wachstum', () => {
  for (const sp of SPECIES) {
    assert.ok(sp.defaultName, sp.id);
    assert.equal(sp.stageNames.length, STAGE_COUNT, sp.id);
  }
  assert.equal(speciesInfo(undefined).id, DEFAULT_SPECIES);
});

test('Sätze: Platzhalter {name} = Begleiter, {user} = Person', () => {
  assert.equal(fillLine('Ich bin {name}. Hallo{, user}, {user}!', { name: 'Fanti', user: 'Lena' }), 'Ich bin Fanti. Hallo, Lena, Lena!');
  assert.equal(fillLine('Hallo{, user}. Wer bist du, {user}?', { name: 'Fanti' }), 'Hallo. Wer bist du, du?');
  assert.equal(companionLine('tap', { species: 'keimling', tone: 'motiv', name: 'Fanti', random: () => 0 }), 'Hi, ich bin Fanti!');
});

test('Keine fest eingebauten Namen, keine offenen Platzhalter, Art-Sätze nur bei ihrer Art', () => {
  const all = [...Object.values(COMPANION_LINES).flatMap((t) => Object.values(t).flat()), ...Object.values(ONBOARDING_LINES)];
  for (const line of all) {
    assert.ok(!/Keimi|Keimling/.test(line), `Name fest im Text: ${line}`);
    assert.ok(!/Blatt|Blätter|Pflanze|gieß/i.test(line), `artspezifisch im allgemeinen Text: ${line}`);
    const rest = fillLine(line, { name: 'X', user: 'Y', count: 2 });
    assert.ok(!/\{[^}]*\}/.test(rest), `offener Platzhalter: ${line}`);
  }
  assert.ok(linePool('night', 'ruhig', 'keimling').some((l) => l.includes('Blätter')));
  assert.ok(!linePool('night', 'ruhig', 'elefant').some((l) => l.includes('Blätter')));
  assert.deepEqual(linePool('gibtsnicht', 'gibtsnicht', 'keimling'), linePool('tap', 'motiv', 'keimling'));
  assert.deepEqual(TONES.map((t) => t.id).sort(), Object.keys(COMPANION_LINES).sort());
  for (const tones of Object.values(SPECIES_LINES)) for (const t of Object.keys(tones)) assert.ok(t in COMPANION_LINES);
});

test('Tonregeln: keine Körperideal- oder Essens-Belohnungs-Sprache', () => {
  const all = Object.values(COMPANION_LINES).flatMap((t) => Object.values(t).flat()).concat(Object.values(SPECIES_LINES).flatMap((t) => Object.values(t).flatMap((c) => Object.values(c).flat())));
  for (const line of all) assert.ok(!/abnehmen|Figur|Kalorie|Snack|Bikini|Problemzone|schlank/i.test(line), line);
});

test('v1-Übernahme: eigener Begleiter-Name landet im Profil', () => {
  const d = convertV1({
    'lab.profile': JSON.stringify({ name: 'Felix', goal: 'Kraft', days: 3 }),
    'lab.buddy': JSON.stringify({ name: 'Bohne', tone: 'ruhig', on: false }),
  });
  assert.deepEqual(d.profile.companion, { species: 'keimling', name: 'Bohne' });
  assert.equal(d.buddy.tone, 'ruhig');
  assert.equal(d.buddy.on, false);
  assert.equal('name' in d.buddy, false);
});

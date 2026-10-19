import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { companionOf, withCompanion } from '../../src/domain/companion.js';
import { DEFAULT_SPECIES, SPECIES, speciesInfo } from '../../src/data/companions.js';
import { COMPANION_TEXTS, TONES, companionLine, fillLine, linePool, onboardingLine } from '../../src/data/texts/companion.js';
import { setLang, tList } from '../../src/data/texts/i18n.js';
import { convertV1 } from '../../src/domain/migrate.js';
import { STAGE_COUNT } from '../../src/domain/buddy.js';

/** Alle Sätze einer Sprache (allgemein, Onboarding, Art). */
const allLines = (texts) => [
  ...Object.values(texts.lines).flatMap((tone) => Object.values(tone).flat()),
  ...Object.values(texts.onboarding),
  ...Object.values(texts.species).flatMap((tones) => Object.values(tones).flatMap((c) => Object.values(c).flat())),
];
const placeholders = (s) => [...s.matchAll(/\{[^}]*\}/g)].map((m) => m[0]).sort();

test('Begleiter aus dem Profil, mit Standard-Art und -Namen', () => {
  assert.deepEqual(companionOf(null), { species: 'keimling', name: 'Keimi' });
  assert.deepEqual(companionOf({ companion: { species: 'keimling', name: '  Bohne ' } }), { species: 'keimling', name: 'Bohne' });
  assert.deepEqual(companionOf({ companion: { species: 'drache', name: '' } }), { species: DEFAULT_SPECIES, name: 'Keimi' }, 'unbekannte Art → Standard');
  assert.deepEqual(withCompanion({ companion: { species: 'keimling', name: 'Bohne' } }, { name: '' }), { species: 'keimling', name: 'Keimi' });
  assert.equal(companionOf({ companion: { species: 'keimling', name: 'x'.repeat(40) } }).name.length, 16);
});

test('Jede Art hat Standardnamen, Bezeichnung und so viele Stufen-Namen wie das Wachstum', () => {
  for (const lang of ['de', 'en']) {
    setLang(lang);
    for (const sp of SPECIES) {
      assert.ok(sp.defaultName, sp.id);
      assert.equal(tList(`species.${sp.id}.stages`).length, STAGE_COUNT, `${lang} ${sp.id}`);
    }
  }
  setLang('de');
  assert.equal(speciesInfo(undefined).id, DEFAULT_SPECIES);
});

test('Sätze: Platzhalter {name} = Begleiter, {user} = Person', () => {
  setLang('de');
  assert.equal(fillLine('Ich bin {name}. Hallo{, user}!', { name: 'Fanti', user: 'Lena' }), 'Ich bin Fanti. Hallo, Lena!');
  assert.equal(fillLine('Hallo{, user}, {user}.', { name: 'Fanti' }), 'Hallo, du.');
  assert.equal(companionLine('tap', { species: 'keimling', tone: 'motiv', name: 'Fanti', random: () => 0 }), 'Hi, ich bin Fanti!');
  assert.equal(companionLine('tap', { species: 'keimling', tone: 'motiv', name: 'Fanti', random: () => 0, lang: 'en' }), 'Hi, I’m Fanti!');
  setLang('en');
  assert.equal(onboardingLine('hello', { name: 'Fanti' }).startsWith('Hi! I’m Fanti.'), true);
  assert.equal(fillLine('{user}', { name: 'x' }), 'you');
  setLang('de');
});

test('Beide Sprachen haben dieselben Situationen und Platzhalter', () => {
  const { de, en } = COMPANION_TEXTS;
  for (const tone of TONES) {
    assert.deepEqual(Object.keys(en.lines[tone]).sort(), Object.keys(de.lines[tone]).sort(), tone);
    for (const ctx of Object.keys(de.lines[tone])) {
      const ph = (lines) => [...new Set(lines.flatMap(placeholders))].sort();
      assert.deepEqual(ph(en.lines[tone][ctx]), ph(de.lines[tone][ctx]), `${tone}.${ctx}`);
    }
  }
  assert.deepEqual(Object.keys(en.onboarding).sort(), Object.keys(de.onboarding).sort());
  for (const k of Object.keys(de.onboarding)) assert.deepEqual(placeholders(en.onboarding[k]), placeholders(de.onboarding[k]), k);
  assert.deepEqual(Object.keys(en.species).sort(), Object.keys(de.species).sort());
});

test('Keine festen Namen, keine offenen Platzhalter, Art-Sätze nur bei ihrer Art', () => {
  for (const [lang, texts] of Object.entries(COMPANION_TEXTS)) {
    const general = [...Object.values(texts.lines).flatMap((t) => Object.values(t).flat()), ...Object.values(texts.onboarding)];
    for (const line of general) {
      assert.ok(!/Keimi|Keimling|Sprout/.test(line), `${lang}: Name fest im Text: ${line}`);
      assert.ok(!/Blatt|Blätter|Pflanze|gieß|\b(leaf|leaves|plant)\b/i.test(line), `${lang}: artspezifisch im allgemeinen Text: ${line}`);
      assert.ok(!/\{[^}]*\}/.test(fillLine(line, { name: 'X', user: 'Y', count: 2 })), `${lang}: offener Platzhalter: ${line}`);
    }
  }
  assert.ok(linePool('night', 'ruhig', 'keimling', 'de').some((l) => l.includes('Blätter')));
  assert.ok(!linePool('night', 'ruhig', 'elefant', 'de').some((l) => l.includes('Blätter')));
  assert.deepEqual(linePool('gibtsnicht', 'gibtsnicht', 'keimling', 'de'), linePool('tap', 'motiv', 'keimling', 'de'));
});

test('Tonregeln: keine Körperideal- oder Essens-Belohnungs-Sprache (beide Sprachen)', () => {
  for (const texts of Object.values(COMPANION_TEXTS)) {
    for (const line of allLines(texts)) {
      assert.ok(!/abnehmen|Figur|Kalorie|Snack|Bikini|Problemzone|schlank|lose weight|calorie|bikini|skinny|figure/i.test(line), line);
    }
  }
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

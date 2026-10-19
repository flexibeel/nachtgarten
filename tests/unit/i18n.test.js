import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { TEXTS as DE } from '../../src/data/texts/de.js';
import { TEXTS as EN } from '../../src/data/texts/en.js';
import { DEFAULT_LANG, LANGS, getLang, locale, normalizeLang, setLang, t, tList } from '../../src/data/texts/i18n.js';
import { createStore, memoryAdapter } from '../../src/core/store.js';

const vars = (v) => (typeof v === 'string' ? [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : []);

test('Jeder deutsche Schlüssel gibt es auf Englisch, und umgekehrt', () => {
  const missing = Object.keys(DE).filter((k) => !(k in EN));
  const extra = Object.keys(EN).filter((k) => !(k in DE));
  assert.deepEqual(missing, [], `fehlt in en.js: ${missing.join(', ')}`);
  assert.deepEqual(extra, [], `nur in en.js: ${extra.join(', ')}`);
});

test('Platzhalter {var} stimmen in beiden Sprachen überein', () => {
  for (const key of Object.keys(DE)) {
    assert.deepEqual(vars(EN[key]), vars(DE[key]), key);
  }
});

test('Listen haben in beiden Sprachen dieselbe Länge, Texte sind nicht leer', () => {
  for (const key of Object.keys(DE)) {
    assert.equal(Array.isArray(EN[key]), Array.isArray(DE[key]), key);
    if (Array.isArray(DE[key])) assert.equal(EN[key].length, DE[key].length, key);
    else assert.ok(String(EN[key]).trim() && String(DE[key]).trim(), key);
  }
});

test('t(): aktive Sprache, Platzhalter, Rückfall auf Deutsch, unbekannte Schlüssel sichtbar', () => {
  assert.equal(DEFAULT_LANG, 'de');
  setLang('en');
  assert.equal(getLang(), 'en');
  assert.equal(t('profile.hi', { name: 'Lena' }), 'Hi Lena!');
  assert.equal(t('week.remaining', { left: 2 }), '2 more training days to reach your weekly goal.');
  assert.equal(locale(), 'en-GB');
  assert.deepEqual(tList('weekday.short').slice(0, 2), ['Mo', 'Tu']);
  assert.equal(t('gibts.nicht'), 'gibts.nicht');
  assert.equal(t('weekday.short'), 'weekday.short', 'Listen nur über tList');
  setLang('fr');
  assert.equal(getLang(), 'de', 'unbekannte Sprache → Deutsch');
  assert.equal(t('common.save'), 'Speichern');
  assert.equal(locale(), 'de-DE');
  assert.equal(normalizeLang(undefined), 'de');
  assert.deepEqual(LANGS.map((l) => l.value), ['de', 'en']);
});

test('Sprache liegt in ng2.settings.lang, Standard Deutsch', () => {
  const adapter = memoryAdapter();
  const store = createStore(adapter);
  assert.equal(store.settings.get().lang, 'de');
  store.settings.update((s) => ({ ...s, lang: 'en' }));
  assert.equal(JSON.parse(adapter.get('ng2.settings')).lang, 'en');
});

test('Keine Texte fest in Bildschirmen und Bausteinen', async () => {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const roots = ['src/features', 'src/ui'];
  const skip = /src\/ui\/(anim|share|companion)\//; // Bereiche anderer Etappen/Agenten
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.js') && !skip.test(`${p}/`) && !skip.test(p)) files.push(p);
    }
  };
  roots.forEach(walk);
  const offenders = [];
  for (const file of files) {
    const code = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    // Text-Werte mit Leerzeichen und Großbuchstaben/Umlaut in Anführungszeichen sind verdächtig.
    for (const m of code.matchAll(/(['`])([^'`\n]*[A-Za-zÄÖÜäöüß]{3,}\s[^'`\n]*[A-Za-zÄÖÜäöüß]{2,}[^'`\n]*)\1/g)) {
      const s = m[2];
      // CSS-Klassen (klein, mit Bindestrich) und Code-Bruchstücke sind kein Text.
      if (/^[a-z0-9 -]+$/.test(s) || /[(){}[\]:,<>=]|\$\{/.test(s)) continue;
      offenders.push(`${file}: ${s}`);
    }
  }
  assert.deepEqual(offenders, []);
});

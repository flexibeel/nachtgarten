import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  TERMS, term, normLang, normSearch, createExerciseI18n, chunkFile, NAMES_FILE, CHUNK_SIZE,
} from '../../src/data/i18n/exercises.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const I18N = join(ROOT, 'src', 'data', 'i18n');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const load = async (file) => readJson(join(I18N, file));

const names = readJson(join(I18N, NAMES_FILE));
const ids = Object.keys(names);
const chunkNos = [...new Set(ids.map((id) => names[id].c))].sort((a, b) => a - b);
const all = Object.assign({}, ...chunkNos.map((c) => readJson(join(I18N, chunkFile(c)))));

test('alle 678 Übungen haben deutschen Namen und Anleitung', () => {
  assert.equal(ids.length, 678);
  assert.equal(Object.keys(all).length, 678);
  for (const id of ids) {
    const e = all[id];
    assert.ok(e, `fehlt im Stück: ${id}`);
    assert.equal(e.name, names[id].name, id);
    assert.ok(e.name.trim().length > 1, id);
    assert.ok(Array.isArray(e.instructions), id);
  }
});

test('Schritte passen 1:1 zur englischen Vorlage (demos/cN.json)', { skip: !existsSync(join(ROOT, 'demos', 'c0.json')) }, () => {
  // Reihenfolge der Ids = Index in demos/cN.json: Stück c, Position i
  let checked = 0;
  for (const c of chunkNos) {
    const en = readJson(join(ROOT, 'demos', `c${c}.json`));
    const chunkIds = ids.filter((id) => names[id].c === c);
    assert.equal(chunkIds.length, Object.keys(en).length, `Stück ${c}`);
    chunkIds.forEach((id, k) => {
      const enSteps = en[String(c * CHUNK_SIZE + k)].s || [];
      assert.equal(all[id].instructions.length, enSteps.length, id);
      checked++;
    });
  }
  assert.equal(checked, 678);
});

test('Anleitungen sind deutsch, in du-Form und ohne Maschinen-Englisch', () => {
  const english = /\b(the|and|your|you|with|this|should|repeat)\b/i;
  const formal = /(^|[.!?]\s+)(Sie|Ihr|Ihre|Ihren)\b/;
  let steps = 0;
  for (const id of ids) {
    for (const s of all[id].instructions) {
      if (!s) continue;
      steps++;
      assert.doesNotMatch(s, english, `${id}: ${s.slice(0, 60)}`);
      assert.doesNotMatch(s, formal, `${id}: ${s.slice(0, 60)}`);
      assert.doesNotMatch(s, /\b(inch|inches|lbs?|feet|foot)\b/i, `${id}: Einheit`);
      assert.match(s, /[.!?:“]$/, `${id}: Satzende fehlt: ${s.slice(-30)}`);
    }
  }
  assert.ok(steps > 3000);
});

test('Glossar-Begriffe werden einheitlich verwendet', () => {
  const text = ids.flatMap((id) => all[id].instructions).join('\n');
  assert.ok(text.includes('Das ist deine Ausgangsposition.'));
  assert.ok(!/Startposition/.test(text), 'Ausgangsposition statt Startposition');
  assert.ok(!/Smith[- ]Maschine/i.test(text), 'Multipresse statt Smith-Maschine');
  assert.ok(!/Kammgriff/.test(text), 'Untergriff statt Kammgriff');
});

test('Fachbegriffe: Muskeln, Geräte, Kategorien, Niveau', () => {
  assert.equal(term('muscle', 'hamstrings'), 'Hintere Oberschenkel');
  assert.equal(term('muscle', 'hamstrings', 'en'), 'Hamstrings');
  assert.equal(term('equipment', 'e-z curl bar'), 'SZ-Stange');
  assert.equal(term('equipment', 'cable'), 'Kabelzug');
  assert.equal(term('category', 'olympic weightlifting'), 'Olympisches Gewichtheben');
  assert.equal(term('level', 'beginner'), 'Einsteiger');
  assert.equal(term('force', 'static'), 'Halten');
  assert.equal(term('mechanic', 'compound'), 'Grundübung (mehrgelenkig)');
  assert.equal(term('appGear', 'Kurzhanteln', 'en'), 'Dumbbells');
  assert.equal(term('attachment', 'Seil', 'en'), 'Rope');
  assert.equal(term('ui', 'instructions'), 'Ausführliche Anleitung');
  assert.equal(term('muscle', 'unbekannt'), 'unbekannt');
  for (const [kind, map] of Object.entries(TERMS)) {
    for (const [k, v] of Object.entries(map)) {
      assert.ok(v.de && v.en, `${kind}.${k}`);
    }
  }
});

test('normLang und Suchnormierung', () => {
  assert.equal(normLang('en'), 'en');
  assert.equal(normLang('fr'), 'de');
  assert.equal(normLang(undefined), 'de');
  assert.equal(normSearch('Bankdrücken Größe'), 'bankdrucken grosse');
});

test('Loader: Name, Anleitung, Suche in beiden Sprachen', async () => {
  const ex = createExerciseI18n({ load });
  await ex.ready();
  const id = 'Barbell_Bench_Press_-_Medium_Grip';
  assert.ok(ex.has(id));
  assert.equal(ex.ids().length, 678);
  assert.equal(ex.name(id), 'Bankdrücken mit Langhantel (mittlerer Griff)');
  assert.equal(ex.name(id, 'en', 'Barbell Bench Press - Medium Grip'), 'Barbell Bench Press - Medium Grip');
  assert.equal(ex.name('gibt_es_nicht', 'de', 'Fallback'), 'Fallback');
  const steps = await ex.instructions(id);
  assert.match(steps[0], /^Leg dich auf eine Flachbank/);
  assert.equal(await ex.instructions('gibt_es_nicht'), null);
  const hay = ex.haystack(id, 'Barbell Bench Press - Medium Grip');
  assert.ok(hay.includes('bankdrucken') && hay.includes('bench press'));
  assert.equal(ex.name('Lat_Pulldown') , 'Lat_Pulldown'); // keine erfundenen Ids
  assert.equal(ex.name('Wide-Grip_Lat_Pulldown'), 'Latzug breiter Griff');
});

test('Loader: leere Schritte werden ausgefiltert, Stück wird nur einmal geladen', async () => {
  let calls = 0;
  const ex = createExerciseI18n({ load: (f) => { if (f !== NAMES_FILE) calls++; return load(f); } });
  const empty = ids.find((id) => all[id].instructions.some((s) => !s.trim()));
  assert.ok(empty, 'Testfall mit leerem Schritt vorhanden');
  const steps = await ex.instructions(empty);
  assert.ok(steps.every((s) => s.trim()));
  const sameChunk = ids.find((id) => id !== empty && names[id].c === names[empty].c);
  await ex.instructions(sameChunk);
  assert.equal(calls, 1);
});

import '../helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { boundsOf, census, rasterPose } from '../../../src/ui/share/mannequin.js';
import { heroExercise, keyPose, motionOf, movingSegments, runnerMotion, sequence } from '../../../src/ui/share/pose.js';
import { runnerSealRows } from '../../../src/ui/share/laeufer.js';
import { sealRowsOf, SEALS } from '../../../src/ui/share/ink.js';
import { sealForSpecies } from '../../../src/ui/share/seal.js';
import { bewegungsStudie, sammelKarte, suggestCards } from '../../../src/ui/share/cards.js';
import { LEG_DAY, PUSH_DAY } from './fixtures.js';

/** Schlanker Canvas-Ersatz: merkt sich Texte, alles andere ist still. */
function mock() {
  const make = (w, h) => {
    const texts = [];
    const state = { font: '10px serif', letterSpacing: '0px' };
    const api = {
      measureText: (t) => ({ width: [...String(t)].length * Number((/([\d.]+)px/.exec(state.font) || [0, 10])[1]) * 0.5 }),
      fillText: (t) => texts.push(t),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      createPattern: () => ({}),
      createImageData: (iw, ih) => ({ data: new Uint8ClampedArray(iw * ih * 4) }),
    };
    const ctx = new Proxy(state, {
      get: (t, k) => (k in api ? api[k] : k in t ? t[k] : () => {}),
      set: (t, k, v) => { t[k] = v; return true; },
      has: (t, k) => k in t || k in api,
    });
    return { width: w, height: h, texts, getContext: () => ctx };
  };
  return make;
}
const ex = (name) => [...LEG_DAY.exercises, ...PUSH_DAY.exercises].find((e) => e.name === name);

test('motionOf: Übungen aus dem Training finden ihre Bewegung und ein passendes Gerät', () => {
  const cases = {
    Kniebeuge: ['squat', 'langhantel'],
    'Rumänisches Kreuzheben': ['hinge', 'langhantel'],
    Beinpresse: ['legPress', 'maschine'],
    Bankdrücken: ['pushH', 'langhantel'],
    'Schrägbankdrücken KH': ['pushH', 'kurzhantel'],
    Seitheben: ['latRaise', 'kurzhantel'],
    'Trizepsdrücken am Seil': ['triExt', 'kabel'],
    Dips: ['dip', 'koerper'],
  };
  for (const [name, [pattern, equipment]] of Object.entries(cases)) {
    const m = motionOf(ex(name));
    assert.equal(m.pattern, pattern, name);
    assert.equal(m.equipment, equipment, name);
    assert.ok(m.def.frames.length >= 1);
  }
  // ausdrücklich angegebene Bewegung gewinnt; Unbekanntes fällt ruhig zurück
  assert.equal(motionOf({ name: 'x', anim: { pattern: 'curl', equipment: 'kurzhantel' } }).pattern, 'curl');
  assert.ok(motionOf({ name: 'Völlig unbekannt', muscles: [] }).def.frames.length >= 1);
});

test('sequence & heroExercise: Bildfolge vom Start zur Endpose, Bestwert ist die Hauptübung', () => {
  const { def } = motionOf(ex('Kniebeuge'));
  const seq = sequence(def, 5);
  assert.equal(seq.length, 5);
  assert.deepEqual(seq[0], def.frames[0]);
  assert.deepEqual(seq[4], def.frames[def.frames.length - 1]);
  assert.ok(seq[2].hy > seq[0].hy && seq[2].hy < seq[4].hy, 'die Hüfte sinkt Bild für Bild');
  assert.equal(heroExercise(LEG_DAY).name, 'Kniebeuge');
  assert.equal(heroExercise(PUSH_DAY).name, 'Bankdrücken');
  assert.equal(heroExercise({ exercises: [] }), null);
});

test('rasterPose: das Mannequin mit hellem Kopf, Gesicht, Keimling und Altrosa an den arbeitenden Gliedern', () => {
  const m = motionOf(ex('Kniebeuge'));
  const pose = keyPose(m.def);
  const frame = boundsOf(m.def, [pose]);
  const R = rasterPose(pose, m.def, { frame, cols: 48, moving: movingSegments(m.def), muscles: { quads: 1 } });
  const c = census(R);
  for (const k of ['figure', 'head', 'edge', 'face', 'sprout', 'move', 'work', 'weight']) assert.ok(c[k] > 0, `${k} fehlt`);
  assert.ok(c.head > c.face, 'Kopf innen hell, Augen klein');
  // reproduzierbar (und gecacht)
  assert.equal(rasterPose(pose, m.def, { frame, cols: 48, moving: movingSegments(m.def), muscles: { quads: 1 } }), R);
  // Rückansicht von vorn: Brust nicht sichtbar, Po schon
  const front = { view: 'front', props: [], frames: [{ hx: 50, hy: 55, tr: 0, lA: [45, 92], rA: [55, 92], lU: 16, lL: 9, rU: 16, rL: 9 }] };
  const f = front.frames[0];
  const fb = boundsOf(front, [f]);
  assert.ok(!census(rasterPose(f, { ...front, back: true }, { frame: fb, cols: 40, muscles: { chest: 1 } })).work);
  assert.ok(census(rasterPose(f, front, { frame: fb, cols: 40, muscles: { chest: 1 } })).work > 0);
});

test('Läuferin: Pose mitten im Schritt, Siegel 11 × 13 mit Figur', () => {
  const { pose } = runnerMotion();
  assert.ok(pose.nT > 20 && pose.fT < -10, 'ein Bein vorn, eins hinten');
  const rows = runnerSealRows();
  assert.equal(rows.length, 13);
  assert.ok(rows.every((r) => r.length === 11 && /^[#.]+$/.test(r)));
  const n = rows.join('').split('#').length - 1;
  assert.ok(n > 20 && n < 90, `${n} Punkte`);
});

test('Siegel: eigene Zeilen > Begleiter-Art > Motiv', () => {
  assert.deepEqual(sealRowsOf({ seal: 'mond' }), SEALS.mond);
  assert.deepEqual(sealRowsOf({ companion: { species: 'eule' } }), sealForSpecies('eule'));
  assert.deepEqual(sealRowsOf({ seal: 'eule' }), sealForSpecies('eule'));
  assert.deepEqual(sealRowsOf({ sealRows: SEALS.elli, companion: { species: 'eule' } }), SEALS.elli);
  assert.deepEqual(sealRowsOf({}), SEALS.keim);
});

test('Bewegungsstudie und Sammelkarte: Übung im Titel, höchstens drei Kennzahlen, Signatur', () => {
  const nums = (c) => c.texts.filter((t) => /^\d[\d.,:]*$/.test(t) && t.length > 1);
  const st = bewegungsStudie(LEG_DAY, { createCanvas: mock() });
  assert.ok(st.texts.includes('Kniebeuge'));
  assert.ok(st.texts.includes('Bestwert'));
  assert.ok(nums(st).length <= 3, nums(st).join(' '));
  assert.ok(st.texts.includes('nachtgarten'));
  const sk = sammelKarte(PUSH_DAY, { createCanvas: mock() });
  assert.ok(sk.texts.includes('Bankdrücken'));
  assert.ok(nums(sk).length <= 3, nums(sk).join(' '));
  const det = sammelKarte(LEG_DAY, { detail: 'detailliert', createCanvas: mock() });
  const all = det.texts.join(' ');
  for (const e of LEG_DAY.exercises) for (const w of e.name.split(' ')) assert.ok(all.includes(w), e.name);
});

test('Vorschläge nach dem Krafttraining enthalten Bewegungsstudie und Sammelkarte', () => {
  for (const s of [LEG_DAY, PUSH_DAY]) {
    const t = suggestCards(s).map((x) => x.template);
    assert.ok(t.includes('studie'), t.join());
    assert.ok(t.includes('sammel'), t.join());
  }
});

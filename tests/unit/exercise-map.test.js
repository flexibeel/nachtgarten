import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapExercise, OVERRIDES } from '../../src/data/exercise-map.js';
import { buildPattern, PATTERNS, PATTERN_NAMES } from '../../src/data/patterns.js';
import { CURATED } from '../../src/data/library.js';
import { EXDB, GEAR_CODES, MUSCLE_CODES } from '../../src/data/exercise-db.js';
import { GROUND, solve } from '../../src/ui/anim/figure.js';

const kinds = (def) => def.props.map((p) => p.k);
const hasPad = (def, pred) => def.props.some((p) => p.k === 'pad' && pred(p));

test('Jede kuratierte Übung hat eine feste Zuordnung auf ein vorhandenes Muster', () => {
  for (const ex of CURATED) {
    const ov = OVERRIDES[ex.id];
    assert.ok(ov, `keine Zuordnung für ${ex.id}`);
    assert.ok(PATTERNS[ov.pattern], `${ex.id}: unbekanntes Muster ${ov.pattern}`);
    const m = mapExercise(ex);
    assert.equal(m.source, 'override');
    const def = buildPattern(m.pattern, { equipment: m.equipment, ...m.options });
    assert.ok(def.frames.length >= 2, `${ex.id}: zu wenige Posen`);
  }
});

test('Butterfly / Pec Deck ist die Sitz-Maschine, nie Fliegende am Boden', () => {
  for (const ex of [{ id: 'fly' }, { name: 'Butterfly', gear: 'Maschinen' }, { name: 'Pec Deck' }, { name: 'Butterfly Maschine' }]) {
    const m = mapExercise(ex);
    assert.equal(m.pattern, 'fly', JSON.stringify(ex));
    assert.equal(m.equipment, 'maschine', JSON.stringify(ex));
  }
  const def = buildPattern('fly', { equipment: 'maschine' });
  assert.equal(def.view, 'front');
  assert.ok(hasPad(def, (p) => p.h >= 40), 'hohe Rückenlehne fehlt');
  assert.ok(hasPad(def, (p) => p.w >= 26 && p.h <= 5), 'Sitzpolster fehlt');
  assert.ok(kinds(def).includes('lever'), 'Hebel am Gestell fehlen');
});

test('Fliegende mit Kurzhanteln liegen auf der Bank (Seitenansicht), Kabel-Fliegende auf der Bank ebenso', () => {
  const m = mapExercise({ name: 'Kurzhantel-Flys', gear: 'Kurzhanteln', muscles: ['chest'] });
  assert.deepEqual([m.pattern, m.equipment], ['fly', 'kurzhantel']);
  const def = buildPattern('fly', { equipment: 'kurzhantel' });
  assert.equal(def.view, 'side');
  assert.ok(kinds(def).includes('bench'));
  const k = mapExercise({ id: 'k_flyflat' });
  const kd = buildPattern(k.pattern, { equipment: k.equipment, ...k.options });
  assert.ok(kinds(kd).includes('bench') && kinds(kd).includes('cable'));
  const cross = mapExercise({ name: 'Cable Crossover', gear: 'Kabelzug' });
  assert.equal(buildPattern(cross.pattern, { equipment: cross.equipment, ...cross.options }).view, 'front');
});

test('Maschinen, Stange und Kabel werden richtig unterschieden', () => {
  const pick = (ex) => { const m = mapExercise(ex); return `${m.pattern}/${m.equipment}`; };
  assert.equal(pick({ id: 'press' }), 'legPress/maschine');
  assert.equal(pick({ name: 'Beinpresse', gear: 'Maschinen' }), 'legPress/maschine');
  assert.equal(pick({ id: 'legext' }), 'legExt/maschine');
  assert.equal(pick({ id: 'legcurl' }), 'legCurl/maschine');
  assert.equal(pick({ id: 'pullup' }), 'pullV/stange');
  assert.equal(pick({ id: 'latpull' }), 'pullV/kabel');
  assert.equal(pick({ name: 'Klimmzüge', gear: 'Klimmzugstange' }), 'pullV/stange');
  assert.equal(pick({ name: 'Latzug breit', gear: 'Kabelzug' }), 'pullV/kabel');
  assert.equal(pick({ id: 'seatrow' }), 'pullH/maschine');
  assert.equal(pick({ id: 'k_row' }), 'pullH/kabel');
  assert.equal(pick({ id: 'row1' }), 'pullH/langhantel');
  assert.equal(pick({ id: 'dips' }), 'dip/koerper');
  assert.equal(pick({ id: 'thrust' }), 'hipthrust/langhantel');
  assert.equal(pick({ name: 'Wadendrücken an der Beinpresse', gear: 'Maschinen' }), 'calfRaise/maschine');
});

test('Fest zugeordnete Kabelhöhe gewinnt gegen die Voreinstellung, Höhe aus dem Namen ebenso', () => {
  assert.equal(mapExercise({ id: 'k_crosshigh' }, { height: 'mittel' }).options.height, 'hoch');
  assert.equal(mapExercise({ id: 'k_crosslow' }, { height: 'mittel' }).options.height, 'tief');
  assert.equal(mapExercise({ id: 'face' }, { height: 'tief' }).options.height, 'tief'); // ohne feste Höhe zählt die Wahl
  assert.equal(mapExercise({ name: 'Kabel-Crossover von unten', gear: 'Kabelzug' }, { height: 'mittel' }).options.height, 'tief');
});

test('Alle Übungen der Datenbank landen auf einem vorhandenen Muster', () => {
  for (const r of EXDB) {
    const ex = { name: [r[4], r[0]].filter(Boolean).join(' '), gear: GEAR_CODES[r[1]], muscles: [...r[2]].map((c) => MUSCLE_CODES[c]) };
    const m = mapExercise(ex);
    assert.ok(PATTERNS[m.pattern], `${ex.name} → ${m.pattern}`);
  }
});

test('Ort ist eindeutig: Hängen ohne Bodenkontakt, Bodenübungen mit Matte, Waden auf der Stufe', () => {
  const feetUp = (def, gap) => def.frames.every((f) => {
    const J = solve(f, def.view);
    return Math.max(J.n.A[1], J.f.A[1]) < GROUND - gap;
  });
  const pull = buildPattern('pullV', { equipment: 'stange' });
  assert.ok(kinds(pull).includes('pullbar'));
  assert.ok(feetUp(pull, 6), 'Klimmzug: Füße müssen frei hängen');
  assert.ok(feetUp(buildPattern('dip', {}), 6), 'Dips: Füße frei');
  for (const [n, o] of [['crunch', {}], ['plank', {}], ['sidePlank', {}], ['birdDog', {}], ['deadBug', {}], ['clamshell', {}], ['catCow', {}], ['hipthrust', { variant: 'floor' }], ['breathing', { variant: 'ruecken' }]]) {
    assert.ok(kinds(buildPattern(n, o)).includes('mat'), `${n}: Matte fehlt`);
  }
  assert.ok(kinds(buildPattern('hipthrust', { equipment: 'langhantel', variant: 'bench' })).includes('bench'));
  assert.ok(kinds(buildPattern('calfRaise', {})).includes('step'));
  assert.ok(kinds(buildPattern('legPress', {})).includes('sled'));
  for (const n of ['legExt', 'legCurl']) assert.ok(kinds(buildPattern(n, {})).includes('roller'), `${n}: Polsterrolle fehlt`);
});

test('Jedes Muster baut mit üblichen Geräten ohne Fehler und hat eine Phasen-Beschriftung', () => {
  for (const n of PATTERN_NAMES) {
    for (const equipment of ['koerper', 'kurzhantel', 'langhantel', 'kabel', 'maschine', 'band']) {
      const def = buildPattern(n, { equipment });
      assert.ok(def.frames.length >= 2 && def.phases && def.phases.length >= 1, `${n}/${equipment}`);
      for (const f of def.frames) for (const v of Object.values(solve(f, def.view).H)) assert.ok(Number.isFinite(v), `${n}: Pose ungültig`);
    }
  }
});

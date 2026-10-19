import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DOSE_RANGES, PLAN_EXERCISES, PLAN_TEMPLATES, RELATED_PLANS, SOURCES, planById } from '../../src/data/plans.js';
import {
  MAJOR_MUSCLES, arrangeWeek, dayOptions, legLoad, pushPull, recommendPlans, repsLabel, sessionById, sessionMinutes,
  templateMinutes, toAppPlans, validatePlan, weekOf, weeklyFrequency, weeklyVolume,
} from '../../src/domain/plan-select.js';
import { MUSCLE_IDS } from '../../src/data/muscles.js';

/** Kleiner Testplan; Felder wie in den Vorlagen. */
const mk = (sessions, week, extra = {}) => ({
  id: 't', name: 'Test', daysPerWeek: week.filter(Boolean).length, weeks: { [week.filter(Boolean).length]: week },
  equipment: 'gym', level: ['etwas'], focus: ['muskel'], dose: 'standard', sessions, ...extra,
});
const it = (ex, sets, extra = {}) => ({ ex, sets, reps: [8, 12], rir: [1, 2], rest: 120, ...extra });
const codes = (r, level = 'warn') => r.issues.filter((i) => i.level === level).map((i) => i.code);

/* ------------------------------------------------------------ Vorlagen */

test('8–10 Vorlagen mit allen Pflichtfeldern und eindeutigen Ids', () => {
  assert.ok(PLAN_TEMPLATES.length >= 8 && PLAN_TEMPLATES.length <= 10);
  assert.equal(new Set(PLAN_TEMPLATES.map((p) => p.id)).size, PLAN_TEMPLATES.length);
  for (const p of PLAN_TEMPLATES) {
    for (const f of ['id', 'name', 'short', 'forWhom', 'focusLabel', 'why', 'evidence', 'progression', 'deload']) {
      assert.equal(typeof p[f], 'string', `${p.id}.${f}`);
      assert.ok(p[f].length >= (f === 'id' ? 2 : 6), `${p.id}.${f} leer`);
    }
    assert.ok(p.weeks[p.daysPerWeek], `${p.id}: Standardwoche fehlt`);
    assert.ok(DOSE_RANGES[p.dose], `${p.id}: Dosis`);
    assert.ok(['gym', 'home', 'none'].includes(p.equipment));
    assert.ok(p.sources.length >= 1 && p.sources.every((k) => SOURCES[k]?.url.startsWith('https://')), `${p.id}: Quellen`);
    const sentences = p.why.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert.ok(sentences >= 2 && sentences <= 3, `${p.id}: „Warum“ hat ${sentences} Sätze`);
    assert.ok(!/abnehm|figur|aussehen|bikini|definiert/i.test(p.why + p.short + p.forWhom), `${p.id}: Ton (kein Aussehen)`);
  }
});

test('Pflicht-Vorlagen sind dabei', () => {
  const need = { gk2: 2, gk3: 3, ou4: 4, ppl3: 3, ppl6: 6, hybrid5: 5, home: 3, kurz: 3, laufen: 2, ruecken: 3 };
  for (const [id, days] of Object.entries(need)) assert.equal(planById(id)?.daysPerWeek, days, id);
  assert.equal(planById('home').equipment, 'home');
  assert.ok(planById('kurz').sessions.every((s) => sessionMinutes(s, planById('kurz').warmupMin) <= 40), 'kurz ≤ 40 Min.');
  assert.ok(planById('laufen').runDays.length >= 2 && planById('laufen').healthNotes.t1d.length >= 4);
  assert.equal(RELATED_PLANS[0].id, 'mama', 'Schwangerschaft wird nur verlinkt');
  assert.ok(!PLAN_TEMPLATES.some((p) => /schwanger|rückbildung/i.test(p.name)));
});

test('jede Vorlage besteht validatePlan in jeder Tage-Variante, ohne Warnungen', () => {
  for (const p of PLAN_TEMPLATES) {
    for (const days of dayOptions(p)) {
      const r = validatePlan(p, { days });
      assert.equal(r.ok, true, `${p.id}/${days}: ${JSON.stringify(r.issues)}`);
      assert.deepEqual(codes(r), [], `${p.id}/${days}: ${r.issues.map((i) => i.text).join(' | ')}`);
    }
  }
});

test('nur PPL 3× hat bewusste Abwägungen (als Info)', () => {
  const r = validatePlan(planById('ppl3'));
  assert.ok(codes(r, 'info').includes('frequency'));
  for (const p of PLAN_TEMPLATES.filter((x) => x.id !== 'ppl3')) assert.deepEqual(codes(validatePlan(p), 'info'), [], p.id);
});

test('Übungen: bekannt, sinnvolle Bereiche, RIR 0–4, Pausen ≥ 2 Min. bei Grundübungen', () => {
  for (const p of PLAN_TEMPLATES) {
    for (const s of p.sessions) {
      for (const x of s.items) {
        const ex = PLAN_EXERCISES[x.ex];
        assert.ok(ex, `${p.id}/${s.id}: ${x.ex}`);
        assert.ok(MUSCLE_IDS.includes(ex.muscles[0]));
        if (x.ex.startsWith('g_')) assert.ok(ex.pattern, `${x.ex} braucht ein Muster`);
        assert.ok(x.sets >= 1 && x.sets <= 5);
        if (x.unit !== 's') assert.ok(x.reps[0] >= 4 && x.reps[1] <= 30, `${p.id}/${x.ex}: Wdh. ${x.reps}`);
        if (x.rir) assert.ok(x.rir[0] >= 0 && x.rir[1] <= 4 && x.rir[0] <= x.rir[1]);
        // schwere Grundübung: mehrere Muskeln, Drücken/Ziehen/Beine, unteres Ende ≤ 10 Wdh.
        const compound = ex.muscles.length >= 2 && ['push', 'pull', 'legs'].includes(ex.move) && x.unit !== 's' && x.reps[0] <= 10;
        if (compound && !x.superset && p.dose !== 'sanft') {
          assert.ok(x.rest >= 120, `${p.id}/${s.id}/${x.ex}: Pause ${x.rest}s`);
        }
      }
    }
  }
});

test('jede Einheit hat höchstens 8 Übungen und dauert höchstens 65 Minuten', () => {
  for (const p of PLAN_TEMPLATES) {
    for (const s of p.sessions) assert.ok(s.items.length <= 8, `${p.id}/${s.id}`);
    assert.ok(templateMinutes(p).max <= 65, `${p.id}: ${templateMinutes(p).max} Min.`);
  }
});

test('Standardpläne landen für große Muskeln im Korridor 8–22, Mindestpläne bei ≥ 4', () => {
  for (const p of PLAN_TEMPLATES) {
    const [lo, hi] = DOSE_RANGES[p.dose];
    const v = weeklyVolume(p);
    for (const m of MAJOR_MUSCLES) {
      if (p.tradeoffs?.includes('volume')) continue;
      assert.ok(v[m] >= lo && v[m] <= hi, `${p.id}: ${m} = ${v[m]}`);
    }
  }
  // Muskelaufbau-Pläne für Erfahrene: Brust, Rücken, Beine vorn ≥ 10
  for (const id of ['ou4', 'ppl6', 'hybrid5']) {
    const v = weeklyVolume(planById(id));
    for (const m of ['chest', 'back', 'quads', 'hams']) assert.ok(v[m] >= 10, `${id}: ${m} = ${v[m]}`);
  }
});

/* ------------------------------------------------------------ Mathematik */

test('weeklyVolume: Hauptmuskel 1, Hilfsmuskel 0,5, Mobilität zählt nicht, Woche zählt doppelt belegte Tage', () => {
  const p = mk(
    [{ id: 'S', name: 'S', items: [it('bench', 3), it('latpull', 4), { ex: 'g_catcow', sets: 1, reps: [45, 60], rir: null, rest: 15, unit: 's' }] }],
    ['S', null, 'S', null, null, null, null],
  );
  const v = weeklyVolume(p);
  assert.deepEqual(
    Object.fromEntries(Object.entries(v).filter(([, n]) => n)),
    { chest: 6, shoulders: 3, triceps: 3, back: 8, biceps: 4 },
  );
  assert.equal(v.lowerback, 0, 'Katze-Kuh ist Mobilität');
  assert.equal(Object.keys(v).length, 12);
  const f = weeklyFrequency(p);
  assert.equal(f.chest, 2);
  assert.equal(f.calves, 0);
});

test('weeklyVolume gk2 von Hand nachgerechnet', () => {
  const v = weeklyVolume(planById('gk2'));
  assert.equal(v.chest, 6); // Brustpresse 3 + Schrägbank 3
  assert.equal(v.back, 7); // Latzug 3 + Rudern 3 + Face Pulls 0,5 × 2
  assert.equal(v.shoulders, 5.5); // Seitheben 2 + Face Pulls 2 + Schrägbank 0,5 × 3
  assert.equal(v.triceps, 3); // Brustpresse 1,5 + Schrägbank 1,5
  assert.equal(v.quads, 6); // Beinpresse 3 + Goblet 3
  assert.equal(v.hams, 5); // Beinbeuger 2 + RDL 3
  assert.equal(v.glutes, 4.5); // 0,5 × (3 + 3 + 3)
});

test('Tage-Varianten ändern das Volumen (3× A-B-A vs. 2× A-B)', () => {
  const p = planById('home');
  assert.deepEqual(dayOptions(p), [2, 3]);
  const v2 = weeklyVolume(p, { days: 2 });
  const v3 = weeklyVolume(p, { days: 3 });
  const a = sessionById(p, 'A');
  assert.ok(v3.quads > v2.quads);
  assert.equal(v3.quads - v2.quads, a.items.find((x) => x.ex === 'goblet').sets);
});

test('sessionMinutes: Aufwärmen + Arbeit + Pause + Wechsel; Supersätze teilen sich die Pause', () => {
  const single = { id: 'x', name: 'x', items: [it('bench', 3, { reps: [10, 10], rest: 120 })] };
  // 5 min + 3 × (30 s + 120 s) + 60 s = 300 + 450 + 60 = 810 s ≈ 13,5 → 15 (auf 5 gerundet)
  assert.equal(sessionMinutes(single), 15);
  const pair = {
    id: 'y', name: 'y',
    items: [it('bench', 3, { reps: [10, 10], rest: 90, superset: 'a' }), it('latpull', 3, { reps: [10, 10], rest: 90, superset: 'a' })],
  };
  const apart = { id: 'z', name: 'z', items: pair.items.map(({ superset, ...rest }) => rest) };
  assert.ok(sessionMinutes(pair, 0) < sessionMinutes(apart, 0));
});

test('pushPull und legLoad', () => {
  assert.deepEqual(pushPull(planById('gk3')), { push: 11, pull: 11, ratio: 1 });
  assert.equal(legLoad(sessionById(planById('laufen'), 'A')), 'schwer');
  assert.equal(legLoad(sessionById(planById('laufen'), 'B')), 'mittel');
  assert.equal(legLoad(sessionById(planById('ou4'), 'O1')), 'leicht');
  assert.equal(legLoad(undefined), 'leicht');
});

/* ------------------------------------------------------------ Prüfregeln */

test('validatePlan erkennt fehlende Frequenz, zu viel Volumen, Push-Lastigkeit', () => {
  const pushOnly = mk(
    [{ id: 'P', name: 'Push', items: [it('bench', 5), it('dbbench', 5), it('fly', 5), it('ohp', 5)] }],
    ['P', null, null, null, null, null, null],
  );
  const r = validatePlan(pushOnly);
  assert.equal(r.ok, true, 'Warnungen sind keine Fehler');
  const w = codes(r);
  assert.ok(w.includes('frequency'));
  assert.ok(w.includes('volumeLow'));
  assert.ok(w.includes('pushPull'));
  assert.ok(w.includes('sessionVolume'), 'Brust 15 Sätze in einer Einheit');

  const lots = mk(
    [{ id: 'A', name: 'A', items: [it('bench', 4), it('fly', 4), it('row1', 4), it('k_row', 4)] }],
    ['A', null, 'A', null, 'A', null, null],
  );
  assert.ok(codes(validatePlan(lots)).includes('volumeHigh'), 'Brust 24 Sätze');
});

test('validatePlan: Abwägungen werden Infos, Fehler bei unbekannter Übung oder falscher Woche', () => {
  const p = mk([{ id: 'P', name: 'P', items: [it('bench', 3)] }], ['P', null, null, null, null, null, null], { tradeoffs: ['frequency'] });
  const r = validatePlan(p);
  assert.ok(!codes(r).includes('frequency'));
  assert.ok(codes(r, 'info').includes('frequency'));

  const bad = mk([{ id: 'P', name: 'P', items: [it('gibtsnicht', 3)] }], ['P', null, null, null, null, null, null]);
  assert.equal(validatePlan(bad).ok, false);
  assert.equal(validatePlan(planById('gk3'), { week: ['A', 'B'] }).ok, false);
  assert.equal(validatePlan(planById('gk3'), { week: ['A', null, 'X', null, 'C', null, null] }).ok, false);
});

test('validatePlan: schwere Beine nicht direkt vor hartem Lauf, nicht zwei Tage hintereinander', () => {
  const p = planById('laufen');
  const runDays = p.runDays;
  // A (schwer) am Montag vor den Intervallen am Dienstag
  const r = validatePlan(p, { week: ['A', null, null, null, 'B', null, null], runDays });
  assert.ok(codes(r).includes('legsBeforeRun'));
  // A am Samstag vor dem langen Lauf am Sonntag
  assert.ok(codes(validatePlan(p, { week: [null, null, 'B', null, null, 'A', null], runDays })).includes('legsBeforeRun'));
  // lockerer Lauf danach ist okay
  assert.ok(!codes(validatePlan(p, { week: [null, null, 'A', null, 'B', null, null], runDays: [{ day: 3, kind: 'easy', label: 'locker' }] })).includes('legsBeforeRun'));
  // zwei schwere Beintage hintereinander
  const ou4 = planById('ou4');
  assert.ok(codes(validatePlan(ou4, { week: ['O1', 'U1', 'U2', 'O2', null, null, null] })).includes('legsBackToBack'));
  // über das Wochenende (So → Mo)
  assert.ok(codes(validatePlan(ou4, { week: ['U1', 'O1', null, 'O2', null, null, 'U2'] })).includes('legsBackToBack'));
});

test('arrangeWeek legt Krafttage passend um andere Lauftage', () => {
  const p = planById('laufen');
  const runDays = [
    { day: 0, kind: 'quality', label: 'Intervalle' },
    { day: 2, kind: 'easy', label: 'locker' },
    { day: 4, kind: 'long', label: 'lang' },
  ];
  const week = arrangeWeek(p, { runDays });
  assert.equal(week.filter(Boolean).length, 2);
  assert.equal(week.indexOf('A'), 1, 'schwerer Tag direkt nach den Intervallen');
  assert.notEqual(week[3], 'A', 'nicht am Tag vor dem langen Lauf');
  assert.deepEqual(codes(validatePlan(p, { week, runDays })), []);
});

/* ------------------------------------------------------------ Empfehlungen */

const JONAS_RUNS = [
  { day: 1, kind: 'quality', label: 'Lauftreff: Intervalle' },
  { day: 3, kind: 'easy', label: 'Lauftreff: locker' },
  { day: 5, kind: 'long', label: 'Langer Lauf' },
];

const PERSONAS = {
  felix: { daysPerWeek: 4, minutesPerSession: 75, equipment: ['gym'], experience: 'etwas', focus: 'muskel', constraints: { shiftWork: true } },
  jonas: { daysPerWeek: 2, minutesPerSession: 60, equipment: ['gym'], experience: 'etwas', focus: 'laufen', constraints: { t1d: true, runDays: JONAS_RUNS } },
  neuZuhause: { daysPerWeek: 2, minutesPerSession: 45, equipment: ['home'], experience: 'neu', focus: 'fit' },
  erfahren6: { daysPerWeek: 6, minutesPerSession: 75, equipment: ['gym'], experience: 'erfahren', focus: 'muskel' },
  dreissigMin: { daysPerWeek: 3, minutesPerSession: 30, equipment: ['gym'], experience: 'etwas', focus: 'fit' },
  rueckenNeu: { daysPerWeek: 3, minutesPerSession: 30, equipment: ['none'], experience: 'neu', focus: 'fit', constraints: { backPain: true } },
};

const top = (q) => recommendPlans(q).results;

test('Felix (Studio, 4×, etwas, Muskelaufbau, Schicht) → Oberkörper/Unterkörper', () => {
  const r = top(PERSONAS.felix);
  assert.equal(r[0].id, 'ou4');
  assert.match(r[0].reason, /^Passt, weil .*4 Tage.*Schichten/);
  assert.ok(r.length === 3 && r.every((x) => x.plan.equipment !== 'none'));
  assert.ok(!r.some((x) => x.id === 'ppl6'), 'kein 6-Tage-Plan bei 4 Tagen');
});

test('Jonas (Läufer, Typ-1-Diabetes, 2× Kraft + Lauftreff) → Kraft + Laufen mit Hinweisen', () => {
  const [first, ...rest] = top(PERSONAS.jonas);
  assert.equal(first.id, 'laufen');
  assert.match(first.reason, /Lauftage/);
  assert.ok(first.notes.some((n) => /Diabetes-Team/.test(n)));
  assert.ok(first.notes.some((n) => /Kohlenhydrate/.test(n)));
  assert.ok(!first.notes.some((n) => /\d+\s*(IE|Einheiten|%)/.test(n)), 'keine Dosis-Angaben');
  assert.ok(!first.issues.some((i) => i.code === 'legsBeforeRun'));
  assert.equal(first.week[(JONAS_RUNS[0].day + 1) % 7], 'A', 'schwere Beine am Tag nach den Intervallen');
  assert.ok(rest.every((x) => x.notes.some((n) => /Diabetes-Team/.test(n))), 'T1D-Hinweis auch bei Alternativen');
});

test('Einsteiger:in zu Hause, 2× → Heimplan in der 2-Tage-Variante', () => {
  const r = top(PERSONAS.neuZuhause);
  assert.equal(r[0].id, 'home');
  assert.equal(r[0].days, 2);
  assert.equal(r[0].week.filter(Boolean).length, 2);
  assert.ok(r.every((x) => x.plan.equipment !== 'gym'), 'kein Studio-Plan ohne Studio');
});

test('Erfahren, 6× → PPL 6×', () => {
  const r = top(PERSONAS.erfahren6);
  assert.equal(r[0].id, 'ppl6');
  assert.ok(r.some((x) => x.id === 'hybrid5'));
  assert.ok(!r.some((x) => x.id === 'gk2' || x.id === 'ruecken'));
});

test('30 Minuten → Kurz & effektiv', () => {
  const r = top(PERSONAS.dreissigMin);
  assert.equal(r[0].id, 'kurz');
  assert.ok(r[0].minutes.max <= 30);
});

test('Rückenschmerzen, Einstieg → Rücken & Beweglichkeit mit Warnzeichen-Hinweis', () => {
  const r = top(PERSONAS.rueckenNeu);
  assert.equal(r[0].id, 'ruecken');
  assert.match(r[0].reason, /rückenfreundlich/);
  assert.ok(r[0].notes.some((n) => /ärztlich/.test(n)));
  // auch mit Studio bleibt der sanfte Plan vorn
  const gym = top({ ...PERSONAS.rueckenNeu, equipment: ['gym'] });
  assert.equal(gym[0].id, 'ruecken');
});

test('Schwangerschaft/Rückbildung → Verweis auf die eigenen Pläne', () => {
  const r = recommendPlans({ ...PERSONAS.neuZuhause, constraints: { pregnant: true } });
  assert.deepEqual(r.results, []);
  assert.equal(r.related.id, 'mama');
  assert.equal(recommendPlans({ ...PERSONAS.felix, constraints: { postpartum: true } }).related.id, 'mama');
});

test('Empfehlungen liefern höchstens 3, sortiert, mit Woche und Begründung', () => {
  for (const q of Object.values(PERSONAS)) {
    const r = top(q);
    assert.ok(r.length >= 1 && r.length <= 3);
    for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].score >= r[i].score);
    for (const x of r) {
      assert.match(x.reason, /^Passt(,| als)/);
      assert.equal(x.week.length, 7);
      assert.ok(x.days >= 1);
    }
  }
});

/* ------------------------------------------------------------ App-Format */

test('toAppPlans und repsLabel', () => {
  const plans = toAppPlans(planById('ou4'));
  assert.equal(plans.length, 4);
  assert.equal(plans[0].id, 'ou4-o1');
  assert.deepEqual(plans[0].items[0], { exercise: 'bench', sets: 4, reps: '5–8' });
  assert.equal(repsLabel({ reps: [20, 40], unit: 's', perSide: true }), '20–40 s je Seite');
  assert.equal(repsLabel({ reps: [10, 10] }), '10');
  assert.deepEqual(weekOf(planById('home'), { days: 9 }), planById('home').weeks[3], 'unbekannte Variante → Standard');
});

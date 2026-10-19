import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgram, createTimer, hasShortVersion, restProgram, shortMinutes } from '../../src/domain/timer.js';

/** Steuerbare Uhr. */
function fakeClock(start = 1_000_000) {
  let t = start;
  const clock = () => t;
  clock.advance = (ms) => {
    t += ms;
  };
  return clock;
}

const steps = [
  { kind: 'work', duration: 10, label: 'A' },
  { kind: 'rest', duration: 5, label: 'Pause' },
  { kind: 'work', duration: null, label: 'B (Wdh.)', reps: 10 },
  { kind: 'work', duration: 20, label: 'C', sideSwitch: true },
];

test('Restzeit kommt aus der Uhr, Pause hält sie an', () => {
  const clock = fakeClock();
  const t = createTimer(steps, { clock });
  assert.equal(t.remaining(), 10);
  t.start();
  clock.advance(3_200);
  assert.equal(t.remaining(), 7);
  t.pause();
  clock.advance(60_000);
  assert.equal(t.remaining(), 7);
  t.toggle();
  clock.advance(1_000);
  assert.equal(t.remaining(), 6);
  assert.equal(t.snapshot().running, true);
  assert.ok(Math.abs(t.snapshot().stepProgress - 0.42) < 1e-9);
});

test('Countdown 3-2-1 und automatischer Wechsel, Wiederholungs-Schritt hält an', () => {
  const clock = fakeClock();
  const t = createTimer(steps, { clock });
  t.start();
  clock.advance(6_500);
  assert.deepEqual(t.poll(), []);
  clock.advance(1_000);
  assert.deepEqual(t.poll(), [{ type: 'countdown', seconds: 3, index: 0 }]);
  assert.deepEqual(t.poll(), [], 'nicht doppelt');
  clock.advance(1_000);
  assert.deepEqual(t.poll(), [{ type: 'countdown', seconds: 2, index: 0 }]);
  clock.advance(1_500);
  const ev = t.poll();
  assert.deepEqual(ev[0], { type: 'stepEnd', index: 0 });
  assert.equal(t.snapshot().index, 1);
  assert.equal(t.remaining(), 5, 'Überhang 0 ms');
  clock.advance(5_000);
  assert.deepEqual(t.poll().map((e) => e.type), ['stepEnd']);
  assert.equal(t.snapshot().index, 2);
  assert.equal(t.snapshot().running, false, 'Wiederholungen warten auf „Fertig“');
  assert.equal(t.remaining(), null);
  t.start();
  assert.equal(t.snapshot().running, false, 'Start bei Wdh.-Schritt wirkungslos');
});

test('Hintergrund: verpasste Schritte werden nachgeholt, Überhang zählt', () => {
  const clock = fakeClock();
  const t = createTimer([{ kind: 'work', duration: 10, label: 'A' }, { kind: 'rest', duration: 10, label: 'P' }, { kind: 'work', duration: 10, label: 'B' }], { clock });
  t.start();
  clock.advance(23_000);
  const ev = t.poll();
  assert.deepEqual(ev.filter((e) => e.type === 'stepEnd').map((e) => e.index), [0, 1]);
  assert.equal(t.snapshot().index, 2);
  assert.equal(t.remaining(), 7);
  clock.advance(60_000);
  assert.deepEqual(t.poll().map((e) => e.type), ['stepEnd', 'finished']);
  assert.equal(t.snapshot().finished, true);
  assert.equal(t.remaining(), null);
  assert.deepEqual(t.poll(), []);
});

test('Seitenwechsel zur Hälfte, nur einmal, nicht bei übersprungenem Schritt', () => {
  const clock = fakeClock();
  const t = createTimer([{ kind: 'work', duration: 20, label: 'C', sideSwitch: true }, { kind: 'work', duration: 20, label: 'D', sideSwitch: true }], { clock });
  t.start();
  clock.advance(9_999);
  assert.deepEqual(t.poll(), []);
  clock.advance(1);
  assert.deepEqual(t.poll(), [{ type: 'sideSwitch', index: 0 }]);
  clock.advance(1_000);
  assert.deepEqual(t.poll(), []);
  // zweiter Schritt komplett im Hintergrund verpasst
  clock.advance(9_000 + 25_000);
  const ev = t.poll();
  assert.ok(!ev.some((e) => e.type === 'sideSwitch' && e.index === 1));
  assert.ok(ev.some((e) => e.type === 'finished'));
});

test('next/prev: Laufzustand bleibt bei Zeit-Schritten, „Fertig“ mit run', () => {
  const clock = fakeClock();
  const t = createTimer(steps, { clock });
  t.start();
  t.next();
  assert.equal(t.snapshot().index, 1);
  assert.equal(t.snapshot().running, true);
  t.next();
  assert.equal(t.snapshot().running, false);
  t.next({ run: true });
  assert.equal(t.snapshot().index, 3);
  assert.equal(t.snapshot().running, true);
  t.prev();
  assert.equal(t.snapshot().index, 2);
  assert.equal(t.snapshot().running, false);
  t.prev();
  t.prev();
  t.prev();
  assert.equal(t.snapshot().index, 0);
  assert.deepEqual(createTimer([{ kind: 'work', duration: 5, label: 'x' }], { clock }).next(), [{ type: 'finished' }]);
});

test('Zustand speichern und fortsetzen', () => {
  const clock = fakeClock();
  const t = createTimer(steps, { clock });
  t.start();
  clock.advance(4_000);
  t.pause();
  const saved = JSON.parse(JSON.stringify(t.getState()));
  const t2 = createTimer(steps, { clock, state: saved });
  assert.equal(t2.remaining(), 6);
  const running = createTimer(steps, { clock });
  running.start();
  clock.advance(2_000);
  const t3 = createTimer(steps, { clock, state: running.getState() });
  clock.advance(1_000);
  assert.equal(t3.remaining(), 7, 'läuft mit der echten Uhr weiter');
});

test('leeres Programm ist sofort fertig; nächste Übung im Snapshot', () => {
  const t = createTimer([]);
  assert.equal(t.snapshot().finished, true);
  t.start();
  assert.deepEqual(t.poll(), []);
  const t2 = createTimer(steps);
  assert.equal(t2.snapshot().nextWork.label, 'B (Wdh.)');
  assert.equal(t2.snapshot().total, 4);
});

test('Satzpause', () => {
  const clock = fakeClock();
  const t = createTimer(restProgram(90), { clock });
  t.start();
  clock.advance(90_000);
  assert.deepEqual(t.poll().map((e) => e.type), ['stepEnd', 'finished']);
});

/* ------------------------------------------------------------- Programme */

const circuitPlan = {
  id: 'b1',
  name: '10 Minuten ohne Geräte',
  minutes: 10,
  blocks: [
    { name: 'Aufwärmen', items: [{ ex: 'Marschieren', mode: 'time', work: 60, rest: 0, sets: 1 }] },
    {
      name: 'Hauptteil (Zirkel, 2 Runden)',
      items: [
        { ex: 'Kniebeugen', mode: 'time', work: 40, rest: 20, sets: 2 },
        { ex: 'Liegestütz', mode: 'time', work: 40, rest: 20, sets: 2 },
      ],
    },
    { name: 'Abschluss', items: [{ ex: 'Dehnen', mode: 'time', work: 60, rest: 0, sets: 1 }] },
  ],
};

test('Zirkel läuft in echten Runden', () => {
  const p = buildProgram(circuitPlan);
  assert.deepEqual(p.map((s) => (s.kind === 'rest' ? `P(${s.nextLabel})` : s.label)), [
    'Marschieren',
    'Kniebeugen', 'P(Gleich: Liegestütz)', 'Liegestütz', 'P(Gleich: Kniebeugen)',
    'Kniebeugen', 'P(Gleich: Liegestütz)', 'Liegestütz',
    'Dehnen',
  ]);
  assert.equal(p[1].block, 'Hauptteil · Runde 1 von 2');
  assert.equal(p[5].block, 'Hauptteil · Runde 2 von 2');
  assert.equal(p[1].duration, 40);
  assert.equal(p[2].duration, 20);
});

test('Kurzversion: jede Übung einmal', () => {
  const p = buildProgram(circuitPlan, { short: true });
  assert.deepEqual(p.filter((s) => s.kind === 'work').map((s) => s.label), ['Marschieren', 'Kniebeugen', 'Liegestütz', 'Dehnen']);
  assert.ok(hasShortVersion(circuitPlan));
  assert.equal(shortMinutes(circuitPlan), 5);
  assert.equal(shortMinutes({ ...circuitPlan, minutes: 30 }), 14);
});

test('normale Blöcke: Sätze, Pausen, Seitenwechsel, Wiederholungen, Narbe nur nach Kaiserschnitt', () => {
  const plan = {
    id: 'pp1a',
    name: 'Rückbildung',
    minutes: 15,
    blocks: [
      {
        name: 'Kräftigung',
        items: [
          { ex: 'Seitstütz', mode: 'time', work: 40, rest: 15, sets: 2, cue: 'Becken hoch; Seite wechseln.' },
          { ex: 'Narbenmobilisation', mode: 'time', work: 60, rest: 0, sets: 1 },
          { ex: 'Beckenheben', mode: 'reps', reps: 12, rest: 30, sets: 2, avoid_if: 'Schmerzen' },
        ],
      },
    ],
  };
  const p = buildProgram(plan);
  assert.deepEqual(p.map((s) => (s.kind === 'rest' ? `P(${s.nextLabel})` : s.label)), [
    'Seitstütz', 'P(Gleich: Seitstütz (Satz 2))', 'Seitstütz', 'P(Gleich: Beckenheben)', 'Beckenheben', 'P(Gleich: Beckenheben (Satz 2))', 'Beckenheben',
  ]);
  assert.equal(p[0].sideSwitch, true);
  assert.equal(p[0].block, 'Kräftigung · Satz 1 von 2');
  assert.equal(p[4].duration, null);
  assert.equal(p[4].reps, 12);
  assert.equal(p[4].avoid, 'Schmerzen');
  assert.equal(p[4].sideSwitch, false);
  const withScar = buildProgram(plan, { includeScar: true });
  assert.ok(withScar.some((s) => s.label === 'Narbenmobilisation'));
  assert.equal(buildProgram({ ...plan, blocks: [{ name: 'Nur Narbe', items: [plan.blocks[0].items[1]] }] }).length, 0);
});

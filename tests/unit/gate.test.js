import './helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GRACE_MINUTES, automationUrl, graceMinutesLeft, inGrace, openAnyway, recordChoice, weekStats } from '../../src/domain/gate.js';
import { balance, recordDetour } from '../../src/domain/account.js';
import { createStore, memoryAdapter } from '../../src/core/store.js';

const at = (iso) => new Date(iso).getTime();
const empty = () => ({ log: [], graceUntil: null });
const account = () => ({ days: {}, unlock: null });

test('Trotzdem öffnen: 5 Minuten vom Konto, Schonfrist, vermerkt', () => {
  const now = at('2026-10-21T20:00:00');
  const r = openAnyway({ account: account(), gate: empty(), today: '2026-10-21', now });
  assert.equal(r.minutes, 5);
  assert.equal(balance(r.account, '2026-10-21'), 10, '15 Grundzeit − 5');
  assert.equal(r.account.unlock.until, now + 5 * 60_000);
  assert.equal(r.gate.graceUntil, now + 5 * 60_000);
  assert.deepEqual(r.gate.log, [{ at: now, choice: 'open' }]);
});

test('Konto fast leer oder leer: nur der Rest bzw. nichts, Schonfrist trotzdem', () => {
  const now = at('2026-10-21T20:00:00');
  const low = { days: { '2026-10-21': { tries: 0, redirects: 0, used: 12, earned: 0, earnKeys: [] } }, unlock: null };
  const r = openAnyway({ account: low, gate: empty(), today: '2026-10-21', now });
  assert.equal(r.minutes, 3);
  assert.equal(balance(r.account, '2026-10-21'), 0);
  const r2 = openAnyway({ account: r.account, gate: r.gate, today: '2026-10-21', now: now + 1000 });
  assert.equal(r2.minutes, 0);
  assert.equal(r2.gate.graceUntil, now + 1000 + GRACE_MINUTES * 60_000);
  assert.equal(r2.gate.log.length, 2);
});

test('Schonfrist: davor weiterleiten, danach wieder fragen', () => {
  const gate = { log: [], graceUntil: 10 * 60_000 };
  assert.ok(inGrace(gate, 6 * 60_000));
  assert.equal(graceMinutesLeft(gate, 6 * 60_000 + 1), 4);
  assert.ok(!inGrace(gate, 10 * 60_000));
  assert.ok(!inGrace(empty(), 0));
  assert.equal(graceMinutesLeft(gate, 11 * 60_000), 0);
});

test('Wochenzahlen ab Montag, alte Einträge fallen nach 60 Tagen weg', () => {
  let gate = empty();
  gate = recordChoice(gate, 'breath', at('2026-10-18T21:00:00')); // Sonntag, Vorwoche
  gate = recordChoice(gate, 'breath', at('2026-10-19T09:00:00'));
  gate = recordChoice(gate, 'move', at('2026-10-20T09:00:00'));
  gate = recordChoice(gate, 'training', at('2026-10-20T18:00:00'));
  gate = recordChoice(gate, 'open', at('2026-10-21T20:00:00'));
  assert.deepEqual(weekStats(gate, at('2026-10-21T21:00:00')), { redirected: 3, opened: 1, total: 4 });
  assert.throws(() => recordChoice(gate, 'tiktok', 0));
  const later = recordChoice(gate, 'breath', at('2026-12-28T09:00:00'));
  assert.equal(later.log.length, 1);
});

test('Umlenkung zählt im Konto ohne Zeitgutschrift; Adresse aus der Seite; Speicherbereich', () => {
  const s = recordDetour(account(), '2026-10-21');
  assert.equal(s.days['2026-10-21'].redirects, 1);
  assert.equal(balance(s, '2026-10-21'), 15);
  assert.equal(automationUrl({ origin: 'https://flexibeel.github.io', pathname: '/nachtgarten/beta/' }), 'https://flexibeel.github.io/nachtgarten/beta/#umlenken?von=instagram');
  const store = createStore(memoryAdapter());
  assert.deepEqual(store.gate.get(), { log: [], graceUntil: null });
  store.gate.set({ log: [], graceUntil: 5 });
  assert.equal(createStore(store.adapter).gate.get().graceUntil, 5, 'übersteht Neuladen');
});

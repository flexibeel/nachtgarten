/**
 * „Wirklich jetzt?“ – die Instagram-Bremse (iOS-Kurzbefehl öffnet #umlenken?von=instagram).
 *
 * - Jede Entscheidung wird lokal vermerkt (60 Tage): zurück zum Training, kurz bewegen,
 *   durchatmen oder trotzdem öffnen.
 * - „Trotzdem öffnen“ nimmt 5 Minuten vom Zeitkonto (domain/account.js) und startet eine
 *   Schonfrist: Die Automation löst beim Öffnen von Instagram ja sofort wieder aus. Solange
 *   die Schonfrist läuft, leitet die Seite ohne Frage direkt weiter.
 * - Ist das Konto leer, wird nichts abgebucht; die Schonfrist gilt trotzdem (5 Minuten),
 *   damit man nicht in einer Schleife landet.
 * Rein, ohne DOM.
 */

import { monday, dateKey } from '../core/dates.js';
import { balance, take, withToday } from './account.js';

/** @typedef {import('../core/store.js').GateState} GateState */
/** @typedef {import('../core/store.js').GateChoice} GateChoice */
/** @typedef {import('../core/store.js').AccountState} AccountState */

export const TAKE_MINUTES = 5;
export const GRACE_MINUTES = 5;
export const LOG_DAYS = 60;
export const BREATH_SECONDS = 60;
export const MOVE_SECONDS = 120;
export const CHOICES = Object.freeze(/** @type {const} */ (['training', 'move', 'breath', 'open']));

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Läuft die Schonfrist nach „Trotzdem öffnen“?
 * @param {GateState} gate
 * @param {number} now
 */
export const inGrace = (gate, now) => typeof gate?.graceUntil === 'number' && now < gate.graceUntil;

/**
 * Restminuten der Schonfrist (aufgerundet).
 * @param {GateState} gate
 * @param {number} now
 */
export const graceMinutesLeft = (gate, now) => (inGrace(gate, now) ? Math.ceil((/** @type {number} */ (gate.graceUntil) - now) / 60_000) : 0);

/**
 * Entscheidung vermerken; Einträge älter als 60 Tage fallen weg.
 * @param {GateState} gate
 * @param {GateChoice} choice
 * @param {number} now
 * @returns {GateState}
 */
export function recordChoice(gate, choice, now) {
  if (!CHOICES.includes(choice)) throw new RangeError(`Unbekannte Wahl: ${choice}`);
  const log = (gate?.log ?? []).filter((e) => now - e.at < LOG_DAYS * DAY_MS);
  return { ...gate, log: [...log, { at: now, choice }] };
}

/**
 * Trotzdem öffnen: bis zu 5 Minuten vom Konto, Schonfrist setzen, vermerken.
 * @param {{account: AccountState, gate: GateState, today: string, now: number}} input
 * @returns {{account: AccountState, gate: GateState, minutes: number}}
 */
export function openAnyway({ account, gate, today, now }) {
  const minutes = Math.min(TAKE_MINUTES, balance(account, today));
  const nextAccount = minutes > 0 ? take(account, today, minutes, now) : withToday(account, today);
  const graceUntil = now + Math.max(minutes, GRACE_MINUTES) * 60_000;
  return { account: nextAccount, gate: recordChoice({ ...gate, graceUntil }, 'open', now), minutes };
}

/**
 * Wochenzahlen (ab Montag): wie oft umgelenkt, wie oft trotzdem geöffnet.
 * @param {GateState} gate
 * @param {number} now
 */
export function weekStats(gate, now) {
  const start = monday(now);
  const week = (gate?.log ?? []).filter((e) => dateKey(e.at) >= start && e.at <= now);
  const opened = week.filter((e) => e.choice === 'open').length;
  return { redirected: week.length - opened, opened, total: week.length };
}

/**
 * Adresse der Seite für die Automation (funktioniert in der Beta und später auf der Hauptseite).
 * @param {{origin: string, pathname: string}} location
 */
export const automationUrl = ({ origin, pathname }) => `${origin}${pathname}#umlenken?von=instagram`;

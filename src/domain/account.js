/**
 * Instagram-Zeitkonto.
 *
 * - Jeden Tag gibt es 15 Minuten Grundzeit.
 * - Verdienen: Training (auch Aktivität/Heimplan) +15 einmal am Tag,
 *   jemandem schreiben statt scrollen +5 bis zu dreimal am Tag,
 *   Feed bewusst durchgelesen +5 einmal am Tag.
 *   Jede Gutschrift hat einen Tages-Schlüssel, damit sie nicht doppelt zählt.
 * - Zeit nehmen öffnet ein Freigabe-Fenster; vorzeitig beenden schreibt die
 *   restlichen vollen Minuten wieder gut.
 * - Der Verlauf behält die letzten 30 Tage.
 * - Solange ein Live-Training läuft (letzte Aktivität < 3 h), ist Instagram gesperrt,
 *   wenn die Sperre eingeschaltet ist.
 */

import { dateKey } from '../core/dates.js';
import { AUTO_FINISH_MS, lastActivityAt } from './training.js';

/** @typedef {import('../core/store.js').AccountState} AccountState */
/** @typedef {import('../core/store.js').AccountDay} AccountDay */
/** @typedef {import('../core/store.js').LiveSession} LiveSession */

export const BASE_MINUTES = 15;
export const HISTORY_DAYS = 30;
export const TAKE_OPTIONS = Object.freeze([5, 10, 15]);

/** @type {Readonly<Record<'training'|'contact'|'feed', {minutes:number, key:string, perDay:number}>>} */
export const EARN_RULES = Object.freeze({
  training: { minutes: 15, key: 'training', perDay: 1 },
  contact: { minutes: 5, key: 'kontakt', perDay: 3 },
  feed: { minutes: 5, key: 'feed', perDay: 1 },
});

/** @returns {AccountDay} */
const emptyDay = () => ({ tries: 0, redirects: 0, used: 0, earned: 0, earnKeys: [] });

/**
 * Tageseintrag für heute sicherstellen und Verlauf auf 30 Tage kürzen.
 * @param {AccountState} state
 * @param {string} today
 * @returns {AccountState}
 */
export function withToday(state, today) {
  const days = { ...state.days };
  if (!days[today]) days[today] = emptyDay();
  const keep = Object.keys(days).sort().slice(-HISTORY_DAYS);
  return { ...state, days: Object.fromEntries(keep.map((k) => [k, days[k]])) };
}

/**
 * @param {AccountState} state
 * @param {string} today
 * @returns {AccountDay}
 */
export const dayOf = (state, today) => state.days[today] ?? emptyDay();

/**
 * Verfügbare Minuten heute.
 * @param {AccountState} state
 * @param {string} today
 */
export function balance(state, today) {
  const d = dayOf(state, today);
  return Math.max(0, BASE_MINUTES + d.earned - d.used);
}

/**
 * @param {AccountState} state
 * @param {string} today
 * @param {(day: AccountDay) => AccountDay} fn
 */
const changeDay = (state, today, fn) => {
  const s = withToday(state, today);
  return { ...s, days: { ...s.days, [today]: fn({ ...s.days[today] }) } };
};

/**
 * Gutschrift nach Regel. Liefert den neuen Zustand und die gutgeschriebenen Minuten (0 = schon erhalten).
 * @param {AccountState} state
 * @param {string} today
 * @param {keyof typeof EARN_RULES} rule
 */
export function earn(state, today, rule) {
  const r = EARN_RULES[rule];
  const day = dayOf(state, today);
  const used = day.earnKeys.filter((k) => k.startsWith(r.key)).length;
  if (used >= r.perDay) return { state: withToday(state, today), minutes: 0 };
  const key = r.perDay === 1 ? r.key : `${r.key}${used}`;
  const next = changeDay(state, today, (d) => ({ ...d, earned: d.earned + r.minutes, earnKeys: [...d.earnKeys, key] }));
  return { state: next, minutes: r.minutes };
}

/**
 * Versuch, Instagram zu öffnen.
 * @param {AccountState} state
 * @param {string} today
 */
export const recordTry = (state, today) => changeDay(state, today, (d) => ({ ...d, tries: d.tries + 1 }));

/**
 * Stattdessen jemandem geschrieben: zählt als Umlenkung und verdient Zeit.
 * @param {AccountState} state
 * @param {string} today
 */
export function recordRedirect(state, today) {
  const counted = changeDay(state, today, (d) => ({ ...d, redirects: d.redirects + 1 }));
  return earn(counted, today, 'contact');
}

/**
 * Auswahl beim Zeit-Nehmen: 5/10/15 Minuten, soweit gedeckt, sonst der Rest.
 * @param {number} available
 */
export function takeOptions(available) {
  if (available <= 0) return [];
  const opts = TAKE_OPTIONS.filter((m) => m <= available);
  return opts.length ? opts : [available];
}

/**
 * Zeit nehmen und Freigabe-Fenster öffnen.
 * @param {AccountState} state
 * @param {string} today
 * @param {number} minutes
 * @param {number} now
 * @returns {AccountState}
 */
export function take(state, today, minutes, now) {
  const m = Math.floor(minutes);
  if (m <= 0 || m > balance(state, today)) throw new RangeError('Nicht genug Zeit auf dem Konto');
  const next = changeDay(state, today, (d) => ({ ...d, used: d.used + m }));
  return { ...next, unlock: { until: now + m * 60_000 } };
}

/**
 * Restminuten der Freigabe (aufgerundet), 0 = keine Freigabe.
 * @param {AccountState} state
 * @param {number} now
 */
export function unlockMinutesLeft(state, now) {
  return state.unlock ? Math.max(0, Math.ceil((state.unlock.until - now) / 60_000)) : 0;
}

/**
 * Freigabe vorzeitig beenden; volle Restminuten gehen zurück aufs Konto.
 * @param {AccountState} state
 * @param {number} now
 * @returns {AccountState}
 */
export function endUnlock(state, now) {
  if (!state.unlock) return state;
  const refund = Math.max(0, Math.floor((state.unlock.until - now) / 60_000));
  const today = dateKey(now);
  const next = changeDay(state, today, (d) => ({ ...d, used: Math.max(0, d.used - refund) }));
  return { ...next, unlock: null };
}

/**
 * Ist Instagram wegen eines laufenden Trainings gesperrt?
 * @param {{live: LiveSession|null, lockDuringTraining: boolean, now: number}} input
 */
export function isTrainingLocked({ live, lockDuringTraining, now }) {
  return lockDuringTraining && !!live && now - lastActivityAt(live) < AUTO_FINISH_MS;
}

/**
 * Verlauf der letzten sieben Tage (ältester zuerst) für das Balkendiagramm.
 * @param {AccountState} state
 * @param {string[]} dates  sieben Datumsschlüssel
 */
export const recentDays = (state, dates) => dates.map((key) => ({ key, ...dayOf(state, key) }));

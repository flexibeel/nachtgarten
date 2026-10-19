/**
 * Keimi, der Begleiter: Wachstum und Stimmung.
 *
 * Wachstum: aktive Tage der letzten vier Wochen (heute + 27 Tage zurück).
 * Aktiv ist ein Tag mit Training/Aktivität, erledigter Gewohnheit oder Umlenkung.
 *   ab 16 Tagen Blüte (4), ab 10 Knospe (3), ab 4 zwei Blätter (2), sonst Keimling (1).
 * Keimi schrumpft höchstens eine Stufe unter die höchste je erreichte Stufe.
 *
 * Stimmung auf „Heute“ nach fester Reihenfolge: zurück nach Pause, Bestleistung,
 * Training erledigt, Nacht, eingeschlafen (4 Tage nichts), Training geplant, dann
 * zufällig Umlenkungs-Lob, Ruhetag oder Tageszeit. Zufall ist injizierbar.
 */

import { addDays, daysBetween } from '../core/dates.js';

/** @typedef {import('../core/store.js').BuddyState} BuddyState */

export const STAGE_NAMES = Object.freeze(['Keimling', 'Zwei Blätter', 'Knospe', 'Blüte']);
export const WINDOW_DAYS = 28;
export const IDLE_DAYS = 4;
/** Ab so vielen Tagen Abwesenheit begrüßt Keimi „Da bist du ja“. */
export const BACK_AFTER_DAYS = 3;

/**
 * @param {object} input
 * @param {string} input.today
 * @param {string[]} input.sessionDates
 * @param {Record<string, boolean>} input.habitDays
 * @param {Record<string, {redirects:number}>} input.accountDays
 * @returns {Set<string>}
 */
export function activeDays({ today, sessionDates, habitDays, accountDays }) {
  const from = addDays(today, -(WINDOW_DAYS - 1));
  const inWindow = (k) => k >= from && k <= today;
  const out = new Set();
  sessionDates.filter(inWindow).forEach((k) => out.add(k));
  Object.keys(habitDays).filter((k) => habitDays[k] && inWindow(k)).forEach((k) => out.add(k));
  Object.keys(accountDays).filter((k) => accountDays[k]?.redirects > 0 && inWindow(k)).forEach((k) => out.add(k));
  return out;
}

/**
 * Stufe nur aus der Zahl aktiver Tage.
 * @param {number} active
 * @returns {1|2|3|4}
 */
export function stageFromActiveDays(active) {
  if (active >= 16) return 4;
  if (active >= 10) return 3;
  if (active >= 4) return 2;
  return 1;
}

/**
 * Stufe mit Gedächtnis: nie mehr als eine Stufe unter der höchsten.
 * @param {number} active
 * @param {number} maxStage
 * @returns {{stage:number, maxStage:number}}
 */
export function growth(active, maxStage) {
  const max = Math.max(1, maxStage || 1);
  const stage = Math.max(stageFromActiveDays(active), max - 1);
  return { stage, maxStage: Math.max(max, stage) };
}

/**
 * Eingeschlafen: an den letzten vier Tagen nichts, aber es gab schon einmal etwas.
 * @param {Set<string>} active
 * @param {string} today
 * @param {boolean} hasAnyHistory
 */
export function isIdle(active, today, hasAnyHistory) {
  for (let i = 0; i < IDLE_DAYS; i++) if (active.has(addDays(today, -i))) return false;
  return active.size > 0 || hasAnyHistory;
}

/**
 * Besuch auf „Heute“ vermerken; nach ≥ 3 Tagen Pause gibt es eine Begrüßung.
 * @param {BuddyState} state
 * @param {string} today
 * @returns {BuddyState}
 */
export function visit(state, today) {
  if (state.lastVisit === today) return state;
  const back = state.lastVisit && daysBetween(state.lastVisit, today) >= BACK_AFTER_DAYS;
  return back
    ? { ...state, lastVisit: today, backDay: today, backShown: false }
    : { ...state, lastVisit: today };
}

/**
 * @typedef {'back'|'pr'|'trainDone'|'night'|'sleepy'|'trainToday'|'redirect'|'rest'|'morning'|'day'|'evening'} BuddyContext
 * @typedef {'calm'|'happy'|'cheer'|'tired'|'proud'} BuddyMood
 */

/**
 * Was Keimi gerade sagt und wie er schaut.
 * @param {object} input
 * @param {BuddyState} input.state
 * @param {string} input.today
 * @param {number} input.hour          0–23
 * @param {boolean} input.prToday
 * @param {boolean} input.trainedToday
 * @param {boolean} input.plannedToday
 * @param {boolean} input.idle
 * @param {number} input.redirectsThisWeek
 * @param {() => number} [input.random]
 * @returns {{context: BuddyContext, mood: BuddyMood, wake?: boolean, redirects?: number}}
 */
export function moodFor({ state, today, hour, prToday, trainedToday, plannedToday, idle, redirectsThisWeek, random = Math.random }) {
  if (state.backDay === today && !state.backShown) return { context: 'back', mood: 'happy', wake: true };
  if (prToday) return { context: 'pr', mood: 'proud' };
  if (trainedToday) return { context: 'trainDone', mood: 'proud' };
  if (hour >= 22 || hour < 5) return { context: 'night', mood: 'tired' };
  if (idle) return { context: 'sleepy', mood: 'tired' };
  if (plannedToday) return { context: 'trainToday', mood: state.tone === 'ruhig' ? 'calm' : 'cheer' };
  if (redirectsThisWeek > 0 && random() < 0.4) return { context: 'redirect', mood: 'happy', redirects: redirectsThisWeek };
  if (random() < 0.5) return { context: 'rest', mood: 'calm' };
  return { context: hour < 11 ? 'morning' : hour >= 17 ? 'evening' : 'day', mood: 'calm' };
}

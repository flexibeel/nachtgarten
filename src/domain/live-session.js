/**
 * Zustand des Live-Bildschirms (was gerade eingestellt ist), getrennt vom gespeicherten
 * Training (store.live). Reine Funktionen: Reducer, Vorbelegung, Plan-Warteschlange, Pause.
 *
 * Die Pause ist zeitstempelbasiert: gespeichert sind Start und Dauer, die Restzeit wird
 * aus „jetzt“ berechnet – sie stimmt also auch nach Sperrbildschirm oder Neuladen.
 */

import { applyDailyForm, repRangeOrDefault, stepOrDefault, targetLowReps } from './progression.js';

/** @typedef {import('../core/store.js').LiveSession} LiveSession */
/** @typedef {import('../core/store.js').SetRecord} SetRecord */

/** Pausenlängen zum Durchschalten (Sekunden). */
export const REST_OPTIONS = Object.freeze([60, 90, 120, 180]);
export const REST_ADD = 30;
export const MAX_REST = 600;

/**
 * Geräteart je Gerätename der App (deutsch, wie in data/library.js und exercise-db.js).
 * Was hier fehlt (Sonstiges, Eigenes, Unbekanntes), hat keine sinnvolle Vorgabe.
 */
export const GEAR_KIND = Object.freeze({
  Langhantel: 'barbell',
  Multipresse: 'barbell',
  'SZ-Stange': 'ezbar',
  Kurzhanteln: 'dumbbell',
  Kurzhantel: 'dumbbell',
  Kabelzug: 'cable',
  Maschinen: 'machine',
  Maschine: 'machine',
  Kettlebell: 'kettlebell',
  'Körpergewicht': 'bodyweight',
  Klimmzugstange: 'bodyweight',
  'Bänder': 'band',
  Band: 'band',
});

/** Startgewicht ohne Verlauf je Geräteart in kg (SPEC 3.9.7). */
export const START_WEIGHT = Object.freeze({
  barbell: 20,
  ezbar: 10,
  dumbbell: 8,
  cable: 15,
  machine: 15,
  kettlebell: 12,
  bodyweight: 0,
  band: 0,
});

/** @param {string|undefined} gear */
export const gearKind = (gear) => /** @type {Record<string, string>} */ (GEAR_KIND)[gear ?? ''] ?? null;

/** Übung ohne Zusatzlast (Gewichtsfeld zeigt „Körpergewicht“). @param {string|undefined} gear */
export const isBodyweightGear = (gear) => gearKind(gear) === 'bodyweight';

/**
 * Startgewicht für eine Übung ohne eigenen Verlauf: nach Geräteart, sonst das zuletzt
 * benutzte Gewicht (z. B. „Sonstiges“), ohne beides 0.
 * @param {string|undefined} gear
 * @param {number|null} [lastUsed]
 */
export function defaultWeight(gear, lastUsed = null) {
  const kind = gearKind(gear);
  if (kind && kind in START_WEIGHT) return /** @type {Record<string, number>} */ (START_WEIGHT)[kind];
  return Number.isFinite(lastUsed) && /** @type {number} */ (lastUsed) >= 0 ? /** @type {number} */ (lastUsed) : 0;
}

/**
 * Zuletzt benutztes Gewicht über alle Übungen: letzter Satz im laufenden Training,
 * sonst der jüngste Verlaufseintrag (Datum, dann Reihenfolge). null = noch nie trainiert.
 * @param {{liveSets?: {weight: number}[], history?: Record<string, SetRecord[]>}} input
 */
export function lastUsedWeight({ liveSets = [], history = {} }) {
  const live = liveSets[liveSets.length - 1];
  if (live) return live.weight;
  let best = /** @type {SetRecord|null} */ (null);
  for (const list of Object.values(history)) {
    const last = list[list.length - 1];
    if (last && (!best || last.date > best.date || (last.date === best.date && (last.session ?? 0) > (best.session ?? 0)))) best = last;
  }
  return best ? best.weight : null;
}

/**
 * „Letztes Mal“: Sätze des letzten früheren Trainingstags, zusammengefasst als
 * Anzahl × Wiederholungen · Gewicht (schwerstes Gewicht, beste Wdh. damit).
 * @param {SetRecord[]} history   Verlauf der Übung, chronologisch
 * @param {string} today
 * @returns {{sets: number, reps: number, weight: number}|null}
 */
export function lastSessionSummary(history, today) {
  const before = history.filter((x) => x.date !== today);
  if (!before.length) return null;
  const date = before[before.length - 1].date;
  const sets = before.filter((x) => x.date === date);
  const weight = Math.max(...sets.map((x) => x.weight));
  const reps = Math.max(...sets.filter((x) => x.weight === weight).map((x) => x.reps));
  return { sets: sets.length, reps, weight };
}

/**
 * @typedef {object} LiveUi
 * @property {string|null} exercise
 * @property {number} weight
 * @property {number} reps
 * @property {number|null} rir
 * @property {{start: number, duration: number}|null} rest
 */

/** @returns {LiveUi} */
export const initialUi = () => ({ exercise: null, weight: 0, reps: 10, rir: null, rest: null });

/**
 * @param {LiveUi} state
 * @param {{type: string, [k: string]: any}} action
 * @returns {LiveUi}
 */
export function liveReducer(state, action) {
  switch (action.type) {
    case 'select':
      return { ...state, exercise: action.exercise, weight: action.weight, reps: action.reps };
    case 'weight':
      return { ...state, weight: Math.max(0, Math.min(500, action.value)) };
    case 'reps':
      return { ...state, reps: Math.max(1, Math.min(100, Math.round(action.value))) };
    case 'rir':
      return { ...state, rir: state.rir === action.value ? null : action.value };
    case 'logged':
      return { ...state, rest: action.restSeconds > 0 ? { start: action.at, duration: action.restSeconds } : null };
    case 'restAdd':
      return state.rest ? { ...state, rest: { ...state.rest, duration: Math.min(MAX_REST, state.rest.duration + (action.seconds ?? REST_ADD)) } } : state;
    case 'restSkip':
      return { ...state, rest: null };
    default:
      return state;
  }
}

/**
 * Restliche Pause in Sekunden (aufgerundet, nie negativ).
 * @param {LiveUi['rest']} rest
 * @param {number} now
 */
export function restLeft(rest, now) {
  if (!rest) return 0;
  return Math.max(0, Math.ceil((rest.start + rest.duration * 1000 - now) / 1000));
}

/**
 * Anteil der vergangenen Pause (0…1).
 * @param {LiveUi['rest']} rest
 * @param {number} now
 */
export function restProgress(rest, now) {
  if (!rest || rest.duration <= 0) return 1;
  return Math.min(1, Math.max(0, (now - rest.start) / (rest.duration * 1000)));
}

/**
 * Gewicht und Wiederholungen beim Wählen einer Übung (SPEC 3.9.7).
 * @param {object} input
 * @param {SetRecord[]} input.history          Verlauf der Übung
 * @param {string} input.gear
 * @param {string|null} [input.target]         Soll aus dem Plan („8–12“)
 * @param {[number, number]} [input.repRange]
 * @param {string} [input.goal]
 * @param {'low'|'ok'|'high'|null} [input.form]
 * @param {number} [input.step]
 * @param {number|null} [input.lastUsed]      zuletzt benutztes Gewicht (für Geräte ohne Vorgabe)
 */
export function prefill({ history, gear, target = null, repRange, goal, form = null, step, lastUsed = null }) {
  const last = history[history.length - 1];
  const range = repRangeOrDefault(repRange, goal);
  let weight = last ? last.weight : defaultWeight(gear, lastUsed);
  weight = applyDailyForm(weight, form, { hasHistory: !!last, step: stepOrDefault(step) });
  const fromTarget = target ? targetLowReps(target) : null;
  const reps = fromTarget ?? (last ? last.reps : range[0]);
  return { weight, reps };
}

/**
 * Wie viele Sätze einer Übung in diesem Training schon gespeichert sind.
 * @param {LiveSession} live
 * @param {string} exercise
 */
export const setsDone = (live, exercise) => live.sets.filter((s) => s.exercise === exercise).length;

/**
 * Nächste Übung des Plans mit offenen Sätzen, zyklisch ab `from` (null = alles geschafft).
 * @param {LiveSession} live
 * @param {string|null} from
 */
export function nextQueueExercise(live, from) {
  const items = live.queue?.items ?? [];
  if (!items.length) return null;
  const start = Math.max(0, items.findIndex((it) => it.exercise === from));
  for (let k = 0; k < items.length; k++) {
    const it = items[(start + k) % items.length];
    if (setsDone(live, it.exercise) < it.sets) return it.exercise;
  }
  return null;
}

/**
 * Plan-Fortschritt: erledigte Sätze (je Übung höchstens Soll) von allen.
 * @param {LiveSession} live
 */
export function queueProgress(live) {
  const items = live.queue?.items ?? [];
  const total = items.reduce((a, it) => a + it.sets, 0);
  const done = items.reduce((a, it) => a + Math.min(it.sets, setsDone(live, it.exercise)), 0);
  return { done, total };
}

/**
 * Punkte für den Satz-Fortschritt einer Übung: erledigt, aktuell, offen.
 * Mit Soll aus dem Plan so viele Punkte wie Sätze (plus Zusatzsätze), frei: erledigte + ein offener.
 * @param {number} done
 * @param {number|null} target   Soll-Sätze (null = freies Training)
 * @returns {('done'|'current'|'open')[]}
 */
export function setDots(done, target) {
  const total = target ? Math.max(target, done) : done + 1;
  return Array.from({ length: Math.min(total, 12) }, (_, i) => (i < done ? 'done' : i === done ? 'current' : 'open'));
}

/**
 * Plan → Warteschlange für das Live-Training.
 * @param {import('../core/store.js').Plan} plan
 * @returns {import('../core/store.js').LiveQueue}
 */
export function queueFromPlan(plan) {
  return {
    planId: plan.id,
    name: plan.name,
    // Pause je Übung aus dem eigenen Plan (Sekunden), sonst gilt die allgemeine Einstellung.
    items: plan.items.map((it) => ({ exercise: it.exercise, sets: it.sets, reps: it.reps, ...(Number.isFinite(/** @type {any} */ (it).rest) ? { rest: /** @type {any} */ (it).rest } : {}) })),
    index: 0,
  };
}

/** Einstellung „Anleitung vor jeder Übung zeigen“. */
export const HOW_TO_OPTIONS = Object.freeze(/** @type {const} */ (['first', 'always', 'never']));

/**
 * Zeigt das Live-Training zuerst „So geht’s“ (große Animation, Hinweise, Gerät)?
 * Nie mitten in einer Übung (schon Sätze heute); „first“ = nur beim allerersten Mal.
 * @param {{setting?: string, setsToday: number, hasHistory: boolean, seen: boolean}} input
 */
export function showIntro({ setting = 'first', setsToday, hasHistory, seen }) {
  if (setsToday > 0 || setting === 'never') return false;
  if (setting === 'always') return true;
  return !hasHistory && !seen;
}

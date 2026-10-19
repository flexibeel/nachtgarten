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

/** Startgewicht ohne Verlauf, je Gerät (SPEC 3.9.7, Soll). */
export const START_WEIGHT = Object.freeze({
  'Körpergewicht': 0,
  'Bänder': 0,
  Eigenes: 0,
  Sonstiges: 0,
  Kurzhanteln: 5,
  Kettlebell: 8,
  Kabelzug: 10,
  Maschinen: 10,
  'SZ-Stange': 10,
  Langhantel: 20,
  Klimmzugstange: 0,
});

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
 */
export function prefill({ history, gear, target = null, repRange, goal, form = null, step }) {
  const last = history[history.length - 1];
  const range = repRangeOrDefault(repRange, goal);
  let weight = last ? last.weight : START_WEIGHT[gear] ?? 0;
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
 * Plan → Warteschlange für das Live-Training.
 * @param {import('../core/store.js').Plan} plan
 * @returns {import('../core/store.js').LiveQueue}
 */
export function queueFromPlan(plan) {
  return { planId: plan.id, name: plan.name, items: plan.items.map((it) => ({ exercise: it.exercise, sets: it.sets, reps: it.reps })), index: 0 };
}

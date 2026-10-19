/**
 * Doppelte Progression: erst Wiederholungen im Bereich steigern, oben angekommen
 * Gewicht erhöhen und unten im Bereich neu beginnen.
 *
 * Besonderheiten:
 * - Bereich und Gewichtsstufe pro Übung einstellbar (sonst Standard aus dem Ziel bzw. 2,5 kg).
 * - Leichte Gewichte: Eine Stufe von mehr als 12 % wird nicht sofort vorgeschlagen
 *   (z. B. 4 → 6,5 kg wären +62 %). Erst wenn die Wiederholungen deutlich über dem
 *   Bereich liegen (≥ oben + 3), kommt der Sprung.
 * - Nur Körpergewicht: Wiederholungen steigern, oben angekommen Zusatzgewicht/Variante.
 * - Satz mit RIR 0 (Muskelversagen) zählt nicht als „sicher oben angekommen“.
 *
 * Ergebnis ist ein Vorschlag mit Text-Schlüssel und Parametern (Texte in data/texts/de.js).
 */

import { round } from '../core/format.js';

/** @typedef {import('../core/store.js').SetRecord} SetRecord */
/** @typedef {import('../core/store.js').Goal} Goal */

export const STEP_OPTIONS = Object.freeze([1, 1.25, 2.5, 5]);
export const DEFAULT_STEP = 2.5;
export const REP_RANGE_OPTIONS = Object.freeze([[3, 6], [6, 10], [8, 12], [10, 15], [12, 20]]);
/** @type {Readonly<Record<string, [number, number]>>} */
export const REP_RANGE_BY_GOAL = Object.freeze({
  Muskelaufbau: [8, 12],
  Kraft: [3, 6],
  'Fit bleiben': [10, 15],
  Abnehmen: [12, 20],
  Ausdauer: [12, 20],
});
export const DEFAULT_REP_RANGE = /** @type {[number, number]} */ ([8, 12]);
/** Größter relativer Gewichtssprung, der ohne Weiteres vorgeschlagen wird. */
export const MAX_RELATIVE_JUMP = 0.12;
/** So viele Wiederholungen über dem Bereich erlauben auch einen großen Sprung. */
export const OVERSHOOT_REPS = 3;

/**
 * @typedef {object} Suggestion
 * @property {'progression.bodyweightLoad'|'progression.bodyweightRep'|'progression.jumpAfterOvershoot'|'progression.repBeforeBigJump'|'progression.addWeight'|'progression.lighter'|'progression.addRep'} key
 * @property {Record<string, number>} params
 * @property {number|null} weight   vorgeschlagenes Gewicht (null = nicht ändern)
 * @property {number|null} reps     vorgeschlagene Wiederholungen
 */

/**
 * @param {number|undefined} step
 */
export const stepOrDefault = (step) => (STEP_OPTIONS.includes(step) ? step : DEFAULT_STEP);

/**
 * @param {[number, number]|undefined} range
 * @param {Goal|undefined} goal
 * @returns {[number, number]}
 */
export function repRangeOrDefault(range, goal) {
  if (Array.isArray(range) && range.length === 2 && range[0] <= range[1]) return range;
  return REP_RANGE_BY_GOAL[goal] ?? DEFAULT_REP_RANGE;
}

/**
 * Sätze des letzten Trainingstags vor `today`.
 * @param {SetRecord[]} history  chronologisch
 * @param {string} today
 */
export function lastSessionSets(history, today) {
  const before = history.filter((x) => x.date !== today);
  if (!before.length) return [];
  const last = before[before.length - 1].date;
  return before.filter((x) => x.date === last);
}

/**
 * Erste Zahl aus einem Plan-Soll ("8–10" → 8). Zeitangaben ("45 s") → null.
 * @param {string} target
 */
export function targetLowReps(target) {
  const t = String(target ?? '');
  if (/\d\s*(s|sek|min)\b/i.test(t)) return null;
  const m = t.match(/\d+/);
  return m ? Math.max(1, Math.min(100, Number(m[0]))) : null;
}

/**
 * Vorschlag für heute.
 * @param {object} input
 * @param {SetRecord[]} input.history   alle Sätze dieser Übung
 * @param {string} input.today          Datumsschlüssel
 * @param {boolean} input.bodyweight    Übung mit Körpergewicht
 * @param {[number, number]} input.repRange
 * @param {number} input.step           Gewichtsstufe in kg
 * @returns {Suggestion|null}
 */
export function suggest({ history, today, bodyweight, repRange, step }) {
  const last = lastSessionSets(history, today);
  if (!last.length) return null;
  const [lo, hi] = repRange;
  const weight = Math.max(...last.map((x) => x.weight));
  const atWeight = last.filter((x) => x.weight === weight);
  const maxReps = Math.max(...atWeight.map((x) => x.reps));
  const reachedTop =
    atWeight.length >= Math.min(2, last.length) &&
    atWeight.every((x) => x.reps >= hi && (x.rir == null || x.rir >= 1));

  if (bodyweight && weight === 0) {
    return reachedTop
      ? { key: 'progression.bodyweightLoad', params: { hi }, weight: null, reps: null }
      : { key: 'progression.bodyweightRep', params: { lo, hi }, weight: null, reps: Math.min(hi, maxReps + 1) };
  }

  if (reachedTop) {
    const relative = weight > 0 ? step / weight : 0;
    if (relative > MAX_RELATIVE_JUMP) {
      if (maxReps >= hi + OVERSHOOT_REPS) {
        return {
          key: 'progression.jumpAfterOvershoot',
          params: { reps: maxReps, weight, step, lo },
          weight: round(weight + step, 2),
          reps: lo,
        };
      }
      return {
        key: 'progression.repBeforeBigJump',
        params: { hi, step, percent: Math.round(relative * 100), weight },
        weight,
        reps: maxReps + 1,
      };
    }
    return { key: 'progression.addWeight', params: { hi, step, lo }, weight: round(weight + step, 2), reps: lo };
  }

  if (weight > 0 && maxReps < lo - 1 && weight - step > 0) {
    return { key: 'progression.lighter', params: { lo, hi }, weight: round(weight - step, 2), reps: lo };
  }
  return { key: 'progression.addRep', params: { lo, hi }, weight, reps: Math.min(hi, maxReps + 1) };
}

/**
 * Tagesform anwenden: müde → 10 % leichter (auf 2,5 kg abgerundet), fit → eine Stufe mehr.
 * @param {number} weight
 * @param {'low'|'ok'|'high'|null} form
 * @param {{hasHistory: boolean, step?: number}} [ctx]
 */
export function applyDailyForm(weight, form, { hasHistory, step = DEFAULT_STEP } = { hasHistory: false }) {
  if (form === 'low' && weight > 0) return Math.max(0, Math.floor((weight * 0.9) / 2.5) * 2.5);
  if (form === 'high' && hasHistory) return round(weight + step, 2);
  return weight;
}

/**
 * Langhantel-Scheiben pro Seite (größte zuerst), z. B. 60 kg mit 20-kg-Stange → [20].
 * @param {number} total
 * @param {number} [bar]
 * @returns {number[]}
 */
export function platesPerSide(total, bar = 20) {
  let per = (total - bar) / 2;
  const out = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) {
    while (per >= p - 1e-9) {
      out.push(p);
      per -= p;
    }
  }
  return out;
}

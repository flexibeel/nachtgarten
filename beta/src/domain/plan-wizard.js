/**
 * „Plan für mich finden“: vier Fragen (Wie oft? Wie lange? Wo? Wie erfahren?) → Anfrage an
 * recommendPlans. Der Schwerpunkt wird nicht gefragt, er kommt aus dem Ziel im Profil.
 * Rein, ohne DOM.
 */

import { recommendPlans } from './plan-select.js';

/** @typedef {import('./plan-select.js').PlanQuery} PlanQuery */

export const WIZARD_STEPS = Object.freeze(/** @type {const} */ (['days', 'minutes', 'where', 'experience']));

/** Antwortmöglichkeiten je Schritt (Beschriftung über t(`wizard.<schritt>.<wert>`)). */
export const WIZARD_OPTIONS = Object.freeze({
  days: Object.freeze([2, 3, 4, 5, 6]),
  minutes: Object.freeze([30, 45, 60, 75]),
  where: Object.freeze(/** @type {const} */ (['gym', 'home', 'none'])),
  experience: Object.freeze(/** @type {const} */ (['neu', 'etwas', 'erfahren'])),
});

/** „75+“ heißt: Zeit spielt keine Rolle. */
const OPEN_END_MINUTES = 90;

/** Profilziel (v1-Ids) → Schwerpunkt der Pläne. */
const FOCUS_BY_GOAL = Object.freeze({
  Kraft: 'kraft',
  Muskelaufbau: 'muskel',
  'Fit bleiben': 'fit',
  Abnehmen: 'fit',
  Ausdauer: 'laufen',
});

/**
 * @param {string|undefined|null} goal
 * @returns {PlanQuery['focus']}
 */
export const focusFromGoal = (goal) => FOCUS_BY_GOAL[goal ?? ''] ?? 'muskel';

/**
 * Vorschlag für „Wie erfahren?“: ohne Krafttraining im Verlauf „neu“, sonst „etwas“.
 * @param {{kind?: string}[]} sessions
 */
export const experienceGuess = (sessions) => (sessions.some((s) => s.kind === 'strength') ? 'etwas' : 'neu');

/**
 * Antworten vollständig?
 * @param {Partial<Record<typeof WIZARD_STEPS[number], unknown>>} answers
 */
export const isComplete = (answers) => WIZARD_STEPS.every((k) => answers[k] != null);

/**
 * Antworten → Anfrage an recommendPlans.
 * @param {{days: number, minutes: number, where: 'gym'|'home'|'none', experience: 'neu'|'etwas'|'erfahren'}} answers
 * @param {{goal?: string|null}} [profile]
 * @returns {PlanQuery}
 */
export function wizardQuery(answers, profile = {}) {
  return {
    daysPerWeek: answers.days,
    minutesPerSession: answers.minutes >= 75 ? OPEN_END_MINUTES : answers.minutes,
    equipment: [answers.where],
    experience: answers.experience,
    focus: focusFromGoal(profile?.goal),
  };
}

/**
 * Drei Vorschläge für die Antworten.
 * @param {Parameters<typeof wizardQuery>[0]} answers
 * @param {Parameters<typeof wizardQuery>[1]} [profile]
 */
export const wizardResults = (answers, profile) => recommendPlans(wizardQuery(answers, profile)).results;

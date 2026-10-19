/**
 * „Plan für mich finden“: vier Fragen (Wie oft? Wie lange? Wo? Wie erfahren?) → Anfrage an
 * recommendPlans. Der Schwerpunkt wird nicht gefragt, er kommt aus dem Ziel im Profil.
 * Rein, ohne DOM.
 */

import { recommendPlans, toAppPlans } from './plan-select.js';

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

/**
 * Vorlage übernehmen: Einheiten als App-Pläne (g_-Übungen mit exakter Entsprechung bekommen
 * die Bibliotheks-Id), Wochenplan belegen. Eigene Pläne und Aktivitäten im Wochenplan bleiben,
 * Einheiten einer früher gewählten Vorlage werden ersetzt.
 * @param {import('../data/plans.js').PlanTemplate} template
 * @param {{week: (string|null)[], plans: import('../core/store.js').Plan[], schedule: import('../core/store.js').Schedule, previous?: string|null}} input
 * @param {(id: string) => string} mapId   z. B. libraryIdFor
 */
export function adoptTemplate(template, { week, plans, schedule, previous = null }, mapId) {
  const prefix = (id) => `${id}-`;
  const apps = toAppPlans(template).map((p) => ({ ...p, template: template.id, items: p.items.map((it) => ({ ...it, exercise: mapId(it.exercise) })) }));
  const drop = (p) => p.id.startsWith(prefix(template.id)) || (previous && p.id.startsWith(prefix(previous)));
  const nextPlans = [...plans.filter((p) => !drop(p)), ...apps];
  /** @type {import('../core/store.js').Schedule} */
  const nextSchedule = {};
  for (const [day, slot] of Object.entries(schedule)) if (slot?.kind === 'activity') nextSchedule[day] = slot;
  week.forEach((sessionId, day) => {
    if (sessionId) nextSchedule[String(day)] = { kind: 'plan', id: `${template.id}-${sessionId}`.toLowerCase() };
  });
  return { plans: nextPlans, schedule: nextSchedule, days: week.filter(Boolean).length };
}

/**
 * Kurzes Etikett einer Einheit für die Tages-Chips („A“, „O1“, „Push“).
 * @param {{id: string, name: string}} session
 */
export const sessionChip = (session) => (session.id.length <= 3 ? session.id : session.name.split(/[\s(]/)[0]);

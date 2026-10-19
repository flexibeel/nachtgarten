/**
 * Heimpläne: Auswahl für heute, Woche, Abfragen vor dem nächsten Schritt, Protokoll-Eintrag.
 * Rein (ohne DOM, ohne Speicher). Inhalte in data/homeplans.js, Schritte in domain/timer.js.
 *
 * - „Heute für dich“: ein Plan der aktuellen Phase. Wurde heute schon einer geschafft, ist es dieser
 *   (erledigt). Sonst der Plan nach dem zuletzt geschafften dieser Phase (die Pläne wechseln sich ab),
 *   ohne Vorgeschichte der erste.
 * - Woche: Heimplan-Einheiten Mo–So; drei pro Woche sind ein ruhiges Ziel (Leitlinien: etwa
 *   150 Minuten moderate Bewegung, über mehrere Tage verteilt), keine Pflicht.
 * - Wochentipp: notes[Woche mod Anzahl] (SPEC 5.9).
 */

import { addDays, dateKey, monday, weekdayIdx } from '../core/dates.js';
import { shortMinutes } from './timer.js';

/**
 * @typedef {import('./timer.js').HomePlan & {level?: string, equipment?: string[]}} Plan
 * @typedef {object} Phase
 * @property {string} id
 * @property {string} title
 * @property {[number, number]} weeks
 * @property {string} focus
 * @property {string[]} notes
 * @property {string[]} [csection_notes]
 * @property {string[]} [return_to_running_criteria]
 * @property {Plan[]} plans
 * @typedef {object} MamaContent
 * @property {string} disclaimer
 * @property {string[]} contraindications_absolute
 * @property {string[]} contraindications_relative
 * @property {string[]} stop_signs
 * @property {string[]} principles
 * @property {Phase[]} phases
 * @typedef {import('../core/store.js').Session} Session
 */

/** Ruhiges Wochenziel für Heimpläne. */
export const WEEK_GOAL = 3;

/** Plan, vor dem eine Checkliste („Belastungstest“) bestätigt wird. */
export const STRESS_TEST_PLAN = 'pp2b';

/**
 * @param {MamaContent} content
 * @param {string} id
 * @returns {Phase|null}
 */
export const phaseById = (content, id) => content.phases.find((p) => p.id === id) ?? null;

/**
 * Plan aus allen Phasen und den Einsteigerplänen.
 * @param {{mama: MamaContent, begin: Plan[]}} all
 * @param {string} id
 * @returns {{plan: Plan, phase: Phase|null}|null}
 */
export function findPlan({ mama, begin }, id) {
  for (const phase of mama.phases) {
    const plan = phase.plans.find((p) => p.id === id);
    if (plan) return { plan, phase };
  }
  const plan = begin.find((p) => p.id === id);
  return plan ? { plan, phase: null } : null;
}

/** Heimplan-Einträge (ohne Aktivitäten und Krafttraining). @param {Session[]} sessions */
const homeSessions = (sessions) => sessions.filter((s) => s.kind === 'homeplan');

/**
 * „Heute für dich“.
 * @param {Phase} phase
 * @param {Session[]} sessions
 * @param {string} today
 * @returns {{plan: Plan, doneToday: boolean}}
 */
export function todayPick(phase, sessions, today) {
  const ids = phase.plans.map((p) => p.id);
  const mine = homeSessions(sessions).filter((s) => ids.includes(s.planId ?? ''));
  const todays = mine.filter((s) => s.date === today);
  if (todays.length) {
    const last = todays[todays.length - 1];
    return { plan: phase.plans[ids.indexOf(last.planId ?? '')], doneToday: true };
  }
  const before = mine.filter((s) => s.date < today).sort((a, b) => a.date.localeCompare(b.date));
  if (!before.length) return { plan: phase.plans[0], doneToday: false };
  const lastIdx = ids.indexOf(before[before.length - 1].planId ?? '');
  return { plan: phase.plans[(lastIdx + 1) % phase.plans.length], doneToday: false };
}

/**
 * Woche Mo–So: an welchen Tagen ein Heimplan geschafft wurde, wie viele Einheiten, welche Pläne.
 * @param {Session[]} sessions
 * @param {number} now
 * @returns {{days: boolean[], todayIndex: number, count: number, goal: number, plansDone: Record<string, number>}}
 */
export function homeWeek(sessions, now) {
  const start = monday(now);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const week = homeSessions(sessions).filter((s) => keys.includes(s.date));
  /** @type {Record<string, number>} */
  const plansDone = {};
  for (const s of week) if (s.planId) plansDone[s.planId] = (plansDone[s.planId] ?? 0) + 1;
  return {
    days: keys.map((k) => week.some((s) => s.date === k)),
    todayIndex: weekdayIdx(dateKey(now)),
    count: week.length,
    goal: WEEK_GOAL,
    plansDone,
  };
}

/**
 * Wochentipp der Phase.
 * @param {Phase} phase
 * @param {number} weeks  vollendete Wochen (SSW bzw. nach der Geburt)
 */
export const weekTip = (phase, weeks) => (phase.notes.length ? phase.notes[((weeks % phase.notes.length) + phase.notes.length) % phase.notes.length] : '');

/**
 * Checkliste vor dem nächsten Schritt nach der Geburt (Text-Schlüssel).
 * @param {'pp1'|'pp2'} needs
 * @param {boolean} cesarean
 * @returns {string[]}
 */
export function checklistKeys(needs, cesarean) {
  const base = needs === 'pp1' ? ['mama.check6a', 'mama.check6b', 'mama.check6c'] : ['mama.check12a', 'mama.check12b', 'mama.check12c'];
  return cesarean ? [...base, 'mama.checkScar'] : base;
}

/**
 * Bestätigte Abfrage übernehmen.
 * @param {import('../core/store.js').MamaState} mama
 * @param {'pp1'|'pp2'} needs
 */
export const confirmCheck = (mama, needs) => (needs === 'pp1' ? { ...mama, check6: true } : { ...mama, check12: true });

/**
 * Abfragen und Hinweise, die über „Heute für dich“ stehen – in dieser Reihenfolge, höchstens eine.
 * @param {import('../core/store.js').MamaState} mama
 * @param {import('./pregnancy.js').PregnancyStatus|import('./pregnancy.js').PostpartumStatus} status
 * @returns {{kind: 'askBirth'}|{kind: 'check', needs: 'pp1'|'pp2'}|{kind: 'newPhase', phase: string}|null}
 */
export function mamaPrompt(mama, status) {
  if (status.mode === 'preg' && status.askBirth) return { kind: 'askBirth' };
  if (status.mode === 'post' && status.needsCheck) return { kind: 'check', needs: status.needsCheck };
  if (mama.seenPhase && mama.seenPhase !== status.phase) return { kind: 'newPhase', phase: status.phase };
  return null;
}

/**
 * Protokoll-Eintrag nach einem geschafften Heimplan (zählt im Wochenring und für den Begleiter).
 * @param {Plan} plan
 * @param {{now: number, short?: boolean}} options
 * @returns {Session}
 */
export function homeSession(plan, { now, short = false }) {
  return {
    id: `home-${now}`,
    date: dateKey(now),
    kind: 'homeplan',
    planId: plan.id,
    name: plan.name,
    muscleSets: {},
    setCount: 0,
    durationMin: short ? shortMinutes(plan) : plan.minutes,
  };
}

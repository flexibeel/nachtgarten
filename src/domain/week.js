/**
 * Woche: Ring auf „Heute“, Wochenrückblick, Sätze pro Muskel gegen den Zielbereich.
 *
 * Regeln (aus v1 übernommen):
 * - Zähler = Anzahl Einträge der Woche (Kraft, Aktivitäten und Heimpläne zählen gleich).
 * - Nenner = Wochenziel aus dem Profil (profile.days), sonst Anzahl geplanter Tage, sonst 3.
 * - Vergleich zur Vorwoche bis zum gleichen Wochentag, sonntags mit der ganzen Vorwoche.
 */

import { WEEKDAYS_SHORT, dateKey, lastWeekDates, todayIdx, weekDates } from '../core/dates.js';
import { MUSCLE_IDS } from '../data/muscles.js';

/** @typedef {import('../core/store.js').Session} Session */
/** @typedef {import('../core/store.js').Profile} Profile */
/** @typedef {import('../core/store.js').Schedule} Schedule */
/** @typedef {import('../core/store.js').PersonalRecord} PersonalRecord */
/** @typedef {import('../core/dates.js').Now} Now */

export const VOLUME_TARGET = Object.freeze({ min: 10, max: 20 });
export const DEFAULT_WEEK_GOAL = 3;

/** Vorschlag für den Wochenplan je nach Trainingstagen (Mo = 0). */
const DAY_PATTERNS = Object.freeze({
  1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
});

/**
 * @param {Profile|null} profile
 * @param {Schedule} schedule
 */
export function weekGoal(profile, schedule) {
  const days = Number(profile?.days);
  if (days > 0) return days;
  return Object.keys(schedule).length || DEFAULT_WEEK_GOAL;
}

/**
 * @param {Session[]} sessions
 * @param {string[]} dates
 */
export const sessionsIn = (sessions, dates) => sessions.filter((s) => dates.includes(s.date));

/** @param {Session[]} sessions */
export const totalSets = (sessions) => sessions.reduce((a, s) => a + (s.setCount || 0), 0);

/**
 * @typedef {object} WeekRing
 * @property {number} done
 * @property {number} goal
 * @property {number} fraction   0…1
 * @property {{key:string, label:string, done:boolean, planned:boolean, today:boolean}[]} days
 * @property {'week.done'|'week.remaining'|'week.remainingOne'|'week.start'} headline
 * @property {{left:number}} params
 */

/**
 * @param {{sessions: Session[], profile: Profile|null, schedule: Schedule, now?: Now}} input
 * @returns {WeekRing}
 */
export function weekRing({ sessions, profile, schedule, now = Date.now() }) {
  const dates = weekDates(now);
  const entries = sessionsIn(sessions, dates);
  const goal = weekGoal(profile, schedule);
  const done = entries.length;
  const left = Math.max(0, goal - done);
  const ti = todayIdx(now);
  const headline = done >= goal ? 'week.done' : !done ? 'week.start' : left === 1 ? 'week.remainingOne' : 'week.remaining';
  return {
    done,
    goal,
    fraction: Math.min(1, done / goal),
    days: dates.map((key, i) => ({
      key,
      label: WEEKDAYS_SHORT[i],
      done: entries.some((s) => s.date === key),
      planned: !!schedule[String(i)],
      today: i === ti,
    })),
    headline,
    params: { left },
  };
}

/**
 * Gewichtete Sätze je Muskel in den angegebenen Tagen.
 * @param {Session[]} sessions
 * @param {string[]} dates
 * @returns {Record<string, number>}
 */
export function muscleVolume(sessions, dates) {
  const out = {};
  for (const s of sessionsIn(sessions, dates)) {
    for (const [m, n] of Object.entries(s.muscleSets ?? {})) out[m] = (out[m] ?? 0) + n;
  }
  return out;
}

/**
 * Einordnung gegen den Zielbereich 10–20 harte Sätze pro Woche.
 * @param {number} sets
 * @returns {'lo'|'mid'|'ok'|'hi'}
 */
export function volumeStatus(sets) {
  if (sets > VOLUME_TARGET.max) return 'hi';
  if (sets >= VOLUME_TARGET.min) return 'ok';
  if (sets >= 6) return 'mid';
  return 'lo';
}

/**
 * Alle Muskeln mit Wochenwert (auf halbe Sätze gerundet) und Status.
 * @param {Session[]} sessions
 * @param {Now} [now]
 */
export function volumeReport(sessions, now = Date.now()) {
  const volume = muscleVolume(sessions, weekDates(now));
  return MUSCLE_IDS.map((muscle) => {
    const sets = Math.round((volume[muscle] ?? 0) * 2) / 2;
    return { muscle, sets, status: volumeStatus(sets) };
  });
}

/**
 * @typedef {object} WeekReview
 * @property {number} units
 * @property {number} goal
 * @property {number} sets
 * @property {number} prs
 * @property {{count:number, minutes:number, km:number}} activities
 * @property {{mode:'none'|'sameWeekday'|'fullWeek', lastWeekSets:number, lastWeekSameDaySets:number, changePercent:number|null}} comparison
 */

/**
 * @param {{sessions: Session[], prs: PersonalRecord[], profile: Profile|null, schedule: Schedule, now?: Now}} input
 * @returns {WeekReview}
 */
export function weekReview({ sessions, prs, profile, schedule, now = Date.now() }) {
  const dates = weekDates(now);
  const lastDates = lastWeekDates(now);
  const ti = todayIdx(now);
  const entries = sessionsIn(sessions, dates);
  const lastEntries = sessionsIn(sessions, lastDates);
  const sets = totalSets(entries);
  const lastWeekSets = totalSets(lastEntries);
  const lastWeekSameDaySets = totalSets(lastEntries.filter((s) => s.date <= lastDates[ti]));
  const activities = entries.filter((s) => s.kind === 'activity');

  const mode = !lastEntries.length ? 'none' : ti === 6 ? 'fullWeek' : 'sameWeekday';
  const base = mode === 'fullWeek' ? lastWeekSets : lastWeekSameDaySets;
  const changePercent = mode !== 'none' && base && sets ? Math.round(((sets - base) / base) * 100) : null;

  return {
    units: entries.length,
    goal: weekGoal(profile, schedule),
    sets,
    prs: prs.filter((p) => dates.includes(p.date)).length,
    activities: {
      count: activities.length,
      minutes: activities.reduce((a, s) => a + (Number(s.durationMin) || 0), 0),
      km: Math.round(activities.reduce((a, s) => a + (Number(s.km) || 0), 0) * 100) / 100,
    },
    comparison: { mode, lastWeekSets, lastWeekSameDaySets, changePercent },
  };
}

/**
 * Wochenplan-Vorschlag beim ersten Einrichten: Pläne reihum auf feste Tage verteilen.
 * @param {number} days
 * @param {string[]} planIds
 * @returns {Schedule}
 */
export function defaultSchedule(days, planIds) {
  const pattern = DAY_PATTERNS[Math.max(1, Math.min(7, Math.round(days)))] ?? DAY_PATTERNS[DEFAULT_WEEK_GOAL];
  /** @type {Schedule} */
  const out = {};
  if (!planIds.length) return out;
  pattern.forEach((day, i) => {
    out[String(day)] = { kind: 'plan', id: planIds[i % planIds.length] };
  });
  return out;
}

/**
 * Was heute ansteht: Eintrag im Wochenplan, sofern heute noch nichts eingetragen ist.
 * @param {{sessions: Session[], schedule: Schedule, now?: Now}} input
 */
export function todayPlan({ sessions, schedule, now = Date.now() }) {
  const today = dateKey(now);
  return {
    slot: schedule[String(todayIdx(now))] ?? null,
    done: sessions.some((s) => s.date === today),
  };
}

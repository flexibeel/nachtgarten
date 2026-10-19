/**
 * Schwangerschaft & Rückbildung: Schwangerschaftswoche, Wochen nach der Geburt, Phasen.
 *
 * - SSW aus dem errechneten Termin: Tag der Schwangerschaft = 280 − Tage bis zum Termin.
 *   Angabe als „SSW w+t“ (vollendete Wochen + Tage), Drittel: bis 13+6, bis 27+6, danach.
 * - Ab 40+0 fragt die App, ob das Baby schon da ist; nach dem Termin gilt „überfällig“.
 * - Nach der Geburt: Phasen pp0 (< 6 Wochen), pp1 (6–11), pp2 (ab 12).
 *   Der Wechsel in pp1/pp2 ist an eine kurze Selbstabfrage gekoppelt
 *   (6-Wochen- bzw. 12-Wochen-Check). Ohne Bestätigung bleibt die vorige Phase.
 */

import { daysBetween, isDateKey } from '../core/dates.js';

/** @typedef {import('../core/store.js').MamaState} MamaState */

export const TERM_DAYS = 280;

/**
 * @typedef {object} PregnancyStatus
 * @property {'preg'} mode
 * @property {number} gestationalDays
 * @property {number} weeks
 * @property {number} days
 * @property {string} label            "SSW 24+3"
 * @property {'t1'|'t2'|'t3'} phase
 * @property {number} daysUntilDue     negativ = Termin vorbei
 * @property {boolean} overdue
 * @property {boolean} askBirth        ab 40+0: „Ist dein Baby schon da?“
 */

/**
 * @param {string} dueDate
 * @param {string} today
 * @returns {PregnancyStatus|null}  null bei ungültigem Datum oder Termin mehr als 280 Tage entfernt
 */
export function pregnancyStatus(dueDate, today) {
  if (!isDateKey(dueDate)) return null;
  const daysUntilDue = daysBetween(today, dueDate);
  const gestationalDays = TERM_DAYS - daysUntilDue;
  if (gestationalDays < 0) return null;
  const weeks = Math.floor(gestationalDays / 7);
  const days = gestationalDays % 7;
  return {
    mode: 'preg',
    gestationalDays,
    weeks,
    days,
    label: `SSW ${weeks}+${days}`,
    phase: weeks <= 13 ? 't1' : weeks <= 27 ? 't2' : 't3',
    daysUntilDue,
    overdue: daysUntilDue < 0,
    askBirth: weeks >= 40,
  };
}

/**
 * @typedef {object} PostpartumStatus
 * @property {'post'} mode
 * @property {number} daysSinceBirth
 * @property {number} weeks
 * @property {string} label
 * @property {'pp0'|'pp1'|'pp2'} phase         gültige Phase nach den Abfragen
 * @property {'pp0'|'pp1'|'pp2'} naturalPhase  Phase nur nach Zeit
 * @property {'pp1'|'pp2'|null} needsCheck    Abfrage, die den nächsten Schritt freigibt
 */

/**
 * @param {string} birthDate
 * @param {string} today
 * @param {{check6?: boolean, check12?: boolean}} [checks]
 * @returns {PostpartumStatus|null}
 */
export function postpartumStatus(birthDate, today, { check6 = false, check12 = false } = {}) {
  if (!isDateKey(birthDate)) return null;
  const daysSinceBirth = daysBetween(birthDate, today);
  if (daysSinceBirth < 0) return null;
  const weeks = Math.floor(daysSinceBirth / 7);
  const naturalPhase = weeks < 6 ? 'pp0' : weeks < 12 ? 'pp1' : 'pp2';

  /** @type {PostpartumStatus['phase']} */
  let phase = naturalPhase;
  /** @type {PostpartumStatus['needsCheck']} */
  let needsCheck = null;
  if (naturalPhase !== 'pp0' && !check6) {
    phase = 'pp0';
    needsCheck = 'pp1';
  } else if (naturalPhase === 'pp2' && !check12) {
    phase = 'pp1';
    needsCheck = 'pp2';
  }

  return {
    mode: 'post',
    daysSinceBirth,
    weeks,
    label: `${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'} nach der Geburt`,
    phase,
    naturalPhase,
    needsCheck,
  };
}

/**
 * Status aus dem gespeicherten Zustand.
 * @param {MamaState|null} mama
 * @param {string} today
 * @returns {PregnancyStatus|PostpartumStatus|null}
 */
export function mamaStatus(mama, today) {
  if (!mama || !mama.date) return null;
  return mama.mode === 'post'
    ? postpartumStatus(mama.date, today, mama)
    : pregnancyStatus(mama.date, today);
}

/**
 * „Baby ist da“: in den Modus nach der Geburt wechseln; das Geburtsdatum trägt sie selbst ein.
 * @param {MamaState} mama
 * @returns {MamaState}
 */
export function markBirth(mama) {
  return { ...mama, mode: 'post', date: '', cesarean: false, check6: false, check12: false };
}

/**
 * Hat sich die Phase seit dem letzten Besuch geändert? (für den Hinweis „Neu für dich“)
 * @param {MamaState} mama
 * @param {string|null} currentPhase
 */
export function phaseChanged(mama, currentPhase) {
  return !!currentPhase && !!mama.seenPhase && mama.seenPhase !== currentPhase;
}

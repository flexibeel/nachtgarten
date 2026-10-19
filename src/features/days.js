/**
 * Wochentage in der aktiven Sprache (Mo = 0).
 */

import { t, tList } from '../data/texts/i18n.js';

/** @param {number} i */
export const shortDay = (i) => tList('weekday.short')[i] ?? '';

/**
 * Langer Name für Screenreader, mit „(heute)“.
 * @param {number} i
 * @param {boolean} [today]
 */
export function longDay(i, today = false) {
  const day = tList('weekday.long')[i] ?? '';
  return today ? t('day.today', { day }) : day;
}

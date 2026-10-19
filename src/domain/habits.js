/**
 * Gewohnheit: Wochenpunkte, „nie zweimal verpassen“, Wenn-Dann-Anker.
 * Vorgeschlagene Anker-Momente stehen in den Texten (habit.anchors).
 */

import { WEEKDAYS_SHORT, addDays, dateKey, weekDates } from '../core/dates.js';

/** @typedef {import('../core/store.js').Habit} Habit */
/** @typedef {import('../core/dates.js').Now} Now */

/**
 * Sieben Punkte Mo–So; Tage in der Zukunft sind nicht abhakbar.
 * @param {Habit} habit
 * @param {Now} [now]
 */
export function weekDots(habit, now = Date.now()) {
  const today = dateKey(now);
  return weekDates(now).map((key, i) => ({
    key,
    label: WEEKDAYS_SHORT[i],
    done: !!habit.days[key],
    today: key === today,
    future: key > today,
  }));
}

/**
 * Tag umschalten. Zukünftige Tage bleiben unverändert.
 * @param {Habit} habit
 * @param {string} key
 * @param {Now} [now]
 * @returns {Habit}
 */
export function toggleDay(habit, key, now = Date.now()) {
  if (key > dateKey(now)) return habit;
  const days = { ...habit.days };
  if (days[key]) delete days[key];
  else days[key] = true;
  return { ...habit, days };
}

/**
 * Hinweis unter den Punkten (Text-Schlüssel + Parameter).
 * Regel „nie zweimal verpassen“: Comeback loben, nach einem Pausentag ermutigen,
 * nach mehreren einen Mini-Neustart vorschlagen.
 * @param {Habit} habit
 * @param {Now} [now]
 * @returns {{key: string, params?: Record<string, number>}}
 */
export function habitMessage(habit, now = Date.now()) {
  const today = dateKey(now);
  const done = (n) => !!habit.days[addDays(today, -n)];
  const count = weekDots(habit, now).filter((d) => d.done).length;
  const fallback = count ? { key: 'habit.count', params: { count } } : { key: 'habit.empty' };
  if (!Object.keys(habit.days).length) return fallback;

  const [t, y, y2] = [done(0), done(1), done(2)];
  if (t && !y) return { key: 'habit.comeback' };
  if (!t && !y && !y2) return { key: 'habit.restart' };
  if (!t && !y) return { key: 'habit.missedYesterday' };
  return fallback;
}

/**
 * Anker-Satz: "Nach dem Frühstück: 10 Min. lesen". Ohne Anker null (UI zeigt dann 'habit.noAnchor').
 * @param {Habit} habit
 */
export function anchorSentence(habit) {
  const anchor = habit.anchor?.trim();
  if (!anchor) return null;
  const name = habit.name.trim().replace(/\.+$/, '');
  return `${anchor.charAt(0).toUpperCase()}${anchor.slice(1)}: ${name}`;
}

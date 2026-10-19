/**
 * Lokale Datums-Helfer.
 *
 * Ein Tag wird überall als Schlüssel "YYYY-MM-DD" in lokaler Zeit gespeichert.
 * Rechnen mit Schlüsseln (addDays, daysBetween) läuft über UTC-Kalenderarithmetik
 * und ist dadurch unabhängig von Sommer-/Winterzeit.
 * Funktionen, die "heute" brauchen, nehmen ein injizierbares `now` (Date oder ms).
 */

/** @typedef {string} DateKey  Lokales Datum "YYYY-MM-DD". */
/** @typedef {Date|number} Now  Zeitpunkt als Date oder Millisekunden. */

const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** @param {number} n */
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * @param {Now} [now]
 * @returns {Date}
 */
export function toDate(now = Date.now()) {
  return now instanceof Date ? new Date(now.getTime()) : new Date(now);
}

/**
 * Lokales Datum als Schlüssel.
 * @param {Now} [now]
 * @returns {DateKey}
 */
export function dateKey(now = Date.now()) {
  const d = toDate(now);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isDateKey(key) {
  const m = typeof key === 'string' && KEY_PATTERN.exec(key);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number);
  const utc = new Date(Date.UTC(y, mo - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === mo - 1 && utc.getUTCDate() === d;
}

/**
 * Zerlegt einen Schlüssel; wirft bei ungültigem Datum.
 * @param {DateKey} key
 * @returns {{year:number, month:number, day:number}}  month 1–12
 */
export function parseKey(key) {
  if (!isDateKey(key)) throw new RangeError(`Ungültiger Datumsschlüssel: ${key}`);
  const [y, m, d] = key.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/** @param {DateKey} key */
const utcDays = (key) => {
  const { year, month, day } = parseKey(key);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
};

/** @param {number} days */
const keyFromUtcDays = (days) => {
  const d = new Date(days * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};

/**
 * @param {DateKey} key
 * @param {number} n  Tage, darf negativ sein
 * @returns {DateKey}
 */
export function addDays(key, n) {
  return keyFromUtcDays(utcDays(key) + n);
}

/**
 * Ganze Kalendertage von `from` bis `to` (positiv, wenn `to` später ist).
 * @param {DateKey} from
 * @param {DateKey} to
 * @returns {number}
 */
export function daysBetween(from, to) {
  return utcDays(to) - utcDays(from);
}

/**
 * Wochentag-Index mit Montag = 0 … Sonntag = 6.
 * @param {DateKey} key
 * @returns {number}
 */
export function weekdayIdx(key) {
  // 1970-01-01 war ein Donnerstag (Index 3).
  return (((utcDays(key) + 3) % 7) + 7) % 7;
}

/**
 * Heutiger Wochentag-Index, Montag = 0.
 * @param {Now} [now]
 */
export function todayIdx(now = Date.now()) {
  return weekdayIdx(dateKey(now));
}

/**
 * Montag der Woche, in der `now` (oder ein Schlüssel) liegt.
 * @param {Now|DateKey} [now]
 * @returns {DateKey}
 */
export function monday(now = Date.now()) {
  const key = typeof now === 'string' ? now : dateKey(now);
  return addDays(key, -weekdayIdx(key));
}

/**
 * Alle sieben Tage (Mo–So) der Woche von `now`.
 * @param {Now|DateKey} [now]
 * @returns {DateKey[]}
 */
export function weekDates(now = Date.now()) {
  const start = monday(now);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Die sieben Tage der Vorwoche.
 * @param {Now|DateKey} [now]
 * @returns {DateKey[]}
 */
export function lastWeekDates(now = Date.now()) {
  return weekDates(addDays(monday(now), -7));
}

export const WEEKDAYS_SHORT = Object.freeze(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);

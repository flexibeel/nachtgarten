/**
 * „Heute“: Begrüßung nach Tageszeit, „Eine Sache heute“ und „Kurz abladen“.
 *
 * - Tageszeit: 5–10 Uhr Morgen, 11–16 Tag, 17–21 Abend, sonst Nacht.
 * - „Eine Sache heute“ gilt nur für den Tag, an dem sie gesetzt wurde; am nächsten Tag
 *   ist das Feld wieder leer.
 * - „Kurz abladen“ ist eine einfache Liste kurzer Gedanken (neueste zuerst angezeigt,
 *   gespeichert in Eingabe-Reihenfolge wie in v1).
 */

/** @typedef {import('../core/store.js').DailyFocus} DailyFocus */
/** @typedef {'morning'|'day'|'evening'|'night'} DayPart */

export const DUMP_MAX_LENGTH = 280;
export const FOCUS_MAX_LENGTH = 120;

/**
 * @param {number} hour  0–23
 * @returns {DayPart}
 */
export function dayPart(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Text-Schlüssel der Begrüßung.
 * @param {number} hour
 */
export const greetingKey = (hour) => `greeting.${dayPart(hour)}`;

/**
 * Tagesfokus, wie er heute gilt (von gestern → leer).
 * @param {DailyFocus} focus
 * @param {string} today
 * @returns {DailyFocus}
 */
export function currentFocus(focus, today) {
  return focus.day === today ? focus : { day: today, text: '', done: false };
}

/**
 * Tagesfokus setzen; leerer Text löscht ihn.
 * @param {string} text
 * @param {string} today
 * @returns {DailyFocus}
 */
export function setFocus(text, today) {
  const t = String(text).trim().slice(0, FOCUS_MAX_LENGTH);
  return { day: today, text: t, done: false };
}

/**
 * @param {DailyFocus} focus
 * @param {string} today
 * @returns {DailyFocus}
 */
export function toggleFocusDone(focus, today) {
  const f = currentFocus(focus, today);
  return f.text ? { ...f, done: !f.done } : f;
}

/**
 * Gedanken anhängen (leer → unverändert).
 * @param {string[]} dump
 * @param {string} text
 * @returns {string[]}
 */
export function addDump(dump, text) {
  const t = String(text).trim().slice(0, DUMP_MAX_LENGTH);
  return t ? [...dump, t] : dump;
}

/**
 * Gedanken an Position entfernen.
 * @param {string[]} dump
 * @param {number} index
 * @returns {string[]}
 */
export function removeDump(dump, index) {
  return dump.filter((_, i) => i !== index);
}

/**
 * Gedanken an alter Position wieder einsetzen (für „Rückgängig“).
 * @param {string[]} dump
 * @param {number} index
 * @param {string} text
 * @returns {string[]}
 */
export function restoreDump(dump, index, text) {
  const out = [...dump];
  out.splice(Math.max(0, Math.min(index, out.length)), 0, text);
  return out;
}

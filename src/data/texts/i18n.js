/**
 * Sprache: Deutsch zuerst, Englisch wählbar (ng2.settings.lang).
 * `t(key, vars)` liefert den Text in der aktiven Sprache, sonst den deutschen, sonst den Schlüssel
 * (damit Fehler sichtbar sind). Listen holt `tList(key)`.
 */

import { fillTemplate } from '../../core/format.js';
import { TEXTS as de } from './de.js';
import { TEXTS as en } from './en.js';

/** @typedef {'de'|'en'} Lang */

export const DEFAULT_LANG = 'de';
export const LANGS = Object.freeze([
  { value: 'de', label: 'Deutsch', locale: 'de-DE' },
  { value: 'en', label: 'English', locale: 'en-GB' },
]);

/** @type {Readonly<Record<Lang, Readonly<Record<string, string|readonly string[]>>>>} */
export const DICTIONARIES = Object.freeze({ de, en });

/** @type {Lang} */
let current = DEFAULT_LANG;

/**
 * Gültige Sprache (Unbekanntes → Deutsch).
 * @param {unknown} lang
 * @returns {Lang}
 */
export const normalizeLang = (lang) => (lang === 'en' || lang === 'de' ? lang : DEFAULT_LANG);

/**
 * Aktive Sprache setzen (auch `<html lang>`).
 * @param {unknown} lang
 */
export function setLang(lang) {
  current = normalizeLang(lang);
  if (globalThis.document) document.documentElement.lang = current;
  return current;
}

/** @returns {Lang} */
export const getLang = () => current;

/** Locale für Datums- und Zahlenformate. */
export const locale = () => LANGS.find((l) => l.value === current)?.locale ?? 'de-DE';

/** @param {string} key */
const lookup = (key) => DICTIONARIES[current][key] ?? de[key];

/**
 * Text zu einem Schlüssel, Platzhalter gefüllt.
 * @param {string} key
 * @param {Record<string, unknown>} [vars]
 * @returns {string}
 */
export function t(key, vars) {
  const value = lookup(key);
  return typeof value === 'string' ? fillTemplate(value, vars) : key;
}

/**
 * Liste zu einem Schlüssel (z. B. Wochentage, Warnzeichen).
 * @param {string} key
 * @returns {readonly string[]}
 */
export function tList(key) {
  const value = lookup(key);
  return Array.isArray(value) ? value : [];
}

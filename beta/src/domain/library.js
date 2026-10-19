/**
 * Übungsbibliothek: Hauptkategorien, Suche (deutsch/englisch), Filter, Sortierung. Rein, ohne DOM.
 *
 * Kategorien: Drücken, Ziehen, Beine, Po, Bauch & Rumpf, Arme, Ganzkörper (BACKLOG).
 * Zuordnung über die Muskeln (erster = Hauptmuskel):
 *   - Ober- und Unterkörper gemeinsam groß beteiligt → Ganzkörper (z. B. Kreuzheben)
 *   - Brust, Schultern → Drücken; Schultern mit Rücken als Hilfsmuskel → Ziehen (Face Pulls)
 *   - Oberer Rücken → Ziehen; Bizeps, Trizeps, Unterarme → Arme
 *   - Beine vorn/hinten, Waden → Beine; Po → Po; Bauch, unterer Rücken → Bauch & Rumpf
 */

import { MUSCLE_NAMES } from '../data/muscles.js';

export const CATEGORIES = Object.freeze(/** @type {const} */ (['push', 'pull', 'legs', 'glutes', 'core', 'arms', 'full']));
/** @typedef {typeof CATEGORIES[number]} Category */

const UPPER = new Set(['chest', 'back', 'shoulders']);
const LOWER = new Set(['quads', 'hams', 'glutes']);

/**
 * @param {{muscles: string[]}} ex
 * @returns {Category}
 */
export function categoryOf(ex) {
  const [main, ...rest] = ex.muscles ?? [];
  const all = ex.muscles ?? [];
  if (all.length >= 3 && all.some((m) => UPPER.has(m)) && all.some((m) => LOWER.has(m))) return 'full';
  switch (main) {
    case 'chest':
      return 'push';
    case 'shoulders':
      return rest.includes('back') ? 'pull' : 'push';
    case 'back':
      return 'pull';
    case 'biceps':
    case 'triceps':
    case 'forearms':
      return 'arms';
    case 'quads':
    case 'hams':
    case 'calves':
      return 'legs';
    case 'glutes':
      return 'glutes';
    case 'abs':
    case 'lowerback':
      return 'core';
    default:
      return 'full';
  }
}

/** Kleinbuchstaben, ß → ss, ohne Akzente/Umlaute-Punkte. @param {string} s */
export const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Deutsch ↔ Englisch (SPEC 3.8.3). */
const SYNONYMS = [
  ['seil', 'rope'], ['kabel', 'cable'], ['kabelzug', 'cable'], ['kurzhantel', 'dumbbell'], ['kurzhanteln', 'dumbbell'],
  ['langhantel', 'barbell'], ['sz', 'ez'], ['kniebeuge', 'squat'], ['kniebeugen', 'squat'], ['rudern', 'row'],
  ['drucken', 'press'], ['bankdrucken', 'bench'], ['curls', 'curl'], ['seitheben', 'lateral'], ['ausfallschritt', 'lunge'],
  ['ausfallschritte', 'lunge'], ['kreuzheben', 'deadlift'], ['klimmzug', 'pull'], ['klimmzuge', 'pull'], ['liegestutz', 'push-up'],
  ['waden', 'calf'], ['trizeps', 'triceps'], ['bizeps', 'biceps'], ['schulter', 'shoulder'], ['brust', 'chest'], ['fliegende', 'fly'],
  ['band', 'band'], ['bander', 'band'], ['bauch', 'ab'], ['rucken', 'back'], ['beinpresse', 'leg press'], ['strecken', 'extension'],
  ['heben', 'raise'], ['griff', 'grip'], ['stange', 'bar'], ['eng', 'close'], ['breit', 'wide'], ['schrag', 'incline'],
];

/** @param {string} word */
function variants(word) {
  const out = new Set([word]);
  for (const [de, en] of SYNONYMS) {
    if (word === de) out.add(en);
    if (word === en) out.add(de);
  }
  return [...out];
}

/**
 * Suchtext einer Übung.
 * @param {{name: string, en?: string, gear?: string, attachment?: string, muscles?: string[]}} ex
 */
export const haystack = (ex) =>
  normalize([ex.name, ex.en, ex.gear, ex.attachment, ...(ex.muscles ?? []).map((m) => MUSCLE_NAMES[m] ?? m)].filter(Boolean).join(' '));

/**
 * Alle Wörter der Suche müssen vorkommen (oder ihre Übersetzung).
 * @param {Parameters<typeof haystack>[0]} ex
 * @param {string} query
 */
export function matches(ex, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = haystack(ex);
  return words.every((w) => variants(w).some((v) => text.includes(v)));
}

/**
 * Filtern und sortieren: Favoriten, dann beliebte, dann eigene Geräte, sonst Reihenfolge.
 * @template {{id: string, name: string, gear: string, muscles: string[], pop?: boolean}} E
 * @param {E[]} list
 * @param {{query?: string, category?: Category|null, gear?: string|null, favorites?: string[], onlyFavorites?: boolean, ownGear?: string[]}} filter
 * @returns {E[]}
 */
export function filterExercises(list, { query = '', category = null, gear = null, favorites = [], onlyFavorites = false, ownGear = [] } = {}) {
  const fav = new Set(favorites);
  const own = new Set(ownGear);
  const gearOf = (g) => (g === 'Eigenes' ? 'Sonstiges' : g);
  const score = (e) => (fav.has(e.id) ? 4 : 0) + (e.pop ? 2 : 0) + (own.has(e.gear) ? 1 : 0);
  return list
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (!onlyFavorites || fav.has(e.id)) && (!category || categoryOf(e) === category) && (!gear || gearOf(e.gear) === gear) && matches(e, query))
    .sort((a, b) => score(b.e) - score(a.e) || a.i - b.i)
    .map(({ e }) => e);
}

/**
 * Favorit an/aus.
 * @param {string[]} favorites
 * @param {string} id
 */
export const toggleFavorite = (favorites, id) => (favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]);

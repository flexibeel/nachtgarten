/**
 * Ziele, neutral formuliert (docs/TONE.md): Gefühl und Fähigkeit statt Aussehen.
 * Die Ids bleiben die aus v1, damit gespeicherte Profile weiter passen; Texte über t().
 */

import { t } from './texts/i18n.js';

/** @typedef {import('../core/store.js').Goal} Goal */

/** @type {readonly {id: Exclude<Goal, ''>, key: string}[]} */
export const GOALS = Object.freeze([
  { id: 'Fit bleiben', key: 'goal.fit' },
  { id: 'Abnehmen', key: 'goal.lighter' },
  { id: 'Muskelaufbau', key: 'goal.stronger' },
  { id: 'Kraft', key: 'goal.strength' },
  { id: 'Ausdauer', key: 'goal.endurance' },
]);

/**
 * Anzeigename eines Ziels; leer, wenn keins gewählt ist.
 * @param {string} id
 */
export function goalLabel(id) {
  const goal = GOALS.find((g) => g.id === id);
  return goal ? t(goal.key) : '';
}

/** Auswahl-Optionen mit Beschriftung und Hinweis in der aktiven Sprache. */
export const goalOptions = () => GOALS.map((g) => ({ value: g.id, label: t(g.key), hint: t(`${g.key}Hint`) }));

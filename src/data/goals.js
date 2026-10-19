/**
 * Ziele, neutral formuliert (docs/TONE.md): Gefühl und Fähigkeit statt Aussehen.
 * Die Ids bleiben die aus v1, damit gespeicherte Profile weiter passen.
 */

/** @typedef {import('../core/store.js').Goal} Goal */

/** @type {readonly {id: Exclude<Goal, ''>, label: string, hint: string}[]} */
export const GOALS = Object.freeze([
  { id: 'Fit bleiben', label: 'Fit & beweglich bleiben', hint: 'Regelmäßig, ohne Druck' },
  { id: 'Abnehmen', label: 'Mich leichter & fitter fühlen', hint: 'Viel Bewegung, kurze Pausen' },
  { id: 'Muskelaufbau', label: 'Kräftiger werden', hint: 'Muskeln aufbauen, saubere Technik' },
  { id: 'Kraft', label: 'Stärker werden', hint: 'Schwerer heben, weniger Wiederholungen' },
  { id: 'Ausdauer', label: 'Mehr Puste', hint: 'Länger durchhalten' },
]);

/**
 * Anzeigename eines Ziels; leer, wenn keins gewählt ist.
 * @param {string} id
 */
export const goalLabel = (id) => GOALS.find((g) => g.id === id)?.label ?? '';

/**
 * Der Garten auf „Heute“: wächst mit den Trainingstagen des laufenden Monats.
 * Stufen 0–4 ab 0, 2, 5, 9 und 14 Tagen. Jeder Tag zählt einmal, egal wie viele
 * Einheiten (Kraft, Aktivität, Heimplan) es an diesem Tag gab. Rein, ohne DOM.
 */

/** Ab so vielen Trainingstagen im Monat gilt die Stufe (Index = Stufe). */
export const GARDEN_THRESHOLDS = Object.freeze([0, 2, 5, 9, 14]);
/** Wie wahrscheinlich der Begleiter beim Öffnen einmal gießend vorbeifliegt. */
export const FLYBY_CHANCE = 0.35;

/**
 * Stufe 0–4 aus der Zahl der Trainingstage.
 * @param {number} days
 */
export function gardenStage(days) {
  const n = Number.isFinite(days) ? days : 0;
  let stage = 0;
  GARDEN_THRESHOLDS.forEach((min, i) => {
    if (n >= min) stage = i;
  });
  return stage;
}

/**
 * Verschiedene Trainingstage im Monat von `today` (bis einschließlich heute).
 * @param {{date: string}[]} sessions
 * @param {string} today   YYYY-MM-DD
 */
export function trainingDaysThisMonth(sessions, today) {
  const month = today.slice(0, 7);
  const days = new Set();
  for (const s of sessions) {
    if (typeof s?.date === 'string' && s.date.slice(0, 7) === month && s.date <= today) days.add(s.date);
  }
  return days.size;
}

/**
 * Tage bis zur nächsten Stufe (null = höchste Stufe erreicht).
 * @param {number} days
 */
export function daysToNextStage(days) {
  const next = GARDEN_THRESHOLDS.find((min) => min > days);
  return next == null ? null : next - days;
}

/**
 * Soll der Begleiter jetzt gießend vorbeifliegen? Höchstens einmal je App-Start,
 * nie bei „Bewegung reduzieren“, sonst gelegentlich.
 * @param {{shown: boolean, reducedMotion: boolean, random?: () => number}} input
 */
export function shouldFlyBy({ shown, reducedMotion, random = Math.random }) {
  return !shown && !reducedMotion && random() < FLYBY_CHANCE;
}

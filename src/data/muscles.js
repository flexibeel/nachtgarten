/** Muskelgruppen: interne Id → deutscher Name. Reihenfolge = Anzeige-Reihenfolge. */
export const MUSCLE_NAMES = Object.freeze({
  chest: 'Brust',
  shoulders: 'Schultern',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  abs: 'Bauch',
  back: 'Oberer Rücken',
  lowerback: 'Unterer Rücken',
  glutes: 'Po',
  quads: 'Beine vorn',
  hams: 'Beine hinten',
  calves: 'Waden',
});

/** @typedef {keyof typeof MUSCLE_NAMES} MuscleId */
export const MUSCLE_IDS = /** @type {MuscleId[]} */ (Object.keys(MUSCLE_NAMES));

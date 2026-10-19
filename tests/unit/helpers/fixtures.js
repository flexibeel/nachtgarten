/** Gemeinsame Testdaten. */

/** Lokaler Zeitpunkt in ms (Monat 1–12). */
export const at = (y, mo, d, h = 12, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s).getTime();

/** Kleine Übungsauswahl im v2-Format. */
export const EXERCISES = {
  bench: { id: 'bench', name: 'Bankdrücken', gear: 'Langhantel', muscles: ['chest', 'triceps', 'shoulders'] },
  row1: { id: 'row1', name: 'Langhantelrudern', gear: 'Langhantel', muscles: ['back', 'biceps'] },
  curl: { id: 'curl', name: 'Bizepscurls', gear: 'Kurzhanteln', muscles: ['biceps'] },
  pushup: { id: 'pushup', name: 'Liegestütze', gear: 'Körpergewicht', muscles: ['chest', 'triceps', 'shoulders'] },
  squat: { id: 'squat', name: 'Kniebeugen', gear: 'Langhantel', muscles: ['quads', 'glutes'] },
  legcurl: { id: 'legcurl', name: 'Beinbeuger', gear: 'Maschinen', muscles: ['hams'] },
};

export const lookup = (id) => EXERCISES[id];

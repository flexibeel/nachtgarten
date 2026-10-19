/**
 * Nachtgarten – deutsche Übungstexte (Namen, Anleitungen) und Fachbegriffe.
 *
 * Daten (Quelle: free-exercise-db, Unlicense; Übersetzung: eigene, siehe docs/GLOSSAR-UEBUNGEN.md):
 *   exercises.de.names.json   { <fedb-id>: { name, c } }          klein, für Listen und Suche
 *   exercises.de.cNN.json     { <fedb-id>: { name, instructions } } 50er-Stücke wie demos/cN.json
 *
 * Rein, ohne DOM. Das Laden der JSON-Dateien wird hineingereicht (Browser: fetch, Tests: fs):
 *
 *   const ex = createExerciseI18n({ load: (file) => fetch(new URL(file, import.meta.url)).then(r => r.json()) });
 *   await ex.ready();
 *   ex.name('Barbell_Bench_Press_-_Medium_Grip')            // "Bankdrücken mit Langhantel (mittlerer Griff)"
 *   await ex.instructions('Barbell_Bench_Press_-_Medium_Grip') // ["Leg dich auf eine Flachbank. …", …]
 *   term('muscle', 'hamstrings')                            // "Hintere Oberschenkel"
 */

/** Fachbegriffe: free-exercise-db-Werte und App-Schlüssel → { de, en }. */
export const TERMS = Object.freeze({
  /** free-exercise-db primaryMuscles/secondaryMuscles */
  muscle: {
    abdominals: { de: 'Bauchmuskeln', en: 'Abdominals' },
    abductors: { de: 'Abduktoren', en: 'Abductors' },
    adductors: { de: 'Adduktoren', en: 'Adductors' },
    biceps: { de: 'Bizeps', en: 'Biceps' },
    calves: { de: 'Waden', en: 'Calves' },
    chest: { de: 'Brust', en: 'Chest' },
    forearms: { de: 'Unterarme', en: 'Forearms' },
    glutes: { de: 'Gesäß', en: 'Glutes' },
    hamstrings: { de: 'Hintere Oberschenkel', en: 'Hamstrings' },
    lats: { de: 'Latissimus', en: 'Lats' },
    'lower back': { de: 'Unterer Rücken', en: 'Lower back' },
    'middle back': { de: 'Mittlerer Rücken', en: 'Middle back' },
    neck: { de: 'Nacken', en: 'Neck' },
    quadriceps: { de: 'Vordere Oberschenkel', en: 'Quadriceps' },
    shoulders: { de: 'Schultern', en: 'Shoulders' },
    traps: { de: 'Trapez', en: 'Traps' },
    triceps: { de: 'Trizeps', en: 'Triceps' },
  },
  /** Muskel-Ids der App (src/data/muscles.js, v1 MUS) */
  appMuscle: {
    chest: { de: 'Brust', en: 'Chest' },
    shoulders: { de: 'Schultern', en: 'Shoulders' },
    biceps: { de: 'Bizeps', en: 'Biceps' },
    triceps: { de: 'Trizeps', en: 'Triceps' },
    forearms: { de: 'Unterarme', en: 'Forearms' },
    abs: { de: 'Bauch', en: 'Abs' },
    back: { de: 'Oberer Rücken', en: 'Upper back' },
    lowerback: { de: 'Unterer Rücken', en: 'Lower back' },
    glutes: { de: 'Po', en: 'Glutes' },
    quads: { de: 'Beine vorn', en: 'Quads' },
    hams: { de: 'Beine hinten', en: 'Hamstrings' },
    calves: { de: 'Waden', en: 'Calves' },
  },
  /** free-exercise-db equipment */
  equipment: {
    barbell: { de: 'Langhantel', en: 'Barbell' },
    dumbbell: { de: 'Kurzhantel', en: 'Dumbbell' },
    'e-z curl bar': { de: 'SZ-Stange', en: 'EZ bar' },
    cable: { de: 'Kabelzug', en: 'Cable' },
    machine: { de: 'Maschine', en: 'Machine' },
    'body only': { de: 'Körpergewicht', en: 'Bodyweight' },
    bands: { de: 'Widerstandsband', en: 'Bands' },
    kettlebells: { de: 'Kettlebell', en: 'Kettlebell' },
    'medicine ball': { de: 'Medizinball', en: 'Medicine ball' },
    'exercise ball': { de: 'Gymnastikball', en: 'Exercise ball' },
    'foam roll': { de: 'Faszienrolle', en: 'Foam roller' },
    other: { de: 'Sonstiges', en: 'Other' },
  },
  /** Gerätegruppen der App (deutsche Schlüssel, src/data/gear.js) */
  appGear: {
    Langhantel: { de: 'Langhantel', en: 'Barbell' },
    'SZ-Stange': { de: 'SZ-Stange', en: 'EZ bar' },
    Kurzhanteln: { de: 'Kurzhanteln', en: 'Dumbbells' },
    Kabelzug: { de: 'Kabelzug', en: 'Cable' },
    Maschinen: { de: 'Maschinen', en: 'Machines' },
    'Körpergewicht': { de: 'Körpergewicht', en: 'Bodyweight' },
    'Bänder': { de: 'Bänder', en: 'Bands' },
    Kettlebell: { de: 'Kettlebell', en: 'Kettlebell' },
    Klimmzugstange: { de: 'Klimmzugstange', en: 'Pull-up bar' },
    Sonstiges: { de: 'Sonstiges', en: 'Other' },
    Eigenes: { de: 'Eigenes', en: 'Custom' },
  },
  /** Kabelzug-Aufsätze */
  attachment: {
    Stange: { de: 'Stange', en: 'Bar' },
    Seil: { de: 'Seil', en: 'Rope' },
    'V-Griff': { de: 'V-Griff', en: 'V-handle' },
    Einzelgriff: { de: 'Einzelgriff', en: 'Single handle' },
    'Lat-Stange': { de: 'Lat-Stange', en: 'Lat bar' },
    'Fußschlaufe': { de: 'Fußschlaufe', en: 'Ankle strap' },
  },
  category: {
    strength: { de: 'Kraft', en: 'Strength' },
    stretching: { de: 'Dehnen', en: 'Stretching' },
    plyometrics: { de: 'Sprungkraft', en: 'Plyometrics' },
    powerlifting: { de: 'Powerlifting', en: 'Powerlifting' },
    'olympic weightlifting': { de: 'Olympisches Gewichtheben', en: 'Olympic weightlifting' },
    strongman: { de: 'Strongman', en: 'Strongman' },
    cardio: { de: 'Ausdauer', en: 'Cardio' },
  },
  level: {
    beginner: { de: 'Einsteiger', en: 'Beginner' },
    intermediate: { de: 'Fortgeschritten', en: 'Intermediate' },
    expert: { de: 'Profi', en: 'Expert' },
  },
  force: {
    push: { de: 'Drücken', en: 'Push' },
    pull: { de: 'Ziehen', en: 'Pull' },
    static: { de: 'Halten', en: 'Static' },
  },
  mechanic: {
    compound: { de: 'Grundübung (mehrgelenkig)', en: 'Compound' },
    isolation: { de: 'Isolationsübung (eingelenkig)', en: 'Isolation' },
  },
  /** Beschriftungen der Detailansicht */
  ui: {
    howTo: { de: "So geht's", en: 'How to' },
    instructions: { de: 'Ausführliche Anleitung', en: 'Step-by-step instructions' },
    cues: { de: 'Darauf achten', en: 'Key points' },
    start: { de: 'Start', en: 'Start' },
    end: { de: 'Ende', en: 'End' },
    close: { de: 'Schließen', en: 'Close' },
    useExercise: { de: 'Diese Übung nehmen', en: 'Use this exercise' },
    addToPlan: { de: 'Zum Plan hinzufügen', en: 'Add to plan' },
    noPreview: { de: 'Für diese Übung gibt es noch keine Vorschau.', en: 'No preview for this exercise yet.' },
    muscles: { de: 'Muskeln', en: 'Muscles' },
    equipment: { de: 'Gerät', en: 'Equipment' },
    level: { de: 'Niveau', en: 'Level' },
    category: { de: 'Kategorie', en: 'Category' },
    force: { de: 'Bewegung', en: 'Force' },
    mechanic: { de: 'Art', en: 'Mechanic' },
    language: { de: 'Sprache der Übungen', en: 'Exercise language' },
    languageHint: { de: 'Übungsnamen, Anleitungen, Muskeln und Geräte.', en: 'Exercise names, instructions, muscles and equipment.' },
  },
});

export const LANGS = Object.freeze(['de', 'en']);
export const DEFAULT_LANG = 'de';
export const CHUNK_SIZE = 50;
export const chunkFile = (c) => `exercises.de.c${String(c).padStart(2, '0')}.json`;
export const NAMES_FILE = 'exercises.de.names.json';

/** Normalisiert eine Sprachangabe auf 'de' | 'en' (Standard: 'de'). */
export function normLang(lang) {
  return lang === 'en' ? 'en' : DEFAULT_LANG;
}

/**
 * Fachbegriff übersetzen. Unbekannte Werte kommen unverändert zurück.
 * @param {keyof typeof TERMS} kind
 * @param {string} key
 * @param {'de'|'en'} [lang]
 */
export function term(kind, key, lang = DEFAULT_LANG) {
  const t = TERMS[kind] && TERMS[kind][key];
  return t ? t[normLang(lang)] : key;
}

/** Suchnormierung: klein, ß→ss, ohne Akzente/Umlaut-Punkte. */
export const normSearch = (s) =>
  String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * @param {{ load: (file: string) => Promise<any> }} opts  lädt eine JSON-Datei aus src/data/i18n/
 */
export function createExerciseI18n({ load }) {
  let names = null;
  let namesP = null;
  const chunks = new Map();

  const ready = () => {
    if (names) return Promise.resolve();
    if (!namesP) {
      namesP = Promise.resolve(load(NAMES_FILE)).then((n) => { names = n || {}; }).catch((e) => { namesP = null; throw e; });
    }
    return namesP;
  };

  const loadChunk = (c) => {
    if (!chunks.has(c)) {
      const p = Promise.resolve(load(chunkFile(c))).catch((e) => { chunks.delete(c); throw e; });
      chunks.set(c, p);
    }
    return chunks.get(c);
  };

  /** Deutscher Name; mit lang='en' oder ohne Eintrag kommt `fallback` zurück. */
  const name = (id, lang = DEFAULT_LANG, fallback = id) => {
    if (normLang(lang) === 'en') return fallback;
    return (names && names[id] && names[id].name) || fallback;
  };

  /** Deutsche Schritte (leere Schritte entfernt) oder null. */
  const instructions = async (id) => {
    await ready();
    const n = names[id];
    if (!n) return null;
    const data = await loadChunk(n.c);
    const e = data && data[id];
    const list = e && Array.isArray(e.instructions) ? e.instructions.filter((s) => s && s.trim()) : [];
    return list.length ? list : null;
  };

  /** Suchtext mit deutschem und englischem Namen, damit beide Sprachen treffen. */
  const haystack = (id, englishName = '') => normSearch(`${name(id, 'de', '')} ${englishName}`);

  const has = (id) => !!(names && names[id]);
  const ids = () => (names ? Object.keys(names) : []);

  return { ready, name, instructions, haystack, has, ids };
}

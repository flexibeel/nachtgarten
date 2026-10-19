/**
 * Trainingsplan-Vorlagen als Daten (siehe docs/TRAININGSPLAENE.md).
 *
 * Grundregeln, nach denen die Vorlagen gebaut sind:
 * - 10–20 harte Sätze pro Muskel und Woche als Standard-Korridor (Pelland u. a. 2026),
 *   bei Einstiegs- und Kurzplänen bewusst eine kleinere Mindestdosis (≥ 4, Iversen 2021).
 * - Jeder große Muskel mindestens 2× pro Woche (Ausnahme PPL 3×, als Abwägung markiert).
 * - Wiederholungen 5–30 nah am Versagen: Grundübungen RIR 1–3, Isolation RIR 0–2.
 * - Pausen: Grundübungen 2–3 Min., Isolation 60–90 s.
 * - Pro Muskel mindestens eine Übung mit Betonung der gedehnten Position (`stretch: true`).
 * - Doppelte Progression, Deload als halbes Volumen statt Pause.
 *
 * Wöchentliche Sätze und Minuten werden berechnet (domain/plan-select.js), nicht eingetragen.
 * Übungen verweisen auf die kuratierten Ids der Bibliothek (SPEC 3.7.1); wo es keine gibt,
 * steht eine allgemeine Übung mit `g_`-Id, Bewegungsmuster (data/patterns.js) und Muskeln.
 */

/** @typedef {'push'|'pull'|'legs'|'core'|'arms'|'shoulder'|'mobility'} Move */
/**
 * @typedef {object} PlanExercise
 * @property {string} name
 * @property {string} gear
 * @property {string[]} muscles   erster = Hauptmuskel (Hilfsmuskeln zählen halb)
 * @property {Move} move
 * @property {string} [pattern]   nur bei allgemeinen Übungen (g_…)
 * @property {boolean} [stretch]  betont die gedehnte Position
 */

const E = (name, gear, muscles, move, extra = {}) => ({ name, gear, muscles, move, ...extra });

/**
 * Übungen, die in den Vorlagen vorkommen. Kuratierte Ids: Muskeln wie in SPEC 3.7.1.
 * @type {Readonly<Record<string, PlanExercise>>}
 */
export const PLAN_EXERCISES = Object.freeze({
  // kuratiert
  bench: E('Bankdrücken', 'Langhantel', ['chest', 'triceps', 'shoulders'], 'push'),
  dbbench: E('Kurzhantel-Bankdrücken', 'Kurzhanteln', ['chest', 'triceps'], 'push', { stretch: true }),
  pushup: E('Liegestütze', 'Körpergewicht', ['chest', 'triceps', 'shoulders'], 'push'),
  fly: E('Butterfly', 'Maschinen', ['chest'], 'push', { stretch: true }),
  chestpress: E('Brustpresse', 'Maschinen', ['chest', 'triceps'], 'push'),
  k_crosslow: E('Kabel-Crossover von unten', 'Kabelzug', ['chest', 'shoulders'], 'push', { stretch: true }),
  pullup: E('Klimmzüge', 'Klimmzugstange', ['back', 'biceps'], 'pull', { stretch: true }),
  latpull: E('Latzug', 'Kabelzug', ['back', 'biceps'], 'pull', { stretch: true }),
  row1: E('Langhantelrudern', 'Langhantel', ['back', 'biceps'], 'pull'),
  dbrow: E('Einarmiges Rudern', 'Kurzhanteln', ['back', 'biceps'], 'pull', { stretch: true }),
  seatrow: E('Rudern am Gerät', 'Maschinen', ['back'], 'pull'),
  k_row: E('Kabelrudern sitzend', 'Kabelzug', ['back', 'biceps'], 'pull', { stretch: true }),
  k_straight: E('Überzüge am Kabel', 'Kabelzug', ['back'], 'pull', { stretch: true }),
  bandrow: E('Rudern mit Band', 'Bänder', ['back'], 'pull'),
  face: E('Face Pulls', 'Kabelzug', ['shoulders', 'back'], 'pull'),
  reversefly: E('Reverse Butterfly', 'Maschinen', ['shoulders', 'back'], 'pull'),
  ohp: E('Schulterdrücken', 'Kurzhanteln', ['shoulders', 'triceps'], 'push'),
  shoulderpress: E('Schulterpresse', 'Maschinen', ['shoulders', 'triceps'], 'push'),
  lat: E('Seitheben', 'Kurzhanteln', ['shoulders'], 'shoulder'),
  k_lat: E('Seitheben am Kabel', 'Kabelzug', ['shoulders'], 'shoulder', { stretch: true }),
  curl: E('Bizepscurls', 'Kurzhanteln', ['biceps'], 'arms'),
  hammer: E('Hammercurls', 'Kurzhanteln', ['biceps'], 'arms'),
  bandcurl: E('Curls mit Band', 'Bänder', ['biceps'], 'arms'),
  k_bayes: E('Bizepscurls hinter dem Körper', 'Kabelzug', ['biceps'], 'arms', { stretch: true }),
  pushdown: E('Trizepsdrücken am Kabel', 'Kabelzug', ['triceps'], 'arms'),
  k_overhead: E('Trizepsstrecken über Kopf', 'Kabelzug', ['triceps'], 'arms', { stretch: true }),
  french: E('French Press', 'Kurzhanteln', ['triceps'], 'arms', { stretch: true }),
  plank: E('Unterarmstütz', 'Körpergewicht', ['abs'], 'core'),
  k_crunch: E('Kabel-Crunch kniend', 'Kabelzug', ['abs'], 'core'),
  k_pallof: E('Pallof Press', 'Kabelzug', ['abs'], 'core'),
  hang: E('Hängendes Beinheben', 'Klimmzugstange', ['abs'], 'core'),
  squat: E('Kniebeugen', 'Langhantel', ['quads', 'glutes'], 'legs', { stretch: true }),
  smithsquat: E('Kniebeugen an der Multipresse', 'Maschinen', ['quads', 'glutes'], 'legs', { stretch: true }),
  goblet: E('Goblet Squat', 'Kurzhanteln', ['quads', 'glutes'], 'legs', { stretch: true }),
  lunge: E('Ausfallschritte', 'Körpergewicht', ['quads', 'glutes'], 'legs', { stretch: true }),
  press: E('Beinpresse', 'Maschinen', ['quads', 'glutes'], 'legs'),
  legext: E('Beinstrecker', 'Maschinen', ['quads'], 'legs'),
  rdl: E('Rumänisches Kreuzheben', 'Langhantel', ['hams', 'glutes', 'lowerback'], 'legs', { stretch: true }),
  legcurl: E('Beinbeuger', 'Maschinen', ['hams'], 'legs', { stretch: true }),
  thrust: E('Hip Thrust', 'Langhantel', ['glutes', 'hams'], 'legs'),
  bridge: E('Glute Bridge', 'Körpergewicht', ['glutes'], 'legs'),
  calf: E('Wadenheben', 'Körpergewicht', ['calves'], 'legs', { stretch: true }),
  calfmachine: E('Wadenmaschine', 'Maschinen', ['calves'], 'legs', { stretch: true }),

  // allgemein (Muster + Muskel), bis es eine kuratierte Übung gibt
  g_inclinedb: E('Schrägbankdrücken mit Kurzhanteln', 'Kurzhanteln', ['chest', 'shoulders', 'triceps'], 'push', { pattern: 'pushH', stretch: true }),
  g_inclinepush: E('Liegestütze erhöht (Tisch oder Wand)', 'Körpergewicht', ['chest', 'triceps', 'shoulders'], 'push', { pattern: 'pushH' }),
  g_dbfly: E('Kurzhantel-Fliegende', 'Kurzhanteln', ['chest'], 'push', { pattern: 'fly', stretch: true }),
  g_bandpulldown: E('Latzug mit Band', 'Bänder', ['back', 'biceps'], 'pull', { pattern: 'pullV', stretch: true }),
  g_bandpull: E('Band-Reverse-Fly (Pull-Apart)', 'Bänder', ['shoulders', 'back'], 'pull', { pattern: 'rearFly' }),
  g_proneytw: E('Y-T-W in Bauchlage', 'Körpergewicht', ['back', 'shoulders'], 'pull', { pattern: 'rearFly' }),
  g_lyinglat: E('Seitheben in Seitlage', 'Kurzhanteln', ['shoulders'], 'shoulder', { pattern: 'latRaise', stretch: true }),
  g_inclinecurl: E('Schrägbank-Curls', 'Kurzhanteln', ['biceps'], 'arms', { pattern: 'curl', stretch: true }),
  g_bandpushdown: E('Trizepsdrücken mit Band', 'Bänder', ['triceps'], 'arms', { pattern: 'triExt' }),
  g_bulgarian: E('Bulgarische Split Squats', 'Kurzhanteln', ['quads', 'glutes'], 'legs', { pattern: 'splitsquat', stretch: true }),
  g_boxsquat: E('Kniebeuge auf Stuhl oder Box', 'Körpergewicht', ['quads', 'glutes'], 'legs', { pattern: 'squat' }),
  g_dbrdl: E('Rumänisches Kreuzheben mit Kurzhanteln', 'Kurzhanteln', ['hams', 'glutes', 'lowerback'], 'legs', { pattern: 'hinge', stretch: true }),
  g_goodmorning: E('Hüftbeuge mit Körpergewicht', 'Körpergewicht', ['hams', 'glutes', 'lowerback'], 'legs', { pattern: 'hinge', stretch: true }),
  g_sliderhamcurl: E('Beinbeuger mit Gleittüchern', 'Körpergewicht', ['hams', 'glutes'], 'legs', { pattern: 'hipthrust' }),
  g_bridgemarch: E('Beckenheben mit Marschieren', 'Körpergewicht', ['glutes', 'hams'], 'legs', { pattern: 'hipthrust' }),
  g_birddog: E('Bird-Dog', 'Körpergewicht', ['lowerback', 'abs', 'glutes'], 'core', { pattern: 'birdDog' }),
  g_deadbug: E('Dead Bug', 'Körpergewicht', ['abs'], 'core', { pattern: 'deadBug' }),
  g_sideplank: E('Seitstütz', 'Körpergewicht', ['abs'], 'core', { pattern: 'sidePlank' }),
  g_catcow: E('Katze-Kuh', 'Körpergewicht', ['lowerback'], 'mobility', { pattern: 'birdDog' }),
  g_thoracic: E('Brustwirbelsäulen-Rotation im Vierfüßler', 'Körpergewicht', ['back'], 'mobility', { pattern: 'rotation' }),
  g_hipflexor: E('Hüftbeuger-Dehnung im Halbkniestand', 'Körpergewicht', ['quads'], 'mobility', { pattern: 'splitsquat' }),
  g_childpose: E('Kindhaltung', 'Körpergewicht', ['lowerback'], 'mobility', { pattern: 'breathing' }),
});

/**
 * Volumen-Korridore pro Muskel und Woche (gewichtete harte Sätze).
 * standard: 8–22 (10–20 als Ziel plus Toleranz). mindest: Einstieg, wenig Zeit, Kraft neben Laufen.
 * sanft: Rücken & Beweglichkeit – Kräftigung als Nebeneffekt.
 */
export const DOSE_RANGES = Object.freeze({
  standard: Object.freeze([8, 22]),
  mindest: Object.freeze([4, 16]),
  sanft: Object.freeze([2, 10]),
});

/** Quellen; Pläne verweisen per Schlüssel. */
export const SOURCES = Object.freeze({
  pelland: { label: 'Pelland u. a. 2026, Sports Medicine: Dosis-Wirkung von Volumen und Frequenz', url: 'https://sponet.de/sponet/Record/4097139?lng=en' },
  schoenfeldFreq: { label: 'Schoenfeld, Grgic & Krieger 2019: Frequenz bei gleichem Volumen', url: 'https://ro.ecu.edu.au/ecuworkspost2013/5665' },
  refalo: { label: 'Refalo u. a. 2023: Nähe zum Muskelversagen', url: 'https://dro.deakin.edu.au/articles/journal_contribution/Influence_of_Resistance_Training_Proximity-to-Failure_on_Skeletal_Muscle_Hypertrophy_A_Systematic_Review_with_Meta-analysis/22030796' },
  schoenfeldReps: { label: 'Schoenfeld u. a. 2021: Wiederholungsbereiche', url: 'https://doaj.org/article/6d51b905504d46f0873bb43d5d84bf21' },
  singer: { label: 'Singer u. a. 2024: Satzpausen', url: 'https://rgu-repository.worktribe.com/OutputFile/2344468' },
  wolf: { label: 'Wolf u. a. 2025: Training in gedehnter Position', url: 'https://peerj.com/articles/18904' },
  iversen: { label: 'Iversen u. a. 2021: Zeiteffizientes Krafttraining', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8449772' },
  bell: { label: 'Bell u. a. 2023: Deload-Konsens', url: 'https://shura.shu.ac.uk/32417/' },
  coleman: { label: 'Coleman u. a. 2024: Deload-Studie', url: 'https://peerj.com/articles/16777' },
  androulakis: { label: 'Androulakis-Korakakis u. a. 2021: Mindestdosis für Kraft', url: 'https://research.bond.edu.au/en/publications/the-minimum-effective-training-dose-required-for-1rm-strength-in-/' },
  schumann: { label: 'Schumann u. a. 2022: Kraft und Ausdauer kombinieren', url: 'https://researchonline.jcu.edu.au/71546/1/Schumann2021_Article_CompatibilityOfConcurrentAerob.pdf' },
  blagrove: { label: 'Blagrove u. a. 2018: Krafttraining für Läufer', url: 'https://repository.lboro.ac.uk/articles/journal_contribution/Effects_of_strength_training_on_the_physiological_determinants_of_middle-_and_long-distance_running_performance_a_systematic_review/9619553' },
  riddell: { label: 'Riddell u. a. 2017: Sport bei Typ-1-Diabetes (Konsens)', url: 'https://discovery.dundee.ac.uk/en/publications/exercise-management-in-type-1-diabetes-a-consensus-statement/' },
  yardley: { label: 'Yardley u. a. 2012: Kraft vor Ausdauer bei Typ-1-Diabetes', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3308306' },
  hayden: { label: 'Hayden u. a. 2021, Cochrane: Bewegungstherapie bei Rückenschmerzen', url: 'https://cochranelibrary.com/cdsr/doi/10.1002/14651858.CD009790.pub2/information' },
});

/* ------------------------------------------------------------ Bausteine */

/**
 * @typedef {object} PlanItem
 * @property {string} ex
 * @property {number} sets
 * @property {[number, number]} reps   Bereich; bei `unit: 's'` Sekunden
 * @property {[number, number]|null} rir  Ziel-Reserve (null = Mobilität, nicht zählen)
 * @property {number} rest             Pause in Sekunden
 * @property {'s'} [unit]
 * @property {string} [superset]       gleiche Kennung = abwechselnd im Supersatz
 * @property {boolean} [perSide]
 * @property {string} [note]
 */

/** @returns {PlanItem} */
const x = (ex, sets, reps, rir, rest, extra = {}) => ({ ex, sets, reps, rir, rest, ...extra });
/** Mobilität: zählt nicht als harter Satz. */
const mob = (ex, sets, seconds, extra = {}) => ({ ex, sets, reps: seconds, rir: null, rest: 15, unit: 's', ...extra });

const HEAVY = /** @type {[number, number]} */ ([1, 3]);
const MID = /** @type {[number, number]} */ ([1, 2]);
const ISO = /** @type {[number, number]} */ ([0, 2]);
const EASY = /** @type {[number, number]} */ ([2, 3]);

const DOUBLE_PROGRESSION =
  'Doppelte Progression: Bleib beim Gewicht, bis du in allen Sätzen das obere Ende des Bereichs schaffst (mit mindestens 1 Wdh. Reserve). Dann nächste Gewichtsstufe und wieder unten im Bereich anfangen.';
const DELOAD_STANDARD =
  'Alle 6–8 Wochen oder wenn Leistung und Tagescheck zwei Wochen lang absacken: eine Woche mit halber Satzzahl und RIR 3–4. Nicht komplett pausieren.';

/* ------------------------------------------------------------ Vorlagen */

/**
 * @typedef {object} PlanSession
 * @property {string} id
 * @property {string} name
 * @property {PlanItem[]} items
 *
 * @typedef {object} RunDay
 * @property {number} day     0 = Montag
 * @property {'quality'|'long'|'easy'} kind
 * @property {string} label
 *
 * @typedef {object} PlanTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} short
 * @property {string} forWhom
 * @property {string} focusLabel        Schwerpunkt für die Übersicht
 * @property {number} daysPerWeek       Standard-Variante
 * @property {Record<number, (string|null)[]>} weeks  Tage → Woche Mo…So (Session-Id oder null)
 * @property {'gym'|'home'|'none'} equipment
 * @property {('neu'|'etwas'|'erfahren')[]} level
 * @property {('kraft'|'muskel'|'fit'|'laufen')[]} focus   erstes = Hauptfokus
 * @property {keyof typeof DOSE_RANGES} dose
 * @property {number} [warmupMin]
 * @property {boolean} [flexible]       Reihenfolge frei verschiebbar (Schichtdienst)
 * @property {string[]} [tradeoffs]     bewusste Abwägungen (z. B. 'frequency')
 * @property {RunDay[]} [runDays]
 * @property {PlanSession[]} sessions
 * @property {string} why
 * @property {string} evidence
 * @property {string[]} sources
 * @property {string} progression
 * @property {string} deload
 * @property {Record<string, string[]>} [healthNotes]
 */

/** @type {PlanTemplate[]} */
const TEMPLATES = [
  {
    id: 'gk2',
    name: 'Ganzkörper 2×',
    short: 'Zwei Einheiten pro Woche, alles drin – der leichteste Einstieg ins Studio.',
    forWhom: 'Für Neue im Studio und für Wochen mit wenig Zeit.',
    focusLabel: 'Einstieg, Grundkraft',
    daysPerWeek: 2,
    weeks: { 2: ['A', null, null, 'B', null, null, null] },
    equipment: 'gym',
    level: ['neu', 'etwas'],
    focus: ['fit', 'muskel', 'kraft'],
    dose: 'mindest',
    flexible: true,
    sessions: [
      {
        id: 'A',
        name: 'Ganzkörper A',
        items: [
          x('press', 3, [10, 12], EASY, 120),
          x('chestpress', 3, [8, 12], EASY, 120),
          x('latpull', 3, [8, 12], EASY, 120),
          x('legcurl', 2, [10, 15], MID, 90, { note: 'Sitzend, wenn es geht – dort ist der Muskel gedehnter.' }),
          x('lat', 2, [12, 20], MID, 60),
          x('plank', 2, [20, 40], EASY, 45, { unit: 's' }),
        ],
      },
      {
        id: 'B',
        name: 'Ganzkörper B',
        items: [
          x('goblet', 3, [8, 12], EASY, 120),
          x('g_dbrdl', 3, [8, 12], EASY, 120),
          x('seatrow', 3, [10, 12], EASY, 90),
          x('g_inclinedb', 3, [8, 12], EASY, 120),
          x('face', 2, [12, 20], MID, 60),
          x('g_deadbug', 2, [6, 10], EASY, 45, { perSide: true }),
        ],
      },
    ],
    why: 'Zwei Ganzkörper-Einheiten treffen jeden großen Muskel zweimal pro Woche – das reicht am Anfang für spürbare Fortschritte. Maschinen und Kurzhanteln sind leicht zu lernen, und mit 2–3 Wiederholungen Reserve bleibt Luft für saubere Technik.',
    evidence: 'Schon etwa 4 Sätze pro Muskel und Woche bringen Neulingen messbar Kraft und Muskeln (Iversen 2021). Mehr Sätze bringen mehr, aber mit abnehmendem Zusatznutzen (Pelland 2026).',
    sources: ['iversen', 'pelland', 'refalo'],
    progression: DOUBLE_PROGRESSION,
    deload: 'In den ersten Monaten meist nicht nötig. Wenn du dich zwei Wochen lang schlapp fühlst: eine Woche mit halber Satzzahl.',
  },

  {
    id: 'gk3',
    name: 'Ganzkörper 3×',
    short: 'Drei abwechslungsreiche Ganzkörper-Tage – der Allrounder.',
    forWhom: 'Für alle mit drei festen Tagen, vom Einstieg bis Fortgeschritten.',
    focusLabel: 'Muskelaufbau & Kraft, ausgewogen',
    daysPerWeek: 3,
    weeks: { 3: ['A', null, 'B', null, 'C', null, null] },
    equipment: 'gym',
    level: ['neu', 'etwas'],
    focus: ['muskel', 'kraft', 'fit'],
    dose: 'standard',
    flexible: true,
    sessions: [
      {
        id: 'A',
        name: 'Ganzkörper A',
        items: [
          x('squat', 3, [6, 10], HEAVY, 180),
          x('bench', 3, [6, 10], HEAVY, 150),
          x('k_row', 3, [8, 12], MID, 120),
          x('legcurl', 3, [10, 15], ISO, 90, { note: 'Sitzend, wenn es geht.' }),
          x('lat', 2, [12, 20], ISO, 60),
          x('k_overhead', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'B',
        name: 'Ganzkörper B',
        items: [
          x('rdl', 3, [6, 10], HEAVY, 180),
          x('latpull', 3, [8, 12], MID, 120),
          x('g_inclinedb', 3, [8, 12], MID, 120),
          x('g_bulgarian', 2, [8, 12], MID, 120, { perSide: true }),
          x('ohp', 2, [8, 12], MID, 120),
          x('k_bayes', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'C',
        name: 'Ganzkörper C',
        items: [
          x('press', 3, [10, 15], MID, 150),
          x('chestpress', 3, [8, 12], MID, 120),
          x('seatrow', 3, [10, 12], MID, 90),
          x('thrust', 3, [8, 12], MID, 120),
          x('legcurl', 2, [10, 15], ISO, 90),
          x('face', 2, [12, 20], ISO, 60),
          x('k_crunch', 2, [10, 15], ISO, 60),
        ],
      },
    ],
    why: 'Drei unterschiedliche Ganzkörper-Tage verteilen die Sätze gleichmäßig: Jeder große Muskel kommt zwei- bis dreimal pro Woche dran, ohne dass eine Einheit ausufert. Schwere Grundübungen stehen vorn, Isolationsübungen für die gedehnte Position hinten.',
    evidence: 'Bei gleichem Volumen ist die Frequenz fürs Wachstum fast egal, für Kraft hilft öfter (Pelland 2026). Drei Tage machen es leicht, auf 10–20 Sätze pro Muskel zu kommen.',
    sources: ['pelland', 'schoenfeldFreq', 'wolf'],
    progression: DOUBLE_PROGRESSION,
    deload: DELOAD_STANDARD,
  },

  {
    id: 'ou4',
    name: 'Oberkörper/Unterkörper 4×',
    short: 'Zwei Oberkörper- und zwei Beintage – viel Volumen, gut verteilt.',
    forWhom: 'Für Fortgeschrittene mit vier Trainingstagen, auch im Schichtdienst.',
    focusLabel: 'Muskelaufbau, Kraft',
    daysPerWeek: 4,
    weeks: { 4: ['O1', 'U1', null, 'O2', 'U2', null, null] },
    equipment: 'gym',
    level: ['etwas', 'erfahren'],
    focus: ['muskel', 'kraft'],
    dose: 'standard',
    flexible: true,
    sessions: [
      {
        id: 'O1',
        name: 'Oberkörper 1 (schwer)',
        items: [
          x('bench', 4, [5, 8], MID, 180),
          x('row1', 3, [6, 10], MID, 150),
          x('ohp', 2, [8, 12], MID, 120),
          x('latpull', 3, [8, 12], MID, 120),
          x('lat', 3, [12, 20], ISO, 60),
          x('k_overhead', 2, [10, 15], ISO, 60),
          x('k_bayes', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'U1',
        name: 'Unterkörper 1 (schwer)',
        items: [
          x('squat', 3, [5, 8], MID, 180),
          x('rdl', 3, [6, 10], MID, 180),
          x('legcurl', 3, [10, 15], ISO, 90, { note: 'Sitzend, wenn es geht.' }),
          x('legext', 2, [12, 15], ISO, 90),
          x('calfmachine', 3, [10, 15], ISO, 60, { note: 'Unten kurz in der Dehnung halten.' }),
          x('k_crunch', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'O2',
        name: 'Oberkörper 2 (Volumen)',
        items: [
          x('g_inclinedb', 3, [8, 12], MID, 120),
          x('pullup', 3, [6, 10], MID, 150, { note: 'Oder Latzug, wenn Klimmzüge noch nicht gehen.' }),
          x('seatrow', 3, [10, 12], MID, 90),
          x('k_crosslow', 3, [12, 15], ISO, 60),
          x('k_lat', 2, [12, 20], ISO, 60),
          x('face', 2, [12, 20], ISO, 60),
          x('pushdown', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'U2',
        name: 'Unterkörper 2 (Volumen)',
        items: [
          x('press', 3, [10, 15], MID, 150),
          x('thrust', 3, [8, 12], MID, 120),
          x('legcurl', 3, [10, 15], ISO, 90),
          x('g_bulgarian', 2, [8, 12], MID, 120, { perSide: true }),
          x('calf', 3, [10, 15], ISO, 60),
          x('k_pallof', 2, [10, 12], EASY, 45, { perSide: true }),
        ],
      },
    ],
    why: 'Oberkörper und Beine wechseln sich ab, so trifft jeder Muskel zweimal pro Woche einen frischen Körper. Tag 1 ist schwerer (5–10 Wdh.), Tag 2 bringt mehr Volumen (8–15 Wdh.) – das deckt Kraft und Muskelaufbau ab. Die Reihenfolge ist frei: Wenn eine Schicht dazwischenkommt, machst du einfach mit der nächsten Einheit weiter.',
    evidence: 'Pelland 2026: 10–20 harte Sätze pro Muskel und Woche, mit abnehmendem Zusatznutzen; zwei Einheiten pro Muskel verteilen das Volumen und helfen der Kraft. Wachstum klappt in einem breiten Wiederholungsbereich nah am Versagen (Schoenfeld 2021).',
    sources: ['pelland', 'schoenfeldReps', 'refalo', 'singer'],
    progression: DOUBLE_PROGRESSION,
    deload: DELOAD_STANDARD,
  },

  {
    id: 'ppl3',
    name: 'Push/Pull/Beine 3×',
    short: 'Drücken, Ziehen, Beine – jeder Tag mit klarem Thema.',
    forWhom: 'Für alle, die klare Thementage mögen und genau drei Tage haben.',
    focusLabel: 'Muskelaufbau',
    daysPerWeek: 3,
    weeks: { 3: ['PUSH', null, 'PULL', null, 'LEGS', null, null] },
    equipment: 'gym',
    level: ['etwas', 'erfahren'],
    focus: ['muskel'],
    dose: 'standard',
    tradeoffs: ['frequency', 'volume'],
    sessions: [
      {
        id: 'PUSH',
        name: 'Push (Brust, Schultern, Trizeps)',
        items: [
          x('bench', 3, [6, 10], HEAVY, 180),
          x('g_inclinedb', 3, [8, 12], MID, 120),
          x('ohp', 2, [8, 12], MID, 120),
          x('fly', 2, [12, 15], ISO, 60),
          x('lat', 3, [12, 20], ISO, 60),
          x('k_overhead', 3, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'PULL',
        name: 'Pull (Rücken, Bizeps)',
        items: [
          x('latpull', 3, [8, 12], MID, 120),
          x('row1', 3, [6, 10], HEAVY, 150),
          x('k_row', 3, [10, 12], MID, 120),
          x('face', 3, [12, 20], ISO, 60),
          x('k_bayes', 3, [10, 15], ISO, 60),
          x('hammer', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'LEGS',
        name: 'Beine (Oberschenkel, Po, Waden)',
        items: [
          x('squat', 3, [6, 10], HEAVY, 180),
          x('rdl', 3, [6, 10], HEAVY, 180),
          x('press', 3, [10, 15], MID, 120),
          x('legcurl', 3, [10, 15], ISO, 90, { note: 'Sitzend, wenn es geht.' }),
          x('legext', 2, [12, 15], ISO, 90),
          x('thrust', 2, [8, 12], MID, 120),
          x('calf', 2, [10, 15], ISO, 60),
        ],
      },
    ],
    why: 'Jeder Tag hat ein klares Thema, das macht den Plan leicht zu merken. Weil jeder Muskel nur einmal pro Woche drankommt, landen manche Muskeln (vor allem Beine hinten und Po) etwas unter 8 Wochensätzen – mehr passt sinnvoll nicht in eine Einheit. Wenn du einen vierten Tag findest, ist Oberkörper/Unterkörper die bessere Wahl.',
    evidence: 'Bei gleicher Satzzahl wächst ein Muskel mit 1× pro Woche ähnlich wie mit 2× (Pelland 2026, Schoenfeld 2019). Für Kraft ist öfter besser, und mehr als etwa 8–10 Sätze pro Muskel in einer Einheit bringen wenig – deshalb ist hier bei rund 8–10 Schluss.',
    sources: ['pelland', 'schoenfeldFreq'],
    progression: DOUBLE_PROGRESSION,
    deload: DELOAD_STANDARD,
  },

  {
    id: 'ppl6',
    name: 'Push/Pull/Beine 6×',
    short: 'Jeder Muskel zweimal pro Woche, sechs Tage – für viel Volumen.',
    forWhom: 'Für Erfahrene, die gern fast täglich trainieren und gut schlafen.',
    focusLabel: 'Muskelaufbau, hohes Volumen',
    daysPerWeek: 6,
    weeks: { 6: ['PUSH_A', 'PULL_A', 'LEGS_A', 'PUSH_B', 'PULL_B', 'LEGS_B', null] },
    equipment: 'gym',
    level: ['erfahren'],
    focus: ['muskel', 'kraft'],
    dose: 'standard',
    sessions: [
      {
        id: 'PUSH_A',
        name: 'Push A (schwer)',
        items: [
          x('bench', 3, [5, 8], MID, 180),
          x('ohp', 3, [8, 12], MID, 120),
          x('fly', 2, [12, 15], ISO, 60),
          x('lat', 3, [12, 20], ISO, 60),
          x('k_overhead', 3, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'PULL_A',
        name: 'Pull A (schwer)',
        items: [
          x('row1', 3, [6, 10], MID, 150),
          x('pullup', 3, [6, 10], MID, 150),
          x('face', 3, [12, 20], ISO, 60),
          x('k_bayes', 3, [10, 15], ISO, 60),
          x('hammer', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'LEGS_A',
        name: 'Beine A (Kniebeuge)',
        items: [
          x('squat', 3, [5, 8], MID, 180),
          x('rdl', 3, [6, 10], MID, 180),
          x('legcurl', 3, [10, 15], ISO, 90, { note: 'Sitzend, wenn es geht.' }),
          x('legext', 2, [12, 15], ISO, 90),
          x('calfmachine', 3, [10, 15], ISO, 60),
          x('k_crunch', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'PUSH_B',
        name: 'Push B (Volumen)',
        items: [
          x('g_inclinedb', 3, [8, 12], MID, 120),
          x('shoulderpress', 2, [8, 12], MID, 120),
          x('k_crosslow', 3, [12, 15], ISO, 60),
          x('k_lat', 3, [12, 20], ISO, 60),
          x('pushdown', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'PULL_B',
        name: 'Pull B (Volumen)',
        items: [
          x('latpull', 3, [8, 12], MID, 120),
          x('k_row', 3, [10, 12], MID, 120),
          x('k_straight', 2, [12, 15], ISO, 60),
          x('reversefly', 2, [12, 20], ISO, 60),
          x('g_inclinecurl', 3, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'LEGS_B',
        name: 'Beine B (Hüfte)',
        items: [
          x('press', 3, [10, 15], MID, 150),
          x('thrust', 3, [8, 12], MID, 120),
          x('legcurl', 4, [10, 15], ISO, 90, { note: 'Sitzend, wenn es geht.' }),
          x('g_bulgarian', 2, [8, 12], MID, 120, { perSide: true }),
          x('calf', 3, [10, 15], ISO, 60),
          x('hang', 2, [8, 15], ISO, 60),
        ],
      },
    ],
    why: 'Sechs kurze, fokussierte Einheiten: Jeder Muskel kommt zweimal dran, mit einem schweren und einem Volumen-Tag. So landest du im oberen Bereich von 10–20 Sätzen, ohne dass eine Einheit länger als eine Stunde dauert. Ein Ruhetag pro Woche ist fest eingeplant – Schlaf und Erholung zählen hier besonders.',
    evidence: 'Mehr Volumen bringt mehr Wachstum, mit abnehmendem Ertrag (Pelland 2026). 3× und 6× pro Woche bringen bei gleichem Volumen ähnliche Ergebnisse – sechs Tage lohnen sich also nur, wenn du sie gern trainierst.',
    sources: ['pelland', 'schoenfeldFreq', 'bell'],
    progression: DOUBLE_PROGRESSION,
    deload: 'Alle 5–6 Wochen eine Woche mit halber Satzzahl und RIR 3–4 – bei sechs Tagen sammelt sich Müdigkeit schneller.',
  },

  {
    id: 'hybrid5',
    name: 'PPL + Ober/Unter 5×',
    short: 'Drei Thementage plus Oberkörper und Beine – fünf Tage, jeder Muskel 2×.',
    forWhom: 'Für Fortgeschrittene mit fünf Tagen, die Abwechslung mögen.',
    focusLabel: 'Muskelaufbau, Kraft',
    daysPerWeek: 5,
    weeks: { 5: ['PUSH', 'PULL', 'LEGS', null, 'UPPER', 'LOWER', null] },
    equipment: 'gym',
    level: ['etwas', 'erfahren'],
    focus: ['muskel', 'kraft'],
    dose: 'standard',
    sessions: [
      {
        id: 'PUSH',
        name: 'Push',
        items: [
          x('bench', 3, [6, 10], MID, 180),
          x('ohp', 3, [8, 12], MID, 120),
          x('fly', 2, [12, 15], ISO, 60),
          x('lat', 3, [12, 20], ISO, 60),
          x('k_overhead', 3, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'PULL',
        name: 'Pull',
        items: [
          x('pullup', 3, [6, 10], MID, 150, { note: 'Oder Latzug.' }),
          x('row1', 3, [6, 10], MID, 150),
          x('face', 3, [12, 20], ISO, 60),
          x('k_bayes', 3, [10, 15], ISO, 60),
          x('hammer', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'LEGS',
        name: 'Beine',
        items: [
          x('squat', 3, [6, 10], MID, 180),
          x('rdl', 3, [6, 10], MID, 180),
          x('legcurl', 3, [10, 15], ISO, 90, { note: 'Sitzend, wenn es geht.' }),
          x('legext', 2, [12, 15], ISO, 90),
          x('calf', 3, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'UPPER',
        name: 'Oberkörper',
        items: [
          x('g_inclinedb', 3, [8, 12], MID, 120),
          x('k_row', 3, [10, 12], MID, 120),
          x('latpull', 3, [8, 12], MID, 120),
          x('k_crosslow', 2, [12, 15], ISO, 60),
          x('k_lat', 2, [12, 20], ISO, 60),
          x('pushdown', 2, [10, 15], ISO, 60),
          x('g_inclinecurl', 2, [10, 15], ISO, 60),
        ],
      },
      {
        id: 'LOWER',
        name: 'Unterkörper',
        items: [
          x('press', 3, [10, 15], MID, 150),
          x('thrust', 3, [8, 12], MID, 120),
          x('legcurl', 3, [10, 15], ISO, 90),
          x('g_bulgarian', 2, [8, 12], MID, 120, { perSide: true }),
          x('calfmachine', 3, [10, 15], ISO, 60),
          x('k_pallof', 2, [10, 12], EASY, 45, { perSide: true }),
        ],
      },
    ],
    why: 'Die ersten drei Tage arbeiten nach Thema, die letzten zwei fassen Oberkörper und Beine zusammen. So kommt jeder Muskel zweimal pro Woche dran, mit genug Pause dazwischen. Der freie Donnerstag teilt die Woche in zwei Blöcke.',
    evidence: 'Zwei Einheiten pro Muskel verteilen 10–20 Wochensätze so, dass keine Einheit überladen ist (Pelland 2026). Übungen in gedehnter Position (Schrägbank-Curls, Überkopf-Trizeps, Beinbeuger sitzend) sind für Wachstum besonders effektiv (Wolf 2025).',
    sources: ['pelland', 'wolf', 'refalo'],
    progression: DOUBLE_PROGRESSION,
    deload: DELOAD_STANDARD,
  },

  {
    id: 'home',
    name: 'Zuhause mit Kurzhanteln & Bändern',
    short: 'Ganzkörper mit einem Paar Kurzhanteln und Bändern – kein Studio nötig.',
    forWhom: 'Für alle, die zu Hause trainieren, 2–3 Tage pro Woche.',
    focusLabel: 'Fit & kräftig, ohne Studio',
    daysPerWeek: 3,
    weeks: {
      3: ['A', null, 'B', null, 'A', null, null],
      2: ['A', null, null, 'B', null, null, null],
    },
    equipment: 'home',
    level: ['neu', 'etwas'],
    focus: ['fit', 'muskel'],
    dose: 'mindest',
    flexible: true,
    sessions: [
      {
        id: 'A',
        name: 'Zuhause A',
        items: [
          x('goblet', 3, [10, 15], MID, 120),
          x('dbbench', 3, [8, 15], MID, 120, { note: 'Auf Bank oder Boden (dann als Bodendrücken).' }),
          x('dbrow', 3, [10, 15], MID, 120, { perSide: true }),
          x('g_dbrdl', 3, [10, 15], MID, 120),
          x('ohp', 2, [10, 15], MID, 120),
          x('bandcurl', 2, [12, 20], ISO, 60),
        ],
      },
      {
        id: 'B',
        name: 'Zuhause B',
        items: [
          x('g_bulgarian', 3, [8, 15], MID, 120, { perSide: true }),
          x('pushup', 3, [6, 20], MID, 120, { note: 'Zu schwer? Hände erhöht auf Tisch oder Sofa.' }),
          x('g_bandpulldown', 3, [12, 20], MID, 120),
          x('g_sliderhamcurl', 3, [6, 12], MID, 120),
          x('g_bandpull', 2, [15, 25], ISO, 60),
          x('g_lyinglat', 2, [12, 20], ISO, 60),
        ],
      },
    ],
    why: 'Mit Kurzhanteln, Bändern und deinem Körpergewicht lassen sich alle großen Muskeln trainieren. Weil die Gewichte zu Hause begrenzt sind, arbeitest du mit mehr Wiederholungen – das funktioniert genauso, solange die letzten Wiederholungen schwer werden. Bei drei Tagen wechseln A und B, bei zwei Tagen machst du je einmal A und B.',
    evidence: 'Muskeln wachsen ähnlich gut mit 6–30 Wiederholungen, wenn du nah ans Versagen gehst (Schoenfeld 2021). Wichtiger als das Gewicht ist die Reserve von 0–2 Wiederholungen (Refalo 2023).',
    sources: ['schoenfeldReps', 'refalo', 'iversen'],
    progression:
      'Erst Wiederholungen steigern bis zum oberen Ende, dann schwerere Hanteln, ein stärkeres Band oder eine schwerere Variante (z. B. Liegestütze vom Boden statt erhöht). Langsamer absenken und 1–2 s in der Dehnung halten macht es auch schwerer.',
    deload: 'Alle 6–8 Wochen eine lockere Woche mit halber Satzzahl.',
  },

  {
    id: 'kurz',
    name: 'Kurz & effektiv',
    short: '30–35 Minuten Ganzkörper mit Supersätzen – das Wichtigste, ohne Leerlauf.',
    forWhom: 'Für volle Wochen, Schichtdienst oder alle, die schnell fertig sein wollen.',
    focusLabel: 'Zeiteffizient, Erhalt & Aufbau',
    daysPerWeek: 3,
    weeks: {
      3: ['A', null, 'B', null, 'A', null, null],
      2: ['A', null, null, 'B', null, null, null],
    },
    equipment: 'gym',
    level: ['neu', 'etwas', 'erfahren'],
    focus: ['fit', 'muskel', 'kraft'],
    dose: 'mindest',
    warmupMin: 3,
    flexible: true,
    sessions: [
      {
        id: 'A',
        name: 'Kurz A',
        items: [
          x('press', 3, [8, 12], MID, 90, { superset: '1' }),
          x('chestpress', 3, [8, 12], MID, 90, { superset: '1' }),
          x('g_dbrdl', 2, [8, 12], MID, 90, { superset: '2' }),
          x('latpull', 3, [8, 12], MID, 90, { superset: '2' }),
          x('lat', 2, [12, 20], ISO, 60, { superset: '3' }),
          x('k_overhead', 2, [10, 15], ISO, 60, { superset: '3' }),
        ],
      },
      {
        id: 'B',
        name: 'Kurz B',
        items: [
          x('smithsquat', 3, [6, 10], MID, 90, { superset: '1' }),
          x('seatrow', 3, [10, 12], MID, 90, { superset: '1' }),
          x('legcurl', 2, [10, 15], ISO, 90, { superset: '2' }),
          x('g_inclinedb', 3, [8, 12], MID, 90, { superset: '2' }),
          x('shoulderpress', 2, [8, 12], MID, 60, { superset: '3' }),
          x('k_bayes', 2, [10, 15], ISO, 60, { superset: '3' }),
        ],
      },
    ],
    why: 'Je zwei Übungen, die sich nicht gegenseitig ermüden, werden abwechselnd gemacht – so ist die Pause für die eine Übung die Arbeitszeit der anderen. Maschinen sparen Umbauzeit, ein kurzes Aufwärmen mit leichten Sätzen der ersten Übung reicht. Auch zweimal pro Woche ist das genug, um Kraft aufzubauen oder zu halten.',
    evidence: 'Iversen 2021: Grundübungen, mindestens 4 Sätze pro Muskel und Woche, Supersätze und kurzes, gezieltes Aufwärmen machen Training zeiteffizient. Für den Krafterhalt reichen wenige schwere Sätze pro Woche (Androulakis-Korakakis 2021).',
    sources: ['iversen', 'androulakis', 'pelland'],
    progression: DOUBLE_PROGRESSION,
    deload: 'Bei diesem kleinen Volumen selten nötig. Bei viel Stress: eine Woche mit 2 statt 3 Sätzen.',
  },

  {
    id: 'laufen',
    name: 'Kraft + Laufen',
    short: 'Zwei Krafttage, passend zwischen Lauftreff und langem Lauf gelegt.',
    forWhom: 'Für Läuferinnen und Läufer mit festen Lauftagen (auch mit Typ-1-Diabetes).',
    focusLabel: 'Laufen + Kraft, Verletzungsschutz',
    daysPerWeek: 2,
    weeks: { 2: [null, null, 'A', null, 'B', null, null] },
    runDays: [
      { day: 1, kind: 'quality', label: 'Lauftreff: Intervalle oder Tempo' },
      { day: 3, kind: 'easy', label: 'Lauftreff: locker' },
      { day: 6, kind: 'long', label: 'Langer Lauf' },
    ],
    equipment: 'gym',
    level: ['neu', 'etwas', 'erfahren'],
    focus: ['laufen', 'kraft', 'fit'],
    dose: 'mindest',
    sessions: [
      {
        id: 'A',
        name: 'Kraft A (Beine schwer)',
        items: [
          x('squat', 3, [4, 6], EASY, 180, { note: 'Schwer, aber mit 2–3 Wdh. Reserve – kein Muskelkater fürs Laufen.' }),
          x('rdl', 3, [5, 8], EASY, 180),
          x('calf', 3, [8, 12], MID, 90, { note: 'Langsam, mit Zusatzgewicht, unten kurz halten.' }),
          x('bench', 3, [6, 10], MID, 150),
          x('k_row', 3, [8, 12], MID, 120),
          x('g_sideplank', 2, [20, 40], EASY, 45, { unit: 's', perSide: true }),
        ],
      },
      {
        id: 'B',
        name: 'Kraft B (Oberkörper, Beine leicht)',
        items: [
          x('latpull', 3, [8, 12], MID, 120),
          x('g_inclinedb', 3, [8, 12], MID, 120),
          x('g_bulgarian', 2, [6, 10], EASY, 120, { perSide: true }),
          x('legcurl', 2, [8, 12], EASY, 90),
          x('face', 2, [12, 20], ISO, 60),
          x('k_pallof', 2, [10, 12], EASY, 45, { perSide: true }),
        ],
      },
    ],
    why: 'Der schwere Beintag liegt am Tag nach dem Intervall-Lauftreff, damit deine Beine für die harten Läufe frisch sind. Der zweite Krafttag belastet die Beine nur leicht und liegt zwei Tage vor dem langen Lauf. Schwere Kniebeugen, Kreuzheben und Wadenheben machen dich ökonomischer beim Laufen und robuster gegen Überlastung.',
    evidence: 'Kraft und Ausdauer zusammen bremsen Muskel- und Kraftzuwachs kaum, nur die Schnellkraft etwas – vor allem, wenn beides in derselben Einheit passiert (Schumann 2022). Schweres Krafttraining verbessert die Laufökonomie (Blagrove 2018).',
    sources: ['schumann', 'blagrove', 'androulakis', 'riddell', 'yardley'],
    progression:
      'Doppelte Progression, aber mit 2–3 Wdh. Reserve bei den Beinübungen. In Wettkampfwochen oder vor langen Läufen: Gewicht halten statt steigern.',
    deload: 'Leg die leichtere Kraftwoche in deine lockere Laufwoche, etwa alle 4–6 Wochen: halbe Satzzahl, gleiche Gewichte.',
    healthNotes: {
      t1d: [
        'Möglichst gleiche Uhrzeit und ähnlicher Ablauf – das macht deinen Glukoseverlauf berechenbarer.',
        'Glukose vor dem Training, danach und am Abend bzw. in der Nacht danach prüfen. Nach Kraft plus Lauf am selben Tag sind späte Unterzuckerungen möglich.',
        'Schnelle Kohlenhydrate immer griffbereit haben, auch im Studio.',
        'Wenn du Kraft und Lauf am selben Tag machst: Kraft zuerst hat in einer Studie den Glukoseabfall während des Trainings verringert.',
        'Wie du Insulin und Kohlenhydrate ums Training anpasst, besprichst du mit deinem Diabetes-Team. Die App gibt dazu keine Dosis-Tipps.',
      ],
    },
  },

  {
    id: 'ruecken',
    name: 'Rücken & Beweglichkeit',
    short: 'Sanfter Einstieg auf der Matte: kräftigen, mobilisieren, Vertrauen aufbauen.',
    forWhom: 'Für einen ruhigen Neustart, bei Rückenbeschwerden oder nach langer Pause.',
    focusLabel: 'Rücken, Beweglichkeit, sanfter Einstieg',
    daysPerWeek: 3,
    weeks: {
      3: ['A', null, 'B', null, 'A', null, null],
      2: ['A', null, null, 'B', null, null, null],
    },
    equipment: 'none',
    level: ['neu'],
    focus: ['fit'],
    dose: 'sanft',
    warmupMin: 0,
    flexible: true,
    sessions: [
      {
        id: 'A',
        name: 'Rücken A',
        items: [
          mob('g_catcow', 1, [45, 60]),
          x('g_birddog', 2, [6, 8], EASY, 45, { perSide: true }),
          x('g_goodmorning', 2, [10, 12], EASY, 60, { note: 'Hüfte nach hinten schieben, Rücken lang.' }),
          x('g_boxsquat', 2, [8, 12], EASY, 60),
          x('g_inclinepush', 2, [8, 12], EASY, 60),
          x('g_proneytw', 2, [6, 10], EASY, 45),
          mob('g_hipflexor', 1, [45, 60], { perSide: true }),
        ],
      },
      {
        id: 'B',
        name: 'Rücken B',
        items: [
          mob('g_thoracic', 1, [45, 60], { perSide: true }),
          x('g_deadbug', 2, [6, 8], EASY, 45, { perSide: true }),
          x('g_sideplank', 2, [15, 30], EASY, 45, { unit: 's', perSide: true, note: 'Auf den Knien ist völlig in Ordnung.' }),
          x('g_bridgemarch', 2, [8, 12], EASY, 60),
          x('lunge', 2, [6, 10], EASY, 60, { perSide: true, note: 'Rückwärts, gern mit einer Hand an der Stuhllehne.' }),
          x('g_inclinepush', 2, [8, 12], EASY, 60),
          x('g_proneytw', 2, [6, 10], EASY, 45),
          mob('g_childpose', 1, [45, 60]),
        ],
      },
    ],
    why: 'Bewegung ist eine der wirksamsten Maßnahmen bei unspezifischen Rückenschmerzen – welche Übungen, ist weniger wichtig als dranzubleiben. Darum gibt es hier kurze, gut machbare Übungen für Rumpf, Hüfte und Beine, dazu Mobilisation. Wenn es sich nach ein paar Wochen sicher anfühlt, ist Ganzkörper 2× der nächste Schritt.',
    evidence: 'Cochrane-Review (Hayden 2021): Bewegungstherapie senkt Schmerzen bei chronischen Kreuzschmerzen moderat, ohne klaren Sieger unter den Übungsarten. Bei starken, ausstrahlenden oder neuen Beschwerden zuerst ärztlich abklären.',
    sources: ['hayden'],
    progression:
      'Erst Wiederholungen oder Haltezeit bis zum oberen Ende, dann eine schwerere Variante (z. B. Liegestütze tiefer, Seitstütz gestreckt) oder ein dritter Satz. Leichtes Ziehen ist okay, stechender Schmerz nicht.',
    deload: 'Kein fester Deload. An schlechten Tagen nur die Mobilisation – das zählt auch.',
  },
];

/** Alle Vorlagen, eingefroren. */
export const PLAN_TEMPLATES = Object.freeze(TEMPLATES.map((p) => Object.freeze(p)));

/** Verweis auf die eigenen Schwangerschafts- und Rückbildungspläne (nicht doppelt anlegen). */
export const RELATED_PLANS = Object.freeze([
  {
    id: 'mama',
    name: 'Schwangerschaft & Rückbildung',
    short: 'Eigene Heimpläne mit Timer, angepasst an Trimester bzw. Wochen nach der Geburt.',
    route: 'mama',
  },
]);

/** @param {string} id */
export const planById = (id) => PLAN_TEMPLATES.find((p) => p.id === id);

/** @param {string} id */
export const planExercise = (id) => PLAN_EXERCISES[id];

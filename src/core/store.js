/**
 * Speicher – die einzige Stelle, die Daten liest und schreibt.
 *
 * Aufbau: ein austauschbarer Speicher-Adapter (get/set/remove/keys, nur Strings)
 * und darüber typisierte Bereiche, die JSON lesen/schreiben und Standardwerte liefern.
 * Heute steckt `localStorage` dahinter, in Tests ein Speicher im Arbeitsspeicher,
 * später z. B. Capacitor Preferences oder SQLite.
 *
 * Alle v2-Schlüssel beginnen mit "ng2.". Die alten v1-Schlüssel ("lab.*") werden nie
 * geschrieben oder gelöscht, nur von domain/migrate.js über `readLegacy()` gelesen.
 *
 * | Schlüssel      | Bereich    | Inhalt                                                          | Standard |
 * |----------------|------------|-----------------------------------------------------------------|----------|
 * | ng2.meta       | meta       | Schema-Version, Anlagezeit, Zeitpunkt der v1-Übernahme          | {schema} |
 * | ng2.profile    | profile    | Name, Ziel, Alter, Gewicht, Trainingstage, Begleiter (Art, Name)| null     |
 * | ng2.settings   | settings   | Sprache, Design, Ansicht, Startansicht, Pause, Zeitmessung, Sperre, Module, Kachel-Reihenfolge | s. u. |
 * | ng2.gear       | gear       | verfügbare Geräte                                               | ["Körpergewicht"] |
 * | ng2.plans      | plans      | Trainingspläne mit Übungen (Sätze, Soll-Wdh.)                   | []       |
 * | ng2.schedule   | schedule   | Wochenplan: Wochentag (0 = Mo) → Plan oder Aktivität            | {}       |
 * | ng2.sessions   | sessions   | Trainingsprotokoll: Kraft, Aktivitäten, Heimpläne               | []       |
 * | ng2.history    | history    | alle Sätze je Übung (Gewicht, Wdh., RIR)                        | {}       |
 * | ng2.live       | live       | laufendes Live-Training                                         | null     |
 * | ng2.prs        | prs        | Bestleistungen                                                  | []       |
 * | ng2.exercises  | exercises  | eigene Übungen, Favoriten, Einstellungen je Übung, letzte RIR   | s. u.    |
 * | ng2.habit      | habit      | Gewohnheit mit Anker-Satz und erledigten Tagen                  | s. u.    |
 * | ng2.focus      | focus      | Tagesfokus (ein Satz, erledigt ja/nein)                         | s. u.    |
 * | ng2.dump       | dump       | „Kurz abladen“-Gedanken                                         | []       |
 * | ng2.feed       | feed       | langsamer Feed: heutige Auswahl, Warteschlange, Tagesstempel    | s. u.    |
 * | ng2.people     | people     | Menschen fürs Umlenken mit letztem Kontakt                      | []       |
 * | ng2.account    | account    | Instagram-Zeitkonto: Tage (30 Tage Verlauf) und Freigabe        | s. u.    |
 * | ng2.redirects  | redirects  | Umlenkungen je Woche (Montag-Schlüssel → Anzahl)                | {}       |
 * | ng2.buddy      | buddy      | Begleiter-Zustand: Ton, an/aus, höchste Stufe, Besuche          | s. u.    |
 * | ng2.mama       | mama       | Schwangerschaft/Rückbildung: Modus, Datum, Abfragen             | null     |
 * | ng2.metrics    | metrics    | eigene Messwerte (Name, Einheit, Bereich)                       | []       |
 * | ng2.lastCard   | lastCard   | zuletzt gezeigte Abschluss-Karte                                | null     |
 * | ng2.ideas      | ideas      | Ideen-Labor: Favoriten                                          | {likes:[]} |
 * | ng2.motto      | motto      | eigener Leitsatz auf „Heute“                                    | null     |
 * | ng2.gate       | gate       | „Wirklich jetzt?“: Entscheidungen (60 Tage), Schonfrist nach „Trotzdem öffnen“ | s. u. |
 */

export const PREFIX = 'ng2.';
export const LEGACY_PREFIX = 'lab.';
export const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ Typen */

/**
 * @typedef {object} StorageAdapter
 * @property {(key: string) => string|null} get
 * @property {(key: string, value: string) => void} set
 * @property {(key: string) => void} remove
 * @property {() => string[]} keys
 */

/** @typedef {import('./dates.js').DateKey} DateKey */

/**
 * @typedef {object} Meta
 * @property {number} schema
 * @property {string|null} createdAt        ISO-Zeitpunkt
 * @property {string|null} migratedFromV1   ISO-Zeitpunkt der Übernahme oder null
 */

/**
 * @typedef {'Muskelaufbau'|'Kraft'|'Abnehmen'|'Fit bleiben'|'Ausdauer'|''} Goal
 * @typedef {object} Companion
 * @property {string} species   Art des Begleiters (data/companions.js), z. B. "keimling"
 * @property {string} name
 * @typedef {object} Profile
 * @property {string} name
 * @property {Goal} goal
 * @property {number|null} age
 * @property {number|null} weight   kg
 * @property {number} days          Wochenziel (Trainingstage)
 * @property {Companion} [companion]  fehlt bei alten Profilen → Standard-Begleiter
 */

/**
 * @typedef {object} Settings
 * @property {'de'|'en'} lang               Sprache der Oberfläche
 * @property {'system'|'light'|'dark'} theme
 * @property {'einfach'|'profi'} view
 * @property {'heute'|'training'|'live'} startView
 * @property {number} restSeconds
 * @property {boolean} timeTracking
 * @property {boolean} lockDuringTraining   Instagram sperren, solange ein Live-Training läuft
 * @property {string[]|null} enabledModules  eingeschaltete Module; null = noch nicht gefragt (Standard)
 * @property {string[]} tileOrder            gewünschte Reihenfolge der Kacheln auf „Heute“ (Kachel-Ids)
 * @property {string[]} hiddenTiles          ausgeblendete Kacheln auf „Heute“
 * @property {boolean|null} plain            „Schlicht“: Begleiter, Garten und Sätze ausblenden (null = aus buddy.on ableiten)
 * @property {{template: string, days: number}|null} activePlan   gewählte Plan-Vorlage (data/plans.js)
 * @property {string|null} backupAt          Tag der letzten gespeicherten Sicherung (YYYY-MM-DD)
 * @property {string|null} backupNudgeAt     Tag, an dem „Sicherung machen?“ zuletzt weggetippt wurde
 */

/**
 * @typedef {'training'|'move'|'breath'|'open'} GateChoice
 * @typedef {object} GateState
 * @property {{at: number, choice: GateChoice}[]} log
 * @property {number|null} graceUntil   bis dahin leitet „Wirklich jetzt?“ direkt weiter (ms)
 */

/**
 * @typedef {object} Exercise
 * @property {string} id
 * @property {string} name
 * @property {string} gear
 * @property {string[]} muscles    erster Eintrag = Hauptmuskel
 * @property {string} [attachment] Kabel-Aufsatz
 * @property {'custom'|'db'} [source]
 */

/**
 * @typedef {object} PlanItem
 * @property {string} exercise
 * @property {number} sets
 * @property {string} reps    Soll, frei formuliert ("8–10", "45 s", "max")
 * @typedef {object} Plan
 * @property {string} id
 * @property {string} name
 * @property {PlanItem[]} items
 * @property {boolean} [example]
 */

/**
 * @typedef {{kind:'plan', id:string} | {kind:'activity', id:string}} ScheduleSlot
 * @typedef {Record<string, ScheduleSlot>} Schedule   Schlüssel "0" (Mo) … "6" (So)
 */

/**
 * @typedef {Record<string, {before:string|null, after:string|null, timeBefore?:string|null, timeAfter?:string|null}>} MetricValues
 * @typedef {object} Session
 * @property {string} id
 * @property {DateKey} date
 * @property {'strength'|'activity'|'homeplan'} kind
 * @property {string|null} planId          Plan, Aktivitäts-Id oder Heimplan-Id
 * @property {string|null} [name]
 * @property {Record<string, number>} muscleSets  gewichtete Sätze je Muskel
 * @property {number} setCount             echte Anzahl Sätze
 * @property {string[]} [exercises]
 * @property {boolean} [live]
 * @property {boolean} [autoFinished]
 * @property {number} [durationMin]
 * @property {number} [km]
 * @property {number} [rpe]
 * @property {MetricValues} [metrics]
 */

/**
 * @typedef {object} SetRecord
 * @property {DateKey} date
 * @property {number} weight   kg, 0 = nur Körpergewicht
 * @property {number} reps
 * @property {number|null} rir  null = unbekannt
 * @property {number|null} [session]  Startzeit des Live-Trainings (Zuordnung)
 */

/**
 * @typedef {object} LiveSet
 * @property {string} exercise
 * @property {number} weight
 * @property {number} reps
 * @property {number|null} rir
 * @property {number} at          Zeitpunkt (ms)
 * @property {string} [attachment]
 * @property {string} [height]
 * @typedef {object} LiveQueue
 * @property {string} planId
 * @property {string} name
 * @property {{exercise:string, sets:number, reps:string}[]} items
 * @property {number} index
 * @typedef {object} LiveSession
 * @property {number} start
 * @property {LiveSet[]} sets
 * @property {'low'|'ok'|'high'|null} form
 * @property {LiveQueue|null} queue
 * @property {MetricValues|null} metrics
 * @property {boolean} legHintDismissed
 * @property {{start: number, duration: number}|null} [rest]   laufende Satzpause
 */

/**
 * @typedef {object} PersonalRecord
 * @property {DateKey} date
 * @property {string} exercise
 * @property {number} weight
 * @property {number} reps
 * @property {number|null} [session]
 */

/**
 * @typedef {object} ExercisePrefs
 * @property {number} [step]
 * @property {[number, number]} [repRange]
 * @property {string} [attachment]
 * @property {string} [height]
 * @typedef {object} ExercisesState
 * @property {Exercise[]} custom
 * @property {string[]} favorites
 * @property {Record<string, ExercisePrefs>} prefs
 * @property {number} lastRir
 */

/**
 * @typedef {object} Habit
 * @property {string} name     leer = Standard-Gewohnheit (Text aus habit.defaultName)
 * @property {string|null} anchor
 * @property {Record<DateKey, true>} days
 * @typedef {object} DailyFocus
 * @property {DateKey|''} day
 * @property {string} text
 * @property {boolean} done
 */

/**
 * @typedef {object} FeedItem
 * @property {string} title
 * @property {string} source
 * @property {string} tag
 * @property {boolean} read
 * @typedef {object} FeedState
 * @property {FeedItem[]} items
 * @property {{title:string, source:string}[]} queue
 * @property {DateKey|null} day       letzter Tageswechsel
 * @property {DateKey|null} readDay   Tag, an dem zuletzt etwas gelesen wurde
 */

/**
 * @typedef {object} Person
 * @property {string} name
 * @property {DateKey} lastContact
 * @property {boolean} [example]
 */

/**
 * @typedef {object} AccountDay
 * @property {number} tries
 * @property {number} redirects
 * @property {number} used
 * @property {number} earned
 * @property {string[]} earnKeys   z. B. "training", "feed", "kontakt0"
 * @typedef {object} AccountState
 * @property {Record<DateKey, AccountDay>} days
 * @property {{until:number}|null} unlock
 */

/**
 * Zustand des Begleiters (Art und Name stehen im Profil).
 * @typedef {object} BuddyState
 * @property {'ruhig'|'motiv'|'frech'} tone
 * @property {boolean} on
 * @property {number} maxStage
 * @property {DateKey|null} lastVisit
 * @property {DateKey|null} backDay
 * @property {boolean} backShown
 */

/**
 * @typedef {object} MamaState
 * @property {'preg'|'post'} mode
 * @property {DateKey|''} date      Geburtstermin (preg) bzw. Geburtsdatum (post)
 * @property {boolean} cesarean
 * @property {string|null} seenPhase
 * @property {boolean} safetyOk
 * @property {boolean} check6
 * @property {boolean} check12
 */

/**
 * @typedef {object} Metric
 * @property {string} name
 * @property {string} unit
 * @property {number} [lo]
 * @property {number} [hi]
 */

/* -------------------------------------------------------------- Adapter */

/**
 * Adapter auf `localStorage`. Fehler (Privatmodus, voller Speicher) werden geschluckt:
 * Lesen liefert dann null, Schreiben wird still verworfen.
 * @param {Storage} [storage]
 * @returns {StorageAdapter}
 */
export function localStorageAdapter(storage = globalThis.localStorage) {
  return {
    get(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        storage.setItem(key, value);
      } catch {
        /* Speicher voll oder gesperrt */
      }
    },
    remove(key) {
      try {
        storage.removeItem(key);
      } catch {
        /* gesperrt */
      }
    },
    keys() {
      try {
        return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => k !== null);
      } catch {
        return [];
      }
    },
  };
}

/**
 * Adapter im Arbeitsspeicher – für Tests und als Platzhalter für native Speicher.
 * @param {Record<string, string>} [initial]
 * @returns {StorageAdapter & {dump: () => Record<string, string>}}
 */
export function memoryAdapter(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get: (key) => (map.has(key) ? map.get(key) : null),
    set: (key, value) => void map.set(key, String(value)),
    remove: (key) => void map.delete(key),
    keys: () => [...map.keys()],
    dump: () => Object.fromEntries(map),
  };
}

/* ------------------------------------------------------------- Bereiche */

/** @returns {Settings} */
const defaultSettings = () => ({
  lang: 'de',
  theme: 'system',
  view: 'einfach',
  startView: 'heute',
  restSeconds: 90,
  timeTracking: false,
  lockDuringTraining: true,
  enabledModules: null,
  tileOrder: [],
  hiddenTiles: [],
  plain: null,
  activePlan: null,
  backupAt: null,
  backupNudgeAt: null,
});

/**
 * Standardwerte je Bereich. Funktionen, damit niemand einen geteilten Wert verändert.
 * Objekt-Standards werden beim Lesen mit dem gespeicherten Wert zusammengeführt,
 * so bekommen ältere Einträge neu hinzugekommene Felder.
 */
const AREAS = /** @type {const} */ ({
  meta: () => ({ schema: SCHEMA_VERSION, createdAt: null, migratedFromV1: null }),
  profile: () => null,
  settings: defaultSettings,
  gear: () => ['Körpergewicht'],
  plans: () => [],
  schedule: () => ({}),
  sessions: () => [],
  history: () => ({}),
  live: () => null,
  prs: () => [],
  exercises: () => ({ custom: [], favorites: [], prefs: {}, lastRir: 2 }),
  habit: () => ({ name: '', anchor: null, days: {} }),   // leerer Name → Vorschlag in der Sprache der UI
  focus: () => ({ day: '', text: '', done: false }),
  dump: () => [],
  feed: () => ({ items: [], queue: [], day: null, readDay: null }),
  people: () => [],
  account: () => ({ days: {}, unlock: null }),
  redirects: () => ({}),
  buddy: () => ({
    tone: 'motiv', on: true, maxStage: 1, lastVisit: null, backDay: null, backShown: false,
  }),
  mama: () => null,
  metrics: () => [],
  lastCard: () => null,
  ideas: () => ({ likes: [] }),
  motto: () => null,
  gate: () => ({ log: [], graceUntil: null }),
});

/** @typedef {keyof typeof AREAS} AreaName */
export const AREA_NAMES = /** @type {AreaName[]} */ (Object.keys(AREAS));

/** @param {AreaName} area */
export const keyOf = (area) => PREFIX + area;

/**
 * Frischer Standardwert eines Bereichs.
 * @param {AreaName} area
 */
export const defaultOf = (area) => AREAS[area]();

/** @param {unknown} v */
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * @template T
 * @typedef {object} Area
 * @property {() => T} get
 * @property {(value: T) => void} set
 * @property {(fn: (current: T) => T) => T} update
 * @property {() => void} reset   Eintrag entfernen (danach gilt der Standard)
 * @property {() => boolean} exists
 */

/**
 * @typedef {object} StoreExtras
 * @property {StorageAdapter} adapter
 * @property {() => Partial<Record<AreaName, unknown>>} exportAll   alle vorhandenen v2-Einträge
 * @property {(data: Partial<Record<AreaName, unknown>>) => void} importAll
 * @property {() => void} clearAll   nur v2-Einträge
 * @property {() => Record<string, string>} readLegacy   rohe v1-Einträge ("lab.*")
 * @typedef {{[K in AreaName]: Area<any>} & StoreExtras} Store
 */

/**
 * @param {StorageAdapter} adapter
 * @param {{onChange?: (area: AreaName) => void}} [options]
 * @returns {Store}
 */
export function createStore(adapter, { onChange } = {}) {
  /** @param {AreaName} area */
  const read = (area) => {
    const fallback = AREAS[area]();
    const raw = adapter.get(keyOf(area));
    if (raw === null) return fallback;
    try {
      const value = JSON.parse(raw);
      if (isPlainObject(fallback) && isPlainObject(value)) return { ...fallback, ...value };
      if (fallback !== null && value === null) return fallback;
      if (Array.isArray(fallback) && !Array.isArray(value)) return fallback;
      return value;
    } catch {
      return fallback;
    }
  };

  /** @param {AreaName} area @param {unknown} value */
  const write = (area, value) => {
    if (value === undefined) adapter.remove(keyOf(area));
    else adapter.set(keyOf(area), JSON.stringify(value));
    onChange?.(area);
  };

  const store = /** @type {Store} */ ({ adapter });
  for (const area of AREA_NAMES) {
    store[area] = {
      get: () => read(area),
      set: (value) => write(area, value),
      update: (fn) => {
        const next = fn(read(area));
        write(area, next);
        return next;
      },
      reset: () => write(area, undefined),
      exists: () => adapter.get(keyOf(area)) !== null,
    };
  }

  store.exportAll = () => {
    /** @type {Partial<Record<AreaName, unknown>>} */
    const out = {};
    for (const area of AREA_NAMES) if (store[area].exists()) out[area] = read(area);
    return out;
  };

  store.importAll = (data) => {
    for (const area of AREA_NAMES) if (area in data) write(area, data[area]);
  };

  store.clearAll = () => {
    for (const key of adapter.keys()) if (key.startsWith(PREFIX)) adapter.remove(key);
    for (const area of AREA_NAMES) onChange?.(area);
  };

  store.readLegacy = () => {
    /** @type {Record<string, string>} */
    const out = {};
    for (const key of adapter.keys()) {
      if (!key.startsWith(LEGACY_PREFIX)) continue;
      const raw = adapter.get(key);
      if (raw !== null) out[key] = raw;
    }
    return out;
  };

  return store;
}

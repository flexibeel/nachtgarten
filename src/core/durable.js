/**
 * Dauerhaft speichern: `localStorage` bleibt der schnelle, synchrone Speicher der App,
 * IndexedDB hält eine zweite, vollständige Kopie aller v2-Einträge („ng2.*“) und bis zu
 * fünf Tagesstände. So überleben Pläne und Trainings, wenn eine der beiden Ablagen
 * geleert wird (Browser räumt auf, Speicher voll, Website-Daten teilweise gelöscht).
 *
 * - `mirroredAdapter` schreibt jede Änderung zusätzlich gebündelt nach IndexedDB und zählt
 *   eine Revision (`ng2._rev`) hoch.
 * - Beim Start entscheidet `planRestore` rein (getestet), wer aktuell ist: leer ↔ voll wird
 *   automatisch ergänzt, sonst gewinnt die höhere Revision.
 * - Tagesstände: `needsSnapshot` / `pruneSnapshots` (rein), gespeichert in IndexedDB.
 * - Ohne IndexedDB (alte Browser, manche Privat-Fenster) läuft alles wie bisher weiter.
 */

import { PREFIX } from './store.js';

/** Revision der Daten; steigt mit jeder Änderung (Vergleich localStorage ↔ IndexedDB). */
export const REV_KEY = `${PREFIX}_rev`;
/** So viele Tagesstände bleiben erhalten. */
export const SNAPSHOT_KEEP = 5;

const DB_NAME = 'nachtgarten';
const DB_VERSION = 1;
const KV = 'kv';
const SNAPSHOTS = 'snapshots';
const FLUSH_MS = 120;
const OPEN_TIMEOUT_MS = 1500;

/** @typedef {import('./store.js').StorageAdapter} StorageAdapter */
/** @typedef {Record<string, string>} RawData  Schlüssel → gespeicherter Text */

/* ---------------------------------------------------------------- rein */

/** @param {string} key */
const isDataKey = (key) => key.startsWith(PREFIX) && key !== REV_KEY;

/**
 * Enthält der Stand echte Nutzerdaten (mehr als nur Verwaltungsangaben)?
 * @param {RawData} data
 */
export const hasUserData = (data) => Object.keys(data).some((k) => isDataKey(k) && k !== `${PREFIX}meta`);

/** @param {RawData} data */
export const revOf = (data) => {
  const n = Number(data[REV_KEY]);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Wer ist aktuell? Ergebnis sagt, in welche Richtung kopiert wird.
 * - Nur eine Seite hat Daten → von dort ergänzen (z. B. localStorage geleert → aus IndexedDB).
 * - Beide haben Daten → höhere Revision gewinnt; bei Gleichstand localStorage (wird zuerst geschrieben).
 * @param {RawData} primary   localStorage (nur ng2.*)
 * @param {RawData} mirror    IndexedDB
 * @returns {'none'|'fromMirror'|'toMirror'}
 */
export function planRestore(primary, mirror) {
  const p = hasUserData(primary);
  const m = hasUserData(mirror);
  if (!p && !m) return 'none';
  if (!p) return 'fromMirror';
  if (!m) return 'toMirror';
  return revOf(mirror) > revOf(primary) ? 'fromMirror' : revOf(primary) === revOf(mirror) && sameData(primary, mirror) ? 'none' : 'toMirror';
}

/** @param {RawData} a @param {RawData} b */
function sameData(a, b) {
  const ka = Object.keys(a).filter(isDataKey).sort();
  const kb = Object.keys(b).filter(isDataKey).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

/**
 * Braucht es heute einen Tagesstand?
 * @param {{day: string}[]} snapshots
 * @param {string} today   YYYY-MM-DD
 */
export const needsSnapshot = (snapshots, today) => !snapshots.some((s) => s.day === today);

/**
 * Welche Tagesstände fallen weg (älteste zuerst über `keep` hinaus)?
 * @param {{day: string}[]} snapshots
 * @param {number} [keep]
 * @returns {string[]} Tage zum Löschen
 */
export function pruneSnapshots(snapshots, keep = SNAPSHOT_KEEP) {
  return [...snapshots]
    .map((s) => s.day)
    .sort()
    .reverse()
    .slice(keep);
}

/**
 * Nur die v2-Daten eines Adapters (ohne Revision).
 * @param {StorageAdapter} adapter
 * @returns {RawData}
 */
export function readData(adapter) {
  /** @type {RawData} */
  const out = {};
  for (const key of adapter.keys()) {
    if (!key.startsWith(PREFIX)) continue;
    const value = adapter.get(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

/**
 * Adapter, der jede Änderung an „ng2.*“ zusätzlich an `sink` meldet und die Revision erhöht.
 * @param {StorageAdapter} primary
 * @param {{put: (key: string, value: string|null) => void}} sink
 * @returns {StorageAdapter}
 */
export function mirroredAdapter(primary, sink) {
  const bump = () => {
    const next = String(revOf({ [REV_KEY]: primary.get(REV_KEY) ?? '0' }) + 1);
    primary.set(REV_KEY, next);
    sink.put(REV_KEY, next);
  };
  return {
    get: (key) => primary.get(key),
    keys: () => primary.keys(),
    set(key, value) {
      primary.set(key, value);
      if (!isDataKey(key)) return;
      sink.put(key, value);
      bump();
    },
    remove(key) {
      primary.remove(key);
      if (!isDataKey(key)) return;
      sink.put(key, null);
      bump();
    },
  };
}

/**
 * Stand in einen Adapter schreiben (ersetzt alle v2-Einträge).
 * @param {StorageAdapter} adapter
 * @param {RawData} data
 */
export function replaceData(adapter, data) {
  for (const key of adapter.keys()) if (key.startsWith(PREFIX) && !(key in data)) adapter.remove(key);
  for (const [key, value] of Object.entries(data)) adapter.set(key, value);
}

/* ------------------------------------------------------------ IndexedDB */

/**
 * @typedef {object} Snapshot
 * @property {string} day       YYYY-MM-DD
 * @property {string} created   ISO-Zeitpunkt
 * @property {RawData} data
 */

/**
 * @typedef {object} Durable
 * @property {boolean} available
 * @property {StorageAdapter} adapter                 für createContext
 * @property {'none'|'fromMirror'|'toMirror'} restored  was beim Start passiert ist
 * @property {() => Promise<void>} flush
 * @property {() => Promise<Snapshot[]>} snapshots     neueste zuerst
 * @property {(today: string, now: number) => Promise<boolean>} snapshotIfNeeded
 * @property {(day: string) => Promise<boolean>} restoreSnapshot   schreibt den Stand in den Speicher
 * @property {() => Promise<void>} clearSnapshots
 */

/** @param {IDBRequest|IDBTransaction} req */
const done = (req) =>
  new Promise((resolve, reject) => {
    if ('oncomplete' in req && !(req instanceof IDBRequest)) {
      req.oncomplete = () => resolve(undefined);
      req.onerror = () => reject(req.error);
      req.onabort = () => reject(req.error);
    } else {
      /** @type {IDBRequest} */ (req).onsuccess = () => resolve(/** @type {IDBRequest} */ (req).result);
      /** @type {IDBRequest} */ (req).onerror = () => reject(/** @type {IDBRequest} */ (req).error);
    }
  });

/** @returns {Promise<IDBDatabase|null>} */
function openDb() {
  const idb = globalThis.indexedDB;
  if (!idb) return Promise.resolve(null);
  const opening = new Promise((resolve) => {
    try {
      const req = idb.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS, { keyPath: 'day' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  // Manche Browser hängen beim Öffnen (Privat-Fenster): dann ohne Kopie weiter.
  return Promise.race([opening, new Promise((resolve) => setTimeout(() => resolve(null), OPEN_TIMEOUT_MS))]);
}

/** @param {IDBDatabase} db @returns {Promise<RawData>} */
async function readAll(db) {
  const tx = db.transaction(KV, 'readonly');
  const os = tx.objectStore(KV);
  const [keys, values] = await Promise.all([done(os.getAllKeys()), done(os.getAll())]);
  /** @type {RawData} */
  const out = {};
  /** @type {IDBValidKey[]} */ (keys).forEach((k, i) => {
    if (typeof k === 'string' && typeof values[i] === 'string') out[k] = values[i];
  });
  return out;
}

/**
 * Beim Start: IndexedDB öffnen, beide Seiten abgleichen, gespiegelten Adapter liefern.
 * @param {StorageAdapter} primary   meist localStorageAdapter()
 * @returns {Promise<Durable>}
 */
export async function openDurable(primary) {
  const db = await openDb();
  /** @type {Map<string, string|null>} */
  const queue = new Map();
  let timer = 0;
  /** @type {Promise<void>} */
  let writing = Promise.resolve();

  const flush = () => {
    clearTimeout(timer);
    if (!db || !queue.size) return writing;
    const batch = new Map(queue);
    queue.clear();
    writing = writing.then(async () => {
      try {
        const tx = db.transaction(KV, 'readwrite');
        const os = tx.objectStore(KV);
        for (const [key, value] of batch) {
          if (value === null) os.delete(key);
          else os.put(value, key);
        }
        await done(tx);
      } catch {
        /* Kopie fehlgeschlagen: localStorage bleibt maßgeblich */
      }
    });
    return writing;
  };
  const sink = {
    /** @param {string} key @param {string|null} value */
    put(key, value) {
      if (!db) return;
      queue.set(key, value);
      clearTimeout(timer);
      timer = /** @type {any} */ (setTimeout(flush, FLUSH_MS));
    },
  };

  /** @type {Durable['restored']} */
  let restored = 'none';
  if (db) {
    try {
      const mirror = await readAll(db);
      const local = readData(primary);
      restored = planRestore(local, mirror);
      if (restored === 'fromMirror') replaceData(primary, mirror);
      if (restored === 'toMirror') {
        for (const key of Object.keys(mirror)) if (!(key in local)) queue.set(key, null);
        for (const [key, value] of Object.entries(local)) queue.set(key, value);
        await flush();
      }
    } catch {
      restored = 'none';
    }
  }
  // Beim Verlassen sofort sichern (Tab zu, App im Hintergrund).
  globalThis.addEventListener?.('pagehide', () => void flush());
  globalThis.document?.addEventListener?.('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });

  const adapter = mirroredAdapter(primary, sink);

  /** @returns {Promise<Snapshot[]>} */
  const snapshots = async () => {
    if (!db) return [];
    try {
      const list = /** @type {Snapshot[]} */ (await done(db.transaction(SNAPSHOTS, 'readonly').objectStore(SNAPSHOTS).getAll()));
      return list.sort((a, b) => (a.day < b.day ? 1 : -1));
    } catch {
      return [];
    }
  };

  return {
    available: !!db,
    adapter,
    restored,
    flush,
    snapshots,
    async snapshotIfNeeded(today, now) {
      if (!db) return false;
      const list = await snapshots();
      const data = readData(primary);
      delete data[REV_KEY];
      if (!needsSnapshot(list, today) || !hasUserData(data)) return false;
      try {
        const tx = db.transaction(SNAPSHOTS, 'readwrite');
        const os = tx.objectStore(SNAPSHOTS);
        os.put({ day: today, created: new Date(now).toISOString(), data });
        for (const day of pruneSnapshots([...list, { day: today }])) os.delete(day);
        await done(tx);
        return true;
      } catch {
        return false;
      }
    },
    async restoreSnapshot(day) {
      const snap = (await snapshots()).find((s) => s.day === day);
      if (!snap) return false;
      // über den gespiegelten Adapter: IndexedDB bekommt den Stand gleich mit
      for (const key of adapter.keys()) if (isDataKey(key) && !(key in snap.data)) adapter.remove(key);
      for (const [key, value] of Object.entries(snap.data)) adapter.set(key, value);
      await flush();
      return true;
    },
    async clearSnapshots() {
      if (!db) return;
      try {
        const tx = db.transaction(SNAPSHOTS, 'readwrite');
        tx.objectStore(SNAPSHOTS).clear();
        await done(tx);
      } catch {
        /* egal */
      }
    },
  };
}

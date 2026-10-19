/**
 * Sicherung & Wiederherstellung aller v2-Daten als versioniertes JSON.
 *
 * Format v2: { app: "nachtgarten", version: 2, schema, created, data: { <bereich>: wert } }
 * Auch v1-Sicherungen (version 1, data = rohe "lab.*"-Strings) werden gelesen
 * und dabei über `convertV1` ins v2-Modell übersetzt.
 */

import { AREA_NAMES, SCHEMA_VERSION, defaultOf } from '../core/store.js';
import { convertV1 } from './migrate.js';
import { daysBetween, isDateKey } from '../core/dates.js';

/** @typedef {import('../core/store.js').Store} Store */
/** @typedef {import('../core/store.js').AreaName} AreaName */

export const BACKUP_APP = 'nachtgarten';
export const BACKUP_VERSION = 2;

/**
 * @typedef {object} Backup
 * @property {'nachtgarten'} app
 * @property {number} version
 * @property {number} schema
 * @property {string} created
 * @property {Partial<Record<AreaName, unknown>>} data
 */

/**
 * @param {Store} store
 * @param {number} now
 * @returns {Backup}
 */
export function createBackup(store, now) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    schema: SCHEMA_VERSION,
    created: new Date(now).toISOString(),
    data: store.exportAll(),
  };
}

/** @param {string} today */
export const backupFilename = (today) => `nachtgarten-sicherung-${today}.json`;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Passt der Wert zur Grundform des Bereichs (Liste, Objekt, Text, oder null erlaubt)?
 * @param {AreaName} area
 * @param {unknown} value
 */
function fitsArea(area, value) {
  if (area === 'motto') return value === null || typeof value === 'string';
  const fallback = defaultOf(area);
  if (fallback === null) return value === null || isObj(value);
  if (Array.isArray(fallback)) return Array.isArray(value);
  return isObj(value);
}

/**
 * @typedef {{ok: true, created: Date|null, sourceVersion: number, data: Partial<Record<AreaName, unknown>>, areas: number}
 *   | {ok: false, error: 'backup.notJson'|'backup.notNachtgarten'|'backup.tooNew'|'backup.invalidData'}} ParseResult
 */

/**
 * Sicherungsdatei lesen und prüfen. Unbekannte Bereiche werden ignoriert,
 * ein Bereich mit falscher Form macht die Sicherung ungültig.
 * @param {string} text
 * @returns {ParseResult}
 */
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'backup.notJson' };
  }
  if (!isObj(json) || json.app !== BACKUP_APP || !isObj(json.data)) return { ok: false, error: 'backup.notNachtgarten' };

  const created = typeof json.created === 'string' && !Number.isNaN(Date.parse(json.created)) ? new Date(json.created) : null;

  if (json.version === 1) {
    const raw = Object.fromEntries(
      Object.entries(json.data).filter(([k, v]) => k.startsWith('lab.') && typeof v === 'string'),
    );
    const data = convertV1(raw);
    return { ok: true, created, sourceVersion: 1, data, areas: Object.keys(data).length };
  }

  if (typeof json.version !== 'number' || json.version > BACKUP_VERSION || (json.schema ?? 0) > SCHEMA_VERSION) {
    return { ok: false, error: 'backup.tooNew' };
  }

  /** @type {Partial<Record<AreaName, unknown>>} */
  const data = {};
  for (const area of AREA_NAMES) {
    if (!(area in json.data)) continue;
    if (!fitsArea(area, json.data[area])) return { ok: false, error: 'backup.invalidData' };
    data[area] = json.data[area];
  }
  return { ok: true, created, sourceVersion: json.version, data, areas: Object.keys(data).length };
}

/**
 * Sicherung einspielen: ersetzt alle v2-Daten. v1-Daten auf dem Gerät bleiben unberührt,
 * werden aber nicht erneut übernommen (meta.migratedFromV1 wird gesetzt).
 * @param {Store} store
 * @param {Partial<Record<AreaName, unknown>>} data  Ergebnis von parseBackup
 * @param {number} now
 */
export function restoreBackup(store, data, now) {
  store.clearAll();
  store.importAll(data);
  const meta = store.meta.get();
  const stamp = new Date(now).toISOString();
  store.meta.set({
    ...meta,
    schema: SCHEMA_VERSION,
    createdAt: meta.createdAt ?? stamp,
    migratedFromV1: meta.migratedFromV1 ?? stamp,
  });
}

/** Höchstens so oft erinnert „Heute“ an eine Sicherung (Tage). */
export const BACKUP_NUDGE_DAYS = 30;
/** Neue Nutzer bekommen die erste Erinnerung frühestens nach so vielen Tagen. */
export const BACKUP_GRACE_DAYS = 7;

/**
 * Ist eine sanfte Erinnerung „Sicherung machen?“ fällig?
 * Nur mit eigenen Daten (Pläne oder Trainings), höchstens einmal im Monat, nicht in der ersten Woche.
 * @param {{backupAt: string|null, nudgeAt: string|null, createdAt: string|null, today: string, hasData: boolean}} input
 */
export function backupDue({ backupAt, nudgeAt, createdAt, today, hasData }) {
  if (!hasData) return false;
  const since = (/** @type {string|null} */ day) => (day && isDateKey(day) ? daysBetween(day, today) : Infinity);
  const created = createdAt ? String(createdAt).slice(0, 10) : null;
  if (since(created) < BACKUP_GRACE_DAYS) return false;
  return since(backupAt) >= BACKUP_NUDGE_DAYS && since(nudgeAt) >= BACKUP_NUDGE_DAYS;
}

/**
 * Module und Kacheln auf „Heute“ – die reine Logik hinter der Modul-Registry
 * (src/features/registry.js).
 *
 * - Ein Modul (Training, Weniger Handy, Schwangerschaft & Rückbildung, Gewohnheiten,
 *   Ideen-Labor, später z. B. „Aufhören“) ist an oder aus. Aus heißt: komplett unsichtbar.
 * - `enabledModules: null` heißt „noch nicht gefragt“ und verhält sich wie der Standard.
 * - Der letzte eingeschaltete Modul bleibt immer an (eine leere App hilft niemandem).
 * - `tileOrder` speichert die gewünschte Reihenfolge der Kacheln; neue Kacheln, die dort
 *   noch nicht stehen, erscheinen an ihrer Standard-Position hinter den sortierten.
 */

/** Module, die ohne Auswahl eingeschaltet sind. */
export const DEFAULT_MODULES = Object.freeze(['train', 'habits']);

/**
 * Gültige, eindeutige Module in der Reihenfolge der bekannten Module.
 * @param {string[]|null|undefined} enabled
 * @param {readonly string[]} known      registrierte Modul-Ids, in Anzeigereihenfolge
 * @param {readonly string[]} [defaults]
 * @returns {string[]}
 */
export function normalizeModules(enabled, known, defaults = DEFAULT_MODULES) {
  const set = new Set(Array.isArray(enabled) ? enabled : []);
  const out = known.filter((id) => set.has(id));
  if (out.length) return out;
  const fallback = known.filter((id) => defaults.includes(id));
  return fallback.length ? fallback : known.slice(0, 1);
}

/**
 * Modul an- oder ausschalten. Das letzte bleibt an.
 * @param {string[]|null|undefined} enabled
 * @param {string} id
 * @param {readonly string[]} known
 * @returns {string[]}
 */
export function toggleModule(enabled, id, known) {
  const cur = normalizeModules(enabled, known);
  if (!known.includes(id)) return cur;
  if (!cur.includes(id)) return normalizeModules([...cur, id], known);
  return cur.length > 1 ? cur.filter((x) => x !== id) : cur;
}

/**
 * Ist mindestens eines der Module an?
 * @param {string[]} enabled  bereits normalisiert
 * @param {readonly string[]} modules
 */
export const anyEnabled = (enabled, modules) => modules.some((m) => enabled.includes(m));

/**
 * Kachel-Ids nach gespeicherter Reihenfolge sortieren (stabil).
 * @param {readonly string[]} ids         sichtbare Kacheln in Standard-Reihenfolge
 * @param {readonly string[]} tileOrder
 * @returns {string[]}
 */
export function orderTiles(ids, tileOrder) {
  const rank = (id, i) => {
    const r = tileOrder.indexOf(id);
    return r >= 0 ? r : tileOrder.length + i;
  };
  return ids
    .map((id, i) => ({ id, r: rank(id, i), i }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.id);
}

/**
 * Kachel um eine Position verschieben. Liefert die neue `tileOrder`: sichtbare Kacheln in
 * neuer Reihenfolge, dahinter gemerkte Positionen gerade unsichtbarer Kacheln.
 * @param {readonly string[]} visible   aktuell sichtbare Kacheln, bereits sortiert
 * @param {readonly string[]} tileOrder bisher gespeicherte Reihenfolge
 * @param {string} id
 * @param {-1|1} delta
 * @returns {string[]}
 */
export function moveTile(visible, tileOrder, id, delta) {
  const list = [...visible];
  const i = list.indexOf(id);
  const j = i + delta;
  if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  return [...list, ...tileOrder.filter((t) => !list.includes(t))];
}

/**
 * Wohin „Sport starten“ führt: mit Schwangerschaft & Rückbildung zum Wochenplan,
 * sonst ins Live-Training; ohne Sport-Modul nirgends hin.
 * @param {string[]} enabled  bereits normalisiert
 * @returns {'live'|'mama'|null}
 */
export function sportTarget(enabled) {
  if (enabled.includes('mama')) return 'mama';
  if (enabled.includes('train')) return 'live';
  return null;
}

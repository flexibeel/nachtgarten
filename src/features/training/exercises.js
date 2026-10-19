/**
 * Übungen nachschlagen: kuratierte Bibliothek, offene Datenbank (wird bei Bedarf geladen),
 * eigene/übernommene Übungen aus dem Speicher und allgemeine Plan-Übungen (g_…).
 * Liefert immer das v2-Format {id, name, gear, muscles, attachment?, cues?, en?, source?}.
 *
 * TODO(i18n): Die deutschen Übersetzungen eines anderen Arbeitsstrangs liegen unter
 * src/data/i18n/ (exercises.de.names.json, Schlüssel = englischer Name mit „_“ statt Leerzeichen,
 * Anleitungen in exercises.de.cNN.json). Sobald sie committet sind, hier in `dbExercise`
 * einhängen; bis dahin gelten die deutschen Namen und Hinweise aus v1 (data/exercise-db.js).
 */

import { CURATED } from '../../data/library.js';
import { PLAN_EXERCISES } from '../../data/plans.js';
import { G_MAP } from '../../data/plan-exercise-map.js';
import { getLang } from '../../data/texts/i18n.js';

/** @typedef {import('../../core/store.js').Exercise & {cues?: string[], en?: string, pop?: boolean, db?: number, pattern?: string}} LibExercise */

/** @type {typeof import('../../data/exercise-db.js')|null} */
let DB = null;
/** @type {Promise<unknown>|null} */
let loading = null;

/** Offene Datenbank laden (einmal). */
export function loadDb() {
  if (DB) return Promise.resolve(DB);
  loading ??= import('../../data/exercise-db.js').then((m) => (DB = m));
  return loading;
}
export const dbReady = () => !!DB;

const byId = new Map(CURATED.map((e) => [e.id, e]));

/**
 * @param {number} index
 * @returns {LibExercise|undefined}
 */
function dbExercise(index) {
  const row = DB?.EXDB[index];
  if (!row) return undefined;
  const [en, g, m, att, de, cues] = row;
  /** @type {LibExercise} */
  const ex = {
    id: `db${index}`,
    name: getLang() === 'en' ? en : de,
    en,
    gear: DB.GEAR_CODES[g] ?? 'Sonstiges',
    muscles: [...m].map((c) => DB.MUSCLE_CODES[c]).filter(Boolean),
    cues,
    source: 'db',
    db: index,
  };
  if (att) ex.attachment = att;
  return ex;
}

/**
 * Übung zu einer Id. Unbekanntes (z. B. Datenbank noch nicht geladen) → undefined.
 * @param {{store: import('../../core/store.js').Store}} ctx
 * @param {string} id
 * @returns {LibExercise|undefined}
 */
export function findExercise(ctx, id) {
  const cur = byId.get(id);
  if (cur) {
    const fromDb = cur.db != null && DB ? DB.EXDB[cur.db] : null;
    return { ...cur, muscles: [...cur.muscles], en: fromDb?.[0] };
  }
  if (/^db\d+$/.test(id)) {
    const ex = dbExercise(Number(id.slice(2)));
    if (ex) return ex;
  }
  const own = ctx.store.exercises.get().custom.find((c) => c.id === id);
  if (own) return /^db\d+$/.test(id) && DB ? dbExercise(Number(id.slice(2))) ?? own : own;
  const plan = PLAN_EXERCISES[id];
  if (plan) {
    const link = G_MAP[id];
    const target = link?.to ? findExercise(ctx, link.to) : undefined;
    return {
      id,
      name: plan.name,
      gear: plan.gear,
      muscles: [...plan.muscles],
      cues: link?.cues ?? target?.cues,
      pattern: plan.pattern,
      source: 'plan',
    };
  }
  return undefined;
}

/**
 * Nachschlagefunktion für die Domain (training.js), mit Rückfall auf einen Platzhalter.
 * @param {{store: import('../../core/store.js').Store}} ctx
 */
export const exerciseLookup = (ctx) => (/** @type {string} */ id) => findExercise(ctx, id) ?? { id, name: id, gear: 'Sonstiges', muscles: [] };

/** Alle kuratierten Übungen (für Listen). */
export const curatedList = () => CURATED;

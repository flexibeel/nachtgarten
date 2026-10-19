/**
 * Der Begleiter als Daten: Art und Name stehen im Profil (`profile.companion`),
 * Ton, an/aus und Wachstum im Bereich `buddy`.
 */

import { speciesInfo } from '../data/companions.js';

/** @typedef {import('../core/store.js').Profile} Profile */
/** @typedef {import('../core/store.js').Companion} Companion */

export const COMPANION_NAME_MAX = 16;

/**
 * Begleiter aus dem Profil, mit Rückfall auf Art und Namen des Standards.
 * @param {Profile|null} profile
 * @returns {Companion}
 */
export function companionOf(profile) {
  const species = speciesInfo(profile?.companion?.species);
  const name = String(profile?.companion?.name ?? '').trim().slice(0, COMPANION_NAME_MAX);
  return { species: species.id, name: name || species.defaultName };
}

/**
 * Begleiter ändern; leerer Name → Standardname der Art.
 * @param {Profile|null} profile
 * @param {Partial<Companion>} patch
 * @returns {Companion}
 */
export function withCompanion(profile, patch) {
  return companionOf({ ...(profile ?? {}), companion: { ...companionOf(profile), ...patch } });
}

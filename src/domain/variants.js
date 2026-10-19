/**
 * Varianten einer Übung (Gerät/Maschine) – reine Logik über data/variants.js.
 * Gewählte Variante je Gruppe merkt sich `exercises.variants` (Gruppe → Id); ein Plan, der
 * „Beinpresse“ sagt, startet dann gleich an der Maschine, die man zuletzt benutzt hat.
 */

import { VARIANT_GROUPS } from '../data/variants.js';

/** @typedef {import('../data/variants.js').Variant} Variant */
/** @typedef {import('../data/variants.js').VariantGroup} VariantGroup */

const BY_ID = new Map(VARIANT_GROUPS.flatMap((g) => g.variants.map((v) => [v.id, { group: g, variant: v }])));

/** Abgeleitete Id („press~horizontal“)? @param {string} id */
export const isDerived = (id) => typeof id === 'string' && id.includes('~');
/** Basis einer abgeleiteten Id („press“). @param {string} id */
export const baseOf = (id) => (isDerived(id) ? id.slice(0, id.indexOf('~')) : id);

/**
 * Gruppe und Variante zu einer Übung (null = keine Varianten).
 * @param {string} id
 * @param {readonly VariantGroup[]} [groups]
 * @returns {{group: VariantGroup, variant: Variant}|null}
 */
export function variantOf(id, groups = VARIANT_GROUPS) {
  if (groups === VARIANT_GROUPS) return BY_ID.get(id) ?? null;
  for (const group of groups) {
    const variant = group.variants.find((v) => v.id === id);
    if (variant) return { group, variant };
  }
  return null;
}

/**
 * Alle Varianten derselben Gruppe (inkl. der Übung selbst), leer ohne Gruppe.
 * @param {string} id
 * @returns {Variant[]}
 */
export const siblingsOf = (id) => variantOf(id)?.group.variants ?? [];

/**
 * Bevorzugte Variante: die zuletzt gewählte der Gruppe, sonst die Übung selbst.
 * @param {string} id
 * @param {Record<string, string>} [chosen]   Gruppe → Id
 */
export function preferredVariant(id, chosen = {}) {
  const hit = variantOf(id);
  if (!hit) return id;
  const pick = chosen[hit.group.id];
  return pick && hit.group.variants.some((v) => v.id === pick) ? pick : id;
}

/**
 * Wahl merken.
 * @param {Record<string, string>} chosen
 * @param {string} id
 * @returns {Record<string, string>}
 */
export function rememberVariant(chosen, id) {
  const hit = variantOf(id);
  return hit ? { ...chosen, [hit.group.id]: id } : chosen;
}

/**
 * Plan-Warteschlange auf die bevorzugten Varianten umstellen (Plan selbst bleibt unverändert).
 * @template {{items: {exercise: string}[]}} Q
 * @param {Q} queue
 * @param {Record<string, string>} chosen
 * @returns {Q}
 */
export function applyVariants(queue, chosen) {
  return { ...queue, items: queue.items.map((it) => ({ ...it, exercise: preferredVariant(it.exercise, chosen) })) };
}

/**
 * Variante im laufenden Training wechseln: Eintrag der Warteschlange zeigt auf die neue Id.
 * @template {{items: {exercise: string}[]}} Q
 * @param {Q} queue
 * @param {string} from
 * @param {string} to
 * @returns {Q}
 */
export function swapInQueue(queue, from, to) {
  return { ...queue, items: queue.items.map((it) => (it.exercise === from ? { ...it, exercise: to } : it)) };
}

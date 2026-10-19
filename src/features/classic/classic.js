/**
 * Brücke zur klassischen Version (v1 unter /klassisch/): Was die neue Version noch nicht kann,
 * öffnet dort an der passenden Stelle. Beide liegen auf demselben Ursprung, die klassische
 * Version liest weiter ihre eigenen Einträge (lab.*).
 *
 * Wo die klassische Version liegt, steht im Kopf von index.html (<meta name="ng-classic">):
 * „klassisch/“ in der App, „../klassisch/“ in der Beta (scripts/deploy-beta.py).
 */

import { t } from '../../data/texts/i18n.js';
import { h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';

/** Rückfall ohne Meta-Angabe (z. B. lokale Entwicklung). */
export const CLASSIC_FALLBACK = 'https://flexibeel.github.io/nachtgarten/klassisch/';

/** Direktsprünge der klassischen Version (ROUTES in v1). */
export const CLASSIC_ROUTES = Object.freeze(['heute', 'training', 'live', 'mama', 'umlenken', 'feed', 'kurz', 'ruecken', 'ideen']);

/**
 * Adresse der klassischen Version, optional mit Direktsprung.
 * @param {string} [hash]       z. B. „feed“
 * @param {{base?: string|null, href?: string}} [where]   für Tests
 */
export function classicUrl(hash, where = {}) {
  const base = where.base !== undefined ? where.base : globalThis.document?.querySelector('meta[name="ng-classic"]')?.getAttribute('content');
  const href = where.href ?? globalThis.location?.href ?? CLASSIC_FALLBACK;
  let url;
  try {
    url = new URL(base || CLASSIC_FALLBACK, href);
  } catch {
    url = new URL(CLASSIC_FALLBACK);
  }
  url.hash = hash && CLASSIC_ROUTES.includes(hash) ? hash : '';
  return url.href;
}

/**
 * Freundliche Karte: „Kommt gleich in der neuen Version. Bis dahin: [In der klassischen Version öffnen]“.
 * @param {{hash: string, what?: string, compact?: boolean}} options   what: optionaler Satz, was dort wartet
 * @returns {HTMLElement}
 */
export function classicCard({ hash, what, compact = false }) {
  return h(
    'section',
    { class: ['card', 'card-soft', 'classic-card', compact && 'classic-card-compact'], 'data-classic': hash },
    h('p', { class: 'classic-title', text: t('classic.title') }),
    what ? h('p', { class: 'classic-what', text: what }) : null,
    h('p', { class: 'classic-lead', text: t('classic.lead') }),
    h(
      'a',
      { class: 'button button-quiet button-wide classic-open', href: classicUrl(hash) },
      h('span', { text: t('classic.open') }),
      icon('chevronRight', { size: 20 }),
    ),
    h('p', { class: 'classic-note', text: t('classic.note') }),
  );
}

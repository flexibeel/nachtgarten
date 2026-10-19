/**
 * Feste Aktionsleiste am unteren Rand (über der Home-Leiste, Safe-Area beachtet).
 * Solange sie sichtbar ist, bekommt die Ansicht unten genug Platz.
 */

import { h } from './dom.js';

/**
 * @param {...import('./dom.js').Child} children
 */
export function actionBar(...children) {
  return h('div', { class: 'action-bar', 'data-toast-avoid': '' }, h('div', { class: 'action-bar-inner' }, children));
}

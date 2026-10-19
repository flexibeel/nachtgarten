/**
 * Teil eines Bildschirms, der sich bei Speicher-Änderungen selbst neu zeichnet.
 */

import { h } from '../ui/dom.js';

/** @typedef {import('./context.js').AppContext} AppContext */

/**
 * @typedef {object} Part
 * @property {HTMLElement|null} el
 * @property {() => void} [destroy]
 * @property {() => void} [repaint]
 */

/**
 * Baustein, der sich bei Änderungen der genannten Bereiche neu zeichnet.
 * @param {AppContext} ctx
 * @param {import('../core/store.js').AreaName[]} areas
 * @param {(el: HTMLElement) => void} paint
 * @param {string} [className]
 * @returns {Part}
 */
export function reactivePart(ctx, areas, paint, className = 'part') {
  const el = h('div', { class: className });
  const repaint = () => paint(el);
  repaint();
  const off = ctx.watch(areas, repaint);
  return { el, destroy: off, repaint };
}

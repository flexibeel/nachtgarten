/**
 * Karte und Abschnitt. Karten bündeln Zusammengehöriges, das man bedient;
 * Abschnitte ohne Fläche gliedern ruhige Inhalte.
 */

import { h } from './dom.js';
import { icon } from './icons.js';

/**
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.icon]
 * @param {Node|null} [options.action]   kleiner Knopf rechts im Kopf
 * @param {'card'|'soft'|'plain'} [options.variant]
 * @param {string} [options.className]
 * @param {string} [options.id]
 * @param {...import('./dom.js').Child} children
 */
export function card({ title, icon: iconName, action = null, variant = 'card', className, id } = {}, ...children) {
  const head = title
    ? h('header', { class: 'card-head' }, iconName ? h('span', { class: 'card-icon' }, icon(iconName, { size: 20 })) : null, h('h2', { class: 'card-title', text: title }), action)
    : null;
  return h('section', { class: ['card', `card-${variant}`, className], id }, head, children);
}

/**
 * Kleiner Text-Knopf im Kartenkopf.
 * @param {string} label
 * @param {() => void} onClick
 * @param {string} [iconName]
 */
export function cardAction(label, onClick, iconName) {
  return h(
    'button',
    { type: 'button', class: ['card-action', iconName && 'has-icon'], 'aria-label': iconName ? label : null, on: { click: onClick } },
    iconName ? icon(iconName, { size: 20 }) : label,
  );
}

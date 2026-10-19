/**
 * Kachel: kleiner Sprung in einen Bereich (Icon, Titel, eine Zeile).
 */

import { h } from './dom.js';
import { icon } from './icons.js';

/**
 * @param {{href: string, icon: string, title: string, sub: string}} options
 */
export const linkTile = ({ href, icon: iconName, title, sub }) =>
  h(
    'a',
    { class: 'tile', href },
    h('span', { class: 'tile-icon' }, icon(iconName, { size: 22 })),
    h('span', { class: 'tile-title', text: title }),
    h('span', { class: 'tile-sub', text: sub }),
  );

/**
 * Modul „Weniger Handy“: Tab Fokus (Umlenken & Zeitkonto), langsamer Feed, zwei Kacheln.
 */

import { linkTile } from '../../ui/tile.js';
import { placeholder } from '../placeholder/placeholder.js';

/** @param {string} href @param {string} icon @param {string} title @param {string} sub */
const staticTile = (href, icon, title, sub) => () => ({ el: linkTile({ href, icon, title, sub }) });

/** @type {import('../registry.js').ModuleDef} */
export const focusModule = {
  id: 'handy',
  label: 'Weniger Handy',
  hint: 'Umlenken statt scrollen',
  icon: 'phone',
  views: [
    {
      route: 'fokus',
      title: 'Fokus',
      tab: { label: 'Fokus', icon: 'fokus' },
      aliases: ['umlenken'],
      mount: placeholder({ title: 'Fokus', intro: 'Hier lenkst du bald den Griff zum Handy um – hin zu Menschen und Dingen, die dir guttun.' }),
    },
    {
      route: 'feed',
      title: 'Langsamer Feed',
      chrome: 'bare',
      tabOf: 'fokus',
      mount: placeholder({ title: 'Langsamer Feed', intro: 'Hier liest du bald wenige, gute Texte statt endlos zu scrollen.', back: true }),
    },
  ],
  tiles: [
    { id: 'umlenken', title: 'Umlenken', render: staticTile('#umlenken', 'phone', 'Umlenken', 'Statt zu scrollen'), size: 'small' },
    { id: 'feed', title: 'Langsamer Feed', render: staticTile('#feed', 'feed', 'Langsamer Feed', 'Wenig, aber gut'), size: 'small' },
  ],
};

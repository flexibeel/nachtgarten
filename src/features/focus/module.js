/**
 * Modul „Weniger Handy“: Tab Fokus (Umlenken & Zeitkonto), langsamer Feed, zwei Kacheln.
 */

import { t } from '../../data/texts/i18n.js';
import { linkTile } from '../../ui/tile.js';
import { placeholder } from '../placeholder/placeholder.js';

/** @param {string} href @param {string} icon @param {string} titleKey @param {string} subKey */
const staticTile = (href, icon, titleKey, subKey) => () => ({ el: linkTile({ href, icon, title: t(titleKey), sub: t(subKey) }) });

/** @type {import('../registry.js').ModuleDef} */
export const focusModule = {
  id: 'handy',
  labelKey: 'module.handy.label',
  hintKey: 'module.handy.hint',
  icon: 'phone',
  views: [
    { route: 'fokus', titleKey: 'view.fokus', tab: { labelKey: 'tab.fokus', icon: 'fokus' }, aliases: ['umlenken'], mount: placeholder('fokus') },
    { route: 'feed', titleKey: 'view.feed', chrome: 'bare', tabOf: 'fokus', mount: placeholder('feed', { back: true }) },
  ],
  tiles: [
    { id: 'umlenken', titleKey: 'tile.umlenken', render: staticTile('#umlenken', 'phone', 'tile.umlenken', 'tile.umlenkenSub'), size: 'small' },
    { id: 'feed', titleKey: 'tile.feed', render: staticTile('#feed', 'feed', 'tile.feed', 'tile.feedSub'), size: 'small' },
  ],
};

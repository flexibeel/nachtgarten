/**
 * Modul „Weniger Handy“ (Id `handy`, so auch in gespeicherten Einstellungen und der v1-Übernahme):
 * Tab Fokus mit „Wirklich jetzt?“ (#umlenken?von=instagram), Zeitkonto und Einrichtung,
 * langsamer Feed, zwei Kacheln.
 */

import { t } from '../../data/texts/i18n.js';
import { weekStats } from '../../domain/gate.js';
import { linkTile } from '../../ui/tile.js';
import { replace } from '../../ui/dom.js';
import { placeholder } from '../placeholder/placeholder.js';
import { reactivePart } from '../part.js';
import { mountFokus } from './umlenken.js';

/** @param {string} href @param {string} icon @param {string} titleKey @param {string} subKey */
const staticTile = (href, icon, titleKey, subKey) => () => ({ el: linkTile({ href, icon, title: t(titleKey), sub: t(subKey) }) });

/** @param {import('../context.js').AppContext} ctx */
const umlenkenTile = (ctx) =>
  reactivePart(ctx, ['gate'], (el) => {
    const { redirected } = weekStats(ctx.store.gate.get(), ctx.now());
    replace(el, linkTile({ href: '#fokus', icon: 'phone', title: t('tile.umlenken'), sub: redirected ? t('gate.weekStat', { count: redirected }) : t('tile.umlenkenSub') }));
  }, 'tile-slot');

/** @type {import('../registry.js').ModuleDef} */
export const focusModule = {
  id: 'handy',
  labelKey: 'module.handy.label',
  hintKey: 'module.handy.hint',
  icon: 'phone',
  views: [
    { route: 'fokus', titleKey: 'view.fokus', tab: { labelKey: 'tab.fokus', icon: 'fokus' }, aliases: ['umlenken'], mount: mountFokus },
    { route: 'feed', titleKey: 'view.feed', chrome: 'bare', tabOf: 'fokus', mount: placeholder('feed', { back: true, classic: 'feed' }) },
  ],
  tiles: [
    { id: 'umlenken', titleKey: 'tile.umlenken', render: umlenkenTile, size: 'small' },
    { id: 'feed', titleKey: 'tile.feed', render: staticTile('#feed', 'feed', 'tile.feed', 'tile.feedSub'), size: 'small' },
  ],
};

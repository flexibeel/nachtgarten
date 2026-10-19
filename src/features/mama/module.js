/**
 * Modul „Schwangerschaft & Rückbildung“: Tab Mama und eine Kachel mit SSW bzw. Wochen
 * nach der Geburt. „Sport starten“ führt dann zum Plan der Woche (training/module.js).
 */

import { mamaStatus } from '../../domain/pregnancy.js';
import { t } from '../../data/texts/i18n.js';
import { replace } from '../../ui/dom.js';
import { linkTile } from '../../ui/tile.js';
import { reactivePart } from '../part.js';
import { placeholder } from '../placeholder/placeholder.js';
import { statusLabel } from './status.js';

/** @param {import('../context.js').AppContext} ctx */
const statusTile = (ctx) =>
  reactivePart(
    ctx,
    ['mama'],
    (el) => {
      const status = mamaStatus(ctx.store.mama.get(), ctx.today());
      replace(
        el,
        linkTile({
          href: '#mama',
          icon: 'mama',
          title: status ? statusLabel(status) : t('mama.title'),
          sub: t(status ? 'mama.tileSub' : 'mama.tileMissing'),
        }),
      );
    },
    'tile-slot',
  );

/** @type {import('../registry.js').ModuleDef} */
export const mamaModule = {
  id: 'mama',
  labelKey: 'module.mama.label',
  hintKey: 'module.mama.hint',
  icon: 'mama',
  views: [{ route: 'mama', titleKey: 'view.mama', tab: { labelKey: 'tab.mama', icon: 'mama' }, mount: placeholder('mama') }],
  tiles: [{ id: 'mama', titleKey: 'tile.mama', render: statusTile, size: 'small' }],
};

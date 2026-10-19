/**
 * Modul „Schwangerschaft & Rückbildung“: Tab Mama und eine Kachel mit SSW bzw. Wochen
 * nach der Geburt. „Sport starten“ führt dann zum Plan der Woche (training/module.js).
 */

import { mamaStatus } from '../../domain/pregnancy.js';
import { replace } from '../../ui/dom.js';
import { linkTile } from '../../ui/tile.js';
import { reactivePart } from '../part.js';
import { placeholder } from '../placeholder/placeholder.js';

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
          title: status?.label ?? 'Schwangerschaft & Rückbildung',
          sub: status ? 'Dein Wochenplan' : 'Angaben im Profil ergänzen',
        }),
      );
    },
    'tile-slot',
  );

/** @type {import('../registry.js').ModuleDef} */
export const mamaModule = {
  id: 'mama',
  label: 'Schwangerschaft & Rückbildung',
  hint: 'Sanfte Pläne passend zur Woche',
  icon: 'mama',
  views: [
    {
      route: 'mama',
      title: 'Schwangerschaft & Rückbildung',
      tab: { label: 'Mama', icon: 'mama' },
      mount: placeholder({ title: 'Schwangerschaft & Rückbildung', intro: 'Hier bekommst du bald jede Woche einen sanften Plan, passend zu dir.' }),
    },
  ],
  tiles: [{ id: 'mama', title: 'Schwangerschaft & Rückbildung', render: statusTile, size: 'small' }],
};

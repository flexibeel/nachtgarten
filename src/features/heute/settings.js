/**
 * Unten auf „Heute“: Startansicht, Design und deine Daten.
 */

import { h } from '../../ui/dom.js';
import { card } from '../../ui/card.js';
import { privacyPanel } from '../privacy/privacy.js';
import { languageControl, startViewControl, themeControl } from '../settings/controls.js';
import { t } from '../../data/texts/i18n.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** @param {AppContext} ctx */
export function settingsPart(ctx) {
  const theme = themeControl(ctx);
  const start = startViewControl(ctx);
  const lang = languageControl(ctx);
  const el = h(
    'div',
    { class: 'heute-settings' },
    card({ title: t('settings.title'), className: 'settings' }, start.el, theme.el, lang.el),
    card({ title: t('data.title'), icon: 'shield', variant: 'plain', className: 'data', id: 'daten' }, privacyPanel(ctx)),
  );
  return {
    el,
    destroy: () => {
      theme.destroy();
      start.destroy();
    },
  };
}

/**
 * Freundlicher Platzhalter für Bereiche, die in einer späteren Etappe gebaut werden.
 */

import { t } from '../../data/texts/i18n.js';
import { append, h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { companionFigure } from '../../ui/companion.js';
import { companionStage, isPlain } from '../companion/companion-state.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/**
 * Ansicht mit Titel `view.<route>` und Satz `placeholder.<route>`.
 * @param {string} route
 * @param {{back?: boolean}} [options]   back: „Heute“-Link oben (für Ansichten ohne Tab-Leiste)
 * @returns {(ctx: AppContext, view: HTMLElement) => void}
 */
export const placeholder = (route, { back = false } = {}) => (ctx, view) => {
  const { species, name } = ctx.companion();
  append(view, [
    back ? h('a', { class: 'back-link', href: '#heute' }, icon('arrowLeft', { size: 20 }), h('span', { text: t('tab.heute') })) : null,
    h(
      'div',
      { class: 'placeholder' },
      isPlain(ctx) ? null : h('div', { class: 'placeholder-figure' }, companionFigure({ species, mood: 'calm', stage: companionStage(ctx), label: name })),
      h('h1', { class: 'placeholder-title', text: t(`view.${route}`) }),
      h('p', { class: 'placeholder-intro', text: t(`placeholder.${route}`) }),
      isPlain(ctx) ? null : h('p', { class: 'placeholder-note', text: t('placeholder.note', { name }) }),
      h('a', { class: 'button button-quiet', href: '#heute', text: t('placeholder.toHeute') }),
    ),
  ]);
};

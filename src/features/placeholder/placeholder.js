/**
 * Freundlicher Platzhalter für Bereiche, die in einer späteren Etappe gebaut werden.
 */

import { append, h } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { companionFigure } from '../../ui/companion.js';
import { companionStage } from '../companion/companion-state.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/**
 * @typedef {object} PlaceholderSpec
 * @property {string} title
 * @property {string} intro     ein Satz, was hier entsteht
 * @property {boolean} [back]   „Zurück“-Knopf oben (für Ansichten ohne Tab-Leiste)
 */

/**
 * @param {PlaceholderSpec} spec
 * @returns {(ctx: AppContext, view: HTMLElement) => void}
 */
export const placeholder = ({ title, intro, back = false }) => (ctx, view) => {
  const { species, name } = ctx.companion();
  append(view, [
    back
      ? h(
          'a',
          { class: 'back-link', href: '#heute' },
          icon('arrowLeft', { size: 20 }),
          h('span', { text: 'Heute' }),
        )
      : null,
    h(
      'div',
      { class: 'placeholder' },
      h('div', { class: 'placeholder-figure' }, companionFigure({ species, mood: 'calm', stage: companionStage(ctx), label: name })),
      h('h1', { class: 'placeholder-title', text: title }),
      h('p', { class: 'placeholder-intro', text: intro }),
      h('p', { class: 'placeholder-note', text: `Kommt in der nächsten Etappe. ${name} freut sich schon darauf.` }),
      h('a', { class: 'button button-quiet', href: '#heute', text: 'Zu Heute' }),
    ),
  ]);
};

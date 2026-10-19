/**
 * „Eine Sache heute“: ein Satz für den Tag, abhakbar. Am nächsten Tag ist das Feld leer.
 */

import { haptic } from '../../core/platform.js';
import { FOCUS_MAX_LENGTH, currentFocus, setFocus, toggleFocusDone } from '../../domain/today.js';
import { h, replace } from '../../ui/dom.js';
import { card, cardAction } from '../../ui/card.js';
import { icon } from '../../ui/icons.js';
import { inlineForm } from '../../ui/fields.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** @param {AppContext} ctx */
export function focusPart(ctx) {
  let editing = false;
  const part = reactivePart(
    ctx,
    ['focus'],
    (el) => {
      const today = ctx.today();
      const focus = currentFocus(ctx.store.focus.get(), today);
      const save = (value) => {
        editing = false;
        ctx.store.focus.set(setFocus(value, today));
      };

      if (!focus.text || editing) {
        const form = inlineForm({
          label: 'Eine Sache heute',
          placeholder: 'Was ist heute wirklich wichtig?',
          buttonLabel: 'Festhalten',
          maxlength: FOCUS_MAX_LENGTH,
          value: focus.text,
          onSubmit: save,
        });
        replace(el, card({ title: 'Eine Sache heute', className: 'one-thing' }, form));
        if (editing) requestAnimationFrame(() => form.input.focus());
        return;
      }

      const toggle = h(
        'button',
        {
          type: 'button',
          class: ['one-thing-check', focus.done && 'is-done'],
          role: 'checkbox',
          'aria-checked': String(focus.done),
          'aria-label': `Erledigt: ${focus.text}`,
          on: {
            click: () => {
              haptic(focus.done ? 'tap' : 'success');
              ctx.store.focus.set(toggleFocusDone(ctx.store.focus.get(), today));
            },
          },
        },
        h('span', { class: 'check-circle', 'aria-hidden': 'true' }, icon('check', { size: 18 })),
        h('span', { class: 'one-thing-text', text: focus.text }),
      );
      const edit = cardAction(
        'Ändern',
        () => {
          editing = true;
          part.repaint?.();
        },
        'edit',
      );
      replace(el, card({ title: 'Eine Sache heute', className: ['one-thing', focus.done && 'is-done'].filter(Boolean).join(' '), action: edit }, toggle));
    },
    'heute-one-thing',
  );
  return part;
}

/**
 * Gewohnheit mit Wenn-Dann-Anker („Nach dem Frühstück: 10 Min. lesen“) und Wochenpunkten.
 */

import { haptic } from '../../core/platform.js';
import { ANCHORS, anchorSentence, habitMessage, toggleDay, weekDots } from '../../domain/habits.js';
import { text } from '../../data/texts/de.js';
import { h, replace } from '../../ui/dom.js';
import { card, cardAction } from '../../ui/card.js';
import { chipGroup } from '../../ui/chips.js';
import { textField } from '../../ui/fields.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const LONG_DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const NAME_MAX = 40;

/**
 * Gewohnheit bearbeiten: Name und fester Moment.
 * @param {AppContext} ctx
 */
export function openHabitSheet(ctx) {
  const habit = ctx.store.habit.get();
  let name = habit.name;
  let anchor = habit.anchor;
  const nameField = textField({ label: 'Was willst du regelmäßig tun?', value: name, maxlength: NAME_MAX, placeholder: 'z. B. 10 Min. lesen', onInput: (v) => (name = v) });
  const anchors = chipGroup({
    label: 'Wann genau?',
    options: ANCHORS.map((a) => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) })),
    selected: anchor ? [anchor] : [],
    onChange: ([v]) => (anchor = v ?? null),
  });
  const save = h('button', { type: 'button', class: 'button button-primary button-wide', text: 'Speichern' });
  const sheet = openSheet({
    title: 'Deine Gewohnheit',
    content: [
      nameField,
      h('div', { class: 'field' }, h('p', { class: 'field-label', text: 'Wann genau?' }), anchors, h('p', { class: 'field-hint', text: 'Ein fester Moment im Alltag macht es leichter. Wenn das passiert, dann mache ich es.' })),
    ],
    actions: save,
  });
  save.addEventListener('click', () => {
    const trimmed = name.trim();
    ctx.store.habit.update((cur) => ({ ...cur, name: trimmed || cur.name, anchor }));
    haptic('success');
    sheet.close('save');
    toast('Gewohnheit gespeichert');
  });
}

/** @param {AppContext} ctx */
export function habitPart(ctx) {
  return reactivePart(
    ctx,
    ['habit'],
    (el) => {
      const habit = ctx.store.habit.get();
      const now = ctx.now();
      const sentence = anchorSentence(habit);
      const message = habitMessage(habit, now);
      const dots = h(
        'div',
        { class: 'habit-days', role: 'group', 'aria-label': 'Diese Woche' },
        weekDots(habit, now).map((d, i) =>
          h(
            'button',
            {
              type: 'button',
              class: ['habit-day', d.done && 'is-done', d.today && 'is-today'],
              'aria-pressed': String(d.done),
              'aria-label': `${LONG_DAYS[i]}${d.today ? ' (heute)' : ''}`,
              disabled: d.future,
              on: {
                click: () => {
                  haptic(d.done ? 'tap' : 'success');
                  ctx.store.habit.set(toggleDay(ctx.store.habit.get(), d.key, ctx.now()));
                },
              },
            },
            h('span', { class: 'habit-dot', 'aria-hidden': 'true' }, d.done ? icon('check', { size: 14 }) : null),
            h('span', { class: 'habit-label', 'aria-hidden': 'true', text: d.label }),
          ),
        ),
      );
      const anchorLine = sentence
        ? h('p', { class: 'habit-anchor', text: sentence })
        : h('button', { type: 'button', class: 'link-button', text: text('habit.noAnchor'), on: { click: () => openHabitSheet(ctx) } });
      replace(
        el,
        card(
          { title: sentence ? 'Gewohnheit' : habit.name, className: 'habit', action: cardAction('Gewohnheit bearbeiten', () => openHabitSheet(ctx), 'edit') },
          anchorLine,
          dots,
          h('p', { class: 'habit-message', text: text(message.key, message.params) }),
        ),
      );
    },
    'heute-habit',
  );
}

/**
 * Gewohnheit mit Wenn-Dann-Anker („Nach dem Frühstück: 10 Min. lesen“) und Wochenpunkten.
 */

import { haptic } from '../../core/platform.js';
import { anchorSentence, habitMessage, toggleDay, weekDots } from '../../domain/habits.js';
import { t, tList } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { card, cardAction } from '../../ui/card.js';
import { chipGroup } from '../../ui/chips.js';
import { textField } from '../../ui/fields.js';
import { icon } from '../../ui/icons.js';
import { openSheet } from '../../ui/sheet.js';
import { toast } from '../../ui/toast.js';
import { reactivePart } from '../part.js';
import { longDay, shortDay } from '../days.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const NAME_MAX = 40;

/**
 * Gewohnheit mit Anzeigenamen (leerer Name → Vorschlag in der aktiven Sprache).
 * @param {import('../../core/store.js').Habit} habit
 */
const withDisplayName = (habit) => ({ ...habit, name: habit.name.trim() || t('habit.defaultName') });

/** @param {string} s */
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Gewohnheit bearbeiten: Name und fester Moment.
 * @param {AppContext} ctx
 */
export function openHabitSheet(ctx) {
  const habit = ctx.store.habit.get();
  let name = habit.name;
  let anchor = habit.anchor;
  const nameField = textField({ label: t('habit.what'), value: name, maxlength: NAME_MAX, placeholder: t('habit.whatPlaceholder'), onInput: (v) => (name = v) });
  // Vorschläge der aktiven Sprache; ein früher gewählter Moment bleibt wählbar.
  const suggestions = tList('habit.anchors');
  const choices = anchor && !suggestions.includes(anchor) ? [anchor, ...suggestions] : suggestions;
  const anchors = chipGroup({
    label: t('habit.when'),
    options: choices.map((a) => ({ value: a, label: capitalize(a) })),
    selected: anchor ? [anchor] : [],
    onChange: ([v]) => (anchor = v ?? null),
  });
  const save = h('button', { type: 'button', class: 'button button-primary button-wide', text: t('common.save') });
  const sheet = openSheet({
    title: t('habit.sheetTitle'),
    content: [
      nameField,
      h('div', { class: 'field' }, h('p', { class: 'field-label', text: t('habit.when') }), anchors, h('p', { class: 'field-hint', text: t('habit.whenHint') })),
    ],
    actions: save,
  });
  save.addEventListener('click', () => {
    const trimmed = name.trim();
    ctx.store.habit.update((cur) => ({ ...cur, name: trimmed || cur.name, anchor }));
    haptic('success');
    sheet.close('save').then(() => toast(t('habit.saved')));
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
      const sentence = anchorSentence(withDisplayName(habit));
      const message = habitMessage(habit, now);
      const dots = h(
        'div',
        { class: 'habit-days', role: 'group', 'aria-label': t('habit.week') },
        weekDots(habit, now).map((d, i) =>
          h(
            'button',
            {
              type: 'button',
              class: ['habit-day', d.done && 'is-done', d.today && 'is-today'],
              'aria-pressed': String(d.done),
              'aria-label': longDay(i, d.today),
              disabled: d.future,
              on: {
                click: () => {
                  haptic(d.done ? 'tap' : 'success');
                  ctx.store.habit.set(toggleDay(ctx.store.habit.get(), d.key, ctx.now()));
                },
              },
            },
            h('span', { class: 'habit-dot', 'aria-hidden': 'true' }, d.done ? icon('check', { size: 14 }) : null),
            h('span', { class: 'habit-label', 'aria-hidden': 'true', text: shortDay(i) }),
          ),
        ),
      );
      const anchorLine = sentence
        ? h('p', { class: 'habit-anchor', text: sentence })
        : h('button', { type: 'button', class: 'link-button', text: t('habit.noAnchor'), on: { click: () => openHabitSheet(ctx) } });
      replace(
        el,
        card(
          { title: sentence ? t('habit.title') : withDisplayName(habit).name, className: 'habit', action: cardAction(t('habit.edit'), () => openHabitSheet(ctx), 'edit') },
          anchorLine,
          dots,
          h('p', { class: 'habit-message', text: t(message.key, message.params) }),
        ),
      );
    },
    'heute-habit',
  );
}

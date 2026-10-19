/**
 * Woche: Ring mit Trainingstagen gegen das Wochenziel und sieben Tage Mo–So.
 */

import { weekRing } from '../../domain/week.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { card } from '../../ui/card.js';
import { icon } from '../../ui/icons.js';
import { progressRing } from '../../ui/ring.js';
import { reactivePart } from '../part.js';
import { longDay, shortDay } from '../days.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** @param {AppContext} ctx */
export function weekPart(ctx) {
  return reactivePart(
    ctx,
    ['sessions', 'profile', 'schedule'],
    (el) => {
      const { store } = ctx;
      const ring = weekRing({ sessions: store.sessions.get(), profile: store.profile.get(), schedule: store.schedule.get(), now: ctx.now() });
      const days = h(
        'ol',
        { class: 'week-days' },
        ring.days.map((d, i) => {
          const state = d.done ? 'week.dayDone' : d.planned ? 'week.dayPlanned' : 'week.dayFree';
          return h(
            'li',
            {
              class: ['week-day', d.done && 'is-done', d.planned && 'is-planned', d.today && 'is-today'],
              'aria-label': t(state, { day: longDay(i, d.today) }),
            },
            h('span', { class: 'week-dot', 'aria-hidden': 'true' }, d.done ? icon('check', { size: 14 }) : null),
            h('span', { class: 'week-label', 'aria-hidden': 'true', text: shortDay(i) }),
          );
        }),
      );
      replace(
        el,
        card(
          { title: t('week.title'), className: 'week' },
          h(
            'div',
            { class: 'week-body' },
            progressRing(
              { fraction: ring.fraction, size: 84, stroke: 7, label: t('week.ringLabel', { done: ring.done, goal: ring.goal }) },
              h('span', { class: 'ring-number', text: `${ring.done}/${ring.goal}` }),
              h('span', { class: 'ring-unit', text: t('week.unit') }),
            ),
            h('div', { class: 'week-side' }, h('p', { class: 'week-headline', text: t(ring.headline, ring.params) }), days),
          ),
        ),
      );
    },
    'heute-week',
  );
}

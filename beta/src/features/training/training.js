/**
 * Ansicht „Training“: Training starten oder fortsetzen, deine Pläne, Übungen nachschlagen.
 */

import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { card } from '../../ui/card.js';
import { reactivePart } from '../part.js';
import { openLibrary } from './library-sheet.js';
import { openSummary } from './finish.js';
import { loadDb } from './exercises.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} view
 */
export function mountTraining(ctx, view) {
  loadDb();
  const head = h('header', { class: 'page-head' }, h('h1', { class: 'page-title', text: t('view.training') }));
  const live = reactivePart(ctx, ['live', 'plans'], (el) => {
    const running = ctx.store.live.get();
    replace(
      el,
      h('a', { class: 'sport-start training-start', href: '#live' },
        h('span', { class: 'sport-texts' },
          h('span', { class: 'sport-title', text: t(running ? 'training.continue' : 'training.start') }),
          h('span', { class: 'sport-sub', text: running ? t(running.sets.length === 1 ? 'live.setsOne' : 'live.sets', { count: running.sets.length }) : t('training.startSub') }),
        ),
        h('span', { class: 'sport-play', 'aria-hidden': 'true' }, icon('play', { size: 26 })),
      ),
    );
  }, 'training-live');

  const plans = reactivePart(ctx, ['plans', 'settings'], (el) => {
    const list = ctx.store.plans.get().filter((p) => p.items.length);
    replace(
      el,
      card(
        { title: t('training.plans'), className: 'training-plans' },
        list.length
          ? h('ul', { class: 'plan-list' },
              list.map((p) =>
                h('li', {},
                  h('a', { class: 'plan-row', href: `#live?plan=${encodeURIComponent(p.id)}` },
                    h('span', { class: 'plan-row-texts' }, h('span', { class: 'plan-row-name', text: p.name }), h('span', { class: 'plan-row-sub', text: t('live.planSub', { count: p.items.length }) })),
                    icon('play', { size: 20 }),
                  ),
                )),
            )
          : h('p', { class: 'card-hint', text: t('training.noPlans') }),
      ),
    );
  }, 'training-plans-part');

  const more = h('div', { class: 'list-buttons training-more' },
    h('button', { type: 'button', class: 'list-button', on: { click: () => openLibrary(ctx) } }, icon('list'), h('span', { text: t('training.library') })),
  );
  const last = ctx.store.lastCard.get();
  if (last?.items) more.append(h('button', { type: 'button', class: 'list-button', on: { click: () => openSummary(ctx, last) } }, icon('check'), h('span', { text: t('training.last') })));

  view.append(head, live.el, plans.el, card({ variant: 'plain' }, more));
  return () => {
    live.destroy?.();
    plans.destroy?.();
  };
}

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
import { openAllPlans, openWizard } from './plans-ui.js';
import { planById } from '../../data/plans.js';
import { sharePlanLink } from './plan-link.js';
import { openCreatePlan } from './plan-editor.js';

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

  const finder = reactivePart(ctx, ['settings'], (el) => {
    const active = ctx.store.settings.get().activePlan;
    const plan = active ? planById(active.template) : null;
    replace(
      el,
      card(
        { title: plan ? plan.name : t('plans.findTitle'), className: 'plan-finder' },
        h('p', { class: 'card-hint', text: plan ? t('plans.perWeek', { days: active.days }) : t('plans.findHint') }),
        h('div', { class: 'plan-finder-actions' },
          h('button', { type: 'button', class: ['button', plan ? 'button-quiet' : 'button-primary'], on: { click: () => openWizard(ctx) } }, icon('sparkle', { size: 20 }), h('span', { text: t(plan ? 'plans.change' : 'plans.find') })),
          h('button', { type: 'button', class: 'button button-quiet', text: t('plans.all'), on: { click: () => openAllPlans(ctx) } }),
        ),
      ),
    );
  }, 'training-finder');

  const plans = reactivePart(ctx, ['plans', 'settings', 'programs'], (el) => {
    const list = ctx.store.plans.get().filter((p) => p.items.length);
    const programs = ctx.store.programs.get();
    replace(
      el,
      card(
        { title: t('training.plans'), className: 'training-plans' },
        list.length
          ? h('ul', { class: 'plan-list' },
              list.map((p) =>
                h('li', { class: 'plan-item' },
                  h('a', { class: 'plan-row', href: `#live?plan=${encodeURIComponent(p.id)}` },
                    h('span', { class: 'plan-row-texts' }, h('span', { class: 'plan-row-name', text: p.name }), h('span', { class: 'plan-row-sub', text: t('live.planSub', { count: p.items.length }) })),
                    icon('play', { size: 20 }),
                  ),
                  h('button', { type: 'button', class: 'icon-button plan-share', 'aria-label': t('planLink.shareLabel', { name: p.name }), on: { click: () => sharePlanLink(ctx, p) } }, icon('share', { size: 20 })),
                )),
            )
          : h('p', { class: 'card-hint', text: t('training.noPlans') }),
        programs.length
          ? h('div', { class: 'own-plans' },
              h('p', { class: 'setting-label', text: t('editor.yourPlans') }),
              h('ul', { class: 'plan-list' },
                programs.map((p) =>
                  h('li', { class: 'plan-item' },
                    h('a', { class: 'plan-row own-plan-row', href: `#editor?id=${encodeURIComponent(p.id)}`, 'aria-label': t('editor.open', { name: p.name }) },
                      h('span', { class: 'plan-row-texts' }, h('span', { class: 'plan-row-name', text: p.name }), h('span', { class: 'plan-row-sub', text: p.sessions.map((s) => s.name || s.id).join(' · ') })),
                      icon('chevronRight', { size: 20 }),
                    ),
                  ))),
            )
          : null,
        h('button', { type: 'button', class: 'button button-quiet button-wide editor-create-button', on: { click: () => openCreatePlan(ctx) } }, icon('plus'), h('span', { text: t('editor.create') })),
      ),
    );
  }, 'training-plans-part');

  const more = h('div', { class: 'list-buttons training-more' },
    h('button', { type: 'button', class: 'list-button', on: { click: () => openLibrary(ctx) } }, icon('list'), h('span', { text: t('training.library') })),
  );
  const last = ctx.store.lastCard.get();
  if (last?.items) more.append(h('button', { type: 'button', class: 'list-button', on: { click: () => openSummary(ctx, last) } }, icon('check'), h('span', { text: t('training.last') })));

  view.append(head, live.el, finder.el, plans.el, card({ variant: 'plain' }, more));
  return () => {
    live.destroy?.();
    finder.destroy?.();
    plans.destroy?.();
  };
}

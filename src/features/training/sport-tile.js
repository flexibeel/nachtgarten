/**
 * „Sport starten“: der eine große Knopf. Ein Tipp führt ins Live-Training,
 * bei Schwangerschaft & Rückbildung zum Plan der aktuellen Woche.
 */

import { haptic } from '../../core/platform.js';
import { sportTarget } from '../../domain/modules.js';
import { mamaStatus } from '../../domain/pregnancy.js';
import { todayPlan } from '../../domain/week.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/**
 * Untertitel: was heute ansteht.
 * @param {AppContext} ctx
 * @param {'live'|'mama'} target
 */
function subtitle(ctx, target) {
  const { store } = ctx;
  if (target === 'mama') {
    const status = mamaStatus(store.mama.get(), ctx.today());
    return status ? `${status.label}, Plan dieser Woche` : 'Dein sanfter Plan für diese Woche';
  }
  const { slot, done } = todayPlan({ sessions: store.sessions.get(), schedule: store.schedule.get(), now: ctx.now() });
  if (done) return 'Heute schon trainiert. Noch eine Runde?';
  if (slot?.kind === 'plan') {
    const plan = store.plans.get().find((p) => p.id === slot.id);
    if (plan) return `Heute: ${plan.name}`;
  }
  return 'Freies Training, du entscheidest';
}

/** @param {AppContext} ctx */
export function sportPart(ctx) {
  return reactivePart(
    ctx,
    ['settings', 'mama', 'sessions', 'schedule', 'plans'],
    (el) => {
      const target = sportTarget(ctx.modules());
      if (!target) return replace(el);
      replace(
        el,
        h(
          'a',
          {
            class: 'sport-start',
            href: `#${target}`,
            on: { click: () => haptic('select') },
          },
          h(
            'span',
            { class: 'sport-texts' },
            h('span', { class: 'sport-title', text: 'Sport starten' }),
            h('span', { class: 'sport-sub', text: subtitle(ctx, target) }),
          ),
          h('span', { class: 'sport-play', 'aria-hidden': 'true' }, icon('play', { size: 26 })),
        ),
      );
    },
    'heute-sport',
  );
}

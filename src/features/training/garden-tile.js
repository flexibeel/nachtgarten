/**
 * Garten auf „Heute“: schmaler Streifen, wächst mit den Trainingstagen des Monats
 * (Stufe 0–4 ab 0, 2, 5, 9, 14 Tagen). Nichts zum Antippen. Höchstens einmal je App-Start
 * fliegt der Begleiter gießend vorbei – nie bei „Bewegung reduzieren“, nie im Modus „Schlicht“.
 */

import { prefersReducedMotion } from '../../core/platform.js';
import { gardenStage, shouldFlyBy, trainingDaysThisMonth } from '../../domain/garden.js';
import { t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { companionSprite } from '../../ui/companion.js';
import { renderGarden } from '../../ui/companion/garden.js';
import { isPlain } from '../companion/companion-state.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const FLY_DELAY = 1400;
const FLY_MS = 6200;
let flown = false;

/** Für Tests: Vorbeiflug wieder erlauben. */
export const resetFlyBy = () => {
  flown = false;
};

/** @param {AppContext} ctx */
export function gardenPart(ctx) {
  /** @type {ReturnType<typeof renderGarden>|null} */
  let garden = null;
  /** @type {{destroy: () => void}|null} */
  let flyer = null;
  let timers = [];
  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
    flyer?.destroy();
    flyer = null;
    garden?.destroy();
    garden = null;
  };

  const part = reactivePart(ctx, ['sessions', 'settings', 'profile', 'buddy'], (el) => {
    clear();
    el.hidden = isPlain(ctx);
    if (el.hidden) return replace(el);
    const days = trainingDaysThisMonth(ctx.store.sessions.get(), ctx.today());
    const stage = gardenStage(days);
    const strip = h('div', { class: 'garden-strip' });
    replace(el, strip);
    garden = renderGarden(strip, { species: ctx.companion().species, stage, state: 'idle' });
    garden.el.setAttribute('aria-label', t(days === 1 ? 'garden.labelOne' : 'garden.label', { days, stage }));

    if (!shouldFlyBy({ shown: flown, reducedMotion: prefersReducedMotion(), random: ctx.random ?? Math.random })) return;
    flown = true;
    timers.push(window.setTimeout(() => {
      const fly = h('div', { class: 'garden-flyby', 'aria-hidden': 'true' }, h('span', { class: 'garden-drops' }, h('i'), h('i'), h('i')));
      const sprite = companionSprite(fly, { species: ctx.companion().species, mood: 'happy' });
      flyer = sprite;
      strip.append(fly);
      timers.push(window.setTimeout(() => {
        fly.remove();
        sprite.destroy();
        flyer = null;
      }, FLY_MS));
    }, FLY_DELAY));
  }, 'heute-garden');

  return {
    el: part.el,
    destroy: () => {
      clear();
      part.destroy?.();
    },
  };
}

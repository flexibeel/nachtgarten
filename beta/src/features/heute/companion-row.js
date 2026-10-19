/**
 * Begleiter auf „Heute“: Figur mit Sprechblase. Antippen bringt einen neuen Satz.
 */

import { prefersReducedMotion } from '../../core/platform.js';
import { t } from '../../data/texts/i18n.js';
import { replace } from '../../ui/dom.js';
import { companionSpeech } from '../../ui/companion.js';
import { lineFor, stageName, visitCompanion } from '../companion/companion-state.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const WAKE_DELAY = 900;

/** @param {AppContext} ctx */
export function companionPart(ctx) {
  let timer = 0;
  // Besuch einmal beim Öffnen vermerken; spätere Änderungen (Name, Ton, Art) zeichnen nur neu.
  const snap = visitCompanion(ctx);
  let wake = snap.wake;
  const part = reactivePart(
    ctx,
    ['buddy', 'profile'],
    (el) => {
      clearTimeout(timer);
      const on = ctx.store.buddy.get().on;
      el.hidden = !on;
      if (!on) return replace(el);
      const { species, name } = ctx.companion();
      const waking = wake;
      wake = false;
      let taps = 0;
      const speech = companionSpeech({
        species,
        name,
        stage: snap.stage,
        mood: waking ? 'tired' : snap.mood,
        line: waking ? t('companion.wake') : lineFor(ctx, snap.context, { count: snap.redirects }),
        caption: t('companion.caption', { name, stage: stageName(ctx, snap.stage) }),
        onTap: () => {
          taps += 1;
          const context = taps % 3 === 0 && snap.context !== 'sleepy' ? snap.context : 'tap';
          speech.say(lineFor(ctx, context, { count: snap.redirects }), taps % 4 === 3 ? 'cheer' : 'happy');
        },
      });
      replace(el, speech.el);
      if (waking) {
        timer = window.setTimeout(() => speech.say(lineFor(ctx, 'back'), 'happy'), prefersReducedMotion() ? 0 : WAKE_DELAY);
      }
    },
    'heute-companion',
  );
  return {
    el: part.el,
    destroy: () => {
      clearTimeout(timer);
      part.destroy?.();
    },
  };
}

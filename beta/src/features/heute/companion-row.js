/**
 * Begleiter auf „Heute“: Figur mit Sprechblase. Antippen bringt einen neuen Satz.
 */

import { prefersReducedMotion } from '../../core/platform.js';
import { t } from '../../data/texts/i18n.js';
import { replace } from '../../ui/dom.js';
import { companionSpeech } from '../../ui/companion.js';
import { isPlain, lineFor, visitCompanion } from '../companion/companion-state.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

const WAKE_DELAY = 900;

/** @param {AppContext} ctx */
export function companionPart(ctx) {
  let timer = 0;
  // Besuch einmal beim Öffnen vermerken; spätere Änderungen (Name, Ton, Art) zeichnen nur neu.
  const snap = visitCompanion(ctx);
  let wake = snap.wake;
  /** @type {{destroy: () => void}|null} */
  let speech = null;
  const part = reactivePart(
    ctx,
    ['buddy', 'profile', 'settings'],
    (el) => {
      clearTimeout(timer);
      speech?.destroy();
      speech = null;
      const on = !isPlain(ctx);
      el.hidden = !on;
      if (!on) return replace(el);
      const { species, name } = ctx.companion();
      const waking = wake;
      wake = false;
      let taps = 0;
      const current = companionSpeech({
        species,
        name,
        stage: snap.stage,
        mood: waking ? 'tired' : snap.mood,
        line: waking ? t('companion.wake') : lineFor(ctx, snap.context, { count: snap.redirects }),
        // Nur der Name: die Stufe der Verbindung steht im Profil (eine Angabe weniger im Blick).
        caption: name,
        onTap: () => {
          taps += 1;
          const context = taps % 3 === 0 && snap.context !== 'sleepy' ? snap.context : 'tap';
          current.say(lineFor(ctx, context, { count: snap.redirects }), taps % 4 === 3 ? 'cheer' : 'happy');
        },
      });
      speech = current;
      replace(el, current.el);
      if (waking) {
        timer = window.setTimeout(() => current.say(lineFor(ctx, 'back'), 'happy'), prefersReducedMotion() ? 0 : WAKE_DELAY);
      }
    },
    'heute-companion',
  );
  return {
    el: part.el,
    destroy: () => {
      clearTimeout(timer);
      speech?.destroy();
      part.destroy?.();
    },
  };
}

/**
 * Kopf von „Heute“: Datum, Begrüßung, Design-Schnellschalter, Profil-Knopf.
 */

import { toDate } from '../../core/dates.js';
import { prefersDark } from '../../core/platform.js';
import { greetingKey } from '../../domain/today.js';
import { locale, t } from '../../data/texts/i18n.js';
import { h, replace } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { companionFigure } from '../../ui/companion.js';
import { oppositeTheme, resolveTheme } from '../../ui/theme.js';
import { toast } from '../../ui/toast.js';
import { openProfile } from '../profile/profile.js';
import { companionStage } from '../companion/companion-state.js';
import { reactivePart } from '../part.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** @param {Date} date */
const formatDate = (date) => new Intl.DateTimeFormat(locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

/**
 * Schnellschalter: wechselt zum anderen sichtbaren Design, mit „Rückgängig“.
 * @param {AppContext} ctx
 */
export function themeQuickButton(ctx) {
  const button = h('button', { type: 'button', class: 'icon-button theme-quick' });
  const paint = () => {
    const visible = resolveTheme(ctx.store.settings.get().theme, prefersDark());
    button.setAttribute('aria-label', t(visible === 'dark' ? 'theme.switchedLight' : 'theme.switchedDark'));
    replace(button, icon(visible === 'dark' ? 'sun' : 'moon'));
  };
  button.addEventListener('click', () => {
    const before = ctx.store.settings.get().theme;
    const next = oppositeTheme(before, prefersDark());
    ctx.setTheme(next);
    paint();
    toast(t(next === 'dark' ? 'theme.switchedDark' : 'theme.switchedLight'), {
      action: {
        label: t('common.undo'),
        onClick: () => {
          ctx.setTheme(before);
          paint();
        },
      },
    });
  });
  paint();
  return Object.assign(button, { paint });
}

/**
 * Profil-Knopf: Anfangsbuchstabe, sonst der Begleiter.
 * @param {AppContext} ctx
 */
function avatarButton(ctx) {
  const button = h('button', { type: 'button', class: 'avatar', 'aria-label': t('heute.openProfile'), on: { click: () => openProfile(ctx) } });
  const name = ctx.store.profile.get()?.name?.trim() ?? '';
  if (name) button.append(h('span', { class: 'avatar-initial', text: name.charAt(0).toUpperCase() }));
  else if (ctx.store.buddy.get().on) button.append(companionFigure({ species: ctx.companion().species, mood: 'calm', stage: companionStage(ctx) }));
  else button.append(icon('user'));
  return button;
}

/** @param {AppContext} ctx */
export function headerPart(ctx) {
  /** @type {ReturnType<typeof themeQuickButton>|null} */
  let quick = null;
  const offTheme = ctx.bus.on('theme', () => quick?.paint());
  const part = reactivePart(
    ctx,
    ['profile', 'buddy'],
    (el) => {
      const now = toDate(ctx.now());
      const name = ctx.store.profile.get()?.name?.trim() ?? '';
      const greeting = t(greetingKey(now.getHours()));
      quick = themeQuickButton(ctx);
      replace(
        el,
        h(
          'div',
          { class: 'heute-head-text' },
          h('p', { class: 'heute-date', text: formatDate(now) }),
          h('h1', { class: 'heute-greeting', text: name ? `${greeting}, ${name}` : greeting }),
        ),
        h('div', { class: 'heute-head-actions' }, quick, avatarButton(ctx)),
      );
    },
    'heute-head',
  );
  return {
    el: part.el,
    destroy: () => {
      part.destroy?.();
      offTheme();
    },
  };
}

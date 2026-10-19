/**
 * Auswahl des Begleiters: Pixel-Tiere als Karten mit Standardnamen, Elli hervorgehoben.
 * Optional als letzte Karte „Ohne Begleiter“ (Schlicht).
 */

import { haptic } from '../../core/platform.js';
import { SPECIES } from '../../data/companions.js';
import { t } from '../../data/texts/i18n.js';
import { h } from '../../ui/dom.js';
import { companionFigure } from '../../ui/companion.js';
import { icon } from '../../ui/icons.js';

/** Wert der Karte „Ohne Begleiter“. */
export const PLAIN = 'plain';

/**
 * @param {{value: string, withPlain?: boolean, onChange: (value: string) => void}} options
 */
export function companionPicker({ value, withPlain = false, onChange }) {
  let current = value;
  const group = h('div', { class: 'species-picker', role: 'radiogroup', 'aria-label': t('companion.pick') });
  const cards = [];
  const add = (id, figure, title, sub, featured = false) => {
    const button = h(
      'button',
      { type: 'button', role: 'radio', class: ['species-card', featured && 'is-featured', id === PLAIN && 'is-plain'], dataset: { species: id } },
      featured ? h('span', { class: 'species-badge', text: t('companion.featured') }) : null,
      h('span', { class: 'species-figure', 'aria-hidden': 'true' }, figure),
      h('span', { class: 'species-name', text: title }),
      h('span', { class: 'species-kind', text: sub }),
    );
    button.setAttribute('aria-label', id === PLAIN ? `${title}, ${sub}` : t('companion.pickOption', { name: title, species: sub }));
    button.addEventListener('click', () => {
      if (current === id) return;
      current = id;
      sync();
      haptic('select');
      onChange(id);
    });
    cards.push(button);
    group.append(button);
  };
  for (const sp of SPECIES) add(sp.id, companionFigure({ species: sp.id, mood: 'happy' }), sp.defaultName, t(`species.${sp.id}`), !!sp.featured);
  if (withPlain) add(PLAIN, icon('training', { size: 30 }), t('companion.plainOption'), t('companion.plainOptionHint'));
  const sync = () => cards.forEach((c) => c.setAttribute('aria-checked', String(c.dataset.species === current)));
  sync();
  return group;
}

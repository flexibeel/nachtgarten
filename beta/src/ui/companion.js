/**
 * Begleiter-Bausteine, unabhängig von der Art: Figur und Sprechblase.
 * Die Zeichnung kommt über die Art-Id aus src/ui/companions/<id>.js; neue Arten
 * (z. B. Pixel-Tiere) werden nur in ART und data/companions.js eingetragen.
 */

import { haptic } from '../core/platform.js';
import { DEFAULT_SPECIES } from '../data/companions.js';
import { t } from '../data/texts/i18n.js';
import { h, restartAnimation, svg } from './dom.js';
import { keimlingMarkup } from './companions/keimling.js';

/** @typedef {import('../domain/buddy.js').BuddyMood} BuddyMood */

/**
 * Zeichnung je Art: liefert SVG-Markup (vertrauenswürdig, im Code).
 * @type {Readonly<Record<string, (o: {mood: BuddyMood, stage: number, a11y: string}) => string>>}
 */
const ART = Object.freeze({
  keimling: keimlingMarkup,
});

const MOODS = ['calm', 'happy', 'cheer', 'tired', 'proud'];

/**
 * Figur als Element.
 * @param {{species: string, mood?: BuddyMood, stage?: number, label?: string}} options
 * @returns {SVGElement}
 */
export function companionFigure({ species, mood = 'calm', stage = 1, label }) {
  const draw = ART[species] ?? ART[DEFAULT_SPECIES];
  const a11y = label ? `role="img" aria-label="${label.replace(/[&"<>]/g, '')}"` : 'aria-hidden="true" focusable="false"';
  return svg(draw({ mood: MOODS.includes(mood) ? mood : 'calm', stage: Math.min(4, Math.max(1, stage)), a11y }));
}

/**
 * @typedef {object} CompanionSpeech
 * @property {HTMLElement} el
 * @property {(line: string, mood?: BuddyMood) => void} say
 */

/**
 * Begleiter mit Sprechblase. Antippen der Figur ruft `onTap` und lässt ihn hüpfen.
 * @param {object} options
 * @param {string} options.species
 * @param {string} options.name
 * @param {number} options.stage
 * @param {BuddyMood} options.mood
 * @param {string} options.line
 * @param {string} [options.caption]   Zeile über dem Satz (Standard: Name)
 * @param {() => void} [options.onTap]
 * @param {'row'|'large'} [options.size]
 * @returns {CompanionSpeech}
 */
export function companionSpeech({ species, name, stage, mood, line, caption, onTap, size = 'row' }) {
  const draw = (m) => companionFigure({ species, mood: m, stage });
  const slot = h('span', { class: 'companion-slot' }, draw(mood));
  const figure = onTap
    ? h('button', { type: 'button', class: 'companion-button', 'aria-label': t('companion.tap', { name }) }, slot)
    : h('span', { class: 'companion-button' }, slot);
  const text = h('span', { class: 'companion-text', text: line });
  const bubble = h('p', { class: 'companion-bubble', 'aria-live': 'polite' }, h('span', { class: 'companion-who', text: caption ?? name }), text);
  const el = h('div', { class: ['companion', `companion-${size}`] }, figure, bubble);

  if (onTap) {
    figure.addEventListener('click', () => {
      haptic('tap');
      restartAnimation(slot, 'is-hopping');
      onTap();
    });
  }

  return {
    el,
    say(next, nextMood) {
      text.textContent = next;
      if (nextMood) slot.replaceChildren(draw(nextMood));
      restartAnimation(bubble, 'is-new');
    },
  };
}

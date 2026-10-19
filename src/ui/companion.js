/**
 * Begleiter-Bausteine, unabhängig von der Art: Figur und Sprechblase.
 * Gezeichnet werden die Pixel-Tiere aus src/ui/companion/ (sprites.js); die Art-Id
 * kommt aus dem Profil (data/companions.js). Farben über CSS-Variablen, Hell/Dunkel ohne Neuzeichnen.
 */

import { haptic } from '../core/platform.js';
import { DEFAULT_SPECIES } from '../data/companions.js';
import { t } from '../data/texts/i18n.js';
import { h, restartAnimation, svg } from './dom.js';
import { ensurePalette, mountSprite, spriteSvg } from './companion/companion.js';
import { SPECIES as SPRITES } from './companion/sprites.js';

/** @typedef {import('../domain/buddy.js').BuddyMood} BuddyMood */

/** Stimmung der App → Zustand des Sprites. */
const STATE = Object.freeze({ calm: 'idle', happy: 'happy', cheer: 'cheer', tired: 'calm', proud: 'proud' });

/** @param {string} species */
const known = (species) => (SPRITES[species] ? species : DEFAULT_SPECIES);
/** @param {string|undefined} mood */
export const spriteState = (mood) => STATE[mood ?? 'calm'] ?? 'idle';

/**
 * Figur als ruhiges Standbild (Avatar, Auswahl, Profil).
 * @param {{species: string, mood?: BuddyMood, stage?: number, label?: string}} options
 * @returns {SVGElement}
 */
export function companionFigure({ species, mood = 'calm', label }) {
  ensurePalette();
  const el = svg(spriteSvg(known(species), spriteState(mood)));
  el.classList.add('companion-figure');
  el.removeAttribute('width');
  el.removeAttribute('height');
  if (label) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
    el.removeAttribute('aria-hidden');
  }
  return el;
}

/**
 * Bewegte Figur (kleine Bildschleife, steht bei „Bewegung reduzieren“ still).
 * @param {HTMLElement} host
 * @param {{species: string, mood?: BuddyMood}} options
 */
export function companionSprite(host, { species, mood = 'calm' }) {
  const sprite = mountSprite(host, { species: known(species), state: spriteState(mood) });
  sprite.el.classList.add('companion-figure');
  return {
    el: sprite.el,
    /** @param {BuddyMood} next */
    mood: (next) => sprite.update({ state: spriteState(next) }),
    destroy: () => sprite.destroy(),
  };
}

/**
 * @typedef {object} CompanionSpeech
 * @property {HTMLElement} el
 * @property {(line: string, mood?: BuddyMood) => void} say
 * @property {() => void} destroy
 */

/**
 * Begleiter mit Sprechblase. Antippen der Figur ruft `onTap` und lässt ihn hüpfen.
 * @param {object} options
 * @param {string} options.species
 * @param {string} options.name
 * @param {number} [options.stage]
 * @param {BuddyMood} options.mood
 * @param {string} options.line
 * @param {string} [options.caption]   Zeile über dem Satz (Standard: Name)
 * @param {() => void} [options.onTap]
 * @param {'row'|'large'|'small'} [options.size]
 * @returns {CompanionSpeech}
 */
export function companionSpeech({ species, name, mood, line, caption, onTap, size = 'row' }) {
  const slot = h('span', { class: 'companion-slot' });
  const sprite = companionSprite(slot, { species, mood });
  const figure = onTap
    ? h('button', { type: 'button', class: 'companion-button', 'aria-label': t('companion.tap', { name }) }, slot)
    : h('span', { class: 'companion-button', role: 'img', 'aria-label': name }, slot);
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
      if (nextMood) sprite.mood(nextMood);
      restartAnimation(bubble, 'is-new');
    },
    destroy: () => sprite.destroy(),
  };
}

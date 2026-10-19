/**
 * Fortschrittsring (SVG) mit Inhalt in der Mitte.
 */

import { h, svg } from './dom.js';

/**
 * Bogenlänge für einen Anteil (rein, getestet).
 * @param {number} fraction  0…1 (wird begrenzt)
 * @param {number} radius
 * @returns {{length: number, dash: number}}
 */
export function ringDash(fraction, radius) {
  const length = 2 * Math.PI * radius;
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
  return { length, dash: length * f };
}

/**
 * @param {object} options
 * @param {number} options.fraction
 * @param {string} options.label         Beschreibung für Screenreader
 * @param {number} [options.size]        px
 * @param {number} [options.stroke]      px
 * @param {...import('./dom.js').Child} center
 */
export function progressRing({ fraction, label, size = 96, stroke = 8 }, ...center) {
  const r = (size - stroke) / 2;
  const { length, dash } = ringDash(fraction, r);
  const c = size / 2;
  const graphic = svg(
    `<svg class="ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
<circle class="ring-track" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="${stroke}"/>
<circle class="ring-value" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round"
 stroke-dasharray="${dash.toFixed(2)} ${length.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/></svg>`,
  );
  if (dash === 0) graphic.querySelector('.ring-value')?.setAttribute('stroke-opacity', '0');
  const el = h('div', { class: 'ring', role: 'img', 'aria-label': label }, graphic, h('div', { class: 'ring-center', 'aria-hidden': 'true' }, center));
  el.style.setProperty('--ring-size', `${size}px`);
  return el;
}

/**
 * Stepper: − Wert +, große Ziele, Wert antippen öffnet das Zahlenfeld.
 */

import { formatNumber, round } from '../core/format.js';
import { haptic } from '../core/platform.js';
import { t } from '../data/texts/i18n.js';
import { h } from './dom.js';
import { icon } from './icons.js';
import { openNumpad } from './numpad.js';

/**
 * Wert um einen Schritt verändern und in den Bereich zwingen (rein, getestet).
 * @param {number} value
 * @param {number} delta
 * @param {{min: number, max: number, decimals?: number}} range
 */
export function stepValue(value, delta, { min, max, decimals = 0 }) {
  return Math.min(max, Math.max(min, round(value + delta, decimals)));
}

/**
 * @param {object} options
 * @param {string} options.label       Name des Werts („Trainingstage pro Woche“)
 * @param {number} options.value
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @param {number} [options.step]
 * @param {number} [options.decimals]
 * @param {string} [options.unit]
 * @param {(value: number) => string} [options.format]
 * @param {(value: number) => void} options.onChange
 */
export function stepper({ label, value, min = 0, max = 999, step = 1, decimals = 0, unit = '', format, onChange }) {
  let current = value;
  const show = (v) => (format ? format(v) : formatNumber(v, decimals));
  const valueText = h('span', { class: 'stepper-number' });
  const unitText = unit ? h('span', { class: 'stepper-unit', text: unit }) : null;
  const valueButton = h('button', { type: 'button', class: 'stepper-value', 'aria-label': t('stepper.type', { label }) }, valueText, unitText);
  const minus = h('button', { type: 'button', class: 'stepper-button', 'aria-label': t('stepper.less', { label }) }, icon('minus'));
  const plus = h('button', { type: 'button', class: 'stepper-button', 'aria-label': t('stepper.more', { label }) }, icon('plus'));
  const el = h('div', { class: 'stepper', role: 'group', 'aria-label': label }, minus, valueButton, plus);

  const paint = () => {
    valueText.textContent = show(current);
    minus.disabled = current <= min;
    plus.disabled = current >= max;
  };
  const set = (next) => {
    if (next === current) return;
    current = next;
    paint();
    onChange(current);
  };

  minus.addEventListener('click', () => {
    haptic('tap');
    set(stepValue(current, -step, { min, max, decimals }));
  });
  plus.addEventListener('click', () => {
    haptic('tap');
    set(stepValue(current, step, { min, max, decimals }));
  });
  valueButton.addEventListener('click', async () => {
    const n = await openNumpad({ title: label, value: current, unit, decimals, min, max });
    if (n !== null) set(n);
  });

  paint();
  return el;
}

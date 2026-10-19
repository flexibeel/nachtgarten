/**
 * Zahlenfeld als Sheet: große Anzeige, Tasten 0–9, Komma, Löschen.
 * Liefert die Zahl oder null (abgebrochen). Prüft Bereich und Nachkommastellen.
 */

import { formatNumber, parseDecimal } from '../core/format.js';
import { haptic } from '../core/platform.js';
import { t } from '../data/texts/i18n.js';
import { h } from './dom.js';
import { icon } from './icons.js';
import { openSheet } from './sheet.js';

const MAX_LENGTH = 7;

/**
 * Tasteneingabe auf einen Anzeigetext anwenden (rein, getestet).
 * @param {string} current  z. B. "42,5"
 * @param {string} key      "0"–"9", ",", "back", "clear"
 * @param {number} decimals erlaubte Nachkommastellen (0 = kein Komma)
 * @returns {string}
 */
export function applyKey(current, key, decimals) {
  if (key === 'clear') return '';
  if (key === 'back') return current.slice(0, -1);
  if (key === ',') {
    if (!decimals || current.includes(',')) return current;
    return (current || '0') + ',';
  }
  if (!/^\d$/.test(key) || current.length >= MAX_LENGTH) return current;
  const [, frac] = current.split(',');
  if (frac !== undefined && frac.length >= decimals) return current;
  if (current === '0') return key;
  return current + key;
}

/**
 * @param {object} options
 * @param {string} options.title
 * @param {number|null} [options.value]
 * @param {string} [options.unit]
 * @param {number} [options.decimals]
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @returns {Promise<number|null>}
 */
export function openNumpad({ title, value = null, unit = '', decimals = 0, min = 0, max = 9999 }) {
  return new Promise((resolve) => {
    let text = value === null ? '' : formatNumber(value, decimals).replace(/\./g, '');
    let result = /** @type {number|null} */ (null);

    const display = h('output', { class: 'numpad-value', 'aria-live': 'polite' });
    const unitEl = unit ? h('span', { class: 'numpad-unit', text: unit }) : null;
    const error = h('p', { class: 'numpad-error', role: 'alert' });
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimals ? ',' : '', '0', 'back'];
    const pad = h(
      'div',
      { class: 'numpad-keys' },
      keys.map((k) =>
        k
          ? h(
              'button',
              { type: 'button', class: 'numpad-key', dataset: { key: k }, 'aria-label': k === 'back' ? t('numpad.backspace') : k === ',' ? t('numpad.comma') : k },
              k === 'back' ? icon('backspace') : k,
            )
          : h('span', { 'aria-hidden': 'true' }),
      ),
    );
    const accept = h('button', { type: 'button', class: 'button button-primary button-wide', text: t('numpad.accept') });

    const paint = () => {
      display.textContent = text || '0';
      display.classList.toggle('is-empty', !text);
      error.textContent = '';
    };

    const press = (key) => {
      text = applyKey(text, key, decimals);
      haptic('tap');
      paint();
    };

    pad.addEventListener('click', (e) => {
      const key = /** @type {HTMLElement} */ (e.target).closest('[data-key]')?.getAttribute('data-key');
      if (key) press(key);
    });

    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === ',' || e.key === '.') press(',');
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') submit();
      else return;
      e.preventDefault();
    };

    const submit = () => {
      const n = parseDecimal(text || '0');
      if (!Number.isFinite(n) || n < min || n > max) {
        error.textContent = t('numpad.range', { min: formatNumber(min, decimals), max: formatNumber(max, decimals) });
        haptic('warning');
        return;
      }
      result = n;
      sheet.close('accept');
    };
    accept.addEventListener('click', submit);

    const sheet = openSheet({
      title,
      className: 'numpad',
      content: [h('div', { class: 'numpad-display' }, display, unitEl), error, pad],
      actions: accept,
      onClose: () => {
        document.removeEventListener('keydown', onKey);
        resolve(result);
      },
    });
    document.addEventListener('keydown', onKey);
    paint();
  });
}

/**
 * Eingabefelder und Schalter mit sichtbarem Label.
 */

import { h, uid } from './dom.js';
import { icon } from './icons.js';
import { haptic } from '../core/platform.js';

/**
 * Einzeiliges Textfeld.
 * @param {object} options
 * @param {string} options.label
 * @param {string} [options.value]
 * @param {string} [options.placeholder]
 * @param {number} [options.maxlength]
 * @param {string} [options.autocomplete]
 * @param {string} [options.type]
 * @param {string} [options.hint]
 * @param {boolean} [options.hideLabel]
 * @param {(value: string) => void} [options.onInput]
 * @param {(value: string) => void} [options.onCommit]   bei Enter oder Verlassen
 */
export function textField({ label, value = '', placeholder = '', maxlength, autocomplete = 'off', type = 'text', hint, hideLabel = false, onInput, onCommit }) {
  const id = uid('field');
  const hintId = hint ? `${id}-hint` : null;
  const input = h('input', {
    id,
    class: 'input',
    type,
    value,
    placeholder,
    maxlength: maxlength ? String(maxlength) : null,
    autocomplete,
    enterkeyhint: 'done',
    'aria-describedby': hintId,
  });
  input.value = value;
  input.addEventListener('input', () => onInput?.(input.value));
  input.addEventListener('change', () => onCommit?.(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });
  const el = h(
    'div',
    { class: 'field' },
    h('label', { class: ['field-label', hideLabel && 'visually-hidden'], for: id, text: label }),
    input,
    hint ? h('p', { class: 'field-hint', id: hintId, text: hint }) : null,
  );
  return Object.assign(el, { input });
}

/**
 * Ein/Aus-Schalter als Zeile mit Titel und optionaler Beschreibung.
 * @param {object} options
 * @param {string} options.label
 * @param {string} [options.hint]
 * @param {boolean} options.checked
 * @param {(checked: boolean) => void} options.onChange
 */
export function switchRow({ label, hint, checked, onChange }) {
  let on = checked;
  const button = h(
    'button',
    { type: 'button', role: 'switch', class: 'switch-row', 'aria-checked': String(on) },
    h('span', { class: 'switch-texts' }, h('span', { class: 'switch-label', text: label }), hint ? h('span', { class: 'switch-hint', text: hint }) : null),
    h('span', { class: 'switch', 'aria-hidden': 'true' }, h('span', { class: 'switch-thumb' })),
  );
  button.addEventListener('click', () => {
    on = !on;
    button.setAttribute('aria-checked', String(on));
    haptic('select');
    onChange(on);
  });
  return button;
}

/**
 * Eingabezeile mit rundem Plus-Knopf (z. B. „Eine Sache heute“, „Kurz abladen“).
 * @param {object} options
 * @param {string} options.label
 * @param {string} options.placeholder
 * @param {string} options.buttonLabel
 * @param {number} options.maxlength
 * @param {string} [options.value]
 * @param {(value: string) => void} options.onSubmit
 */
export function inlineForm({ label, placeholder, buttonLabel, maxlength, value = '', onSubmit }) {
  const input = h('input', { class: 'input', type: 'text', placeholder, maxlength: String(maxlength), 'aria-label': label, enterkeyhint: 'done', autocomplete: 'off' });
  input.value = value;
  const button = h('button', { type: 'submit', class: 'icon-button icon-button-filled', 'aria-label': buttonLabel }, icon('plus'));
  const form = h('form', { class: 'inline-form' }, input, button);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.value.trim()) return input.focus();
    onSubmit(input.value);
    input.value = '';
  });
  return Object.assign(form, { input });
}

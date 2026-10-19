/**
 * Auswahl-Bausteine: Chips (einzeln oder mehrfach) und Segment-Schalter.
 * Zustand steht in `aria-pressed` (Chips) bzw. `aria-checked` (Segmente, Radiogruppe).
 */

import { h } from './dom.js';
import { icon } from './icons.js';
import { haptic } from '../core/platform.js';

/**
 * @template {string|number} V
 * @typedef {object} Option
 * @property {V} value
 * @property {string} label
 * @property {string} [hint]   zweite Zeile (nur bei Chips im Format „card“)
 * @property {string} [icon]
 */

/**
 * Chip-Gruppe.
 * @template {string|number} V
 * @param {object} options
 * @param {string} options.label                 Gruppenname für Screenreader
 * @param {Option<V>[]} options.options
 * @param {V[]} options.selected
 * @param {boolean} [options.multiple]
 * @param {boolean} [options.allowEmpty]          bei Einzelwahl: erneutes Tippen hebt auf
 * @param {'pill'|'card'} [options.variant]
 * @param {(selected: V[]) => void} options.onChange
 */
export function chipGroup({ label, options, selected, multiple = false, allowEmpty = true, variant = 'pill', onChange }) {
  let current = [...selected];
  const group = h('div', { class: ['chips', `chips-${variant}`], role: 'group', 'aria-label': label });

  const buttons = options.map((opt) => {
    const button = h(
      'button',
      { type: 'button', class: 'chip', 'aria-pressed': String(current.includes(opt.value)) },
      opt.icon ? icon(opt.icon, { size: 20 }) : null,
      variant === 'card'
        ? h('span', { class: 'chip-texts' }, h('span', { class: 'chip-label', text: opt.label }), opt.hint ? h('span', { class: 'chip-hint', text: opt.hint }) : null)
        : h('span', { class: 'chip-label', text: opt.label }),
      variant === 'card' ? h('span', { class: 'chip-check', 'aria-hidden': 'true' }, icon('check', { size: 16 })) : null,
    );
    button.addEventListener('click', () => {
      const on = current.includes(opt.value);
      if (multiple) current = on ? current.filter((v) => v !== opt.value) : [...current, opt.value];
      else current = on ? (allowEmpty ? [] : current) : [opt.value];
      sync();
      haptic('select');
      onChange([...current]);
    });
    group.append(button);
    return button;
  });

  const sync = () => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(current.includes(options[i].value))));

  return Object.assign(group, {
    /** @param {V[]} values */
    setSelected(values) {
      current = [...values];
      sync();
    },
  });
}

/**
 * Segment-Schalter (genau eine Wahl), Pfeiltasten wechseln.
 * @template {string|number} V
 * @param {object} options
 * @param {string} options.label
 * @param {Option<V>[]} options.options
 * @param {V} options.value
 * @param {(value: V) => void} options.onChange
 */
export function segmented({ label, options, value, onChange }) {
  let current = value;
  const group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': label });
  group.style.setProperty('--segments', String(options.length));

  const buttons = options.map((opt) => {
    const button = h(
      'button',
      { type: 'button', role: 'radio', class: 'segment', 'aria-checked': String(opt.value === current), tabindex: opt.value === current ? '0' : '-1' },
      opt.icon ? icon(opt.icon, { size: 18 }) : null,
      h('span', { text: opt.label }),
    );
    button.addEventListener('click', () => select(opt.value, false));
    group.append(button);
    return button;
  });

  group.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === current);
    select(options[(i + step + options.length) % options.length].value, true);
  });

  /** @param {V} next @param {boolean} focus */
  function select(next, focus) {
    if (next === current) return;
    current = next;
    sync();
    if (focus) buttons[options.findIndex((o) => o.value === next)].focus();
    haptic('select');
    onChange(next);
  }

  function sync() {
    const i = options.findIndex((o) => o.value === current);
    group.style.setProperty('--active', String(Math.max(0, i)));
    buttons.forEach((b, j) => {
      b.setAttribute('aria-checked', String(j === i));
      b.tabIndex = j === i ? 0 : -1;
    });
  }
  sync();

  return Object.assign(group, {
    /** @param {V} v */
    setValue(v) {
      current = v;
      sync();
    },
  });
}

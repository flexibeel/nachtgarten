/**
 * Einstellungs-Bausteine, die auf „Heute“ und im Profil gleich aussehen.
 */

import { h } from '../../ui/dom.js';
import { segmented } from '../../ui/chips.js';
import { THEME_OPTIONS } from '../../ui/theme.js';
import { sportTarget } from '../../domain/modules.js';

/** @typedef {import('../context.js').AppContext} AppContext */

export const START_VIEW_OPTIONS = Object.freeze([
  { value: 'heute', label: 'Heute' },
  { value: 'training', label: 'Training' },
  { value: 'live', label: 'Sport' },
]);

/**
 * Beschriftete Zeile mit Steuerelement darunter.
 * @param {string} label
 * @param {Node} control
 * @param {string} [hint]
 */
export const settingRow = (label, control, hint) =>
  h('div', { class: 'setting' }, h('p', { class: 'setting-label', text: label }), control, hint ? h('p', { class: 'field-hint', text: hint }) : null);

/**
 * Design: System / Hell / Dunkel. Bleibt synchron mit dem Schnellschalter.
 * @param {AppContext} ctx
 */
export function themeControl(ctx) {
  const control = segmented({
    label: 'Design',
    options: THEME_OPTIONS.map((o) => ({ ...o })),
    value: ctx.store.settings.get().theme,
    onChange: (v) => ctx.setTheme(/** @type {any} */ (v)),
  });
  const off = ctx.bus.on('theme', (v) => control.setValue(v));
  return { el: settingRow('Design', control), destroy: off };
}

/**
 * Startansichten, die mit den eingeschalteten Modulen erreichbar sind (rein, getestet).
 * @param {string[]} modules  normalisiert
 */
export function startViewOptions(modules) {
  return START_VIEW_OPTIONS.filter(
    (o) => o.value === 'heute' || (o.value === 'training' && modules.includes('train')) || (o.value === 'live' && sportTarget(modules) !== null),
  );
}

/**
 * Startansicht beim Öffnen der App. Nur sichtbar, wenn es mehr als „Heute“ gibt;
 * baut sich neu, wenn Module an- oder ausgehen.
 * @param {AppContext} ctx
 */
export function startViewControl(ctx) {
  const el = h('div', { class: 'setting-slot' });
  const paint = () => {
    const options = startViewOptions(ctx.modules());
    const current = ctx.store.settings.get().startView;
    const value = options.some((o) => o.value === current) ? current : 'heute';
    el.hidden = options.length < 2;
    el.replaceChildren(
      settingRow(
        'Beim Öffnen direkt zu',
        segmented({
          label: 'Beim Öffnen',
          options: options.map((o) => ({ ...o })),
          value,
          onChange: (v) => ctx.store.settings.update((s) => ({ ...s, startView: v })),
        }),
        options.some((o) => o.value === 'live') ? '„Sport“ startet sofort ein Training.' : undefined,
      ),
    );
  };
  paint();
  let key = ctx.modules().join();
  const off = ctx.watch(['settings'], () => {
    if (ctx.modules().join() === key) return;
    key = ctx.modules().join();
    paint();
  });
  return { el, destroy: off };
}

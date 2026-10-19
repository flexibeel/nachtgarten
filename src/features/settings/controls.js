/**
 * Einstellungs-Bausteine, die auf „Heute“ und im Profil gleich aussehen:
 * Sprache, Design, Startansicht.
 */

import { h } from '../../ui/dom.js';
import { segmented } from '../../ui/chips.js';
import { themeOptions } from '../../ui/theme.js';
import { sportTarget } from '../../domain/modules.js';
import { LANGS, getLang, t } from '../../data/texts/i18n.js';

/** @typedef {import('../context.js').AppContext} AppContext */

/** Startansichten; Beschriftung über t(`start.<id>`). */
export const START_VIEWS = Object.freeze(['heute', 'training', 'live']);

/**
 * Beschriftete Zeile mit Steuerelement darunter.
 * @param {string} label
 * @param {Node} control
 * @param {string} [hint]
 */
export const settingRow = (label, control, hint) =>
  h('div', { class: 'setting' }, h('p', { class: 'setting-label', text: label }), control, hint ? h('p', { class: 'field-hint', text: hint }) : null);

/**
 * Sprache: Deutsch / English. Ein Wechsel zeichnet die ganze App neu.
 * @param {AppContext} ctx
 */
export function languageControl(ctx) {
  const control = segmented({
    label: t('lang.label'),
    options: LANGS.map((l) => ({ value: l.value, label: l.label })),
    value: getLang(),
    onChange: (v) => ctx.setLanguage(/** @type {'de'|'en'} */ (v)),
  });
  // Sprachnamen stehen in ihrer eigenen Sprache, das Label der Zeile in der aktiven.
  control.querySelectorAll('.segment').forEach((b, i) => b.setAttribute('lang', LANGS[i].value));
  return { el: settingRow(t('lang.label'), control), destroy: () => {} };
}

/**
 * Design: System / Hell / Dunkel. Bleibt synchron mit dem Schnellschalter.
 * @param {AppContext} ctx
 */
export function themeControl(ctx) {
  const control = segmented({
    label: t('theme.label'),
    options: themeOptions(),
    value: ctx.store.settings.get().theme,
    onChange: (v) => ctx.setTheme(/** @type {any} */ (v)),
  });
  const off = ctx.bus.on('theme', (v) => control.setValue(v));
  return { el: settingRow(t('theme.label'), control), destroy: off };
}

/**
 * Startansichten, die mit den eingeschalteten Modulen erreichbar sind (rein, getestet).
 * @param {string[]} modules  normalisiert
 * @returns {string[]}
 */
export function startViewOptions(modules) {
  return START_VIEWS.filter(
    (v) => v === 'heute' || (v === 'training' && modules.includes('train')) || (v === 'live' && sportTarget(modules) !== null),
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
    const value = options.includes(current) ? current : 'heute';
    el.hidden = options.length < 2;
    el.replaceChildren(
      settingRow(
        t('settings.startView'),
        segmented({
          label: t('settings.startView'),
          options: options.map((v) => ({ value: v, label: t(`start.${v}`) })),
          value,
          onChange: (v) => ctx.store.settings.update((s) => ({ ...s, startView: v })),
        }),
        options.includes('live') ? t('settings.startHint') : undefined,
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

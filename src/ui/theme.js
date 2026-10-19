/**
 * Hell/Dunkel/System anwenden: `data-theme` am Wurzelelement und passende
 * `theme-color` für die Statusleiste.
 */

import { prefersDark } from '../core/platform.js';
import { t } from '../data/texts/i18n.js';

/** @typedef {'system'|'light'|'dark'} ThemeSetting */

/** Auswahl Design in der aktiven Sprache. */
export const themeOptions = () => [
  { value: 'system', label: t('theme.system'), icon: 'system' },
  { value: 'light', label: t('theme.light'), icon: 'sun' },
  { value: 'dark', label: t('theme.dark'), icon: 'moon' },
];

/** Hintergrundfarben aus tokens.css für die Statusleiste. */
export const THEME_COLORS = Object.freeze({ light: '#F5F1EE', dark: '#232020' });

/**
 * Tatsächlich sichtbares Design (rein, getestet).
 * @param {string} setting
 * @param {boolean} systemDark
 * @returns {'light'|'dark'}
 */
export function resolveTheme(setting, systemDark) {
  if (setting === 'light' || setting === 'dark') return setting;
  return systemDark ? 'dark' : 'light';
}

/**
 * Schnellschalter: zum jeweils anderen sichtbaren Design wechseln.
 * @param {string} setting
 * @param {boolean} systemDark
 * @returns {'light'|'dark'}
 */
export const oppositeTheme = (setting, systemDark) => (resolveTheme(setting, systemDark) === 'dark' ? 'light' : 'dark');

/**
 * @param {ThemeSetting} setting
 */
export function applyTheme(setting) {
  const root = document.documentElement;
  if (setting === 'light' || setting === 'dark') root.dataset.theme = setting;
  else delete root.dataset.theme;

  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach((meta) => {
    const media = meta.getAttribute('data-scheme');
    const color = setting === 'system' ? THEME_COLORS[media === 'dark' ? 'dark' : 'light'] : THEME_COLORS[setting];
    meta.setAttribute('content', color);
  });
}

/** Aktuell sichtbares Design. */
export const visibleTheme = (setting) => resolveTheme(setting, prefersDark());

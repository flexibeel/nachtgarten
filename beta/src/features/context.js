/**
 * App-Kontext: das eine Objekt, das alle Bildschirme bekommen.
 * Bündelt Speicher, Ereignisse, Uhr und Navigation, damit Features nichts Globales anfassen.
 */

import { createEmitter } from '../core/events.js';
import { createStore, localStorageAdapter } from '../core/store.js';
import { dateKey } from '../core/dates.js';
import { applyTheme } from '../ui/theme.js';
import { companionOf } from '../domain/companion.js';
import { setLang } from '../data/texts/i18n.js';

/** @typedef {import('../core/store.js').Store} Store */
/** @typedef {import('../core/store.js').AreaName} AreaName */

/**
 * @typedef {object} AppContext
 * @property {Store} store
 * @property {import('../core/events.js').Emitter} bus
 * @property {import('./registry.js').Registry} registry
 * @property {() => string[]} modules          eingeschaltete Module (normalisiert)
 * @property {(id: string) => boolean} hasModule
 * @property {() => import('../core/store.js').Companion} companion
 * @property {() => number} now
 * @property {() => string} today
 * @property {(name: string, options?: {replace?: boolean}) => void} go       navigieren (vom Router gesetzt)
 * @property {(areas: AreaName[], fn: () => void) => () => void} watch       auf Speicher-Änderungen hören
 * @property {(setting: 'system'|'light'|'dark') => void} setTheme
 * @property {(lang: 'de'|'en') => void} setLanguage   Sprache speichern, anwenden, alles neu zeichnen
 * @property {() => void} reload    alles neu aufbauen (nach Wiederherstellen/Löschen)
 */

/**
 * @param {{registry: import('./registry.js').Registry, adapter?: import('../core/store.js').StorageAdapter, now?: () => number}} options
 * @returns {AppContext}
 */
export function createContext({ registry, adapter = localStorageAdapter(), now = () => Date.now() }) {
  const bus = createEmitter();
  const store = createStore(adapter, { onChange: (area) => bus.emit('store', area) });

  /** @type {AppContext} */
  const ctx = {
    store,
    bus,
    registry,
    modules: () => registry.enabled(store.settings.get().enabledModules),
    hasModule: (id) => ctx.modules().includes(id),
    companion: () => companionOf(store.profile.get()),
    now,
    today: () => dateKey(now()),
    go: () => {},
    watch(areas, fn) {
      return bus.on('store', (area) => {
        if (areas.includes(area)) fn();
      });
    },
    setTheme(setting) {
      store.settings.update((s) => ({ ...s, theme: setting }));
      applyTheme(setting);
      bus.emit('theme', setting);
    },
    setLanguage(lang) {
      const applied = setLang(lang);
      store.settings.update((s) => ({ ...s, lang: applied }));
      bus.emit('lang', applied);
    },
    reload: () => bus.emit('reload'),
  };
  return ctx;
}

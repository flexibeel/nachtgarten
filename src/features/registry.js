/**
 * Modul-Registry. Jedes Feature-Modul meldet sich mit Beschriftung, Ansichten (Routen,
 * optional als Tab) und Kacheln für „Heute“ an. Shell, Onboarding, Profil und „Heute“
 * fragen nur die Registry – ein ausgeschaltetes Modul ist dadurch überall unsichtbar.
 *
 * Die Registry kennt kein DOM; Ansichten und Kacheln bringen ihre Render-Funktion mit.
 * Beschriftungen sind Text-Schlüssel (`…Key`), übersetzt wird erst beim Anzeigen mit t().
 */

import { anyEnabled, normalizeModules, orderTiles } from '../domain/modules.js';

/** @typedef {import('./context.js').AppContext} AppContext */
/** @typedef {import('./part.js').Part} Part */
/** @typedef {import('../core/router.js').Route} Route */

/**
 * @typedef {object} TileDef
 * @property {string} id
 * @property {string} titleKey                 Name in „Heute anordnen“
 * @property {(ctx: AppContext) => Part} render
 * @property {string[]} [modules]              sichtbar, wenn eines dieser Module an ist (Standard: das eigene)
 * @property {'full'|'small'} [size]           'small': nebeneinander stehende Kachel
 */

/**
 * @typedef {object} ViewDef
 * @property {string} route                    Name im Hash (#training)
 * @property {string} titleKey                 Dokumenttitel
 * @property {(ctx: AppContext, view: HTMLElement, route: Route) => (void | (() => void))} mount
 * @property {{labelKey: string, icon: string}} [tab]   in der Tab-Leiste zeigen
 * @property {string} [tabOf]                  welcher Tab hervorgehoben wird (Unteransicht)
 * @property {'tabs'|'bare'} [chrome]          'bare': ohne Tab-Leiste (z. B. Live-Training)
 * @property {string[]} [aliases]              weitere Namen (#umlenken → fokus)
 * @property {string[]} [modules]              erreichbar, wenn eines dieser Module an ist
 */

/**
 * @typedef {object} ModuleDef
 * @property {string} id
 * @property {string} labelKey                 „Was ist dir wichtig?“
 * @property {string} hintKey
 * @property {string} icon
 * @property {ViewDef[]} [views]
 * @property {TileDef[]} [tiles]
 */

/**
 * @typedef {object} ResolvedView
 * @property {ViewDef} view
 * @property {string} module
 */

/** @param {{modules?: string[]}} item @param {string} own */
const ownerModules = (item, own) => item.modules ?? [own];

export function createRegistry() {
  /** @type {ModuleDef[]} */
  const modules = [];

  const ids = () => modules.map((m) => m.id);

  const registry = {
    /**
     * Modul anmelden. Ids von Modulen, Ansichten und Kacheln müssen eindeutig sein.
     * @param {ModuleDef} def
     */
    register(def) {
      if (modules.some((m) => m.id === def.id)) throw new Error(`Modul doppelt: ${def.id}`);
      const routes = new Set([...registry.routes(), ...Object.keys(registry.aliases())]);
      for (const v of def.views ?? []) {
        for (const r of [v.route, ...(v.aliases ?? [])]) {
          if (routes.has(r)) throw new Error(`Route doppelt: ${r}`);
          routes.add(r);
        }
      }
      const tiles = new Set(registry.allTiles().map((t) => t.id));
      for (const t of def.tiles ?? []) if (tiles.has(t.id)) throw new Error(`Kachel doppelt: ${t.id}`);
      modules.push(def);
      return registry;
    },

    /** Alle Module in Anmelde-Reihenfolge. */
    list: () => [...modules],

    /** Bekannte Modul-Ids. */
    ids,

    /**
     * Eingeschaltete Module (normalisiert).
     * @param {string[]|null|undefined} enabled
     */
    enabled: (enabled) => normalizeModules(enabled, ids()),

    /** @returns {(TileDef & {module: string})[]} */
    allTiles: () => modules.flatMap((m) => (m.tiles ?? []).map((t) => ({ ...t, module: m.id }))),

    /**
     * Sichtbare Kacheln in gewünschter Reihenfolge.
     * @param {string[]|null|undefined} enabled
     * @param {readonly string[]} tileOrder
     */
    tiles(enabled, tileOrder = []) {
      const on = registry.enabled(enabled);
      const visible = registry.allTiles().filter((t) => anyEnabled(on, ownerModules(t, t.module)));
      const order = orderTiles(
        visible.map((t) => t.id),
        tileOrder,
      );
      return order.map((id) => /** @type {TileDef & {module: string}} */ (visible.find((t) => t.id === id)));
    },

    /** Alle Routen-Namen (ohne Aliase). */
    routes: () => modules.flatMap((m) => (m.views ?? []).map((v) => v.route)),

    /** Alias → Route. */
    aliases: () =>
      Object.fromEntries(modules.flatMap((m) => (m.views ?? []).flatMap((v) => (v.aliases ?? []).map((a) => [a, v.route])))),

    /**
     * Ansicht zu einer Route, falls ihr Modul an ist.
     * @param {string} route
     * @param {string[]|null|undefined} enabled
     * @returns {ResolvedView|null}
     */
    view(route, enabled) {
      const on = registry.enabled(enabled);
      for (const m of modules) {
        const v = (m.views ?? []).find((x) => x.route === route);
        if (v) return anyEnabled(on, ownerModules(v, m.id)) ? { view: v, module: m.id } : null;
      }
      return null;
    },

    /**
     * Tabs der eingeschalteten Module.
     * @param {string[]|null|undefined} enabled
     * @returns {{route: string, labelKey: string, icon: string}[]}
     */
    tabs(enabled) {
      const on = registry.enabled(enabled);
      return modules.flatMap((m) =>
        (m.views ?? [])
          .filter((v) => v.tab && anyEnabled(on, ownerModules(v, m.id)))
          .map((v) => ({ route: v.route, labelKey: /** @type {any} */ (v.tab).labelKey, icon: /** @type {any} */ (v.tab).icon })),
      );
    },
  };
  return registry;
}

/** @typedef {ReturnType<typeof createRegistry>} Registry */

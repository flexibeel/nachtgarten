/**
 * App-Shell: Ansichtsbereich, Tab-Leiste und Wechsel zwischen den Ansichten.
 * „Heute“ gehört zur Shell; alle anderen Ansichten und Tabs kommen aus der Modul-Registry.
 * Eine Route eines ausgeschalteten Moduls führt zu „Heute“.
 */

import { prefersReducedMotion } from '../core/platform.js';
import { h, replace } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { mountHeute } from './heute/heute.js';

/** @typedef {import('./context.js').AppContext} AppContext */
/** @typedef {import('../core/router.js').Route} Route */
/** @typedef {import('./registry.js').ViewDef} ViewDef */

/** @type {ViewDef} */
const HEUTE = { route: 'heute', title: 'Nachtgarten', tab: { label: 'Heute', icon: 'heute' }, mount: mountHeute };

/**
 * Routen-Tabelle für den Router.
 * @param {import('./registry.js').Registry} registry
 */
export const routeTable = (registry) => ({ routes: ['heute', ...registry.routes()], aliases: registry.aliases(), fallback: 'heute' });

/**
 * Ansicht zu einer Route (Heute, wenn das Modul aus ist oder die Route unbekannt).
 * @param {AppContext} ctx
 * @param {string} name
 * @returns {ViewDef}
 */
function viewFor(ctx, name) {
  if (name === 'heute') return HEUTE;
  return ctx.registry.view(name, ctx.store.settings.get().enabledModules)?.view ?? HEUTE;
}

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} root
 */
export function createShell(ctx, root) {
  const main = h('main', { class: 'view', id: 'view', tabindex: '-1' });
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Hauptbereiche', 'data-toast-avoid': '' });
  const app = h('div', { class: 'app' }, main, tabbar);
  replace(root, app);

  /** @type {(() => void) | void} */
  let cleanup;
  /** @type {ViewDef} */
  let current = HEUTE;

  const paintTabs = () => {
    const tabs = [{ route: 'heute', ...HEUTE.tab }, ...ctx.registry.tabs(ctx.store.settings.get().enabledModules)];
    const active = current.tab ? current.route : current.tabOf ?? null;
    tabbar.style.setProperty('--tabs', String(tabs.length));
    replace(
      tabbar,
      tabs.map((t) =>
        h(
          'a',
          { class: 'tab', href: `#${t.route}`, 'aria-current': t.route === active ? 'page' : null },
          icon(t.icon, { size: 24 }),
          h('span', { class: 'tab-label', text: t.label }),
        ),
      ),
    );
  };

  /** @param {Route} route */
  const render = (route) => {
    const view = viewFor(ctx, route.name);
    current = view;
    if (typeof cleanup === 'function') cleanup();
    main.replaceChildren();
    const chrome = view.chrome ?? 'tabs';
    app.dataset.chrome = chrome;
    app.dataset.route = view.route;
    tabbar.hidden = chrome !== 'tabs';
    paintTabs();
    document.title = view === HEUTE ? 'Nachtgarten' : `${view.title} · Nachtgarten`;
    cleanup = view.mount(ctx, main, route);
  };

  // Module an/aus: Tabs anpassen; ist die aktuelle Ansicht weg, zurück zu „Heute“.
  ctx.watch(['settings'], () => {
    if (current !== HEUTE && !ctx.registry.view(current.route, ctx.store.settings.get().enabledModules)) ctx.go('heute');
    else paintTabs();
  });

  return {
    /**
     * Ansicht wechseln, mit sanftem Übergang.
     * @param {Route} route
     * @param {Route|null} previous
     */
    show(route, previous) {
      if (viewFor(ctx, route.name) === HEUTE && route.name !== 'heute') {
        history.replaceState(null, '', '#heute');
      }
      const changed = !previous || previous.name !== route.name;
      const run = () => {
        render(route);
        if (changed) window.scrollTo(0, 0);
      };
      if (changed && previous && !prefersReducedMotion() && 'startViewTransition' in document) {
        /** @type {any} */ (document).startViewTransition(run);
      } else {
        run();
      }
      if (changed && previous) main.focus({ preventScroll: true });
    },
    /** Aktuelle Ansicht neu aufbauen (z. B. nach Wiederherstellen). */
    refresh() {
      render({ name: current.route, params: {} });
    },
  };
}

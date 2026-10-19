/**
 * App-Shell: Ansichtsbereich, Tab-Leiste und Wechsel zwischen den Ansichten.
 * „Heute“ gehört zur Shell; alle anderen Ansichten und Tabs kommen aus der Modul-Registry.
 * Eine Route eines ausgeschalteten Moduls führt zu „Heute“.
 */

import { prefersReducedMotion } from '../core/platform.js';
import { h, replace } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { dismissToast } from '../ui/toast.js';
import { mountHeute } from './heute/heute.js';
import { mountProfilePage } from './profile/profile.js';
import { arrangeTabs } from '../domain/modules.js';
import { t } from '../data/texts/i18n.js';

/** @typedef {import('./context.js').AppContext} AppContext */
/** @typedef {import('../core/router.js').Route} Route */
/** @typedef {import('./registry.js').ViewDef} ViewDef */

/** @type {ViewDef} */
const HEUTE = { route: 'heute', titleKey: 'app.name', tab: { labelKey: 'tab.heute', icon: 'heute' }, mount: mountHeute };
/** Profil gehört wie „Heute“ zur Shell (kein Modul); als Tab nur, wenn Platz ist. */
/** @type {ViewDef} */
const PROFIL = { route: 'profil', titleKey: 'view.profil', tab: { labelKey: 'tab.profil', icon: 'user' }, mount: mountProfilePage };
const SHELL_VIEWS = [HEUTE, PROFIL];

/**
 * Routen-Tabelle für den Router.
 * @param {import('./registry.js').Registry} registry
 */
export const routeTable = (registry) => ({ routes: [...SHELL_VIEWS.map((v) => v.route), ...registry.routes()], aliases: registry.aliases(), fallback: 'heute' });

/**
 * Ansicht zu einer Route (Heute, wenn das Modul aus ist oder die Route unbekannt).
 * @param {AppContext} ctx
 * @param {string} name
 * @returns {ViewDef}
 */
function viewFor(ctx, name) {
  const own = SHELL_VIEWS.find((v) => v.route === name);
  if (own) return own;
  return ctx.registry.view(name, ctx.store.settings.get().enabledModules)?.view ?? HEUTE;
}

/**
 * @param {AppContext} ctx
 * @param {HTMLElement} root
 */
export function createShell(ctx, root) {
  const main = h('main', { class: 'view', id: 'view', tabindex: '-1' });
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': t('nav.label'), 'data-toast-avoid': '' });
  const app = h('div', { class: 'app' }, main, tabbar);
  replace(root, app);
  // Name aus index.html (die Beta heißt „Nachtgarten Beta“).
  const appTitle = document.title || t('app.name');

  /** @type {(() => void) | void} */
  let cleanup;
  /** @type {ViewDef} */
  let current = HEUTE;

  /** Sichtbare Tabs: Heute, Module in fester Reihenfolge, Profil wenn Platz (3–5). */
  const visibleTabs = () =>
    arrangeTabs([{ route: 'heute', ...HEUTE.tab }, ...ctx.registry.tabs(ctx.store.settings.get().enabledModules)], { route: 'profil', ...PROFIL.tab });

  const paintTabs = () => {
    const tabs = visibleTabs();
    const active = current.tab ? current.route : current.tabOf ?? null;
    tabbar.style.setProperty('--tabs', String(tabs.length));
    replace(
      tabbar,
      tabs.map((tab) =>
        h(
          'a',
          { class: 'tab', href: `#${tab.route}`, 'aria-current': tab.route === active ? 'page' : null },
          h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, icon(tab.icon, { size: 24 })),
          h('span', { class: 'tab-label', text: t(tab.labelKey) }),
        ),
      ),
    );
  };

  /**
   * Art des Übergangs: tiefer (Live, Feed, Unterseiten) = schieben, zurück = zurückschieben,
   * zwischen Tabs nur sanft überblenden.
   * @param {ViewDef} from
   * @param {ViewDef} to
   * @param {'forward'|'back'|'none'} direction
   * @returns {'push'|'pop'|'fade'}
   */
  const navKind = (from, to, direction) => {
    const tabRoutes = visibleTabs().map((x) => x.route);
    const depth = (/** @type {ViewDef} */ v) => (tabRoutes.includes(v.route) ? 0 : 1);
    if (depth(to) > depth(from)) return 'push';
    if (depth(to) < depth(from)) return 'pop';
    if (depth(to) === 0) return 'fade';
    return direction === 'back' ? 'pop' : direction === 'forward' ? 'push' : 'fade';
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
    document.title = view === HEUTE ? appTitle : `${t(view.titleKey)} · ${appTitle}`;
    cleanup = view.mount(ctx, main, route);
  };

  // Module an/aus: Tabs anpassen; ist die aktuelle Ansicht weg, zurück zu „Heute“.
  ctx.watch(['settings'], () => {
    if (!SHELL_VIEWS.includes(current) && !ctx.registry.view(current.route, ctx.store.settings.get().enabledModules)) ctx.go('heute');
    else paintTabs();
  });

  // Sprache gewechselt: Tab-Leiste und aktuelle Ansicht neu.
  ctx.bus.on('lang', () => {
    tabbar.setAttribute('aria-label', t('nav.label'));
    render({ name: current.route, params: {} });
  });

  return {
    /**
     * Ansicht wechseln: Vor schiebt die neue Seite von rechts herein, Zurück schiebt sie
     * wieder hinaus (220 ms, ease-out), Tabs blenden über. Ohne Bewegung (reduced motion)
     * oder ohne View Transitions sofort.
     * @param {Route} route
     * @param {Route|null} previous
     * @param {{direction?: 'forward'|'back'|'none'}} [info]
     */
    show(route, previous, info = {}) {
      if (viewFor(ctx, route.name) === HEUTE && route.name !== 'heute') {
        history.replaceState(history.state, '', '#heute');
      }
      const changed = !previous || previous.name !== route.name;
      // Hinweise gehören zum Bildschirm, auf dem sie entstanden sind.
      if (changed) dismissToast();
      const from = current;
      const run = () => {
        render(route);
        if (changed) window.scrollTo(0, 0);
      };
      if (changed && previous && !prefersReducedMotion() && 'startViewTransition' in document) {
        const root = document.documentElement;
        root.dataset.nav = navKind(from, viewFor(ctx, route.name), info.direction ?? 'none');
        const transition = /** @type {any} */ (document).startViewTransition(run);
        const clear = () => {
          if (root.dataset.nav) delete root.dataset.nav;
        };
        transition.finished.then(clear, clear);
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

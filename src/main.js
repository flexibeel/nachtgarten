/**
 * Start der App: alte Daten übernehmen, Design anwenden, Shell und Router aufbauen,
 * beim ersten Start das Onboarding zeigen.
 */

import { createRouter } from './core/router.js';
import { migrateFromV1 } from './domain/migrate.js';
import { createContext } from './features/context.js';
import { openOnboarding } from './features/onboarding/onboarding.js';
import { createAppRegistry } from './features/modules.js';
import { createShell, routeTable } from './features/shell.js';
import { closeAllSheets } from './ui/sheet.js';
import { applyTheme } from './ui/theme.js';

/** Startansichten, die beim Öffnen ohne Direktsprung gelten dürfen. */
const START_VIEWS = ['heute', 'training', 'live'];

function boot() {
  const root = document.getElementById('root');
  if (!root) return;

  const ctx = createContext({ registry: createAppRegistry() });
  migrateFromV1(ctx.store, { now: ctx.now() });
  applyTheme(ctx.store.settings.get().theme);

  const shell = createShell(ctx, root);
  const router = createRouter({ ...routeTable(ctx.registry), onRoute: shell.show });
  ctx.go = router.go;

  const needsOnboarding = () => !ctx.store.profile.exists();
  const startOnboarding = () => openOnboarding(ctx, { onDone: () => ctx.go('heute', { replace: true }) });

  // Ohne Direktsprung: eingestellte Startansicht (beim allerersten Start immer „Heute“).
  if (!location.hash) {
    const start = ctx.store.settings.get().startView;
    const name = !needsOnboarding() && START_VIEWS.includes(start) ? start : 'heute';
    history.replaceState(null, '', `#${name}`);
  }
  router.start();
  if (needsOnboarding()) startOnboarding();

  ctx.bus.on('reload', async () => {
    await closeAllSheets();
    applyTheme(ctx.store.settings.get().theme);
    shell.refresh();
    if (needsOnboarding()) startOnboarding();
  });

  document.documentElement.classList.add('is-ready');
  registerServiceWorker();
}

/** Offline-Fähigkeit; im lokalen Test ohne sw.js schlägt das still fehl. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();

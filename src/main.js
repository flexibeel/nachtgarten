/**
 * Start der App: alte Daten übernehmen, Sprache und Design anwenden, Shell und Router aufbauen,
 * beim ersten Start das Onboarding zeigen.
 */

import { createRouter } from './core/router.js';
import { openDurable } from './core/durable.js';
import { localStorageAdapter } from './core/store.js';
import { requestPersistence } from './core/platform.js';
import { PLAN_LINK_PREFIX, offerSharedPlan } from './features/training/plan-link.js';
import { migrateFromV1 } from './domain/migrate.js';
import { createContext } from './features/context.js';
import { openOnboarding } from './features/onboarding/onboarding.js';
import { createAppRegistry } from './features/modules.js';
import { createShell, routeTable } from './features/shell.js';
import { closeAllSheets } from './ui/sheet.js';
import { applyTheme } from './ui/theme.js';
import { setLang } from './data/texts/i18n.js';

/** Startansichten, die beim Öffnen ohne Direktsprung gelten dürfen. */
const START_VIEWS = ['heute', 'training', 'live'];

async function boot() {
  const root = document.getElementById('root');
  if (!root) return;

  // Zweite Kopie in IndexedDB abgleichen (stellt geleerten localStorage wieder her).
  const durable = await openDurable(localStorageAdapter());
  const ctx = createContext({ registry: createAppRegistry(), adapter: durable.adapter });
  ctx.durable = durable;
  // Geteilter Plan (#plan=…): merken, Adresse aufräumen, nach dem Start anbieten.
  const sharedPlan = location.hash.startsWith(PLAN_LINK_PREFIX) ? location.hash.slice(PLAN_LINK_PREFIX.length) : null;
  if (sharedPlan) history.replaceState(null, '', '#training');
  migrateFromV1(ctx.store, { now: ctx.now() });
  applyTheme(ctx.store.settings.get().theme);
  setLang(ctx.store.settings.get().lang);

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
  else if (sharedPlan) offerSharedPlan(ctx, sharedPlan);

  keepDataSafe(ctx);

  ctx.bus.on('reload', async () => {
    await closeAllSheets();
    applyTheme(ctx.store.settings.get().theme);
    setLang(ctx.store.settings.get().lang);
    shell.refresh();
    if (needsOnboarding()) startOnboarding();
  });

  document.documentElement.classList.add('is-ready');
  registerServiceWorker();
}

/**
 * Daten schützen: nach Onboarding, erstem Plan und erstem Training dauerhaften Speicher
 * erbitten; einmal am Tag einen Stand in IndexedDB ablegen (die letzten fünf bleiben).
 * @param {import('./features/context.js').AppContext} ctx
 */
function keepDataSafe(ctx) {
  const asked = new Set();
  const ask = (area) => {
    if (asked.has(area) || !ctx.store[area].exists()) return;
    asked.add(area);
    requestPersistence().then((state) => ctx.bus.emit('persistence', state));
  };
  for (const area of /** @type {const} */ (['profile', 'plans', 'sessions'])) {
    ctx.watch([area], () => ask(area));
    if (ctx.store[area].exists()) ask(area);
  }
  let timer = 0;
  const snapshot = () => ctx.durable?.snapshotIfNeeded(ctx.today(), ctx.now());
  snapshot();
  ctx.bus.on('store', () => {
    clearTimeout(timer);
    timer = window.setTimeout(snapshot, 4000);
  });
}

/** Offline-Fähigkeit; im lokalen Test ohne sw.js schlägt das still fehl. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();

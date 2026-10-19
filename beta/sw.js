/*
 * Service Worker: Netz zuerst, bei fehlendem Netz aus dem Zwischenspeicher.
 * So gibt es nie veraltete Dateien, offline läuft die zuletzt geladene Fassung.
 * PREFIX, VERSION und PRECACHE ersetzt scripts/deploy-beta.py beim Veröffentlichen.
 * Aufgeräumt werden nur eigene alte Caches (gleicher PREFIX), nie die anderer Fassungen.
 */
const PREFIX = 'ng2-beta-';
const VERSION = 'b95a751-706ee038';
const CACHE = PREFIX + VERSION;
const PRECACHE = ["./", "fonts/instrument-serif-italic.woff", "fonts/instrument-serif.woff", "fonts/nunito-sans.woff", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable.svg", "icons/icon.svg", "index.html", "src/core/dates.js", "src/core/events.js", "src/core/format.js", "src/core/platform.js", "src/core/router.js", "src/core/store.js", "src/data/companions.js", "src/data/exercise-map.js", "src/data/gear.js", "src/data/goals.js", "src/data/muscles.js", "src/data/patterns.js", "src/data/texts/companion-de.js", "src/data/texts/companion-en.js", "src/data/texts/companion.js", "src/data/texts/de.js", "src/data/texts/en.js", "src/data/texts/i18n.js", "src/domain/account.js", "src/domain/backup.js", "src/domain/buddy.js", "src/domain/companion.js", "src/domain/feed.js", "src/domain/habits.js", "src/domain/ics.js", "src/domain/migrate.js", "src/domain/modules.js", "src/domain/pregnancy.js", "src/domain/progression.js", "src/domain/timer.js", "src/domain/today.js", "src/domain/training.js", "src/domain/week.js", "src/features/companion/companion-state.js", "src/features/context.js", "src/features/days.js", "src/features/focus/module.js", "src/features/habits/dump-tile.js", "src/features/habits/habit-tile.js", "src/features/habits/module.js", "src/features/habits/one-thing-tile.js", "src/features/heute/companion-row.js", "src/features/heute/header.js", "src/features/heute/heute.js", "src/features/heute/settings.js", "src/features/ideen/module.js", "src/features/mama/mama-setup.js", "src/features/mama/module.js", "src/features/mama/status.js", "src/features/modules.js", "src/features/onboarding/onboarding.js", "src/features/onboarding/steps.js", "src/features/part.js", "src/features/placeholder/placeholder.js", "src/features/privacy/privacy.js", "src/features/profile/profile.js", "src/features/registry.js", "src/features/settings/controls.js", "src/features/shell.js", "src/features/training/module.js", "src/features/training/sport-tile.js", "src/features/training/week-tile.js", "src/main.js", "src/styles/base.css", "src/styles/components.css", "src/styles/screens.css", "src/styles/tokens.css", "src/ui/actionbar.js", "src/ui/anim/equipment.js", "src/ui/anim/figure.js", "src/ui/anim/pixel.js", "src/ui/anim/player.js", "src/ui/card.js", "src/ui/chips.js", "src/ui/companion.js", "src/ui/companions/keimling.js", "src/ui/dom.js", "src/ui/fields.js", "src/ui/icons.js", "src/ui/numpad.js", "src/ui/ring.js", "src/ui/sheet.js", "src/ui/stepper.js", "src/ui/theme.js", "src/ui/tile.js", "src/ui/toast.js", "manifest.webmanifest"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request.mode === 'navigate' ? 'index.html' : event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(event.request, { ignoreSearch: true })) ?? (event.request.mode === 'navigate' ? cache.match('index.html') : Response.error());
      }),
  );
});

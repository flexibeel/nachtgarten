/*
 * Service Worker: Netz zuerst, bei fehlendem Netz aus dem Zwischenspeicher.
 * So gibt es nie veraltete Dateien, offline läuft die zuletzt geladene Fassung.
 * PREFIX, VERSION, PRECACHE, LEGACY und SKIP ersetzen scripts/deploy-beta.py und deploy-release.py.
 * Aufgeräumt werden eigene alte Caches (gleicher PREFIX) und die abgelösten Caches aus LEGACY
 * (in der App: v1 im Wurzelordner, „ng-…“), nie die anderer Fassungen (Klassisch „ngk-“, Beta „ng2-beta-“).
 * SKIP: Unterordner mit eigener App und eigenem Service Worker (klassisch/, beta/), die dieser nie anfasst.
 */
const PREFIX = 'ng2-app-';
const VERSION = '1fa7e0f-af0e67a1';
const CACHE = PREFIX + VERSION;
const PRECACHE = ["./", "fonts/instrument-serif-italic.woff", "fonts/instrument-serif.woff", "fonts/nunito-sans.woff", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable.svg", "icons/icon.svg", "index.html", "src/core/dates.js", "src/core/durable.js", "src/core/events.js", "src/core/format.js", "src/core/platform.js", "src/core/router.js", "src/core/store.js", "src/data/companions.js", "src/data/exercise-db.js", "src/data/exercise-map.js", "src/data/gear.js", "src/data/goals.js", "src/data/i18n/exercises.js", "src/data/library.js", "src/data/muscles.js", "src/data/patterns.js", "src/data/plan-exercise-map.js", "src/data/plans.js", "src/data/texts/companion-de.js", "src/data/texts/companion-en.js", "src/data/texts/companion.js", "src/data/texts/de.js", "src/data/texts/en.js", "src/data/texts/i18n.js", "src/data/variants.js", "src/domain/account.js", "src/domain/backup.js", "src/domain/buddy.js", "src/domain/companion.js", "src/domain/feed.js", "src/domain/garden.js", "src/domain/gate.js", "src/domain/habits.js", "src/domain/ics.js", "src/domain/library.js", "src/domain/live-session.js", "src/domain/migrate.js", "src/domain/modules.js", "src/domain/plan-code.js", "src/domain/plan-editor.js", "src/domain/plan-select.js", "src/domain/plan-wizard.js", "src/domain/pregnancy.js", "src/domain/progression.js", "src/domain/timer.js", "src/domain/today.js", "src/domain/training.js", "src/domain/variants.js", "src/domain/week.js", "src/features/classic/classic.js", "src/features/companion/companion-state.js", "src/features/companion/picker.js", "src/features/context.js", "src/features/days.js", "src/features/focus/guide-art.js", "src/features/focus/module.js", "src/features/focus/umlenken.js", "src/features/habits/dump-tile.js", "src/features/habits/habit-tile.js", "src/features/habits/module.js", "src/features/habits/one-thing-tile.js", "src/features/heute/backup-nudge.js", "src/features/heute/companion-row.js", "src/features/heute/header.js", "src/features/heute/heute.js", "src/features/heute/settings.js", "src/features/ideen/module.js", "src/features/mama/mama-setup.js", "src/features/mama/module.js", "src/features/mama/status.js", "src/features/modules.js", "src/features/onboarding/onboarding.js", "src/features/onboarding/steps.js", "src/features/part.js", "src/features/placeholder/placeholder.js", "src/features/privacy/privacy.js", "src/features/profile/profile.js", "src/features/registry.js", "src/features/settings/controls.js", "src/features/shell.js", "src/features/training/calendar-export.js", "src/features/training/exercises.js", "src/features/training/finish.js", "src/features/training/garden-tile.js", "src/features/training/library-sheet.js", "src/features/training/live.js", "src/features/training/module.js", "src/features/training/plan-editor.js", "src/features/training/plan-link.js", "src/features/training/plans-ui.js", "src/features/training/share-sheet.js", "src/features/training/sport-tile.js", "src/features/training/training.js", "src/features/training/week-tile.js", "src/main.js", "src/styles/base.css", "src/styles/components.css", "src/styles/screens.css", "src/styles/tokens.css", "src/ui/actionbar.js", "src/ui/adopt-css.js", "src/ui/anim/equipment.js", "src/ui/anim/figure.js", "src/ui/anim/pixel.js", "src/ui/anim/player.js", "src/ui/card.js", "src/ui/chips.js", "src/ui/companion.js", "src/ui/companion/companion.js", "src/ui/companion/garden.js", "src/ui/companion/sprites.js", "src/ui/dom.js", "src/ui/fields.js", "src/ui/icons.js", "src/ui/numpad.js", "src/ui/ring.js", "src/ui/share/cards.js", "src/ui/share/data.js", "src/ui/share/figur.js", "src/ui/share/geo.js", "src/ui/share/ink.js", "src/ui/share/kraftbilder.js", "src/ui/share/laeufer.js", "src/ui/share/mannequin.js", "src/ui/share/piktogramm.js", "src/ui/share/pose.js", "src/ui/share/seal.js", "src/ui/sheet.js", "src/ui/stepper.js", "src/ui/theme.js", "src/ui/tile.js", "src/ui/toast.js", "manifest.webmanifest"];
const LEGACY = ["ng-"];
const SKIP = ["klassisch/", "beta/"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

/** Alte eigene Caches und abgelöste (LEGACY) löschen. */
const cleanUp = () =>
  caches
    .keys()
    .then((keys) => Promise.all(keys.filter((k) => (k.startsWith(PREFIX) && k !== CACHE) || LEGACY.some((p) => k.startsWith(p))).map((k) => caches.delete(k))));

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanUp().then(() => self.clients.claim()));
});

// Ein abgelöster Service Worker kann kurz vor dem Wechsel noch in seinen Cache geschrieben haben:
// beim ersten Seitenaufruf danach noch einmal aufräumen.
let sweptAgain = LEGACY.length === 0;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  const inner = url.pathname.slice(scope.pathname.length);
  if (SKIP.some((dir) => inner.startsWith(dir))) return;
  if (!sweptAgain && event.request.mode === 'navigate') {
    sweptAgain = true;
    event.waitUntil(new Promise((resolve) => setTimeout(resolve, 3000)).then(cleanUp));
  }
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

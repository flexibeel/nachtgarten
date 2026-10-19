/*
 * Service Worker: Netz zuerst, bei fehlendem Netz aus dem Zwischenspeicher.
 * So gibt es nie veraltete Dateien, offline läuft die zuletzt geladene Fassung.
 * PREFIX, VERSION und PRECACHE ersetzt scripts/deploy-beta.py beim Veröffentlichen.
 * Aufgeräumt werden nur eigene alte Caches (gleicher PREFIX), nie die anderer Fassungen.
 */
const PREFIX = 'ng2-dev-';
const VERSION = 'local';
const CACHE = PREFIX + VERSION;
const PRECACHE = ['./', 'index.html'];

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

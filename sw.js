/*
 * Service Worker: Netz zuerst, bei fehlendem Netz aus dem Zwischenspeicher.
 * So gibt es nie veraltete Dateien, offline läuft die zuletzt geladene Fassung.
 * PREFIX, VERSION, PRECACHE, LEGACY und SKIP ersetzen scripts/deploy-beta.py und deploy-release.py.
 * Aufgeräumt werden eigene alte Caches (gleicher PREFIX) und die abgelösten Caches aus LEGACY
 * (in der App: v1 im Wurzelordner, „ng-…“), nie die anderer Fassungen (Klassisch „ngk-“, Beta „ng2-beta-“).
 * SKIP: Unterordner mit eigener App und eigenem Service Worker (klassisch/, beta/), die dieser nie anfasst.
 */
const PREFIX = 'ng2-dev-';
const VERSION = 'local';
const CACHE = PREFIX + VERSION;
const PRECACHE = ['./', 'index.html'];
const LEGACY = [];
const SKIP = [];

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

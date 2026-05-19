/* KidWrangler service worker — offline-first cache.
 *
 * Strategy: cache-first with network fallback during install. Once installed,
 * the app runs fully offline. Bump CACHE_NAME on every release to force a
 * refresh on existing installs.
 *
 * On localhost: this SW self-unregisters and clears caches so dev iteration
 * doesn't keep serving stale JS. Production hosts run the normal SW lifecycle.
 */

const CACHE_NAME = 'kidwrangler-v16';

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '';

// Everything the app needs to run cold-start. Keep this list in sync with
// the actual file structure under www/.
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './styles/games.css',
  './js/app.js',
  './js/audio.js',
  './js/speech.js',
  './js/wakeLock.js',
  './js/ui.js',
  './js/storage.js',
  './js/native.js',
  './js/featureFlags.js',
  './js/games/findMe.js',
  './js/games/redLight.js',
  './js/games/floorLava.js',
  './js/games/superHero.js',
  './js/games/simonSays.js',
  './js/games/animalCharades.js',
  './js/games/animalsData.js',
  './js/games/animalSounds.js',
  './js/games/whatIsIt.js',
  './js/games/whatIsItData.js',
  './js/games/missionControl.js',
  './js/games/weatherReport.js',
  './js/games/weatherData.js',
];

self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll with individual catches so one missing file doesn't fail the whole install.
      return Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to precache', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (IS_LOCALHOST) {
    // Self-destruct on localhost: nuke caches, unregister, force-reload clients.
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((c) => c.navigate(c.url));
      })()
    );
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (IS_LOCALHOST) return; // pass through to network during dev
  if (event.request.method !== 'GET') return;

  // For navigation requests, serve index.html on failure (SPA-style fallback).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for everything else.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Stash same-origin successful responses for next time.
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => undefined);
    })
  );
});

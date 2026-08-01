const CACHE_NAME = 'pixel-browser-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// App-shell files: cache-first (fast offline load).
// Everything else (embedded pages, API calls): network-first, no caching —
// the app shell is what makes this installable, not third-party content.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShellRequest = url.origin === self.location.origin && APP_SHELL.some((p) => url.pathname.endsWith(p.replace('./', '')));

  if (isShellRequest) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
  // Non-shell requests fall through to the network untouched.
});

const CACHE_NAME = 'pixel-browser-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];
// index.html/'./' change often as the app UI is updated — they get a
// network-first strategy so a new deploy shows up on next load instead of
// getting stuck behind a stale cached copy. Static, rarely-changing assets
// (manifest, icons) stay cache-first for fast offline load.
const NETWORK_FIRST = ['./', './index.html'];

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

// App-shell files: cache-first (fast offline load), except index.html/'./'
// which are network-first so UI updates aren't stuck behind a stale cache.
// Everything else (embedded pages, API calls): network-first, no caching —
// the app shell is what makes this installable, not third-party content.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // non-shell: untouched

  const isNetworkFirst = NETWORK_FIRST.some((p) => url.pathname.endsWith(p.replace('./', '')) || url.pathname === '/' + p.replace('./', ''));
  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  const isShellRequest = APP_SHELL.some((p) => url.pathname.endsWith(p.replace('./', '')));
  if (isShellRequest) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
  // Non-shell requests fall through to the network untouched.
});

const CACHE = 'weight-journal-v4';
const ASSETS = ['./','./index.html','./style.css','./app.js','./data.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
const assetURLs = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('weight-journal-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Prefer fresh files online; retain the last successful version for offline use.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  url.search = '';
  if (event.request.method !== 'GET' || !assetURLs.has(url.href)) return;
  const response = (async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(event.request, { cache: 'no-cache' });
      if (fresh.ok) return { response: fresh, cache };
      const cached = await cache.match(url.href);
      return { response: cached || fresh };
    } catch (error) {
      const cached = await cache.match(url.href);
      if (cached) return { response: cached };
      throw error;
    }
  })();
  event.respondWith(response.then(result => result.response.clone()));
  event.waitUntil(response.then(result => result.cache?.put(url.href, result.response)).catch(() => {}));
});

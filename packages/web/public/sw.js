const STATIC_CACHE = 'shoppingo-static-v3';
const API_CACHE = 'shoppingo-api-v2';
const IMAGE_CACHE = 'shoppingo-images-v1';
const FONT_CACHE = 'shoppingo-fonts-v1';
const FONT_CSS_CACHE = 'shoppingo-font-css-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-192.png',
  '/logo-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE, FONT_CSS_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Runtime caching for API GET requests and same-origin navigations/assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // API requests: network-first, cache fallback
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, resClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Page navigations: network-first, fall back to cached navigation or index.html when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, resClone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/index.html');
        })
    );
    return;
  }

  // Google Fonts stylesheet: network-first, fall back to cache when offline
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' }))
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const resClone = response.clone();
          caches.open(FONT_CSS_CACHE).then((cache) => cache.put(request.url, resClone));
          return response;
        })
        .catch(() => caches.match(request.url))
    );
    return;
  }

  // Fonts (any origin): cache-first to avoid extra network requests; update cache when first fetched
  if (request.destination === 'font' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONT_CACHE);
        const cached = await cache.match(request.url);
        if (cached) return cached;

        try {
          const response = await fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' }));
          if (response && response.ok) {
            await cache.put(request.url, response.clone());
          }
          return response;
        } catch (e) {
          // Offline and not cached: fall back to generic match (may be null)
          return cached || caches.match(request.url);
        }
      })()
    );
    return;
  }

  // Images (any origin): network-first, cache opaque/cors responses, fallback to cache by URL when offline
  if (request.destination === 'image') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response) return response;
          // Cache successful or opaque responses so they are available offline
          if (response.ok || response.type === 'opaque') {
            const resClone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request.url, resClone));
          }
          return response;
        })
        .catch(() => caches.match(request.url))
    );
    return;
  }

  // Same-origin static assets (scripts, styles): network-first, fall back to cache when offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const resClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, resClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

// Optional: trim caches to avoid unbounded growth (simple FIFO based on cache keys order)
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxItems) return;
  const deletions = keys.slice(0, keys.length - maxItems).map((k) => cache.delete(k));
  await Promise.all(deletions);
}

self.addEventListener('message', (event) => {
  if (event.data === 'trim-caches') {
    trimCache(IMAGE_CACHE, 100).catch(() => {});
    trimCache(API_CACHE, 100).catch(() => {});
  }
});

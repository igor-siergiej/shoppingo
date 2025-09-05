const STATIC_CACHE = 'shoppingo-static-v4';
const API_CACHE = 'shoppingo-api-v3';
const ASSET_CACHE = 'shoppingo-assets-v1';


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
          .filter((key) => ![STATIC_CACHE, API_CACHE, ASSET_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Runtime caching: API (network-first) and assets (cache-first)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // API requests: network-first, cache fallback; if no cache, return offline 503 JSON
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(API_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'offline', message: 'No cached data available' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })()
    );
    return;
  }

  // Assets (images, fonts, styles, scripts, other static): cache-first
  if (
    request.mode !== 'navigate' && (
      request.destination === 'image' ||
      request.destination === 'font' ||
      request.destination === 'style' ||
      request.destination === 'script' ||
      (url.origin === self.location.origin && !url.pathname.startsWith('/api/'))
    )
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && (response.ok || response.type === 'opaque')) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch (e) {
          return cached || new Response('', { status: 504 });
        }
      })()
    );
    return;
  }
});

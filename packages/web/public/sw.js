const STATIC_CACHE = 'shoppingo-static-v5';
const API_CACHE = 'shoppingo-api-v4';
const ASSET_CACHE = 'shoppingo-assets-v2';
const RUNTIME_CACHE = 'shoppingo-runtime-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-192.png',
  '/logo-512.png',
  '/config.json' // Cache config for faster loading
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Static assets - cache first
  STATIC: 'cache-first',
  // API calls - network first with cache fallback
  API: 'network-first',
  // Images and fonts - cache first with long TTL
  ASSETS: 'cache-first',
  // Runtime resources - stale while revalidate
  RUNTIME: 'stale-while-revalidate'
};

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
          .filter((key) => ![STATIC_CACHE, API_CACHE, ASSET_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Enhanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests that we can't cache
  if (url.origin !== self.location.origin) return;

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Static assets: cache-first
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Config file: cache-first with short TTL
  if (url.pathname === '/config.json') {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Assets (images, fonts, styles, scripts): cache-first
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(cacheFirstStrategy(request, ASSET_CACHE));
    return;
  }

  // All other requests: stale-while-revalidate
  event.respondWith(staleWhileRevalidateStrategy(request, RUNTIME_CACHE));
});

// Cache-first strategy
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('', { status: 504 });
  }
}

// Network-first strategy
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ 
      error: 'offline', 
      message: 'No cached data available' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then(response => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    // Ignore fetch errors in background
  });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

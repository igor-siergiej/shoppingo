// Use a version from the manifest or a timestamp to ensure cache busting
const APP_VERSION = '0.2.24'; // This will be updated automatically during build
const BUILD_TIMESTAMP = '1758788970885'; // This will be updated during build
const CACHE_VERSION = `v${APP_VERSION}-${BUILD_TIMESTAMP}`;

const STATIC_CACHE = `shoppingo-static-${CACHE_VERSION}`;
const API_CACHE = `shoppingo-api-${CACHE_VERSION}`;
const ASSET_CACHE = `shoppingo-assets-${CACHE_VERSION}`;
const RUNTIME_CACHE = `shoppingo-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-192.png',
  '/logo-512.png'
];

const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  API: 'network-first',
  ASSETS: 'cache-first',
  RUNTIME: 'stale-while-revalidate'
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return Promise.allSettled(
          STATIC_ASSETS.map(asset => 
            cache.add(asset).catch(error => {
              console.warn(`Failed to cache ${asset}:`, error);
            })
          )
        );
      }),
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

// Handle messages from the client (for lifecycle management)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        console.log('SW: Received SKIP_WAITING message, activating new version');
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({
          version: APP_VERSION,
          buildTimestamp: BUILD_TIMESTAMP,
          cacheVersion: CACHE_VERSION
        });
        break;
      default:
        console.log('SW: Unknown message type:', event.data.type);
    }
  }
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

  // Config file: network-first, only cache successful responses
  if (url.pathname === '/config.json') {
    event.respondWith(networkFirstConfigStrategy(request, STATIC_CACHE));
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

// Network-first strategy for config.json - only cache successful responses
async function networkFirstConfigStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    // Only cache if response is successful (200-299)
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // For config.json, don't fall back to cache if network fails
    // This prevents serving stale 403 responses
    return new Response(JSON.stringify({ 
      error: 'network_error', 
      message: 'Failed to fetch config' 
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

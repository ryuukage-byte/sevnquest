// SevnQuest Service Worker for PWA Support (v2.5)
const CACHE_NAME = 'sevnquest-v2.7';
// Path relatif terhadap scope SW supaya benar di root (Vercel/standalone) maupun sub-path (GitHub Pages).
const STATIC_ASSETS = [
  'manifest.webmanifest',
  'favicon.ico',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png'
].map((p) => new URL(p, self.registration.scope).href);
const INDEX_URL = new URL('index.html', self.registration.scope).href;

// 1. Install: Pre-cache core branding icons only (DO NOT pre-cache index.html to avoid stale chunk mismatches)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA] Pre-caching static assets failed (ignorable):', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate: Immediately purge all outdated caches from previous deployments
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Allow client messages to trigger instant activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. Fetch Strategy:
//    - HTML / Navigation: NETWORK-FIRST (Always get fresh index.html when online, fallback to cache when offline)
//    - Supabase / API: NETWORK-ONLY (Never cache)
//    - Static Assets (.js, .css, images, fonts): CACHE-FIRST with network fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET, chrome-extension, or supabase proxy requests
  if (
    request.method !== 'GET' ||
    request.url.includes('/supabase-proxy') ||
    request.url.includes('supabase.co') ||
    request.url.startsWith('chrome-extension://')
  ) {
    return;
  }
  const url = new URL(request.url);
  // Skrip/aset Google Identity Services: jangan di-cache (selalu versi terbaru dari Google).
  if (/(^|\.)(google\.com|gstatic\.com)$/.test(url.hostname)) {
    return;
  }
  // /api/*: network-only. Respons API konten TIDAK boleh disimpan oleh Service Worker (offline-lite: tanpa mirror konten).
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.port === '3000' ||
    url.pathname.includes('/@vite') ||
    url.pathname.includes('/node_modules/')
  ) {
    return;
  }
  const isHtml =
    request.mode === 'navigate' ||
    (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) ||
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html');

  // A. HTML / Navigation Requests: NETWORK-FIRST
  if (isHtml) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(request).then((cached) => cached || caches.match(INDEX_URL).then((idx) => idx || caches.match(self.registration.scope)));
        })
    );
    return;
  }

  // B. Static Assets: Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Only cache valid 200 responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[PWA] Asset fetch failed, falling back to 404 response:', request.url, err);
        return new Response(null, { status: 404, statusText: 'Not Found' });
      });
    })
  );
});

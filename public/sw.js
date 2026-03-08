// Service Worker for G10 Flow PWA
// Uses Workbox via CDN for caching strategies
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const { precaching, routing, strategies, expiration } = workbox;

// Skip waiting on install so new SW activates immediately when requested
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Clean old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// --- Caching Strategies ---

// Navigation requests (HTML pages) - NetworkFirst with 3s timeout
routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new strategies.NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
  })
);

// Static assets (JS, CSS) - CacheFirst
routing.registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new strategies.CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Fonts - CacheFirst
routing.registerRoute(
  ({ request }) => request.destination === 'font',
  new strategies.CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  })
);

// Images - CacheFirst
routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Manifest - NetworkFirst
routing.registerRoute(
  ({ url }) => url.pathname === '/api/manifest',
  new strategies.NetworkFirst({
    cacheName: 'manifest',
    networkTimeoutSeconds: 3,
  })
);

// Supabase REST API calls - StaleWhileRevalidate
routing.registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.startsWith('/rest/'),
  new strategies.StaleWhileRevalidate({
    cacheName: 'supabase-api',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
  })
);

// --- Push Notifications ---

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, url } = data;

  event.waitUntil(
    self.registration.showNotification(title || 'G10 Flow', {
      body: body || '',
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: url || '/dashboard' },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

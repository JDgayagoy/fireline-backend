// Service Worker for Gas & Fire Monitor PWA
// Handles asset caching and Web Push notifications

const CACHE_NAME = 'gas-fire-monitor-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ----------------------------------------------------------------------------
// Web Push Notifications
// ----------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Safety Alert', body: event.data.text() };
    }
  }

  const title = data.title || '🚨 Gas & Fire Monitor Alert';
  const options = {
    body: data.body || 'Elevated sensor reading recorded.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'gas-alert',
    vibrate: [300, 100, 300, 100, 300],
    data: data.data || { url: '/' },
    requireInteraction: true // Keeps danger alert visible until dismissed
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
